// src/components/monitoring/frpMonitoring/ApplicationsModal.jsx
// Modal — FRP/CRP applications list with split Received/Released view + advanced filters
// v2 — uses centralised API service (src/api/frpMonitoring.js)
import React, { useState, useEffect, useCallback, useRef } from "react";

import {
  getApplications,
  getFilterOptions,
  getFieldSuggestions,
} from "../../../api/frpMonitoring";

const FONT   = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const ACCENT = "#6366f1";

// ─── Modal animations ─────────────────────────────────────────────────────────
const MODAL_ANIM_CSS = `
@keyframes frpModalIn {
  0%   { opacity: 0; transform: scale(0.94) translateY(12px); }
  100% { opacity: 1; transform: scale(1)    translateY(0); }
}
@keyframes frpBackdropIn {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}
`;

// ─── Status badge map ─────────────────────────────────────────────────────────
const STATUS_BADGE = {
  COMPLETED:    { bg: "#dcfce7", color: "#15803d" },
  "ON-PROCESS": { bg: "#dbeafe", color: "#1d4ed8" },
  "ON PROCESS": { bg: "#dbeafe", color: "#1d4ed8" },
  DISAPPROVED:  { bg: "#fee2e2", color: "#b91c1c" },
  RELEASED:     { bg: "#ede9fe", color: "#6d28d9" },
};
function getStatusBadge(s) {
  if (!s) return { bg: "#f3f4f6", color: "#6b7280" };
  return STATUS_BADGE[s.toUpperCase()] ?? { bg: "#f3f4f6", color: "#6b7280" };
}

// ─── Table header helpers ─────────────────────────────────────────────────────
function Th({ children, ui, divider, bg }) {
  return (
    <th style={{ padding: "9px 12px", textAlign: "left", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: ui.textMuted, borderBottom: `1px solid ${divider}`, whiteSpace: "nowrap", position: "sticky", top: 0, background: bg }}>
      {children}
    </th>
  );
}
function ThGroup({ children, ui, divider, color, bg }) {
  return (
    <th style={{ padding: "9px 12px", textAlign: "left", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color, borderBottom: `2px solid ${color}40`, whiteSpace: "nowrap", position: "sticky", top: 0, background: bg }}>
      {children}
    </th>
  );
}

// ─── Filter constants ─────────────────────────────────────────────────────────
const FILTER_LABELS = {
  all:                 "All Applications",
  released_this_month: "Released This Month",
  pending_compliance:  "Pending Compliance",
  overdue:             "Overdue",
};
const FILTER_ICONS = { all: "📦", released_this_month: "📅", pending_compliance: "⚠️", overdue: "🚫" };

const DEFAULT_ADVANCED = {
  app_status: "", est_cat: "", app_type: "", lto_company: "", brand_name: "", generic_name: "",
  dosage_form: "", doc_type: "", uploaded_by: "",
  upload_date_from: "", upload_date_to: "",
  date_received_from: "", date_received_to: "",
  date_released_from: "", date_released_to: "",
  manufacturer: "", manufacturer_country: "",
  trader: "", trader_country: "",
  importer: "", importer_country: "",
  distributor: "", distributor_country: "",
  repacker: "", repacker_country: "",
};
function countActive(adv) { return Object.values(adv).filter((v) => v !== "").length; }

// ─── Autocomplete input ───────────────────────────────────────────────────────
function AutocompleteInput({ label, icon, value, onChange, field, placeholder, border, subBg, cardBg, ui }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop, setShowDrop]       = useState(false);
  const [query, setQuery]             = useState(value);
  const debounceRef                   = useRef(null);
  const wrapRef                       = useRef(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query || query.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(() => {
      getFieldSuggestions(field, query)
        .then((d) => setSuggestions(d.suggestions ?? []))
        .catch(() => setSuggestions([]));
    }, 300);
  }, [query, field]);

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={wrapRef} style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
      <label style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: ui.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
        {icon && <span>{icon}</span>}{label}
      </label>
      <input value={query} placeholder={placeholder}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setShowDrop(true); }}
        onFocus={() => query.length >= 2 && setShowDrop(true)}
        style={{ padding: "7px 10px", fontSize: "0.78rem", fontFamily: FONT, borderRadius: 8, border: `1px solid ${border}`, background: subBg, color: ui.textPrimary, outline: "none", width: "100%", boxSizing: "border-box" }}
      />
      {showDrop && suggestions.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999, background: cardBg, border: `1px solid ${border}`, borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", maxHeight: 180, overflowY: "auto", marginTop: 2 }}>
          {suggestions.map((s) => (
            <div key={s}
              onMouseDown={(e) => { e.preventDefault(); setQuery(s); onChange(s); setShowDrop(false); }}
              style={{ padding: "8px 12px", fontSize: "0.78rem", cursor: "pointer", color: ui.textPrimary, borderBottom: `1px solid ${border}` }}
              onMouseEnter={(e) => e.currentTarget.style.background = `${ACCENT}10`}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, icon, value, onChange, options, border, subBg, ui }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: ui.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
        {icon && <span>{icon}</span>}{label}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ padding: "7px 10px", fontSize: "0.78rem", fontFamily: FONT, borderRadius: 8, border: `1px solid ${border}`, background: subBg, color: value ? ui.textPrimary : ui.textMuted, outline: "none", width: "100%", boxSizing: "border-box", cursor: "pointer" }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function FilterInput({ label, icon, value, onChange, placeholder, type = "text", border, subBg, ui }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: ui.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
        {icon && <span>{icon}</span>}{label}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ padding: "7px 10px", fontSize: "0.78rem", fontFamily: FONT, borderRadius: 8, border: `1px solid ${border}`, background: subBg, color: ui.textPrimary, outline: "none", width: "100%", boxSizing: "border-box" }} />
    </div>
  );
}

