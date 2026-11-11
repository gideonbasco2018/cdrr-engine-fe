// src/components/monitoring/evaluatorAppTypes/WorkloadRecordsModal.jsx
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { getWorkloadRecords } from "../../../api/evaluatorAppTypes";
import { getUploadReports } from "../../../api/reports.js";
import { mapDataItem } from "../../reports/utils.js";
import DoctrackModal from "../../reports/actions/DoctrackModal.jsx";
import ViewDetailsModal from "../../reports/actions/ViewDetailsModal.jsx";
import ApplicationLogsModal from "../../tasks/ApplicationLogsModal.jsx";

const FB = "#1877F2";
const PAGE_SIZE = 50;
const NONE_KEY = "__NONE__";
const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const statusColor = (status) => {
  const s = String(status ?? "")
    .toUpperCase()
    .replace(/[\s_-]+/g, " ")
    .trim();
  if (s === "COMPLETED") return "#36a420";
  if (s === "ON PROCESS" || s === "IN PROGRESS") return "#f59e0b";
  return "#9ca3af";
};
const facetLabel = (key, noneLabel) => (key === NONE_KEY ? noneLabel : key);
const prettyStep = (s) =>
  !s
    ? "—"
    : s === "S&E"
      ? s
      : s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// target = { title, workload: { ...params for /evaluator-app-types/records } }
