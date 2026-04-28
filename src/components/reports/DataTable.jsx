// src/components/reports/DataTable.jsx
import { useState } from "react";
import { tableColumns } from "./tableColumns";
import TablePagination from "./TablePagination";
import DeckModal from "./actions/DeckModal";
import EvaluatorModal from "./actions/EvaluatorModal";
import ViewDetailsModal from "./actions/ViewDetailsModal";
import BulkDeckModal from "./actions/BulkDeckModal";
import DoctrackModal from "./actions/DoctrackModal";
import ApplicationLogsModal from "../tasks/ApplicationLogsModal";
import ChangeLogModal from "../tasks/ChangeLogModal";
import ReassignmentModal from "./actions/ReassignmentModal";
import RerouteModal from "./actions/RerouteModal";
import UpdateCPRModal from "./actions/UpdateCPRModal";

const COLUMN_DB_KEY_MAP = {
  processingType: "DB_PROCESSING_TYPE",
  dtn: "DB_DTN",
  estCat: "DB_EST_CAT",
  ltoComp: "DB_EST_LTO_COMP",
  ltoAdd: "DB_EST_LTO_ADD",
  eadd: "DB_EST_EADD",
  tin: "DB_EST_TIN",
  contactNo: "DB_EST_CONTACT_NO",
  ltoNo: "DB_EST_LTO_NO",
  validity: "DB_EST_VALIDITY",
  prodBrName: "DB_PROD_BR_NAME",
  prodGenName: "DB_PROD_GEN_NAME",
  prodDosStr: "DB_PROD_DOS_STR",
  prodDosForm: "DB_PROD_DOS_FORM",
  prodClassPrescript: "DB_PROD_CLASS_PRESCRIP",
  prodEssDrugList: "DB_PROD_ESS_DRUG_LIST",
  prodPharmaCat: "DB_PROD_PHARMA_CAT",
  prodManu: "DB_PROD_MANU",
  prodManuAdd: "DB_PROD_MANU_ADD",
  prodManuTin: "DB_PROD_MANU_TIN",
  prodManuLtoNo: "DB_PROD_MANU_LTO_NO",
  prodManuCountry: "DB_PROD_MANU_COUNTRY",
  prodTrader: "DB_PROD_TRADER",
  prodTraderAdd: "DB_PROD_TRADER_ADD",
  prodTraderTin: "DB_PROD_TRADER_TIN",
  prodTraderLtoNo: "DB_PROD_TRADER_LTO_NO",
  prodTraderCountry: "DB_PROD_TRADER_COUNTRY",
  prodRepacker: "DB_PROD_REPACKER",
  prodRepackerAdd: "DB_PROD_REPACKER_ADD",
  prodRepackerTin: "DB_PROD_REPACKER_TIN",
  prodRepackerLtoNo: "DB_PROD_REPACKER_LTO_NO",
  prodRepackerCountry: "DB_PROD_REPACKER_COUNTRY",
  prodImporter: "DB_PROD_IMPORTER",
  prodImporterAdd: "DB_PROD_IMPORTER_ADD",
  prodImporterTin: "DB_PROD_IMPORTER_TIN",
  prodImporterLtoNo: "DB_PROD_IMPORTER_LTO_NO",
  prodImporterCountry: "DB_PROD_IMPORTER_COUNTRY",
  prodDistri: "DB_PROD_DISTRI",
  prodDistriAdd: "DB_PROD_DISTRI_ADD",
  prodDistriTin: "DB_PROD_DISTRI_TIN",
  prodDistriLtoNo: "DB_PROD_DISTRI_LTO_NO",
  prodDistriCountry: "DB_PROD_DISTRI_COUNTRY",
  prodDistriShelfLife: "DB_PROD_DISTRI_SHELF_LIFE",
  storageCond: "DB_STORAGE_COND",
  packaging: "DB_PACKAGING",
  suggRp: "DB_SUGG_RP",
  noSample: "DB_NO_SAMPLE",
  expiryDate: "DB_EXPIRY_DATE",
  cprValidity: "DB_CPR_VALIDITY",
  regNo: "DB_REG_NO",
  appType: "DB_APP_TYPE",
  motherAppType: "DB_MOTHER_APP_TYPE",
  oldRsn: "DB_OLD_RSN",
  ammend1: "DB_AMMEND_1",
  ammend2: "DB_AMMEND_2",
  ammend3: "DB_AMMEND_3",
  prodCat: "DB_PROD_CAT",
  certification: "DB_CERTIFICATION",
  fee: "DB_FEE",
  lrf: "DB_LRF",
  surc: "DB_SURC",
  total: "DB_TOTAL",
  orNo: "DB_OR_NO",
  dateIssued: "DB_DATE_ISSUED",
  dateReceivedFdac: "DB_DATE_RECEIVED_FDAC",
  dateReceivedCent: "DB_DATE_RECEIVED_CENT",
  mo: "DB_MO",
  file: "DB_FILE",
  secpa: "DB_SECPA",
  secpaExpDate: "DB_SECPA_EXP_DATE",
  secpaIssuedOn: "DB_SECPA_ISSUED_ON",
  deckingSched: "DB_DECKING_SCHED",
  eval: "DB_EVAL",
  dateDeck: "DB_DATE_DECK",
  remarks1: "DB_REMARKS_1",
  dateRemarks: "DB_DATE_REMARKS",
  class: "DB_CLASS",
  dateReleased: "DB_DATE_RELEASED",
  typeDocReleased: "DB_TYPE_DOC_RELEASED",
  attaReleased: "DB_ATTA_RELEASED",
  cprCond: "DB_CPR_COND",
  cprCondRemarks: "DB_CPR_COND_REMARKS",
  cprCondAddRemarks: "DB_CPR_COND_ADD_REMARKS",
  appStatus: "DB_APP_STATUS",
  appRemarks: "DB_APP_REMARKS",
  dbTimelineCitizenCharter: "DB_TIMELINE_CITIZEN_CHARTER",
  userUploader: "DB_USER_UPLOADER",
  dateExcelUpload: "DB_DATE_EXCEL_UPLOAD",
};

