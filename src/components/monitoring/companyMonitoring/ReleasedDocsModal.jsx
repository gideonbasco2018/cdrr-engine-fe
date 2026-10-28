// Modal: released applications grouped by type of document released.
// Click a row to expand and see the applications of that document type.
// In the expanded list: click a DTN (document tracking) or use Actions.
import { useState, useEffect, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import {
  getCompanyReleasedDocs,
  getCompanyReleasedDocRecords,
} from "../../../api/analytics";
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
const PALETTE = [
  FB,
  GREEN,
  "#f59e0b",
  "#0891b2",
  "#8b5cf6",
  RED,
  "#ec4899",
  "#64748b",
];
const SIZE = 10;
const fmt = (n) => Number(n ?? 0).toLocaleString();
const fmtAvg = (n) =>
  n == null
    ? "-"
    : Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 });

// ── Applications of one document type ──
function DocApps({
  ui,
  darkMode,
  params,
  doc,
  line,
  th,
  td,
  onDtn,
  onActions,
}) {
  const [page, setPage] = useState(1);
  const [res, setRes] = useState({ total: 0, data: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    getCompanyReleasedDocRecords({ ...params, doc, page, page_size: SIZE })
      .then((r) => !stale && setRes(r))
      .catch(() => !stale && setRes({ total: 0, data: [] }))
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params), doc, page]);

  const pages = Math.max(Math.ceil((res.total ?? 0) / SIZE), 1);
  const btn = (disabled) => ({
    padding: "3px 10px",
    fontSize: "0.7rem",
    borderRadius: 6,
    border: `1px solid ${line}`,
    background: "transparent",
    color: ui.textMuted,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    fontFamily: font,
  });

  return (
    <div style={{ padding: "8px 4px 12px 22px", opacity: loading ? 0.55 : 1 }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th()}>DTN</th>
              <th style={th()}>Drug</th>
              <th style={th()}>Received</th>
              <th style={th()}>Released</th>
              <th style={th("right")}>TAT</th>
              <th style={th("center")}>Result</th>
              <th style={th()}>Evaluator</th>
              <th style={th("center")}>Action</th>
            </tr>
          </thead>
          <tbody>
            {res.data.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={td("center", { color: ui.textMuted, padding: 16 })}
                >
                  {loading ? "Loading…" : "No applications."}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            onDtn(r);
                          }}
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
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      })}
                      title={r.drug ?? ""}
                    >
                      {r.drug ?? "-"}
                    </td>
                    <td style={td()}>{r.date_received ?? "-"}</td>
                    <td style={td()}>{r.date_released ?? "-"}</td>
                    <td
                      style={td("right", { fontWeight: 700, cursor: "help" })}
                      title={
                        r.tat_days == null
                          ? "No valid TAT"
                          : `${r.date_received} to ${r.date_released} = ${r.tat_days} working days${r.charter_days ? `; charter ${r.charter_days}` : ""}`
                      }
                    >
                      {r.tat_days ?? "-"}
                    </td>
                    <td style={td("center")}>
                      {r.timeline === "N/A" ? (
                        <span style={{ color: ui.textMuted }}>-</span>
                      ) : (
                        <span
                          style={{
                            fontSize: "0.66rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 99,
                            background: `${tone}22`,
                            color: tone,
                          }}
                        >
                          {r.timeline}
                        </span>
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
                    </td>
                    <td style={td("center")}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          onActions(r, rect);
                        }}
                        style={{ ...btn(false), color: ui.textPrimary }}
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
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
          fontSize: "0.72rem",
          color: ui.textMuted,
        }}
      >
        <span>
          Page {page} of {pages} · {fmt(res.total)} application
          {res.total === 1 ? "" : "s"}
        </span>
        <span style={{ display: "flex", gap: 6 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={btn(page <= 1)}
          >
            ← Prev
          </button>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            style={btn(page >= pages)}
          >
            Next →
          </button>
        </span>
      </div>
    </div>
  );
}

