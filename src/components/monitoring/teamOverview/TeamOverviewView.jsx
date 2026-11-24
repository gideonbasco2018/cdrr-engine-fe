// src/components/monitoring/teamOverview/TeamOverviewView.jsx
//
// Monitoring version of the "CDRR Team Assignment" diagram.
// READ-ONLY: same layout (units overview → in-progress breakdown →
// Members / All Tasks), but NO targeting actions — no checkboxes, no
// mark/unmark. DTN opens Doctrack; Actions open View Details / Application
// Logs (modals reused from Records / Analytics).
//
// Filtering, sorting and pagination are fully server-side.

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  getAllTeams,
  getAllTeamsMemberInProgressTasks,
  getAllTeamsMemberCompletedTasks,
  getUnitInProgressSummary,
  getUnitInProgressSummaryByMember,
  getUnitInProgressTasks,
} from "../../../api/targetAssignments";
import { getUploadReports } from "../../../api/reports.js";
import { mapDataItem } from "../../reports/utils.js";
// Reused modals (same ones the Records / Analytics pages use)
import DoctrackModal from "../../reports/actions/DoctrackModal.jsx";
import ViewDetailsModal from "../../reports/actions/ViewDetailsModal.jsx";
import ApplicationLogsModal from "../../tasks/ApplicationLogsModal.jsx";

// ── Palette (self-contained, so the menu entry only needs darkMode) ──
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
        selectedBorder: "#3b82f6",
        tableBg: "#222222",
        tableRowHover: "rgba(255,255,255,0.06)",
        inputBg: "#222222",
        badgeBg: "rgba(255,255,255,0.08)",
      }
    : {
        pageBg: "#f8f8f8",
        cardBg: "#ffffff",
        cardBorder: "#e5e7eb",
        textPrimary: "#111827",
        textSecondary: "#6b7280",
        textTertiary: "#9ca3af",
        rowHover: "#f9fafb",
        selectedBorder: "#3b82f6",
        tableBg: "#f7f8fa",
        tableRowHover: "rgba(0,0,0,0.05)",
        inputBg: "#f7f8fa",
        badgeBg: "rgba(0,0,0,0.06)",
      };
}

function useDebouncedValue(value, delayMs = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

// ── Status pill (inline copy — monitoring folder has no ./StatusPill) ──
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
  const s = STATUS_KIND_STYLES[STATUS_KIND_MAP[key] || "default"];
  return (
    <div style={{ minWidth: 110, maxWidth: 150 }}>
      <div
        style={{
          fontSize: "10.5px",
          fontWeight: 700,
          color: s.color,
          marginBottom: 3,
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
          borderRadius: 9999,
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
            borderRadius: 9999,
            background: s.striped
              ? `repeating-linear-gradient(45deg, ${s.color}, ${s.color} 6px, ${s.color}cc 6px, ${s.color}cc 12px)`
              : s.color,
            backgroundSize: s.striped ? "16px 16px" : "auto",
            animation: s.striped
              ? "statusBarMoveMonitoring 0.9s linear infinite"
              : "none",
          }}
        />
      </div>
      <style>{`@keyframes statusBarMoveMonitoring { from { background-position: 0 0; } to { background-position: 16px 0; } }`}</style>
    </div>
  );
}

const SUMMARY_TABS = [
  { key: "by_step", label: "By Step" },
  { key: "by_app_type", label: "By App Type" },
  { key: "by_product_class", label: "By Product Class" },
  { key: "by_processing_type", label: "By Processing Type" },
];

// group_by keys expected by the per-member-breakdown endpoint
const SUMMARY_TAB_TO_GROUP_BY = {
  by_step: "step",
  by_app_type: "app_type",
  by_product_class: "product_class",
  by_processing_type: "processing_type",
};

// table filter column driven when a breakdown bar is clicked
const SUMMARY_TAB_TO_COLUMN = {
  by_step: "step",
  by_app_type: "app_type",
  by_product_class: "prod_class_prescrip",
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
};
const DEFAULT_UNIT_TASK_FILTERS = { ...DEFAULT_TASK_FILTERS, member_name: "" };

const PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

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

function getSeverity(total, maxTotal) {
  if (maxTotal === 0) return "low";
  const ratio = total / maxTotal;
  if (ratio >= 0.7) return "high";
  if (ratio >= 0.4) return "medium";
  return "low";
}

