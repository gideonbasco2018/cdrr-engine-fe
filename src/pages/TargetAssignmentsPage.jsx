import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  getMyTeam,
  getMemberTasks,
  markAsTarget,
  bulkMarkAsTarget,
  unmarkAsTarget,
} from "../api/targetAssignments";

function useColors(darkMode) {
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
        targetBg: "#f0fdf4",
        targetBorder: "#22c55e",
      };
}

// ── Status → progress-bar visual treatment ──────────────────────────
// Groups any raw status text into a "kind" with a fill level, so the
// bar communicates how far along the task is at a glance.
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
              ? "statusBarMove 0.9s linear infinite"
              : "none",
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <style>{`
        @keyframes statusBarMove {
          from { background-position: 0 0; }
          to { background-position: 16px 0; }
        }
      `}</style>
    </div>
  );
}

function Avatar({ name, colors }) {
  const initials = (name || "")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: colors.btnPrimary,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

const labelStyle = (colors) => ({
  display: "block",
  fontSize: "0.72rem",
  fontWeight: 600,
  color: colors.textSecondary,
  marginBottom: "0.3rem",
  marginTop: "0.6rem",
});

const inputStyle = (colors) => ({
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 10px",
  borderRadius: "6px",
  border: `1px solid ${colors.cardBorder}`,
  background: colors.pageBg,
  color: colors.textPrimary,
  fontSize: "0.8rem",
});

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

// ── Modal: single-task edit OR bulk mark, depending on tasks.length ────
function TargetModal({
  colors,
  tasks,
  onClose,
  onSubmit,
  onRemoveTarget,
  submitting,
}) {
  const isBulk = tasks.length > 1;
  const single = !isBulk ? tasks[0] : null;

  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(
    single?.target_start_date || today,
  );
  const [endDate, setEndDate] = useState(single?.target_end_date || "");
  const [remarks, setRemarks] = useState(single?.target_remarks || "");
  const [error, setError] = useState(null);

  const handleSubmit = () => {
    if (!startDate || !endDate) {
      setError("Kailangan ng target start date at end date.");
      return;
    }
    if (endDate < startDate) {
      setError("Target end date can't be before the start date.");
      return;
    }
    setError(null);
    onSubmit({ targetStartDate: startDate, targetEndDate: endDate, remarks });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380,
          maxWidth: "90vw",
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "10px",
          padding: "1.25rem",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontSize: "0.95rem",
            fontWeight: 700,
            marginBottom: "0.15rem",
          }}
        >
          🎯{" "}
          {isBulk
            ? `Mark ${tasks.length} Tasks as Target`
            : single.is_targeted
              ? "Edit Target"
              : "Mark as Target"}
        </div>
        <div
          style={{
            fontSize: "0.78rem",
            color: colors.textSecondary,
            marginBottom: "1rem",
          }}
        >
          {isBulk
            ? `${tasks.length} tasks selected`
            : `${single.brand_name} · DTN ${single.dtn}`}
        </div>

        <label style={labelStyle(colors)}>Target Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
          style={{ ...inputStyle(colors), cursor: "pointer" }}
        />

        <label style={labelStyle(colors)}>Target End Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
          style={{ ...inputStyle(colors), cursor: "pointer" }}
        />

        <label style={labelStyle(colors)}>Remarks</label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          placeholder="Optional notes…"
          style={{
            ...inputStyle(colors),
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />

        {error && (
          <div
            style={{
              color: "#ef4444",
              fontSize: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "0.5rem",
          }}
        >
          <div>
            {!isBulk && single.is_targeted && (
              <button
                onClick={onRemoveTarget}
                disabled={submitting}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #ef4444",
                  background: "transparent",
                  color: "#ef4444",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: submitting ? "default" : "pointer",
                }}
              >
                Remove Target
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: `1px solid ${colors.cardBorder}`,
                background: "transparent",
                color: colors.textSecondary,
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: submitting ? "default" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                background: colors.targetBorder,
                color: "#fff",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const DIAGRAM_STORAGE_KEY = "targetDiagramPositions";

const formatMonthLabel = (key) => {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

// ── Diagram view: draggable member + task cards, connected by lines,
//    filterable by month tabs (based on target_start_date) ──────────
function TeamDiagramView({
  colors,
  darkMode,
  team,
  diagramData,
  diagramLoading,
}) {
  const containerRef = useRef(null);

  const [positions, setPositions] = useState(() => {
    try {
      const saved = localStorage.getItem(DIAGRAM_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [dragging, setDragging] = useState(null); // { id, offsetX, offsetY }
  const [monthTab, setMonthTab] = useState("all");

  const CARD_W = 210;
  const CARD_H = 90;
  const TASK_W = 150;
  const TASK_H = 74;
  const H_GAP = 40;
  const V_GAP = 24;
  const TASK_ROW_GAP = 10;
  const TASK_COL_GAP = 12;
  const MAX_TASK_COLS = 4;

  // ── All targeted tasks across the whole team (unfiltered) — used to
  //    build the month tabs ──────────────────────────────────────────
  const monthOptions = useMemo(() => {
    const keys = new Set();
    Object.values(diagramData).forEach((tasks) => {
      (tasks || []).forEach((t) => {
        if (t.is_targeted && t.target_start_date) {
          keys.add(String(t.target_start_date).slice(0, 7)); // "YYYY-MM"
        }
      });
    });
    return Array.from(keys).sort(); // chronological
  }, [diagramData]);

  const nodes = useMemo(() => {
    return team.map((m) => {
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
        tasks: memberTasks, // full list — stats (Total/Done/On Proc) stay overall
        targeted: visibleTargeted, // filtered — only this month's targets show as cards
      };
    });
  }, [team, diagramData, monthTab]);

  // ── Pure grid-layout calculator — members stacked vertically on the
  //    left, each with their targeted DTNs wrapping in a grid to the
  //    right. Used both to backfill missing positions AND to fully
  //    rebuild the layout on "Reset Layout" (no useEffect dependency,
  //    so it always runs when called, unlike relying on `nodes` changing).
  const computeDefaultPositions = useCallback(
    (nodeList) => {
      const layout = {};
      let y = 30;
      const memberX = 30;
      const taskStartX = memberX + CARD_W + H_GAP;

      nodeList.forEach((n) => {
        layout[n.id] = { x: memberX, y };
        const my = y;
        const rows = Math.max(1, Math.ceil(n.targeted.length / MAX_TASK_COLS));

        n.targeted.forEach((t, ti) => {
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

      return layout;
    },
    [
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

  // Backfill: only adds positions for nodes that don't have one yet
  // (new members/tasks that appeared since the last save). Existing
  // dragged positions are left untouched.
  useEffect(() => {
    setPositions((prev) => {
      const defaults = computeDefaultPositions(nodes);
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
  }, [nodes, computeDefaultPositions]);

  const persistPositions = (pos) => {
    try {
      localStorage.setItem(DIAGRAM_STORAGE_KEY, JSON.stringify(pos));
    } catch {
      /* ignore quota errors */
    }
  };

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

  // Rebuilds the full grid from scratch (not a merge) and applies it
  // immediately — this is what makes Reset Layout snap back to the
  // neat grid instead of leaving stale/empty positions behind.
  const handleResetLayout = () => {
    const defaults = computeDefaultPositions(nodes);
    setPositions(defaults);
    persistPositions(defaults);
  };

  if (team.length === 0) {
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
        No team members assigned to you yet.
      </div>
    );
  }

  const posValues = Object.values(positions);
  const canvasW = Math.max(1000, ...posValues.map((p) => p.x + 260));
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
      {/* Month tabs + Reset */}
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
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
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
          {/* connecting lines */}
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
            {nodes.map((n) => {
              const mp = positions[n.id];
              if (!mp) return null;
              return n.targeted.map((t) => {
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
            })}
          </svg>

          {nodes.map((n) => {
            const pos = positions[n.id] || { x: 0, y: 0 };
            const completed = n.tasks.filter(
              (t) => t.status === "Completed",
            ).length;
            return (
              <div key={n.id}>
                <div
                  onMouseDown={(e) => startDrag(e, n.id)}
                  style={{
                    position: "absolute",
                    left: pos.x,
                    top: pos.y,
                    width: CARD_W,
                    cursor: dragging?.id === n.id ? "grabbing" : "grab",
                    userSelect: "none",
                    zIndex: dragging?.id === n.id ? 10 : 1,
                  }}
                >
                  <MemberNode
                    member={n.member}
                    colors={colors}
                    loading={diagramLoading}
                    total={n.tasks.length}
                    completed={completed}
                    onProcess={n.tasks.length - completed}
                  />
                </div>

                {n.targeted.map((t) => {
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
                        cursor: dragging?.id === tid ? "grabbing" : "grab",
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
      </div>
    </div>
  );
}

// ── Target Table view: flat table of all targeted tasks, grouped by
//    member, filterable by month (based on target_start_date) ──────
function TargetTableView({ colors, team, diagramData, diagramLoading }) {
  const [monthTab, setMonthTab] = useState("all");

  const monthOptions = useMemo(() => {
    const keys = new Set();
    Object.values(diagramData).forEach((tasks) => {
      (tasks || []).forEach((t) => {
        if (t.is_targeted && t.target_start_date) {
          keys.add(String(t.target_start_date).slice(0, 7));
        }
      });
    });
    return Array.from(keys).sort();
  }, [diagramData]);

  const rows = useMemo(() => {
    const out = [];
    team.forEach((m) => {
      const memberTasks = diagramData[m.member_user_id] || [];
      const targeted = memberTasks
        .filter((t) => t.is_targeted)
        .filter(
          (t) =>
            monthTab === "all" ||
            (t.target_start_date &&
              String(t.target_start_date).slice(0, 7) === monthTab),
        );
      if (targeted.length > 0) {
        const total = memberTasks.length;
        const completed = memberTasks.filter(
          (t) => t.status === "Completed",
        ).length;
        out.push({
          member: m,
          targets: targeted,
          stats: {
            total,
            completed,
            onProcess: total - completed,
            targetCount: targeted.length, // ← filtered count, sumusunod sa month tab
          },
        });
      }
    });
    return out;
  }, [team, diagramData, monthTab]);

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
      {/* Month tabs */}
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
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
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

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {diagramLoading ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: colors.textTertiary,
              fontSize: "0.85rem",
            }}
          >
            Loading targets…
          </div>
        ) : rows.length === 0 ? (
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
                <th style={thStyle(colors)}>Target</th>
                <th style={thStyle(colors)}>Step</th>
                <th style={thStyle(colors)}>Status</th>
                <th style={thStyle(colors)}>Date Accomplished</th>
                <th style={thStyle(colors)}>Target Date</th>
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
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>
                          {member.member_name}
                        </div>
                        <div
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 400,
                            color: colors.textTertiary,
                            marginBottom: "0.4rem",
                          }}
                        >
                          {member.lead_role}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "3px",
                          }}
                        >
                          <MiniBadge
                            label="Total"
                            value={stats.total}
                            colors={colors}
                            tone="neutral"
                          />
                          <MiniBadge
                            label="Done"
                            value={stats.completed}
                            colors={colors}
                            tone="green"
                          />
                          <MiniBadge
                            label="On Proc"
                            value={stats.onProcess}
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

function MemberNode({ member, colors, loading, total, completed, onProcess }) {
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

      {loading && member.target_count > 0 && (
        <div style={{ fontSize: "0.58rem", color: colors.textTertiary }}>
          Loading…
        </div>
      )}
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

function TaskNode({ task, colors }) {
  return (
    <div
      title={task.target_remarks || ""}
      style={{
        background: colors.targetBg,
        border: `1px solid ${colors.targetBorder}`,
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
      {task.target_end_date && (
        <div
          style={{
            fontSize: "0.58rem",
            fontWeight: 600,
            color: colors.targetBorder,
          }}
        >
          until {task.target_end_date}
        </div>
      )}
    </div>
  );
}

export default function TargetAssignmentsPage({ darkMode }) {
  const colors = useColors(darkMode);

  const [team, setTeam] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState(null);

  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState(null);

  // ── Search & filters ────────────────────────────────────────────
  const [searchDtn, setSearchDtn] = useState("");
  const [filterStep, setFilterStep] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // ── Bulk selection ──────────────────────────────────────────────
  const [selectedLogIds, setSelectedLogIds] = useState(new Set());

  // ── Modal (single-task edit or bulk mark) ───────────────────────
  const [modalTasks, setModalTasks] = useState(null); // array or null
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // ── View tabs (List / Diagram) ───────────────────────────────────
  const [activeView, setActiveView] = useState("list"); // "list" | "diagram"
  const [diagramData, setDiagramData] = useState({}); // { [member_user_id]: targetedTasks[] }
  const [diagramLoading, setDiagramLoading] = useState(false);

  const loadTeam = useCallback(async () => {
    setTeamLoading(true);
    setTeamError(null);
    try {
      const data = await getMyTeam();
      setTeam(data);
      setSelectedMemberId((prev) => prev ?? data[0]?.member_user_id ?? null);
    } catch (err) {
      setTeamError(err.message);
    } finally {
      setTeamLoading(false);
    }
  }, []);

  const loadTasks = useCallback(async (memberUserId) => {
    if (!memberUserId) {
      setTasks([]);
      return;
    }
    setTasksLoading(true);
    setTasksError(null);
    try {
      const data = await getMemberTasks(memberUserId);
      setTasks(data);
    } catch (err) {
      setTasksError(err.message);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  // ── Diagram view: fetch ALL tasks for EVERY team member ──────────
  // (kumpletong list — kailangan para sa Total/Completed/On Process counts;
  //  yung mga naka-target lang ang lalabas bilang children sa ilalim)
  const loadDiagramData = useCallback(async (members) => {
    if (!members || members.length === 0) {
      setDiagramData({});
      return;
    }
    setDiagramLoading(true);
    try {
      const results = await Promise.all(
        members.map((m) => getMemberTasks(m.member_user_id).catch(() => [])),
      );
      const map = {};
      members.forEach((m, i) => {
        map[m.member_user_id] = results[i] || [];
      });
      setDiagramData(map);
    } finally {
      setDiagramLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  useEffect(() => {
    loadTasks(selectedMemberId);
    // reset per-member UI state when switching members
    setSearchDtn("");
    setFilterStep("");
    setFilterStatus("");
    setSelectedLogIds(new Set());
  }, [selectedMemberId, loadTasks]);

  useEffect(() => {
    if (
      (activeView === "diagram" || activeView === "table") &&
      team.length > 0
    ) {
      loadDiagramData(team);
    }
  }, [activeView, team, loadDiagramData]);

  const selectedMember =
    team.find((m) => m.member_user_id === selectedMemberId) || null;

  // ── Derived: dropdown options from the current member's tasks ──
  const stepOptions = useMemo(
    () => [...new Set(tasks.map((t) => t.step).filter(Boolean))],
    [tasks],
  );
  const statusOptions = useMemo(
    () => [...new Set(tasks.map((t) => t.status).filter(Boolean))],
    [tasks],
  );

  // ── Derived: filtered task list ──────────────────────────────────
  const filteredTasks = useMemo(() => {
    const dtnQuery = searchDtn.trim();
    return tasks.filter((t) => {
      if (dtnQuery && !String(t.dtn ?? "").includes(dtnQuery)) return false;
      if (filterStep && t.step !== filterStep) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      return true;
    });
  }, [tasks, searchDtn, filterStep, filterStatus]);

  const allFilteredSelected =
    filteredTasks.length > 0 &&
    filteredTasks.every((t) => selectedLogIds.has(t.log_id));

  const toggleSelectAll = () => {
    setSelectedLogIds((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        filteredTasks.forEach((t) => next.delete(t.log_id));
        return next;
      }
      const next = new Set(prev);
      filteredTasks.forEach((t) => next.add(t.log_id));
      return next;
    });
  };

  const toggleSelectOne = (logId) => {
    setSelectedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  };

  const refreshAfterChange = async () => {
    await Promise.all([loadTasks(selectedMemberId), loadTeam()]);
  };

  const openTargetModal = (task) => setModalTasks([task]);
  const openBulkModal = () => {
    const selectedTasks = tasks.filter((t) => selectedLogIds.has(t.log_id));
    if (selectedTasks.length > 0) setModalTasks(selectedTasks);
  };
  const closeModal = () => {
    if (!modalSubmitting) setModalTasks(null);
  };

  const handleModalSubmit = async ({
    targetStartDate,
    targetEndDate,
    remarks,
  }) => {
    if (!modalTasks || modalTasks.length === 0) return;
    setModalSubmitting(true);
    try {
      if (modalTasks.length > 1) {
        await bulkMarkAsTarget(
          modalTasks.map((t) => t.log_id),
          { targetStartDate, targetEndDate, remarks },
        );
        setSelectedLogIds(new Set());
      } else {
        await markAsTarget(modalTasks[0].log_id, {
          targetStartDate,
          targetEndDate,
          remarks,
        });
      }
      await refreshAfterChange();
      setModalTasks(null);
    } catch (err) {
      setTasksError(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleRemoveTarget = async () => {
    if (!modalTasks || modalTasks.length !== 1) return;
    setModalSubmitting(true);
    try {
      await unmarkAsTarget(modalTasks[0].log_id);
      await refreshAfterChange();
      setModalTasks(null);
    } catch (err) {
      setTasksError(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        background: colors.pageBg,
        color: colors.textPrimary,
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: "1rem",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: "0.75rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
          🎯 Target Assignments
        </h1>
        <p
          style={{
            margin: "0.25rem 0 0",
            fontSize: "0.8rem",
            color: colors.textSecondary,
          }}
        >
          Showing team members assigned to you as lead.
        </p>
      </div>

      {/* VIEW TABS */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          marginBottom: "1rem",
          borderBottom: `1px solid ${colors.cardBorder}`,
        }}
      >
        {[
          { key: "list", label: "📋 List View" },
          { key: "diagram", label: "🗺️ Team Diagram" },
          { key: "table", label: "📊 Target Table" },
        ].map((tab) => {
          const isActive = activeView === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
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
      </div>

      {activeView === "list" ? (
        <div style={{ flex: 1, display: "flex", gap: "1rem", minHeight: 0 }}>
          {/* LEFT: MY TEAM */}
          <div
            style={{
              width: 300,
              flexShrink: 0,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "10px",
              background: colors.cardBg,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "0.75rem 1rem",
                borderBottom: `1px solid ${colors.cardBorder}`,
                fontSize: "0.75rem",
                fontWeight: 700,
                color: colors.textSecondary,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              My Team ({team.length})
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {teamLoading ? (
                <div
                  style={{
                    padding: "1.5rem",
                    color: colors.textTertiary,
                    fontSize: "0.85rem",
                  }}
                >
                  Loading team…
                </div>
              ) : teamError ? (
                <div
                  style={{
                    padding: "1.5rem",
                    color: "#ef4444",
                    fontSize: "0.85rem",
                  }}
                >
                  {teamError}
                </div>
              ) : team.length === 0 ? (
                <div
                  style={{
                    padding: "1.5rem",
                    color: colors.textTertiary,
                    fontSize: "0.85rem",
                  }}
                >
                  No team members assigned to you yet.
                </div>
              ) : (
                team.map((m) => {
                  const isSelected = m.member_user_id === selectedMemberId;
                  return (
                    <div
                      key={m.lead_assignment_id}
                      onClick={() => setSelectedMemberId(m.member_user_id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.65rem",
                        padding: "0.65rem 1rem",
                        cursor: "pointer",
                        background: isSelected
                          ? colors.selectedBg
                          : "transparent",
                        borderLeft: `3px solid ${isSelected ? colors.selectedBorder : "transparent"}`,
                        borderBottom: `1px solid ${colors.cardBorder}`,
                        transition: "background 0.15s",
                      }}
                    >
                      <Avatar name={m.member_name} colors={colors} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {m.member_name}
                        </div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: colors.textTertiary,
                          }}
                        >
                          {m.lead_role} · {m.task_count} task
                          {m.task_count !== 1 ? "s" : ""}
                        </div>
                      </div>
                      {m.target_count > 0 && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            color: colors.targetBorder,
                            background: colors.targetBg,
                            border: `1px solid ${colors.targetBorder}`,
                            borderRadius: "9999px",
                            padding: "1px 7px",
                            flexShrink: 0,
                          }}
                        >
                          {m.target_count} 🎯
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: SELECTED MEMBER'S TASKS */}
          <div
            style={{
              flex: 1,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "10px",
              background: colors.cardBg,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              minWidth: 0,
            }}
          >
            {!selectedMember ? (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: colors.textTertiary,
                }}
              >
                Select a team member to view their tasks.
              </div>
            ) : (
              <>
                <div
                  style={{
                    padding: "0.85rem 1.1rem",
                    borderBottom: `1px solid ${colors.cardBorder}`,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <Avatar name={selectedMember.member_name} colors={colors} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>
                      {selectedMember.member_name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: colors.textSecondary,
                      }}
                    >
                      Currently assigned tasks — select which ones to mark as
                      target
                    </div>
                  </div>
                  {selectedLogIds.size > 0 && (
                    <button
                      onClick={openBulkModal}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: "none",
                        background: colors.targetBorder,
                        color: "#fff",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      🎯 Target {selectedLogIds.size} Selected
                    </button>
                  )}
                </div>

                {/* SEARCH & FILTERS */}
                <div
                  style={{
                    padding: "0.6rem 1.1rem",
                    borderBottom: `1px solid ${colors.cardBorder}`,
                    display: "flex",
                    gap: "0.6rem",
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Search DTN…"
                    value={searchDtn}
                    onChange={(e) => setSearchDtn(e.target.value)}
                    style={{ ...inputStyle(colors), width: 180 }}
                  />
                  <select
                    value={filterStep}
                    onChange={(e) => setFilterStep(e.target.value)}
                    style={{ ...inputStyle(colors), width: 170 }}
                  >
                    <option value="">All Steps</option>
                    {stepOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ ...inputStyle(colors), width: 170 }}
                  >
                    <option value="">All Statuses</option>
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {(searchDtn || filterStep || filterStatus) && (
                    <button
                      onClick={() => {
                        setSearchDtn("");
                        setFilterStep("");
                        setFilterStatus("");
                      }}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: `1px solid ${colors.cardBorder}`,
                        background: "transparent",
                        color: colors.textSecondary,
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div style={{ overflowY: "auto", flex: 1 }}>
                  {tasksLoading ? (
                    <div
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: colors.textTertiary,
                        fontSize: "0.85rem",
                      }}
                    >
                      Loading tasks…
                    </div>
                  ) : tasksError ? (
                    <div
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "#ef4444",
                        fontSize: "0.85rem",
                      }}
                    >
                      {tasksError}
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: colors.textTertiary,
                        fontSize: "0.85rem",
                      }}
                    >
                      {tasks.length === 0
                        ? "No active tasks assigned to this user right now."
                        : "No tasks match your search/filters."}
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
                        <tr
                          style={{
                            background: colors.rowHover,
                            textAlign: "left",
                          }}
                        >
                          <th style={{ ...thStyle(colors), width: 34 }}>
                            <input
                              type="checkbox"
                              checked={allFilteredSelected}
                              onChange={toggleSelectAll}
                            />
                          </th>
                          <th style={thStyle(colors)}>DTN</th>
                          <th style={thStyle(colors)}>Brand Name</th>
                          <th style={thStyle(colors)}>Step</th>
                          <th style={thStyle(colors)}>Status</th>
                          <th style={thStyle(colors)}>App Type</th>
                          <th style={thStyle(colors)}>Processing Type</th>
                          <th style={thStyle(colors)}>Timeline</th>
                          <th style={thStyle(colors)}>
                            Date Received (Center)
                          </th>
                          <th style={thStyle(colors)}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.map((t) => (
                          <tr
                            key={t.log_id}
                            style={{
                              borderTop: `1px solid ${colors.cardBorder}`,
                              background: t.is_targeted
                                ? colors.targetBg
                                : "transparent",
                            }}
                          >
                            <td style={tdStyle(colors)}>
                              <input
                                type="checkbox"
                                checked={selectedLogIds.has(t.log_id)}
                                onChange={() => toggleSelectOne(t.log_id)}
                              />
                            </td>
                            <td style={tdStyle(colors)}>{t.dtn}</td>
                            <td style={{ ...tdStyle(colors), fontWeight: 600 }}>
                              {t.brand_name}
                              {t.is_targeted && t.target_end_date && (
                                <div
                                  style={{
                                    fontWeight: 400,
                                    fontSize: "0.7rem",
                                    color: colors.targetBorder,
                                    marginTop: 2,
                                  }}
                                >
                                  🎯 {t.target_start_date} → {t.target_end_date}
                                </div>
                              )}
                            </td>
                            <td style={tdStyle(colors)}>{t.step}</td>
                            <td style={tdStyle(colors)}>
                              <StatusPill status={t.status} />
                            </td>
                            <td style={tdStyle(colors)}>{t.app_type || "—"}</td>
                            <td style={tdStyle(colors)}>
                              {t.processing_type || "—"}
                            </td>
                            <td style={tdStyle(colors)}>
                              {t.timeline != null ? `${t.timeline} days` : "—"}
                            </td>
                            <td style={tdStyle(colors)}>
                              {t.date_received_center || "—"}
                            </td>
                            <td
                              style={{ ...tdStyle(colors), textAlign: "right" }}
                            >
                              <button
                                onClick={() => openTargetModal(t)}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  border: `1px solid ${t.is_targeted ? colors.targetBorder : colors.cardBorder}`,
                                  background: t.is_targeted
                                    ? colors.targetBorder
                                    : "transparent",
                                  color: t.is_targeted
                                    ? "#fff"
                                    : colors.textSecondary,
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {t.is_targeted
                                  ? "🎯 Targeted"
                                  : "Mark as Target"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : activeView === "diagram" ? (
        <TeamDiagramView
          colors={colors}
          darkMode={darkMode}
          team={team}
          diagramData={diagramData}
          diagramLoading={diagramLoading}
        />
      ) : (
        <TargetTableView
          colors={colors}
          team={team}
          diagramData={diagramData}
          diagramLoading={diagramLoading}
        />
      )}

      {modalTasks && (
        <TargetModal
          colors={colors}
          tasks={modalTasks}
          onClose={closeModal}
          onSubmit={handleModalSubmit}
          onRemoveTarget={handleRemoveTarget}
          submitting={modalSubmitting}
        />
      )}
    </div>
  );
}
