// FILE: src/components/reports/FilterBar.jsx
import { useState, useEffect } from "react";
import { getEstablishmentCategories } from "../../api/reports";

function FilterBar({
  searchTerm,
  onSearchChange,
  colors,
  filters = {},
  onFilterChange,
  // ✅ NEW - Accept current filter context
  activeTab,
  subTab,
  prescriptionTab,
  appStatusTab,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [establishmentCategories, setEstablishmentCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // ✅ Fetch establishment categories based on current filters
  useEffect(() => {
    const fetchEstablishmentCategories = async () => {
      try {
        setLoadingCategories(true);

        // Determine status filter from active tab
        let status = null;
        if (activeTab === "not-decked") status = "not_decked";
        else if (activeTab === "decked") status = "decked";

        // Build params with current filter context
        const params = { status };

        // Add app type filter if selected
        if (subTab !== null) {
          params.app_type = subTab === "" ? "__EMPTY__" : subTab;
        }

        // Add prescription filter if selected
        if (prescriptionTab !== null) {
          params.prescription =
            prescriptionTab === "" ? "__EMPTY__" : prescriptionTab;
        }

        // Add app status filter if selected
        if (appStatusTab !== null) {
          params.app_status = appStatusTab === "" ? "__EMPTY__" : appStatusTab;
        }

        const categories = await getEstablishmentCategories(
          status,
          subTab !== null ? (subTab === "" ? "__EMPTY__" : subTab) : null,
          prescriptionTab !== null
            ? prescriptionTab === ""
              ? "__EMPTY__"
              : prescriptionTab
            : null,
          appStatusTab !== null
            ? appStatusTab === ""
              ? "__EMPTY__"
              : appStatusTab
            : null,
        );

        setEstablishmentCategories(categories || []);
      } catch (error) {
        console.error("Failed to fetch establishment categories:", error);
        setEstablishmentCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchEstablishmentCategories();
  }, [activeTab, subTab, prescriptionTab, appStatusTab]); // ✅ Refetch when any filter changes

  const handleFilterChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFilterChange({});
    onSearchChange("");
  };

  const activeFilterCount = Object.values(filters).filter(
    (v) => v && v !== "all" && v.trim() !== "",
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
        }}
      >
        {/* SEARCH INPUT */}
        <div style={{ flex: "1", minWidth: "300px" }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search by DTN, Company, Brand Name, Generic Name, Manufacturer..."
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
          <span>Advanced Filters</span>
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
            marginTop: "1rem",
            borderTop: `1px solid ${colors.cardBorder}`,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
            }}
          >
            {/* ✅ Establishment Category Filter - Dynamic with filtered counts */}
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
                📍 Establishment Category
              </label>
              <select
                value={filters.category || ""}
                onChange={(e) => handleFilterChange("category", e.target.value)}
                disabled={loadingCategories}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: loadingCategories
                    ? colors.cardBorder
                    : colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.9rem",
                  cursor: loadingCategories ? "not-allowed" : "pointer",
                  outline: "none",
                  opacity: loadingCategories ? 0.6 : 1,
                }}
              >
                <option value="">
                  {loadingCategories ? "Loading..." : "All Categories"}
                </option>
                {establishmentCategories.map((category) => (
                  <option
                    key={category.value || "empty"}
                    value={category.value || ""}
                  >
                    {category.value || "No Category"} ({category.count})
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ Dosage Form Filter */}
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
                💊 Dosage Form
              </label>
              <input
                type="text"
                placeholder="e.g., Tablet, Capsule, Syrup"
                value={filters.dosageForm || ""}
                onChange={(e) =>
                  handleFilterChange("dosageForm", e.target.value)
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

            {/* ✅ Manufacturer Filter */}
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
                🏭 Manufacturer
              </label>
              <input
                type="text"
                placeholder="Search manufacturer name"
                value={filters.manufacturer || ""}
                onChange={(e) =>
                  handleFilterChange("manufacturer", e.target.value)
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

            {/* ✅ LTO Company Filter */}
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
                🏢 LTO Company
              </label>
              <input
                type="text"
                placeholder="Search LTO company name"
                value={filters.ltoCompany || ""}
                onChange={(e) =>
                  handleFilterChange("ltoCompany", e.target.value)
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

            {/* ✅ Brand Name Filter */}
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
                🏷️ Brand Name
              </label>
              <input
                type="text"
                placeholder="Search brand name"
                value={filters.brandName || ""}
                onChange={(e) =>
                  handleFilterChange("brandName", e.target.value)
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

            {/* ✅ Generic Name Filter */}
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
                📋 Generic Name
              </label>
              <input
                type="text"
                placeholder="Search generic name"
                value={filters.genericName || ""}
                onChange={(e) =>
                  handleFilterChange("genericName", e.target.value)
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

            {/* ✅ DTN Search */}
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
                🔢 DTN Number
              </label>
              <input
                type="number"
                placeholder="Enter DTN number"
                value={filters.dtn || ""}
                onChange={(e) => handleFilterChange("dtn", e.target.value)}
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

          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              background: colors.badgeBg,
              borderRadius: "8px",
              fontSize: "0.85rem",
              color: colors.textSecondary,
            }}
          >
            💡 <strong>Tip:</strong> Use the tabs above for filtering by
            Application Type, Prescription Type, and Application Status.
            Advanced filters are for additional refinement.
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterBar;
