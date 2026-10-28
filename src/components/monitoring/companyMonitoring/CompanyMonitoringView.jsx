// src/components/monitoring/companyMonitoring/CompanyMonitoringView.jsx
// Search one or more companies, then see how many applications were received
// and processed per month, the turnaround time (TAT) of every application,
// and who the evaluator was.
//
// Selected names that only differ by capitalization, spaces or punctuation are
// detected and the user is asked whether they are the same company. Merged
// names are shown as one company, but every name variant is still sent to the
// API so all of their applications are counted.
import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  getAnalyticsAvailableYears,
  searchCompanyNames,
  getCompanyMonitoring,
  getCompanyMonitoringRecords,
} from "../../../api/analytics";
import { FB } from "../analytics/analyticsConstants";
import { SectionCard } from "../analytics/SectionCard";
import CompanyExportPdfModal from "./CompanyExportPdfModal";
import ReleasedDocsModal from "./ReleasedDocsModal";

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const GREEN = "#36a420";
const RED = "#e02020";
const AMBER = "#f59e0b";
const TEAL = "#0891b2";
const PAGE_SIZE = 25;
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
    ? "-"
    : Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 });
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

// Same key the backend uses to group companies
const ckey = (name) =>
  String(name ?? "")
    .trim()
    .toUpperCase();

