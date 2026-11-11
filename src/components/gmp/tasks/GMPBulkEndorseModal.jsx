// src/components/gmp/tasks/GMPBulkEndorseModal.jsx
// Bulk "Endorse Selected Applications" for the FGMP Tasks page.
// Mirrors GMPBulkDeckModal's flow — bulk Doctrack, then one advanceStep call
// per record (each is its own backend transaction, so a failure is isolated
// to that DTN). Works like the CPR bulk endorse: each tab offers a short list
// of actions (forward, or send back), one shared next-assignee for the whole
// batch (or several people at the Signature Facilitator step), and a result
// list at the end. No FDA Verification Portal connection.
import { useState, useEffect, useRef, useMemo } from "react";
import { getUsersByGroup, getUser } from "../../../api/auth";
import { createBulkDoctrackLogsByRsn } from "../../../api/doctrack";
import { advanceStep, updateGMPRecord, getGMPRecordLogs, getGMPLogSteps } from "../../../api/gmp";
import { FONT } from "../shared/constants";

// The Checker's "send it back without checking it" action. Same string the
// single-task screen (WorkflowModal) and the backend routing table use.
const CHECKER_RETURN_FOR_REVIEW_ACTION =
  "Return to evaluator for review (Not Checked, Doctrack Remarks Off)";

// Per-step config. Keyed by the step tab (= GMPApplicationLogs.application_step).
// Each entry lists the actions the bulk popup may offer. `action` must match a
// key in GMP_ACTION_ROUTES on the backend — the popup also asks the server
// (GET /gmp/log-steps) and only shows the ones it accepts, so a route removed
// on the backend can never be offered here. The FIRST action is the default
// (the forward action each tab had before the list existed).
//
// sendBack: true  -> goes backward; by default each application returns to
//                    whoever last held `assigneeLabel`'s step (same rule as the
//                    single-task screen), or the user can pick one person.
// multi: true     -> several people can be picked (Signature Facilitator step).
export const GMP_BULK_ENDORSE_CONFIG = {
  "Checker": {
    currentStep: "Checker",
    buttonLabel: "Endorse Selected",
    modalTitle: "Endorse Selected — Checker",
    actions: [
      {
        action: "Checked and returned to evaluator",
        label: "Checked — return to Evaluator",
        nextStep: "Evaluator",
        assigneeGroupId: 31,
        assigneeLabel: "Evaluator",
        sendBack: true,
        doctrackDefault: "Checked; Returned to Evaluator",
      },
      {
        action: CHECKER_RETURN_FOR_REVIEW_ACTION,
        label: "Return to Evaluator for review (not checked)",
        nextStep: "Evaluator",
        assigneeGroupId: 31,
        assigneeLabel: "Evaluator",
        sendBack: true,
        doctrackDefault: "Returned to FGMP Evaluator",
        doctrackOffByDefault: true,
        hint: "Nothing was checked, so Doctrack starts OFF. Turn it on only if FIS should be updated.",
      },
    ],
  },
  "QA Admin": {
    currentStep: "QA Admin",
    buttonLabel: "Endorse Selected",
    modalTitle: "Endorse Selected — QA Admin",
    actions: [
      {
        action: "Endorsed to LRD Chief Admin",
        label: "Endorse to LRD Chief Admin",
        nextStep: "LRD Chief Admin",
        assigneeGroupId: 17,
        assigneeLabel: "LRD Chief Admin",
        doctrackDefault: "Checked and Forwarded to LRD Admin",
      },
      {
        action: "Return to Evaluator",
        label: "Return to Evaluator",
        nextStep: "Evaluator",
        assigneeGroupId: 31,
        assigneeLabel: "Evaluator",
        sendBack: true,
        doctrackDefault: "Returned to FGMP Evaluator",
      },
    ],
  },
  "LRD Chief Admin": {
    currentStep: "LRD Chief Admin",
    buttonLabel: "Endorse Selected",
    modalTitle: "Endorse Selected — LRD Chief Admin",
    actions: [
      {
        action: "Forwarded to OD Receiving",
        label: "Sign and forward to OD Receiving",
        nextStep: "OD Receiving",
        assigneeGroupId: 18,
        assigneeLabel: "OD Receiving",
        authorityGroupId: 6,
        authorityLabel: "Decision Authority (Signer)",
        authorityNote: "For record-keeping in the Application Logs / Doctrack only — it does not change routing.",
        decisionValue: "Signed",
        doctrackDefault: "Signed by LRD Chief and forwarded to CDRR Director for signing",
      },
      {
        action: "Return to QA Admin",
        label: "Return to QA Admin",
        nextStep: "QA Admin",
        assigneeGroupId: 34,
        assigneeLabel: "QA Admin",
        sendBack: true,
        doctrackDefault: "Returned to FGMP QA Admin",
      },
    ],
  },
  "OD Receiving": {
    currentStep: "OD Receiving",
    buttonLabel: "Endorse Selected",
    modalTitle: "Endorse Selected — OD Receiving",
    actions: [
      {
        // Action text matches CPR's identical step exactly.
        action: "Endorsed to CDRR Director for signature",
        label: "Endorse to CDRR-OD Signature Facilitator",
        nextStep: "CDRR-OD Signature Facilitator",
        assigneeGroupId: 40,
        assigneeLabel: "CDRR-OD Signature Facilitator",
        multi: true,
        decisionValue: "For Signature",
        doctrackDefault: "Received by CDRR - OD; Forwarded to CDRR OIC - Director for Signature",
      },
      {
        action: "Return to LRD Chief Admin",
        label: "Return to LRD Chief Admin",
        nextStep: "LRD Chief Admin",
        assigneeGroupId: 17,
        assigneeLabel: "LRD Chief Admin",
        sendBack: true,
        doctrackDefault: "Returned to LRD Chief Admin",
      },
      {
        action: "Return to Evaluator",
        label: "Return to Evaluator",
        nextStep: "Evaluator",
        assigneeGroupId: 31,
        assigneeLabel: "Evaluator",
        sendBack: true,
        doctrackDefault: "Returned to FGMP Evaluator",
      },
    ],
  },
  "CDRR-OD Signature Facilitator": {
    currentStep: "CDRR-OD Signature Facilitator",
    buttonLabel: "Endorse Selected",
    modalTitle: "Endorse Selected — CDRR-OD Signature Facilitator",
    actions: [
      {
        action: "Endorsed to OD Releasing",
        label: "Endorse to OD Releasing",
        nextStep: "OD Releasing",
        assigneeGroupId: 19,
        assigneeLabel: "OD Releasing",
        doctrackDefault: "Signed by CDRR Director, forwarded to OD-Releasing",
      },
      {
        action: "Return to LRD Chief Admin",
        label: "Return to LRD Chief Admin",
        nextStep: "LRD Chief Admin",
        assigneeGroupId: 17,
        assigneeLabel: "LRD Chief Admin",
        sendBack: true,
        doctrackDefault: "Returned to LRD Chief Admin",
      },
    ],
  },
  "OD Releasing": {
    currentStep: "OD Releasing",
    buttonLabel: "Release (End Task)",
    modalTitle: "Release Selected — OD Releasing (End Task)",
    isEndTask: true,
    actions: [
      {
        action: "Scanned, Stamped and Forwarded to AFO Records",
        label: "Release (End Task)",
        nextNull: true,
        authorityGroupId: 7,
        authorityLabel: "Decision Authority (Signer)",
        decisionValue: "Signed",
        requiresSignedDate: true,
        completionStatus: "RELEASED",
        doctrackDefault: "",
      },
    ],
  },
};

