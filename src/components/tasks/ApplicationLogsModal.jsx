// src/components/tasks/viewdetails/ApplicationLogsModal.jsx
import { useEffect, useState } from "react";
import { getApplicationLogsByDtn } from "../../api/application-logs";

/* ── date formatter ── */
const fmt = (v) => {
  if (!v || v === "N/A" || v === "null" || v === "undefined") return null;
  const d = new Date(v);
  if (isNaN(d)) return null;
  return {
    date: d.toLocaleDateString("en-PH", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }),
  };
};

const fmtDate = (v) => {
  if (!v) return null;
  const d = new Date(v + "T00:00:00");
  if (isNaN(d)) return null;
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const todayStr = () => new Date().toISOString().split("T")[0];

const countWorkingDays = (startStr, endStr) => {
  if (!endStr) return null;
  let count = 0;
  const current = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  if (end <= current) return 0;
  while (current < end) {
    current.setDate(current.getDate() + 1);
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
};

const getDeadlineUrgency = (dl) => {
  if (!dl) return null;
  const today = new Date(todayStr() + "T00:00:00");
  const end = new Date(dl + "T00:00:00");
  if (end < today) return "overdue";
  if (end.toDateString() === today.toDateString()) return "today";
  const wdays = countWorkingDays(todayStr(), dl);
  if (wdays <= 3) return "critical";
  if (wdays <= 5) return "warning";
  return "ok";
};

const URGENCY_CFG = {
  overdue: {
    bg: "rgba(239,68,68,0.1)",
    color: "#dc2626",
    border: "#fca5a5",
    icon: "🚨",
    label: "OVERDUE",
  },
  today: {
    bg: "rgba(249,115,22,0.1)",
    color: "#ea580c",
    border: "#fdba74",
    icon: "🔴",
    label: "DUE TODAY",
  },
  critical: {
    bg: "rgba(245,158,11,0.1)",
    color: "#d97706",
    border: "#fcd34d",
    icon: "🟠",
    label: "CRITICAL",
  },
  warning: {
    bg: "rgba(234,179,8,0.1)",
    color: "#ca8a04",
    border: "#fde68a",
    icon: "🟡",
    label: "WARNING",
  },
  ok: {
    bg: "rgba(16,185,129,0.1)",
    color: "#059669",
    border: "#6ee7b7",
    icon: "🟢",
    label: "ON TRACK",
  },
};

const stepMeta = (step) => {
  const s = step?.toLowerCase() || "";
  if (s.includes("compliance")) return { icon: "📋", color: "#f59e0b" };
  if (s.includes("deck")) return { icon: "📥", color: "#f97316" };
  if (s.includes("eval")) return { icon: "🔬", color: "#8b5cf6" };
  if (s.includes("check")) return { icon: "✅", color: "#06b6d4" };
  if (s.includes("superv")) return { icon: "👔", color: "#3b82f6" };
  if (s.includes("qa")) return { icon: "🛡️", color: "#10b981" };
  if (s.includes("director")) return { icon: "⭐", color: "#f59e0b" };
  if (s.includes("releas")) return { icon: "📦", color: "#2196F3" };
  return { icon: "📋", color: "#6b7280" };
};

const statusCfg = (s) => {
  const u = s?.toUpperCase();
  if (u?.includes("COMPLET"))
    return {
      bg: "#f0fdf4",
      text: "#15803d",
      border: "#bbf7d0",
      dot: "#22c55e",
    };
  if (u?.includes("APPROV"))
    return {
      bg: "#f0fdf4",
      text: "#15803d",
      border: "#bbf7d0",
      dot: "#22c55e",
    };
  if (u?.includes("REJECT"))
    return {
      bg: "#fef2f2",
      text: "#dc2626",
      border: "#fecaca",
      dot: "#ef4444",
    };
  if (u?.includes("PENDING"))
    return {
      bg: "#fffbeb",
      text: "#d97706",
      border: "#fde68a",
      dot: "#f59e0b",
    };
  if (u?.includes("FOR "))
    return {
      bg: "#eff6ff",
      text: "#1d4ed8",
      border: "#bfdbfe",
      dot: "#3b82f6",
    };
  if (u?.includes("CLOSED"))
    return {
      bg: "#f9fafb",
      text: "#374151",
      border: "#e5e7eb",
      dot: "#9ca3af",
    };
  return { bg: "#f9fafb", text: "#374151", border: "#e5e7eb", dot: "#9ca3af" };
};

const actionCfg = (a) => {
  const u = a?.toUpperCase();
  if (u?.includes("REASSIGN"))
    return { bg: "#ede9fe", color: "#7c3aed", border: "#c4b5fd" };
  if (u?.includes("REROUTE"))
    return { bg: "#e0f2fe", color: "#0369a1", border: "#7dd3fc" };
  return { bg: "#f0f9ff", color: "#0284c7", border: "#bae6fd" };
};

function ApplicationLogsModal({ record, onClose, colors, darkMode }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── theme vars ──────────────────────────────────────────────
  const accent = "#2196F3";
  const accentLight = darkMode ? "rgba(33,150,243,0.12)" : "#e8f4fd";
  const accentBorder = darkMode ? "#1e3a5c" : "#90caf9";
  const panelBg = darkMode ? "#1c1c1c" : "#ffffff";
  const headerBg = darkMode ? "#111827" : "#f8f9fb";
  const bodyBg = darkMode ? "#141414" : "#f4f6f8";
  const cardBg = darkMode ? "#1e1e1e" : "#ffffff";
  const cardBorder = darkMode ? "#2a2a2a" : "#e2e8f0";
  const textPrimary = darkMode ? "#f1f5f9" : "#1e293b";
  const textSub = darkMode ? "#94a3b8" : "#64748b";
  const textMuted = darkMode ? "#4b5563" : "#94a3b8";
  const dividerColor = darkMode ? "#2a2a2a" : "#e2e8f0";
  const timelineLine = darkMode ? "#334155" : "#cbd5e1";
  // ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!record?.dtn) {
      setLoading(false);
      setError("No DTN found.");
      return;
    }
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getApplicationLogsByDtn(record.dtn);
        setLogs(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || "Failed to load logs.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [record?.dtn]);

  const onBackdrop = (e) => e.target === e.currentTarget && onClose();
  const ascendingLogs = [...logs].sort((a, b) => {
    // Checking logs — laging nasa UNAHAN
    const aChecking = a.application_step === "Decking";
    const bChecking = b.application_step === "Decking";
    if (aChecking && !bChecking) return -1;
    if (!aChecking && bChecking) return 1;

    // IN PROGRESS logs — laging nasa DULO
    const aActive = a.application_status === "IN PROGRESS";
    const bActive = b.application_status === "IN PROGRESS";
    if (aActive && !bActive) return 1;
    if (!aActive && bActive) return -1;

    // COMPLETED logs — sorted by accomplished_date ascending
    const aDate = a.accomplished_date ? new Date(a.accomplished_date) : null;
    const bDate = b.accomplished_date ? new Date(b.accomplished_date) : null;
    if (aDate && bDate) return aDate - bDate;
    if (aDate) return -1;
    if (bDate) return 1;

    // fallback — del_index
    return (a.del_index ?? 0) - (b.del_index ?? 0);
  });
  const completedCount = logs.filter((l) => l.accomplished_date).length;
  const inProgressCount = logs.filter((l) => !l.accomplished_date).length;

  const renderDeadline = (log) => {
    if (!log.deadline_date) return null;
    const urgency = getDeadlineUrgency(log.deadline_date);
    const cfg = URGENCY_CFG[urgency] || URGENCY_CFG.ok;
    const remaining = countWorkingDays(todayStr(), log.deadline_date);
    return (
      <div
        style={{
          marginTop: "0.65rem",
          padding: "0.6rem 0.85rem",
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          borderLeft: `3px solid ${cfg.color}`,
          borderRadius: 6,
          display: "flex",
          gap: "1.5rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.6rem",
              fontWeight: 700,
              color: cfg.color,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 2,
            }}
          >
            ⏰ Compliance Deadline
          </div>
          <span
            style={{ fontSize: "0.82rem", fontWeight: 700, color: cfg.color }}
          >
            {fmtDate(log.deadline_date)}
          </span>
        </div>
        {log.working_days != null && (
          <div>
            <div
              style={{
                fontSize: "0.6rem",
                fontWeight: 700,
                color: cfg.color,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 2,
              }}
            >
              Allotted
            </div>
            <span
              style={{ fontSize: "0.82rem", fontWeight: 700, color: cfg.color }}
            >
              {log.working_days}d
            </span>
          </div>
        )}
        {remaining !== null && (
          <div>
            <div
              style={{
                fontSize: "0.6rem",
                fontWeight: 700,
                color: cfg.color,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 2,
              }}
            >
              Remaining
            </div>
            <span
              style={{ fontSize: "0.82rem", fontWeight: 700, color: cfg.color }}
            >
              {urgency === "overdue"
                ? "OVERDUE"
                : urgency === "today"
                  ? "Due today!"
                  : `${remaining}d left`}
            </span>
          </div>
        )}
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.68rem",
            fontWeight: 700,
            padding: "0.15rem 0.5rem",
            borderRadius: 20,
            background: cfg.bg,
            border: `1px solid ${cfg.color}`,
            color: cfg.color,
          }}
        >
          {cfg.icon} {cfg.label}
        </span>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes alm-spin { to { transform: rotate(360deg); } }
        @keyframes alm-fadeup { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes alm-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
        .alm-card { animation: alm-fadeup 0.2s ease forwards; }
        .alm-inprogress { animation: alm-pulse 1.6s ease-in-out infinite; }
        .alm-close:hover { background: ${accentLight} !important; color: ${accent} !important; border-color: ${accentBorder} !important; }
        .alm-close-btn:hover { background: ${accentLight} !important; color: ${accent} !important; border-color: ${accentBorder} !important; }
      `}</style>

      <div
        onClick={onBackdrop}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          backdropFilter: "blur(3px)",
        }}
      >
        <div
          style={{
            background: panelBg,
            borderRadius: 12,
            width: "min(860px, 100%)",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(33,150,243,0.1)",
            overflow: "hidden",
            border: `1px solid ${cardBorder}`,
          }}
        >
          {/* ── HEADER ── */}
          <div
            style={{
              background: headerBg,
              borderBottom: `1px solid ${dividerColor}`,
              padding: "1rem 1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  background: accentLight,
                  border: `1px solid ${accentBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                  flexShrink: 0,
                }}
              >
                📋
              </div>
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: textPrimary,
                    }}
                  >
                    Application Logs
                  </h2>
                  {!loading && !error && (
                    <span
                      style={{
                        background: accent,
                        color: "#fff",
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        padding: "0.1rem 0.5rem",
                        borderRadius: 20,
                      }}
                    >
                      {logs.length}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    marginTop: "0.15rem",
                  }}
                >
                  <span style={{ fontSize: "0.7rem", color: textSub }}>
                    DTN:
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: accent,
                      fontSize: "0.75rem",
                      fontFamily: "monospace",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {record?.dtn || "N/A"}
                  </span>
                  {!loading && !error && logs.length > 0 && (
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: textSub,
                        marginLeft: "0.35rem",
                      }}
                    >
                      ·{" "}
                      {completedCount > 0 && (
                        <span style={{ color: "#059669", fontWeight: 600 }}>
                          {completedCount} completed
                        </span>
                      )}
                      {completedCount > 0 && inProgressCount > 0 && (
                        <span> · </span>
                      )}
                      {inProgressCount > 0 && (
                        <span style={{ color: "#d97706", fontWeight: 600 }}>
                          {inProgressCount} in progress
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              className="alm-close-btn"
              onClick={onClose}
              style={{
                background: "transparent",
                border: `1px solid ${dividerColor}`,
                borderRadius: 6,
                color: textSub,
                cursor: "pointer",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.85rem",
                transition: "all 0.15s",
              }}
            >
              ✕
            </button>
          </div>

          {/* ── BODY ── */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: "1rem 1.25rem",
              background: bodyBg,
            }}
          >
            {loading && (
              <div style={{ padding: "3rem", textAlign: "center" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: `3px solid ${dividerColor}`,
                    borderTopColor: accent,
                    animation: "alm-spin 0.7s linear infinite",
                    margin: "0 auto 0.75rem",
                  }}
                />
                <p style={{ color: textSub, fontSize: "0.85rem", margin: 0 }}>
                  Loading activity logs…
                </p>
              </div>
            )}

            {!loading && error && (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  background: "#fef2f2",
                  borderRadius: 8,
                  border: "1px solid #fecaca",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                  ⚠️
                </div>
                <p
                  style={{
                    color: "#dc2626",
                    fontSize: "0.85rem",
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  {error}
                </p>
              </div>
            )}

            {!loading && !error && logs.length === 0 && (
              <div style={{ padding: "3rem", textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
                  📭
                </div>
                <p style={{ color: textSub, fontSize: "0.85rem", margin: 0 }}>
                  No activity found for this application.
                </p>
              </div>
            )}

            {!loading && !error && logs.length > 0 && (
              <div style={{ position: "relative" }}>
                {/* Timeline line */}
                <div
                  style={{
                    position: "absolute",
                    left: 15,
                    top: 20,
                    bottom: 20,
                    width: 2,
                    background: timelineLine,
                    borderRadius: 2,
                    zIndex: 0,
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.65rem",
                  }}
                >
                  {ascendingLogs.map((log, idx) => {
                    const meta = stepMeta(log.application_step);
                    const sc = statusCfg(log.application_status);
                    const ac = actionCfg(log.action_type);
                    const isLatest = idx === ascendingLogs.length - 1;
                    const isCompliance = log.application_step
                      ?.toLowerCase()
                      .includes("compliance");
                    const startDt = fmt(log.start_date);
                    const doneDt = fmt(log.accomplished_date);
                    const cardId = log.id ?? idx;
                    const hasRemarks = !!log.application_remarks?.trim();

                    return (
                      <div
                        key={cardId}
                        className="alm-card"
                        style={{
                          animationDelay: `${idx * 0.04}s`,
                          display: "flex",
                          gap: "0.75rem",
                          alignItems: "flex-start",
                          position: "relative",
                          zIndex: 1,
                        }}
                      >
                        {/* Timeline dot */}
                        <div style={{ flexShrink: 0, paddingTop: "0.85rem" }}>
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: "50%",
                              background: doneDt
                                ? "#059669"
                                : isLatest
                                  ? accent
                                  : darkMode
                                    ? "#2a2a2a"
                                    : "#fff",
                              border: `2px solid ${doneDt ? "#059669" : isLatest ? accent : meta.color}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: doneDt ? "0.75rem" : "0.85rem",
                              boxShadow: isLatest
                                ? `0 0 0 3px ${accentLight}`
                                : "none",
                              color: doneDt || isLatest ? "#fff" : "inherit",
                            }}
                          >
                            {doneDt ? "✓" : meta.icon}
                          </div>
                        </div>

                        {/* Card */}
                        <div
                          style={{
                            flex: 1,
                            background: cardBg,
                            border: `1px solid ${isLatest ? accentBorder : cardBorder}`,
                            borderLeft: `3px solid ${isLatest ? accent : meta.color}`,
                            borderRadius: 8,
                            overflow: "hidden",
                            boxShadow: isLatest
                              ? `0 2px 8px rgba(33,150,243,0.1)`
                              : "0 1px 3px rgba(0,0,0,0.04)",
                          }}
                        >
                          {/* Card top */}
                          <div style={{ padding: "0.75rem 1rem" }}>
                            {/* Step name row */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "0.5rem",
                                flexWrap: "wrap",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.4rem",
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.88rem",
                                    fontWeight: 700,
                                    color: isLatest ? accent : textPrimary,
                                  }}
                                >
                                  {log.application_step || "—"}
                                </span>
                                {isLatest && (
                                  <span
                                    style={{
                                      background: accentLight,
                                      color: accent,
                                      border: `1px solid ${accentBorder}`,
                                      fontSize: "0.58rem",
                                      fontWeight: 700,
                                      padding: "0.1rem 0.4rem",
                                      borderRadius: 20,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                    }}
                                  >
                                    Latest
                                  </span>
                                )}
                                {isCompliance && log.deadline_date && (
                                  <span
                                    style={{
                                      background: "rgba(245,158,11,0.1)",
                                      color: "#d97706",
                                      border: "1px solid #fcd34d",
                                      fontSize: "0.58rem",
                                      fontWeight: 700,
                                      padding: "0.1rem 0.4rem",
                                      borderRadius: 20,
                                    }}
                                  >
                                    ⏰ Has Deadline
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "0.35rem",
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                }}
                              >
                                {log.application_status && (
                                  <span
                                    style={{
                                      background: sc.bg,
                                      color: sc.text,
                                      border: `1px solid ${sc.border}`,
                                      fontSize: "0.65rem",
                                      fontWeight: 700,
                                      padding: "0.18rem 0.55rem",
                                      borderRadius: 20,
                                      whiteSpace: "nowrap",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.28rem",
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: 5,
                                        height: 5,
                                        borderRadius: "50%",
                                        background: sc.dot,
                                        flexShrink: 0,
                                      }}
                                    />
                                    {log.application_status}
                                  </span>
                                )}
                                {log.application_step
                                  ?.toLowerCase()
                                  .includes("closed") ||
                                log.application_status
                                  ?.toLowerCase()
                                  .includes("closed")
                                  ? null
                                  : null}
                              </div>
                            </div>

                            {/* User + decision */}
                            <div
                              style={{
                                display: "flex",
                                gap: "0.6rem",
                                marginTop: "0.4rem",
                                flexWrap: "wrap",
                                alignItems: "center",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.3rem",
                                }}
                              >
                                <div
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: "50%",
                                    background: meta.color + "22",
                                    border: `1.5px solid ${meta.color}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: meta.color,
                                    fontSize: "0.62rem",
                                    fontWeight: 700,
                                  }}
                                >
                                  {(log.user_name || "?")[0].toUpperCase()}
                                </div>
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: textSub,
                                    fontWeight: 500,
                                  }}
                                >
                                  {log.user_name || "—"}
                                </span>
                              </div>
                              {log.application_decision && (
                                <>
                                  <span
                                    style={{
                                      color: dividerColor,
                                      fontSize: "0.8rem",
                                    }}
                                  >
                                    ·
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "0.72rem",
                                      color: textSub,
                                    }}
                                  >
                                    Decision:{" "}
                                    <strong style={{ color: textPrimary }}>
                                      {log.application_decision}
                                    </strong>
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Dates + action type grid */}
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(120px, 1fr))",
                                gap: "0.5rem 1.5rem",
                                marginTop: "0.6rem",
                                paddingTop: "0.6rem",
                                borderTop: `1px dashed ${dividerColor}`,
                              }}
                            >
                              {/* Start date */}
                              <div>
                                <div
                                  style={{
                                    fontSize: "0.58rem",
                                    fontWeight: 700,
                                    color: textMuted,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    marginBottom: 2,
                                  }}
                                >
                                  Start Date
                                </div>
                                {startDt ? (
                                  <div style={{ fontSize: "0.75rem" }}>
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        color: textPrimary,
                                      }}
                                    >
                                      ● {startDt.date}
                                    </span>
                                    <span
                                      style={{
                                        color: textSub,
                                        marginLeft: "0.3rem",
                                        fontSize: "0.7rem",
                                      }}
                                    >
                                      {startDt.time}
                                    </span>
                                  </div>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      color: textMuted,
                                    }}
                                  >
                                    —
                                  </span>
                                )}
                              </div>

                              {/* Accomplished */}
                              <div>
                                <div
                                  style={{
                                    fontSize: "0.58rem",
                                    fontWeight: 700,
                                    color: doneDt ? "#059669" : textMuted,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    marginBottom: 2,
                                  }}
                                >
                                  Accomplished Date
                                </div>
                                {doneDt ? (
                                  <div style={{ fontSize: "0.75rem" }}>
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        color: "#059669",
                                      }}
                                    >
                                      ● {doneDt.date}
                                    </span>
                                    <span
                                      style={{
                                        color: textSub,
                                        marginLeft: "0.3rem",
                                        fontSize: "0.7rem",
                                      }}
                                    >
                                      {doneDt.time}
                                    </span>
                                  </div>
                                ) : (
                                  <span
                                    className="alm-inprogress"
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#d97706",
                                      fontWeight: 600,
                                    }}
                                  >
                                    In Progress…
                                  </span>
                                )}
                              </div>

                              {/* Action */}
                              {log.action_type && (
                                <div>
                                  <div
                                    style={{
                                      fontSize: "0.58rem",
                                      fontWeight: 700,
                                      color: textMuted,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                      marginBottom: 2,
                                    }}
                                  >
                                    Action
                                  </div>
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      padding: "0.18rem 0.55rem",
                                      background: ac.bg,
                                      color: ac.color,
                                      border: `1px solid ${ac.border}`,
                                      borderRadius: 20,
                                      fontSize: "0.7rem",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {log.action_type}
                                  </span>
                                </div>
                              )}

                              {/* Meta */}
                              {(log.del_index != null ||
                                log.prev_del_index != null) && (
                                <div>
                                  <div
                                    style={{
                                      fontSize: "0.58rem",
                                      fontWeight: 700,
                                      color: textMuted,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                      marginBottom: 2,
                                    }}
                                  >
                                    Meta
                                  </div>
                                  <span
                                    style={{
                                      fontSize: "0.72rem",
                                      color: textSub,
                                    }}
                                  >
                                    {log.del_index != null &&
                                      `Index: ${log.del_index}`}
                                    {log.prev_del_index != null &&
                                      `  Prev: ${log.prev_del_index}`}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Compliance deadline */}
                            {isCompliance && renderDeadline(log)}
                          </div>

                          {/* Details panel */}
                          {(hasRemarks ||
                            log.action_type === "REASSIGNMENT" ||
                            log.action_type === "REROUTE" ||
                            log.decision_result ||
                            log.decision_authority_name) && (
                            <div
                              style={{
                                borderTop: `1px solid ${dividerColor}`,
                                background: darkMode ? "#181818" : "#f8fafc",
                                padding: "0.7rem 1rem",
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.6rem",
                              }}
                            >
                              {/* REASSIGNMENT */}
                              {log.action_type === "REASSIGNMENT" && (
                                <div
                                  style={{
                                    padding: "0.6rem 0.75rem",
                                    background: darkMode
                                      ? "rgba(124,58,237,0.08)"
                                      : "rgba(124,58,237,0.04)",
                                    border: "1px solid rgba(124,58,237,0.2)",
                                    borderRadius: 6,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.5rem",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: "0.62rem",
                                      fontWeight: 700,
                                      color: "#7c3aed",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.07em",
                                    }}
                                  >
                                    🔄 Re-assignment Details
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "0.75rem",
                                      flexWrap: "wrap",
                                      alignItems: "center",
                                    }}
                                  >
                                    {log.reassigned_from_user_name && (
                                      <span
                                        style={{
                                          fontSize: "0.75rem",
                                          fontWeight: 600,
                                          color: "#ef4444",
                                          padding: "0.2rem 0.55rem",
                                          background: "rgba(239,68,68,0.07)",
                                          border:
                                            "1px solid rgba(239,68,68,0.2)",
                                          borderRadius: 5,
                                        }}
                                      >
                                        👤 {log.reassigned_from_user_name}
                                      </span>
                                    )}
                                    {log.reassigned_from_user_name &&
                                      log.reassigned_to_user_name && (
                                        <span style={{ color: "#7c3aed" }}>
                                          →
                                        </span>
                                      )}
                                    {log.reassigned_to_user_name && (
                                      <span
                                        style={{
                                          fontSize: "0.75rem",
                                          fontWeight: 600,
                                          color: "#10b981",
                                          padding: "0.2rem 0.55rem",
                                          background: "rgba(16,185,129,0.07)",
                                          border:
                                            "1px solid rgba(16,185,129,0.2)",
                                          borderRadius: 5,
                                        }}
                                      >
                                        👤 {log.reassigned_to_user_name}
                                      </span>
                                    )}
                                  </div>
                                  {log.reassigned_by_user_name && (
                                    <div
                                      style={{
                                        fontSize: "0.72rem",
                                        color: textSub,
                                      }}
                                    >
                                      By:{" "}
                                      <strong style={{ color: "#7c3aed" }}>
                                        {log.reassigned_by_user_name}
                                      </strong>
                                      {log.reassigned_at && (
                                        <span style={{ marginLeft: "0.5rem" }}>
                                          {fmt(log.reassigned_at)?.date}{" "}
                                          {fmt(log.reassigned_at)?.time}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {log.reassignment_reason && (
                                    <div
                                      style={{
                                        fontSize: "0.72rem",
                                        color: textSub,
                                      }}
                                    >
                                      Reason:{" "}
                                      <strong style={{ color: textPrimary }}>
                                        {log.reassignment_reason}
                                      </strong>
                                    </div>
                                  )}
                                  {log.reassignment_remarks && (
                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: "0.78rem",
                                        color: textPrimary,
                                        lineHeight: 1.55,
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        padding: "0.5rem 0.7rem",
                                        background: darkMode ? "#111" : "#fff",
                                        border:
                                          "1px solid rgba(124,58,237,0.2)",
                                        borderRadius: 6,
                                        borderLeft: "3px solid #7c3aed",
                                      }}
                                    >
                                      {log.reassignment_remarks}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* REROUTE */}
                              {log.action_type === "REROUTE" && (
                                <div
                                  style={{
                                    padding: "0.6rem 0.75rem",
                                    background: darkMode
                                      ? "rgba(8,145,178,0.08)"
                                      : "rgba(8,145,178,0.04)",
                                    border: "1px solid rgba(8,145,178,0.2)",
                                    borderRadius: 6,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.5rem",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: "0.62rem",
                                      fontWeight: 700,
                                      color: "#0891b2",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.07em",
                                    }}
                                  >
                                    🔀 Re-route Details
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "0.75rem",
                                      flexWrap: "wrap",
                                      alignItems: "center",
                                    }}
                                  >
                                    {log.reroute_from_step && (
                                      <span
                                        style={{
                                          fontSize: "0.75rem",
                                          fontWeight: 600,
                                          color: "#ef4444",
                                          padding: "0.2rem 0.55rem",
                                          background: "rgba(239,68,68,0.07)",
                                          border:
                                            "1px solid rgba(239,68,68,0.2)",
                                          borderRadius: 5,
                                        }}
                                      >
                                        {log.reroute_from_step}
                                      </span>
                                    )}
                                    {log.reroute_from_step &&
                                      log.reroute_target_step && (
                                        <span style={{ color: "#0891b2" }}>
                                          →
                                        </span>
                                      )}
                                    {log.reroute_target_step && (
                                      <span
                                        style={{
                                          fontSize: "0.75rem",
                                          fontWeight: 600,
                                          color: "#10b981",
                                          padding: "0.2rem 0.55rem",
                                          background: "rgba(16,185,129,0.07)",
                                          border:
                                            "1px solid rgba(16,185,129,0.2)",
                                          borderRadius: 5,
                                        }}
                                      >
                                        {log.reroute_target_step}
                                      </span>
                                    )}
                                  </div>
                                  {log.rerouted_by_user_name && (
                                    <div
                                      style={{
                                        fontSize: "0.72rem",
                                        color: textSub,
                                      }}
                                    >
                                      By:{" "}
                                      <strong style={{ color: "#0891b2" }}>
                                        {log.rerouted_by_user_name}
                                      </strong>
                                      {log.rerouted_at && (
                                        <span style={{ marginLeft: "0.5rem" }}>
                                          {fmt(log.rerouted_at)?.date}{" "}
                                          {fmt(log.rerouted_at)?.time}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {log.reroute_reason && (
                                    <div
                                      style={{
                                        fontSize: "0.72rem",
                                        color: textSub,
                                      }}
                                    >
                                      Reason:{" "}
                                      <strong style={{ color: textPrimary }}>
                                        {log.reroute_reason}
                                      </strong>
                                    </div>
                                  )}
                                  {log.reroute_remarks && (
                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: "0.78rem",
                                        color: textPrimary,
                                        lineHeight: 1.55,
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        padding: "0.5rem 0.7rem",
                                        background: darkMode ? "#111" : "#fff",
                                        border: "1px solid rgba(8,145,178,0.2)",
                                        borderRadius: 6,
                                        borderLeft: "3px solid #0891b2",
                                      }}
                                    >
                                      {log.reroute_remarks}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Decision Result */}
                              {log.decision_result && (
                                <div>
                                  <div
                                    style={{
                                      fontSize: "0.6rem",
                                      fontWeight: 700,
                                      color: textMuted,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.06em",
                                      marginBottom: 3,
                                    }}
                                  >
                                    📊 Decision Result
                                  </div>
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      padding: "0.18rem 0.55rem",
                                      background: accentLight,
                                      border: `1px solid ${accentBorder}`,
                                      borderRadius: 20,
                                      fontSize: "0.75rem",
                                      fontWeight: 600,
                                      color: accent,
                                    }}
                                  >
                                    {log.decision_result}
                                  </span>
                                </div>
                              )}

                              {/* Decision Authority */}
                              {log.decision_authority_name && (
                                <div>
                                  <div
                                    style={{
                                      fontSize: "0.6rem",
                                      fontWeight: 700,
                                      color: textMuted,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.06em",
                                      marginBottom: 3,
                                    }}
                                  >
                                    🏛️ Decision Authority
                                  </div>
                                  <span
                                    style={{
                                      fontSize: "0.78rem",
                                      fontWeight: 600,
                                      color: "#b45309",
                                      padding: "0.2rem 0.6rem",
                                      background: "rgba(245,158,11,0.08)",
                                      border: "1px solid rgba(245,158,11,0.3)",
                                      borderRadius: 6,
                                      display: "inline-block",
                                    }}
                                  >
                                    {log.decision_authority_name}
                                  </span>
                                </div>
                              )}

                              {/* Remarks */}
                              {hasRemarks && (
                                <div>
                                  <div
                                    style={{
                                      fontSize: "0.6rem",
                                      fontWeight: 700,
                                      color: textMuted,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.06em",
                                      marginBottom: 3,
                                    }}
                                  >
                                    💬 Remarks
                                  </div>
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: "0.78rem",
                                      color: textPrimary,
                                      lineHeight: 1.6,
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                      padding: "0.55rem 0.75rem",
                                      background: darkMode ? "#111" : "#fff",
                                      border: `1px solid ${dividerColor}`,
                                      borderRadius: 6,
                                      borderLeft: `3px solid ${accent}`,
                                    }}
                                  >
                                    {log.application_remarks}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div
            style={{
              borderTop: `1px solid ${dividerColor}`,
              padding: "0.75rem 1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: headerBg,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "0.72rem", color: textMuted }}>
              {loading
                ? "Loading…"
                : error
                  ? "Failed to load"
                  : `${logs.length} step${logs.length !== 1 ? "s" : ""} recorded`}
            </span>
            <button
              className="alm-close-btn"
              onClick={onClose}
              style={{
                padding: "0.45rem 1.25rem",
                background: "transparent",
                border: `1.5px solid ${accentBorder}`,
                borderRadius: 6,
                color: accent,
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 600,
                transition: "all 0.15s",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ApplicationLogsModal;
