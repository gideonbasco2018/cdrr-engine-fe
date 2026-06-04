// src/components/monitoring/frpTat/FRPTatView.jsx
// v4 — doc type hover tooltips + grouped charts

import { useState, useEffect, useRef, useMemo } from "react";
import { Chart, registerables } from "chart.js";
import { getAnalyticsFRPTATTrend } from "../../../api/analytics";

Chart.register(...registerables);

const MONTH_OPTIONS = [
  { value: "All", label: "All months" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];
const PAGE_SIZE_OPTIONS = [10, 20, 50];
// Doc type config

const DOC_COLORS = {
  LOD: "#2563eb",
  eNOD: "#10b981",
  CPR: "#f97316",

  Cert: "#a855f7",

  Letter: "#eab308",
  "Letter (FRP)": "#ec4899",
  "Letter (Withdrawal)": "#ef4444",
  "Letter (Re-routed)": "#14b8a6",

  Other: "#6b7280",
};

const DOC_BG = {
  LOD: "#dbeafe",
  eNOD: "#d1fae5",
  CPR: "#ffedd5",

  Cert: "#f3e8ff",

  Letter: "#fef9c3",
  "Letter (FRP)": "#fce7f3",
  "Letter (Withdrawal)": "#fee2e2",
  "Letter (Re-routed)": "#ccfbf1",

  Other: "#e5e7eb",
};

const DOC_TEXT = {
  LOD: "#1d4ed8",
  eNOD: "#047857",
  CPR: "#c2410c",

  Cert: "#7e22ce",

  Letter: "#a16207",
  "Letter (FRP)": "#be185d",
  "Letter (Withdrawal)": "#b91c1c",
  "Letter (Re-routed)": "#0f766e",

  Other: "#374151",
};

function normalizeDocType(raw) {
  if (!raw) return "Other";

  const t = raw.trim();
  const u = t.toUpperCase();

  if (u.includes("LOD")) {
    return "LOD";
  }

  if (u.includes("ENOD") || u.includes("E-NOD")) {
    return "eNOD";
  }

  if (u.includes("CPR")) {
    return "CPR";
  }
  if (u.includes("CERT")) {
    return "Cert";
  }

  if (u.includes("LETTER (FRP)")) {
    return "Letter (FRP)";
  }

  if (u.includes("LETTER (WITHDRAWAL)")) {
    return "Letter (Withdrawal)";
  }

  if (u.includes("LETTER (RE-ROUTED)")) {
    return "Letter (Re-routed)";
  }

  if (u.includes("LETTER")) {
    return "Letter";
  }

  return t;
}
//Hooks
function useIsMobile(bp = 640) {
  const [m, setM] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < bp : false,
  );
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}

function useProgressiveReveal(trigger, total, interval = 120) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) {
      setCount(0);
      return;
    }
    if (count >= total) return;
    const t = setTimeout(() => setCount((c) => c + 1), interval);
    return () => clearTimeout(t);
  }, [trigger, count, total, interval]);
  return count;
}

//  Tiny components
function FadeIn({ visible, delay = 0, children }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!visible) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [visible, delay]);
  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
}

