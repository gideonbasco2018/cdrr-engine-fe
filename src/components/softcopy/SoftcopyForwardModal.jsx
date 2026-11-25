// src/components/softcopy/SoftcopyForwardModal.jsx
// Forward many letters to one unit in one go: one PDF + Excel.
// The page doesn't send email:
//   1. Who gets it: the destination.
//   2. Download the PDF + Excel (both with today's date).
//   3. The user sends the files their own way, then clicks "I sent it" →
//      the letters are marked forwarded.
//   4. Update FIS: a separate check view (SoftcopyDoctrackConfirm) lists the
//      DTNs and the remark; nothing goes to FIS until the user clicks Confirm.
// "Send to" starts on the destination that fits the selected letters' unit.
// Every selected row starts IN the list; rows get notes (forwardNotes) and the
// user can untick a row to leave it out.
import React, { useState, useMemo, useEffect } from "react";
import {
  FORWARD_TARGETS, forwardNotes, doctrackRemark, transmittalFileNames,
  downloadTransmittalFile, markSoftcopyForwarded, getSoftcopyConfig,
} from "../../api/softcopy";
import SoftcopyDoctrackConfirm from "./SoftcopyDoctrackConfirm";
import { FONT } from "../gmp/shared/constants";
import { frameOuter, frameCard, stop } from "./viewFrame";
import { useConfirm } from "./SoftcopyConfirm";

const ACCENT = "#10b981";
const TARGETS = Object.keys(FORWARD_TARGETS);

// The destination that fits the letters: a section match first (e.g. all
// CPR Reconstruction), then a unit match (e.g. all Licensing).
function guessTarget(letters) {
  if (!letters.length) return TARGETS[0];
  const bySection = TARGETS.find((t) => {
    const c = FORWARD_TARGETS[t];
    return c.section && letters.every((l) => l.sections?.includes(c.section));
  });
  if (bySection) return bySection;
  const byUnit = TARGETS.find((t) => {
    const c = FORWARD_TARGETS[t];
    return c.unit && !c.section && letters.every((l) => l.units?.includes(c.unit));
  });
  return byUnit || TARGETS[0];
}

