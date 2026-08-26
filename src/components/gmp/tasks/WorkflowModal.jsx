// src/components/gmp/tasks/WorkflowModal.jsx
// 4-step GMP workflow modal
// Step 1: Details — record info + application details (editable), including
//         DTN, Reference No, Related DTN, and Status all up front
// Step 2: Upload Documents
// Step 3: Application logs timeline
// Step 4: Action form (advance / reassign / reroute)
import React, { useState, useEffect, useCallback, useRef, useLayoutEffect, useId } from "react";
import { createPortal } from "react-dom";
import {
  getGMPRecord,
  getGMPRecordLogs,
  advanceStep,
  updateGMPRecord,
  reassignGMPStep,
  rerouteGMPStep,
  addGMPIssuance,
  getGMPSiblings,
  updateGMPIssuanceFields,
} from "../../../api/gmp";
import { createDoctrackLogByRsn } from "../../../api/doctrack";
import { getUsersByGroup, getUser } from "../../../api/auth";
import { FONT, GMP_STEPS, GMP_STATUS_COLORS } from "../shared/constants";
import ApplicationDocumentsPanel from "../shared/ApplicationDocumentsPanel";

const ACCENT = "#10b981";
const MODAL_CSS = `
@keyframes gmpModalIn {
  from { opacity:0; transform:scale(0.95) translateY(12px); }
  to   { opacity:1; transform:scale(1) translateY(0); }
}
@keyframes gmpBackdropIn {
  from { opacity:0; }
  to   { opacity:1; }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.gmpTabScroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,0.15) transparent;
}
.gmpTabScroll::-webkit-scrollbar {
  height: 5px;
}
.gmpTabScroll::-webkit-scrollbar-track {
  background: transparent;
}
.gmpTabScroll::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.15);
  border-radius: 99px;
}
.gmpTabScroll::-webkit-scrollbar-thumb:hover {
  background: rgba(0,0,0,0.28);
}
.wfFieldBox {
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}
.wfFieldBox:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px -8px rgba(16,185,129,0.4);
}
.wfFieldBox:focus-within {
  box-shadow: 0 0 0 2px rgba(16,185,129,0.35), 0 6px 18px -8px rgba(16,185,129,0.4);
}
.wfLogCard {
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}
.wfLogCard:hover {
  transform: translateY(-1px);
}`;

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (v) => (!v || v === "N/A" ? "—" : v);
const fmtDT = (raw) => {
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } catch { return raw; }
};

// A record's GMP_APP_STATUS can be stale/empty while it's actively moving
// through the workflow — mirrors getEffectiveStatus() in QueueTable.jsx so
// the status shown here always agrees with the Queue table.
const GMP_TERMINAL_STATUSES_WM = new Set([
  "COMPLETED", "RELEASED", "DISAPPROVED", "CANCELLED APPLICATION", "CANCELLED",
]);
function getEffectiveStatusWM(record) {
  if (!record) return "";
  const raw = (record.GMP_APP_STATUS || "").trim().toUpperCase();
  if (raw && GMP_TERMINAL_STATUSES_WM.has(raw)) return record.GMP_APP_STATUS;
  if (record.GMP_CURRENT_STEP) return "IN PROGRESS";
  return record.GMP_APP_STATUS ?? "";
}


// `colors.inputBg`/`colors.badgeBg` (getColorScheme.js) are very subtle tints —
// barely different from the modal's own card background, so editable fields
// didn't read as clearly editable. Two-tone hierarchy: the outer card (label
// + box) gets a light tint just to mark "this is a field", and the actual
// input/select control inside it is lighter still — so the control itself
// pops out as "this is what you click into", instead of the label and the
// control blending into one flat block. Reads `colors.cardBg` (always the
// literal "#ffffff" in light mode per colorScheme.js) rather than threading
// a separate darkMode prop through every field component.
function isDarkColors(colors) {
  return colors.cardBg !== "#ffffff";
}
function editableFieldBg(colors) {
  return isDarkColors(colors) ? "rgba(255,255,255,0.045)" : "#ffffff";
}
function editableFieldInnerBg(colors) {
  return isDarkColors(colors) ? "rgba(255,255,255,0.09)" : "#f6faf8";
}
// Soft-modern field-card shadow — replaces the old flat 1px border as the
// primary surface cue, so cards read as gently lifted rather than boxed in.
// Previously layered a hairline inset highlight/shade on top of the drop
// shadow as a faux-emboss, but that inset rendered as a hard 1px line along
// the bottom of every card instead of a soft edge — dropped it in favor of
// a plain, wider-blurred drop shadow that actually reads as a shadow.
function fieldCardShadow(colors, isDirty) {
  const dark = isDarkColors(colors);
  if (isDirty) return dark
    ? "0 6px 18px -6px rgba(245,158,11,0.4)"
    : "0 6px 18px -6px rgba(245,158,11,0.35)";
  return dark
    ? "0 4px 14px -4px rgba(0,0,0,0.45)"
    : "0 4px 14px -4px rgba(16,60,40,0.16)";
}

