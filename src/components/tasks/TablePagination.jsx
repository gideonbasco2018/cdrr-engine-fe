import { useState } from "react";

function TablePagination({
  currentPage,
  rowsPerPage,
  totalRecords,
  totalPages,
  indexOfFirstRow,
  indexOfLastRow,
  onPageChange,
  onRowsPerPageChange,
  colors,
}) {
  const [pageInput, setPageInput] = useState(String(currentPage));

  const handlePageJump = () => {
    const n = parseInt(pageInput);
    if (n && n >= 1 && n <= totalPages) onPageChange(n);
    else setPageInput(String(currentPage));
  };

  const btnStyle = (disabled) => ({
    width: "32px",
    height: "32px",
    background: colors.buttonSecondaryBg,
    border: `1px solid ${colors.buttonSecondaryBorder}`,
    borderRadius: "6px",
    color: disabled ? colors.textTertiary : colors.textPrimary,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.85rem",
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <div
      style={{
        padding: "1rem 1.5rem",
        borderTop: `1px solid ${colors.tableBorder}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          color: colors.textTertiary,
          fontSize: "0.85rem",
        }}
      >
        <span>Rows per page:</span>
        <select
          value={rowsPerPage}
          onChange={onRowsPerPageChange}
          style={{
            padding: "0.4rem 0.8rem",
            background: colors.inputBg,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: "6px",
            color: colors.textPrimary,
            fontSize: "0.85rem",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ color: colors.textTertiary, fontSize: "0.85rem" }}>Page</span>
        <input
          type="text"
          value={pageInput}
          onChange={(e) => {
            if (e.target.value === "" || /^\d+$/.test(e.target.value))
              setPageInput(e.target.value);
          }}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handlePageJump();
              e.target.blur();
            }
          }}
          onBlur={handlePageJump}
          onFocus={(e) => {
            e.target.style.borderColor = "#4CAF50";
            e.target.select();
          }}
          style={{
            width: "60px",
            padding: "0.4rem 0.6rem",
            background: colors.inputBg,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: "6px",
            color: colors.textPrimary,
            fontSize: "0.85rem",
            textAlign: "center",
            outline: "none",
          }}
        />
        <span style={{ color: colors.textTertiary, fontSize: "0.85rem" }}>of {totalPages}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <span style={{ color: colors.textTertiary, fontSize: "0.85rem" }}>
          {indexOfFirstRow}-{indexOfLastRow} of {totalRecords}
        </span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={btnStyle(currentPage === 1)}
          >
            ‹
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={btnStyle(currentPage === totalPages)}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

export default TablePagination;
