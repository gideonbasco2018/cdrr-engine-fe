// src/components/gmp/queue/GMPApplicationInfoModal.jsx
// Full read-only view of a GMP record's fields — dense layout, single accent
// color throughout. Address fields wrap in full (no truncation). Remarks is
// a compact single-line bar with ellipsis + hover tooltip for long text.
import { useState, useEffect } from "react";
import { getGMPSiblings, reopenGMPRecord } from "../../../api/gmp";
import { FONT, GMP_STATUS_COLORS } from "../shared/constants";

const ACCENT = "#2196F3";

function cleanValue(v) {
  if (v === null || v === undefined || v === "" || v === "N/A") return null;
  return String(v);
}

function FieldRow({ label, value, colors, darkMode, wrap = false }) {
  const clean = cleanValue(value);
  return (
    <div style={{
      padding: "0.32rem 0.5rem",
      background: darkMode ? "rgba(255,255,255,0.025)" : "#ffffff",
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: 6,
      display: "flex", flexDirection: "column", gap: 1,
      minWidth: 0,
      gridColumn: wrap ? "1 / -1" : undefined, // full-width when it needs room to wrap
    }}>
      <span style={{
        fontSize: "0.52rem", fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.05em", color: colors.textTertiary,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {label}
      </span>
      <span style={{
        fontSize: "0.7rem", fontWeight: clean ? 600 : 400,
        color: clean ? colors.textPrimary : colors.textTertiary,
        fontStyle: clean ? "normal" : "italic",
        whiteSpace: wrap ? "normal" : "nowrap",
        overflow: wrap ? "visible" : "hidden",
        textOverflow: wrap ? "clip" : "ellipsis",
        lineHeight: wrap ? 1.4 : "normal",
        wordBreak: wrap ? "break-word" : "normal",
      }} title={!wrap ? (clean ?? undefined) : undefined}>
        {clean ?? "—"}
      </span>
    </div>
  );
}

// Related DTN is the one field on this otherwise-read-only view that stays
// actionable no matter how the record's task has already ended. Typing a
// follow-up DTN here and reopening calls reopenGMPRecord() on THIS SAME
// record — no new record/reference number is created. It records the
// Related DTN, clears the terminal status and issuance/certificate fields
// (the follow-up may resolve to a different issuance type, picked fresh at
// Decking), and opens a new Decking/IN PROGRESS log so the application is
// back in front of whoever decks it next.
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
        padding: "0.32rem 0.5rem", background: darkMode ? "rgba(255,255,255,0.025)" : "#ffffff",
        border: `1px solid ${ACCENT}`, borderRadius: 6,
        display: "flex", flexDirection: "column", gap: 3, minWidth: 0,
      }}>
        <span style={{ fontSize: "0.52rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.05em", color: colors.textTertiary }}>Reopen with Related DTN</span>
        <input autoFocus value={value} onChange={(e) => setValue(e.target.value)}
          placeholder="Enter follow-up DTN…" style={inp}
          onKeyDown={(e) => { if (e.key === "Enter") handleReopen(); if (e.key === "Escape") { setValue(""); setEditing(false); } }} />
        <p style={{ margin: 0, fontSize: "0.58rem", color: colors.textTertiary, lineHeight: 1.4 }}>
          Sends this same application back to Decking — no new reference number.
          Type of Issuance and certificate fields are cleared to be picked fresh.
        </p>
        <div style={{ display: "flex", gap: 5 }}>
          <button onClick={handleReopen} disabled={saving || !value.trim()} style={{
            flex: 1, padding: "0.2rem 0", fontSize: "0.62rem", fontWeight: 700,
            border: "none", borderRadius: 4, cursor: (saving || !value.trim()) ? "not-allowed" : "pointer",
            background: (saving || !value.trim()) ? `${ACCENT}80` : ACCENT, color: "#fff",
          }}>{saving ? "Reopening…" : "Reopen to Decking"}</button>
          <button onClick={() => { setValue(""); setEditing(false); setError(""); }} disabled={saving} style={{
            flex: "0 0 auto", padding: "0.2rem 0.6rem", fontSize: "0.62rem", fontWeight: 600,
            border: `1px solid ${colors.cardBorder}`, borderRadius: 4, cursor: "pointer",
            background: "transparent", color: colors.textSecondary,
          }}>Cancel</button>
        </div>
        {error && <span style={{ fontSize: "0.6rem", color: "#ef4444" }}>{error}</span>}
      </div>
    );
  }

  const clean = cleanValue(record.related_dtn);
  return (
    <div style={{
      padding: "0.32rem 0.5rem",
      background: reopened ? `${ACCENT}0c` : (darkMode ? "rgba(255,255,255,0.025)" : "#ffffff"),
      border: `1px solid ${reopened ? ACCENT : colors.cardBorder}`, borderRadius: 6,
      display: "flex", flexDirection: "column", gap: 1, minWidth: 0,
    }}>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
        <span style={{ fontSize: "0.52rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.05em", color: colors.textTertiary, whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis" }}>Related DTN</span>
        <button onClick={() => setEditing(true)} title="Reopen this application back to Decking" style={{
          border: "none", background: "transparent", color: ACCENT, cursor: "pointer",
          fontSize: "0.62rem", padding: 0, flexShrink: 0, fontWeight: 700,
        }}>🔁 Reopen</button>
      </span>
      {reopened ? (
        <span style={{ fontSize: "0.68rem", fontWeight: 600, color: ACCENT, lineHeight: 1.4 }}>
          ✓ Reopened — back at Decking, related to <span style={{ fontFamily: "ui-monospace,monospace" }}>{value || record.related_dtn}</span>
        </span>
      ) : (
        <span style={{
          fontSize: "0.7rem", fontWeight: clean ? 600 : 400,
          color: clean ? colors.textPrimary : colors.textTertiary,
          fontStyle: clean ? "normal" : "italic",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }} title={clean ?? undefined}>
          {clean ?? "—"}
        </span>
      )}
    </div>
  );
}

function Section({ icon, title, colors, darkMode, children, columns = 3 }) {
  return (
    <div style={{
      borderRadius: 9, overflow: "visible",
      border: `1px solid ${colors.cardBorder}`,
      background: darkMode ? "rgba(255,255,255,0.012)" : "#fbfcfd",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 10px",
        background: darkMode ? `${ACCENT}12` : `${ACCENT}08`,
        borderBottom: `1px solid ${colors.cardBorder}`,
        borderTopLeftRadius: 9, borderTopRightRadius: 9,
      }}>
        <span style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
          background: `${ACCENT}1f`, color: ACCENT,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.6rem",
        }}>
          {icon}
        </span>
        <h3 style={{
          margin: 0, fontSize: "0.63rem", fontWeight: 700,
          color: colors.textPrimary, textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          {title}
        </h3>
      </div>
      <div style={{
        padding: 7, display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 5,
        flex: 1, alignContent: "start",
      }}>
        {children}
      </div>
    </div>
  );
}

// Reference number / Certificate No. / Type of Issuance / Cert. Validity /
// SECPA No. for every sibling record added under this DTN via "Add Issuance"
// (see WorkflowModal.jsx's RefNoPanel "All" view — same data, same shape).
function AddedIssuancesTable({ rows, colors, darkMode }) {
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

  if (!record) return null;

  const statusColor = record.status
    ? (GMP_STATUS_COLORS[record.status.toUpperCase()] ?? { bg: "#f1f5f9", color: "#64748b" })
    : { bg: "#f1f5f9", color: "#64748b" };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
      backdropFilter: "blur(3px)", zIndex: 10000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      fontFamily: FONT,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: colors.cardBg, borderRadius: 14, width: "100%", maxWidth: 1280,
        height: "92vh", display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 24px 70px rgba(0,0,0,0.4)",
      }}>
        {/* Compact header */}
        <div style={{
          padding: "12px 18px", flexShrink: 0,
          background: darkMode ? `${ACCENT}12` : `${ACCENT}08`,
          borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, minWidth: 0, flexWrap: "wrap" }}>
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
                  margin: 0, fontSize: "0.86rem", fontWeight: 800, color: colors.textPrimary,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 280,
                }}>
                  {record.name_of_establishment || "Application Information"}
                </h2>
                <p style={{ margin: "1px 0 0", fontSize: "0.66rem", color: colors.textTertiary }}>
                  {record.category || "—"} · {record.transaction_type || "—"}
                </p>
              </div>
            </div>

            <div style={{ width: 1, height: 26, background: colors.cardBorder }} />
            <div>
              <div style={{ fontSize: "0.5rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.06em" }}>DTN</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: colors.textPrimary, fontFamily: "ui-monospace,monospace" }}>
                {record.dtn ?? "N/A"}
              </div>
            </div>

            <div style={{ width: 1, height: 26, background: colors.cardBorder }} />
            <div>
              <div style={{ fontSize: "0.5rem", fontWeight: 700, color: colors.textTertiary, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Status</div>
              <span style={{
                fontSize: "0.62rem", fontWeight: 700, padding: "2px 9px",
                borderRadius: 99, background: statusColor.bg, color: statusColor.color,
              }}>
                ● {record.status ?? "N/A"}
              </span>
            </div>

            {record.current_step && (
              <>
                <div style={{ width: 1, height: 26, background: colors.cardBorder }} />
                <div>
                  <div style={{ fontSize: "0.5rem", fontWeight: 700, color: colors.textTertiary, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Current Step</div>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: colors.textPrimary }}>{record.current_step}</span>
                </div>
              </>
            )}

            {record.lto_number && (
              <>
                <div style={{ width: 1, height: 26, background: colors.cardBorder }} />
                <div>
                  <div style={{ fontSize: "0.5rem", fontWeight: 700, color: colors.textTertiary, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>LTO Number</div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 600, color: colors.textPrimary }}>{record.lto_number}</div>
                </div>
              </>
            )}
          </div>

          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
            background: darkMode ? "rgba(255,255,255,0.05)" : "#fff",
            color: colors.textTertiary, cursor: "pointer", fontSize: "0.9rem", flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Grid body — every row auto-sizes to its content (the fixed-height
            "auto auto 44px" template this used to have assumed exactly 3
            rows; it silently broke — squeezing whatever landed in that 44px
            row — the moment a 4th, taller, conditionally-rendered row
            (Added Type of Issuance) was inserted before Remarks). Scrolls as
            a whole only if total content is taller than the modal's fixed
            height. */}
        <div style={{
          flex: 1, padding: 10, minHeight: 0, overflowY: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridAutoRows: "auto",
          gap: 8,
        }}>
          <Section icon="🏢" title="Establishment" colors={colors} darkMode={darkMode} columns={2}>
            <FieldRow label="Establishment" value={record.name_of_establishment} colors={colors} darkMode={darkMode} />
            <FieldRow label="LTO Number" value={record.lto_number} colors={colors} darkMode={darkMode} />
            <FieldRow label="Category" value={record.category} colors={colors} darkMode={darkMode} />
            <FieldRow label="Transaction Type" value={record.transaction_type} colors={colors} darkMode={darkMode} />
            <RelatedDtnRow record={record} colors={colors} darkMode={darkMode} onUpdated={onUpdated} />
            <FieldRow label="Address" value={record.address} colors={colors} darkMode={darkMode} wrap />
          </Section>

          <Section icon="🏭" title="Foreign Manufacturer" colors={colors} darkMode={darkMode} columns={1}>
            <FieldRow label="Foreign Manufacturer" value={record.foreign_manufacturer} colors={colors} darkMode={darkMode} />
            <FieldRow label="Manufacturer Address" value={record.foreign_manufacturer_address} colors={colors} darkMode={darkMode} wrap />
            <FieldRow label="Product Line" value={record.product_line} colors={colors} darkMode={darkMode} />
          </Section>

          <Section icon="📜" title="Certificate" colors={colors} darkMode={darkMode} columns={2}>
            <FieldRow label="SECPA Number" value={record.secpa_number} colors={colors} darkMode={darkMode} />
            <FieldRow label="Certificate No." value={record.certificate_number} colors={colors} darkMode={darkMode} />
            <FieldRow label="Type of Issuance" value={record.type_of_issuance} colors={colors} darkMode={darkMode} />
            <FieldRow label="Cert. Validity" value={record.certificate_validity} colors={colors} darkMode={darkMode} />
            <FieldRow label="Decision" value={record.decision} colors={colors} darkMode={darkMode} />
          </Section>

          {/* Added Type of Issuance — sibling records under this same DTN
              created via "Add Issuance" (WorkflowModal.jsx), each with its
              own reference number and certificate details. Placed right
              after Certificate (not at the bottom near Remarks) since it's
              an extension of the same certificate/issuance information.
              Omitted entirely when there are none, rather than showing an
              empty section. */}
          {addedIssuances.length > 0 && (
            <div style={{
              gridColumn: "1 / -1", borderRadius: 9, overflow: "visible",
              border: `1px solid ${colors.cardBorder}`,
              background: darkMode ? "rgba(255,255,255,0.012)" : "#fbfcfd",
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
                background: darkMode ? `${ACCENT}12` : `${ACCENT}08`,
                borderBottom: `1px solid ${colors.cardBorder}`,
                borderTopLeftRadius: 9, borderTopRightRadius: 9,
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  background: `${ACCENT}1f`, color: ACCENT,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem",
                }}>
                  📑
                </span>
                <h3 style={{
                  margin: 0, fontSize: "0.63rem", fontWeight: 700,
                  color: colors.textPrimary, textTransform: "uppercase", letterSpacing: "0.04em",
                }}>
                  Added Type of Issuance
                </h3>
                <span style={{
                  fontSize: "0.6rem", fontWeight: 700, padding: "1px 7px", borderRadius: 99,
                  background: `${ACCENT}15`, color: ACCENT,
                }}>
                  {addedIssuances.length}
                </span>
              </div>
              <div style={{ padding: 7 }}>
                <AddedIssuancesTable rows={addedIssuances} colors={colors} darkMode={darkMode} />
              </div>
            </div>
          )}

          <Section icon="📅" title="Dates & Timeline" colors={colors} darkMode={darkMode} columns={2}>
            <FieldRow label="Date Received" value={record.date_received} colors={colors} darkMode={darkMode} />
            <FieldRow label="Released Date" value={record.released_date} colors={colors} darkMode={darkMode} />
            <FieldRow label="Processed Time" value={record.processed_time} colors={colors} darkMode={darkMode} />
            <FieldRow label="End Date" value={record.end_date} colors={colors} darkMode={darkMode} />
            <FieldRow label="Timeline" value={record.timeline} colors={colors} darkMode={darkMode} />
            <FieldRow label="Date Printed" value={record.date_printed} colors={colors} darkMode={darkMode} />
            <FieldRow label="Compliance Docs Rcvd" value={record.compliance_docs_date_received} colors={colors} darkMode={darkMode} />
          </Section>

          <Section icon="📋" title="Notice of Deficiency" colors={colors} darkMode={darkMode} columns={1}>
            <FieldRow label="1st NOD" value={record.nod_date_1} colors={colors} darkMode={darkMode} />
            <FieldRow label="2nd NOD" value={record.nod_date_2} colors={colors} darkMode={darkMode} />
            <FieldRow label="3rd NOD" value={record.nod_date_3} colors={colors} darkMode={darkMode} />
            <FieldRow label="4th NOD" value={record.nod_date_4} colors={colors} darkMode={darkMode} />
            <FieldRow label="5th NOD" value={record.nod_date_5} colors={colors} darkMode={darkMode} />
          </Section>

          <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 8 }}>
            <Section icon="⚙️" title="Workflow" colors={colors} darkMode={darkMode} columns={2}>
              <FieldRow label="Current Step" value={record.current_step} colors={colors} darkMode={darkMode} />
              <FieldRow label="Evaluator" value={record.evaluator} colors={colors} darkMode={darkMode} />
            </Section>
            <Section icon="📤" title="Upload Metadata" colors={colors} darkMode={darkMode} columns={2}>
              <FieldRow label="Uploaded By" value={record.uploaded_by} colors={colors} darkMode={darkMode} />
              <FieldRow label="Upload Date" value={record.uploaded_date} colors={colors} darkMode={darkMode} />
            </Section>
          </div>

          {/* Remarks — single line, label + value side by side. Long text
              truncates with an ellipsis; hover shows the full remark via the
              title tooltip. */}
          <div style={{
            gridColumn: "1 / -1",
            borderRadius: 9,
            border: `1px solid ${colors.cardBorder}`,
            background: darkMode ? "rgba(255,255,255,0.012)" : "#fbfcfd",
            display: "flex", alignItems: "center", gap: 8,
            padding: "0 12px", height: 44,
          }}>
            <span style={{
              width: 18, height: 18, borderRadius: 5, flexShrink: 0,
              background: `${ACCENT}1f`, color: ACCENT,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem",
            }}>
              📝
            </span>
            <span style={{
              fontSize: "0.63rem", fontWeight: 700, color: colors.textTertiary,
              textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0,
            }}>
              Remarks
            </span>
            <span style={{
              fontSize: "0.74rem",
              color: cleanValue(record.remarks) ? colors.textPrimary : colors.textTertiary,
              fontStyle: cleanValue(record.remarks) ? "normal" : "italic",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              flex: 1, minWidth: 0,
            }} title={cleanValue(record.remarks) ?? undefined}>
              {cleanValue(record.remarks) ?? "No remarks recorded."}
            </span>
          </div>
        </div>

        {/* Slim footer */}
        <div style={{
          padding: "8px 18px", borderTop: `1px solid ${colors.cardBorder}`,
          display: "flex", justifyContent: "flex-end", flexShrink: 0,
          background: colors.cardBg,
        }}>
          <button onClick={onClose} style={{
            padding: "6px 18px", fontSize: "0.75rem", fontWeight: 600, fontFamily: FONT,
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