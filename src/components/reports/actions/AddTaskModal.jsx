import { useState, useEffect } from "react";
import {
  addTaskForSelected,
  getAllApplicationSteps,
  getUsersForSelect,
} from "../../../api/application-logs";

function AddTaskModal({ selectedIds, onClose, onSuccess, colors, darkMode }) {
  const [users, setUsers] = useState([]);
  const [steps, setSteps] = useState([]);
  const appStatus = "IN PROGRESS";
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [userId, setUserId] = useState("");
  const [step, setStep] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        setLoadingOptions(true);
        const [u, s] = await Promise.all([
          getUsersForSelect(),
          getAllApplicationSteps(),
        ]);
        setUsers(u);
        setSteps(s);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingOptions(false);
      }
    };
    loadOptions();
  }, []);

  const finalStep = step;

  const canSubmit =
    !submitting &&
    !loadingOptions &&
    userId &&
    finalStep &&
    selectedIds.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      setError(null);
      const result = await addTaskForSelected({
        main_db_ids: selectedIds,
        application_step: finalStep,
        application_status: appStatus,
        user_id: Number(userId),
        remarks: remarks.trim() || null,
        close_previous: false,
      });

      let msg = `✅ Task added!\n\n✓ Created: ${result.created}\n`;
      if (result.failed > 0) {
        msg += `✗ Failed: ${result.failed}\n`;
        const failedList = result.results
          .filter((r) => !r.success)
          .map((r) => `  • DB_ID ${r.main_db_id}: ${r.error}`)
          .join("\n");
        msg += failedList;
      }
      alert(msg);

      onSuccess && (await onSuccess());
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 6,
    border: `1px solid ${colors.cardBorder}`,
    background: darkMode ? "#111" : "#fff",
    color: colors.textPrimary,
    fontSize: "0.8rem",
  };
  const labelStyle = {
    fontSize: "0.72rem",
    fontWeight: 600,
    color: colors.textTertiary,
    marginBottom: 4,
    display: "block",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 14,
          padding: "1.5rem",
          width: 380,
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            🎯 Add New Task
          </h3>
          <p
            style={{
              margin: "0.25rem 0 0",
              fontSize: "0.72rem",
              color: colors.textTertiary,
            }}
          >
            {selectedIds.length} record{selectedIds.length !== 1 ? "s" : ""}{" "}
            selected
          </p>
        </div>

        {loadingOptions ? (
          <div style={{ fontSize: "0.8rem", color: colors.textTertiary }}>
            Loading options…
          </div>
        ) : (
          <>
            <div>
              <label style={labelStyle}>Application Step</label>
              <select
                style={selectStyle}
                value={step}
                onChange={(e) => setStep(e.target.value)}
              >
                <option value="">-- Select step --</option>
                {steps.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {step === "__custom__" && (
                <input
                  type="text"
                  placeholder="Type new step, e.g. S&E"
                  value={customStep}
                  onChange={(e) => setCustomStep(e.target.value)}
                  style={{ ...selectStyle, marginTop: 6 }}
                />
              )}
            </div>

            <div>
              <label style={labelStyle}>Application Status</label>
              <div
                style={{
                  ...selectStyle,
                  display: "flex",
                  alignItems: "center",
                  background: darkMode ? "#161616" : "#f0f0f0",
                  color: colors.textSecondary,
                  cursor: "not-allowed",
                }}
              >
                IN PROGRESS
              </div>
            </div>

            <div>
              <label style={labelStyle}>Assign to</label>
              <select
                style={selectStyle}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              >
                <option value="">-- Select user --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.username})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Remarks (optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any notes about this task assignment..."
                rows={3}
                style={{
                  ...selectStyle,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </>
        )}

        {error && (
          <div style={{ fontSize: "0.75rem", color: "#ef4444" }}>{error}</div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem",
            marginTop: "0.25rem",
          }}
        >
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textPrimary,
              fontSize: "0.78rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "none",
              background: canSubmit
                ? "linear-gradient(135deg,#10B981,#059669)"
                : colors.cardBorder,
              color: "#fff",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "Adding…" : "Add Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddTaskModal;