// Strips time from any date/datetime string down to YYYY-MM-DD, which is the
// only format <input type="date"> will actually display as selected.
function toDateInputValue(value) {
  if (!value) return "";
  const str = String(value);
  const match = str.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const d = new Date(str);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

// ── GmpDatePicker date helpers (all local-time, YYYY-MM-DD strings) ──────────
const _pad2 = (n) => String(n).padStart(2, "0");
const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}-${_pad2(d.getDate())}`;
};
const isoParts = (iso) => {
  const [y, m, d] = String(iso).split("-").map(Number);
  return { y, m: m - 1, d };
};
const isoFromDate = (dt) =>
  `${dt.getFullYear()}-${_pad2(dt.getMonth() + 1)}-${_pad2(dt.getDate())}`;
const shiftMonth = ({ y, m }, delta) => {
  const d = new Date(y, m + delta, 1);
  return { y: d.getFullYear(), m: d.getMonth() };
};
const monthGrid = ({ y, m }) => {
  const start = new Date(y, m, 1);
  start.setDate(1 - start.getDay()); // rewind to the Sunday of that week
  return Array.from({ length: 42 }, (_, i) => {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    return dt;
  });
};
const fmtDateLong = (iso) => {
  const { y, m, d } = isoParts(iso);
  return new Date(y, m, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function isWeekendDateWM(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}
// Same working-day definition as the Compliance Deadline widget itself and
// AppLogModal's banner, kept in sync so "Xd left" always matches what was
// set at submission time.
function workingDaysUntilWM(deadlineStr) {
  if (!deadlineStr) return null;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(deadlineStr); end.setHours(0, 0, 0, 0);
  const forward = end > start;
  let count = 0;
  const d = new Date(forward ? start : end);
  const stop = forward ? end : start;
  while (d < stop) { d.setDate(d.getDate() + 1); if (!isWeekendDateWM(d)) count += 1; }
  return forward ? count : -count;
}
function formatShortDateWM(raw) {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return raw; }
}

const GMP_DOCTRACK_REMARKS = {
  "Forwarded to Evaluator": "Forwarded to GMP Evaluator for evaluation",
  "Disapprove":                     "GMP Application disapproved",
  "Endorsed to QA Admin":           "Endorsed to GMP QA Admin",
  "Return to Checker":              "Returned to GMP Checker",
  "Endorsed to LRD Chief Admin":    "Endorsed to LRD Chief Admin for signing",
  "Return to Evaluator":            "Returned to GMP Evaluator",
  "Forwarded to OD Receiving":      "Signed by LRD Chief and forwarded to CDRR Director for signing",
  "Return to QA Admin":             "Returned to GMP QA Admin",
  "Endorsed to OD - Releasing":     "Received by CDRR - OD; Forwarded to CDRR OIC - Director for Signature",
  "Return to LRD Chief Admin":      "Returned to LRD Chief Admin",
  "Forwarded to CDRR FGMP":          "Reviewed by FROO; Returned to GMP Evaluator",
};

// Workflow: Decking → Evaluator → Checker → Evaluator → QA Admin
//           → LRD Chief Admin (For Signing) → OD Receiving (For Signing of Director)
//           → OD Releasing, which is the end of the workflow for every
//           issuance type.
// The "FGMP Supervisor" group/step has been removed — the Evaluator now
// endorses directly to QA Admin after being cleared by the Checker.
const GMP_STEP_DECISIONS = {
  "Decking":           ["Forwarded to Evaluator", "Disapprove"],
  "QA Admin":          ["Endorsed to LRD Chief Admin", "Return to Evaluator", "Disapprove"],
  "LRD Chief Admin":   ["Forwarded to OD Receiving", "Return to QA Admin", "Disapprove"],
  "OD Receiving":      ["Endorsed to OD - Releasing", "Return to LRD Chief Admin"],
  "OD Releasing":      ["Scanned, Stamped and Forwarded to AFO Records"],
  // Legacy detour step — OD Releasing no longer routes new NFI submissions
  // here (mirrors the removed redirect in app/crud/gmp_record.py's
  // resolve_next_step()). Kept only so records already on this step from
  // before that change can still be advanced: this action hands the
  // application back to the Evaluator, which then runs the usual
  // Evaluator ⇄ Checker → … → OD Releasing sequence to the end.
  "FROO":              ["Forwarded to CDRR FGMP"],
};

// ── Evaluator ⇄ Checker loop ─────────────────────────────────────────
// The Checker can now send the application back to the Evaluator instead of
// always moving forward, so these two steps get a 3-field Step 5 form instead
// of the single generic Decision dropdown:
//   1. Action   — routing (where this goes next)
//   2. Decision — approval status (hidden entirely when Action = "For Compliance")
//   3. Remarks preset — scoped to the selected Action. Sets the Doctrack (FIS)
//      remarks and determines whether the log stays open on the same step or
//      advances per the selected Action. The freeform "Remarks (optional)"
//      box is a separate, manually-typed field for the application log only —
//      it is never auto-filled by the preset.
const GMP_EVAL_CHECKER_ACTIONS = {
  // "Endorsed to Supervisor" removed — FGMP Supervisor group no longer exists.
  // Printed/for-signature applications now go straight from the Evaluator to QA Admin.
  "Evaluator": ["Endorsed to Checker", "For Compliance", "Endorsed to QA Admin"],
  "Checker":           ["Endorsed to Evaluator"],
};

const GMP_APPROVAL_DECISION_OPTIONS = ["For Approval", "Approved", "Disapproved", "Cancelled Application"];

// staysOpen: true  -> log stays open on the same step/assignee; only the app
//                      log + Doctrack are updated, no advanceStep call.
// staysOpen: false -> log completes and forwards per the selected Action.
// Presets are scoped PER ACTION — picking an Action filters the preset list.
// NOTE: "For clarification with FROO" wasn't assigned an Action bucket in the
// spec I was given, so I placed it under "For Compliance" (it's a stays-open
// compliance-loop remark like the others there) — flag me if it belongs elsewhere.
const GMP_REMARKS_PRESETS = {
  "Evaluator": {
    "Endorsed to Checker": [
      { value: "Evaluated; Forwarded to Checker",            staysOpen: false },
      { value: "Evaluated compliance; Forwarded to checker", staysOpen: false },
    ],
    "For Compliance": [
      { value: "Evaluated; e-NOD",                      staysOpen: true },
      { value: "Re-evaluated; e-NOD",                   staysOpen: true },
      { value: "For clarification with FROO",           staysOpen: true },
      { value: "Acknowledged request for cancellation", staysOpen: true },
      { value: "Acknowledged Notification Letter",      staysOpen: true },
    ],
    "Endorsed to QA Admin": [
      { value: "Printed; For Signature", staysOpen: false },
    ],
  },
  "Checker": {
    "Endorsed to Evaluator": [
      { value: "Checked; Returned to evaluator for Printing", staysOpen: false },
      { value: "Checked; Returned to Evaluator",              staysOpen: false },
    ],
  },
};

// ── Auto-dated fields triggered by specific Remarks Presets ────────────────────
// "Evaluated; e-NOD" / "Re-evaluated; e-NOD" -> fill the next empty NOD date
// slot (1st -> 2nd -> 3rd -> 4th -> 5th) with today's date, editable.
// "Printed; For Signature" -> fill GMP_DATE_PRINTED with today's date, editable.
const GMP_NOD_TRIGGER_PRESETS = ["Evaluated; e-NOD", "Re-evaluated; e-NOD"];
const GMP_PRINTED_TRIGGER_PRESET = "Printed; For Signature";
const NOD_DATE_FIELDS = ["GMP_NOD_DATE_1", "GMP_NOD_DATE_2", "GMP_NOD_DATE_3", "GMP_NOD_DATE_4", "GMP_NOD_DATE_5"];
const NOD_DATE_LABELS = ["1st Date of NOD", "2nd Date of NOD", "3rd Date of NOD", "4th Date of NOD", "5th Date of NOD"];
const todayInputDate = () => new Date().toISOString().slice(0, 10);

// ── Compliance Deadline (Evaluator "For Compliance" action) ────────────────
const GMP_COMPLIANCE_DAY_PRESETS = [5, 10, 15];
const GMP_COMPLIANCE_DEFAULT_DAYS = 5;
const GMP_COMPLIANCE_WARN_THRESHOLD = 3; // working days remaining -> "Due Soon"

function isWeekend(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}
// Adds N working days (Mon–Fri) to a date, returning a new Date.
function addWorkingDays(startDate, n) {
  const d = new Date(startDate);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d)) added += 1;
  }
  return d;
}
// Working days strictly between two dates — used both to turn "N working
// days" into a deadline date and to turn a picked deadline date back into a
// working-day count, so the two inputs stay in sync with each other.
function workingDaysBetween(startDate, endDate) {
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end = new Date(endDate); end.setHours(0, 0, 0, 0);
  const forward = end > start;
  let count = 0;
  const d = new Date(forward ? start : end);
  const stop = forward ? end : start;
  while (d < stop) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d)) count += 1;
  }
  return forward ? count : -count;
}
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── Steps requiring a Decision Authority signer ────────────────────────────────
const GMP_AUTHORITY_STEPS = ["LRD Chief Admin", "OD Releasing"];
// LRD Chief Admin's signer is pulled from the QA group (id 6) — this is for
// record-keeping in the Application Logs / Doctrack only and does NOT change
// where the application is actually routed.
const GMP_AUTHORITY_GROUP_ID = { "LRD Chief Admin": 6, "OD Releasing": 7 };

// ── LRD Chief Admin: Action → optional Decision ("Signed") ───────────────────
const GMP_LRD_SIGN_TRIGGER_ACTION = "Forwarded to OD Receiving";
const GMP_LRD_DECISION_OPTIONS = ["Signed"];

// ── OD Receiving: Action → optional Decision ("For Signature") ──────────────
// Mirrors the LRD Chief Admin pattern above: picking the forwarding Action
// ("Endorsed to OD - Releasing", per GMP_STEP_DECISIONS above) reveals a
// required Decision confirmation and a required assignee picker scoped to
// the OD Releasing group.
const GMP_OD_RECEIVING_SIGN_TRIGGER_ACTION = "Endorsed to OD - Releasing";
const GMP_OD_RECEIVING_DECISION_OPTIONS = ["For Signature"];

// ── OD Releasing: single Action → single Decision ("Signed") ────────────────
const GMP_OD_RELEASING_ACTION = "Scanned, Stamped and Forwarded to AFO Records";
const GMP_OD_RELEASING_DECISION_OPTIONS = ["Signed"];

// ── Required "assign to next group" dropdown for every forwarding action ────
// Fully replaces the old freeform "Assign Next Step To (optional)" input.
// Keyed by the exact action string (unique across the whole workflow), so
// the same lookup works for Decking, Evaluator, Checker, QA Admin, and
// LRD Chief Admin / OD Receiving's forwarding actions alike. Any action not
// in this map (Disapprove, Return to X, OD Releasing's final action, and
// the Evaluator's "For Compliance" self-loop) gets no assignee picker at
// all — routing for those doesn't need one.
const GMP_ACTION_ASSIGNEE_GROUPS = {
  "Forwarded to Evaluator":      { groupId: 31, shortLabel: "Evaluator",        groupLabel: "Evaluator Group" },
  "Endorsed to Checker":         { groupId: 32, shortLabel: "Checking",         groupLabel: "Checking Group" },
  "Endorsed to QA Admin":        { groupId: 34, shortLabel: "QA Admin",         groupLabel: "QA Admin Group" },
  "Endorsed to Evaluator":       { groupId: 31, shortLabel: "Evaluator",        groupLabel: "Evaluator Group" },
  "Endorsed to LRD Chief Admin": { groupId: 17, shortLabel: "LRD Chief Admin",  groupLabel: "LRD Chief Admin Group" },
  "Forwarded to OD Receiving":   { groupId: 18, shortLabel: "OD Receiving",     groupLabel: "OD Receiving Group" },
  "Endorsed to OD - Releasing":  { groupId: 19, shortLabel: "OD Releasing",     groupLabel: "OD Releasing Group" },
  // FROO hands the NFI back to the Evaluator — same target group as the
  // Checker's "Endorsed to Evaluator", different action string.
  "Forwarded to CDRR FGMP":       { groupId: 31, shortLabel: "Evaluator",        groupLabel: "Evaluator Group" },
};
// Resolves task.applicationStep to the canonical "Evaluator" / "Checker" key used
// by GMP_EVAL_CHECKER_ACTIONS / GMP_REMARKS_PRESETS below. Accepts both the new
// "Evaluator" name and the legacy "Quality Evaluator" (in case the backend hasn't
// renamed every stored value yet), case/whitespace-insensitively, so the rich
// Action/Decision/Remarks-preset form doesn't silently disappear on a mismatch.
const GMP_EVAL_CHECKER_STEP_ALIASES = {
  "evaluator": "Evaluator",
  "quality evaluator": "Evaluator",
  "checker": "Checker",
};
function resolveEvalCheckerStep(step) {
  return GMP_EVAL_CHECKER_STEP_ALIASES[String(step || "").trim().toLowerCase()] ?? null;
}
// ── Type of Issuance options — shown when Decision = "Approved" (full list)
// or "Disapproved" (locked to "Letter of Disapproval" only). Persisted to
// GMP_TYPE_OF_ISSUANCE on the record and to decision_result on the log.
const GMP_TYPE_OF_ISSUANCE_APPROVED_OPTIONS = [
  "CGMP Clearance",
  "CGMP Clearance - COC",
  "Notice for Inspection - Fresh Application",
  "Notice for Inspection - Renewal Application",
  "NFI due to Non-compliance",
  "Extension of Validity",
  "Permit to Register",
];
const GMP_DISAPPROVED_TYPE_OF_ISSUANCE = "Letter of Disapproval";

// Mirrors GMP_NO_CERT_ISSUANCE_TYPES / GMP_NO_SECPA_ONLY_TYPES in
// app/crud/gmp_record.py — kept in sync purely for informational UI notes;
// the backend is the actual source of truth for blanking these fields.
const GMP_NO_CERT_ISSUANCE_TYPES = new Set([
  "Notice for Inspection - Fresh Application",
  "Notice for Inspection - Renewal Application",
  "NFI due to Non-compliance",
  "Permit to Register",
  "Letter of Disapproval",
]);
const GMP_NO_SECPA_ONLY_TYPES = new Set(["Extension of Validity"]);
function certNoteFor(type) {
  if (!type) return null;
  if (GMP_NO_CERT_ISSUANCE_TYPES.has(type)) {
    return "This issuance type has no Certificate Number, Certificate Validity, or SECPA Number.";
  }
  if (GMP_NO_SECPA_ONLY_TYPES.has(type)) {
    return "This issuance type has a Certificate Number and Certificate Validity, but no SECPA Number.";
  }
  return null;
}

// ── Decisions that require Certificate approval fields ─────────────────────────
const GMP_APPROVAL_DECISIONS = ["Certificate Released"];




// Details step dropdown options
const GMP_TRANSACTION_TYPE_OPTIONS = ["INITIAL", "RENEWAL", "RECONSTRUCTION", "CORRECTION", "COMPLIANCE DOCUMENTS"];
const GMP_CATEGORY_OPTIONS = ["PIC/S", "NON PIC/S", "LETTER and CORRECTION"];

const FIELD_LABELS = {
  GMP_LTO_COMPANY: "Name of Establishment", GMP_LTO_NUMBER: "LTO Number",
  GMP_TRANSACTION_TYPE: "Transaction Type", GMP_EST_CATEGORY: "Category",
  GMP_PRODUCT_LINE: "Product Line", GMP_DATE_RECEIVED: "Date Received",
  GMP_FOREIGN_MANUFACTURER: "Foreign Manufacturer", GMP_PICS_NONPICS: "PIC/S",
  GMP_TIMELINE: "Timeline", GMP_REMARKS: "Remarks",
  GMP_CERTIFICATE_NUMBER: "Certificate Number", GMP_TYPE_OF_ISSUANCE: "Type of Issuance",
  GMP_CERTIFICATE_VALIDITY: "Certificate Validity", GMP_SECPA_NUMBER: "SECPA Number",
  GMP_DECISION: "Recommendation", GMP_RELEASED_DATE: "Released Date", GMP_DATE_PRINTED: "Date Printed",
  GMP_END_DATE: "End Date", GMP_PROCESSED_TIME: "Processed Time", GMP_RELATED_DTN: "Related DTN",
  GMP_NOD_DATE_1: "1st Date of NOD", GMP_NOD_DATE_2: "2nd Date of NOD",
  GMP_NOD_DATE_3: "3rd Date of NOD", GMP_NOD_DATE_4: "4th Date of NOD", GMP_NOD_DATE_5: "5th Date of NOD",
  GMP_COMPLIANCE_DOCS_DATE_RECEIVED: "Compliance / Additional Docs Date Received",
  GMP_FOREIGN_MANUFACTURER_ADDRESS: "Foreign Manufacturer Address", GMP_LTO_ADDRESS: "Address",
};

// ── Step tab bar (display only — navigation is via Back/Next buttons only,
//    so users can't skip a step) ─────────────────────────────────────────────
const GMP_MODAL_STEP_LABELS = ["Details", "Documents", "Logs", "Action"];

// Full-width connected stepper — steps are spaced by flexible connector
// lines (not fixed-width pills), so the row always spans the modal instead
// of bunching up on the left when there are only a few steps. Kept deliberately
// thin (small circles, tight padding) so it doesn't eat into the step content
// area below it.
function StepTabs({ active, colors, darkMode }) {
  return (
    <div style={{
      flexShrink: 0, padding: "7px 20px",
      background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(16,185,129,0.03)",
      borderBottom: `1px solid ${colors.cardBorder}`,
      display: "flex", alignItems: "center",
    }}>
      {GMP_MODAL_STEP_LABELS.map((label, i) => {
        const id = i + 1;
        const isActive = active === id;
        const isDone = active > id;
        return (
          <React.Fragment key={id}>
            <div style={{
              display: "flex", alignItems: "center", gap: 7, flexShrink: 0,
              padding: "3px 9px 3px 3px", borderRadius: 999,
              background: isActive ? (darkMode ? "rgba(16,185,129,0.14)" : "#e7f8f0") : "transparent",
              transition: "background 0.18s",
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.6rem", fontWeight: 700,
                background: isActive
                  ? `linear-gradient(145deg,${ACCENT},#059669)`
                  : isDone ? `${ACCENT}18` : (darkMode ? "rgba(255,255,255,0.06)" : "#eef1f6"),
                color: isActive ? "#fff" : isDone ? ACCENT : colors.textTertiary,
                boxShadow: isActive ? `0 3px 8px -2px ${ACCENT}70` : "none",
                transition: "all 0.18s",
              }}>{isDone ? "✓" : id}</span>
              <span style={{
                fontSize: "0.7rem", fontWeight: isActive ? 700 : 500,
                color: isActive ? colors.textPrimary : colors.textTertiary,
                whiteSpace: "nowrap",
              }}>{label}</span>
            </div>
            {id < GMP_MODAL_STEP_LABELS.length && (
              <div style={{
                flex: 1, height: 1, margin: "0 10px", minWidth: 16, borderRadius: 1,
                background: isDone ? `${ACCENT}60` : colors.cardBorder,
                transition: "background 0.15s",
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Custom dropdown ────────────────────────────────────────────────────────
// Replaces the native <select> for the action/decision fields so the OPEN
// list matches the modal (rounded panel, hover highlight, checkmark on the
// selected row, full theming) instead of the OS chrome. The panel is
// portalled to <body> so it isn't clipped by the modal's scroll area or
// shifted by the .wfFieldBox:hover transform.
//
//  props: value (string), onChange(value) → same as the old e.target.value,
//         options (string[] OR {value,label}[]), placeholder, colors,
//         disabled, invalid.
function GmpSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  colors,
  disabled = false,
  invalid = false,
  allowClear = true, // show the placeholder as a selectable "clear" row
  ariaLabel,
}) {
  const norm = options.map((o) =>
    o && typeof o === "object"
      ? { value: String(o.value), label: o.label }
      : { value: String(o), label: String(o) },
  );
  const strValue = String(value ?? "");
  const selected = norm.find((o) => o.value === strValue) || null;

  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [rect, setRect] = useState(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const typeBuf = useRef({ str: "", t: 0 });
  const listId = useId();
  const dark = isDarkColors(colors);

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) {
      setOpen(false);
      return;
    }
    // Keep the panel inside the modal card, not spilling onto the page behind it.
    const card = el.closest("[data-gmp-modal-card]")?.getBoundingClientRect();
    const topLimit = Math.max(8, card ? card.top + 8 : 8);
    const bottomLimit = Math.min(window.innerHeight - 8, card ? card.bottom - 8 : window.innerHeight - 8);
    const GAP = 4;
    const spaceBelow = bottomLimit - r.bottom - GAP;
    const spaceAbove = r.top - topLimit - GAP;
    const up = spaceBelow < 180 && spaceAbove > spaceBelow;
    const room = up ? spaceAbove : spaceBelow;
    setRect({
      left: Math.round(r.left),
      width: Math.round(r.width),
      top: up ? undefined : Math.round(r.bottom + GAP),
      bottom: up ? Math.round(window.innerHeight - r.top + GAP) : undefined,
      maxHeight: Math.max(120, Math.min(320, Math.round(room))),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onDocDown = (e) => {
      if (btnRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", onDocDown);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onDocDown);
    };
  }, [open, place]);

  useEffect(() => {
    if (open) setActiveIdx(norm.findIndex((o) => o.value === strValue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || activeIdx < 0) return;
    panelRef.current
      ?.querySelector(`[data-idx="${activeIdx}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  const commit = (opt, refocus = true) => {
    onChange(opt.value);
    setOpen(false);
    if (refocus) btnRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(norm.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(allowClear ? -1 : 0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIdx(norm.length - 1);
    } else if (e.key === "Enter" || e.key === "Tab") {
      const keepFocus = e.key === "Enter"; // Tab must be free to move focus on
      if (e.key === "Enter") e.preventDefault();
      if (activeIdx === -1) {
        if (allowClear) commit({ value: "" }, keepFocus);
        else setOpen(false);
      } else if (activeIdx >= 0) commit(norm[activeIdx], keepFocus);
      else setOpen(false);
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      const now = Date.now();
      typeBuf.current.str = now - typeBuf.current.t > 700 ? e.key : typeBuf.current.str + e.key;
      typeBuf.current.t = now;
      const q = typeBuf.current.str.toLowerCase();
      const hit = norm.findIndex((o) => String(o.label).toLowerCase().startsWith(q));
      if (hit >= 0) setActiveIdx(hit);
    }
  };

  const trigger = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0.35rem 0.5rem",
    fontFamily: FONT,
    fontSize: "0.8rem",
    textAlign: "left",
    background: editableFieldInnerBg(colors),
    border: `1px solid ${invalid ? "#ef4444" : "transparent"}`,
    borderRadius: 8,
    color: selected ? colors.textPrimary : colors.textTertiary,
    outline: "none",
    boxSizing: "border-box",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    boxShadow: open ? `0 0 0 2px ${ACCENT}55` : "none",
    transition: "box-shadow 0.12s",
  };

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        style={trigger}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : placeholder}
        </span>
        <span
          aria-hidden
          style={{
            flexShrink: 0,
            transition: "transform 0.15s",
            transform: open ? "rotate(180deg)" : "none",
            color: colors.textTertiary,
            fontSize: "0.62rem",
            lineHeight: 1,
          }}
        >
          ▼
        </span>
      </button>

      {open && rect &&
        createPortal(
          <div
            ref={panelRef}
            id={listId}
            role="listbox"
            className="gmpTabScroll"
            style={{
              position: "fixed",
              left: rect.left,
              width: rect.width,
              top: rect.top,
              bottom: rect.bottom,
              maxHeight: rect.maxHeight,
              overflowY: "auto",
              zIndex: 11000,
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 10,
              boxShadow: dark
                ? "0 18px 44px -12px rgba(0,0,0,0.6)"
                : "0 18px 44px -12px rgba(15,23,42,0.28)",
              padding: 4,
              fontFamily: FONT,
              animation: "gmpBackdropIn 0.1s ease",
            }}
          >
            {allowClear && (
              <GmpSelectRow
                idx={-1}
                label={placeholder}
                muted
                selected={strValue === ""}
                active={activeIdx === -1}
                onMouseEnter={() => setActiveIdx(-1)}
                onSelect={() => commit({ value: "" })}
                colors={colors}
              />
            )}
            {norm.map((o, i) => (
              <GmpSelectRow
                key={o.value || i}
                idx={i}
                label={o.label}
                selected={o.value === strValue}
                active={i === activeIdx}
                onMouseEnter={() => setActiveIdx(i)}
                onSelect={() => commit(o)}
                colors={colors}
              />
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

function GmpSelectRow({ idx, label, muted, selected, active, onSelect, onMouseEnter, colors }) {
  return (
    <div
      role="option"
      data-idx={idx}
      aria-selected={selected}
      onMouseEnter={onMouseEnter}
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0.45rem 0.55rem",
        borderRadius: 7,
        fontSize: "0.8rem",
        cursor: "pointer",
        color: muted && !selected ? colors.textTertiary : colors.textPrimary,
        fontWeight: selected ? 700 : 500,
        background: active ? `${ACCENT}22` : selected ? `${ACCENT}12` : "transparent",
      }}
    >
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          width: 13,
          color: ACCENT,
          fontSize: "0.72rem",
          visibility: selected ? "visible" : "hidden",
        }}
      >
        ✓
      </span>
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
    </div>
  );
}

// ── Custom date picker ─────────────────────────────────────────────────────
// Same idea as GmpSelect: replaces <input type="date"> so the calendar
// matches the modal instead of the OS chrome. Value in / out is the same
// "YYYY-MM-DD" string the native input used, so it's a drop-in.
function GmpDatePicker({
  value,
  onChange,
  colors,
  placeholder = "Pick a date…",
  disabled = false,
  fullWidth = false,
  ariaLabel,
}) {
  const iso = toDateInputValue(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const p = isoParts(iso || isoToday());
    return { y: p.y, m: p.m };
  });
  const [focusISO, setFocusISO] = useState(iso || isoToday());
  const [rect, setRect] = useState(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const dark = isDarkColors(colors);
  const today = isoToday();

  useEffect(() => {
    if (!open) return;
    const base = iso || isoToday();
    const p = isoParts(base);
    setView({ y: p.y, m: p.m });
    setFocusISO(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) {
      setOpen(false);
      return;
    }
    const card = el.closest("[data-gmp-modal-card]")?.getBoundingClientRect();
    const topLimit = Math.max(8, card ? card.top + 8 : 8);
    const bottomLimit = Math.min(
      window.innerHeight - 8,
      card ? card.bottom - 8 : window.innerHeight - 8,
    );
    const cardLeft = card ? card.left + 8 : 8;
    const cardRight = card ? card.right - 8 : window.innerWidth - 8;
    const W = 260;
    const PANEL_H = 316;
    const GAP = 4;
    const below = bottomLimit - r.bottom - GAP;
    const above = r.top - topLimit - GAP;
    const up = below < PANEL_H && above > below;
    setRect({
      left: Math.round(Math.max(cardLeft, Math.min(r.left, cardRight - W))),
      width: W,
      top: up ? undefined : Math.round(r.bottom + GAP),
      bottom: up ? Math.round(window.innerHeight - r.top + GAP) : undefined,
      maxHeight: Math.max(240, Math.min(PANEL_H, Math.round(up ? above : below))),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onDocDown = (e) => {
      if (btnRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", onDocDown);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onDocDown);
    };
  }, [open, place]);

  const pick = (dISO) => {
    onChange(dISO);
    setOpen(false);
    btnRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (["Enter", " ", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    const p = isoParts(focusISO);
    const move = (days) => {
      e.preventDefault();
      const ni = isoFromDate(new Date(p.y, p.m, p.d + days));
      setFocusISO(ni);
      const np = isoParts(ni);
      setView({ y: np.y, m: np.m });
    };
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
    } else if (e.key === "ArrowLeft") move(-1);
    else if (e.key === "ArrowRight") move(1);
    else if (e.key === "ArrowUp") move(-7);
    else if (e.key === "ArrowDown") move(7);
    else if (e.key === "PageUp") {
      e.preventDefault();
      setView((v) => shiftMonth(v, e.shiftKey ? -12 : -1));
    } else if (e.key === "PageDown") {
      e.preventDefault();
      setView((v) => shiftMonth(v, e.shiftKey ? 12 : 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(focusISO);
    }
  };

  const navBtn = {
    border: "none",
    background: "transparent",
    color: colors.textSecondary,
    cursor: "pointer",
    fontSize: "1rem",
    lineHeight: 1,
    padding: "4px 8px",
    borderRadius: 7,
    fontFamily: FONT,
  };
  const footBtn = {
    flex: 1,
    border: `1px solid ${colors.cardBorder}`,
    background: "transparent",
    color: colors.textSecondary,
    cursor: "pointer",
    fontSize: "0.72rem",
    fontWeight: 600,
    padding: "5px 0",
    borderRadius: 7,
    fontFamily: FONT,
  };

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        style={{
          width: fullWidth ? "100%" : "auto",
          minWidth: fullWidth ? undefined : 150,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "0.35rem 0.5rem",
          fontFamily: FONT,
          fontSize: "0.8rem",
          textAlign: "left",
          background: editableFieldInnerBg(colors),
          border: "1px solid transparent",
          borderRadius: 8,
          color: iso ? colors.textPrimary : colors.textTertiary,
          fontWeight: iso ? 600 : 400,
          outline: "none",
          boxSizing: "border-box",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.55 : 1,
          boxShadow: open ? `0 0 0 2px ${ACCENT}55` : "none",
          transition: "box-shadow 0.12s",
        }}
      >
        <span aria-hidden style={{ flexShrink: 0, fontSize: "0.82rem", lineHeight: 1 }}>📅</span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {iso ? fmtDateLong(iso) : placeholder}
        </span>
      </button>

      {open && rect &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={ariaLabel || "Choose date"}
            onKeyDown={onKeyDown}
            style={{
              position: "fixed",
              left: rect.left,
              width: rect.width,
              top: rect.top,
              bottom: rect.bottom,
              maxHeight: rect.maxHeight,
              overflowY: "auto",
              zIndex: 11000,
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 12,
              padding: 10,
              fontFamily: FONT,
              boxShadow: dark
                ? "0 18px 44px -12px rgba(0,0,0,0.6)"
                : "0 18px 44px -12px rgba(15,23,42,0.28)",
              animation: "gmpBackdropIn 0.1s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <button type="button" tabIndex={-1} aria-label="Previous month"
                onClick={() => setView((v) => shiftMonth(v, -1))} style={navBtn}>‹</button>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: colors.textPrimary }}>
                {MONTH_NAMES[view.m]} {view.y}
              </div>
              <button type="button" tabIndex={-1} aria-label="Next month"
                onClick={() => setView((v) => shiftMonth(v, 1))} style={navBtn}>›</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 2 }}>
              {DOW.map((d) => (
                <div key={d} style={{
                  textAlign: "center", fontSize: "0.58rem", fontWeight: 700,
                  color: colors.textTertiary, padding: "2px 0",
                }}>{d}</div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
              {monthGrid(view).map((dt) => {
                const cellISO = isoFromDate(dt);
                const inMonth = dt.getMonth() === view.m;
                const isSel = !!iso && cellISO === iso;
                const isToday = cellISO === today;
                const isFocus = cellISO === focusISO;
                return (
                  <button
                    key={cellISO}
                    type="button"
                    tabIndex={-1}
                    onClick={() => pick(cellISO)}
                    onMouseEnter={() => setFocusISO(cellISO)}
                    aria-current={isToday ? "date" : undefined}
                    aria-selected={isSel}
                    style={{
                      border: "none",
                      borderRadius: 7,
                      padding: "6px 0",
                      fontFamily: FONT,
                      fontSize: "0.74rem",
                      cursor: "pointer",
                      fontWeight: isSel || isToday ? 700 : 500,
                      color: isSel ? "#fff" : inMonth ? colors.textPrimary : colors.textTertiary,
                      opacity: inMonth ? 1 : 0.45,
                      background: isSel
                        ? ACCENT
                        : isFocus
                          ? `${ACCENT}22`
                          : isToday
                            ? `${ACCENT}14`
                            : "transparent",
                    }}
                  >
                    {dt.getDate()}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button type="button" tabIndex={-1} onClick={() => pick(today)} style={footBtn}>Today</button>
              {iso && (
                <button type="button" tabIndex={-1} onClick={() => pick("")} style={footBtn}>Clear</button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// ── Editable dropdown field helper (Step 1) ─────────────────────────────────
function ESelectField({ label, fieldKey, value, originalValue, options, onChange, colors, fullWidth }) {
  const isDirty = String(value ?? "") !== String(originalValue ?? "");
  const rawValue = value ?? "";
  // Match the stored value against the option list case/whitespace-insensitively —
  // a <select> only shows a value as "selected" on an exact string match, so a DB
  // value like "initial" (or "Initial") against options like "INITIAL" would
  // otherwise silently render blank even though data is actually there.
  const matchedOption = options.find(
    (o) => o.trim().toLowerCase() === String(rawValue).trim().toLowerCase()
  );
  // If it's set but doesn't match any known option (legacy/unexpected data),
  // still show it — as its own option — rather than hiding it as blank.
  const hasUnknownValue = rawValue !== "" && !matchedOption;
  const selectValue = matchedOption ?? rawValue;
  return (
    <div className="wfFieldBox" style={{
      gridColumn: fullWidth ? "1 / -1" : undefined,
      padding: "0.6rem 0.75rem",
      background: editableFieldBg(colors),
      border: `1px solid ${isDirty ? "rgba(245,158,11,0.4)" : "transparent"}`,
      borderRadius: 12,
      boxShadow: fieldCardShadow(colors, isDirty),
      display: "flex", flexDirection: "column", gap: 5,
      transition: "box-shadow 0.15s, transform 0.15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.07em", color: colors.textTertiary }}>{label}</span>
        {isDirty && (
          <span style={{
            fontSize: "0.55rem", fontWeight: 700, color: "#b45309",
            background: "rgba(245,158,11,0.14)", padding: "0.05rem 0.4rem", borderRadius: 99,
          }}>✎ edited</span>
        )}
      </div>
      <GmpSelect
        value={selectValue}
        onChange={(v) => onChange(fieldKey, v)}
        placeholder="Select…"
        options={
          hasUnknownValue
            ? [{ value: rawValue, label: `${rawValue} (current)` }, ...options]
            : options
        }
        colors={colors}
        ariaLabel={label}
      />
      {isDirty && (
        <span style={{ fontSize: "0.62rem", color: colors.textTertiary, fontStyle: "italic" }}>
          Original: {originalValue || "empty"}
        </span>
      )}
    </div>
  );
}
// ── Editable field helper (Step 1 / Step 2) ────────────────────────────────────
function EField({ label, fieldKey, value, originalValue, onChange, colors, fullWidth }) {
  const isDirty = String(value ?? "") !== String(originalValue ?? "");
  return (
    <div className="wfFieldBox" style={{
      gridColumn: fullWidth ? "1 / -1" : undefined,
      padding: "0.6rem 0.75rem",
      background: editableFieldBg(colors),
      border: `1px solid ${isDirty ? "rgba(245,158,11,0.4)" : "transparent"}`,
      borderRadius: 12,
      boxShadow: fieldCardShadow(colors, isDirty),
      display: "flex", flexDirection: "column", gap: 5,
      transition: "box-shadow 0.15s, transform 0.15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.07em", color: colors.textTertiary }}>{label}</span>
        {isDirty && (
          <span style={{
            fontSize: "0.55rem", fontWeight: 700, color: "#b45309",
            background: "rgba(245,158,11,0.14)", padding: "0.05rem 0.4rem", borderRadius: 99,
          }}>✎ edited</span>
        )}
      </div>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        style={{
          width: "100%", padding: "0.35rem 0.5rem", background: editableFieldInnerBg(colors),
          border: "none",
          borderRadius: 8, color: colors.textPrimary, fontSize: "0.8rem",
          fontWeight: 600, outline: "none", boxSizing: "border-box", fontFamily: FONT,
        }}
      />
      {isDirty && (
        <span style={{ fontSize: "0.62rem", color: colors.textTertiary, fontStyle: "italic" }}>
          Original: {originalValue || "empty"}
        </span>
      )}
    </div>
  );
}

// ── Editable date field helper (Step 1 / Step 2) ────────────────────────────
function EDateField({ label, fieldKey, value, originalValue, onChange, colors, fullWidth }) {
  const isDirty = String(value ?? "") !== String(originalValue ?? "");
  return (
    <div className="wfFieldBox" style={{
      gridColumn: fullWidth ? "1 / -1" : undefined,
      padding: "0.6rem 0.75rem",
      background: editableFieldBg(colors),
      border: `1px solid ${isDirty ? "rgba(245,158,11,0.4)" : "transparent"}`,
      borderRadius: 12,
      boxShadow: fieldCardShadow(colors, isDirty),
      display: "flex", flexDirection: "column", gap: 5,
      transition: "box-shadow 0.15s, transform 0.15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.07em", color: colors.textTertiary }}>{label}</span>
        {isDirty && (
          <span style={{
            fontSize: "0.55rem", fontWeight: 700, color: "#b45309",
            background: "rgba(245,158,11,0.14)", padding: "0.05rem 0.4rem", borderRadius: 99,
          }}>✎ edited</span>
        )}
      </div>
      <GmpDatePicker
        value={value}
        onChange={(v) => onChange(fieldKey, v)}
        colors={colors}
        fullWidth
        placeholder="Pick a date…"
        ariaLabel={label}
      />
      {isDirty && (
        <span style={{ fontSize: "0.62rem", color: colors.textTertiary, fontStyle: "italic" }}>
          Original: {originalValue || "empty"}
        </span>
      )}
    </div>
  );
}

// ── Section — labeled divider used to group fields within the Details step ──
function Section({ icon, title, colors, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          width: 22, height: 22, borderRadius: 8, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.72rem", background: `${ACCENT}14`,
        }}>{icon}</span>
        <span style={{ fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.07em", color: colors.textTertiary, whiteSpace: "nowrap" }}>{title}</span>
        <div style={{ height: 1, flex: 1, background: colors.cardBorder, borderRadius: 1 }} />
      </div>
      {children}
    </div>
  );
}

// ── Step 1 — Details: record info + application details, merged (editable) ──
// DTN, Reference No, Related DTN and Status are all surfaced together in the
// summary card up top, instead of being split across two separate steps.
function StepDetails({ record, task, editedFields, onFieldChange, colors }) {
  if (!record) return <div style={{ padding: 24, color: colors.textTertiary, fontSize: "0.8rem" }}>Loading…</div>;
  const effectiveStatus = getEffectiveStatusWM(record);
  const statusCfg = effectiveStatus.toUpperCase() === "IN PROGRESS"
    ? { bg: "#fff7ed", color: "#c2410c" }
    : (GMP_STATUS_COLORS[effectiveStatus.toUpperCase()] ?? { bg: "#f1f5f9", color: "#64748b" });
  const val = (k) => (k in editedFields ? editedFields[k] : (record[k] ?? ""));

  // Timeline = total working days allotted from Date Received. Reuses the
  // same working-day math as the Compliance Deadline widget elsewhere in
  // this file (addWorkingDays / workingDaysUntilWM) to show how many of
  // those days are left, so this stays consistent with that calculation.
  const timelineDays = parseInt(record.GMP_TIMELINE, 10);
  let timelineBadge = null;
  if (!isNaN(timelineDays) && timelineDays > 0 && record.GMP_DATE_RECEIVED) {
    const deadline = addWorkingDays(new Date(record.GMP_DATE_RECEIVED), timelineDays);
    const remaining = workingDaysUntilWM(toISODate(deadline));
    const isOverdue = remaining < 0;
    timelineBadge = {
      label: isOverdue ? `OVERDUE (${Math.abs(remaining)}D)` : `WITHIN (${remaining}D)`,
      icon: isOverdue ? "⚠" : "✓",
      color: isOverdue ? "#dc2626" : "#16a34a",
    };
  }

  const label = (text, color) => (
    <div style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.06em", color, marginBottom: 4 }}>{text}</div>
  );
  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{
        padding: "16px 22px", borderRadius: 18,
        background: "linear-gradient(135deg,rgba(59,130,246,0.08),rgba(16,185,129,0.03))",
        boxShadow: "0 10px 28px -18px rgba(37,99,235,0.45)",
        display: "flex", gap: 30, flexWrap: "wrap", alignItems: "center",
      }}>
        <div>
          {label("Document Tracking No.", "#2563eb")}
          <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#2563eb",
            textDecoration: "underline", fontFamily: "ui-monospace,monospace" }}>
            {task?.dtn || "—"}
          </div>
        </div>
        <div>
          {label("Reference No.", "#16a34a")}
          <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#16a34a",
            fontFamily: "ui-monospace,monospace" }}>
            {record.GMP_REFERENCE_NO || "N/A"}
          </div>
        </div>
        {record.GMP_RELATED_DTN && (
          <div>
            {label("Related DTN", "#16a34a")}
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#16a34a",
              fontFamily: "ui-monospace,monospace" }}>
              {record.GMP_RELATED_DTN}
            </div>
          </div>
        )}
        <div>
          {label("App Status", colors.textTertiary)}
          <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "4px 12px",
            borderRadius: 99, background: statusCfg.color, color: "#fff", display: "inline-block" }}>
            {fmt(effectiveStatus)}
          </span>
        </div>
        {record.GMP_TIMELINE && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              {label("Timeline", colors.textTertiary)}
              <div style={{ fontSize: "0.9rem", color: colors.textPrimary }}>
                <span style={{ fontWeight: 800 }}>{record.GMP_TIMELINE}</span>{" "}
                <span style={{ fontSize: "0.72rem", color: colors.textTertiary, fontWeight: 500 }}>working days</span>
              </div>
            </div>
            {timelineBadge && (
              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "5px 12px",
                borderRadius: 99, background: timelineBadge.color, color: "#fff", whiteSpace: "nowrap" }}>
                {timelineBadge.icon} {timelineBadge.label}
              </span>
            )}
          </div>
        )}
      </div>

      <Section icon="🏢" title="Application Info" colors={colors}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <EField label="Name of Establishment" fieldKey="GMP_LTO_COMPANY" value={val("GMP_LTO_COMPANY")} originalValue={record.GMP_LTO_COMPANY} onChange={onFieldChange} colors={colors} fullWidth />
          <EField label="LTO Number" fieldKey="GMP_LTO_NUMBER" value={val("GMP_LTO_NUMBER")} originalValue={record.GMP_LTO_NUMBER} onChange={onFieldChange} colors={colors} />
          <ESelectField label="Transaction Type" fieldKey="GMP_TRANSACTION_TYPE" value={val("GMP_TRANSACTION_TYPE")} originalValue={record.GMP_TRANSACTION_TYPE} options={GMP_TRANSACTION_TYPE_OPTIONS} onChange={onFieldChange} colors={colors} />
          <ESelectField label="Category" fieldKey="GMP_EST_CATEGORY" value={val("GMP_EST_CATEGORY")} originalValue={record.GMP_EST_CATEGORY} options={GMP_CATEGORY_OPTIONS} onChange={onFieldChange} colors={colors} />
          <EField label="Product Line" fieldKey="GMP_PRODUCT_LINE" value={val("GMP_PRODUCT_LINE")} originalValue={record.GMP_PRODUCT_LINE} onChange={onFieldChange} colors={colors} />
          <EDateField label="Date Received" fieldKey="GMP_DATE_RECEIVED" value={val("GMP_DATE_RECEIVED")} originalValue={record.GMP_DATE_RECEIVED} onChange={onFieldChange} colors={colors} />
          <EField label="Foreign Manufacturer" fieldKey="GMP_FOREIGN_MANUFACTURER" value={val("GMP_FOREIGN_MANUFACTURER")} originalValue={record.GMP_FOREIGN_MANUFACTURER} onChange={onFieldChange} colors={colors} />
          <EField label="Related DTN" fieldKey="GMP_RELATED_DTN" value={val("GMP_RELATED_DTN")} originalValue={record.GMP_RELATED_DTN} onChange={onFieldChange} colors={colors} />
          <EField label="Timeline" fieldKey="GMP_TIMELINE" value={val("GMP_TIMELINE")} originalValue={record.GMP_TIMELINE} onChange={onFieldChange} colors={colors} />
          <EField label="Foreign Manufacturer Address" fieldKey="GMP_FOREIGN_MANUFACTURER_ADDRESS" value={val("GMP_FOREIGN_MANUFACTURER_ADDRESS")} originalValue={record.GMP_FOREIGN_MANUFACTURER_ADDRESS} onChange={onFieldChange} colors={colors} fullWidth />
          <EField label="Address" fieldKey="GMP_LTO_ADDRESS" value={val("GMP_LTO_ADDRESS")} originalValue={record.GMP_LTO_ADDRESS} onChange={onFieldChange} colors={colors} fullWidth />
          <EField label="Remarks" fieldKey="GMP_REMARKS" value={val("GMP_REMARKS")} originalValue={record.GMP_REMARKS} onChange={onFieldChange} colors={colors} fullWidth />
        </div>
      </Section>

      <Section icon="📄" title="Issuance & Certificate" colors={colors}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <ESelectField label="Type of Issuance" fieldKey="GMP_TYPE_OF_ISSUANCE" value={val("GMP_TYPE_OF_ISSUANCE")} originalValue={record.GMP_TYPE_OF_ISSUANCE} options={[...GMP_TYPE_OF_ISSUANCE_APPROVED_OPTIONS, GMP_DISAPPROVED_TYPE_OF_ISSUANCE]} onChange={onFieldChange} colors={colors} />
          <EField label="Certificate Number" fieldKey="GMP_CERTIFICATE_NUMBER" value={val("GMP_CERTIFICATE_NUMBER")} originalValue={record.GMP_CERTIFICATE_NUMBER} onChange={onFieldChange} colors={colors} />
          <EDateField label="Certificate Validity" fieldKey="GMP_CERTIFICATE_VALIDITY" value={val("GMP_CERTIFICATE_VALIDITY")} originalValue={record.GMP_CERTIFICATE_VALIDITY} onChange={onFieldChange} colors={colors} />
          <EField label="SECPA Number" fieldKey="GMP_SECPA_NUMBER" value={val("GMP_SECPA_NUMBER")} originalValue={record.GMP_SECPA_NUMBER} onChange={onFieldChange} colors={colors} />
        </div>
      </Section>

      <Section icon="🗓️" title="Dates & Processing" colors={colors}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <EDateField label="Released Date" fieldKey="GMP_RELEASED_DATE" value={val("GMP_RELEASED_DATE")} originalValue={record.GMP_RELEASED_DATE} onChange={onFieldChange} colors={colors} />
          <EDateField label="Date Printed" fieldKey="GMP_DATE_PRINTED" value={val("GMP_DATE_PRINTED")} originalValue={record.GMP_DATE_PRINTED} onChange={onFieldChange} colors={colors} />
          <EDateField label="End Date" fieldKey="GMP_END_DATE" value={val("GMP_END_DATE")} originalValue={record.GMP_END_DATE} onChange={onFieldChange} colors={colors} />
          <EField label="Processed Time" fieldKey="GMP_PROCESSED_TIME" value={val("GMP_PROCESSED_TIME")} originalValue={record.GMP_PROCESSED_TIME} onChange={onFieldChange} colors={colors} />
        </div>
      </Section>

      <Section icon="⏰" title="Notice of Deficiency" colors={colors}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[1,2,3,4,5].map(n => (
            <EDateField key={n}
              label={`${n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : n+"th"} Date of NOD`}
              fieldKey={`GMP_NOD_DATE_${n}`}
              value={val(`GMP_NOD_DATE_${n}`)}
              originalValue={record[`GMP_NOD_DATE_${n}`]}
              onChange={onFieldChange} colors={colors} />
          ))}
        </div>
      </Section>

      <Section icon="📋" title="Compliance Docs" colors={colors}>
        <EDateField label="Compliance / Additional Docs Date Received" fieldKey="GMP_COMPLIANCE_DOCS_DATE_RECEIVED" value={val("GMP_COMPLIANCE_DOCS_DATE_RECEIVED")} originalValue={record.GMP_COMPLIANCE_DOCS_DATE_RECEIVED} onChange={onFieldChange} colors={colors} fullWidth />
      </Section>
    </div>
  );
}

// ── Step 2 — Upload Documents (shared with GMPDocumentsModal.jsx) ──────────────
function StepDocsGMP({ task, colors, darkMode }) {
  return (
    <div style={{ padding: "16px 20px" }}>
      <ApplicationDocumentsPanel
        dtn={task?.dtn}
        dbEntryType="GMP"
        mainDbId={task?.gmp_record_id}
        colors={colors}
        darkMode={darkMode}
      />
    </div>
  );
}

// ── Step 3 — Application logs timeline ───────────────────────────────────────
function LogCard({ log, isLast, colors }) {
  const isDone   = log.application_status === "COMPLETED" || log.application_status === "RELEASED";
  const isActive = log.application_status === "IN PROGRESS";
  const stepDef  = GMP_STEPS.find(s => s.id === log.application_step || s.label === log.application_step);
  const color    = stepDef?.color ?? "#6366f1";
  return (
    <div style={{ display: "flex", gap: 13 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: isDone ? `linear-gradient(145deg,${ACCENT},#059669)` : isActive ? "linear-gradient(145deg,#fb923c,#f97316)" : "#eef1f6",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: isDone || isActive ? "#fff" : "#9aa1ad", fontSize: "0.82rem", fontWeight: 800,
          boxShadow: isActive ? "0 0 0 5px rgba(249,115,22,0.16)" : isDone ? `0 3px 10px -3px ${ACCENT}70` : "none",
        }}>{isDone ? "✓" : isActive ? "●" : "○"}</div>
        {!isLast && <div style={{ width: 2, flex: 1, minHeight: 14, margin: "4px 0", borderRadius: 1,
          background: isDone ? `${ACCENT}45` : colors.divider }} />}
      </div>
      {/* A full hairline border (not just the drop shadow) is what actually
          reads as "separate surface" at rest against a same-tone page
          background — the shadow alone was too easy to miss without
          hovering. borderLeft is re-declared after the shorthand so its
          thicker step-colored accent wins over the shorthand's left edge. */}
      <div className="wfLogCard" style={{ flex: 1, marginBottom: isLast ? 0 : 16,
        background: colors.cardBg, borderRadius: 16, overflow: "hidden",
        border: `1px solid ${colors.cardBorder}`,
        borderLeft: `3px solid ${isActive ? "#f97316" : isDone ? color : "#cbd2dc"}`,
        boxShadow: isActive ? "0 8px 22px -10px rgba(249,115,22,0.35)" : "0 4px 16px -10px rgba(16,24,20,0.16)",
      }}>
        {(() => {
          // action_type doubles as a system tag (REASSIGNMENT/REROUTE/
          // ISSUANCE_ADDED) on some rows and as the Decision value
          // (Approved/Disapproved/etc.) on eval/checker rows — tell them
          // apart before rendering.
          const isSystemTag = log.action_type === "REASSIGNMENT" || log.action_type === "REROUTE" || log.action_type === "ISSUANCE_ADDED";
          const decisionValue = isSystemTag ? null : log.action_type;
          return (
            <>
              <div style={{ padding: "10px 14px 7px", borderBottom: `1px solid ${colors.divider}`,
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                <span style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: colors.textPrimary }}>{log.application_step}</span>
                  {/* No "Assigned To" label — just the name in the step's own
                      color, tying it to who's handling/handled this step
                      without implying a live, ongoing assignment. */}
                  {log.user_name && (
                    <span style={{ fontSize: "0.72rem", fontWeight: 600, color }}>· {log.user_name}</span>
                  )}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ fontSize: "0.63rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                    background: isDone ? "#dcfce7" : isActive ? "#fff7ed" : "#f1f5f9",
                    color: isDone ? "#15803d" : isActive ? "#c2410c" : "#94a3b8" }}>
                    {log.application_status || "Pending"}
                  </span>
                  {isSystemTag && <span style={{ fontSize: "0.63rem", fontWeight: 700, padding: "2px 8px",
                    borderRadius: 99, background: "rgba(99,102,241,0.08)", color: "#6366f1" }}>
                    {log.action_type === "ISSUANCE_ADDED" ? "Issuance Added" : log.action_type}
                  </span>}
                </div>
              </div>
              <div style={{ padding: "8px 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px 12px" }}>
                <div><p style={{ margin: "0 0 2px", fontSize: "0.58rem", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>Action</p>
                  <p style={{ margin: 0, fontSize: "0.74rem", color: colors.textPrimary }}>{log.application_decision || "—"}</p></div>
                <div><p style={{ margin: "0 0 2px", fontSize: "0.58rem", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>Recommendation</p>
                  <p style={{ margin: 0, fontSize: "0.74rem", color: colors.textPrimary }}>{decisionValue || "—"}</p></div>
                <div><p style={{ margin: "0 0 2px", fontSize: "0.58rem", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>Forwarded On</p>
                  <p style={{ margin: 0, fontSize: "0.72rem", color: colors.textPrimary }}>{fmtDT(log.start_date)}</p></div>
                <div><p style={{ margin: "0 0 2px", fontSize: "0.58rem", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>Accomplished</p>
                  <p style={{ margin: 0, fontSize: "0.72rem", color: colors.textPrimary }}>{fmtDT(log.accomplished_date)}</p></div>
                {log.decision_result && <div style={{ gridColumn: "1/-1" }}>
                  <p style={{ margin: "0 0 2px", fontSize: "0.58rem", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>Type of Issuance</p>
                  <p style={{ margin: 0, fontSize: "0.74rem", fontWeight: 600, color: colors.textPrimary }}>{log.decision_result}</p>
                </div>}
                {log.decision_authority_name && <div style={{ gridColumn: "1/-1" }}>
                  <p style={{ margin: "0 0 2px", fontSize: "0.58rem", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>Decision Authority (Signed By)</p>
                  <p style={{ margin: 0, fontSize: "0.74rem", fontWeight: 600, color: colors.textPrimary }}>{log.decision_authority_name}</p>
                </div>}
                {log.doctrack_remarks && <div style={{ gridColumn: "1/-1" }}>
                  <p style={{ margin: "0 0 2px", fontSize: "0.58rem", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>Remarks Preset (Doctrack)</p>
                  <p style={{ margin: 0, fontSize: "0.74rem", fontWeight: 600, color: colors.textPrimary }}>{log.doctrack_remarks}</p>
                </div>}
                {log.application_remarks && <div style={{ gridColumn: "1/-1" }}>
                  <p style={{ margin: "0 0 2px", fontSize: "0.58rem", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>Remarks</p>
                  <p style={{ margin: 0, fontSize: "0.72rem", color: colors.textSecondary, fontStyle: "italic" }}>{log.application_remarks}</p>
                </div>}
              </div>
              {log.deadline_date && (() => {
                const remaining = workingDaysUntilWM(log.deadline_date);
                const status = remaining < 0
                  ? { label: "Overdue", color: "#ef4444", bg: "rgba(239,68,68,0.12)", dot: "#ef4444" }
                  : remaining <= 3
                    ? { label: "Due Soon", color: "#c2410c", bg: "rgba(245,158,11,0.14)", dot: "#f59e0b" }
                    : { label: "On Track", color: "#15803d", bg: "rgba(16,185,129,0.14)", dot: "#10b981" };
                return (
                  <div style={{
                    margin: "0 14px 14px", padding: "10px 13px", borderRadius: 12,
                    background: status.bg,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    flexWrap: "wrap", gap: 8,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <p style={{ margin: "0 0 2px", fontSize: "0.56rem", fontWeight: 700,
                          textTransform: "uppercase", letterSpacing: "0.07em", color: status.color }}>
                          ⏰ Compliance Deadline
                        </p>
                        <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: status.color }}>
                          {formatShortDateWM(log.deadline_date)}
                        </p>
                      </div>
                      {log.working_days != null && (
                        <div>
                          <p style={{ margin: "0 0 2px", fontSize: "0.56rem", fontWeight: 700,
                            textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>
                            Allotted
                          </p>
                          <p style={{ margin: 0, fontSize: "0.74rem", fontWeight: 700, color: colors.textPrimary }}>
                            {log.working_days}d
                          </p>
                        </div>
                      )}
                      <div>
                        <p style={{ margin: "0 0 2px", fontSize: "0.56rem", fontWeight: 700,
                          textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>
                          Remaining
                        </p>
                        <p style={{ margin: 0, fontSize: "0.74rem", fontWeight: 700, color: colors.textPrimary }}>
                          {remaining < 0 ? `${Math.abs(remaining)}d overdue` : `${remaining}d left`}
                        </p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                      background: colors.cardBg, color: status.color, border: `1px solid ${status.color}50`,
                      display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: status.dot, display: "inline-block" }} />
                      {status.label.toUpperCase()}
                    </span>
                  </div>
                );
              })()}
            </>
          );
        })()}
      </div>
    </div>
  );
}

function StepLogs({ gmpRecordId, dtn, colors }) {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!gmpRecordId) return;
    setLoading(true);
    getGMPRecordLogs(gmpRecordId)
      .then(data => { setLogs(data); setLoading(false); })
      .catch(() => { setError("Failed to load logs."); setLoading(false); });
  }, [gmpRecordId]);

  const completed  = logs.filter(l => l.application_status === "COMPLETED" || l.application_status === "RELEASED").length;
  const inProgress = logs.filter(l => l.application_status === "IN PROGRESS").length;

  if (loading) return (
    <div style={{ padding: 32, display: "flex", justifyContent: "center", color: colors.textTertiary, fontSize: "0.8rem" }}>
      <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(16,185,129,0.2)",
        borderTopColor: ACCENT, borderRadius: "50%", animation: "spin 0.6s linear infinite", marginRight: 8 }} />
      Loading logs…
    </div>
  );
  if (error) return <div style={{ padding: 24, color: "#ef4444", fontSize: "0.8rem" }}>{error}</div>;

  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 16, padding: "9px 14px", background: colors.badgeBg, borderRadius: 14,
        boxShadow: fieldCardShadow(colors, false) }}>
        <span style={{ fontSize: "0.75rem", color: colors.textTertiary }}>
          <strong style={{ color: colors.textPrimary }}>{logs.length}</strong> log{logs.length !== 1 ? "s" : ""} · DTN{" "}
          <strong style={{ color: ACCENT, fontFamily: "ui-monospace,monospace" }}>{dtn}</strong>
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {completed > 0 && <span style={{ fontSize: "0.63rem", fontWeight: 700, padding: "2px 8px",
            borderRadius: 99, background: "#dcfce7", color: "#15803d" }}>{completed} completed</span>}
          {inProgress > 0 && <span style={{ fontSize: "0.63rem", fontWeight: 700, padding: "2px 8px",
            borderRadius: 99, background: "#fff7ed", color: "#c2410c" }}>{inProgress} in progress</span>}
        </div>
      </div>
      {logs.length === 0
        ? <div style={{ textAlign: "center", padding: 32, color: colors.textTertiary, fontSize: "0.8rem" }}>No logs yet.</div>
        : logs.map((log, i) => <LogCard key={log.id ?? i} log={log} isLast={i === logs.length - 1} colors={colors} />)
      }
    </div>
  );
}

// ── Reference Number tab bar ─────────────────────────────────────────────────
// Minimal underline-tab design — a single accent color (instead of a
// different hue per reference), differentiated by a small badge rather than
// color-coding, so multiple reference numbers read as one coherent group
// instead of a scatter of colors.
//
// The DTN is the application — it's what the stepped workflow (Details /
// Documents / Logs / Action) belongs to and what "editing this application"
// means. A reference number is NOT a second application; it's just another
// Type of Issuance filed under the same DTN, so its tab only ever exposes
// issuance-scoped fields (see RefNoPanel) — no workflow, no steps.
function RefNoTabBar({ siblings, record, activeRefTab, onChange, colors, darkMode }) {
  // `siblings` (from GET /siblings) and `record` (from GET /{id}) are fetched
  // independently and can resolve at slightly different times — fall back to
  // `record` itself so the primary tab never shows a blank/placeholder label
  // while siblings are still loading or if the DTN's "-01" match is momentarily missing.
  const primaryFromSiblings = siblings.find(s => (s.GMP_REFERENCE_NO || "").endsWith("-01"));
  const primary = primaryFromSiblings ?? record;
  const others = siblings.filter(s => s.GMP_ID !== primary?.GMP_ID);

  const Tab = ({ isActive, onClick, children, badge }) => (
    <button onClick={onClick} style={{
      flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
      padding: "4px 10px", border: "none",
      borderRadius: 999,
      background: isActive ? (darkMode ? "rgba(16,185,129,0.16)" : "#e7f8f0") : "transparent",
      fontFamily: FONT, fontSize: "0.76rem", fontWeight: isActive ? 700 : 500,
      color: isActive ? colors.textPrimary : colors.textTertiary,
      cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
    }}>
      {children}
      {badge && (
        <span style={{
          fontSize: "0.56rem", fontWeight: 700, padding: "1px 6px", borderRadius: 99,
          background: isActive ? `${ACCENT}20` : colors.badgeBg,
          color: isActive ? ACCENT : colors.textTertiary,
        }}>{badge}</span>
      )}
    </button>
  );

  return (
    <div style={{
      flexShrink: 0, padding: "5px 18px 6px",
      background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(16,185,129,0.03)",
      borderBottom: `1px solid ${colors.cardBorder}`,
    }}>
      <div className="gmpTabScroll" style={{
        display: "flex", alignItems: "center", gap: 6, overflowX: "auto",
      }}>
        <span style={{ fontSize: "0.6rem", fontWeight: 700, color: colors.textTertiary,
          textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
          View
        </span>
        <Tab isActive={activeRefTab === "primary"} onClick={() => onChange("primary")} badge="DTN">
          <span style={{ fontFamily: "ui-monospace,monospace" }}>
            {primary?.GMP_DTN ?? record?.GMP_DTN ?? "Application"}
          </span>
        </Tab>
        {others.map(s => (
          <Tab key={s.GMP_ID} isActive={activeRefTab === s.GMP_ID} onClick={() => onChange(s.GMP_ID)} badge="ISSUANCE">
            <span style={{ fontFamily: "ui-monospace,monospace" }}>{s.GMP_REFERENCE_NO}</span>
            <span style={{ opacity: 0.7, fontWeight: 400 }}> · {s.GMP_TYPE_OF_ISSUANCE || "—"}</span>
          </Tab>
        ))}
        <Tab isActive={activeRefTab === "all"} onClick={() => onChange("all")}>
          All ({siblings.length})
        </Tab>
      </div>
    </div>
  );
}

// ── Reference Number panel — sibling edit form / "All" stacked view ─────────
function RefNoPanel({ siblings, activeRefTab, siblingEdits, setSiblingEdits, siblingSaving, siblingError, onSave, colors }) {
  const inp = {
    width: "100%", padding: "0.5rem 0.7rem", fontFamily: FONT, fontSize: "0.78rem",
    background: editableFieldInnerBg(colors), border: "none",
    borderRadius: 10, color: colors.textPrimary, outline: "none", boxSizing: "border-box",
    boxShadow: fieldCardShadow(colors, false),
  };
  const lbl = {
    display: "block", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.05em", color: colors.textTertiary, marginBottom: "0.3rem",
  };

  if (activeRefTab === "all") {
    return (
      <div style={{ padding: "16px 20px" }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: colors.textPrimary, marginBottom: 10 }}>
          All Reference Numbers — DTN {siblings[0]?.GMP_DTN}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.74rem" }}>
            <thead>
              <tr>
                {["Reference No", "Type of Issuance", "Certificate No.", "Certificate Validity", "SECPA No.", "Current Step"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: "0.6rem",
                    fontWeight: 700, textTransform: "uppercase", color: colors.textTertiary,
                    borderBottom: `1px solid ${colors.cardBorder}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {siblings.map(s => {
                const isPrimary = (s.GMP_REFERENCE_NO || "").endsWith("-01");
                return (
                  <tr key={s.GMP_ID}>
                    <td style={{ padding: "8px 10px", fontFamily: "ui-monospace,monospace", fontWeight: 700,
                      color: isPrimary ? ACCENT : "#a855f7" }}>
                      {s.GMP_REFERENCE_NO} {isPrimary && "★"}
                    </td>
                    <td style={{ padding: "8px 10px", color: colors.textPrimary }}>{s.GMP_TYPE_OF_ISSUANCE || "—"}</td>
                    <td style={{ padding: "8px 10px", color: colors.textPrimary }}>{s.GMP_CERTIFICATE_NUMBER || "—"}</td>
                    <td style={{ padding: "8px 10px", color: colors.textPrimary }}>{s.GMP_CERTIFICATE_VALIDITY || "—"}</td>
                    <td style={{ padding: "8px 10px", color: colors.textPrimary }}>{s.GMP_SECPA_NUMBER || "—"}</td>
                    <td style={{ padding: "8px 10px", color: colors.textPrimary }}>{s.GMP_CURRENT_STEP || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 12, fontSize: "0.68rem", color: colors.textTertiary }}>
          ★ Primary reference — the only one with an active workflow. Submit always advances this one.
        </p>
      </div>
    );
  }

  const rec = siblings.find(s => s.GMP_ID === activeRefTab);
  if (!rec) return null;
  const edit = siblingEdits[rec.GMP_ID] ?? {};
  const val = (k) => (k in edit ? edit[k] : (rec[k] ?? ""));
  const setField = (k, v) => setSiblingEdits(p => ({ ...p, [rec.GMP_ID]: { ...(p[rec.GMP_ID] ?? {}), [k]: v } }));
  const type = val("GMP_TYPE_OF_ISSUANCE");
  const showCertFields = !GMP_NO_CERT_ISSUANCE_TYPES.has(type);
  const showSecpa = showCertFields && !GMP_NO_SECPA_ONLY_TYPES.has(type);

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
      <div style={{ fontSize: "0.75rem", color: colors.textTertiary }}>
        Editing reference <strong style={{ color: "#a855f7", fontFamily: "ui-monospace,monospace" }}>{rec.GMP_REFERENCE_NO}</strong>
        {" "}— only its own issuance fields. This does not affect the primary Submit button below.
      </div>
      <div>
        <label style={lbl}>Type of Issuance</label>
        <GmpSelect value={type} onChange={(v) => setField("GMP_TYPE_OF_ISSUANCE", v)} allowClear={false}
          placeholder="Select type of issuance…"
          options={[...GMP_TYPE_OF_ISSUANCE_APPROVED_OPTIONS, GMP_DISAPPROVED_TYPE_OF_ISSUANCE]}
          colors={colors} ariaLabel="Type of Issuance" />
      </div>
      {showCertFields && (
        <div>
          <label style={lbl}>Certificate Number</label>
          <input value={val("GMP_CERTIFICATE_NUMBER")} onChange={e => setField("GMP_CERTIFICATE_NUMBER", e.target.value)} style={inp} />
        </div>
      )}
      {showCertFields && (
        <div>
          <label style={lbl}>Certificate Validity</label>
          <input value={val("GMP_CERTIFICATE_VALIDITY")} onChange={e => setField("GMP_CERTIFICATE_VALIDITY", e.target.value)} style={inp} />
        </div>
      )}
      {showSecpa && (
        <div>
          <label style={lbl}>SECPA Number</label>
          <input value={val("GMP_SECPA_NUMBER")} onChange={e => setField("GMP_SECPA_NUMBER", e.target.value)} style={inp} />
        </div>
      )}
      {certNoteFor(type) && (
        <p style={{ margin: 0, fontSize: "0.65rem", color: colors.textTertiary }}>ℹ️ {certNoteFor(type)}</p>
      )}
      {siblingError && (
        <div style={{ padding: "7px 10px", background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 7, fontSize: "0.72rem", color: "#ef4444" }}>{siblingError}</div>
      )}
      <button onClick={() => onSave(rec)} disabled={siblingSaving === rec.GMP_ID}
        style={{
          padding: "0.55rem 1.2rem", border: "none", borderRadius: 999,
          background: siblingSaving === rec.GMP_ID ? "#c4b5fd" : "linear-gradient(145deg,#8b5cf6,#7c3aed)",
          boxShadow: siblingSaving === rec.GMP_ID ? "none" : "0 8px 18px -8px rgba(124,58,237,0.55)",
          color: "#fff", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
          cursor: siblingSaving === rec.GMP_ID ? "not-allowed" : "pointer", alignSelf: "flex-start",
        }}>
        {siblingSaving === rec.GMP_ID ? "Saving…" : "💾 Save Reference"}
      </button>
    </div>
  );
}

// ── Step 4 — Action form fields ──────────────────────────────────────────────
function Step5Fields({ mode, decision, onDecisionChange, remarks, setRemarks,
  assignee, setAssignee, rerouteTo, setRerouteTo, rerouteUser, setRerouteUser,
  reason, setReason, doctrackEnabled, setDoctrackEnabled, doctrackRemarks,
  setDoctrackRemarks, task, currentStep, infoText, error, loading, onSubmit, colors, decisions, GMP_STEPS_LIST,
  needsAuthority, authorityOptions, loadingAuthority, decisionAuthorityId, onAuthorityChange,
  needsApprovalFields, certNumber, setCertNumber, typeOfIssuance, setTypeOfIssuance, certValidity, setCertValidity,
  dirtyFields, isEvalOrChecker, actionOptions, actionValue, onActionChange,
  approvalDecision, onApprovalDecisionChange, remarksPresetOptions, remarksPresetValue, onRemarksPresetChange,
  needsTypeOfIssuance, typeOfIssuanceOptions, typeOfIssuanceValue, onTypeOfIssuanceChange, typeOfIssuanceLocked,
  needsAssigneeGroup, assigneeGroupConfig, assigneeGroupOptions, loadingAssigneeGroup, assigneeUserId, onAssigneeGroupChange,
  isLrdChiefAdmin, needsLrdDecision, lrdDecisionValue, onLrdDecisionChange,
  isOdReceiving, needsOdReceivingDecision, odReceivingDecisionValue, onOdReceivingDecisionChange,
  isOdReleasing, needsOdReleasingDecision, odReleasingDecisionValue, onOdReleasingDecisionChange,
  odReleasingSignedDateValue, onOdReleasingSignedDateChange, submitLabel,
  needsNodDate, nodDateLabel, nodDateValue, onNodDateChange,
  needsDatePrinted, datePrintedValue, onDatePrintedChange,
  needsComplianceDeadline, complianceWorkingDays, complianceDeadline, complianceStatus,
  complianceRemainingDays, onComplianceWorkingDaysChange, onComplianceDeadlineChange,
  newIssuanceType, onNewIssuanceTypeChange, addIssuanceLoading, addIssuanceError,
  addIssuanceSuccess, onAddIssuance, currentIssuanceType, originalIssuanceType,
  onCurrentIssuanceTypeChange, needsDifferentIssuanceType,
  isFroo, currentRelatedDtn, originalRelatedDtn, onRelatedDtnChange }) {
  const inp = {
    width: "100%", padding: "0.55rem 0.75rem", fontFamily: FONT, fontSize: "0.8rem",
    background: editableFieldInnerBg(colors), border: "none",
    borderRadius: 10, color: colors.textPrimary, outline: "none", boxSizing: "border-box",
    boxShadow: fieldCardShadow(colors, false),
  };
  const lbl = {
    display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.05em", color: colors.textPrimary, marginBottom: "0.4rem",
  };
  // Boxed field shell — matches EField/ESelectField/EDateField (Steps 1-2)
  // so a plain label+control pair on this step reads as the same kind of
  // surface, not a bare form row. Only used for top-level fields; fields
  // already nested inside a tinted callout card (FROO, Add Issuance,
  // Compliance Deadline, Certificate Details) keep the original inp/lbl —
  // double-boxing inside an already-colored card just adds clutter.
  const box = {
    padding: "0.6rem 0.75rem",
    background: editableFieldBg(colors),
    borderRadius: 12,
    boxShadow: fieldCardShadow(colors, false),
    display: "flex", flexDirection: "column", gap: 5,
  };
  const boxLbl = {
    display: "block", fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.07em", color: colors.textTertiary,
  };
  const boxInp = {
    width: "100%", padding: "0.35rem 0.5rem", fontFamily: FONT, fontSize: "0.8rem",
    background: editableFieldInnerBg(colors), border: "none",
    borderRadius: 8, color: colors.textPrimary, outline: "none", boxSizing: "border-box",
  };
  return (
    <>
      {isFroo && (
        <div style={{
          padding: "0.9rem 1.1rem", borderRadius: 16,
          background: "linear-gradient(135deg,rgba(14,165,233,0.09),rgba(14,165,233,0.02))",
          boxShadow: "0 8px 22px -14px rgba(14,165,233,0.5)",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0369a1" }}>🔗 Related DTN</div>
            <div style={{ fontSize: "0.66rem", color: colors.textTertiary }}>
              Optional — fill this in if FROO has a related DTN for this NFI, otherwise
              leave it blank. Saved to the record on Submit (same field as the Details tab).
              This is a branch of the main DTN and is not the internal Reference No.
            </div>
          </div>
          {/* Same editedFields path as the Details tab, so whichever one you
              type into, the other reflects it and the dirty-fields banner
              below picks it up. */}
          <EField
            label="Related DTN"
            fieldKey="GMP_RELATED_DTN"
            value={currentRelatedDtn}
            originalValue={originalRelatedDtn}
            onChange={(_key, v) => onRelatedDtnChange(v)}
            colors={colors}
          />
        </div>
      )}

      <div>
        {/* Editable — edits the application's own (first/primary) Type of
            Issuance directly via the same editedFields path as the Details
            step. Distinct from "Add Issuance" below, which creates a whole
            new sibling record instead of changing this one. */}
        <ESelectField
          label="Type of Issuance"
          fieldKey="GMP_TYPE_OF_ISSUANCE"
          value={currentIssuanceType}
          originalValue={originalIssuanceType}
          options={[...GMP_TYPE_OF_ISSUANCE_APPROVED_OPTIONS, GMP_DISAPPROVED_TYPE_OF_ISSUANCE]}
          onChange={(_key, v) => onCurrentIssuanceTypeChange(v)}
          colors={colors}
        />
        {certNoteFor(currentIssuanceType) && (
          <p style={{ margin: "4px 0 0", fontSize: "0.63rem", color: colors.textTertiary }}>
            ℹ️ {certNoteFor(currentIssuanceType)}
          </p>
        )}
      </div>

      <div style={{
        padding: "0.9rem 1.1rem", borderRadius: 16,
        background: "linear-gradient(135deg,rgba(59,130,246,0.08),rgba(59,130,246,0.02))",
        boxShadow: "0 8px 22px -14px rgba(37,99,235,0.5)",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        <div>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1d4ed8" }}>📑 Add Issuance</div>
          <div style={{ fontSize: "0.66rem", color: colors.textTertiary }}>
            Creates a new application under the same DTN with a different Type of Issuance —
            all details carry over as-is. This is a separate, immediate action from the Submit
            button below — clicking it creates the new record right away.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 220px" }}>
            <label style={lbl}>New Type of Issuance</label>
            <GmpSelect value={newIssuanceType} onChange={onNewIssuanceTypeChange} placeholder="Select type of issuance…"
              options={[...GMP_TYPE_OF_ISSUANCE_APPROVED_OPTIONS, GMP_DISAPPROVED_TYPE_OF_ISSUANCE]}
              colors={colors} ariaLabel="New Type of Issuance" />
            {newIssuanceType && certNoteFor(newIssuanceType) && (
              <p style={{ margin: "4px 0 0", fontSize: "0.63rem", color: colors.textTertiary }}>
                ℹ️ {certNoteFor(newIssuanceType)}
              </p>
            )}
            {newIssuanceType && newIssuanceType === currentIssuanceType && (
              <p style={{ margin: "4px 0 0", fontSize: "0.63rem", color: "#b45309" }}>
                ⚠ Same as the current type — pick a different one to add a new issuance.
              </p>
            )}
          </div>
          <button type="button" onClick={onAddIssuance} disabled={addIssuanceLoading || needsDifferentIssuanceType}
            style={{
              padding: "0.55rem 1.1rem", border: "none", borderRadius: 999,
              background: (addIssuanceLoading || needsDifferentIssuanceType) ? "#93c5fd" : "linear-gradient(145deg,#3b82f6,#2563eb)",
              boxShadow: (addIssuanceLoading || needsDifferentIssuanceType) ? "none" : "0 8px 18px -8px rgba(37,99,235,0.55)",
              color: "#fff", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
              cursor: (addIssuanceLoading || needsDifferentIssuanceType) ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}>
            {addIssuanceLoading ? "Adding…" : "＋ Add Issuance"}
          </button>
        </div>
        {addIssuanceError && (
          <div style={{ padding: "8px 12px", background: "#fef2f2",
            borderRadius: 10, fontSize: "0.72rem", color: "#ef4444" }}>
            ⚠️ {addIssuanceError}
          </div>
        )}
        {addIssuanceSuccess && (
          <div style={{ padding: "8px 12px", background: "#f0fdf4",
            borderRadius: 10, fontSize: "0.72rem", color: "#15803d" }}>
            ✅ Added — Reference No <strong>{addIssuanceSuccess.GMP_REFERENCE_NO}</strong>{" "}
            ({addIssuanceSuccess.GMP_TYPE_OF_ISSUANCE})
          </div>
        )}
      </div>

      {mode === "advance" && isEvalOrChecker && (
        <>
          <div className="wfFieldBox" style={box}>
            <label style={boxLbl}>Action <span style={{ color: "#ef4444" }}>*</span></label>
            <GmpSelect value={actionValue} onChange={onActionChange} placeholder="Select action…"
              options={actionOptions} colors={colors} ariaLabel="Action" />
          </div>
          {needsComplianceDeadline && (
            <div style={{
              padding: "0.9rem 1.1rem", borderRadius: 16,
              background: "linear-gradient(135deg,rgba(168,85,247,0.08),rgba(168,85,247,0.02))",
              boxShadow: "0 8px 22px -14px rgba(147,51,234,0.5)",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "1.1rem" }}>⏰</span>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#7e22ce" }}>Compliance Deadline</div>
                  <div style={{ fontSize: "0.66rem", color: colors.textTertiary }}>
                    Set working days OR pick a date — both auto-sync
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 200px" }}>
                  <label style={{ ...lbl, fontSize: "0.6rem" }}>Working Days</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button type="button"
                      onClick={() => onComplianceWorkingDaysChange(complianceWorkingDays - 1)}
                      style={{ width: 30, height: 30, borderRadius: "50%", border: "none",
                        background: editableFieldInnerBg(colors), color: colors.textPrimary, cursor: "pointer", fontWeight: 700,
                        boxShadow: fieldCardShadow(colors, false) }}>
                      −
                    </button>
                    <input type="number" min={1} value={complianceWorkingDays}
                      onChange={e => onComplianceWorkingDaysChange(e.target.value)}
                      style={{ ...inp, textAlign: "center", fontWeight: 700 }} />
                    <button type="button"
                      onClick={() => onComplianceWorkingDaysChange(complianceWorkingDays + 1)}
                      style={{ width: 30, height: 30, borderRadius: "50%", border: "none",
                        background: editableFieldInnerBg(colors), color: colors.textPrimary, cursor: "pointer", fontWeight: 700,
                        boxShadow: fieldCardShadow(colors, false) }}>
                      +
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                    {GMP_COMPLIANCE_DAY_PRESETS.map(d => (
                      <button type="button" key={d}
                        onClick={() => onComplianceWorkingDaysChange(d)}
                        style={{
                          padding: "4px 11px", fontSize: "0.68rem", fontWeight: 700, borderRadius: 999, cursor: "pointer",
                          border: "none",
                          background: complianceWorkingDays === d ? "linear-gradient(145deg,#c084fc,#a855f7)" : editableFieldInnerBg(colors),
                          boxShadow: complianceWorkingDays === d ? "0 4px 12px -4px rgba(168,85,247,0.6)" : fieldCardShadow(colors, false),
                          color: complianceWorkingDays === d ? "#fff" : colors.textTertiary,
                        }}>
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: "1 1 200px" }}>
                  <label style={{ ...lbl, fontSize: "0.6rem" }}>Deadline Date</label>
                  <GmpDatePicker value={complianceDeadline} onChange={onComplianceDeadlineChange}
                    colors={colors} fullWidth placeholder="Pick a deadline…" ariaLabel="Deadline Date" />
                  {complianceDeadline && (
                    <div style={{ fontSize: "0.66rem", color: colors.textTertiary, marginTop: 4 }}>
                      📅 {new Date(`${complianceDeadline}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  )}
                </div>
              </div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 13px", borderRadius: 12, background: complianceStatus.bg,
              }}>
                <span style={{ fontSize: "0.74rem", fontWeight: 700, color: complianceStatus.color,
                  display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: complianceStatus.color, display: "inline-block" }} />
                  {complianceStatus.label}
                </span>
                <span style={{ fontSize: "0.7rem", color: colors.textTertiary }}>
                  {Math.max(complianceRemainingDays, 0)} working day{complianceRemainingDays === 1 ? "" : "s"} remaining
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "0.65rem", color: colors.textTertiary, display: "flex", gap: 6 }}>
                <span>⚠️</span>
                The assigned evaluator will be notified 3 working days before this deadline.
              </p>
              <p style={{ margin: 0, fontSize: "0.6rem", color: colors.textTertiary }}>
                Not saved until you click Submit below.
              </p>
            </div>
          )}
          {actionValue !== "For Compliance" && (
            <div className="wfFieldBox" style={box}>
              <label style={boxLbl}>Recommendation <span style={{ color: "#ef4444" }}>*</span></label>
              <GmpSelect value={approvalDecision} onChange={onApprovalDecisionChange} placeholder="Select recommendation…"
                options={GMP_APPROVAL_DECISION_OPTIONS} colors={colors} ariaLabel="Recommendation" />
            </div>
          )}
          {needsTypeOfIssuance && (
            <div className="wfFieldBox" style={box}>
              <label style={boxLbl}>Type of Issuance <span style={{ color: "#ef4444" }}>*</span></label>
              {typeOfIssuanceLocked ? (
                <input readOnly value={typeOfIssuanceValue}
                  style={{ ...boxInp, background: colors.badgeBg, cursor: "not-allowed", fontWeight: 600 }} />
              ) : (
                <GmpSelect value={typeOfIssuanceValue} onChange={onTypeOfIssuanceChange} placeholder="Select type of issuance…"
                  options={typeOfIssuanceOptions} colors={colors} ariaLabel="Type of Issuance" />
              )}
            </div>
          )}
          <div className="wfFieldBox" style={box}>
            <label style={boxLbl}>Remarks Preset <span style={{ color: "#ef4444" }}>*</span></label>
            <GmpSelect value={remarksPresetValue} onChange={onRemarksPresetChange} placeholder="Select remarks…"
              options={remarksPresetOptions.map(r => r.value)} colors={colors} ariaLabel="Remarks Preset" />
          </div>
          {needsNodDate && (
            <div className="wfFieldBox" style={{ ...box, maxWidth: 220 }}>
              <label style={boxLbl}>{nodDateLabel} <span style={{ color: "#ef4444" }}>*</span></label>
              <GmpDatePicker value={nodDateValue} onChange={onNodDateChange}
                colors={colors} placeholder="Pick a date…" ariaLabel={nodDateLabel} />
              <p style={{ margin: "3px 0 0", fontSize: "0.6rem", color: colors.textTertiary }}>
                Not saved until you click Submit below.
              </p>
            </div>
          )}
          {needsDatePrinted && (
            <div className="wfFieldBox" style={{ ...box, maxWidth: 220 }}>
              <label style={boxLbl}>Date Printed <span style={{ color: "#ef4444" }}>*</span></label>
              <GmpDatePicker value={datePrintedValue} onChange={onDatePrintedChange}
                colors={colors} placeholder="Pick a date…" ariaLabel="Date Printed" />
              <p style={{ margin: "3px 0 0", fontSize: "0.6rem", color: colors.textTertiary }}>
                Not saved until you click Submit below.
              </p>
            </div>
          )}
        </>
      )}

      {mode === "advance" && !isEvalOrChecker && (
        <div className="wfFieldBox" style={box}>
          <label style={boxLbl}>{(isLrdChiefAdmin || isOdReceiving || isOdReleasing || isFroo) ? "Action" : "Decision"} <span style={{ color: "#ef4444" }}>*</span></label>
          <GmpSelect value={decision} onChange={onDecisionChange}
            placeholder={`Select ${(isLrdChiefAdmin || isOdReceiving || isOdReleasing || isFroo) ? "action" : "decision"}…`}
            options={decisions} colors={colors} ariaLabel="Decision" />
        </div>
      )}

      {mode === "advance" && isOdReceiving && needsOdReceivingDecision && (
        <div className="wfFieldBox" style={box}>
          <label style={boxLbl}>Decision <span style={{ color: "#ef4444" }}>*</span></label>
          <GmpSelect value={odReceivingDecisionValue} onChange={onOdReceivingDecisionChange} placeholder="Select decision…"
            options={GMP_OD_RECEIVING_DECISION_OPTIONS} colors={colors} ariaLabel="Decision" />
        </div>
      )}

      {mode === "advance" && isOdReleasing && needsOdReleasingDecision && (
        <>
          <div className="wfFieldBox" style={box}>
            <label style={boxLbl}>Decision <span style={{ color: "#ef4444" }}>*</span></label>
            <GmpSelect value={odReleasingDecisionValue} onChange={onOdReleasingDecisionChange} placeholder="Select decision…"
              options={GMP_OD_RELEASING_DECISION_OPTIONS} colors={colors} ariaLabel="Decision" />
          </div>
          <div className="wfFieldBox" style={box}>
            <label style={boxLbl}>Type of Issuance</label>
            <input readOnly value={typeOfIssuance || "—"}
              style={{ ...boxInp, background: colors.badgeBg, cursor: "not-allowed", fontWeight: 600 }} />
          </div>
          <div className="wfFieldBox" style={{ ...box, maxWidth: 200 }}>
            <label style={boxLbl}>Signed Date <span style={{ color: "#ef4444" }}>*</span></label>
            <GmpDatePicker value={odReleasingSignedDateValue} onChange={onOdReleasingSignedDateChange}
              colors={colors} placeholder="Pick a date…" ariaLabel="Signed Date" />
          </div>
        </>
      )}

      {needsAuthority && (
        <div className="wfFieldBox" style={box}>
          <label style={boxLbl}>Decision Authority (Signer) <span style={{ color: "#ef4444" }}>*</span></label>
          {loadingAuthority ? (
            <div style={{ ...boxInp, display: "flex", alignItems: "center", gap: 8, color: colors.textTertiary }}>
              <span style={{ width: 12, height: 12, border: "2px solid rgba(16,185,129,0.2)", borderTopColor: ACCENT, borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
              Loading authority users…
            </div>
          ) : (
            <GmpSelect value={String(decisionAuthorityId ?? "")} onChange={onAuthorityChange} placeholder="Select authority…"
              options={authorityOptions.map((u) => ({
                value: String(u.id),
                label: u.first_name && (u.surname || u.last_name)
                  ? `${u.username} — ${u.first_name} ${u.surname ?? u.last_name}` : u.username,
              }))}
              colors={colors} ariaLabel="Decision Authority" />
          )}
          {!loadingAuthority && authorityOptions.length === 0 && (
            <p style={{ fontSize: "0.68rem", color: "#ef4444", marginTop: 4, marginBottom: 0 }}>⚠️ No authority users found for {currentStep}.</p>
          )}
          {isLrdChiefAdmin && (
            <p style={{ fontSize: "0.67rem", color: colors.textTertiary, marginTop: 4, marginBottom: 0 }}>
              💡 For record-keeping in the Application Logs and Doctrack only — selecting a signer here does not change who the application is routed to.
            </p>
          )}
        </div>
      )}

      {needsApprovalFields && (
        <div style={{ padding: "0.85rem 1.1rem", background: "linear-gradient(135deg,rgba(16,185,129,0.09),rgba(16,185,129,0.02))", boxShadow: `0 8px 22px -14px ${ACCENT}80`, borderRadius: 16, display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            📋 Certificate Details
          </div>
          <div>
            <label style={lbl}>Certificate Number</label>
            <input value={certNumber} onChange={(e) => setCertNumber(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Type of Issuance</label>
            <input value={typeOfIssuance} onChange={(e) => setTypeOfIssuance(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Certificate Validity</label>
            <input value={certValidity} onChange={(e) => setCertValidity(e.target.value)} style={inp} />
          </div>
        </div>
      )}

      {mode === "advance" && needsAssigneeGroup && (
        <div className="wfFieldBox" style={box}>
          <label style={boxLbl}>
            Assign to {assigneeGroupConfig?.shortLabel}{" "}
            <span style={{ color: colors.textTertiary, fontWeight: 400, textTransform: "none" }}>
              ({assigneeGroupConfig?.groupLabel})
            </span>{" "}
            <span style={{ color: "#ef4444" }}>*</span>
          </label>
          {loadingAssigneeGroup ? (
            <div style={{ ...boxInp, display: "flex", alignItems: "center", gap: 8, color: colors.textTertiary }}>
              <span style={{ width: 12, height: 12, border: "2px solid rgba(16,185,129,0.2)", borderTopColor: ACCENT, borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
              Loading {assigneeGroupConfig?.groupLabel} users…
            </div>
          ) : (
            <GmpSelect value={String(assigneeUserId ?? "")} onChange={onAssigneeGroupChange} placeholder="Select assignee…"
              options={assigneeGroupOptions.map((u) => ({
                value: String(u.id),
                label: u.first_name && (u.surname || u.last_name)
                  ? `${u.username} — ${u.first_name} ${u.surname ?? u.last_name}` : u.username,
              }))}
              colors={colors} ariaLabel="Assignee" />
          )}
          {!loadingAssigneeGroup && assigneeGroupOptions.length === 0 && (
            <p style={{ fontSize: "0.68rem", color: "#ef4444", marginTop: 4, marginBottom: 0 }}>
              ⚠️ No users found in {assigneeGroupConfig?.groupLabel}.
            </p>
          )}
        </div>
      )}
      {mode === "reassign" && (
        <div className="wfFieldBox" style={box}>
          <label style={boxLbl}>New Assignee <span style={{ color: "#ef4444" }}>*</span></label>
          <input value={assignee} onChange={e => setAssignee(e.target.value)}
            placeholder="Enter username to reassign to…" style={boxInp} />
        </div>
      )}
      {mode === "reroute" && (
        <>
          <div className="wfFieldBox" style={box}>
            <label style={boxLbl}>Target Step <span style={{ color: "#ef4444" }}>*</span></label>
            <GmpSelect value={rerouteTo} onChange={setRerouteTo} placeholder="Select target step…"
              options={GMP_STEPS_LIST.map(s => ({ value: s.id, label: s.label }))}
              colors={colors} ariaLabel="Target Step" />
          </div>
          <div className="wfFieldBox" style={box}>
            <label style={boxLbl}>Assign To <span style={{ color: colors.textTertiary, fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
            <input value={rerouteUser} onChange={e => setRerouteUser(e.target.value)}
              placeholder="Username for target step…" style={boxInp} />
          </div>
        </>
      )}
      {(mode === "reassign" || mode === "reroute") && (
        <div className="wfFieldBox" style={box}>
          <label style={boxLbl}>Reason</label>
          <input value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Reason for reassignment / reroute…" style={boxInp} />
        </div>
      )}
      <div className="wfFieldBox" style={box}>
        <label style={boxLbl}>Remarks <span style={{ color: colors.textTertiary, fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
        <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3}
          placeholder="Add any notes…"
          style={{ ...boxInp, resize: "vertical", fontFamily: FONT }} />
      </div>

      <div className="wfFieldBox" style={box}>
        <label style={{ ...boxLbl, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span>Doctrack Remarks {doctrackEnabled && <span style={{ color: "#ef4444" }}>*</span>}</span>
          <span
            onClick={() => setDoctrackEnabled(p => !p)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.35rem",
              fontSize: "0.65rem", fontWeight: 600, cursor: "pointer",
              padding: "0.1rem 0.5rem 0.1rem 0.35rem", borderRadius: 20,
              border: `1px solid ${doctrackEnabled ? "#4CAF5050" : "#ef444450"}`,
              background: doctrackEnabled ? "#4CAF5015" : "#ef444415",
              color: doctrackEnabled ? "#4CAF50" : "#ef4444",
              userSelect: "none", transition: "all 0.2s",
              textTransform: "none", letterSpacing: "normal",
            }}>
            <span style={{
              width: 22, height: 11, borderRadius: 11,
              background: doctrackEnabled ? "#4CAF50" : "#ef4444",
              display: "inline-block", position: "relative", flexShrink: 0,
            }}>
              <span style={{
                position: "absolute", top: 2, left: doctrackEnabled ? 13 : 2,
                width: 7, height: 7, borderRadius: "50%", background: "#fff",
                transition: "left 0.2s",
              }} />
            </span>
            {doctrackEnabled ? "ON" : "OFF"}
          </span>
          {!doctrackEnabled && (
            <span style={{ fontSize: "0.62rem", fontWeight: 400, color: "#f59e0b",
              textTransform: "none", letterSpacing: "normal" }}>
              ⚠ FIS will NOT be updated
            </span>
          )}
        </label>
        <textarea
          value={doctrackRemarks}
          onChange={e => setDoctrackRemarks(e.target.value)}
          disabled={!doctrackEnabled}
          rows={2}
          placeholder={doctrackEnabled ? "Doctrack remarks for FIS…" : "Doctrack disabled — FIS will not be updated"}
          style={{
            ...boxInp, resize: "vertical", fontFamily: FONT,
            opacity: doctrackEnabled ? 1 : 0.45,
            cursor: doctrackEnabled ? "text" : "not-allowed",
          }}
        />
        {doctrackEnabled && (
          <p style={{ margin: "4px 0 0", fontSize: "0.67rem", color: colors.textTertiary }}>
            This will be logged in the FIS Document Tracking System using DTN: <strong>{task?.dtn}</strong>
          </p>
        )}
      </div>

      {error && (
        <div style={{ padding: "9px 13px", background: "#fef2f2",
          borderRadius: 12, fontSize: "0.76rem", color: "#ef4444", whiteSpace: "pre-line" }}>⚠️ {error}</div>
      )}
      <div style={{ padding: "11px 15px", background: "linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.02))",
        borderRadius: 14,
        display: "flex", gap: 8, alignItems: "flex-start" }}>
        <span>ℹ️</span>
        <p style={{ margin: 0, fontSize: "0.74rem", color: colors.textSecondary, lineHeight: 1.5 }}>{infoText}</p>
      </div>

      {/* Right above Submit — this is the last thing reviewed before
          submitting, so the "what's about to be saved" summary belongs here,
          not buried near the top of the form. */}
      {dirtyFields.length > 0 && (
        <div style={{ padding: "0.7rem 0.95rem", background: "linear-gradient(135deg,rgba(245,158,11,0.1),rgba(245,158,11,0.02))", borderRadius: 14 }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#b45309", marginBottom: 6 }}>
            ✎ {dirtyFields.length} field{dirtyFields.length > 1 ? "s" : ""} edited — will be saved with this submission
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {dirtyFields.map((c) => (
              <div key={c.key} style={{ display: "flex", gap: 6, fontSize: "0.65rem", color: colors.textSecondary }}>
                <span style={{ fontWeight: 600, color: colors.textPrimary, minWidth: 110, flexShrink: 0 }}>{c.label}:</span>
                <span style={{ color: "#ef4444", textDecoration: "line-through" }}>{c.oldValue || "empty"}</span>
                <span>→</span>
                <span style={{ color: "#10b981" }}>{c.newValue || "empty"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={onSubmit} disabled={loading}
        style={{
          width: "100%", padding: "0.75rem", border: "none", borderRadius: 999,
          background: loading ? `${ACCENT}80` : `linear-gradient(135deg,${ACCENT},#059669)`,
          color: "#fff", fontFamily: FONT, fontSize: "0.86rem", fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: loading ? "none" : `0 10px 24px -8px ${ACCENT}70`,
          transition: "transform 0.12s, box-shadow 0.12s",
        }}>
        {loading
          ? <><span style={{ display: "inline-block", width: 13, height: 13, border: "2px solid #ffffff40",
              borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
              {submitLabel === "✅ Released" ? "Releasing…" : "Submitting…"}</>
          : (submitLabel ?? "▶ Submit")}
      </button>
    </>
  );
}

// ── Main WorkflowModal ────────────────────────────────────────────────────────
export default function WorkflowModal({ record: recordProp, log: task, onClose, onSuccess, colors, darkMode }) {
  const [activeStep,  setActiveStep]  = useState(1);
  const [record,      setRecord]      = useState(null);
  const [loadingRec,  setLoadingRec]  = useState(true);

  // ── Reference number siblings (same DTN, different issuance types) ─────
  // "primary" = the '-01' reference — the only one with a real workflow.
  // Any other reference no. is selectable as its own read/edit tab; "all"
  // shows every reference number's issuance fields stacked in one table.
  // The bottom Submit button always acts on the PRIMARY record regardless
  // of which tab is active — switching tabs never changes what Submit does.
  const [siblings, setSiblings] = useState([]);
  const [activeRefTab, setActiveRefTab] = useState("primary");
  const [siblingEdits, setSiblingEdits] = useState({}); // { [recordId]: { type_of_issuance, certificate_number, ... } }
  const [siblingSaving, setSiblingSaving] = useState(null); // recordId currently saving
  const [siblingError, setSiblingError] = useState("");

  const primarySibling = siblings.find(s => (s.GMP_REFERENCE_NO || "").endsWith("-01")) ?? null;
  const isPrimaryRecordId = (id) => primarySibling ? id === primarySibling.GMP_ID : true;

  // If this modal was somehow opened directly on a non-primary reference
  // (shouldn't happen once the Queue only lists primaries — see backend fix
  // — but kept as a safety net), auto-land on that reference's own tab
  // instead of "primary", since a sibling record has no real workflow steps
  // to show.
  useEffect(() => {
    if (!primarySibling || !task?.gmp_record_id) return;
    if (task.gmp_record_id !== primarySibling.GMP_ID) {
      setActiveRefTab(task.gmp_record_id);
    }
  }, [primarySibling, task?.gmp_record_id]);

  // The Reference Number tab feature only makes sense when this application
  // actually has more than one reference number AND those reference numbers
  // carry genuinely different Type of Issuance values — guards against any
  // legacy/edge-case data where siblings exist but somehow share a type.
  // NOTE: don't filter out blank/null types here — a blank type is still a
  // real, distinct value (e.g. the primary hasn't been assigned one yet),
  // and dropping it caused the tab bar to falsely never show up.
  const distinctIssuanceTypes = new Set(siblings.map(s => s.GMP_TYPE_OF_ISSUANCE || "—"));
  const hasMultipleIssuances = siblings.length > 1 && distinctIssuanceTypes.size > 1;

  const refetchSiblings = useCallback(() => {
    if (!task?.gmp_record_id) return;
    getGMPSiblings(task.gmp_record_id).then(setSiblings).catch(() => {});
  }, [task?.gmp_record_id]);

  const rawStep     = task?.applicationStep || "Decking";
  // Normalize legacy step names (e.g. "Quality Evaluator") to the canonical id
  // used by GMP_STEPS/GMP_STEP_DECISIONS/GMP_AUTHORITY_STEPS, so a stored legacy
  // value doesn't silently fall through to GMP_STEPS[0] ("Decking") below.
  const currentStep = resolveEvalCheckerStep(rawStep) ?? rawStep;
  const isLrdChiefAdmin = currentStep === "LRD Chief Admin";
  const isOdReceiving  = currentStep === "OD Receiving";
  const isOdReleasing  = currentStep === "OD Releasing";
  const isFroo         = currentStep === "FROO";
  const stepDef     = GMP_STEPS.find(s => s.id === currentStep) ?? GMP_STEPS[0];
  const currentIdx  = GMP_STEPS.findIndex(s => s.id === currentStep);
  const nextStep    = currentIdx >= 0 && currentIdx < GMP_STEPS.length - 1 ? GMP_STEPS[currentIdx + 1] : null;
  const decisions   = GMP_STEP_DECISIONS[currentStep] ?? ["Approved", "Rejected"];
  
  const evalCheckerStepKey = resolveEvalCheckerStep(currentStep);
  const isEvalOrChecker    = !!evalCheckerStepKey;
  const actionOptions      = GMP_EVAL_CHECKER_ACTIONS[evalCheckerStepKey] ?? [];

  // Evaluator ⇄ Checker steps use the 3-field Action/Decision/Remarks-preset form
  const [doctrackEnabled, setDoctrackEnabled] = useState(true);
  const [doctrackRemarks, setDoctrackRemarks] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError,   setSubmitError]   = useState("");

  // LRD Chief Admin — Decision ("Signed"), only required when Action is the
  // OD-Receiving-forwarding one.

  // Details step editable fields
  const [editedFields, setEditedFields] = useState({});
  const handleFieldChange = (fieldKey, value) => setEditedFields((p) => ({ ...p, [fieldKey]: value }));

  // Step5 state
  const [mode, setMode] = useState("advance");
  // Reassign/reroute at OD Releasing don't finalize anything (per the note
  // that OD Releasing isn't always the true end of the line) — only the
  // actual advance action there represents a release.
  const submitLabel = (mode === "advance" && isOdReleasing) ? "✅ Released" : "▶ Submit";
  const [decision, setDecision] = useState("");
  const [remarks, setRemarks] = useState("");
  const [assignee, setAssignee] = useState("");
  const [rerouteTo, setRerouteTo] = useState("");
  const [rerouteUser, setRerouteUser] = useState("");
  const [reason, setReason] = useState("");
// LRD Chief Admin — Decision ("Signed"), only required when Action is the
  // OD-Receiving-forwarding one.
  const [lrdDecision, setLrdDecision] = useState("");
  const needsLrdDecision = isLrdChiefAdmin && decision === GMP_LRD_SIGN_TRIGGER_ACTION;

  // OD Receiving — Decision ("For Signature"), only required when Action is
  // the OD-Releasing-forwarding one.
  const [odReceivingDecision, setOdReceivingDecision] = useState("");
  const needsOdReceivingDecision = isOdReceiving && decision === GMP_OD_RECEIVING_SIGN_TRIGGER_ACTION;

  // OD Releasing — Decision ("Signed") + Signed Date, both required once the
  // (single) Action is selected. Doctrack Remarks auto-recompute whenever
  // either the Decision or the Signed Date changes.
  const [odReleasingDecision, setOdReleasingDecision] = useState("");
  const [odReleasingSignedDate, setOdReleasingSignedDate] = useState("");
  const needsOdReleasingDecision = isOdReleasing && decision === GMP_OD_RELEASING_ACTION;

  const fmtSignedDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return dateStr; }
  };
  const buildOdReleasingDoctrack = (dateStr) => {
    const datePart = fmtSignedDate(dateStr);
    return `Signed${datePart ? ` (${datePart})` : ""} by CDRR-OIC Director; Scanned, Stamped and Forwarded to AFO Records`;
  };
  const handleOdReleasingDecisionChange = (val) => {
    setOdReleasingDecision(val);
    if (val === "Signed") setDoctrackRemarks(buildOdReleasingDoctrack(odReleasingSignedDate));
  };
  const handleOdReleasingSignedDateChange = (val) => {
    setOdReleasingSignedDate(val);
    if (odReleasingDecision === "Signed") setDoctrackRemarks(buildOdReleasingDoctrack(val));
  };

  // Evaluator ⇄ Checker Step 5 fields
  const [action,           setAction]           = useState("");
  const [approvalDecision, setApprovalDecision] = useState("");
  const [remarksPreset,    setRemarksPreset]    = useState("");
  const [finalTypeOfIssuance, setFinalTypeOfIssuance] = useState("");
  const remarksPresetOptions = GMP_REMARKS_PRESETS[evalCheckerStepKey]?.[action] ?? [];
  // Approved no longer shows/requires this field here — Type of Issuance for
  // the Approved path is already set via the Details tab's own selector, so
  // this one only remains for Disapproved (locked to "Letter of Disapproval").
  const needsTypeOfIssuance = isEvalOrChecker && action !== "For Compliance" &&
    approvalDecision === "Disapproved";
  const typeOfIssuanceOptions = [GMP_DISAPPROVED_TYPE_OF_ISSUANCE];
  const typeOfIssuanceLocked = approvalDecision === "Disapproved";

  // ── Auto-dated NOD / Date Printed fields, driven by the selected Remarks Preset ──
  const [nodDateField, setNodDateField] = useState(null);   // e.g. "GMP_NOD_DATE_2"
  const [nodDateValue, setNodDateValue] = useState("");
  const [datePrintedValue, setDatePrintedValue] = useState("");

  // ── Add Issuance — duplicate this record under the same DTN with a
  // different Type of Issuance. Shown unconditionally in Step 5, independent
  // of mode/decision/action — its own self-contained mini-form.
  const [newIssuanceType, setNewIssuanceType] = useState("");
  const [addIssuanceLoading, setAddIssuanceLoading] = useState(false);
  const [addIssuanceError, setAddIssuanceError] = useState("");
  const [addIssuanceSuccess, setAddIssuanceSuccess] = useState(null); // { GMP_REFERENCE_NO, GMP_TYPE_OF_ISSUANCE }

  // Add Issuance must always create a genuinely different issuance type from
  // what the record already has — the dropdown is pre-filled with the
  // current type purely for visibility, not as a default selection to submit.
  // currentIssuanceType tracks any pending edit (made via the editable field
  // above "Add Issuance", or via the Details step) so the "must differ" check
  // always compares against what will actually be submitted, not stale data.
  const originalIssuanceType = record?.GMP_TYPE_OF_ISSUANCE ?? "";
  const currentIssuanceType = "GMP_TYPE_OF_ISSUANCE" in editedFields
    ? editedFields.GMP_TYPE_OF_ISSUANCE : originalIssuanceType;
  const needsDifferentIssuanceType = !newIssuanceType || newIssuanceType === currentIssuanceType;

  // FROO's Related DTN, surfaced directly on the Action step. Reads through
  // editedFields exactly like the Details tab's own Related DTN field, so both
  // copies stay in sync and it's saved by the same recordPayload write below.
  const originalRelatedDtn = record?.GMP_RELATED_DTN ?? "";
  const currentRelatedDtn = "GMP_RELATED_DTN" in editedFields
    ? editedFields.GMP_RELATED_DTN : originalRelatedDtn;

  const handleAddIssuance = async () => {
    if (needsDifferentIssuanceType) {
      setAddIssuanceError("Please select a Type of Issuance different from the current one."); return;
    }
    setAddIssuanceError(""); setAddIssuanceSuccess(null); setAddIssuanceLoading(true);
    try {
      const newRecord = await addGMPIssuance(task.gmp_record_id, { type_of_issuance: newIssuanceType });
      setAddIssuanceSuccess(newRecord);
      // Reset back to the current record's type (not blank) — same reasoning
      // as the initial load: show what's there, require a deliberate change.
      setNewIssuanceType(currentIssuanceType);
      refetchSiblings();
    } catch (e) {
      setAddIssuanceError(e?.response?.data?.detail ?? "Failed to add issuance. Please try again.");
    } finally {
      setAddIssuanceLoading(false);
    }
  };

  // ── Compliance Deadline (Evaluator "For Compliance") ────────────────────
  const [complianceWorkingDays, setComplianceWorkingDays] = useState(GMP_COMPLIANCE_DEFAULT_DAYS);
  const [complianceDeadline, setComplianceDeadline] = useState("");
  const needsComplianceDeadline = isEvalOrChecker && action === "For Compliance";

  const handleComplianceWorkingDaysChange = (n) => {
    const days = Math.max(1, Number(n) || 1);
    setComplianceWorkingDays(days);
    setComplianceDeadline(toISODate(addWorkingDays(new Date(), days)));
  };
  const handleComplianceDeadlineChange = (dateStr) => {
    setComplianceDeadline(dateStr);
    if (dateStr) {
      setComplianceWorkingDays(workingDaysBetween(new Date(), new Date(`${dateStr}T00:00:00`)));
    }
  };
  const complianceRemainingDays = complianceDeadline
    ? workingDaysBetween(new Date(), new Date(`${complianceDeadline}T00:00:00`))
    : complianceWorkingDays;
  const complianceStatus = complianceRemainingDays < 0
    ? { label: "Overdue", color: "#ef4444", bg: "rgba(239,68,68,0.1)" }
    : complianceRemainingDays <= GMP_COMPLIANCE_WARN_THRESHOLD
      ? { label: "Due Soon", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" }
      : { label: "On Track", color: "#10b981", bg: "rgba(16,185,129,0.1)" };

  const needsNodDate = isEvalOrChecker && GMP_NOD_TRIGGER_PRESETS.includes(remarksPreset) && !!nodDateField;
  const needsDatePrinted = isEvalOrChecker && remarksPreset === GMP_PRINTED_TRIGGER_PRESET;
  const nodDateLabel = nodDateField ? NOD_DATE_LABELS[NOD_DATE_FIELDS.indexOf(nodDateField)] : "";

  // Considers any in-progress Details-step edits before falling back to the
  // saved record value, so this lines up with what the Details step is already showing.
  const getNodFieldValue = (key) => (key in editedFields ? editedFields[key] : record?.[key]);
  const getNextEmptyNodField = () => {
    for (const key of NOD_DATE_FIELDS) {
      if (!getNodFieldValue(key)) return key;
    }
    return NOD_DATE_FIELDS[NOD_DATE_FIELDS.length - 1]; // all 5 filled — overwrite the last slot
  };

  // Decision Authority
  const needsAuthority = mode === "advance" && GMP_AUTHORITY_STEPS.includes(currentStep);
  const [authorityOptions, setAuthorityOptions] = useState([]);
  const [loadingAuthority, setLoadingAuthority] = useState(false);
  const [decisionAuthorityId, setDecisionAuthorityId] = useState(null);
  const [decisionAuthorityName, setDecisionAuthorityName] = useState("");

  // Approval fields (Certificate)
  const needsApprovalFields = mode === "advance" && GMP_APPROVAL_DECISIONS.includes(decision);
  const [certNumber, setCertNumber] = useState("");
  const [typeOfIssuance, setTypeOfIssuance] = useState("");
  const [certValidity, setCertValidity] = useState("");

  // Required "assign to group" picker — resolved generically from the
  // selected Action (Evaluator/Checker) or Decision/Action value (every
  // other step) against GMP_ACTION_ASSIGNEE_GROUPS. Covers every
  // Forwarded-to / Endorsed-to action across the whole workflow uniformly.
  // OD Releasing is now always the end of the workflow for every issuance
  // type — it used to route NFI issuance types on to FROO (group 37) instead
  // of terminating, but that detour has been removed (see resolve_next_step()
  // in app/crud/gmp_record.py, the actual routing source of truth). Records
  // already mid-detour from before this change still complete normally via
  // the FROO step's own Action form (isFroo below); OD Releasing's own action
  // simply has no assignee-group entry in GMP_ACTION_ASSIGNEE_GROUPS.
  const assigneeGroupConfig = isEvalOrChecker
    ? GMP_ACTION_ASSIGNEE_GROUPS[action]
    : (mode === "advance" ? GMP_ACTION_ASSIGNEE_GROUPS[decision] : undefined);
  const needsAssigneeGroup  = mode === "advance" && !!assigneeGroupConfig;
  const [assigneeGroupOptions, setAssigneeGroupOptions] = useState([]);
  const [loadingAssigneeGroup, setLoadingAssigneeGroup] = useState(false);
  const [assigneeUserId,   setAssigneeUserId]   = useState(null);
  const [assigneeUserName, setAssigneeUserName] = useState("");

  const handleDecisionChange = (val) => {
  setDecision(val);
  const preset = GMP_DOCTRACK_REMARKS[val] ?? "";
  setDoctrackRemarks(preset);
  // Decision only applies to the signing/forwarding action — clear stale picks
  if (val !== GMP_LRD_SIGN_TRIGGER_ACTION) setLrdDecision("");
  if (val !== GMP_OD_RECEIVING_SIGN_TRIGGER_ACTION) setOdReceivingDecision("");
  if (val !== GMP_OD_RELEASING_ACTION) { setOdReleasingDecision(""); setOdReleasingSignedDate(""); }
};

  const handleActionChange = (val) => {
    setAction(val);
    // Options in the Remarks Preset dropdown are scoped to the Action, so any
    // previously selected preset (and its doctrack text) is now stale — clear it.
    setRemarksPreset("");
    setDoctrackRemarks("");
    // "For Compliance" has no approval decision — clear any stale selection
    if (val === "For Compliance") {
      setApprovalDecision("");
      setFinalTypeOfIssuance("");
      // Default the compliance clock to GMP_COMPLIANCE_DEFAULT_DAYS (currently
      // 5) working days from today, editable below.
      setComplianceWorkingDays(GMP_COMPLIANCE_DEFAULT_DAYS);
      setComplianceDeadline(toISODate(addWorkingDays(new Date(), GMP_COMPLIANCE_DEFAULT_DAYS)));
    } else {
      setComplianceWorkingDays(GMP_COMPLIANCE_DEFAULT_DAYS);
      setComplianceDeadline("");
    }
    // The assignee group changes with the Action — clear any stale selection
    setAssigneeUserId(null);
    setAssigneeUserName("");
  };

  const handleApprovalDecisionChange = (val) => {
    setApprovalDecision(val);
    if (val === "Disapproved") {
      // Only one valid type when disapproved — auto-select and lock it
      setFinalTypeOfIssuance(GMP_DISAPPROVED_TYPE_OF_ISSUANCE);
    } else {
      // Approved (fresh pick from the full list) or anything else — clear
      setFinalTypeOfIssuance("");
    }
  };

  const handleRemarksPresetChange = (val) => {
    setRemarksPreset(val);
    const preset = remarksPresetOptions.find((r) => r.value === val);
    // The preset drives the Doctrack (FIS) remarks only. The freeform
    // "Remarks (optional)" box is a separate, manually-typed field for the
    // application log — it is never auto-filled here.
    setDoctrackRemarks(preset?.value ?? "");

    // "Evaluated; e-NOD" / "Re-evaluated; e-NOD" -> auto-fill the next empty
    // NOD date slot with today's date (still editable below).
    if (GMP_NOD_TRIGGER_PRESETS.includes(val)) {
      setNodDateField(getNextEmptyNodField());
      setNodDateValue(todayInputDate());
    } else {
      setNodDateField(null);
      setNodDateValue("");
    }

    // "Printed; For Signature" -> auto-fill Date Printed with today's date.
    if (val === GMP_PRINTED_TRIGGER_PRESET) {
      setDatePrintedValue(todayInputDate());
    } else {
      setDatePrintedValue("");
    }
  };

  const handleAssigneeGroupChange = (idStr) => {
    const selected = assigneeGroupOptions.find((u) => String(u.id) === idStr);
    if (selected) {
      setAssigneeUserId(selected.id);
      // Must be the login username, not the full name — get_tasks_for_user
      // matches GMPApplicationLogs.user_name against the logged-in username,
      // so storing a display name here would silently hide the task forever.
      setAssigneeUserName(selected.username);
    } else {
      setAssigneeUserId(null);
      setAssigneeUserName("");
    }
  };

  const handleAuthorityChange = (idStr) => {
    const selected = authorityOptions.find((u) => String(u.id) === idStr);
    if (selected) {
      const fullName = selected.first_name && (selected.surname || selected.last_name)
        ? `${selected.first_name} ${selected.surname ?? selected.last_name}` : selected.username;
      setDecisionAuthorityId(selected.id);
      setDecisionAuthorityName(fullName);
    } else {
      setDecisionAuthorityId(null);
      setDecisionAuthorityName("");
    }
  };

  const currentUserObj = (() => {
    try { return getUser() || {}; } catch { return {}; }
  })();
  const currentUser = currentUserObj.username || currentUserObj.email || null;

  useEffect(() => {
    if (!task?.gmp_record_id) { setLoadingRec(false); return; }
    getGMPRecord(task.gmp_record_id)
      .then(r => { setRecord(r); setLoadingRec(false); })
      .catch(() => setLoadingRec(false));
    refetchSiblings();
  }, [task?.gmp_record_id]);

  useEffect(() => {
    if (record) {
      setCertNumber(record.GMP_CERTIFICATE_NUMBER ?? "");
      setTypeOfIssuance(record.GMP_TYPE_OF_ISSUANCE ?? "");
      setCertValidity(record.GMP_CERTIFICATE_VALIDITY ?? "");
      // Add Issuance dropdown starts on the record's existing issuance type
      // so the person can see what's already there — the Add Issuance button
      // stays disabled until they actually pick something different (see
      // needsDifferentIssuanceType below), so simply opening the modal or
      // leaving this untouched can never create an accidental duplicate.
      setNewIssuanceType(record.GMP_TYPE_OF_ISSUANCE ?? "");
    }
  }, [record]);

  useEffect(() => {
    if (!needsAuthority) { setAuthorityOptions([]); return; }
    (async () => {
      try {
        setLoadingAuthority(true);
        setAuthorityOptions(await getUsersByGroup(GMP_AUTHORITY_GROUP_ID[currentStep]));
      } catch { setAuthorityOptions([]); }
      finally { setLoadingAuthority(false); }
    })();
  }, [needsAuthority, currentStep]);

  useEffect(() => {
    if (!needsAssigneeGroup) { setAssigneeGroupOptions([]); return; }
    (async () => {
      try {
        setLoadingAssigneeGroup(true);
        setAssigneeGroupOptions(await getUsersByGroup(assigneeGroupConfig.groupId));
      } catch { setAssigneeGroupOptions([]); }
      finally { setLoadingAssigneeGroup(false); }
    })();
  }, [needsAssigneeGroup, assigneeGroupConfig?.groupId]);

  const selectedRemarksPreset = remarksPresetOptions.find((r) => r.value === remarksPreset);

  // `nextStep` is purely positional (the next entry in GMP_STEPS), which is
  // wrong for FROO (always hands back to the Evaluator — kept only so records
  // mid-detour from before OD Releasing stopped routing there can still
  // finish out) and for OD Releasing (now always the end of the workflow).
  // Mirrors resolve_next_step() in app/crud/gmp_record.py.
  const nextStepLabelForInfo = isFroo
    ? "Evaluator"
    : isOdReleasing
      ? null
      : (nextStep?.label ?? null);

  const infoText = mode === "advance"
    ? (isEvalOrChecker
        ? (!action ? "Select an Action to proceed."
            : !remarksPreset ? "Select a Remarks preset to see what happens next."
            : selectedRemarksPreset?.staysOpen
              ? "A new compliance entry will be logged and the task will remain assigned to you."
              : `Log will complete and forward per "${action}".`)
        : (!decision ? "Select a decision to proceed."
            : nextStepLabelForInfo ? `Log will complete and a new "${nextStepLabelForInfo}" log will be created.`
            : "This is the final step — log will complete with no further assignment."))
    : mode === "reassign"
    ? "The current log will close and a new one will open for the new assignee at the same step."
    : "The current log will close and a new log will open at the target step.";

  // Compute dirty fields for Step5 banner
  const dirtyFields = (() => {
    const out = [];
    Object.keys(editedFields).forEach((k) => {
      if (!record) return;
      const oldVal = record[k] ?? "";
      const newVal = editedFields[k] ?? "";
      if (String(oldVal) !== String(newVal)) {
        out.push({ key: k, label: FIELD_LABELS[k] ?? k, oldValue: oldVal, newValue: newVal });
      }
    });
    if (needsApprovalFields && record) {
      if (String(record.GMP_CERTIFICATE_NUMBER ?? "") !== String(certNumber ?? ""))
        out.push({ key: "GMP_CERTIFICATE_NUMBER", label: "Certificate Number", oldValue: record.GMP_CERTIFICATE_NUMBER, newValue: certNumber });
      if (String(record.GMP_TYPE_OF_ISSUANCE ?? "") !== String(typeOfIssuance ?? ""))
        out.push({ key: "GMP_TYPE_OF_ISSUANCE", label: "Type of Issuance", oldValue: record.GMP_TYPE_OF_ISSUANCE, newValue: typeOfIssuance });
      if (String(record.GMP_CERTIFICATE_VALIDITY ?? "") !== String(certValidity ?? ""))
        out.push({ key: "GMP_CERTIFICATE_VALIDITY", label: "Certificate Validity", oldValue: record.GMP_CERTIFICATE_VALIDITY, newValue: certValidity });
    }
    if (needsNodDate && record) {
      const oldVal = record[nodDateField] ?? "";
      if (String(oldVal) !== String(nodDateValue ?? ""))
        out.push({ key: nodDateField, label: nodDateLabel, oldValue: oldVal, newValue: nodDateValue });
    }
    if (needsDatePrinted && record) {
      const oldVal = record.GMP_DATE_PRINTED ?? "";
      if (String(oldVal) !== String(datePrintedValue ?? ""))
        out.push({ key: "GMP_DATE_PRINTED", label: "Date Printed", oldValue: oldVal, newValue: datePrintedValue });
    }
    return out;
  })();

  const handleSubmit = async () => {
    setSubmitError(""); setSubmitLoading(true);
    try {
      // ── Validation ────────────────────────────────────────────────────────
      if (isEvalOrChecker) {
        if (!action) {
          setSubmitError("Please select an Action."); setSubmitLoading(false); return;
        }
        if (action !== "For Compliance" && !approvalDecision) {
          setSubmitError("Please select a Decision."); setSubmitLoading(false); return;
        }
        if (needsTypeOfIssuance && !finalTypeOfIssuance) {
          setSubmitError("Please select a Type of Issuance."); setSubmitLoading(false); return;
        }
        if (!remarksPreset) {
          setSubmitError("Please select a Remarks preset."); setSubmitLoading(false); return;
        }
        if (needsNodDate && !nodDateValue) {
          setSubmitError(`Please select the ${nodDateLabel}.`); setSubmitLoading(false); return;
        }
        if (needsDatePrinted && !datePrintedValue) {
          setSubmitError("Please select the Date Printed."); setSubmitLoading(false); return;
        }
        if (needsComplianceDeadline && !complianceDeadline) {
          setSubmitError("Please set a Compliance Deadline."); setSubmitLoading(false); return;
        }
      } else if (!decision) {
        setSubmitError("Please select an action."); setSubmitLoading(false); return;
      }
      // FROO's Related DTN is optional — the field is right here on the Action
      // step (and on the Details tab), but leaving it blank must not block the
      // hand-back to the Evaluator.
      if (needsOdReceivingDecision && !odReceivingDecision) {
        setSubmitError("Please select a Decision."); setSubmitLoading(false); return;
      }
      if (needsOdReleasingDecision && !odReleasingDecision) {
        setSubmitError("Please select a Decision."); setSubmitLoading(false); return;
      }
      if (needsOdReleasingDecision && !odReleasingSignedDate) {
        setSubmitError("Please select the Signed Date."); setSubmitLoading(false); return;
      }
      if (needsAuthority && !decisionAuthorityId) {
        setSubmitError("Please select a Decision Authority."); setSubmitLoading(false); return;
      }
      if (needsAssigneeGroup && !assigneeUserId) {
        setSubmitError(`Please select an assignee from the ${assigneeGroupConfig?.groupLabel}.`);
        setSubmitLoading(false); return;
      }

      // ── Step A: Doctrack (if enabled) — push to FIS FIRST, before we mutate
      //    the record or advance the log, so a Doctrack failure leaves nothing
      //    half-applied (mirrors GMPDeckModal). ────────────────────────────────
      if (doctrackEnabled) {
        if (!doctrackRemarks.trim()) {
          setSubmitError("Doctrack Remarks are required. Turn off the Doctrack toggle if you already updated FIS manually.");
          setSubmitLoading(false); return;
        }
        const dtResult = await createDoctrackLogByRsn(
          String(task.dtn),
          doctrackRemarks.trim(),
          currentUserObj.id ?? null,
          currentUserObj.alias ?? "",
        );
        if (!dtResult) {
          setSubmitError("❌ Failed to insert Doctrack log. Submission cancelled.\nIf FIS was already updated manually, turn OFF the Doctrack toggle and resubmit.");
          setSubmitLoading(false); return;
        }
      }

      // ── Step B: Save any dirty record fields (auto-audit-logged server-side) ──
      const recordPayload = { ...editedFields };
      if (needsApprovalFields) {
        recordPayload.GMP_CERTIFICATE_NUMBER = certNumber;
        recordPayload.GMP_TYPE_OF_ISSUANCE = typeOfIssuance;
        recordPayload.GMP_CERTIFICATE_VALIDITY = certValidity;
      }
      if (isEvalOrChecker && action !== "For Compliance" && approvalDecision) {
        recordPayload.GMP_DECISION = approvalDecision;
        if (finalTypeOfIssuance) {
          recordPayload.GMP_TYPE_OF_ISSUANCE = finalTypeOfIssuance;
        }
      }
      if (needsOdReleasingDecision && odReleasingSignedDate) {
        recordPayload.GMP_RELEASED_DATE = odReleasingSignedDate;
      }
      // ── Persist whichever Action/Decision select was actually used on this
      // step to GMP_DECISION, so every advance leaves a record-level trail —
      // not just the log's application_decision / action_type.
      if (needsLrdDecision && lrdDecision) {
        recordPayload.GMP_DECISION = lrdDecision;
      } else if (needsOdReceivingDecision && odReceivingDecision) {
        recordPayload.GMP_DECISION = odReceivingDecision;
      } else if (needsOdReleasingDecision && odReleasingDecision) {
        recordPayload.GMP_DECISION = odReleasingDecision;
      } else if (!isEvalOrChecker && decision) {
        recordPayload.GMP_DECISION = decision;
      }
      // OD Releasing's action is the terminal release step — reflect that on
      // the record itself, not just the log entry.
      if (needsOdReleasingDecision) {
        recordPayload.GMP_APP_STATUS = "RELEASED";
      }
      // ── Auto-dated fields from the selected Remarks Preset ─────────────────
      if (needsNodDate && nodDateField && nodDateValue) {
        recordPayload[nodDateField] = nodDateValue;
      }
      if (needsDatePrinted && datePrintedValue) {
        recordPayload.GMP_DATE_PRINTED = datePrintedValue;
      }
      if (Object.keys(recordPayload).length > 0) {
        await updateGMPRecord(task.gmp_record_id, recordPayload);
      }

      // ── Step C: Advance ──────────────────────────────────────────────────
      // "For Compliance" now self-loops back to "Evaluator" on the backend,
      // so it's no longer skipped — every eval/checker action creates a
      // logged, auto-incrementing entry. There's no manual assignee picker
      // for the self-loop, so it stays with the same evaluator submitting it.
      const isSelfLoop = isEvalOrChecker && action === "For Compliance";
      await advanceStep(task.gmp_record_id, {
        current_step: currentStep,
        action: isEvalOrChecker ? action : decision,
        recommendation: "",
        remarks,
        // Always recorded on our own log — this is what actually shows up as
        // "Remarks Preset" in the Logs step. `doctrackEnabled` only controls
        // whether that same text is ALSO pushed to the external FIS Doctrack
        // system below; it must not gate our own history, or every step
        // submitted with the toggle off silently loses its remarks preset.
        doctrack_remarks: doctrackRemarks.trim(),
        // No more freeform fallback — every Forwarded-to/Endorsed-to action
        // is now required to go through GMP_ACTION_ASSIGNEE_GROUPS above.
        // Actions with no group mapping (Return to X, Disapprove, OD
        // Releasing's final action) simply carry no next assignee.
        next_assignee_name: needsAssigneeGroup
          ? assigneeUserName
          : isSelfLoop
            ? (currentUser || task?.user_name || null)
            : null,
        next_assignee_id: needsAssigneeGroup ? assigneeUserId : null,
        action_type: isEvalOrChecker && approvalDecision
          ? approvalDecision
          : (needsLrdDecision && lrdDecision ? lrdDecision
            : (needsOdReceivingDecision && odReceivingDecision ? odReceivingDecision
              : (needsOdReleasingDecision && odReleasingDecision ? odReleasingDecision : undefined))),
        decision_result: needsTypeOfIssuance
          ? finalTypeOfIssuance
          : (needsOdReleasingDecision ? typeOfIssuance : undefined),
        completion_status: needsOdReleasingDecision ? "RELEASED" : undefined,
        deadline_date: needsComplianceDeadline ? `${complianceDeadline}T00:00:00` : undefined,
        working_days: needsComplianceDeadline ? complianceWorkingDays : undefined,
        ...(needsAuthority ? {
          decision_authority_id: decisionAuthorityId,
          decision_authority_name: decisionAuthorityName,
        } : {}),
      });
      onSuccess();
    } catch (e) {
      setSubmitError(e?.response?.data?.detail ?? "Submission failed. Please try again.");
      setSubmitLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,30,24,0.55)",
      backdropFilter: "blur(6px)", zIndex: 10000,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, fontFamily: FONT, animation: "gmpBackdropIn 0.2s ease forwards",
    }}>
      <style>{MODAL_CSS}</style>
      <div data-gmp-modal-card style={{
        background: darkMode
          ? "#1a1c1f"
          : "#f7f8fa",
        borderRadius: 16,
        width: "100%", maxWidth: 860,
        // Fixed (not just capped) height — content scrolls internally instead
        // of the whole modal growing/shrinking as you move between steps.
        height: "min(88vh, 860px)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        border: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e4e6eb",
        boxShadow: darkMode
          ? "0 4px 20px rgba(0,0,0,0.3)"
          : "0 8px 24px rgba(0,0,0,0.12)",
        animation: "gmpModalIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards",
      }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              width: 38, height: 38, borderRadius: 13, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.15rem",
              background: `linear-gradient(145deg,${ACCENT}22,${ACCENT}08)`,
              boxShadow: `0 4px 12px -4px ${ACCENT}50`,
            }}>{stepDef.icon}</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, letterSpacing: "-0.01em", color: colors.textPrimary }}>
                GMP Workflow — {stepDef.label}
              </h2>
              <p style={{ margin: "3px 0 0", fontSize: "0.72rem", color: colors.textTertiary }}>
                DTN: <span style={{ fontFamily: "ui-monospace,monospace", fontWeight: 700, color: ACCENT }}>{task?.dtn || "—"}</span>
                {record?.GMP_REFERENCE_NO && (
                  <> · Ref: <span style={{ fontFamily: "ui-monospace,monospace", fontWeight: 700, color: "#a855f7" }}>{record.GMP_REFERENCE_NO}</span></>
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: "50%", border: "none",
            background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(16,24,20,0.05)",
            color: colors.textTertiary, cursor: "pointer",
            fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}>✕</button>
        </div>

        {hasMultipleIssuances && (
          <RefNoTabBar
            siblings={siblings}
            record={record}
            activeRefTab={activeRefTab}
            onChange={setActiveRefTab}
            colors={colors} darkMode={darkMode}
          />
        )}

        {/* Only the DTN (primary) application has a stepped workflow — a
            sibling reference number is just another issuance's info, not a
            separate application with its own steps, so the stepper is hidden
            (not merely disabled) whenever a non-primary reference is active. */}
        {activeRefTab === "primary" && (
          <StepTabs active={activeStep} colors={colors} darkMode={darkMode} />
        )}

        <div style={{ flex: 1, overflowY: "auto" }}>
          {activeRefTab !== "primary" && (
            <RefNoPanel
              siblings={siblings}
              activeRefTab={activeRefTab}
              siblingEdits={siblingEdits}
              setSiblingEdits={setSiblingEdits}
              siblingSaving={siblingSaving}
              siblingError={siblingError}
              onSave={async (rec) => {
                setSiblingError(""); setSiblingSaving(rec.GMP_ID);
                const edit = siblingEdits[rec.GMP_ID] ?? {};
                try {
                  await updateGMPIssuanceFields(rec.GMP_ID, {
                    type_of_issuance: edit.GMP_TYPE_OF_ISSUANCE ?? rec.GMP_TYPE_OF_ISSUANCE,
                    certificate_number: edit.GMP_CERTIFICATE_NUMBER ?? rec.GMP_CERTIFICATE_NUMBER,
                    certificate_validity: edit.GMP_CERTIFICATE_VALIDITY ?? rec.GMP_CERTIFICATE_VALIDITY,
                    secpa_number: edit.GMP_SECPA_NUMBER ?? rec.GMP_SECPA_NUMBER,
                  });
                  refetchSiblings();
                } catch (e) {
                  setSiblingError(e?.response?.data?.detail ?? "Failed to save.");
                } finally {
                  setSiblingSaving(null);
                }
              }}
              colors={colors}
            />
          )}
          {activeRefTab === "primary" && activeStep === 1 && (
            <StepDetails record={loadingRec ? null : record} task={task}
              editedFields={editedFields} onFieldChange={handleFieldChange} colors={colors} />
          )}
          {activeRefTab === "primary" && activeStep === 2 && (
            <StepDocsGMP task={task} colors={colors} darkMode={darkMode} />
          )}
          {activeRefTab === "primary" && activeStep === 3 && <StepLogs gmpRecordId={task?.gmp_record_id} dtn={task?.dtn} colors={colors} />}
          {activeStep === 4 && activeRefTab === "primary" && (
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ padding: "12px 16px", borderRadius: 16,
                background: "linear-gradient(135deg,rgba(16,185,129,0.09),rgba(16,185,129,0.02))",
                boxShadow: `0 8px 22px -14px ${ACCENT}80`, display: "flex", gap: 20, flexWrap: "wrap" }}>
                {[{ l: "DTN", v: task?.dtn, a: true }, { l: "Establishment", v: task?.ltoCompany },
                  { l: "Current Step", v: currentStep }].map(({ l, v, a }) => (
                  <div key={l}><div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.08em", color: a ? ACCENT : colors.textTertiary, marginBottom: 2 }}>{l}</div>
                    <div style={{ fontSize: a ? "0.9rem" : "0.78rem", fontWeight: a ? 800 : 600,
                      color: a ? ACCENT : colors.textPrimary,
                      fontFamily: a ? "ui-monospace,monospace" : FONT }}>{v || "—"}</div>
                  </div>
                ))}
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.05em", color: colors.textPrimary, marginBottom: "0.4rem" }}>
                  Handled By
                </label>
                <input readOnly value={currentUser || "—"} style={{
                  width: "100%", padding: "0.55rem 0.75rem", fontFamily: FONT, fontSize: "0.8rem",
                  background: colors.badgeBg, border: "none",
                  borderRadius: 10, color: colors.textPrimary, outline: "none",
                  boxSizing: "border-box", cursor: "not-allowed",
                }} />
              </div>
              <Step5Fields
                mode={mode} decision={decision} onDecisionChange={handleDecisionChange}
                remarks={remarks} setRemarks={setRemarks}
                assignee={assignee} setAssignee={setAssignee}
                rerouteTo={rerouteTo} setRerouteTo={setRerouteTo}
                rerouteUser={rerouteUser} setRerouteUser={setRerouteUser}
                reason={reason} setReason={setReason}
                doctrackEnabled={doctrackEnabled} setDoctrackEnabled={setDoctrackEnabled}
                doctrackRemarks={doctrackRemarks} setDoctrackRemarks={setDoctrackRemarks}
                task={task} currentStep={currentStep}
                infoText={infoText} error={submitError} loading={submitLoading}
                onSubmit={handleSubmit} colors={colors}
                decisions={decisions} GMP_STEPS_LIST={GMP_STEPS}
                needsAuthority={needsAuthority} authorityOptions={authorityOptions}
                loadingAuthority={loadingAuthority} decisionAuthorityId={decisionAuthorityId}
                onAuthorityChange={handleAuthorityChange}
                needsApprovalFields={needsApprovalFields}
                certNumber={certNumber} setCertNumber={setCertNumber}
                typeOfIssuance={typeOfIssuance} setTypeOfIssuance={setTypeOfIssuance}
                certValidity={certValidity} setCertValidity={setCertValidity}
                dirtyFields={dirtyFields}
                isEvalOrChecker={isEvalOrChecker}
                actionOptions={actionOptions} actionValue={action} onActionChange={handleActionChange}
                approvalDecision={approvalDecision} onApprovalDecisionChange={handleApprovalDecisionChange}
                remarksPresetOptions={remarksPresetOptions} remarksPresetValue={remarksPreset}
                onRemarksPresetChange={handleRemarksPresetChange}
                needsTypeOfIssuance={needsTypeOfIssuance} typeOfIssuanceOptions={typeOfIssuanceOptions}
                typeOfIssuanceValue={finalTypeOfIssuance} onTypeOfIssuanceChange={setFinalTypeOfIssuance}
                typeOfIssuanceLocked={typeOfIssuanceLocked}
                needsAssigneeGroup={needsAssigneeGroup} assigneeGroupConfig={assigneeGroupConfig}
                assigneeGroupOptions={assigneeGroupOptions} loadingAssigneeGroup={loadingAssigneeGroup}
                assigneeUserId={assigneeUserId} onAssigneeGroupChange={handleAssigneeGroupChange}
                isLrdChiefAdmin={isLrdChiefAdmin} needsLrdDecision={needsLrdDecision}
                lrdDecisionValue={lrdDecision} onLrdDecisionChange={setLrdDecision}
                isOdReceiving={isOdReceiving} needsOdReceivingDecision={needsOdReceivingDecision}
                odReceivingDecisionValue={odReceivingDecision} onOdReceivingDecisionChange={setOdReceivingDecision}
                isOdReleasing={isOdReleasing} needsOdReleasingDecision={needsOdReleasingDecision}
                odReleasingDecisionValue={odReleasingDecision} onOdReleasingDecisionChange={handleOdReleasingDecisionChange}
                odReleasingSignedDateValue={odReleasingSignedDate} onOdReleasingSignedDateChange={handleOdReleasingSignedDateChange}
                submitLabel={submitLabel}
                needsNodDate={needsNodDate} nodDateLabel={nodDateLabel} nodDateValue={nodDateValue}
                onNodDateChange={setNodDateValue}
                needsDatePrinted={needsDatePrinted} datePrintedValue={datePrintedValue}
                onDatePrintedChange={setDatePrintedValue}
                needsComplianceDeadline={needsComplianceDeadline}
                complianceWorkingDays={complianceWorkingDays} complianceDeadline={complianceDeadline}
                complianceStatus={complianceStatus} complianceRemainingDays={complianceRemainingDays}
                onComplianceWorkingDaysChange={handleComplianceWorkingDaysChange}
                onComplianceDeadlineChange={handleComplianceDeadlineChange}
                newIssuanceType={newIssuanceType} onNewIssuanceTypeChange={setNewIssuanceType}
                addIssuanceLoading={addIssuanceLoading} addIssuanceError={addIssuanceError}
                addIssuanceSuccess={addIssuanceSuccess} onAddIssuance={handleAddIssuance}
                currentIssuanceType={currentIssuanceType} originalIssuanceType={originalIssuanceType}
                onCurrentIssuanceTypeChange={(v) => handleFieldChange("GMP_TYPE_OF_ISSUANCE", v)}
                needsDifferentIssuanceType={needsDifferentIssuanceType}
                isFroo={isFroo}
                currentRelatedDtn={currentRelatedDtn}
                originalRelatedDtn={originalRelatedDtn}
                onRelatedDtnChange={(v) => handleFieldChange("GMP_RELATED_DTN", v)}
              />
            </div>
          )}
        </div>

        <div style={{ padding: "14px 22px", borderTop: `1px solid ${colors.cardBorder}`,
          background: darkMode ? "rgba(255,255,255,0.015)" : "rgba(16,185,129,0.02)",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <button onClick={() => setActiveStep(s => Math.max(1, s - 1))}
            disabled={activeStep === 1}
            style={{ padding: "8px 20px", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
              border: "none", borderRadius: 999,
              background: activeStep === 1 ? "transparent" : editableFieldInnerBg(colors),
              boxShadow: activeStep === 1 ? "none" : fieldCardShadow(colors, false),
              color: activeStep === 1 ? colors.textTertiary : colors.textPrimary,
              cursor: activeStep === 1 ? "not-allowed" : "pointer", opacity: activeStep === 1 ? 0.4 : 1 }}>
            ← Back
          </button>
          <span style={{ fontSize: "0.7rem", color: colors.textTertiary, alignSelf: "center" }}>
            Step {activeStep} of 4 — {GMP_MODAL_STEP_LABELS[activeStep - 1]}
          </span>
          {activeStep < 4
            ? <button onClick={() => setActiveStep(s => Math.min(4, s + 1))}
                style={{ padding: "8px 20px", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
                  border: "none", borderRadius: 999, background: `linear-gradient(145deg,${ACCENT},#059669)`, color: "#fff",
                  cursor: "pointer", boxShadow: `0 8px 18px -8px ${ACCENT}80` }}>
                Next →
              </button>
            : <button onClick={onClose}
                style={{ padding: "8px 20px", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
                  border: "none", borderRadius: 999, background: editableFieldInnerBg(colors),
                  boxShadow: fieldCardShadow(colors, false),
                  color: colors.textTertiary, cursor: "pointer" }}>
                Close
              </button>
          }
        </div>
      </div>
    </div>
  );
}