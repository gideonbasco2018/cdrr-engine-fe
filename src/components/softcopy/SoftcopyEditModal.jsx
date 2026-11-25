// src/components/softcopy/SoftcopyEditModal.jsx
// Edit one letter: its units (more than one allowed), sections, and the
// extra columns CDRR-OD keeps in its own database (APP DTN, Date Received
// by CDRR, Receiving Officer, Remarks, Correction Detail).
import React, { useState, useMemo } from "react";
import { UNITS, sectionsFor, updateSoftcopyLetter } from "../../api/softcopy";
import { FONT } from "../gmp/shared/constants";
import { frameOuter, frameCard, stop } from "./viewFrame";

const ACCENT = "#10b981";

export default function SoftcopyEditModal({ letter, unitColors = {}, onClose, onSaved, colors, darkMode }) {
  const [units, setUnits] = useState(letter.units || []);
  const [sections, setSections] = useState(letter.sections || []);
  const [form, setForm] = useState({
    app_dtn: letter.app_dtn || "",
    date_received_cdrr: letter.date_received_cdrr || "",
    receiving_officer: letter.receiving_officer || "",
    remarks: letter.remarks || "",
    correction_detail: letter.correction_detail || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sectionOptions = useMemo(() => sectionsFor(units), [units]);

  const toggleUnit = (u) => {
    const next = units.includes(u) ? units.filter((x) => x !== u) : [...units, u];
    setUnits(UNITS.filter((x) => next.includes(x)));
    // Drop sections that no longer fit
    const allowed = new Set(sectionsFor(next));
    setSections((prev) => prev.filter((s) => allowed.has(s)));
  };
  const toggleSection = (s) =>
    setSections((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await updateSoftcopyLetter(letter.id, { units, sections, ...form });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const input = {
    width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: "0.8rem", fontFamily: FONT, borderRadius: 8,
    border: `1px solid ${colors.inputBorder}`, background: colors.inputBg, color: colors.textPrimary, outline: "none",
  };
  const label = { display: "block", margin: "0 0 4px", fontSize: "0.72rem", fontWeight: 700, color: colors.textSecondary };
  const chip = (on, color) => ({
    padding: "6px 12px", fontSize: "0.76rem", fontWeight: 600, fontFamily: FONT, borderRadius: 999, cursor: "pointer",
    border: `1px solid ${on ? color : colors.cardBorder}`,
    background: on ? `${color}18` : "transparent",
    color: on ? color : colors.textSecondary,
  });
  const btn = (enabled, primary = false) => ({
    padding: "8px 16px", fontSize: "0.78rem", fontWeight: primary ? 700 : 600, fontFamily: FONT, borderRadius: 8,
    border: primary ? "none" : `1px solid ${colors.cardBorder}`,
    background: primary ? (enabled ? ACCENT : (darkMode ? "#2a2b2c" : "#e2e8f0")) : "transparent",
    color: primary ? (enabled ? "#fff" : colors.textTertiary) : (enabled ? colors.textSecondary : colors.textTertiary),
    cursor: enabled ? "pointer" : "not-allowed",
  });

  return (
    <div {...frameOuter(false, saving ? undefined : onClose)}>
      <div
        onClick={stop}
        style={frameCard(false, {
          background: darkMode ? "#18191a" : "#fff", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "90vh",
          display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        }, colors)}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${colors.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: colors.textPrimary }}>✏️ Edit letter · DTN {letter.dtn}</h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.73rem", color: colors.textTertiary }}>
              {letter.company_name || "—"} · {letter.app_type || "—"}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "0.74rem", color: colors.textSecondary, lineHeight: 1.4 }}>{letter.subject}</p>
          </div>
          <button onClick={onClose} disabled={saving} style={{
            width: 32, height: 32, flexShrink: 0, borderRadius: 9, border: `1px solid ${colors.cardBorder}`,
            background: "transparent", color: colors.textTertiary, cursor: "pointer",
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          <div>
            <span style={label}>Unit <span style={{ fontWeight: 400, color: colors.textTertiary }}>· pick one or more</span></span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {UNITS.map((u) => (
                <button key={u} type="button" onClick={() => toggleUnit(u)} style={chip(units.includes(u), unitColors[u] || ACCENT)}>
                  {units.includes(u) ? "✓ " : ""}{u}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span style={label}>Section</span>
            {sectionOptions.length ? (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {sectionOptions.map((s) => (
                  <button key={s} type="button" onClick={() => toggleSection(s)} style={chip(sections.includes(s), "#6366f1")}>
                    {sections.includes(s) ? "✓ " : ""}{s}
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "0.74rem", color: colors.textTertiary }}>
                {units.length ? "No sections for this unit." : "Pick a unit first."}
              </p>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <label>
              <span style={label}>APP DTN / Reg No.</span>
              <input value={form.app_dtn} onChange={setField("app_dtn")} placeholder="e.g. 20201029133948 or DRP-7848" style={input} />
            </label>
            <label>
              <span style={label}>Date Received by CDRR</span>
              <input type="date" value={form.date_received_cdrr} onChange={setField("date_received_cdrr")} style={input} />
            </label>
            <label>
              <span style={label}>Receiving Officer</span>
              <input value={form.receiving_officer} onChange={setField("receiving_officer")} placeholder="Who received it" style={input} />
            </label>
            <label>
              <span style={label}>Correction Detail</span>
              <input value={form.correction_detail} onChange={setField("correction_detail")} placeholder="e.g. incorrect validity" style={input} />
            </label>
          </div>

          <label>
            <span style={label}>Remarks</span>
            <textarea value={form.remarks} onChange={setField("remarks")} rows={3} placeholder="e.g. Emailed to …" style={{ ...input, resize: "vertical" }} />
          </label>

          {error && (
            <p style={{ margin: 0, fontSize: "0.76rem", color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: 7, border: "1px solid #fecaca" }}>
              ⚠️ {String(error)}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${colors.cardBorder}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} disabled={saving} style={btn(!saving)}>Cancel</button>
          <button onClick={save} disabled={saving} style={btn(!saving, true)}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
