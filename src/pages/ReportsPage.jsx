// FILE: src/pages/ReportsPage.jsx
import { useState, useEffect } from "react";
import { getUploadReports } from "../api/reports";

import FilterBar from "../components/reports/FilterBar";
import ReportsDataTable from "../components/reports/ReportsDataTable"; // ✅ Use new component
import { applyClientSideFilters } from "../components/reports/filterHelpers";
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
  const [uploadReportsData, setUploadReportsData] = useState([]);
  const [statsData, setStatsData] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
  });
  const [loading, setLoading] = useState(false);
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

        const allFullData = await getUploadReports({
          page: 1,
          pageSize: 10000,
          search: "",
          status: "",
          sortBy: "DB_DATE_EXCEL_UPLOAD",
          sortOrder: "desc",
        });

        const mappedAll = allFullData.data
          ? allFullData.data.map(mapDataItem)
          : [];

        const completed = mappedAll.filter((item) => {
          return (
            item.dateDirectorSign &&
            item.dateDirectorSign !== "" &&
            item.dateDirectorSign !== "N/A"
          );
        }).length;

        const inProgress = mappedAll.length - completed;

        setStatsData({
          total: allData.total || 0,
          completed: completed,
          inProgress: inProgress,
        });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    };
    fetchStats();
  }, []);

  // Fetch data with server-side pagination
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = {
          page: currentPage,
          pageSize: rowsPerPage,
          search: searchTerm,
          status: "",
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
  }, [currentPage, rowsPerPage, searchTerm, filters]);

  const handleSelectAll = () =>
    selectedRows.length === filteredData.length
      ? setSelectedRows([])
      : setSelectedRows(filteredData.map((row) => row.id));

  const handleSelectRow = (id) =>
    selectedRows.includes(id)
      ? setSelectedRows(selectedRows.filter((r) => r !== id))
      : setSelectedRows([...selectedRows, id]);

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
      {/* Header - No Upload Button */}
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
            value: statsData.total,
            color: colors.textPrimary,
          },
          {
            icon: "⏳",
            label: "In Progress",
            value: statsData.inProgress,
            color: "#FF9800",
          },
          {
            icon: "✅",
            label: "Completed",
            value: statsData.completed,
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

      {/* Tabs - Only "All Reports" */}
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
        <button
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.85rem",
            background: "transparent",
            border: "none",
            borderBottom: `3px solid #4CAF50`,
            color: colors.textPrimary,
            fontWeight: "600",
            cursor: "pointer",
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
            {statsData.total}
          </span>
        </button>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFilterChange={setFilters}
        colors={colors}
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
            Try adjusting your search or filters
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
          totalRecords={filteredTotalRecords}
          totalPages={1}
          indexOfFirstRow={indexOfFirstRow}
          indexOfLastRow={indexOfLastRow}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          colors={colors}
        />
      )}
    </div>
  );
}

export default ReportsPage;
