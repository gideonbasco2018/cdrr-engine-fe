// src/components/monitoring/teamOverview/InProgressByYearView.jsx
//
// Monitoring tab: in-progress tasks per Unit → Member, split by the
// YEAR the application was received by the center.
// READ-ONLY. Counts are clickable (drill-down popup) and the table can
// be exported to PDF (client-side, jsPDF + autotable).
// In the popup: DTN opens Doctrack; Actions open View Details /
// Application Logs (same modals as Team Overview / Records).

import { useState, useEffect, useMemo, useRef } from "react";
import {
  getInProgressYearMatrix,
  getAllTeamsMemberInProgressTasks,
  getUnitInProgressTasks,
  getInProgressStepSummary,
  getAllUnitsInProgressTasks,
} from "../../../api/targetAssignments";
import { getUploadReports } from "../../../api/reports.js";
import { mapDataItem } from "../../reports/utils.js";
// Reused modals (same ones the Records / Analytics / Team Overview use)
import DoctrackModal from "../../reports/actions/DoctrackModal.jsx";
import ViewDetailsModal from "../../reports/actions/ViewDetailsModal.jsx";
import ApplicationLogsModal from "../../tasks/ApplicationLogsModal.jsx";

// space left under the component (px)
const BOTTOM_GAP = 24;

function usePalette(darkMode) {
  return darkMode
    ? {
        pageBg: "#0a0a0a",
        cardBg: "#161616",
        cardBorder: "#2a2a2a",
        textPrimary: "#f5f5f5",
        textSecondary: "#a3a3a3",
        textTertiary: "#737373",
        headBg: "#facc15",
        headText: "#111111",
        unitTotalBg: "rgba(59,130,246,0.12)",
        rowHover: "#1f1f1f",
        inputBg: "#222222",
        accent: "#3b82f6",
        selectedBorder: "#3b82f6",
      }
    : {
        pageBg: "#f8f8f8",
        cardBg: "#ffffff",
        cardBorder: "#d1d5db",
        textPrimary: "#111827",
        textSecondary: "#374151",
        textTertiary: "#9ca3af",
        // plain gray header in light mode (no yellow)
        headBg: "#e5e7eb",
        headText: "#111827",
        unitTotalBg: "#f3f4f6",
        rowHover: "#f9fafb",
        inputBg: "#f7f8fa",
        accent: "#2563eb",
        selectedBorder: "#3b82f6",
      };
}

