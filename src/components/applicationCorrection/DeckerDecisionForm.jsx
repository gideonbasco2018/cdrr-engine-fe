import { useState, useEffect } from "react";
import { ToggleSwitch } from "./shared/ToggleSwitch";
import { DECKER_DECISIONS, DOCTRACK_DEFAULTS } from "./constants";
import { getTheme } from "./theme";
import { getUsersByGroup } from "../../api/auth"; // ← adjust path kung kailangan

const DECISION_CONFIG = {
  "For S&E": { fetchEvaluator: false, fetchSne: true },
  "For Quality Evaluation": { fetchEvaluator: true, fetchSne: false },
  "For S&E and Quality Evaluation": { fetchEvaluator: true, fetchSne: true },
};

const GROUP_IDS = { EVALUATOR: 3, SE: 13 };

export function DeckerDecisionForm({
  record,
  deckerData,
  onDeckerChange,
  darkMode,
}) {
  const t = getTheme(darkMode);
  const dm = darkMode;

  const [evaluatorUsers, setEvaluatorUsers] = useState([]);
  const [sneUsers, setSneUsers] = useState([]);
  const [loadingEvaluator, setLoadingEvaluator] = useState(false);
  const [loadingSne, setLoadingSne] = useState(false);

  // ← Fetch users kapag nagbago ang decision
  useEffect(() => {
    const decision = deckerData.decision;
    setEvaluatorUsers([]);
    setSneUsers([]);

    if (!decision || !DECISION_CONFIG[decision]) return;
    const config = DECISION_CONFIG[decision];

    if (config.fetchEvaluator) {
      setLoadingEvaluator(true);
      getUsersByGroup(GROUP_IDS.EVALUATOR)
        .then(setEvaluatorUsers)
        .catch(() => setEvaluatorUsers([]))
        .finally(() => setLoadingEvaluator(false));
    }

    if (config.fetchSne) {
      setLoadingSne(true);
      getUsersByGroup(GROUP_IDS.SE)
        .then(setSneUsers)
        .catch(() => setSneUsers([]))
        .finally(() => setLoadingSne(false));
    }
  }, [deckerData.decision]);

  const handleDecisionChange = (decision) => {
    const autoRemark = DOCTRACK_DEFAULTS[decision] || "";
    onDeckerChange({
      ...deckerData,
      decision,
      evaluator: "",
      sne: "",
      doctrackRemarks: deckerData.doctrackAutoFill
        ? autoRemark
        : deckerData.doctrackRemarks,
    });
  };

  const handleToggleAutoFill = (val) => {
    const autoRemark =
      val && deckerData.decision
        ? DOCTRACK_DEFAULTS[deckerData.decision] || ""
        : deckerData.doctrackRemarks;
    onDeckerChange({
      ...deckerData,
      doctrackAutoFill: val,
      doctrackRemarks: autoRemark,
    });
  };

  const baseInput = {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 11px",
    fontSize: 13.5,
    fontFamily: "inherit",
    border: `1px solid ${t.inputBorder}`,
    borderRadius: 7,
    background: t.inputBg,
    color: t.textPrimary,
    outline: "none",
  };

  const lbl = (text) => (
    <label
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 600,
        color: t.labelColor,
        marginBottom: 6,
      }}
    >
      {text}
    </label>
  );

  const config = DECISION_CONFIG[deckerData.decision];
  const showEvaluator = config?.fetchEvaluator;
  const showSne = config?.fetchSne;
  const isDualAssign = deckerData.decision === "For S&E and Quality Evaluation";

  const UserSelectField = ({
    label,
    badge,
    badgeColor,
    value,
    onChange,
    users,
    loading,
  }) => (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 6,
        }}
      >
        <label style={{ fontSize: 12, fontWeight: 600, color: t.labelColor }}>
          {label}
        </label>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 8,
            background: t.successBg,
            color: badgeColor || t.successText,
            border: `1px solid ${t.successBorder}`,
          }}
        >
          {badge}
        </span>
        <span style={{ color: t.errorText, fontSize: 12, marginLeft: -4 }}>
          *
        </span>
      </div>
      {loading ? (
        <div
          style={{
            ...baseInput,
            color: t.textTertiary,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              border: "2px solid rgba(100,100,100,0.2)",
              borderTopColor: t.textTertiary,
              borderRadius: "50%",
              animation: "spin 0.6s linear infinite",
            }}
          />
          Loading users...
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={users.length === 0}
            style={{
              ...baseInput,
              padding: "9px 34px 9px 11px",
              appearance: "none",
              cursor: users.length === 0 ? "not-allowed" : "pointer",
              opacity: users.length === 0 ? 0.6 : 1,
              colorScheme: dm ? "dark" : "light",
            }}
          >
            <option value="">
              {users.length === 0 ? "No users available" : "Select a user"}
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.username}>
                {u.username} - {u.first_name} {u.surname}
              </option>
            ))}
          </select>
          <div
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          >
            <svg
              width="13"
              height="13"
              fill="none"
              stroke={t.textTertiary}
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      )}
      {!loading && users.length === 0 && deckerData.decision && (
        <div style={{ marginTop: 4, fontSize: 11.5, color: t.errorText }}>
          ⚠️ No users found in this group.
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        background: t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 12,
        boxShadow: t.cardShadow,
        overflow: "hidden",
        marginBottom: "1rem",
      }}
    >
      <div
        style={{
          padding: "11px 16px",
          borderBottom: `1px solid ${t.cardBorder}`,
        }}
      >
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: t.sectionTitle,
            textTransform: "uppercase",
            letterSpacing: "0.7px",
          }}
        >
          Decker Decision
        </span>
      </div>

      <div style={{ padding: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Decker Name */}
          <div>
            {lbl(
              <span>
                Decker Name (You){" "}
                <span
                  style={{
                    display: "inline-block",
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#22c55e",
                    marginLeft: 5,
                    verticalAlign: "middle",
                  }}
                />
              </span>,
            )}
            <input
              type="text"
              value={deckerData.deckerName}
              readOnly
              style={baseInput}
            />
            <div
              style={{
                marginTop: 3,
                fontSize: 11.5,
                color: t.textTertiary,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <svg
                width="11"
                height="11"
                fill="none"
                stroke={t.textTertiary}
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Logged in as: {deckerData.deckerName.toLowerCase()}
            </div>
          </div>

          {/* Decision */}
          <div>
            {lbl(
              <span>
                Decker Decision <span style={{ color: t.errorText }}>*</span>
              </span>,
            )}
            <div style={{ position: "relative" }}>
              <select
                value={deckerData.decision}
                onChange={(e) => handleDecisionChange(e.target.value)}
                style={{
                  ...baseInput,
                  padding: "9px 34px 9px 11px",
                  border: `1.5px solid ${deckerData.decisionTouched && !deckerData.decision ? t.errorBorder : deckerData.decision ? t.successBorder : t.inputBorder}`,
                  background:
                    deckerData.decisionTouched && !deckerData.decision
                      ? t.errorBg
                      : t.inputBg,
                  color: deckerData.decision ? t.textPrimary : t.textTertiary,
                  appearance: "none",
                  cursor: "pointer",
                  colorScheme: dm ? "dark" : "light",
                }}
              >
                <option value="">Select decision</option>
                {DECKER_DECISIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <div
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  fill="none"
                  stroke={t.textTertiary}
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
            {deckerData.decisionTouched && !deckerData.decision && (
              <div style={{ marginTop: 4, fontSize: 12, color: t.errorText }}>
                Please select a decision.
              </div>
            )}
          </div>

          {/* Decker Remarks */}
          <div>
            {lbl("Decker Remarks")}
            <textarea
              value={deckerData.remarks}
              onChange={(e) =>
                onDeckerChange({ ...deckerData, remarks: e.target.value })
              }
              placeholder="Enter any remarks or notes..."
              rows={3}
              style={{ ...baseInput, resize: "vertical" }}
            />
          </div>

          {/* Doctrack Remarks */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <label
                  style={{ fontSize: 12, fontWeight: 600, color: t.labelColor }}
                >
                  Doctrack Remarks
                </label>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 8,
                    background: t.infoBg,
                    color: t.infoText,
                    border: `1px solid ${t.infoBorder}`,
                  }}
                >
                  auto-filled
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ToggleSwitch
                  checked={deckerData.doctrackAutoFill}
                  onChange={handleToggleAutoFill}
                />
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: deckerData.doctrackAutoFill
                      ? t.successText
                      : t.textTertiary,
                  }}
                >
                  {deckerData.doctrackAutoFill ? "ON" : "OFF"}
                </span>
              </div>
            </div>
            <input
              type="text"
              value={deckerData.doctrackRemarks}
              onChange={(e) =>
                onDeckerChange({
                  ...deckerData,
                  doctrackRemarks: e.target.value,
                })
              }
              placeholder="Doctrack remarks..."
              style={baseInput}
            />
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: t.textTertiary,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <svg
                width="11"
                height="11"
                fill="none"
                stroke={t.warnText}
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Default based on selected decision. You may edit if needed.
            </div>
          </div>

          {/* ← Evaluator — lumalabas lang kapag may fetchEvaluator */}
          {showEvaluator && (
            <UserSelectField
              label={
                isDualAssign ? "Assign Quality Evaluator" : "Assign Evaluator"
              }
              badge="Evaluator Group"
              value={deckerData.evaluator}
              onChange={(v) => onDeckerChange({ ...deckerData, evaluator: v })}
              users={evaluatorUsers}
              loading={loadingEvaluator}
            />
          )}

          {/* ← S&E — lumalabas lang kapag may fetchSne */}
          {showSne && (
            <UserSelectField
              label="Assign S&E"
              badge="S&E Group"
              value={deckerData.sne}
              onChange={(v) => onDeckerChange({ ...deckerData, sne: v })}
              users={sneUsers}
              loading={loadingSne}
            />
          )}

          {/* Dual assign banner */}
          {isDualAssign && (
            <div
              style={{
                padding: "10px 12px",
                background: t.infoBg,
                border: `1px solid ${t.infoBorder}`,
                borderRadius: 8,
                fontSize: 12,
                color: t.infoText,
              }}
            >
              🔀 This decision will assign{" "}
              <strong>two users simultaneously</strong> — one from the Evaluator
              group and one from the S&E group.
            </div>
          )}

          {/* Info note */}
          <div
            style={{
              padding: "10px 12px",
              background: t.infoBg,
              border: `1px solid ${t.infoBorder}`,
              borderRadius: 8,
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: 12,
              color: t.infoText,
              lineHeight: 1.5,
            }}
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke={t.infoText}
              strokeWidth="2"
              viewBox="0 0 24 24"
              style={{ flexShrink: 0, marginTop: 1 }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {isDualAssign
              ? `Three activity logs will be created — decker (Completed), Evaluator (In Progress), S&E (In Progress). Total: ${deckerData.selectedApps.length * 3} logs.`
              : `Two activity logs will be created — decker (Completed) and assigned user (In Progress). Total: ${deckerData.selectedApps.length * 2} logs.`}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