const CSS = `
@keyframes gbeFade  { from{opacity:0} to{opacity:1} }
@keyframes gbeSlide { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
@keyframes gbeSpin  { to{transform:rotate(360deg)} }
`;

// Same blue and field styling as the CPR bulk popup (tasks/DataTable/BulkDeckModal.jsx)
const BLUE = "#2196F3";

const inp = (colors, highlight) => ({
  width: "100%",
  padding: "0.7rem 0.9rem",
  background: colors.inputBg,
  border: `1.5px solid ${highlight ? BLUE : colors.cardBorder}`,
  borderRadius: 8,
  color: highlight ? colors.textPrimary : colors.textTertiary,
  fontSize: "0.88rem",
  outline: "none",
  cursor: "pointer",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
  fontFamily: FONT,
});

const labelStyle = (colors) => ({
  display: "block",
  fontSize: "0.72rem",
  fontWeight: 700,
  color: colors.textPrimary,
  marginBottom: "0.4rem",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
});

const textareaStyle = (colors) => ({
  width: "100%",
  padding: "0.7rem 0.9rem",
  background: colors.inputBg,
  border: `1.5px solid ${colors.cardBorder}`,
  borderRadius: 8,
  color: colors.textPrimary,
  fontSize: "0.88rem",
  fontFamily: FONT,
  outline: "none",
  resize: "vertical",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
});

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
// Show a user the FGMP way: username, full name, alias — keyed on id.
function userLine(u) {
  if (!u) return "—";
  const name = displayName(u);
  return [u.username, name || null, u.alias ? `(${u.alias})` : null]
    .filter(Boolean).join(" · ");
}
// "username — First Last", the way the CPR popup lists people
const userOption = (u) => `${u.username}${displayName(u) ? ` — ${displayName(u)}` : ""}`;