export const TAB_ORDER = [
  { key: "not-decked", label: "Not Yet Decked" },
  { key: "decked", label: "Decked" },
  { key: "all", label: "All Reports" },
];

function DataTable({
  data,
  selectedRows,
  onSelectRow,
  onSelectAll,
  currentPage,
  rowsPerPage,
  totalRecords,
  totalPages,
  onPageChange,
  onRowsPerPageChange,
  colors,
  activeTab,
  onRefresh,
  onClearSelections,
  indexOfFirstRow,
  indexOfLastRow,
  onEdit,
  darkMode,
  onSort,
  sortBy,
  sortOrder,
  processingTypeTab,
  onProcessingTypeTabChange,
  availableProcessingTypes = [],
  updateUploadReport,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedRowDetails, setSelectedRowDetails] = useState(null);
  const [deckModalRecord, setDeckModalRecord] = useState(null);
  const [evaluatorModalRecord, setEvaluatorModalRecord] = useState(null);
  const [bulkDeckModalRecords, setBulkDeckModalRecords] = useState(null);
  const [doctrackModalRecord, setDoctrackModalRecord] = useState(null);
  const [appLogsRecord, setAppLogsRecord] = useState(null);
  const [changeLogRecord, setChangeLogRecord] = useState(null);
  const [reassignmentRecord, setReassignmentRecord] = useState(null);
  const [rerouteRecord, setRerouteRecord] = useState(null);
  const [cprUpdateRecord, setCprUpdateRecord] = useState(null);

  const isNotYetDeckedTab = activeTab === "not-decked";
  const showAppLogs = activeTab === "decked" || activeTab === "all";

  const handleOpenChangeLog = (row) => {
    setOpenMenuId(null);
    // i-map ang id → mainDbId kung wala pang mainDbId
    setChangeLogRecord({
      ...row,
      mainDbId: row.mainDbId ?? row.id,
    });
  };
  const getDbKey = (colKey) => COLUMN_DB_KEY_MAP[colKey] || colKey;

  const handleSort = (colKey) => {
    if (!onSort) return;
    if (colKey === "statusTimeline") return;
    const dbKey = getDbKey(colKey);
    if (sortBy === dbKey) {
      onSort(dbKey, sortOrder === "asc" ? "desc" : "asc");
    } else {
      onSort(dbKey, "asc");
    }
  };

  const SortIcon = ({ colKey }) => {
    if (colKey === "statusTimeline") return null;
    const dbKey = getDbKey(colKey);
    const isActive = sortBy === dbKey;
    return (
      <span
        style={{
          display: "inline-flex",
          flexDirection: "column",
          marginLeft: "4px",
          lineHeight: 1,
          verticalAlign: "middle",
          gap: "1px",
        }}
      >
        <span
          style={{
            fontSize: "0.48rem",
            lineHeight: 1,
            color:
              isActive && sortOrder === "asc" ? "#4CAF50" : colors.textTertiary,
            opacity: isActive && sortOrder === "asc" ? 1 : 0.3,
          }}
        >
          ▲
        </span>
        <span
          style={{
            fontSize: "0.48rem",
            lineHeight: 1,
            color:
              isActive && sortOrder === "desc"
                ? "#4CAF50"
                : colors.textTertiary,
            opacity: isActive && sortOrder === "desc" ? 1 : 0.3,
          }}
        >
          ▼
        </span>
      </span>
    );
  };

  const activeSortLabel = (() => {
    const entry = Object.entries(COLUMN_DB_KEY_MAP).find(
      ([, dbKey]) => dbKey === sortBy,
    );
    if (!entry) return sortBy;
    const col = tableColumns.find((c) => c.key === entry[0]);
    return col?.label || sortBy;
  })();

  const calculateStatusTimeline = (row) => {
    const {
      dateReceivedCent,
      dateReleased,
      dbTimelineCitizenCharter: timeline,
    } = row;
    if (
      !dateReceivedCent ||
      !timeline ||
      dateReceivedCent === "N/A" ||
      timeline === null
    )
      return { status: "", days: 0 };
    const receivedDate = new Date(dateReceivedCent);
    const endDate =
      dateReleased && dateReleased !== "N/A"
        ? new Date(dateReleased)
        : new Date();
    if (isNaN(receivedDate.getTime()) || isNaN(endDate.getTime()))
      return { status: "", days: 0 };
    const diffDays = Math.ceil(
      Math.abs(endDate - receivedDate) / (1000 * 60 * 60 * 24),
    );
    return diffDays <= parseInt(timeline, 10)
      ? { status: "WITHIN", days: diffDays }
      : { status: "BEYOND", days: diffDays };
  };

  const renderStatusTimelineBadge = (row) => {
    const { status, days } = calculateStatusTimeline(row);
    if (!status)
      return (
        <span style={{ color: colors.textTertiary, fontSize: "0.72rem" }}>
          N/A
        </span>
      );
    const isWithin = status === "WITHIN";
    return (
      <span
        style={{
          padding: "0.3rem 0.7rem",
          background: isWithin
            ? "linear-gradient(135deg,#10b981,#059669)"
            : "linear-gradient(135deg,#ef4444,#dc2626)",
          color: "#fff",
          borderRadius: "8px",
          fontSize: "0.72rem",
          fontWeight: "700",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          boxShadow: isWithin
            ? "0 2px 8px rgba(16,185,129,0.3)"
            : "0 2px 8px rgba(239,68,68,0.3)",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <span>{isWithin ? "✓" : "⚠"}</span>
        {isWithin ? `Within (${days}d)` : `Beyond (${days}d)`}
      </span>
    );
  };

  const renderProcessingTypeBadge = (value) => {
    if (!value || value === "N/A")
      return (
        <span style={{ color: colors.textTertiary, fontSize: "0.72rem" }}>
          N/A
        </span>
      );
    return (
      <span
        style={{
          padding: "0.25rem 0.6rem",
          background: "linear-gradient(135deg,#2196F3,#1976D2)",
          color: "#fff",
          borderRadius: "6px",
          fontSize: "0.72rem",
          fontWeight: "600",
          display: "inline-flex",
          alignItems: "center",
          whiteSpace: "nowrap",
          boxShadow: "0 2px 6px rgba(33,150,243,0.3)",
        }}
      >
        {value}
      </span>
    );
  };

  const handleMenuToggle = (e, rowId) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === rowId ? null : rowId);
  };
  const handleViewDetails = (row) => {
    setOpenMenuId(null);
    setSelectedRowDetails(row);
  };
  const handleOpenDeckModal = (row) => {
    setOpenMenuId(null);
    setDeckModalRecord(row);
  };
  const handleOpenEvaluatorModal = (row) => {
    setOpenMenuId(null);
    setEvaluatorModalRecord(row);
  };
  const handleOpenDoctrackModal = (row) => {
    setOpenMenuId(null);
    setDoctrackModalRecord(row);
  };
  const handleOpenAppLogs = (row) => {
    setOpenMenuId(null);
    setAppLogsRecord(row);
  };
  const handleEditClick = (row) => {
    setOpenMenuId(null);
    if (onEdit) onEdit(row);
  };
  const handleCloseDeckModal = () => setDeckModalRecord(null);
  const handleCloseEvaluatorModal = () => setEvaluatorModalRecord(null);
  const handleCloseDoctrackModal = () => setDoctrackModalRecord(null);
  const handleDeckSuccess = async () => {
    if (onRefresh) await onRefresh();
  };
  const handleEvaluationSuccess = async () => {
    if (onRefresh) await onRefresh();
  };

  const renderDTN = (dtn) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.3rem 0.7rem",
        background: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.72rem",
        fontWeight: "700",
        letterSpacing: "0.5px",
        boxShadow: "0 2px 8px rgba(8, 8, 8, 0.3)",
        whiteSpace: "nowrap",
      }}
    >
      {dtn || "N/A"}
    </span>
  );

  const renderGenericName = (genName) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.3rem 0.7rem",
        background: "linear-gradient(135deg,#06b6d4,#0891b2)",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.72rem",
        fontWeight: "700",
        boxShadow: "0 2px 8px rgba(6,182,212,0.3)",
      }}
    >
      <span>💊</span>
      <span>{genName || "N/A"}</span>
    </span>
  );

  const renderBrandName = (brandName) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.3rem 0.7rem",
        background: "linear-gradient(135deg,#f59e0b,#d97706)",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.72rem",
        fontWeight: "700",
        boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
      }}
    >
      <span>🏷️</span>
      <span>{brandName || "N/A"}</span>
    </span>
  );

  const renderTypeDocReleased = (typeDoc) => {
    const u = typeDoc?.toUpperCase();
    const pill = (bg, sh, icon) => (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.3rem 0.7rem",
          background: bg,
          color: "#fff",
          borderRadius: "8px",
          fontSize: "0.72rem",
          fontWeight: "700",
          boxShadow: `0 2px 8px ${sh}`,
        }}
      >
        <span>{icon}</span>
        <span>{typeDoc}</span>
      </span>
    );
    if (u?.includes("CPR"))
      return pill(
        "linear-gradient(135deg,#10b981,#059669)",
        "rgba(16,185,129,0.3)",
        "📜",
      );
    if (u?.includes("LOD"))
      return pill(
        "linear-gradient(135deg,#ef4444,#dc2626)",
        "rgba(239,68,68,0.3)",
        "📋",
      );
    if (u?.includes("CERT"))
      return pill(
        "linear-gradient(135deg,#3b82f6,#2563eb)",
        "rgba(59,130,246,0.3)",
        "🏆",
      );
    return (
      <span style={{ fontSize: "0.78rem", color: colors.tableText }}>
        {typeDoc || "N/A"}
      </span>
    );
  };

  const renderAppStatusBadge = (status) => {
    const u = status?.toUpperCase();
    const map = {
      COMPLETED: {
        bg: "linear-gradient(135deg,#10b981,#059669)",
        sh: "rgba(16,185,129,0.3)",
        icon: "✓",
        label: "Completed",
      },
      TO_DO: {
        bg: "linear-gradient(135deg,#f59e0b,#d97706)",
        sh: "rgba(245,158,11,0.3)",
        icon: "⏳",
        label: "To Do",
      },
      APPROVED: {
        bg: "linear-gradient(135deg,#3b82f6,#2563eb)",
        sh: "rgba(59,130,246,0.3)",
        icon: "✅",
        label: "Approved",
      },
      PENDING: {
        bg: "linear-gradient(135deg,#eab308,#ca8a04)",
        sh: "rgba(234,179,8,0.3)",
        icon: "⏸",
        label: "Pending",
      },
      REJECTED: {
        bg: "linear-gradient(135deg,#ef4444,#dc2626)",
        sh: "rgba(239,68,68,0.3)",
        icon: "✗",
        label: "Rejected",
      },
    };
    const c = map[u] || {
      bg: "linear-gradient(135deg,#6b7280,#4b5563)",
      sh: "rgba(107,114,128,0.3)",
      icon: "•",
      label: status || "N/A",
    };
    return (
      <span
        style={{
          padding: "0.3rem 0.7rem",
          background: c.bg,
          color: "#fff",
          borderRadius: "8px",
          fontSize: "0.72rem",
          fontWeight: "700",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          boxShadow: `0 2px 8px ${c.sh}`,
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <span>{c.icon}</span>
        {c.label}
      </span>
    );
  };

  const renderCell = (col, row) => {
    switch (col.key) {
      case "dtn":
        return renderDTN(row[col.key]);
      case "processingType":
        return renderProcessingTypeBadge(row[col.key]);
      case "prodGenName":
        return renderGenericName(row[col.key]);
      case "prodBrName":
        return renderBrandName(row[col.key]);
      case "appStatus":
        return renderAppStatusBadge(row[col.key]);
      case "statusTimeline":
        return renderStatusTimelineBadge(row);
      case "dbTimelineCitizenCharter":
        return row.dbTimelineCitizenCharter || "N/A";
      case "typeDocReleased":
        return renderTypeDocReleased(row[col.key]);
      default:
        return (
          <span style={{ fontSize: "0.78rem", color: colors.tableText }}>
            {row[col.key] ?? ""}
          </span>
        );
    }
  };

  const getFrozenThStyle = (col) => {
    if (!col.frozen) return {};
    return {
      position: "sticky",
      left: col.frozenLeft,
      background: col.headerBg || colors.tableBg,
      zIndex: 21,
      boxShadow: "2px 0 4px rgba(0,0,0,0.15)",
    };
  };

  const getFrozenTdStyle = (col, rowBg) => {
    if (!col.frozen) return {};
    return {
      position: "sticky",
      left: col.frozenLeft,
      background: rowBg,
      zIndex: 9,
      fontWeight: "600",
      boxShadow: "2px 0 4px rgba(0,0,0,0.15)",
    };
  };

  const subTabStyle = (isActive) => ({
    padding: "0.3rem 0.75rem",
    fontSize: "0.72rem",
    background: "transparent",
    border: "none",
    borderBottom: isActive ? "2px solid #2196F3" : "2px solid transparent",
    color: isActive ? colors.textPrimary : colors.textTertiary,
    fontWeight: isActive ? "600" : "400",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
  });

  const subTabBadgeStyle = (isActive) => ({
    padding: "0.1rem 0.4rem",
    background: isActive ? "#2196F3" : darkMode ? "#1f1f1f" : "#e5e5e5",
    color: isActive ? "#fff" : colors.textTertiary,
    borderRadius: "10px",
    fontSize: "0.65rem",
    fontWeight: "600",
  });

  const showSubTabs =
    availableProcessingTypes.length > 0 && onProcessingTypeTabChange;

  /* ── Generate Transmittal PDF ─────────────────────────────────────── */
  const handleGenerateTransmittal = async () => {
    if (!selectedRows.length) return;
    const loadScript = (src) =>
      new Promise((res, rej) => {
        if (document.querySelector(`script[src="${src}"]`)) return res();
        const s = document.createElement("script");
        s.src = src;
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
      });
    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    );
    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",
    );
    await loadScript(
      "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js",
    );
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const selectedData = data.filter((r) => selectedRows.includes(r.id));
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const generateBarcodeDataURL = (value) => {
      try {
        const canvas = document.createElement("canvas");
        window.JsBarcode(canvas, String(value), {
          format: "CODE128",
          width: 1.4,
          height: 14,
          displayValue: false,
          margin: 1,
          background: "#ffffff",
          lineColor: "#000000",
        });
        return canvas.toDataURL("image/png");
      } catch {
        return null;
      }
    };
    const barcodeImages = selectedData.map((r) =>
      generateBarcodeDataURL(r.dtn && r.dtn !== "N/A" ? r.dtn : "N/A"),
    );
    doc.setFillColor(25, 118, 210);
    doc.rect(0, 0, pageW, 16, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TRANSMITTAL SLIP", 10, 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("FDA Center for Drug Regulation and Research (CDRR)", 10, 13);
    doc.text(`Generated: ${dateStr}  ${timeStr}`, pageW - 10, 7, {
      align: "right",
    });
    doc.text(`Total records: ${selectedData.length}`, pageW - 10, 13, {
      align: "right",
    });
    const cols = [
      { header: "#", dataKey: "_no" },
      { header: "Barcode", dataKey: "_barcode" },
      { header: "Doctrack Number", dataKey: "dtn" },
      { header: "Category", dataKey: "estCat" },
      { header: "Applicant Company", dataKey: "ltoCompany" },
      { header: "Product Information", dataKey: "_productInfo" },
      { header: "Dosage Strength and Form", dataKey: "_dosage" },
      { header: "Registration No.", dataKey: "regNo" },
      { header: "App Type", dataKey: "_appTypeFull" },
      { header: "Date Received from FDAC", dataKey: "dateReceivedFdac" },
    ];
    const rows = selectedData.map((r, i) => {
      const brand =
        r.prodBrName && r.prodBrName !== "N/A" ? `Brand: ${r.prodBrName}` : "";
      const generic =
        r.prodGenName && r.prodGenName !== "N/A"
          ? `Generic: ${r.prodGenName}`
          : "";
      const productInfo = [brand, generic].filter(Boolean).join("\n") || "—";
      const strength =
        r.prodDosStr && r.prodDosStr !== "N/A" ? r.prodDosStr : "";
      const form =
        r.prodDosForm && r.prodDosForm !== "N/A" ? r.prodDosForm : "";
      const dosage = [strength, form].filter(Boolean).join(" / ") || "—";
      const amendments = [r.ammend1, r.ammend2, r.ammend3]
        .filter((a) => a && a !== "N/A" && a.trim() !== "")
        .join(" / ");
      const appTypeFull = [r.appType ?? "—", amendments]
        .filter(Boolean)
        .join("\n");
      return {
        _no: i + 1,
        _barcode: "",
        dtn: r.dtn ?? "—",
        estCat: r.estCat ?? "—",
        ltoCompany: r.ltoComp ?? "—",
        _productInfo: productInfo,
        _dosage: dosage,
        regNo: r.regNo ?? "—",
        _appTypeFull: appTypeFull,
        dateReceivedFdac: r.dateReceivedFdac ?? "—",
      };
    });
    const BARCODE_ROW_H = 10,
      BARCODE_IMG_W = 24,
      BARCODE_IMG_H = 5;
    doc.autoTable({
      startY: 18,
      columns: cols,
      body: rows,
      theme: "grid",
      styles: {
        fontSize: 6.5,
        cellPadding: 1.2,
        overflow: "linebreak",
        textColor: [30, 30, 30],
        minCellHeight: BARCODE_ROW_H,
        valign: "middle",
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [21, 101, 192],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 6.5,
        halign: "center",
        minCellHeight: 7,
        valign: "middle",
        cellPadding: 1,
      },
      alternateRowStyles: { fillColor: [240, 247, 255] },
      margin: { left: 6, right: 6 },
      columnStyles: {
        _no: { halign: "center", cellWidth: 7, valign: "middle" },
        _barcode: { cellWidth: 28, halign: "center", valign: "middle" },
        dtn: {
          cellWidth: 28,
          halign: "center",
          valign: "middle",
          fontStyle: "bold",
        },
        estCat: { cellWidth: 14, valign: "middle" },
        ltoCompany: { cellWidth: 42, valign: "middle" },
        _productInfo: { cellWidth: 48, valign: "middle" },
        _dosage: { cellWidth: 30, valign: "middle" },
        regNo: { cellWidth: 22, halign: "center", valign: "middle" },
        _appTypeFull: { cellWidth: 34, valign: "middle" },
        dateReceivedFdac: { cellWidth: 22, halign: "center", valign: "middle" },
      },
      didDrawCell: (hookData) => {
        if (
          hookData.section === "body" &&
          hookData.column.dataKey === "_barcode"
        ) {
          const imgData = barcodeImages[hookData.row.index];
          if (imgData) {
            const cell = hookData.cell;
            doc.addImage(
              imgData,
              "PNG",
              cell.x + (cell.width - BARCODE_IMG_W) / 2,
              cell.y + (cell.height - BARCODE_IMG_H) / 2,
              BARCODE_IMG_W,
              BARCODE_IMG_H,
            );
          }
        }
      },
    });
    const totalPagesCount = doc.internal.getNumberOfPages();
    for (let pg = 1; pg <= totalPagesCount; pg++) {
      doc.setPage(pg);
      doc.setFillColor(255, 255, 255);
      doc.rect(0, pageH - 8, pageW, 8, "F");
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(
        `Page ${pg} of ${totalPagesCount}  |  FDA CDRR Engine — Transmittal Slip`,
        pageW / 2,
        pageH - 3,
        { align: "center" },
      );
      doc.setTextColor(30, 30, 30);
    }
    doc.setPage(totalPagesCount);
    const finalY = doc.lastAutoTable.finalY + 6;
    if (finalY < pageH - 26) {
      let preparedBy = "";
      try {
        const raw =
          localStorage.getItem("user") || sessionStorage.getItem("user");
        if (raw) {
          const u = JSON.parse(raw);
          preparedBy = `${u.first_name || ""} ${u.surname || ""}`.trim();
        }
      } catch (_) {}
      if (!preparedBy) preparedBy = "___________________";
      doc.setDrawColor(160);
      doc.setLineWidth(0.25);
      const col1X = 14,
        col2X = pageW / 2 - 28,
        col3X = pageW - 70,
        baseY = finalY + 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 30, 30);
      doc.text("Prepared by/Date: ", col1X, baseY);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${preparedBy} / ${dateStr}`,
        col1X + doc.getTextWidth("Prepared by/Date: "),
        baseY,
      );
      doc.setFont("helvetica", "bold");
      doc.text("Received by Evaluator/Date:", col1X, baseY + 12);
      doc.setDrawColor(120);
      doc.line(col1X, baseY + 17, col1X + 65, baseY + 17);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      doc.text("MELODY M. ZAMUDIO, RPh, MGM-ESP", col2X, baseY + 5, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(60);
      doc.text("FDRO V/Chief, LRD", col2X, baseY + 10, { align: "center" });
      doc.text("Center for Drug Regulation and Research", col2X, baseY + 15, {
        align: "center",
      });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 30, 30);
      doc.text("NON-ACCEPTANCE AND SWITCHING", col3X, baseY + 10, {
        align: "center",
      });
      doc.text("REQUIRES PRIOR APPROVAL BY CHIEF LRD", col3X, baseY + 15, {
        align: "center",
      });
    }
    doc.save(`transmittal_reports_${now.toISOString().slice(0, 10)}.pdf`);
  };

  const thStyle = {
    padding: "0.65rem 0.85rem",
    textAlign: "left",
    fontSize: "0.6rem",
    fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: `1px solid ${colors.tableBorder}`,
    whiteSpace: "nowrap",
    background: colors.tableBg,
    cursor: "pointer",
    userSelect: "none",
    transition: "background 0.15s",
  };

  const tdStyle = {
    padding: "0.65rem 0.85rem",
    fontSize: "0.78rem",
    color: colors.tableText,
    borderBottom: `1px solid ${colors.tableBorder}`,
    whiteSpace: "normal",
    wordBreak: "break-word",
  };

  return (
    <>
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          overflow: "hidden",
          transition: "all 0.3s ease",
          display: "flex",
          flexDirection: "column",
          height: "85%",
          minHeight: "150px",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "0.75rem 1.25rem",
            borderBottom: `1px solid ${colors.tableBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <h3
              style={{
                fontSize: "0.8rem",
                fontWeight: "600",
                color: colors.textPrimary,
                margin: 0,
              }}
            >
              Data
            </h3>
            <span
              style={{
                padding: "0.2rem 0.6rem",
                background: colors.badgeBg,
                borderRadius: "12px",
                fontSize: "0.68rem",
                color: colors.textTertiary,
                fontWeight: "600",
              }}
            >
              {totalRecords} total records
            </span>
          </div>

          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            {sortBy && (
              <span
                style={{
                  fontSize: "0.68rem",
                  color: colors.textTertiary,
                  padding: "0.2rem 0.6rem",
                  background: colors.badgeBg,
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                Sorted by{" "}
                <strong style={{ color: "#4CAF50" }}>{activeSortLabel}</strong>
                <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
              </span>
            )}

            {selectedRows.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.4rem 0.85rem",
                  background: colors.badgeBg,
                  borderRadius: "8px",
                }}
              >
                <span
                  style={{
                    color: "#4CAF50",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                  }}
                >
                  {selectedRows.length} selected
                </span>

                {isNotYetDeckedTab && (
                  <button
                    onClick={() =>
                      setBulkDeckModalRecords(
                        data.filter((row) => selectedRows.includes(row.id)),
                      )
                    }
                    style={{
                      padding: "0.35rem 0.7rem",
                      background: "#4CAF50",
                      border: "none",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#45a049")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#4CAF50")
                    }
                  >
                    <span>🎯</span> Deck Applications
                  </button>
                )}

                <button
                  onClick={handleGenerateTransmittal}
                  style={{
                    padding: "0.35rem 0.7rem",
                    background: "linear-gradient(135deg,#1976d2,#1565c0)",
                    border: "none",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    boxShadow: "0 2px 8px rgba(25,118,210,0.35)",
                    transition: "box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.boxShadow =
                      "0 4px 14px rgba(25,118,210,0.5)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.boxShadow =
                      "0 2px 8px rgba(25,118,210,0.35)")
                  }
                >
                  <span>📄</span>
                  Generate Transmittal
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "1.1rem",
                      height: "1.1rem",
                      padding: "0 0.25rem",
                      background: "rgba(255,255,255,0.25)",
                      borderRadius: 999,
                      fontSize: "0.65rem",
                      fontWeight: 800,
                    }}
                  >
                    {selectedRows.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    if (
                      confirm(`Delete ${selectedRows.length} selected records?`)
                    )
                      alert("Delete functionality not yet implemented");
                  }}
                  style={{
                    padding: "0.35rem 0.7rem",
                    background: "#ef4444",
                    border: "none",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#dc2626")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#ef4444")
                  }
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Processing Type Sub-Tabs */}
        {showSubTabs && (
          <div
            style={{
              display: "flex",
              borderBottom: `1px solid ${colors.cardBorder}`,
              paddingLeft: "0.75rem",
              overflowX: "auto",
              flexShrink: 120,
              background: colors.cardBg,
            }}
          >
            <button
              onClick={() => onProcessingTypeTabChange(null)}
              style={subTabStyle(processingTypeTab === null)}
            >
              <span>All</span>
              <span style={subTabBadgeStyle(processingTypeTab === null)}>
                {totalRecords}
              </span>
            </button>
            {availableProcessingTypes.map((pt) => (
              <button
                key={pt.value}
                onClick={() => onProcessingTypeTabChange(pt.value)}
                style={subTabStyle(processingTypeTab === pt.value)}
              >
                <span>{pt.value}</span>
                <span style={subTabBadgeStyle(processingTypeTab === pt.value)}>
                  {pt.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Table */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowX: "auto",
            overflowY: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "2000px",
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                background: colors.tableBg,
                zIndex: 20,
              }}
            >
              <tr>
                <th
                  style={{
                    ...thStyle,
                    cursor: "default",
                    width: "50px",
                    position: "sticky",
                    left: 0,
                    background: colors.tableBg,
                    zIndex: 22,
                    boxShadow: "2px 0 4px rgba(0,0,0,0.15)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      selectedRows.length === data.length && data.length > 0
                    }
                    onChange={onSelectAll}
                    style={{
                      width: "16px",
                      height: "16px",
                      cursor: "pointer",
                      accentColor: "#4CAF50",
                    }}
                  />
                </th>
                <th
                  style={{
                    ...thStyle,
                    cursor: "default",
                    textAlign: "center",
                    width: "60px",
                    position: "sticky",
                    left: "50px",
                    background: colors.tableBg,
                    zIndex: 22,
                    boxShadow: "2px 0 4px rgba(0,0,0,0.15)",
                  }}
                >
                  #
                </th>
                {tableColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{
                      ...thStyle,
                      minWidth: col.width,
                      background: col.headerBg || colors.tableBg,
                      cursor:
                        col.key !== "statusTimeline" ? "pointer" : "default",
                      ...getFrozenThStyle(col),
                    }}
                    onMouseEnter={(e) => {
                      if (col.key !== "statusTimeline")
                        e.currentTarget.style.background = darkMode
                          ? "#1e1e1e"
                          : "#ebebeb";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        col.headerBg || colors.tableBg;
                    }}
                  >
                    <span
                      style={{ display: "inline-flex", alignItems: "center" }}
                    >
                      {col.label}
                      <SortIcon colKey={col.key} />
                    </span>
                  </th>
                ))}
                <th
                  style={{
                    ...thStyle,
                    cursor: "default",
                    textAlign: "center",
                    width: "80px",
                    position: "sticky",
                    right: 0,
                    background: colors.tableBg,
                    zIndex: 21,
                    boxShadow: "-4px 0 8px rgba(0,0,0,0.15)",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {data.map((row, index) => {
                const isSelected = selectedRows.includes(row.id);
                const rowBg = isSelected
                  ? "#4CAF5015"
                  : index % 2 === 0
                    ? colors.tableRowEven
                    : colors.tableRowOdd;

                return (
                  <tr
                    key={row.id}
                    style={{
                      background: rowBg,
                      transition: "background 0.2s",
                      borderLeft: isSelected
                        ? "3px solid #4CAF50"
                        : "3px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.background = colors.tableRowHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = rowBg;
                    }}
                  >
                    <td
                      style={{
                        padding: "0.65rem 0.85rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        position: "sticky",
                        left: 0,
                        background: rowBg,
                        zIndex: 10,
                        boxShadow: "2px 0 4px rgba(0,0,0,0.15)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectRow(row.id)}
                        style={{
                          width: "16px",
                          height: "16px",
                          cursor: "pointer",
                          accentColor: "#4CAF50",
                        }}
                      />
                    </td>
                    <td
                      style={{
                        padding: "0.65rem 0.85rem",
                        fontSize: "0.78rem",
                        fontWeight: "700",
                        color: colors.textTertiary,
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        textAlign: "center",
                        position: "sticky",
                        left: "50px",
                        background: rowBg,
                        zIndex: 10,
                        boxShadow: "2px 0 4px rgba(0,0,0,0.15)",
                      }}
                    >
                      {indexOfFirstRow + index}
                    </td>
                    {tableColumns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          ...tdStyle,
                          minWidth: col.width,
                          ...getFrozenTdStyle(col, rowBg),
                        }}
                      >
                        {renderCell(col, row)}
                      </td>
                    ))}
                    <td
                      style={{
                        padding: "0.65rem 0.85rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        textAlign: "center",
                        position: "sticky",
                        right: 0,
                        background: rowBg,
                        zIndex: openMenuId === row.id ? 9999 : 9,
                        boxShadow: "-4px 0 8px rgba(0,0,0,0.15)",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        <button
                          onClick={(e) => handleMenuToggle(e, row.id)}
                          style={{
                            padding: "0.4rem",
                            background: "transparent",
                            border: `1px solid ${colors.cardBorder}`,
                            borderRadius: "6px",
                            color: colors.textPrimary,
                            cursor: "pointer",
                            width: "28px",
                            height: "28px",
                            transition: "all 0.2s ease",
                          }}
                        >
                          ⋮
                        </button>

                        {openMenuId === row.id && (
                          <>
                            <div
                              onClick={() => setOpenMenuId(null)}
                              style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 9998,
                              }}
                            />
                            <div
                              style={{
                                position: "fixed",
                                right: "20px",
                                top: `${event.clientY}px`,
                                background: colors.cardBg,
                                border: `1px solid ${colors.cardBorder}`,
                                borderRadius: "8px",
                                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                                minWidth: "190px",
                                zIndex: 9999,
                                overflow: "visible",
                              }}
                            >
                              {isNotYetDeckedTab && (
                                <button
                                  onClick={() => handleOpenDeckModal(row)}
                                  style={{
                                    width: "100%",
                                    padding: "0.6rem 0.85rem",
                                    background: "transparent",
                                    border: "none",
                                    color: colors.textPrimary,
                                    fontSize: "0.78rem",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    transition: "background 0.2s",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                      colors.tableRowHover)
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background =
                                      "transparent")
                                  }
                                >
                                  <span>🎯</span>
                                  <span>Deck Application</span>
                                </button>
                              )}
                              {showAppLogs && (
                                <button
                                  onClick={() => handleOpenAppLogs(row)}
                                  style={{
                                    width: "100%",
                                    padding: "0.6rem 0.85rem",
                                    background: "transparent",
                                    border: "none",
                                    color: colors.textPrimary,
                                    fontSize: "0.78rem",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    transition: "background 0.2s",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                      colors.tableRowHover)
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background =
                                      "transparent")
                                  }
                                >
                                  <span>📦</span>
                                  <span>Application Log</span>
                                </button>
                              )}
                              {[
                                {
                                  label: "Change Log",
                                  icon: "🕓",
                                  handler: () => handleOpenChangeLog(row),
                                  color: colors.textPrimary,
                                  hoverBg: colors.tableRowHover,
                                },
                                {
                                  label: "Application Information",
                                  icon: "👁️",
                                  handler: () => handleViewDetails(row),
                                  color: colors.textPrimary,
                                  hoverBg: colors.tableRowHover,
                                },
                                {
                                  label: "Doctrack Details",
                                  icon: "📋",
                                  handler: () => handleOpenDoctrackModal(row),
                                  color: colors.textPrimary,
                                  hoverBg: colors.tableRowHover,
                                },

                                {
                                  label: "Update Application Info",
                                  icon: "✏️",
                                  handler: () => handleEditClick(row),
                                  color: "#2196F3",
                                  hoverBg: "rgba(33,150,243,0.1)",
                                },
                                {
                                  label: "Update based on CPR",
                                  icon: "📜",
                                  handler: () => {
                                    setOpenMenuId(null);
                                    setCprUpdateRecord(row);
                                  },
                                  color: "#1976d2",
                                  hoverBg: "rgba(25,118,210,0.1)",
                                },

                                ...(row.appStatus?.toUpperCase() !== "COMPLETED"
                                  ? [
                                      {
                                        label: "Application Re-assignment",
                                        icon: "🔄",
                                        handler: () => {
                                          setOpenMenuId(null);
                                          setReassignmentRecord(row);
                                        },
                                        color: "#7c3aed",
                                        hoverBg: "rgba(124,58,237,0.1)",
                                      },
                                      {
                                        label: "Application Re-route",
                                        icon: "🔀",
                                        handler: () => {
                                          setOpenMenuId(null);
                                          setRerouteRecord(row);
                                        },
                                        color: "#0891b2",
                                        hoverBg: "rgba(8,145,178,0.1)",
                                      },
                                    ]
                                  : []),

                                // {
                                //   label: "Delete",
                                //   icon: "🗑️",
                                //   handler: () => {
                                //     setOpenMenuId(null);
                                //     if (
                                //       confirm(
                                //         `Delete record for DTN: ${row.dtn}?`,
                                //       )
                                //     )
                                //       alert(
                                //         "Delete functionality not yet implemented",
                                //       );
                                //   },
                                //   color: "#ef4444",
                                //   hoverBg: "#ef444410",
                                // },
                              ].map((item) => (
                                <button
                                  key={item.label}
                                  onClick={item.handler}
                                  style={{
                                    width: "100%",
                                    padding: "0.6rem 0.85rem",
                                    background: "transparent",
                                    border: "none",
                                    borderTop: `1px solid ${colors.tableBorder}`,
                                    color: item.color,
                                    fontSize: "0.78rem",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    transition: "background 0.2s",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                      item.hoverBg)
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background =
                                      "transparent")
                                  }
                                >
                                  <span>{item.icon}</span>
                                  <span>{item.label}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div
          style={{
            flexShrink: 0,
            borderTop: `1px solid ${colors.tableBorder}`,
            background: colors.cardBg,
          }}
        >
          <TablePagination
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            totalRecords={totalRecords}
            totalPages={totalPages}
            indexOfFirstRow={indexOfFirstRow}
            indexOfLastRow={indexOfLastRow}
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
            colors={colors}
          />
        </div>
      </div>

      {deckModalRecord && (
        <DeckModal
          record={deckModalRecord}
          onClose={handleCloseDeckModal}
          onSuccess={handleDeckSuccess}
          colors={colors}
        />
      )}
      {evaluatorModalRecord && (
        <EvaluatorModal
          record={evaluatorModalRecord}
          onClose={handleCloseEvaluatorModal}
          onSuccess={handleEvaluationSuccess}
          colors={colors}
        />
      )}
      {doctrackModalRecord && (
        <DoctrackModal
          record={doctrackModalRecord}
          onClose={handleCloseDoctrackModal}
          colors={colors}
        />
      )}
      {selectedRowDetails && (
        <ViewDetailsModal
          record={selectedRowDetails}
          onClose={() => setSelectedRowDetails(null)}
          colors={colors}
          darkMode={darkMode}
        />
      )}
      {appLogsRecord && (
        <ApplicationLogsModal
          record={appLogsRecord}
          onClose={() => setAppLogsRecord(null)}
          colors={colors}
          darkMode={darkMode}
        />
      )}

      {changeLogRecord && (
        <ChangeLogModal
          record={changeLogRecord}
          onClose={() => setChangeLogRecord(null)}
          colors={colors}
          darkMode={darkMode}
        />
      )}
      {bulkDeckModalRecords && (
        <BulkDeckModal
          records={bulkDeckModalRecords}
          onClose={() => setBulkDeckModalRecords(null)}
          onSuccess={async () => {
            setBulkDeckModalRecords(null);
            if (onClearSelections) onClearSelections();
            if (onRefresh) await onRefresh();
          }}
          colors={colors}
        />
      )}

      {reassignmentRecord && (
        <ReassignmentModal
          record={reassignmentRecord}
          onClose={() => setReassignmentRecord(null)}
          colors={colors}
          darkMode={darkMode}
        />
      )}
      {rerouteRecord && (
        <RerouteModal
          record={rerouteRecord}
          onClose={() => setRerouteRecord(null)}
          colors={colors}
          darkMode={darkMode}
        />
      )}

      {cprUpdateRecord && (
        <UpdateCPRModal
          record={cprUpdateRecord}
          onClose={() => setCprUpdateRecord(null)}
          onSuccess={async () => {
            setCprUpdateRecord(null);
            if (onRefresh) await onRefresh();
          }}
          colors={colors}
          darkMode={darkMode}
          updateUploadReport={updateUploadReport}
        />
      )}
    </>
  );
}

export default DataTable;
