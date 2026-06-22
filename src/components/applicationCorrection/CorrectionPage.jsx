import { useState } from "react";
import { StepIndicator } from "./StepIndicator";
import { AllDetails } from "./AllDetails";
import { DeckerDecisionForm } from "./DeckerDecisionForm";
import { ReviewStep } from "./ReviewStep";
import { MOCK_RECORD } from "./constants";
import { cleanValue, formatDate } from "./utils";
import { getTheme } from "./theme";
import {
  createApplicationLog,
  getLastApplicationLogIndex,
} from "../../api/application-logs";
import { getUser } from "../../api/auth";

export function CorrectionPage({
  record,
  onBack,
  darkMode,
  newDtn,
  entryType,
  subject,
}) {
  const t = getTheme(darkMode);
  const rec = record ?? MOCK_RECORD;

  const [step, setStep] = useState(1);
  const [submitResult, setSubmitResult] = useState(null); // { success, message, new_dtn }
  const [deckerData, setDeckerData] = useState({
    selectedApps: [],
    deckerName: "",
    decision: "",
    assignee: "",
    remarks: "",
    doctrackRemarks: "",
    doctrackAutoFill: true,
    decisionTouched: false,
  });

  // editedFields will be populated by DeckerDecisionForm or other editable steps
  const [editedFields, setEditedFields] = useState({});
  const [editableSubject, setEditableSubject] = useState(subject || "");
  const showSidebar = step !== 2;

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!deckerData.decision) {
        setDeckerData((d) => ({ ...d, decisionTouched: true }));
        return;
      }
      if (!deckerData.assignee) {
        // ✅ validate assignee
        setDeckerData((d) => ({ ...d, decisionTouched: true }));
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => (step > 1 ? setStep(step - 1) : onBack());

  const Card = ({ children, title }) => (
    <div
      style={{
        background: t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 12,
        boxShadow: t.cardShadow,
        marginBottom: "1rem",
      }}
    >
      {title && (
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
            {title}
          </span>
        </div>
      )}
      <div style={{ padding: "16px" }}>{children}</div>
    </div>
  );

  const btnBase = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontFamily: "inherit",
    fontSize: 12.5,
    fontWeight: 600,
    padding: "8px 14px",
    borderRadius: 9,
    border: "1px solid transparent",
    cursor: "pointer",
    transition: "all 0.15s",
  };

  const isStep3 = step === 3;

  return (
    <div
      style={{
        background: darkMode ? "#141414" : "#F0EDE8",
        minHeight: "100%",
        flex: 1,
        width: "100%",
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "1.5rem 1.25rem 3rem",
          display: "grid",
          gridTemplateColumns: showSidebar ? "1fr 300px" : "1fr",
          gap: "1rem",
          alignItems: "start",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 23,
                fontWeight: 700,
                color: t.textPrimary,
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              {entryType === "RECONSTRUCTION"
                ? "Manual CPR Reconstruction"
                : entryType === "VALIDITY_EXTENSION"
                  ? "Manual CPR Validity Extension"
                  : entryType === "CANCELLATION_OF_CPR"
                    ? "Manual CPR Cancellation of CPR"
                    : entryType === "SURRENDER_DUE_TO_PAC"
                      ? "Manual CPR Surrender due to PAC"
                      : "Manual CPR Correction"}
            </h1>
            <p style={{ fontSize: 13, color: t.textSecondary, marginTop: 3 }}>
              Document Tracking No.{" "}
              <strong style={{ color: t.textPrimary }}>{newDtn}</strong>
            </p>
          </div>

          {/* Header buttons — hide Submit on step 3, ReviewStep owns that */}
          <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
            <button
              onClick={onBack}
              style={{
                ...btnBase,
                background: "transparent",
                borderColor: t.cardBorder,
                color: t.textSecondary,
              }}
            >
              Cancel
            </button>

            <button
              onClick={handleBack}
              style={{
                ...btnBase,
                background: "transparent",
                border: `1px solid ${t.cardBorder}`,
                color: t.textSecondary,
              }}
            >
              ← {step === 1 ? "Back to DTN Lookup" : `Back to Step ${step - 1}`}
            </button>
            {!isStep3 && (
              <button
                onClick={handleNext}
                style={{
                  ...btnBase,
                  background: t.accent,
                  borderColor: t.accent,
                  color: "#fff",
                }}
              >
                Next →
              </button>
            )}
          </div>
        </div>

        <StepIndicator currentStep={step} darkMode={darkMode} />

        {/* ── API result banner (success or error) ── */}
        {submitResult && (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: "11px 14px",
              borderRadius: 9,
              background: submitResult.success
                ? t.successBg
                : "rgba(239,68,68,0.08)",
              border: `1px solid ${submitResult.success ? t.successBorder : "rgba(239,68,68,0.25)"}`,
              color: submitResult.success ? t.successText : "#ef4444",
              fontSize: 13,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <svg
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              {submitResult.success ? (
                <polyline points="20 6 9 17 4 12" />
              ) : (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              )}
            </svg>
            <div>
              <strong>
                {submitResult.success
                  ? "Corrections submitted successfully!"
                  : "Submission failed."}
              </strong>{" "}
              {submitResult.message}
            </div>
          </div>
        )}

        {/* ── Left column ── */}
        <div>
          {step === 1 && (
            <Card title="Application Details">
              <AllDetails record={rec} darkMode={darkMode} newDtn={newDtn} />
            </Card>
          )}
          {step === 2 && (
            <DeckerDecisionForm
              record={rec}
              deckerData={deckerData}
              onDeckerChange={setDeckerData}
              darkMode={darkMode}
            />
          )}

          {step === 3 && (
            <>
              <ReviewStep
                record={rec}
                newDtn={newDtn}
                entryType={entryType}
                subject={editableSubject}
                editedFields={editedFields}
                darkMode={darkMode}
                deckerData={deckerData}
                currentUser={getUser()}
                onSuccess={async (result) => {
                  try {
                    const currentUser = getUser();
                    const now = new Date();
                    const phtOffset = 8 * 60 * 60 * 1000;
                    const formattedDateTime = new Date(
                      now.getTime() + phtOffset,
                    ).toISOString();

                    const indexData = await getLastApplicationLogIndex(
                      result.main_db_id,
                    );
                    const lastIndex = indexData.last_index ?? 0;
                    const nextIndex = lastIndex + 1;

                    // Log 1 — Decker COMPLETED
                    await createApplicationLog({
                      main_db_id: result.main_db_id,
                      application_step: "Decking",
                      user_name: deckerData.deckerName,
                      application_status: "COMPLETED",
                      application_decision: deckerData.decision,
                      application_remarks: deckerData.remarks || "",
                      doctrack_remarks: deckerData.doctrackRemarks || "",
                      start_date: formattedDateTime,
                      accomplished_date: formattedDateTime,
                      del_index: nextIndex,
                      del_previous: lastIndex,
                      del_last_index: 0,
                      del_thread: "Close",
                      user_id: currentUser?.id ?? null,
                      action_type: "Decked",
                    });

                    // Log 2 — Assignee IN PROGRESS
                    const nextStep =
                      deckerData.decision === "For Quality Evaluation"
                        ? "Quality Evaluation"
                        : deckerData.decision === "For OD Review"
                          ? "OD Review"
                          : deckerData.decision === "For PRSDD PMS SEC to MSU"
                            ? "PRSDD PMS SEC to MSU"
                            : "LRD Decking";
                    await createApplicationLog({
                      main_db_id: result.main_db_id,
                      application_step: nextStep,
                      user_name: deckerData.assignee,
                      application_status: "IN PROGRESS",
                      application_decision: "",
                      application_remarks: "",
                      start_date: formattedDateTime,
                      accomplished_date: null,
                      del_index: nextIndex + 1,
                      del_previous: nextIndex,
                      del_last_index: 1,
                      del_thread: "Open",
                      user_id: deckerData.assigneeId ?? null,
                    });
                  } catch (err) {
                    console.error("❌ Failed to create application logs:", err);
                  }

                  setSubmitResult(result);
                  setTimeout(() => {
                    onBack();
                  }, 1500);
                }}
                onError={(msg) =>
                  setSubmitResult({ success: false, message: msg })
                }
              />
              <Card title="Application Details">
                <AllDetails record={rec} darkMode={darkMode} newDtn={newDtn} />
              </Card>
            </>
          )}
        </div>

        {/* ── Right sidebar ── */}
        {showSidebar && (
          <div>
            {step === 3 && deckerData.decision && (
              <div
                style={{
                  background: t.infoBg,
                  border: `1px solid ${t.infoBorder}`,
                  borderRadius: 12,
                  boxShadow: t.cardShadow,
                  overflow: "hidden",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    padding: "11px 16px",
                    borderBottom: `1px solid ${t.infoBorder}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: t.infoText,
                      textTransform: "uppercase",
                      letterSpacing: "0.7px",
                    }}
                  >
                    Decker Summary
                  </span>
                </div>
                <div
                  style={{
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 9,
                  }}
                >
                  {[
                    ["Decker", deckerData.deckerName],
                    ["Decision", deckerData.decision],
                    ["Decker Remarks", deckerData.remarks || "—"],
                    ["Doctrack Remarks", deckerData.doctrackRemarks || "—"],
                    ["Assignee", deckerData.assignee || "—"],
                  ].map(([lbl, val]) => (
                    <div key={lbl}>
                      <div
                        style={{
                          fontSize: 11,
                          color: t.infoText,
                          fontWeight: 600,
                          marginBottom: 3,
                        }}
                      >
                        {lbl}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: lbl === "Decision" ? 700 : 400,
                          color: t.textPrimary,
                          padding: "7px 10px",
                          background: t.cardBg,
                          border: `1px solid ${t.infoBorder}`,
                          borderRadius: 7,
                          lineHeight: 1.5,
                        }}
                      >
                        {val}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Subject Card */}
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
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <svg
                  width="11"
                  height="11"
                  fill="none"
                  stroke={t.sectionTitle}
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 6h16M4 12h8" />
                </svg>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: t.sectionTitle,
                    textTransform: "uppercase",
                    letterSpacing: "0.7px",
                  }}
                >
                  Subject
                </span>
              </div>
              <div style={{ padding: "12px 16px" }}>
                <textarea
                  value={editableSubject}
                  onChange={(e) => {
                    setEditableSubject(e.target.value);
                    setEditedFields((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }));
                  }}
                  rows={3}
                  placeholder="Enter subject..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 500,
                    padding: "8px 10px",
                    border: `1px solid ${t.fieldBorder}`,
                    borderRadius: 8,
                    background: t.fieldBg,
                    color: t.fieldText,
                    outline: "none",
                    resize: "vertical",
                    lineHeight: 1.6,
                  }}
                />
              </div>
            </div>

            <Card title="Fees">
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {[
                  ["Fee", cleanValue(rec.fee)],
                  ["LRF", cleanValue(rec.lrf)],
                  ["SURC", cleanValue(rec.surc)],
                  ["Total", cleanValue(rec.total)],
                  ["OR No.", cleanValue(rec.orNo)],
                  ["Date Issued", formatDate(rec.dateIssued)],
                ].map(([lbl, val]) => (
                  <div
                    key={lbl}
                    style={{ display: "flex", flexDirection: "column" }}
                  >
                    <label
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: t.labelColor,
                        marginBottom: 3,
                      }}
                    >
                      {lbl}
                    </label>
                    <div
                      style={{
                        fontFamily: "inherit",
                        fontSize: 13,
                        padding: "7px 10px",
                        border: `1px solid ${t.fieldBorder}`,
                        borderRadius: 6,
                        background: t.fieldBg,
                        color: val === "N/A" ? t.fieldNA : t.fieldText,
                        fontStyle: val === "N/A" ? "italic" : "normal",
                      }}
                    >
                      {val}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Supporting Documents">
              <div
                style={{
                  border: `1.5px dashed ${t.cardBorder}`,
                  borderRadius: 10,
                  padding: 16,
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  stroke={t.textMuted}
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
                <p
                  style={{
                    fontSize: 12.5,
                    color: t.textSecondary,
                    marginTop: 5,
                  }}
                >
                  Drop file here or click to upload
                </p>
                <small style={{ fontSize: 11, color: t.textTertiary }}>
                  PDF, JPG, PNG max 5 MB per file
                </small>
              </div>
            </Card>
          </div>
        )}

        {/* ── Footer ── */}
        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "12px 16px",
            background: t.footerBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
            boxShadow: t.cardShadow,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 12, color: t.textTertiary }}>
            All changes are auto-saved as draft every 2 minutes. &nbsp;·&nbsp;
            Step {step} of 3
          </div>
          <div style={{ display: "flex", gap: 7 }}>
            <button
              style={{
                ...btnBase,
                background: "transparent",
                borderColor: t.cardBorder,
                color: t.textSecondary,
              }}
            >
              Save as Draft
            </button>
            <button
              style={{
                ...btnBase,
                background: "transparent",
                borderColor: t.errorBorder,
                color: t.errorText,
              }}
            >
              Withdraw Application
            </button>
            {/* Footer also hides Submit on step 3 — ReviewStep owns it */}
            {!isStep3 && (
              <button
                onClick={handleNext}
                style={{
                  ...btnBase,
                  background: t.accent,
                  borderColor: t.accent,
                  color: "#fff",
                }}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
