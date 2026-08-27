import React, { useState, useMemo, useEffect } from "react";
import { Avatar } from "./Avatar";
import { MiniBadge } from "./MiniBadge";
import { StatusPill } from "./StatusPill";
import { inputStyle, thStyle, tdStyle } from "./sharedStyles";

export const ALL_MEMBERS_ID = "__ALL_MEMBERS__";

function TargetStatusFilterToggle({ value, onChange, colors }) {
  const states = ["", "targeted", "not_targeted"];
  const labels = {
    "": "All",
    targeted: "🎯 Targeted",
    not_targeted: "Not targeted",
  };
  const styles = {
    "": { background: "transparent", color: colors.textSecondary },
    targeted: {
      background: "rgba(34, 197, 94, 0.15)",
      color: colors.targetBorder,
    },
    not_targeted: { background: colors.rowHover, color: colors.textSecondary },
  };
  const cycle = () => {
    const idx = states.indexOf(value || "");
    onChange(states[(idx + 1) % states.length]);
  };
  return (
    <button
      type="button"
      onClick={cycle}
      style={{
        padding: "6px 12px",
        borderRadius: "6px",
        border: `1px solid ${colors.cardBorder}`,
        fontSize: "0.75rem",
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
        ...styles[value || ""],
      }}
      title="Click to cycle: All → Targeted → Not targeted"
    >
      {labels[value || ""]}
    </button>
  );
}

