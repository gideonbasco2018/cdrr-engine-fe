// src/components/softcopy/SoftcopyActionMenu.jsx
// The ⋮ button in the Softcopy table's Actions column (same look as the FGMP
// Queue's menu, but its own file so the FGMP one is untouched).
// Items: Edit letter · Technical / System error (correction letters) ·
// Make Transmittal (this letter) · View Drive folder / FDAC folder (File Viewer).
// An orange dot on ⋮ = a correction letter whose type isn't chosen yet.
import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { FONT } from "../gmp/shared/constants";
import { motion, MOTION_CLASS, EASE } from "./viewFrame";

const GREEN = "#10b981";

// Plain-text status of a correction letter, or null when it's not one.
export function correctionStatus(l, isCorrection) {
  if (l.correction_type === "Technical") {
    return { text: "Technical", color: "#6366f1", todo: false };
  }
  if (l.correction_type === "System error") {
    return { text: l.ticket_no ? `System error · ticket ${l.ticket_no}` : "System error · no ticket", color: l.ticket_no ? "#10b981" : "#ef4444", todo: !l.ticket_no };
  }
  if (isCorrection(l)) return { text: "Not chosen yet", color: "#f59e0b", todo: true, unset: true };
  return null;
}

export default function SoftcopyActionMenu({ letter, isCorrection, onEdit, onCorrection, onForward, onDrive, folderLink = "", colors, darkMode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, maxHeight: 400 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const corr = correctionStatus(letter, isCorrection);

  const items = [
    { id: "edit", label: "Edit letter", icon: "✏️", run: onEdit },
    ...(corr ? [{
      id: "correction", label: "Technical / System error", icon: "🛠️", run: onCorrection,
      sub: corr.text, subColor: corr.color, color: corr.unset ? "#d97706" : undefined,
    }] : []),
    { id: "div1", divider: true },
    { id: "forward", label: "Make Transmittal", icon: "📤", run: onForward, sub: "This letter only" },
    ...(letter.drive_link ? [{ id: "drive", label: "View Drive folder", icon: "📁", run: () => onDrive?.(letter.drive_link), sub: "In the File Viewer" }] : []),
    ...(!letter.drive_link && folderLink ? [{ id: "folder", label: "View FDAC folder", icon: "📁", run: () => onDrive?.(folderLink), sub: "This upload's Drive folder" }] : []),
  ];

  // Same placement rules as the FGMP menu: below the button, flip up only if
  // there's more room above, always kept inside the window.
  const calcPos = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const h = menuRef.current?.offsetHeight ?? 180;
    const w = menuRef.current?.offsetWidth ?? 230;
    const PAD = 8;
    const below = window.innerHeight - r.bottom - PAD;
    const above = r.top - PAD;
    const up = below < h && above > below;
    const room = Math.max(120, up ? above : below);
    const top = up ? Math.max(PAD, r.top - Math.min(h, room) - 4) : Math.min(r.bottom + 4, window.innerHeight - PAD - Math.min(h, room));
    const left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8));
    setPos({ top, left, maxHeight: room });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const raf = requestAnimationFrame(calcPos);
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("scroll", calcPos, true);
    window.addEventListener("resize", calcPos);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", calcPos, true);
      window.removeEventListener("resize", calcPos);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, calcPos]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={corr?.unset ? "Actions · correction type not chosen yet" : "Actions"}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          position: "relative", width: 30, height: 30, borderRadius: 7, cursor: "pointer",
          border: `1px solid ${open ? GREEN : `${GREEN}40`}`, background: open ? GREEN : `${GREEN}15`,
          color: open ? "#fff" : GREEN, display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.1rem", fontWeight: 700, transition: `background-color 0.2s ${EASE}, color 0.2s ${EASE}, border-color 0.2s ${EASE}, box-shadow 0.2s ${EASE}`,
        }}
      >
        ⋮
        {corr?.unset && !open && (
          <span style={{
            position: "absolute", top: -3, right: -3, width: 9, height: 9, borderRadius: 999,
            background: "#f59e0b", border: `2px solid ${colors.tableBg || "#fff"}`,
          }} />
        )}
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className={MOTION_CLASS}
          style={{
            position: "fixed", top: pos.top, left: pos.left, zIndex: 99999, fontFamily: FONT, animation: motion.drop,
            background: darkMode ? "#1e2022" : "#fff",
            border: `1px solid ${darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"}`,
            borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            minWidth: 230, padding: "6px 0", maxHeight: pos.maxHeight, overflowY: "auto",
          }}
        >
          {items.map((it) => it.divider ? (
            <div key={it.id} style={{ height: 1, margin: "4px 0", background: darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }} />
          ) : (
            <button
              key={it.id}
              role="menuitem"
              type="button"
              onClick={() => { setOpen(false); it.run?.(); }}
              onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.06)" : "#f1f5f9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 16px",
                border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: FONT,
              }}
            >
              <span style={{ width: 22, textAlign: "center", fontSize: "0.9rem", flexShrink: 0 }}>{it.icon}</span>
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{ fontSize: "0.82rem", fontWeight: it.color ? 600 : 400, color: it.color ?? (darkMode ? "#e2e8f0" : "#1e293b") }}>
                  {it.label}
                </span>
                {it.sub && (
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, color: it.subColor ?? colors.textTertiary }}>{it.sub}</span>
                )}
              </span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