// asView = shown as the page's Transmittal tab (letters left, steps right).
export default function SoftcopyForwardModal({ letters: picked, onClose, onSaved, asView = false, colors, darkMode }) {
  const [target, setTarget] = useState(() => guessTarget(picked));
  const [confirm, confirmBox] = useConfirm(colors, darkMode);
  const pickTarget = (t) => { setTarget(t); setFiles(null); };
  const [leftOut, setLeftOut] = useState(new Set()); // ids the user unticked
  // { pdf, xlsx }: each is the file name once that file was downloaded
  const [files, setFiles] = useState(null);
  const gotAny = Boolean(files?.pdf || files?.xlsx);
  const gotBoth = Boolean(files?.pdf && files?.xlsx);
  const [sent, setSent] = useState(false);           // "I sent it" saved (letters forwarded)
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("steps");         // "steps" | "fis" (the check view)
  const [fis, setFis] = useState(null);              // { inserted, failed, simulated, ticked }
  const [error, setError] = useState("");
  const [config, setConfig] = useState({ doctrack_enabled: false });
  useEffect(() => {
    let alive = true;
    getSoftcopyConfig().then((c) => alive && setConfig(c)).catch(() => {});
    return () => { alive = false; };
  }, []);

  const cfg = FORWARD_TARGETS[target];
  const inList = useMemo(() => picked.filter((l) => !leftOut.has(l.id)), [picked, leftOut]);
  const outList = useMemo(() => picked.filter((l) => leftOut.has(l.id)), [picked, leftOut]);
  const locked = sent; // list and destination are fixed once it's sent
  const names = transmittalFileNames(target);

  const toggle = (id) => {
    if (locked) return;
    setFiles(null); // the files no longer match the list
    setLeftOut((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Step 2: the PDF and the Excel, each with its own button, today's date
  const download = (kind) => {
    setError("");
    try {
      const name = downloadTransmittalFile(inList, target, kind);
      setFiles((prev) => ({ ...(prev || {}), [kind]: name }));
    } catch (err) {
      setError(err?.message ?? "Could not make the file.");
    }
  };
  // Step 3: the user sent the files on their own
  const markSent = async () => {
    setSaving(true);
    setError("");
    try {
      await markSoftcopyForwarded(inList.map((l) => l.id), target);
      setSent(true);
      onSaved?.();
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Could not mark the letters as forwarded.");
    } finally {
      setSaving(false);
    }
  };

  const close = async () => {
    if (saving) return;
    if (sent && !fis && !(await confirm({
      title: "FIS is not updated yet",
      message: "These letters are marked as sent, but FIS Doctrack doesn't show it yet. Leave anyway?",
      confirmLabel: "Leave anyway",
      cancelLabel: "Stay",
      danger: true,
    }))) return;
    onClose();
  };

  const muted = darkMode ? "rgba(255,255,255,0.03)" : "#f8fafc";
  const btn = (enabled, primary = false) => ({
    padding: "8px 16px", fontSize: "0.78rem", fontWeight: primary ? 700 : 600, fontFamily: FONT, borderRadius: 8,
    border: primary ? "none" : `1px solid ${colors.cardBorder}`,
    background: primary ? (enabled ? ACCENT : (darkMode ? "#2a2b2c" : "#e2e8f0")) : "transparent",
    color: primary ? (enabled ? "#fff" : colors.textTertiary) : (enabled ? colors.textSecondary : colors.textTertiary),
    cursor: enabled ? "pointer" : "not-allowed", whiteSpace: "nowrap",
  });
  const smallBtn = (enabled, outline = false) => ({
    height: 30, padding: "0 12px", fontSize: "0.74rem", fontWeight: 700, fontFamily: FONT, borderRadius: 7,
    border: outline ? `1px solid ${enabled ? ACCENT : colors.cardBorder}` : "none",
    background: outline ? "transparent" : (enabled ? ACCENT : (darkMode ? "#2a2b2c" : "#e2e8f0")),
    color: outline ? (enabled ? ACCENT : colors.textTertiary) : (enabled ? "#fff" : colors.textTertiary),
    cursor: enabled ? "pointer" : "not-allowed", whiteSpace: "nowrap", flex: "0 0 auto",
  });
  // Stepper: a dot per step joined by a thin line. state = "done" | "active" | "todo"
  const step = ({ n, state, title, last, action, children }) => {
    const dotBg = state === "done" ? ACCENT : state === "active" ? colors.textPrimary : "transparent";
    const dotBd = state === "todo" ? colors.cardBorder : dotBg;
    return (
      <div key={n} style={{ display: "flex", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto" }}>
          <span style={{
            width: 22, height: 22, borderRadius: 999, boxSizing: "border-box", display: "inline-flex", alignItems: "center",
            justifyContent: "center", fontSize: "0.68rem", fontWeight: 700, border: `1.5px solid ${dotBd}`, background: dotBg,
            boxShadow: state === "active" ? `0 0 0 4px ${darkMode ? "rgba(16,185,129,0.15)" : "#dcf5ec"}` : "none",
            color: state === "todo" ? colors.textTertiary : (darkMode && state === "active" ? "#18191a" : "#fff"),
          }}>{state === "done" ? "✓" : n}</span>
          {!last && (
            <span style={{ flex: 1, width: 1.5, minHeight: 14, margin: "4px 0", background: state === "done" ? ACCENT : colors.cardBorder }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 22, flexWrap: "wrap" }}>
            <span style={{
              flex: 1, minWidth: 120, fontSize: "0.8rem", fontWeight: 600,
              color: state === "todo" ? colors.textTertiary : colors.textPrimary,
            }}>{title}</span>
            {action}
          </div>
          {children && (
            <div style={{ marginTop: 4, fontSize: "0.72rem", lineHeight: 1.5, color: colors.textTertiary }}>{children}</div>
          )}
        </div>
      </div>
    );
  };
  const fileChip = (name, kind) => (
    <span key={name} title={name} style={{
      display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%", padding: "3px 9px", borderRadius: 6,
      background: kind === "pdf" ? (darkMode ? "rgba(239,68,68,0.08)" : "#fef6f6") : (darkMode ? "rgba(16,185,129,0.08)" : "#f0fbf6"),
      border: `1px solid ${kind === "pdf" ? (darkMode ? "rgba(239,68,68,0.3)" : "#fbdada") : (darkMode ? "rgba(16,185,129,0.3)" : "#cdeedf")}`,
      fontSize: "0.7rem", color: kind === "pdf" ? (darkMode ? "#fca5a5" : "#b91c1c") : (darkMode ? "#6ee7b7" : "#047857"),
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "0 0 auto" }}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" />
      </svg>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
    </span>
  );

  const letterRow = (l, included) => {
    const notes = forwardNotes(l, target);
    return (
      <label key={l.id} style={{
        display: "flex", gap: 8, alignItems: "flex-start", padding: "7px 10px",
        borderBottom: `1px solid ${included ? colors.cardBorder : "#fecaca"}`,
        cursor: locked ? "default" : "pointer",
      }}>
        <input type="checkbox" checked={included} disabled={locked} onChange={() => toggle(l.id)} style={{ marginTop: 2 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: "0.74rem", fontWeight: 600, color: included ? colors.textPrimary : "#7f1d1d" }}>
            DTN {l.dtn}{l.company_name ? ` · ${l.company_name}` : ""}
            <span style={{ fontWeight: 400, color: included ? colors.textTertiary : "#b91c1c" }}>
              {" "}· {l.app_type || "—"} · {l.units?.length ? l.units.join(" + ") : "no unit"}
            </span>
          </p>
          <p style={{ margin: 0, fontSize: "0.68rem", color: colors.textTertiary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {l.subject}
          </p>
          {!included && (
            <p style={{ margin: "2px 0 0", fontSize: "0.68rem", fontWeight: 600, color: "#b91c1c" }}>
              Left out: you unticked it{notes.length ? ` · ${notes.join(" · ")}` : ""}
            </p>
          )}
          {included && notes.length > 0 && (
            <p style={{ margin: "2px 0 0", fontSize: "0.68rem", color: "#b45309" }}>⚠️ {notes.join(" · ")}</p>
          )}
        </div>
      </label>
    );
  };

  // Step 1 content: where it goes.
  const recipientFields = (
    <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", gap: "8px 10px", alignItems: "center", marginTop: 4 }}>
      <span style={{ fontSize: "0.72rem", fontWeight: 600, color: colors.textSecondary }}>Send to</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <select
          value={target}
          disabled={locked}
          onChange={(e) => pickTarget(e.target.value)}
          style={{
            flex: 1, minWidth: 0, height: 32, padding: "0 8px", fontSize: "0.78rem", fontFamily: FONT, borderRadius: 7,
            border: `1px solid ${colors.inputBorder}`, background: colors.inputBg, color: colors.textPrimary,
            cursor: locked ? "default" : "pointer",
          }}
        >
          {TARGETS.map((t) => {
            const c = FORWARD_TARGETS[t];
            const where = c.section ? `${c.unit} · ${c.section}` : c.unit;
            return <option key={t} value={t}>{t}{where && where !== t ? ` (${where})` : ""}</option>;
          })}
        </select>
        {cfg.contact && <span style={{ fontSize: "0.7rem", color: colors.textTertiary, whiteSpace: "nowrap" }}>{cfg.contact}</span>}
      </div>
    </div>
  );

  // Popup: everything in one column. Tab: letters on the left, steps on the right.
  const col = { display: "flex", flexDirection: "column", gap: 14, minWidth: 0 };
  const layout = asView
    ? { display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(320px, 1fr)", gap: 20, alignItems: "start" }
    : col;

  return (
    <div {...frameOuter(asView, close)}>
      <div
        onClick={stop}
        style={frameCard(asView, {
          background: darkMode ? "#18191a" : "#fff", borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "90vh",
          display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        }, colors)}
      >
        {/* Header (in place of the table, the page shows its own top bar instead) */}
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${colors.cardBorder}`, display: asView ? "none" : "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: colors.textPrimary }}>📤 Make Transmittal</h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.73rem", color: colors.textTertiary }}>Forward the selected letters in one PDF + Excel</p>
          </div>
          {!asView && (
            <button onClick={close} disabled={saving} style={{
              width: 32, height: 32, borderRadius: 9, border: `1px solid ${colors.cardBorder}`,
              background: "transparent", color: colors.textTertiary, cursor: "pointer",
            }}>✕</button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: asView ? "14px 18px" : "18px 22px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flex: asView ? 1 : undefined, minHeight: 0 }}>
          {view === "fis" ? (
            <div style={asView ? { width: "100%", maxWidth: 760, margin: "0 auto" } : undefined}>
            <SoftcopyDoctrackConfirm
              letters={inList}
              target={target}
              doctrackEnabled={config.doctrack_enabled}
              onBack={() => setView("steps")}
              onDone={(res, ticked) => { setFis({ ...res, ticked }); setView("steps"); onSaved?.(); }}
              colors={colors}
              darkMode={darkMode}
            />
            </div>
          ) : (
            <div style={layout}>
              <div style={col}>
              {/* In the list */}
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "0.72rem", fontWeight: 700, color: "#15803d" }}>
                  ✅ In the list · {inList.length} {!locked && <span style={{ fontWeight: 400, color: colors.textTertiary }}>· untick a row to leave it out</span>}
                </p>
                <div style={{ maxHeight: asView ? "62vh" : 200, overflowY: "auto", borderRadius: 8, border: `1px solid ${colors.cardBorder}` }}>
                  {inList.length ? inList.map((l) => letterRow(l, true)) : (
                    <p style={{ margin: 0, padding: "10px", fontSize: "0.74rem", color: colors.textTertiary }}>Nothing in the list.</p>
                  )}
                </div>
              </div>

              {/* Left out */}
              {outList.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: "0.72rem", fontWeight: 700, color: "#b91c1c" }}>
                    ⚠️ Left out · {outList.length} {!locked && <span style={{ fontWeight: 400, color: colors.textTertiary }}>· tick to put it back</span>}
                  </p>
                  <div style={{ maxHeight: 140, overflowY: "auto", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2" }}>
                    {outList.map((l) => letterRow(l, false))}
                  </div>
                </div>
              )}
              </div>

              <div style={{ ...col, ...(asView ? { position: "sticky", top: 0 } : {}) }}>
              {/* Steps */}
              {inList.length > 0 && (
                <div style={{
                  padding: "16px 16px 14px", borderRadius: 12,
                  background: darkMode ? "rgba(16,185,129,0.05)" : "linear-gradient(180deg, #f3fbf8 0%, #fafdfc 100%)",
                  border: `1px solid ${darkMode ? "rgba(16,185,129,0.22)" : "#d5f0e6"}`,
                }}>
                  {step({
                    n: 1,
                    state: "done",
                    title: "Who gets it",
                    children: recipientFields,
                  })}
                  {step({
                    n: 2,
                    state: gotBoth ? "done" : "active",
                    title: "Download the PDF and Excel",
                    children: (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {["pdf", "xlsx"].map((kind) => {
                          const got = Boolean(files?.[kind]);
                          return (
                            <div key={kind} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                              <div style={{ flex: 1, minWidth: 0, display: "flex" }}>{fileChip(names[kind], kind)}</div>
                              {got && <span style={{ fontSize: "0.68rem", fontWeight: 700, color: ACCENT, whiteSpace: "nowrap" }}>✓ Saved</span>}
                              {!sent && (
                                <button onClick={() => download(kind)} style={smallBtn(true, got)}>
                                  {got ? "Again" : kind === "pdf" ? "⬇️ PDF" : "⬇️ Excel"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                        <span>{gotAny ? "Saved to your Downloads folder." : "Each file has today's date in the name; the PDF shows it on top."}</span>
                      </div>
                    ),
                  })}
                  {step({
                    n: 3,
                    state: sent ? "done" : gotAny ? "active" : "todo",
                    title: "Send the files",
                    action: !sent && (
                      <button onClick={markSent} disabled={!gotAny || saving} title={gotAny ? "" : "Download a file first"} style={smallBtn(gotAny && !saving)}>
                        {saving ? "Saving…" : "✓ I sent it"}
                      </button>
                    ),
                    children: sent
                      ? `Sent · ${inList.length} letter${inList.length === 1 ? "" : "s"} marked as forwarded to ${target}.`
                      : `Send the downloaded file${gotBoth ? "s" : ""} to ${target} your usual way, then click “I sent it”.`,
                  })}
                  {step({
                    n: 4,
                    last: true,
                    state: fis ? "done" : sent ? "active" : "todo",
                    title: "Update FIS Doctrack",
                    action: sent && !fis && (
                      <button onClick={() => setView("fis")} style={smallBtn(true)}>Check & update FIS</button>
                    ),
                    children: fis ? (
                      <div style={{ color: "#15803d" }}>
                        ✅ {fis.inserted} of {fis.ticked} DTN{fis.ticked === 1 ? "" : "s"} updated in FIS
                        {fis.simulated && <span style={{ color: "#4338ca" }}> (test: FIS not really updated)</span>}
                        {fis.failed.length > 0 && (
                          <div style={{ marginTop: 6, padding: "6px 10px", borderRadius: 7, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}>
                            <strong>{fis.failed.length} not updated in FIS:</strong>
                            {fis.failed.map((f) => <div key={f.rsn}>DTN {f.rsn} · {f.reason}</div>)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div>{sent ? "Check the DTN list and the remark, then confirm. Nothing is sent before that." : "After sending. You check the list first."}</div>
                        <div style={{
                          marginTop: 6, display: "inline-block", padding: "3px 9px", borderRadius: 6,
                          background: darkMode ? "rgba(99,102,241,0.08)" : "#f5f5ff", border: `1px solid ${darkMode ? "rgba(99,102,241,0.3)" : "#e2e3fb"}`,
                          color: darkMode ? "#c7d2fe" : "#4f46e5",
                        }}>
                          FIS remark: {cfg.code ? doctrackRemark(target) : `${doctrackRemark(target, "…")} (you type the code)`}
                        </div>
                      </>
                    ),
                  })}
                </div>
              )}

              {error && (
                <p style={{ margin: 0, fontSize: "0.76rem", color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: 7, border: "1px solid #fecaca" }}>
                  ⚠️ {String(error)}
                </p>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {view === "steps" && (
          <div style={{ padding: asView ? "8px 18px" : "14px 22px", borderTop: `1px solid ${colors.cardBorder}`, display: "flex", justifyContent: "flex-end", background: muted }}>
            <button onClick={close} disabled={saving} style={btn(!saving)}>
              {asView ? (fis ? "Done · back to letters" : "Back to letters") : fis ? "Done" : "Close"}
            </button>
          </div>
        )}
        {confirmBox}
      </div>
    </div>
  );
}
