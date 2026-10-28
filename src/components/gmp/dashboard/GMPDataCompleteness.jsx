// src/components/gmp/dashboard/GMPDataCompleteness.jsx
// FGMP's version of CPR's Data Completeness (monitoring/analytics/AnalyticsView):
// how many records have the fields they should. Same three checks so both
// systems read the same:
//   Date Received    — always expected
//   Released Date    — expected once the record is RELEASED / COMPLETED
//   Type of Issuance — expected once RELEASED / COMPLETED, or a release date exists
// It checks that the data is PRESENT, not that it is correct. Click a red
// number to see (and go fix) the records behind it.
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { getGMPAnalyticsDataQuality, getGMPAnalyticsQualityRecords } from "../../../api/gmpAnalytics";
import { SkeletonBox, EmptyChart } from "./gmpAnalyticsShared";

const ACCENT = "#0f8a72";
const AMBER = "#b9740f";
const RED = "#c8384f";
const PAGE_SIZE = 15;

const completenessColor = (p) => (p >= 95 ? ACCENT : p >= 80 ? AMBER : RED);
const pct = (num, den) => (den > 0 ? (num / den) * 100 : 100);

const ISSUE_LABELS = {
  incomplete: "Incomplete records",
  missing_received: "Missing Date Received",
  missing_released: "Missing Released Date",
  missing_doc: "Missing Type of Issuance",
};

