// components/tasks/viewdetails/steps/Step1FullDetails.jsx
import { useContext } from "react";
import {
  cleanValue,
  formatDate,
  calculateStatusTimeline,
} from "../config/helpers";
import { EDITABLE_FIELDS } from "../config/fields";
import { COUNTRIES } from "../config/constants";
import {
  ACCENT,
  ICON_CIRCLE_BG,
  Icons,
  statusTone,
  Notice,
  AccordionSection,
  LVGrid,
  RequiredBadge,
  LabelWidthContext,
} from "./StepUIKit";

/* ================================================================== */
/*  Universal editable label:value row                                  */
/*  type: "text" | "date" | "select" | "textarea" | "country"           */
/* ================================================================== */
function LVField({
  label,
  fieldKey,
  currentVal,
  originalVal,
  onChange,
  colors,
  wide = false,
  fullWidth = false,
  type = "text",
  options = null,
  isEditable = false,
  missing = false,
  applicable = true,
}) {
  const labelWidth = useContext(LabelWidthContext);
  const isDirty =
    isEditable && String(currentVal ?? "") !== String(originalVal ?? "");
  const isEmpty = !currentVal;

  const toInputDate = (val) => {
    if (!val || val === "N/A") return "";
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const borderColor =
    missing && applicable ? "#dc2626" : isDirty ? "#f59e0b" : colors.cardBorder;

  const baseInputStyle = {
    fontSize: "0.7rem",
    fontFamily: "inherit",
    color: colors.textPrimary,
    background: "transparent",
    outline: "none",
    border: "none",
    borderBottom: `1px dashed ${borderColor}`,
    padding: "0.05rem 0",
    width: "100%",
    boxSizing: "border-box",
  };

  const handleFocus = (e) => (e.currentTarget.style.borderBottomColor = ACCENT);
  const handleBlur = (e) =>
    (e.currentTarget.style.borderBottomColor = borderColor);

  return (
    <div
      style={{
        display: "flex",
        fontSize: "0.7rem",
        gap: "0.35rem",
        alignItems: wide ? "flex-start" : "center",
        gridColumn: fullWidth ? "1 / -1" : undefined,
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: `${labelWidth}px`,
          color: "#7a8190",
          paddingTop: wide ? "0.15rem" : 0,
        }}
      >
        {label}
        <RequiredBadge missing={missing} applicable={applicable} />
      </span>
      <span
        style={{
          color: "#7a8190",
          flexShrink: 0,
          paddingTop: wide ? "0.15rem" : 0,
        }}
      >
        :
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {!isEditable ? (
          <span
            style={{
              color: isEmpty ? colors.textTertiary : colors.textPrimary,
              fontStyle: isEmpty ? "italic" : "normal",
              fontWeight: 500,
              wordBreak: "break-word",
              whiteSpace: wide ? "pre-wrap" : "normal",
            }}
          >
            {isEmpty ? "N/A" : currentVal}
          </span>
        ) : type === "select" ? (
          <select
            value={currentVal || ""}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            style={{
              ...baseInputStyle,
              cursor: "pointer",
              colorScheme: "light",
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            <option value="" style={{ color: "#111827", background: "#fff" }}>
              — Select —
            </option>
            {options.map((opt) => (
              <option
                key={opt}
                value={opt}
                style={{ color: "#111827", background: "#fff" }}
              >
                {opt}
              </option>
            ))}
          </select>
        ) : type === "textarea" ? (
          <textarea
            value={currentVal || ""}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            rows={2}
            style={{
              ...baseInputStyle,
              border: `1px dashed ${borderColor}`,
              borderRadius: "5px",
              padding: "0.3rem 0.45rem",
              resize: "vertical",
              whiteSpace: "pre-wrap",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = ACCENT)}
            onBlur={(e) => (e.currentTarget.style.borderColor = borderColor)}
          />
        ) : type === "date" ? (
          <input
            type="date"
            value={toInputDate(currentVal)}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            style={baseInputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        ) : type === "country" ? (
          <select
            value={currentVal || ""}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            style={{
              ...baseInputStyle,
              cursor: "pointer",
              colorScheme: "light",
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            <option value="" style={{ color: "#111827", background: "#fff" }}>
              — Select country —
            </option>
            {currentVal && !COUNTRIES.includes(currentVal) && (
              <option
                value={currentVal}
                style={{ color: "#111827", background: "#fff" }}
              >
                {currentVal}
              </option>
            )}
            {COUNTRIES.map((c) => (
              <option
                key={c}
                value={c}
                style={{ color: "#111827", background: "#fff" }}
              >
                {c}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={currentVal || ""}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            style={baseInputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        )}
        {isDirty && (
          <div
            style={{
              fontSize: "0.6rem",
              color: "#b45309",
              fontStyle: "italic",
              marginTop: "0.15rem",
            }}
          >
            Modified · original:{" "}
            {type === "date"
              ? formatDate(originalVal) || "empty"
              : originalVal || "empty"}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Step 1 + Step 2 merged — All Details (view + inline edit)           */
/* ================================================================== */
export function Step1FullDetails({
  record,
  editedFields,
  onFieldChange,
  canEdit,
  colors,
  isQAAdmin = false,
  missingFields = [],
  onOpenDoctrack,
}) {
  const { status, days } = calculateStatusTimeline(record);
  const ok = status === "WITHIN";
  const isQE = record.applicationStep === "Quality Evaluation";
  const tone = statusTone(record.appStatus);

  const CONDITIONAL_COUNTRY_PARENTS = {
    prodManuCountry: "prodManu",
    prodTraderCountry: "prodTrader",
    prodImporterCountry: "prodImporter",
    prodDistriCountry: "prodDistri",
    prodRepackerCountry: "prodRepacker",
  };
  const isNAValue = (val) =>
    ["", "n/a", "na"].includes(
      String(val ?? "")
        .trim()
        .toLowerCase(),
    );
  const isCountryApplicable = (fieldKey) => {
    if (!(fieldKey in CONDITIONAL_COUNTRY_PARENTS)) return true;
    const parentKey = CONDITIONAL_COUNTRY_PARENTS[fieldKey];
    const parentVal =
      parentKey in editedFields
        ? editedFields[parentKey]
        : (record[parentKey] ?? "");
    return !isNAValue(parentVal);
  };

  const isMissing = (fieldKey) => isQAAdmin && missingFields.includes(fieldKey);

  const val = (fieldKey) =>
    fieldKey in editedFields
      ? editedFields[fieldKey]
      : (record[fieldKey] ?? "");

  /* Shorthand row renderer bound to record/editedFields/canEdit */
  const row = (label, fieldKey, opts = {}) => {
    const isEditable = canEdit && EDITABLE_FIELDS.includes(fieldKey);
    return (
      <LVField
        key={fieldKey}
        label={label}
        fieldKey={fieldKey}
        currentVal={val(fieldKey)}
        originalVal={record[fieldKey] ?? ""}
        onChange={onFieldChange}
        colors={colors}
        isEditable={isEditable}
        missing={isMissing(fieldKey)}
        applicable={isCountryApplicable(fieldKey)}
        {...opts}
      />
    );
  };

  const entityGuide = isQAAdmin ? (
    <Notice tone="info">
      If this entity does not apply, enter <strong>N/A</strong> in the name
      field — the <strong>Country</strong> field will no longer be required.
    </Notice>
  ) : null;

  const companySections = [
    {
      title: "Manufacturer",
      fields: {
        name: "prodManu",
        country: "prodManuCountry",
        lto: "prodManuLtoNo",
        tin: "prodManuTin",
        add: "prodManuAdd",
      },
    },
    {
      title: "Trader",
      fields: {
        name: "prodTrader",
        country: "prodTraderCountry",
        lto: "prodTraderLtoNo",
        tin: "prodTraderTin",
        add: "prodTraderAdd",
      },
    },
    {
      title: "Importer",
      fields: {
        name: "prodImporter",
        country: "prodImporterCountry",
        lto: "prodImporterLtoNo",
        tin: "prodImporterTin",
        add: "prodImporterAdd",
      },
    },
    {
      title: "Distributor",
      fields: {
        name: "prodDistri",
        country: "prodDistriCountry",
        lto: "prodDistriLtoNo",
        tin: "prodDistriTin",
        add: "prodDistriAdd",
      },
    },
    {
      title: "Repacker",
      fields: {
        name: "prodRepacker",
        country: "prodRepackerCountry",
        lto: "prodRepackerLtoNo",
        tin: "prodRepackerTin",
        add: "prodRepackerAdd",
      },
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
      {isQAAdmin && (
        <Notice tone={missingFields.length > 0 ? "error" : "ok"}>
          {missingFields.length > 0 ? (
            <>
              <strong>
                {missingFields.length} required field
                {missingFields.length !== 1 ? "s" : ""} missing
              </strong>{" "}
              — fill all required fields before this application can proceed.
            </>
          ) : (
            <strong>All required fields are complete.</strong>
          )}
        </Notice>
      )}

      {/* Status bar */}
      <div
        style={{
          padding: "0.75rem 0.9rem",
          background: colors.inputBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "2rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.62rem",
              color: colors.textTertiary,
              marginBottom: "0.3rem",
            }}
          >
            Document Tracking No.
          </div>
          <div
            onClick={() => onOpenDoctrack?.(record)}
            style={{
              fontSize: "0.85rem",
              fontWeight: "800",
              color: ACCENT,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {cleanValue(record.dtn)}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: "0.62rem",
              color: colors.textTertiary,
              marginBottom: "0.3rem",
            }}
          >
            Old RSN / Other DTN
          </div>
          <div
            onClick={() =>
              record.oldRsn && cleanValue(record.oldRsn) !== "N/A"
                ? onOpenDoctrack?.({ ...record, dtn: record.oldRsn })
                : undefined
            }
            style={{
              fontSize: "0.85rem",
              fontWeight: "600",
              color:
                record.oldRsn && cleanValue(record.oldRsn) !== "N/A"
                  ? ACCENT
                  : colors.textPrimary,
              cursor:
                record.oldRsn && cleanValue(record.oldRsn) !== "N/A"
                  ? "pointer"
                  : "default",
              textDecoration:
                record.oldRsn && cleanValue(record.oldRsn) !== "N/A"
                  ? "underline"
                  : "none",
            }}
          >
            {cleanValue(record.oldRsn)}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: "0.62rem",
              color: colors.textTertiary,
              marginBottom: "0.3rem",
            }}
          >
            Status
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.2rem 0.6rem",
              background: tone.bg,
              color: tone.color,
              borderRadius: "999px",
              fontSize: "0.65rem",
              fontWeight: "700",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: tone.dot,
                display: "inline-block",
              }}
            />
            {cleanValue(record.appStatus)}
          </span>
        </div>

        {record.dbTimelineCitizenCharter && (
          <div>
            <div
              style={{
                fontSize: "0.62rem",
                color: colors.textTertiary,
                marginBottom: "0.3rem",
              }}
            >
              Timeline
            </div>
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: "700",
                color: colors.textPrimary,
              }}
            >
              {cleanValue(record.dbTimelineCitizenCharter)} working days
            </div>
          </div>
        )}

        {status && (
          <div>
            <div
              style={{
                fontSize: "0.62rem",
                color: colors.textTertiary,
                marginBottom: "0.3rem",
              }}
            >
              Aging
            </div>
            <span
              style={{
                padding: "0.2rem 0.6rem",
                background: ok ? "#dcfce7" : "#fee2e2",
                color: ok ? "#16a34a" : "#dc2626",
                borderRadius: "999px",
                fontSize: "0.65rem",
                fontWeight: "700",
              }}
            >
              {ok ? `Within (${days}d)` : `Beyond (${days}d)`}
            </span>
          </div>
        )}
      </div>

      {/* Two-column layout: left = Establishment/Product/Fees/Companies (60%),
          right = Application Info/SECPA/Released/CPR/Amendments/Remarks (40%) */}
      <style>{`
        .s1fd-two-col { display: flex; gap: 0.75rem; align-items: flex-start; flex-wrap: nowrap; }
        .s1fd-col-left, .s1fd-col-right { min-width: 0; display: flex; flex-direction: column; }
        .s1fd-col-left { flex: 1 1 60%; }
        .s1fd-col-right { flex: 0 0 40%; }
        @media (max-width: 760px) {
          .s1fd-two-col { flex-direction: column; }
          .s1fd-col-left, .s1fd-col-right { flex: 1 1 100%; width: 100%; }
          .s1fd-lv-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="s1fd-two-col">
        <div className="s1fd-col-left">
          {/* Establishment Information */}
          <AccordionSection
            icon={Icons.info}
            title="Establishment Information"
            colors={colors}
            labelWidth={140}
          >
            <LVGrid>
              {row("Category", "estCat", {
                wide: true,
                fullWidth: true,
              })}

              {row("LTO Number", "ltoNo")}
              {row("LTO Validity", "validity", { type: "date" })}
              {row("Company", "ltoCompany", { fullWidth: true })}
              {row("Address", "ltoAdd", {
                wide: true,
                fullWidth: true,
                type: "textarea",
              })}
              {row("Email Address", "eadd")}
              {row("TIN Number", "tin")}
              {row("Contact Number", "contactNo")}
            </LVGrid>
          </AccordionSection>

          {/* Product Details */}
          <AccordionSection
            icon={Icons.pill}
            title="Product Details"
            colors={colors}
            labelWidth={140}
          >
            <LVGrid>
              {row("Brand Name", "prodBrName")}
              {row("Generic Name", "prodGenName")}
              {row("Dosage Strength", "prodDosStr")}
              {row("Dosage Form", "prodDosForm")}
              {row("Classification", "prodClassPrescript")}
              {row("Essential Drug", "prodEssDrugList")}
              {row("Shelf Life", "prodDistriShelfLife")}
              {row("Pharma Category", "prodPharmaCat")}
              {row("Product Category", "prodCat")}
              {row("File", "file")}
              {row("Storage Condition", "storageCond", {
                wide: true,
                fullWidth: true,
                type: "textarea",
              })}
              {row("Packaging", "packaging", {
                wide: true,
                fullWidth: true,
                type: "textarea",
              })}
              {row("Suggested Retail Price", "suggRp")}
              {row("No. of Samples", "noSample")}
            </LVGrid>
          </AccordionSection>

          {/* Fees */}
          <AccordionSection
            icon={Icons.cash}
            title="Fees"
            colors={colors}
            labelWidth={80}
          >
            <LVGrid>
              {row("Fee", "fee")}
              {row("LRF", "lrf")}
              {row("SURC", "surc")}
              {row("Total", "total")}
              {row("OR No.", "orNo")}
              {row("Date Issued", "dateIssued", { type: "date" })}
            </LVGrid>
          </AccordionSection>

          {/* Manufacturer / Trader / Importer / Distributor / Repacker */}
          {companySections.map(({ title, fields }) => (
            <AccordionSection
              key={title}
              icon={Icons.company}
              title={title}
              colors={colors}
              labelWidth={90}
            >
              {entityGuide}
              <LVGrid cols={2}>
                {row(title, fields.name)}
                {row("Country", fields.country, { type: "country" })}
                {row("LTO No.", fields.lto)}
                {row("TIN", fields.tin)}
              </LVGrid>
              {row("Address", fields.add, { wide: true, type: "textarea" })}
            </AccordionSection>
          ))}
        </div>
        <div className="s1fd-col-right">
          {/* Application Information (from Step 2) */}
          <AccordionSection
            icon={Icons.hash}
            title="Application Information"
            colors={colors}
            labelWidth={140}
          >
            {!isQE && row("Registration No.", "regNo")}
            {row("Processing Type", "processingType")}
            {row("Date Received FDAC", "dateReceivedFdac", { type: "date" })}
            {row("Date Received Central", "dateReceivedCent", {
              type: "date",
            })}

            {row("Application Type", "appType")}
            {row("Mother App Type", "motherAppType")}
            {row("Old RSN", "oldRsn")}
            {row("Certification", "certification")}
            {row("Class", "class")}
            {row("MO", "mo")}
          </AccordionSection>

          {/* SECPA — hidden for QE */}
          {!isQE && (
            <AccordionSection
              icon={Icons.shield}
              title="SECPA"
              colors={colors}
              labelWidth={170}
            >
              {row("SECPA", "secpa")}
              {row("Expiry Date", "secpaExpDate", { type: "date" })}
              {row("Issued On / Issuance Date", "secpaIssuedOn", {
                type: "date",
              })}
            </AccordionSection>
          )}

          {/* Released Information — hidden for QE */}
          {!isQE && (
            <AccordionSection
              icon={Icons.check}
              title="Released Information"
              colors={colors}
              labelWidth={170}
            >
              {row("Type Doc Released", "typeDocReleased", {
                type: "select",
                options: [
                  "CPR",
                  "LOD",
                  "Certificate",
                  "Letter",
                  "COPP",
                  "CFS",
                  "GLE",
                  "Letter for non acceptance",
                  "Product classification",
                  "Letter (Withdrawal)",
                  "Letter (Re-routed)",
                ],
              })}
              {row("Atta Released", "attaReleased")}
              {row("Date Released by CDRR", "dateReleased", { type: "date" })}
            </AccordionSection>
          )}

          {/* CPR Conditions — hidden for QE */}
          {!isQE && (
            <AccordionSection
              icon={Icons.info}
              title="CPR Conditions"
              colors={colors}
              labelWidth={170}
            >
              {row("CPR Condition", "cprCond", {
                wide: true,
                type: "textarea",
              })}
              {row("CPR Condition Remarks", "cprCondRemarks", {
                wide: true,
                type: "textarea",
              })}
              {row("CPR Condition Additional Remarks", "cprCondAddRemarks", {
                wide: true,
                type: "textarea",
              })}
            </AccordionSection>
          )}

          {/* Amendments */}
          <AccordionSection
            icon={Icons.edit}
            title="Amendments"
            colors={colors}
            labelWidth={110}
          >
            {row("Amendment 1", "ammend1")}
            {row("Amendment 2", "ammend2")}
            {row("Amendment 3", "ammend3")}
          </AccordionSection>

          {/* Remarks & Notes */}
          <AccordionSection
            icon={Icons.edit}
            title="Remarks & Notes"
            colors={colors}
            labelWidth={150}
          >
            {row("Application Remarks", "appRemarks", {
              wide: true,
              type: "textarea",
            })}
            {row("General Remarks", "remarks1", {
              wide: true,
              type: "textarea",
            })}
          </AccordionSection>
        </div>
      </div>
    </div>
  );
}