function SkeletonBox({ height = 74, borderRadius = 10, ui }) {
  return (
    <div
      style={{
        height,
        borderRadius,
        background: ui.inputBg,
        opacity: 0.6,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.12) 50%,transparent 100%)",
          animation: "skshimmer 1.4s infinite",
        }}
      />
      <style>{`@keyframes skshimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
    </div>
  );
}

function EmptyChart({ label, ui }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: ui.textMuted,
        fontSize: "0.8rem",
      }}
    >
      {label}
    </div>
  );
}

function SkeletonTableRows({ ui, rows = 3, cols = 7 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i}>
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} style={{ padding: "8px 10px" }}>
          <SkeletonBox height={14} borderRadius={4} ui={ui} />
        </td>
      ))}
    </tr>
  ));
}

function DocTypeLegend({ docTypes, ui }) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {docTypes.map((t) => (
        <span
          key={t}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: "0.72rem",
            color: ui.textMuted,
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 2,
              background: DOC_COLORS[t] ?? DOC_COLORS.Other,
              display: "inline-block",
            }}
          />
          {t}
        </span>
      ))}
    </div>
  );
}

function DocTypePill({ type }) {
  const bg = DOC_BG[type] ?? DOC_BG.Other;
  const col = DOC_TEXT[type] ?? DOC_TEXT.Other;
  return (
    <span
      style={{
        fontSize: "0.68rem",
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 99,
        background: bg,
        color: col,
        whiteSpace: "nowrap",
      }}
    >
      {type}
    </span>
  );
}

function StatusPill({ avgTat, target }) {
  if (avgTat == null || target == null)
    return <span style={{ color: "#888", fontSize: "0.72rem" }}>—</span>;
  const diff = +(avgTat - target).toFixed(1);
  const isOver = diff > 0;
  const isNear = !isOver && diff > -2;
  const s = isOver
    ? { bg: "#fef2f2", color: "#b91c1c", label: "Over target" }
    : isNear
      ? { bg: "#fef9c3", color: "#a16207", label: "Near target" }
      : { bg: "#dcfce7", color: "#15803d", label: "On target" };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
      }}
    >
      <span
        style={{
          fontSize: "0.68rem",
          fontWeight: 700,
          padding: "3px 10px",
          borderRadius: 99,
          background: s.bg,
          color: s.color,
          whiteSpace: "nowrap",
        }}
      >
        {s.label}
      </span>
      <span style={{ fontSize: "0.68rem", color: s.color, fontWeight: 600 }}>
        {diff > 0 ? `+${diff}` : diff} days
      </span>
    </div>
  );
}

function DocBreakdownTooltip({ breakdown, mode, target, ui, darkMode }) {
  const entries = Object.entries(breakdown).filter(
    ([, v]) => (v.count ?? 0) > 0,
  );
  if (!entries.length) return null;

  const tooltipStyle = {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: "50%",
    transform: "translateX(-50%)",
    background: ui.cardBg,
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 10,
    padding: "10px 13px",
    minWidth: 210,
    zIndex: 99999,
    pointerEvents: "none",
    boxShadow: darkMode
      ? "0 4px 20px rgba(0,0,0,0.55)"
      : "0 4px 20px rgba(0,0,0,0.13)",
    whiteSpace: "nowrap",
  };

  if (mode === "count") {
    const maxVal = Math.max(...entries.map(([, v]) => v.count));
    return (
      <div style={tooltipStyle}>
        <p
          style={{
            margin: "0 0 7px",
            fontSize: "0.63rem",
            fontWeight: 700,
            color: ui.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          By doc type
        </p>
        {entries.map(([type, vals]) => (
          <div
            key={type}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 5,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: DOC_COLORS[type] ?? DOC_COLORS.Other,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "0.72rem",
                color: ui.textPrimary,
                minWidth: 40,
              }}
            >
              {type}
            </span>
            <div
              style={{
                flex: 1,
                height: 4,
                background: ui.inputBg,
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${maxVal ? (vals.count / maxVal) * 100 : 0}%`,
                  height: "100%",
                  background: DOC_COLORS[type] ?? DOC_COLORS.Other,
                  borderRadius: 99,
                  transition: "width 0.3s",
                }}
              />
            </div>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: ui.textPrimary,
                minWidth: 34,
                textAlign: "right",
              }}
            >
              {vals.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (mode === "avg") {
    const maxAvg = Math.max(...entries.map(([, v]) => v.avg ?? 0));
    return (
      <div style={tooltipStyle}>
        <p
          style={{
            margin: "0 0 7px",
            fontSize: "0.63rem",
            fontWeight: 700,
            color: ui.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Avg TAT per type
        </p>
        {entries.map(([type, vals]) => {
          const isOver = target != null && vals.avg > target;
          return (
            <div
              key={type}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 5,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: DOC_COLORS[type] ?? DOC_COLORS.Other,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "0.72rem",
                  color: ui.textPrimary,
                  minWidth: 40,
                }}
              >
                {type}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 4,
                  background: ui.inputBg,
                  borderRadius: 99,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${maxAvg ? ((vals.avg ?? 0) / maxAvg) * 100 : 0}%`,
                    height: "100%",
                    background: DOC_COLORS[type] ?? DOC_COLORS.Other,
                    borderRadius: 99,
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: isOver ? "#b91c1c" : "#15803d",
                  minWidth: 44,
                  textAlign: "right",
                }}
              >
                {(vals.avg ?? 0).toFixed(1)}d
              </span>
            </div>
          );
        })}
        {/* Status pills */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            marginTop: 8,
            paddingTop: 7,
            borderTop: `1px solid ${ui.cardBorder}`,
          }}
        >
          {entries.map(([type, vals]) => {
            const isOver = target != null && (vals.avg ?? 0) > target;

            return (
              <span
                key={type}
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 99,
                  background: isOver ? "#fef2f2" : "#dcfce7",
                  color: isOver ? "#b91c1c" : "#15803d",
                }}
              >
                {type} {isOver ? "over" : "✓"}
              </span>
            );
          })}
        </div>

        {/* Total Average */}
        {(() => {
          const totalWeighted = entries.reduce(
            (sum, [, vals]) => sum + (vals.avg ?? 0) * (vals.count ?? 0),
            0,
          );

          const totalCount = entries.reduce(
            (sum, [, vals]) => sum + (vals.count ?? 0),
            0,
          );

          const totalAverage = totalCount ? totalWeighted / totalCount : 0;

          return (
            <div
              style={{
                marginTop: 10,
                paddingTop: 8,
                borderTop: `1px solid ${ui.cardBorder}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: ui.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Total Average
                </span>

                <span
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    color:
                      target != null && totalAverage > target
                        ? "#b91c1c"
                        : "#15803d",
                  }}
                >
                  {totalAverage.toFixed(2)}d
                </span>
              </div>

              {/* Formula */}
              <div
                style={{
                  fontSize: "0.63rem",
                  lineHeight: 1.5,
                  color: ui.textMuted,
                  background: ui.inputBg,
                  padding: "7px 8px",
                  borderRadius: 7,
                  fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace",
                  overflowWrap: "break-word",
                }}
              >
                Weighted Avg = Σ(avg × count) ÷ Σ(count)
                <br />= {totalWeighted.toFixed(1)} ÷ {totalCount}
                <br />= <strong>{totalAverage.toFixed(2)} days</strong>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  if (mode === "pass") {
    return (
      <div style={tooltipStyle}>
        <p
          style={{
            margin: "0 0 7px",
            fontSize: "0.63rem",
            fontWeight: 700,
            color: ui.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Pass rate per type
        </p>
        {entries.map(([type, vals]) => {
          const rate = vals.total
            ? +((vals.pass / vals.total) * 100).toFixed(1)
            : 0;
          const color =
            rate >= 80 ? "#15803d" : rate >= 50 ? "#a16207" : "#b91c1c";
          return (
            <div
              key={type}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 5,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: DOC_COLORS[type] ?? DOC_COLORS.Other,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "0.72rem",
                  color: ui.textPrimary,
                  minWidth: 40,
                }}
              >
                {type}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 4,
                  background: ui.inputBg,
                  borderRadius: 99,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${rate}%`,
                    height: "100%",
                    background: DOC_COLORS[type] ?? DOC_COLORS.Other,
                    borderRadius: 99,
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color,
                  minWidth: 34,
                  textAlign: "right",
                }}
              >
                {rate}%
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

function TableCellTooltip({ breakdown, mode, target, ui, darkMode, children }) {
  const [hov, setH] = useState(false);

  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        position: "relative",
        display: "inline-block",
        cursor: "default",
      }}
    >
      {children}
      {hov && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: ui.cardBg,
            border: `1px solid ${ui.cardBorder}`,
            borderRadius: 10,
            padding: "10px 13px",
            minWidth: 210,
            zIndex: 99999,
            pointerEvents: "none",
            boxShadow: darkMode
              ? "0 4px 20px rgba(0,0,0,0.55)"
              : "0 4px 20px rgba(0,0,0,0.13)",
            whiteSpace: "nowrap",
          }}
        >
          {mode === "count" &&
            (() => {
              const entries = Object.entries(breakdown).filter(
                ([, v]) => (v.count ?? 0) > 0,
              );
              const maxVal = Math.max(...entries.map(([, v]) => v.count));
              return (
                <>
                  <p
                    style={{
                      margin: "0 0 7px",
                      fontSize: "0.63rem",
                      fontWeight: 700,
                      color: ui.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    By doc type
                  </p>
                  {entries.map(([type, vals]) => (
                    <div
                      key={type}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          background: DOC_COLORS[type] ?? DOC_COLORS.Other,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: ui.textPrimary,
                          minWidth: 40,
                        }}
                      >
                        {type}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 4,
                          background: ui.inputBg,
                          borderRadius: 99,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${maxVal ? (vals.count / maxVal) * 100 : 0}%`,
                            height: "100%",
                            background: DOC_COLORS[type] ?? DOC_COLORS.Other,
                            borderRadius: 99,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: ui.textPrimary,
                          minWidth: 34,
                          textAlign: "right",
                        }}
                      >
                        {vals.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 7,
                      borderTop: `1px solid ${ui.cardBorder}`,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: ui.textMuted,
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      Total
                    </span>
                    <span
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 800,
                        color: ui.textPrimary,
                      }}
                    >
                      {entries
                        .reduce((s, [, v]) => s + v.count, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                </>
              );
            })()}

          {mode === "avg" &&
            (() => {
              const entries = Object.entries(breakdown).filter(
                ([, v]) => (v.count ?? 0) > 0,
              );
              const maxAvg = Math.max(...entries.map(([, v]) => v.avg ?? 0));
              const totalW = entries.reduce(
                (s, [, v]) => s + (v.avg ?? 0) * (v.count ?? 0),
                0,
              );
              const totalC = entries.reduce(
                (s, [, v]) => s + (v.count ?? 0),
                0,
              );
              const overallAvg = totalC ? totalW / totalC : 0;
              return (
                <>
                  <p
                    style={{
                      margin: "0 0 7px",
                      fontSize: "0.63rem",
                      fontWeight: 700,
                      color: ui.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Avg TAT per type
                  </p>
                  {entries.map(([type, vals]) => {
                    const isOver = target != null && (vals.avg ?? 0) > target;
                    return (
                      <div
                        key={type}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          marginBottom: 5,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: DOC_COLORS[type] ?? DOC_COLORS.Other,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: ui.textPrimary,
                            minWidth: 40,
                          }}
                        >
                          {type}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 4,
                            background: ui.inputBg,
                            borderRadius: 99,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${maxAvg ? ((vals.avg ?? 0) / maxAvg) * 100 : 0}%`,
                              height: "100%",
                              background: DOC_COLORS[type] ?? DOC_COLORS.Other,
                              borderRadius: 99,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: isOver ? "#b91c1c" : "#15803d",
                            minWidth: 44,
                            textAlign: "right",
                          }}
                        >
                          {(vals.avg ?? 0).toFixed(1)}d
                        </span>
                      </div>
                    );
                  })}
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 7,
                      borderTop: `1px solid ${ui.cardBorder}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: ui.textMuted,
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      Weighted Avg
                    </span>
                    <span
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 800,
                        color:
                          target != null && overallAvg > target
                            ? "#b91c1c"
                            : "#15803d",
                      }}
                    >
                      {overallAvg.toFixed(2)}d
                    </span>
                  </div>
                </>
              );
            })()}
        </div>
      )}
    </div>
  );
}

//  Metric Card
function MetricCard({
  label,
  value,
  sub,
  subColor,
  ui,
  darkMode,
  breakdown,
  tooltipMode,
  target,
}) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const [hov, setH] = useState(false);
  const hasTooltip = breakdown && tooltipMode;

  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: ui.inputBg,
        borderRadius: 10,
        padding: "12px 14px",
        minWidth: 0,
        position: "relative",
        overflow: "visible",
        zIndex: hov ? 9999 : 1,
        isolation: "auto",
      }}
    >
      {hasTooltip && hov && (
        <DocBreakdownTooltip
          breakdown={breakdown}
          mode={tooltipMode}
          target={target}
          ui={ui}
          darkMode={darkMode}
        />
      )}
      <p
        style={{
          margin: "0 0 4px",
          fontSize: "0.7rem",
          color: ui.textMuted,
          fontFamily: font,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "1.1rem",
          fontWeight: 700,
          color: ui.textPrimary,
          fontFamily: font,
          wordBreak: "break-word",
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            margin: "3px 0 0",
            fontSize: "0.68rem",
            color: subColor ?? ui.textMuted,
            fontFamily: font,
          }}
        >
          {sub}
        </p>
      )}
      {hasTooltip && (
        <span
          style={{
            position: "absolute",
            top: 7,
            right: 9,
            fontSize: "0.58rem",
            color: ui.textMuted,
            opacity: 0.55,
            pointerEvents: "none",
          }}
        >
          hover ↑
        </span>
      )}
    </div>
  );
}

