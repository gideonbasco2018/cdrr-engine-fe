import { useState, useRef } from "react";
import { tableColumns, COLUMN_DB_KEY_MAP } from "./tableColumns";
import TablePagination from "./TablePagination";
import ViewDetailsModal from "./ViewDetailsModal";
import DoctrackModal from "../../components/reports/actions/DoctrackModal";
import ApplicationLogsModal from "./ApplicationLogsModal";
import ChangeLogModal from "../tasks/ChangeLogModal";
import { markWorkflowTasksAsReceived } from "../../api/workflow-tasks";
import { getUsersByGroup } from "../../api/auth";
import {
  getLastApplicationLogIndex,
  updateApplicationLog,
  createApplicationLog,
} from "../../api/application-logs";
import { updateUploadReport } from "../../api/reports";

const todayStr = () => new Date().toISOString().split("T")[0];

const countWorkingDays = (startStr, endStr) => {
  if (!endStr) return null;
  let count = 0;
  const current = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  if (end <= current) return 0;
  while (current < end) {
    current.setDate(current.getDate() + 1);
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
};

const getDeadlineUrgency = (deadlineDateStr) => {
  if (!deadlineDateStr) return null;
  const today = new Date(todayStr() + "T00:00:00");
  const end = new Date(deadlineDateStr + "T00:00:00");
  if (end < today) return "overdue";
  if (end.toDateString() === today.toDateString()) return "today";
  const wdays = countWorkingDays(todayStr(), deadlineDateStr);
  if (wdays <= 3) return "critical";
  if (wdays <= 5) return "warning";
  return "ok";
};

const URGENCY_CONFIG = {
  overdue: {
    bg: "rgba(239,68,68,0.12)",
    color: "#fca5a5",
    border: "#ef4444",
    icon: "🚨",
  },
  today: {
    bg: "rgba(249,115,22,0.12)",
    color: "#fdba74",
    border: "#f97316",
    icon: "🔴",
  },
  critical: {
    bg: "rgba(245,158,11,0.12)",
    color: "#fcd34d",
    border: "#f59e0b",
    icon: "🟠",
  },
  warning: {
    bg: "rgba(234,179,8,0.10)",
    color: "#fde68a",
    border: "#eab308",
    icon: "🟡",
  },
  ok: {
    bg: "rgba(16,185,129,0.08)",
    color: "#6ee7b7",
    border: "#10b981",
    icon: "🟢",
  },
};

// ── Bulk Deck config per tab ─────────────────────────────────────────
const BULK_DECK_CONFIG = {
  Checking: {
    nextStep: "Supervisor",
    nextGroupId: 5,
    decision: "Endorse to Supervisor",
    fromLabel: "Checking",
    buttonLabel: "Endorse Selected Applications",
    modalTitle: "Endorse Selected Applications to Supervisor",
  },
  Supervisor: {
    nextStep: "QA Admin",
    nextGroupId: 16,
    decision: "Endorse to QA Admin",
    fromLabel: "Supervisor",
    buttonLabel: "Endorse Selected Applications",
    modalTitle: "Endorse Selected Applications to QA Admin",
  },
  "QA Admin": {
    nextStep: "LRD Chief Admin",
    nextGroupId: 17,
    decision: "Endorse to LRD Chief Admin",
    fromLabel: "QA Admin",
    buttonLabel: "Endorse Selected Applications",
    modalTitle: "Endorse Selected Applications to LRD Chief Admin",
  },
  "LRD Chief Admin": {
    nextStep: "OD-Receiving", // ← renamed from "Director Receiving"
    nextGroupId: 18,
    decision: "Endorse to OD-Receiving",
    fromLabel: "LRD Chief Admin",
    buttonLabel: "Endorse Selected Applications",
    modalTitle: "Endorse Selected Applications to OD-Receiving",
  },
  // ── NEW: OD-Receiving (was "Director Receiving") ──
  "OD-Receiving": {
    nextStep: "OD-Releasing",
    nextGroupId: 19,
    decision: "Endorse to OD-Releasing",
    fromLabel: "OD-Receiving",
    buttonLabel: "Endorse Selected Applications",
    modalTitle: "Endorse Selected Applications to OD-Releasing",
  },
  // ── NEW: OD-Releasing (was "Director Releasing") ──
  "OD-Releasing": {
    nextStep: "Releasing Officer",
    nextGroupId: 8,
    decision: "Endorse to Releasing Officer",
    fromLabel: "OD-Releasing",
    buttonLabel: "Endorse Selected Applications",
    modalTitle: "Endorse Selected Applications to Releasing Officer",
  },
  "Releasing Officer": {
    nextStep: null,
    nextGroupId: null,
    decision: "Released",
    fromLabel: "Releasing Officer",
    isEndTask: true,
  },
};

/* ================================================================== */
/*  Bulk Deck Modal                                                     */
/* ================================================================== */
function BulkDeckModal({
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
  const submittingRef = useRef(false);
  const [screen, setScreen] = useState("form");
  const [result, setResult] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useState(() => {
    if (config.isEndTask) return;
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
  }, []);

  const handleConfirm = async () => {
    if (submittingRef.current) return;
    if (!config.isEndTask && !assignee) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await onConfirm(config.isEndTask ? null : assignee);
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

  const isDisabled =
    submitting || loadingUsers || (!config.isEndTask && !assignee);

  // ── Screen: ask to download transmittal ──
  if (screen === "transmittal_prompt") {
    return (
      <div
        onClick={onClose}
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
                  Successfully endorsed
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

            {!config.isEndTask && (
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
                Would you like to generate and download a transmittal slip for
                the <strong>{result?.success}</strong> successfully{" "}
                {config.isEndTask ? "ended" : "endorsed"} record
                {result?.success !== 1 ? "s" : ""}?{" "}
                <span style={{ color: colors.textTertiary }}>
                  (PDF + Excel)
                </span>
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
                    <span
                      style={{
                        display: "inline-block",
                        width: 13,
                        height: 13,
                        border: "2px solid rgba(255,255,255,0.4)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin 0.6s linear infinite",
                      }}
                    />
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
        </div>
      </div>
    );
  }

  // ── Screen: done ──
  if (screen === "done") {
    return (
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          background: "rgba(0,0,0,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}
      >
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
        </div>
      </div>
    );
  }

  // ── Screen: form ──
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 16,
          overflow: "hidden",
          width: 500,
          maxWidth: "94%",
          maxHeight: "88vh",
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
              </span>{" "}
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
                ) : (
                  <>
                    All will be endorsed from{" "}
                    <strong>{config.fromLabel}</strong> →{" "}
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
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: colors.textTertiary,
                marginBottom: "0.5rem",
              }}
            >
              📋 DTNs to be {config.isEndTask ? "completed" : "endorsed"} (
              {selectedDtns.length})
            </label>
            <div
              style={{
                maxHeight: 180,
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

          {/* Assignee dropdown — hidden for end task */}
          {!config.isEndTask && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: colors.textTertiary,
                  marginBottom: "0.5rem",
                }}
              >
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
                  style={{
                    width: "100%",
                    padding: "0.7rem 0.9rem",
                    background: colors.inputBg,
                    border: `1.5px solid ${assignee ? "#2196F3" : colors.cardBorder}`,
                    borderRadius: 8,
                    color: assignee ? colors.textPrimary : colors.textTertiary,
                    fontSize: "0.88rem",
                    outline: "none",
                    cursor: "pointer",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box",
                  }}
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
                <strong>Completed</strong> for each selected record. The task
                will be fully ended. This action cannot be undone.
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

        {/* Footer buttons */}
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
                <span
                  style={{
                    display: "inline-block",
                    width: 13,
                    height: 13,
                    border: "2px solid rgba(255,255,255,0.4)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                  }}
                />
                Processing…
              </>
            ) : config.isEndTask ? (
              <>✅ Confirm End Task ({selectedCount})</>
            ) : (
              <>📋 Confirm Endorsement ({selectedCount})</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  DataTable                                                           */
/* ================================================================== */
function DataTable({
  data,
  selectedRows,
  onSelectRow,
  onSelectAll,
  currentPage,
  rowsPerPage,
  totalRecords,
  totalPages,
  onPageChange,
  onRowsPerPageChange,
  colors,
  activeTab,
  onRefresh,
  onClearSelections,
  indexOfFirstRow,
  indexOfLastRow,
  darkMode,
  onSort,
  sortBy,
  sortOrder,
  readIds = new Set(),
  onMarkAsRead,
  activeSubTab = "not_yet",
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedRowDetails, setSelectedRowDetails] = useState(null);
  const [doctrackModalRecord, setDoctrackModalRecord] = useState(null);
  const [appLogsRecord, setAppLogsRecord] = useState(null);
  const [changeLogRecord, setChangeLogRecord] = useState(null);
  const [markingReceived, setMarkingReceived] = useState(false);
  const [confirmReceive, setConfirmReceive] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [showBulkDeck, setShowBulkDeck] = useState(false);

  const isComplianceTab = activeTab === "Compliance";
  const isReceivedSubTab = activeSubTab === "received";
  const showMarkAsReceived = activeSubTab !== "received";

  const bulkDeckConfig = BULK_DECK_CONFIG[activeTab] ?? null;
  const showBulkDeckBtn =
    !!bulkDeckConfig && isReceivedSubTab && selectedRows.length > 0;

  const RECORD_TAB_COLUMNS = [
    "dtn",
    "estCat",
    "ltoCompany",
    "ltoAdd",
    "prodGenName",
    "prodBrName",
    "prodDosStr",
    "prodDosForm",
    "regNo",
    "appType",
  ];

  const isRecordTab = activeTab === "Record";

  const visibleColumns = isRecordTab
    ? RECORD_TAB_COLUMNS.map((key) =>
        tableColumns.find((col) => col.key === key),
      ).filter(Boolean)
    : tableColumns.filter((col) => !col.complianceOnly || isComplianceTab);

  const getDbKey = (k) => COLUMN_DB_KEY_MAP[k] || k;
  const handleSort = (k) => {
    if (!onSort || k === "statusTimeline" || k === "deadlineDate") return;
    const db = getDbKey(k);
    onSort(db, sortBy === db && sortOrder === "asc" ? "desc" : "asc");
  };

  const SortIcon = ({ colKey }) => {
    if (colKey === "statusTimeline" || colKey === "deadlineDate") return null;
    const db = getDbKey(colKey);
    const on = sortBy === db;
    return (
      <span
        style={{
          display: "inline-flex",
          flexDirection: "column",
          marginLeft: 4,
          lineHeight: 1,
          verticalAlign: "middle",
          gap: 1,
        }}
      >
        <span
          style={{
            fontSize: "0.48rem",
            lineHeight: 1,
            color: on && sortOrder === "asc" ? "#4CAF50" : colors.textTertiary,
            opacity: on && sortOrder === "asc" ? 1 : 0.3,
          }}
        >
          ▲
        </span>
        <span
          style={{
            fontSize: "0.48rem",
            lineHeight: 1,
            color: on && sortOrder === "desc" ? "#4CAF50" : colors.textTertiary,
            opacity: on && sortOrder === "desc" ? 1 : 0.3,
          }}
        >
          ▼
        </span>
      </span>
    );
  };

  const activeSortLabel = (() => {
    const e = Object.entries(COLUMN_DB_KEY_MAP).find(([, db]) => db === sortBy);
    if (!e) return sortBy;
    return tableColumns.find((c) => c.key === e[0])?.label || sortBy;
  })();

  const calcTimeline = (row) => {
    const {
      dateReceivedCent,
      dateReleased,
      dbTimelineCitizenCharter: tl,
    } = row;
    if (!dateReceivedCent || !tl || dateReceivedCent === "N/A" || tl === null)
      return { status: "", days: 0 };
    const r = new Date(dateReceivedCent);
    const e =
      dateReleased && dateReleased !== "N/A"
        ? new Date(dateReleased)
        : new Date();
    if (isNaN(r) || isNaN(e)) return { status: "", days: 0 };
    const d = Math.ceil(Math.abs(e - r) / 864e5);
    return d <= parseInt(tl, 10)
      ? { status: "WITHIN", days: d }
      : { status: "BEYOND", days: d };
  };

  const renderTimeline = (row) => {
    const { status, days } = calcTimeline(row);
    if (!status)
      return (
        <span style={{ color: colors.textTertiary, fontSize: "0.8rem" }}>
          N/A
        </span>
      );
    const ok = status === "WITHIN";
    return (
      <span
        style={{
          padding: "0.4rem 0.9rem",
          background: ok
            ? "linear-gradient(135deg,#10b981,#059669)"
            : "linear-gradient(135deg,#ef4444,#dc2626)",
          color: "#fff",
          borderRadius: 8,
          fontSize: "0.72rem",
          fontWeight: 700,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          boxShadow: ok
            ? "0 2px 8px rgba(16,185,129,.3)"
            : "0 2px 8px rgba(239,68,68,.3)",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <span>{ok ? "✓" : "⚠"}</span>
        {ok ? `Within (${days}d)` : `Beyond (${days}d)`}
      </span>
    );
  };

  const renderDeadline = (row) => {
    const dl = row.deadlineDate;
    if (!dl)
      return (
        <span
          style={{
            color: colors.textTertiary,
            fontSize: "0.78rem",
            fontStyle: "italic",
          }}
        >
          —
        </span>
      );
    const urgency = getDeadlineUrgency(dl);
    const cfg = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.ok;
    const wdays = countWorkingDays(todayStr(), dl);
    const dateLabel = new Date(dl + "T00:00:00").toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <span
          style={{ fontSize: "0.78rem", fontWeight: 600, color: cfg.color }}
        >
          {cfg.icon} {dateLabel}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.15rem 0.5rem",
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            borderRadius: 4,
            fontSize: "0.65rem",
            fontWeight: 700,
            color: cfg.color,
            width: "fit-content",
          }}
        >
          {urgency === "overdue"
            ? "🚨 OVERDUE"
            : urgency === "today"
              ? "🔴 DUE TODAY"
              : `${wdays} working day${wdays !== 1 ? "s" : ""} left`}
        </span>
      </div>
    );
  };

  const pill = (bg, shadow, text) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.4rem 0.9rem",
        background: bg,
        color: "#fff",
        borderRadius: 8,
        fontSize: "0.72rem",
        fontWeight: 700,
        boxShadow: `0 2px 8px ${shadow}`,
      }}
    >
      {text || "N/A"}
    </span>
  );
  const renderDTN = (v) =>
    pill("linear-gradient(135deg,#8b5cf6,#7c3aed)", "rgba(139,92,246,.3)", v);
  const renderGenericName = (v) =>
    pill("linear-gradient(135deg,#06b6d4,#0891b2)", "rgba(6,182,212,.3)", v);
  const renderBrandName = (v) =>
    pill("linear-gradient(135deg,#f59e0b,#d97706)", "rgba(245,158,11,.3)", v);
  const renderTypeDoc = (typeDoc) => {
    const u = typeDoc?.toUpperCase();
    if (u?.includes("CPR"))
      return pill(
        "linear-gradient(135deg,#10b981,#059669)",
        "rgba(16,185,129,.3)",
        typeDoc,
      );
    if (u?.includes("LOD"))
      return pill(
        "linear-gradient(135deg,#ef4444,#dc2626)",
        "rgba(239,68,68,.3)",
        typeDoc,
      );
    if (u?.includes("CERT"))
      return pill(
        "linear-gradient(135deg,#3b82f6,#2563eb)",
        "rgba(59,130,246,.3)",
        typeDoc,
      );
    return (
      <span style={{ fontSize: "0.85rem", color: colors.tableText }}>
        {typeDoc || "N/A"}
      </span>
    );
  };
  const renderStatus = (status) => {
    const u = status?.toUpperCase();
    const map = {
      COMPLETED: {
        bg: "linear-gradient(135deg,#10b981,#059669)",
        sh: "rgba(16,185,129,.3)",
        icon: "✓",
        label: "Completed",
      },
      TO_DO: {
        bg: "linear-gradient(135deg,#f59e0b,#d97706)",
        sh: "rgba(245,158,11,.3)",
        icon: "⏳",
        label: "To Do",
      },
      APPROVED: {
        bg: "linear-gradient(135deg,#3b82f6,#2563eb)",
        sh: "rgba(59,130,246,.3)",
        icon: "✅",
        label: "Approved",
      },
      PENDING: {
        bg: "linear-gradient(135deg,#eab308,#ca8a04)",
        sh: "rgba(234,179,8,.3)",
        icon: "⏸",
        label: "Pending",
      },
      REJECTED: {
        bg: "linear-gradient(135deg,#ef4444,#dc2626)",
        sh: "rgba(239,68,68,.3)",
        icon: "✗",
        label: "Rejected",
      },
    };
    const c = map[u] || {
      bg: "linear-gradient(135deg,#6b7280,#4b5563)",
      sh: "rgba(107,114,128,.3)",
      icon: "•",
      label: status || "N/A",
    };
    return (
      <span
        style={{
          padding: "0.4rem 0.9rem",
          background: c.bg,
          color: "#fff",
          borderRadius: 8,
          fontSize: "0.72rem",
          fontWeight: 700,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          boxShadow: `0 2px 8px ${c.sh}`,
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <span>{c.icon}</span>
        {c.label}
      </span>
    );
  };

  const plainCell = (v) =>
    v != null && v !== "" ? (
      <span style={{ fontSize: "0.78rem", color: colors.tableText }}>{v}</span>
    ) : (
      <span
        style={{
          color: colors.textTertiary,
          fontSize: "0.78rem",
          fontStyle: "italic",
        }}
      >
        N/A
      </span>
    );
  const wrapCell = (v) =>
    v != null && v !== "" ? (
      <span
        style={{
          fontSize: "0.78rem",
          color: colors.tableText,
          whiteSpace: "normal",
          wordBreak: "break-word",
          lineHeight: 1.5,
        }}
      >
        {v}
      </span>
    ) : (
      <span
        style={{
          color: colors.textTertiary,
          fontSize: "0.75rem",
          fontStyle: "italic",
        }}
      >
        N/A
      </span>
    );
  const numCell = (v) =>
    v != null && v !== "" ? (
      <span
        style={{
          fontSize: "0.78rem",
          color: colors.tableText,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {Number(v).toLocaleString()}
      </span>
    ) : (
      <span
        style={{
          color: colors.textTertiary,
          fontSize: "0.75rem",
          fontStyle: "italic",
        }}
      >
        —
      </span>
    );

  const renderCell = (col, row) => {
    const v = row[col.key];
    switch (col.key) {
      case "dtn":
        return renderDTN(v);
      case "prodGenName":
        return renderGenericName(v);
      case "prodBrName":
        return renderBrandName(v);
      case "appStatus":
        return renderStatus(v);
      case "statusTimeline":
        return renderTimeline(row);
      case "typeDocReleased":
        return renderTypeDoc(v);
      case "deadlineDate":
        return renderDeadline(row);
      case "dbTimelineCitizenCharter":
        return plainCell(v);
      case "fee":
      case "lrf":
      case "surc":
      case "total":
        return numCell(v);
      case "ammend1":
      case "ammend2":
      case "ammend3":
        return plainCell(v);
      case "cprCondRemarks":
      case "cprCondAddRemarks":
      case "appRemarks":
      case "remarks1":
        return wrapCell(v);
      case "cprCond":
        return v ? (
          <span
            style={{
              padding: "0.3rem 0.7rem",
              background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
              color: "#fff",
              borderRadius: 6,
              fontSize: "0.72rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              boxShadow: "0 2px 6px rgba(124,58,237,0.3)",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {v}
          </span>
        ) : (
          plainCell(null)
        );
      case "secpa":
        return v ? (
          <span
            style={{
              padding: "0.3rem 0.7rem",
              background: "linear-gradient(135deg,#0891b2,#0e7490)",
              color: "#fff",
              borderRadius: 6,
              fontSize: "0.72rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              boxShadow: "0 2px 6px rgba(8,145,178,0.3)",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {v}
          </span>
        ) : (
          plainCell(null)
        );
      case "attaReleased":
        return renderTypeDoc(v);
      case "certification":
        return v ? (
          <span
            style={{
              padding: "0.3rem 0.7rem",
              background: "linear-gradient(135deg,#d97706,#b45309)",
              color: "#fff",
              borderRadius: 6,
              fontSize: "0.72rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              boxShadow: "0 2px 6px rgba(217,119,6,0.3)",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {v}
          </span>
        ) : (
          plainCell(null)
        );
      default:
        return plainCell(v);
    }
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };
  const openDetails = (r) => {
    setOpenMenuId(null);
    onMarkAsRead?.(r.id);
    setSelectedRowDetails(r);
  };
  const openDoctrack = (r) => {
    setOpenMenuId(null);
    onMarkAsRead?.(r.id);
    setDoctrackModalRecord(r);
  };
  const openAppLogs = (r) => {
    setOpenMenuId(null);
    onMarkAsRead?.(r.id);
    setAppLogsRecord(r);
  };
  const openChangeLog = (r) => {
    setOpenMenuId(null);
    onMarkAsRead?.(r.id);
    setChangeLogRecord(r);
  };

  const handleMarkAsReceived = async () => {
    if (!selectedRows.length || markingReceived) return;
    setMarkingReceived(true);
    try {
      await markWorkflowTasksAsReceived(selectedRows);
      if (onClearSelections) onClearSelections();
      if (onRefresh) await onRefresh();
    } catch (e) {
      console.error("Mark as Received error:", e);
    } finally {
      setMarkingReceived(false);
    }
  };

  /* ── Bulk Deck / End Task handler ── */
  const handleBulkDeck = async (assigneeUsername) => {
    if (!bulkDeckConfig) return { success: 0, failed: 0 };

    // ← FIX 3: deduplicate selectedRows to prevent processing the same record twice
    const seen = new Set();
    const selectedData = data
      .filter((r) => selectedRows.includes(r.id))
      .filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });

    let success = 0,
      failed = 0;
    const now = new Date();
    const formattedDateTime = new Date(
      now.getTime() + 8 * 60 * 60 * 1000,
    ).toISOString();

    for (const row of selectedData) {
      try {
        const { id: logId, mainDbId } = row;

        if (bulkDeckConfig.isEndTask) {
          await updateApplicationLog(logId, {
            application_status: "COMPLETED",
            application_decision: bulkDeckConfig.decision,
            application_remarks: "",
            accomplished_date: formattedDateTime,
            del_last_index: 0,
            del_thread: "Close",
          });
          await updateUploadReport(mainDbId, { DB_APP_STATUS: "COMPLETED" });
        } else {
          const indexData = await getLastApplicationLogIndex(mainDbId);
          const lastIndex = indexData.last_index;
          const nextIndex = lastIndex + 1;

          await updateApplicationLog(logId, {
            application_status: "COMPLETED",
            application_decision: bulkDeckConfig.decision,
            application_remarks: "",
            accomplished_date: formattedDateTime,
            del_last_index: 0,
            del_thread: "Close",
          });

          await createApplicationLog({
            main_db_id: mainDbId,
            application_step: bulkDeckConfig.nextStep,
            user_name: assigneeUsername,
            application_status: "IN PROGRESS",
            application_decision: "",
            application_remarks: "",
            start_date: formattedDateTime,
            accomplished_date: null,
            del_index: nextIndex,
            del_previous: lastIndex,
            del_last_index: 1,
            del_thread: "Open",
          });
        }
        success++;
      } catch (e) {
        console.error(`Bulk deck failed for row id ${row.id}:`, e);
        failed++;
      }
    }
    return { success, failed };
  };

  /* ── Excel transmittal generator ── */
  const handleGenerateExcel = async () => {
    if (!selectedRows.length) return;
    const loadScript = (src) =>
      new Promise((res, rej) => {
        if (document.querySelector(`script[src="${src}"]`)) return res();
        const s = document.createElement("script");
        s.src = src;
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
      });

    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
    );

    const selectedData = data.filter((r) => selectedRows.includes(r.id));
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const wsData = [
      ["TRANSMITTAL SLIP — FDA Center for Drug Regulation and Research (CDRR)"],
      [
        `Generated: ${dateStr} ${timeStr}`,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        `Total Records: ${selectedData.length}`,
      ],
      [],
      [
        "#",
        "DTN",
        "Category",
        "LTO Company",
        "Brand Name",
        "Generic Name",
        "Dosage Strength",
        "Dosage Form",
        "App No.",
        "App Type",
        "Amendment 1",
        "Amendment 2",
        "Amendment 3",
        "Date Rcvd FDAC",
      ],
    ];

    selectedData.forEach((r, i) => {
      wsData.push([
        i + 1,
        r.dtn ?? "—",
        r.estCat ?? "—",
        r.ltoCompany ?? "—",
        r.prodBrName ?? "—",
        r.prodGenName ?? "—",
        r.prodDosStr ?? "—",
        r.prodDosForm ?? "—",
        r.regNo ?? "—",
        r.appType ?? "—",
        r.ammend1 && r.ammend1 !== "N/A" ? r.ammend1 : "",
        r.ammend2 && r.ammend2 !== "N/A" ? r.ammend2 : "",
        r.ammend3 && r.ammend3 !== "N/A" ? r.ammend3 : "",
        r.dateReceivedFdac ?? "—",
      ]);
    });

    wsData.push([], []);

    let preparedBy = "";
    try {
      const raw =
        localStorage.getItem("user") || sessionStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        preparedBy = `${u.first_name || ""} ${u.surname || ""}`.trim();
      }
    } catch (_) {}
    if (!preparedBy) preparedBy = "___________________";

    wsData.push([`Prepared by/Date: ${preparedBy} / ${dateStr}`]);
    wsData.push(["Received by Name/Date:"]);
    wsData.push([]);
    wsData.push(["MELODY M. ZAMUDIO, RPh, MGM-ESP"]);
    wsData.push(["FDRO V/Chief, LRD"]);
    wsData.push(["Center for Drug Regulation and Research"]);
    wsData.push([]);
    wsData.push([
      "NON-ACCEPTANCE AND SWITCHING REQUIRES PRIOR APPROVAL BY CHIEF LRD",
    ]);

    const ws = window.XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 4 },
      { wch: 22 },
      { wch: 12 },
      { wch: 36 },
      { wch: 30 },
      { wch: 30 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ];
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }];
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Transmittal");
    window.XLSX.writeFile(
      wb,
      `transmittal_${activeTab ?? "task"}_${now.toISOString().slice(0, 10)}.xlsx`,
    );
  };

  /* ── PDF + Excel transmittal ── */
  const handleGenerateTransmittal = async () => {
    if (!selectedRows.length) return;
    const loadScript = (src) =>
      new Promise((res, rej) => {
        if (document.querySelector(`script[src="${src}"]`)) return res();
        const s = document.createElement("script");
        s.src = src;
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
      });
    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    );
    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",
    );
    await loadScript(
      "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js",
    );
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const selectedData = data.filter((r) => selectedRows.includes(r.id));
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const genBarcode = (value) => {
      try {
        const canvas = document.createElement("canvas");
        window.JsBarcode(canvas, String(value), {
          format: "CODE128",
          width: 1.4,
          height: 14,
          displayValue: false,
          margin: 1,
          background: "#ffffff",
          lineColor: "#000000",
        });
        return canvas.toDataURL("image/png");
      } catch {
        return null;
      }
    };
    const barcodeImages = selectedData.map((r) =>
      genBarcode(r.dtn && r.dtn !== "N/A" ? r.dtn : "N/A"),
    );
    doc.setFillColor(25, 118, 210);
    doc.rect(0, 0, pageW, 16, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TRANSMITTAL SLIP", 10, 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("FDA Center for Drug Regulation and Research (CDRR)", 10, 13);
    doc.text(`Generated: ${dateStr}  ${timeStr}`, pageW - 10, 7, {
      align: "right",
    });
    doc.text(`Total records: ${selectedData.length}`, pageW - 10, 13, {
      align: "right",
    });
    const cols = [
      { header: "#", dataKey: "_no" },
      { header: "Barcode", dataKey: "_barcode" },
      { header: "DTN", dataKey: "dtn" },
      { header: "Category", dataKey: "estCat" },
      { header: "LTO Company", dataKey: "ltoCompany" },
      { header: "Product Information", dataKey: "_productInfo" },
      { header: "Dosage", dataKey: "_dosage" },
      { header: "App No.", dataKey: "regNo" },
      { header: "App Type", dataKey: "_appTypeFull" },
      { header: "Date Rcvd FDAC", dataKey: "dateReceivedFdac" },
    ];
    const rows = selectedData.map((r, i) => {
      const brand =
        r.prodBrName && r.prodBrName !== "N/A" ? `Brand: ${r.prodBrName}` : "";
      const generic =
        r.prodGenName && r.prodGenName !== "N/A"
          ? `Generic: ${r.prodGenName}`
          : "";
      const productInfo = [brand, generic].filter(Boolean).join("\n") || "—";
      const strength =
        r.prodDosStr && r.prodDosStr !== "N/A" ? r.prodDosStr : "";
      const form =
        r.prodDosForm && r.prodDosForm !== "N/A" ? r.prodDosForm : "";
      const dosage = [strength, form].filter(Boolean).join(" / ") || "—";
      const amendments = [r.ammend1, r.ammend2, r.ammend3]
        .filter((a) => a && a !== "N/A" && a.trim() !== "")
        .join(" / ");
      const appTypeFull = [r.appType ?? "—", amendments]
        .filter(Boolean)
        .join("\n");
      return {
        _no: i + 1,
        _barcode: "",
        dtn: r.dtn ?? "—",
        estCat: r.estCat ?? "—",
        ltoCompany: r.ltoCompany ?? "—",
        _productInfo: productInfo,
        _dosage: dosage,
        regNo: r.regNo ?? "—",
        _appTypeFull: appTypeFull,
        dateReceivedFdac: r.dateReceivedFdac ?? "—",
      };
    });
    const BRH = 10,
      BIW = 24,
      BIH = 5;
    doc.autoTable({
      startY: 18,
      columns: cols,
      body: rows,
      theme: "grid",
      styles: {
        fontSize: 6.5,
        cellPadding: 1.2,
        overflow: "linebreak",
        textColor: [30, 30, 30],
        minCellHeight: BRH,
        valign: "middle",
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [21, 101, 192],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 6.5,
        halign: "center",
        minCellHeight: 7,
        valign: "middle",
        cellPadding: 1,
      },
      alternateRowStyles: { fillColor: [240, 247, 255] },
      margin: { left: 6, right: 6 },
      columnStyles: {
        _no: { halign: "center", cellWidth: 7, valign: "middle" },
        _barcode: { cellWidth: 28, halign: "center", valign: "middle" },
        dtn: {
          cellWidth: 28,
          halign: "center",
          valign: "middle",
          fontStyle: "bold",
        },
        estCat: { cellWidth: 14, valign: "middle" },
        ltoCompany: { cellWidth: 42, valign: "middle" },
        _productInfo: { cellWidth: 48, valign: "middle" },
        _dosage: { cellWidth: 30, valign: "middle" },
        regNo: { cellWidth: 22, halign: "center", valign: "middle" },
        _appTypeFull: { cellWidth: 34, valign: "middle" },
        dateReceivedFdac: { cellWidth: 22, halign: "center", valign: "middle" },
      },
      didDrawCell: (h) => {
        if (h.section === "body" && h.column.dataKey === "_barcode") {
          const img = barcodeImages[h.row.index];
          if (img) {
            const cell = h.cell;
            doc.addImage(
              img,
              "PNG",
              cell.x + (cell.width - BIW) / 2,
              cell.y + (cell.height - BIH) / 2,
              BIW,
              BIH,
            );
          }
        }
      },
    });
    const totalPgs = doc.internal.getNumberOfPages();
    for (let pg = 1; pg <= totalPgs; pg++) {
      doc.setPage(pg);
      doc.setFillColor(255, 255, 255);
      doc.rect(0, pageH - 8, pageW, 8, "F");
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(
        `Page ${pg} of ${totalPgs}  |  FDA-CDRR DBMS — Transmittal Slip`,
        pageW / 2,
        pageH - 3,
        { align: "center" },
      );
      doc.setTextColor(30, 30, 30);
    }
    doc.setPage(totalPgs);
    const finalY = doc.lastAutoTable.finalY + 6;
    if (finalY < pageH - 26) {
      let preparedBy = "";
      try {
        const raw =
          localStorage.getItem("user") || sessionStorage.getItem("user");
        if (raw) {
          const u = JSON.parse(raw);
          preparedBy = `${u.first_name || ""} ${u.surname || ""}`.trim();
        }
      } catch (_) {}
      if (!preparedBy) preparedBy = "___________________";
      doc.setDrawColor(160);
      doc.setLineWidth(0.25);
      const col1X = 14,
        col2X = pageW / 2 - 28,
        col3X = pageW - 70,
        baseY = finalY + 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 30, 30);
      doc.text("Prepared by/Date:", col1X, baseY);
      doc.setFont("helvetica", "normal");
      doc.text(
        ` ${preparedBy} / ${dateStr}`,
        col1X + doc.getTextWidth("Prepared by/Date: "),
        baseY,
      );
      doc.setFont("helvetica", "bold");
      doc.text("Received by Name/Date:", col1X, baseY + 12);
      doc.setDrawColor(120);
      doc.line(col1X, baseY + 17, col1X + 65, baseY + 17);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      doc.text("MELODY M. ZAMUDIO, RPh, MGM-ESP", col2X, baseY + 5, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(60);
      doc.text("FDRO V/Chief, LRD", col2X, baseY + 10, { align: "center" });
      doc.text("Center for Drug Regulation and Research", col2X, baseY + 15, {
        align: "center",
      });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 30, 30);
      doc.text("NON-ACCEPTANCE AND SWITCHING", col3X, baseY + 10, {
        align: "center",
      });
      doc.text("REQUIRES PRIOR APPROVAL BY CHIEF LRD", col3X, baseY + 15, {
        align: "center",
      });
    }
    doc.save(
      `transmittal_${activeTab ?? "task"}_${now.toISOString().slice(0, 10)}.pdf`,
    );
    await handleGenerateExcel();
  };

  const menuBtn = (onClick, style = {}, children) => (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "0.75rem 1rem",
        background: "transparent",
        border: "none",
        color: colors.textPrimary,
        fontSize: "0.85rem",
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        transition: "background .2s",
        ...style,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = colors.tableRowHover)
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );

  return (
    <>
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
        }}
      >
        {/* Header bar */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: `1px solid ${colors.tableBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <h3
              style={{
                fontSize: ".8rem",
                fontWeight: 600,
                color: colors.textPrimary,
              }}
            >
              Task Data
            </h3>
            <span
              style={{
                padding: "0.25rem 0.75rem",
                background: colors.badgeBg,
                borderRadius: 12,
                fontSize: "0.6rem",
                color: colors.textTertiary,
                fontWeight: 600,
              }}
            >
              {totalRecords} total records
            </span>

            {selectedRows.length > 0 && showMarkAsReceived && (
              <button
                onClick={() => setConfirmReceive(true)}
                disabled={markingReceived}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.4rem 1rem",
                  background: markingReceived
                    ? "rgba(16,185,129,0.4)"
                    : "linear-gradient(135deg,#10b981,#059669)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  cursor: markingReceived ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 8px rgba(16,185,129,0.35)",
                  letterSpacing: "0.02em",
                }}
              >
                {markingReceived ? (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: 12,
                        height: 12,
                        border: "2px solid rgba(255,255,255,0.4)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    Processing…
                  </>
                ) : (
                  <>
                    <span>✔</span>Mark as Received
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "1.25rem",
                        height: "1.25rem",
                        padding: "0 0.3rem",
                        background: "rgba(255,255,255,0.25)",
                        borderRadius: 999,
                        fontSize: "0.7rem",
                        fontWeight: 800,
                      }}
                    >
                      {selectedRows.length}
                    </span>
                  </>
                )}
              </button>
            )}

            {selectedRows.length > 0 && (
              <button
                onClick={handleGenerateTransmittal}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.4rem 1rem",
                  background: "linear-gradient(135deg,#1976d2,#1565c0)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(25,118,210,0.35)",
                  letterSpacing: "0.02em",
                }}
              >
                <span>📄</span>Generate Transmittal
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "1.25rem",
                    height: "1.25rem",
                    padding: "0 0.3rem",
                    background: "rgba(255,255,255,0.25)",
                    borderRadius: 999,
                    fontSize: "0.7rem",
                    fontWeight: 800,
                  }}
                >
                  {selectedRows.length}
                </span>
              </button>
            )}

            {/* ── Endorse / End Task button ── */}
            {showBulkDeckBtn && (
              <button
                onClick={() => setShowBulkDeck(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.4rem 1rem",
                  background: bulkDeckConfig.isEndTask
                    ? "linear-gradient(135deg,#10b981,#059669)"
                    : "linear-gradient(135deg,#7c3aed,#6d28d9)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: bulkDeckConfig.isEndTask
                    ? "0 2px 8px rgba(16,185,129,0.35)"
                    : "0 2px 8px rgba(124,58,237,0.35)",
                  letterSpacing: "0.02em",
                  transition: "box-shadow .2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow = bulkDeckConfig.isEndTask
                    ? "0 4px 14px rgba(16,185,129,0.5)"
                    : "0 4px 14px rgba(124,58,237,0.5)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow = bulkDeckConfig.isEndTask
                    ? "0 2px 8px rgba(16,185,129,0.35)"
                    : "0 2px 8px rgba(124,58,237,0.35)")
                }
              >
                <span>{bulkDeckConfig.isEndTask ? "✅" : "📋"}</span>
                {bulkDeckConfig.isEndTask
                  ? "End Task"
                  : bulkDeckConfig.buttonLabel || "Bulk Deck"}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "1.25rem",
                    height: "1.25rem",
                    padding: "0 0.3rem",
                    background: "rgba(255,255,255,0.25)",
                    borderRadius: 999,
                    fontSize: "0.7rem",
                    fontWeight: 800,
                  }}
                >
                  {selectedRows.length}
                </span>
              </button>
            )}

            {isComplianceTab && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.68rem",
                  color: colors.textTertiary,
                }}
              >
                <span style={{ color: "#ef4444", fontWeight: 700 }}>
                  🚨 Overdue
                </span>
                <span>·</span>
                <span style={{ color: "#f97316", fontWeight: 700 }}>
                  🔴 Today
                </span>
                <span>·</span>
                <span style={{ color: "#f59e0b", fontWeight: 700 }}>
                  🟠 ≤3 days
                </span>
                <span>·</span>
                <span style={{ color: "#eab308", fontWeight: 700 }}>
                  🟡 ≤5 days
                </span>
                <span>·</span>
                <span style={{ color: "#10b981", fontWeight: 700 }}>🟢 OK</span>
              </div>
            )}
            {sortBy && (
              <span
                style={{
                  fontSize: "0.6rem",
                  color: colors.textTertiary,
                  padding: "0.2rem 0.6rem",
                  background: colors.badgeBg,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                Sorted by{" "}
                <strong style={{ color: "#4CAF50" }}>{activeSortLabel}</strong>
                <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowX: "auto",
            overflowY: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 2000,
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                background: colors.tableBg,
                zIndex: 20,
              }}
            >
              <tr>
                <th
                  style={{
                    padding: "1rem",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    borderRight: `1px solid ${colors.tableBorder}`,
                    background: colors.tableBg,
                    position: "sticky",
                    left: 0,
                    zIndex: 21,
                    width: "50px",
                    minWidth: "50px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      selectedRows.length === data.length && data.length > 0
                    }
                    onChange={onSelectAll}
                    style={{
                      width: 16,
                      height: 16,
                      cursor: "pointer",
                      accentColor: "#4CAF50",
                    }}
                  />
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    borderRight: `1px solid ${colors.tableBorder}`,
                    background: colors.tableBg,
                    position: "sticky",
                    left: "50px",
                    zIndex: 21,
                    width: "60px",
                    minWidth: "60px",
                  }}
                >
                  #
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontSize: "0.6rem",
                      fontWeight: 600,
                      color: col.complianceOnly
                        ? "#f59e0b"
                        : colors.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: `1px solid ${colors.tableBorder}`,
                      borderTop: col.complianceOnly
                        ? "2px solid #f59e0b"
                        : undefined,
                      width: col.width,
                      minWidth: col.width,
                      whiteSpace: "nowrap",
                      ...(col.frozen
                        ? {
                            position: "sticky",
                            left: col.frozenLeft,
                            zIndex: 22,
                            background: colors.tableBg,
                            boxShadow: "2px 0 6px rgba(0,0,0,0.18)",
                          }
                        : {
                            background: col.complianceOnly
                              ? darkMode
                                ? "rgba(245,158,11,0.08)"
                                : "rgba(245,158,11,0.05)"
                              : colors.tableBg,
                          }),
                      cursor:
                        col.key !== "statusTimeline" &&
                        col.key !== "deadlineDate"
                          ? "pointer"
                          : "default",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (
                        col.key !== "statusTimeline" &&
                        col.key !== "deadlineDate"
                      )
                        e.currentTarget.style.background = darkMode
                          ? "#1e1e1e"
                          : "#ebebeb";
                    }}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = col.frozen
                        ? colors.tableBg
                        : col.complianceOnly
                          ? darkMode
                            ? "rgba(245,158,11,0.08)"
                            : "rgba(245,158,11,0.05)"
                          : colors.tableBg)
                    }
                  >
                    <span
                      style={{ display: "inline-flex", alignItems: "center" }}
                    >
                      {col.label}
                      <SortIcon colKey={col.key} />
                    </span>
                  </th>
                ))}
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    width: 80,
                    whiteSpace: "nowrap",
                    position: "sticky",
                    right: 0,
                    background: colors.tableBg,
                    zIndex: 21,
                    boxShadow: "-4px 0 8px rgba(0,0,0,.15)",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 3}
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      color: colors.textTertiary,
                      fontSize: "0.9rem",
                    }}
                  >
                    No records found.
                  </td>
                </tr>
              )}
              {data.map((row, idx) => {
                const sel = selectedRows.includes(row.id);
                const isUnread = !readIds.has(row.id);
                const dl = isComplianceTab ? row.deadlineDate : null;
                const urgency = dl ? getDeadlineUrgency(dl) : null;
                const bg = sel
                  ? "#4CAF5015"
                  : isUnread
                    ? darkMode
                      ? "rgba(33,150,243,0.07)"
                      : "rgba(33,150,243,0.04)"
                    : idx % 2 === 0
                      ? colors.tableRowEven
                      : colors.tableRowOdd;
                const isHovered = hoveredRowId === row.id;
                const solidStickyBg = (() => {
                  if (isHovered) return colors.tableRowHover;
                  if (sel) return darkMode ? "#1a2e1a" : "#edf7ed";
                  if (isUnread) return darkMode ? "#0f1e2e" : "#e8f1fb";
                  return idx % 2 === 0
                    ? colors.tableRowEven
                    : colors.tableRowOdd;
                })();
                const rowBorderLeft = sel
                  ? "3px solid #4CAF50"
                  : isUnread
                    ? "3px solid #2196F3"
                    : urgency === "overdue"
                      ? "3px solid #ef4444"
                      : urgency === "today"
                        ? "3px solid #f97316"
                        : urgency === "critical"
                          ? "3px solid #f59e0b"
                          : urgency === "warning"
                            ? "3px solid #eab308"
                            : "3px solid transparent";
                return (
                  <tr
                    key={row.id}
                    style={{
                      background: isHovered ? colors.tableRowHover : bg,
                      transition: "background .2s",
                      borderLeft: rowBorderLeft,
                    }}
                    onMouseEnter={() => setHoveredRowId(row.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    <td
                      style={{
                        padding: "1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        borderRight: `1px solid ${colors.tableBorder}`,
                        position: "sticky",
                        left: 0,
                        background: solidStickyBg,
                        zIndex: 9,
                        width: "50px",
                        minWidth: "50px",
                        transition: "background .2s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => onSelectRow(row.id)}
                        style={{
                          width: 16,
                          height: 16,
                          cursor: "pointer",
                          accentColor: "#4CAF50",
                        }}
                      />
                    </td>
                    <td
                      style={{
                        padding: "1rem",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: colors.textTertiary,
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        borderRight: `1px solid ${colors.tableBorder}`,
                        textAlign: "center",
                        position: "sticky",
                        left: "50px",
                        background: solidStickyBg,
                        zIndex: 9,
                        width: "60px",
                        minWidth: "60px",
                        transition: "background .2s",
                      }}
                    >
                      {(indexOfFirstRow || 0) + idx + 1}
                    </td>
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: "1rem",
                          fontSize: "0.78rem",
                          fontWeight: isUnread ? 700 : 400,
                          color: isUnread
                            ? colors.textPrimary
                            : colors.tableText,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          whiteSpace:
                            col.key === "deadlineDate" || col.wrap
                              ? "normal"
                              : "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          width: col.width,
                          minWidth: col.width,
                          ...(col.frozen
                            ? {
                                position: "sticky",
                                left: col.frozenLeft,
                                background: solidStickyBg,
                                zIndex: 9,
                                boxShadow: "2px 0 6px rgba(0,0,0,0.18)",
                                transition: "background .2s",
                              }
                            : {
                                background: col.complianceOnly
                                  ? darkMode
                                    ? "rgba(245,158,11,0.04)"
                                    : "rgba(245,158,11,0.02)"
                                  : undefined,
                              }),
                        }}
                      >
                        {renderCell(col, row)}
                      </td>
                    ))}
                    <td
                      style={{
                        padding: "1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        textAlign: "center",
                        position: "sticky",
                        right: 0,
                        background: solidStickyBg,
                        zIndex: openMenuId === row.id ? 9999 : 9,
                        boxShadow: "-4px 0 8px rgba(0,0,0,.15)",
                        transition: "background .2s",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        <button
                          onClick={(e) => toggleMenu(e, row.id)}
                          style={{
                            padding: "0.5rem",
                            background: "transparent",
                            border: `1px solid ${colors.cardBorder}`,
                            borderRadius: 6,
                            color: colors.textPrimary,
                            cursor: "pointer",
                            width: 32,
                            height: 32,
                            position: "relative",
                          }}
                        >
                          ⋮
                          {isUnread && (
                            <span
                              style={{
                                position: "absolute",
                                top: -3,
                                right: -3,
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "#2196F3",
                                border: `1.5px solid ${solidStickyBg}`,
                              }}
                            />
                          )}
                        </button>
                        {openMenuId === row.id && (
                          <>
                            <div
                              onClick={() => setOpenMenuId(null)}
                              style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 9998,
                              }}
                            />
                            <div
                              style={{
                                position: "fixed",
                                right: 20,
                                top:
                                  typeof event !== "undefined"
                                    ? event.clientY
                                    : 200,
                                background: colors.cardBg,
                                border: `1px solid ${colors.cardBorder}`,
                                borderRadius: 8,
                                boxShadow: "0 8px 24px rgba(0,0,0,.3)",
                                minWidth: 200,
                                zIndex: 9999,
                                overflow: "hidden",
                              }}
                            >
                              {activeSubTab === "received" &&
                                !isRecordTab &&
                                menuBtn(
                                  () => openDetails(row),
                                  {
                                    borderBottom: `1px solid ${colors.tableBorder}`,
                                  },
                                  [
                                    <span key="i">👁️</span>,
                                    <span key="t">View Details</span>,
                                  ],
                                )}
                              {menuBtn(
                                () => openAppLogs(row),
                                {
                                  borderBottom: `1px solid ${colors.tableBorder}`,
                                },
                                [
                                  <span key="i">🗂️</span>,
                                  <span key="t">Application Logs</span>,
                                ],
                              )}
                              {!isRecordTab &&
                                menuBtn(
                                  () => openChangeLog(row),
                                  {
                                    borderBottom: `1px solid ${colors.tableBorder}`,
                                  },
                                  [
                                    <span key="i">📋</span>,
                                    <span key="t">Change Log</span>,
                                  ],
                                )}
                              {menuBtn(() => openDoctrack(row), {}, [
                                <span key="i">📋</span>,
                                <span key="t">View Doctrack Details</span>,
                              ])}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div
          style={{
            flexShrink: 0,
            borderTop: `1px solid ${colors.tableBorder}`,
            background: colors.cardBg,
          }}
        >
          <TablePagination
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            totalRecords={totalRecords}
            totalPages={totalPages}
            indexOfFirstRow={indexOfFirstRow}
            indexOfLastRow={indexOfLastRow}
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
            colors={colors}
          />
        </div>
      </div>

      {selectedRowDetails && (
        <ViewDetailsModal
          record={selectedRowDetails}
          onClose={() => setSelectedRowDetails(null)}
          onSuccess={async () => {
            setSelectedRowDetails(null);
            if (onRefresh) await onRefresh();
          }}
          colors={colors}
          darkMode={darkMode}
        />
      )}
      {doctrackModalRecord && (
        <DoctrackModal
          record={doctrackModalRecord}
          onClose={() => setDoctrackModalRecord(null)}
          colors={colors}
        />
      )}
      {changeLogRecord && (
        <ChangeLogModal
          record={changeLogRecord}
          onClose={() => setChangeLogRecord(null)}
          colors={colors}
        />
      )}
      {appLogsRecord && (
        <ApplicationLogsModal
          record={appLogsRecord}
          onClose={() => setAppLogsRecord(null)}
          colors={colors}
          darkMode={darkMode}
        />
      )}

      {confirmReceive && (
        <div
          onClick={() => setConfirmReceive(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 14,
              padding: "2rem",
              width: 400,
              maxWidth: "90%",
              boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                fontSize: "2rem",
                marginBottom: "0.75rem",
                textAlign: "center",
              }}
            >
              📥
            </div>
            <h3
              style={{
                margin: "0 0 0.5rem",
                color: colors.textPrimary,
                fontSize: "1.05rem",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              Mark as Received?
            </h3>
            <p
              style={{
                margin: "0 0 1.5rem",
                color: colors.textSecondary,
                fontSize: "0.88rem",
                lineHeight: 1.6,
                textAlign: "center",
              }}
            >
              You are about to mark{" "}
              <strong style={{ color: "#10b981" }}>
                {selectedRows.length}{" "}
                {selectedRows.length === 1 ? "record" : "records"}
              </strong>{" "}
              as received. This action cannot be undone.
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => setConfirmReceive(false)}
                style={{
                  padding: "0.55rem 1.25rem",
                  borderRadius: 8,
                  border: `1px solid ${colors.cardBorder}`,
                  background: "transparent",
                  color: colors.textSecondary,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmReceive(false);
                  handleMarkAsReceived();
                }}
                style={{
                  padding: "0.55rem 1.5rem",
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(135deg,#10b981,#059669)",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(16,185,129,0.35)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <span>✔</span> Yes, Mark as Received
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkDeck && bulkDeckConfig && (
        <BulkDeckModal
          selectedCount={selectedRows.length}
          selectedDtns={data
            .filter((r) => selectedRows.includes(r.id))
            .map((r) => r.dtn || r.id)}
          config={bulkDeckConfig}
          colors={colors}
          darkMode={darkMode}
          onClose={() => setShowBulkDeck(false)}
          onConfirm={handleBulkDeck}
          onDownloadTransmittal={handleGenerateTransmittal}
          onDone={async () => {
            if (onClearSelections) onClearSelections();
            if (onRefresh) await onRefresh();
            setShowBulkDeck(false);
          }}
        />
      )}

      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </>
  );
}

export default DataTable;
