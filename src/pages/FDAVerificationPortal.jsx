import { useState, useEffect, useRef } from "react";
import {
  downloadTemplate,
  uploadExcelFile,
  getAllDrugs,
  getDrugById,
  deleteDrug,
  updateDrug,
  exportDrugsToExcel,
} from "../api/fdaverifportal";

// Import Components
import FDAViewModal from "../components/fda/FDAViewModal";
import FDAEditModal from "../components/fda/FDAEditModal";
import FDADeleteConfirmModal from "../components/fda/FDADeleteConfirmModal";
import FDADataTable from "../components/fda/FDADataTable";
import FDATablePagination from "../components/fda/FDATablePagination";

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

  // Store button refs for dropdown positioning
  const buttonRefs = useRef({});

  // Tab state
  const [activeTab, setActiveTab] = useState("all");

  // Modal states
  const [viewModal, setViewModal] = useState({ open: false, data: null });
  const [editModal, setEditModal] = useState({ open: false, data: null });
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    drugId: null,
    drugName: "",
  });

  // Filter states
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

  // Table columns
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

  // Helper: Check if expired
  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  // Filter data based on tab and filters
  const getFilteredData = () => {
    let filtered = drugsData;

    if (activeTab === "deleted") {
      filtered = filtered.filter((drug) => drug.date_deleted);
    } else if (activeTab === "expired") {
      filtered = filtered.filter(
        (drug) => !drug.date_deleted && isExpired(drug.expiry_date),
      );
    } else {
      filtered = filtered.filter((drug) => !drug.date_deleted);
    }

    if (filters.uploadedBy) {
      filtered = filtered.filter((drug) =>
        drug.uploaded_by
          ?.toLowerCase()
          .includes(filters.uploadedBy.toLowerCase()),
      );
    }

    if (filters.dateUploadFrom) {
      filtered = filtered.filter((drug) => {
        if (!drug.date_uploaded) return false;
        return new Date(drug.date_uploaded) >= new Date(filters.dateUploadFrom);
      });
    }

    if (filters.dateUploadTo) {
      filtered = filtered.filter((drug) => {
        if (!drug.date_uploaded) return false;
        return new Date(drug.date_uploaded) <= new Date(filters.dateUploadTo);
      });
    }

    return filtered;
  };

  // Fetch drugs
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

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      fetchDrugs();
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [currentPage, pageSize, searchTerm, activeTab]);

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
        country: formData.country,
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

  // Handle Delete
  const handleDeleteClick = (drugId, drugName) => {
    setDeleteModal({ open: true, drugId, drugName });
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      await deleteDrug(deleteModal.drugId);
      alert("✅ Drug registration deleted successfully!");
      setDeleteModal({ open: false, drugId: null, drugName: "" });
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

  // Clear Filters
  const handleClearFilters = () => {
    setFilters({
      uploadedBy: "",
      dateUploadFrom: "",
      dateUploadTo: "",
    });
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

  // Upload File
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
            label: "Total Products",
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
            icon: "🗑️",
            label: "Deleted",
            value: stats.deletedProducts,
            color: "#f44336",
          },
          {
            icon: "🏭",
            label: "Manufacturers",
            value: stats.manufacturers,
            color: colors.textPrimary,
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

      {/* Advanced Filters */}
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
              label: "All Products",
              count: stats.totalProducts - stats.deletedProducts,
              color: colors.tabActive,
            },
            {
              key: "expired",
              icon: "⏰",
              label: "Expired",
              count: stats.expiredProducts,
              color: "#FF9800",
            },
            {
              key: "deleted",
              icon: "🗑️",
              label: "Deleted",
              count: stats.deletedProducts,
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

        {/* Use the new FDADataTable component */}
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
          toggleDropdown={toggleDropdown}
          handleViewDetails={handleViewDetails}
          handleEdit={handleEdit}
          handleDeleteClick={handleDeleteClick}
          isExpired={isExpired}
        />

        {/* Use the new FDATablePagination component */}
        <FDATablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          pagination={pagination}
          colors={colors}
          loading={loading}
          handlePageChange={handlePageChange}
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

      <FDADeleteConfirmModal
        isOpen={deleteModal.open}
        onClose={() =>
          setDeleteModal({ open: false, drugId: null, drugName: "" })
        }
        onConfirm={handleDeleteConfirm}
        drugName={deleteModal.drugName}
        darkMode={darkMode}
        loading={loading}
      />
    </div>
  );
}

export default FDAVerificationPortal;
