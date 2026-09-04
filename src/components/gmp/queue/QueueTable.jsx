// src/components/gmp/queue/QueueTable.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ArrowUpDown, ChevronUp, X } from "lucide-react";
import { FONT, GMP_STATUS_COLORS, GMP_STEPS, GMP_FIELD_ACCENTS } from "../shared/constants";
import StepProgress from "../shared/StepProgress";
import StatusTimelineBadge, { rowTimelineTint, effectiveTimelineDays } from "../shared/StatusTimelineBadge";


const ACCENT = "#6366f1";

// ── Column definitions (29 GMP fields) ───────────────────────────────────────
export const COLUMNS = [
  { key: "dtn",                           label: "DTN",                                       width: 160 },
  { key: "reference_no",                  label: "Reference No",                              width: 160 },
  { key: "related_dtn",                   label: "Related DTN",                               width: 130 },
  { key: "category",                      label: "Category",                                  width: 110 },
  { key: "date_received",                 label: "Date Received",                             width: 120 },
  { key: "name_of_establishment",         label: "Name of Establishment",                     width: 260 },
  { key: "lto_number",                    label: "LTO Number",                                width: 120 },
  { key: "address",                       label: "Address",                                   width: 320 },
  { key: "transaction_type",              label: "Transaction Type",                          width: 140 },
  { key: "foreign_manufacturer",          label: "Foreign Manufacturer",                      width: 240 },
  { key: "foreign_manufacturer_address",  label: "Foreign Manufacturer Address",              width: 320 },
  { key: "secpa_number",                  label: "SECPA Number",                              width: 130 },
  { key: "certificate_number",            label: "Certificate Number",                        width: 140 },
  { key: "type_of_issuance",              label: "Type of Issuance",                         width: 130 },
  { key: "certificate_validity",          label: "Certificate Validity",                      width: 130 },
  { key: "decision",                      label: "Decision",                                  width: 110 },
  { key: "status",                        label: "Status",                                    width: 120, isStatus: true },
  { key: "released_date",                 label: "Released Date",                             width: 110 },
  { key: "processed_time",                label: "Processed Time",                            width: 120 },
  { key: "end_date",                      label: "End Date",                                  width: 110 },
  { key: "timeline",                      label: "Timeline",                                  width: 100 },
  { key: "status_timeline",               label: "Status Timeline",                           width: 160 },
  { key: "remarks",                       label: "Remarks",                                   width: 180 },
  { key: "nod_date_1",                    label: "1st Date of NOD",                          width: 120 },
  { key: "nod_date_2",                    label: "2nd Date of NOD",                          width: 120 },
  { key: "nod_date_3",                    label: "3rd Date of NOD",                          width: 120 },
  { key: "nod_date_4",                    label: "4th Date of NOD",                          width: 120 },
  { key: "nod_date_5",                    label: "5th Date of NOD",                          width: 120 },
  { key: "date_printed",                  label: "Date Printed",                              width: 110 },
  { key: "compliance_docs_date_received", label: "Compliance / Additional Docs Date Received", width: 220 },
  { key: "product_line",                  label: "Product Line",                              width: 120 },
  { key: "uploaded_date",                 label: "Upload Date",                               width: 140 },
  { key: "uploaded_by",                   label: "Uploaded By",                               width: 140 },
];

