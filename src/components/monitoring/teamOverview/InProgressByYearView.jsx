// src/components/monitoring/teamOverview/InProgressByYearView.jsx
//
// Monitoring tab: in-progress tasks per Unit → Member, split by the
// YEAR the application was received by the center.
// READ-ONLY. Counts are clickable (drill-down popup) and the table can
// be exported to PDF (client-side, jsPDF + autotable).
// In the popup: DTN opens Doctrack; Actions open View Details /
// Application Logs (same modals as Team Overview / Records).

import { useState, useEffect, useMemo } from "react";
import {
  getInProgressYearMatrix,
  getAllTeamsMemberInProgressTasks,
  getUnitInProgressTasks,
} from "../../../api/targetAssignments";
import { getUploadReports } from "../../../api/reports.js";
import { mapDataItem } from "../../reports/utils.js";
// Reused modals (same ones the Records / Analytics / Team Overview use)
import DoctrackModal from "../../reports/actions/DoctrackModal.jsx";
import ViewDetailsModal from "../../reports/actions/ViewDetailsModal.jsx";
import ApplicationLogsModal from "../../tasks/ApplicationLogsModal.jsx";

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

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isUnit = drill.scope === "unit";

  // Escape closes this popup, unless a child modal is open on top of it
  useEffect(() => {
    if (suspendKeys) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, suspendKeys]);

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
          dateFrom: drill.year ? `${drill.year}-01-01` : undefined,
          dateTo: drill.year ? `${drill.year}-12-31` : undefined,
          sortBy: "date_received_center",
          sortDir: "asc",
        };
        const res = isUnit
          ? await getUnitInProgressTasks(drill.unitId, params)
          : await getAllTeamsMemberInProgressTasks(drill.memberId, params);
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
  }, [drill, isUnit, page, pageSize, debouncedSearch]);

  const title = isUnit ? drill.unitName : drill.memberName;
  const subtitle = [
    isUnit ? "Unit" : drill.unitName,
    drill.year ? `Received ${drill.year}` : "All years",
  ].join(" · ");

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
          width: 1100,
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

        {/* Table */}
        <div style={{ flex: 1, overflow: "auto" }}>
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
                  {rows.map((t) => (
                    <tr
                      key={t.log_id}
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
                      <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
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

// ══════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════
export default function InProgressByYearView({ darkMode }) {
  const colors = usePalette(darkMode);

  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unitFilter, setUnitFilter] = useState("");
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
    setLoading(true);
    setError(null);
    try {
      setMatrix(await getInProgressYearMatrix());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const years = matrix?.years || [];
  const visibleUnits = useMemo(() => {
    const all = matrix?.units || [];
    return unitFilter
      ? all.filter((u) => String(u.unit_id) === unitFilter)
      : all;
  }, [matrix, unitFilter]);

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
      doc.text(
        `Generated ${new Date().toLocaleString()}  |  Total in progress: ${visibleTotal}`,
        40,
        56,
      );

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
        u.members.forEach((m, idx) => {
          const row = [];
          if (idx === 0) {
            row.push({
              content: u.unit_name,
              rowSpan: u.members.length + 1, // + subtotal row
              styles: { valign: "middle", fontStyle: "bold" },
            });
          }
          row.push(m.member_name);
          years.forEach((y) => row.push(m.counts[y] || ""));
          if (hasNoDate) row.push(m.no_date || "");
          row.push(m.total || "");
          body.push(row);
        });
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
        startY: 70,
        head,
        body,
        foot,
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

      const unitLabel = unitFilter
        ? (visibleUnits[0]?.unit_name || "unit").replace(/[^\w]+/g, "_")
        : "all_units";
      doc.save(
        `in_progress_by_year_${unitLabel}_${new Date().toISOString().slice(0, 10)}.pdf`,
      );
    } catch (err) {
      console.error("PDF export failed:", err);
      setError("Failed to export PDF.");
    } finally {
      setExporting(false);
    }
  };

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
      style={{
        flex: 1,
        minHeight: 0,
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
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            style={{
              ...btn,
              background: colors.cardBg,
              color: colors.textPrimary,
            }}
          >
            <option value="">All units</option>
            {(matrix?.units || []).map((u) => (
              <option key={u.unit_id} value={u.unit_id}>
                {u.unit_name}
              </option>
            ))}
          </select>
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
      <div style={{ flex: 1, overflow: "auto", padding: "1rem" }}>
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
              minWidth: 520,
            }}
          >
            <thead>
              <tr>
                <th style={th} rowSpan={2}>
                  Unit
                </th>
                <th style={th} rowSpan={2}>
                  Member
                </th>
                <th style={th} colSpan={years.length + (hasNoDate ? 1 : 0)}>
                  Received by center
                </th>
                <th style={th} rowSpan={2}>
                  Total
                </th>
              </tr>
              <tr>
                {years.map((y) => (
                  <th key={y} style={th}>
                    {y}
                  </th>
                ))}
                {hasNoDate && <th style={th}>No date</th>}
              </tr>
            </thead>
            <tbody>
              {visibleUnits.map((u) => (
                <UnitRows
                  key={u.unit_id}
                  unit={u}
                  years={years}
                  hasNoDate={hasNoDate}
                  td={td}
                  num={num}
                  colors={colors}
                  onDrill={setDrill}
                />
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...th, textAlign: "left" }} colSpan={2}>
                  Grand total
                </td>
                {years.map((y) => (
                  <td key={y} style={th}>
                    {yearTotals[y] || ""}
                  </td>
                ))}
                {hasNoDate && <td style={th}>{noDateTotal || ""}</td>}
                <td style={th}>{visibleTotal}</td>
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
function CountCell({ value, style, colors, onClick, title }) {
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
          color: colors.accent,
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

// One unit block: unit cell (rowSpan) + member rows + unit subtotal row
function UnitRows({ unit, years, hasNoDate, td, num, colors, onDrill }) {
  const rowCount = unit.members.length + 1; // + subtotal row
  const subtotal = {
    ...num,
    fontWeight: 700,
    color: colors.textPrimary,
    background: colors.unitTotalBg,
  };

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
      year,
    });

  return (
    <>
      {unit.members.map((m, idx) => (
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
            </td>
          )}
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
        </tr>
      ))}
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
