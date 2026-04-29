import { useState, useEffect, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const FB = "#1877F2";
const STORAGE_KEY = "dashboard_guide_seen";
const AUTO_ADVANCE_MS = 5500;

// ─── Kbd pill ─────────────────────────────────────────────────────────────────
function Kbd({ children }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: `${FB}18`,
        border: `1px solid ${FB}40`,
        borderRadius: 4,
        padding: "1px 7px",
        fontSize: 11,
        fontFamily: "monospace",
        color: FB,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

// ─── makeUI (same as DashboardPage) ──────────────────────────────────────────
function makeUI(dark) {
  return dark
    ? {
        pageBg: "#18191a",
        cardBg: "#242526",
        cardBorder: "#3a3b3c",
        inputBg: "#3a3b3c",
        textPrimary: "#e4e6ea",
        textSub: "#b0b3b8",
        textMuted: "#65676b",
        divider: "#3a3b3c",
        hoverBg: "#2d2e2f",
        progressBg: "#3a3b3c",
        metricBorder: "#3a3b3c",
        metricActiveBg: "#1c2e45",
      }
    : {
        pageBg: "#f0f2f5",
        cardBg: "#ffffff",
        cardBorder: "#dddfe2",
        inputBg: "#f0f2f5",
        textPrimary: "#1c1e21",
        textSub: "#65676b",
        textMuted: "#8a8d91",
        divider: "#e4e6eb",
        hoverBg: "#f2f3f5",
        progressBg: "#e4e6eb",
        metricBorder: "#dddfe2",
        metricActiveBg: "#E7F0FD",
      };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 0 — Metric Tiles Demo
// ═══════════════════════════════════════════════════════════════════════════════
function MetricTilesDemo({ darkMode }) {
  const ui = makeUI(darkMode);
  const [activeIdx, setActiveIdx] = useState(null);
  const [pulse, setPulse] = useState(null);

  const tiles = [
    { icon: "👁️", label: "Total Received", value: 3, change: 8, color: FB },
    { icon: "✅", label: "Completed", value: 2, change: -3, color: "#36a420" },
    { icon: "⏳", label: "On Process", value: 1, change: 12, color: "#f59e0b" },
    { icon: "🎯", label: "Target", value: 0, change: 0, color: "#9333ea" },
  ];

  useEffect(() => {
    const timers = [];
    timers.push(
      setTimeout(() => {
        setActiveIdx(0);
        setPulse(0);
      }, 400),
    );
    timers.push(setTimeout(() => setPulse(null), 1000));
    timers.push(
      setTimeout(() => {
        setActiveIdx(1);
        setPulse(1);
      }, 1600),
    );
    timers.push(setTimeout(() => setPulse(null), 2200));
    timers.push(
      setTimeout(() => {
        setActiveIdx(2);
        setPulse(2);
      }, 2800),
    );
    timers.push(setTimeout(() => setPulse(null), 3400));
    timers.push(setTimeout(() => setActiveIdx(0), 4200));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{ padding: "12px 0" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {tiles.map((t, i) => {
          const isActive = activeIdx === i;
          const isPulsing = pulse === i;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                padding: "10px 10px",
                borderRadius: 8,
                border: `1.5px solid ${isActive ? t.color : ui.metricBorder}`,
                background: isPulsing
                  ? `${t.color}22`
                  : isActive
                    ? ui.metricActiveBg
                    : ui.cardBg,
                transition: "all 0.25s ease",
                boxShadow: isPulsing ? `0 0 0 3px ${t.color}30` : "none",
                cursor: "pointer",
                position: "relative",
              }}
            >
              {i < 3 && (
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 6,
                    fontSize: 8,
                    fontWeight: 700,
                    color: "#36a420",
                    background: "#e9f7e620",
                    padding: "1px 4px",
                    borderRadius: 99,
                  }}
                >
                  ● LIVE
                </span>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: "0.9rem" }}>{t.icon}</span>
                <span style={{ fontSize: 9, color: ui.textSub }}>
                  {t.label}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span
                  style={{
                    fontSize: "1.3rem",
                    fontWeight: 700,
                    color: ui.textPrimary,
                    lineHeight: 1,
                  }}
                >
                  {t.value}
                </span>
                {t.change !== 0 && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: t.change > 0 ? "#36a420" : "#e02020",
                    }}
                  >
                    {t.change > 0 ? "↑" : "↓"} {Math.abs(t.change)}%
                  </span>
                )}
              </div>
              {isActive && (
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 8,
                    color: t.color,
                    fontWeight: 700,
                  }}
                >
                  View details →
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div
        style={{
          padding: "7px 10px",
          borderRadius: 7,
          background: `${FB}10`,
          border: `1px solid ${FB}28`,
          fontSize: 10,
          color: FB,
          fontWeight: 600,
          textAlign: "center",
        }}
      >
        ↑ Click any tile to open the detail modal with full records
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1 — Chart Breakdown Demo
// ═══════════════════════════════════════════════════════════════════════════════
function ChartBreakdownDemo({ darkMode }) {
  const ui = makeUI(darkMode);
  const [active, setActive] = useState("year");

  useEffect(() => {
    const cycle = ["year", "month", "day"];
    let idx = 0;
    const id = setInterval(() => {
      idx = (idx + 1) % cycle.length;
      setActive(cycle[idx]);
    }, 1400);
    return () => clearInterval(id);
  }, []);

  const opts = [
    { key: "day", label: "Daily", note: "Select year + month" },
    { key: "month", label: "Monthly", note: "Select year" },
    { key: "year", label: "Yearly", note: "All years" },
  ];

  const chartData = {
    year: [
      { label: "2023", received: 82, completed: 60, on_process: 22 },
      { label: "2024", received: 108, completed: 90, on_process: 18 },
      { label: "2025", received: 95, completed: 78, on_process: 17 },
      { label: "2026", received: 40, completed: 28, on_process: 12 },
    ],
    month: [
      { label: "Jan", received: 18, completed: 12, on_process: 6 },
      { label: "Feb", received: 22, completed: 16, on_process: 6 },
      { label: "Mar", received: 15, completed: 10, on_process: 5 },
      { label: "Apr", received: 25, completed: 18, on_process: 7 },
    ],
    day: [
      { label: "1", received: 3, completed: 2, on_process: 1 },
      { label: "5", received: 5, completed: 4, on_process: 1 },
      { label: "10", received: 4, completed: 3, on_process: 1 },
      { label: "15", received: 6, completed: 4, on_process: 2 },
    ],
  };

  const data = chartData[active];
  const maxV =
    Math.max(...data.flatMap((d) => [d.received, d.completed, d.on_process])) *
    1.2;
  const W = 320,
    H = 90,
    PAD = { top: 8, right: 8, bottom: 20, left: 28 };
  const cW = W - PAD.left - PAD.right,
    cH = H - PAD.top - PAD.bottom;
  const toX = (i) => PAD.left + (i / Math.max(data.length - 1, 1)) * cW;
  const toY = (v) => PAD.top + cH - (v / maxV) * cH;

  const series = [
    { key: "received", color: FB },
    { key: "completed", color: "#36a420" },
    { key: "on_process", color: "#f59e0b" },
  ];

  return (
    <div style={{ padding: "10px 0" }}>
      {/* Toggle buttons */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          padding: 3,
          borderRadius: 8,
          background: ui.inputBg,
          border: `1px solid ${ui.cardBorder}`,
          marginBottom: 10,
          width: "fit-content",
          margin: "0 auto 10px",
        }}
      >
        {opts.map((o) => (
          <button
            key={o.key}
            style={{
              padding: "4px 14px",
              borderRadius: 6,
              border: "none",
              background: active === o.key ? FB : "transparent",
              color: active === o.key ? "#fff" : ui.textSub,
              fontSize: "0.8rem",
              fontWeight: active === o.key ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Mini chart */}
      <div
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 8,
          padding: "8px 10px",
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            overflow: "visible",
          }}
        >
          {series.map((s) => {
            const pts = data
              .map((d, i) => `${toX(i)},${toY(d[s.key] ?? 0)}`)
              .join(" ");
            return (
              <polyline
                key={s.key}
                points={pts}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          })}
          {data.map((d, i) => (
            <text
              key={i}
              x={toX(i)}
              y={H - 3}
              textAnchor="middle"
              fill={ui.textMuted}
              fontSize="9"
            >
              {d.label}
            </text>
          ))}
        </svg>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            marginTop: 4,
          }}
        >
          {[
            { color: FB, label: "Received" },
            { color: "#36a420", label: "Completed" },
            { color: "#f59e0b", label: "On Process" },
          ].map((s) => (
            <div
              key={s.label}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: s.color,
                }}
              />
              <span style={{ fontSize: 9, color: ui.textSub }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
          padding: "6px 10px",
          borderRadius: 7,
          background: `${FB}10`,
          border: `1px solid ${FB}28`,
          fontSize: 10,
          color: FB,
          fontWeight: 600,
          textAlign: "center",
        }}
      >
        Switching breakdown auto-refreshes both chart and data table
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2 — Data Table Demo
// ═══════════════════════════════════════════════════════════════════════════════
function DataTableDemo({ darkMode }) {
  const ui = makeUI(darkMode);
  const rows = [
    {
      label: "2026",
      received: 3,
      completed: 2,
      onProcess: 1,
      target: "—",
      rate: 66.7,
    },
  ];
  const [hoveredRow, setHoveredRow] = useState(null);

  useEffect(() => {
    const t1 = setTimeout(() => setHoveredRow(0), 600);
    const t2 = setTimeout(() => setHoveredRow(null), 1600);
    const t3 = setTimeout(() => setHoveredRow(0), 2400);
    const t4 = setTimeout(() => setHoveredRow(null), 3200);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  return (
    <div style={{ padding: "10px 0" }}>
      <div
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 8,
          overflow: "hidden",
          fontSize: "0.78rem",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "inherit",
          }}
        >
          <thead>
            <tr style={{ background: ui.pageBg }}>
              {[
                "Year",
                "Total Received",
                "Completed",
                "On Process",
                "Target",
                "Rate",
              ].map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: "7px 10px",
                    textAlign: i === 0 ? "left" : "right",
                    fontSize: "0.66rem",
                    fontWeight: 700,
                    color: [
                      ui.textMuted,
                      FB,
                      "#36a420",
                      "#f59e0b",
                      "#9333ea",
                      "#9333ea",
                    ][i],
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    borderBottom: `1px solid ${ui.cardBorder}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                style={{
                  background: hoveredRow === ri ? ui.hoverBg : "transparent",
                  transition: "background 0.2s",
                }}
              >
                <td
                  style={{
                    padding: "7px 10px",
                    color: ui.textPrimary,
                    fontWeight: 600,
                  }}
                >
                  {row.label}
                </td>
                <td
                  style={{
                    padding: "7px 10px",
                    textAlign: "right",
                    color: FB,
                    fontWeight: 700,
                  }}
                >
                  {row.received}
                </td>
                <td
                  style={{
                    padding: "7px 10px",
                    textAlign: "right",
                    color: "#36a420",
                    fontWeight: 700,
                  }}
                >
                  {row.completed}
                </td>
                <td
                  style={{
                    padding: "7px 10px",
                    textAlign: "right",
                    color: "#f59e0b",
                    fontWeight: 700,
                  }}
                >
                  {row.onProcess}
                </td>
                <td
                  style={{
                    padding: "7px 10px",
                    textAlign: "right",
                    color: ui.textMuted,
                  }}
                >
                  {row.target}
                </td>
                <td style={{ padding: "7px 10px", textAlign: "right" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "#f59e0b",
                      background: "#fff8e7",
                      padding: "2px 7px",
                      borderRadius: 99,
                    }}
                  >
                    ~ {row.rate.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr
              style={{
                background: ui.pageBg,
                borderTop: `2px solid ${ui.cardBorder}`,
              }}
            >
              <td
                style={{
                  padding: "7px 10px",
                  fontWeight: 700,
                  color: ui.textPrimary,
                  fontSize: "0.74rem",
                }}
              >
                Total
              </td>
              <td
                style={{
                  padding: "7px 10px",
                  textAlign: "right",
                  fontWeight: 800,
                  color: FB,
                }}
              >
                3
              </td>
              <td
                style={{
                  padding: "7px 10px",
                  textAlign: "right",
                  fontWeight: 800,
                  color: "#36a420",
                }}
              >
                2
              </td>
              <td
                style={{
                  padding: "7px 10px",
                  textAlign: "right",
                  fontWeight: 800,
                  color: "#f59e0b",
                }}
              >
                1
              </td>
              <td
                style={{
                  padding: "7px 10px",
                  textAlign: "right",
                  fontWeight: 800,
                  color: "#9333ea",
                }}
              >
                0
              </td>
              <td style={{ padding: "7px 10px", textAlign: "right" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: "#f59e0b",
                    background: "#fff8e7",
                    padding: "2px 7px",
                    borderRadius: 99,
                  }}
                >
                  ~ 66.7%
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div
        style={{
          marginTop: 8,
          padding: "6px 10px",
          borderRadius: 7,
          background: `${FB}10`,
          border: `1px solid ${FB}28`,
          fontSize: 10,
          color: FB,
          fontWeight: 600,
          textAlign: "center",
        }}
      >
        Color-coded rates: ▲ green ≥75% · ~ amber ≥50% · ▼ red &lt;50%
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3 — Recent Applications Demo
// ═══════════════════════════════════════════════════════════════════════════════
function RecentAppsDemo({ darkMode }) {
  const ui = makeUI(darkMode);
  const apps = [
    {
      dtn: "20240506141704",
      brand: "Amio (Amiodarone HCl)",
      step: "Checking",
      statusLabel: "In Progress",
      statusColor: "#f59e0b",
      statusBg: "#fff8e7",
      icon: "⏳",
      date: "Apr 29",
    },
    {
      dtn: "20230908133701",
      brand: "Furacef-750 (Cefuroxime)",
      step: "Final Review",
      statusLabel: "Completed",
      statusColor: "#36a420",
      statusBg: "#e9f7e6",
      icon: "✅",
      date: "Apr 28",
    },
  ];
  const [hovered, setHovered] = useState(null);
  const [seeAllPulse, setSeeAllPulse] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHovered(0), 500);
    const t2 = setTimeout(() => setHovered(null), 1300);
    const t3 = setTimeout(() => setHovered(1), 2000);
    const t4 = setTimeout(() => setHovered(null), 2800);
    const t5 = setTimeout(() => setSeeAllPulse(true), 3500);
    const t6 = setTimeout(() => setSeeAllPulse(false), 4200);
    return () => [t1, t2, t3, t4, t5, t6].forEach(clearTimeout);
  }, []);

  return (
    <div style={{ padding: "10px 0" }}>
      <div
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "10px 14px 8px",
            borderBottom: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.84rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              Recent Applications
            </p>
            <p style={{ margin: 0, fontSize: "0.72rem", color: ui.textSub }}>
              Access and manage your latest applications.
            </p>
          </div>
          <button
            style={{
              background: seeAllPulse ? `${FB}18` : "none",
              border: seeAllPulse ? `1px solid ${FB}50` : "none",
              borderRadius: 6,
              color: FB,
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              padding: "3px 8px",
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
          >
            See all
          </button>
        </div>
        {apps.map((app, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderBottom:
                i < apps.length - 1 ? `1px solid ${ui.divider}` : "none",
              background: hovered === i ? ui.hoverBg : "transparent",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: app.statusBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.95rem",
                  flexShrink: 0,
                }}
              >
                {app.icon}
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: ui.textPrimary,
                  }}
                >
                  {app.dtn}
                </p>
                <p
                  style={{ margin: 0, fontSize: "0.74rem", color: ui.textSub }}
                >
                  {app.brand}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: "0.68rem",
                    color: ui.textMuted,
                  }}
                >
                  📌 {app.step}
                </p>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  color: app.statusColor,
                  background: app.statusBg,
                  padding: "3px 9px",
                  borderRadius: 99,
                }}
              >
                {app.statusLabel}
              </span>
              <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
                {app.date}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 8,
          padding: "6px 10px",
          borderRadius: 7,
          background: `${FB}10`,
          border: `1px solid ${FB}28`,
          fontSize: 10,
          color: FB,
          fontWeight: 600,
          textAlign: "center",
        }}
      >
        "See all" opens a paginated modal with all records — click any row to
        view details
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4 — System Status Demo
// ═══════════════════════════════════════════════════════════════════════════════
function SystemStatusDemo({ darkMode }) {
  const ui = makeUI(darkMode);
  const [connections, setConnections] = useState([
    {
      id: "doctrack",
      label: "Doctrack",
      desc: "Document Tracking DB",
      icon: "🗂️",
      active: true,
    },
    {
      id: "aws",
      label: "AWS",
      desc: "Cloud Storage & Services",
      icon: "☁️",
      active: true,
    },
    {
      id: "maindb",
      label: "Main DB",
      desc: "Primary Application DB",
      icon: "🗄️",
      active: true,
    },
  ]);
  const [flashIdx, setFlashIdx] = useState(null);

  useEffect(() => {
    const timers = [];
    // Toggle AWS off then on
    timers.push(
      setTimeout(() => {
        setFlashIdx(1);
        setConnections((p) =>
          p.map((c, i) => (i === 1 ? { ...c, active: false } : c)),
        );
      }, 600),
    );
    timers.push(setTimeout(() => setFlashIdx(null), 1200));
    timers.push(
      setTimeout(() => {
        setFlashIdx(1);
        setConnections((p) =>
          p.map((c, i) => (i === 1 ? { ...c, active: true } : c)),
        );
      }, 2400),
    );
    timers.push(setTimeout(() => setFlashIdx(null), 3000));
    return () => timers.forEach(clearTimeout);
  }, []);

  const allActive = connections.every((c) => c.active);
  const someInactive = connections.some((c) => !c.active);

  return (
    <div style={{ padding: "10px 0" }}>
      <div
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "10px 14px 8px",
            borderBottom: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.84rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              System Status
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "0.7rem",
                color: allActive
                  ? "#36a420"
                  : someInactive
                    ? "#f59e0b"
                    : "#e02020",
                transition: "color 0.3s",
              }}
            >
              {allActive
                ? "● All systems operational"
                : "● Some connections inactive"}
            </p>
          </div>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: allActive
                ? "#36a420"
                : someInactive
                  ? "#f59e0b"
                  : "#e02020",
              transition: "background 0.3s",
            }}
          />
        </div>
        <div
          style={{
            padding: "8px 14px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {connections.map((conn, i) => (
            <div
              key={conn.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 8,
                border: `1px solid ${conn.active ? "#36a42030" : "#e0202030"}`,
                background:
                  flashIdx === i
                    ? conn.active
                      ? "#36a42020"
                      : "#e0202020"
                    : conn.active
                      ? "#36a42008"
                      : "#e0202008",
                transition: "all 0.3s",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: conn.active ? "#36a42018" : "#e0202018",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.9rem",
                  transition: "background 0.3s",
                }}
              >
                {conn.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: ui.textPrimary,
                  }}
                >
                  {conn.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.68rem",
                    color: ui.textMuted,
                  }}
                >
                  {conn.desc}
                </p>
              </div>
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 9px",
                  borderRadius: 99,
                  border: `1.5px solid ${conn.active ? "#36a42050" : "#e0202050"}`,
                  background: conn.active ? "#36a42015" : "#e0202015",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.3s",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: conn.active ? "#36a420" : "#e02020",
                    display: "inline-block",
                    transition: "background 0.3s",
                  }}
                />
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: conn.active ? "#36a420" : "#e02020",
                    transition: "color 0.3s",
                  }}
                >
                  {conn.active ? "Active" : "Inactive"}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5 — Accomplishment Report Demo
// ═══════════════════════════════════════════════════════════════════════════════
function AccomplishmentReportDemo({ darkMode }) {
  const ui = makeUI(darkMode);
  const [btnPulse, setBtnPulse] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setBtnPulse(true), 700);
    const t2 = setTimeout(() => {
      setBtnPulse(false);
      setShowPreview(true);
    }, 1400);
    const t3 = setTimeout(() => setShowPreview(false), 3600);
    const t4 = setTimeout(() => setBtnPulse(true), 4200);
    const t5 = setTimeout(() => setBtnPulse(false), 4800);
    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
  }, []);

  return (
    <div style={{ padding: "10px 0" }}>
      <div
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 8,
          overflow: "hidden",
          marginBottom: 8,
        }}
      >
        <div style={{ padding: "10px 14px 8px" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.84rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            Accomplishment Report
          </p>
          <p style={{ margin: 0, fontSize: "0.72rem", color: ui.textMuted }}>
            Select a date range to generate
          </p>
        </div>
        <div style={{ padding: "0 14px 12px" }}>
          <button
            style={{
              width: "100%",
              padding: "9px 0",
              borderRadius: 8,
              border: `1.5px solid ${FB}`,
              background: btnPulse ? "#1565d8" : FB,
              color: "#fff",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              transform: btnPulse ? "scale(0.97)" : "scale(1)",
              transition: "all 0.15s",
              boxShadow: btnPulse ? `0 0 0 3px ${FB}40` : "none",
            }}
          >
            📋 Generate Report
          </button>
        </div>
      </div>

      {/* Preview modal snippet */}
      <div
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 8,
          overflow: "hidden",
          transition: "all 0.3s ease",
          maxHeight: showPreview ? 200 : 0,
          opacity: showPreview ? 1 : 0,
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: 12,
            background: ui.pageBg,
            borderBottom: `1px solid ${ui.cardBorder}`,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.88rem",
              fontWeight: 800,
              color: ui.textPrimary,
            }}
          >
            📋 Accomplishment Report
          </p>
          <p style={{ margin: 0, fontSize: "0.72rem", color: ui.textSub }}>
            Mar 9 – Mar 13, 2026 · CDRR System
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            padding: 10,
          }}
        >
          {[
            { label: "Total Received", value: "3", color: FB, icon: "📥" },
            { label: "Completed", value: "2", color: "#36a420", icon: "✅" },
            { label: "On Process", value: "1", color: "#f59e0b", icon: "⏳" },
            { label: "Rate", value: "66.7%", color: "#9333ea", icon: "📈" },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                textAlign: "center",
                padding: "6px 4px",
                borderRadius: 7,
                border: `1px solid ${ui.cardBorder}`,
              }}
            >
              <div style={{ fontSize: "0.95rem", marginBottom: 2 }}>
                {s.icon}
              </div>
              <div
                style={{ fontSize: "0.95rem", fontWeight: 800, color: s.color }}
              >
                {s.value}
              </div>
              <div
                style={{ fontSize: "0.6rem", color: ui.textSub, marginTop: 2 }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEPS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
const STEPS = [
  {
    icon: "📊",
    color: FB,
    colorBg: "#E7F0FD",
    label: "Key Performance Indicator (KPI) Metric Tiles",
    sublabel: "Click to drill down",
    desc: (
      <>
        Click any KPI tile (<Kbd>Total Received</Kbd>, <Kbd>Completed</Kbd>,{" "}
        <Kbd>On Process</Kbd>) to open a detail modal showing all matching
        records with full pagination. Tiles marked <strong>LIVE</strong> reflect
        real-time counts. The <Kbd>Target</Kbd> tile shows the chart target
        value only.
      </>
    ),
    Demo: MetricTilesDemo,
  },
  {
    icon: "📈",
    color: "#9333ea",
    colorBg: "#f3e8ff",
    label: "Chart Breakdown",
    sublabel: "Daily / Monthly / Yearly",
    desc: (
      <>
        Use the <Kbd>Daily</Kbd> <Kbd>Monthly</Kbd> <Kbd>Yearly</Kbd> toggle to
        switch chart granularity. For <strong>Daily</strong> view, pick a year +
        month. For <strong>Monthly</strong>, pick a year.{" "}
        <strong>Yearly</strong> shows all-time data. Both the chart and the data
        table below it update automatically.
      </>
    ),
    Demo: ChartBreakdownDemo,
  },
  {
    icon: "🗃️",
    color: "#0891b2",
    colorBg: "#E1F5EE",
    label: "Data Table",
    sublabel: "Paginated + color-coded rates",
    desc: (
      <>
        The data table mirrors the current chart view. Completion rates are
        color-coded: <strong style={{ color: "#36a420" }}>▲ green</strong> ≥75%,{" "}
        <strong style={{ color: "#f59e0b" }}>~ amber</strong> ≥50%,{" "}
        <strong style={{ color: "#e02020" }}>▼ red</strong> &lt;50%. The{" "}
        <strong>Total</strong> row at the bottom always shows the sum across all
        periods.
      </>
    ),
    Demo: DataTableDemo,
  },
  {
    icon: "📋",
    color: "#36a420",
    colorBg: "#e9f7e6",
    label: "Recent Applications",
    sublabel: "Latest records at a glance",
    desc: (
      <>
        Shows the 10 most recent applications. Click <Kbd>See all</Kbd> to open
        a full paginated modal of all records. Click any row to open the{" "}
        <strong>View Details</strong> modal for that specific record. Each item
        shows the DTN, brand/generic name, current step, status, and relative
        date.
      </>
    ),
    Demo: RecentAppsDemo,
  },
  {
    icon: "⚙️",
    color: "#f59e0b",
    colorBg: "#fff8e7",
    label: "System Status",
    sublabel: "Toggle DB connections",
    desc: (
      <>
        Shows live connection status for <Kbd>Doctrack</Kbd>, <Kbd>AWS</Kbd>,
        and <Kbd>Main DB</Kbd>. Click the status button on any connection to
        toggle it <strong style={{ color: "#36a420" }}>Active</strong> /{" "}
        <strong style={{ color: "#e02020" }}>Inactive</strong>. The header
        indicator updates to reflect the overall system health.
      </>
    ),
    Demo: SystemStatusDemo,
  },
  {
    icon: "🖨️",
    color: "#9333ea",
    colorBg: "#f3e8ff",
    label: "Accomplishment Report",
    sublabel: "Generate & print",
    desc: (
      <>
        Click <Kbd>Generate Report</Kbd> to produce a formatted accomplishment
        report based on the current data. The report shows totals for the
        selected period and can be <strong>printed</strong> directly via the
        Print button inside the modal.
      </>
    ),
    Demo: AccomplishmentReportDemo,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function HowToUseDashboardModal({ colors, darkMode, onClose }) {
  const ui = colors || makeUI(darkMode);
  const [dontShow, setDontShow] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setProgress(0);
    if (paused) return;

    const tick = AUTO_ADVANCE_MS / 50;
    let current = 0;
    progressRef.current = setInterval(() => {
      current += 1;
      setProgress((current / tick) * 100);
    }, 50);

    intervalRef.current = setTimeout(() => {
      setActiveStep((p) => (p < STEPS.length - 1 ? p + 1 : p));
    }, AUTO_ADVANCE_MS);

    return () => {
      clearTimeout(intervalRef.current);
      clearInterval(progressRef.current);
    };
  }, [activeStep, paused]);

  const handleClose = () => {
    if (dontShow) localStorage.setItem(STORAGE_KEY, "true");
    onClose?.();
  };

  const goToStep = (i) => {
    setPaused(true);
    setActiveStep(i);
  };

  const step = STEPS[activeStep];
  const Demo = step.Demo;

  return (
    <>
      <style>{`
        @keyframes dashModalIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dashFadeSlide {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes dashSpin { to { transform: rotate(360deg); } }
        .dash-step-pill:hover { opacity: 1 !important; transform: translateY(-1px); }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          backdropFilter: "blur(2px)",
        }}
        onClick={handleClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: darkMode ? "#18181b" : "#fff",
            border: `1px solid ${darkMode ? `${FB}30` : `${FB}20`}`,
            borderRadius: 16,
            width: "100%",
            maxWidth: 960,
            maxHeight: "95vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
            overflow: "hidden",
            animation: visible ? "dashModalIn 0.25s ease forwards" : "none",
            opacity: visible ? 1 : 0,
            fontFamily:
              "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              padding: "1rem 1.4rem",
              borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: darkMode ? "#1c1917" : "#f5f8ff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: FB,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 16,
                  boxShadow: `0 4px 12px ${FB}50`,
                }}
              >
                ?
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: darkMode ? "#f4f4f5" : "#111",
                    lineHeight: 1.2,
                  }}
                >
                  How to use the Dashboard
                </div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: FB,
                    fontWeight: 600,
                    marginTop: 1,
                  }}
                >
                  Interactive guide — watch the live demo below
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: "transparent",
                border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                borderRadius: 8,
                width: 30,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: darkMode ? "#a1a1aa" : "#6b7280",
                fontSize: 14,
              }}
            >
              ✕
            </button>
          </div>

          {/* ── Body ── */}
          <div
            style={{
              display: "flex",
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            {/* Left: step pills */}
            <div
              style={{
                width: 220,
                flexShrink: 0,
                borderRight: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                padding: "1rem 0.65rem",
                display: "flex",
                flexDirection: "column",
                gap: 3,
                overflowY: "auto",
                background: darkMode ? "#1c1917" : "#f5f8ff",
              }}
            >
              {STEPS.map((s, i) => {
                const active = activeStep === i;
                return (
                  <button
                    key={i}
                    className="dash-step-pill"
                    onClick={() => goToStep(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 8px",
                      borderRadius: 10,
                      border: active
                        ? `1.5px solid ${s.color}40`
                        : "1.5px solid transparent",
                      background: active
                        ? darkMode
                          ? `${s.color}18`
                          : s.colorBg
                        : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "all 0.18s ease",
                      opacity: active ? 1 : darkMode ? 0.5 : 0.6,
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: active
                          ? s.color
                          : darkMode
                            ? "#27272a"
                            : "#f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        flexShrink: 0,
                        transition: "all 0.18s",
                        boxShadow: active ? `0 4px 10px ${s.color}40` : "none",
                      }}
                    >
                      {s.icon}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: active
                            ? darkMode
                              ? "#f4f4f5"
                              : "#111"
                            : darkMode
                              ? "#a1a1aa"
                              : "#374151",
                          lineHeight: 1.3,
                        }}
                      >
                        {s.label}
                      </div>
                      <div
                        style={{
                          fontSize: 9.5,
                          color: active
                            ? s.color
                            : darkMode
                              ? "#71717a"
                              : "#9ca3af",
                          fontWeight: 600,
                          marginTop: 1,
                        }}
                      >
                        {s.sublabel}
                      </div>
                    </div>
                    {active && (
                      <div
                        style={{
                          marginLeft: "auto",
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: s.color,
                          flexShrink: 0,
                          animation: "dashSpin 2s linear infinite",
                          boxShadow: `0 0 6px ${s.color}`,
                        }}
                      />
                    )}
                  </button>
                );
              })}

              {/* Step counter + progress */}
              <div
                style={{
                  marginTop: "auto",
                  padding: "10px 4px 0",
                  fontSize: 10,
                  color: darkMode ? "#52525b" : "#9ca3af",
                  textAlign: "center",
                  borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                  paddingTop: 10,
                }}
              >
                Step {activeStep + 1} of {STEPS.length}
                <div
                  style={{
                    marginTop: 8,
                    height: 4,
                    background: darkMode ? "#27272a" : "#e5e7eb",
                    borderRadius: 99,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: paused
                        ? `${((activeStep + 1) / STEPS.length) * 100}%`
                        : `${progress}%`,
                      background: paused
                        ? darkMode
                          ? "#3f3f46"
                          : "#d1d5db"
                        : `linear-gradient(90deg,${step.color},${step.color}cc)`,
                      borderRadius: 99,
                      transition: paused
                        ? "width 0.3s ease"
                        : "width 0.05s linear",
                    }}
                  />
                </div>
                <button
                  onClick={() => setPaused((p) => !p)}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    padding: "4px 0",
                    border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                    borderRadius: 6,
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 10,
                    fontWeight: 600,
                    color: darkMode ? "#71717a" : "#9ca3af",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}
                >
                  {paused ? "▶ Resume auto-play" : "⏸ Pause"}
                </button>
              </div>
            </div>

            {/* Right: demo + description */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Animated demo area */}
              <div
                style={{
                  padding: "0.85rem 1.1rem 0.6rem",
                  borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                  background: darkMode ? "#0f0f11" : "#f8faff",
                  overflowY: "auto",
                  maxHeight: "55%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#36a420",
                      boxShadow: "0 0 6px #36a420",
                      animation: "dashSpin 1s linear infinite",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: darkMode ? "#71717a" : "#9ca3af",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Live demo
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      background: `${step.color}18`,
                      color: step.color,
                      border: `1px solid ${step.color}30`,
                      borderRadius: 4,
                      padding: "1px 6px",
                      fontWeight: 700,
                    }}
                  >
                    {step.label}
                  </span>
                </div>
                <Demo key={activeStep} darkMode={darkMode} />
              </div>

              {/* Description panel */}
              <div
                key={activeStep}
                style={{
                  padding: "0.85rem 1.1rem",
                  flex: 1,
                  overflowY: "auto",
                  animation: "dashFadeSlide 0.2s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: step.colorBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 17,
                      flexShrink: 0,
                      boxShadow: `0 4px 12px ${step.color}20`,
                    }}
                  >
                    {step.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: darkMode ? "#f4f4f5" : "#111",
                        marginBottom: 6,
                      }}
                    >
                      {step.label}{" "}
                      <span style={{ color: step.color, fontWeight: 600 }}>
                        — {step.sublabel}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: darkMode ? "#a1a1aa" : "#4b5563",
                        lineHeight: 1.7,
                      }}
                    >
                      {step.desc}
                    </div>
                  </div>
                </div>

                {/* Nav arrows */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 14,
                    gap: 8,
                  }}
                >
                  <button
                    onClick={() => goToStep(Math.max(0, activeStep - 1))}
                    disabled={activeStep === 0}
                    style={{
                      padding: "7px 18px",
                      borderRadius: 8,
                      border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                      background: "transparent",
                      color: darkMode ? "#a1a1aa" : "#6b7280",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: activeStep === 0 ? "not-allowed" : "pointer",
                      opacity: activeStep === 0 ? 0.4 : 1,
                      fontFamily: "inherit",
                    }}
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => {
                      if (activeStep < STEPS.length - 1)
                        goToStep(activeStep + 1);
                      else handleClose();
                    }}
                    style={{
                      padding: "7px 18px",
                      borderRadius: 8,
                      border: "none",
                      background:
                        activeStep === STEPS.length - 1
                          ? "linear-gradient(135deg,#36a420,#259110)"
                          : `linear-gradient(135deg,${step.color},${step.color}cc)`,
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: `0 3px 10px ${step.color}40`,
                      transition: "all 0.2s",
                      fontFamily: "inherit",
                    }}
                  >
                    {activeStep === STEPS.length - 1 ? "✔ Got it!" : "Next →"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div
            style={{
              padding: "0.7rem 1.4rem",
              borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: darkMode ? "#1c1917" : "#f5f8ff",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.72rem",
                color: darkMode ? "#71717a" : "#9ca3af",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={dontShow}
                onChange={(e) => setDontShow(e.target.checked)}
                style={{ cursor: "pointer", accentColor: FB }}
              />
              Don't show this again
            </label>
            <button
              onClick={handleClose}
              style={{
                padding: "5px 16px",
                background: "transparent",
                border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                borderRadius: 8,
                color: darkMode ? "#a1a1aa" : "#6b7280",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Skip guide
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useHowToUseDashboardGuide() {
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setShowGuide(true);
  }, []);

  return {
    showGuide,
    openGuide: () => setShowGuide(true),
    closeGuide: () => setShowGuide(false),
  };
}
