import { useState } from "react";
import {
  cleanValue,
  deadlineUrgency,
  countWorkingDays,
  todayStr,
  fmtDeadline,
} from "./config/helpers";
import { EDITABLE_STEPS } from "./config/workflow";
import {
  getStep1RequiredFields,
  QA_ADMIN_REQUIRED_FIELDS,
} from "./config/fields";
import { StepIndicator } from "./components/BaseFields";
import { Step1FullDetails } from "./steps/Step1FullDetails";
import { Step3AppLogs } from "./steps/Step3AppLogs";
import { Step4ActionForm } from "./steps/Step4ActionForm";
import { StepCPRView } from "./steps/StepCPRView";
import { SpellCheckButton } from "./steps/SpellCheckButton";
import DoctrackPanel from "./steps/DoctrackPanel";
import { StepUploadDocuments } from "./steps/StepUploadDocuments";
import { ACCENT } from "./steps/StepUIKit";

// Full Details now covers what used to be Basic Info + Full Details (merged)
const STEPS = ["Full Details", "Documents", "App Logs", "Action"];

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
        border: `1.5px solid ${active ? ACCENT : colors.cardBorder}`,
        borderRadius: id === "normal" ? "6px 0 0 6px" : "0 6px 6px 0",
        background: active ? "#e0e7ff" : (colors.inputBg ?? "transparent"),
        color: active ? ACCENT : colors.textSecondary,
        cursor: "pointer",
        fontSize: "0.78rem",
        transition: "all 0.18s",
        position: "relative",
        zIndex: active ? 1 : 0,
        fontWeight: active ? "700" : "500",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "#eff6ff";
          e.currentTarget.style.borderColor = ACCENT;
          e.currentTarget.style.color = ACCENT;
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
      {btn("cpr", "▤", "CPR Document View", mode === "cpr")}
    </div>
  );
}

/* ── Compact header notice pill — used for Edit Mode Active / QE notice ── */
function HeaderNotice({ tone = "info", children }) {
  const tones = {
    info: { bg: "#eff6ff", border: "#bfdbfe", color: ACCENT },
    warn: { bg: "#fef3c7", border: "#fde68a", color: "#b45309" },
  };
  const t = tones[tone] ?? tones.info;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.1rem 0.45rem",
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: "4px",
        fontSize: "0.56rem",
        lineHeight: 1.25,
        color: t.color,
        flex: "1 1 auto",
        minWidth: 0,
      }}
    >
      <span style={{ flexShrink: 0, fontSize: "0.6rem" }}>
        {tone === "warn" ? "⚠️" : "ℹ️"}
      </span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {children}
      </span>
    </div>
  );
}

