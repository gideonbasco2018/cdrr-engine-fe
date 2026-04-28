import { useState } from "react";
import {
  cleanValue,
  deadlineUrgency,
  countWorkingDays,
  todayStr,
  fmtDeadline,
} from "./config/helpers";
import { EDITABLE_STEPS } from "./config/workflow";
import { StepIndicator } from "./components/BaseFields";
import { Step1BasicInfo } from "./steps/Step1BasicInfo";
import { Step2FullDetails } from "./steps/Step2FullDetails";
import { Step3AppLogs } from "./steps/Step3AppLogs";
import { Step4ActionForm } from "./steps/Step4ActionForm";
import { StepCPRView } from "./steps/StepCPRView";

const STEPS = ["Basic Info", "Full Details", "App Logs", "Action"];

// ─── View mode toggle icon buttons ───
function ViewModeToggle({ mode, onChange, colors }) {
  const btn = (id, icon, label, active) => (
    <button
      onClick={() => onChange(id)}
      title={label}
      style={{
        width: "30px",
        height: "30px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: `1.5px solid ${active ? "#1976d2" : colors.cardBorder}`,
        borderRadius: id === "normal" ? "6px 0 0 6px" : "0 6px 6px 0",
        background: active
          ? "linear-gradient(135deg, rgba(25,118,210,0.18), rgba(25,118,210,0.08))"
          : (colors.inputBg ?? "transparent"),
        color: active ? "#1976d2" : colors.textSecondary,
        cursor: "pointer",
        fontSize: "0.78rem",
        transition: "all 0.18s",
        position: "relative",
        zIndex: active ? 1 : 0,
        boxShadow: active ? "0 0 0 2px rgba(25,118,210,0.18)" : "none",
        fontWeight: active ? "700" : "500",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(25,118,210,0.07)";
          e.currentTarget.style.borderColor = "#1976d2";
          e.currentTarget.style.color = "#1976d2";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = colors.inputBg ?? "transparent";
          e.currentTarget.style.borderColor = colors.cardBorder;
          e.currentTarget.style.color = colors.textSecondary;
        }
      }}
    >
      {icon}
    </button>
  );

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}
      title="Switch view mode"
    >
      {btn("normal", "☰", "Normal View (Steps)", mode === "normal")}
      {btn("cpr", "📜", "CPR Document View", mode === "cpr")}
    </div>
  );
}

