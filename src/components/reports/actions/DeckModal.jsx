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
    doctackRemarks: "", // ← Auto-filled based on decision; editable by user
  });

  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSneUsers, setLoadingSneUsers] = useState(false);
  const [nextUsers, setNextUsers] = useState([]);
  const [sneUsers, setSneUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  // ── Confirmation step ──
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const GROUP_IDS = { EVALUATOR: 3, SE: 13 };

  const DECISION_CONFIG = {
    "For S&E": { fetchEvaluator: false, fetchSne: true },
    "For Quality Evaluation": { fetchEvaluator: true, fetchSne: false },
    "For S&E and Quality Evaluation": { fetchEvaluator: true, fetchSne: true },
  };

  // ── Auto-fill doctackRemarks per decision ──────────────────────────────────
  // Edit the values below to change the default remarks per decision.
  const DOCTRACK_REMARKS_DEFAULTS = {
    "For S&E": "Forwarded to S&E",
    "For Quality Evaluation": "Forwarded to evaluator",
    "For S&E and Quality Evaluation": "Forwarded to S&E and Evaluator",
  };
  // ──────────────────────────────────────────────────────────────────────────

  const resolveEvaluatorId = (username) =>
    nextUsers.find((u) => u.username === username)?.id ?? null;

  const resolveSneId = (username) =>
    sneUsers.find((u) => u.username === username)?.id ?? null;

  useEffect(() => {
    const user = getUser();
    if (user) {
      setCurrentUser(user);
      setFormData((prev) => ({ ...prev, decker: user.username }));
    }
  }, []);

  useEffect(() => {
    const decision = formData.deckerDecision;

    // Reset user selections + auto-fill doctackRemarks
    setFormData((prev) => ({
      ...prev,
      evaluator: "",
      sne: "",
      doctackRemarks: DOCTRACK_REMARKS_DEFAULTS[decision] ?? "",
    }));
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
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ── Called after user confirms in the confirmation modal ──
  const handleSubmit = async () => {
    const config = DECISION_CONFIG[formData.deckerDecision];
    const needsEvaluator = config?.fetchEvaluator;
    const needsSne = config?.fetchSne;

    setLoading(true);
    try {
      const now = new Date();
      const phtOffset = 8 * 60 * 60 * 1000;
      const formattedDateTime = new Date(
        now.getTime() + phtOffset,
      ).toISOString();
      const indexData = await getLastApplicationLogIndex(record.id);
      const lastIndex = indexData.last_index;
      const nextIndex = lastIndex + 1;
      const closeTask = 0;
      const openTask = 1;

      await createApplicationLog({
        main_db_id: record.id,
        application_step: "Decking",
        user_name: formData.decker,
        application_status: "COMPLETED",
        application_decision: formData.deckerDecision,
        application_remarks: formData.deckerRemarks || "",
        doctrack_remarks: formData.doctackRemarks || "", // ← Doctrack remarks
        start_date: formattedDateTime,
        accomplished_date: formattedDateTime,
        del_index: nextIndex,
        del_previous: lastIndex,
        del_last_index: closeTask,
        del_thread: "Close",
        user_id: currentUser?.id ?? null,
        action_type: "Decked",
      });

      if (formData.deckerDecision === "For S&E and Quality Evaluation") {
        await createApplicationLog({
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
          user_id: resolveEvaluatorId(formData.evaluator),
        });
        await createApplicationLog({
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
          user_id: resolveSneId(formData.sne),
        });
      } else {
        const stepLabel =
          formData.deckerDecision === "For S&E" ? "S&E" : "Quality Evaluation";
        const assignedUser = needsEvaluator ? formData.evaluator : formData.sne;
        await createApplicationLog({
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
          user_id: needsEvaluator
            ? resolveEvaluatorId(assignedUser)
            : resolveSneId(assignedUser),
        });
      }

      onClose();
      alert("✅ Application decked successfully!");
      if (onSuccess) await onSuccess();
    } catch (error) {
      console.error("❌ Failed to deck record:", error);
      alert(`❌ Failed to deck record: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Form validation before showing confirmation ──
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const config = DECISION_CONFIG[formData.deckerDecision];
    if (!formData.deckerDecision)
      return alert("⚠️ Please select a Decker Decision.");
    if (config?.fetchEvaluator && !formData.evaluator)
      return alert("⚠️ Please assign an Evaluator.");
    if (config?.fetchSne && !formData.sne)
      return alert("⚠️ Please assign an S&E.");
    // All valid — show confirmation
    setConfirmSubmit(true);
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

      {/* Outer centering container */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "600px",
            maxHeight: "calc(100vh - 2rem)",
            background: colors.cardBg,
            borderRadius: "16px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
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
              background: colors.cardBg,
              borderRadius: "16px 16px 0 0",
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
          <form
            onSubmit={handleFormSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* Scrollable body */}
            <div
              style={{
                padding: "2rem",
                overflowY: "auto",
                overflowX: "hidden",
                flex: 1,
              }}
            >
              {/* Decker Name */}
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
                    boxSizing: "border-box",
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
                  onChange={(e) =>
                    handleChange("deckerDecision", e.target.value)
                  }
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
                    boxSizing: "border-box",
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
                  onChange={(e) =>
                    handleChange("deckerRemarks", e.target.value)
                  }
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
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#4CAF50";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = colors.inputBorder;
                  }}
                />
              </div>

              {/* ── Doctrack Remarks ───────────────────────────────────────────
                   Auto-filled from DOCTRACK_REMARKS_DEFAULTS when decision
                   changes. User can still manually override the value.
              ──────────────────────────────────────────────────────────────── */}
              {formData.deckerDecision && (
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
                    Doctrack Remarks
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        fontSize: "0.7rem",
                        fontWeight: "500",
                        color: "#2196F3",
                        background: "#2196F315",
                        border: "1px solid #2196F330",
                        padding: "0.1rem 0.45rem",
                        borderRadius: "4px",
                      }}
                    >
                      auto-filled
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.doctackRemarks}
                    onChange={(e) =>
                      handleChange("doctackRemarks", e.target.value)
                    }
                    placeholder="Doctrack remarks..."
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
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#2196F3";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = colors.inputBorder;
                    }}
                  />
                  <p
                    style={{
                      fontSize: "0.72rem",
                      color: colors.textTertiary,
                      marginTop: "0.35rem",
                      marginBottom: 0,
                    }}
                  >
                    💡 Default based on selected decision. You may edit if
                    needed.
                  </p>
                </div>
              )}
              {/* ── End Doctrack Remarks ─────────────────────────────────── */}

              {/* Dual assign banner */}
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
                flexShrink: 0,
                background: colors.cardBg,
                borderRadius: "0 0 16px 16px",
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
                  if (!loading)
                    e.currentTarget.style.background = colors.badgeBg;
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
      </div>

      {/* ── Confirmation Modal ── */}
      {confirmSubmit && (
        <div
          onClick={() => setConfirmSubmit(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 16,
              padding: "2rem",
              width: 400,
              maxWidth: "90%",
              boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
              animation: "slideInScale 0.25s ease",
            }}
          >
            <div
              style={{
                fontSize: "2rem",
                textAlign: "center",
                marginBottom: "0.75rem",
              }}
            >
              🎯
            </div>
            <h3
              style={{
                margin: "0 0 0.5rem",
                color: colors.textPrimary,
                fontSize: "1.1rem",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              Confirm Decking
            </h3>
            <p
              style={{
                margin: "0 0 1.25rem",
                color: colors.textSecondary,
                fontSize: "0.88rem",
                lineHeight: 1.6,
                textAlign: "center",
              }}
            >
              You are about to deck DTN{" "}
              <strong style={{ color: "#4CAF50" }}>{record.dtn}</strong> with
              the following details:
            </p>

            {/* Summary */}
            <div
              style={{
                background: colors.badgeBg,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                padding: "0.9rem 1rem",
                marginBottom: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.85rem",
                }}
              >
                <span style={{ color: colors.textTertiary }}>Decision</span>
                <strong style={{ color: colors.textPrimary }}>
                  {formData.deckerDecision}
                </strong>
              </div>
              {formData.evaluator && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.85rem",
                  }}
                >
                  <span style={{ color: colors.textTertiary }}>Evaluator</span>
                  <strong style={{ color: "#4CAF50" }}>
                    {formData.evaluator}
                  </strong>
                </div>
              )}
              {formData.sne && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.85rem",
                  }}
                >
                  <span style={{ color: colors.textTertiary }}>S&E</span>
                  <strong style={{ color: "#2196F3" }}>{formData.sne}</strong>
                </div>
              )}
              {formData.deckerRemarks && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.85rem",
                    gap: "1rem",
                  }}
                >
                  <span style={{ color: colors.textTertiary, flexShrink: 0 }}>
                    Remarks
                  </span>
                  <span
                    style={{ color: colors.textSecondary, textAlign: "right" }}
                  >
                    {formData.deckerRemarks}
                  </span>
                </div>
              )}
              {/* Doctrack Remarks row in confirmation summary */}
              {formData.doctackRemarks && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.85rem",
                    gap: "1rem",
                  }}
                >
                  <span style={{ color: colors.textTertiary, flexShrink: 0 }}>
                    Doctrack Remarks
                  </span>
                  <span
                    style={{ color: colors.textSecondary, textAlign: "right" }}
                  >
                    {formData.doctackRemarks}
                  </span>
                </div>
              )}
              <div
                style={{
                  borderTop: `1px solid ${colors.cardBorder}`,
                  paddingTop: "0.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.82rem",
                }}
              >
                <span style={{ color: colors.textTertiary }}>
                  Activity logs to create
                </span>
                <strong style={{ color: colors.textPrimary }}>
                  {isDualAssign ? 3 : 2} logs
                </strong>
              </div>
            </div>

            <p
              style={{
                margin: "0 0 1.5rem",
                color: colors.textTertiary,
                fontSize: "0.8rem",
                textAlign: "center",
              }}
            >
              This action cannot be undone.
            </p>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => setConfirmSubmit(false)}
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
                Go Back
              </button>
              <button
                onClick={() => {
                  setConfirmSubmit(false);
                  handleSubmit();
                }}
                style={{
                  padding: "0.55rem 1.5rem",
                  borderRadius: 8,
                  border: "none",
                  background: "#4CAF50",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(76,175,80,0.35)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#45a049")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#4CAF50")
                }
              >
                <span>✓</span> Yes, Deck Application
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInScale { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}

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
        boxSizing: "border-box",
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
