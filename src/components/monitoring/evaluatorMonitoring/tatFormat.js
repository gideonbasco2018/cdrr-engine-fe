// src/components/monitoring/evaluatorMonitoring/tatFormat.js
// How a TAT is written. The API sends working days; the time of day counts as
// part of a day (12 hours = 0.5), so same-day work is a fraction.
//   1 day or more : days, one decimal     (64.3)
//   under 1 day   : a time                (3 h 20 min, 45 min, <1 min)
//   nothing       : 0
//   missing       : —
export function fmtTat(n) {
  if (n === null || n === undefined || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  if (v >= 1) return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (v <= 0) return "0";
  const total = Math.round(v * 24 * 60); // minutes
  if (total < 1) return "<1 min";
  if (total >= 24 * 60) return "1"; // rounds up to a whole day
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// the unit word after an average: "working days" (none when it is a time)
export const tatUnit = (n) =>
  Number(n) < 1 ? "" : Number(n) === 1 ? "working day" : "working days";
