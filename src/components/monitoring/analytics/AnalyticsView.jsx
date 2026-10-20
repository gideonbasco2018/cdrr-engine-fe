// src/components/monitoring/analytics/AnalyticsView.jsx
import { useState, useEffect, useCallback, useRef } from "react";

import {
  getAnalyticsAvailableYears,
  getAnalyticsSummary,
  getAnalyticsTrend,
  getAnalyticsByClassification,
  getAnalyticsYearSummary,
  getAnalyticsYearRecords,
  getAnalyticsSummaryRecords,
  getAnalyticsTopDrugs,
  getAnalyticsTopCountries,
  getDocTypeReleased,
} from "../../../api/analytics";

import DoctrackModal from "../../reports/actions/DoctrackModal";
import ViewDetailsModal from "../../reports/actions/ViewDetailsModal";
import ApplicationLogsModal from "../../tasks/ApplicationLogsModal";
import EditRecordModal from "../../reports/actions/EditRecordModal";
import * as XLSX from "xlsx";
// ── Split modules ─────────────────────────────────────────────
import "./analyticsAnimations";
import { FB, MONTHS, ENTITY_TYPES, COUNTRY_FLAGS } from "./analyticsConstants";
import { neuCardBg, neuShadow, neuInputShadow } from "./analyticsHelpers";
import { SkeletonBox, SectionCardSkeleton } from "./SkeletonComponents";
import { FadeSlideIn } from "./KpiCard";
import { SectionCard } from "./SectionCard";
import { MiniBar, TrendChart, DonutChart } from "./ChartComponents";
import { CountryList } from "./CountryComponents";

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const CHART_SKELETON_HEIGHT = 260;
const DRUGS_PAGE_SIZE = 10;

const DOC_TYPE_COLOR = {
  CPR: "#36a420",
  LOD: "#e02020",
  GLE: "#0891b2",
  Cert: "#9333ea",
  CERT: "#9333ea", // merged Cert + Certificate
  COPP: "#f59e0b",
  CFS: "#e87c13",
};

const TYPE_COLORS = {
  RX: "#4f8ef7",
  OTC: "#f59e0b",
  HR: "#0891b2",
  Vaccine: "#36a420",
};

const docTypeColor = (dt) => DOC_TYPE_COLOR[dt] ?? FB;
const classTypeColor = (short) => TYPE_COLORS[short] ?? FB;

// Cert / CERT / Certificate -> "CERT"
const normalizeDocType = (dt) => {
  const raw = String(dt).trim();
  const k = raw.toLowerCase();
  return k === "cert" || k === "certificate" ? "CERT" : raw;
};
// LOD ay "LETTER" sa header
const docTypeLabel = (dt) => dt;

// Rate = Total Released / Received Application (lahat ng released)
const releasedRate = (row) => {
  const received = Number(row.received) || 0;
  const released = Number(row.total) || 0;
  return received > 0 ? (released / received) * 100 : 0;
};
const DOC_ORDER = ["CERT", "CPR", "GLE", "LOD"];

// ── Year Summary drill-down modal ─────────────────────────────
const RECORDS_PAGE_SIZE = 50;

const NONE_KEY = "__NONE__";

const statusColor = (status) => {
  const s = String(status ?? "")
    .toUpperCase()
    .replace(/[\s_-]+/g, " ")
    .trim();
  if (s === "COMPLETED") return "#36a420";
  if (s === "ON PROCESS" || s === "IN PROGRESS") return "#f59e0b";
  return "#9ca3af";
};
const facetLabel = (key, noneLabel) => (key === NONE_KEY ? noneLabel : key);

// ── Password gate shown before editing a record ──────────────
const EDIT_PASSWORD = "dikoalam12345";

// TODO: replace with the real update function used by the Records page.
// Until it is wired, saving will show this error instead of failing silently.
const updateUploadReport = async () => {
  throw new Error("updateUploadReport is not wired yet.");
};

