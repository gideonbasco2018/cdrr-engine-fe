// src/components/UploadReports/DataTable.jsx
// ✅ UPDATED: Enhanced APP STATUS badges with all status types

import { useState } from "react";
import { tableColumns } from "./tableColumns";
import TablePagination from "./TablePagination";
import DeckModal from "./actions/DeckModal";
import EvaluatorModal from "./actions/EvaluatorModal";
import ViewDetailsModal from "./actions/ViewDetailsModal";
import BulkDeckModal from "./actions/BulkDeckModal";
import DoctrackModal from "./actions/DoctrackModal";
import { bulkDeckApplications } from "../../api/reports";

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
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedRowDetails, setSelectedRowDetails] = useState(null);
  const [deckModalRecord, setDeckModalRecord] = useState(null);
  const [evaluatorModalRecord, setEvaluatorModalRecord] = useState(null);
  const [bulkDeckModalRecords, setBulkDeckModalRecords] = useState(null);
  const [doctrackModalRecord, setDoctrackModalRecord] = useState(null);

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

    if (diffDays <= timelineValue) {
      return { status: "WITHIN", days: diffDays };
    } else {
      return { status: "BEYOND", days: diffDays };
    }
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
    } else if (status === "BEYOND") {
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

    return status;
  };

  // Menu handlers
  const handleMenuToggle = (rowId) => {
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

  // Modal close handlers
  const handleCloseDetailsModal = () => {
    setSelectedRowDetails(null);
  };

  const handleCloseDeckModal = () => {
    setDeckModalRecord(null);
  };

  const handleCloseEvaluatorModal = () => {
    setEvaluatorModalRecord(null);
  };

  const handleCloseDoctrackModal = () => {
    setDoctrackModalRecord(null);
  };

  const handleDeckSuccess = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };

  const handleEvaluationSuccess = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };

  const canBeDeck = (row) => {
    return !row.evaluator || row.evaluator === "" || row.evaluator === "N/A";
  };

  const canBeEvaluated = (row) => {
    return (
      row.evaluator &&
      row.evaluator !== "" &&
      row.evaluator !== "N/A" &&
      (!row.dateEvalEnd ||
        row.dateEvalEnd === "" ||
        row.dateEvalEnd === "N/A" ||
        row.dateEvalEnd === null)
    );
  };

  // ✅ NEW: Render DTN with highlight
  const renderDTN = (dtn) => {
    return (
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
  };

  // ✅ NEW: Render Generic Name with highlight
  const renderGenericName = (genName) => {
    return (
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
  };

  // ✅ NEW: Render Brand Name with highlight
  const renderBrandName = (brandName) => {
    return (
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
  };

  // ✅ NEW: Render Type Doc Released with icons
  const renderTypeDocReleased = (typeDoc) => {
    const typeUpper = typeDoc?.toUpperCase();

    // CPR (Certificate of Product Registration) - Approved icon
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
    }
    // LOD (Letter of Denial/Disapproval) - Disapproved icon
    else if (typeUpper?.includes("LOD")) {
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
    }
    // Certificate (General) - Certificate icon
    else if (
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

    // Default - No icon
    return (
      <span style={{ fontSize: "0.85rem", color: colors.tableText }}>
        {typeDoc || "N/A"}
      </span>
    );
  };

  // ✅ ENHANCED: Render APP STATUS badges with all status types
  const renderAppStatusBadge = (status) => {
    const statusUpper = status?.toUpperCase();

    // ✅ COMPLETED - Green gradient
    if (statusUpper === "COMPLETED") {
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
          Completed
        </span>
      );
    }
    // ✅ TO_DO - Orange/Amber gradient
    else if (statusUpper === "TO_DO") {
      return (
        <span
          style={{
            padding: "0.4rem 0.9rem",
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: "700",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>⏳</span>
          To Do
        </span>
      );
    }
    // ✅ APPROVED - Blue gradient
    else if (statusUpper === "APPROVED") {
      return (
        <span
          style={{
            padding: "0.4rem 0.9rem",
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: "700",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>✅</span>
          Approved
        </span>
      );
    }
    // ✅ PENDING - Yellow gradient
    else if (statusUpper === "PENDING") {
      return (
        <span
          style={{
            padding: "0.4rem 0.9rem",
            background: "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: "700",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            boxShadow: "0 2px 8px rgba(234, 179, 8, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>⏸</span>
          Pending
        </span>
      );
    }
    // ✅ REJECTED - Red gradient
    else if (statusUpper === "REJECTED") {
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
          <span style={{ fontSize: "0.9rem" }}>✗</span>
          Rejected
        </span>
      );
    }

    // ✅ Fallback for unknown status
    return (
      <span
        style={{
          padding: "0.4rem 0.9rem",
          background: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
          color: "#fff",
          borderRadius: "8px",
          fontSize: "0.75rem",
          fontWeight: "700",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          boxShadow: "0 2px 8px rgba(107, 114, 128, 0.3)",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <span style={{ fontSize: "0.9rem" }}>•</span>
        {status || "N/A"}
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
        }}
      >
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

              <button
                onClick={() => {
                  const selectedRecords = data.filter((row) =>
                    selectedRows.includes(row.id),
                  );
                  const canDeckRecords = selectedRecords.filter(
                    (row) =>
                      !row.evaluator ||
                      row.evaluator === "" ||
                      row.evaluator === "N/A",
                  );

                  if (canDeckRecords.length === 0) {
                    alert(
                      "⚠️ None of the selected applications can be decked.\nThey already have evaluators assigned.",
                    );
                    return;
                  }

                  if (canDeckRecords.length < selectedRecords.length) {
                    const proceed = confirm(
                      `⚠️ ${canDeckRecords.length} out of ${selectedRecords.length} selected applications can be decked.\n\n` +
                        `${
                          selectedRecords.length - canDeckRecords.length
                        } applications already have evaluators assigned.\n\n` +
                        `Do you want to continue with ${canDeckRecords.length} applications?`,
                    );
                    if (!proceed) return;
                  }

                  setBulkDeckModalRecords(canDeckRecords);
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
                <span>🎯</span>
                Deck Applications
              </button>

              <button
                onClick={() => {
                  if (
                    confirm(`Delete ${selectedRows.length} selected records?`)
                  ) {
                    alert("Delete functionality not yet implemented");
                  }
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

        <div
          style={{ overflowX: "auto", maxHeight: "600px", overflowY: "auto" }}
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

                {tableColumns.map((col) => (
                  <th
                    key={col.key}
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
                      ...(col.frozen && {
                        position: "sticky",
                        left: "110px",
                        background: col.headerBg || colors.tableBg,
                        zIndex: 21,
                        boxShadow: "4px 0 8px rgba(0,0,0,0.15)",
                      }),
                    }}
                  >
                    {col.label}
                  </th>
                ))}

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
                const canDeck = canBeDeck(row);
                const canEvaluate = canBeEvaluated(row);

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
                        {/* ✅ Render special columns with custom logic */}
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
                              {canDeck && (
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

                              {canEvaluate && (
                                <button
                                  onClick={() => handleOpenEvaluatorModal(row)}
                                  style={{
                                    width: "100%",
                                    padding: "0.75rem 1rem",
                                    background: "transparent",
                                    border: "none",
                                    borderTop: canDeck
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
                                  <span>✅</span>
                                  <span>Complete Evaluation</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenDoctrackModal(row)}
                                style={{
                                  width: "100%",
                                  padding: "0.75rem 1rem",
                                  background: "transparent",
                                  border: "none",
                                  borderTop:
                                    canDeck || canEvaluate
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

                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  alert(
                                    `Edit functionality for DTN: ${row.dtn}`,
                                  );
                                }}
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
                                <span>✏️</span>
                                <span>Edit</span>
                              </button>

                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  if (
                                    confirm(
                                      `Delete record for DTN: ${row.dtn}?`,
                                    )
                                  ) {
                                    alert(
                                      "Delete functionality not yet implemented",
                                    );
                                  }
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
        />
      )}

      {bulkDeckModalRecords && (
        <BulkDeckModal
          records={bulkDeckModalRecords}
          onClose={() => setBulkDeckModalRecords(null)}
          onSubmit={async (recordIds, formData) => {
            try {
              const response = await bulkDeckApplications({
                decker: formData.decker,
                evaluator: formData.evaluator,
                deckerDecision: formData.deckerDecision,
                deckerRemarks: formData.deckerRemarks,
                dateDeckedEnd: formData.dateDeckedEnd,
                record_ids: recordIds,
              });

              console.log("✅ Bulk deck response:", response);

              alert(
                `✅ Successfully decked ${recordIds.length} applications!\n\n` +
                  `Evaluator: ${formData.evaluator}\n` +
                  `Decision: ${formData.deckerDecision}`,
              );

              setBulkDeckModalRecords(null);

              if (onClearSelections) {
                onClearSelections();
              }

              if (onRefresh) {
                await onRefresh();
              }
            } catch (error) {
              console.error("Failed to bulk deck applications:", error);
              alert(`❌ Failed to deck applications:\n${error.message}`);
              throw error;
            }
          }}
          colors={colors}
        />
      )}
    </>
  );
}

export default DataTable;