// Column key → backend GMPRecord field name, for click-to-sort headers.
// Columns not listed here (synthetic/derived ones) simply aren't sortable.
const SORT_FIELD_MAP = {
  dtn: "GMP_DTN",
  reference_no: "GMP_REFERENCE_NO",
  related_dtn: "GMP_RELATED_DTN",
  category: "GMP_EST_CATEGORY",
  date_received: "GMP_DATE_RECEIVED",
  name_of_establishment: "GMP_LTO_COMPANY",
  lto_number: "GMP_LTO_NUMBER",
  address: "GMP_LTO_ADDRESS",
  transaction_type: "GMP_TRANSACTION_TYPE",
  foreign_manufacturer: "GMP_FOREIGN_MANUFACTURER",
  foreign_manufacturer_address: "GMP_FOREIGN_MANUFACTURER_ADDRESS",
  secpa_number: "GMP_SECPA_NUMBER",
  certificate_number: "GMP_CERTIFICATE_NUMBER",
  type_of_issuance: "GMP_TYPE_OF_ISSUANCE",
  certificate_validity: "GMP_CERTIFICATE_VALIDITY",
  decision: "GMP_DECISION",
  status: "GMP_APP_STATUS",
  released_date: "GMP_RELEASED_DATE",
  processed_time: "GMP_PROCESSED_TIME",
  end_date: "GMP_END_DATE",
  timeline: "GMP_TIMELINE",
  remarks: "GMP_REMARKS",
  nod_date_1: "GMP_NOD_DATE_1",
  nod_date_2: "GMP_NOD_DATE_2",
  nod_date_3: "GMP_NOD_DATE_3",
  nod_date_4: "GMP_NOD_DATE_4",
  nod_date_5: "GMP_NOD_DATE_5",
  date_printed: "GMP_DATE_PRINTED",
  compliance_docs_date_received: "GMP_COMPLIANCE_DOCS_DATE_RECEIVED",
  product_line: "GMP_PRODUCT_LINE",
  uploaded_date: "GMP_DATE_EXCEL_UPLOAD",
  uploaded_by: "GMP_USER_UPLOADER",
};

const TRUNCATE_FIELDS = new Set([
  "name_of_establishment", "address",
  "foreign_manufacturer", "foreign_manufacturer_address", "remarks",
]);

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatusBadge({ value }) {
  if (!value) return <span style={{ color: "#94a3b8" }}>—</span>;
  const upper = value.toUpperCase();
  // "IN PROGRESS" isn't a stored GMP_APP_STATUS value — it's derived in
  // getEffectiveStatus() below — so it isn't in GMP_STATUS_COLORS. Give it
  // its own look here rather than falling through to the generic gray.
  const s = upper === "IN PROGRESS"
    ? { bg: "#fff7ed", color: "#c2410c" }
    : (GMP_STATUS_COLORS[upper] ?? { bg: "#f1f5f9", color: "#64748b" });
  return (
    <span style={{
      fontSize: "0.63rem", fontWeight: 700, padding: "3px 9px",
      borderRadius: 99, background: s.bg, color: s.color, whiteSpace: "nowrap",
    }}>
      • {value}
    </span>
  );
}

// A record's GMP_APP_STATUS can be stale, empty, or simply not set for
// applications that are actively moving through the workflow — the reliable
// signal for "still in progress" is that it has an active (non-terminal)
// current_step, which only exists while there's an open "IN PROGRESS" log
// entry (see advance_step in app/crud/gmp_logs.py, which sets
// GMP_CURRENT_STEP whenever it opens a new log). Terminal statuses are left
// as-is so COMPLETED/RELEASED/DISAPPROVED records still show their real status.
const GMP_TERMINAL_STATUSES = new Set([
  "COMPLETED", "RELEASED", "DISAPPROVED", "CANCELLED APPLICATION", "CANCELLED",
]);
function getEffectiveStatus(row) {
  const raw = (row.status || "").trim().toUpperCase();
  if (raw && GMP_TERMINAL_STATUSES.has(raw)) return row.status;
  if (row.current_step) return "IN PROGRESS";
  return row.status;
}

function DtnPill({ value }) {
  if (!value) return <span style={{ color: "#94a3b8" }}>—</span>;
  return (
    <span style={{
      fontFamily: "ui-monospace,monospace", fontSize: "0.71rem", fontWeight: 700,
      padding: "3px 9px", borderRadius: 6, background: `${ACCENT}15`, color: ACCENT,
      whiteSpace: "nowrap",
    }}>
      {value}
    </span>
  );
}

