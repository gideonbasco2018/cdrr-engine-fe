// src/components/softcopy/SoftcopyUnitFilter.jsx
// Unit filter for the Softcopy page: a quiet button + a minimal dropdown list
// (name, count, ✓ on the chosen one). No colors, only greys. Drawn on document.body so the sliding
// filter panel (overflow: hidden) can't cut it off. Arrow keys / Enter / Esc work.
import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { FONT } from "../gmp/shared/constants";
import { motion, MOTION_CLASS, EASE } from "./viewFrame";

export default function SoftcopyUnitFilter({ value, onChange, units, counts, unitColors = {}, notSorted, colors, darkMode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [hi, setHi] = useState(0);   // highlighted option (keyboard / hover)
  const btnRef = useRef(null);
  const popRef = useRef(null);

  const options = [
    { value: "all", label: "All units", color: null },
    ...units.map((u) => ({ value: u, label: u, color: unitColors[u] || null })),
    { value: notSorted, label: "Not sorted", color: "#ef4444", divider: true },
  ];
  const current = options.find((o) => o.value === value) || options[0];
  const on = value !== "all";
  const hover = darkMode ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)";
  const selectedBg = darkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.max(150, r.width);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    setPos({ top: r.bottom + 4, left, width });
  };
  useLayoutEffect(() => {
    if (!open) return;
    place();
    setHi(Math.max(0, options.findIndex((o) => o.value === value)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pick = (v) => { onChange(v); setOpen(false); btnRef.current?.focus(); };

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (popRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => (h + 1) % options.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => (h - 1 + options.length) % options.length); }
      else if (e.key === "Enter") { e.preventDefault(); pick(options[hi].value); }
    };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hi]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Filter by unit"
        style={{
          display: "flex", alignItems: "center", gap: 6, height: 36, boxSizing: "border-box", padding: "0 10px",
          borderRadius: 8, cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap",
          border: `1px solid ${open || on ? colors.textTertiary : colors.inputBorder}`,
          background: colors.inputBg, color: colors.textPrimary, fontSize: "0.8rem",
          transition: `border-color 0.2s ${EASE}, background-color 0.2s ${EASE}, color 0.2s ${EASE}`,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={on ? colors.textPrimary : colors.textTertiary}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        <span>Unit</span>
        {on && <span style={{ fontWeight: 600 }}>· {current.label}</span>}
        {on ? (
          <span
            role="button"
            title="Show all units"
            onClick={(e) => { e.stopPropagation(); onChange("all"); }}
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
          role="listbox"
          className={MOTION_CLASS}
          style={{
            position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 10001, fontFamily: FONT, animation: motion.drop,
            background: darkMode ? "#1f2021" : "#fff", borderRadius: 10, border: `1px solid ${colors.cardBorder}`,
            boxShadow: darkMode ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(15,23,42,0.08)", padding: 4,
          }}
        >
          {options.map((o, i) => {
            const n = counts[o.value] ?? 0;
            const active = o.value === value;
            return (
              <React.Fragment key={o.value}>
                {o.divider && <div style={{ height: 1, background: colors.cardBorder, margin: "4px 8px" }} />}
                <div
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => pick(o.value)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, cursor: "pointer",
                    background: active ? selectedBg : hi === i ? hover : "transparent",
                  }}
                >
                  <span style={{
                    flex: 1, fontSize: "0.8rem", fontWeight: active ? 600 : 400,
                    color: n === 0 && !active ? colors.textTertiary : colors.textPrimary,
                  }}>{o.label}</span>
                  <span style={{ fontSize: "0.74rem", color: colors.textTertiary, fontVariantNumeric: "tabular-nums" }}>{n}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.textPrimary} strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ opacity: active ? 0.8 : 0 }}>
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                </div>
              </React.Fragment>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
