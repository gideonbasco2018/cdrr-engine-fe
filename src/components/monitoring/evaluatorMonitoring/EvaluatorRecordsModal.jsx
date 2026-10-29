// src/components/monitoring/evaluatorMonitoring/EvaluatorRecordsModal.jsx
// Opens when a Company or Drug row, or a Received / Released number, is
// clicked on the Evaluators Monitoring page. Lists every application counted
// there (this evaluator only). For a Company or Drug row it also lists all the
// spellings of the name that were merged into it.
//
// What to load is decided by the page: `loader` returns the data, and
// `loadKey` changes when a different list must be loaded.
//
// All rows are loaded once, so search, sorting, paging and the Excel export
// work on every application, not only the visible page.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getUploadReports } from "../../../api/reports";
import { mapDataItem } from "../../reports/utils.js";
import ViewDetailsModal from "../../reports/actions/ViewDetailsModal";
import ApplicationLogsModal from "../../tasks/ApplicationLogsModal";
import DoctrackModal from "../../reports/actions/DoctrackModal";
import { exportRecordsXlsx } from "./exportEvaluatorMonitoring";
import SortLabel from "./SortLabel";
import { makeUi, Icon, IconChip, Skeleton, AMBER } from "./ui";
import { startLabel, endLabel } from "./tatSources";

const PAGE_SIZE = 50;
const LOAD_LIMIT = 2000; // the API caps one request at 2,000 rows

const fmt = (n) => Number(n ?? 0).toLocaleString();
const fmtAvg = (n) =>
  n == null
    ? "—"
    : Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 });
const show = (v) => (v === null || v === undefined || v === "" ? "—" : v);

const COLUMNS = [
  { key: "dtn", label: "DTN", nowrap: true },
  { key: "company", label: "Company" },
  { key: "generic_name", label: "Generic Name" },
  { key: "brand_name", label: "Brand Name" },
  { key: "doc_type", label: "Document Type", nowrap: true },
  { key: "date_received", label: "Date Received", nowrap: true },
  { key: "tat_start", label: "TAT Start", nowrap: true, src: "tat_start_src" },
  { key: "tat_end", label: "TAT End", nowrap: true, src: "tat_end_src" },
  { key: "date_released", label: "Date Released", nowrap: true },
  { key: "tat", label: "TAT", sub: "working days", nowrap: true, right: true },
  { key: "status", label: "Status", nowrap: true },
];

const ACTIONS = [
  { id: "details", label: "View Details" },
  { id: "logs", label: "Application Log" },
  { id: "doctrack", label: "Doctrack Details" },
];

