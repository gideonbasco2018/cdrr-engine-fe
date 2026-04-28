import { cleanValue, formatDate } from "../config/helpers";
import { EDITABLE_FIELDS } from "../config/fields";
import {
  VDSection,
  FieldGrid,
  DisplayField,
  EditableField,
} from "../components/BaseFields";

export function Step2FullDetails({
  record,
  editedFields,
  onFieldChange,
  canEdit,
  colors,
  currentStep,
}) {
  /* Hide certain fields/sections when current step is Quality Evaluation.
     Those fields are moved to Step 4 and shown only when Action = "For Approval". */
  const isQE = currentStep === "Quality Evaluation";

  const field = (
    label,
    fieldKey,
    { fullWidth = false, multiline = false, date = false } = {},
  ) => {
    const isEditable = canEdit && EDITABLE_FIELDS.includes(fieldKey);
    const currentVal =
      fieldKey in editedFields
        ? editedFields[fieldKey]
        : (record[fieldKey] ?? "");
    const originalVal = record[fieldKey] ?? "";

    if (isEditable && date) {
      // Normalize value to YYYY-MM-DD for the native date input
      const toInputDate = (val) => {
        if (!val) return "";
        const d = new Date(val);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().split("T")[0];
      };

      const inputVal = toInputDate(currentVal);
      const originalInputVal = toInputDate(originalVal);
      const isModified = inputVal !== originalInputVal;

      return (
        <div
          key={fieldKey}
          style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
        >
          <label
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: colors?.label ?? "#6b7280",
            }}
          >
            {label}
          </label>
          <input
            type="date"
            value={inputVal}
            onChange={(e) => onFieldChange(fieldKey, e.target.value)}
            style={{
              padding: "0.4rem 0.6rem",
              borderRadius: "6px",
              border: isModified
                ? "1.5px solid rgba(245,158,11,0.8)"
                : `1px solid ${colors?.border ?? "#d1d5db"}`,
              background: isModified
                ? "rgba(245,158,11,0.06)"
                : (colors?.inputBg ?? "#fff"),
              color: colors?.text ?? "#111827",
              fontSize: "0.85rem",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
              cursor: "pointer",
            }}
          />
          {isModified && (
            <span
              style={{
                fontSize: "0.65rem",
                color: "#b45309",
                fontStyle: "italic",
              }}
            >
              Modified · original: {formatDate(originalVal) || "—"}
            </span>
          )}
        </div>
      );
    }

    if (isEditable) {
      return (
        <EditableField
          key={fieldKey}
          label={label}
          fieldKey={fieldKey}
          value={currentVal}
          originalValue={originalVal}
          onChange={onFieldChange}
          colors={colors}
          fullWidth={fullWidth}
          multiline={multiline}
        />
      );
    }

    return (
      <DisplayField
        key={fieldKey}
        label={label}
        value={cleanValue(record[fieldKey])}
        colors={colors}
        fullWidth={fullWidth}
      />
    );
  };

  return (
    <div>
      {canEdit && (
        <div
          style={{
            marginBottom: "0.9rem",
            padding: "0.5rem 0.75rem",
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.75rem",
            color: "#b45309",
          }}
        >
          <span>✎</span>
          <span>
            <strong>Edit Mode Active</strong> — Fields highlighted in orange
            have been modified. Changes will be saved when you complete the task
            in Step 4.
          </span>
        </div>
      )}

      {/* Notice shown for QE users that some fields moved to Step 4 */}
      {isQE && (
        <div
          style={{
            marginBottom: "0.9rem",
            padding: "0.5rem 0.75rem",
            background: "rgba(33,150,243,0.07)",
            border: "1px solid rgba(33,150,243,0.25)",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.75rem",
            color: "#1565C0",
          }}
        >
          <span>ℹ️</span>
          <span>
            <strong>
              Registration Number, SECPA, and Released Information
            </strong>{" "}
            fields are available in <strong>Step 4 → Action</strong> when the
            Action Type is <strong>For Approval</strong>.
          </span>
        </div>
      )}

      <VDSection title="📋 Application Information" colors={colors}>
        <FieldGrid>
          {!isQE && field("Registration No.", "regNo")}
          {field("Mother App Type", "motherAppType")}
          {field("Old RSN", "oldRsn")}
          {field("Certification", "certification")}
          {field("Class", "class")}
          {field("MO", "mo")}
        </FieldGrid>
      </VDSection>

      {/* 🔐 SECPA — hidden for QE, moved to Step 4 For Approval */}
      {!isQE && (
        <VDSection title="" colors={colors}>
          <FieldGrid>
            {field("SECPA", "secpa")}
            {field("Expiry Date", "secpaExpDate", { date: true })}
            {field("Issued On/ Issuence Date", "secpaIssuedOn", { date: true })}
          </FieldGrid>
        </VDSection>
      )}

      {/* 📤 Released Information — hidden for QE, moved to Step 4 For Approval */}
      {!isQE && (
        <VDSection title="📤 Released Information" colors={colors}>
          <FieldGrid>
            {field("Type Doc Released", "typeDocReleased")}
            {field("Atta Released", "attaReleased")}
            {field("Date Released by CDRR", "dateReleased", { date: true })}
          </FieldGrid>
        </VDSection>
      )}

      {/* 📜 CPR Conditions — hidden for QE, moved to Step 4 For Approval */}
      {!isQE && (
        <VDSection title="📜 CPR Conditions" colors={colors}>
          {field("CPR Condition", "cprCond", {
            fullWidth: true,
            multiline: true,
          })}
          {field("CPR Condition Remarks", "cprCondRemarks", {
            fullWidth: true,
            multiline: true,
          })}
          {field("CPR Condition Additional Remarks", "cprCondAddRemarks", {
            fullWidth: true,
            multiline: true,
          })}
        </VDSection>
      )}

      <VDSection title="📝 Amendments" colors={colors}>
        <FieldGrid>
          {field("Amendment 1", "ammend1")}
          {field("Amendment 2", "ammend2")}
          {field("Amendment 3", "ammend3")}
        </FieldGrid>
      </VDSection>

      <VDSection title="📝 Remarks & Notes" colors={colors}>
        {field("Application Remarks", "appRemarks", {
          fullWidth: true,
          multiline: true,
        })}
        {field("General Remarks", "remarks1", {
          fullWidth: true,
          multiline: true,
        })}
      </VDSection>
    </div>
  );
}
