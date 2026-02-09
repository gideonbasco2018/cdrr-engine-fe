// FILE: src/components/reports/actions/ViewDetailsModal.jsx
// ✅ SIMPLE CLEAN DESIGN: Matches EditRecordModal style exactly

import { useState } from "react";

// ✅ Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString || dateString === "N/A" || dateString === null) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

// ✅ Helper function to clean display values
const cleanValue = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "N/A"
  ) {
    return "N/A";
  }
  return String(value);
};

// ✅ Function to calculate status timeline
const calculateStatusTimeline = (record) => {
  const dateReceivedCent = record.dateReceivedCent;
  const dateReleased = record.dateReleased;
  const timeline = record.dbTimelineCitizenCharter;

  if (
    !dateReceivedCent ||
    !timeline ||
    dateReceivedCent === "N/A" ||
    timeline === null
  ) {
    return { status: "", days: 0 };
  }

  const receivedDate = new Date(dateReceivedCent);
  const endDate =
    dateReleased && dateReleased !== "N/A"
      ? new Date(dateReleased)
      : new Date();

  if (isNaN(receivedDate.getTime()) || isNaN(endDate.getTime())) {
    return { status: "", days: 0 };
  }

  const diffTime = Math.abs(endDate - receivedDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const timelineValue = parseInt(timeline, 10);

  if (diffDays <= timelineValue) {
    return { status: "WITHIN", days: diffDays };
  } else {
    return { status: "BEYOND", days: diffDays };
  }
};

function ViewDetailsModal({ record, onClose, colors, darkMode }) {
  if (!record) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "2rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "16px",
          maxWidth: "1400px",
          width: "100%",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.5rem 2rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                color: colors.textPrimary,
                margin: 0,
                marginBottom: "0.25rem",
              }}
            >
              👁️ View Record Details
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: colors.textTertiary,
                margin: 0,
              }}
            >
              ID: {record.id} • DTN: {cleanValue(record.dtn)} • Brand:{" "}
              {cleanValue(record.prodBrName)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              color: colors.textSecondary,
              cursor: "pointer",
              padding: "0.5rem",
              borderRadius: "8px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = darkMode
                ? "#1f1f1f"
                : "#f0f0f0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "2rem",
          }}
        >
          {/* Establishment Information */}
          <Section title="🏢 Establishment Information" colors={colors}>
            <FieldGrid>
              <DisplayField
                label="Category"
                value={cleanValue(record.estCat)}
                colors={colors}
              />
              <DisplayField
                label="LTO Company"
                value={cleanValue(record.ltoComp)}
                colors={colors}
              />
              <DisplayField
                label="LTO Address"
                value={cleanValue(record.ltoAdd)}
                colors={colors}
              />
              <DisplayField
                label="Email"
                value={cleanValue(record.eadd)}
                colors={colors}
              />
              <DisplayField
                label="TIN"
                value={cleanValue(record.tin)}
                colors={colors}
              />
              <DisplayField
                label="Contact No."
                value={cleanValue(record.contactNo)}
                colors={colors}
              />
              <DisplayField
                label="LTO No."
                value={cleanValue(record.ltoNo)}
                colors={colors}
              />
              <DisplayField
                label="Validity"
                value={formatDate(record.validity)}
                colors={colors}
              />
            </FieldGrid>
          </Section>

          {/* Product Information */}
          <Section title="💊 Product Information" colors={colors}>
            <FieldGrid>
              <DisplayField
                label="Brand Name"
                value={cleanValue(record.prodBrName)}
                colors={colors}
              />
              <DisplayField
                label="Generic Name"
                value={cleanValue(record.prodGenName)}
                colors={colors}
              />
              <DisplayField
                label="Dosage Strength"
                value={cleanValue(record.prodDosStr)}
                colors={colors}
              />
              <DisplayField
                label="Dosage Form"
                value={cleanValue(record.prodDosForm)}
                colors={colors}
              />
              <DisplayField
                label="Prescription"
                value={cleanValue(record.prodClassPrescript)}
                colors={colors}
              />
              <DisplayField
                label="Essential Drug"
                value={cleanValue(record.prodEssDrugList)}
                colors={colors}
              />
              <DisplayField
                label="Pharma Category"
                value={cleanValue(record.prodPharmaCat)}
                colors={colors}
              />
              <DisplayField
                label="Product Category"
                value={cleanValue(record.prodCat)}
                colors={colors}
              />
            </FieldGrid>
          </Section>

          {/* Manufacturer Information */}
          <Section title="🏭 Manufacturer Information" colors={colors}>
            <FieldGrid>
              <DisplayField
                label="Manufacturer"
                value={cleanValue(record.prodManu)}
                colors={colors}
              />
              <DisplayField
                label="Manufacturer Address"
                value={cleanValue(record.prodManuAdd)}
                colors={colors}
              />
              <DisplayField
                label="Manufacturer TIN"
                value={cleanValue(record.prodManuTin)}
                colors={colors}
              />
              <DisplayField
                label="Manufacturer LTO No."
                value={cleanValue(record.prodManuLtoNo)}
                colors={colors}
              />
              <DisplayField
                label="Manufacturer Country"
                value={cleanValue(record.prodManuCountry)}
                colors={colors}
              />
            </FieldGrid>
          </Section>

          {/* Trader Information */}
          <Section title="🚢 Trader Information" colors={colors}>
            <FieldGrid>
              <DisplayField
                label="Trader"
                value={cleanValue(record.prodTrader)}
                colors={colors}
              />
              <DisplayField
                label="Trader Address"
                value={cleanValue(record.prodTraderAdd)}
                colors={colors}
              />
              <DisplayField
                label="Trader TIN"
                value={cleanValue(record.prodTraderTin)}
                colors={colors}
              />
              <DisplayField
                label="Trader LTO No."
                value={cleanValue(record.prodTraderLtoNo)}
                colors={colors}
              />
              <DisplayField
                label="Trader Country"
                value={cleanValue(record.prodTraderCountry)}
                colors={colors}
              />
            </FieldGrid>
          </Section>

          {/* Repacker Information */}
          <Section title="📦 Repacker Information" colors={colors}>
            <FieldGrid>
              <DisplayField
                label="Repacker"
                value={cleanValue(record.prodRepacker)}
                colors={colors}
              />
              <DisplayField
                label="Repacker Address"
                value={cleanValue(record.prodRepackerAdd)}
                colors={colors}
              />
              <DisplayField
                label="Repacker TIN"
                value={cleanValue(record.prodRepackerTin)}
                colors={colors}
              />
              <DisplayField
                label="Repacker LTO No."
                value={cleanValue(record.prodRepackerLtoNo)}
                colors={colors}
              />
              <DisplayField
                label="Repacker Country"
                value={cleanValue(record.prodRepackerCountry)}
                colors={colors}
              />
            </FieldGrid>
          </Section>

          {/* Importer Information */}
          <Section title="✈️ Importer Information" colors={colors}>
            <FieldGrid>
              <DisplayField
                label="Importer"
                value={cleanValue(record.prodImporter)}
                colors={colors}
              />
              <DisplayField
                label="Importer Address"
                value={cleanValue(record.prodImporterAdd)}
                colors={colors}
              />
              <DisplayField
                label="Importer TIN"
                value={cleanValue(record.prodImporterTin)}
                colors={colors}
              />
              <DisplayField
                label="Importer LTO No."
                value={cleanValue(record.prodImporterLtoNo)}
                colors={colors}
              />
              <DisplayField
                label="Importer Country"
                value={cleanValue(record.prodImporterCountry)}
                colors={colors}
              />
            </FieldGrid>
          </Section>

          {/* Distributor Information */}
          <Section title="🚚 Distributor Information" colors={colors}>
            <FieldGrid>
              <DisplayField
                label="Distributor"
                value={cleanValue(record.prodDistri)}
                colors={colors}
              />
              <DisplayField
                label="Distributor Address"
                value={cleanValue(record.prodDistriAdd)}
                colors={colors}
              />
              <DisplayField
                label="Distributor TIN"
                value={cleanValue(record.prodDistriTin)}
                colors={colors}
              />
              <DisplayField
                label="Distributor LTO No."
                value={cleanValue(record.prodDistriLtoNo)}
                colors={colors}
              />
              <DisplayField
                label="Distributor Country"
                value={cleanValue(record.prodDistriCountry)}
                colors={colors}
              />
              <DisplayField
                label="Shelf Life"
                value={cleanValue(record.prodDistriShelfLife)}
                colors={colors}
              />
            </FieldGrid>
          </Section>

          {/* Storage & Packaging */}
          <Section title="📦 Storage & Packaging" colors={colors}>
            <FieldGrid>
              <DisplayField
                label="Storage Condition"
                value={cleanValue(record.storageCond)}
                colors={colors}
              />
              <DisplayField
                label="Packaging"
                value={cleanValue(record.packaging)}
                colors={colors}
              />
              <DisplayField
                label="Suggested RP"
                value={cleanValue(record.suggRp)}
                colors={colors}
              />
              <DisplayField
                label="No. of Samples"
                value={cleanValue(record.noSample)}
                colors={colors}
              />
            </FieldGrid>
          </Section>

          {/* Application Information */}
          <Section title="📋 Application Information" colors={colors}>
            <FieldGrid>
              <DisplayField
                label="DTN"
                value={cleanValue(record.dtn)}
                colors={colors}
              />
              <DisplayField
                label="Registration No."
                value={cleanValue(record.regNo)}
                colors={colors}
              />
              <DisplayField
                label="Application Type"
                value={cleanValue(record.appType)}
                colors={colors}
              />
              <DisplayField
                label="Mother App Type"
                value={cleanValue(record.motherAppType)}
                colors={colors}
              />
              <DisplayField
                label="Old RSN"
                value={cleanValue(record.oldRsn)}
                colors={colors}
              />
              <DisplayField
                label="Certification"
                value={cleanValue(record.certification)}
                colors={colors}
              />
              <DisplayField
                label="Class"
                value={cleanValue(record.class)}
                colors={colors}
              />
              <DisplayField
                label="Application Status"
                value={cleanValue(record.appStatus)}
                colors={colors}
              />
            </FieldGrid>
          </Section>

          {/* Amendment Fields */}
          <Section title="📝 Amendments" colors={colors}>
            <FieldGrid>
              <DisplayField
                label="Amendment 1"
                value={cleanValue(record.ammend1)}
                colors={colors}
              />
              <DisplayField
                label="Amendment 2"
                value={cleanValue(record.ammend2)}
                colors={colors}
              />
              <DisplayField
                label="Amendment 3"
                value={cleanValue(record.ammend3)}
                colors={colors}
              />
            </FieldGrid>
          </Section>

          {/* Fees */}
          <Section title="💰 Fees" colors={colors}>
            <FieldGrid>
              <DisplayField
                label="Fee"
                value={cleanValue(record.fee)}
                colors={colors}
              />
              <DisplayField
                label="LRF"
                value={cleanValue(record.lrf)}
                colors={colors}
              />
              <DisplayField
                label="SURC"
                value={cleanValue(record.surc)}
                colors={colors}
              />
              <DisplayField
                label="Total"
                value={cleanValue(record.total)}
                colors={colors}
              />
              <DisplayField
                label="OR No."
                value={cleanValue(record.orNo)}
                colors={colors}
              />
            </FieldGrid>
          </Section>

          {/* Important Dates */}
          <Section title="📅 Important Dates" colors={colors}>
            <FieldGrid>
              <DisplayField
                label="Date Issued"
                value={formatDate(record.dateIssued)}
                colors={colors}
              />
              <DisplayField
                label="Date Received FDAC"
                value={formatDate(record.dateReceivedFdac)}
                colors={colors}
              />
              <DisplayField
                label="Date Received Central"
                value={formatDate(record.dateReceivedCent)}
                colors={colors}
              />
              <DisplayField
                label="Date Deck"
                value={formatDate(record.dateDeck)}
                colors={colors}
              />
              <DisplayField
                label="Date Released"
                value={formatDate(record.dateReleased)}
                colors={colors}
              />
              <DisplayField
                label="Expiry Date"
                value={formatDate(record.expiryDate)}
                colors={colors}
              />
              <DisplayField
                label="CPR Validity"
                value={formatDate(record.cprValidity)}
                colors={colors}
              />
              <DisplayField
                label="Date Remarks"
                value={formatDate(record.dateRemarks)}
                colors={colors}
              />
            </FieldGrid>
          </Section>

          {/* Office/File Information */}
          <Section title="📁 Office/File Information" colors={colors}>
            <FieldGrid>
              <DisplayField
                label="MO"
                value={cleanValue(record.mo)}
                colors={colors}
              />
              <DisplayField
                label="File"
                value={cleanValue(record.file)}
                colors={colors}
              />
            </FieldGrid>
          </Section>

          {/* SECPA Information */}
          <Section title="🔐 SECPA Information" colors={colors}>
            <FieldGrid>
              <DisplayField
                label="SECPA"
                value={cleanValue(record.secpa)}
                colors={colors}
              />
              <DisplayField
                label="SECPA Expiry Date"
                value={formatDate(record.secpaExpDate)}
                colors={colors}
              />
              <DisplayField
                label="SECPA Issued On"
                value={formatDate(record.secpaIssuedOn)}
                colors={colors}
              />
            </FieldGrid>
          </Section>

          {/* Decking Information */}
          <Section title="🎯 Decking Information" colors={colors}>
            <FieldGrid>
              <DisplayField
                label="Decking Schedule"
                value={formatDate(record.deckingSched)}
                colors={colors}
              />
              <DisplayField
                label="Evaluator"
                value={cleanValue(record.eval)}
                colors={colors}
              />
            </FieldGrid>
          </Section>

          {/* Release Information */}
          <Section title="📤 Release Information" colors={colors}>
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
            </FieldGrid>
          </Section>

          {/* CPR Condition */}
          <Section title="📜 CPR Condition" colors={colors}>
            <DisplayField
              label="CPR Condition"
              value={cleanValue(record.cprCond)}
              colors={colors}
              fullWidth
            />
            <DisplayField
              label="CPR Condition Remarks"
              value={cleanValue(record.cprCondRemarks)}
              colors={colors}
              fullWidth
            />
            <DisplayField
              label="CPR Condition Additional Remarks"
              value={cleanValue(record.cprCondAddRemarks)}
              colors={colors}
              fullWidth
            />
          </Section>

          {/* Remarks & Notes */}
          <Section title="📝 Remarks & Notes" colors={colors}>
            <DisplayField
              label="Application Remarks"
              value={cleanValue(record.appRemarks)}
              colors={colors}
              fullWidth
            />
            <DisplayField
              label="General Remarks"
              value={cleanValue(record.remarks1)}
              colors={colors}
              fullWidth
            />
          </Section>

          {/* Read-Only Metadata */}
          <Section title="📊 Metadata (Read-Only)" colors={colors}>
            <FieldGrid>
              <DisplayField
                label="Timeline (Days)"
                value={cleanValue(record.dbTimelineCitizenCharter)}
                colors={colors}
              />
              <StatusTimelineField
                label="Status Timeline"
                record={record}
                colors={colors}
              />
              <DisplayField
                label="Uploaded By"
                value={cleanValue(record.userUploader)}
                colors={colors}
              />
              <DisplayField
                label="Upload Date"
                value={formatDate(record.dateExcelUpload)}
                colors={colors}
              />
            </FieldGrid>
          </Section>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1.5rem 2rem",
            borderTop: `1px solid ${colors.cardBorder}`,
            display: "flex",
            gap: "1rem",
            justifyContent: "flex-end",
            background: colors.cardBg,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0.75rem 1.5rem",
              background: "transparent",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "8px",
              color: colors.textSecondary,
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function Section({ title, children, colors }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <h3
        style={{
          fontSize: "1rem",
          fontWeight: "600",
          color: colors.textPrimary,
          marginBottom: "1rem",
          paddingBottom: "0.5rem",
          borderBottom: `2px solid ${colors.cardBorder}`,
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
        gap: "1.5rem",
      }}
    >
      {children}
    </div>
  );
}

