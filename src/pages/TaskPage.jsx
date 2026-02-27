import { useState, useEffect, useCallback, useMemo } from "react";
import { getWorkflowTasks } from "../api/workflow-tasks";
import { getColorScheme } from "../components/tasks/ColorScheme";
import { mapWorkflowTask, getCurrentUser } from "../components/tasks/taskUtils";
import QuickFilters from "../components/tasks/QuickFilters";
import DataTable from "../components/tasks/DataTable";

/* ================================================================== */
/*  Active filter Chip                                                  */
/* ================================================================== */
function Chip({ label, onRemove, colors }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.2rem 0.6rem",
        borderRadius: "12px",
        background: colors.badgeBg,
        border: `1px solid ${colors.cardBorder}`,
        fontSize: "0.72rem",
        color: colors.textSecondary,
      }}
    >
      {label}
      <button
        onClick={onRemove}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: colors.textTertiary,
          padding: 0,
          fontSize: "0.7rem",
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </span>
  );
}

/* ================================================================== */
/*  TaskPage                                                            */
/* ================================================================== */
function TaskPage({ darkMode }) {
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

  const [filters, setFilters] = useState({
    search: "",
    appType: "",
    prescription: "",
    appStatus: "",
    processingType: "",
  });

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
        only_latest_per_thread: false,
        del_last_index: 1,
      });
      const mapped = (res.data || []).map((t, i) => mapWorkflowTask(t, i));
      setData(mapped);
      setTotalRecords(res.total || 0);
      setTotalPages(res.total_pages || 0);
      if (!activeTab && mapped.length) setActiveTab(mapped[0].applicationStep);
    } catch (e) {
      console.error(e);
      setData([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, currentPage, rowsPerPage, sortBy, sortOrder]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const steps = useMemo(
    () => Array.from(new Set(data.map((d) => d.applicationStep))),
    [data],
  );

  /* ── Count per step (from full unfiltered data) ── */
  const stepCounts = useMemo(
    () =>
      steps.reduce((acc, step) => {
        acc[step] = data.filter((d) => d.applicationStep === step).length;
        return acc;
      }, {}),
    [steps, data],
  );

  const tabData = useMemo(
    () =>
      !activeTab ? data : data.filter((d) => d.applicationStep === activeTab),
    [data, activeTab],
  );

  const filteredData = useMemo(
    () =>
      tabData.filter((r) => {
        const s = filters.search;
        const ms =
          !s ||
          ["dtn", "ltoCompany", "prodBrName", "prodGenName", "prodManu"].some(
            (f) =>
              String(r[f] ?? "")
                .toLowerCase()
                .includes(s.toLowerCase()),
          );
        const ma = !filters.appType || r.appType === filters.appType;
        const mp =
          !filters.prescription ||
          r.prodClassPrescript === filters.prescription;
        const mst = !filters.appStatus || r.appStatus === filters.appStatus;
        const mpt =
          !filters.processingType ||
          r.processingType === filters.processingType;
        return ms && ma && mp && mst && mpt;
      }),
    [tabData, filters],
  );

  const handleSelectAll = () =>
    setSelectedRows(
      selectedRows.length === filteredData.length
        ? []
        : filteredData.map((r) => r.id),
    );

  const handleSelectRow = (id) =>
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );

  const handleSort = (key, order) => {
    setSortBy(key);
    setSortOrder(order);
  };

  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;
  const displayedTotal = filteredData.length;
  const displayedPages = Math.ceil(displayedTotal / rowsPerPage) || 1;

  const hasActiveFilters =
    filters.search ||
    filters.appType ||
    filters.prescription ||
    filters.appStatus ||
    filters.processingType;

  return (
    <div
      style={{
        background: colors.pageBg,
        height: "100vh",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "row",
        overflow: "hidden",
      }}
    >
      {/* ── Quick Filters Sidebar ── */}
      <QuickFilters
        data={tabData}
        filters={filters}
        onFiltersChange={(f) => {
          setFilters(f);
          setSelectedRows([]);
        }}
        colors={colors}
        darkMode={darkMode}
      />

      {/* ── Main content ── */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          padding: "2rem",
          gap: "1rem",
          overflow: "hidden",
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
            Task
          </h1>
          <p style={{ color: colors.textTertiary, fontSize: "0.9rem" }}>
            Track and complete assigned tasks
          </p>
        </div>

        {/* Step tabs */}
        {steps.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "0.25rem",
              borderBottom: `2px solid ${colors.cardBorder}`,
              flexShrink: 0,
            }}
          >
            {steps.map((step) => {
              const isActive = activeTab === step;
              const count = stepCounts[step] ?? 0;
              return (
                <button
                  key={step}
                  onClick={() => {
                    setActiveTab(step);
                    setSelectedRows([]);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    padding: "0.5rem 1rem",
                    border: "none",
                    background: "transparent",
                    borderBottom: isActive
                      ? "3px solid #2196F3"
                      : "3px solid transparent",
                    color: isActive ? colors.textPrimary : colors.textSecondary,
                    fontWeight: isActive ? 600 : 500,
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    transition: "color .15s",
                  }}
                >
                  {step}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "1.35rem",
                      height: "1.35rem",
                      padding: "0 0.35rem",
                      borderRadius: "999px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      lineHeight: 1,
                      background: isActive
                        ? "#2196F3"
                        : darkMode
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(0,0,0,0.10)",
                      color: isActive ? "#fff" : colors.textSecondary,
                      transition: "background .15s, color .15s",
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "0.75rem", color: colors.textTertiary }}>
              Active filters:
            </span>
            {filters.search && (
              <Chip
                label={`Search: "${filters.search}"`}
                onRemove={() => setFilters({ ...filters, search: "" })}
                colors={colors}
              />
            )}
            {filters.appType && (
              <Chip
                label={`App Type: ${filters.appType}`}
                onRemove={() => setFilters({ ...filters, appType: "" })}
                colors={colors}
              />
            )}
            {filters.prescription && (
              <Chip
                label={`Prescription: ${filters.prescription}`}
                onRemove={() => setFilters({ ...filters, prescription: "" })}
                colors={colors}
              />
            )}
            {filters.appStatus && (
              <Chip
                label={`Status: ${filters.appStatus}`}
                onRemove={() => setFilters({ ...filters, appStatus: "" })}
                colors={colors}
              />
            )}
            {filters.processingType && (
              <Chip
                label={`Processing Type: ${filters.processingType}`}
                onRemove={() => setFilters({ ...filters, processingType: "" })}
                colors={colors}
              />
            )}
            <button
              onClick={() =>
                setFilters({
                  search: "",
                  appType: "",
                  prescription: "",
                  appStatus: "",
                  processingType: "",
                })
              }
              style={{
                fontSize: "0.72rem",
                color: "#ef4444",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "0.15rem 0.4rem",
              }}
            >
              Clear all
            </button>
          </div>
        )}

        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: colors.textSecondary,
            }}
          >
            <span>⏳</span> Loading…
          </div>
        )}

        {!loading && (
          <div style={{ flex: 1, minHeight: 0 }}>
            <DataTable
              data={filteredData}
              selectedRows={selectedRows}
              onSelectRow={handleSelectRow}
              onSelectAll={handleSelectAll}
              currentPage={currentPage}
              rowsPerPage={rowsPerPage}
              totalRecords={displayedTotal}
              totalPages={displayedPages}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              colors={colors}
              darkMode={darkMode}
              activeTab={activeTab}
              onRefresh={fetchTasks}
              onClearSelections={() => setSelectedRows([])}
              indexOfFirstRow={indexOfFirstRow}
              indexOfLastRow={Math.min(
                indexOfFirstRow + rowsPerPage,
                displayedTotal,
              )}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskPage;
