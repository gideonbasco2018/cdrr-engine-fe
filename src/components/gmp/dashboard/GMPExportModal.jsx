// src/components/gmp/dashboard/GMPExportModal.jsx
// "Export PDF" for FGMP Monitoring & Analytics: a checklist of the sections to
// include. The choice is remembered in this browser. The PDF is built from the
// data already on the page; only the trend and data-completeness sections need
// an extra fetch, and only when they are ticked.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getGMPAnalyticsSparklines, getGMPAnalyticsDataQuality } from "../../../api/gmpAnalytics";
import { MONTH_OPTIONS } from "./gmpAnalyticsShared";
import { EXPORT_SECTIONS, buildGMPPdf } from "./gmpExportPdf";

const ACCENT = "#0f8a72";
const RED = "#c8384f";
const STORE_KEY = "fgmp-export-sections";
const ALL_IDS = EXPORT_SECTIONS.map((s) => s.id);
const GROUPS = ["Monitoring", "Analytics"];

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (Array.isArray(saved)) return saved.filter((id) => ALL_IDS.includes(id));
  } catch { /* storage unavailable — fall through to the default */ }
  return ALL_IDS;
}

export default function GMPExportModal({ ui, data, filters, activeTab, onClose }) {
  const [selected, setSelected] = useState(loadSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const set = useMemo(() => new Set(selected), [selected]);
  const toggle = (id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const setGroup = (group, on) => {
    const ids = EXPORT_SECTIONS.filter((s) => s.group === group).map((s) => s.id);
    setSelected((cur) => (on ? [...new Set([...cur, ...ids])] : cur.filter((x) => !ids.includes(x))));
  };

  const monthLabel = MONTH_OPTIONS.find((m) => m.value === filters.month)?.label ?? filters.month;

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(selected)); } catch { /* not critical */ }
      const extra = {};
      if (set.has("trend")) {
        // One point per day, for the page's current Year / Month filter.
        const res = await getGMPAnalyticsSparklines({ year: filters.year, month: filters.month });
        extra.trend = {
          points: res.points || [],
          granularity: "Day",
          title: filters.year === "All" ? "All years" : filters.month === "All" ? filters.year : `${monthLabel} ${filters.year}`,
        };
      }
      if (set.has("completeness")) extra.quality = (await getGMPAnalyticsDataQuality()).data || [];
      await buildGMPPdf({ selected, data: { ...data, ...extra }, filters: { ...filters, monthLabel } });
      onClose();
    } catch (e) {
      console.error("FGMP PDF export failed:", e);
      setError("Couldn't create the PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const linkBtn = { background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, color: ACCENT, fontFamily: "inherit" };

  return createPortal(
    <div
      onClick={busy ? undefined : onClose}
      style={{ position: "fixed", inset: 0, zIndex: 11000, background: "rgba(8,12,10,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        role="dialog" aria-modal="true" aria-label="Export to PDF" onClick={(e) => e.stopPropagation()}
        style={{ width: "min(560px, 100%)", maxHeight: "88vh", display: "flex", flexDirection: "column", background: ui.cardBg, border: `1px solid ${ui.cardBorder}`, borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.35)", overflow: "hidden" }}
      >
        <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${ui.cardBorder}` }}>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: ui.textPrimary }}>Export to PDF</div>
          <div style={{ fontSize: "0.74rem", color: ui.textMuted, marginTop: 3 }}>
            Tick what to include. Uses the current filter: <b style={{ color: ui.textSub }}>{filters.year === "All" ? "All years" : filters.year}</b>
            {" · "}<b style={{ color: ui.textSub }}>{filters.month === "All" ? "All months" : monthLabel}</b>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
            <button type="button" style={linkBtn} onClick={() => setSelected(ALL_IDS)}>Select all</button>
            <button type="button" style={linkBtn} onClick={() => setSelected([])}>Clear</button>
            <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: ui.textMuted }}>{selected.length} of {ALL_IDS.length} selected</span>
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: "6px 22px 10px" }}>
          {GROUPS.map((group) => {
            const items = EXPORT_SECTIONS.filter((s) => s.group === group);
            const count = items.filter((s) => set.has(s.id)).length;
            const sameTab = group.toLowerCase() === activeTab;
            return (
              <div key={group} style={{ marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: ui.textMuted }}>
                    {group} tab{sameTab ? " · open now" : ""}
                  </span>
                  <span style={{ flex: 1, height: 1, background: ui.divider }} />
                  <button type="button" style={linkBtn} onClick={() => setGroup(group, count < items.length)}>
                    {count === items.length ? "Clear" : "Select all"}
                  </button>
                </div>
                {items.map((s) => (
                  <label
                    key={s.id}
                    style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 6px", borderRadius: 8, cursor: "pointer", background: set.has(s.id) ? `${ACCENT}0d` : "transparent" }}
                  >
                    <input
                      type="checkbox" checked={set.has(s.id)} onChange={() => toggle(s.id)}
                      style={{ marginTop: 2, width: 15, height: 15, accentColor: ACCENT, cursor: "pointer", flexShrink: 0 }}
                    />
                    <span>
                      <span style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: ui.textPrimary }}>{s.label}</span>
                      {s.hint && <span style={{ display: "block", fontSize: "0.7rem", color: ui.textMuted, marginTop: 1 }}>{s.hint}</span>}
                    </span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>

        <div style={{ padding: "14px 22px", borderTop: `1px solid ${ui.cardBorder}`, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, fontSize: "0.72rem", color: error ? RED : ui.textMuted }}>
            {error ?? "Live application list isn't included — it can be thousands of rows."}
          </span>
          <button
            type="button" onClick={onClose} disabled={busy}
            style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${ui.cardBorder}`, background: "transparent", color: ui.textSub, fontSize: "0.8rem", cursor: busy ? "not-allowed" : "pointer" }}
          >
            Cancel
          </button>
          <button
            type="button" onClick={run} disabled={busy || selected.length === 0}
            style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: ACCENT, color: "#fff", fontSize: "0.8rem", fontWeight: 700, cursor: busy || !selected.length ? "not-allowed" : "pointer", opacity: busy || !selected.length ? 0.55 : 1 }}
          >
            {busy ? "Creating PDF…" : "Export PDF"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
