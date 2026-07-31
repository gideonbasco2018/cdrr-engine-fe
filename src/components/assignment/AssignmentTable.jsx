// src/components/assignment/AssignmentTable.jsx
import { useState } from "react";
import ReassignAllModal from "./ReassignAllModal";
import TablePagination from "../tasks/TablePagination";

function AssignmentTable({
  data,
  loading,
  selectedRows,
  onSelectRow,
  onCheckAll,
  onUncheckAll,
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  stepFilter,
  onStepFilterChange,
  steps,
  onRefresh,
  colors,
  darkMode,
  currentUser,
  currentPage,
  rowsPerPage,
  totalRecords,
  totalPages,
  onPageChange,
  onRowsPerPageChange,
}) {
  const [showReassignModal, setShowReassignModal] = useState(false);

  const selectedRecords = data.filter((r) => selectedRows.includes(r.id));

  const toolbarBtn = (extra = {}) => ({
    padding: "0.35rem 0.85rem",
    borderRadius: 6,
    border: `1px solid ${colors.cardBorder}`,
    background: colors.badgeBg,
    color: colors.textPrimary,
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
    ...extra,
  });

  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* ── Toolbar ── */}
      <div
        style={{
          padding: "0.6rem 0.85rem",
          borderBottom: `1px solid ${colors.tableBorder}`,
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          flexWrap: "wrap",
        }}
      >
        <button onClick={onCheckAll} style={toolbarBtn()}>
          Check All
        </button>
        <button onClick={onUncheckAll} style={toolbarBtn()}>
          Uncheck All
        </button>
        <button
          onClick={() => setShowReassignModal(true)}
          disabled={selectedRows.length === 0}
          style={toolbarBtn({
            background:
              selectedRows.length === 0
                ? "rgba(124,58,237,0.25)"
                : "linear-gradient(135deg,#7c3aed,#6d28d9)",
            color: "#fff",
            border: "none",
            cursor: selectedRows.length === 0 ? "not-allowed" : "pointer",
            opacity: selectedRows.length === 0 ? 0.6 : 1,
          })}
        >
          🔄 Reassign
          {selectedRows.length > 0 ? ` (${selectedRows.length})` : ""}
        </button>

        <div style={{ flex: 1 }} />

        <select
          value={stepFilter}
          onChange={(e) => onStepFilterChange(e.target.value)}
          style={{
            padding: "0.35rem 0.6rem",
            borderRadius: 6,
            border: `1px solid ${colors.cardBorder}`,
            background: colors.inputBg,
            color: colors.textPrimary,
            fontSize: "0.75rem",
          }}
        >
          <option value="">All Steps</option>
          {steps.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <textarea
          placeholder="Search DTN (paste multiple, comma or newline-separated)..."
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          onInput={(e) => {
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              onSearchSubmit();
            }
          }}
          rows={1}
          style={{
            padding: "0.35rem 0.6rem",
            borderRadius: 6,
            border: `1px solid ${colors.cardBorder}`,
            background: colors.inputBg,
            color: colors.textPrimary,
            fontSize: "0.75rem",
            width: 220,
            resize: "vertical",
            fontFamily: "inherit",
            minHeight: "1.8rem",
            maxHeight: "220px",
            overflowY: "auto",
            lineHeight: "1.3",
            transition: "height 0.1s ease",
          }}
        />

        <button onClick={onSearchSubmit} style={toolbarBtn()}>
          Search
        </button>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {loading ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: colors.textTertiary,
            }}
          >
            Loading…
          </div>
        ) : data.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: colors.textTertiary,
            }}
          >
            No open tasks found.
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.75rem",
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                background: colors.tableBg,
                zIndex: 1,
              }}
            >
              <tr>
                {[
                  "",
                  "#",
                  "DTN",
                  "OLD RSN",
                  "Application Step",
                  "Current User",
                  "Last Modified",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.5rem 0.6rem",
                      textAlign: "left",
                      fontSize: "0.62rem",
                      textTransform: "uppercase",
                      color: colors.textTertiary,
                      borderBottom: `1px solid ${colors.tableBorder}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => {
                const sel = selectedRows.includes(row.id);
                return (
                  <tr
                    key={row.id}
                    style={{
                      background: sel
                        ? "#7c3aed15"
                        : idx % 2
                          ? colors.tableRowOdd
                          : colors.tableRowEven,
                    }}
                  >
                    <td
                      style={{
                        padding: "0.4rem 0.5rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => onSelectRow(row.id)}
                        style={{ accentColor: "#7c3aed", cursor: "pointer" }}
                      />
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.6rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                      }}
                    >
                      {idx + 1}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.6rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        fontWeight: 600,
                      }}
                    >
                      {row.dtn}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.6rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                      }}
                    >
                      {row.oldRsn ?? "N/A"}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.6rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                      }}
                    >
                      {row.applicationStep}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.6rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                      }}
                    >
                      {row.userName ?? "Unassigned"}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.6rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.updatedAt
                        ? new Date(row.updatedAt).toLocaleString()
                        : "N/A"}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.6rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                      }}
                    >
                      {row.applicationStatus}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination footer — LABAS na sa scrollable div, laging naka-fix sa ilalim ── */}
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
          indexOfFirstRow={
            totalRecords === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1
          }
          indexOfLastRow={Math.min(currentPage * rowsPerPage, totalRecords)}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
          colors={colors}
        />
      </div>

      {showReassignModal && (
        <ReassignAllModal
          records={selectedRecords}
          onClose={() => setShowReassignModal(false)}
          onSuccess={async () => {
            setShowReassignModal(false);
            if (onRefresh) await onRefresh();
          }}
          colors={colors}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

export default AssignmentTable;
