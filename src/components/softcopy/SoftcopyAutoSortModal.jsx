// src/components/softcopy/SoftcopyAutoSortModal.jsx
// Auto-sort: suggests the unit(s) + section(s) of each letter from its type
// and subject (rules in autoSort.js). The user checks the list, unticks any
// wrong ones, and clicks Apply. Nothing changes until Apply.
//   ✔ Sure  = ticked by default (matched the old sorting ~96% of the time)
//   ? Check = NOT ticked by default; read the subject first
// Letters with no suggestion are listed so the user can sort them by hand.
// The unit(s) + section(s) of any row can be changed by clicking them (pencil);
// a changed row is ticked automatically and shows "edited".
import React, { useState, useMemo } from "react";
import { applySoftcopySort, UNITS, sectionsFor } from "../../api/softcopy";
import { suggestSort, whyNoSuggestion } from "./autoSort";
import { FONT } from "../gmp/shared/constants";
import { frameOuter, frameCard, stop, EASE } from "./viewFrame";

const ACCENT = "#10b981";

// asView = shown as the page's Auto-sort tab (not a popup): no ✕, the lists
// get the full height, and the footer offers "Sort more" instead of Close.
export default function SoftcopyAutoSortModal({ letters, scopeLabel, unitColors = {}, onClose, onSaved, asView = false, colors, darkMode }) {
  const rows = useMemo(
    () => letters.map((l) => ({ letter: l, s: suggestSort(l) })),
    [letters],
  );
  const suggested = rows.filter((r) => r.s);
  const none = rows.filter((r) => !r.s);

  // Ticked = will be applied. Sure ones start ticked.
  const [ticked, setTicked] = useState(() => new Set(suggested.filter((r) => r.s.sure).map((r) => r.letter.id)));
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");

  // The user's own unit/section choices: { [letterId]: { units, sections } }.
  const [edits, setEdits] = useState({});
  const [editing, setEditing] = useState(null);   // letter id whose editor is open
  const finalOf = (r) => edits[r.letter.id] || r.s;   // may be null (no suggestion, not set)
  const hasUnit = (r) => (finalOf(r)?.units?.length || 0) > 0;

  const setTick = (id, on) => setTicked((prev) => {
    if (prev.has(id) === on) return prev;
    const next = new Set(prev);
    on ? next.add(id) : next.delete(id);
    return next;
  });
  const changeSort = (r, units, sections) => {
    const keep = sectionsFor(units);
    const v = { units, sections: sections.filter((x) => keep.includes(x)) };
    setEdits((prev) => ({ ...prev, [r.letter.id]: v }));
    setTick(r.letter.id, units.length > 0);
  };
  const toggleUnit = (r, u) => {
    const cur = finalOf(r) || { units: [], sections: [] };
    const units = cur.units.includes(u) ? cur.units.filter((x) => x !== u) : [...cur.units, u];
    changeSort(r, UNITS.filter((x) => units.includes(x)), cur.sections);
  };
  const toggleSection = (r, sec) => {
    const cur = finalOf(r) || { units: [], sections: [] };
    const sections = cur.sections.includes(sec) ? cur.sections.filter((x) => x !== sec) : [...cur.sections, sec];
    changeSort(r, cur.units, sections);
  };
  // Opening the editor remembers the row as it was, so Cancel can put it back.
  const [before, setBefore] = useState(null);   // { edit, ticked }
  const openEditor = (id) => {
    setBefore({ edit: edits[id], ticked: ticked.has(id) });
    setEditing(id);
  };
  const cancelEdit = (r) => {
    const id = r.letter.id;
    if (before) {
      setEdits((prev) => {
        const next = { ...prev };
        if (before.edit) next[id] = before.edit; else delete next[id];
        return next;
      });
      setTick(id, before.ticked);
    }
    setBefore(null);
    setEditing(null);
  };
  const doneEdit = () => { setBefore(null); setEditing(null); };

  const toggle = (id) => setTicked((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  // Clicking a count card shows only that group; clicking it again shows all.
  const [view, setView] = useState("all");   // "all" | "sure" | "check" | "none"
  const shown = view === "sure" ? suggested.filter((r) => r.s.sure)
    : view === "check" ? suggested.filter((r) => !r.s.sure)
    : view === "none" ? []
    : suggested;
  const showNone = view === "all" || view === "none";

  // Tick all / Untick all = only the letters in the list being shown.
  const setAll = (on) => setTicked((prev) => {
    const next = new Set(prev);
    shown.forEach((r) => (on ? next.add(r.letter.id) : next.delete(r.letter.id)));
    return next;
  });

  const apply = async () => {
    setSaving(true);
    setError("");
    try {
      const items = rows
        .filter((r) => ticked.has(r.letter.id) && hasUnit(r))
        .map((r) => ({ id: r.letter.id, units: finalOf(r).units, sections: finalOf(r).sections }));
      const res = await applySoftcopySort(items);
      setDone(res.updated);
      onSaved?.();
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Could not apply.");
    } finally {
      setSaving(false);
    }
  };

  const chip = (text, c) => (
    <span key={text} style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 700,
      color: c, background: `${c}14`, border: `1px solid ${c}66`, whiteSpace: "nowrap",
    }}>{text}</span>
  );
  const btn = (enabled, primary = false) => ({
    padding: "8px 16px", fontSize: "0.78rem", fontWeight: primary ? 700 : 600, fontFamily: FONT, borderRadius: 8,
    border: primary ? "none" : `1px solid ${colors.cardBorder}`,
    background: primary ? (enabled ? ACCENT : (darkMode ? "#2a2b2c" : "#e2e8f0")) : "transparent",
    color: primary ? (enabled ? "#fff" : colors.textTertiary) : (enabled ? colors.textSecondary : colors.textTertiary),
    cursor: enabled ? "pointer" : "not-allowed",
  });
  const linkBtn = {
    padding: 0, border: "none", background: "transparent", color: ACCENT, fontSize: "0.72rem",
    fontWeight: 600, fontFamily: FONT, cursor: "pointer",
  };

  // Table look, same as the main Softcopy table: header row, column lines,
  // alternating row colors; ticked rows are tinted green.
  const th = {
    position: "sticky", top: 0, zIndex: 1, padding: "8px 10px", textAlign: "left",
    fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
    color: colors.textTertiary, background: colors.tableBg || (darkMode ? "#18191a" : "#fff"),
    borderBottom: `1px solid ${colors.cardBorder}`, whiteSpace: "nowrap",
  };
  const td = {
    padding: "8px 10px", fontSize: "0.74rem", color: colors.textSecondary, verticalAlign: "top",
    borderBottom: `1px solid ${colors.cardBorder}`, overflowWrap: "anywhere",
  };
  const zebra = (i) => (i % 2 ? (colors.tableRowAlt || (darkMode ? "rgba(255,255,255,0.025)" : "#f8fafc")) : (colors.tableBg || "transparent"));
  const mono = { fontFamily: "ui-monospace, Consolas, monospace", fontWeight: 700, color: colors.textPrimary, whiteSpace: "nowrap" };

  // Unit/section cell: chips + pencil; click to open the editor (unit
  // toggles, then the sections of the chosen units).
  const toggleChip = (text, c, on, onClick) => (
    <button
      key={text}
      type="button"
      onClick={onClick}
      style={{
        padding: "2px 8px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 700, fontFamily: FONT,
        whiteSpace: "nowrap", cursor: "pointer",
        color: on ? "#fff" : c, background: on ? c : "transparent", border: `1px solid ${on ? c : `${c}66`}`,
      }}
    >{on ? "\u2713 " : ""}{text}</button>
  );
  const sortCell = (r) => {
    const l = r.letter;
    const v = finalOf(r);
    const edited = Boolean(edits[l.id]);
    const open = editing === l.id && done == null;
    const now = (l.units?.length > 0) && (
      <div style={{ marginTop: 3, fontSize: "0.66rem", color: colors.textTertiary }}>now: {l.units.join(" + ")}</div>
    );
    if (open) {
      const secs = sectionsFor(v?.units || []);
      return (
        <td style={{ ...td, background: darkMode ? "rgba(99,102,241,0.08)" : "#eef2ff" }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: "0.62rem", fontWeight: 700, color: colors.textTertiary, textTransform: "uppercase", margin: "0 0 4px" }}>Unit</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {UNITS.map((u) => toggleChip(u, unitColors[u] || ACCENT, v?.units?.includes(u), () => toggleUnit(r, u)))}
          </div>
          {secs.length > 0 && (
            <>
              <div style={{ fontSize: "0.62rem", fontWeight: 700, color: colors.textTertiary, textTransform: "uppercase", margin: "8px 0 4px" }}>Section</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {secs.map((x) => toggleChip(x, "#6366f1", v?.sections?.includes(x), () => toggleSection(r, x)))}
              </div>
            </>
          )}
          <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
            <button
              type="button" onClick={() => cancelEdit(r)}
              style={{
                padding: "4px 12px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 600, fontFamily: FONT, cursor: "pointer",
                border: `1px solid ${colors.cardBorder}`, background: darkMode ? "transparent" : "#fff", color: colors.textSecondary,
              }}
            >Cancel</button>
            <button
              type="button" onClick={doneEdit}
              style={{
                padding: "4px 12px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700, fontFamily: FONT, cursor: "pointer",
                border: "none", background: ACCENT, color: "#fff",
              }}
            >Done</button>
          </div>
          {now}
        </td>
      );
    }
    return (
      <td
        style={{ ...td, cursor: done != null ? "default" : "pointer" }}
        title={done != null ? undefined : "Click to change the unit / section"}
        onClick={(e) => { if (done != null) return; e.stopPropagation(); if (editing && editing !== l.id) doneEdit(); openEditor(l.id); }}
      >
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          {v?.units?.length
            ? <>
                {v.units.map((u) => chip(u, unitColors[u] || ACCENT))}
                {v.sections.map((x) => chip(x, "#6366f1"))}
              </>
            : <span style={{ fontSize: "0.7rem", color: "#ef4444", fontWeight: 600 }}>Set unit</span>}
          {done == null && <span aria-hidden style={{ fontSize: "0.7rem", opacity: 0.6 }}>{"\u270F\uFE0F"}</span>}
          {edited && <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#6366f1", textTransform: "uppercase" }}>edited</span>}
        </div>
        {now}
      </td>
    );
  };

  // Match column: a colored badge (Sure / Check / Edited) + the reason.
  const BADGES = {
    sure: { text: "Sure", icon: "✔", c: "#15803d", bg: darkMode ? "rgba(34,197,94,0.14)" : "#dcfce7", bd: "#86efac" },
    check: { text: "Check", icon: "!", c: "#b45309", bg: darkMode ? "rgba(245,158,11,0.14)" : "#fef3c7", bd: "#fcd34d" },
    edited: { text: "Edited", icon: "✎", c: "#4f46e5", bg: darkMode ? "rgba(99,102,241,0.16)" : "#e0e7ff", bd: "#a5b4fc" },
  };
  const matchCell = (l, s) => {
    const edited = Boolean(edits[l.id]);
    const b = BADGES[edited ? "edited" : s.sure ? "sure" : "check"];
    return (
      <td style={{ ...td, verticalAlign: "top" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 9px 2px 3px", borderRadius: 999,
          background: b.bg, border: `1px solid ${b.bd}`, color: b.c, fontSize: "0.68rem", fontWeight: 700, whiteSpace: "nowrap",
        }}>
          <span style={{
            width: 15, height: 15, borderRadius: 999, background: b.c, color: "#fff", fontSize: "0.6rem",
            display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800,
          }}>{b.icon}</span>
          {b.text}
        </span>
        <div style={{
          marginTop: 5, fontSize: "0.7rem", lineHeight: 1.35, color: colors.textSecondary,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }} title={s.why}>
          {edited ? "Changed by you" : s.why}
        </div>
        {edited && (
          <div style={{ marginTop: 2, fontSize: "0.64rem", color: colors.textTertiary }}>
            was: {[...s.units, ...s.sections].join(" · ")}
          </div>
        )}
        {!edited && !s.sure && (
          <div style={{
            marginTop: 5, padding: "5px 7px", borderRadius: 6, fontSize: "0.66rem", lineHeight: 1.35,
            background: darkMode ? "rgba(245,158,11,0.08)" : "#fffbeb", borderLeft: "2px solid #f59e0b",
            color: darkMode ? "#fcd34d" : "#92400e",
          }}>
            <strong>Why not sure:</strong> {s.doubt || "This rule only sometimes matched the old sorting."} Read the subject first.
          </div>
        )}
      </td>
    );
  };

  const row = ({ letter: l, s }, i) => {
    const on = ticked.has(l.id);
    return (
      <tr
        key={l.id}
        onClick={() => done == null && toggle(l.id)}
        style={{
          cursor: done != null ? "default" : "pointer",
          background: on ? (darkMode ? "rgba(16,185,129,0.08)" : "#f0fdf4") : zebra(i),
          boxShadow: on ? `inset 3px 0 0 ${ACCENT}` : "none",
        }}
      >
        <td style={{ ...td, textAlign: "center", width: 34 }}>
          <input type="checkbox" checked={on} disabled={done != null} onClick={(e) => e.stopPropagation()} onChange={() => toggle(l.id)} style={{ margin: 0 }} />
        </td>
        <td style={{ ...td, ...mono, fontSize: "0.72rem" }}>{l.dtn}</td>
        <td style={{ ...td, color: colors.textTertiary, whiteSpace: "nowrap" }}>{l.app_type || "—"}</td>
        <td style={{ ...td, lineHeight: 1.4 }}>{l.subject || "—"}</td>
        {sortCell({ letter: l, s })}
        {matchCell(l, s)}
      </tr>
    );
  };

  const tickedCount = rows.filter((r) => ticked.has(r.letter.id) && hasUnit(r)).length;

  return (
    <div {...frameOuter(asView, saving ? undefined : onClose)}>
      <div
        onClick={stop}
        style={frameCard(asView, {
          background: darkMode ? "#18191a" : "#fff", borderRadius: 16, width: "100%", maxWidth: 980, maxHeight: "90vh",
          display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        }, colors)}
      >
        {/* Header (in place of the table, the page shows its own top bar instead) */}
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${colors.cardBorder}`, display: asView ? "none" : "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: colors.textPrimary }}>✨ Auto-sort</h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.73rem", color: colors.textTertiary }}>
              {scopeLabel} · suggested from the type and subject. Check, then Apply.
            </p>
          </div>
          {!asView && (
            <button onClick={onClose} disabled={saving} style={{
              width: 32, height: 32, borderRadius: 9, border: `1px solid ${colors.cardBorder}`,
              background: "transparent", color: colors.textTertiary, cursor: "pointer",
            }}>✕</button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: asView ? "14px 18px" : "16px 22px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: asView ? 1 : undefined, minHeight: 0 }}>
          {/* Counts */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              ["sure", suggested.filter((r) => r.s.sure).length, "sure", "#15803d", "#dcfce7", "#86efac"],
              ["check", suggested.filter((r) => !r.s.sure).length, "to check", "#b45309", "#fef3c7", "#fcd34d"],
              ["none", none.length, "no suggestion", colors.textTertiary, darkMode ? "rgba(255,255,255,0.03)" : "#f8fafc", colors.cardBorder],
            ].map(([key, n, label, c, bg, bd]) => {
              const active = view === key;
              const dimmed = view !== "all" && !active;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(active ? "all" : key)}
                  disabled={n === 0}
                  title={active ? "Show all" : `Show only the ${label} letters`}
                  style={{
                    flex: "1 1 120px", padding: "8px 12px", borderRadius: 9, background: bg, textAlign: "left",
                    border: `${active ? 2 : 1}px solid ${active ? c : bd}`, fontFamily: FONT,
                    boxShadow: active ? `0 0 0 3px ${c}22` : "none",
                    opacity: dimmed ? 0.5 : 1, cursor: n === 0 ? "default" : "pointer",
                    transition: `opacity 0.2s ${EASE}, box-shadow 0.2s ${EASE}, border-color 0.2s ${EASE}`,
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "1.05rem", color: c }}>{n}</p>
                  <p style={{ margin: 0, fontSize: "0.7rem", color: c }}>
                    {label}{active ? " · showing only these — click to show all" : ""}
                  </p>
                </button>
              );
            })}
          </div>

          {shown.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 4px" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: colors.textSecondary }}>
                  {view === "sure" ? "Sure only" : view === "check" ? "To check only" : "Suggestions"}
                  {" · "}{shown.filter((r) => ticked.has(r.letter.id)).length} of {shown.length} ticked
                </span>
                {done == null && (
                  <>
                    <button style={linkBtn} onClick={() => setAll(true)}>Tick all</button>
                    <button style={linkBtn} onClick={() => setAll(false)}>Untick all</button>
                  </>
                )}
              </div>
              <div style={{ maxHeight: asView ? "none" : 360, overflowY: "auto", borderRadius: 8, border: `1px solid ${colors.cardBorder}` }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, width: 34 }} />
                      <th style={th}>LTR DTN</th>
                      <th style={th}>Type of Letter</th>
                      <th style={th}>Subject</th>
                      <th style={{ ...th, minWidth: 130 }}>Unit / Section</th>
                      <th style={{ ...th, minWidth: 150 }}>Match</th>
                    </tr>
                  </thead>
                  <tbody>{shown.map(row)}</tbody>
                </table>
              </div>
            </div>
          )}

          {showNone && none.length > 0 && (
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "0.72rem", fontWeight: 700, color: colors.textSecondary }}>
                No suggestion · click "Set unit" to sort these by hand (usually general OD matters)
              </p>
              <div style={{ maxHeight: asView ? "none" : view === "none" ? 360 : 150, overflowY: "auto", borderRadius: 8, border: `1px solid ${colors.cardBorder}` }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, width: 34 }} />
                      <th style={th}>LTR DTN</th>
                      <th style={th}>Type of Letter</th>
                      <th style={th}>Subject</th>
                      <th style={{ ...th, minWidth: 130 }}>Unit / Section</th>
                      <th style={{ ...th, minWidth: 180 }}>Why no suggestion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {none.map((r, i) => {
                      const l = r.letter;
                      const on = ticked.has(l.id) && hasUnit(r);
                      return (
                      <tr key={l.id} style={{
                        background: on ? (darkMode ? "rgba(16,185,129,0.08)" : "#f0fdf4") : zebra(i),
                        boxShadow: on ? `inset 3px 0 0 ${ACCENT}` : "none",
                      }}>
                        <td style={{ ...td, textAlign: "center", width: 34 }}>
                          <input
                            type="checkbox" checked={on} disabled={done != null || !hasUnit(r)}
                            title={hasUnit(r) ? undefined : "Set a unit first"}
                            onChange={() => toggle(l.id)} style={{ margin: 0 }}
                          />
                        </td>
                        <td style={{ ...td, ...mono, fontSize: "0.72rem" }}>{l.dtn}</td>
                        <td style={{ ...td, color: colors.textTertiary, whiteSpace: "nowrap" }}>{l.app_type || "—"}</td>
                        <td style={{ ...td, lineHeight: 1.4 }}>{l.subject || "—"}</td>
                        {sortCell(r)}
                        <td style={{ ...td, verticalAlign: "top" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 9px 2px 3px", borderRadius: 999,
                            background: darkMode ? "rgba(148,163,184,0.14)" : "#f1f5f9", border: `1px solid ${darkMode ? "#475569" : "#cbd5e1"}`,
                            color: darkMode ? "#cbd5e1" : "#475569", fontSize: "0.68rem", fontWeight: 700, whiteSpace: "nowrap",
                          }}>
                            <span style={{
                              width: 15, height: 15, borderRadius: 999, background: darkMode ? "#64748b" : "#94a3b8", color: "#fff",
                              fontSize: "0.6rem", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800,
                            }}>?</span>
                            No match
                          </span>
                          {whyNoSuggestion(l).map((w) => (
                            <div key={w} style={{ marginTop: 5, fontSize: "0.7rem", lineHeight: 1.35, color: colors.textSecondary }}>{w}</div>
                          ))}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rows.length === 0 && (
            <p style={{ margin: 0, fontSize: "0.78rem", color: colors.textTertiary }}>No letters to sort.</p>
          )}

          {done != null && (
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "#dcfce7", border: "1px solid #86efac", color: "#15803d", fontSize: "0.82rem", fontWeight: 700 }}>
              ✅ {done} letter{done === 1 ? "" : "s"} sorted
            </div>
          )}
          {error && (
            <p style={{ margin: 0, fontSize: "0.76rem", color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: 7, border: "1px solid #fecaca" }}>
              ⚠️ {String(error)}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: asView ? "8px 18px" : "14px 22px", borderTop: `1px solid ${colors.cardBorder}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {/* Tab: after Apply, "Sort more" reloads the list (onClose = start again). */}
          {(!asView || done != null) && (
            <button onClick={onClose} disabled={saving} style={btn(!saving)}>
              {asView ? "Sort more" : done != null ? "Close" : "Cancel"}
            </button>
          )}
          {done == null && (
            <button onClick={apply} disabled={saving || tickedCount === 0} style={btn(!saving && tickedCount > 0, true)}>
              {saving ? "Applying…" : `Apply ${tickedCount}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
