// src/components/monitoring/analytics/DrugDetailModal.jsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import {
  getAnalyticsDrugDetail,
  getAnalyticsDrugRecords,
  getAnalyticsDrugTimeline,
} from "../../../api/analytics.js";
import { getUploadReports } from "../../../api/reports.js";
import { mapDataItem } from "../../reports/utils.js";
import DoctrackModal from "../../reports/actions/DoctrackModal.jsx";
import ViewDetailsModal from "../../reports/actions/ViewDetailsModal.jsx";
import ApplicationLogsModal from "../../tasks/ApplicationLogsModal.jsx";
import { FB } from "./analyticsConstants.jsx";
import { neuCardBg, neuShadow } from "./analyticsHelpers.jsx";

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const NONE_KEY = "__NONE__";
const PAGE_SIZE = 50;
const GREEN = "#36a420";
const AMBER = "#f59e0b";
const RED = "#e02020";
const TEAL = "#0891b2";
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DOC_COLORS = {
  CPR: GREEN,
  LOD: RED,
  GLE: TEAL,
  CERT: "#9333ea",
  COPP: AMBER,
  CFS: "#e87c13",
};
const docColor = (k) => (k === NONE_KEY ? "#9ca3af" : (DOC_COLORS[k] ?? FB));

const statusColor = (status) => {
  const s = String(status ?? "")
    .toUpperCase()
    .replace(/[\s_-]+/g, " ")
    .trim();
  if (s === "COMPLETED") return GREEN;
  if (s === "ON PROCESS" || s === "IN PROGRESS") return AMBER;
  return "#9ca3af";
};

const facetLabel = (key, noneLabel) => (key === NONE_KEY ? noneLabel : key);
const pad2 = (n) => String(n).padStart(2, "0");

