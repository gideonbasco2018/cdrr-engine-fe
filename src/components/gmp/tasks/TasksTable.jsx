// src/components/gmp/tasks/TasksTable.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { FONT, GMP_STATUS_COLORS, GMP_FIELD_ACCENTS } from "../shared/constants";
import StepProgress from "../shared/StepProgress";

const ACCENT = "#10b981";

// ── Column definitions — mirrors QueueTable.jsx exactly (widths, wrapping) ──
const GMP_COLUMNS = [
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
  { key: "remarks",                       label: "Remarks",                                   width: 260 },
  { key: "nod_date_1",                    label: "1st Date of NOD",                          width: 120 },
  { key: "nod_date_2",                    label: "2nd Date of NOD",                          width: 120 },
  { key: "nod_date_3",                    label: "3rd Date of NOD",                          width: 120 },
  { key: "nod_date_4",                    label: "4th Date of NOD",                          width: 120 },
  { key: "nod_date_5",                    label: "5th Date of NOD",                          width: 120 },
  { key: "date_printed",                  label: "Date Printed",                              width: 110 },
  { key: "compliance_docs_date_received", label: "Compliance / Additional Docs Date Received", width: 220 },
  { key: "product_line",                  label: "Product Line",                              width: 120 },
];

const TRUNCATE_FIELDS = new Set([
  "name_of_establishment", "address",
  "foreign_manufacturer", "foreign_manufacturer_address", "remarks",
]);

function SentByPill({ fullName, username, alias, colors }) {
  const displayName = (fullName && fullName.trim()) || username || "—";
  if (displayName === "—") return <span style={{ color: colors.textTertiary }}>—</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, lineHeight: 1.3, alignItems: "center" }}>
      <span style={{ fontSize: "0.74rem", fontWeight: 600, color: colors.textPrimary, whiteSpace: "nowrap" }}>
        {displayName}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
        {username && fullName && (
          <span style={{ fontSize: "0.66rem", color: colors.textTertiary }}>
            @{username}
          </span>
        )}
        {alias && (
          <span style={{
            fontSize: "0.6rem", fontWeight: 700, padding: "1px 6px",
            borderRadius: 99, background: "rgba(99,102,241,0.12)", color: "#6366f1",
            whiteSpace: "nowrap",
          }}>
            {alias}
          </span>
        )}
      </span>
    </div>
  );
}

function StatusBadge({ value }) {
  if (!value) return <span style={{ color: "#94a3b8" }}>—</span>;
  const s = GMP_STATUS_COLORS[value.toUpperCase()] ?? { bg: "#f1f5f9", color: "#64748b" };
  return (
    <span style={{
      fontSize: "0.63rem", fontWeight: 700, padding: "3px 9px",
      borderRadius: 99, background: s.bg, color: s.color, whiteSpace: "nowrap",
    }}>
      • {value}
    </span>
  );
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

// Category / Transaction Type — each field gets its own accent color (see
// GMP_FIELD_ACCENTS) so the same field reads as the same color in both the
// Tasks table and the Queue table.
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

// A DTN can carry several Type of Issuance values (one per sibling record
// added via Add Issuance) even though only the primary shows up as a task —
// list every one of them here instead of just the primary's own single type.
function IssuanceTypeChips({ values }) {
  if (!values || values.length === 0) return <span style={{ color: "#94a3b8" }}>—</span>;
  const { bg, color } = GMP_FIELD_ACCENTS.type_of_issuance;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
      {values.map((v) => (
        <span key={v} style={{
          fontSize: "0.68rem", fontWeight: 600, padding: "2px 8px", borderRadius: 6,
          background: bg, color, whiteSpace: "nowrap",
        }}>
          {v}
        </span>
      ))}
    </div>
  );
}

