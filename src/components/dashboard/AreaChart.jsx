import { useState } from "react";
import { SERIES } from "./constants";

export default function AreaChart({ data, subtitle, ui }) {
  const [hov, setHov] = useState(null);

  const W = 700, H = 200;
  const PAD = { top: 18, right: 16, bottom: 28, left: 44 };
  const cW = W - PAD.left - PAD.right, cH = H - PAD.top - PAD.bottom;

  const allVals = data.flatMap((d) => SERIES.map((s) => d[s.key] ?? 0));
  const maxV = (Math.max(0, ...allVals) || 1) * 1.18;

  const toX = (i) => PAD.left + (i / Math.max(data.length - 1, 1)) * cW;
  const toY = (v) => PAD.top + cH - (v / maxV) * cH;

  const yticks     = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxV * f));
  const xstep      = Math.max(1, Math.ceil(data.length / 10));
  const showLabels = data.length <= 12;

  return (
    <div>
      {/* Legend + subtitle */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          marginBottom:   8,
          flexWrap:       "wrap",
          gap:            6,
        }}
      >
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {SERIES.map((s) => (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
              <span style={{ fontSize: "0.72rem", color: ui.textSub }}>{s.label}</span>
            </div>
          ))}
        </div>
        {subtitle && (
          <span style={{ fontSize: "0.72rem", color: ui.textMuted, fontStyle: "italic" }}>
            📅 {subtitle}
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
      >
        <defs>
          {SERIES.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={s.color} stopOpacity="0.13" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0"    />
            </linearGradient>
          ))}
        </defs>

        {/* Y-axis gridlines */}
        {yticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={toY(t)} x2={W - PAD.right} y2={toY(t)}
              stroke={ui.gridLine} strokeWidth="1" />
            <text x={PAD.left - 5} y={toY(t) + 4} textAnchor="end"
              fill={ui.textMuted} fontSize="9.5">
              {t}
            </text>
          </g>
        ))}

        {/* Area fills */}
        {SERIES.filter((s) => !s.dashed).map((s) => {
          const pts  = data.map((d, i) => `${toX(i)},${toY(d[s.key] ?? 0)}`).join(" ");
          const area = `${PAD.left},${PAD.top + cH} ${pts} ${toX(data.length - 1)},${PAD.top + cH}`;
          return <polygon key={s.key} points={area} fill={`url(#grad-${s.key})`} />;
        })}

        {/* Lines */}
        {SERIES.map((s) => {
          const pts = data.map((d, i) => `${toX(i)},${toY(d[s.key] ?? 0)}`).join(" ");
          return (
            <polyline key={s.key} points={pts} fill="none"
              stroke={s.color} strokeWidth={s.dashed ? 1.5 : 2}
              strokeDasharray={s.dashed ? "5 3" : undefined}
              strokeLinejoin="round" strokeLinecap="round"
              opacity={s.dashed ? 0.75 : 1} />
          );
        })}

        {/* X-axis labels */}
        {data.map(
          (d, i) =>
            i % xstep === 0 && (
              <text key={i} x={toX(i)} y={H - 3} textAnchor="middle"
                fill={ui.textMuted} fontSize="9">
                {d.label}
              </text>
            ),
        )}

        {/* Value labels on data points */}
        {showLabels &&
          data.map((d, i) =>
            SERIES.filter((s) => !s.dashed).map((s) => {
              const x = toX(i), y = toY(d[s.key] ?? 0);
              const yOff = s.key === "received" ? -10 : s.key === "completed" ? -4 : 13;
              return (
                <text key={s.key} x={x} y={y + yOff} textAnchor="middle"
                  fill={s.color} fontSize="8.5" fontWeight="700"
                  style={{ pointerEvents: "none" }}>
                  {d[s.key]}
                </text>
              );
            }),
          )}

        {/* Hover overlay */}
        {data.map((d, i) => (
          <g key={i}>
            <rect x={toX(i) - 16} y={PAD.top} width={32} height={cH}
              fill="transparent"
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)} />
            {hov === i &&
              (() => {
                const tipW = 132, tipH = 84;
                const tipX = toX(i) > W * 0.65 ? toX(i) - tipW - 10 : toX(i) + 10;
                const tipY = PAD.top + 2;
                return (
                  <g>
                    <line x1={toX(i)} y1={PAD.top} x2={toX(i)} y2={PAD.top + cH}
                      stroke={ui.gridLine} strokeWidth="1" strokeDasharray="4 3" />
                    {SERIES.map((s) => (
                      <circle key={s.key} cx={toX(i)} cy={toY(d[s.key] ?? 0)} r="3.5"
                        fill={s.color} stroke={ui.cardBg} strokeWidth="2" />
                    ))}
                    <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={6}
                      fill={ui.cardBg} stroke={ui.cardBorder} strokeWidth="1"
                      style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,.22))" }} />
                    <text x={tipX + 8} y={tipY + 13} fill={ui.textMuted} fontSize="9" fontWeight="600">
                      {d.label}{subtitle ? ` · ${subtitle}` : ""}
                    </text>
                    {SERIES.map((s, si) => (
                      <g key={s.key}>
                        <circle cx={tipX + 11} cy={tipY + 24 + si * 16} r="3" fill={s.color} />
                        <text x={tipX + 19} y={tipY + 28 + si * 16} fill={ui.textSub} fontSize="9">
                          {s.label}:
                        </text>
                        <text x={tipX + tipW - 6} y={tipY + 28 + si * 16}
                          textAnchor="end" fill={s.color} fontSize="9" fontWeight="700">
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