// ── Side panel: summary tiles, doc type breakdown, timeline ──
function DrugSidePanel({
  summary,
  docCounts,
  docFilter,
  onDocClick,
  trend,
  ui,
  darkMode,
  line,
}) {
  const {
    data,
    noDate,
    loading,
    mode,
    onModeChange,
    basis,
    onBasisChange,
    year,
    onYearChange,
    years,
    month,
    onMonthChange,
    activeKey,
    onBarClick,
  } = trend;

  const BAR_AREA = 170;
  const total = data.reduce((s, d) => s + d.count, 0);
  const max = Math.max(...data.map((d) => d.count), 1);
  const peak = data.reduce((p, d) => (d.count > (p?.count ?? 0) ? d : p), null);
  const docTotal = docCounts.reduce((s, d) => s + d.count, 0);
  const compact = (n) =>
    n >= 10000
      ? `${Math.round(n / 1000)}k`
      : n >= 1000
        ? `${(n / 1000).toFixed(1)}k`
        : String(n);
  const heading =
    mode === "year"
      ? "Per Year"
      : mode === "month"
        ? `Per Month · ${year}`
        : `Per Day · ${MONTH_SHORT[(month ?? 1) - 1]} ${year}`;

  const sectionTitle = {
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
  };
  const hint = { fontSize: "0.68rem", color: ui.textMuted, marginTop: 2 };
  const group = {
    display: "flex",
    background: neuCardBg(darkMode),
    borderRadius: 10,
    padding: 3,
    gap: 2,
    boxShadow: neuShadow(darkMode, false),
  };
  const seg = (active) => ({
    padding: "4px 10px",
    fontSize: "0.68rem",
    fontWeight: active ? 700 : 500,
    borderRadius: 8,
    border: "none",
    background: neuCardBg(darkMode),
    color: active ? FB : ui.textMuted,
    cursor: "pointer",
    fontFamily: font,
    boxShadow: active ? neuShadow(darkMode, false) : "none",
    transition: "all 0.18s",
  });
  const selSt = {
    background: neuCardBg(darkMode),
    border: `1px solid ${line}`,
    borderRadius: 8,
    padding: "4px 8px",
    fontSize: "0.72rem",
    color: ui.textPrimary,
    outline: "none",
    fontFamily: font,
    colorScheme: darkMode ? "dark" : "light",
  };

  const kpis = summary
    ? [
        { label: "Total", value: summary.total, color: FB },
        { label: "Completed", value: summary.completed, color: TEAL },
        { label: "In Progress", value: summary.in_progress, color: AMBER },
        { label: "CPR", value: summary.cpr, color: GREEN },
        { label: "LOD", value: summary.lod, color: RED },
        {
          label: "CPR Rate",
          value: `${summary.rate}%`,
          color: summary.rate >= 60 ? GREEN : AMBER,
        },
      ]
    : [];

  return (
    <div
      style={{
        width: 400,
        flexShrink: 0,
        borderLeft: `1px solid ${line}`,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 16,
        overflowY: "auto",
        fontFamily: font,
      }}
    >
      {/* Summary tiles */}
      {kpis.length > 0 && (
        <div>
          <div style={sectionTitle}>📈 Overview</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              marginTop: 8,
            }}
          >
            {kpis.map((k) => (
              <div
                key={k.label}
                style={{
                  padding: "7px 10px 8px",
                  borderRadius: 10,
                  background: neuCardBg(darkMode),
                  boxShadow: neuShadow(darkMode),
                  borderTop: `2px solid ${k.color}`,
                }}
              >
                <div
                  style={{
                    fontSize: "0.56rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: ui.textMuted,
                  }}
                >
                  {k.label}
                </div>
                <div
                  style={{
                    fontSize: "1rem",
                    fontWeight: 800,
                    color: k.color,
                    lineHeight: 1.3,
                  }}
                >
                  {typeof k.value === "number"
                    ? k.value.toLocaleString()
                    : k.value}
                </div>
              </div>
            ))}
          </div>
          {(summary.first_received || summary.last_received) && (
            <div style={{ ...hint, marginTop: 8 }}>
              Received {summary.first_received?.slice(0, 10) ?? "—"} →{" "}
              {summary.last_received?.slice(0, 10) ?? "—"}
            </div>
          )}
        </div>
      )}

      <div style={{ borderTop: `1px solid ${line}` }} />

      {/* Doc type breakdown */}
      <div>
        <div style={sectionTitle}>🗂 By Document Type</div>
        <div style={{ ...hint, marginBottom: 8 }}>
          Click a row to filter the table
        </div>
        {docCounts.length === 0 ? (
          <div style={{ fontSize: "0.75rem", color: ui.textMuted }}>
            No data
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {docCounts.map((d) => {
              const c = docColor(d.key);
              const p = docTotal > 0 ? (d.count / docTotal) * 100 : 0;
              const active = docFilter === d.key;
              return (
                <div
                  key={d.key}
                  onClick={() => onDocClick(d.key)}
                  title="Click to filter the table"
                  style={{
                    padding: "6px 8px",
                    borderRadius: 8,
                    cursor: "pointer",
                    border: `1px solid ${active ? c : "transparent"}`,
                    background: active
                      ? `${c}18`
                      : darkMode
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(0,0,0,0.025)",
                    opacity: docFilter !== "All" && !active ? 0.5 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 3,
                        background: c,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: "0.74rem",
                        fontWeight: active ? 800 : 600,
                        color: ui.textPrimary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {facetLabel(d.key, "No Doc Type")}
                    </span>
                    <span
                      style={{ fontSize: "0.74rem", fontWeight: 800, color: c }}
                    >
                      {d.count.toLocaleString()}
                    </span>
                    <span
                      style={{
                        fontSize: "0.66rem",
                        color: ui.textMuted,
                        minWidth: 38,
                        textAlign: "right",
                      }}
                    >
                      {p.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 3,
                      borderRadius: 99,
                      marginTop: 5,
                      overflow: "hidden",
                      background: darkMode
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.07)",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(p, 0.8)}%`,
                        height: "100%",
                        background: c,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${line}` }} />

      {/* Timeline */}
      <div>
        <div style={sectionTitle}>📊 {heading}</div>
        <div style={hint}>Click a bar to filter the table</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={group}>
          {[
            ["year", "Per Year"],
            ["month", "Per Month"],
            ["day", "Per Day"],
          ].map(([m, label]) => (
            <button
              key={m}
              style={seg(mode === m)}
              onClick={() => onModeChange(m)}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={group}>
          <button
            style={seg(basis === "received")}
            onClick={() => onBasisChange("received")}
          >
            By Received
          </button>
          <button
            style={seg(basis === "released")}
            onClick={() => onBasisChange("released")}
          >
            By Released
          </button>
        </div>
        {mode !== "year" && (
          <select
            value={year ?? ""}
            onChange={(e) => onYearChange(Number(e.target.value))}
            style={selSt}
          >
            {[...new Set([...years, year].filter(Boolean))]
              .sort((a, b) => b - a)
              .map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
          </select>
        )}
        {mode === "day" && (
          <select
            value={month ?? 1}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            style={selSt}
          >
            {MONTH_SHORT.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {[
          { label: "In chart", value: total.toLocaleString() },
          {
            label: "Peak",
            value: peak
              ? `${peak.label} · ${peak.count.toLocaleString()}`
              : "—",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 10,
              background: neuCardBg(darkMode),
              boxShadow: neuShadow(darkMode),
            }}
          >
            <div
              style={{
                fontSize: "0.58rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: ui.textMuted,
              }}
            >
              {s.label}
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 800, color: FB }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          minHeight: BAR_AREA + 40,
          opacity: loading ? 0.45 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {data.length === 0 || total === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: ui.textMuted,
              fontSize: "0.8rem",
              padding: "60px 0",
            }}
          >
            {loading ? "Loading…" : "No dated records to chart"}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: mode === "year" ? 8 : mode === "month" ? 4 : 2,
              height: BAR_AREA + 40,
              borderBottom: `1px solid ${line}`,
            }}
          >
            {data.map((d) => {
              const h =
                d.count > 0 ? Math.max((d.count / max) * BAR_AREA, 4) : 0;
              const isActive = activeKey === d.key;
              const dim = activeKey != null && !isActive;
              const showLabel =
                mode !== "day" || d.key === 1 || d.key % 5 === 0;
              return (
                <div
                  key={d.key}
                  onClick={() => d.count > 0 && onBarClick(d)}
                  title={`${d.label}: ${d.count.toLocaleString()}`}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    cursor: d.count > 0 ? "pointer" : "default",
                    opacity: dim ? 0.35 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      color: isActive ? FB : ui.textMuted,
                      marginBottom: 3,
                    }}
                  >
                    {mode !== "day" && d.count > 0 ? compact(d.count) : ""}
                  </span>
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 44,
                      height: h,
                      borderRadius: "6px 6px 0 0",
                      background: `linear-gradient(180deg, ${FB}, ${FB}aa)`,
                      outline: isActive ? `2px solid ${FB}` : "none",
                      outlineOffset: 1,
                      transition: "height 0.3s ease",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? FB : ui.textMuted,
                      padding: "5px 0 4px",
                      minHeight: 22,
                    }}
                  >
                    {showLabel ? d.label : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {noDate > 0 && (
        <div style={{ fontSize: "0.7rem", color: ui.textMuted }}>
          ⚠ {noDate.toLocaleString()} record(s) have no valid{" "}
          {basis === "received" ? "Date Received" : "Date Released"} and are not
          in the chart.
        </div>
      )}
    </div>
  );
}

export default function DrugDetailModal({
  drug,
  scope,
  ui,
  darkMode,
  onClose,
}) {
  const { year = "All", month = "All", prescription = "All" } = scope ?? {};
  const line = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";

  // ── Table state ──
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  const [exporting, setExporting] = useState(false);

  // ── Row actions ──
  const [menu, setMenu] = useState(null);
  const [doctrackRow, setDoctrackRow] = useState(null);
  const [logsRow, setLogsRow] = useState(null);
  const [detailRecord, setDetailRecord] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const subOpenRef = useRef(false);
  subOpenRef.current = !!(doctrackRow || logsRow || detailRecord);

  // ── Summary tiles ──
  const [summary, setSummary] = useState(null);

  // ── Timeline ──
  const [trendMode, setTrendMode] = useState("year");
  const [trendBasis, setTrendBasis] = useState("received");
  const [trendYear, setTrendYear] = useState(null);
  const [trendMonth, setTrendMonth] = useState(null);
  const [trendYears, setTrendYears] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [trendNoDate, setTrendNoDate] = useState(0);
  const [trendLoading, setTrendLoading] = useState(false);

  // Summary (once per drug / scope)
  useEffect(() => {
    let cancelled = false;
    getAnalyticsDrugDetail({ name: drug.name, year, month, prescription })
      .then((res) => !cancelled && setSummary(res.summary ?? null))
      .catch((err) => console.error("Drug detail fetch error:", err));
    return () => {
      cancelled = true;
    };
  }, [drug.name, year, month, prescription]);

  // Debounce DTN search
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const requestRecords = (pageNum, pageSize) =>
    getAnalyticsDrugRecords({
      name: drug.name,
      year,
      month,
      prescription,
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

  // Records table
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
        console.error("Drug records fetch error:", err);
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
    drug.name,
    year,
    month,
    prescription,
    page,
    query,
    statusFilter,
    docFilter,
    recFrom,
    recTo,
    relFrom,
    relTo,
  ]);

  // Timeline follows search / status / doc type, but NOT the date ranges
  // (a bar click sets the date range, which would otherwise collapse the chart)
  const requestTrend = (extra) =>
    getAnalyticsDrugTimeline({
      name: drug.name,
      year,
      month,
      prescription,
      basis: trendBasis,
      search: query || undefined,
      status: statusFilter === "All" ? undefined : statusFilter,
      doc_type: docFilter === "All" ? undefined : docFilter,
      ...extra,
    });

  useEffect(() => {
    if (trendMode !== "year" && !trendYear) return;
    if (trendMode === "day" && !trendMonth) return;
    let cancelled = false;
    (async () => {
      setTrendLoading(true);
      try {
        const res = await requestTrend({
          group_by: trendMode,
          bucket_year: trendMode !== "year" ? trendYear : undefined,
          bucket_month: trendMode === "day" ? trendMonth : undefined,
        });
        if (cancelled) return;
        setTrendData(res.data ?? []);
        setTrendNoDate(res.no_date ?? 0);
        if (trendMode === "year")
          setTrendYears((res.data ?? []).map((d) => d.key));
      } catch (err) {
        console.error("Drug timeline fetch error:", err);
        if (!cancelled) setTrendData([]);
      } finally {
        if (!cancelled) setTrendLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    drug.name,
    year,
    month,
    prescription,
    trendMode,
    trendYear,
    trendMonth,
    trendBasis,
    query,
    statusFilter,
    docFilter,
  ]);

  const switchTrendMode = (m) => {
    setTrendMode(m);
    const yr =
      trendYear ??
      trendYears[trendYears.length - 1] ??
      new Date().getFullYear();
    if (m !== "year" && !trendYear) setTrendYear(yr);
    if (m === "day" && !trendMonth) {
      const now = new Date();
      setTrendMonth(yr === now.getFullYear() ? now.getMonth() + 1 : 1);
    }
  };

  const periodRange = (key) => {
    if (trendMode === "year") return [`${key}-01-01`, `${key}-12-31`];
    if (trendMode === "month") {
      const last = new Date(trendYear, key, 0).getDate();
      return [
        `${trendYear}-${pad2(key)}-01`,
        `${trendYear}-${pad2(key)}-${pad2(last)}`,
      ];
    }
    const day = `${trendYear}-${pad2(trendMonth)}-${pad2(key)}`;
    return [day, day];
  };
  const activeTrendKey = (() => {
    const [from, to] =
      trendBasis === "received" ? [recFrom, recTo] : [relFrom, relTo];
    if (!from || !to) return null;
    const hit = trendData.find((d) => {
      const [a, b] = periodRange(d.key);
      return a === from && b === to;
    });
    return hit ? hit.key : null;
  })();
  const handleTrendBar = (d) => {
    const [a, b] = periodRange(d.key);
    const [setF, setT] =
      trendBasis === "received"
        ? [setRecFrom, setRecTo]
        : [setRelFrom, setRelTo];
    if (activeTrendKey === d.key) {
      setF("");
      setT("");
    } else {
      setF(a);
      setT(b);
    }
    setPage(1);
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !subOpenRef.current && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Load the FULL record (same shape the Records page uses)
  const fetchFullRecord = async (r) => {
    if (!r.dtn)
      throw new Error("This record has no DTN, so it cannot be loaded.");
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
    if (!match) throw new Error("Full record not found.");
    return match;
  };

  const openDetails = async (r) => {
    setDetailRecord({
      dtn: r.dtn,
      entryType: r.entry_type,
      dateReceivedCent: r.date_received_cent,
      dateReleased: r.date_released,
      typeDocReleased: r.type_doc_released,
      appStatus: r.app_status,
      prodBrName: r.brand_name,
      prodGenName: r.generic_name,
    });
    setDetailLoading(true);
    try {
      setDetailRecord(await fetchFullRecord(r));
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
      const pages = Math.ceil(total / size);
      let all = [];
      for (let p = 1; p <= pages; p++) {
        const res = await requestRecords(p, size);
        all = all.concat(res.data ?? []);
      }
      const header = [
        "DTN",
        "Entry Type",
        "Date Received (Center)",
        "Date Released",
        "Type of Doc Released",
        "Status",
        "Generic Name",
      ];
      const body = all.map((r) => [
        r.dtn ? String(r.dtn) : "",
        r.entry_type ?? "",
        r.date_received_cent ?? "",
        r.date_released ?? "",
        r.type_doc_released ?? "",
        r.app_status ?? "",
        r.generic_name ?? "",
      ]);
      const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
      ws["!cols"] = header.map((h) => ({ wch: Math.max(14, h.length + 2) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Records");
      const safe = String(drug.name)
        .replace(/[\\/:*?"<>|·—]+/g, "-")
        .replace(/\s+/g, "_")
        .slice(0, 60);
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

  const colors = {
    cardBg: neuCardBg(darkMode),
    cardBorder: line,
    tableBg: darkMode ? "#222222" : "#f7f8fa",
    tableRowHover: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
    inputBg: darkMode ? "#222222" : "#f7f8fa",
    badgeBg: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    textPrimary: ui.textPrimary,
    textSecondary: ui.textSub ?? ui.textPrimary,
    textTertiary: ui.textMuted,
  };

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const filtersActive =
    statusFilter !== "All" ||
    docFilter !== "All" ||
    query !== "" ||
    !!(recFrom || recTo || relFrom || relTo);
  const rangeInvalid = (a, b) => a && b && a > b;

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

  // ── Styles ──
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
    background: neuCardBg(darkMode),
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
  const pageBtn = (disabled) => ({
    padding: "4px 12px",
    fontSize: "0.75rem",
    borderRadius: 8,
    border: "none",
    background: neuCardBg(darkMode),
    color: ui.textPrimary,
    boxShadow: neuShadow(darkMode, true),
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
    transition: "all 0.15s",
  });
  const selectSt = {
    background: neuCardBg(darkMode),
    border: `1px solid ${line}`,
    borderRadius: 8,
    padding: "5px 10px",
    fontSize: "0.75rem",
    color: ui.textPrimary,
    outline: "none",
    fontFamily: font,
    colorScheme: darkMode ? "dark" : "light",
    maxWidth: 220,
  };
  const labelSt = {
    fontSize: "0.65rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
  };
  const menuBtn = {
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
  const menuHover = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";

  return (
    <>
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
            width: "min(1560px, 100%)",
            maxHeight: "88vh",
            display: "flex",
            flexDirection: "column",
            background: neuCardBg(darkMode),
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
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: ui.textPrimary,
                }}
              >
                💊 {drug.name}
                {drug.generic ? (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: ui.textMuted,
                    }}
                  >
                    {drug.generic}
                  </span>
                ) : null}
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
                name="drug-dtn-search"
                autoComplete="off"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search DTN…"
                style={{
                  background: neuCardBg(darkMode),
                  border: `1px solid ${line}`,
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: "0.78rem",
                  color: ui.textPrimary,
                  outline: "none",
                  fontFamily: font,
                  colorScheme: darkMode ? "dark" : "light",
                }}
              />
              <button
                onClick={handleExport}
                disabled={exporting || loading || total === 0}
                title="Export filtered records to Excel"
                style={{
                  ...pageBtn(exporting || loading || total === 0),
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span>⬇</span>
                <span>{exporting ? "Exporting…" : "Export Excel"}</span>
              </button>
              <button
                onClick={onClose}
                title="Close (Esc)"
                style={{
                  ...pageBtn(false),
                  fontSize: "0.9rem",
                  padding: "4px 10px",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body: table column + side panel */}
          <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              {/* Status chips + doc type */}
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
                          setStatusFilter(
                            statusFilter === s.key ? "All" : s.key,
                          );
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
                  <span style={labelSt}>Doc Type</span>
                  <select
                    value={docFilter}
                    onChange={(e) => {
                      setDocFilter(e.target.value);
                      setPage(1);
                    }}
                    style={selectSt}
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
                    <button
                      onClick={clearFilters}
                      style={{ ...pageBtn(false), fontSize: "0.7rem" }}
                    >
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
                  {
                    label: "Date Received",
                    from: recFrom,
                    to: recTo,
                    setFrom: setRecFrom,
                    setTo: setRecTo,
                  },
                  {
                    label: "Date Released",
                    from: relFrom,
                    to: relTo,
                    setFrom: setRelFrom,
                    setTo: setRelTo,
                  },
                ].map((f) => {
                  const bad = rangeInvalid(f.from, f.to);
                  const st = {
                    ...selectSt,
                    border: `1px solid ${bad ? RED : line}`,
                  };
                  return (
                    <div
                      key={f.label}
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={labelSt}>{f.label}</span>
                      <input
                        type="date"
                        value={f.from}
                        max={f.to || undefined}
                        onChange={(e) => {
                          f.setFrom(e.target.value);
                          setPage(1);
                        }}
                        style={st}
                      />
                      <span
                        style={{ fontSize: "0.72rem", color: ui.textMuted }}
                      >
                        to
                      </span>
                      <input
                        type="date"
                        value={f.to}
                        min={f.from || undefined}
                        onChange={(e) => {
                          f.setTo(e.target.value);
                          setPage(1);
                        }}
                        style={st}
                      />
                      {bad && (
                        <span style={{ fontSize: "0.68rem", color: RED }}>
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
                        background: neuCardBg(darkMode),
                        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
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
                          animation: "spin 0.7s linear infinite",
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
                        color: ui.textMuted,
                        fontSize: "0.85rem",
                      }}
                    >
                      {error}
                    </div>
                  ) : !loading && rows.length === 0 ? (
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
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "0.8rem",
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={{ ...th, textAlign: "center" }}>#</th>
                          <th style={th}>DTN</th>
                          <th style={th}>Entry Type</th>
                          <th style={th}>Date Received (Center)</th>
                          <th style={th}>Date Released</th>
                          <th style={th}>Type of Doc Released</th>
                          <th style={th}>Status</th>
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
                          <tr key={r.db_id}>
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
                            <td style={td}>{r.entry_type ?? "—"}</td>
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
                            <td style={td}>{r.generic_name ?? "—"}</td>
                            <td
                              style={{
                                ...td,
                                position: "sticky",
                                right: 0,
                                zIndex: 2,
                                textAlign: "center",
                                background: neuCardBg(darkMode),
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
                                style={{
                                  ...pageBtn(false),
                                  padding: "3px 10px",
                                }}
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

              {/* Pagination */}
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
                    style={pageBtn(page === 1 || loading)}
                    disabled={page === 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ‹ Prev
                  </button>
                  <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
                    Page {page} / {totalPages}
                  </span>
                  <button
                    style={pageBtn(page >= totalPages || loading)}
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next ›
                  </button>
                </div>
              </div>
            </div>

            <DrugSidePanel
              summary={summary}
              docCounts={docCounts}
              docFilter={docFilter}
              onDocClick={(k) => {
                setDocFilter(docFilter === k ? "All" : k);
                setPage(1);
              }}
              trend={{
                data: trendData,
                noDate: trendNoDate,
                loading: trendLoading,
                mode: trendMode,
                onModeChange: switchTrendMode,
                basis: trendBasis,
                onBasisChange: setTrendBasis,
                year: trendYear,
                onYearChange: setTrendYear,
                years: trendYears,
                month: trendMonth,
                onMonthChange: setTrendMonth,
                activeKey: activeTrendKey,
                onBarClick: handleTrendBar,
              }}
              ui={ui}
              darkMode={darkMode}
              line={line}
            />
          </div>
        </div>
      </div>

      {/* Actions dropdown */}
      {menu &&
        createPortal(
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: menu.top,
              right: menu.right,
              zIndex: 1100,
              minWidth: 170,
              background: neuCardBg(darkMode),
              border: `1px solid ${line}`,
              borderRadius: 10,
              boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
              padding: 4,
              fontFamily: font,
            }}
          >
            {[
              { label: "👁 View Details", run: (r) => openDetails(r) },
              { label: "📋 View Application Logs", run: (r) => setLogsRow(r) },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => {
                  const row = menu.row;
                  setMenu(null);
                  a.run(row);
                }}
                style={menuBtn}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = menuHover)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {a.label}
              </button>
            ))}
          </div>,
          document.body,
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
      {detailRecord && (
        <ViewDetailsModal
          record={detailRecord}
          loading={detailLoading}
          onClose={() => setDetailRecord(null)}
          colors={colors}
          darkMode={darkMode}
        />
      )}
    </>
  );
}
