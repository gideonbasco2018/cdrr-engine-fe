// src/components/gmp/queue/UpdateAppInfoModal.jsx
// Lets FGMP Decker / IT edit a record's main info directly from the Queue's
// action menu, regardless of whose task it currently is or what step it's
// on — unlike WorkflowModal's own Details tab, which only opens with the
// task itself. Restricted at the call site (GMPQueuePage.jsx) via
// userInAllowedGroups(currentUser, ["FGMP Decker", "IT"]); this modal does
// not re-check permission itself.
//
// Structurally an exact mirror of GMPApplicationInfoModal.jsx — same header,
// same status-bar sizing (ported from CPR's ViewDetailsModal.jsx), same
// circular icon-badge accordion sections, same two-column layout and section
// paddings/margins — just as an EDIT form: every row is an input/textarea
// instead of static text. Deliberately scoped to the same "main info" fields
// as that read-only view — it never touches workflow state (GMP_CURRENT_STEP,
// GMP_APP_STATUS, logs, delegation), so it has no "Workflow & Upload" or
// "Added Type of Issuance" section (neither is editable here). Saves through
// the existing PUT /api/gmp/{id} (updateGMPRecord) — the same endpoint
// WorkflowModal's own Details tab already uses for its editable fields.
import { useState, useEffect, useLayoutEffect, useRef, createContext, useContext } from "react";
import { updateGMPRecord } from "../../../api/gmp";
import {
  FONT, GMP_CATEGORY_OPTIONS, GMP_TRANSACTION_TYPE_OPTIONS,
  GMP_TYPE_OF_ISSUANCE_APPROVED_OPTIONS, GMP_DISAPPROVED_TYPE_OF_ISSUANCE,
} from "../shared/constants";

// Same constrained option lists WorkflowModal.jsx's Step 1 (Details) uses for
// these three fields — imported from the shared constants file, not
// duplicated, so a value picked here can never fall outside what that screen
// itself would also offer. Category specifically drives the PIC/S (60
// working days) vs NON PIC/S (153 working days) timeline allotment, so this
// is the one that actually matters most.
const GMP_TYPE_OF_ISSUANCE_OPTIONS = [...GMP_TYPE_OF_ISSUANCE_APPROVED_OPTIONS, GMP_DISAPPROVED_TYPE_OF_ISSUANCE];

const ACCENT = "#d97706"; // amber — distinct from the blue Application Info view, reads as "editing," not "viewing"
const ICON_CIRCLE_BG = `${ACCENT}1f`;

function cleanValue(v) {
  return v === null || v === undefined || v === "N/A" ? "" : String(v);
}

/* ================================================================== */
/*  Accordion Section + Label:Input row — same shell/sizing as          */
/*  GMPApplicationInfoModal.jsx's AccordionSection/LVRow, but each row   */
/*  is an editable field instead of static text.                        */
/* ================================================================== */
const LabelWidthContext = createContext(null);

function AccordionSection({ icon, title, children, colors, defaultOpen = true, labelWidth = 110 }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      border: `1px solid ${colors.cardBorder}`, borderRadius: 9,
      marginBottom: 10, overflow: "hidden",
    }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{
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

function EditRow({ label, value, onChange, colors, darkMode, wide = false, fullWidth = false, type = "text", options = null }) {
  const labelWidth = useContext(LabelWidthContext);
  const textareaRef = useRef(null);

  // Auto-grow to fit content instead of scrolling inside a fixed box —
  // useLayoutEffect (not useEffect) so the height is set before the browser
  // paints, avoiding a one-frame flash at the old height when the modal
  // first opens with long pre-filled text (Manufacturer Address, Product
  // Line, etc.).
  useLayoutEffect(() => {
    if (!wide || !textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [wide, value]);

  const inputStyle = {
    width: "100%", padding: "0.32rem 0.5rem", fontFamily: FONT, fontSize: "0.74rem",
    border: `1px solid ${colors.inputBorder ?? colors.cardBorder}`, borderRadius: 5,
    background: darkMode ? "rgba(255,255,255,0.05)" : "#fff",
    color: colors.textPrimary, outline: "none", boxSizing: "border-box",
  };
  return (
    <div style={{
      display: "flex", fontSize: "0.72rem", gap: 6,
      alignItems: wide ? "flex-start" : "center",
      gridColumn: fullWidth ? "1 / -1" : undefined,
    }}>
      <span style={{
        flexShrink: 0, width: labelWidth ? `${labelWidth}px` : undefined,
        color: colors.textSecondary, whiteSpace: "nowrap", paddingTop: wide ? 6 : 0,
        textAlign: "right",
      }}>
        {label}
      </span>
      <span style={{ color: colors.textSecondary, flexShrink: 0, paddingTop: wide ? 6 : 0 }}>:</span>
      {options ? (
        // A blank/current value that isn't in the list (e.g. legacy data
        // predating this option list) still gets its own selectable entry —
        // never silently swapped for the first option in the dropdown.
        <select value={value} onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 0 }}>
          <option value="">— Select —</option>
          {value && !options.includes(value) && <option value={value}>{value}</option>}
          {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : wide ? (
        <textarea ref={textareaRef} rows={1} value={value} onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, resize: "none", overflow: "hidden", flex: 1, minWidth: 0 }} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
      )}
    </div>
  );
}

function EditGrid({ children }) {
  return (
    <div className="uaim-lv-grid" style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 6, columnGap: 14,
    }}>
      {children}
    </div>
  );
}

