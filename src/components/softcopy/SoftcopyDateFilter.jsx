// src/components/softcopy/SoftcopyDateFilter.jsx
// Date filter for the Softcopy page: one button that shows the chosen range
// ("Any date", "Aug 1 – 5, 2026") and opens a small popup with:
//   • which date to check (FDAC / CDRR / Forwarded / Upload)
//   • quick picks (Today, This week, Last 7 days, This month, …)
//   • a custom From / To range
// Changes apply right away. The popup is drawn on document.body so the
// sliding filter panel (overflow: hidden) can't cut it off.
import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { FONT } from "../gmp/shared/constants";
import { motion, MOTION_CLASS, EASE } from "./viewFrame";

const ACCENT = "#10b981";

export const DATE_FIELDS = [
  { value: "date_received", label: "Received by FDAC", short: "FDAC" },
  { value: "date_received_cdrr", label: "Received by CDRR", short: "CDRR" },
  { value: "forwarded", label: "Date Forwarded", short: "Forwarded" },
  { value: "uploaded_at", label: "Upload Date", short: "Uploaded" },
];

// Local date → "YYYY-MM-DD"
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

function presets() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const monday = addDays(t, -((t.getDay() + 6) % 7));
  const firstOfMonth = new Date(t.getFullYear(), t.getMonth(), 1);
  const lastMonthStart = new Date(t.getFullYear(), t.getMonth() - 1, 1);
  const lastMonthEnd = new Date(t.getFullYear(), t.getMonth(), 0);
  return [
    { key: "today", label: "Today", from: iso(t), to: iso(t) },
    { key: "yesterday", label: "Yesterday", from: iso(addDays(t, -1)), to: iso(addDays(t, -1)) },
    { key: "week", label: "This week", from: iso(monday), to: iso(t) },
    { key: "last7", label: "Last 7 days", from: iso(addDays(t, -6)), to: iso(t) },
    { key: "month", label: "This month", from: iso(firstOfMonth), to: iso(t) },
    { key: "lastmonth", label: "Last month", from: iso(lastMonthStart), to: iso(lastMonthEnd) },
    { key: "last30", label: "Last 30 days", from: iso(addDays(t, -29)), to: iso(t) },
    { key: "year", label: "This year", from: `${t.getFullYear()}-01-01`, to: iso(t) },
  ];
}

const nice = (s, withYear = true) => {
  const d = new Date(`${s}T00:00:00`);
  if (isNaN(d)) return s;
  return d.toLocaleDateString("en-US", withYear ? { month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" });
};

export function rangeLabel(from, to) {
  if (!from && !to) return "Any date";
  if (from && to) {
    if (from === to) return nice(from);
    const sameYear = from.slice(0, 4) === to.slice(0, 4);
    return `${nice(from, !sameYear)} – ${nice(to)}`;
  }
  return from ? `From ${nice(from)}` : `Until ${nice(to)}`;
}

export default function SoftcopyDateFilter({ field, from, to, onChange, colors, darkMode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const on = Boolean(from || to);
  const fieldInfo = DATE_FIELDS.find((f) => f.value === field) || DATE_FIELDS[0];
  const list = presets();
  const activePreset = list.find((p) => p.from === from && p.to === to)?.key;
  const set = (changes) => onChange({ field, from, to, ...changes });

  // Place the popup under the button, kept inside the window.
  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = 320;
    const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8));
    setPos({ top: r.bottom + 6, left, width });
  };
  useLayoutEffect(() => { if (open) place(); }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (popRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onMove = () => place();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open]);

  const sectionLabel = {
    margin: "0 0 6px", fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.05em",
    textTransform: "uppercase", color: colors.textTertiary,
  };
  const pill = (active) => ({
    padding: "6px 10px", fontSize: "0.74rem", fontWeight: active ? 700 : 500, fontFamily: FONT,
    borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap",
    border: `1px solid ${active ? ACCENT : colors.cardBorder}`,
    background: active ? `${ACCENT}1a` : "transparent",
    color: active ? ACCENT : colors.textSecondary,
  });
  const dateInput = {
    width: "100%", boxSizing: "border-box", padding: "7px 8px", fontSize: "0.78rem", fontFamily: FONT,
    borderRadius: 8, border: `1px solid ${colors.inputBorder}`, background: colors.inputBg,
    color: colors.textPrimary, outline: "none", colorScheme: darkMode ? "dark" : "light",
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={`Filter by date · ${fieldInfo.label}`}
        style={{
          display: "flex", alignItems: "center", gap: 6, height: 36, boxSizing: "border-box", padding: "0 10px",
          borderRadius: 8, cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap",
          border: `1px solid ${on || open ? colors.textTertiary : colors.inputBorder}`,
          background: colors.inputBg, color: colors.textPrimary, fontSize: "0.8rem",
          transition: `border-color 0.2s ${EASE}, background-color 0.2s ${EASE}, color 0.2s ${EASE}`,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={on ? colors.textPrimary : colors.textTertiary}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
        <span>Date Filter</span>
        {on && <span style={{ fontWeight: 600 }}>· {rangeLabel(from, to)}</span>}
        {on ? (
          <span
            role="button"
            title="Clear dates"
            onClick={(e) => { e.stopPropagation(); set({ from: "", to: "" }); }}
            style={{ marginLeft: 2, fontSize: "0.72rem", color: colors.textTertiary }}
          >✕</span>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth="2.5" aria-hidden
            style={{ marginLeft: 2, transform: open ? "rotate(180deg)" : "none", transition: `transform 0.25s ${EASE}` }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </button>

      {open && pos && createPortal(
        <div
          ref={popRef}
          className={MOTION_CLASS}
          style={{
            position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 10001, fontFamily: FONT, animation: motion.drop,
            background: darkMode ? "#1f2021" : "#fff", borderRadius: 12, border: `1px solid ${colors.cardBorder}`,
            boxShadow: "0 16px 40px rgba(0,0,0,0.22)", padding: 14, display: "flex", flexDirection: "column", gap: 14,
          }}
        >
          <div>
            <p style={sectionLabel}>Date to check</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {DATE_FIELDS.map((f) => (
                <button key={f.value} onClick={() => set({ field: f.value })} style={{ ...pill(field === f.value), borderRadius: 8 }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={sectionLabel}>Quick pick</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {list.map((p) => (
                <button key={p.key} onClick={() => set({ from: p.from, to: p.to })} style={pill(activePreset === p.key)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={sectionLabel}>Custom range</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="date" value={from} max={to || undefined} onChange={(e) => set({ from: e.target.value })} title="From" style={dateInput} />
              <span style={{ fontSize: "0.74rem", color: colors.textTertiary }}>to</span>
              <input type="date" value={to} min={from || undefined} onChange={(e) => set({ to: e.target.value })} title="To" style={dateInput} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: `1px solid ${colors.cardBorder}` }}>
            <button
              onClick={() => set({ from: "", to: "" })}
              disabled={!on}
              style={{
                padding: 0, border: "none", background: "transparent", fontSize: "0.76rem", fontWeight: 600, fontFamily: FONT,
                color: on ? "#ef4444" : colors.textTertiary, cursor: on ? "pointer" : "default",
              }}
            >Clear dates</button>
            <button
              onClick={() => setOpen(false)}
              style={{
                padding: "7px 16px", border: "none", borderRadius: 8, background: ACCENT, color: "#fff",
                fontSize: "0.76rem", fontWeight: 700, fontFamily: FONT, cursor: "pointer",
              }}
            >Done</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
