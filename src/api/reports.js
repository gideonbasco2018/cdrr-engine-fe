// FILE: src/api/reports.js
import API from "./axios";

export const getUploadReports = async ({
  page = 1,
  pageSize = 100,
  search = '',
  status = '',
  category = '',
  sortBy = 'DB_DATE_EXCEL_UPLOAD',
  sortOrder = 'desc'
}) => {
  console.log('🔍 API Call Parameters:', {
    page,
    pageSize,
    search,
    status,
    sortBy,
    sortOrder
  });

  // ✅ FIX: Build params object conditionally
  const params = {
    page,
    page_size: pageSize,
  };

  // Only add parameters if they have values
  if (search) params.search = search;
  if (status) params.status = status;
  if (category) params.category = category;
  
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