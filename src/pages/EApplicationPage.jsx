// src/pages/EApplicationPage.jsx
import { useState } from "react";
import { getColorScheme } from "../components/reports/utils.js";

/* ── Static mock data — palitan na lang later ng API call ── */
const MOCK_APPLICATIONS = [
  {
    id: 1,
    referenceNo: "EA-2026-00147",
    activity: "New Application",
    applicantCompany: "Torrent Pharma Philippines Inc",
    applicationStep: "Initial Screening",
    sentBy: "Maria Santos",
    dueDate: "2026-08-28",
    lastModified: "2026-08-24 09:14 AM",
    priority: "High",
  },
  {
    id: 2,
    referenceNo: "EA-2026-00148",
    activity: "Renewal",
    applicantCompany: "Unilab Inc.",
    applicationStep: "Document Verification",
    sentBy: "Juan Dela Cruz",
    dueDate: "2026-08-30",
    lastModified: "2026-08-23 04:52 PM",
    priority: "Medium",
  },
  {
    id: 3,
    referenceNo: "EA-2026-00149",
    activity: "Amendment",
    applicantCompany: "Pascual Laboratories",
    applicationStep: "Awaiting Assignment",
    sentBy: "Ana Reyes",
    dueDate: "2026-09-02",
    lastModified: "2026-08-22 11:30 AM",
    priority: "Low",
  },
  {
    id: 4,
    referenceNo: "EA-2026-00150",
    activity: "Variation",
    applicantCompany: "Zuellig Pharma Corp",
    applicationStep: "Technical Review",
    sentBy: "Carlos Mendoza",
    dueDate: "2026-08-26",
    lastModified: "2026-08-24 01:05 PM",
    priority: "High",
  },
  {
    id: 5,
    referenceNo: "EA-2026-00151",
    activity: "New Application",
    applicantCompany: "Metro Drug Distribution Inc",
    applicationStep: "Initial Screening",
    sentBy: "Maria Santos",
    dueDate: "2026-09-05",
    lastModified: "2026-08-21 03:40 PM",
    priority: "Low",
  },
];

/* ── Priority badge ── */
function renderPriorityBadge(priority) {
  const map = {
    High: {
      bg: "linear-gradient(135deg,#ef4444,#dc2626)",
      sh: "rgba(239,68,68,0.3)",
      icon: "🔴",
    },
    Medium: {
      bg: "linear-gradient(135deg,#f59e0b,#d97706)",
      sh: "rgba(245,158,11,0.3)",
      icon: "🟠",
    },
    Low: {
      bg: "linear-gradient(135deg,#10b981,#059669)",
      sh: "rgba(16,185,129,0.3)",
      icon: "🟢",
    },
  };
  const c = map[priority] || {
    bg: "linear-gradient(135deg,#6b7280,#4b5563)",
    sh: "rgba(107,114,128,0.3)",
    icon: "•",
  };
  return (
    <span
      style={{
        padding: "0.3rem 0.7rem",
        background: c.bg,
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.55rem",
        fontWeight: "700",
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        boxShadow: `0 2px 8px ${c.sh}`,
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        whiteSpace: "nowrap",
      }}
    >
      <span>{c.icon}</span>
      {priority}
    </span>
  );
}

/* ── Application Step badge ── */
function renderStepBadge(step) {
  return (
    <span
      style={{
        padding: "0.25rem 0.6rem",
        background: "linear-gradient(135deg,#2196F3,#1976D2)",
        color: "#fff",
        borderRadius: "6px",
        fontSize: "0.55rem",
        fontWeight: "600",
        display: "inline-flex",
        alignItems: "center",
        whiteSpace: "nowrap",
        boxShadow: "0 2px 6px rgba(33,150,243,0.3)",
      }}
    >
      {step}
    </span>
  );
}

/* ── Reference Number chip ── */
function renderRefNo(refNo) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.3rem 0.7rem",
        background: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.55rem",
        fontWeight: "700",
        letterSpacing: "0.5px",
        boxShadow: "0 2px 8px rgba(8,8,8,0.3)",
        whiteSpace: "nowrap",
      }}
    >
      {refNo}
    </span>
  );
}

