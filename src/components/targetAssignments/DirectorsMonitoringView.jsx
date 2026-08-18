import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  getDirectorsTargetsOverview,
  getDirectorsTargetsList,
} from "../../api/targetAssignments";

const PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const COMPLETION_STYLES = {
  completed: { bg: "#dcfce7", text: "#16a34a", label: "✅ Completed" },
  overdue: { bg: "#fee2e2", text: "#dc2626", label: "⏰ Overdue" },
  on_track: { bg: "#dbeafe", text: "#3b82f6", label: "🕒 On Track" },
};

function useDebouncedValue(value, delayMs = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

// ── Small KPI card — used for the four top-line totals ──
function SummaryCard({ label, value, colors, accent }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 140,
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 12,
        padding: "0.9rem 1.1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.3rem",
      }}
    >
      <span
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          color: colors.textTertiary,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "1.7rem",
          fontWeight: 800,
          color: accent,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Stacked bar per unit — shows completed/overdue/on_track proportion.
//    Clicking it filters the detailed table below to that unit only. ──
function UnitBreakdownBar({ unit, maxTotal, colors, isActive, onClick }) {
  const pct = (n) => (maxTotal === 0 ? 0 : (n / maxTotal) * 100);
  return (
    <div
      onClick={onClick}
      title="Click to filter the table below by this unit"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        cursor: "pointer",
        padding: "4px 6px",
        borderRadius: 6,
        background: isActive ? "rgba(59, 130, 246, 0.12)" : "transparent",
      }}
    >
      <span
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          color: colors.textSecondary,
          minWidth: 150,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {unit.unit_name}
      </span>
      <div
        style={{
          flex: 1,
          height: 10,
          borderRadius: 5,
          background: colors.rowHover,
          overflow: "hidden",
          display: "flex",
        }}
      >
        <div
          style={{ width: `${pct(unit.completed)}%`, background: "#16a34a" }}
          title={`${unit.completed} completed`}
        />
        <div
          style={{ width: `${pct(unit.overdue)}%`, background: "#dc2626" }}
          title={`${unit.overdue} overdue`}
        />
        <div
          style={{ width: `${pct(unit.on_track)}%`, background: "#3b82f6" }}
          title={`${unit.on_track} on track`}
        />
      </div>
      <span
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          color: colors.textPrimary,
          minWidth: 26,
          textAlign: "right",
        }}
      >
        {unit.total}
      </span>
    </div>
  );
}

function StatusFilterSelect({ value, onChange, colors }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "5px 10px",
        borderRadius: 6,
        border: `1px solid ${colors.cardBorder}`,
        background: colors.cardBg,
        color: colors.textPrimary,
        fontSize: "0.76rem",
        cursor: "pointer",
      }}
    >
      <option value="">All statuses</option>
      <option value="completed">✅ Completed</option>
      <option value="overdue">⏰ Overdue</option>
      <option value="on_track">🕒 On Track</option>
    </select>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPrev,
  onNext,
  onPageSizeChange,
  colors,
}) {
  if (total === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.6rem 1rem",
        borderTop: `1px solid ${colors.cardBorder}`,
        flexWrap: "wrap",
        gap: "0.5rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <span style={{ fontSize: "0.72rem", color: colors.textSecondary }}>
          Page {page} of {Math.max(totalPages, 1)} · {total} total
        </span>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            fontSize: "0.72rem",
            color: colors.textTertiary,
          }}
        >
          Show
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: "0.72rem",
            }}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: "0.35rem" }}>
          <button
            onClick={onPrev}
            disabled={page === 1}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: "0.72rem",
              cursor: page === 1 ? "default" : "pointer",
              opacity: page === 1 ? 0.4 : 1,
            }}
          >
            ‹ Prev
          </button>
          <button
            onClick={onNext}
            disabled={page === totalPages}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: "0.72rem",
              cursor: page === totalPages ? "default" : "pointer",
              opacity: page === totalPages ? 0.4 : 1,
            }}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}

