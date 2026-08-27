import React, { useMemo } from "react";
import { getTargetOutcome, TARGET_OUTCOME_STYLES } from "./statusHelpers";

// ── Small KPI card — used for the top-line totals ────────────────────
function SummaryCard({ label, value, colors, accent }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 140,
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 12,
        padding: "0.9rem 1.1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.3rem",
      }}
    >
      <span
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          color: colors.textTertiary,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "1.7rem",
          fontWeight: 800,
          color: accent,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Plain single-color bar — used for the "Current" (workload) row.
//    Scaled against `maxValue`, shared across every bar (Current AND
//    Target, every member) so bar lengths stay comparable. ──────────
function MonitoringBar({ label, value, maxValue, color, colors }) {
  const pct = maxValue === 0 ? 0 : Math.round((value / maxValue) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
      <span
        style={{
          fontSize: "0.68rem",
          fontWeight: 700,
          color: colors.textSecondary,
          minWidth: 64,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 10,
          borderRadius: 5,
          background: colors.rowHover,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 5,
            transition: "width 0.2s",
          }}
        />
      </div>
      <span
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          color: colors.textPrimary,
          minWidth: 22,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Segmented "Target" bar — within (green) / missed (red, i.e. beyond
//    or overdue) / pending (blue, still on track) — using the exact
//    same colors as TARGET_OUTCOME_STYLES, so this matches the
//    TargetOutcomeBadge colors seen on the Target Table tab. Scaled
//    against the SAME maxValue as the Current bar above it. ──────────
function SegmentedTargetBar({ within, missed, pending, maxValue, colors }) {
  const total = within + missed + pending;
  const pct = (n) => (maxValue === 0 ? 0 : (n / maxValue) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
      <span
        style={{
          fontSize: "0.68rem",
          fontWeight: 700,
          color: colors.textSecondary,
          minWidth: 64,
          whiteSpace: "nowrap",
        }}
      >
        Target
      </span>
      <div
        style={{
          flex: 1,
          height: 10,
          borderRadius: 5,
          background: colors.rowHover,
          overflow: "hidden",
          display: "flex",
        }}
      >
        <div
          style={{
            width: `${pct(within)}%`,
            background: TARGET_OUTCOME_STYLES.within.border,
          }}
          title={`${within} within target`}
        />
        <div
          style={{
            width: `${pct(missed)}%`,
            background: TARGET_OUTCOME_STYLES.beyond.border,
          }}
          title={`${missed} beyond target / overdue`}
        />
        <div
          style={{
            width: `${pct(pending)}%`,
            background: TARGET_OUTCOME_STYLES.pending.border,
          }}
          title={`${pending} pending (on track)`}
        />
      </div>
      <span
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          color: colors.textPrimary,
          minWidth: 22,
          textAlign: "right",
        }}
      >
        {total}
      </span>
    </div>
  );
}

// ── One member's row: name/role on the left, two stacked comparison
//    bars (Current vs Target-with-outcome-breakdown) on the right. ──
function MemberMonitoringRow({
  member,
  targetStats,
  current,
  maxValue,
  colors,
}) {
  const { within, missed, pending, total } = targetStats;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "0.75rem 1rem",
        borderBottom: `1px solid ${colors.cardBorder}`,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 160, flexShrink: 0 }}>
        <div
          style={{
            fontSize: "0.82rem",
            fontWeight: 700,
            color: colors.textPrimary,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {member.member_name}
        </div>
        <div style={{ fontSize: "0.66rem", color: colors.textTertiary }}>
          {member.lead_role}
          {total > 0 && (
            <>
              {" "}
              · {within}/{total} within target
            </>
          )}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 220,
          display: "flex",
          flexDirection: "column",
          gap: "0.35rem",
        }}
      >
        <MonitoringBar
          label="Current"
          value={current}
          maxValue={maxValue}
          color={colors.btnPrimary}
          colors={colors}
        />
        <SegmentedTargetBar
          within={within}
          missed={missed}
          pending={pending}
          maxValue={maxValue}
          colors={colors}
        />
      </div>
    </div>
  );
}