// ── Records behind one cell ─────────────────────────────────────────────────
function RecordsModal({ year, issue, ui, onClose }) {
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
    setLoading(true);
    setError(null);
    getGMPAnalyticsQualityRecords({ year, issue, page, page_size: PAGE_SIZE, search: search || undefined })
      .then(setRes)
      .catch(() => setError("Couldn't load these records. Please try again."))
      .finally(() => setLoading(false));
  }, [year, issue, page, search]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cols = "150px minmax(160px, 2fr) 110px 120px 100px 100px 140px minmax(130px, 1.2fr)";
  const th = { fontSize: "0.64rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: ui.textMuted };
  const rows = res?.data ?? [];
  const totalPages = res?.total_pages ?? 1;

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 11000, background: "rgba(8,12,10,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        role="dialog" aria-modal="true" aria-label={ISSUE_LABELS[issue]}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(1180px, 100%)", maxHeight: "88vh", display: "flex", flexDirection: "column", background: ui.cardBg, border: `1px solid ${ui.cardBorder}`, borderRadius: 14, boxShadow: "0 24px 60px rgba(0,0,0,0.35)", overflow: "hidden" }}
      >
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${ui.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: ui.textPrimary }}>
              {ISSUE_LABELS[issue]}{year === "all" ? "" : ` — ${year}`}
            </div>
            <div style={{ fontSize: "0.72rem", color: ui.textMuted, marginTop: 2 }}>
              {res ? `${res.total.toLocaleString()} record${res.total === 1 ? "" : "s"}` : "Loading…"} · to fix one: FGMP Queue → row actions → Update App Info
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search DTN or establishment…"
              aria-label="Search records"
              style={{ height: 34, padding: "0 12px", borderRadius: 8, border: `1px solid ${ui.cardBorder}`, background: ui.inputBg, color: ui.textPrimary, fontSize: "0.78rem", outline: "none", width: 230 }}
            />
            <button type="button" onClick={onClose} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${ui.cardBorder}`, background: "transparent", color: ui.textSub, cursor: "pointer", fontSize: "1rem", lineHeight: 1 }}>✕</button>
          </div>
        </div>

        <div style={{ overflow: "auto", flex: 1 }}>
          <div style={{ minWidth: 980 }}>
            <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "10px 20px", background: ui.inputBg, position: "sticky", top: 0 }}>
              <span style={th}>DTN</span><span style={th}>Establishment</span><span style={th}>Status</span><span style={th}>Current step</span>
              <span style={th}>Received</span><span style={th}>Released</span><span style={th}>Type of issuance</span><span style={th}>Missing</span>
            </div>
            {error && <div style={{ padding: 20, color: RED, fontSize: "0.8rem" }}>{error}</div>}
            {loading && !rows.length && <div style={{ padding: 20 }}><SkeletonBox height={140} ui={ui} /></div>}
            {!loading && !error && rows.length === 0 && <EmptyChart label="No records match" ui={ui} />}
            {rows.map((r) => (
              <div key={r.gmp_id} style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "11px 20px", borderTop: `1px solid ${ui.divider}`, alignItems: "center", fontSize: "0.78rem", opacity: loading ? 0.55 : 1 }}>
                <span style={{ fontWeight: 700, color: ui.textPrimary, fontVariantNumeric: "tabular-nums" }}>{r.dtn ?? "—"}</span>
                <span style={{ color: ui.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.company || ""}>{r.company || "—"}</span>
                <span style={{ color: ui.textSub }}>{r.status || "—"}</span>
                <span style={{ color: ui.textSub }}>{r.current_step || "—"}</span>
                <span style={{ color: r.date_received ? ui.textSub : RED, fontVariantNumeric: "tabular-nums" }}>{r.date_received || "missing"}</span>
                <span style={{ color: ui.textSub, fontVariantNumeric: "tabular-nums" }}>{r.released_date || "—"}</span>
                <span style={{ color: r.type_of_issuance ? ui.textSub : ui.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.type_of_issuance || "—"}</span>
                <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {r.missing.map((m) => (
                    <span key={m} style={{ padding: "2px 8px", borderRadius: 99, fontSize: "0.64rem", fontWeight: 700, background: `${RED}18`, color: RED, whiteSpace: "nowrap" }}>{m}</span>
                  ))}
                </span>
              </div>
            ))}
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

// ── The card ────────────────────────────────────────────────────────────────
export default function GMPDataCompleteness({ ui }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNote, setShowNote] = useState(false);
  const [open, setOpen] = useState(null); // { year, issue }

  useEffect(() => {
    setLoading(true);
    getGMPAnalyticsDataQuality()
      .then((res) => setRows(res.data || []))
      .catch(() => setError("Couldn't load data completeness."))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => rows.reduce((a, r) => ({
    total: a.total + r.total, complete: a.complete + r.complete, incomplete: a.incomplete + r.incomplete,
    received_filled: a.received_filled + r.received_filled, missing_received: a.missing_received + r.missing_received,
    release_expected: a.release_expected + r.release_expected, released_filled: a.released_filled + r.released_filled,
    missing_released: a.missing_released + r.missing_released,
    doc_expected: a.doc_expected + r.doc_expected, doc_filled: a.doc_filled + r.doc_filled, missing_doc: a.missing_doc + r.missing_doc,
  }), {
    total: 0, complete: 0, incomplete: 0, received_filled: 0, missing_received: 0,
    release_expected: 0, released_filled: 0, missing_released: 0, doc_expected: 0, doc_filled: 0, missing_doc: 0,
  }), [rows]);

  if (loading) return <SkeletonBox height={220} ui={ui} />;
  if (error) return <div style={{ color: RED, fontSize: "0.8rem" }}>{error}</div>;
  if (!rows.length) return <EmptyChart label="No data available" ui={ui} />;

  const tiles = [
    { label: "Overall completeness", p: pct(totals.complete, totals.total), sub: `${totals.complete.toLocaleString()} of ${totals.total.toLocaleString()} records`, missing: totals.incomplete, text: "need fixing", issue: "incomplete" },
    { label: "Date Received filled", p: pct(totals.received_filled, totals.total), sub: `${totals.received_filled.toLocaleString()} of ${totals.total.toLocaleString()} records`, missing: totals.missing_received, text: "missing", issue: "missing_received" },
    { label: "Released Date filled", p: pct(totals.released_filled, totals.release_expected), sub: `${totals.released_filled.toLocaleString()} of ${totals.release_expected.toLocaleString()} expected`, missing: totals.missing_released, text: "missing", issue: "missing_released" },
    { label: "Type of Issuance filled", p: pct(totals.doc_filled, totals.doc_expected), sub: `${totals.doc_filled.toLocaleString()} of ${totals.doc_expected.toLocaleString()} expected`, missing: totals.missing_doc, text: "missing", issue: "missing_doc" },
  ];

  const link = (n, year, issue) => (n > 0 ? (
    <button type="button" onClick={() => setOpen({ year, issue })} title="Click to view records"
      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: RED, fontWeight: 700, fontSize: "inherit", fontFamily: "inherit", textDecoration: "underline", textUnderlineOffset: 3, fontVariantNumeric: "tabular-nums" }}>
      {n.toLocaleString()}
    </button>
  ) : <span style={{ color: ui.textMuted }}>0</span>);

  const th = { fontSize: "0.64rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: ui.textMuted };
  const cols = "100px 90px minmax(170px, 2fr) 120px 120px 150px 100px";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button type="button" onClick={() => setShowNote((v) => !v)}
          style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${ui.cardBorder}`, background: showNote ? ui.inputBg : "transparent", color: ui.textSub, fontSize: "0.72rem", cursor: "pointer" }}>
          ⓘ How is this measured?
        </button>
      </div>

      {showNote && (
        <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 10, fontSize: "0.74rem", lineHeight: 1.6, color: ui.textSub, border: `1px solid ${ui.cardBorder}`, background: ui.inputBg }}>
          <b style={{ color: ui.textPrimary }}>How it is measured</b>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            <li>A record is <b>complete</b> when its Date Received is filled, its Released Date is filled if it is expected to have one, and its Type of Issuance is filled if it is expected to have one.</li>
            <li><b>Released Date is expected</b> only once the status is RELEASED or COMPLETED — records still in progress are not penalized for having no release date.</li>
            <li><b>Type of Issuance is expected</b> once the status is RELEASED or COMPLETED, or when a release date already exists.</li>
            <li>Records are grouped by the year received; with no received date, by the year released; with neither, under "No Date".</li>
            <li>Limit: this checks that data is <b>present</b>, not that it is <b>correct</b>. A wrong but valid-looking date still counts as complete.</li>
          </ul>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 18 }}>
        {tiles.map((t, i) => {
          const c = completenessColor(t.p);
          return (
            <div key={t.label} className="gmp-rise" style={{ animationDelay: `${i * 70}ms`, padding: "14px 16px", borderRadius: 12, background: ui.cardBg, border: `1px solid ${ui.cardBorder}` }}>
              <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: ui.textMuted }}>{t.label}</div>
              <div style={{ fontSize: "1.65rem", fontWeight: 800, color: c, lineHeight: 1.15, margin: "6px 0 8px", fontVariantNumeric: "tabular-nums" }}>{t.p.toFixed(1)}%</div>
              <div style={{ height: 6, borderRadius: 99, overflow: "hidden", background: ui.progressBg }}>
                <div className="gmp-grow" style={{ width: `${Math.min(t.p, 100)}%`, height: "100%", background: c, borderRadius: 99 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8, fontSize: "0.68rem", color: ui.textMuted }}>
                <span>{t.sub}</span>
                {t.missing > 0
                  ? <button type="button" onClick={() => setOpen({ year: "all", issue: t.issue })} title="Click to view records"
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: RED, fontWeight: 700, fontSize: "inherit", fontFamily: "inherit" }}>
                      {t.missing.toLocaleString()} {t.text}
                    </button>
                  : <span style={{ color: ACCENT, fontWeight: 700 }}>All filled</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 800 }}>
          <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "0 10px 8px", borderBottom: `1px solid ${ui.cardBorder}` }}>
            <span style={th}>Year</span>
            <span style={{ ...th, textAlign: "right" }}>Records</span>
            <span style={th}>Completeness</span>
            <span style={{ ...th, textAlign: "right" }}>No received date</span>
            <span style={{ ...th, textAlign: "right" }}>No released date</span>
            <span style={{ ...th, textAlign: "right" }}>No type of issuance</span>
            <span style={{ ...th, textAlign: "right" }}>Incomplete</span>
          </div>
          {rows.map((r) => {
            const c = completenessColor(r.completeness);
            return (
              <div key={r.year} style={{ display: "grid", gridTemplateColumns: cols, gap: 12, alignItems: "center", padding: "11px 10px", borderBottom: `1px solid ${ui.divider}`, fontSize: "0.8rem" }}>
                <span style={{ fontWeight: 700, color: ui.textPrimary }}>{r.year}</span>
                <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: ui.textSub }}>{r.total.toLocaleString()}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 99, background: ui.progressBg, overflow: "hidden" }}>
                    <div className="gmp-grow" style={{ width: `${Math.min(r.completeness, 100)}%`, height: "100%", background: c, borderRadius: 99 }} />
                  </div>
                  <span style={{ minWidth: 46, textAlign: "right", fontWeight: 700, color: c, fontVariantNumeric: "tabular-nums" }}>{r.completeness.toFixed(1)}%</span>
                </div>
                <span style={{ textAlign: "right" }}>{link(r.missing_received, r.year, "missing_received")}</span>
                <span style={{ textAlign: "right" }}>{link(r.missing_released, r.year, "missing_released")}</span>
                <span style={{ textAlign: "right" }}>{link(r.missing_doc, r.year, "missing_doc")}</span>
                <span style={{ textAlign: "right" }}>{link(r.incomplete, r.year, "incomplete")}</span>
              </div>
            );
          })}
          <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "12px 10px 2px", fontSize: "0.8rem", fontWeight: 700, color: ui.textPrimary }}>
            <span>Total</span>
            <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{totals.total.toLocaleString()}</span>
            <span style={{ color: completenessColor(pct(totals.complete, totals.total)), fontVariantNumeric: "tabular-nums" }}>{pct(totals.complete, totals.total).toFixed(1)}%</span>
            <span style={{ textAlign: "right" }}>{totals.missing_received.toLocaleString()}</span>
            <span style={{ textAlign: "right" }}>{totals.missing_released.toLocaleString()}</span>
            <span style={{ textAlign: "right" }}>{totals.missing_doc.toLocaleString()}</span>
            <span style={{ textAlign: "right" }}>{totals.incomplete.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {open && <RecordsModal year={open.year} issue={open.issue} ui={ui} onClose={() => setOpen(null)} />}
    </div>
  );
}
