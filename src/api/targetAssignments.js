// src/api/targetAssignments.js
import API from "./axios";

// ─────────────────────────────────────────────
// GET /api/target_assignments/lead-assignments/my-team
// Team members assigned to the logged-in lead, with task/target counts
// ─────────────────────────────────────────────
export const getMyTeam = async () => {
  try {
    const response = await API.get("/target_assignments/lead-assignments/my-team");
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch team";
    throw new Error(errorMessage);
  }
};

// ─────────────────────────────────────────────
// GET /api/target_assignments/lead-assignments/my-team/{memberUserId}/tasks
// Active tasks currently held by a given team member
// ─────────────────────────────────────────────
export const getMemberTasks = async (memberUserId) => {
  try {
    const response = await API.get(
      `/target_assignments/lead-assignments/my-team/${memberUserId}/tasks`
    );
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch member tasks";
    throw new Error(errorMessage);
  }
};

// ─────────────────────────────────────────────
// GET /api/target_assignments/lead-assignments/all-teams
// Admin/monitoring view — every active team across all leads
// ─────────────────────────────────────────────
export const getAllTeams = async () => {
  try {
    const response = await API.get("/target_assignments/lead-assignments/all-teams");
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch all teams";
    throw new Error(errorMessage);
  }
};

// ─────────────────────────────────────────────
// GET /api/target_assignments/lead-assignments/all-teams/{memberUserId}/tasks
// Admin/monitoring view — tasks for any member, regardless of who leads them
// ─────────────────────────────────────────────
export const getAllTeamsMemberTasks = async (memberUserId) => {
  try {
    const response = await API.get(
      `/target_assignments/lead-assignments/all-teams/${memberUserId}/tasks`
    );
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch member tasks";
    throw new Error(errorMessage);
  }
};

export const getAllTeamsMemberInProgressTasks = async (
  memberUserId,
  {
    page = 1,
    pageSize = 20,
    dtn,
    dateFrom,
    dateTo,
    step,
    appType,
    productClass,
    processingType,
    entryType,
    directorsTarget,
    sortBy,
    sortDir,
  } = {}
) => {
  try {
    const response = await API.get(
      `/target_assignments/lead-assignments/all-teams/${memberUserId}/tasks/in-progress`,
      {
        params: {
          page,
          page_size: pageSize,
          dtn: dtn || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          step: step || undefined,
          app_type: appType || undefined,
          product_class: productClass || undefined,
          processing_type: processingType || undefined,
          entry_type: entryType || undefined,
          directors_target: directorsTarget || undefined,
          sort_by: sortBy || undefined,
          sort_dir: sortDir || undefined,
        },
      }
    );
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch in-progress tasks";
    throw new Error(errorMessage);
  }
};

// ─────────────────────────────────────────────
// POST /api/target_assignments/target-assignments
// Marks a task (application_log) as target, with a target date range
// ─────────────────────────────────────────────
export const markAsTarget = async (applicationLogId, { targetStartDate, targetEndDate, remarks = "" }) => {
  try {
    const response = await API.post("/target_assignments/target-assignments", {
      application_log_id: applicationLogId,
      target_start_date: targetStartDate,
      target_end_date: targetEndDate,
      remarks,
    });
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to mark task as target";
    throw new Error(errorMessage);
  }
};

// ─────────────────────────────────────────────
// POST /api/target_assignments/target-assignments/bulk
// Marks several tasks as target at once, same date range/remarks
// ─────────────────────────────────────────────
export const bulkMarkAsTarget = async (
  applicationLogIds,
  { targetStartDate, targetEndDate, remarks = "" }
) => {
  try {
    const response = await API.post("/target_assignments/target-assignments/bulk", {
      application_log_ids: applicationLogIds,
      target_start_date: targetStartDate,
      target_end_date: targetEndDate,
      remarks,
    });
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to bulk-mark tasks as target";
    throw new Error(errorMessage);
  }
};

