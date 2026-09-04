// src/components/gmp/queue/GMPReassignmentModal.jsx
// GMP-specific Reassignment modal — same-level only (evaluator→evaluator, checker→checker, etc.)
import { useState, useEffect } from "react";
import { getUsersByGroup, getUser } from "../../../api/auth";
import { getGMPRecordLogs, reassignGMPStep } from "../../../api/gmp";
import { GMP_STEP_MAP, FONT } from "../shared/constants";

const REASONS = [
  "Evaluator on leave",
  "Workload balancing",
  "Expertise mismatch",
  "Evaluator request",
  "Supervisory directive",
  "Others",
];

function UserSelect({ value, onChange, users, colors, darkMode }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.username.toLowerCase().includes(q) ||
      `${u.first_name ?? ""} ${u.surname ?? ""}`.toLowerCase().includes(q);
  });
  const selected = users.find((u) => u.username === value);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div onClick={() => users.length > 0 && setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", width: "100%",
          padding: "0.6rem 0.85rem", background: darkMode ? "#1a1a1a" : "#f5f5f5",
          border: `1px solid ${open ? "#7c3aed" : colors.cardBorder}`,
          borderRadius: open ? "8px 8px 0 0" : "8px", boxSizing: "border-box",
          cursor: users.length ? "text" : "not-allowed",
        }}>
        {selected && !open ? (
          <span style={{
            color: "#7c3aed", background: "rgba(124,58,237,0.08)",
            border: "1px solid rgba(124,58,237,0.2)", borderRadius: 6,
            padding: "0.15rem 0.5rem", fontSize: "0.78rem", fontWeight: 600,
          }}>
            👤 {selected.username} — {selected.first_name} {selected.surname}
          </span>
        ) : (
          <input autoFocus={open} value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={users.length === 0 ? "No users available" : "Type to search user..."}
            disabled={users.length === 0}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none",
              color: colors.textPrimary, fontSize: "0.82rem" }} />
        )}
        <span style={{ color: colors.textTertiary, fontSize: "0.65rem", marginLeft: 6 }}>
          {open ? "▲" : "▼"}
        </span>
      </div>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 9998 }}
            onClick={() => { setOpen(false); setSearch(""); }} />
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0,
            background: darkMode ? "#1a1a1a" : "#fff", border: "1px solid #7c3aed",
            borderTop: "none", borderRadius: "0 0 8px 8px", maxHeight: 220,
            overflowY: "auto", zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "0.75rem 1rem", fontSize: "0.78rem", color: colors.textTertiary, textAlign: "center" }}>
                No users match "{search}"
              </div>
            ) : filtered.map((u) => (
              <div key={u.id}
                onClick={() => { onChange(u.username); setOpen(false); setSearch(""); }}
                style={{
                  padding: "0.6rem 1rem", cursor: "pointer",
                  background: u.username === value ? "rgba(124,58,237,0.12)" : "transparent",
                  borderLeft: u.username === value ? "3px solid #7c3aed" : "3px solid transparent",
                }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: colors.textPrimary }}>{u.username}</div>
                <div style={{ fontSize: "0.72rem", color: colors.textTertiary }}>{u.first_name} {u.surname}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function GMPReassignmentModal({ record, onClose, onSuccess, colors, darkMode }) {
  const [currentStep, setCurrentStep]     = useState(null);
  const [currentAssignee, setCurrentAssignee] = useState(null);
  const [loadingStep, setLoadingStep]     = useState(true);
  const [users, setUsers]                 = useState([]);
  const [loadingUsers, setLoadingUsers]   = useState(false);
  const [selectedUser, setSelectedUser]   = useState("");
  const [reason, setReason]               = useState("");
  const [remarks, setRemarks]             = useState("");
  const [currentUser, setCurrentUser]     = useState(null);
  const [submitting, setSubmitting]       = useState(false);
  const [submitted, setSubmitted]         = useState(false);
  const [error, setError]                 = useState("");

  useEffect(() => { const u = getUser(); if (u) setCurrentUser(u); }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoadingStep(true);
        const logs = await getGMPRecordLogs(record.id);
        const openLog = logs.find((l) => l.application_status === "IN PROGRESS");
        setCurrentStep(openLog?.application_step ?? null);
        setCurrentAssignee(openLog?.user_name ?? null);
      } catch {
        setCurrentStep(null);
      } finally {
        setLoadingStep(false);
      }
    })();
  }, [record.id]);

  const groupId = currentStep ? GMP_STEP_MAP[currentStep]?.group_id ?? null : null;

  useEffect(() => {
    setSelectedUser(""); setUsers([]);
    if (!groupId) return;
    (async () => {
      try {
        setLoadingUsers(true);
        setUsers(await getUsersByGroup(groupId));
      } catch { setUsers([]); }
      finally { setLoadingUsers(false); }
    })();
  }, [groupId]);

  const isComplete = !loadingStep && !loadingUsers && !!reason && !!selectedUser && !!currentStep;

  const handleSubmit = async () => {
    if (!isComplete) return;
    setSubmitting(true); setError("");
    try {
      await reassignGMPStep(record.id, {
        application_step: currentStep,
        reassigned_to_user_name: selectedUser,
        reassigned_to_user_id: users.find((u) => u.username === selectedUser)?.id ?? null,
        reassignment_reason: reason,
        reassignment_remarks: remarks || null,
      });
      setSubmitted(true);
      await onSuccess?.();
    } catch (e) {
      setError(e?.response?.data?.detail ?? e?.message ?? "Reassignment failed.");
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
        width: "100%", maxWidth: 500, maxHeight: "90vh", display: "flex", flexDirection: "column",
        overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        <div style={{
          padding: "1.1rem 1.4rem", background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "1.2rem" }}>🔄</span>
            <div>
              <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#fff" }}>Application Re-assignment</div>
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
                Re-assignment Submitted
              </div>
              <div style={{ fontSize: "0.8rem", color: colors.textTertiary, marginBottom: 20 }}>
                Reassigned to <strong>{selectedUser}</strong> under <strong>{currentStep}</strong>.
              </div>
              <button onClick={onClose} style={{
                padding: "0.6rem 1.5rem", background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
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
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, marginTop: 2, color: currentStep ? "#7c3aed" : colors.textPrimary }}>
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

              <div>
                <label style={labelStyle}>Assign To (same level) *</label>
                {loadingStep || loadingUsers ? (
                  <div style={{ ...inputStyle, color: colors.textTertiary }}>Loading…</div>
                ) : !currentStep ? (
                  <div style={{ ...inputStyle, color: "#ef4444" }}>No active step found for this record.</div>
                ) : (
                  <>
                    <UserSelect value={selectedUser} onChange={setSelectedUser} users={users} colors={colors} darkMode={darkMode} />
                    {users.length === 0 && (
                      <p style={{ fontSize: "0.72rem", color: "#ef4444", marginTop: 6 }}>
                        ⚠️ No users found for the <strong>{currentStep}</strong> group.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div>
                <label style={labelStyle}>Reason for Re-assignment *</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle}>
                  <option value="">— Select reason —</option>
                  {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

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
                  padding: "0.6rem 1.4rem", background: !isComplete ? "#555" : "linear-gradient(135deg,#7c3aed,#6d28d9)",
                  border: "none", borderRadius: 8, color: "#fff", fontSize: "0.82rem", fontWeight: 600,
                  cursor: !isComplete ? "not-allowed" : "pointer", opacity: !isComplete ? 0.6 : 1,
                }}>
                  {submitting ? "Submitting…" : "🔄 Confirm Re-assignment"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}