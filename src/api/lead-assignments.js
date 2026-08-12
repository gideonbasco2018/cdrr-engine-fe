// src/api/lead-assignments.js

import API from "./axios";

/**
 * Get paginated lead assignments
 * @param {Object} params
 * @param {number}  [params.page=1]
 * @param {number}  [params.page_size=20]
 * @param {number}  [params.unit_id]
 * @param {number}  [params.member_user_id]
 * @param {number}  [params.group_id]        - functional role within the unit
 * @param {boolean} [params.is_active]
 */
export const getLeadAssignments = async (params = {}) => {
  try {
    const response = await API.get("/lead_assignments/", { params });
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to fetch lead assignments";
    throw new Error(errorMessage);
  }
};

/**
 * Get single lead assignment by ID
 * @param {number} id
 */
export const getLeadAssignmentById = async (id) => {
  try {
    const response = await API.get(`/lead_assignments/${id}`);
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to fetch assignment";
    throw new Error(errorMessage);
  }
};

/**
 * Assign a single member to a unit under a specific role
 * @param {Object} payload
 * @param {number} payload.unit_id
 * @param {number} payload.member_user_id
 * @param {number} payload.group_id        - functional role within the unit
 * @param {string} [payload.remarks]
 */
export const createLeadAssignment = async (payload) => {
  try {
    const response = await API.post("/lead_assignments/", payload);
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to create assignment";
    throw new Error(errorMessage);
  }
};

/**
 * Update lead assignment (deactivate, change remarks, re-tag role)
 * @param {number} id
 * @param {Object} payload
 * @param {boolean} [payload.is_active]
 * @param {string}  [payload.remarks]
 * @param {number}  [payload.group_id]
 */
export const updateLeadAssignment = async (id, payload) => {
  try {
    const response = await API.patch(`/lead_assignments/${id}`, payload);
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to update assignment";
    throw new Error(errorMessage);
  }
};

/**
 * Hard delete a lead assignment
 * @param {number} id
 */
export const deleteLeadAssignment = async (id) => {
  try {
    await API.delete(`/lead_assignments/${id}`);
    return true;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to delete assignment";
    throw new Error(errorMessage);
  }
};

/**
 * Batch create — one unit + one role, maraming members
 * @param {Object} payload
 * @param {number}   payload.unit_id
 * @param {number}   payload.group_id        - functional role within the unit
 * @param {number[]} payload.member_user_ids
 * @param {string}   [payload.remarks]
 */
export const batchCreateLeadAssignments = async (payload) => {
  try {
    const response = await API.post("/lead_assignments/batch", payload);
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to create assignments";
    throw new Error(errorMessage);
  }
};

// ─────────────────────────────────────────────
// GET /api/target_assignments/lead-assignments/all-teams/{memberUserId}/tasks/in-progress
// Paginated, in-progress-only tasks — for the Directors Diagram view
// ─────────────────────────────────────────────
export const getAllTeamsMemberInProgressTasks = async (
  memberUserId,
  { page = 1, pageSize = 20 } = {}
) => {
  try {
    const response = await API.get(
      `/target_assignments/lead-assignments/all-teams/${memberUserId}/tasks/in-progress`,
      { params: { page, page_size: pageSize } }
    );
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch member tasks";
    throw new Error(errorMessage);
  }
};