function useDebouncedValue(value, delayMs = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

// Dropdown with a checkbox per option (multi-select). Empty selection = "all".
function MultiSelect({
  allLabel,
  noun,
  options, // [{ value, label }]
  selected, // string[]
  onChange,
  colors,
  buttonStyle,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggle = (value) =>
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );

  const label =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} ${noun}`;
  const active = selected.length > 0;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          ...buttonStyle,
          display: "flex",
          alignItems: "center",
          gap: 6,
          maxWidth: 220,
          background: colors.cardBg,
          color: active ? colors.accent : colors.textPrimary,
          borderColor: active ? colors.accent : colors.cardBorder,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: "0.6rem" }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            minWidth: 240,
            maxWidth: 340,
            maxHeight: 320,
            overflowY: "auto",
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 8,
            boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
            padding: "0.35rem",
            zIndex: 30,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "2px 6px 6px",
              fontSize: "0.68rem",
              color: colors.textTertiary,
            }}
          >
            <span>{selected.length} selected</span>
            {active && (
              <button
                type="button"
                onClick={() => onChange([])}
                style={{
                  background: "transparent",
                  border: "none",
                  color: colors.accent,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            )}
          </div>
          {options.length === 0 && (
            <div
              style={{
                padding: "6px",
                fontSize: "0.74rem",
                color: colors.textTertiary,
              }}
            >
              No options
            </div>
          )}
          {options.map((o) => (
            <label
              key={o.value}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "5px 6px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "0.76rem",
                color: colors.textPrimary,
                background: selected.includes(o.value)
                  ? "rgba(59,130,246,0.12)"
                  : "transparent",
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
                style={{ marginTop: 2, accentColor: colors.accent }}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
// Every unit: supervisors and statisticians are NOT given a member row;
// their names are listed under the unit name and their own counts go
// below the "Total" row. The Safety & Efficacy unit is stricter: only
// plain "S&E" members get a row.
const isSEUnit = (unit) => /safety\s*&\s*efficacy/i.test(unit.unit_name || "");
const roleOf = (m) => (m.lead_role || "").trim().toLowerCase();
const isSupervisor = (m) => roleOf(m).includes("supervisor");

const isStatistician = (m) => roleOf(m).includes("statistician");
const isSideRole = (m) => isSupervisor(m) || isStatistician(m);

function splitUnitMembers(unit) {
  const supervisors = unit.members.filter(isSupervisor);
  const statisticians = unit.members.filter(isStatistician);
  const rows = isSEUnit(unit)
    ? unit.members.filter((m) => roleOf(m) === "s&e")
    : unit.members.filter((m) => !isSideRole(m));
  // safety net: if nobody is left for the rows, show everyone so the
  // unit never renders empty
  if (rows.length === 0)
    return { rows: unit.members, supervisors: [], statisticians: [] };
  return { rows, supervisors, statisticians };
}
// ══════════════════════════════════════════════════════════════════
// Drill-down popup — read-only list of the in-progress tasks behind a
// clicked number. Server-side search + pagination.
//   drill = { scope: "member" | "unit", unitId, unitName,
//             memberId, memberName, year (string | null) }
// ══════════════════════════════════════════════════════════════════
function DrilldownModal({
  drill,
  colors,
  onClose,
  onDoctrack,
  onDetails,
  onLogs,
  suspendKeys,
}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [stepFilter, setStepFilter] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Step summary (side panel) — depends only on the clicked scope/year
  const [steps, setSteps] = useState([]);
  const [stepsLoading, setStepsLoading] = useState(true);
  const [stepsError, setStepsError] = useState(null);

  const isAll = drill.scope === "all"; // Grand total (several units)
  const isUnit = drill.scope === "unit" || isAll;
  const [exporting, setExporting] = useState(false);

  const fetchTasks = (params) =>
    isAll
      ? getAllUnitsInProgressTasks({ unitIds: drill.unitIds, ...params })
      : isUnit
        ? getUnitInProgressTasks(drill.unitId, params)
        : getAllTeamsMemberInProgressTasks(drill.memberId, params);

  // Escape closes this popup, unless a child modal is open on top of it
  useEffect(() => {
    if (suspendKeys) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, suspendKeys]);

  // ── Step summary ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStepsLoading(true);
      setStepsError(null);
      try {
        const data = await getInProgressStepSummary({
          unitId: isUnit ? drill.unitId : undefined,
          memberUserId: isUnit ? undefined : drill.memberId,
          year: drill.year || undefined,
          appType: drill.appType || undefined,
          entryType: drill.entryType || undefined,
          memberIds: drill.memberIds || undefined,
          unitIds: drill.unitIds || undefined,
          step: drill.step || undefined,
        });
        if (!cancelled) setSteps(data || []);
      } catch (err) {
        if (!cancelled) setStepsError(err.message);
      } finally {
        if (!cancelled) setStepsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [drill, isUnit]);

  // ── Task list ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {
          page,
          pageSize,
          dtn: debouncedSearch,
          step: stepFilter || drill.step || undefined,
          appType: drill.appType || undefined,
          entryType: drill.entryType || undefined,
          memberIds: drill.memberIds || undefined,
          dateFrom: drill.year ? `${drill.year}-01-01` : undefined,
          dateTo: drill.year ? `${drill.year}-12-31` : undefined,
          sortBy: "date_received_center",
          sortDir: "asc",
        };
        const res = await fetchTasks(params);
        if (cancelled) return;
        setRows(res.data);
        setTotal(res.total);
        setTotalPages(res.total_pages);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [drill, isUnit, page, pageSize, debouncedSearch, stepFilter]);

  const unitTitle = isAll ? "All units" : drill.unitName;
  const title = isUnit
    ? drill.label
      ? `${unitTitle} (${drill.label})`
      : unitTitle
    : drill.memberName;

  // Exports every row matching the popup's current filters (search + step),
  // not just the page on screen. DTN is written as text so Excel doesn't
  // turn the long number into scientific notation.
  const exportExcel = async () => {
    setExporting(true);
    setError(null);
    try {
      const XLSX = await import("xlsx");
      const baseParams = {
        pageSize: 500,
        dtn: debouncedSearch,
        step: stepFilter || drill.step || undefined,
        appType: drill.appType || undefined,
        entryType: drill.entryType || undefined,
        memberIds: drill.memberIds || undefined,
        dateFrom: drill.year ? `${drill.year}-01-01` : undefined,
        dateTo: drill.year ? `${drill.year}-12-31` : undefined,
        sortBy: "date_received_center",
        sortDir: "asc",
      };
      const all = [];
      let pg = 1;
      let pages = 1;
      do {
        const res = await fetchTasks({ ...baseParams, page: pg });
        all.push(...res.data);
        pages = res.total_pages || 1;
        pg += 1;
      } while (pg <= pages);

      if (all.length === 0) {
        setError("Nothing to export.");
        return;
      }

      const taskRows = all.map((t) => ({
        ...(isUnit ? { Member: t.member_name || "" } : {}),
        DTN: String(t.dtn ?? ""),
        "Brand Name": t.brand_name || "",
        "Date Received Central": t.date_received_center || "",
        "Product Class": t.prod_class_prescrip || "",
        "App Type": t.app_type || "",
        "Entry Type": t.entry_type || "",
        "Processing Type": t.processing_type || "",
        Step: t.step || "",
        Status: t.status || "",
      }));
      const wsTasks = XLSX.utils.json_to_sheet(taskRows);
      wsTasks["!cols"] = Object.keys(taskRows[0]).map((k) => ({
        wch: Math.min(
          40,
          Math.max(
            k.length + 2,
            ...taskRows.slice(0, 200).map((r) => String(r[k] ?? "").length + 2),
          ),
        ),
      }));

      const stepRows = [
        ...steps.map((s) => ({ Step: s.label, Count: s.count })),
        { Step: "Total", Count: stepsTotal },
      ];
      const wsSteps = XLSX.utils.json_to_sheet(stepRows);
      wsSteps["!cols"] = [{ wch: 32 }, { wch: 10 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsTasks, "Tasks");
      XLSX.utils.book_append_sheet(wb, wsSteps, "By step");

      const slug = (s) => String(s).replace(/[^\w]+/g, "_");
      XLSX.writeFile(
        wb,
        `in_progress_${slug(title)}_${drill.year || "all_years"}_${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`,
      );
    } catch (err) {
      console.error("Excel export failed:", err);
      setError("Failed to export Excel.");
    } finally {
      setExporting(false);
    }
  };
  const subtitle = [
    isAll
      ? `${drill.unitCount} unit${drill.unitCount === 1 ? "" : "s"}`
      : isUnit
        ? "Unit"
        : drill.unitName,
    drill.year ? `Received ${drill.year}` : "All years",
    drill.appType ? `App type: ${drill.appType.split("|").join(", ")}` : null,
    drill.entryType
      ? `Entry type: ${drill.entryType.split("|").join(", ")}`
      : null,
    drill.step && !stepFilter
      ? `Steps: ${drill.step.split("|").join(", ")}`
      : null,
    stepFilter ? `Step: ${stepFilter}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const stepsTotal = steps.reduce((s, x) => s + x.count, 0);
  const stepsMax = steps[0]?.count || 0;

  const cell = { padding: "8px 12px", color: colors.textSecondary };
  const actionBtn = {
    padding: "3px 10px",
    borderRadius: 6,
    border: `1px solid ${colors.cardBorder}`,
    background: "transparent",
    color: colors.selectedBorder,
    fontSize: "0.68rem",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
  const pagerBtn = (disabled) => ({
    padding: "4px 10px",
    borderRadius: 6,
    border: `1px solid ${colors.cardBorder}`,
    background: "transparent",
    color: colors.textSecondary,
    fontSize: "0.72rem",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.4 : 1,
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // kept below the reused modals so they open on top of this popup
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 12,
          width: 1400,
          maxWidth: "96vw",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
            padding: "0.8rem 1rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              {title} — in-progress tasks ({total})
            </div>
            <div style={{ fontSize: "0.72rem", color: colors.textTertiary }}>
              {subtitle}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search DTN / brand…"
              style={{
                padding: "5px 10px",
                fontSize: "0.76rem",
                borderRadius: 6,
                border: `1px solid ${colors.cardBorder}`,
                background: colors.inputBg,
                color: colors.textPrimary,
                width: 190,
              }}
            />
            <button
              type="button"
              onClick={exportExcel}
              disabled={exporting || total === 0}
              title="Export all rows matching the current filters"
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: `1px solid ${colors.accent}`,
                background: colors.accent,
                color: "#fff",
                fontSize: "0.74rem",
                fontWeight: 700,
                cursor: exporting || total === 0 ? "default" : "pointer",
                opacity: exporting || total === 0 ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {exporting ? "Exporting…" : `⬇ Export Excel (${total})`}
            </button>

            <button
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: `1px solid ${colors.cardBorder}`,
                background: "transparent",
                color: colors.textTertiary,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              color: "#dc2626",
              fontSize: "0.8rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Body: task table (left) + step summary (right) */}
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
            {loading && rows.length === 0 ? (
              <div
                style={{
                  padding: "1.5rem",
                  textAlign: "center",
                  color: colors.textTertiary,
                  fontSize: "0.82rem",
                }}
              >
                Loading tasks…
              </div>
            ) : (
              <div
                style={{
                  opacity: loading ? 0.5 : 1,
                  transition: "opacity 0.15s",
                }}
              >
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
                        ...(isUnit ? ["Member"] : []),
                        "DTN",
                        "Date Received Central",
                        "Product Class",
                        "App Type",
                        "Processing Type",
                        "Step",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px 12px",
                            whiteSpace: "nowrap",
                            color: colors.textPrimary,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t, i) => (
                      <tr
                        key={`${t.log_id}-${i}`}
                        style={{ borderTop: `1px solid ${colors.cardBorder}` }}
                      >
                        {isUnit && <td style={cell}>{t.member_name}</td>}
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                          <button
                            type="button"
                            onClick={() => onDoctrack && onDoctrack(t)}
                            title="Open Doctrack"
                            style={{
                              background: "transparent",
                              border: "none",
                              padding: 0,
                              font: "inherit",
                              fontWeight: 600,
                              color: colors.selectedBorder,
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                          >
                            {t.dtn}
                          </button>
                          <div
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 400,
                              color: colors.textSecondary,
                            }}
                          >
                            {t.brand_name}
                          </div>
                        </td>
                        <td style={cell}>{t.date_received_center || "—"}</td>
                        <td style={cell}>{t.prod_class_prescrip || "—"}</td>
                        <td style={cell}>{t.app_type || "—"}</td>
                        <td style={cell}>{t.processing_type || "—"}</td>
                        <td style={cell}>{t.step || "—"}</td>
                        <td style={cell}>{t.status || "—"}</td>
                        <td
                          style={{ padding: "8px 12px", whiteSpace: "nowrap" }}
                        >
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => onDetails && onDetails(t)}
                              title="View Details"
                              style={actionBtn}
                            >
                              👁 Details
                            </button>
                            <button
                              type="button"
                              onClick={() => onLogs && onLogs(t)}
                              title="View Application Logs"
                              style={actionBtn}
                            >
                              📋 Logs
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && !loading && (
                      <tr>
                        <td
                          colSpan={isUnit ? 9 : 8}
                          style={{
                            padding: "1.25rem",
                            textAlign: "center",
                            color: colors.textTertiary,
                          }}
                        >
                          No tasks found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Step summary panel */}
          <aside
            style={{
              width: 250,
              flexShrink: 0,
              overflowY: "auto",
              borderLeft: `1px solid ${colors.cardBorder}`,
              padding: "0.8rem 0.9rem",
              background: colors.pageBg,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "0.6rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  color: colors.textTertiary,
                }}
              >
                By step
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: colors.textPrimary,
                }}
              >
                {stepsTotal} total
              </span>
            </div>

            {stepsLoading && steps.length === 0 && (
              <div style={{ fontSize: "0.74rem", color: colors.textTertiary }}>
                Loading…
              </div>
            )}
            {stepsError && (
              <div style={{ fontSize: "0.74rem", color: "#dc2626" }}>
                ⚠️ {stepsError}
              </div>
            )}
            {!stepsLoading && !stepsError && steps.length === 0 && (
              <div style={{ fontSize: "0.74rem", color: colors.textTertiary }}>
                No in-progress tasks.
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
              }}
            >
              {steps.map((s) => {
                const active = stepFilter === s.label;
                const pct = stepsMax
                  ? Math.round((s.count / stepsMax) * 100)
                  : 0;
                return (
                  <div
                    key={s.label}
                    onClick={() => {
                      setStepFilter(active ? null : s.label);
                      setPage(1);
                    }}
                    title="Click to filter the table"
                    style={{
                      cursor: "pointer",
                      padding: "4px 6px",
                      borderRadius: 6,
                      border: `1px solid ${
                        active ? colors.selectedBorder : "transparent"
                      }`,
                      background: active
                        ? "rgba(59,130,246,0.12)"
                        : "transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                        fontSize: "0.74rem",
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          color: active
                            ? colors.selectedBorder
                            : colors.textSecondary,
                          fontWeight: active ? 700 : 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.label}
                      </span>
                      <span
                        style={{ fontWeight: 700, color: colors.textPrimary }}
                      >
                        {s.count}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        borderRadius: 3,
                        background: colors.rowHover,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: colors.selectedBorder,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.5rem",
              padding: "0.6rem 1rem",
              borderTop: `1px solid ${colors.cardBorder}`,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
            >
              <span
                style={{ fontSize: "0.72rem", color: colors.textSecondary }}
              >
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
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 6,
                    border: `1px solid ${colors.cardBorder}`,
                    background: colors.cardBg,
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={pagerBtn(page === 1)}
                >
                  ‹ Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={pagerBtn(page === totalPages)}
                >
                  Next ›
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Animated chart per unit ──────────────────────────────────────────
function useCountUp(target, ms = 800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function UnitChartCell({
  unit,
  years,
  mode, // "year" | "member" | "memberyear"
  colors,
  grandTotal,
  rowSpan,
  td,
  onDrill,
}) {
  const [go, setGo] = useState(false);
  const dataKey = JSON.stringify([unit.counts, unit.total, mode]);
  useEffect(() => {
    setGo(false);
    const id = setTimeout(() => setGo(true), 40);
    return () => clearTimeout(id);
  }, [dataKey]);

  const animatedTotal = useCountUp(unit.total);
  const share = grandTotal ? (unit.total / grandTotal) * 100 : 0;
  const PEAK = "#f59e0b";
  const RANK = [PEAK, "#94a3b8", "#b45309"]; // gold, silver, bronze
  const EASE = "cubic-bezier(.2,.8,.2,1)";

  const unitDrill = (year) =>
    onDrill({
      scope: "unit",
      unitId: unit.unit_id,
      unitName: unit.unit_name,
      memberIds: unit.scopeMemberIds || undefined,
      label: unit.scopeMemberIds ? "without supervisors" : undefined,
      year,
    });
  const memberDrill = (m, year = null) =>
    onDrill({
      scope: "member",
      unitId: unit.unit_id,
      unitName: unit.unit_name,
      memberId: m.member_user_id,
      memberName: m.member_name,
      year,
    });

  const yearVals = years.map((y) => ({ y, n: unit.counts[y] || 0 }));
  const yearMax = Math.max(1, ...yearVals.map((v) => v.n));

  // every member that has work in that year (no top-N limit)
  const perYear = years.map((y) => {
    const list = unit.members
      .filter((m) => (m.counts[y] || 0) > 0)
      .sort((a, b) => b.counts[y] - a.counts[y]);
    return {
      y,
      total: unit.counts[y] || 0,
      list,
      max: Math.max(1, ...list.map((m) => m.counts[y])),
    };
  });

  return (
    <td
      rowSpan={rowSpan}
      style={{
        ...td,
        position: "relative",
        padding: 0,
        width: "55%",
        minWidth: 380,
        verticalAlign: "top",
        background: colors.cardBg,
      }}
    >
      <div style={{ minHeight: 150 }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "10px 16px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          overflow: "hidden",
        }}
      >
        {/* total + share */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              color: colors.accent,
              lineHeight: 1,
            }}
          >
            {animatedTotal.toLocaleString()}
          </span>
          <span style={{ fontSize: "0.62rem", color: colors.textTertiary }}>
            in progress · {share.toFixed(1)}% of all
          </span>
        </div>
        <div
          style={{
            height: 3,
            borderRadius: 3,
            background: colors.rowHover,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: go ? `${share}%` : 0,
              height: "100%",
              background: `linear-gradient(90deg, ${colors.accent}, #8b5cf6)`,
              transition: `width 0.9s ${EASE}`,
            }}
          />
        </div>

        {/* ───────── BY YEAR (boxed chart) ───────── */}
        {mode === "year" && (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 10,
              padding: "12px 14px 6px",
              background: colors.pageBg,
            }}
          >
            <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
              {/* gridlines */}
              {[0, 25, 50, 75].map((p) => (
                <div
                  key={p}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: `${p}%`,
                    borderTop: `1px ${p === 0 ? "solid" : "dashed"} ${colors.cardBorder}`,
                    opacity: p === 0 ? 1 : 0.6,
                  }}
                />
              ))}
              {/* bars */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "flex-end",
                }}
              >
                {yearVals.map(({ y, n }, i) => {
                  const peak = n > 0 && n === yearMax;
                  const prev = i > 0 ? yearVals[i - 1].n : 0;
                  const delta =
                    prev > 0 && n > 0
                      ? Math.round(((n - prev) / prev) * 100)
                      : null;
                  const label = {
                    background: colors.pageBg, // hides the gridline behind text
                    padding: "0 4px",
                    borderRadius: 4,
                    lineHeight: 1.3,
                  };
                  return (
                    <div
                      key={y}
                      onClick={() => n > 0 && unitDrill(y)}
                      title={`${y}: ${n}`}
                      style={{
                        flex: 1,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        cursor: n > 0 ? "pointer" : "default",
                      }}
                    >
                      {delta !== null && (
                        <span
                          style={{
                            ...label,
                            fontSize: "0.58rem",
                            fontWeight: 700,
                            color: delta > 0 ? "#ef4444" : "#22c55e",
                            opacity: go ? 1 : 0,
                            transition: `opacity 0.4s ease ${0.6 + i * 0.08}s`,
                          }}
                        >
                          {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}%
                        </span>
                      )}
                      <span
                        style={{
                          ...label,
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          color: peak ? PEAK : colors.textPrimary,
                          marginBottom: 3,
                          opacity: go ? 1 : 0,
                          transition: `opacity 0.4s ease ${0.5 + i * 0.08}s`,
                        }}
                      >
                        {n || ""}
                      </span>
                      <div
                        style={{
                          width: "min(46%, 38px)",
                          height: go ? `${(n / yearMax) * 66}%` : 0,
                          minHeight: go && n > 0 ? 3 : 0,
                          borderRadius: "7px 7px 2px 2px",
                          background: peak
                            ? `linear-gradient(180deg, #fbbf24, ${PEAK} 45%, #b45309)`
                            : `linear-gradient(180deg, #60a5fa, ${colors.accent} 45%, #1d4ed8)`,
                          boxShadow: peak
                            ? "0 0 14px rgba(245,158,11,0.45)"
                            : "0 0 10px rgba(59,130,246,0.25)",
                          transition: `height 0.9s ${EASE} ${i * 0.1}s, filter 0.15s, transform 0.15s`,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.filter = "brightness(1.2)";
                          e.currentTarget.style.transform = "scaleX(1.12)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.filter = "none";
                          e.currentTarget.style.transform = "none";
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", marginTop: 4 }}>
              {yearVals.map(({ y }) => (
                <span
                  key={y}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "0.62rem",
                    fontWeight: 600,
                    color: colors.textTertiary,
                  }}
                >
                  {y}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ───────── MEMBERS BY YEAR (all members, scroll inside) ───────── */}
        {mode === "memberyear" && (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: `repeat(${years.length}, minmax(0, 1fr))`,
              gridTemplateRows: "minmax(0, 1fr)",
              gap: 10,
            }}
          >
            {perYear.map((col, ci) => (
              <div
                key={col.y}
                style={{
                  minWidth: 0,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "6px 8px",
                  borderRadius: 8,
                  background: colors.rowHover,
                  border: `1px solid ${colors.cardBorder}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    borderBottom: `1px solid ${colors.cardBorder}`,
                    paddingBottom: 3,
                    flexShrink: 0,
                  }}
                >
                  <span
                    onClick={() => col.total > 0 && unitDrill(col.y)}
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      color: colors.textPrimary,
                      cursor: col.total > 0 ? "pointer" : "default",
                    }}
                  >
                    {col.y}
                  </span>
                  <span
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      color: colors.accent,
                    }}
                  >
                    {col.total}
                  </span>
                </div>
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    paddingRight: 2,
                  }}
                >
                  {col.list.length === 0 && (
                    <span
                      style={{ fontSize: "0.6rem", color: colors.textTertiary }}
                    >
                      —
                    </span>
                  )}
                  {col.list.map((m, i) => (
                    <div
                      key={m.member_user_id}
                      onClick={() => memberDrill(m, col.y)}
                      title={`${m.member_name} (${col.y}): ${m.counts[col.y]}`}
                      style={{ cursor: "pointer", minWidth: 0, flexShrink: 0 }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 4,
                          fontSize: "0.6rem",
                          color: colors.textSecondary,
                        }}
                      >
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            minWidth: 0,
                          }}
                        >
                          <b style={{ color: RANK[i] || colors.textTertiary }}>
                            {i + 1}.
                          </b>{" "}
                          {m.member_name}
                        </span>
                        <span
                          style={{ fontWeight: 800, color: colors.textPrimary }}
                        >
                          {m.counts[col.y]}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 4,
                          borderRadius: 3,
                          background: colors.cardBorder,
                          overflow: "hidden",
                          marginTop: 1,
                        }}
                      >
                        <div
                          style={{
                            width: go
                              ? `${(m.counts[col.y] / col.max) * 100}%`
                              : 0,
                            height: "100%",
                            borderRadius: 3,
                            background:
                              i === 0
                                ? "linear-gradient(90deg, #f59e0b, #b45309)"
                                : `linear-gradient(90deg, #60a5fa, ${colors.accent})`,
                            transition: `width 0.8s ${EASE} ${ci * 0.08 + i * 0.04}s`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </td>
  );
}
// ══════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════
export default function InProgressByYearView({ darkMode }) {
  const colors = usePalette(darkMode);

  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // multi-select filters (empty array = all)
  const [unitFilter, setUnitFilter] = useState([]); // unit_id strings
  const [appTypeFilter, setAppTypeFilter] = useState([]);
  const [entryTypeFilter, setEntryTypeFilter] = useState(["ORIGINAL"]);
  const [stepSel, setStepSel] = useState([]);
  // joined with "|" for the API; also used as stable effect deps
  const appTypeParam = appTypeFilter.join("|");
  const entryTypeParam = entryTypeFilter.join("|");
  const stepParam = stepSel.join("|");
  const hasTypeFilter = !!(appTypeParam || entryTypeParam || stepParam);
  const loadSeq = useRef(0);
  const [showCharts, setShowCharts] = useState(true);
  const [chartMode, setChartMode] = useState("year"); // "year" | "member"

  // Fit the component to the remaining screen height
  const rootRef = useRef(null);
  const [boxH, setBoxH] = useState(null);
  const ready = !!matrix;
  useEffect(() => {
    const fit = () => {
      if (!rootRef.current) return;
      const top = rootRef.current.getBoundingClientRect().top;
      setBoxH(Math.max(420, window.innerHeight - top - BOTTOM_GAP));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [ready]);
  const [includeSupervisors, setIncludeSupervisors] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [drill, setDrill] = useState(null);

  // ── Reused modals: DTN → Doctrack, Actions → Details / Application Logs ──
  const [doctrackRow, setDoctrackRow] = useState(null);
  const [logsRow, setLogsRow] = useState(null);
  const [detail, setDetail] = useState(null); // full or partial record
  const [detailLoading, setDetailLoading] = useState(false);

  // main_db.DB_ID of a task row (= application_logs.main_db_id)
  const mainIdOf = (t) => t.main_db_id ?? t.db_id ?? null;

  // Load the FULL record (same shape the Records page uses)
  const fetchFullRecord = async (t) => {
    if (!t.dtn)
      throw new Error("This record has no DTN, so it cannot be loaded.");
    const res = await getUploadReports({
      page: 1,
      pageSize: 20,
      search: "",
      status: "",
      sortBy: "DB_DATE_EXCEL_UPLOAD",
      sortOrder: "desc",
      dtn: parseInt(t.dtn, 10),
    });
    const items = (res?.data ?? []).map(mapDataItem);
    const mainId = mainIdOf(t);
    const match =
      mainId != null
        ? items.find((x) => String(x.id) === String(mainId))
        : items.length === 1
          ? items[0]
          : null;
    if (!match) throw new Error("Full record not found.");
    return match;
  };

  const openDetails = async (t) => {
    // show a partial record first, then swap in the full one
    setDetail({
      dtn: t.dtn,
      entryType: t.entry_type,
      dateReceivedCent: t.date_received_center,
      appStatus: t.status,
      prodBrName: t.brand_name,
    });
    setDetailLoading(true);
    try {
      setDetail(await fetchFullRecord(t));
    } catch (err) {
      console.error("Load full record failed:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const childModalOpen = !!(doctrackRow || logsRow || detail);

  const load = async () => {
    // ignore out-of-order responses when checkboxes are toggled quickly
    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getInProgressYearMatrix(
        appTypeParam,
        entryTypeParam,
        stepParam,
      );
      if (seq === loadSeq.current) setMatrix(data);
    } catch (err) {
      if (seq === loadSeq.current) setError(err.message);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  };

  // reload whenever the app type / entry type selection changes
  useEffect(() => {
    load();
  }, [appTypeParam, entryTypeParam, stepParam]);

  const years = matrix?.years || [];
  const visibleUnits = useMemo(() => {
    let list = matrix?.units || [];
    if (unitFilter.length)
      list = list.filter((u) => unitFilter.includes(String(u.unit_id)));

    // Supervisors OFF: remove them from the rows and subtract their
    // counts from the unit totals.
    if (!includeSupervisors) {
      list = list
        .map((u) => {
          const sups = u.members.filter(isSupervisor);
          if (sups.length === 0) return u;
          const counts = { ...u.counts };
          let noDate = u.no_date;
          let total = u.total;
          sups.forEach((s) => {
            Object.entries(s.counts).forEach(([y, n]) => {
              counts[y] = (counts[y] || 0) - n;
            });
            noDate -= s.no_date || 0;
            total -= s.total || 0;
          });
          const members = u.members.filter((m) => !isSupervisor(m));
          return {
            ...u,
            counts,
            no_date: noDate,
            total,
            members,
            // so clicking the Unit total only lists these members' tasks
            scopeMemberIds: members.map((m) => m.member_user_id).join("|"),
          };
        })
        .filter((u) => u.members.length > 0);
    }

    if (!hasTypeFilter) return list;
    // with an app/entry type selected, hide units/members that have nothing
    return list
      .filter((u) => u.total > 0)
      .map((u) => ({
        ...u,
        members: u.members.filter((m) => m.total > 0 || isSideRole(m)),
      }));
  }, [matrix, unitFilter, hasTypeFilter, includeSupervisors]);

  // Only show the "No date" column if at least one row needs it
  const hasNoDate = visibleUnits.some((u) => u.no_date > 0);
  const visibleTotal = visibleUnits.reduce((s, u) => s + u.total, 0);

  // Column totals for the footer row
  const yearTotals = useMemo(() => {
    const t = {};
    years.forEach((y) => {
      t[y] = visibleUnits.reduce((s, u) => s + (u.counts[y] || 0), 0);
    });
    return t;
  }, [years, visibleUnits]);
  const noDateTotal = visibleUnits.reduce((s, u) => s + u.no_date, 0);

  // ── PDF export (plain white header/footer, independent of theme) ──
  const exportPdf = async () => {
    if (!matrix) return;
    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new jsPDF({
        orientation: years.length > 6 ? "landscape" : "portrait",
        unit: "pt",
        format: "a4",
      });

      doc.setFontSize(14);
      doc.text("In Progress - Received by Center", 40, 40);
      doc.setFontSize(9);
      doc.setTextColor(110);
      const filterText = [
        appTypeFilter.length ? `App type: ${appTypeFilter.join(", ")}` : null,
        entryTypeFilter.length
          ? `Entry type: ${entryTypeFilter.join(", ")}`
          : null,
        stepSel.length ? `Step: ${stepSel.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("  |  ");
      const subtitleLines = doc.splitTextToSize(
        [
          `Generated ${new Date().toLocaleString()}`,
          `Total in progress: ${visibleTotal}`,
          ...(filterText ? [filterText] : []),
        ].join("  |  "),
        doc.internal.pageSize.getWidth() - 80,
      );
      doc.text(subtitleLines, 40, 56);
      const tableStartY = 56 + subtitleLines.length * 11 + 8;

      const head = [
        [
          { content: "Unit", rowSpan: 2 },
          { content: "Member", rowSpan: 2 },
          {
            content: "Received by center",
            colSpan: years.length + (hasNoDate ? 1 : 0),
          },
          { content: "Total", rowSpan: 2 },
        ],
        [...years, ...(hasNoDate ? ["No date"] : [])],
      ];

      const body = [];
      visibleUnits.forEach((u) => {
        const {
          rows: unitRows,
          supervisors,
          statisticians,
        } = splitUnitMembers(u);
        const extras = [...supervisors, ...statisticians];
        const unitLabel = [
          u.unit_name,
          supervisors.length
            ? `Supervisor:\n${supervisors.map((s) => s.member_name).join("\n")}`
            : null,
          statisticians.length
            ? `Statistician:\n${statisticians
                .map((s) => s.member_name)
                .join("\n")}`
            : null,
        ]
          .filter(Boolean)
          .join("\n\n");
        const hasSup = extras.length > 0;
        unitRows.forEach((m, idx) => {
          const row = [];
          if (idx === 0) {
            row.push({
              content: unitLabel,
              // members + unit total (+ "Total" row + supervisor rows)
              rowSpan: unitRows.length + 1 + (hasSup ? extras.length + 1 : 0),
              styles: { valign: "middle", fontStyle: "bold" },
            });
          }
          row.push(m.member_name);
          years.forEach((y) => row.push(m.counts[y] || ""));
          if (hasNoDate) row.push(m.no_date || "");
          row.push(m.total || "");
          body.push(row);
        });
        if (hasSup) {
          const sumOf = (fn) => unitRows.reduce((s, m) => s + fn(m), 0);
          const bold = { fontStyle: "bold" };
          body.push([
            { content: "Total", styles: bold },
            ...years.map((y) => ({
              content: sumOf((m) => m.counts[y] || 0) || "",
              styles: bold,
            })),
            ...(hasNoDate
              ? [{ content: sumOf((m) => m.no_date) || "", styles: bold }]
              : []),
            { content: sumOf((m) => m.total) || "", styles: bold },
          ]);
          extras.forEach((s) => {
            body.push([
              s.member_name,
              ...years.map((y) => s.counts[y] || ""),
              ...(hasNoDate ? [s.no_date || ""] : []),
              s.total || "",
            ]);
          });
        }
        // Unit subtotal row (unit cell is covered by the rowSpan above)
        const sub = [
          { content: "Unit total", styles: { fontStyle: "bold" } },
          ...years.map((y) => ({
            content: u.counts[y] || "",
            styles: { fontStyle: "bold" },
          })),
        ];
        if (hasNoDate)
          sub.push({
            content: u.no_date || "",
            styles: { fontStyle: "bold" },
          });
        sub.push({ content: u.total || "", styles: { fontStyle: "bold" } });
        sub.forEach((c) => {
          if (typeof c === "object")
            c.styles = { ...c.styles, fillColor: [243, 244, 246] };
        });
        body.push(sub);
      });

      const foot = [
        [
          { content: "Grand total", colSpan: 2 },
          ...years.map((y) => yearTotals[y] || ""),
          ...(hasNoDate ? [noDateTotal || ""] : []),
          visibleTotal,
        ],
      ];

      autoTable(doc, {
        startY: tableStartY,
        head,
        body,
        foot,
        // print the Grand total only once, on the last page
        // (default "everyPage" repeats it on every page)
        showFoot: "lastPage",
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 4, lineColor: [150, 150, 150] },
        // plain look: white header/footer, black bold text, gray grid lines
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [17, 17, 17],
          fontStyle: "bold",
          halign: "center",
          lineWidth: 0.5,
          lineColor: [150, 150, 150],
        },
        footStyles: {
          fillColor: [255, 255, 255],
          textColor: [17, 17, 17],
          fontStyle: "bold",
          lineWidth: 0.5,
          lineColor: [150, 150, 150],
        },
        columnStyles: Object.fromEntries(
          Array.from({ length: years.length + 3 }, (_, i) => [
            i,
            i >= 2 ? { halign: "center" } : {},
          ]),
        ),
      });

      const slug = (s) => s.replace(/[^\w]+/g, "_");
      const unitLabel =
        unitFilter.length === 1
          ? slug(visibleUnits[0]?.unit_name || "unit")
          : unitFilter.length > 1
            ? "selected_units"
            : "all_units";
      const typeLabel =
        (appTypeFilter.length
          ? `_${appTypeFilter.length === 1 ? slug(appTypeFilter[0]) : "multi_types"}`
          : "") +
        (entryTypeFilter.length
          ? `_${entryTypeFilter.length === 1 ? slug(entryTypeFilter[0]) : "multi_entry"}`
          : "");
      doc.save(
        `in_progress_by_year_${unitLabel}${typeLabel}_${new Date().toISOString().slice(0, 10)}.pdf`,
      );
    } catch (err) {
      console.error("PDF export failed:", err);
      setError("Failed to export PDF.");
    } finally {
      setExporting(false);
    }
  };

  // Grand total click: every unit currently shown in the table
  const grandDrill = (year) =>
    setDrill({
      scope: "all",
      unitIds: visibleUnits.map((u) => u.unit_id).join("|"),
      unitCount: visibleUnits.length,
      // supervisors toggled off: only list the members still in the table
      memberIds: includeSupervisors
        ? undefined
        : visibleUnits
            .flatMap((u) => u.members.map((m) => m.member_user_id))
            .join("|"),
      label: includeSupervisors ? undefined : "without supervisors",
      year,
      appType: appTypeParam,
      entryType: entryTypeParam,
      step: stepParam,
    });

  // ── Styles ──
  const th = {
    background: colors.headBg,
    color: colors.headText,
    border: `1px solid ${colors.cardBorder}`,
    padding: "6px 12px",
    fontSize: "0.78rem",
    fontWeight: 700,
    textAlign: "center",
    whiteSpace: "nowrap",
  };
  const td = {
    border: `1px solid ${colors.cardBorder}`,
    padding: "6px 12px",
    fontSize: "0.8rem",
    color: colors.textSecondary,
  };
  const num = { ...td, textAlign: "center" };

  // Frozen header: row 1 sticks at the top, row 2 (years) sticks right
  // under it. HEAD_ROW1_H must match the real height of the first row.
  const HEAD_ROW1_H = 31;
  const thTop = { ...th, position: "sticky", top: 0, zIndex: 3 };
  const thTop2 = { ...th, position: "sticky", top: HEAD_ROW1_H, zIndex: 3 };
  // Grand total: normal row at the end of the table (not frozen)
  const thFoot = { ...th };
  const btn = {
    padding: "5px 12px",
    borderRadius: 6,
    border: `1px solid ${colors.cardBorder}`,
    background: "transparent",
    color: colors.textSecondary,
    fontSize: "0.74rem",
    fontWeight: 700,
    cursor: "pointer",
  };

  if (loading && !matrix)
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.textTertiary,
        }}
      >
        Loading in-progress summary…
      </div>
    );

  return (
    <div
      ref={rootRef}
      style={{
        // measured height so the table area scrolls (not the whole page);
        // that is what makes the sticky header/footer work
        height: boxH ?? "calc(100vh - 140px)",
        minHeight: 420,
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 10,
        background: colors.pageBg,
        overflow: "hidden",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.6rem",
          padding: "0.7rem 1rem",
          borderBottom: `1px solid ${colors.cardBorder}`,
          background: colors.cardBg,
        }}
      >
        <span
          style={{
            fontSize: "0.85rem",
            fontWeight: 700,
            color: colors.textPrimary,
          }}
        >
          📊 In Progress by Year Received — {visibleTotal} total
        </span>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <MultiSelect
            allLabel="All units"
            noun="units"
            options={(matrix?.units || []).map((u) => ({
              value: String(u.unit_id),
              label: u.unit_name,
            }))}
            selected={unitFilter}
            onChange={setUnitFilter}
            colors={colors}
            buttonStyle={btn}
          />
          <MultiSelect
            allLabel="All app types"
            noun="app types"
            options={(matrix?.app_types || []).map((t) => ({
              value: t,
              label: t,
            }))}
            selected={appTypeFilter}
            onChange={setAppTypeFilter}
            colors={colors}
            buttonStyle={btn}
          />
          <MultiSelect
            allLabel="All entry types"
            noun="entry types"
            options={(matrix?.entry_types || []).map((t) => ({
              value: t,
              label: t,
            }))}
            selected={entryTypeFilter}
            onChange={setEntryTypeFilter}
            colors={colors}
            buttonStyle={btn}
          />
          <MultiSelect
            allLabel="All steps"
            noun="steps"
            options={(matrix?.steps || []).map((t) => ({
              value: t,
              label: t,
            }))}
            selected={stepSel}
            onChange={setStepSel}
            colors={colors}
            buttonStyle={btn}
          />
          <button
            type="button"
            onClick={() => setIncludeSupervisors((v) => !v)}
            title="Show or hide supervisors in the table"
            style={{
              ...btn,
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: includeSupervisors ? colors.accent : colors.textSecondary,
              borderColor: includeSupervisors
                ? colors.accent
                : colors.cardBorder,
            }}
          >
            <span
              style={{
                width: 26,
                height: 14,
                borderRadius: 9999,
                background: includeSupervisors
                  ? colors.accent
                  : colors.cardBorder,
                position: "relative",
                display: "inline-block",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: includeSupervisors ? 14 : 2,
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.15s",
                }}
              />
            </span>
            Supervisors
          </button>

          <button
            type="button"
            onClick={() => setShowCharts((v) => !v)}
            title="Show or hide the charts"
            style={{
              ...btn,
              color: showCharts ? colors.accent : colors.textSecondary,
              borderColor: showCharts ? colors.accent : colors.cardBorder,
            }}
          >
            📈 Charts
          </button>

          <button onClick={load} disabled={loading} style={btn}>
            {loading ? "Refreshing…" : "↻ Refresh"}
          </button>
          <button
            onClick={exportPdf}
            disabled={exporting || visibleUnits.length === 0}
            style={{
              ...btn,
              background: colors.accent,
              borderColor: colors.accent,
              color: "#fff",
              opacity: exporting || visibleUnits.length === 0 ? 0.6 : 1,
            }}
          >
            {exporting ? "Exporting…" : "⬇ Export PDF"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            color: "#dc2626",
            fontSize: "0.8rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 1rem 1rem" }}>
        {visibleUnits.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: colors.textTertiary,
              fontSize: "0.82rem",
              padding: "1.5rem",
            }}
          >
            No units with active members yet.
          </div>
        ) : (
          <table
            style={{
              borderCollapse: "collapse",
              background: colors.cardBg,
              width: "100%",
              minWidth: 520,
            }}
          >
            <thead>
              <tr>
                <th style={thTop} rowSpan={2}>
                  Unit
                </th>
                <th style={thTop} rowSpan={2}>
                  Member
                </th>
                <th style={thTop} colSpan={years.length + (hasNoDate ? 1 : 0)}>
                  Received by center
                </th>
                <th style={thTop} rowSpan={2}>
                  Total
                </th>
                {showCharts && (
                  <th
                    style={{ ...thTop, minWidth: 380, width: "55%" }}
                    rowSpan={2}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        justifyContent: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      {[
                        { k: "year", l: "By year" },
                        { k: "memberyear", l: "Members by year" },
                      ].map((t) => (
                        <button
                          key={t.k}
                          type="button"
                          onClick={() => setChartMode(t.k)}
                          style={{
                            padding: "3px 12px",
                            borderRadius: 9999,
                            border: `1px solid ${colors.headText}`,
                            background:
                              chartMode === t.k
                                ? colors.headText
                                : "transparent",
                            color:
                              chartMode === t.k
                                ? colors.headBg
                                : colors.headText,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {t.l}
                        </button>
                      ))}
                    </div>
                  </th>
                )}
              </tr>
              <tr>
                {years.map((y) => (
                  <th key={y} style={thTop2}>
                    {y}
                  </th>
                ))}
                {hasNoDate && <th style={thTop2}>No date</th>}
              </tr>
            </thead>
            <tbody>
              {visibleUnits.map((u) => (
                <UnitRows
                  key={u.unit_id}
                  showCharts={showCharts}
                  chartMode={chartMode}
                  grandTotal={visibleTotal}
                  unit={u}
                  years={years}
                  hasNoDate={hasNoDate}
                  td={td}
                  num={num}
                  colors={colors}
                  onDrill={(d) =>
                    setDrill({
                      ...d,
                      appType: appTypeParam,
                      entryType: entryTypeParam,
                      step: stepParam,
                    })
                  }
                />
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...thFoot, textAlign: "left" }} colSpan={2}>
                  Grand total
                </td>
                {years.map((y) => (
                  <CountCell
                    key={y}
                    value={yearTotals[y]}
                    style={thFoot}
                    colors={colors}
                    linkColor={colors.headText}
                    title={`All units — ${y}`}
                    onClick={() => grandDrill(y)}
                  />
                ))}
                {hasNoDate && <td style={thFoot}>{noDateTotal || ""}</td>}
                <CountCell
                  value={visibleTotal}
                  style={thFoot}
                  colors={colors}
                  linkColor={colors.headText}
                  title="All units — all years"
                  onClick={() => grandDrill(null)}
                />
                {showCharts && <td style={thFoot} />}
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {drill && (
        <DrilldownModal
          drill={drill}
          colors={colors}
          onClose={() => setDrill(null)}
          onDoctrack={setDoctrackRow}
          onDetails={openDetails}
          onLogs={setLogsRow}
          suspendKeys={childModalOpen}
        />
      )}

      {/* Rendered after the popup so they stack on top of it */}
      {doctrackRow && (
        <DoctrackModal
          record={{ dtn: doctrackRow.dtn }}
          onClose={() => setDoctrackRow(null)}
          colors={colors}
        />
      )}
      {logsRow && (
        <ApplicationLogsModal
          record={{ dtn: logsRow.dtn, mainDbId: mainIdOf(logsRow) }}
          onClose={() => setLogsRow(null)}
          colors={colors}
          darkMode={darkMode}
        />
      )}
      {detail && (
        <ViewDetailsModal
          record={detail}
          loading={detailLoading}
          onClose={() => setDetail(null)}
          colors={colors}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

// A number that opens the drill-down popup. Empty cells stay plain.
function CountCell({ value, style, colors, onClick, title, linkColor }) {
  if (!value) return <td style={style} />;
  return (
    <td style={style}>
      <button
        type="button"
        onClick={onClick}
        title={title}
        style={{
          background: "transparent",
          border: "none",
          padding: "0 4px",
          font: "inherit",
          fontWeight: "inherit",
          color: linkColor || colors.accent,
          cursor: "pointer",
          textDecoration: "underline",
          textUnderlineOffset: 2,
        }}
      >
        {value}
      </button>
    </td>
  );
}

// One unit block: unit cell (rowSpan) + member rows, then (if the unit
// has supervisors/statisticians) a "Total" row of the members above and
// one row per supervisor/statistician, then the Unit total (everyone).
function UnitRows({
  unit,
  years,
  hasNoDate,
  td,
  num,
  colors,
  onDrill,
  showCharts,
  chartMode,
  grandTotal,
}) {
  const {
    rows: memberRows,
    supervisors,
    statisticians,
  } = splitUnitMembers(unit);
  const extras = [...supervisors, ...statisticians];
  const hasSup = extras.length > 0;
  const rowCount = memberRows.length + 1 + (hasSup ? extras.length + 1 : 0);

  const subtotal = {
    ...num,
    fontWeight: 700,
    color: colors.textPrimary,
    background: colors.unitTotalBg,
  };
  const plainTotal = { ...num, fontWeight: 700, color: colors.textPrimary };

  const memberDrill = (m, year) =>
    onDrill({
      scope: "member",
      unitId: unit.unit_id,
      unitName: unit.unit_name,
      memberId: m.member_user_id,
      memberName: m.member_name,
      year,
    });
  const unitDrill = (year) =>
    onDrill({
      scope: "unit",
      unitId: unit.unit_id,
      unitName: unit.unit_name,
      // set only when supervisors are toggled off
      memberIds: unit.scopeMemberIds || undefined,
      label: unit.scopeMemberIds ? "without supervisors" : undefined,
      year,
    });

  // "Total" row: only the member rows above it (no supervisors/statisticians)
  const membersDrill = (year) =>
    onDrill({
      scope: "unit",
      unitId: unit.unit_id,
      unitName: unit.unit_name,
      memberIds: memberRows.map((m) => m.member_user_id).join("|"),
      label: "members total",
      year,
    });

  // Name cell + year cells + no-date + total for one member/supervisor
  const memberCells = (m) => (
    <>
      <td style={td}>{m.member_name}</td>
      {years.map((y) => (
        <CountCell
          key={y}
          value={m.counts[y]}
          style={num}
          colors={colors}
          title={`${m.member_name} — ${y}`}
          onClick={() => memberDrill(m, y)}
        />
      ))}
      {hasNoDate && <td style={num}>{m.no_date || ""}</td>}
      <CountCell
        value={m.total}
        style={{ ...num, fontWeight: 700 }}
        colors={colors}
        title={`${m.member_name} — all years`}
        onClick={() => memberDrill(m, null)}
      />
    </>
  );

  const sumYear = (y) => memberRows.reduce((s, m) => s + (m.counts[y] || 0), 0);
  const sumNoDate = memberRows.reduce((s, m) => s + (m.no_date || 0), 0);
  const sumTotal = memberRows.reduce((s, m) => s + (m.total || 0), 0);

  return (
    <>
      {memberRows.map((m, idx) => (
        <tr key={m.member_user_id}>
          {idx === 0 && (
            <td
              rowSpan={rowCount}
              style={{
                ...td,
                fontWeight: 700,
                color: colors.textPrimary,
                textAlign: "center",
                verticalAlign: "middle",
                maxWidth: 220,
              }}
            >
              {unit.unit_name}
              {[
                { label: "Supervisor", people: supervisors },
                { label: "Statistician", people: statisticians },
              ]
                .filter((g) => g.people.length > 0)
                .map((g) => (
                  <div
                    key={g.label}
                    style={{
                      marginTop: 10,
                      fontWeight: 400,
                      fontSize: "0.74rem",
                      color: colors.textSecondary,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.66rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        color: colors.textTertiary,
                        marginBottom: 2,
                      }}
                    >
                      {g.label}
                    </div>
                    {g.people.map((s) => (
                      <div key={s.member_user_id}>{s.member_name}</div>
                    ))}
                  </div>
                ))}
            </td>
          )}
          {memberCells(m)}
          {idx === 0 && showCharts && (
            <UnitChartCell
              unit={unit}
              years={years}
              mode={chartMode}
              colors={colors}
              grandTotal={grandTotal}
              rowSpan={rowCount}
              td={td}
              onDrill={onDrill}
            />
          )}
        </tr>
      ))}

      {hasSup && (
        <>
          {/* Total of the member rows above (supervisors excluded) */}
          <tr>
            <td style={{ ...plainTotal, textAlign: "left" }}>Total</td>
            {years.map((y) => (
              <CountCell
                key={y}
                value={sumYear(y)}
                style={plainTotal}
                colors={colors}
                title={`Members total — ${y}`}
                onClick={() => membersDrill(y)}
              />
            ))}
            {hasNoDate && <td style={plainTotal}>{sumNoDate || ""}</td>}
            <CountCell
              value={sumTotal}
              style={plainTotal}
              colors={colors}
              title="Members total — all years"
              onClick={() => membersDrill(null)}
            />
          </tr>
          {/* Supervisors: own counts, shown even when zero */}
          {extras.map((s) => (
            <tr key={s.member_user_id}>{memberCells(s)}</tr>
          ))}
        </>
      )}

      <tr>
        <td style={{ ...subtotal, textAlign: "left" }}>Unit total</td>
        {years.map((y) => (
          <CountCell
            key={y}
            value={unit.counts[y]}
            style={subtotal}
            colors={colors}
            title={`${unit.unit_name} — ${y}`}
            onClick={() => unitDrill(y)}
          />
        ))}
        {hasNoDate && <td style={subtotal}>{unit.no_date || ""}</td>}
        <CountCell
          value={unit.total}
          style={subtotal}
          colors={colors}
          title={`${unit.unit_name} — all years`}
          onClick={() => unitDrill(null)}
        />
      </tr>
    </>
  );
}
