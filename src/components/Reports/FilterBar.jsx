import { useState } from "react";

function FilterBar({
  searchTerm,
  onSearchChange,
  colors,
  filters = {},
  onFilterChange,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFilterChange({});
    onSearchChange("");
  };

  const activeFilterCount = Object.values(filters).filter(
    (v) => v && v !== "all",
  ).length;

  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "12px",
        padding: "1.25rem",
        marginBottom: "1.5rem",
        transition: "all 0.3s ease",
      }}
    >
      {/* PRIMARY FILTERS */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: showAdvanced ? "1rem" : "0",
        }}
      >
        {/* SEARCH INPUT */}
        <div style={{ flex: "1", minWidth: "250px" }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search (DTN, Company, Product, etc...)"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem 1rem 0.75rem 2.5rem",
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "8px",
                color: colors.textPrimary,
                fontSize: "0.9rem",
                outline: "none",
                transition: "all 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
              onBlur={(e) => (e.target.style.borderColor = colors.inputBorder)}
            />
            <span
              style={{
                position: "absolute",
                left: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: colors.textTertiary,
                fontSize: "1rem",
              }}
            >
              🔍
            </span>
          </div>
        </div>

        {/* CATEGORY FILTER */}
        <select
          value={filters.estCat || "all"}
          onChange={(e) => handleFilterChange("estCat", e.target.value)}
          style={{
            padding: "0.75rem 1rem",
            background: colors.inputBg,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: "8px",
            color: colors.textPrimary,
            fontSize: "0.9rem",
            cursor: "pointer",
            outline: "none",
            transition: "all 0.3s ease",
          }}
        >
          <option value="all">All Categories</option>
          <option value="Pharmacy">Pharmacy</option>
          <option value="Hospital">Hospital</option>
          <option value="Drugstore">Drugstore</option>
        </select>

        {/* ✅ NEW: APP STATUS FILTER (Updated) */}
        <select
          value={filters.appStatus || "all"}
          onChange={(e) => handleFilterChange("appStatus", e.target.value)}
          style={{
            padding: "0.75rem 1rem",
            background: colors.inputBg,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: "8px",
            color: colors.textPrimary,
            fontSize: "0.9rem",
            cursor: "pointer",
            outline: "none",
            transition: "all 0.3s ease",
          }}
        >
          <option value="all">All Status</option>
          <option value="COMPLETED">✓ Completed</option>
          <option value="TO_DO">⏳ To Do</option>
          <option value="Approved">Approved</option>
          <option value="Pending">Pending</option>
          <option value="Rejected">Rejected</option>
        </select>

        {/* ✅ NEW: STATUS TIMELINE FILTER */}
        <select
          value={filters.statusTimeline || "all"}
          onChange={(e) => handleFilterChange("statusTimeline", e.target.value)}
          style={{
            padding: "0.75rem 1rem",
            background: colors.inputBg,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: "8px",
            color: colors.textPrimary,
            fontSize: "0.9rem",
            cursor: "pointer",
            outline: "none",
            transition: "all 0.3s ease",
          }}
        >
          <option value="all">All Timeline Status</option>
          <option value="WITHIN">✓ Within Timeline</option>
          <option value="BEYOND">⚠ Beyond Timeline</option>
        </select>

        {/* ADVANCED TOGGLE */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            padding: "0.75rem 1rem",
            background: showAdvanced ? "#4CAF50" : colors.inputBg,
            border: `1px solid ${
              showAdvanced ? "#4CAF50" : colors.inputBorder
            }`,
            borderRadius: "8px",
            color: showAdvanced ? "#fff" : colors.textPrimary,
            fontSize: "0.9rem",
            cursor: "pointer",
            fontWeight: "500",
            transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span>⚙️</span>
          <span>Advanced</span>
          {activeFilterCount > 0 && (
            <span
              style={{
                background: "#fff",
                color: "#4CAF50",
                padding: "0.2rem 0.5rem",
                borderRadius: "10px",
                fontSize: "0.75rem",
                fontWeight: "600",
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* CLEAR ALL */}
        {(activeFilterCount > 0 || searchTerm) && (
          <button
            onClick={clearAllFilters}
            style={{
              padding: "0.75rem 1rem",
              background: "transparent",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "8px",
              color: colors.textSecondary,
              fontSize: "0.9rem",
              cursor: "pointer",
              fontWeight: "500",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#f44336";
              e.currentTarget.style.borderColor = "#f44336";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = colors.textSecondary;
              e.currentTarget.style.borderColor = colors.cardBorder;
            }}
          >
            ✕ Clear All
          </button>
        )}
      </div>

      {/* ADVANCED FILTERS */}
      {showAdvanced && (
        <div
          style={{
            paddingTop: "1rem",
            borderTop: `1px solid ${colors.cardBorder}`,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            {/* PRODUCT FILTERS */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: colors.textTertiary,
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Dosage Form
              </label>
              <select
                value={filters.prodDosForm || "all"}
                onChange={(e) =>
                  handleFilterChange("prodDosForm", e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="all">All Forms</option>
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection</option>
                <option value="Suspension">Suspension</option>
                <option value="Solution">Solution</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: colors.textTertiary,
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Prescription Type
              </label>
              <select
                value={filters.prodClassPrescript || "all"}
                onChange={(e) =>
                  handleFilterChange("prodClassPrescript", e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="all">All Types</option>
                <option value="Prescription">Prescription</option>
                <option value="OTC">OTC</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: colors.textTertiary,
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Essential Drug
              </label>
              <select
                value={filters.prodEssDrugList || "all"}
                onChange={(e) =>
                  handleFilterChange("prodEssDrugList", e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="all">All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            {/* APPLICATION FILTERS */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: colors.textTertiary,
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                App Type
              </label>
              <select
                value={filters.appType || "all"}
                onChange={(e) => handleFilterChange("appType", e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="all">All Types</option>
                <option value="New">New</option>
                <option value="Renewal">Renewal</option>
                <option value="Amendment">Amendment</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: colors.textTertiary,
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Product Category
              </label>
              <select
                value={filters.prodCat || "all"}
                onChange={(e) => handleFilterChange("prodCat", e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="all">All Categories</option>
                <option value="Human">Human</option>
                <option value="Veterinary">Veterinary</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: colors.textTertiary,
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Manufacturer Country
              </label>
              <input
                type="text"
                placeholder="e.g., Philippines, USA"
                value={filters.prodManuCountry || ""}
                onChange={(e) =>
                  handleFilterChange("prodManuCountry", e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>

            {/* DATE FILTERS */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: colors.textTertiary,
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: colors.textTertiary,
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: colors.textTertiary,
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Evaluator
              </label>
              <input
                type="text"
                placeholder="Search evaluator"
                value={filters.eval || ""}
                onChange={(e) => handleFilterChange("eval", e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: colors.textTertiary,
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Uploader
              </label>
              <input
                type="text"
                placeholder="Search uploader"
                value={filters.userUploader || ""}
                onChange={(e) =>
                  handleFilterChange("userUploader", e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterBar;
