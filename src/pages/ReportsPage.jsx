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

function buildFilterParams(filters) {
  const p = {};
  if (filters.category) p.category = filters.category;
  if (filters.dosageForm) p.dosage_form = filters.dosageForm;
  if (filters.manufacturer) p.manufacturer = filters.manufacturer;
  if (filters.ltoCompany) p.lto_company = filters.ltoCompany;
  if (filters.brandName) p.brand_name = filters.brandName;
  if (filters.genericName) p.generic_name = filters.genericName;
  if (filters.dtn) p.dtn = parseInt(filters.dtn, 10);
  if (filters.typeDocReleased) p.type_doc_released = filters.typeDocReleased;
  if (filters.dateReleasedFrom) p.date_released_from = filters.dateReleasedFrom;
  if (filters.dateReleasedTo) p.date_released_to = filters.dateReleasedTo;
  if (filters.userUploader) p.user_uploader = filters.userUploader;
  if (filters.dateExcelUploadFrom)
    p.date_excel_upload_from = filters.dateExcelUploadFrom;
  if (filters.dateExcelUploadTo)
    p.date_excel_upload_to = filters.dateExcelUploadTo;
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

/* ── SidebarSection ── */
const ITEM_DOT_COLORS = [
  "#7c3aed",
  "#0891b2",
  "#059669",
  "#b45309",
  "#f97316",
  "#be185d",
  "#6366f1",
  "#e11d48",
  "#0ea5e9",
  "#84cc16",
  "#a855f7",
  "#14b8a6",
];

function SidebarSection({
  title,
  groupColor,
  items,
  activeItem,
  onItemClick,
  colors,
  darkMode,
  totalCount,
}) {
  const [isOpen, setIsOpen] = useState(true);

  const activeBg = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.055)";
  const activeBorder = darkMode ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.1)";
  const hoverBg = darkMode ? "#161616" : "#f0f0f0";

  return (
    <div style={{ marginBottom: 2 }}>
      {/* Group header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 4px 3px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: groupColor,
              flexShrink: 0,
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: "0.6rem",
              fontWeight: 700,
              color: colors.textTertiary,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {title}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              fontSize: "0.58rem",
              color: colors.textTertiary,
              background: darkMode ? "#1a1a1a" : "#e8e8e8",
              borderRadius: 4,
              padding: "1px 5px",
              fontWeight: 600,
            }}
          >
            {items.length}
          </span>
          <svg
            width="8"
            height="8"
            viewBox="0 0 10 10"
            style={{
              transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 0.2s",
              flexShrink: 0,
            }}
          >
            <polyline
              points="1,3 5,7 9,3"
              fill="none"
              stroke={colors.textTertiary}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            marginBottom: 2,
          }}
        >
          {/* All option */}
          <div
            onClick={() => onItemClick(null)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "3px 6px",
              borderRadius: 5,
              cursor: "pointer",
              background: activeItem === null ? activeBg : "transparent",
              border: `0.5px solid ${activeItem === null ? activeBorder : "transparent"}`,
            }}
            onMouseEnter={(e) => {
              if (activeItem !== null)
                e.currentTarget.style.background = hoverBg;
            }}
            onMouseLeave={(e) => {
              if (activeItem !== null)
                e.currentTarget.style.background = "transparent";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: groupColor,
                  opacity: 0.5,
                  flexShrink: 0,
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: activeItem === null ? 600 : 400,
                  color:
                    activeItem === null
                      ? colors.textPrimary
                      : colors.textSecondary,
                }}
              >
                All
              </span>
            </div>
            <span
              style={{
                fontSize: "0.6rem",
                fontWeight: 600,
                color:
                  activeItem === null
                    ? colors.textPrimary
                    : colors.textTertiary,
                background: darkMode ? "#1a1a1a" : "#e8e8e8",
                borderRadius: 99,
                padding: "1px 6px",
                minWidth: 18,
                textAlign: "center",
              }}
            >
              {totalCount}
            </span>
          </div>

          {/* Individual items */}
          {items.map((item, idx) => {
            const displayValue = item.value || `No ${title}`;
            const filterValue = item.value === null ? "" : item.value;
            const isActive = activeItem === filterValue;
            const dot = ITEM_DOT_COLORS[idx % ITEM_DOT_COLORS.length];
            return (
              <div
                key={filterValue || `no-${title}`}
                onClick={() => onItemClick(filterValue)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "3px 6px",
                  borderRadius: 5,
                  cursor: "pointer",
                  background: isActive ? activeBg : "transparent",
                  border: `0.5px solid ${isActive ? activeBorder : "transparent"}`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = hoverBg;
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: dot,
                      flexShrink: 0,
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive
                        ? colors.textPrimary
                        : colors.textSecondary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {displayValue}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    color: isActive ? colors.textPrimary : colors.textTertiary,
                    background: darkMode ? "#1a1a1a" : "#e8e8e8",
                    borderRadius: 99,
                    padding: "1px 6px",
                    minWidth: 18,
                    textAlign: "center",
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

      {/* Divider */}
      <div
        style={{
          height: "0.5px",
          background: colors.cardBorder,
          margin: "4px 2px 3px",
        }}
      />
    </div>
  );
}

/* ── ReportsPage ── */
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

  const iconBtn = (onClick, title, children) => (
    <button
      onClick={onClick}
      title={title}
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
        transition: "all 0.2s ease",
        flexShrink: 0,
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

  const handleExport = async () => {
    if (totalRecords === 0) {
      alert("❌ No records to export");
      return;
    }
    try {
      setExporting(true);
      const params = { search: searchTerm, ...buildFilterParams(filters) };
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

  const handleSort = (col, ord) => {
    setSortBy(col);
    setSortOrder(ord);
    setCurrentPage(1);
  };
  const handleProcessingTypeTabChange = (v) => {
    setProcessingTypeTab(v);
    setSubTab(null);
    setPrescriptionTab(null);
    setAppStatusTab(null);
    setCurrentPage(1);
  };
  const handleSubTabChange = (v) => {
    setSubTab(v);
    setPrescriptionTab(null);
    setAppStatusTab(null);
    setCurrentPage(1);
  };
  const handlePrescriptionTabChange = (v) => {
    setPrescriptionTab(v);
    setAppStatusTab(null);
    setCurrentPage(1);
  };
  const handleAppStatusTabChange = (v) => {
    setAppStatusTab(v);
    setCurrentPage(1);
  };
  const handleSelectRow = (id) =>
    setSelectedRows((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  const handleSelectAll = (checked, rows) =>
    setSelectedRows(checked ? rows.map((r) => r.id) : []);
  const handlePageChange = (page) => setCurrentPage(page);
  const handleRowsPerPageChange = (val) => {
    setRowsPerPage(val);
    setCurrentPage(1);
  };

  const regularItem = availableProcessingTypes.find((p) => !p.value);
  const namedProcessingTypes = availableProcessingTypes.filter((p) => p.value);

  const tabButtonStyle = (isActive) => ({
    padding: "6px 14px",
    fontSize: "12px",
    background: "transparent",
    border: "none",
    borderBottom: isActive ? "2px solid #10b981" : "2px solid transparent",
    color: isActive ? colors.textPrimary : colors.textTertiary,
    fontWeight: isActive ? "500" : "400",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    position: "relative",
    top: "1px",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
    flexShrink: 0,
  });

  const tabBadgeStyle = (isActive) => ({
    fontSize: "10px",
    padding: "1px 6px",
    borderRadius: "999px",
    background: isActive ? "#10b981" : colors.badgeBg,
    color: isActive ? "#fff" : colors.textTertiary,
    border: `0.5px solid ${isActive ? "#10b981" : colors.cardBorder}`,
    fontWeight: "600",
    minWidth: "20px",
    textAlign: "center",
  });
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ── Sidebar ── */}
      <div
        style={{
          width: isSidebarOpen ? "190px" : "44px",
          minWidth: isSidebarOpen ? "190px" : "44px",
          background: darkMode ? "#0a0a0a" : "#ffffff",
          borderRight: `1px solid ${colors.cardBorder}`,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 0.25s ease, min-width 0.25s ease",
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
                padding: "0.6rem 0.75rem 0.6rem 0.85rem",
                borderBottom: `1px solid ${colors.cardBorder}`,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                }}
              >
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
              {availableAppTypes.length > 0 && (
                <SidebarSection
                  title="Application Type"
                  groupColor="#6366f1"
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
                  groupColor="#0891b2"
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
                  groupColor="#059669"
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
          /* Collapsed */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.85rem",
              padding: "0.75rem 0",
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
              { icon: "🗂️", key: subTab, title: "Application Type" },
              { icon: "💊", key: prescriptionTab, title: "Classification" },
              { icon: "📌", key: appStatusTab, title: "Application Status" },
              { icon: "⚡", key: processingTypeTab, title: "Processing Type" },
            ].map(({ icon, key, title }) => (
              <span
                key={title}
                title={title}
                onClick={() => setIsSidebarOpen(true)}
                style={{
                  fontSize: "1rem",
                  cursor: "pointer",
                  opacity: key !== null ? 1 : 0.3,
                  transition: "opacity 0.2s",
                }}
              >
                {icon}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Main content ── */}
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
            padding: "0.85rem 1.5rem",
            background: colors.pageBg,
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderBottom: `1px solid ${colors.cardBorder}`,
              marginTop: "0.5rem",
            }}
          >
            {/* TABS — scrollable lang ito */}
            <div
              style={{
                display: "flex",
                flex: 1,
                overflowX: "auto",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              <button
                onClick={() => handleProcessingTypeTabChange(null)}
                style={tabButtonStyle(processingTypeTab === null)}
              >
                <span>📋</span>
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

            {/* EXPORT — hindi nag-scroll, naka-fix sa kanan */}
            <div
              style={{
                flexShrink: 0,
                paddingLeft: "8px",
                paddingBottom: "4px",
                borderLeft: `1px solid ${colors.cardBorder}`,
              }}
            >
              <button
                onClick={handleExport}
                disabled={exporting || totalRecords === 0}
                style={{
                  padding: "4px 12px",
                  background: exporting
                    ? colors.cardBorder
                    : "linear-gradient(135deg, #10B981, #059669)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor:
                    exporting || totalRecords === 0 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  opacity: totalRecords === 0 ? 0.5 : 1,
                  boxShadow: "0 2px 6px rgba(16,185,129,0.25)",
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
                  fontWeight: 600,
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
                  fontWeight: 600,
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
