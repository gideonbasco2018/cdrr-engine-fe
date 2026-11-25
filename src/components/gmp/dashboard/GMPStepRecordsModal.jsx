// src/components/gmp/dashboard/GMPStepRecordsModal.jsx
// The applications behind one step's number in "Applications by step".
// Opens when a step in the pipeline is clicked. It lists exactly the records
// that number counts (the server uses the same rule for both), oldest received
// first, so the ones that have waited longest are at the top.
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getGMPAnalyticsByStepRecords } from "../../../api/gmpAnalytics";
import { GMP_STEP_MAP } from "../shared/constants";
import { SkeletonBox, EmptyChart } from "./gmpAnalyticsShared";

const RED = "#c8384f";
const PAGE_SIZE = 15;

function daysSince(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr);
  if (Number.isNaN(then.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / 86_400_000));
}

export default function GMPStepRecordsModal({ step, year, month, ui, onClose }) {
  const meta = GMP_STEP_MAP[step];
  const color = meta?.color || "#0f8a72";

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getGMPAnalyticsByStepRecords({ step, year, month, page, page_size: PAGE_SIZE, search: search || undefined })
      .then((r) => { if (alive) setRes(r); })
      .catch(() => { if (alive) setError("Couldn't load these applications. Please try again."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [step, year, month, page, search]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cols = "minmax(150px, 1.3fr) minmax(170px, 2fr) 110px 110px minmax(120px, 1.2fr) 100px 90px";
  const th = { fontSize: "0.64rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: ui.textMuted };
  const rows = res?.data ?? [];
  const totalPages = res?.total_pages ?? 1;
  const scope = year === "All" ? "" : month === "All" ? ` · received in ${year}` : ` · received ${year}-${String(month).padStart(2, "0")}`;

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 11000, background: "rgba(8,12,10,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        role="dialog" aria-modal="true" aria-label={`Applications at ${meta?.label || step}`}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(1100px, 100%)", maxHeight: "88vh", display: "flex", flexDirection: "column", background: ui.cardBg, border: `1px solid ${ui.cardBorder}`, borderRadius: 14, boxShadow: "0 24px 60px rgba(0,0,0,0.35)", overflow: "hidden" }}
      >
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${ui.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", background: `${color}1f`, border: `1px solid ${color}55` }}>
              {meta?.icon || "📋"}
            </span>
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: ui.textPrimary }}>
                Open applications at {meta?.label || step}
              </div>
              <div style={{ fontSize: "0.72rem", color: ui.textMuted, marginTop: 2 }}>
                {res ? `${res.total.toLocaleString()} application${res.total === 1 ? "" : "s"}` : "Loading…"}{scope} · oldest received first
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search DTN or establishment…"
              aria-label="Search applications"
              style={{ height: 34, padding: "0 12px", borderRadius: 8, border: `1px solid ${ui.cardBorder}`, background: ui.inputBg, color: ui.textPrimary, fontSize: "0.78rem", outline: "none", width: 230 }}
            />
            <button type="button" onClick={onClose} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${ui.cardBorder}`, background: "transparent", color: ui.textSub, cursor: "pointer", fontSize: "1rem", lineHeight: 1 }}>✕</button>
          </div>
        </div>

        <div style={{ overflow: "auto", flex: 1 }}>
          <div style={{ minWidth: 900 }}>
            <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "10px 20px", background: ui.inputBg, position: "sticky", top: 0 }}>
              <span style={th}>DTN / Reference</span><span style={th}>Establishment</span><span style={th}>Status</span>
              <span style={th}>Received</span><span style={th}>Evaluator</span><span style={th}>Issuance</span>
              <span style={{ ...th, textAlign: "right" }}>Days since received</span>
            </div>
            {error && <div style={{ padding: 20, color: RED, fontSize: "0.8rem" }}>{error}</div>}
            {loading && !rows.length && <div style={{ padding: 20 }}><SkeletonBox height={140} ui={ui} /></div>}
            {!loading && !error && rows.length === 0 && <EmptyChart label="No applications match" ui={ui} />}
            {rows.map((r) => {
              const days = daysSince(r.date_received);
              return (
                <div key={r.gmp_id} style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "11px 20px", borderTop: `1px solid ${ui.divider}`, alignItems: "center", fontSize: "0.78rem", opacity: loading ? 0.55 : 1 }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 700, color: ui.textPrimary, fontVariantNumeric: "tabular-nums" }}>{r.dtn ?? "—"}</span>
                    {r.reference_no && r.reference_no !== r.dtn && (
                      <span style={{ display: "block", fontSize: "0.66rem", color: ui.textMuted, fontVariantNumeric: "tabular-nums" }}>{r.reference_no}</span>
                    )}
                  </span>
                  <span style={{ color: ui.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.company || ""}>{r.company || "—"}</span>
                  {/* A blank status on a record that is at a step means it is in progress. */}
                  <span style={{ color: ui.textSub }}>{r.status || "In progress"}</span>
                  <span style={{ color: r.date_received ? ui.textSub : ui.textMuted, fontVariantNumeric: "tabular-nums" }}>{r.date_received || "—"}</span>
                  <span style={{ color: ui.textSub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.evaluator || ""}>{r.evaluator || "—"}</span>
                  <span style={{ color: r.type_of_issuance ? ui.textSub : ui.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.type_of_issuance || ""}>{r.type_of_issuance || "—"}</span>
                  <span style={{ textAlign: "right", fontWeight: 700, color: ui.textPrimary, fontVariantNumeric: "tabular-nums" }}>{days != null ? `${days}d` : "—"}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "12px 20px", borderTop: `1px solid ${ui.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.74rem", color: ui.textMuted }}>
          <span>Page {page} of {totalPages}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${ui.cardBorder}`, background: "transparent", color: ui.textSub, cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1 }}>‹ Prev</button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${ui.cardBorder}`, background: "transparent", color: ui.textSub, cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.5 : 1 }}>Next ›</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
