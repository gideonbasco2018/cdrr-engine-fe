/* ================================================================== */
/*  Workflow Config                                                      */
/* ================================================================== */
export const WORKFLOW = {
  "Quality Evaluation": {
    "Endorsed to Checker": "Checking",
    "For Compliance": "Compliance",
    "Endorsed to Supervisor": "Supervisor",
    "Draft Recommendation": "Checking",
    "Returned to S&E Evaluator": "S&E",
  },
   "S&E": {
    "Endorsed to S&E Supervisor": "S&E Supervisor",
    "Endorsed to S&E Checker": "S&E Checker",  
    "Approved": "Quality Evaluation",   
    "Rejected": "Quality Evaluation",   
  },
  "S&E Supervisor": {
    "Checked and Returned to S&E Evaluator": "S&E",
    "Signed and Returned to S&E Evaluator": "S&E",
  },
  "S&E Checker": {                                   
    "Checked and Returned to S&E Evaluator": "S&E",
    "Signed and Returned to S&E Evaluator": "S&E",
  },
  Compliance: {
    "For Compliance": "Compliance",
    "Endorsed to Checker": "Checking",
    "Endorsed to Supervisor": "Supervisor",
  },
  Checking: {
    "Checked and returned to evaluator": "Quality Evaluation",
    "Forwarded to Supervisor": "Supervisor",
  },
  Supervisor: {
    "Endorsed to QA Admin": "QA Admin",
    "Returned to Evaluator": "Quality Evaluation",
  },
  "QA Admin": {
    "Endorsed to LRD Chief Admin": "LRD Chief Admin",
    "Returned to Evaluator": "Quality Evaluation",
  },
  "LRD Chief Admin": {
    "Endorsed to OD-Receiving": "OD-Receiving",
  },
  "OD-Receiving": {
    "Endorsed to OD-Releasing": "OD-Releasing",
  },
   "OD-Releasing": {
    "Scanned and Endorsed to Releasing Officer": "Releasing Officer",
  },
  "Releasing Officer": { default: null },
  "LRD Decking": {
    "For Decking": "Quality Evaluation", 
  },
  "OD Review": {
    "Approved OD": null,
    "Disapproved OD": null,
  },
  
};

export const STEP_GROUP_MAP = {
  "LRD Decking": 2,
  "Quality Evaluation": 3,
  "S&E": 13,  
  Compliance: 4,
  Checking: 4,
  Supervisor: 5,
  "QA Admin": 16,
  "LRD Chief Admin": 17,
  "OD-Receiving": 18,
  "OD-Releasing": 19,
  "Releasing Officer": 8,
  Record: 15,
  "S&E Supervisor": 20,
  "S&E Checker": 21,
  "OD Review": 22,
};

export const STEP_DECISIONS = {
  "Quality Evaluation": [
    "Endorsed to Checker",
    "Endorsed to Supervisor",
    "For Compliance",
    "Draft Recommendation",
    "Returned to S&E Evaluator",
  ],
  "S&E": [
    "Endorsed to S&E Supervisor",  
    "Endorsed to S&E Checker",
    "Approved",
    "Rejected",
  ],
  "S&E Supervisor": [
    "Checked and Returned to S&E Evaluator",
    "Signed and Returned to S&E Evaluator",
  ],
  "S&E Checker": [                                 
    "Checked and Returned to S&E Evaluator",
    "Signed and Returned to S&E Evaluator",
  ],
  Compliance: ["Endorsed to Checker", "For Compliance", "Endorsed to Supervisor"],
  Checking: ["Checked and returned to evaluator", "Forwarded to Supervisor", ],
  Supervisor: ["Endorsed to QA Admin", "Returned to Evaluator"],
  "QA Admin": [
    "Endorsed to LRD Chief Admin",
    "Returned to Evaluator",
  ],
  "LRD Chief Admin": ["Endorsed to OD-Receiving"],
  "OD-Receiving": ["Endorsed to OD-Releasing"],
  "OD-Releasing": ["Scanned and Endorsed to Releasing Officer"],
  "Releasing Officer": ["Released"],
  "LRD Decking": ["For Decking"], 
  "OD Review": [
    "Approved OD",
    "Disapproved OD",
  ],
};

export const DECISION_DOCTRACK = {
  "Endorsed to Checker": "Forwarded to Senior Evaluator for checking",
  "Endorsed to Supervisor": "Forwarded to Supervisor for review and signing of the final recommendation",
  "For Compliance": "Endorsed for compliance",
  "Checked and returned to evaluator": "Return to evaluator for the result of recommendation",
  "Endorsed to QA Admin": "Forwarded to LRD Chief for signing",
  "Endorsed to LRD Chief Admin": "Checked and Forwarded to LRD Admin",
  "Returned to Evaluator": "Return to Evaluator for Clarification",
  "Endorsed to OD-Receiving": "Signed by LRD Chief and forwarded to CDRR Director for signing",
  "Endorsed to OD-Releasing": "Received by CDRR-OD",
  "Scanned and Endorsed to Releasing Officer": "", // dynamic — date injected at runtime
  "Released": "Scanned and stamp, Forwarded to AFO Records",
  "Draft Recommendation": "Forwarded draft recommendation to checker for cross-evaluation",  
  "Returned to S&E Evaluator": "Returned to S&E Evaluator for clarification",
  "Endorsed to S&E Supervisor": "Forwarded to S&E Supervisor for review",
  "Endorsed to S&E Checker": "Forwarded to S&E Checker for review",
  "Checked and Returned to S&E Evaluator": "Checked by S&E Supervisor and returned to S&E Evaluator for processing",
  "Signed and Returned to S&E Evaluator": "Reviewed and signed by S&E Supervisor. Returned to S&E Evaluator for further processing.",
  "Approved": "Approved by S&E",
  "Rejected": "Rejected by S&E",
  "Forwarded to Supervisor": "Forwarded to Supervisor for review and signing of the final recommendation",
  "For Cancellation": "Application cancelled",
  "For Decking": "Forwarded to Evaluator",
  "Approved OD": "Approved by CDRR Director",
  "Disapproved OD": "Disapproved by CDRR Director",
};

export const EDITABLE_STEPS = [
  "Quality Evaluation",
  "Checking",
  "Supervisor",
  "LRD Chief Admin",
  "Releasing Officer",
  "QA Admin",
  "S&E",             
  "S&E Supervisor",
  "S&E Checker",
  "OD Review",
];

export const DEFAULT_WORKING_DAYS = 20;

export const getNextStep = (currentStep, decision) => {
  const config = WORKFLOW[currentStep];
  if (!config) return null;
  return config[decision] ?? config.default ?? null;
};

export const STEP_DECISION_DOCTRACK = {
  "S&E Checker": {
    "Checked and Returned to S&E Evaluator":
      "Checked by S&E Checker and returned to S&E Evaluator for processing",
    "Signed and Returned to S&E Evaluator":
      "Reviewed and signed by S&E Checker. Returned to S&E Evaluator for further processing.",
  },
};