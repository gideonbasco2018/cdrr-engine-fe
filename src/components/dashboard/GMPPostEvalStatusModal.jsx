// src/components/dashboard/GMPPostEvalStatusModal.jsx
// "See all" for the Post-Evaluation Status card — FGMP Dashboard only.
// Mirrors RecentApplicationsModal.jsx's shell (header, loading skeleton,
// error/empty states, paginated footer) with columns swapped for this
// card's concept: what step you finished vs. where it stands now, plus a
// filter chip row the card itself has no space for.
import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import {
  exportGMPPostEvalStatus,
  getGMPPostEvalStatusRows,
  getGMPPostEvalStatusSummary,
} from "../../api/dashboard";
import {
  FB,
  POST_EVAL_ANIM_CSS,
  POST_EVAL_GROUP_RETURNED,
  postEvalChipTone,
} from "./constants";

const PAGE_SIZE = 15;

// `bucket` values the list endpoint understands beyond an exact label match
// (see get_rows in app/crud/gmp_post_eval_status.py).
const BUCKET_ALL = "all";
const BUCKET_RETURNED = "returned";

function fmtDay(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

// Stroke funnel, sized to the label's cap height and inheriting its colour,
// so the button reads as one object rather than a glyph sitting next to text.
function FilterIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path
        d="M2.75 3.5h10.5L9.5 8.4v4.35l-3 1.25V8.4L2.75 3.5Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Sheet with a down arrow — reads as "take this away as a file" rather than
// the generic tray that every other action in the app also uses.
function ExportIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path
        d="M9 1.75H4.25a1.5 1.5 0 0 0-1.5 1.5v9.5a1.5 1.5 0 0 0 1.5 1.5h7.5a1.5 1.5 0 0 0 1.5-1.5V5.75L9 1.75Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M8.9 1.9v3.9h3.9" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path
        d="M8 7.9v3.9m0 0L6.4 10.2M8 11.8l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// One tickable chip row for the export checklist. Same pill shapes and
// colours as the filter chips, so the two panels read as the same control
// in two modes — pick one, or tick many.
function CheckRow({ ui, heading, items, selected, onToggle }) {
  if (items.length === 0) return null;
  return (
    <>
      <span
        style={{
          fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.06em",
          textTransform: "uppercase", color: ui.textSub, whiteSpace: "nowrap",
        }}
      >
        {heading}
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((b) => {
          const isReturn = b.group === POST_EVAL_GROUP_RETURNED;
          const tone = postEvalChipTone(b.step, isReturn);
          const accent = (isReturn ? tone.background : tone.color) ?? ui.textSub;
          const on = selected.includes(b.step);
          return (
            <button
              key={b.step}
              type="button"
              className="pe-chip"
              onClick={() => onToggle(b.step)}
              aria-pressed={on}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: "0.73rem", fontWeight: 700, fontFamily: "inherit",
                padding: "5px 11px", borderRadius: 99, whiteSpace: "nowrap",
                cursor: "pointer",
                border: `1px solid ${on ? accent : ui.cardBorder}`,
                background: on ? `${accent}14` : "transparent",
                color: on ? accent : ui.textSub,
              }}
            >
              <CheckBox checked={on} accent={accent} ui={ui} />
              {tone.icon} {b.step}{" "}
              <b style={{ fontVariantNumeric: "tabular-nums", fontWeight: 800 }}>{b.count}</b>
            </button>
          );
        })}
      </div>
    </>
  );
}