// ─── Advanced Filter Drawer ───────────────────────────────────────────────────
function AdvancedFilterPanel({ draft, setDraft, filterOptions, onApply, onClear, border, subBg, cardBg, ui }) {
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "10px 14px", marginBottom: 18 };
  const sec  = (t) => <p style={{ margin: "0 0 10px", fontSize: "0.62rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: ui.textMuted, borderBottom: `1px solid ${border}`, paddingBottom: 6 }}>{t}</p>;
  const fp   = { border, subBg, ui };
  const acp  = { ...fp, cardBg };

  return (
    <div style={{ padding: "14px 20px 0" }}>
      {sec("General Filters")}
      <div style={grid}>
        <FilterSelect label="Application Status"  icon="🚦" value={draft.app_status}       onChange={(v) => setDraft(f => ({ ...f, app_status: v }))}       options={[{ value: "", label: "All Statuses" },    ...(filterOptions.app_statuses ?? []).map(s => ({ value: s, label: s }))]} {...fp} />
        <FilterSelect label="Est. Category"       icon="📋" value={draft.est_cat}          onChange={(v) => setDraft(f => ({ ...f, est_cat: v }))}          options={[{ value: "", label: "All Categories" }, ...(filterOptions.est_cats ?? []).map(c => ({ value: c, label: c }))]}     {...fp} />
        <FilterSelect label="Application Type"    icon="🗂️" value={draft.app_type}         onChange={(v) => setDraft(f => ({ ...f, app_type: v }))}         options={[{ value: "", label: "All Types" },       ...(filterOptions.app_types ?? []).map(t => ({ value: t, label: t }))]} {...fp} />
        <AutocompleteInput label="LTO Company"    icon="🏢" field="lto_company"   value={draft.lto_company}   placeholder="Search LTO company"   onChange={(v) => setDraft(f => ({ ...f, lto_company: v }))}   {...acp} />
        <AutocompleteInput label="Brand Name"     icon="💊" field="brand_name"    value={draft.brand_name}    placeholder="Search brand name"    onChange={(v) => setDraft(f => ({ ...f, brand_name: v }))}    {...acp} />
        <AutocompleteInput label="Generic Name"   icon="🧬" field="generic_name"  value={draft.generic_name}  placeholder="Search generic name"  onChange={(v) => setDraft(f => ({ ...f, generic_name: v }))}  {...acp} />
        <AutocompleteInput label="Dosage Form"    icon="💉" field="dosage_form"   value={draft.dosage_form}   placeholder="e.g., Tablet"         onChange={(v) => setDraft(f => ({ ...f, dosage_form: v }))}   {...acp} />
        <FilterSelect label="Type Doc Released"   icon="📄" value={draft.doc_type}         onChange={(v) => setDraft(f => ({ ...f, doc_type: v }))}         options={[{ value: "", label: "All Types" },       ...(filterOptions.doc_types ?? []).map(t => ({ value: t, label: t }))]} {...fp} />
        <AutocompleteInput label="Uploaded By"    icon="👤" field="uploaded_by"   value={draft.uploaded_by}   placeholder="Search uploader"      onChange={(v) => setDraft(f => ({ ...f, uploaded_by: v }))}   {...acp} />
        <FilterInput label="Upload Date From"     icon="📅" type="date" value={draft.upload_date_from}   onChange={(v) => setDraft(f => ({ ...f, upload_date_from: v }))}   {...fp} />
        <FilterInput label="Upload Date To"       icon="📅" type="date" value={draft.upload_date_to}     onChange={(v) => setDraft(f => ({ ...f, upload_date_to: v }))}     {...fp} />
        <FilterInput label="Date Received From"   icon="📥" type="date" value={draft.date_received_from} onChange={(v) => setDraft(f => ({ ...f, date_received_from: v }))} {...fp} />
        <FilterInput label="Date Received To"     icon="📥" type="date" value={draft.date_received_to}   onChange={(v) => setDraft(f => ({ ...f, date_received_to: v }))}   {...fp} />
        <FilterInput label="Date Released From"   icon="📤" type="date" value={draft.date_released_from} onChange={(v) => setDraft(f => ({ ...f, date_released_from: v }))} {...fp} />
        <FilterInput label="Date Released To"     icon="📤" type="date" value={draft.date_released_to}   onChange={(v) => setDraft(f => ({ ...f, date_released_to: v }))}   {...fp} />
      </div>

      {sec("Supply Chain Filters")}
      <div style={{ ...grid, marginBottom: 0 }}>
        <AutocompleteInput label="Manufacturer"          icon="🏭" field="manufacturer" value={draft.manufacturer}  placeholder="Search manufacturer" onChange={(v) => setDraft(f => ({ ...f, manufacturer: v }))}  {...acp} />
        <FilterSelect label="Manufacturer Country" icon="🌍" value={draft.manufacturer_country} onChange={(v) => setDraft(f => ({ ...f, manufacturer_country: v }))} options={[{ value: "", label: "All Countries" }, ...(filterOptions.manufacturer_countries ?? []).map(c => ({ value: c, label: c }))]} {...fp} />
        <AutocompleteInput label="Trader"                icon="🤝" field="trader"       value={draft.trader}        placeholder="Search trader"        onChange={(v) => setDraft(f => ({ ...f, trader: v }))}        {...acp} />
        <FilterSelect label="Trader Country"       icon="🌍" value={draft.trader_country}        onChange={(v) => setDraft(f => ({ ...f, trader_country: v }))}        options={[{ value: "", label: "All Countries" }, ...(filterOptions.trader_countries ?? []).map(c => ({ value: c, label: c }))]}        {...fp} />
        <AutocompleteInput label="Importer"              icon="📦" field="importer"     value={draft.importer}      placeholder="Search importer"      onChange={(v) => setDraft(f => ({ ...f, importer: v }))}      {...acp} />
        <FilterSelect label="Importer Country"     icon="🌍" value={draft.importer_country}       onChange={(v) => setDraft(f => ({ ...f, importer_country: v }))}       options={[{ value: "", label: "All Countries" }, ...(filterOptions.importer_countries ?? []).map(c => ({ value: c, label: c }))]}       {...fp} />
        <AutocompleteInput label="Distributor"           icon="🚚" field="distributor"  value={draft.distributor}   placeholder="Search distributor"   onChange={(v) => setDraft(f => ({ ...f, distributor: v }))}   {...acp} />
        <FilterSelect label="Distributor Country"  icon="🌍" value={draft.distributor_country}    onChange={(v) => setDraft(f => ({ ...f, distributor_country: v }))}    options={[{ value: "", label: "All Countries" }, ...(filterOptions.distributor_countries ?? []).map(c => ({ value: c, label: c }))]}    {...fp} />
        <AutocompleteInput label="Repacker"              icon="📫" field="repacker"     value={draft.repacker}      placeholder="Search repacker"      onChange={(v) => setDraft(f => ({ ...f, repacker: v }))}      {...acp} />
        <FilterSelect label="Repacker Country"     icon="🌍" value={draft.repacker_country}        onChange={(v) => setDraft(f => ({ ...f, repacker_country: v }))}        options={[{ value: "", label: "All Countries" }, ...(filterOptions.repacker_countries ?? []).map(c => ({ value: c, label: c }))]}        {...fp} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "14px 0 16px" }}>
        <button onClick={onClear} style={{ padding: "8px 18px", fontSize: "0.78rem", fontWeight: 600, fontFamily: FONT, borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: ui.textMuted, cursor: "pointer" }}>Clear Filters</button>
        <button onClick={onApply} style={{ padding: "8px 22px", fontSize: "0.78rem", fontWeight: 700, fontFamily: FONT, borderRadius: 8, border: "none", background: ACCENT, color: "#fff", cursor: "pointer", boxShadow: "0 2px 8px rgba(99,102,241,0.35)", display: "flex", alignItems: "center", gap: 6 }}>
          <span>⚡</span> Apply Filters
        </button>
      </div>
    </div>
  );
}

