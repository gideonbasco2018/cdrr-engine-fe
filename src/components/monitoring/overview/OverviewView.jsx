// src/components/monitoring/overview/OverviewView.jsx
import { useState } from "react";

const FB = "#1877F2";

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

const rxColors = {
  "Over-the-Counter (OTC)": { bg: "#e0f2fe", color: "#0369a1" },
  Vaccine: { bg: "#dcfce7", color: "#15803d" },
  "Prescription Drug (RX)": { bg: "#fef3c7", color: "#b45309" },
};
const rxColorsDark = {
  "Over-the-Counter (OTC)": { bg: "#0c2a3a", color: "#38bdf8" },
  Vaccine: { bg: "#0a2e1a", color: "#4ade80" },
  "Prescription Drug (RX)": { bg: "#2e1f00", color: "#fbbf24" },
};

function rxShortLabel(p) {
  return p === "Over-the-Counter (OTC)"
    ? "OTC"
    : p === "Prescription Drug (RX)"
      ? "RX"
      : "Vaccine";
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

function Card({ children, style = {}, ui, onClick }) {
  return (
    <div
      onClick={onClick}
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

export default function OverviewView({
  ui,
  darkMode,
  tableData,
  uniqueEvaluators,
  USER_ROLE_MAP,
  ACTIVITY_FEED,
  DEADLINES,
  COMPLIANCE_FLAGS,
  setActiveNav,
  setModalEval,
}) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const totalAll = tableData.length;
  const approvedAll = tableData.filter((r) => r.status === "Approved").length;
  const disapprovedAll = tableData.filter(
    (r) => r.status === "Disapproved",
  ).length;
  const onProcessAll = tableData.filter(
    (r) => r.status === "On Process",
  ).length;
  const approvalRateAll = totalAll
    ? ((approvedAll / totalAll) * 100).toFixed(1)
    : "0.0";
  const criticalDeadlines = DEADLINES.filter(
    (d) => d.urgency === "critical",
  ).length;
  const highFlags = COMPLIANCE_FLAGS.filter(
    (f) => f.severity === "high",
  ).length;
  const beyondTimeline = tableData.filter(
    (r) => r.timeline === "Beyond",
  ).length;
  const currentEvaluators = [...new Set(tableData.map((d) => d.evaluator))];

  function getAvatarColor(name) {
    return avatarPalette[uniqueEvaluators.indexOf(name) % avatarPalette.length];
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        fontFamily: font,
      }}
    >
      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
        }}
      >
        {[
          {
            icon: "📥",
            label: "Total Applications",
            value: totalAll.toLocaleString(),
            color: FB,
            sub: "All years combined",
          },
          {
            icon: "✅",
            label: "Approved",
            value: approvedAll.toLocaleString(),
            color: "#36a420",
            sub: `${approvalRateAll}% approval rate`,
          },
          {
            icon: "⏳",
            label: "On Process",
            value: onProcessAll.toLocaleString(),
            color: "#f59e0b",
            sub: "Pending completion",
          },
          {
            icon: "❌",
            label: "Disapproved",
            value: disapprovedAll.toLocaleString(),
            color: "#e02020",
            sub: "Requires review",
          },
        ].map((kpi) => (
          <Card key={kpi.label} ui={ui} style={{ padding: "14px 16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: `${kpi.color}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  flexShrink: 0,
                }}
              >
                {kpi.icon}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: ui.textMuted,
                }}
              >
                {kpi.label}
              </p>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "1.6rem",
                fontWeight: 800,
                color: kpi.color,
                lineHeight: 1,
                letterSpacing: "-0.03em",
              }}
            >
              {kpi.value}
            </p>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "0.72rem",
                color: ui.textMuted,
              }}
            >
              {kpi.sub}
            </p>
          </Card>
        ))}
      </div>

      {/* Alert Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}
      >
        {[
          {
            icon: "⏰",
            label: "Critical Deadlines",
            value: criticalDeadlines,
            color: "#e02020",
            bg: darkMode ? "#2e0f0f" : "#fff1f2",
            desc: "Due within 2 days",
            action: () => setActiveNav("deadlines"),
          },
          {
            icon: "🚩",
            label: "High Compliance Flags",
            value: highFlags,
            color: "#f59e0b",
            bg: darkMode ? "#2e1f00" : "#fffbeb",
            desc: "Require immediate attention",
            action: () => setActiveNav("compliance"),
          },
          {
            icon: "📤",
            label: "Beyond Timeline",
            value: beyondTimeline,
            color: "#9333ea",
            bg: darkMode ? "#1e1a2e" : "#f5f3ff",
            desc: "Applications past due",
            action: () => setActiveNav("records"),
          },
        ].map((alert) => (
          <Card
            key={alert.label}
            ui={ui}
            style={{
              background: alert.bg,
              borderColor: `${alert.color}30`,
              cursor: "pointer",
            }}
            onClick={alert.action}
          >
            <div
              style={{
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${alert.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                  flexShrink: 0,
                }}
              >
                {alert.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "1.4rem",
                    fontWeight: 800,
                    color: alert.color,
                    lineHeight: 1,
                  }}
                >
                  {alert.value}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: alert.color,
                  }}
                >
                  {alert.label}
                </p>
                <p
                  style={{
                    margin: "1px 0 0",
                    fontSize: "0.7rem",
                    color: ui.textMuted,
                  }}
                >
                  {alert.desc}
                </p>
              </div>
              <span style={{ color: alert.color, fontSize: "1rem" }}>›</span>
            </div>
          </Card>
        ))}
      </div>

      {/* User Load + Recent Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.88rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            User Load
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {currentEvaluators.map((ev) => {
              const tasks = tableData.filter((d) => d.evaluator === ev);
              const approved = tasks.filter(
                (t) => t.status === "Approved",
              ).length;
              const onProc = tasks.filter(
                (t) => t.status === "On Process",
              ).length;
              const av = getAvatarColor(ev);
              const pct = tasks.length
                ? Math.round((approved / tasks.length) * 100)
                : 0;
              const role = USER_ROLE_MAP[ev] || "User";
              return (
                <Card
                  key={ev}
                  ui={ui}
                  style={{ padding: "10px 12px", cursor: "pointer" }}
                  onClick={() => setModalEval(ev)}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 1,
                        }}
                      >
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              color: ui.textPrimary,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {ev}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.66rem",
                              color: ui.textMuted,
                            }}
                          >
                            {role}
                          </p>
                        </div>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: ui.textMuted,
                            flexShrink: 0,
                            marginLeft: 8,
                          }}
                        >
                          {tasks.length} tasks
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 4,
                          alignItems: "center",
                          marginTop: 4,
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            height: 4,
                            borderRadius: 99,
                            background: ui.progressBg,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              borderRadius: 99,
                              background: pct >= 70 ? "#36a420" : FB,
                              transition: "width 0.4s",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            color: ui.textMuted,
                            flexShrink: 0,
                            minWidth: 28,
                          }}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 99,
                          background: "#36a42018",
                          color: "#36a420",
                        }}
                      >
                        {approved}✅
                      </span>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 99,
                          background: "#f59e0b18",
                          color: "#f59e0b",
                        }}
                      >
                        {onProc}⏳
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.88rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              Recent Activity
            </p>
            <button
              onClick={() => setActiveNav("activity")}
              style={{
                background: "none",
                border: "none",
                color: FB,
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
              }}
            >
              See all
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ACTIVITY_FEED.slice(0, 6).map((act) => (
              <Card key={act.id} ui={ui} style={{ padding: "10px 12px" }}>
                <div
                  style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: `${act.color}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.9rem",
                      flexShrink: 0,
                    }}
                  >
                    {act.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.78rem",
                        color: ui.textPrimary,
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{act.user}</span>{" "}
                      <span style={{ color: ui.textSub }}>{act.action}</span>
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "0.7rem",
                        color: ui.textMuted,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {act.target}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "0.67rem",
                      color: ui.textMuted,
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {act.time}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* By Classification */}
      <div>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: "0.88rem",
            fontWeight: 700,
            color: ui.textPrimary,
          }}
        >
          Applications by Classification
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
          }}
        >
          {["Prescription Drug (RX)", "Over-the-Counter (OTC)", "Vaccine"].map(
            (type) => {
              const count = tableData.filter(
                (r) => r.prescription === type,
              ).length;
              const pct = totalAll
                ? ((count / totalAll) * 100).toFixed(1)
                : "0";
              const rxc = darkMode ? rxColorsDark[type] : rxColors[type];
              return (
                <Card key={type} ui={ui} style={{ padding: "14px 16px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color: rxc?.color,
                      }}
                    >
                      {rxShortLabel(type)} — {type}
                    </p>
                    <span
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 800,
                        color: rxc?.color,
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: "1.4rem",
                      fontWeight: 800,
                      color: ui.textPrimary,
                    }}
                  >
                    {count}
                  </p>
                  <div
                    style={{
                      height: 5,
                      borderRadius: 99,
                      background: ui.progressBg,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        borderRadius: 99,
                        background: rxc?.color,
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                </Card>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}
