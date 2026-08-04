import React, { useState, useMemo } from "react";
import { StatusPill } from "./StatusPill";
import { TargetOutcomeBadge } from "./TargetOutcomeBadge";
import { thStyle, tdStyle } from "./sharedStyles";
import { isCompletedStatus, getTargetOutcome, formatMonthLabel } from "./statusHelpers";

// ── Compact stat grid for the Member cell — cleaner than a wall of
// badges. Two mini-tables: workload (Total/Done/On Proc/🎯) and
// target outcome (Within/Beyond), stacked vertically.
function MemberStatGrid({ stats, member, colors }) {
  const rowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "3px 8px",
    fontSize: "0.68rem",
  };
  const labelStyle2 = { color: colors.textTertiary, fontWeight: 500 };
  const valueStyle = (color) => ({
    fontWeight: 700,
    color: color || colors.textPrimary,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: 190 }}>
      <div style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: "6px", overflow: "hidden" }}>
        <div style={{ ...rowStyle, borderBottom: `1px solid ${colors.cardBorder}` }}>
          <span style={labelStyle2}>Total</span>
          <span style={valueStyle()}>{stats.total}</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: `1px solid ${colors.cardBorder}` }}>
          <span style={labelStyle2}>Completed</span>
          <span style={valueStyle("#22c55e")}>{stats.completed}</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: `1px solid ${colors.cardBorder}` }}>
          <span style={labelStyle2}>In Progress</span>
          <span style={valueStyle("#3b82f6")}>{stats.onProcess}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle2}>🎯 Targeted</span>
          <span style={valueStyle(colors.targetBorder)}>{member.target_count}</span>
        </div>
      </div>

      <div style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: "6px", overflow: "hidden" }}>
        <div style={{ ...rowStyle, borderBottom: `1px solid ${colors.cardBorder}` }}>
          <span style={labelStyle2}>✓ Within Target</span>
          <span style={valueStyle("#22c55e")}>{stats.withinCount}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle2}>✕ Beyond Target</span>
          <span style={valueStyle("#ef4444")}>{stats.beyondCount}</span>
        </div>
      </div>
    </div>
  );
}

// ── Target Table view: flat table of all targeted tasks, grouped by
//    member, filterable by month (based on target_start_date) ──────
export function TargetTableView({ colors, team, diagramData, diagramLoading }) {
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
            (t.target_start_date && String(t.target_start_date).slice(0, 7) === monthTab),
        );
      if (targeted.length > 0) {
        const total = memberTasks.length;
        const completed = memberTasks.filter((t) => isCompletedStatus(t.status)).length;

        let withinCount = 0;
        let beyondCount = 0;
        targeted.forEach((t) => {
          const outcome = getTargetOutcome(t);
          if (outcome === "within") withinCount++;
          if (outcome === "beyond" || outcome === "overdue") beyondCount++;
        });

        out.push({
          member: m,
          targets: targeted,
          stats: {
            total,
            completed,
            onProcess: total - completed,
            targetCount: targeted.length, // ← filtered count, sumusunod sa month tab
            withinCount,
            beyondCount,
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
        </div>

        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: colors.textSecondary }}>
          {totalCount} target{totalCount !== 1 ? "s" : ""} total
        </span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {diagramLoading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: colors.textTertiary, fontSize: "0.85rem" }}>
            Loading targets…
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: colors.textTertiary, fontSize: "0.85rem" }}>
            No targeted tasks for this period.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ background: colors.rowHover, textAlign: "left" }}>
                <th style={{ ...thStyle(colors), minWidth: 210 }}>Member</th>
                <th style={thStyle(colors)}>Target</th>
                <th style={thStyle(colors)}>Step</th>
                <th style={thStyle(colors)}>Status</th>
                <th style={thStyle(colors)}>Date Accomplished</th>
                <th style={thStyle(colors)}>Target Date</th>
                <th style={thStyle(colors)}>Target Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ member, targets, stats }) =>
                targets.map((t, idx) => (
                  <tr key={t.log_id} style={{ borderTop: `1px solid ${colors.cardBorder}` }}>
                    {idx === 0 && (
                      <td
                        rowSpan={targets.length}
                        style={{
                          ...tdStyle(colors),
                          verticalAlign: "top",
                          borderRight: `1px solid ${colors.cardBorder}`,
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{member.member_name}</div>
                        <div
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 400,
                            color: colors.textTertiary,
                            marginBottom: "0.5rem",
                          }}
                        >
                          {member.lead_role}
                        </div>
                        <MemberStatGrid stats={stats} member={member} colors={colors} />
                      </td>
                    )}
                    <td style={tdStyle(colors)}>
                      🎯 DTN {t.dtn}
                      <div style={{ fontSize: "0.72rem", color: colors.textSecondary, fontWeight: 400 }}>
                        {t.brand_name}
                      </div>
                    </td>
                    <td style={tdStyle(colors)}>{t.step || "—"}</td>
                    <td style={tdStyle(colors)}>
                      <StatusPill status={t.status} />
                    </td>
                    <td style={tdStyle(colors)}>
                      {t.date_accomplished ? String(t.date_accomplished).slice(0, 10) : "—"}
                    </td>
                    <td style={tdStyle(colors)}>
                      {t.target_start_date && t.target_end_date
                        ? `${t.target_start_date} → ${t.target_end_date}`
                        : t.target_start_date || t.target_end_date || "—"}
                    </td>
                    <td style={tdStyle(colors)}>
                      <TargetOutcomeBadge outcome={getTargetOutcome(t)} />
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

export default TargetTableView;
