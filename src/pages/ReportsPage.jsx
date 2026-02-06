// FILE: src/pages/ReportsPage.jsx
import { useState, useEffect } from "react";
import {
  getUploadReports,
  getAppTypes,
  getPrescriptionTypes,
  getAppStatusTypes,
  exportFilteredRecords,
} from "../api/reports";

import FilterBar from "../components/reports/FilterBar";
import ReportsDataTable from "../components/reports/ReportsDataTable";
import { mapDataItem, getColorScheme } from "../components/reports/utils.js";

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

  // Tabs
  const [subTab, setSubTab] = useState(null);
  const [prescriptionTab, setPrescriptionTab] = useState(null);
  const [appStatusTab, setAppStatusTab] = useState(null);

  const [availableAppTypes, setAvailableAppTypes] = useState([]);
  const [availablePrescriptionTypes, setAvailablePrescriptionTypes] = useState(
    [],
  );
  const [availableAppStatusTypes, setAvailableAppStatusTypes] = useState([]);

  const colors = getColorScheme(darkMode);

  // ===============================
  // CURRENT USER
  // ===============================
  useEffect(() => {
    let username = null;
    const userStr =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        username = userObj.username || userObj.email || userObj.first_name;
      } catch {
        username = userStr;
      }
    }
    if (!username) {
      username =
        localStorage.getItem("username") || sessionStorage.getItem("username");
    }
    setCurrentUser(username || "Unknown User");
  }, []);

  // ===============================
  // ✅ STATS - USE APP STATUS TYPES ENDPOINT
  // ===============================
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);

        // Get total count
        const totalResponse = await getUploadReports({
          page: 1,
          pageSize: 1,
          search: "",
          sortBy: "DB_DATE_EXCEL_UPLOAD",
          sortOrder: "desc",
        });

        const total = totalResponse.total || 0;

        // Get status breakdown from app-status-types endpoint
        const statusTypes = await getAppStatusTypes(null, null, null);

        // Find "Completed" and "Pending" counts
        const completedObj = statusTypes.find((s) => s.value === "Completed");
        const pendingObj = statusTypes.find((s) => s.value === "Pending");

        const completed = completedObj ? completedObj.count : 0;
        const pending = pendingObj ? pendingObj.count : 0;

        // In Progress = all statuses except Completed
        const inProgress = total - completed;

        setStatsData({
          total,
          completed,
          inProgress,
        });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
        setStatsData({
          total: 0,
          completed: 0,
          inProgress: 0,
        });
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // ===============================
  // LEVEL 2–4 TAB DATA
  // ===============================
  useEffect(() => {
    getAppTypes(null)
      .then(setAvailableAppTypes)
      .catch(() => setAvailableAppTypes([]));
  }, []);

  useEffect(() => {
    getPrescriptionTypes(null, subTab)
      .then(setAvailablePrescriptionTypes)
      .catch(() => setAvailablePrescriptionTypes([]));
  }, [subTab]);

  useEffect(() => {
    getAppStatusTypes(null, subTab, prescriptionTab)
      .then(setAvailableAppStatusTypes)
      .catch(() => setAvailableAppStatusTypes([]));
  }, [subTab, prescriptionTab]);

  // ===============================
  // TABLE DATA (PAGINATED)
  // ===============================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const params = {
          page: currentPage,
          pageSize: rowsPerPage,
          search: searchTerm,
          sortBy: "DB_DATE_EXCEL_UPLOAD",
          sortOrder: "desc",
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

        const json = await getUploadReports(params);

        const mapped = json?.data ? json.data.map(mapDataItem) : [];

        setFilteredData(mapped);
        setTotalRecords(json?.total || 0);
        setTotalPages(json?.total_pages || 0);
      } catch (err) {
        console.error("Failed to fetch reports:", err);
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
    filters,
  ]);

  // ===============================
  // EXPORT
  // ===============================
  const getExportParams = () => {
    const params = {
      search: searchTerm,
      // ✅ REMOVED sortBy and sortOrder - backend handles this
    };

    if (filters.category) params.category = filters.category;
    if (filters.manufacturer) params.manufacturer = filters.manufacturer;
    if (filters.ltoCompany) params.lto_company = filters.ltoCompany;
    if (filters.brandName) params.brand_name = filters.brandName;
    if (filters.genericName) params.generic_name = filters.genericName;
    if (filters.dtn) params.dtn = parseInt(filters.dtn, 10);

    if (subTab !== null) params.app_type = subTab === "" ? "__EMPTY__" : subTab;
    if (prescriptionTab !== null)
      params.prescription =
        prescriptionTab === "" ? "__EMPTY__" : prescriptionTab;
    if (appStatusTab !== null)
      params.app_status = appStatusTab === "" ? "__EMPTY__" : appStatusTab;

    return params;
  };

  const handleExport = async () => {
    if (totalRecords === 0) {
      alert("❌ No records to export");
      return;
    }

    try {
      setExporting(true);
      await exportFilteredRecords(getExportParams());
      alert(
        `✅ Export successful!\n\nExported ${totalRecords.toLocaleString()} records.`,
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

  // ===============================
  // TAB HANDLERS
  // ===============================
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

  // ===============================
  // TABLE SELECTION
  // ===============================
  const handleSelectRow = (rowId) => {
    setSelectedRows((prev) =>
      prev.includes(rowId)
        ? prev.filter((id) => id !== rowId)
        : [...prev, rowId],
    );
  };

  const handleSelectAll = (checked, rows) => {
    if (checked) {
      setSelectedRows(rows.map((r) => r.id));
    } else {
      setSelectedRows([]);
    }
  };

  // ===============================
  // PAGINATION
  // ===============================
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
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
      {/* Header with Export Button */}
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
            Reports
          </h1>
          <p
            style={{
              color: colors.textTertiary,
              fontSize: "0.9rem",
              transition: "color 0.3s ease",
            }}
          >
            View and manage all CDRR reports
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || totalRecords === 0}
          style={{
            padding: "0.625rem 1.25rem",
            background: exporting
              ? colors.cardBorder
              : totalRecords === 0
                ? "#999"
                : "#10B981",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: "500",
            cursor: exporting || totalRecords === 0 ? "not-allowed" : "pointer",
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
          <span style={{ fontSize: "1.1rem" }}>{exporting ? "⏳" : "📥"}</span>
          <span>
            {exporting
              ? "Exporting..."
              : `Export (${totalRecords.toLocaleString()})`}
          </span>
        </button>
      </div>

      {/* Stats Card */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
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
            label: "In Progress",
            value: statsLoading ? "..." : statsData.inProgress.toLocaleString(),
            color: "#FF9800",
          },
          {
            icon: "✅",
            label: "Completed",
            value: statsLoading ? "..." : statsData.completed.toLocaleString(),
            color: "#4CAF50",
          },
        ].map((stat, index) => (
          <div
            key={index}
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "12px",
              padding: "1.5rem",
              transition: "all 0.3s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "2rem" }}>{stat.icon}</span>
              <div>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: colors.textTertiary,
                    marginBottom: "0.25rem",
                    transition: "color 0.3s ease",
                  }}
                >
                  {stat.label}
                </p>
                <p
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: "700",
                    color: stat.color,
                    transition: "color 0.3s ease",
                  }}
                >
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ========== LEVEL 1: Single "All Reports" Tab ========== */}
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
        <button
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.85rem",
            background: "transparent",
            border: "none",
            borderBottom: `3px solid #4CAF50`,
            color: colors.textPrimary,
            fontWeight: "600",
            cursor: "default",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            position: "relative",
            top: "2px",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>📋</span>
          <span>All Reports</span>
          <span
            style={{
              padding: "0.2rem 0.6rem",
              background: "#4CAF50",
              color: "#fff",
              borderRadius: "12px",
              fontSize: "0.75rem",
              fontWeight: "600",
              minWidth: "32px",
              textAlign: "center",
              transition: "all 0.2s ease",
            }}
          >
            {statsLoading ? "..." : statsData.total.toLocaleString()}
          </span>
        </button>
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
              {availableAppTypes
                .reduce((sum, a) => sum + a.count, 0)
                .toLocaleString()}
            </span>
          </button>

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
                  {appType.count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ========== LEVEL 3: Prescription Type Tabs ========== */}
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
              {availablePrescriptionTypes
                .reduce((sum, p) => sum + p.count, 0)
                .toLocaleString()}
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
                  {presType.count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ========== LEVEL 4: Application Status Tabs ========== */}
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
              {availableAppStatusTypes
                .reduce((sum, s) => sum + s.count, 0)
                .toLocaleString()}
            </span>
          </button>

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
                  {statusType.count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filter Bar */}
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

      {/* Loading State */}
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

      {/* Empty State */}
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

      {/* Data Table - Read-only */}
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
        />
      )}
    </div>
  );
}

export default ReportsPage;
