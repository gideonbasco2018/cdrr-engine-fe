// src/components/gmp/queue/GMPRerouteModal.jsx
// GMP-specific Reroute modal — pick any target step from the 8-step GMP workflow
import { useState, useEffect } from "react";
import { getUsersByGroup, getUser } from "../../../api/auth";
import { getGMPRecordLogs, rerouteGMPStep } from "../../../api/gmp";
import { GMP_STEPS, GMP_STEP_MAP, FONT } from "../shared/constants";

const REASONS = [
  "Missing documents", "Incorrect classification", "Additional evaluation needed",
  "Compliance issue", "Director directive", "Applicant request", "System correction", "Others",
];

export default function GMPRerouteModal({ record, onClose, onSuccess, colors, darkMode }) {
  const [currentStep, setCurrentStep]         = useState(null);
  const [currentAssignee, setCurrentAssignee] = useState(null);
  const [loadingStep, setLoadingStep]         = useState(true);
  const [targetStep, setTargetStep]           = useState("");
  const [assignedUser, setAssignedUser]       = useState("");
  const [users, setUsers]                     = useState([]);
  const [loadingUsers, setLoadingUsers]       = useState(false);
  const [reason, setReason]                   = useState("");
  const [remarks, setRemarks]                 = useState("");
  const [currentUser, setCurrentUser]         = useState(null);
  const [submitting, setSubmitting]           = useState(false);
  const [submitted, setSubmitted]             = useState(false);
  const [error, setError]                     = useState("");

  useEffect(() => { const u = getUser(); if (u) setCurrentUser(u); }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoadingStep(true);
        const logs = await getGMPRecordLogs(record.id);
        const openLog = logs.find((l) => l.application_status === "IN PROGRESS");
        setCurrentStep(openLog?.application_step ?? null);
        setCurrentAssignee(openLog?.user_name ?? null);
      } catch { setCurrentStep(null); }
      finally { setLoadingStep(false); }
    })();
  }, [record.id]);

  const targetStepObj = GMP_STEP_MAP[targetStep];
  const stepHasGroup  = !!targetStepObj?.group_id;

  useEffect(() => {
    setAssignedUser(""); setUsers([]);
    if (!stepHasGroup) return;
    (async () => {
      try {
        setLoadingUsers(true);
        setUsers(await getUsersByGroup(targetStepObj.group_id));
      } catch { setUsers([]); }
      finally { setLoadingUsers(false); }
    })();
  }, [targetStep]);

  const currentIdx = GMP_STEPS.findIndex((s) => s.id === currentStep);
  const targetIdx  = GMP_STEPS.findIndex((s) => s.id === targetStep);
  const isBackward = targetStep && currentIdx > -1 && targetIdx > -1 && targetIdx < currentIdx;

  const isComplete = !loadingStep && !!targetStep && !!reason && (!stepHasGroup || !!assignedUser);

  const handleSubmit = async () => {
    if (!isComplete) return;
    setSubmitting(true); setError("");
    try {
      await rerouteGMPStep(record.id, {
        reroute_from_step: currentStep,
        reroute_target_step: targetStep,
        target_user_name: assignedUser || null,
        target_user_id: users.find((u) => u.username === assignedUser)?.id ?? null,
        reroute_reason: reason,
        reroute_remarks: remarks || null,
      });
      setSubmitted(true);
      await onSuccess?.();
    } catch (e) {
      setError(e?.response?.data?.detail ?? e?.message ?? "Reroute failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "0.6rem 0.85rem", fontFamily: FONT,
    background: darkMode ? "#1a1a1a" : "#f5f5f5", border: `1px solid ${colors.cardBorder}`,
    borderRadius: 8, color: colors.textPrimary, fontSize: "0.82rem", outline: "none", boxSizing: "border-box",
  };
  const labelStyle = {
    fontSize: "0.72rem", fontWeight: 600, color: colors.textTertiary,
    textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6,
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 10000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: 14,
        width: "100%", maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column",
        overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        <div style={{
          padding: "1.1rem 1.4rem", background: "linear-gradient(135deg,#0891b2,#0e7490)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "1.2rem" }}>🔀</span>
            <div>
              <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#fff" }}>Application Re-route</div>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                DTN: <strong style={{ color: "#fff" }}>{record?.dtn ?? "N/A"}</strong>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
            borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: "1rem",
          }}>×</button>
        </div>

        <div style={{ padding: "1.4rem", overflowY: "auto", flex: 1 }}>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: colors.textPrimary, marginBottom: 6 }}>
                Re-route Submitted
              </div>
              <div style={{ fontSize: "0.8rem", color: colors.textTertiary, marginBottom: 20 }}>
                Rerouted to <strong>{targetStepObj?.label}</strong>
                {assignedUser && <> and assigned to <strong>{assignedUser}</strong></>}.
              </div>
              <button onClick={onClose} style={{
                padding: "0.6rem 1.5rem", background: "linear-gradient(135deg,#0891b2,#0e7490)",
                border: "none", borderRadius: 8, color: "#fff", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
              }}>Close</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{
                padding: "0.75rem 1rem", background: darkMode ? "#1a1a1a" : "#f8f8f8",
                borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
                display: "flex", gap: "1.5rem", flexWrap: "wrap",
              }}>
                <div>
                  <div style={{ fontSize: "0.65rem", color: colors.textTertiary, fontWeight: 600, textTransform: "uppercase" }}>Current Step</div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, marginTop: 2, color: currentStep ? "#0891b2" : colors.textPrimary }}>
                    {loadingStep ? "Detecting..." : currentStep ?? "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.65rem", color: colors.textTertiary, fontWeight: 600, textTransform: "uppercase" }}>Current Assignee</div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, marginTop: 2 }}>
                    {loadingStep ? "Detecting..." : (currentAssignee ?? "N/A")}
                  </div>
                </div>
              </div>

              {/* Step selector strip */}
              <div>
                <div style={{ ...labelStyle, marginBottom: 10 }}>Workflow Steps</div>
                <div style={{ display: "flex", alignItems: "center", overflowX: "auto", paddingBottom: 4 }}>
                  {GMP_STEPS.map((step, idx) => {
                    const isCurrent = step.id === currentStep;
                    const isTarget  = step.id === targetStep;
                    return (
                      <div key={step.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                        <div onClick={() => setTargetStep(step.id)} title={step.label}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", minWidth: 52 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: "50%", display: "flex",
                            alignItems: "center", justifyContent: "center", fontSize: "0.85rem",
                            border: isTarget ? "2px solid #0891b2" : isCurrent ? "2px solid #f59e0b" : "2px solid transparent",
                            background: isTarget ? "rgba(8,145,178,0.15)" : isCurrent ? "rgba(245,158,11,0.15)" : "transparent",
                          }}>{step.icon}</div>
                          <div style={{
                            fontSize: "0.52rem", textAlign: "center", whiteSpace: "nowrap",
                            color: isTarget ? "#0891b2" : isCurrent ? "#f59e0b" : colors.textTertiary,
                            fontWeight: isTarget || isCurrent ? 700 : 400,
                          }}>
                            {isCurrent ? "Current" : isTarget ? "Target" : step.label}
                          </div>
                        </div>
                        {idx < GMP_STEPS.length - 1 && (
                          <div style={{ flex: 1, height: 1, background: colors.cardBorder, margin: "0 2px", marginBottom: 16 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Target Step *</label>
                <select value={targetStep} onChange={(e) => setTargetStep(e.target.value)} style={inputStyle}>
                  <option value="">— Select target step —</option>
                  {GMP_STEPS.map((s) => (
                    <option key={s.id} value={s.id}>{s.icon} {s.label}{s.id === currentStep ? " (current)" : ""}</option>
                  ))}
                </select>
              </div>

              {targetStep && (
                <div>
                  <label style={labelStyle}>Assign To{stepHasGroup ? " *" : ""}</label>
                  {loadingUsers ? (
                    <div style={{ ...inputStyle, color: colors.textTertiary }}>Loading users…</div>
                  ) : stepHasGroup ? (
                    <>
                      <select value={assignedUser} onChange={(e) => setAssignedUser(e.target.value)} style={inputStyle}>
                        <option value="">— Select user —</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.username}>{u.username} — {u.first_name} {u.surname}</option>
                        ))}
                      </select>
                      {users.length === 0 && (
                        <p style={{ fontSize: "0.72rem", color: "#ef4444", marginTop: 6 }}>
                          ⚠️ No users found for {targetStepObj?.label}.
                        </p>
                      )}
                    </>
                  ) : (
                    <input value={assignedUser} onChange={(e) => setAssignedUser(e.target.value)}
                      placeholder="Enter username or leave blank..." style={inputStyle} />
                  )}
                </div>
              )}

              <div>
                <label style={labelStyle}>Reason for Re-route *</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle}>
                  <option value="">— Select reason —</option>
                  {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {isBackward && (
                <div style={{
                  padding: "0.6rem 0.85rem", background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8,
                  fontSize: "0.75rem", color: "#ef4444",
                }}>
                  ⚠️ You are rerouting <strong>backward</strong>. This may require supervisory approval.
                </div>
              )}

              <div>
                <label style={labelStyle}>Additional Remarks</label>
                <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3}
                  placeholder="Optional remarks..." style={{ ...inputStyle, resize: "vertical" }} />
              </div>

              {error && (
                <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, fontSize: "0.76rem", color: "#ef4444" }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={onClose} style={{
                  padding: "0.6rem 1.2rem", background: "transparent", border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 8, color: colors.textPrimary, fontSize: "0.82rem", cursor: "pointer",
                }}>Cancel</button>
                <button onClick={handleSubmit} disabled={!isComplete || submitting} style={{
                  padding: "0.6rem 1.4rem", background: !isComplete ? "#555" : "linear-gradient(135deg,#0891b2,#0e7490)",
                  border: "none", borderRadius: 8, color: "#fff", fontSize: "0.82rem", fontWeight: 600,
                  cursor: !isComplete ? "not-allowed" : "pointer", opacity: !isComplete ? 0.6 : 1,
                }}>
                  {submitting ? "Submitting…" : "🔀 Confirm Re-route"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}