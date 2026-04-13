// FILE: src/pages/OTCPage.jsx
// ✅ UPDATED: Font sizes, padding, and button sizing matched to DeckingPage (compact)

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getOTCRecords,
  uploadOTCExcel,
  downloadOTCTemplate,
  getOTCAppStatuses,
  getOTCAppTypes,
  getOTCPrescriptionTypes,
  exportOTCRecords,
  updateOTCRecord,
  deleteOTCRecord,
} from "../api/otc";

import OTCFilterBar from "../components/otc/OTCFilterBar";
import OTCUpload from "../components/otc/OTCUpload";
import OTCDataTable from "../components/otc/OTCDataTable";
import OTCUploadProgress from "../components/otc/OTCUploadProgress";
import { getOTCColors } from "../components/otc/otcColors";

const mapOTCDataItem = (item) => ({
  id: item.DB_ID,
  dtn: item.DB_DTN,
  category: item.DB_EST_CAT,
  ltoCompany: item.DB_EST_LTO_COMP,
  brandName: item.DB_PROD_BR_NAME,
  genericName: item.DB_PROD_GEN_NAME,
  dosageStrength: item.DB_PROD_DOS_STR,
  dosageForm: item.DB_PROD_DOS_FORM,
  prescription: item.DB_PROD_CLASS_PRESCRIP,
  registrationNo: item.DB_REG_NO,
  appType: item.DB_APP_TYPE,
  appStatus: item.DB_APP_STATUS,
  dateReceived: item.DB_DATE_RECEIVED_FDAC,
  uploadedBy: item.DB_USER_UPLOADER,
  uploadedAt: item.DB_DATE_EXCEL_UPLOAD,
  ...item,
});

