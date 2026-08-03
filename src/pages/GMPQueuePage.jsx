// src/pages/GMPQueuePage.jsx
// GMP Queue — Decker view. Owns all state, data fetching, and modals.
import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { getGMPRecords, getGMPFilterCounts, downloadGMPTemplate } from "../api/gmp";
import { getColorScheme } from "../components/gmp/shared/colorScheme";
import { TopTabs, QuickFilterSidebar } from "../components/gmp/queue/QueueFilters";
import QueueTable from "../components/gmp/queue/QueueTable";
import DeckModal from "../components/gmp/queue/GMPDeckModal";
import BulkDeckModal from "../components/gmp/queue/GMPBulkDeckModal";
import UploadModal from "../components/gmp/queue/UploadModal";
import AppLogModal from "../components/gmp/tasks/AppLogModal";
import FieldAuditModal from "../components/gmp/tasks/FieldAuditModal";
import DoctrackModal from "../components/reports/actions/DoctrackModal";
import GMPReassignmentModal from "../components/gmp/queue/GMPReassignmentModal";
import GMPRerouteModal from "../components/gmp/queue/GMPRerouteModal";
import GMPApplicationInfoModal from "../components/gmp/queue/GMPApplicationInfoModal";
import { FONT } from "../components/gmp/shared/constants";

const ACCENT = "#6366f1";

// NOTE: "Update Application Info" is intentionally omitted — GMP has no
// record-edit modal yet. Add it here once one exists.
const DBL_CLICK_OPTIONS = [
  { value: "viewInfo", label: "Application Information", icon: "👁️" },
  { value: "appLog",   label: "Application Logs",         icon: "📋" },
  { value: "auditLog", label: "Field Audit Logs",         icon: "🕐" },
  { value: "doctrack", label: "Doctrack Details",        icon: "📋" },
];

const ADV_DEFAULTS = {
  related_dtn: "", transaction_type: "all", est_category: "all", lto_company: "",
  uploaded_by: "", upload_date_from: "", upload_date_to: "",
  date_received_from: "", date_received_to: "",
};

const QUICK_LABEL_MAP = {
  app_status: "Application Status", est_category: "Category", transaction_type: "Transaction Type",
  type_of_issuance: "Issuance Type",
};

const ADV_LABEL_MAP = {
  related_dtn: "Related DTN", transaction_type: "Entry Type", est_category: "Est. Category",
  lto_company: "LTO Company", uploaded_by: "Uploaded By",
  upload_date_from: "Upload From", upload_date_to: "Upload To",
  date_received_from: "Received From", date_received_to: "Received To",
};

// Strips time from any date/datetime string, keeping only YYYY-MM-DD.
// Handles ISO timestamps ("2026-07-15T10:23:00"), "2026-07-15 10:23:00",
// and plain dates ("2026-07-15") — returns the value unchanged if it's not a date-like string.
function dateOnly(value) {
  if (!value) return value;
  const str = String(value);
  const match = str.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : str;
}

