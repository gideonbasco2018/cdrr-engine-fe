import { useState, useEffect } from "react";
import { getUsersByGroup, getUser } from "../../../api/auth";
import { getApplicationLogsByDtn } from "../../../api/application-logs";

const WORKFLOW_STEPS = [
  { key: "Decking", label: "Decking", icon: "🎯", groupId: 2 },
  { key: "S&E", label: "S&E", icon: "🧪", groupId: 13 },
  {
    key: "Quality Evaluation",
    label: "Quality Evaluation",
    icon: "🔍",
    groupId: 3,
  },
  { key: "Checking", label: "Checking", icon: "✅", groupId: 4 },
  { key: "Supervisor", label: "Supervisor", icon: "👤", groupId: 5 },
  { key: "QA Admin", label: "QA Admin", icon: "🛡️", groupId: 16 },
  {
    key: "LRD Chief Admin",
    label: "LRD Chief Admin",
    icon: "📌",
    groupId: 17,
  },
  { key: "OD-Receiving", label: "OD-Receiving", icon: "📥", groupId: 18 },
  { key: "OD-Releasing", label: "OD-Releasing", icon: "📤", groupId: 19 },
  {
    key: "Releasing Officer",
    label: "Releasing Officer",
    icon: "🏁",
    groupId: 8,
  },
];

const REROUTE_REASONS = [
  "Missing documents",
  "Incorrect classification",
  "Additional evaluation needed",
  "Compliance issue",
  "Director directive",
  "Applicant request",
  "System correction",
  "Others",
];

// ── Reusable sub-components (same pattern as BulkDeckModal) ───────────────────

function LoadingField({ colors, label = "users" }) {
  return (
    <div
      style={{
        width: "100%",
        padding: "0.75rem 1rem",
        background: colors.inputBg || colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "8px",
        color: colors.textTertiary,
        fontSize: "0.82rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "13px",
          height: "13px",
          border: "2px solid rgba(8,145,178,0.3)",
          borderTopColor: "#0891b2",
          borderRadius: "50%",
          animation: "spin 0.6s linear infinite",
          flexShrink: 0,
        }}
      />
      <span>Loading {label}...</span>
    </div>
  );
}

function UserSelect({ value, onChange, users, colors, darkMode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={users.length === 0}
      style={{
        width: "100%",
        padding: "0.6rem 0.85rem",
        background: darkMode ? "#1a1a1a" : "#f5f5f5",
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "8px",
        color: colors.textPrimary,
        fontSize: "0.82rem",
        outline: "none",
        cursor: users.length === 0 ? "not-allowed" : "pointer",
        opacity: users.length === 0 ? 0.6 : 1,
        boxSizing: "border-box",
      }}
    >
      <option value="">
        {users.length === 0 ? "No users available" : "— Select user —"}
      </option>
      {users.map((user) => (
        <option key={user.id} value={user.username}>
          {user.username} — {user.first_name} {user.surname}
        </option>
      ))}
    </select>
  );
}

function EmptyWarning({ label }) {
  return (
    <p
      style={{
        fontSize: "0.72rem",
        color: "#ef4444",
        marginTop: "0.4rem",
        marginBottom: 0,
      }}
    >
      ⚠️ No users found for the {label} step.
    </p>
  );
}

// ── Main RerouteModal ─────────────────────────────────────────────────────────

