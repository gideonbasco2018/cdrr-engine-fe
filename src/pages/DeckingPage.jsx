// FILE: src/pages/DeckingPage.jsx
import { useState, useEffect } from "react";
import {
  getUploadReports,
  uploadExcelFile,
  downloadTemplate,
} from "../api/reports";

import StatsCard from "../components/reports/StatsCard";
import FilterBar from "../components/reports/FilterBar";
import UploadButton from "../components/reports/UploadButton";
import UploadProgress from "../components/reports/UploadProgress";
import DataTable from "../components/reports/DataTable";
import { applyClientSideFilters } from "../components/reports/filterHelpers";
import { mapDataItem, getColorScheme } from "../components/reports/utils.js"; // ✅ include .js extension

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
  const [currentUser, setCurrentUser] = useState(null);

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

  const getStatusFilter = () => {
    if (activeTab === "not-decked") return "not_decked";
    if (activeTab === "decked") return "decked";
    return "";
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
          category: filters.category || "",
          sortBy: "DB_DATE_EXCEL_UPLOAD",
          sortOrder: "desc",
        };
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
        setFilteredData(applyClientSideFilters(mappedData, filters));
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
  }, [currentPage, rowsPerPage, searchTerm, activeTab, filters]);

  const refreshData = async () => {
    try {
      setLoading(true);
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
      const json = await getUploadReports({
        page: currentPage,
        pageSize: rowsPerPage,
        search: searchTerm,
        status: getStatusFilter(),
        category: filters.category || "",
        sortBy: "DB_DATE_EXCEL_UPLOAD",
        sortOrder: "desc",
      });
      if (json && json.data) {
        const mappedData = json.data.map(mapDataItem);
        setUploadReportsData(mappedData);
        setFilteredData(applyClientSideFilters(mappedData, filters));
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

  const filteredTotalRecords = filteredData.length;
  const indexOfFirstRow = filteredTotalRecords > 0 ? 1 : 0;
  const indexOfLastRow = filteredTotalRecords;

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
        <UploadButton
          onFileSelect={handleFileSelect}
          onDownloadTemplate={handleDownloadTemplate}
          uploading={uploading}
          colors={colors}
        />
      </div>

      <StatsCard stats={statsData} colors={colors} />

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
            {activeTab === "not-decked" &&
              "No records without an Evaluator assigned"}
            {activeTab === "decked" && "No records with an Evaluator assigned"}
            {activeTab === "all" &&
              "Try adjusting your search or upload new reports"}
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
          totalRecords={filteredTotalRecords}
          totalPages={1}
          indexOfFirstRow={indexOfFirstRow}
          indexOfLastRow={indexOfLastRow}
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
