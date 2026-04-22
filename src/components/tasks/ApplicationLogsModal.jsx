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

/* ── deadline date formatter (date-only string like "2026-03-10") ── */
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
    bg: "rgba(239,68,68,0.15)",
    color: "#fca5a5",
    border: "#ef4444",
    icon: "🚨",
    label: "OVERDUE",
  },
  today: {
    bg: "rgba(249,115,22,0.15)",
    color: "#fdba74",
    border: "#f97316",
    icon: "🔴",
    label: "DUE TODAY",
  },
  critical: {
    bg: "rgba(245,158,11,0.15)",
    color: "#fcd34d",
    border: "#f59e0b",
    icon: "🟠",
    label: "CRITICAL",
  },
  warning: {
    bg: "rgba(234,179,8,0.12)",
    color: "#fde68a",
    border: "#eab308",
    icon: "🟡",
    label: "WARNING",
  },
  ok: {
    bg: "rgba(16,185,129,0.12)",
    color: "#6ee7b7",
    border: "#10b981",
    icon: "🟢",
    label: "ON TRACK",
  },
};

/* ── step icon map ── */
const stepMeta = (step) => {
  const s = step?.toLowerCase() || "";
  if (s.includes("compliance")) return { icon: "📋", color: "#f59e0b" };
  if (s.includes("deck")) return { icon: "📥", color: "#f97316" };
  if (s.includes("eval")) return { icon: "🔬", color: "#8b5cf6" };
  if (s.includes("check")) return { icon: "✅", color: "#06b6d4" };
  if (s.includes("superv")) return { icon: "👔", color: "#3b82f6" };
  if (s.includes("qa")) return { icon: "🛡️", color: "#10b981" };
  if (s.includes("director")) return { icon: "⭐", color: "#f59e0b" };
  if (s.includes("releas")) return { icon: "📦", color: "#ee4d2d" };
  return { icon: "📋", color: "#6b7280" };
};

