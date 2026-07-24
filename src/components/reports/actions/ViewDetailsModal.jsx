// FILE: src/components/reports/actions/ViewDetailsModal.jsx

import { useState, createContext, useContext } from "react";

/* Provides a consistent label-column width to every LVRow within a given
   AccordionSection, so values line up vertically within that section. */
const LabelWidthContext = createContext(null);

/* ================================================================== */
/*  Helpers                                                              */
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

/* Status pill tone — mirrors the green "Approved" pill in the reference */
const statusTone = (statusRaw) => {
  const s = (statusRaw || "").toUpperCase();
  if (s === "APPROVED" || s === "COMPLETED")
    return { bg: "#dcfce7", color: "#16a34a", dot: "#16a34a" };
  if (s === "REJECTED" || s === "DENIED")
    return { bg: "#fee2e2", color: "#dc2626", dot: "#dc2626" };
  if (s === "PENDING" || s === "ON-PROCESS" || s === "ON PROCESS")
    return { bg: "#fef3c7", color: "#b45309", dot: "#b45309" };
  return { bg: "#e0e7ff", color: "#4338ca", dot: "#4338ca" };
};

/* Shared blue accent used for section headers / icons / links */
const ACCENT = "#2563eb";
const ACCENT_BG = "#eff6ff";
const ICON_CIRCLE_BG = "#e0e7ff";

/* Simple line icons (stroke uses currentColor so they inherit ACCENT) */
const IconSvg = ({ children, size = 13 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const Icons = {
  document: (
    <IconSvg size={15}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h6" />
    </IconSvg>
  ),
  info: (
    <IconSvg>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-5M12 8h.01" />
    </IconSvg>
  ),
  pill: (
    <IconSvg>
      <rect
        x="3"
        y="8"
        width="18"
        height="8"
        rx="4"
        transform="rotate(45 12 12)"
      />
      <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
    </IconSvg>
  ),
  cash: (
    <IconSvg>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
    </IconSvg>
  ),
  company: (
    <IconSvg>
      <path d="M17 3l4 4-4 4M21 7H9M7 21l-4-4 4-4M3 17h12" />
    </IconSvg>
  ),
  hash: (
    <IconSvg>
      <path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />
    </IconSvg>
  ),
  check: (
    <IconSvg>
      <path d="M20 6L9 17l-5-5" />
    </IconSvg>
  ),
  edit: (
    <IconSvg>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </IconSvg>
  ),
};

/* ================================================================== */
/*  Accordion Section + Label:Value row                                  */
/* ================================================================== */
function AccordionSection({
  icon,
  title,
  children,
  colors,
  defaultOpen = true,
  labelWidth = 110,
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "8px",
        marginBottom: "0.65rem",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.65rem 0.9rem",
          background: colors.cardBg,
          border: "none",
          borderBottom: open ? `1px solid ${colors.cardBorder}` : "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: ICON_CIRCLE_BG,
              color: ACCENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.7rem",
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: "700",
              color: ACCENT,
            }}
          >
            {title}
          </span>
        </span>
        <span
          style={{
            fontSize: "0.65rem",
            color: colors.textTertiary,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: "0.8rem 0.9rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            background: colors.cardBg,
          }}
        >
          <LabelWidthContext.Provider value={labelWidth}>
            {children}
          </LabelWidthContext.Provider>
        </div>
      )}
    </div>
  );
}

