// FILE: src/pages/DashboardPage.jsx
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  getDashboardSummary,
  getDashboardChart,
  getDashboardRecentApplications,
  getDashboardDetail,
  getDashboardRecordByDtn,
  getDashboardAllRecentApplications,
} from "../api/dashboard";
import ApplicationLogsModal from "../components/tasks/ApplicationLogsModal";
import ViewDetailsModal from "../components/reports/actions/ViewDetailsModal";

const FB = "#1877F2";
const FB_LIGHT = "#E7F0FD";

function makeUI(dark) {
  return dark
    ? {
        pageBg: "#18191a",
        sidebarBg: "#141414",
        cardBg: "#242526",
        cardBorder: "#3a3b3c",
        inputBg: "#3a3b3c",
        textPrimary: "#e4e6ea",
        textSub: "#b0b3b8",
        textMuted: "#65676b",
        divider: "#3a3b3c",
        hoverBg: "#2d2e2f",
        activeNavBg: "#263951",
        gridLine: "#2d2e2f",
        metricBorder: "#3a3b3c",
        metricActiveBg: "#1c2e45",
        progressBg: "#3a3b3c",
        sidebarTitle: "#e4e6ea",
      }
    : {
        pageBg: "#f0f2f5",
        sidebarBg: "#ffffff",
        cardBg: "#ffffff",
        cardBorder: "#dddfe2",
        inputBg: "#f0f2f5",
        textPrimary: "#1c1e21",
        textSub: "#65676b",
        textMuted: "#8a8d91",
        divider: "#e4e6eb",
        hoverBg: "#f2f3f5",
        activeNavBg: FB_LIGHT,
        gridLine: "#e4e6eb",
        metricBorder: "#dddfe2",
        metricActiveBg: FB_LIGHT,
        progressBg: "#e4e6eb",
        sidebarTitle: "#1c1e21",
      };
}

const MONTH_NUM = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};
const ALL_MONTHS = [
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
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH_IDX = new Date().getMonth();

const MONTHS_BY_YEAR = {};
for (let y = 2022; y <= CURRENT_YEAR; y++) {
  MONTHS_BY_YEAR[y] =
    y < CURRENT_YEAR ? ALL_MONTHS : ALL_MONTHS.slice(0, CURRENT_MONTH_IDX + 1);
}

const AVAILABLE_YEARS = Array.from(
  { length: CURRENT_YEAR - 2022 + 1 },
  (_, i) => String(CURRENT_YEAR - i),
);

function buildChartParams(breakdown, selYear, selMonth) {
  if (breakdown === "year") return { breakdown: "year" };
  if (breakdown === "month") {
    return {
      breakdown: "month",
      date_from: `${selYear}-01-01`,
      date_to: `${selYear}-12-31`,
    };
  }
  const mn = MONTH_NUM[selMonth];
  const lastDay = new Date(parseInt(selYear), parseInt(mn), 0).getDate();
  return {
    breakdown: "day",
    date_from: `${selYear}-${mn}-01`,
    date_to: `${selYear}-${mn}-${String(lastDay).padStart(2, "0")}`,
  };
}

function mapPoint(pt) {
  return {
    label: pt.label,
    received: pt.received,
    completed: pt.completed,
    onProcess: pt.on_process,
    target: pt.target,
    completedRate: pt.completed_rate,
  };
}

const SERIES = [
  { key: "received", label: "Total Received", color: "#1877F2" },
  { key: "completed", label: "Completed", color: "#36a420" },
  { key: "onProcess", label: "On Process", color: "#f59e0b" },
  { key: "target", label: "Target", color: "#9333ea", dashed: true },
];

const TARGETS_WEEKLY = [
  {
    id: 1,
    icon: "👥",
    label: "Process Application",
    goal: 10,
    done: 3,
    deadline: "Mar 13, 2026",
    description: "Evaluate and process CPR applications assigned to you.",
    items: [
      { name: "20230908133701 – Furacef-750 (Cefuroxime Sodium)", done: true },
      { name: "20230908133702 – Amoxil-500 (Amoxicillin)", done: true },
      { name: "20230908133703 – Calpol-250 (Paracetamol)", done: true },
      { name: "20230908133704 – Cloxacil-250 (Cloxacillin)", done: false },
      { name: "20230908133705 – Augmentin-625 (Co-Amoxiclav)", done: false },
      { name: "20230908133706 – Mefenamic-500 (Mefenamic Acid)", done: false },
      {
        name: "20230908133707 – Losartan-50 (Losartan Potassium)",
        done: false,
      },
      {
        name: "20230908133708 – Amlodipine-10 (Amlodipine Besylate)",
        done: false,
      },
      { name: "20230908133709 – Metformin-500 (Metformin HCl)", done: false },
      {
        name: "20230908133710 – Atorvastatin-20 (Atorvastatin Calcium)",
        done: false,
      },
    ],
  },
];

const TODAY = new Date("2026-03-11T00:00:00");

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function formatDateRange(start, end) {
  if (!start && !end) return "";
  if (start && !end) return formatDateShort(start);
  if (!start && end) return `Until ${formatDateShort(end)}`;
  return `${formatDateShort(start)} – ${formatDateShort(end)}`;
}
function daysBetween(start, end) {
  if (!start || !end) return null;
  return Math.max(
    0,
    Math.round(
      (new Date(end + "T00:00:00") - new Date(start + "T00:00:00")) / 86400000,
    ),
  );
}
function daysUntil(end) {
  if (!end) return null;
  return Math.max(
    0,
    Math.round((new Date(end + "T00:00:00") - TODAY) / 86400000),
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────
function statusBadge(status, ui) {
  const s = (status || "").toUpperCase();
  if (s === "COMPLETED")
    return { color: "#36a420", bg: "#e9f7e6", label: "Completed" };
  if (s === "IN PROGRESS")
    return { color: "#f59e0b", bg: "#fff8e7", label: "In Progress" };
  return { color: ui.textMuted, bg: ui.pageBg, label: status || "—" };
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtDateTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function RecentApplicationsModal({ onClose, onRowClick, ui }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 15;

  const fetchPage = useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboardAllRecentApplications({
        page: p,
        page_size: PAGE_SIZE,
      });
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.total_pages);
      setPage(res.page ?? p);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to load");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(startRow + PAGE_SIZE - 1, total);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.52)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 14,
          width: "100%",
          maxWidth: 1100,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.28)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `${FB}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
              }}
            >
              📋
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: ui.textPrimary,
                }}
              >
                Recent Applications
              </h3>
              <p style={{ margin: 0, fontSize: "0.75rem", color: ui.textSub }}>
                {loading
                  ? "Loading…"
                  : `${total.toLocaleString()} total record${total !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: ui.inputBg,
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 8,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: ui.textMuted,
              fontSize: "1rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* Table body */}
        <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
          {loading && (
            <div
              style={{
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 48,
                    borderRadius: 8,
                    background: ui.progressBg,
                    animation: "cdrrPulse 1.2s ease-in-out infinite",
                    animationDelay: `${i * 0.07}s`,
                  }}
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "#e02020",
                fontSize: "0.84rem",
              }}
            >
              ⚠️ {error}&nbsp;
              <button
                onClick={() => fetchPage(page)}
                style={{
                  background: "none",
                  border: "none",
                  color: FB,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.84rem",
                  fontFamily: "inherit",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && data.length === 0 && (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.84rem",
              }}
            >
              No records found.
            </div>
          )}

          {!loading && !error && data.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.8rem",
                  fontFamily: "inherit",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: ui.pageBg,
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    {[
                      { label: "#", align: "center", width: 40 },
                      { label: "DTN", align: "left" },
                      { label: "Company", align: "left" },
                      { label: "Brand Name", align: "left" },
                      { label: "Generic Name", align: "left" },
                      { label: "Step", align: "left" },
                      { label: "Status", align: "center" },
                      { label: "Date", align: "right" },
                    ].map((col, ci) => (
                      <th
                        key={ci}
                        style={{
                          padding: "9px 12px",
                          textAlign: col.align,
                          fontSize: "0.69rem",
                          fontWeight: 700,
                          color: ui.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          borderBottom: `1px solid ${ui.cardBorder}`,
                          whiteSpace: "nowrap",
                          width: col.width || "auto",
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, ri) => {
                    const isEven = ri % 2 === 0;
                    const isLast = ri === data.length - 1;
                    const border = !isLast ? `1px solid ${ui.divider}` : "none";
                    const rowNum = startRow + ri;

                    return (
                      <tr
                        key={row.log_id}
                        onClick={() => onRowClick && onRowClick(row)}
                        style={{
                          background: isEven ? "transparent" : `${ui.pageBg}88`,
                          cursor: onRowClick ? "pointer" : "default",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = ui.hoverBg)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = isEven
                            ? "transparent"
                            : `${ui.pageBg}88`)
                        }
                      >
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "center",
                            color: ui.textMuted,
                            fontSize: "0.73rem",
                            borderBottom: border,
                          }}
                        >
                          {rowNum}
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            borderBottom: border,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              color: FB,
                              fontSize: "0.82rem",
                            }}
                          >
                            {row.dtn || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            color: ui.textSub,
                            borderBottom: border,
                            minWidth: 180,
                            maxWidth: 280,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              fontSize: "0.76rem",
                              lineHeight: 1.4,
                              wordBreak: "break-word",
                            }}
                          >
                            {row.lto_company || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            color: ui.textPrimary,
                            fontWeight: 500,
                            borderBottom: border,
                            maxWidth: 180,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.brand_name || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            color: ui.textSub,
                            borderBottom: border,
                            maxWidth: 160,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.generic_name || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            color: ui.textSub,
                            borderBottom: border,
                            maxWidth: 140,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: "0.76rem",
                            }}
                          >
                            {row.app_step || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "center",
                            borderBottom: border,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 10px",
                              borderRadius: 99,
                              fontSize: "0.73rem",
                              fontWeight: 700,
                              color: row.status_color,
                              background: row.status_bg,
                            }}
                          >
                            {row.status_label}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "right",
                            color: ui.textMuted,
                            fontSize: "0.76rem",
                            borderBottom: border,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.date_display}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer pagination */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            gap: 8,
          }}
        >
          <span style={{ fontSize: "0.74rem", color: ui.textMuted }}>
            {total > 0
              ? `${startRow}–${endRow} of ${total.toLocaleString()} records`
              : ""}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => fetchPage(page - 1)}
              disabled={page <= 1 || loading}
              style={{
                padding: "5px 12px",
                borderRadius: 7,
                border: `1px solid ${page <= 1 ? ui.cardBorder : ui.metricBorder}`,
                background: "transparent",
                color: page <= 1 ? ui.textMuted : ui.textPrimary,
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: page <= 1 ? "not-allowed" : "pointer",
                opacity: page <= 1 ? 0.4 : 1,
                fontFamily: "inherit",
              }}
            >
              ‹ Prev
            </button>
            <span
              style={{
                fontSize: "0.78rem",
                color: ui.textSub,
                padding: "0 8px",
                whiteSpace: "nowrap",
              }}
            >
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchPage(page + 1)}
              disabled={page >= totalPages || loading}
              style={{
                padding: "5px 12px",
                borderRadius: 7,
                border: `1px solid ${page >= totalPages ? ui.cardBorder : ui.metricBorder}`,
                background: "transparent",
                color: page >= totalPages ? ui.textMuted : ui.textPrimary,
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                opacity: page >= totalPages ? 0.4 : 1,
                fontFamily: "inherit",
              }}
            >
              Next ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MetricDetailModal ────────────────────────────────────────────────────────
