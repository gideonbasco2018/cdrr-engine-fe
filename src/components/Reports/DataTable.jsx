// src/components/UploadReports/DataTable.jsx

import { useState } from "react";
import { tableColumns } from "./tableColumns";
import TablePagination from "./TablePagination";
import DeckModal from "./actions/DeckModal";
import EvaluatorModal from "./actions/EvaluatorModal"; // ✅ ADD THIS
import ViewDetailsModal from "./actions/ViewDetailsModal";
import BulkDeckModal from "./actions/BulkDeckModal";
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
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedRowDetails, setSelectedRowDetails] = useState(null);
  const [deckModalRecord, setDeckModalRecord] = useState(null);
  const [evaluatorModalRecord, setEvaluatorModalRecord] = useState(null); // ✅ ADD THIS
  const [bulkDeckModalRecords, setBulkDeckModalRecords] = useState(null);

  const indexOfFirstRow = (currentPage - 1) * rowsPerPage + 1;
  const indexOfLastRow = Math.min(currentPage * rowsPerPage, totalRecords);

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

  // ✅ ADD THIS - Handler for evaluator modal
  const handleOpenEvaluatorModal = (row) => {
    setOpenMenuId(null);
    setEvaluatorModalRecord(row);
  };

  // Modal close handlers
  const handleCloseDetailsModal = () => {
    setSelectedRowDetails(null);
  };

  const handleCloseDeckModal = () => {
    setDeckModalRecord(null);
  };

  // ✅ ADD THIS - Close handler for evaluator modal
  const handleCloseEvaluatorModal = () => {
    setEvaluatorModalRecord(null);
  };

  // ✅ Deck success handler - will be called by DeckModal after successful deck
  const handleDeckSuccess = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };

  // ✅ ADD THIS - Evaluation success handler
  const handleEvaluationSuccess = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };

  // Check if record can be decked
  const canBeDeck = (row) => {
    return !row.evaluator || row.evaluator === "" || row.evaluator === "N/A";
  };

  // ✅ ADD THIS - Check if record can be evaluated (pending evaluation)
  const canBeEvaluated = (row) => {
    // Check if:
    // 1. Has an evaluator assigned
    // 2. No dateEvalEnd (pending evaluation)
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

  // Render status badge
  const renderAppStatusBadge = (status) => {
    const statusUpper = status?.toUpperCase();

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
    } else if (statusUpper === "TO_DO") {
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

    return status;
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
        {/* Table Header */}
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

              {/* Deck Applications Button */}
              <button
                onClick={() => {
                  const selectedRecords = data.filter((row) =>
                    selectedRows.includes(row.id)
                  );
                  const canDeckRecords = selectedRecords.filter(
                    (row) =>
                      !row.evaluator ||
                      row.evaluator === "" ||
                      row.evaluator === "N/A"
                  );

                  if (canDeckRecords.length === 0) {
                    alert(
                      "⚠️ None of the selected applications can be decked.\nThey already have evaluators assigned."
                    );
                    return;
                  }

                  if (canDeckRecords.length < selectedRecords.length) {
                    const proceed = confirm(
                      `⚠️ ${canDeckRecords.length} out of ${selectedRecords.length} selected applications can be decked.\n\n` +
                        `${
                          selectedRecords.length - canDeckRecords.length
                        } applications already have evaluators assigned.\n\n` +
                        `Do you want to continue with ${canDeckRecords.length} applications?`
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

        {/* Table Container */}
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
                {/* Checkbox Column */}
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

                {/* Row Number Column */}
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

                {/* Data Columns */}
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
                      ...(col.frozen && {
                        position: "sticky",
                        left: "110px",
                        background: colors.tableBg,
                        zIndex: 21,
                        boxShadow: "4px 0 8px rgba(0,0,0,0.15)",
                      }),
                    }}
                  >
                    {col.label}
                  </th>
                ))}

                {/* Actions Column */}
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
                const canEvaluate = canBeEvaluated(row); // ✅ ADD THIS

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
                    {/* Checkbox Cell */}
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

                    {/* Row Number Cell */}
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

                    {/* Data Cells */}
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
                        {col.key === "appStatus"
                          ? renderAppStatusBadge(row[col.key])
                          : row[col.key]}
                      </td>
                    ))}

                    {/* Actions Cell */}
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

                        {/* Actions Menu */}
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
                              {/* Deck Button - Only show if not decked */}
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

                              {/* ✅ ADD THIS - Complete Evaluation Button */}
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

                              {/* View Details */}
                              <button
                                onClick={() => handleViewDetails(row)}
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
                                <span>👁️</span>
                                <span>View Details</span>
                              </button>

                              {/* Edit */}
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  alert(
                                    `Edit functionality for DTN: ${row.dtn}`
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

                              {/* Delete */}
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  if (
                                    confirm(
                                      `Delete record for DTN: ${row.dtn}?`
                                    )
                                  ) {
                                    alert(
                                      "Delete functionality not yet implemented"
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

      {/* Single Deck Modal */}
      {deckModalRecord && (
        <DeckModal
          record={deckModalRecord}
          onClose={handleCloseDeckModal}
          onSuccess={handleDeckSuccess}
          colors={colors}
        />
      )}

      {/* ✅ ADD THIS - Evaluator Modal */}
      {evaluatorModalRecord && (
        <EvaluatorModal
          record={evaluatorModalRecord}
          onClose={handleCloseEvaluatorModal}
          onSuccess={handleEvaluationSuccess}
          colors={colors}
        />
      )}

      {/* View Details Modal */}
      {selectedRowDetails && (
        <ViewDetailsModal
          record={selectedRowDetails}
          onClose={handleCloseDetailsModal}
          colors={colors}
        />
      )}

      {/* Bulk Deck Modal */}
      {bulkDeckModalRecords && (
        <BulkDeckModal
          records={bulkDeckModalRecords}
          onClose={() => setBulkDeckModalRecords(null)}
          onSubmit={async (recordIds, formData) => {
            try {
              // ✅ Call the bulk deck API
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
                  `Decision: ${formData.deckerDecision}`
              );

              // Close modal
              setBulkDeckModalRecords(null);

              // ✅ Clear selections (this will hide the buttons)
              if (onClearSelections) {
                onClearSelections();
              }

              // Refresh data
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