export function DirectorsMonitoringView({ colors }) {
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  const [activeUnitFilter, setActiveUnitFilter] = useState(""); // unit_name
  const [statusFilter, setStatusFilter] = useState("");
  const [dtnFilter, setDtnFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const debouncedDtn = useDebouncedValue(dtnFilter, 350);
  const debouncedMember = useDebouncedValue(memberFilter, 350);

  const [sortKey, setSortKey] = useState("target_end_date");
  const [sortDir, setSortDir] = useState("asc");

  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await getDirectorsTargetsOverview();
      setSummary(data);
    } catch (err) {
      setSummaryError(err.message);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadRows = useCallback(async () => {
    setRowsLoading(true);
    setRowsError(null);
    try {
      const res = await getDirectorsTargetsList({
        page,
        pageSize,
        dtn: debouncedDtn,
        memberName: debouncedMember,
        completionStatus: statusFilter,
        sortBy: sortKey,
        sortDir,
      });
      setRows(res.data);
      setTotalPages(res.total_pages);
      setTotal(res.total);
    } catch (err) {
      setRowsError(err.message);
    } finally {
      setRowsLoading(false);
    }
  }, [
    page,
    pageSize,
    debouncedDtn,
    debouncedMember,
    statusFilter,
    sortKey,
    sortDir,
  ]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [debouncedDtn, debouncedMember, statusFilter]);

  const maxUnitTotal = useMemo(
    () =>
      (summary?.by_unit || []).reduce((max, u) => Math.max(max, u.total), 0),
    [summary],
  );

  const changeSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // ── Clicking a unit's breakdown bar filters the CURRENT page of
  //    results client-side (a lightweight highlight, not a server
  //    round-trip) — clicking again toggles it off. ──
  const clickUnit = (unitName) => {
    setActiveUnitFilter((prev) => (prev === unitName ? "" : unitName));
  };

  const displayedRows = activeUnitFilter
    ? rows.filter((r) => r.unit_name === activeUnitFilter)
    : rows;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        overflow: "auto",
      }}
    >
      {summaryError && (
        <div
          style={{
            padding: "0.75rem 1rem",
            color: "#dc2626",
            fontSize: "0.8rem",
          }}
        >
          ⚠️ {summaryError}
        </div>
      )}

      {summaryLoading ? (
        <div
          style={{
            padding: "1rem",
            color: colors.textTertiary,
            fontSize: "0.85rem",
          }}
        >
          Loading overview…
        </div>
      ) : (
        summary && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              <SummaryCard
                label="Total Active Targets"
                value={summary.total}
                colors={colors}
                accent={colors.textPrimary}
              />
              <SummaryCard
                label="Completed"
                value={summary.completed}
                colors={colors}
                accent="#16a34a"
              />
              <SummaryCard
                label="Overdue"
                value={summary.overdue}
                colors={colors}
                accent="#dc2626"
              />
              <SummaryCard
                label="On Track"
                value={summary.on_track}
                colors={colors}
                accent="#3b82f6"
              />
            </div>

            <div
              style={{
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                background: colors.cardBg,
                padding: "0.9rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: colors.textPrimary,
                  marginBottom: "0.65rem",
                }}
              >
                📊 Targets by unit — click a bar to filter the table below
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                }}
              >
                {(summary.by_unit || []).map((u) => (
                  <UnitBreakdownBar
                    key={u.unit_name}
                    unit={u}
                    maxTotal={maxUnitTotal}
                    colors={colors}
                    isActive={activeUnitFilter === u.unit_name}
                    onClick={() => clickUnit(u.unit_name)}
                  />
                ))}
                {(summary.by_unit || []).length === 0 && (
                  <div
                    style={{ fontSize: "0.76rem", color: colors.textTertiary }}
                  >
                    No active targets yet.
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  marginTop: "0.7rem",
                  fontSize: "0.68rem",
                  color: colors.textTertiary,
                }}
              >
                <span>
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: "#16a34a",
                      marginRight: 4,
                    }}
                  />
                  Completed
                </span>
                <span>
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: "#dc2626",
                      marginRight: 4,
                    }}
                  />
                  Overdue
                </span>
                <span>
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: "#3b82f6",
                      marginRight: 4,
                    }}
                  />
                  On Track
                </span>
              </div>
            </div>
          </>
        )
      )}

      <div
        style={{
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 10,
          background: colors.pageBg,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.7rem 1rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            flexWrap: "wrap",
            gap: "0.6rem",
          }}
        >
          <span
            style={{
              fontSize: "0.82rem",
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            All Director's Targets
            {activeUnitFilter ? ` — ${activeUnitFilter}` : ""} (
            {displayedRows.length} of {total})
          </span>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Filter by DTN…"
              value={dtnFilter}
              onChange={(e) => setDtnFilter(e.target.value)}
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                border: `1px solid ${colors.cardBorder}`,
                background: colors.cardBg,
                color: colors.textPrimary,
                fontSize: "0.76rem",
                width: 140,
              }}
            />
            <input
              type="text"
              placeholder="Filter by member…"
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                border: `1px solid ${colors.cardBorder}`,
                background: colors.cardBg,
                color: colors.textPrimary,
                fontSize: "0.76rem",
                width: 160,
              }}
            />
            <StatusFilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              colors={colors}
            />
            {activeUnitFilter && (
              <button
                onClick={() => setActiveUnitFilter("")}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: `1px solid ${colors.cardBorder}`,
                  background: "transparent",
                  color: colors.textSecondary,
                  fontSize: "0.74rem",
                  cursor: "pointer",
                }}
              >
                ✕ Clear unit filter
              </button>
            )}
          </div>
        </div>

        {rowsError && (
          <div
            style={{
              padding: "0.75rem 1rem",
              color: "#dc2626",
              fontSize: "0.8rem",
            }}
          >
            ⚠️ {rowsError}
          </div>
        )}

        {rowsLoading ? (
          <div
            style={{
              padding: "1.5rem",
              textAlign: "center",
              color: colors.textTertiary,
              fontSize: "0.82rem",
            }}
          >
            Loading targets…
          </div>
        ) : (
          <div style={{ maxHeight: 460, overflow: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.8rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: colors.rowHover,
                    textAlign: "left",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  {[
                    { key: "dtn", label: "DTN" },
                    { key: "unit_name", label: "Unit" },
                    { key: "member_name", label: "Member" },
                    { key: "current_step", label: "Current Step" },
                    { key: "target_end_date", label: "Target End" },
                    { key: "days_remaining", label: "Days Left" },
                    { key: "completion_status", label: "Status" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => changeSort(col.key)}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        userSelect: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <span
                          style={{
                            marginLeft: 4,
                            fontSize: "0.65rem",
                            color: colors.selectedBorder,
                          }}
                        >
                          {sortDir === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((r) => {
                  const style =
                    COMPLETION_STYLES[r.completion_status] ||
                    COMPLETION_STYLES.on_track;
                  return (
                    <tr
                      key={r.target_id}
                      style={{ borderTop: `1px solid ${colors.cardBorder}` }}
                    >
                      <td
                        style={{
                          padding: "8px 12px",
                          fontWeight: 600,
                          color: colors.selectedBorder,
                        }}
                      >
                        {r.dtn}
                        <div
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 400,
                            color: colors.textSecondary,
                          }}
                        >
                          {r.brand_name}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          color: colors.textSecondary,
                        }}
                      >
                        {r.unit_name}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          color: colors.textSecondary,
                        }}
                      >
                        {r.member_name}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          color: colors.textSecondary,
                        }}
                      >
                        {r.current_step || "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          color: colors.textSecondary,
                        }}
                      >
                        {r.target_end_date || "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          color:
                            r.days_remaining != null && r.days_remaining < 0
                              ? "#dc2626"
                              : colors.textSecondary,
                          fontWeight:
                            r.days_remaining != null && r.days_remaining < 0
                              ? 700
                              : 400,
                        }}
                      >
                        {r.days_remaining == null
                          ? "—"
                          : r.days_remaining < 0
                            ? `${Math.abs(r.days_remaining)}d overdue`
                            : `${r.days_remaining}d left`}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: style.bg,
                            color: style.text,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {style.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {displayedRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding: "1.25rem",
                        textAlign: "center",
                        color: colors.textTertiary,
                        fontSize: "0.8rem",
                      }}
                    >
                      No targets match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          colors={colors}
        />
      </div>
    </div>
  );
}

export default DirectorsMonitoringView;
