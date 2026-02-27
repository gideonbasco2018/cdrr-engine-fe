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

/* ── step icon map ── */
const stepMeta = (step) => {
  const s = step?.toLowerCase() || "";
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

  const onBackdrop = (e) => e.target === e.currentTarget && onClose();

  /* Shopee palette */
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

  /* ascending = oldest first, so reverse the newest-first API order */
  const ascendingLogs = [...logs].reverse();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        .spl-modal * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
        .spl-card:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(238,77,45,0.10) !important; }
        .spl-close-btn:hover { background: ${shopeeLight} !important; color: ${shopeeOrange} !important; border-color: ${shopeeBorder} !important; }
        .spl-footer-btn:hover { background: ${shopeeOrange} !important; color: #fff !important; }
        @keyframes spl-spin { to { transform: rotate(360deg); } }
        @keyframes spl-fadeup { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .spl-card { animation: spl-fadeup 0.25s ease forwards; transition: transform 0.15s, box-shadow 0.15s; }
        @keyframes spl-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .spl-inprogress { animation: spl-pulse 1.5s ease-in-out infinite; }
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

            {/* Mini step progress strip — ASCENDING (oldest → latest) */}
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
                  const isActive = i === ascendingLogs.length - 1; // last = latest/active step
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
                      {/* connector line to the RIGHT of every dot except the last */}
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
            {/* Loading */}
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

            {/* Error */}
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

            {/* Empty */}
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

            {/* Timeline list — also ascending */}
            {!loading && !error && logs.length > 0 && (
              <div style={{ position: "relative" }}>
                {/* Vertical guide line */}
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
                    const isLatest = idx === ascendingLogs.length - 1; // ascending: last = latest
                    const startDt = fmt(log.start_date);
                    const doneDt = fmt(log.accomplished_date);

                    return (
                      <div
                        key={log.id ?? idx}
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
                        {/* Dot */}
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
                            padding: "0.9rem 1rem",
                            boxShadow: isLatest
                              ? "0 2px 12px rgba(238,77,45,0.10)"
                              : "0 1px 4px rgba(0,0,0,0.04)",
                          }}
                        >
                          {/* Top row: step name + status badge */}
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
                                    style={{ fontWeight: 600, color: textMain }}
                                  >
                                    {log.application_decision}
                                  </span>
                                </span>
                              </>
                            )}
                          </div>

                          {/* Dates row */}
                          <div
                            style={{
                              display: "flex",
                              gap: "1.5rem",
                              marginTop: "0.65rem",
                              paddingTop: "0.65rem",
                              borderTop: `1px dashed ${divider}`,
                              flexWrap: "wrap",
                            }}
                          >
                            {startDt ? (
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
                                <div
                                  style={{
                                    fontSize: "0.78rem",
                                    lineHeight: 1.4,
                                  }}
                                >
                                  <span
                                    style={{ fontWeight: 600, color: textMain }}
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
                              </div>
                            ) : (
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
                                <span
                                  style={{
                                    fontSize: "0.78rem",
                                    color: textTert,
                                  }}
                                >
                                  —
                                </span>
                              </div>
                            )}

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
                  : `${logs.length} step${logs.length !== 1 ? "s" : ""} recorded`}
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
