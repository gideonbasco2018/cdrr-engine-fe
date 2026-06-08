import { useState } from "react";
import { neuCardBg, neuInputShadow } from "./analyticsHelpers";
import { FB } from "./analyticsConstants";

export function MiniBar({ value, max, color, darkMode }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div
      style={{
        flex: 1,
        height: 8,
        borderRadius: 99,
        boxShadow: neuInputShadow(darkMode),
        overflow: "hidden",
        background: neuCardBg(darkMode),
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: 99,
          background: color,
          transition: "width 0.6s ease",
        }}
      />
    </div>
  );
}

export function TrendChart({ data, ui, darkMode }) {
  const [hov, setHov] = useState(null);
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: ui.textMuted,
          fontSize: "0.84rem",
        }}
      >
        No trend data available
      </div>
    );
  }
  const W = 680,
    H = 200;
  const PAD = { top: 20, right: 20, bottom: 30, left: 44 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const series = [
    { key: "cpr", color: "#36a420", label: "CPR" },
    { key: "lod", color: "#e02020", label: "LOD" },
    { key: "on_process", color: "#f59e0b", label: "On Process" },
    { key: "completed", color: FB, label: "Completed" },
  ];
  const maxVal =
    Math.max(...data.flatMap((d) => series.map((s) => d[s.key] ?? 0)), 1) * 1.2;
  const toX = (i) => PAD.left + (i / Math.max(data.length - 1, 1)) * cW;
  const toY = (v) => PAD.top + cH - (v / maxVal) * cH;
  const yticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxVal * f));
  function makePath(s) {
    const pts = data.map((d, i) => [toX(i), toY(d[s.key] ?? 0)]);
    if (pts.length < 2) return "";
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i],
        [x1, y1] = pts[i + 1];
      const cpx = (x0 + x1) / 2;
      d += ` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`;
    }
    return d;
  }
  return (
    <div>
      <div
        style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}
      >
        {series.map((s) => (
          <div
            key={s.key}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <div
              style={{
                width: 20,
                height: 3,
                borderRadius: 99,
                background: s.color,
              }}
            />
            <span
              style={{
                fontSize: "0.72rem",
                color: ui.textMuted,
                fontWeight: 500,
              }}
            >
              {s.label}
            </span>
          </div>
        ))}
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
        {yticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={toY(t)}
              x2={W - PAD.right}
              y2={toY(t)}
              stroke={darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}
              strokeWidth={i === 0 ? 1.5 : 0.75}
              strokeDasharray={i === 0 ? "none" : "3 4"}
            />
            <text
              x={PAD.left - 7}
              y={toY(t) + 4}
              textAnchor="end"
              fill={ui.textMuted}
              fontSize="9"
              fontWeight="500"
            >
              {t}
            </text>
          </g>
        ))}
        {series.map((s) => (
          <path
            key={s.key}
            d={makePath(s)}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {data.map((d, i) => (
          <g key={i}>
            <rect
              x={toX(i) - cW / data.length / 2}
              y={PAD.top}
              width={cW / data.length}
              height={cH}
              fill="transparent"
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
            />
            {hov === i && (
              <>
                <line
                  x1={toX(i)}
                  y1={PAD.top}
                  x2={toX(i)}
                  y2={PAD.top + cH}
                  stroke={ui.textMuted}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.5}
                />
                {series.map((s) => (
                  <circle
                    key={s.key}
                    cx={toX(i)}
                    cy={toY(d[s.key] ?? 0)}
                    r={4}
                    fill={s.color}
                    stroke={neuCardBg(darkMode)}
                    strokeWidth={2}
                  />
                ))}
                <g>
                  <rect
                    x={toX(i) > W * 0.65 ? toX(i) - 130 : toX(i) + 10}
                    y={PAD.top + 4}
                    width={120}
                    height={18 + series.length * 18 + 8}
                    rx={10}
                    fill={neuCardBg(darkMode)}
                    stroke="none"
                    filter="url(#neuTooltip)"
                  />
                  <text
                    x={toX(i) > W * 0.65 ? toX(i) - 70 : toX(i) + 70}
                    y={PAD.top + 17}
                    textAnchor="middle"
                    fill={FB}
                    fontSize={9.5}
                    fontWeight={700}
                  >
                    {d.label}
                  </text>
                  {series.map((s, si) => (
                    <g key={s.key}>
                      <circle
                        cx={toX(i) > W * 0.65 ? toX(i) - 118 : toX(i) + 22}
                        cy={PAD.top + 28 + si * 18}
                        r={3}
                        fill={s.color}
                      />
                      <text
                        x={toX(i) > W * 0.65 ? toX(i) - 112 : toX(i) + 28}
                        y={PAD.top + 32 + si * 18}
                        fill={ui.textSub}
                        fontSize={8.5}
                      >
                        {s.label}
                      </text>
                      <text
                        x={toX(i) > W * 0.65 ? toX(i) - 18 : toX(i) + 122}
                        y={PAD.top + 32 + si * 18}
                        textAnchor="end"
                        fill={s.color}
                        fontSize={9}
                        fontWeight={700}
                      >
                        {d[s.key] ?? 0}
                      </text>
                    </g>
                  ))}
                </g>
              </>
            )}
            <text
              x={toX(i)}
              y={H - 6}
              textAnchor="middle"
              fill={ui.textMuted}
              fontSize={9}
              fontWeight={500}
            >
              {d.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function DonutChart({ data, ui, darkMode }) {
  const [active, setActive] = useState(0);
  const colors = ["#36a420", "#e02020", "#f59e0b"];
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = 90,
    cy = 90,
    r = 70,
    ri = 48;
  let sa = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const angle = total === 0 ? 0 : (d.value / total) * 2 * Math.PI;
    const s = { ...d, startAngle: sa, endAngle: sa + angle, color: colors[i] };
    sa += angle;
    return s;
  });
  function arc(sa, ea, or, ir) {
    if (Math.abs(ea - sa) < 0.001) return "";
    const lg = ea - sa > Math.PI ? 1 : 0;
    const x1o = cx + or * Math.cos(sa),
      y1o = cy + or * Math.sin(sa);
    const x2o = cx + or * Math.cos(ea),
      y2o = cy + or * Math.sin(ea);
    const x1i = cx + ir * Math.cos(ea),
      y1i = cy + ir * Math.sin(ea);
    const x2i = cx + ir * Math.cos(sa),
      y2i = cy + ir * Math.sin(sa);
    return `M ${x1o} ${y1o} A ${or} ${or} 0 ${lg} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${ir} ${ir} 0 ${lg} 0 ${x2i} ${y2i} Z`;
  }
  const aSlice = slices[active] || slices[0];
  const pct =
    total > 0 && aSlice ? ((aSlice.value / total) * 100).toFixed(1) : "0.0";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <div style={{ position: "relative" }}>
        <svg
          viewBox="0 0 180 180"
          style={{
            width: 160,
            height: 160,
            flexShrink: 0,
            overflow: "visible",
          }}
        >
          <circle
            cx={cx}
            cy={cy}
            r={(r + ri) / 2}
            fill="none"
            stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
            strokeWidth={r - ri + 2}
          />
          {slices.map((s, i) => {
            const isAct = i === active;
            const or = isAct ? r + 5 : r,
              ir2 = isAct ? ri - 2 : ri;
            return (
              <path
                key={i}
                d={arc(s.startAngle, s.endAngle, or, ir2)}
                fill={s.color}
                opacity={isAct ? 1 : 0.7}
                onMouseEnter={() => setActive(i)}
                style={{
                  cursor: "pointer",
                  transition: "all 0.2s",
                  filter: isAct
                    ? `drop-shadow(0 2px 6px ${s.color}60)`
                    : "none",
                }}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={ri - 3} fill={neuCardBg(darkMode)} />
          <text
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            fill={aSlice?.color}
            fontSize={22}
            fontWeight={800}
          >
            {aSlice?.value ?? 0}
          </text>
          <text
            x={cx}
            y={cy + 8}
            textAnchor="middle"
            fill={ui.textMuted}
            fontSize={7.5}
            fontWeight={600}
          >
            {(aSlice?.name || "").toUpperCase()}
          </text>
          <text
            x={cx}
            y={cy + 22}
            textAnchor="middle"
            fill={aSlice?.color}
            fontSize={11}
            fontWeight={700}
          >
            {pct}%
          </text>
        </svg>
      </div>
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}
      >
        {slices.map((s, i) => {
          const pv = total > 0 ? ((s.value / total) * 100).toFixed(1) : "0.0";
          const isAct = i === active;
          return (
            <div
              key={s.name}
              onMouseEnter={() => setActive(i)}
              style={{ cursor: "pointer" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: isAct ? 700 : 500,
                    color: isAct ? s.color : ui.textSub,
                  }}
                >
                  {s.name}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: s.color,
                  }}
                >
                  {s.value}{" "}
                  <span
                    style={{
                      fontWeight: 400,
                      color: ui.textMuted,
                      fontSize: "0.68rem",
                    }}
                  >
                    ({pv}%)
                  </span>
                </span>
              </div>
              <div
                style={{
                  height: 5,
                  borderRadius: 99,
                  boxShadow: neuInputShadow(darkMode),
                  background: neuCardBg(darkMode),
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pv}%`,
                    borderRadius: 99,
                    background: s.color,
                    transition: "width 0.5s",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
