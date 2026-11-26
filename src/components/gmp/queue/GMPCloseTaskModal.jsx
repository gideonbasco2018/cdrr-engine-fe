// src/components/gmp/queue/GMPCloseTaskModal.jsx
// FGMP "Close Task (Final)" — the red popup opened from the Queue. FGMP's
// version of CPR's BulkCompleteModal (no VerifiPortal; "Type Doc Released" is
// "Type of Issuance Released"). Permanently closes every reference number under
// each selected DTN. All-or-nothing: if anything is refused, nothing is closed.
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { closeGMPTasksBulk } from "../../../api/gmpClosedTasks";
import {
  FONT,
  GMP_TYPE_OF_ISSUANCE_APPROVED_OPTIONS,
  GMP_DISAPPROVED_TYPE_OF_ISSUANCE,
} from "../shared/constants";

const RED = "#dc2626";
const REASONS = [
  "Task fulfilled",
  "Document verified and approved",
  "Released to applicant",
  "Other",
];
const ISSUANCE_OPTIONS = [...GMP_TYPE_OF_ISSUANCE_APPROVED_OPTIONS, GMP_DISAPPROVED_TYPE_OF_ISSUANCE];

export default function GMPCloseTaskModal({ records, onClose, onDone, colors }) {
  const [reason, setReason] = useState("");
  const [dateReleased, setDateReleased] = useState("");
  const [issuanceReleased, setIssuanceReleased] = useState("");
  const [remarks, setRemarks] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(null);     // success payload from the server
  const [failure, setFailure] = useState(null); // { message, errors }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape" || running) return;
      if (done) onDone(); else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [running, done, onClose, onDone]);

  const canConfirm = !!reason && confirmed && !running;

  const confirm = async () => {
    if (!canConfirm) return;
    setRunning(true);
    setFailure(null);
    try {
      const res = await closeGMPTasksBulk({
        record_ids: records.map((r) => r.id),
        reason_for_closing: reason,
        remarks: remarks.trim() || null,
        date_released: dateReleased || null,
        type_of_issuance_released: issuanceReleased || null,
      });
      setDone(res);
    } catch (e) {
      setFailure({ message: e.message, errors: e.errors });
    } finally {
      setRunning(false);
    }
  };

  const input = {
    width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, fontFamily: FONT,
    fontSize: "0.8rem", background: colors.inputBg, color: colors.textPrimary,
    border: `1px solid ${colors.inputBorder ?? colors.cardBorder}`, outline: "none",
  };
  const label = { display: "block", fontSize: "0.7rem", fontWeight: 700, color: colors.textSecondary ?? colors.textTertiary, marginBottom: 5 };
  const hint = { fontSize: "0.66rem", color: colors.textTertiary, marginTop: 4 };

  return createPortal(
    <div
      onClick={() => { if (!running) (done ? onDone() : onClose()); }}
      style={{ position: "fixed", inset: 0, zIndex: 10002, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        role="dialog" aria-modal="true" aria-label="Close Task (Final)"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 92vw)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden",
          background: colors.cardBg, border: `2px solid ${RED}`, borderRadius: 16, fontFamily: FONT,
          boxShadow: "0 24px 80px rgba(220,38,38,0.25), 0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "1.1rem 1.5rem", background: "linear-gradient(135deg,#dc2626,#b91c1c)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: "1.5rem" }}>🔒</span>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#fff" }}>Close Task (Final)</h3>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "rgba(255,255,255,0.8)" }}>
              {records.length} record{records.length === 1 ? "" : "s"} selected — this cannot be undone
            </p>
          </div>
          {!running && !done && (
            <button type="button" onClick={onClose} aria-label="Close"
              style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer" }}>
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", flex: 1 }}>
          {done ? (
            <div>
              <div style={{ textAlign: "center", fontSize: "2.4rem" }}>🎉</div>
              <p style={{ textAlign: "center", margin: "6px 0 14px", fontSize: "0.95rem", fontWeight: 700, color: colors.textPrimary }}>
                {done.total_dtns} application{done.total_dtns === 1 ? "" : "s"} closed
              </p>
              <p style={{ textAlign: "center", margin: "0 0 14px", fontSize: "0.74rem", color: colors.textTertiary }}>
                {done.total_references} reference number{done.total_references === 1 ? "" : "s"} · {done.total_logs_closed} open task{done.total_logs_closed === 1 ? "" : "s"} closed
              </p>
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {done.closed.map((c, i) => (
                  <div key={`${c.dtn}-${i}`} style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "5px 0", fontSize: "0.76rem", borderTop: i ? `1px solid ${colors.divider}` : "none" }}>
                    <span style={{ color: "#10b981" }}>✔</span>
                    <span style={{ fontWeight: 700, color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>{c.dtn ?? "—"}</span>
                    <span style={{ color: colors.textTertiary }}>{c.reference_nos.join(", ")}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div style={{ padding: "10px 12px", borderRadius: 10, fontSize: "0.74rem", lineHeight: 1.5, color: colors.textPrimary, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)", marginBottom: 14 }}>
                This closes <b>every reference number</b> under each DTN and ends all their open tasks, including unclaimed ones.
                The applications are marked <b>COMPLETED</b>.
              </div>

              <div style={{ fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: colors.textTertiary, marginBottom: 4 }}>
                DTNs ({records.length})
              </div>
              <div style={{ maxHeight: 110, overflowY: "auto", marginBottom: 14, paddingRight: 4 }}>
                {records.map((r) => (
                  <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0", fontSize: "0.76rem" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: RED, flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>{r.dtn ?? "—"}</span>
                    <span style={{ color: colors.textTertiary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name_of_establishment ?? ""}</span>
                  </div>
                ))}
              </div>

              {failure && (
                <div role="alert" style={{ padding: "10px 12px", borderRadius: 10, fontSize: "0.76rem", lineHeight: 1.5, color: colors.textPrimary, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)", marginBottom: 14 }}>
                  <b style={{ color: "#ef4444" }}>❌ Nothing was closed.</b> {failure.message}
                  {failure.errors?.already_closed?.length > 0 && (
                    <div style={{ marginTop: 4 }}>Already closed: <b>{failure.errors.already_closed.join(", ")}</b>. Untick them and try again.</div>
                  )}
                  {failure.errors?.not_found?.length > 0 && (
                    <div style={{ marginTop: 4 }}>Not found (ids): <b>{failure.errors.not_found.join(", ")}</b>. Refresh the page and try again.</div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={label}>Reason for closing <span style={{ color: "#ef4444" }}>*</span></label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} style={input} disabled={running}>
                  <option value="">Select a reason…</option>
                  {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 180px" }}>
                  <label style={label}>Date Released <span style={{ fontWeight: 400 }}>(optional)</span></label>
                  <input type="date" value={dateReleased} onChange={(e) => setDateReleased(e.target.value)} style={input} disabled={running} />
                </div>
                <div style={{ flex: "1 1 240px" }}>
                  <label style={label}>Type of Issuance Released <span style={{ fontWeight: 400 }}>(optional)</span></label>
                  <select value={issuanceReleased} onChange={(e) => setIssuanceReleased(e.target.value)} style={input} disabled={running}>
                    <option value="">— none —</option>
                    {ISSUANCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <div style={hint}>For the record only. It does not change the application's own Type of Issuance.</div>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={label}>Remarks <span style={{ fontWeight: 400 }}>(optional)</span></label>
                <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} style={{ ...input, resize: "vertical" }} placeholder="Add a note for the record…" disabled={running} />
              </div>

              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "0.76rem", color: colors.textPrimary, cursor: "pointer", lineHeight: 1.45 }}>
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={running} style={{ marginTop: 2 }} />
                <span>I understand this closes these applications permanently and <b>cannot be undone</b>.</span>
              </label>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 1.5rem", borderTop: `1px solid ${colors.cardBorder}`, display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
          {done ? (
            <button type="button" onClick={onDone}
              style={{ padding: "8px 22px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: "0.8rem", fontFamily: FONT, color: "#fff", background: "linear-gradient(135deg,#10b981,#059669)", cursor: "pointer" }}>
              Done
            </button>
          ) : (
            <>
              <button type="button" onClick={onClose} disabled={running}
                style={{ padding: "8px 18px", borderRadius: 8, fontWeight: 600, fontSize: "0.8rem", fontFamily: FONT, background: "transparent", color: colors.textTertiary, border: `1px solid ${colors.cardBorder}`, cursor: running ? "not-allowed" : "pointer" }}>
                Cancel
              </button>
              <button type="button" onClick={confirm} disabled={!canConfirm}
                style={{ padding: "8px 18px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: "0.8rem", fontFamily: FONT, color: "#fff",
                  background: "linear-gradient(135deg,#dc2626,#b91c1c)", opacity: canConfirm ? 1 : 0.45, cursor: canConfirm ? "pointer" : "not-allowed" }}>
                {running ? "Closing…" : `🔒 Close ${records.length} Application${records.length === 1 ? "" : "s"}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