function LVRow({ label, value, colors, wide = false, fullWidth = false }) {
  const isNA = value === "N/A";
  const labelWidth = useContext(LabelWidthContext);
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
          width: labelWidth ? `${labelWidth}px` : undefined,
          color: "#7a8190",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span style={{ color: "#7a8190", flexShrink: 0 }}>:</span>
      <span
        style={{
          color: isNA ? colors.textTertiary : colors.textPrimary,
          fontStyle: isNA ? "italic" : "normal",
          fontWeight: 500,
          wordBreak: "break-word",
          whiteSpace: wide ? "pre-wrap" : "normal",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function LVGrid({ children }) {
  return (
    <div
      className="vdm-lv-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        rowGap: "0.55rem",
        columnGap: "1rem",
      }}
    >
      {children}
    </div>
  );
}

/* ================================================================== */
/*  All Details — single-view accordion layout                          */
/* ================================================================== */
function AllDetails({ record, colors }) {
  const { status, days } = calculateStatusTimeline(record);
  const ok = status === "WITHIN";

  const companySections = [
    {
      title: "Manufacturer",
      keys: {
        name: "prodManu",
        country: "prodManuCountry",
        lto: "prodManuLtoNo",
        tin: "prodManuTin",
        add: "prodManuAdd",
      },
    },
    {
      title: "Trader",
      keys: {
        name: "prodTrader",
        country: "prodTraderCountry",
        lto: "prodTraderLtoNo",
        tin: "prodTraderTin",
        add: "prodTraderAdd",
      },
    },
    {
      title: "Importer",
      keys: {
        name: "prodImporter",
        country: "prodImporterCountry",
        lto: "prodImporterLtoNo",
        tin: "prodImporterTin",
        add: "prodImporterAdd",
      },
    },
    {
      title: "Distributor",
      keys: {
        name: "prodDistri",
        country: "prodDistriCountry",
        lto: "prodDistriLtoNo",
        tin: "prodDistriTin",
        add: "prodDistriAdd",
      },
    },
    {
      title: "Repacker",
      keys: {
        name: "prodRepacker",
        country: "prodRepackerCountry",
        lto: "prodRepackerLtoNo",
        tin: "prodRepackerTin",
        add: "prodRepackerAdd",
      },
    },
  ];

  const tone = statusTone(record.appStatus);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Status / Submitted bar — mirrors the reference top row */}
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
            Entry Type
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: "700",
              color: colors.textPrimary,
            }}
          >
            {cleanValue(record.entryType)}
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
            style={{
              fontSize: "0.78rem",
              fontWeight: "700",
              color: colors.textPrimary,
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
            Old RSN
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: "700",
              color: colors.textPrimary,
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
            Registration No.
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: "700",
              color: colors.textPrimary,
            }}
          >
            {cleanValue(record.regNo)}
          </div>
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

      {/* Two-column layout: left = Establishment/Product/Fees/Companies (60%), right = Application/Released/CPR/Amendments (40%) — collapses to one column on small screens */}
      <style>{`
        .vdm-two-col {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          flex-wrap: nowrap;
        }
        .vdm-col-left,
        .vdm-col-right {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .vdm-col-left { flex: 1 1 60%; }
        .vdm-col-right { flex: 0 0 40%; }
        @media (max-width: 760px) {
          .vdm-two-col {
            flex-direction: column;
          }
          .vdm-col-left,
          .vdm-col-right {
            flex: 1 1 100%;
            width: 100%;
          }
          .vdm-lv-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <div className="vdm-two-col">
        <div className="vdm-col-left">
          {/* Establishment Information */}
          <AccordionSection
            icon={Icons.info}
            title="Establishment Information"
            colors={colors}
            labelWidth={95}
          >
            <LVGrid>
              <LVRow
                label="Category"
                value={cleanValue(record.estCat)}
                colors={colors}
                fullWidth
              />
              <LVRow
                label="LTO Number"
                value={cleanValue(record.ltoNo)}
                colors={colors}
              />
              <LVRow
                label="LTO Validity"
                value={formatDate(record.validity)}
                colors={colors}
              />

              <LVRow
                label="Company"
                value={cleanValue(record.ltoComp)}
                colors={colors}
                fullWidth
              />
              <LVRow
                label="Address"
                value={cleanValue(record.ltoAdd)}
                colors={colors}
                wide
                fullWidth
              />

              <LVRow
                label="Email Address"
                value={cleanValue(record.eadd)}
                colors={colors}
              />
              <LVRow
                label="TIN"
                value={cleanValue(record.tin)}
                colors={colors}
              />
              <LVRow
                label="Contact No."
                value={cleanValue(record.contactNo)}
                colors={colors}
              />
            </LVGrid>
          </AccordionSection>

          {/* Product Details */}
          <AccordionSection
            icon={Icons.pill}
            title="Product Details"
            colors={colors}
            labelWidth={115}
          >
            <LVGrid>
              <LVRow
                label="Brand Name"
                value={cleanValue(record.prodBrName)}
                colors={colors}
              />
              <LVRow
                label="Generic Name"
                value={cleanValue(record.prodGenName)}
                colors={colors}
              />
              <LVRow
                label="Dosage Strength"
                value={cleanValue(record.prodDosStr)}
                colors={colors}
              />
              <LVRow
                label="Dosage Form"
                value={cleanValue(record.prodDosForm)}
                colors={colors}
              />
              <LVRow
                label="Classification"
                value={cleanValue(record.prodClassPrescript)}
                colors={colors}
              />
              <LVRow
                label="Essential Drug"
                value={cleanValue(record.prodEssDrugList)}
                colors={colors}
              />
              <LVRow
                label="Shelf Life"
                value={cleanValue(record.prodDistriShelfLife)}
                colors={colors}
              />
              <LVRow
                label="Pharma Category"
                value={cleanValue(record.prodPharmaCat)}
                colors={colors}
              />
              <LVRow
                label="Product Category"
                value={cleanValue(record.prodCat)}
                colors={colors}
              />
              <LVRow
                label="File"
                value={cleanValue(record.file)}
                colors={colors}
              />
              <LVRow
                label="Storage Condition"
                value={cleanValue(record.storageCond)}
                colors={colors}
              />
              <LVRow
                label="Packaging"
                value={cleanValue(record.packaging)}
                colors={colors}
              />
              <LVRow
                label="Suggested RP"
                value={cleanValue(record.suggRp)}
                colors={colors}
              />
              <LVRow
                label="No. of Samples"
                value={cleanValue(record.noSample)}
                colors={colors}
              />
            </LVGrid>
          </AccordionSection>

          {/* Fees */}
          <AccordionSection
            icon={Icons.cash}
            title="Fees"
            colors={colors}
            labelWidth={65}
          >
            <LVGrid>
              <LVRow
                label="Fee"
                value={cleanValue(record.fee)}
                colors={colors}
              />
              <LVRow
                label="LRF"
                value={cleanValue(record.lrf)}
                colors={colors}
              />
              <LVRow
                label="SURC"
                value={cleanValue(record.surc)}
                colors={colors}
              />
              <LVRow
                label="Total"
                value={cleanValue(record.total)}
                colors={colors}
              />
              <LVRow
                label="OR No."
                value={cleanValue(record.orNo)}
                colors={colors}
              />
              <LVRow
                label="Date Issued"
                value={formatDate(record.dateIssued)}
                colors={colors}
              />
            </LVGrid>
          </AccordionSection>

          {/* Manufacturer / Trader / Importer / Distributor / Repacker */}
          {companySections.map(({ title, keys }) => (
            <AccordionSection
              key={title}
              icon={Icons.company}
              title={title}
              colors={colors}
              labelWidth={70}
            >
              <LVGrid>
                <LVRow
                  label="Name"
                  value={cleanValue(record[keys.name])}
                  colors={colors}
                />
                <LVRow
                  label="Country"
                  value={cleanValue(record[keys.country])}
                  colors={colors}
                />
                <LVRow
                  label="LTO No."
                  value={cleanValue(record[keys.lto])}
                  colors={colors}
                />
                <LVRow
                  label="TIN"
                  value={cleanValue(record[keys.tin])}
                  colors={colors}
                />
              </LVGrid>
              <LVRow
                label="Address"
                value={cleanValue(record[keys.add])}
                colors={colors}
                wide
              />
            </AccordionSection>
          ))}
        </div>

        <div className="vdm-col-right">
          {/* Application Information */}
          <AccordionSection
            icon={Icons.hash}
            title="Application Information"
            colors={colors}
            labelWidth={135}
          >
            <LVRow
              label="Processing Type"
              value={cleanValue(record.processingType)}
              colors={colors}
            />

            <LVRow
              label="Date Received FDAC"
              value={formatDate(record.dateReceivedFdac)}
              colors={colors}
              fullWidth
            />
            <LVRow
              label="Date Received Central"
              value={formatDate(record.dateReceivedCent)}
              colors={colors}
              wide
              fullWidth
            />

            <LVRow
              label="Application Type"
              value={cleanValue(record.appType)}
              colors={colors}
            />
            <LVRow
              label="Mother App Type"
              value={cleanValue(record.motherAppType)}
              colors={colors}
            />

            <LVRow
              label="Certification"
              value={cleanValue(record.certification)}
              colors={colors}
              fullWidth
            />
            <LVRow
              label="Class"
              value={cleanValue(record.class)}
              colors={colors}
            />
            <LVRow label="MO" value={cleanValue(record.mo)} colors={colors} />
          </AccordionSection>

          {/* Released Information */}
          <AccordionSection
            icon={Icons.check}
            title="Released Information"
            colors={colors}
            labelWidth={160}
          >
            <LVRow
              label="Type of Document Released"
              value={cleanValue(record.typeDocReleased)}
              colors={colors}
            />
            <LVRow
              label="Attachments Released"
              value={cleanValue(record.attaReleased)}
              colors={colors}
            />
            <LVRow
              label="SECPA"
              value={cleanValue(record.secpa)}
              colors={colors}
            />
            <LVRow
              label="Expiry"
              value={formatDate(record.secpaExpDate)}
              colors={colors}
            />
            <LVRow
              label="Issued On"
              value={formatDate(record.secpaIssuedOn)}
              colors={colors}
            />
            <LVRow
              label="Date Released by CDRR"
              value={formatDate(record.dateReleased)}
              colors={colors}
            />
          </AccordionSection>

          {/* CPR Conditions */}
          <AccordionSection
            icon={Icons.info}
            title="CPR Conditions"
            colors={colors}
            labelWidth={140}
          >
            <LVRow
              label="CPR Condition/s"
              value={cleanValue(record.cprCond)}
              colors={colors}
              wide
            />
            <LVRow
              label="CPR Condition Remarks"
              value={cleanValue(record.cprCondRemarks)}
              colors={colors}
              wide
            />
            <LVRow
              label="Additional Remarks"
              value={cleanValue(record.cprCondAddRemarks)}
              colors={colors}
              wide
            />
          </AccordionSection>

          {/* Amendments & Remarks */}
          <AccordionSection
            icon={Icons.edit}
            title="Amendments & Remarks"
            colors={colors}
            labelWidth={125}
          >
            <LVRow
              label="Amendment 1"
              value={cleanValue(record.ammend1)}
              colors={colors}
            />
            <LVRow
              label="Amendment 2"
              value={cleanValue(record.ammend2)}
              colors={colors}
            />
            <LVRow
              label="Amendment 3"
              value={cleanValue(record.ammend3)}
              colors={colors}
            />

            <LVRow
              label="Application Remarks"
              value={cleanValue(record.appRemarks)}
              colors={colors}
              wide
            />
            <LVRow
              label="General Remarks"
              value={cleanValue(record.remarks1)}
              colors={colors}
              wide
            />
          </AccordionSection>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Main Modal — single view, no tabs, no App History button            */
/* ================================================================== */
function ViewDetailsModal({
  record,
  onClose,
  colors,
  darkMode,
  loading = false,
}) {
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
            padding: "0.85rem 1.25rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            gap: "1rem",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: "8px",
                background: ACCENT_BG,
                color: ACCENT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {Icons.document}
            </span>
            <div>
              <h2
                style={{
                  fontSize: "0.95rem",
                  fontWeight: "700",
                  color: colors.textPrimary,
                  margin: 0,
                }}
              >
                Application Details
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              border: "none",
              background: "transparent",
              color: colors.textSecondary,
              cursor: "pointer",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.05)";
              e.currentTarget.style.color = colors.textPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = colors.textSecondary;
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "1rem 1.25rem",
          }}
        >
          {loading ? (
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
              <span style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                Loading details...
              </span>
              <span style={{ fontSize: "0.65rem", opacity: 0.6 }}>
                DTN: {record?.dtn}
              </span>
            </div>
          ) : (
            <AllDetails record={record} colors={colors} />
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: "0.75rem 1.25rem",
            borderTop: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            flexShrink: 0,
            gap: "0.5rem",
            background: colors.cardBg,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1.1rem",
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "7px",
              color: colors.textPrimary,
              fontSize: "0.75rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Close
          </button>
          <button
            style={{
              padding: "0.5rem 1.2rem",
              background: ACCENT,
              border: "none",
              borderRadius: "7px",
              color: "#fff",
              fontSize: "0.75rem",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            ✎ Edit
          </button>
        </div>
      </div>
    </>
  );
}

export default ViewDetailsModal;
