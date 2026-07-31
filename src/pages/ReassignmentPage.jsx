// src/pages/ReassignmentPage.jsx
import { useState, useEffect, useCallback } from "react";
import { getOpenTasks, getOpenTaskSteps } from "../api/application-logs";
import { getColorScheme } from "../components/tasks/ColorScheme";
import { getUser } from "../api/auth";
import AssignmentTable from "../components/assignment/AssignmentTable";

function mapOpenTask(t) {
  return {
    id: t.id,
    mainDbId: t.main_db_id,
    dtn: t.dtn,
    oldRsn: t.old_rsn,
    applicationStep: t.application_step,
    userName: t.user_name,
    userId: t.user_id,
    applicationStatus: t.application_status,
    updatedAt: t.updated_at,
  };
}

function ReassignmentPage({ darkMode }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [stepFilter, setStepFilter] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);

  // ── Pagination state (server-side) ──
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const colors = getColorScheme(darkMode);

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user || null);
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOpenTasks({
        page: currentPage,
        page_size: rowsPerPage,
        search: searchTerm || undefined,
        application_step: stepFilter || undefined,
      });
      const mapped = (res.data || []).map(mapOpenTask);
      setData(mapped);
      setTotalRecords(res.total || 0);
      setTotalPages(Math.ceil((res.total || 0) / rowsPerPage) || 1);
      setSelectedRows([]);
    } catch (e) {
      console.error("Failed to load open tasks:", e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, rowsPerPage, searchTerm, stepFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stepFilter]);

  const handleCheckAll = () => setSelectedRows(data.map((r) => r.id));
  const handleSearchSubmit = () => {
    setSearchTerm(searchInput);
  };
  const handleUncheckAll = () => setSelectedRows([]);
  const handleSelectRow = (id) =>
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );

  const [steps, setSteps] = useState([]);

  useEffect(() => {
    getOpenTaskSteps()
      .then((res) => setSteps(res.steps || []))
      .catch(() => setSteps([]));
  }, []);

  return (
    <div
      style={{
        background: colors.pageBg,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "0.75rem",
        gap: "0.5rem",
        boxSizing: "border-box",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      <AssignmentTable
        data={data}
        loading={loading}
        selectedRows={selectedRows}
        onSelectRow={handleSelectRow}
        onCheckAll={handleCheckAll}
        onUncheckAll={handleUncheckAll}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
        stepFilter={stepFilter}
        onStepFilterChange={setStepFilter}
        steps={steps}
        onRefresh={fetchTasks}
        colors={colors}
        darkMode={darkMode}
        currentUser={currentUser}
        // ── pagination props ──
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        totalRecords={totalRecords}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(Number(e.target.value));
          setCurrentPage(1);
        }}
      />
    </div>
  );
}

export default ReassignmentPage;
