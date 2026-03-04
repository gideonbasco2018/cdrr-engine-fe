// src/components/NotificationBell.jsx
//
// I-render ito sa iyong NAVBAR / HEADER component, hindi sa ViewDetailsModal.
// Example usage:
//   import NotificationBell from "../components/NotificationBell";
//   <NotificationBell currentUser={currentUser} darkMode={darkMode} colors={colors} />

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearReadNotifications,
} from "../api/notifications";

const POLL_INTERVAL_MS = 30_000; // poll every 60 seconds

export default function NotificationBell({ currentUser, darkMode, colors }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const intervalRef = useRef(null);

  const username = currentUser?.username;

  // ── Computed ──────────────────────────────────────────────────────
  const unread = notifications.filter((n) => !n.is_read);

  // ── Fetch all notifications ───────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!username) return;
    try {
      const data = await getNotifications(username);
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      // silently fail — non-critical
    }
  }, [username]);

  // ── Poll every 60s ────────────────────────────────────────────────
  useEffect(() => {
    if (!username) return;
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [username, fetchNotifications]);

  // ── Close panel on outside click ─────────────────────────────────
  useEffect(() => {
    const handleOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleMarkRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    } catch {
      // silently fail
    }
  };

  const handleMarkAllRead = async () => {
    if (!username) return;
    try {
      await markAllNotificationsAsRead(username);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // silently fail
    }
  };

  const handleClearRead = async () => {
    if (!username) return;
    try {
      await clearReadNotifications(username);
      setNotifications((prev) => prev.filter((n) => !n.is_read));
    } catch {
      // silently fail
    }
  };

  // ── Dynamic colors ────────────────────────────────────────────────
  const bg = darkMode ? "#1e1e2e" : "#ffffff";
  const border = darkMode ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const hoverBg = darkMode ? "rgba(255,255,255,0.04)" : "#f9fafb";
  const textPrimary = colors?.textPrimary ?? (darkMode ? "#f0f0f0" : "#111827");
  const textMuted = colors?.textTertiary ?? (darkMode ? "#888" : "#9ca3af");
  const unreadRowBg = darkMode
    ? "rgba(33,150,243,0.07)"
    : "rgba(33,150,243,0.04)";

  // ── Format time ───────────────────────────────────────────────────
  const fmtTime = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      {/* ── Bell Button ───────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        style={{
          position: "relative",
          width: 36,
          height: 36,
          borderRadius: "8px",
          border: `1px solid ${border}`,
          background: "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.1rem",
          transition: "background 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = hoverBg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        🔔
        {/* Unread badge */}
        {unread.length > 0 && (
          <span
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              minWidth: 18,
              height: 18,
              borderRadius: "50%",
              background: "#ef4444",
              color: "#fff",
              fontSize: "0.58rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
              border: "2px solid " + bg,
              lineHeight: 1,
            }}
          >
            {unread.length > 99 ? "99+" : unread.length}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ────────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 10px)",
            width: 360,
            maxHeight: 520,
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "0.9rem 1.1rem",
              borderBottom: `1px solid ${border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  color: textPrimary,
                }}
              >
                Notifications
              </span>
              {unread.length > 0 && (
                <span
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    padding: "0.1rem 0.45rem",
                    borderRadius: 20,
                  }}
                >
                  {unread.length} new
                </span>
              )}
            </div>
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >
              {unread.length > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    fontSize: "0.7rem",
                    color: "#2196F3",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    padding: 0,
                  }}
                >
                  Mark all read
                </button>
              )}
              {notifications.some((n) => n.is_read) && (
                <button
                  onClick={handleClearRead}
                  style={{
                    fontSize: "0.7rem",
                    color: textMuted,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 500,
                    padding: 0,
                  }}
                >
                  Clear read
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "2.5rem 1rem",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span style={{ fontSize: "2rem" }}>🔕</span>
                <p style={{ fontSize: "0.82rem", color: textMuted, margin: 0 }}>
                  No notifications yet
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                  style={{
                    padding: "0.85rem 1.1rem",
                    borderBottom: `1px solid ${border}`,
                    background: n.is_read ? "transparent" : unreadRowBg,
                    cursor: n.is_read ? "default" : "pointer",
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "flex-start",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!n.is_read) e.currentTarget.style.background = hoverBg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = n.is_read
                      ? "transparent"
                      : unreadRowBg;
                  }}
                >
                  {/* Unread dot */}
                  <div
                    style={{
                      marginTop: "0.3rem",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: n.is_read ? "transparent" : "#2196F3",
                      flexShrink: 0,
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title */}
                    <div
                      style={{
                        fontWeight: n.is_read ? 500 : 700,
                        fontSize: "0.82rem",
                        color: textPrimary,
                        marginBottom: "0.2rem",
                      }}
                    >
                      {n.title}
                    </div>

                    {/* Message */}
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: textMuted,
                        lineHeight: 1.45,
                      }}
                    >
                      {n.message}
                    </div>

                    {/* DTN badge */}
                    {n.link_dtn && (
                      <div style={{ marginTop: "0.35rem" }}>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 600,
                            color: "#2196F3",
                            background: "rgba(33,150,243,0.1)",
                            padding: "0.1rem 0.45rem",
                            borderRadius: 4,
                          }}
                        >
                          DTN: {n.link_dtn}
                        </span>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: textMuted,
                        marginTop: "0.3rem",
                      }}
                    >
                      {fmtTime(n.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
