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
// ══════════════════════════════════════════════════════════════════════

/**
 * @param {object}   payload
 * @param {number[]} payload.main_db_ids
 * @param {string}   payload.reason_for_closing
 * @param {string}  [payload.remarks]               - pure user remarks, walang CPR notes
 * @param {string}  [payload.date_released]         - ISO date string
 * @param {string}  [payload.type_doc_released]     - e.g. "CPR", "LOD", "Certificate"
 * @param {number}   payload.closed_by_user_id
 * @param {string}   payload.closed_by_user_name
 * @param {string}  [payload.closed_at]             - ISO string (defaults to server now)
 * @param {boolean} [payload.cpr_api_enabled]       - true=ON, false=OFF, null=not CPR
 * @param {boolean} [payload.cpr_insert_success]    - true=ok, false=failed, null=not attempted
 * @param {string}  [payload.cpr_insert_error]      - error message kung nag-fail
 * @param {boolean} [payload.cpr_skipped_by_user]   - true kung sinadyang i-OFF ang toggle
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
// ══════════════════════════════════════════════════════════════════════

/**
 * @param {object}  payload
 * @param {number}  payload.main_db_id
 * @param {number} [payload.app_log_id]
 * @param {string}  payload.reason_for_closing
 * @param {string} [payload.remarks]
 * @param {string} [payload.date_released]
 * @param {string} [payload.type_doc_released]
 * @param {number}  payload.closed_by_user_id
 * @param {string}  payload.closed_by_user_name
 * @param {string} [payload.closed_at]
 * @param {boolean} [payload.cpr_api_enabled]
 * @param {boolean} [payload.cpr_insert_success]
 * @param {string}  [payload.cpr_insert_error]
 * @param {boolean} [payload.cpr_skipped_by_user]
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


// ══════════════════════════════════════════════════════════════════════
//  GET /api/closed-tasks/cpr-failed
//  Lahat ng tasks na nag-fail ang CPR Verification Portal insert
// ══════════════════════════════════════════════════════════════════════

/**
 * @param {object} [params]
 * @param {number} [params.skip=0]
 * @param {number} [params.limit=100]
 * @returns {Promise<{ total: number, items: Array }>}
 */
export const getCprFailedTasks = async ({ skip = 0, limit = 100 } = {}) => {
  try {
    const response = await API.get("/closed-tasks/cpr-failed", {
      params: { skip, limit },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching CPR failed tasks:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch CPR failed tasks";
    throw new Error(errorMessage);
  }
};


// ══════════════════════════════════════════════════════════════════════
//  GET /api/closed-tasks/cpr-skipped
//  Lahat ng tasks na sinadyang i-OFF ang CPR API bago mag-close
// ══════════════════════════════════════════════════════════════════════

/**
 * @param {object} [params]
 * @param {number} [params.skip=0]
 * @param {number} [params.limit=100]
 * @returns {Promise<{ total: number, items: Array }>}
 */
export const getCprSkippedTasks = async ({ skip = 0, limit = 100 } = {}) => {
  try {
    const response = await API.get("/closed-tasks/cpr-skipped", {
      params: { skip, limit },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching CPR skipped tasks:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch CPR skipped tasks";
    throw new Error(errorMessage);
  }
};