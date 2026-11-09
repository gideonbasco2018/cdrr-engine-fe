// src/components/monitoring/analytics/AnalyticsView.jsx
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { updateUploadReport, getUploadReports } from "../../../api/reports.js";
import { mapDataItem } from "../../reports/utils.js";

import {
  getAnalyticsAvailableYears,
  getAnalyticsSummary,
  getAnalyticsTrend,
  getAnalyticsByClassification,
  getAnalyticsYearSummary,
  getAnalyticsYearRecords,
  getAnalyticsDataQuality,
  getAnalyticsQualityRecords,
  getAnalyticsCompanyRecords,
  getAnalyticsFastestRecords,
  getAnalyticsSummaryRecords,
  getAnalyticsTopDrugs,
  getAnalyticsTopCountries,
  getDocTypeReleased,
  getAnalyticsClassificationRecords,
  getAnalyticsClassificationTrend,
  getAnalyticsReceivedReleasedTrend,
  getAnalyticsTrendRecords,
  getAnalyticsTrendTimeline,
  getAnalyticsCountryRecords,
} from "../../../api/analytics.js";

import DoctrackModal from "../../reports/actions/DoctrackModal.jsx";
import ViewDetailsModal from "../../reports/actions/ViewDetailsModal.jsx";
import ApplicationLogsModal from "../../tasks/ApplicationLogsModal.jsx";
import EditRecordModal from "../../reports/actions/EditRecordModal.jsx";
import * as XLSX from "xlsx";
// ── Split modules ─────────────────────────────────────────────
import "./analyticsAnimations.jsx";
import {
  FB,
  MONTHS,
  ENTITY_TYPES,
  COUNTRY_FLAGS,
} from "./analyticsConstants.jsx";
import { neuCardBg, neuShadow, neuInputShadow } from "./analyticsHelpers.jsx";
import { SkeletonBox, SectionCardSkeleton } from "./SkeletonComponents.jsx";
import { FadeSlideIn } from "./KpiCard.jsx";
import { SectionCard } from "./SectionCard.jsx";
import InProgressByUserModal from "./InProgressByUserModal.jsx";
import ExportPdfModal from "./ExportPdfModal.jsx";
import DrugDetailModal from "./DrugDetailModal.jsx";

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const CHART_SKELETON_HEIGHT = 260;
const DRUGS_PAGE_SIZE = 10;

const DRUG_GRID = "28px minmax(0, 1.5fr) minmax(130px, 1fr) 56px 66px";
const COUNTRIES_PAGE_SIZE = 12;

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
  "N/A": "#9ca3af",
};

const docTypeColor = (dt) => DOC_TYPE_COLOR[dt] ?? FB;
const classTypeColor = (short) => TYPE_COLORS[short] ?? FB;

// Works with both "Prescription (Rx) Drug" and "Prescription Drug (RX)"
const classShort = (type) => {
  const t = String(type ?? "").toLowerCase();
  if (t.includes("rx") || t.includes("prescription")) return "RX";
  if (t.includes("otc") || t.includes("over-the-counter")) return "OTC";
  if (t.includes("(hr)") || t.includes("household")) return "HR";
  if (t.includes("vaccine")) return "Vaccine";
  return type;
};

// Cert / CERT / Certificate -> "CERT"
const normalizeDocType = (dt) => {
  const raw = String(dt).trim();
  const k = raw.toLowerCase();
  return k === "cert" || k === "certificate" ? "CERT" : raw;
};
// Same normalisation the backend uses for doc-type filters
const docKey = (dt) => {
  const u = String(dt)
    .trim()
    .replace(/\s*\(/g, " (")
    .replace(/\s+/g, " ")
    .toUpperCase();
  return u === "CERT" || u === "CERTIFICATE" ? "CERT" : u;
};

// Header label for a doc type (LOD may be shown as "LETTER" in some views)
const docTypeLabel = (dt) => dt;

// Rate = Total Released / Received Application (all released records)
const releasedRate = (row) => {
  const received = Number(row.received) || 0;
  const released = Number(row.total) || 0;
  return received > 0 ? (released / received) * 100 : 0;
};
const DOC_ORDER = ["CERT", "CPR", "GLE", "LOD"];

// ── Year Summary drill-down modal ─────────────────────────────
const RECORDS_PAGE_SIZE = 50;

const NONE_KEY = "__NONE__";

const NO_DATE = "No Date";
const yearKey = (y) => (y === NO_DATE ? "nodate" : Number(y));

const pct = (n, d) => (d > 0 ? (n / d) * 100 : 0);
const completenessColor = (p) =>
  p >= 95 ? "#36a420" : p >= 80 ? "#f59e0b" : "#e02020";

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

  // Rendered in <body> so it is independent of the records modal.
  // No click-outside-to-close on purpose: an accidental click or the
  // browser's autofill popup must not dismiss it. Use Cancel or Esc.
  return createPortal(
    <div
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
          name="edit-confirm-code"
          autoComplete="new-password"
          data-lpignore="true"
          data-1p-ignore="true"
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
    </div>,
    document.body,
  );
}

