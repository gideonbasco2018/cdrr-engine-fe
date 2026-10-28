// src/components/gmp/dashboard/GMPMonitoringWidgets.jsx
// Visual widgets for FGMP Monitoring's executive-style sections: the workflow
// pipeline, release-rate gauge, backlog-aging bar and evaluator workload list.
// All data is whatever the page already fetched — nothing here invents values;
// the "insight" lines are derived from those same numbers and only appear when
// the data actually supports them.
//
// Theme: every color that changes between light/dark comes from the `ui`
// tokens, so these follow the app's light/dark switch automatically.
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { GMP_STEPS } from "../shared/constants";
import { SkeletonBox, EmptyChart, fmtTime } from "./gmpAnalyticsShared";

const ACCENT = "#0f8a72";
const AMBER = "#b9740f";
const ORANGE = "#e07a2f";
const RED = "#c8384f";

// Keyframes used by the widgets below + the page's cards. Rendered once by the
// view; `prefers-reduced-motion` turns the movement off for anyone who asks.
export function GMPFxStyles() {
  return (
    <style>{`
      @keyframes gmpRise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes gmpGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes gmpFlow { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      @keyframes gmpPulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
      @keyframes gmpDraw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
      .gmp-draw { stroke-dasharray: 1; stroke-dashoffset: 0; animation: gmpDraw 1.1s cubic-bezier(.16,1,.3,1) both; }
      .gmp-card { transition: box-shadow 0.2s ease, transform 0.2s ease; }
      .gmp-card:hover { transform: translateY(-1px); }
      .gmp-rise { animation: gmpRise 0.55s cubic-bezier(.16,1,.3,1) both; }
      .gmp-grow { transform-origin: left center; animation: gmpGrow 0.9s cubic-bezier(.16,1,.3,1) both; }
      @media (prefers-reduced-motion: reduce) {
        .gmp-rise, .gmp-grow, .gmp-draw { animation: none !important; }
        .gmp-card { transition: none; }
        .gmp-flow { animation: none !important; }
      }
    `}</style>
  );
}

