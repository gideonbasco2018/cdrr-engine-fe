// FILE: src/pages/DeckingPage.jsx
import { useState, useEffect } from "react";
import {
  getUploadReports,
  uploadExcelFile,
  downloadTemplate,
  getAppTypes,
  getPrescriptionTypes,
  getAppStatusTypes,
  exportFilteredRecords,
  updateUploadReport,
} from "../api/reports";

import StatsCard from "../components/reports/StatsCard";
import FilterBar from "../components/reports/FilterBar";
import UploadButton from "../components/reports/UploadButton";
import UploadProgress from "../components/reports/UploadProgress";
import DataTable from "../components/reports/DataTable";
import EditRecordModal from "../components/reports/actions/EditRecordModal";
import { mapDataItem, getColorScheme } from "../components/reports/utils.js";

// ✅ Modern scrollbar styles
const scrollbarStyles = (darkMode) => `
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: ${darkMode ? "#0a0a0a" : "#f1f1f1"}; border-radius: 10px; }
  ::-webkit-scrollbar-thumb { background: ${darkMode ? "#404040" : "#c1c1c1"}; border-radius: 10px; transition: background 0.2s ease; }
  ::-webkit-scrollbar-thumb:hover { background: ${darkMode ? "#606060" : "#a0a0a0"}; }
  * { scrollbar-width: thin; scrollbar-color: ${darkMode ? "#404040 #0a0a0a" : "#c1c1c1 #f1f1f1"}; }
`;

