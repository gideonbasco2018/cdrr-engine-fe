// FILE: src/api/otc.js
import api from "./axios";

// ✅ Get OTC records with pagination and filters
export const getOTCRecords = async ({
  page = 1,
  pageSize = 100,
  search = '',
  app_status = '',
  prescription = '',
  brand_name = '',
  generic_name = '',
  lto_company = '',
  registration_no = '',
  app_type = '',
  is_in_pm = '',  // ✅ ADDED: Support for is_in_pm filter
  sortBy = 'DB_DATE_EXCEL_UPLOAD',
  sortOrder = 'desc'
}) => {
  console.log('🔍 OTC API Call Parameters:', {
    page,
    pageSize,
    search,
    app_status,
    prescription,
    brand_name,
    generic_name,
    lto_company,
    registration_no,
    app_type,
    is_in_pm,  // ✅ ADDED: Log is_in_pm parameter
    sortBy,
    sortOrder
  });

  // Build params object conditionally
  const params = {
    skip: (page - 1) * pageSize,
    limit: pageSize,
  };

  // Only add parameters if they have values
  if (search) params.search = search;
  if (app_status) params.app_status = app_status;
  if (prescription) params.prescription = prescription;
  if (brand_name) params.brand_name = brand_name;
  if (generic_name) params.generic_name = generic_name;
  if (lto_company) params.lto_company = lto_company;
  if (registration_no) params.registration_no = registration_no;
  if (app_type) params.app_type = app_type;
  if (is_in_pm) params.is_in_pm = is_in_pm;  // ✅ ADDED: Pass is_in_pm to backend
  
  // Add sort parameters if sortBy has a value
  if (sortBy && sortBy.trim() !== '') {
    params.sort_by = sortBy;
    params.sort_order = sortOrder;
  }

  const response = await api.get("/otc/records", { params });

  console.log('✅ OTC API Response:', {
    total: response.data.total,
    dataLength: response.data.records?.length,
    skip: response.data.skip,
    limit: response.data.limit
  });

  return {
    data: response.data.records,
    total: response.data.total,
    page: page,
    pageSize: pageSize
  };
};

// ✅ Get single OTC record by ID
export const getOTCRecordById = async (recordId) => {
  console.log(`🔍 Fetching OTC record ${recordId}`);
  const response = await api.get(`/otc/records/${recordId}`);
  console.log(`✅ OTC record ${recordId} fetched`);
  return response.data;
};

// ✅ Upload OTC Excel file
export const uploadOTCExcel = async (file, username = 'system') => {
  console.log('📤 Uploading OTC Excel file:', file.name);
  
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post(`/otc/upload-excel?username=${username}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  console.log('✅ OTC Excel upload complete:', response.data);
  return response.data;
};

// ✅ Download OTC template
export const downloadOTCTemplate = async () => {
  console.log('📥 Downloading OTC template');
  
  const response = await api.get('/otc/download-template', {
    responseType: 'blob',
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'otc_upload_template.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  
  console.log('✅ OTC template downloaded');
};

// ✅ Delete OTC record
export const deleteOTCRecord = async (recordId) => {
  console.log(`🗑️ Deleting OTC record ${recordId}`);
  
  try {
    const response = await api.delete(`/otc/records/${recordId}`);
    console.log(`✅ OTC record ${recordId} deleted successfully`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error deleting OTC record ${recordId}:`, error);
    const errorMessage = error.response?.data?.detail || error.message || "Failed to delete record";
    throw new Error(errorMessage);
  }
};

// ✅ Update OTC record
export const updateOTCRecord = async (recordId, data) => {
  console.log(`📝 Updating OTC record ${recordId} with data:`, data);
  
  try {
    const response = await api.put(`/otc/records/${recordId}`, data);
    console.log(`✅ Successfully updated OTC record ${recordId}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error updating OTC record ${recordId}:`, error);
    const errorMessage = error.response?.data?.detail || error.message || "Failed to update record";
    throw new Error(errorMessage);
  }
};

// ✅ Get unique app statuses with counts (for filters)
export const getOTCAppStatuses = async (params = {}) => {
  console.log('🔍 Fetching OTC app statuses with params:', params);
  try {
    const response = await api.get('/otc/app-statuses', { params });
    console.log('✅ OTC app statuses fetched:', response.data);
    return response.data.app_statuses;
  } catch (error) {
    console.error('❌ Error fetching OTC app statuses:', error);
    return [];
  }
};

// ✅ Get unique app types with counts (for filters)
export const getOTCAppTypes = async (params = {}) => {
  console.log('🔍 Fetching OTC app types with params:', params);
  try {
    const response = await api.get('/otc/app-types', { params });
    console.log('✅ OTC app types fetched:', response.data);
    return response.data.app_types;
  } catch (error) {
    console.error('❌ Error fetching OTC app types:', error);
    return [];
  }
};

// ✅ Get unique prescription types with counts (for filters)
export const getOTCPrescriptionTypes = async (params = {}) => {
  console.log('🔍 Fetching OTC prescription types with params:', params);
  try {
    const response = await api.get('/otc/prescription-types', { params });
    console.log('✅ OTC prescription types fetched:', response.data);
    return response.data.prescription_types;
  } catch (error) {
    console.error('❌ Error fetching OTC prescription types:', error);
    return [];
  }
};

// ✅ Export filtered OTC records to Excel
export const exportOTCRecords = async ({
  search = '',
  app_status = '',
  prescription = '',
  brand_name = '',
  generic_name = '',
  lto_company = '',
  registration_no = '',
  app_type = '',
  is_in_pm = ''  // ✅ ADDED: Support for is_in_pm in export
}) => {
  console.log('📥 Exporting filtered OTC records with params:', {
    search, app_status, prescription, brand_name, 
    generic_name, lto_company, registration_no, app_type, is_in_pm  // ✅ ADDED
  });

  // Build params object conditionally
  const params = {};

  if (search) params.search = search;
  if (app_status) params.app_status = app_status;
  if (prescription) params.prescription = prescription;
  if (brand_name) params.brand_name = brand_name;
  if (generic_name) params.generic_name = generic_name;
  if (lto_company) params.lto_company = lto_company;
  if (registration_no) params.registration_no = registration_no;
  if (app_type) params.app_type = app_type;
  if (is_in_pm) params.is_in_pm = is_in_pm;  // ✅ ADDED: Pass is_in_pm for export

  const response = await api.get('/otc/export-filtered', {
    params,
    responseType: 'blob',
  });
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  
  // Extract filename from Content-Disposition header or use default
  const contentDisposition = response.headers['content-disposition'];
  let filename = 'otc_export.xlsx';
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1];
    }
  }
  
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  
  console.log('✅ OTC export complete:', filename);
};

