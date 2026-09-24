// FILE: src/components/donation/constants.js
// Shared field lists, tab/status metadata, and small pure helpers used
// across the Donation page and its modals.

// Letter DTN is a 14-digit code (e.g. a YYYYMMDDHHMMSS-style timestamp id)
// — mirrors LETTER_DTN_RE in app/crud/donation.py and app/schemas/donation.py
// on the backend, so manual entry is held to the same rule as import.
export const LETTER_DTN_RE = /^\d{14}$/;
export const STATUS_MAP = {
  Approved: {
    bg: "linear-gradient(135deg,#10b981,#059669)",
    sh: "rgba(16,185,129,0.3)",
    icon: "✓",
  },
  Disapproved: {
    bg: "linear-gradient(135deg,#ef4444,#dc2626)",
    sh: "rgba(239,68,68,0.3)",
    icon: "✗",
  },
  "For Evaluation": {
    bg: "linear-gradient(135deg,#eab308,#ca8a04)",
    sh: "rgba(234,179,8,0.3)",
    icon: "⏸",
  },
};
export const TABS = [
  { id: "all", label: "All Reports", icon: "🎁" },
  { id: "approved", label: "Approved", icon: "✅" },
  { id: "pending", label: "Pending", icon: "⏳" },
];
export const ROW_ACTION_ITEMS = [
  { id: "info", label: "Information", icon: "🔎" },
  { id: "update", label: "Update Information", icon: "✏️" },
  { id: "changelog", label: "Change Log", icon: "🕐" },
  { id: "divider1", label: "---" },
  { id: "delete", label: "Delete", icon: "🗑️", color: "#ef4444" },
];
export const INFO_FIELDS = [
  { key: "letterDtn", label: "Letter DTN" },
  { key: "dateReceived", label: "Date Received By Center" },
  { key: "dateReceivedByEvaluator", label: "Date Received by Evaluator" },
  { key: "donor", label: "Donor" },
  { key: "donee", label: "Donee/Recipient" },
  { key: "registrationDtn", label: "Registration DTN" },
  { key: "productName", label: "Product Name" },
  { key: "packaging", label: "Packaging" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "batchLotNo", label: "Batch/Lot No." },
  { key: "expirationDate", label: "Expiration Date" },
  { key: "totalQuantity", label: "Total Quantity" },
  { key: "validity", label: "Validity (Expired on)" },
  { key: "dateIssued", label: "Date Issue" },
  { key: "evaluator", label: "Evaluator" },
  { key: "status", label: "Status" },
  { key: "donationRegNo", label: "Donation Registration No." },
  { key: "dateForwardedToChecker", label: "Date Forwarded to Checker" },
  { key: "dateReleased", label: "Date Released from CDRR" },
  { key: "remarks", label: "Remarks" },
];
export const EMPTY_DONATION_FORM = INFO_FIELDS.reduce(
  (acc, f) => ({ ...acc, [f.key]: f.key === "status" ? "For Evaluation" : "" }),
  {},
);
export const toDateKey = (v) => {
  if (!v || v === "—") return null;
  const d = new Date(v);
  if (isNaN(d)) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
export const ADV_DATE_KEYS = new Set([
  "dateReceived",
  "dateReceivedByEvaluator",
  "expirationDate",
  "validity",
  "dateIssued",
  "dateForwardedToChecker",
  "dateReleased",
]);
export const ADV_FIELDS = INFO_FIELDS.map((f) => {
  if (f.key === "status") return { ...f, type: "select", options: Object.keys(STATUS_MAP) };
  if (ADV_DATE_KEYS.has(f.key)) return { ...f, type: "date" };
  return { ...f, type: "text", placeholder: `Search ${f.label.toLowerCase()}` };
});

export const ADV_DEFAULTS = ADV_FIELDS.reduce(
  (acc, f) => ({ ...acc, [f.key]: f.type === "select" ? "all" : "" }),
  {},
);
export const DTL_UPDATE_STEPS = ["Details", "Review & Save"];
