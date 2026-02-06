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
} from "../api/reports";

import StatsCard from "../components/reports/StatsCard";
import FilterBar from "../components/reports/FilterBar";
import UploadButton from "../components/reports/UploadButton";
import UploadProgress from "../components/reports/UploadProgress";
import DataTable from "../components/reports/DataTable";
import { mapDataItem, getColorScheme } from "../components/reports/utils.js";

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

  // ✅ Four levels of tabs
  const [activeTab, setActiveTab] = useState("all"); // Level 1: all / not-decked / decked
  const [subTab, setSubTab] = useState(null); // Level 2: app_type (Initial, Renewal, etc.)
  const [prescriptionTab, setPrescriptionTab] = useState(null); // Level 3: prescription type
  const [appStatusTab, setAppStatusTab] = useState(null); // Level 4: application status

  const [availableAppTypes, setAvailableAppTypes] = useState([]);
  const [availablePrescriptionTypes, setAvailablePrescriptionTypes] = useState(
    [],
  );
  const [availableAppStatusTypes, setAvailableAppStatusTypes] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [exporting, setExporting] = useState(false);

  const colors = getColorScheme(darkMode);

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
        const allData = await getUploadReports({
          page: 1,
          pageSize: 1,
          search: "",
          status: "",
          sortBy: "DB_DATE_EXCEL_UPLOAD",
          sortOrder: "desc",
        });

        const notDeckedData = await getUploadReports({
          page: 1,
          pageSize: 1,
          search: "",
          status: "not_decked",
          sortBy: "DB_DATE_EXCEL_UPLOAD",
          sortOrder: "desc",
        });

        const deckedData = await getUploadReports({
          page: 1,
          pageSize: 1,
          search: "",
          status: "decked",
          sortBy: "DB_DATE_EXCEL_UPLOAD",
          sortOrder: "desc",
        });

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

  // ✅ LEVEL 1 → LEVEL 2: Fetch app types when main tab changes
  useEffect(() => {
    const fetchAppTypes = async () => {
      try {
        let status = null;
        if (activeTab === "not-decked") status = "not_decked";
        else if (activeTab === "decked") status = "decked";

        const appTypes = await getAppTypes(status);
        setAvailableAppTypes(appTypes);
      } catch (err) {
        console.error("Failed to fetch app types:", err);
        setAvailableAppTypes([]);
      }
    };

    fetchAppTypes();
  }, [activeTab]);

  // ✅ LEVEL 2 → LEVEL 3: Fetch prescription types (works even when subTab is null)
  useEffect(() => {
    const fetchPrescriptionTypes = async () => {
      try {
        let status = null;
        if (activeTab === "not-decked") status = "not_decked";
        else if (activeTab === "decked") status = "decked";

        // Fetch prescription types (subTab can be null for "All Application Type")
        const prescriptionTypes = await getPrescriptionTypes(status, subTab);
        setAvailablePrescriptionTypes(prescriptionTypes);
      } catch (err) {
        console.error("Failed to fetch prescription types:", err);
        setAvailablePrescriptionTypes([]);
      }
    };

    fetchPrescriptionTypes();
  }, [activeTab, subTab]);

  // ✅ LEVEL 3 → LEVEL 4: Fetch app status types (works when subTab and prescriptionTab are null)
  useEffect(() => {
    const fetchAppStatusTypes = async () => {
      try {
        let status = null;
        if (activeTab === "not-decked") status = "not_decked";
        else if (activeTab === "decked") status = "decked";

        const appStatusTypes = await getAppStatusTypes(
          status,
          subTab, // Can be null for "All Application Type"
          prescriptionTab, // Can be null for "All Prescriptions"
        );
        setAvailableAppStatusTypes(appStatusTypes);
      } catch (err) {
        console.error("Failed to fetch app status types:", err);
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
    const params = {
      search: searchTerm,
      sortBy: "DB_DATE_EXCEL_UPLOAD",
      sortOrder: "desc",
    };

    const statusFilter = getStatusFilter();
    if (statusFilter) {
      params.status = statusFilter;
    }

    // ✅ Advanced Filters from FilterBar
    if (filters.category) params.category = filters.category;
    if (filters.manufacturer) params.manufacturer = filters.manufacturer;
    if (filters.ltoCompany) params.lto_company = filters.ltoCompany;
    if (filters.brandName) params.brand_name = filters.brandName;
    if (filters.genericName) params.generic_name = filters.genericName;
    if (filters.dtn) params.dtn = parseInt(filters.dtn, 10);

    // Level 2: App Type
    if (subTab !== null) {
      params.app_type = subTab === "" ? "__EMPTY__" : subTab;
    }

    // Level 3: Prescription
    if (prescriptionTab !== null) {
      params.prescription =
        prescriptionTab === "" ? "__EMPTY__" : prescriptionTab;
    }

    // Level 4: App Status
    if (appStatusTab !== null) {
      params.app_status = appStatusTab === "" ? "__EMPTY__" : appStatusTab;
    }

    return params;
  };

  // Fetch data with server-side pagination
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = {
          page: currentPage,
          pageSize: rowsPerPage,
          search: searchTerm,
          status: getStatusFilter(),
          sortBy: "DB_DATE_EXCEL_UPLOAD",
          sortOrder: "desc",
        };

        // ✅ Advanced Filters from FilterBar
        if (filters.category) params.category = filters.category;
        if (filters.manufacturer) params.manufacturer = filters.manufacturer;
        if (filters.ltoCompany) params.lto_company = filters.ltoCompany;
        if (filters.brandName) params.brand_name = filters.brandName;
        if (filters.genericName) params.generic_name = filters.genericName;
        if (filters.dtn) params.dtn = parseInt(filters.dtn, 10);

        // Level 2: App Type
        if (subTab !== null) {
          params.app_type = subTab === "" ? "__EMPTY__" : subTab;
        }

        // Level 3: Prescription
        if (prescriptionTab !== null) {
          params.prescription =
            prescriptionTab === "" ? "__EMPTY__" : prescriptionTab;
        }

        // Level 4: App Status
        if (appStatusTab !== null) {
          params.app_status = appStatusTab === "" ? "__EMPTY__" : appStatusTab;
        }

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
  ]);

  const refreshData = async () => {
    try {
      setLoading(true);

      // Refresh all stats
      const allData = await getUploadReports({
        page: 1,
        pageSize: 1,
        search: "",
        status: "",
        sortBy: "DB_DATE_EXCEL_UPLOAD",
        sortOrder: "desc",
      });
      const notDeckedData = await getUploadReports({
        page: 1,
        pageSize: 1,
        search: "",
        status: "not_decked",
        sortBy: "DB_DATE_EXCEL_UPLOAD",
        sortOrder: "desc",
      });
      const deckedData = await getUploadReports({
        page: 1,
        pageSize: 1,
        search: "",
        status: "decked",
        sortBy: "DB_DATE_EXCEL_UPLOAD",
        sortOrder: "desc",
      });

      setStatsData({
        total: allData.total || 0,
        notDecked: notDeckedData.total || 0,
        decked: deckedData.total || 0,
      });

      // Refresh available tabs for current levels
      let status = null;
      if (activeTab === "not-decked") status = "not_decked";
      else if (activeTab === "decked") status = "decked";

      const appTypes = await getAppTypes(status);
      setAvailableAppTypes(appTypes);

      const prescriptionTypes = await getPrescriptionTypes(status, subTab);
      setAvailablePrescriptionTypes(prescriptionTypes);

      const appStatusTypes = await getAppStatusTypes(
        status,
        subTab,
        prescriptionTab,
      );
      setAvailableAppStatusTypes(appStatusTypes);

      // Refresh current view data
      const params = {
        page: currentPage,
        pageSize: rowsPerPage,
        search: searchTerm,
        status: getStatusFilter(),
        category: filters.category || "",
        sortBy: "DB_DATE_EXCEL_UPLOAD",
        sortOrder: "desc",
      };

      if (subTab !== null) {
        params.app_type = subTab === "" ? "__EMPTY__" : subTab;
      }

      if (prescriptionTab !== null) {
        params.prescription =
          prescriptionTab === "" ? "__EMPTY__" : prescriptionTab;
      }

      if (appStatusTab !== null) {
        params.app_status = appStatusTab === "" ? "__EMPTY__" : appStatusTab;
      }

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
  };

  const handleSubTabChange = (subTabValue) => {
    setSubTab(subTabValue);
    setCurrentPage(1);
    setSelectedRows([]);
    // Reset lower level tabs when changing app type
    setPrescriptionTab(null);
    setAppStatusTab(null);
  };

  const handlePrescriptionTabChange = (prescriptionValue) => {
    setPrescriptionTab(prescriptionValue);
    setCurrentPage(1);
    setSelectedRows([]);
    // Reset app status tab when changing prescription
    setAppStatusTab(null);
  };

  const handleAppStatusTabChange = (appStatusValue) => {
    setAppStatusTab(appStatusValue);
    setCurrentPage(1);
    setSelectedRows([]);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const exportParams = getExportParams();
      console.log("📥 Exporting with params:", exportParams);
      await exportFilteredRecords(exportParams);
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
              const errorData = JSON.parse(text);
              errorMessage = errorData.detail || errorData.message || text;
            } catch {
              errorMessage = text;
            }
          } catch (e) {
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

  return (
    <div
      style={{
        flex: 1,
        padding: "2rem",
        overflowY: "auto",
        background: colors.pageBg,
        transition: "all 0.3s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: "600",
              marginBottom: "0.5rem",
              color: colors.textPrimary,
              transition: "color 0.3s ease",
            }}
          >
            For Decking
          </h1>
          <p
            style={{
              color: colors.textTertiary,
              fontSize: "0.9rem",
              transition: "color 0.3s ease",
            }}
          >
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
              if (!exporting && totalRecords > 0) {
                e.currentTarget.style.background = "#059669";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!exporting && totalRecords > 0) {
                e.currentTarget.style.background = "#10B981";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>
              {exporting ? "⏳" : "📥"}
            </span>
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

      {/* ========== LEVEL 1: Main Tabs ========== */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: availableAppTypes.length > 0 ? "1rem" : "1.5rem",
          borderBottom: `2px solid ${colors.cardBorder}`,
          paddingBottom: "0",
          transition: "border-color 0.3s ease",
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
                  ? `3px solid #4CAF50`
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
                background: activeTab === tab.id ? "#4CAF50" : colors.badgeBg,
                color: activeTab === tab.id ? "#fff" : colors.textTertiary,
                borderRadius: "12px",
                fontSize: "0.75rem",
                fontWeight: "600",
                minWidth: "32px",
                textAlign: "center",
                transition: "all 0.2s ease",
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ========== LEVEL 2: Application Type Tabs ========== */}
      {availableAppTypes.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom:
              availablePrescriptionTypes.length > 0 ? "1rem" : "1.5rem",
            paddingLeft: "1rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            paddingBottom: "0",
            flexWrap: "wrap",
          }}
        >
          {/* ✅ "All Application Type" Tab */}
          <button
            onClick={() => handleSubTabChange(null)}
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.8rem",
              background: "transparent",
              border: "none",
              borderBottom:
                subTab === null ? `2px solid #2196F3` : "2px solid transparent",
              color:
                subTab === null ? colors.textPrimary : colors.textSecondary,
              fontWeight: subTab === null ? "600" : "500",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              position: "relative",
              top: "1px",
            }}
          >
            <span style={{ fontSize: "1rem" }}>📑</span>
            <span>All Application Type</span>
            <span
              style={{
                padding: "0.15rem 0.5rem",
                background: subTab === null ? "#2196F3" : colors.badgeBg,
                color: subTab === null ? "#fff" : colors.textTertiary,
                borderRadius: "10px",
                fontSize: "0.7rem",
                fontWeight: "600",
                minWidth: "28px",
                textAlign: "center",
                transition: "all 0.2s ease",
              }}
            >
              {availableAppTypes.reduce((sum, a) => sum + a.count, 0)}
            </span>
          </button>

          {/* ✅ Individual App Type Tabs */}
          {availableAppTypes.map((appType) => {
            const displayValue = appType.value || "No Application Type";
            const filterValue = appType.value === null ? "" : appType.value;

            return (
              <button
                key={filterValue || "no-app-type"}
                onClick={() => handleSubTabChange(filterValue)}
                style={{
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.8rem",
                  background: "transparent",
                  border: "none",
                  borderBottom:
                    subTab === filterValue
                      ? `2px solid #2196F3`
                      : "2px solid transparent",
                  color:
                    subTab === filterValue
                      ? colors.textPrimary
                      : colors.textSecondary,
                  fontWeight: subTab === filterValue ? "600" : "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  position: "relative",
                  top: "1px",
                }}
              >
                {!appType.value && <span style={{ fontSize: "1rem" }}>❓</span>}
                <span>{displayValue}</span>
                <span
                  style={{
                    padding: "0.15rem 0.5rem",
                    background:
                      subTab === filterValue ? "#2196F3" : colors.badgeBg,
                    color:
                      subTab === filterValue ? "#fff" : colors.textTertiary,
                    borderRadius: "10px",
                    fontSize: "0.7rem",
                    fontWeight: "600",
                    minWidth: "28px",
                    textAlign: "center",
                    transition: "all 0.2s ease",
                  }}
                >
                  {appType.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ========== LEVEL 3: Prescription Type Tabs ========== */}
      {/* ✅ FIXED: Show when prescription types are available (regardless of subTab) */}
      {availablePrescriptionTypes.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom:
              availableAppStatusTypes.length > 0 ? "1rem" : "1.5rem",
            paddingLeft: "2rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            paddingBottom: "0",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => handlePrescriptionTabChange(null)}
            style={{
              padding: "0.35rem 0.7rem",
              fontSize: "0.75rem",
              background: "transparent",
              border: "none",
              borderBottom:
                prescriptionTab === null
                  ? `2px solid #9C27B0`
                  : "2px solid transparent",
              color:
                prescriptionTab === null
                  ? colors.textPrimary
                  : colors.textSecondary,
              fontWeight: prescriptionTab === null ? "600" : "500",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              position: "relative",
              top: "1px",
            }}
          >
            <span style={{ fontSize: "0.9rem" }}>📋</span>
            <span>All Prescriptions</span>
            <span
              style={{
                padding: "0.15rem 0.4rem",
                background:
                  prescriptionTab === null ? "#9C27B0" : colors.badgeBg,
                color: prescriptionTab === null ? "#fff" : colors.textTertiary,
                borderRadius: "8px",
                fontSize: "0.65rem",
                fontWeight: "600",
                minWidth: "24px",
                textAlign: "center",
                transition: "all 0.2s ease",
              }}
            >
              {availablePrescriptionTypes.reduce((sum, p) => sum + p.count, 0)}
            </span>
          </button>

          {availablePrescriptionTypes.map((presType) => {
            const displayValue = presType.value || "No Prescription Type";
            const filterValue = presType.value === null ? "" : presType.value;

            return (
              <button
                key={filterValue || "no-pres-type"}
                onClick={() => handlePrescriptionTabChange(filterValue)}
                style={{
                  padding: "0.35rem 0.7rem",
                  fontSize: "0.75rem",
                  background: "transparent",
                  border: "none",
                  borderBottom:
                    prescriptionTab === filterValue
                      ? `2px solid #9C27B0`
                      : "2px solid transparent",
                  color:
                    prescriptionTab === filterValue
                      ? colors.textPrimary
                      : colors.textSecondary,
                  fontWeight: prescriptionTab === filterValue ? "600" : "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  position: "relative",
                  top: "1px",
                }}
              >
                {!presType.value && (
                  <span style={{ fontSize: "0.9rem" }}>❓</span>
                )}
                {presType.value === "Over-the-Counter (OTC) Drug" && (
                  <span style={{ fontSize: "0.9rem" }}>💊</span>
                )}
                {presType.value === "Prescription Drug (Rx)" && (
                  <span style={{ fontSize: "0.9rem" }}>📝</span>
                )}
                <span>{displayValue}</span>
                <span
                  style={{
                    padding: "0.15rem 0.4rem",
                    background:
                      prescriptionTab === filterValue
                        ? "#9C27B0"
                        : colors.badgeBg,
                    color:
                      prescriptionTab === filterValue
                        ? "#fff"
                        : colors.textTertiary,
                    borderRadius: "8px",
                    fontSize: "0.65rem",
                    fontWeight: "600",
                    minWidth: "24px",
                    textAlign: "center",
                    transition: "all 0.2s ease",
                  }}
                >
                  {presType.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ========== LEVEL 4: Application Status Tabs ========== */}
      {/* ✅ FIXED: Show when app status types are available (regardless of subTab/prescriptionTab) */}
      {availableAppStatusTypes.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1.5rem",
            paddingLeft: "3rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            paddingBottom: "0",
            flexWrap: "wrap",
          }}
        >
          {/* ✅ "All" Tab for App Status */}
          <button
            onClick={() => handleAppStatusTabChange(null)}
            style={{
              padding: "0.3rem 0.6rem",
              fontSize: "0.7rem",
              background: "transparent",
              border: "none",
              borderBottom:
                appStatusTab === null
                  ? `2px solid #FF9800`
                  : "2px solid transparent",
              color:
                appStatusTab === null
                  ? colors.textPrimary
                  : colors.textSecondary,
              fontWeight: appStatusTab === null ? "600" : "500",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              position: "relative",
              top: "1px",
            }}
          >
            <span style={{ fontSize: "0.85rem" }}>📊</span>
            <span>All Status</span>
            <span
              style={{
                padding: "0.1rem 0.35rem",
                background: appStatusTab === null ? "#FF9800" : colors.badgeBg,
                color: appStatusTab === null ? "#fff" : colors.textTertiary,
                borderRadius: "6px",
                fontSize: "0.6rem",
                fontWeight: "600",
                minWidth: "20px",
                textAlign: "center",
                transition: "all 0.2s ease",
              }}
            >
              {availableAppStatusTypes.reduce((sum, s) => sum + s.count, 0)}
            </span>
          </button>

          {/* ✅ Individual App Status Tabs */}
          {availableAppStatusTypes.map((statusType) => {
            const displayValue = statusType.value || "No Application Status";
            const filterValue =
              statusType.value === null ? "" : statusType.value;

            return (
              <button
                key={filterValue || "no-status-type"}
                onClick={() => handleAppStatusTabChange(filterValue)}
                style={{
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.7rem",
                  background: "transparent",
                  border: "none",
                  borderBottom:
                    appStatusTab === filterValue
                      ? `2px solid #FF9800`
                      : "2px solid transparent",
                  color:
                    appStatusTab === filterValue
                      ? colors.textPrimary
                      : colors.textSecondary,
                  fontWeight: appStatusTab === filterValue ? "600" : "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  position: "relative",
                  top: "1px",
                }}
              >
                {!statusType.value && (
                  <span style={{ fontSize: "0.85rem" }}>❓</span>
                )}
                {statusType.value?.toLowerCase().includes("approved") && (
                  <span style={{ fontSize: "0.85rem" }}>✅</span>
                )}
                {statusType.value?.toLowerCase().includes("pending") && (
                  <span style={{ fontSize: "0.85rem" }}>⏳</span>
                )}
                {statusType.value?.toLowerCase().includes("denied") && (
                  <span style={{ fontSize: "0.85rem" }}>❌</span>
                )}
                {statusType.value?.toLowerCase().includes("complete") && (
                  <span style={{ fontSize: "0.85rem" }}>✔️</span>
                )}
                <span>{displayValue}</span>
                <span
                  style={{
                    padding: "0.1rem 0.35rem",
                    background:
                      appStatusTab === filterValue ? "#FF9800" : colors.badgeBg,
                    color:
                      appStatusTab === filterValue
                        ? "#fff"
                        : colors.textTertiary,
                    borderRadius: "6px",
                    fontSize: "0.6rem",
                    fontWeight: "600",
                    minWidth: "20px",
                    textAlign: "center",
                    transition: "all 0.2s ease",
                  }}
                >
                  {statusType.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFilterChange={setFilters}
        colors={colors}
        activeTab={activeTab} // ✅ NEW
        subTab={subTab} // ✅ NEW
        prescriptionTab={prescriptionTab} // ✅ NEW
        appStatusTab={appStatusTab} // ✅ NEW
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
        />
      )}
    </div>
  );
}

export default DeckingPage;
