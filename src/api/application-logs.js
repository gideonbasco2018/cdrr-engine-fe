// src/api/application-logs.js

import API from "./axios";

/**
 * Get all logs for a specific application by DTN (Document Tracking Number)
 * This is the primary fetch used by ApplicationLogsModal.
 *
 * GET /api/application-logs?dtn=20210927134427
 *
 * @param {number|string} dtn  - DB_DTN value from the main_db record
 * @returns {Promise<Array>}   - Array of ApplicationLogResponse objects
 */
export const getApplicationLogsByDtn = async (dtn) => {
  try {
    const response = await API.get("/application-logs/", {
      params: { dtn },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching application logs by DTN:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch application logs";
    throw new Error(errorMessage);
  }
};

/**
 * Create a single application log
 * @param {Object} logData
 * @param {number} logData.main_db_id
 * @param {string} logData.application_step   - e.g. "Decking", "Evaluation"
 * @param {string} logData.user_name
 * @param {string} logData.application_status
 * @param {string} logData.application_decision
 * @param {string} logData.application_remarks
 * @param {string} logData.start_date          - ISO datetime string
 * @param {string} logData.accomplished_date   - ISO datetime string
 * @param {number|null} logData.del_index
 * @param {number|null} logData.del_previous
 * @param {number|null} logData.del_last_index
 * @returns {Promise} - Created log data
 */
export const createApplicationLog = async (logData) => {
  try {
    const response = await API.post("/application-logs/", logData);
    return response.data;
  } catch (error) {
    console.error("Error creating application log:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to create application log";
    throw new Error(errorMessage);
  }
};

/**
 * Bulk create application logs (max 100)
 * @param {Array<Object>} logs
 * @returns {Promise<Array>}
 */
export const createBulkApplicationLogs = async (logs) => {
  try {
    const response = await API.post("/application-logs/bulk", logs);
    return response.data;
  } catch (error) {
    console.error("Error creating bulk application logs:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to create bulk application logs";
    throw new Error(errorMessage);
  }
};

/**
 * Get all logs for a specific main_db record (by DB_ID)
 * @param {number} mainDbId
 * @returns {Promise<Array>} - Array of logs (newest first)
 */
export const getApplicationLogs = async (mainDbId) => {
  try {
    const response = await API.get(`/application-logs/main-db/${mainDbId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching application logs:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch application logs";
    throw new Error(errorMessage);
  }
};

/**
 * Get logs for a specific workflow step of a record
 * @param {number} mainDbId
 * @param {string} step - e.g. "Decking", "Evaluation", "Checking"
 * @returns {Promise<Array>}
 */
export const getApplicationLogsByStep = async (mainDbId, step) => {
  try {
    const response = await API.get(
      `/application-logs/main-db/${mainDbId}/step/${step}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching application logs by step:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch application logs by step";
    throw new Error(errorMessage);
  }
};

/**
 * Get a single application log by ID
 * @param {number} logId
 * @returns {Promise}
 */
export const getApplicationLogById = async (logId) => {
  try {
    const response = await API.get(`/application-logs/${logId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching application log:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch application log";
    throw new Error(errorMessage);
  }
};

/**
 * Update an application log
 * @param {number} logId
 * @param {Object} logData
 * @returns {Promise}
 */
export const updateApplicationLog = async (logId, logData) => {
  try {
    const response = await API.put(`/application-logs/${logId}`, logData);
    return response.data;
  } catch (error) {
    console.error("Error updating application log:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to update application log";
    throw new Error(errorMessage);
  }
};

/**
 * Delete an application log
 * @param {number} logId
 * @returns {Promise}
 */
export const deleteApplicationLog = async (logId) => {
  try {
    const response = await API.delete(`/application-logs/${logId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting application log:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to delete application log";
    throw new Error(errorMessage);
  }
};

/**
 * Get last del_index for a specific application
 * @param {number} mainDbId
 * @returns {Promise<{main_db_id: number, last_index: number, next_index: number}>}
 */
export const getLastApplicationLogIndex = async (mainDbId) => {
  try {
    const response = await API.get(
      `/application-logs/main-db/${mainDbId}/last-index`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching last application log index:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch last application log index";
    throw new Error(errorMessage);
  }
};