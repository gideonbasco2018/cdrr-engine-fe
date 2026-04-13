// FILE: src/components/reports/FilterBar.jsx
import { useState, useEffect } from "react";
import { getEstablishmentCategories } from "../../api/reports";

function FilterBar({
  searchTerm,
  onSearchChange,
  colors,
  filters = {},
  onFilterChange,
  activeTab,
  subTab,
  prescriptionTab,
  appStatusTab,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [establishmentCategories, setEstablishmentCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    const fetchEstablishmentCategories = async () => {
      try {
        setLoadingCategories(true);
        let status = null;
        if (activeTab === "not-decked") status = "not_decked";
        else if (activeTab === "decked") status = "decked";
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
  }, [activeTab, subTab, prescriptionTab, appStatusTab]);

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
        padding: "0.75rem",
        marginBottom: "0.75rem",
        transition: "all 0.3s ease",
      }}
    >
      {/* PRIMARY FILTERS */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* SEARCH INPUT */}
        <div style={{ flex: "1", minWidth: "100px" }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search by DTN, Company, Brand Name, Generic Name, Manufacturer..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 1rem 0.5rem 2.2rem",
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "8px",
                color: colors.textPrimary,
                fontSize: "0.75rem",
                outline: "none",
                transition: "all 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
              onBlur={(e) => (e.target.style.borderColor = colors.inputBorder)}
            />
            <span
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: colors.textTertiary,
                fontSize: "0.7rem",
                pointerEvents: "none",
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
            padding: "0.5rem 0.85rem",
            background: showAdvanced ? "#4CAF50" : colors.inputBg,
            border: `1px solid ${showAdvanced ? "#4CAF50" : colors.inputBorder}`,
            borderRadius: "8px",
            color: showAdvanced ? "#fff" : colors.textPrimary,
            fontSize: "0.75rem",
            cursor: "pointer",
            fontWeight: "500",
            transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: "0.78rem" }}>⚙️</span>
          <span>Advanced Filters</span>
          {activeFilterCount > 0 && (
            <span
              style={{
                background: "#fff",
                color: "#4CAF50",
                padding: "0.1rem 0.4rem",
                borderRadius: "10px",
                fontSize: "0.68rem",
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
              padding: "0.5rem 0.85rem",
              background: "transparent",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "8px",
              color: colors.textSecondary,
              fontSize: "0.75rem",
              cursor: "pointer",
              fontWeight: "500",
              transition: "all 0.3s ease",
              whiteSpace: "nowrap",
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
            paddingTop: "0.75rem",
            marginTop: "0.75rem",
            borderTop: `1px solid ${colors.cardBorder}`,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {[
              {
                key: "category",
                label: "📍 Establishment Category",
                type: "select",
              },
              {
                key: "dosageForm",
                label: "💊 Dosage Form",
                placeholder: "e.g., Tablet, Capsule, Syrup",
              },
              {
                key: "manufacturer",
                label: "🏭 Manufacturer",
                placeholder: "Search manufacturer name",
              },
              {
                key: "ltoCompany",
                label: "🏢 LTO Company",
                placeholder: "Search LTO company name",
              },
              {
                key: "brandName",
                label: "🏷️ Brand Name",
                placeholder: "Search brand name",
              },
              {
                key: "genericName",
                label: "📋 Generic Name",
                placeholder: "Search generic name",
              },
              {
                key: "dtn",
                label: "🔢 DTN Number",
                placeholder: "Enter DTN number",
                type: "number",
              },
            ].map((field) => (
              <div key={field.key}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.72rem",
                    fontWeight: "600",
                    color: colors.textTertiary,
                    marginBottom: "0.4rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {field.label}
                </label>
                {field.type === "select" ? (
                  <select
                    value={filters.category || ""}
                    onChange={(e) =>
                      handleFilterChange("category", e.target.value)
                    }
                    disabled={loadingCategories}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      background: loadingCategories
                        ? colors.cardBorder
                        : colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "8px",
                      color: colors.textPrimary,
                      fontSize: "0.75rem",
                      cursor: loadingCategories ? "not-allowed" : "pointer",
                      outline: "none",
                      opacity: loadingCategories ? 0.6 : 1,
                      boxSizing: "border-box",
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
                ) : (
                  <input
                    type={field.type || "text"}
                    placeholder={field.placeholder}
                    value={filters[field.key] || ""}
                    onChange={(e) =>
                      handleFilterChange(field.key, e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "8px",
                      color: colors.textPrimary,
                      fontSize: "0.75rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = colors.inputBorder)
                    }
                  />
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "0.75rem",
              padding: "0.65rem 0.85rem",
              background: colors.badgeBg,
              borderRadius: "8px",
              fontSize: "0.72rem",
              color: colors.textSecondary,
              lineHeight: 1.5,
            }}
          >
            💡 <strong>Tip:</strong> Use the sidebar for filtering by
            Application Type, Classification, and Status. Advanced filters are
            for additional refinement.
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterBar;
