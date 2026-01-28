import { useState, useEffect } from "react";
import {
  downloadTemplate,
  uploadExcelFile,
  getAllDrugs,
  getDrugById,
  deleteDrug,
  updateDrug,
  exportDrugsToExcel,
} from "../api/fdaverifportal";

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
    deletedProducts: 0,
    expiredProducts: 0,
  });
  const [openDropdown, setOpenDropdown] = useState(null);

  // ✨ Tab state
  const [activeTab, setActiveTab] = useState("all"); // "all", "deleted", "expired"

  // ✨ Modal states
  const [viewModal, setViewModal] = useState({ open: false, data: null });
  const [editModal, setEditModal] = useState({
    open: false,
    data: null,
    formData: {},
  });

  // ✨ NEW: Filter states
  const [filters, setFilters] = useState({
    uploadedBy: "",
    dateUploadFrom: "",
    dateUploadTo: "",
  });

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
        tabInactive: "#2a2a2a",
        modalOverlay: "rgba(0, 0, 0, 0.8)",
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
        tabInactive: "#e5e5e5",
        modalOverlay: "rgba(0, 0, 0, 0.5)",
      };

  // ✨ Updated columns with uploaded_by and date_uploaded
  const columns = [
    { key: "generic_name", label: "Generic Name", width: "180px" },
    { key: "brand_name", label: "Brand Name", width: "150px" },
    { key: "dosage_strength", label: "Dosage Strength", width: "120px" },
    { key: "dosage_form", label: "Dosage Form", width: "120px" },
    { key: "classification", label: "Classification", width: "120px" },
    { key: "manufacturer", label: "Manufacturer", width: "200px" },
    { key: "country", label: "Country", width: "120px" },
    { key: "expiry_date", label: "Expiry Date", width: "120px" },
    { key: "uploaded_by", label: "Uploaded By", width: "150px" },
    { key: "date_uploaded", label: "Date Uploaded", width: "150px" },
  ];

  // Helper function to check if drug is expired
  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    return expiry < today;
  };

  // ✨ Filter data based on active tab and filters
  const getFilteredData = () => {
    let filtered = drugsData;

    // Tab filtering
    if (activeTab === "deleted") {
      filtered = filtered.filter((drug) => drug.date_deleted);
    } else if (activeTab === "expired") {
      filtered = filtered.filter(
        (drug) => !drug.date_deleted && isExpired(drug.expiry_date),
      );
    } else {
      // All - show only non-deleted
      filtered = filtered.filter((drug) => !drug.date_deleted);
    }

    // Uploaded By filter
    if (filters.uploadedBy) {
      filtered = filtered.filter((drug) =>
        drug.uploaded_by
          ?.toLowerCase()
          .includes(filters.uploadedBy.toLowerCase()),
      );
    }

    // Date Upload From filter
    if (filters.dateUploadFrom) {
      filtered = filtered.filter((drug) => {
        if (!drug.date_uploaded) return false;
        return new Date(drug.date_uploaded) >= new Date(filters.dateUploadFrom);
      });
    }

    // Date Upload To filter
    if (filters.dateUploadTo) {
      filtered = filtered.filter((drug) => {
        if (!drug.date_uploaded) return false;
        return new Date(drug.date_uploaded) <= new Date(filters.dateUploadTo);
      });
    }

    return filtered;
  };

  // Fetch drugs data from API
  const fetchDrugs = async () => {
    setLoading(true);
    setError(null);
    try {
      const includeDeleted = activeTab === "deleted";

      const response = await getAllDrugs({
        page: currentPage,
        page_size: pageSize,
        search: searchTerm,
        include_deleted: includeDeleted,
      });

      setDrugsData(response.data || []);
      setPagination(response.pagination || {});

      // Update stats
      const allData = response.data || [];
      const uniqueManufacturers = new Set(
        allData
          .map((item) => item.manufacturer)
          .filter((m) => m && m !== "N/A"),
      ).size;

      const deletedCount = allData.filter((drug) => drug.date_deleted).length;
      const expiredCount = allData.filter(
        (drug) => !drug.date_deleted && isExpired(drug.expiry_date),
      ).length;
      const activeCount = allData.filter(
        (drug) => !drug.date_deleted && !isExpired(drug.expiry_date),
      ).length;

      setStats({
        totalProducts: response.pagination?.total || 0,
        activeProducts: activeCount,
        manufacturers: uniqueManufacturers,
        deletedProducts: deletedCount,
        expiredProducts: expiredCount,
      });
    } catch (err) {
      console.error("Error fetching drugs:", err);
      setError(err.response?.data?.detail || "Failed to fetch drug data");
      setDrugsData([]);
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 when changing tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Fetch data on component mount and when dependencies change
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      fetchDrugs();
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [currentPage, pageSize, searchTerm, activeTab]);

  // ✨ Handle View Details
  const handleViewDetails = async (drugId) => {
    try {
      setLoading(true);
      const response = await getDrugById(drugId);
      setViewModal({ open: true, data: response.data });
      setOpenDropdown(null);
    } catch (err) {
      console.error("Error fetching drug details:", err);
      alert(
        `❌ Failed to fetch details: ${err.response?.data?.detail || err.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // ✨ Handle Edit
  const handleEdit = async (drugId) => {
    try {
      setLoading(true);
      const response = await getDrugById(drugId);
      setEditModal({
        open: true,
        data: response.data,
        formData: { ...response.data },
      });
      setOpenDropdown(null);
    } catch (err) {
      console.error("Error fetching drug details:", err);
      alert(
        `❌ Failed to fetch details: ${err.response?.data?.detail || err.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // ✨ Handle Edit Form Change
  const handleEditFormChange = (field, value) => {
    setEditModal((prev) => ({
      ...prev,
      formData: {
        ...prev.formData,
        [field]: value,
      },
    }));
  };

  // ✨ Handle Save Edit
  const handleSaveEdit = async () => {
    try {
      setLoading(true);

      const updateData = {
        registration_number: editModal.formData.registration_number,
        generic_name: editModal.formData.generic_name,
        brand_name: editModal.formData.brand_name,
        dosage_strength: editModal.formData.dosage_strength,
        dosage_form: editModal.formData.dosage_form,
        classification: editModal.formData.classification,
        packaging: editModal.formData.packaging,
        pharmacologic_category: editModal.formData.pharmacologic_category,
        manufacturer: editModal.formData.manufacturer,
        country: editModal.formData.country,
        trader: editModal.formData.trader,
        importer: editModal.formData.importer,
        distributor: editModal.formData.distributor,
        app_type: editModal.formData.app_type,
        issuance_date: editModal.formData.issuance_date,
        expiry_date: editModal.formData.expiry_date,
      };

      await updateDrug(editModal.data.id, updateData);

      alert("✅ Drug updated successfully!");
      setEditModal({ open: false, data: null, formData: {} });
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

  // ✨ Clear Filters
  const handleClearFilters = () => {
    setFilters({
      uploadedBy: "",
      dateUploadFrom: "",
      dateUploadTo: "",
    });
  };

  // Handle download template
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

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      alert("❌ Please upload an Excel file (.xlsx or .xls)");
      event.target.value = "";
      return;
    }

    try {
      setLoading(true);

      const currentUser =
        localStorage.getItem("username") ||
        localStorage.getItem("user") ||
        "admin";

      const response = await uploadExcelFile(file, currentUser);

      if (response.status === "success") {
        alert(
          `✅ Upload successful!\n\n${response.successful} records inserted successfully.`,
        );
      } else if (response.status === "partial_success") {
        alert(
          `⚠️ Upload partially successful!\n\n` +
            `✅ Successful: ${response.successful}\n` +
            `❌ Failed: ${response.failed}\n\n` +
            `Check the console for error details.`,
        );
        console.log("Upload errors:", response.errors);
      }

      await fetchDrugs();
    } catch (err) {
      console.error("Error uploading file:", err);
      alert(
        `❌ Failed to upload file: ${err.response?.data?.detail || err.message}`,
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  // Handle delete
  const handleDelete = async (drugId, drugName) => {
    if (!window.confirm(`Are you sure you want to delete "${drugName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteDrug(drugId);
      alert("✅ Drug registration deleted successfully!");
      await fetchDrugs();
    } catch (err) {
      console.error("Error deleting drug:", err);
      alert(
        `❌ Failed to delete: ${err.response?.data?.detail || err.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (pagination.total_pages || 1)) {
      setCurrentPage(newPage);
    }
  };

  // Handle export to Excel
  const handleExportToExcel = async () => {
    try {
      setLoading(true);

      const blob = await exportDrugsToExcel({
        search: searchTerm,
        include_deleted: activeTab === "deleted",
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

  // Toggle dropdown menu
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

  // Get filtered data for display
  const filteredData = getFilteredData();

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

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
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
          <p
            style={{
              color: colors.textTertiary,
              fontSize: "0.9rem",
            }}
          >
            Verify and manage FDA registered pharmaceutical products
          </p>
        </div>

        {/* Upload & Download Buttons */}
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
            onMouseEnter={(e) => {
              if (!loading && filteredData.length > 0) {
                e.currentTarget.style.borderColor = "#2196F3";
                e.currentTarget.style.color = "#2196F3";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.cardBorder;
              e.currentTarget.style.color = colors.textPrimary;
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
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = "#4CAF50";
                e.currentTarget.style.color = "#4CAF50";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.cardBorder;
              e.currentTarget.style.color = colors.textPrimary;
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
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 16px rgba(76, 175, 80, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 12px rgba(76, 175, 80, 0.3)";
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
        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <span style={{ fontSize: "2rem" }}>📋</span>
            <div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: colors.textTertiary,
                  marginBottom: "0.25rem",
                }}
              >
                Total Products
              </p>
              <p
                style={{
                  fontSize: "1.75rem",
                  fontWeight: "700",
                  color: colors.textPrimary,
                }}
              >
                {stats.totalProducts}
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <span style={{ fontSize: "2rem" }}>✅</span>
            <div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: colors.textTertiary,
                  marginBottom: "0.25rem",
                }}
              >
                Active Products
              </p>
              <p
                style={{
                  fontSize: "1.75rem",
                  fontWeight: "700",
                  color: "#4CAF50",
                }}
              >
                {stats.activeProducts}
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <span style={{ fontSize: "2rem" }}>⏰</span>
            <div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: colors.textTertiary,
                  marginBottom: "0.25rem",
                }}
              >
                Expired
              </p>
              <p
                style={{
                  fontSize: "1.75rem",
                  fontWeight: "700",
                  color: "#FF9800",
                }}
              >
                {stats.expiredProducts}
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <span style={{ fontSize: "2rem" }}>🗑️</span>
            <div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: colors.textTertiary,
                  marginBottom: "0.25rem",
                }}
              >
                Deleted
              </p>
              <p
                style={{
                  fontSize: "1.75rem",
                  fontWeight: "700",
                  color: "#f44336",
                }}
              >
                {stats.deletedProducts}
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <span style={{ fontSize: "2rem" }}>🏭</span>
            <div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: colors.textTertiary,
                  marginBottom: "0.25rem",
                }}
              >
                Manufacturers
              </p>
              <p
                style={{
                  fontSize: "1.75rem",
                  fontWeight: "700",
                  color: colors.textPrimary,
                }}
              >
                {stats.manufacturers}
              </p>
            </div>
          </div>
        </div>
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
              transition: "all 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
            onBlur={(e) => (e.target.style.borderColor = colors.inputBorder)}
          />
          <span
            style={{
              position: "absolute",
              left: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: colors.textTertiary,
              fontSize: "1rem",
            }}
          >
            🔍
          </span>
        </div>
      </div>

      {/* ✨ NEW: Advanced Filters */}
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          padding: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <h3
            style={{
              fontSize: "0.95rem",
              fontWeight: "600",
              color: colors.textPrimary,
            }}
          >
            🔍 Advanced Filters
          </h3>
          {(filters.uploadedBy ||
            filters.dateUploadFrom ||
            filters.dateUploadTo) && (
            <button
              onClick={handleClearFilters}
              style={{
                padding: "0.5rem 1rem",
                background: "transparent",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: "6px",
                color: colors.textSecondary,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#f44336";
                e.currentTarget.style.color = "#f44336";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.cardBorder;
                e.currentTarget.style.color = colors.textSecondary;
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1rem",
          }}
        >
          {/* Uploaded By Filter */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: "500",
                color: colors.textSecondary,
                marginBottom: "0.5rem",
              }}
            >
              Uploaded By
            </label>
            <input
              type="text"
              placeholder="Filter by uploader name"
              value={filters.uploadedBy}
              onChange={(e) =>
                setFilters({ ...filters, uploadedBy: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.75rem",
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "6px",
                color: colors.textPrimary,
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>

          {/* Date Upload From Filter */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: "500",
                color: colors.textSecondary,
                marginBottom: "0.5rem",
              }}
            >
              Date Upload From
            </label>
            <input
              type="date"
              value={filters.dateUploadFrom}
              onChange={(e) =>
                setFilters({ ...filters, dateUploadFrom: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.75rem",
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "6px",
                color: colors.textPrimary,
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>

          {/* Date Upload To Filter */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: "500",
                color: colors.textSecondary,
                marginBottom: "0.5rem",
              }}
            >
              Date Upload To
            </label>
            <input
              type="date"
              value={filters.dateUploadTo}
              onChange={(e) =>
                setFilters({ ...filters, dateUploadTo: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.75rem",
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "6px",
                color: colors.textPrimary,
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* Tabs Section */}
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
          {/* All Tab */}
          <button
            onClick={() => setActiveTab("all")}
            style={{
              flex: 1,
              padding: "1rem 1.5rem",
              background:
                activeTab === "all" ? colors.tabActive : "transparent",
              border: "none",
              borderBottom:
                activeTab === "all"
                  ? `3px solid ${colors.tabActive}`
                  : "3px solid transparent",
              color: activeTab === "all" ? "#fff" : colors.textSecondary,
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
            <span>📋</span>
            <span>All Products</span>
            <span
              style={{
                background:
                  activeTab === "all"
                    ? "rgba(255,255,255,0.2)"
                    : colors.inputBg,
                padding: "0.25rem 0.5rem",
                borderRadius: "12px",
                fontSize: "0.75rem",
                fontWeight: "700",
              }}
            >
              {stats.totalProducts - stats.deletedProducts}
            </span>
          </button>

          {/* Expired Tab */}
          <button
            onClick={() => setActiveTab("expired")}
            style={{
              flex: 1,
              padding: "1rem 1.5rem",
              background: activeTab === "expired" ? "#FF9800" : "transparent",
              border: "none",
              borderBottom:
                activeTab === "expired"
                  ? "3px solid #FF9800"
                  : "3px solid transparent",
              color: activeTab === "expired" ? "#fff" : colors.textSecondary,
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
            <span>⏰</span>
            <span>Expired</span>
            <span
              style={{
                background:
                  activeTab === "expired"
                    ? "rgba(255,255,255,0.2)"
                    : colors.inputBg,
                padding: "0.25rem 0.5rem",
                borderRadius: "12px",
                fontSize: "0.75rem",
                fontWeight: "700",
              }}
            >
              {stats.expiredProducts}
            </span>
          </button>

          {/* Deleted Tab */}
          <button
            onClick={() => setActiveTab("deleted")}
            style={{
              flex: 1,
              padding: "1rem 1.5rem",
              background: activeTab === "deleted" ? "#f44336" : "transparent",
              border: "none",
              borderBottom:
                activeTab === "deleted"
                  ? "3px solid #f44336"
                  : "3px solid transparent",
              color: activeTab === "deleted" ? "#fff" : colors.textSecondary,
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
            <span>🗑️</span>
            <span>Deleted</span>
            <span
              style={{
                background:
                  activeTab === "deleted"
                    ? "rgba(255,255,255,0.2)"
                    : colors.inputBg,
                padding: "0.25rem 0.5rem",
                borderRadius: "12px",
                fontSize: "0.75rem",
                fontWeight: "700",
              }}
            >
              {stats.deletedProducts}
            </span>
          </button>
        </div>
      </div>

      {/* Data Table with Frozen Columns */}
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
            alignItems: "center",
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
              ? "All Products"
              : activeTab === "expired"
                ? "Expired Products"
                : "Deleted Products"}
          </h3>
          <span style={{ fontSize: "0.85rem", color: colors.textSecondary }}>
            Showing {filteredData.length} record
            {filteredData.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div
          style={{ position: "relative", overflow: "auto", maxHeight: "600px" }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              minWidth: "2900px",
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                background: colors.tableBg,
                zIndex: 20,
              }}
            >
              <tr>
                {/* ✨ FROZEN: # Column */}
                <th
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 21,
                    padding: "1rem",
                    textAlign: "center",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    background: colors.tableBg,
                    width: "60px",
                    boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
                  }}
                >
                  #
                </th>

                {/* ✨ FROZEN: Registration Number Column */}
                <th
                  style={{
                    position: "sticky",
                    left: "60px",
                    zIndex: 21,
                    padding: "1rem",
                    textAlign: "left",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    background: colors.tableBg,
                    minWidth: "170px",
                    boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
                  }}
                >
                  Registration Number
                </th>

                {/* Regular Columns */}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: `1px solid ${colors.tableBorder}`,
                      background: colors.tableBg,
                      minWidth: col.width,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col.label}
                  </th>
                ))}

                {/* ✨ FROZEN: Actions Column */}
                <th
                  style={{
                    position: "sticky",
                    right: 0,
                    zIndex: 21,
                    padding: "1rem",
                    textAlign: "center",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    background: colors.tableBg,
                    width: "100px",
                    boxShadow: "-2px 0 5px rgba(0,0,0,0.1)",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 3}
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: colors.textTertiary,
                    }}
                  >
                    {loading ? "Loading..." : "No data found"}
                  </td>
                </tr>
              ) : (
                filteredData.map((row, index) => {
                  const rowBg =
                    index % 2 === 0 ? colors.tableRowEven : colors.tableRowOdd;

                  return (
                    <tr
                      key={row.id}
                      style={{
                        background: rowBg,
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.tableRowHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = rowBg;
                      }}
                    >
                      {/* ✨ FROZEN: # Column */}
                      <td
                        style={{
                          position: "sticky",
                          left: 0,
                          zIndex: 10,
                          padding: "1rem",
                          fontSize: "0.85rem",
                          fontWeight: "700",
                          color: colors.textTertiary,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          textAlign: "center",
                          background: rowBg,
                          boxShadow: "2px 0 5px rgba(0,0,0,0.05)",
                        }}
                      >
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>

                      {/* ✨ FROZEN: Registration Number Column */}
                      <td
                        style={{
                          position: "sticky",
                          left: "60px",
                          zIndex: 10,
                          padding: "1rem",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          color: colors.textPrimary,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          background: rowBg,
                          boxShadow: "2px 0 5px rgba(0,0,0,0.05)",
                        }}
                      >
                        {row.registration_number || "N/A"}
                      </td>

                      {/* Regular Columns */}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          style={{
                            padding: "1rem",
                            fontSize: "0.85rem",
                            color: colors.tableText,
                            borderBottom: `1px solid ${colors.tableBorder}`,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                          }}
                        >
                          {col.key === "expiry_date" && row[col.key] ? (
                            <span
                              style={{
                                padding: "0.25rem 0.5rem",
                                borderRadius: "4px",
                                fontSize: "0.8rem",
                                fontWeight: "600",
                                background: isExpired(row[col.key])
                                  ? "rgba(244, 67, 54, 0.1)"
                                  : "rgba(76, 175, 80, 0.1)",
                                color: isExpired(row[col.key])
                                  ? "#f44336"
                                  : "#4CAF50",
                              }}
                            >
                              {row[col.key]}
                              {isExpired(row[col.key]) && " ⚠️"}
                            </span>
                          ) : col.key === "date_uploaded" && row[col.key] ? (
                            new Date(row[col.key]).toLocaleString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          ) : (
                            row[col.key] || "N/A"
                          )}
                        </td>
                      ))}

                      {/* ✨ FROZEN: Actions Column */}
                      <td
                        style={{
                          position: "sticky",
                          right: 0,
                          zIndex: 10,
                          padding: "1rem",
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          textAlign: "center",
                          background: rowBg,
                          boxShadow: "-2px 0 5px rgba(0,0,0,0.05)",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            display: "inline-block",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => toggleDropdown(row.id)}
                            disabled={loading}
                            style={{
                              padding: "0.5rem",
                              background: "transparent",
                              border: "none",
                              cursor: loading ? "not-allowed" : "pointer",
                              fontSize: "1.2rem",
                              color: colors.textPrimary,
                              opacity: loading ? 0.5 : 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            ⋮
                          </button>

                          {/* Dropdown Menu */}
                          {openDropdown === row.id && (
                            <div
                              style={{
                                position: "absolute",
                                right: 0,
                                top: "100%",
                                marginTop: "0.25rem",
                                background: colors.cardBg,
                                border: `1px solid ${colors.cardBorder}`,
                                borderRadius: "8px",
                                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                                zIndex: 1000,
                                minWidth: "150px",
                                overflow: "hidden",
                                animation: "fadeIn 0.2s ease",
                              }}
                            >
                              <button
                                onClick={() => handleViewDetails(row.id)}
                                style={{
                                  width: "100%",
                                  padding: "0.75rem 1rem",
                                  background: "transparent",
                                  border: "none",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  color: colors.textPrimary,
                                  fontSize: "0.85rem",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  transition: "background 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background =
                                    colors.tableRowHover;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background =
                                    "transparent";
                                }}
                              >
                                <span>👁️</span>
                                <span>View Details</span>
                              </button>

                              {activeTab !== "deleted" && (
                                <>
                                  <button
                                    onClick={() => handleEdit(row.id)}
                                    style={{
                                      width: "100%",
                                      padding: "0.75rem 1rem",
                                      background: "transparent",
                                      border: "none",
                                      textAlign: "left",
                                      cursor: "pointer",
                                      color: colors.textPrimary,
                                      fontSize: "0.85rem",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                      transition: "background 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background =
                                        colors.tableRowHover;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background =
                                        "transparent";
                                    }}
                                  >
                                    <span>✏️</span>
                                    <span>Edit</span>
                                  </button>

                                  <div
                                    style={{
                                      height: "1px",
                                      background: colors.tableBorder,
                                      margin: "0.25rem 0",
                                    }}
                                  />

                                  <button
                                    onClick={() => {
                                      setOpenDropdown(null);
                                      handleDelete(
                                        row.id,
                                        row.brand_name || row.generic_name,
                                      );
                                    }}
                                    style={{
                                      width: "100%",
                                      padding: "0.75rem 1rem",
                                      background: "transparent",
                                      border: "none",
                                      textAlign: "left",
                                      cursor: "pointer",
                                      color: "#ff4444",
                                      fontSize: "0.85rem",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                      transition: "background 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background =
                                        "rgba(255, 68, 68, 0.1)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background =
                                        "transparent";
                                    }}
                                  >
                                    <span>🗑️</span>
                                    <span>Delete</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: `1px solid ${colors.tableBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              color: colors.textTertiary,
              fontSize: "0.85rem",
            }}
          >
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, pagination.total || 0)} of{" "}
            {pagination.total || 0} records
          </div>

          {/* Pagination Controls */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.has_prev || loading}
              style={{
                padding: "0.5rem 1rem",
                background:
                  pagination.has_prev && !loading
                    ? colors.cardBg
                    : colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "6px",
                color: colors.textPrimary,
                cursor:
                  pagination.has_prev && !loading ? "pointer" : "not-allowed",
                opacity: pagination.has_prev && !loading ? 1 : 0.5,
              }}
            >
              ← Previous
            </button>

            <span style={{ color: colors.textPrimary, fontSize: "0.9rem" }}>
              Page {currentPage} of {pagination.total_pages || 1}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.has_next || loading}
              style={{
                padding: "0.5rem 1rem",
                background:
                  pagination.has_next && !loading
                    ? colors.cardBg
                    : colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "6px",
                color: colors.textPrimary,
                cursor:
                  pagination.has_next && !loading ? "pointer" : "not-allowed",
                opacity: pagination.has_next && !loading ? 1 : 0.5,
              }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* ✨ VIEW DETAILS MODAL */}
      {viewModal.open && viewModal.data && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: colors.modalOverlay,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "2rem",
          }}
          onClick={() => setViewModal({ open: false, data: null })}
        >
          <div
            style={{
              background: colors.cardBg,
              borderRadius: "12px",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.5rem",
                borderBottom: `1px solid ${colors.tableBorder}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "sticky",
                top: 0,
                background: colors.cardBg,
                zIndex: 10,
              }}
            >
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  color: colors.textPrimary,
                }}
              >
                Drug Registration Details
              </h2>
              <button
                onClick={() => setViewModal({ open: false, data: null })}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.5rem",
                  color: colors.textTertiary,
                  cursor: "pointer",
                  padding: "0.5rem",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.5rem" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1.5rem",
                }}
              >
                {/* Registration Number */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Registration Number
                  </label>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: colors.textPrimary,
                      fontWeight: "600",
                    }}
                  >
                    {viewModal.data.registration_number || "N/A"}
                  </p>
                </div>

                {/* Generic Name */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Generic Name
                  </label>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {viewModal.data.generic_name || "N/A"}
                  </p>
                </div>

                {/* Brand Name */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Brand Name
                  </label>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {viewModal.data.brand_name || "N/A"}
                  </p>
                </div>

                {/* Dosage Strength */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Dosage Strength
                  </label>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {viewModal.data.dosage_strength || "N/A"}
                  </p>
                </div>

                {/* Dosage Form */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Dosage Form
                  </label>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {viewModal.data.dosage_form || "N/A"}
                  </p>
                </div>

                {/* Classification */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Classification
                  </label>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {viewModal.data.classification || "N/A"}
                  </p>
                </div>

                {/* Packaging */}
                <div style={{ gridColumn: "span 2" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Packaging
                  </label>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {viewModal.data.packaging || "N/A"}
                  </p>
                </div>

                {/* Pharmacologic Category */}
                <div style={{ gridColumn: "span 2" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Pharmacologic Category
                  </label>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {viewModal.data.pharmacologic_category || "N/A"}
                  </p>
                </div>

                {/* Manufacturer */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Manufacturer
                  </label>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {viewModal.data.manufacturer || "N/A"}
                  </p>
                </div>

                {/* Country */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Country
                  </label>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {viewModal.data.country || "N/A"}
                  </p>
                </div>

                {/* Trader */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Trader
                  </label>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {viewModal.data.trader || "N/A"}
                  </p>
                </div>

                {/* Importer */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Importer
                  </label>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {viewModal.data.importer || "N/A"}
                  </p>
                </div>

                {/* Distributor */}
                <div style={{ gridColumn: "span 2" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Distributor
                  </label>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {viewModal.data.distributor || "N/A"}
                  </p>
                </div>

                {/* App Type */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Application Type
                  </label>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {viewModal.data.app_type || "N/A"}
                  </p>
                </div>

                {/* Issuance Date */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Issuance Date
                  </label>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {viewModal.data.issuance_date || "N/A"}
                  </p>
                </div>

                {/* Expiry Date */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Expiry Date
                  </label>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: isExpired(viewModal.data.expiry_date)
                        ? "#f44336"
                        : "#4CAF50",
                      fontWeight: "600",
                    }}
                  >
                    {viewModal.data.expiry_date || "N/A"}
                    {isExpired(viewModal.data.expiry_date) && " ⚠️ EXPIRED"}
                  </p>
                </div>

                {/* Uploaded By */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Uploaded By
                  </label>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {viewModal.data.uploaded_by || "N/A"}
                  </p>
                </div>

                {/* Date Uploaded */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Date Uploaded
                  </label>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {viewModal.data.date_uploaded
                      ? new Date(viewModal.data.date_uploaded).toLocaleString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "1.5rem",
                borderTop: `1px solid ${colors.tableBorder}`,
                display: "flex",
                justifyContent: "flex-end",
                gap: "1rem",
                position: "sticky",
                bottom: 0,
                background: colors.cardBg,
              }}
            >
              <button
                onClick={() => setViewModal({ open: false, data: null })}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✨ EDIT MODAL */}
      {editModal.open && editModal.data && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: colors.modalOverlay,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "2rem",
          }}
          onClick={() =>
            setEditModal({ open: false, data: null, formData: {} })
          }
        >
          <div
            style={{
              background: colors.cardBg,
              borderRadius: "12px",
              maxWidth: "900px",
              width: "100%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.5rem",
                borderBottom: `1px solid ${colors.tableBorder}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "sticky",
                top: 0,
                background: colors.cardBg,
                zIndex: 10,
              }}
            >
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  color: colors.textPrimary,
                }}
              >
                Edit Drug Registration
              </h2>
              <button
                onClick={() =>
                  setEditModal({ open: false, data: null, formData: {} })
                }
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.5rem",
                  color: colors.textTertiary,
                  cursor: "pointer",
                  padding: "0.5rem",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.5rem" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1.5rem",
                }}
              >
                {/* Registration Number */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    value={editModal.formData.registration_number || ""}
                    onChange={(e) =>
                      handleEditFormChange(
                        "registration_number",
                        e.target.value,
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "6px",
                      color: colors.textPrimary,
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Generic Name */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Generic Name
                  </label>
                  <input
                    type="text"
                    value={editModal.formData.generic_name || ""}
                    onChange={(e) =>
                      handleEditFormChange("generic_name", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "6px",
                      color: colors.textPrimary,
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Brand Name */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={editModal.formData.brand_name || ""}
                    onChange={(e) =>
                      handleEditFormChange("brand_name", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "6px",
                      color: colors.textPrimary,
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Dosage Strength */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Dosage Strength
                  </label>
                  <input
                    type="text"
                    value={editModal.formData.dosage_strength || ""}
                    onChange={(e) =>
                      handleEditFormChange("dosage_strength", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "6px",
                      color: colors.textPrimary,
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Dosage Form */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Dosage Form
                  </label>
                  <input
                    type="text"
                    value={editModal.formData.dosage_form || ""}
                    onChange={(e) =>
                      handleEditFormChange("dosage_form", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "6px",
                      color: colors.textPrimary,
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Classification */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Classification
                  </label>
                  <input
                    type="text"
                    value={editModal.formData.classification || ""}
                    onChange={(e) =>
                      handleEditFormChange("classification", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "6px",
                      color: colors.textPrimary,
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Packaging */}
                <div style={{ gridColumn: "span 2" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Packaging
                  </label>
                  <input
                    type="text"
                    value={editModal.formData.packaging || ""}
                    onChange={(e) =>
                      handleEditFormChange("packaging", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "6px",
                      color: colors.textPrimary,
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Pharmacologic Category */}
                <div style={{ gridColumn: "span 2" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Pharmacologic Category
                  </label>
                  <input
                    type="text"
                    value={editModal.formData.pharmacologic_category || ""}
                    onChange={(e) =>
                      handleEditFormChange(
                        "pharmacologic_category",
                        e.target.value,
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "6px",
                      color: colors.textPrimary,
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Manufacturer */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    value={editModal.formData.manufacturer || ""}
                    onChange={(e) =>
                      handleEditFormChange("manufacturer", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "6px",
                      color: colors.textPrimary,
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Country */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Country
                  </label>
                  <input
                    type="text"
                    value={editModal.formData.country || ""}
                    onChange={(e) =>
                      handleEditFormChange("country", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "6px",
                      color: colors.textPrimary,
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Trader */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Trader
                  </label>
                  <input
                    type="text"
                    value={editModal.formData.trader || ""}
                    onChange={(e) =>
                      handleEditFormChange("trader", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "6px",
                      color: colors.textPrimary,
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Importer */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Importer
                  </label>
                  <input
                    type="text"
                    value={editModal.formData.importer || ""}
                    onChange={(e) =>
                      handleEditFormChange("importer", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "6px",
                      color: colors.textPrimary,
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Distributor */}
                <div style={{ gridColumn: "span 2" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Distributor
                  </label>
                  <input
                    type="text"
                    value={editModal.formData.distributor || ""}
                    onChange={(e) =>
                      handleEditFormChange("distributor", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "6px",
                      color: colors.textPrimary,
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* App Type */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Application Type
                  </label>
                  <input
                    type="text"
                    value={editModal.formData.app_type || ""}
                    onChange={(e) =>
                      handleEditFormChange("app_type", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "6px",
                      color: colors.textPrimary,
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Issuance Date */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Issuance Date
                  </label>
                  <input
                    type="date"
                    value={editModal.formData.issuance_date || ""}
                    onChange={(e) =>
                      handleEditFormChange("issuance_date", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "6px",
                      color: colors.textPrimary,
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={editModal.formData.expiry_date || ""}
                    onChange={(e) =>
                      handleEditFormChange("expiry_date", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "6px",
                      color: colors.textPrimary,
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "1.5rem",
                borderTop: `1px solid ${colors.tableBorder}`,
                display: "flex",
                justifyContent: "flex-end",
                gap: "1rem",
                position: "sticky",
                bottom: 0,
                background: colors.cardBg,
              }}
            >
              <button
                onClick={() =>
                  setEditModal({ open: false, data: null, formData: {} })
                }
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "transparent",
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#f44336";
                  e.currentTarget.style.color = "#f44336";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.inputBorder;
                  e.currentTarget.style.color = colors.textPrimary;
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleSaveEdit}
                disabled={loading}
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
                  transition: "all 0.2s",
                  boxShadow: "0 4px 12px rgba(76, 175, 80, 0.3)",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 16px rgba(76, 175, 80, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(76, 175, 80, 0.3)";
                }}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FDAVerificationPortal;
