import { useState, useMemo } from "react";
import SidebarSection from "./SidebarSection";

function QuickFilters({ data, filters, onFiltersChange, colors, darkMode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const appTypes = useMemo(() => {
    const map = {};
    data.forEach((r) => {
      const v = r.appType && r.appType !== "N/A" ? r.appType : null;
      if (v) map[v] = (map[v] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, count }));
  }, [data]);

  const prescriptions = useMemo(() => {
    const map = {};
    data.forEach((r) => {
      const v =
        r.prodClassPrescript && r.prodClassPrescript !== "N/A"
          ? r.prodClassPrescript
          : null;
      if (v) map[v] = (map[v] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, count }));
  }, [data]);

  const statuses = useMemo(() => {
    const map = {};
    data.forEach((r) => {
      const v = r.appStatus && r.appStatus !== "N/A" ? r.appStatus : null;
      if (v) map[v] = (map[v] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, count }));
  }, [data]);

  const activeFilterCount =
    (filters.appType ? 1 : 0) +
    (filters.prescription ? 1 : 0) +
    (filters.appStatus ? 1 : 0);

  if (!isSidebarOpen) {
    return (
      <div
        style={{
          width: "52px",
          minWidth: "52px",
          background: darkMode ? "#0a0a0a" : "#ffffff",
          borderRight: `1px solid ${colors.cardBorder}`,
          padding: "1rem 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          flexShrink: 0,
          transition: "width 0.25s ease, min-width 0.25s ease",
        }}
      >
        <button
          onClick={() => setIsSidebarOpen(true)}
          title="Show Quick Filters"
          style={{
            width: "28px",
            height: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "6px",
            cursor: "pointer",
            color: colors.textTertiary,
            fontSize: "0.75rem",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = darkMode ? "#1f1f1f" : "#e5e5e5";
            e.currentTarget.style.color = colors.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = colors.textTertiary;
          }}
        >
          ▶
        </button>

        {activeFilterCount > 0 && (
          <div
            onClick={() => setIsSidebarOpen(true)}
            title={`${activeFilterCount} active filter${activeFilterCount > 1 ? "s" : ""} — click to expand`}
            style={{
              width: "20px",
              height: "20px",
              background: "#2196F3",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.7rem",
              fontWeight: "700",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {activeFilterCount}
          </div>
        )}

        <span
          title="Application Type (click to expand)"
          style={{ fontSize: "1.2rem", opacity: filters.appType ? 1 : 0.3, cursor: "pointer" }}
          onClick={() => setIsSidebarOpen(true)}
        >
          📄
        </span>
        <span
          title="Prescriptions (click to expand)"
          style={{ fontSize: "1.2rem", opacity: filters.prescription ? 1 : 0.3, cursor: "pointer" }}
          onClick={() => setIsSidebarOpen(true)}
        >
          💊
        </span>
        <span
          title="All Status (click to expand)"
          style={{ fontSize: "1.2rem", opacity: filters.appStatus ? 1 : 0.3, cursor: "pointer" }}
          onClick={() => setIsSidebarOpen(true)}
        >
          🔖
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "260px",
        minWidth: "260px",
        background: darkMode ? "#0a0a0a" : "#ffffff",
        borderRight: `1px solid ${colors.cardBorder}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
        transition: "width 0.25s ease, min-width 0.25s ease",
      }}
    >
      {/* Fixed header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.5rem 1.25rem 1rem",
          borderBottom: `2px solid ${colors.cardBorder}`,
          flexShrink: 0,
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.25rem" }}>⚡</span>
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: "700",
              color: colors.textPrimary,
              margin: 0,
              letterSpacing: "0.5px",
            }}
          >
            Quick Filters
          </h2>
        </div>
        <button
          onClick={() => setIsSidebarOpen(false)}
          title="Hide Quick Filters"
          style={{
            width: "28px",
            height: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "6px",
            cursor: "pointer",
            color: colors.textTertiary,
            fontSize: "0.75rem",
            flexShrink: 0,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = darkMode ? "#1f1f1f" : "#e5e5e5";
            e.currentTarget.style.color = colors.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = colors.textTertiary;
          }}
        >
          ◀
        </button>
      </div>

      {/* Scrollable content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          padding: "0.75rem 0.75rem 1rem",
          overflowY: "auto",
          overflowX: "hidden",
          flex: 1,
        }}
      >
        {/* Search */}
        <div style={{ padding: "0 0.25rem" }}>
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: "600",
              color: colors.textTertiary,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "0.4rem",
              marginTop: 0,
            }}
          >
            Search
          </p>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "0.65rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: colors.textTertiary,
                fontSize: "0.85rem",
                pointerEvents: "none",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="DTN, Company, Brand..."
              value={filters.search}
              onChange={(e) =>
                onFiltersChange({ ...filters, search: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.6rem 2rem 0.6rem 1.9rem",
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "8px",
                color: colors.textPrimary,
                fontSize: "0.82rem",
                boxSizing: "border-box",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => { e.target.style.borderColor = "#4CAF50"; }}
              onBlur={(e) => { e.target.style.borderColor = colors.inputBorder; }}
            />
            {filters.search && (
              <button
                onClick={() => onFiltersChange({ ...filters, search: "" })}
                style={{
                  position: "absolute",
                  right: "0.5rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: colors.textTertiary,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  padding: 0,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div style={{ height: "1px", background: colors.cardBorder, margin: "0 0.25rem" }} />

        {appTypes.length > 0 && (
          <SidebarSection
            title="Application Type"
            icon="📄"
            items={appTypes}
            activeItem={filters.appType || null}
            onItemClick={(value) =>
              onFiltersChange({ ...filters, appType: value ?? "" })
            }
            colors={colors}
            darkMode={darkMode}
            totalCount={appTypes.reduce((s, a) => s + a.count, 0)}
          />
        )}

        {prescriptions.length > 0 && (
          <SidebarSection
            title="Prescriptions"
            icon="💊"
            items={prescriptions}
            activeItem={filters.prescription || null}
            onItemClick={(value) =>
              onFiltersChange({ ...filters, prescription: value ?? "" })
            }
            colors={colors}
            darkMode={darkMode}
            totalCount={prescriptions.reduce((s, p) => s + p.count, 0)}
          />
        )}

        {statuses.length > 0 && (
          <SidebarSection
            title="All Status"
            icon="🔖"
            items={statuses}
            activeItem={filters.appStatus || null}
            onItemClick={(value) =>
              onFiltersChange({ ...filters, appStatus: value ?? "" })
            }
            colors={colors}
            darkMode={darkMode}
            totalCount={statuses.reduce((s, x) => s + x.count, 0)}
          />
        )}
      </div>
    </div>
  );
}

export default QuickFilters;
