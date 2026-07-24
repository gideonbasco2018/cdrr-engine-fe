// FILE: src/components/reports/actions/EditRecordModal.jsx

import { useState, useEffect, createContext, useContext } from "react";
import {
  createFieldAuditLog,
  computeFieldChanges,
} from "../../../api/field-audit-logs";
import { getUser } from "../../../api/auth";
import { CountryDropdown } from "../FilterBar";

/* ================================================================== */
/*  Shared design tokens — identical to ViewDetailsModal                */
/* ================================================================== */
const ACCENT = "#2563eb";
const ACCENT_BG = "#eff6ff";
const ICON_CIRCLE_BG = "#e0e7ff";

/* Provides a consistent label-column width to every row within a given
   AccordionSection, so values line up vertically within that section. */
const LabelWidthContext = createContext(null);

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

const calculateStatusTimeline = (formData) => {
  const dateReceivedCent = formData.DB_DATE_RECEIVED_CENT;
  const dateReleased = formData.DB_DATE_RELEASED;
  const timeline = formData.DB_TIMELINE_CITIZEN_CHARTER;
  if (!dateReceivedCent || !timeline) return { status: "", days: 0 };
  const receivedDate = new Date(dateReceivedCent);
  const endDate = dateReleased ? new Date(dateReleased) : new Date();
  if (isNaN(receivedDate.getTime()) || isNaN(endDate.getTime()))
    return { status: "", days: 0 };
  const diffDays = Math.ceil(Math.abs(endDate - receivedDate) / 864e5);
  const timelineValue = parseInt(timeline, 10);
  if (isNaN(timelineValue)) return { status: "", days: 0 };
  return diffDays <= timelineValue
    ? { status: "WITHIN", days: diffDays }
    : { status: "BEYOND", days: diffDays };
};

/* Status pill tone — mirrors ViewDetailsModal's "Approved" green pill */
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

/* Simple line icons — identical set to ViewDetailsModal */
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
  edit: (
    <IconSvg size={15}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
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
  clock: (
    <IconSvg>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </IconSvg>
  ),
};

/* ================================================================== */
/*  Field label map — used for the audit log + Review & Save diff        */
/* ================================================================== */
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

const RELEASED_DOC_OPTIONS = [
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
];

const STATUS_OPTIONS = [
  "APPROVED",
  "COMPLETED",
  "PENDING",
  "ON-PROCESS",
  "REJECTED",
  "DENIED",
];

/* ================================================================== */
/*  Date input (native, styled inline)                                  */
/* ================================================================== */
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
/*  Accordion Section — no longer clips its children, so dropdowns,     */
/*  selects, and other floating panels aren't cut off at the edges.     */
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
        // ⚠️ no overflow: "hidden" here anymore — that was clipping
        // the CountryDropdown's floating list inside Importer/Distributor.
      }}
    >
      <button
        type="button"
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
          borderRadius: open ? "8px 8px 0 0" : "8px",
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
            style={{ fontSize: "0.78rem", fontWeight: "700", color: ACCENT }}
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
            borderRadius: "0 0 8px 8px",
            position: "relative",
            zIndex: 1,
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

/* ================================================================== */
/*  Editable Label:Value row — same look as ViewDetailsModal's LVRow,    */
/*  but the value slot becomes an inline-editable control.               */
/* ================================================================== */
function LVEdit({
  label,
  field,
  value,
  onChange,
  colors,
  wide = false,
  fullWidth = false,
  type = "text",
  readOnly = false,
  options = null,
}) {
  const labelWidth = useContext(LabelWidthContext);
  const isEmpty = !value;

  const baseStyle = {
    color: readOnly ? colors.textTertiary : colors.textPrimary,
    fontStyle: readOnly && isEmpty ? "italic" : "normal",
    fontWeight: 500,
    fontSize: "0.7rem",
    fontFamily: "inherit",
    background: "transparent",
    outline: "none",
    padding: "0.05rem 0",
    width: "100%",
    boxSizing: "border-box",
  };

  const inlineStyle = {
    ...baseStyle,
    border: "none",
    borderBottom: `1px dashed ${colors.cardBorder}`,
    cursor: "text",
  };

  const handleFocus = (e) => (e.currentTarget.style.borderBottomColor = ACCENT);
  const handleBlur = (e) =>
    (e.currentTarget.style.borderBottomColor = colors.cardBorder);

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
          paddingTop: wide ? "0.15rem" : 0,
        }}
      >
        {label}
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

      {readOnly ? (
        <span style={baseStyle}>{value || "N/A"}</span>
      ) : type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          style={{ ...inlineStyle, cursor: "pointer" }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          <option value="">— Select —</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          rows={2}
          style={{
            ...baseStyle,
            border: `1px dashed ${colors.cardBorder}`,
            borderRadius: "5px",
            padding: "0.3rem 0.45rem",
            resize: "vertical",
            whiteSpace: "pre-wrap",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = ACCENT)}
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = colors.cardBorder)
          }
        />
      ) : type === "country" ? (
        <div style={{ flex: 1, position: "relative", zIndex: 60 }}>
          <CountryDropdown
            value={value}
            onChange={(v) => onChange(field, v)}
            colors={colors}
            accentColor={ACCENT}
            isActive={Boolean(value && value.trim() !== "")}
          />
        </div>
      ) : type === "date" ? (
        <DateInput
          value={value}
          onChange={(v) => onChange(field, v)}
          style={inlineStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          style={inlineStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      )}
    </div>
  );
}

