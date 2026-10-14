// src/pages/EApplicationTasksPage.jsx
import { useState, useMemo, useEffect, useCallback } from "react";
import { getColorScheme } from "../components/reports/utils.js";
import { getUser } from "../api/auth";
import { getWorkflowTasks } from "../api/workflow-tasks";
import { mapEAppTask } from "../components/eapplication/workflowTaskMapper.js";
import { getProcessModule } from "../components/eapplication/processRegistry.js";

/* ──────────────────────────────────────────────────────────
   Two-level task page, fully driven by e_app_history:
   - Top level  = department (Payment Posting, Quality Evaluation).
                  Shown only if the user is in the department's group
                  AND has at least one open task in it.
   - Sub-tabs   = one tab per application_step of the user's open tasks.

   Open tasks = rows of the logged-in user with
   del_last_index = 1 and del_thread = "Open".
   ────────────────────────────────────────────────────────── */

/* Group ids from cdrr_engine.groups */
const GROUP_IDS = {
  CASHIER: 41,
  QUALITY_EVALUATION: 3,
};

/* ADAPT: replace the step names with the real application_step values.
   A task belongs to the department whose `steps` list contains its application_step.
   Steps that are not listed here are ignored by this page (see the console hint below). */
const DEPARTMENTS = [
  {
    key: "payment_posting",
    title: "Payment Posting",
    icon: "💵",
    groupId: GROUP_IDS.CASHIER,
    steps: ["Payment Posting"],
  },
  {
    key: "quality_evaluation",
    title: "Quality Evaluation",
    icon: "🧪",
    groupId: GROUP_IDS.QUALITY_EVALUATION,
    steps: ["QE Review"],
  },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

/* ── Helpers ── */
const getUserGroupIds = (user) => {
  // ADAPT: confirm which field holds the group ids (groups, group_ids, ...)
  const raw = user?.groups ?? user?.group_ids ?? [];
  return raw.map((g) => Number(typeof g === "object" ? g.id : g));
};

const getUserName = (user) =>
  user?.name ??
  user?.full_name ??
  [user?.first_name, user?.last_name].filter(Boolean).join(" ") ??
  "";

/* ── Badges ── */
function PriorityBadge({ priority }) {
  const map = {
    High: { bg: "linear-gradient(135deg,#ef4444,#dc2626)", icon: "🔴" },
    Medium: { bg: "linear-gradient(135deg,#f59e0b,#d97706)", icon: "🟠" },
    Low: { bg: "linear-gradient(135deg,#10b981,#059669)", icon: "🟢" },
  };
  const c = map[priority] || {
    bg: "linear-gradient(135deg,#6b7280,#4b5563)",
    icon: "•",
  };
  return (
    <span
      style={{
        padding: "0.3rem 0.7rem",
        background: c.bg,
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.55rem",
        fontWeight: 700,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        whiteSpace: "nowrap",
      }}
    >
      <span>{c.icon}</span>
      {priority}
    </span>
  );
}

function RefNoBadge({ refNo }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.3rem 0.7rem",
        background: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.55rem",
        fontWeight: 700,
        letterSpacing: "0.5px",
        whiteSpace: "nowrap",
      }}
    >
      {refNo}
    </span>
  );
}

