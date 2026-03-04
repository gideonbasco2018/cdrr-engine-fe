import { useState } from "react";
import { tableColumns, COLUMN_DB_KEY_MAP } from "./tableColumns";
import TablePagination from "./TablePagination";
import ViewDetailsModal from "./ViewDetailsModal";
import DoctrackModal from "../../components/reports/actions/DoctrackModal";
import ApplicationLogsModal from "./ApplicationLogsModal";
import ChangeLogModal from "../tasks/ChangeLogModal";

// ── Deadline Helpers ──────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0];

const countWorkingDays = (startStr, endStr) => {
  if (!endStr) return null;
  let count = 0;
  const current = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  if (end <= current) return 0;
  while (current < end) {
    current.setDate(current.getDate() + 1);
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
};

const getDeadlineUrgency = (deadlineDateStr) => {
  if (!deadlineDateStr) return null;
  const today = new Date(todayStr() + "T00:00:00");
  const end = new Date(deadlineDateStr + "T00:00:00");
  if (end < today) return "overdue";
  if (end.toDateString() === today.toDateString()) return "today";
  const wdays = countWorkingDays(todayStr(), deadlineDateStr);
  if (wdays <= 3) return "critical";
  if (wdays <= 5) return "warning";
  return "ok";
};

const URGENCY_CONFIG = {
  overdue: {
    bg: "rgba(239,68,68,0.12)",
    color: "#fca5a5",
    border: "#ef4444",
    icon: "🚨",
  },
  today: {
    bg: "rgba(249,115,22,0.12)",
    color: "#fdba74",
    border: "#f97316",
    icon: "🔴",
  },
  critical: {
    bg: "rgba(245,158,11,0.12)",
    color: "#fcd34d",
    border: "#f59e0b",
    icon: "🟠",
  },
  warning: {
    bg: "rgba(234,179,8,0.10)",
    color: "#fde68a",
    border: "#eab308",
    icon: "🟡",
  },
  ok: {
    bg: "rgba(16,185,129,0.08)",
    color: "#6ee7b7",
    border: "#10b981",
    icon: "🟢",
  },
};

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
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedRowDetails, setSelectedRowDetails] = useState(null);
  const [doctrackModalRecord, setDoctrackModalRecord] = useState(null);
  const [appLogsRecord, setAppLogsRecord] = useState(null);
  const [changeLogRecord, setChangeLogRecord] = useState(null);

  const isComplianceTab = activeTab === "Compliance";

  // Hide complianceOnly columns when not on Compliance tab
  const visibleColumns = tableColumns.filter(
    (col) => !col.complianceOnly || isComplianceTab,
  );

  /* ── Sort helpers ── */
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

  /* ── Timeline ── */
  const calcTimeline = (row) => {
    const {
      dateReceivedCent,
      dateReleased,
      dbTimelineCitizenCharter: tl,
    } = row;
    if (!dateReceivedCent || !tl || dateReceivedCent === "N/A" || tl === null)
      return { status: "", days: 0 };
    const r = new Date(dateReceivedCent);
    const e =
      dateReleased && dateReleased !== "N/A"
        ? new Date(dateReleased)
        : new Date();
    if (isNaN(r) || isNaN(e)) return { status: "", days: 0 };
    const d = Math.ceil(Math.abs(e - r) / 864e5);
    return d <= parseInt(tl, 10)
      ? { status: "WITHIN", days: d }
      : { status: "BEYOND", days: d };
  };

  const renderTimeline = (row) => {
    const { status, days } = calcTimeline(row);
    if (!status)
      return (
        <span style={{ color: colors.textTertiary, fontSize: "0.8rem" }}>
          N/A
        </span>
      );
    const ok = status === "WITHIN";
    return (
      <span
        style={{
          padding: "0.4rem 0.9rem",
          background: ok
            ? "linear-gradient(135deg,#10b981,#059669)"
            : "linear-gradient(135deg,#ef4444,#dc2626)",
          color: "#fff",
          borderRadius: 8,
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          boxShadow: ok
            ? "0 2px 8px rgba(16,185,129,.3)"
            : "0 2px 8px rgba(239,68,68,.3)",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <span>{ok ? "✓" : "⚠"}</span>
        {ok ? `Within (${days}d)` : `Beyond (${days}d)`}
      </span>
    );
  };

  /* ── Deadline renderer ── */
  const renderDeadline = (row) => {
    const dl = row.deadlineDate;
    if (!dl)
      return (
        <span
          style={{
            color: colors.textTertiary,
            fontSize: "0.78rem",
            fontStyle: "italic",
          }}
        >
          —
        </span>
      );
    const urgency = getDeadlineUrgency(dl);
    const cfg = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.ok;
    const wdays = countWorkingDays(todayStr(), dl);
    const dateLabel = new Date(dl + "T00:00:00").toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <span
          style={{ fontSize: "0.78rem", fontWeight: 600, color: cfg.color }}
        >
          {cfg.icon} {dateLabel}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.15rem 0.5rem",
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            borderRadius: 4,
            fontSize: "0.65rem",
            fontWeight: 700,
            color: cfg.color,
            width: "fit-content",
          }}
        >
          {urgency === "overdue"
            ? "🚨 OVERDUE"
            : urgency === "today"
              ? "🔴 DUE TODAY"
              : `${wdays} working day${wdays !== 1 ? "s" : ""} left`}
        </span>
      </div>
    );
  };

  /* ── Cell renderers ── */
  const pill = (bg, shadow, text) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.4rem 0.9rem",
        background: bg,
        color: "#fff",
        borderRadius: 8,
        fontSize: "0.75rem",
        fontWeight: 700,
        boxShadow: `0 2px 8px ${shadow}`,
      }}
    >
      {text || "N/A"}
    </span>
  );

  const renderDTN = (v) =>
    pill("linear-gradient(135deg,#8b5cf6,#7c3aed)", "rgba(139,92,246,.3)", v);
  const renderGenericName = (v) =>
    pill("linear-gradient(135deg,#06b6d4,#0891b2)", "rgba(6,182,212,.3)", v);
  const renderBrandName = (v) =>
    pill("linear-gradient(135deg,#f59e0b,#d97706)", "rgba(245,158,11,.3)", v);

  const renderTypeDoc = (typeDoc) => {
    const u = typeDoc?.toUpperCase();
    if (u?.includes("CPR"))
      return pill(
        "linear-gradient(135deg,#10b981,#059669)",
        "rgba(16,185,129,.3)",
        typeDoc,
      );
    if (u?.includes("LOD"))
      return pill(
        "linear-gradient(135deg,#ef4444,#dc2626)",
        "rgba(239,68,68,.3)",
        typeDoc,
      );
    if (u?.includes("CERT"))
      return pill(
        "linear-gradient(135deg,#3b82f6,#2563eb)",
        "rgba(59,130,246,.3)",
        typeDoc,
      );
    return (
      <span style={{ fontSize: "0.85rem", color: colors.tableText }}>
        {typeDoc || "N/A"}
      </span>
    );
  };

  const renderStatus = (status) => {
    const u = status?.toUpperCase();
    const map = {
      COMPLETED: {
        bg: "linear-gradient(135deg,#10b981,#059669)",
        sh: "rgba(16,185,129,.3)",
        icon: "✓",
        label: "Completed",
      },
      TO_DO: {
        bg: "linear-gradient(135deg,#f59e0b,#d97706)",
        sh: "rgba(245,158,11,.3)",
        icon: "⏳",
        label: "To Do",
      },
      APPROVED: {
        bg: "linear-gradient(135deg,#3b82f6,#2563eb)",
        sh: "rgba(59,130,246,.3)",
        icon: "✅",
        label: "Approved",
      },
      PENDING: {
        bg: "linear-gradient(135deg,#eab308,#ca8a04)",
        sh: "rgba(234,179,8,.3)",
        icon: "⏸",
        label: "Pending",
      },
      REJECTED: {
        bg: "linear-gradient(135deg,#ef4444,#dc2626)",
        sh: "rgba(239,68,68,.3)",
        icon: "✗",
        label: "Rejected",
      },
    };
    const c = map[u] || {
      bg: "linear-gradient(135deg,#6b7280,#4b5563)",
      sh: "rgba(107,114,128,.3)",
      icon: "•",
      label: status || "N/A",
    };
    return (
      <span
        style={{
          padding: "0.4rem 0.9rem",
          background: c.bg,
          color: "#fff",
          borderRadius: 8,
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          boxShadow: `0 2px 8px ${c.sh}`,
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <span>{c.icon}</span>
        {c.label}
      </span>
    );
  };

  /* ── Central cell renderer ── */
  const renderCell = (col, row) => {
    switch (col.key) {
      case "dtn":
        return renderDTN(row[col.key]);
      case "prodGenName":
        return renderGenericName(row[col.key]);
      case "prodBrName":
        return renderBrandName(row[col.key]);
      case "appStatus":
        return renderStatus(row[col.key]);
      case "statusTimeline":
        return renderTimeline(row);
      case "typeDocReleased":
        return renderTypeDoc(row[col.key]);
      case "dbTimelineCitizenCharter":
        return row.dbTimelineCitizenCharter || "N/A";
      case "deadlineDate":
        return renderDeadline(row);
      default:
        return row[col.key];
    }
  };

  /* ── Action menu helpers ── */
  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };
  const openDetails = (r) => {
    setOpenMenuId(null);
    setSelectedRowDetails(r);
  };
  const openDoctrack = (r) => {
    setOpenMenuId(null);
    setDoctrackModalRecord(r);
  };
  const openAppLogs = (r) => {
    setOpenMenuId(null);
    setAppLogsRecord(r);
  };
  const openChangeLog = (r) => {
    setOpenMenuId(null);
    setChangeLogRecord(r);
  };

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

  /* ── Render ── */
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
          height: "90%",
          minHeight: 0,
        }}
      >
        {/* Table header bar */}
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
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <h3
              style={{
                fontSize: "1rem",
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
                fontSize: "0.8rem",
                color: colors.textTertiary,
                fontWeight: 600,
              }}
            >
              {totalRecords} total records
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {/* Deadline legend — Compliance tab only */}
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
                  fontSize: "0.73rem",
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

        {/* Scrollable table */}
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
                {/* Checkbox */}
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

                {/* # */}
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    fontSize: "0.8rem",
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

                {/* Column headers */}
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      // ✅ Amber color for Compliance Deadline header
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
                      background: col.complianceOnly
                        ? darkMode
                          ? "rgba(245,158,11,0.08)"
                          : "rgba(245,158,11,0.05)"
                        : colors.tableBg,
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
                      (e.currentTarget.style.background = col.complianceOnly
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

                {/* Actions */}
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    fontSize: "0.8rem",
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
                const dl = isComplianceTab ? row.deadlineDate : null;
                const urgency = dl ? getDeadlineUrgency(dl) : null;
                const bg = sel
                  ? "#4CAF5015"
                  : idx % 2 === 0
                    ? colors.tableRowEven
                    : colors.tableRowOdd;
                const rowBorderLeft = sel
                  ? "3px solid #4CAF50"
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
                      background: bg,
                      transition: "background .2s",
                      borderLeft: rowBorderLeft,
                    }}
                    onMouseEnter={(e) => {
                      if (!sel)
                        e.currentTarget.style.background = colors.tableRowHover;
                    }}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = bg)
                    }
                  >
                    {/* Checkbox */}
                    <td
                      style={{
                        padding: "1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        borderRight: `1px solid ${colors.tableBorder}`,
                        position: "sticky",
                        left: 0,
                        background: bg,
                        zIndex: 9,
                        width: "50px",
                        minWidth: "50px",
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

                    {/* Row number */}
                    <td
                      style={{
                        padding: "1rem",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: colors.textTertiary,
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        borderRight: `1px solid ${colors.tableBorder}`,
                        textAlign: "center",
                        position: "sticky",
                        left: "50px",
                        background: bg,
                        zIndex: 9,
                        width: "60px",
                        minWidth: "60px",
                      }}
                    >
                      {(indexOfFirstRow || 0) + idx + 1}
                    </td>

                    {/* Data cells */}
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: "1rem",
                          fontSize: "0.85rem",
                          color: colors.tableText,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          whiteSpace:
                            col.key === "deadlineDate" ? "normal" : "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          width: col.width,
                          minWidth: col.width,
                          background: col.complianceOnly
                            ? darkMode
                              ? "rgba(245,158,11,0.04)"
                              : "rgba(245,158,11,0.02)"
                            : undefined,
                        }}
                      >
                        {renderCell(col, row)}
                      </td>
                    ))}

                    {/* Actions */}
                    <td
                      style={{
                        padding: "1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        textAlign: "center",
                        position: "sticky",
                        right: 0,
                        background: bg,
                        zIndex: openMenuId === row.id ? 9999 : 9,
                        boxShadow: "-4px 0 8px rgba(0,0,0,.15)",
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
                          }}
                        >
                          ⋮
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
                              {menuBtn(
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
                              {menuBtn(
                                () => openChangeLog(row),
                                {
                                  borderBottom: `1px solid ${colors.tableBorder}`,
                                },
                                [
                                  <span key="i">📋</span>,
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

        {/* Pagination */}
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
    </>
  );
}

export default DataTable;
