// src/components/softcopy/SoftcopyCorrectionModal.jsx
// Step 1.5 — any letter (opened by double-clicking its row; no app type or
// unit limit). The user picks:
//   Technical    → only marked (the page doesn't send email)
//   System error → ticket it with ICTMD (open the site, save the ticket no.)
import React, { useState } from "react";
import {
  CORRECTION_TYPES, ICTMD_TICKET_URL, setSoftcopyCorrectionType, saveSoftcopyTicket,
} from "../../api/softcopy";
import { FONT } from "../gmp/shared/constants";
import { useConfirm } from "./SoftcopyConfirm";
import { frameOuter, frameCard, stop } from "./viewFrame";

const ACCENT = "#10b981";
const TYPE_INFO = {
  Technical: { icon: "🛠️", color: "#6366f1", hint: "Mark it as a technical correction" },
  "System error": { icon: "🐞", color: "#ef4444", hint: "Ticket it with ICTMD" },
};

const fmtDateTime = (s) => (s ? new Date(s).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "");

export default function SoftcopyCorrectionModal({ letter: initial, onClose, onSaved, colors, darkMode }) {
  const [letter, setLetter] = useState(initial);
  const [confirm, confirmBox] = useConfirm(colors, darkMode);
  const [ticketNo, setTicketNo] = useState(initial.ticket_no || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn) => {
    setSaving(true);
    setError("");
    try {
      const updated = await fn();
      setLetter(updated);
      onSaved?.();
      return updated;
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Could not save.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const pickType = async (type) => {
    if (type === letter.correction_type) return;
    if (letter.ticket_no && !(await confirm({
      title: `Change it to "${type}"?`,
      message: `This letter is already ticketed (${letter.ticket_no}). Changing the type clears the ticket number.`,
      confirmLabel: `Change to ${type}`,
      danger: true,
    }))) return;
    run(() => setSoftcopyCorrectionType(letter.id, type)).then((u) => { if (u) setTicketNo(u.ticket_no || ""); });
  };

  const openIctmd = () => window.open(ICTMD_TICKET_URL, "_blank", "noopener,noreferrer");

  const muted = darkMode ? "rgba(255,255,255,0.03)" : "#f8fafc";
  const panel = { padding: "12px 14px", borderRadius: 10, border: `1px solid ${colors.cardBorder}`, background: muted };
  const btn = (enabled, bg = ACCENT) => ({
    padding: "8px 16px", fontSize: "0.78rem", fontWeight: 700, fontFamily: FONT, borderRadius: 8, border: "none",
    background: enabled ? bg : (darkMode ? "#2a2b2c" : "#e2e8f0"),
    color: enabled ? "#fff" : colors.textTertiary, cursor: enabled ? "pointer" : "not-allowed",
  });
  const outlineBtn = {
    padding: "8px 16px", fontSize: "0.78rem", fontWeight: 600, fontFamily: FONT, borderRadius: 8,
    border: `1px solid ${colors.cardBorder}`, background: "transparent", color: colors.textSecondary, cursor: "pointer",
  };
  const doneBox = { padding: "8px 12px", borderRadius: 8, background: "#dcfce7", border: "1px solid #86efac", color: "#15803d", fontSize: "0.76rem", fontWeight: 600 };

  return (
    <div {...frameOuter(false, saving ? undefined : onClose)}>
      <div
        onClick={stop}
        style={frameCard(false, {
          background: darkMode ? "#18191a" : "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh",
          display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        }, colors)}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${colors.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: colors.textPrimary }}>{letter.app_type || "Letter"}</h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.73rem", color: colors.textTertiary }}>Is this a technical or a system error?</p>
          </div>
          <button onClick={onClose} disabled={saving} style={{
            width: 32, height: 32, borderRadius: 9, border: `1px solid ${colors.cardBorder}`,
            background: "transparent", color: colors.textTertiary, cursor: "pointer",
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          {/* The letter */}
          <div style={{ ...panel, fontSize: "0.76rem", color: colors.textSecondary, lineHeight: 1.55 }}>
            <div style={{ fontFamily: "ui-monospace, Consolas, monospace", fontWeight: 700, color: colors.textPrimary }}>DTN {letter.dtn}</div>
            <div>{letter.company_name || "—"}</div>
            <div style={{ color: colors.textPrimary, marginTop: 4 }}>{letter.subject || "—"}</div>
          </div>

          {/* Pick the type */}
          <div style={{ display: "flex", gap: 10 }}>
            {CORRECTION_TYPES.map((t) => {
              const info = TYPE_INFO[t];
              const active = letter.correction_type === t;
              return (
                <button key={t} onClick={() => pickType(t)} disabled={saving} style={{
                  flex: 1, textAlign: "left", padding: "14px", borderRadius: 12, fontFamily: FONT,
                  cursor: saving ? "not-allowed" : "pointer",
                  border: `2px solid ${active ? info.color : colors.cardBorder}`,
                  background: active ? `${info.color}14` : colors.cardBg,
                }}>
                  <div style={{ fontSize: "1.4rem" }}>{info.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: "0.86rem", color: active ? info.color : colors.textPrimary, marginTop: 4 }}>{t}</div>
                  <div style={{ fontSize: "0.7rem", color: colors.textTertiary, marginTop: 2 }}>{info.hint}</div>
                </button>
              );
            })}
          </div>

          {/* Technical → just the mark */}
          {letter.correction_type === "Technical" && (
            <div style={doneBox}>
              ✅ Marked Technical{letter.correction_set_at ? ` · ${fmtDateTime(letter.correction_set_at)}` : ""}
              {letter.correction_set_by ? ` · by ${letter.correction_set_by}` : ""}
            </div>
          )}

          {/* System error → ICTMD ticket */}
          {letter.correction_type === "System error" && (
            <div style={{ ...panel, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: colors.textPrimary }}>🎫 Ticket with ICTMD</div>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: "0.74rem", color: colors.textSecondary, lineHeight: 1.6 }}>
                <li>Open the ICTMD site and file a ticket for this letter.</li>
                <li>Type the ticket number below and click <strong>Save ticket</strong>.</li>
              </ol>
              {letter.ticket_no && (
                <div style={doneBox}>✅ Ticket {letter.ticket_no} · {fmtDateTime(letter.ticketed_at)} · by {letter.ticketed_by}</div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={openIctmd} style={outlineBtn}>🌐 Open ICTMD site</button>
                <input
                  value={ticketNo}
                  onChange={(e) => setTicketNo(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && ticketNo.trim()) run(() => saveSoftcopyTicket(letter.id, ticketNo)); }}
                  placeholder="Ticket number"
                  style={{
                    flex: "1 1 140px", padding: "8px 10px", fontSize: "0.78rem", fontFamily: FONT, borderRadius: 8,
                    border: `1px solid ${colors.inputBorder}`, background: colors.inputBg, color: colors.textPrimary, outline: "none",
                  }}
                />
                <button
                  onClick={() => run(() => saveSoftcopyTicket(letter.id, ticketNo))}
                  disabled={saving || !ticketNo.trim()}
                  style={btn(!saving && !!ticketNo.trim())}
                >
                  Save ticket
                </button>
              </div>
            </div>
          )}

          {error && (
            <p style={{ margin: 0, fontSize: "0.76rem", color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: 7, border: "1px solid #fecaca" }}>
              ⚠️ {String(error)}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${colors.cardBorder}`, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={saving} style={outlineBtn}>Close</button>
        </div>
        {confirmBox}
      </div>
    </div>
  );
}
