// FILE: src/components/reports/actions/BulkReassignmentModal.jsx
import { useState, useEffect } from "react";
import { getUsersByGroup, getUser } from "../../../api/auth";
import { reassignApplication } from "../../../api/application-logs";

const STEP_GROUP_MAP = {
  Decking: 2,
  "S&E": 13,
  "S&E Supervisor": 20,
  "S&E Checker": 21,
  "Quality Evaluation": 3,
  Checking: 4,
  Supervisor: 5,
  "QA Admin": 16,
  "LRD Chief Admin": 17,
  "OD-Receiving": 18,
  "OD-Releasing": 19,
  "Releasing Officer": 8,
};

const REASSIGN_REASONS = [
  "Evaluator on leave",
  "Workload balancing",
  "Expertise mismatch",
  "Evaluator request",
  "Supervisory directive",
  "Others",
];

const nowPHT = () => {
  const now = new Date();
  const phtString = now.toLocaleString("sv-SE", { timeZone: "Asia/Manila" });
  return phtString.replace(" ", "T");
};

// ── UserSelect (same as ReassignmentModal) ────────────────────────────────────
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

  return (
    <div style={{ position: "relative", width: "100%" }}>
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
            }}
          />
        )}
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
                onChange("");
                setSearch("");
                setIsOpen(false);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: colors.textTertiary,
                fontSize: "0.9rem",
                padding: "0 2px",
                lineHeight: 1,
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

      {isOpen && (
        <>
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
              border: "1px solid #7c3aed",
              borderTop: "none",
              borderRadius: "0 0 8px 8px",
              maxHeight: "200px",
              overflowY: "auto",
              zIndex: 9999,
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            }}
          >
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

