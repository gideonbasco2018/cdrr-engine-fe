// src/api/workflow-tasks.js

import API from "./axios";

/**
 * Get paginated workflow tasks (ApplicationLogs joined with MainDB)
 *
 * @param {Object} params
 * @param {number}  [params.page=1]
 * @param {number}  [params.page_size=20]
 *
 * // del_thread / del_last_index filters
 * @param {string|null}  [params.del_thread]              - Filter by specific thread ID
 * @param {number|null}  [params.del_last_index]          - Filter by del_last_index value
 * @param {boolean}      [params.only_latest_per_thread]  - Return only latest log per thread (current state view)
 *
 * // Log-level filters
 * @param {string|null}  [params.application_step]        - e.g. "Decking", "Evaluation", "Checking"
 * @param {string|null}  [params.application_status]
 * @param {string|null}  [params.application_decision]
 * @param {string|null}  [params.user_name]               - Username who performed the step
 * @param {number|null}  [params.main_db_id]              - Filter by specific MainDB record ID
 *
 * // MainDB-level filters
 * @param {number|null}  [params.dtn]                     - Document Tracking Number
 * @param {string|null}  [params.est_cat]                 - Establishment Category
 * @param {string|null}  [params.app_type]                - Application Type. Use "__EMPTY__" for null/empty.
 * @param {string|null}  [params.db_app_status]           - MainDB App Status. Use "__EMPTY__" for null/empty.
 * @param {string|null}  [params.lto_company]
 * @param {string|null}  [params.brand_name]
 * @param {string|null}  [params.generic_name]
 * @param {string|null}  [params.prescription]            - Use "__EMPTY__" for null/empty.
 *
 * // Search & Sort
 * @param {string|null}  [params.search]                  - Global search across log and MainDB fields
 * @param {string}       [params.sort_by="created_at"]
 * @param {string}       [params.sort_order="desc"]       - "asc" or "desc"
 *
 * @returns {Promise<{total: number, page: number, page_size: number, total_pages: number, data: Array}>}
 */
export const getWorkflowTasks = async (params = {}) => {
  try {
    const response = await API.get("/workflow_tasks/", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching workflow tasks:", error);
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to fetch workflow tasks";
    throw new Error(errorMessage);
  }
};

/**
 * Get full audit trail / history of a specific del_thread
 * Useful for "View History" modal or drawer on a table row
 *
 * @param {string} delThread        - The del_thread identifier
 * @param {Object} [params]
 * @param {number} [params.page=1]
 * @param {number} [params.page_size=100]
 * @returns {Promise<{total: number, page: number, page_size: number, total_pages: number, data: Array}>}
 */
export const getWorkflowTaskThreadHistory = async (delThread, params = {}) => {
  try {
    const response = await API.get(`/workflow_tasks/thread/${delThread}`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching thread history:", error);
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to fetch thread history";
    throw new Error(errorMessage);
  }
};

/**
 * Mark a specific ApplicationLog as read.
 * Sets is_read = 1 and read_at = now() on the backend.
 * Safe to call multiple times — backend only updates on first call.
 *
 * @param {number} logId  - The ApplicationLog id (row.id from the table)
 * @returns {Promise<{id: number, is_read: number, read_at: string|null}>}
 */
export const markWorkflowTaskAsRead = async (logId) => {
  try {
    const response = await API.patch(`/workflow_tasks/${logId}/mark-read`);
    return response.data;
  } catch (error) {
    // Non-blocking — don't crash the UI if mark-read fails
    console.warn(`Failed to mark log ${logId} as read:`, error);
  }
};

/**
 * Bulk mark ApplicationLogs as received.
 * Sets is_received = 1, received_at = now(), received_by = current user on the backend.
 * Idempotent — already-received rows are skipped gracefully.
 *
 * @param {number[]} ids  - Array of ApplicationLog IDs to mark as received
 * @returns {Promise<{updated: number, skipped: number, results: Array}>}
 */
export const markWorkflowTasksAsReceived = async (ids = []) => {
  try {
    const response = await API.patch("/workflow_tasks/mark-received", { ids });
    return response.data;
  } catch (error) {
    console.error("Failed to mark logs as received:", error);
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to mark as received";
    throw new Error(errorMessage);
  }
};