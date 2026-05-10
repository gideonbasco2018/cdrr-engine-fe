// FILE: src/api/fdaverifportal.js
import API from "./axios";

// ==================== FDA VERIFICATION API CALLS ====================

/**
 * Download Excel template for FDA drug registration
 * @returns {Promise<Blob>} Excel file blob
 */
export const downloadTemplate = async () => {
  try {
    const response = await API.get('/fda/download-template', {
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error downloading template:', error);
    throw error;
  }
};

/**
 * Upload Excel file with drug registration data
 * @param {File} file - Excel file to upload
 * @param {string} uploadedBy - Username of uploader
 * @returns {Promise<Object>} Upload result
 */
export const uploadExcelFile = async (file, uploadedBy = null) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const params = uploadedBy ? { uploaded_by: uploadedBy } : {};

    const response = await API.post('/fda/upload-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params,
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error uploading file:', error);
    throw error;
  }
};

export const getAllDrugs = async ({
  page = 1,
  page_size = 10,
  search = '',
  include_canceled = false,
  expired_only = false,
  duplicates_only = false,
  uploaded_today = false,
  uploaded_yesterday = false,
  uploaded_this_month = false,
  uploaded_by = null,
} = {}) => {
  try {
    const params = {
      page,
      page_size,
      include_canceled,
      expired_only,
      duplicates_only,
      uploaded_today,
      uploaded_yesterday,
      uploaded_this_month,
    };

    if (search) params.search = search;
    if (uploaded_by) params.uploaded_by = uploaded_by;

    const response = await API.get('/fda/drugs', { params });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching drugs:', error);
    throw error;
  }
};

/**
 * Get a specific FDA drug registration by ID
 * @param {number} drugId - Drug ID
 * @returns {Promise<Object>} Drug details
 */
export const getDrugById = async (drugId) => {
  try {
    const response = await API.get(`/fda/drugs/${drugId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching drug:', error);
    throw error;
  }
};

/**
 * Verify if a registration number exists and is valid
 * @param {string} registrationNumber - Registration number to verify
 * @returns {Promise<Object>} Verification result
 */
export const verifyRegistration = async (registrationNumber) => {
  try {
    const response = await API.get(`/fda/verify/${registrationNumber}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error verifying registration:', error);
    throw error;
  }
};

/**
 * Update a drug registration
 * @param {number} drugId - Drug ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Update result
 */
export const updateDrug = async (drugId, updateData) => {
  try {
    const response = await API.put(`/fda/drugs/${drugId}`, updateData);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating drug:', error);
    throw error;
  }
};

/**
 * ✅ NEW: Cancel a drug registration (sets is_canceled = 'Y')
 * @param {number} drugId - Drug ID
 * @param {string} canceledBy - Username of user canceling
 * @returns {Promise<Object>} Cancel result
 */
export const cancelDrug = async (drugId, canceledBy) => {
  try {
    const response = await API.put(`/fda/drugs/${drugId}/cancel`, null, {
      params: { canceled_by: canceledBy },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error canceling drug:', error);
    throw error;
  }
};

/**
 * ✅ NEW: Restore a canceled drug registration (sets is_canceled = 'N')
 * @param {number} drugId - Drug ID
 * @returns {Promise<Object>} Restore result
 */
export const restoreDrug = async (drugId) => {
  try {
    const response = await API.put(`/fda/drugs/${drugId}/restore`);
    return response.data;
  } catch (error) {
    console.error('❌ Error restoring drug:', error);
    throw error;
  }
};

// ==================== FDA DATABASE CONNECTION API CALLS ====================

/**
 * Test FDA database connection
 * @returns {Promise<Object>} Connection test result
 */
export const testConnection = async () => {
  try {
    const response = await API.get('/fda/test-connection');
    return response.data;
  } catch (error) {
    console.error('❌ Error testing connection:', error);
    throw error;
  }
};

/**
 * List all tables in FDA database
 * @returns {Promise<Object>} List of tables
 */
export const listTables = async () => {
  try {
    const response = await API.get('/fda/list-tables');
    return response.data;
  } catch (error) {
    console.error('❌ Error listing tables:', error);
    throw error;
  }
};

/**
 * Get table structure
 * @param {string} tableName - Table name
 * @returns {Promise<Object>} Table structure
 */
export const getTableStructure = async (tableName) => {
  try {
    const response = await API.get(`/fda/table-structure/${tableName}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching table structure:', error);
    throw error;
  }
};

/**
 * Export drugs data to Excel using backend endpoint
 * @param {Object} options - Export options
 * @param {string} options.search - Search filter
 * @param {boolean} options.include_canceled - Include canceled records (changed from include_deleted)
 * @returns {Promise<Blob>} Excel file blob
 */
export const exportDrugsToExcel = async ({ search = '', include_canceled = false } = {}) => {
  try {
    const params = {
      include_canceled,
    };

    if (search) {
      params.search = search;
    }

    const response = await API.get('/fda/drugs/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error exporting drugs:', error);
    throw error;
  }
};

/**
 * ✅ Get FDA dashboard statistics for a specific uploader
 * @param {string} uploadedBy - Username to filter stats
 * @returns {Promise<Object>} Dashboard stats
 */
export const getDashboardStats = async (uploadedBy) => {
  try {
    const params = uploadedBy ? { uploaded_by: uploadedBy } : {};
    const response = await API.get('/fda/stats/dashboard', { params });
    return response.data.data;
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    throw error;
  }
};

/**
 * Bulk insert FDA drug registrations from DTN list (End Task / Releasing Officer flow)
 * @param {number[]} dtnList - Array of DB_DTN values
 * @param {string} uploadedBy - Username of the user who triggered the action
 * @returns {Promise<Object>} Result with successful, failed, skipped counts
 */
export const bulkCreateFromDtns = async (dtnList, uploadedBy = null) => {
  try {
    const response = await API.post("/fda/drugs/from-dtns", {
      dtn_list: dtnList,
      uploaded_by: uploadedBy,
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error bulk creating from DTNs:', error);
    throw error;
  }
};