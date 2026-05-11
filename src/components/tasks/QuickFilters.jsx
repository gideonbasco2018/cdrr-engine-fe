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

  const processingTypes = useMemo(() => {
    const map = {};
    data.forEach((r) => {
      const v =
        r.processingType && r.processingType !== "N/A"
          ? r.processingType
          : null;
      if (v) map[v] = (map[v] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, count }));
  }, [data]);

  const activeFilterCount =
    (filters.appType ? 1 : 0) +
    (filters.prescription ? 1 : 0) +
    (filters.appStatus ? 1 : 0) +
    (filters.processingType ? 1 : 0) +
    (filters.sentBy ? 1 : 0) +
    (filters.lastModifiedFrom ? 1 : 0) +
    (filters.lastModifiedTo ? 1 : 0);

  const iconBtn = (onClick, title, children) => (
    <button
      onClick={onClick}
      title={title}
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
        fontSize: "0.7rem",
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
      {children}
    </button>
  );

  /* ── Collapsed state ── */
  if (!isSidebarOpen) {
    return (
      <div
        style={{
          width: "44px",
          minWidth: "44px",
          background: darkMode ? "#0a0a0a" : "#ffffff",
          borderRight: `1px solid ${colors.cardBorder}`,
          padding: "0.75rem 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.85rem",
          flexShrink: 0,
        }}
      >
        {iconBtn(() => setIsSidebarOpen(true), "Show filters", "▶")}

        {activeFilterCount > 0 && (
          <div
            onClick={() => setIsSidebarOpen(true)}
            title={`${activeFilterCount} active filter${activeFilterCount > 1 ? "s" : ""}`}
            style={{
              width: "18px",
              height: "18px",
              background: "#6366f1",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.6rem",
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {activeFilterCount}
          </div>
        )}

        {[
          { icon: "🗂️", key: "appType", title: "Application Type" },
          { icon: "💊", key: "prescription", title: "Classification" },
          { icon: "📌", key: "appStatus", title: "Status" },
          { icon: "⚡", key: "processingType", title: "Processing Type" },
        ].map(({ icon, key, title }) => (
          <span
            key={key}
            title={title}
            onClick={() => setIsSidebarOpen(true)}
            style={{
              fontSize: "1rem",
              opacity: filters[key] ? 1 : 0.3,
              cursor: "pointer",
              transition: "opacity 0.2s",
            }}
          >
            {icon}
          </span>
        ))}
      </div>
    );
  }

  /* ── Expanded state ── */
  return (
    <div
      style={{
        width: "190px",
        minWidth: "190px",
        background: darkMode ? "#0a0a0a" : "#ffffff",
        borderRight: `1px solid ${colors.cardBorder}`,
        overflowY: "hidden",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.6rem 0.75rem 0.6rem 0.85rem",
          borderBottom: `1px solid ${colors.cardBorder}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <h2
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: colors.textPrimary,
              margin: 0,
              letterSpacing: "0.01em",
            }}
          >
            Quick Filters
          </h2>
          {activeFilterCount > 0 && (
            <span
              style={{
                fontSize: "0.58rem",
                fontWeight: 700,
                background: "#6366f1",
                color: "#fff",
                borderRadius: 99,
                padding: "1px 6px",
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </div>
        {iconBtn(() => setIsSidebarOpen(false), "Hide filters", "◀")}
      </div>

      {/* Scrollable body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "0.6rem 0.6rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        {/* Search */}
        <div style={{ marginBottom: "0.5rem" }}>
          <div style={{ position: "relative" }}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.textTertiary}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: "absolute",
                left: "0.55rem",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="DTN, Company, Brand... (comma for multiple)"
              value={filters.search}
              onChange={(e) =>
                onFiltersChange({ ...filters, search: e.target.value })
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "0.45rem 1.8rem 0.45rem 1.8rem",
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "7px",
                color: colors.textPrimary,
                fontSize: "0.65rem",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = colors.inputBorder)}
            />
            {filters.search && (
              <button
                onClick={() => onFiltersChange({ ...filters, search: "" })}
                style={{
                  position: "absolute",
                  right: "0.45rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: colors.textTertiary,
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* ── Multi-search indicator ── */}
          {filters.search &&
            filters.search.includes(",") &&
            (() => {
              const terms = filters.search
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
              if (terms.length < 2) return null;
              return (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "3px",
                    marginTop: "6px",
                  }}
                >
                  {terms.map((term, i) => (
                    <span
                      key={i}
                      title={term}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        padding: "1px 7px",
                        borderRadius: "99px",
                        background: "#6366f115",
                        border: "1px solid #6366f140",
                        fontSize: "0.6rem",
                        color: "#6366f1",
                        fontWeight: 600,
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {term}
                    </span>
                  ))}
                  <span
                    style={{
                      fontSize: "0.58rem",
                      color: colors.textTertiary,
                      alignSelf: "center",
                      marginLeft: "2px",
                    }}
                  >
                    {terms.length} terms
                  </span>
                </div>
              );
            })()}
        </div>

        <div
          style={{
            height: "0.5px",
            background: colors.cardBorder,
            margin: "0 2px 0.4rem",
          }}
        />

        {appTypes.length > 0 && (
          <SidebarSection
            title="Application Type"
            groupColor="#6366f1"
            items={appTypes}
            activeItem={filters.appType || null}
            onItemClick={(v) =>
              onFiltersChange({ ...filters, appType: v ?? "" })
            }
            colors={colors}
            darkMode={darkMode}
            totalCount={appTypes.reduce((s, a) => s + a.count, 0)}
          />
        )}

        {prescriptions.length > 0 && (
          <SidebarSection
            title="Classification"
            groupColor="#0891b2"
            items={prescriptions}
            activeItem={filters.prescription || null}
            onItemClick={(v) =>
              onFiltersChange({ ...filters, prescription: v ?? "" })
            }
            colors={colors}
            darkMode={darkMode}
            totalCount={prescriptions.reduce((s, p) => s + p.count, 0)}
          />
        )}

        {statuses.length > 0 && (
          <SidebarSection
            title="Status"
            groupColor="#059669"
            items={statuses}
            activeItem={filters.appStatus || null}
            onItemClick={(v) =>
              onFiltersChange({ ...filters, appStatus: v ?? "" })
            }
            colors={colors}
            darkMode={darkMode}
            totalCount={statuses.reduce((s, x) => s + x.count, 0)}
          />
        )}

        {processingTypes.length > 0 && (
          <SidebarSection
            title="Processing Type"
            groupColor="#f97316"
            items={processingTypes}
            activeItem={filters.processingType || null}
            onItemClick={(v) =>
              onFiltersChange({ ...filters, processingType: v ?? "" })
            }
            colors={colors}
            darkMode={darkMode}
            totalCount={processingTypes.reduce((s, x) => s + x.count, 0)}
          />
        )}
      </div>
    </div>
  );
}

export default QuickFilters;