export default function GMPBulkEndorseModal({ config, records, onClose, onSuccess, colors, darkMode }) {
  // ── Which actions to offer ─────────────────────────────────────────────────
  // The server says which actions it accepts at this step; only those are
  // shown. If the server can't be asked, show the configured list (the server
  // still rejects any invalid one, per record).
  const [serverActions, setServerActions] = useState(null); // null = loading, false = failed, [] = list
  useEffect(() => {
    let alive = true;
    getGMPLogSteps()
      .then((r) => {
        if (!alive) return;
        const step = (r?.steps ?? []).find((s) => s.label === config.currentStep);
        setServerActions(step ? (step.actions ?? []) : false);
      })
      .catch(() => { if (alive) setServerActions(false); });
    return () => { alive = false; };
  }, [config.currentStep]);

  const actions = useMemo(() => {
    if (!Array.isArray(serverActions)) return config.actions;
    return config.actions.filter((a) => serverActions.includes(a.action));
  }, [config.actions, serverActions]);

  // Like CPR: with several actions the dropdown starts empty ("Select
  // decision…") and nothing below it applies until one is chosen. With only
  // one action it is already selected.
  const [actionIdx, setActionIdx] = useState(config.actions.length > 1 ? -1 : 0);
  const act = actionIdx >= 0 ? (actions[actionIdx] ?? null) : null;
  // everything below reads the chosen action merged over the tab's settings
  const eff = useMemo(() => ({ ...config, ...(act ?? {}) }), [config, act]);

  const [assigneeUsers, setAssigneeUsers] = useState([]);
  const [assigneeId, setAssigneeId] = useState(null);
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  // for "send back" actions: "previous" = each application goes back to the
  // person who last held that step (auto, like CPR); "pick" = everyone goes to
  // one chosen person
  const [returnMode, setReturnMode] = useState("previous");

  const [authorityUsers, setAuthorityUsers] = useState([]);
  const [authorityId, setAuthorityId] = useState(null);
  const [loadingAuthority, setLoadingAuthority] = useState(false);

  const [signedDate, setSignedDate] = useState("");
  // free-text note saved on each application's log (CPR has the same box);
  // separate from the Doctrack text, which goes to FIS
  const [remarks, setRemarks] = useState("");
  const [doctrackEnabled, setDoctrackEnabled] = useState(!(act?.doctrackOffByDefault));
  const [doctrackRemarks, setDoctrackRemarks] = useState(act?.doctrackDefault ?? "");

  // If the server's answer changes which actions are offered, start the
  // choice over: one action left = selected, several = "Select decision…".
  const actionsKey = actions.map((a) => a.action).join("|");
  const lastActionsKey = useRef(actionsKey);
  useEffect(() => {
    if (lastActionsKey.current === actionsKey) return;
    lastActionsKey.current = actionsKey;
    const idx = actions.length === 1 ? 0 : -1;
    setActionIdx(idx);
    setDoctrackEnabled(!actions[idx]?.doctrackOffByDefault);
    setDoctrackRemarks(actions[idx]?.doctrackDefault ?? "");
  }, [actionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [screen, setScreen] = useState("form"); // "form" | "done"
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState(null); // { succeeded: [{dtn, to}], errors: [{dtn, reason}] }
  const [alert, setAlert] = useState("");
  const submittingRef = useRef(false);

  const currentUser = useMemo(() => { try { return getUser() || {}; } catch { return {}; } }, []);

  const needsAssignee = !eff.isEndTask && !!eff.assigneeGroupId;
  const isMulti = needsAssignee && !!eff.multi;
  const isSendBack = needsAssignee && !!eff.sendBack;
  const autoReturn = isSendBack && returnMode === "previous";
  const needsPick = needsAssignee && !isMulti && !autoReturn;
  const needsAuthority = !!eff.authorityGroupId;
  const needsSignedDate = !!eff.requiresSignedDate;

  // Picking a different action changes the target group, signer and Doctrack
  // text, so everything that depended on the old action starts over.
  const chooseAction = (i) => {
    if (i === actionIdx || submitting) return;
    const next = i >= 0 ? actions[i] : null;
    setActionIdx(i);
    setAssigneeId(null);
    setAssigneeIds([]);
    setReturnMode("previous");
    setAuthorityId(null);
    setDoctrackEnabled(!next?.doctrackOffByDefault);
    setDoctrackRemarks(next?.doctrackDefault ?? "");
    setAlert("");
  };

  useEffect(() => {
    if (!needsAssignee) return;
    let alive = true;
    setLoadingAssignees(true);
    getUsersByGroup(eff.assigneeGroupId)
      .then((u) => { if (alive) setAssigneeUsers(u || []); })
      .catch(() => { if (alive) setAssigneeUsers([]); })
      .finally(() => { if (alive) setLoadingAssignees(false); });
    return () => { alive = false; };
  }, [needsAssignee, eff.assigneeGroupId]);

  useEffect(() => {
    if (!needsAuthority) return;
    let alive = true;
    setLoadingAuthority(true);
    getUsersByGroup(eff.authorityGroupId)
      .then((u) => { if (alive) setAuthorityUsers(u || []); })
      .catch(() => { if (alive) setAuthorityUsers([]); })
      .finally(() => { if (alive) setLoadingAuthority(false); });
    return () => { alive = false; };
  }, [needsAuthority, eff.authorityGroupId]);

  // OD Releasing — the doctrack text is pre-filled from the signed date, but
  // stays manually editable: once the user changes it away from that
  // auto-built text, picking a different signed date won't stomp their edit.
  const lastAutoDoctrackRef = useRef("");
  useEffect(() => {
    if (!eff.isEndTask) return;
    const auto = buildOdReleasingDoctrack(signedDate);
    // read the previous auto text NOW: the state updater below can run later,
    // after the ref has already moved on to the new text
    const lastAuto = lastAutoDoctrackRef.current;
    setDoctrackRemarks((prev) => (prev === "" || prev === lastAuto ? auto : prev));
    lastAutoDoctrackRef.current = auto;
  }, [eff.isEndTask, signedDate]);

  // What is still missing. The Confirm button stays greyed out until this is
  // empty (the CPR popup works the same way).
  const problem = (() => {
    if (!act) return "Please select a decision.";
    if (isMulti && assigneeIds.length === 0) return `Select at least one person from the ${eff.assigneeLabel} group.`;
    if (needsPick && assigneeId == null) return `Select the ${eff.assigneeLabel}.`;
    if (needsAssignee && !loadingAssignees && assigneeUsers.length === 0) return `No ${eff.assigneeLabel} users found.`;
    if (needsAuthority && authorityId == null) return "Select the Decision Authority (signer).";
    if (needsSignedDate && !signedDate) return "Pick the signed date.";
    if (doctrackEnabled && !doctrackRemarks.trim())
      return "Doctrack Remarks are required. Turn the toggle off if FIS was updated manually.";
    return "";
  })();
  const isDisabled = submitting || !!problem;

  // Send back, "previous" mode: find who last held `eff.assigneeLabel` on each
  // application (latest log of that step, by del_index), and only accept them
  // if they are still active in the group — the same rule the single-task
  // screen uses to pre-fill the picker. A few applications are read at a time.
  const findPreviousHolders = async () => {
    const step = eff.assigneeLabel;
    const active = new Set(assigneeUsers.map((u) => u.id));
    const holders = new Map();   // gmp_record_id -> user id
    const failures = [];         // { dtn, reason }
    let next = 0;
    const worker = async () => {
      while (next < records.length) {
        const rec = records[next++];
        try {
          const logs = await getGMPRecordLogs(rec.gmp_record_id);
          const prev = (Array.isArray(logs) ? logs : [])
            .filter((l) => l.application_step === step && l.user_id != null)
            .sort((a, b) => (b.del_index ?? 0) - (a.del_index ?? 0))[0];
          if (prev && active.has(prev.user_id)) holders.set(rec.gmp_record_id, prev.user_id);
          else failures.push({
            dtn: rec.dtn,
            reason: prev
              ? `The last ${step} is no longer active in the group — pick a person instead.`
              : `No earlier ${step} found for this application — pick a person instead.`,
          });
        } catch {
          failures.push({ dtn: rec.dtn, reason: "Could not read the application log." });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(6, records.length) }, worker));
    return { holders, failures };
  };

  const run = async () => {
    if (submittingRef.current) return;
    if (problem) { setAlert(problem); return; }
    submittingRef.current = true;
    setSubmitting(true);
    setAlert("");
    setProgress({ current: 0, total: records.length });
    const succeeded = [];
    const errors = [];

    const authorityUser = needsAuthority ? authorityUsers.find((u) => u.id === authorityId) : null;
    const doctrackText = doctrackRemarks.trim();
    const nameOf = (id) => {
      const u = assigneeUsers.find((x) => x.id === id);
      return u ? userLine(u) : String(id);
    };

    try {
      // ── Step 0: who receives each application ──────────────────────────────
      let toProcess = records;
      let holders = null;
      if (autoReturn) {
        const found = await findPreviousHolders();
        holders = found.holders;
        errors.push(...found.failures);
        toProcess = records.filter((r) => holders.has(r.gmp_record_id));
      }
      if (toProcess.length === 0) {
        setResult({ succeeded, errors });
        setScreen("done");
        return;
      }
      setProgress({ current: 0, total: toProcess.length });

      // ── Step 1: Doctrack (bulk, one call) — only for applications that will move
      if (doctrackEnabled) {
        const entries = toProcess.map((r) => ({
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
      for (let i = 0; i < toProcess.length; i++) {
        const rec = toProcess[i];
        setProgress({ current: i + 1, total: toProcess.length });
        const nextAssigneeId = !needsAssignee || isMulti
          ? null
          : autoReturn ? holders.get(rec.gmp_record_id) : assigneeId;
        try {
          await advanceStep(rec.gmp_record_id, {
            current_step: eff.currentStep,
            action: eff.action,
            recommendation: "",
            remarks: remarks.trim(),
            doctrack_remarks: doctrackText,
            next_assignee_id: nextAssigneeId ?? null,
            // Several people at once (Signature Facilitator): one open log per
            // person, see next_assignee_ids on GMPAdvanceStepRequest.
            ...(isMulti ? { next_assignee_ids: assigneeIds } : {}),
            ...(eff.decisionValue ? { action_type: eff.decisionValue } : {}),
            ...(eff.completionStatus ? { completion_status: eff.completionStatus } : {}),
            ...(needsAuthority && authorityUser ? {
              decision_authority_id: authorityUser.id,
              decision_authority_name: fullNameOf(authorityUser),
            } : {}),
          });

          if (eff.isEndTask) {
            await updateGMPRecord(rec.gmp_record_id, {
              GMP_APP_STATUS: "RELEASED",
              ...(signedDate ? { GMP_RELEASED_DATE: signedDate } : {}),
              ...(eff.decisionValue ? { GMP_DECISION: eff.decisionValue } : {}),
            });
          }
          succeeded.push({
            dtn: rec.dtn,
            to: eff.isEndTask ? "Released"
              : isMulti ? assigneeIds.map(nameOf).join(", ")
              : nextAssigneeId != null ? nameOf(nextAssigneeId) : (eff.nextStep ?? ""),
          });
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

  const headBg = darkMode ? "#1a1a1a" : "#f6f8fd";
  const shell = (children) => (
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
          borderRadius: 16, width: 520, maxWidth: "94%", maxHeight: "90vh",
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 12px 40px rgba(0,0,0,0.3)", animation: "gbeSlide 0.25s ease",
          fontFamily: FONT,
        }}
      >
        {children}
      </div>
    </div>
  );

  const doneVerb = eff.isEndTask ? "Released" : isSendBack ? "Returned" : "Endorsed";

  // ── Done screen ───────────────────────────────────────────────────────────
  if (screen === "done") {
    const ok = result?.succeeded?.length ?? 0;
    const bad = result?.errors?.length ?? 0;
    return shell(
      <>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${colors.cardBorder}`, background: headBg, display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.6rem" }}>{bad === 0 ? "✅" : "⚠️"}</span>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.textTertiary }}>
              {eff.isEndTask ? "End Task" : "Bulk Action"}
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: bad === 0 ? "#10b981" : "#f59e0b" }}>
              {bad === 0 ? "Completed" : "Completed with errors"}
            </div>
          </div>
        </div>
        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto" }}>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div style={{ flex: 1, padding: "0.8rem", background: "rgba(16,185,129,0.09)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 10, textAlign: "center" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#10b981" }}>{ok}</div>
              <div style={{ fontSize: "0.72rem", color: colors.textTertiary, marginTop: 2 }}>{doneVerb}</div>
            </div>
            {bad > 0 && (
              <div style={{ flex: 1, padding: "0.8rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#ef4444" }}>{bad}</div>
                <div style={{ fontSize: "0.72rem", color: colors.textTertiary, marginTop: 2 }}>Failed</div>
              </div>
            )}
          </div>
          {ok > 0 && (
            <div style={{ padding: "0.75rem 1rem", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8 }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.74rem", fontWeight: 700, color: "#10b981" }}>{doneVerb}:</p>
              <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3, maxHeight: 160, overflowY: "auto" }}>
                {result.succeeded.map((s) => (
                  <li key={s.dtn} style={{ fontSize: "0.72rem", color: colors.textSecondary }}>
                    <strong style={{ fontFamily: "ui-monospace,monospace" }}>{s.dtn}</strong>{s.to ? <> → {s.to}</> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {bad > 0 && (
            <div style={{ padding: "0.75rem 1rem", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8 }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.74rem", fontWeight: 700, color: "#ef4444" }}>Not processed:</p>
              <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3, maxHeight: 160, overflowY: "auto" }}>
                {result.errors.map((e) => (
                  <li key={e.dtn} style={{ fontSize: "0.72rem", color: colors.textSecondary }}>
                    <strong style={{ fontFamily: "ui-monospace,monospace" }}>{e.dtn}</strong> — {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${colors.cardBorder}`, background: headBg, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "0.6rem 1.5rem", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700,
            border: "none", borderRadius: 8, cursor: "pointer",
            background: `linear-gradient(135deg,${BLUE},#1565c0)`, color: "#fff",
          }}>Done</button>
        </div>
      </>
    );
  }

  // ── Form screen (laid out like the CPR bulk popup) ─────────────────────────
  const accent = eff.isEndTask ? "#10b981" : BLUE;
  const title = eff.isEndTask
    ? "End Task — Mark as Completed"
    : actions.length > 1 || config.actions.length > 1
      ? `${config.currentStep} — Select Action`
      : `Endorse Selected Applications to ${eff.nextStep}`;
  const spinnerRow = (text) => (
    <div style={{
      padding: "0.75rem 1rem", background: colors.inputBg, border: `1px solid ${colors.cardBorder}`,
      borderRadius: 8, display: "flex", alignItems: "center", gap: "0.6rem",
      color: colors.textTertiary, fontSize: "0.85rem",
    }}>
      <span style={{
        display: "inline-block", width: 14, height: 14, border: `2px solid ${BLUE}30`,
        borderTopColor: BLUE, borderRadius: "50%", animation: "gbeSpin 0.6s linear infinite",
      }} />
      {text}
    </div>
  );
  const hintText = { fontSize: "0.68rem", color: colors.textTertiary, marginTop: "0.3rem", marginBottom: 0 };
  const redText = { fontSize: "0.68rem", color: "#ef4444", marginTop: "0.3rem", marginBottom: 0 };
  const linkBtn = {
    background: "none", border: "none", padding: 0, marginTop: 6, cursor: "pointer",
    fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: BLUE, textDecoration: "underline",
  };
  const focusBlue = (e) => { e.target.style.borderColor = BLUE; };
  const blurGrey = (e) => { e.target.style.borderColor = colors.cardBorder; };

  const userSelect = (users, value, onChange, emptyLabel) => (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} style={inp(colors, value != null)}>
      <option value="">{emptyLabel}</option>
      {users.map((u) => <option key={u.id} value={u.id}>{userOption(u)}</option>)}
    </select>
  );

  return shell(
    <>
      {/* Header */}
      <div style={{
        padding: "1.25rem 1.5rem", borderBottom: `1px solid ${colors.cardBorder}`, background: headBg,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.textTertiary, marginBottom: "0.2rem" }}>
            {eff.isEndTask ? "End Task" : "Bulk Action"}
          </div>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: colors.textPrimary, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.2rem" }}>{eff.isEndTask ? "✅" : "📋"}</span>
            {title}
          </h3>
        </div>
        <button onClick={() => { if (!submitting) onClose(); }} style={{
          background: "transparent", border: `1px solid ${colors.cardBorder}`, borderRadius: 6,
          color: colors.textTertiary, cursor: "pointer", width: 30, height: 30,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem",
        }}>✕</button>
      </div>

      {/* Scrollable body */}
      <div style={{ overflowY: "auto", flex: 1, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Count + move info */}
        <div style={{
          padding: "0.85rem 1rem",
          background: eff.isEndTask ? "rgba(16,185,129,0.06)" : "rgba(33,150,243,0.06)",
          border: `1px solid ${eff.isEndTask ? "rgba(16,185,129,0.2)" : "rgba(33,150,243,0.2)"}`,
          borderRadius: 10, display: "flex", alignItems: "center", gap: "0.75rem",
        }}>
          <span style={{ fontSize: "1.4rem" }}>{eff.isEndTask ? "✅" : "📦"}</span>
          <div>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: colors.textPrimary }}>
              {records.length} record{records.length !== 1 ? "s" : ""} selected
            </div>
            <div style={{ fontSize: "0.75rem", color: colors.textTertiary, marginTop: "0.1rem" }}>
              {eff.isEndTask ? (
                <>All will be marked as <strong style={{ color: "#10b981" }}>Completed</strong> from <strong>{config.currentStep}</strong></>
              ) : !act ? (
                <>Choose an action below to continue from <strong>{config.currentStep}</strong></>
              ) : isSendBack ? (
                <>All will be <strong style={{ color: "#f59e0b" }}>returned</strong> from <strong>{eff.currentStep}</strong> →{" "}
                  <strong style={{ color: "#10b981" }}>{autoReturn ? `previous ${eff.assigneeLabel} (auto)` : eff.assigneeLabel}</strong></>
              ) : (
                <>All will be endorsed from <strong>{eff.currentStep}</strong> → <strong style={{ color: BLUE }}>{eff.nextStep}</strong></>
              )}
            </div>
          </div>
        </div>

        {/* DTN list */}
        <div>
          <label style={{ ...labelStyle(colors), color: colors.textTertiary, marginBottom: "0.5rem" }}>
            📋 DTNs to be {eff.isEndTask ? "completed" : "processed"} ({records.length})
          </label>
          <div style={{ maxHeight: 160, overflowY: "auto", border: `1px solid ${colors.cardBorder}`, borderRadius: 8, background: colors.inputBg }}>
            {records.map((r, i) => (
              <div key={r.id ?? i} style={{
                display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.85rem",
                borderBottom: i < records.length - 1 ? `1px solid ${colors.cardBorder}` : "none",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: eff.isEndTask ? "#10b981" : "#7c3aed", flexShrink: 0 }} />
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>{r.dtn}</span>
              </div>
            ))}
          </div>
        </div>

        {!act && serverActions !== null && actions.length === 0 && (
          <div style={{ padding: "0.75rem 1rem", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "#ef4444", fontSize: "0.82rem" }}>
            ⚠️ The server does not allow a bulk action at the {config.currentStep} step.
          </div>
        )}

        {/* Action */}
        {actions.length >= 1 && (
          <div>
            <label style={labelStyle(colors)}>Action <span style={{ color: "#ef4444" }}>*</span></label>
            <select
              value={actionIdx >= 0 ? String(actionIdx) : ""}
              onChange={(e) => chooseAction(e.target.value === "" ? -1 : Number(e.target.value))}
              style={inp(colors, !!act)}
              onFocus={focusBlue}
              onBlur={(e) => { e.target.style.borderColor = act ? BLUE : colors.cardBorder; }}
            >
              {actions.length > 1 && <option value="">Select decision...</option>}
              {actions.map((a, i) => <option key={a.action} value={String(i)}>{a.label}</option>)}
            </select>
            {!act && <p style={redText}>⚠️ Please select a decision.</p>}
            {act?.hint && <p style={hintText}>💡 {act.hint}</p>}
          </div>
        )}

        {/* Remarks */}
        <div>
          <label style={labelStyle(colors)}>Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter your remarks and findings..."
            rows={3}
            style={textareaStyle(colors)}
            onFocus={focusBlue}
            onBlur={blurGrey}
          />
        </div>

        {/* Assignee */}
        {needsAssignee && (needsPick || isMulti) && (
          <div>
            <label style={{ ...labelStyle(colors), marginBottom: "0.5rem" }}>
              {isSendBack ? "Return to" : "Assign to"} {eff.assigneeLabel} <span style={{ color: "#ef4444" }}>*</span>
            </label>
            {loadingAssignees ? spinnerRow(`Loading ${eff.assigneeLabel} users...`)
              : assigneeUsers.length === 0 ? (
                <div style={{ padding: "0.75rem 1rem", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "#ef4444", fontSize: "0.82rem" }}>
                  ⚠️ No {eff.assigneeLabel} users found. Please contact your administrator.
                </div>
              ) : isMulti ? (
                <>
                  <div style={{
                    maxHeight: 160, overflowY: "auto",
                    border: `1.5px solid ${assigneeIds.length > 0 ? BLUE : colors.cardBorder}`,
                    borderRadius: 8, background: colors.inputBg,
                  }}>
                    {assigneeUsers.map((u) => {
                      const checked = assigneeIds.includes(u.id);
                      return (
                        <label key={u.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.85rem", cursor: "pointer", fontSize: "0.82rem", color: colors.textPrimary }}>
                          <input
                            type="checkbox" checked={checked}
                            onChange={() => setAssigneeIds((prev) => checked ? prev.filter((x) => x !== u.id) : [...prev, u.id])}
                            style={{ accentColor: BLUE }}
                          />
                          {userOption(u)}
                        </label>
                      );
                    })}
                  </div>
                  <p style={hintText}>Select one or more users. Whoever completes the task first will automatically close the other users' logs.</p>
                </>
              ) : (
                userSelect(assigneeUsers, assigneeId, setAssigneeId, `— Select ${eff.assigneeLabel} —`)
              )}
            {isSendBack && (
              <button type="button" style={linkBtn} onClick={() => { setReturnMode("previous"); setAssigneeId(null); }}>
                ↩ Use each record's previous {eff.assigneeLabel} instead (auto)
              </button>
            )}
          </div>
        )}

        {/* Auto-detect notice for returns */}
        {isSendBack && autoReturn && (
          <div style={{
            padding: "0.75rem 1rem", background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: 8, fontSize: "0.78rem", color: colors.textSecondary, lineHeight: 1.6,
          }}>
            <strong style={{ color: "#059669" }}>↩ Auto-detected:</strong> each record returns to its own previous{" "}
            <strong>{eff.assigneeLabel}</strong>, found from its log. A record whose previous holder is no longer active in the group is
            skipped and listed as failed.
            <div>
              <button type="button" style={linkBtn} onClick={() => setReturnMode("pick")}>Choose one person for all instead</button>
            </div>
          </div>
        )}

        {/* Signer */}
        {needsAuthority && (
          <div>
            <label style={labelStyle(colors)}>{eff.authorityLabel} <span style={{ color: "#ef4444" }}>*</span></label>
            {loadingAuthority ? spinnerRow("Loading users...")
              : userSelect(authorityUsers, authorityId, setAuthorityId, "— Select Decision Authority —")}
            {eff.authorityNote && <p style={hintText}>ℹ️ {eff.authorityNote}</p>}
          </div>
        )}

        {needsSignedDate && (
          <div>
            <label style={labelStyle(colors)}>Signed Date <span style={{ color: "#ef4444" }}>*</span></label>
            <input type="date" value={signedDate} onChange={(e) => setSignedDate(e.target.value)} style={inp(colors, !!signedDate)} />
          </div>
        )}

        {/* Doctrack */}
        <div>
          <label style={{ ...labelStyle(colors), display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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
            disabled={!doctrackEnabled}
            rows={2}
            style={{ ...textareaStyle(colors), opacity: !doctrackEnabled ? 0.55 : 1 }}
            onFocus={focusBlue}
            onBlur={blurGrey}
          />
          {eff.isEndTask && <p style={hintText}>Pre-filled from the signed date — edit freely if needed.</p>}
          {!doctrackEnabled && <p style={{ ...hintText, color: "#f59e0b" }}>⚠ FIS will NOT be updated for any of the selected DTNs.</p>}
        </div>

        {alert && (
          <div style={{ padding: "0.75rem 1rem", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: "0.8rem", color: "#ef4444" }}>
            ⚠️ {alert}
          </div>
        )}

        {/* Note */}
        <div style={{
          padding: "0.75rem 1rem",
          background: eff.isEndTask ? "rgba(16,185,129,0.07)" : "rgba(245,158,11,0.07)",
          border: `1px solid ${eff.isEndTask ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"}`,
          borderRadius: 8, fontSize: "0.78rem", color: colors.textSecondary, lineHeight: 1.6,
        }}>
          {eff.isEndTask ? (
            <><strong style={{ color: "#059669" }}>✅ Note:</strong> This will mark the <strong>{config.currentStep}</strong> log as <strong>Completed</strong> for each selected record. This action cannot be undone.</>
          ) : isSendBack ? (
            <><strong style={{ color: "#b45309" }}>⚠ Note:</strong> This will complete the current <strong>{config.currentStep}</strong> log and return each record to its <strong>{autoReturn ? `previous ${eff.assigneeLabel}` : eff.assigneeLabel}</strong>. This action cannot be undone.</>
          ) : (
            <><strong style={{ color: "#b45309" }}>⚠ Note:</strong> This will complete the current <strong>{config.currentStep}</strong> log for each selected record and create a new <strong>{act ? eff.nextStep : "next-step"}</strong> log assigned to the selected {isMulti ? "users" : "user"}. This action cannot be undone.</>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "1rem 1.5rem", borderTop: `1px solid ${colors.cardBorder}`, background: headBg,
        display: "flex", gap: "0.75rem", justifyContent: "flex-end", flexShrink: 0,
      }}>
        <button onClick={onClose} disabled={submitting} style={{
          padding: "0.6rem 1.25rem", borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
          background: "transparent", color: colors.textSecondary, fontSize: "0.85rem", fontWeight: 500, cursor: "pointer", fontFamily: FONT,
        }}>Cancel</button>
        <button onClick={run} disabled={isDisabled} style={{
          padding: "0.6rem 1.5rem", borderRadius: 8, border: "none", fontFamily: FONT,
          background: isDisabled
            ? (eff.isEndTask ? "rgba(16,185,129,0.4)" : "rgba(33,150,243,0.4)")
            : (eff.isEndTask ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#2196F3,#1565c0)"),
          color: "#fff", fontSize: "0.85rem", fontWeight: 700,
          cursor: isDisabled ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", gap: "0.5rem",
          boxShadow: isDisabled ? "none" : `0 2px 8px ${accent === "#10b981" ? "rgba(16,185,129,0.35)" : "rgba(33,150,243,0.35)"}`,
          transition: "all 0.2s",
        }}>
          {submitting ? <><Spinner /> Processing… {progress.current}/{progress.total}</>
            : eff.isEndTask ? <>✅ Confirm End Task ({records.length})</>
            : <>📋 Confirm ({records.length})</>}
        </button>
      </div>
    </>
  );
}