//  Chart Panel
function ChartPanel({
  aggregatedRows,
  rawRows,
  docTypes,
  activeTimeline,
  darkMode,
  ui,
  loading,
  revealed,
  isMobile,
  heatmapData,
  uniqueYears,
}) {
  const lineRef = useRef(null);
  const groupedRef = useRef(null);

  const lineC = useRef(null);
  const groupedC = useRef(null);

  useEffect(() => {
    if (loading) return;

    const gridCol = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";

    const tickCol = darkMode ? "#b0b3b8" : "#65676b";

    const tickSize = isMobile ? 9 : 11;

    lineC.current?.destroy();
    groupedC.current?.destroy();

    //  Average TAT line chart

    if (lineRef.current && aggregatedRows.length) {
      const labels = [...aggregatedRows].reverse().map((d) => d.month);

      const avgData = [...aggregatedRows]
        .reverse()
        .map((d) => +(d.avg_tat_days ?? 0).toFixed(2));

      lineC.current = new Chart(lineRef.current, {
        type: "line",

        data: {
          labels,

          datasets: [
            {
              label: "Avg TAT (days)",

              data: avgData,

              borderColor: "#1877F2",

              backgroundColor: "rgba(24,119,242,0.08)",

              borderWidth: 2.5,

              pointBackgroundColor: "#1877F2",

              pointRadius: isMobile ? 2 : 4,

              tension: 0.35,

              fill: true,
            },
          ],
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,

          plugins: {
            legend: {
              display: false,
            },
          },

          scales: {
            x: {
              ticks: {
                color: tickCol,
                font: { size: tickSize },
                maxRotation: 45,
              },

              grid: { color: gridCol },

              border: { display: false },
            },

            y: {
              ticks: {
                color: tickCol,
                font: { size: tickSize },
              },

              grid: { color: gridCol },

              border: { display: false },

              beginAtZero: true,
            },
          },
        },
      });
    }

    //  Avg TAT by doc type (STACKED AREA LINE)

    if (groupedRef.current && rawRows.length && docTypes.length) {
      const monthLabels = [
        ...new Set(aggregatedRows.map((r) => r.month)),
      ].reverse();

      const datasets = docTypes.map((type, idx) => {
        const color = DOC_COLORS[type] ?? DOC_COLORS.Other;

        return {
          label: type,

          data: monthLabels.map((m) => {
            const rows = rawRows.filter(
              (d) =>
                d.month === m &&
                normalizeDocType(d.type_of_doc_released) === type,
            );

            const totalApps = rows.reduce(
              (sum, d) => sum + (d.total_applications ?? 0),
              0,
            );

            const weightedAvg = rows.reduce(
              (sum, d) =>
                sum + (d.avg_tat_days ?? 0) * (d.total_applications ?? 0),
              0,
            );

            return totalApps ? +(weightedAvg / totalApps).toFixed(2) : 0;
          }),

          borderColor: color,

          backgroundColor: `${color}55`,

          fill: idx === 0 ? true : "-1",

          tension: 0.35,

          pointRadius: isMobile ? 1.5 : 3,

          pointHoverRadius: 5,

          borderWidth: 2,
        };
      });

      // target line
      if (activeTimeline) {
        datasets.push({
          label: `Target (${activeTimeline}d)`,

          data: Array(monthLabels.length).fill(activeTimeline),

          borderColor: "#9ca3af",

          borderWidth: 2,

          borderDash: [5, 5],

          pointRadius: 0,

          fill: false,
        });
      }

      groupedC.current = new Chart(groupedRef.current, {
        type: "line",

        data: {
          labels: monthLabels,
          datasets,
        },

        options: {
          responsive: true,

          maintainAspectRatio: false,

          interaction: {
            mode: "index",
            intersect: false,
          },

          plugins: {
            legend: {
              display: false,
            },

            tooltip: {
              mode: "index",
              intersect: false,

              callbacks: {
                label: (ctx) => {
                  const val = ctx.parsed.y || 0;

                  if (val === 0) return null;

                  return ` ${ctx.dataset.label}: ${val.toFixed(1)} days`;
                },

                afterBody: (items) => {
                  if (!items.length) return [];

                  const month = items[0].label;

                  // remove target line
                  const valid = items.filter(
                    (i) => !String(i.dataset.label).includes("Target"),
                  );

                  let weighted = 0;
                  let totalApps = 0;

                  valid.forEach((item) => {
                    const type = item.dataset.label;

                    const rows = rawRows.filter(
                      (d) =>
                        d.month === month &&
                        normalizeDocType(d.type_of_doc_released) === type,
                    );

                    rows.forEach((r) => {
                      const apps = r.total_applications ?? 0;
                      const avg = r.avg_tat_days ?? 0;

                      weighted += avg * apps;
                      totalApps += apps;
                    });
                  });

                  const overallAvg = totalApps ? weighted / totalApps : 0;

                  return [
                    "",
                    `📊 Overall Avg TAT: ${overallAvg.toFixed(2)} days`,
                    "",
                    `Formula:`,
                    `Σ(avg × applications) ÷ total applications`,
                    `= ${weighted.toFixed(1)} ÷ ${totalApps}`,
                    `= ${overallAvg.toFixed(2)} days`,
                  ];
                },
              },
            },
          },

          scales: {
            x: {
              ticks: {
                color: tickCol,
                font: { size: tickSize },
                maxRotation: 45,
              },

              grid: { color: gridCol },

              border: { display: false },
            },

            y: {
              stacked: true,

              ticks: {
                color: tickCol,
                font: { size: tickSize },
              },

              grid: { color: gridCol },

              border: { display: false },

              beginAtZero: true,
            },
          },
        },
      });
    }

    return () => {
      lineC.current?.destroy();
      groupedC.current?.destroy();
    };
  }, [
    aggregatedRows,
    rawRows,
    docTypes,
    activeTimeline,
    darkMode,
    loading,
    isMobile,
  ]);

  const chartH = isMobile ? 240 : 420;

  const MONTHS_SHORT = [
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

  return (
    <>
      {/* TOP GRID */}

      <div
        style={{
          display: "grid",

          gridTemplateColumns: isMobile ? "1fr" : "1fr 420px",

          gap: 12,

          marginBottom: 16,
        }}
      >
        {/* Average TAT */}

        <FadeIn visible={loading || revealed(7)}>
          <div
            style={{
              background: ui.cardBg,

              border: `1px solid ${ui.cardBorder}`,

              borderRadius: 12,

              padding: "14px 16px",
            }}
          >
            <p
              style={{
                margin: "0 0 2px",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              Average TAT per month
            </p>

            <p
              style={{
                margin: "0 0 8px",
                fontSize: "0.72rem",
                color: ui.textMuted,
              }}
            >
              Overall trend — all doc types combined
            </p>

            <div
              style={{
                position: "relative",
                height: 260,
                zIndex: 1,
                overflow: "visible",
              }}
            >
              {loading ? (
                <SkeletonBox height={260} borderRadius={8} ui={ui} />
              ) : !aggregatedRows.length ? (
                <EmptyChart label="No data" ui={ui} />
              ) : (
                <canvas
                  ref={lineRef}
                  style={{ position: "relative", zIndex: 1 }}
                />
              )}
            </div>
          </div>
        </FadeIn>

        {/* Heatmap */}

        <FadeIn visible={loading || revealed(8)}>
          <div
            style={{
              background: ui.cardBg,

              border: `1px solid ${ui.cardBorder}`,

              borderRadius: 12,

              padding: "14px 16px",
            }}
          >
            <p
              style={{
                margin: "0 0 2px",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              Target compliance heatmap
            </p>

            <p
              style={{
                margin: "0 0 10px",
                fontSize: "0.72rem",
                color: ui.textMuted,
              }}
            >
              Green = on target · Red = over target
            </p>

            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  borderCollapse: "separate",

                  borderSpacing: 3,

                  fontSize: "0.65rem",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        color: ui.textMuted,
                        padding: "2px 4px",
                      }}
                    >
                      Yr
                    </th>

                    {MONTHS_SHORT.map((m) => (
                      <th
                        key={m}
                        style={{
                          color: ui.textMuted,
                          padding: "2px",
                          minWidth: 28,
                        }}
                      >
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {uniqueYears.map((yr) => (
                    <tr key={yr}>
                      <td
                        style={{
                          color: ui.textPrimary,
                          fontWeight: 700,
                        }}
                      >
                        {yr}
                      </td>

                      {MONTHS_SHORT.map((m) => {
                        const key = `${m} ${yr}`;

                        const entry = heatmapData[key];

                        const status = entry?.status ?? "unknown";

                        const avg = entry?.avg ?? null;

                        const bg =
                          status === "on"
                            ? "#22c55e"
                            : status === "over"
                              ? "#ef4444"
                              : darkMode
                                ? "#2a2a2a"
                                : "#e5e7eb";

                        return (
                          <td
                            key={m}
                            title={
                              avg != null ? `${avg.toFixed(1)} days` : "No data"
                            }
                            style={{
                              width: 28,
                              height: 28,

                              borderRadius: 4,

                              background: bg,

                              color: "#fff",

                              textAlign: "center",

                              fontWeight: 700,

                              opacity: status === "unknown" ? 0.35 : 0.85,
                            }}
                          >
                            {avg != null ? Math.round(avg) : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* FULL WIDTH DOC TYPE */}

      <FadeIn visible={loading || revealed(9)}>
        <div
          style={{
            background: ui.cardBg,

            border: `1px solid ${ui.cardBorder}`,

            borderRadius: 12,

            padding: "14px 16px",

            marginBottom: 16,
          }}
        >
          <p
            style={{
              margin: "0 0 2px",
              fontSize: "0.82rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            Average TAT by Type of Document Released
          </p>

          <p
            style={{
              margin: "0 0 6px",
              fontSize: "0.72rem",
              color: ui.textMuted,
            }}
          >
            Per month with target line
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              overflowX: "auto",
              marginBottom: 8,
              paddingBottom: 4,
            }}
          >
            <DocTypeLegend docTypes={docTypes} ui={ui} />

            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: "0.72rem",
                color: ui.textMuted,
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 0,
                  borderTop: "2px dashed #9ca3af",
                  display: "inline-block",
                }}
              />
              Target
            </span>
          </div>

          <div
            style={{
              position: "relative",
              height: chartH,
            }}
          >
            {loading ? (
              <SkeletonBox height={chartH} borderRadius={8} ui={ui} />
            ) : !rawRows.length ? (
              <EmptyChart label="No data" ui={ui} />
            ) : (
              <canvas ref={groupedRef} />
            )}
          </div>
        </div>
      </FadeIn>
    </>
  );
}

// ── Additional Charts Panel ───────────────────────────────────────────────────
function AdditionalChartsPanel({
  aggregatedRows,
  rawRows,
  docTypes,
  activeTimeline,
  darkMode,
  ui,
  loading,
  revealed,
  isMobile,
}) {
  const volRef = useRef(null);
  const volC = useRef(null);

  useEffect(() => {
    if (loading || !rawRows.length) return;
    const gridCol = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
    const tickCol = darkMode ? "#b0b3b8" : "#65676b";
    const tickSize = isMobile ? 9 : 11;

    volC.current?.destroy();

    if (volRef.current && docTypes.length) {
      const monthLabels = [
        ...new Set(aggregatedRows.map((r) => r.month)),
      ].reverse();
      const datasets = docTypes.map((type) => ({
        label: type,
        data: monthLabels.map((m) => {
          return rawRows
            .filter(
              (d) =>
                d.month === m &&
                normalizeDocType(d.type_of_doc_released) === type,
            )
            .reduce((sum, d) => sum + (d.total_applications ?? 0), 0);
        }),
        backgroundColor: DOC_COLORS[type] ?? DOC_COLORS.Other,
        borderRadius: 2,
      }));

      volC.current = new Chart(volRef.current, {
        type: "bar",

        data: {
          labels: monthLabels,
          datasets,
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,

          interaction: {
            mode: "index",
            intersect: false,
          },

          plugins: {
            legend: {
              display: false,
            },

            tooltip: {
              mode: "index",
              intersect: false,

              callbacks: {
                label: (ctx) => {
                  const val = ctx.parsed.y || 0;
                  if (val === 0) return null;
                  return ` ${ctx.dataset.label}: ${val.toLocaleString()} applications`;
                },
                afterBody: (items) => {
                  if (!items.length) return [];
                  const total = items.reduce(
                    (sum, item) => sum + (item.parsed.y || 0),
                    0,
                  );
                  if (!total) return [];
                  return [
                    "",
                    `📦 Total: ${total.toLocaleString()} applications`,
                  ];
                },
              },
            },
          },

          scales: {
            x: {
              ticks: {
                color: tickCol,
                font: { size: tickSize },
                maxRotation: 45,
              },

              grid: { color: gridCol },

              border: { display: false },

              stacked: true,
            },

            y: {
              ticks: {
                color: tickCol,
                font: { size: tickSize },
              },

              grid: { color: gridCol },

              border: { display: false },

              beginAtZero: true,

              stacked: true,
            },
          },
        },
      });
    }

    return () => {
      volC.current?.destroy();
    };
  }, [aggregatedRows, rawRows, docTypes, darkMode, loading, isMobile]);

  // Heatmap — weighted avg per month
  const heatmapData = useMemo(() => {
    const byMonth = {};
    rawRows.forEach((d) => {
      if (!d.month) return;
      if (!byMonth[d.month]) byMonth[d.month] = { sum: 0, cnt: 0 };
      if (d.avg_tat_days != null) {
        byMonth[d.month].sum += d.avg_tat_days * (d.total_applications ?? 1);
        byMonth[d.month].cnt += d.total_applications ?? 1;
      }
    });
    const map = {};
    Object.entries(byMonth).forEach(([key, v]) => {
      const avg = v.cnt ? v.sum / v.cnt : null;
      map[key] = {
        avg,
        status:
          avg != null && activeTimeline != null
            ? avg <= activeTimeline
              ? "on"
              : "over"
            : "unknown",
      };
    });
    return map;
  }, [rawRows, activeTimeline]);

  const uniqueYears = useMemo(
    () => [...new Set(rawRows.map((d) => String(d.year)))].sort(),
    [rawRows],
  );
  const MONTHS_SHORT = [
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
  const cardStyle = {
    background: ui.cardBg,
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 12,
    padding: "14px 16px",
  };
  const volH = isMobile ? 160 : 200;

  return (
    <div style={{ marginBottom: 16 }}>
      <FadeIn visible={loading || revealed(9)}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div style={{ flex: 1, height: 1, background: ui.cardBorder }} />
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: ui.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              whiteSpace: "nowrap",
            }}
          >
            Additional Analysis
          </span>
          <div style={{ flex: 1, height: 1, background: ui.cardBorder }} />
        </div>
      </FadeIn>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <FadeIn visible={loading || revealed(9)}>
          <div style={{ ...cardStyle, minWidth: 0 }}>
            <p
              style={{
                margin: "0 0 2px",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              Applications volume
            </p>
            <p
              style={{
                margin: "0 0 6px",
                fontSize: "0.72rem",
                color: ui.textMuted,
              }}
            >
              Total received per month · stacked by doc type
            </p>
            <DocTypeLegend docTypes={docTypes} ui={ui} />
            <div
              style={{
                position: "relative",
                height: volH,
                minWidth: 0,
                marginTop: 8,
              }}
            >
              {loading ? (
                <SkeletonBox height={volH} borderRadius={8} ui={ui} />
              ) : !rawRows.length ? (
                <EmptyChart label="No data" ui={ui} />
              ) : (
                <canvas ref={volRef} style={{ width: "100% !important" }} />
              )}
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function FRPTatView({ ui, darkMode }) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const isMobile = useIsMobile(640);

  const [selectedYears, setSelectedYears] = useState([]);
  const [month, setMonth] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [allData, setAllData] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTimeline, setActiveTimeline] = useState(null);
  const [dateMode, setDateMode] = useState("received");

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = {};
    if (month !== "All") params.month = month;
    getAnalyticsFRPTATTrend(params)
      .then((res) => {
        const rows = res.data || [];
        setAllData(rows);
        const uniqueYears = Array.from(
          new Set(rows.map((d) => String(d.year))),
        ).sort();
        setYears(uniqueYears);
        const timelines = [...new Set(rows.map((d) => d.timeline_days))].sort(
          (a, b) => a - b,
        );
        setActiveTimeline((prev) =>
          prev && timelines.includes(prev) ? prev : (timelines[0] ?? null),
        );
      })
      .catch(() => setError("Failed to load TAT data. Please try again."))
      .finally(() => setLoading(false));
  }, [month]);

  const toggleYear = (y) => {
    setCurrentPage(1);
    setSelectedYears((p) =>
      p.includes(y) ? p.filter((x) => x !== y) : [...p, y],
    );
  };
  const clearYears = () => {
    setSelectedYears([]);
    setCurrentPage(1);
  };

  const timelineTabs = useMemo(
    () =>
      [...new Set(allData.map((d) => d.timeline_days))].sort((a, b) => a - b),
    [allData],
  );

  // Raw rows for active timeline + year filter (retains doc type split)

  const rawRows = useMemo(() => {
    let rows = allData.filter((d) => d.timeline_days === activeTimeline);
    if (selectedYears.length) {
      rows = rows.filter((d) =>
        selectedYears.includes(
          String(dateMode === "released" ? d.year_released : d.year),
        ),
      );
    }
    // ✅ attach display month based on dateMode
    return rows
      .map((d) => ({
        ...d,
        month: dateMode === "released" ? d.month_released : d.month,
        year: dateMode === "released" ? d.year_released : d.year,
      }))
      .filter((d) => d.month != null && d.year != null);
  }, [allData, activeTimeline, selectedYears, dateMode]);

  const aggregatedRows = useMemo(() => {
    const byMonth = {};
    rawRows.forEach((d) => {
      if (!byMonth[d.month]) {
        byMonth[d.month] = {
          ...d,
          _sumW: 0,
          _sumApp: 0,
          min_tat_days: d.min_tat_days,
          max_tat_days: d.max_tat_days,
          total_applications: 0,
        };
      }
      const m = byMonth[d.month];
      const apps = d.total_applications ?? 1;
      if (d.avg_tat_days != null) {
        m._sumW += d.avg_tat_days * apps;
        m._sumApp += apps;
      }
      m.total_applications += apps;
      if (
        d.min_tat_days != null &&
        (m.min_tat_days == null || d.min_tat_days < m.min_tat_days)
      )
        m.min_tat_days = d.min_tat_days;
      if (
        d.max_tat_days != null &&
        (m.max_tat_days == null || d.max_tat_days > m.max_tat_days)
      )
        m.max_tat_days = d.max_tat_days;
    });
    return Object.values(byMonth)
      .map((m) => ({
        ...m,
        avg_tat_days: m._sumApp ? +(m._sumW / m._sumApp).toFixed(2) : null,
      }))
      .sort((a, b) => new Date(b.month) - new Date(a.month));
  }, [rawRows]);

  // Unique doc types present in rawRows
  const docTypes = useMemo(() => {
    const set = new Set(
      rawRows.map((d) => normalizeDocType(d.type_of_doc_released)),
    );
    return ["LOD", "eNOD", "CPR"]
      .filter((t) => set.has(t))
      .concat([...set].filter((t) => !["LOD", "eNOD", "CPR"].includes(t)));
  }, [rawRows]);

  // Doc type breakdown objects for tooltip
  const countBreakdown = useMemo(() => {
    const out = {};
    docTypes.forEach((t) => {
      const rows = rawRows.filter(
        (d) => normalizeDocType(d.type_of_doc_released) === t,
      );
      out[t] = {
        count: rows.reduce((s, d) => s + (d.total_applications ?? 0), 0),
      };
    });
    return out;
  }, [rawRows, docTypes]);

  const avgBreakdown = useMemo(() => {
    const out = {};
    docTypes.forEach((t) => {
      const rows = rawRows.filter(
        (d) =>
          normalizeDocType(d.type_of_doc_released) === t &&
          d.avg_tat_days != null,
      );
      const sumW = rows.reduce(
        (s, d) => s + d.avg_tat_days * (d.total_applications ?? 1),
        0,
      );
      const sumA = rows.reduce((s, d) => s + (d.total_applications ?? 1), 0);
      out[t] = {
        avg: sumA ? sumW / sumA : null,
        count: sumA,
      };
    });
    return out;
  }, [rawRows, docTypes]);

  const passBreakdown = useMemo(() => {
    const out = {};
    docTypes.forEach((t) => {
      const rows = rawRows.filter(
        (d) => normalizeDocType(d.type_of_doc_released) === t,
      );
      const total = rows.length;
      const pass = rows.filter(
        (d) =>
          d.avg_tat_days != null &&
          activeTimeline != null &&
          d.avg_tat_days <= activeTimeline,
      ).length;
      out[t] = { total, pass, count: total };
    });
    return out;
  }, [rawRows, docTypes, activeTimeline]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTimeline, selectedYears, month]);

  // Summary metrics from aggregatedRows
  const totalApps = aggregatedRows.reduce(
    (s, d) => s + (d.total_applications ?? 0),
    0,
  );
  const avgAll = aggregatedRows.length
    ? +(
        aggregatedRows.reduce((s, d) => s + (d.avg_tat_days ?? 0), 0) /
        aggregatedRows.length
      ).toFixed(1)
    : null;
  const minAll = aggregatedRows.length
    ? Math.min(...aggregatedRows.map((d) => d.min_tat_days ?? Infinity))
    : null;
  const maxAll = aggregatedRows.length
    ? Math.max(...aggregatedRows.map((d) => d.max_tat_days ?? -Infinity))
    : null;
  const bestMonth =
    minAll != null
      ? aggregatedRows.find((d) => d.min_tat_days === minAll)?.month
      : null;
  const worstMonth =
    maxAll != null
      ? aggregatedRows.find((d) => d.max_tat_days === maxAll)?.month
      : null;
  const passCount = aggregatedRows.filter(
    (d) =>
      d.avg_tat_days != null &&
      activeTimeline != null &&
      d.avg_tat_days <= activeTimeline,
  ).length;
  const passRate = aggregatedRows.length
    ? +((passCount / aggregatedRows.length) * 100).toFixed(1)
    : null;
  const exceededCount = aggregatedRows.filter(
    (d) =>
      d.avg_tat_days != null &&
      activeTimeline != null &&
      d.avg_tat_days > activeTimeline,
  ).length;

  const now = new Date();
  const curMonthShort = now.toLocaleString("default", { month: "short" });
  const curYear = String(now.getFullYear());
  const currentMonthRow = aggregatedRows.find(
    (d) => d.month?.includes(curMonthShort) && d.month?.includes(curYear),
  );

  // Table uses aggregatedRows
  const totalPages = Math.ceil(aggregatedRows.length / pageSize);
  const paginatedRows = aggregatedRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const TOTAL_SECTIONS = 11;
  const hasData = !loading && !error;
  const revealedCount = useProgressiveReveal(hasData, TOTAL_SECTIONS, 130);
  const revealed = (n) => revealedCount >= n;

  const colHdr = darkMode ? ui.sidebarBg : "#f8f9fd";
  const selectStyle = {
    background: ui.inputBg,
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 7,
    padding: "6px 10px",
    fontSize: "0.8rem",
    color: ui.textPrimary,
    outline: "none",
    colorScheme: darkMode ? "dark" : "light",
    fontFamily: font,
    cursor: "pointer",
    minHeight: 36,
  };
  const yearBtn = (active) => ({
    padding: isMobile ? "6px 10px" : "5px 12px",
    fontSize: "0.78rem",
    fontWeight: active ? 700 : 500,
    fontFamily: font,
    border: `1px solid ${active ? "#1877F2" : ui.cardBorder}`,
    borderRadius: 6,
    cursor: "pointer",
    background: active ? (darkMode ? "#1a2744" : "#e7f0fd") : ui.inputBg,
    color: active ? "#1877F2" : ui.textMuted,
    outline: "none",
    minHeight: 36,
    whiteSpace: "nowrap",
  });

  const mobileTableCols = ["Month", "Avg TAT", "vs Target", "Status"];
  const allTableCols = [
    "Month",
    "Applications",
    "Avg TAT",
    "Min TAT",
    "Max TAT",
    "vs Target",
    "Status",
  ];
  const tableCols = isMobile ? mobileTableCols : allTableCols;

  const uniqueYears = useMemo(() => {
    return [...new Set(rawRows.map((d) => String(d.year)))].sort();
  }, [rawRows]);

  const heatmapData = useMemo(() => {
    const byMonth = {};

    rawRows.forEach((d) => {
      if (!d.month) return;

      if (!byMonth[d.month]) {
        byMonth[d.month] = {
          sum: 0,
          cnt: 0,
        };
      }

      if (d.avg_tat_days != null) {
        byMonth[d.month].sum += d.avg_tat_days * (d.total_applications ?? 1);

        byMonth[d.month].cnt += d.total_applications ?? 1;
      }
    });

    const map = {};

    Object.entries(byMonth).forEach(([key, v]) => {
      const avg = v.cnt ? v.sum / v.cnt : null;

      map[key] = {
        avg,

        status:
          avg != null && activeTimeline != null
            ? avg <= activeTimeline
              ? "on"
              : "over"
            : "unknown",
      };
    });

    return map;
  }, [rawRows, activeTimeline]);

  return (
    <div style={{ fontFamily: font }}>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <h2
          style={{
            margin: "0 0 2px",
            fontSize: isMobile ? "0.95rem" : "1rem",
            fontWeight: 700,
            color: ui.textPrimary,
          }}
        >
          FRP &amp; CRP — Turnaround Time Trend
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            color: ui.textMuted,
            lineHeight: 1.4,
          }}
        >
          Processing time from date received (Central) to date released · hover
          cards to see LOD / eNOD / CPR breakdown
        </p>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <span
          style={{ fontSize: "0.75rem", color: ui.textMuted, flexShrink: 0 }}
        >
          Filters:
        </span>
        <div
          style={{
            display: "flex",
            gap: 5,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            onClick={clearYears}
            style={yearBtn(selectedYears.length === 0)}
          >
            All
          </button>
          {loading
            ? [1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 52,
                    height: 36,
                    borderRadius: 6,
                    background: ui.inputBg,
                    opacity: 0.5,
                  }}
                />
              ))
            : years.map((y) => (
                <button
                  key={y}
                  onClick={() => toggleYear(y)}
                  style={yearBtn(selectedYears.includes(y))}
                >
                  {y}
                </button>
              ))}
        </div>
        <select
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setCurrentPage(1);
          }}
          style={selectStyle}
        >
          {MONTH_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        {(selectedYears.length > 0 || month !== "All") && (
          <button
            onClick={() => {
              clearYears();
              setMonth("All");
            }}
            style={{
              ...selectStyle,
              color: ui.textMuted,
              background: "transparent",
            }}
          >
            Reset
          </button>
        )}

        {/* ✅ DAGDAG — Date mode toggle */}
        <div
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            marginLeft: 4,
          }}
        >
          <span
            style={{
              fontSize: "0.72rem",
              color: ui.textMuted,
              whiteSpace: "nowrap",
            }}
          >
            Based on:
          </span>
          {[
            { key: "received", label: "📥 Date Received" },
            { key: "released", label: "📤 Date Released" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setDateMode(key);
                setSelectedYears([]);
                setCurrentPage(1);
              }}
              style={yearBtn(dateMode === key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: 16,
            background: darkMode ? "#2e0a0a" : "#fef2f2",
            border: `1px solid ${darkMode ? "#7f1d1d" : "#fecaca"}`,
            color: darkMode ? "#f87171" : "#b91c1c",
            fontSize: "0.82rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Timeline tabs */}
      {!error && (
        <div
          style={{
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            borderBottom: `1px solid ${ui.cardBorder}`,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", gap: 4, minWidth: "max-content" }}>
            {loading
              ? [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 110,
                      height: 34,
                      borderRadius: "6px 6px 0 0",
                      background: ui.inputBg,
                      opacity: 0.5,
                    }}
                  />
                ))
              : timelineTabs.map((tl) => {
                  const isActive = tl === activeTimeline;
                  return (
                    <button
                      key={tl}
                      onClick={() => setActiveTimeline(tl)}
                      style={{
                        padding: isMobile ? "7px 14px" : "7px 18px",
                        fontSize: "0.8rem",
                        fontWeight: isActive ? 700 : 500,
                        fontFamily: font,
                        border: "none",
                        borderRadius: "6px 6px 0 0",
                        cursor: "pointer",
                        background: isActive ? ui.cardBg : "transparent",
                        color: isActive ? "#1877F2" : ui.textMuted,
                        borderBottom: isActive
                          ? "2px solid #1877F2"
                          : "2px solid transparent",
                        outline: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tl != null ? `${tl}-Day Track` : "Unknown"}
                    </button>
                  );
                })}
          </div>
        </div>
      )}

      {/* Metric cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "repeat(2, minmax(0,1fr))"
            : "repeat(auto-fit, minmax(130px,1fr))",
          gap: 10,
          marginBottom: 16,
          position: "relative",
          zIndex: 50,
          overflow: "visible",
        }}
      >
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => <SkeletonBox key={i} ui={ui} />)
        ) : (
          <>
            <FadeIn visible={revealed(1)}>
              <MetricCard
                label="Total applications"
                ui={ui}
                darkMode={darkMode}
                value={totalApps.toLocaleString()}
                sub={`${aggregatedRows.length} month${aggregatedRows.length !== 1 ? "s" : ""}`}
                breakdown={countBreakdown}
                tooltipMode="count"
              />
            </FadeIn>
            <FadeIn visible={revealed(2)}>
              <MetricCard
                label="Overall avg TAT"
                ui={ui}
                darkMode={darkMode}
                value={avgAll != null ? `${avgAll} days` : "—"}
                sub={
                  avgAll != null && activeTimeline
                    ? avgAll <= activeTimeline
                      ? "↓ Within target"
                      : "↑ Exceeds target"
                    : undefined
                }
                subColor={
                  avgAll != null && activeTimeline
                    ? avgAll <= activeTimeline
                      ? "#15803d"
                      : "#b91c1c"
                    : undefined
                }
                breakdown={avgBreakdown}
                tooltipMode="avg"
                target={activeTimeline}
              />
            </FadeIn>
            <FadeIn visible={revealed(3)}>
              <MetricCard
                label="Best TAT (min)"
                ui={ui}
                darkMode={darkMode}
                value={
                  minAll != null && minAll !== Infinity ? `${minAll} days` : "—"
                }
                sub={bestMonth}
              />
            </FadeIn>
            <FadeIn visible={revealed(4)}>
              <MetricCard
                label="Longest TAT (max)"
                ui={ui}
                darkMode={darkMode}
                value={
                  maxAll != null && maxAll !== -Infinity
                    ? `${maxAll} days`
                    : "—"
                }
                sub={worstMonth}
                subColor="#b91c1c"
              />
            </FadeIn>
            <FadeIn visible={revealed(5)}>
              <MetricCard
                label="Pass rate"
                ui={ui}
                darkMode={darkMode}
                value={passRate != null ? `${passRate}%` : "—"}
                sub={`${passCount} of ${aggregatedRows.length} on target`}
                subColor={
                  passRate != null
                    ? passRate >= 80
                      ? "#15803d"
                      : passRate >= 50
                        ? "#a16207"
                        : "#b91c1c"
                    : undefined
                }
                breakdown={passBreakdown}
                tooltipMode="pass"
              />
            </FadeIn>
            <FadeIn visible={revealed(6)}>
              <MetricCard
                label="Months exceeded"
                ui={ui}
                darkMode={darkMode}
                value={exceededCount}
                sub={`of ${aggregatedRows.length} months`}
                subColor={exceededCount > 0 ? "#b91c1c" : "#15803d"}
              />
            </FadeIn>
          </>
        )}
      </div>

      {/* Current month highlight */}
      {!error && !loading && currentMonthRow && (
        <FadeIn visible={revealed(7)}>
          <div
            style={{
              background: darkMode ? "#1a2744" : "#e7f0fd",
              border: `1px solid ${darkMode ? "#2a3f6f" : "#bfd4f9"}`,
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 16,
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "flex-start" : "center",
              gap: isMobile ? 8 : 16,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#1877F2",
                whiteSpace: "nowrap",
              }}
            >
              📅 Current Month — {currentMonthRow.month}
            </span>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: isMobile ? 8 : 16,
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "0.8rem", color: ui.textPrimary }}>
                Avg TAT:{" "}
                <strong>
                  {(+currentMonthRow.avg_tat_days).toFixed(1)} days
                </strong>
              </span>
              <span style={{ fontSize: "0.8rem", color: ui.textSub }}>
                Min: <strong>{currentMonthRow.min_tat_days} days</strong>
              </span>
              <span style={{ fontSize: "0.8rem", color: ui.textSub }}>
                Max: <strong>{currentMonthRow.max_tat_days} days</strong>
              </span>
              <span style={{ fontSize: "0.8rem", color: ui.textSub }}>
                Applications:{" "}
                <strong>
                  {currentMonthRow.total_applications.toLocaleString()}
                </strong>
              </span>
              {/* Doc type pills for current month */}
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {docTypes.map((t) => {
                  const total = rawRows
                    .filter(
                      (d) =>
                        d.month === currentMonthRow.month &&
                        normalizeDocType(d.type_of_doc_released) === t,
                    )
                    .reduce((sum, d) => sum + (d.total_applications ?? 0), 0);

                  if (!total) return null;
                  return (
                    <span
                      key={t}
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: DOC_BG[t] ?? DOC_BG.Other,
                        color: DOC_TEXT[t] ?? DOC_TEXT.Other,
                      }}
                    >
                      {t}: {total}
                    </span>
                  );
                })}
              </div>
              <StatusPill
                avgTat={currentMonthRow.avg_tat_days}
                target={activeTimeline}
              />
            </div>
          </div>
        </FadeIn>
      )}

      {/* Charts */}
      {!error && (
        <div style={{ position: "relative", zIndex: 1 }}>
          <ChartPanel
            aggregatedRows={aggregatedRows}
            rawRows={rawRows}
            docTypes={docTypes}
            activeTimeline={activeTimeline}
            darkMode={darkMode}
            ui={ui}
            loading={loading}
            revealed={revealed}
            isMobile={isMobile}
            heatmapData={heatmapData}
            uniqueYears={uniqueYears}
          />
        </div>
      )}

      {/* Additional charts */}
      {!error && (
        <div style={{ position: "relative", zIndex: 1 }}>
          <AdditionalChartsPanel
            aggregatedRows={aggregatedRows}
            rawRows={rawRows}
            docTypes={docTypes}
            activeTimeline={activeTimeline}
            darkMode={darkMode}
            ui={ui}
            loading={loading}
            revealed={revealed}
            isMobile={isMobile}
          />
        </div>
      )}

      {/* Monthly table */}
      {!error && (
        <FadeIn visible={loading || revealed(11)}>
          <div
            style={{
              background: ui.cardBg,
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderBottom: `1px solid ${ui.cardBorder}`,
                background: colHdr,
                display: "flex",
                alignItems: isMobile ? "flex-start" : "center",
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: ui.textPrimary,
                  }}
                >
                  Monthly breakdown
                  {activeTimeline && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: darkMode ? "#1a2744" : "#e7f0fd",
                        color: "#1877F2",
                      }}
                    >
                      Target: {activeTimeline} days
                    </span>
                  )}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.72rem",
                    color: ui.textMuted,
                  }}
                >
                  Aggregated TAT per calendar month · all doc types
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: ui.textMuted,
                    whiteSpace: "nowrap",
                  }}
                >
                  Rows:
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{ ...selectStyle, padding: "4px 8px", minHeight: 30 }}
                >
                  {PAGE_SIZE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div
              style={{
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
                overflow: "visible",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: isMobile ? 320 : 580,
                  overflow: "visible",
                }}
              >
                <thead>
                  <tr style={{ background: colHdr }}>
                    {tableCols.map((h) => (
                      <th
                        key={h}
                        style={{
                          fontSize: isMobile ? "0.62rem" : "0.67rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: ui.textMuted,
                          padding: isMobile ? "8px 10px" : "9px 14px",
                          textAlign: h === "Month" ? "left" : "center",
                          borderBottom: `1px solid ${ui.cardBorder}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonTableRows
                      ui={ui}
                      rows={3}
                      cols={tableCols.length}
                    />
                  ) : !paginatedRows.length ? (
                    <tr>
                      <td
                        colSpan={tableCols.length}
                        style={{
                          textAlign: "center",
                          padding: "2.5rem",
                          color: ui.textMuted,
                          fontSize: "0.84rem",
                        }}
                      >
                        No data found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom:
                            i < paginatedRows.length - 1
                              ? `1px solid ${ui.cardBorder}`
                              : "none",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = ui.hoverBg)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td
                          style={{
                            padding: isMobile ? "8px 10px" : "10px 14px",
                            fontSize: isMobile ? "0.75rem" : "0.82rem",
                            fontWeight: 700,
                            color: ui.textPrimary,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.month}
                        </td>
                        {!isMobile &&
                          (() => {
                            const rowCountBreakdown = {};
                            docTypes.forEach((t) => {
                              const cnt = rawRows
                                .filter(
                                  (d) =>
                                    d.month === row.month &&
                                    normalizeDocType(d.type_of_doc_released) ===
                                      t,
                                )
                                .reduce(
                                  (s, d) => s + (d.total_applications ?? 0),
                                  0,
                                );
                              if (cnt > 0)
                                rowCountBreakdown[t] = { count: cnt };
                            });
                            return (
                              <td
                                style={{
                                  padding: "10px 14px",
                                  fontSize: "0.8rem",
                                  color: ui.textSub,
                                  textAlign: "center",
                                  position: "relative",
                                }}
                              >
                                <TableCellTooltip
                                  breakdown={rowCountBreakdown}
                                  mode="count"
                                  ui={ui}
                                  darkMode={darkMode}
                                >
                                  <span
                                    style={{
                                      cursor: "help",
                                      borderBottom: `1px dashed ${ui.cardBorder}`,
                                    }}
                                  >
                                    {(
                                      row.total_applications ?? 0
                                    ).toLocaleString()}
                                  </span>
                                </TableCellTooltip>
                              </td>
                            );
                          })()}
                        <td
                          style={{
                            padding: isMobile ? "8px 10px" : "10px 14px",
                            fontSize: isMobile ? "0.75rem" : "0.8rem",
                            color: ui.textPrimary,
                            textAlign: "center",
                            fontWeight: 600,
                            position: "relative",
                          }}
                        >
                          {row.avg_tat_days != null
                            ? (() => {
                                const rowAvgBreakdown = {};
                                docTypes.forEach((t) => {
                                  const rows = rawRows.filter(
                                    (d) =>
                                      d.month === row.month &&
                                      normalizeDocType(
                                        d.type_of_doc_released,
                                      ) === t &&
                                      d.avg_tat_days != null,
                                  );
                                  const sumW = rows.reduce(
                                    (s, d) =>
                                      s +
                                      d.avg_tat_days *
                                        (d.total_applications ?? 1),
                                    0,
                                  );
                                  const sumA = rows.reduce(
                                    (s, d) => s + (d.total_applications ?? 1),
                                    0,
                                  );
                                  if (sumA > 0)
                                    rowAvgBreakdown[t] = {
                                      avg: sumA ? sumW / sumA : null,
                                      count: sumA,
                                    };
                                });
                                return (
                                  <TableCellTooltip
                                    breakdown={rowAvgBreakdown}
                                    mode="avg"
                                    target={activeTimeline}
                                    ui={ui}
                                    darkMode={darkMode}
                                  >
                                    <span
                                      style={{
                                        cursor: "help",
                                        borderBottom: `1px dashed ${ui.cardBorder}`,
                                      }}
                                    >
                                      {`${(+row.avg_tat_days).toFixed(1)}d`}
                                    </span>
                                  </TableCellTooltip>
                                );
                              })()
                            : "—"}
                        </td>
                        {!isMobile && (
                          <>
                            <td
                              style={{
                                padding: "10px 14px",
                                fontSize: "0.8rem",
                                color: ui.textSub,
                                textAlign: "center",
                              }}
                            >
                              {row.min_tat_days != null
                                ? `${row.min_tat_days}d`
                                : "—"}
                            </td>
                            <td
                              style={{
                                padding: "10px 14px",
                                fontSize: "0.8rem",
                                color: ui.textSub,
                                textAlign: "center",
                              }}
                            >
                              {row.max_tat_days != null
                                ? `${row.max_tat_days}d`
                                : "—"}
                            </td>
                          </>
                        )}
                        <td
                          style={{
                            padding: isMobile ? "8px 10px" : "10px 14px",
                            textAlign: "center",
                          }}
                        >
                          {row.avg_tat_days != null &&
                          activeTimeline != null ? (
                            <span
                              style={{
                                fontSize: isMobile ? "0.7rem" : "0.75rem",
                                fontWeight: 700,
                                color:
                                  row.avg_tat_days <= activeTimeline
                                    ? "#15803d"
                                    : "#b91c1c",
                              }}
                            >
                              {row.avg_tat_days - activeTimeline > 0
                                ? `+${(row.avg_tat_days - activeTimeline).toFixed(1)}`
                                : (row.avg_tat_days - activeTimeline).toFixed(
                                    1,
                                  )}
                              d
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td
                          style={{
                            padding: isMobile ? "8px 10px" : "10px 14px",
                            textAlign: "center",
                          }}
                        >
                          <StatusPill
                            avgTat={row.avg_tat_days}
                            target={activeTimeline}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div
                style={{
                  padding: isMobile ? "8px 12px" : "10px 16px",
                  borderTop: `1px solid ${ui.cardBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
                  {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, aggregatedRows.length)} of{" "}
                  {aggregatedRows.length}
                </span>
                <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    style={{
                      ...selectStyle,
                      padding: "4px 8px",
                      opacity: currentPage === 1 ? 0.4 : 1,
                      minHeight: 30,
                    }}
                  >
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      ...selectStyle,
                      padding: "4px 10px",
                      opacity: currentPage === 1 ? 0.4 : 1,
                      minHeight: 30,
                    }}
                  >
                    ‹
                  </button>
                  {isMobile ? (
                    <span
                      style={{
                        fontSize: "0.78rem",
                        color: ui.textPrimary,
                        padding: "0 6px",
                      }}
                    >
                      {currentPage} / {totalPages}
                    </span>
                  ) : (
                    Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === totalPages ||
                          Math.abs(p - currentPage) <= 1,
                      )
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === "..." ? (
                          <span
                            key={`e${idx}`}
                            style={{
                              fontSize: "0.78rem",
                              color: ui.textMuted,
                              padding: "0 4px",
                            }}
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            style={{
                              ...selectStyle,
                              padding: "4px 10px",
                              background:
                                p === currentPage ? "#1877F2" : ui.inputBg,
                              color:
                                p === currentPage ? "#fff" : ui.textPrimary,
                              fontWeight: p === currentPage ? 700 : 400,
                              minHeight: 30,
                            }}
                          >
                            {p}
                          </button>
                        ),
                      )
                  )}
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    style={{
                      ...selectStyle,
                      padding: "4px 10px",
                      opacity: currentPage === totalPages ? 0.4 : 1,
                      minHeight: 30,
                    }}
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    style={{
                      ...selectStyle,
                      padding: "4px 8px",
                      opacity: currentPage === totalPages ? 0.4 : 1,
                      minHeight: 30,
                    }}
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        </FadeIn>
      )}
    </div>
  );
}
