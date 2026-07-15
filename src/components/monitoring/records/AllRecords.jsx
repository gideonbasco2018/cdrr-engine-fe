// src/components/monitoring/records/AllRecords.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { getAllRecords } from "../../../api/monitoring";
import ReassignmentModal from "../../reports/actions/ReassignmentModal";
import RerouteModal from "../../reports/actions/RerouteModal";
import ViewDetailsModal from "../../reports/actions/ViewDetailsModal";
import { getUploadReports } from "../../../api/reports";
import { mapDataItem } from "../../reports/utils";
import ApplicationLogsModal from "../../tasks/ApplicationLogsModal";
import DoctrackModal from "../../reports/actions/DoctrackModal";

const FB = "#1877F2";

const timelineColors = {
  Within: { bg: "#dcfce7", color: "#15803d" },
  Beyond: { bg: "#fef2f2", color: "#b91c1c" },
};
const timelineColorsDark = {
  Within: { bg: "#0a2e1a", color: "#4ade80" },
  Beyond: { bg: "#2e0a0a", color: "#f87171" },
};

const avatarPalette = [
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#fce7f3", color: "#be185d" },
  { bg: "#d1fae5", color: "#065f46" },
  { bg: "#fef3c7", color: "#92400e" },
  { bg: "#ede9fe", color: "#5b21b6" },
  { bg: "#fee2e2", color: "#991b1b" },
  { bg: "#cffafe", color: "#0e7490" },
  { bg: "#fef9c3", color: "#713f12" },
];

const STEP_OPTIONS = [
  "Quality Evaluation",
  "S&E",
  "S&E Checker",
  "S&E Supervisor",
  "Compliance",
  "Checking",
  "Supervisor",
  "QA Admin",
  "LRD Chief Admin",
  "OD-Receiving",
  "OD-Releasing",
  "Releasing Officer",
];

const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => {
  const d = String(i + 1).padStart(2, "0");
  return { value: d, label: d };
});

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => {
  const y = String(CURRENT_YEAR - 5 + i);
  return { value: y, label: y };
});

function nameToAvatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarPalette[Math.abs(hash) % avatarPalette.length];
}

const PAGE_SIZE = 15;