// Formats a timestamp into "YYYY-MM-DD, h:mm AM/PM" for display.
// The backend sends naive timestamps that already represent Philippine wall-
// clock time (see _now() in app/crud/gmp_record.py) — parsed through `Date`,
// that string gets reinterpreted in the *viewer's browser* timezone, which
// silently shifts the displayed time for anyone not in PHT. Reading the
// digits straight off the string instead keeps it exact for every viewer.
// Falls back to the raw value if it can't be parsed as a date.
function dateWithTime(value) {
  if (!value) return value;
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) return value;
  const [, datePart, hh, mm] = match;
  const h = parseInt(hh, 10);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${datePart}, ${h12}:${mm} ${period}`;
}

// Map API response (GMP_* fields) → flat camelCase for the table
function mapGMPRecord(r) {
  return {
    id:                          r.GMP_ID,
    dtn:                         r.GMP_DTN ? String(r.GMP_DTN) : null,
    reference_no:                r.GMP_REFERENCE_NO ?? null,
    related_dtn:                 r.GMP_RELATED_DTN,
    date_received:               dateOnly(r.GMP_DATE_RECEIVED),
    name_of_establishment:       r.GMP_LTO_COMPANY,
    lto_number:                  r.GMP_LTO_NUMBER,
    address:                     r.GMP_LTO_ADDRESS,
    transaction_type:            r.GMP_TRANSACTION_TYPE,
    category:                    r.GMP_EST_CATEGORY,
    foreign_manufacturer:        r.GMP_FOREIGN_MANUFACTURER,
    foreign_manufacturer_address:r.GMP_FOREIGN_MANUFACTURER_ADDRESS,
    secpa_number:                r.GMP_SECPA_NUMBER,
    certificate_number:          r.GMP_CERTIFICATE_NUMBER,
    type_of_issuance:            r.GMP_TYPE_OF_ISSUANCE,
    certificate_validity:        dateOnly(r.GMP_CERTIFICATE_VALIDITY),
    decision:                    r.GMP_DECISION,
    status:                      r.GMP_APP_STATUS,
    released_date:               dateOnly(r.GMP_RELEASED_DATE),
    processed_time:              r.GMP_PROCESSED_TIME,
    end_date:                    dateOnly(r.GMP_END_DATE),
    timeline:                    r.GMP_TIMELINE,
    remarks:                     r.GMP_REMARKS,
    nod_date_1:                  dateOnly(r.GMP_NOD_DATE_1),
    nod_date_2:                  dateOnly(r.GMP_NOD_DATE_2),
    nod_date_3:                  dateOnly(r.GMP_NOD_DATE_3),
    nod_date_4:                  dateOnly(r.GMP_NOD_DATE_4),
    nod_date_5:                  dateOnly(r.GMP_NOD_DATE_5),
    date_printed:                dateOnly(r.GMP_DATE_PRINTED),
    compliance_docs_date_received: dateOnly(r.GMP_COMPLIANCE_DOCS_DATE_RECEIVED),
    product_line:                r.GMP_PRODUCT_LINE,
    uploaded_date:                dateWithTime(r.GMP_DATE_EXCEL_UPLOAD),
    uploaded_by:                  r.GMP_USER_UPLOADER,
    evaluator:                   r.GMP_EVALUATOR,
    current_step:                r.GMP_CURRENT_STEP,
    is_decked:                   r.GMP_CURRENT_STEP !== null,
    lto_company:                 r.GMP_LTO_COMPANY,
    // Every sibling reference number under this DTN (Add Issuance), each
    // with its own issuance details — only populated in Main (per-DTN) view.
    all_issuances: (r.all_issuances ?? []).map((s) => ({
      reference_no:         s.reference_no,
      type_of_issuance:     s.type_of_issuance,
      certificate_number:   s.certificate_number,
      certificate_validity: dateOnly(s.certificate_validity),
      secpa_number:         s.secpa_number,
    })),
  };
}

function Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange, colors }) {
  const opts = [25, 50, 100, 200];
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 14px", borderTop: `1px solid ${colors.cardBorder}`,
      flexShrink: 0, flexWrap: "wrap", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: "0.7rem", color: colors.textTertiary }}>Rows per page:</span>
        <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{
            fontSize: "0.74rem", fontFamily: FONT, borderRadius: 6,
            border: `1px solid ${colors.cardBorder}`, background: "transparent",
            color: colors.textTertiary, padding: "3px 6px", cursor: "pointer",
          }}>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: "0.7rem", color: colors.textTertiary }}>
          Page <strong>{page}</strong> of <strong>{totalPages}</strong>
        </span>
        <div style={{ display: "flex", gap: 3 }}>
          {[
            { label: "«", to: 1,          dis: page === 1 },
            { label: "‹", to: page - 1,   dis: page === 1 },
            { label: "›", to: page + 1,   dis: page === totalPages },
            { label: "»", to: totalPages, dis: page === totalPages },
          ].map((b) => (
            <button key={b.label} onClick={() => !b.dis && onPageChange(b.to)}
              disabled={b.dis}
              style={{
                width: 28, height: 28, borderRadius: 6, border: `1px solid ${colors.cardBorder}`,
                background: "transparent", color: colors.textTertiary,
                cursor: b.dis ? "not-allowed" : "pointer", opacity: b.dis ? 0.35 : 1,
                fontSize: "0.82rem", fontFamily: FONT,
              }}>
              {b.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: "0.7rem", color: colors.textTertiary }}>
          {total > 0 ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total.toLocaleString()}` : "0 records"}
        </span>
      </div>
    </div>
  );
}

const advInputSt = (colors) => ({
  width: "100%", padding: "7px 10px", fontSize: "0.76rem",
  fontFamily: FONT, borderRadius: 7, border: `1px solid ${colors.cardBorder}`,
  background: colors.inputBg, color: colors.textPrimary, outline: "none",
  boxSizing: "border-box",
});
const advLabelSt = (colors) => ({
  fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.05em", color: colors.textTertiary,
  marginBottom: 4, display: "block",
});