// ── Workflow pipeline ────────────────────────────────────────────────────────
// Every open application, step by step, in the order they actually travel.
// FROO is a legacy detour — only shown if something is still sitting there.
// Hover a step to see how long applications usually stay there before they are
// handed to the next step (average of completed hand-overs, from `timing`).
export function GMPPipeline({ items, timing, ui, loading }) {
  const [tip, setTip] = useState(null); // { id, x, y }
  if (loading) return <SkeletonBox height={170} ui={ui} />;

  const timingByStep = Object.fromEntries((timing ?? []).map((t) => [t.step, t]));
  const show = (id) => (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ id, x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
  };

  const counts = Object.fromEntries((items ?? []).map((i) => [i.step, i.count]));
  const steps = GMP_STEPS
    .filter((s) => s.id !== "FROO" || (counts.FROO ?? 0) > 0)
    .map((s) => ({ ...s, count: counts[s.id] ?? 0 }));
  const total = steps.reduce((a, s) => a + s.count, 0);

  if (total === 0) return <EmptyChart label="No open applications right now" ui={ui} />;

  const top = steps.reduce((a, s) => (s.count > a.count ? s : a), steps[0]);
  const share = top.count / total;
  const pileUp = total >= 5 && share >= 0.4;

  return (
    <div>
      {/* Padding (cancelled by the negative margin) gives the hover lift and glow room — the scroll box would clip them otherwise. */}
      <div style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", padding: "16px 14px 18px", margin: "-16px -14px -18px" }}>
        {steps.map((s, i) => {
          const hot = pileUp && s.id === top.id;
          const empty = s.count === 0;
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "flex-start", flex: i === steps.length - 1 ? "0 0 auto" : "1 1 auto", minWidth: 0 }}>
              <div
                className="gmp-rise"
                onMouseEnter={show(s.id)} onMouseLeave={() => setTip(null)}
                onFocus={show(s.id)} onBlur={() => setTip(null)} tabIndex={0}
                style={{ animationDelay: `${i * 70}ms`, width: 96, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "default", outline: "none" }}
              >
                <div
                  style={{
                    width: "100%", height: 66, borderRadius: 11, boxSizing: "border-box",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transform: tip?.id === s.id ? "translateY(-3px)" : "none",
                    transition: "transform 0.18s ease, box-shadow 0.18s ease",
                    background: empty ? ui.inputBg : `${s.color}${hot ? "26" : "18"}`,
                    border: empty ? `1px solid ${ui.cardBorder}` : `${hot ? 1.5 : 1}px solid ${hot ? s.color : `${s.color}55`}`,
                    boxShadow: tip?.id === s.id ? `0 8px 22px -6px ${s.color}` : hot ? `0 0 22px -6px ${s.color}` : "none",
                  }}
                >
                  <span style={{ fontSize: hot ? "1.5rem" : "1.25rem", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: empty ? ui.textMuted : s.color }}>
                    {s.count.toLocaleString()}
                  </span>
                </div>
                <span style={{ fontSize: "0.68rem", textAlign: "center", lineHeight: 1.25, color: hot ? s.color : ui.textSub, fontWeight: hot ? 700 : 500 }}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className="gmp-flow"
                  style={{
                    flex: 1, minWidth: 12, height: 2, marginTop: 32, borderRadius: 2,
                    backgroundImage: `linear-gradient(90deg, ${ui.cardBorder} 0%, ${ui.cardBorder} 35%, ${ACCENT}88 50%, ${ui.cardBorder} 65%, ${ui.cardBorder} 100%)`,
                    backgroundSize: "200% 100%",
                    animation: "gmpFlow 3.2s linear infinite",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {tip && (() => {
        const idx = steps.findIndex((x) => x.id === tip.id);
        const cur = steps[idx];
        const next = steps[idx + 1];
        const t = timingByStep[cur.id];
        const W = 230;
        const left = Math.max(8, Math.min(window.innerWidth - W - 8, tip.x - W / 2));
        // Open below the step; flip above it when there isn't room (near the bottom of the screen).
        const above = tip.bottom + 210 > window.innerHeight && tip.top > 210;
        const pos = above ? { bottom: window.innerHeight - tip.top + 10 } : { top: tip.bottom + 10 };
        return createPortal(
          <div
            role="tooltip"
            style={{
              position: "fixed", left, ...pos, width: W, zIndex: 12000, pointerEvents: "none",
              padding: "12px 14px", borderRadius: 12, background: ui.cardBg, border: `1px solid ${ui.cardBorder}`,
              boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
            }}
          >
            <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: ui.textMuted }}>
              {cur.label} → {next ? next.label : "Released"}
            </div>
            {t && t.avg_minutes != null ? (
              <>
                <div style={{ fontSize: "1.35rem", fontWeight: 800, color: cur.color, margin: "4px 0 2px", fontVariantNumeric: "tabular-nums" }}>{fmtTime(t.avg_minutes)}</div>
                <div style={{ fontSize: "0.72rem", color: ui.textSub, lineHeight: 1.5 }}>
                  average before it moves to {next ? next.label : "release"}
                </div>
                <div style={{ fontSize: "0.68rem", color: ui.textMuted, marginTop: 6 }}>
                  Fastest {fmtTime(t.min_minutes)} · Slowest {fmtTime(t.max_minutes)} · weekends not counted
                </div>
              </>
            ) : (
              <div style={{ fontSize: "0.76rem", color: ui.textSub, marginTop: 4 }}>No completed hand-overs yet, so there is no average.</div>
            )}
            <div style={{ fontSize: "0.68rem", color: ui.textMuted, marginTop: 6, borderTop: `1px solid ${ui.divider}`, paddingTop: 6 }}>
              Based on {t ? t.total.toLocaleString() : 0} finished {cur.label} step{t?.total === 1 ? "" : "s"} · {cur.count.toLocaleString()} open here now
            </div>
          </div>,
          document.body,
        );
      })()}

      {pileUp && (
        <div style={{
          marginTop: 16, padding: "12px 14px", borderRadius: 10, display: "flex", gap: 10, alignItems: "flex-start",
          background: `${AMBER}14`, border: `1px solid ${AMBER}44`,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: AMBER, marginTop: 5, flexShrink: 0, animation: "gmpPulseDot 1.8s ease-in-out infinite" }} />
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: AMBER }}>{top.label} holds most of the open work</div>
            <div style={{ fontSize: "0.76rem", color: ui.textSub, marginTop: 2, lineHeight: 1.5 }}>
              {top.count.toLocaleString()} of {total.toLocaleString()} open applications — {Math.round(share * 100)}% — are sitting at this step right now.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Release-rate gauge ───────────────────────────────────────────────────────
export function GMPReleaseGauge({ summary, ui, loading }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    if (loading) return undefined;
    setDrawn(false);
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, [loading, summary?.release_rate]);

  if (loading || !summary) return <SkeletonBox height={150} ui={ui} />;

  const rate = Math.max(0, Math.min(100, Number(summary.release_rate) || 0));
  const R = 54;
  const C = 2 * Math.PI * R;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: 132, height: 132, flexShrink: 0 }}>
        <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={`Release rate ${rate}%`}>
          <circle cx="66" cy="66" r={R} fill="none" stroke={ui.progressBg} strokeWidth="12" />
          <circle
            cx="66" cy="66" r={R} fill="none" stroke={ACCENT} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={drawn ? C * (1 - rate / 100) : C}
            transform="rotate(-90 66 66)"
            style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "1.5rem", fontWeight: 800, color: ACCENT, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{rate}%</span>
          <span style={{ fontSize: "0.62rem", color: ui.textMuted, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>released</span>
        </div>
      </div>
      <div style={{ flex: "1 1 140px", minWidth: 0 }}>
        <div style={{ fontSize: "0.78rem", color: ui.textSub, lineHeight: 1.55 }}>
          <b style={{ color: ui.textPrimary }}>{(summary.released ?? 0).toLocaleString()}</b> of{" "}
          <b style={{ color: ui.textPrimary }}>{(summary.total ?? 0).toLocaleString()}</b> records have reached final release.
        </div>
        {summary.avg_tat_days != null && (
          <div style={{ fontSize: "0.72rem", color: ui.textMuted, marginTop: 6 }}>
            Average {summary.avg_tat_days} working days from received to released.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Backlog aging — one bar, split by age bucket ─────────────────────────────
const AGING_COLORS = [ACCENT, AMBER, ORANGE, RED];

export function GMPAgingBar({ items, ui, loading }) {
  if (loading) return <SkeletonBox height={110} ui={ui} />;
  const list = items ?? [];
  const total = list.reduce((a, b) => a + (b.count || 0), 0);
  if (!list.length || total === 0) return <EmptyChart label="No records on process" ui={ui} />;

  const last = list[list.length - 1];
  const lastShare = (last.count || 0) / total;

  return (
    <div>
      <div style={{ height: 30, borderRadius: 8, overflow: "hidden", display: "flex", background: ui.progressBg }}>
        {list.map((b, i) => (
          <div
            key={b.label}
            className="gmp-grow"
            title={`${b.label}: ${b.count}`}
            style={{ width: `${(b.count / total) * 100}%`, height: "100%", background: AGING_COLORS[Math.min(i, AGING_COLORS.length - 1)], animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${list.length}, minmax(0, 1fr))`, gap: 8, marginTop: 12 }}>
        {list.map((b, i) => (
          <div key={b.label}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: AGING_COLORS[Math.min(i, AGING_COLORS.length - 1)] }} />
              <span style={{ fontSize: "0.68rem", color: ui.textSub }}>{b.label}</span>
            </div>
            <div style={{ fontSize: "0.92rem", fontWeight: 700, color: ui.textPrimary, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{b.count.toLocaleString()}</div>
          </div>
        ))}
      </div>
      {lastShare >= 0.5 && (
        <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 9, background: `${RED}12`, border: `1px solid ${RED}38`, fontSize: "0.74rem", color: ui.textSub, lineHeight: 1.5 }}>
          <b style={{ color: RED }}>{Math.round(lastShare * 100)}%</b> of the open backlog has been waiting {String(last.label).toLowerCase()}.
        </div>
      )}
    </div>
  );
}

// ── Evaluator workload — ranked list with a bar per person ───────────────────
function initials(name) {
  const s = String(name || "?").trim();
  return s.slice(0, 2).toUpperCase();
}

export function GMPWorkloadList({ items, ui, loading }) {
  if (loading) return <SkeletonBox height={150} ui={ui} />;
  const list = items ?? [];
  if (!list.length) return <EmptyChart label="No open tasks assigned" ui={ui} />;
  const max = Math.max(...list.map((w) => w.open_count || 0), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 280, overflowY: "auto", paddingRight: 4 }}>
      {list.map((w, i) => {
        const n = w.open_count || 0;
        const heavy = n / max >= 0.6 && n > 0;
        return (
          <div key={`${w.evaluator}-${i}`} style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.66rem", fontWeight: 700,
              background: heavy ? `${AMBER}22` : ui.inputBg, color: heavy ? AMBER : ui.textMuted,
            }}>
              {initials(w.evaluator)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: "0.78rem", marginBottom: 5 }}>
                <span style={{ color: ui.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.evaluator}</span>
                <span style={{ fontWeight: 700, color: ui.textPrimary, fontVariantNumeric: "tabular-nums" }}>{n.toLocaleString()}</span>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: ui.progressBg, overflow: "hidden" }}>
                <div
                  className="gmp-grow"
                  title={w.avg_tat_days != null ? `Avg TAT ${w.avg_tat_days}d (working days)` : "Avg TAT —"}
                  style={{ width: `${Math.max(2, (n / max) * 100)}%`, height: "100%", borderRadius: 4, background: heavy ? AMBER : ui.textMuted, animationDelay: `${i * 60}ms` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
