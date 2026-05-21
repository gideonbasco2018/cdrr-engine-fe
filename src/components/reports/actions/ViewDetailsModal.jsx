// FILE: src/components/reports/actions/ViewDetailsModal.jsx

import { useState } from "react";
import { Step3AppLogs } from "../../tasks/viewdetails/steps/Step3AppLogs";

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
    <div style={{ marginBottom: "1rem" }}>
      {title && (
        <h3
          style={{
            fontSize: "0.72rem",
            fontWeight: "700",
            color: colors.textPrimary,
            marginBottom: "0.5rem",
            paddingBottom: "0.35rem",
            borderBottom: `2px solid ${colors.cardBorder}`,
            letterSpacing: "0.02em",
          }}
        >
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function FieldGrid({ children, cols = 2 }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: "0.5rem",
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
          ? { gridColumn: "1 / -1", marginBottom: "0.3rem" }
          : { display: "flex", flexDirection: "column", gap: "0.15rem" }
      }
    >
      <label
        style={{
          fontSize: "0.55rem",
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
          padding: "0.3rem 0.5rem",
          background: colors.inputBg,
          border: `1px solid ${colors.inputBorder}`,
          borderRadius: "5px",
          color: isNA ? colors.textTertiary : colors.textPrimary,
          fontSize: "0.65rem",
          minHeight: fullWidth ? "2rem" : "1.6rem",
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

function SummaryCard({
  icon,
  label,
  value,
  accent,
  colors,
  fullWidth = false,
}) {
  return (
    <div
      style={{
        ...(fullWidth ? { gridColumn: "1 / -1" } : {}),
        padding: "0.4rem 0.6rem",
        background: colors.inputBg,
        border: `1px solid ${colors.inputBorder}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: "5px",
        display: "flex",
        flexDirection: "column",
        gap: "0.1rem",
      }}
    >
      <span
        style={{
          fontSize: "0.5rem",
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
          fontSize: "0.65rem",
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

function StatusTimelineField({ label, record, colors }) {
  const { status, days } = calculateStatusTimeline(record);
  const ok = status === "WITHIN";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      <label
        style={{
          fontSize: "0.55rem",
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
          padding: "0.3rem 0.5rem",
          background: colors.inputBg,
          border: `1px solid ${colors.inputBorder}`,
          borderRadius: "5px",
          fontSize: "0.65rem",
          display: "flex",
          alignItems: "center",
          minHeight: "1.6rem",
        }}
      >
        {!status ? (
          <span style={{ color: colors.textTertiary, fontStyle: "italic" }}>
            N/A
          </span>
        ) : (
          <span
            style={{
              padding: "0.18rem 0.5rem",
              background: ok
                ? "linear-gradient(135deg,#10b981,#059669)"
                : "linear-gradient(135deg,#ef4444,#dc2626)",
              color: "#fff",
              borderRadius: "5px",
              fontSize: "0.58rem",
              fontWeight: "700",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            {ok ? "✓" : "⚠"} {ok ? `Within (${days}d)` : `Beyond (${days}d)`}
          </span>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Step Tab Bar                                                        */
/* ================================================================== */
function StepTabBar({ currentStep, setCurrentStep, colors }) {
  const tabs = [
    { step: 1, icon: "👁️", label: "Application Information" },
    { step: 2, icon: "🗂️", label: "Application Logs" },
  ];
  return (
    <div
      style={{
        display: "flex",
        borderBottom: `1px solid ${colors.cardBorder}`,
        flexShrink: 0,
      }}
    >
      {tabs.map(({ step, icon, label }) => {
        const isActive = currentStep === step;
        return (
          <button
            key={step}
            onClick={() => setCurrentStep(step)}
            style={{
              padding: "0.55rem 1.25rem",
              background: "transparent",
              border: "none",
              borderBottom: isActive
                ? "2px solid #2196F3"
                : "2px solid transparent",
              color: isActive ? "#2196F3" : colors.textTertiary,
              fontSize: "0.72rem",
              fontWeight: isActive ? "700" : "500",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              transition: "all 0.2s",
              marginBottom: "-1px",
            }}
          >
            <span>{icon}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/*  All Details (Step 1)                                               */
/* ================================================================== */
function AllDetails({ record, colors }) {
  const { status, days } = calculateStatusTimeline(record);
  const ok = status === "WITHIN";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* DTN Banner */}
      <div
        style={{
          padding: "0.65rem 0.85rem",
          background:
            "linear-gradient(135deg, rgba(33,150,243,0.08), rgba(33,150,243,0.03))",
          border: "1px solid rgba(33,150,243,0.2)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.5rem",
              fontWeight: "700",
              color: "#2196F3",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "0.1rem",
            }}
          >
            Document Tracking No.
          </div>
          <div
            style={{
              fontSize: "1rem",
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
            height: "28px",
            background: colors.cardBorder,
          }}
        />
        <div style={{ flex: 1, minWidth: "120px" }}>
          <div
            style={{
              fontSize: "0.5rem",
              fontWeight: "700",
              color: colors.textTertiary,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "0.15rem",
            }}
          >
            App Status
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.18rem 0.5rem",
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
              borderRadius: "5px",
              fontSize: "0.58rem",
              fontWeight: "700",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
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
              gap: "0.05rem",
            }}
          >
            <div
              style={{
                fontSize: "0.5rem",
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
                fontSize: "0.8rem",
                fontWeight: "800",
                color: colors.textPrimary,
              }}
            >
              {cleanValue(record.dbTimelineCitizenCharter)}
              <span
                style={{
                  fontSize: "0.52rem",
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
              padding: "0.22rem 0.6rem",
              background: ok
                ? "linear-gradient(135deg,#10b981,#059669)"
                : "linear-gradient(135deg,#ef4444,#dc2626)",
              color: "#fff",
              borderRadius: "5px",
              fontSize: "0.55rem",
              fontWeight: "700",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
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
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.4rem",
        }}
      >
        <SummaryCard
          icon="⚙️"
          label="Processing Type"
          value={cleanValue(record.processingType)}
          accent="#005cd4"
          colors={colors}
        />
        <SummaryCard
          icon="🗂️"
          label="Category"
          value={cleanValue(record.estCat)}
          accent="#fbff00"
          colors={colors}
        />
        <SummaryCard
          icon="📋"
          label="Application Type"
          value={cleanValue(record.appType)}
          accent="#ff1547"
          colors={colors}
        />
        <SummaryCard
          icon="🏢"
          label="LTO Company"
          value={cleanValue(record.ltoComp)}
          accent="#0fff2f"
          colors={colors}
          fullWidth
        />
        <SummaryCard
          icon="📍"
          label="LTO Address"
          value={cleanValue(record.ltoAdd)}
          accent="#ff950a"
          colors={colors}
          fullWidth
        />
        <SummaryCard
          icon="📧"
          label="Email"
          value={cleanValue(record.eadd)}
          accent="#fa3a93"
          colors={colors}
        />
        <SummaryCard
          icon="🪪"
          label="TIN"
          value={cleanValue(record.tin)}
          accent="#ca44ff"
          colors={colors}
        />
        <SummaryCard
          icon="📞"
          label="Contact No."
          value={cleanValue(record.contactNo)}
          accent="#00f18d"
          colors={colors}
        />
        <SummaryCard
          icon="🔑"
          label="LTO Number"
          value={cleanValue(record.ltoNo)}
          accent="#781192"
          colors={colors}
        />
        <SummaryCard
          icon="📅"
          label="LTO Validity"
          value={formatDate(record.validity)}
          accent="#607d8b"
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
          label="Date Received FDAC"
          value={formatDate(record.dateReceivedFdac)}
          accent="#0b5b83"
          colors={colors}
        />
      </div>

      {/* Product Details */}
      <VDSection title="💊 Product Details" colors={colors}>
        <FieldGrid cols={3}>
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
            label="Classification"
            value={cleanValue(record.prodClassPrescript)}
            colors={colors}
          />
          <DisplayField
            label="Essential Drug"
            value={cleanValue(record.prodEssDrugList)}
            colors={colors}
          />
          <DisplayField
            label="Shelf Life"
            value={cleanValue(record.prodDistriShelfLife)}
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
          <DisplayField
            label="File"
            value={cleanValue(record.file)}
            colors={colors}
          />
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
            label="Expiry Date"
            value={formatDate(record.expiryDate)}
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

      {/* Fees */}
      <VDSection title="💰 Fees" colors={colors}>
        <FieldGrid cols={3}>
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

      {/* Manufacturer / Trader / Importer / Distributor / Repacker */}
      {[
        {
          title: "🏭 Manufacturer",
          keys: {
            name: "prodManu",
            country: "prodManuCountry",
            lto: "prodManuLtoNo",
            tin: "prodManuTin",
            add: "prodManuAdd",
          },
        },
        {
          title: "🤝 Trader",
          keys: {
            name: "prodTrader",
            country: "prodTraderCountry",
            lto: "prodTraderLtoNo",
            tin: "prodTraderTin",
            add: "prodTraderAdd",
          },
        },
        {
          title: "🚢 Importer",
          keys: {
            name: "prodImporter",
            country: "prodImporterCountry",
            lto: "prodImporterLtoNo",
            tin: "prodImporterTin",
            add: "prodImporterAdd",
          },
        },
        {
          title: "📦 Distributor",
          keys: {
            name: "prodDistri",
            country: "prodDistriCountry",
            lto: "prodDistriLtoNo",
            tin: "prodDistriTin",
            add: "prodDistriAdd",
          },
        },
        {
          title: "🔄 Repacker",
          keys: {
            name: "prodRepacker",
            country: "prodRepackerCountry",
            lto: "prodRepackerLtoNo",
            tin: "prodRepackerTin",
            add: "prodRepackerAdd",
          },
        },
      ].map(({ title, keys }) => (
        <VDSection key={title} title={title} colors={colors}>
          <FieldGrid cols={2}>
            <DisplayField
              label="Name"
              value={cleanValue(record[keys.name])}
              colors={colors}
            />
            <DisplayField
              label="Country"
              value={cleanValue(record[keys.country])}
              colors={colors}
            />
            <DisplayField
              label="LTO No."
              value={cleanValue(record[keys.lto])}
              colors={colors}
            />
            <DisplayField
              label="TIN"
              value={cleanValue(record[keys.tin])}
              colors={colors}
            />
            <DisplayField
              label="Address"
              value={cleanValue(record[keys.add])}
              colors={colors}
              fullWidth
            />
          </FieldGrid>
        </VDSection>
      ))}

      {/* Application Info */}
      <VDSection title="📋 Application Information" colors={colors}>
        <FieldGrid cols={3}>
          <DisplayField
            label="Registration No."
            value={cleanValue(record.regNo)}
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
            label="MO"
            value={cleanValue(record.mo)}
            colors={colors}
          />
        </FieldGrid>
      </VDSection>

      {/* Released Info */}
      <VDSection title="📤 Released Information" colors={colors}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.4rem",
          }}
        >
          <SummaryCard
            icon="📄"
            label="Type of Document Released"
            value={cleanValue(record.typeDocReleased)}
            accent="#2196F3"
            colors={colors}
          />
          <SummaryCard
            icon="📎"
            label="Attachments Released"
            value={cleanValue(record.attaReleased)}
            accent="#10b981"
            colors={colors}
          />
          <SummaryCard
            icon="🔖"
            label="SECPA"
            value={cleanValue(record.secpa)}
            accent="#f59e0b"
            colors={colors}
          />
          <SummaryCard
            icon="📅"
            label="Expiry"
            value={formatDate(record.secpaExpDate)}
            accent="#ef4444"
            colors={colors}
          />
          <SummaryCard
            icon="📅"
            label="Issued On"
            value={formatDate(record.secpaIssuedOn)}
            accent="#8b5cf6"
            colors={colors}
          />
          <SummaryCard
            icon="📅"
            label="Date Released by CDRR"
            value={formatDate(record.dateReleased)}
            accent="#06b6d4"
            colors={colors}
          />
        </div>
      </VDSection>

      {/* CPR Conditions */}
      <VDSection title="📜 CPR Conditions" colors={colors}>
        <DisplayField
          label="CPR Condition/s"
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
          label="Additional Remarks"
          value={cleanValue(record.cprCondAddRemarks)}
          colors={colors}
          fullWidth
        />
      </VDSection>

      {/* Amendments & Remarks */}
      <VDSection title="📝 Amendments & Remarks" colors={colors}>
        <FieldGrid cols={3}>
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
        <div
          style={{
            marginTop: "0.4rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
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
        </div>
      </VDSection>
    </div>
  );
}

/* ================================================================== */
/*  Main Modal                                                          */
/* ================================================================== */
function ViewDetailsModal({
  record,
  onClose,
  colors,
  darkMode,
  loading = false,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  if (!record) return null;

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
          maxHeight: "94vh",
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "14px",
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
            padding: "0.75rem 1.25rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            gap: "1rem",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}
          >
            <h2
              style={{
                fontSize: "0.95rem",
                fontWeight: "700",
                color: colors.textPrimary,
                margin: 0,
              }}
            >
              {currentStep === 1
                ? "👁️ Application Information"
                : "🗂️ Application Logs"}
            </h2>
            <p
              style={{
                fontSize: "0.65rem",
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
          <button
            onClick={onClose}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              cursor: "pointer",
              fontSize: "0.9rem",
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

        {/* ── Step Tab Bar ── */}
        <StepTabBar
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          colors={colors}
        />

        {/* ── Scrollable Content ── */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "1rem 1.25rem",
          }}
        >
          {currentStep === 1 &&
            (loading ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "300px",
                  gap: "0.75rem",
                  color: colors.textTertiary,
                }}
              >
                <div style={{ fontSize: "2rem" }}>⏳</div>
                <span style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                  Loading details...
                </span>
                <span style={{ fontSize: "0.65rem", opacity: 0.6 }}>
                  DTN: {record?.dtn}
                </span>
              </div>
            ) : (
              <AllDetails record={record} colors={colors} />
            ))}
          {currentStep === 2 && (
            <Step3AppLogs
              record={{ ...record, mainDbId: record.mainDbId ?? record.id }}
              colors={colors}
            />
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: "0.65rem 1.25rem",
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
              fontSize: "0.65rem",
              color: colors.textTertiary,
              fontWeight: "600",
            }}
          >
            Step {currentStep} of 2
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                style={{
                  padding: "0.45rem 1rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "7px",
                  color: colors.textPrimary,
                  fontSize: "0.72rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                ← Previous
              </button>
            )}
            {currentStep < 2 && (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                style={{
                  padding: "0.45rem 1.1rem",
                  background: "linear-gradient(135deg, #2196F3, #1976D2)",
                  border: "none",
                  borderRadius: "7px",
                  color: "#fff",
                  fontSize: "0.72rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
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
