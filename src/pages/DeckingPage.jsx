// FILE: src/pages/DeckingPage.jsx
import { useState, useEffect } from "react";
import {
  getUploadReports,
  uploadExcelFile,
  downloadTemplate,
  getAppTypes,
  getPrescriptionTypes,
  getAppStatusTypes,
  getProcessingTypes,
  exportFilteredRecords,
  updateUploadReport,
} from "../api/reports";

import FilterBar from "../components/reports/FilterBar";
import UploadButton from "../components/reports/UploadButton";
import UploadProgress from "../components/reports/UploadProgress";
import DataTable from "../components/reports/DataTable";
import EditRecordModal from "../components/reports/actions/EditRecordModal";
import { mapDataItem, getColorScheme } from "../components/reports/utils.js";

// ─── helper: build API params from filters state ──────────────────────────────
function buildFilterParams(filters) {
  const p = {};
  if (filters.category) p.category = filters.category;
  if (filters.dosageForm) p.dosage_form = filters.dosageForm;
  if (filters.manufacturer) p.manufacturer = filters.manufacturer;
  if (filters.ltoCompany) p.lto_company = filters.ltoCompany;
  if (filters.brandName) p.brand_name = filters.brandName;
  if (filters.genericName) p.generic_name = filters.genericName;
  if (filters.dtn) p.dtn = parseInt(filters.dtn, 10);
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

/* ================================================================== */
/*  SidebarSection                                                      */
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
          {/* "All" Option */}
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

/* ================================================================== */
/*  ActiveFiltersBar                                                    */
/* ================================================================== */
function ActiveFiltersBar({
  subTab,
  prescriptionTab,
  appStatusTab,
  processingTypeTab,
  onRemove,
  onClearAll,
  colors,
}) {
  const chips = [];
  if (subTab !== null)
    chips.push({
      key: "subTab",
      label: `App Type: ${subTab === "" ? "None" : subTab}`,
    });
  if (prescriptionTab !== null)
    chips.push({
      key: "prescriptionTab",
      label: `Classification: ${prescriptionTab === "" ? "None" : prescriptionTab}`,
    });
  if (appStatusTab !== null)
    chips.push({
      key: "appStatusTab",
      label: `Status: ${appStatusTab === "" ? "None" : appStatusTab}`,
    });
  if (processingTypeTab !== null)
    chips.push({
      key: "processingTypeTab",
      label: `Processing Type: ${processingTypeTab === "" ? "None" : processingTypeTab}`,
    });
  if (chips.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        flexWrap: "wrap",
        marginBottom: "0.75rem",
      }}
    >
      <span
        style={{
          fontSize: "0.72rem",
          color: colors.textTertiary,
          fontWeight: "500",
          whiteSpace: "nowrap",
        }}
      >
        Active filters:
      </span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.2rem 0.65rem",
            background: "rgba(33,150,243,0.12)",
            border: "1px solid rgba(33,150,243,0.35)",
            borderRadius: "20px",
            fontSize: "0.72rem",
            color: "#2196F3",
            fontWeight: "500",
            whiteSpace: "nowrap",
          }}
        >
          {chip.label}
          <button
            onClick={() => onRemove(chip.key)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#2196F3",
              fontSize: "0.68rem",
              padding: "0",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              opacity: 0.7,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.7)}
          >
            ✕
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#ef4444",
          fontSize: "0.72rem",
          fontWeight: "600",
          padding: "0 0.25rem",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.7)}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = 1)}
      >
        Clear all
      </button>
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
  const [processingTypeTab, setProcessingTypeTab] = useState(null);
  const [availableAppTypes, setAvailableAppTypes] = useState([]);
  const [availablePrescriptionTypes, setAvailablePrescriptionTypes] = useState(
    [],
  );
  const [availableAppStatusTypes, setAvailableAppStatusTypes] = useState([]);
  const [availableProcessingTypes, setAvailableProcessingTypes] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sortBy, setSortBy] = useState("DB_DATE_EXCEL_UPLOAD");
  const [sortOrder, setSortOrder] = useState("desc");

  const colors = getColorScheme(darkMode);

  const activeFilterCount =
    (subTab !== null ? 1 : 0) +
    (prescriptionTab !== null ? 1 : 0) +
    (appStatusTab !== null ? 1 : 0) +
    (processingTypeTab !== null ? 1 : 0);

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
    if (!username)
      username =
        localStorage.getItem("username") || sessionStorage.getItem("username");
    setCurrentUser(username || "Unknown User");
  }, []);

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
    const fetch = async () => {
      try {
        let status = null;
        if (activeTab === "not-decked") status = "not_decked";
        else if (activeTab === "decked") status = "decked";
        setAvailableProcessingTypes(
          await getProcessingTypes(
            status,
            subTab,
            prescriptionTab,
            appStatusTab,
          ),
        );
      } catch {
        setAvailableProcessingTypes([]);
      }
    };
    fetch();
  }, [activeTab, subTab, prescriptionTab, appStatusTab]);

  useEffect(() => {
    const fetch = async () => {
      try {
        let status = null;
        if (activeTab === "not-decked") status = "not_decked";
        else if (activeTab === "decked") status = "decked";
        setAvailableAppTypes(await getAppTypes(status, processingTypeTab));
      } catch {
        setAvailableAppTypes([]);
      }
    };
    fetch();
  }, [activeTab, processingTypeTab]);

  useEffect(() => {
    const fetch = async () => {
      try {
        let status = null;
        if (activeTab === "not-decked") status = "not_decked";
        else if (activeTab === "decked") status = "decked";
        setAvailablePrescriptionTypes(
          await getPrescriptionTypes(status, subTab, processingTypeTab),
        );
      } catch {
        setAvailablePrescriptionTypes([]);
      }
    };
    fetch();
  }, [activeTab, subTab, processingTypeTab]);

  useEffect(() => {
    const fetch = async () => {
      try {
        let status = null;
        if (activeTab === "not-decked") status = "not_decked";
        else if (activeTab === "decked") status = "decked";
        setAvailableAppStatusTypes(
          await getAppStatusTypes(
            status,
            subTab,
            prescriptionTab,
            processingTypeTab,
          ),
        );
      } catch {
        setAvailableAppStatusTypes([]);
      }
    };
    fetch();
  }, [activeTab, subTab, prescriptionTab, processingTypeTab]);

  const getStatusFilter = () => {
    if (activeTab === "not-decked") return "not_decked";
    if (activeTab === "decked") return "decked";
    return "";
  };

  const getExportParams = () => {
    const params = {
      search: searchTerm,
      sortBy,
      sortOrder,
      // ✅ spread all filter params (general + supply chain)
      ...buildFilterParams(filters),
    };
    const statusFilter = getStatusFilter();
    if (statusFilter) params.status = statusFilter;
    if (subTab !== null) params.app_type = subTab === "" ? "__EMPTY__" : subTab;
    if (prescriptionTab !== null)
      params.prescription =
        prescriptionTab === "" ? "__EMPTY__" : prescriptionTab;
    if (appStatusTab !== null)
      params.app_status = appStatusTab === "" ? "__EMPTY__" : appStatusTab;
    if (processingTypeTab !== null)
      params.processing_type =
        processingTypeTab === "" ? "__EMPTY__" : processingTypeTab;
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
          // ✅ spread all filter params (general + supply chain)
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
          params.processing_type =
            processingTypeTab === "" ? "__EMPTY__" : processingTypeTab;
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
    processingTypeTab,
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
      const [processingTypes, appTypes, prescriptionTypes, appStatusTypes] =
        await Promise.all([
          getProcessingTypes(status, subTab, prescriptionTab, appStatusTab),
          getAppTypes(status, processingTypeTab),
          getPrescriptionTypes(status, subTab, processingTypeTab),
          getAppStatusTypes(status, subTab, prescriptionTab, processingTypeTab),
        ]);
      setAvailableProcessingTypes(processingTypes);
      setAvailableAppTypes(appTypes);
      setAvailablePrescriptionTypes(prescriptionTypes);
      setAvailableAppStatusTypes(appStatusTypes);
      const params = {
        page: currentPage,
        pageSize: rowsPerPage,
        search: searchTerm,
        status: getStatusFilter(),
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
        params.processing_type =
          processingTypeTab === "" ? "__EMPTY__" : processingTypeTab;
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

      setUploadProgress({
        message: `Uploading as: ${username}...`,
        percent: 0,
      });

      // Phase 1: actual file transfer (0 → 90%)
      let currentPercent = 0;
      const result = await uploadExcelFile(file, username, (percent) => {
        // Cap sa 90% lang — tapos server processing pa
        currentPercent = Math.min(Math.round(percent * 0.9), 90);
        setUploadProgress({
          message: `Uploading as: ${username}...`,
          percent: currentPercent,
        });
      });

      // Phase 2: server is processing — slow increment 90% → 99%
      const processingInterval = setInterval(() => {
        currentPercent = currentPercent < 99 ? currentPercent + 1 : 99;
        setUploadProgress({
          message: `Processing rows, please wait...`,
          percent: currentPercent,
        });
      }, 300); // bawat 300ms, +1%

      // Wait for server response (result is already resolved above)
      clearInterval(processingInterval);
      setUploadProgress({ message: `Finalizing...`, percent: 100 });

      // Short pause para makita ng user na 100% bago mag-disappear
      await new Promise((resolve) => setTimeout(resolve, 500));
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
    setProcessingTypeTab(null);
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
  const handleProcessingTypeTabChange = (value) => {
    setProcessingTypeTab(value);
    setCurrentPage(1);
    setSelectedRows([]);
  };
  const handleSort = (dbKey, order) => {
    setSortBy(dbKey);
    setSortOrder(order);
    setCurrentPage(1);
  };
  const handleClearFilters = () => {
    setSubTab(null);
    setPrescriptionTab(null);
    setAppStatusTab(null);
    setProcessingTypeTab(null);
    setCurrentPage(1);
    setSelectedRows([]);
  };
  const handleRemoveFilter = (key) => {
    if (key === "subTab") {
      setSubTab(null);
      setPrescriptionTab(null);
      setAppStatusTab(null);
    }
    if (key === "prescriptionTab") {
      setPrescriptionTab(null);
      setAppStatusTab(null);
    }
    if (key === "appStatusTab") setAppStatusTab(null);
    if (key === "processingTypeTab") setProcessingTypeTab(null);
    setCurrentPage(1);
    setSelectedRows([]);
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
            {/* Pinned header */}
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

            {/* Scrollable section list */}
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
              {availableProcessingTypes.length > 0 && (
                <SidebarSection
                  title="Processing Type"
                  icon="⚙️"
                  items={availableProcessingTypes}
                  activeItem={processingTypeTab}
                  onItemClick={handleProcessingTypeTabChange}
                  colors={colors}
                  darkMode={darkMode}
                  totalCount={availableProcessingTypes.reduce(
                    (s, x) => s + x.count,
                    0,
                  )}
                />
              )}
            </div>
          </>
        ) : (
          /* COLLAPSED icon strip */
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
                title: "All Status",
                active: appStatusTab !== null,
              },
              {
                icon: "⚙️",
                title: "Processing Type",
                active: processingTypeTab !== null,
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
        <div
          style={{
            padding: "0.85rem 1.5rem 0",
            background: colors.pageBg,
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "0.6rem",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "600",
                  marginBottom: "0.2rem",
                  color: colors.textPrimary,
                  margin: 0,
                }}
              >
                Decking
              </h1>
              <p
                style={{
                  color: colors.textTertiary,
                  fontSize: "0.75rem",
                  margin: "0.2rem 0 0",
                }}
              >
                Upload reports and assign evaluators for decking
              </p>
            </div>
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >
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

          {/* Main Tabs */}
          <div
            style={{
              display: "flex",
              gap: "0.25rem",
              marginTop: "0.5rem",
              borderBottom: `2px solid ${colors.cardBorder}`,
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
                  padding: "0.35rem 0.85rem",
                  fontSize: "0.78rem",
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
                  gap: "0.4rem",
                  position: "relative",
                  top: "2px",
                }}
              >
                <span style={{ fontSize: "0.82rem" }}>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  style={{
                    padding: "0.1rem 0.45rem",
                    background:
                      activeTab === tab.id ? "#4CAF50" : colors.badgeBg,
                    color: activeTab === tab.id ? "#fff" : colors.textTertiary,
                    borderRadius: "12px",
                    fontSize: "0.68rem",
                    fontWeight: "600",
                    minWidth: "28px",
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
            padding: "0.85rem 1.5rem",
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
          <ActiveFiltersBar
            subTab={subTab}
            prescriptionTab={prescriptionTab}
            appStatusTab={appStatusTab}
            processingTypeTab={processingTypeTab}
            onRemove={handleRemoveFilter}
            onClearAll={handleClearFilters}
            colors={colors}
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