// camelCase record field (as shaped by mapGMPTask/the queue row) -> raw
// GMP_* column the PUT endpoint expects. Same fields, grouping, and order as
// GMPApplicationInfoModal.jsx's read-only sections (minus Added Type of
// Issuance and Workflow & Upload, neither editable here).
const FIELD_MAP = [
  { group: "Establishment", icon: "🏢", labelWidth: 100, fields: [
    ["name_of_establishment", "GMP_LTO_COMPANY", "Establishment", true],
    ["lto_number", "GMP_LTO_NUMBER", "LTO Number"],
    ["category", "GMP_EST_CATEGORY", "Category", false, null, GMP_CATEGORY_OPTIONS],
    ["transaction_type", "GMP_TRANSACTION_TYPE", "Transaction Type", true, null, GMP_TRANSACTION_TYPE_OPTIONS],
    ["related_dtn", "GMP_RELATED_DTN", "Related DTN", true],
    ["address", "GMP_LTO_ADDRESS", "Address", true, "wide"],
  ]},
  { group: "Foreign Manufacturer", icon: "🏭", labelWidth: 150, fields: [
    ["foreign_manufacturer", "GMP_FOREIGN_MANUFACTURER", "Foreign Manufacturer", true],
    ["foreign_manufacturer_address", "GMP_FOREIGN_MANUFACTURER_ADDRESS", "Manufacturer Address", true, "wide"],
    ["product_line", "GMP_PRODUCT_LINE", "Product Line", true, "wide"],
  ]},
  { group: "Certificate", icon: "📜", labelWidth: 110, fields: [
    ["secpa_number", "GMP_SECPA_NUMBER", "SECPA Number"],
    ["certificate_number", "GMP_CERTIFICATE_NUMBER", "Certificate No."],
    ["type_of_issuance", "GMP_TYPE_OF_ISSUANCE", "Type of Issuance", false, null, GMP_TYPE_OF_ISSUANCE_OPTIONS],
    ["certificate_validity", "GMP_CERTIFICATE_VALIDITY", "Cert. Validity"],
  ]},
  { group: "Remarks", icon: "📝", labelWidth: 80, fields: [
    ["remarks", "GMP_REMARKS", "Remarks", true, "wide"],
  ]},
  { group: "Dates & Timeline", icon: "📅", labelWidth: 150, fields: [
    ["date_received", "GMP_DATE_RECEIVED", "Date Received", false, "date"],
    ["released_date", "GMP_RELEASED_DATE", "Released Date", false, "date"],
    ["processed_time", "GMP_PROCESSED_TIME", "Processed Time"],
    ["end_date", "GMP_END_DATE", "End Date", false, "date"],
    ["timeline", "GMP_TIMELINE", "Timeline"],
    ["date_printed", "GMP_DATE_PRINTED", "Date Printed", false, "date"],
    ["compliance_docs_date_received", "GMP_COMPLIANCE_DOCS_DATE_RECEIVED", "Compliance Docs Rcvd", false, "date"],
  ]},
  { group: "Notice of Deficiency", icon: "📋", labelWidth: 70, fields: [
    ["nod_date_1", "GMP_NOD_DATE_1", "1st NOD", false, "date"],
    ["nod_date_2", "GMP_NOD_DATE_2", "2nd NOD", false, "date"],
    ["nod_date_3", "GMP_NOD_DATE_3", "3rd NOD", false, "date"],
    ["nod_date_4", "GMP_NOD_DATE_4", "4th NOD", false, "date"],
    ["nod_date_5", "GMP_NOD_DATE_5", "5th NOD", false, "date"],
  ]},
];
// Left column groups vs right column groups — mirrors GMPApplicationInfoModal's split.
const LEFT_GROUPS = ["Establishment", "Foreign Manufacturer", "Certificate", "Remarks"];
const RIGHT_GROUPS = ["Dates & Timeline", "Notice of Deficiency"];

