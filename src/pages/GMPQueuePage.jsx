// src/pages/GMPQueuePage.jsx
// GMP Queue — Decker view. Owns all state, data fetching, and modals.
import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { getGMPRecords, getGMPFilterCounts, downloadGMPTemplate, exportFilteredGMPRecords } from "../api/gmp";
import { getColorScheme } from "../components/gmp/shared/colorScheme";
import { TopTabs, QuickFilterSidebar } from "../components/gmp/queue/QueueFilters";
import QueueTable, { COLUMNS as GMP_QUEUE_COLUMNS } from "../components/gmp/queue/QueueTable";
import DeckModal from "../components/gmp/queue/GMPDeckModal";
import BulkDeckModal from "../components/gmp/queue/GMPBulkDeckModal";
import UploadModal from "../components/gmp/queue/UploadModal";
import AppLogModal from "../components/gmp/tasks/AppLogModal";
import FieldAuditModal from "../components/gmp/tasks/FieldAuditModal";
import DoctrackModal from "../components/reports/actions/DoctrackModal";
import GMPReassignmentModal from "../components/gmp/queue/GMPReassignmentModal";
import GMPRerouteModal from "../components/gmp/queue/GMPRerouteModal";
import GMPApplicationInfoModal from "../components/gmp/queue/GMPApplicationInfoModal";
import GMPDocumentsModal from "../components/gmp/queue/GMPDocumentsModal";
import {
  generateGMPTransmittalPDF,
  generateGMPTransmittalExcel,
  generateGMPTransmittal,
} from "../components/tasks/DataTable/TransmittalGenerator";
import { FONT } from "../components/gmp/shared/constants";

const ACCENT = "#6366f1";

// Default queue sort — also what "reset sort" (QueueTable's ✕ next to the
// active sort arrow) returns to.
const DEFAULT_SORT_BY = "GMP_DATE_EXCEL_UPLOAD";
const DEFAULT_SORT_ORDER = "desc";

// NOTE: "Update Application Info" is intentionally omitted — GMP has no
// record-edit modal yet. Add it here once one exists.
const DBL_CLICK_OPTIONS = [
  { value: "viewInfo", label: "Application Information", icon: "👁️" },
  { value: "appLog",   label: "Application Logs",         icon: "📋" },
  { value: "auditLog", label: "Field Audit Logs",         icon: "🕐" },
  { value: "doctrack", label: "Doctrack Details",        icon: "📋" },
];

const ADV_DEFAULTS = {
  related_dtn: "", transaction_type: "all", est_category: "all", type_of_issuance: "all", lto_company: "",
  uploaded_by: "", upload_date_from: "", upload_date_to: "",
  date_received_from: "", date_received_to: "",
  // Extra per-column fields — one filterable field per GMP Queue column
  // that isn't already covered above or by the sidebar quick filters.
  reference_no: "", lto_number: "", address: "",
  foreign_manufacturer: "", foreign_manufacturer_address: "",
  secpa_number: "", certificate_number: "", certificate_validity: "",
  decision: "", processed_time: "", timeline: "", remarks: "", product_line: "",
  released_date_from: "", released_date_to: "",
  end_date_from: "", end_date_to: "",
  date_printed_from: "", date_printed_to: "",
  compliance_docs_date_received_from: "", compliance_docs_date_received_to: "",
};

const QUICK_LABEL_MAP = {
  app_status: "Application Status", est_category: "Category", transaction_type: "Transaction Type",
  type_of_issuance: "Issuance Type",
};

