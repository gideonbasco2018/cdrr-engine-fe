// src/components/monitoring/genericDrugs/GenericDrugsView.jsx
// Pick one or more generic names (e.g. cancer drugs) and see how many of their
// applications are pending / registered. The picked list is remembered in the
// browser so it does not have to be selected again next time.
// Standalone page of the Monitoring sidebar (no longer a modal).
import { useState, useEffect, useRef } from "react";
import {
  searchGenericNames,
  getGenericMonitoring,
  getGenericMonitoringRecords,
} from "../../../api/analytics";
import { FB } from "../analytics/analyticsConstants";

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const GREEN = "#36a420";
const RED = "#e02020";
const AMBER = "#f59e0b";
const GRAY = "#9ca3af";
const PAGE_SIZE = 25;
const STORE_KEY = "analytics.genericFilter.v1";

const fmt = (n) => Number(n ?? 0).toLocaleString();
const ckey = (s) =>
  String(s ?? "")
    .trim()
    .toUpperCase();

const GROUPS = [
  { key: "all", label: "All", color: FB },
  { key: "pending", label: "Pending", color: AMBER },
  { key: "registered", label: "Registered (CPR)", color: GREEN },
  { key: "lod", label: "LOD", color: RED },
  { key: "other", label: "Other", color: GRAY },
];

