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
  const response = await API.get("/main-db/", {
    params: {
      page,
      page_size: pageSize,
      search: search || undefined,
      status: status || undefined,
      category: category || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    },
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

/**
 * Evaluate an application (Evaluator completes evaluation and assigns Checker)
 * @param {number} recordId - The DB_ID of the record
 * @param {Object} data - Evaluation data
 * @param {string} data.evaluator - Evaluator username (current user)
 * @param {string} data.checker - Checker username to assign
 * @param {string} data.evalDecision - Evaluation decision (For Checking, For Compliance, Approved, Rejected)
 * @param {string} data.evalRemarks - Evaluation remarks/notes
 * @param {string} data.dateEvalEnd - Evaluation completion timestamp
 * @returns {Promise<Object>} Response from API
 */
export const evaluateApplication = async (recordId, data) => {
  try {
    const response = await API.patch(
      `/cdrr-reports/evaluate/${recordId}`,
      {
        evaluator: data.evaluator,
        checker: data.checker,
        eval_decision: data.evalDecision,
        eval_remarks: data.evalRemarks,
        date_eval_end: data.dateEvalEnd,
      }
    );
    
    return response.data;
  } catch (error) {
    console.error("Error evaluating application:", error);
    const errorMessage = error.response?.data?.detail || error.message || "Failed to evaluate application";
    throw new Error(errorMessage);
  }
};