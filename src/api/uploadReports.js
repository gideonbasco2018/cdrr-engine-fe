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