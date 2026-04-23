// src/components/monitoring/compliance/ComplianceView.jsx
import { useState } from "react";

const FB = "#1877F2";

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

export default function ComplianceView({
  ui,
  darkMode,
  COMPLIANCE_FLAGS,
  USER_ROLE_MAP,
}) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const [complianceFilter, setComplianceFilter] = useState("all");

  const filteredFlags =
    complianceFilter === "all"
      ? COMPLIANCE_FLAGS
      : COMPLIANCE_FLAGS.filter((f) => f.severity === complianceFilter);

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
            Compliance Flags
          </p>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "0.75rem",
              color: ui.textMuted,
            }}
          >
            Applications flagged for compliance issues
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
            { key: "high", label: "🔴 High" },
            { key: "medium", label: "🟡 Medium" },
            { key: "low", label: "🟢 Low" },
          ].map(({ key, label }) => {
            const isAct = complianceFilter === key;
            return (
              <button
                key={key}
                onClick={() => setComplianceFilter(key)}
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
            label: "High Severity",
            count: COMPLIANCE_FLAGS.filter((f) => f.severity === "high").length,
            color: "#e02020",
            bg: darkMode ? "#2e0f0f" : "#fff1f2",
          },
          {
            label: "Medium Severity",
            count: COMPLIANCE_FLAGS.filter((f) => f.severity === "medium")
              .length,
            color: "#f59e0b",
            bg: darkMode ? "#2e1f00" : "#fffbeb",
          },
          {
            label: "Low Severity",
            count: COMPLIANCE_FLAGS.filter((f) => f.severity === "low").length,
            color: "#36a420",
            bg: darkMode ? "#0f2e1a" : "#f0fdf4",
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
                fontSize: "0.78rem",
                fontWeight: 600,
                color: s.color,
              }}
            >
              {s.label}
            </p>
          </Card>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filteredFlags.map((flag) => {
          const sevColors = {
            high: { color: "#e02020", bg: darkMode ? "#2e0f0f" : "#fff1f2" },
            medium: { color: "#f59e0b", bg: darkMode ? "#2e1f00" : "#fffbeb" },
            low: { color: "#36a420", bg: darkMode ? "#0f2e1a" : "#f0fdf4" },
          };
          const sc = sevColors[flag.severity];
          const role = USER_ROLE_MAP[flag.evaluator] || "User";
          return (
            <Card
              key={flag.dtn}
              ui={ui}
              style={{ borderColor: `${sc.color}30` }}
            >
              <div style={{ padding: "12px 14px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ flex: 1 }}>
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
                        {flag.dtn}
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: sc.bg,
                          color: sc.color,
                          textTransform: "capitalize",
                        }}
                      >
                        {flag.severity}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.84rem",
                        fontWeight: 600,
                        color: ui.textPrimary,
                      }}
                    >
                      {flag.drug}
                    </p>
                    <p
                      style={{
                        margin: "3px 0 0",
                        fontSize: "0.78rem",
                        color: ui.textMuted,
                      }}
                    >
                      User: {flag.evaluator} <span>({role})</span>
                    </p>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.72rem",
                      color: ui.textMuted,
                      flexShrink: 0,
                    }}
                  >
                    {flag.flaggedDate}
                  </p>
                </div>
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: 7,
                    background: `${sc.color}10`,
                    border: `1px solid ${sc.color}25`,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.78rem",
                      color: sc.color,
                      fontWeight: 500,
                    }}
                  >
                    🚩 {flag.reason}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