/* ── Page ── */
function EApplicationTasksPage({ darkMode }) {
  const colors = getColorScheme(darkMode);

  const currentUser = useMemo(() => getUser(), []);
  const userGroupIds = useMemo(
    () => getUserGroupIds(currentUser),
    [currentUser],
  );
  const userName = getUserName(currentUser);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [activeDepartment, setActiveDepartment] = useState(null);
  const [activeStep, setActiveStep] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 20 });
  const [detailsTarget, setDetailsTarget] = useState(null);

  /* Open tasks of the logged-in user from e_app_history */
  const loadTasks = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getWorkflowTasks({
        page: 1,
        page_size: 10000,
        user_id: currentUser.id, // ADAPT: use user_uuid if that is what the API expects
        only_latest_per_thread: false,
        del_last_index: 1,
        del_thread: "Open",
      });
      const raw = res.data || [];
      const mapped = raw.map(mapEAppTask);

      // TEMPORARY: remove after confirming the raw column names and step names
      console.log("raw workflow row", raw[0]);
      console.log("application steps found", [
        ...new Set(mapped.map((m) => m.applicationStep)),
      ]);

      setTasks(mapped);
    } catch (err) {
      setLoadError(err.message);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  /* Attach a department to each task using its application_step */
  const tasksWithDepartment = useMemo(
    () =>
      tasks
        .map((t) => ({
          ...t,
          department:
            DEPARTMENTS.find((d) => d.steps.includes(t.applicationStep))?.key ??
            null,
        }))
        .filter((t) => t.department),
    [tasks],
  );

  /* A department is visible only if the user is in its group
     and has at least one open task in it. */
  const visibleDepartments = useMemo(
    () =>
      DEPARTMENTS.filter(
        (d) =>
          userGroupIds.includes(d.groupId) &&
          tasksWithDepartment.some((t) => t.department === d.key),
      ),
    [userGroupIds, tasksWithDepartment],
  );

  /* Derived selection: falls back to the first available option,
     so no effect is needed when tasks change. */
  const currentDepartment =
    visibleDepartments.find((d) => d.key === activeDepartment) ||
    visibleDepartments[0] ||
    null;

  const departmentTasks = useMemo(
    () =>
      currentDepartment
        ? tasksWithDepartment.filter(
            (t) => t.department === currentDepartment.key,
          )
        : [],
    [tasksWithDepartment, currentDepartment],
  );

  const stepTabs = useMemo(() => {
    const counts = new Map();
    departmentTasks.forEach((t) =>
      counts.set(t.applicationStep, (counts.get(t.applicationStep) || 0) + 1),
    );
    return [...counts.entries()].map(([step, count]) => ({ step, count }));
  }, [departmentTasks]);

  const currentStep =
    stepTabs.find((s) => s.step === activeStep)?.step ??
    stepTabs[0]?.step ??
    null;

  const baseData = useMemo(
    () => departmentTasks.filter((t) => t.applicationStep === currentStep),
    [departmentTasks, currentStep],
  );

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return baseData;
    return baseData.filter((row) =>
      [row.referenceNo, row.activity, row.applicantCompany, row.priority]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term)),
    );
  }, [baseData, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice(
    (safePage - 1) * rowsPerPage,
    safePage * rowsPerPage,
  );

  /* ── Handlers ── */
  const resetView = () => {
    setSearchTerm("");
    setCurrentPage(1);
    setOpenMenuId(null);
  };

  const handleDepartmentChange = (key) => {
    setActiveDepartment(key);
    setActiveStep(null);
    resetView();
  };

  const handleStepChange = (step) => {
    setActiveStep(step);
    resetView();
  };

  const handleMenuToggle = (e, rowId) => {
    e.stopPropagation();
    if (openMenuId === rowId) {
      setOpenMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownHeight = 60;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow < dropdownHeight
        ? rect.bottom - dropdownHeight
        : rect.bottom + 4;
    setMenuPosition({ top, right: window.innerWidth - rect.right });
    setOpenMenuId(rowId);
  };

  const getActionMenuOptions = (row) => [
    {
      label: "View Details",
      icon: "👁️",
      handler: () => setDetailsTarget(row),
    },
  ];

  /* ── Early returns (after all hooks) ── */
  if (loading) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: colors.textTertiary,
          fontSize: "0.8rem",
        }}
      >
        Loading tasks...
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "#dc2626",
          fontSize: "0.8rem",
        }}
      >
        Could not load tasks: {loadError}
        <div style={{ marginTop: "0.75rem" }}>
          <button onClick={loadTasks} style={{ cursor: "pointer" }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!currentDepartment) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: colors.textTertiary,
          fontSize: "0.8rem",
        }}
      >
        🔒 You have no open tasks in any queue you have access to.
      </div>
    );
  }

  /* ── Styles ── */
  const thStyle = {
    padding: "0.45rem 0.6rem",
    textAlign: "left",
    fontSize: "0.55rem",
    fontWeight: 600,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: `1px solid ${colors.tableBorder}`,
    whiteSpace: "nowrap",
    background: colors.tableBg,
  };

  const tdStyle = {
    padding: "0.55rem 0.6rem",
    fontSize: "0.68rem",
    color: colors.tableText,
    borderBottom: `1px solid ${colors.tableBorder}`,
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: colors.pageBg,
      }}
    >
      {/* ── Department tabs ── */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          padding: "0.45rem 1.5rem",
          flexShrink: 0,
        }}
      >
        {visibleDepartments.map((dept) => {
          const count = tasksWithDepartment.filter(
            (t) => t.department === dept.key,
          ).length;
          const isActive = currentDepartment.key === dept.key;
          return (
            <button
              key={dept.key}
              onClick={() => handleDepartmentChange(dept.key)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "0.15rem",
                padding: "0.4rem 1.1rem",
                minWidth: "180px",
                background: colors.cardBg,
                border: `1px solid ${colors.cardBorder}`,
                borderLeft: isActive
                  ? "4px solid #4CAF50"
                  : `1px solid ${colors.cardBorder}`,
                borderRadius: "10px",
                cursor: "pointer",
                textAlign: "left",
                boxShadow: isActive
                  ? "0 2px 10px rgba(76,175,80,0.15)"
                  : "0 1px 4px rgba(0,0,0,0.04)",
                transition: "all 0.2s ease",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: isActive ? colors.textPrimary : colors.textTertiary,
                }}
              >
                <span>{dept.icon}</span>
                <span>{dept.title}</span>
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.35rem",
                }}
              >
                <span
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: isActive ? colors.textPrimary : colors.textTertiary,
                    lineHeight: 1,
                  }}
                >
                  {count}
                </span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    color: colors.textTertiary,
                    fontWeight: 500,
                  }}
                >
                  in progress
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Step tabs (one per application_step) ── */}
      <div
        style={{
          padding: "0.5rem 1.5rem 0",
          borderBottom: `1px solid ${colors.cardBorder}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            borderBottom: `2px solid ${colors.cardBorder}`,
          }}
        >
          {stepTabs.map(({ step, count }) => {
            const isActive = currentStep === step;
            return (
              <button
                key={step}
                onClick={() => handleStepChange(step)}
                style={{
                  padding: "6px 14px",
                  fontSize: "12px",
                  background: "transparent",
                  border: "none",
                  borderBottom: isActive
                    ? "2px solid #4CAF50"
                    : "2px solid transparent",
                  color: isActive ? colors.textPrimary : colors.textTertiary,
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  position: "relative",
                  top: "1px",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                }}
              >
                <span>{step}</span>
                <span
                  style={{
                    fontSize: "10px",
                    padding: "1px 6px",
                    borderRadius: "999px",
                    background: isActive ? "#4CAF50" : colors.badgeBg,
                    color: isActive ? "#fff" : colors.textTertiary,
                    border: `0.5px solid ${isActive ? "#4CAF50" : colors.cardBorder}`,
                    fontWeight: 600,
                    minWidth: "20px",
                    textAlign: "center",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: "hidden", padding: "0.85rem 1.5rem" }}>
        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <div
            style={{
              padding: "0.75rem 1.25rem",
              borderBottom: `1px solid ${colors.tableBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <h3
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: colors.textPrimary,
                  margin: 0,
                }}
              >
                {currentStep}
              </h3>
              <span
                style={{
                  padding: "0.2rem 0.6rem",
                  background: colors.badgeBg,
                  borderRadius: "12px",
                  fontSize: "0.68rem",
                  color: colors.textTertiary,
                  fontWeight: 600,
                }}
              >
                {filteredData.length} total
              </span>
              <button
                onClick={loadTasks}
                title="Refresh"
                style={{
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.68rem",
                  borderRadius: "6px",
                  border: `1px solid ${colors.cardBorder}`,
                  background: "transparent",
                  color: colors.textPrimary,
                  cursor: "pointer",
                }}
              >
                🔄 Refresh
              </button>
            </div>
            <div style={{ position: "relative", minWidth: "240px" }}>
              <span
                style={{
                  position: "absolute",
                  left: "0.6rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "0.75rem",
                  color: colors.textTertiary,
                }}
              >
                🔍
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search reference no., activity, company..."
                style={{
                  width: "100%",
                  padding: "0.4rem 0.6rem 0.4rem 1.8rem",
                  fontSize: "0.72rem",
                  borderRadius: "8px",
                  border: `1px solid ${colors.cardBorder}`,
                  background: colors.pageBg,
                  color: colors.textPrimary,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  background: colors.tableBg,
                  zIndex: 5,
                }}
              >
                <tr>
                  <th
                    style={{ ...thStyle, textAlign: "center", width: "50px" }}
                  >
                    #
                  </th>
                  <th style={thStyle}>Reference Number</th>
                  <th style={thStyle}>Activity</th>
                  <th style={thStyle}>Applicant Company</th>
                  <th style={thStyle}>Due Date</th>
                  <th style={thStyle}>Last Modified</th>
                  <th style={thStyle}>Priority</th>
                  <th
                    style={{ ...thStyle, textAlign: "center", width: "120px" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: colors.textTertiary,
                        fontSize: "0.75rem",
                      }}
                    >
                      {searchTerm
                        ? "No matching applications found."
                        : "No tasks in this step."}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, index) => (
                    <tr
                      key={row.id}
                      style={{
                        background:
                          index % 2 === 0
                            ? colors.tableRowEven
                            : colors.tableRowOdd,
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          colors.tableRowHover)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          index % 2 === 0
                            ? colors.tableRowEven
                            : colors.tableRowOdd)
                      }
                    >
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "center",
                          fontWeight: 700,
                          color: colors.textTertiary,
                        }}
                      >
                        {(safePage - 1) * rowsPerPage + index + 1}
                      </td>
                      <td style={tdStyle}>
                        <RefNoBadge refNo={row.referenceNo} />
                      </td>
                      <td style={tdStyle}>{row.activity}</td>
                      <td style={tdStyle}>{row.applicantCompany}</td>
                      <td style={tdStyle}>{row.dueDate || "—"}</td>
                      <td style={tdStyle}>{row.lastModified}</td>
                      <td style={tdStyle}>
                        {row.priority ? (
                          <PriorityBadge priority={row.priority} />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <button
                          onClick={(e) => handleMenuToggle(e, row.id)}
                          style={{
                            padding: "0.4rem",
                            background: "transparent",
                            border: `1px solid ${colors.cardBorder}`,
                            borderRadius: "6px",
                            color: colors.textPrimary,
                            cursor: "pointer",
                            width: "28px",
                            height: "28px",
                          }}
                        >
                          ⋮
                        </button>
                        {openMenuId === row.id && (
                          <>
                            <div
                              onClick={() => setOpenMenuId(null)}
                              style={{
                                position: "fixed",
                                inset: 0,
                                zIndex: 9998,
                              }}
                            />
                            <div
                              style={{
                                position: "fixed",
                                top: `${menuPosition.top}px`,
                                right: `${menuPosition.right}px`,
                                background: colors.cardBg,
                                border: `1px solid ${colors.cardBorder}`,
                                borderRadius: "8px",
                                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                                minWidth: "190px",
                                zIndex: 9999,
                                overflow: "hidden",
                              }}
                            >
                              {getActionMenuOptions(row).map((item, i) => (
                                <button
                                  key={item.label}
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    item.handler();
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "0.6rem 0.85rem",
                                    background: "transparent",
                                    border: "none",
                                    borderTop:
                                      i === 0
                                        ? "none"
                                        : `1px solid ${colors.tableBorder}`,
                                    color: colors.textPrimary,
                                    fontSize: "0.78rem",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                  }}
                                >
                                  <span>{item.icon}</span>
                                  <span>{item.label}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredData.length > 0 && (
            <div
              style={{
                padding: "0.6rem 1.25rem",
                borderTop: `1px solid ${colors.tableBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <span
                  style={{ fontSize: "0.68rem", color: colors.textTertiary }}
                >
                  Showing {(safePage - 1) * rowsPerPage + 1}–
                  {Math.min(safePage * rowsPerPage, filteredData.length)} of{" "}
                  {filteredData.length}
                </span>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    fontSize: "0.68rem",
                    color: colors.textTertiary,
                  }}
                >
                  Rows per page
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: "0.25rem 0.4rem",
                      fontSize: "0.68rem",
                      borderRadius: "6px",
                      border: `1px solid ${colors.cardBorder}`,
                      background: colors.pageBg,
                      color: colors.textPrimary,
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  style={{
                    padding: "0.3rem 0.6rem",
                    fontSize: "0.68rem",
                    borderRadius: "6px",
                    border: `1px solid ${colors.cardBorder}`,
                    background: colors.pageBg,
                    color:
                      safePage === 1 ? colors.textTertiary : colors.textPrimary,
                    cursor: safePage === 1 ? "not-allowed" : "pointer",
                  }}
                >
                  ‹ Prev
                </button>
                <span
                  style={{
                    fontSize: "0.68rem",
                    color: colors.textTertiary,
                    padding: "0 0.4rem",
                  }}
                >
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={safePage === totalPages}
                  style={{
                    padding: "0.3rem 0.6rem",
                    fontSize: "0.68rem",
                    borderRadius: "6px",
                    border: `1px solid ${colors.cardBorder}`,
                    background: colors.pageBg,
                    color:
                      safePage === totalPages
                        ? colors.textTertiary
                        : colors.textPrimary,
                    cursor: safePage === totalPages ? "not-allowed" : "pointer",
                  }}
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Details modal, resolved per process through the registry ── */}
      {detailsTarget &&
        (() => {
          const { DetailsModal } = getProcessModule(detailsTarget.processCode);
          return (
            <DetailsModal
              key={detailsTarget.id}
              row={detailsTarget}
              colors={colors}
              cashierName={userName}
              cashierPosition="Cashier"
              onPosted={loadTasks}
              onClose={() => setDetailsTarget(null)}
            />
          );
        })()}
    </div>
  );
}

export default EApplicationTasksPage;
