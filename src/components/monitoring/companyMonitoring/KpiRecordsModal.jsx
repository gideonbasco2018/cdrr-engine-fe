// Modal: the applications behind a KPI card (Received, Processed, ...).
// Graph (released vs received, by document type, by result) doubles as filter.
// DTN opens Document Tracking; Actions has View Details / Tracking / Logs.
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getCompanyKpiRecords } from "../../../api/analytics";
import { getUploadReports } from "../../../api/reports";
import { mapDataItem } from "../../reports/utils.js";
import DoctrackModal from "../../reports/actions/DoctrackModal";
import ViewDetailsModal from "../../reports/actions/ViewDetailsModal";
import ApplicationLogsModal from "../../tasks/ApplicationLogsModal";
import { FB } from "../analytics/analyticsConstants";
import { neuCardBg } from "../analytics/analyticsHelpers";

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const GREEN = "#36a420";
const RED = "#e02020";
const AMBER = "#f59e0b";
const DOC_COLORS = [
  FB,
  GREEN,
  AMBER,
  "#0891b2",
  "#8b5cf6",
  RED,
  "#ec4899",
  "#64748b",
];
const SIZE = 15;
const fmt = (n) => Number(n ?? 0).toLocaleString();
const pctOf = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

const DESC = {
  received: "Applications received in this period",
  processed: "Applications completed and released in this period",
  open: "Received in this period, not yet released",
  tat: "Released applications with a valid TAT (used for the Avg TAT)",
  within: "Released applications within the Citizen's Charter",
  beyond: "Released applications beyond the Citizen's Charter",
};

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function KpiRecordsModal({
  ui,
  darkMode,
  label,
  kind,
  params,
  scope,
  onClose,
}) {
  const [page, setPage] = useState(1);
  const [res, setRes] = useState({ total: 0, data: [] });
  const [sum, setSum] = useState(null); // whole-card summary (stable)
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const debSearch = useDebounced(search.trim(), 350);
  const [state, setState] = useState(""); // "" | released | open
  const [doc, setDoc] = useState(""); // "" | document type
  const [result, setResult] = useState(""); // "" | within | beyond | none
  const hasFilter = !!(debSearch || state || doc || result);

  const [menu, setMenu] = useState(null);
  const [doctrackRow, setDoctrackRow] = useState(null);
  const [logsRow, setLogsRow] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const subOpenRef = useRef(false);
  subOpenRef.current = !!(doctrackRow || logsRow || detail);

  const line = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !subOpenRef.current && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => setPage(1), [debSearch, state, doc, result]);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    setError(null);
    getCompanyKpiRecords({
      ...params,
      kind,
      page,
      page_size: SIZE,
      ...(debSearch ? { search: debSearch } : {}),
      ...(state ? { state } : {}),
      ...(doc ? { doc } : {}),
      ...(result ? { result } : {}),
    })
      .then((r) => {
        if (stale) return;
        setRes(r);
        if (r.summary) setSum(r.summary);
        if (r.docs) setDocs(r.docs);
      })
      .catch((e) => {
        if (!stale) {
          setRes({ total: 0, data: [] });
          setError(
            e?.response?.data?.detail || e?.message || "Failed to load data.",
          );
        }
      })
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params), kind, page, debSearch, state, doc, result]);

  const pages = Math.max(Math.ceil((res.total ?? 0) / SIZE), 1);
  const clearFilters = () => {
    setSearch("");
    setState("");
    setDoc("");
    setResult("");
  };

  const colors = {
    cardBg: neuCardBg(darkMode),
    cardBorder: line,
    tableBg: darkMode ? "#222222" : "#f7f8fa",
    tableRowHover: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
    inputBg: darkMode ? "#222222" : "#f7f8fa",
    badgeBg: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    textPrimary: ui.textPrimary,
    textSecondary: ui.textSub ?? ui.textPrimary,
    textTertiary: ui.textMuted,
  };

  const openDetails = async (r) => {
    setDetail({ dtn: r.dtn, prodBrName: r.drug });
    setDetailLoading(true);
    try {
      const out = await getUploadReports({
        page: 1,
        pageSize: 20,
        search: "",
        status: "",
        sortBy: "DB_DATE_EXCEL_UPLOAD",
        sortOrder: "desc",
        dtn: parseInt(r.dtn, 10),
      });
      const list = (out?.data ?? []).map(mapDataItem);
      const full =
        (r.db_id != null &&
          list.find((x) => String(x.id) === String(r.db_id))) ||
        list[0];
      if (full) setDetail(full);
    } catch (err) {
      console.error("Load full record failed:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Styles ──
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
    position: "sticky",
    top: 0,
    background: darkMode ? "#1f2023" : "#fff",
    zIndex: 1,
  });
  const td = (align = "left", extra = {}) => ({
    textAlign: align,
    fontSize: "0.78rem",
    color: ui.textPrimary,
    padding: "8px 10px",
    borderBottom: `1px solid ${ui.divider}`,
    whiteSpace: "nowrap",
    ...extra,
  });
  const btn = (disabled) => ({
    padding: "4px 12px",
    fontSize: "0.74rem",
    borderRadius: 8,
    border: `1px solid ${line}`,
    background: "transparent",
    color: ui.textPrimary,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    fontFamily: font,
  });
  const inputSt = {
    background: ui.inputBg,
    border: `1px solid ${line}`,
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: "0.78rem",
    color: ui.textPrimary,
    outline: "none",
    fontFamily: font,
    colorScheme: darkMode ? "dark" : "light",
  };
  const badge = (text, color) => (
    <span
      style={{
        fontSize: "0.66rem",
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 99,
        background: `${color}22`,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );

  // One clickable bar of the graph
  const Bar = ({ name, n, base, color, active, dim, onClick, hint }) => {
    const clickable = !!onClick && n > 0;
    return (
      <div
        onClick={clickable ? onClick : undefined}
        title={
          clickable
            ? active
              ? "Click to remove this filter"
              : `Filter: ${name}`
            : hint
        }
        style={{
          cursor: clickable ? "pointer" : "default",
          padding: "4px 8px",
          margin: "0 -8px",
          borderRadius: 8,
          background: active ? `${color}18` : "transparent",
          outline: active ? `1px solid ${color}` : "none",
          opacity: dim ? 0.45 : 1,
          transition: "all 0.15s",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.76rem",
            marginBottom: 3,
            gap: 8,
          }}
        >
          <span
            style={{
              color,
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </span>
          <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
            {fmt(n)}
            <span style={{ color: ui.textMuted, fontWeight: 400 }}>
              {" "}
              · {pctOf(n, base)}%
            </span>
          </span>
        </div>
        <div
          style={{
            height: 8,
            borderRadius: 99,
            overflow: "hidden",
            background: darkMode
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              width: `${Math.max(pctOf(n, base), n > 0 ? 2 : 0)}%`,
              height: "100%",
              background: color,
            }}
          />
        </div>
      </div>
    );
  };

  const toggle = (cur, set, v) => set(cur === v ? "" : v);
  const colTitle = (t) => (
    <div
      style={{
        fontSize: "0.64rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: ui.textMuted,
        marginBottom: 6,
      }}
    >
      {t}
    </div>
  );

  return createPortal(
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: font,
      }}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          setMenu(null);
        }}
        style={{
          width: 1280,
          maxWidth: "97vw",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          background: darkMode ? "#1f2023" : "#fff",
          color: ui.textPrimary,
          borderRadius: 14,
          border: `1px solid ${line}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 20px",
            borderBottom: `1px solid ${line}`,
          }}
        >
          <div>
            <div style={{ fontSize: "1rem", fontWeight: 700 }}>
              {label} · {fmt(sum?.total ?? res.total)} application
              {(sum?.total ?? res.total) === 1 ? "" : "s"}
            </div>
            <div
              style={{ fontSize: "0.75rem", color: ui.textMuted, marginTop: 2 }}
            >
              {scope} · {DESC[kind]}
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close (Esc)"
            style={{
              border: "none",
              background: "transparent",
              color: ui.textMuted,
              cursor: "pointer",
              fontSize: "1rem",
              alignSelf: "flex-start",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {/* Graph (click a bar to filter) */}
          {sum && sum.total > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 28,
                padding: "14px 20px",
                borderBottom: `1px solid ${line}`,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {colTitle("Received vs Released")}
                <Bar
                  name={kind === "processed" ? "Processed" : "Received"}
                  n={sum.total}
                  base={sum.total}
                  color={FB}
                  active={!state}
                  onClick={state ? () => setState("") : undefined}
                  hint="All applications of this card"
                />
                <Bar
                  name="Released"
                  n={sum.released}
                  base={sum.total}
                  color={GREEN}
                  active={state === "released"}
                  dim={state === "open"}
                  onClick={() => toggle(state, setState, "released")}
                />
                <Bar
                  name="Still open"
                  n={sum.open}
                  base={sum.total}
                  color={AMBER}
                  active={state === "open"}
                  dim={state === "released"}
                  onClick={() => toggle(state, setState, "open")}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {colTitle("Released by document type")}
                {docs.length === 0 ? (
                  <div style={{ fontSize: "0.76rem", color: ui.textMuted }}>
                    No released applications.
                  </div>
                ) : (
                  docs.map((d, i) => (
                    <Bar
                      key={d.doc}
                      name={d.doc}
                      n={d.count}
                      base={sum.released}
                      color={DOC_COLORS[i % DOC_COLORS.length]}
                      active={doc === d.doc}
                      dim={!!doc && doc !== d.doc}
                      onClick={() => toggle(doc, setDoc, d.doc)}
                    />
                  ))
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {colTitle("Result vs Citizen's Charter")}
                <Bar
                  name="Within"
                  n={sum.within}
                  base={sum.total}
                  color={GREEN}
                  active={result === "within"}
                  dim={!!result && result !== "within"}
                  onClick={() => toggle(result, setResult, "within")}
                />
                <Bar
                  name="Beyond"
                  n={sum.beyond}
                  base={sum.total}
                  color={RED}
                  active={result === "beyond"}
                  dim={!!result && result !== "beyond"}
                  onClick={() => toggle(result, setResult, "beyond")}
                />
                <Bar
                  name="No charter / no TAT"
                  n={sum.no_result}
                  base={sum.total}
                  color="#64748b"
                  active={result === "none"}
                  dim={!!result && result !== "none"}
                  onClick={() => toggle(result, setResult, "none")}
                />
              </div>
            </div>
          )}

          {/* Filter bar */}
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              padding: "10px 20px",
              borderBottom: `1px solid ${line}`,
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search DTN or drug…"
              autoComplete="off"
              style={{ ...inputSt, width: 230 }}
            />
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              style={inputSt}
            >
              <option value="">All (released + open)</option>
              <option value="released">Released only</option>
              <option value="open">Still open only</option>
            </select>
            <select
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              style={inputSt}
            >
              <option value="">All document types</option>
              {docs.map((d) => (
                <option key={d.doc} value={d.doc}>
                  {d.doc} ({fmt(d.count)})
                </option>
              ))}
            </select>
            <select
              value={result}
              onChange={(e) => setResult(e.target.value)}
              style={inputSt}
            >
              <option value="">All results</option>
              <option value="within">Within</option>
              <option value="beyond">Beyond</option>
              <option value="none">No charter / no TAT</option>
            </select>
            {hasFilter && (
              <button onClick={clearFilters} style={btn(false)}>
                ✕ Clear filters
              </button>
            )}
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.74rem",
                color: ui.textMuted,
              }}
            >
              {loading
                ? "Loading…"
                : hasFilter
                  ? `Showing ${fmt(res.total)} of ${fmt(sum?.total ?? res.total)}`
                  : `${fmt(res.total)} application${res.total === 1 ? "" : "s"}`}
            </span>
          </div>

          {/* Table */}
          <div
            style={{
              overflowX: "auto",
              opacity: loading ? 0.55 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {error ? (
              <div style={{ padding: 24, color: RED, fontSize: "0.82rem" }}>
                ⚠️ {error}
              </div>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 1180,
                }}
              >
                <thead>
                  <tr>
                    <th style={th()}>DTN</th>
                    <th style={th()}>Drug</th>
                    <th style={th()}>Document released</th>
                    <th style={th()}>Received</th>
                    <th style={th()}>Released</th>
                    <th style={th("right")}>TAT (working days)</th>
                    <th style={th("right")}>Charter</th>
                    <th style={th("center")}>Result</th>
                    <th style={th()}>Evaluator</th>
                    <th style={th("center")}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {res.data.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        style={td("center", {
                          color: ui.textMuted,
                          padding: 30,
                        })}
                      >
                        {loading
                          ? "Loading…"
                          : "No applications match the filters."}
                      </td>
                    </tr>
                  ) : (
                    res.data.map((r) => {
                      const tone =
                        r.timeline === "Within"
                          ? GREEN
                          : r.timeline === "Beyond"
                            ? RED
                            : ui.textMuted;
                      return (
                        <tr key={r.db_id}>
                          <td
                            style={td("left", {
                              fontWeight: 700,
                              fontFamily: "monospace",
                            })}
                          >
                            {r.dtn ? (
                              <span
                                onClick={() => setDoctrackRow(r)}
                                title="View document tracking"
                                style={{
                                  cursor: "pointer",
                                  color: FB,
                                  textDecoration: "underline dotted",
                                  textUnderlineOffset: 3,
                                }}
                              >
                                {r.dtn}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td
                            style={td("left", {
                              maxWidth: 300,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            })}
                            title={r.drug ?? ""}
                          >
                            {r.drug ?? "-"}
                          </td>
                          <td style={td()}>{r.doc ?? "-"}</td>
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
                            title={
                              r.tat_days == null
                                ? "No valid TAT"
                                : `${r.date_received} to ${r.date_released ?? "today"} = ${r.tat_days} working days (Mon-Fri)${r.charter_days ? `; charter ${r.charter_days}` : ""}`
                            }
                          >
                            {r.tat_days ?? "-"}
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
                          <td style={td("center")}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                setMenu({
                                  row: r,
                                  top: rect.bottom + 4,
                                  right: window.innerWidth - rect.right,
                                });
                              }}
                              style={{ ...btn(false), padding: "3px 10px" }}
                            >
                              Actions ▾
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 20px",
            borderTop: `1px solid ${line}`,
            fontSize: "0.74rem",
            color: ui.textMuted,
          }}
        >
          <span>
            Page {page} of {pages} · {fmt(res.total)} total
          </span>
          <span style={{ display: "flex", gap: 6 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={btn(page <= 1)}
            >
              ‹ Prev
            </button>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              style={btn(page >= pages)}
            >
              Next ›
            </button>
          </span>
        </div>
      </div>

      {menu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: menu.top,
            right: menu.right,
            zIndex: 1150,
            minWidth: 190,
            background: neuCardBg(darkMode),
            border: `1px solid ${line}`,
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
            padding: 4,
            fontFamily: font,
          }}
        >
          {[
            { label: "👁 View Details", run: () => openDetails(menu.row) },
            {
              label: "🗂 Document Tracking",
              run: () => setDoctrackRow(menu.row),
            },
            {
              label: "📋 View Application Logs",
              run: () => setLogsRow(menu.row),
            },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                const run = item.run;
                setMenu(null);
                run();
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "7px 12px",
                fontSize: "0.78rem",
                fontWeight: 600,
                border: "none",
                borderRadius: 8,
                background: "transparent",
                color: ui.textPrimary,
                cursor: "pointer",
                fontFamily: font,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = darkMode
                  ? "rgba(255,255,255,0.07)"
                  : "rgba(0,0,0,0.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div onClick={(e) => e.stopPropagation()}>
        {doctrackRow && (
          <DoctrackModal
            record={{ dtn: doctrackRow.dtn }}
            onClose={() => setDoctrackRow(null)}
            colors={colors}
          />
        )}
        {logsRow && (
          <ApplicationLogsModal
            record={{ dtn: logsRow.dtn, mainDbId: logsRow.db_id }}
            onClose={() => setLogsRow(null)}
            colors={colors}
            darkMode={darkMode}
          />
        )}
        {detail && (
          <ViewDetailsModal
            record={detail}
            loading={detailLoading}
            onClose={() => setDetail(null)}
            colors={colors}
            darkMode={darkMode}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