function EApplicationPage({ darkMode }) {
  const colors = getColorScheme(darkMode);
  const [activeTab, setActiveTab] = useState("inbox");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 20 });

  const data = MOCK_APPLICATIONS;

  const handleMenuToggle = (e, rowId) => {
    e.stopPropagation();
    if (openMenuId === rowId) {
      setOpenMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownHeight = 160;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow < dropdownHeight
        ? rect.bottom - dropdownHeight
        : rect.bottom + 4;
    const right = window.innerWidth - rect.right;
    setMenuPosition({ top, right });
    setOpenMenuId(rowId);
  };

  const ACTION_MENU_OPTIONS = [
    {
      label: "Uploaded Documents",
      icon: "📁",
      handler: (row) => console.log("Uploaded Documents", row),
    },
    {
      label: "Generated Documents",
      icon: "📄",
      handler: (row) => console.log("Generated Documents", row),
    },
    {
      label: "View Details",
      icon: "👁️",
      handler: (row) => console.log("View Details", row),
    },
  ];

  const thStyle = {
    padding: "0.45rem 0.6rem",
    textAlign: "left",
    fontSize: "0.55rem",
    fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: `1px solid ${colors.tableBorder}`,
    whiteSpace: "nowrap",
    background: colors.tableBg,
  };

  const tdStyle = {
    padding: "0.55rem 0.6rem",
    fontSize: "0.68rem",
    color: colors.tableText,
    borderBottom: `1px solid ${colors.tableBorder}`,
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: colors.pageBg,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: "0.85rem 1.5rem 0",
          borderBottom: `1px solid ${colors.cardBorder}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.1rem" }}>📥</span>
          <h1
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: colors.textPrimary,
              margin: 0,
            }}
          >
            eApplication
          </h1>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            marginTop: "0.5rem",
            borderBottom: `2px solid ${colors.cardBorder}`,
          }}
        >
          {[
            { id: "inbox", label: "Inbox", icon: "📥", count: data.length },
            { id: "in-progress", label: "In Progress", icon: "⏳", count: 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === tab.id
                    ? "2px solid #4CAF50"
                    : "2px solid transparent",
                color:
                  activeTab === tab.id
                    ? colors.textPrimary
                    : colors.textTertiary,
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                position: "relative",
                top: "1px",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
            >
              <span style={{ fontSize: "0.82rem" }}>{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "999px",
                  background: activeTab === tab.id ? "#4CAF50" : colors.badgeBg,
                  color: activeTab === tab.id ? "#fff" : colors.textTertiary,
                  border: `0.5px solid ${activeTab === tab.id ? "#4CAF50" : colors.cardBorder}`,
                  fontWeight: 600,
                  minWidth: "20px",
                  textAlign: "center",
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: "hidden", padding: "0.85rem 1.5rem" }}>
        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          {/* Table header bar */}
          <div
            style={{
              padding: "0.75rem 1.25rem",
              borderBottom: `1px solid ${colors.tableBorder}`,
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexShrink: 0,
            }}
          >
            <h3
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: colors.textPrimary,
                margin: 0,
              }}
            >
              Received Applications
            </h3>
            <span
              style={{
                padding: "0.2rem 0.6rem",
                background: colors.badgeBg,
                borderRadius: "12px",
                fontSize: "0.68rem",
                color: colors.textTertiary,
                fontWeight: "600",
              }}
            >
              {data.length} total
            </span>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  background: colors.tableBg,
                  zIndex: 5,
                }}
              >
                <tr>
                  <th
                    style={{ ...thStyle, textAlign: "center", width: "50px" }}
                  >
                    #
                  </th>
                  <th style={thStyle}>Reference Number</th>
                  <th style={thStyle}>Activity</th>
                  <th style={thStyle}>Applicant Company</th>
                  <th style={thStyle}>Application Step</th>
                  <th style={thStyle}>Sent By</th>
                  <th style={thStyle}>Due Date</th>
                  <th style={thStyle}>Last Modified</th>
                  <th style={thStyle}>Priority</th>
                  <th
                    style={{ ...thStyle, textAlign: "center", width: "80px" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: colors.textTertiary,
                        fontSize: "0.75rem",
                      }}
                    >
                      No applications found.
                    </td>
                  </tr>
                ) : (
                  data.map((row, index) => (
                    <tr
                      key={row.id}
                      style={{
                        background:
                          index % 2 === 0
                            ? colors.tableRowEven
                            : colors.tableRowOdd,
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          colors.tableRowHover)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          index % 2 === 0
                            ? colors.tableRowEven
                            : colors.tableRowOdd)
                      }
                    >
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "center",
                          fontWeight: 700,
                          color: colors.textTertiary,
                        }}
                      >
                        {index + 1}
                      </td>
                      <td style={tdStyle}>{renderRefNo(row.referenceNo)}</td>
                      <td style={tdStyle}>{row.activity}</td>
                      <td style={tdStyle}>{row.applicantCompany}</td>
                      <td style={tdStyle}>
                        {renderStepBadge(row.applicationStep)}
                      </td>
                      <td style={tdStyle}>{row.sentBy}</td>
                      <td style={tdStyle}>{row.dueDate}</td>
                      <td style={tdStyle}>{row.lastModified}</td>
                      <td style={tdStyle}>
                        {renderPriorityBadge(row.priority)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <div
                          style={{
                            position: "relative",
                            display: "inline-block",
                          }}
                        >
                          <button
                            onClick={(e) => handleMenuToggle(e, row.id)}
                            style={{
                              padding: "0.4rem",
                              background: "transparent",
                              border: `1px solid ${colors.cardBorder}`,
                              borderRadius: "6px",
                              color: colors.textPrimary,
                              cursor: "pointer",
                              width: "28px",
                              height: "28px",
                            }}
                          >
                            ⋮
                          </button>

                          {openMenuId === row.id && (
                            <>
                              <div
                                onClick={() => setOpenMenuId(null)}
                                style={{
                                  position: "fixed",
                                  inset: 0,
                                  zIndex: 9998,
                                }}
                              />
                              <div
                                style={{
                                  position: "fixed",
                                  top: `${menuPosition.top}px`,
                                  right: `${menuPosition.right}px`,
                                  background: colors.cardBg,
                                  border: `1px solid ${colors.cardBorder}`,
                                  borderRadius: "8px",
                                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                                  minWidth: "190px",
                                  zIndex: 9999,
                                  overflow: "hidden",
                                }}
                              >
                                {ACTION_MENU_OPTIONS.map((item, i) => (
                                  <button
                                    key={item.label}
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      item.handler(row);
                                    }}
                                    style={{
                                      width: "100%",
                                      padding: "0.6rem 0.85rem",
                                      background: "transparent",
                                      border: "none",
                                      borderTop:
                                        i === 0
                                          ? "none"
                                          : `1px solid ${colors.tableBorder}`,
                                      color: colors.textPrimary,
                                      fontSize: "0.78rem",
                                      textAlign: "left",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.background =
                                        colors.tableRowHover)
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.background =
                                        "transparent")
                                    }
                                  >
                                    <span>{item.icon}</span>
                                    <span>{item.label}</span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EApplicationPage;