// ── Side panel of the records modal: doc-type breakdown + timeline ──
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function ClassTrendPanel({
  data,
  noDate,
  loading,
  modes = ["year", "month"],
  mode,
  onModeChange,
  basis,
  onBasisChange,
  year,
  onYearChange,
  years,
  month,
  onMonthChange,
  activeKey,
  onBarClick,
  docBreakdown = [],
  docFilter = "All",
  onDocClick,
  classBreakdown = [],
  classFilter = "All",
  onClassClick,
  ui,
  darkMode,
  color,
  tabLabel,
}) {
  const line = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";
  const total = data.reduce((s, d) => s + d.count, 0);
  const max = Math.max(...data.map((d) => d.count), 1);
  const peak = data.reduce((p, d) => (d.count > (p?.count ?? 0) ? d : p), null);
  const docTotal = docBreakdown.reduce((s, d) => s + d.count, 0);
  const classSlices = classBreakdown.map((c) => ({
    key: c.key,
    name: c.key === NONE_KEY ? "No Classification" : c.key,
    short: c.key === NONE_KEY ? "None" : classShort(c.key),
    value: c.count,
    color: c.key === NONE_KEY ? "#9ca3af" : classTypeColor(classShort(c.key)),
  }));
  const BAR_AREA = 190;
  const MODE_LABEL = { year: "Per Year", month: "Per Month", day: "Per Day" };
  const heading =
    mode === "year"
      ? "Per Year"
      : mode === "month"
        ? `Per Month · ${year}`
        : `Per Day · ${MONTH_SHORT[(month ?? 1) - 1]} ${year}`;
  const compact = (n) =>
    n >= 10000
      ? `${Math.round(n / 1000)}k`
      : n >= 1000
        ? `${(n / 1000).toFixed(1)}k`
        : String(n);

  const seg = (active) => ({
    padding: "4px 10px",
    fontSize: "0.68rem",
    fontWeight: active ? 700 : 500,
    borderRadius: 8,
    border: "none",
    background: neuCardBg(darkMode),
    color: active ? FB : ui.textMuted,
    cursor: "pointer",
    fontFamily: font,
    boxShadow: active ? neuShadow(darkMode, false) : "none",
    transition: "all 0.18s",
  });
  const group = {
    display: "flex",
    background: neuCardBg(darkMode),
    borderRadius: 10,
    padding: 3,
    gap: 2,
    boxShadow: neuShadow(darkMode, false),
  };
  const selSt = {
    background: neuCardBg(darkMode),
    border: `1px solid ${line}`,
    borderRadius: 8,
    padding: "4px 8px",
    fontSize: "0.72rem",
    color: ui.textPrimary,
    outline: "none",
    fontFamily: font,
    colorScheme: darkMode ? "dark" : "light",
  };
  const sectionTitle = {
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
  };

  return (
    <div
      style={{
        width: 400,
        flexShrink: 0,
        borderLeft: `1px solid ${line}`,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 16,
        overflowY: "auto",
        fontFamily: font,
      }}
    >
      {/* ── By document type ── */}
      {docBreakdown.length > 0 && (
        <div>
          <div style={sectionTitle}>🗂 {tabLabel} · By Document Type</div>
          <div
            style={{
              fontSize: "0.68rem",
              color: ui.textMuted,
              margin: "2px 0 8px",
            }}
          >
            Click a row to filter the table
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              maxHeight: 230,
              overflowY: "auto",
            }}
          >
            {docBreakdown.map((d) => {
              const c = d.key === NONE_KEY ? "#9ca3af" : docTypeColor(d.key);
              const pctv = docTotal > 0 ? (d.count / docTotal) * 100 : 0;
              const active = docFilter === d.key;
              return (
                <div
                  key={d.key}
                  onClick={() => onDocClick?.(d.key)}
                  title="Click to filter the table"
                  style={{
                    padding: "6px 8px",
                    borderRadius: 8,
                    cursor: "pointer",
                    border: `1px solid ${active ? c : "transparent"}`,
                    background: active
                      ? `${c}18`
                      : darkMode
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(0,0,0,0.025)",
                    opacity: docFilter !== "All" && !active ? 0.5 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 3,
                        background: c,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: "0.74rem",
                        fontWeight: active ? 800 : 600,
                        color: ui.textPrimary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {facetLabel(d.key, "No Doc Type")}
                    </span>
                    <span
                      style={{ fontSize: "0.74rem", fontWeight: 800, color: c }}
                    >
                      {d.count.toLocaleString()}
                    </span>
                    <span
                      style={{
                        fontSize: "0.66rem",
                        color: ui.textMuted,
                        minWidth: 38,
                        textAlign: "right",
                      }}
                    >
                      {pctv.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 3,
                      borderRadius: 99,
                      marginTop: 5,
                      background: darkMode
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.07)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(pctv, 0.8)}%`,
                        height: "100%",
                        background: c,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {docBreakdown.length > 0 && (
        <div style={{ borderTop: `1px solid ${line}` }} />
      )}

      {/* ── Timeline ── */}
      <div>
        <div style={sectionTitle}>
          📊 {tabLabel} · {heading}
        </div>
        <div style={{ fontSize: "0.68rem", color: ui.textMuted, marginTop: 2 }}>
          Click a bar to filter the table
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={group}>
          {modes.map((m) => (
            <button
              key={m}
              style={seg(mode === m)}
              onClick={() => onModeChange(m)}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <div style={group}>
          <button
            style={seg(basis === "received")}
            onClick={() => onBasisChange("received")}
          >
            By Received
          </button>
          <button
            style={seg(basis === "released")}
            onClick={() => onBasisChange("released")}
          >
            By Released
          </button>
        </div>
        {mode !== "year" && (
          <select
            value={year ?? ""}
            onChange={(e) => onYearChange(Number(e.target.value))}
            style={selSt}
          >
            {[...new Set([...years, year].filter(Boolean))]
              .sort((a, b) => b - a)
              .map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
          </select>
        )}
        {mode === "day" && (
          <select
            value={month ?? 1}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            style={selSt}
          >
            {MONTH_SHORT.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { label: "In chart", value: total.toLocaleString() },
          {
            label: "Peak",
            value: peak
              ? `${peak.label} · ${peak.count.toLocaleString()}`
              : "—",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 10,
              background: neuCardBg(darkMode),
              boxShadow: neuShadow(darkMode),
            }}
          >
            <div
              style={{
                fontSize: "0.58rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: ui.textMuted,
              }}
            >
              {s.label}
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 800, color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Bars */}
      <div
        style={{
          position: "relative",
          minHeight: BAR_AREA + 40,
          opacity: loading ? 0.45 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {data.length === 0 || total === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: ui.textMuted,
              fontSize: "0.8rem",
              padding: "60px 0",
            }}
          >
            {loading ? "Loading…" : "No dated records to chart"}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: mode === "year" ? 8 : mode === "month" ? 4 : 2,
              height: BAR_AREA + 40,
              borderBottom: `1px solid ${line}`,
            }}
          >
            {data.map((d) => {
              const h =
                d.count > 0 ? Math.max((d.count / max) * BAR_AREA, 4) : 0;
              const isActive = activeKey === d.key;
              const dim = activeKey != null && !isActive;
              const showLabel =
                mode !== "day" || d.key === 1 || d.key % 5 === 0;
              return (
                <div
                  key={d.key}
                  onClick={() => d.count > 0 && onBarClick(d)}
                  title={`${d.label}: ${d.count.toLocaleString()}`}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    height: "100%",
                    cursor: d.count > 0 ? "pointer" : "default",
                    opacity: dim ? 0.35 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      color: isActive ? color : ui.textMuted,
                      marginBottom: 3,
                    }}
                  >
                    {mode !== "day" && d.count > 0 ? compact(d.count) : ""}
                  </span>
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 44,
                      height: h,
                      borderRadius: "6px 6px 0 0",
                      background: `linear-gradient(180deg, ${color}, ${color}aa)`,
                      outline: isActive ? `2px solid ${color}` : "none",
                      outlineOffset: 1,
                      transition: "height 0.3s ease",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? color : ui.textMuted,
                      padding: "5px 0 4px",
                      minHeight: 22,
                    }}
                  >
                    {showLabel ? d.label : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {noDate > 0 && (
        <div style={{ fontSize: "0.7rem", color: ui.textMuted }}>
          ⚠ {noDate.toLocaleString()} record(s) have no valid{" "}
          {basis === "received" ? "Date Received" : "Date Released"} and are not
          in the chart.
        </div>
      )}

      {/* ── By classification (donut) ── */}
      {classSlices.length > 0 && (
        <>
          <div style={{ borderTop: `1px solid ${line}` }} />
          <div>
            <div style={sectionTitle}>🥧 {tabLabel} · By Classification</div>
            <div
              style={{
                fontSize: "0.68rem",
                color: ui.textMuted,
                marginTop: 2,
              }}
            >
              Click a slice or a row to filter the table
            </div>
          </div>
          {classFilter !== "All" && (
            <div>
              <button
                onClick={() => onClassClick?.(classFilter)}
                title="Clear classification filter"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 10px",
                  borderRadius: 99,
                  border: `1px solid ${color}`,
                  background: `${color}18`,
                  color,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: font,
                }}
              >
                {classFilter === NONE_KEY ? "No Classification" : classFilter} ✕
              </button>
            </div>
          )}
          <PieChart
            slices={classSlices}
            darkMode={darkMode}
            ui={ui}
            onSliceClick={(s) => onClassClick?.(s.key)}
            size={190}
            centerLabel={String(tabLabel).toUpperCase()}
            legendMin={330}
            hint="Click a slice or a row to filter the table"
          />
        </>
      )}
    </div>
  );
}

// ── Multi-select year dropdown (checkboxes, rendered in <body>) ──
function YearMultiSelect({ options, value, onChange, ui, darkMode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const line = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";

  useEffect(() => {
    if (!open) return;
    const outside = (e) => {
      if (
        btnRef.current?.contains(e.target) ||
        popRef.current?.contains(e.target)
      )
        return;
      setOpen(false);
    };
    const onScroll = (e) => {
      if (popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", outside);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", outside);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const toggleOpen = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen((o) => !o);
  };

  const sorted = [...value].sort((a, b) => Number(b) - Number(a));
  const label =
    sorted.length === 0
      ? "All years"
      : sorted.length <= 3
        ? sorted.join(", ")
        : `${sorted.length} years`;
  const toggle = (y) =>
    onChange(value.includes(y) ? value.filter((v) => v !== y) : [...value, y]);

  const row = (key, checked, text, onClick) => (
    <label
      key={key}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: "0.78rem",
        fontWeight: checked ? 700 : 500,
        color: ui.textPrimary,
        background: checked
          ? darkMode
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.045)"
          : "transparent",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onClick}
        style={{ accentColor: FB, cursor: "pointer" }}
      />
      {text}
    </label>
  );

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggleOpen}
        title="Select one or more years"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: neuCardBg(darkMode),
          border: "none",
          borderRadius: 10,
          padding: "6px 12px",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: ui.textPrimary,
          cursor: "pointer",
          boxShadow: neuInputShadow(darkMode),
          fontFamily: font,
        }}
      >
        {label}
        <span style={{ fontSize: "0.6rem", opacity: 0.7 }}>▾</span>
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            style={{
              position: "fixed",
              top: pos.top,
              right: pos.right,
              zIndex: 1500,
              minWidth: 170,
              maxHeight: 300,
              overflowY: "auto",
              background: neuCardBg(darkMode),
              border: `1px solid ${line}`,
              borderRadius: 12,
              boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
              padding: 6,
              fontFamily: font,
            }}
          >
            {row("all", value.length === 0, "All years", () => onChange([]))}
            <div style={{ height: 1, background: line, margin: "4px 6px" }} />
            {options.map((y) => row(y, value.includes(y), y, () => toggle(y)))}
          </div>,
          document.body,
        )}
    </>
  );
}

// ── Received vs Released line chart (pure SVG, clickable points) ──
function RRTrendChart({ data, ui, darkMode, onPointClick }) {
  const [hover, setHover] = useState(null);
  const W = 860,
    H = 260,
    L = 54,
    R = 18,
    T = 16,
    B = 30;
  const iw = W - L - R,
    ih = H - T - B;
  const SERIES = [
    { key: "received", label: "Received", color: FB },
    { key: "released", label: "Released", color: "#36a420" },
    { key: "in_progress", label: "In Progress", color: "#f59e0b" },
  ];
  const line = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const n = data.length;

  const totals = {
    received: data.reduce((s, d) => s + (d.received ?? 0), 0),
    released: data.reduce((s, d) => s + (d.released ?? 0), 0),
    in_progress: data.reduce((s, d) => s + (d.in_progress ?? 0), 0),
  };

  if (
    n === 0 ||
    (totals.received === 0 && totals.released === 0 && totals.in_progress === 0)
  )
    return (
      <div
        style={{
          textAlign: "center",
          color: ui.textMuted,
          fontSize: "0.82rem",
          padding: "60px 0",
        }}
      >
        No data
      </div>
    );

  const niceMax = (v) => {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const m = v / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  };
  const rawMax = Math.max(
    ...data.flatMap((d) => [d.received, d.released, d.in_progress ?? 0]),
  );
  const yMax = niceMax(rawMax);
  const x = (i) => (n === 1 ? L + iw / 2 : L + (i * iw) / (n - 1));
  const y = (v) => T + ih - (v / yMax) * ih;
  const clampY = (v) => Math.min(Math.max(v, T), T + ih);
  const slotW = n > 1 ? iw / (n - 1) : iw;

  const smooth = (pts) => {
    if (pts.length === 0) return "";
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i],
        p1 = pts[i],
        p2 = pts[i + 1],
        p3 = pts[i + 2] || p2;
      const t = 0.18;
      d += ` C${p1[0] + (p2[0] - p0[0]) * t},${clampY(p1[1] + (p2[1] - p0[1]) * t)} ${p2[0] - (p3[0] - p1[0]) * t},${clampY(p2[1] - (p3[1] - p1[1]) * t)} ${p2[0]},${p2[1]}`;
    }
    return d;
  };

  const hd = hover !== null ? data[hover] : null;
  const boxW = 150,
    boxH = 78;
  const boxX =
    hover !== null
      ? x(hover) + 14 + boxW > W - R
        ? x(hover) - 14 - boxW
        : x(hover) + 14
      : 0;

  return (
    <div>
      {/* Legend (click = all records of that series) */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}
      >
        {SERIES.map((s) => (
          <button
            key={s.key}
            onClick={() => onPointClick(s.key, null)}
            title="Click to view all records"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              borderRadius: 99,
              border: `1px solid ${s.color}55`,
              background: `${s.color}14`,
              color: s.color,
              fontSize: "0.72rem",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: s.color,
              }}
            />
            {s.label}
            <span style={{ fontWeight: 800 }}>
              {totals[s.key].toLocaleString()}
            </span>
          </button>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <defs>
          {SERIES.map((s) => (
            <linearGradient
              key={s.key}
              id={`rr-grad-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid + Y labels */}
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (yMax * i) / 4;
          return (
            <g key={i}>
              <line
                x1={L}
                x2={W - R}
                y1={y(v)}
                y2={y(v)}
                stroke={line}
                strokeDasharray={i === 0 ? "0" : "4 4"}
              />
              <text
                x={L - 8}
                y={y(v) + 4}
                textAnchor="end"
                fontSize={11}
                fill={ui.textMuted}
                fontFamily={font}
              >
                {Math.round(v).toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* X labels */}
        {data.map((d, i) => (
          <text
            key={d.key}
            x={x(i)}
            y={H - 10}
            textAnchor="middle"
            fontSize={11}
            fontWeight={hover === i ? 800 : 600}
            fill={hover === i ? ui.textPrimary : ui.textMuted}
            fontFamily={font}
          >
            {d.label}
          </text>
        ))}

        {/* Hover slots + guide */}
        {data.map((d, i) => (
          <rect
            key={`slot-${d.key}`}
            x={x(i) - slotW / 2}
            y={T}
            width={slotW}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={T}
            y2={T + ih}
            stroke={ui.textMuted}
            strokeDasharray="3 3"
            opacity={0.5}
            pointerEvents="none"
          />
        )}

        {/* Areas + lines */}
        {SERIES.map((s) => {
          const pts = data.map((d, i) => [x(i), y(d[s.key] ?? 0)]);
          const dPath = smooth(pts);
          return (
            <g key={s.key} pointerEvents="none">
              {n > 1 && (
                <path
                  d={`${dPath} L${x(n - 1)},${T + ih} L${x(0)},${T + ih} Z`}
                  fill={`url(#rr-grad-${s.key})`}
                />
              )}
              <path
                d={dPath}
                fill="none"
                stroke={s.color}
                strokeWidth={2.6}
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {/* Clickable points */}
        {SERIES.map((s) =>
          data.map((d, i) => (
            <g
              key={`${s.key}-${d.key}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => (d[s.key] ?? 0) > 0 && onPointClick(s.key, d)}
              style={{ cursor: (d[s.key] ?? 0) > 0 ? "pointer" : "default" }}
            >
              <circle
                cx={x(i)}
                cy={y(d[s.key] ?? 0)}
                r={12}
                fill="transparent"
              />
              <circle
                cx={x(i)}
                cy={y(d[s.key] ?? 0)}
                r={hover === i ? 5.5 : 3.2}
                fill={darkMode ? "#1d1d1d" : "#fff"}
                stroke={s.color}
                strokeWidth={2.2}
                style={{ transition: "r 0.12s" }}
              />
            </g>
          )),
        )}

        {/* Tooltip */}
        {hd && (
          <g pointerEvents="none">
            <rect
              x={boxX}
              y={T + 4}
              width={boxW}
              height={boxH}
              rx={10}
              fill={neuCardBg(darkMode)}
              stroke={darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}
            />
            <text
              x={boxX + 12}
              y={T + 22}
              fontSize={12}
              fontWeight={800}
              fill={ui.textPrimary}
              fontFamily={font}
            >
              {hd.label}
            </text>
            {SERIES.map((s, k) => (
              <g key={s.key}>
                <circle
                  cx={boxX + 16}
                  cy={T + 37 + k * 15}
                  r={4}
                  fill={s.color}
                />
                <text
                  x={boxX + 26}
                  y={T + 41 + k * 15}
                  fontSize={11}
                  fill={ui.textMuted}
                  fontFamily={font}
                >
                  {s.label}
                </text>
                <text
                  x={boxX + boxW - 12}
                  y={T + 41 + k * 15}
                  textAnchor="end"
                  fontSize={11}
                  fontWeight={800}
                  fill={s.color}
                  fontFamily={font}
                >
                  {(hd[s.key] ?? 0).toLocaleString()}
                </text>
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

export function YearRecordsModal({ target, basis, ui, darkMode, onClose }) {
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
  const [editLoading, setEditLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0); // bump to refetch rows after save
  const [recFrom, setRecFrom] = useState("");
  const [recTo, setRecTo] = useState("");
  const [relFrom, setRelFrom] = useState("");
  const [relTo, setRelTo] = useState("");
  const [exporting, setExporting] = useState(false);
  // ── Trend side panel (classification records only) ──
  const hasTrend = !!(target.classification || target.trendRecords);
  // Starting view depends on what was clicked (month -> days, year -> months)
  const initTrend = (() => {
    const t = target.trendRecords;
    if (!t) return { mode: "year", year: null, month: null, basis: "received" };
    const basis =
      t.kind === "released" || t.kind === "received_released"
        ? "released"
        : "received";
    const ys = t.years ?? [];
    const yr = ys.length === 1 ? Number(ys[0]) : null;
    if (t.bucket != null && yr)
      return { mode: "day", year: yr, month: Number(t.bucket), basis };
    if (t.bucket != null)
      return { mode: "month", year: Number(t.bucket), month: null, basis };
    if (yr) return { mode: "month", year: yr, month: null, basis };
    return { mode: "year", year: null, month: null, basis };
  })();
  const trendMeta = (() => {
    if (target.trendRecords) {
      const k = target.trendRecords.kind;
      if (k === "released" || k === "received_released")
        return { label: "Released", color: "#36a420" };
      if (k === "received_in_progress")
        return { label: "In Progress", color: "#f59e0b" };
      if (k === "received_other") return { label: "Others", color: "#9ca3af" };
      return { label: "Received", color: FB };
    }
    return target.classification?.tab === "in_progress"
      ? { label: "In Progress", color: "#f59e0b" }
      : { label: "Completed", color: "#36a420" };
  })();

  // Doc type only means something for released / completed records
  const showDocBreakdown = trendMeta.label !== "In Progress";
  // Classification donut only for In Progress opened from the line chart / donut
  const showClassBreakdown =
    !!target.trendRecords && trendMeta.label === "In Progress";
  const [trendMode, setTrendMode] = useState(initTrend.mode); // year | month | day
  const [trendBasis, setTrendBasis] = useState(initTrend.basis); // received | released
  const [trendYear, setTrendYear] = useState(initTrend.year);
  const [trendMonth, setTrendMonth] = useState(initTrend.month);
  const [trendYears, setTrendYears] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [trendNoDate, setTrendNoDate] = useState(0);
  const [trendLoading, setTrendLoading] = useState(false);

  const [classFilter, setClassFilter] = useState("All");
  const [classCounts, setClassCounts] = useState([]);

  subOpenRef.current = !!(
    doctrackRow ||
    detail ||
    logsRow ||
    passwordRow ||
    editRecord ||
    editLoading
  );

  // Load the FULL record (same shape the Records page uses) so saving
  // never overwrites other columns with blanks.
  const fetchFullRecord = async (r) => {
    if (!r.dtn)
      throw new Error("This record has no DTN, so it cannot be loaded.");
    const res = await getUploadReports({
      page: 1,
      pageSize: 20,
      search: "",
      status: "",
      sortBy: "DB_DATE_EXCEL_UPLOAD",
      sortOrder: "desc",
      dtn: parseInt(r.dtn, 10),
    });
    const match = (res?.data ?? [])
      .map(mapDataItem)
      .find((x) => String(x.id) === String(r.db_id));
    if (!match) throw new Error("Full record not found.");
    return match;
  };

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
    setDetail(partial); // shown first as a fallback
    setDetailLoading(true);
    try {
      setDetail(await fetchFullRecord(r));
    } catch (err) {
      console.error("Load full record failed:", err);
    } finally {
      setDetailLoading(false);
    }
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

  // Trend panel follows search / status / doc-type, but NOT the date ranges
  // (a bar click sets the date range, which would otherwise collapse the chart)
  const requestTrend = (extra) => {
    const filters = {
      basis: trendBasis,
      search: query || undefined,
      status: statusFilter === "All" ? undefined : statusFilter,
      doc_type: docFilter === "All" ? undefined : docFilter,
      ...(target.trendRecords && classFilter !== "All"
        ? { classification: classFilter }
        : {}),
      ...extra,
    };
    return target.trendRecords
      ? getAnalyticsTrendTimeline({ ...target.trendRecords, ...filters })
      : getAnalyticsClassificationTrend({
          ...target.classification,
          ...filters,
        });
  };

  useEffect(() => {
    if (!hasTrend) return;
    if (trendMode !== "year" && !trendYear) return;
    if (trendMode === "day" && !trendMonth) return;
    let cancelled = false;
    (async () => {
      setTrendLoading(true);
      try {
        const res = await requestTrend({
          group_by: trendMode,
          bucket_year: trendMode !== "year" ? trendYear : undefined,
          bucket_month: trendMode === "day" ? trendMonth : undefined,
        });
        if (cancelled) return;
        setTrendData(res.data ?? []);
        setTrendNoDate(res.no_date ?? 0);
        if (trendMode === "year")
          setTrendYears((res.data ?? []).map((d) => d.key));
      } catch (err) {
        console.error("Trend fetch error:", err);
        if (!cancelled) setTrendData([]);
      } finally {
        if (!cancelled) setTrendLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    hasTrend,
    target,
    trendMode,
    trendYear,
    trendMonth,
    trendBasis,
    query,
    statusFilter,
    docFilter,
    classFilter,
  ]);

  // Fill the year dropdown when the panel opens in month / day view
  useEffect(() => {
    if (!hasTrend || trendMode === "year") return;
    requestTrend({ group_by: "year" })
      .then((r) => setTrendYears((r.data ?? []).map((d) => d.key)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTrend]);

  const switchTrendMode = (m) => {
    setTrendMode(m);
    const yr =
      trendYear ??
      trendYears[trendYears.length - 1] ??
      new Date().getFullYear();
    if (m !== "year" && !trendYear) setTrendYear(yr);
    if (m === "day" && !trendMonth) {
      const now = new Date();
      setTrendMonth(yr === now.getFullYear() ? now.getMonth() + 1 : 1);
    }
  };

  const pad2 = (n) => String(n).padStart(2, "0");
  const periodRange = (key) => {
    if (trendMode === "year") return [`${key}-01-01`, `${key}-12-31`];
    if (trendMode === "month") {
      const last = new Date(trendYear, key, 0).getDate();
      return [
        `${trendYear}-${pad2(key)}-01`,
        `${trendYear}-${pad2(key)}-${pad2(last)}`,
      ];
    }
    const day = `${trendYear}-${pad2(trendMonth)}-${pad2(key)}`;
    return [day, day];
  };
  const activeTrendKey = (() => {
    const [from, to] =
      trendBasis === "received" ? [recFrom, recTo] : [relFrom, relTo];
    if (!from || !to) return null;
    const hit = trendData.find((d) => {
      const [a, b] = periodRange(d.key);
      return a === from && b === to;
    });
    return hit ? hit.key : null;
  })();
  const handleTrendBar = (d) => {
    const [a, b] = periodRange(d.key);
    const [setF, setT] =
      trendBasis === "received"
        ? [setRecFrom, setRecTo]
        : [setRelFrom, setRelTo];
    if (activeTrendKey === d.key) {
      setF("");
      setT("");
    } else {
      setF(a);
      setT(b);
    }
    setPage(1);
  };

  const requestRecords = (pageNum, pageSize) => {
    const common = {
      page: pageNum,
      page_size: pageSize,
      search: query || undefined,
      status: statusFilter === "All" ? undefined : statusFilter,
      doc_type: docFilter === "All" ? undefined : docFilter,
      received_from: recFrom || undefined,
      received_to: recTo || undefined,
      released_from: relFrom || undefined,
      released_to: relTo || undefined,
    };
    return target.country
      ? getAnalyticsCountryRecords({ ...target.country, ...common })
      : target.fastest
        ? getAnalyticsFastestRecords({ ...target.fastest, ...common })
        : target.topco
          ? getAnalyticsCompanyRecords({ ...target.topco, ...common })
          : target.quality
            ? getAnalyticsQualityRecords({
                year: target.year,
                issue: target.quality,
                ...common,
              })
            : target.trendRecords
              ? getAnalyticsTrendRecords({
                  ...target.trendRecords,
                  ...common,
                  classification:
                    classFilter === "All" ? undefined : classFilter,
                })
              : target.classification
                ? getAnalyticsClassificationRecords({
                    ...target.classification,
                    ...common,
                  })
                : target.summary
                  ? getAnalyticsSummaryRecords({ ...target.summary, ...common })
                  : getAnalyticsYearRecords({
                      year: target.year,
                      kind: target.kind,
                      basis,
                      ...common,
                    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await requestRecords(page, RECORDS_PAGE_SIZE);
        if (cancelled) return;
        setRows(res.data ?? []);
        setTotal(res.total ?? 0);
        setStatusCounts(res.status_counts ?? []);
        setDocCounts(res.doc_type_counts ?? []);
        setClassCounts(res.class_counts ?? []);
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
  }, [
    target,
    basis,
    page,
    query,
    statusFilter,
    docFilter,
    classFilter,
    recFrom,
    recTo,
    relFrom,
    relTo,
    reloadKey,
  ]);

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
    statusFilter !== "All" ||
    docFilter !== "All" ||
    classFilter !== "All" ||
    query !== "" ||
    !!(recFrom || recTo || relFrom || relTo);
  const rangeInvalid = (a, b) => a && b && a > b;

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
    setClassFilter("All");
    setSearch("");
    setQuery("");
    setRecFrom("");
    setRecTo("");
    setRelFrom("");
    setRelTo("");
    setPage(1);
  };
  const yearLabel = target.year === "nodate" ? "No Date" : target.year;
  const baseTitle =
    target.kind === "received"
      ? `${yearLabel} — Received Applications`
      : target.kind === "in_progress"
        ? `${yearLabel} — In Progress (received in ${yearLabel})`
        : target.year === "nodate"
          ? `${yearLabel} — Completed, no valid date`
          : basis === "received"
            ? `${yearLabel} — Released (of Received in ${yearLabel})`
            : `${yearLabel} — Released in ${yearLabel}`;
  const title = target.docType
    ? `${baseTitle} · ${facetLabel(target.docType, "No Doc Type")}`
    : baseTitle;

  const handleExport = async () => {
    if (exporting || total === 0) return;
    setExporting(true);
    try {
      const size = 200;
      const pages = Math.ceil(total / size);
      let all = [];
      for (let p = 1; p <= pages; p++) {
        const res = await requestRecords(p, size);
        all = all.concat(res.data ?? []);
      }

      const header = [
        "DTN",
        "Entry Type",
        "Date Received (Center)",
        "Date Released",
        ...(target.fastest ? ["Working Days"] : []),
        ...(target.summary ? ["Validity"] : []),
        "Type of Doc Released",
        "Status",
        "Brand Name",
        "Generic Name",
        ...(target.quality ? ["Missing"] : []),
      ];
      const body = all.map((r) => [
        r.dtn ? String(r.dtn) : "",
        r.entry_type ?? "",
        r.date_received_cent ?? "",
        r.date_released ?? "",
        ...(target.fastest ? [r.days ?? ""] : []),
        ...(target.summary ? [r.secpa_exp_date ?? ""] : []),
        r.type_doc_released ?? "",
        r.app_status ?? "",
        r.brand_name ?? "",
        r.generic_name ?? "",
        ...(target.quality ? [(r.issues ?? []).join(", ")] : []),
      ]);

      const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
      ws["!cols"] = header.map((h) => ({ wch: Math.max(14, h.length + 2) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Records");
      const safe = String(target.title ?? title)
        .replace(/[\\/:*?"<>|·—]+/g, "-")
        .replace(/\s+/g, "_")
        .slice(0, 80);
      XLSX.writeFile(
        wb,
        `${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export records.");
    } finally {
      setExporting(false);
    }
  };

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
            width: hasTrend ? "min(1560px, 100%)" : "min(1100px, 100%)",
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
                type="text"
                name="dtn-search"
                autoComplete="off"
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
                onClick={handleExport}
                disabled={exporting || loading || total === 0}
                title="Export filtered records to Excel"
                style={{
                  ...pageBtn(exporting || loading || total === 0),
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span>⬇</span>
                <span>{exporting ? "Exporting…" : "Export Excel"}</span>
              </button>
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

          {/* Body: table column (+ trend panel on the right) */}
          <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
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
                          setStatusFilter(
                            statusFilter === s.key ? "All" : s.key,
                          );
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

              {/* Date range filters */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  padding: "10px 18px",
                  borderBottom: `1px solid ${line}`,
                  flexWrap: "wrap",
                }}
              >
                {[
                  {
                    label: "Date Received",
                    from: recFrom,
                    to: recTo,
                    setFrom: setRecFrom,
                    setTo: setRecTo,
                  },
                  {
                    label: "Date Released",
                    from: relFrom,
                    to: relTo,
                    setFrom: setRelFrom,
                    setTo: setRelTo,
                  },
                ].map((f) => {
                  const bad = rangeInvalid(f.from, f.to);
                  const st = {
                    ...selectSt,
                    border: `1px solid ${bad ? "#e02020" : line}`,
                  };
                  return (
                    <div
                      key={f.label}
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: ui.textMuted,
                        }}
                      >
                        {f.label}
                      </span>
                      <input
                        type="date"
                        value={f.from}
                        max={f.to || undefined}
                        onChange={(e) => {
                          f.setFrom(e.target.value);
                          setPage(1);
                        }}
                        style={st}
                      />
                      <span
                        style={{ fontSize: "0.72rem", color: ui.textMuted }}
                      >
                        to
                      </span>
                      <input
                        type="date"
                        value={f.to}
                        min={f.from || undefined}
                        onChange={(e) => {
                          f.setTo(e.target.value);
                          setPage(1);
                        }}
                        style={st}
                      />
                      {bad && (
                        <span style={{ fontSize: "0.68rem", color: "#e02020" }}>
                          "From" is after "To"
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Table */}
              <div
                style={{
                  position: "relative",
                  flex: 1,
                  minHeight: 240,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {/* Spinner overlay while refetching (page / filter / search) */}
                {loading && rows.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: darkMode
                        ? "rgba(0,0,0,0.35)"
                        : "rgba(255,255,255,0.55)",
                      pointerEvents: "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 16px",
                        borderRadius: 10,
                        background: neuCardBg(darkMode),
                        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color: ui.textPrimary,
                        fontFamily: font,
                      }}
                    >
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          border: `2px solid ${FB}`,
                          borderTopColor: "transparent",
                          borderRadius: "50%",
                          animation: "spin 0.7s linear infinite",
                          display: "inline-block",
                        }}
                      />
                      Loading records…
                    </div>
                  </div>
                )}

                <div style={{ overflow: "auto", flex: 1 }}>
                  {loading && rows.length === 0 ? (
                    <div style={{ padding: 18 }}>
                      <LoadingRows rows={10} height={30} darkMode={darkMode} />
                    </div>
                  ) : error ? (
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
                          {target.fastest && <th style={th}>Working Days</th>}
                          {target.summary && <th style={th}>Validity</th>}
                          <th style={th}>Type of Doc Released</th>
                          <th style={th}>Status</th>
                          <th style={th}>Brand Name</th>
                          <th style={th}>Generic Name</th>
                          {target.quality && <th style={th}>Missing</th>}
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
                            {target.fastest && (
                              <td
                                style={{
                                  ...td,
                                  fontWeight: 800,
                                  color: "#36a420",
                                }}
                              >
                                {r.days ?? "—"}
                              </td>
                            )}
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
                            {target.quality && (
                              <td style={td}>
                                {(r.issues ?? []).length
                                  ? r.issues.map((iss) => (
                                      <span
                                        key={iss}
                                        style={{
                                          fontSize: "0.65rem",
                                          fontWeight: 700,
                                          padding: "2px 8px",
                                          borderRadius: 99,
                                          color: "#e02020",
                                          background: "#e0202022",
                                          marginRight: 4,
                                        }}
                                      >
                                        {iss}
                                      </span>
                                    ))
                                  : "—"}
                              </td>
                            )}
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
                                style={{
                                  ...pageBtn(false),
                                  padding: "3px 10px",
                                }}
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
                    style={pageBtn(page === 1 || loading)}
                    disabled={page === 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ‹ Prev
                  </button>
                  <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
                    Page {page} / {totalPages}
                  </span>
                  <button
                    style={pageBtn(page >= totalPages || loading)}
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next ›
                  </button>
                </div>
              </div>
            </div>
            {hasTrend && (
              <ClassTrendPanel
                data={trendData}
                noDate={trendNoDate}
                loading={trendLoading}
                modes={
                  target.trendRecords
                    ? ["year", "month", "day"]
                    : ["year", "month"]
                }
                mode={trendMode}
                onModeChange={switchTrendMode}
                basis={trendBasis}
                onBasisChange={setTrendBasis}
                year={trendYear}
                onYearChange={setTrendYear}
                years={trendYears}
                month={trendMonth}
                onMonthChange={setTrendMonth}
                activeKey={activeTrendKey}
                onBarClick={handleTrendBar}
                docBreakdown={showDocBreakdown ? docCounts : []}
                docFilter={docFilter}
                onDocClick={(k) => {
                  setDocFilter(docFilter === k ? "All" : k);
                  setPage(1);
                }}
                classBreakdown={showClassBreakdown ? classCounts : []}
                classFilter={classFilter}
                onClassClick={(k) => {
                  setClassFilter(classFilter === k ? "All" : k);
                  setPage(1);
                }}
                ui={ui}
                darkMode={darkMode}
                color={trendMeta.color}
                tabLabel={trendMeta.label}
              />
            )}
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
          onConfirm={async () => {
            const row = passwordRow;
            setPasswordRow(null);
            setEditLoading(true);
            try {
              setEditRecord(await fetchFullRecord(row));
            } catch (err) {
              console.error("Load full record failed:", err);
              alert(`Could not open the record for editing.\n${err.message}`);
            } finally {
              setEditLoading(false);
            }
          }}
        />
      )}

      {editLoading &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 1300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontFamily: font,
              fontSize: "0.85rem",
            }}
          >
            Loading record…
          </div>,
          document.body,
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
  onClick,
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
      onClick={onClick}
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
        cursor: onClick ? "pointer" : breakdown ? "help" : "default",
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

// ── Donut chart (pure SVG, clickable) ────────────────────────
function PieChart({
  slices,
  darkMode,
  ui,
  onSliceClick,
  size = 300,
  centerLabel = "TOTAL",
  legendMin = 240,
  hint = "Click a slice or a row to view its records",
}) {
  const [hovered, setHovered] = useState(null);
  const cx = 150,
    cy = 150,
    rOut = 126,
    rIn = 80;
  const clickable = typeof onSliceClick === "function";

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

  const gapA = slices.length > 1 ? 0.025 : 0;
  const pol = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  let cursor = -Math.PI / 2;
  const arcs = slices.map((sl) => {
    const angle = Math.min(
      (sl.value / total) * 2 * Math.PI,
      2 * Math.PI - 0.001,
    );
    const a0 = cursor + gapA / 2;
    const a1 = Math.max(cursor + angle - gapA / 2, a0 + 0.004);
    cursor += angle;
    const [x1, y1] = pol(rOut, a0);
    const [x2, y2] = pol(rOut, a1);
    const [x3, y3] = pol(rIn, a1);
    const [x4, y4] = pol(rIn, a0);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return {
      ...sl,
      path: `M${x1},${y1} A${rOut},${rOut} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${rIn},${rIn} 0 ${large} 0 ${x4},${y4} Z`,
      mid: (a0 + a1) / 2,
      pct: (sl.value / total) * 100,
    };
  });

  const hov = hovered !== null ? arcs[hovered] : null;
  const rowHover = darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        flexWrap: "wrap",
        padding: "6px 0 2px",
      }}
    >
      {/* Donut */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 300 300"
          style={{ overflow: "visible", maxWidth: "100%" }}
        >
          {arcs.map((arc, i) => {
            const isHov = hovered === i;
            const ox = isHov ? Math.cos(arc.mid) * 7 : 0;
            const oy = isHov ? Math.sin(arc.mid) * 7 : 0;
            return (
              <path
                key={arc.key ?? i}
                d={arc.path}
                fill={arc.color}
                opacity={hovered === null || isHov ? 1 : 0.35}
                transform={`translate(${ox},${oy})`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => clickable && onSliceClick(arc)}
                style={{
                  cursor: clickable ? "pointer" : "default",
                  transition: "opacity 0.18s ease, transform 0.18s ease",
                  filter: isHov
                    ? "drop-shadow(0 4px 10px rgba(0,0,0,0.3))"
                    : "none",
                }}
              />
            );
          })}

          {hov ? (
            <>
              <text
                x={cx}
                y={cy - 6}
                textAnchor="middle"
                fontSize={26}
                fontWeight={800}
                fill={hov.color}
                fontFamily={font}
              >
                {hov.pct.toFixed(1)}%
              </text>
              <text
                x={cx}
                y={cy + 14}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill={ui.textPrimary}
                fontFamily={font}
              >
                {hov.short ?? hov.name}
              </text>
              <text
                x={cx}
                y={cy + 30}
                textAnchor="middle"
                fontSize={11}
                fill={ui.textMuted}
                fontFamily={font}
              >
                {hov.value.toLocaleString()}
              </text>
            </>
          ) : (
            <>
              <text
                x={cx}
                y={cy - 4}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                letterSpacing="0.12em"
                fill={ui.textMuted}
                fontFamily={font}
              >
                {centerLabel}
              </text>
              <text
                x={cx}
                y={cy + 24}
                textAnchor="middle"
                fontSize={28}
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
          gap: 4,
          flex: 1,
          minWidth: legendMin,
          maxWidth: 420,
        }}
      >
        {arcs.map((arc, i) => (
          <div
            key={arc.key ?? i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => clickable && onSliceClick(arc)}
            title={clickable ? "Click to view records" : undefined}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              cursor: clickable ? "pointer" : "default",
              opacity: hovered === null || hovered === i ? 1 : 0.45,
              background: hovered === i ? rowHover : "transparent",
              transition: "all 0.15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: arc.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "0.78rem",
                  color: ui.textPrimary,
                  fontWeight: hovered === i ? 700 : 500,
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {arc.name}
              </span>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: arc.color,
                }}
              >
                {arc.pct.toFixed(1)}%
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  color: ui.textMuted,
                  minWidth: 52,
                  textAlign: "right",
                }}
              >
                {arc.value.toLocaleString()}
              </span>
              {clickable && (
                <span style={{ fontSize: "0.9rem", color: ui.textMuted }}>
                  ›
                </span>
              )}
            </div>
            <div
              style={{
                height: 4,
                borderRadius: 99,
                marginTop: 6,
                overflow: "hidden",
                background: darkMode
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.07)",
              }}
            >
              <div
                style={{
                  width: `${Math.max(arc.pct, 0.5)}%`,
                  height: "100%",
                  background: arc.color,
                  borderRadius: 99,
                  transition: "width 0.3s",
                }}
              />
            </div>
          </div>
        ))}
        {clickable && hint && (
          <span
            style={{
              fontSize: "0.65rem",
              color: ui.textMuted,
              padding: "6px 10px 0",
            }}
          >
            {hint}
          </span>
        )}
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
  const [classStatus, setClassStatus] = useState("completed"); // completed | in_progress
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
  const [rrYears, setRrYears] = useState(["2026"]); // [] = all years
  // single value for the old trend query (used by the PDF export)
  const trendYear = rrYears.length === 1 ? rrYears[0] : "All";
  const trendRunId = useRef(0);

  // ── Received vs Released (trend + breakdown) ─────────────────
  const [rrData, setRrData] = useState([]);
  const [rrBreakdown, setRrBreakdown] = useState(null);
  const [loadingRR, setLoadingRR] = useState(true);
  const rrRunId = useRef(0);

  // ── Pie toggle: "classification" | "doctype" ─────────────────
  const [pieView, setPieView] = useState("classification");

  // ── Year summary basis: "released" | "received" ──────────────
  const [yearBasis, setYearBasis] = useState("released");
  const [recordsTarget, setRecordsTarget] = useState(null); // { year, kind }
  const [showInProgress, setShowInProgress] = useState(false);
  const [showExportPdf, setShowExportPdf] = useState(false);
  const [drugTarget, setDrugTarget] = useState(null); // drug row opened from Top Drug Applications
  const [loadingYear, setLoadingYear] = useState(true);

  // ── Data completeness ────────────────────────────────────────
  const [qualityData, setQualityData] = useState([]);
  const [loadingQuality, setLoadingQuality] = useState(true);
  const [showQualityNote, setShowQualityNote] = useState(false);
  const qualityFetched = useRef(false);

  // ── Pagination ────────────────────────────────────────────────
  const [drugsPage, setDrugsPage] = useState(1);
  const [drugSearch, setDrugSearch] = useState("");
  const [countryPage, setCountryPage] = useState(1);
  useEffect(() => {
    setCountryPage(1);
  }, [topCountryTab]);
  useEffect(() => {
    setDrugsPage(1);
  }, [drugSearch]);

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

  const classRunId = useRef(0);
  const fetchClassification = useCallback(async () => {
    const id = ++classRunId.current;
    setLoadingSec((s) => ({ ...s, classification: true }));
    try {
      const res = await getAnalyticsByClassification({
        year: chartYear,
        month: chartMonth,
        prescription: rxFilter,
        status: classStatus,
      });
      if (id !== classRunId.current) return;
      setClassificationData(res.data ?? []);
      setClassDocTypes(res.doc_types ?? []);
    } catch (err) {
      console.error("Classification fetch error:", err);
    } finally {
      if (id === classRunId.current)
        setLoadingSec((s) => ({ ...s, classification: false }));
    }
  }, [chartYear, chartMonth, rxFilter, classStatus]);

  useEffect(() => {
    fetchClassification();
  }, [fetchClassification]);

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

  const fetchRR = useCallback(async () => {
    const id = ++rrRunId.current;
    setLoadingRR(true);
    try {
      const res = await getAnalyticsReceivedReleasedTrend({
        years: rrYears,
        month: chartMonth,
        prescription: rxFilter,
      });
      if (id !== rrRunId.current) return;
      setRrData(res.data ?? []);
      setRrBreakdown(res.breakdown ?? null);
    } catch (err) {
      console.error("Received/Released trend fetch error:", err);
    } finally {
      if (id === rrRunId.current) setLoadingRR(false);
    }
  }, [rrYears, chartMonth, rxFilter]);

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
    fetchRR();
  }, [fetchRR]);

  const fetchQuality = useCallback(async () => {
    setLoadingQuality(true);
    try {
      const res = await getAnalyticsDataQuality();
      setQualityData(res.data ?? []);
    } catch (err) {
      console.error("Data quality fetch error:", err);
    } finally {
      setLoadingQuality(false);
    }
  }, []);

  // load after the heavy sections finish (top drugs is last)
  useEffect(() => {
    if (loadingSec.drugs || qualityFetched.current) return;
    qualityFetched.current = true;
    fetchQuality();
  }, [loadingSec.drugs]);

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
  const rrScope =
    rrYears.length === 0
      ? "All years"
      : rrYears.length <= 3
        ? [...rrYears].sort((a, b) => Number(a) - Number(b)).join(", ")
        : `${rrYears.length} years`;
  const rrSlices = rrBreakdown
    ? [
        {
          key: "received",
          name: "Received",
          short: "Received",
          value: rrBreakdown.received,
          color: FB,
        },
        {
          key: "received_released",
          name: "Released",
          short: "Released",
          value: rrBreakdown.released,
          color: "#36a420",
        },
        {
          key: "received_in_progress",
          name: "In Progress",
          short: "In Progress",
          value: rrBreakdown.in_progress,
          color: "#f59e0b",
        },
        {
          key: "received_other",
          name: "Others",
          short: "Others",
          value: rrBreakdown.other,
          color: "#9ca3af",
        },
      ].filter((s) => s.value > 0)
    : [];
  const rrRate = rrBreakdown?.received
    ? (rrBreakdown.released_of_received / rrBreakdown.received) * 100
    : 0;

  const trendYearOptions = [
    ...new Set([...yearSummaryData.map((r) => String(r.year)), trendYear]),
  ]
    .filter((y) => y !== "All" && y !== NO_DATE)
    .sort((a, b) => Number(b) - Number(a));
  const maxDrug = Math.max(...topDrugsData.map((d) => d.total), 1);
  const maxCountry = Math.max(...topCountriesData.map((d) => d.count), 1);

  // Keep the original rank so a search result still shows its real position
  const rankedDrugs = useMemo(
    () => topDrugsData.map((d, i) => ({ ...d, rank: i + 1 })),
    [topDrugsData],
  );
  const drugQuery = drugSearch.trim().toLowerCase();
  const filteredDrugs = useMemo(
    () =>
      drugQuery
        ? rankedDrugs.filter((d) =>
            `${d.name} ${d.generic}`.toLowerCase().includes(drugQuery),
          )
        : rankedDrugs,
    [rankedDrugs, drugQuery],
  );
  const drugsTotalPages = Math.ceil(filteredDrugs.length / DRUGS_PAGE_SIZE);
  const pagedDrugs = filteredDrugs.slice(
    (drugsPage - 1) * DRUGS_PAGE_SIZE,
    drugsPage * DRUGS_PAGE_SIZE,
  );

  // ── Pie slices ────────────────────────────────────────────────
  const classPieSlices = classificationData.map((row) => ({
    key: row.type,
    name: row.type,
    short: classShort(row.type),
    value: row.count,
    color: classTypeColor(classShort(row.type)),
  }));

  // Doc-type columns only exist for Completed (In Progress has none)
  const showDocCols = classStatus === "completed";
  const visibleDocTypes = classDocTypes.filter((dt) =>
    classificationData.some((row) => (row.by_doc_type?.[dt] ?? 0) > 0),
  );

  const openClassRecords = (slice) => {
    const tabLabel = classStatus === "completed" ? "Completed" : "In Progress";
    const scope = {
      year: chartYear,
      month: chartMonth,
      prescription: rxFilter,
      tab: classStatus,
    };
    if (pieView === "classification") {
      setRecordsTarget({
        title: `${tabLabel} — ${slice.name}`,
        classification: { ...scope, classification: slice.key },
      });
    } else {
      setRecordsTarget({
        title: `${tabLabel} — ${slice.name} documents`,
        docType: docKey(slice.key),
        classification: scope,
      });
    }
  };

  // Click on a table cell: Total (all docs) or a doc-type column
  const openClassCell = (row, dt = null) => {
    const tabLabel = classStatus === "completed" ? "Completed" : "In Progress";
    setRecordsTarget({
      title: `${tabLabel} — ${row.type}${dt ? ` · ${dt}` : ""}`,
      ...(dt ? { docType: docKey(dt) } : {}),
      classification: {
        year: chartYear,
        month: chartMonth,
        prescription: rxFilter,
        tab: classStatus,
        classification: row.type,
      },
    });
  };

  const docTypePieSlices = classDocTypes
    .map((dt) => ({
      key: dt,
      short: dt,
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
      inProgress: 0,
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
      t.inProgress += Number(row.in_progress) || 0;
      t.total += released;
      t.noDoc += Math.max(released - docSum, 0);
    });
    return t;
  })();

  const qualityTotals = qualityData.reduce(
    (t, r) => ({
      total: t.total + r.total,
      received_filled: t.received_filled + r.received_filled,
      release_expected: t.release_expected + r.release_expected,
      released_filled: t.released_filled + r.released_filled,
      doc_expected: t.doc_expected + (r.doc_expected ?? 0),
      doc_filled: t.doc_filled + (r.doc_filled ?? 0),
      complete: t.complete + r.complete,
    }),
    {
      total: 0,
      received_filled: 0,
      release_expected: 0,
      released_filled: 0,
      doc_expected: 0,
      doc_filled: 0,
      complete: 0,
    },
  );
  const qualityMissing = {
    received: qualityTotals.total - qualityTotals.received_filled,
    released: qualityTotals.release_expected - qualityTotals.released_filled,
    doc: qualityTotals.doc_expected - qualityTotals.doc_filled,
    incomplete: qualityTotals.total - qualityTotals.complete,
  };

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
    setRecordsTarget({ year: yearKey(year), kind: "released", docType });

  const openQualityRecords = (year, issue) => {
    const labels = {
      missing_received: "Missing Date Received",
      missing_released: "Missing Date Released",
      missing_doc: "Missing Type of Doc Released",
      incomplete: "Incomplete records",
      complete: "Complete records",
    };
    setRecordsTarget({
      year: year === "all" ? "all" : yearKey(year),
      quality: issue,
      title: `${year === "all" ? "All years" : year} — ${labels[issue]}`,
    });
  };

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
      "In Progress",
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
        row.in_progress ?? 0,
        row.total,
        Number(releasedRate(row).toFixed(1)),
        ...docCounts,
        Math.max(row.total - docSum, 0),
      ];
    });

    rows.push([
      "Total",
      yearTotals.received,
      yearTotals.inProgress,
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

  // Line chart point / legend click
  const openTrendRecords = (series, d = null) => {
    const label =
      series === "received"
        ? "Received"
        : series === "released"
          ? "Released"
          : "In Progress";
    // In Progress is counted by Date Received, so it uses the received_in_progress kind
    const kind = series === "in_progress" ? "received_in_progress" : series;
    const when = d
      ? rrYears.length === 1
        ? `${d.label} ${rrYears[0]}`
        : d.label
      : rrScope;
    setRecordsTarget({
      title: `${label} — ${when}`,
      trendRecords: {
        years: rrYears,
        month: chartMonth,
        prescription: rxFilter,
        kind,
        bucket: d?.key,
      },
    });
  };

  // Donut slice click
  const openBreakdownRecords = (slice) =>
    setRecordsTarget({
      title: `Received (${rrScope}) — ${slice.name}`,
      trendRecords: {
        years: rrYears,
        month: chartMonth,
        prescription: rxFilter,
        kind: slice.key,
      },
    });

  // Country row click
  const openCountryRecords = (row) => {
    const entityLabel =
      ENTITY_TYPES.find((et) => et.key === topCountryTab)?.label ?? "";
    setRecordsTarget({
      title: `${row.country} — ${entityLabel}`,
      country: {
        entity_type: topCountryTab,
        country: row.country,
        year: chartYear,
        month: chartMonth,
        prescription: rxFilter,
      },
    });
  };

  const pagedCountries = topCountriesData.slice(
    (countryPage - 1) * COUNTRIES_PAGE_SIZE,
    countryPage * COUNTRIES_PAGE_SIZE,
  );
  const countriesTotalPages = Math.ceil(
    topCountriesData.length / COUNTRIES_PAGE_SIZE,
  );

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
      {/* ── Toolbar ── */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setShowExportPdf(true)}
          title="Generate a PDF report of this page"
          style={{
            ...inputSt,
            padding: "6px 14px",
            fontSize: "0.78rem",
            fontWeight: 700,
            cursor: "pointer",
            color: FB,
          }}
        >
          📄 Export PDF
        </button>
      </div>

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
                    onClick={() => setShowInProgress(true)}
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
            {/* Received vs Released trend */}
            {loadingRR && rrData.length === 0 ? (
              <SectionCardSkeleton
                height={CHART_SKELETON_HEIGHT}
                darkMode={darkMode}
              />
            ) : (
              <SectionCard
                title="Received, Released & In Progress"
                subtitle={`Grouped by ${rrYears.length === 1 ? "month" : "year"} · click a point to view records`}
                icon="📈"
                ui={ui}
                darkMode={darkMode}
                action={
                  <YearMultiSelect
                    options={trendYearOptions}
                    value={rrYears}
                    onChange={setRrYears}
                    ui={ui}
                    darkMode={darkMode}
                  />
                }
              >
                <div
                  style={{
                    opacity: loadingRR ? 0.5 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  <RRTrendChart
                    data={rrData}
                    ui={ui}
                    darkMode={darkMode}
                    onPointClick={openTrendRecords}
                  />
                </div>
              </SectionCard>
            )}

            {/* Received breakdown */}
            {loadingRR && !rrBreakdown ? (
              <SectionCardSkeleton
                height={CHART_SKELETON_HEIGHT}
                darkMode={darkMode}
              />
            ) : (
              <SectionCard
                title="Received Breakdown"
                subtitle={`Received, released & in progress · ${rrScope}`}
                icon="🍩"
                ui={ui}
                darkMode={darkMode}
              >
                <div
                  style={{
                    opacity: loadingRR ? 0.5 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  <PieChart
                    slices={rrSlices}
                    darkMode={darkMode}
                    ui={ui}
                    onSliceClick={openBreakdownRecords}
                    size={160}
                    centerLabel="TOTAL"
                    legendMin={170}
                    hint=""
                  />
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: "0.72rem",
                      color: ui.textMuted,
                      textAlign: "center",
                    }}
                  >
                    Release rate{" "}
                    <b style={{ color: "#36a420" }}>{rrRate.toFixed(1)}%</b>{" "}
                    (Released ÷ Received)
                  </div>
                </div>
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
                    <th
                      rowSpan={2}
                      style={ysTh()}
                      title="Received in this year with status IN PROGRESS"
                    >
                      In Progress
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
                          { kind: "in_progress", value: row.in_progress ?? 0 },
                          { kind: "released", value: row.total },
                        ].map(({ kind, value }) => (
                          <td key={kind} style={ysTd()}>
                            {Number(value) > 0 ? (
                              <span
                                onClick={() =>
                                  setRecordsTarget({
                                    year: yearKey(row.year),
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
                          {row.year === NO_DATE
                            ? "—"
                            : `${releasedRate(row).toFixed(1)}%`}
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
                      {yearTotals.inProgress.toLocaleString()}
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

      {/* ── Data Completeness ── */}
      <FadeSlideIn delay={540}>
        <SectionCard
          title="Data Completeness"
          subtitle="How complete the Date Received / Date Released fields are"
          icon="🧮"
          ui={ui}
          darkMode={darkMode}
          action={
            <button
              onClick={() => setShowQualityNote((v) => !v)}
              style={neuBtnStyle(showQualityNote)}
            >
              ⓘ How is this measured?
            </button>
          }
        >
          {loadingQuality && qualityData.length === 0 ? (
            <LoadingRows rows={6} height={28} darkMode={darkMode} />
          ) : qualityData.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.82rem",
                padding: "24px 0",
              }}
            >
              No data available
            </div>
          ) : (
            <>
              {showQualityNote && (
                <div
                  style={{
                    marginBottom: 14,
                    padding: "12px 14px",
                    borderRadius: 10,
                    fontSize: "0.74rem",
                    lineHeight: 1.6,
                    color: ui.textMuted,
                    border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
                  }}
                >
                  <b style={{ color: ui.textPrimary }}>How it is measured</b>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    <li>
                      A record is <b>complete</b> when its Date Received
                      (Center) is valid, its Date Released is valid if it is
                      expected to have one, and its Type of Doc Released is
                      filled if it is expected to have one.
                    </li>
                    <li>
                      <b>Date Released is expected</b> only when the status is
                      COMPLETED. In progress, on-process and cancelled
                      applications are not penalized for having no release date.
                    </li>
                    <li>
                      <b>Type of Doc Released is expected</b> when the status is
                      COMPLETED, or when the record already has a valid release
                      date.
                    </li>
                    <li>
                      <b>Valid date</b> = readable YYYY-MM-DD between 2000 and
                      2100. Blanks, "N/A" and text such as "NOD 90" count as
                      missing.
                    </li>
                    <li>
                      <b>Completeness %</b> = complete records ÷ total records.
                      Released % and Doc Type % only count records where the
                      field is expected.
                    </li>
                    <li>
                      Records are grouped by the year received; if there is no
                      valid received date, by the year released; if neither,
                      under "No Date".
                    </li>
                    <li>
                      Limit: this checks that the data is present, not that it
                      is correct. A wrong but valid-looking date still counts as
                      complete.
                    </li>
                    <li>
                      To fix a record, click a red number, then use{" "}
                      <b>Actions ▾ → Update Application Info</b>.
                    </li>
                  </ul>
                </div>
              )}

              {/* Summary tiles */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                {[
                  {
                    label: "Overall completeness",
                    p: pct(qualityTotals.complete, qualityTotals.total),
                    sub: `${qualityTotals.complete.toLocaleString()} of ${qualityTotals.total.toLocaleString()} records`,
                    missing: qualityMissing.incomplete,
                    missingText: "need fixing",
                    issue: "incomplete",
                  },
                  {
                    label: "Date Received filled",
                    p: pct(qualityTotals.received_filled, qualityTotals.total),
                    sub: `${qualityTotals.received_filled.toLocaleString()} of ${qualityTotals.total.toLocaleString()} records`,
                    missing: qualityMissing.received,
                    missingText: "missing",
                    issue: "missing_received",
                  },
                  {
                    label: "Date Released filled",
                    p: pct(
                      qualityTotals.released_filled,
                      qualityTotals.release_expected,
                    ),
                    sub: `${qualityTotals.released_filled.toLocaleString()} of ${qualityTotals.release_expected.toLocaleString()} expected`,
                    missing: qualityMissing.released,
                    missingText: "missing",
                    issue: "missing_released",
                  },
                  {
                    label: "Type of Doc Released filled",
                    p: pct(
                      qualityTotals.doc_filled,
                      qualityTotals.doc_expected,
                    ),
                    sub: `${qualityTotals.doc_filled.toLocaleString()} of ${qualityTotals.doc_expected.toLocaleString()} expected`,
                    missing: qualityMissing.doc,
                    missingText: "missing",
                    issue: "missing_doc",
                  },
                ].map((t) => (
                  <div
                    key={t.label}
                    title={`${t.sub} → ${t.p.toFixed(1)}%`}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: neuCardBg(darkMode),
                      boxShadow: neuShadow(darkMode),
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: ui.textMuted,
                      }}
                    >
                      {t.label}
                    </div>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 800,
                        color: completenessColor(t.p),
                        lineHeight: 1.2,
                        margin: "4px 0 6px",
                      }}
                    >
                      {t.p.toFixed(1)}%
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 99,
                        overflow: "hidden",
                        background: darkMode
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.08)",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(t.p, 100)}%`,
                          height: "100%",
                          background: completenessColor(t.p),
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        marginTop: 6,
                        fontSize: "0.68rem",
                        color: ui.textMuted,
                      }}
                    >
                      <span>{t.sub}</span>
                      {t.missing > 0 ? (
                        <span
                          onClick={() => openQualityRecords("all", t.issue)}
                          title="Click to view records"
                          style={{
                            ...linkSt,
                            color: "#e02020",
                            fontWeight: 700,
                          }}
                        >
                          {t.missing.toLocaleString()} {t.missingText}
                        </span>
                      ) : (
                        <span style={{ color: "#36a420", fontWeight: 700 }}>
                          All filled
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Per-year table */}
              <div
                style={{
                  overflowX: "auto",
                  opacity: loadingQuality ? 0.5 : 1,
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
                      <th style={ysTh(true)}>Year</th>
                      <th style={ysTh()}>Total Records</th>
                      <th style={ysTh()}>Received · Filled</th>
                      <th style={ysTh()}>Received · Missing</th>
                      <th
                        style={ysTh()}
                        title="Counts only records expected to be released"
                      >
                        Released · Filled
                      </th>
                      <th
                        style={ysTh()}
                        title="Expected to be released but no valid Date Released"
                      >
                        Released · Missing
                      </th>
                      <th
                        style={ysTh()}
                        title="Counts only records that are COMPLETED or already have a release date"
                      >
                        Doc Type · Filled
                      </th>
                      <th
                        style={ysTh()}
                        title="Expected to have a Type of Doc Released but blank"
                      >
                        Doc Type · Missing
                      </th>
                      <th style={ysTh()}>Complete</th>
                      <th
                        style={ysTh()}
                        title="Completeness = Complete records ÷ Total records × 100"
                      >
                        Completeness
                        <div
                          style={{
                            fontSize: "0.58rem",
                            fontWeight: 500,
                            textTransform: "none",
                            letterSpacing: 0,
                            marginTop: 2,
                          }}
                        >
                          Complete ÷ Total × 100
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {qualityData.map((r) => {
                      const p = pct(r.complete, r.total);
                      const miss = (n, issue) =>
                        n > 0 ? (
                          <span
                            onClick={() => openQualityRecords(r.year, issue)}
                            title="Click to view records"
                            style={{ ...linkSt, color: "#e02020" }}
                          >
                            {n.toLocaleString()}
                          </span>
                        ) : (
                          n
                        );
                      return (
                        <tr key={r.year}>
                          <td style={ysTd(ui.textPrimary, true)}>{r.year}</td>
                          <td style={ysTd()}>{r.total.toLocaleString()}</td>
                          <td style={ysTd()}>
                            {r.received_filled.toLocaleString()}
                          </td>
                          <td style={ysTd()}>
                            {miss(r.missing_received, "missing_received")}
                          </td>
                          <td style={ysTd()}>
                            {r.released_filled.toLocaleString()}
                          </td>
                          <td style={ysTd()}>
                            {miss(r.missing_released, "missing_released")}
                          </td>
                          <td style={ysTd()}>
                            {(r.doc_filled ?? 0).toLocaleString()}
                          </td>
                          <td style={ysTd()}>
                            {miss(r.missing_doc ?? 0, "missing_doc")}
                          </td>
                          <td style={ysTd()}>{r.complete.toLocaleString()}</td>
                          <td
                            style={ysTd()}
                            title={`${r.complete.toLocaleString()} ÷ ${r.total.toLocaleString()} × 100 = ${p.toFixed(1)}%`}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                minWidth: 150,
                              }}
                            >
                              <div
                                style={{
                                  flex: 1,
                                  height: 6,
                                  borderRadius: 99,
                                  overflow: "hidden",
                                  background: darkMode
                                    ? "rgba(255,255,255,0.08)"
                                    : "rgba(0,0,0,0.08)",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${Math.min(p, 100)}%`,
                                    height: "100%",
                                    background: completenessColor(p),
                                  }}
                                />
                              </div>
                              <span
                                style={{
                                  color: completenessColor(p),
                                  fontWeight: 700,
                                  minWidth: 44,
                                  textAlign: "right",
                                }}
                              >
                                {p.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Total row */}
                    <tr>
                      <td
                        style={{ ...ysTd(ui.textPrimary, true), ...totalCell }}
                      >
                        Total
                      </td>
                      <td style={{ ...ysTd(), ...totalCell }}>
                        {qualityTotals.total.toLocaleString()}
                      </td>
                      <td style={{ ...ysTd(), ...totalCell }}>
                        {qualityTotals.received_filled.toLocaleString()}
                      </td>
                      <td style={{ ...ysTd(), ...totalCell }}>
                        {qualityMissing.received.toLocaleString()}
                      </td>
                      <td style={{ ...ysTd(), ...totalCell }}>
                        {qualityTotals.released_filled.toLocaleString()}
                      </td>
                      <td style={{ ...ysTd(), ...totalCell }}>
                        {qualityMissing.released.toLocaleString()}
                      </td>
                      <td style={{ ...ysTd(), ...totalCell }}>
                        {qualityTotals.doc_filled.toLocaleString()}
                      </td>
                      <td style={{ ...ysTd(), ...totalCell }}>
                        {qualityMissing.doc.toLocaleString()}
                      </td>
                      <td style={{ ...ysTd(), ...totalCell }}>
                        {qualityTotals.complete.toLocaleString()}
                      </td>
                      <td
                        style={{ ...ysTd(), ...totalCell }}
                        title={`${qualityTotals.complete.toLocaleString()} ÷ ${qualityTotals.total.toLocaleString()} × 100`}
                      >
                        {pct(
                          qualityTotals.complete,
                          qualityTotals.total,
                        ).toFixed(1)}
                        %
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SectionCard>
      </FadeSlideIn>

      {/* ── By Classification + Top Drug Applications (50/50) ── */}
      <FadeSlideIn delay={560}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          {/* ── Product Classification ── */}
          <SectionCard
            title="Product Classification"
            subtitle={
              classStatus === "completed"
                ? "Completed applications per product class"
                : "In progress applications per product class"
            }
            icon="💊"
            ui={ui}
            darkMode={darkMode}
            action={
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
                  {
                    key: "completed",
                    label: "Completed",
                    count: summary.completed,
                  },
                  {
                    key: "in_progress",
                    label: "In Progress",
                    count: summary.in_progress,
                  },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setClassStatus(key);
                      if (key !== "completed") setPieView("classification");
                    }}
                    style={neuBtnStyle(classStatus === key)}
                  >
                    {label}
                    <span
                      style={{
                        marginLeft: 5,
                        opacity: 0.65,
                        fontWeight: 600,
                      }}
                    >
                      {Number(count ?? 0).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            }
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
              <div
                style={{
                  opacity: loadingSec.classification ? 0.5 : 1,
                  transition: "opacity 0.2s",
                }}
              >
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
                        <th style={thStyle(true)}>Classification</th>
                        <th style={thStyle()}>Total</th>
                        {showDocCols &&
                          visibleDocTypes.map((dt) => (
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
                        const short = classShort(row.type);
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
                              {short !== row.type && (
                                <span
                                  style={{
                                    fontSize: "0.72rem",
                                    color: ui.textMuted,
                                    fontWeight: 400,
                                  }}
                                >
                                  {row.type}
                                </span>
                              )}
                            </td>
                            <td style={tdStyle(ui.textPrimary)}>
                              {row.count > 0 ? (
                                <span
                                  onClick={() => openClassCell(row)}
                                  title="Click to view records"
                                  style={linkSt}
                                >
                                  {row.count.toLocaleString()}
                                </span>
                              ) : (
                                row.count.toLocaleString()
                              )}
                            </td>
                            {showDocCols &&
                              visibleDocTypes.map((dt) => {
                                const n = row.by_doc_type?.[dt] ?? 0;
                                return (
                                  <td
                                    key={dt}
                                    style={tdStyle(docTypeColor(dt))}
                                  >
                                    {n > 0 ? (
                                      <span
                                        onClick={() => openClassCell(row, dt)}
                                        title="Click to view records"
                                        style={linkSt}
                                      >
                                        {n.toLocaleString()}
                                      </span>
                                    ) : (
                                      n.toLocaleString()
                                    )}
                                  </td>
                                );
                              })}
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

                {/* Distribution header + toggle (By Doc only for Completed) */}
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
                  {showDocCols && (
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
                        { key: "classification", label: "By Class" },
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
                  )}
                </div>

                {/* Donut */}
                <PieChart
                  slices={activePieSlices}
                  darkMode={darkMode}
                  ui={ui}
                  onSliceClick={openClassRecords}
                />
              </div>
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
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "0.7rem", color: ui.textMuted }}>
                  {loadingSec.drugs && topDrugsData.length === 0
                    ? ""
                    : drugQuery
                      ? `${filteredDrugs.length.toLocaleString()} of ${topDrugsData.length.toLocaleString()}`
                      : `Top ${topDrugsData.length.toLocaleString()}`}
                </span>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 9,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "0.72rem",
                      pointerEvents: "none",
                    }}
                  >
                    🔍
                  </span>
                  <input
                    type="text"
                    name="drug-search"
                    autoComplete="off"
                    value={drugSearch}
                    onChange={(e) => setDrugSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setDrugSearch("")}
                    placeholder="Search drug or generic…"
                    style={{
                      ...inputSt,
                      width: 200,
                      padding: "6px 26px 6px 28px",
                      fontSize: "0.75rem",
                    }}
                  />
                  {drugSearch && (
                    <button
                      onClick={() => setDrugSearch("")}
                      title="Clear search"
                      style={{
                        position: "absolute",
                        right: 6,
                        top: "50%",
                        transform: "translateY(-50%)",
                        border: "none",
                        background: "transparent",
                        color: ui.textMuted,
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        padding: 2,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
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
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  {/* Header */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: DRUG_GRID,
                      gap: 12,
                      padding: "0 10px 8px",
                      borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                    }}
                  >
                    {[
                      { h: "#", a: "center" },
                      { h: "Drug / Generic", a: "left" },
                      { h: "Breakdown", a: "left" },
                      { h: "Total", a: "center" },
                      { h: "Rate", a: "center" },
                    ].map(({ h, a }) => (
                      <span
                        key={h}
                        style={{
                          fontSize: "0.63rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: ui.textMuted,
                          textAlign: a,
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>

                  {pagedDrugs.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        color: ui.textMuted,
                        fontSize: "0.82rem",
                        padding: "28px 0",
                      }}
                    >
                      No drugs match "{drugSearch.trim()}"
                    </div>
                  )}

                  {pagedDrugs.map((drug, i) => {
                    const rank = drug.rank;
                    const rankColor =
                      rank === 1
                        ? "#f59e0b"
                        : rank === 2
                          ? "#9ca3af"
                          : rank === 3
                            ? "#b45309"
                            : ui.textMuted;
                    const rxShort = drug.rx ? classShort(drug.rx) : "N/A";
                    const rxColor = drug.rx
                      ? classTypeColor(rxShort)
                      : "#9ca3af";

                    const total = Number(drug.total) || 0;
                    const cpr = Number(drug.cpr) || 0;
                    const lod = Number(drug.lod) || 0;
                    const other = Math.max(total - cpr - lod, 0);
                    const widthPct = Math.max((total / maxDrug) * 100, 4);
                    const seg = (n) => `${total > 0 ? (n / total) * 100 : 0}%`;

                    const rate = parseFloat(drug.rate) || 0;
                    const rateColor =
                      rate >= 60 ? "#36a420" : rate > 0 ? "#f59e0b" : "#9ca3af";
                    const hoverBg = darkMode
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.035)";

                    return (
                      <div
                        key={drug.name}
                        onClick={() => setDrugTarget(drug)}
                        title="Click to view drug details"
                        style={{
                          display: "grid",
                          gridTemplateColumns: DRUG_GRID,
                          gap: 12,
                          padding: "11px 10px",
                          borderRadius: 10,
                          alignItems: "center",
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = hoverBg)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        {/* Rank */}
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 800,
                            color: rankColor,
                            textAlign: "center",
                          }}
                        >
                          {rank}
                        </span>

                        {/* Drug + generic */}
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                            }}
                          >
                            <span
                              title={drug.rx || "No classification"}
                              style={{
                                fontSize: "0.6rem",
                                fontWeight: 800,
                                padding: "2px 7px",
                                borderRadius: 99,
                                background: `${rxColor}1f`,
                                color: rxColor,
                                flexShrink: 0,
                              }}
                            >
                              {String(rxShort).slice(0, 7)}
                            </span>
                            <span
                              style={{
                                fontSize: "0.82rem",
                                fontWeight: 700,
                                color: ui.textPrimary,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {drug.name}
                            </span>
                            <span
                              style={{
                                fontSize: "0.8rem",
                                color: ui.textMuted,
                              }}
                            >
                              ›
                            </span>
                          </div>
                          <div
                            title={drug.generic}
                            style={{
                              fontSize: "0.68rem",
                              color: ui.textMuted,
                              marginTop: 3,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {drug.generic || "No generic name"}
                          </div>
                        </div>

                        {/* Stacked breakdown bar (width = share of the top drug) */}
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              height: 7,
                              borderRadius: 99,
                              background: darkMode
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(0,0,0,0.06)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${widthPct}%`,
                                height: "100%",
                                display: "flex",
                                borderRadius: 99,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: seg(cpr),
                                  background: "#36a420",
                                }}
                              />
                              <div
                                style={{
                                  width: seg(lod),
                                  background: "#e02020",
                                }}
                              />
                              <div
                                style={{
                                  width: seg(other),
                                  background: FB,
                                  opacity: 0.85,
                                }}
                              />
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: "0.62rem",
                              color: ui.textMuted,
                              marginTop: 4,
                            }}
                          >
                            <span style={{ color: "#36a420", fontWeight: 700 }}>
                              {cpr.toLocaleString()}
                            </span>{" "}
                            CPR {" · "}
                            <span style={{ color: "#e02020", fontWeight: 700 }}>
                              {lod.toLocaleString()}
                            </span>{" "}
                            LOD {" · "}
                            {other.toLocaleString()} other
                          </div>
                        </div>

                        {/* Total */}
                        <span
                          style={{
                            fontSize: "0.88rem",
                            fontWeight: 800,
                            color: FB,
                            textAlign: "center",
                          }}
                        >
                          {total.toLocaleString()}
                        </span>

                        {/* Rate pill */}
                        <span
                          title="CPR released ÷ total applications"
                          style={{
                            justifySelf: "center",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: 99,
                            color: rateColor,
                            background: `${rateColor}1f`,
                          }}
                        >
                          {rate}%
                        </span>
                      </div>
                    );
                  })}
                </div>
                <Pagination
                  page={drugsPage}
                  totalPages={drugsTotalPages}
                  onPageChange={setDrugsPage}
                  total={filteredDrugs.length}
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
          {(() => {
            const activeEntity = ENTITY_TYPES.find(
              (et) => et.key === topCountryTab,
            );
            const accent = activeEntity?.color || FB;
            const loadingList =
              loadingCountries ||
              (loadingSec.countries && topCountriesData.length === 0);
            const totalApps = topCountriesData.reduce((s, d) => s + d.count, 0);
            const medals = ["🥇", "🥈", "🥉"];
            const hoverBg = darkMode
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.035)";

            const chips = [
              {
                label: "Countries",
                value: topCountriesData.length,
                color: accent,
              },
              { label: "Total Apps", value: totalApps, color: FB },
              {
                label: "#1",
                value: topCountriesData[0]?.country || "—",
                color: "#f59e0b",
              },
              {
                label: "#1 CPR",
                value: topCountriesData[0]?.cpr ?? 0,
                color: "#36a420",
              },
            ];

            return (
              <>
                {/* Tabs + compact stats */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {ENTITY_TYPES.map((et) => {
                      const isAct = topCountryTab === et.key;
                      return (
                        <button
                          key={et.key}
                          onClick={() => setTopCountryTab(et.key)}
                          style={{
                            padding: "4px 11px",
                            fontSize: "0.72rem",
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

                  {!loadingList && topCountriesData.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {chips.map((c) => (
                        <span
                          key={c.label}
                          style={{
                            display: "inline-flex",
                            alignItems: "baseline",
                            gap: 5,
                            padding: "3px 10px",
                            borderRadius: 99,
                            background: `${c.color}14`,
                            fontSize: "0.68rem",
                            color: ui.textMuted,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.label}
                          <b style={{ color: c.color, fontSize: "0.74rem" }}>
                            {typeof c.value === "number"
                              ? c.value.toLocaleString()
                              : c.value}
                          </b>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {loadingList ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 60,
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
                      padding: "20px 0",
                    }}
                  >
                    No country data available
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        columnGap: 18,
                        rowGap: 2,
                      }}
                    >
                      {pagedCountries.map((d, i) => {
                        const rank =
                          (countryPage - 1) * COUNTRIES_PAGE_SIZE + i + 1;
                        const flag = COUNTRY_FLAGS[d.country] || "🌐";
                        const count = Number(d.count) || 0;
                        const cpr = Number(d.cpr) || 0;
                        const lod = Number(d.lod) || 0;
                        const other = Math.max(count - cpr - lod, 0);
                        const widthPct = Math.max(
                          (count / maxCountry) * 100,
                          4,
                        );
                        const seg = (n) =>
                          `${count > 0 ? (n / count) * 100 : 0}%`;
                        return (
                          <div
                            key={d.country}
                            onClick={() => openCountryRecords(d)}
                            title={`View ${d.country} applications`}
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "26px 20px minmax(90px, 1.2fr) minmax(60px, 1fr) 52px 40px",
                              alignItems: "center",
                              gap: 8,
                              padding: "6px 8px",
                              borderRadius: 8,
                              cursor: "pointer",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = hoverBg)
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <span
                              style={{
                                fontSize: rank <= 3 ? "0.85rem" : "0.7rem",
                                fontWeight: 800,
                                color: ui.textMuted,
                                textAlign: "center",
                              }}
                            >
                              {rank <= 3 ? medals[rank - 1] : rank}
                            </span>
                            <span style={{ fontSize: "0.95rem" }}>{flag}</span>
                            <span
                              style={{
                                fontSize: "0.76rem",
                                fontWeight: 600,
                                color: ui.textPrimary,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {d.country}
                            </span>
                            <div
                              title={`${cpr.toLocaleString()} CPR · ${lod.toLocaleString()} LOD · ${other.toLocaleString()} other`}
                              style={{
                                height: 6,
                                borderRadius: 99,
                                background: darkMode
                                  ? "rgba(255,255,255,0.06)"
                                  : "rgba(0,0,0,0.06)",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${widthPct}%`,
                                  height: "100%",
                                  display: "flex",
                                  borderRadius: 99,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: seg(cpr),
                                    background: "#36a420",
                                  }}
                                />
                                <div
                                  style={{
                                    width: seg(lod),
                                    background: "#e02020",
                                  }}
                                />
                                <div
                                  style={{
                                    width: seg(other),
                                    background: accent,
                                    opacity: 0.85,
                                  }}
                                />
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: "0.78rem",
                                fontWeight: 800,
                                color: accent,
                                textAlign: "right",
                              }}
                            >
                              {count.toLocaleString()}
                            </span>
                            <span
                              title="CPR released"
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                color: "#36a420",
                                textAlign: "right",
                              }}
                            >
                              {cpr.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        marginTop: 8,
                        fontSize: "0.62rem",
                        color: ui.textMuted,
                      }}
                    >
                      <span>
                        <b style={{ color: "#36a420" }}>■</b> CPR
                      </span>
                      <span>
                        <b style={{ color: "#e02020" }}>■</b> LOD
                      </span>
                      <span>
                        <b style={{ color: accent }}>■</b> Other
                      </span>
                      <span style={{ marginLeft: "auto" }}>
                        Total · CPR on the right. Click a row to view records
                      </span>
                    </div>

                    <Pagination
                      page={countryPage}
                      totalPages={countriesTotalPages}
                      onPageChange={setCountryPage}
                      total={topCountriesData.length}
                      pageSize={COUNTRIES_PAGE_SIZE}
                    />
                  </>
                )}
              </>
            );
          })()}
        </SectionCard>
      </FadeSlideIn>

      {showExportPdf && (
        <ExportPdfModal
          ui={ui}
          darkMode={darkMode}
          data={{
            summary,
            trendData,
            trendYear,
            yearSummaryData,
            docTypeData,
            classificationData,
            classDocTypes,
            topDrugsData,
            topCountriesData,
            topCountryLabel: ENTITY_TYPES.find((et) => et.key === topCountryTab)
              ?.label,
            qualityData,
            lastUpdated,
          }}
          onClose={() => setShowExportPdf(false)}
        />
      )}

      {showInProgress && (
        <InProgressByUserModal
          ui={ui}
          darkMode={darkMode}
          expectedTotal={summary.in_progress}
          onClose={() => setShowInProgress(false)}
        />
      )}
      {drugTarget && (
        <DrugDetailModal
          drug={drugTarget}
          scope={{ year: chartYear, month: chartMonth, prescription: rxFilter }}
          ui={ui}
          darkMode={darkMode}
          onClose={() => setDrugTarget(null)}
        />
      )}

      {recordsTarget && (
        <YearRecordsModal
          target={recordsTarget}
          basis={yearBasis}
          ui={ui}
          darkMode={darkMode}
          onClose={() => {
            if (recordsTarget?.quality) fetchQuality();
            setRecordsTarget(null);
          }}
        />
      )}
    </div>
  );
}
