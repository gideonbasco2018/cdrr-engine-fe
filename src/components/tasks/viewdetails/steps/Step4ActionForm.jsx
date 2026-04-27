import { useState, useEffect } from "react";
import { getUsersByGroup, getUser } from "../../../../api/auth";
import {
  createApplicationLog,
  updateApplicationLog,
  getLastApplicationLogIndex,
  getApplicationLogs,
} from "../../../../api/application-logs";
import {
  createFieldAuditLog,
  computeFieldChanges,
} from "../../../../api/field-audit-logs";
import { updateUploadReport, getUploadReport } from "../../../../api/reports";

import {
  STEP_GROUP_MAP,
  STEP_DECISIONS,
  DECISION_DOCTRACK,
  getNextStep,
} from "../config/workflow";
import { FIELD_LABEL_MAP, FIELD_KEY_TO_DB } from "../config/fields";
import {
  cleanValue,
  todayStr,
  addWorkingDays,
  countWorkingDays,
  findPreviousEvaluator,
} from "../config/helpers";
import { DEFAULT_WORKING_DAYS } from "../config/workflow";
import {
  DeadlinePicker,
  AssigneeSearchDropdown,
} from "../components/FormControls";

import { createDoctrackLogByRsn } from "../../../../api/doctrack";
import { bulkCreateFromDtns } from "../../../../api/fdaverifportal";

/* ─── helpers ─────────────────────────────────────────────────── */
const RETURNS_TO_EVALUATOR = (currentStep, decision) =>
  decision === "Return to Evaluator" ||
  decision === "Checked and returned to evaluator";

/* Group ID for Decision Authority options (QA) */
const LRD_AUTHORITY_GROUP_ID = 6;

/* Group ID for Decision Authority options (OD-Releasing / Director) */
const OD_RELEASING_AUTHORITY_GROUP_ID = 7;

/* decisions that need an extra "Action" dropdown */
const ACTION_CONFIG = {
  "Quality Evaluation_Endorse to Checker": {
    options: ["For ENOD", "For Approval", "For Disapproval"],
    warning: "Action is required when endorsing to checker.",
  },
  "Quality Evaluation_Endorse to Supervisor": {
    options: ["For ENOD", "For Approval", "For Disapproval"],
    warning: "Action is required when endorsing to supervisor.",
  },
  "Checking_Checked and returned to evaluator": {
    options: ["Checked and Returned", "Recommended for printing"],
    warning: "Action is required when returning to evaluator.",
  },
  "Supervisor_Endorse to QA Admin": {
    options: ["Signed and forwarded to QA Admin"],
    warning: "Action is required when endorsing to QA Admin.",
  },
  "Supervisor_Return to Evaluator": {
    options: ["Return to Evaluator for Clarification"],
    warning: "Action is required when returning to evaluator.",
  },
  "QA Admin_Endorse to LRD Chief Admin": {
    options: ["Checked and Forwarded to LRD Admin"],
    warning: "Action is required when endorsing to LRD Chief Admin.",
  },
  "QA Admin_Return to Evaluator": {
    options: ["Return to Evaluator for Clarification"],
    warning: "Action is required when returning to evaluator.",
  },
  "OD-Receiving_Endorse to OD-Releasing": {
    options: ["For signature"],
    warning: "Action is required when endorsing to OD-Releasing.",
  },
  "OD-Releasing_Scanned and Endorse to Releasing Officer": {
    options: ["Signed"],
    warning: "Action is required when endorsing to Releasing Officer.",
  },
  "Releasing Officer_Released": {
    options: ["Release to record"],
    warning: "Action is required when releasing.",
  },
  "Quality Evaluation_Draft Recommendation": {
    options: ["For cross-evaluation"],
    warning: "Action is required for draft recommendation.",
  },
};

/* Fields shown in Step 4  "For Approval" action */
const QE_APPROVAL_FIELD_KEYS = [
  "regNo",
  "secpa",
  "secpaExpDate",
  "secpaIssuedOn",
  // "cprValidity",
  // "dateReleased",
  "typeDocReleased",
  "attaReleased",
  // "cprCond",
  // "cprCondRemarks",
  // "cprCondAddRemarks",
];

const QE_APPROVAL_FIELD_LABELS = {
  regNo: "Registration No.",
  secpa: "SECPA",
  secpaExpDate: "Expiry Date",
  secpaIssuedOn: "Issued On / Issuance Date",
  // cprValidity: "CPR Validity",

  // dateReleased: "Date Released by CDRR",
  typeDocReleased: "Type Document Released",
  attaReleased: "Attachment/s released with authorization",

  cprCond: "CPR Condition/s Ticked at the back of CPR",
  cprCondRemarks: "CPR Condition Remarks",
  cprCondAddRemarks: "CPR Condition Additional Remarks",
};

const QE_APPROVAL_DATE_FIELDS = new Set([
  "secpaExpDate",
  "secpaIssuedOn",
  // "cprValidity",
  // "dateReleased",
]);

const QE_APPROVAL_MULTILINE_FIELDS = new Set([
  "cprCond",
  "cprCondRemarks",
  "cprCondAddRemarks",
]);