// ── BulkReassignmentModal ─────────────────────────────────────────────────────
function BulkReassignmentModal({
  records,
  onClose,
  onSuccess,
  colors,
  darkMode,
}) {
  const [step, setStep] = useState("form"); // "form" | "progress" | "done"
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedStep, setSelectedStep] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [remarks, setRemarks] = useState("");

  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Progress tracking
  const [results, setResults] = useState([]); // { dtn, status: "pending"|"success"|"error", message }

  const groupId = selectedStep ? (STEP_GROUP_MAP[selectedStep] ?? null) : null;
  const stepHasGroup = !!groupId;

  const isFormComplete =
    !!selectedStep &&
    !!selectedReason &&
    (stepHasGroup ? !!selectedUser : true);

  // Load logged-in user
  useEffect(() => {
    const user = getUser();
    if (user) setCurrentUser(user);
  }, []);

  // Fetch users when step changes
  useEffect(() => {
    setSelectedUser("");
    setAvailableUsers([]);
    if (!groupId) return;

    (async () => {
      try {
        setLoadingUsers(true);
        const users = await getUsersByGroup(groupId);
        setAvailableUsers(users);
      } catch {
        setAvailableUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, [groupId]);

  const handleSubmit = async () => {
    setStep("progress");

    // Initialize all as pending
    const initialResults = records.map((r) => ({
      dtn: r.dtn,
      id: r.id,
      status: "pending",
      message: "",
    }));
    setResults(initialResults);

    const selectedUserObj = availableUsers.find(
      (u) => u.username === selectedUser,
    );
    const updatedResults = [...initialResults];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        await reassignApplication({
          main_db_id: record.id,
          action_type: "REASSIGNMENT",
          application_step: selectedStep,
          reassigned_from_user_id: null,
          reassigned_from_user_name: null,
          reassigned_to_user_id: selectedUserObj?.id ?? null,
          reassigned_to_user_name: selectedUser || null,
          reassignment_reason: selectedReason,
          reassignment_remarks: remarks || null,
          reassigned_by_user_id: currentUser?.id ?? null,
          reassigned_by_user_name: currentUser?.username ?? null,
          reassigned_at: nowPHT(),
        });
        updatedResults[i] = {
          ...updatedResults[i],
          status: "success",
          message: "OK",
        };
      } catch (err) {
        updatedResults[i] = {
          ...updatedResults[i],
          status: "error",
          message: err.message ?? "Failed",
        };
      }
      setResults([...updatedResults]);
    }

    setStep("done");
    onSuccess?.();
  };

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const pendingCount = results.filter((r) => r.status === "pending").length;

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

  return (
    <>
      <style>{`@keyframes bulk-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
        onClick={step === "progress" ? undefined : onClose}
      >
        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "14px",
            width: "100%",
            maxWidth: "540px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
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
                  Bulk Re-assignment
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "rgba(255,255,255,0.7)",
                    marginTop: "2px",
                  }}
                >
                  {records.length} record{records.length > 1 ? "s" : ""}{" "}
                  selected
                  {currentUser && (
                    <span style={{ marginLeft: "0.75rem", opacity: 0.8 }}>
                      • {currentUser.username}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {step !== "progress" && (
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
            )}
          </div>

          {/* ── Body ── */}
          <div style={{ padding: "1.4rem", overflowY: "auto", flex: 1 }}>
            {/* ── FORM ── */}
            {step === "form" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {/* Selected DTNs preview */}
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    background: darkMode ? "#1a1a1a" : "#f8f8f8",
                    borderRadius: "8px",
                    border: `1px solid ${colors.cardBorder}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: colors.textTertiary,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Selected Records ({records.length})
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.35rem",
                      maxHeight: "80px",
                      overflowY: "auto",
                    }}
                  >
                    {records.map((r) => (
                      <span
                        key={r.id}
                        style={{
                          fontSize: "0.7rem",
                          background: "rgba(124,58,237,0.1)",
                          border: "1px solid rgba(124,58,237,0.25)",
                          borderRadius: "5px",
                          padding: "0.15rem 0.5rem",
                          color: "#7c3aed",
                          fontWeight: 600,
                        }}
                      >
                        {r.dtn}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Step selection */}
                <div>
                  <label style={labelStyle}>Application Step *</label>
                  <select
                    value={selectedStep}
                    onChange={(e) => setSelectedStep(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">— Select step —</option>
                    {Object.keys(STEP_GROUP_MAP).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assign To */}
                <div>
                  <label style={labelStyle}>
                    Assign To{stepHasGroup ? " *" : ""}
                    {selectedStep && (
                      <span
                        style={{
                          marginLeft: "0.5rem",
                          fontSize: "0.65rem",
                          fontWeight: "500",
                          color: stepHasGroup ? "#7c3aed" : colors.textTertiary,
                          background: stepHasGroup
                            ? "rgba(124,58,237,0.08)"
                            : "transparent",
                          border: `1px solid ${stepHasGroup ? "rgba(124,58,237,0.25)" : colors.cardBorder}`,
                          padding: "0.1rem 0.4rem",
                          borderRadius: "4px",
                          textTransform: "none",
                          letterSpacing: 0,
                        }}
                      >
                        {stepHasGroup ? selectedStep : "no group configured"}
                      </span>
                    )}
                  </label>
                  {!selectedStep ? (
                    <div
                      style={{
                        ...inputStyle,
                        color: colors.textTertiary,
                        cursor: "not-allowed",
                      }}
                    >
                      Select a step first...
                    </div>
                  ) : loadingUsers ? (
                    <div
                      style={{
                        ...inputStyle,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        color: colors.textTertiary,
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
                          animation: "bulk-spin 0.6s linear infinite",
                          flexShrink: 0,
                        }}
                      />
                      Loading users...
                    </div>
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
                          ⚠️ No users found for <strong>{selectedStep}</strong>.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        placeholder="Enter username manually..."
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
                        <strong>{selectedStep}</strong>. Enter username
                        manually.
                      </p>
                    </>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label style={labelStyle}>Reason for Re-assignment *</label>
                  <select
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">— Select reason —</option>
                    {REASSIGN_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Remarks */}
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

                {/* Actions */}
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
                    disabled={!isFormComplete}
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
                    }}
                  >
                    🔄 Re-assign {records.length} Record
                    {records.length > 1 ? "s" : ""}
                  </button>
                </div>
              </div>
            )}

            {/* ── PROGRESS ── */}
            {(step === "progress" || step === "done") && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {/* Summary bar */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                    marginBottom: "0.25rem",
                  }}
                >
                  {[
                    { label: "Success", count: successCount, color: "#10b981" },
                    { label: "Failed", count: errorCount, color: "#ef4444" },
                    {
                      label: "Pending",
                      count: pendingCount,
                      color: colors.textTertiary,
                    },
                  ].map(({ label, count, color }) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: color,
                          display: "inline-block",
                        }}
                      />
                      {label}: {count}
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: "6px",
                    background: colors.cardBorder,
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${((successCount + errorCount) / records.length) * 100}%`,
                      background: errorCount > 0 ? "#f59e0b" : "#7c3aed",
                      borderRadius: "3px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>

                {/* Per-record results */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.3rem",
                    maxHeight: "300px",
                    overflowY: "auto",
                  }}
                >
                  {results.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.5rem 0.75rem",
                        background: darkMode ? "#1a1a1a" : "#f8f8f8",
                        borderRadius: "7px",
                        border: `1px solid ${r.status === "success" ? "rgba(16,185,129,0.25)" : r.status === "error" ? "rgba(239,68,68,0.25)" : colors.cardBorder}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: "#7c3aed",
                        }}
                      >
                        {r.dtn}
                      </span>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          color:
                            r.status === "success"
                              ? "#10b981"
                              : r.status === "error"
                                ? "#ef4444"
                                : colors.textTertiary,
                        }}
                      >
                        {r.status === "pending" && (
                          <span
                            style={{
                              display: "inline-block",
                              width: "11px",
                              height: "11px",
                              border: "2px solid rgba(124,58,237,0.3)",
                              borderTopColor: "#7c3aed",
                              borderRadius: "50%",
                              animation: "bulk-spin 0.6s linear infinite",
                            }}
                          />
                        )}
                        {r.status === "success" && "✅"}
                        {r.status === "error" && "❌"}
                        {r.status === "pending"
                          ? "Processing..."
                          : r.status === "success"
                            ? "Re-assigned"
                            : r.message}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Done actions */}
                {step === "done" && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: "0.5rem",
                    }}
                  >
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
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default BulkReassignmentModal;
