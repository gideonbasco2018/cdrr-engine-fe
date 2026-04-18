/* ================================================================== */
/*  DataTable — index.jsx                                              */
/* ================================================================== */
import { useState } from "react";
import { tableColumns, COLUMN_DB_KEY_MAP } from "../tableColumns";
import TablePagination from "../TablePagination";
import ViewDetailsModal from "../viewdetails/ViewDetailsModal";
import DoctrackModal from "../../reports/actions/DoctrackModal";
import ApplicationLogsModal from "../ApplicationLogsModal";
import ChangeLogModal from "../ChangeLogModal";
import { markWorkflowTasksAsReceived } from "../../../api/workflow-tasks";
import {
  getLastApplicationLogIndex,
  updateApplicationLog,
  createApplicationLog,
  getApplicationLogs,
} from "../../../api/application-logs";
import { updateUploadReport } from "../../../api/reports";

import { BulkDeckModal } from "./BulkDeckModal";
import { renderCell } from "./renderCell";
import { generateTransmittal } from "./TransmittalGenerator";
import {
  BULK_DECK_CONFIG,
  RECORD_TAB_COLUMNS,
  getDeadlineUrgency,
  URGENCY_CONFIG,
  todayStr,
  countWorkingDays,
} from "./constants";

/* ================================================================== */
function DataTable({
  data,
  selectedRows,
  onSelectRow,
  onSelectAll,
  currentPage,
  rowsPerPage,
  totalRecords,
  totalPages,
  onPageChange,
  onRowsPerPageChange,
  colors,
  activeTab,
  onRefresh,
  onClearSelections,
  indexOfFirstRow,
  indexOfLastRow,
  darkMode,
  onSort,
  sortBy,
  sortOrder,
  readIds = new Set(),
  onMarkAsRead,
  activeSubTab = "not_yet",
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedRowDetails, setSelectedRowDetails] = useState(null);
  const [doctrackModalRecord, setDoctrackModalRecord] = useState(null);
  const [appLogsRecord, setAppLogsRecord] = useState(null);
  const [changeLogRecord, setChangeLogRecord] = useState(null);
  const [markingReceived, setMarkingReceived] = useState(false);
  const [confirmReceive, setConfirmReceive] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [showBulkDeck, setShowBulkDeck] = useState(false);

  const isComplianceTab = activeTab === "Compliance";
  const isRecordTab = activeTab === "Record";
  const isReceivedSubTab = activeSubTab === "received";
  const showMarkAsReceived = activeSubTab !== "received";

  const bulkDeckConfig = BULK_DECK_CONFIG[activeTab] ?? null;
  const showBulkDeckBtn =
    !!bulkDeckConfig && isReceivedSubTab && selectedRows.length > 0;

  /* ── Visible columns ── */
  const visibleColumns = isRecordTab
    ? RECORD_TAB_COLUMNS.map((key) =>
        tableColumns.find((col) => col.key === key),
      ).filter(Boolean)
    : tableColumns.filter((col) => !col.complianceOnly || isComplianceTab);

  /* ── Sort ── */
  const getDbKey = (k) => COLUMN_DB_KEY_MAP[k] || k;
  const handleSort = (k) => {
    if (!onSort || k === "statusTimeline" || k === "deadlineDate") return;
    const db = getDbKey(k);
    onSort(db, sortBy === db && sortOrder === "asc" ? "desc" : "asc");
  };

  const SortIcon = ({ colKey }) => {
    if (colKey === "statusTimeline" || colKey === "deadlineDate") return null;
    const db = getDbKey(colKey);
    const on = sortBy === db;
    return (
      <span
        style={{
          display: "inline-flex",
          flexDirection: "column",
          marginLeft: 4,
          lineHeight: 1,
          verticalAlign: "middle",
          gap: 1,
        }}
      >
        <span
          style={{
            fontSize: "0.48rem",
            lineHeight: 1,
            color: on && sortOrder === "asc" ? "#4CAF50" : colors.textTertiary,
            opacity: on && sortOrder === "asc" ? 1 : 0.3,
          }}
        >
          ▲
        </span>
        <span
          style={{
            fontSize: "0.48rem",
            lineHeight: 1,
            color: on && sortOrder === "desc" ? "#4CAF50" : colors.textTertiary,
            opacity: on && sortOrder === "desc" ? 1 : 0.3,
          }}
        >
          ▼
        </span>
      </span>
    );
  };

  const activeSortLabel = (() => {
    const e = Object.entries(COLUMN_DB_KEY_MAP).find(([, db]) => db === sortBy);
    if (!e) return sortBy;
    return tableColumns.find((c) => c.key === e[0])?.label || sortBy;
  })();

  /* ── Menu actions ── */
  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };
  const openDetails = (r) => {
    setOpenMenuId(null);
    onMarkAsRead?.(r.id);
    setSelectedRowDetails(r);
  };
  const openDoctrack = (r) => {
    setOpenMenuId(null);
    onMarkAsRead?.(r.id);
    setDoctrackModalRecord(r);
  };
  const openAppLogs = (r) => {
    setOpenMenuId(null);
    onMarkAsRead?.(r.id);
    setAppLogsRecord(r);
  };
  const openChangeLog = (r) => {
    setOpenMenuId(null);
    onMarkAsRead?.(r.id);
    setChangeLogRecord(r);
  };

  /* ── Mark as Received ── */
  const handleMarkAsReceived = async () => {
    if (!selectedRows.length || markingReceived) return;
    setMarkingReceived(true);
    try {
      await markWorkflowTasksAsReceived(selectedRows);
      if (onClearSelections) onClearSelections();
      if (onRefresh) await onRefresh();
    } catch (e) {
      console.error("Mark as Received error:", e);
    } finally {
      setMarkingReceived(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────── */
  /*  Bulk Deck handler                                               */
  /*  FIX: resolve user_id from the users list and pass it into      */
  /*       createApplicationLog so the assigned user is stored        */
  /*       correctly (previously only username was sent).            */
  /* ─────────────────────────────────────────────────────────────── */
  const handleBulkDeck = async (
    assigneeUsername,
    {
      decision,
      action,
      remarks,
      doctrackRemarks = "",
      decisionResult = "",
      decisionAuthorityId = null,
      decisionAuthorityName = "",
    } = {},
  ) => {
    if (!bulkDeckConfig) return { success: 0, failed: 0 };

    const isLRDChiefAdmin = bulkDeckConfig.currentStep === "LRD Chief Admin";
    const isODReleasing = bulkDeckConfig.currentStep === "OD-Releasing";

    const seen = new Set();
    const selectedData = data
      .filter((r) => selectedRows.includes(r.id))
      .filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });

    const isReturnDecision =
      decision === "Return to Evaluator" ||
      decision === "Check and return to evaluator";

    const resolvedNextStep = isReturnDecision
      ? "Quality Evaluation"
      : (bulkDeckConfig.nextStep ?? null);

    const isEndTask = bulkDeckConfig.isEndTask || resolvedNextStep === null;
    const finalDecision = decision || "";

    /*
     * FIX: Pre-fetch users for the next group so we can resolve user_id.
     * We only need this when NOT an end-task and NOT a return decision,
     * i.e., when we actually assign to a specific user.
     */
    let usersForNextGroup = [];
    if (!isEndTask && !isReturnDecision && bulkDeckConfig.nextGroupId) {
      try {
        const { getUsersByGroup } = await import("../../../api/auth");
        usersForNextGroup = await getUsersByGroup(bulkDeckConfig.nextGroupId);
      } catch (e) {
        console.error("Failed to fetch next-group users for user_id:", e);
      }
    }

    const resolveUserId = (username) =>
      usersForNextGroup.find((u) => u.username === username)?.id ?? null;

    let success = 0,
      failed = 0;
    const now = new Date();
    const formattedDateTime = new Date(
      now.getTime() + 8 * 60 * 60 * 1000,
    ).toISOString();

    for (const row of selectedData) {
      try {
        const { id: logId, mainDbId } = row;

        /* ── Per-record: resolve previous evaluator for return decisions ── */
        let resolvedAssignee = assigneeUsername;
        let resolvedAssigneeId = resolveUserId(assigneeUsername);

        if (isReturnDecision) {
          try {
            const logs = await getApplicationLogs(mainDbId);
            const sorted = Array.isArray(logs)
              ? [...logs].sort(
                  (a, b) => (a.del_index ?? 0) - (b.del_index ?? 0),
                )
              : [];

            // Find current open log index for this step
            const currentLogIdx = sorted.findIndex(
              (l) =>
                l.application_step === bulkDeckConfig.currentStep &&
                l.del_thread === "Open",
            );

            // Walk backwards to find nearest Quality Evaluation log
            let prevEval = null;
            let prevEvalId = null;
            if (currentLogIdx > 0) {
              for (let i = currentLogIdx - 1; i >= 0; i--) {
                if (sorted[i].application_step === "Quality Evaluation") {
                  prevEval = sorted[i].user_name ?? null;
                  /*
                   * FIX: also capture user_id from the historical log so the
                   * returned record is assigned with the correct user_id.
                   */
                  prevEvalId = sorted[i].user_id ?? null;
                  break;
                }
              }
            }
            resolvedAssignee = prevEval;
            resolvedAssigneeId = prevEvalId;
          } catch {
            resolvedAssignee = null;
            resolvedAssigneeId = null;
          }
        }

        if (isEndTask) {
          await updateApplicationLog(logId, {
            application_status: "COMPLETED",
            application_decision: finalDecision,
            application_remarks: remarks || "",
            action_type: isLRDChiefAdmin ? "Decision Recorded" : action || "",
            accomplished_date: formattedDateTime,
            del_last_index: 0,
            del_thread: "Close",
            ...(isLRDChiefAdmin || isODReleasing
              ? {
                  decision_result: decisionResult,
                  decision_authority_id: decisionAuthorityId,
                  decision_authority_name: decisionAuthorityName,
                }
              : {}),
            doctrack_remarks: doctrackRemarks || "",
          });
          await updateUploadReport(mainDbId, { DB_APP_STATUS: "COMPLETED" });
        } else {
          const indexData = await getLastApplicationLogIndex(mainDbId);
          const lastIndex = indexData.last_index;
          const nextIndex = lastIndex + 1;

          await updateApplicationLog(logId, {
            application_status: "COMPLETED",
            application_decision: finalDecision,
            application_remarks: remarks || "",
            action_type: action || "",
            accomplished_date: formattedDateTime,
            del_last_index: 0,
            del_thread: "Close",
            ...(isLRDChiefAdmin || isODReleasing
              ? {
                  decision_result: decisionResult,
                  decision_authority_id: decisionAuthorityId,
                  decision_authority_name: decisionAuthorityName,
                }
              : {}),
            doctrack_remarks: doctrackRemarks || "",
          });

          /*
           * FIX: include user_id in createApplicationLog payload.
           * Previously this was missing — only user_name (username string)
           * was sent, leaving user_id null in the database.
           */
          await createApplicationLog({
            main_db_id: mainDbId,
            application_step: resolvedNextStep,
            user_name: resolvedAssignee,
            user_id: resolvedAssigneeId, // ← FIX: was missing
            application_status: "IN PROGRESS",
            application_decision: "",
            start_date: formattedDateTime,
            accomplished_date: null,
            del_index: nextIndex,
            del_previous: lastIndex,
            del_last_index: 1,
            del_thread: "Open",
          });
        }
        success++;
      } catch (e) {
        console.error(`Bulk deck failed for row id ${row.id}:`, e);
        failed++;
      }
    }
    return { success, failed };
  };

  /* ── Transmittal ── */
  const handleGenerateTransmittal = async () => {
    if (!selectedRows.length) return;
    const selectedData = data.filter((r) => selectedRows.includes(r.id));
    await generateTransmittal(selectedData, activeTab);
  };

  /* ── Menu button helper ── */
  const menuBtn = (onClick, style = {}, children) => (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "0.75rem 1rem",
        background: "transparent",
        border: "none",
        color: colors.textPrimary,
        fontSize: "0.85rem",
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        transition: "background .2s",
        ...style,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = colors.tableRowHover)
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );

  return (
    <>
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
        }}
      >
        {/* ── Header bar ── */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: `1px solid ${colors.tableBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <h3
              style={{
                fontSize: ".8rem",
                fontWeight: 600,
                color: colors.textPrimary,
              }}
            >
              Task Data
            </h3>
            <span
              style={{
                padding: "0.25rem 0.75rem",
                background: colors.badgeBg,
                borderRadius: 12,
                fontSize: "0.6rem",
                color: colors.textTertiary,
                fontWeight: 600,
              }}
            >
              {totalRecords} total records
            </span>

            {/* Mark as Received */}
            {selectedRows.length > 0 && showMarkAsReceived && (
              <button
                onClick={() => setConfirmReceive(true)}
                disabled={markingReceived}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.4rem 1rem",
                  background: markingReceived
                    ? "rgba(16,185,129,0.4)"
                    : "linear-gradient(135deg,#10b981,#059669)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  cursor: markingReceived ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 8px rgba(16,185,129,0.35)",
                }}
              >
                {markingReceived ? (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: 12,
                        height: 12,
                        border: "2px solid rgba(255,255,255,0.4)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    Processing…
                  </>
                ) : (
                  <>
                    <span>✔</span>Mark as Received
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "1.25rem",
                        height: "1.25rem",
                        padding: "0 0.3rem",
                        background: "rgba(255,255,255,0.25)",
                        borderRadius: 999,
                        fontSize: "0.7rem",
                        fontWeight: 800,
                      }}
                    >
                      {selectedRows.length}
                    </span>
                  </>
                )}
              </button>
            )}

            {/* Generate Transmittal */}
            {selectedRows.length > 0 && (
              <button
                onClick={handleGenerateTransmittal}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.4rem 1rem",
                  background: "linear-gradient(135deg,#1976d2,#1565c0)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(25,118,210,0.35)",
                }}
              >
                <span>📄</span>Generate Transmittal
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "1.25rem",
                    height: "1.25rem",
                    padding: "0 0.3rem",
                    background: "rgba(255,255,255,0.25)",
                    borderRadius: 999,
                    fontSize: "0.7rem",
                    fontWeight: 800,
                  }}
                >
                  {selectedRows.length}
                </span>
              </button>
            )}

            {/* Bulk Endorse / End Task */}
            {showBulkDeckBtn && (
              <button
                onClick={() => setShowBulkDeck(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.4rem 1rem",
                  background: bulkDeckConfig.isEndTask
                    ? "linear-gradient(135deg,#10b981,#059669)"
                    : "linear-gradient(135deg,#7c3aed,#6d28d9)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: bulkDeckConfig.isEndTask
                    ? "0 2px 8px rgba(16,185,129,0.35)"
                    : "0 2px 8px rgba(124,58,237,0.35)",
                  transition: "box-shadow .2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow = bulkDeckConfig.isEndTask
                    ? "0 4px 14px rgba(16,185,129,0.5)"
                    : "0 4px 14px rgba(124,58,237,0.5)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow = bulkDeckConfig.isEndTask
                    ? "0 2px 8px rgba(16,185,129,0.35)"
                    : "0 2px 8px rgba(124,58,237,0.35)")
                }
              >
                <span>{bulkDeckConfig.isEndTask ? "✅" : "📋"}</span>
                {bulkDeckConfig.isEndTask
                  ? "End Task"
                  : bulkDeckConfig.buttonLabel || "Bulk Deck"}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "1.25rem",
                    height: "1.25rem",
                    padding: "0 0.3rem",
                    background: "rgba(255,255,255,0.25)",
                    borderRadius: 999,
                    fontSize: "0.7rem",
                    fontWeight: 800,
                  }}
                >
                  {selectedRows.length}
                </span>
              </button>
            )}

            {isComplianceTab && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.68rem",
                  color: colors.textTertiary,
                }}
              >
                <span style={{ color: "#ef4444", fontWeight: 700 }}>
                  🚨 Overdue
                </span>
                <span>·</span>
                <span style={{ color: "#f97316", fontWeight: 700 }}>
                  🔴 Today
                </span>
                <span>·</span>
                <span style={{ color: "#f59e0b", fontWeight: 700 }}>
                  🟠 ≤3 days
                </span>
                <span>·</span>
                <span style={{ color: "#eab308", fontWeight: 700 }}>
                  🟡 ≤5 days
                </span>
                <span>·</span>
                <span style={{ color: "#10b981", fontWeight: 700 }}>🟢 OK</span>
              </div>
            )}

            {sortBy && (
              <span
                style={{
                  fontSize: "0.6rem",
                  color: colors.textTertiary,
                  padding: "0.2rem 0.6rem",
                  background: colors.badgeBg,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                Sorted by{" "}
                <strong style={{ color: "#4CAF50" }}>{activeSortLabel}</strong>
                <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
              </span>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowX: "auto",
            overflowY: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 2000,
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                background: colors.tableBg,
                zIndex: 20,
              }}
            >
              <tr>
                <th
                  style={{
                    padding: "1rem",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    borderRight: `1px solid ${colors.tableBorder}`,
                    background: colors.tableBg,
                    position: "sticky",
                    left: 0,
                    zIndex: 21,
                    width: "50px",
                    minWidth: "50px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      selectedRows.length === data.length && data.length > 0
                    }
                    onChange={onSelectAll}
                    style={{
                      width: 16,
                      height: 16,
                      cursor: "pointer",
                      accentColor: "#4CAF50",
                    }}
                  />
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    borderRight: `1px solid ${colors.tableBorder}`,
                    background: colors.tableBg,
                    position: "sticky",
                    left: "50px",
                    zIndex: 21,
                    width: "60px",
                    minWidth: "60px",
                  }}
                >
                  #
                </th>

                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontSize: "0.6rem",
                      fontWeight: 600,
                      color: col.complianceOnly
                        ? "#f59e0b"
                        : colors.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: `1px solid ${colors.tableBorder}`,
                      borderTop: col.complianceOnly
                        ? "2px solid #f59e0b"
                        : undefined,
                      width: col.width,
                      minWidth: col.width,
                      whiteSpace: "nowrap",
                      ...(col.frozen
                        ? {
                            position: "sticky",
                            left: col.frozenLeft,
                            zIndex: 22,
                            background: colors.tableBg,
                            boxShadow: "2px 0 6px rgba(0,0,0,0.18)",
                          }
                        : {
                            background: col.complianceOnly
                              ? darkMode
                                ? "rgba(245,158,11,0.08)"
                                : "rgba(245,158,11,0.05)"
                              : colors.tableBg,
                          }),
                      cursor:
                        col.key !== "statusTimeline" &&
                        col.key !== "deadlineDate"
                          ? "pointer"
                          : "default",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (
                        col.key !== "statusTimeline" &&
                        col.key !== "deadlineDate"
                      )
                        e.currentTarget.style.background = darkMode
                          ? "#1e1e1e"
                          : "#ebebeb";
                    }}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = col.frozen
                        ? colors.tableBg
                        : col.complianceOnly
                          ? darkMode
                            ? "rgba(245,158,11,0.08)"
                            : "rgba(245,158,11,0.05)"
                          : colors.tableBg)
                    }
                  >
                    <span
                      style={{ display: "inline-flex", alignItems: "center" }}
                    >
                      {col.label}
                      <SortIcon colKey={col.key} />
                    </span>
                  </th>
                ))}

                <th
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    width: 80,
                    whiteSpace: "nowrap",
                    position: "sticky",
                    right: 0,
                    background: colors.tableBg,
                    zIndex: 21,
                    boxShadow: "-4px 0 8px rgba(0,0,0,.15)",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {data.length === 0 && (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 3}
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      color: colors.textTertiary,
                      fontSize: "0.9rem",
                    }}
                  >
                    No records found.
                  </td>
                </tr>
              )}
              {data.map((row, idx) => {
                const sel = selectedRows.includes(row.id);
                const isUnread = !readIds.has(row.id);
                const dl = isComplianceTab ? row.deadlineDate : null;
                const urgency = dl ? getDeadlineUrgency(dl) : null;
                const isHovered = hoveredRowId === row.id;
                const bg = sel
                  ? "#4CAF5015"
                  : isUnread
                    ? darkMode
                      ? "rgba(33,150,243,0.07)"
                      : "rgba(33,150,243,0.04)"
                    : idx % 2 === 0
                      ? colors.tableRowEven
                      : colors.tableRowOdd;
                const solidStickyBg = isHovered
                  ? colors.tableRowHover
                  : sel
                    ? darkMode
                      ? "#1a2e1a"
                      : "#edf7ed"
                    : isUnread
                      ? darkMode
                        ? "#0f1e2e"
                        : "#e8f1fb"
                      : idx % 2 === 0
                        ? colors.tableRowEven
                        : colors.tableRowOdd;
                const rowBorderLeft = sel
                  ? "3px solid #4CAF50"
                  : isUnread
                    ? "3px solid #2196F3"
                    : urgency === "overdue"
                      ? "3px solid #ef4444"
                      : urgency === "today"
                        ? "3px solid #f97316"
                        : urgency === "critical"
                          ? "3px solid #f59e0b"
                          : urgency === "warning"
                            ? "3px solid #eab308"
                            : "3px solid transparent";

                return (
                  <tr
                    key={row.id}
                    style={{
                      background: isHovered ? colors.tableRowHover : bg,
                      transition: "background .2s",
                      borderLeft: rowBorderLeft,
                    }}
                    onMouseEnter={() => setHoveredRowId(row.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    <td
                      style={{
                        padding: "1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        borderRight: `1px solid ${colors.tableBorder}`,
                        position: "sticky",
                        left: 0,
                        background: solidStickyBg,
                        zIndex: 9,
                        width: "50px",
                        minWidth: "50px",
                        transition: "background .2s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => onSelectRow(row.id)}
                        style={{
                          width: 16,
                          height: 16,
                          cursor: "pointer",
                          accentColor: "#4CAF50",
                        }}
                      />
                    </td>
                    <td
                      style={{
                        padding: "1rem",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: colors.textTertiary,
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        borderRight: `1px solid ${colors.tableBorder}`,
                        textAlign: "center",
                        position: "sticky",
                        left: "50px",
                        background: solidStickyBg,
                        zIndex: 9,
                        width: "60px",
                        minWidth: "60px",
                        transition: "background .2s",
                      }}
                    >
                      {(indexOfFirstRow || 0) + idx + 1}
                    </td>

                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: "1rem",
                          fontSize: "0.78rem",
                          fontWeight: isUnread ? 700 : 400,
                          color: isUnread
                            ? colors.textPrimary
                            : colors.tableText,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          whiteSpace:
                            col.key === "deadlineDate" || col.wrap
                              ? "normal"
                              : "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          width: col.width,
                          minWidth: col.width,
                          ...(col.frozen
                            ? {
                                position: "sticky",
                                left: col.frozenLeft,
                                background: solidStickyBg,
                                zIndex: 9,
                                boxShadow: "2px 0 6px rgba(0,0,0,0.18)",
                                transition: "background .2s",
                              }
                            : {
                                background: col.complianceOnly
                                  ? darkMode
                                    ? "rgba(245,158,11,0.04)"
                                    : "rgba(245,158,11,0.02)"
                                  : undefined,
                              }),
                        }}
                      >
                        {renderCell(col, row, colors)}
                      </td>
                    ))}

                    {/* Actions cell */}
                    <td
                      style={{
                        padding: "1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        textAlign: "center",
                        position: "sticky",
                        right: 0,
                        background: solidStickyBg,
                        zIndex: openMenuId === row.id ? 9999 : 9,
                        boxShadow: "-4px 0 8px rgba(0,0,0,.15)",
                        transition: "background .2s",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        <button
                          onClick={(e) => toggleMenu(e, row.id)}
                          style={{
                            padding: "0.5rem",
                            background: "transparent",
                            border: `1px solid ${colors.cardBorder}`,
                            borderRadius: 6,
                            color: colors.textPrimary,
                            cursor: "pointer",
                            width: 32,
                            height: 32,
                            position: "relative",
                          }}
                        >
                          ⋮
                          {isUnread && (
                            <span
                              style={{
                                position: "absolute",
                                top: -3,
                                right: -3,
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "#2196F3",
                                border: `1.5px solid ${solidStickyBg}`,
                              }}
                            />
                          )}
                        </button>
                        {openMenuId === row.id && (
                          <>
                            <div
                              onClick={() => setOpenMenuId(null)}
                              style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 9998,
                              }}
                            />
                            <div
                              style={{
                                position: "fixed",
                                right: 20,
                                top:
                                  typeof event !== "undefined"
                                    ? event.clientY
                                    : 200,
                                background: colors.cardBg,
                                border: `1px solid ${colors.cardBorder}`,
                                borderRadius: 8,
                                boxShadow: "0 8px 24px rgba(0,0,0,.3)",
                                minWidth: 200,
                                zIndex: 9999,
                                overflow: "hidden",
                              }}
                            >
                              {activeSubTab === "received" &&
                                !isRecordTab &&
                                menuBtn(
                                  () => openDetails(row),
                                  {
                                    borderBottom: `1px solid ${colors.tableBorder}`,
                                  },
                                  [
                                    <span key="i">👁️</span>,
                                    <span key="t">View Details</span>,
                                  ],
                                )}
                              {menuBtn(
                                () => openAppLogs(row),
                                {
                                  borderBottom: `1px solid ${colors.tableBorder}`,
                                },
                                [
                                  <span key="i">🗂️</span>,
                                  <span key="t">Application Logs</span>,
                                ],
                              )}
                              {!isRecordTab &&
                                menuBtn(
                                  () => openChangeLog(row),
                                  {
                                    borderBottom: `1px solid ${colors.tableBorder}`,
                                  },
                                  [
                                    <span key="i">🕓</span>,
                                    <span key="t">Change Log</span>,
                                  ],
                                )}
                              {menuBtn(() => openDoctrack(row), {}, [
                                <span key="i">📋</span>,
                                <span key="t">View Doctrack Details</span>,
                              ])}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div
          style={{
            flexShrink: 0,
            borderTop: `1px solid ${colors.tableBorder}`,
            background: colors.cardBg,
          }}
        >
          <TablePagination
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            totalRecords={totalRecords}
            totalPages={totalPages}
            indexOfFirstRow={indexOfFirstRow}
            indexOfLastRow={indexOfLastRow}
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
            colors={colors}
          />
        </div>
      </div>

      {/* ── Modals ── */}
      {selectedRowDetails && (
        <ViewDetailsModal
          record={selectedRowDetails}
          onClose={() => setSelectedRowDetails(null)}
          onSuccess={async () => {
            setSelectedRowDetails(null);
            if (onRefresh) await onRefresh();
          }}
          colors={colors}
          darkMode={darkMode}
        />
      )}
      {doctrackModalRecord && (
        <DoctrackModal
          record={doctrackModalRecord}
          onClose={() => setDoctrackModalRecord(null)}
          colors={colors}
        />
      )}
      {changeLogRecord && (
        <ChangeLogModal
          record={changeLogRecord}
          onClose={() => setChangeLogRecord(null)}
          colors={colors}
        />
      )}
      {appLogsRecord && (
        <ApplicationLogsModal
          record={appLogsRecord}
          onClose={() => setAppLogsRecord(null)}
          colors={colors}
          darkMode={darkMode}
        />
      )}

      {/* ── Confirm Receive modal ── */}
      {confirmReceive && (
        <div
          onClick={() => setConfirmReceive(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 14,
              padding: "2rem",
              width: 400,
              maxWidth: "90%",
              boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                fontSize: "2rem",
                marginBottom: "0.75rem",
                textAlign: "center",
              }}
            >
              📥
            </div>
            <h3
              style={{
                margin: "0 0 0.5rem",
                color: colors.textPrimary,
                fontSize: "1.05rem",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              Mark as Received?
            </h3>
            <p
              style={{
                margin: "0 0 1.5rem",
                color: colors.textSecondary,
                fontSize: "0.88rem",
                lineHeight: 1.6,
                textAlign: "center",
              }}
            >
              You are about to mark{" "}
              <strong style={{ color: "#10b981" }}>
                {selectedRows.length}{" "}
                {selectedRows.length === 1 ? "record" : "records"}
              </strong>{" "}
              as received. This action cannot be undone.
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => setConfirmReceive(false)}
                style={{
                  padding: "0.55rem 1.25rem",
                  borderRadius: 8,
                  border: `1px solid ${colors.cardBorder}`,
                  background: "transparent",
                  color: colors.textSecondary,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmReceive(false);
                  handleMarkAsReceived();
                }}
                style={{
                  padding: "0.55rem 1.5rem",
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(135deg,#10b981,#059669)",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(16,185,129,0.35)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <span>✔</span> Yes, Mark as Received
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Deck Modal ── */}
      {showBulkDeck && bulkDeckConfig && (
        <BulkDeckModal
          selectedCount={selectedRows.length}
          selectedDtns={data
            .filter((r) => selectedRows.includes(r.id))
            .map((r) => r.dtn || r.id)}
          config={bulkDeckConfig}
          colors={colors}
          darkMode={darkMode}
          onClose={() => setShowBulkDeck(false)}
          onConfirm={handleBulkDeck}
          onDownloadTransmittal={handleGenerateTransmittal}
          onDone={async () => {
            if (onClearSelections) onClearSelections();
            if (onRefresh) await onRefresh();
            setShowBulkDeck(false);
          }}
        />
      )}

      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </>
  );
}

export default DataTable;