function EvaluatorRecordsModal({
  loader, // () => Promise of { name, total, avg_tat, spellings, rows }
  loadKey, // a string that changes when another list must be loaded
  kind, // "company" | "drug" | "period"
  eyebrow, // small label above the title
  iconName,
  title, // shown until the data arrives
  context, // e.g. "Released in All years" (optional)
  evaluator,
  colors, // passed on to the CPR modals
  darkMode,
  onClose,
}) {
  const ui = makeUi(darkMode);
  const { t } = ui;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: null, dir: "asc" });
  const [page, setPage] = useState(1);

  const [menu, setMenu] = useState(null); // { row, top, right }
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [logsRow, setLogsRow] = useState(null);
  const [doctrackRow, setDoctrackRow] = useState(null);
  const subOpen = !!(detail || logsRow || doctrackRow);

  // closing plays a short fade-out, then tells the page to remove the modal
  const [closing, setClosing] = useState(false);
  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 170);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setData(null);
    loader()
      .then((res) => !cancelled && setData(res))
      .catch((err) => {
        if (cancelled) return;
        setError(
          err?.response?.data?.detail || err?.message || "Could not load.",
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [loadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape" || subOpen) return;
      if (menu) setMenu(null);
      else close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, subOpen, menu, closing]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    const all = data?.rows || [];
    const q = search.trim().toLowerCase();
    let list = q
      ? all.filter((r) =>
          COLUMNS.some((c) =>
            String(r[c.key] ?? "")
              .toLowerCase()
              .includes(q),
          ),
        )
      : all;
    if (sort.key) {
      const dir = sort.dir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        const x = a[sort.key];
        const y = b[sort.key];
        if (x == null || x === "") return 1; // empty values always last
        if (y == null || y === "") return -1;
        if (typeof x === "number" && typeof y === "number")
          return (x - y) * dir;
        return (
          String(x).localeCompare(String(y), undefined, { numeric: true }) * dir
        );
      });
    }
    return list;
  }, [data, search, sort]);

  useEffect(() => setPage(1), [search, sort]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const firstIndex = (safePage - 1) * PAGE_SIZE;

  const toggleSort = (key) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );

  // Full record for the View Details modal (same call the Records pages use);
  // it shows the few fields we already have until the full record arrives.
  const openDetails = async (r) => {
    setDetail({
      dtn: r.dtn,
      prodBrName: r.brand_name,
      prodGenName: r.generic_name,
    });
    setDetailLoading(true);
    try {
      const res = await getUploadReports({
        page: 1,
        pageSize: 20,
        search: "",
        status: "",
        sortBy: "DB_DATE_EXCEL_UPLOAD",
        sortOrder: "desc",
        dtn: parseInt(r.dtn, 10),
      });
      const list = (res?.data ?? []).map(mapDataItem);
      const full =
        list.find((x) => String(x.id) === String(r.db_id)) || list[0];
      if (full) setDetail(full);
    } catch (err) {
      console.error("Load full record failed:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const runAction = (id, r) => {
    setMenu(null);
    if (id === "details") openDetails(r);
    else if (id === "logs") setLogsRow(r);
    else setDoctrackRow(r);
  };

  // the column that holds the name this list is about
  const boldKey =
    kind === "company" ? "company" : kind === "drug" ? "generic_name" : null;

  /* ── styles ── */
  const th = (sortable = true) => ({
    ...ui.th,
    padding: "0.6rem 0.6rem",
    letterSpacing: "0.07em",
    cursor: sortable ? "pointer" : "default",
    userSelect: "none",
    "--sort-ink": t.blueText,
  });
  const td = { ...ui.td, padding: "0.6rem 0.6rem", fontSize: "0.72rem" };
  const pageBtn = (disabled) => ({
    ...ui.button,
    height: 28,
    padding: "0 12px",
    fontSize: "0.7rem",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.4 : 1,
  });
  const actionBtn = {
    ...ui.button,
    height: 28,
    padding: "0 11px",
    gap: 6,
    fontSize: "0.7rem",
  };

  return createPortal(
    <div
      className={`em-root ${closing ? "em-fade-out" : "em-fade"}`}
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        // below the CPR modals (1000+) so they open on top of this one
        zIndex: 900,
        background: darkMode ? "rgba(0,0,0,0.65)" : "rgba(15,15,16,0.42)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        className={closing ? "em-modal-out" : "em-modal"}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1400px, 100%)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: t.surface,
          border: `1px solid ${t.lineStrong}`,
          borderRadius: 16,
          boxShadow: t.shadowPop,
          color: t.ink,
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
            padding: "1.1rem 1.35rem",
            borderBottom: `1px solid ${t.line}`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.6rem",
                fontWeight: 600,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: t.blueText,
                marginBottom: 7,
              }}
            >
              {eyebrow}
            </div>
            <h2
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 9,
                fontSize: "1.02rem",
                fontWeight: 600,
                letterSpacing: "-0.015em",
                wordBreak: "break-word",
              }}
            >
              <IconChip name={iconName} t={t} size={30} />
              {data?.name || title}
            </h2>
            <div style={{ marginTop: 6, fontSize: "0.72rem", color: t.ink3 }}>
              {data ? (
                <>
                  <span style={{ color: t.ink2, fontWeight: 500 }}>
                    {fmt(data.total)} application{data.total === 1 ? "" : "s"}
                  </span>
                  {data.avg_tat != null && (
                    <>
                      {" · "}Average TAT{" "}
                      <span style={{ color: t.ink2, fontWeight: 500 }}>
                        {fmtAvg(data.avg_tat)}{" "}
                        {Number(data.avg_tat) === 1 ? "working day" : "working days"}
                      </span>
                    </>
                  )}
                  {context && (
                    <>
                      {" · "}
                      <span style={{ color: t.ink2, fontWeight: 500 }}>
                        {context}
                      </span>
                    </>
                  )}
                </>
              ) : (
                "Loading…"
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              disabled={!data || rows.length === 0}
              onClick={() =>
                exportRecordsXlsx({ data, rows, evaluator, context })
              }
              style={{
                ...ui.buttonGreen,
                cursor: !data || rows.length === 0 ? "default" : "pointer",
                opacity: !data || rows.length === 0 ? 0.4 : 1,
              }}
              title="Export the rows you see (after search and sort) to Excel"
            >
              <Icon name="download" size={14} />
              Export Excel
            </button>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              style={{
                width: 34,
                height: 34,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: `1px solid ${t.line}`,
                borderRadius: 10,
                color: t.ink2,
                cursor: "pointer",
              }}
              onMouseEnter={ui.hoverOn}
              onMouseLeave={(e) => ui.hoverOff(e)}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        </div>

        {/* spellings */}
        {data && data.spellings.length > 1 && (
          <div
            style={{
              padding: "0.75rem 1.35rem",
              borderBottom: `1px solid ${t.line}`,
              background: t.sunken,
            }}
          >
            <div
              style={{
                fontSize: "0.6rem",
                fontWeight: 600,
                color: t.amberText,
                textTransform: "uppercase",
                letterSpacing: "0.09em",
                marginBottom: 7,
              }}
            >
              {data.spellings.length} spellings counted together
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {data.spellings.map((s) => (
                <span
                  key={s.name}
                  style={{
                    ...ui.pillAmber,
                    fontSize: "0.7rem",
                  }}
                >
                  {s.name}
                  <span style={{ opacity: 0.7, marginLeft: 6 }}>
                    {fmt(s.count)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* search */}
        {data && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "0.75rem 1.35rem",
              borderBottom: `1px solid ${t.line}`,
            }}
          >
            <div style={{ position: "relative", flex: 1 }}>
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={ui.focusOn}
                onBlur={ui.focusOff}
                placeholder="Search DTN, company, generic, brand, document type, status"
                aria-label="Search applications"
                style={{
                  ...ui.field,
                  width: "100%",
                  padding: "0 0.9rem 0 2.2rem",
                }}
              />
            </div>
            <span
              style={{
                fontSize: "0.7rem",
                color: t.ink3,
                whiteSpace: "nowrap",
              }}
            >
              {search.trim()
                ? `${fmt(rows.length)} of ${fmt(data.rows.length)}`
                : `${fmt(data.rows.length)} shown`}
            </span>
          </div>
        )}

        {/* body */}
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          {error && (
            <div
              role="alert"
              style={{ padding: "1rem 1.35rem", color: t.ink, fontSize: "0.76rem" }}
            >
              {error}
            </div>
          )}
          {loading && (
            <div aria-busy="true" style={{ padding: "1.1rem 1.35rem" }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton
                  key={i}
                  t={t}
                  h={16}
                  style={{ marginBottom: 18, opacity: 1 - i * 0.08 }}
                />
              ))}
            </div>
          )}
          {data && !loading && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th(false)}>#</th>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      onClick={() => toggleSort(c.key)}
                      style={{ ...th(), textAlign: c.right ? "right" : "left" }}
                      title="Click to sort"
                    >
                      <SortLabel
                        text={
                          c.sub ? (
                            <span
                              style={{
                                display: "inline-flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                                lineHeight: 1.3,
                              }}
                            >
                              <span>{c.label}</span>
                              <span
                                style={{
                                  fontSize: "0.55rem",
                                  fontWeight: 500,
                                  letterSpacing: "0.02em",
                                  textTransform: "none",
                                  opacity: 0.85,
                                }}
                              >
                                {c.sub}
                              </span>
                            </span>
                          ) : (
                            c.label
                          )
                        }
                        align={c.right ? "right" : "left"}
                        active={sort.key === c.key}
                        dir={sort.dir}
                        onClear={() => setSort({ key: null, dir: "asc" })}
                      />
                    </th>
                  ))}
                  <th
                    style={{
                      ...th(false),
                      textAlign: "center",
                      right: 0,
                      zIndex: 3,
                      boxShadow: `-8px 0 8px -8px ${t.line}`,
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={COLUMNS.length + 2}
                      style={{
                        ...td,
                        textAlign: "center",
                        padding: "2rem",
                        color: t.ink3,
                      }}
                    >
                      No applications match your search.
                    </td>
                  </tr>
                )}
                {pageRows.map((r, i) => (
                  <tr
                    key={r.db_id}
                    className="em-row"
                    style={{
                      transition: "background .12s",
                      animationDelay: `${Math.min(i, 14) * 22}ms`,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = t.rowHover)
                    }
                    onMouseLeave={(e) => ui.hoverOff(e)}
                  >
                    <td style={{ ...td, color: t.ink3 }}>{firstIndex + i + 1}</td>
                    {COLUMNS.map((c) => (
                      <td
                        key={c.key}
                        style={{
                          ...td,
                          whiteSpace: c.nowrap ? "nowrap" : "normal",
                          textAlign: c.right ? "right" : "left",
                          color:
                            c.key === "tat"
                              ? t.accentText
                              : c.key === boldKey
                                ? t.ink
                                : t.ink2,
                          fontWeight:
                            c.key === "tat" ||
                            c.key === boldKey
                              ? 600
                              : 400,
                        }}
                      >
                        {show(r[c.key])}
                        {c.src && r[c.key] && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              marginTop: 2,
                              fontSize: "0.6rem",
                              fontWeight: 400,
                              color:
                                r[c.src] === "decked" || r[c.src] === "released"
                                  ? t.amberText
                                  : t.ink3,
                            }}
                          >
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background:
                                  r[c.src] === "decked" || r[c.src] === "released"
                                    ? AMBER
                                    : t.accent,
                              }}
                            />
                            {c.key === "tat_start"
                              ? startLabel(r[c.src])
                              : endLabel(r[c.src])}
                          </div>
                        )}
                      </td>
                    ))}
                    <td
                      style={{
                        ...td,
                        textAlign: "center",
                        position: "sticky",
                        right: 0,
                        zIndex: 2,
                        background: t.surface,
                        boxShadow: `-8px 0 8px -8px ${t.line}`,
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenu(
                            menu?.row.db_id === r.db_id
                              ? null
                              : {
                                  row: r,
                                  top: rect.bottom + 6,
                                  right: window.innerWidth - rect.right,
                                },
                          );
                        }}
                        aria-haspopup="menu"
                        style={actionBtn}
                        onMouseEnter={ui.hoverOn}
                        onMouseLeave={(e) => ui.hoverOff(e, t.surface)}
                      >
                        Actions
                        <Icon name="chevron" size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* pager */}
        {data && rows.length > PAGE_SIZE && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.65rem 1.35rem",
              borderTop: `1px solid ${t.line}`,
              fontSize: "0.72rem",
              color: t.ink3,
            }}
          >
            <span>
              Page {safePage} of {totalPages} · {fmt(rows.length)} applications
            </span>
            <span style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                style={pageBtn(safePage <= 1)}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                style={pageBtn(safePage >= totalPages)}
              >
                Next
              </button>
            </span>
          </div>
        )}
      </div>

      {/* row menu */}
      {menu && (
        <>
          <div
            onClick={(e) => {
              e.stopPropagation();
              setMenu(null);
            }}
            style={{ position: "fixed", inset: 0, zIndex: 950 }}
          />
          <div
            className="em-pop"
            role="menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: menu.top,
              right: menu.right,
              zIndex: 951,
              minWidth: 184,
              background: t.surface,
              border: `1px solid ${t.line}`,
              borderRadius: 12,
              boxShadow: t.shadowPop,
              padding: 5,
            }}
          >
            {ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                role="menuitem"
                onClick={() => runAction(a.id, menu.row)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: "0.76rem",
                  fontWeight: 500,
                  border: "none",
                  borderRadius: 8,
                  background: "transparent",
                  color: t.ink,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = t.blueSoft)
                }
                onMouseLeave={(e) => ui.hoverOff(e)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* The wrapper stops clicks in these modals from reaching this modal's
          backdrop and closing it. */}
      <div onClick={(e) => e.stopPropagation()}>
        {detail && (
          <ViewDetailsModal
            record={detail}
            loading={detailLoading}
            onClose={() => setDetail(null)}
            colors={colors}
            darkMode={darkMode}
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
        {doctrackRow && (
          <DoctrackModal
            record={{ dtn: doctrackRow.dtn }}
            onClose={() => setDoctrackRow(null)}
            colors={colors}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

export default EvaluatorRecordsModal;
