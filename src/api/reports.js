// FILE: src/api/reports.js
import API from "./axios";

export const getUploadReports = async ({
  page = 1,
  pageSize = 100,
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
  // ✅ NEW
  processing_type = '',
  sortBy = 'DB_DATE_EXCEL_UPLOAD',
  sortOrder = 'desc'
}) => {
  const params = {
    page,
    page_size: pageSize,
  };

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
  // ✅ NEW
  if (processing_type) params.processing_type = processing_type;

  if (sortBy && sortBy.trim() !== '') {
    params.sort_by = sortBy;
    params.sort_order = sortOrder;
  }

  const response = await API.get("/main-db/", { params });
  return response.data;
};

// ✅ Fetch unique application types with counts
// ✅ UPDATED: added processingType so sidebar counts filter correctly when a processing tab is active
export const getAppTypes = async (status = null, processingType = null) => {
  const params = {};
  if (status) params.status = status;
  if (processingType !== null) params.processing_type = processingType;

  const response = await API.get("/main-db/app-types", { params });
  return response.data.app_types;
};

// ✅ Fetch unique processing types with counts (always unfiltered — drives the tabs)
export const getProcessingTypes = async (status = null) => {
  const params = {};
  if (status) params.status = status;

  const response = await API.get("/main-db/processing-types", { params });
  return response.data.processing_types;
};

export const uploadExcelFile = async (file, username = 'system') => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await API.post(
    `/main-db/upload-excel?username=${username}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

// ✅ Fetch unique prescription types with counts
// ✅ UPDATED: added processingType so sidebar counts filter correctly when a processing tab is active
export const getPrescriptionTypes = async (
  status = null,
  appType = null,
  processingType = null  // ✅ NEW
) => {
  const params = {};
  if (status) params.status = status;
  if (appType !== null) {
    params.app_type = appType === "" ? "__EMPTY__" : appType;
  }
  if (processingType !== null) {
    params.processing_type = processingType;
  }

  const response = await API.get("/main-db/prescription-types", { params });
  return response.data.prescription_types;
};

// ✅ Fetch unique app status types with counts
// ✅ UPDATED: added processingType so sidebar counts filter correctly when a processing tab is active
export const getAppStatusTypes = async (
  status = null,
  appType = null,
  prescription = null,
  processingType = null  // ✅ NEW
) => {
  const params = {};
  if (status) params.status = status;
  if (appType !== null) {
    params.app_type = appType === "" ? "__EMPTY__" : appType;
  }
  if (prescription !== null) {
    params.prescription = prescription === "" ? "__EMPTY__" : prescription;
  }
  if (processingType !== null) {
    params.processing_type = processingType;
  }

  const response = await API.get("/main-db/app-status-types", { params });
  return response.data.app_status_types;
};

// ✅ Fetch unique establishment categories with counts
export const getEstablishmentCategories = async (
  status = null,
  appType = null,
  prescription = null,
  appStatus = null
) => {
  const params = {};
  if (status) params.status = status;
  if (appType !== null) params.app_type = appType === "" ? "__EMPTY__" : appType;
  if (prescription !== null) params.prescription = prescription === "" ? "__EMPTY__" : prescription;
  if (appStatus !== null) params.app_status = appStatus === "" ? "__EMPTY__" : appStatus;

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

// ✅ Export filtered records to Excel
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
  // ✅ NEW
  processing_type = '',
}) => {
  const params = {};

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
  // ✅ NEW
  if (processing_type) params.processing_type = processing_type;

  const response = await API.get('/main-db/export-filtered', {
    params,
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;

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
};

// ✅ Fetch application logs for a specific record
export const getApplicationLogs = async (mainId, page = 1, pageSize = 50) => {
  const params = { page, page_size: pageSize };
  const response = await API.get(`/main-db/logs/${mainId}`, { params });
  return response.data;
};

export const updateUploadReport = async (id, data) => {
  try {
    const response = await API.put(`/main-db/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`❌ Error updating record ${id}:`, error);
    const errorMessage = error.response?.data?.detail || error.message || "Failed to update record";
    throw new Error(errorMessage);
  }
};