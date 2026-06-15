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


/**
 * Get monthly or yearly received vs released counts with categorical filters.
 *
 * @param {Object} params
 * @param {string}      [params.group_by="month"]     - "month" | "year"
 * @param {number|null} [params.year]                 - Filter by year
 * @param {string|null} [params.doc_type]             - Filter by DB_TYPE_DOC_RELEASED
 * @param {string|null} [params.processing_type]      - Filter by DB_PROCESSING_TYPE
 * @param {string|null} [params.entry_type]           - Filter by DB_ENTRY_TYPE
 * @param {string|null} [params.app_status]           - Filter by DB_APP_STATUS
 * @param {string|null} [params.app_type]             - Filter by DB_APP_TYPE
 *
 * @returns {Promise<{ data: Array, doc_types: string[], processing_types: string[], entry_types: string[], app_statuses: string[], app_types: string[] }>}
 */
export const getProcessingTrend = async (params = {}) => {
  try {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, v]) => v !== null && v !== undefined && v !== ""
      )
    );
    const response = await API.get("/monitoring/processing-trend", {
      params: cleanParams,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching processing trend:", error);
    throw new Error(
      error.response?.data?.detail || error.message || "Failed to fetch processing trend"
    );
  }
};
 
/**
 * Get record counts grouped by a single categorical dimension.
 *
 * @param {Object} params
 * @param {string}      [params.dimension="doc_type"] - doc_type | processing_type | entry_type | app_status | app_type
 * @param {number|null} [params.year]
 * @param {string|null} [params.date_from]            - YYYY-MM-DD
 * @param {string|null} [params.date_to]              - YYYY-MM-DD
 * @param {string|null} [params.doc_type]
 * @param {string|null} [params.processing_type]
 * @param {string|null} [params.entry_type]
 * @param {string|null} [params.app_status]
 * @param {string|null} [params.app_type]
 *
 * @returns {Promise<{ dimension: string, data: Array<{ label: string, count: number }>, doc_types: string[], ... }>}
 */
export const getProcessingBreakdown = async (params = {}) => {
  try {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, v]) => v !== null && v !== undefined && v !== ""
      )
    );
    const response = await API.get("/monitoring/processing-breakdown", {
      params: cleanParams,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching processing breakdown:", error);
    throw new Error(
      error.response?.data?.detail || error.message || "Failed to fetch processing breakdown"
    );
  }
};

export const getSummary = async (params = {}) => {
  try {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, v]) => v !== null && v !== undefined && v !== ""
      )
    );
    const response = await API.get("/monitoring/summary", { params: cleanParams });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || error.message || "Failed to fetch summary"
    );
  }
};


/**
 * Get IN PROGRESS application count grouped by step.
 *
 * @param {Object} params
 * @param {number|null} [params.user_id]   - Filter by specific user
 * @param {number|null} [params.group_id]  - Filter by group
 *
 * @returns {Promise<{ total_in_progress: number, data: Array<{ step: string, count: number }> }>}
 */
export const getApplicationStatus = async (params = {}) => {
  try {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, v]) => v !== null && v !== undefined && v !== ""
      )
    );
    const response = await API.get("/monitoring/application-status", {
      params: cleanParams,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching application status:", error);
    throw new Error(
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch application status"
    );
  }
};