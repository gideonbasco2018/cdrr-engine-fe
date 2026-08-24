// src/components/gmp/dashboard/ApplicationMonitoringTable.jsx
// Live, per-application monitor for the GMP analytics view — a searchable,
// filterable list of individual records (as opposed to the aggregate charts
// elsewhere on the page), so a reviewer can see which specific applications
// are sitting where right now.
import { useState, useEffect, useRef } from "react";
import { getGMPRecords } from "../../../api/gmp";
import { GMP_STEP_MAP, GMP_STATUS_COLORS } from "../shared/constants";
import ApplicationScatterPlot from "./ApplicationScatterPlot";

const TERMINAL_STATUSES = new Set(["COMPLETED", "DISAPPROVED"]);
const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  "All",
  "ON PROCESS",
  "FOR DECKING",
  "DECKED",
  "PENDING",
  "COMPLETED",
  "DISAPPROVED",
];

function selectStyle(ui) {
  return {
    background: ui.inputBg,
    color: ui.textPrimary,
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: "0.78rem",
    outline: "none",
  };
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr);
  if (Number.isNaN(then.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / 86_400_000));
}

function StatusBadge({ status }) {
  const { bg, color } = GMP_STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: "0.68rem",
        fontWeight: 700,
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {status || "—"}
    </span>
  );
}

function StepBadge({ step }) {
  if (!step) {
    return <span style={{ fontSize: "0.74rem", color: "#9ca3af" }}>Not decked</span>;
  }
  const meta = GMP_STEP_MAP[step];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.74rem", color: meta?.color || "inherit", fontWeight: 600 }}>
      {meta?.icon && <span>{meta.icon}</span>}
      {meta?.label || step}
    </span>
  );
}

export default function ApplicationMonitoringTable({ ui, darkMode }) {
  const [view, setView] = useState("table"); // "table" | "plot"
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);

  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const searchTimer = useRef(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  useEffect(() => setPage(1), [status]);

  useEffect(() => {
    if (view !== "table") return;
    setLoading(true);
    setError(null);
    getGMPRecords({
      page,
      page_size: PAGE_SIZE,
      search: debouncedSearch || undefined,
      app_status: status !== "All" ? status : undefined,
      sort_by: "GMP_DATE_RECEIVED",
      sort_order: "desc",
    })
      .then((res) => {
        setRecords(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
      })
      .catch(() => setError("Failed to load applications. Please try again."))
      .finally(() => setLoading(false));
  }, [view, page, debouncedSearch, status]);

  const thStyle = {
    textAlign: "left",
    padding: "8px 10px",
    fontSize: "0.7rem",
    fontWeight: 700,
    color: ui.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    borderBottom: `1px solid ${ui.cardBorder}`,
    whiteSpace: "nowrap",
  };
  const tdStyle = {
    padding: "9px 10px",
    fontSize: "0.78rem",
    color: ui.textPrimary,
    borderBottom: `1px solid ${ui.cardBorder}`,
    verticalAlign: "middle",
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: "1 1 auto" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search DTN or establishment…"
            style={{ ...selectStyle(ui), flex: "1 1 200px", minWidth: 180 }}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle(ui)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === "All" ? "All statuses" : s}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "inline-flex", border: `1px solid ${ui.cardBorder}`, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
          {[{ key: "table", label: "Table" }, { key: "plot", label: "Plot" }].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setView(opt.key)}
              style={{
                border: "none",
                cursor: "pointer",
                padding: "6px 14px",
                fontSize: "0.78rem",
                fontWeight: view === opt.key ? 700 : 500,
                color: view === opt.key ? "#fff" : ui.textPrimary,
                background: view === opt.key ? "#1877F2" : ui.inputBg,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ color: "#ef4444", fontSize: "0.8rem", marginBottom: 10 }}>{error}</div>
      )}

      {view === "plot" ? (
        <ApplicationScatterPlot ui={ui} darkMode={darkMode} search={debouncedSearch} status={status} />
      ) : (
      <>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>DTN</th>
              <th style={thStyle}>Establishment</th>
              <th style={thStyle}>Current Step</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Evaluator</th>
              <th style={thStyle}>Received</th>
              <th style={thStyle}>Days Pending</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} style={tdStyle}>
                      <div style={{ height: 12, borderRadius: 4, background: ui.inputBg, opacity: 0.6 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: ui.textMuted, padding: "24px 10px" }}>
                  No applications match these filters
                </td>
              </tr>
            ) : (
              records.map((r) => {
                const pending = daysSince(r.GMP_DATE_RECEIVED);
                const terminal = TERMINAL_STATUSES.has(r.GMP_APP_STATUS);
                return (
                  <tr key={r.GMP_ID}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{r.GMP_DTN || "—"}</td>
                    <td style={{ ...tdStyle, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.GMP_LTO_COMPANY}>
                      {r.GMP_LTO_COMPANY || "—"}
                    </td>
                    <td style={tdStyle}><StepBadge step={r.GMP_CURRENT_STEP} /></td>
                    <td style={tdStyle}><StatusBadge status={r.GMP_APP_STATUS} /></td>
                    <td style={tdStyle}>{r.GMP_EVALUATOR || "—"}</td>
                    <td style={tdStyle}>{r.GMP_DATE_RECEIVED ? String(r.GMP_DATE_RECEIVED).slice(0, 10) : "—"}</td>
                    <td style={{ ...tdStyle, color: !terminal && pending != null && pending > 15 ? "#ef4444" : ui.textPrimary, fontWeight: !terminal && pending != null && pending > 15 ? 700 : 400 }}>
                      {terminal ? "—" : pending != null ? `${pending}d` : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, fontSize: "0.74rem", color: ui.textMuted }}>
        <span>{total.toLocaleString()} application{total === 1 ? "" : "s"}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ ...selectStyle(ui), cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1 }}
          >
            ‹ Prev
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{ ...selectStyle(ui), cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.5 : 1 }}
          >
            Next ›
          </button>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