// ── Confirmation modal before bulk-removing the "Target" flag from
//    several tasks at once — same idea as UnmarkConfirmModal on the
//    Directors diagram, prevents an accidental click from instantly
//    removing targets with no way to undo it. ─────────────────────
function BulkRemoveConfirmModal({
  colors,
  count,
  onClose,
  onConfirm,
  submitting,
  error,
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380,
          maxWidth: "90vw",
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "10px",
          padding: "1.25rem",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontSize: "0.95rem",
            fontWeight: 700,
            color: colors.textPrimary,
            marginBottom: "0.5rem",
          }}
        >
          Remove Target from {count} task{count === 1 ? "" : "s"}?
        </div>
        <div
          style={{
            fontSize: "0.8rem",
            color: colors.textSecondary,
            marginBottom: "1rem",
            lineHeight: 1.5,
          }}
        >
          This will remove the Target flag from all {count} selected task
          {count === 1 ? "" : "s"}. You can mark them again later if needed.
        </div>

        {error && (
          <div
            style={{
              fontSize: "0.76rem",
              color: "#ef4444",
              marginBottom: "0.75rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}
        >
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "none",
              background: "#ef4444",
              color: "#fff",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Removing…" : "✕ Remove Target"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  onBulkRemoveTarget,
}) {
  const selectedMember =
    team.find((m) => m.member_user_id === selectedMemberId) || null;

  // ── Search & filters ────────────────────────────────────────────
  const [searchDtn, setSearchDtn] = useState("");
  const [filterStep, setFilterStep] = useState("");
  const [filterStatus, setFilterStatus] = useState("IN PROGRESS");
  const [showDirectorsOnly, setShowDirectorsOnly] = useState(false);

  const [targetStatusFilter, setTargetStatusFilter] = useState("");

  // ── Pagination ──────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ── Bulk selection ──────────────────────────────────────────────
  const [selectedLogIds, setSelectedLogIds] = useState(new Set());

  // ── Bulk-remove-target confirmation modal state ──────────────────
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);
  const [removeError, setRemoveError] = useState(null);

  const isAllMembersView = selectedMemberId === ALL_MEMBERS_ID;

  // Reset per-member UI state when switching members
  useEffect(() => {
    setSearchDtn("");
    setFilterStep("");
    setFilterStatus("IN PROGRESS");
    setShowDirectorsOnly(false);
    setTargetStatusFilter("");
    setSelectedLogIds(new Set());
    setCurrentPage(1);
  }, [selectedMemberId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchDtn,
    filterStep,
    filterStatus,
    showDirectorsOnly,
    targetStatusFilter,
  ]);

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
      if (showDirectorsOnly && !t.is_directors_target) return false;
      if (targetStatusFilter === "targeted" && !t.is_targeted) return false;
      if (targetStatusFilter === "not_targeted" && t.is_targeted) return false;
      return true;
    });
  }, [
    tasks,
    searchDtn,
    filterStep,
    filterStatus,
    showDirectorsOnly,
    targetStatusFilter,
  ]);

  // ── Derived: paginated slice of filteredTasks ─────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const indexOfFirstRow = (safePage - 1) * rowsPerPage;
  const paginatedTasks = filteredTasks.slice(
    indexOfFirstRow,
    indexOfFirstRow + rowsPerPage,
  );

  // ── Derived: header stats (based on all of this member's tasks, not filtered) ──
  const totalTaskCount = tasks.length;
  const inProgressTaskCount = useMemo(
    () => tasks.filter((t) => t.status === "IN PROGRESS").length,
    [tasks],
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

  // ── Selected tasks that are ALREADY targeted — the only ones a bulk
  //    "Remove Target" action actually applies to. Mixed selections
  //    (some targeted, some not) are fine — this just filters down to
  //    the relevant subset. ──────────────────────────────────────────
  const selectedTargetedTasks = tasks.filter(
    (t) => selectedLogIds.has(t.log_id) && t.is_targeted,
  );

  const handleConfirmBulkRemove = async () => {
    if (selectedTargetedTasks.length === 0) return;
    setRemoveSubmitting(true);
    setRemoveError(null);
    try {
      await onBulkRemoveTarget(selectedTargetedTasks.map((t) => t.log_id));
      setSelectedLogIds(new Set());
      setRemoveConfirmOpen(false);
    } catch (err) {
      setRemoveError(err.message);
    } finally {
      setRemoveSubmitting(false);
    }
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
            <>
              <div
                onClick={() => onSelectMember(ALL_MEMBERS_ID)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.65rem 1rem",
                  cursor: "pointer",
                  background: isAllMembersView
                    ? colors.selectedBg
                    : "transparent",
                  borderLeft: `3px solid ${isAllMembersView ? colors.selectedBorder : "transparent"}`,
                  borderBottom: `1px solid ${colors.cardBorder}`,
                  transition: "background 0.15s",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: colors.rowHover,
                    border: `1px solid ${colors.cardBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.9rem",
                    flexShrink: 0,
                  }}
                >
                  👥
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                    All Members
                  </div>
                  <div
                    style={{ fontSize: "0.7rem", color: colors.textTertiary }}
                  >
                    View every member's tasks together
                  </div>
                </div>
              </div>
              {team.map((m) => {
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
                      background: isSelected
                        ? colors.selectedBg
                        : "transparent",
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
                          marginBottom: "0.4rem",
                        }}
                      >
                        {m.lead_role}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "5px",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            border: `1px solid ${colors.cardBorder}`,
                            background: colors.rowHover,
                            minWidth: 48,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 800,
                              color: colors.textPrimary,
                              lineHeight: 1.1,
                            }}
                          >
                            {m.task_count}
                          </span>
                          <span
                            style={{
                              fontSize: "0.52rem",
                              color: colors.textTertiary,
                              textTransform: "uppercase",
                              letterSpacing: "0.02em",
                            }}
                          >
                            Total
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            border: "1px solid #3b82f6",
                            background: "rgba(59, 130, 246, 0.12)",
                            minWidth: 48,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 800,
                              color: "#60a5fa",
                              lineHeight: 1.1,
                            }}
                          >
                            {m.in_progress_count}
                          </span>
                          <span
                            style={{
                              fontSize: "0.52rem",
                              color: "#60a5fa",
                              textTransform: "uppercase",
                              letterSpacing: "0.02em",
                            }}
                          >
                            In Progress
                          </span>
                        </div>
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
                        {m.directors_target_count > 0 && (
                          <MiniBadge
                            label="🏛️"
                            value={m.directors_target_count}
                            colors={colors}
                            tone="directors"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
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
        {!selectedMember && !isAllMembersView ? (
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
              {isAllMembersView ? (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: colors.rowHover,
                    border: `1px solid ${colors.cardBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    flexShrink: 0,
                  }}
                >
                  👥
                </div>
              ) : (
                <Avatar name={selectedMember.member_name} colors={colors} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>
                  {isAllMembersView
                    ? "All Members"
                    : selectedMember.member_name}
                </div>
                <div
                  style={{ fontSize: "0.75rem", color: colors.textSecondary }}
                >
                  {isAllMembersView
                    ? `Tasks across all ${team.length} team members — select which ones to mark as target`
                    : "Currently assigned tasks — select which ones to mark as target"}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "4px 12px",
                    borderRadius: "8px",
                    border: `1px solid ${colors.cardBorder}`,
                    background: colors.rowHover,
                    minWidth: 64,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: colors.textPrimary,
                    }}
                  >
                    {totalTaskCount}
                  </span>
                  <span
                    style={{
                      fontSize: "0.62rem",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    Total Tasks
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "4px 12px",
                    borderRadius: "8px",
                    border: "1px solid #3b82f6",
                    background: "rgba(59, 130, 246, 0.12)",
                    minWidth: 64,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: "#60a5fa",
                    }}
                  >
                    {inProgressTaskCount}
                  </span>
                  <span
                    style={{
                      fontSize: "0.62rem",
                      color: "#60a5fa",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    In Progress
                  </span>
                </div>
              </div>
              {selectedLogIds.size > 0 && (
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  {selectedTargetedTasks.length > 0 && (
                    <button
                      onClick={() => {
                        setRemoveError(null);
                        setRemoveConfirmOpen(true);
                      }}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: "1px solid #ef4444",
                        background: "transparent",
                        color: "#ef4444",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ✕ Remove Target ({selectedTargetedTasks.length})
                    </button>
                  )}
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
                </div>
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
                alignItems: "center",
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

              <TargetStatusFilterToggle
                value={targetStatusFilter}
                onChange={setTargetStatusFilter}
                colors={colors}
              />

              {/* CDRR Target toggle */}
              <button
                type="button"
                onClick={() => setShowDirectorsOnly((v) => !v)}
                aria-pressed={showDirectorsOnly}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "5px 10px 5px 6px",
                  borderRadius: "999px",
                  border: `1px solid ${showDirectorsOnly ? "#a855f7" : colors.cardBorder}`,
                  background: showDirectorsOnly
                    ? "rgba(168, 85, 247, 0.15)"
                    : "transparent",
                  color: showDirectorsOnly ? "#c084fc" : colors.textSecondary,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    position: "relative",
                    width: 30,
                    height: 16,
                    borderRadius: "999px",
                    background: showDirectorsOnly
                      ? "#a855f7"
                      : colors.cardBorder,
                    transition: "background 0.15s",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: showDirectorsOnly ? 16 : 2,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.15s",
                    }}
                  />
                </span>
                🏛️ CDRR Target only
              </button>

              {(searchDtn ||
                filterStep ||
                filterStatus ||
                showDirectorsOnly ||
                targetStatusFilter) && (
                <button
                  onClick={() => {
                    setSearchDtn("");
                    setFilterStep("");
                    setFilterStatus("");
                    setShowDirectorsOnly(false);
                    setTargetStatusFilter("");
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
                      : showDirectorsOnly
                        ? "No CDRR Target tasks match your search/filters."
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
                        {isAllMembersView && (
                          <th style={thStyle(colors)}>Member</th>
                        )}
                        <th style={thStyle(colors)}>DTN</th>
                        <th style={thStyle(colors)}>Brand Name</th>
                        <th style={thStyle(colors)}>Step</th>
                        <th style={thStyle(colors)}>Status</th>
                        <th style={thStyle(colors)}>App Type</th>
                        <th style={thStyle(colors)}>Processing Type</th>
                        <th style={thStyle(colors)}>Timeline</th>
                        <th style={thStyle(colors)}>Date Received (Center)</th>
                        <th style={thStyle(colors)}>CDRR Target</th>
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
                          {isAllMembersView && (
                            <td
                              style={{
                                ...tdStyle(colors),
                                color: colors.textSecondary,
                              }}
                            >
                              {t.member_name}
                            </td>
                          )}
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
                                  🏛️ CDRR Target
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

      {removeConfirmOpen && (
        <BulkRemoveConfirmModal
          colors={colors}
          count={selectedTargetedTasks.length}
          onClose={() => {
            if (!removeSubmitting) setRemoveConfirmOpen(false);
          }}
          onConfirm={handleConfirmBulkRemove}
          submitting={removeSubmitting}
          error={removeError}
        />
      )}
    </div>
  );
}

export default ListView;