function MetricDetailModal({
  metricKey,
  metricLabel,
  dateParams,
  onClose,
  onRowClick,
  onViewLogs,
  ui,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 10;
  const [openMenuRow, setOpenMenuRow] = useState(null);
  const fetchPage = useCallback(
    async (p) => {
      setLoading(true);
      setError(null);
      try {
        const res = await getDashboardDetail({
          metric: metricKey,
          page: p,
          page_size: PAGE_SIZE,
          ...dateParams,
        });
        setData(res.data);
        setTotal(res.total);
        setTotalPages(res.total_pages);
        setPage(res.page);
      } catch (err) {
        setError(
          err?.response?.data?.detail || err.message || "Failed to load",
        );
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [metricKey, dateParams],
  );

  useEffect(() => {
    const handler = () => setOpenMenuRow(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);
  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  // Metric accent colour
  const accentColor =
    metricKey === "received"
      ? "#1877F2"
      : metricKey === "completed"
        ? "#36a420"
        : metricKey === "on_process"
          ? "#f59e0b"
          : FB;

  const metricIcon =
    metricKey === "received"
      ? "👁️"
      : metricKey === "completed"
        ? "✅"
        : metricKey === "on_process"
          ? "⏳"
          : "🎯";

  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(startRow + PAGE_SIZE - 1, total);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.52)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 14,
          width: "100%",
          maxWidth: 1100, // ← 780 → 1100
          maxHeight: "92vh", // ← 88vh → 92vh
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.28)",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `${accentColor}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
              }}
            >
              {metricIcon}
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: ui.textPrimary,
                }}
              >
                {metricLabel}
              </h3>
              <p style={{ margin: 0, fontSize: "0.75rem", color: ui.textSub }}>
                {loading
                  ? "Loading…"
                  : `${total.toLocaleString()} application${total !== 1 ? "s" : ""}`}
                {dateParams?.date_from && dateParams?.date_to
                  ? ` · ${formatDateRange(dateParams.date_from, dateParams.date_to)}`
                  : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: ui.inputBg,
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 8,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: ui.textMuted,
              fontSize: "1rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Table body ── */}
        <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
          {/* Loading skeleton */}
          {loading && (
            <div
              style={{
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 44,
                    borderRadius: 8,
                    background: ui.progressBg,
                    animation: "cdrrPulse 1.2s ease-in-out infinite",
                    animationDelay: `${i * 0.07}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "#e02020",
                fontSize: "0.84rem",
              }}
            >
              ⚠️ {error}&nbsp;
              <button
                onClick={() => fetchPage(page)}
                style={{
                  background: "none",
                  border: "none",
                  color: FB,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.84rem",
                  fontFamily: "inherit",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && data.length === 0 && (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.84rem",
              }}
            >
              No records found.
            </div>
          )}

          {/* Data table */}
          {!loading && !error && data.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.8rem",
                  fontFamily: "inherit",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: ui.pageBg,
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    {[
                      { label: "#", align: "center", width: 40 },
                      { label: "DTN", align: "left" },
                      { label: "Company", align: "left" },
                      { label: "Brand Name", align: "left" },
                      { label: "Generic Name", align: "left" },
                      { label: "Step", align: "left" },
                      { label: "Status", align: "center" },
                      { label: "Start Date", align: "right" },
                      { label: "Accomplished Date", align: "right" },
                      { label: "Action", align: "center", width: 60 },
                    ].map((col, ci) => (
                      <th
                        key={ci}
                        style={{
                          padding: "9px 12px",
                          textAlign: col.align,
                          fontSize: "0.69rem",
                          fontWeight: 700,
                          color: ui.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          borderBottom: `1px solid ${ui.cardBorder}`,
                          whiteSpace: "nowrap",
                          width: col.width || "auto",
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, ri) => {
                    const badge = statusBadge(row.application_status, ui);
                    const isEven = ri % 2 === 0;
                    const isLast = ri === data.length - 1;
                    const border = !isLast ? `1px solid ${ui.divider}` : "none";
                    const rowNum = startRow + ri;

                    return (
                      <tr
                        key={row.log_id}
                        onClick={() => onRowClick && onRowClick(row)}
                        style={{
                          background: isEven ? "transparent" : `${ui.pageBg}88`,
                          cursor: onRowClick ? "pointer" : "default", // ← DAGDAG
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = ui.hoverBg)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = isEven
                            ? "transparent"
                            : `${ui.pageBg}88`)
                        }
                      >
                        {/* Row # */}
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "center",
                            color: ui.textMuted,
                            fontSize: "0.73rem",
                            borderBottom: border,
                          }}
                        >
                          {rowNum}
                        </td>
                        {/* DTN */}
                        <td
                          style={{
                            padding: "9px 12px",
                            borderBottom: border,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              color: accentColor,
                              fontSize: "0.82rem",
                            }}
                          >
                            {row.dtn || "—"}
                          </span>
                        </td>
                        {/* Company */}

                        <td
                          style={{
                            padding: "9px 12px",
                            color: ui.textSub,
                            borderBottom: border,
                            minWidth: 180, // ← minimum width para hindi masyadong liit
                            maxWidth: 280, // ← max lang para hindi sobrang laki
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              fontSize: "0.76rem",
                              lineHeight: 1.4,
                              wordBreak: "break-word", // ← mag-wrap na kung mahaba
                            }}
                          >
                            {row.lto_company || "—"}
                          </span>
                        </td>
                        {/* Brand name */}
                        <td
                          style={{
                            padding: "9px 12px",
                            color: ui.textPrimary,
                            fontWeight: 500,
                            borderBottom: border,
                            maxWidth: 180,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.brand_name || "—"}
                          </span>
                        </td>
                        {/* Generic name */}
                        <td
                          style={{
                            padding: "9px 12px",
                            color: ui.textSub,
                            borderBottom: border,
                            maxWidth: 160,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.generic_name || "—"}
                          </span>
                        </td>
                        {/* App step */}
                        <td
                          style={{
                            padding: "9px 12px",
                            color: ui.textSub,
                            borderBottom: border,
                            maxWidth: 140,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: "0.76rem",
                            }}
                          >
                            {row.app_step || "—"}
                          </span>
                        </td>
                        {/* Status badge */}
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "center",
                            borderBottom: border,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 10px",
                              borderRadius: 99,
                              fontSize: "0.73rem",
                              fontWeight: 700,
                              color: badge.color,
                              background: badge.bg,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        {/* Start date */}
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "right",
                            color: ui.textMuted,
                            fontSize: "0.76rem",
                            borderBottom: border,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {fmtDateTime(row.start_date)}
                        </td>
                        {/* Accomplished date */}
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "right",
                            fontSize: "0.76rem",
                            borderBottom: border,
                            whiteSpace: "nowrap",
                            color: row.end_date ? "#36a420" : ui.textMuted,
                          }}
                        >
                          {row.end_date ? fmtDateTime(row.end_date) : "—"}
                        </td>
                        {/* 3-dot action */}
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "center",
                            borderBottom: border,
                            position: "relative",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() =>
                              setOpenMenuRow(
                                openMenuRow === row.log_id ? null : row.log_id,
                              )
                            }
                            style={{
                              background: "none",
                              border: `1px solid ${ui.cardBorder}`,
                              borderRadius: 6,
                              width: 28,
                              height: 28,
                              cursor: "pointer",
                              color: ui.textMuted,
                              fontSize: "1rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: "inherit",
                            }}
                          >
                            ⋯
                          </button>
                          {openMenuRow === row.log_id && (
                            <div
                              style={{
                                position: "absolute",
                                right: 8,
                                top: 36,
                                zIndex: 50,
                                background: ui.cardBg,
                                border: `1px solid ${ui.cardBorder}`,
                                borderRadius: 8,
                                boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
                                minWidth: 140,
                                overflow: "hidden",
                              }}
                            >
                              <button
                                onClick={() => {
                                  setOpenMenuRow(null);
                                  onViewLogs && onViewLogs(row);
                                }}
                                style={{
                                  width: "100%",
                                  padding: "9px 14px",
                                  background: "none",
                                  border: "none",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  fontSize: "0.82rem",
                                  color: ui.textPrimary,
                                  fontFamily: "inherit",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background =
                                    ui.hoverBg)
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background = "none")
                                }
                              >
                                📋 View Logs
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer: pagination ── */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            gap: 8,
          }}
        >
          <span style={{ fontSize: "0.74rem", color: ui.textMuted }}>
            {total > 0
              ? `${startRow}–${endRow} of ${total.toLocaleString()} records`
              : ""}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => fetchPage(page - 1)}
              disabled={page <= 1 || loading}
              style={{
                padding: "5px 12px",
                borderRadius: 7,
                border: `1px solid ${page <= 1 ? ui.cardBorder : ui.metricBorder}`,
                background: "transparent",
                color: page <= 1 ? ui.textMuted : ui.textPrimary,
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: page <= 1 ? "not-allowed" : "pointer",
                opacity: page <= 1 ? 0.4 : 1,
                fontFamily: "inherit",
              }}
            >
              ‹ Prev
            </button>

            <span
              style={{
                fontSize: "0.78rem",
                color: ui.textSub,
                padding: "0 8px",
                whiteSpace: "nowrap",
              }}
            >
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => fetchPage(page + 1)}
              disabled={page >= totalPages || loading}
              style={{
                padding: "5px 12px",
                borderRadius: 7,
                border: `1px solid ${page >= totalPages ? ui.cardBorder : ui.metricBorder}`,
                background: "transparent",
                color: page >= totalPages ? ui.textMuted : ui.textPrimary,
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                opacity: page >= totalPages ? 0.4 : 1,
                fontFamily: "inherit",
              }}
            >
              Next ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TargetModal ──────────────────────────────────────────────────────────────
function TargetModal({ target, onClose, ui }) {
  if (!target) return null;
  const pct = Math.round((target.done / target.goal) * 100);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 12,
          width: "100%",
          maxWidth: 480,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.4rem" }}>{target.icon}</span>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: ui.textPrimary,
                }}
              >
                {target.label}
              </h3>
              <p style={{ margin: 0, fontSize: "0.76rem", color: ui.textSub }}>
                Deadline: {target.deadline}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: ui.textMuted,
              fontSize: "1.2rem",
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <p
            style={{
              margin: "0 0 14px",
              fontSize: "0.83rem",
              color: ui.textSub,
              lineHeight: 1.5,
            }}
          >
            {target.description}
          </p>
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.78rem",
                color: ui.textMuted,
                marginBottom: 6,
              }}
            >
              <span>
                {target.done} of {target.goal} completed
              </span>
              <span
                style={{ fontWeight: 700, color: pct === 100 ? "#36a420" : FB }}
              >
                {pct}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 99,
                background: ui.progressBg,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 99,
                  width: `${pct}%`,
                  background: pct === 100 ? "#36a420" : FB,
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {target.items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: item.done ? ui.pageBg : "transparent",
                  border: `1px solid ${item.done ? ui.cardBorder : "transparent"}`,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    flexShrink: 0,
                    border: `2px solid ${item.done ? "#36a420" : ui.metricBorder}`,
                    background: item.done ? "#36a420" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.done && (
                    <span
                      style={{
                        color: "#fff",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "0.82rem",
                    color: item.done ? ui.textMuted : ui.textPrimary,
                    textDecoration: item.done ? "line-through" : "none",
                  }}
                >
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            padding: "12px 20px",
            borderTop: `1px solid ${ui.divider}`,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              background: FB,
              border: "none",
              color: "#fff",
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AreaChart ────────────────────────────────────────────────────────────────
function AreaChart({ data, subtitle, ui }) {
  const [hov, setHov] = useState(null);
  const W = 700,
    H = 200;
  const PAD = { top: 18, right: 16, bottom: 28, left: 44 };
  const cW = W - PAD.left - PAD.right,
    cH = H - PAD.top - PAD.bottom;
  const allVals = data.flatMap((d) => SERIES.map((s) => d[s.key] ?? 0));
  const maxV = (Math.max(0, ...allVals) || 1) * 1.18;
  const toX = (i) => PAD.left + (i / Math.max(data.length - 1, 1)) * cW;
  const toY = (v) => PAD.top + cH - (v / maxV) * cH;
  const yticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxV * f));
  const xstep = Math.max(1, Math.ceil(data.length / 10));
  const showLabels = data.length <= 12;
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {SERIES.map((s) => (
            <div
              key={s.key}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: s.color,
                }}
              />
              <span style={{ fontSize: "0.72rem", color: ui.textSub }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
        {subtitle && (
          <span
            style={{
              fontSize: "0.72rem",
              color: ui.textMuted,
              fontStyle: "italic",
            }}
          >
            📅 {subtitle}
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          overflow: "visible",
        }}
      >
        <defs>
          {SERIES.map((s) => (
            <linearGradient
              key={s.key}
              id={`grad-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity="0.13" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {yticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={toY(t)}
              x2={W - PAD.right}
              y2={toY(t)}
              stroke={ui.gridLine}
              strokeWidth="1"
            />
            <text
              x={PAD.left - 5}
              y={toY(t) + 4}
              textAnchor="end"
              fill={ui.textMuted}
              fontSize="9.5"
            >
              {t}
            </text>
          </g>
        ))}
        {SERIES.filter((s) => !s.dashed).map((s) => {
          const pts = data
            .map((d, i) => `${toX(i)},${toY(d[s.key] ?? 0)}`)
            .join(" ");
          const area = `${PAD.left},${PAD.top + cH} ${pts} ${toX(data.length - 1)},${PAD.top + cH}`;
          return (
            <polygon key={s.key} points={area} fill={`url(#grad-${s.key})`} />
          );
        })}
        {SERIES.map((s) => {
          const pts = data
            .map((d, i) => `${toX(i)},${toY(d[s.key] ?? 0)}`)
            .join(" ");
          return (
            <polyline
              key={s.key}
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth={s.dashed ? 1.5 : 2}
              strokeDasharray={s.dashed ? "5 3" : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={s.dashed ? 0.75 : 1}
            />
          );
        })}
        {data.map(
          (d, i) =>
            i % xstep === 0 && (
              <text
                key={i}
                x={toX(i)}
                y={H - 3}
                textAnchor="middle"
                fill={ui.textMuted}
                fontSize="9"
              >
                {d.label}
              </text>
            ),
        )}
        {showLabels &&
          data.map((d, i) =>
            SERIES.filter((s) => !s.dashed).map((s) => {
              const x = toX(i),
                y = toY(d[s.key] ?? 0);
              const yOff =
                s.key === "received" ? -10 : s.key === "completed" ? -4 : 13;
              return (
                <text
                  key={s.key}
                  x={x}
                  y={y + yOff}
                  textAnchor="middle"
                  fill={s.color}
                  fontSize="8.5"
                  fontWeight="700"
                  style={{ pointerEvents: "none" }}
                >
                  {d[s.key]}
                </text>
              );
            }),
          )}
        {data.map((d, i) => (
          <g key={i}>
            <rect
              x={toX(i) - 16}
              y={PAD.top}
              width={32}
              height={cH}
              fill="transparent"
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
            />
            {hov === i &&
              (() => {
                const tipW = 132,
                  tipH = 84;
                const tipX =
                  toX(i) > W * 0.65 ? toX(i) - tipW - 10 : toX(i) + 10;
                const tipY = PAD.top + 2;
                return (
                  <g>
                    <line
                      x1={toX(i)}
                      y1={PAD.top}
                      x2={toX(i)}
                      y2={PAD.top + cH}
                      stroke={ui.gridLine}
                      strokeWidth="1"
                      strokeDasharray="4 3"
                    />
                    {SERIES.map((s) => (
                      <circle
                        key={s.key}
                        cx={toX(i)}
                        cy={toY(d[s.key] ?? 0)}
                        r="3.5"
                        fill={s.color}
                        stroke={ui.cardBg}
                        strokeWidth="2"
                      />
                    ))}
                    <rect
                      x={tipX}
                      y={tipY}
                      width={tipW}
                      height={tipH}
                      rx={6}
                      fill={ui.cardBg}
                      stroke={ui.cardBorder}
                      strokeWidth="1"
                      style={{
                        filter: "drop-shadow(0 2px 8px rgba(0,0,0,.22))",
                      }}
                    />
                    <text
                      x={tipX + 8}
                      y={tipY + 13}
                      fill={ui.textMuted}
                      fontSize="9"
                      fontWeight="600"
                    >
                      {d.label}
                      {subtitle ? ` · ${subtitle}` : ""}
                    </text>
                    {SERIES.map((s, si) => (
                      <g key={s.key}>
                        <circle
                          cx={tipX + 11}
                          cy={tipY + 24 + si * 16}
                          r="3"
                          fill={s.color}
                        />
                        <text
                          x={tipX + 19}
                          y={tipY + 28 + si * 16}
                          fill={ui.textSub}
                          fontSize="9"
                        >
                          {s.label}:
                        </text>
                        <text
                          x={tipX + tipW - 6}
                          y={tipY + 28 + si * 16}
                          textAnchor="end"
                          fill={s.color}
                          fontSize="9"
                          fontWeight="700"
                        >
                          {d[s.key] ?? 0}
                        </text>
                      </g>
                    ))}
                  </g>
                );
              })()}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── MetricTile ───────────────────────────────────────────────────────────────
// CHANGED: Added `onDetailClick` prop + cursor/hover styles to indicate clickable
function MetricTile({
  icon,
  label,
  value,
  change,
  active,
  onClick,
  onDetailClick,
  ui,
  loading = false,
  isLive = false,
}) {
  const up = change >= 0;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: "1 1 0",
        padding: "12px 14px",
        borderRadius: 8,
        border: `1.5px solid ${active ? FB : hovered ? `${FB}80` : ui.metricBorder}`,
        background: active
          ? ui.metricActiveBg
          : hovered
            ? `${ui.hoverBg}`
            : "transparent",
        cursor: "pointer",
        transition: "all 0.15s",
        minWidth: 0,
        position: "relative",
      }}
    >
      {isLive && !loading && (
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 8,
            fontSize: "0.56rem",
            fontWeight: 700,
            color: "#36a420",
            background: "#e9f7e6",
            padding: "1px 5px",
            borderRadius: 99,
            letterSpacing: "0.04em",
          }}
        >
          ● LIVE
        </span>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 5,
        }}
      >
        <span style={{ fontSize: "1rem" }}>{icon}</span>
        <span style={{ fontSize: "0.78rem", color: ui.textSub }}>{label}</span>
      </div>
      {loading ? (
        <div
          style={{
            width: 60,
            height: 22,
            borderRadius: 4,
            background: ui.progressBg,
            animation: "cdrrPulse 1.2s ease-in-out infinite",
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              color: ui.textPrimary,
              lineHeight: 1,
              // Value is clickable — underline on hover handled via the tile hover
            }}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          {change !== null && (
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: up ? "#36a420" : "#e02020",
              }}
            >
              {up ? "↑" : "↓"} {Math.abs(change)}%
            </span>
          )}
        </div>
      )}
      {/* Click hint */}
      {!loading && hovered && (
        <div
          style={{
            marginTop: 4,
            fontSize: "0.65rem",
            color: FB,
            fontWeight: 600,
          }}
        >
          View details →
        </div>
      )}
    </div>
  );
}

