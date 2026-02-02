import React from "react";

function FDAFilterBar({ filters, setFilters, colors }) {
  const handleClearFilters = () => {
    setFilters({
      uploadedBy: "",
      dateUploadFrom: "",
      dateUploadTo: "",
    });
  };

  const hasActiveFilters =
    filters.uploadedBy || filters.dateUploadFrom || filters.dateUploadTo;

  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "12px",
        padding: "1.25rem",
        marginBottom: "1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <h3
          style={{
            fontSize: "0.95rem",
            fontWeight: "600",
            color: colors.textPrimary,
          }}
        >
          🔍 Advanced Filters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "6px",
              color: colors.textSecondary,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.inputBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: "500",
              color: colors.textSecondary,
              marginBottom: "0.5rem",
            }}
          >
            Uploaded By
          </label>
          <input
            type="text"
            placeholder="Filter by uploader name"
            value={filters.uploadedBy}
            onChange={(e) =>
              setFilters({ ...filters, uploadedBy: e.target.value })
            }
            style={{
              width: "100%",
              padding: "0.75rem",
              background: colors.inputBg,
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: "6px",
              color: colors.textPrimary,
              fontSize: "0.85rem",
              outline: "none",
              transition: "border-color 0.2s ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#4CAF50";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.inputBorder;
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: "500",
              color: colors.textSecondary,
              marginBottom: "0.5rem",
            }}
          >
            Date Upload From
          </label>
          <input
            type="date"
            value={filters.dateUploadFrom}
            onChange={(e) =>
              setFilters({ ...filters, dateUploadFrom: e.target.value })
            }
            style={{
              width: "100%",
              padding: "0.75rem",
              background: colors.inputBg,
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: "6px",
              color: colors.textPrimary,
              fontSize: "0.85rem",
              outline: "none",
              transition: "border-color 0.2s ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#4CAF50";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.inputBorder;
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: "500",
              color: colors.textSecondary,
              marginBottom: "0.5rem",
            }}
          >
            Date Upload To
          </label>
          <input
            type="date"
            value={filters.dateUploadTo}
            onChange={(e) =>
              setFilters({ ...filters, dateUploadTo: e.target.value })
            }
            style={{
              width: "100%",
              padding: "0.75rem",
              background: colors.inputBg,
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: "6px",
              color: colors.textPrimary,
              fontSize: "0.85rem",
              outline: "none",
              transition: "border-color 0.2s ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#4CAF50";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.inputBorder;
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default FDAFilterBar;