function getAccentColors(darkMode) {
  return darkMode
    ? {
        dangerText: "#dc2626",
        dangerBorder: "#f87171",
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

function getSeverityStyles(accent) {
  return {
    high: { text: accent.dangerText, border: accent.dangerBorder },
    medium: { text: accent.warningText, border: accent.warningBorder },
    low: { text: accent.infoText, border: accent.infoBorder },
  };
}

const ellipsis = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

// ══════════════════════════════════════════════════════════════════
// Unit / Member nodes
// ══════════════════════════════════════════════════════════════════
function UnitNode({
  unit,
  isSelected,
  onClick,
  colors,
  severity,
  accent,
  yearRows = [],
  yearsLoading,
  onYearClick,
  activeYear,
}) {
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
      <div
        style={{
          fontSize: "0.8rem",
          fontWeight: 700,
          color: colors.textPrimary,
          ...ellipsis,
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
              ...ellipsis,
            }}
            title={`Unit Head: ${unit.unit_head_name}`}
          >
            👤 {unit.unit_head_name}
          </span>
        )}
      </div>

      {/* Per-year in-progress summary — shown on the opened unit */}
      {isSelected && (yearRows.length > 0 || yearsLoading) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {yearsLoading && yearRows.length === 0 && (
            <div style={{ fontSize: "0.62rem", color: colors.textTertiary }}>
              Loading years…
            </div>
          )}
          {yearRows.map(({ year, count }) => (
            <YearRow
              key={year}
              year={year}
              count={count}
              active={activeYear === year}
              onClick={onYearClick}
              colors={colors}
              accent={accent}
            />
          ))}
        </div>
      )}

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
                ...ellipsis,
              }}
            >
              {m.member_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Accepts [{ year, count }] or { "2023": 2, "2024": 5 } and returns a
// sorted array of { year, count } (oldest year first).
function getYearBreakdown(raw) {
  if (!raw) return [];
  const rows = Array.isArray(raw)
    ? raw.map((r) => ({ year: String(r.year), count: Number(r.count) || 0 }))
    : Object.entries(raw).map(([year, count]) => ({
        year,
        count: Number(count) || 0,
      }));
  return rows.sort((a, b) => a.year.localeCompare(b.year));
}

// One clickable "2024 — 5 in progress" row. Used on unit and member cards.
function YearRow({ year, count, active, onClick, colors, accent }) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation(); // don't trigger the card's own click
        onClick && onClick(year);
      }}
      title={`Show ${year} in-progress tasks`}
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "0.5rem",
        fontSize: "0.64rem",
        color: active ? accent.infoText : colors.textSecondary,
        fontWeight: active ? 700 : 400,
        padding: "1px 4px",
        borderRadius: 4,
        cursor: onClick ? "pointer" : "default",
        background: active ? accent.blueOverlayActive : "transparent",
      }}
    >
      <span>{year}</span>
      <span style={{ fontWeight: 700, color: accent.infoText }}>
        {count} in progress
      </span>
    </div>
  );
}

