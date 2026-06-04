// FILE: src/pages/MonitoringPage.jsx
import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { startImpersonation, stopImpersonation } from "../api/auth";

// ── Child Views ───────────────────────────────────────────────────────────────
import OverviewView from "../components/monitoring/overview/OverviewView";
import RecordsView from "../components/monitoring/records/RecordsView";
import AnalyticsView from "../components/monitoring/analytics/AnalyticsView";
import DeadlinesView from "../components/monitoring/deadlines/DeadlinesView";
import ComplianceView from "../components/monitoring/compliance/ComplianceView";
import WorkloadView from "../components/monitoring/workload/WorkloadView";
import ActivityFeedView from "../components/monitoring/activityFeed/ActivityFeedView";
import UsersView from "../components/monitoring/users/UsersView";
import FRPTatView from "../components/monitoring/frpTat/FRPTatView";
// ── Shared modals (kept in parent since they span multiple views) ─────────────
// ChartDetailModal, ReassignModal, EvaluatorDetailModal remain here.

const FB = "#1877F2";

function makeUI(dark) {
  return dark
    ? {
        pageBg: "#18191a",
        sidebarBg: "#141414",
        cardBg: "#242526",
        cardBorder: "#3a3b3c",
        inputBg: "#3a3b3c",
        textPrimary: "#e4e6ea",
        textSub: "#b0b3b8",
        textMuted: "#65676b",
        divider: "#3a3b3c",
        hoverBg: "#2d2e2f",
        activeNavBg: "#263951",
        gridLine: "#2d2e2f",
        progressBg: "#3a3b3c",
        metricBorder: "#3a3b3c",
      }
    : {
        pageBg: "#f0f2f5",
        sidebarBg: "#ffffff",
        cardBg: "#ffffff",
        cardBorder: "#dddfe2",
        inputBg: "#f0f2f5",
        textPrimary: "#1c1e21",
        textSub: "#65676b",
        textMuted: "#8a8d91",
        divider: "#e4e6eb",
        hoverBg: "#f2f3f5",
        activeNavBg: "#E7F0FD",
        gridLine: "#e4e6eb",
        progressBg: "#e4e6eb",
        metricBorder: "#dddfe2",
      };
}

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
const statusColorsDark = {
  Approved: { bg: "#0a2e1a", color: "#4ade80" },
  Disapproved: { bg: "#2e0a0a", color: "#f87171" },
  "On Process": { bg: "#2a2000", color: "#fde68a" },
};
const timelineColorsDark = {
  Within: { bg: "#0a2e1a", color: "#4ade80" },
  Beyond: { bg: "#2e0a0a", color: "#f87171" },
};
const statusColors = {
  Approved: { bg: "#dcfce7", color: "#15803d" },
  Disapproved: { bg: "#fef2f2", color: "#b91c1c" },
  "On Process": { bg: "#fef9c3", color: "#a16207" },
};
const timelineColors = {
  Within: { bg: "#dcfce7", color: "#15803d" },
  Beyond: { bg: "#fef2f2", color: "#b91c1c" },
};
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
function rxShortLabel(p) {
  return p === "Over-the-Counter (OTC)"
    ? "OTC"
    : p === "Prescription Drug (RX)"
      ? "RX"
      : "Vaccine";
}

