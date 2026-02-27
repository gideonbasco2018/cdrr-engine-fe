// FILE: src/pages/ReportsPage.jsx
import { useState, useEffect } from "react";
import {
  getUploadReports,
  getAppTypes,
  getPrescriptionTypes,
  getAppStatusTypes,
  getProcessingTypes,
  exportFilteredRecords,
} from "../api/reports";

import FilterBar from "../components/reports/FilterBar";
import ReportsDataTable from "../components/reports/ReportsDataTable";
import { mapDataItem, getColorScheme } from "../components/reports/utils.js";

// ✅ Modern scrollbar styles
const scrollbarStyles = (darkMode) => `
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: ${darkMode ? "#0a0a0a" : "#f1f1f1"}; border-radius: 10px; }
  ::-webkit-scrollbar-thumb { background: ${darkMode ? "#404040" : "#c1c1c1"}; border-radius: 10px; transition: background 0.2s ease; }
  ::-webkit-scrollbar-thumb:hover { background: ${darkMode ? "#606060" : "#a0a0a0"}; }
  * { scrollbar-width: thin; scrollbar-color: ${darkMode ? "#404040 #0a0a0a" : "#c1c1c1 #f1f1f1"}; }
`;

// ─── SidebarSection ───────────────────────────────────────────────────────────
function SidebarSection({
  title,
  icon,
  items,
  activeItem,
  onItemClick,
  colors,
  darkMode,
  totalCount,
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div>
      {/* Collapsible header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "10px",
          cursor: "pointer",
          transition: "all 0.2s ease",
          marginBottom: "12px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = darkMode ? "#1f1f1f" : "#f0f0f0";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = colors.cardBg;
        }}
      >
        <div
          style={{
            fontSize: "14px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: colors.textPrimary,
          }}
        >
          <span>{icon}</span>
          <span>{title}</span>
          <span
            style={{
              background: darkMode ? "#1f1f1f" : "#e5e5e5",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              fontFamily: "monospace",
              color: colors.textTertiary,
            }}
          >
            {totalCount}
          </span>
        </div>
        <span
          style={{
            color: colors.textTertiary,
            transition: "transform 0.2s",
            transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
          }}
        >
          ▼
        </span>
      </div>

      {isOpen && (
        <div
          style={{
            paddingLeft: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {/* "All" option */}
          <div
            onClick={() => onItemClick(null)}
            style={{
              padding: "10px 16px",
              background:
                activeItem === null ? "rgba(33,150,243,0.1)" : "transparent",
              border: `1px solid ${activeItem === null ? "#2196F3" : "transparent"}`,
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "13px",
            }}
            onMouseEnter={(e) => {
              if (activeItem !== null) {
                e.currentTarget.style.background = colors.cardBg;
                e.currentTarget.style.borderColor = colors.cardBorder;
              }
            }}
            onMouseLeave={(e) => {
              if (activeItem !== null) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "transparent";
              }
            }}
          >
            <span style={{ color: colors.textPrimary }}>All {title}</span>
            <span
              style={{
                background:
                  activeItem === null
                    ? "#2196F3"
                    : darkMode
                      ? "#1f1f1f"
                      : "#e5e5e5",
                color: activeItem === null ? "#fff" : colors.textTertiary,
                padding: "3px 8px",
                borderRadius: "5px",
                fontSize: "11px",
                fontWeight: "600",
                fontFamily: "monospace",
              }}
            >
              {totalCount}
            </span>
          </div>

          {/* Individual items */}
          {items.map((item) => {
            const displayValue = item.value || `No ${title}`;
            const filterValue = item.value === null ? "" : item.value;
            const isActive = activeItem === filterValue;
            return (
              <div
                key={filterValue || `no-${title}`}
                onClick={() => onItemClick(filterValue)}
                style={{
                  padding: "10px 16px",
                  background: isActive ? "rgba(33,150,243,0.1)" : "transparent",
                  border: `1px solid ${isActive ? "#2196F3" : "transparent"}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "13px",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = colors.cardBg;
                    e.currentTarget.style.borderColor = colors.cardBorder;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "transparent";
                  }
                }}
              >
                <span style={{ color: colors.textPrimary }}>
                  {displayValue}
                </span>
                <span
                  style={{
                    background: isActive
                      ? "#2196F3"
                      : darkMode
                        ? "#1f1f1f"
                        : "#e5e5e5",
                    color: isActive ? "#fff" : colors.textTertiary,
                    padding: "3px 8px",
                    borderRadius: "5px",
                    fontSize: "11px",
                    fontWeight: "600",
                    fontFamily: "monospace",
                  }}
                >
                  {item.count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ReportsPage ──────────────────────────────────────────────────────────────
function ReportsPage({ darkMode }) {
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statsData, setStatsData] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
  });
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [subTab, setSubTab] = useState(null);
  const [prescriptionTab, setPrescriptionTab] = useState(null);
  const [appStatusTab, setAppStatusTab] = useState(null);

  // ✅ Processing type tab state — null = All, "__REGULAR__" = null/empty records
  const [processingTypeTab, setProcessingTypeTab] = useState(null);

  const [availableAppTypes, setAvailableAppTypes] = useState([]);
  const [availablePrescriptionTypes, setAvailablePrescriptionTypes] = useState(
    [],
  );
  const [availableAppStatusTypes, setAvailableAppStatusTypes] = useState([]);
  const [availableProcessingTypes, setAvailableProcessingTypes] = useState([]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sortBy, setSortBy] = useState("DB_DATE_EXCEL_UPLOAD");
  const [sortOrder, setSortOrder] = useState("desc");

  const colors = getColorScheme(darkMode);

  // ✅ Active filter count includes processingTypeTab
  const activeFilterCount =
    (subTab !== null ? 1 : 0) +
    (prescriptionTab !== null ? 1 : 0) +
    (appStatusTab !== null ? 1 : 0) +
    (processingTypeTab !== null ? 1 : 0);

  // ✅ Helper to convert processingTypeTab to API param
  const processingTypeParam =
    processingTypeTab === null
      ? null
      : processingTypeTab === "__REGULAR__"
        ? "__EMPTY__"
        : processingTypeTab;

  useEffect(() => {
    const id = "custom-scrollbar-styles-reports";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = scrollbarStyles(darkMode);
    return () => {
      const e = document.getElementById(id);
      if (e) e.remove();
    };
  }, [darkMode]);

  useEffect(() => {
    let username = null;
    const userStr =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userStr) {
      try {
        const o = JSON.parse(userStr);
        username = o.username || o.email || o.first_name;
      } catch {
        username = userStr;
      }
    }
    if (!username)
      username =
        localStorage.getItem("username") || sessionStorage.getItem("username");
    setCurrentUser(username || "Unknown User");
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const totalResponse = await getUploadReports({
          page: 1,
          pageSize: 1,
          search: "",
          sortBy: "DB_DATE_EXCEL_UPLOAD",
          sortOrder: "desc",
        });
        const total = totalResponse.total || 0;
        const statusTypes = await getAppStatusTypes(null, null, null, null);
        const completedObj = statusTypes.find((s) => s.value === "Completed");
        const completed = completedObj ? completedObj.count : 0;
        setStatsData({ total, completed, inProgress: total - completed });
      } catch {
        setStatsData({ total: 0, completed: 0, inProgress: 0 });
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  // ✅ Fetch processing types (always shows all, never filtered)
  useEffect(() => {
    getProcessingTypes(null)
      .then(setAvailableProcessingTypes)
      .catch(() => setAvailableProcessingTypes([]));
  }, []);

  // ✅ Fetch app types — updates when processingTypeTab changes
  useEffect(() => {
    getAppTypes(null, processingTypeParam)
      .then(setAvailableAppTypes)
      .catch(() => setAvailableAppTypes([]));
  }, [processingTypeTab]);

  // ✅ Fetch prescription types — updates when processingTypeTab or subTab changes
  useEffect(() => {
    getPrescriptionTypes(null, subTab, processingTypeParam)
      .then(setAvailablePrescriptionTypes)
      .catch(() => setAvailablePrescriptionTypes([]));
  }, [subTab, processingTypeTab]);

  // ✅ Fetch app status types — updates when processingTypeTab, subTab, or prescriptionTab changes
  useEffect(() => {
    getAppStatusTypes(null, subTab, prescriptionTab, processingTypeParam)
      .then(setAvailableAppStatusTypes)
      .catch(() => setAvailableAppStatusTypes([]));
  }, [subTab, prescriptionTab, processingTypeTab]);

  // ✅ Main data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = {
          page: currentPage,
          pageSize: rowsPerPage,
          search: searchTerm,
          sortBy,
          sortOrder,
        };
        if (filters.category) params.category = filters.category;
        if (filters.manufacturer) params.manufacturer = filters.manufacturer;
        if (filters.ltoCompany) params.lto_company = filters.ltoCompany;
        if (filters.brandName) params.brand_name = filters.brandName;
        if (filters.genericName) params.generic_name = filters.genericName;
        if (filters.dtn) params.dtn = parseInt(filters.dtn, 10);
        if (subTab !== null)
          params.app_type = subTab === "" ? "__EMPTY__" : subTab;
        if (prescriptionTab !== null)
          params.prescription =
            prescriptionTab === "" ? "__EMPTY__" : prescriptionTab;
        if (appStatusTab !== null)
          params.app_status = appStatusTab === "" ? "__EMPTY__" : appStatusTab;
        if (processingTypeTab !== null)
          params.processing_type = processingTypeParam;

        const json = await getUploadReports(params);
        setFilteredData(json?.data ? json.data.map(mapDataItem) : []);
        setTotalRecords(json?.total || 0);
        setTotalPages(json?.total_pages || 0);
      } catch {
        setFilteredData([]);
        setTotalRecords(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [
    currentPage,
    rowsPerPage,
    searchTerm,
    subTab,
    prescriptionTab,
    appStatusTab,
    processingTypeTab,
    filters,
    sortBy,
    sortOrder,
  ]);

  const handleExport = async () => {
    if (totalRecords === 0) {
      alert("❌ No records to export");
      return;
    }
    try {
      setExporting(true);
      const params = { search: searchTerm };
      if (filters.category) params.category = filters.category;
      if (filters.manufacturer) params.manufacturer = filters.manufacturer;
      if (filters.ltoCompany) params.lto_company = filters.ltoCompany;
      if (filters.brandName) params.brand_name = filters.brandName;
      if (filters.genericName) params.generic_name = filters.genericName;
      if (filters.dtn) params.dtn = parseInt(filters.dtn, 10);
      if (subTab !== null)
        params.app_type = subTab === "" ? "__EMPTY__" : subTab;
      if (prescriptionTab !== null)
        params.prescription =
          prescriptionTab === "" ? "__EMPTY__" : prescriptionTab;
      if (appStatusTab !== null)
        params.app_status = appStatusTab === "" ? "__EMPTY__" : appStatusTab;
      if (processingTypeTab !== null)
        params.processing_type = processingTypeParam;

      await exportFilteredRecords(params);
      alert(
        `✅ Export successful!\n\nExported ${totalRecords.toLocaleString()} records.`,
      );
    } catch (error) {
      let msg = "Unknown error";
      if (error.response?.data) {
        if (error.response.data instanceof Blob) {
          try {
            const t = await error.response.data.text();
            try {
              msg = JSON.parse(t).detail || t;
            } catch {
              msg = t;
            }
          } catch {
            msg = "Failed to parse error";
          }
        } else if (typeof error.response.data === "object") {
          msg =
            error.response.data.detail ||
            error.response.data.message ||
            JSON.stringify(error.response.data);
        } else {
          msg = String(error.response.data);
        }
      } else if (error.message) {
        msg = error.message;
      }
      alert(`❌ Export failed: ${msg}`);
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (column, order) => {
    setSortBy(column);
    setSortOrder(order);
    setCurrentPage(1);
  };

  // ✅ When processing type tab changes, reset all downstream filters
  const handleProcessingTypeTabChange = (value) => {
    setProcessingTypeTab(value);
    setSubTab(null);
    setPrescriptionTab(null);
    setAppStatusTab(null);
    setCurrentPage(1);
  };

  const handleSubTabChange = (value) => {
    setSubTab(value);
    setPrescriptionTab(null);
    setAppStatusTab(null);
    setCurrentPage(1);
  };

  const handlePrescriptionTabChange = (value) => {
    setPrescriptionTab(value);
    setAppStatusTab(null);
    setCurrentPage(1);
  };

  const handleAppStatusTabChange = (value) => {
    setAppStatusTab(value);
    setCurrentPage(1);
  };

  const handleSelectRow = (rowId) =>
    setSelectedRows((prev) =>
      prev.includes(rowId)
        ? prev.filter((id) => id !== rowId)
        : [...prev, rowId],
    );
  const handleSelectAll = (checked, rows) =>
    setSelectedRows(checked ? rows.map((r) => r.id) : []);
  const handlePageChange = (page) => setCurrentPage(page);
  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  // ✅ Build tab data
  const regularItem = availableProcessingTypes.find((p) => !p.value);
  const namedProcessingTypes = availableProcessingTypes.filter((p) => p.value);

  // ✅ Tab button style helper
  const tabButtonStyle = (isActive, accentColor = "#4CAF50") => ({
    padding: "0.5rem 1rem",
    fontSize: "0.85rem",
    background: "transparent",
    border: "none",
    borderBottom: isActive
      ? `3px solid ${accentColor}`
      : "3px solid transparent",
    color: isActive ? colors.textPrimary : colors.textTertiary,
    fontWeight: isActive ? "600" : "400",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    position: "relative",
    top: "2px",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
    flexShrink: 0,
  });

  const tabBadgeStyle = (isActive, accentColor = "#4CAF50") => ({
    padding: "0.2rem 0.6rem",
    background: isActive ? accentColor : darkMode ? "#1f1f1f" : "#e5e5e5",
    color: isActive ? "#fff" : colors.textTertiary,
    borderRadius: "12px",
    fontSize: "0.75rem",
    fontWeight: "600",
    minWidth: "32px",
    textAlign: "center",
  });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ══════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════ */}
      <div
        style={{
          width: isSidebarOpen ? "260px" : "52px",
          minWidth: isSidebarOpen ? "260px" : "52px",
          background: darkMode ? "#0a0a0a" : "#ffffff",
          borderRight: `1px solid ${colors.cardBorder}`,
          padding: isSidebarOpen ? "1.5rem 0" : "1rem 0",
          overflowY: "hidden",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          transition: "width 0.25s ease, min-width 0.25s ease",
          flexShrink: 0,
        }}
      >
        {isSidebarOpen ? (
          <>
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 1.25rem 1rem",
                borderBottom: `2px solid ${colors.cardBorder}`,
                overflow: "hidden",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
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
                  e.currentTarget.style.background = darkMode
                    ? "#1f1f1f"
                    : "#e5e5e5";
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
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                    onFocus={(e) => {
                      e.target.style.borderColor = "#4CAF50";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = colors.inputBorder;
                    }}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
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

              <div
                style={{
                  height: "1px",
                  background: colors.cardBorder,
                  margin: "0 0.25rem",
                }}
              />

              {/* Application Type */}
              {availableAppTypes.length > 0 && (
                <SidebarSection
                  title="Application Type"
                  icon="📦"
                  items={availableAppTypes}
                  activeItem={subTab}
                  onItemClick={handleSubTabChange}
                  colors={colors}
                  darkMode={darkMode}
                  totalCount={availableAppTypes.reduce(
                    (s, a) => s + a.count,
                    0,
                  )}
                />
              )}

              {/* Prescriptions */}
              {availablePrescriptionTypes.length > 0 && (
                <SidebarSection
                  title="Prescriptions"
                  icon="💊"
                  items={availablePrescriptionTypes}
                  activeItem={prescriptionTab}
                  onItemClick={handlePrescriptionTabChange}
                  colors={colors}
                  darkMode={darkMode}
                  totalCount={availablePrescriptionTypes.reduce(
                    (s, p) => s + p.count,
                    0,
                  )}
                />
              )}

              {/* All Status */}
              {availableAppStatusTypes.length > 0 && (
                <SidebarSection
                  title="All Status"
                  icon="📈"
                  items={availableAppStatusTypes}
                  activeItem={appStatusTab}
                  onItemClick={handleAppStatusTabChange}
                  colors={colors}
                  darkMode={darkMode}
                  totalCount={availableAppStatusTypes.reduce(
                    (s, x) => s + x.count,
                    0,
                  )}
                />
              )}
            </div>
          </>
        ) : (
          /* ── COLLAPSED icon strip ── */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              paddingTop: "0.75rem",
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
                flexShrink: 0,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = darkMode
                  ? "#1f1f1f"
                  : "#e5e5e5";
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
              style={{
                fontSize: "1.2rem",
                opacity: subTab !== null ? 1 : 0.3,
                cursor: "pointer",
              }}
              onClick={() => setIsSidebarOpen(true)}
            >
              📦
            </span>
            <span
              title="Prescriptions (click to expand)"
              style={{
                fontSize: "1.2rem",
                opacity: prescriptionTab !== null ? 1 : 0.3,
                cursor: "pointer",
              }}
              onClick={() => setIsSidebarOpen(true)}
            >
              💊
            </span>
            <span
              title="All Status (click to expand)"
              style={{
                fontSize: "1.2rem",
                opacity: appStatusTab !== null ? 1 : 0.3,
                cursor: "pointer",
              }}
              onClick={() => setIsSidebarOpen(true)}
            >
              📈
            </span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "2rem 2rem 0",
            background: colors.pageBg,
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "1.5rem",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "1.75rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                  color: colors.textPrimary,
                }}
              >
                Reports
              </h1>
              <p style={{ color: colors.textTertiary, fontSize: "0.9rem" }}>
                View and manage all CDRR reports
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting || totalRecords === 0}
              style={{
                padding: "0.625rem 1.25rem",
                background: exporting ? colors.cardBorder : "#10B981",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "500",
                cursor:
                  exporting || totalRecords === 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s ease",
                opacity: totalRecords === 0 ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!exporting && totalRecords > 0)
                  e.currentTarget.style.background = "#059669";
              }}
              onMouseLeave={(e) => {
                if (!exporting && totalRecords > 0)
                  e.currentTarget.style.background = "#10B981";
              }}
            >
              <span>{exporting ? "⏳" : "📥"}</span>
              <span>
                {exporting
                  ? "Exporting..."
                  : `Export (${totalRecords.toLocaleString()})`}
              </span>
            </button>
          </div>

          {/* Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            {[
              {
                icon: "📊",
                label: "Total Reports",
                value: statsLoading ? "..." : statsData.total.toLocaleString(),
                color: colors.textPrimary,
              },
              {
                icon: "⏳",
                label: "In Progress / Pending",
                value: statsLoading
                  ? "..."
                  : statsData.inProgress.toLocaleString(),
                color: "#FF9800",
              },
              {
                icon: "✅",
                label: "Completed",
                value: statsLoading
                  ? "..."
                  : statsData.completed.toLocaleString(),
                color: "#4CAF50",
              },
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  background: colors.cardBg,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "10px",
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <span style={{ fontSize: "1.4rem" }}>{stat.icon}</span>
                  <div>
                    <p
                      style={{
                        fontSize: "0.7rem",
                        color: colors.textTertiary,
                        marginBottom: "0.15rem",
                      }}
                    >
                      {stat.label}
                    </p>
                    <p
                      style={{
                        fontSize: "1.3rem",
                        fontWeight: "600",
                        color: stat.color,
                      }}
                    >
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ✅ Processing Type Tabs — dynamic, auto-expands with new DB_PROCESSING_TYPE values */}
          <div
            style={{
              display: "flex",
              gap: "0.25rem",
              borderBottom: `2px solid ${colors.cardBorder}`,
              paddingBottom: 0,
              overflowX: "auto",
              overflowY: "hidden",
              flexShrink: 0,
            }}
          >
            {/* ── All Reports tab ── */}
            <button
              onClick={() => handleProcessingTypeTabChange(null)}
              style={tabButtonStyle(processingTypeTab === null, "#4CAF50")}
            >
              <span style={{ fontSize: "1.1rem" }}>📋</span>
              <span>All Reports</span>
              <span
                style={tabBadgeStyle(processingTypeTab === null, "#4CAF50")}
              >
                {loading ? "..." : totalRecords.toLocaleString()}
              </span>
            </button>

            {/* ── Regular tab (records with null/empty processing type) ── */}
            {regularItem && (
              <button
                onClick={() => handleProcessingTypeTabChange("__REGULAR__")}
                style={tabButtonStyle(
                  processingTypeTab === "__REGULAR__",
                  "#2196F3",
                )}
              >
                <span>Regular</span>
                <span
                  style={tabBadgeStyle(
                    processingTypeTab === "__REGULAR__",
                    "#2196F3",
                  )}
                >
                  {regularItem.count}
                </span>
              </button>
            )}

            {/* ── Dynamic tabs per named DB_PROCESSING_TYPE value ── */}
            {namedProcessingTypes.map((pt) => {
              const isActive = processingTypeTab === pt.value;
              return (
                <button
                  key={pt.value}
                  onClick={() => handleProcessingTypeTabChange(pt.value)}
                  style={tabButtonStyle(isActive, "#2196F3")}
                >
                  <span>{pt.value}</span>
                  <span style={tabBadgeStyle(isActive, "#2196F3")}>
                    {pt.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "2rem",
            background: colors.pageBg,
          }}
        >
          <FilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filters={filters}
            onFilterChange={setFilters}
            colors={colors}
            activeTab="all"
            subTab={subTab}
            prescriptionTab={prescriptionTab}
            appStatusTab={appStatusTab}
          />

          {loading && (
            <div
              style={{
                background: colors.cardBg,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: "12px",
                padding: "3rem",
                textAlign: "center",
                color: colors.textSecondary,
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                }}
              >
                Loading reports...
              </div>
              <div style={{ fontSize: "0.9rem" }}>
                Page {currentPage} of {totalPages}
              </div>
            </div>
          )}

          {!loading && filteredData.length === 0 && (
            <div
              style={{
                background: colors.cardBg,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: "12px",
                padding: "3rem",
                textAlign: "center",
                color: colors.textSecondary,
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📭</div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                }}
              >
                No reports found
              </div>
              <div style={{ fontSize: "0.9rem" }}>
                No records found for the selected criteria
              </div>
            </div>
          )}

          {!loading && filteredData.length > 0 && (
            <ReportsDataTable
              data={filteredData}
              selectedRows={selectedRows}
              onSelectRow={handleSelectRow}
              onSelectAll={handleSelectAll}
              currentPage={currentPage}
              rowsPerPage={rowsPerPage}
              totalRecords={totalRecords}
              totalPages={totalPages}
              indexOfFirstRow={(currentPage - 1) * rowsPerPage + 1}
              indexOfLastRow={Math.min(currentPage * rowsPerPage, totalRecords)}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
              colors={colors}
              onSort={handleSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
              darkMode={darkMode}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;