function MemberNode({
  member,
  isSelected,
  onClick,
  colors,
  accent,
  yearCounts,
  yearsLoading,
  onYearClick,
  activeYear,
}) {
  const initials = (member.member_name || "")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const yearRows = getYearBreakdown(yearCounts ?? member.in_progress_by_year);

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
              ...ellipsis,
            }}
          >
            {member.member_name}
          </div>
          <div style={{ fontSize: "0.62rem", color: colors.textTertiary }}>
            {member.lead_role}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
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
      </div>

      {/* Per-year in-progress breakdown (by date received) */}
      {yearsLoading && yearRows.length === 0 && (
        <div style={{ fontSize: "0.62rem", color: colors.textTertiary }}>
          Loading years…
        </div>
      )}
      {yearRows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {yearRows.map(({ year, count }) => (
            <YearRow
              key={year}
              year={year}
              count={count}
              active={activeYear === year}
              onClick={onYearClick}
              colors={colors}
              accent={accent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Summary bar with per-member hover breakdown
// ══════════════════════════════════════════════════════════════════
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
  const idle = !breakdown?.loading && !breakdown?.error;

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
        cursor: "pointer",
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
          ...ellipsis,
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

      {showBreakdown && (
        <div
          onClick={(e) => e.stopPropagation()}
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
            <div style={{ fontSize: "0.72rem", color: accent.dangerText }}>
              ⚠️ {breakdown.error}
            </div>
          )}
          {idle && (breakdown?.data?.length ?? 0) === 0 && (
            <div style={{ fontSize: "0.72rem", color: colors.textTertiary }}>
              No members found.
            </div>
          )}
          {idle &&
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
                <span style={ellipsis}>{m.member_name}</span>
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

// ══════════════════════════════════════════════════════════════════
// Read-only task table (server-side filter / sort — controlled view)
// ══════════════════════════════════════════════════════════════════
function TaskTable({
  tasks,
  colors,
  showMemberColumn,
  showAccomplished = false,
  optionSource,
  filters,
  onFilterChange,
  onClearFilters,
  sortKey,
  sortDir,
  onSortChange,
  onDoctrack,
  onDetails,
  onLogs,
  accent,
}) {
  const columns = useMemo(() => {
    const cols = [];
    if (showMemberColumn)
      cols.push({ key: "member_name", label: "Member", filterType: "text" });
    cols.push(
      { key: "dtn", label: "DTN", filterType: "text" },
      {
        key: "date_received_center",
        label: "Date Received Central",
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
      ...(showAccomplished
        ? [
            {
              key: "date_accomplished",
              label: "Date Completed",
              filterType: "date",
            },
          ]
        : []),
      { key: "status", label: "Status", filterType: "none" },
      { key: "actions", label: "Actions", filterType: "none" },
    );
    return cols;
  }, [showMemberColumn, showAccomplished]);

  // Distinct values for "select" filters, from the loaded page + current value
  const filterOptions = useMemo(() => {
    const opts = {};
    columns.forEach((col) => {
      if (col.filterType !== "select") return;
      const set = new Set();
      (optionSource || tasks).forEach((t) => t[col.key] && set.add(t[col.key]));
      if (filters[col.key]) set.add(filters[col.key]);
      opts[col.key] = Array.from(set).sort((a, b) => a.localeCompare(b));
    });
    return opts;
  }, [tasks, optionSource, columns, filters]);

  const isFilterActive = (key, val) => {
    const col = columns.find((c) => c.key === key);
    if (!col) return false;
    if (col.filterType === "date") return !!(val && (val.from || val.to));
    return !!val;
  };
  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    isFilterActive(k, v),
  ).length;

  const SortArrow = ({ colKey }) =>
    sortKey !== colKey ? (
      <span style={{ opacity: 0.3, marginLeft: 4, fontSize: "0.65rem" }}>
        ⇅
      </span>
    ) : (
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

  const cellStyle = { padding: "8px 12px", color: colors.textSecondary };
  const actionBtn = {
    padding: "3px 10px",
    borderRadius: 6,
    border: `1px solid ${colors.cardBorder}`,
    background: "transparent",
    color: colors.selectedBorder,
    fontSize: "0.68rem",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <div>
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
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: "8px 12px",
                    cursor: col.filterType === "none" ? "default" : "pointer",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                  onClick={() =>
                    col.filterType !== "none" && onSortChange(col.key)
                  }
                >
                  {col.label}
                  {col.filterType !== "none" && <SortArrow colKey={col.key} />}
                </th>
              ))}
            </tr>
            <tr
              style={{
                background: colors.rowHover,
                position: "sticky",
                top: 33,
                zIndex: 1,
              }}
            >
              {columns.map((col) => (
                <th key={col.key} style={{ padding: "4px 12px" }}>
                  {col.filterType === "none" ? null : col.filterType ===
                    "date" ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      {["from", "to"].map((side) => (
                        <input
                          key={side}
                          type="date"
                          value={filters[col.key]?.[side] || ""}
                          onChange={(e) =>
                            onFilterChange(col.key, {
                              ...filters[col.key],
                              [side]: e.target.value,
                            })
                          }
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            ...filterFieldStyle(colors),
                            flex: 1,
                            minWidth: 0,
                          }}
                          title={side === "from" ? "From" : "To"}
                        />
                      ))}
                    </div>
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
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr
                key={t.log_id}
                style={{ borderTop: `1px solid ${colors.cardBorder}` }}
              >
                {showMemberColumn && <td style={cellStyle}>{t.member_name}</td>}
                <td
                  style={{
                    padding: "8px 12px",
                    fontWeight: 600,
                    color: colors.selectedBorder,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onDoctrack && onDoctrack(t)}
                    title="Open Doctrack"
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      font: "inherit",
                      fontWeight: 600,
                      color: colors.selectedBorder,
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    {t.dtn}
                  </button>
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
                <td style={cellStyle}>{t.date_received_center || "—"}</td>
                <td style={cellStyle}>{t.prod_class_prescrip || "—"}</td>
                <td style={cellStyle}>{t.app_type || "—"}</td>
                <td style={cellStyle}>{t.processing_type || "—"}</td>
                <td style={cellStyle}>{t.entry_type || "—"}</td>
                <td style={{ padding: "8px 12px" }}>{t.step || "—"}</td>
                {showAccomplished && (
                  <td style={cellStyle}>
                    {t.date_accomplished
                      ? String(t.date_accomplished).slice(0, 10)
                      : "—"}
                  </td>
                )}
                <td style={{ padding: "8px 12px" }}>
                  <StatusPill status={t.status} />
                </td>
                <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => onDetails && onDetails(t)}
                      title="View Details"
                      style={actionBtn}
                    >
                      👁 Details
                    </button>
                    <button
                      type="button"
                      onClick={() => onLogs && onLogs(t)}
                      title="View Application Logs"
                      style={actionBtn}
                    >
                      📋 Logs
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
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
  if (total === 0) return null;
  const btn = (disabled) => ({
    padding: "4px 10px",
    borderRadius: 6,
    border: `1px solid ${colors.cardBorder}`,
    background: "transparent",
    color: colors.textSecondary,
    fontSize: "0.72rem",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.4 : 1,
  });
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
          Page {page} of {Math.max(totalPages, 1)} · {total} total
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
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: "0.72rem",
              cursor: "pointer",
            }}
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
            style={btn(page === 1)}
          >
            ‹ Prev
          </button>
          <button
            onClick={onNext}
            disabled={page === totalPages}
            style={btn(page === totalPages)}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}

// Builds the query params shared by the member + unit task endpoints
const buildTaskQuery = (page, pageSize, filters, sortBy, sortDir) => ({
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
  sortBy,
  sortDir,
});

// ══════════════════════════════════════════════════════════════════
// COMPLETED — what the selected member finished in the last 7 days.
// Server-side: GET .../all-teams/{member}/tasks/completed (filters, sort,
// paging, and per-day counts for the day chips all come from the API).
// ══════════════════════════════════════════════════════════════════
const COMPLETED_RANGES = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
];
const DEFAULT_COMPLETED_FILTERS = {
  ...DEFAULT_TASK_FILTERS,
  date_accomplished: { from: "", to: "" },
};

const toLocalISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// start/end are inclusive local dates; `days` = how far back from today the
// API window must reach to cover `start` (backend caps it at 90).
function computeCompletedRange(key) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const back = (n) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - n);
  let start = today;
  let end = today;
  if (key === "7d") start = back(6);
  else if (key === "30d") start = back(29);
  else if (key === "90d") start = back(89);
  else if (key === "thisMonth")
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  else if (key === "lastMonth") {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    end = new Date(today.getFullYear(), today.getMonth(), 0);
  }
  const days = Math.round((today - start) / 86400000) + 1;
  return { start, end, days, todayISO: toLocalISO(today) };
}

function CompletedPanel({ member, colors, accent, taskActions }) {
  const [rangeKey, setRangeKey] = useState("7d");
  const [filters, setFilters] = useState(DEFAULT_COMPLETED_FILTERS);
  const [sortKey, setSortKey] = useState("date_accomplished");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const debouncedFilters = useDebouncedValue(filters, 350);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [dailyCounts, setDailyCounts] = useState({}); // { "YYYY-MM-DD": n }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const range = useMemo(() => computeCompletedRange(rangeKey), [rangeKey]);
  const rangeLabel = COMPLETED_RANGES.find((r) => r.key === rangeKey).label;
  const startISO = toLocalISO(range.start);
  const endISO = toLocalISO(range.end);

  // every day in the range, newest first
  const days = useMemo(() => {
    const out = [];
    for (let d = new Date(range.end); d >= range.start; ) {
      const iso = toLocalISO(d);
      out.push({
        iso,
        label:
          iso === range.todayISO
            ? "Today"
            : d.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              }),
      });
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
    }
    return out;
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const picked = debouncedFilters.date_accomplished || {};
        const res = await getAllTeamsMemberCompletedTasks(
          member.member_user_id,
          {
            ...buildTaskQuery(
              page,
              pageSize,
              debouncedFilters,
              sortKey,
              sortDir,
            ),
            days: range.days,
            // a picked day/range narrows within the preset; otherwise the preset bounds apply
            completedFrom: picked.from || startISO,
            completedTo: picked.to || endISO,
          },
        );
        if (cancelled) return;
        setRows(res.data);
        setTotal(res.total);
        setTotalPages(res.total_pages);
        setDailyCounts(
          Object.fromEntries(
            (res.daily_counts || []).map((d) => [d.day, d.count]),
          ),
        );
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    member.member_user_id,
    page,
    pageSize,
    debouncedFilters,
    sortKey,
    sortDir,
    range,
    startISO,
    endISO,
  ]);

  const onRangeChange = (key) => {
    setRangeKey(key);
    setFilters((prev) => ({
      ...prev,
      date_accomplished: { from: "", to: "" },
    }));
    setPage(1);
  };

  const rangeTotal = days.reduce(
    (sum, d) => sum + (dailyCounts[d.iso] || 0),
    0,
  );
  // long ranges would be a wall of chips — only show days that have work
  const visibleDays =
    days.length <= 7 ? days : days.filter((d) => dailyCounts[d.iso] > 0);
  const acc = filters.date_accomplished || {};
  const activeDay = acc.from && acc.from === acc.to ? acc.from : null;
  const setDay = (iso) => {
    setFilters((prev) => ({
      ...prev,
      date_accomplished: iso ? { from: iso, to: iso } : { from: "", to: "" },
    }));
    setPage(1);
  };

  const chip = (active, disabled) => ({
    padding: "4px 11px",
    borderRadius: 9999,
    border: `1px solid ${active ? colors.selectedBorder : colors.cardBorder}`,
    background: active ? colors.selectedBorder : "transparent",
    color: active ? "#fff" : colors.textSecondary,
    fontSize: "0.68rem",
    fontWeight: 700,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.4 : 1,
    whiteSpace: "nowrap",
  });

  return (
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
          padding: "0.7rem 1rem",
          borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
          fontSize: "0.82rem",
          fontWeight: 700,
          color: colors.textPrimary,
        }}
      >
        <span>
          ✅ {member.member_name}'s completed tasks — {rangeLabel.toLowerCase()}{" "}
          ({total})
        </span>
        <select
          value={rangeKey}
          onChange={(e) => onRangeChange(e.target.value)}
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: `1px solid ${colors.cardBorder}`,
            background: colors.cardBg,
            color: colors.textPrimary,
            fontSize: "0.72rem",
            fontWeight: 600,
          }}
        >
          {COMPLETED_RANGES.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          flexWrap: "wrap",
          padding: "0.6rem 1rem",
          borderBottom: `1px solid ${colors.cardBorder}`,
        }}
      >
        <button
          onClick={() => setDay(null)}
          style={chip(!acc.from && !acc.to, false)}
        >
          All · {rangeTotal}
        </button>
        {visibleDays.map((d) => {
          const n = dailyCounts[d.iso] || 0;
          return (
            <button
              key={d.iso}
              disabled={n === 0}
              onClick={() => setDay(activeDay === d.iso ? null : d.iso)}
              style={chip(activeDay === d.iso, n === 0)}
              title={d.iso}
            >
              {d.label} · {n}
            </button>
          );
        })}
      </div>

      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            color: accent.dangerText,
            fontSize: "0.8rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}
      {loading && rows.length === 0 ? (
        <div
          style={{
            padding: "1.5rem",
            textAlign: "center",
            color: colors.textTertiary,
            fontSize: "0.82rem",
          }}
        >
          Loading completed tasks…
        </div>
      ) : (
        // stays mounted while refetching (dimmed) so filter inputs keep focus
        <div
          style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.15s" }}
        >
          <TaskTable
            tasks={rows}
            colors={colors}
            showMemberColumn={false}
            showAccomplished
            {...taskActions}
            filters={filters}
            onFilterChange={(key, value) => {
              setFilters((prev) => ({ ...prev, [key]: value }));
              setPage(1);
            }}
            onClearFilters={() => {
              setFilters(DEFAULT_COMPLETED_FILTERS);
              setPage(1);
            }}
            sortKey={sortKey}
            sortDir={sortDir}
            onSortChange={(key) => {
              if (sortKey === key)
                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
              else {
                setSortKey(key);
                setSortDir("asc");
              }
            }}
            accent={accent}
          />
        </div>
      )}
      <TaskPagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        colors={colors}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════
