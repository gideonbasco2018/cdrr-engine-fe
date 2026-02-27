// src/components/UploadReports/DataTable.jsx
// ✅ FIXED: Pagination moved OUTSIDE scrollable container so it's always visible
// ✅ ADDED: Sorting functionality with clickable column headers
// ✅ UPDATED: Removed "Complete Evaluation" from action menu
// ✅ UPDATED: "Deck Application" only visible on Not Yet Decked tab (activeTab === "not-decked")
// ✅ UPDATED: "Application Logs" visible on Decked and All Reports tabs
// ✅ UPDATED: Tab order → Not Yet Decked → Decked → All Reports

import { useState } from "react";
import { tableColumns } from "./tableColumns";
import TablePagination from "./TablePagination";
import DeckModal from "./actions/DeckModal";
import EvaluatorModal from "./actions/EvaluatorModal";
import ViewDetailsModal from "./actions/ViewDetailsModal";
import BulkDeckModal from "./actions/BulkDeckModal";
import DoctrackModal from "./actions/DoctrackModal";
import ApplicationLogsModal from "../tasks/ApplicationLogsModal";

// ✅ Map column keys to database column names for sorting
const COLUMN_DB_KEY_MAP = {
  dtn: "DB_DTN",
  estCat: "DB_EST_CAT",
  ltoCompany: "DB_EST_LTO_COMP",
  ltoAddress: "DB_EST_LTO_ADD",
  email: "DB_EST_EADD",
  tin: "DB_EST_TIN",
  contactNo: "DB_EST_CONTACT_NO",
  ltoNo: "DB_EST_LTO_NO",
  validity: "DB_EST_VALIDITY",
  prodBrName: "DB_PROD_BR_NAME",
  prodGenName: "DB_PROD_GEN_NAME",
  dosageStrength: "DB_PROD_DOS_STR",
  dosageForm: "DB_PROD_DOS_FORM",
  prescription: "DB_PROD_CLASS_PRESCRIP",
  essentialDrug: "DB_PROD_ESS_DRUG_LIST",
  pharmaCategory: "DB_PROD_PHARMA_CAT",
  manufacturer: "DB_PROD_MANU",
  manufacturerAddress: "DB_PROD_MANU_ADD",
  manufacturerCountry: "DB_PROD_MANU_COUNTRY",
  trader: "DB_PROD_TRADER",
  traderCountry: "DB_PROD_TRADER_COUNTRY",
  importer: "DB_PROD_IMPORTER",
  importerCountry: "DB_PROD_IMPORTER_COUNTRY",
  distributor: "DB_PROD_DISTRI",
  distributorCountry: "DB_PROD_DISTRI_COUNTRY",
  shelfLife: "DB_PROD_DISTRI_SHELF_LIFE",
  packaging: "DB_PACKAGING",
  expiryDate: "DB_EXPIRY_DATE",
  regNo: "DB_REG_NO",
  appType: "DB_APP_TYPE",
  motherAppType: "DB_MOTHER_APP_TYPE",
  oldRsn: "DB_OLD_RSN",
  productCategory: "DB_PROD_CAT",
  fee: "DB_FEE",
  total: "DB_TOTAL",
  orNo: "DB_OR_NO",
  dateIssued: "DB_DATE_ISSUED",
  dateReceivedFdac: "DB_DATE_RECEIVED_FDAC",
  dateReceivedCent: "DB_DATE_RECEIVED_CENT",
  mo: "DB_MO",
  deckingSched: "DB_DECKING_SCHED",
  eval: "DB_EVAL",
  dateDeck: "DB_DATE_DECK",
  remarks1: "DB_REMARKS_1",
  dateRemarks: "DB_DATE_REMARKS",
  class: "DB_CLASS",
  dateReleased: "DB_DATE_RELEASED",
  typeDocReleased: "DB_TYPE_DOC_RELEASED",
  appStatus: "DB_APP_STATUS",
  uploadedBy: "DB_USER_UPLOADER",
  uploadedAt: "DB_DATE_EXCEL_UPLOAD",
  dbTimelineCitizenCharter: "DB_TIMELINE_CITIZEN_CHARTER",
};