// ── Target Monitoring tab — for a lead/supervisor to see, at a glance,
//    how each of their team members' CURRENT workload (in-progress
//    task count) compares against their TARGET tasks, and how those
//    targets break down into within-target / missed / still-pending.
//
//    Derives everything from `diagramData` (the same full per-member
//    task list already used by TargetTableView) via getTargetOutcome,
//    so the numbers here are guaranteed to match what's shown on the
//    Target Table tab — no separate backend "completed"/"overdue"
//    computation to keep in sync. ─────────────────────────────────────
export function TargetMonitoringView({
  colors,
  team,
  diagramData,
  diagramLoading,
}) {
  // ── Per-member targeted-task breakdown, deduped by db_id — a
  //    TargetAssignment is scoped to an APPLICATION (db_id), not a
  //    step, but diagramData has one row per step. If a member touched
  //    the same targeted application at more than one step, keep only
  //    the most recent row (highest log_id) so it's counted once. ──
  const memberStats = useMemo(() => {
    const map = {};
    team.forEach((m) => {
      const memberTasks = diagramData[m.member_user_id] || [];
      const targetedRaw = memberTasks.filter((t) => t.is_targeted);

      const byDbId = new Map();
      targetedRaw.forEach((t) => {
        const existing = byDbId.get(t.db_id);
        if (!existing || t.log_id > existing.log_id) {
          byDbId.set(t.db_id, t);
        }
      });
      const targeted = Array.from(byDbId.values());

      let within = 0;
      let missed = 0; // beyond target OR overdue
      let pending = 0; // still on track, or unknown target date
      targeted.forEach((t) => {
        const outcome = getTargetOutcome(t);
        if (outcome === "within") within++;
        else if (outcome === "beyond" || outcome === "overdue") missed++;
        else pending++; // "pending" or "unknown"
      });

      map[m.member_user_id] = {
        within,
        missed,
        pending,
        total: targeted.length,
      };
    });
    return map;
  }, [team, diagramData]);

  // ── Sort by target total desc, so members with the heaviest target
  //    load surface first — the people most worth checking on. ──────
  const sortedTeam = useMemo(
    () =>
      [...team].sort(
        (a, b) =>
          (memberStats[b.member_user_id]?.total || 0) -
          (memberStats[a.member_user_id]?.total || 0),
      ),
    [team, memberStats],
  );

  // ── Shared scale across every bar (Current AND Target, every
  //    member) so bar lengths are directly comparable to each other. ──
  const maxValue = useMemo(
    () =>
      team.reduce(
        (max, m) =>
          Math.max(
            max,
            m.in_progress_count || 0,
            memberStats[m.member_user_id]?.total || 0,
          ),
        0,
      ),
    [team, memberStats],
  );

  const totals = useMemo(
    () =>
      team.reduce(
        (acc, m) => {
          const s = memberStats[m.member_user_id] || {
            within: 0,
            missed: 0,
            pending: 0,
            total: 0,
          };
          return {
            current: acc.current + (m.in_progress_count || 0),
            target: acc.target + s.total,
            within: acc.within + s.within,
            missed: acc.missed + s.missed,
            pending: acc.pending + s.pending,
          };
        },
        { current: 0, target: 0, within: 0, missed: 0, pending: 0 },
      ),
    [team, memberStats],
  );

  if (diagramLoading) {
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
        Loading targets…
      </div>
    );
  }

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

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        overflow: "auto",
      }}
    >
      {/* Top-line totals */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <SummaryCard
          label="Total Active Targets"
          value={totals.target}
          colors={colors}
          accent={colors.textPrimary}
        />
        <SummaryCard
          label="Within Target"
          value={totals.within}
          colors={colors}
          accent={TARGET_OUTCOME_STYLES.within.border}
        />
        <SummaryCard
          label="Missed (Beyond/Overdue)"
          value={totals.missed}
          colors={colors}
          accent={TARGET_OUTCOME_STYLES.beyond.border}
        />
        <SummaryCard
          label="Pending (On Track)"
          value={totals.pending}
          colors={colors}
          accent={TARGET_OUTCOME_STYLES.pending.border}
        />
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1.2rem",
          fontSize: "0.7rem",
          color: colors.textTertiary,
        }}
      >
        <span>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 2,
              background: colors.btnPrimary,
              marginRight: 4,
            }}
          />
          Current — in-progress tasks right now
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 2,
              background: TARGET_OUTCOME_STYLES.within.border,
              marginRight: 4,
            }}
          />
          Target: Within
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 2,
              background: TARGET_OUTCOME_STYLES.beyond.border,
              marginRight: 4,
            }}
          />
          Target: Beyond / Overdue
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 2,
              background: TARGET_OUTCOME_STYLES.pending.border,
              marginRight: 4,
            }}
          />
          Target: Pending (On Track)
        </span>
      </div>

      {/* Per-member bar comparison */}
      <div
        style={{
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 10,
          background: colors.cardBg,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "0.7rem 1rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            fontSize: "0.78rem",
            fontWeight: 700,
            color: colors.textPrimary,
          }}
        >
          📊 Current vs Target — by member
        </div>
        {sortedTeam.map((m) => (
          <MemberMonitoringRow
            key={m.lead_assignment_id}
            member={m}
            targetStats={
              memberStats[m.member_user_id] || {
                within: 0,
                missed: 0,
                pending: 0,
                total: 0,
              }
            }
            current={m.in_progress_count || 0}
            maxValue={maxValue}
            colors={colors}
          />
        ))}
      </div>
    </div>
  );
}

export default TargetMonitoringView;
