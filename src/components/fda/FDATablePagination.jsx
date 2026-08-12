// src/components/fda/FDATablePagination.jsx
function FDATablePagination({
  currentPage,
  pageSize,
  pagination,
  colors,
  loading,
  handlePageChange,
  setPageSize, // New prop
}) {
  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
  };

  const handlePageInputChange = (e) => {
    const value = e.target.value;
    if (value === "") return;

    const pageNum = Number(value);
    if (pageNum >= 1 && pageNum <= (pagination.total_pages || 1)) {
      handlePageChange(pageNum);
    }
  };

  return (
    <div
      style={{
        padding: "0.4rem 0.7rem",
        borderTop: `1px solid ${colors.tableBorder}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.5rem",
      }}
    >
      {/* Left side - Rows per page */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
        <span style={{ color: colors.textTertiary, fontSize: "0.66rem" }}>
          Rows per page:
        </span>
        <select
          value={pageSize}
          onChange={handlePageSizeChange}
          disabled={loading}
          style={{
            padding: "0.25rem 1.5rem 0.25rem 0.5rem",
            background: colors.inputBg,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: "5px",
            color: colors.textPrimary,
            fontSize: "0.66rem",
            cursor: loading ? "not-allowed" : "pointer",
            outline: "none",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.4rem center",
          }}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Center - Page info */}
      <div style={{ color: colors.textTertiary, fontSize: "0.66rem" }}>
        {pagination.total > 0 ? (
          <>
            {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, pagination.total || 0)} of{" "}
            {pagination.total || 0}
          </>
        ) : (
          "0-0 of 0"
        )}
      </div>

      {/* Right side - Page navigation */}
      <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!pagination.has_prev || loading}
          style={{
            padding: "0.28rem 0.6rem",
            background:
              pagination.has_prev && !loading ? colors.cardBg : colors.inputBg,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: "5px",
            color: colors.textPrimary,
            fontSize: "0.66rem",
            cursor: pagination.has_prev && !loading ? "pointer" : "not-allowed",
            opacity: pagination.has_prev && !loading ? 1 : 0.5,
            transition: "all 0.2s",
          }}
        >
          ← Previous
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span style={{ color: colors.textTertiary, fontSize: "0.66rem" }}>
            Page
          </span>
          <input
            type="number"
            min="1"
            max={pagination.total_pages || 1}
            value={currentPage}
            onChange={handlePageInputChange}
            disabled={loading}
            style={{
              width: "42px",
              padding: "0.28rem",
              background: colors.inputBg,
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: "5px",
              color: colors.textPrimary,
              fontSize: "0.66rem",
              textAlign: "center",
              outline: "none",
            }}
          />
          <span style={{ color: colors.textTertiary, fontSize: "0.66rem" }}>
            of {pagination.total_pages || 1}
          </span>
        </div>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!pagination.has_next || loading}
          style={{
            padding: "0.28rem 0.6rem",
            background:
              pagination.has_next && !loading ? colors.cardBg : colors.inputBg,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: "5px",
            color: colors.textPrimary,
            fontSize: "0.66rem",
            cursor: pagination.has_next && !loading ? "pointer" : "not-allowed",
            opacity: pagination.has_next && !loading ? 1 : 0.5,
            transition: "all 0.2s",
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default FDATablePagination;
