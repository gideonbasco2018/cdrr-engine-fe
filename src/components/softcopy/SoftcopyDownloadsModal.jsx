// src/components/softcopy/SoftcopyDownloadsModal.jsx
// The download log: every Excel / PDF downloaded from the Softcopy page
// (transmittal files and Export). Who, when, file name, type, unit, number of
// letters and the DTNs inside. Search by file name, unit, name or DTN.
// Shared (softcopy_downloads table) once SOFTCOPY_DOWNLOADS_BACKEND is on;
// until then a test list in this browser.
import React, { useEffect, useState } from "react";
import { getSoftcopyDownloads, getSoftcopyLogFailures, SOFTCOPY_DOWNLOADS_BACKEND } from "../../api/softcopy";
import { FONT } from "../gmp/shared/constants";
import { frameOuter, frameCard, stop } from "./viewFrame";

const ACCENT = "#10b981";
const TYPE_COLORS = { pdf: "#ef4444", xlsx: "#16a34a" };

const fmt = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d) ? s : d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

// asView = shown as the page's Downloads tab (not a popup).
export default function SoftcopyDownloadsModal({ onClose, asView = false, colors, darkMode }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(() => new Set());   // rows showing their DTNs

  // Search waits until typing stops
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getSoftcopyDownloads(q);
        if (alive) setRows(res);
      } catch (err) {
        if (alive) setError(err?.response?.data?.detail ?? err?.message ?? "Could not load the downloads.");
      } finally {
        if (alive) setLoading(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  useEffect(() => {
    if (asView) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, asView]);

  const needle = q.trim();
  const dtnSearch = /^\d{4,}$/.test(needle);
  const toggle = (id) => setOpen((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const failures = getSoftcopyLogFailures();

  const th = {
    padding: "9px 10px", textAlign: "left", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.03em",
    textTransform: "uppercase", color: colors.textTertiary, background: colors.tableBg, whiteSpace: "nowrap",
    position: "sticky", top: 0, zIndex: 1, borderBottom: `1px solid ${colors.cardBorder}`,
  };
  const td = { padding: "9px 10px", fontSize: "0.76rem", color: colors.textSecondary, verticalAlign: "top", borderBottom: `1px solid ${colors.cardBorder}` };
  const chip = (c) => ({
    display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 700,
    color: c, background: `${c}14`, border: `1px solid ${c}55`, whiteSpace: "nowrap",
  });

  return (
    <div {...frameOuter(asView, onClose)}>
      <div
        onClick={stop}
        style={frameCard(asView, {
          background: darkMode ? "#18191a" : "#fff", borderRadius: 16, width: "100%", maxWidth: 1040, height: "86vh",
          display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        }, colors)}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${colors.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: colors.textPrimary }}>🧾 Downloads</h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.73rem", color: colors.textTertiary }}>
              Every Excel and PDF downloaded from this page: transmittal files and Export.
            </p>
          </div>
          {!asView && (
            <button
              onClick={onClose}
              title="Close"
              style={{ width: 30, height: 30, border: "none", borderRadius: 8, background: "transparent", color: colors.textTertiary, cursor: "pointer", fontSize: "1rem" }}
            >✕</button>
          )}
        </div>

        <div style={{ padding: "12px 22px", display: "flex", flexDirection: "column", gap: 8, borderBottom: `1px solid ${colors.cardBorder}` }}>
          {!SOFTCOPY_DOWNLOADS_BACKEND && (
            <p style={{
              margin: 0, padding: "7px 10px", borderRadius: 7, fontSize: "0.7rem", lineHeight: 1.45,
              background: darkMode ? "rgba(99,102,241,0.1)" : "#eef2ff", border: "1px solid #c7d2fe", color: darkMode ? "#c7d2fe" : "#4338ca",
            }}>
              🧪 Test list: only the downloads made in this browser. Once the table is set up, everyone sees everyone's downloads here.
            </p>
          )}
          {failures > 0 && (
            <p style={{ margin: 0, padding: "7px 10px", borderRadius: 7, fontSize: "0.7rem", background: "#fffbeb", border: "1px solid #fcd34d", color: "#b45309" }}>
              ⚠️ {failures} download{failures === 1 ? " wasn't" : "s weren't"} added to the list (no connection). The files themselves were downloaded.
            </p>
          )}
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a DTN, file name, unit or name"
            style={{
              width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: "0.8rem", fontFamily: FONT, borderRadius: 8,
              border: `1px solid ${colors.inputBorder}`, background: colors.inputBg, color: colors.textPrimary, outline: "none",
            }}
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          {error ? (
            <p style={{ margin: 22, fontSize: "0.76rem", color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: 7, border: "1px solid #fecaca" }}>
              ⚠️ {String(error)}
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
              <thead>
                <tr>
                  <th style={th}>When</th>
                  <th style={th}>Who</th>
                  <th style={th}>File</th>
                  <th style={th}>Type</th>
                  <th style={th}>Unit</th>
                  <th style={{ ...th, textAlign: "center" }}>Letters</th>
                  <th style={th}>DTNs</th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr><td colSpan={7} style={{ ...td, textAlign: "center", padding: 28, color: colors.textTertiary }}>Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} style={{ ...td, textAlign: "center", padding: 28, color: colors.textTertiary }}>
                    {needle ? "No downloads match." : "No downloads yet."}
                  </td></tr>
                ) : rows.map((d) => {
                  const shown = open.has(d.id) || (dtnSearch && d.dtns.some((x) => x.includes(needle)));
                  return (
                    <tr key={d.id}>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{fmt(d.downloaded_at)}</td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{d.downloaded_by || "—"}</td>
                      <td style={{ ...td, color: colors.textPrimary, overflowWrap: "anywhere" }}>
                        {d.file_name}
                        <div style={{ fontSize: "0.68rem", color: colors.textTertiary }}>{d.kind}</div>
                      </td>
                      <td style={td}><span style={chip(TYPE_COLORS[d.file_type] || "#64748b")}>{d.file_type === "pdf" ? "PDF" : "Excel"}</span></td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{d.unit || "All units"}</td>
                      <td style={{ ...td, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{d.letter_count}</td>
                      <td style={{ ...td, minWidth: 180 }}>
                        <button
                          type="button"
                          onClick={() => toggle(d.id)}
                          style={{ padding: 0, border: "none", background: "transparent", color: ACCENT, fontWeight: 600, fontFamily: FONT, fontSize: "0.74rem", cursor: "pointer" }}
                        >
                          {shown ? "Hide" : `Show ${d.dtns.length}`}
                        </button>
                        {shown && (
                          <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 1, fontFamily: "ui-monospace, Consolas, monospace", fontSize: "0.72rem" }}>
                            {d.dtns.map((x) => {
                              const hit = needle && x.includes(needle);
                              return (
                                <span key={x} style={hit ? { background: "#fde68a", color: "#78350f", borderRadius: 3, padding: "0 3px", alignSelf: "flex-start" } : undefined}>
                                  {x}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: "10px 22px", borderTop: `1px solid ${colors.cardBorder}`, fontSize: "0.72rem", color: colors.textTertiary }}>
          {rows.length} download{rows.length === 1 ? "" : "s"}{needle ? " found" : ""}
        </div>
      </div>
    </div>
  );
}