/* ── status badge config ── */
const statusCfg = (s) => {
  const u = s?.toUpperCase();
  if (u?.includes("COMPLET"))
    return {
      bg: "#fff7ed",
      text: "#c2410c",
      border: "#fed7aa",
      dot: "#f97316",
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
  return { bg: "#f9fafb", text: "#374151", border: "#e5e7eb", dot: "#9ca3af" };
};

function ApplicationLogsModal({ record, onClose, colors, darkMode }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());

  useEffect(() => {
    if (!record?.dtn) {
      setLoading(false);
      setError("No DTN found for this record.");
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

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const onBackdrop = (e) => e.target === e.currentTarget && onClose();

  const shopeeOrange = "#ee4d2d";
  const shopeeLight = "#fff2ee";
  const shopeeBorder = "#ffd5c8";
  const panelBg = darkMode ? "#1a1a1a" : "#ffffff";
  const headerBg = darkMode ? "#1e0e0a" : shopeeLight;
  const cardBg = darkMode ? "#242424" : "#ffffff";
  const cardBorder = darkMode ? "#2e2e2e" : "#f0f0f0";
  const textMain = darkMode ? "#f5f5f5" : "#222222";
  const textSub = darkMode ? "#a3a3a3" : "#757575";
  const textTert = darkMode ? "#666666" : "#b0b0b0";
  const divider = darkMode ? "#2e2e2e" : "#f0f0f0";
  const remarksBg = darkMode ? "#1a1a1a" : "#fffaf9";
  const remarksBorder = darkMode ? "#3a1a10" : "#ffd5c8";

  const ascendingLogs = [...logs].reverse();

  /* ── Compliance Deadline Card ── */
  const renderComplianceDeadline = (log) => {
    const dl = log.deadline_date;
    const wdays = log.working_days;
    if (!dl) return null;

    const urgency = getDeadlineUrgency(dl);
    const cfg = URGENCY_CFG[urgency] || URGENCY_CFG.ok;
    const remaining = countWorkingDays(todayStr(), dl);
    const dateLabel = fmtDate(dl);

    return (
      <div
        style={{
          marginTop: "0.75rem",
          padding: "0.75rem 1rem",
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          borderRadius: 8,
          borderLeft: `3px solid ${cfg.border}`,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: cfg.color,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            ⏰ Compliance Deadline
          </span>
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: cfg.color,
              background: darkMode ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.08)",
              padding: "0.1rem 0.45rem",
              borderRadius: 20,
            }}
          >
            {cfg.icon} {cfg.label}
          </span>
        </div>

        {/* Date + days info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.6rem",
                color: cfg.color,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.1rem",
              }}
            >
              Due Date
            </div>
            <span
              style={{ fontSize: "0.88rem", fontWeight: 700, color: cfg.color }}
            >
              {dateLabel}
            </span>
          </div>

          {wdays != null && (
            <div>
              <div
                style={{
                  fontSize: "0.6rem",
                  color: cfg.color,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.1rem",
                }}
              >
                Allotted
              </div>
              <span
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  color: cfg.color,
                }}
              >
                {wdays} working day{wdays !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {remaining !== null && (
            <div>
              <div
                style={{
                  fontSize: "0.6rem",
                  color: cfg.color,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.1rem",
                }}
              >
                Remaining
              </div>
              <span
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  color: cfg.color,
                }}
              >
                {urgency === "overdue"
                  ? "OVERDUE"
                  : urgency === "today"
                    ? "Due today!"
                    : `${remaining} working day${remaining !== 1 ? "s" : ""} left`}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        .spl-modal * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
        .spl-card { animation: spl-fadeup 0.25s ease forwards; transition: transform 0.15s, box-shadow 0.15s; }
        .spl-card:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(238,77,45,0.10) !important; }
        .spl-card-inner { cursor: pointer; }
        .spl-card-inner:hover .spl-expand-hint { opacity: 1 !important; }
        .spl-close-btn:hover { background: ${shopeeLight} !important; color: ${shopeeOrange} !important; border-color: ${shopeeBorder} !important; }
        .spl-footer-btn:hover { background: ${shopeeOrange} !important; color: #fff !important; }
        @keyframes spl-spin { to { transform: rotate(360deg); } }
        @keyframes spl-fadeup { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spl-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spl-slidedown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 600px; } }
        .spl-inprogress { animation: spl-pulse 1.5s ease-in-out infinite; }
        .spl-remarks-panel { animation: spl-slidedown 0.22s ease forwards; overflow: hidden; }
      `}</style>

      <div
        className="spl-modal"
        onClick={onBackdrop}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          backdropFilter: "blur(4px)",
        }}
      >
        <div
          style={{
            background: panelBg,
            borderRadius: 16,
            width: "min(820px, 100%)",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow:
              "0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(238,77,45,0.12)",
            overflow: "hidden",
          }}
        >
          {/* ══ HEADER ══ */}
          <div
            style={{
              background: headerBg,
              borderBottom: `2px solid ${shopeeBorder}`,
              padding: "1.1rem 1.5rem 1rem",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.85rem",
                }}
              >
                <div
                  style={{
                    background: `linear-gradient(135deg, ${shopeeOrange}, #ff7043)`,
                    borderRadius: 10,
                    width: 44,
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.3rem",
                    boxShadow: "0 4px 14px rgba(238,77,45,0.4)",
                    flexShrink: 0,
                  }}
                >
                  📦
                </div>
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: shopeeOrange,
                      }}
                    >
                      Application Logs
                    </h2>
                    {!loading && !error && (
                      <span
                        style={{
                          background: shopeeOrange,
                          color: "#fff",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          padding: "0.1rem 0.55rem",
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
                      gap: "0.4rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    <span style={{ fontSize: "0.72rem", color: textSub }}>
                      Tracking No.
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: shopeeOrange,
                        fontSize: "0.78rem",
                        fontFamily: "monospace",
                        letterSpacing: "0.05em",
                        background: darkMode
                          ? "rgba(238,77,45,0.12)"
                          : "rgba(238,77,45,0.07)",
                        padding: "0.1rem 0.55rem",
                        borderRadius: 5,
                        border: `1px solid ${shopeeBorder}`,
                      }}
                    >
                      {record?.dtn || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                className="spl-close-btn"
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: `1px solid ${divider}`,
                  borderRadius: 8,
                  color: textSub,
                  cursor: "pointer",
                  width: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.9rem",
                  transition: "all 0.15s",
                }}
              >
                ✕
              </button>
            </div>

            {/* Mini step progress strip */}
            {!loading && !error && ascendingLogs.length > 0 && (
              <div
                style={{
                  marginTop: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 0,
                  overflowX: "auto",
                  paddingBottom: "0.25rem",
                }}
              >
                {ascendingLogs.map((log, i) => {
                  const isActive = i === ascendingLogs.length - 1;
                  const meta = stepMeta(log.application_step);
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        minWidth: 60,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        position: "relative",
                      }}
                    >
                      {i !== ascendingLogs.length - 1 && (
                        <div
                          style={{
                            position: "absolute",
                            top: 11,
                            left: "50%",
                            width: "100%",
                            height: 2,
                            background: shopeeOrange,
                            opacity: 0.3,
                            zIndex: 0,
                          }}
                        />
                      )}
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: isActive
                            ? shopeeOrange
                            : darkMode
                              ? "#333"
                              : "#f5f5f5",
                          border: `2px solid ${isActive ? shopeeOrange : meta.color}`,
                          zIndex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: isActive
                            ? `0 0 0 4px rgba(238,77,45,0.18)`
                            : "none",
                          fontSize: "0.55rem",
                        }}
                      >
                        {isActive ? (
                          <span style={{ color: "#fff", fontWeight: 900 }}>
                            ✓
                          </span>
                        ) : (
                          <span>{meta.icon}</span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: "0.58rem",
                          color: isActive ? shopeeOrange : textTert,
                          fontWeight: isActive ? 700 : 400,
                          marginTop: "0.25rem",
                          textAlign: "center",
                          maxWidth: 72,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {log.application_step || "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ══ BODY ══ */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: "1.25rem 1.5rem",
              background: darkMode ? "#141414" : "#f8f8f8",
            }}
          >
            {loading && (
              <div style={{ padding: "3rem", textAlign: "center" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    border: `3px solid ${shopeeBorder}`,
                    borderTopColor: shopeeOrange,
                    animation: "spl-spin 0.7s linear infinite",
                    margin: "0 auto 1rem",
                  }}
                />
                <p style={{ color: textSub, fontSize: "0.88rem", margin: 0 }}>
                  Fetching order activity…
                </p>
              </div>
            )}

            {!loading && error && (
              <div
                style={{
                  padding: "2.5rem",
                  textAlign: "center",
                  background: "#fff5f5",
                  borderRadius: 12,
                  border: "1px solid #fecaca",
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
                  😔
                </div>
                <p
                  style={{
                    color: "#dc2626",
                    fontSize: "0.88rem",
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
                <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>
                  📭
                </div>
                <p style={{ color: textSub, fontSize: "0.88rem", margin: 0 }}>
                  No activity found for this application.
                </p>
              </div>
            )}

            {!loading && !error && logs.length > 0 && (
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 19,
                    top: 20,
                    bottom: 20,
                    width: 2,
                    background: `linear-gradient(to bottom, ${shopeeOrange}66, ${divider})`,
                    borderRadius: 2,
                    zIndex: 0,
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  {ascendingLogs.map((log, idx) => {
                    const meta = stepMeta(log.application_step);
                    const sc = statusCfg(log.application_status);
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
                        className="spl-card"
                        style={{
                          animationDelay: `${idx * 0.05}s`,
                          display: "flex",
                          gap: "0.85rem",
                          alignItems: "flex-start",
                          position: "relative",
                          zIndex: 1,
                        }}
                      >
                        {/* Timeline dot */}
                        <div style={{ flexShrink: 0 }}>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: "50%",
                              background: isLatest
                                ? `linear-gradient(135deg, ${shopeeOrange}, #ff7043)`
                                : darkMode
                                  ? "#2e2e2e"
                                  : "#ffffff",
                              border: `2px solid ${isLatest ? shopeeOrange : meta.color}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1.05rem",
                              boxShadow: isLatest
                                ? `0 0 0 4px rgba(238,77,45,0.15)`
                                : "0 1px 4px rgba(0,0,0,0.08)",
                            }}
                          >
                            {isLatest ? (
                              <span style={{ filter: "brightness(10)" }}>
                                {meta.icon}
                              </span>
                            ) : (
                              meta.icon
                            )}
                          </div>
                        </div>

                        {/* Card */}
                        <div
                          style={{
                            flex: 1,
                            background: cardBg,
                            border: `1px solid ${isLatest ? shopeeBorder : cardBorder}`,
                            borderLeft: `3px solid ${isLatest ? shopeeOrange : meta.color}`,
                            borderRadius: 10,
                            boxShadow: isLatest
                              ? "0 2px 12px rgba(238,77,45,0.10)"
                              : "0 1px 4px rgba(0,0,0,0.04)",
                            overflow: "hidden",
                          }}
                        >
                          {/* ── Card Header ── */}
                          <div style={{ padding: "0.9rem 1rem" }}>
                            {/* Top row: step + status */}
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
                                  gap: "0.45rem",
                                  flexWrap: "wrap",
                                }}
                              >
                                {log.del_index != null && (
                                  <span
                                    style={{
                                      background: darkMode
                                        ? "#2e2e2e"
                                        : "#f0f0f0",
                                      color: textSub,
                                      fontSize: "0.63rem",
                                      fontWeight: 700,
                                      padding: "0.1rem 0.4rem",
                                      borderRadius: 4,
                                      border: `1px solid ${divider}`,
                                    }}
                                  >
                                    #{log.del_index}
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: "0.9rem",
                                    fontWeight: 700,
                                    color: isLatest ? shopeeOrange : textMain,
                                  }}
                                >
                                  {log.application_step || "—"}
                                </span>
                                {isLatest && (
                                  <span
                                    style={{
                                      background: shopeeOrange,
                                      color: "#fff",
                                      fontSize: "0.6rem",
                                      fontWeight: 700,
                                      padding: "0.1rem 0.45rem",
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
                                      background: darkMode
                                        ? "rgba(245,158,11,0.15)"
                                        : "rgba(245,158,11,0.1)",
                                      color: "#f59e0b",
                                      border: "1px solid #f59e0b",
                                      fontSize: "0.6rem",
                                      fontWeight: 700,
                                      padding: "0.1rem 0.45rem",
                                      borderRadius: 20,
                                    }}
                                  >
                                    ⏰ Has Deadline
                                  </span>
                                )}
                              </div>
                              {log.application_status && (
                                <span
                                  style={{
                                    background: sc.bg,
                                    color: sc.text,
                                    border: `1px solid ${sc.border}`,
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    padding: "0.2rem 0.65rem",
                                    borderRadius: 20,
                                    whiteSpace: "nowrap",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: "50%",
                                      background: sc.dot,
                                      flexShrink: 0,
                                    }}
                                  />
                                  {log.application_status}
                                </span>
                              )}
                            </div>

                            {/* User + decision row */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                                marginTop: "0.5rem",
                                flexWrap: "wrap",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                }}
                              >
                                <div
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: "50%",
                                    background: `linear-gradient(135deg, ${meta.color}, ${meta.color}99)`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#fff",
                                    fontSize: "0.6rem",
                                    fontWeight: 700,
                                  }}
                                >
                                  {(log.user_name || "?")[0].toUpperCase()}
                                </div>
                                <span
                                  style={{
                                    fontSize: "0.78rem",
                                    color: textSub,
                                    fontWeight: 500,
                                  }}
                                >
                                  {log.user_name || "—"}
                                </span>
                              </div>
                              {log.application_decision && (
                                <>
                                  <span style={{ color: divider }}>·</span>
                                  <span
                                    style={{
                                      fontSize: "0.76rem",
                                      color: textSub,
                                    }}
                                  >
                                    Decision:{" "}
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        color: textMain,
                                      }}
                                    >
                                      {log.application_decision}
                                    </span>
                                  </span>
                                </>
                              )}
                            </div>

                            {/* ── Dates row + Action Type badge ── */}
                            <div
                              style={{
                                display: "flex",
                                gap: "1.5rem",
                                marginTop: "0.65rem",
                                paddingTop: "0.65rem",
                                borderTop: `1px dashed ${divider}`,
                                flexWrap: "wrap",
                                alignItems: "flex-end",
                              }}
                            >
                              {/* Started */}
                              <div>
                                <div
                                  style={{
                                    fontSize: "0.6rem",
                                    color: textTert,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    marginBottom: "0.15rem",
                                  }}
                                >
                                  Started
                                </div>
                                {startDt ? (
                                  <div
                                    style={{
                                      fontSize: "0.78rem",
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        color: textMain,
                                      }}
                                    >
                                      {startDt.date}
                                    </span>
                                    <span
                                      style={{
                                        color: textTert,
                                        marginLeft: "0.35rem",
                                      }}
                                    >
                                      {startDt.time}
                                    </span>
                                  </div>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: "0.78rem",
                                      color: textTert,
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
                                    fontSize: "0.6rem",
                                    color: doneDt ? "#059669" : textTert,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    marginBottom: "0.15rem",
                                  }}
                                >
                                  {doneDt ? "✓ Accomplished" : "Accomplished"}
                                </div>
                                {doneDt ? (
                                  <div
                                    style={{
                                      fontSize: "0.78rem",
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        color: "#059669",
                                      }}
                                    >
                                      {doneDt.date}
                                    </span>
                                    <span
                                      style={{
                                        color: textTert,
                                        marginLeft: "0.35rem",
                                      }}
                                    >
                                      {doneDt.time}
                                    </span>
                                  </div>
                                ) : (
                                  <span
                                    className="spl-inprogress"
                                    style={{
                                      fontSize: "0.78rem",
                                      color: shopeeOrange,
                                      fontWeight: 600,
                                    }}
                                  >
                                    In Progress…
                                  </span>
                                )}
                              </div>

                              {/* ── Action Type badge — sa tabi ng accomplished ── */}
                              {log.action_type && (
                                <div>
                                  <div
                                    style={{
                                      fontSize: "0.6rem",
                                      color: "#6366f1",
                                      fontWeight: 700,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                      marginBottom: "0.15rem",
                                    }}
                                  >
                                    ⚡ Action Type
                                  </div>
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      padding: "0.2rem 0.65rem",
                                      background: darkMode
                                        ? "rgba(99,102,241,0.15)"
                                        : "rgba(99,102,241,0.08)",
                                      border: "1px solid rgba(99,102,241,0.35)",
                                      borderRadius: 20,
                                      fontSize: "0.75rem",
                                      fontWeight: 600,
                                      color: "#6366f1",
                                    }}
                                  >
                                    {log.action_type}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Compliance Deadline */}
                            {isCompliance && renderComplianceDeadline(log)}
                          </div>

                          {/* ── Always-visible details panel ── */}
                          <div
                            style={{
                              borderTop: `1px solid ${remarksBorder}`,
                              background: remarksBg,
                              padding: "0.85rem 1rem",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.75rem",
                            }}
                          >
                            {/* REASSIGNMENT details */}
                            {log.action_type === "REASSIGNMENT" && (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.65rem",
                                  padding: "0.75rem",
                                  background: darkMode
                                    ? "rgba(124,58,237,0.08)"
                                    : "rgba(124,58,237,0.05)",
                                  border: "1px solid rgba(124,58,237,0.2)",
                                  borderRadius: 8,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "0.65rem",
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
                                    gap: "1rem",
                                    flexWrap: "wrap",
                                    alignItems: "flex-end",
                                  }}
                                >
                                  {log.reassigned_from_user_name && (
                                    <div style={{ flex: 1, minWidth: 120 }}>
                                      <div
                                        style={{
                                          fontSize: "0.6rem",
                                          fontWeight: 700,
                                          color: "#9ca3af",
                                          textTransform: "uppercase",
                                          letterSpacing: "0.05em",
                                          marginBottom: "0.25rem",
                                        }}
                                      >
                                        From
                                      </div>
                                      <div
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "0.35rem",
                                          padding: "0.25rem 0.6rem",
                                          background: darkMode
                                            ? "rgba(239,68,68,0.1)"
                                            : "rgba(239,68,68,0.07)",
                                          border:
                                            "1px solid rgba(239,68,68,0.25)",
                                          borderRadius: 6,
                                          fontSize: "0.78rem",
                                          fontWeight: 600,
                                          color: "#ef4444",
                                        }}
                                      >
                                        👤 {log.reassigned_from_user_name}
                                      </div>
                                    </div>
                                  )}
                                  {log.reassigned_from_user_name &&
                                    log.reassigned_to_user_name && (
                                      <div
                                        style={{
                                          color: "#7c3aed",
                                          fontSize: "1rem",
                                          paddingBottom: "0.25rem",
                                        }}
                                      >
                                        →
                                      </div>
                                    )}
                                  {log.reassigned_to_user_name && (
                                    <div style={{ flex: 1, minWidth: 120 }}>
                                      <div
                                        style={{
                                          fontSize: "0.6rem",
                                          fontWeight: 700,
                                          color: "#9ca3af",
                                          textTransform: "uppercase",
                                          letterSpacing: "0.05em",
                                          marginBottom: "0.25rem",
                                        }}
                                      >
                                        To
                                      </div>
                                      <div
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "0.35rem",
                                          padding: "0.25rem 0.6rem",
                                          background: darkMode
                                            ? "rgba(16,185,129,0.1)"
                                            : "rgba(16,185,129,0.07)",
                                          border:
                                            "1px solid rgba(16,185,129,0.25)",
                                          borderRadius: 6,
                                          fontSize: "0.78rem",
                                          fontWeight: 600,
                                          color: "#10b981",
                                        }}
                                      >
                                        👤 {log.reassigned_to_user_name}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "1rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {log.reassigned_by_user_name && (
                                    <div>
                                      <div
                                        style={{
                                          fontSize: "0.6rem",
                                          fontWeight: 700,
                                          color: "#9ca3af",
                                          textTransform: "uppercase",
                                          letterSpacing: "0.05em",
                                          marginBottom: "0.25rem",
                                        }}
                                      >
                                        Reassigned By
                                      </div>
                                      <div
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "0.35rem",
                                          padding: "0.25rem 0.6rem",
                                          background: darkMode
                                            ? "rgba(124,58,237,0.12)"
                                            : "rgba(124,58,237,0.07)",
                                          border:
                                            "1px solid rgba(124,58,237,0.25)",
                                          borderRadius: 6,
                                          fontSize: "0.78rem",
                                          fontWeight: 600,
                                          color: "#7c3aed",
                                        }}
                                      >
                                        🔑 {log.reassigned_by_user_name}
                                      </div>
                                    </div>
                                  )}
                                  {log.reassigned_at && (
                                    <div>
                                      <div
                                        style={{
                                          fontSize: "0.6rem",
                                          fontWeight: 700,
                                          color: "#9ca3af",
                                          textTransform: "uppercase",
                                          letterSpacing: "0.05em",
                                          marginBottom: "0.25rem",
                                        }}
                                      >
                                        Reassigned At
                                      </div>
                                      <div
                                        style={{
                                          fontSize: "0.78rem",
                                          fontWeight: 600,
                                          color: textMain,
                                        }}
                                      >
                                        {fmt(log.reassigned_at)?.date}{" "}
                                        <span style={{ color: textSub }}>
                                          {fmt(log.reassigned_at)?.time}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {log.reassignment_reason && (
                                  <div>
                                    <div
                                      style={{
                                        fontSize: "0.6rem",
                                        fontWeight: 700,
                                        color: "#9ca3af",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        marginBottom: "0.25rem",
                                      }}
                                    >
                                      Reason
                                    </div>
                                    <span
                                      style={{
                                        fontSize: "0.78rem",
                                        fontWeight: 600,
                                        color: textMain,
                                        padding: "0.2rem 0.6rem",
                                        background: darkMode
                                          ? "rgba(124,58,237,0.1)"
                                          : "rgba(124,58,237,0.06)",
                                        border:
                                          "1px solid rgba(124,58,237,0.2)",
                                        borderRadius: 6,
                                        display: "inline-block",
                                      }}
                                    >
                                      {log.reassignment_reason}
                                    </span>
                                  </div>
                                )}
                                {log.reassignment_remarks && (
                                  <div>
                                    <div
                                      style={{
                                        fontSize: "0.6rem",
                                        fontWeight: 700,
                                        color: "#9ca3af",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        marginBottom: "0.25rem",
                                      }}
                                    >
                                      Remarks
                                    </div>
                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: "0.82rem",
                                        color: textMain,
                                        lineHeight: 1.65,
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        padding: "0.65rem 0.85rem",
                                        background: darkMode ? "#111" : "#fff",
                                        border:
                                          "1px solid rgba(124,58,237,0.2)",
                                        borderRadius: 8,
                                        borderLeft: "3px solid #7c3aed",
                                      }}
                                    >
                                      {log.reassignment_remarks}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* REROUTE details */}
                            {log.action_type === "REROUTE" && (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.65rem",
                                  padding: "0.75rem",
                                  background: darkMode
                                    ? "rgba(8,145,178,0.08)"
                                    : "rgba(8,145,178,0.05)",
                                  border: "1px solid rgba(8,145,178,0.2)",
                                  borderRadius: 8,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "0.65rem",
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
                                    gap: "1rem",
                                    flexWrap: "wrap",
                                    alignItems: "flex-end",
                                  }}
                                >
                                  {log.reroute_from_step && (
                                    <div style={{ flex: 1, minWidth: 120 }}>
                                      <div
                                        style={{
                                          fontSize: "0.6rem",
                                          fontWeight: 700,
                                          color: "#9ca3af",
                                          textTransform: "uppercase",
                                          letterSpacing: "0.05em",
                                          marginBottom: "0.25rem",
                                        }}
                                      >
                                        From Step
                                      </div>
                                      <div
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          padding: "0.25rem 0.6rem",
                                          background: darkMode
                                            ? "rgba(239,68,68,0.1)"
                                            : "rgba(239,68,68,0.07)",
                                          border:
                                            "1px solid rgba(239,68,68,0.25)",
                                          borderRadius: 6,
                                          fontSize: "0.78rem",
                                          fontWeight: 600,
                                          color: "#ef4444",
                                        }}
                                      >
                                        {log.reroute_from_step}
                                      </div>
                                    </div>
                                  )}
                                  {log.reroute_from_step &&
                                    log.reroute_target_step && (
                                      <div
                                        style={{
                                          color: "#0891b2",
                                          fontSize: "1rem",
                                          paddingBottom: "0.25rem",
                                        }}
                                      >
                                        →
                                      </div>
                                    )}
                                  {log.reroute_target_step && (
                                    <div style={{ flex: 1, minWidth: 120 }}>
                                      <div
                                        style={{
                                          fontSize: "0.6rem",
                                          fontWeight: 700,
                                          color: "#9ca3af",
                                          textTransform: "uppercase",
                                          letterSpacing: "0.05em",
                                          marginBottom: "0.25rem",
                                        }}
                                      >
                                        Target Step
                                      </div>
                                      <div
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          padding: "0.25rem 0.6rem",
                                          background: darkMode
                                            ? "rgba(16,185,129,0.1)"
                                            : "rgba(16,185,129,0.07)",
                                          border:
                                            "1px solid rgba(16,185,129,0.25)",
                                          borderRadius: 6,
                                          fontSize: "0.78rem",
                                          fontWeight: 600,
                                          color: "#10b981",
                                        }}
                                      >
                                        {log.reroute_target_step}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "1rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {log.rerouted_by_user_name && (
                                    <div>
                                      <div
                                        style={{
                                          fontSize: "0.6rem",
                                          fontWeight: 700,
                                          color: "#9ca3af",
                                          textTransform: "uppercase",
                                          letterSpacing: "0.05em",
                                          marginBottom: "0.25rem",
                                        }}
                                      >
                                        Rerouted By
                                      </div>
                                      <div
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "0.35rem",
                                          padding: "0.25rem 0.6rem",
                                          background: darkMode
                                            ? "rgba(8,145,178,0.12)"
                                            : "rgba(8,145,178,0.07)",
                                          border:
                                            "1px solid rgba(8,145,178,0.25)",
                                          borderRadius: 6,
                                          fontSize: "0.78rem",
                                          fontWeight: 600,
                                          color: "#0891b2",
                                        }}
                                      >
                                        🔑 {log.rerouted_by_user_name}
                                      </div>
                                    </div>
                                  )}
                                  {log.rerouted_at && (
                                    <div>
                                      <div
                                        style={{
                                          fontSize: "0.6rem",
                                          fontWeight: 700,
                                          color: "#9ca3af",
                                          textTransform: "uppercase",
                                          letterSpacing: "0.05em",
                                          marginBottom: "0.25rem",
                                        }}
                                      >
                                        Rerouted At
                                      </div>
                                      <div
                                        style={{
                                          fontSize: "0.78rem",
                                          fontWeight: 600,
                                          color: textMain,
                                        }}
                                      >
                                        {fmt(log.rerouted_at)?.date}{" "}
                                        <span style={{ color: textSub }}>
                                          {fmt(log.rerouted_at)?.time}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {log.reroute_reason && (
                                  <div>
                                    <div
                                      style={{
                                        fontSize: "0.6rem",
                                        fontWeight: 700,
                                        color: "#9ca3af",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        marginBottom: "0.25rem",
                                      }}
                                    >
                                      Reason
                                    </div>
                                    <span
                                      style={{
                                        fontSize: "0.78rem",
                                        fontWeight: 600,
                                        color: textMain,
                                        padding: "0.2rem 0.6rem",
                                        background: darkMode
                                          ? "rgba(8,145,178,0.1)"
                                          : "rgba(8,145,178,0.06)",
                                        border: "1px solid rgba(8,145,178,0.2)",
                                        borderRadius: 6,
                                        display: "inline-block",
                                      }}
                                    >
                                      {log.reroute_reason}
                                    </span>
                                  </div>
                                )}
                                {log.reroute_remarks && (
                                  <div>
                                    <div
                                      style={{
                                        fontSize: "0.6rem",
                                        fontWeight: 700,
                                        color: "#9ca3af",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        marginBottom: "0.25rem",
                                      }}
                                    >
                                      Remarks
                                    </div>
                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: "0.82rem",
                                        color: textMain,
                                        lineHeight: 1.65,
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        padding: "0.65rem 0.85rem",
                                        background: darkMode ? "#111" : "#fff",
                                        border: "1px solid rgba(8,145,178,0.2)",
                                        borderRadius: 8,
                                        borderLeft: "3px solid #0891b2",
                                      }}
                                    >
                                      {log.reroute_remarks}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Decision Result */}
                            {log.decision_result && (
                              <div>
                                <div
                                  style={{
                                    fontSize: "0.62rem",
                                    fontWeight: 700,
                                    color: "#0891b2",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.07em",
                                    marginBottom: "0.35rem",
                                  }}
                                >
                                  📊 Decision Result
                                </div>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "0.2rem 0.65rem",
                                    background: darkMode
                                      ? "rgba(8,145,178,0.15)"
                                      : "rgba(8,145,178,0.08)",
                                    border: "1px solid rgba(8,145,178,0.35)",
                                    borderRadius: 20,
                                    fontSize: "0.78rem",
                                    fontWeight: 600,
                                    color: "#0891b2",
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
                                    fontSize: "0.62rem",
                                    fontWeight: 700,
                                    color: "#b45309",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.07em",
                                    marginBottom: "0.35rem",
                                  }}
                                >
                                  🏛️ Decision Authority
                                </div>
                                <div
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.4rem",
                                    padding: "0.3rem 0.75rem",
                                    background: darkMode
                                      ? "rgba(180,83,9,0.15)"
                                      : "rgba(245,158,11,0.08)",
                                    border: "1px solid rgba(245,158,11,0.35)",
                                    borderRadius: 8,
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    color: "#b45309",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 22,
                                      height: 22,
                                      borderRadius: "50%",
                                      background:
                                        "linear-gradient(135deg, #f59e0b, #d97706)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "#fff",
                                      fontSize: "0.65rem",
                                      fontWeight: 700,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {log.decision_authority_name[0].toUpperCase()}
                                  </div>
                                  {log.decision_authority_name}
                                </div>
                              </div>
                            )}

                            {/* Remarks */}
                            <div>
                              <div
                                style={{
                                  fontSize: "0.62rem",
                                  fontWeight: 700,
                                  color: shopeeOrange,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.07em",
                                  marginBottom: "0.5rem",
                                }}
                              >
                                💬 Remarks
                              </div>
                              {hasRemarks ? (
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "0.82rem",
                                    color: textMain,
                                    lineHeight: 1.65,
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    padding: "0.65rem 0.85rem",
                                    background: darkMode ? "#111" : "#fff",
                                    border: `1px solid ${remarksBorder}`,
                                    borderRadius: 8,
                                    borderLeft: `3px solid ${shopeeOrange}`,
                                  }}
                                >
                                  {log.application_remarks}
                                </p>
                              ) : (
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "0.82rem",
                                    color: textTert,
                                    fontStyle: "italic",
                                    padding: "0.5rem 0.85rem",
                                  }}
                                >
                                  No remarks recorded for this step.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ══ FOOTER ══ */}
          <div
            style={{
              borderTop: `1px solid ${divider}`,
              padding: "0.85rem 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: darkMode ? "#111" : "#fafafa",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "0.75rem", color: textTert }}>
              {loading
                ? "Fetching activity…"
                : error
                  ? "Failed to load"
                  : `${logs.length} step${logs.length !== 1 ? "s" : ""} recorded · click any card to view remarks`}
            </span>
            <button
              className="spl-footer-btn"
              onClick={onClose}
              style={{
                padding: "0.5rem 1.5rem",
                background: "transparent",
                border: `1.5px solid ${shopeeOrange}`,
                borderRadius: 8,
                color: shopeeOrange,
                cursor: "pointer",
                fontSize: "0.82rem",
                fontWeight: 700,
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