function LVGrid({ children }) {
  return (
    <div
      className="erm-lv-grid"
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

/* Small inline editable field used inside the top status bar */
function BarInput({ value, onChange, colors, width = "130px", placeholder }) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontSize: "0.78rem",
        fontWeight: "700",
        color: colors.textPrimary,
        background: "transparent",
        border: "none",
        borderBottom: `1px dashed ${colors.cardBorder}`,
        outline: "none",
        padding: "0.1rem 0",
        width,
        fontFamily: "inherit",
      }}
      onFocus={(e) => (e.currentTarget.style.borderBottomColor = ACCENT)}
      onBlur={(e) =>
        (e.currentTarget.style.borderBottomColor = colors.cardBorder)
      }
    />
  );
}

/* Status pill <select> — same visual as ViewDetailsModal's status badge */
function StatusSelect({ value, onChange }) {
  const tone = statusTone(value);
  const known = STATUS_OPTIONS.includes((value || "").toUpperCase());
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.15rem 0.5rem",
        background: tone.bg,
        borderRadius: "999px",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: tone.dot,
        }}
      />
      <select
        value={value}
        onChange={(e) => onChange("DB_APP_STATUS", e.target.value)}
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          color: tone.color,
          fontSize: "0.65rem",
          fontWeight: "700",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {!known && value && <option value={value}>{value}</option>}
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </span>
  );
}

