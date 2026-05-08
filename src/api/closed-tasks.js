// src/api/closed-tasks.js

import API from "./axios";

/**
 * Get the currently logged-in user from storage.
 * Returns { id, username } or null if not found.
 */
export function getCurrentUser() {
  try {
    const raw =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    return {
      id:       u.id       ?? u.user_id   ?? null,
      username: u.username ?? u.user_name ?? u.email ?? "unknown",
    };
  } catch {
    return null;
  }
}


// ══════════════════════════════════════════════════════════════════════
//  POST /api/closed-tasks/bulk
//  Permanently close multiple tasks in one request.
// ══════════════════════════════════════════════════════════════════════

/**
 * @param {object}   payload
 * @param {number[]} payload.main_db_ids          - IDs of records to close
 * @param {string}   payload.reason_for_closing    - selected reason (required)
 * @param {string}  [payload.remarks]              - optional textarea value
 * @param {number}   payload.closed_by_user_id
 * @param {string}   payload.closed_by_user_name
 * @param {string}  [payload.closed_at]            - ISO string (defaults to server now)
 * @returns {Promise<Array>} list of created closed_task records
 */
export const closeTasksBulk = async (payload) => {
  try {
    const response = await API.post("/closed-tasks/bulk", payload);
    return response.data;
  } catch (error) {
    console.error("Error closing tasks in bulk:", error);
    const errorMessage =
      error.response?.data?.detail?.message ||
      error.response?.data?.detail ||
      error.message ||
      "Failed to close tasks";
    throw new Error(errorMessage);
  }
};


// ══════════════════════════════════════════════════════════════════════
//  POST /api/closed-tasks/
//  Permanently close a single task.
// ══════════════════════════════════════════════════════════════════════

/**
 * @param {object}  payload
 * @param {number}  payload.main_db_id
 * @param {number} [payload.app_log_id]
 * @param {string}  payload.reason_for_closing
 * @param {string} [payload.remarks]
 * @param {number}  payload.closed_by_user_id
 * @param {string}  payload.closed_by_user_name
 * @param {string} [payload.closed_at]
 * @returns {Promise<object>} created closed_task record
 */
export const closeTask = async (payload) => {
  try {
    const response = await API.post("/closed-tasks/", payload);
    return response.data;
  } catch (error) {
    console.error("Error closing task:", error);
    const errorMessage =
      error.response?.data?.detail?.message ||
      error.response?.data?.detail ||
      error.message ||
      "Failed to close task";
    throw new Error(errorMessage);
  }
};


// ══════════════════════════════════════════════════════════════════════
//  GET /api/closed-tasks/check/{main_db_id}
//  Quick boolean check — use this before showing the Close modal.
// ══════════════════════════════════════════════════════════════════════

/**
 * @param {number} mainDbId
 * @returns {Promise<{ main_db_id: number, is_closed: boolean }>}
 */
export const checkIsTaskClosed = async (mainDbId) => {
  try {
    const response = await API.get(`/closed-tasks/check/${mainDbId}`);
    return response.data;
  } catch (error) {
    console.error("Error checking if task is closed:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to check task status";
    throw new Error(errorMessage);
  }
};


// ══════════════════════════════════════════════════════════════════════
//  GET /api/closed-tasks/main-db/{main_db_id}
//  Fetch the audit record for a specific application.
// ══════════════════════════════════════════════════════════════════════

/**
 * @param {number} mainDbId
 * @returns {Promise<object|null>} closed_task record, or null if not found
 */
export const getClosedTaskByMainDbId = async (mainDbId) => {
  try {
    const response = await API.get(`/closed-tasks/main-db/${mainDbId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) return null;
    console.error("Error fetching closed task:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch closed task";
    throw new Error(errorMessage);
  }
};


// ══════════════════════════════════════════════════════════════════════
//  GET /api/closed-tasks/{closed_task_id}
//  Fetch a specific closed-task audit record by its own PK.
// ══════════════════════════════════════════════════════════════════════

/**
 * @param {number} closedTaskId
 * @returns {Promise<object>} closed_task record
 */
export const getClosedTaskById = async (closedTaskId) => {
  try {
    const response = await API.get(`/closed-tasks/${closedTaskId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching closed task by id:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch closed task";
    throw new Error(errorMessage);
  }
};


// ══════════════════════════════════════════════════════════════════════
//  GET /api/closed-tasks/?skip=0&limit=100
//  List all closed tasks (paginated).
// ══════════════════════════════════════════════════════════════════════

/**
 * @param {object} [params]
 * @param {number} [params.skip=0]
 * @param {number} [params.limit=100]
 * @returns {Promise<{ total: number, items: Array }>}
 */
export const getAllClosedTasks = async ({ skip = 0, limit = 100 } = {}) => {
  try {
    const response = await API.get("/closed-tasks/", {
      params: { skip, limit },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching closed tasks:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch closed tasks";
    throw new Error(errorMessage);
  }
};