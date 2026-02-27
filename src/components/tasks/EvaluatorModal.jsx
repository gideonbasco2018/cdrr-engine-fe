import { useState, useEffect } from "react";
import { getUsersByGroup, getUser } from "../../api/auth";
import {
  createApplicationLog,
  getLastApplicationLogIndex,
} from "../../api/application-logs";

function EvaluatorModal({ record, onClose, onSuccess, colors }) {
  const [formData, setFormData] = useState({
    evaluator: "",
    checker: "",
    evalDecision: "",
    evalRemarks: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [checkers, setCheckers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const CHECKER_GROUP_ID = 4;

  useEffect(() => {
    const user = getUser();
    if (user) {
      setCurrentUser(user);
      setFormData((p) => ({ ...p, evaluator: user.username }));
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoadingUsers(true);
        setCheckers(await getUsersByGroup(CHECKER_GROUP_ID));
      } catch {
        setCheckers([]);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, []);

  const handleChange = (f, v) => setFormData((p) => ({ ...p, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.evaluator || !formData.checker || !formData.evalDecision) {
      alert(
        "⚠️ Please fill in required fields:\n- Checker\n- Evaluation Decision",
      );
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

      // Step 1: Evaluator log (COMPLETED)
      await createApplicationLog({
        main_db_id: record.id,
        application_step: "Quality Evaluation",
        user_name: formData.evaluator,
        application_status: "COMPLETED",
        application_decision: formData.evalDecision,
        application_remarks: formData.evalRemarks || "",
        start_date: formattedDateTime,
        accomplished_date: formattedDateTime,
        del_index: nextIndex,
        del_previous: lastIndex,
        del_last_index: closeTask,
        del_thread: "Close",
      });

      // Step 2: Checker log (IN PROGRESS)
      await createApplicationLog({
        main_db_id: record.id,
        application_step: "Checking",
        user_name: formData.checker,
        application_status: "IN PROGRESS",
        application_decision: "",
        application_remarks: "",
        start_date: formattedDateTime,
        accomplished_date: null,
        del_index: nextIndex + 1,
        del_previous: nextIndex,
        del_last_index: openTask,
        del_thread: "Open",
      });

      onClose();
      alert("✅ Evaluation completed successfully!");
      if (onSuccess) await onSuccess();
    } catch (err) {
      alert(`❌ Failed to evaluate record: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: "100%",
    padding: "0.75rem 1rem",
    background: colors.inputBg,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: "8px",
    color: colors.textPrimary,
    fontSize: "0.95rem",
    outline: "none",
    transition: "all 0.2s",
  };

  const isSubmitDisabled = loading || loadingUsers || checkers.length === 0;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 9998,
          backdropFilter: "blur(4px)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: "90%",
          maxWidth: "600px",
          background: colors.cardBg,
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          zIndex: 9999,
          border: `1px solid ${colors.cardBorder}`,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
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
            <p style={{ fontSize: "0.875rem", color: colors.textTertiary }}>
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

        <form onSubmit={handleSubmit}>
          <div style={{ padding: "2rem" }}>
            {/* Evaluator Name */}
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
                  ...inp,
                  background: colors.badgeBg,
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
                style={{ ...inp, cursor: "pointer" }}
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
                style={{ ...inp, resize: "vertical", fontFamily: "inherit" }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#2196F3";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = colors.inputBorder;
                }}
              />
            </div>

            {/* Checker Selection */}
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
                    ...inp,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: colors.textTertiary,
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
                    ...inp,
                    cursor: checkers.length === 0 ? "not-allowed" : "pointer",
                    opacity: checkers.length === 0 ? 0.6 : 1,
                  }}
                  onFocus={(e) => {
                    if (checkers.length > 0)
                      e.target.style.borderColor = "#2196F3";
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
                  {checkers.map((u) => (
                    <option key={u.id} value={u.username}>
                      {u.username} - {u.first_name} {u.surname}
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
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: colors.textSecondary,
                    lineHeight: "1.5",
                    margin: 0,
                  }}
                >
                  Two activity logs will be created — one for the evaluator
                  (Completed) and one for the assigned checker (In Progress).
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
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              style={{
                padding: "0.75rem 1.5rem",
                background: isSubmitDisabled ? "#2196F380" : "#2196F3",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.95rem",
                fontWeight: "600",
                cursor: isSubmitDisabled ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitDisabled)
                  e.currentTarget.style.background = "#1976D2";
              }}
              onMouseLeave={(e) => {
                if (!isSubmitDisabled)
                  e.currentTarget.style.background = "#2196F3";
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

export default EvaluatorModal;
