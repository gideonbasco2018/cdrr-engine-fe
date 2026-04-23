// src/components/monitoring/deadlines/DeadlinesView.jsx
import { useState } from "react";

const FB = "#1877F2";

const stepColors = {
  "For Evaluation": { bg: "#dbeafe", color: "#1d4ed8" },
  "For Compliance": { bg: "#fef9c3", color: "#a16207" },
  "For Checking": { bg: "#dcfce7", color: "#15803d" },
  "For QA": { bg: "#f3e8ff", color: "#7e22ce" },
  "For Releasing": { bg: "#ffedd5", color: "#c2410c" },
};
const stepColorsDark = {
  "For Evaluation": { bg: "#1e2a4a", color: "#93c5fd" },
  "For Compliance": { bg: "#2a2000", color: "#fde68a" },
  "For Checking": { bg: "#0a2e1a", color: "#86efac" },
  "For QA": { bg: "#2a1a3e", color: "#d8b4fe" },
  "For Releasing": { bg: "#2e1500", color: "#fed7aa" },
};

function Card({ children, style = {}, ui }) {
  return (
    <div
      style={{
        background: ui.cardBg,
        border: `1px solid ${ui.cardBorder}`,
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default function DeadlinesView({
  ui,
  darkMode,
  DEADLINES,
  USER_ROLE_MAP,
}) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const [deadlineFilter, setDeadlineFilter] = useState("all");

  const filteredDeadlines =
    deadlineFilter === "all"
      ? DEADLINES
      : DEADLINES.filter((d) => d.urgency === deadlineFilter);

  return (
    <div style={{ fontFamily: font }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            Upcoming Deadlines
          </p>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "0.75rem",
              color: ui.textMuted,
            }}
          >
            Applications approaching their evaluation deadline
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            background: darkMode ? ui.inputBg : "#e4e6eb",
            borderRadius: 9,
            padding: 3,
          }}
        >
          {[
            { key: "all", label: "All" },
            { key: "critical", label: "🔴 Critical" },
            { key: "warning", label: "🟡 Warning" },
            { key: "normal", label: "🟢 Normal" },
          ].map(({ key, label }) => {
            const isAct = deadlineFilter === key;
            return (
              <button
                key={key}
                onClick={() => setDeadlineFilter(key)}
                style={{
                  padding: "4px 12px",
                  fontSize: "0.74rem",
                  fontWeight: isAct ? 700 : 500,
                  borderRadius: 6,
                  border: "none",
                  background: isAct ? ui.cardBg : "transparent",
                  color: isAct ? FB : ui.textMuted,
                  cursor: "pointer",
                  fontFamily: font,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          marginBottom: 14,
        }}
      >
        {[
          {
            label: "Critical",
            count: DEADLINES.filter((d) => d.urgency === "critical").length,
            color: "#e02020",
            bg: darkMode ? "#2e0f0f" : "#fff1f2",
            desc: "Due in ≤ 2 days",
          },
          {
            label: "Warning",
            count: DEADLINES.filter((d) => d.urgency === "warning").length,
            color: "#f59e0b",
            bg: darkMode ? "#2e1f00" : "#fffbeb",
            desc: "Due in 3–5 days",
          },
          {
            label: "Normal",
            count: DEADLINES.filter((d) => d.urgency === "normal").length,
            color: "#36a420",
            bg: darkMode ? "#0f2e1a" : "#f0fdf4",
            desc: "Due in 6+ days",
          },
        ].map((s) => (
          <Card
            key={s.label}
            ui={ui}
            style={{
              background: s.bg,
              borderColor: `${s.color}30`,
              padding: "12px 14px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "1.5rem",
                fontWeight: 800,
                color: s.color,
              }}
            >
              {s.count}
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: s.color,
              }}
            >
              {s.label}
            </p>
            <p
              style={{
                margin: "1px 0 0",
                fontSize: "0.7rem",
                color: ui.textMuted,
              }}
            >
              {s.desc}
            </p>
          </Card>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filteredDeadlines.map((d) => {
          const urgColors = {
            critical: {
              color: "#e02020",
              bg: darkMode ? "#2e0f0f" : "#fff1f2",
              dot: "#e02020",
            },
            warning: {
              color: "#f59e0b",
              bg: darkMode ? "#2e1f00" : "#fffbeb",
              dot: "#f59e0b",
            },
            normal: {
              color: "#36a420",
              bg: darkMode ? "#0f2e1a" : "#f0fdf4",
              dot: "#36a420",
            },
          };
          const uc = urgColors[d.urgency];
          const SPC = darkMode ? stepColorsDark : stepColors;
          const spc = SPC[d.step] || { bg: "#f3f4f6", color: "#374151" };
          const role = USER_ROLE_MAP[d.evaluator] || "User";
          return (
            <Card key={d.dtn} ui={ui} style={{ borderColor: `${uc.color}30` }}>
              <div
                style={{
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: uc.dot,
                    flexShrink: 0,
                    boxShadow: `0 0 0 3px ${uc.dot}30`,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontFamily: "monospace",
                        color: FB,
                        fontWeight: 700,
                      }}
                    >
                      {d.dtn}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: spc.bg,
                        color: spc.color,
                      }}
                    >
                      {d.step}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.82rem",
                      color: ui.textPrimary,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {d.drug}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "0.72rem",
                      color: ui.textMuted,
                    }}
                  >
                    Assigned to: {d.evaluator} <span>({role})</span>
                  </p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: uc.color,
                    }}
                  >
                    {d.deadline}
                  </p>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 99,
                      background: uc.bg,
                      color: uc.color,
                      textTransform: "capitalize",
                    }}
                  >
                    {d.urgency}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
