import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getWorkflowTasks,
  markWorkflowTaskAsRead,
} from "../api/workflow-tasks";
import { getColorScheme } from "../components/tasks/ColorScheme";

import { mapWorkflowTask } from "../components/tasks/taskUtils";
import { getUser } from "../api/auth";

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
/*  Sub-tab bar component                                               */
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
  ].filter((t) => t.count > 0);

  return (
    <div
      style={{
        display: "flex",
        gap: "3px",
        background: darkMode ? "#181818" : "#f0f0f0",
        padding: "3px",
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
              gap: "5px",
              padding: "3px 10px",
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
              fontSize: "0.72rem",
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
                minWidth: "1.1rem",
                height: "1.1rem",
                padding: "0 0.3rem",
                borderRadius: "999px",
                fontSize: "0.6rem",
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
  const [rowsPerPage, setRowsPerPage] = useState(10);
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
    sentBy: "",
    lastModifiedFrom: "",
    lastModifiedTo: "",
    estCat: "",
  });

  const [visibleColumnKeys, setVisibleColumnKeys] = useState(null);
  const colors = getColorScheme(darkMode);

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user || null);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, activeSubTab, activeTab]);

  const fetchTasks = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const isFrontendSort =
        sortBy === "log_sent_by" || sortBy === "log_last_modified";

      const res = await getWorkflowTasks({
        page: 1,
        page_size: 10000,
        sort_by: isFrontendSort ? "created_at" : sortBy,
        sort_order: isFrontendSort ? "desc" : sortOrder,
        user_id: currentUser.id,
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
  }, [currentUser, sortBy, sortOrder]);

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
    setSelectedRows([]);
    const stepRows = data.filter((d) => d.applicationStep === step);
    const hasNotYet = stepRows.some((d) => d.is_received !== 1);
    const hasReceived = stepRows.some((d) => d.is_received === 1);
    if (!hasNotYet && hasReceived) setActiveSubTab("received");
    else setActiveSubTab("not_yet");
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

  const filteredData = useMemo(() => {
    const filtered = subTabData.filter((r) => {
      const s = filters.search;
      const searchTerms = s
        ? s
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
        : [];
      const ms =
        searchTerms.length === 0 ||
        searchTerms.some((term) =>
          ["dtn", "ltoCompany", "prodBrName", "prodGenName", "prodManu"].some(
            (f) =>
              String(r[f] ?? "")
                .toLowerCase()
                .includes(term),
          ),
        );
      const ma = !filters.appType || r.appType === filters.appType;
      const mp =
        !filters.prescription || r.prodClassPrescript === filters.prescription;
      const mst = !filters.appStatus || r.appStatus === filters.appStatus;
      const mpt =
        !filters.processingType || r.processingType === filters.processingType;
      const msb =
        !filters.sentBy ||
        (r.sentBy ?? "").toLowerCase().includes(filters.sentBy.toLowerCase());
      const from = filters.lastModifiedFrom
        ? new Date(filters.lastModifiedFrom)
        : null;
      const to = filters.lastModifiedTo
        ? new Date(filters.lastModifiedTo + "T23:59:59")
        : null;
      const lm = r.lastModified ? new Date(r.lastModified) : null;
      const mfrom = !from || (lm && lm >= from);
      const mto = !to || (lm && lm <= to);
      const mcat = !filters.estCat || r.estCat === filters.estCat;
      return ms && ma && mp && mst && mpt && msb && mfrom && mto && mcat;
    });

    if (sortBy === "log_sent_by" || sortBy === "log_last_modified") {
      filtered.sort((a, b) => {
        let valA, valB;
        if (sortBy === "log_sent_by") {
          valA = (a.sentBy ?? "").toLowerCase();
          valB = (b.sentBy ?? "").toLowerCase();
        } else {
          valA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
          valB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
        }
        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [subTabData, filters, sortBy, sortOrder]);

  const handleSelectAll = () => {
    const filteredIds = filteredData.map((r) => r.id);
    const allFilteredSelected = filteredIds.every((id) =>
      selectedRows.includes(id),
    );
    if (allFilteredSelected) {
      setSelectedRows((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedRows((prev) => [...new Set([...prev, ...filteredIds])]);
    }
  };

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

  const paginatedData = filteredData.slice(
    indexOfFirstRow,
    indexOfFirstRow + rowsPerPage,
  );

  const hasActiveFilters =
    filters.search ||
    filters.appType ||
    filters.prescription ||
    filters.appStatus ||
    filters.processingType ||
    filters.sentBy ||
    filters.lastModifiedFrom ||
    filters.lastModifiedTo ||
    filters.estCat;

  const emptyLabel =
    activeSubTab === "received"
      ? "No received tasks yet."
      : "No pending tasks — all caught up!";
  const emptyIcon = activeSubTab === "received" ? "📭" : "✅";

  // Compact shared styles
  const inputStyle = (active) => ({
    padding: "0.25rem 0.5rem",
    background: colors.inputBg,
    border: `1px solid ${active ? "#4CAF50" : colors.inputBorder}`,
    borderRadius: 6,
    color: colors.textPrimary,
    fontSize: "0.68rem",
    outline: "none",
    colorScheme: darkMode ? "dark" : "light",
  });

  const labelStyle = {
    fontSize: "0.65rem",
    color: colors.textTertiary,
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  const dividerStyle = {
    width: 1,
    height: 22,
    background: colors.cardBorder,
    flexShrink: 0,
  };

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
        onFiltersChange={(f) => setFilters(f)}
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

        {/* ── SubTab + Filters + Selection — iisang row ── */}
        {steps.length > 0 && (receivedCount > 0 || notYetReceivedCount > 0) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
              flexShrink: 0,
            }}
          >
            {/* SubTabBar */}
            <SubTabBar
              activeSubTab={activeSubTab}
              setActiveSubTab={handleSubTabChange}
              receivedCount={receivedCount}
              notYetCount={notYetReceivedCount}
              colors={colors}
              darkMode={darkMode}
            />

            <div style={dividerStyle} />

            {/* Sent By */}
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
            >
              <span style={labelStyle}>👤 Sent By</span>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search sender..."
                  value={filters.sentBy}
                  onChange={(e) =>
                    setFilters({ ...filters, sentBy: e.target.value })
                  }
                  style={{
                    ...inputStyle(filters.sentBy),
                    width: 110,
                    paddingRight: filters.sentBy ? "1.4rem" : "0.5rem",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
                  onBlur={(e) =>
                    (e.target.style.borderColor = filters.sentBy
                      ? "#4CAF50"
                      : colors.inputBorder)
                  }
                />
                {filters.sentBy && (
                  <button
                    onClick={() => setFilters({ ...filters, sentBy: "" })}
                    style={{
                      position: "absolute",
                      right: "0.35rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: colors.textTertiary,
                      cursor: "pointer",
                      fontSize: "0.65rem",
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div style={dividerStyle} />

            {/* Last Modified */}
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
            >
              <span style={labelStyle}>🕓 Last Modified</span>
              <input
                type="date"
                value={filters.lastModifiedFrom}
                onChange={(e) =>
                  setFilters({ ...filters, lastModifiedFrom: e.target.value })
                }
                style={inputStyle(filters.lastModifiedFrom)}
              />
              <span style={{ fontSize: "0.65rem", color: colors.textTertiary }}>
                to
              </span>
              <input
                type="date"
                value={filters.lastModifiedTo}
                onChange={(e) =>
                  setFilters({ ...filters, lastModifiedTo: e.target.value })
                }
                style={inputStyle(filters.lastModifiedTo)}
              />
              {(filters.lastModifiedFrom || filters.lastModifiedTo) && (
                <button
                  onClick={() =>
                    setFilters({
                      ...filters,
                      lastModifiedFrom: "",
                      lastModifiedTo: "",
                    })
                  }
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: "0.65rem",
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={dividerStyle} />

            {/* Category */}
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
            >
              <span style={labelStyle}>🗂️ Category</span>
              <select
                value={filters.estCat}
                onChange={(e) =>
                  setFilters({ ...filters, estCat: e.target.value })
                }
                style={{
                  ...inputStyle(filters.estCat),
                  cursor: "pointer",
                  color: filters.estCat
                    ? colors.textPrimary
                    : colors.textTertiary,
                }}
              >
                <option value="">All</option>
                {Array.from(
                  new Set(
                    data.map((r) => r.estCat).filter((v) => v && v !== "N/A"),
                  ),
                )
                  .sort()
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              </select>
              {filters.estCat && (
                <button
                  onClick={() => setFilters({ ...filters, estCat: "" })}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: "0.65rem",
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Selection indicator */}
            {selectedRows.length > 0 && (
              <>
                <div style={dividerStyle} />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.2rem 0.6rem",
                    background: darkMode
                      ? "rgba(33,150,243,0.12)"
                      : "rgba(33,150,243,0.08)",
                    border: "1px solid rgba(33,150,243,0.3)",
                    borderRadius: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.68rem",
                      color: "#2196F3",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ✔ {selectedRows.length} record
                    {selectedRows.length > 1 ? "s" : ""} selected
                  </span>
                  <button
                    onClick={() => setSelectedRows([])}
                    style={{
                      fontSize: "0.65rem",
                      color: "#ef4444",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ✕ Clear
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Active filter chips ── */}
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
            {filters.sentBy && (
              <Chip
                label={`Sent By: "${filters.sentBy}"`}
                onRemove={() => setFilters({ ...filters, sentBy: "" })}
                colors={colors}
              />
            )}
            {filters.lastModifiedFrom && (
              <Chip
                label={`From: ${filters.lastModifiedFrom}`}
                onRemove={() =>
                  setFilters({ ...filters, lastModifiedFrom: "" })
                }
                colors={colors}
              />
            )}
            {filters.lastModifiedTo && (
              <Chip
                label={`To: ${filters.lastModifiedTo}`}
                onRemove={() => setFilters({ ...filters, lastModifiedTo: "" })}
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
                  sentBy: "",
                  lastModifiedFrom: "",
                  lastModifiedTo: "",
                  estCat: "",
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
              data={paginatedData}
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
              indexOfFirstRow={indexOfFirstRow + 1}
              indexOfLastRow={Math.min(
                indexOfFirstRow + rowsPerPage,
                displayedTotal,
              )}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              readIds={readIds}
              onMarkAsRead={markAsRead}
              visibleColumnKeys={visibleColumnKeys}
              onVisibleColumnKeysChange={setVisibleColumnKeys}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskPage;
