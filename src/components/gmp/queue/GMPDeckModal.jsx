// src/components/gmp/queue/GMPDeckModal.jsx
// Single-record GMP deck modal — mirrors production BulkDeckModal pattern
// Flow: Doctrack first → then GMPApplicationLogs
import { useState, useEffect, useRef } from "react";
import { getUsersByGroup, getUser } from "../../../api/auth";
import { createBulkDoctrackLogsByRsn } from "../../../api/doctrack";
import { FONT } from "../shared/constants";

// ── Constants ─────────────────────────────────────────────────────────────────
export const GMP_EVALUATOR_GROUP_ID = 31;

const DECISIONS = [
  "Forwarded to Evaluator",
];

const DOCTRACK_DEFAULTS = {
  "Forwarded to Evaluator": "FGMP Application received, encoded and decked to evaluator",
};

const MODAL_CSS = `
@keyframes gmpFadeIn    { from { opacity:0; }                         to { opacity:1; } }
@keyframes gmpSlideIn   { from { opacity:0; transform:scale(0.93); } to { opacity:1; transform:scale(1); } }
@keyframes gmpSpin      { to   { transform:rotate(360deg); } }
`;

function Spinner({ size = 13 }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff",
      borderRadius: "50%", animation: "gmpSpin 0.6s linear infinite",
    }} />
  );
}

