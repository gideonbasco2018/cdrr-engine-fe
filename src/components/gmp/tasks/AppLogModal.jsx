// src/components/gmp/tasks/AppLogModal.jsx
// Timeline view of GMPApplicationLogs for a record — fetches real data from API
import React, { useState, useEffect } from "react";
import { getGMPLogs } from "../../../api/gmp";
import { FONT, GMP_STEPS } from "../shared/constants";

const ACCENT = "#10b981";
const MODAL_CSS = `
@keyframes gmpModalIn {
  from { opacity:0; transform:scale(0.95) translateY(10px); }
  to   { opacity:1; transform:scale(1) translateY(0); }
}
@keyframes gmpBackdropIn {
  from { opacity:0; }
  to   { opacity:1; }
}`;

function stepColor(stepName) {
  if (!stepName) return "#94a3b8";
  const s = GMP_STEPS.find((x) => x.id === stepName || x.label === stepName);
  return s ? s.color : "#6366f1";
}

function formatDateTime(raw) {
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " " +
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    );
  } catch { return raw; }
}

function isWeekendDate(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}
// Same working-day definition used in WorkflowModal's Compliance Deadline
// widget and the Compliance tab badge in TasksTable, so the "Xd left" figure
// shown here always matches what was set at submission time.
function workingDaysUntil(deadlineStr) {
  if (!deadlineStr) return null;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(deadlineStr); end.setHours(0, 0, 0, 0);
  const forward = end > start;
  let count = 0;
  const d = new Date(forward ? start : end);
  const stop = forward ? end : start;
  while (d < stop) { d.setDate(d.getDate() + 1); if (!isWeekendDate(d)) count += 1; }
  return forward ? count : -count;
}
function formatShortDate(raw) {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return raw; }
}