export default function WorkloadRecordsModal({
  target,
  ui,
  darkMode,
  onClose,
}) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [docFilter, setDocFilter] = useState("All");
  const [statusCounts, setStatusCounts] = useState([]);
  const [docCounts, setDocCounts] = useState([]);
  const [recFrom, setRecFrom] = useState("");
  const [recTo, setRecTo] = useState("");
  const [relFrom, setRelFrom] = useState("");
  const [relTo, setRelTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [menu, setMenu] = useState(null);
  const [doctrackRow, setDoctrackRow] = useState(null);
  const [logsRow, setLogsRow] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const subOpenRef = useRef(false);
  subOpenRef.current = !!(doctrackRow || logsRow || detail);

  const line = ui.cardBorder;
  const colors = {
    cardBg: ui.cardBg,
    cardBorder: ui.cardBorder,
    tableBg: ui.inputBg,
    tableRowHover: ui.hoverBg,
    inputBg: ui.inputBg,
    badgeBg: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    textPrimary: ui.textPrimary,
    textSecondary: ui.textSub ?? ui.textPrimary,
    textTertiary: ui.textMuted,
  };

  // debounce DTN search
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const requestRecords = (pageNum, pageSize) =>
    getWorkloadRecords({
      ...target.workload,
      page: pageNum,
      page_size: pageSize,
      search: query || undefined,
      status: statusFilter === "All" ? undefined : statusFilter,
      doc_type: docFilter === "All" ? undefined : docFilter,
      received_from: recFrom || undefined,
      received_to: recTo || undefined,
      released_from: relFrom || undefined,
      released_to: relTo || undefined,
    });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await requestRecords(page, PAGE_SIZE);
        if (cancelled) return;
        setRows(res.data ?? []);
        setTotal(res.total ?? 0);
        setStatusCounts(res.status_counts ?? []);
        setDocCounts(res.doc_type_counts ?? []);
      } catch (err) {
        console.error("Workload records fetch error:", err);
        if (!cancelled) setError("Failed to load records.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    target,
    page,
    query,
    statusFilter,
    docFilter,
    recFrom,
    recTo,
    relFrom,
    relTo,
  ]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !subOpenRef.current && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── View Details: open with what we have, then load the full record ──
  const openDetails = async (r) => {
    setDetail({
      dtn: r.dtn,
      entryType: r.entry_type,
      dateReceivedCent: r.date_received_cent,
      dateReleased: r.date_released,
      typeDocReleased: r.type_doc_released,
      appStatus: r.app_status,
      prodBrName: r.brand_name,
      prodGenName: r.generic_name,
      secpaExpDate: r.secpa_exp_date,
    });
    if (!r.dtn) return;
    setDetailLoading(true);
    try {
      const res = await getUploadReports({
        page: 1,
        pageSize: 20,
        search: "",
        status: "",
        sortBy: "DB_DATE_EXCEL_UPLOAD",
        sortOrder: "desc",
        dtn: parseInt(r.dtn, 10),
      });
      const match = (res?.data ?? [])
        .map(mapDataItem)
        .find((x) => String(x.id) === String(r.db_id));
      if (match) setDetail(match);
    } catch (err) {
      console.error("Load full record failed:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = async () => {
    if (exporting || total === 0) return;
    setExporting(true);
    try {
      const size = 200;
      let all = [];
      for (let p = 1; p <= Math.ceil(total / size); p++) {
        const res = await requestRecords(p, size);
        all = all.concat(res.data ?? []);
      }
      const header = [
        "DTN",
        "Evaluator",
        "Step",
        "Entry Type",
        "Date Decked",
        "Date Completed",
        "Date Received (Center)",
        "Date Released",
        "Type of Doc Released",
        "Status",
        "Brand Name",
        "Generic Name",
      ];
      const body = all.map((r) => [
        r.dtn ? String(r.dtn) : "",
        r.evaluator ?? "",
        r.step ?? "",
        r.entry_type ?? "",
        r.decked_at ?? "",
        r.completed_at ?? "",
        r.date_received_cent ?? "",
        r.date_released ?? "",
        r.type_doc_released ?? "",
        r.app_status ?? "",
        r.brand_name ?? "",
        r.generic_name ?? "",
      ]);
      const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
      ws["!cols"] = header.map((h) => ({ wch: Math.max(14, h.length + 2) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Records");
      const safe = String(target.title)
        .replace(/[\\/:*?"<>|·—]+/g, "-")
        .replace(/\s+/g, "_")
        .slice(0, 80);
      XLSX.writeFile(
        wb,
        `${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export records.");
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const filtersActive =
    statusFilter !== "All" ||
    docFilter !== "All" ||
    query !== "" ||
    !!(recFrom || recTo || relFrom || relTo);
  const statusAll = statusCounts.reduce((s, x) => s + x.count, 0);
  const statusOptions =
    statusFilter !== "All" && !statusCounts.some((x) => x.key === statusFilter)
      ? [...statusCounts, { key: statusFilter, count: 0 }]
      : statusCounts;
  const docOptions =
    docFilter !== "All" && !docCounts.some((x) => x.key === docFilter)
      ? [...docCounts, { key: docFilter, count: 0 }]
      : docCounts;

  const clearFilters = () => {
    setStatusFilter("All");
    setDocFilter("All");
    setSearch("");
    setQuery("");
    setRecFrom("");
    setRecTo("");
    setRelFrom("");
    setRelTo("");
    setPage(1);
  };

  // ── styles ──
  const btn = (disabled) => ({
    padding: "4px 12px",
    fontSize: "0.75rem",
    borderRadius: 8,
    border: `1px solid ${line}`,
    background: "transparent",
    color: ui.textPrimary,
    fontFamily: font,
    opacity: disabled ? 0.35 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  });
  const chip = (active, color) => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 12px",
    fontSize: "0.72rem",
    fontWeight: active ? 700 : 500,
    borderRadius: 99,
    border: `1px solid ${active ? color : line}`,
    background: active ? `${color}22` : "transparent",
    color: active ? color : ui.textMuted,
    cursor: "pointer",
    fontFamily: font,
  });
  const field = {
    background: ui.inputBg,
    border: `1px solid ${line}`,
    borderRadius: 8,
    padding: "5px 10px",
    fontSize: "0.75rem",
    color: ui.textPrimary,
    outline: "none",
    fontFamily: font,
    colorScheme: darkMode ? "dark" : "light",
  };
  const label = {
    fontSize: "0.65rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
  };
  const th = {
    padding: "8px 10px",
    textAlign: "left",
    fontSize: "0.65rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
    border: `1px solid ${line}`,
    whiteSpace: "nowrap",
    background: ui.cardBg,
    position: "sticky",
    top: 0,
    zIndex: 1,
  };
  const td = {
    padding: "8px 10px",
    fontSize: "0.78rem",
    fontWeight: 500,
    color: ui.textPrimary,
    border: `1px solid ${line}`,
    whiteSpace: "nowrap",
  };
  const menuItem = {
    width: "100%",
    textAlign: "left",
    padding: "7px 12px",
    fontSize: "0.78rem",
    fontWeight: 600,
    border: "none",
    borderRadius: 8,
    background: "transparent",
    color: ui.textPrimary,
    cursor: "pointer",
    fontFamily: font,
  };

  return (
    <>
      <style>{`@keyframes wl-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            setMenu(null);
          }}
          style={{
            width: "min(1300px, 100%)",
            maxHeight: "88vh",
            display: "flex",
            flexDirection: "column",
            background: ui.cardBg,
            border: `1px solid ${line}`,
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            fontFamily: font,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "14px 18px",
              borderBottom: `1px solid ${line}`,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: ui.textPrimary,
                }}
              >
                {target.title}
              </div>
              <div style={{ fontSize: "0.72rem", color: ui.textMuted }}>
                {loading
                  ? "Loading…"
                  : `${total.toLocaleString()} record(s)${filtersActive ? " (filtered)" : ""}`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                name="dtn-search"
                autoComplete="off"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search DTN…"
                style={field}
              />
              <button
                onClick={handleExport}
                disabled={exporting || loading || total === 0}
                style={btn(exporting || loading || total === 0)}
                title="Export filtered records to Excel"
              >
                ⬇ {exporting ? "Exporting…" : "Export Excel"}
              </button>
              <button onClick={onClose} style={btn(false)} title="Close (Esc)">
                ✕
              </button>
            </div>
          </div>

          {/* Status chips + Doc type */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "10px 18px",
              borderBottom: `1px solid ${line}`,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  setStatusFilter("All");
                  setPage(1);
                }}
                style={chip(statusFilter === "All", FB)}
              >
                All <b>{statusAll.toLocaleString()}</b>
              </button>
              {statusOptions.map((s) => {
                const color = statusColor(s.key);
                return (
                  <button
                    key={s.key}
                    onClick={() => {
                      setStatusFilter(statusFilter === s.key ? "All" : s.key);
                      setPage(1);
                    }}
                    style={chip(statusFilter === s.key, color)}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: color,
                      }}
                    />
                    {facetLabel(s.key, "No Status")}{" "}
                    <b>{s.count.toLocaleString()}</b>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={label}>Doc Type</span>
              <select
                value={docFilter}
                onChange={(e) => {
                  setDocFilter(e.target.value);
                  setPage(1);
                }}
                style={{ ...field, maxWidth: 220 }}
              >
                <option value="All">All</option>
                {docOptions.map((d) => (
                  <option key={d.key} value={d.key}>
                    {facetLabel(d.key, "No Doc Type")} (
                    {d.count.toLocaleString()})
                  </option>
                ))}
              </select>
              {filtersActive && (
                <button onClick={clearFilters} style={btn(false)}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Date ranges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "10px 18px",
              borderBottom: `1px solid ${line}`,
              flexWrap: "wrap",
            }}
          >
            {[
              ["Date Received", recFrom, recTo, setRecFrom, setRecTo],
              ["Date Released", relFrom, relTo, setRelFrom, setRelTo],
            ].map(([l, from, to, setFrom, setTo]) => {
              const bad = from && to && from > to;
              const st = {
                ...field,
                border: `1px solid ${bad ? "#e02020" : line}`,
              };
              return (
                <div
                  key={l}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <span style={label}>{l}</span>
                  <input
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      setPage(1);
                    }}
                    style={st}
                  />
                  <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
                    to
                  </span>
                  <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setPage(1);
                    }}
                    style={st}
                  />
                  {bad && (
                    <span style={{ fontSize: "0.68rem", color: "#e02020" }}>
                      "From" is after "To"
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Table */}
          <div
            style={{
              position: "relative",
              flex: 1,
              minHeight: 240,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {loading && rows.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: darkMode
                    ? "rgba(0,0,0,0.35)"
                    : "rgba(255,255,255,0.55)",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 16px",
                    borderRadius: 10,
                    background: ui.cardBg,
                    border: `1px solid ${line}`,
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: ui.textPrimary,
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      border: `2px solid ${FB}`,
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "wl-spin 0.7s linear infinite",
                      display: "inline-block",
                    }}
                  />
                  Loading records…
                </div>
              </div>
            )}

            <div style={{ overflow: "auto", flex: 1 }}>
              {loading && rows.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: ui.textMuted,
                    fontSize: "0.85rem",
                  }}
                >
                  Loading…
                </div>
              ) : error ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: "#e02020",
                    fontSize: "0.85rem",
                  }}
                >
                  {error}
                </div>
              ) : rows.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: ui.textMuted,
                    fontSize: "0.85rem",
                  }}
                >
                  No records found
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "center" }}>#</th>
                      <th style={th}>DTN</th>
                      <th style={th}>Evaluator</th>
                      <th style={th}>Step</th>
                      <th style={th}>Entry Type</th>
                      <th style={th}>Date Decked</th>
                      <th style={th}>Date Completed</th>
                      <th style={th}>Date Received (Center)</th>
                      <th style={th}>Date Released</th>
                      <th style={th}>Type of Doc Released</th>
                      <th style={th}>Status</th>
                      <th style={th}>Brand Name</th>
                      <th style={th}>Generic Name</th>
                      <th
                        style={{
                          ...th,
                          right: 0,
                          zIndex: 3,
                          textAlign: "center",
                          boxShadow: "-6px 0 8px -6px rgba(0,0,0,0.35)",
                        }}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={`${r.db_id}-${r.step}-${i}`}>
                        <td
                          style={{
                            ...td,
                            textAlign: "center",
                            color: ui.textMuted,
                          }}
                        >
                          {(page - 1) * PAGE_SIZE + i + 1}
                        </td>
                        <td style={td}>
                          {r.dtn ? (
                            <span
                              onClick={() => setDoctrackRow(r)}
                              title="View document tracking"
                              style={{
                                cursor: "pointer",
                                color: FB,
                                textDecoration: "underline dotted",
                                textUnderlineOffset: 3,
                              }}
                            >
                              {r.dtn}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={td}>{r.evaluator ?? "—"}</td>
                        <td style={td}>{prettyStep(r.step)}</td>
                        <td style={td}>{r.entry_type ?? "—"}</td>
                        <td style={td}>{r.decked_at ?? "—"}</td>
                        <td style={td}>{r.completed_at ?? "—"}</td>
                        <td style={td}>{r.date_received_cent ?? "—"}</td>
                        <td style={td}>{r.date_released ?? "—"}</td>
                        <td style={td}>{r.type_doc_released ?? "—"}</td>
                        <td style={td}>
                          {r.app_status ? (
                            <span
                              style={{
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 99,
                                color: statusColor(r.app_status),
                                background: `${statusColor(r.app_status)}22`,
                              }}
                            >
                              {r.app_status}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={td}>{r.brand_name ?? "—"}</td>
                        <td style={td}>{r.generic_name ?? "—"}</td>
                        <td
                          style={{
                            ...td,
                            position: "sticky",
                            right: 0,
                            zIndex: 2,
                            textAlign: "center",
                            background: ui.cardBg,
                            boxShadow: "-6px 0 8px -6px rgba(0,0,0,0.35)",
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              setMenu({
                                row: r,
                                top: rect.bottom + 4,
                                right: window.innerWidth - rect.right,
                              });
                            }}
                            style={{ ...btn(false), padding: "3px 10px" }}
                          >
                            Actions ▾
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 18px",
              borderTop: `1px solid ${line}`,
            }}
          >
            <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
              {start}–{end} of {total.toLocaleString()}
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                style={btn(page === 1 || loading)}
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                ‹ Prev
              </button>
              <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
                Page {page} / {totalPages}
              </span>
              <button
                style={btn(page >= totalPages || loading)}
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Actions dropdown */}
      {menu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: menu.top,
            right: menu.right,
            zIndex: 1100,
            minWidth: 190,
            background: ui.cardBg,
            border: `1px solid ${line}`,
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
            padding: 4,
            fontFamily: font,
          }}
        >
          {[
            ["👁 View Details", (row) => openDetails(row)],
            ["📋 View Application Logs", (row) => setLogsRow(row)],
          ].map(([text, fn]) => (
            <button
              key={text}
              onClick={() => {
                const row = menu.row;
                setMenu(null);
                fn(row);
              }}
              style={menuItem}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = darkMode
                  ? "rgba(255,255,255,0.07)"
                  : "rgba(0,0,0,0.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {text}
            </button>
          ))}
        </div>
      )}

      {doctrackRow && (
        <DoctrackModal
          record={{ dtn: doctrackRow.dtn }}
          onClose={() => setDoctrackRow(null)}
          colors={colors}
        />
      )}
      {logsRow && (
        <ApplicationLogsModal
          record={{ dtn: logsRow.dtn, mainDbId: logsRow.db_id }}
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
    </>
  );
}