export default function ViewDetailsModal({
  record,
  onClose,
  onSuccess,
  colors,
  darkMode,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [editedFields, setEditedFields] = useState({});
  const [viewMode, setViewMode] = useState("normal");
  const [doctrackOpen, setDoctrackOpen] = useState(false);
  const [doctrackRecord, setDoctrackRecord] = useState(null);

  if (!record) return null;

  const canEdit = EDITABLE_STEPS.includes(record?.applicationStep);
  const isQAAdmin = record?.applicationStep === "QA Admin";
  const isQE = record?.applicationStep === "Quality Evaluation";
  const totalSteps = STEPS.length;

  const handleFieldChange = (fieldKey, newValue) =>
    setEditedFields((prev) => ({ ...prev, [fieldKey]: newValue }));

  const dirtyCount = Object.entries(editedFields).filter(
    ([k, v]) => String(v ?? "") !== String(record[k] ?? ""),
  ).length;

  const getMissingFields = (fieldKeys) =>
    fieldKeys.filter((key) => {
      const val = key in editedFields ? editedFields[key] : (record[key] ?? "");
      return !String(val ?? "").trim();
    });

  // Full Details (step 1) now covers what used to be split across
  // Step 1 (Basic Info) + Step 2 (Full Details) — merge both required-field
  // sets into a single list since it's one step now.
  const fullDetailsMissing = isQAAdmin
    ? getMissingFields([
        ...getStep1RequiredFields(record, editedFields),
        ...QA_ADMIN_REQUIRED_FIELDS.step2,
      ])
    : [];

  const isNextBlocked =
    isQAAdmin && currentStep === 1 && fullDetailsMissing.length > 0;

  const goNext = () => {
    if (isNextBlocked) return;
    setCurrentStep((s) => Math.min(s + 1, totalSteps));
  };
  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === "normal") setCurrentStep(1);
  };

  // Open doctrack panel
  const handleOpenDoctrack = (rec) => {
    setDoctrackRecord(rec);
    setDoctrackOpen(true);
  };

  const handleCloseDoctrack = () => {
    setDoctrackOpen(false);
    setDoctrackRecord(null);
  };

  const isCPR = viewMode === "cpr";
  const missingCount = fullDetailsMissing.length;

  const headerTitle = isCPR
    ? "CPR Document View"
    : currentStep === 1
      ? "Full Details"
      : currentStep === 2
        ? "Supporting Documents"
        : currentStep === 3
          ? "Application Logs"
          : `${record.applicationStep}`;

  // Show the Edit Mode / QE notices only on the Full Details step (normal view)
  const showHeaderNotices = !isCPR && currentStep === 1 && (canEdit || isQE);

  // Modal width expands when doctrack panel is open
  const modalWidth = doctrackOpen ? "min(1380px, 97vw)" : "min(1100px, 95vw)";

  return (
    <>
      {/* Backdrop — click-outside-to-close is disabled on purpose;
    dapat button X lang ang pwedeng magsara ng modal na ito */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: modalWidth,
          maxHeight: "88vh",
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "14px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          overflow: "visible",
          transition: "width 0.3s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          style={{
            background: colors.inputBg,
            borderBottom: `1px solid ${colors.cardBorder}`,
            borderRadius: "14px 14px 0 0",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: showHeaderNotices
                ? "0.7rem 1.25rem 0.35rem"
                : "0.85rem 1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
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
                    fontSize: "0.95rem",
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
                      background: "#dcfce7",
                      color: "#16a34a",
                      border: "1px solid #bbf7d0",
                      borderRadius: "4px",
                    }}
                  >
                    Editable
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
                    }}
                  >
                    View Only
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: "0.65rem",
                  color: colors.textTertiary,
                  margin: 0,
                }}
              >
                DTN:{" "}
                <strong style={{ color: ACCENT }}>
                  {cleanValue(record.dtn)}
                </strong>
                {canEdit && dirtyCount > 0 && (
                  <span
                    style={{
                      marginLeft: "0.6rem",
                      padding: "0.08rem 0.4rem",
                      background: "#fef3c7",
                      color: "#b45309",
                      borderRadius: "3px",
                      fontSize: "0.6rem",
                      fontWeight: "700",
                    }}
                  >
                    {dirtyCount} unsaved edit{dirtyCount > 1 ? "s" : ""}
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
                      bg: "#fee2e2",
                      border: "#dc2626",
                      color: "#dc2626",
                    },
                    critical: {
                      bg: "#fee2e2",
                      border: "#dc2626",
                      color: "#dc2626",
                    },
                    warning: {
                      bg: "#fef3c7",
                      border: "#f59e0b",
                      color: "#b45309",
                    },
                    ok: { bg: "#dcfce7", border: "#16a34a", color: "#16a34a" },
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
                        fontSize: "0.6rem",
                        fontWeight: "700",
                        color: cfg.color,
                        width: "fit-content",
                      }}
                    >
                      <span>Compliance Deadline:</span>
                      <span>{fmtDeadline(record.complianceDeadline)}</span>
                      <span
                        style={{
                          padding: "0.08rem 0.35rem",
                          background: "rgba(0,0,0,0.06)",
                          borderRadius: "10px",
                          fontSize: "0.56rem",
                        }}
                      >
                        {urgency === "overdue"
                          ? "OVERDUE"
                          : `${wdaysLeft}d left`}
                      </span>
                    </div>
                  );
                })()}
            </div>

            {/* Center: step indicator */}
            <div
              style={{
                flex: 1,
                maxWidth: "420px",
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
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "20px",
                    fontSize: "0.68rem",
                    fontWeight: "600",
                    color: ACCENT,
                  }}
                >
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

            {/* Right: spell check + view toggle + close */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexShrink: 0,
              }}
            >
              {!isCPR && currentStep === 1 && canEdit && (
                <SpellCheckButton
                  record={record}
                  editedFields={editedFields}
                  onFieldChange={handleFieldChange}
                  colors={colors}
                />
              )}
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
                  e.currentTarget.style.background = "rgba(0,0,0,0.05)";
                  e.currentTarget.style.borderColor = colors.textPrimary;
                  e.currentTarget.style.color = colors.textPrimary;
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

          {/* Compact notices row — Edit Mode Active / QE Action-step notice.
              Lives inside the header, right under the title/step-tabs row. */}
          {showHeaderNotices && (
            <div
              style={{
                display: "flex",
                gap: "0.4rem",
                flexWrap: "wrap",
                padding: "0 1.25rem 0.5rem",
                marginTop: "-0.15rem",
              }}
            >
              {canEdit && (
                <HeaderNotice tone="warn">
                  <strong>Edit Mode Active</strong> — dashed amber underline =
                  modified. Saves on submit.
                </HeaderNotice>
              )}
              {isQE && (
                <HeaderNotice tone="info">
                  <strong>Reg. No., SECPA, Released Info</strong> — available in{" "}
                  <strong>Action</strong> step when Action Type is{" "}
                  <strong>For Approval</strong>.
                </HeaderNotice>
              )}
            </div>
          )}
        </div>

        {/* ── Body: main content + optional doctrack panel ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "row",
            minHeight: 0,
            overflow: "clip",
            borderRadius: "0 0 14px 14px",
          }}
        >
          {/* Main content area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.1rem 1.25rem",
              minHeight: 0,
              overflowX: "visible",
            }}
          >
            {isCPR && (
              <StepCPRView
                record={record}
                editedFields={editedFields}
                onFieldChange={handleFieldChange}
                canEdit={canEdit}
                colors={colors}
              />
            )}
            {!isCPR && currentStep === 1 && (
              <Step1FullDetails
                record={record}
                editedFields={editedFields}
                onFieldChange={handleFieldChange}
                canEdit={canEdit}
                colors={colors}
                isQAAdmin={isQAAdmin}
                missingFields={fullDetailsMissing}
                onOpenDoctrack={handleOpenDoctrack}
              />
            )}
            {!isCPR && currentStep === 2 && (
              <StepUploadDocuments
                record={record}
                colors={colors}
                darkMode={darkMode}
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
                entryType={record.entryType ?? ""}
              />
            )}
          </div>

          {/* Doctrack Panel — slides in on the right */}
          {doctrackOpen && doctrackRecord && (
            <DoctrackPanel
              record={doctrackRecord}
              onClose={handleCloseDoctrack}
              colors={colors}
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
              fontSize: "0.68rem",
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
                <span>CPR View</span>
                {canEdit && dirtyCount > 0 && (
                  <span style={{ color: "#b45309", fontWeight: "700" }}>
                    · {dirtyCount} edit{dirtyCount > 1 ? "s" : ""} pending
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
                      color: "#b45309",
                      fontWeight: "700",
                    }}
                  >
                    · {dirtyCount} edit{dirtyCount > 1 ? "s" : ""} pending
                  </span>
                )}
              </>
            )}
          </span>

          {!isCPR && (
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {currentStep > 1 && (
                <button
                  onClick={goPrev}
                  style={{
                    padding: "0.45rem 0.9rem",
                    background: colors.inputBg,
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: "7px",
                    color: colors.textPrimary,
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  ← Previous
                </button>
              )}
              {currentStep < totalSteps && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "0.25rem",
                  }}
                >
                  {isNextBlocked && (
                    <span
                      style={{
                        fontSize: "0.62rem",
                        color: "#dc2626",
                        fontWeight: "600",
                        textAlign: "right",
                      }}
                    >
                      {missingCount} required field
                      {missingCount !== 1 ? "s" : ""} must be filled first
                    </span>
                  )}
                  <button
                    onClick={goNext}
                    disabled={isNextBlocked}
                    style={{
                      padding: "0.45rem 1.1rem",
                      background: isNextBlocked ? "#93c5fd" : ACCENT,
                      border: "none",
                      borderRadius: "7px",
                      color: "#fff",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      cursor: isNextBlocked ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isNextBlocked)
                        e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}

          {isCPR && (
            <div
              style={{
                fontSize: "0.68rem",
                color: colors.textTertiary,
                fontStyle: "italic",
              }}
            >
              {canEdit
                ? "Edit fields above — changes apply on Action step submit"
                : "Switch to Normal View to navigate steps"}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
