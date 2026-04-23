// FILE: src/components/reports/FilterBar.jsx
import { useState, useEffect, useRef } from "react";
import { getEstablishmentCategories } from "../../api/reports";
import { COUNTRIES } from "../tasks/viewdetails/config/constants";

const inputStyle = (colors, overrides = {}) => ({
  width: "100%",
  padding: "0.38rem 0.65rem",
  background: colors.inputBg,
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: "6px",
  color: colors.textPrimary,
  fontSize: "0.72rem",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
  ...overrides,
});

const labelStyle = (colors) => ({
  display: "block",
  fontSize: "0.62rem",
  fontWeight: "600",
  color: colors.textTertiary,
  marginBottom: "0.28rem",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
});

// ── General filters ──────────────────────────────────────────────────────────
const GENERAL_FIELDS = [
  {
    key: "dtn",
    label: "🔢 DTN Number",
    placeholder: "Enter DTN number",
    inputType: "number",
  },
  { key: "category", label: "📍 Est. Category", type: "select" },
  {
    key: "ltoCompany",
    label: "🏢 LTO Company",
    placeholder: "Search LTO company",
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
    key: "dosageForm",
    label: "💊 Dosage Form",
    placeholder: "e.g., Tablet, Capsule",
  },
];

// ── Supply chain filters ─────────────────────────────────────────────────────
const SUPPLY_CHAIN_FIELDS = [
  {
    key: "manufacturer",
    label: "🏭 Manufacturer",
    placeholder: "Search manufacturer name",
  },
  {
    key: "manufacturerCountry",
    label: "🌐 Manufacturer Country",
    type: "country",
  },
  { key: "trader", label: "🤝 Trader", placeholder: "Search trader name" },
  { key: "traderCountry", label: "🌐 Trader Country", type: "country" },
  {
    key: "importer",
    label: "📦 Importer",
    placeholder: "Search importer name",
  },
  { key: "importerCountry", label: "🌐 Importer Country", type: "country" },
  {
    key: "distributor",
    label: "🚚 Distributor",
    placeholder: "Search distributor name",
  },
  {
    key: "distributorCountry",
    label: "🌐 Distributor Country",
    type: "country",
  },
  {
    key: "repacker",
    label: "📦 Repacker",
    placeholder: "Search repacker name",
  },
  { key: "repackerCountry", label: "🌐 Repacker Country", type: "country" },
];