// ── User search dropdown (same pattern as production UserSelect) ───────────────
function UserSelect({ value, onChange, users, colors }) {
  const [search, setSearch] = useState("");
  const [open,   setOpen]   = useState(false);
  const ref = useRef(null);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      `${u.first_name ?? ""} ${u.surname ?? u.last_name ?? ""}`.toLowerCase().includes(q)
    );
  });
  const selected = users.find((u) => u.username === value);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <div onClick={() => users.length > 0 && setOpen(o => !o)}
        style={{
          width: "100%", padding: "0.6rem 1rem", borderRadius: 8,
          border: `1px solid ${colors.inputBorder}`,
          background: colors.inputBg, color: value ? colors.textPrimary : colors.textTertiary,
          fontSize: "0.88rem", cursor: users.length === 0 ? "not-allowed" : "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          opacity: users.length === 0 ? 0.55 : 1, boxSizing: "border-box",
        }}>
        <span>
          {selected
            ? `${selected.username} — ${selected.first_name ?? ""} ${selected.surname ?? selected.last_name ?? ""}`
            : users.length === 0 ? "No users available" : "Select evaluator"}
        </span>
        <span style={{ fontSize: "0.7rem", color: colors.textTertiary }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0,
          background: colors.cardBg, border: `1px solid ${colors.cardBorder}`,
          borderRadius: 8, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "0.45rem" }}>
            <input autoFocus type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user..."
              style={{
                width: "100%", padding: "0.45rem 0.7rem", borderRadius: 6,
                border: `1px solid ${colors.inputBorder}`, background: colors.inputBg,
                color: colors.textPrimary, fontSize: "0.82rem", outline: "none",
                boxSizing: "border-box",
              }} />
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {filtered.length === 0
              ? <div style={{ padding: "0.7rem 1rem", fontSize: "0.8rem", color: colors.textTertiary }}>No users found</div>
              : filtered.map((u) => (
                <div key={u.id}
                  onClick={() => { onChange(u.username); setOpen(false); setSearch(""); }}
                  style={{
                    padding: "0.5rem 1rem", cursor: "pointer",
                    background: value === u.username ? "rgba(76,175,80,0.1)" : "transparent",
                    borderLeft: value === u.username ? "3px solid #4CAF50" : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => { if (value !== u.username) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={(e) => { if (value !== u.username) e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: colors.textPrimary }}>{u.username}</div>
                  <div style={{ fontSize: "0.72rem", color: colors.textTertiary }}>{u.first_name} {u.surname ?? u.last_name}</div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main DeckModal ────────────────────────────────────────────────────────────
export default function DeckModal({ record, onClose, onSuccess, colors, darkMode }) {
  const [decision,         setDecision]         = useState("");
  const [evaluator,        setEvaluator]        = useState("");
  const [deckerRemarks,    setDeckerRemarks]    = useState("");
  const [doctrackEnabled,  setDoctrackEnabled]  = useState(true);
  const [doctrackRemarks,  setDoctrackRemarks]  = useState("");
  const [users,            setUsers]            = useState([]);
  const [loadingUsers,     setLoadingUsers]     = useState(false);
  const [submitting,       setSubmitting]       = useState(false);
  const [error,            setError]            = useState("");
  const [currentUser,      setCurrentUser]      = useState(null);
  const [screen,           setScreen]           = useState("form"); // "form" | "done"

  useEffect(() => {
    const u = getUser();
    if (u) setCurrentUser(u);
  }, []);

  // Load evaluators when decision changes to "Forwarded to Quality Evaluator"
  useEffect(() => {
    const needsEval = decision === "Forwarded to Evaluator";
    setEvaluator("");
    setDoctrackRemarks(DOCTRACK_DEFAULTS[decision] ?? "");
    if (!needsEval) { setUsers([]); return; }
    (async () => {
      try {
        setLoadingUsers(true);
        setUsers(await getUsersByGroup(GMP_EVALUATOR_GROUP_ID));
      } catch { setUsers([]); }
      finally { setLoadingUsers(false); }
    })();
  }, [decision]);

  const needsEvaluator = decision === "Forwarded to Evaluator";
  const isDisabled = submitting || !decision
    || (needsEvaluator && (loadingUsers || users.length === 0 || !evaluator))
    || (doctrackEnabled && !doctrackRemarks.trim());

  const inp = {
    width: "100%", padding: "0.65rem 1rem", borderRadius: 8, fontFamily: FONT,
    border: `1px solid ${colors.inputBorder}`, background: colors.inputBg,
    color: colors.textPrimary, fontSize: "0.88rem", outline: "none",
    boxSizing: "border-box", transition: "border-color 0.2s",
  };
  const lbl = {
    display: "block", fontSize: "0.72rem", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.04em",
    color: colors.textPrimary, marginBottom: "0.4rem",
  };

  const handleSubmit = async () => {
    setError(""); setSubmitting(true);
    try {
      // Step 1 — Doctrack
      if (doctrackEnabled) {
        const result = await createBulkDoctrackLogsByRsn(
          [{ rsn: String(record.dtn), remarks: doctrackRemarks.trim(), userID: currentUser?.id ?? null }],
          currentUser?.alias ?? "",
        );
        if (!result) {
          setError("Failed to insert Doctrack log. Turn OFF the Doctrack toggle if FIS was already updated manually.");
          setSubmitting(false); return;
        }
      }

      // Step 2 — GMP application logs via advance-step endpoint
      const { advanceStep, getGMPRecordLogs } = await import("../../../api/gmp");
      const logs = await getGMPRecordLogs(record.id);
      const openDeckLog = logs.find(l => l.application_step === "Decking" && l.application_status === "IN PROGRESS");

      // Carry the evaluator's numeric id (not just the username) so the task
      // survives a later username change — the tasks list matches id-or-name.
      const evalUser = needsEvaluator ? users.find(u => u.username === evaluator) : null;
      const advancePayload = {
        current_step:        "Decking",
        action:              decision,
        recommendation:      "",
        remarks:             deckerRemarks,
        // Always recorded on our own application log — mirrors WorkflowModal:
        // `doctrackEnabled` only controls whether this text is ALSO pushed to
        // the external FIS Doctrack system above; it must not gate our own
        // history, or every deck submitted with the toggle off silently loses
        // its remarks.
        doctrack_remarks:    doctrackRemarks.trim(),
        next_assignee_name:  needsEvaluator ? evaluator : null,
        next_assignee_id:    evalUser?.id ?? null,
      };

      if (openDeckLog) {
        // Already has an open decking log — advance it
        await advanceStep(record.id, advancePayload);
      } else {
        // No open decking log — create one via the assign endpoint then advance
        // Use the assign-evaluator endpoint which sets GMP_EVALUATOR on the record
        const { assignEvaluator } = await import("../../../api/gmp");
        if (needsEvaluator) await assignEvaluator(record.id, evaluator);
        await advanceStep(record.id, advancePayload);
      }

      setScreen("done");
      await onSuccess?.();
    } catch (e) {
      setError(e?.response?.data?.detail ?? e?.message ?? "Submission failed. Please try again.");
      setSubmitting(false);
    }
  };

  // ── Done screen ───────────────────────────────────────────────────────────
  if (screen === "done") {
    return (
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)", animation: "gmpFadeIn 0.2s ease",
      }}>
        <style>{MODAL_CSS}</style>
        <div onClick={(e) => e.stopPropagation()} style={{
          background: colors.cardBg, border: `1px solid ${colors.cardBorder}`,
          borderRadius: 16, padding: "2rem", width: 380, maxWidth: "90%",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem",
          boxShadow: "0 16px 48px rgba(0,0,0,0.35)", animation: "gmpSlideIn 0.25s ease",
        }}>
          <div style={{ fontSize: "2.5rem" }}>🎯</div>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: colors.textPrimary, textAlign: "center" }}>
            Application Decked!
          </h3>
          <p style={{ margin: 0, fontSize: "0.82rem", color: colors.textSecondary, textAlign: "center", lineHeight: 1.5 }}>
            DTN <strong style={{ color: "#4CAF50", fontFamily: "ui-monospace,monospace" }}>{record.dtn}</strong> has been decked
            {needsEvaluator && evaluator ? <> and assigned to <strong style={{ color: "#2196F3" }}>{evaluator}</strong></> : ""}.
          </p>
          <button onClick={onClose} style={{
            padding: "0.6rem 2rem", borderRadius: 8, border: "none",
            background: "linear-gradient(135deg,#4CAF50,#45a049)", color: "#fff",
            fontSize: "0.88rem", fontWeight: 700, cursor: "pointer",
            boxShadow: "0 2px 8px rgba(76,175,80,0.35)",
          }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  // ── Form screen ───────────────────────────────────────────────────────────
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)", animation: "gmpFadeIn 0.2s ease", padding: 16,
    }}>
      <style>{MODAL_CSS}</style>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: colors.cardBg, border: `1px solid ${colors.cardBorder}`,
        borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "92vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)", animation: "gmpSlideIn 0.3s ease",
      }}>
        {/* Header */}
        <div style={{
          padding: "1rem 1.25rem", borderBottom: `2px solid ${colors.cardBorder}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: colors.cardBg, flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: colors.textPrimary,
              display: "flex", alignItems: "center", gap: "0.5rem" }}>
              🎯 Deck Application
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: colors.textTertiary }}>
              DTN: <span style={{ fontFamily: "ui-monospace,monospace", fontWeight: 700, color: "#4CAF50" }}>{record.dtn}</span>
              {" · "}{record.lto_company || record.name_of_establishment || ""}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
            background: "transparent", color: colors.textTertiary, cursor: "pointer",
            fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.25rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {/* Decker (current user) */}
          <div>
            <label style={lbl}>Decker (You) <span style={{ color: "#4CAF50" }}>●</span></label>
            <input readOnly value={currentUser?.username ?? "—"} style={{ ...inp, background: colors.badgeBg, cursor: "not-allowed", fontWeight: 600 }} />
          </div>

          {/* Decision */}
          <div>
            <label style={lbl}>Decision <span style={{ color: "#ef4444" }}>*</span></label>
            <select value={decision} onChange={(e) => setDecision(e.target.value)}
              style={{ ...inp, cursor: "pointer" }}
              onFocus={(e) => { e.target.style.borderColor = "#4CAF50"; }}
              onBlur={(e)  => { e.target.style.borderColor = colors.inputBorder; }}>
              <option value="">Select decision…</option>
              {DECISIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Evaluator — only when forwarding */}
          {needsEvaluator && (
            <div>
              <label style={lbl}>
                Assign Evaluator <span style={{ color: "#ef4444" }}>*</span>
                <span style={{
                  marginLeft: 6, fontSize: "0.68rem", fontWeight: 500,
                  color: "#4CAF50", background: "#4CAF5015",
                  border: "1px solid #4CAF5030", padding: "0.1rem 0.45rem", borderRadius: 4,
                }}>FGMP Evaluator Group</span>
              </label>
              {loadingUsers
                ? <div style={{ ...inp, display: "flex", alignItems: "center", gap: 8, color: colors.textTertiary }}>
                    <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #4CAF5030", borderTopColor: "#4CAF50", borderRadius: "50%", animation: "gmpSpin 0.6s linear infinite" }} />
                    Loading evaluators…
                  </div>
                : <UserSelect value={evaluator} onChange={setEvaluator} users={users} colors={colors} />
              }
              {!loadingUsers && users.length === 0 && (
                <p style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: 4, marginBottom: 0 }}>
                  ⚠️ No users found in FGMP Evaluator group.
                </p>
              )}
            </div>
          )}

          {/* Decker Remarks */}
          <div>
            <label style={lbl}>Decker Remarks</label>
            <textarea value={deckerRemarks} onChange={(e) => setDeckerRemarks(e.target.value)}
              placeholder="Enter any remarks…" rows={3}
              style={{ ...inp, resize: "vertical", fontFamily: FONT }}
              onFocus={(e) => { e.target.style.borderColor = "#4CAF50"; }}
              onBlur={(e)  => { e.target.style.borderColor = colors.inputBorder; }} />
          </div>

          {/* Doctrack Remarks + Toggle */}
          {decision && (
            <div>
              <label style={{ ...lbl, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <span>Doctrack Remarks {doctrackEnabled && <span style={{ color: "#ef4444" }}>*</span>}</span>
                <span style={{ fontSize: "0.68rem", fontWeight: 500, color: "#2196F3", background: "#2196F315", border: "1px solid #2196F330", padding: "0.1rem 0.45rem", borderRadius: 4 }}>
                  auto-filled
                </span>
                {/* Toggle */}
                <span onClick={() => setDoctrackEnabled(p => !p)} style={{
                  display: "inline-flex", alignItems: "center", gap: "0.35rem",
                  fontSize: "0.65rem", fontWeight: 600, cursor: "pointer",
                  padding: "0.1rem 0.5rem 0.1rem 0.35rem", borderRadius: 20,
                  border: `1px solid ${doctrackEnabled ? "#4CAF5050" : "#ef444450"}`,
                  background: doctrackEnabled ? "#4CAF5015" : "#ef444415",
                  color: doctrackEnabled ? "#4CAF50" : "#ef4444",
                  userSelect: "none", transition: "all 0.2s",
                }}>
                  <span style={{ width: 22, height: 11, borderRadius: 11, background: doctrackEnabled ? "#4CAF50" : "#ef4444", display: "inline-block", position: "relative", flexShrink: 0 }}>
                    <span style={{ position: "absolute", top: 2, left: doctrackEnabled ? 13 : 2, width: 7, height: 7, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                  </span>
                  {doctrackEnabled ? "ON" : "OFF"}
                </span>
                {!doctrackEnabled && <span style={{ fontSize: "0.62rem", color: "#f59e0b", fontWeight: 400, textTransform: "none", letterSpacing: "normal" }}>⚠ FIS will NOT be updated</span>}
              </label>
              <textarea value={doctrackRemarks} onChange={(e) => setDoctrackRemarks(e.target.value)}
                disabled={!doctrackEnabled} rows={2}
                placeholder={doctrackEnabled ? "Doctrack remarks for FIS…" : "Doctrack disabled"}
                style={{ ...inp, resize: "vertical", fontFamily: FONT, opacity: doctrackEnabled ? 1 : 0.45, cursor: doctrackEnabled ? "text" : "not-allowed" }}
                onFocus={(e) => { if (doctrackEnabled) e.target.style.borderColor = "#2196F3"; }}
                onBlur={(e)  => { e.target.style.borderColor = colors.inputBorder; }} />
            </div>
          )}

          {error && (
            <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, fontSize: "0.76rem", color: "#ef4444", whiteSpace: "pre-line" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Info box */}
          {decision && (
            <div style={{ padding: "0.75rem 1rem", background: "rgba(76,175,80,0.06)", border: "1px solid rgba(76,175,80,0.2)", borderRadius: 8, fontSize: "0.78rem", color: colors.textSecondary, lineHeight: 1.5 }}>
              <strong style={{ color: "#4CAF50" }}>ℹ</strong>{" "}
              {needsEvaluator
                ? `A Decking (Completed) log will be created and a Quality Evaluator (In Progress) log will be assigned to ${evaluator || "the selected user"}.`
                : `A Decking log will be created with decision: "${decision}". No next step assignment needed.`}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "1rem 1.25rem", borderTop: `1px solid ${colors.cardBorder}`,
          display: "flex", gap: "0.75rem", justifyContent: "flex-end",
          background: colors.cardBg, flexShrink: 0,
        }}>
          <button onClick={onClose} disabled={submitting} style={{
            padding: "0.6rem 1.25rem", borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
            background: "transparent", color: colors.textSecondary, fontSize: "0.85rem",
            fontWeight: 500, cursor: "pointer", fontFamily: FONT,
          }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={isDisabled} style={{
            padding: "0.6rem 1.5rem", borderRadius: 8, border: "none",
            background: isDisabled ? "#4CAF5080" : "linear-gradient(135deg,#4CAF50,#45a049)",
            color: "#fff", fontSize: "0.85rem", fontWeight: 700,
            cursor: isDisabled ? "not-allowed" : "pointer", fontFamily: FONT,
            display: "flex", alignItems: "center", gap: "0.5rem",
            boxShadow: isDisabled ? "none" : "0 2px 8px rgba(76,175,80,0.35)",
          }}>
            {submitting ? <><Spinner /> Decking…</> : "🎯 Deck Application"}
          </button>
        </div>
      </div>
    </div>
  );
}
