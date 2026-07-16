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