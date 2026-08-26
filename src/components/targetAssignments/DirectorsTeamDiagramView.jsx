import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  getAllTeams,
  getAllTeamsMemberInProgressTasks,
  getUnitInProgressSummary,
  getUnitInProgressSummaryByMember,
  getUnitInProgressTasks,
  bulkMarkAsDirectorsTarget,
  markAsDirectorsTarget,
  unmarkAsDirectorsTarget,
} from "../../api/targetAssignments";
import { StatusPill } from "./StatusPill";
import { DirectorsTargetModal } from "./DirectorsTargetModal";

// ── Debounces a fast-changing value (e.g. a text filter input) before
//    it's used to trigger a server request, so we don't fire a request
//    on every keystroke. ──
function useDebouncedValue(value, delayMs = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

// ⬅️ NEW — maps each summary tab to the group_by key the new
//    per-member-breakdown endpoint expects (short keys, not the
//    TaskTable filter column names used by SUMMARY_TAB_TO_COLUMN).
const SUMMARY_TAB_TO_GROUP_BY = {
  by_step: "step",
  by_app_type: "app_type",
  by_product_class: "product_class",
  by_processing_type: "processing_type",
};

const DEFAULT_TASK_FILTERS = {
  dtn: "",
  date_received_center: { from: "", to: "" },
  prod_class_prescrip: "",
  app_type: "",
  processing_type: "",
  entry_type: "",
  step: "",
  directors_target: "", // "" | "targeted" | "not_targeted"
};

// Unit-wide table has one extra filterable column: Member.
const DEFAULT_UNIT_TASK_FILTERS = {
  ...DEFAULT_TASK_FILTERS,
  member_name: "",
};

const PAGE_SIZE = 20;

// ── Shared style for text/date/select filter inputs in table headers ──
const filterFieldStyle = (colors) => ({
  width: "100%",
  boxSizing: "border-box",
  padding: "3px 6px",
  fontSize: "0.7rem",
  fontWeight: 400,
  borderRadius: 4,
  border: `1px solid ${colors.cardBorder}`,
  background: colors.cardBg,
  color: colors.textPrimary,
});

// ── Bottleneck severity: relative to the most-loaded unit in the list ──
function getSeverity(total, maxTotal) {
  if (maxTotal === 0) return "low";
  const ratio = total / maxTotal;
  if (ratio >= 0.7) return "high";
  if (ratio >= 0.4) return "medium";
  return "low";
}

// ── Accent colors not covered by useColors.js — badges, severity
//    indicators, and highlight overlays. Split by darkMode on purpose:
//    the solid/vivid variants that glow nicely on a near-black card
//    look too harsh on a white one, so light mode uses soft tints +
//    darker text instead of solid fills. Dark mode values are UNCHANGED
//    from before — only light mode was softened. ──
function getAccentColors(darkMode) {
  return darkMode
    ? {
        dangerText: "#dc2626",
        dangerBorder: "#f87171",
        dangerSolidBg: "#dc2626",
        dangerSolidText: "#ffffff",
        dangerSolidShadow: "rgba(220,38,38,0.4)",
        warningText: "#ea580c",
        warningBorder: "#fb923c",
        infoBg: "#dbeafe",
        infoText: "#3b82f6",
        infoBorder: "#93c5fd",
        purpleBg: "rgba(168, 85, 247, 0.15)",
        purpleText: "#a855f7",
        purpleBgStrong: "rgba(168, 85, 247, 0.18)",
        blueOverlayActive: "rgba(59, 130, 246, 0.15)",
        blueOverlayFilterBar: "rgba(59, 130, 246, 0.10)",
        barTopColor: "#dc2626",
        barDefaultColor: "#3b82f6",
      }
    : {
        dangerText: "#b91c1c",
        dangerBorder: "#fca5a5",
        dangerSolidBg: "#fee2e2",
        dangerSolidText: "#b91c1c",
        dangerSolidShadow: "rgba(185,28,28,0.15)",
        warningText: "#c2410c",
        warningBorder: "#fdba74",
        infoBg: "#eff6ff",
        infoText: "#2563eb",
        infoBorder: "#bfdbfe",
        purpleBg: "rgba(168, 85, 247, 0.10)",
        purpleText: "#7e22ce",
        purpleBgStrong: "rgba(168, 85, 247, 0.14)",
        blueOverlayActive: "#eff6ff",
        blueOverlayFilterBar: "#eff6ff",
        barTopColor: "#ef4444",
        barDefaultColor: "#3b82f6",
      };
}

// ── Bottleneck severity — now derived from accent instead of a fixed
//    module-level object, so it follows darkMode. ──
function getSeverityStyles(accent) {
  return {
    high: { text: accent.dangerText, border: accent.dangerBorder },
    medium: { text: accent.warningText, border: accent.warningBorder },
    low: { text: accent.infoText, border: accent.infoBorder },
  };
}

function UnitNode({ unit, isSelected, onClick, colors, severity, accent }) {
  const [showMembers, setShowMembers] = useState(false);
  const sev = getSeverityStyles(accent)[severity];
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setShowMembers(true)}
      onMouseLeave={() => setShowMembers(false)}
      style={{
        background: colors.cardBg,
        border: `2px solid ${isSelected ? colors.selectedBorder : sev.border}`,
        borderRadius: 12,
        padding: "0.85rem 1.1rem",
        boxShadow: isSelected
          ? "0 4px 14px rgba(0,0,0,0.18)"
          : "0 2px 8px rgba(0,0,0,0.10)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
        minWidth: 190,
        position: "relative",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {severity === "high" && (
        <span
          style={{
            position: "absolute",
            top: -9,
            right: -9,
            fontSize: "0.62rem",
            fontWeight: 800,
            padding: "2px 8px",
            borderRadius: 9999,
            background: accent.dangerSolidBg,
            color: accent.dangerSolidText,
            boxShadow: `0 2px 6px ${accent.dangerSolidShadow}`,
            whiteSpace: "nowrap",
          }}
        >
          ⚠️ Bottleneck
        </span>
      )}

      <div
        style={{
          fontSize: "0.8rem",
          fontWeight: 700,
          color: colors.textPrimary,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {unit.unit_name}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
        <span
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: sev.text,
            lineHeight: 1,
          }}
        >
          {unit.total_in_progress}
        </span>
        <span style={{ fontSize: "0.66rem", color: colors.textTertiary }}>
          in progress
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.4rem",
        }}
      >
        <span style={{ fontSize: "0.66rem", color: colors.textTertiary }}>
          {unit.members.length} member{unit.members.length === 1 ? "" : "s"}
        </span>
        {unit.unit_head_name && (
          <span
            style={{
              fontSize: "0.64rem",
              fontWeight: 600,
              color: colors.textSecondary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={`Unit Head: ${unit.unit_head_name}`}
          >
            👤 {unit.unit_head_name}
          </span>
        )}
      </div>

      {/* ⬅️ NEW — team-wide Director's Target progress */}
      {unit.target_total > 0 && (
        <span
          style={{
            alignSelf: "flex-start",
            fontSize: "0.66rem",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 5,
            background: accent.purpleBg,
            color: accent.purpleText,
          }}
          title={`${unit.target_completed} of ${unit.target_total} Director's Target completed team-wide`}
        >
          🏛️ {unit.target_completed}/{unit.target_total} team target
        </span>
      )}

      {/* ── Hover popover — list of members, so you don't need to click
            the unit card just to see who's in it ── */}
      {showMembers && unit.members.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 6,
            minWidth: 200,
            maxWidth: 260,
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 8,
            boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
            padding: "0.5rem 0.6rem",
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          {unit.members.map((m) => (
            <div
              key={m.member_user_id}
              style={{
                fontSize: "0.7rem",
                color: colors.textSecondary,
                display: "flex",
                justifyContent: "space-between",
                gap: "0.5rem",
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {m.member_name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Member node — diagram-card style, no drag, static grid ────
function MemberNode({ member, isSelected, onClick, colors, accent }) {
  const initials = (member.member_name || "")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      onClick={onClick}
      style={{
        background: colors.cardBg,
        border: `1.5px solid ${isSelected ? colors.selectedBorder : colors.cardBorder}`,
        borderRadius: 10,
        padding: "0.65rem 0.75rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
        transition: "border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: colors.selectedBorder,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
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
        <span
          style={{
            fontSize: "0.62rem",
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 5,
            background: accent.infoBg,
            color: accent.infoText,
          }}
        >
          ⏳ {member.in_progress_count} In Progress
        </span>
        {/* ⬅️ CHANGED: dating "🏛️ {count}" lang, ngayon "completed/total" */}
        {(member.directors_target_count || 0) > 0 && (
          <span
            style={{
              fontSize: "0.62rem",
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 5,
              background: accent.purpleBg,
              color: accent.purpleText,
            }}
            title={`${member.directors_target_completed_count || 0} of ${member.directors_target_count || 0} Director's Target completed`}
          >
            🏛️ {member.directors_target_completed_count || 0}/
            {member.directors_target_count || 0}
          </span>
        )}
      </div>
    </div>
  );
}
function SummaryBar({
  label,
  count,
  maxCount,
  colors,
  onClick,
  isActive,
  breakdown,
  onHoverStart,
  accent,
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const pct = maxCount === 0 ? 0 : Math.round((count / maxCount) * 100);
  const isTop = count === maxCount && maxCount > 0;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => {
        setShowBreakdown(true);
        onHoverStart && onHoverStart();
      }}
      onMouseLeave={() => setShowBreakdown(false)}
      title="Click to filter the table below"
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        cursor: onClick ? "pointer" : "default",
        padding: "2px 4px",
        borderRadius: 6,
        background: isActive ? accent.blueOverlayActive : "transparent",
      }}
    >
      <span
        style={{
          fontSize: "0.72rem",
          fontWeight: isTop ? 800 : 600,
          color: isTop ? accent.dangerText : colors.textSecondary,
          minWidth: 160,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {isTop && "⚠️ "}
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          background: colors.rowHover,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: isTop ? accent.barTopColor : accent.barDefaultColor,
            borderRadius: 4,
          }}
        />
      </div>

      <span
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          color: colors.textPrimary,
          minWidth: 24,
          textAlign: "right",
        }}
      >
        {count}
      </span>

      {/* ── Per-member breakdown popover for this specific bar — shows
            who contributes to this label's count and how many each ── */}
      {showBreakdown && (
        <div
          onClick={(e) => e.stopPropagation()} // don't trigger the bar's onClick
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            minWidth: 220,
            maxWidth: 280,
            maxHeight: 260,
            overflowY: "auto",
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 8,
            boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
            padding: "0.5rem 0.6rem",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            gap: "0.3rem",
          }}
        >
          <div
            style={{
              fontSize: "0.66rem",
              fontWeight: 700,
              color: colors.textTertiary,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              marginBottom: "0.15rem",
            }}
          >
            {label}
          </div>

          {breakdown?.loading && (
            <div style={{ fontSize: "0.72rem", color: colors.textTertiary }}>
              Loading…
            </div>
          )}
          {breakdown?.error && (
            <div style={{ fontSize: "0.72rem", color: "#dc2626" }}>
              ⚠️ {breakdown.error}
            </div>
          )}
          {!breakdown?.loading &&
            !breakdown?.error &&
            (breakdown?.data?.length ?? 0) === 0 && (
              <div style={{ fontSize: "0.72rem", color: colors.textTertiary }}>
                No members found.
              </div>
            )}
          {!breakdown?.loading &&
            !breakdown?.error &&
            breakdown?.data?.map((m) => (
              <div
                key={m.member_name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                  fontSize: "0.72rem",
                  color: colors.textSecondary,
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {m.member_name}
                </span>
                <span style={{ fontWeight: 700, color: colors.textPrimary }}>
                  {m.count}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

const SUMMARY_TABS = [
  { key: "by_step", label: "By Step" },
  { key: "by_app_type", label: "By App Type" },
  { key: "by_product_class", label: "By Product Class" },
  { key: "by_processing_type", label: "By Processing Type" },
];

// ── Maps each breakdown tab to the TaskTable/filter column it should
//    drive when a bar under that tab is clicked ──
const SUMMARY_TAB_TO_COLUMN = {
  by_step: "step",
  by_app_type: "app_type",
  by_product_class: "prod_class_prescrip",
  by_processing_type: "processing_type",
};

function DirectorsTargetFilterToggle({ value, onChange, colors, accent }) {
  const states = ["", "targeted", "not_targeted"];
  const labels = {
    "": "All",
    targeted: "🏛️ Targeted",
    not_targeted: "Not targeted",
  };
  const styles = {
    "": { background: "transparent", color: colors.textSecondary },
    targeted: { background: accent.purpleBgStrong, color: accent.purpleText },
    not_targeted: { background: colors.rowHover, color: colors.textSecondary },
  };
  const cycle = () => {
    const idx = states.indexOf(value || "");
    onChange(states[(idx + 1) % states.length]);
  };
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        cycle();
      }}
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "3px 6px",
        fontSize: "0.68rem",
        fontWeight: 700,
        borderRadius: 4,
        border: `1px solid ${colors.cardBorder}`,
        cursor: "pointer",
        whiteSpace: "nowrap",
        ...styles[value || ""],
      }}
      title="Click to cycle: All → Targeted → Not targeted"
    >
      {labels[value || ""]}
    </button>
  );
}

// ── Reusable in-progress task table — used for both the per-member
//    panel and the unit-wide ("All Tasks") panel below.
//    showMemberColumn=true adds a Member column, for the unit-wide view.
//
//    Filtering and sorting are FULLY SERVER-SIDE: `tasks` is always
//    exactly the current page of already-filtered, already-sorted rows
//    returned by the backend. This component is a controlled view —
//    it only renders the filter/sort controls and reports changes
//    upward via onFilterChange/onSortChange; it never slices or
//    reorders `tasks` itself, so what's shown always reflects the full
//    matching set, not just whatever happens to be on this page.
//
//    - Rows already marked "Director's Target" have their checkbox
//      disabled and are excluded from "select all".
//    - Double-clicking a row (if not yet targeted) opens the single-task
//      "Mark as Director's Target" modal.
//    - The "Actions" column shows a "✕ Unmark" button when targeted.
function TaskTable({
  tasks,
  colors,
  selectedIds,
  onToggle,
  onToggleAll,
  onRowDoubleClick,
  onUnmark,
  showMemberColumn,
  filters,
  onFilterChange, // (columnKey, value) => void
  onClearFilters,
  sortKey,
  sortDir,
  onSortChange, // (columnKey) => void
  accent,
}) {
  const columns = useMemo(() => {
    const cols = [];
    if (showMemberColumn) {
      cols.push({ key: "member_name", label: "Member", filterType: "text" });
    }
    cols.push(
      { key: "dtn", label: "DTN", filterType: "text" },
      {
        key: "date_received_center",
        label: "Date Received",
        filterType: "date",
      },
      {
        key: "prod_class_prescrip",
        label: "Product Class",
        filterType: "select",
      },
      { key: "app_type", label: "App Type", filterType: "select" },
      {
        key: "processing_type",
        label: "Processing Type",
        filterType: "select",
      },
      { key: "entry_type", label: "Entry Type", filterType: "select" },
      { key: "step", label: "Step", filterType: "select" },
      { key: "status", label: "Status", filterType: "none" },
      {
        key: "directors_target",
        label: "Director's Target",
        filterType: "toggle",
      },
    );
    return cols;
  }, [showMemberColumn]);

  // ── Distinct values for each "select" column, derived from the
  //    currently loaded page of tasks. Add the current filter's own
  //    value too, in case it's not present on this page (e.g. user
  //    filtered, page reloaded, value still valid server-side). ──
  const filterOptions = useMemo(() => {
    const opts = {};
    columns.forEach((col) => {
      if (col.filterType !== "select") return;
      const set = new Set();
      tasks.forEach((t) => {
        const val = t[col.key];
        if (val) set.add(val);
      });
      if (filters[col.key]) set.add(filters[col.key]);
      opts[col.key] = Array.from(set).sort((a, b) => a.localeCompare(b));
    });
    return opts;
  }, [tasks, columns, filters]);
  // ── Every row here already matches the active filters — the backend
  //    only returns matching rows — so all rows on this page are
  //    selectable candidates by definition, no local filtering needed. ──
  const selectableTasks = useMemo(
    () => tasks.filter((t) => !t.is_directors_target),
    [tasks],
  );

  const allSelected =
    selectableTasks.length > 0 &&
    selectableTasks.every((t) => selectedIds.has(t.log_id));
  const someSelected =
    !allSelected && selectableTasks.some((t) => selectedIds.has(t.log_id));

  const isFilterActive = (key, val) => {
    const col = columns.find((c) => c.key === key);
    if (!col) return false;
    if (col.filterType === "date") return !!(val && (val.from || val.to));
    return !!val;
  };

  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    isFilterActive(k, v),
  ).length;

  const headerCellStyle = {
    padding: "8px 12px",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  const SortArrow = ({ colKey }) => {
    if (sortKey !== colKey) {
      return (
        <span style={{ opacity: 0.3, marginLeft: 4, fontSize: "0.65rem" }}>
          ⇅
        </span>
      );
    }
    return (
      <span
        style={{
          marginLeft: 4,
          fontSize: "0.65rem",
          color: colors.selectedBorder,
        }}
      >
        {sortDir === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  return (
    <div>
      {/* ── Active-filter status bar ── */}
      {activeFilterCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
            padding: "0.5rem 0.9rem",
            background: accent.blueOverlayFilterBar,
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          <span
            style={{
              fontSize: "0.74rem",
              fontWeight: 700,
              color: colors.selectedBorder,
            }}
          >
            🔍 {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}{" "}
            active
          </span>
          <button
            onClick={onClearFilters}
            style={{
              padding: "3px 10px",
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: "0.7rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ✕ Clear filters
          </button>
        </div>
      )}
      <div style={{ maxHeight: 420, overflow: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.8rem",
          }}
        >
          <thead>
            <tr
              style={{
                background: colors.rowHover,
                textAlign: "left",
                position: "sticky",
                top: 0,
                zIndex: 1,
              }}
            >
              <th style={{ padding: "8px 12px", width: 30 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={onToggleAll}
                  disabled={selectableTasks.length === 0}
                  title={allSelected ? "Deselect all" : "Select all"}
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={headerCellStyle}
                  onClick={() =>
                    col.filterType !== "none" && onSortChange(col.key)
                  }
                >
                  {col.label}
                  <SortArrow colKey={col.key} />
                </th>
              ))}
              <th style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                Actions
              </th>
            </tr>
            <tr
              style={{
                background: colors.rowHover,
                position: "sticky",
                top: 33,
                zIndex: 1,
              }}
            >
              <th style={{ padding: "4px 12px" }} />
              {columns.map((col) => (
                <th key={col.key} style={{ padding: "4px 12px" }}>
                  {col.filterType === "none" ? null : col.filterType ===
                    "date" ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      <input
                        type="date"
                        value={filters[col.key]?.from || ""}
                        onChange={(e) =>
                          onFilterChange(col.key, {
                            ...filters[col.key],
                            from: e.target.value,
                          })
                        }
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          ...filterFieldStyle(colors),
                          flex: 1,
                          minWidth: 0,
                        }}
                        title="From"
                      />
                      <input
                        type="date"
                        value={filters[col.key]?.to || ""}
                        onChange={(e) =>
                          onFilterChange(col.key, {
                            ...filters[col.key],
                            to: e.target.value,
                          })
                        }
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          ...filterFieldStyle(colors),
                          flex: 1,
                          minWidth: 0,
                        }}
                        title="To"
                      />
                    </div>
                  ) : col.filterType === "toggle" ? (
                    <DirectorsTargetFilterToggle
                      value={filters[col.key] || ""}
                      onChange={(v) => onFilterChange(col.key, v)}
                      colors={colors}
                      accent={accent}
                    />
                  ) : col.filterType === "select" ? (
                    <select
                      value={filters[col.key] || ""}
                      onChange={(e) => onFilterChange(col.key, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={filterFieldStyle(colors)}
                    >
                      <option value="">All</option>
                      {(filterOptions[col.key] || []).map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={filters[col.key] || ""}
                      onChange={(e) => onFilterChange(col.key, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Filter…"
                      style={filterFieldStyle(colors)}
                    />
                  )}
                </th>
              ))}
              <th style={{ padding: "4px 12px" }} />
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr
                key={t.log_id}
                onDoubleClick={() => {
                  if (t.is_directors_target) return;
                  if (onRowDoubleClick) onRowDoubleClick(t);
                }}
                title={
                  t.is_directors_target
                    ? undefined
                    : "Double-click to mark as Director's Target"
                }
                style={{
                  borderTop: `1px solid ${colors.cardBorder}`,
                  cursor: t.is_directors_target ? "default" : "pointer",
                  opacity: t.is_directors_target ? 0.72 : 1,
                }}
              >
                <td
                  style={{ padding: "8px 12px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(t.log_id)}
                    disabled={t.is_directors_target}
                    onChange={() => onToggle(t.log_id)}
                    title={
                      t.is_directors_target
                        ? "Already targeted — unmark first to select again"
                        : ""
                    }
                  />
                </td>
                {showMemberColumn && (
                  <td
                    style={{ padding: "8px 12px", color: colors.textSecondary }}
                  >
                    {t.member_name}
                  </td>
                )}
                <td
                  style={{
                    padding: "8px 12px",
                    fontWeight: 600,
                    color: colors.selectedBorder,
                  }}
                >
                  {t.dtn}
                  <div
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 400,
                      color: colors.textSecondary,
                    }}
                  >
                    {t.brand_name}
                  </div>
                </td>
                <td
                  style={{ padding: "8px 12px", color: colors.textSecondary }}
                >
                  {t.date_received_center || "—"}
                </td>
                <td
                  style={{ padding: "8px 12px", color: colors.textSecondary }}
                >
                  {t.prod_class_prescrip || "—"}
                </td>
                <td
                  style={{ padding: "8px 12px", color: colors.textSecondary }}
                >
                  {t.app_type || "—"}
                </td>
                <td
                  style={{ padding: "8px 12px", color: colors.textSecondary }}
                >
                  {t.processing_type || "—"}
                </td>
                <td
                  style={{ padding: "8px 12px", color: colors.textSecondary }}
                >
                  {t.entry_type || "—"}
                </td>
                <td style={{ padding: "8px 12px" }}>{t.step || "—"}</td>
                <td style={{ padding: "8px 12px" }}>
                  <StatusPill status={t.status} />
                </td>
                <td style={{ padding: "8px 12px" }}>
                  {t.is_directors_target ? (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: accent.purpleText,
                      }}
                    >
                      🏛️ Targeted
                      {t.directors_target_end_date && (
                        <span
                          style={{
                            fontWeight: 400,
                            color: colors.textTertiary,
                          }}
                        >
                          {" "}
                          until {t.directors_target_end_date}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span style={{ color: colors.textTertiary }}>—</span>
                  )}
                </td>
                <td
                  style={{ padding: "8px 12px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {t.is_directors_target ? (
                    <button
                      onClick={() => onUnmark && onUnmark(t.log_id)}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 6,
                        border: `1px solid ${colors.cardBorder}`,
                        background: "transparent",
                        color: accent.dangerText,
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                      title="Unmark as Director's Target"
                    >
                      ✕ Unmark
                    </button>
                  ) : (
                    <span style={{ color: colors.textTertiary }}>—</span>
                  )}
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  style={{
                    padding: "1.25rem",
                    textAlign: "center",
                    color: colors.textTertiary,
                    fontSize: "0.8rem",
                  }}
                >
                  No tasks match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function TaskPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPrev,
  onNext,
  onPageSizeChange,
  colors,
}) {
  // ── Still show the page-size selector even with only one page (or
  //    zero rows), so the view size can be changed before the dataset
  //    grows ──
  if (total === 0) return null;

  const selectStyle = {
    padding: "3px 8px",
    borderRadius: 6,
    border: `1px solid ${colors.cardBorder}`,
    background: "transparent",
    color: colors.textSecondary,
    fontSize: "0.72rem",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.6rem 1rem",
        borderTop: `1px solid ${colors.cardBorder}`,
        flexWrap: "wrap",
        gap: "0.5rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <span style={{ fontSize: "0.72rem", color: colors.textSecondary }}>
          Page {page} of {Math.max(totalPages, 1)}
          {typeof total === "number" && ` · ${total} total`}
        </span>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            fontSize: "0.72rem",
            color: colors.textTertiary,
          }}
        >
          Show
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={selectStyle}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: "0.35rem" }}>
          <button
            onClick={onPrev}
            disabled={page === 1}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: "0.72rem",
              cursor: page === 1 ? "default" : "pointer",
              opacity: page === 1 ? 0.4 : 1,
            }}
          >
            ‹ Prev
          </button>
          <button
            onClick={onNext}
            disabled={page === totalPages}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: "0.72rem",
              cursor: page === totalPages ? "default" : "pointer",
              opacity: page === totalPages ? 0.4 : 1,
            }}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}

// ── Confirmation modal shown before unmarking a task's Director's
//    Target — prevents accidental clicks on the "✕ Unmark" button from
//    immediately removing the flag with no way to undo the click. ──
function UnmarkConfirmModal({
  colors,
  task,
  onClose,
  onConfirm,
  submitting,
  error,
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 12,
          padding: "1.25rem",
          width: 360,
          maxWidth: "90vw",
          boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            fontSize: "0.95rem",
            fontWeight: 700,
            color: colors.textPrimary,
            marginBottom: "0.5rem",
          }}
        >
          Unmark Director's Target?
        </div>
        <div
          style={{
            fontSize: "0.8rem",
            color: colors.textSecondary,
            marginBottom: "1rem",
            lineHeight: 1.5,
          }}
        >
          This will remove the Director's Target flag from{" "}
          <strong style={{ color: colors.textPrimary }}>
            {task.dtn}
            {task.brand_name ? ` — ${task.brand_name}` : ""}
          </strong>
          . You can mark it again later if needed.
        </div>

        {error && (
          <div
            style={{
              fontSize: "0.76rem",
              color: "#dc2626",
              marginBottom: "0.75rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}
        >
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              background: "#dc2626",
              color: "#fff",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Unmarking…" : "✕ Unmark"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DirectorsTeamDiagramView({ colors, darkMode }) {
  // ── Computed once per darkMode change — see getAccentColors above ──
  const accent = useMemo(() => getAccentColors(darkMode), [darkMode]);

  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  // ── "Members" grid vs "All Tasks" unit-wide table ──
  const [unitViewMode, setUnitViewMode] = useState("members"); // "members" | "tasks"

  // ── Per-unit breakdown — an OBJECT with several groupings:
  //    { by_step: [...], by_app_type: [...], by_product_class: [...], by_processing_type: [...] }
  //    Each entry: { label, count }. ──
  const [unitSummary, setUnitSummary] = useState({});
  const [unitSummaryLoading, setUnitSummaryLoading] = useState(false);
  const [unitSummaryError, setUnitSummaryError] = useState(null);
  const [summaryTab, setSummaryTab] = useState("by_step");

  // ── Per-member task table filters/sort — server-driven. Text/date
  //    values are debounced before being sent, so a request isn't fired
  //    on every keystroke. ──
  const [tasksFilters, setTasksFilters] = useState(DEFAULT_TASK_FILTERS);
  const [tasksSortKey, setTasksSortKey] = useState(null);
  const [tasksSortDir, setTasksSortDir] = useState("asc");
  const debouncedTasksFilters = useDebouncedValue(tasksFilters, 350);

  // ── Unit-wide "All Tasks" table filters/sort — server-driven ──
  const [unitTasksFilters, setUnitTasksFilters] = useState(
    DEFAULT_UNIT_TASK_FILTERS,
  );
  const [unitTasksSortKey, setUnitTasksSortKey] = useState(null);
  const [unitTasksSortDir, setUnitTasksSortDir] = useState("asc");
  const debouncedUnitTasksFilters = useDebouncedValue(unitTasksFilters, 350);

  // ── Per-member paginated tasks (existing drill-in) ──
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState(null);
  const [tasksPage, setTasksPage] = useState(1);
  const [tasksPageSize, setTasksPageSize] = useState(PAGE_SIZE);
  const [tasksTotalPages, setTasksTotalPages] = useState(0);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());

  // ── Unit-wide paginated tasks ("All Tasks" tab — every member, one list) ──
  const [unitTasks, setUnitTasks] = useState([]);
  const [unitTasksLoading, setUnitTasksLoading] = useState(false);
  const [unitTasksError, setUnitTasksError] = useState(null);
  const [unitTasksPage, setUnitTasksPage] = useState(1);
  const [unitTasksPageSize, setUnitTasksPageSize] = useState(PAGE_SIZE);
  const [unitTasksTotalPages, setUnitTasksTotalPages] = useState(0);
  const [unitTasksTotal, setUnitTasksTotal] = useState(0);
  const [selectedUnitTaskIds, setSelectedUnitTaskIds] = useState(new Set());

  const [modalTasks, setModalTasks] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // ── Load all units + members (with in_progress_count already baked in) ──
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllTeams();
      setAllMembers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Group by unit, with total_in_progress computed right away.
  //    unit_head_name comes from each member's lead_name field
  //    (already returned by getAllTeams — same value for every member
  //    of a given unit). ──
  const units = useMemo(() => {
    const map = new Map();
    allMembers.forEach((m) => {
      if (!map.has(m.unit_id)) {
        map.set(m.unit_id, {
          unit_id: m.unit_id,
          unit_name: m.unit_name,
          members: [],
          total_in_progress: 0,
          target_total: 0,
          target_completed: 0,
          unit_head_name: null,
        });
      }
      const unit = map.get(m.unit_id);
      unit.members.push(m);
      unit.total_in_progress += m.in_progress_count || 0;
      unit.target_total += m.directors_target_count || 0;
      unit.target_completed +=
        m.directors_target_supervisor_completed_count || 0;
      unit.unit_head_name = m.lead_name || unit.unit_head_name;
    });
    return Array.from(map.values()).sort(
      (a, b) => b.total_in_progress - a.total_in_progress, // busiest unit first
    );
  }, [allMembers]);

  const maxUnitTotal = useMemo(
    () => units.reduce((max, u) => Math.max(max, u.total_in_progress), 0),
    [units],
  );

  const selectedUnit = units.find((u) => u.unit_id === selectedUnitId) || null;

  const selectedMember = selectedUnit?.members.find(
    (m) => m.member_user_id === selectedMemberId,
  );

  // ── Fetch the multi-grouping breakdown for a unit — counts only, no
  //    task rows, so it's fast even for a large unit ──
  const loadUnitSummary = useCallback(async (unitId) => {
    setUnitSummaryLoading(true);
    setUnitSummaryError(null);
    try {
      const data = await getUnitInProgressSummary(unitId);
      setUnitSummary(data || {});
    } catch (err) {
      setUnitSummaryError(err.message);
      setUnitSummary({});
    } finally {
      setUnitSummaryLoading(false);
    }
  }, []);

  // ── Per-bar member breakdown cache — keyed by "groupBy:label", so
  //    hovering the same bar twice doesn't re-fetch. Reset whenever a
  //    different unit is opened (see openUnit below). ──
  const [summaryMemberBreakdown, setSummaryMemberBreakdown] = useState({});

  const loadSummaryMemberBreakdown = useCallback(
    async (unitId, groupBy, label) => {
      const cacheKey = `${groupBy}:${label}`;
      setSummaryMemberBreakdown((prev) => ({
        ...prev,
        [cacheKey]: {
          loading: true,
          error: null,
          data: prev[cacheKey]?.data || [],
        },
      }));
      try {
        const data = await getUnitInProgressSummaryByMember(
          unitId,
          groupBy,
          label,
        );
        setSummaryMemberBreakdown((prev) => ({
          ...prev,
          [cacheKey]: { loading: false, error: null, data },
        }));
      } catch (err) {
        setSummaryMemberBreakdown((prev) => ({
          ...prev,
          [cacheKey]: { loading: false, error: err.message, data: [] },
        }));
      }
    },
    [],
  );

  // ── Fetch paginated, server-filtered/sorted in-progress tasks for one
  //    member. Called whenever member, page, page size, filters, or sort
  //    changes. ──
  const loadTasks = useCallback(
    async (memberUserId, page, pageSize, filters, sortBy, sortDir) => {
      setTasksLoading(true);
      setTasksError(null);
      try {
        const res = await getAllTeamsMemberInProgressTasks(memberUserId, {
          page,
          pageSize,
          dtn: filters.dtn,
          dateFrom: filters.date_received_center?.from,
          dateTo: filters.date_received_center?.to,
          step: filters.step,
          appType: filters.app_type,
          productClass: filters.prod_class_prescrip,
          processingType: filters.processing_type,
          entryType: filters.entry_type,
          directorsTarget: filters.directors_target,
          sortBy,
          sortDir,
        });
        setTasks(res.data);
        setTasksTotalPages(res.total_pages);
        setTasksTotal(res.total);
      } catch (err) {
        setTasksError(err.message);
      } finally {
        setTasksLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedMemberId) {
      loadTasks(
        selectedMemberId,
        tasksPage,
        tasksPageSize,
        debouncedTasksFilters,
        tasksSortKey,
        tasksSortDir,
      );
    }
  }, [
    selectedMemberId,
    tasksPage,
    tasksPageSize,
    debouncedTasksFilters,
    tasksSortKey,
    tasksSortDir,
    loadTasks,
  ]);

  const changeTasksPageSize = (newSize) => {
    setTasksPageSize(newSize);
    setTasksPage(1); // reset to page 1 whenever page size changes
  };

  const changeTasksFilter = (key, value) => {
    setTasksFilters((prev) => ({ ...prev, [key]: value }));
    setTasksPage(1); // any filter change restarts pagination
  };

  const clearTasksFilters = () => {
    setTasksFilters(DEFAULT_TASK_FILTERS);
    setTasksPage(1);
  };

  const changeTasksSort = (key) => {
    if (tasksSortKey === key) {
      setTasksSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setTasksSortKey(key);
      setTasksSortDir("asc");
    }
  };

  // ── Fetch unit-wide, server-filtered/sorted paginated tasks (all
  //    members, one combined list). ──
  const loadUnitTasks = useCallback(
    async (unitId, page, pageSize, filters, sortBy, sortDir) => {
      setUnitTasksLoading(true);
      setUnitTasksError(null);
      try {
        const res = await getUnitInProgressTasks(unitId, {
          page,
          pageSize,
          dtn: filters.dtn,
          dateFrom: filters.date_received_center?.from,
          dateTo: filters.date_received_center?.to,
          step: filters.step,
          appType: filters.app_type,
          productClass: filters.prod_class_prescrip,
          processingType: filters.processing_type,
          entryType: filters.entry_type,
          memberName: filters.member_name,
          directorsTarget: filters.directors_target,
          sortBy,
          sortDir,
        });
        setUnitTasks(res.data);
        setUnitTasksTotalPages(res.total_pages);
        setUnitTasksTotal(res.total);
      } catch (err) {
        setUnitTasksError(err.message);
      } finally {
        setUnitTasksLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedUnitId && unitViewMode === "tasks") {
      loadUnitTasks(
        selectedUnitId,
        unitTasksPage,
        unitTasksPageSize,
        debouncedUnitTasksFilters,
        unitTasksSortKey,
        unitTasksSortDir,
      );
    }
  }, [
    selectedUnitId,
    unitViewMode,
    unitTasksPage,
    unitTasksPageSize,
    debouncedUnitTasksFilters,
    unitTasksSortKey,
    unitTasksSortDir,
    loadUnitTasks,
  ]);

  const changeUnitTasksPageSize = (newSize) => {
    setUnitTasksPageSize(newSize);
    setUnitTasksPage(1); // reset to page 1 whenever page size changes
  };

  const changeUnitTasksFilter = (key, value) => {
    setUnitTasksFilters((prev) => ({ ...prev, [key]: value }));
    setUnitTasksPage(1);
  };

  const clearUnitTasksFilters = () => {
    setUnitTasksFilters(DEFAULT_UNIT_TASK_FILTERS);
    setUnitTasksPage(1);
  };

  const changeUnitTasksSort = (key) => {
    if (unitTasksSortKey === key) {
      setUnitTasksSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setUnitTasksSortKey(key);
      setUnitTasksSortDir("asc");
    }
  };

  const openUnit = (unitId) => {
    setSelectedMemberId(null);
    setSelectedTaskIds(new Set());
    setUnitViewMode("members");
    setUnitTasks([]);
    setUnitTasksPage(1);
    setSelectedUnitTaskIds(new Set());
    setSummaryTab("by_step");
    setSummaryMemberBreakdown({});
    setUnitTasksFilters(DEFAULT_UNIT_TASK_FILTERS);
    setUnitTasksSortKey(null);
    setUnitTasksSortDir("asc");
    setSelectedUnitId((prev) => {
      const next = prev === unitId ? null : unitId;
      if (next) {
        loadUnitSummary(next);
      } else {
        setUnitSummary({});
        setUnitSummaryError(null);
      }
      return next;
    });
  };

  const switchUnitViewMode = (mode) => {
    setUnitViewMode(mode);
    if (mode === "tasks") {
      setSelectedMemberId(null); // close the per-member drill-in when entering "All Tasks"
    }
  };

  const openMember = (memberUserId) => {
    setSelectedTaskIds(new Set());
    if (selectedMemberId === memberUserId) {
      setSelectedMemberId(null);
      return;
    }
    setSelectedMemberId(memberUserId);
    setTasksPage(1);
    setTasksFilters(DEFAULT_TASK_FILTERS);
    setTasksSortKey(null);
    setTasksSortDir("asc");
  };

  const toggleTask = (logId) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  };

  // ── Select/deselect every selectable task on the CURRENT page. Toggles
  //    off if all are already selected, otherwise selects all of them.
  //    Selections on other pages are left untouched. ──
  const toggleAllTasks = () => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      const selectable = tasks.filter((t) => !t.is_directors_target);
      const allSelected =
        selectable.length > 0 && selectable.every((t) => next.has(t.log_id));
      if (allSelected) {
        selectable.forEach((t) => next.delete(t.log_id));
      } else {
        selectable.forEach((t) => next.add(t.log_id));
      }
      return next;
    });
  };

  const toggleUnitTask = (logId) => {
    setSelectedUnitTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  };

  // ── Same idea as toggleAllTasks, for the unit-wide "All Tasks" table ──
  const toggleAllUnitTasks = () => {
    setSelectedUnitTaskIds((prev) => {
      const next = new Set(prev);
      const selectable = unitTasks.filter((t) => !t.is_directors_target);
      const allSelected =
        selectable.length > 0 && selectable.every((t) => next.has(t.log_id));
      if (allSelected) {
        selectable.forEach((t) => next.delete(t.log_id));
      } else {
        selectable.forEach((t) => next.add(t.log_id));
      }
      return next;
    });
  };

  const toModalTask = (t) => ({
    log_id: t.log_id,
    dtn: t.dtn,
    brand_name: t.brand_name,
    is_targeted: t.is_directors_target,
  });

  const openBulkModal = () => {
    const picked = tasks.filter((t) => selectedTaskIds.has(t.log_id));
    if (picked.length > 0) setModalTasks(picked.map(toModalTask));
  };

  const openUnitBulkModal = () => {
    const picked = unitTasks.filter((t) => selectedUnitTaskIds.has(t.log_id));
    if (picked.length > 0) setModalTasks(picked.map(toModalTask));
  };

  // ── Single-task modal, triggered by double-clicking a row ──
  const openSingleModal = (task) => {
    if (task.is_directors_target) return; // safety net — shouldn't happen, already disabled on the row
    setModalTasks([toModalTask(task)]);
  };

  // ── Called when a breakdown bar is clicked — switches to "All Tasks"
  //    and sets the matching column as a server-side filter directly
  //    (previously this only seeded a client-side hint; now it drives
  //    the actual query). ──
  const applySummaryFilter = (tabKey, label) => {
    const columnKey = SUMMARY_TAB_TO_COLUMN[tabKey];
    if (!columnKey) return;
    setUnitViewMode("tasks"); // switch to the "All Tasks" tab if currently on "Members"
    setUnitTasksPage(1);
    setUnitTasksFilters((prev) => ({ ...prev, [columnKey]: label }));
  };

  const closeModal = () => {
    if (!modalSubmitting) setModalTasks(null);
  };

  const refreshAfterChange = async () => {
    if (selectedMemberId)
      await loadTasks(
        selectedMemberId,
        tasksPage,
        tasksPageSize,
        debouncedTasksFilters,
        tasksSortKey,
        tasksSortDir,
      );
    if (selectedUnitId && unitViewMode === "tasks") {
      await loadUnitTasks(
        selectedUnitId,
        unitTasksPage,
        unitTasksPageSize,
        debouncedUnitTasksFilters,
        unitTasksSortKey,
        unitTasksSortDir,
      );
    }
    if (selectedUnitId) await loadUnitSummary(selectedUnitId); // refresh the breakdown
    await loadAll(); // refresh unit-node totals + 🏛️ counts on member cards
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
        await bulkMarkAsDirectorsTarget(
          modalTasks.map((t) => t.log_id),
          { targetStartDate, targetEndDate, remarks },
        );
      } else {
        await markAsDirectorsTarget(modalTasks[0].log_id, {
          targetStartDate,
          targetEndDate,
          remarks,
        });
      }
      setSelectedTaskIds(new Set());
      setSelectedUnitTaskIds(new Set());
      setModalTasks(null);
      await refreshAfterChange();
    } catch (err) {
      setTasksError(err.message);
      setUnitTasksError(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  // ── Unmark handler — called from the row's "✕ Unmark" button ──
  const handleUnmark = async (logId) => {
    try {
      await unmarkAsDirectorsTarget(logId);
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(logId);
        return next;
      });
      setSelectedUnitTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(logId);
        return next;
      });
      await refreshAfterChange();
    } catch (err) {
      setTasksError(err.message);
      setUnitTasksError(err.message);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.textTertiary,
        }}
      >
        Loading teams…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "1.5rem",
          color: accent.dangerText,
          fontSize: "0.85rem",
        }}
      >
        ⚠️ {error}
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.textTertiary,
        }}
      >
        No units with active members yet.
      </div>
    );
  }

  const currentSummaryList = unitSummary[summaryTab] || [];
  const currentSummaryMax = currentSummaryList[0]?.count || 0;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 10,
        background: colors.pageBg,
        overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, overflow: "auto", padding: "1rem" }}>
        {/* Org-diagram root — ALL units shown at once, sorted by load */}
        <div
          style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            color: colors.textTertiary,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            marginBottom: "0.5rem",
          }}
        >
          Units overview — click a unit to see its members
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          {units.map((u) => (
            <UnitNode
              key={u.unit_id}
              unit={u}
              isSelected={selectedUnitId === u.unit_id}
              onClick={() => openUnit(u.unit_id)}
              colors={colors}
              severity={getSeverity(u.total_in_progress, maxUnitTotal)}
              accent={accent}
            />
          ))}
        </div>

        {/* Connector + breakdown + Members/All Tasks toggle for the selected unit */}
        {selectedUnit && (
          <div style={{ marginTop: "0.5rem" }}>
            <div
              style={{
                width: 2,
                height: 16,
                background: colors.cardBorder,
                marginLeft: "1.3rem",
              }}
            />
            <div
              style={{
                border: `1px dashed ${colors.cardBorder}`,
                borderRadius: 10,
                padding: "0.85rem",
                background: colors.cardBg,
              }}
            >
              {/* ── Breakdown — shown right away, even before a view is picked ── */}
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: colors.textPrimary,
                  marginBottom: "0.6rem",
                }}
              >
                📊 In-progress breakdown — {selectedUnit.unit_name}
              </div>

              {/* ── Tabs to pick which grouping is being viewed ── */}
              <div
                style={{
                  display: "flex",
                  gap: "0.4rem",
                  marginBottom: "0.7rem",
                  flexWrap: "wrap",
                }}
              >
                {SUMMARY_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSummaryTab(tab.key)}
                    style={{
                      padding: "4px 11px",
                      borderRadius: 9999,
                      border: `1px solid ${
                        summaryTab === tab.key
                          ? colors.selectedBorder
                          : colors.cardBorder
                      }`,
                      background:
                        summaryTab === tab.key
                          ? colors.selectedBorder
                          : "transparent",
                      color:
                        summaryTab === tab.key ? "#fff" : colors.textSecondary,
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {unitSummaryError && (
                <div
                  style={{
                    fontSize: "0.76rem",
                    color: accent.dangerText,
                    marginBottom: "0.9rem",
                  }}
                >
                  ⚠️ {unitSummaryError}
                </div>
              )}

              {unitSummaryLoading ? (
                <div
                  style={{
                    fontSize: "0.76rem",
                    color: colors.textTertiary,
                    marginBottom: "0.9rem",
                  }}
                >
                  Loading summary…
                </div>
              ) : !unitSummaryError && currentSummaryList.length === 0 ? (
                <div
                  style={{
                    fontSize: "0.76rem",
                    color: colors.textTertiary,
                    marginBottom: "0.9rem",
                  }}
                >
                  No in-progress tasks.
                </div>
              ) : (
                currentSummaryList.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.4rem",
                      marginBottom: "1rem",
                    }}
                  >
                    {currentSummaryList.map((item) => {
                      const groupBy = SUMMARY_TAB_TO_GROUP_BY[summaryTab];
                      const breakdownCacheKey = `${groupBy}:${item.label}`;
                      return (
                        <SummaryBar
                          key={item.label}
                          label={item.label}
                          count={item.count}
                          maxCount={currentSummaryMax}
                          colors={colors}
                          onClick={() =>
                            applySummaryFilter(summaryTab, item.label)
                          }
                          isActive={
                            unitTasksFilters[
                              SUMMARY_TAB_TO_COLUMN[summaryTab]
                            ] === item.label
                          }
                          breakdown={summaryMemberBreakdown[breakdownCacheKey]}
                          onHoverStart={() => {
                            if (!summaryMemberBreakdown[breakdownCacheKey]) {
                              loadSummaryMemberBreakdown(
                                selectedUnitId,
                                groupBy,
                                item.label,
                              );
                            }
                          }}
                          accent={accent}
                        />
                      );
                    })}
                  </div>
                )
              )}

              {/* ── Tabs: "Members" grid vs "All Tasks" unit-wide table ── */}
              <div
                style={{
                  display: "flex",
                  gap: "0.4rem",
                  marginBottom: "0.75rem",
                  borderBottom: `1px solid ${colors.cardBorder}`,
                }}
              >
                {[
                  {
                    key: "members",
                    label: `↳ Members (${selectedUnit.members.length})`,
                  },
                  {
                    key: "tasks",
                    label: `📋 All Tasks${unitViewMode === "tasks" ? ` (${unitTasksTotal})` : ""}`,
                  },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => switchUnitViewMode(tab.key)}
                    style={{
                      padding: "0.45rem 0.85rem",
                      border: "none",
                      borderBottom: `2px solid ${unitViewMode === tab.key ? colors.selectedBorder : "transparent"}`,
                      background: "transparent",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      color:
                        unitViewMode === tab.key
                          ? colors.selectedBorder
                          : colors.textTertiary,
                      cursor: "pointer",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {unitViewMode === "members" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "0.7rem",
                  }}
                >
                  {selectedUnit.members.map((m) => (
                    <MemberNode
                      key={m.member_user_id}
                      member={m}
                      isSelected={selectedMemberId === m.member_user_id}
                      onClick={() => openMember(m.member_user_id)}
                      colors={colors}
                      accent={accent}
                    />
                  ))}
                </div>
              )}

              {/* ── Unit-wide task table — all members, one list, with a
                    Member column, so bulk-assign works even across
                    different members' tasks ── */}
              {unitViewMode === "tasks" && (
                <div
                  style={{
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 10,
                    background: colors.pageBg,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.7rem 1rem",
                      borderBottom: `1px solid ${colors.cardBorder}`,
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: colors.textPrimary,
                      }}
                    >
                      All in-progress tasks — {selectedUnit.unit_name} (
                      {unitTasksTotal})
                    </span>
                    {selectedUnitTaskIds.size > 0 && (
                      <button
                        onClick={openUnitBulkModal}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 6,
                          border: "none",
                          background: "#a855f7",
                          color: "#fff",
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        🏛️ Mark {selectedUnitTaskIds.size} as Director's Target
                      </button>
                    )}
                  </div>

                  {unitTasksError && (
                    <div
                      style={{
                        padding: "0.75rem 1rem",
                        color: accent.dangerText,
                        fontSize: "0.8rem",
                      }}
                    >
                      ⚠️ {unitTasksError}
                    </div>
                  )}
                  {unitTasksLoading ? (
                    <div
                      style={{
                        padding: "1.5rem",
                        textAlign: "center",
                        color: colors.textTertiary,
                        fontSize: "0.82rem",
                      }}
                    >
                      Loading tasks…
                    </div>
                  ) : (
                    <TaskTable
                      tasks={unitTasks}
                      colors={colors}
                      selectedIds={selectedUnitTaskIds}
                      onToggle={toggleUnitTask}
                      onToggleAll={toggleAllUnitTasks}
                      onRowDoubleClick={openSingleModal}
                      onUnmark={handleUnmark}
                      showMemberColumn
                      filters={unitTasksFilters}
                      onFilterChange={changeUnitTasksFilter}
                      onClearFilters={clearUnitTasksFilters}
                      sortKey={unitTasksSortKey}
                      sortDir={unitTasksSortDir}
                      onSortChange={changeUnitTasksSort}
                      accent={accent}
                    />
                  )}

                  <TaskPagination
                    page={unitTasksPage}
                    totalPages={unitTasksTotalPages}
                    total={unitTasksTotal}
                    pageSize={unitTasksPageSize}
                    onPrev={() => setUnitTasksPage((p) => Math.max(1, p - 1))}
                    onNext={() =>
                      setUnitTasksPage((p) =>
                        Math.min(unitTasksTotalPages, p + 1),
                      )
                    }
                    onPageSizeChange={changeUnitTasksPageSize}
                    colors={colors}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Expanded, paginated per-member task panel — not rendered until
            a member is picked (and only in the "Members" tab) */}
        {selectedMemberId && unitViewMode === "members" && (
          <div
            style={{
              marginTop: "1rem",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 10,
              background: colors.cardBg,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.7rem 1rem",
                borderBottom: `1px solid ${colors.cardBorder}`,
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: colors.textPrimary,
                }}
              >
                {selectedMember?.member_name}'s in-progress tasks ({tasksTotal})
              </span>
              {selectedTaskIds.size > 0 && (
                <button
                  onClick={openBulkModal}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: "none",
                    background: "#a855f7",
                    color: "#fff",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  🏛️ Mark {selectedTaskIds.size} as Director's Target
                </button>
              )}
            </div>

            {tasksError && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  color: accent.dangerText,
                  fontSize: "0.8rem",
                }}
              >
                ⚠️ {tasksError}
              </div>
            )}

            {tasksLoading ? (
              <div
                style={{
                  padding: "1.5rem",
                  textAlign: "center",
                  color: colors.textTertiary,
                  fontSize: "0.82rem",
                }}
              >
                Loading tasks…
              </div>
            ) : (
              <TaskTable
                tasks={tasks}
                colors={colors}
                selectedIds={selectedTaskIds}
                onToggle={toggleTask}
                onToggleAll={toggleAllTasks}
                onRowDoubleClick={openSingleModal}
                onUnmark={handleUnmark}
                showMemberColumn={false}
                filters={tasksFilters}
                onFilterChange={changeTasksFilter}
                onClearFilters={clearTasksFilters}
                sortKey={tasksSortKey}
                sortDir={tasksSortDir}
                onSortChange={changeTasksSort}
                accent={accent}
              />
            )}

            <TaskPagination
              page={tasksPage}
              totalPages={tasksTotalPages}
              total={tasksTotal}
              pageSize={tasksPageSize}
              onPrev={() => setTasksPage((p) => Math.max(1, p - 1))}
              onNext={() =>
                setTasksPage((p) => Math.min(tasksTotalPages, p + 1))
              }
              onPageSizeChange={changeTasksPageSize}
              colors={colors}
            />
          </div>
        )}
      </div>

      {modalTasks && (
        <DirectorsTargetModal
          colors={colors}
          tasks={modalTasks}
          onClose={closeModal}
          onSubmit={handleModalSubmit}
          submitting={modalSubmitting}
        />
      )}
    </div>
  );
}

export default DirectorsTeamDiagramView;
