// FILE: src/pages/EvaluatorsMonitoringPage.jsx
// Pick an evaluator (or a checker), then see how the closed applications they
// handled did per company and per drug (ranked by average turnaround time),
// and how many were received and released per year or month.
import { useEffect, useMemo, useRef, useState } from "react";
import { getAnalyticsAvailableYears } from "../api/analytics";
import {
  searchEvaluators,
  getEvaluatorMonitoring,
  getEvaluatorRecords,
  getEvaluatorPeriodRecords,
} from "../api/evaluatorMonitoring";
import { getColorScheme } from "../components/reports/utils.js";
import EvaluatorRecordsModal from "../components/monitoring/evaluatorMonitoring/EvaluatorRecordsModal";
import SortLabel from "../components/monitoring/evaluatorMonitoring/SortLabel";
import ExportPdfModal from "../components/monitoring/evaluatorMonitoring/ExportPdfModal";
import YearMonthsModal from "../components/monitoring/evaluatorMonitoring/YearMonthsModal";
import { PeriodsTable } from "../components/monitoring/evaluatorMonitoring/PeriodsTable";
import {
  isFallback,
  sourceText,
  sourceHint,
  startLabel,
  endLabel,
} from "../components/monitoring/evaluatorMonitoring/tatSources";
import {
  makeUi,
  Icon,
  IconChip,
  Monogram,
  MotionStyles,
  Skeleton,
  AMBER,
} from "../components/monitoring/evaluatorMonitoring/ui";
import { exportMonitoringPdf } from "../components/monitoring/evaluatorMonitoring/exportEvaluatorMonitoringPdf";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const fmt = (n) => Number(n ?? 0).toLocaleString();
const fmtAvg = (n) =>
  n == null
    ? "—"
    : Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 });
const errorMessage = (err, fallback) =>
  err?.response?.status === 403
    ? "You are not allowed to view this page."
    : typeof err?.response?.data?.detail === "string"
      ? err.response.data.detail
      : err?.message || fallback;

function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// "application log" or "Date Decked" next to a date; amber when it is a fallback
function SourceTag({ label, fallback, show, t }) {
  if (!show) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        marginLeft: 8,
        fontSize: "0.6rem",
        color: fallback ? t.amberText : t.ink3,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: fallback ? AMBER : t.accent,
        }}
      />
      {label}
    </span>
  );
}