function ReferenceNoPill({ value }) {
  if (!value) return <span style={{ color: "#94a3b8" }}>—</span>;
  return (
    <span style={{
      fontFamily: "ui-monospace,monospace", fontSize: "0.71rem", fontWeight: 700,
      padding: "3px 9px", borderRadius: 6, background: "rgba(168,85,247,0.12)", color: "#a855f7",
      whiteSpace: "nowrap",
    }}>
      {value}
    </span>
  );
}

// Main (per-DTN) view rolls up every sibling reference number (added via Add
// Issuance) onto the DTN's single row — stack each one's own pill instead of
// showing just the primary's, so nothing is hidden by the DTN-level rollup.
function ReferenceNoStack({ items }) {
  if (!items || items.length === 0) return <span style={{ color: "#94a3b8" }}>—</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {items.map((s, i) => <ReferenceNoPill key={s.reference_no ?? i} value={s.reference_no} />)}
    </div>
  );
}
function IssuanceTypeStack({ items }) {
  if (!items || items.length === 0) return <span style={{ color: "#94a3b8" }}>—</span>;
  const { bg, color } = GMP_FIELD_ACCENTS.type_of_issuance;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {items.map((s, i) => (
        <span key={s.reference_no ?? i} style={{
          fontSize: "0.68rem", fontWeight: 600, lineHeight: 1.3, whiteSpace: "nowrap",
          padding: "2px 8px", borderRadius: 6, background: bg, color,
        }}>
          {s.type_of_issuance || "—"}
        </span>
      ))}
    </div>
  );
}

// Category / Transaction Type / Issuance Type — each gets its own accent
// color (see GMP_FIELD_ACCENTS) so the same field reads as the same color
// in both the Queue table and the Tasks table. Compact, shrink-wrapped pill
// (matches TasksTable.jsx's FieldChip/IssuanceTypeChips exactly) rather than
// a block stretched to the cell's full width.
function FieldChip({ value, field }) {
  if (!value) return <span style={{ color: "#94a3b8" }}>—</span>;
  const { bg, color } = GMP_FIELD_ACCENTS[field];
  return (
    <span style={{
      fontSize: "0.68rem", fontWeight: 600, padding: "2px 8px", borderRadius: 6,
      background: bg, color, whiteSpace: "nowrap",
    }}>
      {value}
    </span>
  );
}

