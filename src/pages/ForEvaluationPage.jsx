import { useState, useEffect, useCallback, useMemo } from "react";
import { getWorkflowTasks } from "../api/workflow-tasks";
import DataTable from "/src/components/reports/DataTable";
import { getColorScheme } from "/src/components/reports/utils";

const mapWorkflowTask = (task) => {
  const m = task.main_db || {};
  return {
    id: task.id,
    dtn: m.DB_DTN,
    ltoCompany: m.DB_EST_LTO_COMP,
    prodBrName: m.DB_PROD_BR_NAME,
    prodGenName: m.DB_PROD_GEN_NAME,
    manufacturer: m.DB_PROD_MANU,
    regNo: m.DB_REG_NO,
    appType: m.DB_APP_TYPE,
    appStatus: m.DB_APP_STATUS,
    uploadedAt: m.DB_DATE_EXCEL_UPLOAD,

    applicationStep: task.application_step,
    accomplishedDate: task.accomplished_date,
    logCreatedAt: task.created_at,
    evaluator: task.user_name,
  };
};

const getCurrentUser = () => {
  const s = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (s) {
    try {
      const o = JSON.parse(s);
      return o.username || o.email || o.first_name || null;
    } catch {
      return s;
    }
  }
  return (
    localStorage.getItem("username") ||
    sessionStorage.getItem("username") ||
    null
  );
};

function ForEvaluationPage({ darkMode }) {
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const colors = getColorScheme(darkMode);

  useEffect(() => {
    setCurrentUser(getCurrentUser() || "Unknown User");
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!currentUser || currentUser === "Unknown User") return;

    setLoading(true);
    try {
      const res = await getWorkflowTasks({
        page: currentPage,
        page_size: rowsPerPage,
        sort_by: sortBy,
        sort_order: sortOrder,
        user_name: currentUser,
        only_latest_per_thread: true,
        del_last_index: 1,
      });

      const mapped = (res.data || []).map(mapWorkflowTask);
      setData(mapped);
      setTotalRecords(res.total || 0);
      setTotalPages(res.total_pages || 0);

      if (!activeTab && mapped.length) {
        setActiveTab(mapped[0].applicationStep);
      }
    } catch (e) {
      console.error(e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentPage, rowsPerPage, sortBy, sortOrder, activeTab]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // 🔹 unique steps → tabs
  const steps = useMemo(() => {
    const set = new Set(data.map((d) => d.applicationStep));
    return Array.from(set);
  }, [data]);

  // 🔹 data per tab
  const tabData = useMemo(() => {
    if (!activeTab) return data;
    return data.filter((d) => d.applicationStep === activeTab);
  }, [data, activeTab]);

  const handleSelectAll = () => {
    setSelectedRows(
      selectedRows.length === tabData.length ? [] : tabData.map((r) => r.id),
    );
  };

  const handleSelectRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  const handleSort = (key, order) => {
    setSortBy(key);
    setSortOrder(order);
  };

  return (
    <div style={{ padding: "2rem", background: colors.pageBg }}>
      {/* Header */}
      <h1 style={{ color: colors.textPrimary, marginBottom: "1rem" }}>
        📋 Current Task
      </h1>

      {/* STEP TABS */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1rem",
          borderBottom: `2px solid ${colors.cardBorder}`,
        }}
      >
        {steps.map((step) => (
          <button
            key={step}
            onClick={() => {
              setActiveTab(step);
              setSelectedRows([]);
            }}
            style={{
              padding: "0.4rem 0.9rem",
              border: "none",
              background: "transparent",
              borderBottom:
                activeTab === step
                  ? "3px solid #2196F3"
                  : "3px solid transparent",
              color:
                activeTab === step ? colors.textPrimary : colors.textSecondary,
              fontWeight: activeTab === step ? "600" : "500",
              cursor: "pointer",
            }}
          >
            {step}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && <div>⏳ Loading...</div>}

      {/* Table */}
      {!loading && (
        <DataTable
          data={tabData}
          selectedRows={selectedRows}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          totalRecords={totalRecords}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={(e) => setRowsPerPage(Number(e.target.value))}
          colors={colors}
          darkMode={darkMode}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          freezeActionsOnly
        />
      )}
    </div>
  );
}

export default ForEvaluationPage;
