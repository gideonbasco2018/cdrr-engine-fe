// FILE: src/api/reports.js
import API from "./axios";

export const getUploadReports = async ({
  page = 1,
  pageSize = 100,
  search = '',
  status = '',
  category = '',
  // ✅ NEW FILTERS - All optional
  prescription = '',
  prescription_not = '',
  dtn = null,
  manufacturer = '',
  lto_company = '',
  brand_name = '',
  generic_name = '',
  app_status = '',
  app_type = '',  // ✅ NEW - Application Type filter
  // END NEW FILTERS
  sortBy = 'DB_DATE_EXCEL_UPLOAD',
  sortOrder = 'desc'
}) => {
  console.log('🔍 API Call Parameters:', {
    page,
    pageSize,
    search,
    status,
    prescription,
    prescription_not,
    dtn,
    manufacturer,
    lto_company,
    brand_name,
    generic_name,
    app_status,
    app_type,
    sortBy,
    sortOrder
  });

  // ✅ Build params object conditionally
  const params = {
    page,
    page_size: pageSize,
  };

  // Only add parameters if they have values
  if (search) params.search = search;
  if (status) params.status = status;
  if (category) params.category = category;
  
  // ✅ NEW FILTERS - Only add if they have values
  if (prescription) params.prescription = prescription;
  if (prescription_not) params.prescription_not = prescription_not;
  if (dtn) params.dtn = dtn;
  if (manufacturer) params.manufacturer = manufacturer;
  if (lto_company) params.lto_company = lto_company;
  if (brand_name) params.brand_name = brand_name;
  if (generic_name) params.generic_name = generic_name;
  if (app_status) params.app_status = app_status;
  if (app_type) params.app_type = app_type;  // ✅ NEW
  
  // ✅ CRITICAL FIX: Only add sort parameters if sortBy has a value AND is not empty string
  if (sortBy && sortBy.trim() !== '') {
    params.sort_by = sortBy;
    params.sort_order = sortOrder;
  }

  const response = await API.get("/main-db/", {
    params,
  });

  console.log('✅ API Response:', {
    total: response.data.total,
    dataLength: response.data.data?.length,
    page: response.data.page
  });

  return response.data;
};

// ✅ NEW - Fetch unique application types with counts
export const getAppTypes = async (status = null) => {
  const params = {};
  if (status) params.status = status;
  
  const response = await API.get("/main-db/app-types", { params });
  return response.data.app_types;
};

export const uploadExcelFile = async (file, username = 'system') => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await API.post(`/main-db/upload-excel?username=${username}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

// ✅ NEW - Fetch unique prescription types with counts
export const getPrescriptionTypes = async (status = null, appType = null) => {
  const params = {};
  if (status) params.status = status;
  if (appType !== null) {
    // Handle __EMPTY__ for no app type
    params.app_type = appType === "" ? "__EMPTY__" : appType;
  }
  
  const response = await API.get("/main-db/prescription-types", { params });
  return response.data.prescription_types;
};

export const getAppStatusTypes = async (status = null, appType = null, prescription = null) => {
  const params = {};
  if (status) params.status = status;
  if (appType !== null) {
    params.app_type = appType === "" ? "__EMPTY__" : appType;
  }
  if (prescription !== null) {
    params.prescription = prescription === "" ? "__EMPTY__" : prescription;
  }
  
  const response = await API.get("/main-db/app-status-types", { params });
  return response.data.app_status_types;
};

// ✅ NEW - Fetch unique establishment categories with counts
export const getEstablishmentCategories = async (
  status = null, 
  appType = null, 
  prescription = null, 
  appStatus = null
) => {
  const params = {};
  if (status) params.status = status;
  if (appType !== null) params.app_type = appType;
  if (prescription !== null) params.prescription = prescription;
  if (appStatus !== null) params.app_status = appStatus;
  
  const response = await API.get("/main-db/establishment-categories", { params });
  return response.data.categories;
};

export const downloadTemplate = async () => {
  const response = await API.get('/main-db/download-template', {
    responseType: 'blob',
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'main_db_template.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
};

// ✅ Deck a single application
export const deckApplication = async (recordId, deckData) => {
  try {
    const response = await API.patch(
      `/deck/single/${recordId}`,
      deckData
    );
    
    return response.data;
  } catch (error) {
    console.error("Error decking application:", error);
    const errorMessage = error.response?.data?.detail || error.message || "Failed to deck application";
    throw new Error(errorMessage);
  }
};

// ✅ Bulk deck multiple applications
export const bulkDeckApplications = async (deckData) => {
  try {
    const response = await API.patch(
      '/deck/bulk',
      deckData
    );
    
    return response.data;
  } catch (error) {
    console.error("Error bulk decking applications:", error);
    const errorMessage = error.response?.data?.detail || error.message || "Failed to bulk deck applications";
    throw new Error(errorMessage);
  }
};

// ✅ Evaluate/Complete application
export const evaluateApplication = async (recordId, evaluationData) => {
  try {
    const response = await API.patch(
      `/evaluate/single/${recordId}`,
      evaluationData
    );
    
    return response.data;
  } catch (error) {
    console.error("Error evaluating application:", error);
    const errorMessage = error.response?.data?.detail || error.message || "Failed to evaluate application";
    throw new Error(errorMessage);
  }
};

// ✅ NEW - Export filtered records to Excel
export const exportFilteredRecords = async ({
  search = '',
  status = '',
  category = '',
  prescription = '',
  prescription_not = '',
  dtn = null,
  manufacturer = '',
  lto_company = '',
  brand_name = '',
  generic_name = '',
  app_status = '',
  app_type = '',
  sortBy = '',  // ✅ Changed default to empty string
  sortOrder = ''  // ✅ Changed default to empty string
}) => {
  console.log('📥 Exporting filtered records with params:', {
    search, status, category, prescription, prescription_not, 
    dtn, manufacturer, lto_company, brand_name, generic_name, 
    app_status, app_type, sortBy, sortOrder
  });

  // Build params object conditionally
  const params = {};

  // Only add parameters if they have values
  if (search) params.search = search;
  if (status) params.status = status;
  if (category) params.category = category;
  if (prescription) params.prescription = prescription;
  if (prescription_not) params.prescription_not = prescription_not;
  if (dtn) params.dtn = dtn;
  if (manufacturer) params.manufacturer = manufacturer;
  if (lto_company) params.lto_company = lto_company;
  if (brand_name) params.brand_name = brand_name;
  if (generic_name) params.generic_name = generic_name;
  if (app_status) params.app_status = app_status;
  if (app_type) params.app_type = app_type;
  
  // ✅ REMOVED - Don't send sort parameters to export endpoint
  // The backend will handle sorting internally
  // if (sortBy && sortBy.trim() !== '') {
  //   params.sort_by = sortBy;
  //   params.sort_order = sortOrder;
  // }

  const response = await API.get('/main-db/export-filtered', {
    params,
    responseType: 'blob',
  });
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  
  // Extract filename from Content-Disposition header or use default
  const contentDisposition = response.headers['content-disposition'];
  let filename = 'main_db_export.xlsx';
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
  
  console.log('✅ Export complete:', filename);
};