// ✅ Tab order: Not Yet Decked → Decked → All Reports
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
  // ✅ Sorting props
  onSort,
  sortBy,
  sortOrder,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedRowDetails, setSelectedRowDetails] = useState(null);
  const [deckModalRecord, setDeckModalRecord] = useState(null);
  const [evaluatorModalRecord, setEvaluatorModalRecord] = useState(null);
  const [bulkDeckModalRecords, setBulkDeckModalRecords] = useState(null);
  const [doctrackModalRecord, setDoctrackModalRecord] = useState(null);
  const [appLogsRecord, setAppLogsRecord] = useState(null);

  // ✅ Tab flags
  const isNotYetDeckedTab = activeTab === "not-decked";
  const showAppLogs = activeTab === "decked" || activeTab === "all";

  // ✅ Get database column name for sorting
  const getDbKey = (colKey) => COLUMN_DB_KEY_MAP[colKey] || colKey;

  // ✅ Handle column header click for sorting
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

  // ✅ Sort indicator component
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

  // ✅ Find current sort column label
  const activeSortLabel = (() => {
    const entry = Object.entries(COLUMN_DB_KEY_MAP).find(
      ([, dbKey]) => dbKey === sortBy,
    );
    if (!entry) return sortBy;
    const col = tableColumns.find((c) => c.key === entry[0]);
    return col?.label || sortBy;
  })();

  // ✅ Function to calculate status timeline
  const calculateStatusTimeline = (row) => {
    const dateReceivedCent = row.dateReceivedCent;
    const dateReleased = row.dateReleased;
    const timeline = row.dbTimelineCitizenCharter;

    if (
      !dateReceivedCent ||
      !timeline ||
      dateReceivedCent === "N/A" ||
      timeline === null
    ) {
      return { status: "", days: 0 };
    }

    const receivedDate = new Date(dateReceivedCent);
    const endDate =
      dateReleased && dateReleased !== "N/A"
        ? new Date(dateReleased)
        : new Date();

    if (isNaN(receivedDate.getTime()) || isNaN(endDate.getTime())) {
      return { status: "", days: 0 };
    }

    const diffTime = Math.abs(endDate - receivedDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const timelineValue = parseInt(timeline, 10);

    return diffDays <= timelineValue
      ? { status: "WITHIN", days: diffDays }
      : { status: "BEYOND", days: diffDays };
  };

  // ✅ Function to render status timeline badge
  const renderStatusTimelineBadge = (row) => {
    const { status, days } = calculateStatusTimeline(row);

    if (!status)
      return (
        <span style={{ color: colors.textTertiary, fontSize: "0.8rem" }}>
          N/A
        </span>
      );

    const isWithin = status === "WITHIN";
    return (
      <span
        style={{
          padding: "0.4rem 0.9rem",
          background: isWithin
            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
            : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          color: "#fff",
          borderRadius: "8px",
          fontSize: "0.75rem",
          fontWeight: "700",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          boxShadow: isWithin
            ? "0 2px 8px rgba(16, 185, 129, 0.3)"
            : "0 2px 8px rgba(239, 68, 68, 0.3)",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <span style={{ fontSize: "0.9rem" }}>{isWithin ? "✓" : "⚠"}</span>
        {isWithin ? `Within (${days}d)` : `Beyond (${days}d)`}
      </span>
    );
  };

  // Menu handlers
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
  const handleCloseDetailsModal = () => setSelectedRowDetails(null);
  const handleCloseDeckModal = () => setDeckModalRecord(null);
  const handleCloseEvaluatorModal = () => setEvaluatorModalRecord(null);
  const handleCloseDoctrackModal = () => setDoctrackModalRecord(null);
  const handleDeckSuccess = async () => {
    if (onRefresh) await onRefresh();
  };
  const handleEvaluationSuccess = async () => {
    if (onRefresh) await onRefresh();
  };

  // ✅ Render helpers
  const renderDTN = (dtn) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.4rem 0.9rem",
        background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.75rem",
        fontWeight: "700",
        letterSpacing: "0.5px",
        boxShadow: "0 2px 8px rgba(139, 92, 246, 0.3)",
      }}
    >
      <span style={{ fontSize: "0.9rem" }}>🔖</span>
      <span>{dtn || "N/A"}</span>
    </span>
  );

  const renderGenericName = (genName) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.4rem 0.9rem",
        background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.75rem",
        fontWeight: "700",
        letterSpacing: "0.3px",
        boxShadow: "0 2px 8px rgba(6, 182, 212, 0.3)",
      }}
    >
      <span style={{ fontSize: "0.9rem" }}>💊</span>
      <span>{genName || "N/A"}</span>
    </span>
  );

  const renderBrandName = (brandName) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.4rem 0.9rem",
        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.75rem",
        fontWeight: "700",
        letterSpacing: "0.3px",
        boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
      }}
    >
      <span style={{ fontSize: "0.9rem" }}>🏷️</span>
      <span>{brandName || "N/A"}</span>
    </span>
  );

  const renderTypeDocReleased = (typeDoc) => {
    const typeUpper = typeDoc?.toUpperCase();
    if (typeUpper?.includes("CPR"))
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.4rem 0.9rem",
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: "700",
            letterSpacing: "0.3px",
            boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
          }}
        >
          <span style={{ fontSize: "1rem" }}>📜</span>
          <span>{typeDoc}</span>
        </span>
      );
    if (typeUpper?.includes("LOD"))
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.4rem 0.9rem",
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: "700",
            letterSpacing: "0.3px",
            boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
          }}
        >
          <span style={{ fontSize: "1rem" }}>📋</span>
          <span>{typeDoc}</span>
        </span>
      );
    if (typeUpper?.includes("CERT") || typeUpper?.includes("CERTIFICATE"))
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.4rem 0.9rem",
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: "700",
            letterSpacing: "0.3px",
            boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
          }}
        >
          <span style={{ fontSize: "1rem" }}>🏆</span>
          <span>{typeDoc}</span>
        </span>
      );
    return (
      <span style={{ fontSize: "0.85rem", color: colors.tableText }}>
        {typeDoc || "N/A"}
      </span>
    );
  };

  const renderAppStatusBadge = (status) => {
    const statusUpper = status?.toUpperCase();
    const configs = {
      COMPLETED: {
        bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        shadow: "rgba(16, 185, 129, 0.3)",
        icon: "✓",
        label: "Completed",
      },
      TO_DO: {
        bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        shadow: "rgba(245, 158, 11, 0.3)",
        icon: "⏳",
        label: "To Do",
      },
      APPROVED: {
        bg: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
        shadow: "rgba(59, 130, 246, 0.3)",
        icon: "✅",
        label: "Approved",
      },
      PENDING: {
        bg: "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)",
        shadow: "rgba(234, 179, 8, 0.3)",
        icon: "⏸",
        label: "Pending",
      },
      REJECTED: {
        bg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
        shadow: "rgba(239, 68, 68, 0.3)",
        icon: "✗",
        label: "Rejected",
      },
    };
    const cfg = configs[statusUpper] || {
      bg: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
      shadow: "rgba(107, 114, 128, 0.3)",
      icon: "•",
      label: status || "N/A",
    };
    return (
      <span
        style={{
          padding: "0.4rem 0.9rem",
          background: cfg.bg,
          color: "#fff",
          borderRadius: "8px",
          fontSize: "0.75rem",
          fontWeight: "700",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          boxShadow: `0 2px 8px ${cfg.shadow}`,
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <span style={{ fontSize: "0.9rem" }}>{cfg.icon}</span>
        {cfg.label}
      </span>
    );
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
          height: "100%",
          minHeight: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: `1px solid ${colors.tableBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: "600",
                color: colors.textPrimary,
              }}
            >
              Reports Data
            </h3>
            <span
              style={{
                padding: "0.25rem 0.75rem",
                background: colors.badgeBg,
                borderRadius: "12px",
                fontSize: "0.8rem",
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
            {/* ✅ Active sort indicator */}
            {sortBy && (
              <span
                style={{
                  fontSize: "0.73rem",
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
                  padding: "0.5rem 1rem",
                  background: colors.badgeBg,
                  borderRadius: "8px",
                }}
              >
                <span
                  style={{
                    color: "#4CAF50",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                  }}
                >
                  {selectedRows.length} selected
                </span>

                {/* ✅ Bulk Deck button — only on Not Yet Decked tab */}
                {isNotYetDeckedTab && (
                  <button
                    onClick={() => {
                      const selectedRecords = data.filter((row) =>
                        selectedRows.includes(row.id),
                      );
                      setBulkDeckModalRecords(selectedRecords);
                    }}
                    style={{
                      padding: "0.4rem 0.8rem",
                      background: "#4CAF50",
                      border: "none",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#45a049";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#4CAF50";
                    }}
                  >
                    <span>🎯</span> Deck Applications
                  </button>
                )}

                <button
                  onClick={() => {
                    if (
                      confirm(`Delete ${selectedRows.length} selected records?`)
                    )
                      alert("Delete functionality not yet implemented");
                  }}
                  style={{
                    padding: "0.4rem 0.8rem",
                    background: "#ef4444",
                    border: "none",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#dc2626";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ef4444";
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ✅ SCROLLABLE TABLE */}
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
                {/* Checkbox */}
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    width: "50px",
                    position: "sticky",
                    left: 0,
                    background: colors.tableBg,
                    zIndex: 21,
                    boxShadow: "4px 0 8px rgba(0,0,0,0.15)",
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

                {/* # */}
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    width: "60px",
                    position: "sticky",
                    left: "50px",
                    background: colors.tableBg,
                    zIndex: 21,
                    boxShadow: "4px 0 8px rgba(0,0,0,0.15)",
                  }}
                >
                  #
                </th>

                {/* ✅ Data columns — sortable */}
                {tableColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: `1px solid ${colors.tableBorder}`,
                      minWidth: col.key === "dtn" ? "180px" : col.width,
                      whiteSpace: "nowrap",
                      background: col.headerBg || colors.tableBg,
                      cursor:
                        col.key !== "statusTimeline" ? "pointer" : "default",
                      userSelect: "none",
                      transition: "background 0.15s",
                      ...(col.frozen && {
                        position: "sticky",
                        left: "110px",
                        background: col.headerBg || colors.tableBg,
                        zIndex: 21,
                        boxShadow: "4px 0 8px rgba(0,0,0,0.15)",
                      }),
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

                {/* Actions */}
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    width: "80px",
                    whiteSpace: "nowrap",
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
                let rowBg = isSelected
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
                        padding: "1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        position: "sticky",
                        left: 0,
                        background: rowBg,
                        zIndex: 9,
                        boxShadow: "4px 0 8px rgba(0,0,0,0.15)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(row.id)}
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
                        padding: "1rem",
                        fontSize: "0.85rem",
                        fontWeight: "700",
                        color: colors.textTertiary,
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        textAlign: "center",
                        position: "sticky",
                        left: "50px",
                        background: rowBg,
                        zIndex: 9,
                        boxShadow: "4px 0 8px rgba(0,0,0,0.15)",
                      }}
                    >
                      {indexOfFirstRow + index}
                    </td>

                    {tableColumns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: "1rem",
                          fontSize: "0.85rem",
                          color: colors.tableText,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          minWidth: col.key === "dtn" ? "180px" : col.width,
                          ...(col.frozen && {
                            position: "sticky",
                            left: "110px",
                            background: rowBg,
                            zIndex: 9,
                            fontWeight: "600",
                            boxShadow: "4px 0 8px rgba(0,0,0,0.15)",
                          }),
                        }}
                      >
                        {col.key === "dtn"
                          ? renderDTN(row[col.key])
                          : col.key === "prodGenName"
                            ? renderGenericName(row[col.key])
                            : col.key === "prodBrName"
                              ? renderBrandName(row[col.key])
                              : col.key === "appStatus"
                                ? renderAppStatusBadge(row[col.key])
                                : col.key === "statusTimeline"
                                  ? renderStatusTimelineBadge(row)
                                  : col.key === "dbTimelineCitizenCharter"
                                    ? row.dbTimelineCitizenCharter || "N/A"
                                    : col.key === "typeDocReleased"
                                      ? renderTypeDocReleased(row[col.key])
                                      : row[col.key]}
                      </td>
                    ))}

                    {/* ✅ ACTIONS CELL */}
                    <td
                      style={{
                        padding: "1rem",
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
                            padding: "0.5rem",
                            background: "transparent",
                            border: `1px solid ${colors.cardBorder}`,
                            borderRadius: "6px",
                            color: colors.textPrimary,
                            cursor: "pointer",
                            width: "32px",
                            height: "32px",
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
                              {/* ✅ Deck Application — ONLY on Not Yet Decked tab */}
                              {isNotYetDeckedTab && (
                                <button
                                  onClick={() => handleOpenDeckModal(row)}
                                  style={{
                                    width: "100%",
                                    padding: "0.75rem 1rem",
                                    background: "transparent",
                                    border: "none",
                                    color: colors.textPrimary,
                                    fontSize: "0.85rem",
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

                              {/* ✅ Application Logs — ONLY on Decked and All Reports tabs */}
                              {showAppLogs && (
                                <button
                                  onClick={() => handleOpenAppLogs(row)}
                                  style={{
                                    width: "100%",
                                    padding: "0.75rem 1rem",
                                    background: "transparent",
                                    border: "none",
                                    color: colors.textPrimary,
                                    fontSize: "0.85rem",
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
                                  <span>Application Logs</span>
                                </button>
                              )}

                              {/* ✅ View Doctrack Details */}
                              <button
                                onClick={() => handleOpenDoctrackModal(row)}
                                style={{
                                  width: "100%",
                                  padding: "0.75rem 1rem",
                                  background: "transparent",
                                  border: "none",
                                  borderTop:
                                    isNotYetDeckedTab || showAppLogs
                                      ? `1px solid ${colors.tableBorder}`
                                      : "none",
                                  color: colors.textPrimary,
                                  fontSize: "0.85rem",
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
                                <span>📋</span>
                                <span>View Doctrack Details</span>
                              </button>

                              {/* ✅ View Details */}
                              <button
                                onClick={() => handleViewDetails(row)}
                                style={{
                                  width: "100%",
                                  padding: "0.75rem 1rem",
                                  background: "transparent",
                                  border: "none",
                                  borderTop: `1px solid ${colors.tableBorder}`,
                                  color: colors.textPrimary,
                                  fontSize: "0.85rem",
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
                                <span>👁️</span>
                                <span>View Details</span>
                              </button>

                              {/* ✅ Edit */}
                              <button
                                onClick={() => handleEditClick(row)}
                                style={{
                                  width: "100%",
                                  padding: "0.75rem 1rem",
                                  background: "transparent",
                                  border: "none",
                                  borderTop: `1px solid ${colors.tableBorder}`,
                                  color: "#2196F3",
                                  fontSize: "0.85rem",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  transition: "background 0.2s",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background =
                                    "rgba(33, 150, 243, 0.1)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background =
                                    "transparent")
                                }
                              >
                                <span>✏️</span>
                                <span>Edit</span>
                              </button>

                              {/* ✅ Delete */}
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  if (
                                    confirm(
                                      `Delete record for DTN: ${row.dtn}?`,
                                    )
                                  )
                                    alert(
                                      "Delete functionality not yet implemented",
                                    );
                                }}
                                style={{
                                  width: "100%",
                                  padding: "0.75rem 1rem",
                                  background: "transparent",
                                  border: "none",
                                  borderTop: `1px solid ${colors.tableBorder}`,
                                  color: "#ef4444",
                                  fontSize: "0.85rem",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  transition: "background 0.2s",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background =
                                    "#ef444410")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background =
                                    "transparent")
                                }
                              >
                                <span>🗑️</span>
                                <span>Delete</span>
                              </button>
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

      {/* ✅ Modals */}
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
          onClose={handleCloseDetailsModal}
          colors={colors}
          darkMode={darkMode}
        />
      )}
      {/* ✅ Application Logs Modal */}
      {appLogsRecord && (
        <ApplicationLogsModal
          record={appLogsRecord}
          onClose={() => setAppLogsRecord(null)}
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
    </>
  );
}

export default DataTable;