const loadSaved = () => {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function GenericDrugsView({ ui, darkMode }) {
  const line = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(loadSaved); // array of generic names
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);
  const sugRun = useRef(0);
  const debouncedQuery = useDebounced(query.trim(), 300);
  const debouncedSelected = useDebounced(selected, 400);

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [group, setGroup] = useState("all");
  const [recSearch, setRecSearch] = useState("");
  const debouncedRecSearch = useDebounced(recSearch.trim(), 350);
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState({ total: 0, data: [] });
  const [recLoading, setRecLoading] = useState(false);
  const recRun = useRef(0);

  // Remember the picked generics
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(selected));
    } catch {
      /* storage may be unavailable */
    }
  }, [selected]);

  // Suggestions
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    const id = ++sugRun.current;
    setSugLoading(true);
    searchGenericNames(debouncedQuery)
      .then((res) => id === sugRun.current && setSuggestions(res?.data ?? []))
      .catch(() => id === sugRun.current && setSuggestions([]))
      .finally(() => id === sugRun.current && setSugLoading(false));
  }, [debouncedQuery]);

  // Summary per generic
  useEffect(() => {
    if (debouncedSelected.length === 0) {
      setSummary(null);
      return;
    }
    let stale = false;
    setLoading(true);
    setError(null);
    getGenericMonitoring({ generic: debouncedSelected })
      .then((res) => !stale && setSummary(res))
      .catch((e) => {
        if (!stale) {
          setSummary(null);
          setError(
            e?.response?.data?.detail || e?.message || "Failed to load data.",
          );
        }
      })
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
  }, [debouncedSelected]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSelected, group, debouncedRecSearch]);

  // Applications
  useEffect(() => {
    if (debouncedSelected.length === 0) {
      setRecords({ total: 0, data: [] });
      return;
    }
    const id = ++recRun.current;
    setRecLoading(true);
    getGenericMonitoringRecords({
      generic: debouncedSelected,
      group,
      page,
      page_size: PAGE_SIZE,
      ...(debouncedRecSearch ? { search: debouncedRecSearch } : {}),
    })
      .then((res) => id === recRun.current && setRecords(res))
      .catch(() => id === recRun.current && setRecords({ total: 0, data: [] }))
      .finally(() => id === recRun.current && setRecLoading(false));
  }, [debouncedSelected, group, page, debouncedRecSearch]);

  const isOn = (name) => selected.some((n) => ckey(n) === ckey(name));
  const toggle = (name) =>
    setSelected((cur) =>
      isOn(name) ? cur.filter((n) => ckey(n) !== ckey(name)) : [...cur, name],
    );
  const allResultsOn =
    suggestions.length > 0 && suggestions.every((sg) => isOn(sg.generic));
  const toggleAllResults = () =>
    setSelected((cur) => {
      if (allResultsOn) {
        const drop = new Set(suggestions.map((sg) => ckey(sg.generic)));
        return cur.filter((n) => !drop.has(ckey(n)));
      }
      const have = new Set(cur.map(ckey));
      return [
        ...cur,
        ...suggestions
          .map((sg) => sg.generic)
          .filter((n) => !have.has(ckey(n))),
      ];
    });

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
  const seg = (active, color = FB) => ({
    padding: "5px 12px",
    fontSize: "0.74rem",
    fontWeight: active ? 700 : 500,
    borderRadius: 99,
    border: `1px solid ${active ? color : line}`,
    background: active ? `${color}1f` : "transparent",
    color: active ? color : ui.textMuted,
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
    borderBottom: `1px solid ${ui.divider ?? line}`,
    ...extra,
  });

  const T = summary?.totals;
  const totalPages = Math.max(Math.ceil((records.total ?? 0) / PAGE_SIZE), 1);
  const countOf = (k) => (k === "all" ? T?.total : T?.[k]);

  const kpi = (label, value, sub, color) => (
    <div
      key={label}
      style={{
        border: `1px solid ${line}`,
        borderTop: `3px solid ${color}`,
        borderRadius: 10,
        padding: "9px 12px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: "0.62rem",
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
          fontSize: "1.45rem",
          fontWeight: 800,
          color,
          lineHeight: 1.25,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "0.68rem", color: ui.textMuted }}>{sub}</div>
    </div>
  );

  const statusColor = (st) => {
    const s = String(st ?? "")
      .toUpperCase()
      .trim();
    return s === "COMPLETED" ? GREEN : s ? AMBER : GRAY;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: ui.cardBg,
        color: ui.textPrimary,
        borderRadius: 16,
        border: `1px solid ${line}`,
        fontFamily: font,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${line}`,
        }}
      >
        <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>
          💊 Applications by Generic Name
        </div>
        <div style={{ fontSize: "0.72rem", color: ui.textMuted }}>
          Pick one or more generic names to count their pending and registered
          applications (all years)
        </div>
      </div>

      <div
        style={{
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Search + results with checkboxes */}
        <div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search generic name (at least 2 letters), then tick the ones you want…"
            autoComplete="off"
            style={{ ...inputSt, width: "100%", boxSizing: "border-box" }}
          />
          {debouncedQuery.length >= 2 && (
            <div
              style={{
                marginTop: 6,
                border: `1px solid ${line}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div style={{ maxHeight: 230, overflowY: "auto" }}>
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
                    No generic name found.
                  </div>
                ) : (
                  suggestions.map((sg) => {
                    const on = isOn(sg.generic);
                    return (
                      <label
                        key={sg.generic}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 12px",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          borderBottom: `1px solid ${line}`,
                          background: on ? `${FB}12` : "transparent",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(sg.generic)}
                          style={{ cursor: "pointer" }}
                        />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          {sg.generic}
                        </span>
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
              {suggestions.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "7px 12px",
                    fontSize: "0.72rem",
                    color: ui.textMuted,
                    background: darkMode ? "rgba(255,255,255,0.03)" : "#f8f9fd",
                  }}
                >
                  <span>{suggestions.length} result(s)</span>
                  <span
                    onClick={toggleAllResults}
                    style={{ color: FB, cursor: "pointer", fontWeight: 700 }}
                  >
                    {allResultsOn ? "Untick all results" : "Tick all results"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected generics */}
        {selected.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {selected.map((g) => (
              <span
                key={ckey(g)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 6px 3px 10px",
                  fontSize: "0.73rem",
                  fontWeight: 600,
                  borderRadius: 99,
                  background: `${FB}1f`,
                  border: `1px solid ${FB}55`,
                  color: FB,
                }}
              >
                {g}
                <button
                  onClick={() => toggle(g)}
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
            <span
              onClick={() => setSelected([])}
              style={{
                fontSize: "0.72rem",
                color: ui.textMuted,
                cursor: "pointer",
                marginLeft: 4,
              }}
            >
              Clear all ({selected.length})
            </span>
          </div>
        )}

        {selected.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "36px 20px",
              color: ui.textMuted,
              border: `1px dashed ${line}`,
              borderRadius: 12,
              fontSize: "0.85rem",
            }}
          >
            Search and tick the generic names you want to monitor (for example,
            the cancer drugs).
          </div>
        )}

        {selected.length > 0 && error && (
          <div style={{ color: RED, fontSize: "0.85rem" }}>⚠️ {error}</div>
        )}

        {selected.length > 0 && !error && (
          <>
            {/* KPIs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 10,
                opacity: loading ? 0.55 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {kpi(
                "Applications",
                fmt(T?.total),
                `${selected.length} generic name(s)`,
                FB,
              )}
              {kpi("Pending", fmt(T?.pending), "Not yet completed", AMBER)}
              {kpi(
                "Registered",
                fmt(T?.registered),
                "Completed, CPR released",
                GREEN,
              )}
              {kpi("LOD", fmt(T?.lod), "Completed, LOD released", RED)}
              {kpi("Other", fmt(T?.other), "Completed, other document", GRAY)}
            </div>

            {/* Per generic */}
            <div style={{ overflowX: "auto", opacity: loading ? 0.55 : 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th()}>Generic name</th>
                    <th style={th("right")}>Applications</th>
                    <th style={th("right")}>Pending</th>
                    <th style={th("right")}>Registered (CPR)</th>
                    <th style={th("right")}>LOD</th>
                    <th style={th("right")}>Other</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.generics ?? []).map((g) => (
                    <tr key={g.generic}>
                      <td style={td()}>{g.generic}</td>
                      <td style={td("right")}>{fmt(g.total)}</td>
                      <td
                        style={td("right", {
                          color: g.pending ? AMBER : ui.textMuted,
                          fontWeight: 700,
                        })}
                      >
                        {fmt(g.pending)}
                      </td>
                      <td
                        style={td("right", {
                          color: g.registered ? GREEN : ui.textMuted,
                          fontWeight: 700,
                        })}
                      >
                        {fmt(g.registered)}
                      </td>
                      <td style={td("right")}>{fmt(g.lod)}</td>
                      <td style={td("right")}>{fmt(g.other)}</td>
                    </tr>
                  ))}
                  {summary && (
                    <tr>
                      <td style={td("left", { fontWeight: 800 })}>Total</td>
                      <td style={td("right", { fontWeight: 800 })}>
                        {fmt(T?.total)}
                      </td>
                      <td
                        style={td("right", { fontWeight: 800, color: AMBER })}
                      >
                        {fmt(T?.pending)}
                      </td>
                      <td
                        style={td("right", { fontWeight: 800, color: GREEN })}
                      >
                        {fmt(T?.registered)}
                      </td>
                      <td style={td("right", { fontWeight: 800 })}>
                        {fmt(T?.lod)}
                      </td>
                      <td style={td("right", { fontWeight: 800 })}>
                        {fmt(T?.other)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: "0.7rem", color: ui.textMuted }}>
              Pending = status is not COMPLETED. Registered = COMPLETED with CPR
              released. Registered counts CPR releases, so a renewal of the same
              product counts again.
            </div>

            {/* Applications */}
            <div style={{ borderTop: `1px solid ${line}`, paddingTop: 12 }}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                {GROUPS.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => setGroup(g.key)}
                    style={seg(group === g.key, g.color)}
                  >
                    {g.label}
                    {summary && (
                      <b style={{ marginLeft: 6 }}>{fmt(countOf(g.key))}</b>
                    )}
                  </button>
                ))}
                <input
                  value={recSearch}
                  onChange={(e) => setRecSearch(e.target.value)}
                  placeholder="Search DTN, brand or company…"
                  style={{ ...inputSt, marginLeft: "auto", width: 240 }}
                />
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
                      <th style={th()}>Generic</th>
                      <th style={th()}>Brand</th>
                      <th style={th()}>Company</th>
                      <th style={th()}>Received</th>
                      <th style={th()}>Released</th>
                      <th style={th()}>Status</th>
                      <th style={th()}>Doc released</th>
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
                      records.data.map((r) => (
                        <tr key={r.db_id}>
                          <td
                            style={td("left", {
                              color: FB,
                              fontWeight: 700,
                              fontFamily: "monospace",
                            })}
                          >
                            {r.dtn ?? "-"}
                          </td>
                          <td style={td()}>{r.generic ?? "-"}</td>
                          <td style={td()}>{r.brand ?? "-"}</td>
                          <td style={td()}>{r.company ?? "-"}</td>
                          <td style={td()}>{r.date_received ?? "-"}</td>
                          <td style={td()}>{r.date_released ?? "-"}</td>
                          <td style={td()}>
                            {r.status ? (
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  padding: "2px 9px",
                                  borderRadius: 99,
                                  background: `${statusColor(r.status)}22`,
                                  color: statusColor(r.status),
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {r.status}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td style={td()}>{r.doc ?? "-"}</td>
                        </tr>
                      ))
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
                    style={{
                      ...seg(false),
                      borderRadius: 8,
                      opacity: page <= 1 ? 0.4 : 1,
                    }}
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    style={{
                      ...seg(false),
                      borderRadius: 8,
                      opacity: page >= totalPages ? 0.4 : 1,
                    }}
                  >
                    Next →
                  </button>
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
