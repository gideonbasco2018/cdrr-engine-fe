// src/components/monitoring/teamOverview/TeamOverviewView.jsx
//
// Combined "Team Diagram" + "Target Table" view (tabbed, single menu
// entry) for the monitoring/admin scope — shows EVERY team, not just
// "my team". Diagram now includes the LEAD as its own node, connected
// down to their members, connected to each member's targeted tasks:
// Lead → Members → Targeted Tasks.
//
// Fetches team + per-member tasks ONCE and shares it between both tabs.

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  getAllTeams,
  getAllTeamsMemberTasks,
} from "../../../api/targetAssignments";

function usePalette(darkMode) {
  return darkMode
    ? {
        pageBg: "#0a0a0a",
        cardBg: "#161616",
        cardBorder: "#2a2a2a",
        textPrimary: "#f5f5f5",
        textSecondary: "#a3a3a3",
        textTertiary: "#737373",
        rowHover: "#1f1f1f",
        selectedBg: "#1a2332",
        selectedBorder: "#3b82f6",
        btnPrimary: "#3b82f6",
        leadBg: "#241a30",
        leadBorder: "#a855f7",
        targetBg: "#1c2e1c",
        targetBorder: "#22c55e",
      }
    : {
        pageBg: "#f8f8f8",
        cardBg: "#ffffff",
        cardBorder: "#e5e7eb",
        textPrimary: "#111827",
        textSecondary: "#6b7280",
        textTertiary: "#9ca3af",
        rowHover: "#f9fafb",
        selectedBg: "#eff6ff",
        selectedBorder: "#3b82f6",
        btnPrimary: "#3b82f6",
        leadBg: "#f5f3ff",
        leadBorder: "#a855f7",
        targetBg: "#f0fdf4",
        targetBorder: "#22c55e",
      };
}

const DIAGRAM_STORAGE_KEY = "monitoringAllTeamsDiagramPositions";

