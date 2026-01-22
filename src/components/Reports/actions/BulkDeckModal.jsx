// src/components/UploadReports/actions/BulkDeckModal.jsx

import { useState, useEffect } from "react";
import { getUsersByGroup, getUser } from "../../../api/auth";

function BulkDeckModal({ records, onClose, onSubmit, colors }) {
  const [formData, setFormData] = useState({
    decker: "",
    evaluator: "",
    deckerDecision: "",
    deckerRemarks: "",
    dateDeckedEnd: new Date().toISOString().split("T")[0],
  });

  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [evaluators, setEvaluators] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const EVALUATOR_GROUP_ID = 3;

  // Get current logged-in user and set as decker automatically
  useEffect(() => {
    const user = getUser();
    if (user) {
      const deckerName = `${user.first_name} ${user.surname}`;
      setCurrentUser(user);
      setFormData((prev) => ({
        ...prev,
        decker: deckerName,
      }));
      console.log("✅ Auto-filled decker:", deckerName);
    }
  }, []);

  // Fetch users from Evaluator group
  useEffect(() => {
    const fetchEvaluators = async () => {
      try {
        setLoadingUsers(true);
        const users = await getUsersByGroup(EVALUATOR_GROUP_ID);
        setEvaluators(users);
        console.log("✅ Fetched evaluators:", users);
      } catch (error) {
        console.error("❌ Failed to fetch evaluators:", error);
        setEvaluators([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchEvaluators();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.decker || !formData.evaluator || !formData.deckerDecision) {
      alert(
        "⚠️ Please fill in required fields:\n- Evaluator\n- Decker Decision"
      );
      return;
    }

    setLoading(true);
    try {
      // Pass array of record IDs instead of single ID
      await onSubmit(
        records.map((r) => r.id),
        formData
      );
      onClose();
    } catch (error) {
      console.error("Failed to deck applications:", error);
      alert("❌ Failed to deck applications. Please try again.");
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
          maxWidth: "700px",
          maxHeight: "90vh",
          background: colors.cardBg,
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          zIndex: 9999,
          animation: "slideInScale 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          border: `1px solid ${colors.cardBorder}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
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
            flexShrink: 0,
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
              🎯 Deck Multiple Applications
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: colors.textTertiary,
              }}
            >
              Decking{" "}
              <strong style={{ color: "#4CAF50" }}>{records.length}</strong>{" "}
              applications
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
              flexShrink: 0,
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

        {/* Form - NO <form> tag, using onSubmit on button instead */}
        <form onSubmit={handleSubmit}>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: "2rem",
            }}
          >
            {/* Selected DTNs Display */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: colors.textPrimary,
                  marginBottom: "0.75rem",
                }}
              >
                Selected Applications ({records.length})
              </label>
              <div
                style={{
                  maxHeight: "180px",
                  overflowY: "auto",
                  background: colors.badgeBg,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "8px",
                  padding: "1rem",
                }}
              >
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                >
                  {records.map((record) => (
                    <span
                      key={record.id}
                      style={{
                        padding: "0.4rem 0.8rem",
                        background: "#4CAF5020",
                        color: "#4CAF50",
                        borderRadius: "6px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        border: "1px solid #4CAF5040",
                      }}
                    >
                      {record.dtn}
                    </span>
                  ))}
                </div>
              </div>
            </div>

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
                <option value="Approved">Approved</option>
                <option value="For Evaluation">For Evaluation</option>
                <option value="For Compliance">For Compliance</option>
                <option value="Rejected">Rejected</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>

            {/* Date Decked End */}
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
                Date Decked End
              </label>
              <input
                type="date"
                value={formData.dateDeckedEnd}
                onChange={(e) => handleChange("dateDeckedEnd", e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.95rem",
                  outline: "none",
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

            {/* Evaluator Selection - Only from Evaluator group */}
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
                Assign Evaluator <span style={{ color: "#ef4444" }}>*</span>
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
                      border: "2px solid #4CAF5030",
                      borderTopColor: "#4CAF50",
                      borderRadius: "50%",
                      animation: "spin 0.6s linear infinite",
                    }}
                  />
                  <span>Loading evaluators...</span>
                </div>
              ) : (
                <select
                  value={formData.evaluator}
                  onChange={(e) => handleChange("evaluator", e.target.value)}
                  required
                  disabled={evaluators.length === 0}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    background: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "8px",
                    color: colors.textPrimary,
                    fontSize: "0.95rem",
                    outline: "none",
                    cursor: evaluators.length === 0 ? "not-allowed" : "pointer",
                    opacity: evaluators.length === 0 ? 0.6 : 1,
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    if (evaluators.length > 0) {
                      e.target.style.borderColor = "#4CAF50";
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = colors.inputBorder;
                  }}
                >
                  <option value="">
                    {evaluators.length === 0
                      ? "No evaluators available"
                      : "Select an evaluator"}
                  </option>
                  {evaluators.map((user) => (
                    <option key={user.id} value={user.username}>
                      {user.username} - {user.first_name} {user.surname}
                    </option>
                  ))}
                </select>
              )}
              {!loadingUsers && evaluators.length === 0 && (
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#ef4444",
                    marginTop: "0.5rem",
                    marginBottom: 0,
                  }}
                >
                  ⚠️ No evaluators found in Evaluator group.
                </p>
              )}
            </div>

            {/* Info Box */}
            <div
              style={{
                padding: "1rem",
                background: "#4CAF5010",
                border: "1px solid #4CAF5030",
                borderRadius: "8px",
                marginBottom: "1.5rem",
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
                    This will apply the same decision and evaluator to all{" "}
                    {records.length} selected applications. All records will
                    move from "Not Yet Decked" to "Decked" tab.
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
              flexShrink: 0,
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
              disabled={loading || loadingUsers || evaluators.length === 0}
              style={{
                padding: "0.75rem 1.5rem",
                background:
                  loading || loadingUsers || evaluators.length === 0
                    ? "#4CAF5080"
                    : "#4CAF50",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.95rem",
                fontWeight: "600",
                cursor:
                  loading || loadingUsers || evaluators.length === 0
                    ? "not-allowed"
                    : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!loading && !loadingUsers && evaluators.length > 0) {
                  e.currentTarget.style.background = "#45a049";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && !loadingUsers && evaluators.length > 0) {
                  e.currentTarget.style.background = "#4CAF50";
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
                  <span>Decking...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Deck {records.length} Applications</span>
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

export default BulkDeckModal;
