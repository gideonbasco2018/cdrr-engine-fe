// src/components/gmp/tasks/GMPBulkEndorseModal.jsx
// Bulk "Endorse Selected Applications" for the FGMP Tasks page.
// Mirrors GMPBulkDeckModal's flow — bulk Doctrack, then one advanceStep call
// per record (each is its own backend transaction, so a failure is isolated
// to that DTN). One shared next-assignee for the whole batch, like the CPR
// bulk endorse. No FDA Verification Portal connection.
import { useState, useEffect, useRef, useMemo } from "react";
import { getUsersByGroup, getUser } from "../../../api/auth";
import { createBulkDoctrackLogsByRsn } from "../../../api/doctrack";
import { advanceStep, updateGMPRecord } from "../../../api/gmp";
import { FONT } from "../shared/constants";

// Per-step config. Keyed by the step tab (= GMPApplicationLogs.application_step).
// `action` must match a key in GMP_ACTION_ROUTES on the backend.
export const GMP_BULK_ENDORSE_CONFIG = {
  "Checker": {
    currentStep: "Checker",
    buttonLabel: "Endorse to Evaluator",
    modalTitle: "Endorse Selected — Checker → Evaluator",
    action: "Endorsed to Evaluator",
    nextStep: "Evaluator",
    assigneeGroupId: 31,
    assigneeLabel: "Evaluator",
    doctrackDefault: "Checked; Returned to Evaluator",
  },
  "QA Admin": {
    currentStep: "QA Admin",
    buttonLabel: "Endorse to LRD Chief Admin",
    modalTitle: "Endorse Selected — QA Admin → LRD Chief Admin",
    action: "Endorsed to LRD Chief Admin",
    nextStep: "LRD Chief Admin",
    assigneeGroupId: 17,
    assigneeLabel: "LRD Chief Admin",
    doctrackDefault: "Checked and Forwarded to LRD Admin",
  },
  "LRD Chief Admin": {
    currentStep: "LRD Chief Admin",
    buttonLabel: "Endorse to OD Receiving",
    modalTitle: "Endorse Selected — LRD Chief Admin → OD Receiving",
    action: "Forwarded to OD Receiving",
    nextStep: "OD Receiving",
    assigneeGroupId: 18,
    assigneeLabel: "OD Receiving",
    authorityGroupId: 6,
    authorityLabel: "Decision Authority (Signer)",
    authorityNote: "For record-keeping in the Application Logs / Doctrack only — it does not change routing.",
    decisionValue: "Signed",
    doctrackDefault: "Signed by LRD Chief and forwarded to CDRR Director for signing",
  },
  "OD Receiving": {
    currentStep: "OD Receiving",
    buttonLabel: "Endorse to OD Releasing",
    modalTitle: "Endorse Selected — OD Receiving → OD Releasing",
    action: "Endorsed to OD - Releasing",
    nextStep: "OD Releasing",
    assigneeGroupId: 19,
    assigneeLabel: "OD Releasing",
    decisionValue: "For Signature",
    doctrackDefault: "Received by CDRR - OD; Forwarded to CDRR OIC - Director for Signature",
  },
  "OD Releasing": {
    currentStep: "OD Releasing",
    buttonLabel: "Release (End Task)",
    modalTitle: "Release Selected — OD Releasing (End Task)",
    action: "Scanned, Stamped and Forwarded to AFO Records",
    nextStep: null,
    isEndTask: true,
    authorityGroupId: 7,
    authorityLabel: "Decision Authority (Signer)",
    decisionValue: "Signed",
    requiresSignedDate: true,
    completionStatus: "RELEASED",
  },
};

const CSS = `
@keyframes gbeFade  { from{opacity:0} to{opacity:1} }
@keyframes gbeSlide { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
@keyframes gbeSpin  { to{transform:rotate(360deg)} }
`;

function Spinner({ size = 13 }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff",
      borderRadius: "50%", animation: "gbeSpin 0.6s linear infinite",
    }} />
  );
}

function fmtSignedDate(iso) {
  if (!iso) return "";
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return iso; }
}
function buildOdReleasingDoctrack(iso) {
  const d = fmtSignedDate(iso);
  return `Signed${d ? ` (${d})` : ""} by CDRR-OIC Director; Scanned, Stamped and Forwarded to AFO Records`;
}
function displayName(u) {
  return `${u.first_name ?? ""} ${u.surname ?? u.last_name ?? ""}`.trim();
}
function fullNameOf(u) {
  return u.first_name && (u.surname || u.last_name)
    ? `${u.first_name} ${u.surname ?? u.last_name}`
    : u.username;
}

