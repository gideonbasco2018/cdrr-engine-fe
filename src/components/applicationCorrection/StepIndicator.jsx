import { getTheme } from "./theme";

const STEPS = [
  { num: 1, label: "Application Details" },
  { num: 2, label: "Decker Decision" },
  { num: 3, label: "Review & Submit" },
];

export function StepIndicator({ currentStep, darkMode }) {
  const t = getTheme(darkMode);

  return (
    <div
      style={{
        gridColumn: "1 / -1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        marginBottom: "0.4rem",
        padding: "12px 16px",
        background: t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 12,
        boxShadow: t.cardShadow,
      }}
    >
      {STEPS.map((step, idx) => {
        const isDone = currentStep > step.num;
        const isActive = currentStep === step.num;
        return (
          <div key={step.num} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  background: isDone
                    ? t.successText
                    : isActive
                      ? t.accent
                      : t.stepInactive,
                  color: isDone || isActive ? "#fff" : t.textTertiary,
                  border: isDone
                    ? `2px solid ${t.successText}`
                    : isActive
                      ? `2px solid ${t.accent}`
                      : `2px solid ${t.stepLine}`,
                  transition: "all 0.2s",
                }}
              >
                {isDone ? (
                  <svg
                    width="12"
                    height="12"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  step.num
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  whiteSpace: "nowrap",
                  letterSpacing: "0.2px",
                  fontWeight: isActive ? 700 : 500,
                  color: isDone
                    ? t.successText
                    : isActive
                      ? t.accent
                      : t.textTertiary,
                }}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                style={{
                  width: 70,
                  height: 2,
                  marginBottom: 18,
                  marginLeft: 6,
                  marginRight: 6,
                  background:
                    currentStep > step.num ? t.successText : t.stepLine,
                  transition: "background 0.2s",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