function DisplayField({ label, value, colors, fullWidth = false }) {
  const containerStyle = fullWidth
    ? { gridColumn: "1 / -1", marginBottom: "1rem" }
    : { display: "flex", flexDirection: "column", gap: "0.5rem" };

  return (
    <div style={containerStyle}>
      <label
        style={{
          fontSize: "0.875rem",
          fontWeight: "500",
          color: colors.textSecondary,
        }}
      >
        {label}
      </label>
      <div
        style={{
          padding: "0.75rem",
          background: colors.tableRowEven,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "8px",
          color: value === "N/A" ? colors.textTertiary : colors.textPrimary,
          fontSize: "0.875rem",
          minHeight: fullWidth ? "4rem" : "auto",
          whiteSpace: fullWidth ? "pre-wrap" : "normal",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ✅ NEW - Status Timeline Field with Badge
function StatusTimelineField({ label, record, colors }) {
  const { status, days } = calculateStatusTimeline(record);

  const renderBadge = () => {
    if (!status) {
      return (
        <span style={{ color: colors.textTertiary, fontSize: "0.875rem" }}>
          N/A
        </span>
      );
    }

    if (status === "WITHIN") {
      return (
        <span
          style={{
            padding: "0.4rem 0.9rem",
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: "700",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>✓</span>
          Within ({days}d)
        </span>
      );
    } else if (status === "BEYOND") {
      return (
        <span
          style={{
            padding: "0.4rem 0.9rem",
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: "700",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>⚠</span>
          Beyond ({days}d)
        </span>
      );
    }

    return status;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <label
        style={{
          fontSize: "0.875rem",
          fontWeight: "500",
          color: colors.textSecondary,
        }}
      >
        {label}
      </label>
      <div
        style={{
          padding: "0.75rem",
          background: colors.tableRowEven,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "8px",
          fontSize: "0.875rem",
          display: "flex",
          alignItems: "center",
        }}
      >
        {renderBadge()}
      </div>
    </div>
  );
}

export default ViewDetailsModal;