const QE_APPROVAL_REQUIRED_FIELDS = new Set([
  "regNo",
  "secpa",
  "secpaExpDate",
  "secpaIssuedOn",
  // "cprValidity",
  "typeDocReleased",
  // "dateReleased",
  // "attaReleased" — not required
  // "dateReleased" — not required
]);

const TYPE_DOC_OPTIONS = [
  "CPR",
  "Certificate",
  "Letter",
  "LOD",
  "COPP",
  "CFS",
  "GLE",
  "Letter for non acceptance",
  "Product classification",
  "Others",
];

/* ─── Component ───────────────────────────────────────────────── */
export function Step4ActionForm({
  record,
  editedFields,
  colors,
  onClose,
  onSuccess,
}) {
  const [formData, setFormData] = useState({
    currentUserDisplay: "",
    assignee: "",
    decision: "",
    action: "",
    remarks: "",
    doctrackRemarks: "",
    decisionResult: "",
    decisionAuthorityId: null,
    decisionAuthorityName: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [autoAssignee, setAutoAssignee] = useState(null);
  const [workingDays, setWorkingDays] = useState(DEFAULT_WORKING_DAYS);
  const [deadlineDate, setDeadlineDate] = useState(() =>
    addWorkingDays(todayStr(), DEFAULT_WORKING_DAYS),
  );
  const [authorityOptions, setAuthorityOptions] = useState([]);
  const [loadingAuthority, setLoadingAuthority] = useState(false);

  // changes start
  const [doctrackEnabled, setDoctrackEnabled] = useState(true);
  // changes end

  // ── Signed date for OD-Releasing doctrack remarks (optional, default: today) ──
  const [signedDate, setSignedDate] = useState(todayStr());

  // ── QA "For Approval" approval fields ──
  const [approvalFields, setApprovalFields] = useState(() => {
    const init = {};
    QE_APPROVAL_FIELD_KEYS.forEach((k) => {
      init[k] = record[k] ?? "";
    });
    return init;
  });

  const [typeDocIsOthers, setTypeDocIsOthers] = useState(() => {
    const val = record["typeDocReleased"] ?? "";
    return (
      val !== "" &&
      ![
        "CPR",
        "Certificate",
        "Letter",
        "LOD",
        "COPP",
        "CFS",
        "GLE",
        "Letter for non acceptance",
        "Product classification",
      ].includes(val)
    );
  });

  const handleApprovalField = (key, val) =>
    setApprovalFields((p) => ({ ...p, [key]: val }));

  const today = todayStr();
  const currentStep = record.applicationStep;
  const nextStep = getNextStep(currentStep, formData.decision);
  const nextGroupId = STEP_GROUP_MAP[nextStep] ?? null;
  const isForCompliance = formData.decision === "For Compliance";
  const isReturnToEvaluator = RETURNS_TO_EVALUATOR(
    currentStep,
    formData.decision,
  );
  const needsAssignee = nextStep !== null && !isForCompliance;
  const isLRDChiefAdmin = currentStep === "LRD Chief Admin";
  const isODReleasing = currentStep === "OD-Releasing";
  const isODReleasingDecision =
    isODReleasing &&
    formData.decision === "Scanned and Endorse to Releasing Officer";
  // Shows the approval fields section (any decision + For Approval action)
  const isQEForApproval =
    currentStep === "Quality Evaluation" && formData.action === "For Approval";

  // Required validation only applies when Endorse to Supervisor
  const isQEApprovalRequired =
    currentStep === "Quality Evaluation" &&
    formData.decision === "Endorse to Supervisor" &&
    formData.action === "For Approval";

  // Action dropdown key
  const actionKey = `${currentStep}_${formData.decision}`;
  const actionConfig = ACTION_CONFIG[actionKey] ?? null;

  const availableDecisions = STEP_DECISIONS[currentStep] ?? [
    "Approved",
    "Rejected",
  ];

  const dirtyFields = computeFieldChanges(
    record,
    editedFields,
    FIELD_LABEL_MAP,
    currentStep,
  );

  /* ── Shared label style ── */
  const labelStyle = {
    display: "block",
    fontSize: "0.72rem",
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: "0.4rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  /* ── Format a YYYY-MM-DD string to "Month D, YYYY" ── */
  const formatSignedDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  /* ── Build doctrack string for OD-Releasing ── */
  const buildODReleasingDoctrack = (dateStr) =>
    `Signed (${formatSignedDate(dateStr)}) by CDRR-OIC Director, for scanning`;

  /* ── Init current user ── */
  useEffect(() => {
    const user = getUser();
    if (user) {
      setCurrentUser(user);
      setFormData((p) => ({ ...p, currentUserDisplay: user.username }));
    }
  }, []);

  /* ── Load previous evaluator when "Return to Evaluator" is selected ── */
  useEffect(() => {
    if (!isReturnToEvaluator || !record?.mainDbId) {
      setAutoAssignee(null);
      return;
    }
    (async () => {
      try {
        const data = await getApplicationLogs(record.mainDbId);
        const logs = Array.isArray(data) ? data : [];
        const prevEval = findPreviousEvaluator(logs, currentStep);
        setAutoAssignee(prevEval);
        if (prevEval) {
          setFormData((p) => ({ ...p, assignee: prevEval }));
        }
      } catch {
        setAutoAssignee(null);
      }
    })();
  }, [isReturnToEvaluator, record?.mainDbId, currentStep]);

  /* ── Load assignee user list for next step ── */
  useEffect(() => {
    if (!needsAssignee || !nextGroupId) {
      setAssigneeOptions([]);
      return;
    }
    (async () => {
      try {
        setLoadingUsers(true);
        setAssigneeOptions(await getUsersByGroup(nextGroupId));
      } catch {
        setAssigneeOptions([]);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, [nextGroupId, needsAssignee]);

  /* ── Load Decision Authority users (LRD Chief Admin or OD-Releasing) ── */
  useEffect(() => {
    if (!isLRDChiefAdmin && !isODReleasing) {
      setAuthorityOptions([]);
      return;
    }
    (async () => {
      try {
        setLoadingAuthority(true);
        const groupId = isODReleasing
          ? OD_RELEASING_AUTHORITY_GROUP_ID
          : LRD_AUTHORITY_GROUP_ID;
        const users = await getUsersByGroup(groupId);
        setAuthorityOptions(users);
      } catch {
        setAuthorityOptions([]);
      } finally {
        setLoadingAuthority(false);
      }
    })();
  }, [isLRDChiefAdmin, isODReleasing]);

  const handleWorkingDaysChange = (days) => {
    setWorkingDays(days);
    setDeadlineDate(addWorkingDays(today, days));
  };
  const handleDeadlineDateChange = (dateStr) => {
    setDeadlineDate(dateStr);
    setWorkingDays(countWorkingDays(today, dateStr));
  };

  /* ── Signed date change — updates doctrack remarks in sync ── */
  const handleSignedDateChange = (dateStr) => {
    setSignedDate(dateStr);
    if (formData.decision === "Scanned and Endorse to Releasing Officer") {
      setFormData((p) => ({
        ...p,
        doctrackRemarks: buildODReleasingDoctrack(dateStr),
      }));
    }
  };

  const handleChange = (f, v) => {
    setFormData((p) => {
      const updated = { ...p, [f]: v };
      if (f === "decision") {
        updated.action = "";
        updated.assignee = "";
        updated.decisionResult = "";
        updated.decisionAuthorityId = null;
        updated.decisionAuthorityName = "";
        if (!RETURNS_TO_EVALUATOR(currentStep, v)) setAutoAssignee(null);

        // ── Dynamic doctrack remarks for OD-Releasing (uses signedDate state) ──
        if (v === "Scanned and Endorse to Releasing Officer") {
          updated.doctrackRemarks = buildODReleasingDoctrack(signedDate);
        } else {
          updated.doctrackRemarks = DECISION_DOCTRACK[v] ?? "";
        }
      }
      return updated;
    });
  };

  const resolveAssigneeId = (username) =>
    assigneeOptions.find((u) => u.username === username)?.id ?? null;

  /* ── Validation ── */
  const isSubmitDisabled =
    loading ||
    !formData.decision ||
    !formData.doctrackRemarks.trim() ||
    (isForCompliance && !deadlineDate) ||
    (actionConfig && !formData.action) ||
    ((isLRDChiefAdmin || isODReleasing) && !formData.decisionResult) ||
    ((isLRDChiefAdmin || isODReleasing) && !formData.decisionAuthorityId) ||
    (needsAssignee &&
      !isReturnToEvaluator &&
      (loadingUsers || assigneeOptions.length === 0 || !formData.assignee)) ||
    (needsAssignee && isReturnToEvaluator && !formData.assignee) ||
    (isQEApprovalRequired &&
      [...QE_APPROVAL_REQUIRED_FIELDS].some(
        (k) => !approvalFields[k]?.toString().trim(),
      ));
  const infoText = !formData.decision
    ? "Select a decision to proceed."
    : isForCompliance
      ? `Your log will be completed and a Compliance log will be self-assigned to you (${currentUser?.username ?? ""}) with deadline: ${deadlineDate}.`
      : isReturnToEvaluator && autoAssignee
        ? `Your log will be completed and automatically returned to the previous evaluator: ${autoAssignee}.`
        : nextStep
          ? `Your log will be completed and a new "${nextStep}" log will be created for the assigned user.`
          : "Your log will be completed. This is the final step — no further assignment needed.";

  const inp = {
    width: "100%",
    padding: "0.55rem 0.75rem",
    background: colors.inputBg,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: "7px",
    color: colors.textPrimary,
    fontSize: "0.82rem",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!formData.decision) {
      alert("⚠️ Please select a Decision.");
      return;
    }
    if (actionConfig && !formData.action) {
      alert("⚠️ Please select an Action.");
      return;
    }
    if (needsAssignee && !formData.assignee) {
      alert("⚠️ Please assign a next user.");
      return;
    }
    if ((isLRDChiefAdmin || isODReleasing) && !formData.decisionResult) {
      alert("⚠️ Please select a Decision Result.");
      return;
    }
    if ((isLRDChiefAdmin || isODReleasing) && !formData.decisionAuthorityId) {
      alert("⚠️ Please select a Decision Authority.");
      return;
    }
    if (!record.id || !record.mainDbId) {
      alert("❌ Cannot submit: Record IDs are missing.");
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const formattedDateTime = new Date(
        now.getTime() + 8 * 60 * 60 * 1000,
      ).toISOString();

      // Compute approval field changes
      const approvalDirtyFields = isQEForApproval
        ? QE_APPROVAL_FIELD_KEYS.filter((k) => {
            const oldVal = (record[k] ?? "").toString();
            const newVal = (approvalFields[k] ?? "").toString();
            return oldVal !== newVal;
          }).map((k) => ({
            field_name: k,
            field_label: QE_APPROVAL_FIELD_LABELS[k] ?? k,
            old_value: (record[k] ?? "").toString(),
            new_value: (approvalFields[k] ?? "").toString(),
            step_context: currentStep,
          }))
        : [];

      const allDirtyFields = [...dirtyFields, ...approvalDirtyFields];

      // Save field edits
      if (allDirtyFields.length > 0) {
        await createFieldAuditLog({
          main_db_id: record.mainDbId,
          log_id: record.id,
          session_id: crypto.randomUUID(),
          changes: allDirtyFields,
        });
        const updatePayload = {};
        dirtyFields.forEach((c) => {
          const dbKey = FIELD_KEY_TO_DB[c.field_name];
          if (dbKey) updatePayload[dbKey] = c.new_value;
        });
        if (Object.keys(updatePayload).length > 0)
          await updateUploadReport(record.mainDbId, updatePayload);
      }

      // ── Save QA "For Approval" fields ──
      if (isQEForApproval) {
        const approvalPayload = {};
        QE_APPROVAL_FIELD_KEYS.forEach((k) => {
          const currentVal = approvalFields[k];
          const originalVal = record[k] ?? "";
          if (currentVal !== originalVal) {
            const dbKey = FIELD_KEY_TO_DB[k] ?? k;
            approvalPayload[dbKey] = currentVal;
          }
        });
        if (Object.keys(approvalPayload).length > 0) {
          await updateUploadReport(record.mainDbId, approvalPayload);
        }
      }

      const indexData = await getLastApplicationLogIndex(record.mainDbId);
      const nextIndex = (indexData.last_index ?? 0) + 1;

      if (doctrackEnabled) {
        const doctrackResult = await createDoctrackLogByRsn(
          String(record.dtn),
          formData.doctrackRemarks || "",
          currentUser?.id ?? null,
          currentUser?.alias || "",
        );

        if (!doctrackResult) {
          alert("❌ Failed to insert Doctrack log.\n\nSubmission cancelled.");
          setLoading(false);
          return;
        }
      }

      // Complete current log
      await updateApplicationLog(record.id, {
        application_status: "COMPLETED",
        application_decision: formData.decision,
        application_remarks: formData.remarks || "",
        doctrack_remarks: formData.doctrackRemarks || "",
        action_type: isLRDChiefAdmin
          ? "Decision Recorded"
          : actionConfig
            ? formData.action
            : "",
        accomplished_date: formattedDateTime,
        del_last_index: 0,
        del_thread: "Close",
        ...(isLRDChiefAdmin || isODReleasing
          ? {
              decision_result: formData.decisionResult,
              decision_authority_id: formData.decisionAuthorityId,
              decision_authority_name: formData.decisionAuthorityName,
            }
          : {}),
        ...(allDirtyFields.length > 0
          ? {
              edited_fields: Object.fromEntries(
                allDirtyFields.map((c) => [c.field_name, c.new_value]),
              ),
            }
          : {}),
      });

      if (isODReleasing) {
        try {
          await updateUploadReport(record.mainDbId, {
            DB_DECISION_RESULT: formData.decisionResult || "",
            DB_DECISION_AUTHORITY: formData.decisionAuthorityName || "",
            DB_DECISION_SIGNED_DATE: signedDate || null,
          });
        } catch (err) {
          console.warn(
            "⚠️ OD-Releasing report update failed (non-fatal):",
            err.message,
          );
        }
      }

      // Create next log
      if (nextStep) {
        let assignedUser, assignedUserId;

        if (isForCompliance) {
          assignedUser = currentUser?.username || formData.currentUserDisplay;
          assignedUserId = currentUser?.id ?? null;
        } else if (isReturnToEvaluator) {
          assignedUser = formData.assignee;
          assignedUserId = resolveAssigneeId(assignedUser) ?? null;
        } else {
          assignedUser = formData.assignee;
          assignedUserId = resolveAssigneeId(assignedUser);
        }

        await createApplicationLog({
          main_db_id: record.mainDbId,
          application_step: nextStep,
          user_name: assignedUser,
          application_status: "IN PROGRESS",
          application_decision: "",
          application_remarks: "",
          start_date: formattedDateTime,
          accomplished_date: null,
          del_index: nextIndex,
          del_previous: indexData.last_index,
          del_last_index: 1,
          del_thread: "Open",
          user_id: assignedUserId,
          ...(isForCompliance
            ? { deadline_date: deadlineDate, working_days: workingDays }
            : {}),
        });
      }

      console.log(
        "🔍 currentStep:",
        currentStep,
        "| decision:",
        formData.decision,
      );
      if (
        currentStep === "Releasing Officer" &&
        formData.decision === "Released"
      ) {
        await updateUploadReport(record.mainDbId, {
          DB_APP_STATUS: "COMPLETED",
        });

        // ── CPR API — fetch fresh record para makuha ang DB_DECISION_RESULT ──
        console.log("✅ Entered CPR block, fetching fresh record...");
        try {
          const fresh = await getUploadReport(record.mainDbId);
          console.log(
            "🔍 Fresh DB_DECISION_RESULT:",
            fresh?.DB_DECISION_RESULT,
          );
          if (fresh?.DB_DECISION_RESULT === "For issuance of CPR") {
            const cprResult = await bulkCreateFromDtns(
              [record.dtn],
              currentUser?.username ?? null,
            );
            console.log("✅ CPR insert result:", cprResult);
          }
        } catch (cprErr) {
          console.warn("⚠️ CPR API failed (non-fatal):", cprErr.message);
        }
      }

      if (onSuccess) await onSuccess();
      onClose();
      alert("✅ Completed successfully!");
    } catch (err) {
      alert(`❌ Failed to submit: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Record context banner */}
      <div
        style={{
          padding: "0.75rem 1rem",
          background:
            "linear-gradient(135deg, rgba(33,150,243,0.08), rgba(33,150,243,0.03))",
          border: "1px solid rgba(33,150,243,0.2)",
          borderRadius: "8px",
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {[
          { label: "DTN", value: cleanValue(record.dtn), accent: true },
          { label: "Brand", value: cleanValue(record.prodBrName) },
          { label: "Current Step", value: cleanValue(currentStep) },
        ].map(({ label, value, accent }, i) => (
          <div
            key={i}
            style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
          >
            {i > 0 && (
              <div
                style={{
                  width: "1px",
                  height: "28px",
                  background: colors.cardBorder,
                }}
              />
            )}
            <div>
              <div
                style={{
                  fontSize: "0.6rem",
                  fontWeight: "700",
                  color: accent ? "#2196F3" : colors.textTertiary,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: accent ? "0.95rem" : "0.82rem",
                  fontWeight: accent ? "800" : "600",
                  color: colors.textPrimary,
                }}
              >
                {value}
              </div>
            </div>
          </div>
        ))}
        {nextStep && (
          <>
            <div style={{ fontSize: "1rem", color: colors.textTertiary }}>
              →
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.6rem",
                  fontWeight: "700",
                  color: colors.textTertiary,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Next Step
              </div>
              <div
                style={{
                  fontSize: "0.82rem",
                  fontWeight: "600",
                  color: "#2196F3",
                }}
              >
                {nextStep}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Dirty fields banner */}
      {dirtyFields.length > 0 && (
        <div
          style={{
            padding: "0.65rem 0.85rem",
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: "7px",
          }}
        >
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: "700",
              color: "#b45309",
              marginBottom: "0.4rem",
            }}
          >
            ✎ {dirtyFields.length} field{dirtyFields.length > 1 ? "s" : ""}{" "}
            edited — will be saved with this submission
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
          >
            {dirtyFields.map((c) => (
              <div
                key={c.field_name}
                style={{
                  display: "flex",
                  gap: "0.4rem",
                  fontSize: "0.68rem",
                  color: colors.textSecondary,
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    fontWeight: "600",
                    color: colors.textPrimary,
                    minWidth: "120px",
                    flexShrink: 0,
                  }}
                >
                  {c.field_label}:
                </span>
                <span
                  style={{
                    color: "#ef4444",
                    textDecoration: "line-through",
                    wordBreak: "break-all",
                  }}
                >
                  {c.old_value || <em>empty</em>}
                </span>
                <span style={{ color: colors.textTertiary }}>→</span>
                <span style={{ color: "#10b981", wordBreak: "break-all" }}>
                  {c.new_value || <em>empty</em>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Handled By */}
      <div>
        <label style={labelStyle}>
          Handled By (You) <span style={{ color: "#2196F3" }}>●</span>
        </label>
        <input
          type="text"
          value={formData.currentUserDisplay}
          readOnly
          style={{
            ...inp,
            background: colors.badgeBg,
            cursor: "not-allowed",
            fontWeight: "600",
          }}
        />
        {currentUser && (
          <p
            style={{
              fontSize: "0.68rem",
              color: colors.textTertiary,
              marginTop: "0.3rem",
              marginBottom: 0,
            }}
          >
            👤 Logged in as: {currentUser.username}
          </p>
        )}
      </div>

      {/* Decision */}
      <div>
        <label style={labelStyle}>
          Decision <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <select
          value={formData.decision}
          onChange={(e) => handleChange("decision", e.target.value)}
          style={{ ...inp, cursor: "pointer" }}
          onFocus={(e) => {
            e.target.style.borderColor = "#2196F3";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = colors.inputBorder;
          }}
        >
          <option value="">Select decision...</option>
          {availableDecisions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Action (conditional) */}
      {actionConfig && (
        <div>
          <label style={labelStyle}>
            Action <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <select
            value={formData.action}
            onChange={(e) => handleChange("action", e.target.value)}
            style={{ ...inp, cursor: "pointer" }}
            onFocus={(e) => {
              e.target.style.borderColor = "#2196F3";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = colors.inputBorder;
            }}
          >
            <option value="">Select action...</option>
            {actionConfig.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {!formData.action && (
            <p
              style={{
                fontSize: "0.68rem",
                color: "#ef4444",
                marginTop: "0.3rem",
                marginBottom: 0,
              }}
            >
              ⚠️ {actionConfig.warning}
            </p>
          )}
        </div>
      )}

      {isQEForApproval && (
        <div
          style={{
            padding: "0.85rem 1rem",
            background: "rgba(33,150,243,0.05)",
            border: "1px solid rgba(33,150,243,0.2)",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: "700",
              color: "#2196F3",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              paddingBottom: "0.4rem",
              marginBottom: "0.65rem",
              borderBottom: "1px solid rgba(33,150,243,0.15)",
            }}
          >
            📋 Approval Fields
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.6rem",
            }}
          >
            {QE_APPROVAL_FIELD_KEYS.map((key) => {
              const isDate = QE_APPROVAL_DATE_FIELDS.has(key);
              const isMultiline = QE_APPROVAL_MULTILINE_FIELDS.has(key);

              // IPALIT:
              if (key === "typeDocReleased") {
                const selectVal = typeDocIsOthers
                  ? "Others"
                  : approvalFields[key];

                return (
                  <div key={key}>
                    <label style={labelStyle}>
                      {QE_APPROVAL_FIELD_LABELS[key]}
                      {QE_APPROVAL_REQUIRED_FIELDS.has(key) && (
                        <span style={{ color: "#ef4444" }}></span>
                      )}
                    </label>
                    {isQEApprovalRequired &&
                      QE_APPROVAL_REQUIRED_FIELDS.has(key) &&
                      !approvalFields[key]?.toString().trim() && (
                        <p
                          style={{
                            fontSize: "0.65rem",
                            color: "#ef4444",
                            margin: "0.2rem 0 0",
                          }}
                        >
                          ⚠️ Required
                        </p>
                      )}
                    <select
                      value={selectVal}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "Others") {
                          setTypeDocIsOthers(true);
                          handleApprovalField(key, ""); // clear para makapag-type
                        } else {
                          setTypeDocIsOthers(false);
                          handleApprovalField(key, val);
                        }
                      }}
                      style={{ ...inp, cursor: "pointer" }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#2196F3";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = colors.inputBorder;
                      }}
                    >
                      <option value="">Select type...</option>
                      {TYPE_DOC_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>

                    {typeDocIsOthers && (
                      <input
                        type="text"
                        value={approvalFields[key]}
                        onChange={(e) =>
                          handleApprovalField(key, e.target.value)
                        }
                        placeholder="Please specify..."
                        style={{ ...inp, marginTop: "0.4rem" }}
                        autoFocus
                        onFocus={(e) => {
                          e.target.style.borderColor = "#2196F3";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = colors.inputBorder;
                        }}
                      />
                    )}
                  </div>
                );
              }

              return (
                <div key={key}>
                  <label style={labelStyle}>
                    {QE_APPROVAL_FIELD_LABELS[key]}
                    {QE_APPROVAL_REQUIRED_FIELDS.has(key) && (
                      <span style={{ color: "#ef4444" }}></span>
                    )}
                  </label>
                  {isQEApprovalRequired &&
                    QE_APPROVAL_REQUIRED_FIELDS.has(key) &&
                    !approvalFields[key]?.toString().trim() && (
                      <p
                        style={{
                          fontSize: "0.65rem",
                          color: "#ef4444",
                          margin: "0.2rem 0 0",
                        }}
                      >
                        ⚠️ Required
                      </p>
                    )}
                  {isMultiline ? (
                    <textarea
                      value={approvalFields[key]}
                      onChange={(e) => handleApprovalField(key, e.target.value)}
                      rows={3}
                      style={{
                        ...inp,
                        resize: "vertical",
                        fontFamily: "inherit",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#2196F3";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = colors.inputBorder;
                      }}
                    />
                  ) : (
                    <input
                      type={isDate ? "date" : "text"}
                      value={approvalFields[key]}
                      onChange={(e) => handleApprovalField(key, e.target.value)}
                      style={{ ...inp, cursor: isDate ? "pointer" : "text" }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#2196F3";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = colors.inputBorder;
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Decision Result — LRD Chief Admin or OD-Releasing */}
      {(isLRDChiefAdmin || isODReleasing) && (
        <div>
          <label style={labelStyle}>
            Decision Result <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <select
            value={formData.decisionResult}
            onChange={(e) => handleChange("decisionResult", e.target.value)}
            style={{ ...inp, cursor: "pointer" }}
            onFocus={(e) => {
              e.target.style.borderColor = "#2196F3";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = colors.inputBorder;
            }}
          >
            <option value="">Select result...</option>
            {isLRDChiefAdmin && <option value="Signed">Signed</option>}
            {isODReleasing && (
              <>
                <option value="For issuance of CPR">For issuance of CPR</option>
                <option value="For issuance of LOD">For issuance of LOD</option>
                <option value="For issuance of Certificate">
                  For issuance of Certificate
                </option>
                <option value="For issuance of Letter">
                  For issuance of Letter
                </option>
                <option value="For issuance of COPP">
                  For issuance of COPP
                </option>
                <option value="For issuance of CFS">For issuance of CFS</option>
                <option value="For issuance of GLE">For issuance of GLE</option>
                <option value="For issuance of Letter for non acceptance">
                  For issuance of Letter for non acceptance
                </option>
                <option value="For issuance of Product classification">
                  For issuance of Product classification
                </option>
              </>
            )}
          </select>
          {!formData.decisionResult && formData.decision && (
            <p
              style={{
                fontSize: "0.68rem",
                color: "#ef4444",
                marginTop: "0.3rem",
                marginBottom: 0,
              }}
            >
              ⚠️ Decision Result is required.
            </p>
          )}
        </div>
      )}

      {/* Decision Authority — LRD Chief Admin or OD-Releasing */}
      {(isLRDChiefAdmin || isODReleasing) && (
        <div>
          <label style={labelStyle}>
            Decision Authority <span style={{ color: "#ef4444" }}>*</span>
          </label>
          {loadingAuthority ? (
            <div
              style={{
                ...inp,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                color: colors.textTertiary,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "12px",
                  height: "12px",
                  border: "2px solid #2196F330",
                  borderTopColor: "#2196F3",
                  borderRadius: "50%",
                  animation: "spin 0.6s linear infinite",
                }}
              />
              Loading authority users...
            </div>
          ) : (
            <select
              value={formData.decisionAuthorityId ?? ""}
              onChange={(e) => {
                const selected = authorityOptions.find(
                  (u) => String(u.id) === e.target.value,
                );
                if (selected) {
                  handleChange("decisionAuthorityId", selected.id);
                  const fullName =
                    selected.first_name &&
                    (selected.last_name || selected.surname)
                      ? `${selected.first_name} ${selected.last_name ?? selected.surname}`
                      : selected.username;
                  handleChange("decisionAuthorityName", fullName);
                } else {
                  handleChange("decisionAuthorityId", null);
                  handleChange("decisionAuthorityName", "");
                }
              }}
              style={{ ...inp, cursor: "pointer" }}
              onFocus={(e) => {
                e.target.style.borderColor = "#2196F3";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = colors.inputBorder;
              }}
            >
              <option value="">Select authority...</option>
              {authorityOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.first_name && (u.last_name || u.surname)
                    ? `${u.username} - ${u.first_name} ${u.last_name ?? u.surname}`
                    : u.username}
                </option>
              ))}
            </select>
          )}
          {!loadingAuthority && authorityOptions.length === 0 && (
            <p
              style={{
                fontSize: "0.68rem",
                color: "#ef4444",
                marginTop: "0.3rem",
                marginBottom: 0,
              }}
            >
              ⚠️ No authority users found.
            </p>
          )}
        </div>
      )}

      {/* Compliance Deadline */}
      {isForCompliance && (
        <DeadlinePicker
          deadlineDate={deadlineDate}
          workingDays={workingDays}
          onDeadlineChange={handleDeadlineDateChange}
          onWorkingDaysChange={handleWorkingDaysChange}
          colors={colors}
        />
      )}

      {/* Remarks */}
      <div>
        <label style={labelStyle}>Remarks</label>
        <textarea
          value={formData.remarks}
          onChange={(e) => handleChange("remarks", e.target.value)}
          placeholder="Enter your remarks and findings..."
          rows={3}
          style={{ ...inp, resize: "vertical", fontFamily: "inherit" }}
          onFocus={(e) => {
            e.target.style.borderColor = "#2196F3";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = colors.inputBorder;
          }}
        />
      </div>

      {/* Signed Date Picker — OD-Releasing only, shown when decision is selected */}
      {isODReleasingDecision && (
        <div>
          <label style={labelStyle}>
            Signed Date{" "}
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: "400",
                color: colors.textTertiary,
                textTransform: "none",
              }}
            >
              (used in Doctrack Remarks)
            </span>
          </label>
          <input
            type="date"
            value={signedDate}
            onChange={(e) => handleSignedDateChange(e.target.value)}
            style={{ ...inp, cursor: "pointer" }}
            onFocus={(e) => {
              e.target.style.borderColor = "#2196F3";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = colors.inputBorder;
            }}
          />
          <p
            style={{
              fontSize: "0.68rem",
              color: colors.textTertiary,
              marginTop: "0.3rem",
              marginBottom: 0,
            }}
          >
            📅 Default is today. Changing this will update the Doctrack Remarks
            below automatically.
          </p>
        </div>
      )}

      {/* start changes */}
      {/* Doctrack Remarks */}
      <div>
        <label
          style={{
            ...labelStyle,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.4rem",
          }}
        >
          <span>
            Doctrack Remarks <span style={{ color: "#ef4444" }}>*</span>
          </span>
          {/* ── Doctrack Toggle ── */}
          <span
            onClick={() => setDoctrackEnabled((prev) => !prev)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.65rem",
              fontWeight: 600,
              cursor: "pointer",
              padding: "0.1rem 0.5rem 0.1rem 0.35rem",
              borderRadius: "20px",
              border: `1px solid ${doctrackEnabled ? "#4CAF5050" : "#ef444450"}`,
              background: doctrackEnabled ? "#4CAF5015" : "#ef444415",
              color: doctrackEnabled ? "#4CAF50" : "#ef4444",
              userSelect: "none",
              transition: "all 0.2s",
              textTransform: "none",
              letterSpacing: "normal",
            }}
          >
            <span
              style={{
                width: 22,
                height: 11,
                borderRadius: 11,
                background: doctrackEnabled ? "#4CAF50" : "#ef4444",
                display: "inline-block",
                position: "relative",
                transition: "background 0.2s",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: doctrackEnabled ? 13 : 2,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s",
                }}
              />
            </span>
            {doctrackEnabled ? "ON" : "OFF"}
          </span>
        </label>

        {/* Doctrack Remarks */}
        {/* <div>
        <label style={labelStyle}>
          Doctrack Remarks <span style={{ color: "#ef4444" }}>*</span>
        </label> */}

        {/* end changes */}
        <textarea
          value={formData.doctrackRemarks}
          onChange={(e) => handleChange("doctrackRemarks", e.target.value)}
          rows={2}
          style={{ ...inp, resize: "vertical", fontFamily: "inherit" }}
          onFocus={(e) => {
            e.target.style.borderColor = "#2196F3";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = colors.inputBorder;
          }}
        />
      </div>

      {/* Assignee */}
      {needsAssignee && (
        <div>
          <label style={labelStyle}>
            Assign to {nextStep}{" "}
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: "400",
                color: colors.textTertiary,
              }}
            >
              ({nextStep} Group)
            </span>{" "}
            <span style={{ color: "#ef4444" }}>*</span>
            {isReturnToEvaluator && autoAssignee && (
              <span
                style={{
                  marginLeft: "0.5rem",
                  fontSize: "0.6rem",
                  fontWeight: "700",
                  color: "#10b981",
                  background: "rgba(16,185,129,0.1)",
                  padding: "0.1rem 0.4rem",
                  borderRadius: "4px",
                }}
              >
                🔒 Auto-detected
              </span>
            )}
          </label>

          {/* Auto-assigned info box */}
          {isReturnToEvaluator && autoAssignee && (
            <div
              style={{
                marginBottom: "0.5rem",
                padding: "0.5rem 0.75rem",
                background: "rgba(16,185,129,0.07)",
                border: "1px solid rgba(16,185,129,0.25)",
                borderRadius: "6px",
                fontSize: "0.72rem",
                color: "#047857",
              }}
            >
              ↩️ Automatically returning to previous evaluator:{" "}
              <strong>{autoAssignee}</strong>
            </div>
          )}

          {loadingUsers && !isReturnToEvaluator ? (
            <div
              style={{
                ...inp,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                color: colors.textTertiary,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "12px",
                  height: "12px",
                  border: "2px solid #2196F330",
                  borderTopColor: "#2196F3",
                  borderRadius: "50%",
                  animation: "spin 0.6s linear infinite",
                }}
              />
              Loading users...
            </div>
          ) : (
            <AssigneeSearchDropdown
              value={formData.assignee}
              onChange={(v) => handleChange("assignee", v)}
              options={assigneeOptions}
              placeholder={`Select ${nextStep}...`}
              colors={colors}
              inp={inp}
              readOnly={isReturnToEvaluator && !!autoAssignee}
            />
          )}

          {!isReturnToEvaluator &&
            !loadingUsers &&
            assigneeOptions.length === 0 && (
              <p
                style={{
                  fontSize: "0.68rem",
                  color: "#ef4444",
                  marginTop: "0.3rem",
                  marginBottom: 0,
                }}
              >
                ⚠️ No users found in {nextStep} group.
              </p>
            )}
        </div>
      )}

      {/* Compliance self-assign notice */}
      {isForCompliance && (
        <div
          style={{
            padding: "0.6rem 0.85rem",
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: "7px",
            fontSize: "0.75rem",
            color: colors.textSecondary,
          }}
        >
          ✅ Compliance log will be self-assigned to you:{" "}
          <strong>{currentUser?.username}</strong>
        </div>
      )}

      {/* Info box */}
      <div
        style={{
          padding: "0.75rem 1rem",
          background: "rgba(33,150,243,0.06)",
          border: "1px solid rgba(33,150,243,0.2)",
          borderRadius: "7px",
          display: "flex",
          gap: "0.6rem",
          alignItems: "flex-start",
        }}
      >
        <span style={{ fontSize: "0.9rem" }}>ℹ️</span>
        <p
          style={{
            fontSize: "0.75rem",
            color: colors.textSecondary,
            lineHeight: "1.5",
            margin: 0,
          }}
        >
          {infoText}
        </p>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        style={{
          width: "100%",
          padding: "0.7rem",
          background: isSubmitDisabled
            ? "#2196F380"
            : "linear-gradient(135deg, #2196F3, #1976D2)",
          border: "none",
          borderRadius: "8px",
          color: "#fff",
          fontSize: "0.85rem",
          fontWeight: "700",
          cursor: isSubmitDisabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.4rem",
          boxShadow: isSubmitDisabled
            ? "none"
            : "0 3px 10px rgba(33,150,243,0.3)",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          if (!isSubmitDisabled)
            e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
        }}
      >
        {loading ? (
          <>
            <span
              style={{
                display: "inline-block",
                width: "13px",
                height: "13px",
                border: "2px solid #ffffff40",
                borderTopColor: "#fff",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
              }}
            />
            Submitting...
          </>
        ) : (
          <>
            ✓ Complete {currentStep}
            {dirtyFields.length > 0
              ? ` + Save ${dirtyFields.length} Edit${dirtyFields.length > 1 ? "s" : ""}`
              : ""}
          </>
        )}
      </button>
    </div>
  );
}
