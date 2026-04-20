/* ================================================================== */
/*  DataTable — BulkDeckModal.jsx                                      */
/* ================================================================== */
import { useState, useRef, useEffect } from "react";
import { getUsersByGroup, getUser } from "../../../api/auth";
import { createBulkDoctrackLogsByRsn } from "../../../api/doctrack";
import {
  LRD_AUTHORITY_GROUP_ID,
  OD_RELEASING_AUTHORITY_GROUP_ID,
  DECISION_RESULT_OPTIONS,
  todayStr,
} from "./constants";

/* ── Same ACTION_CONFIG as Step4ActionForm ── */
const ACTION_CONFIG = {
  "Quality Evaluation_Endorse to Checker": {
    options: ["For ENOD", "For Approval", "For Disapproval"],
    warning: "Action is required when endorsing to checker.",
  },
  "Quality Evaluation_Endorse to Supervisor": {
    options: ["For ENOD", "For Approval", "For Disapproval"],
    warning: "Action is required when endorsing to supervisor.",
  },
  "Checking_Check and return to evaluator": {
    options: ["Return and Checked", "Recommended for printing"],
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
  "LRD Chief Admin_Endorse to OD-Receiving": {
    // ← ADD THIS
    options: ["Signed and forwarded to OD-Receiving"],
    warning: "Action is required when endorsing to OD-Receiving.",
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
};

const RETURN_DECISIONS = new Set([
  "Return to Evaluator",
  "Check and return to evaluator",
]);

const formatSignedDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const buildODReleasingDoctrack = (dateStr) =>
  `Signed (${formatSignedDate(dateStr)}) by CDRR-OIC Director, for scanning`;

const Spinner = ({ size = 13 }) => (
  <span
    style={{
      display: "inline-block",
      width: size,
      height: size,
      border: "2px solid rgba(255,255,255,0.4)",
      borderTopColor: "#fff",
      borderRadius: "50%",
      animation: "spin 0.6s linear infinite",
    }}
  />
);

const inp = (colors, highlight) => ({
  width: "100%",
  padding: "0.7rem 0.9rem",
  background: colors.inputBg,
  border: `1.5px solid ${highlight ? "#2196F3" : colors.cardBorder}`,
  borderRadius: 8,
  color: highlight ? colors.textPrimary : colors.textTertiary,
  fontSize: "0.88rem",
  outline: "none",
  cursor: "pointer",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
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

export function BulkDeckModal({
  selectedCount,
  selectedDtns,
  config,
  colors,
  darkMode,
  onConfirm,
  onClose,
  onDownloadTransmittal,
  onDone,
}) {
  const [assignee, setAssignee] = useState("");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(!config.isEndTask);
  const [submitting, setSubmitting] = useState(false);
  const [screen, setScreen] = useState("form");
  const [result, setResult] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const submittingRef = useRef(false);

  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    const user = getUser();
    if (user) setCurrentUser(user);
  }, []);

  /* ── Decision / Action / Remarks ── */
  const availableDecisions = config.availableDecisions ?? [];

  const [decision, setDecision] = useState(
    availableDecisions.length === 1 ? availableDecisions[0] : "",
  );
  const [action, setAction] = useState("");
  const [remarks, setRemarks] = useState("");

  const actionKey = `${config.currentStep}_${decision}`;
  const actionConfig = ACTION_CONFIG[actionKey] ?? null;
  const isReturnDecision = RETURN_DECISIONS.has(decision);

  /* Show Decision dropdown for ALL steps regardless of option count */
  const hasDecisions = availableDecisions.length >= 1;

  /* ── Doctrack remarks ──
   * UI is kept (editable, with signed date for OD-Releasing).
   * Currently NOT passed to onConfirm — static/display only.
   * Wire it in when needed in the future.
   */
  const getDefaultDoctrack = (dec) => {
    if (!dec) return config.defaultDoctrack ?? "";
    if (
      config.requiresSignedDate &&
      dec === "Scanned and Endorse to Releasing Officer"
    ) {
      return buildODReleasingDoctrack(signedDate);
    }
    return config.decisionDoctrackMap?.[dec] ?? config.defaultDoctrack ?? "";
  };

  const [signedDate, setSignedDate] = useState(todayStr());
  const [doctrackRemarks, setDoctrackRemarks] = useState(() =>
    config.requiresSignedDate
      ? buildODReleasingDoctrack(todayStr())
      : (config.defaultDoctrack ?? ""),
  );

  const handleSignedDateChange = (dateStr) => {
    setSignedDate(dateStr);
    setDoctrackRemarks(buildODReleasingDoctrack(dateStr));
  };

  const handleDecisionChange = (val) => {
    setDecision(val);
    setAction("");
    setDoctrackRemarks(getDefaultDoctrack(val));
  };

  // Inside BulkDeckModal, add new state:
  const [decisionResult, setDecisionResult] = useState("");
  const [decisionAuthorityId, setDecisionAuthorityId] = useState(null);
  const [decisionAuthorityName, setDecisionAuthorityName] = useState("");
  const [authorityOptions, setAuthorityOptions] = useState([]);
  const [loadingAuthority, setLoadingAuthority] = useState(false);

  const isLRDChiefAdmin = config.currentStep === "LRD Chief Admin";
  const isODReleasing = config.currentStep === "OD-Releasing";
  const needsAuthority = isLRDChiefAdmin || isODReleasing;
  const decisionResultOptions =
    DECISION_RESULT_OPTIONS[config.currentStep] ?? [];

  /* ── Load assignee users (only when NOT a return decision) ── */
  useEffect(() => {
    if (config.isEndTask || isReturnDecision) {
      setUsers([]);
      setLoadingUsers(false);
      return;
    }
    (async () => {
      try {
        setLoadingUsers(true);
        const list = await getUsersByGroup(config.nextGroupId);
        setUsers(list || []);
      } catch (e) {
        console.error("Failed to load users:", e);
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, [decision]);

  useEffect(() => {
    if (!needsAuthority) {
      setAuthorityOptions([]);
      setLoadingAuthority(false);
      return;
    }
    (async () => {
      try {
        setLoadingAuthority(true);
        const groupId = isODReleasing
          ? OD_RELEASING_AUTHORITY_GROUP_ID
          : LRD_AUTHORITY_GROUP_ID;
        const list = await getUsersByGroup(groupId);
        setAuthorityOptions(list || []);
      } catch (e) {
        console.error("Failed to load authority users:", e);
        setAuthorityOptions([]);
      } finally {
        setLoadingAuthority(false);
      }
    })();
  }, [needsAuthority]);

  /* ── Validation ── */
  const needsAssignee = !config.isEndTask && !isReturnDecision;

  const isDisabled =
    submitting ||
    !decision ||
    (actionConfig && !action) ||
    (needsAuthority && (!decisionResult || !decisionAuthorityId)) ||
    (needsAssignee && (loadingUsers || users.length === 0 || !assignee));

  /* doctrackRemarks intentionally NOT passed to onConfirm for now */
  const handleConfirm = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      try {
        const doctrackEntries = selectedDtns.map((dtn) => ({
          rsn: String(dtn),
          remarks: doctrackRemarks || "",
          userID: currentUser?.id ?? null,
        }));
        await createBulkDoctrackLogsByRsn(
          doctrackEntries,
          currentUser?.alias || "",
        );
      } catch (doctrackErr) {
        console.warn(
          "⚠️ Doctrack log failed (non-fatal):",
          doctrackErr.message,
        );
      }

      const res = await onConfirm(isReturnDecision ? null : assignee, {
        decision,
        action,
        remarks,
        doctrackRemarks,
        decisionResult,
        decisionAuthorityId,
        decisionAuthorityName,
      });
      setResult(res);
      setScreen("transmittal_prompt");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleDownloadYes = async () => {
    setDownloading(true);
    try {
      await onDownloadTransmittal();
    } finally {
      setDownloading(false);
      setScreen("done");
      onDone();
    }
  };

  const overlay = (onClick, children) => (
    <div
      onClick={onClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      {children}
    </div>
  );

  /* ── transmittal_prompt screen ── */
  if (screen === "transmittal_prompt") {
    return overlay(
      onClose,
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 16,
          overflow: "hidden",
          width: 460,
          maxWidth: "92%",
          boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            background: darkMode ? "#1a1a1a" : "#f6f8fd",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1.6rem" }}>
            {result?.failed === 0 ? "✅" : "⚠️"}
          </span>
          <div>
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: colors.textTertiary,
              }}
            >
              {config.isEndTask ? "End Task" : "Bulk Action"}
            </div>
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              {result?.failed === 0
                ? "Completed Successfully"
                : "Partially Completed"}
            </div>
          </div>
        </div>
        <div
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div
              style={{
                flex: 1,
                padding: "0.75rem",
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.25)",
                borderRadius: 10,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  color: "#10b981",
                }}
              >
                {result?.success}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: colors.textTertiary,
                  marginTop: 2,
                }}
              >
                Successfully processed
              </div>
            </div>
            {result?.failed > 0 && (
              <div
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 10,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 800,
                    color: "#ef4444",
                  }}
                >
                  {result?.failed}
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: colors.textTertiary,
                    marginTop: 2,
                  }}
                >
                  Failed
                </div>
              </div>
            )}
          </div>
          {!config.isEndTask && !isReturnDecision && (
            <p
              style={{
                margin: 0,
                fontSize: "0.82rem",
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              Assigned to:{" "}
              <strong style={{ color: "#2196F3" }}>{assignee}</strong> (
              {config.nextStep})
            </p>
          )}
          {isReturnDecision && (
            <p
              style={{
                margin: 0,
                fontSize: "0.82rem",
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              ↩️ Each record was returned to its{" "}
              <strong style={{ color: "#10b981" }}>previous evaluator</strong>{" "}
              automatically.
            </p>
          )}
          <div
            style={{
              padding: "1rem 1.25rem",
              background: "rgba(25,118,210,0.06)",
              border: "1px solid rgba(25,118,210,0.2)",
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span style={{ fontSize: "1.1rem" }}>📄</span>
              <span
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  color: colors.textPrimary,
                }}
              >
                Download Transmittal Slip?
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "0.78rem",
                color: colors.textSecondary,
                lineHeight: 1.5,
              }}
            >
              Would you like to generate and download a transmittal slip for the{" "}
              <strong>{result?.success}</strong> successfully processed record
              {result?.success !== 1 ? "s" : ""}?{" "}
              <span style={{ color: colors.textTertiary }}>(PDF + Excel)</span>
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => {
                setScreen("done");
                onDone();
              }}
              style={{
                flex: 1,
                padding: "0.7rem",
                borderRadius: 8,
                border: `1px solid ${colors.cardBorder}`,
                background: "transparent",
                color: colors.textSecondary,
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              No, Skip
            </button>
            <button
              onClick={handleDownloadYes}
              disabled={downloading}
              style={{
                flex: 1,
                padding: "0.7rem",
                borderRadius: 8,
                border: "none",
                background: downloading
                  ? "rgba(25,118,210,0.4)"
                  : "linear-gradient(135deg,#1976d2,#1565c0)",
                color: "#fff",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: downloading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                boxShadow: downloading
                  ? "none"
                  : "0 2px 8px rgba(25,118,210,0.35)",
                transition: "all 0.2s",
              }}
            >
              {downloading ? (
                <>
                  <Spinner />
                  Generating…
                </>
              ) : (
                <>
                  <span>📄</span>Yes, Download (PDF + Excel)
                </>
              )}
            </button>
          </div>
        </div>
      </div>,
    );
  }

  /* ── done screen ── */
  if (screen === "done") {
    return overlay(
      onClose,
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 16,
          padding: "2rem",
          width: 380,
          maxWidth: "90%",
          boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div style={{ fontSize: "2.5rem" }}>🎉</div>
        <h3
          style={{
            margin: 0,
            fontSize: "1.05rem",
            fontWeight: 700,
            color: colors.textPrimary,
            textAlign: "center",
          }}
        >
          All Done!
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "0.82rem",
            color: colors.textSecondary,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          {result?.success} record{result?.success !== 1 ? "s" : ""}{" "}
          {config.isEndTask ? (
            "successfully completed."
          ) : isReturnDecision ? (
            "successfully returned to previous evaluators."
          ) : (
            <>
              successfully endorsed to{" "}
              <strong style={{ color: "#2196F3" }}>{config.nextStep}</strong>.
            </>
          )}
        </p>
        <button
          onClick={onClose}
          style={{
            padding: "0.6rem 2rem",
            borderRadius: 8,
            border: "none",
            background: "linear-gradient(135deg,#2196F3,#1976D2)",
            color: "#fff",
            fontSize: "0.88rem",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(33,150,243,0.3)",
          }}
        >
          Close
        </button>
      </div>,
    );
  }

  /* ── form screen ── */
  return overlay(
    onClose,
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 16,
        overflow: "hidden",
        width: 520,
        maxWidth: "94%",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          borderBottom: `1px solid ${colors.cardBorder}`,
          background: darkMode ? "#1a1a1a" : "#f6f8fd",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: colors.textTertiary,
              marginBottom: "0.2rem",
            }}
          >
            {config.isEndTask ? "End Task" : "Bulk Action"}
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 700,
              color: colors.textPrimary,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span style={{ fontSize: "1.2rem" }}>
              {config.isEndTask ? "✅" : "📋"}
            </span>
            {config.isEndTask
              ? "End Task — Mark as Completed"
              : config.modalTitle || `Endorse to ${config.nextStep}`}
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 6,
            color: colors.textTertiary,
            cursor: "pointer",
            width: 30,
            height: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.9rem",
          }}
        >
          ✕
        </button>
      </div>

      {/* Scrollable body */}
      <div
        style={{
          overflowY: "auto",
          flex: 1,
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* Count + move info */}
        <div
          style={{
            padding: "0.85rem 1rem",
            background: config.isEndTask
              ? "rgba(16,185,129,0.06)"
              : "rgba(33,150,243,0.06)",
            border: `1px solid ${config.isEndTask ? "rgba(16,185,129,0.2)" : "rgba(33,150,243,0.2)"}`,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1.4rem" }}>
            {config.isEndTask ? "✅" : "📦"}
          </span>
          <div>
            <div
              style={{
                fontSize: "0.88rem",
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              {selectedCount} record{selectedCount !== 1 ? "s" : ""} selected
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: colors.textTertiary,
                marginTop: "0.1rem",
              }}
            >
              {config.isEndTask ? (
                <>
                  All will be marked as{" "}
                  <strong style={{ color: "#10b981" }}>Completed</strong> from{" "}
                  <strong>{config.fromLabel}</strong>
                </>
              ) : isReturnDecision ? (
                <>
                  All will be{" "}
                  <strong style={{ color: "#f59e0b" }}>returned</strong> from{" "}
                  <strong>{config.fromLabel}</strong> →{" "}
                  <strong style={{ color: "#10b981" }}>
                    previous evaluator (auto)
                  </strong>
                </>
              ) : (
                <>
                  All will be endorsed from <strong>{config.fromLabel}</strong>{" "}
                  →{" "}
                  <strong style={{ color: "#2196F3" }}>
                    {config.nextStep}
                  </strong>
                </>
              )}
            </div>
          </div>
        </div>

        {/* DTN list */}
        <div>
          <label
            style={{
              ...labelStyle(colors),
              color: colors.textTertiary,
              marginBottom: "0.5rem",
            }}
          >
            📋 DTNs to be {config.isEndTask ? "completed" : "processed"} (
            {selectedDtns.length})
          </label>
          <div
            style={{
              maxHeight: 160,
              overflowY: "auto",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 8,
              background: colors.inputBg,
            }}
          >
            {selectedDtns.map((dtn, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.5rem 0.85rem",
                  borderBottom:
                    i < selectedDtns.length - 1
                      ? `1px solid ${colors.cardBorder}`
                      : "none",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: config.isEndTask ? "#10b981" : "#7c3aed",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: colors.textPrimary,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {dtn}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Decision ── */}
        {hasDecisions && (
          <div>
            <label style={labelStyle(colors)}>
              Decision <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={decision}
              onChange={(e) => handleDecisionChange(e.target.value)}
              style={inp(colors, !!decision)}
              onFocus={(e) => {
                e.target.style.borderColor = "#2196F3";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = decision
                  ? "#2196F3"
                  : colors.cardBorder;
              }}
            >
              {availableDecisions.length > 1 && (
                <option value="">Select decision...</option>
              )}
              {availableDecisions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {!decision && (
              <p
                style={{
                  fontSize: "0.68rem",
                  color: "#ef4444",
                  marginTop: "0.3rem",
                  marginBottom: 0,
                }}
              >
                ⚠️ Please select a decision.
              </p>
            )}
          </div>
        )}

        {/* ── Action (conditional) ── */}
        {actionConfig && (
          <div>
            <label style={labelStyle(colors)}>
              Action <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              style={inp(colors, !!action)}
              onFocus={(e) => {
                e.target.style.borderColor = "#2196F3";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = action
                  ? "#2196F3"
                  : colors.cardBorder;
              }}
            >
              <option value="">Select action...</option>
              {actionConfig.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            {!action && (
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

        {/* ── Decision Result — LRD Chief Admin or OD-Releasing ── */}
        {needsAuthority && (
          <div>
            <label style={labelStyle(colors)}>
              Decision Result <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={decisionResult}
              onChange={(e) => setDecisionResult(e.target.value)}
              style={inp(colors, !!decisionResult)}
            >
              <option value="">Select result...</option>
              {decisionResultOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            {!decisionResult && (
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

        {/* ── Decision Authority — LRD Chief Admin or OD-Releasing ── */}
        {needsAuthority && (
          <div>
            <label style={labelStyle(colors)}>
              Decision Authority <span style={{ color: "#ef4444" }}>*</span>
            </label>
            {loadingAuthority ? (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  color: colors.textTertiary,
                  fontSize: "0.85rem",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
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
                value={decisionAuthorityId ?? ""}
                onChange={(e) => {
                  const selected = authorityOptions.find(
                    (u) => String(u.id) === e.target.value,
                  );
                  if (selected) {
                    setDecisionAuthorityId(selected.id);
                    const fullName =
                      selected.first_name &&
                      (selected.last_name || selected.surname)
                        ? `${selected.first_name} ${selected.last_name ?? selected.surname}`
                        : selected.username;
                    setDecisionAuthorityName(fullName);
                  } else {
                    setDecisionAuthorityId(null);
                    setDecisionAuthorityName("");
                  }
                }}
                style={inp(colors, !!decisionAuthorityId)}
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

        {/* ── Remarks ── */}
        <div>
          <label style={labelStyle(colors)}>Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter your remarks and findings..."
            rows={3}
            style={{
              width: "100%",
              padding: "0.7rem 0.9rem",
              background: colors.inputBg,
              border: `1.5px solid ${colors.cardBorder}`,
              borderRadius: 8,
              color: colors.textPrimary,
              fontSize: "0.85rem",
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#2196F3";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = colors.cardBorder;
            }}
          />
        </div>

        {/* ── Assignee — hidden for return decisions ── */}
        {needsAssignee && (
          <div>
            <label style={{ ...labelStyle(colors), marginBottom: "0.5rem" }}>
              Assign to {config.nextStep}{" "}
              <span style={{ color: "#ef4444" }}>*</span>
            </label>
            {loadingUsers ? (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  color: colors.textTertiary,
                  fontSize: "0.85rem",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    border: "2px solid #2196F330",
                    borderTopColor: "#2196F3",
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                  }}
                />
                Loading {config.nextStep} users...
              </div>
            ) : users.length === 0 ? (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 8,
                  color: "#ef4444",
                  fontSize: "0.82rem",
                }}
              >
                ⚠️ No {config.nextStep} users found. Please contact your
                administrator.
              </div>
            ) : (
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                style={inp(colors, !!assignee)}
              >
                <option value="">— Select {config.nextStep} —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.username}>
                    {u.username} — {u.first_name} {u.surname}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* ── Auto-detect notice for return decisions ── */}
        {isReturnDecision && decision && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(16,185,129,0.07)",
              border: "1px solid rgba(16,185,129,0.25)",
              borderRadius: 8,
              display: "flex",
              alignItems: "flex-start",
              gap: "0.6rem",
            }}
          >
            <span style={{ fontSize: "1rem", marginTop: "0.05rem" }}>🔒</span>
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#047857",
                  marginBottom: "0.2rem",
                }}
              >
                AUTO-DETECTED
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#065f46",
                  lineHeight: 1.5,
                }}
              >
                Each record will be automatically returned to its{" "}
                <strong>previous Quality Evaluation evaluator</strong> based on
                its application log history. No manual assignee needed.
              </div>
            </div>
          </div>
        )}

        {/* ── Signed Date — OD-Releasing only ── */}
        {config.requiresSignedDate && (
          <div>
            <label style={{ ...labelStyle(colors), marginBottom: "0.5rem" }}>
              Signed Date{" "}
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 400,
                  textTransform: "none",
                  color: colors.textTertiary,
                }}
              >
                (used in Doctrack Remarks)
              </span>
            </label>
            <input
              type="date"
              value={signedDate}
              onChange={(e) => handleSignedDateChange(e.target.value)}
              style={{ ...inp(colors, true), color: colors.textPrimary }}
            />
            <p
              style={{
                fontSize: "0.68rem",
                color: colors.textTertiary,
                marginTop: "0.3rem",
                marginBottom: 0,
              }}
            >
              📅 Default is today. Changing this updates Doctrack Remarks below.
            </p>
          </div>
        )}

        {/* ── Doctrack Remarks — UI kept, not passed to API for now ── */}
        <div>
          <label style={labelStyle(colors)}>Doctrack Remarks</label>
          <textarea
            value={doctrackRemarks}
            onChange={(e) => setDoctrackRemarks(e.target.value)}
            rows={2}
            placeholder="Doctrack remarks..."
            style={{
              width: "100%",
              padding: "0.7rem 0.9rem",
              background: colors.inputBg,
              border: `1.5px solid ${doctrackRemarks ? "#2196F3" : colors.cardBorder}`,
              borderRadius: 8,
              color: colors.textPrimary,
              fontSize: "0.85rem",
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
          />
        </div>

        {/* Warning note */}
        <div
          style={{
            padding: "0.85rem 1rem",
            background: config.isEndTask
              ? "rgba(16,185,129,0.06)"
              : "rgba(245,158,11,0.06)",
            border: `1px solid ${config.isEndTask ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
            borderRadius: 8,
            fontSize: "0.78rem",
            color: colors.textSecondary,
            lineHeight: 1.6,
          }}
        >
          {config.isEndTask ? (
            <>
              <strong style={{ color: "#059669" }}>✅ Note:</strong> This will
              mark the <strong>{config.fromLabel}</strong> log as{" "}
              <strong>Completed</strong> for each selected record. This action
              cannot be undone.
            </>
          ) : isReturnDecision ? (
            <>
              <strong style={{ color: "#b45309" }}>⚠ Note:</strong> This will
              complete the current <strong>{config.fromLabel}</strong> log and
              return each record to its previous{" "}
              <strong>Quality Evaluation</strong> evaluator. This action cannot
              be undone.
            </>
          ) : (
            <>
              <strong style={{ color: "#b45309" }}>⚠ Note:</strong> This will
              complete the current <strong>{config.fromLabel}</strong> log for
              each selected record and create a new{" "}
              <strong>{config.nextStep}</strong> log assigned to the selected
              user. This action cannot be undone.
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "1rem 1.5rem",
          borderTop: `1px solid ${colors.cardBorder}`,
          background: darkMode ? "#1a1a1a" : "#f6f8fd",
          display: "flex",
          gap: "0.75rem",
          justifyContent: "flex-end",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          style={{
            padding: "0.6rem 1.25rem",
            borderRadius: 8,
            border: `1px solid ${colors.cardBorder}`,
            background: "transparent",
            color: colors.textSecondary,
            fontSize: "0.85rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={isDisabled}
          style={{
            padding: "0.6rem 1.5rem",
            borderRadius: 8,
            border: "none",
            background: isDisabled
              ? config.isEndTask
                ? "rgba(16,185,129,0.4)"
                : "rgba(33,150,243,0.4)"
              : config.isEndTask
                ? "linear-gradient(135deg,#10b981,#059669)"
                : "linear-gradient(135deg,#2196F3,#1565c0)",
            color: "#fff",
            fontSize: "0.85rem",
            fontWeight: 700,
            cursor: isDisabled ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            boxShadow: isDisabled
              ? "none"
              : config.isEndTask
                ? "0 2px 8px rgba(16,185,129,0.35)"
                : "0 2px 8px rgba(33,150,243,0.35)",
            transition: "all 0.2s",
          }}
        >
          {submitting ? (
            <>
              <Spinner />
              Processing…
            </>
          ) : config.isEndTask ? (
            <>✅ Confirm End Task ({selectedCount})</>
          ) : (
            <>📋 Confirm ({selectedCount})</>
          )}
        </button>
      </div>
    </div>,
  );
}
