// src/components/tasks/DataTable/index.jsx
/* ================================================================== */
/*  DataTable — index.jsx                                              */
/* ================================================================== */
import { useState, useEffect } from "react";
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
  toggleStarApplicationLog,
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
import { BulkCompleteModal } from "./BulkCompleteModal";
import HowToUseModal, { useHowToUseGuide } from "./HowToUseModal";
import { closeTasksBulk, getCurrentUser } from "../../../api/closed-tasks";
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
  visibleColumnKeys = null,
  onVisibleColumnKeysChange,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedRowDetails, setSelectedRowDetails] = useState(null);
  const [doctrackModalRecord, setDoctrackModalRecord] = useState(null);
  const [appLogsRecord, setAppLogsRecord] = useState(null);
  const [changeLogRecord, setChangeLogRecord] = useState(null);
  const [markingReceived, setMarkingReceived] = useState(false);
  const [confirmReceive, setConfirmReceive] = useState(false);
  const [confirmReceiveRow, setConfirmReceiveRow] = useState(null);
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [showBulkDeck, setShowBulkDeck] = useState(false);
  const [showBulkComplete, setShowBulkComplete] = useState(false);
  const { showGuide, openGuide, closeGuide } = useHowToUseGuide();
  const [showColPicker, setShowColPicker] = useState(false);

  const isComplianceTab =
    activeTab === "Compliance" || activeTab === "PRSDD Compliance";
  const isRecordTab = activeTab === "Record";
  const isReceivedSubTab = activeSubTab === "received";
  const showMarkAsReceived = activeSubTab !== "received";

  const bulkDeckConfig = BULK_DECK_CONFIG[activeTab] ?? null;
  const showBulkDeckBtn =
    !!bulkDeckConfig && isReceivedSubTab && selectedRows.length > 0;

  const [starredIds, setStarredIds] = useState(
    () => new Set(data.filter((r) => r.is_starred === 1).map((r) => r.id)),
  );
  useEffect(() => {
    setStarredIds(
      new Set(data.filter((r) => r.is_starred === 1).map((r) => r.id)),
    );
  }, [data]);
  /* ── Visible columns ── */
  const allColumns = isRecordTab
    ? RECORD_TAB_COLUMNS.map((key) =>
        tableColumns.find((col) => col.key === key),
      ).filter(Boolean)
    : tableColumns.filter((col) => !col.complianceOnly || isComplianceTab);

  const visibleColumns = visibleColumnKeys
    ? allColumns.filter(
        (col) =>
          col.key === "__divider__" || visibleColumnKeys.includes(col.key),
      )
    : allColumns;

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
          marginLeft: 3,
          lineHeight: 1,
          verticalAlign: "middle",
          gap: 1,
        }}
      >
        <span
          style={{
            fontSize: "0.42rem",
            lineHeight: 1,
            color: on && sortOrder === "asc" ? "#4CAF50" : colors.textTertiary,
            opacity: on && sortOrder === "asc" ? 1 : 0.3,
          }}
        >
          ▲
        </span>
        <span
          style={{
            fontSize: "0.42rem",
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
  const handleMarkAsReceived = async (overrideRow = null) => {
    const idsToMark = overrideRow ? [overrideRow.id] : selectedRows;
    if (!idsToMark.length || markingReceived) return;
    setMarkingReceived(true);
    try {
      await markWorkflowTasksAsReceived(idsToMark);
      if (onClearSelections) onClearSelections();
      if (onRefresh) await onRefresh();
    } catch (e) {
      console.error("Mark as Received error:", e);
    } finally {
      setMarkingReceived(false);
      setConfirmReceiveRow(null);
    }
  };

  /* ── Bulk Deck handler ── */
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
      signedDate = null,
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
      decision === "Returned to Evaluator" ||
      decision === "Checked and returned to evaluator";

    const returnTargetStep = [
      "PRSDD Checking",
      "PRSDD Supervisor",
      "PRSDD QA Admin",
    ].includes(bulkDeckConfig.currentStep)
      ? "PRSDD Quality Evaluation"
      : "Quality Evaluation";

    let resolvedNextStep = isReturnDecision
      ? returnTargetStep
      : (bulkDeckConfig.nextStep ?? null);

    const isEndTask = bulkDeckConfig.isEndTask || resolvedNextStep === null;
    const finalDecision = decision || "";

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
        let resolvedAssignee = assigneeUsername;
        let resolvedAssigneeId = resolveUserId(assigneeUsername);
        let perRowNextStep = resolvedNextStep;

        if (isReturnDecision) {
          try {
            const logs = await getApplicationLogs(mainDbId);
            const sorted = Array.isArray(logs)
              ? [...logs].sort(
                  (a, b) => (a.del_index ?? 0) - (b.del_index ?? 0),
                )
              : [];

            console.log(
              "🔍 All logs:",
              sorted.map((l) => ({
                step: l.application_step,
                thread: l.del_thread,
                status: l.application_status,
                user: l.user_name,
              })),
            );
            const currentLogIdx = sorted.findIndex(
              (l) =>
                l.application_step === bulkDeckConfig.currentStep &&
                l.del_thread === "Open",
            );
            console.log("🔍 currentLogIdx:", currentLogIdx);
            console.log("🔍 returnTargetStep:", returnTargetStep);

            let prevEval = null,
              prevEvalId = null;

            const hasPRSDD = sorted.some(
              (l) => l.application_step === "PRSDD Quality Evaluation",
            );
            const effectiveTargetStep = hasPRSDD
              ? "PRSDD Quality Evaluation"
              : "Quality Evaluation";

            if (currentLogIdx > 0) {
              for (let i = currentLogIdx - 1; i >= 0; i--) {
                if (sorted[i].application_step === effectiveTargetStep) {
                  prevEval = sorted[i].user_name ?? null;
                  prevEvalId = sorted[i].user_id ?? null;
                  break;
                }
              }
            }
            resolvedAssignee = prevEval;
            resolvedAssigneeId = prevEvalId;
            perRowNextStep = effectiveTargetStep;

            console.log(
              "🔍 BulkDeck return — resolvedAssignee:",
              resolvedAssignee,
              "| resolvedAssigneeId:",
              resolvedAssigneeId,
            );
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
          const phtDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
          const dateReleasedStr = phtDate.toISOString().slice(0, 10);
          const odReleasingDocType =
            isODReleasing && decisionResult
              ? ({
                  "For issuance of CPR": "CPR",
                  "For issuance of LOD": "LOD",
                  "For issuance of Certificate": "Certificate",
                  "For issuance of Letter": "Letter",
                  "For issuance of COPP": "COPP",
                  "For issuance of CFS": "CFS",
                  "For issuance of GLE": "GLE",
                  "For issuance of Letter for non acceptance":
                    "Letter for non acceptance",
                  "For issuance of Product classification":
                    "Product classification",
                  "Letter (Withdrawal)": "Letter (Withdrawal)",
                  "Letter (Re-routed)": "Letter (Re-routed)",
                }[decisionResult] ?? null)
              : null;
          await updateUploadReport(mainDbId, {
            DB_APP_STATUS: "COMPLETED",
            DB_DATE_RELEASED: dateReleasedStr,
            ...(isODReleasing && decisionResult
              ? {
                  DB_DECISION_RESULT: decisionResult,
                  DB_DECISION_AUTHORITY: decisionAuthorityName || "",
                  DB_DECISION_SIGNED_DATE: signedDate || null,
                  ...(odReleasingDocType != null
                    ? { DB_TYPE_DOC_RELEASED: odReleasingDocType }
                    : {}),
                }
              : {}),
          });
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

          if (isODReleasing) {
            const DECISION_RESULT_TO_DOC_TYPE = {
              "For issuance of CPR": "CPR",
              "For issuance of LOD": "LOD",
              "For issuance of Certificate": "Certificate",
              "For issuance of Letter": "Letter",
              "For issuance of COPP": "COPP",
              "For issuance of CFS": "CFS",
              "For issuance of GLE": "GLE",
              "For issuance of Letter for non acceptance":
                "Letter for non acceptance",
              "For issuance of Product classification":
                "Product classification",
              "Letter (Withdrawal)": "Letter (Withdrawal)",
              "Letter (Re-routed)": "Letter (Re-routed)",
            };
            const docTypeReleased =
              DECISION_RESULT_TO_DOC_TYPE[decisionResult] ?? null;

            await updateUploadReport(mainDbId, {
              DB_DECISION_RESULT: decisionResult || "",
              DB_DECISION_AUTHORITY: decisionAuthorityName || "",
              DB_DECISION_SIGNED_DATE: signedDate || null,
              ...(docTypeReleased != null && {
                DB_TYPE_DOC_RELEASED: docTypeReleased,
              }),
            });
          }
          console.log(
            "🔍 createApplicationLog payload — user_name:",
            resolvedAssignee,
            "| user_id:",
            resolvedAssigneeId,
          );
          await createApplicationLog({
            main_db_id: mainDbId,
            application_step: perRowNextStep,
            user_name: resolvedAssignee,
            user_id: resolvedAssigneeId,
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

  const handleBulkComplete = async ({
    remarks,
    reason,
    dateReleased,
    typeDocReleased,
    cprApiEnabled,
    cprInsertSuccess,
    cprInsertError,
    cprSkippedByUser,
  }) => {
    const me = getCurrentUser();
    if (!me?.id) throw new Error("No logged-in user found.");

    const closedAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

    const seen = new Set();
    const selectedData = data
      .filter((r) => selectedRows.includes(r.id))
      .filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });

    const mainDbIds = selectedData.map((r) => r.mainDbId ?? r.id);

    await closeTasksBulk({
      main_db_ids: mainDbIds,
      reason_for_closing: reason,
      remarks: remarks || null,
      date_released: dateReleased || null,
      type_doc_released: typeDocReleased || null,
      closed_by_user_id: me.id,
      closed_by_user_name: me.username,
      closed_at: closedAt,
      // ── CPR audit fields ──
      cpr_api_enabled: cprApiEnabled ?? null,
      cpr_insert_success: cprInsertSuccess ?? null,
      cpr_insert_error: cprInsertError ?? null,
      cpr_skipped_by_user: cprSkippedByUser ?? false,
    });

    let success = 0;
    let failed = 0;

    await Promise.allSettled(
      selectedData.map(async (row) => {
        try {
          await updateUploadReport(row.mainDbId ?? row.id, {
            DB_APP_STATUS: "COMPLETED",
            ...(dateReleased ? { DB_DATE_RELEASED: dateReleased } : {}),
            ...(typeDocReleased
              ? { DB_TYPE_DOC_RELEASED: typeDocReleased }
              : {}),
          });
          success++;
        } catch (e) {
          console.error(`updateReport failed for id ${row.id}:`, e);
          failed++;
        }
      }),
    );

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
        padding: "0.55rem 0.85rem",
        background: "transparent",
        border: "none",
        color: colors.textPrimary,
        fontSize: "0.78rem",
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
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

  /* ── Shared small-button style ── */
  const smallBtn = (extra = {}) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    padding: "0.22rem 0.55rem",
    borderRadius: 5,
    border: "none",
    color: "#fff",
    fontSize: "0.62rem",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.01em",
    ...extra,
  });

  const smallBadge = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "0.9rem",
    height: "0.9rem",
    padding: "0 0.2rem",
    background: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    fontSize: "0.55rem",
    fontWeight: 800,
  };

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
            padding: "0.45rem 0.85rem",
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
              gap: "0.4rem",
              flexWrap: "wrap",
            }}
          >
            <h3
              style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                color: colors.textPrimary,
                margin: 0,
              }}
            >
              Task Data
            </h3>

            <button
              onClick={openGuide}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                padding: "2px 7px",
                borderRadius: 999,
                background: colors.badgeBg,
                border: `1px solid ${colors.cardBorder}`,
                color: colors.textSecondary,
                fontSize: "0.58rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#7c3aed",
                  color: "#fff",
                  fontSize: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                }}
              >
                ?
              </span>
              How to use
            </button>

            <span
              style={{
                padding: "0.15rem 0.5rem",
                background: colors.badgeBg,
                borderRadius: 10,
                fontSize: "0.55rem",
                color: colors.textTertiary,
                fontWeight: 600,
              }}
            >
              {totalRecords} total records
            </span>

            {/* Column Picker */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowColPicker((p) => !p)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.22rem 0.55rem",
                  background: showColPicker
                    ? "linear-gradient(135deg,#4f46e5,#4338ca)"
                    : colors.badgeBg,
                  border: `1px solid ${showColPicker ? "#4f46e5" : colors.cardBorder}`,
                  borderRadius: 5,
                  color: showColPicker ? "#fff" : colors.textSecondary,
                  fontSize: "0.62rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: "0.6rem" }}>⚙️</span>
                Columns
                {visibleColumnKeys && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "0.9rem",
                      height: "0.9rem",
                      padding: "0 0.2rem",
                      background: "#4f46e5",
                      borderRadius: 999,
                      fontSize: "0.55rem",
                      fontWeight: 800,
                      color: "#fff",
                    }}
                  >
                    {visibleColumnKeys.length}
                  </span>
                )}
              </button>

              {showColPicker && (
                <>
                  <div
                    onClick={() => setShowColPicker(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 9998 }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      right: 0,
                      background: colors.cardBg,
                      border: `1px solid ${colors.cardBorder}`,
                      borderRadius: 10,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                      zIndex: 9999,
                      width: 210,
                      maxHeight: 380,
                      overflowY: "auto",
                      padding: "0.4rem 0",
                    }}
                  >
                    <div
                      style={{
                        padding: "0.4rem 0.75rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: colors.textPrimary,
                        }}
                      >
                        Toggle Columns
                      </span>
                      <button
                        onClick={() => onVisibleColumnKeysChange?.(null)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#4CAF50",
                          fontSize: "0.62rem",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Show All
                      </button>
                    </div>
                    {allColumns
                      .filter((col) => col.key !== "__divider__" && col.label)
                      .map((col) => {
                        const isChecked =
                          !visibleColumnKeys ||
                          visibleColumnKeys.includes(col.key);
                        return (
                          <label
                            key={col.key}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.38rem 0.75rem",
                              cursor: "pointer",
                              fontSize: "0.7rem",
                              color: colors.textPrimary,
                              transition: "background .15s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                colors.tableRowHover)
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const currentKeys =
                                  visibleColumnKeys ||
                                  allColumns
                                    .filter(
                                      (c) => c.key !== "__divider__" && c.label,
                                    )
                                    .map((c) => c.key);
                                const next = isChecked
                                  ? currentKeys.filter((k) => k !== col.key)
                                  : [...currentKeys, col.key];
                                onVisibleColumnKeysChange?.(
                                  next.length ===
                                    allColumns.filter(
                                      (c) => c.key !== "__divider__" && c.label,
                                    ).length
                                    ? null
                                    : next,
                                );
                              }}
                              style={{
                                accentColor: "#4CAF50",
                                width: 12,
                                height: 12,
                              }}
                            />
                            <span
                              style={{
                                color: col.complianceOnly
                                  ? "#f59e0b"
                                  : colors.textPrimary,
                              }}
                            >
                              {col.label}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </>
              )}
            </div>

            {/* Mark as Received */}
            {selectedRows.length > 0 && showMarkAsReceived && (
              <button
                onClick={() => {
                  setConfirmReceiveRow(null);
                  setConfirmReceive(true);
                }}
                disabled={markingReceived}
                style={smallBtn({
                  background: markingReceived
                    ? "rgba(16,185,129,0.4)"
                    : "linear-gradient(135deg,#10b981,#059669)",
                  boxShadow: "0 1px 4px rgba(16,185,129,0.3)",
                  cursor: markingReceived ? "not-allowed" : "pointer",
                })}
              >
                {markingReceived ? (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        border: "1.5px solid rgba(255,255,255,0.4)",
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
                    <span style={smallBadge}>{selectedRows.length}</span>
                  </>
                )}
              </button>
            )}

            {/* Generate Transmittal */}
            {selectedRows.length > 0 && (
              <button
                onClick={handleGenerateTransmittal}
                style={smallBtn({
                  background: "linear-gradient(135deg,#1976d2,#1565c0)",
                  boxShadow: "0 1px 4px rgba(25,118,210,0.3)",
                })}
              >
                <span>📄</span>Generate Transmittal
                <span style={smallBadge}>{selectedRows.length}</span>
              </button>
            )}

            {/* Close Task (Final)
            {selectedRows.length > 0 && (
              <button
                onClick={() => setShowBulkComplete(true)}
                style={smallBtn({
                  background: "linear-gradient(135deg,#dc2626,#b91c1c)",
                  border: "1px solid #991b1b",
                  boxShadow: "0 1px 4px rgba(220,38,38,0.3)",
                })}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow =
                    "0 2px 8px rgba(220,38,38,0.45)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow =
                    "0 1px 4px rgba(220,38,38,0.3)")
                }
              >
                <span>🔒</span>Close Task (Final)
                <span style={smallBadge}>{selectedRows.length}</span>
              </button>
            )} */}

            {/* Close Task (Final) — temporarily disabled */}
            {selectedRows.length > 0 && (
              <button
                disabled
                style={smallBtn({
                  background: "rgba(150,150,150,0.3)",
                  border: "1px solid rgba(150,150,150,0.2)",
                  boxShadow: "none",
                  cursor: "not-allowed",
                  opacity: 0.5,
                })}
              >
                <span>🔒</span>Close Task (Final)
                <span style={smallBadge}>{selectedRows.length}</span>
              </button>
            )}

            {/* Bulk Endorse / End Task */}
            {showBulkDeckBtn && (
              <button
                onClick={() => setShowBulkDeck(true)}
                style={smallBtn({
                  background: bulkDeckConfig.isEndTask
                    ? "linear-gradient(135deg,#10b981,#059669)"
                    : "linear-gradient(135deg,#7c3aed,#6d28d9)",
                  boxShadow: bulkDeckConfig.isEndTask
                    ? "0 1px 4px rgba(16,185,129,0.3)"
                    : "0 1px 4px rgba(124,58,237,0.3)",
                })}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow = bulkDeckConfig.isEndTask
                    ? "0 2px 8px rgba(16,185,129,0.45)"
                    : "0 2px 8px rgba(124,58,237,0.45)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow = bulkDeckConfig.isEndTask
                    ? "0 1px 4px rgba(16,185,129,0.3)"
                    : "0 1px 4px rgba(124,58,237,0.3)")
                }
              >
                <span>{bulkDeckConfig.isEndTask ? "✅" : "📋"}</span>
                {bulkDeckConfig.isEndTask
                  ? "End Task"
                  : bulkDeckConfig.buttonLabel || "Bulk Deck"}
                <span style={smallBadge}>{selectedRows.length}</span>
              </button>
            )}

            {isComplianceTab && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.6rem",
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
                  fontSize: "0.55rem",
                  color: colors.textTertiary,
                  padding: "0.15rem 0.5rem",
                  background: colors.badgeBg,
                  borderRadius: 5,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
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
                    padding: "0.45rem 0.5rem",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    borderRight: `1px solid ${colors.tableBorder}`,
                    background: colors.tableBg,
                    position: "sticky",
                    left: 0,
                    zIndex: 21,
                    width: "40px",
                    minWidth: "40px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      data.length > 0 &&
                      data.every((r) => selectedRows.includes(r.id))
                    }
                    onChange={onSelectAll}
                    style={{
                      width: 13,
                      height: 13,
                      cursor: "pointer",
                      accentColor: "#4CAF50",
                    }}
                  />
                </th>
                <th
                  style={{
                    padding: "0.45rem 0.5rem",
                    textAlign: "center",
                    fontSize: "0.55rem",
                    fontWeight: 600,
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    borderRight: `1px solid ${colors.tableBorder}`,
                    background: colors.tableBg,
                    position: "sticky",
                    left: "40px",
                    zIndex: 21,
                    width: "40px",
                    minWidth: "40px",
                  }}
                >
                  #
                </th>
                <th
                  style={{
                    padding: "0.45rem 0.3rem",
                    textAlign: "center",
                    fontSize: "0.75rem",
                    color: "#f59e0b",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    background: colors.tableBg,
                    position: "sticky",
                    left: "80px",
                    zIndex: 21,
                    width: "36px",
                    minWidth: "36px",
                    cursor: "default", // ← no pointer
                    userSelect: "none",
                  }}
                >
                  ★ {/* ← NO SortIcon here */}
                </th>
                <th
                  style={{
                    padding: "0.45rem 0.4rem",
                    textAlign: "left",
                    fontSize: "0.55rem",
                    fontWeight: 600,
                    color: "#22c55e",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    background: colors.tableBg,
                    position: "sticky",
                    left: "116px",
                    zIndex: 21,
                    width: "110px",
                    minWidth: "110px",
                    whiteSpace: "nowrap",
                    cursor: "default",
                    userSelect: "none",
                  }}
                >
                  🎯 Target
                </th>

                {visibleColumns.map((col) =>
                  col.key === "__divider__" ? (
                    <td
                      key="__divider__"
                      style={{
                        padding: 0,
                        width: "1px",
                        minWidth: "1px",
                        background: colors.tableBorder,
                        borderBottom: `1px solid ${colors.tableBorder}`,
                      }}
                    />
                  ) : (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      style={{
                        padding: "0.45rem 0.6rem",
                        textAlign: "left",
                        fontSize: "0.55rem",
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
                  ),
                )}

                <th
                  style={{
                    padding: "0.45rem 0.5rem",
                    textAlign: "center",
                    fontSize: "0.55rem",
                    fontWeight: 600,
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    width: 60,
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
                  : idx % 2 === 0
                    ? colors.tableRowEven
                    : colors.tableRowOdd;
                const solidStickyBg = isHovered
                  ? colors.tableRowHover
                  : sel
                    ? darkMode
                      ? "#1a2e1a"
                      : "#edf7ed"
                    : idx % 2 === 0
                      ? colors.tableRowEven
                      : colors.tableRowOdd;
                const rowBorderLeft = sel
                  ? "1px solid #4CAF50"
                  : urgency === "overdue"
                    ? "1px solid #ef4444"
                    : urgency === "today"
                      ? "1px solid #f97316"
                      : urgency === "critical"
                        ? "1px solid #f59e0b"
                        : urgency === "warning"
                          ? "1px solid #eab308"
                          : "1px solid transparent";

                return (
                  <tr
                    key={row.id}
                    style={{
                      background: isHovered ? colors.tableRowHover : bg,
                      transition: "background .2s",
                      borderLeft: rowBorderLeft,
                      cursor: isHovered
                        ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%234CAF50' stroke='white' stroke-width='1' d='M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L6.35 2.85a.5.5 0 0 0-.85.36Z'/%3E%3C/svg%3E") 4 2, pointer`
                        : "default",
                    }}
                    onMouseEnter={() => setHoveredRowId(row.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                    onDoubleClick={() => {
                      if (activeSubTab === "not_yet") {
                        setConfirmReceiveRow(row);
                        setConfirmReceive(true);
                      } else if (activeSubTab === "received" && !isRecordTab) {
                        openDetails(row);
                      }
                    }}
                  >
                    <td
                      style={{
                        padding: "0.45rem 0.5rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        borderRight: `1px solid ${colors.tableBorder}`,
                        position: "sticky",
                        left: 0,
                        background: solidStickyBg,
                        zIndex: 9,
                        width: "40px",
                        minWidth: "40px",
                        transition: "background .2s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => onSelectRow(row.id)}
                        style={{
                          width: 13,
                          height: 13,
                          cursor: "pointer",
                          accentColor: "#4CAF50",
                        }}
                      />
                    </td>
                    <td
                      style={{
                        padding: "0.45rem 0.5rem",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: colors.textTertiary,
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        borderRight: `1px solid ${colors.tableBorder}`,
                        textAlign: "center",
                        position: "sticky",
                        left: "40px",
                        background: solidStickyBg,
                        zIndex: 9,
                        width: "40px",
                        minWidth: "40px",
                        transition: "background .2s",
                      }}
                    >
                      {(indexOfFirstRow || 0) + idx + 1}
                    </td>

                    {/* ⭐ Star column */}
                    <td
                      style={{
                        padding: "0.4rem 0.3rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        textAlign: "center",
                        position: "sticky",
                        left: "80px",
                        background: solidStickyBg,
                        zIndex: 9,
                        width: "36px",
                        minWidth: "36px",
                        transition: "background .2s",
                      }}
                    >
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const currentlyStarred = starredIds.has(row.id);
                          const newStarred = !currentlyStarred;

                          // ── Optimistic update — walang onRefresh ──
                          setStarredIds((prev) => {
                            const next = new Set(prev);
                            if (newStarred) next.add(row.id);
                            else next.delete(row.id);
                            return next;
                          });

                          try {
                            await toggleStarApplicationLog(row.id, newStarred);
                            // ── TANGGALIN ang onRefresh dito — nagre-reset kasi ng starredIds ──
                          } catch (err) {
                            console.error("Star toggle failed:", err);
                            // ── Revert lang kung may error ──
                            setStarredIds((prev) => {
                              const next = new Set(prev);
                              if (currentlyStarred) next.add(row.id);
                              else next.delete(row.id);
                              return next;
                            });
                          }
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.9rem",
                          lineHeight: 1,
                          padding: "2px",
                          color: starredIds.has(row.id)
                            ? "#f59e0b"
                            : "transparent",
                          WebkitTextStroke: starredIds.has(row.id)
                            ? "0"
                            : `1px ${colors.textTertiary}`,
                          transition: "color .15s, opacity .15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#f59e0b";
                          e.currentTarget.style.WebkitTextStroke = "0";
                        }}
                        onMouseLeave={(e) => {
                          const isStarred = starredIds.has(row.id);
                          e.currentTarget.style.color = isStarred
                            ? "#f59e0b"
                            : "transparent";
                          e.currentTarget.style.WebkitTextStroke = isStarred
                            ? "0"
                            : `1px ${colors.textTertiary}`;
                        }}
                        title={
                          starredIds.has(row.id) ? "Unstar" : "Star this task"
                        }
                      >
                        ★
                      </button>
                    </td>

                    {/* 🎯 Target indicator */}
                    <td
                      style={{
                        padding: "0.4rem 0.4rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        textAlign: "left",
                        position: "sticky",
                        left: "116px",
                        background: solidStickyBg,
                        zIndex: 9,
                        width: "110px",
                        minWidth: "110px",
                        whiteSpace: "nowrap",
                        transition: "background .2s",
                      }}
                      title={row.target_remarks || ""}
                    >
                      {row.is_targeted && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            color: "#22c55e",
                          }}
                        >
                          🎯{" "}
                          {row.target_end_date
                            ? `until ${new Date(
                                row.target_end_date,
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}`
                            : "Targeted"}
                        </span>
                      )}
                    </td>

                    {visibleColumns.map((col) =>
                      col.key === "__divider__" ? (
                        <td
                          key="__divider__"
                          style={{
                            padding: 0,
                            width: "1px",
                            minWidth: "1px",
                            background: colors.tableBorder,
                            borderBottom: `1px solid ${colors.tableBorder}`,
                          }}
                        />
                      ) : (
                        <td
                          key={col.key}
                          style={{
                            padding: "0.4rem 0.6rem",
                            fontSize: "0.68rem",
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
                          {renderCell(
                            col,
                            row,
                            colors,
                            col.key === "dtn"
                              ? () => openDoctrack(row)
                              : undefined,
                          )}
                        </td>
                      ),
                    )}

                    {/* Actions cell */}
                    <td
                      style={{
                        padding: "0.4rem 0.5rem",
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
                            padding: "0.25rem",
                            background: "transparent",
                            border: `1px solid ${colors.cardBorder}`,
                            borderRadius: 5,
                            color: colors.textPrimary,
                            cursor: "pointer",
                            width: 24,
                            height: 24,
                            position: "relative",
                            fontSize: "0.75rem",
                            lineHeight: 1,
                          }}
                        >
                          ⋮
                          {isUnread && (
                            <span
                              style={{
                                position: "absolute",
                                top: -2,
                                right: -2,
                                width: 6,
                                height: 6,
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
                                minWidth: 190,
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
            indexOfFirstRow={totalRecords === 0 ? 0 : indexOfFirstRow + 1}
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
                {confirmReceiveRow ? 1 : selectedRows.length}{" "}
                {(confirmReceiveRow ? 1 : selectedRows.length) === 1
                  ? "record"
                  : "records"}
              </strong>{" "}
              as received.
              {confirmReceiveRow?.dtn && (
                <span
                  style={{
                    display: "block",
                    marginTop: "0.6rem",
                    padding: "0.4rem 0.85rem",
                    background: "rgba(8,145,178,0.08)",
                    border: "1px solid rgba(8,145,178,0.2)",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "#0891b2",
                    letterSpacing: "0.03em",
                  }}
                >
                  📋 {confirmReceiveRow.dtn}
                </span>
              )}
              {!confirmReceiveRow && selectedRows.length > 0 && (
                <span
                  style={{
                    display: "block",
                    marginTop: "0.6rem",
                    padding: "0.4rem 0.85rem",
                    background: "rgba(8,145,178,0.08)",
                    border: "1px solid rgba(8,145,178,0.2)",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    color: "#0891b2",
                    textAlign: "left",
                    maxHeight: "120px",
                    overflowY: "auto",
                    lineHeight: 1.8,
                  }}
                >
                  {data
                    .filter((r) => selectedRows.includes(r.id))
                    .map((r) => (
                      <span
                        key={r.id}
                        style={{ display: "block", fontWeight: 600 }}
                      >
                        📋 {r.dtn}
                      </span>
                    ))}
                </span>
              )}
              <span
                style={{
                  display: "block",
                  marginTop: "0.6rem",
                  fontSize: "0.75rem",
                  color: colors.textTertiary,
                }}
              >
                This action cannot be undone.
              </span>
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
                  handleMarkAsReceived(confirmReceiveRow);
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
      {showGuide && (
        <HowToUseModal
          colors={colors}
          darkMode={darkMode}
          onClose={closeGuide}
        />
      )}
      {showBulkDeck && bulkDeckConfig && (
        <BulkDeckModal
          selectedCount={selectedRows.length}
          selectedDtns={data
            .filter((r) => selectedRows.includes(r.id))
            .map((r) => r.dtn || r.id)}
          selectedRecords={data.filter((r) => selectedRows.includes(r.id))}
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

      {showBulkComplete && (
        <BulkCompleteModal
          selectedCount={selectedRows.length}
          selectedDtns={data
            .filter((r) => selectedRows.includes(r.id))
            .map((r) => r.dtn || r.id)}
          colors={colors}
          darkMode={darkMode}
          onClose={() => setShowBulkComplete(false)}
          onConfirm={handleBulkComplete}
          currentUser={getCurrentUser()}
          onDone={async () => {
            if (onClearSelections) onClearSelections();
            if (onRefresh) await onRefresh();
            setShowBulkComplete(false);
          }}
        />
      )}
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </>
  );
}

export default DataTable;
