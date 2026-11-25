// src/components/softcopy/SoftcopyConfirm.jsx
// In-page "Are you sure?" box for the Softcopy page, instead of the
// browser's own grey pop-up (window.confirm).
//
//   const [confirm, confirmBox] = useConfirm(colors, darkMode);
//   if (!(await confirm({ title, message, confirmLabel, danger: true }))) return;
//   …and render {confirmBox} once.
//
// Enter = yes, Escape or a click outside = no.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FONT } from "../gmp/shared/constants";
import { motion, MOTION_CLASS } from "./viewFrame";

const ACCENT = "#10b981";
const DANGER = "#ef4444";

function ConfirmBox({ opts, onAnswer, colors, darkMode }) {
  const yesRef = useRef(null);
  useEffect(() => {
    yesRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onAnswer(false); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onAnswer]);

  const color = opts.danger ? DANGER : ACCENT;
  return (
    <div
      onClick={() => onAnswer(false)}
      className={MOTION_CLASS}
      style={{
        position: "fixed", inset: 0, zIndex: 10050, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)", fontFamily: FONT,
        animation: motion.fade,
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="softcopy-confirm-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 420, borderRadius: 14, overflow: "hidden",
          background: darkMode ? "#18191a" : "#fff", border: `1px solid ${colors.cardBorder}`,
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)", animation: motion.pop,
        }}
      >
        <div style={{ padding: "20px 22px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
          <span aria-hidden style={{
            flex: "0 0 auto", width: 38, height: 38, borderRadius: 999, display: "inline-flex", alignItems: "center",
            justifyContent: "center", fontSize: "1.1rem", background: `${color}18`, color,
          }}>{opts.icon || (opts.danger ? "⚠️" : "❔")}</span>
          <div style={{ minWidth: 0 }}>
            <h3 id="softcopy-confirm-title" style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: colors.textPrimary }}>
              {opts.title}
            </h3>
            {opts.message && (
              <div style={{ marginTop: 6, fontSize: "0.78rem", lineHeight: 1.55, color: colors.textSecondary, whiteSpace: "pre-line" }}>
                {opts.message}
              </div>
            )}
            {opts.note && (
              <div style={{ marginTop: 8, fontSize: "0.72rem", color: colors.textTertiary }}>{opts.note}</div>
            )}
          </div>
        </div>
        <div style={{
          padding: "12px 22px", display: "flex", justifyContent: "flex-end", gap: 8,
          borderTop: `1px solid ${colors.cardBorder}`, background: darkMode ? "rgba(255,255,255,0.03)" : "#f8fafc",
        }}>
          <button
            type="button"
            onClick={() => onAnswer(false)}
            style={{
              padding: "8px 16px", fontSize: "0.78rem", fontWeight: 600, fontFamily: FONT, borderRadius: 8, cursor: "pointer",
              border: `1px solid ${colors.cardBorder}`, background: "transparent", color: colors.textSecondary,
            }}
          >{opts.cancelLabel || "Cancel"}</button>
          <button
            ref={yesRef}
            type="button"
            onClick={() => onAnswer(true)}
            style={{
              padding: "8px 16px", fontSize: "0.78rem", fontWeight: 700, fontFamily: FONT, borderRadius: 8, cursor: "pointer",
              border: "none", background: color, color: "#fff", boxShadow: `0 2px 8px ${color}44`,
            }}
          >{opts.confirmLabel || "OK"}</button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm(colors, darkMode) {
  const [pending, setPending] = useState(null); // { opts, resolve }
  const confirm = useCallback((opts) => new Promise((resolve) => setPending({ opts, resolve })), []);
  const onAnswer = useCallback((yes) => {
    setPending((p) => { p?.resolve(yes); return null; });
  }, []);
  const box = pending ? <ConfirmBox opts={pending.opts} onAnswer={onAnswer} colors={colors} darkMode={darkMode} /> : null;
  return [confirm, box];
}
