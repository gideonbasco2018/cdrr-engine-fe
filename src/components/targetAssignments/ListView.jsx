import React, { useState, useMemo, useEffect } from "react";
import { Avatar } from "./Avatar";
import { MiniBadge } from "./MiniBadge";
import { StatusPill } from "./StatusPill";
import { inputStyle, thStyle, tdStyle } from "./sharedStyles";

// ── List View tab: left = My Team, right = selected member's tasks
// (search/filter/pagination/bulk-select + Mark as Target actions) ───
export function ListView({
  colors,
  team,
  teamLoading,
  teamError,
  selectedMemberId,
  onSelectMember,
  tasks,
  tasksLoading,
  tasksError,
  onOpenTargetModal,
  onOpenBulkModal,
}) {
  const selectedMember =
    team.find((m) => m.member_user_id === selectedMemberId) || null;

  // ── Search & filters ────────────────────────────────────────────
  const [searchDtn, setSearchDtn] = useState("");
  const [filterStep, setFilterStep] = useState("");
  const [filterStatus, setFilterStatus] = useState("IN PROGRESS");

  // ── Pagination ──────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ── Bulk selection ──────────────────────────────────────────────
  const [selectedLogIds, setSelectedLogIds] = useState(new Set());

  // Reset per-member UI state when switching members
  useEffect(() => {
    setSearchDtn("");
    setFilterStep("");
    setFilterStatus("IN PROGRESS");
    setSelectedLogIds(new Set());
    setCurrentPage(1);
  }, [selectedMemberId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchDtn, filterStep, filterStatus]);

  // ── Derived: dropdown options from the current member's tasks ──
  const stepOptions = useMemo(
    () => [...new Set(tasks.map((t) => t.step).filter(Boolean))],
    [tasks],
  );
  const statusOptions = useMemo(
    () => [...new Set(tasks.map((t) => t.status).filter(Boolean))],
    [tasks],
  );

  // ── Derived: filtered task list ──────────────────────────────────
  const filteredTasks = useMemo(() => {
    const dtnQuery = searchDtn.trim();
    return tasks.filter((t) => {
      if (dtnQuery && !String(t.dtn ?? "").includes(dtnQuery)) return false;
      if (filterStep && t.step !== filterStep) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      return true;
    });
  }, [tasks, searchDtn, filterStep, filterStatus]);

  // ── Derived: paginated slice of filteredTasks ─────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const indexOfFirstRow = (safePage - 1) * rowsPerPage;
  const paginatedTasks = filteredTasks.slice(
    indexOfFirstRow,
    indexOfFirstRow + rowsPerPage,
  );

  const allFilteredSelected =
    filteredTasks.length > 0 &&
    filteredTasks.every((t) => selectedLogIds.has(t.log_id));

  const toggleSelectAll = () => {
    setSelectedLogIds((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        filteredTasks.forEach((t) => next.delete(t.log_id));
        return next;
      }
      const next = new Set(prev);
      filteredTasks.forEach((t) => next.add(t.log_id));
      return next;
    });
  };

  const toggleSelectOne = (logId) => {
    setSelectedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  };

  const handleOpenBulkModal = () => {
    const selectedTasks = tasks.filter((t) => selectedLogIds.has(t.log_id));
    if (selectedTasks.length > 0) onOpenBulkModal(selectedTasks);
  };

  return (
    <div style={{ flex: 1, display: "flex", gap: "1rem", minHeight: 0 }}>
      {/* LEFT: MY TEAM */}
      <div
        style={{
          width: 300,
          flexShrink: 0,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "10px",
          background: colors.cardBg,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "0.75rem 1rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            fontSize: "0.75rem",
            fontWeight: 700,
            color: colors.textSecondary,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          My Team ({team.length})
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {teamLoading ? (
            <div
              style={{
                padding: "1.5rem",
                color: colors.textTertiary,
                fontSize: "0.85rem",
              }}
            >
              Loading team…
            </div>
          ) : teamError ? (
            <div
              style={{
                padding: "1.5rem",
                color: "#ef4444",
                fontSize: "0.85rem",
              }}
            >
              {teamError}
            </div>
          ) : team.length === 0 ? (
            <div
              style={{
                padding: "1.5rem",
                color: colors.textTertiary,
                fontSize: "0.85rem",
              }}
            >
              No team members assigned to you yet.
            </div>
          ) : (
            team.map((m) => {
              const isSelected = m.member_user_id === selectedMemberId;
              return (
                <div
                  key={m.lead_assignment_id}
                  onClick={() => onSelectMember(m.member_user_id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.65rem",
                    padding: "0.65rem 1rem",
                    cursor: "pointer",
                    background: isSelected ? colors.selectedBg : "transparent",
                    borderLeft: `3px solid ${isSelected ? colors.selectedBorder : "transparent"}`,
                    borderBottom: `1px solid ${colors.cardBorder}`,
                    transition: "background 0.15s",
                  }}
                >
                  <Avatar name={m.member_name} colors={colors} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {m.member_name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: colors.textTertiary,
                        marginBottom: "0.3rem",
                      }}
                    >
                      {m.lead_role} · {m.task_count} task
                      {m.task_count !== 1 ? "s" : ""}
                    </div>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}
                    >
                      <MiniBadge
                        label="In Progress"
                        value={m.in_progress_count}
                        colors={colors}
                        tone="blue"
                      />
                      <MiniBadge
                        label="Completed"
                        value={m.completed_count}
                        colors={colors}
                        tone="green"
                      />
                      {m.target_count > 0 && (
                        <MiniBadge
                          label="🎯"
                          value={m.target_count}
                          colors={colors}
                          tone="target"
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: SELECTED MEMBER'S TASKS */}
      <div
        style={{
          flex: 1,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "10px",
          background: colors.cardBg,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {!selectedMember ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: colors.textTertiary,
            }}
          >
            Select a team member to view their tasks.
          </div>
        ) : (
          <>
            <div
              style={{
                padding: "0.85rem 1.1rem",
                borderBottom: `1px solid ${colors.cardBorder}`,
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <Avatar name={selectedMember.member_name} colors={colors} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>
                  {selectedMember.member_name}
                </div>
                <div
                  style={{ fontSize: "0.75rem", color: colors.textSecondary }}
                >
                  Currently assigned tasks — select which ones to mark as target
                </div>
              </div>
              {selectedLogIds.size > 0 && (
                <button
                  onClick={handleOpenBulkModal}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: "none",
                    background: colors.targetBorder,
                    color: "#fff",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  🎯 Target {selectedLogIds.size} Selected
                </button>
              )}
            </div>

            {/* SEARCH & FILTERS */}
            <div
              style={{
                padding: "0.6rem 1.1rem",
                borderBottom: `1px solid ${colors.cardBorder}`,
                display: "flex",
                gap: "0.6rem",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                placeholder="Search DTN…"
                value={searchDtn}
                onChange={(e) => setSearchDtn(e.target.value)}
                style={{ ...inputStyle(colors), width: 180 }}
              />
              <select
                value={filterStep}
                onChange={(e) => setFilterStep(e.target.value)}
                style={{ ...inputStyle(colors), width: 170 }}
              >
                <option value="">All Steps</option>
                {stepOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ ...inputStyle(colors), width: 170 }}
              >
                <option value="">All Statuses</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {(searchDtn || filterStep || filterStatus) && (
                <button
                  onClick={() => {
                    setSearchDtn("");
                    setFilterStep("");
                    setFilterStatus("");
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${colors.cardBorder}`,
                    background: "transparent",
                    color: colors.textSecondary,
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              <div style={{ overflowY: "auto", flex: 1 }}>
                {tasksLoading ? (
                  <div
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: colors.textTertiary,
                      fontSize: "0.85rem",
                    }}
                  >
                    Loading tasks…
                  </div>
                ) : tasksError ? (
                  <div
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: "#ef4444",
                      fontSize: "0.85rem",
                    }}
                  >
                    {tasksError}
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: colors.textTertiary,
                      fontSize: "0.85rem",
                    }}
                  >
                    {tasks.length === 0
                      ? "No active tasks assigned to this user right now."
                      : "No tasks match your search/filters."}
                  </div>
                ) : (
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.82rem",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: colors.rowHover,
                          textAlign: "left",
                        }}
                      >
                        <th style={{ ...thStyle(colors), width: 34 }}>
                          <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            onChange={toggleSelectAll}
                          />
                        </th>
                        <th style={thStyle(colors)}>DTN</th>
                        <th style={thStyle(colors)}>Brand Name</th>
                        <th style={thStyle(colors)}>Step</th>
                        <th style={thStyle(colors)}>Status</th>
                        <th style={thStyle(colors)}>App Type</th>
                        <th style={thStyle(colors)}>Processing Type</th>
                        <th style={thStyle(colors)}>Timeline</th>
                        <th style={thStyle(colors)}>Date Received (Center)</th>
                        <th style={thStyle(colors)}>Director's Target</th>
                        <th style={thStyle(colors)}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTasks.map((t) => (
                        <tr
                          key={t.log_id}
                          style={{
                            borderTop: `1px solid ${colors.cardBorder}`,
                            background: t.is_targeted
                              ? colors.targetBg
                              : "transparent",
                          }}
                        >
                          <td style={tdStyle(colors)}>
                            <input
                              type="checkbox"
                              checked={selectedLogIds.has(t.log_id)}
                              onChange={() => toggleSelectOne(t.log_id)}
                            />
                          </td>
                          <td style={tdStyle(colors)}>{t.dtn}</td>
                          <td style={{ ...tdStyle(colors), fontWeight: 600 }}>
                            {t.brand_name}
                            {t.is_targeted && t.target_end_date && (
                              <div
                                style={{
                                  fontWeight: 400,
                                  fontSize: "0.7rem",
                                  color: colors.targetBorder,
                                  marginTop: 2,
                                }}
                              >
                                🎯 {t.target_start_date} → {t.target_end_date}
                              </div>
                            )}
                          </td>
                          <td style={tdStyle(colors)}>{t.step}</td>
                          <td style={tdStyle(colors)}>
                            <StatusPill status={t.status} />
                          </td>
                          <td style={tdStyle(colors)}>{t.app_type || "—"}</td>
                          <td style={tdStyle(colors)}>
                            {t.processing_type || "—"}
                          </td>
                          <td style={tdStyle(colors)}>
                            {t.timeline != null ? `${t.timeline} days` : "—"}
                          </td>
                          <td style={tdStyle(colors)}>
                            {t.date_received_center || "—"}
                          </td>
                          <td style={tdStyle(colors)}>
                            {t.is_directors_target ? (
                              <div>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "3px 8px",
                                    borderRadius: "999px",
                                    background: "rgba(168, 85, 247, 0.15)",
                                    border: "1px solid #a855f7",
                                    color: "#c084fc",
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  🏛️ Director's Target
                                </span>
                                {(t.directors_target_start_date ||
                                  t.directors_target_end_date) && (
                                  <div
                                    style={{
                                      fontSize: "0.68rem",
                                      color: colors.textTertiary,
                                      marginTop: 3,
                                    }}
                                  >
                                    {t.directors_target_start_date} →{" "}
                                    {t.directors_target_end_date}
                                  </div>
                                )}
                                {t.directors_target_remarks && (
                                  <div
                                    style={{
                                      fontSize: "0.68rem",
                                      color: colors.textSecondary,
                                      marginTop: 2,
                                      maxWidth: 180,
                                      whiteSpace: "normal",
                                      overflowWrap: "break-word",
                                    }}
                                  >
                                    📝 {t.directors_target_remarks}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span
                                style={{
                                  color: colors.textTertiary,
                                  fontSize: "0.78rem",
                                }}
                              >
                                —
                              </span>
                            )}
                          </td>
                          <td
                            style={{ ...tdStyle(colors), textAlign: "right" }}
                          >
                            <button
                              onClick={() => onOpenTargetModal(t)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                border: `1px solid ${t.is_targeted ? colors.targetBorder : colors.cardBorder}`,
                                background: t.is_targeted
                                  ? colors.targetBorder
                                  : "transparent",
                                color: t.is_targeted
                                  ? "#fff"
                                  : colors.textSecondary,
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {t.is_targeted ? "🎯 Targeted" : "Mark as Target"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {filteredTasks.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    padding: "0.6rem 1.1rem",
                    borderTop: `1px solid ${colors.cardBorder}`,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontSize: "0.72rem",
                      color: colors.textSecondary,
                    }}
                  >
                    <span>Rows per page:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: "3px 6px",
                        borderRadius: "6px",
                        border: `1px solid ${colors.cardBorder}`,
                        background: colors.pageBg,
                        color: colors.textPrimary,
                        fontSize: "0.72rem",
                        cursor: "pointer",
                      }}
                    >
                      {[10, 25, 50, 100].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <span>
                      {indexOfFirstRow + 1}–
                      {Math.min(
                        indexOfFirstRow + rowsPerPage,
                        filteredTasks.length,
                      )}{" "}
                      of {filteredTasks.length}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={safePage === 1}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        border: `1px solid ${colors.cardBorder}`,
                        background: "transparent",
                        color: colors.textSecondary,
                        fontSize: "0.72rem",
                        cursor: safePage === 1 ? "default" : "pointer",
                        opacity: safePage === 1 ? 0.4 : 1,
                      }}
                    >
                      « First
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        border: `1px solid ${colors.cardBorder}`,
                        background: "transparent",
                        color: colors.textSecondary,
                        fontSize: "0.72rem",
                        cursor: safePage === 1 ? "default" : "pointer",
                        opacity: safePage === 1 ? 0.4 : 1,
                      }}
                    >
                      ‹ Prev
                    </button>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: colors.textPrimary,
                        fontWeight: 600,
                        padding: "0 0.3rem",
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
                        padding: "4px 8px",
                        borderRadius: "6px",
                        border: `1px solid ${colors.cardBorder}`,
                        background: "transparent",
                        color: colors.textSecondary,
                        fontSize: "0.72rem",
                        cursor: safePage === totalPages ? "default" : "pointer",
                        opacity: safePage === totalPages ? 0.4 : 1,
                      }}
                    >
                      Next ›
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={safePage === totalPages}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        border: `1px solid ${colors.cardBorder}`,
                        background: "transparent",
                        color: colors.textSecondary,
                        fontSize: "0.72rem",
                        cursor: safePage === totalPages ? "default" : "pointer",
                        opacity: safePage === totalPages ? 0.4 : 1,
                      }}
                    >
                      Last »
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ListView;
