import { useEffect, useState } from "react";
import { getCmdrFacets, getCmdrTrend } from "../../api/cmdr";
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

const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const name = new Date(y, m - 1, 1).toLocaleString("en", { month: "short" });
  return `${name} '${String(y).slice(2)}`;
};

function TrendChart({ data, months, onMonthsChange, colors }) {
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

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label="Received versus completed applications per month"
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
                fill={colors.textTertiary}
              >
                {monthLabel(d.month)}
              </text>
            ),
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
                r="3.5"
                fill={s.color}
              >
                <title>{`${monthLabel(d.month)} — ${s.label}: ${d[s.key].toLocaleString()}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

function CmdrMonitoring({ colors }) {
  const [facets, setFacets] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    getCmdrFacets(NO_FILTERS, { signal: controller.signal })
      .then(setFacets)
      .catch((err) => {
        if (
          err?.code === "ERR_CANCELED" ||
          err?.name === "CanceledError" ||
          err?.name === "AbortError"
        )
          return;
        setError(err?.message || "Could not load monitoring data.");
      });
    return () => controller.abort();
  }, [reloadKey]);

  const [months, setMonths] = useState(12);
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    getCmdrTrend({ months }, { signal: controller.signal })
      .then(setTrend)
      .catch(() => setTrend([]));
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
        colors={colors}
      />
    </div>
  );
}

export default CmdrMonitoring;
