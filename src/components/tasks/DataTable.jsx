import { useState } from "react";
import { tableColumns, COLUMN_DB_KEY_MAP } from "./tableColumns";
import TablePagination from "./TablePagination";
import EvaluatorModal from "./EvaluatorModal";
import ViewDetailsModal from "./ViewDetailsModal";
import DoctrackModal from "../../components/reports/actions/DoctrackModal";
import ApplicationLogsModal from "./ApplicationLogsModal";

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
  const [evaluatorModalRecord, setEvaluatorModalRecord] = useState(null);
  const [doctrackModalRecord, setDoctrackModalRecord] = useState(null);
  const [appLogsRecord, setAppLogsRecord] = useState(null); // ← new

  /* ── Sort helpers ── */
  const getDbKey = (k) => COLUMN_DB_KEY_MAP[k] || k;
  const handleSort = (k) => {
    if (!onSort || k === "statusTimeline") return;
    const db = getDbKey(k);
    onSort(db, sortBy === db && sortOrder === "asc" ? "desc" : "asc");
  };

  const SortIcon = ({ colKey }) => {
    if (colKey === "statusTimeline") return null;
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

  /* ── Action menu helpers ── */
  const canBeEvaluated = (r) =>
    r.evaluator &&
    r.evaluator !== "" &&
    r.evaluator !== "N/A" &&
    (!r.dateEvalEnd ||
      r.dateEvalEnd === "" ||
      r.dateEvalEnd === "N/A" ||
      r.dateEvalEnd === null);

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };
  const openDetails = (r) => {
    setOpenMenuId(null);
    setSelectedRowDetails(r);
  };
  const openEval = (r) => {
    setOpenMenuId(null);
    setEvaluatorModalRecord(r);
  };
  const openDoctrack = (r) => {
    setOpenMenuId(null);
    setDoctrackModalRecord(r);
  };
  const openAppLogs = (r) => {
    // ← new
    setOpenMenuId(null);
    setAppLogsRecord(r);
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
                {tableColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: `1px solid ${colors.tableBorder}`,
                      width: col.width,
                      minWidth: col.width,
                      whiteSpace: "nowrap",
                      background: colors.tableBg,
                      cursor:
                        col.key !== "statusTimeline" ? "pointer" : "default",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (col.key !== "statusTimeline")
                        e.currentTarget.style.background = darkMode
                          ? "#1e1e1e"
                          : "#ebebeb";
                    }}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = colors.tableBg)
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
                    colSpan={tableColumns.length + 3}
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
                const bg = sel
                  ? "#4CAF5015"
                  : idx % 2 === 0
                    ? colors.tableRowEven
                    : colors.tableRowOdd;

                return (
                  <tr
                    key={row.id}
                    style={{
                      background: bg,
                      transition: "background .2s",
                      borderLeft: sel
                        ? "3px solid #4CAF50"
                        : "3px solid transparent",
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

                    {/* Data columns */}
                    {tableColumns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: "1rem",
                          fontSize: "0.85rem",
                          color: colors.tableText,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          width: col.width,
                          minWidth: col.width,
                        }}
                      >
                        {col.key === "dtn"
                          ? renderDTN(row[col.key])
                          : col.key === "prodGenName"
                            ? renderGenericName(row[col.key])
                            : col.key === "prodBrName"
                              ? renderBrandName(row[col.key])
                              : col.key === "appStatus"
                                ? renderStatus(row[col.key])
                                : col.key === "statusTimeline"
                                  ? renderTimeline(row)
                                  : col.key === "dbTimelineCitizenCharter"
                                    ? row.dbTimelineCitizenCharter || "N/A"
                                    : col.key === "typeDocReleased"
                                      ? renderTypeDoc(row[col.key])
                                      : row[col.key]}
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
                              {/* ── Complete Evaluation ── */}
                              {canBeEvaluated(row) &&
                                menuBtn(
                                  () => openEval(row),
                                  {
                                    borderBottom: `1px solid ${colors.tableBorder}`,
                                  },
                                  [
                                    <span key="i">✅</span>,
                                    <span key="t">Complete Evaluation</span>,
                                  ],
                                )}

                              {/* ── Application Logs ── NEW ── */}
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

                              {/* ── View Doctrack Details ── */}
                              {menuBtn(
                                () => openDoctrack(row),
                                {
                                  borderBottom: `1px solid ${colors.tableBorder}`,
                                },
                                [
                                  <span key="i">📋</span>,
                                  <span key="t">View Doctrack Details</span>,
                                ],
                              )}

                              {/* ── View Details ── */}
                              {menuBtn(() => openDetails(row), {}, [
                                <span key="i">👁️</span>,
                                <span key="t">View Details</span>,
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
      {evaluatorModalRecord && (
        <EvaluatorModal
          record={evaluatorModalRecord}
          onClose={() => setEvaluatorModalRecord(null)}
          onSuccess={async () => {
            if (onRefresh) await onRefresh();
          }}
          colors={colors}
        />
      )}
      {doctrackModalRecord && (
        <DoctrackModal
          record={doctrackModalRecord}
          onClose={() => setDoctrackModalRecord(null)}
          colors={colors}
        />
      )}
      {selectedRowDetails && (
        <ViewDetailsModal
          record={selectedRowDetails}
          onClose={() => setSelectedRowDetails(null)}
          colors={colors}
          darkMode={darkMode}
        />
      )}
      {/* ── Application Logs Modal ── NEW ── */}
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
