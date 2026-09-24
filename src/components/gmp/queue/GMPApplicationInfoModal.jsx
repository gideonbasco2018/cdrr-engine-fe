// src/components/gmp/queue/GMPApplicationInfoModal.jsx
// Full read-only view of a GMP record's fields — redesigned to match CPR's
// ViewDetailsModal.jsx: a top status-bar row of key facts, then collapsible
// accordion sections (icon-circle + accent title + chevron) laid out in two
// columns, each holding inline label:value rows. Same GMP data as before —
// Address/Manufacturer Address/Product Line/Remarks still get full-width,
// multi-line treatment instead of truncating. Remarks unions the record's
// own GMP_REMARKS with every per-step application_remarks entry (see
// RemarksSection) — collapsed as a single-line ellipsis bar, expandable into
// a stacked list of "text" — step, date (username)" lines; kept as its own
// card (not a generic accordion section) since it has its own, different
// expand/collapse model.
import { useState, useEffect, createContext, useContext } from "react";
import { getGMPSiblings, reopenGMPRecord, getGMPLogs } from "../../../api/gmp";
import { FONT, GMP_STATUS_COLORS } from "../shared/constants";
import StatusTimelineBadge from "../shared/StatusTimelineBadge";

const ACCENT = "#2196F3";
const ICON_CIRCLE_BG = `${ACCENT}1f`;

function cleanValue(v) {
  if (v === null || v === undefined || v === "" || v === "N/A") return null;
  return String(v);
}

const fmtDT = (raw) => {
  if (!raw) return null;
  try {
    const d = new Date(raw);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } catch { return null; }
};

/* ================================================================== */
/*  Accordion Section + Label:Value row — mirrors CPR's ViewDetailsModal */
/* ================================================================== */
const LabelWidthContext = createContext(null);

function AccordionSection({ icon, title, children, colors, defaultOpen = true, labelWidth = 110, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      border: `1px solid ${colors.cardBorder}`, borderRadius: 9,
      marginBottom: 10, overflow: "hidden",
    }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", background: colors.cardBg,
        border: "none", borderBottom: open ? `1px solid ${colors.cardBorder}` : "none",
        cursor: "pointer", textAlign: "left",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{
            width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
            background: ICON_CIRCLE_BG, color: ACCENT,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem",
          }}>
            {icon}
          </span>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: ACCENT }}>
            {title}
          </span>
          {badge != null && (
            <span style={{
              fontSize: "0.6rem", fontWeight: 700, padding: "1px 7px", borderRadius: 99,
              background: `${ACCENT}15`, color: ACCENT,
            }}>
              {badge}
            </span>
          )}
        </span>
        <span style={{
          fontSize: "0.65rem", color: colors.textTertiary,
          transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s",
        }}>
          ▾
        </span>
      </button>
      {open && (
        <div style={{
          padding: "0.8rem 0.9rem", display: "flex", flexDirection: "column", gap: 8,
          background: colors.cardBg,
        }}>
          <LabelWidthContext.Provider value={labelWidth}>
            {children}
          </LabelWidthContext.Provider>
        </div>
      )}
    </div>
  );
}

function LVRow({ label, value, colors, wide = false, fullWidth = false, action }) {
  const clean = cleanValue(value);
  const labelWidth = useContext(LabelWidthContext);
  return (
    <div style={{
      display: "flex", fontSize: "0.72rem", gap: 6,
      alignItems: wide ? "flex-start" : "center",
      gridColumn: fullWidth ? "1 / -1" : undefined,
    }}>
      <span style={{
        flexShrink: 0, width: labelWidth ? `${labelWidth}px` : undefined,
        color: colors.textSecondary, whiteSpace: "nowrap",
      }}>
        {label}
      </span>
      <span style={{ color: colors.textSecondary, flexShrink: 0 }}>:</span>
      <span style={{
        color: clean ? colors.textPrimary : colors.textTertiary,
        fontWeight: 500,
        wordBreak: "break-word", whiteSpace: wide ? "pre-wrap" : "normal",
        flex: 1, minWidth: 0,
      }}>
        {clean ?? ""}
      </span>
      {action}
    </div>
  );
}

