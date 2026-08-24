// src/components/gmp/shared/constants.js
// GMP workflow — 8-step sequence matching backend GMP_LOG_STEPS (FROO is a
// conditional detour after OD Releasing — NFI issuance types only, and it
// loops back to the Evaluator afterwards, see resolve_next_step()
// in app/crud/gmp_record.py)
// Group IDs: Decking=30, Evaluator=31, Checker=32,
//            QA Admin=34, LRD Chief Admin=17, OD Receiving=18, OD Releasing=19,
//            FROO=37
// NOTE: The "QA Supervisor" step/group (33) has been removed on the backend.
// Evaluator now routes directly to QA Admin. Keep this file's `id` and
// `actions` in sync with GMP_ACTION_ROUTES / GMP_LOG_STEPS in
// app/crud/gmp_record.py — that table is the single source of truth for
// routing, and advance-step will 400 on any action not registered there.

export const GMP_STEPS = [
  {
    id: "Decking", label: "Decking", icon: "📋", color: "#6366f1", del_index: 1,
    group_id: 30,
    actions: ["Forwarded to Evaluator", "Hold", "Disapprove"],
  },
  {
    id: "Evaluator", label: "Evaluator", icon: "🔬", color: "#f59e0b", del_index: 2,
    group_id: 31,
    actions: ["Endorsed to Checker", "Endorsed to QA Admin", "For Compliance"],
  },
  {
    id: "Checker", label: "Checker", icon: "✅", color: "#10b981", del_index: 3,
    group_id: 32,
    actions: ["Endorsed to Evaluator"],
  },
  {
    id: "QA Admin", label: "QA Admin", icon: "🏢", color: "#8b5cf6", del_index: 4,
    group_id: 34,
    actions: ["Endorsed to LRD Chief Admin", "Return to Evaluator", "Disapprove"],
  },
  {
    id: "LRD Chief Admin", label: "LRD Chief Admin", icon: "🏛️", color: "#ec4899", del_index: 5,
    group_id: 17,
    actions: ["Forwarded to OD Receiving", "Return to QA Admin", "Disapprove"],
  },
  {
    id: "OD Receiving", label: "OD Receiving", icon: "📥", color: "#06b6d4", del_index: 6,
    group_id: 18,
    actions: ["Endorsed to OD - Releasing", "Return to LRD Chief Admin", "Hold"],
  },
  {
    id: "OD Releasing", label: "OD Releasing", icon: "📤", color: "#f97316", del_index: 7,
    group_id: 19,
    actions: ["Certificate Released", "Return to OD Receiving", "Hold"],
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
    actions: ["Forwarded to CDRR FGMP"],
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