function EvaluatorsMonitoringPage({ darkMode }) {
  const colors = getColorScheme(darkMode); // passed on to the CPR modals
  const ui = makeUi(darkMode);
  const { t } = ui;

  // Evaluator or Checker view; the same page and tables work for both
  const [role, setRole] = useState("evaluator");
  const roleLabel = role === "checker" ? "Checker" : "Evaluator";
  const roleWord = roleLabel.toLowerCase();

  // person search
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query);
  const [results, setResults] = useState({ q: null, role: null, items: [] });
  // the list is for the current text only; otherwise we are still waiting
  const upToDate = results.q === query.trim() && results.role === role;
  const items = upToDate ? results.items : [];
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const [evaluator, setEvaluator] = useState(null);

  // filters
  const [years, setYears] = useState([]);
  const [year, setYear] = useState("All");
  const [month, setMonth] = useState("All");

  // data
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSkipped, setShowSkipped] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false); // the Export PDF dialog
  // filter the Companies and Drugs tables to one source of the TAT dates:
  // { start: "log" | "decked", end: "log" | "released" } or null
  const [sourceFilter, setSourceFilter] = useState(null);
  const sourceKey = sourceFilter
    ? `${sourceFilter.start}:${sourceFilter.end}`
    : undefined;
  const [recordsTarget, setRecordsTarget] = useState(null); // { kind, key, name }
  // a Received / Released number of the period card: { side, bucket, label, seg }
  const [periodTarget, setPeriodTarget] = useState(null);
  // a year row that was clicked: opens that year's monthly breakdown
  const [monthsYear, setMonthsYear] = useState(null);
  // search text and sort of the Companies / Drugs tables
  const EMPTY_VIEW = { q: "", key: null, dir: "asc" }; // no sort = by rank
  const [views, setViews] = useState({
    company: EMPTY_VIEW,
    drug: EMPTY_VIEW,
  });
  const setView = (kind, patch) =>
    setViews((v) => ({ ...v, [kind]: { ...v[kind], ...patch } }));
  const toggleSort = (kind, key) =>
    setViews((v) => {
      const cur = v[kind];
      return {
        ...v,
        [kind]: {
          ...cur,
          key,
          dir: cur.key === key && cur.dir === "asc" ? "desc" : "asc",
        },
      };
    });

  useEffect(() => {
    getAnalyticsAvailableYears()
      .then((res) => setYears(res?.years || []))
      .catch(() => setYears([]));
  }, []);

  // Close the list when the user clicks anywhere outside the search box
  useEffect(() => {
    if (!showResults) return;
    const onDown = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target))
        setShowResults(false);
    };
    const onKey = (e) => e.key === "Escape" && setShowResults(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showResults]);

  // With nothing typed (the arrow button), the list shows every evaluator A-Z.
  // While the user is still typing the request waits for the debounce, and
  // each result remembers the text it was loaded for, so a list for old text
  // is never shown.
  useEffect(() => {
    if (!showResults) return;
    const q = debouncedQuery.trim();
    if (q !== query.trim()) return; // still typing
    let cancelled = false;
    searchEvaluators(q, 500, role)
      .then(
        (res) => !cancelled && setResults({ q, role, items: res?.data || [] }),
      )
      .catch((err) => {
        if (cancelled) return;
        setResults({ q, role, items: [] });
        setError(errorMessage(err, `Could not search ${roleWord}s.`));
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, showResults, role]);

  useEffect(() => {
    if (!evaluator) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    getEvaluatorMonitoring({
      user_id: evaluator.user_id,
      year,
      month: year === "All" ? "All" : month,
      role,
      source: sourceKey,
    })
      .then((res) => !cancelled && setData(res))
      .catch((err) => {
        if (cancelled) return;
        setData(null);
        setError(errorMessage(err, `Could not load this ${roleWord}.`));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [evaluator, year, month, role, sourceKey]);

  const changeRole = (next) => {
    if (next === role) return;
    setRole(next);
    setEvaluator(null);
    setData(null);
    setError("");
    setQuery("");
    setResults({ q: null, role: null, items: [] });
    setShowResults(false);
    setShowSkipped(false);
    setRecordsTarget(null);
    setPeriodTarget(null);
    setViews({ company: EMPTY_VIEW, drug: EMPTY_VIEW });
    setSourceFilter(null);
    setMonthsYear(null);
  };
  const pickEvaluator = (e) => {
    setEvaluator(e);
    setQuery("");
    setResults({ q: null, role: null, items: [] });
    setShowResults(false);
    setShowSkipped(false);
    setRecordsTarget(null);
    setPeriodTarget(null);
    setViews({ company: EMPTY_VIEW, drug: EMPTY_VIEW });
    setSourceFilter(null);
    setMonthsYear(null);
  };
  const toggleSource = (x) =>
    setSourceFilter((cur) =>
      cur && cur.start === x.start && cur.end === x.end
        ? null
        : { start: x.start, end: x.end },
    );

  // the same, from the month-by-month dialog: the year comes from the dialog
  // extra = { company_key | drug_key | doc_type, name } from the month summary
  const openMonthPeriod = (side, p, seg, extra = null) => {
    setRecordsTarget(null);
    setPeriodTarget({ side, bucket: p.key, label: p.label, seg, year: monthsYear, extra });
  };

  // seg = null for the whole number, or one part of its split
  const openPeriod = (side, p, seg) => {
    setRecordsTarget(null);
    setPeriodTarget({ side, bucket: p.key, label: p.label, seg });
  };
  // Build the PDF after the dialog has repainted, so "Preparing…" shows first
  const generatePdf = (sections) => {
    if (!data || pdfBusy) return;
    setPdfBusy(true);
    setTimeout(() => {
      try {
        exportMonitoringPdf({ data, periodLabel, sections });
        setPdfOpen(false);
      } catch (err) {
        console.error("PDF export failed:", err);
        setPdfOpen(false);
        setError("Could not build the PDF.");
      } finally {
        setPdfBusy(false);
      }
    }, 30);
  };
  const changeYear = (value) => {
    setYear(value);
    setMonth("All");
  };

  const periodLabel = useMemo(() => {
    if (year === "All") return "All years";
    if (month === "All") return year;
    return `${MONTHS[Number(month) - 1]} ${year}`;
  }, [year, month]);

  /* ── small pieces ── */
  const empty = (text) => (
    <div
      style={{
        padding: "1.75rem",
        textAlign: "center",
        fontSize: "0.76rem",
        color: t.ink3,
      }}
    >
      {text}
    </div>
  );

  const rowHover = {
    onMouseEnter: (e) => (e.currentTarget.style.background = t.rowHover),
    onMouseLeave: (e) => ui.hoverOff(e),
  };

  // Search + sort for the ranked tables. Ranks keep their original numbers.
  const viewRows = (rows, view) => {
    const q = view.q.trim().toLowerCase();
    const list = q
      ? rows.filter(
          (r) =>
            r.name?.toLowerCase().includes(q) ||
            r.spellings.some((s) => s.name?.toLowerCase().includes(q)),
        )
      : rows;
    const field =
      {
        rank: "rank",
        name: "name",
        total: "total_apps",
        avg: "avg_tat",
        fast: "fastest_tat",
        slow: "slowest_tat",
      }[view.key] ?? "rank";
    const dir = view.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const x = a[field];
      const y = b[field];
      const cmp =
        typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x ?? "").localeCompare(String(y ?? ""), undefined, {
              numeric: true,
            });
      // equal values fall back to the rank so the order stays stable
      return (cmp || a.rank - b.rank) * (cmp ? dir : 1);
    });
  };

  // Ranked table used for both companies and drugs
  const rankedTable = (title, icon, label, kind, allRows) => {
    const view = views[kind];
    const rows = viewRows(allRows, view);
    // sub = small second line under the title (the unit of the column)
    const sortTh = (key, text, extra = {}, sub = null) => (
      <th
        onClick={() => toggleSort(kind, key)}
        title="Click to sort"
        style={{
          ...ui.th,
          cursor: "pointer",
          userSelect: "none",
          "--sort-ink": t.blueText,
          ...extra,
        }}
      >
        <SortLabel
          text={
            sub ? (
              <span
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  alignItems:
                    extra.textAlign === "right" ? "flex-end" : "flex-start",
                  lineHeight: 1.3,
                }}
              >
                <span>{text}</span>
                <span
                  style={{
                    fontSize: "0.55rem",
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                    textTransform: "none",
                    opacity: 0.85,
                  }}
                >
                  {sub}
                </span>
              </span>
            ) : (
              text
            )
          }
          align={extra.textAlign === "right" ? "right" : "left"}
          active={view.key === key}
          dir={view.dir}
          onClear={() => setView(kind, { key: null, dir: "asc" })}
        />
      </th>
    );
    return (
      <div style={ui.card}>
        <div style={ui.cardHead}>
          <h3 style={ui.cardTitle}>
            <IconChip name={icon} t={t} />
            {title}
          </h3>
          <span style={ui.pillAccent}>
            {view.q.trim()
              ? `${fmt(rows.length)} of ${fmt(allRows.length)}`
              : `${fmt(allRows.length)} ranked`}
          </span>
          {sourceFilter && (
            <span style={ui.pillAmber} title="Change it in the card above">
              Only TAT from {sourceText(sourceFilter)}
            </span>
          )}
          <span style={{ marginLeft: "auto", position: "relative" }}>
            <Icon
              name="search"
              size={13}
              style={{
                position: "absolute",
                left: 11,
                top: "50%",
                transform: "translateY(-50%)",
                color: t.ink3,
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              value={view.q}
              onChange={(e) => setView(kind, { q: e.target.value })}
              placeholder={`Search ${label.toLowerCase()}`}
              aria-label={`Search ${label}`}
              onFocus={ui.focusOn}
              onBlur={ui.focusOff}
              style={{
                ...ui.field,
                width: 230,
                height: 30,
                padding: "0 0.7rem 0 2rem",
                fontSize: "0.72rem",
                background: t.sunken,
              }}
            />
          </span>
        </div>
        {allRows.length === 0 ? (
          empty("No closed applications with a usable TAT in this period.")
        ) : rows.length === 0 ? (
          empty("Nothing matches your search.")
        ) : (
          <div
            style={{
              maxHeight: 420,
              overflow: "auto",
              // keep the room of the scrollbar, so the Companies and Drugs
              // tables line up even when only one of them scrolls
              scrollbarGutter: "stable",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed",
              }}
            >
              <colgroup>
                <col style={{ width: 76 }} />
                <col />
                <col style={{ width: 120 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 130 }} />
              </colgroup>
              <thead>
                <tr>
                  {sortTh("rank", "Rank")}
                  {sortTh("name", label)}
                  {sortTh("total", "Total Apps", ui.num)}
                  {sortTh("avg", "Avg TAT", ui.num, "working days")}
                  {sortTh("fast", "Fastest", ui.num, "working days")}
                  {sortTh("slow", "Slowest", ui.num, "working days")}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.key}
                    className="em-row"
                    onClick={() => {
                      setPeriodTarget(null);
                      setRecordsTarget({ kind, key: r.key, name: r.name });
                    }}
                    style={{
                      cursor: "pointer",
                      transition: "background .12s",
                      animationDelay: `${Math.min(i, 14) * 22}ms`,
                    }}
                    {...rowHover}
                  >
                    <td style={{ ...ui.td, color: t.ink3, fontWeight: 500 }}>
                      {r.rank <= 3 ? (
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 7,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: t.accentSoft,
                            border: `1px solid ${t.accentLine}`,
                            color: t.accentText,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                          }}
                        >
                          {r.rank}
                        </span>
                      ) : (
                        r.rank
                      )}
                    </td>
                    <td style={{ ...ui.td, wordBreak: "break-word" }}>
                      <span>{r.name}</span>
                      {r.spellings.length > 1 && (
                        <span
                          title={r.spellings.map((s) => s.name).join("\n")}
                          style={{
                            ...ui.pillAmber,
                            marginLeft: 10,
                            padding: "0.1rem 0.5rem",
                            fontSize: "0.58rem",
                          }}
                        >
                          {r.spellings.length} spellings
                        </span>
                      )}
                    </td>
                    <td style={{ ...ui.td, ...ui.num, color: t.ink2 }}>
                      {fmt(r.total_apps)}
                    </td>
                    <td
                      style={{
                        ...ui.td,
                        ...ui.num,
                        fontWeight: 700,
                        color: t.accentText,
                      }}
                    >
                      {fmtAvg(r.avg_tat)}
                    </td>
                    <td style={{ ...ui.td, ...ui.num, color: t.ink2 }}>
                      {fmt(r.fastest_tat)}
                    </td>
                    <td style={{ ...ui.td, ...ui.num, color: t.ink2 }}>
                      {fmt(r.slowest_tat)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="em-root"
      style={{
        padding: "1.5rem 1.75rem 2.5rem",
        background: colors.pageBg,
        minHeight: "100%",
        color: t.ink,
      }}
    >
      <MotionStyles />
      <h1
        style={{
          margin: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: "1.3rem",
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}
      >
        <Icon name="trend" size={22} style={{ color: t.ink2 }} />
        User Insights
      </h1>
      <p
        style={{
          margin: "0.35rem 0 1.25rem",
          fontSize: "0.78rem",
          color: t.ink3,
        }}
      >
        How an evaluator or a checker handled closed applications, per company
        and per drug.
      </p>

      {/* search + filters */}
      <div
        style={{
          ...ui.card,
          padding: "0.85rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.7rem",
          alignItems: "center",
          overflow: "visible",
          marginBottom: "1.25rem",
        }}
      >
        <div
          role="tablist"
          aria-label="View"
          style={{
            position: "relative",
            display: "inline-flex",
            padding: 3,
            background: t.sunken,
            border: `1px solid ${t.line}`,
            borderRadius: 11,
          }}
        >
          {/* the green thumb slides under the chosen button */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 3,
              left: 3,
              width: 96,
              height: 28,
              borderRadius: 8,
              background: t.accent,
              boxShadow: "0 2px 8px rgba(16,185,129,0.35)",
              transform: `translateX(${role === "checker" ? 96 : 0}px)`,
              transition: "transform .3s cubic-bezier(.4,0,.2,1)",
            }}
          />
          {[
            ["evaluator", "Evaluator"],
            ["checker", "Checker"],
          ].map(([id, label]) => {
            const active = role === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => changeRole(id)}
                style={{
                  position: "relative",
                  zIndex: 1,
                  width: 96,
                  height: 28,
                  background: "transparent",
                  color: active ? "#ffffff" : t.ink2,
                  border: "none",
                  borderRadius: 8,
                  fontSize: "0.74rem",
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  transition: "color .25s, transform .12s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div
          ref={searchRef}
          style={{ position: "relative", flex: "1 1 280px", minWidth: 220 }}
        >
          <Icon
            name="search"
            size={14}
            style={{
              position: "absolute",
              left: 12,
              top: 11,
              color: t.ink3,
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={query}
            // The box is for typing only: matches show while there is text,
            // and the list closes when the box is emptied. Clicking it does
            // not open anything; the arrow button lists everyone.
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(e.target.value.trim().length > 0);
            }}
            onKeyDown={(e) => e.key === "Escape" && setShowResults(false)}
            onFocus={ui.focusOn}
            onBlur={ui.focusOff}
            placeholder={
              evaluator
                ? `Selected: ${evaluator.full_name} — type to search another`
                : `Type ${role === "checker" ? "a" : "an"} ${roleWord} name or code`
            }
            aria-label={`Search ${roleWord}`}
            aria-expanded={showResults}
            style={{
              ...ui.field,
              width: "100%",
              padding: "0 2.4rem 0 2.2rem",
            }}
          />
          <button
            type="button"
            aria-label={
              showResults ? `Hide ${roleWord} list` : `Show all ${roleWord}s`
            }
            title={showResults ? "Hide list" : `Show all ${roleWord}s A-Z`}
            onClick={() => setShowResults((s) => !s)}
            style={{
              position: "absolute",
              top: 3,
              right: 3,
              width: 30,
              height: 30,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: 8,
              color: t.ink2,
              cursor: "pointer",
            }}
            onMouseEnter={ui.hoverOn}
            onMouseLeave={(e) => ui.hoverOff(e)}
          >
            <Icon
              name="chevron"
              size={15}
              style={{
                transform: showResults ? "rotate(180deg)" : "none",
                transition: "transform .2s",
              }}
            />
          </button>
          {showResults && (
            <div
              className="em-pop"
              style={{
                position: "absolute",
                top: 42,
                left: 0,
                right: 0,
                zIndex: 50,
                background: t.surface,
                border: `1px solid ${t.line}`,
                borderRadius: 12,
                boxShadow: t.shadowPop,
                maxHeight: 360,
                overflowY: "auto",
              }}
            >
              {!upToDate && empty("Searching…")}
              {upToDate && items.length === 0 && empty(`No ${roleWord} found`)}
              {items.length > 0 && (
                <div
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.09em",
                    color: t.ink3,
                    background: t.surface,
                    borderBottom: `1px solid ${t.line}`,
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  {fmt(items.length)} {roleWord}
                  {items.length === 1 ? "" : "s"} · A–Z
                </div>
              )}
              {items.map((r) => (
                <button
                  key={r.user_id}
                  type="button"
                  onClick={() => pickEvaluator(r)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    gap: "0.75rem",
                    padding: "0.55rem 1rem",
                    background: "transparent",
                    border: "none",
                    borderBottom: `1px solid ${t.line}`,
                    color: t.ink,
                    fontSize: "0.76rem",
                    textAlign: "left",
                    cursor: "pointer",
                    fontWeight: evaluator?.user_id === r.user_id ? 600 : 400,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = t.rowHover)
                  }
                  onMouseLeave={(e) => ui.hoverOff(e)}
                >
                  <Monogram name={r.full_name} size={26} t={t} />
                  <span style={{ flex: 1, minWidth: 0 }}>{r.full_name}</span>
                  <span style={{ color: t.ink3, fontSize: "0.7rem" }}>
                    {[r.code, r.position].filter(Boolean).join(" · ")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <select
          value={year}
          onChange={(e) => changeYear(e.target.value)}
          aria-label="Year"
          onFocus={ui.focusOn}
          onBlur={ui.focusOff}
          style={{ ...ui.field, padding: "0 0.7rem", cursor: "pointer" }}
        >
          <option value="All">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          disabled={year === "All"}
          aria-label="Month"
          onFocus={ui.focusOn}
          onBlur={ui.focusOff}
          style={{
            ...ui.field,
            padding: "0 0.7rem",
            cursor: year === "All" ? "default" : "pointer",
            opacity: year === "All" ? 0.5 : 1,
          }}
        >
          <option value="All">All months</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: "1rem",
            padding: "0.7rem 1rem",
            borderRadius: 10,
            border: `1px solid ${t.lineStrong}`,
            background: t.pill,
            color: t.ink,
            fontSize: "0.76rem",
          }}
        >
          {error}
        </div>
      )}

      {!evaluator && !error && (
        <div
          className="em-rise-one"
          style={{ ...ui.card, padding: "3.5rem 1rem", textAlign: "center" }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: t.blueSoft,
              border: `1px solid ${t.blueLine}`,
              color: t.blueText,
              marginBottom: 14,
            }}
          >
            <Icon name="users" size={20} />
          </span>
          <div
            style={{
              fontSize: "0.88rem",
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            Search for {role === "checker" ? "a" : "an"} {roleWord} to begin
          </div>
          <div style={{ fontSize: "0.74rem", color: t.ink3, marginTop: 5 }}>
            Type part of a name or code, or press the arrow to list everyone
            A–Z.
          </div>
        </div>
      )}

      {evaluator && loading && !data && (
        <div
          className="em-stagger"
          aria-busy="true"
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Skeleton t={t} h={44} w={44} r={22} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton t={t} h={16} w="260px" />
              <Skeleton t={t} h={11} w="180px" />
            </div>
          </div>
          {[150, 260, 260].map((h, i) => (
            <div key={i} style={{ ...ui.card, padding: "1.1rem" }}>
              <Skeleton t={t} h={18} w="220px" style={{ marginBottom: 16 }} />
              {Array.from({ length: Math.round(h / 52) }).map((_, j) => (
                <Skeleton key={j} t={t} h={12} style={{ marginBottom: 14 }} />
              ))}
            </div>
          ))}
        </div>
      )}

      {evaluator && data && (
        <div
          // a new person or role mounts it again, so the sections come in again
          key={`${evaluator.user_id}-${role}`}
          className="em-stagger"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            opacity: loading ? 0.6 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {/* who + export */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Monogram name={data.evaluator.full_name} size={44} t={t} />
              <div>
                <div
                  style={{
                    fontSize: "1.08rem",
                    fontWeight: 600,
                    letterSpacing: "-0.015em",
                  }}
                >
                  {data.evaluator.full_name}
                  <span
                    style={{
                      marginLeft: 10,
                      fontSize: "0.74rem",
                      fontWeight: 400,
                      letterSpacing: 0,
                      color: t.ink3,
                    }}
                  >
                    {[data.evaluator.code, data.evaluator.position]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <div style={{ fontSize: "0.72rem", color: t.ink3, marginTop: 2 }}>
                  Closed applications released in{" "}
                  <span style={{ color: t.ink2, fontWeight: 500 }}>
                    {periodLabel}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPdfOpen(true)}
              title="Choose what to include, then download a PDF"
              style={ui.buttonGreen}
            >
              <Icon name="download" size={14} />
              Download PDF
            </button>
          </div>

          {/* received / released */}
          <div style={ui.card}>
            <div style={ui.cardHead}>
              <h3 style={ui.cardTitle}>
                <IconChip name="calendar" t={t} tone="green" />
                Received and Released{" "}
                {data.period_mode === "year" ? "by Year" : `by Month, ${year}`}
              </h3>
              <span style={ui.pillGreen}>open and closed apps</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "0.68rem",
                  color: t.ink3,
                }}
              >
                {data.period_mode === "year" && "Click a year to see its monthly breakdown. "}
                Each bar splits its number: Received by the year it was
                released, Released by the year it was received.
              </span>
            </div>
            {data.periods.length === 0 ? (
              empty("No closed applications on record.")
            ) : (
              <PeriodsTable
                periods={data.periods}
                mode={data.period_mode}
                selectedKey={
                  data.period_mode === "month" && month !== "All"
                    ? Number(month)
                    : null
                }
                onOpen={openPeriod}
                onRowClick={
                  data.period_mode === "year"
                    ? (p) => setMonthsYear(p.key)
                    : undefined
                }
                ui={ui}
                t={t}
              />
            )}
          </div>

          {(() => {
            const srcs = data.summary.sources || [];
            const total = srcs.reduce((n, x) => n + x.count, 0);
            if (total === 0) return null;
            const fallbackTotal = srcs
              .filter((x) => isFallback(x.start, x.end))
              .reduce((n, x) => n + x.count, 0);
            return (
              <div style={ui.card}>
                <div style={ui.cardHead}>
                  <h3 style={ui.cardTitle}>
                    <IconChip name="info" t={t} />
                    Where the TAT dates came from
                  </h3>
                  <span style={ui.pillAccent}>
                    {fmt(total)} apps counted
                  </span>
                  {fallbackTotal > 0 && (
                    <span style={ui.pillAmber}>
                      {fmt(fallbackTotal)} used Date Decked / Date Released
                    </span>
                  )}
                  <span
                    style={{
                      marginLeft: "auto",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: "0.68rem",
                      color: t.ink3,
                    }}
                  >
                    {sourceFilter
                      ? "Companies and Drugs show only the selected line."
                      : "Click a line to filter Companies and Drugs."}
                    {sourceFilter && (
                      <button
                        type="button"
                        onClick={() => setSourceFilter(null)}
                        style={{
                          ...ui.button,
                          height: 26,
                          padding: "0 11px",
                          fontSize: "0.68rem",
                        }}
                        onMouseEnter={ui.hoverOn}
                        onMouseLeave={(e) => ui.hoverOff(e, t.surface)}
                      >
                        Clear filter
                        <Icon name="close" size={11} />
                      </button>
                    )}
                  </span>
                </div>
                <div style={{ padding: "0.4rem 0" }}>
                  {srcs.map((x) => {
                    const fb = isFallback(x.start, x.end);
                    const active =
                      !!sourceFilter &&
                      sourceFilter.start === x.start &&
                      sourceFilter.end === x.end;
                    return (
                      <div
                        key={`${x.start}-${x.end}`}
                        role="button"
                        tabIndex={0}
                        aria-pressed={active}
                        title={
                          active
                            ? "Click to show all apps again"
                            : "Click to filter Companies and Drugs to these apps"
                        }
                        onClick={() => toggleSource(x)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleSource(x);
                          }
                        }}
                        onMouseEnter={(e) =>
                          !active &&
                          (e.currentTarget.style.background = t.rowHover)
                        }
                        onMouseLeave={(e) =>
                          !active &&
                          (e.currentTarget.style.background = "transparent")
                        }
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "minmax(240px, 300px) 90px 56px minmax(0, 1fr)",
                          columnGap: 18,
                          alignItems: "center",
                          padding: "9px 1.1rem",
                          borderBottom: `1px solid ${t.line}`,
                          borderLeft: `3px solid ${active ? t.blue : "transparent"}`,
                          background: active ? t.blueSoft : "transparent",
                          cursor: "pointer",
                          transition: "background .12s",
                          fontSize: "0.76rem",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 9,
                            fontWeight: 600,
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: fb ? AMBER : t.accent,
                            }}
                          />
                          {sourceText(x)}
                        </span>
                        <span
                          style={{
                            fontWeight: 600,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {fmt(x.count)} apps
                        </span>
                        <span style={{ color: t.ink3 }}>
                          {Math.round((x.count / total) * 100)}%
                        </span>
                        <span style={{ color: t.ink3, fontSize: "0.7rem" }}>
                          {sourceHint(x)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div
                  style={{
                    padding: "0.7rem 1.1rem",
                    fontSize: "0.7rem",
                    color: t.ink3,
                    lineHeight: 1.6,
                  }}
                >
                  The start is the first dated step in the application log, or
                  the Date Decked when the log has none. The end is the
                  finish of the {roleWord}'s own step in the log, or the Date
                  Released when the log has none.
                </div>
              </div>
            );
          })()}

          {rankedTable("Companies", "building", "Company", "company", data.companies)}
          {rankedTable(
            "Drugs (Generic Name)",
            "pill",
            "Generic Name",
            "drug",
            data.drugs,
          )}

          {(data.summary.without_company > 0 ||
            data.summary.without_generic > 0) && (
            <div style={{ fontSize: "0.7rem", color: t.ink3 }}>
              Not in the Company table: {fmt(data.summary.without_company)} app
              {data.summary.without_company === 1 ? "" : "s"} with no company
              name. Not in the Drug table: {fmt(data.summary.without_generic)}{" "}
              app{data.summary.without_generic === 1 ? "" : "s"} with no generic
              name.
            </div>
          )}

          {/* skipped */}
          <div style={ui.card}>
            <div style={ui.cardHead}>
              <h3 style={ui.cardTitle}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 9,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: t.amberSoft,
                    border: `1px solid ${t.amberLine}`,
                    color: t.amberText,
                  }}
                >
                  <Icon name="alert" size={15} />
                </span>
                Skipped Applications
              </h3>
              <span style={ui.pillAmber}>{fmt(data.skipped.total)} apps</span>
              {data.skipped.total > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSkipped((s) => !s)}
                  style={{
                    ...ui.button,
                    marginLeft: "auto",
                    height: 28,
                    padding: "0 12px",
                    fontSize: "0.7rem",
                  }}
                  onMouseEnter={ui.hoverOn}
                  onMouseLeave={(e) => ui.hoverOff(e, t.surface)}
                >
                  {showSkipped ? "Hide list" : "Show list"}
                </button>
              )}
            </div>
            {data.skipped.total === 0 ? (
              empty("No applications were skipped.")
            ) : (
              <>
                <div
                  style={{
                    padding: "0.8rem 1.1rem",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  {data.skipped.by_reason.map((r) => (
                    <span
                      key={r.reason}
                      style={{
                        ...ui.pill,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        fontSize: "0.7rem",
                        color: t.ink,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: AMBER,
                        }}
                      />
                      {r.reason}
                      <span style={{ color: t.ink3 }}>{fmt(r.count)}</span>
                    </span>
                  ))}
                </div>
                {showSkipped && (
                  <div
                    style={{
                      maxHeight: 420,
                      overflow: "auto",
                      borderTop: `1px solid ${t.line}`,
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={ui.th}>DTN</th>
                          <th style={ui.th}>Company</th>
                          <th style={ui.th}>Generic Name</th>
                          <th style={ui.th}>TAT Start</th>
                          <th style={ui.th}>TAT End</th>
                          <th style={ui.th}>Date Released</th>
                          <th style={ui.th}>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.skipped.rows.map((r) => (
                          <tr
                            key={r.db_id}
                            style={{ transition: "background .12s" }}
                            {...rowHover}
                          >
                            <td style={{ ...ui.td, whiteSpace: "nowrap" }}>
                              {r.dtn || "—"}
                            </td>
                            <td style={ui.td}>{r.company || "—"}</td>
                            <td style={{ ...ui.td, color: t.ink2 }}>
                              {r.generic_name || "—"}
                            </td>
                            <td style={{ ...ui.td, whiteSpace: "nowrap", color: t.ink2 }}>
                              {r.tat_start || "—"}
                              <SourceTag
                                label={startLabel(r.tat_start_src)}
                                fallback={r.tat_start_src === "decked"}
                                show={!!r.tat_start}
                                t={t}
                              />
                            </td>
                            <td style={{ ...ui.td, whiteSpace: "nowrap", color: t.ink2 }}>
                              {r.tat_end || "—"}
                              <SourceTag
                                label={endLabel(r.tat_end_src)}
                                fallback={r.tat_end_src === "released"}
                                show={!!r.tat_end}
                                t={t}
                              />
                            </td>
                            <td style={{ ...ui.td, whiteSpace: "nowrap", color: t.ink2 }}>
                              {r.date_released || "—"}
                            </td>
                            <td style={{ ...ui.td, whiteSpace: "nowrap" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 7,
                                }}
                              >
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    background: AMBER,
                                  }}
                                />
                                {r.reason}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {data.skipped.total > data.skipped.shown && (
                      <div
                        style={{
                          padding: "0.7rem 1.1rem",
                          fontSize: "0.7rem",
                          color: t.ink3,
                        }}
                      >
                        Showing the latest {fmt(data.skipped.shown)} of{" "}
                        {fmt(data.skipped.total)} skipped applications.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* how it is computed */}
          <div
            style={{
              paddingTop: "1rem",
              borderTop: `1px solid ${t.line}`,
              fontSize: "0.68rem",
              lineHeight: 1.7,
              color: t.ink3,
            }}
          >
            {Object.values(data.formula).map((line) => (
              <div key={line} style={{ display: "flex", gap: 8 }}>
                <span aria-hidden="true">·</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pdfOpen && data && (
        <ExportPdfModal
          subtitle={`${data.evaluator.full_name} · ${periodLabel}`}
          busy={pdfBusy}
          darkMode={darkMode}
          onGenerate={generatePdf}
          onCancel={() => setPdfOpen(false)}
        />
      )}

      {monthsYear && evaluator && (
        <YearMonthsModal
          year={monthsYear}
          userId={evaluator.user_id}
          role={role}
          personName={data?.evaluator?.full_name}
          darkMode={darkMode}
          blocked={!!periodTarget}
          onOpenList={openMonthPeriod}
          onClose={() => setMonthsYear(null)}
        />
      )}

      {recordsTarget && evaluator && (
        <EvaluatorRecordsModal
          kind={recordsTarget.kind}
          eyebrow={recordsTarget.kind === "drug" ? "Drug" : "Company"}
          iconName={recordsTarget.kind === "drug" ? "pill" : "building"}
          title={recordsTarget.name}
          context={`Released in ${periodLabel}${sourceFilter ? ` · TAT from ${sourceText(sourceFilter)}` : ""}`}
          loadKey={`${recordsTarget.kind}|${recordsTarget.key}|${evaluator.user_id}|${year}|${month}|${role}|${sourceKey ?? "all"}`}
          loader={() =>
            getEvaluatorRecords({
              user_id: evaluator.user_id,
              kind: recordsTarget.kind,
              key: recordsTarget.key,
              year,
              month: year === "All" ? "All" : month,
              page: 1,
              page_size: 2000,
              role,
              source: sourceKey,
            })
          }
          evaluator={data?.evaluator}
          colors={colors}
          darkMode={darkMode}
          onClose={() => setRecordsTarget(null)}
        />
      )}

      {periodTarget &&
        evaluator &&
        (() => {
          const { side, bucket, seg } = periodTarget;
          const sideWord =
            side === "received" ? "Received" : side === "released" ? "Released" : "Month";
          // a list opened from the month-by-month dialog carries its own year
          const listYear = periodTarget.year ?? year;
          const label =
            periodTarget.year || data?.period_mode === "month"
              ? `${periodTarget.label} ${listYear}`
              : periodTarget.label;
          const listTitle =
            side === "either"
              ? `Received or released in ${label}${periodTarget.extra ? ` · ${periodTarget.extra.name}` : ""}`
              : `${sideWord} in ${label}`;
          return (
            <EvaluatorRecordsModal
              kind="period"
              eyebrow={sideWord}
              iconName="calendar"
              title={listTitle}
              context={null}
              loadKey={`period|${side}|${bucket}|${seg?.key ?? "all"}|${periodTarget.extra?.name ?? ""}|${evaluator.user_id}|${listYear}|${role}`}
              loader={() =>
                getEvaluatorPeriodRecords({
                  user_id: evaluator.user_id,
                  side,
                  bucket,
                  year: listYear,
                  other_year: seg && seg.key !== "rest" ? seg.year : undefined,
                  other_month: seg && seg.key !== "rest" ? seg.month : undefined,
                  rest: seg?.key === "rest" ? true : undefined,
                  company_key: periodTarget.extra?.company_key,
                  drug_key: periodTarget.extra?.drug_key,
                  doc_type: periodTarget.extra?.doc_type,
                  page: 1,
                  page_size: 2000,
                  role,
                }).then((res) =>
                  // the list is narrowed to one company / drug / type: say so
                  periodTarget.extra ? { ...res, name: listTitle } : res,
                )
              }
              evaluator={data?.evaluator}
              colors={colors}
              darkMode={darkMode}
              onClose={() => setPeriodTarget(null)}
            />
          );
        })()}
    </div>
  );
}

export default EvaluatorsMonitoringPage;