function buildInitialValues(record) {
  const initial = {};
  if (!record) return initial;
  for (const { fields } of FIELD_MAP) {
    for (const [key] of fields) initial[key] = cleanValue(record[key]);
  }
  return initial;
}

export default function UpdateAppInfoModal({ record, onClose, onSaved, colors, darkMode }) {
  // Hydrated synchronously from `record` (not an empty {}) so the very first
  // render already matches the record — otherwise every field briefly
  // compares blank against the record's real, previously-saved values, which
  // made the Review button flash colored (a false "there are changes") for
  // one frame before the old useEffect-based hydration caught up and reset it.
  const [values, setValues] = useState(() => buildInitialValues(record));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!record) return;
    setValues(buildInitialValues(record));
    setError("");
    setReviewing(false);
    setPendingDiff([]);
    setPendingPayload(null);
  }, [record]);

  if (!record) return null;

  const onChange = (key, val) => setValues((p) => ({ ...p, [key]: val }));

  // Review-before-save — mirrors the Excel upload's "Check File" step (see
  // UploadModal.jsx: preview what changes, then a separate confirm commits
  // it). Only fields that actually changed ever appear here, so it also
  // doubles as a final check that nothing unintended got typed into a field.
  const [reviewing, setReviewing] = useState(false);
  const [pendingDiff, setPendingDiff] = useState([]);
  const [pendingPayload, setPendingPayload] = useState(null);

  // Recomputed every render (cheap — a couple dozen fields) so the Review
  // button's own fill color is the "are there changes" signal — no separate
  // "No changes to save" message needed.
  const computeDiff = () => {
    const diff = [];
    const payload = {};
    for (const { fields } of FIELD_MAP) {
      for (const [key, dbCol, label] of fields) {
        const original = cleanValue(record[key]);
        const next = values[key] ?? "";
        if (next !== original) {
          diff.push({ label, before: original || "(empty)", after: next || "(empty)" });
          payload[dbCol] = next === "" ? null : next;
        }
      }
    }
    return { diff, payload };
  };
  const hasChanges = computeDiff().diff.length > 0;

  const handleReview = () => {
    const { diff, payload } = computeDiff();
    if (diff.length === 0) return; // button is disabled in this case, but guard anyway
    setError("");
    setPendingDiff(diff);
    setPendingPayload(payload);
    setReviewing(true);
  };

  const handleBackToEdit = () => setReviewing(false);

  const handleConfirmSave = async () => {
    setSaving(true);
    setError("");
    try {
      await updateGMPRecord(record.id, pendingPayload);
      onSaved?.();
      // Nothing left to review once the save is confirmed — close outright
      // instead of dropping back to the edit form with just a small "Saved"
      // note, which read as if the save hadn't actually gone through.
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail ?? "Failed to save. Please try again.");
      setSaving(false);
    }
  };

  const renderGroup = ({ group, icon, labelWidth, fields }) => (
    <AccordionSection key={group} icon={icon} title={group} colors={colors} labelWidth={labelWidth}>
      <EditGrid>
        {fields.map(([key, , label, fullWidth, typeOrWide, options]) => (
          <EditRow key={key} label={label} value={values[key] ?? ""} onChange={(v) => onChange(key, v)}
            colors={colors} darkMode={darkMode} fullWidth={fullWidth} options={options}
            wide={typeOrWide === "wide"} type={typeOrWide === "date" ? "date" : "text"} />
        ))}
      </EditGrid>
    </AccordionSection>
  );

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
      backdropFilter: "blur(3px)", zIndex: 10000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      fontFamily: FONT,
    }}>
      <style>{`
        .uaim-two-col { display: flex; gap: 14px; align-items: flex-start; flex-wrap: nowrap; }
        .uaim-col-left, .uaim-col-right { min-width: 0; display: flex; flex-direction: column; }
        .uaim-col-left { flex: 1 1 58%; }
        .uaim-col-right { flex: 0 0 42%; }
        @media (max-width: 760px) {
          .uaim-two-col { flex-direction: column; }
          .uaim-col-left, .uaim-col-right { flex: 1 1 100%; width: 100%; }
          .uaim-lv-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: colors.cardBg, borderRadius: 14, width: "100%", maxWidth: 1100,
        maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 24px 70px rgba(0,0,0,0.4)",
      }}>
        {/* Header — mirrors GMPApplicationInfoModal.jsx exactly */}
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
              ✏️
            </span>
            <div style={{ minWidth: 0 }}>
              <h2 style={{
                margin: 0, fontSize: "0.9rem", fontWeight: 700, color: colors.textPrimary,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 460,
              }}>
                {record.name_of_establishment || "Update App Info"}
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
          {reviewing ? (
            /* Review — mirrors UploadModal.jsx's "Check File" preview: only
               fields that actually changed appear, each as before → after,
               so this doubles as a last check nothing unintended got typed
               in before it's actually written. */
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: colors.textPrimary }}>
                Review {pendingDiff.length} change{pendingDiff.length === 1 ? "" : "s"} before saving
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pendingDiff.map((d, i) => (
                  <div key={i} style={{
                    padding: "9px 12px", borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
                    background: colors.cardBg,
                  }}>
                    <div style={{ fontSize: "0.66rem", fontWeight: 700, color: colors.textSecondary, marginBottom: 5 }}>
                      {d.label}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.76rem", flexWrap: "wrap" }}>
                      <span style={{ color: "#ef4444", textDecoration: "line-through", opacity: 0.75, wordBreak: "break-word" }}>
                        {d.before}
                      </span>
                      <span style={{ color: colors.textTertiary }}>→</span>
                      <span style={{ color: "#15803d", fontWeight: 600, wordBreak: "break-word" }}>
                        {d.after}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Status bar — same sizing as GMPApplicationInfoModal.jsx's
                  StatBar (ported from CPR's ViewDetailsModal.jsx). DTN is
                  identifying, not editable here; a "Mode: Editing" tile
                  replaces the read-only view's Status/Aging pills so nothing
                  shown here goes stale while you type. */}
              <div style={{
                padding: "0.75rem 0.9rem", background: darkMode ? "rgba(255,255,255,0.02)" : colors.inputBg,
                border: `1px solid ${colors.cardBorder}`, borderRadius: 8,
                display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap", marginBottom: 16,
              }}>
                <div>
                  <div style={{ fontSize: "0.62rem", color: colors.textSecondary, marginBottom: "0.3rem" }}>DTN</div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: colors.textPrimary }}>{record.dtn ?? ""}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.62rem", color: colors.textSecondary, marginBottom: "0.3rem" }}>Mode</div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "0.3rem",
                    padding: "0.2rem 0.6rem", background: `${ACCENT}18`, color: ACCENT,
                    borderRadius: "999px", fontSize: "0.65rem", fontWeight: 700,
                  }}>
                    ✏️ Editing
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "0.68rem", color: colors.textTertiary, flex: 1, minWidth: 200 }}>
                  This edits the application's main info directly — it does not change its workflow
                  step, status, or logs. Only fields you actually change are saved.
                </p>
              </div>

              <div className="uaim-two-col">
                <div className="uaim-col-left">
                  {FIELD_MAP.filter((g) => LEFT_GROUPS.includes(g.group)).map(renderGroup)}
                </div>
                <div className="uaim-col-right">
                  {FIELD_MAP.filter((g) => RIGHT_GROUPS.includes(g.group)).map(renderGroup)}
                </div>
              </div>
            </>
          )}

          {error && (
            <p style={{
              margin: "8px 0 0", fontSize: "0.76rem", color: "#ef4444", background: "#fef2f2",
              padding: "8px 12px", borderRadius: 7, border: "1px solid #fecaca",
            }}>
              ⚠️ {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "10px 18px", borderTop: `1px solid ${colors.cardBorder}`,
          display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0,
          background: colors.cardBg,
        }}>
          <button onClick={reviewing ? handleBackToEdit : onClose} disabled={saving} style={{
            padding: "7px 20px", fontSize: "0.78rem", fontWeight: 600, fontFamily: FONT,
            borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
            background: "transparent", color: colors.textPrimary, cursor: "pointer",
          }}>
            {reviewing ? "← Back to Edit" : "Close"}
          </button>
          {(() => {
            // Colorless/disabled until there's something to review — the
            // button's own fill is the "are there changes" signal, no
            // separate "No changes to save" message needed.
            const isDisabled = saving || (!reviewing && !hasChanges);
            return (
              <button onClick={reviewing ? handleConfirmSave : handleReview} disabled={isDisabled} style={{
                padding: "7px 22px", fontSize: "0.78rem", fontWeight: 700, fontFamily: FONT,
                borderRadius: 8, border: "none",
                background: isDisabled ? (darkMode ? "#2a2b2c" : "#e2e8f0") : ACCENT,
                color: isDisabled ? colors.textTertiary : "#fff",
                cursor: isDisabled ? "not-allowed" : "pointer",
              }}>
                {saving
                  ? "Saving…"
                  : reviewing
                    ? `💾 Confirm & Save ${pendingDiff.length}`
                    : "🔍 Review Changes"}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
