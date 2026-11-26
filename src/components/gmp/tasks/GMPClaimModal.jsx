// src/components/gmp/tasks/GMPClaimModal.jsx
// Claim unassigned (UNCLAIMED) OD Receiving / OD Releasing tasks — the FGMP
// counterpart of CPR's "Claim Selected". Confirm first (nothing is claimed
// until the user says so), then claim one by one so a task somebody else just
// took shows up as a clear failure instead of stopping the rest. The page is
// refreshed only when the result is dismissed (onDone), so this popup is not
// unmounted underneath the user when the last unclaimed row disappears.
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { claimGMPLog } from "../../../api/gmp";
import { FONT } from "../shared/constants";

const AMBER = "#f59e0b";

export default function GMPClaimModal({ tasks, step, onDone, onCancel, colors }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null); // { claimed: [task], failed: [{ task, reason }] }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !running) (result ? onDone(true) : onCancel());
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [running, result, onDone, onCancel]);

  const runClaim = async () => {
    if (running) return;
    setRunning(true);
    const claimed = [];
    const failed = [];
    for (const t of tasks) {
      try {
        await claimGMPLog(t.id);
        claimed.push(t);
      } catch (e) {
        failed.push({ task: t, reason: e?.response?.data?.detail ?? e?.message ?? "Could not claim." });
      }
    }
    setResult({ claimed, failed });
    setRunning(false);
  };

  const card = {
    background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: 14,
    width: 520, maxWidth: "92vw", maxHeight: "86vh", display: "flex", flexDirection: "column",
    boxShadow: "0 16px 48px rgba(0,0,0,0.35)", fontFamily: FONT, overflow: "hidden",
  };
  const row = { display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: "0.76rem" };
  const btn = (bg, extra = {}) => ({
    padding: "8px 18px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: "0.78rem",
    fontFamily: FONT, color: "#fff", background: bg, cursor: "pointer", ...extra,
  });

  return createPortal(
    <div
      onClick={() => { if (!running) (result ? onDone(true) : onCancel()); }}
      style={{ position: "fixed", inset: 0, zIndex: 10002, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div role="dialog" aria-modal="true" aria-label="Claim tasks" onClick={(e) => e.stopPropagation()} style={card}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${colors.cardBorder}`, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 38, height: 38, borderRadius: 12, background: `${AMBER}22`, border: `1px solid ${AMBER}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>🙋</span>
          <div>
            <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", color: AMBER, textTransform: "uppercase" }}>Unclaimed · {step}</div>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: colors.textPrimary }}>
              {result ? "Claim result" : `Claim ${tasks.length} task${tasks.length === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          {!result && (
            <>
              <div style={{ padding: "10px 12px", borderRadius: 10, fontSize: "0.76rem", lineHeight: 1.5, color: colors.textPrimary, background: `${AMBER}14`, border: `1px solid ${AMBER}40`, marginBottom: 12 }}>
                These tasks will move to <b>your My Tasks</b> tab and no one else in the group will see them in
                Unclaimed any more.
              </div>
              <div style={{ fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: colors.textTertiary, marginBottom: 4 }}>
                DTNs to claim ({tasks.length})
              </div>
              <div style={{ maxHeight: 220, overflowY: "auto", paddingRight: 4 }}>
                {tasks.map((t) => (
                  <div key={t.id} style={row}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: AMBER, flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>{t.dtn ?? "—"}</span>
                    <span style={{ color: colors.textTertiary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name_of_establishment ?? ""}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {result && (
            <>
              <div style={{ fontSize: "0.86rem", fontWeight: 700, color: result.failed.length ? colors.textPrimary : "#10b981", marginBottom: 10 }}>
                {result.claimed.length > 0 && <>✅ {result.claimed.length} claimed</>}
                {result.claimed.length > 0 && result.failed.length > 0 && " · "}
                {result.failed.length > 0 && <span style={{ color: "#ef4444" }}>❌ {result.failed.length} not claimed</span>}
              </div>
              {result.claimed.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: colors.textTertiary, marginBottom: 4 }}>Now in your My Tasks</div>
                  {result.claimed.map((t) => (
                    <div key={t.id} style={row}>
                      <span style={{ color: "#10b981" }}>✔</span>
                      <span style={{ fontWeight: 700, color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>{t.dtn ?? "—"}</span>
                    </div>
                  ))}
                </div>
              )}
              {result.failed.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#ef4444", marginBottom: 4 }}>Not claimed</div>
                  {result.failed.map(({ task, reason }) => (
                    <div key={task.id} style={{ ...row, alignItems: "flex-start" }}>
                      <span style={{ color: "#ef4444" }}>✕</span>
                      <span style={{ fontWeight: 700, color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>{task.dtn ?? "—"}</span>
                      <span style={{ color: colors.textTertiary }}>— {reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: `1px solid ${colors.cardBorder}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {!result ? (
            <>
              <button type="button" disabled={running} onClick={onCancel}
                style={btn("transparent", { color: colors.textTertiary, border: `1px solid ${colors.cardBorder}`, cursor: running ? "not-allowed" : "pointer" })}>
                Cancel
              </button>
              <button type="button" disabled={running} onClick={runClaim}
                style={btn("linear-gradient(135deg,#f59e0b,#d97706)", { opacity: running ? 0.6 : 1, cursor: running ? "not-allowed" : "pointer" })}>
                {running ? "Claiming…" : `🙋 Claim ${tasks.length}`}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => onDone(true)} style={btn("linear-gradient(135deg,#10b981,#059669)")}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