// ── 3-dot Action Menu ─────────────────────────────────────────────────────────
function ActionMenu({ row, ui, darkMode, onAction }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const actions = [
    { key: "view", icon: "👁️", label: "View Details" },
    { key: "reassign", icon: "🔄", label: "Re-assign" },
    { key: "reroute", icon: "🔀", label: "Re-route" },
    { key: "applogs", icon: "📦", label: "Application Logs" },
    { key: "doctrack", icon: "📋", label: "Doctrack Details" },
  ];

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        style={{
          background: "transparent",
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 5,
          color: ui.textMuted,
          cursor: "pointer",
          padding: "2px 6px",
          fontSize: "0.9rem",
          lineHeight: 1,
          fontFamily: font,
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = ui.hoverBg;
          e.currentTarget.style.color = ui.textPrimary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = ui.textMuted;
        }}
        title="Actions"
      >
        ⋯
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 3px)",
            background: ui.cardBg,
            border: `1px solid ${ui.cardBorder}`,
            borderRadius: 7,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            zIndex: 9999,
            minWidth: 150,
            overflow: "hidden",
          }}
        >
          {actions.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onAction(key, row);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                width: "100%",
                padding: "7px 12px",
                background: "transparent",
                border: "none",
                color: ui.textPrimary,
                fontSize: "0.72rem",
                fontFamily: font,
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = ui.hoverBg)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span style={{ fontSize: "0.82rem" }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Map AllRecords row → modal record shape ───────────────────────────────────
function rowToRecord(row) {
  return {
    id: row.id,
    dtn: row.dtn,
    appStatus: row.app_status,
    mainDbId: row.id,
    prodBrName: row.drug_name,
    dateReceivedCent: row.date_received_cent,
    processingType: row.processing_type,
    estCat: row.est_cat,
    appType: row.app_type,
    ltoComp: row.lto_comp,
    ltoAdd: row.lto_add,
    eadd: row.eadd,
    tin: row.tin,
    contactNo: row.contact_no,
    ltoNo: row.lto_no,
    validity: row.validity,
    dateReceivedFdac: row.date_received_fdac,
    prodGenName: row.prod_gen_name,
    prodDosStr: row.prod_dos_str,
    prodDosForm: row.prod_dos_form,
    prodClassPrescript: row.prod_class_prescript,
    prodEssDrugList: row.prod_ess_drug_list,
    prodDistriShelfLife: row.prod_distri_shelf_life,
    prodPharmaCat: row.prod_pharma_cat,
    prodCat: row.prod_cat,
    pharmaProdCat: row.pharma_prod_cat,
    pharmaProdCatLabel: row.pharma_prod_cat_label,
    file: row.file,
    storageCond: row.storage_cond,
    packaging: row.packaging,
    suggRp: row.sugg_rp,
    noSample: row.no_sample,
    fee: row.fee,
    lrf: row.lrf,
    surc: row.surc,
    total: row.total,
    orNo: row.or_no,
    dateIssued: row.date_issued,
    prodManu: row.prod_manu,
    prodManuCountry: row.prod_manu_country,
    prodManuLtoNo: row.prod_manu_lto_no,
    prodManuTin: row.prod_manu_tin,
    prodManuAdd: row.prod_manu_add,
    prodTrader: row.prod_trader,
    prodTraderCountry: row.prod_trader_country,
    prodTraderLtoNo: row.prod_trader_lto_no,
    prodTraderTin: row.prod_trader_tin,
    prodTraderAdd: row.prod_trader_add,
    prodImporter: row.prod_importer,
    prodImporterCountry: row.prod_importer_country,
    prodImporterLtoNo: row.prod_importer_lto_no,
    prodImporterTin: row.prod_importer_tin,
    prodImporterAdd: row.prod_importer_add,
    prodDistri: row.prod_distri,
    prodDistriCountry: row.prod_distri_country,
    prodDistriLtoNo: row.prod_distri_lto_no,
    prodDistriTin: row.prod_distri_tin,
    prodDistriAdd: row.prod_distri_add,
    prodRepacker: row.prod_repacker,
    prodRepackerCountry: row.prod_repacker_country,
    prodRepackerLtoNo: row.prod_repacker_lto_no,
    prodRepackerTin: row.prod_repacker_tin,
    prodRepackerAdd: row.prod_repacker_add,
    regNo: row.reg_no,
    motherAppType: row.mother_app_type,
    oldRsn: row.old_rsn,
    certification: row.certification,
    class: row.class,
    mo: row.mo,
    ammend1: row.ammend1,
    ammend2: row.ammend2,
    ammend3: row.ammend3,
    dateDeck: row.date_deck,
    dateReleased: row.date_released,
    expiryDate: row.expiry_date,
    cprValidity: row.cpr_validity,
    dateRemarks: row.date_remarks,
    deckingSched: row.decking_sched,
    eval: row.eval,
    secpa: row.secpa,
    secpaExpDate: row.secpa_exp_date,
    secpaIssuedOn: row.secpa_issued_on,
    typeDocReleased: row.type_doc_released,
    attaReleased: row.atta_released,
    cprCond: row.cpr_cond,
    cprCondRemarks: row.cpr_cond_remarks,
    cprCondAddRemarks: row.cpr_cond_add_remarks,
    appRemarks: row.app_remarks,
    remarks1: row.remarks1,
    dbTimelineCitizenCharter: row.db_timeline_citizen_charter,
    userUploader: row.user_uploader,
    dateExcelUpload: row.date_excel_upload,
  };
}

const stepColors = {
  Decking: { bg: "#ede9fe", color: "#5b21b6" },
  Checking: { bg: "#dbeafe", color: "#1d4ed8" },
  "Quality Evaluation": { bg: "#fef3c7", color: "#92400e" },
  Releasing: { bg: "#dcfce7", color: "#15803d" },
  Encoding: { bg: "#fce7f3", color: "#be185d" },
};
const stepColorsDark = {
  Decking: { bg: "#2e1a4a", color: "#c4b5fd" },
  Checking: { bg: "#0a1e3a", color: "#93c5fd" },
  "Quality Evaluation": { bg: "#2a1f00", color: "#fde68a" },
  Releasing: { bg: "#0a2e1a", color: "#4ade80" },
  Encoding: { bg: "#2e0a1a", color: "#f9a8d4" },
};

// ── DTN Date Range sub-component ──────────────────────────────────────────────
function DtnDateSide({
  label,
  year,
  month,
  day,
  onYearChange,
  onMonthChange,
  onDayChange,
  active,
  darkMode,
  ui,
  inputSt,
  font,
}) {
  const accentColor = "#1877F2";
  const tinySelect = {
    ...inputSt,
    padding: "2px 4px",
    fontSize: "0.64rem",
    cursor: "pointer",
    height: 22,
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      <span
        style={{
          fontSize: "0.54rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: active ? accentColor : ui.textMuted,
          fontFamily: font,
          minWidth: 24,
        }}
      >
        {label}
      </span>
      <select
        value={year}
        onChange={(e) => onYearChange(e.target.value)}
        style={{ ...tinySelect, width: 68 }}
        title="Year"
      >
        <option value="">Year</option>
        {YEAR_OPTIONS.map(({ value, label: lbl }) => (
          <option key={value} value={value}>
            {lbl}
          </option>
        ))}
      </select>
      <select
        value={month}
        onChange={(e) => onMonthChange(e.target.value)}
        disabled={!year}
        title="Month"
        style={{
          ...tinySelect,
          width: 86,
          opacity: year ? 1 : 0.45,
          cursor: year ? "pointer" : "not-allowed",
        }}
      >
        <option value="">Month</option>
        {MONTH_OPTIONS.map(({ value, label: lbl }) => (
          <option key={value} value={value}>
            {lbl}
          </option>
        ))}
      </select>
      <select
        value={day}
        onChange={(e) => onDayChange(e.target.value)}
        disabled={!month}
        title="Day"
        style={{
          ...tinySelect,
          width: 56,
          opacity: month ? 1 : 0.45,
          cursor: month ? "pointer" : "not-allowed",
        }}
      >
        <option value="">Day</option>
        {DAY_OPTIONS.map(({ value, label: lbl }) => (
          <option key={value} value={value}>
            {lbl}
          </option>
        ))}
      </select>
    </div>
  );
}

function buildDtnPrefix(year, month, day, side) {
  if (!year) return "";
  const m = month || (side === "from" ? "01" : "12");
  const d = day || (side === "from" ? "01" : "31");
  return `${year}${m}${d}`;
}

function dtnSideLabel(year, month, day) {
  if (!year) return null;
  const monthLabel = month
    ? MONTH_OPTIONS.find((m) => m.value === month)?.label
    : null;
  return [year, monthLabel, day ? `Day ${day}` : null]
    .filter(Boolean)
    .join(" · ");
}

export default function AllRecords({
  ui,
  darkMode,
  filterUserId = null,
  statusFilter = "all",
}) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const colHdr = darkMode ? ui.sidebarBg : "#f8f9fd";

  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  const [dtnSearch, setDtnSearch] = useState("");
  const [dtnInput, setDtnInput] = useState("");
  const [stepFilter, setStepFilter] = useState("");
  const [localStatusFilter, setLocalStatusFilter] = useState("");

  const [dtnFromYear, setDtnFromYear] = useState("");
  const [dtnFromMonth, setDtnFromMonth] = useState("");
  const [dtnFromDay, setDtnFromDay] = useState("");
  const [dtnToYear, setDtnToYear] = useState("");
  const [dtnToMonth, setDtnToMonth] = useState("");
  const [dtnToDay, setDtnToDay] = useState("");

  const [modalLoading, setModalLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDtnSearch(dtnInput), 400);
    return () => clearTimeout(t);
  }, [dtnInput]);

  const dtnDateFrom = buildDtnPrefix(
    dtnFromYear,
    dtnFromMonth,
    dtnFromDay,
    "from",
  );
  const dtnDateTo = buildDtnPrefix(dtnToYear, dtnToMonth, dtnToDay, "to");
  const rangeActive = !!(dtnDateFrom || dtnDateTo);

  const handleAction = async (actionKey, row) => {
    if (actionKey === "view") {
      setSelectedRecord(rowToRecord(row));
      setActiveModal("view");
      setModalLoading(true);
      try {
        const result = await getUploadReports({
          dtn: row.dtn,
          page: 1,
          pageSize: 1,
        });
        if (result?.data?.[0]) setSelectedRecord(mapDataItem(result.data[0]));
      } catch (err) {
        console.error("Failed to fetch full record:", err);
      } finally {
        setModalLoading(false);
      }
    } else {
      setSelectedRecord(rowToRecord(row));
      setActiveModal(actionKey);
    }
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setSelectedRecord(null);
  };

  const colors = {
    ...ui,
    cardBg: ui.cardBg,
    cardBorder: ui.cardBorder,
    textPrimary: ui.textPrimary,
    textTertiary: ui.textMuted,
    inputBg: ui.inputBg,
    inputBorder: ui.cardBorder,
  };

  const inputSt = {
    background: ui.inputBg,
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 6,
    padding: "3px 6px",
    fontSize: "0.68rem",
    color: ui.textPrimary,
    outline: "none",
    colorScheme: darkMode ? "dark" : "light",
    fontFamily: font,
  };

  const labelSt = {
    fontSize: "0.56rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
    marginBottom: 2,
    display: "block",
    fontFamily: font,
  };

  const btnStyle = (disabled) => ({
    background: "transparent",
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 4,
    color: disabled ? ui.textMuted : ui.textPrimary,
    cursor: disabled ? "not-allowed" : "pointer",
    padding: "1px 7px",
    fontSize: "0.72rem",
    fontFamily: font,
  });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
        sort_col: sortCol,
        sort_dir: sortDir,
      };
      if (filterUserId) params.user_id = filterUserId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (dtnSearch) params.dtn = dtnSearch;
      if (stepFilter) params.app_step = stepFilter;
      if (localStatusFilter) params.application_status = localStatusFilter;
      if (dtnDateFrom) params.dtn_date_from = dtnDateFrom;
      if (dtnDateTo) params.dtn_date_to = dtnDateTo;

      const data = await getAllRecords(params);
      setRecords(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    sortCol,
    sortDir,
    filterUserId,
    dateFrom,
    dateTo,
    dtnSearch,
    stepFilter,
    localStatusFilter,
    dtnDateFrom,
    dtnDateTo,
  ]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    setPage(1);
  }, [
    dateFrom,
    dateTo,
    sortCol,
    sortDir,
    filterUserId,
    statusFilter,
    dtnSearch,
    stepFilter,
    dtnDateFrom,
    dtnDateTo,
  ]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  useEffect(() => {
    if (statusFilter === "completed") setLocalStatusFilter("COMPLETED");
    else if (statusFilter === "in_progress")
      setLocalStatusFilter("IN PROGRESS");
    else setLocalStatusFilter("");
    setPage(1);
  }, [statusFilter, filterUserId]);

  const SortArrow = ({ col }) => {
    const active = sortCol === col;
    return (
      <span
        style={{
          marginLeft: 2,
          fontSize: "0.58rem",
          opacity: active ? 1 : 0.3,
          color: FB,
        }}
      >
        {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    );
  };

  const handleGenerateReport = async () => {
    if (total === 0 || loading || reportLoading) return;

    setReportLoading(true);
    try {
      const BATCH = 500;
      const totalBatches = Math.ceil(total / BATCH);
      let allRows = [];

      for (let p = 1; p <= totalBatches; p++) {
        const params = {
          page: p,
          page_size: BATCH,
          sort_col: sortCol,
          sort_dir: sortDir,
        };
        if (filterUserId) params.user_id = filterUserId;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        if (dtnSearch) params.dtn = dtnSearch;
        if (stepFilter) params.app_step = stepFilter;
        if (localStatusFilter) params.application_status = localStatusFilter;
        if (dtnDateFrom) params.dtn_date_from = dtnDateFrom;
        if (dtnDateTo) params.dtn_date_to = dtnDateTo;

        const data = await getAllRecords(params);
        allRows = allRows.concat(data.data || []);
      }

      // Helper: format date nicely (e.g. "Jul 4, 2025")
      const formatDate = (raw) => {
        if (!raw) return "";
        try {
          return new Date(raw + "T00:00:00").toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } catch {
          return raw;
        }
      };

      // Helper: escape CSV cell; prefix numbers-only strings with tab to prevent
      // Excel from converting them to scientific notation
      const csvCell = (val) => {
        const str = String(val ?? "");
        // If the value is purely numeric and long (like DTN), force text in Excel
        const forceText = /^\d{10,}$/.test(str);
        const escaped = (forceText ? "\t" + str : str).replace(/"/g, '""');
        return `"${escaped}"`;
      };

      const headers = [
        "DTN",
        "Username",
        "Full Name",
        "Drug / Application",
        "Date Received",
        "Step",
        "Timeline",
        "Status",
      ];

      const csvRows = allRows.map((r) => [
        csvCell(r.dtn || ""),
        csvCell(r.user_name || ""),
        csvCell(r.full_name || ""),
        csvCell(r.drug_name || ""),
        csvCell(formatDate(r.date_received_cent)),
        csvCell(r.app_step || ""),
        csvCell(r.timeline || ""),
        csvCell(r.app_status || ""),
      ]);

      const headerRow = headers.map((h) => `"${h}"`).join(",");
      const dataRows = csvRows.map((row) => row.join(","));
      const csvContent = [headerRow, ...dataRows].join("\n");

      // UTF-8 BOM so Excel opens it correctly without encoding issues
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `records_report_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate report:", err);
    } finally {
      setReportLoading(false);
    }
  };

  const handleReset = () => {
    setDateFrom("");
    setDateTo("");
    setDtnInput("");
    setDtnSearch("");
    setStepFilter("");
    setLocalStatusFilter("");
    setSortCol("date");
    setSortDir("desc");
    setPage(1);
    setDtnFromYear("");
    setDtnFromMonth("");
    setDtnFromDay("");
    setDtnToYear("");
    setDtnToMonth("");
    setDtnToDay("");
  };

  const handleFromYearChange = (val) => {
    setDtnFromYear(val);
    if (!val) {
      setDtnFromMonth("");
      setDtnFromDay("");
    }
    setPage(1);
  };
  const handleFromMonthChange = (val) => {
    setDtnFromMonth(val);
    if (!val) setDtnFromDay("");
    setPage(1);
  };
  const handleToYearChange = (val) => {
    setDtnToYear(val);
    if (!val) {
      setDtnToMonth("");
      setDtnToDay("");
    }
    setPage(1);
  };
  const handleToMonthChange = (val) => {
    setDtnToMonth(val);
    if (!val) setDtnToDay("");
    setPage(1);
  };

  const TL = darkMode ? timelineColorsDark : timelineColors;
  const SP = darkMode ? stepColorsDark : stepColors;

  const GRID = "1.4fr 1.1fr 1.8fr 0.95fr 0.85fr 1fr 0.9fr 0.85fr 0.5fr";

  const fromLabel = dtnSideLabel(dtnFromYear, dtnFromMonth, dtnFromDay);
  const toLabel = dtnSideLabel(dtnToYear, dtnToMonth, dtnToDay);
  const dtnRangeFooterLabel = (() => {
    if (!fromLabel && !toLabel) return null;
    if (fromLabel && toLabel) return `${fromLabel} → ${toLabel}`;
    if (fromLabel) return `From ${fromLabel}`;
    return `To ${toLabel}`;
  })();

  return (
    <>
      <div
        style={{
          flex: "1 1 360px",
          minWidth: 300,
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 110px)",
          maxHeight: "calc(100vh - 110px)",
        }}
      >
        <p
          style={{
            fontSize: "0.8rem",
            fontWeight: 700,
            color: ui.textPrimary,
            margin: "0 0 6px",
            fontFamily: font,
          }}
        >
          All Records
        </p>

        <div
          style={{
            background: ui.cardBg,
            border: `1px solid ${ui.cardBorder}`,
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {/* ══ Filter Bar Row 1 ═══════════════════════════════════════════ */}
          <div
            style={{
              padding: "6px 12px",
              borderBottom: `1px solid ${ui.divider}`,
              background: colHdr,
              display: "flex",
              gap: 6,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            {/* DTN */}
            <div>
              <label style={labelSt}>DTN</label>
              <input
                type="text"
                placeholder="Search DTN…"
                value={dtnInput}
                onChange={(e) => setDtnInput(e.target.value)}
                style={{ ...inputSt, width: 120 }}
              />
            </div>

            {/* Step */}
            <div>
              <label style={labelSt}>Step</label>
              <select
                value={stepFilter}
                onChange={(e) => setStepFilter(e.target.value)}
                style={{ ...inputSt, paddingRight: 20, cursor: "pointer" }}
              >
                <option value="">All Steps</option>
                {STEP_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label style={labelSt}>Status</label>
              <select
                value={localStatusFilter}
                onChange={(e) => setLocalStatusFilter(e.target.value)}
                style={{ ...inputSt, paddingRight: 20, cursor: "pointer" }}
              >
                <option value="">All Status</option>
                <option value="COMPLETED">Completed</option>
                <option value="IN PROGRESS">In Progress</option>
              </select>
            </div>

            {/* Date range */}
            {[
              { label: "From", val: dateFrom, set: setDateFrom },
              { label: "To", val: dateTo, set: setDateTo },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label style={labelSt}>{label}</label>
                <input
                  type="date"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  style={inputSt}
                />
              </div>
            ))}

            <button
              onClick={handleReset}
              style={{
                padding: "5px 12px",
                fontSize: "0.66rem",
                fontWeight: 500,
                borderRadius: 6,
                border: `1px solid ${ui.cardBorder}`, // ← gray border
                background: ui.progressBg, // ← light gray background
                color: ui.textMuted, // ← gray text
                cursor: "pointer",
                fontFamily: font,
                alignSelf: "flex-end",
              }}
            >
              Reset
            </button>

            <button
              onClick={handleGenerateReport}
              disabled={total === 0 || loading || reportLoading}
              style={{
                padding: "5px 12px",
                fontSize: "0.66rem",
                fontWeight: 600,
                borderRadius: 6,
                border: `1px solid ${total === 0 || loading || reportLoading ? ui.cardBorder : FB}`,
                background:
                  total === 0 || loading || reportLoading ? ui.progressBg : FB,
                color:
                  total === 0 || loading || reportLoading
                    ? ui.textMuted
                    : "#fff",
                cursor:
                  total === 0 || loading || reportLoading
                    ? "not-allowed"
                    : "pointer",
                fontFamily: font,
                alignSelf: "flex-end",
                display: "flex",
                alignItems: "center",
                gap: 5,
                opacity: total === 0 || loading || reportLoading ? 0.6 : 1,
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
              title={`Export all ${total.toLocaleString()} filtered records as CSV`}
            >
              {reportLoading
                ? `⏳ Generating…`
                : `⬇ Generate Report (${total.toLocaleString()})`}
            </button>
          </div>

          {/* ══ Filter Bar Row 2: DTN Date Range ══════════════════════════ */}
          <div
            style={{
              borderBottom: `1px solid ${ui.divider}`,
              background: rangeActive
                ? darkMode
                  ? "#07121f"
                  : "#f5f9ff"
                : colHdr,
              transition: "background 0.2s",
              borderLeft: rangeActive
                ? `3px solid ${FB}`
                : `3px solid transparent`,
            }}
          >
            <div
              style={{
                padding: "4px 12px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "nowrap",
                overflowX: "auto",
              }}
              className="monitoring-scroll"
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: "0.56rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: rangeActive ? FB : ui.textMuted,
                    fontFamily: font,
                    whiteSpace: "nowrap",
                    transition: "color 0.15s",
                  }}
                >
                  DTN Date Range
                </span>
                <span
                  style={{
                    fontSize: "0.52rem",
                    color: rangeActive ? `${FB}cc` : ui.textMuted,
                    fontFamily: font,
                    whiteSpace: "nowrap",
                    fontWeight: 500,
                    opacity: rangeActive ? 1 : 0.6,
                  }}
                >
                  {rangeActive
                    ? dtnRangeFooterLabel
                    : "based on DTN digits 1–8"}
                </span>
              </div>

              <div
                style={{
                  width: 1,
                  height: 24,
                  background: ui.divider,
                  flexShrink: 0,
                }}
              />

              <DtnDateSide
                label="From"
                year={dtnFromYear}
                month={dtnFromMonth}
                day={dtnFromDay}
                onYearChange={handleFromYearChange}
                onMonthChange={handleFromMonthChange}
                onDayChange={(val) => {
                  setDtnFromDay(val);
                  setPage(1);
                }}
                active={!!dtnFromYear}
                darkMode={darkMode}
                ui={ui}
                inputSt={inputSt}
                font={font}
              />

              <span
                style={{
                  fontSize: "0.9rem",
                  color: rangeActive ? FB : ui.textMuted,
                  opacity: rangeActive ? 1 : 0.3,
                  transition: "all 0.2s",
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                →
              </span>

              <DtnDateSide
                label="To"
                year={dtnToYear}
                month={dtnToMonth}
                day={dtnToDay}
                onYearChange={handleToYearChange}
                onMonthChange={handleToMonthChange}
                onDayChange={(val) => {
                  setDtnToDay(val);
                  setPage(1);
                }}
                active={!!dtnToYear}
                darkMode={darkMode}
                ui={ui}
                inputSt={inputSt}
                font={font}
              />

              {rangeActive && (
                <button
                  onClick={() => {
                    setDtnFromYear("");
                    setDtnFromMonth("");
                    setDtnFromDay("");
                    setDtnToYear("");
                    setDtnToMonth("");
                    setDtnToDay("");
                    setPage(1);
                  }}
                  style={{
                    background: "transparent",
                    border: `1px solid ${FB}55`,
                    borderRadius: 4,
                    color: FB,
                    cursor: "pointer",
                    padding: "1px 7px",
                    fontSize: "0.64rem",
                    fontFamily: font,
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                  title="Clear DTN date range"
                >
                  ✕ Clear range
                </button>
              )}
            </div>
          </div>

          {/* ── Column Headers ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: GRID,
              background: colHdr,
              borderBottom: `1px solid ${ui.divider}`,
            }}
          >
            {[
              { label: "DTN", col: "dtn" },
              { label: "User", col: "user" },
              { label: "Drug / Application", col: "drug" },
              { label: "Date", col: "date" },
              { label: "Entry Type", col: "entry_type" },
              { label: "Step", col: "step" },
              { label: "Timeline", col: "timeline" },
              { label: "Status", col: "status" },
              { label: "Actions", col: null },
            ].map(({ label, col }) => (
              <span
                key={label}
                onClick={() => col && toggleSort(col)}
                style={{
                  fontSize: "0.56rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: col && sortCol === col ? FB : ui.textMuted,
                  textAlign: "center",
                  padding: "5px 8px",
                  cursor: col ? "pointer" : "default",
                  userSelect: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 0.15s",
                  fontFamily: font,
                }}
              >
                {label}
                {col && <SortArrow col={col} />}
              </span>
            ))}
          </div>

          {/* ── Table Body ── */}
          <div
            style={{ flex: 1, overflowY: "auto", minHeight: 0 }}
            className="monitoring-scroll"
          >
            {loading ? (
              <>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: GRID,
                      borderBottom: `1px solid ${ui.divider}`,
                      height: 42,
                      alignItems: "center",
                    }}
                  >
                    {/* DTN */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        padding: "5px 8px",
                      }}
                    >
                      <div
                        style={{
                          height: 9,
                          width: 90,
                          borderRadius: 4,
                          background: ui.progressBg,
                          animation: `skel-pulse 1.4s ease-in-out ${i * 0.06}s infinite`,
                        }}
                      />
                    </div>

                    {/* User */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 8px",
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: ui.progressBg,
                          flexShrink: 0,
                          animation: `skel-pulse 1.4s ease-in-out ${i * 0.06 + 0.04}s infinite`,
                        }}
                      />
                      <div
                        style={{
                          height: 8,
                          width: 70,
                          borderRadius: 4,
                          background: ui.progressBg,
                          animation: `skel-pulse 1.4s ease-in-out ${i * 0.06 + 0.04}s infinite`,
                        }}
                      />
                    </div>

                    {/* Drug */}
                    <div
                      style={{
                        padding: "5px 8px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          height: 8,
                          borderRadius: 4,
                          background: ui.progressBg,
                          width: "85%",
                          animation: `skel-pulse 1.4s ease-in-out ${i * 0.06 + 0.08}s infinite`,
                        }}
                      />
                      <div
                        style={{
                          height: 7,
                          borderRadius: 4,
                          background: ui.progressBg,
                          width: "55%",
                          animation: `skel-pulse 1.4s ease-in-out ${i * 0.06 + 0.1}s infinite`,
                        }}
                      />
                    </div>

                    {/* Date */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        padding: "5px 8px",
                      }}
                    >
                      <div
                        style={{
                          height: 8,
                          width: 64,
                          borderRadius: 4,
                          background: ui.progressBg,
                          animation: `skel-pulse 1.4s ease-in-out ${i * 0.06 + 0.06}s infinite`,
                        }}
                      />
                    </div>

                    {/* Entry Type */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        padding: "5px 8px",
                      }}
                    >
                      <div
                        style={{
                          height: 18,
                          width: 60,
                          borderRadius: 6,
                          background: ui.progressBg,
                          animation: `skel-pulse 1.4s ease-in-out ${i * 0.06 + 0.07}s infinite`,
                        }}
                      />
                    </div>

                    {/* Step */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        padding: "5px 8px",
                      }}
                    >
                      <div
                        style={{
                          height: 18,
                          width: 72,
                          borderRadius: 99,
                          background: ui.progressBg,
                          animation: `skel-pulse 1.4s ease-in-out ${i * 0.06 + 0.08}s infinite`,
                        }}
                      />
                    </div>

                    {/* Timeline */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        padding: "5px 8px",
                      }}
                    >
                      <div
                        style={{
                          height: 18,
                          width: 56,
                          borderRadius: 99,
                          background: ui.progressBg,
                          animation: `skel-pulse 1.4s ease-in-out ${i * 0.06 + 0.1}s infinite`,
                        }}
                      />
                    </div>

                    {/* Status */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        padding: "5px 8px",
                      }}
                    >
                      <div
                        style={{
                          height: 18,
                          width: 70,
                          borderRadius: 99,
                          background: ui.progressBg,
                          animation: `skel-pulse 1.4s ease-in-out ${i * 0.06 + 0.12}s infinite`,
                        }}
                      />
                    </div>

                    {/* Actions */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        padding: "5px 8px",
                      }}
                    >
                      <div
                        style={{
                          height: 20,
                          width: 24,
                          borderRadius: 4,
                          background: ui.progressBg,
                          animation: `skel-pulse 1.4s ease-in-out ${i * 0.06 + 0.14}s infinite`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </>
            ) : error ? (
              <div
                style={{
                  padding: "16px",
                  textAlign: "center",
                  color: "#e02020",
                  fontSize: "0.74rem",
                  fontFamily: font,
                }}
              >
                {error}
              </div>
            ) : records.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: ui.textMuted,
                  fontSize: "0.78rem",
                  fontFamily: font,
                }}
              >
                No records found
              </div>
            ) : (
              records.map((row, i) => {
                const tlStyle = TL[row.timeline] || {
                  bg: "#f3f4f6",
                  color: "#374151",
                };
                const av = nameToAvatarColor(row.user_name || "");

                const statusColors = {
                  COMPLETED: { bg: "#dcfce7", color: "#15803d" },
                  "IN PROGRESS": { bg: "#fef9c3", color: "#a16207" },
                };
                const statusColorsDark = {
                  COMPLETED: { bg: "#0a2e1a", color: "#4ade80" },
                  "IN PROGRESS": { bg: "#2a2000", color: "#fde68a" },
                };
                const statusKey = (row.app_status || "").toUpperCase();
                const sc = (darkMode ? statusColorsDark : statusColors)[
                  statusKey
                ] || { bg: "#f3f4f6", color: "#374151" };

                const stepKey = row.app_step || "";
                const spStyle = SP[stepKey] || {
                  bg: darkMode ? "#1e1e2e" : "#f3f4f6",
                  color: darkMode ? "#a0a0b0" : "#374151",
                };

                return (
                  <div
                    key={`${row.id}-${i}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: GRID,
                      borderBottom:
                        i < records.length - 1
                          ? `1px solid ${ui.divider}`
                          : "none",
                      transition: "background 0.12s",
                      height: 42,
                      alignItems: "center",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = ui.hoverBg)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {/* DTN */}
                    <span
                      style={{
                        fontSize: "0.62rem",
                        color: FB,
                        fontWeight: 700,
                        textAlign: "center",
                        padding: "5px 8px",
                        fontFamily: "monospace",
                        alignSelf: "center",
                      }}
                    >
                      {row.dtn || "—"}
                    </span>

                    {/* User */}
                    <span
                      style={{
                        fontSize: "0.66rem",
                        color: ui.textPrimary,
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 2,
                        padding: "5px 8px",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: av.color,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 90,
                            fontWeight: 700,
                          }}
                        >
                          {row.user_name || "—"}
                        </span>
                      </span>
                      {row.full_name && (
                        <span
                          style={{
                            fontSize: "0.56rem",
                            color: ui.textMuted,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 100,
                            fontWeight: 400,
                            lineHeight: 1.2,
                          }}
                        >
                          {row.full_name}
                        </span>
                      )}
                    </span>

                    {/* Drug */}
                    <span
                      title={row.drug_name || ""}
                      style={{
                        fontSize: "0.63rem",
                        color: ui.textSub,
                        padding: "5px 8px",
                        alignSelf: "center",
                        wordBreak: "break-word",
                        lineHeight: 1.4,
                        fontFamily: font,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {row.drug_name || "—"}
                    </span>

                    {/* Date */}
                    <span
                      style={{
                        fontSize: "0.66rem",
                        color: ui.textPrimary,
                        textAlign: "center",
                        padding: "5px 8px",
                        alignSelf: "center",
                        fontFamily: font,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.date_received_cent
                        ? new Date(
                            row.date_received_cent + "T00:00:00",
                          ).toLocaleDateString("en-PH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </span>

                    {/* Entry Type */}
                    <span
                      style={{
                        padding: "5px 8px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.6rem",
                          fontWeight: 600,
                          padding: "2px 7px",
                          borderRadius: 6,
                          background: darkMode ? "#2a2a3e" : "#eef2ff",
                          color: darkMode ? "#a5b4fc" : "#4338ca",
                          whiteSpace: "nowrap",
                          fontFamily: font,
                        }}
                      >
                        {row.entry_type || "—"}
                      </span>
                    </span>

                    {/* Step */}
                    <span
                      style={{
                        padding: "5px 8px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.57rem",
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 99,
                          background: spStyle.bg,
                          color: spStyle.color,
                          whiteSpace: "nowrap",
                          fontFamily: font,
                        }}
                      >
                        {row.app_step || "—"}
                      </span>
                    </span>

                    {/* Timeline */}
                    <span
                      style={{
                        padding: "5px 8px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.62rem",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: tlStyle.bg,
                          color: tlStyle.color,
                          whiteSpace: "nowrap",
                          fontFamily: font,
                        }}
                      >
                        {row.timeline || "—"}
                      </span>
                    </span>

                    {/* Status */}
                    <span
                      style={{
                        padding: "5px 8px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.62rem",
                          fontWeight: 600,
                          padding: "2px 7px",
                          borderRadius: 99,
                          background: sc.bg,
                          color: sc.color,
                          whiteSpace: "nowrap",
                          fontFamily: font,
                        }}
                      >
                        {row.app_status || "—"}
                      </span>
                    </span>

                    {/* Actions */}
                    <span
                      style={{
                        padding: "5px 8px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <ActionMenu
                        row={row}
                        ui={ui}
                        darkMode={darkMode}
                        onAction={handleAction}
                      />
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Footer / Pagination ── */}
          <div
            style={{
              padding: "5px 12px",
              borderTop: `1px solid ${ui.divider}`,
              background: colHdr,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "0.62rem",
                color: ui.textMuted,
                fontFamily: font,
              }}
            >
              {total} record{total !== 1 ? "s" : ""}
              {totalPages > 1 && (
                <span style={{ marginLeft: 5 }}>
                  · page {page} of {totalPages}
                </span>
              )}
              {dtnRangeFooterLabel && (
                <span
                  style={{
                    marginLeft: 7,
                    color: FB,
                    fontWeight: 600,
                    fontSize: "0.63rem",
                  }}
                >
                  · DTN: {dtnRangeFooterLabel}
                </span>
              )}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={btnStyle(page === 1)}
              >
                ‹
              </button>
              <span
                style={{
                  fontSize: "0.62rem",
                  color: ui.textMuted,
                  fontFamily: font,
                }}
              >
                {page} / {totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={btnStyle(page >= totalPages)}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {activeModal === "view" && selectedRecord && (
        <ViewDetailsModal
          record={selectedRecord}
          onClose={handleCloseModal}
          colors={colors}
          darkMode={darkMode}
          loading={modalLoading}
        />
      )}
      {activeModal === "reassign" && selectedRecord && (
        <ReassignmentModal
          record={selectedRecord}
          onClose={handleCloseModal}
          colors={colors}
          darkMode={darkMode}
        />
      )}
      {activeModal === "reroute" && selectedRecord && (
        <RerouteModal
          record={selectedRecord}
          onClose={handleCloseModal}
          colors={colors}
          darkMode={darkMode}
        />
      )}
      {activeModal === "applogs" && selectedRecord && (
        <ApplicationLogsModal
          record={selectedRecord}
          onClose={handleCloseModal}
          colors={colors}
          darkMode={darkMode}
        />
      )}
      {activeModal === "doctrack" && selectedRecord && (
        <DoctrackModal
          record={selectedRecord}
          onClose={handleCloseModal}
          colors={colors}
        />
      )}
    </>
  );
}