function PasswordPromptModal({ onConfirm, onCancel, ui, darkMode }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const line = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    if (value === EDIT_PASSWORD) {
      onConfirm();
    } else {
      setError("Incorrect password. Please try again.");
      setValue("");
      inputRef.current?.focus();
    }
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(380px, 100%)",
          background: neuCardBg(darkMode),
          borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          padding: 20,
          fontFamily: font,
        }}
      >
        <div
          style={{
            fontSize: "0.95rem",
            fontWeight: 700,
            color: ui.textPrimary,
          }}
        >
          🔒 Password required
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: ui.textMuted,
            margin: "4px 0 14px",
          }}
        >
          Enter the password to update this application's information.
        </div>
        <input
          ref={inputRef}
          type="password"
          value={value}
          placeholder="Password"
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onCancel();
          }}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: neuCardBg(darkMode),
            border: `1px solid ${error ? "#e02020" : line}`,
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: "0.85rem",
            color: ui.textPrimary,
            outline: "none",
            fontFamily: font,
            colorScheme: darkMode ? "dark" : "light",
          }}
        />
        {error && (
          <div style={{ fontSize: "0.72rem", color: "#e02020", marginTop: 6 }}>
            {error}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "6px 14px",
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
            onClick={submit}
            style={{
              padding: "6px 14px",
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
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function YearRecordsModal({ target, basis, ui, darkMode, onClose }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [docFilter, setDocFilter] = useState(target.docType ?? "All");
  const [statusCounts, setStatusCounts] = useState([]);
  const [docCounts, setDocCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [doctrackRow, setDoctrackRow] = useState(null);
  const [detail, setDetail] = useState(null); // full or partial record
  const [detailLoading, setDetailLoading] = useState(false);
  const [menu, setMenu] = useState(null); // { row, top, right }
  const subOpenRef = useRef(false);
  const [logsRow, setLogsRow] = useState(null);
  const [passwordRow, setPasswordRow] = useState(null); // row waiting for password
  const [editRecord, setEditRecord] = useState(null); // record being edited
  const [reloadKey, setReloadKey] = useState(0); // bump to refetch rows after save
  subOpenRef.current = !!(
    doctrackRow ||
    detail ||
    logsRow ||
    passwordRow ||
    editRecord
  );

  const buildEditRecord = (r) => ({
    id: r.db_id,
    dtn: r.dtn,
    entryType: r.entry_type,
    dateReceivedCent: r.date_received_cent,
    dateReleased: r.date_released,
    typeDocReleased: r.type_doc_released,
    appStatus: r.app_status,
    prodBrName: r.brand_name,
    prodGenName: r.generic_name,
    secpaExpDate: r.secpa_exp_date,
  });

  const openDetails = async (r) => {
    const partial = {
      dtn: r.dtn,
      entryType: r.entry_type,
      dateReceivedCent: r.date_received_cent,
      dateReleased: r.date_released,
      typeDocReleased: r.type_doc_released,
      appStatus: r.app_status,
      prodBrName: r.brand_name,
      prodGenName: r.generic_name,
      secpaExpDate: r.secpa_exp_date,
    };
    setDetail(partial);
    setDetailLoading(false);
  };

  const colors = {
    cardBg: neuCardBg(darkMode),
    cardBorder: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)",
    tableBg: darkMode ? "#222222" : "#f7f8fa",
    tableRowHover: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
    inputBg: darkMode ? "#222222" : "#f7f8fa",
    badgeBg: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    textPrimary: ui.textPrimary,
    textSecondary: ui.textSub ?? ui.textPrimary,
    textTertiary: ui.textMuted,
  };

  // debounce DTN search
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const common = {
          page,
          page_size: RECORDS_PAGE_SIZE,
          search: query || undefined,
          status: statusFilter === "All" ? undefined : statusFilter,
          doc_type: docFilter === "All" ? undefined : docFilter,
        };
        const res = target.summary
          ? await getAnalyticsSummaryRecords({ ...target.summary, ...common })
          : await getAnalyticsYearRecords({
              year: target.year,
              kind: target.kind,
              basis,
              ...common,
            });
        if (cancelled) return;
        setRows(res.data ?? []);
        setTotal(res.total ?? 0);
        setStatusCounts(res.status_counts ?? []);
        setDocCounts(res.doc_type_counts ?? []);
      } catch (err) {
        console.error("Year records fetch error:", err);
        if (!cancelled) setError("Failed to load records.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [target, basis, page, query, statusFilter, docFilter, reloadKey]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !subOpenRef.current && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const line = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";
  const totalPages = Math.max(Math.ceil(total / RECORDS_PAGE_SIZE), 1);
  const start = total === 0 ? 0 : (page - 1) * RECORDS_PAGE_SIZE + 1;
  const end = Math.min(page * RECORDS_PAGE_SIZE, total);
  const filtersActive =
    statusFilter !== "All" || docFilter !== "All" || query !== "";

  const statusAll = statusCounts.reduce((s, x) => s + x.count, 0);
  // keep the selected option visible even if its count dropped to 0
  const statusOptions =
    statusFilter !== "All" && !statusCounts.some((x) => x.key === statusFilter)
      ? [...statusCounts, { key: statusFilter, count: 0 }]
      : statusCounts;
  const docOptions =
    docFilter !== "All" && !docCounts.some((x) => x.key === docFilter)
      ? [...docCounts, { key: docFilter, count: 0 }]
      : docCounts;

  const clearFilters = () => {
    setStatusFilter("All");
    setDocFilter("All");
    setSearch("");
    setQuery("");
    setPage(1);
  };
  const baseTitle =
    target.kind === "received"
      ? `${target.year} — Received Applications`
      : basis === "received"
        ? `${target.year} — Released (of Received in ${target.year})`
        : `${target.year} — Released in ${target.year}`;
  const title = target.docType
    ? `${baseTitle} · ${facetLabel(target.docType, "No Doc Type")}`
    : baseTitle;

  const th = {
    padding: "8px 10px",
    textAlign: "left",
    fontSize: "0.65rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
    border: `1px solid ${line}`,
    whiteSpace: "nowrap",
    background: neuCardBg(darkMode),
    position: "sticky",
    top: 0,
    zIndex: 1,
  };
  const td = {
    padding: "8px 10px",
    fontSize: "0.78rem",
    fontWeight: 500,
    color: ui.textPrimary,
    border: `1px solid ${line}`,
    whiteSpace: "nowrap",
  };
  const pageBtn = (disabled) => ({
    padding: "4px 12px",
    fontSize: "0.75rem",
    borderRadius: 8,
    border: "none",
    background: neuCardBg(darkMode),
    color: ui.textPrimary,
    boxShadow: neuShadow(darkMode, true),
    fontFamily: font,
    opacity: disabled ? 0.35 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  });
  const chip = (active, color) => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 12px",
    fontSize: "0.72rem",
    fontWeight: active ? 700 : 500,
    borderRadius: 99,
    border: `1px solid ${active ? color : line}`,
    background: active ? `${color}22` : "transparent",
    color: active ? color : ui.textMuted,
    cursor: "pointer",
    fontFamily: font,
    transition: "all 0.15s",
  });
  const selectSt = {
    background: neuCardBg(darkMode),
    border: `1px solid ${line}`,
    borderRadius: 8,
    padding: "5px 10px",
    fontSize: "0.75rem",
    color: ui.textPrimary,
    outline: "none",
    fontFamily: font,
    colorScheme: darkMode ? "dark" : "light",
    maxWidth: 220,
  };
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            setMenu(null);
          }}
          style={{
            width: "min(1100px, 100%)",
            maxHeight: "88vh",
            display: "flex",
            flexDirection: "column",
            background: neuCardBg(darkMode),
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            fontFamily: font,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "14px 18px",
              borderBottom: `1px solid ${line}`,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: ui.textPrimary,
                }}
              >
                {target.title ?? title}
              </div>
              <div style={{ fontSize: "0.72rem", color: ui.textMuted }}>
                {loading
                  ? "Loading…"
                  : `${total.toLocaleString()} record(s)${filtersActive ? " (filtered)" : ""}`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search DTN…"
                style={{
                  background: neuCardBg(darkMode),
                  border: `1px solid ${line}`,
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: "0.78rem",
                  color: ui.textPrimary,
                  outline: "none",
                  fontFamily: font,
                  colorScheme: darkMode ? "dark" : "light",
                }}
              />
              <button
                onClick={onClose}
                title="Close (Esc)"
                style={{
                  ...pageBtn(false),
                  fontSize: "0.9rem",
                  padding: "4px 10px",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filters + status counts */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "10px 18px",
              borderBottom: `1px solid ${line}`,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  setStatusFilter("All");
                  setPage(1);
                }}
                style={chip(statusFilter === "All", FB)}
              >
                All <b>{statusAll.toLocaleString()}</b>
              </button>
              {statusOptions.map((s) => {
                const color = statusColor(s.key);
                return (
                  <button
                    key={s.key}
                    onClick={() => {
                      setStatusFilter(statusFilter === s.key ? "All" : s.key);
                      setPage(1);
                    }}
                    style={chip(statusFilter === s.key, color)}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: color,
                      }}
                    />
                    {facetLabel(s.key, "No Status")}{" "}
                    <b>{s.count.toLocaleString()}</b>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: ui.textMuted,
                }}
              >
                Doc Type
              </span>
              <select
                value={docFilter}
                onChange={(e) => {
                  setDocFilter(e.target.value);
                  setPage(1);
                }}
                style={selectSt}
              >
                <option value="All">All</option>
                {docOptions.map((d) => (
                  <option key={d.key} value={d.key}>
                    {facetLabel(d.key, "No Doc Type")} (
                    {d.count.toLocaleString()})
                  </option>
                ))}
              </select>
              {filtersActive && (
                <button
                  onClick={clearFilters}
                  style={{ ...pageBtn(false), fontSize: "0.7rem" }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div
            style={{
              overflow: "auto",
              flex: 1,
              opacity: loading ? 0.5 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {error ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 40,
                  color: ui.textMuted,
                  fontSize: "0.85rem",
                }}
              >
                {error}
              </div>
            ) : !loading && rows.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 40,
                  color: ui.textMuted,
                  fontSize: "0.85rem",
                }}
              >
                No records found
              </div>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.8rem",
                }}
              >
                <thead>
                  <tr>
                    <th style={{ ...th, textAlign: "center" }}>#</th>
                    <th style={th}>DTN</th>
                    <th style={th}>Entry Type</th>
                    <th style={th}>Date Received (Center)</th>
                    <th style={th}>Date Released</th>
                    {target.summary && <th style={th}>Validity</th>}
                    <th style={th}>Type of Doc Released</th>
                    <th style={th}>Status</th>
                    <th style={th}>Brand Name</th>
                    <th style={th}>Generic Name</th>
                    <th
                      style={{
                        ...th,
                        position: "sticky",
                        top: 0,
                        right: 0,
                        zIndex: 3,
                        textAlign: "center",
                        boxShadow: `-6px 0 8px -6px rgba(0,0,0,0.35)`,
                      }}
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.db_id}>
                      <td
                        style={{
                          ...td,
                          textAlign: "center",
                          color: ui.textMuted,
                        }}
                      >
                        {(page - 1) * RECORDS_PAGE_SIZE + i + 1}
                      </td>
                      <td style={td}>
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
                      <td style={td}>{r.entry_type ?? "—"}</td>
                      <td style={td}>{r.date_received_cent ?? "—"}</td>
                      <td style={td}>{r.date_released ?? "—"}</td>
                      {target.summary && (
                        <td style={td}>{r.secpa_exp_date ?? "—"}</td>
                      )}
                      <td style={td}>{r.type_doc_released ?? "—"}</td>
                      <td style={td}>
                        {r.app_status ? (
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 99,
                              color: statusColor(r.app_status),
                              background: `${statusColor(r.app_status)}22`,
                            }}
                          >
                            {r.app_status}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={td}>{r.brand_name ?? "—"}</td>
                      <td style={td}>{r.generic_name ?? "—"}</td>
                      <td
                        style={{
                          ...td,
                          position: "sticky",
                          right: 0,
                          zIndex: 2,
                          textAlign: "center",
                          background: neuCardBg(darkMode),
                          boxShadow: `-6px 0 8px -6px rgba(0,0,0,0.35)`,
                        }}
                      >
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
                          style={{ ...pageBtn(false), padding: "3px 10px" }}
                        >
                          Actions ▾
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer / pagination */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 18px",
              borderTop: `1px solid ${line}`,
            }}
          >
            <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
              {start}–{end} of {total.toLocaleString()}
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                style={pageBtn(page === 1)}
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ‹ Prev
              </button>
              <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
                Page {page} / {totalPages}
              </span>
              <button
                style={pageBtn(page >= totalPages)}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Actions dropdown */}
      {menu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: menu.top,
            right: menu.right,
            zIndex: 1100,
            minWidth: 150,
            background: neuCardBg(darkMode),
            border: `1px solid ${line}`,
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
            padding: 4,
            fontFamily: font,
          }}
        >
          <button
            onClick={() => {
              const row = menu.row;
              setMenu(null);
              openDetails(row);
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
            👁 View Details
          </button>
          <button
            onClick={() => {
              const row = menu.row;
              setMenu(null);
              setLogsRow(row);
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
            📋 View Application Logs
          </button>
          <button
            onClick={() => {
              const row = menu.row;
              setMenu(null);
              setPasswordRow(row);
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
            ✏️ Update Application Info
          </button>
        </div>
      )}
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

      {passwordRow && (
        <PasswordPromptModal
          ui={ui}
          darkMode={darkMode}
          onCancel={() => setPasswordRow(null)}
          onConfirm={() => {
            setEditRecord(buildEditRecord(passwordRow));
            setPasswordRow(null);
          }}
        />
      )}

      {editRecord && (
        <EditRecordModal
          record={editRecord}
          colors={colors}
          darkMode={darkMode}
          updateUploadReport={updateUploadReport}
          onClose={() => setEditRecord(null)}
          onSuccess={() => setReloadKey((k) => k + 1)}
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
    </>
  );
}

// ── Compact KPI tile (optional hover breakdown) ──────────────
function KpiTile({
  icon,
  label,
  value,
  sub,
  color,
  darkMode,
  ui,
  delay = 0,
  breakdown,
}) {
  const [hov, setHov] = useState(false);
  const line = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";

  // number that becomes a clickable link when onClick is given
  const Val = ({ n, c, onClick, size }) =>
    onClick && n > 0 ? (
      <span
        onClick={onClick}
        title="Click to view records"
        style={{
          fontSize: size,
          fontWeight: size === "1rem" ? 800 : 700,
          color: c,
          cursor: "pointer",
          textDecoration: "underline dotted",
          textUnderlineOffset: 3,
        }}
      >
        {n.toLocaleString()}
      </span>
    ) : (
      <span
        style={{
          fontSize: size,
          fontWeight: size === "1rem" ? 800 : 700,
          color: c,
        }}
      >
        {n.toLocaleString()}
      </span>
    );

  return (
    <div
      onMouseEnter={() => breakdown && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative",
        zIndex: hov ? 10 : 1,
        background: neuCardBg(darkMode),
        borderRadius: 12,
        padding: "9px 14px 10px",
        boxShadow: neuShadow(darkMode),
        borderTop: `2px solid ${color}`,
        cursor: breakdown ? "help" : "default",
        animation: "analytics-fade-slide-up 0.4s ease both",
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: "0.62rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: ui.textMuted,
          }}
        >
          {label}
          {breakdown && <span style={{ marginLeft: 4, opacity: 0.7 }}>ⓘ</span>}
        </span>
        <span style={{ fontSize: "0.85rem" }}>{icon}</span>
      </div>
      <div
        style={{
          fontSize: "1.3rem",
          fontWeight: 800,
          color,
          lineHeight: 1.2,
          margin: "3px 0 1px",
        }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: "0.62rem", color: ui.textMuted }}>{sub}</div>

      {hov && breakdown && (
        // paddingTop bridges the gap so the popup stays open while moving the mouse into it
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            paddingTop: 8,
            zIndex: 20,
          }}
        >
          <div
            style={{
              minWidth: 250,
              background: neuCardBg(darkMode),
              border: `1px solid ${line}`,
              borderRadius: 12,
              padding: "12px 14px",
              boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {breakdown.map((sec, i) => (
              <div
                key={sec.title}
                style={{
                  borderTop: i > 0 ? `1px solid ${line}` : "none",
                  paddingTop: i > 0 ? 10 : 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 16,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: sec.color,
                    }}
                  >
                    {sec.title}
                  </span>
                  <Val
                    n={sec.total}
                    c={sec.color}
                    onClick={sec.onClick}
                    size="1rem"
                  />
                </div>
                {(sec.rows ?? [])
                  .filter((r) => r.show !== false)
                  .map((r) => (
                    <div
                      key={r.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 16,
                        padding: "4px 0 0 10px",
                        fontSize: "0.72rem",
                      }}
                    >
                      <span style={{ color: ui.textMuted }}>{r.label}</span>
                      <Val
                        n={r.value}
                        c={r.color}
                        onClick={r.onClick}
                        size="0.72rem"
                      />
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pure SVG pie chart (no deps) ─────────────────────────────
function PieChart({ slices, darkMode, ui }) {
  const [hovered, setHovered] = useState(null);
  const cx = 110,
    cy = 110,
    r = 80,
    gap = 1.5;

  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0)
    return (
      <div
        style={{
          textAlign: "center",
          color: ui.textMuted,
          fontSize: "0.8rem",
          padding: "24px 0",
        }}
      >
        No data
      </div>
    );

  // build arcs
  let cursor = -Math.PI / 2;
  const arcs = slices.map((sl) => {
    const angle = (sl.value / total) * 2 * Math.PI;
    const start = cursor + gap / r;
    const end = cursor + angle - gap / r;
    cursor += angle;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = angle > Math.PI ? 1 : 0;
    const midAngle = (start + end) / 2;
    return {
      ...sl,
      path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`,
      midAngle,
      pct: ((sl.value / total) * 100).toFixed(1),
    };
  });

  const hoveredSlice = hovered !== null ? arcs[hovered] : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      {/* SVG */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width={220} height={220} style={{ overflow: "visible" }}>
          {arcs.map((arc, i) => {
            const isHov = hovered === i;
            const ox = isHov ? Math.cos(arc.midAngle) * 8 : 0;
            const oy = isHov ? Math.sin(arc.midAngle) * 8 : 0;
            return (
              <path
                key={i}
                d={arc.path}
                fill={arc.color}
                opacity={hovered === null || isHov ? 1 : 0.45}
                transform={`translate(${ox},${oy})`}
                style={{ cursor: "pointer", transition: "all 0.18s ease" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
          {/* center label */}
          {hoveredSlice ? (
            <>
              <text
                x={cx}
                y={cy - 8}
                textAnchor="middle"
                fontSize={13}
                fontWeight={800}
                fill={hoveredSlice.color}
                fontFamily={font}
              >
                {hoveredSlice.pct}%
              </text>
              <text
                x={cx}
                y={cy + 10}
                textAnchor="middle"
                fontSize={9}
                fill={ui.textMuted}
                fontFamily={font}
              >
                {hoveredSlice.value.toLocaleString()}
              </text>
            </>
          ) : (
            <>
              <text
                x={cx}
                y={cy - 6}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill={ui.textPrimary}
                fontFamily={font}
              >
                Total
              </text>
              <text
                x={cx}
                y={cy + 11}
                textAnchor="middle"
                fontSize={13}
                fontWeight={800}
                fill={ui.textPrimary}
                fontFamily={font}
              >
                {total.toLocaleString()}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 7,
          flex: 1,
          minWidth: 120,
        }}
      >
        {arcs.map((arc, i) => (
          <div
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              opacity: hovered === null || hovered === i ? 1 : 0.4,
              transition: "opacity 0.15s",
              padding: "4px 8px",
              borderRadius: 8,
              background:
                hovered === i
                  ? darkMode
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.04)"
                  : "transparent",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: arc.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "0.72rem",
                color: ui.textPrimary,
                fontWeight: hovered === i ? 700 : 500,
                flex: 1,
              }}
            >
              {arc.name}
            </span>
            <span
              style={{ fontSize: "0.72rem", fontWeight: 700, color: arc.color }}
            >
              {arc.pct}%
            </span>
            <span style={{ fontSize: "0.68rem", color: ui.textMuted }}>
              {arc.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Skeleton rows shown while a section is loading ───────────
function LoadingRows({ rows = 5, height = 28, darkMode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBox
          key={i}
          width="100%"
          height={height}
          radius={6}
          darkMode={darkMode}
          style={{ opacity: 1 - i * 0.1 }}
        />
      ))}
    </div>
  );
}

export default function AnalyticsView({ ui, darkMode, onSliceClick }) {
  // Filtering is temporarily disabled: always show all data.
  const chartYear = "All";
  const chartMonth = "All";
  const rxFilter = "All";
  const [availableYears, setAvailableYears] = useState(["All"]);
  const [summary, setSummary] = useState({
    total: 0,
    cpr: 0,
    lod: 0,
    on_process: 0,
    in_progress: 0,
    completed: 0,
    cpr_expired: 0,
    cpr_not_expired: 0,
    cpr_no_expiry: 0,
    cpr_completed: 0,
    lod_completed: 0,
    approval_rate: 0,
  });
  const [trendData, setTrendData] = useState([]);
  const [classificationData, setClassificationData] = useState([]);
  const [classDocTypes, setClassDocTypes] = useState([]);
  const [yearSummaryData, setYearSummaryData] = useState([]);
  const [topDrugsData, setTopDrugsData] = useState([]);
  const [topCountriesData, setTopCountriesData] = useState([]);
  const [docTypeData, setDocTypeData] = useState({ doc_types: [], data: [] });
  const [loadingSec, setLoadingSec] = useState({
    kpi: true,
    trend: true,
    classification: true,
    countries: true,
    drugs: true,
  });
  const runId = useRef(0);
  const loadedTabRef = useRef("mfr");
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [topCountryTab, setTopCountryTab] = useState("mfr");
  const [lastUpdated, setLastUpdated] = useState(null);
  // ── Trend card has its own year filter (default 2026) ────────
  const [trendYear, setTrendYear] = useState("2026");
  const trendRunId = useRef(0);

  // ── Pie toggle: "classification" | "doctype" ─────────────────
  const [pieView, setPieView] = useState("classification");

  // ── Year summary basis: "released" | "received" ──────────────
  const [yearBasis, setYearBasis] = useState("released");
  const [recordsTarget, setRecordsTarget] = useState(null); // { year, kind }
  const [loadingYear, setLoadingYear] = useState(true);

  // ── Pagination ────────────────────────────────────────────────
  const [drugsPage, setDrugsPage] = useState(1);
  useEffect(() => {
    setDrugsPage(1);
  }, [chartYear, chartMonth, rxFilter]);

  // ── Fetch main ────────────────────────────────────────────────

  const fetchMain = useCallback(async () => {
    const id = ++runId.current;
    const stale = () => id !== runId.current;
    const params = {
      year: chartYear,
      month: chartMonth,
      prescription: rxFilter,
    };

    const run = async (key, task) => {
      setLoadingSec((s) => ({ ...s, [key]: true }));
      try {
        await task();
      } catch (err) {
        console.error(`Analytics ${key} fetch error:`, err);
      } finally {
        if (!stale()) setLoadingSec((s) => ({ ...s, [key]: false }));
      }
    };

    // 1)
    await run("kpi", async () => {
      const sum = await getAnalyticsSummary(params);
      if (!stale()) setSummary(sum);
    });
    if (stale()) return;

    // 2)
    await run("classification", async () => {
      const res = await getAnalyticsByClassification(params);
      if (stale()) return;
      setClassificationData(res.data ?? []);
      setClassDocTypes(res.doc_types ?? []);
    });
    if (stale()) return;

    await run("countries", async () => {
      const res = await getAnalyticsTopCountries({
        ...params,
        entity_type: topCountryTab,
        limit: 999,
      });
      if (stale()) return;
      setTopCountriesData(res.data ?? []);
      loadedTabRef.current = topCountryTab;
    });
    if (stale()) return;

    // 3)
    await run("drugs", async () => {
      const res = await getAnalyticsTopDrugs(params);
      if (!stale()) setTopDrugsData(res.data ?? []);
    });
    if (!stale()) setLastUpdated(new Date());
  }, [chartYear, chartMonth, rxFilter]);

  const fetchCountries = useCallback(async () => {
    setLoadingCountries(true);
    try {
      const countries = await getAnalyticsTopCountries({
        year: chartYear,
        month: chartMonth,
        prescription: rxFilter,
        entity_type: topCountryTab,
        limit: 999,
      });
      setTopCountriesData(countries.data ?? []);
      loadedTabRef.current = topCountryTab;
    } catch (err) {
      console.error("Top countries fetch error:", err);
    } finally {
      setLoadingCountries(false);
    }
  }, [chartYear, chartMonth, rxFilter, topCountryTab]);

  const fetchYearSummary = useCallback(async () => {
    setLoadingYear(true);
    try {
      const [yearSum, docType] = await Promise.all([
        getAnalyticsYearSummary({ basis: yearBasis }),
        getDocTypeReleased({ basis: yearBasis }),
      ]);
      setYearSummaryData(yearSum.data ?? []);
      setDocTypeData(docType ?? { doc_types: [], data: [] });
    } catch (err) {
      console.error("Year summary fetch error:", err);
    } finally {
      setLoadingYear(false);
    }
  }, [yearBasis]);

  const fetchTrend = useCallback(async () => {
    const id = ++trendRunId.current;
    setLoadingSec((s) => ({ ...s, trend: true }));
    try {
      const trend = await getAnalyticsTrend({
        year: trendYear,
        month: chartMonth,
        prescription: rxFilter,
      });
      if (id !== trendRunId.current) return;
      setTrendData(trend.data ?? []);
    } catch (err) {
      console.error("Trend fetch error:", err);
    } finally {
      if (id === trendRunId.current) {
        setLoadingSec((s) => ({ ...s, trend: false }));
      }
    }
  }, [trendYear, chartMonth, rxFilter]);

  useEffect(() => {
    fetchMain();
  }, [chartYear, chartMonth, rxFilter]);

  useEffect(() => {
    fetchYearSummary();
  }, [yearBasis]);

  useEffect(() => {
    fetchTrend();
  }, [fetchTrend]);

  useEffect(() => {
    if (loadedTabRef.current === topCountryTab) return;
    fetchCountries();
  }, [topCountryTab]);

  // ── Derived ───────────────────────────────────────────────────
  const pieData = [
    { name: "CPR Released", value: summary.cpr },
    { name: "LOD Released", value: summary.lod },
    { name: "In Progress", value: summary.in_progress ?? summary.on_process },
  ];

  const trendYearOptions = [
    ...new Set([...yearSummaryData.map((r) => String(r.year)), trendYear]),
  ]
    .filter((y) => y !== "All")
    .sort((a, b) => Number(b) - Number(a));
  const maxDrug = Math.max(...topDrugsData.map((d) => d.total), 1);
  const maxCountry = Math.max(...topCountriesData.map((d) => d.count), 1);

  const drugsTotalPages = Math.ceil(topDrugsData.length / DRUGS_PAGE_SIZE);
  const pagedDrugs = topDrugsData.slice(
    (drugsPage - 1) * DRUGS_PAGE_SIZE,
    drugsPage * DRUGS_PAGE_SIZE,
  );

  // ── Pie slices ────────────────────────────────────────────────
  const classPieSlices = classificationData.map((row) => {
    const short =
      row.type === "Prescription Drug (RX)"
        ? "RX"
        : row.type === "Over-the-Counter (OTC)"
          ? "OTC"
          : row.type === "Household Remedy (HR)"
            ? "HR"
            : row.type;
    return { name: row.type, value: row.count, color: classTypeColor(short) };
  });

  const docTypePieSlices = classDocTypes
    .map((dt) => ({
      name: dt,
      value: classificationData.reduce(
        (s, row) => s + (row.by_doc_type?.[dt] ?? 0),
        0,
      ),
      color: docTypeColor(dt),
    }))
    .filter((s) => s.value > 0);

  const activePieSlices =
    pieView === "classification" ? classPieSlices : docTypePieSlices;

  // ── Merged doc types for Year Summary (Cert + Certificate = CERT) ──
  const mergedDocTypes = [
    ...new Set((docTypeData.doc_types ?? []).map(normalizeDocType)),
  ].sort((a, b) => {
    const ia = DOC_ORDER.indexOf(a),
      ib = DOC_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const getDocCounts = (year) => {
    const docRow = docTypeData.data.find(
      (d) => String(d.year) === String(year),
    );
    const counts = Object.fromEntries(mergedDocTypes.map((dt) => [dt, 0]));
    Object.entries(docRow?.by_doc_type ?? {}).forEach(([dt, n]) => {
      const k = normalizeDocType(dt);
      counts[k] = (counts[k] ?? 0) + (Number(n) || 0);
    });
    return counts;
  };

  const yearTotals = (() => {
    const t = {
      received: 0,
      total: 0,
      docs: Object.fromEntries(mergedDocTypes.map((dt) => [dt, 0])),
      noDoc: 0,
    };
    yearSummaryData.forEach((row) => {
      const counts = getDocCounts(row.year);
      const released = Number(row.total) || 0;
      let docSum = 0;
      mergedDocTypes.forEach((dt) => {
        t.docs[dt] += counts[dt];
        docSum += counts[dt];
      });
      t.received += Number(row.received) || 0;
      t.total += released;
      t.noDoc += Math.max(released - docSum, 0);
    });
    return t;
  })();

  // ── Styles ────────────────────────────────────────────────────
  const inputSt = {
    background: neuCardBg(darkMode),
    border: "none",
    borderRadius: 10,
    padding: "7px 12px",
    fontSize: "0.8rem",
    color: ui.textPrimary,
    outline: "none",
    boxShadow: neuInputShadow(darkMode),
    colorScheme: darkMode ? "dark" : "light",
    fontFamily: font,
  };

  const neuBtnStyle = (isActive) => ({
    padding: "5px 12px",
    fontSize: "0.72rem",
    fontWeight: isActive ? 700 : 500,
    borderRadius: 10,
    border: "none",
    background: neuCardBg(darkMode),
    color: isActive ? FB : ui.textMuted,
    cursor: "pointer",
    fontFamily: font,
    boxShadow: isActive
      ? neuShadow(darkMode, false)
      : neuShadow(darkMode, true),
    transition: "all 0.2s ease",
  });

  const thStyle = (left = false) => ({
    padding: "8px 10px",
    textAlign: left ? "left" : "center",
    fontSize: "0.63rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
    borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
    whiteSpace: "nowrap",
    background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
  });

  const tdStyle = (color = ui.textPrimary, left = false) => ({
    padding: "9px 10px",
    textAlign: left ? "left" : "center",
    fontSize: "0.78rem",
    fontWeight: 600,
    color,
    whiteSpace: "nowrap",
  });

  // ── Year Summary bordered cells ──
  const ysLine = `1px solid ${darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)"}`;
  const ysTh = (left = false) => ({
    ...thStyle(left),
    border: ysLine,
  });
  const ysTd = (color = ui.textPrimary, left = false) => ({
    ...tdStyle(color, left),
    border: ysLine,
  });

  const linkSt = {
    cursor: "pointer",
    textDecoration: "underline dotted",
    textUnderlineOffset: 3,
  };
  const totalCell = {
    fontWeight: 800,
    background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    borderTop: `2px solid ${darkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)"}`,
  };
  const openYearDocRecords = (year, docType) =>
    setRecordsTarget({ year: Number(year), kind: "released", docType });

  // ── Pagination component ──────────────────────────────────────
  const Pagination = ({ page, totalPages, onPageChange, total, pageSize }) => {
    if (totalPages <= 1) return null;
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 10,
          paddingTop: 10,
          borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        }}
      >
        <span style={{ fontSize: "0.68rem", color: ui.textMuted }}>
          {start}–{end} of {total}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            style={{
              ...neuBtnStyle(false),
              padding: "4px 10px",
              opacity: page === 1 ? 0.35 : 1,
              cursor: page === 1 ? "not-allowed" : "pointer",
            }}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
            )
            .reduce((acc, p, i, arr) => {
              if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "…" ? (
                <span
                  key={`e-${i}`}
                  style={{
                    padding: "4px 6px",
                    fontSize: "0.68rem",
                    color: ui.textMuted,
                  }}
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  style={{
                    ...neuBtnStyle(page === p),
                    padding: "4px 10px",
                    minWidth: 28,
                  }}
                >
                  {p}
                </button>
              ),
            )}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            style={{
              ...neuBtnStyle(false),
              padding: "4px 10px",
              opacity: page === totalPages ? 0.35 : 1,
              cursor: page === totalPages ? "not-allowed" : "pointer",
            }}
          >
            ›
          </button>
        </div>
      </div>
    );
  };

  // ── Export Year-by-Year Summary to Excel ──────────────────────
  const handleExportYearSummary = () => {
    const header = [
      "Year",
      "Received Application",
      "Total Released",
      "Rate (%) = Released ÷ Received × 100",
      ...mergedDocTypes.map(docTypeLabel),
      "No Doc Type",
    ];

    const rows = yearSummaryData.map((row) => {
      const counts = getDocCounts(row.year);
      const docCounts = mergedDocTypes.map((dt) => counts[dt]);
      const docSum = docCounts.reduce((s, n) => s + n, 0);
      return [
        Number(row.year) || row.year,
        row.received ?? 0,
        row.total,
        Number(releasedRate(row).toFixed(1)),
        ...docCounts,
        Math.max(row.total - docSum, 0),
      ];
    });

    rows.push([
      "Total",
      yearTotals.received,
      yearTotals.total,
      Number(
        releasedRate({
          received: yearTotals.received,
          total: yearTotals.total,
        }).toFixed(1),
      ),
      ...mergedDocTypes.map((dt) => yearTotals.docs[dt]),
      yearTotals.noDoc,
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws["!cols"] = header.map((h, i) => ({
      wch: i === 0 ? 8 : Math.max(10, String(h).length + 2),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Year Summary");
    XLSX.writeFile(
      wb,
      `year-by-year-summary_${yearBasis}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  // ── KPI hover drill-down (CPR / LOD) ──
  const openSummaryRecords = (label, doc, expiry = "all") => {
    const scope = [
      chartYear === "All" ? "All years" : chartYear,
      chartMonth !== "All" ? (MONTHS[chartMonth] ?? chartMonth) : null,
      rxFilter !== "All" ? rxFilter : null,
    ]
      .filter(Boolean)
      .join(" · ");
    setRecordsTarget({
      title: `${label} — ${scope}`,
      summary: {
        year: chartYear,
        month: chartMonth,
        prescription: rxFilter,
        doc,
        expiry,
        completed_only: true,
      },
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: font,
        background: "transparent",
        padding: 16,
        borderRadius: 20,
      }}
    >
      {/* ── KPI (side) + Trend + Donut ── */}
      <div style={{ position: "relative", zIndex: 30 }}>
        <FadeSlideIn delay={420}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "190px 2fr 1fr",
              gap: 14,
              alignItems: "start",
            }}
          >
            {/* KPI column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                position: "relative",
                zIndex: 5,
              }}
            >
              {loadingSec.kpi ? (
                [0, 1, 2].map((i) => (
                  <SkeletonBox
                    key={i}
                    width="100%"
                    height={84}
                    radius={12}
                    darkMode={darkMode}
                  />
                ))
              ) : (
                <>
                  <KpiTile
                    icon="📥"
                    label="Total"
                    value={summary.total}
                    color={FB}
                    sub="All applications"
                    darkMode={darkMode}
                    ui={ui}
                    delay={0}
                  />
                  <KpiTile
                    icon="⏳"
                    label="In Progress"
                    value={summary.in_progress}
                    color="#f59e0b"
                    sub="Pending completion"
                    darkMode={darkMode}
                    ui={ui}
                    delay={60}
                  />
                  <KpiTile
                    icon="🏁"
                    label="Completed"
                    value={summary.completed}
                    color="#0891b2"
                    sub="With other application categories"
                    darkMode={darkMode}
                    ui={ui}
                    delay={120}
                    breakdown={[
                      {
                        title: "CPR Released",
                        color: "#36a420",
                        total: summary.cpr_completed,
                        onClick: () =>
                          openSummaryRecords("CPR Released", "cpr"),
                        rows: [
                          {
                            label: "Valid CPR",
                            value: summary.cpr_not_expired,
                            color: "#36a420",
                            onClick: () =>
                              openSummaryRecords(
                                "CPR — Not expired",
                                "cpr",
                                "not_expired",
                              ),
                          },
                          {
                            label: "Expired CPR",
                            value: summary.cpr_expired,
                            color: "#e87c13",
                            onClick: () =>
                              openSummaryRecords(
                                "CPR — Expired",
                                "cpr",
                                "expired",
                              ),
                          },
                          {
                            label: "No expiry date",
                            value: summary.cpr_no_expiry,
                            color: ui.textMuted,
                            show: summary.cpr_no_expiry > 0,
                            onClick: () =>
                              openSummaryRecords(
                                "CPR — No expiry date",
                                "cpr",
                                "none",
                              ),
                          },
                        ],
                      },
                      {
                        title: "LOD Released",
                        color: "#e02020",
                        total: summary.lod_completed,
                        onClick: () =>
                          openSummaryRecords("LOD Released", "lod"),
                      },
                    ]}
                  />
                </>
              )}
            </div>

            {/* Trend */}
            {loadingSec.trend && trendData.length === 0 ? (
              <SectionCardSkeleton
                height={CHART_SKELETON_HEIGHT}
                darkMode={darkMode}
              />
            ) : (
              <SectionCard
                title="Trend Overview"
                subtitle={`Grouped by ${trendYear === "All" ? "year" : "month"}`}
                icon="📈"
                ui={ui}
                darkMode={darkMode}
                action={
                  <select
                    value={trendYear}
                    onChange={(e) => setTrendYear(e.target.value)}
                    title="Filter trend by year"
                    style={{
                      ...inputSt,
                      padding: "5px 10px",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    <option value="All">All years</option>
                    {trendYearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                }
              >
                <div
                  style={{
                    opacity: loadingSec.trend ? 0.5 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  <TrendChart data={trendData} ui={ui} darkMode={darkMode} />
                </div>
              </SectionCard>
            )}

            {/* Donut */}
            {loadingSec.kpi ? (
              <SectionCardSkeleton
                height={CHART_SKELETON_HEIGHT}
                darkMode={darkMode}
              />
            ) : (
              <SectionCard
                title="Approval Breakdown"
                subtitle="CPR vs LOD vs In Progress"
                icon="🍩"
                ui={ui}
                darkMode={darkMode}
              >
                <DonutChart data={pieData} ui={ui} darkMode={darkMode} />
              </SectionCard>
            )}
          </div>
        </FadeSlideIn>
      </div>

      {/* ── Year Summary ── */}
      <FadeSlideIn delay={500}>
        <SectionCard
          title="Year-by-Year Summary"
          subtitle={
            yearBasis === "released"
              ? "Released counted by the year it was released"
              : "Released counted by the year it was received"
          }
          icon="📅"
          ui={ui}
          darkMode={darkMode}
          action={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  background: neuCardBg(darkMode),
                  borderRadius: 10,
                  padding: 3,
                  gap: 2,
                  boxShadow: neuShadow(darkMode, false),
                }}
              >
                {[
                  { key: "released", label: "By Release Date" },
                  { key: "received", label: "By Received Date" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setYearBasis(key)}
                    style={neuBtnStyle(yearBasis === key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleExportYearSummary}
                disabled={yearSummaryData.length === 0}
                title="Download as Excel"
                style={{
                  ...neuBtnStyle(false),
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  opacity: yearSummaryData.length === 0 ? 0.4 : 1,
                  cursor:
                    yearSummaryData.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                <span>⬇</span>
                <span>Export Excel</span>
              </button>
            </div>
          }
        >
          {loadingYear && yearSummaryData.length === 0 ? (
            <LoadingRows rows={8} height={30} darkMode={darkMode} />
          ) : yearSummaryData.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.82rem",
                padding: "24px 0",
              }}
            >
              No year data available
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
                opacity: loadingYear ? 0.5 : 1,
                transition: "opacity 0.2s",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.8rem",
                }}
              >
                <thead>
                  <tr>
                    <th rowSpan={2} style={ysTh(true)}>
                      Year
                    </th>
                    <th rowSpan={2} style={ysTh()}>
                      Received Application
                    </th>
                    <th rowSpan={2} style={ysTh()}>
                      {yearBasis === "released"
                        ? "Total Released"
                        : "Released (of Received)"}
                    </th>
                    <th
                      rowSpan={2}
                      style={ysTh()}
                      title="Rate = Total Released ÷ Received Application × 100"
                    >
                      Rate
                      <div
                        style={{
                          fontSize: "0.58rem",
                          fontWeight: 500,
                          textTransform: "none",
                          letterSpacing: 0,
                          marginTop: 2,
                        }}
                      >
                        Released ÷ Received × 100
                      </div>
                    </th>
                    <th colSpan={mergedDocTypes.length + 1} style={ysTh()}>
                      Released
                    </th>
                  </tr>
                  <tr>
                    {mergedDocTypes.map((dt) => (
                      <th key={dt} style={ysTh()}>
                        {docTypeLabel(dt)}
                      </th>
                    ))}
                    <th style={ysTh()}>No Doc Type</th>
                  </tr>
                </thead>
                <tbody>
                  {yearSummaryData.map((row) => {
                    const counts = getDocCounts(row.year);
                    const docTypeSum = mergedDocTypes.reduce(
                      (s, dt) => s + counts[dt],
                      0,
                    );
                    const noDocType = Math.max(row.total - docTypeSum, 0);
                    return (
                      <tr
                        key={row.year}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = darkMode
                            ? "rgba(255,255,255,0.03)"
                            : "rgba(0,0,0,0.02)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td style={ysTd(ui.textPrimary, true)}>{row.year}</td>
                        {[
                          { kind: "received", value: row.received },
                          { kind: "released", value: row.total },
                        ].map(({ kind, value }) => (
                          <td key={kind} style={ysTd()}>
                            {Number(value) > 0 ? (
                              <span
                                onClick={() =>
                                  setRecordsTarget({
                                    year: Number(row.year),
                                    kind,
                                  })
                                }
                                title="Click to view records"
                                style={{
                                  cursor: "pointer",
                                  textDecoration: "underline dotted",
                                  textUnderlineOffset: 3,
                                }}
                              >
                                {value}
                              </span>
                            ) : (
                              value
                            )}
                          </td>
                        ))}
                        <td
                          style={ysTd()}
                          title={`${row.total} ÷ ${row.received} × 100`}
                        >
                          {releasedRate(row).toFixed(1)}%
                        </td>
                        {mergedDocTypes.map((dt) => (
                          <td key={dt} style={ysTd()}>
                            {counts[dt] > 0 ? (
                              <span
                                onClick={() => openYearDocRecords(row.year, dt)}
                                title="Click to view records"
                                style={linkSt}
                              >
                                {counts[dt]}
                              </span>
                            ) : (
                              counts[dt]
                            )}
                          </td>
                        ))}
                        <td style={ysTd(ui.textMuted)}>
                          {noDocType > 0 ? (
                            <span
                              onClick={() =>
                                openYearDocRecords(row.year, NONE_KEY)
                              }
                              title="Click to view records"
                              style={linkSt}
                            >
                              {noDocType}
                            </span>
                          ) : (
                            noDocType
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Total row */}
                  <tr>
                    <td style={{ ...ysTd(ui.textPrimary, true), ...totalCell }}>
                      Total
                    </td>
                    <td style={{ ...ysTd(), ...totalCell }}>
                      {yearTotals.received.toLocaleString()}
                    </td>
                    <td style={{ ...ysTd(), ...totalCell }}>
                      {yearTotals.total.toLocaleString()}
                    </td>
                    <td style={{ ...ysTd(), ...totalCell }}>
                      {releasedRate({
                        received: yearTotals.received,
                        total: yearTotals.total,
                      }).toFixed(1)}
                      %
                    </td>
                    {mergedDocTypes.map((dt) => (
                      <td key={dt} style={{ ...ysTd(), ...totalCell }}>
                        {yearTotals.docs[dt].toLocaleString()}
                      </td>
                    ))}
                    <td style={{ ...ysTd(ui.textMuted), ...totalCell }}>
                      {yearTotals.noDoc.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </FadeSlideIn>

      {/* ── By Classification + Top Drug Applications (50/50) ── */}
      <FadeSlideIn delay={560}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          {/* ── By Classification ── */}
          <SectionCard
            title="By Classification"
            subtitle="Applications per prescription type"
            icon="💊"
            ui={ui}
            darkMode={darkMode}
          >
            {loadingSec.classification && classificationData.length === 0 ? (
              <LoadingRows rows={6} height={28} darkMode={darkMode} />
            ) : classificationData.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: ui.textMuted,
                  fontSize: "0.82rem",
                  padding: "24px 0",
                }}
              >
                No classification data
              </div>
            ) : (
              <>
                {/* Table */}
                <div style={{ overflowX: "auto", marginBottom: 20 }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.8rem",
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={thStyle(true)}>Type</th>
                        <th style={thStyle()}>Total</th>
                        {classDocTypes.map((dt) => (
                          <th
                            key={dt}
                            style={{ ...thStyle(), color: docTypeColor(dt) }}
                          >
                            {dt}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {classificationData.map((row, i) => {
                        const short =
                          row.type === "Prescription Drug (RX)"
                            ? "RX"
                            : row.type === "Over-the-Counter (OTC)"
                              ? "OTC"
                              : row.type === "Household Remedy (HR)"
                                ? "HR"
                                : row.type;
                        const typeColor = classTypeColor(short);
                        return (
                          <tr
                            key={row.type}
                            style={{
                              borderBottom:
                                i < classificationData.length - 1
                                  ? `1px solid ${darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`
                                  : "none",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = darkMode
                                ? "rgba(255,255,255,0.03)"
                                : "rgba(0,0,0,0.02)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <td style={{ ...tdStyle(typeColor, true) }}>
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: 99,
                                  background: `${typeColor}18`,
                                  color: typeColor,
                                  marginRight: 6,
                                }}
                              >
                                {short}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  color: ui.textMuted,
                                  fontWeight: 400,
                                }}
                              >
                                {row.type}
                              </span>
                            </td>
                            <td style={tdStyle(ui.textPrimary)}>{row.count}</td>
                            {classDocTypes.map((dt) => (
                              <td key={dt} style={tdStyle(docTypeColor(dt))}>
                                {row.by_doc_type?.[dt] ?? 0}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Divider */}
                <div
                  style={{
                    height: 1,
                    background: darkMode
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.06)",
                    marginBottom: 14,
                  }}
                />

                {/* Pie toggle */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: ui.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    🥧 Distribution
                  </span>
                  <div
                    style={{
                      display: "flex",
                      background: neuCardBg(darkMode),
                      borderRadius: 10,
                      padding: 3,
                      gap: 2,
                      boxShadow: neuShadow(darkMode, false),
                    }}
                  >
                    {[
                      { key: "classification", label: "By Type" },
                      { key: "doctype", label: "By Doc" },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setPieView(key)}
                        style={{
                          padding: "4px 10px",
                          fontSize: "0.68rem",
                          fontWeight: pieView === key ? 700 : 500,
                          borderRadius: 8,
                          border: "none",
                          background: neuCardBg(darkMode),
                          color: pieView === key ? FB : ui.textMuted,
                          cursor: "pointer",
                          fontFamily: font,
                          boxShadow:
                            pieView === key
                              ? neuShadow(darkMode, false)
                              : "none",
                          transition: "all 0.18s",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pie chart */}
                <PieChart
                  slices={activePieSlices}
                  darkMode={darkMode}
                  ui={ui}
                />
              </>
            )}
          </SectionCard>

          {/* ── Top Drug Applications ── */}
          <SectionCard
            title="Top Drug Applications"
            subtitle="Ranked by application volume"
            icon="💊"
            ui={ui}
            darkMode={darkMode}
            action={
              <span style={{ fontSize: "0.7rem", color: ui.textMuted }}>
                {loadingSec.drugs && topDrugsData.length === 0
                  ? ""
                  : `Top ${topDrugsData.length}`}
              </span>
            }
          >
            {loadingSec.drugs && topDrugsData.length === 0 ? (
              <LoadingRows rows={8} height={40} darkMode={darkMode} />
            ) : topDrugsData.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: ui.textMuted,
                  fontSize: "0.82rem",
                  padding: "24px 0",
                }}
              >
                No drug data available
              </div>
            ) : (
              <>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 64px 64px 64px",
                      gap: 8,
                      padding: "0 4px",
                    }}
                  >
                    {[
                      "Drug / Generic",
                      "Classification",
                      "Total",
                      "CPR",
                      "Rate",
                    ].map((h) => (
                      <span
                        key={h}
                        style={{
                          fontSize: "0.63rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: ui.textMuted,
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                  {pagedDrugs.map((drug, i) => {
                    const rxShort =
                      drug.rx === "Prescription Drug (RX)"
                        ? "RX"
                        : drug.rx === "Over-the-Counter (OTC)"
                          ? "OTC"
                          : "VAX";
                    const rxColor =
                      drug.rx === "Prescription Drug (RX)"
                        ? FB
                        : drug.rx === "Over-the-Counter (OTC)"
                          ? "#f59e0b"
                          : "#36a420";
                    const isLast = i === pagedDrugs.length - 1;
                    return (
                      <div
                        key={drug.name}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1fr 64px 64px 64px",
                          gap: 8,
                          padding: "10px 4px",
                          borderRadius: 10,
                          alignItems: "center",
                          borderBottom: !isLast
                            ? `1px solid ${darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`
                            : "none",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = darkMode
                            ? "rgba(255,255,255,0.03)"
                            : "rgba(0,0,0,0.02)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 3,
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.62rem",
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: 4,
                                background: `${rxColor}18`,
                                color: rxColor,
                                flexShrink: 0,
                              }}
                            >
                              {rxShort}
                            </span>
                            <span
                              style={{
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                color: ui.textPrimary,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {drug.name}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <MiniBar
                              value={drug.total}
                              max={maxDrug}
                              color={FB}
                              darkMode={darkMode}
                            />
                            <span
                              style={{
                                fontSize: "0.65rem",
                                color: ui.textMuted,
                                flexShrink: 0,
                              }}
                            >
                              {drug.generic}
                            </span>
                          </div>
                        </div>
                        <span
                          style={{ fontSize: "0.72rem", color: ui.textMuted }}
                        >
                          {drug.rx || "—"}
                        </span>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            color: FB,
                            textAlign: "center",
                          }}
                        >
                          {drug.total}
                        </span>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            color: "#36a420",
                            textAlign: "center",
                          }}
                        >
                          {drug.cpr}
                        </span>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            textAlign: "center",
                            color:
                              parseFloat(drug.rate) >= 60
                                ? "#36a420"
                                : "#f59e0b",
                          }}
                        >
                          {drug.rate}%
                        </span>
                      </div>
                    );
                  })}
                </div>
                <Pagination
                  page={drugsPage}
                  totalPages={drugsTotalPages}
                  onPageChange={setDrugsPage}
                  total={topDrugsData.length}
                  pageSize={DRUGS_PAGE_SIZE}
                />
              </>
            )}
          </SectionCard>
        </div>
      </FadeSlideIn>

      {/* ── Top Countries ── */}
      <FadeSlideIn delay={680}>
        <SectionCard
          title="Top Countries by Entity Type"
          subtitle="Country of origin per application role"
          icon="🌍"
          ui={ui}
          darkMode={darkMode}
        >
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            {ENTITY_TYPES.map((et) => {
              const isAct = topCountryTab === et.key;
              return (
                <button
                  key={et.key}
                  onClick={() => setTopCountryTab(et.key)}
                  style={{
                    padding: "5px 12px",
                    fontSize: "0.76rem",
                    fontWeight: isAct ? 700 : 500,
                    borderRadius: 10,
                    border: "none",
                    background: neuCardBg(darkMode),
                    color: isAct ? et.color : ui.textMuted,
                    cursor: "pointer",
                    fontFamily: font,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    boxShadow: isAct
                      ? neuShadow(darkMode, false)
                      : neuShadow(darkMode, true),
                    transition: "all 0.2s",
                  }}
                >
                  <span>{et.icon}</span>
                  <span>{et.label}</span>
                </button>
              );
            })}
          </div>

          {loadingCountries ||
          (loadingSec.countries && topCountriesData.length === 0) ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 80,
                color: ui.textMuted,
                fontSize: "0.82rem",
                gap: 8,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  border: "2px solid currentColor",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              Loading...
            </div>
          ) : topCountriesData.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.82rem",
                padding: "24px 0",
              }}
            >
              No country data available
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <CountryList
                countries={topCountriesData}
                activeEntity={ENTITY_TYPES.find(
                  (et) => et.key === topCountryTab,
                )}
                topCountryTab={topCountryTab}
                rxFilter={rxFilter}
                maxCountry={maxCountry}
                ui={ui}
                darkMode={darkMode}
                pageSize={10}
              />
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div
                  style={{
                    background: neuCardBg(darkMode),
                    borderRadius: 12,
                    padding: 14,
                    boxShadow: neuShadow(darkMode, false),
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 12px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: ui.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    🏆 Top 3 Podium
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-end",
                      justifyContent: "center",
                    }}
                  >
                    {[1, 0, 2].map((rank) => {
                      const d = topCountriesData[rank];
                      if (!d) return null;
                      const flag = COUNTRY_FLAGS[d.country] || "🌐";
                      const medals = ["🥇", "🥈", "🥉"];
                      const heights = [80, 60, 48];
                      const activeEntity = ENTITY_TYPES.find(
                        (et) => et.key === topCountryTab,
                      );
                      const c =
                        rank === 0
                          ? activeEntity?.color
                          : rank === 1
                            ? "#9ca3af"
                            : "#b45309";
                      return (
                        <div
                          key={rank}
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              color: c,
                            }}
                          >
                            {medals[rank]} #{rank + 1}
                          </span>
                          <div
                            style={{
                              width: "100%",
                              background: neuCardBg(darkMode),
                              borderRadius: "10px 10px 0 0",
                              height: heights[rank],
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 2,
                              boxShadow: neuShadow(darkMode),
                            }}
                          >
                            <span
                              style={{
                                fontSize: rank === 0 ? "1.3rem" : "1rem",
                              }}
                            >
                              {flag}
                            </span>
                            <span
                              style={{
                                fontSize: rank === 0 ? "0.65rem" : "0.58rem",
                                fontWeight: 700,
                                color: c,
                                textAlign: "center",
                                maxWidth: 70,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {d.country}
                            </span>
                          </div>
                          <div
                            style={{
                              width: "100%",
                              background: neuCardBg(darkMode),
                              borderRadius: "0 0 8px 8px",
                              padding: "4px 0",
                              textAlign: "center",
                              boxShadow: neuShadow(darkMode, false),
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: rank === 0 ? "0.95rem" : "0.82rem",
                                fontWeight: 800,
                                color: c,
                              }}
                            >
                              {d.count}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  {[
                    {
                      label: "Countries",
                      value: topCountriesData.length,
                      icon: "🌍",
                      color:
                        ENTITY_TYPES.find((et) => et.key === topCountryTab)
                          ?.color || FB,
                    },
                    {
                      label: "Total Apps",
                      value: topCountriesData.reduce((s, d) => s + d.count, 0),
                      icon: "📋",
                      color: FB,
                    },
                    {
                      label: "#1 Country",
                      value: topCountriesData[0]?.country || "—",
                      icon: "🥇",
                      color: "#f59e0b",
                      small: true,
                    },
                    {
                      label: "#1 CPR",
                      value: topCountriesData[0]?.cpr ?? 0,
                      icon: "✅",
                      color: "#36a420",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: neuCardBg(darkMode),
                        boxShadow: neuShadow(darkMode),
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          marginBottom: 3,
                        }}
                      >
                        <span style={{ fontSize: "0.8rem" }}>{s.icon}</span>
                        <span
                          style={{
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: ui.textMuted,
                          }}
                        >
                          {s.label}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: s.small ? "0.75rem" : "1.05rem",
                          fontWeight: 800,
                          color: s.color,
                          lineHeight: 1.2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      </FadeSlideIn>

      {recordsTarget && (
        <YearRecordsModal
          target={recordsTarget}
          basis={yearBasis}
          ui={ui}
          darkMode={darkMode}
          onClose={() => setRecordsTarget(null)}
        />
      )}
    </div>
  );
}