// ─────────────────────────────────────────────
// DELETE /api/target_assignments/target-assignments/{applicationLogId}
// Unmarks a task as target
// ─────────────────────────────────────────────
export const unmarkAsTarget = async (applicationLogId) => {
  try {
    const response = await API.delete(
      `/target_assignments/target-assignments/${applicationLogId}`
    );
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to unmark task as target";
    throw new Error(errorMessage);
  }
};
// ─────────────────────────────────────────────
// POST /api/target_assignments/target-assignments/directors-target
// Marks a task as Director's Target (system-wide, not lead-scoped)
// ─────────────────────────────────────────────
export const markAsDirectorsTarget = async (
  logId,
  { targetStartDate, targetEndDate, remarks = "" },
) => {
  try {
    const response = await API.post(
      "/target_assignments/target-assignments/directors-target",
      {
        application_log_id: logId,
        target_start_date: targetStartDate,
        target_end_date: targetEndDate,
        remarks,
      },
    );
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to mark task as director's target";
    throw new Error(errorMessage);
  }
};

// ─────────────────────────────────────────────
// POST /api/target_assignments/target-assignments/directors-target/bulk
// Marks several tasks as Director's Target at once, same date range/remarks
// ─────────────────────────────────────────────
export const bulkMarkAsDirectorsTarget = async (
  logIds,
  { targetStartDate, targetEndDate, remarks = "" },
) => {
  try {
    const response = await API.post(
      "/target_assignments/target-assignments/directors-target/bulk",
      {
        application_log_ids: logIds,
        target_start_date: targetStartDate,
        target_end_date: targetEndDate,
        remarks,
      },
    );
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to bulk-mark tasks as director's target";
    throw new Error(errorMessage);
  }
};

// ─────────────────────────────────────────────
// DELETE /api/target_assignments/target-assignments/directors-target/{logId}
// Unmarks a task as Director's Target
// ─────────────────────────────────────────────
export const unmarkAsDirectorsTarget = async (logId) => {
  try {
    const response = await API.delete(
      `/target_assignments/target-assignments/directors-target/${logId}`,
    );
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to unmark task as director's target";
    throw new Error(errorMessage);
  }
};

export const getUnitInProgressSummary = async (unitId) => {
  try {
    const response = await API.get(
      `/target_assignments/lead-assignments/all-teams/${unitId}/in-progress-summary`
    );
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch unit summary";
    throw new Error(errorMessage);
  }
};


export const getUnitInProgressTasks = async (
  unitId,
  {
    page = 1,
    pageSize = 20,
    step,
    appType,
    productClass,
    processingType,
    dtn,
    dateFrom,
    dateTo,
    entryType,
    memberName,
    directorsTarget,
    sortBy,
    sortDir,
  } = {}
) => {
  try {
    const response = await API.get(
      `/target_assignments/lead-assignments/all-teams/units/${unitId}/tasks/in-progress`,
      {
        params: {
          page,
          page_size: pageSize,
          step: step || undefined,
          app_type: appType || undefined,
          product_class: productClass || undefined,
          processing_type: processingType || undefined,
          dtn: dtn || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          entry_type: entryType || undefined,
          member_name: memberName || undefined,
          directors_target: directorsTarget || undefined,
          sort_by: sortBy || undefined,
          sort_dir: sortDir || undefined,
        },
      }
    );
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch unit tasks";
    throw new Error(errorMessage);
  }
};

// ─────────────────────────────────────────────
// GET /api/target_assignments/lead-assignments/directors-targets/overview
// Org-wide snapshot for the Directors Monitoring tab
// ─────────────────────────────────────────────
export const getDirectorsTargetsOverview = async () => {
  try {
    const response = await API.get(
      "/target_assignments/lead-assignments/directors-targets/overview"
    );
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch directors targets overview";
    throw new Error(errorMessage);
  }
};

// ─────────────────────────────────────────────
// GET /api/target_assignments/lead-assignments/directors-targets/list
// Paginated, filterable detailed list of every active Director's Target
// ─────────────────────────────────────────────
export const getDirectorsTargetsList = async ({
  page = 1,
  pageSize = 20,
  dtn,
  unitId,
  memberName,
  completionStatus,
  sortBy,
  sortDir,
} = {}) => {
  try {
    const response = await API.get(
      "/target_assignments/lead-assignments/directors-targets/list",
      {
        params: {
          page,
          page_size: pageSize,
          dtn: dtn || undefined,
          unit_id: unitId || undefined,
          member_name: memberName || undefined,
          completion_status: completionStatus || undefined,
          sort_by: sortBy || undefined,
          sort_dir: sortDir || undefined,
        },
      }
    );
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch directors targets list";
    throw new Error(errorMessage);
  }
};