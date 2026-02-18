/**
 * CDRR Reports API Service
 * Location: src/api/cdrr-reports.js
 * Handles all API calls for CDRR Inspector Reports with FROO and Secondary data
 */

import axios from './axios';

const BASE_URL = '/cdrr-reports';

/**
 * Get paginated list of CDRR reports
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.page_size - Items per page (default: 50)
 * @param {string} params.search - Search by DTN, importer, LTO, manufacturer, or certificate
 * @param {string} params.status - Filter by status
 * @param {string} params.category - Filter by category
 * @param {string} params.sort_by - Field to sort by (default: 'created_at')
 * @param {string} params.sort_order - Sort order: 'asc' or 'desc' (default: 'desc')
 */
export const getCDRRReports = async (params = {}) => {
  try {
    const response = await axios.get(BASE_URL, { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Get a single CDRR report by ID
 * @param {number} reportId - Report ID
 */
export const getCDRRReport = async (reportId) => {
  try {
    const response = await axios.get(`${BASE_URL}/${reportId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Create a new CDRR report
 * @param {Object} reportData - Report data including optional froo_report and cdrr_secondary
 */
export const createCDRRReport = async (reportData) => {
  try {
    const response = await axios.post(BASE_URL, reportData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Update a CDRR report
 * @param {number} reportId - Report ID
 * @param {Object} reportData - Updated report data
 */
export const updateCDRRReport = async (reportId, reportData) => {
  try {
    const response = await axios.put(`${BASE_URL}/${reportId}`, reportData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Delete a CDRR report (soft delete)
 * @param {number} reportId - Report ID
 */
export const deleteCDRRReport = async (reportId) => {
  try {
    const response = await axios.delete(`${BASE_URL}/${reportId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Bulk delete CDRR reports (soft delete)
 * @param {number[]} reportIds - Array of report IDs to delete
 * @returns {Object} { success: boolean, message: string, deleted_count: number }
 */
export const bulkDeleteCDRRReports = async (reportIds) => {
  try {
    const response = await axios.post(`${BASE_URL}/bulk-delete`, reportIds);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export default {
  getCDRRReports,
  getCDRRReport,
  createCDRRReport,
  updateCDRRReport,
  deleteCDRRReport,
  bulkDeleteCDRRReports,
};