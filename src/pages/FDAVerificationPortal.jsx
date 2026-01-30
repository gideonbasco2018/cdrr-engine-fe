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

// Import auth API
import { getCurrentUser as fetchCurrentUser } from "../api/auth";

// Import Components
import FDAViewModal from "../components/fda/FDAViewModal";
import FDAEditModal from "../components/fda/FDAEditModal";
import FDACancelConfirmModal from "../components/fda/FDACancelConfirmModal";
import FDADataTable from "../components/fda/FDADataTable";
import FDATablePagination from "../components/fda/FDATablePagination";
import FDAFilterBar from "../components/fda/FDAFilterBar";

// Import filter utilities
import {
  applyFilters,
  calculateStats,
  isExpired,
} from "../utils/FDAFilterHelpers";

function FDAVerificationPortal({ darkMode }) {
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

  // Fetch current user from backend API using auth.js helper
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        setUserLoading(true);

        console.log("=== 🔍 Fetching Current User from API ===");

        // Use the existing auth.js API helper (already handles token and headers)
        const userData = await fetchCurrentUser();

        console.log("✅ User data received:", userData);
        setCurrentUser(userData);
      } catch (error) {
        console.error("❌ Error fetching current user:", error);

        // If API fails (e.g., token expired), try localStorage as fallback
        const fallbackUsername = localStorage.getItem("username");
        if (fallbackUsername) {
          console.log(
            "⚠️ Using fallback username from localStorage:",
            fallbackUsername,
          );
          setCurrentUser({ username: fallbackUsername });
        } else {
          console.warn(
            "⚠️ No user found, redirecting to login might be needed",
          );
          setCurrentUser(null);
        }
      } finally {
        setUserLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

  // Debug log when user is loaded
  useEffect(() => {
    if (currentUser) {
      console.log("=== 🚀 FDA Portal Loaded ===");
      console.log("👤 Current User:", currentUser.username);
      console.log("📧 Email:", currentUser.email);
      console.log("👥 Group ID:", currentUser.group_id);
      console.log("🔑 Role:", currentUser.role);
      console.log("========================\n");
    }
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
      };

  const canEditDrug = (drug) => {
    if (!currentUser) return false;

    // Admin can edit any drug
    if (currentUser.role === "Admin" || currentUser.role === "admin") {
      return true;
    }

    // Regular users can only edit their own uploads
    return drug.uploaded_by === currentUser.username;
  };

  // Table columns
  const columns = [
    { key: "reference_number", label: "Reference Number", width: "180px" },
    { key: "generic_name", label: "Generic Name", width: "350px" },
    { key: "brand_name", label: "Brand Name", width: "150px" },
    { key: "dosage_strength", label: "Dosage Strength", width: "120px" },
    { key: "dosage_form", label: "Dosage Form", width: "120px" },
    { key: "classification", label: "Classification", width: "120px" },
    { key: "packaging", label: "Packaging", width: "200px" },
    {
      key: "pharmacologic_category",
      label: "Pharmacologic Category",
      width: "240px",
    },
    { key: "manufacturer", label: "Manufacturer", width: "200px" },
    { key: "country_of_origin", label: "Country of Origin", width: "120px" },
    { key: "trader", label: "Trader", width: "200px" },
    { key: "importer", label: "Importer", width: "200px" },
    { key: "distributor", label: "Distributor", width: "200px" },
    { key: "app_type", label: "Application Type", width: "160px" },
    { key: "issuance_date", label: "Issuance Date", width: "160px" },
    { key: "expiry_date", label: "Expiry Date", width: "120px" },
    { key: "uploaded_by", label: "Uploaded By", width: "150px" },
    { key: "date_uploaded", label: "Date Uploaded", width: "150px" },
  ];

  // Helper function to check if date is today
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

  // Helper function to check if date is yesterday
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

  // Helper function to check if date is this month
  const isThisMonth = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return (
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // ✅ Helper function to find duplicate registration numbers (excluding canceled records)
  const findDuplicateRegistrationNumbers = (data) => {
    const registrationGroups = {};

    // Group ALL records by registration number (including canceled)
    data.forEach((drug) => {
      if (drug.registration_number) {
        const regNum = drug.registration_number.trim();
        if (!registrationGroups[regNum]) {
          registrationGroups[regNum] = [];
        }
        registrationGroups[regNum].push(drug);
      }
    });

    // Find registration numbers that have duplicates
    // At least 2 non-canceled records with same reg number
    const duplicateRegNums = Object.keys(registrationGroups).filter(
      (regNum) => {
        const group = registrationGroups[regNum];
        const nonCanceledCount = group.filter(
          (drug) => drug.is_canceled !== "Y",
        ).length; // ✅ Changed
        return nonCanceledCount >= 2; // At least 2 non-canceled records
      },
    );

    console.log(
      `🔍 Found ${duplicateRegNums.length} duplicate registration numbers`,
    );
    return duplicateRegNums;
  };

  // Filter data using the utility function
  const getFilteredData = () => {
    if (!currentUser) return [];

    // Special handling for duplicates tab - don't use applyFilters
    if (activeTab === "duplicates") {
      // Start with ALL data (not filtered)
      let filtered = [...drugsData];

      // ✅ Filter for duplicate registration numbers (exclude canceled records)
      const duplicateRegNums = findDuplicateRegistrationNumbers(drugsData);
      console.log(
        `🔍 Found ${duplicateRegNums.length} duplicate registration numbers`,
      );
      console.log(`🔍 Duplicate reg nums:`, duplicateRegNums);

      filtered = filtered.filter((drug) => {
        const isDuplicate = duplicateRegNums.includes(
          drug.registration_number?.trim(),
        );
        const isCanceled = drug.is_canceled === "Y"; // ✅ Changed
        console.log(
          `Drug ${drug.registration_number}: isDuplicate=${isDuplicate}, isCanceled=${isCanceled}`,
        );
        return isDuplicate && !isCanceled; // ✅ Changed
      });

      // Sort by registration number to group duplicates together
      filtered.sort((a, b) => {
        const regA = (a.registration_number || "").trim().toLowerCase();
        const regB = (b.registration_number || "").trim().toLowerCase();
        return regA.localeCompare(regB);
      });

      console.log(
        `📋 Showing ${filtered.length} records with duplicate registration numbers`,
      );
      return filtered;
    }

    // For all other tabs, use normal filtering
    let filtered = applyFilters(drugsData, filters, activeTab);

    // ✅ Apply user filter for tabs EXCEPT "all", "expired", and "canceled"
    if (
      activeTab !== "all" &&
      activeTab !== "expired" &&
      activeTab !== "canceled" // ✅ Changed from "deleted"
    ) {
      console.log(`🔍 Filtering by user: ${currentUser.username}`);
      filtered = filtered.filter(
        (drug) => drug.uploaded_by === currentUser.username,
      );
      console.log(`📊 Filtered results: ${filtered.length} records`);
    } else if (activeTab === "expired" || activeTab === "canceled") {
      // ✅ Changed
      console.log(
        `📋 Showing ALL ${activeTab} products (not filtered by user)`,
      );
    }

    // Apply additional tab-specific filters
    if (activeTab === "today") {
      filtered = filtered.filter((drug) => isToday(drug.date_uploaded));
    } else if (activeTab === "yesterday") {
      filtered = filtered.filter((drug) => isYesterday(drug.date_uploaded));
    } else if (activeTab === "thismonth") {
      filtered = filtered.filter((drug) => isThisMonth(drug.date_uploaded));
    }

    return filtered;
  };

  // Fetch drugs
  const fetchDrugs = async () => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);
    try {
      const includeCanceled = activeTab === "canceled"; // ✅ Changed from includeDeleted

      const response = await getAllDrugs({
        page: currentPage,
        page_size: pageSize,
        search: searchTerm,
        include_canceled: includeCanceled, // ✅ Changed parameter name
      });

      setDrugsData(response.data || []);
      setPagination(response.pagination || {});

      // Calculate stats using the utility function
      const allData = response.data || [];
      const calculatedStats = calculateStats(allData);

      // Filter by current user for tab-specific stats
      const userFilteredData = allData.filter(
        (drug) => drug.uploaded_by === currentUser.username,
      );

      console.log(`📊 Stats calculation for user: ${currentUser.username}`);
      console.log(`  Total drugs: ${allData.length}`);
      console.log(`  User's drugs: ${userFilteredData.length}`);

      // Calculate today, yesterday, and this month counts for current user only
      const uploadedToday = userFilteredData.filter((drug) =>
        isToday(drug.date_uploaded),
      ).length;
      const uploadedYesterday = userFilteredData.filter((drug) =>
        isYesterday(drug.date_uploaded),
      ).length;
      const uploadedThisMonth = userFilteredData.filter((drug) =>
        isThisMonth(drug.date_uploaded),
      ).length;

      // Calculate active products (not expired and not canceled)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset to start of day

      const activeProducts = allData.filter((drug) => {
        if (drug.is_canceled === "Y") return false; // ✅ Exclude canceled
        if (!drug.expiry_date) return true; // If no expiry, consider active

        const expiryDate = new Date(drug.expiry_date);
        return expiryDate >= today; // Not expired yet
      }).length;

      // ✅ Calculate duplicate products count
      const duplicateRegNums = findDuplicateRegistrationNumbers(allData);
      const duplicateProducts = allData.filter((drug) => {
        const isDuplicate = duplicateRegNums.includes(
          drug.registration_number?.trim(),
        );
        const isNotCanceled = drug.is_canceled !== "Y"; // ✅ Changed
        return isDuplicate && isNotCanceled;
      }).length;

      setStats({
        totalProducts: response.pagination?.total || 0,
        activeProducts: activeProducts,
        manufacturers: calculatedStats.uniqueManufacturers,
        canceledProducts: calculatedStats.canceledCount, // ✅ Changed from deletedProducts
        expiredProducts: calculatedStats.expiredCount,
        uploadedToday,
        uploadedYesterday,
        uploadedThisMonth,
        duplicateProducts,
      });
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
  }, [currentPage, pageSize, searchTerm, activeTab, currentUser]);

  // Handle View Details
  const handleViewDetails = async (drugId) => {
    try {
      setLoading(true);
      const response = await getDrugById(drugId);
      setViewModal({ open: true, data: response.data });
    } catch (err) {
      console.error("Error fetching drug details:", err);
      alert(
        `❌ Failed to fetch details: ${err.response?.data?.detail || err.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle Edit
  const handleEdit = async (drugId) => {
    try {
      setLoading(true);
      const response = await getDrugById(drugId);
      setEditModal({ open: true, data: response.data });
    } catch (err) {
      console.error("Error fetching drug details:", err);
      alert(
        `❌ Failed to fetch details: ${err.response?.data?.detail || err.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle Save Edit
  const handleSaveEdit = async (formData) => {
    try {
      setLoading(true);

      const updateData = {
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
      };

      await updateDrug(editModal.data.id, updateData);

      alert("✅ Drug updated successfully!");
      setEditModal({ open: false, data: null });
      await fetchDrugs();
    } catch (err) {
      console.error("Error updating drug:", err);
      alert(
        `❌ Failed to update: ${err.response?.data?.detail || err.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Cancel/Restore Click
  const handleCancelClick = (drugId, drugName, isCanceled) => {
    setCancelModal({ open: true, drugId, drugName, isCanceled });
  };

  // ✅ Handle Cancel/Restore Confirm
  const handleCancelConfirm = async () => {
    try {
      setLoading(true);

      if (cancelModal.isCanceled) {
        // Restore the drug
        await restoreDrug(cancelModal.drugId);
        alert("✅ Drug registration restored successfully!");
      } else {
        // Cancel the drug
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
    } catch (err) {
      console.error("Error canceling/restoring drug:", err);
      alert(
        `❌ Failed to ${cancelModal.isCanceled ? "restore" : "cancel"}: ${err.response?.data?.detail || err.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // Download Template
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
      console.error("Error downloading template:", err);
      alert(
        `❌ Failed to download template: ${err.response?.data?.detail || err.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // ==================== UPLOAD FILE ====================
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
          `⚠️ Upload partially successful!\n\n` +
            `✅ Successful: ${response.successful}\n` +
            `❌ Failed: ${response.failed}\n` +
            `Uploaded by: ${currentUser.username}\n\n` +
            `Check the console for error details.`,
        );
        console.log("Upload errors:", response.errors);
      }

      await fetchDrugs();
    } catch (err) {
      console.error("❌ Upload Error:", err);
      alert(
        `❌ Failed to upload file: ${err.response?.data?.detail || err.message}`,
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  // Pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (pagination.total_pages || 1)) {
      setCurrentPage(newPage);
    }
  };

  // Export to Excel
  const handleExportToExcel = async () => {
    try {
      setLoading(true);

      const blob = await exportDrugsToExcel({
        search: searchTerm,
        include_canceled: activeTab === "canceled", // ✅ Changed from include_deleted
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
      console.error("❌ Error exporting data:", err);
      alert(
        `❌ Failed to export: ${err.response?.data?.detail || err.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // Toggle dropdown
  const toggleDropdown = (drugId) => {
    setOpenDropdown(openDropdown === drugId ? null : drugId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openDropdown) setOpenDropdown(null);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openDropdown]);

  const filteredData = getFilteredData();

  // Get list of duplicate registration numbers for highlighting
  const duplicateRegNums =
    activeTab === "duplicates"
      ? findDuplicateRegistrationNumbers(drugsData)
      : [];

  // Show loading state while fetching user
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
      {/* Loading Overlay */}
      {loading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
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

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header */}
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
            }}
          >
            FDA Verification Portal
          </h1>
          <p style={{ color: colors.textTertiary, fontSize: "0.9rem" }}>
            Verify and manage FDA registered pharmaceutical products
          </p>
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={handleExportToExcel}
            disabled={loading || filteredData.length === 0}
            style={{
              padding: "0.75rem 1.5rem",
              background: "transparent",
              border: `2px solid ${colors.cardBorder}`,
              borderRadius: "8px",
              color: colors.textPrimary,
              fontSize: "0.9rem",
              fontWeight: "600",
              cursor:
                loading || filteredData.length === 0
                  ? "not-allowed"
                  : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.3s ease",
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
              padding: "0.75rem 1.5rem",
              background: "transparent",
              border: `2px solid ${colors.cardBorder}`,
              borderRadius: "8px",
              color: colors.textPrimary,
              fontSize: "0.9rem",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.3s ease",
              opacity: loading ? 0.5 : 1,
            }}
          >
            <span>📥</span>
            <span>Download Template</span>
          </button>

          <label
            style={{
              padding: "0.75rem 1.5rem",
              background: loading
                ? "#999"
                : "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "0.9rem",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.3s ease",
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
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
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
              fontSize: "1.2rem",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Stats Cards */}
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
            icon: "📅",
            label: "My Uploads Today",
            value: stats.uploadedToday,
            color: "#2196F3",
          },
          {
            icon: "📆",
            label: "My Uploads Yesterday",
            value: stats.uploadedYesterday,
            color: "#9C27B0",
          },
          {
            icon: "📊",
            label: "My Uploads This Month",
            value: stats.uploadedThisMonth,
            color: "#00BCD4",
          },
          {
            icon: "🔄",
            label: "Duplicate Records",
            value: stats.duplicateProducts,
            color: "#E91E63",
          },
          {
            icon: "🚫", // ✅ Changed icon
            label: "Canceled", // ✅ Changed label
            value: stats.canceledProducts, // ✅ Changed value
            color: "#f44336",
          },
        ].map((stat, index) => (
          <div
            key={index}
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "12px",
              padding: "1.5rem",
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
                  }}
                >
                  {stat.label}
                </p>
                <p
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: "700",
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

      {/* Search Bar */}
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          padding: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search (Registration Number, Generic Name, Brand Name, etc...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem 1rem 0.75rem 2.5rem",
              background: colors.inputBg,
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: "8px",
              color: colors.textPrimary,
              fontSize: "0.9rem",
              outline: "none",
            }}
          />
          <span
            style={{
              position: "absolute",
              left: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: colors.textTertiary,
            }}
          >
            🔍
          </span>
        </div>
      </div>

      {/* Advanced Filters - Using the new component */}
      <FDAFilterBar filters={filters} setFilters={setFilters} colors={colors} />

      {/* Tabs */}
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          overflow: "hidden",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            borderBottom: `2px solid ${colors.tableBorder}`,
          }}
        >
          {[
            {
              key: "all",
              icon: "📋",
              label: "All Manual",
              count: stats.totalProducts - stats.canceledProducts, // ✅ Changed
              color: colors.tabActive,
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
              key: "canceled", // ✅ Changed from "deleted"
              icon: "🚫", // ✅ Changed icon
              label: "Canceled", // ✅ Changed label
              count: stats.canceledProducts, // ✅ Changed count
              color: "#f44336",
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: "1rem 1.5rem",
                background: activeTab === tab.key ? tab.color : "transparent",
                border: "none",
                borderBottom:
                  activeTab === tab.key
                    ? `3px solid ${tab.color}`
                    : "3px solid transparent",
                color: activeTab === tab.key ? "#fff" : colors.textSecondary,
                fontSize: "0.95rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                style={{
                  background:
                    activeTab === tab.key
                      ? "rgba(255,255,255,0.2)"
                      : colors.inputBg,
                  padding: "0.25rem 0.5rem",
                  borderRadius: "12px",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

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
            padding: "1rem 1.5rem",
            borderBottom: `1px solid ${colors.tableBorder}`,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: "600",
              color: colors.textPrimary,
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
                        : "All Canceled Products"}{" "}
            {/* ✅ Changed label */}
          </h3>
          <span style={{ fontSize: "0.85rem", color: colors.textSecondary }}>
            Showing {filteredData.length} record
            {filteredData.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Use the FDADataTable component */}
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
          handleCancelClick={handleCancelClick} // ✅ Changed from handleDeleteClick
          isExpired={isExpired}
          duplicateRegNums={duplicateRegNums}
        />

        {/* Use the FDATablePagination component */}
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
        isCanceled={cancelModal.isCanceled} // ✅ NEW: Pass isCanceled flag
        darkMode={darkMode}
        loading={loading}
      />
    </div>
  );
}

export default FDAVerificationPortal;
