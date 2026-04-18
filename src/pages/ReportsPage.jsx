// FILE: src/pages/ReportsPage.jsx
// ✅ UPDATED: Font sizes, padding, and sizing matched to DeckingPage (compact)

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

// ─── helper: build API params from filters state ──────────────────────────────
function buildFilterParams(filters) {
  const p = {};
  // General filters
  if (filters.category) p.category = filters.category;
  if (filters.dosageForm) p.dosage_form = filters.dosageForm;
  if (filters.manufacturer) p.manufacturer = filters.manufacturer;
  if (filters.ltoCompany) p.lto_company = filters.ltoCompany;
  if (filters.brandName) p.brand_name = filters.brandName;
  if (filters.genericName) p.generic_name = filters.genericName;
  if (filters.dtn) p.dtn = parseInt(filters.dtn, 10);
  // ✅ Supply chain filters
  if (filters.manufacturerCountry)
    p.manufacturer_country = filters.manufacturerCountry;
  if (filters.trader) p.trader = filters.trader;
  if (filters.traderCountry) p.trader_country = filters.traderCountry;
  if (filters.importer) p.importer = filters.importer;
  if (filters.importerCountry) p.importer_country = filters.importerCountry;
  if (filters.distributor) p.distributor = filters.distributor;
  if (filters.distributorCountry)
    p.distributor_country = filters.distributorCountry;
  if (filters.repacker) p.repacker = filters.repacker;
  if (filters.repackerCountry) p.repacker_country = filters.repackerCountry;
  return p;
}

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
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "8px",
          cursor: "pointer",
          transition: "all 0.2s ease",
          marginBottom: "6px",
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
            fontSize: "0.72rem",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: colors.textPrimary,
          }}
        >
          <span style={{ fontSize: "0.8rem" }}>{icon}</span>
          <span>{title}</span>
          <span
            style={{
              background: darkMode ? "#1f1f1f" : "#e5e5e5",
              padding: "2px 7px",
              borderRadius: "5px",
              fontSize: "0.68rem",
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
            fontSize: "0.6rem",
          }}
        >
          ▼
        </span>
      </div>

      {isOpen && (
        <div
          style={{
            paddingLeft: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {/* "All" option */}
          <div
            onClick={() => onItemClick(null)}
            style={{
              padding: "7px 12px",
              background:
                activeItem === null ? "rgba(33,150,243,0.1)" : "transparent",
              border: `1px solid ${activeItem === null ? "#2196F3" : "transparent"}`,
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.72rem",
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
            <span style={{ color: colors.textPrimary, fontWeight: 500 }}>
              All {title}
            </span>
            <span
              style={{
                background:
                  activeItem === null
                    ? "#2196F3"
                    : darkMode
                      ? "#1f1f1f"
                      : "#e5e5e5",
                color: activeItem === null ? "#fff" : colors.textTertiary,
                padding: "2px 7px",
                borderRadius: "4px",
                fontSize: "0.68rem",
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
                  padding: "7px 12px",
                  background: isActive ? "rgba(33,150,243,0.1)" : "transparent",
                  border: `1px solid ${isActive ? "#2196F3" : "transparent"}`,
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "6px",
                  fontSize: "0.72rem",
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
                <span
                  style={{
                    color: colors.textPrimary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
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
                    padding: "2px 7px",
                    borderRadius: "4px",
                    fontSize: "0.68rem",
                    fontWeight: "600",
                    fontFamily: "monospace",
                    flexShrink: 0,
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

  const activeFilterCount =
    (subTab !== null ? 1 : 0) +
    (prescriptionTab !== null ? 1 : 0) +
    (appStatusTab !== null ? 1 : 0) +
    (processingTypeTab !== null ? 1 : 0);

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

  useEffect(() => {
    getProcessingTypes(null)
      .then(setAvailableProcessingTypes)
      .catch(() => setAvailableProcessingTypes([]));
  }, []);

  useEffect(() => {
    getAppTypes(null, processingTypeParam)
      .then(setAvailableAppTypes)
      .catch(() => setAvailableAppTypes([]));
  }, [processingTypeTab]);

  useEffect(() => {
    getPrescriptionTypes(null, subTab, processingTypeParam)
      .then(setAvailablePrescriptionTypes)
      .catch(() => setAvailablePrescriptionTypes([]));
  }, [subTab, processingTypeTab]);

  useEffect(() => {
    getAppStatusTypes(null, subTab, prescriptionTab, processingTypeParam)
      .then(setAvailableAppStatusTypes)
      .catch(() => setAvailableAppStatusTypes([]));
  }, [subTab, prescriptionTab, processingTypeTab]);

  // ✅ fetchData — now includes all supply chain filter params
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
          // spread all filter params (general + supply chain)
          ...buildFilterParams(filters),
        };
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

  // ✅ handleExport — same supply chain params
  const handleExport = async () => {
    if (totalRecords === 0) {
      alert("❌ No records to export");
      return;
    }
    try {
      setExporting(true);
      const params = {
        search: searchTerm,
        ...buildFilterParams(filters),
      };
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

  const regularItem = availableProcessingTypes.find((p) => !p.value);
  const namedProcessingTypes = availableProcessingTypes.filter((p) => p.value);

  const tabButtonStyle = (isActive) => ({
    padding: "0.35rem 0.85rem",
    fontSize: "0.78rem",
    background: "transparent",
    border: "none",
    borderBottom: isActive ? "3px solid #4CAF50" : "3px solid transparent",
    color: isActive ? colors.textPrimary : colors.textSecondary,
    fontWeight: isActive ? "600" : "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    position: "relative",
    top: "2px",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
    flexShrink: 0,
  });

  const tabBadgeStyle = (isActive) => ({
    padding: "0.1rem 0.45rem",
    background: isActive ? "#4CAF50" : colors.badgeBg,
    color: isActive ? "#fff" : colors.textTertiary,
    borderRadius: "12px",
    fontSize: "0.68rem",
    fontWeight: "600",
    minWidth: "28px",
    textAlign: "center",
  });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ══════ SIDEBAR ══════ */}
      <div
        style={{
          width: isSidebarOpen ? "200px" : "52px",
          minWidth: isSidebarOpen ? "200px" : "52px",
          background: darkMode ? "#0a0a0a" : "#ffffff",
          borderRight: `1px solid ${colors.cardBorder}`,
          padding: isSidebarOpen ? "1rem 0" : "1rem 0",
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 1rem 0.75rem",
                borderBottom: `2px solid ${colors.cardBorder}`,
                flexShrink: 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <span style={{ fontSize: "1rem" }}>⚡</span>
                <h2
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: "600",
                    color: colors.textPrimary,
                    margin: 0,
                  }}
                >
                  Quick Filters
                </h2>
                {activeFilterCount > 0 && (
                  <span
                    style={{
                      background: "#2196F3",
                      color: "#fff",
                      borderRadius: "10px",
                      padding: "2px 8px",
                      fontSize: "0.68rem",
                      fontWeight: "700",
                    }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                title="Hide Quick Filters"
                style={{
                  width: "26px",
                  height: "26px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "6px",
                  cursor: "pointer",
                  color: colors.textTertiary,
                  fontSize: "0.7rem",
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

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                padding: "0.75rem 0.75rem 1rem",
                overflowY: "auto",
                overflowX: "hidden",
                flex: 1,
              }}
            >
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
              {availablePrescriptionTypes.length > 0 && (
                <SidebarSection
                  title="Classification"
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
              {availableAppStatusTypes.length > 0 && (
                <SidebarSection
                  title="Application Status"
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
                width: "26px",
                height: "26px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: "6px",
                cursor: "pointer",
                color: colors.textTertiary,
                fontSize: "0.7rem",
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
                  width: "18px",
                  height: "18px",
                  background: "#2196F3",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.65rem",
                  fontWeight: "700",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {activeFilterCount}
              </div>
            )}
            {[
              {
                icon: "📦",
                title: "Application Type",
                active: subTab !== null,
              },
              {
                icon: "💊",
                title: "Classification",
                active: prescriptionTab !== null,
              },
              {
                icon: "📈",
                title: "Application Status",
                active: appStatusTab !== null,
              },
            ].map((item) => (
              <span
                key={item.icon}
                title={`${item.title} (click to expand)`}
                style={{
                  fontSize: "1rem",
                  opacity: item.active ? 1 : 0.3,
                  cursor: "pointer",
                }}
                onClick={() => setIsSidebarOpen(true)}
              >
                {item.icon}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ══════ MAIN CONTENT ══════ */}
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
        {/* Header */}
        <div
          style={{
            padding: "0.85rem 1.5rem 0.85rem",
            background: colors.pageBg,
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            {/* Title */}
            <div style={{ flexShrink: 0 }}>
              <h1
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "600",
                  color: colors.textPrimary,
                  margin: 0,
                }}
              >
                Reports
              </h1>
              <p
                style={{
                  color: colors.textTertiary,
                  fontSize: "0.75rem",
                  margin: "0.2rem 0 0",
                }}
              >
                View and manage all CDRR reports
              </p>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
              {[
                {
                  icon: "📊",
                  label: "Total Reports",
                  value: statsLoading
                    ? "..."
                    : statsData.total.toLocaleString(),
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
                    borderRadius: "8px",
                    padding: "0.4rem 1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    height: "100%",
                  }}
                >
                  <span style={{ fontSize: "0.85rem" }}>{stat.icon}</span>
                  <div>
                    <p
                      style={{
                        fontSize: "0.6rem",
                        color: colors.textTertiary,
                        margin: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {stat.label}
                    </p>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        color: stat.color,
                        margin: 0,
                      }}
                    >
                      {stat.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Export button */}
            <button
              onClick={handleExport}
              disabled={exporting || totalRecords === 0}
              style={{
                padding: "0.7rem 1rem",
                background: exporting ? colors.cardBorder : "#10B981",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.75rem",
                fontWeight: "500",
                cursor:
                  exporting || totalRecords === 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                transition: "all 0.2s ease",
                opacity: totalRecords === 0 ? 0.5 : 1,
                flexShrink: 0,
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

          {/* Processing Type Tabs */}
          <div
            style={{
              display: "flex",
              gap: "0.25rem",
              marginTop: "0.5rem",
              borderBottom: `2px solid ${colors.cardBorder}`,
              overflowX: "auto",
              overflowY: "hidden",
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => handleProcessingTypeTabChange(null)}
              style={tabButtonStyle(processingTypeTab === null)}
            >
              <span style={{ fontSize: "0.82rem" }}>📋</span>
              <span>All Reports</span>
              <span style={tabBadgeStyle(processingTypeTab === null)}>
                {loading ? "..." : totalRecords.toLocaleString()}
              </span>
            </button>

            {regularItem && (
              <button
                onClick={() => handleProcessingTypeTabChange("__REGULAR__")}
                style={tabButtonStyle(processingTypeTab === "__REGULAR__")}
              >
                <span>Regular</span>
                <span
                  style={tabBadgeStyle(processingTypeTab === "__REGULAR__")}
                >
                  {regularItem.count}
                </span>
              </button>
            )}

            {namedProcessingTypes.map((pt) => (
              <button
                key={pt.value}
                onClick={() => handleProcessingTypeTabChange(pt.value)}
                style={tabButtonStyle(processingTypeTab === pt.value)}
              >
                <span>{pt.value}</span>
                <span style={tabBadgeStyle(processingTypeTab === pt.value)}>
                  {pt.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.85rem 1.5rem",
            background: colors.pageBg,
          }}
        >
          <FilterBar
            searchTerm={searchTerm}
            onSearchChange={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            filters={filters}
            onFilterChange={(newFilters) => {
              setFilters(newFilters);
              setCurrentPage(1);
            }}
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
              <div style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>
                ⏳
              </div>
              <div
                style={{
                  fontSize: "0.88rem",
                  fontWeight: "600",
                  marginBottom: "0.35rem",
                }}
              >
                Loading reports...
              </div>
              <div style={{ fontSize: "0.75rem" }}>
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
              <div style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>
                📭
              </div>
              <div
                style={{
                  fontSize: "0.88rem",
                  fontWeight: "600",
                  marginBottom: "0.35rem",
                }}
              >
                No reports found
              </div>
              <div style={{ fontSize: "0.75rem" }}>
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
