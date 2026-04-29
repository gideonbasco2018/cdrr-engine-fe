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
  const [showBulkBar, setShowBulkBar] = useState(false);
  const [activeBulkBtn, setActiveBulkBtn] = useState(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showEndorseModal, setShowEndorseModal] = useState(false);

  useEffect(() => {
    setCheckedRows([]);
    setAllChecked(false);
    setHoveredRow(null);
    setClickedDtn(null);
    setMenuOpen(null);
    setPulse(false);
    setShowBulkBar(false);
    setActiveBulkBtn(null);
    setShowCloseModal(false);
    setShowDetailsPanel(false);
    setShowEndorseModal(false);

    const t = [];

    if (stepIndex === 0) {
      t.push(setTimeout(() => setHoveredRow(1), 400));
      t.push(setTimeout(() => setPulse(true), 900));
      t.push(setTimeout(() => setPulse(false), 1500));
      t.push(setTimeout(() => setHoveredRow(null), 1800));
      t.push(setTimeout(() => setHoveredRow(1), 2400));
      t.push(setTimeout(() => setPulse(true), 2900));
      t.push(setTimeout(() => setPulse(false), 3500));
    }

    if (stepIndex === 1) {
      t.push(setTimeout(() => setClickedDtn(1), 500));
      t.push(setTimeout(() => setClickedDtn(null), 1200));
      t.push(setTimeout(() => setClickedDtn(2), 2000));
      t.push(setTimeout(() => setClickedDtn(null), 2700));
    }

    if (stepIndex === 2) {
      t.push(setTimeout(() => setCheckedRows([1]), 400));
      t.push(setTimeout(() => setCheckedRows([1, 2]), 900));
      t.push(
        setTimeout(() => {
          setCheckedRows([1, 2, 3]);
          setShowBulkBar(true);
        }, 1400),
      );
      t.push(
        setTimeout(() => {
          setCheckedRows([]);
          setAllChecked(false);
          setShowBulkBar(false);
        }, 2600),
      );
      t.push(
        setTimeout(() => {
          setAllChecked(true);
          setShowBulkBar(true);
        }, 3200),
      );
      t.push(
        setTimeout(() => {
          setAllChecked(false);
          setShowBulkBar(false);
        }, 4000),
      );
    }

    if (stepIndex === 3) {
      // Close Task demo — select rows, highlight red button, show mini modal
      t.push(
        setTimeout(() => {
          setCheckedRows([1, 2]);
          setShowBulkBar(true);
        }, 400),
      );
      t.push(setTimeout(() => setActiveBulkBtn("close"), 1000));
      t.push(setTimeout(() => setShowCloseModal(true), 1600));
      t.push(setTimeout(() => setShowCloseModal(false), 3800));
      t.push(setTimeout(() => setActiveBulkBtn(null), 4000));
      t.push(
        setTimeout(() => {
          setCheckedRows([]);
          setShowBulkBar(false);
        }, 4200),
      );
    }

    if (stepIndex === 4) {
      // Endorse Selected Applications demo
      t.push(
        setTimeout(() => {
          setCheckedRows([1]);
          setShowBulkBar(true);
        }, 400),
      );
      t.push(setTimeout(() => setActiveBulkBtn("endorse"), 1000));
      t.push(setTimeout(() => setShowEndorseModal(true), 1600));
      t.push(setTimeout(() => setShowEndorseModal(false), 3800));
      t.push(setTimeout(() => setActiveBulkBtn(null), 4000));
      t.push(
        setTimeout(() => {
          setCheckedRows([]);
          setShowBulkBar(false);
        }, 4200),
      );
    }

    if (stepIndex === 5) {
      // View Details via menu
      t.push(setTimeout(() => setHoveredRow(2), 400));
      t.push(setTimeout(() => setMenuOpen(2), 900));
      t.push(setTimeout(() => setShowDetailsPanel(true), 1600));
      t.push(setTimeout(() => setShowDetailsPanel(false), 3600));
      t.push(setTimeout(() => setMenuOpen(null), 3800));
      t.push(setTimeout(() => setHoveredRow(null), 4000));
    }

    if (stepIndex === 6) {
      t.push(setTimeout(() => setHoveredRow(2), 400));
      t.push(setTimeout(() => setMenuOpen(2), 900));
      t.push(setTimeout(() => setMenuOpen(null), 2400));
      t.push(setTimeout(() => setHoveredRow(null), 2600));
      t.push(setTimeout(() => setHoveredRow(3), 3100));
      t.push(setTimeout(() => setMenuOpen(3), 3600));
      t.push(setTimeout(() => setMenuOpen(null), 5000));
    }

    if (stepIndex === 7) {
      t.push(setTimeout(() => setSortAsc(false), 600));
      t.push(setTimeout(() => setSortAsc(true), 1500));
      t.push(setTimeout(() => setSortAsc(false), 2400));
      t.push(setTimeout(() => setSortAsc(true), 3300));
    }

    return () => t.forEach(clearTimeout);
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
      {/* Bulk action bar */}
      <div
        style={{
          height: showBulkBar ? 36 : 0,
          overflow: "hidden",
          transition: "height 0.3s ease",
          background: "linear-gradient(90deg,#7c3aed15,#6d28d910)",
          borderBottom: "1px solid rgba(124,58,237,0.15)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 10px",
        }}
      >
        <span style={{ fontSize: 10, color: "#7c3aed", fontWeight: 700 }}>
          ✔ {allChecked ? 3 : checkedRows.length} selected
        </span>
        {[
          { key: "transmittal", label: "Generate Transmittal", bg: "#1976d2" },
          {
            key: "endorse",
            label: "Endorse Selected Applications",
            bg: activeBulkBtn === "endorse" ? "#6d28d9" : "#7c3aed",
          },
          {
            key: "close",
            label: "🔒 Close Task (Final)",
            bg: activeBulkBtn === "close" ? "#b91c1c" : "#dc2626",
          },
        ].map(({ key, label, bg }) => (
          <span
            key={key}
            style={{
              background: bg,
              color: "#fff",
              borderRadius: 5,
              padding: "2px 7px",
              fontSize: 9,
              fontWeight: 700,
              transform: activeBulkBtn === key ? "scale(1.07)" : "scale(1)",
              boxShadow: activeBulkBtn === key ? `0 0 0 2px ${bg}60` : "none",
              transition: "all 0.2s",
            }}
          >
            {label}
          </span>
        ))}
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
            style={{
              color: stepIndex === 7 && label === "DTN" ? "#7c3aed" : "#6b7280",
              fontWeight: 700,
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              cursor: key ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              gap: 3,
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
                    color: stepIndex === 7 && !sortAsc ? "#7c3aed" : "#d1d5db",
                  }}
                >
                  ▲
                </span>
                <span
                  style={{
                    fontSize: 7,
                    color: stepIndex === 7 && sortAsc ? "#7c3aed" : "#d1d5db",
                  }}
                >
                  ▼
                </span>
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Rows */}
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
                ⋮
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
                    {
                      icon: "👁️",
                      label: "View Details",
                      highlight: stepIndex === 5,
                    },
                    { icon: "🗂️", label: "Application Logs", highlight: false },
                    { icon: "🕓", label: "Change Log", highlight: false },
                    { icon: "📋", label: "Doctrack Details", highlight: false },
                  ].map((item, i) => (
                    <div
                      key={item.label}
                      style={{
                        padding: "10px 14px",
                        fontSize: 12,
                        color: item.highlight ? "#7c3aed" : "#374151",
                        borderBottom:
                          i < 3 ? "1px solid rgba(0,0,0,0.06)" : "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontWeight: item.highlight ? 700 : 500,
                        background: item.highlight
                          ? "rgba(124,58,237,0.06)"
                          : "transparent",
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

      {/* Close Task mini modal overlay */}
      {showCloseModal && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "dropIn 0.2s ease",
            borderRadius: 10,
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "2px solid #dc2626",
              borderRadius: 10,
              overflow: "hidden",
              width: 220,
              boxShadow: "0 8px 32px rgba(220,38,38,0.3)",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg,#dc2626,#b91c1c)",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>🔒</span>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 11 }}>
                Close Task (Final)
              </span>
            </div>
            <div style={{ padding: "10px 12px" }}>
              <div
                style={{
                  background: "rgba(220,38,38,0.08)",
                  border: "1px solid rgba(220,38,38,0.3)",
                  borderRadius: 6,
                  padding: "6px 8px",
                  marginBottom: 8,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#dc2626",
                  }}
                >
                  ⚠️ READ BEFORE PROCEEDING
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 9, color: "#6b7280" }}>
                  This permanently closes the task. Cannot be undone.
                </p>
              </div>
              <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 6 }}>
                Reason for closing <span style={{ color: "#ef4444" }}>*</span>
              </div>
              <div
                style={{
                  background: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  borderRadius: 5,
                  padding: "4px 8px",
                  fontSize: 9,
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Task fulfilled
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 7px",
                  background: "rgba(220,38,38,0.06)",
                  border: "1px solid rgba(220,38,38,0.2)",
                  borderRadius: 6,
                  marginBottom: 8,
                }}
              >
                <input
                  type="checkbox"
                  readOnly
                  checked
                  style={{ accentColor: "#dc2626", width: 10, height: 10 }}
                />
                <span style={{ fontSize: 9, color: "#374151" }}>
                  I understand this is permanent
                </span>
              </div>
              <div
                style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}
              >
                <span
                  style={{
                    padding: "3px 10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 5,
                    fontSize: 9,
                    cursor: "pointer",
                    color: "#6b7280",
                  }}
                >
                  Cancel
                </span>
                <span
                  style={{
                    padding: "3px 10px",
                    background: "linear-gradient(135deg,#dc2626,#b91c1c)",
                    borderRadius: 5,
                    fontSize: 9,
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  🔒 Yes, Close
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Endorse mini modal overlay */}
      {showEndorseModal && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "dropIn 0.2s ease",
            borderRadius: 10,
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1.5px solid #7c3aed",
              borderRadius: 10,
              overflow: "hidden",
              width: 210,
              boxShadow: "0 8px 32px rgba(124,58,237,0.25)",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>📋</span>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 11 }}>
                Endorse Selected Applications
              </span>
            </div>
            <div style={{ padding: "10px 12px" }}>
              <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 4 }}>
                Decision
              </div>
              <div
                style={{
                  background: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  borderRadius: 5,
                  padding: "4px 8px",
                  fontSize: 9,
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Endorse to Checker
              </div>
              <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 4 }}>
                Assign to
              </div>
              <div
                style={{
                  background: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  borderRadius: 5,
                  padding: "4px 8px",
                  fontSize: 9,
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                jonna.pepito
              </div>
              <div
                style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}
              >
                <span
                  style={{
                    padding: "3px 10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 5,
                    fontSize: 9,
                    color: "#6b7280",
                  }}
                >
                  Cancel
                </span>
                <span
                  style={{
                    padding: "3px 10px",
                    background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
                    borderRadius: 5,
                    fontSize: 9,
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  ✓ Confirm
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Details panel */}
      {showDetailsPanel && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "dropIn 0.2s ease",
            borderRadius: 10,
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1.5px solid #7c3aed",
              borderRadius: 10,
              overflow: "hidden",
              width: 220,
              boxShadow: "0 8px 32px rgba(124,58,237,0.2)",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg,#7c3aed20,#6d28d910)",
                borderBottom: "1px solid rgba(124,58,237,0.15)",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>👁️</span>
              <span style={{ fontWeight: 700, fontSize: 11, color: "#111" }}>
                View Details
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
                {["Basic Info", "Full Details", "App Logs", "Action"].map(
                  (tab, i) => (
                    <span
                      key={tab}
                      style={{
                        fontSize: 8,
                        padding: "2px 5px",
                        borderRadius: 4,
                        background: i === 3 ? "#7c3aed" : "transparent",
                        color: i === 3 ? "#fff" : "#9ca3af",
                        fontWeight: i === 3 ? 700 : 400,
                      }}
                    >
                      {tab}
                    </span>
                  ),
                )}
              </div>
            </div>
            <div style={{ padding: "10px 12px" }}>
              <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 6 }}>
                DTN:{" "}
                <strong style={{ color: "#7c3aed" }}>20260123135945</strong>
              </div>
              <div
                style={{
                  background: "#f3f4f6",
                  borderRadius: 6,
                  padding: "6px 8px",
                  marginBottom: 6,
                }}
              >
                <div style={{ fontSize: 9, color: "#374151", fontWeight: 600 }}>
                  Decision
                </div>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 4,
                    padding: "3px 7px",
                    marginTop: 3,
                    fontSize: 9,
                    color: "#6b7280",
                  }}
                >
                  Select decision...
                </div>
              </div>
              <div
                style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}
              >
                <span
                  style={{
                    padding: "3px 10px",
                    background: "linear-gradient(135deg,#2196F3,#1976D2)",
                    borderRadius: 5,
                    fontSize: 9,
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  ✓ Complete
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
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
        <Kbd>Generate Transmittal</Kbd> <Kbd>Endorse Selected Applications</Kbd>{" "}
        <Kbd>Close Task (Final)</Kbd>
      </>
    ),
  },
  {
    icon: "🔒",
    color: "#dc2626",
    colorBg: "#FEE2E2",
    label: "Close Task (Final)",
    sublabel: "Permanently close a task",
    desc: (
      <>
        Use the{" "}
        <strong style={{ color: "#dc2626" }}>🔒 Close Task (Final)</strong>{" "}
        button <strong>only</strong> when the task is fully done and no further
        action is needed. This{" "}
        <strong style={{ color: "#dc2626" }}>permanently closes</strong> the
        selected task(s) and cannot be undone. You will need to select a reason
        and confirm before proceeding. If you just want to transfer or endorse
        the task to the next user, use <Kbd>Endorse Selected Applications</Kbd>{" "}
        instead.
      </>
    ),
  },
  {
    icon: "📋",
    color: "#7c3aed",
    colorBg: "#EEEDFE",
    label: "Endorse Selected Applications",
    sublabel: "Forward task to next user",
    desc: (
      <>
        Use the{" "}
        <strong style={{ color: "#7c3aed" }}>
          📋 Endorse Selected Applications
        </strong>{" "}
        purple button to forward or transfer the selected task(s) to the next
        assigned user. Select the decision and the assignee, then confirm. The
        current log will be completed and a new log will be created for the next
        user — the task stays active.
      </>
    ),
  },
  {
    icon: "👁️",
    color: "#2196F3",
    colorBg: "#E3F2FD",
    label: "View Details",
    sublabel: "Process task from Action tab",
    desc: (
      <>
        Click the <Kbd>⋮</Kbd> Actions button on any row, then select{" "}
        <strong>View Details</strong> to open the full record. Navigate to the{" "}
        <strong style={{ color: "#2196F3" }}>Action tab</strong> to process the
        task — select a decision, fill in remarks, assign the next user, and
        submit to complete your step in the workflow.
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
        <strong style={{ color: "#2196F3" }}>blue dot</strong> means the record
        is unread.
      </>
    ),
  },
  {
    icon: "↕️",
    color: "#6b7280",
    colorBg: "#EAF3DE",
    label: "Click column headers",
    sublabel: "Sort data",
    desc: "Click any column header to sort the data. Click again to reverse the order. The current sort indicator is shown in the header bar.",
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

  return (
    <>
      <style>{`
        @keyframes modalIn { from { opacity:0; transform:translateY(16px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes dropIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeSlideIn { from { opacity:0; transform:translateX(10px); } to { opacity:1; transform:translateX(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .guide-step-pill:hover { opacity:1 !important; transform:translateY(-1px); }
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
            maxWidth: 960,
            maxHeight: "95vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
            overflow: "hidden",
            animation: visible ? "modalIn 0.25s ease forwards" : "none",
            opacity: visible ? 1 : 0,
          }}
        >
          {/* Header */}
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

          {/* Body */}
          <div
            style={{
              display: "flex",
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            {/* Left sidebar */}
            <div
              style={{
                width: 220,
                flexShrink: 0,
                borderRight: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                padding: "0.75rem 0.6rem",
                display: "flex",
                flexDirection: "column",
                gap: 3,
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
                      gap: 8,
                      padding: "7px 9px",
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
                        width: 26,
                        height: 26,
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
                          fontSize: 10.5,
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
                          fontSize: 9,
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
              {/* Demo area */}
              <div
                style={{
                  padding: "1rem 1.2rem 0.75rem",
                  borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                  background: darkMode ? "#0f0f11" : "#f8f7ff",
                }}
              >
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

              {/* Description */}
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
                  style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
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

          {/* Footer */}
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
