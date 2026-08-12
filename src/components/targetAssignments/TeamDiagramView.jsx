import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { MiniBadge } from "./MiniBadge";
import { STATUS_KIND_MAP, STATUS_KIND_STYLES, isCompletedStatus, formatMonthLabel } from "./statusHelpers";

const DIAGRAM_STORAGE_KEY = "targetDiagramPositions";

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
        <MiniBadge label="Completed" value={completed} colors={colors} tone="green" />
        <MiniBadge label="In Progress" value={onProcess} colors={colors} tone="blue" />
        <MiniBadge label="🎯" value={member.target_count} colors={colors} tone="target" />
      </div>

      {loading && member.target_count > 0 && (
        <div style={{ fontSize: "0.58rem", color: colors.textTertiary }}>
          Loading…
        </div>
      )}
    </div>
  );
}

function TaskNode({ task, colors }) {
  const key = (task.status || "").trim().toUpperCase();
  const kind = STATUS_KIND_MAP[key] || "default";
  const statusColor = STATUS_KIND_STYLES[kind].color;

  return (
    <div
      title={task.target_remarks || ""}
      style={{
        background: `${statusColor}1a`, // ~10% opacity tint of the status color
        border: `1px solid ${statusColor}`,
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
      <div style={{ fontSize: "0.58rem", fontWeight: 700, color: statusColor }}>
        {task.status || "—"}
      </div>
      {task.target_end_date && (
        <div style={{ fontSize: "0.58rem", fontWeight: 600, color: statusColor }}>
          until {task.target_end_date}
        </div>
      )}
    </div>
  );
}

// ── Diagram view: draggable member + task cards, connected by lines,
//    filterable by month tabs (based on target_start_date) ──────────
export function TeamDiagramView({ colors, darkMode, team, diagramData, diagramLoading }) {
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

        const blockHeight = Math.max(CARD_H, rows * TASK_H + (rows - 1) * TASK_ROW_GAP);
        y = my + blockHeight + V_GAP;
      });

      return layout;
    },
    [CARD_W, CARD_H, TASK_W, TASK_H, H_GAP, V_GAP, TASK_ROW_GAP, TASK_COL_GAP, MAX_TASK_COLS],
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
              background: monthTab === "all" ? colors.selectedBg : "transparent",
              color: monthTab === "all" ? colors.selectedBorder : colors.textSecondary,
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
            <span style={{ fontSize: "0.7rem", color: colors.textTertiary, padding: "4px 4px" }}>
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
        <div ref={containerRef} style={{ position: "relative", width: canvasW, height: canvasH }}>
          {/* connecting lines */}
          <svg
            width={canvasW}
            height={canvasH}
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
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
            const completed = n.tasks.filter((t) => isCompletedStatus(t.status)).length;
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

export default TeamDiagramView;
