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
    { fullWidth = false, multiline = false } = {},
  ) => {
    const isEditable = canEdit && EDITABLE_FIELDS.includes(fieldKey);
    const currentVal =
      fieldKey in editedFields
        ? editedFields[fieldKey]
        : (record[fieldKey] ?? "");
    const originalVal = record[fieldKey] ?? "";
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
          {/* Registration No. hidden for QE — moved to Step 4 For Approval */}
          {!isQE && field("Registration No.", "regNo")}
          {field("Mother App Type", "motherAppType")}
          {field("Old RSN", "oldRsn")}
          {field("Certification", "certification")}
          {field("Class", "class")}
          {field("MO", "mo")}
        </FieldGrid>
      </VDSection>

      <VDSection title="" colors={colors}>
        <FieldGrid>
          <DisplayField
            label="Date Deck"
            value={formatDate(record.dateDeck)}
            colors={colors}
          />

          <DisplayField
            label="Date Remarks"
            value={formatDate(record.dateRemarks)}
            colors={colors}
          />
        </FieldGrid>
      </VDSection>

      {/* 🔐 SECPA — hidden for QE, moved to Step 4 For Approval */}
      {!isQE && (
        <VDSection title="" colors={colors}>
          <FieldGrid>
            {field("SECPA", "secpa")}
            <DisplayField
              label="Expiry Date"
              value={formatDate(record.secpaExpDate)}
              colors={colors}
            />
            <DisplayField
              label="Issued On/ Issuence Date"
              value={formatDate(record.secpaIssuedOn)}
              colors={colors}
            />
          </FieldGrid>
        </VDSection>
      )}

      {/* 📤 Released Information — hidden for QE, moved to Step 4 For Approval */}
      {!isQE && (
        <VDSection title="📤 Released Information" colors={colors}>
          <FieldGrid>
            <DisplayField
              label="Type Doc Released"
              value={cleanValue(record.typeDocReleased)}
              colors={colors}
            />
            <DisplayField
              label="Atta Released"
              value={cleanValue(record.attaReleased)}
              colors={colors}
            />
            <DisplayField
              label="Date Released"
              value={formatDate(record.dateReleased)}
              colors={colors}
            />
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
