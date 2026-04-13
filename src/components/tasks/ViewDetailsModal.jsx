// ViewDetailsModal.jsx
import { useState, useEffect } from "react";
import { getUsersByGroup, getUser } from "../../api/auth";
import {
  createApplicationLog,
  updateApplicationLog,
  getLastApplicationLogIndex,
} from "../../api/application-logs";
import {
  createFieldAuditLog,
  computeFieldChanges,
} from "../../api/field-audit-logs";

import { updateUploadReport, getApplicationLogs } from "../../api/reports";
/* ================================================================== */
/*  Workflow Config                                                      */
/* ================================================================== */
const WORKFLOW = {
  "Quality Evaluation": {
    "For Compliance": "Compliance",
    "Endorse to Checker": "Checking",
  },
  Compliance: {
    "For Compliance": "Compliance",
    "Endorse to Checker": "Checking",
  },
  Checking: {
    "Return to Evaluator": "Quality Evaluation",
    "Endorse to Supervisor": "Supervisor",
  },
  Supervisor: {
    default: "QA Admin",
    "Return to Evaluator": "Quality Evaluation",
  },
  "QA Admin": {
    default: "LRD Chief Admin",
    "Return to Evaluator": "Quality Evaluation",
  },
  "LRD Chief Admin": { default: "OD-Receiving" },
  "OD-Receiving": { default: "OD-Releasing" },
  "OD-Releasing": { default: "Releasing Officer" },
  "Releasing Officer": { default: null },
};

const STEP_GROUP_MAP = {
  "Quality Evaluation": 3,
  Compliance: 4,
  Checking: 4,
  Supervisor: 5,
  "QA Admin": 16,
  "LRD Chief Admin": 17,
  "OD-Receiving": 18,
  "OD-Releasing": 19,
  "Releasing Officer": 8,
  Record: 15,
};

const DEFAULT_WORKING_DAYS = 20;