function ReferenceNoPill({ value }) {
  if (!value) return <span style={{ color: "#94a3b8" }}>—</span>;
  // Distinct purple accent from DTN's green — makes it visually obvious this
  // is the per-issuance identifier, not the (now non-unique) DTN itself.
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

function isWeekendDate(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}
function workingDaysUntil(deadlineStr) {
  if (!deadlineStr) return null;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(deadlineStr); end.setHours(0, 0, 0, 0);
  const forward = end > start;
  let count = 0;
  const d = new Date(forward ? start : end);
  const stop = forward ? end : start;
  while (d < stop) { d.setDate(d.getDate() + 1); if (!isWeekendDate(d)) count += 1; }
  return forward ? count : -count;
}
function ComplianceDeadlineBadge({ deadlineDate, colors }) {
  if (!deadlineDate) return <span style={{ color: "#94a3b8" }}>—</span>;
  const remaining = workingDaysUntil(deadlineDate);
  const status = remaining < 0
    ? { label: "Overdue", color: "#ef4444", bg: "rgba(239,68,68,0.1)" }
    : remaining <= 3
      ? { label: "Due Soon", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" }
      : { label: "On Track", color: "#10b981", bg: "rgba(16,185,129,0.1)" };
  const dateLabel = new Date(deadlineDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
      <span style={{ fontSize: "0.73rem", fontWeight: 700, color: colors.textPrimary }}>{dateLabel}</span>
      <span style={{
        fontSize: "0.62rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99,
        background: status.bg, color: status.color, whiteSpace: "nowrap",
      }}>
        {remaining < 0 ? `${Math.abs(remaining)}d overdue` : `${remaining}d left`}
      </span>
    </div>
  );
}

function SkeletonRows({ n = 6, darkMode, colCount }) {
  const base = darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  return (
    <>
      {[...Array(n)].map((_, i) => (
        <tr key={i}>
          {[...Array(colCount)].map((__, j) => (
            <td key={j} style={{ padding: "10px 12px" }}>
              <div style={{ height: 14, borderRadius: 4, background: base, width: "80%", margin: "0 auto" }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

const TASK_ACTION_ITEMS = [
  { id: "view_details", label: "View Details",         icon: "👁️" },
  { id: "app_logs",     label: "Application Logs",      icon: "📋" },
  { id: "change_log",   label: "Change Log",            icon: "🕐" },
  { id: "doctrack",     label: "View Doctrack Details", icon: "📄" },
];

function ActionMenu({ row, onAction, colors, darkMode }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const calcPos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuH = menuRef.current?.offsetHeight ?? 180;
    const menuW = menuRef.current?.offsetWidth  ?? 210;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top  = spaceBelow < menuH + 8 ? rect.top - menuH - 4 : rect.bottom + 4;
    let left = rect.right - menuW;
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
      <button ref={btnRef} onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} title="Actions"
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
            minWidth: 210, padding: "6px 0",
          }}>
          {TASK_ACTION_ITEMS.map((item) => (
            <button key={item.id}
              onClick={() => { setOpen(false); onAction(item.id, row); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "9px 16px", border: "none", background: "transparent",
                cursor: "pointer", textAlign: "left", fontFamily: FONT,
                fontSize: "0.82rem", fontWeight: 400,
                color: darkMode ? "#e2e8f0" : "#1e293b",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.06)" : "#f1f5f9"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <span style={{ width: 22, textAlign: "center", fontSize: "0.9rem", flexShrink: 0 }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

export default function TasksTable({
  rows, loading, selectedRows, onSelectRow, onSelectAll,
  onOpenLog, onOpenAudit, onAdvanceStep, onViewDoctrack,
  currentPage, rowsPerPage, colors, darkMode,
  readIds, onMarkAsRead, onToggleStar, onDoubleClickRow,
  isComplianceView = false,
}) {
  const thSt = {
    padding: "9px 12px", fontSize: "0.59rem", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.05em", color: colors.textTertiary,
    borderBottom: `1px solid ${colors.divider}`, whiteSpace: "nowrap",
    position: "sticky", top: 0, background: colors.cardBg, textAlign: "center", zIndex: 1,
  };
  const tdSt = {
    padding: "9px 12px", borderBottom: `1px solid ${colors.divider}`,
    fontSize: "0.76rem", color: colors.textPrimary, lineHeight: 1.35,
    whiteSpace: "normal", wordBreak: "break-word",
    textAlign: "center", verticalAlign: "middle",
  };
  const tdCompactSt = {
    padding: "9px 12px", borderBottom: `1px solid ${colors.divider}`,
    fontSize: "0.76rem", color: colors.textPrimary, lineHeight: 1,
    whiteSpace: "nowrap", textAlign: "center", verticalAlign: "middle",
  };
  const clampSt = {
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
  };

  const filteredIds = rows.map((r) => r.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedRows.includes(id));
  const colCount = GMP_COLUMNS.length + 3 + (isComplianceView ? 1 : 0); // checkbox + # + sentBy + [compliance deadline] + actions

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.76rem" }}>
        <thead>
          <tr>
            <th style={{ ...thSt, width: 40, position: "sticky", left: 0, zIndex: 2, background: colors.cardBg }}>
              <input type="checkbox" checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked, filteredIds)}
                style={{ cursor: "pointer" }} />
            </th>
            <th style={{ ...thSt, width: 34 }}>★</th>
            <th style={{ ...thSt, width: 42 }}>#</th>
            <th style={{ ...thSt, width: 190, minWidth: 190 }}>Sent By</th>
            {isComplianceView && (
              <th style={{ ...thSt, width: 140, minWidth: 140 }}>Compliance Deadline</th>
            )}
            {GMP_COLUMNS.map((col) => (
              <th key={col.key} style={{ ...thSt, width: col.width ?? "auto", minWidth: col.width ?? 100 }}>
                {col.label}
              </th>
            ))}
            <th style={{
              ...thSt, width: 56, position: "sticky", right: 0, zIndex: 2,
              background: colors.cardBg, boxShadow: "-4px 0 8px rgba(0,0,0,0.07)",
            }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows n={6} darkMode={darkMode} colCount={colCount} />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colCount}
                style={{ padding: "48px 24px", textAlign: "center", color: colors.textTertiary }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "2rem" }}>🎉</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 600, color: colors.textPrimary }}>
                    No tasks assigned
                  </span>
                  <span style={{ fontSize: "0.8rem" }}>You have no pending GMP tasks right now.</span>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((r, i) => {
              const isSel  = selectedRows.includes(r.id);
              const isRead = readIds ? readIds.has(r.id) : true;
              const rowBg = isSel
                ? (darkMode ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.06)")
                : "transparent";
              return (
                <tr key={r.id ?? i}
                  onClick={() => { if (onMarkAsRead && !isRead) onMarkAsRead(r.id); }}
                  onDoubleClick={() => onDoubleClickRow?.(r)}
                  style={{ cursor: onMarkAsRead ? "pointer" : "default", background: rowBg }}
                  onMouseEnter={(e) => {
                    if (!isSel) e.currentTarget.style.background =
                      darkMode ? "rgba(255,255,255,0.025)" : "rgba(16,185,129,0.035)";
                  }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}>
                  <td style={{ ...tdCompactSt, position: "sticky", left: 0, background: isSel ? rowBg : colors.cardBg }}>
                    <input type="checkbox" checked={isSel}
                      onChange={() => onSelectRow(r.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: "pointer" }} />
                  </td>
                  <td style={{ ...tdCompactSt, padding: "9px 4px" }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onToggleStar?.(r)}
                      title={r.is_starred ? "Unstar" : "Star"}
                      style={{
                        background: "transparent", border: "none", cursor: "pointer",
                        fontSize: "1rem", color: r.is_starred ? "#f59e0b" : colors.textTertiary,
                        padding: 0, lineHeight: 1,
                      }}>
                      {r.is_starred ? "★" : "☆"}
                    </button>
                  </td>
                  <td style={{ ...tdCompactSt, color: colors.textTertiary, fontSize: "0.7rem" }}>
                    {(currentPage - 1) * rowsPerPage + i + 1}
                  </td>
                  <td style={{ ...tdSt, width: 190, minWidth: 190, whiteSpace: "nowrap" }}>
                    <SentByPill fullName={r.sentByFullName} username={r.sentByUsername} alias={r.sentByAlias} colors={colors} />
                  </td>
                  {isComplianceView && (
                    <td style={{ ...tdSt, width: 140, minWidth: 140 }}>
                      <ComplianceDeadlineBadge deadlineDate={r.deadlineDate} colors={colors} />
                    </td>
                  )}
                  {GMP_COLUMNS.map((col) => {
                    const val = r[col.key];
                    if (col.key === "dtn") return <td key={col.key} style={tdSt}><DtnPill value={val} /></td>;
                    if (col.key === "type_of_issuance") return <td key={col.key} style={tdSt}><IssuanceTypeChips values={r.all_issuance_types} /></td>;
                    if (col.key === "category" || col.key === "transaction_type") return <td key={col.key} style={tdSt}><FieldChip value={val} field={col.key} /></td>;
                    if (col.isStatus) return <td key={col.key} style={tdSt}><StatusBadge value={val} /></td>;
                    if (TRUNCATE_FIELDS.has(col.key)) {
                      return (
                        <td key={col.key}
                          style={{ ...tdSt, maxWidth: col.width, minWidth: col.width }}
                          title={val || ""}>
                          <div style={clampSt}>
                            {val || <span style={{ color: "#94a3b8" }}>—</span>}
                          </div>
                        </td>
                      );
                    }
                    return (
                      <td key={col.key} style={tdSt}>
                        {val || <span style={{ color: "#94a3b8" }}>—</span>}
                      </td>
                    );
                  })}
                  <td style={{
                    ...tdCompactSt, padding: "9px 8px",
                    width: 56, minWidth: 56, maxWidth: 56,
                    position: "sticky", right: 0,
                    background: isSel ? rowBg : colors.cardBg,
                    boxShadow: "-4px 0 8px rgba(0,0,0,0.07)",
                  }}
                    onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                      <ActionMenu row={r} colors={colors} darkMode={darkMode}
                        onAction={(actionId, row) => {
                          if (actionId === "view_details") { onAdvanceStep(row); return; }
                          if (actionId === "app_logs")     { onOpenLog(row);     return; }
                          if (actionId === "change_log")   { onOpenAudit(row);   return; }
                          if (actionId === "doctrack")     { onViewDoctrack?.(row); return; }
                        }} />
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}