function StepCard({ log, index, isLast, colors, darkMode }) {
  const isCompleted  = ["completed", "released"].includes(log.application_status?.toLowerCase());
  const isInProgress = log.application_status?.toLowerCase() === "in progress" ||
                       log.application_status?.toLowerCase() === "in-progress";
  const color  = stepColor(log.application_step);
  const dotIcon = isCompleted ? "✓" : isInProgress ? "●" : "○";

  // action_type doubles as a system tag (REASSIGNMENT/REROUTE/ISSUANCE_ADDED)
  // on some rows and as the Decision value (Approved/Disapproved/etc.) on
  // eval/checker rows — same distinction StepLogs/LogCard makes in
  // WorkflowModal Step 3.
  const isSystemTag = log.action_type === "REASSIGNMENT" || log.action_type === "REROUTE" || log.action_type === "ISSUANCE_ADDED";
  const decisionValue = isSystemTag ? null : log.action_type;

  return (
    <div style={{ display: "flex", gap: 14, position: "relative" }}>
      {/* Timeline column */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: isCompleted ? ACCENT : isInProgress ? "#f97316" : (darkMode ? "#2a2b2c" : "#e2e8f0"),
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: "0.8rem", fontWeight: 800, zIndex: 1, position: "relative",
          boxShadow: isInProgress ? `0 0 0 3px rgba(249,115,22,0.3)` : "none",
        }}>
          {dotIcon}
        </div>
        {!isLast && (
          <div style={{
            width: 2, flex: 1, minHeight: 12,
            background: isCompleted ? `${ACCENT}40` : (darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
            margin: "3px 0",
          }} />
        )}
      </div>
      {/* Card */}
      <div style={{
        flex: 1, marginBottom: isLast ? 0 : 14,
        background: darkMode ? "#1e1f20" : "#fff",
        border: `1px solid ${isInProgress ? "#f9731640" : color + "25"}`,
        borderLeft: `3px solid ${isInProgress ? "#f97316" : isCompleted ? color : "#94a3b8"}`,
        borderRadius: 9,
        boxShadow: isInProgress ? "0 2px 10px rgba(249,115,22,0.1)" : "0 1px 4px rgba(0,0,0,0.05)",
      }}>
        {/* Header — step name + assignee + status badge, matches WorkflowModal Step 3's LogCard */}
        <div style={{
          padding: "10px 14px 7px",
          borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6,
        }}>
          <span style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: colors.textPrimary }}>
              {log.application_step || "—"}
            </span>
            {log.user_name && (
              <span style={{ fontSize: "0.72rem", fontWeight: 600, color }}>· {log.user_name}</span>
            )}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{
              fontSize: "0.63rem", fontWeight: 700, padding: "2px 9px", borderRadius: 99,
              background: isCompleted ? "#dcfce7" : isInProgress ? "#fff7ed" : (darkMode ? "#2a2b2c" : "#f1f5f9"),
              color: isCompleted ? "#15803d" : isInProgress ? "#c2410c" : "#94a3b8",
            }}>
              {log.application_status || "Pending"}
            </span>
            {isSystemTag && (
              <span style={{
                fontSize: "0.63rem", fontWeight: 700, padding: "2px 9px",
                borderRadius: 99, background: "rgba(99,102,241,0.08)", color: "#6366f1",
              }}>
                {log.action_type === "ISSUANCE_ADDED" ? "Issuance Added" : log.action_type}
              </span>
            )}
          </div>
        </div>
        {/* Meta — 4-column grid: Action / Recommendation / Forwarded On / Accomplished
            (who it's assigned to is now shown inline in the header, next to the step name) */}
        <div style={{
          padding: "8px 14px",
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px 12px",
        }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: "0.58rem", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>
              Action
            </p>
            <p style={{ margin: 0, fontSize: "0.74rem", color: colors.textPrimary }}>
              {log.application_decision || "—"}
            </p>
          </div>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: "0.58rem", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>
              Recommendation
            </p>
            <p style={{ margin: 0, fontSize: "0.74rem", color: colors.textPrimary }}>
              {decisionValue || "—"}
            </p>
          </div>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: "0.58rem", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>
              Forwarded On
            </p>
            <p style={{ margin: 0, fontSize: "0.72rem", color: colors.textPrimary }}>
              {formatDateTime(log.start_date)}
            </p>
          </div>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: "0.58rem", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>
              Accomplished
            </p>
            <p style={{ margin: 0, fontSize: "0.72rem", color: colors.textPrimary }}>
              {formatDateTime(log.accomplished_date)}
            </p>
          </div>
          {log.decision_result && (
            <div style={{ gridColumn: "1/-1" }}>
              <p style={{ margin: "0 0 2px", fontSize: "0.58rem", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>
                Type of Issuance
              </p>
              <p style={{ margin: 0, fontSize: "0.74rem", fontWeight: 600, color: colors.textPrimary }}>
                {log.decision_result}
              </p>
            </div>
          )}
          {log.decision_authority_name && (
            <div style={{ gridColumn: "1/-1" }}>
              <p style={{ margin: "0 0 2px", fontSize: "0.58rem", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>
                Decision Authority (Signed By)
              </p>
              <p style={{ margin: 0, fontSize: "0.74rem", fontWeight: 600, color: colors.textPrimary }}>
                {log.decision_authority_name}
              </p>
            </div>
          )}
          {log.application_remarks && (
            <div style={{ gridColumn: "1/-1" }}>
              <p style={{ margin: "0 0 2px", fontSize: "0.58rem", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>
                Remarks
              </p>
              <p style={{ margin: 0, fontSize: "0.72rem", color: colors.textSecondary, fontStyle: "italic" }}>
                {log.application_remarks}
              </p>
            </div>
          )}
        </div>
        {log.deadline_date && (() => {
          const remaining = workingDaysUntil(log.deadline_date);
          const status = remaining < 0
            ? { label: "Overdue", color: "#ef4444", bg: "rgba(239,68,68,0.12)", dot: "#ef4444" }
            : remaining <= 3
              ? { label: "Due Soon", color: "#c2410c", bg: "rgba(245,158,11,0.14)", dot: "#f59e0b" }
              : { label: "On Track", color: "#15803d", bg: "rgba(16,185,129,0.14)", dot: "#10b981" };
          return (
            <div style={{
              margin: "0 14px 12px", padding: "9px 12px", borderRadius: 8,
              background: status.bg, border: `1px solid ${status.color}30`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: "0.58rem", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.07em", color: status.color,
                    display: "flex", alignItems: "center", gap: 4 }}>
                    ⏰ Compliance Deadline
                  </p>
                  <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: status.color }}>
                    {formatShortDate(log.deadline_date)}
                  </p>
                </div>
                {log.working_days != null && (
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: "0.58rem", fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>
                      Allotted
                    </p>
                    <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: colors.textPrimary }}>
                      {log.working_days}d
                    </p>
                  </div>
                )}
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: "0.58rem", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.07em", color: colors.textTertiary }}>
                    Remaining
                  </p>
                  <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: colors.textPrimary }}>
                    {remaining < 0 ? `${Math.abs(remaining)}d overdue` : `${remaining}d left`}
                  </p>
                </div>
              </div>
              <span style={{
                fontSize: "0.68rem", fontWeight: 700, padding: "4px 12px", borderRadius: 99,
                background: darkMode ? "#1e1f20" : "#fff", color: status.color,
                border: `1px solid ${status.color}50`,
                display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: status.dot, display: "inline-block" }} />
                {status.label.toUpperCase()}
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default function AppLogModal({ record, onClose, colors, darkMode }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!record?.id) return;
    setLoading(true);
    setError(null);
    getGMPLogs(record.id, { page: 1, page_size: 100 })
      .then((data) => {
        setLogs(Array.isArray(data) ? data : (data.data ?? []));
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load application logs.");
        setLoading(false);
      });
  }, [record]);

  const completed  = logs.filter((l) => ["completed", "released"].includes(l.application_status?.toLowerCase())).length;
  const inProgress = logs.filter((l) =>
    l.application_status?.toLowerCase() === "in progress" ||
    l.application_status?.toLowerCase() === "in-progress"
  ).length;

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
          background: darkMode ? "#18191a" : "#f8fafc", borderRadius: 16,
          width: "100%", maxWidth: 720, maxHeight: "90vh",
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
          animation: "gmpModalIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}>
        {/* Header */}
        <div style={{
          padding: "18px 22px", borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", gap: 14, flexShrink: 0,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: `${ACCENT}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.3rem", flexShrink: 0,
          }}>
            📋
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: colors.textPrimary }}>
                Application Logs
              </h2>
              <span style={{
                fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px",
                borderRadius: 99, background: `${ACCENT}18`, color: ACCENT,
              }}>
                {logs.length}
              </span>
            </div>
            <p style={{ margin: "3px 0 0", fontSize: "0.76rem", color: colors.textTertiary,
              display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              DTN:{" "}
              <span style={{ fontFamily: "ui-monospace,monospace", fontWeight: 700, color: ACCENT }}>
                {record?.dtn || "—"}
              </span>
              {completed > 0 && <span style={{ fontSize: "0.63rem", fontWeight: 700, padding: "2px 8px",
                borderRadius: 99, background: "#dcfce7", color: "#15803d" }}>{completed} completed</span>}
              {inProgress > 0 && <span style={{ fontSize: "0.63rem", fontWeight: 700, padding: "2px 8px",
                borderRadius: 99, background: "#fff7ed", color: "#c2410c" }}>{inProgress} in progress</span>}
            </p>
          </div>
          <button onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: 10, border: `1px solid ${colors.cardBorder}`,
              background: "transparent", color: colors.textTertiary, cursor: "pointer",
              fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            ✕
          </button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{
                  height: 120, borderRadius: 10,
                  background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                }} />
              ))}
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#ef4444" }}>
              <p style={{ fontSize: "2rem", margin: "0 0 8px" }}>⚠️</p>
              <p style={{ margin: 0, fontSize: "0.84rem" }}>{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: colors.textTertiary }}>
              <p style={{ fontSize: "2rem", margin: "0 0 8px" }}>📭</p>
              <p style={{ margin: 0, fontSize: "0.84rem" }}>No workflow logs recorded yet.</p>
            </div>
          ) : (
            logs.map((log, i) => (
              <StepCard key={log.id ?? i} log={log} index={i}
                isLast={i === logs.length - 1} colors={colors} darkMode={darkMode} />
            ))
          )}
        </div>
        {/* Footer */}
        <div style={{
          padding: "12px 22px", borderTop: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0, background: darkMode ? "#18191a" : "#fff",
        }}>
          <span style={{ fontSize: "0.72rem", color: colors.textTertiary }}>
            {logs.length} step{logs.length !== 1 ? "s" : ""} recorded
          </span>
          <button onClick={onClose}
            style={{
              padding: "7px 22px", fontSize: "0.78rem", fontWeight: 600, fontFamily: FONT,
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