function AdvancedFilterModal({ open, draft, onChange, onApply, onCancel, onReset, sidebarFilters, colors, darkMode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const set = (key, val) => onChange((prev) => ({ ...prev, [key]: val }));

  // Pulls live option lists from the same sidebar filter data (getGMPFilterCounts),
  // so new categories/entry types that appear in the data show up here automatically.
  const getOptions = (groupKey) => {
    const group = (sidebarFilters ?? []).find((g) => g.key === groupKey);
    return group ? group.items.filter((i) => i.value !== "all") : [];
  };

  const fields = [
    { key: "related_dtn",      label: "Related DTN",  type: "text",   placeholder: "Enter related DTN" },
    { key: "transaction_type", label: "Entry Type",   type: "select", options: getOptions("transaction_type") },
    { key: "est_category",     label: "Est. Category",type: "select", options: getOptions("est_category") },
    { key: "lto_company",      label: "LTO Company",  type: "text",   placeholder: "Search LTO company" },
    { key: "uploaded_by",      label: "Uploaded By",  type: "text",   placeholder: "Search uploader name" },
    { key: "upload_date_from", label: "Upload Date From", type: "date" },
    { key: "upload_date_to",   label: "Upload Date To",   type: "date" },
    { key: "date_received_from", label: "Date Received From", type: "date" },
    { key: "date_received_to",   label: "Date Received To",   type: "date" },
  ];

  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(15,23,42,0.45)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "64px 20px", overflowY: "auto",
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 920,
          background: darkMode ? "#1e2022" : "#ffffff",
          borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}>
        {/* Header */}
        <div style={{
          padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${colors.cardBorder}`,
        }}>
          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: colors.textPrimary }}>
            ⚙️ Advanced Filters
          </span>
          <button onClick={onCancel}
            style={{
              width: 28, height: 28, borderRadius: 7, border: `1px solid ${colors.cardBorder}`,
              background: "transparent", color: colors.textTertiary, cursor: "pointer",
              fontSize: "0.9rem",
            }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 20px", maxHeight: "70vh", overflowY: "auto" }}>
          <div style={{
            fontSize: "0.62rem", fontWeight: 800, textTransform: "uppercase",
            letterSpacing: "0.06em", color: colors.textTertiary, marginBottom: 12,
          }}>
            General Filters
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
          }}>
            {fields.map((f) => (
              <div key={f.key}>
                <label style={advLabelSt(colors)}>{f.label}</label>
                {f.type === "select" ? (
                  <select
                    value={draft[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                    style={{ ...advInputSt(colors), cursor: "pointer" }}>
                    <option value="all">All {f.label}</option>
                    {f.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} ({(opt.count ?? 0).toLocaleString()})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    value={draft[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.key, e.target.value)}
                    style={advInputSt(colors)}
                  />
                )}
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 14, padding: "8px 12px", borderRadius: 8,
            background: darkMode ? "rgba(255,255,255,0.03)" : "#f1f5f9",
            fontSize: "0.72rem", color: colors.textTertiary,
          }}>
            💡 Tip: Use the sidebar for Status, Category, Transaction Type, and Issuance filters.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
          borderTop: `1px solid ${colors.cardBorder}`,
          background: darkMode ? "rgba(255,255,255,0.02)" : "#fafbfc",
        }}>
          <button onClick={onReset}
            style={{
              padding: "8px 14px", fontSize: "0.74rem", fontWeight: 600,
              fontFamily: FONT, borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
              background: "transparent", color: colors.textTertiary, cursor: "pointer",
            }}>
            Reset
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onCancel}
              style={{
                padding: "9px 16px", fontSize: "0.78rem", fontWeight: 600,
                fontFamily: FONT, borderRadius: 9, border: `1px solid ${colors.cardBorder}`,
                background: "transparent", color: colors.textPrimary, cursor: "pointer",
              }}>
              Cancel
            </button>
            <button onClick={onApply}
              style={{
                padding: "9px 20px", fontSize: "0.8rem", fontWeight: 700,
                fontFamily: FONT, borderRadius: 9, border: "none",
                background: "linear-gradient(135deg,#4CAF50,#43a047)",
                color: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 3px 10px rgba(76,175,80,0.4)",
              }}>
              🔍 Apply Filters & Search
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function FilterChip({ label, onRemove, colors, darkMode }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 8px 3px 10px", borderRadius: 99,
      background: darkMode ? "rgba(99,102,241,0.15)" : "#eef0fe",
      border: `1px solid ${ACCENT}30`,
      fontSize: "0.68rem", fontWeight: 600, color: ACCENT,
      whiteSpace: "nowrap",
    }}>
      {label}
      <button
        onClick={onRemove}
        title="Remove filter"
        style={{
          width: 14, height: 14, borderRadius: "50%", border: "none",
          background: `${ACCENT}25`, color: ACCENT, cursor: "pointer",
          fontSize: "0.6rem", lineHeight: 1, display: "flex",
          alignItems: "center", justifyContent: "center", padding: 0,
        }}>
        ✕
      </button>
    </span>
  );
}

function ActiveFiltersNotice({ activeQuick, advFilters, onRemoveQuick, onRemoveAdv, onClearAll, colors, darkMode }) {
  const quickChips = Object.entries(activeQuick)
    .filter(([, v]) => v && v !== "all")
    .map(([key, val]) => ({ key, label: `${QUICK_LABEL_MAP[key] ?? key}: ${val}`, source: "quick" }));

  const advChips = Object.entries(advFilters)
    .filter(([key, v]) => v && v !== ADV_DEFAULTS[key])
    .map(([key, val]) => ({ key, label: `${ADV_LABEL_MAP[key] ?? key}: ${val}`, source: "adv" }));

  const chips = [...quickChips, ...advChips];
  if (chips.length === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{
        fontSize: "0.64rem", fontWeight: 700, color: colors.textTertiary,
        textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0,
      }}>
        Active filters ({chips.length}):
      </span>
      {chips.map((c) => (
        <FilterChip
          key={`${c.source}-${c.key}`}
          label={c.label}
          onRemove={() => c.source === "quick" ? onRemoveQuick(c.key) : onRemoveAdv(c.key)}
          colors={colors} darkMode={darkMode}
        />
      ))}
      <button
        onClick={onClearAll}
        style={{
          fontSize: "0.66rem", fontWeight: 700, color: "#ef4444",
          background: "transparent", border: "none", cursor: "pointer",
          padding: "2px 4px", textDecoration: "underline", flexShrink: 0,
        }}>
        Clear all
      </button>
    </div>
  );
}

export default function GMPQueuePage({ darkMode = false }) {
  const colors = getColorScheme(darkMode);

  const [rows,           setRows]           = useState([]);
  const [total,          setTotal]          = useState(0);
  const [totalPages,     setTotalPages]     = useState(1);
  const [page,           setPage]           = useState(1);
  const [pageSize,       setPageSize]       = useState(100);
  const [loading,        setLoading]        = useState(true);
  const [counts,         setCounts]         = useState({ all: 0, not_yet_decked: 0, decked: 0 });
  const [sidebarFilters, setSidebarFilters] = useState([]);
  const [activeQuick,    setActiveQuick]    = useState({
    app_status:       "all",
    est_category:     "all",
    transaction_type: "all",
    type_of_issuance: "all",
  });
  const [topTab,         setTopTab]         = useState("all");
  // Main = one row per DTN, with every sibling reference no./issuance type
  // rolled up onto that row. All = the original behavior — every reference
  // number (including Add Issuance siblings) as its own separate row.
  const [view,           setView]           = useState("main");
  // Only meaningful in "main" (Per DTN) view — flags DTNs whose own
  // reference-number family (primary + Add-Issuance siblings) has a genuine
  // data-entry duplicate: two records sharing the same Type of Issuance.
  const [duplicatesOnly, setDuplicatesOnly] = useState(false);
  const [searchInput,    setSearchInput]    = useState("");
  const [search,         setSearch]         = useState("");
  const [showAdvanced,   setShowAdvanced]   = useState(false);
  const [advFilters,     setAdvFilters]     = useState(ADV_DEFAULTS);
  const [advDraft,       setAdvDraft]       = useState(ADV_DEFAULTS);
  const [selected,       setSelected]       = useState([]);
  const [collapsed,      setCollapsed]      = useState(false);
  const [sortBy,         setSortBy]         = useState("GMP_DATE_EXCEL_UPLOAD");
  const [sortOrder,      setSortOrder]      = useState("desc");
  const [dblClickAction, setDblClickAction] = useState(
    () => localStorage.getItem("gmpQueueDblClickAction") || "viewInfo"
  );
  const [showDblClickConfig, setShowDblClickConfig] = useState(false);

  // Modals
  const [logRecord,     setLogRecord]     = useState(null);
  const [auditRecord,   setAuditRecord]   = useState(null);
  const [doctrackRecord,setDoctrackRecord]= useState(null);
  const [showUpload,   setShowUpload]   = useState(false);
  const [deckRecord,   setDeckRecord]   = useState(null);   // single deck
  const [bulkDeckRows, setBulkDeckRows] = useState(null);   // bulk deck
  const [reassignRecord, setReassignRecord] = useState(null);
  const [rerouteRecord,  setRerouteRecord]  = useState(null);
  const [infoRecord, setInfoRecord] = useState(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load sidebar filter counts — tab-scoped so each group's numbers match
  // what clicking it on the currently active tab actually returns (see
  // /gmp/filter-counts, which now takes the same `tab` param as the record
  // list itself).
  const loadFilterCounts = useCallback(async () => {
    try {
      const data = await getGMPFilterCounts(topTab, view);
      setSidebarFilters(data.groups ?? []);
      setCounts({ all: data.total ?? 0, not_yet_decked: data.not_yet_decked ?? 0, decked: data.decked ?? 0 });
    } catch (e) {
      console.error("Failed to load GMP filter counts", e);
    }
  }, [topTab, view]);

  useEffect(() => { loadFilterCounts(); }, [loadFilterCounts]);

  // Load records
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        sort_by:   sortBy,
        sort_order: sortOrder,
        ...(search && { search }),
        ...(topTab !== "all" && { tab: topTab }),
        ...(view !== "all" && { view }),
        ...(view === "main" && duplicatesOnly && { duplicates_only: true }),
        ...(activeQuick.app_status       && activeQuick.app_status       !== "all" && { app_status:       activeQuick.app_status }),
        ...(activeQuick.est_category     && activeQuick.est_category     !== "all" && { est_category:     activeQuick.est_category }),
        ...(activeQuick.transaction_type && activeQuick.transaction_type !== "all" && { transaction_type: activeQuick.transaction_type }),
        ...(activeQuick.type_of_issuance && activeQuick.type_of_issuance !== "all" && { type_of_issuance: activeQuick.type_of_issuance }),
        ...(advFilters.related_dtn && { related_dtn: advFilters.related_dtn }),
        ...(advFilters.transaction_type !== "all" && { transaction_type: advFilters.transaction_type }),
        ...(advFilters.est_category !== "all" && { est_category: advFilters.est_category }),
        ...(advFilters.lto_company && { lto_company: advFilters.lto_company }),
        ...(advFilters.uploaded_by && { uploaded_by: advFilters.uploaded_by }),
        ...(advFilters.upload_date_from && { upload_date_from: advFilters.upload_date_from }),
        ...(advFilters.upload_date_to && { upload_date_to: advFilters.upload_date_to }),
        ...(advFilters.date_received_from && { date_received_from: advFilters.date_received_from }),
        ...(advFilters.date_received_to && { date_received_to: advFilters.date_received_to }),
      };
      const data = await getGMPRecords(params);
      setRows((data.data ?? []).map(mapGMPRecord));
      setTotal(data.total ?? 0);
      setTotalPages(data.total_pages ?? 1);
    } catch (e) {
      console.error("Failed to load GMP records", e);
      setRows([]); setTotal(0); setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, topTab, view, duplicatesOnly, activeQuick, advFilters, sortBy, sortOrder]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleSidebarSelect = (key, value) => {
    setActiveQuick((prev) => ({
      ...prev,
      // Clicking the already-active item or "All" resets to "all"
      // Clicking a different item selects it (radio behaviour — 1 per group)
      [key]: prev[key] === value || value === "all" ? "all" : value,
    }));
    // est_category/transaction_type also exist as Advanced filter fields —
    // an Advanced value silently overrides the same key in fetchRecords'
    // param spread, so a sidebar click here would highlight as active but
    // have no effect on the actual results unless the Advanced value is
    // cleared too (mirrors what applyAdvanced does in the other direction).
    if (key === "est_category" || key === "transaction_type") {
      setAdvFilters((prev) => ({ ...prev, [key]: "all" }));
    }
    setPage(1);
  };

  const openAdvanced   = () => { setAdvDraft(advFilters); setShowAdvanced(true); };
  const applyAdvanced = () => {
    setAdvFilters(advDraft);
    // If the advanced modal set a value that overlaps a sidebar quick filter,
    // turn the quick filter off so the two don't silently conflict.
    setActiveQuick((prev) => ({
      ...prev,
      ...(advDraft.est_category     !== "all" && { est_category: "all" }),
      ...(advDraft.transaction_type !== "all" && { transaction_type: "all" }),
    }));
    setShowAdvanced(false);
    setPage(1);
  };
  const cancelAdvanced = () => setShowAdvanced(false);
  const resetAdvanced  = () => setAdvDraft(ADV_DEFAULTS);

  const removeQuickFilter = (key) => handleSidebarSelect(key, "all");
  const removeAdvFilter   = (key) => {
    setAdvFilters((prev) => ({ ...prev, [key]: ADV_DEFAULTS[key] }));
    setPage(1);
  };
  const clearAllFilters = () => {
    setActiveQuick({
      app_status: "all", est_category: "all", transaction_type: "all",
      type_of_issuance: "all",
    });
    setAdvFilters(ADV_DEFAULTS);
    setPage(1);
  };

  const handleSelect    = (id, checked) => setSelected((p) => checked ? [...p, id] : p.filter((x) => x !== id));
  const handleSelectAll = (checked) => setSelected(checked ? rows.map((r) => r.id) : []);

  const handleDoubleClickRow = (row) => {
    switch (dblClickAction) {
      case "viewInfo": setInfoRecord(row); return;
      case "appLog":   setLogRecord(row);  return;
      case "auditLog": setAuditRecord(row); return;
      case "doctrack": setDoctrackRecord(row); return;
      default: return;
    }
  };

  const activeFilterCount = Object.values(activeQuick).filter((v) => v && v !== "all").length;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: FONT,
      background: colors.pageBg, color: colors.textPrimary }}>

      {/* Sidebar */}
      <QuickFilterSidebar
        filters={sidebarFilters} active={activeQuick}
        onSelect={handleSidebarSelect} collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        colors={colors} darkMode={darkMode} />

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{
          padding: "10px 18px", borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 10, background: colors.cardBg, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <TopTabs active={topTab} onChange={(v) => { setTopTab(v); setPage(1); setSelected([]); }}
              counts={counts} colors={colors} />

            {/* Main = one row per DTN (siblings rolled up); All = every
                reference number as its own row — the original behavior. */}
            <div style={{
              display: "flex", gap: 2, padding: 2, borderRadius: 9,
              background: darkMode ? "rgba(255,255,255,0.05)" : "#f1f5f9",
            }}>
              {[
                { id: "main", label: "Per DTN", icon: "🏢" },
                { id: "all", label: "All References", icon: "📚" },
              ].map((v) => {
                const isActive = view === v.id;
                return (
                  <button key={v.id}
                    onClick={() => { setView(v.id); if (v.id !== "main") setDuplicatesOnly(false); setPage(1); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 11px", fontSize: "0.73rem", fontWeight: isActive ? 700 : 500,
                      fontFamily: FONT, border: "none", borderRadius: 7, cursor: "pointer",
                      background: isActive ? colors.cardBg : "transparent",
                      color: isActive ? colors.textPrimary : colors.textTertiary,
                      boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                      transition: "all 0.15s",
                    }}>
                    {v.icon} {v.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {/* Download Template */}
            <button
              onClick={async () => {
                try {
                  await downloadGMPTemplate();
                } catch (e) {
                  alert("Failed to download template. Check that the backend is running.");
                }
              }}
              style={{
                padding: "7px 13px", fontSize: "0.75rem", fontWeight: 600,
                fontFamily: FONT, borderRadius: 8,
                border: `1px solid ${colors.cardBorder}`,
                background: "transparent", color: colors.textPrimary,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              }}
            >
              📥 Download Template
            </button>

            {/* Upload New Report */}
            <button
              onClick={() => setShowUpload(true)}
              style={{
                padding: "7px 14px", fontSize: "0.75rem", fontWeight: 700,
                fontFamily: FONT, borderRadius: 8, border: "none",
                background: ACCENT, color: "#fff",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                boxShadow: `0 2px 8px ${ACCENT}44`,
              }}
            >
              📤 Upload New Report
            </button>

            {/* Refresh */}
            <button onClick={() => { fetchRecords(); loadFilterCounts(); }}
              style={{
                padding: "7px 13px", fontSize: "0.75rem", fontWeight: 600,
                fontFamily: FONT, borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
                background: "transparent", color: colors.textTertiary, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
              }}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Search row */}
        <div style={{
          padding: "10px 18px", borderBottom: `1px solid ${colors.cardBorder}`,
          background: colors.cardBg, flexShrink: 0,
          display: "flex", gap: 10, alignItems: "center",
        }}>
          <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
            <span style={{
              position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
              color: colors.textTertiary, fontSize: "0.82rem", pointerEvents: "none",
            }}>
              🔍
            </span>
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by DTN, company, certificate number…"
              style={{
                width: "100%", padding: "8px 12px 8px 34px", fontSize: "0.78rem",
                fontFamily: FONT, borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
                background: colors.inputBg, color: colors.textPrimary, outline: "none",
                boxSizing: "border-box",
              }} />
          </div>

          {/* Advanced toggle — opens modal, doesn't push page content */}
          <button
            onClick={openAdvanced}
            style={{
              padding: "8px 14px", fontSize: "0.75rem", fontWeight: 700,
              fontFamily: FONT, borderRadius: 8, border: "none",
              background: "#4CAF50",
              color: "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              boxShadow: "0 2px 8px rgba(76,175,80,0.35)",
            }}>
            ⚙️ Advanced
          </button>
        </div>

        {/* Record count */}
        <div style={{
          padding: "8px 18px", borderBottom: `1px solid ${colors.cardBorder}`,
          background: colors.cardBg, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: colors.textPrimary, flexShrink: 0 }}>
              GMP Records{" "}
              <span style={{ color: colors.textTertiary, fontWeight: 400 }}>
                {total.toLocaleString()} total
              </span>
            </span>
            <ActiveFiltersNotice
              activeQuick={activeQuick}
              advFilters={advFilters}
              onRemoveQuick={removeQuickFilter}
              onRemoveAdv={removeAdvFilter}
              onClearAll={clearAllFilters}
              colors={colors} darkMode={darkMode}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Duplicates filter — only meaningful in Per DTN view, since
                that's where a DTN's own sibling family (all_issuances) is
                visible on one row. Resets whenever the user leaves that view. */}
            {view === "main" && (
              <button
                onClick={() => { setDuplicatesOnly((v) => !v); setPage(1); }}
                title="Show only DTNs with a duplicate Type of Issuance among their reference numbers"
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 11px", fontSize: "0.72rem", fontWeight: duplicatesOnly ? 700 : 500,
                  fontFamily: FONT, borderRadius: 7, cursor: "pointer",
                  border: `1px solid ${duplicatesOnly ? "#ef4444" : colors.cardBorder}`,
                  background: duplicatesOnly ? "rgba(239,68,68,0.12)" : "transparent",
                  color: duplicatesOnly ? "#ef4444" : colors.textTertiary, flexShrink: 0,
                }}>
                🔁 Duplicates
              </button>
            )}

            {/* Double-click config — sits above the Actions column */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowDblClickConfig((v) => !v)}
                title="Configure double-click action"
                style={{
                  padding: "4px 9px", fontSize: "0.66rem", fontWeight: 600,
                  fontFamily: FONT, borderRadius: 6,
                  border: `1px solid ${showDblClickConfig ? "#4CAF50" : colors.cardBorder}`,
                  background: showDblClickConfig ? "rgba(76,175,80,0.1)" : "transparent",
                  color: showDblClickConfig ? "#4CAF50" : colors.textTertiary,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                ⚙️ Double-click{" "}
                <span style={{ fontSize: "0.76rem" }}>
                  {DBL_CLICK_OPTIONS.find((o) => o.value === dblClickAction)?.icon}
                </span>
              </button>

              {showDblClickConfig && (
                <>
                  <div onClick={() => setShowDblClickConfig(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 9997 }} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0,
                    background: colors.cardBg, border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                    minWidth: 220, zIndex: 9998, overflow: "hidden",
                  }}>
                    <div style={{
                      padding: "8px 14px", fontSize: "0.6rem", fontWeight: 700,
                      color: colors.textTertiary, textTransform: "uppercase",
                      letterSpacing: "0.08em", borderBottom: `1px solid ${colors.cardBorder}`,
                    }}>
                      Double-click opens...
                    </div>
                    {DBL_CLICK_OPTIONS.map((opt) => (
                      <button key={opt.value}
                        onClick={() => {
                          setDblClickAction(opt.value);
                          localStorage.setItem("gmpQueueDblClickAction", opt.value);
                          setShowDblClickConfig(false);
                        }}
                        style={{
                          width: "100%", padding: "9px 14px",
                          background: dblClickAction === opt.value ? "#4CAF5018" : "transparent",
                          border: "none", borderTop: `1px solid ${colors.cardBorder}`,
                          color: dblClickAction === opt.value ? "#4CAF50" : colors.textPrimary,
                          fontSize: "0.78rem", textAlign: "left", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 8,
                          fontWeight: dblClickAction === opt.value ? 700 : 400,
                        }}
                        onMouseEnter={(e) => { if (dblClickAction !== opt.value) e.currentTarget.style.background = colors.badgeBg; }}
                        onMouseLeave={(e) => { if (dblClickAction !== opt.value) e.currentTarget.style.background = "transparent"; }}>
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                        {dblClickAction === opt.value && <span style={{ marginLeft: "auto" }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {selected.length > 0 && topTab === "not_yet_decked" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontSize: "0.78rem", fontWeight: 700, color: "#2e7d32",
                background: "rgba(76,175,80,0.12)",
                border: "1px solid rgba(76,175,80,0.3)",
                padding: "6px 14px", borderRadius: 99,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                ✔ {selected.length} selected
              </span>
              <button
                onClick={() => setBulkDeckRows(rows.filter(r => selected.includes(r.id)))}
                style={{
                  padding: "8px 18px", fontSize: "0.8rem", fontWeight: 700,
                  fontFamily: FONT, borderRadius: 10, cursor: "pointer",
                  border: "none",
                  background: "linear-gradient(135deg,#4CAF50,#43a047)",
                  color: "#fff", display: "flex", alignItems: "center", gap: 7,
                  boxShadow: "0 3px 10px rgba(76,175,80,0.4)",
                  transition: "transform 0.12s, box-shadow 0.12s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 5px 14px rgba(76,175,80,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 3px 10px rgba(76,175,80,0.4)";
                }}>
                🎯 Deck Applications
              </button>
            </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: colors.cardBg }}>
          <QueueTable
            rows={rows} loading={loading} selected={selected}
            onSelect={handleSelect} onSelectAll={handleSelectAll}
            onOpenLog={(r) => setLogRecord(r)}
            onOpenAudit={(r) => setAuditRecord(r)}
            onOpenDoctrack={(r) => setDoctrackRecord(r)}
            onDeck={(r) => setDeckRecord(r)}
            onBulkDeck={(recs) => setBulkDeckRows(recs)}
            topTab={topTab}
            colors={colors} darkMode={darkMode} page={page} pageSize={pageSize}
            onOpenReassign={(r) => setReassignRecord(r)}
            onOpenReroute={(r) => setRerouteRecord(r)}
            onOpenInfo={(r) => setInfoRecord(r)}
            onDoubleClickRow={handleDoubleClickRow}
          />
          <Pagination
            page={page} totalPages={totalPages} total={total} pageSize={pageSize}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(ps) => { setPageSize(ps); setPage(1); }}
            colors={colors}
          />
        </div>
      </div>

      {/* Modals */}
      {logRecord && (
        <AppLogModal record={logRecord} onClose={() => setLogRecord(null)}
          colors={colors} darkMode={darkMode} />
      )}
      {auditRecord && (
        <FieldAuditModal record={auditRecord} onClose={() => setAuditRecord(null)}
          colors={colors} darkMode={darkMode} />
      )}
      {deckRecord && (
        <DeckModal
          record={deckRecord}
          onClose={() => setDeckRecord(null)}
          onSuccess={async () => { setDeckRecord(null); await Promise.all([fetchRecords(), loadFilterCounts()]); }}
          colors={colors} darkMode={darkMode}
        />
      )}
      {bulkDeckRows && (
        <BulkDeckModal
          records={bulkDeckRows}
          onClose={() => setBulkDeckRows(null)}
          onSuccess={async () => { setBulkDeckRows(null); setSelected([]); await Promise.all([fetchRecords(), loadFilterCounts()]); }}
          colors={colors} darkMode={darkMode}
        />
      )}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => { fetchRecords(); loadFilterCounts(); }}
          colors={colors} darkMode={darkMode}
        />
      )}
      {doctrackRecord && (
        <DoctrackModal
          record={doctrackRecord}
          onClose={() => setDoctrackRecord(null)}
          colors={colors}
        />
      )}
      {reassignRecord && (
        <GMPReassignmentModal
          record={reassignRecord}
          onClose={() => setReassignRecord(null)}
          onSuccess={async () => { setReassignRecord(null); await fetchRecords(); }}
          colors={colors} darkMode={darkMode}
        />
      )}
      {rerouteRecord && (
        <GMPRerouteModal
          record={rerouteRecord}
          onClose={() => setRerouteRecord(null)}
          onSuccess={async () => { setRerouteRecord(null); await fetchRecords(); }}
          colors={colors} darkMode={darkMode}
        />
      )}
      {infoRecord && (
        <GMPApplicationInfoModal
          record={infoRecord}
          onClose={() => setInfoRecord(null)}
          colors={colors} darkMode={darkMode}
        />
      )}

      <AdvancedFilterModal
        open={showAdvanced}
        draft={advDraft}
        onChange={setAdvDraft}
        onApply={applyAdvanced}
        onCancel={cancelAdvanced}
        onReset={resetAdvanced}
        sidebarFilters={sidebarFilters}
        colors={colors} darkMode={darkMode}
      />
    </div>
  );
}