// ─── Card helpers ─────────────────────────────────────────────────────────────
function Card({ children, style = {}, ui }) {
  return (
    <div
      style={{
        background: ui.cardBg,
        border: `1px solid ${ui.cardBorder}`,
        borderRadius: 8,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
function CardHeader({ title, sub, right, ui }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "14px 16px 10px",
      }}
    >
      <div>
        <h2
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: ui.textPrimary,
            margin: 0,
          }}
        >
          {title}
        </h2>
        {sub && (
          <p
            style={{
              fontSize: "0.8rem",
              color: ui.textSub,
              margin: 0,
              marginTop: 2,
            }}
          >
            {sub}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}
const SeeAll = () => (
  <button
    style={{
      background: "none",
      border: "none",
      color: FB,
      fontSize: "0.84rem",
      fontWeight: 600,
      cursor: "pointer",
      padding: 0,
      whiteSpace: "nowrap",
    }}
  >
    See all
  </button>
);

// ─── Working week helpers ─────────────────────────────────────────────────────
function fmtLocal(d) {
  const y = d.getFullYear(),
    m = String(d.getMonth() + 1).padStart(2, "0"),
    day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function getWorkingWeek() {
  const today = new Date("2026-03-11T00:00:00"),
    dow = today.getDay();
  const mon = new Date(today);
  mon.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow));
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  return { start: fmtLocal(mon), end: fmtLocal(fri) };
}
function getWorkingDayLabels() {
  const week = getWorkingWeek(),
    dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  return dayNames.map((dayLabel, i) => {
    const [yr, mo, da] = week.start.split("-").map(Number);
    const d = new Date(yr, mo - 1, da + i);
    return {
      dayLabel,
      dateNum: d.getDate(),
      monthLabel: d.toLocaleDateString("en-PH", { month: "short" }),
      dateStr: fmtLocal(d),
    };
  });
}
function workingDaysLeft(endDateStr) {
  const [ey, em, ed] = endDateStr.split("-").map(Number),
    cur = new Date(2026, 2, 11);
  const end = new Date(ey, em - 1, ed);
  let count = 0;
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// ─── TargetsPanel ─────────────────────────────────────────────────────────────
function TargetsPanel({ ui, onSelectTarget }) {
  const week = getWorkingWeek(),
    workingDays = getWorkingDayLabels(),
    TODAY_STR = "2026-03-11",
    targets = TARGETS_WEEKLY;
  const totalDone = targets.reduce((s, t) => s + t.done, 0),
    totalGoal = targets.reduce((s, t) => s + t.goal, 0);
  const pct = Math.round((totalDone / totalGoal) * 100),
    wdLeft = workingDaysLeft(week.end);
  const weekLabel = `${workingDays[0].monthLabel} ${workingDays[0].dateNum} – ${workingDays[4].monthLabel} ${workingDays[4].dateNum}, 2026`;
  return (
    <Card ui={ui}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 10px",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: ui.textPrimary,
              margin: 0,
            }}
          >
            Weekly Targets
          </h3>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "0.72rem",
              color: ui.textMuted,
            }}
          >
            Working days only · Mon–Fri
          </p>
        </div>
        <SeeAll />
      </div>
      <div style={{ padding: "0 16px 12px" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
          {workingDays.map((wd) => {
            const isPast = wd.dateStr < TODAY_STR,
              isToday = wd.dateStr === TODAY_STR;
            return (
              <div
                key={wd.dateStr}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "7px 2px 6px",
                  borderRadius: 8,
                  background: isToday ? FB : isPast ? `${FB}14` : ui.inputBg,
                  border: `1.5px solid ${isToday ? FB : isPast ? `${FB}35` : ui.cardBorder}`,
                  position: "relative",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.58rem",
                    fontWeight: 700,
                    color: isToday ? "rgba(255,255,255,0.75)" : ui.textMuted,
                    textTransform: "uppercase",
                  }}
                >
                  {wd.dayLabel}
                </p>
                <p
                  style={{
                    margin: "2px 0 1px",
                    fontSize: "0.88rem",
                    fontWeight: 800,
                    color: isToday ? "#fff" : isPast ? FB : ui.textPrimary,
                    lineHeight: 1,
                  }}
                >
                  {wd.dateNum}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.56rem",
                    color: isToday ? "rgba(255,255,255,0.7)" : ui.textMuted,
                  }}
                >
                  {wd.monthLabel}
                </p>
                {isPast && (
                  <span
                    style={{
                      position: "absolute",
                      top: 3,
                      right: 4,
                      fontSize: "0.6rem",
                      color: "#36a420",
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            borderRadius: 7,
            background: `${FB}10`,
            border: `1px solid ${FB}28`,
          }}
        >
          <span style={{ fontSize: "0.78rem" }}>📅</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: "0.76rem",
                fontWeight: 600,
                color: FB,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {weekLabel}
            </p>
            <p style={{ margin: 0, fontSize: "0.69rem", color: ui.textMuted }}>
              {wdLeft} working day{wdLeft !== 1 ? "s" : ""} left this week
            </p>
          </div>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: 800,
                color: FB,
                lineHeight: 1,
              }}
            >
              {wdLeft}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "0.56rem",
                color: ui.textMuted,
                textTransform: "uppercase",
              }}
            >
              days
            </p>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.74rem",
              color: ui.textMuted,
              marginBottom: 5,
            }}
          >
            <span>{pct}% overall completed</span>
            <span
              style={{ fontWeight: 700, color: pct === 100 ? "#36a420" : FB }}
            >
              {totalDone}/{totalGoal} tasks
            </span>
          </div>
          <div
            style={{
              height: 5,
              borderRadius: 99,
              background: ui.progressBg,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                borderRadius: 99,
                background: pct === 100 ? "#36a420" : FB,
              }}
            />
          </div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${ui.divider}` }}>
        {targets.map((t) => {
          const tp = Math.round((t.done / t.goal) * 100);
          return (
            <div
              key={t.id}
              onClick={() => onSelectTarget(t)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = ui.hoverBg)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <span style={{ fontSize: "1.05rem" }}>{t.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.83rem",
                      color: ui.textPrimary,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.label}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 3,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 99,
                        background: ui.progressBg,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${tp}%`,
                          borderRadius: 99,
                          background: tp === 100 ? "#36a420" : FB,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "0.7rem", color: ui.textMuted }}>
                      {t.done}/{t.goal}
                    </span>
                  </div>
                </div>
              </div>
              <span style={{ color: ui.textMuted, marginLeft: 8 }}>›</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── AccomplishmentReport ─────────────────────────────────────────────────────
