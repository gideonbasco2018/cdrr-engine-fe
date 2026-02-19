// src/api/application-logs.js

import API from "./axios";

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
 * @returns {Promise} - Created log data
 */
export const createApplicationLog = async (logData) => {
  try {
    const response = await API.post("/application-logs/", logData);
    return response.data;
  } catch (error) {
    console.error("Error creating application log:", error);
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to create application log";
    throw new Error(errorMessage);
  }
};

/**
 * Bulk create application logs (max 100)
 * @param {Array<Object>} logs - Array of log objects (same shape as createApplicationLog)
 * @returns {Promise} - Array of created log data
 */
export const createBulkApplicationLogs = async (logs) => {
  try {
    const response = await API.post("/application-logs/bulk", logs);
    return response.data;
  } catch (error) {
    console.error("Error creating bulk application logs:", error);
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to create bulk application logs";
    throw new Error(errorMessage);
  }
};

/**
 * Get all logs for a specific main_db record
 * @param {number} mainDbId
 * @returns {Promise} - Array of logs (newest first)
 */
export const getApplicationLogs = async (mainDbId) => {
  try {
    const response = await API.get(`/application-logs/main-db/${mainDbId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching application logs:", error);
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to fetch application logs";
    throw new Error(errorMessage);
  }
};

/**
 * Get logs for a specific workflow step of a record
 * @param {number} mainDbId
 * @param {string} step - e.g. "Decking", "Evaluation", "Checking"
 * @returns {Promise} - Array of logs
 */
export const getApplicationLogsByStep = async (mainDbId, step) => {
  try {
    const response = await API.get(`/application-logs/main-db/${mainDbId}/step/${step}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching application logs by step:", error);
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to fetch application logs by step";
    throw new Error(errorMessage);
  }
};

/**
 * Get a single application log by ID
 * @param {number} logId
 * @returns {Promise} - Log data
 */
export const getApplicationLogById = async (logId) => {
  try {
    const response = await API.get(`/application-logs/${logId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching application log:", error);
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to fetch application log";
    throw new Error(errorMessage);
  }
};

/**
 * Update an application log
 * @param {number} logId
 * @param {Object} logData - Fields to update
 * @returns {Promise} - Updated log data
 */
export const updateApplicationLog = async (logId, logData) => {
  try {
    const response = await API.put(`/application-logs/${logId}`, logData);
    return response.data;
  } catch (error) {
    console.error("Error updating application log:", error);
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to update application log";
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
      error.response?.data?.detail || error.message || "Failed to delete application log";
    throw new Error(errorMessage);
  }
};