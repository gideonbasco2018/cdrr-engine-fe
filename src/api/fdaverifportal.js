// FILE: src/api/fdaverifportal.js
import API from "./axios";

// ==================== FDA VERIFICATION API CALLS ====================

/**
 * Download Excel template for FDA drug registration
 * @returns {Promise<Blob>} Excel file blob
 */
export const downloadTemplate = async () => {
  console.log('🔍 Downloading FDA template...');

  try {
    const response = await API.get('/fda/download-template', {
      responseType: 'blob',
    });

    console.log('✅ Template downloaded successfully');
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
  console.log('🔍 Uploading FDA Excel file...', { filename: file.name, uploadedBy });

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

    console.log('✅ Upload Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error uploading file:', error);
    throw error;
  }
};

/**
 * Get all FDA drug registrations with pagination and search
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.page_size - Items per page (default: 10)
 * @param {string} options.search - Search term
 * @param {boolean} options.include_canceled - Include canceled records (changed from include_deleted)
 * @returns {Promise<Object>} Paginated drug list
 */
export const getAllDrugs = async ({ page = 1, page_size = 10, search = '', include_canceled = false } = {}) => {
  console.log('🔍 Fetching FDA drugs...', { page, page_size, search, include_canceled });

  try {
    const params = {
      page,
      page_size,
      include_canceled, // ✅ Changed from include_deleted
    };

    if (search) {
      params.search = search;
    }

    const response = await API.get('/fda/drugs', { params });

    console.log('✅ Drugs Response:', {
      total: response.data.pagination?.total || 0,
      page: response.data.pagination?.page || page,
      records: response.data.data?.length || 0,
    });

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
  console.log('🔍 Fetching drug by ID...', { drugId });

  try {
    const response = await API.get(`/fda/drugs/${drugId}`);

    console.log('✅ Drug Details:', response.data);
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
  console.log('🔍 Verifying registration number...', { registrationNumber });

  try {
    const response = await API.get(`/fda/verify/${registrationNumber}`);

    console.log('✅ Verification Result:', {
      found: response.data.status === 'found',
      isValid: response.data.is_valid,
    });

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
  console.log('🔍 Updating drug...', { drugId, updateData });

  try {
    const response = await API.put(`/fda/drugs/${drugId}`, updateData);

    console.log('✅ Update Response:', response.data);
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
  console.log('🔍 Canceling drug...', { drugId, canceledBy });

  try {
    const response = await API.put(`/fda/drugs/${drugId}/cancel`, null, {
      params: { canceled_by: canceledBy }
    });

    console.log('✅ Cancel Response:', response.data);
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
  console.log('🔍 Restoring drug...', { drugId });

  try {
    const response = await API.put(`/fda/drugs/${drugId}/restore`);

    console.log('✅ Restore Response:', response.data);
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
  console.log('🔍 Testing FDA database connection...');

  try {
    const response = await API.get('/fda/test-connection');

    console.log('✅ Connection Test:', {
      status: response.data.status,
      database: response.data.database_info?.database_name,
    });

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
  console.log('🔍 Fetching FDA database tables...');

  try {
    const response = await API.get('/fda/list-tables');

    console.log('✅ Tables Response:', {
      total: response.data.total_tables || 0,
      tables: response.data.tables?.length || 0,
    });

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
  console.log('🔍 Fetching table structure...', { tableName });

  try {
    const response = await API.get(`/fda/table-structure/${tableName}`);

    console.log('✅ Table Structure:', {
      table: response.data.table_name,
      columns: response.data.total_columns || 0,
    });

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
  console.log('🔍 Exporting drugs to Excel...', { search, include_canceled });

  try {
    const params = {
      include_canceled, // ✅ Changed from include_deleted
    };

    if (search) {
      params.search = search;
    }

    // Call export endpoint that returns Excel file directly
    const response = await API.get('/fda/drugs/export', {
      params,
      responseType: 'blob', // Important: get blob for file download
    });

    console.log('✅ Export file received');

    return response.data; // Return blob directly
  } catch (error) {
    console.error('❌ Error exporting drugs:', error);
    throw error;
  }
};