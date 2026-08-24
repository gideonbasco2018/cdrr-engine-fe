// src/components/gmp/shared/StepProgress.jsx
import React from "react";
import { GMP_PROGRESS_STEPS } from "./constants";

const ACCENT = "#10b981";
const FROO_COLOR = "#0ea5e9";

// Historical/bulk-imported records (see gmp_upload.py's Excel upload) can
// carry a terminal GMP_APP_STATUS with no GMP_CURRENT_STEP at all — there's
// no live workflow position to show, since they never actually walked the
// steps here. Rendering every dot as "not started" would misread as an
// untouched application, so a terminal status with no current step is
// instead shown as fully walked. Mirrors how the row's own status badge
// already treats these values as done (see getEffectiveStatus() in
// QueueTable.jsx / WorkflowModal.jsx) — kept as its own small set here
// rather than importing theirs, since neither of those modules exports it.
const TERMINAL_APP_STATUSES = new Set([
  "COMPLETED", "RELEASED", "DISAPPROVED", "CANCELLED APPLICATION", "CANCELLED",
]);

export default function StepProgress({ currentStep, appStatus, darkMode }) {
  // FROO is a conditional detour (NFI issuance types only) that hands the
  // application back to the Evaluator — it isn't one of the fixed 7 steps
  // every application walks through, so it doesn't get its own dot here.
  // While a record sits on FROO, show it as "back at Evaluator" (with a FROO
  // badge on that dot) since that's exactly where it's headed next.
  const isFroo = currentStep === "FROO";
  const effectiveStep = isFroo ? "Evaluator" : currentStep;

  const isTerminalWithNoStep =
    !currentStep && TERMINAL_APP_STATUSES.has(String(appStatus || "").trim().toUpperCase());

  // Past the last index -> every dot renders as done, none as "current".
  const currentIdx = isTerminalWithNoStep
    ? GMP_PROGRESS_STEPS.length
    : GMP_PROGRESS_STEPS.findIndex((s) => s.id === effectiveStep);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {GMP_PROGRESS_STEPS.map((s, i) => {
        const done      = i < currentIdx;
        const current   = i === currentIdx;
        const isFrooDot = current && isFroo;
        return (
          <React.Fragment key={`${s.id}-${i}`}>
            <div
              title={isFrooDot ? `${s.label} (returning from FROO)` : s.label}
              style={{
                position: "relative",
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                background: done ? ACCENT : current ? (isFrooDot ? FROO_COLOR : s.color) : (darkMode ? "#2a2b2c" : "#e2e8f0"),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.6rem",
                boxShadow: current ? `0 0 0 2px ${(isFrooDot ? FROO_COLOR : s.color)}40` : "none",
                transition: "all 0.2s",
              }}
            >
              {done ? "✓" : isFrooDot ? "🔗" : s.icon}
              {isFrooDot && (
                <span style={{
                  position: "absolute", bottom: -3, right: -3,
                  width: 9, height: 9, borderRadius: "50%",
                  background: FROO_COLOR, border: `1.5px solid ${darkMode ? "#18191a" : "#fff"}`,
                }} />
              )}
            </div>
            {i < GMP_PROGRESS_STEPS.length - 1 && (
              <div style={{
                width: 10, height: 2, flexShrink: 0,
                background: done
                  ? `${ACCENT}50`
                  : (darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
