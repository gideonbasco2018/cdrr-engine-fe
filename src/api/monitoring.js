// src/api/monitoring.js

import API from "./axios";

/**
 * Get all active users with their task counts from application_logs.
 * Returns completed, in_progress, and total per user.
 *
 * @returns {Promise<{ total_users: number, data: Array }>}
 */

export const getGroups = async () => {
  try {
    const response = await API.get("/monitoring/groups");
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to fetch groups");
  }
};

export const getUsersTaskSummary = async (params = {}) => {
  try {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== "")
    );
    const response = await API.get("/monitoring/users-tasks", { params: cleanParams });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to fetch users task summary");
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


/**
 * Get monthly trend of received and released CPR drug products.
 *
 * @param {Object} params
 * @param {number|null} [params.year]          - Filter by year
 * @param {string|null} [params.country_type]  - manufacturer|trader|repacker|importer|distributor
 * @param {string|null} [params.country]       - Specific country value
 * @param {string|null} [params.doc_type]      - Filter by document type released
 *
 * @returns {Promise<{ data: Array<{ period: string, received_count: number, released_count: number }>, countries: string[], doc_types: string[] }>}
 */
export const getCprTrend = async (params = {}) => {
  try {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, v]) => v !== null && v !== undefined && v !== ""
      )
    );
    const response = await API.get("/monitoring/cpr-trend", {
      params: cleanParams,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching CPR trend:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch CPR trend";
    throw new Error(errorMessage);
  }
};
