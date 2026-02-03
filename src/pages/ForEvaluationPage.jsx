import { useState, useEffect } from "react";
import { getUploadReports } from "../api/reports";
import StatsCard from "/src/components/reports/StatsCard.jsx";
import FilterBar from "/src/components/reports/FilterBar";
import DataTable from "/src/components/reports/DataTable";
import { mapDataItem, getColorScheme } from "/src/components/reports/utils";

function ForEvaluationPage({ darkMode }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [evaluationData, setEvaluationData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [statsData, setStatsData] = useState({
    total: 0,
    notDecked: 0, // Will represent 'pending'
    decked: 0, // Will represent 'completed'
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);

  const colors = getColorScheme(darkMode);

  // ✅ GET CURRENT LOGGED-IN USER - THIS WAS MISSING!
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

  // Apply filters helper
  const applyFilters = (data) => {
    let filtered = data;

    // Apply active tab filter first
    filtered = filterDataByTab(filtered, activeTab);

    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
    }

    // Apply advanced filters
    Object.entries(filters).forEach(([key, value]) => {
      if (!value || value === "all") return;

      if (key === "dateFrom" && value) {
        filtered = filtered.filter(
          (item) => new Date(item.dateExcelUpload) >= new Date(value),
        );
      } else if (key === "dateTo" && value) {
        filtered = filtered.filter(
          (item) => new Date(item.dateExcelUpload) <= new Date(value),
        );
      } else {
        filtered = filtered.filter((item) =>
          String(item[key]).toLowerCase().includes(String(value).toLowerCase()),
        );
      }
    });

    return filtered;
  };

  const filterDataByTab = (data, tab) => {
    console.log("🔍 Filtering data by tab:", tab);
    console.log("👤 Current user:", currentUser);
    console.log("📊 Total data before filter:", data.length);

    // First, filter only records assigned to current user as evaluator
    const userRecords = data.filter((item) => {
      // Check if evaluator matches current user
      const evaluator = item.evaluator || "";
      const isMatch =
        evaluator.toLowerCase().trim() ===
        (currentUser || "").toLowerCase().trim();

      if (isMatch) {
        console.log("✅ Match found:", {
          dtn: item.dtn,
          evaluator: item.evaluator,
          dateEvalEnd: item.dateEvalEnd,
        });
      }

      return isMatch;
    });

    console.log("📊 User assigned records:", userRecords.length);

    if (tab === "pending") {
      // Records with no DB_DATE_EVAL_END (pending evaluation)
      const pending = userRecords.filter(
        (item) =>
          !item.dateEvalEnd ||
          item.dateEvalEnd === "" ||
          item.dateEvalEnd === "N/A" ||
          item.dateEvalEnd === null,
      );
      console.log("⏳ Pending records:", pending.length);
      return pending;
    } else if (tab === "completed") {
      // Records with DB_DATE_EVAL_END filled (completed evaluation)
      const completed = userRecords.filter(
        (item) =>
          item.dateEvalEnd &&
          item.dateEvalEnd !== "" &&
          item.dateEvalEnd !== "N/A" &&
          item.dateEvalEnd !== null,
      );
      console.log("✅ Completed records:", completed.length);
      return completed;
    }

    // All records assigned to current user
    console.log("📋 All user records:", userRecords.length);
    return userRecords;
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const json = await getUploadReports({
        page: currentPage,
        pageSize: rowsPerPage,
        search: "",
        sortBy: "",
        sortOrder: "desc",
      });

      if (!json || !json.data || !Array.isArray(json.data)) {
        setEvaluationData([]);
        setAllData([]);
        return;
      }

      const mappedData = json.data.map(mapDataItem);

      // ✅ FIXED: Filter records assigned to current user as evaluator
      const userAssignedRecords = mappedData.filter((item) => {
        const evaluator = item.evaluator || "";
        return (
          evaluator &&
          evaluator !== "" &&
          evaluator !== "N/A" &&
          evaluator.toLowerCase().trim() ===
            (currentUser || "").toLowerCase().trim()
        );
      });

      setAllData(userAssignedRecords);

      // ✅ FIXED: Calculate stats based on dateEvalEnd (not appStatus)
      const pendingCount = userAssignedRecords.filter(
        (item) =>
          !item.dateEvalEnd ||
          item.dateEvalEnd === "" ||
          item.dateEvalEnd === "N/A" ||
          item.dateEvalEnd === null,
      ).length;

      const completedCount = userAssignedRecords.filter(
        (item) =>
          item.dateEvalEnd &&
          item.dateEvalEnd !== "" &&
          item.dateEvalEnd !== "N/A" &&
          item.dateEvalEnd !== null,
      ).length;

      console.log("📊 Stats Calculation:", {
        total: userAssignedRecords.length,
        pending: pendingCount,
        completed: completedCount,
      });

      setStatsData({
        total: userAssignedRecords.length,
        notDecked: pendingCount, // Pending evaluations
        decked: completedCount, // Completed evaluations
      });

      // Apply all filters
      const filteredData = applyFilters(userAssignedRecords);
      setEvaluationData(filteredData);
      setTotalRecords(filteredData.length);
      setTotalPages(Math.ceil(filteredData.length / rowsPerPage));
    } catch (err) {
      console.error("Failed to fetch evaluation reports", err);
      setEvaluationData([]);
      setAllData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch data when currentUser is available
    if (currentUser && currentUser !== "Unknown User") {
      fetchAllData();
    }
  }, [currentPage, rowsPerPage, searchTerm, activeTab, filters, currentUser]);

  const handleSelectAll = () => {
    if (selectedRows.length === evaluationData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(evaluationData.map((row) => row.id));
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
            📋 For Evaluation
          </h1>
          <p
            style={{
              color: colors.textTertiary,
              fontSize: "0.9rem",
              transition: "color 0.3s ease",
            }}
          >
            Review and evaluate decked applications
          </p>
          {/* ✅ OPTIONAL: Display current user */}
          {currentUser && currentUser !== "Unknown User" && (
            <div
              style={{
                marginTop: "0.5rem",
                padding: "0.5rem 1rem",
                background: colors.badgeBg,
                borderRadius: "8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.85rem",
                color: colors.textSecondary,
              }}
            >
              <span>👤</span>
              <span>
                Logged in as: <strong>{currentUser}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      <StatsCard
        stats={statsData}
        colors={colors}
        labels={{
          total: "Total Reports",
          notDecked: "For Evaluation",
          decked: "Evaluated",
          totalIcon: "📊",
          notDeckedIcon: "📋",
          deckedIcon: "✅",
        }}
      />

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
            label: "All For Evaluation",
            icon: "📋",
            count: statsData.total,
          },
          {
            id: "pending",
            label: "For Evaluation",
            icon: "⏳",
            count: statsData.notDecked, // Use notDecked for pending count
          },
          {
            id: "completed",
            label: "Done Evaluation",
            icon: "✅",
            count: statsData.decked, // Use decked for completed count
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
                  ? `3px solid #2196F3`
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
                e.currentTarget.style.borderBottomColor = "#2196F350";
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
                background: activeTab === tab.id ? "#2196F3" : colors.badgeBg,
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
            Loading evaluation reports...
          </div>
          <div style={{ fontSize: "0.9rem" }}>
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}

      {!loading && evaluationData.length === 0 && (
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
            No evaluation reports found
          </div>
          <div style={{ fontSize: "0.9rem" }}>
            {activeTab === "pending" && "No pending evaluations at this time"}
            {activeTab === "completed" && "No completed evaluations yet"}
            {activeTab === "all" && "No records available for evaluation"}
          </div>
        </div>
      )}

      {!loading && evaluationData.length > 0 && (
        <DataTable
          data={evaluationData}
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
          onRefresh={fetchAllData}
        />
      )}
    </div>
  );
}

export default ForEvaluationPage;
