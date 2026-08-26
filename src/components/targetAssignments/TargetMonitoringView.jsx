import React, { useMemo } from "react";

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

// ── One labeled bar — reused for both the "Current" and "Target" rows
//    under a member. `maxValue` is shared across ALL members and BOTH
//    bar kinds, so bar lengths are directly comparable to each other,
//    not just within one member's own two bars. ──────────────────────
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

// ── One member's row: name/role on the left, two stacked comparison
//    bars (Current vs Target) on the right. ──────────────────────────
function MemberMonitoringRow({ member, maxValue, colors }) {
  const current = member.in_progress_count || 0;
  const target = member.target_count || 0;
  const total = member.task_count || 0;
  const completed = member.completed_count || 0;
  const completionPct = total === 0 ? 0 : Math.round((completed / total) * 100);

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
          {member.lead_role} · {completionPct}% completed overall
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
        <MonitoringBar
          label="Target"
          value={target}
          maxValue={maxValue}
          color={colors.targetBorder}
          colors={colors}
        />
      </div>
    </div>
  );
}

// ── Target Monitoring tab — for a lead/supervisor to see, at a glance,
//    how each of their team members' CURRENT workload (in-progress
//    task count) compares against their TARGET task count. Purely a
//    client-side view over `team` (already fetched via getMyTeam by
//    the parent page) — no additional API calls needed, since
//    in_progress_count/target_count/task_count/completed_count are
//    already included on each team member record. ───────────────────
export function TargetMonitoringView({ colors, team, teamLoading, teamError }) {
  // ── Sort by target_count desc, so members with the heaviest target
  //    load surface first — the people most worth checking on. ──────
  const sortedTeam = useMemo(
    () =>
      [...team].sort((a, b) => (b.target_count || 0) - (a.target_count || 0)),
    [team],
  );

  // ── Shared scale across every bar (Current AND Target, every
  //    member) so bar lengths are directly comparable to each other. ──
  const maxValue = useMemo(
    () =>
      team.reduce(
        (max, m) =>
          Math.max(max, m.in_progress_count || 0, m.target_count || 0),
        0,
      ),
    [team],
  );

  const totals = useMemo(
    () =>
      team.reduce(
        (acc, m) => ({
          inProgress: acc.inProgress + (m.in_progress_count || 0),
          target: acc.target + (m.target_count || 0),
          completed: acc.completed + (m.completed_count || 0),
        }),
        { inProgress: 0, target: 0, completed: 0 },
      ),
    [team],
  );

  if (teamLoading) {
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
        Loading team…
      </div>
    );
  }

  if (teamError) {
    return (
      <div style={{ padding: "1.5rem", color: "#ef4444", fontSize: "0.85rem" }}>
        {teamError}
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
          label="Team Members"
          value={team.length}
          colors={colors}
          accent={colors.textPrimary}
        />
        <SummaryCard
          label="Total Current"
          value={totals.inProgress}
          colors={colors}
          accent={colors.btnPrimary}
        />
        <SummaryCard
          label="Total Target"
          value={totals.target}
          colors={colors}
          accent={colors.targetBorder}
        />
        <SummaryCard
          label="Total Completed"
          value={totals.completed}
          colors={colors}
          accent={colors.targetBorder}
        />
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
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
              background: colors.targetBorder,
              marginRight: 4,
            }}
          />
          Target — tasks marked as target
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
            maxValue={maxValue}
            colors={colors}
          />
        ))}
      </div>
    </div>
  );
}

export default TargetMonitoringView;
