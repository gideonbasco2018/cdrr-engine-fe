// src/components/gmp/shared/StatusTimelineBadge.jsx
// "Status Timeline" pill + shared timeline logic for the FGMP Queue / Tasks
// tables — the FGMP analog of renderTimeline() in
// components/tasks/DataTable/renderCell.jsx.
//
// Compares elapsed WORKING days (Mon–Fri) since Date Received against the
// application's allotted timeline. The allotment is:
//   1. the first integer in GMP_TIMELINE, if it has one; otherwise
//   2. the Citizen's-Charter default for the establishment category —
//      PIC/S = 60 working days, NON PIC/S = 153 working days.
// The clock stops at Released Date once set, otherwise it counts up to "now".
import React from "react";

// Elapsed working days at which a still-open application is flagged "near" its
// deadline (row turns light yellow). Past 100% it is "beyond" (light red).
export const GMP_TIMELINE_NEAR_RATIO = 0.8;

// Fixed Citizen's-Charter working-day allotments per establishment category.
const GMP_CATEGORY_TIMELINE_DAYS = { "PIC/S": 60, "NON PIC/S": 153 };

// GMP_EST_CATEGORY is "PIC/S" / "NON PIC/S" / "LETTER and CORRECTION" (see
// GMP_CATEGORY_OPTIONS in WorkflowModal.jsx). Tolerate spacing/hyphen variants.
export function categoryTimelineDays(category) {
  const c = String(category ?? "").trim().toUpperCase().replace(/\s+/g, " ");
  if (c === "PIC/S" || c === "PICS") return GMP_CATEGORY_TIMELINE_DAYS["PIC/S"];
  if (c === "NON PIC/S" || c === "NON-PIC/S" || c === "NONPIC/S" || c === "NON PICS")
    return GMP_CATEGORY_TIMELINE_DAYS["NON PIC/S"];
  return null;
}

// GMP_TIMELINE is free text ("120", "120 working days", "20 wd", …). Pull the
// first run of digits as the allowed-day count; null if there is no number.
function parseTimelineDays(raw) {
  if (raw == null) return null;
  const m = String(raw).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

// Effective allotted working days: an explicit GMP_TIMELINE number always wins;
// otherwise fall back to the category default. null when neither is known.
export function effectiveTimelineDays(row) {
  return parseTimelineDays(row?.timeline) ?? categoryTimelineDays(row?.category);
}

function toDate(v) {
  if (!v || v === "N/A") return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// Mon–Fri days strictly after `start`, up to and including `end`. Mirrors
// workingDaysBetween() in WorkflowModal.jsx. Returns 0 when end <= start.
function workingDaysBetween(start, end) {
  const a = new Date(start); a.setHours(0, 0, 0, 0);
  const b = new Date(end);   b.setHours(0, 0, 0, 0);
  if (b <= a) return 0;
  let count = 0;
  const d = new Date(a);
  while (d < b) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

/**
 * @param {{ date_received?, released_date?, timeline?, category? }} row
 * @returns {{ within, level, days, allowed, pct, released } | null}
 *   `days` = elapsed working days; `level` is "within" | "near" | "beyond";
 *   `released` is true once Released Date is set. null when it can't be
 *   computed (no Date Received, or no timeline number and unknown category).
 */
export function computeStatusTimeline(row) {
  const allowed = effectiveTimelineDays(row);
  const start = toDate(row?.date_received);
  if (start == null || allowed == null || allowed <= 0) return null;
  const releasedAt = toDate(row?.released_date);
  const end = releasedAt ?? new Date();
  const days = workingDaysBetween(start, end);
  const pct = days / allowed;
  const level = pct > 1 ? "beyond" : pct >= GMP_TIMELINE_NEAR_RATIO ? "near" : "within";
  return { within: days <= allowed, level, days, allowed, pct, released: releasedAt != null };
}

// Solid row-background tint for a still-open application near or past its
// timeline — null for released rows and for everything comfortably within.
// Solid (not rgba) so the sticky checkbox / actions columns stay opaque during
// horizontal scroll (see the note in QueueTable.jsx / TasksTable.jsx).
export function rowTimelineTint(row, darkMode) {
  const r = computeStatusTimeline(row);
  if (!r || r.released) return null;
  if (r.level === "beyond") return darkMode ? "#3a2020" : "#fbe4e4";
  if (r.level === "near")   return darkMode ? "#33301f" : "#fbf3d0";
  return null;
}

export default function StatusTimelineBadge({ row }) {
  const r = computeStatusTimeline(row);
  if (!r) return <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>;

  const { within, days } = r;
  return (
    <span
      style={{
        padding: "0.35rem 0.8rem",
        background: within
          ? "linear-gradient(135deg,#10b981,#059669)"
          : "linear-gradient(135deg,#ef4444,#dc2626)",
        color: "#fff",
        borderRadius: 8,
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        boxShadow: within
          ? "0 2px 8px rgba(16,185,129,.3)"
          : "0 2px 8px rgba(239,68,68,.3)",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        whiteSpace: "nowrap",
      }}
    >
      <span>{within ? "✓" : "⚠"}</span>
      {within ? `Within (${days}d)` : `Beyond (${days}d)`}
    </span>
  );
}
