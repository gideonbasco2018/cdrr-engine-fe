// src/api/doctrack.js

import API from "./axios";

/**
 * Get document by RSN
 * @param {string} rsn - Document Tracking Number
 * @returns {Promise} - Document data
 */
export const getDocumentByRSN = async (rsn) => {
  try {
    const response = await API.get("/doctrack/", {
      params: { rsn },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching document by RSN:", error);
    const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch document";
    throw new Error(errorMessage);
  }
};

/**
 * Get document log by docrecID
 * @param {number} docrecID - Document Receiving ID
 * @returns {Promise} - Document log data
 */
export const getDocumentLog = async (docrecID) => {
  try {
    const response = await API.get("/doctrack/log", {
      params: { docrecID },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching document log:", error);
    const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch document log";
    throw new Error(errorMessage);
  }
};

/**
 * Create a single document log
 * @param {Object} logData - { docrecID, remarks, userID }
 * @returns {Promise} - Created log data
 */
export const createDocumentLog = async (logData) => {
  try {
    const response = await API.post("/doctrack/log", logData);
    return response.data;
  } catch (error) {
    console.error("Error creating document log:", error);
    const errorMessage = error.response?.data?.detail || error.message || "Failed to create document log";
    throw new Error(errorMessage);
  }
};

/**
 * Bulk insert document logs
 * @param {Array} logs - Array of log objects
 * @returns {Promise} - Created logs data
 */
export const createBulkDocumentLogs = async (logs) => {
  try {
    const response = await API.post("/doctrack/docktrack/log/bulk", {
      logs,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating bulk document logs:", error);
    const errorMessage = error.response?.data?.detail || error.message || "Failed to create bulk document logs";
    throw new Error(errorMessage);
  }
};

/**
 * Get bulk document logs by docrecIDs
 * @param {Array} docrecIDs - Array of document receiving IDs
 * @returns {Promise} - Document logs data
 */
export const getBulkDocumentLogs = async (docrecIDs) => {
  try {
    const response = await API.get("/doctrack/docktrack/log/bulk", {
      params: { docrecIDs },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching bulk document logs:", error);
    const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch bulk document logs";
    throw new Error(errorMessage);
  }
};

/**
 * Get docrecIDs by RSNs
 * @param {Array} rsns - Array of RSNs
 * @returns {Promise} - docrecIDs data
 */
export const getDocrecIDsByRSNs = async (rsns) => {
  try {
    const response = await API.get("/doctrack/docktrack/docrecids/bulk", {
      params: { rsns },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching docrecIDs:", error);
    const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch docrecIDs";
    throw new Error(errorMessage);
  }
};