function RerouteModal({ record, onClose, colors, darkMode }) {
  const [targetStep, setTargetStep] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Assign To — same pattern as BulkDeckModal
  const [assignedUser, setAssignedUser] = useState("");
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [activeSteps, setActiveSteps] = useState([]);
  const [selectedActiveStep, setSelectedActiveStep] = useState(null);

  const currentStep = selectedActiveStep?.application_step ?? null;
  const currentStepIndex = WORKFLOW_STEPS.findIndex(
    (s) => s.key === currentStep,
  );
  const currentAssignee = selectedActiveStep?.user_name ?? null;

  const targetStepObj = WORKFLOW_STEPS.find((s) => s.key === targetStep);

  // Load current logged-in user
  useEffect(() => {
    const user = getUser();
    if (user) setCurrentUser(user);
  }, []);

  // Fetch all IN PROGRESS logs
  useEffect(() => {
    if (!record?.dtn) return;
    (async () => {
      try {
        const logs = await getApplicationLogsByDtn(record.dtn);
        if (Array.isArray(logs) && logs.length > 0) {
          const inProgress = logs.filter(
            (l) => l.application_status === "IN PROGRESS",
          );
          setActiveSteps(inProgress);
          // Auto-select if only one active step
          if (inProgress.length === 1) {
            setSelectedActiveStep(inProgress[0]);
          }
        }
      } catch {
        setActiveSteps([]);
      }
    })();
  }, [record?.dtn]);
  // When target step changes → fetch users for that step's group
  useEffect(() => {
    // Reset assigned user every time target step changes
    setAssignedUser("");
    setAvailableUsers([]);

    if (!targetStep) return;

    const groupId = targetStepObj?.groupId ?? null;

    // If this step has no group configured, no fetch needed
    if (!groupId) return;

    (async () => {
      try {
        setLoadingUsers(true);
        const users = await getUsersByGroup(groupId);
        setAvailableUsers(users);
      } catch (err) {
        console.error("Failed to fetch users for step:", targetStep, err);
        setAvailableUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, [targetStep]);

  const isBackward =
    targetStep &&
    currentStepIndex > -1 &&
    WORKFLOW_STEPS.findIndex((s) => s.key === targetStep) < currentStepIndex;
  // (no change needed here — now uses state value automatically)

  const stepHasGroup = !!targetStepObj?.groupId;
  const isFormComplete =
    !!targetStep &&
    !!selectedReason &&
    // Assign To is only required if the target step has a configured group
    (!stepHasGroup || !!assignedUser);

  const handleSubmit = async () => {
    if (!isFormComplete) return;
    setIsSubmitting(true);
    // TODO: replace with real API call
    await new Promise((r) => setTimeout(r, 1200));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  // ── Styles ─────────────────────────────────────────────────────────────────

  const overlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 10000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
  };

  const modalStyle = {
    background: colors.cardBg,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: "14px",
    width: "100%",
    maxWidth: "560px",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
    overflow: "hidden",
  };

  const inputStyle = {
    width: "100%",
    padding: "0.6rem 0.85rem",
    background: darkMode ? "#1a1a1a" : "#f5f5f5",
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: "8px",
    color: colors.textPrimary,
    fontSize: "0.82rem",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    fontSize: "0.72rem",
    fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    display: "block",
    marginBottom: "0.4rem",
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          {/* ── Header ── */}
          <div
            style={{
              padding: "1.1rem 1.4rem",
              borderBottom: `1px solid ${colors.cardBorder}`,
              background: "linear-gradient(135deg,#0891b2,#0e7490)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
            >
              <span style={{ fontSize: "1.2rem" }}>🔀</span>
              <div>
                <div
                  style={{
                    fontSize: "0.92rem",
                    fontWeight: "700",
                    color: "#fff",
                  }}
                >
                  Application Re-route
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "rgba(255,255,255,0.7)",
                    marginTop: "2px",
                  }}
                >
                  DTN:{" "}
                  <span style={{ fontWeight: "700", color: "#fff" }}>
                    {record?.dtn ?? "N/A"}
                  </span>
                  {currentUser && (
                    <span style={{ marginLeft: "0.75rem", opacity: 0.8 }}>
                      • {currentUser.username}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                color: "#fff",
                borderRadius: "50%",
                width: "28px",
                height: "28px",
                cursor: "pointer",
                fontSize: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ×
            </button>
          </div>

          {/* ── Body ── */}
          <div style={{ padding: "1.4rem", overflowY: "auto", flex: 1 }}>
            {submitted ? (
              /* ── Success state ── */
              <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>
                  ✅
                </div>
                <div
                  style={{
                    fontSize: "1rem",
                    fontWeight: "700",
                    color: colors.textPrimary,
                    marginBottom: "0.4rem",
                  }}
                >
                  Re-route Submitted
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: colors.textTertiary,
                    marginBottom: "1.5rem",
                  }}
                >
                  Application has been rerouted to{" "}
                  <strong>{targetStepObj?.label}</strong>
                  {assignedUser && (
                    <>
                      {" "}
                      and assigned to <strong>{assignedUser}</strong>
                    </>
                  )}
                  .
                </div>
                <button
                  onClick={onClose}
                  style={{
                    padding: "0.6rem 1.5rem",
                    background: "linear-gradient(135deg,#0891b2,#0e7490)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "0.82rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {/* ── App Info Banner ── */}
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    background: darkMode ? "#1a1a1a" : "#f8f8f8",
                    borderRadius: "8px",
                    border: `1px solid ${colors.cardBorder}`,
                    display: "flex",
                    gap: "1.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: colors.textTertiary,
                        fontWeight: "600",
                        textTransform: "uppercase",
                      }}
                    >
                      App Status
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: colors.textPrimary,
                        fontWeight: "600",
                        marginTop: "2px",
                      }}
                    >
                      {record?.appStatus ?? "N/A"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: colors.textTertiary,
                        fontWeight: "600",
                        textTransform: "uppercase",
                      }}
                    >
                      Company
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: colors.textPrimary,
                        fontWeight: "600",
                        marginTop: "2px",
                      }}
                    >
                      {record?.ltoComp ?? "N/A"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: colors.textTertiary,
                        fontWeight: "600",
                        textTransform: "uppercase",
                      }}
                    >
                      App Step
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: "600",
                        marginTop: "2px",
                        color: currentStep ? "#0891b2" : colors.textPrimary,
                      }}
                    >
                      {currentStep ?? "N/A"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: colors.textTertiary,
                        fontWeight: "600",
                        textTransform: "uppercase",
                      }}
                    >
                      Current Assignee
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: "600",
                        marginTop: "2px",
                      }}
                    >
                      {currentAssignee ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            color: "#0891b2",
                            background: "rgba(8,145,178,0.08)",
                            border: "1px solid rgba(8,145,178,0.2)",
                            borderRadius: "6px",
                            padding: "0.15rem 0.5rem",
                            fontSize: "0.76rem",
                          }}
                        >
                          👤 {currentAssignee}
                        </span>
                      ) : (
                        <span style={{ color: colors.textTertiary }}>N/A</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Active Step Selector (shown only when 2+ IN PROGRESS) ── */}
                {activeSteps.length > 1 && (
                  <div
                    style={{
                      padding: "0.85rem 1rem",
                      background: "rgba(8,145,178,0.05)",
                      border: "1px solid rgba(8,145,178,0.2)",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: "700",
                        color: "#0891b2",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: "0.65rem",
                      }}
                    >
                      🔀 Multiple Active Steps — Select which to re-route
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      {activeSteps.map((step, i) => {
                        const isSelected =
                          selectedActiveStep?.application_step ===
                          step.application_step;
                        return (
                          <div
                            key={i}
                            onClick={() => setSelectedActiveStep(step)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                              padding: "0.6rem 0.85rem",
                              borderRadius: "8px",
                              border: `1.5px solid ${isSelected ? "#0891b2" : colors.cardBorder}`,
                              background: isSelected
                                ? "rgba(8,145,178,0.08)"
                                : darkMode
                                  ? "#1a1a1a"
                                  : "#f5f5f5",
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            {/* Radio indicator */}
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                border: `2px solid ${isSelected ? "#0891b2" : colors.cardBorder}`,
                                background: isSelected
                                  ? "#0891b2"
                                  : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                transition: "all 0.15s",
                              }}
                            >
                              {isSelected && (
                                <div
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    background: "#fff",
                                  }}
                                />
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  fontSize: "0.82rem",
                                  fontWeight: "700",
                                  color: isSelected
                                    ? "#0891b2"
                                    : colors.textPrimary,
                                }}
                              >
                                {WORKFLOW_STEPS.find(
                                  (s) => s.key === step.application_step,
                                )?.icon ?? "📋"}{" "}
                                {step.application_step}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: colors.textTertiary,
                                  marginTop: "2px",
                                }}
                              >
                                👤 {step.user_name ?? "Unassigned"}
                              </div>
                            </div>
                            {isSelected && (
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  fontWeight: "700",
                                  color: "#0891b2",
                                  background: "rgba(8,145,178,0.12)",
                                  border: "1px solid rgba(8,145,178,0.25)",
                                  padding: "0.1rem 0.45rem",
                                  borderRadius: "4px",
                                }}
                              >
                                SELECTED
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Workflow stepper ── */}
                <div>
                  <div style={{ ...labelStyle, marginBottom: "0.75rem" }}>
                    Workflow Steps
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0,
                      overflowX: "auto",
                      paddingBottom: "0.25rem",
                    }}
                  >
                    {WORKFLOW_STEPS.map((step, idx) => {
                      const isCurrent = step.key === currentStep;
                      const isTarget = step.key === targetStep;
                      const isPast = idx < currentStepIndex;
                      return (
                        <div
                          key={step.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flex: 1,
                          }}
                        >
                          <div
                            onClick={() => setTargetStep(step.key)}
                            title={step.label}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "4px",
                              cursor: "pointer",
                              minWidth: "52px",
                            }}
                          >
                            <div
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.85rem",
                                border: isTarget
                                  ? "2px solid #0891b2"
                                  : isCurrent
                                    ? "2px solid #f59e0b"
                                    : "2px solid transparent",
                                background: isTarget
                                  ? "rgba(8,145,178,0.15)"
                                  : isCurrent
                                    ? "rgba(245,158,11,0.15)"
                                    : isPast
                                      ? "rgba(100,100,100,0.1)"
                                      : "transparent",
                                transition: "all 0.2s",
                                boxSizing: "border-box",
                              }}
                            >
                              {step.icon}
                            </div>
                            <div
                              style={{
                                fontSize: "0.55rem",
                                color: isTarget
                                  ? "#0891b2"
                                  : isCurrent
                                    ? "#f59e0b"
                                    : colors.textTertiary,
                                fontWeight:
                                  isTarget || isCurrent ? "700" : "400",
                                textAlign: "center",
                                whiteSpace: "nowrap",
                                lineHeight: 1.2,
                              }}
                            >
                              {isCurrent
                                ? "Current"
                                : isTarget
                                  ? "Target"
                                  : step.label}
                            </div>
                          </div>
                          {idx < WORKFLOW_STEPS.length - 1 && (
                            <div
                              style={{
                                flex: 1,
                                height: "1px",
                                background: colors.cardBorder,
                                margin: "0 2px",
                                marginBottom: "16px",
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Target Step dropdown ── */}
                <div>
                  <label style={labelStyle}>Target Step *</label>
                  <select
                    value={targetStep}
                    onChange={(e) => setTargetStep(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">— Select target step —</option>
                    {WORKFLOW_STEPS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.icon} {s.label}
                        {s.key === currentStep ? " (current)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ── Assign To — only shown when a target step is selected ── */}
                {targetStep && (
                  <div>
                    <label style={labelStyle}>
                      Assign To{stepHasGroup ? " *" : ""}
                      {!stepHasGroup && (
                        <span
                          style={{
                            marginLeft: "0.5rem",
                            fontSize: "0.65rem",
                            fontWeight: "500",
                            color: colors.textTertiary,
                            background: "transparent",
                            border: `1px solid ${colors.cardBorder}`,
                            padding: "0.1rem 0.4rem",
                            borderRadius: "4px",
                            textTransform: "none",
                            letterSpacing: 0,
                          }}
                        >
                          no group configured
                        </span>
                      )}
                    </label>

                    {loadingUsers ? (
                      <LoadingField colors={colors} label="users" />
                    ) : stepHasGroup ? (
                      <>
                        <UserSelect
                          value={assignedUser}
                          onChange={setAssignedUser}
                          users={availableUsers}
                          colors={colors}
                          darkMode={darkMode}
                        />
                        {availableUsers.length === 0 && !loadingUsers && (
                          <EmptyWarning label={targetStepObj?.label} />
                        )}
                      </>
                    ) : (
                      /* Step has no groupId — show a free-text input instead */
                      <input
                        type="text"
                        value={assignedUser}
                        onChange={(e) => setAssignedUser(e.target.value)}
                        placeholder="Enter username or leave blank..."
                        style={inputStyle}
                      />
                    )}
                  </div>
                )}

                {/* ── Reason ── */}
                <div>
                  <label style={labelStyle}>Reason for Re-route *</label>
                  <select
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">— Select reason —</option>
                    {REROUTE_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ── Backward warning ── */}
                {isBackward && (
                  <div
                    style={{
                      padding: "0.6rem 0.85rem",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      borderRadius: "8px",
                      fontSize: "0.75rem",
                      color: "#ef4444",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span>⚠️</span>
                    <span>
                      You are rerouting <strong>backward</strong>. This will
                      require supervisory approval.
                    </span>
                  </div>
                )}

                {/* ── Additional Remarks ── */}
                <div>
                  <label style={labelStyle}>Additional Remarks</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Optional remarks..."
                    rows={3}
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                      lineHeight: 1.5,
                    }}
                  />
                </div>

                {/* ── Actions ── */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    justifyContent: "flex-end",
                    marginTop: "0.25rem",
                  }}
                >
                  <button
                    onClick={onClose}
                    style={{
                      padding: "0.6rem 1.2rem",
                      background: "transparent",
                      border: `1px solid ${colors.cardBorder}`,
                      borderRadius: "8px",
                      color: colors.textPrimary,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!isFormComplete || isSubmitting}
                    style={{
                      padding: "0.6rem 1.4rem",
                      background: !isFormComplete
                        ? "#555"
                        : "linear-gradient(135deg,#0891b2,#0e7490)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.82rem",
                      fontWeight: "600",
                      cursor: !isFormComplete ? "not-allowed" : "pointer",
                      opacity: !isFormComplete ? 0.6 : 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <span
                          style={{
                            display: "inline-block",
                            width: "13px",
                            height: "13px",
                            border: "2px solid rgba(255,255,255,0.4)",
                            borderTopColor: "#fff",
                            borderRadius: "50%",
                            animation: "spin 0.6s linear infinite",
                          }}
                        />
                        Submitting...
                      </>
                    ) : (
                      <>🔀 Confirm Re-route</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default RerouteModal;
