// FILE: src/components/reports/actions/ReassignmentModal.jsx
import { useState, useEffect } from "react";
import { getUsersByGroup, getUser } from "../../../api/auth";
import {
  getApplicationLogsByDtn,
  reassignApplication,
} from "../../../api/application-logs";

const STEP_GROUP_MAP = {
  Decking: 2,
  "S&E": 13,
  "Quality Evaluation": 3,
  Checking: 4,
  Supervisor: 5,
  "QA Admin": 16,
  "LRD Chief Admin": 17,
  "OD-Receiving": 18,
  "OD-Releasing": 19,
  "Releasing Officer": 8,
};

const MOCK_REASONS = [
  "Evaluator on leave",
  "Workload balancing",
  "Expertise mismatch",
  "Evaluator request",
  "Supervisory directive",
  "Others",
];

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingField({ colors, label = "users" }) {
  return (
    <div
      style={{
        width: "100%",
        padding: "0.6rem 0.85rem",
        background: "transparent",
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
          border: "2px solid rgba(124,58,237,0.3)",
          borderTopColor: "#7c3aed",
          borderRadius: "50%",
          animation: "reassign-spin 0.6s linear infinite",
          flexShrink: 0,
        }}
      />
      {label}
    </div>
  );
}

function UserSelect({ value, onChange, users, colors, darkMode }) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      `${u.first_name} ${u.surname}`.toLowerCase().includes(q)
    );
  });

  const selectedUser = users.find((u) => u.username === value);

  const handleSelect = (user) => {
    onChange(user.username);
    setSearch("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* ── Trigger / Search input ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          padding: "0.6rem 0.85rem",
          background: darkMode ? "#1a1a1a" : "#f5f5f5",
          border: `1px solid ${isOpen ? "#7c3aed" : colors.cardBorder}`,
          borderRadius: isOpen ? "8px 8px 0 0" : "8px",
          boxSizing: "border-box",
          cursor: "text",
          transition: "border-color 0.15s",
        }}
        onClick={() => setIsOpen(true)}
      >
        {/* Selected badge or search input */}
        {selectedUser && !isOpen ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flex: 1,
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                color: "#7c3aed",
                background: "rgba(124,58,237,0.08)",
                border: "1px solid rgba(124,58,237,0.2)",
                borderRadius: "6px",
                padding: "0.15rem 0.5rem",
                fontSize: "0.78rem",
                fontWeight: 600,
              }}
            >
              👤 {selectedUser.username} — {selectedUser.first_name}{" "}
              {selectedUser.surname}
            </span>
          </div>
        ) : (
          <input
            autoFocus={isOpen}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={
              users.length === 0
                ? "No users available"
                : "Type to search user..."
            }
            disabled={users.length === 0}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: colors.textPrimary,
              fontSize: "0.82rem",
              cursor: users.length === 0 ? "not-allowed" : "text",
            }}
          />
        )}

        {/* Right icons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            flexShrink: 0,
          }}
        >
          {value && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: colors.textTertiary,
                fontSize: "0.9rem",
                padding: "0 2px",
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
              }}
            >
              ×
            </button>
          )}
          <span
            style={{
              color: colors.textTertiary,
              fontSize: "0.65rem",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
              display: "inline-block",
            }}
          >
            ▼
          </span>
        </div>
      </div>

      {/* ── Dropdown list ── */}
      {isOpen && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9998 }}
            onClick={() => {
              setIsOpen(false);
              setSearch("");
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: darkMode ? "#1a1a1a" : "#fff",
              border: `1px solid #7c3aed`,
              borderTop: "none",
              borderRadius: "0 0 8px 8px",
              maxHeight: "220px",
              overflowY: "auto",
              zIndex: 9999,
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            }}
          >
            {/* Search box inside dropdown (if trigger already has selected) */}
            {selectedUser && (
              <div
                style={{
                  padding: "0.5rem 0.85rem",
                  borderBottom: `1px solid ${colors.cardBorder}`,
                }}
              >
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type to search user..."
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: colors.textPrimary,
                    fontSize: "0.82rem",
                  }}
                />
              </div>
            )}

            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  fontSize: "0.78rem",
                  color: colors.textTertiary,
                  textAlign: "center",
                }}
              >
                No users match "{search}"
              </div>
            ) : (
              filtered.map((user) => {
                const isSelected = user.username === value;
                return (
                  <div
                    key={user.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(user);
                    }}
                    style={{
                      padding: "0.6rem 1rem",
                      cursor: "pointer",
                      background: isSelected
                        ? "rgba(124,58,237,0.12)"
                        : "transparent",
                      borderLeft: isSelected
                        ? "3px solid #7c3aed"
                        : "3px solid transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.background = darkMode
                          ? "#2a2a2a"
                          : "#f5f3ff";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: isSelected ? "#7c3aed" : colors.textPrimary,
                      }}
                    >
                      {user.username}
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: colors.textTertiary,
                        marginTop: "1px",
                      }}
                    >
                      {user.first_name} {user.surname}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── PHT helper ────────────────────────────────────────────────────────────────
const nowPHT = () => {
  const now = new Date();
  const phtString = now.toLocaleString("sv-SE", { timeZone: "Asia/Manila" });
  return phtString.replace(" ", "T");
};

// ── Main ReassignmentModal ────────────────────────────────────────────────────

function ReassignmentModal({ record, onClose, colors, darkMode }) {
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // ── Step detection from logs ──────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(null);
  const [currentAssignee, setCurrentAssignee] = useState(null);
  const [loadingStep, setLoadingStep] = useState(true);
  const [stepError, setStepError] = useState(null);
  // ─────────────────────────────────────────────────────────────────

  const groupId = currentStep ? (STEP_GROUP_MAP[currentStep] ?? null) : null;
  const stepHasGroup = !!groupId;

  // Load logged-in user
  useEffect(() => {
    const user = getUser();
    if (user) setCurrentUser(user);
  }, []);

  // Fetch latest step via DTN
  useEffect(() => {
    if (!record?.dtn) {
      setLoadingStep(false);
      setStepError("No DTN found for this record.");
      return;
    }

    (async () => {
      try {
        setLoadingStep(true);
        setStepError(null);
        const logs = await getApplicationLogsByDtn(record.dtn);

        if (Array.isArray(logs) && logs.length > 0) {
          const latestLog = logs[0];
          setCurrentStep(latestLog.application_step ?? null);
          setCurrentAssignee(latestLog.user_name ?? null);
        } else {
          setCurrentStep(null);
          setCurrentAssignee(null);
        }
      } catch (err) {
        console.error("Failed to fetch logs for step:", err);
        setStepError("Failed to detect current step.");
        setCurrentStep(null);
      } finally {
        setLoadingStep(false);
      }
    })();
  }, [record?.dtn]);

  // Fetch users once currentStep + groupId is resolved
  useEffect(() => {
    setSelectedUser("");
    setAvailableUsers([]);

    if (!groupId) return;

    (async () => {
      try {
        setLoadingUsers(true);
        const users = await getUsersByGroup(groupId);
        setAvailableUsers(users);
      } catch (err) {
        console.error("Failed to fetch users for group:", groupId, err);
        setAvailableUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, [groupId]);

  const isFormComplete =
    !loadingStep &&
    !loadingUsers &&
    !!selectedReason &&
    (stepHasGroup ? !!selectedUser : true);

  const handleSubmit = async () => {
    if (!isFormComplete) return;
    setIsSubmitting(true);

    try {
      const selectedUserObj = availableUsers.find(
        (u) => u.username === selectedUser,
      );

      await reassignApplication({
        main_db_id: record?.id,
        action_type: "REASSIGNMENT",
        application_step: currentStep,
        reassigned_from_user_id: null,
        reassigned_from_user_name: currentAssignee,
        reassigned_to_user_id: selectedUserObj?.id ?? null,
        reassigned_to_user_name: selectedUser,
        reassignment_reason: selectedReason,
        reassignment_remarks: remarks || null,
        reassigned_by_user_id: currentUser?.id ?? null,
        reassigned_by_user_name: currentUser?.username ?? null,
        reassigned_at: nowPHT(),
      });

      setSubmitted(true);
    } catch (err) {
      console.error("Re-assignment failed:", err);
      alert(`Re-assignment failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Styles ───────────────────────────────────────────────────────────────────

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
    maxWidth: "520px",
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

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes reassign-spin { to { transform: rotate(360deg); } }
        @keyframes reassign-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          {/* ── Header ── */}
          <div
            style={{
              padding: "1.1rem 1.4rem",
              borderBottom: `1px solid ${colors.cardBorder}`,
              background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
            >
              <span style={{ fontSize: "1.2rem" }}>🔄</span>
              <div>
                <div
                  style={{
                    fontSize: "0.92rem",
                    fontWeight: "700",
                    color: "#fff",
                  }}
                >
                  Application Re-assignment
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
                  Re-assignment Submitted
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: colors.textTertiary,
                    marginBottom: "1.5rem",
                  }}
                >
                  The application has been re-assigned
                  {selectedUser && (
                    <>
                      {" "}
                      to <strong>{selectedUser}</strong>
                    </>
                  )}
                  {currentStep && (
                    <>
                      {" "}
                      under <strong>{currentStep}</strong>
                    </>
                  )}
                  .
                </div>
                <button
                  onClick={onClose}
                  style={{
                    padding: "0.6rem 1.5rem",
                    background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
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
                {/* ── Current application info ── */}
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
                  {/* App Status */}
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

                  {/* Company */}
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

                  {/* App Step */}
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
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      {loadingStep ? (
                        <>
                          <span
                            style={{
                              display: "inline-block",
                              width: "10px",
                              height: "10px",
                              border: "2px solid rgba(124,58,237,0.3)",
                              borderTopColor: "#7c3aed",
                              borderRadius: "50%",
                              animation: "reassign-spin 0.6s linear infinite",
                            }}
                          />
                          <span
                            style={{
                              color: colors.textTertiary,
                              fontStyle: "italic",
                            }}
                          >
                            Detecting...
                          </span>
                        </>
                      ) : stepError ? (
                        <span style={{ color: "#ef4444", fontSize: "0.72rem" }}>
                          ⚠️ {stepError}
                        </span>
                      ) : (
                        <span
                          style={{
                            color: currentStep ? "#7c3aed" : colors.textPrimary,
                          }}
                        >
                          {currentStep ?? "N/A"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Current Assignee */}
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
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      {loadingStep ? (
                        <>
                          <span
                            style={{
                              display: "inline-block",
                              width: "10px",
                              height: "10px",
                              border: "2px solid rgba(124,58,237,0.3)",
                              borderTopColor: "#7c3aed",
                              borderRadius: "50%",
                              animation: "reassign-spin 0.6s linear infinite",
                            }}
                          />
                          <span
                            style={{
                              color: colors.textTertiary,
                              fontStyle: "italic",
                            }}
                          >
                            Detecting...
                          </span>
                        </>
                      ) : currentAssignee ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            color: "#7c3aed",
                            background: "rgba(124,58,237,0.08)",
                            border: "1px solid rgba(124,58,237,0.2)",
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

                {/* ── Assign To ── */}
                <div>
                  <label style={labelStyle}>
                    Assign To{stepHasGroup ? " *" : ""}
                    {!loadingStep && currentStep && (
                      <span
                        style={{
                          marginLeft: "0.5rem",
                          fontSize: "0.65rem",
                          fontWeight: "500",
                          color: stepHasGroup ? "#7c3aed" : colors.textTertiary,
                          background: stepHasGroup
                            ? "rgba(124,58,237,0.08)"
                            : "transparent",
                          border: `1px solid ${
                            stepHasGroup
                              ? "rgba(124,58,237,0.25)"
                              : colors.cardBorder
                          }`,
                          padding: "0.1rem 0.4rem",
                          borderRadius: "4px",
                          textTransform: "none",
                          letterSpacing: 0,
                        }}
                      >
                        {stepHasGroup ? currentStep : "no group configured"}
                      </span>
                    )}
                  </label>

                  {loadingStep ? (
                    <LoadingField
                      colors={colors}
                      label="Detecting current step..."
                    />
                  ) : loadingUsers ? (
                    <LoadingField colors={colors} label="Loading users..." />
                  ) : stepHasGroup ? (
                    <>
                      <UserSelect
                        value={selectedUser}
                        onChange={setSelectedUser}
                        users={availableUsers}
                        colors={colors}
                        darkMode={darkMode}
                      />
                      {availableUsers.length === 0 && (
                        <p
                          style={{
                            fontSize: "0.72rem",
                            color: "#ef4444",
                            marginTop: "0.4rem",
                            marginBottom: 0,
                          }}
                        >
                          ⚠️ No users found for the{" "}
                          <strong>{currentStep}</strong> step.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        placeholder="Enter username..."
                        style={inputStyle}
                      />
                      <p
                        style={{
                          fontSize: "0.72rem",
                          color: colors.textTertiary,
                          marginTop: "0.35rem",
                          marginBottom: 0,
                        }}
                      >
                        💡 No group configured for{" "}
                        <strong>{currentStep ?? "this step"}</strong>. Enter
                        username manually.
                      </p>
                    </>
                  )}
                </div>

                {/* ── Reason for Re-assignment ── */}
                <div>
                  <label style={labelStyle}>Reason for Re-assignment *</label>
                  <select
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">— Select reason —</option>
                    {MOCK_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

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
                        : "linear-gradient(135deg,#7c3aed,#6d28d9)",
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
                      transition: "all 0.2s",
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
                            animation: "reassign-spin 0.6s linear infinite",
                          }}
                        />
                        Submitting...
                      </>
                    ) : (
                      <>🔄 Confirm Re-assignment</>
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

export default ReassignmentModal;
