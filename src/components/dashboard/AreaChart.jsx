import { useState } from "react";
import { SERIES } from "./constants";

// Monotone cubic interpolation — smooth curves that never overshoot the data
// (so a line going to 0 won't dip below the axis).
function smoothPath(pts) {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx = [],
    m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    m[i] = (pts[i + 1][1] - pts[i][1]) / (dx[i] || 1);
  }
  const t = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) t[i] = 0;
    else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      t[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]);
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

export default function AreaChart({ data, subtitle, ui }) {
  const [hov, setHov] = useState(null);

  const W = 700,
    H = 230;
  const PAD = { top: 18, right: 16, bottom: 28, left: 44 };
  const cW = W - PAD.left - PAD.right,
    cH = H - PAD.top - PAD.bottom;

  const allVals = data.flatMap((d) => SERIES.map((s) => d[s.key] ?? 0));
  const maxV = (Math.max(0, ...allVals) || 1) * 1.18;

  const toX = (i) => PAD.left + (i / Math.max(data.length - 1, 1)) * cW;
  const toY = (v) => PAD.top + cH - (v / maxV) * cH;

  const yticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxV * f));
  const xstep = Math.max(1, Math.ceil(data.length / 10));

  // Each point gets a full-width hover column (midpoint to midpoint) that also
  // covers the month label, so pointing at a month — or anywhere above it —
  // opens its details.
  const colW = data.length > 1 ? cW / (data.length - 1) : cW;
  const colX = (i) => {
    const left = Math.max(PAD.left, toX(i) - colW / 2);
    const right = Math.min(W - PAD.right, toX(i) + colW / 2);
    return { x: left, w: right - left };
  };

  return (
    <div>
      {/* Legend + subtitle */}
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
        onMouseLeave={() => setHov(null)}
      >
        {/* Y-axis gridlines */}
        {yticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={toY(t)}
              x2={W - PAD.right}
              y2={toY(t)}
              stroke={ui.gridLine}
              strokeWidth="1"
              strokeDasharray="3 4"
              opacity="0.9"
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

        {/* Lines (smooth curves) */}
        {SERIES.map((s) => {
          const pts = data.map((d, i) => [toX(i), toY(d[s.key] ?? 0)]);
          return (
            <path
              key={s.key}
              d={smoothPath(pts)}
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

        {/* X-axis labels (highlighted while hovered) */}
        {data.map(
          (d, i) =>
            (i % xstep === 0 || hov === i) && (
              <text
                key={i}
                x={toX(i)}
                y={H - 3}
                textAnchor="middle"
                fill={hov === i ? ui.textPrimary : ui.textMuted}
                fontSize="9"
                fontWeight={hov === i ? 700 : 400}
              >
                {d.label}
              </text>
            ),
        )}

        {/* Hover columns (cover plot area + month label) */}
        {data.map((d, i) => {
          const { x, w } = colX(i);
          return (
            <rect
              key={i}
              x={x}
              y={PAD.top}
              width={w}
              height={H - PAD.top}
              fill={hov === i ? `${ui.gridLine}66` : "transparent"}
              style={{ cursor: "crosshair" }}
              onMouseEnter={() => setHov(i)}
            />
          );
        })}

        {/* Hover details — drawn last and non-interactive so it never flickers */}
        {hov !== null &&
          data[hov] &&
          (() => {
            const d = data[hov],
              i = hov;
            const tipW = 132,
              tipH = 84;
            const tipX = toX(i) > W * 0.65 ? toX(i) - tipW - 10 : toX(i) + 10;
            const tipY = PAD.top + 2;
            return (
              <g style={{ pointerEvents: "none" }}>
                <line
                  x1={toX(i)}
                  y1={PAD.top}
                  x2={toX(i)}
                  y2={PAD.top + cH}
                  stroke={ui.textMuted}
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
                  style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,.22))" }}
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
      </svg>
    </div>
  );
}