/* ================================================================== */
/*  Step Progress Bar — same accent color as the rest of this modal      */
/* ================================================================== */
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
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.68rem",
                fontWeight: "700",
                flexShrink: 0,
                transition: "all 0.3s ease",
                background: isCompleted
                  ? "#10b981"
                  : isActive
                    ? ACCENT
                    : colors.inputBg,
                border: isCompleted
                  ? "2px solid #10b981"
                  : isActive
                    ? `2px solid ${ACCENT}`
                    : `2px solid ${colors.cardBorder}`,
                color: isCompleted || isActive ? "#fff" : colors.textTertiary,
              }}
            >
              {isCompleted ? "✓" : stepNum}
            </div>
            <span
              style={{
                marginLeft: "0.4rem",
                marginRight: i < steps.length - 1 ? "0.4rem" : 0,
                fontSize: "0.65rem",
                fontWeight: isActive ? "700" : "500",
                color: isActive
                  ? ACCENT
                  : isCompleted
                    ? "#10b981"
                    : colors.textTertiary,
                whiteSpace: "nowrap",
              }}
            >
              {step}
            </span>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: "2px",
                  background: isCompleted ? "#10b981" : colors.cardBorder,
                  margin: "0 4px",
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
/*  Step 1 — All Details, editable (mirrors ViewDetailsModal's           */
/*  AllDetails layout exactly: status bar + 60/40 two-column accordion)  */
/* ================================================================== */
function AllDetailsEdit({ formData, handleChange, colors }) {
  const { status, days } = calculateStatusTimeline(formData);
  const ok = status === "WITHIN";

  const companySections = [
    {
      title: "Manufacturer",
      fields: {
        name: "DB_PROD_MANU",
        country: "DB_PROD_MANU_COUNTRY",
        lto: "DB_PROD_MANU_LTO_NO",
        tin: "DB_PROD_MANU_TIN",
        add: "DB_PROD_MANU_ADD",
      },
    },
    {
      title: "Trader",
      fields: {
        name: "DB_PROD_TRADER",
        country: "DB_PROD_TRADER_COUNTRY",
        lto: "DB_PROD_TRADER_LTO_NO",
        tin: "DB_PROD_TRADER_TIN",
        add: "DB_PROD_TRADER_ADD",
      },
    },
    {
      title: "Importer",
      fields: {
        name: "DB_PROD_IMPORTER",
        country: "DB_PROD_IMPORTER_COUNTRY",
        lto: "DB_PROD_IMPORTER_LTO_NO",
        tin: "DB_PROD_IMPORTER_TIN",
        add: "DB_PROD_IMPORTER_ADD",
      },
    },
    {
      title: "Distributor",
      fields: {
        name: "DB_PROD_DISTRI",
        country: "DB_PROD_DISTRI_COUNTRY",
        lto: "DB_PROD_DISTRI_LTO_NO",
        tin: "DB_PROD_DISTRI_TIN",
        add: "DB_PROD_DISTRI_ADD",
      },
    },
    {
      title: "Repacker",
      fields: {
        name: "DB_PROD_REPACKER",
        country: "DB_PROD_REPACKER_COUNTRY",
        lto: "DB_PROD_REPACKER_LTO_NO",
        tin: "DB_PROD_REPACKER_TIN",
        add: "DB_PROD_REPACKER_ADD",
      },
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Status bar — mirrors the reference top row, editable in place */}
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
            style={{
              fontSize: "0.78rem",
              fontWeight: "700",
              color: colors.textPrimary,
            }}
          >
            {formData.DB_DTN || "N/A"}
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
          <StatusSelect
            value={formData.DB_APP_STATUS}
            onChange={handleChange}
          />
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
          <BarInput
            value={formData.DB_OLD_RSN}
            onChange={(v) => handleChange("DB_OLD_RSN", v)}
            colors={colors}
            width="100px"
          />
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
          <BarInput
            value={formData.DB_REG_NO}
            onChange={(v) => handleChange("DB_REG_NO", v)}
            colors={colors}
            width="140px"
          />
        </div>

        {formData.DB_TIMELINE_CITIZEN_CHARTER && (
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
              {formData.DB_TIMELINE_CITIZEN_CHARTER} working days
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

      {/* Two-column layout: left = Establishment/Product/Fees/Companies (60%), right = Application/Processing/Released/CPR/Amendments (40%) */}
      <style>{`
        .erm-two-col { display: flex; gap: 0.75rem; align-items: flex-start; flex-wrap: nowrap; }
        .erm-col-left, .erm-col-right { min-width: 0; display: flex; flex-direction: column; }
        .erm-col-left { flex: 1 1 60%; }
        .erm-col-right { flex: 0 0 40%; }
        @media (max-width: 760px) {
          .erm-two-col { flex-direction: column; }
          .erm-col-left, .erm-col-right { flex: 1 1 100%; width: 100%; }
          .erm-lv-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="erm-two-col">
        <div className="erm-col-left">
          {/* Establishment Information */}
          <AccordionSection
            icon={Icons.info}
            title="Establishment Information"
            colors={colors}
            labelWidth={95}
          >
            <LVGrid>
              <LVEdit
                label="Category"
                field="DB_EST_CAT"
                value={formData.DB_EST_CAT}
                onChange={handleChange}
                colors={colors}
                fullWidth
              />
              <LVEdit
                label="LTO Number"
                field="DB_EST_LTO_NO"
                value={formData.DB_EST_LTO_NO}
                onChange={handleChange}
                colors={colors}
              />
              <LVEdit
                label="LTO Validity"
                field="DB_EST_VALIDITY"
                value={formData.DB_EST_VALIDITY}
                onChange={handleChange}
                colors={colors}
                type="date"
              />
              <LVEdit
                label="Company"
                field="DB_EST_LTO_COMP"
                value={formData.DB_EST_LTO_COMP}
                onChange={handleChange}
                colors={colors}
                fullWidth
              />
              <LVEdit
                label="Address"
                field="DB_EST_LTO_ADD"
                value={formData.DB_EST_LTO_ADD}
                onChange={handleChange}
                colors={colors}
                wide
                fullWidth
                type="textarea"
              />
              <LVEdit
                label="Email Address"
                field="DB_EST_EADD"
                value={formData.DB_EST_EADD}
                onChange={handleChange}
                colors={colors}
                wide
                fullWidth
                type="textarea"
              />
              <LVEdit
                label="TIN"
                field="DB_EST_TIN"
                value={formData.DB_EST_TIN}
                onChange={handleChange}
                colors={colors}
              />
              <LVEdit
                label="Contact No."
                field="DB_EST_CONTACT_NO"
                value={formData.DB_EST_CONTACT_NO}
                onChange={handleChange}
                colors={colors}
                wide
                fullWidth
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
              <LVEdit
                label="Brand Name"
                field="DB_PROD_BR_NAME"
                value={formData.DB_PROD_BR_NAME}
                onChange={handleChange}
                colors={colors}
              />
              <LVEdit
                label="Generic Name"
                field="DB_PROD_GEN_NAME"
                value={formData.DB_PROD_GEN_NAME}
                onChange={handleChange}
                colors={colors}
              />
              <LVEdit
                label="Dosage Strength"
                field="DB_PROD_DOS_STR"
                value={formData.DB_PROD_DOS_STR}
                onChange={handleChange}
                colors={colors}
                wide
                fullWidth
                type="textarea"
              />
              <LVEdit
                label="Dosage Form"
                field="DB_PROD_DOS_FORM"
                value={formData.DB_PROD_DOS_FORM}
                onChange={handleChange}
                colors={colors}
                wide
                fullWidth
                type="textarea"
              />
              <LVEdit
                label="Classification"
                field="DB_PROD_CLASS_PRESCRIP"
                value={formData.DB_PROD_CLASS_PRESCRIP}
                onChange={handleChange}
                colors={colors}
              />
              <LVEdit
                label="Essential Drug"
                field="DB_PROD_ESS_DRUG_LIST"
                value={formData.DB_PROD_ESS_DRUG_LIST}
                onChange={handleChange}
                colors={colors}
              />
              <LVEdit
                label="Shelf Life"
                field="DB_PROD_DISTRI_SHELF_LIFE"
                value={formData.DB_PROD_DISTRI_SHELF_LIFE}
                onChange={handleChange}
                colors={colors}
              />
              <LVEdit
                label="Pharma Category"
                field="DB_PROD_PHARMA_CAT"
                value={formData.DB_PROD_PHARMA_CAT}
                onChange={handleChange}
                colors={colors}
              />
              <LVEdit
                label="Pharma Prod. Cat."
                field="DB_PHARMA_PROD_CAT"
                value={formData.DB_PHARMA_PROD_CAT}
                onChange={handleChange}
                colors={colors}
              />
              <LVEdit
                label="Pharma Prod. Label"
                field="DB_PHARMA_PROD_CAT_LABEL"
                value={formData.DB_PHARMA_PROD_CAT_LABEL}
                onChange={handleChange}
                colors={colors}
              />
              <LVEdit
                label="Product Category"
                field="DB_PROD_CAT"
                value={formData.DB_PROD_CAT}
                onChange={handleChange}
                colors={colors}
              />
              <LVEdit
                label="File"
                field="DB_FILE"
                value={formData.DB_FILE}
                onChange={handleChange}
                colors={colors}
              />
              <LVEdit
                label="Storage Condition"
                field="DB_STORAGE_COND"
                value={formData.DB_STORAGE_COND}
                onChange={handleChange}
                colors={colors}
                wide
                fullWidth
                type="textarea"
              />
              <LVEdit
                label="Packaging"
                field="DB_PACKAGING"
                value={formData.DB_PACKAGING}
                onChange={handleChange}
                colors={colors}
                wide
                fullWidth
                type="textarea"
              />
              <LVEdit
                label="Suggested RP"
                field="DB_SUGG_RP"
                value={formData.DB_SUGG_RP}
                onChange={handleChange}
                colors={colors}
                type="number"
              />
              <LVEdit
                label="No. of Samples"
                field="DB_NO_SAMPLE"
                value={formData.DB_NO_SAMPLE}
                onChange={handleChange}
                colors={colors}
                type="number"
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
              <LVEdit
                label="Fee"
                field="DB_FEE"
                value={formData.DB_FEE}
                onChange={handleChange}
                colors={colors}
              />
              <LVEdit
                label="LRF"
                field="DB_LRF"
                value={formData.DB_LRF}
                onChange={handleChange}
                colors={colors}
              />
              <LVEdit
                label="SURC"
                field="DB_SURC"
                value={formData.DB_SURC}
                onChange={handleChange}
                colors={colors}
              />
              <LVEdit
                label="Total"
                field="DB_TOTAL"
                value={formData.DB_TOTAL}
                onChange={handleChange}
                colors={colors}
              />
              <LVEdit
                label="OR No."
                field="DB_OR_NO"
                value={formData.DB_OR_NO}
                onChange={handleChange}
                colors={colors}
              />
              <LVEdit
                label="Date Issued"
                field="DB_DATE_ISSUED"
                value={formData.DB_DATE_ISSUED}
                onChange={handleChange}
                colors={colors}
                type="date"
              />
            </LVGrid>
          </AccordionSection>

          {/* Manufacturer / Trader / Importer / Distributor / Repacker */}
          {companySections.map(({ title, fields }) => (
            <AccordionSection
              key={title}
              icon={Icons.company}
              title={title}
              colors={colors}
              labelWidth={70}
            >
              <LVGrid>
                <LVEdit
                  label="Name"
                  field={fields.name}
                  value={formData[fields.name]}
                  onChange={handleChange}
                  colors={colors}
                />
                <LVEdit
                  label="Country"
                  field={fields.country}
                  value={formData[fields.country]}
                  onChange={handleChange}
                  colors={colors}
                  type="country"
                />
                <LVEdit
                  label="LTO No."
                  field={fields.lto}
                  value={formData[fields.lto]}
                  onChange={handleChange}
                  colors={colors}
                />
                <LVEdit
                  label="TIN"
                  field={fields.tin}
                  value={formData[fields.tin]}
                  onChange={handleChange}
                  colors={colors}
                />
              </LVGrid>
              <LVEdit
                label="Address"
                field={fields.add}
                value={formData[fields.add]}
                onChange={handleChange}
                colors={colors}
                wide
                type="textarea"
              />
            </AccordionSection>
          ))}
        </div>

        <div className="erm-col-right">
          {/* Application Information */}
          <AccordionSection
            icon={Icons.hash}
            title="Application Information"
            colors={colors}
            labelWidth={135}
          >
            <LVEdit
              label="Processing Type"
              field="DB_PROCESSING_TYPE"
              value={formData.DB_PROCESSING_TYPE}
              onChange={handleChange}
              colors={colors}
            />
            <LVEdit
              label="Date Received FDAC"
              field="DB_DATE_RECEIVED_FDAC"
              value={formData.DB_DATE_RECEIVED_FDAC}
              onChange={handleChange}
              colors={colors}
              type="date"
              fullWidth
            />
            <LVEdit
              label="Date Received Central"
              field="DB_DATE_RECEIVED_CENT"
              value={formData.DB_DATE_RECEIVED_CENT}
              onChange={handleChange}
              colors={colors}
              type="date"
              wide
              fullWidth
            />
            <LVEdit
              label="Application Type"
              field="DB_APP_TYPE"
              value={formData.DB_APP_TYPE}
              onChange={handleChange}
              colors={colors}
            />
            <LVEdit
              label="Mother App Type"
              field="DB_MOTHER_APP_TYPE"
              value={formData.DB_MOTHER_APP_TYPE}
              onChange={handleChange}
              colors={colors}
            />
            <LVEdit
              label="Certification"
              field="DB_CERTIFICATION"
              value={formData.DB_CERTIFICATION}
              onChange={handleChange}
              colors={colors}
              fullWidth
            />
            <LVEdit
              label="Class"
              field="DB_CLASS"
              value={formData.DB_CLASS}
              onChange={handleChange}
              colors={colors}
            />
            <LVEdit
              label="MO"
              field="DB_MO"
              value={formData.DB_MO}
              onChange={handleChange}
              colors={colors}
            />
          </AccordionSection>

          {/* Processing & Evaluation */}
          <AccordionSection
            icon={Icons.clock}
            title="Processing & Evaluation"
            colors={colors}
            labelWidth={130}
          >
            <LVEdit
              label="Date Deck"
              field="DB_DATE_DECK"
              value={formData.DB_DATE_DECK}
              onChange={handleChange}
              colors={colors}
              type="date"
            />
            <LVEdit
              label="Decking Schedule"
              field="DB_DECKING_SCHED"
              value={formData.DB_DECKING_SCHED}
              onChange={handleChange}
              colors={colors}
              type="date"
            />
            <LVEdit
              label="Evaluator"
              field="DB_EVAL"
              value={formData.DB_EVAL}
              onChange={handleChange}
              colors={colors}
            />
            <LVEdit
              label="Date Remarks"
              field="DB_DATE_REMARKS"
              value={formData.DB_DATE_REMARKS}
              onChange={handleChange}
              colors={colors}
              type="date"
            />
          </AccordionSection>

          {/* Released Information */}
          <AccordionSection
            icon={Icons.check}
            title="Released Information"
            colors={colors}
            labelWidth={160}
          >
            <LVEdit
              label="Type of Document Released"
              field="DB_TYPE_DOC_RELEASED"
              value={formData.DB_TYPE_DOC_RELEASED}
              onChange={handleChange}
              colors={colors}
              type="select"
              options={RELEASED_DOC_OPTIONS}
            />
            <LVEdit
              label="Attachments Released"
              field="DB_ATTA_RELEASED"
              value={formData.DB_ATTA_RELEASED}
              onChange={handleChange}
              colors={colors}
            />
            <LVEdit
              label="SECPA"
              field="DB_SECPA"
              value={formData.DB_SECPA}
              onChange={handleChange}
              colors={colors}
            />
            <LVEdit
              label="Expiry"
              field="DB_SECPA_EXP_DATE"
              value={formData.DB_SECPA_EXP_DATE}
              onChange={handleChange}
              colors={colors}
              type="date"
            />
            <LVEdit
              label="Issued On"
              field="DB_SECPA_ISSUED_ON"
              value={formData.DB_SECPA_ISSUED_ON}
              onChange={handleChange}
              colors={colors}
              type="date"
            />
            <LVEdit
              label="Date Released by CDRR"
              field="DB_DATE_RELEASED"
              value={formData.DB_DATE_RELEASED}
              onChange={handleChange}
              colors={colors}
              type="date"
            />
          </AccordionSection>

          {/* CPR Conditions */}
          <AccordionSection
            icon={Icons.info}
            title="CPR Conditions"
            colors={colors}
            labelWidth={140}
          >
            <LVEdit
              label="CPR Condition/s"
              field="DB_CPR_COND"
              value={formData.DB_CPR_COND}
              onChange={handleChange}
              colors={colors}
              wide
              type="textarea"
            />
            <LVEdit
              label="CPR Condition Remarks"
              field="DB_CPR_COND_REMARKS"
              value={formData.DB_CPR_COND_REMARKS}
              onChange={handleChange}
              colors={colors}
              wide
              type="textarea"
            />
            <LVEdit
              label="Additional Remarks"
              field="DB_CPR_COND_ADD_REMARKS"
              value={formData.DB_CPR_COND_ADD_REMARKS}
              onChange={handleChange}
              colors={colors}
              wide
              type="textarea"
            />
          </AccordionSection>

          {/* Amendments & Remarks */}
          <AccordionSection
            icon={Icons.edit}
            title="Amendments & Remarks"
            colors={colors}
            labelWidth={125}
          >
            <LVEdit
              label="Amendment 1"
              field="DB_AMMEND_1"
              value={formData.DB_AMMEND_1}
              onChange={handleChange}
              colors={colors}
            />
            <LVEdit
              label="Amendment 2"
              field="DB_AMMEND_2"
              value={formData.DB_AMMEND_2}
              onChange={handleChange}
              colors={colors}
            />
            <LVEdit
              label="Amendment 3"
              field="DB_AMMEND_3"
              value={formData.DB_AMMEND_3}
              onChange={handleChange}
              colors={colors}
            />
            <LVEdit
              label="Application Remarks"
              field="DB_APP_REMARKS"
              value={formData.DB_APP_REMARKS}
              onChange={handleChange}
              colors={colors}
              wide
              type="textarea"
            />
            <LVEdit
              label="General Remarks"
              field="DB_REMARKS_1"
              value={formData.DB_REMARKS_1}
              onChange={handleChange}
              colors={colors}
              wide
              type="textarea"
            />
          </AccordionSection>

          {/* Metadata (read-only) */}
          <AccordionSection
            icon={Icons.info}
            title="Metadata"
            colors={colors}
            labelWidth={120}
            defaultOpen={false}
          >
            <LVEdit
              label="Status Timeline"
              value={formData.DB_STATUS_TIMELINE}
              colors={colors}
              readOnly
            />
            <LVEdit
              label="Uploaded By"
              value={formData.DB_USER_UPLOADER}
              colors={colors}
              readOnly
            />
            <LVEdit
              label="Upload Date"
              value={formatDate(formData.DB_DATE_EXCEL_UPLOAD)}
              colors={colors}
              readOnly
            />
          </AccordionSection>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Step 2 — Review & Save (diff view, same visual language as Step 1)  */
/* ================================================================== */
function DiffRow({ label, oldValue, newValue, colors, labelWidth = 90 }) {
  const oldEmpty = !oldValue || oldValue === "—";
  const newEmpty = !newValue || newValue === "—";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <div
        style={{
          display: "flex",
          fontSize: "0.7rem",
          gap: "0.35rem",
          alignItems: "flex-start",
        }}
      >
        <span
          style={{
            flexShrink: 0,
            width: `${labelWidth}px`,
            color: "#7a8190",
            whiteSpace: "nowrap",
            paddingTop: "0.1rem",
          }}
        >
          {label}
        </span>
        <span style={{ color: "#7a8190", flexShrink: 0, paddingTop: "0.1rem" }}>
          :
        </span>
        <span
          style={{
            color: colors.textTertiary,
            fontWeight: 500,
            fontStyle: "italic",
            wordBreak: "break-word",
            flex: 1,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#dc2626",
              marginRight: "0.4rem",
            }}
          />
          <span
            style={{
              color: "#dc2626",
              fontStyle: oldEmpty ? "italic" : "normal",
              opacity: oldEmpty ? 0.6 : 1,
            }}
          >
            {oldValue}
          </span>
        </span>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: "0.7rem",
          gap: "0.35rem",
          alignItems: "flex-start",
        }}
      >
        <span style={{ flexShrink: 0, width: `${labelWidth}px` }} />
        <span style={{ flexShrink: 0, opacity: 0 }}>:</span>
        <span style={{ wordBreak: "break-word", flex: 1 }}>
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#16a34a",
              marginRight: "0.4rem",
            }}
          />
          <span
            style={{
              color: "#16a34a",
              fontWeight: 600,
              fontStyle: newEmpty ? "italic" : "normal",
              opacity: newEmpty ? 0.6 : 1,
            }}
          >
            {newValue}
          </span>
        </span>
      </div>
    </div>
  );
}

function ReviewAndSave({ formData, originalData, colors }) {
  const changedFields = Object.keys(FIELD_LABEL_MAP).filter(
    (k) => String(formData[k] ?? "") !== String(originalData[k] ?? ""),
  );

  if (changedFields.length === 0) {
    return (
      <div
        style={{
          padding: "0.75rem 0.9rem",
          background: colors.inputBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          padding: "3rem 1.5rem",
        }}
      >
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: ICON_CIRCLE_BG,
            color: ACCENT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {Icons.check}
        </span>
        <p
          style={{
            fontSize: "0.78rem",
            fontWeight: "700",
            color: colors.textPrimary,
            margin: 0,
          }}
        >
          No Changes Detected
        </p>
        <p
          style={{
            fontSize: "0.7rem",
            color: colors.textTertiary,
            margin: 0,
            textAlign: "center",
          }}
        >
          You haven't modified any fields. Go back to make changes.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Summary bar — mirrors the status bar in Step 1 */}
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
            style={{
              fontSize: "0.78rem",
              fontWeight: "700",
              color: colors.textPrimary,
            }}
          >
            {formData.DB_DTN || "N/A"}
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
            Fields Changed
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.2rem 0.6rem",
              background: ICON_CIRCLE_BG,
              color: ACCENT,
              borderRadius: "999px",
              fontSize: "0.65rem",
              fontWeight: "700",
            }}
          >
            {changedFields.length} field{changedFields.length > 1 ? "s" : ""}
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
            Legend
          </div>
          <div
            style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.65rem",
                color: colors.textTertiary,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#dc2626",
                  display: "inline-block",
                }}
              />
              Original
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.65rem",
                color: colors.textTertiary,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#16a34a",
                  display: "inline-block",
                }}
              />
              New Value
            </span>
          </div>
        </div>
      </div>

      {/* Diff list — same accordion-card look as Step 1 sections */}
      <div>
        {changedFields.map((fieldKey) => {
          const label = FIELD_LABEL_MAP[fieldKey] || fieldKey;
          const oldVal = String(originalData[fieldKey] ?? "") || "—";
          const newVal = String(formData[fieldKey] ?? "") || "—";

          return (
            <div
              key={fieldKey}
              style={{
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: "8px",
                marginBottom: "0.65rem",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "0.55rem 0.9rem",
                  background: colors.cardBg,
                  borderBottom: `1px solid ${colors.cardBorder}`,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.55rem",
                }}
              >
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
                  {Icons.edit}
                </span>
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: "700",
                    color: ACCENT,
                  }}
                >
                  {label}
                </span>
              </div>
              <div
                style={{ padding: "0.8rem 0.9rem", background: colors.cardBg }}
              >
                <DiffRow
                  label="Value"
                  oldValue={oldVal}
                  newValue={newVal}
                  colors={colors}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note — same tone/size as rest of modal */}
      <div
        style={{
          padding: "0.65rem 0.9rem",
          background: ACCENT_BG,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "8px",
          fontSize: "0.7rem",
          color: colors.textTertiary,
        }}
      >
        All changes above will be{" "}
        <strong style={{ color: colors.textPrimary }}>
          logged in the audit trail
        </strong>{" "}
        upon saving. Click{" "}
        <strong style={{ color: colors.textPrimary }}>Save Changes</strong> to
        confirm, or go back to continue editing.
      </div>
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

  const STEPS = ["Details", "Review & Save"];
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
              {Icons.edit}
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
                {currentStep === 1
                  ? "Edit Application Details"
                  : "Review Changes"}
              </h2>
              <p
                style={{
                  fontSize: "0.65rem",
                  color: colors.textTertiary,
                  margin: "0.1rem 0 0",
                }}
              >
                DTN:{" "}
                <strong style={{ color: ACCENT }}>
                  {formData.DB_DTN || "N/A"}
                </strong>
                {changedCount > 0 && (
                  <span
                    style={{
                      marginLeft: "0.5rem",
                      padding: "0.05rem 0.4rem",
                      background: "#fef3c7",
                      color: "#b45309",
                      borderRadius: "4px",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                    }}
                  >
                    ✎ {changedCount} unsaved
                  </span>
                )}
              </p>
            </div>
          </div>

          <div style={{ flex: 1, maxWidth: "220px" }}>
            <StepIndicator
              currentStep={currentStep}
              steps={STEPS}
              colors={colors}
            />
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
          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "8px",
                padding: "0.75rem 0.9rem",
                marginBottom: "0.85rem",
                color: "#EF4444",
                fontSize: "0.75rem",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {currentStep === 1 && (
            <AllDetailsEdit
              formData={formData}
              handleChange={handleChange}
              colors={colors}
            />
          )}
          {currentStep === 2 && (
            <ReviewAndSave
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
            padding: "0.75rem 1.25rem",
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
              fontSize: "0.7rem",
              color: colors.textTertiary,
              fontWeight: "600",
            }}
          >
            {currentStep === 2 ? (
              changedCount > 0 ? (
                <span style={{ color: "#f59e0b" }}>
                  ✎ {changedCount} field{changedCount > 1 ? "s" : ""} modified —
                  review above before saving
                </span>
              ) : (
                "No changes to save"
              )
            ) : changedCount > 0 ? (
              <span style={{ color: "#f59e0b" }}>
                ✎ {changedCount} field{changedCount > 1 ? "s" : ""} modified
              </span>
            ) : (
              `Step ${currentStep} of ${totalSteps}`
            )}
          </span>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {currentStep === 1 ? (
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
                Cancel
              </button>
            ) : (
              <button
                onClick={goPrev}
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
                ← Back
              </button>
            )}

            {currentStep < totalSteps ? (
              <button
                onClick={goNext}
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
                Review Changes →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving || changedCount === 0}
                style={{
                  padding: "0.5rem 1.2rem",
                  background:
                    saving || changedCount === 0
                      ? colors.cardBorder
                      : "#10b981",
                  border: "none",
                  borderRadius: "7px",
                  color: "#fff",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  cursor:
                    saving || changedCount === 0 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
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
