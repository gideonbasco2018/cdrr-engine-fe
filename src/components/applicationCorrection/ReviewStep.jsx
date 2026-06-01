// src/components/applicationCorrection/ReviewStep.jsx
import { useState } from "react";
import { formatDate } from "./utils";
import { getTheme } from "./theme";
import { submitCorrection } from "../../api/cpr-correction";
import { createDoctrackLogByRsn } from "../../api/doctrack";

export function ReviewStep({
  record,
  newDtn,
  entryType,
  subject,
  editedFields,
  darkMode,
  onSuccess,
  onError,
  deckerData,
  currentUser,
}) {
  const t = getTheme(darkMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [doctrackEnabled, setDoctrackEnabled] = useState(true); // ✅ same as Step4

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      // 1️⃣ Doctrack log — same logic as Step4ActionForm
      if (doctrackEnabled) {
        const doctrackResult = await createDoctrackLogByRsn(
          String(newDtn),
          deckerData?.doctrackRemarks || "",
          currentUser?.id ?? null,
          currentUser?.alias || "",
        );

        if (!doctrackResult) {
          setError("Failed to insert Doctrack log. Submission cancelled.");
          onError?.("Doctrack log failed.");
          return;
        }
      }

      // 2️⃣ Ituloy ang correction
      const result = await submitCorrection({
        old_dtn: record.dtn,
        new_dtn: newDtn,
        DB_OLD_RSN: record.dtn,
        DB_ENTRY_TYPE: entryType,
        subject: subject,
        ...editedFields,
        DB_APP_STATUS: "ON-PROCESS",
        application_decision: deckerData?.decision || "",
        application_remarks: deckerData?.remarks || "",
        assignee: deckerData?.assignee || "",
        assignee_id: deckerData?.assigneeId ?? null,
        doctrack_remarks: doctrackEnabled
          ? deckerData?.doctrackRemarks || ""
          : "",
      });

      if (result.success) {
        onSuccess?.(result);
      } else {
        setError(result.message);
        onError?.(result.message);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.detail || err?.message || "Unexpected error.";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { label: "Old DTN", value: record?.dtn },
    { label: "New DTN", value: newDtn || "—" },
    { label: "Entry Type", value: entryType || "—" },
    { label: "Subject", value: subject || "—" },
    { label: "Company", value: record?.ltoComp },
    { label: "Product", value: record?.prodBrName },
    { label: "Application Type", value: record?.appType },
    { label: "Date Received", value: formatDate(record?.dateReceivedCent) },
  ];

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
      {/* Header */}
      <div
        style={{
          padding: "11px 16px",
          borderBottom: `1px solid ${t.cardBorder}`,
          display: "flex",
          alignItems: "center",
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
          Review Summary
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {sections.map(({ label, value }, i) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 14,
                padding: "9px 0",
                borderBottom:
                  i < sections.length - 1
                    ? `1px solid ${t.sectionBorder}`
                    : "none",
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  color: t.textTertiary,
                  flexShrink: 0,
                  minWidth: 130,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: "right",
                  wordBreak: "break-word",
                  color: label === "New DTN" ? t.accent : t.textPrimary,
                }}
              >
                {value ?? "—"}
              </span>
            </div>
          ))}
        </div>

        {/* ✅ Doctrack Remarks preview + toggle — same pattern as Step4 */}
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            background: t.inputBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: t.sectionTitle,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Doctrack Remarks
            </span>

            {/* Toggle — identical to Step4ActionForm */}
            <span
              onClick={() => setDoctrackEnabled((prev) => !prev)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.65rem",
                fontWeight: 600,
                cursor: "pointer",
                padding: "0.1rem 0.5rem 0.1rem 0.35rem",
                borderRadius: "20px",
                border: `1px solid ${doctrackEnabled ? "#4CAF5050" : "#ef444450"}`,
                background: doctrackEnabled ? "#4CAF5015" : "#ef444415",
                color: doctrackEnabled ? "#4CAF50" : "#ef4444",
                userSelect: "none",
                transition: "all 0.2s",
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 11,
                  borderRadius: 11,
                  background: doctrackEnabled ? "#4CAF50" : "#ef4444",
                  display: "inline-block",
                  position: "relative",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: doctrackEnabled ? 13 : 2,
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.2s",
                  }}
                />
              </span>
              {doctrackEnabled ? "ON" : "OFF"}
            </span>
          </div>

          <span
            style={{
              fontSize: 12.5,
              color: doctrackEnabled ? t.textPrimary : t.textTertiary,
              fontStyle: deckerData?.doctrackRemarks ? "normal" : "italic",
            }}
          >
            {deckerData?.doctrackRemarks || "No remarks set"}
          </span>
        </div>

        {/* Warning */}
        <div
          style={{
            marginTop: 14,
            padding: "11px 14px",
            borderRadius: 9,
            background: t.warnBg,
            border: `1px solid ${t.warnBorder}`,
            color: t.warnText,
            fontSize: 12.5,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            lineHeight: 1.55,
          }}
        >
          <svg
            width="14"
            height="14"
            fill="none"
            stroke={t.warnText}
            strokeWidth="2"
            viewBox="0 0 24 24"
            style={{ flexShrink: 0, marginTop: 1 }}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Please review all information carefully before submitting. This action
          will create activity logs and cannot be undone.
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              marginTop: 10,
              padding: "10px 14px",
              borderRadius: 9,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#ef4444",
              fontSize: 12.5,
            }}
          >
            {error}
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={loading}
          style={{
            marginTop: 14,
            width: "100%",
            padding: "10px 0",
            borderRadius: 9,
            border: "none",
            background: loading ? t.textTertiary : t.accent,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: "0.3px",
            transition: "background 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  display: "inline-block",
                  width: 13,
                  height: 13,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 0.6s linear infinite",
                }}
              />
              Submitting…
            </>
          ) : (
            "Confirm & Submit"
          )}
        </button>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