const addWorkingDays = (startDateStr, days) => {
  if (!days || days <= 0) return "";
  let count = 0;
  const current = new Date(startDateStr + "T00:00:00");
  while (count < days) {
    current.setDate(current.getDate() + 1);
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return current.toISOString().split("T")[0];
};

const countWorkingDays = (startDateStr, endDateStr) => {
  if (!endDateStr) return 0;
  let count = 0;
  const current = new Date(startDateStr + "T00:00:00");
  const end = new Date(endDateStr + "T00:00:00");
  if (end <= current) return 0;
  while (current < end) {
    current.setDate(current.getDate() + 1);
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
};

const todayStr = () => new Date().toISOString().split("T")[0];

const fmtDeadline = (str) => {
  if (!str) return "";
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const deadlineUrgency = (deadlineDateStr) => {
  if (!deadlineDateStr) return null;
  const today = new Date(todayStr() + "T00:00:00");
  const end = new Date(deadlineDateStr + "T00:00:00");
  if (end < today) return "overdue";
  const wdays = countWorkingDays(todayStr(), deadlineDateStr);
  if (wdays <= 3) return "critical";
  if (wdays <= 5) return "warning";
  return "ok";
};

const getNextStep = (currentStep, decision) => {
  const config = WORKFLOW[currentStep];
  if (!config) return null;
  return config[decision] ?? config.default ?? null;
};

/* ================================================================== */
/*  Edit Access Config                                                   */
/* ================================================================== */
const EDITABLE_STEPS = [
  "Quality Evaluation",
  "Checking",
  "Supervisor",
  "Releasing Officer",
  "QA Admin",
];

const EDITABLE_FIELDS = [
  "estCat",
  "ltoNo",
  "tin",
  "eadd",
  "contactNo",
  "ltoAdd",
  "prodDosStr",
  "prodPharmaCat",
  "prodEssDrugList",
  "prodCat",
  "pharmaProdCat",
  "pharmaProdCatLabel",
  "file",
  "prodManu",
  "prodManuCountry",
  "prodManuLtoNo",
  "prodManuTin",
  "prodManuAdd",
  "prodTrader",
  "prodTraderCountry",
  "prodTraderLtoNo",
  "prodTraderTin",
  "prodTraderAdd",
  "prodImporter",
  "prodImporterCountry",
  "prodImporterLtoNo",
  "prodImporterTin",
  "prodImporterAdd",
  "prodDistri",
  "prodDistriCountry",
  "prodDistriLtoNo",
  "prodDistriTin",
  "prodDistriShelfLife",
  "prodDistriAdd",
  "prodRepacker",
  "prodRepackerCountry",
  "prodRepackerLtoNo",
  "prodRepackerTin",
  "prodRepackerAdd",
  "ltoCompany",
  "appType",
  "prodDosForm",
  "prodClassPrescript",
  "appStatus",
  "processingType",
  "appRemarks",
  "remarks1",
  "cprCond",
  "cprCondRemarks",
  "cprCondAddRemarks",
  "storageCond",
  "packaging",
  "suggRp",
  "noSample",
  "ammend1",
  "ammend2",
  "ammend3",
  "regNo",
  "motherAppType",
  "oldRsn",
  "certification",
  "class",
  "mo",
  "fee",
  "lrf",
  "surc",
  "total",
  "orNo",
  "secpa",
  "validity",
  "prodBrName",
  "prodGenName",
];

const FIELD_LABEL_MAP = {
  estCat: "Category",
  ltoNo: "LTO No.",
  tin: "TIN",
  eadd: "Email",
  contactNo: "Contact No.",
  ltoAdd: "LTO Address",
  prodDosStr: "Dosage Strength",
  prodPharmaCat: "Pharma Category",
  prodEssDrugList: "Essential Drug",
  prodCat: "Product Category",
  pharmaProdCat: "Pharma Prod. Cat.",
  pharmaProdCatLabel: "Pharma Prod. Label",
  file: "File",
  prodManu: "Manufacturer",
  prodManuCountry: "Manufacturer Country",
  prodManuLtoNo: "Manufacturer LTO No.",
  prodManuTin: "Manufacturer TIN",
  prodManuAdd: "Manufacturer Address",
  prodTrader: "Trader",
  prodTraderCountry: "Trader Country",
  prodTraderLtoNo: "Trader LTO No.",
  prodTraderTin: "Trader TIN",
  prodTraderAdd: "Trader Address",
  prodImporter: "Importer",
  prodImporterCountry: "Importer Country",
  prodImporterLtoNo: "Importer LTO No.",
  prodImporterTin: "Importer TIN",
  prodImporterAdd: "Importer Address",
  prodDistri: "Distributor",
  prodDistriCountry: "Distributor Country",
  prodDistriLtoNo: "Distributor LTO No.",
  prodDistriTin: "Distributor TIN",
  prodDistriShelfLife: "Shelf Life",
  prodDistriAdd: "Distributor Address",
  prodRepacker: "Repacker",
  prodRepackerCountry: "Repacker Country",
  prodRepackerLtoNo: "Repacker LTO No.",
  prodRepackerTin: "Repacker TIN",
  prodRepackerAdd: "Repacker Address",
  ltoCompany: "LTO Company",
  appType: "Application Type",
  prodDosForm: "Dosage Form",
  prodClassPrescript: "Prescription",
  appStatus: "App Status",
  processingType: "Processing Type",
  appRemarks: "Application Remarks",
  remarks1: "General Remarks",
  cprCond: "CPR Condition",
  cprCondRemarks: "CPR Condition Remarks",
  cprCondAddRemarks: "CPR Condition Additional Remarks",
  storageCond: "Storage Condition",
  packaging: "Packaging",
  suggRp: "Suggested RP",
  noSample: "No. of Samples",
  ammend1: "Amendment 1",
  ammend2: "Amendment 2",
  ammend3: "Amendment 3",
  regNo: "Registration No.",
  motherAppType: "Mother App Type",
  oldRsn: "Old RSN",
  certification: "Certification",
  class: "Class",
  mo: "MO",
  fee: "Fee",
  lrf: "LRF",
  surc: "SURC",
  total: "Total",
  orNo: "OR No.",
  secpa: "SECPA",
  validity: "Validity",
};

const FIELD_KEY_TO_DB = {
  estCat: "DB_EST_CAT",
  ltoNo: "DB_EST_LTO_NO",
  tin: "DB_EST_TIN",
  eadd: "DB_EST_EADD",
  contactNo: "DB_EST_CONTACT_NO",
  ltoAdd: "DB_EST_LTO_ADD",
  ltoCompany: "DB_EST_LTO_COMP",
  prodDosStr: "DB_PROD_DOS_STR",
  prodPharmaCat: "DB_PROD_PHARMA_CAT",
  prodEssDrugList: "DB_PROD_ESS_DRUG_LIST",
  prodCat: "DB_PROD_CAT",
  pharmaProdCat: "DB_PHARMA_PROD_CAT",
  pharmaProdCatLabel: "DB_PHARMA_PROD_CAT_LABEL",
  file: "DB_FILE",
  prodManu: "DB_PROD_MANU",
  prodManuCountry: "DB_PROD_MANU_COUNTRY",
  prodManuLtoNo: "DB_PROD_MANU_LTO_NO",
  prodManuTin: "DB_PROD_MANU_TIN",
  prodManuAdd: "DB_PROD_MANU_ADD",
  prodTrader: "DB_PROD_TRADER",
  prodTraderCountry: "DB_PROD_TRADER_COUNTRY",
  prodTraderLtoNo: "DB_PROD_TRADER_LTO_NO",
  prodTraderTin: "DB_PROD_TRADER_TIN",
  prodTraderAdd: "DB_PROD_TRADER_ADD",
  prodImporter: "DB_PROD_IMPORTER",
  prodImporterCountry: "DB_PROD_IMPORTER_COUNTRY",
  prodImporterLtoNo: "DB_PROD_IMPORTER_LTO_NO",
  prodImporterTin: "DB_PROD_IMPORTER_TIN",
  prodImporterAdd: "DB_PROD_IMPORTER_ADD",
  prodDistri: "DB_PROD_DISTRI",
  prodDistriCountry: "DB_PROD_DISTRI_COUNTRY",
  prodDistriLtoNo: "DB_PROD_DISTRI_LTO_NO",
  prodDistriTin: "DB_PROD_DISTRI_TIN",
  prodDistriShelfLife: "DB_PROD_DISTRI_SHELF_LIFE",
  prodDistriAdd: "DB_PROD_DISTRI_ADD",
  prodRepacker: "DB_PROD_REPACKER",
  prodRepackerCountry: "DB_PROD_REPACKER_COUNTRY",
  prodRepackerLtoNo: "DB_PROD_REPACKER_LTO_NO",
  prodRepackerTin: "DB_PROD_REPACKER_TIN",
  prodRepackerAdd: "DB_PROD_REPACKER_ADD",
  appType: "DB_APP_TYPE",
  prodDosForm: "DB_PROD_DOS_FORM",
  prodClassPrescript: "DB_PROD_CLASS_PRESCRIP",
  appStatus: "DB_APP_STATUS",
  processingType: "DB_PROCESSING_TYPE",
  appRemarks: "DB_APP_REMARKS",
  remarks1: "DB_REMARKS_1",
  cprCond: "DB_CPR_COND",
  cprCondRemarks: "DB_CPR_COND_REMARKS",
  cprCondAddRemarks: "DB_CPR_COND_ADD_REMARKS",
  storageCond: "DB_STORAGE_COND",
  packaging: "DB_PACKAGING",
  suggRp: "DB_SUGG_RP",
  noSample: "DB_NO_SAMPLE",
  ammend1: "DB_AMMEND1",
  ammend2: "DB_AMMEND2",
  ammend3: "DB_AMMEND3",
  regNo: "DB_REG_NO",
  motherAppType: "DB_MOTHER_APP_TYPE",
  oldRsn: "DB_OLD_RSN",
  certification: "DB_CERTIFICATION",
  class: "DB_CLASS",
  mo: "DB_MO",
  fee: "DB_FEE",
  lrf: "DB_LRF",
  surc: "DB_SURC",
  total: "DB_TOTAL",
  orNo: "DB_OR_NO",
  secpa: "DB_SECPA",
  validity: "DB_VALIDITY",
};

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
  const {
    dateReceivedCent,
    dateReleased,
    dbTimelineCitizenCharter: tl,
  } = record;
  if (!dateReceivedCent || !tl || dateReceivedCent === "N/A" || tl === null)
    return { status: "", days: 0 };
  const receivedDate = new Date(dateReceivedCent);
  const endDate =
    dateReleased && dateReleased !== "N/A"
      ? new Date(dateReleased)
      : new Date();
  if (isNaN(receivedDate.getTime()) || isNaN(endDate.getTime()))
    return { status: "", days: 0 };
  const diffDays = Math.ceil(Math.abs(endDate - receivedDate) / 864e5);
  return diffDays <= parseInt(tl, 10)
    ? { status: "WITHIN", days: diffDays }
    : { status: "BEYOND", days: diffDays };
};

/* ================================================================== */
/*  Compact size tokens                                                 */
/* ================================================================== */
const SZ = {
  labelFs: "0.62rem",
  valueFs: "0.78rem",
  sectionTitleFs: "0.8rem",
  inputPad: "0.35rem 0.6rem",
  inputMinH: "1.8rem",
  gridGap: "0.6rem",
  sectionMb: "1.2rem",
  badgePad: "0.15rem 0.5rem",
  badgeFs: "0.6rem",
};

/* ================================================================== */
/*  Reusable UI Components                                              */
/* ================================================================== */
function VDSection({ title, children, colors }) {
  return (
    <div style={{ marginBottom: SZ.sectionMb }}>
      <h3
        style={{
          fontSize: SZ.sectionTitleFs,
          fontWeight: "700",
          color: colors.textPrimary,
          marginBottom: "0.6rem",
          paddingBottom: "0.3rem",
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
        gap: SZ.gridGap,
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
          ? { gridColumn: "1 / -1", marginBottom: "0.4rem" }
          : { display: "flex", flexDirection: "column", gap: "0.2rem" }
      }
    >
      <label
        style={{
          fontSize: SZ.labelFs,
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
          padding: SZ.inputPad,
          background: colors.inputBg,
          border: `1px solid ${colors.inputBorder}`,
          borderRadius: "5px",
          color: isNA ? colors.textTertiary : colors.textPrimary,
          fontSize: SZ.valueFs,
          minHeight: fullWidth ? "2.5rem" : SZ.inputMinH,
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

function EditableField({
  label,
  fieldKey,
  value,
  originalValue,
  onChange,
  colors,
  fullWidth = false,
  multiline = false,
}) {
  const isDirty = String(value ?? "") !== String(originalValue ?? "");
  const isEmpty = value === "" || value === null || value === undefined;
  const baseStyle = {
    width: "100%",
    padding: SZ.inputPad,
    background: colors.inputBg,
    border: `1.5px solid ${isDirty ? "#f59e0b" : colors.inputBorder}`,
    borderRadius: "5px",
    color: isEmpty ? colors.textTertiary : colors.textPrimary,
    fontSize: SZ.valueFs,
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
    fontFamily: "inherit",
    resize: multiline ? "vertical" : undefined,
    minHeight: multiline ? "2.5rem" : SZ.inputMinH,
  };
  return (
    <div
      style={
        fullWidth
          ? { gridColumn: "1 / -1", marginBottom: "0.4rem" }
          : { display: "flex", flexDirection: "column", gap: "0.2rem" }
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
        <label
          style={{
            fontSize: SZ.labelFs,
            fontWeight: "700",
            color: colors.textTertiary,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </label>
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
      {multiline ? (
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          rows={2}
          style={baseStyle}
          onFocus={(e) => {
            e.target.style.borderColor = isDirty ? "#f59e0b" : "#2196F3";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = isDirty
              ? "#f59e0b"
              : colors.inputBorder;
          }}
        />
      ) : (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          style={baseStyle}
          onFocus={(e) => {
            e.target.style.borderColor = isDirty ? "#f59e0b" : "#2196F3";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = isDirty
              ? "#f59e0b"
              : colors.inputBorder;
          }}
        />
      )}
      {isDirty && (
        <div
          style={{
            fontSize: "0.6rem",
            color: colors.textTertiary,
            marginTop: "0.1rem",
            display: "flex",
            gap: "0.25rem",
            alignItems: "flex-start",
          }}
        >
          <span style={{ flexShrink: 0, color: "#ef4444" }}>Original:</span>
          <span style={{ fontStyle: "italic", wordBreak: "break-word" }}>
            {originalValue || <em>empty</em>}
          </span>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  CountrySelect Component                                             */
/* ================================================================== */
const COUNTRIES = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Estonia",
  "Ethiopia",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Guatemala",
  "Guinea",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Togo",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

function CountrySelect({
  label,
  fieldKey,
  value,
  originalValue,
  onChange,
  colors,
  fullWidth = false,
}) {
  const isDirty = String(value ?? "") !== String(originalValue ?? "");
  return (
    <div
      style={
        fullWidth
          ? { gridColumn: "1 / -1", marginBottom: "0.4rem" }
          : { display: "flex", flexDirection: "column", gap: "0.2rem" }
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
        <label
          style={{
            fontSize: SZ.labelFs,
            fontWeight: "700",
            color: colors.textTertiary,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </label>
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
      <select
        value={value ?? ""}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        style={{
          width: "100%",
          padding: SZ.inputPad,
          background: colors.inputBg,
          border: `1.5px solid ${isDirty ? "#f59e0b" : colors.inputBorder}`,
          borderRadius: "5px",
          color: value ? colors.textPrimary : colors.textTertiary,
          fontSize: SZ.valueFs,
          outline: "none",
          cursor: "pointer",
          minHeight: SZ.inputMinH,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = isDirty ? "#f59e0b" : "#2196F3";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = isDirty ? "#f59e0b" : colors.inputBorder;
        }}
      >
        <option value="">— Select Country —</option>
        {COUNTRIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {isDirty && (
        <div
          style={{
            fontSize: "0.6rem",
            color: colors.textTertiary,
            marginTop: "0.1rem",
            display: "flex",
            gap: "0.25rem",
          }}
        >
          <span style={{ flexShrink: 0, color: "#ef4444" }}>Original:</span>
          <span style={{ fontStyle: "italic" }}>
            {originalValue || <em>empty</em>}
          </span>
        </div>
      )}
    </div>
  );
}

function StatusTimelineField({ label, record, colors }) {
  const { status, days } = calculateStatusTimeline(record);
  const ok = status === "WITHIN";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
      <label
        style={{
          fontSize: SZ.labelFs,
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
          padding: SZ.inputPad,
          background: colors.inputBg,
          border: `1px solid ${colors.inputBorder}`,
          borderRadius: "5px",
          fontSize: SZ.valueFs,
          display: "flex",
          alignItems: "center",
          minHeight: SZ.inputMinH,
        }}
      >
        {!status ? (
          <span style={{ color: colors.textTertiary, fontStyle: "italic" }}>
            N/A
          </span>
        ) : (
          <span
            style={{
              padding: "0.2rem 0.55rem",
              background: ok
                ? "linear-gradient(135deg,#10b981,#059669)"
                : "linear-gradient(135deg,#ef4444,#dc2626)",
              color: "#fff",
              borderRadius: "5px",
              fontSize: "0.65rem",
              fontWeight: "700",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              boxShadow: ok
                ? "0 2px 6px rgba(16,185,129,.3)"
                : "0 2px 6px rgba(239,68,68,.3)",
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

function SummaryCard({ icon, label, value, accent, colors }) {
  return (
    <div
      style={{
        padding: "0.6rem 0.75rem",
        background: colors.inputBg,
        border: `1px solid ${colors.inputBorder}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: "6px",
        display: "flex",
        flexDirection: "column",
        gap: "0.2rem",
      }}
    >
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
      <span
        style={{
          fontSize: "0.78rem",
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

function StepIndicator({ currentStep, steps, colors }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "0 0.25rem",
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
                fontSize: "0.65rem",
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
                  ? "0 0 0 3px rgba(33,150,243,0.15)"
                  : "none",
              }}
            >
              {isCompleted ? "✓" : stepNum}
            </div>
            <div
              style={{
                position: "absolute",
                marginTop: "2.2rem",
                fontSize: "0.58rem",
                fontWeight: isActive ? "700" : "500",
                color: isActive
                  ? "#2196F3"
                  : isCompleted
                    ? "#10b981"
                    : colors.textTertiary,
                whiteSpace: "nowrap",
                transform: "translateX(-50%)",
                marginLeft: "13px",
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
                  margin: "0 3px",
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
/*  Step 1 — Basic Info                                                 */
/* ================================================================== */
function Step1BasicInfo({
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
        if (isNaN(d.getTime())) return "";
        return d.toISOString().split("T")[0];
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

      {/* DTN / Brand / Timeline header banner */}
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
        {dateSummaryField("📅", "Validity", "validity", "#607d8b")}
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
          {field("Brand Name", "prodBrName")}
          {field("Generic Name", "prodGenName")}
          {field("Dosage Strength", "prodDosStr")}
          {field("Dosage Form", "prodDosForm")}
          {field("Classification", "prodClassPrescript")}
          {field("Essential Drug", "prodEssDrugList")}
          {field("Shelf Life", "prodDistriShelfLife")}
          {field("Pharma Category", "prodPharmaCat")}
          {field("Product Category", "prodCat")}
          {field("Pharma Prod. Cat.", "pharmaProdCat")}
          {field("Pharma Prod. Label", "pharmaProdCatLabel")}
          {field("File", "file")}
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

/* ================================================================== */
/*  Step 2 — Full Details                                               */
/* ================================================================== */
function Step2FullDetails({
  record,
  editedFields,
  onFieldChange,
  canEdit,
  colors,
}) {
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

      <VDSection title="📋 Application Information" colors={colors}>
        <FieldGrid>
          {field("Registration No.", "regNo")}
          {field("Mother App Type", "motherAppType")}
          {field("Old RSN", "oldRsn")}
          {field("Certification", "certification")}
          {field("Class", "class")}
          {field("MO", "mo")}
        </FieldGrid>
      </VDSection>

      <VDSection title="📝 Amendments" colors={colors}>
        <FieldGrid>
          {field("Amendment 1", "ammend1")}
          {field("Amendment 2", "ammend2")}
          {field("Amendment 3", "ammend3")}
        </FieldGrid>
      </VDSection>

      <VDSection title="📦 Storage & Packaging" colors={colors}>
        <FieldGrid>
          {field("Storage Condition", "storageCond")}
          {field("Packaging", "packaging")}
          {field("Suggested RP", "suggRp")}
          {field("No. of Samples", "noSample")}
        </FieldGrid>
      </VDSection>

      <VDSection title="💰 Fees" colors={colors}>
        <FieldGrid>
          {field("Fee", "fee")}
          {field("LRF", "lrf")}
          {field("SURC", "surc")}
          {field("Total", "total")}
          {field("OR No.", "orNo")}
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
          <DisplayField
            label="Validity"
            value={formatDate(record.validity)}
            colors={colors}
          />
        </FieldGrid>
      </VDSection>

      <VDSection title="🔐 SECPA" colors={colors}>
        <FieldGrid>
          {field("SECPA", "secpa")}
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

/* ================================================================== */
/*  Step 3 — Application Logs                                          */
/* ================================================================== */
function Step3AppLogs({ record, colors }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!record?.mainDbId) return;
    (async () => {
      try {
        setLoading(true);
        const data = await getApplicationLogs(record.mainDbId);
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        setError("Failed to load application logs.");
      } finally {
        setLoading(false);
      }
    })();
  }, [record?.mainDbId]);

  const STEP_COLORS = {
    "Quality Evaluation": "#2196F3",
    Compliance: "#9c27b0",
    Checking: "#ff9800",
    Supervisor: "#f44336",
    QA: "#00bcd4",
    "Director Signature": "#3f51b5",
    Releasing: "#4caf50",
    Decking: "#607d8b",
    Evaluation: "#8bc34a",
  };
  const STATUS_STYLE = {
    COMPLETED: {
      bg: "rgba(16,185,129,0.1)",
      color: "#059669",
      label: "✓ Completed",
    },
    "IN PROGRESS": {
      bg: "rgba(33,150,243,0.1)",
      color: "#1976D2",
      label: "⏳ In Progress",
    },
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "2rem",
          gap: "0.6rem",
          color: colors.textTertiary,
          fontSize: "0.8rem",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "14px",
            height: "14px",
            border: "2px solid #2196F330",
            borderTopColor: "#2196F3",
            borderRadius: "50%",
            animation: "spin 0.6s linear infinite",
          }}
        />
        Loading application logs...
      </div>
    );
  }
  if (error) {
    return (
      <div
        style={{
          padding: "1rem",
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: "6px",
          color: "#ef4444",
          fontSize: "0.78rem",
        }}
      >
        ❌ {error}
      </div>
    );
  }
  if (logs.length === 0) {
    return (
      <div
        style={{
          padding: "1.5rem",
          textAlign: "center",
          color: colors.textTertiary,
          fontSize: "0.82rem",
          fontStyle: "italic",
        }}
      >
        No application logs found for this record.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div
        style={{
          padding: "0.6rem 0.9rem",
          background: "rgba(33,150,243,0.06)",
          border: "1px solid rgba(33,150,243,0.15)",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          fontSize: "0.75rem",
          color: colors.textSecondary,
        }}
      >
        <span>📋</span>
        <span>
          <strong style={{ color: colors.textPrimary }}>{logs.length}</strong>{" "}
          log{logs.length > 1 ? "s" : ""} found for DTN{" "}
          <strong style={{ color: "#2196F3" }}>{record.dtn}</strong>
        </span>
      </div>

      {logs.map((log, index) => {
        const stepColor = STEP_COLORS[log.application_step] ?? "#607d8b";
        const statusStyle = STATUS_STYLE[log.application_status] ?? {
          bg: "rgba(100,100,100,0.1)",
          color: colors.textTertiary,
          label: log.application_status,
        };
        return (
          <div
            key={log.id}
            style={{
              border: `1px solid ${colors.cardBorder}`,
              borderLeft: `4px solid ${stepColor}`,
              borderRadius: "8px",
              overflow: "hidden",
              background: colors.cardBg,
            }}
          >
            <div
              style={{
                padding: "0.6rem 0.9rem",
                background: colors.inputBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.4rem",
                borderBottom: `1px solid ${colors.cardBorder}`,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
              >
                <span
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: stepColor,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.62rem",
                    fontWeight: "700",
                    flexShrink: 0,
                  }}
                >
                  {log.del_index ?? index + 1}
                </span>
                <div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: "700",
                      color: colors.textPrimary,
                    }}
                  >
                    {log.application_step}
                  </div>
                  <div
                    style={{ fontSize: "0.65rem", color: colors.textTertiary }}
                  >
                    👤 {log.user_name ?? "—"}
                  </div>
                </div>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <span
                  style={{
                    padding: "0.2rem 0.55rem",
                    background: statusStyle.bg,
                    color: statusStyle.color,
                    borderRadius: "20px",
                    fontSize: "0.62rem",
                    fontWeight: "700",
                  }}
                >
                  {statusStyle.label}
                </span>
                {log.del_thread && (
                  <span
                    style={{
                      padding: "0.2rem 0.5rem",
                      background:
                        log.del_thread === "Close"
                          ? "rgba(16,185,129,0.1)"
                          : "rgba(245,158,11,0.1)",
                      color: log.del_thread === "Close" ? "#059669" : "#b45309",
                      borderRadius: "20px",
                      fontSize: "0.6rem",
                      fontWeight: "700",
                    }}
                  >
                    {log.del_thread === "Close" ? "🔒 Closed" : "🔓 Open"}
                  </span>
                )}
              </div>
            </div>
            <div
              style={{
                padding: "0.75rem 0.9rem",
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "0.6rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: "700",
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  Decision
                </span>
                <span
                  style={{
                    padding: "0.25rem 0.55rem",
                    background: log.application_decision
                      ? log.application_decision
                          .toLowerCase()
                          .includes("approved") ||
                        log.application_decision
                          .toLowerCase()
                          .includes("released")
                        ? "rgba(16,185,129,0.1)"
                        : log.application_decision
                              .toLowerCase()
                              .includes("rejected")
                          ? "rgba(239,68,68,0.1)"
                          : "rgba(33,150,243,0.1)"
                      : colors.inputBg,
                    color: log.application_decision
                      ? log.application_decision
                          .toLowerCase()
                          .includes("approved") ||
                        log.application_decision
                          .toLowerCase()
                          .includes("released")
                        ? "#059669"
                        : log.application_decision
                              .toLowerCase()
                              .includes("rejected")
                          ? "#ef4444"
                          : "#1976D2"
                      : colors.textTertiary,
                    borderRadius: "5px",
                    fontSize: "0.72rem",
                    fontWeight: "600",
                    fontStyle: !log.application_decision ? "italic" : "normal",
                    display: "inline-block",
                    alignSelf: "flex-start",
                  }}
                >
                  {log.application_decision || "—"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: "700",
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  Dates
                </span>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: colors.textSecondary,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.1rem",
                  }}
                >
                  <span>
                    🟢 Start:{" "}
                    <strong>
                      {log.start_date
                        ? new Date(log.start_date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </strong>
                  </span>
                  <span>
                    ✅ Done:{" "}
                    <strong>
                      {log.accomplished_date
                        ? new Date(log.accomplished_date).toLocaleDateString(
                            "en-US",
                            { year: "numeric", month: "short", day: "numeric" },
                          )
                        : "—"}
                    </strong>
                  </span>
                </div>
              </div>
              {log.application_remarks && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.2rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: "700",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                    }}
                  >
                    Remarks
                  </span>
                  <div
                    style={{
                      padding: "0.45rem 0.65rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "5px",
                      fontSize: "0.72rem",
                      color: colors.textPrimary,
                      lineHeight: "1.4",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {log.application_remarks}
                  </div>
                </div>
              )}
              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  gap: "0.4rem",
                  flexWrap: "wrap",
                }}
              >
                {log.del_index !== null && log.del_index !== undefined && (
                  <span
                    style={{
                      fontSize: "0.6rem",
                      padding: "0.15rem 0.4rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.cardBorder}`,
                      borderRadius: "3px",
                      color: colors.textTertiary,
                    }}
                  >
                    Index: {log.del_index}
                  </span>
                )}
                {log.del_previous !== null &&
                  log.del_previous !== undefined && (
                    <span
                      style={{
                        fontSize: "0.6rem",
                        padding: "0.15rem 0.4rem",
                        background: colors.inputBg,
                        border: `1px solid ${colors.cardBorder}`,
                        borderRadius: "3px",
                        color: colors.textTertiary,
                      }}
                    >
                      Prev: {log.del_previous}
                    </span>
                  )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/*  DeadlinePicker                                                      */
/* ================================================================== */
function DeadlinePicker({
  deadlineDate,
  workingDays,
  onDeadlineChange,
  onWorkingDaysChange,
  colors,
}) {
  const urgency = deadlineUrgency(deadlineDate);
  const urgencyConfig = {
    overdue: {
      bg: "rgba(239,68,68,0.08)",
      border: "rgba(239,68,68,0.35)",
      color: "#dc2626",
      icon: "🚨",
      label: "OVERDUE",
    },
    critical: {
      bg: "rgba(239,68,68,0.06)",
      border: "rgba(239,68,68,0.25)",
      color: "#ef4444",
      icon: "🔴",
      label: "CRITICAL — 3 days or less",
    },
    warning: {
      bg: "rgba(245,158,11,0.06)",
      border: "rgba(245,158,11,0.25)",
      color: "#b45309",
      icon: "🟡",
      label: "WARNING — 5 days or less",
    },
    ok: {
      bg: "rgba(16,185,129,0.06)",
      border: "rgba(16,185,129,0.25)",
      color: "#059669",
      icon: "🟢",
      label: "On Track",
    },
  };
  const cfg = urgency ? urgencyConfig[urgency] : null;

  return (
    <div
      style={{
        padding: "0.9rem",
        background: "rgba(156,39,176,0.04)",
        border: "1.5px solid rgba(156,39,176,0.2)",
        borderRadius: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.95rem" }}>⏰</span>
        <div>
          <div
            style={{ fontSize: "0.75rem", fontWeight: "700", color: "#7b1fa2" }}
          >
            Compliance Deadline
          </div>
          <div
            style={{
              fontSize: "0.65rem",
              color: colors.textTertiary,
              marginTop: "0.05rem",
            }}
          >
            Set working days OR pick a date — both auto-sync
          </div>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.75rem",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}
        >
          <label
            style={{
              fontSize: SZ.labelFs,
              fontWeight: "700",
              color: colors.textTertiary,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            Working Days
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <button
              onClick={() => onWorkingDaysChange(Math.max(1, workingDays - 1))}
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "5px",
                border: `1px solid ${colors.cardBorder}`,
                background: colors.inputBg,
                color: colors.textPrimary,
                fontSize: "1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              −
            </button>
            <input
              type="number"
              min="1"
              max="365"
              value={workingDays}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0) onWorkingDaysChange(val);
              }}
              style={{
                flex: 1,
                padding: "0.35rem 0.3rem",
                background: colors.inputBg,
                border: "1.5px solid rgba(156,39,176,0.3)",
                borderRadius: "5px",
                color: colors.textPrimary,
                fontSize: "0.85rem",
                fontWeight: "700",
                outline: "none",
                textAlign: "center",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#9c27b0";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(156,39,176,0.3)";
              }}
            />
            <button
              onClick={() => onWorkingDaysChange(workingDays + 1)}
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "5px",
                border: `1px solid ${colors.cardBorder}`,
                background: colors.inputBg,
                color: colors.textPrimary,
                fontSize: "1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              +
            </button>
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.25rem",
              flexWrap: "wrap",
              marginTop: "0.05rem",
            }}
          >
            {[7, 15, 20, 30, 60].map((d) => (
              <button
                key={d}
                onClick={() => onWorkingDaysChange(d)}
                style={{
                  padding: "0.1rem 0.4rem",
                  fontSize: "0.6rem",
                  fontWeight: workingDays === d ? "700" : "500",
                  background:
                    workingDays === d
                      ? "rgba(156,39,176,0.15)"
                      : colors.inputBg,
                  border: `1px solid ${workingDays === d ? "#9c27b0" : colors.cardBorder}`,
                  borderRadius: "3px",
                  color: workingDays === d ? "#7b1fa2" : colors.textTertiary,
                  cursor: "pointer",
                }}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}
        >
          <label
            style={{
              fontSize: SZ.labelFs,
              fontWeight: "700",
              color: colors.textTertiary,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            Deadline Date
          </label>
          <input
            type="date"
            value={deadlineDate}
            min={todayStr()}
            onChange={(e) => onDeadlineChange(e.target.value)}
            style={{
              width: "100%",
              padding: "0.35rem 0.5rem",
              background: colors.inputBg,
              border: "1.5px solid rgba(156,39,176,0.3)",
              borderRadius: "5px",
              color: colors.textPrimary,
              fontSize: "0.78rem",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#9c27b0";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(156,39,176,0.3)";
            }}
          />
          {deadlineDate && (
            <div style={{ fontSize: "0.62rem", color: colors.textTertiary }}>
              📅 {fmtDeadline(deadlineDate)}
            </div>
          )}
        </div>
      </div>
      {cfg && deadlineDate && (
        <div
          style={{
            padding: "0.5rem 0.75rem",
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.72rem",
            color: cfg.color,
            fontWeight: "600",
          }}
        >
          <span>{cfg.icon}</span>
          <span>{cfg.label}</span>
          {urgency !== "overdue" && (
            <span
              style={{
                marginLeft: "auto",
                fontWeight: "400",
                color: colors.textTertiary,
              }}
            >
              {countWorkingDays(todayStr(), deadlineDate)} working day
              {countWorkingDays(todayStr(), deadlineDate) !== 1 ? "s" : ""}{" "}
              remaining
            </span>
          )}
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.4rem",
          fontSize: "0.65rem",
          color: colors.textTertiary,
          paddingTop: "0.3rem",
          borderTop: `1px dashed ${colors.cardBorder}`,
        }}
      >
        <span style={{ flexShrink: 0 }}>🔔</span>
        <span>
          The assigned compliance officer will be notified{" "}
          <strong>3 working days before</strong> this deadline.
        </span>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Step 4 — Action Form                                                */
/* ================================================================== */
function Step3ActionForm({ record, editedFields, colors, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    currentUserDisplay: "",
    assignee: "",
    decision: "",
    remarks: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const today = todayStr();
  const [workingDays, setWorkingDays] = useState(DEFAULT_WORKING_DAYS);
  const [deadlineDate, setDeadlineDate] = useState(() =>
    addWorkingDays(todayStr(), DEFAULT_WORKING_DAYS),
  );

  const handleWorkingDaysChange = (days) => {
    setWorkingDays(days);
    setDeadlineDate(addWorkingDays(today, days));
  };
  const handleDeadlineDateChange = (dateStr) => {
    setDeadlineDate(dateStr);
    setWorkingDays(countWorkingDays(today, dateStr));
  };

  const logId = record.id;
  const mainDbId = record.mainDbId;
  const currentStep = record.applicationStep;
  const dirtyFields = computeFieldChanges(
    record,
    editedFields,
    FIELD_LABEL_MAP,
    currentStep,
  );

  const STEP_DECISIONS = {
    "Quality Evaluation": ["Endorse to Checker", "For Compliance"],
    Compliance: ["Endorse to Checker", "For Compliance"],
    Checking: ["Endorse to Supervisor", "Return to Evaluator"],
    Supervisor: [
      "Recommended for Approval",
      "Recommended for Disapproval",
      "Return to Evaluator",
    ],
    "QA Admin": [
      "Recommended for Approval",
      "Recommended for Disapproval",
      "Return to Evaluator",
    ],
    "LRD Chief Admin": ["Approved", "Disapproved"],
    "OD-Receiving": ["Received", "Return to LRD Chief Admin"],
    "OD-Releasing": ["Approved for Release", "Disapproved"],
    "Releasing Officer": ["Released"],
  };

  const availableDecisions = STEP_DECISIONS[currentStep] ?? [
    "Approved",
    "Rejected",
  ];
  const nextStep = getNextStep(currentStep, formData.decision);
  const nextGroupId = STEP_GROUP_MAP[nextStep] ?? null;
  const isForCompliance = formData.decision === "For Compliance";
  const needsAssignee = nextStep !== null && !isForCompliance;

  useEffect(() => {
    const user = getUser();
    if (user) {
      setCurrentUser(user);
      setFormData((p) => ({ ...p, currentUserDisplay: user.username }));
    }
  }, []);

  useEffect(() => {
    if (!needsAssignee || !nextGroupId) {
      setAssigneeOptions([]);
      return;
    }
    (async () => {
      try {
        setLoadingUsers(true);
        setAssigneeOptions(await getUsersByGroup(nextGroupId));
      } catch {
        setAssigneeOptions([]);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, [nextGroupId, needsAssignee]);

  const handleChange = (f, v) => {
    setFormData((p) => {
      const updated = { ...p, [f]: v };
      if (f === "decision") updated.assignee = "";
      return updated;
    });
  };

  const isSubmitDisabled =
    loading ||
    !formData.decision ||
    (isForCompliance && !deadlineDate) ||
    (needsAssignee &&
      (loadingUsers || assigneeOptions.length === 0 || !formData.assignee));

  const infoText = !formData.decision
    ? "Select a decision to proceed."
    : isForCompliance
      ? `Your log will be completed and a Compliance log will be self-assigned to you (${currentUser?.username ?? ""}) with deadline: ${fmtDeadline(deadlineDate)}.`
      : nextStep
        ? `Your log will be completed and a new "${nextStep}" log will be created for the assigned user.`
        : "Your log will be completed. This is the final step — no further assignment needed.";

  const handleSubmit = async () => {
    if (!formData.currentUserDisplay || !formData.decision) {
      alert("⚠️ Please fill in required fields:\n- Decision");
      return;
    }
    if (needsAssignee && !formData.assignee) {
      alert("⚠️ Please assign a next user.");
      return;
    }
    if (!logId || !mainDbId) {
      alert(
        "❌ Cannot submit: Record IDs are missing. Please contact support.",
      );
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      const formattedDateTime = new Date(
        now.getTime() + 8 * 60 * 60 * 1000,
      ).toISOString();
      if (dirtyFields.length > 0) {
        await createFieldAuditLog({
          main_db_id: mainDbId,
          log_id: logId,
          session_id: crypto.randomUUID(),
          changes: dirtyFields,
        });
        const updatePayload = {};
        dirtyFields.forEach((c) => {
          const dbKey = FIELD_KEY_TO_DB[c.field_name];
          if (dbKey) updatePayload[dbKey] = c.new_value;
        });
        if (Object.keys(updatePayload).length > 0)
          await updateUploadReport(mainDbId, updatePayload);
      }
      const indexData = await getLastApplicationLogIndex(mainDbId);
      const lastIndex = indexData.last_index;
      const nextIndex = lastIndex + 1;
      await updateApplicationLog(logId, {
        application_status: "COMPLETED",
        application_decision: formData.decision,
        application_remarks: formData.remarks || "",
        accomplished_date: formattedDateTime,
        del_last_index: 0,
        del_thread: "Close",
        ...(dirtyFields.length > 0
          ? {
              edited_fields: Object.fromEntries(
                dirtyFields.map((c) => [c.field_name, c.new_value]),
              ),
            }
          : {}),
      });
      if (nextStep) {
        const assignedUser = isForCompliance
          ? currentUser?.username || formData.currentUserDisplay
          : formData.assignee;
        await createApplicationLog({
          main_db_id: mainDbId,
          application_step: nextStep,
          user_name: assignedUser,
          application_status: "IN PROGRESS",
          application_decision: "",
          application_remarks: "",
          start_date: formattedDateTime,
          accomplished_date: null,
          del_index: nextIndex,
          del_previous: lastIndex,
          del_last_index: 1,
          del_thread: "Open",
          ...(isForCompliance
            ? { deadline_date: deadlineDate, working_days: workingDays }
            : {}),
        });
      }
      if (
        currentStep === "Releasing Officer" &&
        formData.decision === "Released"
      ) {
        await updateUploadReport(mainDbId, { DB_APP_STATUS: "COMPLETED" });
      }
      if (onSuccess) await onSuccess();
      onClose();
      alert("✅ Completed successfully!");
    } catch (err) {
      alert(`❌ Failed to submit: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: "100%",
    padding: "0.55rem 0.75rem",
    background: colors.inputBg,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: "7px",
    color: colors.textPrimary,
    fontSize: "0.82rem",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Record context banner */}
      <div
        style={{
          padding: "0.75rem 1rem",
          background:
            "linear-gradient(135deg, rgba(33,150,243,0.08), rgba(33,150,243,0.03))",
          border: "1px solid rgba(33,150,243,0.2)",
          borderRadius: "8px",
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
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
            }}
          >
            DTN
          </div>
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: "800",
              color: colors.textPrimary,
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
        <div>
          <div
            style={{
              fontSize: "0.6rem",
              fontWeight: "700",
              color: colors.textTertiary,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Brand
          </div>
          <div
            style={{
              fontSize: "0.82rem",
              fontWeight: "600",
              color: colors.textPrimary,
            }}
          >
            {cleanValue(record.prodBrName)}
          </div>
        </div>
        <div
          style={{
            width: "1px",
            height: "28px",
            background: colors.cardBorder,
          }}
        />
        <div>
          <div
            style={{
              fontSize: "0.6rem",
              fontWeight: "700",
              color: colors.textTertiary,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Current Step
          </div>
          <div
            style={{
              fontSize: "0.82rem",
              fontWeight: "600",
              color: colors.textPrimary,
            }}
          >
            {cleanValue(currentStep)}
          </div>
        </div>
        {nextStep && (
          <>
            <div style={{ fontSize: "1rem", color: colors.textTertiary }}>
              →
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.6rem",
                  fontWeight: "700",
                  color: colors.textTertiary,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Next Step
              </div>
              <div
                style={{
                  fontSize: "0.82rem",
                  fontWeight: "600",
                  color: "#2196F3",
                }}
              >
                {nextStep}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Changes Summary Banner */}
      {dirtyFields.length > 0 && (
        <div
          style={{
            padding: "0.65rem 0.85rem",
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: "7px",
          }}
        >
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: "700",
              color: "#b45309",
              marginBottom: "0.4rem",
            }}
          >
            ✎ {dirtyFields.length} field{dirtyFields.length > 1 ? "s" : ""}{" "}
            edited — will be saved with this submission
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
          >
            {dirtyFields.map((c) => (
              <div
                key={c.field_name}
                style={{
                  display: "flex",
                  gap: "0.4rem",
                  fontSize: "0.68rem",
                  color: colors.textSecondary,
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    fontWeight: "600",
                    color: colors.textPrimary,
                    minWidth: "120px",
                    flexShrink: 0,
                  }}
                >
                  {c.field_label}:
                </span>
                <span
                  style={{
                    color: "#ef4444",
                    textDecoration: "line-through",
                    wordBreak: "break-all",
                  }}
                >
                  {c.old_value || <em>empty</em>}
                </span>
                <span style={{ color: colors.textTertiary }}>→</span>
                <span style={{ color: "#10b981", wordBreak: "break-all" }}>
                  {c.new_value || <em>empty</em>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Handled By */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: "0.72rem",
            fontWeight: "700",
            color: colors.textPrimary,
            marginBottom: "0.4rem",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Handled By (You) <span style={{ color: "#2196F3" }}>●</span>
        </label>
        <input
          type="text"
          value={formData.currentUserDisplay}
          readOnly
          style={{
            ...inp,
            background: colors.badgeBg,
            cursor: "not-allowed",
            fontWeight: "600",
          }}
        />
        {currentUser && (
          <p
            style={{
              fontSize: "0.68rem",
              color: colors.textTertiary,
              marginTop: "0.3rem",
              marginBottom: 0,
            }}
          >
            👤 Logged in as: {currentUser.username}
          </p>
        )}
      </div>

      {/* Decision */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: "0.72rem",
            fontWeight: "700",
            color: colors.textPrimary,
            marginBottom: "0.4rem",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Decision <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <select
          value={formData.decision}
          onChange={(e) => handleChange("decision", e.target.value)}
          required
          style={{ ...inp, cursor: "pointer" }}
          onFocus={(e) => {
            e.target.style.borderColor = "#2196F3";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = colors.inputBorder;
          }}
        >
          <option value="">Select decision...</option>
          {availableDecisions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {isForCompliance && (
        <DeadlinePicker
          deadlineDate={deadlineDate}
          workingDays={workingDays}
          onDeadlineChange={handleDeadlineDateChange}
          onWorkingDaysChange={handleWorkingDaysChange}
          colors={colors}
        />
      )}

      {/* Remarks */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: "0.72rem",
            fontWeight: "700",
            color: colors.textPrimary,
            marginBottom: "0.4rem",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Remarks
        </label>
        <textarea
          value={formData.remarks}
          onChange={(e) => handleChange("remarks", e.target.value)}
          placeholder="Enter your remarks and findings..."
          rows={3}
          style={{ ...inp, resize: "vertical", fontFamily: "inherit" }}
          onFocus={(e) => {
            e.target.style.borderColor = "#2196F3";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = colors.inputBorder;
          }}
        />
      </div>

      {/* Assignee */}
      {needsAssignee && (
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.72rem",
              fontWeight: "700",
              color: colors.textPrimary,
              marginBottom: "0.4rem",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Assign to {nextStep}{" "}
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: "400",
                color: colors.textTertiary,
              }}
            >
              ({nextStep} Group)
            </span>{" "}
            <span style={{ color: "#ef4444" }}>*</span>
          </label>
          {loadingUsers ? (
            <div
              style={{
                ...inp,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                color: colors.textTertiary,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "12px",
                  height: "12px",
                  border: "2px solid #2196F330",
                  borderTopColor: "#2196F3",
                  borderRadius: "50%",
                  animation: "spin 0.6s linear infinite",
                }}
              />
              Loading users...
            </div>
          ) : (
            <select
              value={formData.assignee}
              onChange={(e) => handleChange("assignee", e.target.value)}
              required
              disabled={assigneeOptions.length === 0}
              style={{
                ...inp,
                cursor:
                  assigneeOptions.length === 0 ? "not-allowed" : "pointer",
                opacity: assigneeOptions.length === 0 ? 0.6 : 1,
              }}
              onFocus={(e) => {
                if (assigneeOptions.length > 0)
                  e.target.style.borderColor = "#2196F3";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = colors.inputBorder;
              }}
            >
              <option value="">
                {assigneeOptions.length === 0
                  ? "No users available"
                  : `Select ${nextStep}...`}
              </option>
              {assigneeOptions.map((u) => (
                <option key={u.id} value={u.username}>
                  {u.username} — {u.first_name} {u.surname}
                </option>
              ))}
            </select>
          )}
          {!loadingUsers && assigneeOptions.length === 0 && (
            <p
              style={{
                fontSize: "0.68rem",
                color: "#ef4444",
                marginTop: "0.3rem",
                marginBottom: 0,
              }}
            >
              ⚠️ No users found in {nextStep} group.
            </p>
          )}
        </div>
      )}

      {isForCompliance && (
        <div
          style={{
            padding: "0.6rem 0.85rem",
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: "7px",
            fontSize: "0.75rem",
            color: colors.textSecondary,
          }}
        >
          ✅ Compliance log will be self-assigned to you:{" "}
          <strong>{currentUser?.username}</strong>
        </div>
      )}

      {/* Info box */}
      <div
        style={{
          padding: "0.75rem 1rem",
          background: "rgba(33,150,243,0.06)",
          border: "1px solid rgba(33,150,243,0.2)",
          borderRadius: "7px",
          display: "flex",
          gap: "0.6rem",
          alignItems: "flex-start",
        }}
      >
        <span style={{ fontSize: "0.9rem" }}>ℹ️</span>
        <p
          style={{
            fontSize: "0.75rem",
            color: colors.textSecondary,
            lineHeight: "1.5",
            margin: 0,
          }}
        >
          {infoText}
        </p>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        style={{
          width: "100%",
          padding: "0.7rem",
          background: isSubmitDisabled
            ? "#2196F380"
            : "linear-gradient(135deg, #2196F3, #1976D2)",
          border: "none",
          borderRadius: "8px",
          color: "#fff",
          fontSize: "0.85rem",
          fontWeight: "700",
          cursor: isSubmitDisabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.4rem",
          boxShadow: isSubmitDisabled
            ? "none"
            : "0 3px 10px rgba(33,150,243,0.3)",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          if (!isSubmitDisabled)
            e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
        }}
      >
        {loading ? (
          <>
            <span
              style={{
                display: "inline-block",
                width: "13px",
                height: "13px",
                border: "2px solid #ffffff40",
                borderTopColor: "#fff",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
              }}
            />
            Submitting...
          </>
        ) : (
          <>
            ✓ Complete {currentStep}
            {dirtyFields.length > 0
              ? ` + Save ${dirtyFields.length} Edit${dirtyFields.length > 1 ? "s" : ""}`
              : ""}
          </>
        )}
      </button>
    </div>
  );
}

/* ================================================================== */
/*  Main Modal                                                          */
/* ================================================================== */
function ViewDetailsModal({ record, onClose, onSuccess, colors, darkMode }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [editedFields, setEditedFields] = useState({});

  const canEdit = EDITABLE_STEPS.includes(record?.applicationStep);
  const handleFieldChange = (fieldKey, newValue) => {
    setEditedFields((prev) => ({ ...prev, [fieldKey]: newValue }));
  };

  if (!record) return null;

  const STEPS = ["Basic Info", "Full Details", "App Logs", "Action"];
  const totalSteps = STEPS.length;
  const goNext = () => setCurrentStep((s) => Math.min(s + 1, totalSteps));
  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const dirtyCount = Object.entries(editedFields).filter(
    ([k, v]) => String(v ?? "") !== String(record[k] ?? ""),
  ).length;

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
          width: "min(980px, 95vw)",
          maxHeight: "88vh",
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "0.85rem 1.25rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            gap: "0.75rem",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}
          >
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: "700",
                color: colors.textPrimary,
                margin: 0,
              }}
            >
              {currentStep === 1
                ? "👁️ Basic Information"
                : currentStep === 2
                  ? "📄 Full Details"
                  : currentStep === 3
                    ? "📋 Application Logs"
                    : `✅ ${record.applicationStep}`}
            </h2>
            <p
              style={{
                fontSize: "0.7rem",
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
              {canEdit && dirtyCount > 0 && (
                <span
                  style={{
                    marginLeft: "0.6rem",
                    padding: "0.08rem 0.4rem",
                    background: "rgba(245,158,11,0.15)",
                    color: "#b45309",
                    borderRadius: "3px",
                    fontSize: "0.62rem",
                    fontWeight: "700",
                  }}
                >
                  ✎ {dirtyCount} unsaved edit{dirtyCount > 1 ? "s" : ""}
                </span>
              )}
            </p>
            {record.complianceDeadline &&
              (() => {
                const urgency = deadlineUrgency(record.complianceDeadline);
                const wdaysLeft = countWorkingDays(
                  todayStr(),
                  record.complianceDeadline,
                );
                const cfgMap = {
                  overdue: {
                    bg: "rgba(239,68,68,0.15)",
                    border: "#ef4444",
                    color: "#ef4444",
                    icon: "🚨",
                    label: "OVERDUE",
                  },
                  critical: {
                    bg: "rgba(239,68,68,0.1)",
                    border: "#ef4444",
                    color: "#ef4444",
                    icon: "🔴",
                    label: `${wdaysLeft}d left`,
                  },
                  warning: {
                    bg: "rgba(245,158,11,0.12)",
                    border: "#f59e0b",
                    color: "#b45309",
                    icon: "🟡",
                    label: `${wdaysLeft}d left`,
                  },
                  ok: {
                    bg: "rgba(16,185,129,0.1)",
                    border: "#10b981",
                    color: "#059669",
                    icon: "🟢",
                    label: `${wdaysLeft}d left`,
                  },
                };
                const cfg = cfgMap[urgency] ?? cfgMap.ok;
                return (
                  <div
                    style={{
                      marginTop: "0.3rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.2rem 0.6rem",
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                      borderRadius: "20px",
                      fontSize: "0.62rem",
                      fontWeight: "700",
                      color: cfg.color,
                      width: "fit-content",
                    }}
                  >
                    <span>{cfg.icon}</span>
                    <span>Compliance Deadline:</span>
                    <span>{fmtDeadline(record.complianceDeadline)}</span>
                    <span
                      style={{
                        padding: "0.08rem 0.35rem",
                        background: cfg.border + "25",
                        borderRadius: "10px",
                        fontSize: "0.58rem",
                      }}
                    >
                      {urgency === "overdue" ? "OVERDUE" : cfg.label}
                    </span>
                  </div>
                );
              })()}
          </div>
          <div
            style={{
              flex: 1,
              maxWidth: "320px",
              position: "relative",
              paddingBottom: "1rem",
            }}
          >
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
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              cursor: "pointer",
              fontSize: "0.95rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
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

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.1rem 1.25rem",
            minHeight: 0,
          }}
        >
          {currentStep === 1 && (
            <Step1BasicInfo
              record={record}
              editedFields={editedFields}
              onFieldChange={handleFieldChange}
              canEdit={canEdit}
              colors={colors}
            />
          )}
          {currentStep === 2 && (
            <Step2FullDetails
              record={record}
              editedFields={editedFields}
              onFieldChange={handleFieldChange}
              canEdit={canEdit}
              colors={colors}
            />
          )}
          {currentStep === 3 && (
            <Step3AppLogs record={record} colors={colors} />
          )}
          {currentStep === 4 && (
            <Step3ActionForm
              record={record}
              editedFields={editedFields}
              colors={colors}
              onClose={onClose}
              onSuccess={onSuccess}
            />
          )}
        </div>

        {/* Footer */}
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
              fontSize: "0.7rem",
              color: colors.textTertiary,
              fontWeight: "600",
            }}
          >
            Step {currentStep} of {totalSteps}
            {canEdit && dirtyCount > 0 && (
              <span
                style={{
                  marginLeft: "0.6rem",
                  color: "#f59e0b",
                  fontWeight: "700",
                }}
              >
                · ✎ {dirtyCount} edit{dirtyCount > 1 ? "s" : ""} pending
              </span>
            )}
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {currentStep > 1 && (
              <button
                onClick={goPrev}
                style={{
                  padding: "0.45rem 0.9rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "6px",
                  color: colors.textPrimary,
                  fontSize: "0.78rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                ← Previous
              </button>
            )}
            {currentStep < totalSteps && (
              <button
                onClick={goNext}
                style={{
                  padding: "0.45rem 1rem",
                  background: "linear-gradient(135deg, #2196F3, #1976D2)",
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "0.78rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  boxShadow: "0 2px 6px rgba(33,150,243,0.3)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 10px rgba(33,150,243,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow =
                    "0 2px 6px rgba(33,150,243,0.3)";
                }}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

export default ViewDetailsModal;
