// src/components/monitoring/frpMonitoring/FRPMonitoringView.jsx
// FRP Monitoring Dashboard — comprehensive pipeline health overview
// v6 — uses centralised API service (src/api/frpMonitoring.js)
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Chart, registerables } from "chart.js";
import ApplicationsModal from "./ApplicationsModal";

import {
  getKpiSummary,
  getAppStatusBreakdown,
  getStatusDistribution,
  getDocTypes,
  getProductCategories,
  getCompliance,
  getCprTrend,
  getRecentActivity,
  getAlerts,
  getTopCountries,
} from "../../../api/frpMonitoring";

Chart.register(...registerables);

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCENT = "#6366f1";
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const DYNAMIC_PALETTE = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ec4899",
  "#ef4444", "#06b6d4", "#8b5cf6", "#f97316", "#14b8a6",
  "#a3e635", "#fb923c", "#818cf8", "#34d399", "#fbbf24",
  "#f43f5e", "#22d3ee", "#a78bfa", "#4ade80", "#e879f9",
];

const colorCache = {};
let colorIndex = 0;
function getDynamicColor(label) {
  if (!label) return "#6b7280";
  if (colorCache[label]) return colorCache[label];
  const color = DYNAMIC_PALETTE[colorIndex % DYNAMIC_PALETTE.length];
  colorCache[label] = color;
  colorIndex++;
  return color;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeDocType(raw) {
  if (!raw || !raw.trim()) return "Not Yet Assigned";
  return raw.trim();
}

function useIsMobile(bp = 640) {
  const [m, setM] = useState(
    () => typeof window !== "undefined" && window.innerWidth < bp,
  );
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}

function formatNumber(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString();
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ISO 2-letter short code from a country name
function isoCode(name) {
  if (!name) return "??";
  const n = name.trim().toUpperCase();
  const MAP = {
    "INDIA":"IN","PHILIPPINES":"PH","CHINA":"CN","PAKISTAN":"PK",
    "FRANCE":"FR","GERMANY":"DE","UNITED STATES":"US","USA":"US","US FDA":"US","FDA":"US",
    "EUROPEAN MEDICINES AGENCY":"EU","EMA":"EU","EUROPE":"EU",
    "JAPAN":"JP","PMDA":"JP","PMDA JAPAN":"JP",
    "CANADA":"CA","HEALTH CANADA":"CA",
    "AUSTRALIA":"AU","TGA":"AU",
    "UNITED KINGDOM":"GB","UK":"GB","MHRA":"GB",
    "SWITZERLAND":"CH","SWISSMEDIC":"CH",
    "SINGAPORE":"SG","HSA":"SG",
    "SOUTH KOREA":"KR","KOREA":"KR","MFDS":"KR",
    "BRAZIL":"BR","ANVISA":"BR",
    "MALAYSIA":"MY","NPRA":"MY",
    "THAILAND":"TH",
    "INDONESIA":"ID","BPOM":"ID",
    "MEXICO":"MX","COFEPRIS":"MX",
    "SOUTH AFRICA":"ZA","SAHPRA":"ZA",
    "NEW ZEALAND":"NZ","MEDSAFE":"NZ",
  };
  return MAP[n] ?? name.trim().slice(0, 2).toUpperCase();
}

// ─── Animation CSS ────────────────────────────────────────────────────────────
const ANIM_CSS = `
@keyframes frpShimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
@keyframes frpFadeSlideIn {
  0%   { opacity: 0; transform: translateY(16px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes frpModalIn {
  0%   { opacity: 0; transform: scale(0.94) translateY(12px); }
  100% { opacity: 1; transform: scale(1)    translateY(0); }
}
@keyframes frpBackdropIn {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}
`;
function GlobalAnimCSS() { return <style>{ANIM_CSS}</style>; }

// ─── Base Components ──────────────────────────────────────────────────────────
function CardShell({ children, ui, darkMode, style = {} }) {
  return (
    <div style={{
      background: darkMode ? "rgba(36,37,38,0.75)" : "rgba(255,255,255,0.72)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
      borderRadius: 14,
      padding: "16px 18px",
      boxShadow: darkMode ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.08)",
      height: "100%",
      width: "100%",
      boxSizing: "border-box",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title, subtitle, ui }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h3 style={{ margin: "0 0 2px", fontSize: "0.86rem", fontWeight: 700, color: ui.textPrimary, fontFamily: FONT, display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: "0.95rem" }}>{icon}</span>
        {title}
      </h3>
      {subtitle && (
        <p style={{ margin: 0, fontSize: "0.7rem", color: ui.textMuted, fontFamily: FONT }}>{subtitle}</p>
      )}
    </div>
  );
}

function SkeletonBox({ height = 74, borderRadius = 14, darkMode, ui, style = {} }) {
  const base  = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const shine = darkMode
    ? "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)"
    : "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)";
  return (
    <div style={{ height, borderRadius, background: base, position: "relative", overflow: "hidden", flexShrink: 0, ...style }}>
      <GlobalAnimCSS />
      <div style={{ position: "absolute", inset: 0, background: shine, animation: "frpShimmer 1.4s ease-in-out infinite" }} />
    </div>
  );
}

function TileFadeIn({ children, ready, delay = 0 }) {
  const [visible, setVisible] = React.useState(false);
  const hasBeenReady = React.useRef(false);
  React.useEffect(() => {
    if (ready) {
      hasBeenReady.current = true;
      const t = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(t);
    }
    if (!hasBeenReady.current) setVisible(false);
  }, [ready, delay]);
  return (
    <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)", transition: "opacity 0.45s ease, transform 0.45s ease", willChange: "opacity, transform" }}>
      {children}
    </div>
  );
}

function EmptyState({ icon = "📭", message = "No data available", ui }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px", gap: 8 }}>
      <span style={{ fontSize: "1.8rem" }}>{icon}</span>
      <p style={{ margin: 0, fontSize: "0.75rem", color: ui.textMuted, textAlign: "center" }}>{message}</p>
    </div>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ slices, darkMode, ui }) {
  const [hovered, setHovered] = useState(null);
  const cx = 110, cy = 110, outerR = 90, innerR = 54;
  const SVG_SIZE = 220;
  const total = slices.reduce((s, d) => s + d.value, 0);

  if (total === 0)
    return <div style={{ textAlign: "center", color: ui.textMuted, fontSize: "0.8rem", padding: "24px 0" }}>No data</div>;

  let cursor = -Math.PI / 2;
  const arcs = slices.map((sl) => {
    const angle = (sl.value / total) * 2 * Math.PI;
    const start = cursor;
    const end   = cursor + angle;
    cursor += angle;
    const ox1 = cx + outerR * Math.cos(start); const oy1 = cy + outerR * Math.sin(start);
    const ox2 = cx + outerR * Math.cos(end);   const oy2 = cy + outerR * Math.sin(end);
    const ix1 = cx + innerR * Math.cos(end);   const iy1 = cy + innerR * Math.sin(end);
    const ix2 = cx + innerR * Math.cos(start); const iy2 = cy + innerR * Math.sin(start);
    const large = angle > Math.PI ? 1 : 0;
    return { ...sl, path: `M${ox1},${oy1} A${outerR},${outerR} 0 ${large},1 ${ox2},${oy2} L${ix1},${iy1} A${innerR},${innerR} 0 ${large},0 ${ix2},${iy2} Z`, midAngle: (start + end) / 2, pct: ((sl.value / total) * 100).toFixed(1) };
  });

  const hoveredSlice = hovered !== null ? arcs[hovered] : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div style={{ position: "relative", flexShrink: 0, width: SVG_SIZE, maxWidth: "100%" }}>
        <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
          {arcs.map((arc, i) => {
            const isHov = hovered === i;
            return (
              <path key={i} d={arc.path} fill={arc.color}
                opacity={hovered === null || isHov ? 1 : 0.4}
                transform={isHov ? `translate(${Math.cos(arc.midAngle) * 8},${Math.sin(arc.midAngle) * 8})` : ""}
                style={{ cursor: "pointer", transition: "all 0.18s ease" }}
                onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
              />
            );
          })}
          {hoveredSlice ? (
            <>
              <text x={cx} y={cy - 10} textAnchor="middle" fontSize={22} fontWeight={800} fill={hoveredSlice.color} fontFamily={FONT}>{hoveredSlice.value.toLocaleString()}</text>
              <text x={cx} y={cy + 8}  textAnchor="middle" fontSize={9}  fontWeight={600} fill={ui.textMuted} fontFamily={FONT}>{hoveredSlice.name.toUpperCase()}</text>
              <text x={cx} y={cy + 22} textAnchor="middle" fontSize={11} fontWeight={700} fill={hoveredSlice.color} fontFamily={FONT}>{hoveredSlice.pct}%</text>
            </>
          ) : (
            <>
              <text x={cx} y={cy - 6}  textAnchor="middle" fontSize={26} fontWeight={800} fill={ui.textPrimary} fontFamily={FONT}>{total.toLocaleString()}</text>
              <text x={cx} y={cy + 13} textAnchor="middle" fontSize={9}  fontWeight={600} fill={ui.textMuted} fontFamily={FONT}>TOTAL</text>
            </>
          )}
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, minWidth: 140 }}>
        {arcs.map((arc, i) => (
          <div key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ display: "flex", flexDirection: "column", gap: 2, cursor: "pointer", opacity: hovered === null || hovered === i ? 1 : 0.4, transition: "opacity 0.15s", padding: "2px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: arc.color, flexShrink: 0 }} />
              <span style={{ fontSize: "0.78rem", color: ui.textPrimary, fontWeight: hovered === i ? 700 : 600, flex: 1 }}>{arc.name}</span>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: arc.color }}>{arc.value.toLocaleString()}</span>
              <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>({arc.pct}%)</span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <div style={{ width: `${arc.pct}%`, height: "100%", background: arc.color, borderRadius: 99, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── KPI Section ──────────────────────────────────────────────────────────────
function KpiSkeletonCard({ ui, darkMode }) {
  return (
    <CardShell ui={ui} darkMode={darkMode} style={{ minHeight: 88 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <SkeletonBox height={36} borderRadius={10} ui={ui} darkMode={darkMode} style={{ width: 36, flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <SkeletonBox height={8} borderRadius={4} ui={ui} darkMode={darkMode} style={{ width: "52%" }} />
          <SkeletonBox height={22} borderRadius={6} ui={ui} darkMode={darkMode} style={{ width: "68%" }} />
          <SkeletonBox height={7} borderRadius={4} ui={ui} darkMode={darkMode} style={{ width: "38%" }} />
        </div>
      </div>
    </CardShell>
  );
}

function KpiCard({ item, statusData, ui, darkMode, onOpenModal }) {
  const [hovered, setHovered] = useState(false);
  const statusEntries = useMemo(() => {
    if (!statusData?.data) return [];
    return [...statusData.data].sort((a, b) => b.count - a.count);
  }, [statusData]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative", zIndex: hovered ? 9999 : 1,
        background: darkMode ? "rgba(36,37,38,0.8)" : "rgba(255,255,255,0.85)",
        backdropFilter: "blur(10px)",
        border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
        borderRadius: 14, padding: "14px 16px",
        boxShadow: darkMode ? "0 4px 18px rgba(0,0,0,0.4)" : "0 4px 18px rgba(0,0,0,0.08)",
        transition: "transform 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        cursor: item.filterType ? "pointer" : "default",
      }}
      onClick={() => { if (item.filterType) onOpenModal(item.filterType); }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: "1.1rem", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", flexShrink: 0 }}>{item.icon}</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: "0 0 2px", fontSize: "0.62rem", color: ui.textMuted, fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{item.label}</p>
          <p style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: item.accent ?? ui.textPrimary, fontFamily: FONT, lineHeight: 1.2 }}>{item.value}</p>
          <p style={{ margin: "3px 0 0", fontSize: "0.62rem", color: ui.textMuted, fontFamily: FONT }}>{item.sub}</p>
        </div>
      </div>
      {statusEntries.length > 0 && (
        <span style={{ position: "absolute", top: 7, right: 9, fontSize: "0.58rem", color: ui.textMuted, opacity: 0.55 }}>hover ↑</span>
      )}
      {hovered && statusEntries.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, minWidth: 220, background: darkMode ? "rgba(28,28,30,0.97)" : "rgba(255,255,255,0.98)", border: `1px solid ${darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`, borderRadius: 12, padding: "12px 14px", boxShadow: darkMode ? "0 8px 32px rgba(0,0,0,0.5)" : "0 8px 32px rgba(0,0,0,0.12)", zIndex: 9999 }}>
          <p style={{ margin: "0 0 10px", fontSize: "0.65rem", fontWeight: 700, color: ui.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Application Breakdown</p>
          {statusEntries.map((s) => {
            const total = statusData.total ?? statusEntries.reduce((sum, x) => sum + x.count, 0);
            const pct   = total ? ((s.count / total) * 100).toFixed(1) : 0;
            const color = getDynamicColor(s.status);
            return (
              <div key={s.status} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: "0.72rem", color: ui.textPrimary, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block", flexShrink: 0 }} />
                    {s.status}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: ui.textMuted, fontWeight: 600 }}>{s.count.toLocaleString()} ({pct}%)</span>
                </div>
                <div style={{ height: 4, background: `${color}25`, borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KpiSection({ summary, statusData, loading, ui, darkMode, onOpenModal }) {
  const items = [
    { label: "Total Applications",   value: formatNumber(summary?.total_applications ?? summary?.total), sub: "All FRP submissions",           icon: "📦", accent: null,      filterType: "all" },
    { label: "Released This Month",  value: formatNumber(summary?.released_this_month ?? summary?.due_this_month), sub: "Released in current month",  icon: "📅", accent: "#6366f1", filterType: "released_this_month" },
    { label: "Avg Processing Time",  value: summary?.avg_tat_days != null ? `${summary.avg_tat_days}d` : summary?.avg_processing_days != null ? `${summary.avg_processing_days}d` : "—", sub: "Mean turnaround", icon: "⏱️", accent: null, filterType: null },
    { label: "Pending Compliance",   value: formatNumber(summary?.pending), sub: "Awaiting client compliance",   icon: "⚠️", accent: "#f59e0b", filterType: "pending_compliance" },
    { label: "Overdue",              value: formatNumber(summary?.overdue), sub: "Exceeding SLA target",          icon: "🚫", accent: "#ef4444", filterType: "overdue" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 16, position: "relative", zIndex: 100, overflow: "visible" }}>
      {items.map((item) =>
        loading
          ? <KpiSkeletonCard key={item.label} ui={ui} darkMode={darkMode} />
          : <KpiCard key={item.label} item={item} statusData={item.label === "Total Applications" ? statusData : null} ui={ui} darkMode={darkMode} onOpenModal={onOpenModal} />
      )}
    </div>
  );
}

// ─── Status Donut ─────────────────────────────────────────────────────────────
function StatusDonutSection({ statusData, loading, ui, darkMode }) {
  const entries = useMemo(() => {
    if (!statusData?.data) return [];
    return [...statusData.data].map((d) => [d.status || "Unknown", d.count]).sort((a, b) => b[1] - a[1]);
  }, [statusData]);
  const total = statusData?.total ?? entries.reduce((s, [, v]) => s + v, 0);

  if (loading) return (
    <CardShell ui={ui} darkMode={darkMode}>
      <SectionTitle icon="📊" title="Application Type Distribution" ui={ui} />
      <div style={{ display: "flex", gap: 16 }}>
        <SkeletonBox height={180} borderRadius={999} ui={ui} darkMode={darkMode} style={{ width: 180, flexShrink: 0, borderRadius: "50%" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2,3,4,5].map(i => <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}><SkeletonBox height={10} borderRadius={4} ui={ui} /><SkeletonBox height={6} borderRadius={99} ui={ui} /></div>)}
        </div>
      </div>
    </CardShell>
  );

  if (!entries.length) return (
    <CardShell ui={ui} darkMode={darkMode}>
      <SectionTitle icon="📊" title="Application Type Distribution" ui={ui} />
      <EmptyState icon="📊" message="No application type data available" ui={ui} />
    </CardShell>
  );

  return (
    <CardShell ui={ui} darkMode={darkMode}>
      <SectionTitle icon="📊" title="Application Type Distribution" subtitle={`${total.toLocaleString()} total FRP and CRP applications`} ui={ui} />
      <DonutChart slices={entries.map(([name, value]) => ({ name, value, color: getDynamicColor(name) }))} darkMode={darkMode} ui={ui} />
    </CardShell>
  );
}

// ─── Doc Type Donut ───────────────────────────────────────────────────────────
function DocTypeDonutSection({ docTypeData, loading, ui, darkMode }) {
  const entries = useMemo(() => {
    if (!docTypeData?.data) return [];
    return [...docTypeData.data].map((d) => [normalizeDocType(d.doc_type), d.count]).sort((a, b) => b[1] - a[1]);
  }, [docTypeData]);
  const total = docTypeData?.total ?? entries.reduce((s, [, v]) => s + v, 0);

  if (loading) return (
    <CardShell ui={ui} darkMode={darkMode}>
      <SectionTitle icon="📄" title="Document Types" ui={ui} />
      <div style={{ display: "flex", gap: 16 }}>
        <SkeletonBox height={180} borderRadius={999} ui={ui} darkMode={darkMode} style={{ width: 180, flexShrink: 0, borderRadius: "50%" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}><SkeletonBox height={10} borderRadius={4} ui={ui} /><SkeletonBox height={6} borderRadius={99} ui={ui} /></div>)}
        </div>
      </div>
    </CardShell>
  );

  if (!entries.length) return (
    <CardShell ui={ui} darkMode={darkMode}>
      <SectionTitle icon="📄" title="Document Types" ui={ui} />
      <EmptyState icon="⏳" message="No documents released yet. Data will appear once applications are processed." ui={ui} />
    </CardShell>
  );

  return (
    <CardShell ui={ui} darkMode={darkMode}>
      <SectionTitle icon="📄" title="Document Types" subtitle={`${total.toLocaleString()} total · ${entries.length} types`} ui={ui} />
      <DonutChart slices={entries.map(([name, value]) => ({ name, value, color: getDynamicColor(name) }))} darkMode={darkMode} ui={ui} />
    </CardShell>
  );
}

// ─── Top Countries ────────────────────────────────────────────────────────────
const ENTITY_TABS = [
  { key: "manufacturer", label: "Manufacturer", icon: "🏭", color: "#3b82f6" },
  { key: "trader",       label: "Trader",        icon: "🤝", color: "#f59e0b" },
  { key: "importer",     label: "Importer",      icon: "📦", color: "#8b5cf6" },
  { key: "distributor",  label: "Distributor",   icon: "🚚", color: "#10b981" },
  { key: "repacker",     label: "Repacker",      icon: "📫", color: "#ec4899" },
];

function TopCountriesSection({ loading, ui, darkMode, isMobile }) {
  const [page, setPage]             = useState(1);
  const [activeTab, setActiveTab]   = useState("manufacturer");
  const [tabData, setTabData]       = useState({});
  const [tabLoading, setTabLoading] = useState(true);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const PAGE_SIZE = 5;

  useEffect(() => {
    if (tabData[activeTab]) return;
    setTabLoading(true);
    getTopCountries(activeTab)
      .then((d) => setTabData((prev) => ({ ...prev, [activeTab]: d })))
      .catch(() => setTabData((prev) => ({ ...prev, [activeTab]: { data: [] } })))
      .finally(() => setTabLoading(false));
  }, [activeTab]);

  useEffect(() => { setPage(1); }, [activeTab]);

  const countryData = useMemo(() => {
    const d = tabData[activeTab]?.data ?? [];
    return [...d].map((r) => ({ ...r, name: r.country ?? r.name ?? "" })).filter((r) => r.name).sort((a, b) => b.total - a.total);
  }, [tabData, activeTab]);

  const activeTabConfig = ENTITY_TABS.find(t => t.key === activeTab);
  const themeColor  = activeTabConfig?.color ?? "#3b82f6";
  const totalPages  = Math.ceil(countryData.length / PAGE_SIZE);
  const paginated   = countryData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const top3        = countryData.slice(0, 3);
  const maxTotal    = countryData[0]?.total ?? 1;
  const totalApps   = countryData.reduce((s, a) => s + a.total, 0);
  const topCountry  = countryData[0];
  const topCpr      = countryData.reduce((best, a) => (!best || a.approved > best.approved ? a : best), null);

  const divider   = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const cardBg    = darkMode ? "rgba(255,255,255,0.04)" : "#fff";
  const cardShadow = darkMode ? "none" : "0 1px 4px rgba(0,0,0,0.06)";

  if (loading) return (
    <CardShell ui={ui} darkMode={darkMode}>
      <SectionTitle icon="🌍" title="Top Countries by Entity Type" ui={ui} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[1,2,3,4,5].map(i => <SkeletonBox key={i} height={72} borderRadius={12} ui={ui} darkMode={darkMode} />)}
      </div>
    </CardShell>
  );

  return (
    <CardShell ui={ui} darkMode={darkMode}>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 2px", fontSize: "0.86rem", fontWeight: 700, color: ui.textPrimary, fontFamily: FONT }}>🌍 Top Countries by Entity Type</h3>
        <p style={{ margin: 0, fontSize: "0.7rem", color: ui.textMuted, fontFamily: FONT }}>Country of origin per application role</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, overflowX: isMobile ? "auto" : "visible" }}>
        {ENTITY_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 14px", fontSize: "0.72rem", fontWeight: isActive ? 700 : 500, fontFamily: FONT, borderRadius: 20, border: `1px solid ${isActive ? tab.color + "60" : darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, background: isActive ? `${tab.color}15` : "transparent", color: isActive ? tab.color : ui.textMuted, cursor: "pointer", transition: "all 0.15s ease", outline: "none" }}>
              <span style={{ fontSize: "0.85rem" }}>{tab.icon}</span>{tab.label}
            </button>
          );
        })}
      </div>

      {tabLoading && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{[1,2,3,4,5].map(i => <SkeletonBox key={i} height={72} borderRadius={12} ui={ui} darkMode={darkMode} />)}</div>}
      {!tabLoading && !countryData.length && <EmptyState icon="🌍" message={`No country data for ${activeTabConfig?.label ?? activeTab}`} ui={ui} />}

      {!tabLoading && countryData.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {paginated.map((a, i) => {
              const globalIdx = (page - 1) * PAGE_SIZE + i;
              const rankLabel = globalIdx === 0 ? "🥇" : globalIdx === 1 ? "🥈" : globalIdx === 2 ? "🥉" : `#${globalIdx + 1}`;
              const code = isoCode(a.name);
              const pct  = maxTotal > 0 ? (a.total / maxTotal) * 100 : 0;
              return (
                <div key={a.name} onMouseEnter={() => setHoveredCountry(a.name)} onMouseLeave={() => setHoveredCountry(null)}
                  style={{ background: cardBg, borderRadius: 12, padding: "10px 14px", border: `1px solid ${hoveredCountry === a.name ? themeColor + "50" : darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`, boxShadow: cardShadow, transition: "border 0.15s ease" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: themeColor, minWidth: 28 }}>{rankLabel}</span>
                    <span style={{ fontSize: "0.62rem", fontWeight: 800, color: themeColor, background: `${themeColor}15`, border: `1px solid ${themeColor}40`, borderRadius: 5, padding: "1px 6px", flexShrink: 0 }}>{code}</span>
                    <span style={{ fontSize: "0.82rem", color: ui.textPrimary, fontWeight: 700, flex: 1 }}>{a.name}</span>
                    <span style={{ fontSize: "0.95rem", fontWeight: 800, color: themeColor }}>{a.total.toLocaleString()}</span>
                  </div>
                  <div style={{ height: 4, background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)", borderRadius: 99, overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: themeColor, borderRadius: 99, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
                  </div>
                  <div style={{ display: "flex", gap: 14 }}>
                    <span style={{ fontSize: "0.68rem", color: "#10b981", fontWeight: 600 }}>✅ {a.approved.toLocaleString()}</span>
                    <span style={{ fontSize: "0.68rem", color: "#ef4444", fontWeight: 600 }}>✕ {a.rejected.toLocaleString()}</span>
                    <span style={{ fontSize: "0.68rem", color: "#f59e0b", fontWeight: 600 }}>⏳ {a.pending.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, paddingTop: 8, borderTop: `1px solid ${divider}` }}>
                <span style={{ fontSize: "0.68rem", color: ui.textMuted }}>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, countryData.length)} of {countryData.length}</span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${divider}`, background: "transparent", color: ui.textMuted, cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1, fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                  <span style={{ fontSize: "0.72rem", color: ui.textPrimary, padding: "0 6px", display: "flex", alignItems: "center" }}>{page}/{totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${divider}`, background: "transparent", color: ui.textMuted, cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1, fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {top3.length >= 2 && (
              <div style={{ background: cardBg, border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`, borderRadius: 14, padding: "14px 12px 0", boxShadow: cardShadow }}>
                <p style={{ margin: "0 0 14px", fontSize: "0.65rem", fontWeight: 700, color: ui.textMuted, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.08em" }}>🏆 TOP 3 PODIUM</p>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: isMobile ? 2 : 4, height: isMobile ? 150 : 190 }}>
                  {[
                    { data: top3[1], rank: 2, height: 90,  medal: "🥈", color: "#94a3b8" },
                    { data: top3[0], rank: 1, height: 130, medal: "🥇", color: themeColor },
                    { data: top3[2], rank: 3, height: 70,  medal: "🥉", color: "#b45309" },
                  ].map(({ data: a, rank, height, medal, color }) => {
                    if (!a) return <div key={rank} style={{ flex: 1 }} />;
                    return (
                      <div key={a.name} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
                        <span style={{ fontSize: "0.68rem", color: ui.textMuted, fontWeight: 700, marginBottom: 2 }}>{medal} #{rank}</span>
                        <span style={{ fontSize: "1.3rem", fontWeight: 900, color, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 2 }}>{isoCode(a.name)}</span>
                        <span style={{ fontSize: "0.6rem", color: ui.textMuted, marginBottom: 4, textAlign: "center", maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                        <div style={{ width: "100%", height, background: `${color}18`, border: `1.5px solid ${color}50`, borderRadius: "8px 8px 0 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: rank === 1 ? "1.1rem" : "0.9rem", fontWeight: 800, color }}>{a.total.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { icon: "🌍", label: "COUNTRIES",  value: countryData.length,                        valueColor: themeColor },
                { icon: "📋", label: "TOTAL APPS", value: totalApps.toLocaleString(),                 valueColor: themeColor },
                { icon: "🥇", label: "#1 COUNTRY", value: topCountry?.name ?? "—",                   valueColor: "#f59e0b", small: true },
                { icon: "✅", label: "#1 CPR",     value: topCpr?.approved?.toLocaleString() ?? "—", valueColor: "#10b981" },
              ].map((card) => (
                <div key={card.label} style={{ background: cardBg, border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`, borderRadius: 12, padding: "10px 12px", boxShadow: cardShadow }}>
                  <p style={{ margin: "0 0 4px", fontSize: "0.58rem", fontWeight: 700, color: ui.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 4 }}><span>{card.icon}</span>{card.label}</p>
                  <p style={{ margin: 0, fontSize: card.small ? "0.82rem" : "1.2rem", fontWeight: 800, color: card.valueColor, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </CardShell>
  );
}

// ─── Product Category ─────────────────────────────────────────────────────────
function ProductCategorySection({ categoryData, loading, ui, darkMode, isMobile }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  const { categories, catData, total } = useMemo(() => {
    const items  = categoryData?.data ?? [];
    const sorted = [...items].sort((a, b) => b.count - a.count);
    const tot    = sorted.reduce((s, d) => s + d.count, 0);
    return { categories: sorted.map((d) => d.category), catData: Object.fromEntries(sorted.map((d) => [d.category, d.count])), total: tot };
  }, [categoryData]);

  useEffect(() => {
    chartRef.current?.destroy();
    if (!canvasRef.current || !categories.length) return;
    const gridCol = darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
    const tickCol = darkMode ? "#b0b3b8" : "#65676b";
    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: { labels: categories, datasets: [{ label: "Applications", data: categories.map((c) => catData[c] ?? 0), backgroundColor: categories.map((c) => getDynamicColor(c)), borderRadius: 8, borderSkipped: false, barThickness: categories.length <= 3 ? 60 : categories.length <= 6 ? 40 : 24 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y.toLocaleString()} applications (${total > 0 ? ((ctx.parsed.y / total) * 100).toFixed(1) : 0}%)` } } }, scales: { x: { ticks: { color: tickCol, font: { size: 11 }, maxRotation: 30, callback: function(val, idx) { const l = categories[idx] ?? ""; return l.length > 20 ? l.slice(0, 18) + "…" : l; } }, grid: { display: false }, border: { display: false } }, y: { ticks: { color: tickCol, font: { size: 11 }, callback: (v) => v.toLocaleString() }, grid: { color: gridCol }, border: { display: false }, beginAtZero: true } } },
    });
    return () => chartRef.current?.destroy();
  }, [categories, catData, total, darkMode]);

  if (loading) return <CardShell ui={ui} darkMode={darkMode}><SectionTitle icon="💊" title="Product Category Breakdown" ui={ui} /><SkeletonBox height={isMobile ? 180 : 240} ui={ui} darkMode={darkMode} /></CardShell>;
  if (!categories.length) return <CardShell ui={ui} darkMode={darkMode}><SectionTitle icon="💊" title="Product Category Breakdown" ui={ui} /><EmptyState icon="💊" message="No category data in current records" ui={ui} /></CardShell>;

  return (
    <CardShell ui={ui} darkMode={darkMode}>
      <SectionTitle icon="💊" title="Product Category Breakdown" subtitle={`${total.toLocaleString()} total across ${categories.length} categor${categories.length === 1 ? "y" : "ies"}`} ui={ui} />
      <div style={{ position: "relative", height: isMobile ? 200 : 260, marginBottom: 12 }}><canvas ref={canvasRef} /></div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {categories.map((cat) => {
          const count = catData[cat] ?? 0;
          const pct   = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
          const color = getDynamicColor(cat);
          return (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.68rem", color: ui.textMuted, background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderRadius: 6, padding: "3px 8px" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block", flexShrink: 0 }} />
              <span style={{ color: ui.textPrimary, fontWeight: 600 }}>{cat}</span>
              <span style={{ color, fontWeight: 700 }}>{count.toLocaleString()}</span>
              <span>({pct}%)</span>
            </div>
          );
        })}
      </div>
    </CardShell>
  );
}

// ─── Trend Chart ──────────────────────────────────────────────────────────────
function TrendChartSection({ cprTrend, loading, ui, darkMode, isMobile, onPointClick }) {
  const canvasRef   = useRef(null);
  const chartRef    = useRef(null);
  const scrollRef   = useRef(null);
  const [selectedYear, setSelectedYear]  = useState(null);
  const [showReceived, setShowReceived]  = useState(true);
  const [showReleased, setShowReleased]  = useState(true);

  const availableYears = useMemo(() => {
    const years = [...new Set(cprTrend.map((d) => (d.period ?? d.month ?? d.label ?? "").slice(0, 4)).filter((y) => y && !isNaN(y)))].sort();
    return years;
  }, [cprTrend]);

  const months   = cprTrend.map((d) => d.period ?? d.month ?? d.label ?? "");
  const received = cprTrend.map((d) => d.received_count ?? d.received ?? 0);
  const released = cprTrend.map((d) => d.released_count ?? d.released ?? 0);

  const PX_PER_MONTH = isMobile ? 48 : 72;
  const chartHeight  = isMobile ? 160 : 220;
  const [containerWidth, setContainerWidth] = useState(600);

  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const chartWidth = Math.max(containerWidth, months.length * PX_PER_MONTH);

  useEffect(() => {
    chartRef.current?.destroy();
    if (!canvasRef.current || !months.length) return;
    const gridCol = darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
    const tickCol = darkMode ? "#b0b3b8" : "#65676b";
    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: months,
        datasets: [
          { label: "Received", data: received, hidden: !showReceived, borderColor: months.map((m) => !selectedYear || m.startsWith(selectedYear) ? "#3b82f6" : darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"), backgroundColor: "rgba(59,130,246,0.1)", pointBackgroundColor: months.map((m) => !selectedYear || m.startsWith(selectedYear) ? "#3b82f6" : darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"), fill: true, tension: 0.4, pointRadius: months.length > 60 ? 2 : 3, pointHoverRadius: 6, segment: { borderColor: (ctx) => { const m = months[ctx.p0DataIndex] ?? ""; return !selectedYear || m.startsWith(selectedYear) ? "#3b82f6" : darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"; } } },
          { label: "Released", data: released, hidden: !showReleased, borderColor: months.map((m) => !selectedYear || m.startsWith(selectedYear) ? "#10b981" : darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"), backgroundColor: "rgba(16,185,129,0.08)", pointBackgroundColor: months.map((m) => !selectedYear || m.startsWith(selectedYear) ? "#10b981" : darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"), fill: true, tension: 0.4, pointRadius: months.length > 60 ? 2 : 3, pointHoverRadius: 6, segment: { borderColor: (ctx) => { const m = months[ctx.p0DataIndex] ?? ""; return !selectedYear || m.startsWith(selectedYear) ? "#10b981" : darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"; } } },
        ],
      },
      options: {
        responsive: false, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        onClick: (evt, elements, chart) => { if (elements.length > 0 && onPointClick) onPointClick(chart.data.labels[elements[0].index]); },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}` } } },
        scales: { x: { ticks: { color: tickCol, font: { size: 10 }, maxRotation: 45, minRotation: 30, autoSkip: false }, grid: { display: false }, border: { display: false } }, y: { ticks: { color: tickCol, font: { size: 11 }, callback: (v) => v.toLocaleString() }, grid: { color: gridCol }, border: { display: false }, beginAtZero: true } },
      },
    });
    return () => chartRef.current?.destroy();
  }, [months.join(","), received.join(","), released.join(","), darkMode, onPointClick, chartWidth, selectedYear, showReceived, showReleased]);

  useEffect(() => {
    if (!scrollRef.current) return;
    if (selectedYear) {
      const idx = months.findIndex((m) => m.startsWith(selectedYear));
      if (idx !== -1) scrollRef.current.scrollTo({ left: Math.max(0, idx * (chartWidth / Math.max(months.length, 1)) - 40), behavior: "smooth" });
    } else {
      scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, months.length, chartWidth]);

  if (loading) return <CardShell ui={ui} darkMode={darkMode}><SectionTitle icon="📈" title="Received vs Released Trend" ui={ui} /><SkeletonBox height={chartHeight} ui={ui} darkMode={darkMode} /></CardShell>;
  if (!months.length) return <CardShell ui={ui} darkMode={darkMode}><SectionTitle icon="📈" title="Received vs Released Trend" ui={ui} /><EmptyState icon="📈" message="No trend data available yet" ui={ui} /></CardShell>;

  const scrollTrackColor = darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const scrollThumbColor = darkMode ? "rgba(255,255,255,0.2)"  : "rgba(0,0,0,0.18)";

  return (
    <CardShell ui={ui} darkMode={darkMode}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
        <div>
          <h3 style={{ margin: "0 0 2px", fontSize: "0.86rem", fontWeight: 700, color: ui.textPrimary, fontFamily: FONT, display: "flex", alignItems: "center", gap: 7 }}><span>📈</span>Received vs Released Trend</h3>
          <p style={{ margin: 0, fontSize: "0.7rem", color: ui.textMuted, fontFamily: FONT }}>{selectedYear ? `${selectedYear} · ${months.length} months · click a point to drill down` : `Monthly FRP and CRP application volume · ${months.length} months · click a point to drill down`}</p>
        </div>
        {availableYears.length > 1 && (
          <select value={selectedYear ?? ""} onChange={(e) => setSelectedYear(e.target.value || null)} style={{ padding: "5px 10px", fontSize: "0.75rem", fontFamily: FONT, fontWeight: 600, borderRadius: 8, border: `1px solid ${selectedYear ? ACCENT + "60" : darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, background: selectedYear ? `${ACCENT}15` : darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)", color: selectedYear ? ACCENT : ui.textMuted, cursor: "pointer", outline: "none", flexShrink: 0 }}>
            <option value="">All Years</option>
            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginBottom: 10 }}>
        {[
          { label: "Received", border: "#3b82f6", bg: "rgba(59,130,246,0.15)", visible: showReceived, toggle: () => setShowReceived(v => !v) },
          { label: "Released", border: "#10b981", bg: "rgba(16,185,129,0.15)", visible: showReleased, toggle: () => setShowReleased(v => !v) },
        ].map(({ label, border: bc, bg, visible, toggle }) => (
          <div key={label} onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", opacity: visible ? 1 : 0.45, transition: "opacity 0.2s ease", userSelect: "none" }}>
            <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 3, background: visible ? bg : "transparent", border: `2px solid ${visible ? bc : darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`, flexShrink: 0, transition: "all 0.2s ease" }} />
            <span style={{ fontSize: "0.75rem", color: visible ? ui.textPrimary : ui.textMuted, fontFamily: FONT, textDecoration: visible ? "none" : "line-through", transition: "all 0.2s ease" }}>{label}</span>
          </div>
        ))}
      </div>

      <div ref={scrollRef} style={{ overflowX: "auto", overflowY: "hidden", scrollbarWidth: "thin", scrollbarColor: `${scrollThumbColor} ${scrollTrackColor}`, paddingBottom: 6, width: "100%" }}>
        <style>{`.trend-scroll::-webkit-scrollbar{height:6px}.trend-scroll::-webkit-scrollbar-track{background:${scrollTrackColor};border-radius:99px}.trend-scroll::-webkit-scrollbar-thumb{background:${scrollThumbColor};border-radius:99px}`}</style>
        <div className="trend-scroll" style={{ position: "relative", height: chartHeight, width: chartWidth, minWidth: "100%" }}>
          <canvas ref={canvasRef} width={chartWidth} height={chartHeight} style={{ display: "block", cursor: "pointer" }} />
        </div>
      </div>
      {months.length > 12 && !selectedYear && <p style={{ margin: "4px 0 0", fontSize: "0.65rem", color: ui.textMuted, textAlign: "right" }}>← scroll to navigate all {months.length} months</p>}
    </CardShell>
  );
}

// ─── Compliance Section ───────────────────────────────────────────────────────
function CprTrendSection({ complianceData, cprTrend, loading, ui, darkMode }) {
  const stats = useMemo(() => {
    if (!complianceData) return { pending: 0, avgDays: null, issuedThisMonth: 0, resolved: 0 };
    return { pending: complianceData.pending_requests ?? 0, avgDays: complianceData.avg_days_awaiting ?? null, issuedThisMonth: complianceData.issued_this_month ?? 0, resolved: complianceData.resolved ?? 0 };
  }, [complianceData]);

  if (loading) return <CardShell ui={ui} darkMode={darkMode}><SectionTitle icon="📋" title="Compliance Monitoring" ui={ui} /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{[1,2,3,4].map(i => <SkeletonBox key={i} height={56} borderRadius={10} ui={ui} darkMode={darkMode} />)}</div></CardShell>;

  const subBg   = darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.025)";
  const divider = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const kpis = [
    { icon: "⏳", label: "Pending Requests",  value: stats.pending.toLocaleString(),                    color: "#f59e0b" },
    { icon: "📅", label: "Avg Days Awaiting", value: stats.avgDays != null ? `${stats.avgDays}d` : "—", color: "#3b82f6" },
    { icon: "✅", label: "Issued This Month", value: stats.issuedThisMonth.toLocaleString(),             color: "#10b981" },
    { icon: "🔒", label: "Resolved",          value: stats.resolved.toLocaleString(),                   color: "#6366f1" },
  ];

  return (
    <CardShell ui={ui} darkMode={darkMode}>
      <SectionTitle icon="📋" title="Compliance Monitoring" subtitle="FRP release compliance overview" ui={ui} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ background: subBg, border: `1px solid ${divider}`, borderRadius: 10, padding: "10px 12px" }}>
            <p style={{ margin: "0 0 3px", fontSize: "0.58rem", fontWeight: 700, color: ui.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 4 }}><span>{k.icon}</span>{k.label}</p>
            <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: k.color, lineHeight: 1.2 }}>{k.value}</p>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
function AlertsSection({ summary, alertsData, loading, ui, darkMode }) {
  const alerts = useMemo(() => {
    const critical = [], warning = [], info = [];
    (alertsData?.data ?? []).forEach((a) => {
      if (a.level === "critical") critical.push(a.message);
      else if (a.level === "warning") warning.push(a.message);
      else info.push(a.message);
    });
    if (summary?.overdue > 0) critical.push(`${summary.overdue} application${summary.overdue !== 1 ? "s" : ""} exceeding SLA`);
    return { critical, warning, info };
  }, [alertsData, summary]);

  if (loading) return <CardShell ui={ui} darkMode={darkMode}><SectionTitle icon="🚨" title="Alerts & Notifications" ui={ui} /><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{[1,2,3,4].map(i => <SkeletonBox key={i} height={44} borderRadius={8} ui={ui} />)}</div></CardShell>;
  const totalAlerts = alerts.critical.length + alerts.warning.length + alerts.info.length;
  if (!totalAlerts) return <CardShell ui={ui} darkMode={darkMode}><SectionTitle icon="🚨" title="Alerts & Notifications" ui={ui} /><EmptyState icon="✅" message="No active alerts — all systems nominal" ui={ui} /></CardShell>;

  const STYLES = {
    critical: { bg: darkMode ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.06)", border: darkMode ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.18)", color: darkMode ? "#f87171" : "#b91c1c", dot: "🔴" },
    warning:  { bg: darkMode ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.06)", border: darkMode ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.18)", color: darkMode ? "#fbbf24" : "#92400e", dot: "🟡" },
    info:     { bg: darkMode ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.05)", border: darkMode ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.15)", color: darkMode ? "#34d399" : "#065f46", dot: "🟢" },
  };
  const renderGroup = (title, items, type) => {
    if (!items.length) return null;
    const s = STYLES[type];
    return (
      <div style={{ marginBottom: 10 }}>
        <p style={{ margin: "0 0 5px", fontSize: "0.65rem", fontWeight: 700, color: ui.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</p>
        {items.map((msg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", borderRadius: 8, marginBottom: 5, background: s.bg, border: `1px solid ${s.border}` }}>
            <span style={{ fontSize: "0.75rem", flexShrink: 0, marginTop: 1 }}>{s.dot}</span>
            <span style={{ fontSize: "0.73rem", color: s.color, lineHeight: 1.5 }}>{msg}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <CardShell ui={ui} darkMode={darkMode}>
      <SectionTitle icon="🚨" title="Alerts & Notifications" ui={ui} />
      {renderGroup("Critical", alerts.critical, "critical")}
      {renderGroup("Warning", alerts.warning, "warning")}
      {renderGroup("Information", alerts.info, "info")}
    </CardShell>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────
function ActivityFeedSection({ activityData, loading, ui, darkMode }) {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const divider = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

  const allActivities = useMemo(() => {
    return (activityData?.data ?? []).map((r) => {
      const status  = r.app_status ?? "Updated";
      const docType = normalizeDocType(r.doc_type);
      const product = r.product_name ? ` · ${r.product_name}` : "";
      const color   = getDynamicColor(status);
      const icon    = ["COMPLETED", "Approved"].includes(status) ? "✅" : ["DISAPPROVED", "Rejected"].includes(status) ? "❌" : status === "For Compliance" ? "⚠️" : ["Submitted", "IN PROGRESS", "In Progress", "ON-PROCESS", "On Process"].includes(status) ? "📥" : "🔄";
      const user    = r.handled_by ?? r.user_name ?? r.user ?? r.reviewer ?? r.reviewer_name ?? r.assigned_to ?? r.processed_by ?? null;
      return { icon, color, text: `${r.app_no ?? "—"}${product} — ${status}${docType !== "Other" && docType !== "Not Yet Assigned" ? ` · ${docType}` : ""}`, time: timeAgo(r.release_date ?? r.created_at), user };
    });
  }, [activityData]);

  const totalPages  = Math.ceil(allActivities.length / PAGE_SIZE);
  const activities  = allActivities.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return (
    <CardShell ui={ui} darkMode={darkMode}>
      <SectionTitle icon="📋" title="Recent Activity Feed" ui={ui} />
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: `1px solid ${divider}` }}>
            <SkeletonBox height={28} borderRadius={999} ui={ui} darkMode={darkMode} style={{ width: 28, flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}><SkeletonBox height={11} borderRadius={4} ui={ui} darkMode={darkMode} /><SkeletonBox height={9} borderRadius={4} ui={ui} darkMode={darkMode} /></div>
          </div>
        ))}
      </div>
    </CardShell>
  );

  if (!allActivities.length) return <CardShell ui={ui} darkMode={darkMode}><SectionTitle icon="📋" title="Recent Activity Feed" ui={ui} /><EmptyState icon="📋" message="No recent activity to display" ui={ui} /></CardShell>;

  return (
    <CardShell ui={ui} darkMode={darkMode}>
      <SectionTitle icon="📋" title="Recent Activity Feed" subtitle="Latest application events" ui={ui} />
      <div>
        {activities.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: i < activities.length - 1 ? `1px solid ${divider}` : "none" }}>
            <span style={{ width: 28, height: 28, borderRadius: "50%", background: `${a.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", flexShrink: 0 }}>{a.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "0.75rem", color: ui.textPrimary, lineHeight: 1.4 }}>{a.text}</p>
              <p style={{ margin: "2px 0 0", fontSize: "0.65rem", color: ui.textMuted }}>{a.time}</p>
            </div>
            <div title={a.user ?? "Unassigned"} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
              {a.user ? (
                <>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.62rem", fontWeight: 700, color: ui.textMuted, flexShrink: 0 }}>{a.user.trim().charAt(0).toUpperCase()}</span>
                  <span style={{ fontSize: "0.68rem", color: ui.textMuted, fontWeight: 600, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.user}</span>
                </>
              ) : (
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: ui.textMuted, opacity: 0.5, flexShrink: 0 }}>👤</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: `1px solid ${divider}` }}>
          <span style={{ fontSize: "0.68rem", color: ui.textMuted }}>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, allActivities.length)} of {allActivities.length}</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${divider}`, background: "transparent", color: ui.textMuted, cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1, fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <span style={{ fontSize: "0.72rem", color: ui.textPrimary, padding: "0 6px", display: "flex", alignItems: "center" }}>{page}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${divider}`, background: "transparent", color: ui.textMuted, cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1, fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          </div>
        </div>
      )}
    </CardShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function FRPMonitoringView({ ui, darkMode }) {
  const isMobile = useIsMobile(640);

  const [summary,        setSummary]        = useState(null);
  const [statusData,     setStatusData]     = useState(null);
  const [docTypeData,    setDocTypeData]    = useState(null);
  const [categoryData,   setCategoryData]   = useState(null);
  const [complianceData, setComplianceData] = useState(null);
  const [activityData,   setActivityData]   = useState(null);
  const [alertsData,     setAlertsData]     = useState(null);
  const [cprTrend,       setCprTrend]       = useState([]);
  const [appStatusData,  setAppStatusData]  = useState(null);
  const [modalOpen,      setModalOpen]      = useState(false);
  const [modalFilter,    setModalFilter]    = useState("all");
  const [modalPeriod,    setModalPeriod]    = useState(null);

  const [loadingKpi,        setLoadingKpi]        = useState(true);
  const [loadingStatus,     setLoadingStatus]      = useState(true);
  const [loadingDocTypes,   setLoadingDocTypes]    = useState(true);
  const [loadingCategories, setLoadingCategories]  = useState(true);
  const [loadingCompliance, setLoadingCompliance]  = useState(true);
  const [loadingActivity,   setLoadingActivity]    = useState(true);
  const [loadingAlerts,     setLoadingAlerts]      = useState(true);
  const [loadingCpr,        setLoadingCpr]         = useState(true);
  const [loading,           setLoading]            = useState(true);
  const [error,             setError]              = useState(null);

  const openModal = useCallback((filterType, period = null) => {
    setModalFilter(filterType);
    setModalPeriod(period);
    setModalOpen(true);
  }, []);

  const fetchAll = useCallback(() => {
    setLoading(true);
    setError(null);

    getKpiSummary()
      .then(setSummary)
      .catch(() => setError("Failed to load KPI summary."))
      .finally(() => { setLoadingKpi(false); setLoading(false); });

    getStatusDistribution()
      .then(setStatusData)
      .catch(() => {})
      .finally(() => setLoadingStatus(false));

    getDocTypes()
      .then(setDocTypeData)
      .catch(() => {})
      .finally(() => setLoadingDocTypes(false));

    getProductCategories()
      .then(setCategoryData)
      .catch(() => {})
      .finally(() => setLoadingCategories(false));

    getCompliance()
      .then(setComplianceData)
      .catch(() => {})
      .finally(() => setLoadingCompliance(false));

    getRecentActivity(20)
      .then(setActivityData)
      .catch(() => {})
      .finally(() => setLoadingActivity(false));

    getAlerts()
      .then(setAlertsData)
      .catch(() => {})
      .finally(() => setLoadingAlerts(false));

    getCprTrend()
      .then(setCprTrend)
      .catch(() => {})
      .finally(() => setLoadingCpr(false));

    getAppStatusBreakdown()
      .then(setAppStatusData)
      .catch(() => {});
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRefresh = useCallback(() => {
    setSummary(null); setStatusData(null); setDocTypeData(null);
    setCategoryData(null); setComplianceData(null); setActivityData(null);
    setAlertsData(null); setCprTrend([]); setAppStatusData(null);
    setError(null);
    setLoading(true); setLoadingKpi(true); setLoadingStatus(true);
    setLoadingDocTypes(true); setLoadingCategories(true); setLoadingCompliance(true);
    setLoadingActivity(true); setLoadingAlerts(true); setLoadingCpr(true);
    fetchAll();
  }, [fetchAll]);

  return (
    <div style={{ fontFamily: FONT, width: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 18, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: isMobile ? "wrap" : "nowrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: ui.textPrimary, fontFamily: FONT, display: "flex", alignItems: "center", gap: 6 }}>
            🔍 FRP and CRP Monitoring
          </h2>
          <p style={{ margin: 0, fontSize: "0.74rem", color: ui.textMuted, lineHeight: 1.4 }}>Facilitated Review Pathway and Collaborative Registration Procedure Monitoring</p>
        </div>
        <button onClick={handleRefresh} disabled={loading} style={{ padding: "6px 14px", fontSize: "0.72rem", fontFamily: FONT, fontWeight: 600, borderRadius: 8, border: `1px solid ${darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`, background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)", color: ui.textPrimary, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ display: "inline-block", animation: loading ? "frpShimmer 1.2s infinite" : "none" }}>🔄</span>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 16, background: darkMode ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.05)", border: `1px solid ${darkMode ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.2)"}`, color: darkMode ? "#f87171" : "#b91c1c", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 10 }}>
          <span>⚠️</span>
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={handleRefresh} style={{ fontSize: "0.72rem", fontWeight: 600, padding: "4px 10px", borderRadius: 6, border: `1px solid ${darkMode ? "rgba(239,68,68,0.4)" : "rgba(239,68,68,0.3)"}`, background: "transparent", color: darkMode ? "#f87171" : "#b91c1c", cursor: "pointer" }}>Retry</button>
        </div>
      )}

      {/* 1 — KPI */}
      <KpiSection summary={summary} statusData={appStatusData} loading={loadingKpi} ui={ui} darkMode={darkMode} onOpenModal={openModal} />

      {/* 2 — Status + Doc Type */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <TileFadeIn ready={!loadingStatus} delay={0}><StatusDonutSection statusData={statusData} loading={loadingStatus} ui={ui} darkMode={darkMode} /></TileFadeIn>
        <TileFadeIn ready={!loadingDocTypes} delay={80}><DocTypeDonutSection docTypeData={docTypeData} loading={loadingDocTypes} ui={ui} darkMode={darkMode} /></TileFadeIn>
      </div>

      {/* 3 — Trend chart */}
      <TileFadeIn ready={!loadingCpr} delay={120}>
        <div style={{ marginBottom: 12 }}>
          <TrendChartSection cprTrend={cprTrend} loading={loadingCpr} ui={ui} darkMode={darkMode} isMobile={isMobile} onPointClick={(month) => openModal("all", month)} />
        </div>
      </TileFadeIn>

      {/* 4 — Countries + Category */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <TileFadeIn ready={true} delay={160}><TopCountriesSection loading={false} ui={ui} darkMode={darkMode} isMobile={isMobile} /></TileFadeIn>
        <TileFadeIn ready={!loadingCategories} delay={200}><ProductCategorySection categoryData={categoryData} loading={loadingCategories} ui={ui} darkMode={darkMode} isMobile={isMobile} /></TileFadeIn>
      </div>

      {/* 5 — Compliance + Alerts */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <TileFadeIn ready={!loadingCompliance && !loadingCpr} delay={240}><CprTrendSection complianceData={complianceData} cprTrend={cprTrend} loading={loadingCompliance || loadingCpr} ui={ui} darkMode={darkMode} isMobile={isMobile} /></TileFadeIn>
        <TileFadeIn ready={!loadingAlerts} delay={280}><AlertsSection summary={summary} alertsData={alertsData} loading={loadingAlerts} ui={ui} darkMode={darkMode} /></TileFadeIn>
      </div>

      {/* 6 — Activity Feed */}
      <TileFadeIn ready={!loadingActivity} delay={320}>
        <div style={{ marginBottom: 12 }}>
          <ActivityFeedSection activityData={activityData} loading={loadingActivity} ui={ui} darkMode={darkMode} />
        </div>
      </TileFadeIn>

      <ApplicationsModal
        key={`${modalFilter}__${modalPeriod ?? "none"}`}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialFilter={modalFilter}
        initialPeriod={modalPeriod}
        ui={ui}
        darkMode={darkMode}
      />
    </div>
  );
}