const formatMonthLabel = (key) => {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

const thStyle = (colors) => ({
  padding: "8px 14px",
  fontWeight: 600,
  color: colors.textSecondary,
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
});
const tdStyle = (colors) => ({
  padding: "10px 14px",
  color: colors.textPrimary,
});

// ── Status → progress-bar visual treatment ──────────────────────────
const STATUS_KIND_MAP = {
  COMPLETED: "done",
  CLOSED: "done",
  RELEASED: "done",
  CANCELLED: "stopped",
  CANCELED: "stopped",
  REJECTED: "stopped",
  DENIED: "stopped",
  "FOR COMPLIANCE": "attention",
  "FOR EVALUATION": "attention",
  "FOR REVIEW": "attention",
  "FOR CORRECTION": "attention",
  ONGOING: "progress",
  "ON-PROCESS": "progress",
  "ON PROCESS": "progress",
  "IN PROGRESS": "progress",
};
const STATUS_KIND_STYLES = {
  done: { color: "#22c55e", fill: 100, striped: false },
  progress: { color: "#3b82f6", fill: 60, striped: true },
  attention: { color: "#f59e0b", fill: 40, striped: false },
  stopped: { color: "#ef4444", fill: 100, striped: false },
  default: { color: "#9ca3af", fill: 25, striped: false },
};

// Task-card border/background per status kind — same kind mapping as
// the progress bar above, so "IN PROGRESS" = blue, "COMPLETED" = green,
// etc. stay consistent between the table and the diagram.
const STATUS_NODE_COLORS = {
  done: { bg: "rgba(34,197,94,0.12)", border: "#22c55e", text: "#22c55e" },
  progress: { bg: "rgba(59,130,246,0.12)", border: "#3b82f6", text: "#3b82f6" },
  attention: {
    bg: "rgba(245,158,11,0.12)",
    border: "#f59e0b",
    text: "#f59e0b",
  },
  stopped: { bg: "rgba(239,68,68,0.12)", border: "#ef4444", text: "#ef4444" },
  default: { bg: "rgba(156,163,175,0.12)", border: "#9ca3af", text: "#9ca3af" },
};
function getStatusNodeColors(status) {
  const key = (status || "").trim().toUpperCase();
  const kind = STATUS_KIND_MAP[key] || "default";
  return STATUS_NODE_COLORS[kind];
}

function StatusPill({ status }) {
  const key = (status || "").trim().toUpperCase();
  const kind = STATUS_KIND_MAP[key] || "default";
  const s = STATUS_KIND_STYLES[kind];
  return (
    <div style={{ minWidth: 110, maxWidth: 150 }}>
      <div
        style={{
          fontSize: "10.5px",
          fontWeight: 700,
          color: s.color,
          marginBottom: "3px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {status}
      </div>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 6,
          borderRadius: "9999px",
          background: "rgba(150,150,150,0.2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${s.fill}%`,
            borderRadius: "9999px",
            background: s.striped
              ? `repeating-linear-gradient(45deg, ${s.color}, ${s.color} 6px, ${s.color}cc 6px, ${s.color}cc 12px)`
              : s.color,
            backgroundSize: s.striped ? "16px 16px" : "auto",
            animation: s.striped
              ? "statusBarMoveOverview 0.9s linear infinite"
              : "none",
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <style>{`@keyframes statusBarMoveOverview { from { background-position: 0 0; } to { background-position: 16px 0; } }`}</style>
    </div>
  );
}

function MiniBadge({ label, value, colors, tone }) {
  const toneStyles = {
    neutral: {
      bg: colors.rowHover,
      border: colors.cardBorder,
      color: colors.textSecondary,
    },
    green: { bg: "rgba(34,197,94,0.12)", border: "#22c55e", color: "#22c55e" },
    blue: { bg: "rgba(59,130,246,0.12)", border: "#3b82f6", color: "#3b82f6" },
    purple: {
      bg: "rgba(168,85,247,0.12)",
      border: "#a855f7",
      color: "#a855f7",
    },
    target: {
      bg: colors.targetBg,
      border: colors.targetBorder,
      color: colors.targetBorder,
    },
  };
  const s = toneStyles[tone] || toneStyles.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "2px",
        fontSize: "0.58rem",
        fontWeight: 700,
        padding: "2px 6px",
        borderRadius: "9999px",
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {value} {label}
    </span>
  );
}

// ── Within/Beyond Target classification for one targeted task ──────
// "Within" = finished on/before the deadline, or (if still ongoing)
// today hasn't passed the deadline yet. "Beyond" = missed it.
// Returns null when there isn't enough info to classify (no target
// end date, or done but accomplished date wasn't recorded).
function classifyTargetStatus(t) {
  if (!t.target_end_date) return null;
  const key = (t.status || "").trim().toUpperCase();
  const isDoneKind = ["COMPLETED", "CLOSED", "RELEASED"].includes(key);

  if (isDoneKind) {
    if (!t.date_accomplished) return null;
    const accomplished = String(t.date_accomplished).slice(0, 10);
    return accomplished <= t.target_end_date ? "within" : "beyond";
  }

  const today = new Date().toISOString().slice(0, 10);
  return today <= t.target_end_date ? "within" : "beyond";
}

// ── Member summary card (Member column content) ─────────────────────
// Matches the "Total / Completed / In Progress / Targeted / Within /
// Beyond" panel style.
function MemberSummaryCard({ member, stats, colors }) {
  const row = (label, value, color) => (
    <div
      key={label}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "5px 9px",
        borderBottom: `1px solid ${colors.cardBorder}`,
        fontSize: "0.72rem",
      }}
    >
      <span style={{ color: colors.textSecondary }}>{label}</span>
      <span style={{ fontWeight: 700, color }}>{value}</span>
    </div>
  );

  return (
    <div>
      <div
        style={{
          fontWeight: 700,
          color: colors.textPrimary,
          fontSize: "0.85rem",
        }}
      >
        {member.member_name}
      </div>
      <div
        style={{
          fontSize: "0.68rem",
          color: colors.textTertiary,
          marginBottom: "0.5rem",
        }}
      >
        {member.lead_role}
      </div>

      <div
        style={{
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "8px",
          overflow: "hidden",
          background: colors.pageBg,
          marginBottom: "0.4rem",
        }}
      >
        {row("Total", stats.total, colors.textPrimary)}
        {row("Completed", stats.completed, "#22c55e")}
        {row("In Progress", stats.inProgress, "#3b82f6")}
        {row("🎯 Targeted", member.target_count, colors.textPrimary)}
      </div>

      <div
        style={{
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "8px",
          overflow: "hidden",
          background: colors.pageBg,
        }}
      >
        {row("✓ Within Target", stats.within, "#22c55e")}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "5px 9px",
            fontSize: "0.72rem",
          }}
        >
          <span style={{ color: colors.textSecondary }}>✗ Beyond Target</span>
          <span style={{ fontWeight: 700, color: "#ef4444" }}>
            {stats.beyond}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Application Status progress bar + click-to-view history popover ──
