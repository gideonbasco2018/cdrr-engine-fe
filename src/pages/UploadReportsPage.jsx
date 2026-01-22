// FILE: src/pages/UploadReportsPage.jsx
// ✅ OPTION 1: Always sort by upload date (simplest fix)
// Just remove the special sorting for decked tab

import { useState, useEffect } from "react";
import {
  getUploadReports,
  uploadExcelFile,
  downloadTemplate,
} from "../api/reports";
import StatsCard from "/src/components/Reports/StatsCard.jsx";
import FilterBar from "/src/components/Reports/FilterBar";
import UploadButton from "/src/components/Reports/UploadButton";
import UploadProgress from "/src/components/Reports/UploadProgress";
import DataTable from "/src/components/Reports/DataTable";
import { mapDataItem, getColorScheme } from "/src/components/Reports/utils";

function UploadReportsPage({ darkMode }) {
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
  const [currentUser, setCurrentUser] = useState(null);

  const colors = getColorScheme(darkMode);

  // Get current logged-in user on component mount
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

    if (!username) {
      console.warn("No username found in storage. User may not be logged in.");
      setCurrentUser("Unknown User");
    } else {
      setCurrentUser(username);
      console.log("Current logged-in user:", username);
    }
  }, []);

  // ✅ Fetch TRUE stats using backend filtering
  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log("📊 Fetching accurate stats from backend...");

        // Get total count
        const allData = await getUploadReports({
          page: 1,
          pageSize: 1,
          search: "",
          status: "",
          sortBy: "DB_DATE_EXCEL_UPLOAD",
          sortOrder: "desc",
        });

        // Get not-decked count using backend filter
        const notDeckedData = await getUploadReports({
          page: 1,
          pageSize: 1,
          search: "",
          status: "not_decked",
          sortBy: "DB_DATE_EXCEL_UPLOAD",
          sortOrder: "desc",
        });

        // Get decked count using backend filter
        const deckedData = await getUploadReports({
          page: 1,
          pageSize: 1,
          search: "",
          status: "decked",
          sortBy: "DB_DATE_EXCEL_UPLOAD",
          sortOrder: "desc",
        });

        const statsUpdate = {
          total: allData.total || 0,
          notDecked: notDeckedData.total || 0,
          decked: deckedData.total || 0,
        };

        console.log("✅ Accurate stats from backend:", statsUpdate);
        setStatsData(statsUpdate);
      } catch (err) {
        console.error("❌ Failed to fetch stats:", err);
      }
    };

    fetchStats();
  }, []);

  // ✅ Helper to get status filter based on active tab
  const getStatusFilter = () => {
    console.log("🎯 Active tab:", activeTab);
    if (activeTab === "not-decked") {
      return "not_decked";
    } else if (activeTab === "decked") {
      return "decked";
    }
    return "";
  };

  // ✅ SIMPLIFIED: Always sort by upload date
  const getSortField = () => {
    // Always sort by upload date (most recent first)
    console.log("📅 Sorting by: DB_DATE_EXCEL_UPLOAD");
    return "DB_DATE_EXCEL_UPLOAD";
  };

  // ✅ Fetch data with server-side pagination and filtering
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const params = {
          page: currentPage,
          pageSize: rowsPerPage,
          search: searchTerm,
          status: getStatusFilter(),
          category: filters.category || "",
          sortBy: getSortField(),
          sortOrder: "desc",
        };

        console.log("🔄 Fetching data with params:", params);

        const json = await getUploadReports(params);

        console.log("📦 Received data:", {
          total: json.total,
          totalPages: json.total_pages,
          dataLength: json.data?.length,
          firstRecord: json.data?.[0]?.DB_DTN,
        });

        if (!json || !json.data || !Array.isArray(json.data)) {
          console.warn("⚠️ No data received or invalid format");
          setUploadReportsData([]);
          setTotalRecords(0);
          setTotalPages(0);
          return;
        }

        const mappedData = json.data.map(mapDataItem);
        setUploadReportsData(mappedData);
        setTotalRecords(json.total);
        setTotalPages(json.total_pages);
      } catch (err) {
        console.error("❌ Failed to fetch reports:", err);
        console.error("Error details:", err.response?.data);
        setUploadReportsData([]);
        setTotalRecords(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, rowsPerPage, searchTerm, activeTab, filters]);

  // ✅ Refresh data function with accurate stats
  const refreshData = async () => {
    try {
      setLoading(true);

      // Refresh stats using backend filtering
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

      // Refresh current view data
      const json = await getUploadReports({
        page: currentPage,
        pageSize: rowsPerPage,
        search: searchTerm,
        status: getStatusFilter(),
        category: filters.category || "",
        sortBy: getSortField(),
        sortOrder: "desc",
      });

      if (json && json.data) {
        const mappedData = json.data.map(mapDataItem);
        setUploadReportsData(mappedData);
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
        localStorage.getItem("username") ||
        sessionStorage.getItem("username") ||
        currentUser ||
        "system";
    }

    if (username === "system" || !username) {
      const proceed = confirm(
        "⚠️ Warning: No logged-in user detected.\n\n" +
          'The upload will be attributed to "system".\n\n' +
          "Do you want to continue?",
      );
      if (!proceed) {
        event.target.value = "";
        return;
      }
    }

    try {
      setUploading(true);
      setUploadProgress(`Uploading as: ${username}...`);

      console.log("Uploading file with username:", username);
      const result = await uploadExcelFile(file, username);

      setUploadProgress(null);
      setUploading(false);

      const { success, errors, duplicates_skipped, total_processed } =
        result.stats;

      let message = `✅ Upload Complete!\n\n`;
      message += `👤 Uploaded by: ${username}\n`;
      message += `📊 Processed: ${total_processed} rows\n`;
      message += `✓ Inserted: ${success} new records\n`;

      if (duplicates_skipped > 0) {
        message += `⊘ Skipped: ${duplicates_skipped} duplicates\n`;
      }

      if (errors > 0) {
        message += `✗ Errors: ${errors} failed\n`;
      }

      alert(message);

      // Refresh data
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

  const handleSelectAll = () => {
    if (selectedRows.length === uploadReportsData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(uploadReportsData.map((row) => row.id));
    }
  };

  const handleSelectRow = (id) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const clearSelections = () => {
    setSelectedRows([]);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setSelectedRows([]);
    }
  };

  const handleRowsPerPageChange = (e) => {
    const newRowsPerPage = Number(e.target.value);
    const limitedRowsPerPage = Math.min(newRowsPerPage, 100);
    setRowsPerPage(limitedRowsPerPage);
    setCurrentPage(1);
    setSelectedRows([]);
  };

  const handleTabChange = (tab) => {
    console.log("🔄 Switching to tab:", tab);
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedRows([]);
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
              transition: "color 0.3s ease",
            }}
          >
            Upload Reports
          </h1>
          <p
            style={{
              color: colors.textTertiary,
              fontSize: "0.9rem",
              transition: "color 0.3s ease",
            }}
          >
            Manage and review uploaded pharmaceutical reports
          </p>
        </div>
        <UploadButton
          onFileSelect={handleFileSelect}
          onDownloadTemplate={handleDownloadTemplate}
          uploading={uploading}
          colors={colors}
        />
      </div>

      <StatsCard stats={statsData} colors={colors} />

      {/* TABS SECTION */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
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
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = colors.textPrimary;
                e.currentTarget.style.borderBottomColor = "#4CAF5050";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = colors.textSecondary;
                e.currentTarget.style.borderBottomColor = "transparent";
              }
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

      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFilterChange={setFilters}
        colors={colors}
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

      {!loading && uploadReportsData.length === 0 && (
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
            {activeTab === "not-decked" &&
              "No records without an Evaluator assigned"}
            {activeTab === "decked" && "No records with an Evaluator assigned"}
            {activeTab === "all" &&
              "Try adjusting your search or upload new reports"}
          </div>
        </div>
      )}

      {!loading && uploadReportsData.length > 0 && (
        <DataTable
          data={uploadReportsData}
          selectedRows={selectedRows}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
          onClearSelections={clearSelections}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          totalRecords={totalRecords}
          totalPages={totalPages}
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

export default UploadReportsPage;
