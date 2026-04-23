// FILE: src/pages/monitoring/workload/WorkloadView.jsx

// ── Static Data ───────────────────────────────────────────────────────────────
const USER_ROLE_MAP = {
  "Juan dela Cruz": "Evaluator",
  "Maria Santos": "QA Officer",
  "Pedro Reyes": "Checker",
  "Ana Gonzales": "Releasing Officer",
  "Jose Bautista": "Decker",
  "Liza Reyes": "Supervisor",
};

const WORKLOAD_DATA = {
  "Juan dela Cruz": [
    2, 7, 4, 0, 6, 5, 8, 1, 6, 7, 0, 5, 8, 3, 4, 7, 1, 8, 5, 0,
  ],
  "Maria Santos": [6, 0, 8, 4, 7, 7, 0, 6, 8, 2, 5, 7, 0, 6, 8, 0, 6, 3, 7, 5],
  "Pedro Reyes": [0, 6, 2, 7, 5, 4, 6, 0, 5, 7, 8, 2, 7, 0, 1, 7, 3, 0, 6, 4],
  "Ana Gonzales": [5, 0, 6, 8, 2, 6, 2, 7, 0, 8, 1, 6, 0, 7, 5, 3, 7, 6, 0, 6],
  "Jose Bautista": [7, 1, 0, 6, 2, 0, 7, 5, 2, 6, 7, 0, 6, 3, 1, 0, 5, 7, 6, 2],
  "Liza Reyes": [2, 6, 0, 5, 7, 6, 0, 5, 7, 1, 3, 7, 2, 6, 0, 6, 0, 5, 2, 7],
};

const avatarPalette = [
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#fce7f3", color: "#be185d" },
  { bg: "#d1fae5", color: "#065f46" },
  { bg: "#fef3c7", color: "#92400e" },
  { bg: "#ede9fe", color: "#5b21b6" },
  { bg: "#fee2e2", color: "#991b1b" },
  { bg: "#cffafe", color: "#0e7490" },
  { bg: "#fef9c3", color: "#713f12" },
];

// ── Utils ─────────────────────────────────────────────────────────────────────
function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

function getAvatarColor(name, list) {
  return avatarPalette[list.indexOf(name) % avatarPalette.length];
}

// ── Component ─────────────────────────────────────────────────────────────────
function WorkloadView({ ui, darkMode, currentEvaluators, uniqueEvaluators }) {
  const weeks = ["Wk1", "Wk2", "Wk3", "Wk4"];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const maxVal = 8;

  const getColor = (val, dark) => {
    if (val === 0) return dark ? "#242526" : "#e4e6eb";
    const intensity = val / maxVal;
    if (dark) {
      if (intensity < 0.25) return "#1a2e4a";
      if (intensity < 0.5) return "#1550a0";
      if (intensity < 0.75) return "#1877F2";
      return "#5da4f8";
    } else {
      if (intensity < 0.25) return "#bfdbfe";
      if (intensity < 0.5) return "#60a5fa";
      if (intensity < 0.75) return "#2563eb";
      return "#1877F2";
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <p
          style={{
            margin: 0,
            fontSize: "0.9rem",
            fontWeight: 700,
            color: ui.textPrimary,
          }}
        >
          Workload Heatmap
        </p>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: "0.75rem",
            color: ui.textMuted,
          }}
        >
          Daily task volume per user — last 4 working weeks
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {currentEvaluators.map((ev) => {
          const data = WORKLOAD_DATA[ev] || Array(20).fill(0);
          const total = data.reduce((a, b) => a + b, 0);
          const nonZero = data.filter((v) => v > 0);
          const avg = nonZero.length
            ? (total / nonZero.length).toFixed(1)
            : "0.0";
          const peak = Math.max(...data);
          const av = getAvatarColor(ev, uniqueEvaluators);
          const role = USER_ROLE_MAP[ev] || "User";

          return (
            <div
              key={ev}
              style={{
                background: ui.cardBg,
                border: `1px solid ${ui.cardBorder}`,
                borderRadius: 8,
                overflow: "hidden",
                boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                padding: "12px 14px",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: av.bg,
                    color: av.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(ev)}
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.84rem",
                      fontWeight: 700,
                      color: ui.textPrimary,
                    }}
                  >
                    {ev}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.68rem",
                      color: ui.textMuted,
                    }}
                  >
                    {role} · Total: {total} tasks · Avg: {avg}/active day ·
                    Peak: {peak}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { label: "Total", val: total, color: "#1877F2" },
                    { label: "Avg", val: avg, color: "#36a420" },
                    { label: "Peak", val: peak, color: "#f59e0b" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        textAlign: "center",
                        padding: "4px 8px",
                        borderRadius: 6,
                        background: `${s.color}12`,
                        border: `1px solid ${s.color}25`,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.9rem",
                          fontWeight: 800,
                          color: s.color,
                          lineHeight: 1,
                        }}
                      >
                        {s.val}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.58rem",
                          color: s.color,
                          marginTop: 1,
                        }}
                      >
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Heatmap Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px repeat(4, 1fr)",
                  gap: 3,
                }}
              >
                <div />
                {weeks.map((w) => (
                  <div
                    key={w}
                    style={{
                      textAlign: "center",
                      fontSize: "0.62rem",
                      color: ui.textMuted,
                      paddingBottom: 2,
                    }}
                  >
                    {w}
                  </div>
                ))}
                {days.map((day, di) => (
                  <>
                    <div
                      key={`label-${day}`}
                      style={{
                        fontSize: "0.62rem",
                        color: ui.textMuted,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {day}
                    </div>
                    {weeks.map((_, wi) => {
                      const val = data[wi * 5 + di] ?? 0;
                      const cellColor = getColor(val, darkMode);
                      const textColor =
                        val >= 6
                          ? "#fff"
                          : val > 0
                            ? darkMode
                              ? "#93c5fd"
                              : "#1d4ed8"
                            : "transparent";
                      return (
                        <div
                          key={`${day}-${wi}`}
                          title={`${ev} · ${day} Wk${wi + 1}: ${val} tasks`}
                          style={{
                            height: 22,
                            borderRadius: 4,
                            background: cellColor,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "default",
                            transition: "transform 0.1s",
                            border:
                              val === 0
                                ? `1px solid ${darkMode ? "#3a3b3c" : "#dddfe2"}`
                                : "none",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.transform = "scale(1.12)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.transform = "scale(1)")
                          }
                        >
                          <span
                            style={{
                              fontSize: "0.56rem",
                              fontWeight: 700,
                              color: textColor,
                            }}
                          >
                            {val > 0 ? val : ""}
                          </span>
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>

              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 8,
                  justifyContent: "flex-end",
                }}
              >
                <span style={{ fontSize: "0.6rem", color: ui.textMuted }}>
                  0
                </span>
                {[0, 2, 4, 6, 8].map((v) => (
                  <div
                    key={v}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      background: getColor(v, darkMode),
                      border:
                        v === 0
                          ? `1px solid ${darkMode ? "#3a3b3c" : "#dddfe2"}`
                          : "none",
                    }}
                  />
                ))}
                <span style={{ fontSize: "0.6rem", color: ui.textMuted }}>
                  8+
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WorkloadView;