// "Looks the same" key: ignores capitalization, spaces and punctuation
const sameKey = (name) =>
  String(name ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");

// Group variants ({name, apps}) that look the same
const bucketize = (list) => {
  const m = new Map();
  list.forEach((v) => {
    const k = sameKey(v.name);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(v);
  });
  return [...m.values()];
};
const sigOf = (variants) =>
  variants
    .map((v) => v.name)
    .sort()
    .join("|");
const makeGroup = (variants) => ({
  id: sigOf(variants),
  // label = the spelling with the most applications
  label: variants.reduce((a, b) => (b.apps > a.apps ? b : a)).name,
  variants,
});
const variantsToMap = (groups) =>
  Object.fromEntries(
    groups.flatMap((g) => g.variants).map((v) => [ckey(v.name), v]),
  );

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// ── "Are these the same company?" dialog ──
function SameCompanyDialog({
  ui,
  darkMode,
  buckets,
  choice,
  setChoice,
  onCancel,
  onConfirm,
}) {
  const line = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const opt = (active, color) => ({
    flex: 1,
    padding: "7px 10px",
    fontSize: "0.76rem",
    fontWeight: active ? 700 : 500,
    borderRadius: 8,
    border: `1px solid ${active ? color : line}`,
    background: active ? `${color}1f` : "transparent",
    color: active ? color : ui.textMuted,
    cursor: "pointer",
    fontFamily: font,
  });

  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3000,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: font,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: "92vw",
          maxHeight: "86vh",
          overflowY: "auto",
          background: darkMode ? "#1f2023" : "#fff",
          color: ui.textPrimary,
          borderRadius: 14,
          border: `1px solid ${line}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          padding: 20,
        }}
      >
        <div style={{ fontSize: "1rem", fontWeight: 700 }}>
          🏢 Same company?
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: ui.textMuted,
            margin: "2px 0 14px",
          }}
        >
          These names only differ by capital letters, spaces or punctuation. If
          they are the same company they will be shown as one, and the
          applications of all of these names will still be counted.
        </div>

        {buckets.map((b) => {
          const s = sigOf(b);
          const merge = choice[s] === "merge";
          return (
            <div
              key={s}
              style={{
                border: `1px solid ${line}`,
                borderRadius: 10,
                padding: 12,
                marginBottom: 10,
              }}
            >
              {b.map((v) => (
                <div
                  key={v.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    fontSize: "0.8rem",
                    padding: "3px 0",
                  }}
                >
                  <span>{v.name}</span>
                  <span style={{ color: ui.textMuted, whiteSpace: "nowrap" }}>
                    {fmt(v.apps)} apps
                  </span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  onClick={() => setChoice((c) => ({ ...c, [s]: "merge" }))}
                  style={opt(merge, FB)}
                >
                  ✓ Same company
                </button>
                <button
                  onClick={() => setChoice((c) => ({ ...c, [s]: "separate" }))}
                  style={opt(!merge, AMBER)}
                >
                  Keep separate
                </button>
              </div>
            </div>
          );
        })}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 14,
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "7px 14px",
              fontSize: "0.78rem",
              borderRadius: 8,
              border: `1px solid ${line}`,
              background: "transparent",
              color: ui.textPrimary,
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "7px 16px",
              fontSize: "0.78rem",
              fontWeight: 700,
              borderRadius: 8,
              border: "none",
              background: FB,
              color: "#fff",
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function CompanyMonitoringView({ ui, darkMode }) {
  const thisYear = String(new Date().getFullYear());
  const line = ui.cardBorder;

  // ── Filters ──
  const [query, setQuery] = useState("");
  // Applied companies: [{ id, label, variants: [{ name, apps }] }]
  const [groups, setGroups] = useState([]);
  const [pending, setPending] = useState({}); // ticked in dropdown: { KEY: { name, apps } }
  const [confirm, setConfirm] = useState(null); // { buckets, all, choice }
  const decisions = useRef({}); // remembered answers: { signature: "merge" | "separate" }
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState("All");
  const [basis, setBasis] = useState("received"); // received | released
  const [years, setYears] = useState([thisYear]);

  // ── Autocomplete ──
  const [suggestions, setSuggestions] = useState([]);
  const [sugOpen, setSugOpen] = useState(false);
  const [sugLoading, setSugLoading] = useState(false);
  const [sugPos, setSugPos] = useState(null); // fixed position of the dropdown
  const sugRun = useRef(0);
  const inputRef = useRef(null);
  const debouncedQuery = useDebounced(query.trim(), 300);

  // ── Summary ──
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFormula, setShowFormula] = useState(true);
  const [periodView, setPeriodView] = useState("released"); // released | received

  // ── Applications list ──
  const [evalFilter, setEvalFilter] = useState(null); // user_id | "none" | null
  const [recSearch, setRecSearch] = useState("");
  const debouncedRecSearch = useDebounced(recSearch.trim(), 350);
  const [sort, setSort] = useState("received"); // received | tat
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState({ total: 0, data: [] });
  const [recLoading, setRecLoading] = useState(false);
  const recRun = useRef(0);

  // ── PDF export ──
  const [showExportPdf, setShowExportPdf] = useState(false);
  // ── Released-by-document-type modal ──
  const [docModal, setDocModal] = useState(null); // { label, year, month, view }

  const hasCompany = groups.length > 0;
  const pendingList = Object.values(pending);

  // Every name variant, sent to the API so all applications are captured
  const companyNames = useMemo(
    () => groups.flatMap((g) => g.variants.map((v) => v.name)),
    [groups],
  );
  const title =
    groups.length === 1 ? groups[0].label : `${groups.length} companies`;
  const mergedVariantCount = groups.reduce(
    (n, g) => n + (g.variants.length > 1 ? g.variants.length : 0),
    0,
  );

  // Years that exist in the data
  useEffect(() => {
    getAnalyticsAvailableYears()
      .then((res) => {
        const list = (res?.years ?? []).filter((y) => y !== "All");
        const all = [...new Set([...list, thisYear])].sort(
          (a, b) => Number(b) - Number(a),
        );
        setYears(all);
      })
      .catch(() => {});
  }, [thisYear]);

  // Keep the (portal) dropdown aligned with the input
  useEffect(() => {
    if (!sugOpen) return;
    const update = () => {
      const r = inputRef.current?.getBoundingClientRect();
      if (r) setSugPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [sugOpen]);

  // Company suggestions
  useEffect(() => {
    if (!sugOpen || debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    const id = ++sugRun.current;
    setSugLoading(true);
    searchCompanyNames(debouncedQuery)
      .then((res) => {
        if (id === sugRun.current) setSuggestions(res?.data ?? []);
      })
      .catch(() => {
        if (id === sugRun.current) setSuggestions([]);
      })
      .finally(() => {
        if (id === sugRun.current) setSugLoading(false);
      });
  }, [debouncedQuery, sugOpen]);

  // Summary
  useEffect(() => {
    if (!hasCompany) {
      setData(null);
      return;
    }
    let stale = false;
    setLoading(true);
    setError(null);
    getCompanyMonitoring({ company: companyNames, year, month, basis })
      .then((res) => !stale && setData(res))
      .catch((e) => {
        if (!stale) {
          setData(null);
          setError(
            e?.response?.data?.detail || e?.message || "Failed to load data.",
          );
        }
      })
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
  }, [companyNames, hasCompany, year, month, basis]);

  // Reset paging when the scope changes
  useEffect(() => {
    setPage(1);
  }, [companyNames, year, month, basis, evalFilter, debouncedRecSearch, sort]);
  useEffect(() => {
    setEvalFilter(null);
  }, [companyNames, year, month, basis]);

  // Applications
  useEffect(() => {
    if (!hasCompany) {
      setRecords({ total: 0, data: [] });
      return;
    }
    const id = ++recRun.current;
    setRecLoading(true);
    getCompanyMonitoringRecords({
      company: companyNames,
      year,
      month,
      basis,
      sort,
      page,
      page_size: PAGE_SIZE,
      ...(evalFilter != null ? { user_id: evalFilter } : {}),
      ...(debouncedRecSearch ? { search: debouncedRecSearch } : {}),
    })
      .then((res) => id === recRun.current && setRecords(res))
      .catch(() => id === recRun.current && setRecords({ total: 0, data: [] }))
      .finally(() => id === recRun.current && setRecLoading(false));
  }, [
    companyNames,
    hasCompany,
    year,
    month,
    basis,
    sort,
    page,
    evalFilter,
    debouncedRecSearch,
  ]);

  // Tick / untick a company in the dropdown
  const togglePending = (sg) => {
    const k = ckey(sg.company);
    setPending((p) => {
      const next = { ...p };
      if (next[k]) delete next[k];
      else next[k] = { name: sg.company, apps: sg.applications };
      return next;
    });
  };

  const closeDropdown = () => {
    setQuery("");
    setSugOpen(false);
    setSuggestions([]);
    inputRef.current?.blur();
  };

  // Build the final groups from the buckets and the merge decisions
  const finalize = (buckets, choices) => {
    const next = [];
    buckets.forEach((b) => {
      if (b.length === 1) return next.push(makeGroup(b));
      const s = sigOf(b);
      const decision = choices?.[s] ?? decisions.current[s] ?? "separate";
      decisions.current[s] = decision;
      if (decision === "merge") next.push(makeGroup(b));
      else b.forEach((v) => next.push(makeGroup([v])));
    });
    setGroups(next);
    setPending(variantsToMap(next));
    setConfirm(null);
    closeDropdown();
  };

  // Apply the ticked companies (ask first when some look like the same company)
  const applyPending = () => {
    if (pendingList.length === 0) return;
    const buckets = bucketize(pendingList);
    const toAsk = buckets.filter(
      (b) => b.length > 1 && !decisions.current[sigOf(b)],
    );
    if (toAsk.length > 0) {
      setConfirm({
        buckets: toAsk,
        all: buckets,
        choice: Object.fromEntries(toAsk.map((b) => [sigOf(b), "merge"])),
      });
      setSugOpen(false);
      inputRef.current?.blur();
      return;
    }
    finalize(buckets);
  };

  // Remove one applied company (chip)
  const removeGroup = (id) => {
    const next = groups.filter((g) => g.id !== id);
    setGroups(next);
    setPending(variantsToMap(next));
    if (next.length === 0) setData(null);
  };
  const clear = () => {
    setGroups([]);
    setPending({});
    setQuery("");
    setData(null);
    setRecSearch("");
    setShowExportPdf(false);
    setDocModal(null);
    decisions.current = {};
  };

  // ── Styles ──
  const inputSt = {
    background: ui.inputBg,
    border: `1px solid ${line}`,
    borderRadius: 8,
    padding: "7px 11px",
    fontSize: "0.8rem",
    color: ui.textPrimary,
    outline: "none",
    fontFamily: font,
    colorScheme: darkMode ? "dark" : "light",
  };
  const seg = (active) => ({
    padding: "6px 12px",
    fontSize: "0.76rem",
    fontWeight: active ? 700 : 500,
    borderRadius: 8,
    border: `1px solid ${active ? FB : line}`,
    background: active ? `${FB}1f` : "transparent",
    color: active ? FB : ui.textMuted,
    cursor: "pointer",
    fontFamily: font,
  });
  const th = (align = "left") => ({
    textAlign: align,
    fontSize: "0.64rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
    padding: "8px 10px",
    borderBottom: `1px solid ${line}`,
    whiteSpace: "nowrap",
  });
  const td = (align = "left", extra = {}) => ({
    textAlign: align,
    fontSize: "0.78rem",
    color: ui.textPrimary,
    padding: "8px 10px",
    borderBottom: `1px solid ${ui.divider}`,
    ...extra,
  });

  const s = data?.summary;
  const byRecv = periodView === "received";
  // Normalized rows for the per-period chart/table
  const periodRows = useMemo(
    () =>
      (data?.periods ?? []).map((p) => ({
        ...p,
        n: byRecv ? (p.released_of_received ?? 0) : p.processed,
        avg: byRecv ? p.avg_tat_received : p.avg_tat,
      })),
    [data, byRecv],
  );
  const periodMax = useMemo(
    () => Math.max(...periodRows.flatMap((p) => [p.received, p.n]), 1),
    [periodRows],
  );
  const totalPages = Math.max(Math.ceil((records.total ?? 0) / PAGE_SIZE), 1);
  const periodWord = year === "All" ? "year" : "month";
  const scopeLabel =
    year === "All"
      ? "All years"
      : month === "All"
        ? year
        : `${MONTHS[Number(month) - 1]} ${year}`;

  // Worked example for the formula box
  const example = records.data.find(
    (r) => r.tat_days != null && r.state === "Released",
  );

  // Worked example for the Avg TAT column: first period that has an average
  const avgExample = periodRows.find((p) => p.avg != null && p.n > 0);
  const weighted = periodRows.filter((p) => p.avg != null && p.n > 0);
  const totalN = byRecv ? (s?.released_of_received ?? 0) : (s?.processed ?? 0);
  const totalAvg = byRecv ? s?.avg_tat_received : s?.avg_tat;

  // Open the "released by document type" modal for a row (or the total)
  const openDocs = (label, y, m, n) => {
    if (!n) return;
    setDocModal({ label, year: y, month: m, view: periodView });
  };
  const rowDocs = (p) =>
    year === "All"
      ? openDocs(p.label, String(p.key), "All", p.n)
      : openDocs(`${p.label} ${year}`, year, String(p.key), p.n);
  const linkSt = (n) =>
    n > 0
      ? {
          color: GREEN,
          fontWeight: 700,
          textDecoration: "underline",
          cursor: "pointer",
        }
      : {};
  // ── Hover explanations for the per-period table ──
  const sumRecv = periodRows.reduce((a, p) => a + p.received, 0);
  const joinNums = (arr) => arr.map((x) => fmt(x)).join(" + ");

  const rowTip = {
    received: (p) => `Applications received in ${p.label}: ${fmt(p.received)}`,
    n: (p) =>
      byRecv
        ? `Of the ${fmt(p.received)} received in ${p.label}, ${fmt(p.n)} are already released (even if released in a later ${periodWord}).`
        : `${fmt(p.n)} applications were released (COMPLETED + valid Date Released) in ${p.label}, no matter when received.`,
    open: (p) =>
      `Still open = Received − Released\n${fmt(p.received)} − ${fmt(p.n)} = ${fmt(p.received - p.n)}`,
    pct: (p) =>
      p.received > 0
        ? `% released = Released ÷ Received × 100\n${fmt(p.n)} ÷ ${fmt(p.received)} × 100 = ${pct(p.n, p.received)}%`
        : `No applications received in ${p.label}.`,
    avg: (p) =>
      p.avg == null
        ? byRecv
          ? `None of the applications received in ${p.label} is released yet, so there is no TAT to average.`
          : `No application was released in ${p.label}, so there is no TAT to average.`
        : `Avg TAT = sum of TAT ÷ number of released apps\n≈ ${fmtAvg(p.avg * p.n)} working days ÷ ${fmt(p.n)} = ${fmtAvg(p.avg)}\n(${fmt(p.n)} ${byRecv ? "released app(s) received" : "app(s) released"} in ${p.label})`,
  };

  const totalTip = {
    received: `Sum of all ${periodWord}s:\n${joinNums(periodRows.map((p) => p.received))} = ${fmt(sumRecv)}`,
    n: `Sum of all ${periodWord}s:\n${joinNums(periodRows.map((p) => p.n))} = ${fmt(totalN)}`,
    open: `Still open = Received − Released\n${fmt(s?.received)} − ${fmt(totalN)} = ${fmt((s?.received ?? 0) - totalN)}`,
    pct:
      (s?.received ?? 0) > 0
        ? `% released = Released ÷ Received × 100\n${fmt(totalN)} ÷ ${fmt(s.received)} × 100 = ${pct(totalN, s.received)}%\n(computed from the totals, not the average of the monthly %)`
        : "No applications received.",
    avg:
      weighted.length > 0
        ? `Avg TAT = sum of TAT of all released apps ÷ number of released apps\n≈ (${weighted
            .map((p) => `${fmtAvg(p.avg)} × ${fmt(p.n)}`)
            .join(
              " + ",
            )}) ÷ ${fmt(weighted.reduce((a, p) => a + p.n, 0))} = ${fmtAvg(totalAvg)}\n(not the average of the ${periodWord}ly averages)`
        : `No released applications, so there is no TAT to average.`,
  };

  // Data passed to the PDF: merged title + every name that was included
  const exportData = useMemo(
    () => (data ? { ...data, company: title, companies: companyNames } : null),
    [data, title, companyNames],
  );

  // Filters used by the PDF (same scope as the Applications list)
  const exportParams = {
    company: companyNames,
    year,
    month,
    basis,
    sort,
    ...(evalFilter != null ? { user_id: evalFilter } : {}),
    ...(debouncedRecSearch ? { search: debouncedRecSearch } : {}),
  };
  const evalRow =
    evalFilter != null
      ? (data?.evaluators ?? []).find(
          (e) => (e.unassigned ? "none" : String(e.user_id)) === evalFilter,
        )
      : null;
  const exportFilters = [
    evalRow ? `Evaluator: ${evalRow.code}` : null,
    debouncedRecSearch ? `Search: "${debouncedRecSearch}"` : null,
  ].filter(Boolean);

  const kpi = (label, value, sub, color) => (
    <div
      style={{
        background: ui.cardBg,
        border: `1px solid ${line}`,
        borderTop: `3px solid ${color}`,
        borderRadius: 10,
        padding: "11px 14px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: "0.64rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: ui.textMuted,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "1.55rem",
          fontWeight: 800,
          color,
          lineHeight: 1.25,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "0.7rem", color: ui.textMuted }}>{sub}</div>
    </div>
  );

  const badge = (text, color) => (
    <span
      style={{
        fontSize: "0.68rem",
        fontWeight: 700,
        padding: "2px 9px",
        borderRadius: 99,
        background: `${color}22`,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );

  const exportDisabled = loading || !data;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        fontFamily: font,
        padding: 4,
      }}
    >
      {/* ── Search & filters ── */}
      <SectionCard
        title="Company Monitoring"
        subtitle="Search one or more companies to see what was received, what was processed and how long each application took"
        icon="🏢"
        ui={ui}
        darkMode={darkMode}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div
            style={{ position: "relative", flex: "1 1 320px", maxWidth: 520 }}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSugOpen(true);
              }}
              onFocus={() => {
                setPending(variantsToMap(groups));
                setSugOpen(true);
              }}
              onBlur={() => setTimeout(() => setSugOpen(false), 150)}
              placeholder="Search company name (at least 2 letters)…"
              autoComplete="off"
              style={{ ...inputSt, width: "100%", boxSizing: "border-box" }}
            />
          </div>

          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              if (e.target.value === "All") setMonth("All");
            }}
            style={inputSt}
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
            title={year === "All" ? "Pick a year to filter by month" : ""}
            style={{ ...inputSt, opacity: year === "All" ? 0.5 : 1 }}
          >
            <option value="All">All months</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </select>
          {hasCompany && (
            <button onClick={clear} style={seg(false)}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* Selected companies */}
        {hasCompany && (
          <div
            style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}
          >
            {groups.map((g) => (
              <span
                key={g.id}
                title={
                  g.variants.length > 1
                    ? `Combined names:\n${g.variants.map((v) => v.name).join("\n")}`
                    : g.label
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 6px 4px 10px",
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  borderRadius: 99,
                  background: `${FB}1f`,
                  border: `1px solid ${FB}55`,
                  color: FB,
                }}
              >
                {g.label}
                {g.variants.length > 1 && (
                  <span style={{ fontWeight: 500, opacity: 0.8 }}>
                    · {g.variants.length} names
                  </span>
                )}
                <button
                  onClick={() => removeGroup(g.id)}
                  title="Remove"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: FB,
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    lineHeight: 1,
                    padding: "0 4px",
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Suggestions dropdown: rendered in <body> so the card's overflow can't clip it.
          onMouseDown preventDefault keeps focus in the input while ticking. */}
      {sugOpen &&
        sugPos &&
        debouncedQuery.length >= 2 &&
        createPortal(
          <div
            onMouseDown={(e) => e.preventDefault()}
            style={{
              position: "fixed",
              top: sugPos.top,
              left: sugPos.left,
              width: sugPos.width,
              zIndex: 2000,
              background: ui.cardBg,
              border: `1px solid ${line}`,
              borderRadius: 10,
              boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
              fontFamily: font,
              overflow: "hidden",
            }}
          >
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {sugLoading && suggestions.length === 0 ? (
                <div
                  style={{
                    padding: 12,
                    fontSize: "0.78rem",
                    color: ui.textMuted,
                  }}
                >
                  Searching…
                </div>
              ) : suggestions.length === 0 ? (
                <div
                  style={{
                    padding: 12,
                    fontSize: "0.78rem",
                    color: ui.textMuted,
                  }}
                >
                  No company found.
                </div>
              ) : (
                suggestions.map((sg) => {
                  const checked = !!pending[ckey(sg.company)];
                  return (
                    <label
                      key={sg.company}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = ui.hoverBg)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = checked
                          ? `${FB}12`
                          : "transparent")
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "9px 12px",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        color: ui.textPrimary,
                        borderBottom: `1px solid ${ui.divider}`,
                        background: checked ? `${FB}12` : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePending(sg)}
                        style={{ cursor: "pointer", flexShrink: 0 }}
                      />
                      <span style={{ flex: 1, minWidth: 0 }}>{sg.company}</span>
                      <span
                        style={{
                          color: ui.textMuted,
                          fontSize: "0.72rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmt(sg.applications)} apps
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderTop: `1px solid ${line}`,
                background: darkMode ? "rgba(255,255,255,0.03)" : "#f8f9fd",
              }}
            >
              <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
                {pendingList.length} selected
                {pendingList.length > 0 && (
                  <span
                    onClick={() => setPending({})}
                    style={{
                      marginLeft: 8,
                      color: FB,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Clear
                  </span>
                )}
              </span>
              <button
                onClick={applyPending}
                disabled={pendingList.length === 0}
                style={{
                  padding: "5px 14px",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  borderRadius: 8,
                  border: "none",
                  background: pendingList.length === 0 ? ui.inputBg : FB,
                  color: pendingList.length === 0 ? ui.textMuted : "#fff",
                  cursor: pendingList.length === 0 ? "not-allowed" : "pointer",
                  fontFamily: font,
                }}
              >
                Show {pendingList.length || ""} selected
              </button>
            </div>
          </div>,
          document.body,
        )}

      {/* Same company? */}
      {confirm && (
        <SameCompanyDialog
          ui={ui}
          darkMode={darkMode}
          buckets={confirm.buckets}
          choice={confirm.choice}
          setChoice={(fn) =>
            setConfirm((c) => ({ ...c, choice: fn(c.choice) }))
          }
          onCancel={() => setConfirm(null)}
          onConfirm={() => finalize(confirm.all, confirm.choice)}
        />
      )}

      {!hasCompany && (
        <div
          style={{
            textAlign: "center",
            padding: "56px 20px",
            color: ui.textMuted,
            background: ui.cardBg,
            border: `1px dashed ${line}`,
            borderRadius: 14,
            fontSize: "0.88rem",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>🏢</div>
          Search for one or more companies above to start monitoring.
        </div>
      )}

      {hasCompany && error && (
        <div style={{ color: RED, fontSize: "0.85rem", padding: 14 }}>
          ⚠️ {error}
        </div>
      )}

      {hasCompany && !error && (
        <>
          {/* ── KPIs ── */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "1.05rem",
                fontWeight: 800,
                color: ui.textPrimary,
              }}
            >
              {title}
            </span>
            <span style={{ fontSize: "0.78rem", color: ui.textMuted }}>
              {scopeLabel}
            </span>
            {mergedVariantCount > 0 && (
              <span
                title={groups
                  .filter((g) => g.variants.length > 1)
                  .map((g) => g.variants.map((v) => v.name).join("\n"))
                  .join("\n\n")}
                style={{
                  fontSize: "0.72rem",
                  color: ui.textMuted,
                  cursor: "help",
                }}
              >
                ⓘ includes {mergedVariantCount} spellings of the same company
              </span>
            )}
            {loading && (
              <span style={{ fontSize: "0.74rem", color: FB }}>Loading…</span>
            )}
            <button
              onClick={() => setShowExportPdf(true)}
              disabled={exportDisabled}
              title="Generate a PDF report"
              style={{
                ...inputSt,
                marginLeft: "auto",
                padding: "6px 14px",
                fontSize: "0.78rem",
                fontWeight: 700,
                color: FB,
                cursor: exportDisabled ? "not-allowed" : "pointer",
                opacity: exportDisabled ? 0.5 : 1,
              }}
            >
              📄 Export PDF
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 10,
              opacity: loading ? 0.55 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {kpi(
              "Received",
              fmt(s?.received),
              "Applications received in the period",
              FB,
            )}
            {kpi(
              "Processed",
              fmt(s?.processed),
              "Completed and released in the period",
              GREEN,
            )}
            {kpi(
              "Still open",
              fmt(s?.still_open),
              "Received in the period, not yet released",
              AMBER,
            )}
            {kpi(
              "Avg TAT",
              s?.avg_tat == null ? "-" : `${fmtAvg(s.avg_tat)} d`,
              s?.tat_count
                ? `Working days, ${fmt(s.tat_count)} released apps`
                : "No released applications",
              TEAL,
            )}
            {kpi(
              "Within charter",
              fmt(s?.within),
              `${pct(s?.within ?? 0, (s?.within ?? 0) + (s?.beyond ?? 0))}% of released apps with a charter`,
              GREEN,
            )}
            {kpi(
              "Beyond charter",
              fmt(s?.beyond),
              `${pct(s?.beyond ?? 0, (s?.within ?? 0) + (s?.beyond ?? 0))}% of released apps with a charter`,
              RED,
            )}
          </div>

          {/* ── TAT formula ── */}
          <div
            style={{
              background: darkMode ? "#1a2744" : "#eef4ff",
              border: `1px solid ${FB}55`,
              borderRadius: 12,
              padding: "10px 14px",
            }}
          >
            <div
              onClick={() => setShowFormula((v) => !v)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: FB,
              }}
            >
              <span>🧮 How is Turn Around Time (TAT) computed?</span>
              <span>{showFormula ? "▾" : "▸"}</span>
            </div>
            {showFormula && data?.formula && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: "0.78rem",
                  color: ui.textPrimary,
                  lineHeight: 1.6,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontFamily: "monospace",
                    marginBottom: 4,
                  }}
                >
                  {data.formula.tat}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: ui.textSub }}>
                  <li>{data.formula.counting}</li>
                  <li>{data.formula.ongoing}</li>
                  <li>{data.formula.charter}</li>
                  <li>{data.formula.processed}</li>
                  <li>{data.formula.evaluator}</li>
                </ul>
                {example && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "7px 10px",
                      borderRadius: 8,
                      background: darkMode ? "rgba(255,255,255,0.05)" : "#fff",
                      border: `1px dashed ${FB}66`,
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                    }}
                  >
                    Example, DTN {example.dtn}: {example.date_received} to{" "}
                    {example.date_released} ={" "}
                    <b>{example.tat_days} working days</b>
                    {example.charter_days
                      ? ` (charter ${example.charter_days} days = ${example.timeline})`
                      : ""}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Per month / per year ── */}
          <SectionCard
            title={
              byRecv
                ? `Received and how many got released, per ${periodWord}`
                : `Received vs Processed per ${periodWord}`
            }
            subtitle={
              byRecv
                ? `${scopeLabel} · of the applications received in each ${periodWord}, how many are released (any date)`
                : `${scopeLabel} · applications released in each ${periodWord}, no matter when received`
            }
            icon="📊"
            ui={ui}
            darkMode={darkMode}
            action={
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  onClick={() => setPeriodView("received")}
                  style={seg(periodView === "received")}
                  title="Group by the date received: of those received, how many were released"
                >
                  By Received
                </button>
                <button
                  onClick={() => setPeriodView("released")}
                  style={seg(periodView === "released")}
                  title="Group by the date released: how many were released in the period"
                >
                  By Released
                </button>
              </div>
            }
          >
            {!data || data.periods.length === 0 ? (
              <div
                style={{
                  color: ui.textMuted,
                  fontSize: "0.82rem",
                  padding: 12,
                }}
              >
                No data for this period.
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    fontSize: "0.72rem",
                    color: ui.textMuted,
                    marginBottom: 8,
                  }}
                >
                  <span>
                    <span
                      style={{
                        display: "inline-block",
                        width: 9,
                        height: 9,
                        background: FB,
                        borderRadius: 2,
                        marginRight: 5,
                      }}
                    />
                    Received
                  </span>
                  <span>
                    <span
                      style={{
                        display: "inline-block",
                        width: 9,
                        height: 9,
                        background: GREEN,
                        borderRadius: 2,
                        marginRight: 5,
                      }}
                    />
                    {byRecv ? "Released (of those received)" : "Processed"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 6,
                    height: 150,
                    borderBottom: `1px solid ${line}`,
                    padding: "0 2px",
                  }}
                >
                  {periodRows.map((p) => (
                    <div
                      key={p.key}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        gap: 2,
                        height: "100%",
                      }}
                    >
                      {[
                        { v: p.received, c: FB, n: "Received" },
                        {
                          v: p.n,
                          c: GREEN,
                          n: byRecv ? "Released (of received)" : "Processed",
                        },
                      ].map((b) => (
                        <div
                          key={b.n}
                          title={`${p.label} ${b.n}: ${fmt(b.v)}`}
                          style={{
                            width: "42%",
                            maxWidth: 22,
                            height: `${Math.max((b.v / periodMax) * 100, b.v > 0 ? 2 : 0)}%`,
                            background: b.c,
                            borderRadius: "4px 4px 0 0",
                            position: "relative",
                          }}
                        >
                          {b.v > 0 && (
                            <span
                              style={{
                                position: "absolute",
                                top: -14,
                                left: "50%",
                                transform: "translateX(-50%)",
                                fontSize: "0.6rem",
                                color: ui.textMuted,
                              }}
                            >
                              {fmt(b.v)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div
                  style={{ display: "flex", gap: 6, padding: "4px 2px 10px" }}
                >
                  {periodRows.map((p) => (
                    <div
                      key={p.key}
                      style={{
                        flex: 1,
                        textAlign: "center",
                        fontSize: "0.68rem",
                        color: ui.textMuted,
                      }}
                    >
                      {p.label}
                    </div>
                  ))}
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={th()}>
                          {year === "All" ? "Year" : "Month"}
                        </th>
                        <th style={th("right")}>Received</th>
                        <th style={th("right")}>
                          {byRecv ? "Released (of received)" : "Processed"}
                        </th>
                        {byRecv && <th style={th("right")}>Still open</th>}
                        {byRecv && <th style={th("right")}>% released</th>}
                        <th
                          style={th("right")}
                          title="Average working days (Mon-Fri) from Date Received to Date Released"
                        >
                          Avg TAT (working days) ⓘ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodRows.map((p) => (
                        <tr key={p.key}>
                          <td style={td()}>{p.label}</td>
                          <td
                            style={td("right", { cursor: "help" })}
                            title={rowTip.received(p)}
                          >
                            {fmt(p.received)}
                          </td>
                          <td
                            style={td("right", {
                              cursor: "help",
                              ...linkSt(p.n),
                            })}
                            title={`${p.n > 0 ? "Click to see the document types\n\n" : ""}${rowTip.n(p)}`}
                            onClick={() => rowDocs(p)}
                          >
                            {fmt(p.n)}
                          </td>
                          {byRecv && (
                            <td
                              style={td("right", {
                                cursor: "help",
                                color:
                                  p.received - p.n > 0 ? AMBER : ui.textMuted,
                              })}
                              title={rowTip.open(p)}
                            >
                              {fmt(p.received - p.n)}
                            </td>
                          )}
                          {byRecv && (
                            <td
                              style={td("right", { cursor: "help" })}
                              title={rowTip.pct(p)}
                            >
                              {p.received > 0
                                ? `${pct(p.n, p.received)}%`
                                : "-"}
                            </td>
                          )}
                          <td
                            style={td("right", { cursor: "help" })}
                            title={rowTip.avg(p)}
                          >
                            {fmtAvg(p.avg)}
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td style={td("left", { fontWeight: 800 })}>Total</td>
                        <td
                          style={td("right", {
                            fontWeight: 800,
                            cursor: "help",
                          })}
                          title={totalTip.received}
                        >
                          {fmt(s?.received)}
                        </td>
                        <td
                          style={td("right", {
                            fontWeight: 800,
                            cursor: "help",
                            ...linkSt(totalN),
                          })}
                          title={`${totalN > 0 ? "Click to see the document types\n\n" : ""}${totalTip.n}`}
                          onClick={() =>
                            openDocs(scopeLabel, year, month, totalN)
                          }
                        >
                          {fmt(totalN)}
                        </td>
                        {byRecv && (
                          <td
                            style={td("right", {
                              fontWeight: 800,
                              cursor: "help",
                            })}
                            title={totalTip.open}
                          >
                            {fmt((s?.received ?? 0) - totalN)}
                          </td>
                        )}
                        {byRecv && (
                          <td
                            style={td("right", {
                              fontWeight: 800,
                              cursor: "help",
                            })}
                            title={totalTip.pct}
                          >
                            {(s?.received ?? 0) > 0
                              ? `${pct(totalN, s.received)}%`
                              : "-"}
                          </td>
                        )}
                        <td
                          style={td("right", {
                            fontWeight: 800,
                            cursor: "help",
                          })}
                          title={totalTip.avg}
                        >
                          {fmtAvg(totalAvg)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* How the numbers are computed */}
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: darkMode ? "#1a2744" : "#eef4ff",
                    border: `1px solid ${FB}55`,
                    fontSize: "0.76rem",
                    color: ui.textPrimary,
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ fontWeight: 700, color: FB, marginBottom: 4 }}>
                    🧮{" "}
                    {byRecv
                      ? "How to read “By Received”"
                      : "How is the Avg TAT computed?"}
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    Avg TAT = sum of TAT ÷ number of released applications
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, color: ui.textSub }}>
                    {byRecv ? (
                      <>
                        <li>
                          Each {periodWord} counts the applications{" "}
                          <b>received</b> in it. <b>Released (of received)</b>{" "}
                          is how many of those are already released, even if the
                          release was in a later {periodWord}.
                        </li>
                        <li>
                          <b>Still open</b> = Received − Released. % released =
                          Released ÷ Received.
                        </li>
                        <li>
                          Avg TAT only counts the released ones, so a{" "}
                          {periodWord} with none released shows "-".
                        </li>
                      </>
                    ) : (
                      <>
                        <li>
                          The average of a {periodWord} only counts applications{" "}
                          <b>released in that {periodWord}</b> (Processed), no
                          matter when they were received. Processed = 0 shows
                          "-".
                        </li>
                        <li>
                          Because of this, Processed can be higher than Received
                          in the same {periodWord}. Use “By Received” to see
                          what happened to the applications received in a{" "}
                          {periodWord}.
                        </li>
                      </>
                    )}
                    <li>
                      Each application's TAT is the working days (Mon-Fri) from
                      Date Received to Date Released. Not released yet, or
                      released before received, are not included.
                    </li>
                    <li>
                      <b>Total</b> = sum of the TAT of all {fmt(totalN)}{" "}
                      released applications in this view ÷ {fmt(totalN)}. It is
                      not the average of the averages above.
                    </li>
                  </ul>
                  {avgExample && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "7px 10px",
                        borderRadius: 8,
                        background: darkMode
                          ? "rgba(255,255,255,0.05)"
                          : "#fff",
                        border: `1px dashed ${FB}66`,
                        fontFamily: "monospace",
                        fontSize: "0.74rem",
                      }}
                    >
                      Example, {avgExample.label}:{" "}
                      {byRecv
                        ? `${fmt(avgExample.received)} received, ${fmt(avgExample.n)} released, ${fmt(avgExample.received - avgExample.n)} still open. `
                        : `${fmt(avgExample.n)} released. `}
                      Total TAT ≈ {fmtAvg(avgExample.avg * avgExample.n)}{" "}
                      working days ÷ {fmt(avgExample.n)} ={" "}
                      <b>{fmtAvg(avgExample.avg)} avg TAT</b>
                    </div>
                  )}
                  {weighted.length > 1 && (
                    <div
                      style={{
                        marginTop: 6,
                        padding: "7px 10px",
                        borderRadius: 8,
                        background: darkMode
                          ? "rgba(255,255,255,0.05)"
                          : "#fff",
                        border: `1px dashed ${FB}66`,
                        fontFamily: "monospace",
                        fontSize: "0.74rem",
                      }}
                    >
                      Total: (
                      {weighted
                        .map((p) => `${fmtAvg(p.avg)} × ${fmt(p.n)}`)
                        .join(" + ")}
                      ) ÷ {fmt(weighted.reduce((a, p) => a + p.n, 0))} ={" "}
                      <b>
                        {fmtAvg(
                          weighted.reduce((a, p) => a + p.avg * p.n, 0) /
                            weighted.reduce((a, p) => a + p.n, 0),
                        )}
                      </b>
                    </div>
                  )}
                </div>
              </>
            )}
          </SectionCard>

          {/* ── Evaluators ── */}
          <SectionCard
            title="Evaluators"
            subtitle={`Quality Evaluation, applications ${basis} in ${scopeLabel}`}
            icon="👤"
            ui={ui}
            darkMode={darkMode}
          >
            {!data || data.evaluators.length === 0 ? (
              <div
                style={{
                  color: ui.textMuted,
                  fontSize: "0.82rem",
                  padding: 12,
                }}
              >
                No applications.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th()}>Evaluator</th>
                      <th style={th("right")}>Applications</th>
                      <th style={th("right")}>Avg TAT (working days)</th>
                      <th style={th("right")}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.evaluators.map((e) => {
                      const key = e.unassigned ? "none" : String(e.user_id);
                      const active = evalFilter === key;
                      return (
                        <tr
                          key={key}
                          style={{
                            background: active ? `${FB}14` : "transparent",
                          }}
                        >
                          <td style={td()}>
                            <b>{e.code}</b>
                            {e.full_name && (
                              <span style={{ color: ui.textMuted }}>
                                {" "}
                                · {e.full_name}
                              </span>
                            )}
                          </td>
                          <td style={td("right")}>{fmt(e.count)}</td>
                          <td style={td("right")}>{fmtAvg(e.avg_tat)}</td>
                          <td style={td("right")}>
                            <button
                              onClick={() => setEvalFilter(active ? null : key)}
                              style={{
                                ...seg(active),
                                padding: "3px 10px",
                                fontSize: "0.7rem",
                              }}
                            >
                              {active ? "Showing" : "Show applications"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* ── Applications ── */}
          <SectionCard
            title="Applications"
            subtitle={`${fmt(records.total)} application${records.total === 1 ? "" : "s"} ${basis} in ${scopeLabel}${evalFilter != null ? " (filtered by evaluator)" : ""}`}
            icon="📄"
            ui={ui}
            darkMode={darkMode}
            action={
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  onClick={() => setBasis("received")}
                  style={seg(basis === "received")}
                >
                  Received
                </button>
                <button
                  onClick={() => setBasis("released")}
                  style={seg(basis === "released")}
                >
                  Processed
                </button>
              </div>
            }
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              <input
                value={recSearch}
                onChange={(e) => setRecSearch(e.target.value)}
                placeholder="Search DTN or drug…"
                style={{ ...inputSt, width: 220 }}
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                style={inputSt}
              >
                <option value="received">Newest received first</option>
                <option value="tat">Longest TAT first</option>
              </select>
              {evalFilter != null && (
                <button onClick={() => setEvalFilter(null)} style={seg(true)}>
                  ✕ Evaluator filter
                </button>
              )}
            </div>
            <div
              style={{
                overflowX: "auto",
                opacity: recLoading ? 0.55 : 1,
                transition: "opacity 0.15s",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 900,
                }}
              >
                <thead>
                  <tr>
                    <th style={th()}>DTN</th>
                    <th style={th()}>Drug</th>
                    <th style={th()}>Received</th>
                    <th style={th()}>Released</th>
                    <th
                      style={th("right")}
                      title="Working days (Mon-Fri) from Date Received to Date Released, or to today when not released yet"
                    >
                      TAT (working days)
                    </th>
                    <th style={th("right")}>Charter</th>
                    <th style={th("center")}>Result</th>
                    <th style={th()}>Evaluator</th>
                  </tr>
                </thead>
                <tbody>
                  {records.data.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={td("center", {
                          color: ui.textMuted,
                          padding: 24,
                        })}
                      >
                        {recLoading ? "Loading…" : "No applications found."}
                      </td>
                    </tr>
                  ) : (
                    records.data.map((r) => {
                      const tone =
                        r.timeline === "Within"
                          ? GREEN
                          : r.timeline === "Beyond"
                            ? RED
                            : ui.textMuted;
                      const tip =
                        r.tat_days == null
                          ? r.state === "No release date"
                            ? "Completed but no valid Date Released"
                            : "Release date is earlier than the received date"
                          : `${r.date_received} to ${r.date_released ?? "today"} = ${r.tat_days} working days (Mon-Fri)${r.charter_days ? `; charter ${r.charter_days}` : ""}`;
                      return (
                        <tr key={r.db_id}>
                          <td
                            style={td("left", {
                              color: FB,
                              fontWeight: 700,
                              fontFamily: "monospace",
                            })}
                          >
                            {r.dtn}
                          </td>
                          <td style={td("left", { maxWidth: 260 })}>
                            <div
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={r.drug ?? ""}
                            >
                              {r.drug ?? "-"}
                            </div>
                            <div
                              style={{
                                fontSize: "0.66rem",
                                color: ui.textMuted,
                              }}
                            >
                              {[r.app_type, r.entry_type]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          </td>
                          <td style={td()}>{r.date_received ?? "-"}</td>
                          <td style={td()}>
                            {r.date_released ??
                              (r.state === "Ongoing"
                                ? badge("Ongoing", AMBER)
                                : "-")}
                          </td>
                          <td
                            style={td("right", {
                              fontWeight: 800,
                              cursor: "help",
                            })}
                            title={tip}
                          >
                            {r.tat_days == null ? "-" : r.tat_days}
                            {r.state === "Ongoing" && r.tat_days != null && (
                              <span
                                style={{
                                  fontWeight: 500,
                                  color: ui.textMuted,
                                  fontSize: "0.66rem",
                                }}
                              >
                                {" "}
                                so far
                              </span>
                            )}
                          </td>
                          <td style={td("right")}>{r.charter_days ?? "-"}</td>
                          <td style={td("center")}>
                            {r.timeline === "N/A" ? (
                              <span style={{ color: ui.textMuted }}>-</span>
                            ) : (
                              badge(r.timeline, tone)
                            )}
                          </td>
                          <td style={td()}>
                            <span
                              style={{
                                fontWeight: 600,
                                color: r.evaluator.unassigned
                                  ? ui.textMuted
                                  : ui.textPrimary,
                              }}
                            >
                              {r.evaluator.code}
                            </span>
                            {r.evaluator.full_name && (
                              <div
                                style={{
                                  fontSize: "0.66rem",
                                  color: ui.textMuted,
                                }}
                              >
                                {r.evaluator.full_name}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 10,
                fontSize: "0.76rem",
                color: ui.textMuted,
              }}
            >
              <span>
                Page {page} of {totalPages} · {fmt(records.total)} total
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  style={{ ...seg(false), opacity: page <= 1 ? 0.4 : 1 }}
                >
                  ← Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  style={{
                    ...seg(false),
                    opacity: page >= totalPages ? 0.4 : 1,
                  }}
                >
                  Next →
                </button>
              </span>
            </div>
          </SectionCard>
        </>
      )}
      {docModal && (
        <ReleasedDocsModal
          ui={ui}
          darkMode={darkMode}
          label={docModal.label}
          params={{
            company: companyNames,
            year: docModal.year,
            month: docModal.month,
            view: docModal.view,
          }}
          onClose={() => setDocModal(null)}
        />
      )}

      {showExportPdf && exportData && (
        <CompanyExportPdfModal
          ui={ui}
          darkMode={darkMode}
          data={exportData}
          params={exportParams}
          scopeLabel={scopeLabel}
          periodWord={periodWord}
          filters={exportFilters}
          onClose={() => setShowExportPdf(false)}
        />
      )}
    </div>
  );
}