/* ================================================================== */
/*  SidebarSection — matches ReportsPage / TaskPage style exactly      */
/* ================================================================== */
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
      {/* Collapsible header card */}
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
            fontSize: "10px",
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
          {/* "All" Option */}
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

          {/* Individual Items */}
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
                <span
                  style={{
                    color: colors.textPrimary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "130px",
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
                    padding: "3px 8px",
                    borderRadius: "5px",
                    fontSize: "11px",
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

/* ================================================================== */
/*  DeckingPage                                                         */
/* ================================================================== */
function DeckingPage({ darkMode }) {
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [uploadReportsData, setUploadReportsData] = useState([]);
  const [statsData, setStatsData] = useState({
    total: 0,
    notDecked: 0,
    decked: 0,
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  const [activeTab, setActiveTab] = useState("all");
  const [subTab, setSubTab] = useState(null);
  const [prescriptionTab, setPrescriptionTab] = useState(null);
  const [appStatusTab, setAppStatusTab] = useState(null);

  const [availableAppTypes, setAvailableAppTypes] = useState([]);
  const [availablePrescriptionTypes, setAvailablePrescriptionTypes] = useState(
    [],
  );
  const [availableAppStatusTypes, setAvailableAppStatusTypes] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [editingRecord, setEditingRecord] = useState(null);

  // ✅ Sidebar state — same as ReportsPage (260px / 52px)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [sortBy, setSortBy] = useState("DB_DATE_EXCEL_UPLOAD");
  const [sortOrder, setSortOrder] = useState("desc");

  const colors = getColorScheme(darkMode);

  // Active filter count for collapsed badge
  const activeFilterCount =
    (subTab !== null ? 1 : 0) +
    (prescriptionTab !== null ? 1 : 0) +
    (appStatusTab !== null ? 1 : 0);

  // Inject scrollbar styles
  useEffect(() => {
    const styleId = "custom-scrollbar-styles";
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    styleElement.textContent = scrollbarStyles(darkMode);
    return () => {
      const element = document.getElementById(styleId);
      if (element) element.remove();
    };
  }, [darkMode]);

  // Get current logged-in user
  useEffect(() => {
    let username = null;
    const userStr =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        username = userObj.username || userObj.email || userObj.first_name;
      } catch (e) {
        username = userStr;
      }
    }
    if (!username) {
      username =
        localStorage.getItem("username") || sessionStorage.getItem("username");
    }
    setCurrentUser(username || "Unknown User");
  }, []);

  // Fetch accurate stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [allData, notDeckedData, deckedData] = await Promise.all([
          getUploadReports({
            page: 1,
            pageSize: 1,
            search: "",
            status: "",
            sortBy: "DB_DATE_EXCEL_UPLOAD",
            sortOrder: "desc",
          }),
          getUploadReports({
            page: 1,
            pageSize: 1,
            search: "",
            status: "not_decked",
            sortBy: "DB_DATE_EXCEL_UPLOAD",
            sortOrder: "desc",
          }),
          getUploadReports({
            page: 1,
            pageSize: 1,
            search: "",
            status: "decked",
            sortBy: "DB_DATE_EXCEL_UPLOAD",
            sortOrder: "desc",
          }),
        ]);
        setStatsData({
          total: allData.total || 0,
          notDecked: notDeckedData.total || 0,
          decked: deckedData.total || 0,
        });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchAppTypes = async () => {
      try {
        let status = null;
        if (activeTab === "not-decked") status = "not_decked";
        else if (activeTab === "decked") status = "decked";
        setAvailableAppTypes(await getAppTypes(status));
      } catch {
        setAvailableAppTypes([]);
      }
    };
    fetchAppTypes();
  }, [activeTab]);

  useEffect(() => {
    const fetchPrescriptionTypes = async () => {
      try {
        let status = null;
        if (activeTab === "not-decked") status = "not_decked";
        else if (activeTab === "decked") status = "decked";
        setAvailablePrescriptionTypes(
          await getPrescriptionTypes(status, subTab),
        );
      } catch {
        setAvailablePrescriptionTypes([]);
      }
    };
    fetchPrescriptionTypes();
  }, [activeTab, subTab]);

  useEffect(() => {
    const fetchAppStatusTypes = async () => {
      try {
        let status = null;
        if (activeTab === "not-decked") status = "not_decked";
        else if (activeTab === "decked") status = "decked";
        setAvailableAppStatusTypes(
          await getAppStatusTypes(status, subTab, prescriptionTab),
        );
      } catch {
        setAvailableAppStatusTypes([]);
      }
    };
    fetchAppStatusTypes();
  }, [activeTab, subTab, prescriptionTab]);

  const getStatusFilter = () => {
    if (activeTab === "not-decked") return "not_decked";
    if (activeTab === "decked") return "decked";
    return "";
  };

  const getExportParams = () => {
    const params = { search: searchTerm, sortBy, sortOrder };
    const statusFilter = getStatusFilter();
    if (statusFilter) params.status = statusFilter;
    if (filters.category) params.category = filters.category;
    if (filters.manufacturer) params.manufacturer = filters.manufacturer;
    if (filters.ltoCompany) params.lto_company = filters.ltoCompany;
    if (filters.brandName) params.brand_name = filters.brandName;
    if (filters.genericName) params.generic_name = filters.genericName;
    if (filters.dtn) params.dtn = parseInt(filters.dtn, 10);
    if (filters.dosageForm) params.dosage_form = filters.dosageForm;
    if (subTab !== null) params.app_type = subTab === "" ? "__EMPTY__" : subTab;
    if (prescriptionTab !== null)
      params.prescription =
        prescriptionTab === "" ? "__EMPTY__" : prescriptionTab;
    if (appStatusTab !== null)
      params.app_status = appStatusTab === "" ? "__EMPTY__" : appStatusTab;
    return params;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = {
          page: currentPage,
          pageSize: rowsPerPage,
          search: searchTerm,
          status: getStatusFilter(),
          sortBy,
          sortOrder,
        };
        if (filters.category) params.category = filters.category;
        if (filters.manufacturer) params.manufacturer = filters.manufacturer;
        if (filters.ltoCompany) params.lto_company = filters.ltoCompany;
        if (filters.brandName) params.brand_name = filters.brandName;
        if (filters.genericName) params.generic_name = filters.genericName;
        if (filters.dtn) params.dtn = parseInt(filters.dtn, 10);
        if (filters.dosageForm) params.dosage_form = filters.dosageForm;
        if (subTab !== null)
          params.app_type = subTab === "" ? "__EMPTY__" : subTab;
        if (prescriptionTab !== null)
          params.prescription =
            prescriptionTab === "" ? "__EMPTY__" : prescriptionTab;
        if (appStatusTab !== null)
          params.app_status = appStatusTab === "" ? "__EMPTY__" : appStatusTab;

        const json = await getUploadReports(params);
        if (!json || !json.data || !Array.isArray(json.data)) {
          setUploadReportsData([]);
          setFilteredData([]);
          setTotalRecords(0);
          setTotalPages(0);
          return;
        }
        const mappedData = json.data.map(mapDataItem);
        setUploadReportsData(mappedData);
        setFilteredData(mappedData);
        setTotalRecords(json.total);
        setTotalPages(json.total_pages);
      } catch (err) {
        console.error("Failed to fetch reports:", err);
        setUploadReportsData([]);
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
    activeTab,
    subTab,
    prescriptionTab,
    appStatusTab,
    filters,
    sortBy,
    sortOrder,
  ]);

  const refreshData = async () => {
    try {
      setLoading(true);
      const [allData, notDeckedData, deckedData] = await Promise.all([
        getUploadReports({
          page: 1,
          pageSize: 1,
          search: "",
          status: "",
          sortBy: "DB_DATE_EXCEL_UPLOAD",
          sortOrder: "desc",
        }),
        getUploadReports({
          page: 1,
          pageSize: 1,
          search: "",
          status: "not_decked",
          sortBy: "DB_DATE_EXCEL_UPLOAD",
          sortOrder: "desc",
        }),
        getUploadReports({
          page: 1,
          pageSize: 1,
          search: "",
          status: "decked",
          sortBy: "DB_DATE_EXCEL_UPLOAD",
          sortOrder: "desc",
        }),
      ]);
      setStatsData({
        total: allData.total || 0,
        notDecked: notDeckedData.total || 0,
        decked: deckedData.total || 0,
      });

      let status = null;
      if (activeTab === "not-decked") status = "not_decked";
      else if (activeTab === "decked") status = "decked";

      const [appTypes, prescriptionTypes, appStatusTypes] = await Promise.all([
        getAppTypes(status),
        getPrescriptionTypes(status, subTab),
        getAppStatusTypes(status, subTab, prescriptionTab),
      ]);
      setAvailableAppTypes(appTypes);
      setAvailablePrescriptionTypes(prescriptionTypes);
      setAvailableAppStatusTypes(appStatusTypes);

      const params = {
        page: currentPage,
        pageSize: rowsPerPage,
        search: searchTerm,
        status: getStatusFilter(),
        category: filters.category || "",
        sortBy,
        sortOrder,
      };
      if (subTab !== null)
        params.app_type = subTab === "" ? "__EMPTY__" : subTab;
      if (prescriptionTab !== null)
        params.prescription =
          prescriptionTab === "" ? "__EMPTY__" : prescriptionTab;
      if (appStatusTab !== null)
        params.app_status = appStatusTab === "" ? "__EMPTY__" : appStatusTab;

      const json = await getUploadReports(params);
      if (json && json.data) {
        const mappedData = json.data.map(mapDataItem);
        setUploadReportsData(mappedData);
        setFilteredData(mappedData);
        setTotalRecords(json.total);
        setTotalPages(json.total_pages);
      }
    } catch (err) {
      console.error("Failed to refresh reports", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      alert("Please upload a valid Excel file (.xlsx or .xls)");
      return;
    }
    let username = currentUser || "system";
    if (username === "system") {
      const proceed = confirm(
        '⚠️ No user detected. Upload will be attributed to "system". Continue?',
      );
      if (!proceed) {
        event.target.value = "";
        return;
      }
    }
    try {
      setUploading(true);
      setUploadProgress(`Uploading as: ${username}...`);
      const result = await uploadExcelFile(file, username);
      setUploadProgress(null);
      setUploading(false);
      const { success, errors, duplicates_skipped, total_processed } =
        result.stats;
      let message = `✅ Upload Complete!\n\n👤 Uploaded by: ${username}\n📊 Processed: ${total_processed} rows\n✓ Inserted: ${success} new records\n`;
      if (duplicates_skipped > 0)
        message += `⊘ Skipped: ${duplicates_skipped} duplicates\n`;
      if (errors > 0) message += `✗ Errors: ${errors} failed\n`;
      alert(message);
      setCurrentPage(1);
      await refreshData();
    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress(null);
      setUploading(false);
      alert(
        `❌ Upload failed: ${error.response?.data?.detail || error.message}`,
      );
    }
    event.target.value = "";
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplate();
    } catch (error) {
      console.error("Download template error:", error);
      alert("Failed to download template");
    }
  };

  const handleSelectAll = () =>
    selectedRows.length === filteredData.length
      ? setSelectedRows([])
      : setSelectedRows(filteredData.map((row) => row.id));
  const handleSelectRow = (id) =>
    selectedRows.includes(id)
      ? setSelectedRows(selectedRows.filter((r) => r !== id))
      : setSelectedRows([...selectedRows, id]);
  const clearSelections = () => setSelectedRows([]);
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setSelectedRows([]);
    }
  };
  const handleRowsPerPageChange = (e) => {
    const n = Math.min(Number(e.target.value), 100);
    setRowsPerPage(n);
    setCurrentPage(1);
    setSelectedRows([]);
  };
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedRows([]);
    setSubTab(null);
    setPrescriptionTab(null);
    setAppStatusTab(null);
  };
  const handleSubTabChange = (value) => {
    setSubTab(value);
    setCurrentPage(1);
    setSelectedRows([]);
    setPrescriptionTab(null);
    setAppStatusTab(null);
  };
  const handlePrescriptionTabChange = (value) => {
    setPrescriptionTab(value);
    setCurrentPage(1);
    setSelectedRows([]);
    setAppStatusTab(null);
  };
  const handleAppStatusTabChange = (value) => {
    setAppStatusTab(value);
    setCurrentPage(1);
    setSelectedRows([]);
  };
  const handleSort = (dbKey, order) => {
    setSortBy(dbKey);
    setSortOrder(order);
    setCurrentPage(1);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportFilteredRecords(getExportParams());
      alert(
        `✅ Export successful!\n\nExported ${totalRecords} filtered records.`,
      );
    } catch (error) {
      console.error("Export error:", error);
      let errorMessage = "Unknown error";
      if (error.response?.data) {
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            try {
              errorMessage = JSON.parse(text).detail || text;
            } catch {
              errorMessage = text;
            }
          } catch {
            errorMessage = "Failed to parse error response";
          }
        } else if (typeof error.response.data === "object") {
          errorMessage =
            error.response.data.detail ||
            error.response.data.message ||
            JSON.stringify(error.response.data);
        } else {
          errorMessage = String(error.response.data);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      alert(`❌ Export failed: ${errorMessage}`);
    } finally {
      setExporting(false);
    }
  };

  const handleEdit = (record) => setEditingRecord(record);
  const handleEditSuccess = async () => {
    await refreshData();
    alert("✅ Record updated successfully!");
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ══════════════════════════════════════
          SIDEBAR — matches ReportsPage style
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
          /* ── EXPANDED ── */
          <>
            {/* Pinned header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 1.25rem 1rem",
                borderBottom: `2px solid ${colors.cardBorder}`,
                flexShrink: 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
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

            {/* Scrollable section list */}
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
            {/* Expand button */}
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

            {/* Active filter count badge */}
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

            {/* Icon indicators with opacity */}
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
                Decking
              </h1>
              <p style={{ color: colors.textTertiary, fontSize: "0.9rem" }}>
                Upload reports and assign evaluators for decking
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
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
                  {exporting ? "Exporting..." : `Export (${totalRecords})`}
                </span>
              </button>
              <UploadButton
                onFileSelect={handleFileSelect}
                onDownloadTemplate={handleDownloadTemplate}
                uploading={uploading}
                colors={colors}
              />
            </div>
          </div>

          <StatsCard stats={statsData} colors={colors} />

          {/* LEVEL 1: Main Tabs */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginTop: "1.5rem",
              borderBottom: `2px solid ${colors.cardBorder}`,
              paddingBottom: "0",
            }}
          >
            {[
              {
                id: "all",
                label: "All Reports",
                icon: "📋",
                count: statsData.total,
              },
              {
                id: "not-decked",
                label: "Not Yet Decked",
                icon: "⏳",
                count: statsData.notDecked,
              },
              {
                id: "decked",
                label: "Decked",
                icon: "✅",
                count: statsData.decked,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.85rem",
                  background: "transparent",
                  border: "none",
                  borderBottom:
                    activeTab === tab.id
                      ? "3px solid #4CAF50"
                      : "3px solid transparent",
                  color:
                    activeTab === tab.id
                      ? colors.textPrimary
                      : colors.textSecondary,
                  fontWeight: activeTab === tab.id ? "600" : "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  position: "relative",
                  top: "2px",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  style={{
                    padding: "0.2rem 0.6rem",
                    background:
                      activeTab === tab.id ? "#4CAF50" : colors.badgeBg,
                    color: activeTab === tab.id ? "#fff" : colors.textTertiary,
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    minWidth: "32px",
                    textAlign: "center",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
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
            activeTab={activeTab}
            subTab={subTab}
            prescriptionTab={prescriptionTab}
            appStatusTab={appStatusTab}
          />
          <UploadProgress message={uploadProgress} colors={colors} />

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
            <DataTable
              data={filteredData}
              selectedRows={selectedRows}
              onSelectRow={handleSelectRow}
              onSelectAll={handleSelectAll}
              onClearSelections={clearSelections}
              currentPage={currentPage}
              rowsPerPage={rowsPerPage}
              totalRecords={totalRecords}
              totalPages={totalPages}
              indexOfFirstRow={(currentPage - 1) * rowsPerPage + 1}
              indexOfLastRow={Math.min(currentPage * rowsPerPage, totalRecords)}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
              colors={colors}
              activeTab={activeTab}
              onRefresh={refreshData}
              onEdit={handleEdit}
              darkMode={darkMode}
              onSort={handleSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingRecord && (
        <EditRecordModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSuccess={handleEditSuccess}
          colors={colors}
          darkMode={darkMode}
          updateUploadReport={updateUploadReport}
        />
      )}
    </div>
  );
}

export default DeckingPage;
