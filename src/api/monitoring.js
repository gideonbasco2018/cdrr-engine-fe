// src/api/monitoring.js

import API from "./axios";

/**
 * Get all active users with their task counts from application_logs.
 * Returns completed, in_progress, and total per user.
 *
 * @returns {Promise<{ total_users: number, data: Array }>}
 */
export const getUsersTaskSummary = async () => {
  try {
    const response = await API.get("/monitoring/users-tasks");
    return response.data;
  } catch (error) {
    console.error("Error fetching users task summary:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch users task summary";
    throw new Error(errorMessage);
  }
};

/**
 * Get paginated records from application_logs joined to main_db.
 *
 * @param {Object} params
 * @param {number}       [params.page=1]
 * @param {number}       [params.page_size=12]
 * @param {number|null}  [params.user_id]              - Filter by user ID
 * @param {string|null}  [params.date_from]            - YYYY-MM-DD
 * @param {string|null}  [params.date_to]              - YYYY-MM-DD
 * @param {string}       [params.sort_col="date"]      - date | dtn | user | drug | timeline
 * @param {string}       [params.sort_dir="desc"]      - asc | desc
 * @param {string|null}  [params.application_status]   - COMPLETED | IN PROGRESS
 *
 * @returns {Promise<{ total: number, page: number, page_size: number, total_pages: number, data: Array }>}
 */
export const getAllRecords = async (params = {}) => {
  try {
    // Strip out null/undefined/empty params so the backend doesn't receive junk
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, v]) => v !== null && v !== undefined && v !== ""
      )
    );
    const response = await API.get("/monitoring/all-records", {
      params: cleanParams,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching all records:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch records";
    throw new Error(errorMessage);
  }
};