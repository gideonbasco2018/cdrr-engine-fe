import { useState, useEffect, useRef } from "react";
import {
  downloadTemplate,
  uploadExcelFile,
  getAllDrugs,
  getDrugById,
  cancelDrug,
  restoreDrug,
  updateDrug,
  exportDrugsToExcel,
} from "../api/fdaverifportal";

import { getDashboardStats } from "../api/fdaverifportal";

// Import auth API
import { getCurrentUser as fetchCurrentUser } from "../api/auth";

// Import Components
import FDAViewModal from "../components/fda/actions/FDAViewModal";
import FDAEditModal from "../components/fda/actions/FDAEditModal";
import FDACancelConfirmModal from "../components/fda/actions/FDACancelConfirmModal";
import FDADataTable from "../components/fda/FDADataTable";
import FDATablePagination from "../components/fda/FDATablePagination";

// Import filter utilities
import {
  applyFilters,
  calculateStats,
  isExpired,
} from "../utils/FDAFilterHelpers";

function FDAVerificationPortalPage({ darkMode }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [drugsData, setDrugsData] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    manufacturers: 0,
    canceledProducts: 0,
    expiredProducts: 0,
    uploadedToday: 0,
    uploadedYesterday: 0,
    uploadedThisMonth: 0,
    duplicateProducts: 0,
  });
  const [openDropdown, setOpenDropdown] = useState(null);

  // ✅ Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ✅ Advanced filters expanded state
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Store button refs for dropdown positioning
  const buttonRefs = useRef({});

  // Tab state
  const [activeTab, setActiveTab] = useState("all");

  // Modal states
  const [viewModal, setViewModal] = useState({ open: false, data: null });
  const [editModal, setEditModal] = useState({ open: false, data: null });
  const [cancelModal, setCancelModal] = useState({
    open: false,
    drugId: null,
    drugName: "",
    isCanceled: false,
  });

  // Filter states
  const [filters, setFilters] = useState({
    uploadedBy: "",
    dateUploadFrom: "",
    dateUploadTo: "",
  });

  // ==================== GET CURRENT USER FROM API ====================
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        setUserLoading(true);
        const userData = await fetchCurrentUser();
        setCurrentUser(userData);
      } catch (error) {
        console.error("❌ Error fetching current user:", error);
        const fallbackUsername = localStorage.getItem("username");
        if (fallbackUsername) {
          setCurrentUser({ username: fallbackUsername });
        } else {
          setCurrentUser(null);
        }
      } finally {
        setUserLoading(false);
      }
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const fetchStats = async () => {
      try {
        const dashboardData = await getDashboardStats(currentUser.username);
        setStats({
          totalProducts: dashboardData.total_manual_application_released || 0,
          activeProducts: dashboardData.active_products || 0,
          expiredProducts: dashboardData.expired_products || 0,
          uploadedToday: dashboardData.uploads_today || 0,
          uploadedYesterday: dashboardData.uploads_yesterday || 0,
          uploadedThisMonth: dashboardData.uploads_this_month || 0,
          duplicateProducts: dashboardData.duplicate_records || 0,
          canceledProducts: dashboardData.cancelled_records || 0,
        });
      } catch (err) {
        console.error("❌ Failed to fetch dashboard stats:", err);
      }
    };
    fetchStats();
  }, [currentUser]);

  // Color scheme
  const colors = darkMode
    ? {
        pageBg: "#0a0a0a",
        cardBg: "#0f0f0f",
        cardBorder: "#1a1a1a",
        textPrimary: "#fff",
        textSecondary: "#999",
        textTertiary: "#666",
        inputBg: "#1a1a1a",
        inputBorder: "#2a2a2a",
        tableBg: "#0f0f0f",
        tableRowEven: "#0a0a0a",
        tableRowOdd: "#0f0f0f",
        tableRowHover: "#151515",
        tableBorder: "#1a1a1a",
        tableText: "#ccc",
        tabActive: "#4CAF50",
        sidebarBg: "#0d0d0d",
        sidebarBorder: "#1a1a1a",
        sidebarSectionBg: "#111",
      }
    : {
        pageBg: "#f8f8f8",
        cardBg: "#ffffff",
        cardBorder: "#e5e5e5",
        textPrimary: "#000",
        textSecondary: "#666",
        textTertiary: "#999",
        inputBg: "#ffffff",
        inputBorder: "#e5e5e5",
        tableBg: "#ffffff",
        tableRowEven: "#ffffff",
        tableRowOdd: "#fafafa",
        tableRowHover: "#f0f0f0",
        tableBorder: "#e5e5e5",
        tableText: "#333",
        tabActive: "#4CAF50",
        sidebarBg: "#f0f0f0",
        sidebarBorder: "#e0e0e0",
        sidebarSectionBg: "#f8f8f8",
      };

  const canEditDrug = (drug) => {
    if (!currentUser) return false;
    if (currentUser.role === "Admin" || currentUser.role === "admin")
      return true;
    return drug.uploaded_by === currentUser.username;
  };

  // ✅ Tighter column widths to maximize table density
  const columns = [
    { key: "reference_number", label: "Reference Number", width: "150px" },
    { key: "generic_name", label: "Generic Name", width: "260px" },
    { key: "brand_name", label: "Brand Name", width: "200px" },
    { key: "dosage_strength", label: "Dosage Strength", width: "400px" },
    { key: "dosage_form", label: "Dosage Form", width: "170px" },
    { key: "classification", label: "Classification", width: "200px" },
    { key: "packaging", label: "Packaging", width: "350px" },
    {
      key: "pharmacologic_category",
      label: "Pharmacologic Category",
      width: "300px",
    },
    { key: "manufacturer", label: "Manufacturer", width: "260px" },
    { key: "country_of_origin", label: "Country", width: "150px" },
    { key: "trader", label: "Trader", width: "260px" },
    { key: "importer", label: "Importer", width: "260px" },
    { key: "distributor", label: "Distributor", width: "260px" },
    { key: "app_type", label: "App Type", width: "200px" },
    { key: "issuance_date", label: "Issuance Date", width: "150px" },
    { key: "expiry_date", label: "Expiry Date", width: "150px" },
    { key: "uploaded_by", label: "Uploaded By", width: "150px" },
    { key: "date_uploaded", label: "Date Uploaded", width: "250px" },
  ];

  const isToday = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isYesterday = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    );
  };

  const isThisMonth = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return (
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const findDuplicateRegistrationNumbers = (data) => {
    const registrationGroups = {};
    data.forEach((drug) => {
      if (drug.registration_number) {
        const regNum = drug.registration_number.trim();
        if (!registrationGroups[regNum]) registrationGroups[regNum] = [];
        registrationGroups[regNum].push(drug);
      }
    });
    return Object.keys(registrationGroups).filter((regNum) => {
      const nonCanceledCount = registrationGroups[regNum].filter(
        (drug) => drug.is_canceled !== "Y",
      ).length;
      return nonCanceledCount >= 2;
    });
  };

  const getFilteredData = () => {
    if (!currentUser) return [];

    // ✅ Backend na ang bahala sa filtering ng mga tabs na ito
    if (
      activeTab === "duplicates" ||
      activeTab === "expired" ||
      activeTab === "canceled" ||
      activeTab === "today" ||
      activeTab === "yesterday" ||
      activeTab === "thismonth"
    ) {
      return drugsData; // direkta na ireturn, wag nang i-filter pa
    }

    // "all" tab lang ang may client-side filter (uploadedBy, date range)
    let filtered = applyFilters(drugsData, filters, activeTab);
    return filtered;
  };

  const fetchDrugs = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getAllDrugs({
        page: currentPage,
        page_size: pageSize,
        search: searchTerm,
        include_canceled: activeTab === "canceled",
        expired_only: activeTab === "expired",
        duplicates_only: activeTab === "duplicates",
        uploaded_today: activeTab === "today",
        uploaded_yesterday: activeTab === "yesterday",
        uploaded_this_month: activeTab === "thismonth",
        uploaded_by: filters.uploadedBy || null,
      });
      setDrugsData(response.data || []);
      setPagination(response.pagination || {});
    } catch (err) {
      console.error("Error fetching drugs:", err);
      setError(err.response?.data?.detail || "Failed to fetch drug data");
      setDrugsData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (!currentUser) return;
    const delaySearch = setTimeout(() => {
      fetchDrugs();
    }, 500);
    return () => clearTimeout(delaySearch);
  }, [
    currentPage,
    pageSize,
    searchTerm,
    activeTab,
    currentUser,
    filters.uploadedBy,
  ]); // ✅ added filters.uploadedBy
  const handleViewDetails = async (drugId) => {
    try {
      setLoading(true);
      const response = await getDrugById(drugId);
      setViewModal({ open: true, data: response.data });
    } catch (err) {
      alert(
        `❌ Failed to fetch details: ${err.response?.data?.detail || err.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (drugId) => {
    try {
      setLoading(true);
      const response = await getDrugById(drugId);
      setEditModal({ open: true, data: response.data });
    } catch (err) {
      alert(
        `❌ Failed to fetch details: ${err.response?.data?.detail || err.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (formData) => {
    try {
      setLoading(true);
      await updateDrug(editModal.data.id, {
        registration_number: formData.registration_number,
        generic_name: formData.generic_name,
        brand_name: formData.brand_name,
        dosage_strength: formData.dosage_strength,
        dosage_form: formData.dosage_form,
        classification: formData.classification,
        packaging: formData.packaging,
        pharmacologic_category: formData.pharmacologic_category,
        manufacturer: formData.manufacturer,
        country_of_origin: formData.country_of_origin,
        trader: formData.trader,
        importer: formData.importer,
        distributor: formData.distributor,
        app_type: formData.app_type,
        issuance_date: formData.issuance_date,
        expiry_date: formData.expiry_date,
      });
      alert("✅ Drug updated successfully!");
      setEditModal({ open: false, data: null });
      await fetchDrugs();
    } catch (err) {
      alert(
        `❌ Failed to update: ${err.response?.data?.detail || err.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = (drugId, drugName, isCanceled) => {
    setCancelModal({ open: true, drugId, drugName, isCanceled });
  };

  const handleCancelConfirm = async () => {
    try {
      setLoading(true);
      if (cancelModal.isCanceled) {
        await restoreDrug(cancelModal.drugId);
        alert("✅ Drug registration restored successfully!");
      } else {
        await cancelDrug(cancelModal.drugId, currentUser.username);
        alert("✅ Drug registration canceled successfully!");
      }
      setCancelModal({
        open: false,
        drugId: null,
        drugName: "",
        isCanceled: false,
      });
      await fetchDrugs();
      const dashboardData = await getDashboardStats(currentUser.username);
      setStats({
        totalProducts: dashboardData.total_manual_application_released || 0,
        activeProducts: dashboardData.active_products || 0,
        expiredProducts: dashboardData.expired_products || 0,
        uploadedToday: dashboardData.uploads_today || 0,
        uploadedYesterday: dashboardData.uploads_yesterday || 0,
        uploadedThisMonth: dashboardData.uploads_this_month || 0,
        duplicateProducts: dashboardData.duplicate_records || 0,
        canceledProducts: dashboardData.cancelled_records || 0,
      });
    } catch (err) {
      alert(
        `❌ Failed to ${cancelModal.isCanceled ? "restore" : "cancel"}: ${err.response?.data?.detail || err.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setLoading(true);
      const blob = await downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `FDA_Drug_Registration_Template_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      alert("✅ Template downloaded successfully!");
    } catch (err) {
      alert(
        `❌ Failed to download template: ${err.response?.data?.detail || err.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    if (!currentUser) {
      alert("❌ User not logged in");
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      alert("❌ Please upload an Excel file (.xlsx or .xls)");
      event.target.value = "";
      return;
    }
    try {
      setLoading(true);
      const response = await uploadExcelFile(file, currentUser.username);
      if (response.status === "success") {
        alert(
          `✅ Upload successful!\n\n${response.successful} records inserted successfully.\n\nUploaded by: ${currentUser.username}`,
        );
      } else if (response.status === "partial_success") {
        alert(
          `⚠️ Upload partially successful!\n\n✅ Successful: ${response.successful}\n❌ Failed: ${response.failed}\nUploaded by: ${currentUser.username}`,
        );
      }
      await fetchDrugs();
      const dashboardData = await getDashboardStats(currentUser.username);
      setStats({
        totalProducts: dashboardData.total_manual_application_released || 0,
        activeProducts: dashboardData.active_products || 0,
        expiredProducts: dashboardData.expired_products || 0,
        uploadedToday: dashboardData.uploads_today || 0,
        uploadedYesterday: dashboardData.uploads_yesterday || 0,
        uploadedThisMonth: dashboardData.uploads_this_month || 0,
        duplicateProducts: dashboardData.duplicate_records || 0,
        canceledProducts: dashboardData.cancelled_records || 0,
      });
    } catch (err) {
      alert(
        `❌ Failed to upload file: ${err.response?.data?.detail || err.message}`,
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (pagination.total_pages || 1))
      setCurrentPage(newPage);
  };

  const handleExportToExcel = async () => {
    try {
      setLoading(true);
      const blob = await exportDrugsToExcel({
        search: searchTerm,
        include_canceled: activeTab === "canceled",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `FDA_Drugs_Export_${activeTab}_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      alert(`✅ Data exported successfully!`);
    } catch (err) {
      alert(
        `❌ Failed to export: ${err.response?.data?.detail || err.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = (drugId) =>
    setOpenDropdown(openDropdown === drugId ? null : drugId);

  useEffect(() => {
    const handleClickOutside = () => {
      if (openDropdown) setOpenDropdown(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openDropdown]);

  // ✅ Clear all filters
  const handleClearFilters = () => {
    setFilters({ uploadedBy: "", dateUploadFrom: "", dateUploadTo: "" });
    setSearchTerm("");
  };

  const hasActiveFilters =
    searchTerm ||
    filters.uploadedBy ||
    filters.dateUploadFrom ||
    filters.dateUploadTo;

  const filteredData = getFilteredData();
  const duplicateRegNums = [];

  if (userLoading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: colors.pageBg,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "50px",
              height: "50px",
              border: "4px solid #4CAF50",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
            }}
          />
          <p style={{ color: colors.textPrimary }}>
            Loading user information...
          </p>
        </div>
      </div>
    );
  }

  // ── Sidebar tab config ──────────────────────────────────────────────
  const sidebarTabs = [
    {
      key: "all",
      icon: "📋",
      label: "All Manual",
      count: stats.totalProducts - stats.canceledProducts,
      color: "#4CAF50",
    },
    {
      key: "duplicates",
      icon: "🔄",
      label: "Duplicate Records",
      count: stats.duplicateProducts,
      color: "#E91E63",
    },
    {
      key: "today",
      icon: "📅",
      label: "Today",
      count: stats.uploadedToday,
      color: "#2196F3",
    },
    {
      key: "yesterday",
      icon: "📆",
      label: "Yesterday",
      count: stats.uploadedYesterday,
      color: "#9C27B0",
    },
    {
      key: "thismonth",
      icon: "📊",
      label: "This Month",
      count: stats.uploadedThisMonth,
      color: "#00BCD4",
    },
    {
      key: "expired",
      icon: "⏰",
      label: "Expired",
      count: stats.expiredProducts,
      color: "#FF9800",
    },
    {
      key: "canceled",
      icon: "🚫",
      label: "Canceled",
      count: stats.canceledProducts,
      color: "#f44336",
    },
  ];

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        background: colors.pageBg,
        overflow: "hidden",
        transition: "all 0.3s ease",
      }}
    >
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .fda-sidebar-item:hover { background: rgba(76,175,80,0.08) !important; }
        .fda-input:focus { border-color: #4CAF50 !important; outline: none; }
        .fda-clear-btn:hover { background: rgba(239,68,68,0.12) !important; color: #ef4444 !important; border-color: #ef4444 !important; }
      `}</style>

      {/* Loading Overlay */}
      {loading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: colors.cardBg,
              padding: "2rem",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                border: "4px solid #4CAF50",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 1rem",
              }}
            />
            <p style={{ color: colors.textPrimary }}>Loading...</p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          LEFT SIDEBAR — Search + Filters + Tabs
      ════════════════════════════════════════════ */}
      <div
        style={{
          width: sidebarCollapsed ? "52px" : "200px",
          minWidth: sidebarCollapsed ? "52px" : "200px",
          maxWidth: sidebarCollapsed ? "52px" : "200px",
          background: colors.cardBg || colors.cardBg,
          borderRight: `1px solid ${colors.sidebarBorder || colors.cardBorder}`,
          padding: sidebarCollapsed ? "1rem 0" : "1rem 0",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.25s ease, min-width 0.25s ease",
          overflowY: "hidden",
          overflowX: "hidden",
          gap: "0.5rem",
          flexShrink: 0,
        }}
      >
        {/* Sidebar Header */}
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
          {!sidebarCollapsed && (
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
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
          >
            {sidebarCollapsed ? "▶" : "◀"}
          </button>
        </div>

        {/* Sidebar Body — only shown when expanded */}
        {!sidebarCollapsed && (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {/* ── Search ─────────────────────────────── */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: colors.textTertiary,
                  marginBottom: "0.4rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Search
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "0.6rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "0.85rem",
                    color: colors.textTertiary,
                    pointerEvents: "none",
                  }}
                >
                  🔍
                </span>
                <input
                  className="fda-input"
                  type="text"
                  placeholder="DTN, Brand, Generic..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 2rem 0.6rem 1.8rem",
                    background: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "7px",
                    color: colors.textPrimary,
                    fontSize: "0.82rem",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s",
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
                      background: "transparent",
                      border: "none",
                      color: colors.textTertiary,
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* ── Advanced Filters toggle ─────────────── */}
            <div>
              <button
                onClick={() => setAdvancedOpen(!advancedOpen)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  background: advancedOpen
                    ? "rgba(76,175,80,0.1)"
                    : "transparent",
                  border: `1px solid ${advancedOpen ? "#4CAF5060" : colors.inputBorder}`,
                  borderRadius: "7px",
                  color: advancedOpen ? "#4CAF50" : colors.textSecondary,
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s",
                }}
              >
                <span>⚙️ Advanced Filters</span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    transition: "transform 0.2s",
                    transform: advancedOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  ▼
                </span>
              </button>

              {/* Advanced filter fields */}
              {advancedOpen && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    padding: "0.75rem",
                    background: colors.sidebarSectionBg || colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.65rem",
                  }}
                >
                  {/* Uploaded By */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.72rem",
                        fontWeight: "600",
                        color: colors.textTertiary,
                        marginBottom: "0.3rem",
                      }}
                    >
                      Uploaded By
                    </label>
                    <input
                      className="fda-input"
                      type="text"
                      placeholder="Username..."
                      value={filters.uploadedBy}
                      onChange={(e) =>
                        setFilters((p) => ({
                          ...p,
                          uploadedBy: e.target.value,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.65rem",
                        background: colors.inputBg,
                        border: `1px solid ${colors.inputBorder}`,
                        borderRadius: "6px",
                        color: colors.textPrimary,
                        fontSize: "0.8rem",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                      }}
                    />
                  </div>

                  {/* Date From */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.72rem",
                        fontWeight: "600",
                        color: colors.textTertiary,
                        marginBottom: "0.3rem",
                      }}
                    >
                      Upload Date From
                    </label>
                    <input
                      className="fda-input"
                      type="date"
                      value={filters.dateUploadFrom}
                      onChange={(e) =>
                        setFilters((p) => ({
                          ...p,
                          dateUploadFrom: e.target.value,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.65rem",
                        background: colors.inputBg,
                        border: `1px solid ${colors.inputBorder}`,
                        borderRadius: "6px",
                        color: colors.textPrimary,
                        fontSize: "0.8rem",
                        boxSizing: "border-box",
                        colorScheme: darkMode ? "dark" : "light",
                        transition: "border-color 0.2s",
                      }}
                    />
                  </div>

                  {/* Date To */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.72rem",
                        fontWeight: "600",
                        color: colors.textTertiary,
                        marginBottom: "0.3rem",
                      }}
                    >
                      Upload Date To
                    </label>
                    <input
                      className="fda-input"
                      type="date"
                      value={filters.dateUploadTo}
                      onChange={(e) =>
                        setFilters((p) => ({
                          ...p,
                          dateUploadTo: e.target.value,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.65rem",
                        background: colors.inputBg,
                        border: `1px solid ${colors.inputBorder}`,
                        borderRadius: "6px",
                        color: colors.textPrimary,
                        fontSize: "0.8rem",
                        boxSizing: "border-box",
                        colorScheme: darkMode ? "dark" : "light",
                        transition: "border-color 0.2s",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Clear all filters button ─────────────── */}
            {hasActiveFilters && (
              <button
                className="fda-clear-btn"
                onClick={handleClearFilters}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  background: "transparent",
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "7px",
                  color: colors.textTertiary,
                  fontSize: "0.78rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                ✕ Clear All Filters
              </button>
            )}

            {/* ── Divider ─────────────────────────────── */}
            <div
              style={{
                borderTop: `1px solid ${colors.cardBorder}`,
                margin: "0 -1rem",
              }}
            />

            {/* ── Tab navigation ──────────────────────── */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  color: colors.textTertiary,
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Views
              </label>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                {sidebarTabs.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      className="fda-sidebar-item"
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        width: "100%",
                        padding: "0.6rem 0.75rem",
                        background: isActive ? `${tab.color}18` : "transparent",
                        border: `1px solid ${isActive ? tab.color + "50" : "transparent"}`,
                        borderRadius: "8px",
                        color: isActive ? tab.color : colors.textSecondary,
                        fontSize: "0.83rem",
                        fontWeight: isActive ? "700" : "500",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                        textAlign: "left",
                        transition: "all 0.15s",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span style={{ fontSize: "0.95rem" }}>{tab.icon}</span>
                        <span>{tab.label}</span>
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          padding: "0.15rem 0.45rem",
                          borderRadius: "10px",
                          background: isActive ? tab.color : colors.inputBg,
                          color: isActive ? "#fff" : colors.textTertiary,
                          minWidth: "24px",
                          textAlign: "center",
                          flexShrink: 0,
                        }}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Collapsed state: show only tab icons */}
        {sidebarCollapsed && (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "0.5rem 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            {/* Search icon */}
            <button
              onClick={() => setSidebarCollapsed(false)}
              title="Expand to search"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                border: `1px solid ${colors.cardBorder}`,
                background: "transparent",
                color: colors.textTertiary,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
                marginBottom: "0.5rem",
              }}
            >
              🔍
            </button>

            <div
              style={{
                width: "32px",
                height: "1px",
                background: colors.cardBorder,
                margin: "0.25rem 0",
              }}
            />

            {sidebarTabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  title={tab.label}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    border: `1px solid ${isActive ? tab.color + "60" : "transparent"}`,
                    background: isActive ? `${tab.color}18` : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    transition: "all 0.15s",
                  }}
                >
                  {tab.icon}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════
          MAIN CONTENT AREA
      ════════════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 2rem" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "1rem",
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
                FDA Verification Portal
              </h1>
              <p
                style={{
                  color: colors.textTertiary,
                  fontSize: "0.75rem",
                  margin: "0.2rem 0 0",
                }}
              >
                Verify and manage FDA registered pharmaceutical products
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.6rem" }}>
              <button
                onClick={handleExportToExcel}
                disabled={loading || filteredData.length === 0}
                style={{
                  padding: "0.55rem 0.85rem",
                  background: "transparent",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.72rem",
                  fontWeight: "500",
                  cursor:
                    loading || filteredData.length === 0
                      ? "not-allowed"
                      : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  opacity: loading || filteredData.length === 0 ? 0.5 : 1,
                }}
              >
                <span>📊</span>
                <span>Export Data</span>
              </button>

              <button
                onClick={handleDownloadTemplate}
                disabled={loading}
                style={{
                  padding: "0.55rem 0.85rem",
                  background: "transparent",
                  border: `2px solid ${colors.cardBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.72rem",
                  fontWeight: "500",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  opacity: loading ? 0.5 : 1,
                }}
              >
                <span>📥</span>
                <span>Download Template</span>
              </button>

              <label
                style={{
                  padding: "0.55rem 0.85rem",
                  background: loading
                    ? "#999"
                    : "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.72rem",
                  fontWeight: "500",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  boxShadow: "0 4px 12px rgba(76, 175, 80, 0.3)",
                }}
              >
                <span>📤</span>
                <span>Upload New Data</span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={loading}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                background: "#ff4444",
                color: "#fff",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                marginBottom: "0.75rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.82rem",
              }}
            >
              <span>❌ {error}</span>
              <button
                onClick={() => setError(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* ── Stats Cards — compact ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "0.3rem",
              marginBottom: "0.6rem",
            }}
          >
            {[
              {
                icon: "📋",
                label: "Total Manual Application Released",
                value: stats.totalProducts,
                color: colors.textPrimary,
              },
              {
                icon: "✅",
                label: "Active Products",
                value: stats.activeProducts,
                color: "#4CAF50",
              },
              {
                icon: "⏰",
                label: "Expired",
                value: stats.expiredProducts,
                color: "#FF9800",
              },
              {
                icon: "🔄",
                label: "Duplicate Records",
                value: stats.duplicateProducts,
                color: "#E91E63",
              },
              {
                icon: "🚫",
                label: "Canceled",
                value: stats.canceledProducts,
                color: "#f44336",
              },
            ].map((stat, index) => (
              <div
                key={index}
                style={{
                  background: colors.cardBg,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "7px",
                  padding: "0.4rem 0.6rem", // ✅ tighter padding
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <span style={{ fontSize: "1rem" }}>{stat.icon}</span>{" "}
                  {/* ✅ smaller icon */}
                  <div>
                    <p
                      style={{
                        fontSize: "0.6rem", // ✅ smaller label
                        color: colors.textTertiary,
                        marginBottom: "0.05rem",
                        lineHeight: "1.2",
                      }}
                    >
                      {stat.label}
                    </p>
                    <p
                      style={{
                        fontSize: "0.95rem", // ✅ slightly smaller value
                        fontWeight: "700",
                        color: stat.color,
                        margin: 0,
                        lineHeight: "1.2",
                      }}
                    >
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.4rem",
                marginBottom: "0.6rem",
              }}
            >
              {searchTerm && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.25rem 0.55rem",
                    background: "rgba(76,175,80,0.12)",
                    border: "1px solid #4CAF5040",
                    borderRadius: "20px",
                    fontSize: "0.75rem",
                    color: "#4CAF50",
                    fontWeight: "600",
                  }}
                >
                  🔍 "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm("")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#4CAF50",
                      cursor: "pointer",
                      padding: 0,
                      lineHeight: 1,
                      fontSize: "0.72rem",
                    }}
                  >
                    ✕
                  </button>
                </span>
              )}
              {filters.uploadedBy && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.25rem 0.55rem",
                    background: "rgba(33,150,243,0.12)",
                    border: "1px solid #2196F340",
                    borderRadius: "20px",
                    fontSize: "0.75rem",
                    color: "#2196F3",
                    fontWeight: "600",
                  }}
                >
                  👤 {filters.uploadedBy}
                  <button
                    onClick={() =>
                      setFilters((p) => ({ ...p, uploadedBy: "" }))
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2196F3",
                      cursor: "pointer",
                      padding: 0,
                      lineHeight: 1,
                      fontSize: "0.72rem",
                    }}
                  >
                    ✕
                  </button>
                </span>
              )}
              {filters.dateUploadFrom && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.25rem 0.55rem",
                    background: "rgba(156,39,176,0.12)",
                    border: "1px solid #9C27B040",
                    borderRadius: "20px",
                    fontSize: "0.75rem",
                    color: "#9C27B0",
                    fontWeight: "600",
                  }}
                >
                  📅 From: {filters.dateUploadFrom}
                  <button
                    onClick={() =>
                      setFilters((p) => ({ ...p, dateUploadFrom: "" }))
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color: "#9C27B0",
                      cursor: "pointer",
                      padding: 0,
                      lineHeight: 1,
                      fontSize: "0.72rem",
                    }}
                  >
                    ✕
                  </button>
                </span>
              )}
              {filters.dateUploadTo && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.25rem 0.55rem",
                    background: "rgba(156,39,176,0.12)",
                    border: "1px solid #9C27B040",
                    borderRadius: "20px",
                    fontSize: "0.75rem",
                    color: "#9C27B0",
                    fontWeight: "600",
                  }}
                >
                  📅 To: {filters.dateUploadTo}
                  <button
                    onClick={() =>
                      setFilters((p) => ({ ...p, dateUploadTo: "" }))
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color: "#9C27B0",
                      cursor: "pointer",
                      padding: 0,
                      lineHeight: 1,
                      fontSize: "0.72rem",
                    }}
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Data Table */}
          <div
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "0.65rem 1.25rem",
                borderBottom: `1px solid ${colors.tableBorder}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    color: colors.textPrimary,
                    margin: 0,
                  }}
                >
                  {activeTab === "all"
                    ? "All Manual Application"
                    : activeTab === "duplicates"
                      ? "Duplicate Registration Numbers"
                      : activeTab === "today"
                        ? "My Products Uploaded Today"
                        : activeTab === "yesterday"
                          ? "My Products Uploaded Yesterday"
                          : activeTab === "thismonth"
                            ? "My Products Uploaded This Month"
                            : activeTab === "expired"
                              ? "All Expired Products"
                              : "All Canceled Products"}
                </h3>
                {(() => {
                  const tab = sidebarTabs.find((t) => t.key === activeTab);
                  return tab ? (
                    <span
                      style={{
                        padding: "0.15rem 0.5rem",
                        background: `${tab.color}18`,
                        border: `1px solid ${tab.color}40`,
                        borderRadius: "12px",
                        fontSize: "0.7rem",
                        fontWeight: "700",
                        color: tab.color,
                      }}
                    >
                      {tab.icon} {tab.label}
                    </span>
                  ) : null;
                })()}
              </div>
              <span
                style={{ fontSize: "0.78rem", color: colors.textSecondary }}
              >
                Showing {filteredData.length} record
                {filteredData.length !== 1 ? "s" : ""}
              </span>
            </div>

            <FDADataTable
              filteredData={filteredData}
              columns={columns}
              colors={colors}
              currentPage={currentPage}
              pageSize={pageSize}
              loading={loading}
              openDropdown={openDropdown}
              buttonRefs={buttonRefs}
              activeTab={activeTab}
              darkMode={darkMode}
              currentUser={currentUser}
              canEditDrug={canEditDrug}
              toggleDropdown={toggleDropdown}
              handleViewDetails={handleViewDetails}
              handleEdit={handleEdit}
              handleCancelClick={handleCancelClick}
              isExpired={isExpired}
              duplicateRegNums={duplicateRegNums}
            />

            <FDATablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              pagination={pagination}
              colors={colors}
              loading={loading}
              handlePageChange={handlePageChange}
              setPageSize={setPageSize}
            />
          </div>
        </div>
        {/* end scrollable content */}
      </div>
      {/* end main content */}

      {/* Modals */}
      <FDAViewModal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        data={viewModal.data}
        darkMode={darkMode}
      />
      <FDAEditModal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, data: null })}
        data={editModal.data}
        onSave={handleSaveEdit}
        darkMode={darkMode}
        loading={loading}
      />
      <FDACancelConfirmModal
        isOpen={cancelModal.open}
        onClose={() =>
          setCancelModal({
            open: false,
            drugId: null,
            drugName: "",
            isCanceled: false,
          })
        }
        onConfirm={handleCancelConfirm}
        drugName={cancelModal.drugName}
        isCanceled={cancelModal.isCanceled}
        darkMode={darkMode}
        loading={loading}
      />
    </div>
  );
}

export default FDAVerificationPortalPage;
