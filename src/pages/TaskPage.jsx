import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getWorkflowTasks,
  markWorkflowTaskAsRead,
} from "../api/workflow-tasks";
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
/*  Sub-tab bar component — matches main step tab style                 */
/* ================================================================== */
function SubTabBar({
  activeSubTab,
  setActiveSubTab,
  receivedCount,
  notYetCount,
  colors,
  darkMode,
}) {
  const tabs = [
    {
      key: "not_yet",
      label: "For Receiving",
      count: notYetCount,
      badgeColor: "#f59e0b",
    },
    {
      key: "received",
      label: "Received",
      count: receivedCount,
      badgeColor: "#10b981",
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: "5px",
        background: darkMode ? "#181818" : "#f0f0f0",
        padding: "4px",
        borderRadius: "8px",
        width: "fit-content",
        flexShrink: 0,
      }}
    >
      {tabs.map((t) => {
        const isActive = activeSubTab === t.key;
        return (
          <button
            key={t.key}
            onClick={() => setActiveSubTab(t.key)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 14px",
              border: "none",
              borderRadius: "6px",
              background: isActive
                ? darkMode
                  ? "#242424"
                  : "#ffffff"
                : "transparent",
              color: isActive ? colors.textPrimary : colors.textTertiary,
              fontWeight: isActive ? 600 : 400,
              cursor: "pointer",
              fontSize: "0.78rem",
              transition: "all .15s ease",
              boxShadow: isActive
                ? darkMode
                  ? "0 1px 3px rgba(0,0,0,0.4)"
                  : "0 1px 3px rgba(0,0,0,0.12)"
                : "none",
            }}
          >
            {t.label}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "1.2rem",
                height: "1.2rem",
                padding: "0 0.35rem",
                borderRadius: "999px",
                fontSize: "0.65rem",
                fontWeight: 700,
                lineHeight: 1,
                background: isActive
                  ? t.badgeColor
                  : darkMode
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.10)",
                color: isActive ? "#fff" : colors.textTertiary,
                transition: "background .15s, color .15s",
              }}
            >
              {t.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
/* ================================================================== */
/*  TaskPage                                                            */
/* ================================================================== */
function TaskPage({ darkMode }) {
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState("not_yet");
  const [selectedRows, setSelectedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [readIds, setReadIds] = useState(new Set());

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

      const alreadyRead = new Set(
        (res.data || []).filter((t) => t.is_read === 1).map((t) => t.id),
      );
      setReadIds(alreadyRead);
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

  const markAsRead = useCallback(async (id) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    await markWorkflowTaskAsRead(id);
  }, []);

  const handleTabChange = (step) => {
    setActiveTab(step);
    setActiveSubTab("not_yet");
    setSelectedRows([]);
  };

  const handleSubTabChange = (sub) => {
    setActiveSubTab(sub);
    setSelectedRows([]);
  };

  const steps = useMemo(
    () => Array.from(new Set(data.map((d) => d.applicationStep))),
    [data],
  );

  const stepCounts = useMemo(
    () =>
      steps.reduce((acc, step) => {
        acc[step] = data.filter((d) => d.applicationStep === step).length;
        return acc;
      }, {}),
    [steps, data],
  );

  const stepUnreadCounts = useMemo(
    () =>
      steps.reduce((acc, step) => {
        acc[step] = data.filter(
          (d) => d.applicationStep === step && !readIds.has(d.id),
        ).length;
        return acc;
      }, {}),
    [steps, data, readIds],
  );

  const tabData = useMemo(
    () =>
      !activeTab ? data : data.filter((d) => d.applicationStep === activeTab),
    [data, activeTab],
  );

  const receivedCount = useMemo(
    () => tabData.filter((d) => d.is_received === 1).length,
    [tabData],
  );
  const notYetReceivedCount = useMemo(
    () => tabData.filter((d) => d.is_received !== 1).length,
    [tabData],
  );

  const subTabData = useMemo(
    () =>
      activeSubTab === "received"
        ? tabData.filter((d) => d.is_received === 1)
        : tabData.filter((d) => d.is_received !== 1),
    [tabData, activeSubTab],
  );

  const filteredData = useMemo(
    () =>
      subTabData.filter((r) => {
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
    [subTabData, filters],
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

  const emptyLabel =
    activeSubTab === "received"
      ? "No received tasks yet."
      : "No pending tasks — all caught up!";
  const emptyIcon = activeSubTab === "received" ? "📭" : "✅";

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
        data={subTabData}
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
          padding: "0.75rem",
          gap: "0.4rem",
          overflow: "hidden",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: ".95rem",
              fontWeight: "600",
              marginBottom: "0.15rem",
              color: colors.textPrimary,
            }}
          >
            Task
          </h1>
          <p
            style={{
              color: colors.textTertiary,
              fontSize: "0.75rem",
              margin: 0,
            }}
          >
            Track and complete assigned tasks
          </p>
        </div>

        {/* ── Main step tabs ── */}
        {steps.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "0.15rem",
              borderBottom: `2px solid ${colors.cardBorder}`,
              flexShrink: 0,
            }}
          >
            {steps.map((step) => {
              const isActive = activeTab === step;
              const count = stepCounts[step] ?? 0;
              const unread = stepUnreadCounts[step] ?? 0;
              return (
                <button
                  key={step}
                  onClick={() => handleTabChange(step)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    padding: "0.35rem 0.85rem",
                    border: "none",
                    background: "transparent",
                    borderBottom: isActive
                      ? "3px solid #2196F3"
                      : "3px solid transparent",
                    color: isActive ? colors.textPrimary : colors.textSecondary,
                    fontWeight: isActive ? 600 : 500,
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    transition: "color .15s",
                    position: "relative",
                    marginBottom: "-2px",
                  }}
                >
                  {step}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "1.2rem",
                      height: "1.2rem",
                      padding: "0 0.35rem",
                      borderRadius: "999px",
                      fontSize: "0.65rem",
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
                  {unread > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 2,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#ef4444",
                        border: "1.5px solid " + colors.pageBg,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Sub-tabs ── */}
        {steps.length > 0 && (
          <SubTabBar
            activeSubTab={activeSubTab}
            setActiveSubTab={handleSubTabChange}
            receivedCount={receivedCount}
            notYetCount={notYetReceivedCount}
            colors={colors}
            darkMode={darkMode}
          />
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

        {!loading && filteredData.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              color: colors.textTertiary,
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 12,
              minHeight: 0,
            }}
          >
            <span style={{ fontSize: "2.5rem" }}>{emptyIcon}</span>
            <p
              style={{
                fontSize: ".75rem",
                fontWeight: 600,
                color: colors.textSecondary,
                margin: 0,
              }}
            >
              {emptyLabel}
            </p>
            {hasActiveFilters && (
              <p style={{ fontSize: "0.82rem", margin: 0 }}>
                Try clearing your filters.
              </p>
            )}
          </div>
        )}

        {!loading && filteredData.length > 0 && (
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
              activeSubTab={activeSubTab}
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
              readIds={readIds}
              onMarkAsRead={markAsRead}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskPage;
