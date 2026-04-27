import { SZ } from "../config/constants";
import {
  cleanValue,
  formatDate,
  calculateStatusTimeline,
} from "../config/helpers";
import { EDITABLE_FIELDS } from "../config/fields";
import {
  VDSection,
  FieldGrid,
  DisplayField,
  EditableField,
  SummaryCard,
  CountrySelect,
} from "../components/BaseFields";

export function Step1BasicInfo({
  record,
  editedFields,
  onFieldChange,
  canEdit,
  colors,
}) {
  const { status, days } = calculateStatusTimeline(record);
  const ok = status === "WITHIN";

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

  const summaryField = (icon, label, fieldKey, accent, fullWidth = false) => {
    const isEditable = canEdit && EDITABLE_FIELDS.includes(fieldKey);
    const currentVal =
      fieldKey in editedFields
        ? editedFields[fieldKey]
        : (record[fieldKey] ?? "");
    const originalVal = record[fieldKey] ?? "";
    const isDirty = String(currentVal ?? "") !== String(originalVal ?? "");
    const containerStyle = {
      ...(fullWidth ? { gridColumn: "1 / -1" } : {}),
      padding: "0.5rem 0.65rem",
      background: colors.inputBg,
      border: `1px solid ${isDirty ? "#f59e0b" : colors.inputBorder}`,
      borderLeft: `3px solid ${isDirty ? "#f59e0b" : accent}`,
      borderRadius: "6px",
      display: "flex",
      flexDirection: "column",
      gap: "0.2rem",
    };
    if (isEditable) {
      return (
        <div key={fieldKey} style={containerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
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
            {isDirty && (
              <span
                style={{
                  fontSize: "0.55rem",
                  fontWeight: "700",
                  color: "#f59e0b",
                  background: "rgba(245,158,11,0.12)",
                  padding: "0.08rem 0.3rem",
                  borderRadius: "3px",
                }}
              >
                ✎ EDITED
              </span>
            )}
          </div>
          <input
            type="text"
            value={currentVal ?? ""}
            onChange={(e) => onFieldChange(fieldKey, e.target.value)}
            style={{
              width: "100%",
              padding: "0.25rem 0.4rem",
              background: "transparent",
              border: `1px solid ${isDirty ? "#f59e0b" : colors.cardBorder}`,
              borderRadius: "4px",
              color: colors.textPrimary,
              fontSize: "0.78rem",
              fontWeight: "600",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = isDirty ? "#f59e0b" : "#2196F3";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = isDirty
                ? "#f59e0b"
                : colors.cardBorder;
            }}
          />
          {isDirty && (
            <div
              style={{
                fontSize: "0.6rem",
                color: colors.textTertiary,
                display: "flex",
                gap: "0.25rem",
              }}
            >
              <span style={{ color: "#ef4444", flexShrink: 0 }}>Original:</span>
              <span style={{ fontStyle: "italic", wordBreak: "break-word" }}>
                {originalVal || <em>empty</em>}
              </span>
            </div>
          )}
        </div>
      );
    }
    return (
      <div key={fieldKey} style={fullWidth ? { gridColumn: "1 / -1" } : {}}>
        <SummaryCard
          icon={icon}
          label={label}
          value={cleanValue(record[fieldKey])}
          accent={accent}
          colors={colors}
        />
      </div>
    );
  };

  const dateSummaryField = (icon, label, fieldKey, accent) => {
    const isEditable = canEdit && EDITABLE_FIELDS.includes(fieldKey);
    const currentVal =
      fieldKey in editedFields
        ? editedFields[fieldKey]
        : (record[fieldKey] ?? "");
    const originalVal = record[fieldKey] ?? "";
    const isDirty = String(currentVal ?? "") !== String(originalVal ?? "");
    const toInputDate = (val) => {
      if (!val || val === "N/A") return "";
      try {
        const d = new Date(val);
        return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
      } catch {
        return "";
      }
    };
    if (isEditable) {
      return (
        <div
          key={fieldKey}
          style={{
            padding: "0.5rem 0.65rem",
            background: colors.inputBg,
            border: `1px solid ${isDirty ? "#f59e0b" : colors.inputBorder}`,
            borderLeft: `3px solid ${isDirty ? "#f59e0b" : accent}`,
            borderRadius: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "0.2rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
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
            {isDirty && (
              <span
                style={{
                  fontSize: "0.55rem",
                  fontWeight: "700",
                  color: "#f59e0b",
                  background: "rgba(245,158,11,0.12)",
                  padding: "0.08rem 0.3rem",
                  borderRadius: "3px",
                }}
              >
                ✎ EDITED
              </span>
            )}
          </div>
          <input
            type="date"
            value={toInputDate(currentVal)}
            onChange={(e) => onFieldChange(fieldKey, e.target.value)}
            style={{
              width: "100%",
              padding: "0.25rem 0.4rem",
              background: "transparent",
              border: `1px solid ${isDirty ? "#f59e0b" : colors.cardBorder}`,
              borderRadius: "4px",
              color: colors.textPrimary,
              fontSize: "0.78rem",
              fontWeight: "600",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = isDirty ? "#f59e0b" : "#2196F3";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = isDirty
                ? "#f59e0b"
                : colors.cardBorder;
            }}
          />
          {isDirty && (
            <div
              style={{
                fontSize: "0.6rem",
                color: colors.textTertiary,
                display: "flex",
                gap: "0.25rem",
              }}
            >
              <span style={{ color: "#ef4444", flexShrink: 0 }}>Original:</span>
              <span style={{ fontStyle: "italic" }}>
                {originalVal ? formatDate(originalVal) : <em>empty</em>}
              </span>
            </div>
          )}
        </div>
      );
    }
    return (
      <SummaryCard
        key={fieldKey}
        icon={icon}
        label={label}
        value={formatDate(record[fieldKey])}
        accent={accent}
        colors={colors}
      />
    );
  };

  const countryField = (label, fieldKey) => {
    const isEditable = canEdit && EDITABLE_FIELDS.includes(fieldKey);
    const currentVal =
      fieldKey in editedFields
        ? editedFields[fieldKey]
        : (record[fieldKey] ?? "");
    const originalVal = record[fieldKey] ?? "";
    if (isEditable) {
      return (
        <CountrySelect
          key={fieldKey}
          label={label}
          fieldKey={fieldKey}
          value={currentVal}
          originalValue={originalVal}
          onChange={onFieldChange}
          colors={colors}
        />
      );
    }
    return (
      <DisplayField
        key={fieldKey}
        label={label}
        value={cleanValue(record[fieldKey])}
        colors={colors}
      />
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      {canEdit && (
        <div
          style={{
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
            <strong>Edit Mode Active</strong> — Orange fields have been
            modified. Changes save on Step 4 submit.
          </span>
        </div>
      )}

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
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: "800",
              color: colors.textPrimary,
              letterSpacing: "-0.02em",
            }}
          >
            {cleanValue(record.dtn)}
          </div>
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
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.25rem 0.65rem",
              background: (() => {
                const s = record.appStatus?.toUpperCase();
                if (s === "COMPLETED" || s === "APPROVED")
                  return "linear-gradient(135deg,#10b981,#059669)";
                if (s === "PENDING")
                  return "linear-gradient(135deg,#eab308,#ca8a04)";
                if (s === "REJECTED")
                  return "linear-gradient(135deg,#ef4444,#dc2626)";
                return "linear-gradient(135deg,#6b7280,#4b5563)";
              })(),
              color: "#fff",
              borderRadius: "6px",
              fontSize: "0.72rem",
              fontWeight: "700",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            }}
          >
            {cleanValue(record.appStatus)}
          </div>
        </div>
        {record.dbTimelineCitizenCharter && (
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
              {cleanValue(record.dbTimelineCitizenCharter)}
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
        {status && (
          <span
            style={{
              padding: "0.3rem 0.75rem",
              background: ok
                ? "linear-gradient(135deg,#10b981,#059669)"
                : "linear-gradient(135deg,#ef4444,#dc2626)",
              color: "#fff",
              borderRadius: "6px",
              fontSize: "0.65rem",
              fontWeight: "700",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              boxShadow: ok
                ? "0 2px 6px rgba(16,185,129,.3)"
                : "0 2px 6px rgba(239,68,68,.3)",
            }}
          >
            {ok ? "✓" : "⚠"} {ok ? `Within (${days}d)` : `Beyond (${days}d)`}
          </span>
        )}
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "0.5rem",
        }}
      >
        {summaryField("⚙️", "Processing Type", "processingType", "#005cd4")}
        {summaryField("🗂️", "Category", "estCat", "#fbff00")}
        {summaryField("📋", "Application Type", "appType", "#ff1547")}
        {summaryField("🏢", "LTO Company", "ltoCompany", "#0fff2f", true)}
        {summaryField("📍", "LTO Address", "ltoAdd", "#ff950a", true)}
        {summaryField("📧", "Email Address", "eadd", "#fa3a93")}
        {summaryField("🪪", "TIN Number", "tin", "#ca44ff")}
        {summaryField("📞", "Contact Number", "contactNo", "#00f18d", true)}
        {summaryField("🔑", "LTO Number", "ltoNo", "#781192")}
        {dateSummaryField("📅", "LTO Validity", "validity", "#607d8b")}
        <SummaryCard
          icon="📅"
          label="Date Received Central"
          value={formatDate(record.dateReceivedCent)}
          accent="#607d8b"
          colors={colors}
        />
        <SummaryCard
          icon="📅"
          label="Date Received FDAC"
          value={formatDate(record.dateReceivedFdac)}
          accent="#0b5b83"
          colors={colors}
        />

        {/* <SummaryCard
          icon="📅"
          label="Date Released"
          value={formatDate(record.dateReleased)}
          accent="#607d8b"
          colors={colors}
        /> */}
      </div>

      {/* Product Details */}
      <VDSection title="💊 Product Details" colors={colors}>
        <FieldGrid>
          {field("Brand Name", "prodBrName")}
          {field("Generic Name", "prodGenName")}
          {field("Dosage Strength", "prodDosStr")}
          {field("Dosage Form", "prodDosForm")}
          {field("Classification", "prodClassPrescript")}
          {field("Essential Drug", "prodEssDrugList")}
          {field("Shelf Life", "prodDistriShelfLife")}
          {field("Pharma Category", "prodPharmaCat")}
          {field("Product Category", "prodCat")}
          {/* {field("Pharma Prod. Cat.", "pharmaProdCat")} */}
          {/* {field("Pharma Prod. Label", "pharmaProdCatLabel")} */}
          {field("File", "file")}
        </FieldGrid>
      </VDSection>
      <VDSection title="📦 Storage & Packaging" colors={colors}>
        <FieldGrid>
          {field("Storage Condition", "storageCond")}
          {field("Packaging", "packaging")}
          {field("Suggested Retail Price", "suggRp")}
          {field("No. of Samples", "noSample")}
          {/* {field("Expiry Date", "expiryDate")} */}
        </FieldGrid>
      </VDSection>

      <VDSection title="💰 Fees" colors={colors}>
        <FieldGrid>
          {field("Fee", "fee")}
          {field("LRF", "lrf")}
          {field("SURC", "surc")}
          {field("Total", "total")}
          {field("OR No.", "orNo")}
          <div>
            <div
              style={{
                fontSize: "0.65rem",
                fontWeight: "700",
                color: colors.textTertiary,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "0.3rem",
              }}
            >
              Date Issued
            </div>
            <input
              type="date"
              value={
                "dateIssued" in editedFields
                  ? editedFields.dateIssued
                  : (() => {
                      if (!record.dateIssued) return "";
                      try {
                        const d = new Date(record.dateIssued);
                        return isNaN(d.getTime())
                          ? ""
                          : d.toISOString().split("T")[0];
                      } catch {
                        return "";
                      }
                    })()
              }
              onChange={(e) => onFieldChange("dateIssued", e.target.value)}
              style={{
                width: "100%",
                padding: "0.4rem 0.6rem",
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "6px",
                color: colors.textPrimary,
                fontSize: "0.8rem",
                outline: "none",
                boxSizing: "border-box",
                cursor: "pointer",
              }}
            />
          </div>
        </FieldGrid>
      </VDSection>

      <VDSection title="🏭 Manufacturer" colors={colors}>
        <FieldGrid>
          {field("Manufacturer", "prodManu")}
          {countryField("Country", "prodManuCountry")}
          {field("LTO No.", "prodManuLtoNo")}
          {field("TIN", "prodManuTin")}
          {field("Address", "prodManuAdd", {
            fullWidth: true,
            multiline: true,
          })}
        </FieldGrid>
      </VDSection>

      <VDSection title="🤝 Trader" colors={colors}>
        <FieldGrid>
          {field("Trader", "prodTrader")}
          {countryField("Country", "prodTraderCountry")}
          {field("LTO No.", "prodTraderLtoNo")}
          {field("TIN", "prodTraderTin")}
          {field("Address", "prodTraderAdd", {
            fullWidth: true,
            multiline: true,
          })}
        </FieldGrid>
      </VDSection>

      <VDSection title="🚢 Importer" colors={colors}>
        <FieldGrid>
          {field("Importer", "prodImporter")}
          {countryField("Country", "prodImporterCountry")}
          {field("LTO No.", "prodImporterLtoNo")}
          {field("TIN", "prodImporterTin")}
          {field("Address", "prodImporterAdd", {
            fullWidth: true,
            multiline: true,
          })}
        </FieldGrid>
      </VDSection>

      <VDSection title="📦 Distributor" colors={colors}>
        <FieldGrid>
          {field("Distributor", "prodDistri")}
          {countryField("Country", "prodDistriCountry")}
          {field("LTO No.", "prodDistriLtoNo")}
          {field("TIN", "prodDistriTin")}
          {field("Address", "prodDistriAdd", {
            fullWidth: true,
            multiline: true,
          })}
        </FieldGrid>
      </VDSection>

      <VDSection title="🔄 Repacker" colors={colors}>
        <FieldGrid>
          {field("Repacker", "prodRepacker")}
          {countryField("Country", "prodRepackerCountry")}
          {field("LTO No.", "prodRepackerLtoNo")}
          {field("TIN", "prodRepackerTin")}
          {field("Address", "prodRepackerAdd", {
            fullWidth: true,
            multiline: true,
          })}
        </FieldGrid>
      </VDSection>
    </div>
  );
}
