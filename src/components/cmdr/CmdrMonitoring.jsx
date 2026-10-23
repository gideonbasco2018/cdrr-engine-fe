import { useEffect, useRef, useState } from "react";
import {
  getCmdrFacets,
  getCmdrTrend,
  getCmdrTrendApplications,
} from "../../api/cmdr";
import TablePagination from "../reports/TablePagination";
import DoctrackModal from "../reports/actions/DoctrackModal";

const NO_FILTERS = {
  search: "",
  app_status: null,
  type_application: null,
  application_option: null,
  cmdr_type: [],
};

const KIND_LABELS = {
  initial: "Initial",
  initial_abridge: "Initial (Abridged)",
  renewal: "Renewal",
  amendment: "Amendment",
};

const BAR_COLORS = [
  "#6366f1",
  "#0891b2",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#14b8a6",
  "#f97316",
];

const sum = (items) => items.reduce((s, i) => s + i.count, 0);

const isCanceled = (err) =>
  err?.code === "ERR_CANCELED" ||
  err?.name === "CanceledError" ||
  err?.name === "AbortError";

const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const name = new Date(y, m - 1, 1).toLocaleString("en", { month: "short" });
  return `${name} '${String(y).slice(2)}`;
};

/* ───────────────────────── KPI + bars ───────────────────────── */

