// src/components/monitoring/evaluatorMonitoring/roles.js
// The workflow roles a person can be looked at for, in workflow order.
// Keys are the ones the API takes (see ROLES in crud/evaluator_monitoring.py).
export const ROLE_OPTIONS = [
  { value: "decker", label: "Decker", hint: "Applications they decked" },
  { value: "evaluator", label: "Evaluator", hint: "Applications they evaluated" },
  { value: "checker", label: "Checker", hint: "Applications they checked" },
  { value: "supervisor", label: "Supervisor", hint: "Applications they supervised" },
  { value: "lrd_chief", label: "LRD Chief Admin", hint: "Applications at the LRD Chief step" },
  { value: "qa_admin", label: "QA Admin", hint: "Applications at the QA Admin step" },
  { value: "od_receiving", label: "OD Receiving", hint: "Applications they received at OD" },
  { value: "od_releasing", label: "OD Releasing", hint: "Applications they released at OD" },
];

export const ROLE_KEYS = ROLE_OPTIONS.map((o) => o.value);

// What the page starts with
export const DEFAULT_ROLES = ["evaluator", "checker"];

const LABELS = Object.fromEntries(ROLE_OPTIONS.map((o) => [o.value, o.label]));

// "Evaluator" for one role key
export const roleName = (key) => LABELS[key] || key;

// The text of the closed Role box
export function rolesLabel(roles) {
  if (roles.length === ROLE_KEYS.length) return "All Roles";
  if (roles.length <= 2) return roles.map(roleName).join(" + ");
  return `${roles.length} Roles`;
}

// Roles in sentences: "evaluator", "evaluator or checker", "3 roles"
export function rolesWord(roles) {
  if (roles.length === 1) return roleName(roles[0]).toLowerCase();
  if (roles.length === 2) {
    return roles.map((r) => roleName(r).toLowerCase()).join(" or ");
  }
  return "chosen role";
}

// "a decker", "an evaluator"
export const withArticle = (word) => `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`;