// ─── Period Tab — one side of the split Received | Released view ──────────────
function PeriodTab({ period, periodType, applied, search, cardBg, border, subBg, divider, ui, darkMode }) {
  const [page, setPage]       = useState(1);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const PAGE_SIZE = 100;

  const fetchData = useCallback(() => {
    setLoading(true); setError(null);
    getApplications({
      period,
      period_type: periodType,
      page,
      page_size: PAGE_SIZE,
      search: search || undefined,
      ...Object.fromEntries(Object.entries(applied).filter(([, v]) => v !== "").map(([k, v]) => [k, v])),
    })
      .then(d => setData(d))
      .catch(() => setError("Failed to load."))
      .finally(() => setLoading(false));
  }, [period, periodType, page, search, applied]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rows        = data?.data ?? [];
  const total       = data?.total ?? 0;
  const totalPages  = data?.total_pages ?? 1;
  const isReceived  = periodType === "received";
  const accent      = isReceived ? "#3b82f6" : "#10b981";
  const icon        = isReceived ? "📥" : "📤";
  const label       = isReceived ? "Received" : "Released";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, borderRight: isReceived ? `1px solid ${border}` : "none" }}>

      {/* Section header */}
      <div style={{ padding: "10px 16px", borderBottom: `2px solid ${accent}50`, background: `${accent}08`, flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: "0.84rem", fontWeight: 700, color: accent, display: "flex", alignItems: "center", gap: 6 }}>
          {icon} {label} in {period}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: "0.7rem", color: ui.textMuted }}>
          {loading ? "Loading…" : `${total.toLocaleString()} record${total !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 14 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: 40, borderRadius: 8, background: subBg, opacity: 0.6 }} />)}
          </div>
        ) : error ? (
          <div style={{ padding: "30px 16px", textAlign: "center", color: "#ef4444", fontSize: "0.82rem" }}>⚠️ {error}</div>
        ) : !rows.length ? (
          <div style={{ padding: "30px 16px", textAlign: "center", color: ui.textMuted, fontSize: "0.82rem" }}>📭 No {label.toLowerCase()} applications in {period}.</div>
        ) : (
          <table style={{ borderCollapse: "collapse", fontSize: "0.74rem", whiteSpace: "nowrap", width: "100%" }}>
            <thead>
              <tr>
                <Th ui={ui} divider={divider} bg={cardBg}>#</Th>
                <Th ui={ui} divider={divider} bg={cardBg}>DTN</Th>
                <Th ui={ui} divider={divider} bg={cardBg}>App Type</Th>
                <Th ui={ui} divider={divider} bg={cardBg}>App Status</Th>
                <Th ui={ui} divider={divider} bg={cardBg}>Doc Type</Th>
                <Th ui={ui} divider={divider} bg={cardBg}>Brand / Generic Name</Th>
                <Th ui={ui} divider={divider} bg={cardBg}>LTO Company</Th>
                <Th ui={ui} divider={divider} bg={cardBg}>Category</Th>
                <ThGroup color={accent} ui={ui} divider={divider} bg={cardBg}>
                  {isReceived ? "Date Received" : "Date Released"}
                </ThGroup>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const badge = getStatusBadge(r.app_status);
                return (
                  <tr key={r.id ?? i}
                    onMouseEnter={e => e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "8px 12px", color: ui.textMuted, borderBottom: `1px solid ${divider}` }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td style={{ padding: "8px 12px", borderBottom: `1px solid ${divider}` }}>
                      <span style={{ fontFamily: "ui-monospace,monospace", fontSize: "0.72rem", fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: darkMode ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>{r.dtn || "—"}</span>
                    </td>
                    <td style={{ padding: "8px 12px", borderBottom: `1px solid ${divider}` }}>
                      {r.app_type ? <span style={{ fontSize: "0.66rem", fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: `${ACCENT}15`, color: ACCENT }}>{r.app_type}</span> : <span style={{ color: ui.textMuted }}>—</span>}
                    </td>
                    <td style={{ padding: "8px 12px", borderBottom: `1px solid ${divider}` }}>
                      {r.app_status ? <span style={{ fontSize: "0.66rem", fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: badge.bg, color: badge.color }}>{r.app_status}</span> : <span style={{ color: ui.textMuted }}>—</span>}
                    </td>
                    <td style={{ padding: "8px 12px", color: ui.textMuted, borderBottom: `1px solid ${divider}` }}>{r.doc_type || "Not Yet Assigned"}</td>
                    <td style={{ padding: "8px 12px", color: ui.textPrimary, borderBottom: `1px solid ${divider}`, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{r.brand_name || r.generic_name || "—"}</td>
                    <td style={{ padding: "8px 12px", color: ui.textPrimary, borderBottom: `1px solid ${divider}`, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{r.lto_company || "—"}</td>
                    <td style={{ padding: "8px 12px", color: ui.textMuted, borderBottom: `1px solid ${divider}` }}>{r.category || "—"}</td>
                    <td style={{ padding: "8px 12px", borderBottom: `1px solid ${divider}` }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: accent }}>{(isReceived ? r.date_received : r.date_released) || "—"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ padding: "8px 14px", borderTop: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: "0.68rem", color: ui.textMuted }}>
            {total > 0 ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total.toLocaleString()}` : ""}
          </span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${border}`, background: "transparent", color: ui.textMuted, cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1, fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <span style={{ fontSize: "0.72rem", color: ui.textPrimary, padding: "0 6px" }}>{page}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${border}`, background: "transparent", color: ui.textMuted, cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1, fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function ApplicationsModal({ open, onClose, initialFilter = "all", initialPeriod = null, ui, darkMode }) {
  const [filterType, setFilterType]         = useState(initialFilter);
  const [search, setSearch]                 = useState("");
  const [searchInput, setSearchInput]       = useState("");
  const [page, setPage]                     = useState(1);
  const [data, setData]                     = useState(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showAdvanced, setShowAdvanced]     = useState(false);
  const [filterOptions, setFilterOptions]   = useState({});
  const [draft, setDraft]                   = useState(DEFAULT_ADVANCED);
  const [applied, setApplied]               = useState(DEFAULT_ADVANCED);
  const [period, setPeriod]                 = useState(initialPeriod);

  const PAGE_SIZE    = 100;
  const activeCount  = countActive(applied);
  const isPeriodView = !!period;

  // Load dropdown options once on open
  useEffect(() => {
    if (!open) return;
    getFilterOptions().then(d => setFilterOptions(d)).catch(() => {});
  }, [open]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setFilterType(initialFilter);
      setPeriod(initialPeriod);
      setSearch(""); setSearchInput("");
      setPage(1);
      setDraft(DEFAULT_ADVANCED); setApplied(DEFAULT_ADVANCED);
      setShowAdvanced(false);
    }
  }, [open, initialFilter, initialPeriod]);

  // Fetch for normal (non-period) view
  const fetchData = useCallback(() => {
    if (isPeriodView) return;
    setLoading(true); setError(null);
    getApplications({
      filter_type: filterType,
      search: search || undefined,
      page,
      page_size: PAGE_SIZE,
      ...Object.fromEntries(Object.entries(applied).filter(([, v]) => v !== "").map(([k, v]) => [k, v])),
    })
      .then(d => setData(d))
      .catch(() => setError("Failed to load applications."))
      .finally(() => setLoading(false));
  }, [filterType, search, page, applied, isPeriodView]);

  useEffect(() => { if (open && !isPeriodView) fetchData(); }, [open, fetchData, isPeriodView]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleApply        = useCallback(() => { setApplied({ ...draft }); setPage(1); setShowAdvanced(false); }, [draft]);
  const handleClearAdvanced = useCallback(() => { setDraft(DEFAULT_ADVANCED); setApplied(DEFAULT_ADVANCED); setPage(1); }, []);
  const handleClearAll      = useCallback(() => { setDraft(DEFAULT_ADVANCED); setApplied(DEFAULT_ADVANCED); setSearchInput(""); setSearch(""); setPage(1); }, []);

  if (!open) return null;

  const rows       = data?.data ?? [];
  const total      = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  const cardBg  = darkMode ? "#1e1f20" : "#fff";
  const border  = darkMode ? "rgba(255,255,255,0.1)"  : "rgba(0,0,0,0.08)";
  const subBg   = darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
  const divider = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: FONT, animation: "frpBackdropIn 0.2s ease forwards" }}>
      <style>{MODAL_ANIM_CSS}</style>
      <div onClick={e => e.stopPropagation()} style={{ background: cardBg, borderRadius: 16, width: "100%", maxWidth: isPeriodView ? 1300 : 1100, height: "92vh", maxHeight: "92vh", minHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", position: "relative", animation: "frpModalIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>

        {/* ── Header ── */}
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: "0 0 2px", fontSize: "1.05rem", fontWeight: 700, color: ui.textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
              {isPeriodView ? (
                <><span style={{ color: "#3b82f6" }}>📥 Received</span><span style={{ fontSize: "0.85rem", color: ui.textMuted, fontWeight: 400 }}>vs</span><span style={{ color: "#10b981" }}>📤 Released</span><span style={{ fontSize: "0.85rem", fontWeight: 600, color: ui.textMuted }}>— {period}</span></>
              ) : (
                <>{FILTER_ICONS[filterType]} {FILTER_LABELS[filterType] ?? "Applications"}</>
              )}
            </h2>
            <p style={{ margin: 0, fontSize: "0.75rem", color: ui.textMuted }}>
              {isPeriodView
                ? `FRP and CRP applications received or released in ${period}`
                : filterType === "overdue"
                ? `On-process applications that have exceeded their Citizen's Charter processing deadline · ${total.toLocaleString()} overdue`
                : `FRP and CRP applications · ${total.toLocaleString()} total record${total !== 1 ? "s" : ""}`}
              {activeCount > 0 && (
                <span style={{ marginLeft: 8, fontSize: "0.68rem", fontWeight: 700, padding: "1px 8px", borderRadius: 99, background: `${ACCENT}18`, color: ACCENT }}>
                  {activeCount} filter{activeCount !== 1 ? "s" : ""} active
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${border}`, background: "transparent", color: ui.textMuted, cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
        </div>

        {/* ── Toolbar ── */}
        <div style={{ padding: "12px 22px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: "0.85rem", color: ui.textMuted }}>🔍</span>
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Search DTN, product name, or company"
              style={{ width: "100%", padding: "9px 12px 9px 36px", fontSize: "0.82rem", fontFamily: FONT, borderRadius: 10, border: `1px solid ${border}`, background: subBg, color: ui.textPrimary, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {!isPeriodView && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowFilterMenu(v => !v)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", fontSize: "0.78rem", fontWeight: 600, fontFamily: FONT, borderRadius: 10, border: `1px solid ${border}`, background: subBg, color: ui.textPrimary, cursor: "pointer" }}>
                ⚙️ {FILTER_LABELS[filterType]} <span style={{ fontSize: "0.65rem" }}>▾</span>
              </button>
              {showFilterMenu && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: cardBg, border: `1px solid ${border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", minWidth: 200, zIndex: 10, overflow: "hidden" }}>
                  {Object.entries(FILTER_LABELS).map(([key, label]) => (
                    <button key={key} onClick={() => { setFilterType(key); setPage(1); setShowFilterMenu(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", fontSize: "0.8rem", fontWeight: filterType === key ? 700 : 500, fontFamily: FONT, border: "none", background: filterType === key ? `${ACCENT}12` : "transparent", color: filterType === key ? ACCENT : ui.textPrimary, cursor: "pointer", textAlign: "left" }}>
                      <span>{FILTER_ICONS[key]}</span>{label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button onClick={() => setShowAdvanced(v => !v)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", fontSize: "0.78rem", fontWeight: 700, fontFamily: FONT, borderRadius: 10, border: `1px solid ${showAdvanced || activeCount > 0 ? ACCENT + "60" : border}`, background: showAdvanced || activeCount > 0 ? `${ACCENT}15` : subBg, color: showAdvanced || activeCount > 0 ? ACCENT : ui.textMuted, cursor: "pointer", transition: "all 0.15s ease" }}>
            <span>🔧</span> Advanced
            {activeCount > 0 && <span style={{ width: 18, height: 18, borderRadius: "50%", background: ACCENT, color: "#fff", fontSize: "0.6rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeCount}</span>}
          </button>

          {(activeCount > 0 || searchInput) && (
            <button onClick={handleClearAll} style={{ padding: "9px 14px", fontSize: "0.75rem", fontWeight: 600, fontFamily: FONT, borderRadius: 10, border: `1px solid ${border}`, background: "transparent", color: ui.textMuted, cursor: "pointer" }}>Clear all</button>
          )}
        </div>

        {/* ── Active filter chips ── */}
        {activeCount > 0 && (
          <div style={{ padding: "8px 22px", borderBottom: `1px solid ${border}`, display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0 }}>
            {Object.entries(applied).filter(([, v]) => v !== "").map(([k, v]) => (
              <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, fontSize: "0.7rem", fontWeight: 600, background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }}>
                {k.replace(/_/g, " ")}: {v}
                <span onClick={() => { const n = { ...applied, [k]: "" }; setApplied(n); setDraft(n); setPage(1); }} style={{ cursor: "pointer", fontSize: "0.75rem", opacity: 0.7 }}>✕</span>
              </span>
            ))}
            <button onClick={() => setShowAdvanced(true)} style={{ padding: "3px 10px", borderRadius: 99, fontSize: "0.7rem", fontWeight: 600, border: `1px solid ${border}`, background: "transparent", color: ui.textMuted, cursor: "pointer" }}>Edit filters</button>
          </div>
        )}

        {/* ── Content: split view OR normal table ── */}
        {isPeriodView ? (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <PeriodTab period={period} periodType="received" applied={applied} search={search} cardBg={cardBg} border={border} subBg={subBg} divider={divider} ui={ui} darkMode={darkMode} />
            <PeriodTab period={period} periodType="released" applied={applied} search={search} cardBg={cardBg} border={border} subBg={subBg} divider={divider} ui={ui} darkMode={darkMode} />
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflow: "auto", padding: "0 0 0 22px" }}>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "16px 22px 16px 0" }}>
                  {[1,2,3,4,5,6,7,8].map(i => <div key={i} style={{ height: 48, borderRadius: 10, background: subBg, opacity: 0.6 }} />)}
                </div>
              ) : error ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "#ef4444", fontSize: "0.85rem" }}>⚠️ {error}</div>
              ) : !rows.length ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: ui.textMuted, fontSize: "0.85rem" }}>📭 No applications found for this filter.</div>
              ) : (
                <table style={{ borderCollapse: "collapse", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                  <thead>
                    <tr style={{ position: "sticky", top: 0, background: cardBg, zIndex: 2 }}>
                      <Th ui={ui} divider={divider} bg={cardBg}>#</Th>
                      <Th ui={ui} divider={divider} bg={cardBg}>DTN</Th>
                      <Th ui={ui} divider={divider} bg={cardBg}>App Type</Th>
                      <Th ui={ui} divider={divider} bg={cardBg}>App Status</Th>
                      {filterType === "overdue" && (
                        <>
                          <ThGroup ui={ui} divider={divider} color="#ef4444" bg={cardBg}>Date Received</ThGroup>
                          <ThGroup ui={ui} divider={divider} color="#ef4444" bg={cardBg}>Charter Days</ThGroup>
                          <ThGroup ui={ui} divider={divider} color="#ef4444" bg={cardBg}>Days Elapsed</ThGroup>
                          <ThGroup ui={ui} divider={divider} color="#ef4444" bg={cardBg}>Over By</ThGroup>
                        </>
                      )}
                      <Th ui={ui} divider={divider} bg={cardBg}>Doc Type</Th>
                      <Th ui={ui} divider={divider} bg={cardBg}>Category</Th>
                      <ThGroup ui={ui} divider={divider} color="#6366f1" bg={cardBg}>Brand Name</ThGroup>
                      <ThGroup ui={ui} divider={divider} color="#6366f1" bg={cardBg}>Generic Name</ThGroup>
                      <ThGroup ui={ui} divider={divider} color="#6366f1" bg={cardBg}>Dosage Form</ThGroup>
                      <ThGroup ui={ui} divider={divider} color="#10b981" bg={cardBg}>LTO Company</ThGroup>
                      <ThGroup ui={ui} divider={divider} color="#10b981" bg={cardBg}>LTO Address</ThGroup>
                      <ThGroup ui={ui} divider={divider} color="#3b82f6" bg={cardBg}>Manufacturer</ThGroup>
                      <ThGroup ui={ui} divider={divider} color="#3b82f6" bg={cardBg}>Mfr. Country</ThGroup>
                      <ThGroup ui={ui} divider={divider} color="#f59e0b" bg={cardBg}>Trader</ThGroup>
                      <ThGroup ui={ui} divider={divider} color="#f59e0b" bg={cardBg}>Trader Country</ThGroup>
                      <ThGroup ui={ui} divider={divider} color="#8b5cf6" bg={cardBg}>Importer</ThGroup>
                      <ThGroup ui={ui} divider={divider} color="#8b5cf6" bg={cardBg}>Importer Country</ThGroup>
                      <ThGroup ui={ui} divider={divider} color="#10b981" bg={cardBg}>Distributor</ThGroup>
                      <ThGroup ui={ui} divider={divider} color="#10b981" bg={cardBg}>Distri. Country</ThGroup>
                      <ThGroup ui={ui} divider={divider} color="#ec4899" bg={cardBg}>Repacker</ThGroup>
                      <ThGroup ui={ui} divider={divider} color="#ec4899" bg={cardBg}>Repacker Country</ThGroup>
                      {filterType !== "overdue" && <Th ui={ui} divider={divider} bg={cardBg}>Date Received</Th>}
                      {filterType !== "overdue" && <Th ui={ui} divider={divider} bg={cardBg}>Date Released</Th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const badge = getStatusBadge(r.app_status);
                      const td = (val, opts = {}) => (
                        <td style={{ padding: "9px 12px", color: opts.muted ? ui.textMuted : ui.textPrimary, maxWidth: opts.wide ? 240 : opts.narrow ? 100 : 180, overflow: "hidden", textOverflow: "ellipsis", borderBottom: `1px solid ${divider}`, verticalAlign: "middle" }}>
                          {val || "—"}
                        </td>
                      );
                      return (
                        <tr key={r.id ?? i}
                          onMouseEnter={e => e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <td style={{ padding: "9px 12px", color: ui.textMuted, borderBottom: `1px solid ${divider}`, verticalAlign: "middle" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                          <td style={{ padding: "9px 12px", borderBottom: `1px solid ${divider}`, verticalAlign: "middle" }}>
                            <span style={{ fontFamily: "ui-monospace,monospace", fontSize: "0.74rem", fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: darkMode ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>{r.dtn || "—"}</span>
                          </td>
                          <td style={{ padding: "9px 12px", borderBottom: `1px solid ${divider}`, verticalAlign: "middle" }}>
                            {r.app_type ? <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${ACCENT}15`, color: ACCENT }}>{r.app_type}</span> : <span style={{ color: ui.textMuted }}>—</span>}
                          </td>
                          <td style={{ padding: "9px 12px", borderBottom: `1px solid ${divider}`, verticalAlign: "middle" }}>
                            {r.app_status ? <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: badge.bg, color: badge.color }}>{r.app_status}</span> : <span style={{ color: ui.textMuted }}>—</span>}
                          </td>
                          {filterType === "overdue" && (() => {
                            const charter = r.timeline;
                            const elapsed = r.days_elapsed;
                            const overBy  = charter != null && elapsed != null ? elapsed - charter : null;
                            return (
                              <>
                                <td style={{ padding: "9px 12px", borderBottom: `1px solid ${divider}`, verticalAlign: "middle", color: "#ef4444", fontWeight: 700, whiteSpace: "nowrap" }}>{r.date_received || "—"}</td>
                                <td style={{ padding: "9px 12px", borderBottom: `1px solid ${divider}`, verticalAlign: "middle", color: "#ef4444", fontWeight: 700, whiteSpace: "nowrap" }}>{charter != null ? `${charter}d` : "—"}</td>
                                <td style={{ padding: "9px 12px", borderBottom: `1px solid ${divider}`, verticalAlign: "middle", fontWeight: 700, whiteSpace: "nowrap", color: elapsed != null && overBy > 0 ? "#ef4444" : "#10b981" }}>{elapsed != null ? `${elapsed}d` : "—"}</td>
                                <td style={{ padding: "9px 12px", borderBottom: `1px solid ${divider}`, verticalAlign: "middle", whiteSpace: "nowrap" }}>
                                  {overBy != null ? (
                                    <span style={{ fontSize: "0.7rem", fontWeight: 800, padding: "3px 9px", borderRadius: 99, background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>+{overBy}d overdue</span>
                                  ) : "—"}
                                </td>
                              </>
                            );
                          })()}
                          {td(r.doc_type || "Not Yet Assigned", { muted: !r.doc_type })}
                          {td(r.category)}
                          {td(r.brand_name, { wide: true })}
                          {td(r.generic_name, { wide: true })}
                          {td(r.dosage_form)}
                          {td(r.lto_company, { wide: true })}
                          {td(r.lto_address, { wide: true })}
                          {td(r.manufacturer, { wide: true })}
                          {td(r.manufacturer_country)}
                          {td(r.trader, { wide: true })}
                          {td(r.trader_country)}
                          {td(r.importer, { wide: true })}
                          {td(r.importer_country)}
                          {td(r.distributor, { wide: true })}
                          {td(r.distributor_country)}
                          {td(r.repacker, { wide: true })}
                          {td(r.repacker_country)}
                          {filterType !== "overdue" && td(r.date_received, { muted: true, narrow: true })}
                          {filterType !== "overdue" && td(r.date_released, { muted: true, narrow: true })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div style={{ padding: "12px 22px", borderTop: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
                {total > 0 ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total.toLocaleString()}` : "0 results"}
              </span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: ui.textMuted, cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1, fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                <span style={{ fontSize: "0.78rem", color: ui.textPrimary, padding: "0 8px" }}>Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: ui.textMuted, cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1, fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
              </div>
            </div>
          </>
        )}

        {/* ── Advanced Filter Drawer ── */}
        {showAdvanced && (
          <>
            <div onClick={() => setShowAdvanced(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 20, borderRadius: 16 }} />
            <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(660px, 100%)", background: cardBg, borderRadius: "0 16px 16px 0", boxShadow: "-8px 0 40px rgba(0,0,0,0.22)", zIndex: 21, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div>
                  <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: ui.textPrimary }}>🔧 Advanced Filters</p>
                  <p style={{ margin: "2px 0 0", fontSize: "0.7rem", color: ui.textMuted }}>Set your filters then click Apply</p>
                </div>
                <button onClick={() => setShowAdvanced(false)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: ui.textMuted, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                <AdvancedFilterPanel draft={draft} setDraft={setDraft} filterOptions={filterOptions} onApply={handleApply} onClear={handleClearAdvanced} border={border} subBg={subBg} cardBg={cardBg} ui={ui} darkMode={darkMode} />
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}