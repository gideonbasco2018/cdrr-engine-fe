// src/components/gmp/shared/StepProgress.jsx
import React from "react";
import { GMP_STEPS } from "./constants";

const ACCENT = "#10b981";

export default function StepProgress({ currentStep, darkMode }) {
  const currentIdx = GMP_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {GMP_STEPS.map((s, i) => {
        const done    = i < currentIdx;
        const current = i === currentIdx;
        return (
          <React.Fragment key={`${s.id}-${i}`}>
            <div
              title={s.label}
              style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                background: done ? ACCENT : current ? s.color : (darkMode ? "#2a2b2c" : "#e2e8f0"),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.6rem",
                boxShadow: current ? `0 0 0 2px ${s.color}40` : "none",
                transition: "all 0.2s",
              }}
            >
              {done ? "✓" : s.icon}
            </div>
            {i < GMP_STEPS.length - 1 && (
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