function ChartDetailModal({ title, subtitle, rows, darkMode, onClose, ui }) {
  const [search, setSearch] = useState("");
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const colHdr = darkMode ? ui.sidebarBg : "#f8f9fd";
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.dtn.toLowerCase().includes(q) ||
        r.evaluator.toLowerCase().includes(q) ||
        (r.drugName || "").toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.prescription.toLowerCase().includes(q) ||
        r.appStep.toLowerCase().includes(q),
    );
  }, [rows, search]);
  const SC = darkMode ? statusColorsDark : statusColors;
  const RXC = darkMode ? rxColorsDark : rxColors;
  const SPC = darkMode ? stepColorsDark : stepColors;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 14,
          overflow: "hidden",
          width: 1000,
          maxWidth: "96vw",
          boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "82vh",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: `1px solid ${ui.divider}`,
            background: colHdr,
            flexShrink: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.66rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: ui.textMuted,
                fontWeight: 700,
              }}
            >
              Chart Details
            </p>
            <h3
              style={{
                margin: "2px 0 0",
                fontSize: "1.05rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "0.74rem",
                  color: ui.textMuted,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: ui.inputBg,
                border: `1px solid ${ui.cardBorder}`,
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: "0.8rem",
                color: ui.textPrimary,
                outline: "none",
                width: 200,
                colorScheme: darkMode ? "dark" : "light",
                fontFamily: font,
              }}
            />
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: `1px solid ${ui.cardBorder}`,
                borderRadius: 6,
                color: ui.textMuted,
                cursor: "pointer",
                width: 30,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
        </div>
        <div style={{ overflowY: "auto", overflowX: "auto", flex: 1 }}>
          <div style={{ minWidth: 880 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1.3fr 2.2fr 0.9fr 1.1fr 0.9fr",
                background: colHdr,
                borderBottom: `1px solid ${ui.divider}`,
                position: "sticky",
                top: 0,
                zIndex: 2,
              }}
            >
              {[
                "DTN",
                "User",
                "Drug / Application",
                "Prescription",
                "App Step",
                "Status",
              ].map((col) => (
                <span
                  key={col}
                  style={{
                    fontSize: "0.67rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: ui.textMuted,
                    padding: "9px 14px",
                    textAlign: "center",
                  }}
                >
                  {col}
                </span>
              ))}
            </div>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: ui.textMuted,
                  fontSize: "0.84rem",
                }}
              >
                No records found
              </div>
            ) : (
              filtered.map((row, i) => {
                const sc = SC[row.status] || {
                  bg: "#f3f4f6",
                  color: "#374151",
                };
                const rxc = RXC[row.prescription] || {
                  bg: "#f3f4f6",
                  color: "#374151",
                };
                const spc = SPC[row.appStep] || {
                  bg: "#f3f4f6",
                  color: "#374151",
                };
                const userRole = row.role || "User";
                return (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "1.4fr 1.3fr 2.2fr 0.9fr 1.1fr 0.9fr",
                      borderBottom:
                        i < filtered.length - 1
                          ? `1px solid ${ui.divider}`
                          : "none",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = ui.hoverBg)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <span
                      style={{
                        padding: "9px 14px",
                        fontSize: "0.72rem",
                        color: FB,
                        textAlign: "center",
                        fontWeight: 700,
                        alignSelf: "center",
                        fontFamily: "monospace",
                      }}
                    >
                      {row.dtn}
                    </span>
                    <span
                      style={{
                        padding: "9px 14px",
                        fontSize: "0.8rem",
                        color: ui.textPrimary,
                        textAlign: "center",
                        fontWeight: 500,
                        alignSelf: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background:
                            avatarPalette[
                              uniqueEvaluators.indexOf(row.evaluator) %
                                avatarPalette.length
                            ].color,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div>{row.evaluator}</div>
                        <div
                          style={{ fontSize: "0.65rem", color: ui.textMuted }}
                        >
                          {userRole}
                        </div>
                      </div>
                    </span>
                    <span
                      style={{
                        padding: "9px 14px",
                        fontSize: "0.77rem",
                        color: ui.textSub,
                        alignSelf: "center",
                      }}
                    >
                      {row.drugName || "—"}
                    </span>
                    <span
                      style={{
                        padding: "9px 14px",
                        textAlign: "center",
                        alignSelf: "center",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: 99,
                          background: rxc.bg,
                          color: rxc.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {rxShortLabel(row.prescription)}
                      </span>
                    </span>
                    <span
                      style={{
                        padding: "9px 14px",
                        textAlign: "center",
                        alignSelf: "center",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: 99,
                          background: spc.bg,
                          color: spc.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.appStep}
                      </span>
                    </span>
                    <span
                      style={{
                        padding: "9px 14px",
                        textAlign: "center",
                        alignSelf: "center",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: 99,
                          background: sc.bg,
                          color: sc.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.status}
                      </span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div
          style={{
            padding: "9px 20px",
            borderTop: `1px solid ${ui.divider}`,
            background: colHdr,
            flexShrink: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "0.74rem", color: ui.textMuted }}>
            {filtered.length !== rows.length
              ? `${filtered.length} of ${rows.length} records`
              : `${rows.length} record${rows.length !== 1 ? "s" : ""}`}
          </span>
          <button
            onClick={onClose}
            style={{
              padding: "5px 14px",
              fontSize: "0.8rem",
              fontWeight: 500,
              borderRadius: 6,
              border: `1px solid ${ui.cardBorder}`,
              background: "transparent",
              color: ui.textMuted,
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionMenu({ task, darkMode, onReassign, ui }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        style={{
          background: "transparent",
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 6,
          color: ui.textMuted,
          cursor: "pointer",
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1rem",
          letterSpacing: 1,
          lineHeight: 1,
        }}
      >
        ···
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: 32,
            right: 0,
            background: ui.cardBg,
            border: `1px solid ${ui.cardBorder}`,
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            zIndex: 10,
            minWidth: 140,
            overflow: "hidden",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onReassign(task);
            }}
            style={{
              width: "100%",
              padding: "8px 14px",
              background: "transparent",
              border: "none",
              textAlign: "left",
              fontSize: "0.82rem",
              color: ui.textPrimary,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: font,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = ui.hoverBg)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span>🔄</span> Re-assign
          </button>
        </div>
      )}
    </div>
  );
}

function ReassignModal({ task, evaluators, darkMode, onClose, onConfirm, ui }) {
  const [selected, setSelected] = useState("");
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const colHdr = darkMode ? ui.sidebarBg : "#f8f9fd";
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 12,
          overflow: "hidden",
          width: 380,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: `1px solid ${ui.divider}`,
            background: colHdr,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: ui.textMuted,
                fontWeight: 600,
              }}
            >
              Re-assign Task
            </p>
            <h3
              style={{
                margin: 0,
                fontSize: "0.84rem",
                fontWeight: 700,
                color: FB,
                fontFamily: "monospace",
              }}
            >
              {task.dtn}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 6,
              color: ui.textMuted,
              cursor: "pointer",
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: "20px" }}>
          <p
            style={{
              margin: "0 0 4px",
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: ui.textMuted,
            }}
          >
            Drug Application
          </p>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "0.8rem",
              color: ui.textSub,
            }}
          >
            {task.drugName}
          </p>
          <p
            style={{
              margin: "0 0 4px",
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: ui.textMuted,
            }}
          >
            Current User
          </p>
          <p
            style={{
              margin: "0 0 16px",
              fontSize: "0.88rem",
              color: ui.textPrimary,
              fontWeight: 500,
            }}
          >
            {task.evaluator}{" "}
            <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
              ({task.role || "User"})
            </span>
          </p>
          <label
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: ui.textMuted,
              display: "block",
              marginBottom: 4,
            }}
          >
            Assign To
          </label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{
              width: "100%",
              background: ui.inputBg,
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 6,
              padding: "7px 10px",
              fontSize: "0.84rem",
              color: ui.textPrimary,
              outline: "none",
              colorScheme: darkMode ? "dark" : "light",
              fontFamily: font,
            }}
          >
            <option value="">— Select User —</option>
            {evaluators
              .filter((ev) => ev !== task.evaluator)
              .map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
          </select>
        </div>
        <div
          style={{
            padding: "12px 20px",
            borderTop: `1px solid ${ui.divider}`,
            background: colHdr,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "6px 14px",
              fontSize: "0.82rem",
              borderRadius: 6,
              border: `1px solid ${ui.cardBorder}`,
              background: "transparent",
              color: ui.textMuted,
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onConfirm(task, selected)}
            disabled={!selected}
            style={{
              padding: "6px 16px",
              fontSize: "0.82rem",
              fontWeight: 700,
              borderRadius: 6,
              border: "none",
              background: selected ? FB : ui.inputBg,
              color: selected ? "#fff" : ui.textMuted,
              cursor: selected ? "pointer" : "not-allowed",
              transition: "all 0.15s",
              fontFamily: font,
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  label,
  subtitle,
  active,
  onClick,
  ui,
  comingSoon,
  darkMode,
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={comingSoon ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "7px 10px 7px 12px",
        borderRadius: "0 6px 6px 0",
        borderLeft: `3px solid ${active ? (darkMode ? "#6d94ff" : "#6d94ff") : "transparent"}`,
        background: active
          ? darkMode
            ? "#2b2b2b"
            : "#f1f1f1"
          : hov
            ? ui.hoverBg
            : "transparent",
        cursor: comingSoon ? "default" : "pointer",
        opacity: comingSoon ? 0.4 : 1,
        transition: "all 0.12s",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        margin: "1px 6px 1px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "0.8rem",
            fontWeight: active ? 600 : 400,
            color: active
              ? darkMode
                ? "#d8d8d8"
                : "#3d3d3d"
              : hov
                ? ui.textPrimary
                : ui.textSub,
            lineHeight: 1.2,
            transition: "color 0.12s",
          }}
        >
          {label}
        </span>
        {comingSoon && (
          <span
            style={{
              fontSize: "0.58rem",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 3,
              background: "#f3e8ff",
              color: "#7e22ce",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Soon
          </span>
        )}
      </div>
      {!comingSoon && subtitle && (
        <span
          style={{
            fontSize: "0.67rem",
            color: active
              ? darkMode
                ? "rgb(255, 245, 202)"
                : "#2e2e2e"
              : ui.textMuted,
            lineHeight: 1.2,
            transition: "color 0.12s",
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}

function ComingSoonView({ label, ui }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 340,
        gap: 14,
        color: ui.textMuted,
        userSelect: "none",
      }}
    >
      <span style={{ fontSize: "2.8rem" }}>🚧</span>
      <p
        style={{
          margin: 0,
          fontSize: "1rem",
          fontWeight: 700,
          color: ui.textPrimary,
        }}
      >
        {label}
      </p>
      <p style={{ margin: 0, fontSize: "0.82rem" }}>
        This section is coming soon.
      </p>
    </div>
  );
}

function renderContent(
  activeNav,
  {
    ui,
    darkMode,
    sharedProps,
    navItems,
    chartYear,
    setChartYear,
    chartMonth,
    setChartMonth,
    rxFilter,
    setRxFilter,
    handleSliceClick,
    activitySearch,
    setActivitySearch,
    userDatabase,
    impersonating,
    setImpersonating,
    setShowImpersonateConfirm,
    tableData,
    setModalEval,
    setActiveNav,
  },
) {
  const COMING_SOON = ["deadlines", "compliance", "workload"];
  if (COMING_SOON.includes(activeNav)) {
    const found = navItems.find((n) => n.key === activeNav);
    return <ComingSoonView label={found?.label ?? activeNav} ui={ui} />;
  }
  switch (activeNav) {
    case "overview":
      return (
        <OverviewView
          {...sharedProps}
          setActiveNav={setActiveNav}
          setModalEval={setModalEval}
          userDatabase={userDatabase}
        />
      );
    case "records":
      return <RecordsView {...sharedProps} setModalEval={setModalEval} />;
    case "analytics":
      return (
        <AnalyticsView
          ui={ui}
          darkMode={darkMode}
          chartYear={chartYear}
          setChartYear={setChartYear}
          chartMonth={chartMonth}
          setChartMonth={setChartMonth}
          rxFilter={rxFilter}
          setRxFilter={setRxFilter}
          onSliceClick={handleSliceClick}
        />
      );
    case "activity":
      return (
        <ActivityFeedView
          ui={ui}
          darkMode={darkMode}
          activitySearch={activitySearch}
          setActivitySearch={setActivitySearch}
        />
      );
    case "users":
      return (
        <UsersView
          ui={ui}
          darkMode={darkMode}
          userDatabase={userDatabase}
          impersonating={impersonating}
          setImpersonating={setImpersonating}
          setShowImpersonateConfirm={setShowImpersonateConfirm}
          tableData={tableData}
        />
      );
    case "frptat":
      return <FRPTatView ui={ui} darkMode={darkMode} />;
    default:
      return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MonitoringPage
// ══════════════════════════════════════════════════════════════════════════════
function MonitoringPage({ darkMode }) {
  const location = useLocation();
  const ui = makeUI(darkMode);
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const navigate = useNavigate();

  const navItems = [
    { key: "overview", label: "Overview", subtitle: "Summary of all activity" },
    { key: "records", label: "Records", subtitle: "Browse all applications" },
    { key: "analytics", label: "Analytics", subtitle: "Charts & breakdowns" },
    { key: "deadlines", label: "Deadlines", comingSoon: true },
    { key: "compliance", label: "Compliance", comingSoon: true },
    { key: "workload", label: "Workload", comingSoon: true },
    { key: "activity", label: "Activity Feed", subtitle: "Live event stream" },
    { key: "users", label: "Users", subtitle: "Manage evaluators" },
    { key: "frptat", label: "FRP TAT", subtitle: "Turnaround tracking" },
  ];

  const [activeNav, setActiveNav] = useState(location.state?.tab ?? "overview");
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // ── Shared state passed to children ────────────────────────────────────────
  const [tableData, setTableData] = useState([]);
  const [chartYear, setChartYear] = useState("All");
  const [chartMonth, setChartMonth] = useState("All");
  const [rxFilter, setRxFilter] = useState("All");
  const [activitySearch, setActivitySearch] = useState("");
  const [modalEval, setModalEval] = useState(null);
  const [chartModal, setChartModal] = useState(null);
  const [reassignTask, setReassignTask] = useState(null);
  const [impersonating, setImpersonating] = useState(null);
  const [showImpersonateConfirm, setShowImpersonateConfirm] = useState(null);

  const [userDatabase, setUserDatabase] = useState([]);

  // useEffect(() => {
  //   getAllUsers()
  //     .then((users) => {
  //       if (users && users.length > 0) setUserDatabase(users);
  //     })
  //     .catch(() => {});
  // }, []);

  // Modal sub-state
  const [modalDateFrom, setModalDateFrom] = useState("");
  const [modalDateTo, setModalDateTo] = useState("");
  const [modalSortCol, setModalSortCol] = useState("date");
  const [modalSortDir, setModalSortDir] = useState("asc");
  const [modalStatusTab, setModalStatusTab] = useState("All");
  const colHdr = darkMode ? ui.sidebarBg : "#f8f9fd";

  const chartFiltered = useMemo(
    () =>
      tableData.filter((row) => {
        const d = new Date(row.date + "T00:00:00");
        if (chartYear !== "All" && d.getFullYear() !== Number(chartYear))
          return false;
        if (chartMonth !== "All" && d.getMonth() !== Number(chartMonth))
          return false;
        if (rxFilter !== "All" && row.prescription !== rxFilter) return false;
        return true;
      }),
    [tableData, chartYear, chartMonth, rxFilter],
  );
  const currentEvaluators = useMemo(
    () => [...new Set(tableData.map((d) => d.evaluator))],
    [tableData],
  );

  const uniqueEvaluators = useMemo(
    () => [...new Set(tableData.map((d) => d.evaluator))],
    [tableData],
  );

  const handleReassignConfirm = (task, newEval) => {
    setTableData((prev) =>
      prev.map((r) => (r.dtn === task.dtn ? { ...r, evaluator: newEval } : r)),
    );
    setReassignTask(null);
  };
  const handleSliceClick = (statusName) => {
    setChartModal({
      title: statusName,
      subtitle: rxFilter !== "All" ? `Prescription: ${rxFilter}` : undefined,
      rows: chartFiltered.filter((r) => r.status === statusName),
    });
  };

  const allModalTasks = modalEval
    ? tableData.filter((d) => d.evaluator === modalEval)
    : [];
  const modalTasks = useMemo(() => {
    const f = allModalTasks.filter((t) => {
      const d = new Date(t.date + "T00:00:00");
      if (modalDateFrom && d < new Date(modalDateFrom)) return false;
      if (modalDateTo && d > new Date(modalDateTo)) return false;
      if (modalStatusTab !== "All" && t.status !== modalStatusTab) return false;
      return true;
    });
    return [...f].sort((a, b) => {
      let av = a[modalSortCol],
        bv = b[modalSortCol];
      if (modalSortCol === "date") {
        av = new Date(av + "T00:00:00");
        bv = new Date(bv + "T00:00:00");
      } else {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }
      return av < bv
        ? modalSortDir === "asc"
          ? -1
          : 1
        : av > bv
          ? modalSortDir === "asc"
            ? 1
            : -1
          : 0;
    });
  }, [
    allModalTasks,
    modalDateFrom,
    modalDateTo,
    modalSortCol,
    modalSortDir,
    modalStatusTab,
  ]);

  const handleModalClose = () => {
    setModalEval(null);
    setModalDateFrom("");
    setModalDateTo("");
    setModalSortCol("date");
    setModalSortDir("asc");
    setModalStatusTab("All");
  };
  const toggleModalSort = (col) => {
    if (modalSortCol === col)
      setModalSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setModalSortCol(col);
      setModalSortDir("asc");
    }
  };
  const SortArrow = ({ col }) => {
    const active = modalSortCol === col;
    return (
      <span
        style={{
          marginLeft: 3,
          fontSize: "0.62rem",
          opacity: active ? 1 : 0.3,
          color: FB,
        }}
      >
        {active ? (modalSortDir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    );
  };

  const handleStopImpersonation = () => {
    setImpersonating(null);
    stopImpersonation();
  };

  const sharedProps = {
    ui,
    darkMode,
    tableData,
    uniqueEvaluators,
    chartFiltered,
    currentEvaluators,
  };

  return (
    <>
      <style>{`.mon-scroll::-webkit-scrollbar{width:7px}.mon-scroll::-webkit-scrollbar-track{background:transparent}.mon-scroll::-webkit-scrollbar-thumb{background:#3a3b3c;border-radius:99px}.mon-scroll::-webkit-scrollbar-thumb:hover{background:#555}.mon-scroll{scrollbar-width:thin;scrollbar-color:#3a3b3c transparent}`}</style>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          fontFamily: font,
        }}
      >
        <div
          className="mon-scroll"
          style={{
            display: "flex",
            flex: "1 1 0",
            minHeight: 0,
            overflowY: "scroll",
            overflowX: "hidden",
          }}
        >
          {!isMobile && (
            <div
              style={{
                flexShrink: 0,
                width: 190,
                position: "sticky",
                top: 0,
                alignSelf: "stretch",
                maxHeight: "100vh",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: "100%",
                  background: ui.sidebarBg,
                  borderRight: `1px solid ${ui.cardBorder}`,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ padding: "20px 6px 10px 0" }}>
                  <p
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: ui.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      margin: "0 0 6px 14px",
                    }}
                  >
                    Monitoring
                  </p>
                  <div
                    style={{
                      height: "0.5px",
                      background: ui.divider,
                      margin: "0 8px 10px",
                    }}
                  />

                  {/* Core group */}
                  {navItems
                    .slice(0, 3)
                    .map(({ key, comingSoon, icon, ...rest }) => (
                      <NavItem
                        key={key}
                        {...rest}
                        active={activeNav === key}
                        onClick={() => setActiveNav(key)}
                        ui={ui}
                        comingSoon={comingSoon}
                        darkMode={darkMode}
                      />
                    ))}

                  <div
                    style={{
                      height: "0.5px",
                      background: ui.divider,
                      margin: "10px 8px",
                    }}
                  />

                  {/* Tracking group */}
                  <p
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: ui.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      margin: "0 0 6px 14px",
                    }}
                  >
                    Tracking
                  </p>
                  {navItems
                    .slice(3, 6)
                    .map(({ key, comingSoon, icon, ...rest }) => (
                      <NavItem
                        key={key}
                        {...rest}
                        active={activeNav === key}
                        onClick={() => setActiveNav(key)}
                        ui={ui}
                        comingSoon={comingSoon}
                        darkMode={darkMode}
                      />
                    ))}

                  <div
                    style={{
                      height: "0.5px",
                      background: ui.divider,
                      margin: "10px 8px",
                    }}
                  />

                  {/* Admin group */}
                  <p
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: ui.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      margin: "0 0 6px 14px",
                    }}
                  >
                    Admin
                  </p>
                  {navItems
                    .slice(6)
                    .map(({ key, comingSoon, icon, ...rest }) => (
                      <NavItem
                        key={key}
                        {...rest}
                        active={activeNav === key}
                        onClick={() => setActiveNav(key)}
                        ui={ui}
                        comingSoon={comingSoon}
                        darkMode={darkMode}
                      />
                    ))}
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: isMobile
                ? "10px 10px 100px 10px"
                : "14px 14px 100px 14px",
              boxSizing: "border-box",
            }}
          >
            {/* Impersonation Banner */}
            {impersonating && (
              <div
                style={{
                  marginBottom: 14,
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: darkMode ? "#1a2744" : "#e7f0fd",
                  border: `1.5px solid ${FB}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background:
                      avatarPalette[impersonating.avatar % avatarPalette.length]
                        .bg,
                    color:
                      avatarPalette[impersonating.avatar % avatarPalette.length]
                        .color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    border: `2px solid ${avatarPalette[impersonating.avatar % avatarPalette.length].color}40`,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(impersonating.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: FB,
                    }}
                  >
                    👁 Viewing as:{" "}
                    <span style={{ color: darkMode ? "#e4e6ea" : "#1c1e21" }}>
                      {impersonating.name}
                    </span>
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.7rem",
                      color: darkMode ? "#b0b3b8" : "#65676b",
                    }}
                  >
                    {impersonating.role} · {impersonating.email}
                  </p>
                </div>
                <button
                  onClick={handleStopImpersonation}
                  style={{
                    padding: "5px 12px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    borderRadius: 7,
                    border: "1.5px solid #e02020",
                    background: darkMode ? "#2e0f0f" : "#fff1f2",
                    color: "#e02020",
                    cursor: "pointer",
                    fontFamily: font,
                    flexShrink: 0,
                  }}
                >
                  ✕ Stop Impersonation
                </button>
              </div>
            )}

            {isMobile && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginBottom: 14,
                  overflowX: "auto",
                  padding: "0 0 2px 0",
                }}
              >
                {navItems.map((n) => (
                  <button
                    key={n.key}
                    onClick={
                      n.comingSoon ? undefined : () => setActiveNav(n.key)
                    }
                    style={{
                      padding: "6px 14px",
                      borderRadius: 99,
                      border: `1px solid ${activeNav === n.key ? FB : ui.cardBorder}`,
                      background:
                        activeNav === n.key ? `${FB}12` : "transparent",
                      color: activeNav === n.key ? FB : ui.textMuted,
                      fontSize: "0.78rem",
                      fontWeight: activeNav === n.key ? 700 : 500,
                      cursor: n.comingSoon ? "default" : "pointer",
                      opacity: n.comingSoon ? 0.45 : 1,
                      whiteSpace: "nowrap",
                      fontFamily: font,
                    }}
                  >
                    {n.icon} {n.label}
                  </button>
                ))}
              </div>
            )}

            {renderContent(activeNav, {
              ui,
              darkMode,
              sharedProps,
              navItems,
              chartYear,
              setChartYear,
              chartMonth,
              setChartMonth,
              rxFilter,
              setRxFilter,
              handleSliceClick,
              activitySearch,
              setActivitySearch,
              userDatabase,
              impersonating,
              setImpersonating,
              setShowImpersonateConfirm,
              tableData,
              setModalEval,
              setActiveNav,
            })}
          </div>
        </div>
      </div>

      {/* Evaluator Detail Modal */}
      {modalEval && (
        <div
          onClick={handleModalClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: ui.cardBg,
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 12,
              overflow: "hidden",
              width: 920,
              maxWidth: "95vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "85vh",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderBottom: `1px solid ${ui.divider}`,
                background: colHdr,
                flexShrink: 0,
              }}
            >
              {(() => {
                const av = getAvatarColor(modalEval, uniqueEvaluators);
                const role =
                  userDatabase.find((u) => u.name === modalEval)?.role ||
                  "User";
                return (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        background: av.bg,
                        color: av.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        border: `2.5px solid ${av.color}55`,
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(modalEval)}
                    </div>
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: ui.textMuted,
                        }}
                      >
                        Tasks for a
                      </p>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1rem",
                          fontWeight: 700,
                          color: ui.textPrimary,
                        }}
                      >
                        {modalEval}
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.72rem",
                          color: ui.textMuted,
                        }}
                      >
                        {role}
                      </p>
                    </div>
                  </div>
                );
              })()}
              <button
                onClick={handleModalClose}
                style={{
                  background: "transparent",
                  border: `1px solid ${ui.cardBorder}`,
                  borderRadius: 6,
                  color: ui.textMuted,
                  cursor: "pointer",
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ overflowY: "auto", overflowX: "auto", flex: 1 }}>
              <div style={{ minWidth: 700 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-end",
                    padding: "10px 14px",
                    borderBottom: `1px solid ${ui.divider}`,
                    background: colHdr,
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    {
                      label: "From",
                      val: modalDateFrom,
                      set: setModalDateFrom,
                    },
                    { label: "To", val: modalDateTo, set: setModalDateTo },
                  ].map(({ label, val, set }) => (
                    <div key={label}>
                      <label
                        style={{
                          fontSize: "0.67rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: ui.textMuted,
                          marginBottom: 4,
                          display: "block",
                        }}
                      >
                        {label}
                      </label>
                      <input
                        type="date"
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        style={{
                          background: ui.inputBg,
                          border: `1px solid ${ui.cardBorder}`,
                          borderRadius: 7,
                          padding: "6px 10px",
                          fontSize: "0.78rem",
                          color: ui.textPrimary,
                          outline: "none",
                          colorScheme: darkMode ? "dark" : "light",
                          fontFamily: font,
                        }}
                      />
                    </div>
                  ))}
                  {(modalDateFrom || modalDateTo) && (
                    <button
                      onClick={() => {
                        setModalDateFrom("");
                        setModalDateTo("");
                      }}
                      style={{
                        padding: "6px 12px",
                        fontSize: "0.78rem",
                        borderRadius: 6,
                        border: `1px solid ${ui.cardBorder}`,
                        background: "transparent",
                        color: ui.textMuted,
                        cursor: "pointer",
                        fontFamily: font,
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    borderBottom: `1px solid ${ui.divider}`,
                    background: colHdr,
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    { key: "All", label: "All", color: FB },
                    {
                      key: "On Process",
                      label: "⏳ On Process",
                      color: "#f59e0b",
                    },
                    { key: "Approved", label: "✅ Approved", color: "#36a420" },
                    {
                      key: "Disapproved",
                      label: "❌ Disapproved",
                      color: "#e02020",
                    },
                  ].map(({ key, label, color }) => {
                    const count = allModalTasks.filter((t) => {
                      const d = new Date(t.date + "T00:00:00");
                      if (modalDateFrom && d < new Date(modalDateFrom))
                        return false;
                      if (modalDateTo && d > new Date(modalDateTo))
                        return false;
                      return key === "All" ? true : t.status === key;
                    }).length;
                    const isAct = modalStatusTab === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setModalStatusTab(key)}
                        style={{
                          padding: "5px 14px",
                          fontSize: "0.76rem",
                          fontWeight: isAct ? 700 : 500,
                          borderRadius: 99,
                          border: `1.5px solid ${isAct ? color : ui.cardBorder}`,
                          background: isAct ? `${color}15` : "transparent",
                          color: isAct ? color : ui.textMuted,
                          cursor: "pointer",
                          fontFamily: font,
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          transition: "all 0.15s",
                        }}
                      >
                        {label}
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            padding: "1px 6px",
                            borderRadius: 99,
                            background: isAct ? color : ui.inputBg,
                            color: isAct ? "#fff" : ui.textMuted,
                            minWidth: 18,
                            textAlign: "center",
                          }}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.5fr 1fr 2fr 1.1fr 1fr 0.9fr 60px",
                    background: colHdr,
                    borderBottom: `1px solid ${ui.divider}`,
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                  }}
                >
                  {[
                    { label: "DTN", col: "dtn" },
                    { label: "Date", col: "date" },
                    { label: "Drug / Application", col: "drugName" },
                    { label: "App Step", col: "appStep" },
                    { label: "Timeline", col: "timeline" },
                    { label: "Status", col: "status" },
                  ].map(({ label, col }) => (
                    <span
                      key={col}
                      onClick={() => toggleModalSort(col)}
                      style={{
                        fontSize: "0.67rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: modalSortCol === col ? FB : ui.textMuted,
                        padding: "8px 14px",
                        textAlign: "center",
                        cursor: "pointer",
                        userSelect: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {label}
                      <SortArrow col={col} />
                    </span>
                  ))}
                  <span
                    style={{
                      fontSize: "0.67rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: ui.textMuted,
                      padding: "8px 14px",
                      textAlign: "center",
                      position: "sticky",
                      right: 0,
                      background: colHdr,
                      borderLeft: `1px solid ${ui.divider}`,
                    }}
                  >
                    Action
                  </span>
                </div>
                {modalTasks.length === 0 ? (
                  <div
                    style={{
                      padding: "24px",
                      textAlign: "center",
                      color: ui.textMuted,
                      fontSize: "0.84rem",
                    }}
                  >
                    No tasks found
                  </div>
                ) : (
                  modalTasks.map((task, i) => {
                    const tlStyle = (darkMode
                      ? timelineColorsDark
                      : timelineColors)[task.timeline] || {
                      bg: "#f3f4f6",
                      color: "#374151",
                    };
                    const spc = (darkMode ? stepColorsDark : stepColors)[
                      task.appStep
                    ] || { bg: "#f3f4f6", color: "#374151" };
                    const sc = (darkMode ? statusColorsDark : statusColors)[
                      task.status
                    ] || { bg: "#f3f4f6", color: "#374151" };
                    return (
                      <div
                        key={i}
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "1.5fr 1fr 2fr 1.1fr 1fr 0.9fr 60px",
                          borderBottom:
                            i < modalTasks.length - 1
                              ? `1px solid ${ui.divider}`
                              : "none",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = ui.hoverBg)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: FB,
                            fontWeight: 700,
                            textAlign: "center",
                            padding: "10px 14px",
                            alignSelf: "center",
                            fontFamily: "monospace",
                          }}
                        >
                          {task.dtn}
                        </span>
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: ui.textPrimary,
                            textAlign: "center",
                            padding: "10px 14px",
                            alignSelf: "center",
                          }}
                        >
                          {new Date(task.date + "T00:00:00").toLocaleDateString(
                            "en-PH",
                            { year: "numeric", month: "short", day: "numeric" },
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: ui.textSub,
                            padding: "10px 14px",
                            alignSelf: "center",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {task.drugName}
                        </span>
                        <span
                          style={{
                            padding: "10px 14px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.71rem",
                              fontWeight: 600,
                              padding: "3px 9px",
                              borderRadius: 99,
                              background: spc.bg,
                              color: spc.color,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {task.appStep}
                          </span>
                        </span>
                        <span
                          style={{
                            padding: "10px 14px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.71rem",
                              fontWeight: 600,
                              padding: "3px 9px",
                              borderRadius: 99,
                              background: tlStyle.bg,
                              color: tlStyle.color,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {task.timeline}
                          </span>
                        </span>
                        <span
                          style={{
                            padding: "10px 14px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.71rem",
                              fontWeight: 600,
                              padding: "3px 9px",
                              borderRadius: 99,
                              background: sc.bg,
                              color: sc.color,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {task.status}
                          </span>
                        </span>
                        <div
                          style={{
                            padding: "8px 10px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            position: "sticky",
                            right: 0,
                            background: "inherit",
                            borderLeft: `1px solid ${ui.divider}`,
                            zIndex: 1,
                          }}
                        >
                          <ActionMenu
                            task={task}
                            darkMode={darkMode}
                            ui={ui}
                            onReassign={(t) => {
                              handleModalClose();
                              setReassignTask(t);
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div
              style={{
                padding: "8px 20px",
                borderTop: `1px solid ${ui.divider}`,
                background: colHdr,
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "0.73rem", color: ui.textMuted }}>
                {modalTasks.length !== allModalTasks.length
                  ? `${modalTasks.length} of ${allModalTasks.length} tasks`
                  : `${allModalTasks.length} task${allModalTasks.length !== 1 ? "s" : ""} assigned`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Chart Detail Modal */}
      {chartModal && (
        <ChartDetailModal
          title={chartModal.title}
          subtitle={chartModal.subtitle}
          rows={chartModal.rows}
          darkMode={darkMode}
          onClose={() => setChartModal(null)}
          ui={ui}
        />
      )}

      {/* Reassign Modal */}
      {reassignTask && (
        <ReassignModal
          task={reassignTask}
          evaluators={uniqueEvaluators}
          darkMode={darkMode}
          onClose={() => setReassignTask(null)}
          onConfirm={handleReassignConfirm}
          ui={ui}
        />
      )}

      {/* Impersonate Confirm Modal */}
      {showImpersonateConfirm && (
        <div
          onClick={() => setShowImpersonateConfirm(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 4000,
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: ui.cardBg,
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 14,
              overflow: "hidden",
              width: 400,
              maxWidth: "92vw",
              boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                padding: "20px 20px 16px",
                borderBottom: `1px solid ${ui.divider}`,
                background: darkMode ? ui.sidebarBg : "#f8f9fd",
              }}
            >
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
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background:
                      avatarPalette[
                        showImpersonateConfirm.avatar % avatarPalette.length
                      ].bg,
                    color:
                      avatarPalette[
                        showImpersonateConfirm.avatar % avatarPalette.length
                      ].color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(showImpersonateConfirm.name)}
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      color: ui.textPrimary,
                    }}
                  >
                    {showImpersonateConfirm.name}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.73rem",
                      color: ui.textMuted,
                    }}
                  >
                    {showImpersonateConfirm.role} ·{" "}
                    {showImpersonateConfirm.email}
                  </p>
                </div>
              </div>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: darkMode ? "#1a2744" : `${FB}0e`,
                  border: `1px solid ${FB}30`,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.75rem",
                    color: darkMode ? "#93c5fd" : "#1d4ed8",
                    lineHeight: 1.5,
                  }}
                >
                  👁 You are about to{" "}
                  <strong>
                    view the dashboard as {showImpersonateConfirm.name}
                  </strong>
                  . This lets you inspect their data perspective and workload.
                  No changes will be made.
                </p>
              </div>
            </div>
            <div
              style={{
                padding: "16px 20px",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                onClick={() => setShowImpersonateConfirm(null)}
                style={{
                  padding: "8px 16px",
                  fontSize: "0.82rem",
                  borderRadius: 7,
                  border: `1px solid ${ui.cardBorder}`,
                  background: "transparent",
                  color: ui.textMuted,
                  cursor: "pointer",
                  fontFamily: font,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const user = showImpersonateConfirm;
                  setImpersonating(user);
                  setShowImpersonateConfirm(null);
                  startImpersonation(user); // saves username to sessionStorage
                  navigate("/admin/dashboard"); // redirect to dashboard
                }}
                style={{
                  padding: "8px 18px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  borderRadius: 7,
                  border: "none",
                  background: FB,
                  color: "#fff",
                  cursor: "pointer",
                  fontFamily: font,
                }}
              >
                👁 View Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MonitoringPage;
