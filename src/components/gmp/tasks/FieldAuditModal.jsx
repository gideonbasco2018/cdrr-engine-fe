// src/components/gmp/tasks/FieldAuditModal.jsx
// Field-level audit log viewer — shows what changed, who changed it, when, and which step.
// Opened as "Change Log" from the Tasks table and "Field Audit Logs" from the
// Queue table — both point at this same modal.
import React, { useState, useEffect, useMemo } from "react";
import { getGMPAuditLogs } from "../../../api/gmp";
import { FONT } from "../shared/constants";

const ACCENT = "#6366f1";
const MODAL_CSS = `
@keyframes gmpModalIn {
  from { opacity:0; transform:scale(0.95) translateY(10px); }
  to   { opacity:1; transform:scale(1) translateY(0); }
}
@keyframes gmpBackdropIn {
  from { opacity:0; }
  to   { opacity:1; }
}`;

// The backend normalizes None/"" to the literal string "N/A" before storing
// (see _normalize() in app/crud/gmp_record.py) — display that as "empty"
// here instead of surfacing the raw sentinel value.
function displayValue(v) {
  return (!v || v === "N/A") ? "empty" : v;
}

function formatDateTime(raw) {
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " · " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
  } catch { return raw; }
}

// Deterministic accent per user — a light hash over the name into a small
// fixed palette, so the same person always gets the same avatar color across
// sessions without needing a color lookup table anywhere.
const AVATAR_PALETTE = ["#6366f1", "#0891b2", "#d97706", "#059669", "#db2777", "#7c3aed"];
function avatarColor(name) {
  if (!name) return "#94a3b8";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || name[0].toUpperCase();
}

