import { cleanValue, formatDate } from "../config/helpers";
import { EDITABLE_FIELDS } from "../config/fields";
import {
  VDSection,
  FieldGrid,
  DisplayField,
  EditableField,
} from "../components/BaseFields";

// import { SpellCheckButton } from "./SpellCheckButton";

const TYPE_DOC_OPTIONS = [
  "CPR",
  "LOD",
  "Certificate",
  "Letter",
  "COPP",
  "CFS",
  "GLE",
  "Letter for non acceptance",
  "Product classification",
];

export function Step2FullDetails({
  record,
  editedFields,
  onFieldChange,
  canEdit,
  colors,
  currentStep,
  isQAAdmin = false,
  missingFields = [],
}) {
  const isQE = currentStep === "Quality Evaluation";

  // ─── QA Admin helpers ───
  // Note: typeDocReleased, attaReleased, dateReleased are NOT required fields
  const isMissing = (fieldKey) => isQAAdmin && missingFields.includes(fieldKey);

  const requiredBadge = (fieldKey) => {
    if (!isQAAdmin) return null;
    return isMissing(fieldKey) ? (
      <span
        style={{
          fontSize: "0.55rem",
          fontWeight: "700",
          color: "#ef4444",
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.3)",
          padding: "0.05rem 0.3rem",
          borderRadius: "3px",
          marginLeft: "0.3rem",
          textTransform: "none",
          letterSpacing: "normal",
        }}
      >
        Required
      </span>
    ) : (
      <span
        style={{ fontSize: "0.55rem", color: "#10b981", marginLeft: "0.3rem" }}
      >
        ✓
      </span>
    );
  };

  const enhancedLabel = (label, fieldKey) =>
    isQAAdmin ? (
      <span>
        {label}
        {requiredBadge(fieldKey)}
      </span>
    ) : (
      label
    );

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
    const missing = isMissing(fieldKey);

    if (isEditable && date) {
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
            {enhancedLabel(label, fieldKey)}
          </label>
          <input
            type="date"
            value={inputVal}
            onChange={(e) => onFieldChange(fieldKey, e.target.value)}
            style={{
              padding: "0.4rem 0.6rem",
              borderRadius: "6px",
              border: missing
                ? "1.5px solid rgba(239,68,68,0.8)"
                : isModified
                  ? "1.5px solid rgba(245,158,11,0.8)"
                  : `1px solid ${colors?.border ?? "#d1d5db"}`,
              background: missing
                ? "rgba(239,68,68,0.04)"
                : isModified
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
          label={enhancedLabel(label, fieldKey)}
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
        label={enhancedLabel(label, fieldKey)}
        value={cleanValue(record[fieldKey])}
        colors={colors}
        fullWidth={fullWidth}
      />
    );
  };

  // ─── Type Doc Released dropdown field ───
  const typeDocReleasedField = () => {
    const fieldKey = "typeDocReleased";
    const isEditable = canEdit && EDITABLE_FIELDS.includes(fieldKey);
    const currentVal =
      fieldKey in editedFields
        ? editedFields[fieldKey]
        : (record[fieldKey] ?? "");
    const originalVal = record[fieldKey] ?? "";
    const isDirty = String(currentVal ?? "") !== String(originalVal ?? "");

    const labelNode = (
      <div
        style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: colors?.label ?? "#6b7280",
          marginBottom: "0.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.3rem",
        }}
      >
        Type Doc Released
        {/* No required badge — this field is not required */}
      </div>
    );

    if (isEditable) {
      return (
        <div
          key={fieldKey}
          style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
        >
          {labelNode}
          <select
            value={currentVal}
            onChange={(e) => onFieldChange(fieldKey, e.target.value)}
            style={{
              padding: "0.4rem 0.6rem",
              borderRadius: "6px",
              border: isDirty
                ? "1.5px solid rgba(245,158,11,0.8)"
                : `1px solid ${colors?.inputBorder ?? "#d1d5db"}`,
              background: isDirty
                ? "rgba(245,158,11,0.06)"
                : (colors?.inputBg ?? "#fff"),
              color: currentVal
                ? (colors?.textPrimary ?? "#111827")
                : (colors?.textTertiary ?? "#9ca3af"),
              fontSize: "0.85rem",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
              cursor: "pointer",
              appearance: "auto",
            }}
          >
            <option value="">— Select type —</option>
            {TYPE_DOC_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {isDirty && (
            <span
              style={{
                fontSize: "0.65rem",
                color: "#b45309",
                fontStyle: "italic",
              }}
            >
              Modified · original: {originalVal || "—"}
            </span>
          )}
        </div>
      );
    }

    return (
      <DisplayField
        key={fieldKey}
        label="Type Doc Released"
        value={cleanValue(record[fieldKey])}
        colors={colors}
      />
    );
  };

  return (
    <div>
      {/* ── QA Admin required fields banner ── */}
      {isQAAdmin && (
        <div
          style={{
            marginBottom: "0.9rem",
            padding: "0.5rem 0.75rem",
            background:
              missingFields.length > 0
                ? "rgba(239,68,68,0.07)"
                : "rgba(16,185,129,0.07)",
            border: `1px solid ${
              missingFields.length > 0
                ? "rgba(239,68,68,0.3)"
                : "rgba(16,185,129,0.3)"
            }`,
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.75rem",
            color: missingFields.length > 0 ? "#dc2626" : "#059669",
          }}
        >
          <span>{missingFields.length > 0 ? "⚠️" : "✓"}</span>
          <span>
            {missingFields.length > 0 ? (
              <>
                <strong>
                  {missingFields.length} required field
                  {missingFields.length !== 1 ? "s" : ""} missing
                </strong>{" "}
                — Fill all required fields to proceed to Step 3.
              </>
            ) : (
              <strong>
                All required fields are complete — you may proceed to Step 3.
              </strong>
            )}
          </span>
        </div>
      )}

      {/* ── Spell Check Button ── */}
      {/* <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "0.9rem",
        }}
      >
        <SpellCheckButton
          record={record}
          editedFields={editedFields}
          onFieldChange={onFieldChange}
          colors={colors}
        />
      </div> */}

      {/* Edit mode banner */}
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

      {/* 🔐 SECPA — hidden for QE */}
      {!isQE && (
        <VDSection title="" colors={colors}>
          <FieldGrid>
            {field("SECPA", "secpa")}
            {field("Expiry Date", "secpaExpDate", { date: true })}
            {field("Issued On/ Issuence Date", "secpaIssuedOn", { date: true })}
          </FieldGrid>
        </VDSection>
      )}

      {/* 📤 Released Information — hidden for QE */}
      {!isQE && (
        <VDSection title="📤 Released Information" colors={colors}>
          <FieldGrid>
            {typeDocReleasedField()}
            {field("Atta Released", "attaReleased")}
            {field("Date Released by CDRR", "dateReleased", { date: true })}
          </FieldGrid>
        </VDSection>
      )}

      {/* 📜 CPR Conditions — hidden for QE */}
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