export default function ReleasedDocsModal({
  ui,
  darkMode,
  params,
  label,
  onClose,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState({}); // { docName: true }

  // Actions menu + sub-modals (same as the Analytics user modal)
  const [menu, setMenu] = useState(null); // { row, top, right }
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

  useEffect(() => {
    let stale = false;
    setLoading(true);
    setError(null);
    setOpen({});
    setMenu(null);
    getCompanyReleasedDocs(params)
      .then((res) => !stale && setData(res))
      .catch((e) => {
        if (!stale)
          setError(
            e?.response?.data?.detail || e?.message || "Failed to load data.",
          );
      })
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  const items = data?.data ?? [];
  const max = Math.max(...items.map((i) => i.count), 1);
  const received = params.view === "received";
  const toggle = (doc) => setOpen((o) => ({ ...o, [doc]: !o[doc] }));

  // colors object expected by the shared Records modals
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

  // Load the full record (same shape the Records page uses); fall back to the
  // few fields we already have if it can't be found.
  const openDetails = async (r) => {
    setDetail({ dtn: r.dtn, prodBrName: r.drug });
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
          width: 900,
          maxWidth: "94vw",
          maxHeight: "88vh",
          overflowY: "auto",
          background: darkMode ? "#1f2023" : "#fff",
          color: ui.textPrimary,
          borderRadius: 14,
          border: `1px solid ${line}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          padding: 20,
        }}
      >
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
        >
          <div>
            <div style={{ fontSize: "1rem", fontWeight: 700 }}>
              📑 Released applications by document type
            </div>
            <div
              style={{ fontSize: "0.75rem", color: ui.textMuted, marginTop: 2 }}
            >
              {label} ·{" "}
              {received
                ? "applications received in this period that are already released"
                : "applications released in this period"}
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

        {loading ? (
          <div
            style={{
              padding: 30,
              textAlign: "center",
              color: ui.textMuted,
              fontSize: "0.82rem",
            }}
          >
            Loading…
          </div>
        ) : error ? (
          <div style={{ padding: 20, color: RED, fontSize: "0.82rem" }}>
            ⚠️ {error}
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              padding: 30,
              textAlign: "center",
              color: ui.textMuted,
              fontSize: "0.82rem",
            }}
          >
            No released applications.
          </div>
        ) : (
          <>
            <div style={{ margin: "14px 0 6px", fontSize: "0.8rem" }}>
              Total released: <b>{fmt(data.total)}</b>
            </div>

            {/* Bar graph (click a bar to expand its applications) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {items.map((it, i) => (
                <div
                  key={it.doc}
                  onClick={() => toggle(it.doc)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                  }}
                >
                  <div
                    title={it.doc}
                    style={{
                      width: 190,
                      fontSize: "0.74rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {it.doc}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      background: darkMode
                        ? "rgba(255,255,255,0.06)"
                        : "#f1f3f9",
                      borderRadius: 6,
                      height: 20,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      title={`${it.doc}: ${fmt(it.count)} (${it.percent}%)`}
                      style={{
                        width: `${Math.max((it.count / max) * 100, 2)}%`,
                        height: "100%",
                        background: PALETTE[i % PALETTE.length],
                        borderRadius: 6,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      width: 80,
                      textAlign: "right",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                    }}
                  >
                    {fmt(it.count)}
                    <span style={{ color: ui.textMuted, fontWeight: 500 }}>
                      {" "}
                      · {it.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Table with expandable rows */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th()}>Document released</th>
                  <th style={th("right")}>Applications</th>
                  <th style={th("right")}>% of total</th>
                  <th style={th("right")}>Avg TAT (working days)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const isOpen = !!open[it.doc];
                  return (
                    <Fragment key={it.doc}>
                      <tr
                        onClick={() => toggle(it.doc)}
                        title={
                          isOpen
                            ? "Click to hide the applications"
                            : "Click to see the applications"
                        }
                        style={{
                          cursor: "pointer",
                          background: isOpen ? `${FB}12` : "transparent",
                        }}
                      >
                        <td style={td()}>
                          <span
                            style={{
                              display: "inline-block",
                              width: 14,
                              color: ui.textMuted,
                            }}
                          >
                            {isOpen ? "▾" : "▸"}
                          </span>
                          <span
                            style={{
                              display: "inline-block",
                              width: 9,
                              height: 9,
                              borderRadius: 2,
                              marginRight: 7,
                              background: PALETTE[i % PALETTE.length],
                            }}
                          />
                          {it.doc}
                        </td>
                        <td style={td("right", { fontWeight: 700 })}>
                          {fmt(it.count)}
                        </td>
                        <td
                          style={td("right", { cursor: "help" })}
                          title={`${fmt(it.count)} ÷ ${fmt(data.total)} × 100 = ${it.percent}%`}
                        >
                          {it.percent}%
                        </td>
                        <td style={td("right")}>{fmtAvg(it.avg_tat)}</td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td
                            colSpan={4}
                            style={{
                              padding: 0,
                              borderBottom: `1px solid ${ui.divider}`,
                            }}
                          >
                            <DocApps
                              ui={ui}
                              darkMode={darkMode}
                              params={params}
                              doc={it.doc}
                              line={line}
                              th={th}
                              td={td}
                              onDtn={(r) => setDoctrackRow(r)}
                              onActions={(r, rect) =>
                                setMenu({
                                  row: r,
                                  top: rect.bottom + 4,
                                  right: window.innerWidth - rect.right,
                                })
                              }
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                <tr>
                  <td style={td("left", { fontWeight: 800 })}>Total</td>
                  <td style={td("right", { fontWeight: 800 })}>
                    {fmt(data.total)}
                  </td>
                  <td style={td("right", { fontWeight: 800 })}>100%</td>
                  <td style={td("right")}></td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Actions menu */}
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

      {/* Sub-modals. The wrapper stops their clicks from bubbling up and closing this modal. */}
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
