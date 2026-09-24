// FILE: src/components/clinicalTrial/constants.js

export const ITEM_DOT_COLORS = [
  "#7c3aed",
  "#0891b2",
  "#059669",
  "#b45309",
  "#f97316",
  "#be185d",
  "#6366f1",
  "#e11d48",
];

export const PHASE_COLORS = {
  I: "linear-gradient(135deg,#0ea5e9,#0284c7)",
  II: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
  III: "linear-gradient(135deg,#d946ef,#c026d3)",
  IV: "linear-gradient(135deg,#14b8a6,#0d9488)",
};

export const VALID_PHASE_OPTIONS = ["I", "II", "III", "IV"];

export const TABS = [{ id: "all", label: "All Trials", icon: "🧪" }];

// ── Field metadata shared by the View Details and Update modals ──
export const TRIAL_FIELD_GROUPS = [
  {
    title: "Trial Identification",
    fields: [
      { key: "protocolNo", label: "Protocol Number", required: true },
      { key: "studyTitle", label: "Study Title", type: "textarea" },
      { key: "phase", label: "Phase", type: "phase" },
      { key: "ctRefNo", label: "CT Reference Number" },
    ],
  },
  {
    title: "Sponsor",
    fields: [
      { key: "sponsorName", label: "Sponsor Name" },
      { key: "sponsorAddress", label: "Sponsor Address", type: "textarea" },
      { key: "sponsorContact", label: "Sponsor Contact Info" },
    ],
  },
  {
    title: "CRO",
    fields: [
      { key: "croName", label: "CRO Name" },
      { key: "croAddress", label: "CRO Address", type: "textarea" },
      { key: "croContact", label: "CRO Contact Info" },
    ],
  },

   {
    title: "IL Approval",
    fields: [
      { key: "ilApprovalNo", label: "IL Approval Number" },
      { key: "ilApprovalDate", label: "IL Initial Approval Date", type: "date" },
    ],
  },
];

// ── Field metadata for ONE drug/IP row (the "many" side). Rendered as a
//    repeatable block in the Update modal, with add/remove controls. ──
export const DRUG_FIELD_DEFS = [
  { key: "ipName", label: "Name of IP/Comparator/Placebo/OM", type: "textarea" },
  { key: "dosageStrength", label: "Dosage Strength" },
  { key: "pharmaForm", label: "Pharmaceutical Form" },
  { key: "drugType", label: "Type of Drug" },
  { key: "totalQtyApprove", label: "Total Qty Approved", type: "number" },
];

export const EMPTY_DRUG = {
  ipName: "",
  dosageStrength: "",
  pharmaForm: "",
  drugType: "",
  totalQtyApprove: 0,
};

// snake_case labels for one drug row, used when rendering an audit log
// entry for the "drugs" field (matches CLINICAL_TRIAL_DRUG_COLUMNS on
// the backend).
export const DRUG_FIELD_API_LABELS = {
  ip_name: "Name of IP/Comparator/Placebo/OM",
  dosage_strength: "Dosage Strength",
  pharma_form: "Pharmaceutical Form",
  drug_type: "Type of Drug",
  total_qty_approve: "Total Qty Approved",
};

// ── camelCase label lookup, used to build the "Confirm Changes" diff ──
export const FIELD_LABEL_MAP = TRIAL_FIELD_GROUPS.flatMap((g) => g.fields).reduce(
  (acc, f) => ({ ...acc, [f.key]: f.label }),
  {},
);

// ── snake_case label lookup, used to render audit log entries
//    (matches the backend's CLINICAL_TRIAL_COLUMNS labels) ──
export const API_FIELD_LABELS = {
  protocol_no: "Protocol Number",
  study_title: "Study Title",
  phase: "Phase",
  sponsor_name: "Sponsor Name",
  sponsor_address: "Sponsor Address",
  sponsor_contact: "Sponsor Contact Info",
  cro_name: "CRO Name",
  cro_address: "CRO Address",
  cro_contact: "CRO Contact Info",
  ct_ref_no: "CT Reference Number",
  il_approval_no: "IL Approval Number",
  il_approval_date: "IL Initial Approval Date",
  // The drugs array is handled as a special case in AuditLogEntry,
  // not as a plain scalar old/new value.
  drugs: "Investigational Products",
};