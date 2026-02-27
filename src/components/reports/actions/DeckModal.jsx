import { useState, useEffect } from "react";
import { getUsersByGroup, getUser } from "../../../api/auth";
import {
  createApplicationLog,
  getLastApplicationLogIndex,
} from "../../../api/application-logs";

function DeckModal({ record, onClose, onSuccess, colors }) {
  const [formData, setFormData] = useState({
    decker: "",
    evaluator: "",
    sne: "",
    deckerDecision: "",
    deckerRemarks: "",
  });

  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSneUsers, setLoadingSneUsers] = useState(false);
  const [nextUsers, setNextUsers] = useState([]);
  const [sneUsers, setSneUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Group IDs
  const GROUP_IDS = {
    EVALUATOR: 3,
    SE: 13,
  };

  // Decision config
  const DECISION_CONFIG = {
    "For S&E": {
      fetchEvaluator: false,
      fetchSne: true,
    },
    "For Quality Evaluation": {
      fetchEvaluator: true,
      fetchSne: false,
    },
    "For S&E and Quality Evaluation": {
      fetchEvaluator: true,
      fetchSne: true,
    },
  };

  // Get current logged-in user and set as decker automatically
  useEffect(() => {
    const user = getUser();
    if (user) {
      setCurrentUser(user);
      setFormData((prev) => ({
        ...prev,
        decker: user.username,
      }));
    }
  }, []);

  // Fetch users based on selected Decker Decision
  useEffect(() => {
    const decision = formData.deckerDecision;

    setFormData((prev) => ({ ...prev, evaluator: "", sne: "" }));
    setNextUsers([]);
    setSneUsers([]);

    if (!decision || !DECISION_CONFIG[decision]) return;

    const config = DECISION_CONFIG[decision];

    const fetchEvaluatorUsers = async () => {
      try {
        setLoadingUsers(true);
        const users = await getUsersByGroup(GROUP_IDS.EVALUATOR);
        setNextUsers(users);
      } catch (error) {
        console.error("❌ Failed to fetch evaluator users:", error);
        setNextUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    const fetchSeUsers = async () => {
      try {
        setLoadingSneUsers(true);
        const users = await getUsersByGroup(GROUP_IDS.SE);
        setSneUsers(users);
      } catch (error) {
        console.error("❌ Failed to fetch S&E users:", error);
        setSneUsers([]);
      } finally {
        setLoadingSneUsers(false);
      }
    };

    if (config.fetchEvaluator) fetchEvaluatorUsers();
    if (config.fetchSne) fetchSeUsers();
  }, [formData.deckerDecision]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const config = DECISION_CONFIG[formData.deckerDecision];
    const needsEvaluator = config?.fetchEvaluator;
    const needsSne = config?.fetchSne;

    if (!formData.decker || !formData.deckerDecision) {
      alert("⚠️ Please fill in required fields:\n- Decker Decision");
      return;
    }
    if (needsEvaluator && !formData.evaluator) {
      alert("⚠️ Please assign an Evaluator.");
      return;
    }
    if (needsSne && !formData.sne) {
      alert("⚠️ Please assign an S&E.");
      return;
    }

    setLoading(true);
    try {
      const formattedDateTime = new Date().toISOString();

      const indexData = await getLastApplicationLogIndex(record.id);
      const lastIndex = indexData.last_index;
      const nextIndex = lastIndex + 1;
      const closeTask = 0;
      const openTask = 1;

      // Step 1: Insert decker log (always)
      const deckerLog = {
        main_db_id: record.id,
        application_step: "Decking",
        user_name: formData.decker,
        application_status: "COMPLETED",
        application_decision: formData.deckerDecision,
        application_remarks: formData.deckerRemarks || "",
        start_date: formattedDateTime,
        accomplished_date: formattedDateTime,
        del_index: nextIndex,
        del_previous: lastIndex,
        del_last_index: closeTask,
        del_thread: "Close",
      };
      await createApplicationLog(deckerLog);

      // Step 2: Insert next user logs
      if (formData.deckerDecision === "For S&E and Quality Evaluation") {
        // Log for Evaluator
        const evaluatorLog = {
          main_db_id: record.id,
          application_step: "Quality Evaluation",
          user_name: formData.evaluator,
          application_status: "IN PROGRESS",
          application_decision: "",
          application_remarks: "",
          start_date: formattedDateTime,
          accomplished_date: null,
          del_index: nextIndex + 1,
          del_previous: nextIndex,
          del_last_index: openTask,
          del_thread: "Open",
        };
        await createApplicationLog(evaluatorLog);

        // Log for S&E
        const seLog = {
          main_db_id: record.id,
          application_step: "S&E",
          user_name: formData.sne,
          application_status: "IN PROGRESS",
          application_decision: "",
          application_remarks: "",
          start_date: formattedDateTime,
          accomplished_date: null,
          del_index: nextIndex + 2,
          del_previous: nextIndex,
          del_last_index: openTask,
          del_thread: "Open",
        };
        await createApplicationLog(seLog);
      } else {
        // Single next user log
        const stepLabel =
          formData.deckerDecision === "For S&E" ? "S&E" : "Quality Evaluation";

        const assignedUser = needsEvaluator ? formData.evaluator : formData.sne;

        const nextUserLog = {
          main_db_id: record.id,
          application_step: stepLabel,
          user_name: assignedUser,
          application_status: "IN PROGRESS",
          application_decision: "",
          application_remarks: "",
          start_date: formattedDateTime,
          accomplished_date: null,
          del_index: nextIndex + 1,
          del_previous: nextIndex,
          del_last_index: openTask,
          del_thread: "Open",
        };
        await createApplicationLog(nextUserLog);
      }

      onClose();
      alert("✅ Application decked successfully!");

      if (onSuccess) {
        await onSuccess();
      }
    } catch (error) {
      console.error("❌ Failed to deck record:", error);
      alert(`❌ Failed to deck record: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const config = DECISION_CONFIG[formData.deckerDecision];
  const isDualAssign =
    formData.deckerDecision === "For S&E and Quality Evaluation";
  const showEvaluator = config?.fetchEvaluator;
  const showSne = config?.fetchSne;
  const showNextUser = !!formData.deckerDecision;

  const isSubmitDisabled =
    loading ||
    loadingUsers ||
    loadingSneUsers ||
    !showNextUser ||
    (showEvaluator && nextUsers.length === 0) ||
    (showSne && sneUsers.length === 0);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.6)",
          zIndex: 9998,
          backdropFilter: "blur(4px)",
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: "600px",
          background: colors.cardBg,
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          zIndex: 9999,
          animation: "slideInScale 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          border: `1px solid ${colors.cardBorder}`,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.5rem 2rem",
            borderBottom: `2px solid ${colors.cardBorder}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "700",
                color: colors.textPrimary,
                marginBottom: "0.25rem",
              }}
            >
              🎯 Deck Application
            </h2>
            <p style={{ fontSize: "0.875rem", color: colors.textTertiary }}>
              DTN: <strong style={{ color: "#4CAF50" }}>{record.dtn}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textPrimary,
              cursor: "pointer",
              fontSize: "1.2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ef444410";
              e.currentTarget.style.borderColor = "#ef4444";
              e.currentTarget.style.color = "#ef4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = colors.cardBorder;
              e.currentTarget.style.color = colors.textPrimary;
            }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: "2rem" }}>
            {/* Decker Name - Auto-filled (Read-only) */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: colors.textPrimary,
                  marginBottom: "0.5rem",
                }}
              >
                Decker Name (You) <span style={{ color: "#4CAF50" }}>●</span>
              </label>
              <input
                type="text"
                value={formData.decker}
                readOnly
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: colors.badgeBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.95rem",
                  outline: "none",
                  cursor: "not-allowed",
                  fontWeight: "600",
                }}
              />
              {currentUser && (
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: colors.textTertiary,
                    marginTop: "0.5rem",
                    marginBottom: 0,
                  }}
                >
                  👤 Logged in as: {currentUser.username}
                </p>
              )}
            </div>

            {/* Decker Decision */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: colors.textPrimary,
                  marginBottom: "0.5rem",
                }}
              >
                Decker Decision <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={formData.deckerDecision}
                onChange={(e) => handleChange("deckerDecision", e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.95rem",
                  outline: "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#4CAF50";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = colors.inputBorder;
                }}
              >
                <option value="">Select decision</option>
                <option value="For S&E">For S&amp;E</option>
                <option value="For Quality Evaluation">
                  For Quality Evaluation
                </option>
                <option value="For S&E and Quality Evaluation">
                  For S&amp;E and Quality Evaluation
                </option>
              </select>
            </div>

            {/* Decker Remarks */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: colors.textPrimary,
                  marginBottom: "0.5rem",
                }}
              >
                Decker Remarks
              </label>
              <textarea
                value={formData.deckerRemarks}
                onChange={(e) => handleChange("deckerRemarks", e.target.value)}
                placeholder="Enter any remarks or notes..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.95rem",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#4CAF50";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = colors.inputBorder;
                }}
              />
            </div>

            {/* Dual assign info banner */}
            {isDualAssign && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  background: "#2196F310",
                  border: "1px solid #2196F330",
                  borderRadius: "8px",
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  animation: "fadeSlideIn 0.2s ease",
                }}
              >
                <span>🔀</span>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.82rem",
                    color: colors.textSecondary,
                  }}
                >
                  This decision will assign{" "}
                  <strong>two users simultaneously</strong> — one from the
                  Evaluator group and one from the S&E group.
                </p>
              </div>
            )}

            {/* Evaluator field */}
            {showNextUser && showEvaluator && (
              <div
                style={{
                  marginBottom: "1.5rem",
                  animation: "fadeSlideIn 0.2s ease",
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: colors.textPrimary,
                    marginBottom: "0.5rem",
                  }}
                >
                  {isDualAssign
                    ? "Assign Quality Evaluator"
                    : "Assign Evaluator"}{" "}
                  <span style={{ color: "#ef4444" }}>*</span>
                  <span
                    style={{
                      marginLeft: "0.5rem",
                      fontSize: "0.72rem",
                      fontWeight: "500",
                      color: "#4CAF50",
                      background: "#4CAF5015",
                      border: "1px solid #4CAF5030",
                      padding: "0.1rem 0.45rem",
                      borderRadius: "4px",
                    }}
                  >
                    Evaluator Group
                  </span>
                </label>

                {loadingUsers ? (
                  <LoadingField colors={colors} />
                ) : (
                  <UserSelect
                    value={formData.evaluator}
                    onChange={(v) => handleChange("evaluator", v)}
                    users={nextUsers}
                    colors={colors}
                  />
                )}
                {!loadingUsers && nextUsers.length === 0 && (
                  <EmptyWarning label="Evaluator" />
                )}
              </div>
            )}

            {/* S&E field */}
            {showNextUser && showSne && (
              <div
                style={{
                  marginBottom: "1.5rem",
                  animation: "fadeSlideIn 0.2s ease",
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: colors.textPrimary,
                    marginBottom: "0.5rem",
                  }}
                >
                  Assign S&E <span style={{ color: "#ef4444" }}>*</span>
                  <span
                    style={{
                      marginLeft: "0.5rem",
                      fontSize: "0.72rem",
                      fontWeight: "500",
                      color: "#2196F3",
                      background: "#2196F315",
                      border: "1px solid #2196F330",
                      padding: "0.1rem 0.45rem",
                      borderRadius: "4px",
                    }}
                  >
                    S&E Group
                  </span>
                </label>

                {loadingSneUsers ? (
                  <LoadingField colors={colors} />
                ) : (
                  <UserSelect
                    value={formData.sne}
                    onChange={(v) => handleChange("sne", v)}
                    users={sneUsers}
                    colors={colors}
                  />
                )}
                {!loadingSneUsers && sneUsers.length === 0 && (
                  <EmptyWarning label="S&E" />
                )}
              </div>
            )}

            {/* Info Box */}
            <div
              style={{
                padding: "1rem",
                background: "#4CAF5010",
                border: "1px solid #4CAF5030",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>ℹ️</span>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: colors.textSecondary,
                    lineHeight: "1.5",
                    margin: 0,
                  }}
                >
                  {isDualAssign
                    ? "Three activity logs will be created — one for the decker (Completed), one for the assigned Evaluator (In Progress), and one for the assigned S&E (In Progress)."
                    : "Two activity logs will be created — one for the decker (Step 1: Completed) and one for the assigned user (Step 2: In Progress)."}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "1.5rem 2rem",
              borderTop: `2px solid ${colors.cardBorder}`,
              display: "flex",
              gap: "1rem",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "0.75rem 1.5rem",
                background: colors.buttonSecondaryBg,
                border: `1px solid ${colors.buttonSecondaryBorder}`,
                borderRadius: "8px",
                color: colors.textPrimary,
                fontSize: "0.95rem",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = colors.badgeBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.buttonSecondaryBg;
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              style={{
                padding: "0.75rem 1.5rem",
                background: isSubmitDisabled ? "#4CAF5080" : "#4CAF50",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.95rem",
                fontWeight: "600",
                cursor: isSubmitDisabled ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitDisabled)
                  e.currentTarget.style.background = "#45a049";
              }}
              onMouseLeave={(e) => {
                if (!isSubmitDisabled)
                  e.currentTarget.style.background = "#4CAF50";
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      display: "inline-block",
                      width: "16px",
                      height: "16px",
                      border: "2px solid #ffffff40",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin 0.6s linear infinite",
                    }}
                  />
                  <span>Decking...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Deck Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInScale {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

// Reusable sub-components
function LoadingField({ colors }) {
  return (
    <div
      style={{
        width: "100%",
        padding: "0.75rem 1rem",
        background: colors.inputBg,
        border: `1px solid ${colors.inputBorder}`,
        borderRadius: "8px",
        color: colors.textTertiary,
        fontSize: "0.95rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "14px",
          height: "14px",
          border: "2px solid #4CAF5030",
          borderTopColor: "#4CAF50",
          borderRadius: "50%",
          animation: "spin 0.6s linear infinite",
        }}
      />
      <span>Loading users...</span>
    </div>
  );
}

function UserSelect({ value, onChange, users, colors }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      disabled={users.length === 0}
      style={{
        width: "100%",
        padding: "0.75rem 1rem",
        background: colors.inputBg,
        border: `1px solid ${colors.inputBorder}`,
        borderRadius: "8px",
        color: colors.textPrimary,
        fontSize: "0.95rem",
        outline: "none",
        cursor: users.length === 0 ? "not-allowed" : "pointer",
        opacity: users.length === 0 ? 0.6 : 1,
        transition: "all 0.2s",
      }}
      onFocus={(e) => {
        if (users.length > 0) e.target.style.borderColor = "#4CAF50";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = colors.inputBorder;
      }}
    >
      <option value="">
        {users.length === 0 ? "No users available" : "Select a user"}
      </option>
      {users.map((user) => (
        <option key={user.id} value={user.username}>
          {user.username} - {user.first_name} {user.surname}
        </option>
      ))}
    </select>
  );
}

function EmptyWarning({ label }) {
  return (
    <p
      style={{
        fontSize: "0.75rem",
        color: "#ef4444",
        marginTop: "0.5rem",
        marginBottom: 0,
      }}
    >
      ⚠️ No users found in the {label} group.
    </p>
  );
}

export default DeckModal;
