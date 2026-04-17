/* ================================================================== */
/*  DataTable — constants.js                                           */
/* ================================================================== */
export const LRD_AUTHORITY_GROUP_ID = 6;
export const OD_RELEASING_AUTHORITY_GROUP_ID = 7;

export const DECISION_RESULT_OPTIONS = {
  "LRD Chief Admin": ["Signed"],
  "OD-Releasing": ["For issuance of CPR", "For issuance of LOD"],
};
export const todayStr = () => new Date().toISOString().split("T")[0];

export const countWorkingDays = (startStr, endStr) => {
  if (!endStr) return null;
  let count = 0;
  const current = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  if (end <= current) return 0;
  while (current < end) {
    current.setDate(current.getDate() + 1);
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
};

export const getDeadlineUrgency = (deadlineDateStr) => {
  if (!deadlineDateStr) return null;
  const today = new Date(todayStr() + "T00:00:00");
  const end = new Date(deadlineDateStr + "T00:00:00");
  if (end < today) return "overdue";
  if (end.toDateString() === today.toDateString()) return "today";
  const wdays = countWorkingDays(todayStr(), deadlineDateStr);
  if (wdays <= 3) return "critical";
  if (wdays <= 5) return "warning";
  return "ok";
};

export const URGENCY_CONFIG = {
  overdue: { bg: "rgba(239,68,68,0.12)",   color: "#fca5a5", border: "#ef4444", icon: "🚨" },
  today:   { bg: "rgba(249,115,22,0.12)",  color: "#fdba74", border: "#f97316", icon: "🔴" },
  critical:{ bg: "rgba(245,158,11,0.12)",  color: "#fcd34d", border: "#f59e0b", icon: "🟠" },
  warning: { bg: "rgba(234,179,8,0.10)",   color: "#fde68a", border: "#eab308", icon: "🟡" },
  ok:      { bg: "rgba(16,185,129,0.08)",  color: "#6ee7b7", border: "#10b981", icon: "🟢" },
};

/* ── Doctrack remarks per decision (mirrors DECISION_DOCTRACK in workflow) ── */
export const DECISION_DOCTRACK_MAP = {
  // Checking
  "Endorse to Supervisor":
    "Forwarded to Supervisor for review and signing of the final recommendation",
  "Check and return to evaluator": "Returned to evaluator for correction/clarification",

  // Supervisor
  "Endorse to QA Admin": "Forwarded to LRD Chief for signing",
  "Return to Evaluator": "Returned to evaluator for correction/clarification",

  // QA Admin
  "Endorse to LRD Chief Admin": "Checked and Forwarded to LRD Admin",

  // LRD Chief Admin
  "Endorse to OD-Receiving":
    "Signed by LRD Chief and forwarded to CDRR Director for signing",

  // OD-Receiving
  "Endorse to OD-Releasing": "Received by CDRR-OD",

  // OD-Releasing — built dynamically from signed date (see BulkDeckModal)
  "Scanned and Endorse to Releasing Officer": "",

  // Releasing Officer
  "Released": "Scanned and stamp, Forwarded to AFO Records",
};

export const BULK_DECK_CONFIG = {
  Checking: {
    currentStep: "Checking",
    nextStep: "Supervisor",
    nextGroupId: 5,
    fromLabel: "Checking",
    buttonLabel: "Endorse Selected Applications",
    modalTitle: "Endorse Selected Applications to Supervisor",
    defaultDoctrack: DECISION_DOCTRACK_MAP["Endorse to Supervisor"],
    availableDecisions: [
      "Endorse to Supervisor",
      "Check and return to evaluator",
    ],
    decisionDoctrackMap: DECISION_DOCTRACK_MAP,
  },
  Supervisor: {
    currentStep: "Supervisor",
    nextStep: "QA Admin",
    nextGroupId: 16,
    fromLabel: "Supervisor",
    buttonLabel: "Endorse Selected Applications",
    modalTitle: "Endorse Selected Applications to QA Admin",
    defaultDoctrack: DECISION_DOCTRACK_MAP["Endorse to QA Admin"],
    availableDecisions: [
      "Endorse to QA Admin",
      "Return to Evaluator",
    ],
    decisionDoctrackMap: DECISION_DOCTRACK_MAP,
  },
  "QA Admin": {
    currentStep: "QA Admin",
    nextStep: "LRD Chief Admin",
    nextGroupId: 17,
    fromLabel: "QA Admin",
    buttonLabel: "Endorse Selected Applications",
    modalTitle: "Endorse Selected Applications to LRD Chief Admin",
    defaultDoctrack: DECISION_DOCTRACK_MAP["Endorse to LRD Chief Admin"],
    availableDecisions: [
      "Endorse to LRD Chief Admin",
      "Return to Evaluator",
    ],
    decisionDoctrackMap: DECISION_DOCTRACK_MAP,
  },
  "LRD Chief Admin": {
    currentStep: "LRD Chief Admin",
    nextStep: "OD-Receiving",
    nextGroupId: 18,
    fromLabel: "LRD Chief Admin",
    buttonLabel: "Endorse Selected Applications",
    modalTitle: "Endorse Selected Applications to OD-Receiving",
    defaultDoctrack: DECISION_DOCTRACK_MAP["Endorse to OD-Receiving"],
    availableDecisions: [
      "Endorse to OD-Receiving",
    ],
    decisionDoctrackMap: DECISION_DOCTRACK_MAP,
  },
  "OD-Receiving": {
    currentStep: "OD-Receiving",
    nextStep: "OD-Releasing",
    nextGroupId: 19,
    fromLabel: "OD-Receiving",
    buttonLabel: "Endorse Selected Applications",
    modalTitle: "Endorse Selected Applications to OD-Releasing",
    defaultDoctrack: DECISION_DOCTRACK_MAP["Endorse to OD-Releasing"],
    availableDecisions: [
      "Endorse to OD-Releasing",
    ],
    decisionDoctrackMap: DECISION_DOCTRACK_MAP,
  },
  "OD-Releasing": {
    currentStep: "OD-Releasing",
    nextStep: "Releasing Officer",
    nextGroupId: 8,
    fromLabel: "OD-Releasing",
    buttonLabel: "Endorse Selected Applications",
    modalTitle: "Endorse Selected Applications to Releasing Officer",
    defaultDoctrack: "", // built dynamically from signed date
    requiresSignedDate: true,
    availableDecisions: [
      "Scanned and Endorse to Releasing Officer",
    ],
    decisionDoctrackMap: DECISION_DOCTRACK_MAP,
  },
  "Releasing Officer": {
  currentStep: "Releasing Officer",
  nextStep: null,
  nextGroupId: null,
  fromLabel: "Releasing Officer",
  isEndTask: true,
  defaultDoctrack: DECISION_DOCTRACK_MAP["Released"],  // ← was ""
  availableDecisions: [
    "Released",
  ],
  decisionDoctrackMap: DECISION_DOCTRACK_MAP,
  },
};

export const RECORD_TAB_COLUMNS = [
  "dtn", "estCat", "ltoCompany", "ltoAdd",
  "prodGenName", "prodBrName", "prodDosStr", "prodDosForm", "regNo", "appType",
];