function CheckBox({ checked, indeterminate, accent, ui }) {
  const on = checked || indeterminate;
  return (
    <span
      aria-hidden="true"
      style={{
        width: 15,
        height: 15,
        flexShrink: 0,
        borderRadius: 4,
        border: `1.5px solid ${on ? accent : ui.cardBorder}`,
        background: on ? accent : "transparent",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background-color 140ms ease, border-color 140ms ease",
      }}
    >
      {indeterminate ? (
        <span style={{ width: 7, height: 2, borderRadius: 1, background: "#fff" }} />
      ) : checked ? (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6.2 4.8 8.5 9.5 3.8"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}

function StepPill({ label, isReturn }) {
  if (!label) return <span style={{ color: "#94a3b8" }}>—</span>;
  const tone = postEvalChipTone(label, isReturn);
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 99,
        fontSize: "0.73rem",
        fontWeight: 700,
        color: tone.color ?? "#64748b",
        background: tone.background ?? "transparent",
        whiteSpace: "nowrap",
      }}
    >
      {tone.icon} {label}
    </span>
  );
}

// The colour a filter chip is drawn in. Returns carry their solid fill;
// forward steps carry their own GMP_STEPS colour.
function chipAccent(chip, ui) {
  if (chip.neutral) return ui.textPrimary;
  const isReturn = chip.group === POST_EVAL_GROUP_RETURNED;
  const tone = postEvalChipTone(chip.label, isReturn);
  return (isReturn ? tone.background : tone.color) ?? ui.textSub;
}

// One labelled row of filter chips, label down the left so the chips in all
// three rows line up.
function FilterRow({ ui, heading, chips, active, onPick, disabled }) {
  if (chips.length === 0) return null;
  return (
    <>
      <span
        style={{
          fontSize: "0.66rem",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: ui.textSub,
          whiteSpace: "nowrap",
        }}
      >
        {heading}
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {chips.map((chip) => {
          const accent = chipAccent(chip, ui);
          const on = active === chip.key;
          const tone = postEvalChipTone(
            chip.label,
            chip.group === POST_EVAL_GROUP_RETURNED,
          );
          return (
            <button
              key={chip.key}
              type="button"
              className="pe-chip"
              onClick={() => onPick(chip.key)}
              aria-pressed={on}
              disabled={disabled}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: "0.73rem",
                fontWeight: 700,
                padding: "5px 11px",
                borderRadius: 99,
                whiteSpace: "nowrap",
                fontFamily: "inherit",
                cursor: disabled ? "default" : "pointer",
                border: `1px solid ${on ? accent : ui.cardBorder}`,
                background: on ? accent : "transparent",
                color: on ? "#fff" : accent,
              }}
            >
              {chip.neutral ? null : `${tone.icon} `}
              {chip.label}{" "}
              <b style={{ fontVariantNumeric: "tabular-nums", fontWeight: 800 }}>
                {chip.count}
              </b>
            </button>
          );
        })}
      </div>
    </>
  );
}