// ── Custom Country Dropdown ──────────────────────────────────────────────────
export function CountryDropdown({
  value,
  onChange,
  colors,
  accentColor,
  isActive,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const searchRef = useRef(null);

  const filtered = search.trim()
    ? COUNTRIES.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
    : COUNTRIES;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    if (!open) setSearch("");
  }, [open]);

  const handleSelect = (country) => {
    onChange(country);
    setOpen(false);
    setSearch("");
  };

  const displayLabel = value || "All Countries";

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          ...inputStyle(colors, {
            cursor: "pointer",
            borderColor: open
              ? accentColor
              : isActive
                ? accentColor
                : colors.inputBorder,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            textAlign: "left",
            gap: "0.4rem",
          }),
          appearance: "none",
          WebkitAppearance: "none",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            color: value ? colors.textPrimary : colors.textTertiary,
          }}
        >
          {displayLabel}
        </span>
        <span
          style={{
            fontSize: "0.55rem",
            color: colors.textTertiary,
            flexShrink: 0,
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: colors.cardBg,
            border: `1px solid ${accentColor}`,
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            zIndex: 9999,
            overflow: "hidden",
          }}
        >
          {/* Search input */}
          <div
            style={{
              padding: "0.4rem 0.5rem",
              borderBottom: `1px solid ${colors.cardBorder}`,
            }}
          >
            <input
              ref={searchRef}
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "0.3rem 0.5rem",
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "5px",
                color: colors.textPrimary,
                fontSize: "0.70rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Options list — max 40% of viewport height */}
          <div
            style={{
              maxHeight: "40vh",
              overflowY: "auto",
            }}
          >
            {/* All Countries option */}
            <div
              onClick={() => handleSelect("")}
              style={{
                padding: "0.4rem 0.65rem",
                fontSize: "0.72rem",
                cursor: "pointer",
                color: !value ? accentColor : colors.textPrimary,
                fontWeight: !value ? "600" : "400",
                background: !value ? `${accentColor}18` : "transparent",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (value) e.currentTarget.style.background = colors.inputBg;
              }}
              onMouseLeave={(e) => {
                if (value) e.currentTarget.style.background = "transparent";
              }}
            >
              All Countries
            </div>

            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "0.5rem 0.65rem",
                  fontSize: "0.70rem",
                  color: colors.textTertiary,
                  textAlign: "center",
                }}
              >
                No results
              </div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c}
                  onClick={() => handleSelect(c)}
                  style={{
                    padding: "0.4rem 0.65rem",
                    fontSize: "0.72rem",
                    cursor: "pointer",
                    color: value === c ? accentColor : colors.textPrimary,
                    fontWeight: value === c ? "600" : "400",
                    background:
                      value === c ? `${accentColor}18` : "transparent",
                    transition: "background 0.15s",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  onMouseEnter={(e) => {
                    if (value !== c)
                      e.currentTarget.style.background = colors.inputBg;
                  }}
                  onMouseLeave={(e) => {
                    if (value !== c)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  {c}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable field ───────────────────────────────────────────────────────────
function FilterField({
  field,
  value,
  onChange,
  colors,
  accentColor = "#4CAF50",
  categories = [],
  loadingCategories = false,
}) {
  const isActive = Boolean(value && value.trim() !== "");

  const onFocus = (e) => (e.target.style.borderColor = accentColor);
  const onBlur = (e) =>
    (e.target.style.borderColor = isActive ? accentColor : colors.inputBorder);

  const activeBorder = { borderColor: accentColor };
  const inactiveBorder = { borderColor: colors.inputBorder };

  return (
    <div>
      <label style={labelStyle(colors)}>
        {field.label}
        {isActive && (
          <span
            style={{
              float: "right",
              padding: "0.02rem 0.3rem",
              background: accentColor,
              color: "#fff",
              borderRadius: "6px",
              fontSize: "0.58rem",
              fontWeight: "700",
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            on
          </span>
        )}
      </label>

      {/* Establishment category select */}
      {field.type === "select" && (
        <select
          value={value || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          disabled={loadingCategories}
          style={inputStyle(colors, {
            cursor: loadingCategories ? "not-allowed" : "pointer",
            opacity: loadingCategories ? 0.6 : 1,
            ...(isActive ? activeBorder : {}),
          })}
        >
          <option value="">
            {loadingCategories ? "Loading…" : "All Categories"}
          </option>
          {categories.map((cat) => (
            <option key={cat.value || "empty"} value={cat.value || ""}>
              {cat.value || "No Category"} ({cat.count})
            </option>
          ))}
        </select>
      )}

      {/* ✅ Custom country dropdown — replaces native <select> */}
      {field.type === "country" && (
        <CountryDropdown
          value={value || ""}
          onChange={(val) => onChange(field.key, val)}
          colors={colors}
          accentColor={accentColor}
          isActive={isActive}
        />
      )}

      {/* Text / number input */}
      {!field.type && (
        <div style={{ position: "relative" }}>
          <input
            type={field.inputType || "text"}
            placeholder={field.placeholder}
            value={value || ""}
            onChange={(e) => onChange(field.key, e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            style={inputStyle(colors, {
              paddingRight: isActive ? "1.5rem" : "0.65rem",
              ...(isActive ? activeBorder : inactiveBorder),
            })}
          />
          {isActive && (
            <button
              onClick={() => onChange(field.key, "")}
              style={{
                position: "absolute",
                right: "0.4rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: colors.textTertiary,
                cursor: "pointer",
                fontSize: "0.65rem",
                lineHeight: 1,
                padding: 0,
              }}
              title="Clear"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
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
    const fetch = async () => {
      try {
        setLoadingCategories(true);
        let status = null;
        if (activeTab === "not-decked") status = "not_decked";
        else if (activeTab === "decked") status = "decked";
        const cats = await getEstablishmentCategories(
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
        setEstablishmentCategories(cats || []);
      } catch {
        setEstablishmentCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetch();
  }, [activeTab, subTab, prescriptionTab, appStatusTab]);

  const handleFilterChange = (key, value) =>
    onFilterChange({ ...filters, [key]: value });

  const clearAllFilters = () => {
    onFilterChange({});
    onSearchChange("");
  };

  const activeFilterCount = Object.values(filters).filter(
    (v) => v && v !== "all" && v.trim() !== "",
  ).length;

  const supplyChainActiveCount = SUPPLY_CHAIN_FIELDS.filter(
    (f) => filters[f.key] && filters[f.key].trim() !== "",
  ).length;

  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "12px",
        padding: "0.6rem 0.75rem",
        marginBottom: "0.75rem",
        transition: "all 0.3s ease",
      }}
    >
      {/* Primary row */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <div style={{ flex: "1", minWidth: "160px", position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: "0.6rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: colors.textTertiary,
              fontSize: "0.68rem",
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
            style={inputStyle(colors, { paddingLeft: "1.9rem" })}
            onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
            onBlur={(e) => (e.target.style.borderColor = colors.inputBorder)}
          />
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          style={{
            padding: "0.38rem 0.75rem",
            background: showAdvanced ? "#4CAF50" : colors.inputBg,
            border: `1px solid ${showAdvanced ? "#4CAF50" : colors.inputBorder}`,
            borderRadius: "6px",
            color: showAdvanced ? "#fff" : colors.textPrimary,
            fontSize: "0.72rem",
            cursor: "pointer",
            fontWeight: "500",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            whiteSpace: "nowrap",
          }}
        >
          <span>⚙️</span>
          <span>Advanced</span>
          {activeFilterCount > 0 && (
            <span
              style={{
                background: showAdvanced ? "#fff" : "#4CAF50",
                color: showAdvanced ? "#4CAF50" : "#fff",
                padding: "0.05rem 0.35rem",
                borderRadius: "10px",
                fontSize: "0.62rem",
                fontWeight: "700",
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Clear all */}
        {(activeFilterCount > 0 || searchTerm) && (
          <button
            onClick={clearAllFilters}
            style={{
              padding: "0.38rem 0.75rem",
              background: "transparent",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "6px",
              color: colors.textSecondary,
              fontSize: "0.72rem",
              cursor: "pointer",
              fontWeight: "500",
              transition: "all 0.2s",
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

      {/* Advanced panel */}
      {showAdvanced && (
        <div
          style={{
            paddingTop: "0.65rem",
            marginTop: "0.65rem",
            borderTop: `1px solid ${colors.cardBorder}`,
          }}
        >
          {/* Section A — General */}
          <p
            style={{
              margin: "0 0 0.5rem",
              fontSize: "0.6rem",
              fontWeight: "700",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: colors.textTertiary,
            }}
          >
            General Filters
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "0.5rem",
            }}
          >
            {GENERAL_FIELDS.map((field) => (
              <FilterField
                key={field.key}
                field={field}
                value={filters[field.key] || ""}
                onChange={handleFilterChange}
                colors={colors}
                accentColor="#4CAF50"
                categories={establishmentCategories}
                loadingCategories={loadingCategories}
              />
            ))}
          </div>

          {/* Section B — Supply Chain */}
          <div
            style={{
              marginTop: "0.75rem",
              paddingTop: "0.65rem",
              borderTop: `1px dashed ${colors.cardBorder}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.6rem",
                  fontWeight: "700",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: colors.textTertiary,
                }}
              >
                Supply Chain Filters
              </p>
              {supplyChainActiveCount > 0 && (
                <span
                  style={{
                    padding: "0.05rem 0.4rem",
                    background: "#6366f1",
                    color: "#fff",
                    borderRadius: "8px",
                    fontSize: "0.6rem",
                    fontWeight: "700",
                  }}
                >
                  {supplyChainActiveCount} active
                </span>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "0.5rem",
              }}
            >
              {SUPPLY_CHAIN_FIELDS.map((field) => (
                <FilterField
                  key={field.key}
                  field={field}
                  value={filters[field.key] || ""}
                  onChange={handleFilterChange}
                  colors={colors}
                  accentColor="#6366f1"
                />
              ))}
            </div>
          </div>

          {/* Tip */}
          <div
            style={{
              marginTop: "0.6rem",
              padding: "0.45rem 0.7rem",
              background: colors.badgeBg,
              borderRadius: "6px",
              fontSize: "0.68rem",
              color: colors.textSecondary,
              lineHeight: 1.5,
            }}
          >
            💡 <strong>Tip:</strong> Use the sidebar for Application Type,
            Classification, and Status filters.
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterBar;
