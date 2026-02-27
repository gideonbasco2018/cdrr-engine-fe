// FILE: src/components/reports/actions/ViewDetailsModal.jsx

import { useState } from "react";

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */
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

const cleanValue = (value) => {
  if (value === null || value === undefined || value === "" || value === "N/A")
    return "N/A";
  return String(value);
};

const calculateStatusTimeline = (record) => {
  const dateReceivedCent = record.dateReceivedCent;
  const dateReleased = record.dateReleased;
  const timeline = record.dbTimelineCitizenCharter;
  if (
    !dateReceivedCent ||
    !timeline ||
    dateReceivedCent === "N/A" ||
    timeline === null
  )
    return { status: "", days: 0 };
  const receivedDate = new Date(dateReceivedCent);
  const endDate =
    dateReleased && dateReleased !== "N/A"
      ? new Date(dateReleased)
      : new Date();
  if (isNaN(receivedDate.getTime()) || isNaN(endDate.getTime()))
    return { status: "", days: 0 };
  const diffDays = Math.ceil(Math.abs(endDate - receivedDate) / 864e5);
  const timelineValue = parseInt(timeline, 10);
  return diffDays <= timelineValue
    ? { status: "WITHIN", days: diffDays }
    : { status: "BEYOND", days: diffDays };
};

/* ================================================================== */
/*  Shared Sub-components                                               */
/* ================================================================== */
function VDSection({ title, children, colors }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <h3
        style={{
          fontSize: "0.95rem",
          fontWeight: "700",
          color: colors.textPrimary,
          marginBottom: "1rem",
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
        gap: "1rem",
      }}
    >
      {children}
    </div>
  );
}