export default function GMPPostEvalStatusModal({ onClose, onRowClick, ui }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [breakdown, setBreakdown] = useState([]);
  // Skeletons are for the first load only. Switching filters afterwards dims
  // the rows already on screen instead of tearing them down and rebuilding —
  // the table swapping to placeholders on every chip click is what made this
  // feel jumpy.
  const [hasLoaded, setHasLoaded] = useState(false);
  // Opens on the whole list. The chips are a drill-down, so they stay behind
  // the Filter button rather than taking three rows of height from the table
  // before anyone has asked to narrow anything.
  const [bucket, setBucket] = useState(BUCKET_ALL);
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);
  // Chip labels ticked for export. Seeded to everything when the summary
  // lands, so Export works on one click and ticking down is the exception.
  const [exportSel, setExportSel] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Chips stay clickable while a fetch is in flight, so a stale response must
  // not overwrite a newer one — only the latest request gets to set state.
  const reqRef = useRef(0);

  const fetchPage = useCallback(async (p, b) => {
    const req = ++reqRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await getGMPPostEvalStatusRows({
        page: p,
        page_size: PAGE_SIZE,
        bucket: b,
      });
      if (req !== reqRef.current) return;
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.total_pages);
      setPage(res.page ?? p);
    } catch (err) {
      if (req !== reqRef.current) return;
      setError(err?.response?.data?.detail || err.message || "Failed to load");
      setData([]);
    } finally {
      if (req === reqRef.current) {
        setLoading(false);
        setHasLoaded(true);
      }
    }
  }, []);

  useEffect(() => {
    fetchPage(1, bucket);
  }, [fetchPage, bucket]);

  // Chip counts come from the summary, not the filtered page, so they stay
  // put as the user clicks between filters.
  useEffect(() => {
    let alive = true;
    getGMPPostEvalStatusSummary()
      .then((res) => {
        if (!alive) return;
        setBreakdown(res.breakdown);
        setExportSel(res.breakdown.map((b) => b.step));
      })
      .catch(() => alive && setBreakdown([]));
    return () => {
      alive = false;
    };
  }, []);

  // The panel measures itself once, against the unfiltered list, and never
  // goes below that afterwards. Without this it shrank to fit every filter —
  // pick a chip with one match and the whole modal collapsed around it, which
  // reads as the dialog jumping rather than the list changing. Measured rather
  // than computed from a row count so it stays right if the row height ever
  // changes.
  const panelRef = useRef(null);
  const [lockedHeight, setLockedHeight] = useState(null);

  useLayoutEffect(() => {
    if (!hasLoaded || lockedHeight !== null || !panelRef.current) return;
    setLockedHeight(panelRef.current.offsetHeight);
  }, [hasLoaded, lockedHeight]);

  const returnedChips = breakdown.filter((b) => b.group === POST_EVAL_GROUP_RETURNED);
  const forwardChips = breakdown.filter((b) => b.group !== POST_EVAL_GROUP_RETURNED);
  const allCount = breakdown.reduce((sum, b) => sum + b.count, 0);
  const returnedCount = returnedChips.reduce((sum, b) => sum + b.count, 0);

  const toChip = (b) => ({ key: b.step, label: b.step, count: b.count, group: b.group });

  // Only one panel open at a time — the modal holds a fixed height, so
  // stacking both would squeeze the table it is meant to be showing.
  const toggleFilters = () => {
    setShowFilters((v) => !v);
    setShowExport(false);
  };
  const toggleExport = () => {
    setShowExport((v) => !v);
    setShowFilters(false);
    setExportError(null);
  };

  const allSelected = breakdown.length > 0 && exportSel.length === breakdown.length;
  const noneSelected = exportSel.length === 0;
  const exportCount = breakdown
    .filter((b) => exportSel.includes(b.step))
    .reduce((sum, b) => sum + b.count, 0);

  const toggleExportChip = (step) =>
    setExportSel((prev) =>
      prev.includes(step) ? prev.filter((s) => s !== step) : [...prev, step],
    );
  const toggleExportAll = () =>
    setExportSel(allSelected ? [] : breakdown.map((b) => b.step));

  const runExport = async () => {
    if (noneSelected) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportGMPPostEvalStatus(allSelected ? [BUCKET_ALL] : exportSel);
      setShowExport(false);
    } catch (err) {
      // responseType "blob" means even a 404's JSON body arrives as a Blob,
      // so err.response.data has to be read back before it says anything.
      let msg = "Export failed";
      const body = err?.response?.data;
      if (body instanceof Blob) {
        try {
          msg = JSON.parse(await body.text()).detail || msg;
        } catch {
          /* not JSON — keep the generic message */
        }
      } else {
        msg = body?.detail || err?.message || msg;
      }
      setExportError(msg);
    } finally {
      setExporting(false);
    }
  };


  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(startRow + PAGE_SIZE - 1, total);

  return (
    <div
      className="pe-backdrop"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.52)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <style>{POST_EVAL_ANIM_CSS}</style>
      <div
        ref={panelRef}
        className="pe-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ui.cardBg, border: `1px solid ${ui.cardBorder}`, borderRadius: 14,
          width: "100%", maxWidth: 900, maxHeight: "92vh",
          // A floor, not a fixed height. As a fixed height it had no room for
          // the Filter and Export panels: opening one on a short list pushed
          // the body — the only flex child that can give — down to the height
          // of the sticky header, hiding every row behind it. min() keeps the
          // floor from outgrowing the window if it is resized smaller later.
          minHeight: lockedHeight ? `min(${lockedHeight}px, 92vh)` : undefined,
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.28)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid ${ui.divider}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: `${FB}18`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem",
            }}>
              📋
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: ui.textPrimary }}>
                Post-Evaluation Status
              </h3>
              <p style={{ margin: 0, fontSize: "0.75rem", color: ui.textSub }}>
                {loading
                  ? "Loading…"
                  : bucket === BUCKET_ALL
                    ? `${total.toLocaleString()} application${total !== 1 ? "s" : ""}`
                    : `${total.toLocaleString()} of ${allCount.toLocaleString()} application${allCount !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Plain on/off for the chip panel — it shows or hides the chips,
                nothing more. Picking a chip leaves the panel open. */}
            {breakdown.length > 0 && (
              <button
                type="button"
                className="pe-chip"
                onClick={toggleFilters}
                aria-expanded={showFilters}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  height: 32, padding: "0 13px", borderRadius: 8,
                  fontSize: "0.78rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                  letterSpacing: "0.01em",
                  border: `1px solid ${showFilters ? FB : ui.cardBorder}`,
                  background: showFilters ? `${FB}14` : ui.inputBg,
                  color: showFilters ? FB : ui.textSub,
                  boxShadow: showFilters ? `inset 0 0 0 1px ${FB}22` : "none",
                }}
              >
                <FilterIcon />
                Filter
              </button>
            )}
            {breakdown.length > 0 && (
              <button
                type="button"
                className="pe-chip"
                onClick={toggleExport}
                aria-expanded={showExport}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  height: 32, padding: "0 13px", borderRadius: 8,
                  fontSize: "0.78rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                  letterSpacing: "0.01em",
                  border: `1px solid ${showExport ? FB : ui.cardBorder}`,
                  background: showExport ? `${FB}14` : ui.inputBg,
                  color: showExport ? FB : ui.textSub,
                  boxShadow: showExport ? `inset 0 0 0 1px ${FB}22` : "none",
                }}
              >
                <ExportIcon />
                Export
              </button>
            )}
            <button onClick={onClose} aria-label="Close" style={{
              background: ui.inputBg, border: `1px solid ${ui.cardBorder}`, borderRadius: 8,
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: ui.textMuted, fontSize: "1rem",
            }}>
              ✕
            </button>
          </div>
        </div>

        {/* Filters — same two headings as the card, plus an "everything" row.
            Collapsed until the Filter button asks for them. */}
        {breakdown.length > 0 && showFilters && (
          <div
            className="pe-row"
            style={{
              padding: "11px 20px",
              background: ui.pageBg,
              borderBottom: `1px solid ${ui.divider}`,
              display: "grid",
              gridTemplateColumns: "auto minmax(0, 1fr)",
              rowGap: 9,
              columnGap: 12,
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <FilterRow
              ui={ui}
              heading="Everything"
              chips={[{ key: BUCKET_ALL, label: "All", count: allCount, neutral: true }]}
              active={bucket}
              onPick={setBucket}
            />
            <FilterRow
              ui={ui}
              heading="Moved forward"
              chips={forwardChips.map(toChip)}
              active={bucket}
              onPick={setBucket}
            />
            <FilterRow
              ui={ui}
              heading="Returned to me"
              chips={
                returnedChips.length > 0
                  ? [
                      {
                        key: BUCKET_RETURNED,
                        label: "Any return",
                        count: returnedCount,
                        neutral: true,
                      },
                      ...returnedChips.map(toChip),
                    ]
                  : []
              }
              active={bucket}
              onPick={setBucket}
            />
          </div>
        )}

        {/* Export checklist — tick any combination of chips; the workbook is
            the union of them. Independent of the Filter selection above, so
            you can export something other than what you are looking at. */}
        {breakdown.length > 0 && showExport && (
          <div
            className="pe-row"
            style={{
              padding: "11px 20px 13px",
              background: ui.pageBg,
              borderBottom: `1px solid ${ui.divider}`,
              display: "grid",
              gridTemplateColumns: "auto minmax(0, 1fr)",
              rowGap: 9,
              columnGap: 12,
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.06em",
                textTransform: "uppercase", color: ui.textSub, whiteSpace: "nowrap",
              }}
            >
              Everything
            </span>
            <div>
              <button
                type="button"
                className="pe-chip"
                onClick={toggleExportAll}
                aria-pressed={allSelected}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: "0.73rem", fontWeight: 700, fontFamily: "inherit",
                  padding: "5px 11px", borderRadius: 99, whiteSpace: "nowrap",
                  cursor: "pointer",
                  border: `1px solid ${allSelected || !noneSelected ? ui.textPrimary : ui.cardBorder}`,
                  background: allSelected ? `${ui.textPrimary}12` : "transparent",
                  color: allSelected || !noneSelected ? ui.textPrimary : ui.textSub,
                }}
              >
                <CheckBox
                  checked={allSelected}
                  indeterminate={!allSelected && !noneSelected}
                  accent={ui.textPrimary}
                  ui={ui}
                />
                All{" "}
                <b style={{ fontVariantNumeric: "tabular-nums", fontWeight: 800 }}>{allCount}</b>
              </button>
            </div>

            <CheckRow
              ui={ui}
              heading="Moved forward"
              items={forwardChips}
              selected={exportSel}
              onToggle={toggleExportChip}
            />
            <CheckRow
              ui={ui}
              heading="Returned to me"
              items={returnedChips}
              selected={exportSel}
              onToggle={toggleExportChip}
            />

            <span />
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="pe-chip"
                onClick={runExport}
                disabled={noneSelected || exporting}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  height: 32, padding: "0 14px", borderRadius: 8,
                  fontSize: "0.78rem", fontWeight: 700, fontFamily: "inherit",
                  border: "1px solid transparent",
                  background: noneSelected || exporting ? ui.progressBg : FB,
                  color: noneSelected || exporting ? ui.textMuted : "#fff",
                  cursor: noneSelected || exporting ? "not-allowed" : "pointer",
                }}
              >
                <ExportIcon />
                {exporting ? "Preparing…" : `Export ${exportCount} to Excel`}
              </button>
              {noneSelected && (
                <span style={{ fontSize: "0.75rem", color: ui.textMuted }}>
                  Tick at least one.
                </span>
              )}
              {exportError && (
                <span style={{ fontSize: "0.75rem", color: "#e02020" }}>⚠️ {exportError}</span>
              )}
            </div>
          </div>
        )}

        {/* Body — the ONLY scroll container in the panel. The table used to sit
            in its own `overflowX: auto` wrapper, and since CSS forces the other
            axis to `auto` as soon as one axis is not `visible`, that wrapper
            became a second vertical scroller nested inside this one: two
            scrollbars side by side. Both axes belong here, on one element. */}
        <div className="pe-scroll" style={{ overflow: "auto", flex: 1, minHeight: 0 }}>
          {loading && !hasLoaded && (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="pe-skel"
                  style={{
                    height: 48,
                    borderRadius: 8,
                    backgroundColor: ui.progressBg,
                    animationDelay: `${i * 90}ms`,
                  }}
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div style={{ padding: "2rem", textAlign: "center", color: "#e02020", fontSize: "0.84rem" }}>
              ⚠️ {error}&nbsp;
              <button onClick={() => fetchPage(page, bucket)} style={{
                background: "none", border: "none", color: FB, cursor: "pointer",
                fontWeight: 700, fontSize: "0.84rem", fontFamily: "inherit",
              }}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && data.length === 0 && (
            <div
              className="pe-row"
              style={{
                // The panel keeps its height now, so centre this rather than
                // leaving it pinned under the header with blank space below.
                minHeight: "100%", padding: "2rem 3rem",
                display: "flex", alignItems: "center", justifyContent: "center",
                textAlign: "center", color: ui.textMuted, fontSize: "0.84rem",
              }}
            >
              {bucket === BUCKET_ALL
                ? "Nothing here — everything you've finished has already moved to release, or nothing's been completed yet."
                : "Nothing under this filter."}
            </div>
          )}

          {!error && data.length > 0 && (
            <div
              className="pe-fade"
              style={{
                // No overflow here — see the Body comment above.
                // Dimmed, not replaced: the rows stay put while the next
                // filter loads, so nothing collapses and re-expands.
                opacity: loading ? 0.45 : 1,
                pointerEvents: loading ? "none" : "auto",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", fontFamily: "inherit" }}>
                <thead>
                  <tr style={{ background: ui.pageBg, position: "sticky", top: 0, zIndex: 1 }}>
                    {[
                      { label: "#", align: "center", width: 40 },
                      { label: "DTN", align: "left" },
                      { label: "Establishment", align: "left" },
                      { label: "Your Step", align: "left" },
                      { label: "Completed", align: "right" },
                      { label: "Where it is now", align: "left" },
                    ].map((col, ci) => (
                      <th key={ci} style={{
                        padding: "9px 12px", textAlign: col.align, fontSize: "0.69rem", fontWeight: 700,
                        color: ui.textMuted, textTransform: "uppercase", letterSpacing: "0.05em",
                        borderBottom: `1px solid ${ui.cardBorder}`, whiteSpace: "nowrap", width: col.width || "auto",
                      }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, ri) => {
                    const isEven = ri % 2 === 0;
                    const isLast = ri === data.length - 1;
                    const border = !isLast ? `1px solid ${ui.divider}` : "none";
                    const rowNum = startRow + ri;
                    return (
                      <tr
                        key={row.gmp_id}
                        className="pe-row"
                        onClick={() => onRowClick && onRowClick(row)}
                        style={{
                          animationDelay: `${Math.min(ri, 10) * 35}ms`,
                          background: isEven ? "transparent" : `${ui.pageBg}88`,
                          cursor: onRowClick ? "pointer" : "default",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = ui.hoverBg)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = isEven ? "transparent" : `${ui.pageBg}88`)}
                      >
                        <td style={{ padding: "9px 12px", textAlign: "center", color: ui.textMuted, fontSize: "0.73rem", borderBottom: border }}>
                          {rowNum}
                        </td>
                        <td style={{ padding: "9px 12px", borderBottom: border, whiteSpace: "nowrap" }}>
                          <span style={{ fontWeight: 700, color: FB, fontSize: "0.82rem", fontFamily: "ui-monospace,monospace" }}>
                            {row.dtn || "—"}
                          </span>
                        </td>
                        <td style={{ padding: "9px 12px", color: ui.textSub, borderBottom: border, minWidth: 180, maxWidth: 260 }}>
                          <span style={{ display: "block", fontSize: "0.76rem", lineHeight: 1.4, wordBreak: "break-word" }}>
                            {row.lto_company || "—"}
                          </span>
                        </td>
                        <td style={{ padding: "9px 12px", borderBottom: border, whiteSpace: "nowrap" }}>
                          <StepPill label={row.your_step} />
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "right", color: ui.textMuted, fontSize: "0.76rem", borderBottom: border, whiteSpace: "nowrap" }}>
                          {fmtDay(row.completed_date)}
                        </td>
                        <td style={{ padding: "9px 12px", borderBottom: border, whiteSpace: "nowrap" }}>
                          <StepPill
                            label={row.return_reason || row.current_step}
                            isReturn={Boolean(row.return_reason)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px", borderTop: `1px solid ${ui.divider}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 8,
        }}>
          <span style={{ fontSize: "0.74rem", color: ui.textMuted }}>
            {total > 0 ? `${startRow}–${endRow} of ${total.toLocaleString()} applications` : ""}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => fetchPage(page - 1, bucket)} disabled={page <= 1 || loading} style={{
              padding: "5px 12px", borderRadius: 7, border: `1px solid ${page <= 1 ? ui.cardBorder : ui.metricBorder}`,
              background: "transparent", color: page <= 1 ? ui.textMuted : ui.textPrimary, fontSize: "0.78rem",
              fontWeight: 600, cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.4 : 1, fontFamily: "inherit",
            }}>
              ‹ Prev
            </button>
            <span style={{ fontSize: "0.78rem", color: ui.textSub, padding: "0 8px", whiteSpace: "nowrap" }}>
              Page {page} of {totalPages}
            </span>
            <button onClick={() => fetchPage(page + 1, bucket)} disabled={page >= totalPages || loading} style={{
              padding: "5px 12px", borderRadius: 7, border: `1px solid ${page >= totalPages ? ui.cardBorder : ui.metricBorder}`,
              background: "transparent", color: page >= totalPages ? ui.textMuted : ui.textPrimary, fontSize: "0.78rem",
              fontWeight: 600, cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.4 : 1, fontFamily: "inherit",
            }}>
              Next ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