export default function TeamOverviewView({ darkMode }) {
  const colors = usePalette(darkMode);
  const accent = useMemo(() => getAccentColors(darkMode), [darkMode]);

  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [unitViewMode, setUnitViewMode] = useState("members"); // "members" | "tasks"

  // Unit breakdown
  const [unitSummary, setUnitSummary] = useState({});
  const [unitSummaryLoading, setUnitSummaryLoading] = useState(false);
  const [unitSummaryError, setUnitSummaryError] = useState(null);
  const [summaryTab, setSummaryTab] = useState("by_step");
  const [summaryMemberBreakdown, setSummaryMemberBreakdown] = useState({});

  // Per-member table
  const [tasksFilters, setTasksFilters] = useState(DEFAULT_TASK_FILTERS);
  const [tasksSortKey, setTasksSortKey] = useState(null);
  const [tasksSortDir, setTasksSortDir] = useState("asc");
  const debouncedTasksFilters = useDebouncedValue(tasksFilters, 350);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState(null);
  const [tasksPage, setTasksPage] = useState(1);
  const [tasksPageSize, setTasksPageSize] = useState(PAGE_SIZE);
  const [tasksTotalPages, setTasksTotalPages] = useState(0);
  const [tasksTotal, setTasksTotal] = useState(0);

  // Unit-wide table
  const [unitTasksFilters, setUnitTasksFilters] = useState(
    DEFAULT_UNIT_TASK_FILTERS,
  );
  const [unitTasksSortKey, setUnitTasksSortKey] = useState(null);
  const [unitTasksSortDir, setUnitTasksSortDir] = useState("asc");
  const debouncedUnitTasksFilters = useDebouncedValue(unitTasksFilters, 350);
  const [unitTasks, setUnitTasks] = useState([]);
  const [unitTasksLoading, setUnitTasksLoading] = useState(false);
  const [unitTasksError, setUnitTasksError] = useState(null);
  const [unitTasksPage, setUnitTasksPage] = useState(1);
  const [unitTasksPageSize, setUnitTasksPageSize] = useState(PAGE_SIZE);
  const [unitTasksTotalPages, setUnitTasksTotalPages] = useState(0);
  const [unitTasksTotal, setUnitTasksTotal] = useState(0);

  // ── Reused modals: DTN → Doctrack, Actions → Details / Application Logs ──
  const [doctrackRow, setDoctrackRow] = useState(null);
  const [logsRow, setLogsRow] = useState(null);
  const [detail, setDetail] = useState(null); // full or partial record
  const [detailLoading, setDetailLoading] = useState(false);

  // main_db.DB_ID of a task row (= application_logs.main_db_id)
  const mainIdOf = (t) => t.main_db_id ?? t.db_id ?? null;

  // Load the FULL record (same shape the Records page uses)
  const fetchFullRecord = async (t) => {
    if (!t.dtn)
      throw new Error("This record has no DTN, so it cannot be loaded.");
    const res = await getUploadReports({
      page: 1,
      pageSize: 20,
      search: "",
      status: "",
      sortBy: "DB_DATE_EXCEL_UPLOAD",
      sortOrder: "desc",
      dtn: parseInt(t.dtn, 10),
    });
    const items = (res?.data ?? []).map(mapDataItem);
    const mainId = mainIdOf(t);
    const match =
      mainId != null
        ? items.find((x) => String(x.id) === String(mainId))
        : items.length === 1
          ? items[0]
          : null;
    if (!match) throw new Error("Full record not found.");
    return match;
  };

  const openDetails = async (t) => {
    // show a partial record first, then swap in the full one
    setDetail({
      dtn: t.dtn,
      entryType: t.entry_type,
      dateReceivedCent: t.date_received_center,
      appStatus: t.status,
      prodBrName: t.brand_name,
    });
    setDetailLoading(true);
    try {
      setDetail(await fetchFullRecord(t));
    } catch (err) {
      console.error("Load full record failed:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const taskActions = {
    onDoctrack: setDoctrackRow,
    onDetails: openDetails,
    onLogs: setLogsRow,
  };

  // ── Teams ──
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setAllMembers(await getAllTeams());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const units = useMemo(() => {
    const map = new Map();
    allMembers.forEach((m) => {
      if (!map.has(m.unit_id)) {
        map.set(m.unit_id, {
          unit_id: m.unit_id,
          unit_name: m.unit_name,
          members: [],
          total_in_progress: 0,
          unit_head_name: null,
        });
      }
      const unit = map.get(m.unit_id);
      unit.members.push(m);
      unit.total_in_progress += m.in_progress_count || 0;
      unit.unit_head_name = m.lead_name || unit.unit_head_name;
    });
    return Array.from(map.values()).sort(
      (a, b) => b.total_in_progress - a.total_in_progress,
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

  // ── Unit breakdown ──
  const loadUnitSummary = useCallback(async (unitId) => {
    setUnitSummaryLoading(true);
    setUnitSummaryError(null);
    try {
      setUnitSummary((await getUnitInProgressSummary(unitId)) || {});
    } catch (err) {
      setUnitSummaryError(err.message);
      setUnitSummary({});
    } finally {
      setUnitSummaryLoading(false);
    }
  }, []);

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

  // ── Per-member tasks ──
  useEffect(() => {
    if (!selectedMemberId) return;
    let cancelled = false;
    (async () => {
      setTasksLoading(true);
      setTasksError(null);
      try {
        const res = await getAllTeamsMemberInProgressTasks(
          selectedMemberId,
          buildTaskQuery(
            tasksPage,
            tasksPageSize,
            debouncedTasksFilters,
            tasksSortKey,
            tasksSortDir,
          ),
        );
        if (cancelled) return;
        setTasks(res.data);
        setTasksTotalPages(res.total_pages);
        setTasksTotal(res.total);
      } catch (err) {
        if (!cancelled) setTasksError(err.message);
      } finally {
        if (!cancelled) setTasksLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    selectedMemberId,
    tasksPage,
    tasksPageSize,
    debouncedTasksFilters,
    tasksSortKey,
    tasksSortDir,
  ]);

  // ── Per-member, per-year in-progress counts for the selected unit.
  //    Uses the existing task endpoints with pageSize 1 and a date range,
  //    so only `total` is needed — no task rows are transferred. ──
  const [memberYearCounts, setMemberYearCounts] = useState({});
  const [yearsLoading, setYearsLoading] = useState(false);

  useEffect(() => {
    if (!selectedUnitId) {
      setMemberYearCounts({});
      return;
    }
    const unit = units.find((u) => u.unit_id === selectedUnitId);
    if (!unit) return;
    let cancelled = false;

    (async () => {
      setYearsLoading(true);
      setMemberYearCounts({});
      const thisYear = new Date().getFullYear();
      let minYear = thisYear - 4;
      try {
        // oldest in-progress task of the unit decides the first year
        const oldest = await getUnitInProgressTasks(selectedUnitId, {
          page: 1,
          pageSize: 1,
          sortBy: "date_received_center",
          sortDir: "asc",
        });
        const d = oldest?.data?.[0]?.date_received_center;
        const y = d ? Number(String(d).slice(0, 4)) : NaN;
        if (y >= 2000 && y <= thisYear) minYear = y;
      } catch {
        /* fall back to the last 5 years */
      }

      const years = [];
      for (let y = minYear; y <= thisYear; y += 1) years.push(y);

      const entries = await Promise.all(
        unit.members.map(async (m) => {
          const counts = await Promise.all(
            years.map(async (y) => {
              try {
                const res = await getAllTeamsMemberInProgressTasks(
                  m.member_user_id,
                  {
                    page: 1,
                    pageSize: 1,
                    dateFrom: `${y}-01-01`,
                    dateTo: `${y}-12-31`,
                  },
                );
                return { year: y, count: res?.total || 0 };
              } catch {
                return { year: y, count: 0 };
              }
            }),
          );
          return [m.member_user_id, counts.filter((c) => c.count > 0)];
        }),
      );

      if (cancelled) return;
      setMemberYearCounts(Object.fromEntries(entries));
      setYearsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedUnitId, units]);

  // Unit-level per-year summary = sum of its members' per-year counts
  const unitYearRows = useMemo(() => {
    const totals = {};
    Object.values(memberYearCounts).forEach((rows) =>
      (rows || []).forEach(({ year, count }) => {
        totals[year] = (totals[year] || 0) + count;
      }),
    );
    return getYearBreakdown(totals);
  }, [memberYearCounts]);

  // ── Unit-wide tasks ──
  useEffect(() => {
    if (!selectedUnitId || unitViewMode !== "tasks") return;
    let cancelled = false;
    (async () => {
      setUnitTasksLoading(true);
      setUnitTasksError(null);
      try {
        const res = await getUnitInProgressTasks(selectedUnitId, {
          ...buildTaskQuery(
            unitTasksPage,
            unitTasksPageSize,
            debouncedUnitTasksFilters,
            unitTasksSortKey,
            unitTasksSortDir,
          ),
          memberName: debouncedUnitTasksFilters.member_name,
        });
        if (cancelled) return;
        setUnitTasks(res.data);
        setUnitTasksTotalPages(res.total_pages);
        setUnitTasksTotal(res.total);
      } catch (err) {
        if (!cancelled) setUnitTasksError(err.message);
      } finally {
        if (!cancelled) setUnitTasksLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    selectedUnitId,
    unitViewMode,
    unitTasksPage,
    unitTasksPageSize,
    debouncedUnitTasksFilters,
    unitTasksSortKey,
    unitTasksSortDir,
  ]);

  // ── Handlers ──
  const nextSort = (key, curKey, setKey, setDir) => {
    if (curKey === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setKey(key);
      setDir("asc");
    }
  };

  const openUnit = (unitId) => {
    setSelectedMemberId(null);
    setUnitViewMode("members");
    setUnitTasks([]);
    setUnitTasksPage(1);
    setSummaryTab("by_step");
    setSummaryMemberBreakdown({});
    setUnitTasksFilters(DEFAULT_UNIT_TASK_FILTERS);
    setUnitTasksSortKey(null);
    setUnitTasksSortDir("asc");

    if (selectedUnitId === unitId) {
      setSelectedUnitId(null);
      setUnitSummary({});
      setUnitSummaryError(null);
    } else {
      setSelectedUnitId(unitId);
      loadUnitSummary(unitId);
    }
  };

  const switchUnitViewMode = (mode) => {
    setUnitViewMode(mode);
    if (mode === "tasks") setSelectedMemberId(null);
  };

  const openMember = (memberUserId) => {
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

  const yearRange = (year) => ({ from: `${year}-01-01`, to: `${year}-12-31` });
  const filterYear = (f) =>
    f.from &&
    f.to &&
    f.from.slice(0, 4) === f.to.slice(0, 4) &&
    f.from === `${f.from.slice(0, 4)}-01-01` &&
    f.to === `${f.to.slice(0, 4)}-12-31`
      ? f.from.slice(0, 4)
      : null;

  // Member card year click → select that member and show only that year
  const openMemberYear = (memberUserId, year) => {
    setSelectedMemberId(memberUserId);
    setTasksPage(1);
    setTasksFilters({
      ...DEFAULT_TASK_FILTERS,
      date_received_center: yearRange(year),
    });
    setTasksSortKey(null);
    setTasksSortDir("asc");
  };

  // Unit card year click → All Tasks tab filtered to that year
  const applyUnitYearFilter = (year) => {
    setUnitViewMode("tasks");
    setSelectedMemberId(null);
    setUnitTasksPage(1);
    setUnitTasksFilters((prev) => ({
      ...prev,
      date_received_center: yearRange(year),
    }));
  };

  const applySummaryFilter = (tabKey, label) => {
    const columnKey = SUMMARY_TAB_TO_COLUMN[tabKey];
    if (!columnKey) return;
    setUnitViewMode("tasks");
    setSelectedMemberId(null);
    setUnitTasksPage(1);
    setUnitTasksFilters((prev) => ({ ...prev, [columnKey]: label }));
  };

  // ── Early states ──
  const centered = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: colors.textTertiary,
  };
  if (loading) return <div style={centered}>Loading teams…</div>;
  if (error)
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
  if (units.length === 0)
    return <div style={centered}>No units with active members yet.</div>;

  const currentSummaryList = unitSummary[summaryTab] || [];
  const currentSummaryMax = currentSummaryList[0]?.count || 0;

  const panelHeader = (title, extra) => (
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
        {title}
      </span>
      {extra}
    </div>
  );

  const errorBox = (msg) =>
    msg && (
      <div
        style={{
          padding: "0.75rem 1rem",
          color: accent.dangerText,
          fontSize: "0.8rem",
        }}
      >
        ⚠️ {msg}
      </div>
    );

  const loadingBox = (
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
  );

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
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {units.map((u) => (
            <UnitNode
              key={u.unit_id}
              unit={u}
              isSelected={selectedUnitId === u.unit_id}
              onClick={() => openUnit(u.unit_id)}
              colors={colors}
              severity={getSeverity(u.total_in_progress, maxUnitTotal)}
              accent={accent}
              yearRows={selectedUnitId === u.unit_id ? unitYearRows : []}
              yearsLoading={yearsLoading}
              onYearClick={applyUnitYearFilter}
              activeYear={
                unitViewMode === "tasks"
                  ? filterYear(unitTasksFilters.date_received_center || {})
                  : null
              }
            />
          ))}
        </div>

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

              <div
                style={{
                  display: "flex",
                  gap: "0.4rem",
                  marginBottom: "0.7rem",
                  flexWrap: "wrap",
                }}
              >
                {SUMMARY_TABS.map((tab) => {
                  const active = summaryTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setSummaryTab(tab.key)}
                      style={{
                        padding: "4px 11px",
                        borderRadius: 9999,
                        border: `1px solid ${active ? colors.selectedBorder : colors.cardBorder}`,
                        background: active
                          ? colors.selectedBorder
                          : "transparent",
                        color: active ? "#fff" : colors.textSecondary,
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
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
                      const cacheKey = `${groupBy}:${item.label}`;
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
                          breakdown={summaryMemberBreakdown[cacheKey]}
                          onHoverStart={() => {
                            if (!summaryMemberBreakdown[cacheKey])
                              loadSummaryMemberBreakdown(
                                selectedUnitId,
                                groupBy,
                                item.label,
                              );
                          }}
                          accent={accent}
                        />
                      );
                    })}
                  </div>
                )
              )}

              {/* Members / All Tasks tabs */}
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
                      yearCounts={memberYearCounts[m.member_user_id]}
                      yearsLoading={yearsLoading}
                      onYearClick={(year) =>
                        openMemberYear(m.member_user_id, year)
                      }
                      activeYear={
                        selectedMemberId === m.member_user_id
                          ? filterYear(tasksFilters.date_received_center || {})
                          : null
                      }
                    />
                  ))}
                </div>
              )}

              {unitViewMode === "tasks" && (
                <div
                  style={{
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 10,
                    background: colors.pageBg,
                    overflow: "hidden",
                  }}
                >
                  {panelHeader(
                    `All in-progress tasks — ${selectedUnit.unit_name} (${unitTasksTotal})`,
                  )}
                  {errorBox(unitTasksError)}
                  {unitTasksLoading ? (
                    loadingBox
                  ) : (
                    <TaskTable
                      tasks={unitTasks}
                      colors={colors}
                      showMemberColumn
                      {...taskActions}
                      filters={unitTasksFilters}
                      onFilterChange={(key, value) => {
                        setUnitTasksFilters((prev) => ({
                          ...prev,
                          [key]: value,
                        }));
                        setUnitTasksPage(1);
                      }}
                      onClearFilters={() => {
                        setUnitTasksFilters(DEFAULT_UNIT_TASK_FILTERS);
                        setUnitTasksPage(1);
                      }}
                      sortKey={unitTasksSortKey}
                      sortDir={unitTasksSortDir}
                      onSortChange={(key) =>
                        nextSort(
                          key,
                          unitTasksSortKey,
                          setUnitTasksSortKey,
                          setUnitTasksSortDir,
                        )
                      }
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
                    onPageSizeChange={(n) => {
                      setUnitTasksPageSize(n);
                      setUnitTasksPage(1);
                    }}
                    colors={colors}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {selectedMemberId && unitViewMode === "members" && (
          <>
            <div
              style={{
                marginTop: "1rem",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                background: colors.cardBg,
                overflow: "hidden",
              }}
            >
              {panelHeader(
                `${selectedMember?.member_name}'s in-progress tasks (${tasksTotal})`,
              )}
              {errorBox(tasksError)}
              {tasksLoading ? (
                loadingBox
              ) : (
                <TaskTable
                  tasks={tasks}
                  colors={colors}
                  showMemberColumn={false}
                  {...taskActions}
                  filters={tasksFilters}
                  onFilterChange={(key, value) => {
                    setTasksFilters((prev) => ({ ...prev, [key]: value }));
                    setTasksPage(1);
                  }}
                  onClearFilters={() => {
                    setTasksFilters(DEFAULT_TASK_FILTERS);
                    setTasksPage(1);
                  }}
                  sortKey={tasksSortKey}
                  sortDir={tasksSortDir}
                  onSortChange={(key) =>
                    nextSort(
                      key,
                      tasksSortKey,
                      setTasksSortKey,
                      setTasksSortDir,
                    )
                  }
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
                onPageSizeChange={(n) => {
                  setTasksPageSize(n);
                  setTasksPage(1);
                }}
                colors={colors}
              />
            </div>
            {selectedMember && (
              <CompletedPanel
                key={selectedMemberId}
                member={selectedMember}
                colors={colors}
                accent={accent}
                taskActions={taskActions}
              />
            )}
          </>
        )}
      </div>

      {doctrackRow && (
        <DoctrackModal
          record={{ dtn: doctrackRow.dtn }}
          onClose={() => setDoctrackRow(null)}
          colors={colors}
        />
      )}
      {logsRow && (
        <ApplicationLogsModal
          record={{ dtn: logsRow.dtn, mainDbId: mainIdOf(logsRow) }}
          onClose={() => setLogsRow(null)}
          colors={colors}
          darkMode={darkMode}
        />
      )}
      {detail && (
        <ViewDetailsModal
          record={detail}
          loading={detailLoading}
          onClose={() => setDetail(null)}
          colors={colors}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
