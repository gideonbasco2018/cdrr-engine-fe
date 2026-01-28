// src/components/fda/FDATablePagination.jsx
function FDATablePagination({
  currentPage,
  pageSize,
  pagination,
  colors,
  loading,
  handlePageChange,
}) {
  return (
    <div
      style={{
        padding: "1rem 1.5rem",
        borderTop: `1px solid ${colors.tableBorder}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
      }}
    >
      <div style={{ color: colors.textTertiary, fontSize: "0.85rem" }}>
        Showing {(currentPage - 1) * pageSize + 1} to{" "}
        {Math.min(currentPage * pageSize, pagination.total || 0)} of{" "}
        {pagination.total || 0} records
      </div>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!pagination.has_prev || loading}
          style={{
            padding: "0.5rem 1rem",
            background:
              pagination.has_prev && !loading ? colors.cardBg : colors.inputBg,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: "6px",
            color: colors.textPrimary,
            cursor: pagination.has_prev && !loading ? "pointer" : "not-allowed",
            opacity: pagination.has_prev && !loading ? 1 : 0.5,
            transition: "all 0.2s",
          }}
        >
          ← Previous
        </button>

        <span
          style={{
            color: colors.textPrimary,
            fontSize: "0.9rem",
            padding: "0 0.5rem",
          }}
        >
          Page {currentPage} of {pagination.total_pages || 1}
        </span>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!pagination.has_next || loading}
          style={{
            padding: "0.5rem 1rem",
            background:
              pagination.has_next && !loading ? colors.cardBg : colors.inputBg,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: "6px",
            color: colors.textPrimary,
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