function LVGrid({ children }) {
  return (
    <div className="gaim-lv-grid" style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 6, columnGap: 14,
    }}>
      {children}
    </div>
  );
}

/* ================================================================== */
/*  Remarks — kept as its own card (distinct expand/collapse model from */
/*  the accordion sections above), unchanged from the previous design.  */
/* ================================================================== */
// Unions the two, otherwise-unrelated remarks sources for one record:
//   - the record's own standing GMP_REMARKS field (no author — it isn't
//     attributed to anyone in the schema)
//   - each workflow step's application_remarks (one per gmp_application_logs
//     row), attributed to whoever held that step
// Collapsed, it behaves like a single-line ellipsis bar. Expanded (only
// offered once there's more than one entry to show), it stacks every remark
// as its own line: "text" — step, date (username).
function RemarksSection({ recordRemark, stepRemarks, colors, darkMode }) {
  const [expanded, setExpanded] = useState(false);
  const cleanRecordRemark = recordRemark && recordRemark !== "N/A" ? String(recordRemark) : null;
  const entries = [
    ...(cleanRecordRemark ? [{ text: cleanRecordRemark, username: null, isRecordLevel: true }] : []),
    ...stepRemarks,
  ];
  const hasAny = entries.length > 0;
  const isExpandable = entries.length > 1;
  const previewText = hasAny ? entries[0].text : "No remarks recorded.";

  return (
    <div style={{
      borderRadius: 9, border: `1px solid ${colors.cardBorder}`,
      background: darkMode ? "rgba(255,255,255,0.012)" : "#fbfcfd", padding: "0 12px",
    }}>
      <div onClick={() => isExpandable && setExpanded((p) => !p)} style={{
        display: "flex", alignItems: "center", gap: 8, height: 44,
        cursor: isExpandable ? "pointer" : "default",
      }}>
        <span style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
          background: `${ACCENT}1f`, color: ACCENT,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem",
        }}>
          📝
        </span>
        <span style={{
          fontSize: "0.63rem", fontWeight: 700, color: colors.textPrimary,
          textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0,
        }}>
          Remarks{entries.length > 1 ? ` (${entries.length})` : ""}
        </span>
        {!expanded && isExpandable && (
          <span style={{
            fontSize: "0.74rem",
            color: hasAny ? colors.textPrimary : colors.textTertiary,
            fontStyle: hasAny ? "normal" : "italic",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            flex: 1, minWidth: 0,
          }} title={hasAny ? previewText : undefined}>
            {previewText}
          </span>
        )}
        {!expanded && !isExpandable && !hasAny && (
          <span style={{ fontSize: "0.74rem", fontStyle: "italic", color: colors.textTertiary, flex: 1 }}>
            No remarks recorded.
          </span>
        )}
        {isExpandable && (
          <span style={{
            fontSize: "0.6rem", color: colors.textTertiary, flexShrink: 0, marginLeft: "auto",
            transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s",
          }}>
            ▾
          </span>
        )}
      </div>
      {(expanded || (!isExpandable && hasAny)) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: "0 12px 10px 40px" }}>
          {entries.map((e, i) => {
            const dateStr = fmtDT(e.date);
            const metaText = e.isRecordLevel
              ? "General Remarks"
              : [e.step, dateStr, e.username ? `(${e.username})` : null].filter(Boolean).join(" ");
            return (
              <p key={i} style={{
                margin: 0, fontSize: "0.72rem", lineHeight: 1.6, wordBreak: "break-word",
                paddingBottom: 9,
                borderBottom: i < entries.length - 1 ? `1px dashed ${colors.cardBorder}` : "none",
              }}>
                <span style={{ fontStyle: "italic", color: colors.textPrimary }}>"{e.text}"</span>
                {metaText && (
                  <span style={{ color: colors.textTertiary, fontWeight: 600 }}> — {metaText}</span>
                )}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Related DTN — the one field on this otherwise-read-only view that   */
/*  stays actionable. Restyled to sit inline as an LVRow, editing state  */
/*  still its own small card.                                            */
/* ================================================================== */
function RelatedDtnRow({ record, colors, darkMode, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    setEditing(false); setValue(""); setError(""); setReopened(false);
  }, [record.id]);

  const inp = {
    width: "100%", padding: "0.25rem 0.4rem", fontFamily: FONT, fontSize: "0.7rem",
    border: `1px solid ${colors.inputBorder}`, borderRadius: 4,
    background: darkMode ? "rgba(255,255,255,0.06)" : "#fff",
    color: colors.textPrimary, outline: "none", boxSizing: "border-box",
  };

  const handleReopen = async () => {
    const dtn = value.trim();
    if (!dtn) return;
    setSaving(true); setError("");
    try {
      await reopenGMPRecord(record.id, dtn);
      setReopened(true);
      setEditing(false);
      onUpdated?.();
    } catch (e) {
      setError(e?.response?.data?.detail ?? e?.message ?? "Failed to reopen.");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div style={{
        gridColumn: "1 / -1", padding: "6px 8px",
        background: darkMode ? "rgba(255,255,255,0.025)" : "#ffffff",
        border: `1px solid ${ACCENT}`, borderRadius: 6,
        display: "flex", flexDirection: "column", gap: 4, minWidth: 0,
      }}>
        <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.05em", color: colors.textTertiary }}>Reopen with Related DTN</span>
        <input autoFocus value={value} onChange={(e) => setValue(e.target.value)}
          placeholder="Enter follow-up DTN…" style={inp}
          onKeyDown={(e) => { if (e.key === "Enter") handleReopen(); if (e.key === "Escape") { setValue(""); setEditing(false); } }} />
        <p style={{ margin: 0, fontSize: "0.6rem", color: colors.textTertiary, lineHeight: 1.4 }}>
          Sends this same application back to Decking — no new reference number.
          Type of Issuance and certificate fields are cleared to be picked fresh.
        </p>
        <div style={{ display: "flex", gap: 5 }}>
          <button onClick={handleReopen} disabled={saving || !value.trim()} style={{
            flex: 1, padding: "3px 0", fontSize: "0.66rem", fontWeight: 700,
            border: "none", borderRadius: 4, cursor: (saving || !value.trim()) ? "not-allowed" : "pointer",
            background: (saving || !value.trim()) ? `${ACCENT}80` : ACCENT, color: "#fff",
          }}>{saving ? "Reopening…" : "Reopen to Decking"}</button>
          <button onClick={() => { setValue(""); setEditing(false); setError(""); }} disabled={saving} style={{
            flex: "0 0 auto", padding: "3px 10px", fontSize: "0.66rem", fontWeight: 600,
            border: `1px solid ${colors.cardBorder}`, borderRadius: 4, cursor: "pointer",
            background: "transparent", color: colors.textSecondary,
          }}>Cancel</button>
        </div>
        {error && <span style={{ fontSize: "0.62rem", color: "#ef4444" }}>{error}</span>}
      </div>
    );
  }

  return (
    <LVRow
      label="Related DTN"
      value={reopened ? (value || record.related_dtn) : record.related_dtn}
      colors={colors}
      fullWidth
      action={
        reopened ? (
          <span style={{ fontSize: "0.66rem", fontWeight: 700, color: ACCENT, flexShrink: 0 }}>✓ Reopened</span>
        ) : (
          <button onClick={() => setEditing(true)} title="Reopen this application back to Decking" style={{
            border: "none", background: "transparent", color: ACCENT, cursor: "pointer",
            fontSize: "0.66rem", padding: 0, flexShrink: 0, fontWeight: 700, marginLeft: "auto",
          }}>🔁 Reopen</button>
        )
      }
    />
  );
}

// Reference number / Certificate No. / Type of Issuance / Cert. Validity /
// SECPA No. for every sibling record added under this DTN via "Add Issuance"
// (see WorkflowModal.jsx's RefNoPanel "All" view — same data, same shape).
function AddedIssuancesTable({ rows, colors }) {
  const cols = ["Reference No", "Type of Issuance", "Certificate No.", "Cert. Validity", "SECPA No."];
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.7rem" }}>
        <thead>
          <tr>
            {cols.map((h) => (
              <th key={h} style={{
                padding: "5px 8px", textAlign: "left", fontSize: "0.56rem",
                fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
                color: colors.textTertiary, borderBottom: `1px solid ${colors.cardBorder}`,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.GMP_ID}>
              <td style={{ padding: "6px 8px", fontFamily: "ui-monospace,monospace", fontWeight: 700, color: "#a855f7" }}>
                {s.GMP_REFERENCE_NO || "—"}
              </td>
              <td style={{ padding: "6px 8px", color: colors.textPrimary }}>{s.GMP_TYPE_OF_ISSUANCE || "—"}</td>
              <td style={{ padding: "6px 8px", color: colors.textPrimary }}>{s.GMP_CERTIFICATE_NUMBER || "—"}</td>
              <td style={{ padding: "6px 8px", color: colors.textPrimary }}>{s.GMP_CERTIFICATE_VALIDITY || "—"}</td>
              <td style={{ padding: "6px 8px", color: colors.textPrimary }}>{s.GMP_SECPA_NUMBER || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================== */
/*  Status bar — top row of key facts, mirrors CPR's ViewDetailsModal   */
/* ================================================================== */
function StatBar({ record, colors, darkMode }) {
  const statusColor = record.status
    ? (GMP_STATUS_COLORS[record.status.toUpperCase()] ?? { bg: "#f1f5f9", color: "#64748b" })
    : { bg: "#f1f5f9", color: "#64748b" };

  const Tile = ({ label, children }) => (
    <div>
      <div style={{ fontSize: "0.62rem", color: colors.textSecondary, marginBottom: "0.3rem" }}>{label}</div>
      {children}
    </div>
  );
  const Plain = ({ value }) => (
    <div style={{ fontSize: "0.78rem", fontWeight: value ? 700 : 400, color: value ? colors.textPrimary : colors.textTertiary }}>
      {value ?? ""}
    </div>
  );

  return (
    <div style={{
      padding: "0.75rem 0.9rem", background: darkMode ? "rgba(255,255,255,0.02)" : colors.inputBg,
      border: `1px solid ${colors.cardBorder}`, borderRadius: 8,
      display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap", marginBottom: 16,
    }}>
      <Tile label="DTN"><Plain value={record.dtn} /></Tile>
      <Tile label="Status">
        <span style={{
          display: "inline-flex", alignItems: "center", gap: "0.3rem",
          padding: "0.2rem 0.6rem", background: statusColor.bg, color: statusColor.color,
          borderRadius: "999px", fontSize: "0.65rem", fontWeight: "700",
        }}>
          {record.status ? `● ${record.status}` : ""}
        </span>
      </Tile>
      {record.current_step && <Tile label="Current Step"><Plain value={record.current_step} /></Tile>}
      {record.lto_number && <Tile label="LTO Number"><Plain value={record.lto_number} /></Tile>}
      {record.category && <Tile label="Category"><Plain value={record.category} /></Tile>}
      {record.transaction_type && <Tile label="Transaction Type"><Plain value={record.transaction_type} /></Tile>}
      <Tile label="Aging"><StatusTimelineBadge row={record} /></Tile>
    </div>
  );
}

export default function GMPApplicationInfoModal({ record, onClose, onUpdated, colors, darkMode }) {
  // Siblings = other Type of Issuance records added under the same DTN via
  // "Add Issuance" (WorkflowModal.jsx) — this modal only ever receives the
  // primary record as `record`, so those never showed up here before.
  const [addedIssuances, setAddedIssuances] = useState([]);

  useEffect(() => {
    if (!record?.id) { setAddedIssuances([]); return; }
    let cancelled = false;
    getGMPSiblings(record.id)
      .then((siblings) => {
        if (cancelled) return;
        setAddedIssuances((siblings ?? []).filter((s) => s.GMP_ID !== record.id));
      })
      .catch(() => { if (!cancelled) setAddedIssuances([]); });
    return () => { cancelled = true; };
  }, [record?.id]);

  // Per-step remarks (gmp_application_logs.application_remarks) — fetched
  // here so the Remarks card can union them with the record's own GMP_REMARKS
  // field instead of only showing the latter.
  const [stepRemarks, setStepRemarks] = useState([]);

  useEffect(() => {
    if (!record?.id) { setStepRemarks([]); return; }
    let cancelled = false;
    getGMPLogs(record.id, { page: 1, page_size: 100 })
      .then((data) => {
        if (cancelled) return;
        const logs = Array.isArray(data) ? data : (data.data ?? []);
        setStepRemarks(
          logs
            .filter((l) => l.application_remarks && l.application_remarks !== "N/A")
            .map((l) => ({
              text: l.application_remarks,
              username: l.assignee_username || l.user_name || null,
              step: l.application_step || null,
              // accomplished_date is when the log closed — the moment this
              // remark was actually typed in and submitted.
              date: l.accomplished_date || null,
            }))
        );
      })
      .catch(() => { if (!cancelled) setStepRemarks([]); });
    return () => { cancelled = true; };
  }, [record?.id]);

  if (!record) return null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
      backdropFilter: "blur(3px)", zIndex: 10000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      fontFamily: FONT,
    }}>
      <style>{`
        .gaim-two-col { display: flex; gap: 14px; align-items: flex-start; flex-wrap: nowrap; }
        .gaim-col-left, .gaim-col-right { min-width: 0; display: flex; flex-direction: column; }
        .gaim-col-left { flex: 1 1 58%; }
        .gaim-col-right { flex: 0 0 42%; }
        @media (max-width: 760px) {
          .gaim-two-col { flex-direction: column; }
          .gaim-col-left, .gaim-col-right { flex: 1 1 100%; width: 100%; }
          .gaim-lv-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: colors.cardBg, borderRadius: 14, width: "100%", maxWidth: 1100,
        maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 24px 70px rgba(0,0,0,0.4)",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 20px", flexShrink: 0,
          borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            <span style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: `${ACCENT}18`, color: ACCENT,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem",
            }}>
              🔎
            </span>
            <div style={{ minWidth: 0 }}>
              <h2 style={{
                margin: 0, fontSize: "0.9rem", fontWeight: 700, color: colors.textPrimary,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 460,
              }}>
                {record.name_of_establishment || "Application Information"}
              </h2>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 6, border: "none",
            background: "transparent", color: colors.textSecondary, cursor: "pointer", fontSize: "1rem", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = colors.badgeBg; e.currentTarget.style.color = colors.textPrimary; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = colors.textSecondary; }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 20px" }}>
          <StatBar record={record} colors={colors} darkMode={darkMode} />

          <div className="gaim-two-col">
            <div className="gaim-col-left">
              <AccordionSection icon="🏢" title="Establishment" colors={colors} darkMode={darkMode} labelWidth={100}>
                <LVGrid>
                  <LVRow label="Establishment" value={record.name_of_establishment} colors={colors} fullWidth />
                  <LVRow label="LTO Number" value={record.lto_number} colors={colors} />
                  <LVRow label="Category" value={record.category} colors={colors} />
                  <LVRow label="Transaction Type" value={record.transaction_type} colors={colors} fullWidth />
                  <RelatedDtnRow record={record} colors={colors} darkMode={darkMode} onUpdated={onUpdated} />
                  <LVRow label="Address" value={record.address} colors={colors} wide fullWidth />
                </LVGrid>
              </AccordionSection>

              <AccordionSection icon="🏭" title="Foreign Manufacturer" colors={colors} darkMode={darkMode} labelWidth={150}>
                <LVRow label="Foreign Manufacturer" value={record.foreign_manufacturer} colors={colors} />
                <LVRow label="Manufacturer Address" value={record.foreign_manufacturer_address} colors={colors} wide />
                <LVRow label="Product Line" value={record.product_line} colors={colors} wide />
              </AccordionSection>

              <AccordionSection icon="📜" title="Certificate" colors={colors} darkMode={darkMode} labelWidth={110}>
                <LVGrid>
                  <LVRow label="SECPA Number" value={record.secpa_number} colors={colors} />
                  <LVRow label="Certificate No." value={record.certificate_number} colors={colors} />
                  <LVRow label="Type of Issuance" value={record.type_of_issuance} colors={colors} />
                  <LVRow label="Cert. Validity" value={record.certificate_validity} colors={colors} />
                  <LVRow label="Decision" value={record.decision} colors={colors} fullWidth />
                </LVGrid>
              </AccordionSection>

              {/* Added Type of Issuance — sibling records under this same DTN
                  created via "Add Issuance" (WorkflowModal.jsx). Omitted
                  entirely when there are none, rather than showing an empty
                  section. */}
              {addedIssuances.length > 0 && (
                <AccordionSection icon="📑" title="Added Type of Issuance" colors={colors} darkMode={darkMode} badge={addedIssuances.length}>
                  <AddedIssuancesTable rows={addedIssuances} colors={colors} />
                </AccordionSection>
              )}

              {/* Remarks — unions the record's own GMP_REMARKS with every
                  per-step application_remarks entry. */}
              <RemarksSection
                recordRemark={record.remarks}
                stepRemarks={stepRemarks}
                colors={colors}
                darkMode={darkMode}
              />
            </div>

            <div className="gaim-col-right">
              <AccordionSection icon="📅" title="Dates & Timeline" colors={colors} darkMode={darkMode} labelWidth={150}>
                <LVRow label="Date Received" value={record.date_received} colors={colors} />
                <LVRow label="Released Date" value={record.released_date} colors={colors} />
                <LVRow label="Processed Time" value={record.processed_time} colors={colors} />
                <LVRow label="End Date" value={record.end_date} colors={colors} />
                <LVRow label="Timeline" value={record.timeline} colors={colors} />
                <LVRow label="Date Printed" value={record.date_printed} colors={colors} />
                <LVRow label="Compliance Docs Rcvd" value={record.compliance_docs_date_received} colors={colors} />
              </AccordionSection>

              <AccordionSection icon="📋" title="Notice of Deficiency" colors={colors} darkMode={darkMode} labelWidth={70}>
                <LVRow label="1st NOD" value={record.nod_date_1} colors={colors} />
                <LVRow label="2nd NOD" value={record.nod_date_2} colors={colors} />
                <LVRow label="3rd NOD" value={record.nod_date_3} colors={colors} />
                <LVRow label="4th NOD" value={record.nod_date_4} colors={colors} />
                <LVRow label="5th NOD" value={record.nod_date_5} colors={colors} />
              </AccordionSection>

              <AccordionSection icon="⚙️" title="Workflow & Upload" colors={colors} darkMode={darkMode} labelWidth={100}>
                <LVRow label="Current Step" value={record.current_step} colors={colors} />
                <LVRow label="Evaluator" value={record.evaluator} colors={colors} />
                <LVRow label="Uploaded By" value={record.uploaded_by} colors={colors} />
                <LVRow label="Upload Date" value={record.uploaded_date} colors={colors} />
              </AccordionSection>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "10px 18px", borderTop: `1px solid ${colors.cardBorder}`,
          display: "flex", justifyContent: "flex-end", flexShrink: 0,
          background: colors.cardBg,
        }}>
          <button onClick={onClose} style={{
            padding: "7px 20px", fontSize: "0.78rem", fontWeight: 600, fontFamily: FONT,
            borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
            background: "transparent", color: colors.textPrimary, cursor: "pointer",
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