function KpiCard({ label, value, colors }) {
  return (
    <div
      style={{
        flex: "1 1 180px",
        padding: "0.85rem 1rem",
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 12,
      }}
    >
      <div
        style={{
          fontSize: "0.58rem",
          fontWeight: 600,
          color: colors.textTertiary,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "1.4rem",
          fontWeight: 700,
          color: colors.textPrimary,
          marginTop: 4,
        }}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function BarList({ title, items, labelOf = (v) => v, colors }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div
      style={{
        flex: "1 1 320px",
        padding: "0.85rem 1rem",
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 12,
      }}
    >
      <h3
        style={{
          margin: "0 0 0.75rem",
          fontSize: "0.75rem",
          fontWeight: 700,
          color: colors.textPrimary,
        }}
      >
        {title}
      </h3>
      {items.length === 0 && (
        <div style={{ fontSize: "0.72rem", color: colors.textTertiary }}>
          No data
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item, i) => (
          <div key={item.value}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.68rem",
                color: colors.textSecondary,
                marginBottom: 3,
              }}
            >
              <span>{labelOf(item.value)}</span>
              <strong style={{ color: colors.textPrimary }}>
                {item.count.toLocaleString()}
              </strong>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: colors.cardBorder,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(item.count / max) * 100}%`,
                  background: BAR_COLORS[i % BAR_COLORS.length],
                  borderRadius: 3,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── trend chart ───────────────────────── */

function TrendChart({ data, months, onMonthsChange, onSelect, colors }) {
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);

  const W = 800;
  const H = 280;
  const L = 44;
  const R = 16;
  const T = 16;
  const B = 36;
  const innerW = W - L - R;
  const innerH = H - T - B;

  const rawMax = Math.max(1, ...data.flatMap((d) => [d.received, d.completed]));
  const yMax = rawMax < 10 ? rawMax + 1 : Math.ceil((rawMax * 1.1) / 10) * 10;
  const x = (i) =>
    L + (data.length === 1 ? innerW / 2 : (i * innerW) / (data.length - 1));
  const y = (v) => T + innerH - (v / yMax) * innerH;
  const line = (key) => data.map((d, i) => `${x(i)},${y(d[key])}`).join(" ");
  const colW = data.length > 1 ? innerW / (data.length - 1) : innerW;

  const totalReceived = data.reduce((s, d) => s + d.received, 0);
  const totalCompleted = data.reduce((s, d) => s + d.completed, 0);
  const labelEvery = data.length > 12 ? 2 : 1;

  const series = [
    {
      key: "received",
      label: "Received",
      color: "#6366f1",
      total: totalReceived,
    },
    {
      key: "completed",
      label: "Completed",
      color: "#10b981",
      total: totalCompleted,
    },
  ];

  // click anywhere in a month column -> open the series whose dot is closer to the click
  const handleColumnClick = (e, i) => {
    const rect = svgRef.current.getBoundingClientRect();
    const svgY = ((e.clientY - rect.top) / rect.height) * H;
    const d = data[i];
    const metric =
      Math.abs(svgY - y(d.received)) <= Math.abs(svgY - y(d.completed))
        ? "received"
        : "completed";
    onSelect(d.month, metric);
  };

  const tooltipShift =
    hover === null
      ? "-50%"
      : hover < 2
        ? "-10%"
        : hover > data.length - 3
          ? "-90%"
          : "-50%";

  return (
    <div
      style={{
        padding: "0.85rem 1rem",
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "0.5rem",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "0.75rem",
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            Received vs Completed
          </h3>
          <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
            {series.map((s) => (
              <span
                key={s.key}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.68rem",
                  color: colors.textSecondary,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: s.color,
                  }}
                />
                {s.label}:{" "}
                <strong style={{ color: colors.textPrimary }}>
                  {s.total.toLocaleString()}
                </strong>
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.62rem", color: colors.textTertiary }}>
            Click a month to see the applications
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {[6, 12, 24].map((m) => (
              <button
                key={m}
                onClick={() => onMonthsChange(m)}
                style={{
                  padding: "3px 10px",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  borderRadius: 6,
                  cursor: "pointer",
                  border: `1px solid ${colors.cardBorder}`,
                  background: months === m ? "#6366f1" : "transparent",
                  color: months === m ? "#fff" : colors.textTertiary,
                }}
              >
                {m}M
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: "auto", display: "block" }}
          role="img"
          aria-label="Received versus completed applications per month"
          onMouseLeave={() => setHover(null)}
        >
          {[0, 1, 2, 3, 4].map((i) => {
            const v = Math.round((yMax * i) / 4);
            return (
              <g key={i}>
                <line
                  x1={L}
                  x2={W - R}
                  y1={y(v)}
                  y2={y(v)}
                  stroke={colors.cardBorder}
                  strokeWidth="1"
                />
                <text
                  x={L - 8}
                  y={y(v) + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill={colors.textTertiary}
                >
                  {v.toLocaleString()}
                </text>
              </g>
            );
          })}

          {data.map(
            (d, i) =>
              i % labelEvery === 0 && (
                <text
                  key={d.month}
                  x={x(i)}
                  y={H - 12}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={hover === i ? 700 : 400}
                  fill={hover === i ? colors.textPrimary : colors.textTertiary}
                >
                  {monthLabel(d.month)}
                </text>
              ),
          )}

          {hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={T}
              y2={T + innerH}
              stroke={colors.textTertiary}
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.6"
            />
          )}

          {series.map((s) => (
            <g key={s.key}>
              <polyline
                points={line(s.key)}
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {data.map((d, i) => (
                <circle
                  key={d.month}
                  cx={x(i)}
                  cy={y(d[s.key])}
                  r={hover === i ? 6 : 3.5}
                  fill={s.color}
                  stroke={hover === i ? colors.cardBg : "none"}
                  strokeWidth="2"
                  style={{ pointerEvents: "none", transition: "r 0.1s" }}
                />
              ))}
            </g>
          ))}

          {/* invisible hit areas: one full-height column per month */}
          {data.map((d, i) => (
            <rect
              key={d.month}
              x={x(i) - colW / 2}
              y={T}
              width={colW}
              height={innerH}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover(i)}
              onClick={(e) => handleColumnClick(e, i)}
            />
          ))}
        </svg>

        {hover !== null && data[hover] && (
          <div
            style={{
              position: "absolute",
              top: 4,
              left: `${(x(hover) / W) * 100}%`,
              transform: `translateX(${tooltipShift})`,
              pointerEvents: "none",
              padding: "8px 12px",
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 8,
              boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
              minWidth: 140,
              zIndex: 5,
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: colors.textPrimary,
                marginBottom: 6,
              }}
            >
              {monthLabel(data[hover].month)}
            </div>
            {series.map((s) => (
              <div
                key={s.key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  fontSize: "0.68rem",
                  color: colors.textSecondary,
                  marginTop: 2,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: s.color,
                    }}
                  />
                  {s.label}
                </span>
                <strong style={{ color: colors.textPrimary }}>
                  {data[hover][s.key].toLocaleString()}
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── month applications modal ───────────────────────── */

function TrendApplicationsModal({
  month,
  initialMetric,
  counts,
  onClose,
  colors,
}) {
  const [metric, setMetric] = useState(initialMetric);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [doctrack, setDoctrack] = useState(null); // { dtn }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getCmdrTrendApplications(
      { month, metric, skip: (page - 1) * rowsPerPage, limit: rowsPerPage },
      { signal: controller.signal },
    )
      .then((res) => {
        setRows(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        if (isCanceled(err)) return;
        setRows([]);
        setTotal(0);
        setError(err?.detail || err?.message || "Could not load applications.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, metric, page, rowsPerPage]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !doctrack) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, doctrack]);

  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const first = (page - 1) * rowsPerPage + 1;
  const last = Math.min(page * rowsPerPage, total);
  const dateKey =
    metric === "completed" ? "DATE_DOC_RELEASING_END" : "DATE_RECEIVED_FDAC";
  const dateLabel = metric === "completed" ? "Date Completed" : "Date Received";

  const th = {
    padding: "0.45rem 0.6rem",
    fontSize: "0.55rem",
    fontWeight: 600,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: `1px solid ${colors.tableBorder}`,
    whiteSpace: "nowrap",
    background: colors.tableBg,
    textAlign: "left",
    position: "sticky",
    top: 0,
  };
  const td = {
    padding: "0.4rem 0.6rem",
    fontSize: "0.72rem",
    color: colors.tableText,
    borderBottom: `1px solid ${colors.tableBorder}`,
  };

  const tabs = [
    { id: "received", label: "Received", color: "#6366f1" },
    { id: "completed", label: "Completed", color: "#10b981" },
  ];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9990,
          padding: "1rem",
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 14,
            width: "min(1100px, 100%)",
            height: "85vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            color: colors.textPrimary,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.9rem 1.25rem",
              borderBottom: `1px solid ${colors.cardBorder}`,
            }}
          >
            <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
              Applications — {monthLabel(month)}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 28,
                height: 28,
                background: "transparent",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 6,
                color: colors.textTertiary,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <div
            role="tablist"
            style={{
              display: "flex",
              padding: "0 0.75rem",
              borderBottom: `1px solid ${colors.cardBorder}`,
            }}
          >
            {tabs.map((t) => {
              const active = metric === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setMetric(t.id);
                    setPage(1);
                  }}
                  style={{
                    padding: "8px 14px",
                    fontSize: "12px",
                    background: "transparent",
                    border: "none",
                    borderBottom: active
                      ? `2px solid ${t.color}`
                      : "2px solid transparent",
                    color: active ? colors.textPrimary : colors.textTertiary,
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    position: "relative",
                    top: 1,
                  }}
                >
                  {t.label}
                  <span
                    style={{
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 999,
                      background: active ? t.color : colors.badgeBg,
                      color: active ? "#fff" : colors.textTertiary,
                      fontWeight: 600,
                    }}
                  >
                    {(counts?.[t.id] ?? 0).toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            {error && (
              <div
                role="alert"
                style={{
                  margin: "1rem",
                  padding: "0.6rem 0.85rem",
                  borderRadius: 8,
                  border: "1px solid #ef4444",
                  background: "rgba(239,68,68,0.1)",
                  color: "#ef4444",
                  fontSize: "0.75rem",
                }}
              >
                {error}
              </div>
            )}
            {loading && (
              <p
                style={{
                  textAlign: "center",
                  padding: "2rem",
                  fontSize: "0.75rem",
                  color: colors.textTertiary,
                }}
              >
                Loading applications…
              </p>
            )}
            {!loading && !error && rows.length === 0 && (
              <p
                style={{
                  textAlign: "center",
                  padding: "2rem",
                  fontSize: "0.75rem",
                  color: colors.textTertiary,
                }}
              >
                No applications for this month.
              </p>
            )}
            {!loading && rows.length > 0 && (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 900,
                }}
              >
                <thead>
                  <tr>
                    <th style={{ ...th, textAlign: "center", width: 40 }}>#</th>
                    <th style={th}>Kind</th>
                    <th style={th}>App No.</th>
                    <th style={th}>DTN</th>
                    <th style={th}>Company</th>
                    <th style={th}>Application Type</th>
                    <th style={th}>Status</th>
                    <th style={th}>{dateLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={`${row.CMDR_TYPE}-${row.APP_UID}`}
                      style={{
                        background:
                          i % 2 === 0
                            ? colors.tableRowEven
                            : colors.tableRowOdd,
                      }}
                    >
                      <td
                        style={{
                          ...td,
                          textAlign: "center",
                          fontWeight: 700,
                          color: colors.textTertiary,
                        }}
                      >
                        {first + i}
                      </td>
                      <td style={td}>
                        {KIND_LABELS[row.CMDR_TYPE] || row.CMDR_TYPE}
                      </td>
                      <td style={td}>{row.APP_NUMBER ?? "—"}</td>
                      <td style={td}>
                        {row.DTN ? (
                          <button
                            type="button"
                            onClick={() => setDoctrack({ dtn: row.DTN })}
                            title="View document tracking"
                            style={{
                              padding: 0,
                              background: "transparent",
                              border: "none",
                              color: "#3b82f6",
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              textDecoration: "underline",
                              textUnderlineOffset: 2,
                            }}
                          >
                            {row.DTN}
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={td}>{row.COMPANY_NAME || "—"}</td>
                      <td style={td}>{row.TYPE_APPLICATION || "—"}</td>
                      <td style={td}>
                        {row.APP_STATUS
                          ? String(row.APP_STATUS).replace(/_/g, " ")
                          : "—"}
                      </td>
                      <td style={td}>
                        {row[dateKey] ? String(row[dateKey]).slice(0, 10) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div
            style={{
              flexShrink: 0,
              borderTop: `1px solid ${colors.tableBorder}`,
              background: colors.cardBg,
            }}
          >
            <TablePagination
              currentPage={page}
              rowsPerPage={rowsPerPage}
              totalRecords={total}
              totalPages={totalPages}
              indexOfFirstRow={first}
              indexOfLastRow={last}
              onPageChange={setPage}
              onRowsPerPageChange={(v) => {
                setRowsPerPage(Math.min(Number(v), 200));
                setPage(1);
              }}
              colors={colors}
            />
          </div>
        </div>
      </div>

      {doctrack && (
        <DoctrackModal
          record={doctrack}
          onClose={() => setDoctrack(null)}
          colors={colors}
        />
      )}
    </>
  );
}

/* ───────────────────────── page ───────────────────────── */

function CmdrMonitoring({ colors }) {
  const [facets, setFacets] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [months, setMonths] = useState(12);
  const [trend, setTrend] = useState([]);
  const [selected, setSelected] = useState(null); // { month, metric }

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    getCmdrFacets(NO_FILTERS, { signal: controller.signal })
      .then(setFacets)
      .catch((err) => {
        if (isCanceled(err)) return;
        setError(
          err?.detail || err?.message || "Could not load monitoring data.",
        );
      });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    getCmdrTrend({ months }, { signal: controller.signal })
      .then(setTrend)
      .catch((err) => {
        if (!isCanceled(err)) setTrend([]);
      });
    return () => controller.abort();
  }, [months, reloadKey]);

  if (error) {
    return (
      <div style={{ padding: "1rem 1.5rem" }}>
        <div
          role="alert"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.6rem 0.85rem",
            borderRadius: 10,
            border: "1px solid #ef4444",
            background: "rgba(239,68,68,0.1)",
            color: "#ef4444",
            fontSize: "0.75rem",
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            style={{
              padding: "4px 10px",
              background: "transparent",
              border: "1px solid #ef4444",
              borderRadius: 6,
              color: "#ef4444",
              fontSize: "0.7rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!facets) {
    return (
      <div
        style={{
          padding: "3rem",
          textAlign: "center",
          fontSize: "0.75rem",
          color: colors.textTertiary,
        }}
      >
        Loading monitoring data…
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "1rem 1.5rem",
        background: colors.pageBg,
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <KpiCard
          label="Total Applications"
          value={sum(facets.cmdr_type)}
          colors={colors}
        />
        {facets.cmdr_type.map((k) => (
          <KpiCard
            key={k.value}
            label={KIND_LABELS[k.value] || k.value}
            value={k.count}
            colors={colors}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <BarList
          title="By Kind"
          items={facets.cmdr_type}
          labelOf={(v) => KIND_LABELS[v] || v}
          colors={colors}
        />
        <BarList
          title="By Status"
          items={facets.app_status}
          labelOf={(v) => String(v).replace(/_/g, " ")}
          colors={colors}
        />
      </div>

      <TrendChart
        data={trend}
        months={months}
        onMonthsChange={setMonths}
        onSelect={(month, metric) => setSelected({ month, metric })}
        colors={colors}
      />

      {selected && (
        <TrendApplicationsModal
          key={selected.month}
          month={selected.month}
          initialMetric={selected.metric}
          counts={trend.find((t) => t.month === selected.month)}
          onClose={() => setSelected(null)}
          colors={colors}
        />
      )}
    </div>
  );
}

export default CmdrMonitoring;
