// src/components/softcopy/SoftcopyDoctrackConfirm.jsx
// The "check before saving" view for the FIS Doctrack update (step 4 of
// Make Transmittal). Nothing goes to FIS until the user clicks Confirm.
//   · the remark: "Softcopy Received by CDRR - OD and forwarded to <code>";
//     the code is filled in when known and can be typed (e.g. SDS has none yet)
//   · one row per DTN with a tick box; DTNs already updated in FIS start unticked
//   · Back / Confirm: update FIS
import React, { useMemo, useState } from "react";
import { DOCTRACK_REMARK_PREFIX, FORWARD_TARGETS, doctrackRemark, updateSoftcopyDoctrack } from "../../api/softcopy";
import { getUser } from "../../api/auth";
import { FONT } from "../gmp/shared/constants";

const ACCENT = "#10b981";

const fmt = (s) => (s ? new Date(s).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "");

export default function SoftcopyDoctrackConfirm({ letters, target, doctrackEnabled, onBack, onDone, colors, darkMode }) {
  const [code, setCode] = useState(FORWARD_TARGETS[target]?.code || "");
  // Already in FIS → unticked to start (no double entry unless the user wants it)
  const [ticked, setTicked] = useState(() => new Set(letters.filter((l) => !l.doctrack_at).map((l) => l.id)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const remark = doctrackRemark(target, code);
  const alias = (getUser()?.alias || "").trim();
  const picked = useMemo(() => letters.filter((l) => ticked.has(l.id)), [letters, ticked]);
  const allTicked = picked.length === letters.length;
  const ready = picked.length > 0 && code.trim() && !saving;

  const toggle = (id) => setTicked((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const confirm = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await updateSoftcopyDoctrack(picked.map((l) => l.id), remark);
      onDone(res, picked.length);
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.message ?? "FIS was not updated.");
    } finally {
      setSaving(false);
    }
  };

  const btn = (enabled, primary = false) => ({
    padding: "8px 16px", fontSize: "0.78rem", fontWeight: primary ? 700 : 600, fontFamily: FONT, borderRadius: 8,
    border: primary ? "none" : `1px solid ${colors.cardBorder}`,
    background: primary ? (enabled ? ACCENT : (darkMode ? "#2a2b2c" : "#e2e8f0")) : "transparent",
    color: primary ? (enabled ? "#fff" : colors.textTertiary) : (enabled ? colors.textSecondary : colors.textTertiary),
    cursor: enabled ? "pointer" : "not-allowed", whiteSpace: "nowrap",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <p style={{ margin: 0, fontSize: "0.86rem", fontWeight: 700, color: colors.textPrimary }}>Update FIS Doctrack: check before saving</p>
        <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: colors.textTertiary }}>
          Nothing is sent to FIS until you click Confirm.
        </p>
      </div>

      {!doctrackEnabled && (
        <p style={{
          margin: 0, padding: "7px 10px", borderRadius: 7, fontSize: "0.7rem", lineHeight: 1.45,
          background: darkMode ? "rgba(99,102,241,0.1)" : "#eef2ff", border: "1px solid #c7d2fe", color: darkMode ? "#c7d2fe" : "#4338ca",
        }}>
          🧪 Test mode: the FIS update is switched off, so FIS is not really updated. The letters are only marked as a test.
        </p>
      )}

      {/* Remark */}
      <div>
        <p style={{ margin: "0 0 4px", fontSize: "0.72rem", fontWeight: 600, color: colors.textSecondary }}>Remark</p>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", padding: "6px 10px", borderRadius: 8,
          border: `1px solid ${code.trim() ? colors.inputBorder : "#fcd34d"}`, background: colors.inputBg,
          fontSize: "0.78rem", color: colors.textPrimary,
        }}>
          <span>{DOCTRACK_REMARK_PREFIX.trim()}</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="unit code"
            disabled={saving}
            style={{
              width: 110, height: 26, padding: "0 8px", boxSizing: "border-box", fontSize: "0.78rem", fontFamily: FONT,
              fontWeight: 700, borderRadius: 6, border: `1px solid ${colors.inputBorder}`,
              background: darkMode ? "rgba(255,255,255,0.04)" : "#fff", color: colors.textPrimary,
            }}
          />
        </div>
        <p style={{ margin: "4px 0 0", fontSize: "0.68rem", color: code.trim() ? colors.textTertiary : "#b45309" }}>
          {code.trim()
            ? <>FIS will show: <em>{remark}{alias ? ` Remarks by: ${alias}` : ""}</em></>
            : `Type the code for ${target} (e.g. CDRR117).`}
        </p>
      </div>

      {/* DTNs */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: colors.textSecondary }}>DTNs</span>
          <button
            type="button"
            disabled={saving}
            onClick={() => setTicked(allTicked ? new Set() : new Set(letters.map((l) => l.id)))}
            style={{ padding: 0, border: "none", background: "transparent", color: ACCENT, fontSize: "0.72rem", fontWeight: 600, fontFamily: FONT, cursor: "pointer" }}
          >
            {allTicked ? "Untick all" : "Tick all"}
          </button>
        </div>
        <div style={{ maxHeight: 260, overflowY: "auto", borderRadius: 8, border: `1px solid ${colors.cardBorder}` }}>
          {letters.map((l) => {
            const on = ticked.has(l.id);
            return (
              <label key={l.id} style={{
                display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 10px",
                borderBottom: `1px solid ${colors.cardBorder}`, cursor: saving ? "default" : "pointer",
                opacity: on ? 1 : 0.6,
              }}>
                <input type="checkbox" checked={on} disabled={saving} onChange={() => toggle(l.id)} style={{ marginTop: 2 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ margin: 0, fontSize: "0.76rem", fontWeight: 600, color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>
                    {l.dtn}
                    <span style={{ fontWeight: 400, color: colors.textTertiary }}>
                      {l.company_name ? ` · ${l.company_name}` : ""}{l.app_type ? ` · ${l.app_type}` : ""}
                    </span>
                  </p>
                  {l.doctrack_at && (
                    <p style={{ margin: "2px 0 0", fontSize: "0.68rem", color: "#b45309" }}>
                      Already updated in FIS on {fmt(l.doctrack_at)}{l.doctrack_by ? ` by ${l.doctrack_by}` : ""}. Tick it only to add it again.
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
        <p style={{ margin: "6px 0 0", fontSize: "0.74rem", fontWeight: 600, color: colors.textSecondary }}>
          {picked.length} of {letters.length} DTN{letters.length === 1 ? "" : "s"} will be updated
        </p>
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: "0.76rem", color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: 7, border: "1px solid #fecaca" }}>
          ⚠️ {String(error)}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" onClick={onBack} disabled={saving} style={btn(!saving)}>Back</button>
        <button
          type="button"
          onClick={confirm}
          disabled={!ready}
          title={!code.trim() ? "Type the unit code first" : picked.length ? "" : "Tick at least one DTN"}
          style={btn(Boolean(ready), true)}
        >
          {saving ? "Updating FIS…" : `Confirm: update FIS (${picked.length})`}
        </button>
      </div>
    </div>
  );
}