function SkeletonRows({ n = 8, darkMode, colCount }) {
  const base = darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const COL_COUNT = colCount ?? (COLUMNS.length + 5); // checkbox + # + actions + workflow progress + current step
  return (
    <>
      {[...Array(n)].map((_, i) => (
        <tr key={i}>
          {[...Array(COL_COUNT)].map((__, j) => (
            <td key={j} style={{ padding: "10px 12px" }}>
              <div style={{
                height: 14, borderRadius: 4, background: base,
                width: j === 0 ? "24px" : j === 1 ? "24px" : j === COL_COUNT - 1 ? "28px" : "80%",
              }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Action menu ───────────────────────────────────────────────────────────────
// "deck" item only shown on Not Yet Decked tab — controlled by `showDeck` prop
const ACTION_ITEMS_DECKED   = [
  { id: "app_info",  label: "Application Information", icon: "🔎" },
  { id: "app_log",   label: "Application Logs",  icon: "📋" },
  { id: "audit_log", label: "Field Audit Logs",   icon: "🕐" },
  { id: "documents", label: "Documents",         icon: "📎" },
  { id: "doctrack",  label: "Doctrack Details",  icon: "📋" },
  { id: "divider1",  label: "---" },
  { id: "reassign",  label: "Application Re-assignment", icon: "🔄", color: "#7c3aed" },
  { id: "reroute",   label: "Application Re-route",      icon: "🔀", color: "#0891b2" },
];
const ACTION_ITEMS_NOT_DECKED = [
  { id: "deck",      label: "Deck Application", icon: "🎯", color: "#4CAF50" },
  { id: "divider0",  label: "---" },
  { id: "app_info",  label: "Application Information", icon: "🔎" },
  { id: "app_log",   label: "Application Logs",  icon: "📋" },
  { id: "audit_log", label: "Field Audit Logs",   icon: "🕐" },
  { id: "documents", label: "Documents",         icon: "📎" },
  { id: "doctrack",  label: "Doctrack Details",  icon: "📋" },
  { id: "divider1",  label: "---" },
  { id: "reassign",  label: "Application Re-assignment", icon: "🔄", color: "#7c3aed" },
  { id: "reroute",   label: "Application Re-route",      icon: "🔀", color: "#0891b2" },
];

function ActionMenu({ record, onAction, colors, darkMode, showDeck }) {
  const ACTION_ITEMS = showDeck ? ACTION_ITEMS_NOT_DECKED : ACTION_ITEMS_DECKED;
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const calcPos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuH = menuRef.current?.offsetHeight ?? 160;
    const menuW = menuRef.current?.offsetWidth  ?? 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top  = spaceBelow < menuH + 8 ? rect.top - menuH - 4 : rect.bottom + 4;
    let left = rect.right - menuW;
    // Clamp so the menu never drifts off-screen or under the sidebar
    left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
    setMenuPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(calcPos);
    window.addEventListener("scroll", calcPos, true);
    window.addEventListener("resize", calcPos);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", calcPos, true);
      window.removeEventListener("resize", calcPos);
    };
  }, [open, calcPos]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          btnRef.current  && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <>
      <button ref={btnRef} onClick={() => setOpen((v) => !v)} title="Actions"
        style={{
          width: 30, height: 30, borderRadius: 7,
          border: `1px solid ${open ? "#4CAF50" : "#4CAF5040"}`,
          background: open ? "#4CAF50" : "#4CAF5015",
          color: open ? "#fff" : "#4CAF50", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.1rem", fontWeight: 700,
          transition: "all 0.12s",
        }}>
        ⋮
      </button>
      {open && createPortal(
        <div ref={menuRef}
          style={{
            position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 99999,
            background: darkMode ? "#1e2022" : "#ffffff",
            border: `1px solid ${darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"}`,
            borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            minWidth: 200, padding: "6px 0",
          }}>
          {ACTION_ITEMS.map((item) => {
            if (item.label === "---") {
              return <div key={item.id} style={{
                height: 1,
                background: darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
                margin: "4px 0",
              }} />;
            }
            return (
              <button key={item.id}
                onClick={() => { setOpen(false); onAction(item.id, record); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 16px", border: "none", background: "transparent",
                  cursor: "pointer", textAlign: "left", fontFamily: FONT,
                  fontSize: "0.82rem", fontWeight: item.color ? 600 : 400,
                  color: item.color ?? (darkMode ? "#e2e8f0" : "#1e293b"),
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.06)" : "#f1f5f9"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <span style={{ width: 22, textAlign: "center", fontSize: "0.9rem", flexShrink: 0 }}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

// ── Main table ────────────────────────────────────────────────────────────────
export default function QueueTable({
  rows, loading, selected, onSelect, onSelectAll,
  onOpenLog, onOpenAudit, onOpenDoctrack, onOpenReassign, onOpenReroute, onOpenInfo, onOpenDocuments,
  onDeck, onBulkDeck, colors, darkMode, page, pageSize, topTab, onDoubleClickRow,
  visibleColumns, sortBy, sortOrder, onSort, isDefaultSort, onResetSort,
}) {
  const isNotYetDecked = topTab !== "not_yet_decked";
  const selectedCount  = selected.length;
  const [hoveredRowKey, setHoveredRowKey] = useState(null);
  // `visibleColumns` is a list of column keys the user chose to show (via
  // the "Toggle Columns" panel in GMPQueuePage.jsx) — falls back to every
  // column so this table still works if a caller doesn't pass it.
  const visibleCols = visibleColumns
    ? COLUMNS.filter((c) => visibleColumns.includes(c.key))
    : COLUMNS;
  const extraColCount = visibleCols.some((c) => c.key === "status") ? 2 : 0; // Workflow Progress + Current Step

  const thSt = {
    padding: "9px 12px", fontSize: "0.59rem", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.05em", color: colors.textTertiary,
    borderBottom: `1px solid ${colors.divider}`, whiteSpace: "nowrap",
    position: "sticky", top: 0, background: colors.cardBg, textAlign: "center", zIndex: 1,
  };
  const tdSt = {
    padding: "9px 12px", borderBottom: "1px solid transparent",
    fontSize: "0.76rem", color: colors.textPrimary, lineHeight: 1.35,
    whiteSpace: "normal", wordBreak: "break-word",
    textAlign: "center", verticalAlign: "middle",
  };
  const tdCompactSt = {
    padding: "9px 12px", borderBottom: "1px solid transparent",
    fontSize: "0.76rem", color: colors.textPrimary, lineHeight: 1,
    whiteSpace: "nowrap", textAlign: "center", verticalAlign: "middle",
  };
  const clampSt = {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };
  const tdWrapSt = { ...tdSt };

  // Only the very first load (no rows yet) shows the full skeleton — once
  // there's data on screen, a re-sort/re-filter/page-change just dims the
  // existing rows in place instead of blanking the table into skeleton rows
  // again, so sorting reads as an update rather than a jarring reset.
  const isRefetching = loading && rows.length > 0;

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <style>{`
        .qt-sortable-th:hover .qt-sort-icon { opacity: 0.9 !important; }
      `}</style>

      {/* ── Scrollable table ── */}
      <div style={{ flex: 1, overflow: "auto" }}>
      <table style={{
        borderCollapse: "separate", borderSpacing: 0, width: "100%", fontSize: "0.76rem",
        opacity: isRefetching ? 0.5 : 1,
        transition: "opacity 0.15s ease",
      }}>
        <thead>
          <tr>
            <th style={{ ...thSt, width: 40, position: "sticky", left: 0, zIndex: 2, background: colors.cardBg }}>
              <input type="checkbox"
                checked={rows.length > 0 && selected.length === rows.length}
                onChange={(e) => onSelectAll(e.target.checked)}
                style={{ cursor: "pointer" }} />
            </th>
            <th style={{ ...thSt, width: 42 }}>#</th>
            {visibleCols.map((col) => {
              const sortField = SORT_FIELD_MAP[col.key];
              const isSorted = sortField && sortBy === sortField;
              return (
              <React.Fragment key={col.key}>
                <th
                  className={sortField ? "qt-sortable-th" : undefined}
                  style={{
                    ...thSt, width: col.width ?? "auto", minWidth: col.width ?? 100,
                    cursor: sortField ? "pointer" : "default",
                    userSelect: "none",
                  }}
                  onClick={sortField ? () => onSort?.(sortField) : undefined}
                  title={sortField ? "Click to sort" : undefined}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {col.label}
                    {sortField && (
                      <span
                        className="qt-sort-icon"
                        style={{
                          display: "inline-flex", flexShrink: 0,
                          color: isSorted ? ACCENT : colors.textTertiary,
                          opacity: isSorted ? 1 : 0.45,
                          transition: "opacity 0.15s ease, color 0.15s ease",
                        }}
                      >
                        {isSorted ? (
                          <ChevronUp
                            size={12}
                            style={{
                              transform: sortOrder === "asc" ? "rotate(0deg)" : "rotate(180deg)",
                              transition: "transform 0.18s ease",
                            }}
                          />
                        ) : (
                          <ArrowUpDown size={11} />
                        )}
                      </span>
                    )}
                    {isSorted && !isDefaultSort && (
                      <span
                        onClick={(e) => { e.stopPropagation(); onResetSort?.(); }}
                        title="Reset sort"
                        style={{
                          display: "inline-flex", flexShrink: 0, marginLeft: 1,
                          color: colors.textTertiary, opacity: 0.6,
                          transition: "opacity 0.15s ease, color 0.15s ease",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = "#ef4444"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.color = colors.textTertiary; }}
                      >
                        <X size={11} />
                      </span>
                    )}
                  </span>
                </th>
                {col.key === "status" && (
                  <>
                    <th style={{ ...thSt, width: 170, minWidth: 170 }}>
                      Workflow Progress
                    </th>
                    <th style={{ ...thSt, width: 150, minWidth: 150 }}>
                      Current Step
                    </th>
                  </>
                )}
              </React.Fragment>
              );
            })}
            <th style={{
              ...thSt, width: 56, textAlign: "center",
              position: "sticky", right: 0, zIndex: 2, background: colors.cardBg,
              boxShadow: darkMode ? "-4px 0 8px rgba(0,0,0,0.25)" : "-4px 0 8px rgba(15,23,42,0.05)",
            }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0 ? (
            <SkeletonRows n={10} darkMode={darkMode} colCount={visibleCols.length + extraColCount + 3} />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={visibleCols.length + extraColCount + 3}
                style={{ padding: "48px 24px", textAlign: "center", color: colors.textTertiary }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "2rem" }}>📭</span>
                  <span style={{ fontSize: "0.84rem" }}>No records in queue</span>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((r, i) => {
              const isSel = selected.includes(r.id);
              const rowKey = r.id ?? i;
              // No cell border lines — rows separate via zebra tint instead,
              // with a stronger accent wash on hover/selection. Every cell's
              // background is driven from React state (rowBg) rather than
              // mutated imperatively, so a theme toggle mid-hover can't leave
              // a stale color stuck on a <td> that React isn't tracking.
              const zebraBg = i % 2 === 1 ? colors.tableRowAlt : colors.cardBg;
              // Light-yellow / light-red wash for a still-open application near
              // or past its allotted timeline (PIC/S 60 / NON PIC/S 153 working
              // days, or an explicit GMP_TIMELINE). Yields to hover/selection.
              const riskTint = rowTimelineTint(r, darkMode);
              const isHovered = !isSel && hoveredRowKey === rowKey;
              const rowBg = isSel || isHovered ? colors.tableRowAccentHover : (riskTint ?? zebraBg);
              const rowTdSt = { ...tdSt, background: rowBg, borderBottom: `1px solid ${colors.divider}` };
              const rowTdCompactSt = { ...tdCompactSt, background: rowBg, borderBottom: `1px solid ${colors.divider}` };
              const rowTdWrapSt = { ...tdWrapSt, background: rowBg, borderBottom: `1px solid ${colors.divider}` };
              return (
                <tr key={rowKey}
                  onDoubleClick={() => onDoubleClickRow?.(r)}
                  style={{ cursor: onDoubleClickRow ? "pointer" : "default", background: rowBg }}
                  onMouseEnter={() => setHoveredRowKey(rowKey)}
                  onMouseLeave={() => setHoveredRowKey((k) => (k === rowKey ? null : k))}>
                  {/* Checkbox */}
                  <td style={{ ...rowTdCompactSt, position: "sticky", left: 0 }}>
                    <input type="checkbox" checked={isSel}
                      onChange={(e) => onSelect(r.id, e.target.checked)}
                      style={{ cursor: "pointer" }} />
                  </td>
                  {/* Row number */}
                  <td style={{ ...rowTdCompactSt, color: colors.textTertiary, fontSize: "0.7rem" }}>
                    {(page - 1) * pageSize + i + 1}
                  </td>
                  {/* Dynamic columns */}
                  {visibleCols.map((col) => {
                    const val = r[col.key];
                    let cell;
                    const hasSiblings = r.all_issuances && r.all_issuances.length > 0;
                    if (col.key === "dtn") cell = <td key={col.key} style={rowTdSt}><DtnPill value={val} /></td>;
                    else if (col.key === "related_dtn") cell = <td key={col.key} style={rowTdSt}><DtnPill value={val} /></td>;
                    else if (col.key === "reference_no") {
                      cell = (
                        <td key={col.key} style={rowTdSt}>
                          {hasSiblings ? <ReferenceNoStack items={r.all_issuances} /> : <ReferenceNoPill value={val} />}
                        </td>
                      );
                    }
                    else if (col.key === "type_of_issuance" && hasSiblings) {
                      cell = <td key={col.key} style={rowTdSt}><IssuanceTypeStack items={r.all_issuances} /></td>;
                    }
                    else if (GMP_FIELD_ACCENTS[col.key]) cell = <td key={col.key} style={rowTdSt}><FieldChip value={val} field={col.key} /></td>;
                    else if (col.isStatus) cell = <td key={col.key} style={rowTdSt}><StatusBadge value={getEffectiveStatus(r)} /></td>;
                    else if (col.key === "status_timeline") cell = <td key={col.key} style={rowTdSt}><StatusTimelineBadge row={r} /></td>;
                    else if (col.key === "timeline") {
                      // Raw GMP_TIMELINE if set; otherwise the value derived
                      // from the establishment category, muted.
                      const eff = val ? null : effectiveTimelineDays(r);
                      cell = (
                        <td key={col.key} style={rowTdSt}>
                          {val
                            ? val
                            : eff != null
                              ? <span style={{ color: "#94a3b8", fontStyle: "italic" }} title="From establishment category">{eff}</span>
                              : <span style={{ color: "#94a3b8" }}>—</span>}
                        </td>
                      );
                    }
                    else if (TRUNCATE_FIELDS.has(col.key)) {
                      cell = (
                        <td key={col.key}
                          style={{ ...rowTdWrapSt, maxWidth: col.width, minWidth: col.width }}
                          title={val || ""}>
                          <div style={clampSt}>
                            {val || <span style={{ color: "#94a3b8" }}>—</span>}
                          </div>
                        </td>
                      );
                    } else {
                      cell = (
                        <td key={col.key} style={rowTdSt}>
                          {val || <span style={{ color: "#94a3b8" }}>—</span>}
                        </td>
                      );
                    }

                    if (col.key === "status") {
                      const step = GMP_STEPS.find((s) => s.id === r.current_step);
                      return (
                        <React.Fragment key={col.key}>
                          {cell}
                          <td style={rowTdSt}>
                            <div style={{ display: "flex", justifyContent: "center" }}>
                              <StepProgress currentStep={r.current_step} appStatus={r.status} darkMode={darkMode} />
                            </div>
                          </td>
                          <td style={rowTdSt}>
                            {step ? (
                              <span style={{
                                fontSize: "0.68rem", fontWeight: 700, padding: "3px 9px",
                                borderRadius: 99, background: `${step.color}15`, color: step.color,
                                whiteSpace: "nowrap",
                              }}>
                                {step.icon} {step.label}
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>—</span>
                            )}
                          </td>
                        </React.Fragment>
                      );
                    }
                    return cell;
                  })}
                  {/* Actions */}
                  <td style={{
                    ...rowTdSt, padding: "9px 8px", textAlign: "center", verticalAlign: "middle",
                    width: 56, minWidth: 56, maxWidth: 56,
                    position: "sticky", right: 0,
                    boxShadow: darkMode ? "-4px 0 8px rgba(0,0,0,0.25)" : "-4px 0 8px rgba(15,23,42,0.05)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                      <ActionMenu record={r} colors={colors} darkMode={darkMode}
                        showDeck={topTab === "not_yet_decked" || r.is_decked === false}
                        onAction={(actionId, rec) => {
                          if (actionId === "deck")      { onDeck?.(rec);         return; }
                          if (actionId === "app_info")  { onOpenInfo?.(rec);     return; }
                          if (actionId === "app_log")   { onOpenLog(rec);        return; }
                          if (actionId === "audit_log") { onOpenAudit(rec);      return; }
                          if (actionId === "documents") { onOpenDocuments?.(rec);return; }
                          if (actionId === "doctrack")  { onOpenDoctrack?.(rec); return; }
                          if (actionId === "reassign")  { onOpenReassign?.(rec); return; }
                          if (actionId === "reroute")   { onOpenReroute?.(rec);  return; }
                        }} />
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      </div>  {/* end scrollable table */}
    </div>
  );
}
