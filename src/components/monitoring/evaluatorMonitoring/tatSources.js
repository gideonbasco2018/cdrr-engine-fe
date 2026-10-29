// src/components/monitoring/evaluatorMonitoring/tatSources.js
// Where the start and the finish of a TAT came from.
//   start: "log"      = the first dated step of the role in the application log
//          "decked"   = the Date Decked of the application (fallback)
//   end:   "log"      = the finish of the person's own step in the application log
//          "released" = the Date Released of the application (fallback)

const START = { log: "Application log", decked: "Date Decked" };
const END = { log: "Application log", released: "Date Released" };

export const startLabel = (src) => START[src] || "-";
export const endLabel = (src) => END[src] || "-";

// true when the TAT used Date Decked and / or Date Released
export const isFallback = (start, end) =>
  start === "decked" || end === "released";

// "Application log -> Date Released" (arrow = " to " when the font has none)
export const sourceText = (s, arrow = " → ") =>
  `${startLabel(s.start)}${arrow}${endLabel(s.end)}`;

// what each combination means, in plain words
export const sourceHint = (s) => {
  if (s.start === "log" && s.end === "log")
    return "The person's own step, taken from the application log.";
  if (s.start === "decked" && s.end === "released")
    return "The whole processing time: it includes waiting before and the steps after.";
  if (s.start === "decked" && s.end === "log")
    return "Counts from Date Decked, so it includes time before the step started.";
  return "Counts to Date Released, so it includes the steps after this one.";
};