function SessionEntry({ changes, isFirst, isLast, colors, darkMode }) {
  const [expanded, setExpanded] = useState(true);
  const firstChange = changes[0];
  const color = avatarColor(firstChange?.user_name);

  return (
    <div style={{ display: "flex", gap: 12 }}>
      {/* Timeline rail */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `${color}18`, color, fontSize: "0.68rem", fontWeight: 800,
          boxShadow: isFirst ? `0 0 0 3px ${color}25` : "none",
        }}>
          {initials(firstChange?.user_name)}
        </div>
        {!isLast && <div style={{ width: 2, flex: 1, minHeight: 10, margin: "4px 0", background: colors.divider }} />}
      </div>

      {/* Card */}
      <div style={{
        flex: 1, marginBottom: isLast ? 0 : 14, borderRadius: 12, overflow: "hidden",
        background: colors.cardBg, border: `1px solid ${colors.cardBorder}`,
        boxShadow: darkMode ? "none" : "0 1px 2px rgba(0,0,0,0.04), 0 1px 6px rgba(0,0,0,0.04)",
      }}>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            width: "100%", padding: "10px 14px", cursor: "pointer",
            border: "none", background: "transparent", fontFamily: FONT, textAlign: "left",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.76rem", fontWeight: 700, color: colors.textPrimary, whiteSpace: "nowrap" }}>
              {firstChange?.user_name || "—"}
            </span>
            <span style={{ fontSize: "0.68rem", color: colors.textTertiary, whiteSpace: "nowrap" }}>
              {formatDateTime(firstChange?.created_at)}
            </span>
            {firstChange?.step_context && (
              <span style={{
                fontSize: "0.6rem", fontWeight: 700, padding: "2px 8px",
                borderRadius: 99, background: `${ACCENT}15`, color: ACCENT, whiteSpace: "nowrap",
              }}>
                {firstChange.step_context}
              </span>
            )}
          </div>
          <span style={{
            fontSize: "0.64rem", fontWeight: 600, color: colors.textTertiary, flexShrink: 0,
            display: "flex", alignItems: "center", gap: 5,
          }}>
            {changes.length} field{changes.length !== 1 ? "s" : ""}
            <svg width={9} height={9} viewBox="0 0 12 12" fill="none"
              style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.18s ease" }}>
              <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        {expanded && (
          <div style={{ padding: "2px 10px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
            {changes.map((c) => (
              <div key={c.id} style={{
                padding: "8px 10px", borderRadius: 8,
                background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.025)",
                display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "3px 8px",
              }}>
                <span style={{
                  fontSize: "0.68rem", fontWeight: 700, color: colors.textSecondary,
                  minWidth: 130, flexShrink: 0,
                }}>
                  {c.field_label || c.field_name}
                </span>
                <span style={{ fontSize: "0.74rem", color: colors.textTertiary, textDecoration: "line-through" }}>
                  {displayValue(c.old_value)}
                </span>
                <span style={{ color: colors.textTertiary, fontSize: "0.7rem" }}>→</span>
                <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#16a34a" }}>
                  {displayValue(c.new_value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FieldAuditModal({ record, onClose, colors, darkMode }) {
  const [logs,          setLogs]          = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  useEffect(() => {
    if (!record?.id) return;
    setLoading(true);
    setError(null);
    getGMPAuditLogs(record.id, { page: 1, page_size: 500 })
      .then((data) => {
        setLogs(Array.isArray(data) ? data : (data.data ?? []));
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load audit logs.");
        setLoading(false);
      });
  }, [record]);

  // Group by session_id — always every change; no filter narrows this down.
  const sessions = useMemo(() => {
    const map = new Map();
    logs.forEach((l) => {
      const sid = l.session_id || String(l.id);
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid).push(l);
    });
    return Array.from(map.values());
  }, [logs]);

  return (
    <div onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)", zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, fontFamily: FONT, animation: "gmpBackdropIn 0.2s ease forwards",
      }}>
      <style>{MODAL_CSS}</style>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          background: darkMode ? "#18191a" : "#ffffff", borderRadius: 16,
          width: "100%", maxWidth: 720, height: "min(84vh, 760px)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
          animation: "gmpModalIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: `linear-gradient(135deg, ${ACCENT}22, ${ACCENT}0a)`,
              border: `1px solid ${ACCENT}30`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.05rem",
            }}>
              🕐
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: colors.textPrimary }}>
                Change Log
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: colors.textTertiary }}>
                DTN:{" "}
                <span style={{ fontFamily: "ui-monospace,monospace", fontWeight: 700, color: ACCENT }}>
                  {record?.dtn || "—"}
                </span>
                {" · "}{logs.length} change{logs.length !== 1 ? "s" : ""} across {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 9, border: `1px solid ${colors.cardBorder}`,
            background: "transparent", color: colors.textTertiary, cursor: "pointer",
            fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>✕</button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 12 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                    background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                  }} />
                  <div style={{
                    flex: 1, height: 64, borderRadius: 12,
                    background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                  }} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#ef4444" }}>
              <p style={{ fontSize: "2rem", margin: "0 0 8px" }}>⚠️</p>
              <p style={{ margin: 0, fontSize: "0.84rem" }}>{error}</p>
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: colors.textTertiary }}>
              <p style={{ fontSize: "2rem", margin: "0 0 8px" }}>📭</p>
              <p style={{ margin: 0, fontSize: "0.84rem" }}>No field changes recorded yet.</p>
            </div>
          ) : (
            sessions.map((changes, i) => (
              <SessionEntry key={changes[0]?.session_id ?? i} changes={changes}
                isFirst={i === 0} isLast={i === sessions.length - 1}
                colors={colors} darkMode={darkMode} />
            ))
          )}
        </div>
        {/* Footer */}
        <div style={{
          padding: "12px 20px", borderTop: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "flex-end", flexShrink: 0,
        }}>
          <button onClick={onClose}
            style={{
              padding: "7px 20px", fontSize: "0.78rem", fontWeight: 600, fontFamily: FONT,
              borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
              background: "transparent", color: colors.textPrimary, cursor: "pointer",
            }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
