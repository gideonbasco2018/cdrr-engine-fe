// FILE: src/components/otc/OTCFilterBar.jsx
import { useState } from "react";

export default function OTCFilterBar({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  colors,
  activeTab,
  subTab,
  prescriptionTab,
  appStatusTab,
  darkMode,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFilterCount = [
    filters.brandName,
    filters.genericName,
    filters.ltoCompany,
    filters.registrationNo,
  ].filter(Boolean).length;

  const inputStyle = {
    width: "100%",
    padding: "0.625rem 0.875rem",
    background: darkMode ? "#1a1a1a" : "#f9fafb",
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: "8px",
    color: colors.textPrimary,
    fontSize: "0.8rem",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s",
  };

  const labelStyle = {
    fontSize: "11px",
    fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    display: "block",
    marginBottom: "5px",
  };

  const clearAdvanced = () => {
    onFilterChange({});
  };

  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "12px",
        padding: "1rem 1.25rem",
        marginBottom: "1.25rem",
      }}
    >
      {/* Search Row */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        {/* Search Input */}
        <div style={{ flex: 1, position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: colors.textTertiary,
              fontSize: "14px",
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by DTN, Company, Brand Name, Generic Name, Manufacturer..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: "100%",
              padding: "0.7rem 1rem 0.7rem 2.5rem",
              background: darkMode ? "#111" : "#f9fafb",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "8px",
              color: colors.textPrimary,
              fontSize: "0.875rem",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
            onBlur={(e) => (e.target.style.borderColor = colors.cardBorder)}
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange("")}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: colors.textTertiary,
                cursor: "pointer",
                fontSize: "16px",
                lineHeight: 1,
                padding: "0 4px",
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          style={{
            padding: "0.7rem 1.1rem",
            background: showAdvanced
              ? "rgba(76,175,80,0.1)"
              : darkMode
                ? "#1a1a1a"
                : "#f3f4f6",
            border: `1px solid ${showAdvanced ? "#4CAF50" : colors.cardBorder}`,
            borderRadius: "8px",
            color: showAdvanced ? "#4CAF50" : colors.textSecondary,
            fontSize: "0.8rem",
            fontWeight: "500",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            whiteSpace: "nowrap",
            transition: "all 0.2s",
          }}
        >
          <span>⚙️</span>
          <span>Advanced Filters</span>
          {activeFilterCount > 0 && (
            <span
              style={{
                background: "#4CAF50",
                color: "#fff",
                borderRadius: "50%",
                width: "18px",
                height: "18px",
                fontSize: "11px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div
          style={{
            marginTop: "1rem",
            paddingTop: "1rem",
            borderTop: `1px solid ${colors.cardBorder}`,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.875rem",
            }}
          >
            {[
              {
                key: "brandName",
                label: "Brand Name",
                placeholder: "Filter by brand...",
              },
              {
                key: "genericName",
                label: "Generic Name",
                placeholder: "Filter by generic...",
              },
              {
                key: "ltoCompany",
                label: "LTO Company",
                placeholder: "Filter by company...",
              },
              {
                key: "registrationNo",
                label: "Registration No",
                placeholder: "Filter by reg no...",
              },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={filters[key] || ""}
                  onChange={(e) =>
                    onFilterChange({ ...filters, [key]: e.target.value })
                  }
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
                  onBlur={(e) =>
                    (e.target.style.borderColor = colors.cardBorder)
                  }
                />
              </div>
            ))}
          </div>

          {/* Active filters / clear */}
          {activeFilterCount > 0 && (
            <div
              style={{
                marginTop: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: "12px", color: colors.textTertiary }}>
                Active:
              </span>
              {Object.entries(filters).map(([key, val]) =>
                val ? (
                  <span
                    key={key}
                    style={{
                      background: "rgba(76,175,80,0.12)",
                      color: "#4CAF50",
                      padding: "3px 10px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    {key}: {val}
                    <button
                      onClick={() => onFilterChange({ ...filters, [key]: "" })}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#4CAF50",
                        fontSize: "14px",
                        lineHeight: 1,
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ) : null,
              )}
              <button
                onClick={clearAdvanced}
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: "20px",
                  color: "#ef4444",
                  fontSize: "12px",
                  padding: "3px 12px",
                  cursor: "pointer",
                }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