// Percent comes from the backend's application_progress_percent — a
// weighted per-stage checklist (Quality Eval 40%, then +10% each for
// Checker/Supervisor/QA Admin/LRD Chief Admin/OD-Receiving/OD-Releasing).
// 100% only once OD-Releasing itself is completed. Click the bar to
// open/close the full trail: step → status → date. Click anywhere outside to close it.
function ApplicationStatusBar({ task, colors }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const percent = task.application_progress_percent ?? 0;
  const barColor = getStatusNodeColors(task.status).border;
  const history = task.application_history || [];

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", width: 130 }}>
      <div
        onClick={() => history.length > 0 && setOpen((p) => !p)}
        style={{ cursor: history.length > 0 ? "pointer" : "default" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.66rem",
            color: colors.textSecondary,
            marginBottom: "3px",
          }}
        >
          <span>{task.step || "—"}</span>
          <span style={{ fontWeight: 700, color: barColor }}>{percent}%</span>
        </div>
        <div
          style={{
            position: "relative",
            width: "100%",
            height: 6,
            borderRadius: "9999px",
            background: "rgba(150,150,150,0.2)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${percent}%`,
              borderRadius: "9999px",
              background: barColor,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {open && history.length > 0 && (
        <div
          style={{
            position: "absolute",
            zIndex: 30,
            top: "calc(100% + 6px)",
            left: 0,
            width: 240,
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "8px",
            padding: "0.55rem 0.65rem",
            boxShadow: "0 10px 28px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.4rem",
            }}
          >
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              Application History
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: colors.textTertiary,
                cursor: "pointer",
                fontSize: "0.75rem",
                lineHeight: 1,
                padding: 0,
              }}
            >
              ✕
            </button>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {history.map((h, i) => {
              const hc = getStatusNodeColors(h.status);
              return (
                <div
                  key={i}
                  style={{
                    fontSize: "0.66rem",
                    borderLeft: `2px solid ${hc.border}`,
                    paddingLeft: "0.4rem",
                  }}
                >
                  <div style={{ color: colors.textPrimary, fontWeight: 600 }}>
                    {h.step || "—"}
                  </div>
                  <div style={{ color: hc.text }}>{h.status || "—"}</div>
                  {h.user_name && (
                    <div style={{ color: colors.textSecondary }}>
                      👤 {h.user_name}
                    </div>
                  )}
                  {h.date && (
                    <div style={{ color: colors.textTertiary }}>
                      {String(h.date).slice(0, 10)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// DIAGRAM TAB — Lead → Members → Targeted Tasks
// ══════════════════════════════════════════════════════════════════
function LeadNode({ lead, colors, memberCount, totalTasks, totalTargets }) {
  const initials = (lead.lead_name || "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      style={{
        background: colors.leadBg,
        border: `1.5px solid ${colors.leadBorder}`,
        borderRadius: "10px",
        padding: "0.65rem 0.75rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: colors.leadBorder,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: colors.textPrimary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            👑 {lead.lead_name || "—"}
          </div>
          <div style={{ fontSize: "0.62rem", color: colors.textTertiary }}>
            Lead
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
        <MiniBadge
          label="Members"
          value={memberCount}
          colors={colors}
          tone="purple"
        />
        <MiniBadge
          label="Tasks"
          value={totalTasks}
          colors={colors}
          tone="neutral"
        />
        <MiniBadge
          label="🎯"
          value={totalTargets}
          colors={colors}
          tone="target"
        />
      </div>
    </div>
  );
}

function MemberNode({ member, colors, total, completed, onProcess }) {
  const initials = (member.member_name || "")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "10px",
        padding: "0.65rem 0.75rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: colors.btnPrimary,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: "0.76rem",
              fontWeight: 700,
              color: colors.textPrimary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {member.member_name}
          </div>
          <div style={{ fontSize: "0.62rem", color: colors.textTertiary }}>
            {member.lead_role}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
        <MiniBadge label="Total" value={total} colors={colors} tone="neutral" />
        <MiniBadge
          label="Done"
          value={completed}
          colors={colors}
          tone="green"
        />
        <MiniBadge
          label="On Proc"
          value={onProcess}
          colors={colors}
          tone="blue"
        />
        <MiniBadge
          label="🎯"
          value={member.target_count}
          colors={colors}
          tone="target"
        />
      </div>
    </div>
  );
}

function TaskNode({ task, colors }) {
  const sc = getStatusNodeColors(task.status);
  return (
    <div
      title={task.target_remarks || ""}
      style={{
        background: sc.bg,
        border: `1px solid ${sc.border}`,
        borderRadius: "8px",
        padding: "0.4rem 0.55rem",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        gap: "2px",
      }}
    >
      <div
        style={{
          fontSize: "0.66rem",
          fontWeight: 700,
          color: colors.textPrimary,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        🎯 DTN {task.dtn}
      </div>
      <div
        style={{
          fontSize: "0.62rem",
          color: colors.textSecondary,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {task.brand_name}
      </div>
      {task.status && (
        <div
          style={{
            fontSize: "0.62rem",
            fontWeight: 700,
            color: sc.text,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {task.status}
        </div>
      )}
      {task.target_end_date && (
        <div style={{ fontSize: "0.58rem", fontWeight: 600, color: sc.text }}>
          until {task.target_end_date}
        </div>
      )}
    </div>
  );
}

function DiagramTab({ colors, darkMode, team, diagramData, monthOptions }) {
  const containerRef = useRef(null);
  const [positions, setPositions] = useState(() => {
    try {
      const saved = localStorage.getItem(DIAGRAM_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [dragging, setDragging] = useState(null);
  const [monthTab, setMonthTab] = useState("all");
  const [leadFilter, setLeadFilter] = useState("all");

  const LEAD_W = 190;
  const LEAD_H = 92;
  const CARD_W = 210;
  const CARD_H = 100;
  const TASK_W = 150;
  const TASK_H = 74;
  const H_GAP = 40;
  const V_GAP = 24;
  const TASK_ROW_GAP = 10;
  const TASK_COL_GAP = 12;
  const MAX_TASK_COLS = 4;

  const leadOptions = useMemo(
    () => [...new Set(team.map((m) => m.lead_name).filter(Boolean))],
    [team],
  );

  // ── Group members under their lead, attach filtered targeted tasks ──
  const leadNodes = useMemo(() => {
    const byLead = new Map();
    team
      .filter((m) => leadFilter === "all" || m.lead_name === leadFilter)
      .forEach((m) => {
        if (!byLead.has(m.lead_user_id)) {
          byLead.set(m.lead_user_id, {
            lead_user_id: m.lead_user_id,
            lead_name: m.lead_name,
            members: [],
          });
        }
        byLead.get(m.lead_user_id).members.push(m);
      });

    return Array.from(byLead.values()).map((lg) => {
      const memberNodes = lg.members.map((m) => {
        const memberTasks = diagramData[m.member_user_id] || [];
        const allTargeted = memberTasks.filter((t) => t.is_targeted);
        const visibleTargeted =
          monthTab === "all"
            ? allTargeted
            : allTargeted.filter(
                (t) =>
                  t.target_start_date &&
                  String(t.target_start_date).slice(0, 7) === monthTab,
              );
        return {
          id: `m-${m.member_user_id}`,
          member: m,
          tasks: memberTasks,
          targeted: visibleTargeted,
        };
      });
      const totalTasks = memberNodes.reduce(
        (sum, mn) => sum + mn.tasks.length,
        0,
      );
      const totalTargets = lg.members.reduce(
        (sum, m) => sum + (m.target_count || 0),
        0,
      );
      return {
        id: `l-${lg.lead_user_id}`,
        lead: lg,
        memberNodes,
        totalTasks,
        totalTargets,
      };
    });
  }, [team, diagramData, monthTab, leadFilter]);

  const computeDefaultPositions = useCallback(
    (leadNodeList) => {
      const layout = {};
      let y = 30;
      const leadX = 30;
      const memberX = leadX + LEAD_W + H_GAP;
      const taskStartX = memberX + CARD_W + H_GAP;

      leadNodeList.forEach((ln) => {
        const leadStartY = y;

        if (ln.memberNodes.length === 0) {
          layout[ln.id] = { x: leadX, y };
          y += LEAD_H + V_GAP;
          return;
        }

        ln.memberNodes.forEach((mn) => {
          layout[mn.id] = { x: memberX, y };
          const my = y;
          const rows = Math.max(
            1,
            Math.ceil(mn.targeted.length / MAX_TASK_COLS),
          );

          mn.targeted.forEach((t, ti) => {
            const tid = `t-${t.log_id}`;
            const col = ti % MAX_TASK_COLS;
            const row = Math.floor(ti / MAX_TASK_COLS);
            layout[tid] = {
              x: taskStartX + col * (TASK_W + TASK_COL_GAP),
              y: my + row * (TASK_H + TASK_ROW_GAP),
            };
          });

          const blockHeight = Math.max(
            CARD_H,
            rows * TASK_H + (rows - 1) * TASK_ROW_GAP,
          );
          y = my + blockHeight + V_GAP;
        });

        const spanHeight = y - V_GAP - leadStartY;
        const leadY = leadStartY + Math.max(0, (spanHeight - LEAD_H) / 2);
        layout[ln.id] = { x: leadX, y: leadY };
      });

      return layout;
    },
    [
      LEAD_W,
      LEAD_H,
      CARD_W,
      CARD_H,
      TASK_W,
      TASK_H,
      H_GAP,
      V_GAP,
      TASK_ROW_GAP,
      TASK_COL_GAP,
      MAX_TASK_COLS,
    ],
  );

  useEffect(() => {
    setPositions((prev) => {
      const defaults = computeDefaultPositions(leadNodes);
      let changed = false;
      const next = { ...prev };
      Object.keys(defaults).forEach((id) => {
        if (!next[id]) {
          next[id] = defaults[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [leadNodes, computeDefaultPositions]);

  const persistPositions = (pos) => {
    try {
      localStorage.setItem(DIAGRAM_STORAGE_KEY, JSON.stringify(pos));
    } catch {
      /* ignore quota errors */
    }
  };

  // Auto-reset to a clean grid whenever the lead OR month filter changes —
  // the old positions were laid out for a different set of leads/members/
  // tasks, so backfilling alone would leave gaps or stale offscreen nodes.
  // Skips the very first render so a saved layout from localStorage isn't
  // wiped out just from mounting on "All Leads" / "All Months".
  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    const defaults = computeDefaultPositions(leadNodes);
    setPositions(defaults);
    persistPositions(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadFilter, monthTab]);

  const startDrag = (e, id) => {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const pos = positions[id] || { x: 0, y: 0 };
    setDragging({
      id,
      offsetX: e.clientX - rect.left - pos.x,
      offsetY: e.clientY - rect.top - pos.y,
    });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, e.clientX - rect.left - dragging.offsetX);
      const y = Math.max(0, e.clientY - rect.top - dragging.offsetY);
      setPositions((prev) => ({ ...prev, [dragging.id]: { x, y } }));
    };
    const onUp = () => {
      setDragging(null);
      setPositions((prev) => {
        persistPositions(prev);
        return prev;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const handleResetLayout = () => {
    const defaults = computeDefaultPositions(leadNodes);
    setPositions(defaults);
    persistPositions(defaults);
  };

  if (leadNodes.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.textTertiary,
          fontSize: "0.85rem",
        }}
      >
        No active teams found.
      </div>
    );
  }

  const posValues = Object.values(positions);
  const canvasW = Math.max(1200, ...posValues.map((p) => p.x + 260));
  const canvasH = Math.max(500, ...posValues.map((p) => p.y + 160));

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "10px",
        background: colors.pageBg,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          padding: "0.5rem 0.6rem",
          borderBottom: `1px solid ${colors.cardBorder}`,
          background: colors.cardBg,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <select
            value={leadFilter}
            onChange={(e) => setLeadFilter(e.target.value)}
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              border: `1px solid ${colors.cardBorder}`,
              background: colors.pageBg,
              color: colors.textPrimary,
              fontSize: "0.72rem",
            }}
          >
            <option value="all">All Leads</option>
            {leadOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setMonthTab("all")}
            style={{
              padding: "4px 11px",
              borderRadius: "9999px",
              border: `1px solid ${monthTab === "all" ? colors.selectedBorder : colors.cardBorder}`,
              background:
                monthTab === "all" ? colors.selectedBg : "transparent",
              color:
                monthTab === "all"
                  ? colors.selectedBorder
                  : colors.textSecondary,
              fontSize: "0.7rem",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            All Months
          </button>
          {monthOptions.map((key) => {
            const isActive = monthTab === key;
            return (
              <button
                key={key}
                onClick={() => setMonthTab(key)}
                style={{
                  padding: "4px 11px",
                  borderRadius: "9999px",
                  border: `1px solid ${isActive ? colors.targetBorder : colors.cardBorder}`,
                  background: isActive ? colors.targetBg : "transparent",
                  color: isActive ? colors.targetBorder : colors.textSecondary,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {formatMonthLabel(key)}
              </button>
            );
          })}
          {monthOptions.length === 0 && (
            <span
              style={{
                fontSize: "0.7rem",
                color: colors.textTertiary,
                padding: "4px 4px",
              }}
            >
              No targeted tasks yet.
            </span>
          )}
        </div>
        <button
          onClick={handleResetLayout}
          style={{
            padding: "4px 10px",
            borderRadius: "6px",
            border: `1px solid ${colors.cardBorder}`,
            background: "transparent",
            color: colors.textSecondary,
            fontSize: "0.68rem",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          ↺ Reset Layout
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        <div
          ref={containerRef}
          style={{ position: "relative", width: canvasW, height: canvasH }}
        >
          <svg
            width={canvasW}
            height={canvasH}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              pointerEvents: "none",
            }}
          >
            {leadNodes.map((ln) => {
              const lp = positions[ln.id];
              if (!lp) return null;
              return ln.memberNodes.map((mn) => {
                const mp = positions[mn.id];
                if (!mp) return null;
                const x1 = lp.x + LEAD_W;
                const y1 = lp.y + LEAD_H / 2;
                const x2 = mp.x;
                const y2 = mp.y + CARD_H / 2;
                const midX = (x1 + x2) / 2;
                return (
                  <path
                    key={mn.id}
                    d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={colors.leadBorder}
                    strokeWidth={2}
                    opacity={0.6}
                  />
                );
              });
            })}
            {leadNodes.map((ln) =>
              ln.memberNodes.map((mn) => {
                const mp = positions[mn.id];
                if (!mp) return null;
                return mn.targeted.map((t) => {
                  const tid = `t-${t.log_id}`;
                  const tp = positions[tid];
                  if (!tp) return null;
                  const x1 = mp.x + CARD_W;
                  const y1 = mp.y + CARD_H / 2;
                  const x2 = tp.x;
                  const y2 = tp.y + TASK_H / 2;
                  const midX = (x1 + x2) / 2;
                  return (
                    <path
                      key={tid}
                      d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke={darkMode ? "#3a3a3a" : "#d1d5db"}
                      strokeWidth={2}
                    />
                  );
                });
              }),
            )}
          </svg>

          {leadNodes.map((ln) => {
            const lp = positions[ln.id] || { x: 0, y: 0 };
            return (
              <div key={ln.id}>
                <div
                  onMouseDown={(e) => startDrag(e, ln.id)}
                  style={{
                    position: "absolute",
                    left: lp.x,
                    top: lp.y,
                    width: LEAD_W,
                    cursor: dragging?.id === ln.id ? "grabbing" : "grab",
                    userSelect: "none",
                    zIndex: dragging?.id === ln.id ? 10 : 2,
                  }}
                >
                  <LeadNode
                    lead={ln.lead}
                    colors={colors}
                    memberCount={ln.memberNodes.length}
                    totalTasks={ln.totalTasks}
                    totalTargets={ln.totalTargets}
                  />
                </div>

                {ln.memberNodes.map((mn) => {
                  const mpos = positions[mn.id] || { x: 0, y: 0 };
                  const completed = mn.tasks.filter(
                    (t) => t.status === "Completed",
                  ).length;
                  return (
                    <div key={mn.id}>
                      <div
                        onMouseDown={(e) => startDrag(e, mn.id)}
                        style={{
                          position: "absolute",
                          left: mpos.x,
                          top: mpos.y,
                          width: CARD_W,
                          cursor: dragging?.id === mn.id ? "grabbing" : "grab",
                          userSelect: "none",
                          zIndex: dragging?.id === mn.id ? 10 : 1,
                        }}
                      >
                        <MemberNode
                          member={mn.member}
                          colors={colors}
                          total={mn.tasks.length}
                          completed={completed}
                          onProcess={mn.tasks.length - completed}
                        />
                      </div>

                      {mn.targeted.map((t) => {
                        const tid = `t-${t.log_id}`;
                        const tpos = positions[tid] || { x: 0, y: 0 };
                        return (
                          <div
                            key={tid}
                            onMouseDown={(e) => startDrag(e, tid)}
                            style={{
                              position: "absolute",
                              left: tpos.x,
                              top: tpos.y,
                              width: TASK_W,
                              cursor:
                                dragging?.id === tid ? "grabbing" : "grab",
                              userSelect: "none",
                              zIndex: dragging?.id === tid ? 10 : 1,
                            }}
                          >
                            <TaskNode task={t} colors={colors} />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TABLE TAB — flat table of every targeted task, grouped by member
// ══════════════════════════════════════════════════════════════════
function TableTab({ colors, team, diagramData, monthOptions }) {
  const [monthTab, setMonthTab] = useState("all");
  const [leadFilter, setLeadFilter] = useState("all");
  const [searchDtn, setSearchDtn] = useState("");

  const leadOptions = useMemo(
    () => [...new Set(team.map((m) => m.lead_name).filter(Boolean))],
    [team],
  );

  const rows = useMemo(() => {
    const out = [];
    team
      .filter((m) => leadFilter === "all" || m.lead_name === leadFilter)
      .forEach((m) => {
        const memberTasks = diagramData[m.member_user_id] || [];
        const targeted = memberTasks
          .filter((t) => t.is_targeted)
          .filter(
            (t) =>
              monthTab === "all" ||
              (t.target_start_date &&
                String(t.target_start_date).slice(0, 7) === monthTab),
          )
          .filter(
            (t) =>
              !searchDtn.trim() ||
              String(t.dtn ?? "").includes(searchDtn.trim()),
          );
        if (targeted.length > 0) {
          const total = memberTasks.length;
          const completed = memberTasks.filter(
            (t) => t.status === "Completed",
          ).length;
          const inProgress = memberTasks.filter(
            (t) =>
              (STATUS_KIND_MAP[(t.status || "").trim().toUpperCase()] ||
                "default") === "progress",
          ).length;

          // Within/Beyond computed from ALL of this member's targeted
          // tasks (not the month/search-filtered `targeted` list above)
          // — it's a status summary, not something that should shrink
          // just because you filtered the visible rows.
          const allMemberTargeted = memberTasks.filter((t) => t.is_targeted);
          let within = 0;
          let beyond = 0;
          allMemberTargeted.forEach((t) => {
            const c = classifyTargetStatus(t);
            if (c === "within") within += 1;
            else if (c === "beyond") beyond += 1;
          });

          out.push({
            member: m,
            targets: targeted,
            stats: {
              total,
              completed,
              inProgress,
              onProcess: total - completed,
              within,
              beyond,
            },
          });
        }
      });
    return out;
  }, [team, diagramData, monthTab, leadFilter, searchDtn]);

  const totalCount = rows.reduce((sum, r) => sum + r.targets.length, 0);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "10px",
        background: colors.cardBg,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          padding: "0.6rem 0.75rem",
          borderBottom: `1px solid ${colors.cardBorder}`,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Search DTN…"
            value={searchDtn}
            onChange={(e) => setSearchDtn(e.target.value)}
            style={{
              padding: "5px 10px",
              borderRadius: "6px",
              border: `1px solid ${colors.cardBorder}`,
              background: colors.pageBg,
              color: colors.textPrimary,
              fontSize: "0.75rem",
              width: 150,
            }}
          />
          <select
            value={leadFilter}
            onChange={(e) => setLeadFilter(e.target.value)}
            style={{
              padding: "5px 8px",
              borderRadius: "6px",
              border: `1px solid ${colors.cardBorder}`,
              background: colors.pageBg,
              color: colors.textPrimary,
              fontSize: "0.72rem",
            }}
          >
            <option value="all">All Leads</option>
            {leadOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setMonthTab("all")}
            style={{
              padding: "4px 11px",
              borderRadius: "9999px",
              border: `1px solid ${monthTab === "all" ? colors.selectedBorder : colors.cardBorder}`,
              background:
                monthTab === "all" ? colors.selectedBg : "transparent",
              color:
                monthTab === "all"
                  ? colors.selectedBorder
                  : colors.textSecondary,
              fontSize: "0.7rem",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            All
          </button>
          {monthOptions.map((key) => {
            const isActive = monthTab === key;
            return (
              <button
                key={key}
                onClick={() => setMonthTab(key)}
                style={{
                  padding: "4px 11px",
                  borderRadius: "9999px",
                  border: `1px solid ${isActive ? colors.targetBorder : colors.cardBorder}`,
                  background: isActive ? colors.targetBg : "transparent",
                  color: isActive ? colors.targetBorder : colors.textSecondary,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {formatMonthLabel(key)}
              </button>
            );
          })}
        </div>
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            color: colors.textSecondary,
          }}
        >
          {totalCount} target{totalCount !== 1 ? "s" : ""} total
        </span>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {rows.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: colors.textTertiary,
              fontSize: "0.85rem",
            }}
          >
            No targeted tasks for this period.
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.82rem",
            }}
          >
            <thead>
              <tr style={{ background: colors.rowHover, textAlign: "left" }}>
                <th style={{ ...thStyle(colors), minWidth: 190 }}>Member</th>
                <th style={thStyle(colors)}>Lead</th>
                <th style={thStyle(colors)}>Target</th>
                <th style={thStyle(colors)}>Step</th>
                <th style={thStyle(colors)}>Entry / App Type</th>
                <th style={thStyle(colors)}>Status</th>
                <th style={thStyle(colors)}>Date Accomplished</th>
                <th style={thStyle(colors)}>Target Date</th>
                <th style={thStyle(colors)}>Application Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ member, targets, stats }) =>
                targets.map((t, idx) => (
                  <tr
                    key={t.log_id}
                    style={{ borderTop: `1px solid ${colors.cardBorder}` }}
                  >
                    {idx === 0 && (
                      <td
                        rowSpan={targets.length}
                        style={{
                          ...tdStyle(colors),
                          verticalAlign: "top",
                          borderRight: `1px solid ${colors.cardBorder}`,
                          minWidth: 190,
                        }}
                      >
                        <MemberSummaryCard
                          member={member}
                          stats={stats}
                          colors={colors}
                        />
                      </td>
                    )}
                    {idx === 0 && (
                      <td
                        rowSpan={targets.length}
                        style={{
                          ...tdStyle(colors),
                          verticalAlign: "top",
                          borderRight: `1px solid ${colors.cardBorder}`,
                          fontSize: "0.76rem",
                        }}
                      >
                        {member.lead_name || "—"}
                      </td>
                    )}
                    <td style={tdStyle(colors)}>
                      🎯 DTN {t.dtn}
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: colors.textSecondary,
                          fontWeight: 400,
                        }}
                      >
                        {t.brand_name}
                      </div>
                    </td>
                    <td style={tdStyle(colors)}>{t.step || "—"}</td>
                    <td style={tdStyle(colors)}>
                      {t.entry_type || "ORIGINAL"}
                      {t.app_type && (
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: colors.textSecondary,
                            fontWeight: 400,
                          }}
                        >
                          {t.app_type}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle(colors)}>
                      <StatusPill status={t.status} />
                    </td>
                    <td style={tdStyle(colors)}>
                      {t.date_accomplished
                        ? String(t.date_accomplished).slice(0, 10)
                        : "—"}
                    </td>
                    <td style={tdStyle(colors)}>
                      {t.target_start_date && t.target_end_date
                        ? `${t.target_start_date} → ${t.target_end_date}`
                        : t.target_start_date || t.target_end_date || "—"}
                    </td>
                    <td style={{ ...tdStyle(colors), overflow: "visible" }}>
                      <ApplicationStatusBar task={t} colors={colors} />
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN — one menu entry, tabbed
// ══════════════════════════════════════════════════════════════════
export default function TeamOverviewView({ darkMode }) {
  const colors = usePalette(darkMode);
  const [activeTab, setActiveTab] = useState("diagram"); // "diagram" | "table"

  const [team, setTeam] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState(null);
  const [diagramData, setDiagramData] = useState({});
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTeamLoading(true);
      setTeamError(null);
      try {
        const data = await getAllTeams();
        if (cancelled) return;
        setTeam(data);

        setDataLoading(true);
        const results = await Promise.all(
          data.map((m) =>
            getAllTeamsMemberTasks(m.member_user_id).catch(() => []),
          ),
        );
        if (cancelled) return;
        const map = {};
        data.forEach((m, i) => {
          map[m.member_user_id] = results[i] || [];
        });
        setDiagramData(map);
      } catch (err) {
        if (!cancelled) setTeamError(err.message);
      } finally {
        if (!cancelled) {
          setTeamLoading(false);
          setDataLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthOptions = useMemo(() => {
    const keys = new Set();
    Object.values(diagramData).forEach((tasks) => {
      (tasks || []).forEach((t) => {
        if (t.is_targeted && t.target_start_date)
          keys.add(String(t.target_start_date).slice(0, 7));
      });
    });
    return Array.from(keys).sort();
  }, [diagramData]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          marginBottom: "0.75rem",
          borderBottom: `1px solid ${colors.cardBorder}`,
        }}
      >
        {[
          { key: "diagram", label: "🗺️ Team Diagram" },
          { key: "table", label: "📊 Target Table" },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "0.5rem 0.9rem",
                border: "none",
                background: "transparent",
                borderBottom: isActive
                  ? `2px solid ${colors.selectedBorder}`
                  : "2px solid transparent",
                color: isActive ? colors.textPrimary : colors.textTertiary,
                fontWeight: isActive ? 700 : 500,
                fontSize: "0.82rem",
                cursor: "pointer",
                marginBottom: "-1px",
              }}
            >
              {tab.label}
            </button>
          );
        })}
        {dataLoading && (
          <span
            style={{
              marginLeft: "auto",
              alignSelf: "center",
              fontSize: "0.72rem",
              color: colors.textTertiary,
            }}
          >
            Loading tasks…
          </span>
        )}
      </div>

      {teamLoading ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.textTertiary,
            fontSize: "0.85rem",
          }}
        >
          Loading all teams…
        </div>
      ) : teamError ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ef4444",
            fontSize: "0.85rem",
          }}
        >
          {teamError}
        </div>
      ) : activeTab === "diagram" ? (
        <DiagramTab
          colors={colors}
          darkMode={darkMode}
          team={team}
          diagramData={diagramData}
          monthOptions={monthOptions}
        />
      ) : (
        <TableTab
          colors={colors}
          team={team}
          diagramData={diagramData}
          monthOptions={monthOptions}
        />
      )}
    </div>
  );
}
