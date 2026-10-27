// src/components/monitoring/analytics/InProgressByUserModal.jsx
// Opens from the "In Progress" KPI tile.
// Two tabs:
//   - Per User: ranking of users, with an expandable application-type breakdown
//   - Per Team: users grouped by unit, with team total, avg per member and
//     the application-type mix of the team
import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { getInProgressSummary } from "../../../api/monitoring";
import { FB } from "./analyticsConstants";
import { neuCardBg } from "./analyticsHelpers";
import UserApplicationsModal from "./UserApplicationsModal";

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const AMBER = "#f59e0b";
const RED = "#e02020";
const GREEN = "#36a420";
const ABOVE_AVG_RATIO = 1.25; // member is flagged when 25% above the team avg
const NO_UNIT = "No unit";
const NO_GROUP = "No group";

const TYPE_PALETTE = [
  "#4f8ef7",
  "#f59e0b",
  "#36a420",
  "#9333ea",
  "#0891b2",
  "#e87c13",
  "#e02020",
  "#ec4899",
];

// The users-tasks endpoint's exact field names aren't known here, so read the
// common spellings defensively.
const nameOf = (r) =>
  r.full_name ??
  r.name ??
  r.user_name ??
  r.username ??
  r.user ??
  (r.user_id != null ? `User #${r.user_id}` : "Unknown");
const inProgressOf = (r) =>
  Number(r.tasks?.in_progress ?? r.in_progress ?? r.inProgress ?? 0) || 0;
// Unit = team (same grouping as the Workload view).
// Group = functional role (Evaluator, Checker/Evaluator, Preassessor, ...).
const unitNameOf = (r) =>
  r.unit_name ?? r.unit ?? r.team_name ?? r.team ?? null;
const unitIdOf = (r) => r.unit_id ?? r.team_id ?? null;
const groupNameOf = (r) => r.group_name ?? null;
const groupIdOf = (r) => r.group_id ?? null;

// Accepts either { "RX / Initial": 12 } or [{ type: "RX / Initial", count: 12 }]
const typesOf = (r) => {
  const raw =
    r.tasks?.by_type ??
    r.by_app_type ??
    r.app_types ??
    r.by_type ??
    r.tasks?.by_app_type ??
    null;
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw.map((x) => ({
        label: x.label ?? x.type ?? x.name ?? "Unknown",
        count: Number(x.count ?? x.in_progress ?? 0) || 0,
      }))
    : Object.entries(raw).map(([label, count]) => ({
        label,
        count: Number(count) || 0,
      }));
  return list.filter((x) => x.count > 0).sort((a, b) => b.count - a.count);
};

const mergeTypes = (lists) => {
  const map = new Map();
  lists.forEach((l) =>
    l.forEach((t) => map.set(t.label, (map.get(t.label) ?? 0) + t.count)),
  );
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
};

const fmtAvg = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });

// ── Application-type breakdown: stacked bar + chips ──────────
function TypeBreakdown({ types, total, colorOf, ui, line }) {
  if (types.length === 0) {
    return (
      <div style={{ fontSize: "0.72rem", color: ui.textMuted }}>
        No application type breakdown available.
      </div>
    );
  }
  const typeTotal = types.reduce((s, t) => s + t.count, 0) || total || 1;
  return (
    <div>
      <div
        style={{
          display: "flex",
          height: 8,
          borderRadius: 99,
          overflow: "hidden",
          border: `1px solid ${line}`,
          marginBottom: 8,
        }}
      >
        {types.map((t) => (
          <div
            key={t.label}
            title={`${t.label}: ${t.count.toLocaleString()}`}
            style={{
              width: `${(t.count / typeTotal) * 100}%`,
              background: colorOf(t.label),
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {types.map((t, i) => (
          <span
            key={t.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: "0.7rem",
              padding: "2px 8px",
              borderRadius: 99,
              border: `1px solid ${i === 0 ? colorOf(t.label) : line}`,
              background: i === 0 ? `${colorOf(t.label)}18` : "transparent",
              color: ui.textPrimary,
              fontWeight: i === 0 ? 700 : 500,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: colorOf(t.label),
              }}
            />
            {t.label}
            <b>{t.count.toLocaleString()}</b>
            <span style={{ color: ui.textMuted }}>
              {Math.round((t.count / typeTotal) * 100)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── One user row (used in both tabs) ─────────────────────────
function UserRow({
  r,
  index,
  max,
  teamAvg,
  subLabel,
  expanded,
  onToggle,
  onView,
  colorOf,
  ui,
  darkMode,
  line,
  isLast,
}) {
  const above = teamAvg != null && r.inProgress > teamAvg * ABOVE_AVG_RATIO;
  const topType = r.types[0];
  return (
    <div style={{ borderBottom: isLast ? "none" : `1px solid ${line}` }}>
      <div
        onClick={onToggle}
        title="Click to see the application types"
        style={{
          cursor: "pointer",
          display: "grid",
          gridTemplateColumns: "28px minmax(0,1fr) 110px 56px 22px",
          alignItems: "center",
          gap: 10,
          padding: "10px 18px",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = darkMode
            ? "rgba(255,255,255,0.04)"
            : "rgba(0,0,0,0.03)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span
          style={{
            fontSize: "0.72rem",
            color: ui.textMuted,
            textAlign: "center",
          }}
        >
          {index + 1}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              title={r.name}
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: ui.textPrimary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {r.name}
            </span>
            {above && (
              <span
                title={`Above team average (${fmtAvg(teamAvg)})`}
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 99,
                  color: RED,
                  background: `${RED}22`,
                  whiteSpace: "nowrap",
                }}
              >
                ▲ above avg
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: "0.68rem",
              color: ui.textMuted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {subLabel ? `${subLabel} · ` : ""}
            {topType
              ? `Most: ${topType.label} (${topType.count.toLocaleString()})`
              : "No type data"}
          </div>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 99,
            overflow: "hidden",
            background: darkMode
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              width: `${(r.inProgress / max) * 100}%`,
              height: "100%",
              background: above ? RED : AMBER,
            }}
          />
        </div>
        <span
          style={{
            fontSize: "0.85rem",
            fontWeight: 800,
            color: above ? RED : AMBER,
            textAlign: "right",
          }}
        >
          {r.inProgress.toLocaleString()}
        </span>
        <span style={{ fontSize: "0.7rem", color: ui.textMuted }}>
          {expanded ? "▾" : "▸"}
        </span>
      </div>

      {expanded && (
        <div style={{ padding: "2px 18px 12px 56px" }}>
          <TypeBreakdown
            types={r.types}
            total={r.inProgress}
            colorOf={colorOf}
            ui={ui}
            line={line}
          />
          {r.id != null && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(r);
              }}
              style={{
                marginTop: 10,
                padding: "4px 12px",
                fontSize: "0.72rem",
                fontWeight: 700,
                borderRadius: 8,
                border: `1px solid ${FB}`,
                background: "transparent",
                color: FB,
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              View applications →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Chart: horizontal stacked bars (one bar per user / unit / group) ──
// Each bar is split by application type. A dashed vertical line marks the
// average. Hover a segment to see the exact type and count.
const OTHER_LABEL = "Other";
const OTHER_COLOR = "#9aa0a6";
const CHART_MAX_ITEMS = 10;
const CHART_MAX_TYPES = 6;

function StackedChart({ items, avg, avgLabel, topLabels, colorOf, ui, line }) {
  const [hover, setHover] = useState(null); // { name, label, count, x, y }
  if (items.length === 0) return null;

  const shown = items.slice(0, CHART_MAX_ITEMS);
  const max = Math.max(...shown.map((i) => i.total), avg || 0, 1);
  const pct = (n) => `${(n / max) * 100}%`;
  const keep = new Set(topLabels);
  const colorFor = (label) =>
    label === OTHER_LABEL ? OTHER_COLOR : colorOf(label);

  // Fold everything outside the top types into "Other"
  const segmentsOf = (item) => {
    const segs = [];
    let other = 0;
    item.types.forEach((t) => {
      if (keep.has(t.label)) segs.push(t);
      else other += t.count;
    });
    if (other > 0) segs.push({ label: OTHER_LABEL, count: other });
    return segs;
  };
  const legend = [
    ...topLabels,
    ...(shown.some((i) => i.types.some((t) => !keep.has(t.label)))
      ? [OTHER_LABEL]
      : []),
  ];

  return (
    <div
      style={{ padding: "12px 18px 10px", borderBottom: `1px solid ${line}` }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
          fontSize: "0.72rem",
          color: ui.textMuted,
        }}
      >
        <span style={{ fontWeight: 700, color: ui.textPrimary }}>
          Top {shown.length} by in-progress, split by application type
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 14,
              borderTop: `2px dashed ${ui.textMuted}`,
              verticalAlign: "middle",
              marginRight: 5,
            }}
          />
          {avgLabel} {fmtAvg(avg)}
        </span>
      </div>

      <div style={{ position: "relative" }}>
        {shown.map((item) => (
          <div
            key={item.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 22,
            }}
          >
            <div
              title={item.name}
              style={{
                width: 120,
                flexShrink: 0,
                fontSize: "0.72rem",
                color: ui.textPrimary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textAlign: "right",
              }}
            >
              {item.name}
            </div>
            <div style={{ flex: 1, position: "relative", height: 14 }}>
              <div
                style={{
                  display: "flex",
                  width: pct(item.total),
                  height: "100%",
                  gap: 2, // surface gap between segments
                }}
              >
                {segmentsOf(item).map((s, idx, arr) => (
                  <div
                    key={s.label}
                    onMouseEnter={(e) => {
                      const box = e.currentTarget.getBoundingClientRect();
                      setHover({
                        name: item.name,
                        label: s.label,
                        count: s.count,
                        total: item.total,
                        x: box.left + box.width / 2,
                        y: box.top,
                      });
                    }}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      width: `${(s.count / item.total) * 100}%`,
                      background: colorFor(s.label),
                      borderRadius: idx === arr.length - 1 ? "0 4px 4px 0" : 0,
                      minWidth: 2,
                    }}
                  />
                ))}
              </div>
              {avg > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: -4,
                    bottom: -4,
                    left: pct(avg),
                    borderLeft: `2px dashed ${ui.textMuted}`,
                    opacity: 0.7,
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
            <div
              style={{
                width: 44,
                flexShrink: 0,
                fontSize: "0.72rem",
                fontWeight: 700,
                color: ui.textPrimary,
                textAlign: "right",
              }}
            >
              {item.total.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Legend: every series is named, so color is never the only cue */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px 12px",
          marginTop: 8,
        }}
      >
        {legend.map((label) => (
          <span
            key={label}
            style={{ fontSize: "0.68rem", color: ui.textMuted }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: 2,
                background: colorFor(label),
                marginRight: 5,
              }}
            />
            {label}
          </span>
        ))}
      </div>

      {hover && (
        <div
          style={{
            position: "fixed",
            left: hover.x,
            top: hover.y - 8,
            transform: "translate(-50%, -100%)",
            background: "rgba(20,20,20,0.92)",
            color: "#fff",
            padding: "5px 9px",
            borderRadius: 6,
            fontSize: "0.7rem",
            lineHeight: 1.4,
            pointerEvents: "none",
            zIndex: 100000,
            whiteSpace: "nowrap",
          }}
        >
          <b>{hover.name}</b>
          <br />
          {hover.label}: {hover.count.toLocaleString()} (
          {Math.round((hover.count / hover.total) * 100)}%)
        </div>
      )}
    </div>
  );
}

export default function InProgressByUserModal({
  ui,
  darkMode,
  onClose,
  expectedTotal, // the In Progress number shown on the KPI tile
}) {
  const [rows, setRows] = useState([]); // all users, including those with 0
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("user"); // "user" | "unit" | "group"
  const [expanded, setExpanded] = useState(() => new Set()); // user keys
  const [openTeams, setOpenTeams] = useState({}); // team key -> bool
  const [selected, setSelected] = useState(null); // { id, name }
  const selectedRef = useRef(null);
  selectedRef.current = selected;

  const line = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInProgressSummary();
      const list = (res?.data ?? []).map((r) => ({
        key: r.user_id ?? nameOf(r),
        id: r.user_id,
        name: nameOf(r),
        unit: unitNameOf(r),
        unitId: unitIdOf(r),
        group: groupNameOf(r),
        groupId: groupIdOf(r),
        inProgress: inProgressOf(r),
        types: typesOf(r),
      }));
      setRows(list);
    } catch (err) {
      setError(err.message || "Failed to load users.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onKey = (e) =>
      e.key === "Escape" && !selectedRef.current && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Stable color per application type across both tabs
  const colorOf = useMemo(() => {
    const labels = mergeTypes(rows.map((r) => r.types)).map((t) => t.label);
    const map = new Map(
      labels.map((l, i) => [l, TYPE_PALETTE[i % TYPE_PALETTE.length]]),
    );
    return (label) => map.get(label) ?? FB;
  }, [rows]);

  const hasUnits = rows.some((r) => r.unit || r.unitId != null);
  const hasGroups = rows.some((r) => r.group || r.groupId != null);
  const hasTypes = rows.some((r) => r.types.length > 0);

  const q = search.trim().toLowerCase();
  const active = useMemo(
    () =>
      rows
        .filter((r) => r.inProgress > 0)
        .sort((a, b) => b.inProgress - a.inProgress),
    [rows],
  );
  const filtered = useMemo(
    () => (q ? active.filter((r) => r.name.toLowerCase().includes(q)) : active),
    [active, q],
  );

  // ── Teams ──
  const teams = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const byGroup = tab === "group";
      const gid = byGroup ? r.groupId : r.unitId;
      const gname = byGroup ? r.group : r.unit;
      const key = `${byGroup ? "group" : "unit"}:${gid ?? gname ?? "none"}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: gname ?? (byGroup ? NO_GROUP : NO_UNIT),
          members: [],
        });
      }
      map.get(key).members.push(r);
    });
    return [...map.values()]
      .map((t) => {
        const total = t.members.reduce((s, m) => s + m.inProgress, 0);
        const activeMembers = t.members.filter((m) => m.inProgress > 0).length;
        return {
          ...t,
          total,
          size: t.members.length,
          activeMembers,
          avg: t.members.length ? total / t.members.length : 0,
          types: mergeTypes(t.members.map((m) => m.types)),
          members: [...t.members].sort((a, b) => b.inProgress - a.inProgress),
        };
      })
      .filter((t) => t.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [rows, tab]);

  const filteredTeams = useMemo(() => {
    if (!q) return teams;
    return teams
      .map((t) => ({
        ...t,
        shown: t.members.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            t.name.toLowerCase().includes(q),
        ),
      }))
      .filter((t) => t.shown.length > 0);
  }, [teams, q]);

  // ── Chart data: same entities as the list below, with their type split ──
  const chartItems = useMemo(
    () =>
      tab === "user"
        ? active.map((r) => ({
            key: r.key,
            name: r.name,
            total: r.inProgress,
            types: r.types,
          }))
        : teams.map((t) => ({
            key: t.key,
            name: t.name,
            total: t.total,
            types: t.types,
          })),
    [tab, active, teams],
  );
  const topLabels = useMemo(
    () =>
      mergeTypes(rows.map((r) => r.types))
        .slice(0, CHART_MAX_TYPES)
        .map((t) => t.label),
    [rows],
  );

  const sum = rows.reduce((s, r) => s + r.inProgress, 0);
  const avgPerUser = active.length ? sum / active.length : 0;
  const maxUser = Math.max(...active.map((r) => r.inProgress), 1);
  const maxTeam = Math.max(...teams.map((t) => t.total), 1);
  const mismatch =
    typeof expectedTotal === "number" &&
    !loading &&
    !error &&
    sum !== expectedTotal;

  const toggleUser = (key) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const tabBtn = (key, label) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      style={{
        padding: "5px 14px",
        fontSize: "0.76rem",
        fontWeight: tab === key ? 700 : 500,
        borderRadius: 99,
        border: `1px solid ${tab === key ? AMBER : line}`,
        background: tab === key ? `${AMBER}22` : "transparent",
        color: tab === key ? AMBER : ui.textMuted,
        cursor: "pointer",
        fontFamily: font,
      }}
    >
      {label}
    </button>
  );

  const stat = (label, value) => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span
        style={{
          fontSize: "0.6rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: ui.textMuted,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "0.95rem", fontWeight: 800, color: AMBER }}>
        {value}
      </span>
    </div>
  );

  const emptyBox = (text) => (
    <div
      style={{
        textAlign: "center",
        padding: 40,
        color: ui.textMuted,
        fontSize: "0.85rem",
      }}
    >
      {text}
    </div>
  );

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          background: neuCardBg(darkMode),
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          fontFamily: font,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 18px",
            borderBottom: `1px solid ${line}`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              ⏳ In Progress Monitoring
            </div>
            <div style={{ fontSize: "0.72rem", color: ui.textMuted }}>
              {loading
                ? "Loading…"
                : `${active.length} user${active.length !== 1 ? "s" : ""} · ${sum.toLocaleString()} in progress`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                tab === "user" ? "Search user…" : `Search ${tab} or user…`
              }
              autoComplete="off"
              style={{
                background: neuCardBg(darkMode),
                border: `1px solid ${line}`,
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: "0.78rem",
                color: ui.textPrimary,
                outline: "none",
                width: 170,
                fontFamily: font,
                colorScheme: darkMode ? "dark" : "light",
              }}
            />
            <button
              onClick={onClose}
              title="Close (Esc)"
              style={{
                padding: "4px 10px",
                fontSize: "0.9rem",
                borderRadius: 8,
                border: `1px solid ${line}`,
                background: "transparent",
                color: ui.textPrimary,
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs + quick stats */}
        {!loading && !error && rows.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              padding: "10px 18px",
              borderBottom: `1px solid ${line}`,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {tabBtn("user", "Per User")}
              {tabBtn("unit", "Per Unit")}
              {tabBtn("group", "Per Group")}
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              {stat("Avg per user", fmtAvg(avgPerUser))}
              {tab !== "user" &&
                stat(
                  tab === "unit" ? "Avg per unit" : "Avg per group",
                  fmtAvg(teams.length ? sum / teams.length : 0),
                )}
            </div>
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 160 }}>
          {!loading &&
            !error &&
            hasTypes &&
            chartItems.length > 0 &&
            (tab === "user" || (tab === "unit" ? hasUnits : hasGroups)) && (
              <StackedChart
                items={chartItems}
                avg={
                  tab === "user"
                    ? avgPerUser
                    : teams.length
                      ? sum / teams.length
                      : 0
                }
                avgLabel={
                  tab === "user"
                    ? "avg per user"
                    : tab === "unit"
                      ? "avg per unit"
                      : "avg per group"
                }
                topLabels={topLabels}
                colorOf={colorOf}
                ui={ui}
                line={line}
              />
            )}
          {loading ? (
            <div
              style={{
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 34,
                    borderRadius: 8,
                    background: darkMode
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.06)",
                    opacity: 1 - i * 0.1,
                  }}
                />
              ))}
            </div>
          ) : error ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: RED,
                fontSize: "0.85rem",
              }}
            >
              ⚠️ {error}{" "}
              <button
                onClick={load}
                style={{
                  background: "none",
                  border: "none",
                  color: FB,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontFamily: font,
                }}
              >
                Retry
              </button>
            </div>
          ) : active.length === 0 ? (
            emptyBox("No in-progress applications.")
          ) : tab === "user" ? (
            <>
              {!hasTypes && (
                <div
                  style={{
                    margin: "10px 18px 0",
                    fontSize: "0.72rem",
                    color: ui.textMuted,
                  }}
                >
                  The API does not return an application type breakdown yet, so
                  the type details are empty.
                </div>
              )}
              {filtered.length === 0
                ? emptyBox("No users match your search.")
                : filtered.map((r, i) => (
                    <UserRow
                      key={r.key}
                      r={r}
                      index={i}
                      max={maxUser}
                      teamAvg={null}
                      subLabel={[r.unit, r.group].filter(Boolean).join(" · ")}
                      expanded={expanded.has(r.key)}
                      onToggle={() => toggleUser(r.key)}
                      onView={(u) => setSelected({ id: u.id, name: u.name })}
                      colorOf={colorOf}
                      ui={ui}
                      darkMode={darkMode}
                      line={line}
                      isLast={i === filtered.length - 1}
                    />
                  ))}
            </>
          ) : !(tab === "unit" ? hasUnits : hasGroups) ? (
            emptyBox(
              tab === "unit"
                ? "No unit info was returned, so users cannot be grouped per unit."
                : "No group info was returned, so users cannot be grouped per group.",
            )
          ) : filteredTeams.length === 0 ? (
            emptyBox("No teams or users match your search.")
          ) : (
            filteredTeams.map((t) => {
              const open = openTeams[t.key] ?? false;
              const members = (t.shown ?? t.members).filter(
                (m) => m.inProgress > 0,
              );
              return (
                <div key={t.key} style={{ borderBottom: `1px solid ${line}` }}>
                  <div
                    onClick={() =>
                      setOpenTeams((p) => ({ ...p, [t.key]: !open }))
                    }
                    style={{ cursor: "pointer", padding: "12px 18px" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = darkMode
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.03)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: 12,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.88rem",
                          fontWeight: 700,
                          color: ui.textPrimary,
                        }}
                      >
                        {open ? "▾" : "▸"} {t.name}
                      </span>
                      <span
                        style={{
                          fontSize: "1rem",
                          fontWeight: 800,
                          color: AMBER,
                        }}
                      >
                        {t.total.toLocaleString()}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 14,
                        flexWrap: "wrap",
                        margin: "4px 0 8px",
                        fontSize: "0.72rem",
                        color: ui.textMuted,
                      }}
                    >
                      <span>
                        {t.size} member{t.size !== 1 ? "s" : ""}
                        {t.activeMembers !== t.size
                          ? ` (${t.activeMembers} with tasks)`
                          : ""}
                      </span>
                      <span>
                        avg per member{" "}
                        <b style={{ color: ui.textPrimary }}>{fmtAvg(t.avg)}</b>
                      </span>
                      {t.types[0] && (
                        <span>
                          top type{" "}
                          <b style={{ color: colorOf(t.types[0].label) }}>
                            {t.types[0].label}
                          </b>
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 99,
                        overflow: "hidden",
                        background: darkMode
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.08)",
                      }}
                    >
                      <div
                        style={{
                          width: `${(t.total / maxTeam) * 100}%`,
                          height: "100%",
                          background: AMBER,
                        }}
                      />
                    </div>
                  </div>

                  {open && (
                    <div
                      style={{
                        borderTop: `1px dashed ${line}`,
                        background: darkMode
                          ? "rgba(255,255,255,0.02)"
                          : "rgba(0,0,0,0.015)",
                      }}
                    >
                      <div style={{ padding: "10px 18px 4px" }}>
                        <TypeBreakdown
                          types={t.types}
                          total={t.total}
                          colorOf={colorOf}
                          ui={ui}
                          line={line}
                        />
                      </div>
                      {members.map((m, i) => (
                        <UserRow
                          key={m.key}
                          r={m}
                          index={i}
                          max={Math.max(...members.map((x) => x.inProgress), 1)}
                          teamAvg={t.avg}
                          subLabel={tab === "unit" ? m.group : m.unit}
                          expanded={expanded.has(m.key)}
                          onToggle={() => toggleUser(m.key)}
                          onView={(u) =>
                            setSelected({ id: u.id, name: u.name })
                          }
                          colorOf={colorOf}
                          ui={ui}
                          darkMode={darkMode}
                          line={line}
                          isLast={i === members.length - 1}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {!loading && !error && rows.length > 0 && (
          <div
            style={{
              padding: "10px 18px",
              borderTop: `1px solid ${line}`,
              fontSize: "0.72rem",
              color: ui.textMuted,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>
                {tab === "user"
                  ? filtered.length !== active.length
                    ? `${filtered.length} of ${active.length} users`
                    : `${active.length} users`
                  : `${filteredTeams.length} of ${teams.length} ${tab === "unit" ? "units" : "groups"}`}
              </span>
              <span>
                Total <b style={{ color: AMBER }}>{sum.toLocaleString()}</b>
              </span>
            </div>
            {mismatch && (
              <div style={{ color: ui.textMuted }}>
                Note: the In Progress tile shows{" "}
                {expectedTotal.toLocaleString()} applications, while the total
                above counts tasks per user. Some applications are processed in
                parallel by two users, so the same application is counted under
                each of them and the two totals can differ.
              </div>
            )}
          </div>
        )}
      </div>
      {selected && (
        <UserApplicationsModal
          user={selected}
          ui={ui}
          darkMode={darkMode}
          onClose={() => setSelected(null)}
        />
      )}
    </div>,
    document.body,
  );
}