function OTCPage({ darkMode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
    notYetDecked: 0,
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
  const [refreshKey, setRefreshKey] = useState(0);

  const [sortBy, setSortBy] = useState("DB_DATE_EXCEL_UPLOAD");
  const [sortOrder, setSortOrder] = useState("desc");

  const colors = getOTCColors(darkMode);
  const styleElementRef = useRef(null);

  useEffect(() => {
    const styleId = "custom-scrollbar-styles";
    if (!styleElementRef.current) {
      let el = document.getElementById(styleId);
      if (!el) {
        el = document.createElement("style");
        el.id = styleId;
        document.head.appendChild(el);
      }
      styleElementRef.current = el;
    }

    return () => {
      if (styleElementRef.current) {
        styleElementRef.current.remove();
        styleElementRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let username = null;
    const userStr =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        username = u.username || u.email || u.first_name;
      } catch {
        username = userStr;
      }
    }
    if (!username)
      username =
        localStorage.getItem("username") || sessionStorage.getItem("username");
    setCurrentUser(username || null);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const [a, b, c] = await Promise.all([
        getOTCRecords({ page: 1, pageSize: 1 }),
        getOTCRecords({ page: 1, pageSize: 1, is_in_pm: "not_in_pm" }),
        getOTCRecords({ page: 1, pageSize: 1, is_in_pm: "in_pm" }),
      ]);
      setStatsData({
        total: a.total || 0,
        notYetDecked: b.total || 0,
        decked: c.total || 0,
      });
    } catch (err) {
      console.error("Failed to fetch OTC stats:", err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getStatusFilter = useCallback((tab) => {
    if (tab === "not-yet-decked") return "not_in_pm";
    if (tab === "decked") return "in_pm";
    return "";
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchFilterOptions = async () => {
      try {
        const tabStatus = getStatusFilter(activeTab);
        const baseParams = {
          ...(tabStatus ? { is_in_pm: tabStatus } : {}),
        };

        const [appTypes, prescriptionTypes, appStatusTypes] = await Promise.all(
          [
            getOTCAppTypes({
              ...baseParams,
              ...(prescriptionTab ? { prescription: prescriptionTab } : {}),
              ...(appStatusTab ? { app_status: appStatusTab } : {}),
            }),
            getOTCPrescriptionTypes({
              ...baseParams,
              ...(subTab ? { app_type: subTab } : {}),
              ...(appStatusTab ? { app_status: appStatusTab } : {}),
            }),
            getOTCAppStatuses({
              ...baseParams,
              ...(subTab ? { app_type: subTab } : {}),
              ...(prescriptionTab ? { prescription: prescriptionTab } : {}),
            }),
          ],
        );

        if (cancelled) return;

        setAvailableAppTypes(appTypes || []);
        setAvailablePrescriptionTypes(prescriptionTypes || []);
        setAvailableAppStatusTypes(appStatusTypes || []);
      } catch (err) {
        if (!cancelled)
          console.error("Failed to fetch OTC filter options:", err);
      }
    };

    fetchFilterOptions();
    return () => {
      cancelled = true;
    };
  }, [activeTab, subTab, prescriptionTab, appStatusTab, getStatusFilter]);

  const buildFetchParams = useCallback(
    (
      page,
      perPage,
      search,
      tab,
      sub,
      prescription,
      appStatus,
      extraFilters,
      sort,
      order,
    ) => {
      const params = { page, pageSize: perPage, search };
      const tabStatus = getStatusFilter(tab);

      if (appStatus !== null && appStatus !== "") {
        params.app_status = appStatus;
      } else if (tabStatus) {
        params.is_in_pm = tabStatus;
      }

      if (extraFilters?.brandName) params.brand_name = extraFilters.brandName;
      if (extraFilters?.genericName)
        params.generic_name = extraFilters.genericName;
      if (extraFilters?.ltoCompany)
        params.lto_company = extraFilters.ltoCompany;
      if (extraFilters?.registrationNo)
        params.registration_no = extraFilters.registrationNo;
      if (sub !== null && sub !== "") params.app_type = sub;
      if (prescription !== null && prescription !== "")
        params.prescription = prescription;

      if (sort) params.sortBy = sort;
      if (order) params.sortOrder = order;

      return params;
    },
    [getStatusFilter],
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = buildFetchParams(
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
        );
        const result = await getOTCRecords(params);
        if (!result || !result.data || !Array.isArray(result.data)) {
          setFilteredData([]);
          setTotalRecords(0);
          setTotalPages(0);
          return;
        }
        setFilteredData(result.data.map(mapOTCDataItem));
        setTotalRecords(result.total);
        setTotalPages(Math.ceil(result.total / rowsPerPage));
      } catch (err) {
        console.error("Failed to fetch OTC records:", err);
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
    refreshKey,
    sortBy,
    sortOrder,
    buildFetchParams,
  ]);

  const refreshData = useCallback(async () => {
    await fetchStats();
    setRefreshKey((k) => k + 1);
  }, [fetchStats]);

  const getExportParams = () => {
    const params = { search: searchTerm };
    const tabStatus = getStatusFilter(activeTab);

    if (appStatusTab !== null && appStatusTab !== "")
      params.app_status = appStatusTab;
    else if (tabStatus) params.is_in_pm = tabStatus;

    if (filters.brandName) params.brand_name = filters.brandName;
    if (filters.genericName) params.generic_name = filters.genericName;
    if (filters.ltoCompany) params.lto_company = filters.ltoCompany;
    if (filters.registrationNo) params.registration_no = filters.registrationNo;
    if (subTab !== null && subTab !== "") params.app_type = subTab;
    if (prescriptionTab !== null && prescriptionTab !== "")
      params.prescription = prescriptionTab;
    return params;
  };

  const handleSort = useCallback((column, order) => {
    setSortBy(column);
    setSortOrder(order);
    setCurrentPage(1);
  }, []);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      alert("Please upload a valid Excel file (.xlsx or .xls)");
      return;
    }
    const username = currentUser || "system";
    if (!currentUser) {
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
      setUploadProgress(`Uploading OTC file as: ${username}...`);
      const result = await uploadOTCExcel(file, username);
      setUploadProgress(null);
      setUploading(false);
      const { success, errors } = result.stats;
      let message = `✅ OTC Upload Complete!\n\n👤 Uploaded by: ${username}\n📊 Total: ${result.stats.total} rows\n✓ Success: ${success} records\n`;
      if (errors > 0) message += `✗ Errors: ${errors} failed\n`;
      alert(message);
      setCurrentPage(1);
      await refreshData();
    } catch (error) {
      console.error("OTC upload error:", error);
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
      await downloadOTCTemplate();
    } catch (error) {
      console.error("Download OTC template error:", error);
      alert("Failed to download OTC template");
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.length > 0) setSelectedRows([]);
    else setSelectedRows(filteredData.map((row) => row.id).filter(Boolean));
  };
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
    const raw = Number(e.target.value);
    const capped = Math.min(raw, 100);
    if (raw > 100) alert("Maximum rows per page is 100.");
    setRowsPerPage(capped);
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
  const handleSubTabChange = (v) => {
    setSubTab(v);
    setCurrentPage(1);
    setSelectedRows([]);
    setPrescriptionTab(null);
    setAppStatusTab(null);
  };
  const handlePrescriptionTabChange = (v) => {
    setPrescriptionTab(v);
    setCurrentPage(1);
    setSelectedRows([]);
    setAppStatusTab(null);
  };
  const handleAppStatusTabChange = (v) => {
    setAppStatusTab(v);
    setCurrentPage(1);
    setSelectedRows([]);
  };
  const handleExport = async () => {
    try {
      setExporting(true);
      await exportOTCRecords(getExportParams());
      alert(`✅ Export successful!\n\nExported ${totalRecords} OTC records.`);
    } catch (error) {
      console.error("OTC export error:", error);
      alert(`❌ Export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };
  const handleEdit = (record) => setEditingRecord(record);
  const handleEditSuccess = async () => {
    await refreshData();
    alert("✅ OTC record updated successfully!");
  };
  const handleDelete = async (recordId) => {
    if (!confirm("⚠️ Are you sure you want to delete this OTC record?")) return;
    try {
      await deleteOTCRecord(recordId);
      alert("✅ OTC record deleted successfully!");
      await refreshData();
    } catch (error) {
      console.error("Delete OTC record error:", error);
      alert(`❌ Delete failed: ${error.message}`);
    }
  };

  const activeFilterCount = [subTab, prescriptionTab, appStatusTab].filter(
    (v) => v !== null,
  ).length;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ========== SIDEBAR ========== */}
      <div
        style={{
          width: sidebarOpen ? "200px" : "52px",
          minWidth: sidebarOpen ? "200px" : "52px",
          background: darkMode ? "#0a0a0a" : "#ffffff",
          borderRight: `1px solid ${colors.cardBorder}`,
          padding: sidebarOpen ? "1rem 0" : "1rem 0",
          overflowY: "hidden",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          transition: "width 0.25s ease, min-width 0.25s ease",
          flexShrink: 0,
        }}
      >
        {sidebarOpen ? (
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
                onClick={() => setSidebarOpen(false)}
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
                  darkMode={darkMode}
                  colors={colors}
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
                  darkMode={darkMode}
                  colors={colors}
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
                  darkMode={darkMode}
                  colors={colors}
                  totalCount={availableAppStatusTypes.reduce(
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
              onClick={() => setSidebarOpen(true)}
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
                onClick={() => setSidebarOpen(true)}
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
                title: "Prescriptions",
                active: prescriptionTab !== null,
              },
              {
                icon: "📈",
                title: "All Status",
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
                onClick={() => setSidebarOpen(true)}
              >
                {item.icon}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ========== MAIN CONTENT ========== */}
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
                  color: colors.textPrimary,
                  margin: 0,
                }}
              >
                For Decking
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
              <OTCUpload
                onFileSelect={handleFileSelect}
                onDownloadTemplate={handleDownloadTemplate}
                uploading={uploading}
                colors={colors}
                darkMode={darkMode}
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
                id: "not-yet-decked",
                label: "Not Yet Decked",
                icon: "⏳",
                count: statsData.notYetDecked,
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

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.85rem 1.5rem",
            background: colors.pageBg,
          }}
        >
          <OTCFilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filters={filters}
            onFilterChange={setFilters}
            colors={colors}
            activeTab={activeTab}
            subTab={subTab}
            prescriptionTab={prescriptionTab}
            appStatusTab={appStatusTab}
            darkMode={darkMode}
          />
          <OTCUploadProgress
            message={uploadProgress}
            colors={colors}
            darkMode={darkMode}
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
                Loading OTC records...
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
                No OTC records found
              </div>
              <div style={{ fontSize: "0.75rem" }}>
                No records found for the selected criteria
              </div>
            </div>
          )}

          {!loading && filteredData.length > 0 && (
            <OTCDataTable
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
              onDelete={handleDelete}
              onSort={handleSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
              darkMode={darkMode}
            />
          )}
        </div>
      </div>

      {editingRecord && (
        <OTCEditModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSuccess={handleEditSuccess}
          colors={colors}
          darkMode={darkMode}
          updateUploadReport={updateOTCRecord}
        />
      )}
    </div>
  );
}

// ─── SidebarSection ───────────────────────────────────────────────────────────
function SidebarSection({
  title,
  icon,
  items,
  activeItem,
  onItemClick,
  darkMode,
  colors,
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
            const filterValue = item.value ?? null;
            const isActive = activeItem === filterValue;
            return (
              <div
                key={filterValue ?? `no-${title}`}
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

export default OTCPage;
