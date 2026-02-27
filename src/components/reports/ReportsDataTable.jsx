// FILE: src/components/reports/ReportsDataTable.jsx
import { useState } from "react";
import { tableColumns } from "./tableColumns";
import TablePagination from "./TablePagination";
import ViewDetailsModal from "./actions/ViewDetailsModal";
import DoctrackModal from "./actions/DoctrackModal";
import ApplicationLogsModal from "../tasks/ApplicationLogsModal";

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
  processingType: "DB_PROCESSING_TYPE",
};

function ReportsDataTable({
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
  indexOfFirstRow,
  indexOfLastRow,
  onSort,
  sortBy,
  sortOrder,
  darkMode,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedRowDetails, setSelectedRowDetails] = useState(null);
  const [doctrackModalRecord, setDoctrackModalRecord] = useState(null);
  const [appLogsModalRecord, setAppLogsModalRecord] = useState(null);

  const getDbKey = (colKey) => COLUMN_DB_KEY_MAP[colKey] || colKey;

  const handleSort = (colKey) => {
    if (!onSort) return;
    const dbKey = getDbKey(colKey);
    if (colKey === "statusTimeline") return;
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

  const renderStatusTimelineBadge = (row) => {
    const { status, days } = calculateStatusTimeline(row);
    if (!status)
      return (
        <span style={{ color: colors.textTertiary, fontSize: "0.8rem" }}>
          N/A
        </span>
      );

    if (status === "WITHIN") {
      return (
        <span
          style={{
            padding: "0.4rem 0.9rem",
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: "700",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>✓</span>
          Within ({days}d)
        </span>
      );
    } else {
      return (
        <span
          style={{
            padding: "0.4rem 0.9rem",
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: "700",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>⚠</span>
          Beyond ({days}d)
        </span>
      );
    }
  };

  const renderProcessingTypeBadge = (value) => {
    if (!value || value === "N/A") {
      return (
        <span
          style={{
            padding: "0.3rem 0.7rem",
            background: darkMode
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.06)",
            color: colors.textTertiary,
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: "500",
            display: "inline-flex",
            alignItems: "center",
            whiteSpace: "nowrap",
          }}
        >
          Regular
        </span>
      );
    }
    return (
      <span
        style={{
          padding: "0.3rem 0.7rem",
          background: "linear-gradient(135deg, #2196F3 0%, #1976D2 100%)",
          color: "#fff",
          borderRadius: "6px",
          fontSize: "0.75rem",
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

  const handleMenuToggle = (rowId) => {
    setOpenMenuId(openMenuId === rowId ? null : rowId);
  };

  const handleViewDetails = (row) => {
    setOpenMenuId(null);
    setSelectedRowDetails(row);
  };

  const handleOpenDoctrackModal = (row) => {
    setOpenMenuId(null);
    setDoctrackModalRecord(row);
  };

  const handleOpenAppLogsModal = (row) => {
    setOpenMenuId(null);
    setAppLogsModalRecord(row);
  };

  const handleCloseDetailsModal = () => setSelectedRowDetails(null);
  const handleCloseDoctrackModal = () => setDoctrackModalRecord(null);

  const renderDTN = (dtn) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.4rem 0.9rem",
        background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.75rem",
        fontWeight: "700",
        letterSpacing: "0.5px",
        boxShadow: "0 2px 8px rgba(139, 92, 246, 0.3)",
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
    if (typeUpper?.includes("CPR")) {
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
    } else if (typeUpper?.includes("LOD")) {
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
    } else if (
      typeUpper?.includes("CERT") ||
      typeUpper?.includes("CERTIFICATE")
    ) {
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
    }
    return (
      <span style={{ fontSize: "0.85rem", color: colors.tableText }}>
        {typeDoc || "N/A"}
      </span>
    );
  };

  const renderAppStatusBadge = (status) => {
    const statusUpper = status?.toUpperCase();
    const badges = {
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

    const badge = badges[statusUpper] || {
      bg: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
      shadow: "rgba(107, 114, 128, 0.3)",
      icon: "•",
      label: status || "N/A",
    };

    return (
      <span
        style={{
          padding: "0.4rem 0.9rem",
          background: badge.bg,
          color: "#fff",
          borderRadius: "8px",
          fontSize: "0.75rem",
          fontWeight: "700",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          boxShadow: `0 2px 8px ${badge.shadow}`,
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <span style={{ fontSize: "0.9rem" }}>{badge.icon}</span>
        {badge.label}
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

  const renderCell = (col, row) => {
    switch (col.key) {
      case "dtn":
        return renderDTN(row[col.key]);
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
      case "processingType":
        return renderProcessingTypeBadge(row[col.key]);
      default:
        return row[col.key];
    }
  };

  // ✅ Helper: get sticky styles for frozen columns using frozenLeft from tableColumns
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

  return (
    <>
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          overflow: "hidden",
          transition: "all 0.3s ease",
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
        </div>

        <div
          style={{
            overflowX: "auto",
            maxHeight: "calc(55vh - 150px)",
            minHeight: "300px",
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
                {/* # column */}
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
                    left: 0,
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
                      padding: "1rem",
                      textAlign: "left",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: `1px solid ${colors.tableBorder}`,
                      minWidth: col.width,
                      whiteSpace: "nowrap",
                      background: col.headerBg || colors.tableBg,
                      cursor:
                        col.key !== "statusTimeline" ? "pointer" : "default",
                      userSelect: "none",
                      transition: "background 0.15s",
                      ...getFrozenThStyle(col),
                    }}
                    onMouseEnter={(e) => {
                      if (col.key !== "statusTimeline") {
                        e.currentTarget.style.background = darkMode
                          ? "#1e1e1e"
                          : "#ebebeb";
                      }
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

                {/* Actions column */}
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
                const rowBg =
                  index % 2 === 0 ? colors.tableRowEven : colors.tableRowOdd;

                return (
                  <tr
                    key={row.id}
                    style={{ background: rowBg, transition: "background 0.2s" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors.tableRowHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = rowBg;
                    }}
                  >
                    {/* Row number */}
                    <td
                      style={{
                        padding: "1rem",
                        fontSize: "0.85rem",
                        fontWeight: "700",
                        color: colors.textTertiary,
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        textAlign: "center",
                        position: "sticky",
                        left: 0,
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
                          padding: "1rem",
                          fontSize: "0.85rem",
                          color: colors.tableText,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          minWidth: col.width,
                          ...getFrozenTdStyle(col, rowBg),
                        }}
                      >
                        {renderCell(col, row)}
                      </td>
                    ))}

                    {/* Actions */}
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
                          onClick={() => handleMenuToggle(row.id)}
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
                                minWidth: "180px",
                                zIndex: 9999,
                                overflow: "visible",
                              }}
                            >
                              {[
                                {
                                  label: "Application Logs",
                                  icon: "📦",
                                  handler: () => handleOpenAppLogsModal(row),
                                },
                                {
                                  label: "View Doctrack Details",
                                  icon: "📋",
                                  handler: () => handleOpenDoctrackModal(row),
                                },
                                {
                                  label: "View Details",
                                  icon: "👁️",
                                  handler: () => handleViewDetails(row),
                                },
                              ].map((item, i) => (
                                <button
                                  key={item.label}
                                  onClick={item.handler}
                                  style={{
                                    width: "100%",
                                    padding: "0.75rem 1rem",
                                    background: "transparent",
                                    border: "none",
                                    borderTop:
                                      i > 0
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

      {appLogsModalRecord && (
        <ApplicationLogsModal
          record={appLogsModalRecord}
          onClose={() => setAppLogsModalRecord(null)}
          colors={colors}
          darkMode={darkMode}
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
        />
      )}
    </>
  );
}

export default ReportsDataTable;
