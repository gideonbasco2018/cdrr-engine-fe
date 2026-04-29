import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "datatable_guide_seen";

/* ── Keyboard shortcut pill ── */
function Kbd({ children }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: "rgba(124,58,237,0.10)",
        border: "1px solid rgba(124,58,237,0.25)",
        borderRadius: 4,
        padding: "1px 7px",
        fontSize: 11,
        fontFamily: "monospace",
        color: "#7c3aed",
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

/* ══════════════════════════════════════════════
   ANIMATED MINI TABLE DEMO
   Each step highlights a different interaction
══════════════════════════════════════════════ */
const DEMO_ROWS = [
  {
    id: 1,
    dtn: "20240506141704",
    category: "DRUG",
    company: "Sandoz Philippines Corp.",
  },
  {
    id: 2,
    dtn: "20260123135945",
    category: "DRUG",
    company: "Ambica International Corp.",
  },
  {
    id: 3,
    dtn: "20241203098821",
    category: "FOOD",
    company: "NutriHealth Products Inc.",
  },
];

function AnimatedTableDemo({ stepIndex }) {
  const [checkedRows, setCheckedRows] = useState([]);
  const [allChecked, setAllChecked] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [clickedDtn, setClickedDtn] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [menuOpen, setMenuOpen] = useState(null);
  const [pulse, setPulse] = useState(false);

  /* Reset + animate on step change */
  useEffect(() => {
    setCheckedRows([]);
    setAllChecked(false);
    setHoveredRow(null);
    setClickedDtn(null);
    setMenuOpen(null);
    setPulse(false);

    const timers = [];

    if (stepIndex === 0) {
      // Double-click demo: highlight row 1, show "opening" flash
      timers.push(setTimeout(() => setHoveredRow(1), 400));
      timers.push(setTimeout(() => setPulse(true), 900));
      timers.push(setTimeout(() => setPulse(false), 1500));
      timers.push(setTimeout(() => setHoveredRow(null), 1800));
      timers.push(setTimeout(() => setHoveredRow(1), 2400));
      timers.push(setTimeout(() => setPulse(true), 2900));
      timers.push(setTimeout(() => setPulse(false), 3500));
    }

    if (stepIndex === 1) {
      // DTN click demo
      timers.push(setTimeout(() => setClickedDtn(1), 500));
      timers.push(setTimeout(() => setClickedDtn(null), 1200));
      timers.push(setTimeout(() => setClickedDtn(2), 2000));
      timers.push(setTimeout(() => setClickedDtn(null), 2700));
    }

    if (stepIndex === 2) {
      // Checkbox demo: check rows one by one then all
      timers.push(setTimeout(() => setCheckedRows([1]), 400));
      timers.push(setTimeout(() => setCheckedRows([1, 2]), 900));
      timers.push(setTimeout(() => setCheckedRows([1, 2, 3]), 1400));
      timers.push(
        setTimeout(() => {
          setCheckedRows([]);
          setAllChecked(false);
        }, 2400),
      );
      timers.push(setTimeout(() => setAllChecked(true), 3000));
      timers.push(setTimeout(() => setAllChecked(false), 3800));
    }

    if (stepIndex === 3) {
      // Menu demo
      timers.push(setTimeout(() => setHoveredRow(2), 400));
      timers.push(setTimeout(() => setMenuOpen(2), 900));
      timers.push(setTimeout(() => setMenuOpen(null), 2400));
      timers.push(setTimeout(() => setHoveredRow(null), 2600));
      timers.push(setTimeout(() => setHoveredRow(3), 3100));
      timers.push(setTimeout(() => setMenuOpen(3), 3600));
      timers.push(setTimeout(() => setMenuOpen(null), 5000));
    }

    if (stepIndex === 4) {
      // Sort demo
      timers.push(setTimeout(() => setSortAsc(false), 600));
      timers.push(setTimeout(() => setSortAsc(true), 1500));
      timers.push(setTimeout(() => setSortAsc(false), 2400));
      timers.push(setTimeout(() => setSortAsc(true), 3300));
    }

    return () => timers.forEach(clearTimeout);
  }, [stepIndex]);

  const isChecked = (id) => allChecked || checkedRows.includes(id);

  return (
    <div
      style={{
        border: "1px solid rgba(124,58,237,0.18)",
        borderRadius: 10,
        overflow: "hidden",
        fontSize: 11,
        background: "#fff",
        boxShadow: "0 4px 20px rgba(124,58,237,0.08)",
        position: "relative",
      }}
    >
      {/* Bulk action bar — shown on step 2 */}
      <div
        style={{
          height: checkedRows.length > 0 || allChecked ? 32 : 0,
          overflow: "hidden",
          transition: "height 0.3s ease",
          background: "linear-gradient(90deg,#7c3aed15,#6d28d910)",
          borderBottom: "1px solid rgba(124,58,237,0.15)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 10px",
        }}
      >
        <span style={{ fontSize: 10, color: "#7c3aed", fontWeight: 700 }}>
          ✔ {allChecked ? 3 : checkedRows.length} selected
        </span>
        {["Mark as Received", "Generate Transmittal", "Mark as Completed"].map(
          (label) => (
            <span
              key={label}
              style={{
                background:
                  label === "Mark as Received"
                    ? "#10b981"
                    : label === "Generate Transmittal"
                      ? "#1976d2"
                      : "#10b981",
                color: "#fff",
                borderRadius: 5,
                padding: "2px 7px",
                fontSize: 9,
                fontWeight: 700,
              }}
            >
              {label}
            </span>
          ),
        )}
      </div>

      {/* Table head */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "32px 32px 140px 80px 1fr 60px",
          borderBottom: "1px solid rgba(124,58,237,0.1)",
          padding: "6px 8px",
          gap: 6,
          alignItems: "center",
        }}
      >
        <input
          type="checkbox"
          readOnly
          checked={allChecked}
          style={{ accentColor: "#7c3aed", width: 12, height: 12 }}
        />
        <span style={{ color: "#9ca3af", fontWeight: 700, fontSize: 9 }}>
          #
        </span>
        {[
          { label: "DTN", key: "dtn" },
          { label: "CATEGORY", key: null },
          { label: "LTO COMPANY", key: null },
          { label: "ACTIONS", key: null },
        ].map(({ label, key }) => (
          <span
            key={label}
            onClick={() => key && setSortAsc((p) => !p)}
            style={{
              color: stepIndex === 4 && label === "DTN" ? "#7c3aed" : "#6b7280",
              fontWeight: 700,
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              cursor: key ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              gap: 3,
              transition: "color 0.2s",
            }}
          >
            {label}
            {key && (
              <span
                style={{ display: "flex", flexDirection: "column", gap: 1 }}
              >
                <span
                  style={{
                    fontSize: 7,
                    color: stepIndex === 4 && !sortAsc ? "#7c3aed" : "#d1d5db",
                  }}
                >
                  ▲
                </span>
                <span
                  style={{
                    fontSize: 7,
                    color: stepIndex === 4 && sortAsc ? "#7c3aed" : "#d1d5db",
                  }}
                >
                  ▼
                </span>
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Table rows */}
      {DEMO_ROWS.map((row, idx) => {
        const checked = isChecked(row.id);
        const hovered = hoveredRow === row.id;
        const dtnClicked = clickedDtn === row.id;
        const isMenuOpen = menuOpen === row.id;

        return (
          <div
            key={row.id}
            style={{
              display: "grid",
              gridTemplateColumns: "32px 32px 140px 80px 1fr 60px",
              padding: "9px 10px",
              gap: 6,
              alignItems: "center",
              background:
                pulse && hovered
                  ? "rgba(124,58,237,0.12)"
                  : hovered
                    ? "rgba(124,58,237,0.05)"
                    : checked
                      ? "rgba(16,185,129,0.06)"
                      : idx % 2 === 0
                        ? "#fff"
                        : "#fafafa",
              borderBottom: "1px solid rgba(0,0,0,0.04)",
              borderLeft: checked
                ? "3px solid #10b981"
                : hovered
                  ? "3px solid #7c3aed"
                  : "3px solid transparent",
              transition: "all 0.2s ease",
              position: "relative",
            }}
          >
            <input
              type="checkbox"
              readOnly
              checked={checked}
              style={{ accentColor: "#10b981", width: 12, height: 12 }}
            />
            <span style={{ color: "#9ca3af", fontWeight: 700, fontSize: 10 }}>
              {idx + 1}
            </span>

            {/* DTN badge */}
            <span
              style={{
                display: "inline-block",
                background: dtnClicked
                  ? "linear-gradient(135deg,#4f46e5,#7c3aed)"
                  : "linear-gradient(135deg,#7c3aed,#6d28d9)",
                color: "#fff",
                borderRadius: 6,
                padding: "3px 7px",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.03em",
                transform: dtnClicked ? "scale(0.94)" : "scale(1)",
                transition: "all 0.15s",
                boxShadow: dtnClicked
                  ? "0 0 0 3px rgba(124,58,237,0.3)"
                  : "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {row.dtn}
            </span>

            <span style={{ color: "#374151", fontSize: 10 }}>
              {row.category}
            </span>
            <span
              style={{
                color: "#6b7280",
                fontSize: 10,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.company}
            </span>

            {/* Actions */}
            <div style={{ position: "relative", textAlign: "center" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  border: "1px solid",
                  borderColor: isMenuOpen ? "#7c3aed" : "rgba(0,0,0,0.15)",
                  borderRadius: 7,
                  fontSize: 16,
                  cursor: "pointer",
                  background: isMenuOpen
                    ? "rgba(124,58,237,0.08)"
                    : "rgba(0,0,0,0.02)",
                  color: "#374151",
                  transition: "all 0.15s",
                  position: "relative",
                  fontWeight: 700,
                }}
              >
                ⋮{/* unread dot */}
                {row.id === 2 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -2,
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#2196F3",
                      border: "1.5px solid #fff",
                    }}
                  />
                )}
              </span>

              {/* Dropdown */}
              {isMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 32,
                    background: "#fff",
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 10,
                    boxShadow: "0 12px 36px rgba(0,0,0,0.18)",
                    zIndex: 999,
                    minWidth: 200,
                    overflow: "hidden",
                    animation: "dropIn 0.15s ease",
                  }}
                >
                  {[
                    { icon: "👁️", label: "View Details" },
                    { icon: "🗂️", label: "Application Logs" },
                    { icon: "🕓", label: "Change Log" },
                    { icon: "📋", label: "Doctrack Details" },
                  ].map((item, i) => (
                    <div
                      key={item.label}
                      style={{
                        padding: "10px 14px",
                        fontSize: 12,
                        color: "#374151",
                        borderBottom:
                          i < 3 ? "1px solid rgba(0,0,0,0.06)" : "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontWeight: 500,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════
   STEPS CONFIG
══════════════════════════════════════════════ */
const STEPS = [
  {
    icon: "👆",
    color: "#7c3aed",
    colorBg: "#EEEDFE",
    label: "Double-click a row",
    sublabel: "View Details / Mark as Received",
    desc: (
      <>
        Double-click anywhere on a row to trigger a quick action. In the{" "}
        <strong>Received</strong> subtab → opens full record details. In the{" "}
        <strong>For Receiving</strong> subtab → instantly opens the{" "}
        <Kbd>Mark as Received</Kbd> confirm dialog for that specific record.
      </>
    ),
  },
  {
    icon: "🏷️",
    color: "#0891b2",
    colorBg: "#E1F5EE",
    label: "Click the DTN badge",
    sublabel: "Doctrack Details",
    desc: "Click the colored DTN number badge in the first column to open the Doctrack details of that record.",
  },
  {
    icon: "☑️",
    color: "#10b981",
    colorBg: "#E6F1FB",
    label: "Select rows",
    sublabel: "Bulk actions",
    desc: (
      <>
        Check one or more rows to reveal bulk action buttons:{" "}
        <Kbd>Mark as Received</Kbd> <Kbd>Generate Transmittal</Kbd>{" "}
        <Kbd>Mark as Completed</Kbd>
      </>
    ),
  },
  {
    icon: "⋮",
    color: "#f59e0b",
    colorBg: "#FAEEDA",
    label: "Actions menu (⋮)",
    sublabel: "Per-row options",
    desc: (
      <>
        Click the <Kbd>⋮</Kbd> button at the end of each row to access:
        Application Logs, Change Log, and Doctrack Details. A{" "}
        <strong style={{ color: "#2196F3" }}>blue dot</strong> means unread.
      </>
    ),
  },
  {
    icon: "↕️",
    color: "#6b7280",
    colorBg: "#EAF3DE",
    label: "Click column headers",
    sublabel: "Sort data",
    desc: "Click any column header to sort the data. Click again to reverse the order. The current sort is shown in the header bar.",
  },
];

/* ══════════════════════════════════════════════
   MAIN MODAL
══════════════════════════════════════════════ */
const AUTO_ADVANCE_MS = 5000;

export default function HowToUseModal({ colors, darkMode, onClose }) {
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

  /* ── Auto-advance every AUTO_ADVANCE_MS ms ── */
  useEffect(() => {
    setProgress(0);
    if (paused) return;

    // Smooth progress bar tick every 50ms
    const tick = AUTO_ADVANCE_MS / 50;
    let current = 0;
    progressRef.current = setInterval(() => {
      current += 1;
      setProgress((current / tick) * 100);
    }, 50);

    intervalRef.current = setTimeout(() => {
      setActiveStep((p) => {
        if (p < STEPS.length - 1) return p + 1;
        return p; // stop at last step
      });
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
    setPaused(true); // pause auto-advance once user manually clicks
    setActiveStep(i);
  };

  const step = STEPS[activeStep];

  return (
    <>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .guide-step-pill:hover {
          opacity: 1 !important;
          transform: translateY(-1px);
        }
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
            border: `1px solid ${darkMode ? "rgba(124,58,237,0.25)" : "rgba(124,58,237,0.15)"}`,
            borderRadius: 16,
            width: "100%",
            maxWidth: 920,
            maxHeight: "95vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
            overflow: "hidden",
            animation: visible ? "modalIn 0.25s ease forwards" : "none",
            opacity: visible ? 1 : 0,
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
              background: darkMode ? "#1c1917" : "#faf9ff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 15,
                  boxShadow: "0 4px 12px rgba(124,58,237,0.35)",
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
                  How to use this table
                </div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "#7c3aed",
                    fontWeight: 600,
                    marginTop: 1,
                  }}
                >
                  Interactive guide — watch the demo below
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
                width: 240,
                flexShrink: 0,
                borderRight: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                padding: "1rem 0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                overflowY: "auto",
                background: darkMode ? "#1c1917" : "#faf9ff",
              }}
            >
              {STEPS.map((s, i) => {
                const active = activeStep === i;
                return (
                  <button
                    key={i}
                    className="guide-step-pill"
                    onClick={() => goToStep(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
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
                      opacity: active ? 1 : darkMode ? 0.55 : 0.65,
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: active
                          ? s.color
                          : darkMode
                            ? "#27272a"
                            : "#f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
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
                          animation: "spin 2s linear infinite",
                          boxShadow: `0 0 6px ${s.color}`,
                        }}
                      />
                    )}
                  </button>
                );
              })}

              {/* Step counter */}
              <div
                style={{
                  marginTop: "auto",
                  padding: "8px 4px 0",
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
                {/* Pause / Play toggle */}
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
                  padding: "1rem 1.2rem 0.75rem",
                  borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                  background: darkMode ? "#0f0f11" : "#f8f7ff",
                }}
              >
                {/* Demo label */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#10b981",
                      boxShadow: "0 0 6px #10b981",
                      animation: "spin 1s linear infinite",
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

                <AnimatedTableDemo stepIndex={activeStep} key={activeStep} />
              </div>

              {/* Description panel */}
              <div
                key={activeStep}
                style={{
                  padding: "1rem 1.2rem",
                  flex: 1,
                  overflowY: "auto",
                  animation: "fadeSlideIn 0.2s ease",
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
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: step.colorBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
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
                      padding: "8px 20px",
                      borderRadius: 8,
                      border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                      background: "transparent",
                      color: darkMode ? "#a1a1aa" : "#6b7280",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: activeStep === 0 ? "not-allowed" : "pointer",
                      opacity: activeStep === 0 ? 0.4 : 1,
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
                      padding: "8px 20px",
                      borderRadius: 8,
                      border: "none",
                      background:
                        activeStep === STEPS.length - 1
                          ? "linear-gradient(135deg,#10b981,#059669)"
                          : `linear-gradient(135deg,${step.color},${step.color}cc)`,
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: `0 3px 10px ${step.color}40`,
                      transition: "all 0.2s",
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
              padding: "0.75rem 1.4rem",
              borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: darkMode ? "#1c1917" : "#faf9ff",
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
                style={{ cursor: "pointer", accentColor: "#7c3aed" }}
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

/* ─────────────────────────────────────────────────────────
   Hook — call this in DataTable to control auto-show logic
   ───────────────────────────────────────────────────────── */
export function useHowToUseGuide() {
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