function DisplayField({ label, value, colors, fullWidth = false }) {
  const isNA = value === "N/A";
  return (
    <div
      style={
        fullWidth
          ? { gridColumn: "1 / -1", marginBottom: "0.75rem" }
          : { display: "flex", flexDirection: "column", gap: "0.3rem" }
      }
    >
      <label
        style={{
          fontSize: "0.72rem",
          fontWeight: "700",
          color: colors.textTertiary,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      <div
        style={{
          padding: "0.55rem 0.8rem",
          background: colors.inputBg,
          border: `1px solid ${colors.inputBorder}`,
          borderRadius: "6px",
          color: isNA ? colors.textTertiary : colors.textPrimary,
          fontSize: "0.85rem",
          minHeight: fullWidth ? "3.5rem" : "2.2rem",
          whiteSpace: fullWidth ? "pre-wrap" : "normal",
          wordBreak: "break-word",
          display: "flex",
          alignItems: fullWidth ? "flex-start" : "center",
          fontStyle: isNA ? "italic" : "normal",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatusTimelineField({ label, record, colors }) {
  const { status, days } = calculateStatusTimeline(record);
  const ok = status === "WITHIN";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <label
        style={{
          fontSize: "0.72rem",
          fontWeight: "700",
          color: colors.textTertiary,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      <div
        style={{
          padding: "0.55rem 0.8rem",
          background: colors.inputBg,
          border: `1px solid ${colors.inputBorder}`,
          borderRadius: "6px",
          fontSize: "0.85rem",
          display: "flex",
          alignItems: "center",
          minHeight: "2.2rem",
        }}
      >
        {!status ? (
          <span style={{ color: colors.textTertiary, fontStyle: "italic" }}>
            N/A
          </span>
        ) : (
          <span
            style={{
              padding: "0.3rem 0.8rem",
              background: ok
                ? "linear-gradient(135deg,#10b981,#059669)"
                : "linear-gradient(135deg,#ef4444,#dc2626)",
              color: "#fff",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: "700",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              boxShadow: ok
                ? "0 2px 8px rgba(16,185,129,.3)"
                : "0 2px 8px rgba(239,68,68,.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            {ok ? "✓" : "⚠"} {ok ? `Within (${days}d)` : `Beyond (${days}d)`}
          </span>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, accent, colors }) {
  return (
    <div
      style={{
        padding: "1rem 1.25rem",
        background: colors.inputBg,
        border: `1px solid ${colors.inputBorder}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
      }}
    >
      <span
        style={{
          fontSize: "0.7rem",
          fontWeight: "700",
          color: colors.textTertiary,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        {icon} {label}
      </span>
      <span
        style={{
          fontSize: "0.9rem",
          fontWeight: "600",
          color: value === "N/A" ? colors.textTertiary : colors.textPrimary,
          fontStyle: value === "N/A" ? "italic" : "normal",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
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
/*  Step 1: Basic Info                                                  */
/* ================================================================== */
function Step1BasicInfo({ record, colors }) {
  const { status, days } = calculateStatusTimeline(record);
  const ok = status === "WITHIN";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Hero row */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          background:
            "linear-gradient(135deg, rgba(33,150,243,0.08), rgba(33,150,243,0.03))",
          border: "1px solid rgba(33,150,243,0.2)",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: "700",
              color: "#2196F3",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "0.2rem",
            }}
          >
            Document Tracking No.
          </div>
          <div
            style={{
              fontSize: "1.6rem",
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
            height: "40px",
            background: colors.cardBorder,
          }}
        />
        <div style={{ flex: 1, minWidth: "200px" }}>
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: "700",
              color: colors.textTertiary,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "0.2rem",
            }}
          >
            Brand Name
          </div>
          <div
            style={{
              fontSize: "1.1rem",
              fontWeight: "700",
              color: colors.textPrimary,
            }}
          >
            {cleanValue(record.prodBrName)}
          </div>
          <div
            style={{
              fontSize: "0.82rem",
              color: colors.textSecondary,
              marginTop: "0.15rem",
            }}
          >
            {cleanValue(record.prodGenName)}
          </div>
        </div>
        {status && (
          <span
            style={{
              padding: "0.4rem 1rem",
              background: ok
                ? "linear-gradient(135deg,#10b981,#059669)"
                : "linear-gradient(135deg,#ef4444,#dc2626)",
              color: "#fff",
              borderRadius: "8px",
              fontSize: "0.75rem",
              fontWeight: "700",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              boxShadow: ok
                ? "0 2px 8px rgba(16,185,129,.3)"
                : "0 2px 8px rgba(239,68,68,.3)",
            }}
          >
            {ok ? "✓" : "⚠"} {ok ? `Within (${days}d)` : `Beyond (${days}d)`}
          </span>
        )}
      </div>

      {/* Summary grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "0.75rem",
        }}
      >
        <SummaryCard
          icon="🏢"
          label="LTO Company"
          value={cleanValue(record.ltoComp)}
          accent="#2196F3"
          colors={colors}
        />
        <SummaryCard
          icon="📋"
          label="Application Type"
          value={cleanValue(record.appType)}
          accent="#9c27b0"
          colors={colors}
        />
        <SummaryCard
          icon="💊"
          label="Dosage Form"
          value={cleanValue(record.dosageForm)}
          accent="#ff9800"
          colors={colors}
        />
        <SummaryCard
          icon="📌"
          label="Prescription"
          value={cleanValue(record.prescription)}
          accent="#f44336"
          colors={colors}
        />
        <SummaryCard
          icon="🔖"
          label="App Status"
          value={cleanValue(record.appStatus)}
          accent="#4caf50"
          colors={colors}
        />
        <SummaryCard
          icon="⚙️"
          label="Processing Type"
          value={cleanValue(record.processingType)}
          accent="#00bcd4"
          colors={colors}
        />
        <SummaryCard
          icon="📅"
          label="Date Received Central"
          value={formatDate(record.dateReceivedCent)}
          accent="#607d8b"
          colors={colors}
        />
        <SummaryCard
          icon="📅"
          label="Date Released"
          value={formatDate(record.dateReleased)}
          accent="#607d8b"
          colors={colors}
        />
      </div>

      {/* Product Details */}
      <VDSection title="💊 Product Details" colors={colors}>
        <FieldGrid>
          <DisplayField
            label="Dosage Strength"
            value={cleanValue(record.dosageStrength)}
            colors={colors}
          />
          <DisplayField
            label="Pharma Category"
            value={cleanValue(record.pharmaCategory)}
            colors={colors}
          />
          <DisplayField
            label="Essential Drug"
            value={cleanValue(record.essentialDrug)}
            colors={colors}
          />
          <DisplayField
            label="Product Category"
            value={cleanValue(record.productCategory)}
            colors={colors}
          />
        </FieldGrid>
      </VDSection>

      {/* Establishment */}
      <VDSection title="🏢 Establishment" colors={colors}>
        <FieldGrid>
          <DisplayField
            label="Category"
            value={cleanValue(record.estCat)}
            colors={colors}
          />
          <DisplayField
            label="LTO No."
            value={cleanValue(record.ltoNo)}
            colors={colors}
          />
          <DisplayField
            label="LTO Address"
            value={cleanValue(record.ltoAdd)}
            colors={colors}
          />
          <DisplayField
            label="Contact No."
            value={cleanValue(record.contactNo)}
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
            label="Validity"
            value={formatDate(record.validity)}
            colors={colors}
          />
        </FieldGrid>
      </VDSection>
    </div>
  );
}

/* ================================================================== */
/*  Step 2: Full Details                                                */
/* ================================================================== */
function Step2FullDetails({ record, colors }) {
  return (
    <div>
      <VDSection title="📋 Application Information" colors={colors}>
        <FieldGrid>
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
          <DisplayField
            label="MO"
            value={cleanValue(record.mo)}
            colors={colors}
          />
        </FieldGrid>
      </VDSection>

      <VDSection title="📝 Amendments" colors={colors}>
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
      </VDSection>

      <VDSection title="🏭 Manufacturer" colors={colors}>
        <FieldGrid>
          <DisplayField
            label="Manufacturer"
            value={cleanValue(record.prodManu)}
            colors={colors}
          />
          <DisplayField
            label="Country"
            value={cleanValue(record.prodManuCountry)}
            colors={colors}
          />
          <DisplayField
            label="Address"
            value={cleanValue(record.prodManuAdd)}
            colors={colors}
          />
          <DisplayField
            label="TIN"
            value={cleanValue(record.prodManuTin)}
            colors={colors}
          />
          <DisplayField
            label="LTO No."
            value={cleanValue(record.prodManuLtoNo)}
            colors={colors}
          />
        </FieldGrid>
      </VDSection>

      <VDSection title="🚢 Trader" colors={colors}>
        <FieldGrid>
          <DisplayField
            label="Trader"
            value={cleanValue(record.prodTrader)}
            colors={colors}
          />
          <DisplayField
            label="Trader Country"
            value={cleanValue(record.prodTraderCountry)}
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
        </FieldGrid>
      </VDSection>

      <VDSection title="📦 Repacker" colors={colors}>
        <FieldGrid>
          <DisplayField
            label="Repacker"
            value={cleanValue(record.prodRepacker)}
            colors={colors}
          />
          <DisplayField
            label="Repacker Country"
            value={cleanValue(record.prodRepackerCountry)}
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
        </FieldGrid>
      </VDSection>

      <VDSection title="✈️ Importer" colors={colors}>
        <FieldGrid>
          <DisplayField
            label="Importer"
            value={cleanValue(record.prodImporter)}
            colors={colors}
          />
          <DisplayField
            label="Importer Country"
            value={cleanValue(record.prodImporterCountry)}
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
        </FieldGrid>
      </VDSection>

      <VDSection title="🚚 Distributor" colors={colors}>
        <FieldGrid>
          <DisplayField
            label="Distributor"
            value={cleanValue(record.prodDistri)}
            colors={colors}
          />
          <DisplayField
            label="Distributor Country"
            value={cleanValue(record.prodDistriCountry)}
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
            label="Shelf Life"
            value={cleanValue(record.prodDistriShelfLife)}
            colors={colors}
          />
        </FieldGrid>
      </VDSection>

      <VDSection title="📦 Storage & Packaging" colors={colors}>
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
      </VDSection>

      <VDSection title="💰 Fees" colors={colors}>
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
          <DisplayField
            label="Date Issued"
            value={formatDate(record.dateIssued)}
            colors={colors}
          />
        </FieldGrid>
      </VDSection>

      <VDSection title="📅 Important Dates" colors={colors}>
        <FieldGrid>
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
      </VDSection>

      <VDSection title="📁 Office/File Information" colors={colors}>
        <FieldGrid>
          <DisplayField
            label="File"
            value={cleanValue(record.file)}
            colors={colors}
          />
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
      </VDSection>

      <VDSection title="🔐 SECPA" colors={colors}>
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
      </VDSection>

      <VDSection title="📤 Release" colors={colors}>
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
      </VDSection>

      <VDSection title="📜 CPR Conditions" colors={colors}>
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
      </VDSection>

      <VDSection title="📝 Remarks & Notes" colors={colors}>
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
      </VDSection>

      <VDSection title="📊 Metadata" colors={colors}>
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
      </VDSection>
    </div>
  );
}

/* ================================================================== */
/*  Main Modal                                                          */
/* ================================================================== */
function ViewDetailsModal({ record, onClose, colors, darkMode }) {
  const [currentStep, setCurrentStep] = useState(1);
  if (!record) return null;

  const STEPS = ["Basic Info", "Full Details"];
  const totalSteps = STEPS.length;

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, totalSteps));
  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 1));

  return (
    <>
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
          {/* Left: title + subtitle */}
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
              {currentStep === 1 ? "👁️ Basic Information" : "📄 Full Details"}
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
                {cleanValue(record.dtn)}
              </strong>
              {" · "}
              {cleanValue(record.prodBrName)}
            </p>
          </div>

          {/* Center: Step indicator */}
          <div
            style={{
              flex: 1,
              maxWidth: "280px",
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

          {/* Right: close button */}
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
          {currentStep === 1 && (
            <Step1BasicInfo record={record} colors={colors} />
          )}
          {currentStep === 2 && (
            <Step2FullDetails record={record} colors={colors} />
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
            Step {currentStep} of {totalSteps}
          </span>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={onClose}
              style={{
                padding: "0.6rem 1.2rem",
                background: "transparent",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: "8px",
                color: colors.textSecondary,
                fontSize: "0.875rem",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              Close
            </button>

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
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ViewDetailsModal;
