import { useState } from "react";

/* Status look for a single attempt in the history */
const ATTEMPT_STYLES = {
  sent: { label: "Sent", icon: "✅", color: "#059669" },
  failed: { label: "Failed", icon: "❌", color: "#dc2626" },
};

const DOC_ICONS = {
  OOP: "💳",
  AOOP: "➕",
  AR: "🧾",
  NOTE: "📝",
};

const STATUS = {
  sent: { label: "Sent", icon: "✅", color: "#059669" },
  failed: { label: "Failed", icon: "❌", color: "#dc2626" },
  sending: { label: "Sending...", icon: "⏳", color: "#d97706" },
};

export default function EmailNotificationsModal({
  row,
  logs,
  colors,
  onResend,
  onClose,
}) {
  const [filter, setFilter] = useState("all"); // all | sent | failed
  const [openHistoryIds, setOpenHistoryIds] = useState([]); // log ids with history expanded

  const toggleHistory = (id) =>
    setOpenHistoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  if (!row) return null;

  const failedCount = logs.filter((l) => l.status === "failed").length;
  const sentCount = logs.filter((l) => l.status === "sent").length;
  const visible = [...logs]
    .reverse() // newest first
    .filter((l) => filter === "all" || l.status === filter);

  const tabs = [
    { id: "all", label: "All", count: logs.length },
    { id: "sent", label: "Sent", count: sentCount },
    { id: "failed", label: "Failed", count: failedCount },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.pageBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          width: "720px",
          maxWidth: "94vw",
          height: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1.1rem",
            background: colors.cardBg,
            borderBottom: `1px solid ${colors.cardBorder}`,
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              📧 Email Notifications · {row.referenceNo}
            </div>
            <div style={{ fontSize: "0.68rem", color: colors.textTertiary }}>
              {row.applicantCompany}
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close"
            style={{
              border: "none",
              background: "transparent",
              color: colors.textTertiary,
              fontSize: "1.2rem",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {/* Failed banner */}
        {failedCount > 0 && (
          <div
            style={{
              margin: "0.75rem 1.1rem 0",
              padding: "0.5rem 0.75rem",
              fontSize: "0.72rem",
              color: "#dc2626",
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.35)",
              borderRadius: "8px",
              flexShrink: 0,
            }}
          >
            ⚠️ {failedCount} email{failedCount > 1 ? "s" : ""} failed to send.
            The client has not received{" "}
            {failedCount > 1 ? "these documents" : "this document"} yet. Click{" "}
            <strong>Resend</strong> to try again.
          </div>
        )}

        {/* Filter tabs */}
        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            padding: "0.75rem 1.1rem 0",
            flexShrink: 0,
          }}
        >
          {tabs.map((t) => {
            const active = filter === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                style={{
                  padding: "0.3rem 0.75rem",
                  fontSize: "0.68rem",
                  fontWeight: active ? 700 : 500,
                  borderRadius: "999px",
                  cursor: "pointer",
                  border: `1px solid ${active ? "#4CAF50" : colors.cardBorder}`,
                  background: active ? "rgba(76,175,80,0.1)" : "transparent",
                  color: active ? colors.textPrimary : colors.textTertiary,
                }}
              >
                {t.label} ({t.count})
              </button>
            );
          })}
        </div>

        {/* List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.75rem 1.1rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}
        >
          {visible.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                fontSize: "0.72rem",
                color: colors.textTertiary,
              }}
            >
              No emails to show.
            </div>
          ) : (
            visible.map((l) => {
              const s = STATUS[l.status];
              const sending = l.status === "sending";
              return (
                <div
                  key={l.id}
                  style={{
                    background: colors.cardBg,
                    border: `1px solid ${
                      l.status === "failed"
                        ? "rgba(239,68,68,0.45)"
                        : colors.cardBorder
                    }`,
                    borderRadius: "10px",
                    padding: "0.65rem 0.8rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: colors.textPrimary,
                      }}
                    >
                      {DOC_ICONS[l.docType]} {l.subject}
                    </span>
                    <span
                      style={{
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        padding: "0.1rem 0.55rem",
                        borderRadius: "999px",
                        color: s.color,
                        background: `${s.color}1A`,
                        border: `1px solid ${s.color}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.icon} {s.label}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: "0.4rem",
                      display: "grid",
                      gridTemplateColumns: "90px 1fr",
                      rowGap: "0.15rem",
                      fontSize: "0.66rem",
                    }}
                  >
                    <span style={{ color: colors.textTertiary }}>To</span>
                    <span style={{ color: colors.textPrimary }}>{l.to}</span>
                    {l.attachment && (
                      <>
                        <span style={{ color: colors.textTertiary }}>
                          Attachment
                        </span>
                        <span style={{ color: colors.textPrimary }}>
                          📎 {l.attachment}
                        </span>
                      </>
                    )}
                    <span style={{ color: colors.textTertiary }}>
                      {l.status === "failed" ? "Last attempt" : "Sent on"}
                    </span>
                    <span style={{ color: colors.textPrimary }}>
                      {l.sentAt}
                    </span>
                    <span style={{ color: colors.textTertiary }}>Attempts</span>
                    <span style={{ color: colors.textPrimary }}>
                      {l.attempts}
                    </span>
                  </div>

                  {l.body && (
                    <div
                      style={{
                        marginTop: "0.4rem",
                        padding: "0.4rem 0.55rem",
                        fontSize: "0.66rem",
                        color: colors.textPrimary,
                        background: colors.tableBg,
                        border: `1px solid ${colors.tableBorder}`,
                        borderRadius: "6px",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.5,
                      }}
                    >
                      {l.body}
                    </div>
                  )}

                  {l.status === "failed" && l.error && (
                    <div
                      style={{
                        marginTop: "0.45rem",
                        padding: "0.35rem 0.55rem",
                        fontSize: "0.64rem",
                        color: "#dc2626",
                        background: "rgba(239,68,68,0.08)",
                        borderRadius: "6px",
                      }}
                    >
                      Reason: {l.error}
                    </div>
                  )}

                  {(l.history || []).length > 0 && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <button
                        onClick={() => toggleHistory(l.id)}
                        style={{
                          border: "none",
                          background: "transparent",
                          padding: 0,
                          cursor: "pointer",
                          fontSize: "0.64rem",
                          fontWeight: 600,
                          color: colors.textTertiary,
                        }}
                      >
                        {openHistoryIds.includes(l.id) ? "▾" : "▸"} History (
                        {l.history.length}{" "}
                        {l.history.length === 1 ? "attempt" : "attempts"})
                      </button>

                      {openHistoryIds.includes(l.id) && (
                        <div
                          style={{
                            marginTop: "0.35rem",
                            border: `1px solid ${colors.tableBorder}`,
                            borderRadius: "8px",
                            overflow: "hidden",
                          }}
                        >
                          {[...l.history].reverse().map((h, i) => {
                            const a = ATTEMPT_STYLES[h.status];
                            return (
                              <div
                                key={h.attempt}
                                style={{
                                  padding: "0.4rem 0.6rem",
                                  fontSize: "0.64rem",
                                  borderTop:
                                    i === 0
                                      ? "none"
                                      : `1px solid ${colors.tableBorder}`,
                                  background:
                                    h.status === "failed"
                                      ? "rgba(239,68,68,0.06)"
                                      : "transparent",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                  }}
                                >
                                  <span
                                    style={{
                                      color: colors.textTertiary,
                                      minWidth: "22px",
                                    }}
                                  >
                                    #{h.attempt}
                                  </span>
                                  <span
                                    style={{
                                      color: a.color,
                                      fontWeight: 700,
                                      minWidth: "58px",
                                    }}
                                  >
                                    {a.icon} {a.label}
                                  </span>
                                  <span style={{ color: colors.textPrimary }}>
                                    {h.at}
                                  </span>
                                </div>
                                {h.error && (
                                  <div
                                    style={{
                                      marginTop: "0.2rem",
                                      marginLeft: "22px",
                                      color: "#dc2626",
                                    }}
                                  >
                                    Reason: {h.error}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: "0.5rem",
                    }}
                  >
                    <button
                      onClick={() => onResend(l.id)}
                      disabled={sending}
                      style={{
                        padding: "0.35rem 0.85rem",
                        fontSize: "0.66rem",
                        fontWeight: 700,
                        borderRadius: "6px",
                        cursor: sending ? "not-allowed" : "pointer",
                        border:
                          l.status === "failed"
                            ? "none"
                            : `1px solid ${colors.cardBorder}`,
                        background:
                          l.status === "failed"
                            ? "linear-gradient(135deg,#ef4444,#dc2626)"
                            : "transparent",
                        color:
                          l.status === "failed" ? "#fff" : colors.textPrimary,
                        opacity: sending ? 0.6 : 1,
                      }}
                    >
                      {sending ? "Sending..." : "🔁 Resend"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
