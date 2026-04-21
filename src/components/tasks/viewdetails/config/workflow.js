/* ================================================================== */
/*  Workflow Config                                                      */
/* ================================================================== */
export const WORKFLOW = {
  "Quality Evaluation": {
    "Endorse to Checker": "Checking",
    "For Compliance": "Compliance",
    "Endorse to Supervisor": "Supervisor",
  },
  Compliance: {
    "For Compliance": "Compliance",
    "Endorse to Checker": "Checking",
  },
  Checking: {
    "Checked and return to evaluator": "Quality Evaluation",
  },
  Supervisor: {
    "Endorse to QA Admin": "QA Admin",
    "Return to Evaluator": "Quality Evaluation",
  },
  "QA Admin": {
    "Endorse to LRD Chief Admin": "LRD Chief Admin",
    "Return to Evaluator": "Quality Evaluation",
  },
  "LRD Chief Admin": {
    "Endorse to OD-Receiving": "OD-Receiving", // ← CHANGED: was { default: "OD-Receiving" }
  },
  "OD-Receiving": {
    "Endorse to OD-Releasing": "OD-Releasing",
  },
  "OD-Releasing": {
    "Scanned and Endorse to Releasing Officer": "Releasing Officer",
  },
  "Releasing Officer": { default: null },
};

export const STEP_GROUP_MAP = {
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

export const STEP_DECISIONS = {
  "Quality Evaluation": [
    "Endorse to Checker",
    "Endorse to Supervisor",
    "For Compliance",
  ],
  Compliance: ["Endorse to Checker", "For Compliance"],
  Checking: ["Check and return to evaluator"],
  Supervisor: ["Endorse to QA Admin", "Return to Evaluator"],
  "QA Admin": [
    "Endorse to LRD Chief Admin",
    "Return to Evaluator",
  ],
  "LRD Chief Admin": ["Endorse to OD-Receiving"], // ← CHANGED: was ["Approved", "Disapproved"]
  "OD-Receiving": ["Endorse to OD-Releasing"],
  "OD-Releasing": ["Scanned and Endorse to Releasing Officer"],
  "Releasing Officer": ["Released"],
};

export const DECISION_DOCTRACK = {
  "Endorse to Checker": "Forwarded to Senior Evaluator for checking",
  "Endorse to Supervisor":
    "Forwarded to Supervisor for review and signing of the final recommendation",
  "Check and return to evaluator":
    "Return to evaluator for the result of recommendation",
  "Endorse to QA Admin": "Forwarded to LRD Chief for signing",
  "Endorse to LRD Chief Admin": "Checked and Forwarded to LRD Admin",
  "Return to Evaluator": "Return to Evaluator for Clarification",
  "Endorse to OD-Receiving":
    "Signed by LRD Chief and forwarded to CDRR Director for signing", 
  "Endorse to OD-Releasing": "Received by CDRR-OD",
  "Scanned and Endorse to Releasing Officer": "", // dynamic — date injected at runtime
  "Released": "Scanned and stamp, Forwarded to AFO Records",
};

export const EDITABLE_STEPS = [
  "Quality Evaluation",
  "Checking",
  "Supervisor",
  "Releasing Officer",
  "QA Admin",
];

export const DEFAULT_WORKING_DAYS = 20;

export const getNextStep = (currentStep, decision) => {
  const config = WORKFLOW[currentStep];
  if (!config) return null;
  return config[decision] ?? config.default ?? null;
};