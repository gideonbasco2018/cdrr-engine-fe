// FILE: src/components/reports/actions/EditRecordModal.jsx

import { useState, useEffect } from "react";
import {
  createFieldAuditLog,
  computeFieldChanges,
} from "../../../api/field-audit-logs";
import { getUser } from "../../../api/auth";
import { CountryDropdown } from "../FilterBar";

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */
const cleanValue = (value) => {
  if (value === null || value === undefined || value === "N/A") return "";
  return String(value);
};

const cleanDateValue = (value) => {
  if (!value || value === "N/A" || value === null) return "";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

const cleanNumberValue = (value) => {
  if (value === null || value === undefined || value === "N/A" || value === "")
    return "";
  return String(value);
};

const FIELD_LABEL_MAP = {
  DB_EST_CAT: "Category",
  DB_EST_LTO_COMP: "LTO Company",
  DB_EST_LTO_ADD: "LTO Address",
  DB_EST_EADD: "Email",
  DB_EST_TIN: "TIN",
  DB_EST_CONTACT_NO: "Contact No.",
  DB_EST_LTO_NO: "LTO No.",
  DB_EST_VALIDITY: "Validity",
  DB_PROD_BR_NAME: "Brand Name",
  DB_PROD_GEN_NAME: "Generic Name",
  DB_PROD_DOS_STR: "Dosage Strength",
  DB_PROD_DOS_FORM: "Dosage Form",
  DB_PROD_CLASS_PRESCRIP: "Classification",
  DB_PROD_ESS_DRUG_LIST: "Essential Drug",
  DB_PROD_PHARMA_CAT: "Pharma Category",
  DB_PROD_CAT: "Product Category",
  DB_PHARMA_PROD_CAT: "Pharma Prod. Cat.",
  DB_PHARMA_PROD_CAT_LABEL: "Pharma Prod. Label",
  DB_PROD_MANU: "Manufacturer",
  DB_PROD_MANU_ADD: "Manufacturer Address",
  DB_PROD_MANU_TIN: "Manufacturer TIN",
  DB_PROD_MANU_LTO_NO: "Manufacturer LTO No.",
  DB_PROD_MANU_COUNTRY: "Manufacturer Country",
  DB_PROD_TRADER: "Trader",
  DB_PROD_TRADER_ADD: "Trader Address",
  DB_PROD_TRADER_TIN: "Trader TIN",
  DB_PROD_TRADER_LTO_NO: "Trader LTO No.",
  DB_PROD_TRADER_COUNTRY: "Trader Country",
  DB_PROD_REPACKER: "Repacker",
  DB_PROD_REPACKER_ADD: "Repacker Address",
  DB_PROD_REPACKER_TIN: "Repacker TIN",
  DB_PROD_REPACKER_LTO_NO: "Repacker LTO No.",
  DB_PROD_REPACKER_COUNTRY: "Repacker Country",
  DB_PROD_IMPORTER: "Importer",
  DB_PROD_IMPORTER_ADD: "Importer Address",
  DB_PROD_IMPORTER_TIN: "Importer TIN",
  DB_PROD_IMPORTER_LTO_NO: "Importer LTO No.",
  DB_PROD_IMPORTER_COUNTRY: "Importer Country",
  DB_PROD_DISTRI: "Distributor",
  DB_PROD_DISTRI_ADD: "Distributor Address",
  DB_PROD_DISTRI_TIN: "Distributor TIN",
  DB_PROD_DISTRI_LTO_NO: "Distributor LTO No.",
  DB_PROD_DISTRI_COUNTRY: "Distributor Country",
  DB_PROD_DISTRI_SHELF_LIFE: "Shelf Life",
  DB_STORAGE_COND: "Storage Condition",
  DB_PACKAGING: "Packaging",
  DB_SUGG_RP: "Suggested RP",
  DB_NO_SAMPLE: "No. of Samples",
  DB_DTN: "DTN",
  DB_REG_NO: "Registration No.",
  DB_APP_TYPE: "Application Type",
  DB_PROCESSING_TYPE: "Processing Type",
  DB_MOTHER_APP_TYPE: "Mother App Type",
  DB_OLD_RSN: "Old RSN",
  DB_CERTIFICATION: "Certification",
  DB_CLASS: "Class",
  DB_APP_STATUS: "Application Status",
  DB_AMMEND_1: "Amendment 1",
  DB_AMMEND_2: "Amendment 2",
  DB_AMMEND_3: "Amendment 3",
  DB_FEE: "Fee",
  DB_LRF: "LRF",
  DB_SURC: "SURC",
  DB_TOTAL: "Total",
  DB_OR_NO: "OR No.",
  DB_DATE_ISSUED: "Date Issued",
  DB_DATE_RECEIVED_FDAC: "Date Received FDAC",
  DB_DATE_RECEIVED_CENT: "Date Received Central",
  DB_DATE_DECK: "Date Deck",
  DB_DATE_RELEASED: "Date Released",
  DB_EXPIRY_DATE: "Expiry Date",
  DB_CPR_VALIDITY: "CPR Validity",
  DB_DATE_REMARKS: "Date Remarks",
  DB_MO: "MO",
  DB_FILE: "File",
  DB_SECPA: "SECPA",
  DB_SECPA_EXP_DATE: "SECPA Expiry Date",
  DB_SECPA_ISSUED_ON: "SECPA Issued On",
  DB_DECKING_SCHED: "Decking Schedule",
  DB_EVAL: "Evaluator",
  DB_TYPE_DOC_RELEASED: "Type Doc Released",
  DB_ATTA_RELEASED: "Atta Released",
  DB_CPR_COND: "CPR Condition",
  DB_CPR_COND_REMARKS: "CPR Condition Remarks",
  DB_CPR_COND_ADD_REMARKS: "CPR Condition Additional Remarks",
  DB_APP_REMARKS: "Application Remarks",
  DB_REMARKS_1: "General Remarks",
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const formatDateDisplay = (isoValue) => {
  if (!isoValue) return "";
  const [year, month, day] = isoValue.split("-");
  if (!year || !month || !day) return isoValue;
  const monthName = MONTHS[parseInt(month, 10) - 1];
  return `${day} ${monthName} ${year}`; // → "02 Jun 2005"
};
function DateInput({ value, onChange, disabled, style, onFocus, onBlur }) {
  return (
    <input
      type="date"
      lang="en-GB"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={style}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}
/* ================================================================== */
/*  Shared Sub-components                                               */
/* ================================================================== */
function ERSection({ title, children, colors }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h3
        style={{
          fontSize: "0.95rem",
          fontWeight: "700",
          color: colors.textPrimary,
          marginBottom: "0.75rem",
          paddingBottom: "0.5rem",
          borderBottom: `2px solid ${colors.cardBorder}`,
          letterSpacing: "0.02em",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function FieldGrid({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "0.75rem",
      }}
    >
      {children}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  colors,
  darkMode,
  readOnly = false,
  fullWidth = false,
}) {
  const sharedInputStyle = {
    padding: "0.45rem 0.7rem",
    background: readOnly ? (darkMode ? "#0a0a0a" : "#f5f5f5") : colors.inputBg,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: "6px",
    color: readOnly ? colors.textTertiary : colors.textPrimary,
    fontSize: "0.82rem",
    outline: "none",
    minHeight: "2rem",
    transition: "border-color 0.2s ease",
    cursor: readOnly ? "not-allowed" : "text",
    width: "100%",
    boxSizing: "border-box",
  };

  const handleFocus = (e) => {
    if (!readOnly) e.currentTarget.style.borderColor = "#2196F3";
  };
  const handleBlur = (e) => {
    if (!readOnly) e.currentTarget.style.borderColor = colors.inputBorder;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        ...(fullWidth ? { gridColumn: "1 / -1" } : {}),
      }}
    >
      <label
        style={{
          fontSize: "0.65rem",
          fontWeight: "700",
          color: colors.textTertiary,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
        }}
      >
        {label}{" "}
        {readOnly && (
          <span
            style={{
              fontWeight: "400",
              textTransform: "none",
              fontSize: "0.6rem",
            }}
          >
            (Read-Only)
          </span>
        )}
      </label>

      {/* ← BAGO: date fields */}
      {type === "date" ? (
        <DateInput
          value={value}
          onChange={onChange}
          disabled={readOnly}
          style={sharedInputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      ) : type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          rows={3}
          style={{
            ...sharedInputStyle,
            resize: "vertical",
            fontFamily: "inherit",
            minHeight: "3rem",
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          style={sharedInputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      )}
    </div>
  );
}

function CountryField({
  label,
  value,
  onChange,
  colors,
  darkMode,
  fullWidth = false,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        ...(fullWidth ? { gridColumn: "1 / -1" } : {}),
      }}
    >
      <label
        style={{
          fontSize: "0.65rem",
          fontWeight: "700",
          color: colors.textTertiary,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      <CountryDropdown
        value={value}
        onChange={onChange}
        colors={colors}
        accentColor="#2196F3"
        isActive={Boolean(value && value.trim() !== "")}
      />
    </div>
  );
}

function EditCard({
  icon,
  label,
  field,
  value,
  onChange,
  accent,
  colors,
  darkMode,
  fullWidth = false,
  type = "text",
}) {
  const cardInputStyle = {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: colors.textPrimary,
    background: "transparent",
    border: "none",
    borderBottom: `1px dashed ${colors.cardBorder}`,
    outline: "none",
    padding: "0.1rem 0",
    width: "100%",
    transition: "border-color 0.2s",
  };

  return (
    <div
      style={{
        ...(fullWidth ? { gridColumn: "1 / -1" } : {}),
        padding: "0.6rem 0.85rem",
        background: colors.inputBg,
        border: `1px solid ${colors.inputBorder}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: "6px",
        display: "flex",
        flexDirection: "column",
        gap: "0.2rem",
      }}
    >
      <span
        style={{
          fontSize: "0.6rem",
          fontWeight: "700",
          color: colors.textTertiary,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        {icon} {label}
      </span>

      {/* ← BAGO: date fields */}
      {type === "date" ? (
        <DateInput
          value={value}
          onChange={(v) => onChange(field, v)}
          style={cardInputStyle}
          onFocus={(e) => (e.currentTarget.style.borderBottomColor = "#2196F3")}
          onBlur={(e) =>
            (e.currentTarget.style.borderBottomColor = colors.cardBorder)
          }
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          style={cardInputStyle}
          onFocus={(e) => (e.currentTarget.style.borderBottomColor = "#2196F3")}
          onBlur={(e) =>
            (e.currentTarget.style.borderBottomColor = colors.cardBorder)
          }
        />
      )}
    </div>
  );
}

/* ── Step Progress Bar ── */
function StepIndicator({ currentStep, steps, colors }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "0 0.5rem",
      }}
    >
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              flex: i < steps.length - 1 ? 1 : "none",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: "700",
                flexShrink: 0,
                transition: "all 0.3s ease",
                background: isCompleted
                  ? "#10b981"
                  : isActive
                    ? "#2196F3"
                    : colors.inputBg,
                border: isCompleted
                  ? "2px solid #10b981"
                  : isActive
                    ? "2px solid #2196F3"
                    : `2px solid ${colors.cardBorder}`,
                color: isCompleted || isActive ? "#fff" : colors.textTertiary,
                boxShadow: isActive
                  ? "0 0 0 4px rgba(33,150,243,0.15)"
                  : "none",
              }}
            >
              {isCompleted ? "✓" : stepNum}
            </div>
            <div
              style={{
                position: "absolute",
                marginTop: "2.8rem",
                fontSize: "0.65rem",
                fontWeight: isActive ? "700" : "500",
                color: isActive
                  ? "#2196F3"
                  : isCompleted
                    ? "#10b981"
                    : colors.textTertiary,
                whiteSpace: "nowrap",
                transform: "translateX(-50%)",
                marginLeft: "16px",
              }}
            >
              {step}
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: "2px",
                  background: isCompleted ? "#10b981" : colors.cardBorder,
                  margin: "0 4px",
                  transition: "background 0.3s ease",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/*  Step 3: Summary / Diff View                                         */
/* ================================================================== */
function Step3Summary({ formData, originalData, colors, darkMode }) {
  const changedFields = Object.keys(FIELD_LABEL_MAP).filter(
    (k) => String(formData[k] ?? "") !== String(originalData[k] ?? ""),
  );

  if (changedFields.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "4rem 2rem",
          gap: "1rem",
        }}
      >
        <div style={{ fontSize: "3rem" }}>✅</div>
        <p
          style={{
            fontSize: "1rem",
            fontWeight: "700",
            color: colors.textPrimary,
            margin: 0,
          }}
        >
          No Changes Detected
        </p>
        <p
          style={{ fontSize: "0.82rem", color: colors.textTertiary, margin: 0 }}
        >
          You haven't modified any fields. Go back to make changes.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Header banner */}
      <div
        style={{
          padding: "0.85rem 1.1rem",
          background:
            "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03))",
          border: "1px solid rgba(245,158,11,0.25)",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <span style={{ fontSize: "1.4rem" }}>📋</span>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "0.88rem",
              fontWeight: "700",
              color: colors.textPrimary,
            }}
          >
            Review Your Changes
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              color: colors.textTertiary,
            }}
          >
            <strong style={{ color: "#f59e0b" }}>{changedFields.length}</strong>{" "}
            field
            {changedFields.length > 1 ? "s" : ""} will be updated. Please review
            before saving.
          </p>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "3px",
              background: darkMode ? "rgba(239,68,68,0.2)" : "#fef2f2",
              border: "1px solid rgba(239,68,68,0.4)",
            }}
          />
          <span style={{ fontSize: "0.68rem", color: colors.textTertiary }}>
            Original
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "3px",
              background: darkMode ? "rgba(16,185,129,0.2)" : "#f0fdf4",
              border: "1px solid rgba(16,185,129,0.4)",
            }}
          />
          <span style={{ fontSize: "0.68rem", color: colors.textTertiary }}>
            New Value
          </span>
        </div>
      </div>

      {/* Diff rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {changedFields.map((fieldKey, idx) => {
          const label = FIELD_LABEL_MAP[fieldKey] || fieldKey;
          const oldVal = String(originalData[fieldKey] ?? "") || "—";
          const newVal = String(formData[fieldKey] ?? "") || "—";

          return (
            <div
              key={fieldKey}
              style={{
                borderRadius: "8px",
                border: `1px solid ${colors.cardBorder}`,
                overflow: "hidden",
              }}
            >
              {/* Field label header */}
              <div
                style={{
                  padding: "0.4rem 0.85rem",
                  background: darkMode ? "#111" : "#f8f8f8",
                  borderBottom: `1px solid ${colors.cardBorder}`,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: "700",
                    color: "#f59e0b",
                    background: "rgba(245,158,11,0.12)",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "4px",
                  }}
                >
                  #{idx + 1}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: "700",
                    color: colors.textPrimary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {label}
                </span>
              </div>

              {/* Old → New values */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                {/* Original */}
                <div
                  style={{
                    padding: "0.65rem 0.85rem",
                    background: darkMode ? "rgba(239,68,68,0.08)" : "#fef2f2",
                    borderRight: `1px solid ${colors.cardBorder}`,
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: "700",
                      color: "#ef4444",
                      margin: "0 0 0.25rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    ✕ Original
                  </p>
                  <p
                    style={{
                      fontSize: "0.82rem",
                      color: darkMode ? "#fca5a5" : "#b91c1c",
                      margin: 0,
                      wordBreak: "break-word",
                      fontStyle: oldVal === "—" ? "italic" : "normal",
                      opacity: oldVal === "—" ? 0.5 : 1,
                    }}
                  >
                    {oldVal}
                  </p>
                </div>

                {/* New */}
                <div
                  style={{
                    padding: "0.65rem 0.85rem",
                    background: darkMode ? "rgba(16,185,129,0.08)" : "#f0fdf4",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: "700",
                      color: "#10b981",
                      margin: "0 0 0.25rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    ✓ New Value
                  </p>
                  <p
                    style={{
                      fontSize: "0.82rem",
                      color: darkMode ? "#6ee7b7" : "#065f46",
                      margin: 0,
                      wordBreak: "break-word",
                      fontStyle: newVal === "—" ? "italic" : "normal",
                      opacity: newVal === "—" ? 0.5 : 1,
                    }}
                  >
                    {newVal}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div
        style={{
          padding: "0.65rem 1rem",
          background: darkMode
            ? "rgba(33,150,243,0.08)"
            : "rgba(33,150,243,0.05)",
          border: "1px solid rgba(33,150,243,0.2)",
          borderRadius: "8px",
          fontSize: "0.75rem",
          color: colors.textTertiary,
        }}
      >
        💡 All changes above will be <strong>logged in the audit trail</strong>{" "}
        upon saving. Click <strong>Save Changes</strong> to confirm, or go back
        to continue editing.
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Step 1: Basic Info                                                  */
/* ================================================================== */
function Step1BasicInfo({ formData, handleChange, colors, darkMode }) {
  const appStatus = formData.DB_APP_STATUS?.toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      {/* DTN Banner */}
      <div
        style={{
          padding: "0.9rem 1.1rem",
          background:
            "linear-gradient(135deg, rgba(33,150,243,0.08), rgba(33,150,243,0.03))",
          border: "1px solid rgba(33,150,243,0.2)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.6rem",
              fontWeight: "700",
              color: "#2196F3",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "0.15rem",
            }}
          >
            Document Tracking No.
          </div>
          <input
            type="number"
            value={formData.DB_DTN}
            onChange={(e) => handleChange("DB_DTN", e.target.value)}
            style={{
              fontSize: "1.1rem",
              fontWeight: "800",
              color: colors.textPrimary,
              background: colors.inputBg,
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: "6px",
              padding: "0.2rem 0.5rem",
              outline: "none",
              width: "260px",
              letterSpacing: "-0.02em",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#2196F3")}
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = colors.inputBorder)
            }
          />
        </div>
        <div
          style={{
            width: "1px",
            height: "32px",
            background: colors.cardBorder,
          }}
        />
        <div style={{ flex: 1, minWidth: "160px" }}>
          <div
            style={{
              fontSize: "0.6rem",
              fontWeight: "700",
              color: colors.textTertiary,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "0.2rem",
            }}
          >
            App Status
          </div>
          <input
            type="text"
            value={formData.DB_APP_STATUS}
            onChange={(e) => handleChange("DB_APP_STATUS", e.target.value)}
            placeholder="e.g. PENDING, APPROVED..."
            style={{
              padding: "0.25rem 0.65rem",
              background: (() => {
                if (appStatus === "COMPLETED" || appStatus === "APPROVED")
                  return "linear-gradient(135deg,#10b981,#059669)";
                if (appStatus === "PENDING")
                  return "linear-gradient(135deg,#eab308,#ca8a04)";
                if (appStatus === "REJECTED")
                  return "linear-gradient(135deg,#ef4444,#dc2626)";
                return colors.inputBg;
              })(),
              color: ["COMPLETED", "APPROVED", "PENDING", "REJECTED"].includes(
                appStatus,
              )
                ? "#fff"
                : colors.textPrimary,
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: "6px",
              fontSize: "0.72rem",
              fontWeight: "700",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#2196F3")}
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = colors.inputBorder)
            }
          />
        </div>
        {formData.DB_TIMELINE_CITIZEN_CHARTER && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.1rem",
            }}
          >
            <div
              style={{
                fontSize: "0.6rem",
                fontWeight: "700",
                color: colors.textTertiary,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Timeline
            </div>
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: "800",
                color: colors.textPrimary,
              }}
            >
              {formData.DB_TIMELINE_CITIZEN_CHARTER}
              <span
                style={{
                  fontSize: "0.62rem",
                  fontWeight: "500",
                  color: colors.textTertiary,
                  marginLeft: "0.2rem",
                }}
              >
                working days
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "0.5rem",
        }}
      >
        <EditCard
          icon="⚙️"
          label="Processing Type"
          field="DB_PROCESSING_TYPE"
          value={formData.DB_PROCESSING_TYPE}
          onChange={handleChange}
          accent="#005cd4"
          colors={colors}
          darkMode={darkMode}
        />
        <EditCard
          icon="🗂️"
          label="Category"
          field="DB_EST_CAT"
          value={formData.DB_EST_CAT}
          onChange={handleChange}
          accent="#fbff00"
          colors={colors}
          darkMode={darkMode}
        />
        <EditCard
          icon="📋"
          label="Application Type"
          field="DB_APP_TYPE"
          value={formData.DB_APP_TYPE}
          onChange={handleChange}
          accent="#ff1547"
          colors={colors}
          darkMode={darkMode}
        />
        <EditCard
          icon="🏢"
          label="LTO Company"
          field="DB_EST_LTO_COMP"
          value={formData.DB_EST_LTO_COMP}
          onChange={handleChange}
          accent="#0fff2f"
          colors={colors}
          darkMode={darkMode}
          fullWidth
        />
        <EditCard
          icon="📍"
          label="LTO Address"
          field="DB_EST_LTO_ADD"
          value={formData.DB_EST_LTO_ADD}
          onChange={handleChange}
          accent="#ff950a"
          colors={colors}
          darkMode={darkMode}
          fullWidth
        />
        <EditCard
          icon="📧"
          label="Email Address"
          field="DB_EST_EADD"
          value={formData.DB_EST_EADD}
          onChange={handleChange}
          accent="#fa3a93"
          colors={colors}
          darkMode={darkMode}
        />
        <EditCard
          icon="🪪"
          label="TIN Number"
          field="DB_EST_TIN"
          value={formData.DB_EST_TIN}
          onChange={handleChange}
          accent="#ca44ff"
          colors={colors}
          darkMode={darkMode}
        />
        <EditCard
          icon="📞"
          label="Contact Number"
          field="DB_EST_CONTACT_NO"
          value={formData.DB_EST_CONTACT_NO}
          onChange={handleChange}
          accent="#00f18d"
          colors={colors}
          darkMode={darkMode}
          fullWidth
        />
        <EditCard
          icon="🔑"
          label="LTO Number"
          field="DB_EST_LTO_NO"
          value={formData.DB_EST_LTO_NO}
          onChange={handleChange}
          accent="#781192"
          colors={colors}
          darkMode={darkMode}
        />
        <EditCard
          icon="📅"
          label="LTO Validity"
          field="DB_EST_VALIDITY"
          value={formData.DB_EST_VALIDITY}
          onChange={handleChange}
          accent="#607d8b"
          colors={colors}
          darkMode={darkMode}
          type="date"
        />
        <EditCard
          icon="📅"
          label="Date Received Central"
          field="DB_DATE_RECEIVED_CENT"
          value={formData.DB_DATE_RECEIVED_CENT}
          onChange={handleChange}
          accent="#607d8b"
          colors={colors}
          darkMode={darkMode}
          type="date"
        />
        <EditCard
          icon="📅"
          label="Date Received FDAC"
          field="DB_DATE_RECEIVED_FDAC"
          value={formData.DB_DATE_RECEIVED_FDAC}
          onChange={handleChange}
          accent="#0b5b83"
          colors={colors}
          darkMode={darkMode}
          type="date"
        />
      </div>

      {/* 💊 Product Details */}
      <ERSection title="💊 Product Details" colors={colors}>
        <FieldGrid>
          <FormField
            label="Brand Name"
            value={formData.DB_PROD_BR_NAME}
            onChange={(v) => handleChange("DB_PROD_BR_NAME", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Generic Name"
            value={formData.DB_PROD_GEN_NAME}
            onChange={(v) => handleChange("DB_PROD_GEN_NAME", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Dosage Strength"
            value={formData.DB_PROD_DOS_STR}
            onChange={(v) => handleChange("DB_PROD_DOS_STR", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Dosage Form"
            value={formData.DB_PROD_DOS_FORM}
            onChange={(v) => handleChange("DB_PROD_DOS_FORM", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Classification"
            value={formData.DB_PROD_CLASS_PRESCRIP}
            onChange={(v) => handleChange("DB_PROD_CLASS_PRESCRIP", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Essential Drug"
            value={formData.DB_PROD_ESS_DRUG_LIST}
            onChange={(v) => handleChange("DB_PROD_ESS_DRUG_LIST", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Shelf Life"
            value={formData.DB_PROD_DISTRI_SHELF_LIFE}
            onChange={(v) => handleChange("DB_PROD_DISTRI_SHELF_LIFE", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Pharma Category"
            value={formData.DB_PROD_PHARMA_CAT}
            onChange={(v) => handleChange("DB_PROD_PHARMA_CAT", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Product Category"
            value={formData.DB_PROD_CAT}
            onChange={(v) => handleChange("DB_PROD_CAT", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Pharma Prod. Cat."
            value={formData.DB_PHARMA_PROD_CAT}
            onChange={(v) => handleChange("DB_PHARMA_PROD_CAT", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Pharma Prod. Label"
            value={formData.DB_PHARMA_PROD_CAT_LABEL}
            onChange={(v) => handleChange("DB_PHARMA_PROD_CAT_LABEL", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="File"
            value={formData.DB_FILE}
            onChange={(v) => handleChange("DB_FILE", v)}
            colors={colors}
            darkMode={darkMode}
          />
        </FieldGrid>
      </ERSection>

      {/* 📦 Storage & Packaging */}
      <ERSection title="📦 Storage & Packaging" colors={colors}>
        <FieldGrid>
          <FormField
            label="Storage Condition"
            value={formData.DB_STORAGE_COND}
            onChange={(v) => handleChange("DB_STORAGE_COND", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Packaging"
            value={formData.DB_PACKAGING}
            onChange={(v) => handleChange("DB_PACKAGING", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Suggested RP"
            value={formData.DB_SUGG_RP}
            onChange={(v) => handleChange("DB_SUGG_RP", v)}
            type="number"
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="No. of Samples"
            value={formData.DB_NO_SAMPLE}
            onChange={(v) => handleChange("DB_NO_SAMPLE", v)}
            type="number"
            colors={colors}
            darkMode={darkMode}
          />

          <FormField
            label="Expiry Date"
            value={formData.DB_EXPIRY_DATE}
            onChange={(v) => handleChange("DB_EXPIRY_DATE", v)}
            type="date"
            colors={colors}
            darkMode={darkMode}
          />
        </FieldGrid>
      </ERSection>

      {/* 💰 Fees */}
      <ERSection title="💰 Fees" colors={colors}>
        <FieldGrid>
          <FormField
            label="Fee"
            value={formData.DB_FEE}
            onChange={(v) => handleChange("DB_FEE", v)}
            type="number"
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="LRF"
            value={formData.DB_LRF}
            onChange={(v) => handleChange("DB_LRF", v)}
            type="number"
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="SURC"
            value={formData.DB_SURC}
            onChange={(v) => handleChange("DB_SURC", v)}
            type="number"
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Total"
            value={formData.DB_TOTAL}
            onChange={(v) => handleChange("DB_TOTAL", v)}
            type="number"
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="OR No."
            value={formData.DB_OR_NO}
            onChange={(v) => handleChange("DB_OR_NO", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Date Issued"
            value={formData.DB_DATE_ISSUED}
            onChange={(v) => handleChange("DB_DATE_ISSUED", v)}
            type="date"
            colors={colors}
            darkMode={darkMode}
          />
        </FieldGrid>
      </ERSection>

      {/* 🏭 Manufacturer */}
      <ERSection title="🏭 Manufacturer" colors={colors}>
        <FieldGrid>
          <FormField
            label="Manufacturer"
            value={formData.DB_PROD_MANU}
            onChange={(v) => handleChange("DB_PROD_MANU", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <CountryField
            label="Country"
            value={formData.DB_PROD_MANU_COUNTRY}
            onChange={(v) => handleChange("DB_PROD_MANU_COUNTRY", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="LTO No."
            value={formData.DB_PROD_MANU_LTO_NO}
            onChange={(v) => handleChange("DB_PROD_MANU_LTO_NO", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="TIN"
            value={formData.DB_PROD_MANU_TIN}
            onChange={(v) => handleChange("DB_PROD_MANU_TIN", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Address"
            value={formData.DB_PROD_MANU_ADD}
            onChange={(v) => handleChange("DB_PROD_MANU_ADD", v)}
            colors={colors}
            darkMode={darkMode}
            fullWidth
          />
        </FieldGrid>
      </ERSection>

      {/* 🤝 Trader */}
      <ERSection title="🤝 Trader" colors={colors}>
        <FieldGrid>
          <FormField
            label="Trader"
            value={formData.DB_PROD_TRADER}
            onChange={(v) => handleChange("DB_PROD_TRADER", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <CountryField
            label="Country"
            value={formData.DB_PROD_TRADER_COUNTRY}
            onChange={(v) => handleChange("DB_PROD_TRADER_COUNTRY", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="LTO No."
            value={formData.DB_PROD_TRADER_LTO_NO}
            onChange={(v) => handleChange("DB_PROD_TRADER_LTO_NO", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="TIN"
            value={formData.DB_PROD_TRADER_TIN}
            onChange={(v) => handleChange("DB_PROD_TRADER_TIN", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Address"
            value={formData.DB_PROD_TRADER_ADD}
            onChange={(v) => handleChange("DB_PROD_TRADER_ADD", v)}
            colors={colors}
            darkMode={darkMode}
            fullWidth
          />
        </FieldGrid>
      </ERSection>

      {/* 🚢 Importer */}
      <ERSection title="🚢 Importer" colors={colors}>
        <FieldGrid>
          <FormField
            label="Importer"
            value={formData.DB_PROD_IMPORTER}
            onChange={(v) => handleChange("DB_PROD_IMPORTER", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <CountryField
            label="Country"
            value={formData.DB_PROD_IMPORTER_COUNTRY}
            onChange={(v) => handleChange("DB_PROD_IMPORTER_COUNTRY", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="LTO No."
            value={formData.DB_PROD_IMPORTER_LTO_NO}
            onChange={(v) => handleChange("DB_PROD_IMPORTER_LTO_NO", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="TIN"
            value={formData.DB_PROD_IMPORTER_TIN}
            onChange={(v) => handleChange("DB_PROD_IMPORTER_TIN", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Address"
            value={formData.DB_PROD_IMPORTER_ADD}
            onChange={(v) => handleChange("DB_PROD_IMPORTER_ADD", v)}
            colors={colors}
            darkMode={darkMode}
            fullWidth
          />
        </FieldGrid>
      </ERSection>

      {/* 📦 Distributor */}
      <ERSection title="📦 Distributor" colors={colors}>
        <FieldGrid>
          <FormField
            label="Distributor"
            value={formData.DB_PROD_DISTRI}
            onChange={(v) => handleChange("DB_PROD_DISTRI", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <CountryField
            label="Country"
            value={formData.DB_PROD_DISTRI_COUNTRY}
            onChange={(v) => handleChange("DB_PROD_DISTRI_COUNTRY", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="LTO No."
            value={formData.DB_PROD_DISTRI_LTO_NO}
            onChange={(v) => handleChange("DB_PROD_DISTRI_LTO_NO", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="TIN"
            value={formData.DB_PROD_DISTRI_TIN}
            onChange={(v) => handleChange("DB_PROD_DISTRI_TIN", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Address"
            value={formData.DB_PROD_DISTRI_ADD}
            onChange={(v) => handleChange("DB_PROD_DISTRI_ADD", v)}
            colors={colors}
            darkMode={darkMode}
            fullWidth
          />
        </FieldGrid>
      </ERSection>

      {/* 🔄 Repacker */}
      <ERSection title="🔄 Repacker" colors={colors}>
        <FieldGrid>
          <FormField
            label="Repacker"
            value={formData.DB_PROD_REPACKER}
            onChange={(v) => handleChange("DB_PROD_REPACKER", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <CountryField
            label="Country"
            value={formData.DB_PROD_REPACKER_COUNTRY}
            onChange={(v) => handleChange("DB_PROD_REPACKER_COUNTRY", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="LTO No."
            value={formData.DB_PROD_REPACKER_LTO_NO}
            onChange={(v) => handleChange("DB_PROD_REPACKER_LTO_NO", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="TIN"
            value={formData.DB_PROD_REPACKER_TIN}
            onChange={(v) => handleChange("DB_PROD_REPACKER_TIN", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Address"
            value={formData.DB_PROD_REPACKER_ADD}
            onChange={(v) => handleChange("DB_PROD_REPACKER_ADD", v)}
            colors={colors}
            darkMode={darkMode}
            fullWidth
          />
        </FieldGrid>
      </ERSection>
    </div>
  );
}

/* ================================================================== */
/*  Step 2: Full Details                                                */
/* ================================================================== */
function Step2FullDetails({ formData, handleChange, colors, darkMode }) {
  return (
    <div>
      <ERSection title="📋 Application Information" colors={colors}>
        <FieldGrid>
          <FormField
            label="Registration No."
            value={formData.DB_REG_NO}
            onChange={(v) => handleChange("DB_REG_NO", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Mother App Type"
            value={formData.DB_MOTHER_APP_TYPE}
            onChange={(v) => handleChange("DB_MOTHER_APP_TYPE", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Old RSN"
            value={formData.DB_OLD_RSN}
            onChange={(v) => handleChange("DB_OLD_RSN", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Certification"
            value={formData.DB_CERTIFICATION}
            onChange={(v) => handleChange("DB_CERTIFICATION", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Class"
            value={formData.DB_CLASS}
            onChange={(v) => handleChange("DB_CLASS", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="MO"
            value={formData.DB_MO}
            onChange={(v) => handleChange("DB_MO", v)}
            colors={colors}
            darkMode={darkMode}
          />
        </FieldGrid>
      </ERSection>

      <ERSection title="" colors={colors}>
        <FieldGrid>
          <FormField
            label="Date Deck"
            value={formData.DB_DATE_DECK}
            onChange={(v) => handleChange("DB_DATE_DECK", v)}
            type="date"
            colors={colors}
            darkMode={darkMode}
          />

          <FormField
            label="CPR Validity"
            value={formData.DB_CPR_VALIDITY}
            onChange={(v) => handleChange("DB_CPR_VALIDITY", v)}
            type="date"
            colors={colors}
            darkMode={darkMode}
          />

          <FormField
            label="Date Remarks"
            value={formData.DB_DATE_REMARKS}
            onChange={(v) => handleChange("DB_DATE_REMARKS", v)}
            type="date"
            colors={colors}
            darkMode={darkMode}
          />
        </FieldGrid>
      </ERSection>

      <ERSection title="" colors={colors}>
        <FieldGrid>
          <FormField
            label="File"
            value={formData.DB_FILE}
            onChange={(v) => handleChange("DB_FILE", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Decking Schedule"
            value={formData.DB_DECKING_SCHED}
            onChange={(v) => handleChange("DB_DECKING_SCHED", v)}
            type="date"
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Evaluator"
            value={formData.DB_EVAL}
            onChange={(v) => handleChange("DB_EVAL", v)}
            colors={colors}
            darkMode={darkMode}
          />
        </FieldGrid>
      </ERSection>

      <ERSection title="" colors={colors}>
        <FieldGrid>
          <FormField
            label="SECPA"
            value={formData.DB_SECPA}
            onChange={(v) => handleChange("DB_SECPA", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Expiry Date"
            value={formData.DB_SECPA_EXP_DATE}
            onChange={(v) => handleChange("DB_SECPA_EXP_DATE", v)}
            type="date"
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Issued On / Issuance Date"
            value={formData.DB_SECPA_ISSUED_ON}
            onChange={(v) => handleChange("DB_SECPA_ISSUED_ON", v)}
            type="date"
            colors={colors}
            darkMode={darkMode}
          />
        </FieldGrid>
      </ERSection>

      <ERSection title="📤 Released Information" colors={colors}>
        <FieldGrid>
          <FormField
            label="Type Doc Released"
            value={formData.DB_TYPE_DOC_RELEASED}
            onChange={(v) => handleChange("DB_TYPE_DOC_RELEASED", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Atta Released"
            value={formData.DB_ATTA_RELEASED}
            onChange={(v) => handleChange("DB_ATTA_RELEASED", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Date Released"
            value={formData.DB_DATE_RELEASED}
            onChange={(v) => handleChange("DB_DATE_RELEASED", v)}
            type="date"
            colors={colors}
            darkMode={darkMode}
          />
        </FieldGrid>
      </ERSection>

      <ERSection title="📜 CPR Conditions" colors={colors}>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <FormField
            label="CPR Condition"
            value={formData.DB_CPR_COND}
            onChange={(v) => handleChange("DB_CPR_COND", v)}
            type="textarea"
            colors={colors}
            darkMode={darkMode}
            fullWidth
          />
          <FormField
            label="CPR Condition Remarks"
            value={formData.DB_CPR_COND_REMARKS}
            onChange={(v) => handleChange("DB_CPR_COND_REMARKS", v)}
            type="textarea"
            colors={colors}
            darkMode={darkMode}
            fullWidth
          />
          <FormField
            label="CPR Condition Additional Remarks"
            value={formData.DB_CPR_COND_ADD_REMARKS}
            onChange={(v) => handleChange("DB_CPR_COND_ADD_REMARKS", v)}
            type="textarea"
            colors={colors}
            darkMode={darkMode}
            fullWidth
          />
        </div>
      </ERSection>

      <ERSection title="📝 Amendments" colors={colors}>
        <FieldGrid>
          <FormField
            label="Amendment 1"
            value={formData.DB_AMMEND_1}
            onChange={(v) => handleChange("DB_AMMEND_1", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Amendment 2"
            value={formData.DB_AMMEND_2}
            onChange={(v) => handleChange("DB_AMMEND_2", v)}
            colors={colors}
            darkMode={darkMode}
          />
          <FormField
            label="Amendment 3"
            value={formData.DB_AMMEND_3}
            onChange={(v) => handleChange("DB_AMMEND_3", v)}
            colors={colors}
            darkMode={darkMode}
          />
        </FieldGrid>
      </ERSection>
      <ERSection title="📝 Remarks & Notes" colors={colors}>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <FormField
            label="Application Remarks"
            value={formData.DB_APP_REMARKS}
            onChange={(v) => handleChange("DB_APP_REMARKS", v)}
            type="textarea"
            colors={colors}
            darkMode={darkMode}
            fullWidth
          />
          <FormField
            label="General Remarks"
            value={formData.DB_REMARKS_1}
            onChange={(v) => handleChange("DB_REMARKS_1", v)}
            type="textarea"
            colors={colors}
            darkMode={darkMode}
            fullWidth
          />
        </div>
      </ERSection>

      <ERSection title="📊 Metadata" colors={colors}>
        <FieldGrid>
          <FormField
            label="Timeline (Days)"
            value={formData.DB_TIMELINE_CITIZEN_CHARTER}
            onChange={() => {}}
            colors={colors}
            darkMode={darkMode}
            readOnly
          />
          <FormField
            label="Status Timeline"
            value={formData.DB_STATUS_TIMELINE}
            onChange={() => {}}
            colors={colors}
            darkMode={darkMode}
            readOnly
          />
          <FormField
            label="Uploaded By"
            value={formData.DB_USER_UPLOADER}
            onChange={() => {}}
            colors={colors}
            darkMode={darkMode}
            readOnly
          />
          <FormField
            label="Upload Date"
            value={formData.DB_DATE_EXCEL_UPLOAD}
            onChange={() => {}}
            type="date"
            colors={colors}
            darkMode={darkMode}
            readOnly
          />
        </FieldGrid>
      </ERSection>
    </div>
  );
}

/* ================================================================== */
/*  Main Modal                                                          */
/* ================================================================== */
function EditRecordModal({
  record,
  onClose,
  onSuccess,
  colors,
  darkMode,
  updateUploadReport,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    DB_EST_CAT: "",
    DB_EST_LTO_COMP: "",
    DB_EST_LTO_ADD: "",
    DB_EST_EADD: "",
    DB_EST_TIN: "",
    DB_EST_CONTACT_NO: "",
    DB_EST_LTO_NO: "",
    DB_EST_VALIDITY: "",
    DB_PROD_BR_NAME: "",
    DB_PROD_GEN_NAME: "",
    DB_PROD_DOS_STR: "",
    DB_PROD_DOS_FORM: "",
    DB_PROD_CLASS_PRESCRIP: "",
    DB_PROD_ESS_DRUG_LIST: "",
    DB_PROD_PHARMA_CAT: "",
    DB_PROD_CAT: "",
    DB_PHARMA_PROD_CAT: "",
    DB_PHARMA_PROD_CAT_LABEL: "",
    DB_PROD_MANU: "",
    DB_PROD_MANU_ADD: "",
    DB_PROD_MANU_TIN: "",
    DB_PROD_MANU_LTO_NO: "",
    DB_PROD_MANU_COUNTRY: "",
    DB_PROD_TRADER: "",
    DB_PROD_TRADER_ADD: "",
    DB_PROD_TRADER_TIN: "",
    DB_PROD_TRADER_LTO_NO: "",
    DB_PROD_TRADER_COUNTRY: "",
    DB_PROD_REPACKER: "",
    DB_PROD_REPACKER_ADD: "",
    DB_PROD_REPACKER_TIN: "",
    DB_PROD_REPACKER_LTO_NO: "",
    DB_PROD_REPACKER_COUNTRY: "",
    DB_PROD_IMPORTER: "",
    DB_PROD_IMPORTER_ADD: "",
    DB_PROD_IMPORTER_TIN: "",
    DB_PROD_IMPORTER_LTO_NO: "",
    DB_PROD_IMPORTER_COUNTRY: "",
    DB_PROD_DISTRI: "",
    DB_PROD_DISTRI_ADD: "",
    DB_PROD_DISTRI_TIN: "",
    DB_PROD_DISTRI_LTO_NO: "",
    DB_PROD_DISTRI_COUNTRY: "",
    DB_PROD_DISTRI_SHELF_LIFE: "",
    DB_STORAGE_COND: "",
    DB_PACKAGING: "",
    DB_SUGG_RP: "",
    DB_NO_SAMPLE: "",
    DB_DTN: "",
    DB_REG_NO: "",
    DB_APP_TYPE: "",
    DB_PROCESSING_TYPE: "",
    DB_MOTHER_APP_TYPE: "",
    DB_OLD_RSN: "",
    DB_CERTIFICATION: "",
    DB_CLASS: "",
    DB_AMMEND_1: "",
    DB_AMMEND_2: "",
    DB_AMMEND_3: "",
    DB_FEE: "",
    DB_LRF: "",
    DB_SURC: "",
    DB_TOTAL: "",
    DB_OR_NO: "",
    DB_DATE_ISSUED: "",
    DB_DATE_RECEIVED_FDAC: "",
    DB_DATE_RECEIVED_CENT: "",
    DB_DATE_DECK: "",
    DB_DATE_RELEASED: "",
    DB_EXPIRY_DATE: "",
    DB_CPR_VALIDITY: "",
    DB_DATE_REMARKS: "",
    DB_MO: "",
    DB_FILE: "",
    DB_SECPA: "",
    DB_SECPA_EXP_DATE: "",
    DB_SECPA_ISSUED_ON: "",
    DB_DECKING_SCHED: "",
    DB_EVAL: "",
    DB_TYPE_DOC_RELEASED: "",
    DB_ATTA_RELEASED: "",
    DB_CPR_COND: "",
    DB_CPR_COND_REMARKS: "",
    DB_CPR_COND_ADD_REMARKS: "",
    DB_APP_STATUS: "",
    DB_APP_REMARKS: "",
    DB_REMARKS_1: "",
    DB_TIMELINE_CITIZEN_CHARTER: "",
    DB_STATUS_TIMELINE: "",
    DB_USER_UPLOADER: "",
    DB_DATE_EXCEL_UPLOAD: "",
  });

  const [originalData, setOriginalData] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const STEPS = ["Basic Info", "Full Details", "Review & Save"];
  const totalSteps = STEPS.length;
  const goNext = () => setCurrentStep((s) => Math.min(s + 1, totalSteps));
  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 1));

  useEffect(() => {
    const user = getUser();
    if (user) setCurrentUser(user);
  }, []);

  useEffect(() => {
    if (record) {
      const d = {
        DB_EST_CAT: cleanValue(
          record.estCat || record.category || record.DB_EST_CAT,
        ),
        DB_EST_LTO_COMP: cleanValue(
          record.ltoComp || record.ltoCompany || record.DB_EST_LTO_COMP,
        ),
        DB_EST_LTO_ADD: cleanValue(
          record.ltoAdd || record.ltoAddress || record.DB_EST_LTO_ADD,
        ),
        DB_EST_EADD: cleanValue(
          record.eadd || record.email || record.DB_EST_EADD,
        ),
        DB_EST_TIN: cleanValue(record.tin || record.DB_EST_TIN),
        DB_EST_CONTACT_NO: cleanValue(
          record.contactNo || record.DB_EST_CONTACT_NO,
        ),
        DB_EST_LTO_NO: cleanValue(record.ltoNo || record.DB_EST_LTO_NO),
        DB_EST_VALIDITY: cleanDateValue(
          record.validity || record.DB_EST_VALIDITY,
        ),
        DB_PROD_BR_NAME: cleanValue(
          record.prodBrName || record.brandName || record.DB_PROD_BR_NAME,
        ),
        DB_PROD_GEN_NAME: cleanValue(
          record.prodGenName || record.genericName || record.DB_PROD_GEN_NAME,
        ),
        DB_PROD_DOS_STR: cleanValue(
          record.prodDosStr || record.dosageStrength || record.DB_PROD_DOS_STR,
        ),
        DB_PROD_DOS_FORM: cleanValue(
          record.prodDosForm || record.dosageForm || record.DB_PROD_DOS_FORM,
        ),
        DB_PROD_CLASS_PRESCRIP: cleanValue(
          record.prodClassPrescript ||
            record.prescription ||
            record.DB_PROD_CLASS_PRESCRIP,
        ),
        DB_PROD_ESS_DRUG_LIST: cleanValue(
          record.prodEssDrugList ||
            record.essentialDrug ||
            record.DB_PROD_ESS_DRUG_LIST,
        ),
        DB_PROD_PHARMA_CAT: cleanValue(
          record.prodPharmaCat ||
            record.pharmaCategory ||
            record.DB_PROD_PHARMA_CAT,
        ),
        DB_PROD_CAT: cleanValue(record.prodCat || record.DB_PROD_CAT),
        DB_PHARMA_PROD_CAT: cleanValue(
          record.pharmaProdCat || record.DB_PHARMA_PROD_CAT,
        ),
        DB_PHARMA_PROD_CAT_LABEL: cleanValue(
          record.pharmaProdCatLabel || record.DB_PHARMA_PROD_CAT_LABEL,
        ),
        DB_PROD_MANU: cleanValue(
          record.prodManu || record.manufacturer || record.DB_PROD_MANU,
        ),
        DB_PROD_MANU_ADD: cleanValue(
          record.prodManuAdd ||
            record.manufacturerAddress ||
            record.DB_PROD_MANU_ADD,
        ),
        DB_PROD_MANU_TIN: cleanValue(
          record.prodManuTin ||
            record.manufacturerTin ||
            record.DB_PROD_MANU_TIN,
        ),
        DB_PROD_MANU_LTO_NO: cleanValue(
          record.prodManuLtoNo ||
            record.manufacturerLtoNo ||
            record.DB_PROD_MANU_LTO_NO,
        ),
        DB_PROD_MANU_COUNTRY: cleanValue(
          record.prodManuCountry ||
            record.manufacturerCountry ||
            record.DB_PROD_MANU_COUNTRY,
        ),
        DB_PROD_TRADER: cleanValue(record.prodTrader || record.DB_PROD_TRADER),
        DB_PROD_TRADER_ADD: cleanValue(
          record.prodTraderAdd || record.DB_PROD_TRADER_ADD,
        ),
        DB_PROD_TRADER_TIN: cleanValue(
          record.prodTraderTin || record.DB_PROD_TRADER_TIN,
        ),
        DB_PROD_TRADER_LTO_NO: cleanValue(
          record.prodTraderLtoNo || record.DB_PROD_TRADER_LTO_NO,
        ),
        DB_PROD_TRADER_COUNTRY: cleanValue(
          record.prodTraderCountry || record.DB_PROD_TRADER_COUNTRY,
        ),
        DB_PROD_REPACKER: cleanValue(
          record.prodRepacker || record.DB_PROD_REPACKER,
        ),
        DB_PROD_REPACKER_ADD: cleanValue(
          record.prodRepackerAdd || record.DB_PROD_REPACKER_ADD,
        ),
        DB_PROD_REPACKER_TIN: cleanValue(
          record.prodRepackerTin || record.DB_PROD_REPACKER_TIN,
        ),
        DB_PROD_REPACKER_LTO_NO: cleanValue(
          record.prodRepackerLtoNo || record.DB_PROD_REPACKER_LTO_NO,
        ),
        DB_PROD_REPACKER_COUNTRY: cleanValue(
          record.prodRepackerCountry || record.DB_PROD_REPACKER_COUNTRY,
        ),
        DB_PROD_IMPORTER: cleanValue(
          record.prodImporter || record.DB_PROD_IMPORTER,
        ),
        DB_PROD_IMPORTER_ADD: cleanValue(
          record.prodImporterAdd || record.DB_PROD_IMPORTER_ADD,
        ),
        DB_PROD_IMPORTER_TIN: cleanValue(
          record.prodImporterTin || record.DB_PROD_IMPORTER_TIN,
        ),
        DB_PROD_IMPORTER_LTO_NO: cleanValue(
          record.prodImporterLtoNo || record.DB_PROD_IMPORTER_LTO_NO,
        ),
        DB_PROD_IMPORTER_COUNTRY: cleanValue(
          record.prodImporterCountry || record.DB_PROD_IMPORTER_COUNTRY,
        ),
        DB_PROD_DISTRI: cleanValue(record.prodDistri || record.DB_PROD_DISTRI),
        DB_PROD_DISTRI_ADD: cleanValue(
          record.prodDistriAdd || record.DB_PROD_DISTRI_ADD,
        ),
        DB_PROD_DISTRI_TIN: cleanValue(
          record.prodDistriTin || record.DB_PROD_DISTRI_TIN,
        ),
        DB_PROD_DISTRI_LTO_NO: cleanValue(
          record.prodDistriLtoNo || record.DB_PROD_DISTRI_LTO_NO,
        ),
        DB_PROD_DISTRI_COUNTRY: cleanValue(
          record.prodDistriCountry || record.DB_PROD_DISTRI_COUNTRY,
        ),
        DB_PROD_DISTRI_SHELF_LIFE: cleanValue(
          record.prodDistriShelfLife || record.DB_PROD_DISTRI_SHELF_LIFE,
        ),
        DB_STORAGE_COND: cleanValue(
          record.storageCond || record.DB_STORAGE_COND,
        ),
        DB_PACKAGING: cleanValue(record.packaging || record.DB_PACKAGING),
        DB_SUGG_RP: cleanValue(record.suggRp || record.DB_SUGG_RP),
        DB_NO_SAMPLE: cleanValue(record.noSample || record.DB_NO_SAMPLE),
        DB_DTN: cleanNumberValue(record.dtn || record.DB_DTN),
        DB_REG_NO: cleanValue(
          record.regNo || record.registrationNo || record.DB_REG_NO,
        ),
        DB_APP_TYPE: cleanValue(record.appType || record.DB_APP_TYPE),
        DB_PROCESSING_TYPE: cleanValue(
          record.processingType || record.DB_PROCESSING_TYPE,
        ),
        DB_MOTHER_APP_TYPE: cleanValue(
          record.motherAppType || record.DB_MOTHER_APP_TYPE,
        ),
        DB_OLD_RSN: cleanValue(record.oldRsn || record.DB_OLD_RSN),
        DB_CERTIFICATION: cleanValue(
          record.certification || record.DB_CERTIFICATION,
        ),
        DB_CLASS: cleanValue(record.class || record.dbClass || record.DB_CLASS),
        DB_AMMEND_1: cleanValue(record.ammend1 || record.DB_AMMEND_1),
        DB_AMMEND_2: cleanValue(record.ammend2 || record.DB_AMMEND_2),
        DB_AMMEND_3: cleanValue(record.ammend3 || record.DB_AMMEND_3),
        DB_FEE: cleanNumberValue(record.fee || record.DB_FEE),
        DB_LRF: cleanNumberValue(record.lrf || record.DB_LRF),
        DB_SURC: cleanNumberValue(record.surc || record.DB_SURC),
        DB_TOTAL: cleanNumberValue(record.total || record.DB_TOTAL),
        DB_OR_NO: cleanValue(record.orNo || record.DB_OR_NO),
        DB_DATE_ISSUED: cleanDateValue(
          record.dateIssued || record.DB_DATE_ISSUED,
        ),
        DB_DATE_RECEIVED_FDAC: cleanDateValue(
          record.dateReceivedFdac || record.DB_DATE_RECEIVED_FDAC,
        ),
        DB_DATE_RECEIVED_CENT: cleanDateValue(
          record.dateReceivedCent || record.DB_DATE_RECEIVED_CENT,
        ),
        DB_DATE_DECK: cleanDateValue(record.dateDeck || record.DB_DATE_DECK),
        DB_DATE_RELEASED: cleanDateValue(
          record.dateReleased || record.DB_DATE_RELEASED,
        ),
        DB_EXPIRY_DATE: cleanDateValue(
          record.expiryDate || record.DB_EXPIRY_DATE,
        ),
        DB_CPR_VALIDITY: cleanDateValue(
          record.cprValidity || record.DB_CPR_VALIDITY,
        ),
        DB_DATE_REMARKS: cleanDateValue(
          record.dateRemarks || record.DB_DATE_REMARKS,
        ),
        DB_MO: cleanValue(record.mo || record.DB_MO),
        DB_FILE: cleanValue(record.file || record.DB_FILE),
        DB_SECPA: cleanValue(record.secpa || record.DB_SECPA),
        DB_SECPA_EXP_DATE: cleanDateValue(
          record.secpaExpDate || record.DB_SECPA_EXP_DATE,
        ),
        DB_SECPA_ISSUED_ON: cleanDateValue(
          record.secpaIssuedOn || record.DB_SECPA_ISSUED_ON,
        ),
        DB_DECKING_SCHED: cleanDateValue(
          record.deckingSched || record.DB_DECKING_SCHED,
        ),
        DB_EVAL: cleanValue(record.eval || record.evaluator || record.DB_EVAL),
        DB_TYPE_DOC_RELEASED: cleanValue(
          record.typeDocReleased || record.DB_TYPE_DOC_RELEASED,
        ),
        DB_ATTA_RELEASED: cleanValue(
          record.attaReleased || record.DB_ATTA_RELEASED,
        ),
        DB_CPR_COND: cleanValue(record.cprCond || record.DB_CPR_COND),
        DB_CPR_COND_REMARKS: cleanValue(
          record.cprCondRemarks || record.DB_CPR_COND_REMARKS,
        ),
        DB_CPR_COND_ADD_REMARKS: cleanValue(
          record.cprCondAddRemarks || record.DB_CPR_COND_ADD_REMARKS,
        ),
        DB_APP_STATUS: cleanValue(record.appStatus || record.DB_APP_STATUS),
        DB_APP_REMARKS: cleanValue(record.appRemarks || record.DB_APP_REMARKS),
        DB_REMARKS_1: cleanValue(record.remarks1 || record.DB_REMARKS_1),
        DB_TIMELINE_CITIZEN_CHARTER: cleanNumberValue(
          record.dbTimelineCitizenCharter || record.DB_TIMELINE_CITIZEN_CHARTER,
        ),
        DB_STATUS_TIMELINE: cleanValue(
          record.statusTimeline || record.DB_STATUS_TIMELINE,
        ),
        DB_USER_UPLOADER: cleanValue(
          record.userUploader || record.DB_USER_UPLOADER,
        ),
        DB_DATE_EXCEL_UPLOAD: cleanDateValue(
          record.dateExcelUpload || record.DB_DATE_EXCEL_UPLOAD,
        ),
      };
      setFormData(d);
      setOriginalData(d);
    }
  }, [record]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const changedCount = Object.entries(formData).filter(
    ([k, v]) => String(v ?? "") !== String(originalData[k] ?? ""),
  ).length;

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);
    try {
      const changes = computeFieldChanges(
        originalData,
        formData,
        FIELD_LABEL_MAP,
        "Edit Record",
      );
      if (changes.length > 0) {
        try {
          await createFieldAuditLog({
            main_db_id: record.id,
            log_id: null,
            session_id: crypto.randomUUID(),
            changes,
          });
        } catch (auditErr) {
          console.warn("⚠️ Audit log failed (non-fatal):", auditErr.message);
        }
      }
      await updateUploadReport(record.id, formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update record");
    } finally {
      setSaving(false);
    }
  };

  if (!record) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
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
          width: "min(1100px, 95vw)",
          maxHeight: "92vh",
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "16px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "1.25rem 1.75rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            gap: "1rem",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}
          >
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: "700",
                color: colors.textPrimary,
                margin: 0,
              }}
            >
              {currentStep === 1
                ? "✏️ Edit Basic Info"
                : currentStep === 2
                  ? "✏️ Edit Full Details"
                  : "📋 Review Changes"}
            </h2>
            <p
              style={{
                fontSize: "0.78rem",
                color: colors.textTertiary,
                margin: 0,
              }}
            >
              DTN:{" "}
              <strong style={{ color: "#2196F3" }}>
                {formData.DB_DTN || "N/A"}
              </strong>
              {" · "}
              {formData.DB_PROD_BR_NAME || "N/A"}
              {currentUser && (
                <span style={{ marginLeft: "0.5rem" }}>
                  · Editing as:{" "}
                  <strong style={{ color: "#2196F3" }}>
                    {currentUser.username}
                  </strong>
                </span>
              )}
              {changedCount > 0 && (
                <span
                  style={{
                    marginLeft: "0.5rem",
                    padding: "0.1rem 0.45rem",
                    background: "rgba(245,158,11,0.15)",
                    color: "#b45309",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontWeight: "700",
                  }}
                >
                  ✎ {changedCount} unsaved change{changedCount > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>

          {/* StepIndicator */}
          <div
            style={{
              flex: 1,
              maxWidth: "320px",
              position: "relative",
              paddingBottom: "1.2rem",
            }}
          >
            <StepIndicator
              currentStep={currentStep}
              steps={STEPS}
              colors={colors}
            />
          </div>

          <button
            onClick={onClose}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "8px",
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              cursor: "pointer",
              fontSize: "1.1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.2s",
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

        {/* ── Scrollable Content ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.75rem",
            minHeight: 0,
          }}
        >
          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "8px",
                padding: "0.85rem 1rem",
                marginBottom: "1rem",
                color: "#EF4444",
                fontSize: "0.82rem",
              }}
            >
              ⚠️ {error}
            </div>
          )}
          {currentStep === 1 && (
            <Step1BasicInfo
              formData={formData}
              handleChange={handleChange}
              colors={colors}
              darkMode={darkMode}
            />
          )}
          {currentStep === 2 && (
            <Step2FullDetails
              formData={formData}
              handleChange={handleChange}
              colors={colors}
              darkMode={darkMode}
            />
          )}
          {currentStep === 3 && (
            <Step3Summary
              formData={formData}
              originalData={originalData}
              colors={colors}
              darkMode={darkMode}
            />
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: "1rem 1.75rem",
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
              fontSize: "0.78rem",
              color: colors.textTertiary,
              fontWeight: "600",
            }}
          >
            {currentStep === 3 ? (
              changedCount > 0 ? (
                <span style={{ color: "#f59e0b" }}>
                  ✎ {changedCount} field{changedCount > 1 ? "s" : ""} modified —
                  review above before saving
                </span>
              ) : (
                <span style={{ color: colors.textTertiary }}>
                  No changes to save
                </span>
              )
            ) : changedCount > 0 ? (
              <span style={{ color: "#f59e0b" }}>
                ✎ {changedCount} field{changedCount > 1 ? "s" : ""} modified —
                will be logged on save
              </span>
            ) : (
              `Step ${currentStep} of ${totalSteps}`
            )}
          </span>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            {currentStep > 1 && (
              <button
                onClick={goPrev}
                style={{
                  padding: "0.6rem 1.2rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                ← Previous
              </button>
            )}

            {currentStep < totalSteps && (
              <button
                onClick={goNext}
                style={{
                  padding: "0.6rem 1.4rem",
                  background: "linear-gradient(135deg, #2196F3, #1976D2)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.875rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  boxShadow: "0 2px 8px rgba(33,150,243,0.3)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(33,150,243,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow =
                    "0 2px 8px rgba(33,150,243,0.3)";
                }}
              >
                {currentStep === 2 ? "Review Changes →" : "Next →"}
              </button>
            )}

            {/* Save button only on step 3 */}
            {currentStep === totalSteps && (
              <button
                onClick={handleSubmit}
                disabled={saving || changedCount === 0}
                style={{
                  padding: "0.6rem 1.4rem",
                  background:
                    saving || changedCount === 0
                      ? colors.cardBorder
                      : "linear-gradient(135deg, #10b981, #059669)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.875rem",
                  fontWeight: "700",
                  cursor:
                    saving || changedCount === 0 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  boxShadow:
                    saving || changedCount === 0
                      ? "none"
                      : "0 2px 8px rgba(16,185,129,0.3)",
                  transition: "all 0.2s",
                }}
              >
                {saving
                  ? "💾 Saving..."
                  : `💾 Save${changedCount > 0 ? ` (${changedCount})` : ""} Changes`}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default EditRecordModal;
