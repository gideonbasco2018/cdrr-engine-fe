import { useState, useEffect } from "react";
import { getUsersByGroup, getUser } from "../../../api/auth";
import { evaluateApplication } from "../../../api/reports";

function EvaluatorModal({ record, onClose, onSuccess, colors }) {
  const [formData, setFormData] = useState({
    evaluator: "",
    checker: "",
    evalDecision: "",
    evalRemarks: "",
    dateEvalEnd: "", // Will be set to current timestamp on submit
  });

  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [checkers, setCheckers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // ✅ Checker group ID (based on your database)
  const CHECKER_GROUP_ID = 4; // Change this to match your "Checker" group ID

  // Get current logged-in user and set as evaluator automatically
  useEffect(() => {
    const user = getUser();
    if (user) {
      // Use username instead of full name (same as stored in DB)
      const evaluatorName = user.username;
      setCurrentUser(user);
      setFormData((prev) => ({
        ...prev,
        evaluator: evaluatorName,
      }));
      console.log("✅ Auto-filled evaluator:", evaluatorName);
    }
  }, []);

  // ✅ Fetch users from Checker group (group_id = 4)
  useEffect(() => {
    const fetchCheckers = async () => {
      try {
        setLoadingUsers(true);
        const users = await getUsersByGroup(CHECKER_GROUP_ID);
        setCheckers(users);
        console.log("✅ Fetched checkers:", users);
      } catch (error) {
        console.error("❌ Failed to fetch checkers:", error);
        setCheckers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchCheckers();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.evaluator || !formData.checker || !formData.evalDecision) {
      alert(
        "⚠️ Please fill in required fields:\n- Checker\n- Evaluation Decision"
      );
      return;
    }

    setLoading(true);
    try {
      // ✅ Get current time in Philippine Time (UTC+8)
      const now = new Date();

      // Convert to Philippine Time
      const phTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Manila" })
      );

      // Format as YYYY-MM-DD HH:MM:SS
      const year = phTime.getFullYear();
      const month = String(phTime.getMonth() + 1).padStart(2, "0");
      const day = String(phTime.getDate()).padStart(2, "0");
      const hours = String(phTime.getHours()).padStart(2, "0");
      const minutes = String(phTime.getMinutes()).padStart(2, "0");
      const seconds = String(phTime.getSeconds()).padStart(2, "0");

      const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      const dataToSubmit = {
        ...formData,
        dateEvalEnd: formattedDateTime,
      };

      console.log("📤 Submitting evaluation data:", dataToSubmit);

      // ✅ Call the API to evaluate the application
      const response = await evaluateApplication(record.id, dataToSubmit);

      console.log("✅ Application evaluated successfully:", response);

      // ✅ First close the modal
      onClose();

      // ✅ Then show success message
      alert("✅ Evaluation completed successfully!");

      // ✅ Finally refresh the data
      if (onSuccess) {
        await onSuccess();
      }
    } catch (error) {
      console.error("❌ Failed to evaluate record:", error);
      alert(`❌ Failed to evaluate record: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

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
              📋 Complete Evaluation
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: colors.textTertiary,
              }}
            >
              DTN: <strong style={{ color: "#2196F3" }}>{record.dtn}</strong>
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
            {/* Evaluator Name - Auto-filled (Read-only) */}
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
                Evaluator Name (You) <span style={{ color: "#2196F3" }}>●</span>
              </label>
              <input
                type="text"
                value={formData.evaluator}
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

            {/* Evaluation Decision */}
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
                Evaluation Decision <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={formData.evalDecision}
                onChange={(e) => handleChange("evalDecision", e.target.value)}
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
                  e.target.style.borderColor = "#2196F3";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = colors.inputBorder;
                }}
              >
                <option value="">Select decision</option>
                <option value="For Checking">For Checking</option>
                <option value="For Compliance">For Compliance</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {/* Evaluation Remarks */}
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
                Evaluation Remarks
              </label>
              <textarea
                value={formData.evalRemarks}
                onChange={(e) => handleChange("evalRemarks", e.target.value)}
                placeholder="Enter your evaluation notes and findings..."
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
                  e.target.style.borderColor = "#2196F3";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = colors.inputBorder;
                }}
              />
            </div>

            {/* ✅ Checker Selection - Only from Checker group */}
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
                Assign Checker <span style={{ color: "#ef4444" }}>*</span>
              </label>
              {loadingUsers ? (
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
                      border: "2px solid #2196F330",
                      borderTopColor: "#2196F3",
                      borderRadius: "50%",
                      animation: "spin 0.6s linear infinite",
                    }}
                  />
                  <span>Loading checkers...</span>
                </div>
              ) : (
                <select
                  value={formData.checker}
                  onChange={(e) => handleChange("checker", e.target.value)}
                  required
                  disabled={checkers.length === 0}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    background: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "8px",
                    color: colors.textPrimary,
                    fontSize: "0.95rem",
                    outline: "none",
                    cursor: checkers.length === 0 ? "not-allowed" : "pointer",
                    opacity: checkers.length === 0 ? 0.6 : 1,
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    if (checkers.length > 0) {
                      e.target.style.borderColor = "#2196F3";
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = colors.inputBorder;
                  }}
                >
                  <option value="">
                    {checkers.length === 0
                      ? "No checkers available"
                      : "Select a checker"}
                  </option>
                  {checkers.map((user) => (
                    <option key={user.id} value={user.username}>
                      {user.username} - {user.first_name} {user.surname}
                    </option>
                  ))}
                </select>
              )}
              {!loadingUsers && checkers.length === 0 && (
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#ef4444",
                    marginTop: "0.5rem",
                    marginBottom: 0,
                  }}
                >
                  ⚠️ No checkers found in Checker group.
                </p>
              )}
            </div>

            {/* Info Box */}
            <div
              style={{
                padding: "1rem",
                background: "#2196F310",
                border: "1px solid #2196F330",
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
                <div>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: colors.textSecondary,
                      lineHeight: "1.5",
                      margin: 0,
                    }}
                  >
                    This will complete your evaluation and assign a checker to
                    this application. The record will move from "Pending
                    Evaluation" to "Completed" tab and appear in the checker's
                    queue.
                  </p>
                </div>
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
                if (!loading) {
                  e.currentTarget.style.background = colors.badgeBg;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.buttonSecondaryBg;
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || loadingUsers || checkers.length === 0}
              style={{
                padding: "0.75rem 1.5rem",
                background:
                  loading || loadingUsers || checkers.length === 0
                    ? "#2196F380"
                    : "#2196F3",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.95rem",
                fontWeight: "600",
                cursor:
                  loading || loadingUsers || checkers.length === 0
                    ? "not-allowed"
                    : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!loading && !loadingUsers && checkers.length > 0) {
                  e.currentTarget.style.background = "#1976D2";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && !loadingUsers && checkers.length > 0) {
                  e.currentTarget.style.background = "#2196F3";
                }
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
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Complete Evaluation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInScale {
          from { 
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to { 
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

export default EvaluatorModal;