export default function ViewDetailsModal({
  record,
  onClose,
  onSuccess,
  colors,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [editedFields, setEditedFields] = useState({});
  const [viewMode, setViewMode] = useState("normal"); // "normal" | "cpr"

  if (!record) return null;

  const canEdit = EDITABLE_STEPS.includes(record?.applicationStep);
  const totalSteps = STEPS.length;

  const handleFieldChange = (fieldKey, newValue) =>
    setEditedFields((prev) => ({ ...prev, [fieldKey]: newValue }));

  const dirtyCount = Object.entries(editedFields).filter(
    ([k, v]) => String(v ?? "") !== String(record[k] ?? ""),
  ).length;

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, totalSteps));
  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 1));

  // Switch view mode — reset step to 1 when switching back
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === "normal") setCurrentStep(1);
  };

  const isCPR = viewMode === "cpr";

  // Header title
  const headerTitle = isCPR
    ? "📜 CPR Document View"
    : currentStep === 1
      ? "👁️ Basic Information"
      : currentStep === 2
        ? "📄 Full Details"
        : currentStep === 3
          ? "📋 Application Logs"
          : `✅ ${record.applicationStep}`;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(980px, 95vw)",
          maxHeight: "88vh",
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          overflow: "visible",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "0.85rem 1.25rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            gap: "0.75rem",
          }}
        >
          {/* Left: title + meta */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.1rem",
              minWidth: 0,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: "700",
                  color: colors.textPrimary,
                  margin: 0,
                }}
              >
                {headerTitle}
              </h2>
              {isCPR && canEdit && (
                <span
                  style={{
                    padding: "0.06rem 0.38rem",
                    fontSize: "0.58rem",
                    fontWeight: "700",
                    background: "rgba(16,185,129,0.12)",
                    color: "#059669",
                    border: "1px solid rgba(16,185,129,0.3)",
                    borderRadius: "4px",
                    fontFamily: "sans-serif",
                  }}
                >
                  ✎ Editable
                </span>
              )}
              {isCPR && !canEdit && (
                <span
                  style={{
                    padding: "0.06rem 0.38rem",
                    fontSize: "0.58rem",
                    fontWeight: "700",
                    background: "rgba(100,100,100,0.1)",
                    color: colors.textTertiary,
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: "4px",
                    fontFamily: "sans-serif",
                  }}
                >
                  🔒 View Only
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: "0.7rem",
                color: colors.textTertiary,
                margin: 0,
              }}
            >
              DTN:{" "}
              <strong style={{ color: "#2196F3" }}>
                {cleanValue(record.dtn)}
              </strong>
              {" · "}
              {cleanValue(record.prodBrName)}
              {canEdit && dirtyCount > 0 && (
                <span
                  style={{
                    marginLeft: "0.6rem",
                    padding: "0.08rem 0.4rem",
                    background: "rgba(245,158,11,0.15)",
                    color: "#b45309",
                    borderRadius: "3px",
                    fontSize: "0.62rem",
                    fontWeight: "700",
                  }}
                >
                  ✎ {dirtyCount} unsaved edit{dirtyCount > 1 ? "s" : ""}
                </span>
              )}
            </p>

            {/* Compliance Deadline badge */}
            {record.complianceDeadline &&
              (() => {
                const urgency = deadlineUrgency(record.complianceDeadline);
                const wdaysLeft = countWorkingDays(
                  todayStr(),
                  record.complianceDeadline,
                );
                const cfgMap = {
                  overdue: {
                    bg: "rgba(239,68,68,0.15)",
                    border: "#ef4444",
                    color: "#ef4444",
                    icon: "🚨",
                  },
                  critical: {
                    bg: "rgba(239,68,68,0.1)",
                    border: "#ef4444",
                    color: "#ef4444",
                    icon: "🔴",
                  },
                  warning: {
                    bg: "rgba(245,158,11,0.12)",
                    border: "#f59e0b",
                    color: "#b45309",
                    icon: "🟡",
                  },
                  ok: {
                    bg: "rgba(16,185,129,0.1)",
                    border: "#10b981",
                    color: "#059669",
                    icon: "🟢",
                  },
                };
                const cfg = cfgMap[urgency] ?? cfgMap.ok;
                return (
                  <div
                    style={{
                      marginTop: "0.3rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.2rem 0.6rem",
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                      borderRadius: "20px",
                      fontSize: "0.62rem",
                      fontWeight: "700",
                      color: cfg.color,
                      width: "fit-content",
                    }}
                  >
                    <span>{cfg.icon}</span>
                    <span>Compliance Deadline:</span>
                    <span>{fmtDeadline(record.complianceDeadline)}</span>
                    <span
                      style={{
                        padding: "0.08rem 0.35rem",
                        background: cfg.border + "25",
                        borderRadius: "10px",
                        fontSize: "0.58rem",
                      }}
                    >
                      {urgency === "overdue" ? "OVERDUE" : `${wdaysLeft}d left`}
                    </span>
                  </div>
                );
              })()}
          </div>

          {/* Center: step indicator (hidden in CPR mode) OR CPR mode label */}
          <div
            style={{
              flex: 1,
              maxWidth: "460px",
              position: "relative",
              paddingBottom: isCPR ? 0 : "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isCPR ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.3rem 0.8rem",
                  background: "rgba(25,118,210,0.06)",
                  border: "1px solid rgba(25,118,210,0.2)",
                  borderRadius: "20px",
                  fontSize: "0.68rem",
                  fontFamily: "sans-serif",
                  fontWeight: "600",
                  color: "#1976d2",
                }}
              >
                <span>📜</span>
                <span>Certificate of Product Registration</span>
              </div>
            ) : (
              <StepIndicator
                currentStep={currentStep}
                steps={STEPS}
                colors={colors}
              />
            )}
          </div>

          {/* Right: view toggle + close */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexShrink: 0,
            }}
          >
            <ViewModeToggle
              mode={viewMode}
              onChange={handleViewModeChange}
              colors={colors}
            />
            <button
              onClick={onClose}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                border: `1px solid ${colors.cardBorder}`,
                background: "transparent",
                color: colors.textSecondary,
                cursor: "pointer",
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ef444415";
                e.currentTarget.style.borderColor = "#ef4444";
                e.currentTarget.style.color = "#ef4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = colors.cardBorder;
                e.currentTarget.style.color = colors.textSecondary;
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.1rem 1.25rem",
            minHeight: 0,
            overflowX: "visible",
          }}
        >
          {/* ── CPR MODE ── */}
          {isCPR && (
            <StepCPRView
              record={record}
              editedFields={editedFields}
              onFieldChange={handleFieldChange}
              canEdit={canEdit}
              colors={colors}
            />
          )}

          {/* ── NORMAL MODE ── */}
          {!isCPR && currentStep === 1 && (
            <Step1BasicInfo
              record={record}
              editedFields={editedFields}
              onFieldChange={handleFieldChange}
              canEdit={canEdit}
              colors={colors}
            />
          )}
          {!isCPR && currentStep === 2 && (
            <Step2FullDetails
              record={record}
              editedFields={editedFields}
              onFieldChange={handleFieldChange}
              canEdit={canEdit}
              colors={colors}
              currentStep={record.applicationStep}
            />
          )}
          {!isCPR && currentStep === 3 && (
            <Step3AppLogs record={record} colors={colors} />
          )}
          {!isCPR && currentStep === 4 && (
            <Step4ActionForm
              record={record}
              editedFields={editedFields}
              colors={colors}
              onClose={onClose}
              onSuccess={onSuccess}
            />
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: "0.65rem 1.25rem",
            borderTop: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            background: colors.cardBg,
          }}
        >
          {/* Left label */}
          <span
            style={{
              fontSize: "0.7rem",
              color: colors.textTertiary,
              fontWeight: "600",
            }}
          >
            {isCPR ? (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <span>📜 CPR View</span>
                {canEdit && dirtyCount > 0 && (
                  <span style={{ color: "#f59e0b", fontWeight: "700" }}>
                    · ✎ {dirtyCount} edit{dirtyCount > 1 ? "s" : ""} pending
                  </span>
                )}
              </span>
            ) : (
              <>
                Step {currentStep} of {totalSteps}
                {canEdit && dirtyCount > 0 && (
                  <span
                    style={{
                      marginLeft: "0.6rem",
                      color: "#f59e0b",
                      fontWeight: "700",
                    }}
                  >
                    · ✎ {dirtyCount} edit{dirtyCount > 1 ? "s" : ""} pending
                  </span>
                )}
              </>
            )}
          </span>

          {/* Navigation — only shown in normal mode */}
          {!isCPR && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {currentStep > 1 && (
                <button
                  onClick={goPrev}
                  style={{
                    padding: "0.45rem 0.9rem",
                    background: colors.inputBg,
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: "6px",
                    color: colors.textPrimary,
                    fontSize: "0.78rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  ← Previous
                </button>
              )}
              {currentStep < totalSteps && (
                <button
                  onClick={goNext}
                  style={{
                    padding: "0.45rem 1rem",
                    background: "linear-gradient(135deg, #2196F3, #1976D2)",
                    border: "none",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "0.78rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(33,150,243,0.3)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  Next →
                </button>
              )}
            </div>
          )}

          {/* CPR mode footer hint */}
          {isCPR && (
            <div
              style={{
                fontSize: "0.68rem",
                color: colors.textTertiary,
                fontFamily: "sans-serif",
                fontStyle: "italic",
              }}
            >
              {canEdit
                ? "Edit fields above — changes apply on Step 4 submit"
                : "Switch to Normal View to navigate steps"}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
