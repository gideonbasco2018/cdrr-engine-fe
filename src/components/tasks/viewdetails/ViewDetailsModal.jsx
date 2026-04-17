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

const STEPS = ["Basic Info", "Full Details", "App Logs", "Action"];

export default function ViewDetailsModal({
  record,
  onClose,
  onSuccess,
  colors,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [editedFields, setEditedFields] = useState({});

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
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}
          >
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: "700",
                color: colors.textPrimary,
                margin: 0,
              }}
            >
              {currentStep === 1
                ? "👁️ Basic Information"
                : currentStep === 2
                  ? "📄 Full Details"
                  : currentStep === 3
                    ? "📋 Application Logs"
                    : `✅ ${record.applicationStep}`}
            </h2>
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

          {/* Step Indicator */}
          <div
            style={{
              flex: 1,
              maxWidth: "320px",
              position: "relative",
              paddingBottom: "1rem",
            }}
          >
            <StepIndicator
              currentStep={currentStep}
              steps={STEPS}
              colors={colors}
            />
          </div>

          {/* Close */}
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
              flexShrink: 0,
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
          {currentStep === 1 && (
            <Step1BasicInfo
              record={record}
              editedFields={editedFields}
              onFieldChange={handleFieldChange}
              canEdit={canEdit}
              colors={colors}
            />
          )}
          {/* CHANGED: added currentStep={record.applicationStep} prop — required for QE field hiding logic */}
          {currentStep === 2 && (
            <Step2FullDetails
              record={record}
              editedFields={editedFields}
              onFieldChange={handleFieldChange}
              canEdit={canEdit}
              colors={colors}
              currentStep={record.applicationStep}
            />
          )}
          {currentStep === 3 && (
            <Step3AppLogs record={record} colors={colors} />
          )}
          {currentStep === 4 && (
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
          <span
            style={{
              fontSize: "0.7rem",
              color: colors.textTertiary,
              fontWeight: "600",
            }}
          >
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
          </span>
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
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
