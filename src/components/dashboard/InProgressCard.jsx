import { useState, useEffect, useCallback } from "react";
import { Card } from "./CardPrimitives";
import { getDashboardInProgressByYear } from "../../api/dashboard";

const BLUE = "#1877F2";
const YEAR_COLORS = [
  "#1877F2",
  "#f59e0b",
  "#8b5cf6",
  "#36a420",
  "#ec4899",
  "#06b6d4",
  "#ef4444",
  "#84cc16",
];
const NO_STEP = "No step";

// onYearClick(year | null, step | undefined)
export default function InProgressCard({ ui, onYearClick }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getDashboardInProgressByYear());
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const years = data?.years ?? [];
  const total = data?.total ?? 0;
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <Card ui={ui}>
      <div style={{ padding: "14px 16px" }}>
        <h3
          style={{
            margin: 0,
            fontSize: "0.95rem",
            fontWeight: 700,
            color: ui.textPrimary,
          }}
        >
          In Progress by Year
        </h3>
        <p
          style={{
            margin: "2px 0 14px",
            fontSize: "0.72rem",
            color: ui.textMuted,
          }}
        >
          Your open tasks, by year received at central
        </p>

        {loading && (
          <div
            style={{
              padding: "1.5rem 0",
              color: ui.textMuted,
              fontSize: "0.82rem",
            }}
          >
            ⏳ Loading…
          </div>
        )}

        {!loading && error && (
          <div style={{ color: "#e02020", fontSize: "0.82rem" }}>
            ⚠️ {error}{" "}
            <button
              onClick={load}
              style={{
                background: "none",
                border: "none",
                color: BLUE,
                cursor: "pointer",
                fontWeight: 700,
                fontFamily: "inherit",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && data && years.length === 0 && (
          <span style={{ fontSize: "0.82rem", color: ui.textMuted }}>
            No in-progress tasks 🎉
          </span>
        )}

        {!loading && !error && data && years.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            {/* Donut */}
            <svg
              width="170"
              height="170"
              viewBox="0 0 140 140"
              style={{ flexShrink: 0 }}
            >
              <circle
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={ui.progressBg}
                strokeWidth="16"
              />
              {years.map((y, i) => {
                const len = (y.count / total) * C;
                const color = YEAR_COLORS[i % YEAR_COLORS.length];
                const dim = hover !== null && hover !== y.year;
                const el = (
                  <circle
                    key={y.year}
                    cx="70"
                    cy="70"
                    r={R}
                    fill="none"
                    stroke={color}
                    strokeWidth={hover === y.year ? 19 : 16}
                    strokeDasharray={`${len} ${C - len}`}
                    strokeDashoffset={-offset}
                    transform="rotate(-90 70 70)"
                    opacity={dim ? 0.35 : 1}
                    style={{ cursor: "pointer", transition: "all 0.12s" }}
                    onMouseEnter={() => setHover(y.year)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => onYearClick?.(y.year)}
                  >
                    <title>{`${y.year}: ${y.count} in progress`}</title>
                  </circle>
                );
                offset += len;
                return el;
              })}
              <text
                x="70"
                y="68"
                textAnchor="middle"
                fontSize="22"
                fontWeight="800"
                fill={ui.textPrimary}
                style={{ cursor: "pointer" }}
                onClick={() => onYearClick?.(null)}
              >
                {total.toLocaleString()}
              </text>
              <text
                x="70"
                y="84"
                textAnchor="middle"
                fontSize="7"
                fill={ui.textMuted}
              >
                IN PROGRESS
              </text>
            </svg>

            {/* Legend: year rows with a per-step breakdown underneath */}
            <div
              style={{
                flex: 1,
                minWidth: 220,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                maxHeight: 360,
                overflowY: "auto",
              }}
            >
              {years.map((y, i) => {
                const color = YEAR_COLORS[i % YEAR_COLORS.length];
                const pct = ((y.count / total) * 100).toFixed(1);
                return (
                  <div key={y.year}>
                    <div
                      onClick={() => onYearClick?.(y.year)}
                      onMouseEnter={() => setHover(y.year)}
                      onMouseLeave={() => setHover(null)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "6px 8px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: "0.84rem",
                        fontWeight: 700,
                        background:
                          hover === y.year ? ui.hoverBg : "transparent",
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: ui.textPrimary, flex: 1 }}>
                        {y.year}
                      </span>
                      <span style={{ color }}>{y.count.toLocaleString()}</span>
                      <span
                        style={{
                          color: ui.textMuted,
                          fontSize: "0.72rem",
                          fontWeight: 400,
                          minWidth: 44,
                          textAlign: "right",
                        }}
                      >
                        {pct}%
                      </span>
                    </div>

                    {(y.steps ?? []).map((s) => {
                      const clickable = s.step !== NO_STEP;
                      return (
                        <div
                          key={s.step}
                          onClick={() =>
                            clickable && onYearClick?.(y.year, s.step)
                          }
                          onMouseEnter={(e) => {
                            setHover(y.year);
                            if (clickable)
                              e.currentTarget.style.background = ui.hoverBg;
                          }}
                          onMouseLeave={(e) => {
                            setHover(null);
                            e.currentTarget.style.background = "transparent";
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            padding: "3px 8px 3px 28px",
                            borderRadius: 6,
                            cursor: clickable ? "pointer" : "default",
                            fontSize: "0.78rem",
                          }}
                        >
                          <span style={{ color: ui.textSub }}>{s.step}</span>
                          <span
                            style={{ color: ui.textPrimary, fontWeight: 600 }}
                          >
                            {s.count.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
