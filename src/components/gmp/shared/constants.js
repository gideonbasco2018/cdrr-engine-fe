// src/components/gmp/shared/constants.js
// GMP workflow — 8-step sequence matching backend GMP_LOG_STEPS (FROO is a
// conditional detour after OD Releasing — NFI issuance types only, and it
// loops back to the Evaluator afterwards, see resolve_next_step()
// in app/crud/gmp_record.py)
// Group IDs: Decking=30, Evaluator=31, Checker=32,
//            QA Admin=34, LRD Chief Admin=17, OD Receiving=18, OD Releasing=19,
//            FROO=37
// NOTE: The "QA Supervisor" step/group (33) has been removed on the backend.
// Evaluator now routes directly to QA Admin. Keep this file's `id` values in
// sync with GMP_LOG_STEPS in app/crud/gmp_record.py.
//
// The per-step ACTION lists are NOT defined here — they live only in the
// backend's GMP_ACTION_ROUTES and are fetched by WorkflowModal via
// GET /api/gmp/log-steps (see api/gmp.js getGMPLogSteps). That table is the
// single source of truth for routing; advance-step 400s on any action not in
// it, so the UI must never carry its own copy of the list.

export const GMP_STEPS = [
  {
    id: "Decking", label: "Decking", icon: "📋", color: "#6366f1", del_index: 1,
    group_id: 30,
  },
  {
    id: "Evaluator", label: "Evaluator", icon: "🔬", color: "#f59e0b", del_index: 2,
    group_id: 31,
  },
  {
    id: "Checker", label: "Checker", icon: "✅", color: "#10b981", del_index: 3,
    group_id: 32,
  },
  {
    id: "QA Admin", label: "QA Admin", icon: "🏢", color: "#8b5cf6", del_index: 4,
    group_id: 34,
  },
  {
    id: "LRD Chief Admin", label: "LRD Chief Admin", icon: "🏛️", color: "#ec4899", del_index: 5,
    group_id: 17,
  },
  {
    id: "OD Receiving", label: "OD Receiving", icon: "📥", color: "#06b6d4", del_index: 6,
    group_id: 18,
  },
  {
    id: "OD Releasing", label: "OD Releasing", icon: "📤", color: "#f97316", del_index: 7,
    group_id: 19,
  },
  // Detour step, NFI issuance types only (see GMP_NFI_ISSUANCE_TYPES /
  // resolve_next_step() in app/crud/gmp_record.py) — OD Releasing already
  // marks GMP_APP_STATUS "RELEASED"; FROO may supply the Related DTN
  // (GMP_RELATED_DTN, a branch of the main DTN — distinct from the
  // internal-only GMP_REFERENCE_NO), which is OPTIONAL, then hands the
  // application back to the Evaluator. From there it runs the normal
  // Evaluator ⇄ Checker → QA Admin → LRD Chief Admin → OD Receiving →
  // OD Releasing sequence again, and OD Releasing is the real ending —
  // the second pass does NOT come back here.
  {
    id: "FROO", label: "FROO", icon: "🔗", color: "#0ea5e9", del_index: 8,
    group_id: 37,
  },
];

export const GMP_STEP_MAP = Object.fromEntries(GMP_STEPS.map((s) => [s.id, s]));

// Group ID → step lookup (for resolving next assignee group)
export const GMP_GROUP_MAP = Object.fromEntries(GMP_STEPS.map((s) => [s.group_id, s]));

// The original 7-step sequence, without FROO — used by StepProgress (the dot
// row shown in QueueTable/TasksTable). FROO only applies to NFI issuance
// types (see GMP_NFI_ISSUANCE_TYPES / resolve_next_step() in
// app/crud/gmp_record.py) and isn't part of the fixed sequence every
// application walks through, so it doesn't get its own permanent dot —
// StepProgress instead treats a record sitting on FROO as "back at Evaluator"
// (that's where FROO hands the application to next).
export const GMP_PROGRESS_STEPS = GMP_STEPS.filter((s) => s.id !== "FROO");

export const GMP_STATUS_COLORS = {
  "ON-PROCESS":  { bg: "#dbeafe", color: "#1d4ed8" },
  "ON PROCESS":  { bg: "#dbeafe", color: "#1d4ed8" },
  "COMPLETED":   { bg: "#dcfce7", color: "#15803d" },
  "DISAPPROVED": { bg: "#fee2e2", color: "#b91c1c" },
  "FOR DECKING": { bg: "#e0f2fe", color: "#0369a1" },
  "DECKED":      { bg: "#f0fdf4", color: "#166534" },
  "PENDING":     { bg: "#fef9c3", color: "#854d0e" },
};

export const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// Canonical FGMP transaction types — the single list used by BOTH the Workflow
// modal's Details dropdown and the batch folder upload's "new record" form, so
// a record created in one place never shows an unrecognized value in the other.
export const GMP_TRANSACTION_TYPE_OPTIONS = [
  "INITIAL",
  "RENEWAL",
  "RECONSTRUCTION",
  "CORRECTION",
  "COMPLIANCE DOCUMENTS",
];

// Shared per-field accent colors for Category / Transaction Type / Issuance
// Type chips — used by both QueueTable.jsx and TasksTable.jsx so the same
// field always reads as the same color in either table (mirrors the
// est_category/transaction_type/type_of_issuance accents used for the
// sidebar's GROUP_COLORS in app/api/routes/gmp_record.py).
export const GMP_FIELD_ACCENTS = {
  category:         { bg: "rgba(245,158,11,0.12)", color: "#b45309" }, // amber
  transaction_type: { bg: "rgba(139,92,246,0.12)",  color: "#7c3aed" }, // purple
  type_of_issuance: { bg: "rgba(6,182,212,0.12)",   color: "#0891b2" }, // cyan
};