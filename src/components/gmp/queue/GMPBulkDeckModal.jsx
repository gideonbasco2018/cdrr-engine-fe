// src/components/gmp/queue/BulkDeckModal.jsx
// Bulk deck modal for GMP — mirrors production BulkDeckModal pattern
// Flow: Doctrack (bulk) → GMPApplicationLogs per record
import { useState, useEffect, useRef } from "react";
import { getUsersByGroup, getUser } from "../../../api/auth";
import { createBulkDoctrackLogsByRsn } from "../../../api/doctrack";
import { advanceStep, getGMPRecordLogs, assignEvaluator, getGMPTaskCounts } from "../../../api/gmp";
import { FONT } from "../shared/constants";

export const GMP_EVALUATOR_GROUP_ID = 31;

// "Decision" was renamed to "Action" — the backend field this maps to
// (GMPAdvanceStepRequest.action) was always called "action"; this just makes
// the frontend naming match. "Disapprove" and "Hold" have both been removed
// as options — bulk decking now only ever forwards to an Evaluator.
const ACTIONS = [
  "Forwarded to Evaluator",
];

const DOCTRACK_DEFAULTS = {
  "Forwarded to Evaluator": "FGMP Application received, encoded and decked to evaluator",
};

const CSS = `
@keyframes gmpFadeIn  { from{opacity:0} to{opacity:1} }
@keyframes gmpSlideIn { from{opacity:0;transform:scale(0.93)} to{opacity:1;transform:scale(1)} }
@keyframes gmpSpin    { to{transform:rotate(360deg)} }
`;

function Spinner({ size = 13 }) {
  return (
    <span style={{
      display:"inline-block", width:size, height:size,
      border:"2px solid rgba(255,255,255,0.35)", borderTopColor:"#fff",
      borderRadius:"50%", animation:"gmpSpin 0.6s linear infinite",
    }} />
  );
}

// Splits `records` into as-equal-as-possible contiguous blocks across
// `evaluatorUsernames` — e.g. 15 applications / 3 evaluators = 5 each; any
// remainder goes one-at-a-time to the first evaluators in the list. This is
// only the PRESET starting point — handleAssignmentChange below lets any
// individual row be reassigned to a different (checked) evaluator afterward.
function distributeEvenly(records, evaluatorUsernames) {
  const map = {};
  const n = evaluatorUsernames.length;
  if (n === 0) return map;
  const base = Math.floor(records.length / n);
  const extra = records.length % n;
  let idx = 0;
  evaluatorUsernames.forEach((name, i) => {
    const count = base + (i < extra ? 1 : 0);
    for (let k = 0; k < count && idx < records.length; k++, idx++) {
      map[records[idx].id] = name;
    }
  });
  return map;
}

function displayName(u) {
  return `${u.first_name ?? ""} ${u.surname ?? u.last_name ?? ""}`.trim();
}