function AccomplishmentReport({ onClose, totals, ui, customDates }) {
  const targets = TARGETS_WEEKLY;
  const displayPeriod = formatDateRange(customDates?.start, customDates?.end);
  const daysLeftVal = daysUntil(customDates?.end);
  const totalDone = targets.reduce((s, t) => s + t.done, 0),
    totalGoal = targets.reduce((s, t) => s + t.goal, 0);
  const completedRate =
    totals.received > 0
      ? ((totals.completed / totals.received) * 100).toFixed(1)
      : "0.0";
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 12,
          width: "100%",
          maxWidth: 620,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              📋 Accomplishment Report
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "0.76rem",
                color: ui.textSub,
                marginTop: 2,
              }}
            >
              {displayPeriod} · CDRR System
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => window.print()}
              style={{
                padding: "6px 14px",
                borderRadius: 7,
                border: `1.5px solid ${FB}`,
                background: "transparent",
                color: FB,
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: ui.textMuted,
                fontSize: "1.2rem",
                padding: 4,
              }}
            >
              ✕
            </button>
          </div>
        </div>
        <div style={{ overflowY: "auto", padding: "20px" }}>
          <div
            style={{
              textAlign: "center",
              padding: "16px",
              borderRadius: 10,
              background: ui.pageBg,
              border: `1px solid ${ui.cardBorder}`,
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: 6 }}>🏢</div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: 800,
                color: ui.textPrimary,
              }}
            >
              CDRR – Accomplishment Report
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: ui.textSub,
                marginTop: 4,
              }}
            >
              {displayPeriod} &nbsp;|&nbsp; Generated: March 11, 2026
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 10,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: "Total Received",
                value: totals.received,
                color: "#1877F2",
                icon: "📥",
              },
              {
                label: "Completed",
                value: totals.completed,
                color: "#36a420",
                icon: "✅",
              },
              {
                label: "On Process",
                value: totals.onProcess,
                color: "#f59e0b",
                icon: "⏳",
              },
              {
                label: "Completed Rate",
                value: `${completedRate}%`,
                color: "#9333ea",
                icon: "📈",
              },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  textAlign: "center",
                  padding: "10px 6px",
                  borderRadius: 8,
                  border: `1px solid ${ui.cardBorder}`,
                  background: ui.cardBg,
                }}
              >
                <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>
                  {s.icon}
                </div>
                <div
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: s.color,
                    lineHeight: 1,
                  }}
                >
                  {typeof s.value === "number"
                    ? s.value.toLocaleString()
                    : s.value}
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: ui.textSub,
                    marginTop: 3,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              background: ui.pageBg,
              border: `1px solid ${ui.cardBorder}`,
              fontSize: "0.82rem",
              color: ui.textSub,
              lineHeight: 1.7,
            }}
          >
            The CDRR system recorded a total of{" "}
            <strong style={{ color: ui.textPrimary }}>
              {totals.received.toLocaleString()}
            </strong>{" "}
            applications received for the period of{" "}
            <strong style={{ color: ui.textPrimary }}>{displayPeriod}</strong>.
            Of these,{" "}
            <strong style={{ color: "#36a420" }}>{totals.completed}</strong>{" "}
            were completed and{" "}
            <strong style={{ color: "#f59e0b" }}>{totals.onProcess}</strong> are
            currently on process, achieving a completion rate of{" "}
            <strong style={{ color: "#9333ea" }}>{completedRate}%</strong>
            {daysLeftVal !== null ? (
              <>
                {" "}
                with{" "}
                <strong style={{ color: ui.textPrimary }}>
                  {daysLeftVal} day{daysLeftVal !== 1 ? "s" : ""}
                </strong>{" "}
                remaining
              </>
            ) : (
              ""
            )}
            .
          </div>
        </div>
        <div
          style={{
            padding: "12px 20px",
            borderTop: `1px solid ${ui.divider}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: `1px solid ${ui.cardBorder}`,
              background: "transparent",
              color: ui.textSub,
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => window.print()}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: FB,
              color: "#fff",
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🖨️ Print Report
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function DashboardPage({ darkMode: darkModeProp }) {
  const [internalDark, setInternalDark] = useState(true);
  const darkMode = darkModeProp !== undefined ? darkModeProp : internalDark;
  const ui = useMemo(() => makeUI(darkMode), [darkMode]);
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  // ── Controls ───────────────────────────────────────────────────────────────
  const [breakdown, setBreakdown] = useState("year");
  const [selYear, setSelYear] = useState(String(CURRENT_YEAR));
  const [selMonth, setSelMonth] = useState(ALL_MONTHS[CURRENT_MONTH_IDX]);
  const [activeMetric, setActiveMetric] = useState(0);
  const [activeTarget, setActiveTarget] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [customReportDates, setCustomReportDates] = useState(null);
  const [tablePage, setTablePage] = useState(0);
  const TABLE_PAGE_SIZE = 13;
  const [showRecentModal, setShowRecentModal] = useState(false);
  const [selectedDtnRecord, setSelectedDtnRecord] = useState(null);

  const [logsModal, setLogsModal] = useState(null);
  // ── NEW: Detail modal state ────────────────────────────────────────────────
  const [detailModal, setDetailModal] = useState(null);
  // detailModal = { metricKey: "received"|"completed"|"on_process", metricLabel: string, dateParams: {} }

  // ── KPI tiles state ────────────────────────────────────────────────────────
  const [liveStats, setLiveStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  // ── Chart / table state ────────────────────────────────────────────────────
  const [chartData, setChartData] = useState([]);
  const [chartTotals, setChartTotals] = useState({
    received: 0,
    completed: 0,
    onProcess: 0,
    target: 0,
    completedRate: null,
  });
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState(null);
  const [chartSubtitle, setChartSubtitle] = useState("");

  // ── Accomplishment report date pickers ────────────────────────────────────
  const week = getWorkingWeek();
  const [reportStart, setReportStart] = useState(week.start);
  const [reportEnd, setReportEnd] = useState(week.end);
  const [reportDateErr, setReportDateErr] = useState("");
  const handleReportStartChange = (v) => {
    setReportStart(v);
    setReportDateErr(
      reportEnd && v > reportEnd ? "Start must be before end date." : "",
    );
  };
  const handleReportEndChange = (v) => {
    setReportEnd(v);
    setReportDateErr(
      reportStart && v < reportStart ? "End must be after start date." : "",
    );
  };
  const canGenReport = !reportDateErr && reportStart && reportEnd;

  const inputSt2 = {
    width: "100%",
    padding: "7px 10px",
    borderRadius: 7,
    border: `1.5px solid ${ui.metricBorder}`,
    background: ui.inputBg,
    color: ui.textPrimary,
    fontSize: "0.8rem",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    cursor: "pointer",
  };

  // ── Fetch: KPI summary ────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const p = buildChartParams(breakdown, selYear, selMonth);
      const params = {};
      if (p.date_from) params.date_from = p.date_from;
      if (p.date_to) params.date_to = p.date_to;
      setLiveStats(await getDashboardSummary(params));
    } catch (err) {
      setStatsError(
        err?.response?.data?.detail || err.message || "Failed to load stats",
      );
      setLiveStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [breakdown, selYear, selMonth]);

  // ── Fetch: chart / table ──────────────────────────────────────────────────
  const fetchChart = useCallback(async () => {
    setChartLoading(true);
    setChartError(null);
    try {
      const params = buildChartParams(breakdown, selYear, selMonth);
      const res = await getDashboardChart(params);
      setChartData(res.data.map(mapPoint));
      setChartTotals({
        received: res.total_received ?? 0,
        completed: res.total_completed ?? 0,
        onProcess: res.total_on_process ?? 0,
        target: res.total_target ?? 0,
        completedRate: res.overall_completed_rate ?? null,
      });
      if (breakdown === "day") setChartSubtitle(`${selMonth} ${selYear}`);
      if (breakdown === "month") setChartSubtitle(selYear);
      if (breakdown === "year") setChartSubtitle("All Years");
      setTablePage(0);
    } catch (err) {
      setChartError(
        err?.response?.data?.detail ||
          err.message ||
          "Failed to load chart data",
      );
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [breakdown, selYear, selMonth]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  // ── Metrics array ─────────────────────────────────────────────────────────
  // CHANGED: added `metricKey` to each entry for the detail modal
  const metrics = [
    {
      icon: "👁️",
      label: "Total Received",
      metricKey: "received",
      value: liveStats ? liveStats.received : chartTotals.received,
      change: 8,
      isLive: true,
    },
    {
      icon: "✅",
      label: "Completed",
      metricKey: "completed",
      value: liveStats ? liveStats.completed : chartTotals.completed,
      change: -3,
      isLive: true,
    },
    {
      icon: "⏳",
      label: "On Process",
      metricKey: "on_process",
      value: liveStats ? liveStats.on_process : chartTotals.onProcess,
      change: 12,
      isLive: true,
    },
    {
      icon: "🎯",
      label: "Target",
      metricKey: null,
      value: chartTotals.target,
      change: 0,
      isLive: false,
    },
  ];

  // ── Date params to pass into detail modal (match current chart window) ────
  const currentDateParams = useMemo(() => {
    const p = buildChartParams(breakdown, selYear, selMonth);
    const out = {};
    if (p.date_from) out.date_from = p.date_from;
    if (p.date_to) out.date_to = p.date_to;
    return out;
  }, [breakdown, selYear, selMonth]);

  // ── Open detail modal ─────────────────────────────────────────────────────
  const openDetail = useCallback(
    (m) => {
      if (!m.metricKey) return; // Target tile has no detail
      setDetailModal({
        metricKey: m.metricKey,
        metricLabel: m.label,
        dateParams: currentDateParams,
      });
    },
    [currentDateParams],
  );

  const [recentApps, setRecentApps] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState(null);

  const fetchRecentApps = useCallback(async () => {
    setRecentLoading(true);
    setRecentError(null);
    try {
      const res = await getDashboardRecentApplications({ limit: 10 });
      setRecentApps(res.data);
    } catch (err) {
      setRecentError(
        err?.response?.data?.detail || err.message || "Failed to load",
      );
      setRecentApps([]);
    } finally {
      setRecentLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchRecentApps();
  }, [fetchRecentApps]);

  const [dbConnections, setDbConnections] = useState([
    {
      id: "doctrack",
      label: "Doctrack",
      desc: "Document Tracking DB",
      icon: "🗂️",
      active: true,
    },
    {
      id: "aws",
      label: "AWS",
      desc: "Cloud Storage & Services",
      icon: "☁️",
      active: true,
    },
    {
      id: "maindb",
      label: "Main DB",
      desc: "Primary Application DB",
      icon: "🗄️",
      active: true,
    },
  ]);
  const toggleConn = (id) =>
    setDbConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
    );
  const allActive = dbConnections.every((c) => c.active),
    someInactive = dbConnections.some((c) => !c.active);

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    const id = "cdrr-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = `.cdrr-scroll::-webkit-scrollbar{width:7px}.cdrr-scroll::-webkit-scrollbar-track{background:transparent}.cdrr-scroll::-webkit-scrollbar-thumb{background:#3a3b3c;border-radius:99px}.cdrr-scroll::-webkit-scrollbar-thumb:hover{background:#555}.cdrr-scroll{scrollbar-width:thin;scrollbar-color:#3a3b3c transparent}@keyframes cdrrPulse{0%,100%{opacity:1}50%{opacity:0.4}}`;
      document.head.appendChild(s);
    }
    return () => {
      const el = document.getElementById("cdrr-style");
      if (el) el.remove();
    };
  }, []);

  // ─── RightPanel ────────────────────────────────────────────────────────────
  const RightPanel = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* System Status */}
      <Card ui={ui}>
        <div
          style={{
            padding: "14px 16px 10px",
            borderBottom: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "0.95rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              System Status
            </h3>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "0.72rem",
                color: allActive
                  ? "#36a420"
                  : someInactive
                    ? "#f59e0b"
                    : "#e02020",
              }}
            >
              {allActive
                ? "● All systems operational"
                : someInactive
                  ? "● Some connections inactive"
                  : "● Systems offline"}
            </p>
          </div>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: allActive
                ? "#36a420"
                : someInactive
                  ? "#f59e0b"
                  : "#e02020",
            }}
          />
        </div>
        <div
          style={{
            padding: "10px 16px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {dbConnections.map((conn) => (
            <div
              key={conn.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${conn.active ? "#36a42030" : "#e0202030"}`,
                background: conn.active ? "#36a42008" : "#e0202008",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: conn.active ? "#36a42018" : "#e0202018",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                }}
              >
                {conn.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.84rem",
                    fontWeight: 700,
                    color: ui.textPrimary,
                  }}
                >
                  {conn.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.71rem",
                    color: ui.textMuted,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {conn.desc}
                </p>
              </div>
              <button
                onClick={() => toggleConn(conn.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 99,
                  border: `1.5px solid ${conn.active ? "#36a42050" : "#e0202050"}`,
                  background: conn.active ? "#36a42015" : "#e0202015",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: conn.active ? "#36a420" : "#e02020",
                    display: "inline-block",
                  }}
                />
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: conn.active ? "#36a420" : "#e02020",
                  }}
                >
                  {conn.active ? "Active" : "Inactive"}
                </span>
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Accomplishment Report */}
      <Card ui={ui}>
        <div style={{ padding: "14px 16px 10px" }}>
          <h3
            style={{
              margin: 0,
              fontSize: "0.95rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            Accomplishment Report
          </h3>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "0.72rem",
              color: ui.textMuted,
            }}
          >
            Select a date range to generate
          </p>
        </div>
        <div
          style={{
            padding: "0 16px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: ui.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                From
              </p>
              <input
                type="date"
                value={reportStart}
                max={reportEnd || "2099-12-31"}
                onChange={(e) => handleReportStartChange(e.target.value)}
                style={inputSt2}
              />
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: ui.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                To
              </p>
              <input
                type="date"
                value={reportEnd}
                min={reportStart || "2020-01-01"}
                onChange={(e) => handleReportEndChange(e.target.value)}
                style={inputSt2}
              />
            </div>
          </div>
          {reportDateErr && (
            <p style={{ margin: 0, fontSize: "0.73rem", color: "#e02020" }}>
              ⚠ {reportDateErr}
            </p>
          )} */}
          {/* {reportStart && reportEnd && !reportDateErr && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 7,
                background: `${FB}10`,
                border: `1px solid ${FB}28`,
              }}
            >
              <span style={{ fontSize: "0.75rem" }}>📆</span>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: FB,
                }}
              >
                {formatDateRange(reportStart, reportEnd)}
              </p>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "0.69rem",
                  color: ui.textMuted,
                }}
              >
                {daysBetween(reportStart, reportEnd)}d
              </span>
            </div>
          )} */}
          <button
            onClick={() =>
              canGenReport &&
              (setCustomReportDates({ start: reportStart, end: reportEnd }),
              setShowReport(true))
            }
            disabled={!canGenReport}
            style={{
              width: "100%",
              padding: "9px 0",
              borderRadius: 8,
              border: `1.5px solid ${canGenReport ? FB : ui.metricBorder}`,
              background: canGenReport ? FB : "transparent",
              color: canGenReport ? "#fff" : ui.textMuted,
              fontSize: "0.84rem",
              fontWeight: 700,
              cursor: canGenReport ? "pointer" : "not-allowed",
              opacity: canGenReport ? 1 : 0.5,
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              if (canGenReport) e.currentTarget.style.background = "#1565d8";
            }}
            onMouseLeave={(e) => {
              if (canGenReport) e.currentTarget.style.background = FB;
            }}
          >
            📋 Generate Report
          </button>
        </div>
      </Card>

      {/* <TargetsPanel ui={ui} onSelectTarget={setActiveTarget} /> */}

      {/* Next Steps */}
      {/* <Card ui={ui}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px 6px",
            borderBottom: `1px solid ${ui.divider}`,
          }}
        >
          <h3
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: ui.textPrimary,
              margin: 0,
            }}
          >
            Next steps
          </h3>
          <SeeAll />
        </div>
        {[
          {
            icon: "📈",
            title: "Completion volume increased",
            sub: "Completed count up 12% this week",
          },
          {
            icon: "⏰",
            title: "3 apps nearing deadline",
            sub: "Review before end of day",
          },
          {
            icon: "🚩",
            title: "2 backlogs flagged",
            sub: "Requires immediate attention",
          },
        ].map((item, i, arr) => (
          <div
            key={i}
            style={{
              padding: "10px 16px",
              borderBottom:
                i < arr.length - 1 ? `1px solid ${ui.divider}` : "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = ui.hoverBg)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 2,
              }}
            >
              <span style={{ fontSize: "1rem" }}>{item.icon}</span>
              <span
                style={{
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  color: ui.textPrimary,
                }}
              >
                {item.title}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "0.77rem",
                color: ui.textSub,
                paddingLeft: 26,
              }}
            >
              {item.sub}
            </p>
          </div>
        ))}
      </Card> */}
    </div>
  );

  // ─── Data table ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(chartData.length / TABLE_PAGE_SIZE);
  const safePage = Math.min(tablePage, Math.max(0, totalPages - 1));
  const pagedRows = chartData.slice(
    safePage * TABLE_PAGE_SIZE,
    (safePage + 1) * TABLE_PAGE_SIZE,
  );
  const startRow = safePage * TABLE_PAGE_SIZE + 1,
    endRow = Math.min(startRow + TABLE_PAGE_SIZE - 1, chartData.length);
  const unitLabel =
    breakdown === "day" ? "day" : breakdown === "month" ? "month" : "year";

  const handleDetailRowClick = useCallback(async (row) => {
    if (!row?.dtn) return;
    try {
      const fullRecord = await getDashboardRecordByDtn(row.dtn);
      setSelectedDtnRecord(fullRecord);
    } catch (err) {
      console.error("Failed to fetch full record:", err);
    }
  }, []);

  return (
    <>
      {/* Error toasts */}
      {(statsError || chartError) && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {statsError && (
            <div
              style={{
                background: "#e02020",
                color: "#fff",
                padding: "10px 16px",
                borderRadius: 8,
                fontSize: "0.8rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 10,
                maxWidth: 320,
              }}
            >
              <span>⚠️ Stats: {statsError}</span>
              <button
                onClick={fetchStats}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "#fff",
                  padding: "3px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  fontFamily: "inherit",
                }}
              >
                Retry
              </button>
            </div>
          )}
          {chartError && (
            <div
              style={{
                background: "#e02020",
                color: "#fff",
                padding: "10px 16px",
                borderRadius: 8,
                fontSize: "0.8rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 10,
                maxWidth: 320,
              }}
            >
              <span>⚠️ Chart: {chartError}</span>
              <button
                onClick={fetchChart}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "#fff",
                  padding: "3px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  fontFamily: "inherit",
                }}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          fontFamily: font,
        }}
      >
        <div
          className="cdrr-scroll"
          style={{
            display: "flex",
            flex: "1 1 0",
            minHeight: 0,
            overflowY: "scroll",
            overflowX: "hidden",
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: isMobile ? "12px" : "16px",
              paddingBottom: 120,
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 290px",
              gap: 16,
              alignItems: "start",
              boxSizing: "border-box",
            }}
          >
            {/* ── Left column ─────────────────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Insights card */}
              <Card ui={ui}>
                <div style={{ padding: "14px 16px 0" }}>
                  {/* Header row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 12,
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          color: ui.textPrimary,
                          margin: 0,
                        }}
                      >
                        Insights
                      </h2>
                      <p
                        style={{
                          fontSize: "0.8rem",
                          color: ui.textSub,
                          margin: "2px 0 0",
                        }}
                      >
                        Learn how your applications are performing.
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      {/* Breakdown toggle */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          padding: "3px",
                          borderRadius: 8,
                          background: ui.inputBg,
                          border: `1px solid ${ui.cardBorder}`,
                        }}
                      >
                        {[
                          { key: "day", label: "Daily" },
                          { key: "month", label: "Monthly" },
                          { key: "year", label: "Yearly" },
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            onClick={() => setBreakdown(opt.key)}
                            style={{
                              padding: "4px 11px",
                              borderRadius: 6,
                              border: "none",
                              background:
                                breakdown === opt.key ? FB : "transparent",
                              color:
                                breakdown === opt.key ? "#fff" : ui.textSub,
                              fontSize: "0.76rem",
                              fontWeight: breakdown === opt.key ? 700 : 500,
                              cursor: "pointer",
                              fontFamily: "inherit",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {/* Year picker */}
                      {(breakdown === "day" || breakdown === "month") && (
                        <select
                          value={selYear}
                          onChange={(e) => {
                            setSelYear(e.target.value);
                            if (breakdown === "day") {
                              const months =
                                MONTHS_BY_YEAR[e.target.value] || [];
                              if (!months.includes(selMonth))
                                setSelMonth(months[months.length - 1] || "Jan");
                            }
                          }}
                          style={{
                            padding: "4px 24px 4px 10px",
                            borderRadius: 7,
                            border: `1px solid ${ui.cardBorder}`,
                            background: ui.inputBg,
                            color: ui.textPrimary,
                            fontSize: "0.76rem",
                            fontFamily: "inherit",
                            outline: "none",
                            cursor: "pointer",
                            appearance: "none",
                            WebkitAppearance: "none",
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%2365676b' d='M5 7L0 2h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 8px center",
                          }}
                        >
                          {AVAILABLE_YEARS.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      )}
                      {/* Month picker */}
                      {breakdown === "day" && (
                        <select
                          value={selMonth}
                          onChange={(e) => setSelMonth(e.target.value)}
                          style={{
                            padding: "4px 24px 4px 10px",
                            borderRadius: 7,
                            border: `1px solid ${ui.cardBorder}`,
                            background: ui.inputBg,
                            color: ui.textPrimary,
                            fontSize: "0.76rem",
                            fontFamily: "inherit",
                            outline: "none",
                            cursor: "pointer",
                            appearance: "none",
                            WebkitAppearance: "none",
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%2365676b' d='M5 7L0 2h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 8px center",
                          }}
                        >
                          {(MONTHS_BY_YEAR[selYear] || []).map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      )}
                      <SeeAll />
                    </div>
                  </div>

                  {/* ── KPI tiles — CLICKABLE ── */}
                  <div
                    style={{
                      display: "flex",
                      gap: isMobile ? 6 : 10,
                      marginBottom: 14,
                    }}
                  >
                    {metrics.map((m, i) => (
                      <MetricTile
                        key={i}
                        icon={m.icon}
                        label={m.label}
                        value={m.value}
                        change={m.change}
                        active={activeMetric === i}
                        onClick={() => {
                          setActiveMetric(i);
                          openDetail(m); // ← opens detail modal
                        }}
                        ui={ui}
                        loading={m.isLive ? statsLoading : false}
                        isLive={m.isLive}
                      />
                    ))}
                  </div>
                </div>

                {/* Chart */}
                <div style={{ padding: "0 16px 12px", position: "relative" }}>
                  {chartLoading && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: `${ui.cardBg}cc`,
                        zIndex: 2,
                        borderRadius: 8,
                      }}
                    >
                      <span
                        style={{ fontSize: "0.82rem", color: ui.textMuted }}
                      >
                        ⏳ Loading chart…
                      </span>
                    </div>
                  )}
                  <AreaChart
                    data={chartData}
                    subtitle={chartSubtitle}
                    ui={ui}
                  />
                </div>

                {/* Data Table */}
                <div
                  style={{
                    borderTop: `1px solid ${ui.divider}`,
                    padding: "0 16px 16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 0 8px",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: ui.textPrimary,
                      }}
                    >
                      Data Table{" "}
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: "0.72rem",
                          fontWeight: 400,
                          color: ui.textMuted,
                        }}
                      >
                        📅 {chartSubtitle}
                      </span>
                    </p>
                    <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
                      {chartData.length > 0
                        ? `${startRow}–${endRow} of ${chartData.length} ${unitLabel}${chartData.length !== 1 ? "s" : ""}`
                        : ""}
                    </span>
                  </div>
                  {chartLoading ? (
                    <div
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: ui.textMuted,
                        fontSize: "0.82rem",
                      }}
                    >
                      ⏳ Loading data…
                    </div>
                  ) : (
                    <div
                      style={{
                        overflowX: "auto",
                        borderRadius: 8,
                        border: `1px solid ${ui.cardBorder}`,
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "0.8rem",
                          fontFamily: "inherit",
                        }}
                      >
                        <thead>
                          <tr style={{ background: ui.pageBg }}>
                            {[
                              {
                                label:
                                  breakdown === "day"
                                    ? "Day"
                                    : breakdown === "month"
                                      ? "Month"
                                      : "Year",
                                align: "left",
                              },
                              {
                                label: "Total Received",
                                align: "right",
                                color: "#1877F2",
                              },
                              {
                                label: "Completed",
                                align: "right",
                                color: "#36a420",
                              },
                              {
                                label: "On Process",
                                align: "right",
                                color: "#f59e0b",
                              },
                              {
                                label: "Target",
                                align: "right",
                                color: "#9333ea",
                              },
                              {
                                label: "Completed Rate",
                                align: "right",
                                color: "#9333ea",
                              },
                            ].map((col, ci) => (
                              <th
                                key={ci}
                                style={{
                                  padding: "8px 12px",
                                  textAlign: col.align,
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  color: col.color || ui.textMuted,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.04em",
                                  borderBottom: `1px solid ${ui.cardBorder}`,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pagedRows.map((row, ri) => {
                            const rateN = row.completedRate;
                            const isEven = ri % 2 === 0,
                              isLast = ri === pagedRows.length - 1;
                            const border = !isLast
                              ? `1px solid ${ui.divider}`
                              : "none";
                            return (
                              <tr
                                key={ri}
                                style={{
                                  background: isEven
                                    ? "transparent"
                                    : `${ui.pageBg}88`,
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background =
                                    ui.hoverBg)
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background = isEven
                                    ? "transparent"
                                    : `${ui.pageBg}88`)
                                }
                              >
                                <td
                                  style={{
                                    padding: "7px 12px",
                                    color: ui.textPrimary,
                                    fontWeight: 600,
                                    borderBottom: border,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {row.label}
                                  {breakdown === "day" && (
                                    <span
                                      style={{
                                        marginLeft: 4,
                                        fontSize: "0.68rem",
                                        color: ui.textMuted,
                                        fontWeight: 400,
                                      }}
                                    >
                                      {chartSubtitle?.split(" ")[0]}
                                    </span>
                                  )}
                                </td>
                                <td
                                  style={{
                                    padding: "7px 12px",
                                    textAlign: "right",
                                    color: "#1877F2",
                                    fontWeight: 700,
                                    borderBottom: border,
                                  }}
                                >
                                  {row.received.toLocaleString()}
                                </td>
                                <td
                                  style={{
                                    padding: "7px 12px",
                                    textAlign: "right",
                                    color: "#36a420",
                                    fontWeight: 700,
                                    borderBottom: border,
                                  }}
                                >
                                  {row.completed.toLocaleString()}
                                </td>
                                <td
                                  style={{
                                    padding: "7px 12px",
                                    textAlign: "right",
                                    color: "#f59e0b",
                                    fontWeight: 700,
                                    borderBottom: border,
                                  }}
                                >
                                  {row.onProcess.toLocaleString()}
                                </td>
                                <td
                                  style={{
                                    padding: "7px 12px",
                                    textAlign: "right",
                                    color: "#9333ea",
                                    fontWeight: 700,
                                    borderBottom: border,
                                  }}
                                >
                                  {row.target > 0
                                    ? row.target.toLocaleString()
                                    : "—"}
                                </td>
                                <td
                                  style={{
                                    padding: "7px 12px",
                                    textAlign: "right",
                                    borderBottom: border,
                                  }}
                                >
                                  {rateN !== null ? (
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 3,
                                        fontSize: "0.73rem",
                                        fontWeight: 700,
                                        color:
                                          rateN >= 75
                                            ? "#36a420"
                                            : rateN >= 50
                                              ? "#f59e0b"
                                              : "#e02020",
                                        background:
                                          rateN >= 75
                                            ? "#e9f7e6"
                                            : rateN >= 50
                                              ? "#fff8e7"
                                              : "#fde8e8",
                                        padding: "2px 8px",
                                        borderRadius: 99,
                                      }}
                                    >
                                      {rateN >= 75
                                        ? "▲"
                                        : rateN >= 50
                                          ? "~"
                                          : "▼"}{" "}
                                      {rateN.toFixed(1)}%
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        color: ui.textMuted,
                                        fontSize: "0.73rem",
                                      }}
                                    >
                                      —
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr
                            style={{
                              background: ui.pageBg,
                              borderTop: `2px solid ${ui.cardBorder}`,
                            }}
                          >
                            <td
                              style={{
                                padding: "8px 12px",
                                fontWeight: 700,
                                color: ui.textPrimary,
                                fontSize: "0.78rem",
                              }}
                            >
                              Total
                            </td>
                            {[
                              { val: chartTotals.received, color: "#1877F2" },
                              { val: chartTotals.completed, color: "#36a420" },
                              { val: chartTotals.onProcess, color: "#f59e0b" },
                              { val: chartTotals.target, color: "#9333ea" },
                            ].map((col, ci) => (
                              <td
                                key={ci}
                                style={{
                                  padding: "8px 12px",
                                  textAlign: "right",
                                  fontWeight: 800,
                                  color: col.color,
                                  fontSize: "0.82rem",
                                }}
                              >
                                {(col.val ?? 0).toLocaleString()}
                              </td>
                            ))}
                            {(() => {
                              const n = chartTotals.completedRate;
                              return (
                                <td
                                  style={{
                                    padding: "8px 12px",
                                    textAlign: "right",
                                  }}
                                >
                                  {n !== null ? (
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 3,
                                        fontSize: "0.75rem",
                                        fontWeight: 800,
                                        color:
                                          n >= 75
                                            ? "#36a420"
                                            : n >= 50
                                              ? "#f59e0b"
                                              : "#e02020",
                                        background:
                                          n >= 75
                                            ? "#e9f7e6"
                                            : n >= 50
                                              ? "#fff8e7"
                                              : "#fde8e8",
                                        padding: "2px 8px",
                                        borderRadius: 99,
                                      }}
                                    >
                                      {n >= 75 ? "▲" : n >= 50 ? "~" : "▼"}{" "}
                                      {n.toFixed(1)}%
                                    </span>
                                  ) : (
                                    <span style={{ color: ui.textMuted }}>
                                      —
                                    </span>
                                  )}
                                </td>
                              );
                            })()}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 10,
                        gap: 8,
                      }}
                    >
                      <span
                        style={{ fontSize: "0.74rem", color: ui.textMuted }}
                      >
                        Page {safePage + 1} of {totalPages}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <button
                          onClick={() =>
                            setTablePage((p) => Math.max(0, p - 1))
                          }
                          disabled={safePage === 0}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            border: `1px solid ${safePage === 0 ? ui.cardBorder : ui.metricBorder}`,
                            background: "transparent",
                            color:
                              safePage === 0 ? ui.textMuted : ui.textPrimary,
                            fontSize: "0.76rem",
                            fontWeight: 600,
                            cursor: safePage === 0 ? "not-allowed" : "pointer",
                            opacity: safePage === 0 ? 0.4 : 1,
                            fontFamily: "inherit",
                          }}
                        >
                          ‹ Prev
                        </button>
                        {Array.from({ length: totalPages }, (_, pi) => {
                          const show =
                            pi === 0 ||
                            pi === totalPages - 1 ||
                            Math.abs(pi - safePage) <= 1;
                          const showEllipsisBefore =
                              pi === safePage - 2 && pi > 1,
                            showEllipsisAfter =
                              pi === safePage + 2 && pi < totalPages - 2;
                          if (
                            !show &&
                            !showEllipsisBefore &&
                            !showEllipsisAfter
                          )
                            return null;
                          if (showEllipsisBefore || showEllipsisAfter)
                            return (
                              <span
                                key={pi}
                                style={{
                                  fontSize: "0.74rem",
                                  color: ui.textMuted,
                                  padding: "0 2px",
                                }}
                              >
                                …
                              </span>
                            );
                          const isActive = pi === safePage;
                          return (
                            <button
                              key={pi}
                              onClick={() => setTablePage(pi)}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: `1px solid ${isActive ? FB : ui.cardBorder}`,
                                background: isActive ? FB : "transparent",
                                color: isActive ? "#fff" : ui.textPrimary,
                                fontSize: "0.76rem",
                                fontWeight: isActive ? 700 : 500,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {pi + 1}
                            </button>
                          );
                        })}
                        <button
                          onClick={() =>
                            setTablePage((p) => Math.min(totalPages - 1, p + 1))
                          }
                          disabled={safePage === totalPages - 1}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            border: `1px solid ${safePage === totalPages - 1 ? ui.cardBorder : ui.metricBorder}`,
                            background: "transparent",
                            color:
                              safePage === totalPages - 1
                                ? ui.textMuted
                                : ui.textPrimary,
                            fontSize: "0.76rem",
                            fontWeight: 600,
                            cursor:
                              safePage === totalPages - 1
                                ? "not-allowed"
                                : "pointer",
                            opacity: safePage === totalPages - 1 ? 0.4 : 1,
                            fontFamily: "inherit",
                          }}
                        >
                          Next ›
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Recent Applications */}
              <Card ui={ui}>
                <div style={{ borderBottom: `1px solid ${ui.divider}` }}>
                  <CardHeader
                    title="Recent Applications"
                    sub="Access and manage your latest applications all in one place."
                    right={
                      <button
                        onClick={() => setShowRecentModal(true)}
                        style={{
                          background: "none",
                          border: "none",
                          color: FB,
                          fontSize: "0.84rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          padding: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        See all
                      </button>
                    }
                    ui={ui}
                  />
                </div>
                {recentLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "11px 16px",
                        borderBottom:
                          i < 4 ? `1px solid ${ui.divider}` : "none",
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          flexShrink: 0,
                          background: ui.progressBg,
                          animation: "cdrrPulse 1.2s ease-in-out infinite",
                        }}
                      />
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            width: 150,
                            height: 10,
                            borderRadius: 4,
                            background: ui.progressBg,
                            animation: "cdrrPulse 1.2s ease-in-out infinite",
                          }}
                        />
                        <div
                          style={{
                            width: 100,
                            height: 8,
                            borderRadius: 4,
                            background: ui.progressBg,
                            animation: "cdrrPulse 1.2s ease-in-out infinite",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          width: 75,
                          height: 22,
                          borderRadius: 99,
                          background: ui.progressBg,
                          animation: "cdrrPulse 1.2s ease-in-out infinite",
                          flexShrink: 0,
                        }}
                      />
                    </div>
                  ))}
                {!recentLoading && recentError && (
                  <div
                    style={{
                      padding: "1.5rem",
                      textAlign: "center",
                      color: "#e02020",
                      fontSize: "0.82rem",
                    }}
                  >
                    ⚠️ {recentError}{" "}
                    <button
                      onClick={fetchRecentApps}
                      style={{
                        background: "none",
                        border: "none",
                        color: FB,
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        fontFamily: "inherit",
                      }}
                    >
                      Retry
                    </button>
                  </div>
                )}
                {!recentLoading && !recentError && recentApps.length === 0 && (
                  <div
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: ui.textMuted,
                      fontSize: "0.82rem",
                    }}
                  >
                    No recent applications found.
                  </div>
                )}
                {!recentLoading &&
                  !recentError &&
                  recentApps.map((row, i, arr) => (
                    <div
                      key={row.log_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "11px 16px",
                        borderBottom:
                          i < arr.length - 1
                            ? `1px solid ${ui.divider}`
                            : "none",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = ui.hoverBg)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            background: row.status_bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.1rem",
                            flexShrink: 0,
                          }}
                        >
                          {row.icon}
                        </div>
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.86rem",
                              fontWeight: 600,
                              color: ui.textPrimary,
                            }}
                          >
                            {row.dtn}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.78rem",
                              color: ui.textSub,
                            }}
                          >
                            {row.brand_name}
                            {row.generic_name ? ` (${row.generic_name})` : ""}
                          </p>
                          {row.app_step && (
                            <p
                              style={{
                                margin: "2px 0 0",
                                fontSize: "0.72rem",
                                color: ui.textMuted,
                                display: "flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              <span style={{ fontSize: "0.65rem" }}>📌</span>
                              {row.app_step}
                            </p>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: isMobile ? 6 : 12,
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: row.status_color,
                            background: row.status_bg,
                            padding: "3px 10px",
                            borderRadius: 99,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.status_label}
                        </span>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            color: ui.textMuted,
                            minWidth: 40,
                            textAlign: "right",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.date_display}
                        </span>
                      </div>
                    </div>
                  ))}
              </Card>

              {isMobile && <RightPanel />}
            </div>

            {!isMobile && <RightPanel />}
          </div>
        </div>
      </div>
      {/* ── Modals ── */}
      <TargetModal
        target={activeTarget}
        onClose={() => setActiveTarget(null)}
        ui={ui}
      />
      {/* ── NEW: Metric Detail Modal ── */}

      {detailModal && (
        <MetricDetailModal
          metricKey={detailModal.metricKey}
          metricLabel={detailModal.metricLabel}
          dateParams={detailModal.dateParams}
          onClose={() => setDetailModal(null)}
          onRowClick={handleDetailRowClick}
          onViewLogs={(row) => setLogsModal({ dtn: row.dtn })} // ← dagdag
          ui={ui}
        />
      )}
      {/* ── View Details Modal (opens when row is clicked) ── */}
      {selectedDtnRecord && (
        <ViewDetailsModal
          record={selectedDtnRecord}
          onClose={() => setSelectedDtnRecord(null)}
          colors={ui} // ← ui ang variable ng DashboardPage
          darkMode={darkMode}
        />
      )}
      {showReport && (
        <AccomplishmentReport
          onClose={() => setShowReport(false)}
          totals={{
            received: liveStats?.received ?? chartTotals.received,
            completed: liveStats?.completed ?? chartTotals.completed,
            onProcess: liveStats?.on_process ?? chartTotals.onProcess,
          }}
          ui={ui}
          customDates={customReportDates}
        />
      )}
      {/* ── Recent Applications Modal ── */}
      {showRecentModal && (
        <RecentApplicationsModal
          onClose={() => setShowRecentModal(false)}
          onRowClick={handleDetailRowClick}
          ui={ui}
        />
      )}
      {logsModal && (
        <ApplicationLogsModal
          record={{ dtn: logsModal.dtn }}
          onClose={() => setLogsModal(null)}
          darkMode={darkMode}
          colors={ui}
        />
      )}
    </>
  );
}