// ── Searchable single-select user list ──────────────────────────────────────
function UserPicker({ users, value, onChange, loading, placeholder, colors, darkMode }) {
  const [search, setSearch] = useState("");
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.username.toLowerCase().includes(q) || displayName(u).toLowerCase().includes(q);
  });
  return (
    <div style={{
      border: `1px solid ${colors.inputBorder}`, borderRadius: 8,
      background: colors.inputBg, overflow: "hidden",
    }}>
      <div style={{ padding: "0.4rem" }}>
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          style={{
            width: "100%", padding: "0.4rem 0.65rem", borderRadius: 6, fontFamily: FONT,
            border: `1px solid ${colors.inputBorder}`, background: colors.cardBg,
            color: colors.textPrimary, fontSize: "0.8rem", outline: "none", boxSizing: "border-box",
          }}
        />
      </div>
      <div style={{ maxHeight: 190, overflowY: "auto", borderTop: `1px solid ${colors.cardBorder}` }}>
        {loading ? (
          <div style={{ padding: "0.7rem 1rem", fontSize: "0.8rem", color: colors.textTertiary }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "0.7rem 1rem", fontSize: "0.8rem", color: colors.textTertiary }}>
            {placeholder || "No users found."}
          </div>
        ) : filtered.map((u) => {
          const isSel = value === u.username;
          return (
            <div
              key={u.id} onClick={() => onChange(u.username)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "0.5rem 0.9rem",
                cursor: "pointer",
                background: isSel ? "rgba(16,185,129,0.1)" : "transparent",
                borderLeft: isSel ? "3px solid #10b981" : "3px solid transparent",
              }}
              onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)"; }}
              onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{
                width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                border: `1.5px solid ${isSel ? "#10b981" : colors.inputBorder}`,
                background: isSel ? "#10b981" : "transparent",
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: colors.textPrimary }}>{u.username}</div>
                <div style={{ fontSize: "0.72rem", color: colors.textTertiary }}>{displayName(u)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GMPBulkEndorseModal({ config, records, onClose, onSuccess, colors, darkMode }) {
  const [assigneeUsers, setAssigneeUsers] = useState([]);
  const [assignee, setAssignee] = useState("");
  const [loadingAssignees, setLoadingAssignees] = useState(false);

  const [authorityUsers, setAuthorityUsers] = useState([]);
  const [authority, setAuthority] = useState("");
  const [loadingAuthority, setLoadingAuthority] = useState(false);

  const [signedDate, setSignedDate] = useState("");
  const [doctrackEnabled, setDoctrackEnabled] = useState(true);
  const [doctrackRemarks, setDoctrackRemarks] = useState(config.doctrackDefault ?? "");

  const [screen, setScreen] = useState("form"); // "form" | "confirm" | "done"
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState(null); // { succeeded: [], errors: [] }
  const [alert, setAlert] = useState("");
  const submittingRef = useRef(false);

  const currentUser = useMemo(() => { try { return getUser() || {}; } catch { return {}; } }, []);

  const needsAssignee = !config.isEndTask && !!config.assigneeGroupId;
  const needsAuthority = !!config.authorityGroupId;
  const needsSignedDate = !!config.requiresSignedDate;

  useEffect(() => {
    if (!needsAssignee) return;
    let alive = true;
    setLoadingAssignees(true);
    getUsersByGroup(config.assigneeGroupId)
      .then((u) => { if (alive) setAssigneeUsers(u || []); })
      .catch(() => { if (alive) setAssigneeUsers([]); })
      .finally(() => { if (alive) setLoadingAssignees(false); });
    return () => { alive = false; };
  }, [needsAssignee, config.assigneeGroupId]);

  useEffect(() => {
    if (!needsAuthority) return;
    let alive = true;
    setLoadingAuthority(true);
    getUsersByGroup(config.authorityGroupId)
      .then((u) => { if (alive) setAuthorityUsers(u || []); })
      .catch(() => { if (alive) setAuthorityUsers([]); })
      .finally(() => { if (alive) setLoadingAuthority(false); });
    return () => { alive = false; };
  }, [needsAuthority, config.authorityGroupId]);

  // OD Releasing — the doctrack text is built from the signed date.
  useEffect(() => {
    if (config.isEndTask) setDoctrackRemarks(buildOdReleasingDoctrack(signedDate));
  }, [config.isEndTask, signedDate]);

  const goConfirm = () => {
    setAlert("");
    if (needsAssignee && !assignee) return setAlert(`Select the ${config.assigneeLabel} to endorse to.`);
    if (needsAuthority && !authority) return setAlert("Select the Decision Authority (signer).");
    if (needsSignedDate && !signedDate) return setAlert("Pick the signed date.");
    if (doctrackEnabled && !doctrackRemarks.trim())
      return setAlert("Doctrack Remarks are required. Turn the toggle off if FIS was updated manually.");
    setScreen("confirm");
  };

  const run = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setAlert("");
    setProgress({ current: 0, total: records.length });
    const succeeded = [];
    const errors = [];

    const assigneeUser = needsAssignee ? assigneeUsers.find((u) => u.username === assignee) : null;
    const authorityUser = needsAuthority ? authorityUsers.find((u) => u.username === authority) : null;
    const doctrackText = doctrackRemarks.trim();

    try {
      // ── Step 1: Doctrack (bulk, one call) ──────────────────────────────────
      if (doctrackEnabled) {
        const entries = records.map((r) => ({
          rsn: String(r.dtn), remarks: doctrackText, userID: currentUser?.id ?? null,
        }));
        let dt = null;
        try { dt = await createBulkDoctrackLogsByRsn(entries, currentUser?.alias ?? ""); }
        catch (e) {
          setAlert(`Doctrack failed: ${e?.message ?? "no response"}. No applications were endorsed.`);
          setScreen("form"); return;
        }
        if (!dt) {
          setAlert("Doctrack failed: no response from server. No applications were endorsed.");
          setScreen("form"); return;
        }
      }

      // ── Step 2: advanceStep per record ────────────────────────────────────
      for (let i = 0; i < records.length; i++) {
        const rec = records[i];
        setProgress({ current: i + 1, total: records.length });
        try {
          await advanceStep(rec.gmp_record_id, {
            current_step: config.currentStep,
            action: config.action,
            recommendation: "",
            remarks: "",
            doctrack_remarks: doctrackText,
            next_assignee_name: assigneeUser?.username ?? null,
            next_assignee_id: assigneeUser?.id ?? null,
            ...(config.decisionValue ? { action_type: config.decisionValue } : {}),
            ...(config.completionStatus ? { completion_status: config.completionStatus } : {}),
            ...(needsAuthority && authorityUser ? {
              decision_authority_id: authorityUser.id,
              decision_authority_name: fullNameOf(authorityUser),
            } : {}),
          });

          if (config.isEndTask) {
            await updateGMPRecord(rec.gmp_record_id, {
              GMP_APP_STATUS: "RELEASED",
              ...(signedDate ? { GMP_RELEASED_DATE: signedDate } : {}),
              ...(config.decisionValue ? { GMP_DECISION: config.decisionValue } : {}),
            });
          }
          succeeded.push(rec.dtn);
        } catch (e) {
          console.error(`Bulk endorse failed for DTN ${rec.dtn}:`, e);
          errors.push({ dtn: rec.dtn, reason: e?.response?.data?.detail ?? e?.message ?? "Advance failed." });
        }
      }

      setResult({ succeeded, errors });
      setScreen("done");
      await onSuccess?.();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const shell = (children, width = 480) => (
    <div
      onClick={() => { if (!submitting) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 10001, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, backdropFilter: "blur(4px)", animation: "gbeFade 0.15s ease",
      }}
    >
      <style>{CSS}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg, border: `1px solid ${colors.cardBorder}`,
          borderRadius: 16, width, maxWidth: "100%", maxHeight: "90vh",
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 20px 56px rgba(0,0,0,0.4)", animation: "gbeSlide 0.25s ease",
          fontFamily: FONT,
        }}
      >
        {children}
      </div>
    </div>
  );

  // ── Done screen ───────────────────────────────────────────────────────────
  if (screen === "done") {
    const ok = result?.succeeded?.length ?? 0;
    const bad = result?.errors?.length ?? 0;
    return shell(
      <>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${colors.cardBorder}`, background: colors.badgeBg, display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.6rem" }}>{bad === 0 ? "✅" : "⚠️"}</span>
          <div>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.textTertiary }}>
              {config.isEndTask ? "Release" : "Bulk Endorse"}
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: bad === 0 ? "#10b981" : "#f59e0b" }}>
              {bad === 0 ? "Completed" : "Completed with errors"}
            </div>
          </div>
        </div>
        <div style={{ padding: "1.4rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto" }}>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div style={{ flex: 1, padding: "0.8rem", background: "rgba(16,185,129,0.09)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 10, textAlign: "center" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#10b981" }}>{ok}</div>
              <div style={{ fontSize: "0.72rem", color: colors.textTertiary, marginTop: 2 }}>{config.isEndTask ? "Released" : "Endorsed"}</div>
            </div>
            {bad > 0 && (
              <div style={{ flex: 1, padding: "0.8rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#ef4444" }}>{bad}</div>
                <div style={{ fontSize: "0.72rem", color: colors.textTertiary, marginTop: 2 }}>Failed</div>
              </div>
            )}
          </div>
          {bad > 0 && (
            <div style={{ padding: "0.75rem 1rem", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8 }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.74rem", fontWeight: 700, color: "#ef4444" }}>Not processed:</p>
              <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
                {result.errors.map((e) => (
                  <li key={e.dtn} style={{ fontSize: "0.72rem", color: colors.textSecondary }}>
                    <strong style={{ fontFamily: "ui-monospace,monospace" }}>{e.dtn}</strong> — {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${colors.cardBorder}`, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "8px 22px", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700,
            border: "none", borderRadius: 8, cursor: "pointer",
            background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff",
          }}>Done</button>
        </div>
      </>
    );
  }

  // ── Confirm screen ────────────────────────────────────────────────────────
  if (screen === "confirm") {
    return shell(
      <>
        <div style={{ padding: "1.1rem 1.5rem", borderBottom: `1px solid ${colors.cardBorder}` }}>
          <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: colors.textPrimary }}>Confirm</h2>
        </div>
        <div style={{ padding: "1.3rem 1.5rem", display: "flex", flexDirection: "column", gap: 12, fontSize: "0.85rem", color: colors.textSecondary }}>
          <p style={{ margin: 0 }}>
            {config.isEndTask
              ? <>Release <strong>{records.length}</strong> application{records.length > 1 ? "s" : ""} — marks each <strong>RELEASED</strong> and closes the task.</>
              : <>Endorse <strong>{records.length}</strong> application{records.length > 1 ? "s" : ""} from <strong>{config.currentStep}</strong> to <strong>{config.nextStep}</strong>{assignee ? <>, assigned to <strong>{assignee}</strong></> : null}.</>}
          </p>
          {needsAuthority && authority && (
            <p style={{ margin: 0 }}>Signer recorded: <strong>{authority}</strong>.</p>
          )}
          <p style={{ margin: 0 }}>
            Doctrack: {doctrackEnabled ? <>ON — “{doctrackRemarks.trim()}” pushed to FIS for each DTN.</> : <span style={{ color: "#f59e0b" }}>OFF — FIS will not be updated.</span>}
          </p>
          <p style={{ margin: 0, fontSize: "0.78rem", color: colors.textTertiary }}>
            Each application is processed on its own — if one fails, the rest still go through.
          </p>
        </div>
        <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${colors.cardBorder}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={() => setScreen("form")} disabled={submitting} style={{
            padding: "8px 18px", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 600,
            border: `1px solid ${colors.cardBorder}`, borderRadius: 8, background: "transparent",
            color: colors.textTertiary, cursor: "pointer",
          }}>Back</button>
          <button onClick={run} disabled={submitting} style={{
            padding: "8px 22px", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700,
            border: "none", borderRadius: 8, cursor: submitting ? "not-allowed" : "pointer",
            background: submitting ? "#6ee7d3" : "linear-gradient(135deg,#10b981,#059669)", color: "#fff",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {submitting ? <><Spinner /> {progress.current}/{progress.total}</> : (config.isEndTask ? "Release" : "Endorse")}
          </button>
        </div>
      </>
    );
  }

  // ── Form screen ───────────────────────────────────────────────────────────
  const label = {
    display: "block", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.05em", color: colors.textPrimary, marginBottom: "0.4rem",
  };
  const inp = {
    width: "100%", padding: "0.55rem 0.75rem", fontFamily: FONT, fontSize: "0.82rem",
    background: colors.inputBg, border: `1px solid ${colors.inputBorder}`,
    borderRadius: 8, color: colors.textPrimary, outline: "none", boxSizing: "border-box",
  };

  return shell(
    <>
      <div style={{ padding: "1.1rem 1.5rem", borderBottom: `1px solid ${colors.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: colors.textPrimary }}>{config.modalTitle}</h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: colors.textTertiary }}>
            {records.length} application{records.length > 1 ? "s" : ""} selected
          </p>
        </div>
        <button onClick={onClose} style={{
          width: 30, height: 30, borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
          background: "transparent", color: colors.textTertiary, cursor: "pointer", fontSize: "0.9rem",
        }}>✕</button>
      </div>

      <div style={{ padding: "1.3rem 1.5rem", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
        {/* DTN chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {records.slice(0, 40).map((r) => (
            <span key={r.id} style={{
              fontFamily: "ui-monospace,monospace", fontSize: "0.7rem", fontWeight: 600,
              padding: "2px 7px", borderRadius: 5, background: "rgba(16,185,129,0.12)", color: "#0f766e",
            }}>{r.dtn}</span>
          ))}
          {records.length > 40 && (
            <span style={{ fontSize: "0.7rem", color: colors.textTertiary }}>+{records.length - 40} more</span>
          )}
        </div>

        {needsAssignee && (
          <div>
            <label style={label}>Assign to {config.assigneeLabel} <span style={{ color: "#ef4444" }}>*</span></label>
            <UserPicker
              users={assigneeUsers} value={assignee} onChange={setAssignee}
              loading={loadingAssignees}
              placeholder={`No users in the ${config.assigneeLabel} group.`}
              colors={colors} darkMode={darkMode}
            />
          </div>
        )}

        {needsAuthority && (
          <div>
            <label style={label}>{config.authorityLabel} <span style={{ color: "#ef4444" }}>*</span></label>
            <UserPicker
              users={authorityUsers} value={authority} onChange={setAuthority}
              loading={loadingAuthority}
              placeholder="No authority users found."
              colors={colors} darkMode={darkMode}
            />
            {config.authorityNote && (
              <p style={{ margin: "5px 0 0", fontSize: "0.68rem", color: colors.textTertiary }}>💡 {config.authorityNote}</p>
            )}
          </div>
        )}

        {needsSignedDate && (
          <div>
            <label style={label}>Signed Date <span style={{ color: "#ef4444" }}>*</span></label>
            <input type="date" value={signedDate} onChange={(e) => setSignedDate(e.target.value)} style={inp} />
          </div>
        )}

        <div>
          <label style={{ ...label, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span>Doctrack Remarks {doctrackEnabled && <span style={{ color: "#ef4444" }}>*</span>}</span>
            <span
              onClick={() => setDoctrackEnabled((v) => !v)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.64rem",
                fontWeight: 700, cursor: "pointer", padding: "0.1rem 0.5rem 0.1rem 0.35rem", borderRadius: 20,
                border: `1px solid ${doctrackEnabled ? "#10b98150" : "#ef444450"}`,
                background: doctrackEnabled ? "#10b98115" : "#ef444415",
                color: doctrackEnabled ? "#10b981" : "#ef4444",
                textTransform: "none", letterSpacing: "normal",
              }}
            >
              <span style={{ width: 20, height: 10, borderRadius: 10, background: doctrackEnabled ? "#10b981" : "#ef4444", position: "relative", flexShrink: 0 }}>
                <span style={{ position: "absolute", top: 2, left: doctrackEnabled ? 12 : 2, width: 6, height: 6, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
              </span>
              {doctrackEnabled ? "ON" : "OFF"}
            </span>
          </label>
          <textarea
            value={doctrackRemarks}
            onChange={(e) => setDoctrackRemarks(e.target.value)}
            disabled={!doctrackEnabled || config.isEndTask}
            rows={2}
            style={{ ...inp, resize: "vertical", opacity: (!doctrackEnabled || config.isEndTask) ? 0.55 : 1, cursor: config.isEndTask ? "not-allowed" : "text" }}
          />
          {config.isEndTask && (
            <p style={{ margin: "4px 0 0", fontSize: "0.66rem", color: colors.textTertiary }}>Built automatically from the signed date.</p>
          )}
          {!doctrackEnabled && (
            <p style={{ margin: "4px 0 0", fontSize: "0.66rem", color: "#f59e0b" }}>⚠ FIS will NOT be updated for any of the selected DTNs.</p>
          )}
        </div>

        {alert && (
          <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: "0.76rem", color: "#ef4444" }}>
            ⚠️ {alert}
          </div>
        )}
      </div>

      <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${colors.cardBorder}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose} style={{
          padding: "8px 18px", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 600,
          border: `1px solid ${colors.cardBorder}`, borderRadius: 8, background: "transparent",
          color: colors.textTertiary, cursor: "pointer",
        }}>Cancel</button>
        <button onClick={goConfirm} style={{
          padding: "8px 22px", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700,
          border: "none", borderRadius: 8, cursor: "pointer",
          background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff",
        }}>
          {config.isEndTask ? "Review Release" : "Review Endorsement"}
        </button>
      </div>
    </>
  );
}