// ── Evaluator checklist — replaces the old single-select dropdown. Each row
// shows the evaluator's current open-task workload so staff can see who's
// already loaded up before the preset split runs. ─────────────────────────
function EvaluatorChecklist({ evaluators, checked, onToggle, taskCounts, loadingCounts, colors, darkMode }) {
  const [search, setSearch] = useState("");
  const filtered = evaluators.filter((u) => {
    const q = search.toLowerCase();
    return u.username.toLowerCase().includes(q) || displayName(u).toLowerCase().includes(q);
  });
  return (
    <div style={{
      border: `1px solid ${colors.inputBorder}`, borderRadius: 8,
      background: colors.inputBg, overflow: "hidden",
    }}>
      <div style={{ padding: "0.4rem" }}>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search evaluators…" style={{
            width: "100%", padding: "0.4rem 0.65rem", borderRadius: 6, fontFamily: FONT,
            border: `1px solid ${colors.inputBorder}`, background: colors.cardBg,
            color: colors.textPrimary, fontSize: "0.8rem", outline: "none", boxSizing: "border-box",
          }} />
      </div>
      <div style={{ maxHeight: 200, overflowY: "auto", borderTop: `1px solid ${colors.cardBorder}` }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "0.7rem 1rem", fontSize: "0.8rem", color: colors.textTertiary }}>No evaluators found</div>
        ) : filtered.map((u) => {
          const isChecked = checked.includes(u.username);
          const count = taskCounts[u.username] ?? 0;
          return (
            <label key={u.id} onClick={() => onToggle(u.username)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "0.5rem 0.9rem",
              cursor: "pointer", background: isChecked ? "rgba(76,175,80,0.08)" : "transparent",
              borderLeft: isChecked ? "3px solid #4CAF50" : "3px solid transparent",
            }}
              onMouseEnter={(e) => { if (!isChecked) e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)"; }}
              onMouseLeave={(e) => { if (!isChecked) e.currentTarget.style.background = "transparent"; }}>
              <input type="checkbox" checked={isChecked} readOnly style={{ cursor: "pointer", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: colors.textPrimary }}>{u.username}</div>
                <div style={{ fontSize: "0.72rem", color: colors.textTertiary }}>{displayName(u)}</div>
              </div>
              <span title="Applications currently assigned to this evaluator" style={{
                flexShrink: 0, fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                background: count > 0 ? "rgba(245,158,11,0.14)" : "rgba(76,175,80,0.12)",
                color: count > 0 ? "#b45309" : "#4CAF50",
              }}>
                {loadingCounts ? "…" : `${count} current`}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function BulkDeckModal({ records, onClose, onSuccess, colors, darkMode }) {
  const [action,          setAction]           = useState("");
  const [evaluators,      setEvaluators]       = useState([]);
  const [loadingUsers,    setLoadingUsers]     = useState(false);
  const [checkedEvaluators, setCheckedEvaluators] = useState([]);
  const [taskCounts,      setTaskCounts]       = useState({});
  const [loadingCounts,   setLoadingCounts]    = useState(false);
  // record.id -> evaluator username. Seeded by distributeEvenly() whenever
  // the checked evaluator set changes, then editable per-row afterward.
  const [assignments,     setAssignments]      = useState({});
  const [deckerRemarks,   setDeckerRemarks]   = useState("");
  const [doctrackEnabled, setDoctrackEnabled] = useState(true);
  const [doctrackRemarks, setDoctrackRemarks] = useState("");
  const [submitting,      setSubmitting]      = useState(false);
  const [progress,        setProgress]        = useState({ current:0, total:0 });
  const [error,           setError]           = useState("");
  const [alertModal,      setAlertModal]      = useState(null);
  const [screen,          setScreen]          = useState("form"); // "form"|"done"
  const [result,          setResult]          = useState(null);
  const [confirmOpen,     setConfirmOpen]     = useState(false);
  const [currentUser,     setCurrentUser]     = useState(null);
  const submittingRef = useRef(false);

  useEffect(() => { const u = getUser(); if (u) setCurrentUser(u); }, []);

  useEffect(() => {
    setCheckedEvaluators([]);
    setAssignments({});
    setDoctrackRemarks(DOCTRACK_DEFAULTS[action] ?? "");
    if (action !== "Forwarded to Evaluator") { setEvaluators([]); return; }
    (async () => {
      try {
        setLoadingUsers(true);
        const list = await getUsersByGroup(GMP_EVALUATOR_GROUP_ID);
        setEvaluators(list);
        // Auto-check every evaluator in the group so the applications are
        // split (and the assignment list below populated) the moment the
        // modal opens — still fully editable: uncheck anyone here, or
        // reassign any individual application in the list below.
        setCheckedEvaluators(list.map((u) => u.username));
      }
      catch { setEvaluators([]); }
      finally { setLoadingUsers(false); }
    })();
  }, [action]);

  // Current workload per evaluator, fetched once the group's user list is in.
  useEffect(() => {
    if (evaluators.length === 0) { setTaskCounts({}); return; }
    (async () => {
      try {
        setLoadingCounts(true);
        setTaskCounts(await getGMPTaskCounts(evaluators.map((u) => u.username)));
      } catch { setTaskCounts({}); }
      finally { setLoadingCounts(false); }
    })();
  }, [evaluators]);

  // Re-run the even split every time the checked evaluator set changes —
  // this is only ever the PRESET; individual rows can still be reassigned
  // by hand afterward via handleAssignmentChange.
  useEffect(() => {
    setAssignments(distributeEvenly(records, checkedEvaluators));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedEvaluators.join(",")]);

  const needsEvaluator = action === "Forwarded to Evaluator";
  const toggleEvaluator = (username) => {
    setCheckedEvaluators((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  };
  const handleAssignmentChange = (recordId, username) => {
    setAssignments((prev) => ({ ...prev, [recordId]: username }));
  };

  const unassignedCount = needsEvaluator ? records.filter((r) => !assignments[r.id]).length : 0;
  const isDisabled = submitting || !action
    || (needsEvaluator && (loadingUsers || checkedEvaluators.length === 0 || unassignedCount > 0))
    || (doctrackEnabled && !doctrackRemarks.trim());

  const inp = {
    width:"100%", padding:"0.65rem 1rem", borderRadius:8, fontFamily:FONT,
    border:`1px solid ${colors.inputBorder}`, background:colors.inputBg,
    color:colors.textPrimary, fontSize:"0.88rem", outline:"none",
    boxSizing:"border-box", transition:"border-color 0.2s",
  };
  const lbl = {
    display:"block", fontSize:"0.72rem", fontWeight:700,
    textTransform:"uppercase", letterSpacing:"0.04em",
    color:colors.textPrimary, marginBottom:"0.4rem",
  };

  // Per-evaluator totals under the current assignment map — shown in the
  // confirmation modal so the split is legible before committing.
  const assignmentSummary = checkedEvaluators.map((name) => ({
    name, count: records.filter((r) => assignments[r.id] === name).length,
  })).filter((s) => s.count > 0);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!action) { setAlertModal({ message:"Please select an action." }); return; }
    if (needsEvaluator && checkedEvaluators.length === 0) { setAlertModal({ message:"Please check at least one Evaluator." }); return; }
    if (needsEvaluator && unassignedCount > 0) { setAlertModal({ message:`${unassignedCount} application(s) still have no evaluator assigned.` }); return; }
    setConfirmOpen(true);
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true); setConfirmOpen(false);
    setProgress({ current:0, total:records.length });
    const errors = []; const succeeded = [];
    try {
      // Step 1 — Doctrack (bulk, one call for all records)
      if (doctrackEnabled) {
        const entries = records.map(r => ({
          rsn: String(r.dtn), remarks: doctrackRemarks.trim(), userID: currentUser?.id ?? null,
        }));
        let dtRes = null;
        try { dtRes = await createBulkDoctrackLogsByRsn(entries, currentUser?.alias ?? ""); }
        catch (e) {
          setAlertModal({ title:"Doctrack logs", message:`Failed: ${e.message}`, detail:"No application logs were created." });
          return;
        }
        if (!dtRes) {
          setAlertModal({ title:"Doctrack logs", message:"No response from server.", detail:"No application logs were created." });
          return;
        }
      }

      // Step 2 — Application logs per record, each to its own assigned evaluator
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const evaluator = assignments[record.id];
        setProgress({ current:i+1, total:records.length });
        try {
          // Same "does this record already have an open Decking log?" check the
          // single-record GMPDeckModal does — records being decked for the first
          // time have no open Decking log yet, so advanceStep alone has nothing
          // to advance and fails. assignEvaluator() creates/seeds that log first.
          const logs = await getGMPRecordLogs(record.id);
          const openDeckLog = logs.find(
            l => l.application_step === "Decking" && l.application_status === "IN PROGRESS"
          );
          if (!openDeckLog && needsEvaluator) {
            await assignEvaluator(record.id, evaluator);
          }

          await advanceStep(record.id, {
            current_step:       "Decking",
            action:             action,
            recommendation:     "",
            remarks:            deckerRemarks,
            // Always recorded on our own application log — mirrors WorkflowModal:
            // `doctrackEnabled` only controls whether this text is ALSO pushed to
            // the external FIS Doctrack system above; it must not gate our own
            // history, or every deck submitted with the toggle off silently loses
            // its remarks.
            doctrack_remarks:   doctrackRemarks.trim(),
            next_assignee_name: needsEvaluator ? evaluator : null,
            next_assignee_id:   null,
          });
          succeeded.push(record);
        } catch (e) {
          console.error(`Failed to deck DTN ${record.dtn}:`, e);
          errors.push(record.dtn);
        }
      }
      setResult({ succeeded, errors });
      setScreen("done");
      await onSuccess?.();
    } catch (e) {
      setAlertModal({ message:`Unexpected error: ${e.message}` });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      setProgress({ current:0, total:0 });
    }
  };

  // Done screen
  if (screen === "done") {
    const successCount = result?.succeeded?.length ?? 0;
    const failCount = result?.errors?.length ?? 0;
    return (
      <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:10000,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)" }}>
        <style>{CSS}</style>
        <div onClick={e=>e.stopPropagation()} style={{ background:colors.cardBg,border:`1px solid ${colors.cardBorder}`,borderRadius:16,width:420,maxWidth:"90%",overflow:"hidden",boxShadow:"0 16px 48px rgba(0,0,0,0.35)",animation:"gmpSlideIn 0.25s ease" }}>
          <div style={{ padding:"1.25rem 1.5rem",borderBottom:`1px solid ${colors.cardBorder}`,background:colors.badgeBg,display:"flex",alignItems:"center",gap:"0.75rem" }}>
            <span style={{ fontSize:"1.6rem" }}>{failCount===0?"✅":"⚠️"}</span>
            <div>
              <div style={{ fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:colors.textTertiary }}>Bulk Deck</div>
              <div style={{ fontSize:"0.95rem",fontWeight:700,color:failCount===0?"#4CAF50":"#f59e0b" }}>{failCount===0?"Completed Successfully":"Completed with Errors"}</div>
            </div>
          </div>
          <div style={{ padding:"1.5rem",display:"flex",flexDirection:"column",gap:"1rem" }}>
            <div style={{ display:"flex",gap:"0.75rem" }}>
              <div style={{ flex:1,padding:"0.75rem",background:"rgba(76,175,80,0.08)",border:"1px solid rgba(76,175,80,0.25)",borderRadius:10,textAlign:"center" }}>
                <div style={{ fontSize:"1.6rem",fontWeight:800,color:"#4CAF50" }}>{successCount}</div>
                <div style={{ fontSize:"0.72rem",color:colors.textTertiary,marginTop:2 }}>Successfully decked</div>
              </div>
              {failCount>0 && (
                <div style={{ flex:1,padding:"0.75rem",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:10,textAlign:"center" }}>
                  <div style={{ fontSize:"1.6rem",fontWeight:800,color:"#ef4444" }}>{failCount}</div>
                  <div style={{ fontSize:"0.72rem",color:colors.textTertiary,marginTop:2 }}>Failed</div>
                </div>
              )}
            </div>
            {failCount>0 && (
              <div style={{ padding:"0.75rem 1rem",background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8 }}>
                <p style={{ margin:"0 0 4px",fontSize:"0.75rem",fontWeight:700,color:"#ef4444" }}>Failed DTNs:</p>
                <p style={{ margin:0,fontSize:"0.75rem",color:colors.textSecondary,wordBreak:"break-all" }}>{result.errors.join(", ")}</p>
              </div>
            )}
            <button onClick={onClose} style={{ padding:"0.65rem",borderRadius:8,border:"none",background:"linear-gradient(135deg,#4CAF50,#45a049)",color:"#fff",fontSize:"0.88rem",fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(76,175,80,0.35)" }}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form screen
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:9998,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)" }} />
      <style>{CSS}</style>
      <div style={{ position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem" }} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
        <div onClick={e=>e.stopPropagation()} style={{ background:colors.cardBg,border:`1px solid ${colors.cardBorder}`,borderRadius:16,width:"100%",maxWidth:560,maxHeight:"92vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.4)",animation:"gmpSlideIn 0.3s ease" }}>
          {/* Header */}
          <div style={{ padding:"1rem 1.25rem",borderBottom:`2px solid ${colors.cardBorder}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0 }}>
            <div>
              <h2 style={{ margin:0,fontSize:"1rem",fontWeight:700,color:colors.textPrimary }}>🎯 Deck Multiple Applications</h2>
              <p style={{ margin:"2px 0 0",fontSize:"0.72rem",color:colors.textTertiary }}>Decking <strong style={{ color:"#4CAF50" }}>{records.length}</strong> applications</p>
            </div>
            <button onClick={onClose} style={{ width:34,height:34,borderRadius:8,border:`1px solid ${colors.cardBorder}`,background:"transparent",color:colors.textTertiary,cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
          </div>
          {/* Progress */}
          {submitting && (
            <div style={{ padding:"0.6rem 1.25rem",background:colors.badgeBg,borderBottom:`1px solid ${colors.cardBorder}` }}>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:"0.78rem",color:colors.textSecondary,marginBottom:4 }}>
                <span>Processing…</span><span>{progress.current}/{progress.total}</span>
              </div>
              <div style={{ height:5,background:colors.cardBorder,borderRadius:99,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${progress.total?Math.round(progress.current/progress.total*100):0}%`,background:"#4CAF50",borderRadius:99,transition:"width 0.3s ease" }} />
              </div>
            </div>
          )}
          {/* Body */}
          <form onSubmit={handleFormSubmit} style={{ display:"flex",flexDirection:"column",flex:1,minHeight:0 }}>
            <div style={{ padding:"1.1rem 1.25rem",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:"1rem" }}>
              {/* Selected Applications — plain preview until evaluators are
                  checked, at which point the per-application assignment list
                  below takes over (same DTNs, now with an evaluator each). */}
              {!(needsEvaluator && checkedEvaluators.length > 0) && (
                <div>
                  <label style={lbl}>Selected Applications ({records.length})</label>
                  <div style={{ maxHeight:100,overflowY:"auto",background:colors.badgeBg,border:`1px solid ${colors.cardBorder}`,borderRadius:8,padding:"0.75rem" }}>
                    <div style={{ display:"flex",flexWrap:"wrap",gap:"0.5rem" }}>
                      {records.map(r => (
                        <span key={r.id} style={{ padding:"0.3rem 0.7rem",background:"#4CAF5020",color:"#4CAF50",borderRadius:6,fontSize:"0.78rem",fontWeight:600,border:"1px solid #4CAF5040",fontFamily:"ui-monospace,monospace" }}>{r.dtn}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {/* Decker */}
              <div>
                <label style={lbl}>Decker (You) <span style={{ color:"#4CAF50" }}>●</span></label>
                <input readOnly value={currentUser?.username ?? "—"} style={{ ...inp,background:colors.badgeBg,cursor:"not-allowed",fontWeight:600 }} />
              </div>
              {/* Action */}
              <div>
                <label style={lbl}>Action <span style={{ color:"#ef4444" }}>*</span></label>
                <select value={action} onChange={e=>setAction(e.target.value)} style={{ ...inp,cursor:"pointer" }}
                  onFocus={e=>{e.target.style.borderColor="#4CAF50";}} onBlur={e=>{e.target.style.borderColor=colors.inputBorder;}}>
                  <option value="">Select action…</option>
                  {ACTIONS.map(a=><option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              {/* Evaluator checklist */}
              {needsEvaluator && (
                <div>
                  <label style={lbl}>Assign Evaluators <span style={{ color:"#ef4444" }}>*</span>
                    <span style={{ marginLeft:6,fontSize:"0.68rem",fontWeight:500,color:"#4CAF50",background:"#4CAF5015",border:"1px solid #4CAF5030",padding:"0.1rem 0.45rem",borderRadius:4 }}>FGMP Evaluator Group</span>
                  </label>
                  {loadingUsers
                    ? <div style={{ ...inp,display:"flex",alignItems:"center",gap:8,color:colors.textTertiary }}><span style={{ display:"inline-block",width:14,height:14,border:"2px solid #4CAF5030",borderTopColor:"#4CAF50",borderRadius:"50%",animation:"gmpSpin 0.6s linear infinite" }} />Loading evaluators…</div>
                    : <EvaluatorChecklist evaluators={evaluators} checked={checkedEvaluators} onToggle={toggleEvaluator}
                        taskCounts={taskCounts} loadingCounts={loadingCounts} colors={colors} darkMode={darkMode} />
                  }
                  {!loadingUsers && evaluators.length===0 && <p style={{ fontSize:"0.7rem",color:"#ef4444",marginTop:4,marginBottom:0 }}>⚠️ No users found in FGMP Evaluator group.</p>}
                  {checkedEvaluators.length > 0 && (
                    <p style={{ fontSize:"0.68rem",color:colors.textTertiary,marginTop:6,marginBottom:0 }}>
                      💡 All evaluators are checked by default — {records.length} application{records.length!==1?"s":""} auto-split
                      evenly across {checkedEvaluators.length} of them as a preset. Uncheck anyone here, or edit any row below, to change it.
                    </p>
                  )}
                </div>
              )}
              {/* Per-application assignment preset */}
              {needsEvaluator && checkedEvaluators.length > 0 && (
                <div>
                  <label style={lbl}>Application Assignments ({records.length})</label>
                  <div style={{ maxHeight:220,overflowY:"auto",border:`1px solid ${colors.cardBorder}`,borderRadius:8 }}>
                    {records.map((r, i) => (
                      <div key={r.id} style={{
                        display:"flex", alignItems:"center", gap:8, padding:"0.45rem 0.7rem",
                        borderTop: i===0 ? "none" : `1px solid ${colors.cardBorder}`,
                        background: colors.cardBg,
                      }}>
                        <span style={{
                          fontFamily:"ui-monospace,monospace", fontSize:"0.74rem", fontWeight:700,
                          color:"#4CAF50", flex:"1 1 auto", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                        }}>{r.dtn}</span>
                        <select value={assignments[r.id] ?? ""} onChange={(e)=>handleAssignmentChange(r.id, e.target.value)}
                          style={{
                            flex:"0 0 auto", padding:"0.3rem 0.5rem", borderRadius:6, fontFamily:FONT,
                            border:`1px solid ${assignments[r.id] ? colors.inputBorder : "#ef4444"}`,
                            background:colors.inputBg, color:colors.textPrimary, fontSize:"0.76rem", cursor:"pointer",
                          }}>
                          <option value="">Unassigned</option>
                          {checkedEvaluators.map((name) => <option key={name} value={name}>{name}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Decker Remarks */}
              <div>
                <label style={lbl}>Decker Remarks</label>
                <textarea value={deckerRemarks} onChange={e=>setDeckerRemarks(e.target.value)} rows={2} placeholder="Enter any remarks…"
                  style={{ ...inp,resize:"vertical",fontFamily:FONT }}
                  onFocus={e=>{e.target.style.borderColor="#4CAF50";}} onBlur={e=>{e.target.style.borderColor=colors.inputBorder;}} />
              </div>
              {/* Doctrack Remarks */}
              {action && (
                <div>
                  <label style={{ ...lbl,display:"flex",alignItems:"center",flexWrap:"wrap",gap:8 }}>
                    <span>Doctrack Remarks {doctrackEnabled && <span style={{ color:"#ef4444" }}>*</span>}</span>
                    <span style={{ fontSize:"0.68rem",fontWeight:500,color:"#2196F3",background:"#2196F315",border:"1px solid #2196F330",padding:"0.1rem 0.45rem",borderRadius:4 }}>auto-filled</span>
                    <span onClick={()=>setDoctrackEnabled(p=>!p)} style={{ display:"inline-flex",alignItems:"center",gap:"0.35rem",fontSize:"0.65rem",fontWeight:600,cursor:"pointer",padding:"0.1rem 0.5rem 0.1rem 0.35rem",borderRadius:20,border:`1px solid ${doctrackEnabled?"#4CAF5050":"#ef444450"}`,background:doctrackEnabled?"#4CAF5015":"#ef444415",color:doctrackEnabled?"#4CAF50":"#ef4444",userSelect:"none" }}>
                      <span style={{ width:22,height:11,borderRadius:11,background:doctrackEnabled?"#4CAF50":"#ef4444",display:"inline-block",position:"relative",flexShrink:0 }}><span style={{ position:"absolute",top:2,left:doctrackEnabled?13:2,width:7,height:7,borderRadius:"50%",background:"#fff",transition:"left 0.2s" }} /></span>
                      {doctrackEnabled?"ON":"OFF"}
                    </span>
                    {!doctrackEnabled && <span style={{ fontSize:"0.62rem",color:"#f59e0b",fontWeight:400,textTransform:"none",letterSpacing:"normal" }}>⚠ FIS will NOT be updated</span>}
                  </label>
                  <textarea value={doctrackRemarks} onChange={e=>setDoctrackRemarks(e.target.value)} disabled={!doctrackEnabled} rows={2}
                    placeholder={doctrackEnabled?"Doctrack remarks for FIS…":"Doctrack disabled"}
                    style={{ ...inp,resize:"vertical",fontFamily:FONT,opacity:doctrackEnabled?1:0.45,cursor:doctrackEnabled?"text":"not-allowed" }}
                    onFocus={e=>{ if(doctrackEnabled) e.target.style.borderColor="#2196F3"; }}
                    onBlur={e=>{e.target.style.borderColor=colors.inputBorder;}} />
                </div>
              )}
              {error && <div style={{ padding:"8px 12px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:7,fontSize:"0.76rem",color:"#ef4444" }}>⚠️ {error}</div>}
              {/* Info */}
              {action && (
                <div style={{ padding:"0.75rem 1rem",background:"rgba(76,175,80,0.06)",border:"1px solid rgba(76,175,80,0.2)",borderRadius:8,fontSize:"0.78rem",color:colors.textSecondary,lineHeight:1.5 }}>
                  <strong style={{ color:"#4CAF50" }}>ℹ</strong>{" "}
                  {needsEvaluator
                    ? `${records.length*2} logs will be created — Decking (Completed) + Evaluator (In Progress) per record, split across ${checkedEvaluators.length || "the checked"} evaluator${checkedEvaluators.length!==1?"s":""}.`
                    : `${records.length} Decking logs will be created with action: "${action}".`}
                </div>
              )}
            </div>
            {/* Footer */}
            <div style={{ padding:"1rem 1.25rem",borderTop:`1px solid ${colors.cardBorder}`,display:"flex",gap:"0.75rem",justifyContent:"flex-end",flexShrink:0 }}>
              <button type="button" onClick={onClose} disabled={submitting} style={{ padding:"0.6rem 1.25rem",borderRadius:8,border:`1px solid ${colors.cardBorder}`,background:"transparent",color:colors.textSecondary,fontSize:"0.85rem",fontWeight:500,cursor:"pointer",fontFamily:FONT }}>Cancel</button>
              <button type="submit" disabled={isDisabled} style={{ padding:"0.6rem 1.5rem",borderRadius:8,border:"none",background:isDisabled?"#4CAF5080":"linear-gradient(135deg,#4CAF50,#45a049)",color:"#fff",fontSize:"0.85rem",fontWeight:700,cursor:isDisabled?"not-allowed":"pointer",fontFamily:FONT,display:"flex",alignItems:"center",gap:"0.5rem",boxShadow:isDisabled?"none":"0 2px 8px rgba(76,175,80,0.35)" }}>
                {submitting ? <><Spinner />Decking {progress.current}/{progress.total}…</> : `🎯 Deck ${records.length} Applications`}
              </button>
            </div>
          </form>
        </div>
      </div>
      {/* Confirmation modal */}
      {confirmOpen && (
        <div onClick={()=>setConfirmOpen(false)} style={{ position:"fixed",inset:0,zIndex:10000,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(2px)" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:colors.cardBg,border:`1px solid ${colors.cardBorder}`,borderRadius:16,padding:"2rem",width:420,maxWidth:"90%",boxShadow:"0 16px 48px rgba(0,0,0,0.35)",animation:"gmpSlideIn 0.25s ease" }}>
            <div style={{ fontSize:"2rem",textAlign:"center",marginBottom:"0.75rem" }}>🎯</div>
            <h3 style={{ margin:"0 0 0.5rem",color:colors.textPrimary,fontSize:"1.1rem",fontWeight:700,textAlign:"center" }}>Confirm Decking</h3>
            <p style={{ margin:"0 0 1rem",color:colors.textSecondary,fontSize:"0.85rem",lineHeight:1.6,textAlign:"center" }}>
              You are about to deck <strong style={{ color:"#4CAF50" }}>{records.length} application{records.length!==1?"s":""}</strong>.
            </p>
            {needsEvaluator && assignmentSummary.length > 0 && (
              <div style={{ margin:"0 0 1.25rem", display:"flex", flexDirection:"column", gap:6 }}>
                {assignmentSummary.map((s) => (
                  <div key={s.name} style={{
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                    padding:"0.4rem 0.7rem", borderRadius:7, background: darkMode ? "rgba(255,255,255,0.04)" : "#f8fafc",
                    fontSize:"0.8rem",
                  }}>
                    <span style={{ color:colors.textPrimary, fontWeight:600 }}>{s.name}</span>
                    <span style={{ color:"#4CAF50", fontWeight:700 }}>{s.count} application{s.count!==1?"s":""}</span>
                  </div>
                ))}
              </div>
            )}
            <p style={{ margin:"0 0 1.25rem",fontSize:"0.78rem",color:colors.textTertiary,textAlign:"center" }}>This action cannot be undone.</p>
            <div style={{ display:"flex",gap:"0.75rem",justifyContent:"center" }}>
              <button onClick={()=>setConfirmOpen(false)} style={{ padding:"0.55rem 1.25rem",borderRadius:8,border:`1px solid ${colors.cardBorder}`,background:"transparent",color:colors.textSecondary,fontSize:"0.85rem",cursor:"pointer",fontWeight:500 }}>Go Back</button>
              <button onClick={handleSubmit} style={{ padding:"0.55rem 1.5rem",borderRadius:8,border:"none",background:"#4CAF50",color:"#fff",fontSize:"0.85rem",fontWeight:700,cursor:"pointer",boxShadow:"0 2px 10px rgba(76,175,80,0.35)" }}>✓ Yes, Deck</button>
            </div>
          </div>
        </div>
      )}
      {/* Alert modal */}
      {alertModal && (
        <div onClick={()=>setAlertModal(null)} style={{ position:"fixed",inset:0,zIndex:10001,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(3px)" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:colors.cardBg,border:`1px solid ${colors.cardBorder}`,borderRadius:16,padding:"1.5rem",width:400,maxWidth:"90%",boxShadow:"0 16px 48px rgba(0,0,0,0.35)" }}>
            <p style={{ margin:"0 0 1rem",fontSize:"0.9rem",color:"#ef4444",lineHeight:1.6 }}>⚠️ {alertModal.message}</p>
            {alertModal.detail && <p style={{ margin:"0 0 1rem",fontSize:"0.78rem",color:colors.textSecondary }}>{alertModal.detail}</p>}
            <button onClick={()=>setAlertModal(null)} style={{ width:"100%",padding:"0.6rem",borderRadius:8,border:"none",background:"#ef4444",color:"#fff",fontSize:"0.85rem",fontWeight:700,cursor:"pointer" }}>Got it</button>
          </div>
        </div>
      )}
    </>
  );
}