const ADV_LABEL_MAP = {
  related_dtn: "Related DTN", transaction_type: "Entry Type", est_category: "Est. Category",
  type_of_issuance: "Issuance Type",
  lto_company: "LTO Company", uploaded_by: "Uploaded By",
  upload_date_from: "Upload From", upload_date_to: "Upload To",
  date_received_from: "Received From", date_received_to: "Received To",
  reference_no: "Reference No", lto_number: "LTO Number", address: "Address",
  foreign_manufacturer: "Foreign Manufacturer",
  foreign_manufacturer_address: "Foreign Manufacturer Address",
  secpa_number: "SECPA Number", certificate_number: "Certificate Number",
  certificate_validity: "Certificate Validity", decision: "Decision",
  processed_time: "Processed Time", timeline: "Timeline", remarks: "Remarks",
  product_line: "Product Line",
  released_date_from: "Released From", released_date_to: "Released To",
  end_date_from: "End Date From", end_date_to: "End Date To",
  date_printed_from: "Printed From", date_printed_to: "Printed To",
  compliance_docs_date_received_from: "Compliance Docs From",
  compliance_docs_date_received_to: "Compliance Docs To",
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
    { key: "type_of_issuance", label: "Issuance Type",type: "select", options: getOptions("type_of_issuance") },
    { key: "lto_company",      label: "LTO Company",  type: "text",   placeholder: "Search LTO company" },
    { key: "uploaded_by",      label: "Uploaded By",  type: "text",   placeholder: "Search uploader name" },
    { key: "upload_date_from", label: "Upload Date From", type: "date" },
    { key: "upload_date_to",   label: "Upload Date To",   type: "date" },
    { key: "date_received_from", label: "Date Received From", type: "date" },
    { key: "date_received_to",   label: "Date Received To",   type: "date" },
  ];

  // One filterable field per GMP Queue column not already covered above or
  // by the sidebar quick filters (Status/Category/Transaction Type/Issuance
  // Type) — keeps filtering as complete as the "which columns show" picker.
  const columnFields = [
    { key: "reference_no",                   label: "Reference No",                type: "text", placeholder: "Search reference no." },
    { key: "lto_number",                     label: "LTO Number",                  type: "text", placeholder: "Search LTO number" },
    { key: "address",                        label: "Address",                     type: "text", placeholder: "Search address" },
    { key: "foreign_manufacturer",           label: "Foreign Manufacturer",        type: "text", placeholder: "Search foreign manufacturer" },
    { key: "foreign_manufacturer_address",   label: "Foreign Manufacturer Address",type: "text", placeholder: "Search manufacturer address" },
    { key: "secpa_number",                   label: "SECPA Number",                type: "text", placeholder: "Search SECPA number" },
    { key: "certificate_number",             label: "Certificate Number",          type: "text", placeholder: "Search certificate number" },
    { key: "certificate_validity",           label: "Certificate Validity",        type: "text", placeholder: "Search certificate validity" },
    { key: "decision",                       label: "Decision",                    type: "text", placeholder: "Search decision" },
    { key: "processed_time",                 label: "Processed Time",              type: "text", placeholder: "Search processed time" },
    { key: "timeline",                       label: "Timeline",                    type: "text", placeholder: "Search timeline" },
    { key: "remarks",                        label: "Remarks",                     type: "text", placeholder: "Search remarks" },
    { key: "product_line",                   label: "Product Line",                type: "text", placeholder: "Search product line" },
  ];

  const columnDateFields = [
    { key: "released_date_from", label: "Released Date From", type: "date" },
    { key: "released_date_to",   label: "Released Date To",   type: "date" },
    { key: "end_date_from",      label: "End Date From",      type: "date" },
    { key: "end_date_to",        label: "End Date To",        type: "date" },
    { key: "date_printed_from",  label: "Date Printed From",  type: "date" },
    { key: "date_printed_to",    label: "Date Printed To",    type: "date" },
    { key: "compliance_docs_date_received_from", label: "Compliance Docs Date From", type: "date" },
    { key: "compliance_docs_date_received_to",   label: "Compliance Docs Date To",   type: "date" },
  ];

  const renderFieldGrid = (list) => (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
      gap: 12,
    }}>
      {list.map((f) => (
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
  );

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
          {renderFieldGrid(fields)}

          <div style={{
            fontSize: "0.62rem", fontWeight: 800, textTransform: "uppercase",
            letterSpacing: "0.06em", color: colors.textTertiary, margin: "18px 0 12px",
          }}>
            Column Filters
          </div>
          {renderFieldGrid(columnFields)}

          <div style={{
            fontSize: "0.62rem", fontWeight: 800, textTransform: "uppercase",
            letterSpacing: "0.06em", color: colors.textTertiary, margin: "18px 0 12px",
          }}>
            Column Date Filters
          </div>
          {renderFieldGrid(columnDateFields)}

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
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
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

function GMPTransmittalModal({ open, count, generating, onGenerate, onClose, colors, darkMode }) {
  if (!open) return null;

  return createPortal(
    <div
      onClick={() => !generating && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 10001,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 14,
          padding: "2rem",
          width: 380,
          maxWidth: "90%",
          boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
        }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.75rem", textAlign: "center" }}>📄</div>
        <h3 style={{
          margin: "0 0 0.5rem", color: colors.textPrimary,
          fontSize: "1.05rem", fontWeight: 700, textAlign: "center",
        }}>
          Generate Transmittal
        </h3>
        <p style={{ margin: "0 0 1.5rem", color: colors.textTertiary, fontSize: "0.85rem", textAlign: "center" }}>
          Choose format for{" "}
          <strong style={{ color: ACCENT }}>{count}</strong>{" "}
          selected application{count > 1 ? "s" : ""}.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {[
            { fmt: "pdf",   label: "📕 PDF only",         bg: "linear-gradient(135deg,#dc2626,#b91c1c)" },
            { fmt: "excel", label: "📗 Excel only",        bg: "linear-gradient(135deg,#16a34a,#15803d)" },
            { fmt: "both",  label: "📄 Both PDF & Excel",  bg: "linear-gradient(135deg,#1976d2,#1565c0)" },
          ].map((b) => (
            <button
              key={b.fmt}
              onClick={() => onGenerate(b.fmt)}
              disabled={generating}
              style={{
                padding: "0.65rem 1rem", borderRadius: 8, border: "none",
                background: b.bg, color: "#fff", fontSize: "0.85rem", fontWeight: 700,
                cursor: generating ? "not-allowed" : "pointer",
                opacity: generating ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              }}>
              {b.label}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          disabled={generating}
          style={{
            marginTop: "1rem", width: "100%", padding: "0.5rem", borderRadius: 8,
            border: `1px solid ${colors.cardBorder}`, background: "transparent",
            color: colors.textTertiary, fontSize: "0.8rem", cursor: generating ? "not-allowed" : "pointer",
          }}>
          Cancel
        </button>
      </div>
    </div>,
    document.body
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
  // Persisted across sessions — a refresh or navigating back should leave
  // the Quick Filters sidebar exactly as the user last left it.
  const [collapsed,      setCollapsed]      = useState(
    () => localStorage.getItem("gmp_queue_quick_filters_collapsed") === "true"
  );
  useEffect(() => {
    localStorage.setItem("gmp_queue_quick_filters_collapsed", String(collapsed));
  }, [collapsed]);
  const [sortBy,         setSortBy]         = useState(DEFAULT_SORT_BY);
  const [sortOrder,      setSortOrder]      = useState(DEFAULT_SORT_ORDER);
  const [dblClickAction, setDblClickAction] = useState(
    () => localStorage.getItem("gmpQueueDblClickAction") || "viewInfo"
  );
  const [showDblClickConfig, setShowDblClickConfig] = useState(false);

  // Which table columns the user wants to see — persisted across sessions
  // so a refresh doesn't reset a deliberately trimmed-down view. Starts
  // with every column checked.
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const stored = localStorage.getItem("gmpQueueVisibleColumns");
      return stored ? JSON.parse(stored) : GMP_QUEUE_COLUMNS.map((c) => c.key);
    } catch { return GMP_QUEUE_COLUMNS.map((c) => c.key); }
  });
  useEffect(() => {
    localStorage.setItem("gmpQueueVisibleColumns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const toggleColumn = (key) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

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
  const [docsRecord, setDocsRecord] = useState(null);
  const [showTransmittalChoice, setShowTransmittalChoice] = useState(false);
  const [generatingTransmittal, setGeneratingTransmittal] = useState(false);

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

  // Filter/search/sort params shared between the paginated list fetch and
  // the "export everything matching the current view" button — keeping
  // these in one place means Export can never drift out of sync with what
  // the table is actually showing.
  const buildFilterParams = useCallback(() => ({
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
    ...(advFilters.type_of_issuance !== "all" && { type_of_issuance: advFilters.type_of_issuance }),
    ...(advFilters.lto_company && { lto_company: advFilters.lto_company }),
    ...(advFilters.uploaded_by && { uploaded_by: advFilters.uploaded_by }),
    ...(advFilters.upload_date_from && { upload_date_from: advFilters.upload_date_from }),
    ...(advFilters.upload_date_to && { upload_date_to: advFilters.upload_date_to }),
    ...(advFilters.date_received_from && { date_received_from: advFilters.date_received_from }),
    ...(advFilters.date_received_to && { date_received_to: advFilters.date_received_to }),
    ...(advFilters.reference_no && { reference_no: advFilters.reference_no }),
    ...(advFilters.lto_number && { lto_number: advFilters.lto_number }),
    ...(advFilters.address && { address: advFilters.address }),
    ...(advFilters.foreign_manufacturer && { foreign_manufacturer: advFilters.foreign_manufacturer }),
    ...(advFilters.foreign_manufacturer_address && { foreign_manufacturer_address: advFilters.foreign_manufacturer_address }),
    ...(advFilters.secpa_number && { secpa_number: advFilters.secpa_number }),
    ...(advFilters.certificate_number && { certificate_number: advFilters.certificate_number }),
    ...(advFilters.certificate_validity && { certificate_validity: advFilters.certificate_validity }),
    ...(advFilters.decision && { decision: advFilters.decision }),
    ...(advFilters.processed_time && { processed_time: advFilters.processed_time }),
    ...(advFilters.timeline && { timeline: advFilters.timeline }),
    ...(advFilters.remarks && { remarks: advFilters.remarks }),
    ...(advFilters.product_line && { product_line: advFilters.product_line }),
    ...(advFilters.released_date_from && { released_date_from: advFilters.released_date_from }),
    ...(advFilters.released_date_to && { released_date_to: advFilters.released_date_to }),
    ...(advFilters.end_date_from && { end_date_from: advFilters.end_date_from }),
    ...(advFilters.end_date_to && { end_date_to: advFilters.end_date_to }),
    ...(advFilters.date_printed_from && { date_printed_from: advFilters.date_printed_from }),
    ...(advFilters.date_printed_to && { date_printed_to: advFilters.date_printed_to }),
    ...(advFilters.compliance_docs_date_received_from && { compliance_docs_date_received_from: advFilters.compliance_docs_date_received_from }),
    ...(advFilters.compliance_docs_date_received_to && { compliance_docs_date_received_to: advFilters.compliance_docs_date_received_to }),
  }), [search, topTab, view, duplicatesOnly, activeQuick, advFilters, sortBy, sortOrder]);

  // Load records
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize, ...buildFilterParams() };
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
  }, [page, pageSize, buildFilterParams]);

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (exporting || total === 0) return;
    setExporting(true);
    try {
      await exportFilteredGMPRecords(buildFilterParams());
    } catch (e) {
      console.error("Failed to export GMP records", e);
      alert("Failed to export records. Check that the backend is running.");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Column-header sorting (QueueTable) — clicking an unsorted/different
  // column sorts it ascending; clicking the already-active column flips
  // asc/desc. `sortBy`/`sortOrder` already feed the backend query (see
  // buildFilterParams), so this is purely wiring a UI trigger onto state
  // that was already being sent — no backend changes needed.
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Explicit reset — the ✕ next to QueueTable's active sort arrow — since
  // clicking a header only toggles asc/desc and never lands back on "no
  // sort applied" on its own.
  const handleResetSort = () => {
    setSortBy(DEFAULT_SORT_BY);
    setSortOrder(DEFAULT_SORT_ORDER);
    setPage(1);
  };

  const handleSidebarSelect = (key, value) => {
    setActiveQuick((prev) => ({
      ...prev,
      // Clicking the already-active item or "All" resets to "all"
      // Clicking a different item selects it (radio behaviour — 1 per group)
      [key]: prev[key] === value || value === "all" ? "all" : value,
    }));
    // est_category/transaction_type/type_of_issuance also exist as Advanced
    // filter fields — an Advanced value silently overrides the same key in
    // fetchRecords' param spread, so a sidebar click here would highlight as
    // active but have no effect on the actual results unless the Advanced
    // value is cleared too (mirrors what applyAdvanced does in the other
    // direction).
    if (key === "est_category" || key === "transaction_type" || key === "type_of_issuance") {
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
      ...(advDraft.type_of_issuance !== "all" && { type_of_issuance: "all" }),
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

  const handleGenerateTransmittal = async (format = "both") => {
    const selectedData = rows.filter((r) => selected.includes(r.id));
    if (!selectedData.length) return;
    setGeneratingTransmittal(true);
    try {
      if (format === "pdf") {
        await generateGMPTransmittalPDF(selectedData, topTab);
      } else if (format === "excel") {
        await generateGMPTransmittalExcel(selectedData, topTab);
      } else {
        await generateGMPTransmittal(selectedData, topTab);
      }
    } catch (err) {
      console.error("GMP transmittal generation failed:", err);
      alert("Failed to generate transmittal. Please try again or reduce the number of selected records.");
    } finally {
      setGeneratingTransmittal(false);
      setShowTransmittalChoice(false);
    }
  };

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
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
        padding: "6px 8px 8px", gap: 8, boxSizing: "border-box", minWidth: 0,
      }}>
        {/* Toolbar card — top bar + search share one soft, rounded surface
            instead of flush bars butted against the viewport edge. Record
            count/filters live with the table below instead (its own card),
            since that row is really the table's header, not toolbar chrome. */}
        <div style={{
          borderRadius: 14, overflow: "hidden", boxShadow: colors.cardShadow,
          flexShrink: 0,
        }}>
        {/* Top bar */}
        <div style={{
          padding: "9px 14px", borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 8, background: colors.cardBg, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 1, minWidth: 0 }}>
            <TopTabs active={topTab} onChange={(v) => { setTopTab(v); setPage(1); setSelected([]); }}
              counts={counts} colors={colors} />

            {/* Main = one row per DTN (siblings rolled up); All = every
                reference number as its own row — the original behavior. */}
            <div style={{
              display: "flex", gap: 2, padding: 2, borderRadius: 9,
              background: darkMode ? "rgba(255,255,255,0.05)" : "#f1f5f9",
              flexShrink: 0,
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
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "5px 9px", fontSize: "0.7rem", fontWeight: isActive ? 700 : 500,
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
          <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
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
                padding: "7px 14px", fontSize: "0.75rem", fontWeight: 700,
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
                padding: "6px 11px", fontSize: "0.72rem", fontWeight: 700,
                fontFamily: FONT, borderRadius: 8, border: "none",
                background: ACCENT, color: "#fff",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                boxShadow: `0 2px 8px ${ACCENT}44`,
              }}
            >
              📤 Upload New Data
            </button>

            {/* Export */}
            <button
              onClick={handleExport}
              disabled={exporting || total === 0}
              style={{
                padding: "7px 13px", fontSize: "0.75rem", fontWeight: 600,
                fontFamily: FONT, borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
                background: "transparent", color: colors.textTertiary,
                cursor: exporting || total === 0 ? "not-allowed" : "pointer",
                opacity: exporting || total === 0 ? 0.6 : 1,
                display: "flex", alignItems: "center", gap: 5,
              }}>
              {exporting ? "⏳ Exporting…" : `📥 Export (${total.toLocaleString()})`}
            </button>
          </div>
        </div>

        {/* Search row */}
        <div style={{
          padding: "9px 14px",
          background: colors.cardBg, flexShrink: 0,
          display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
        }}>
          <div style={{ flex: "1 1 220px", minWidth: 180, position: "relative" }}>
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
        </div>
        {/* end toolbar card */}

        {/* Table card — record count/filters row is this card's header,
            directly above the table it describes, instead of living with
            the toolbar above. */}
        <div style={{
          flex: 1, overflow: "hidden", display: "flex", flexDirection: "column",
          background: colors.cardBg, borderRadius: 14, boxShadow: colors.cardShadow,
        }}>
        {/* Record count */}
        <div style={{
          padding: "9px 16px", borderBottom: `1px solid ${colors.divider}`,
          background: colors.cardBg, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: colors.textPrimary, flexShrink: 0 }}>
              FGMP Records{" "}
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

            {/* Toggle Columns — which of the 29 GMP fields actually render */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowColumnConfig((v) => !v)}
                title="Choose which columns to show"
                style={{
                  padding: "4px 9px", fontSize: "0.66rem", fontWeight: 600,
                  fontFamily: FONT, borderRadius: 6,
                  border: `1px solid ${showColumnConfig ? "#4CAF50" : colors.cardBorder}`,
                  background: showColumnConfig ? "rgba(76,175,80,0.1)" : "transparent",
                  color: showColumnConfig ? "#4CAF50" : colors.textTertiary,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                🧩 Columns{" "}
                <span style={{ fontSize: "0.68rem" }}>
                  {visibleColumns.length}/{GMP_QUEUE_COLUMNS.length}
                </span>
              </button>

              {showColumnConfig && (
                <>
                  <div onClick={() => setShowColumnConfig(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 9997 }} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0,
                    background: colors.cardBg, border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                    minWidth: 240, maxHeight: 340, overflowY: "auto", zIndex: 9998,
                  }}>
                    <div style={{
                      position: "sticky", top: 0, background: colors.cardBg,
                      padding: "8px 14px", fontSize: "0.6rem", fontWeight: 700,
                      color: colors.textTertiary, textTransform: "uppercase",
                      letterSpacing: "0.08em", borderBottom: `1px solid ${colors.cardBorder}`,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <span>Columns to show</span>
                      <span style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setVisibleColumns(GMP_QUEUE_COLUMNS.map((c) => c.key))}
                          style={{ border: "none", background: "transparent", color: "#4CAF50", fontSize: "0.6rem", fontWeight: 700, cursor: "pointer", padding: 0 }}>
                          All
                        </button>
                        <button onClick={() => setVisibleColumns([])}
                          style={{ border: "none", background: "transparent", color: "#ef4444", fontSize: "0.6rem", fontWeight: 700, cursor: "pointer", padding: 0 }}>
                          None
                        </button>
                      </span>
                    </div>
                    {GMP_QUEUE_COLUMNS.map((col) => {
                      const isChecked = visibleColumns.includes(col.key);
                      return (
                        <label key={col.key} onClick={() => toggleColumn(col.key)}
                          style={{
                            width: "100%", padding: "7px 14px",
                            borderTop: `1px solid ${colors.cardBorder}`,
                            display: "flex", alignItems: "center", gap: 8,
                            fontSize: "0.78rem", cursor: "pointer",
                            color: isChecked ? colors.textPrimary : colors.textTertiary,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = colors.badgeBg; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                          <input type="checkbox" checked={isChecked} readOnly style={{ cursor: "pointer", flexShrink: 0 }} />
                          <span>{col.label}</span>
                        </label>
                      );
                    })}
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

            {selected.length > 0 && topTab === "all" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontSize: "0.78rem", fontWeight: 700, color: ACCENT,
                background: "rgba(99,102,241,0.12)",
                border: `1px solid ${ACCENT}4d`,
                padding: "6px 14px", borderRadius: 99,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                ✔ {selected.length} selected
              </span>
              <button
                onClick={() => setShowTransmittalChoice(true)}
                style={{
                  padding: "8px 18px", fontSize: "0.8rem", fontWeight: 700,
                  fontFamily: FONT, borderRadius: 10, cursor: "pointer",
                  border: "none",
                  background: "linear-gradient(135deg,#1976d2,#1565c0)",
                  color: "#fff", display: "flex", alignItems: "center", gap: 7,
                  boxShadow: "0 3px 10px rgba(25,118,210,0.4)",
                  transition: "transform 0.12s, box-shadow 0.12s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 5px 14px rgba(25,118,210,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 3px 10px rgba(25,118,210,0.4)";
                }}>
                📄 Generate Transmittal
              </button>
            </div>
            )}
          </div>
        </div>

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
            onOpenDocuments={(r) => setDocsRecord(r)}
            onDoubleClickRow={handleDoubleClickRow}
            visibleColumns={visibleColumns}
            sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}
            isDefaultSort={sortBy === DEFAULT_SORT_BY && sortOrder === DEFAULT_SORT_ORDER}
            onResetSort={handleResetSort}
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
          onUpdated={fetchRecords}
          colors={colors} darkMode={darkMode}
        />
      )}
      {docsRecord && (
        <GMPDocumentsModal
          record={docsRecord}
          onClose={() => setDocsRecord(null)}
          colors={colors} darkMode={darkMode}
        />
      )}

      <GMPTransmittalModal
        open={showTransmittalChoice}
        count={selected.length}
        generating={generatingTransmittal}
        onGenerate={handleGenerateTransmittal}
        onClose={() => !generatingTransmittal && setShowTransmittalChoice(false)}
        colors={colors} darkMode={darkMode}
      />

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
