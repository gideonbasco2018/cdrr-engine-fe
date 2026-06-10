import api from "./axios";

/**
 * Preview rename results without downloading
 * @param {File[]} files
 */
export const previewRenamePdfs = async (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await api.post("/rename-pdfs/preview", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};

/**
 * Upload PDFs and download renamed files as ZIP
 * @param {File[]} files
 * @param {function} onProgress - optional progress callback (0-100)
 */
export const downloadRenamedPdfs = async (files, onProgress) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await api.post("/rename-pdfs", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    responseType: "blob",
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percent);
      }
    },
  });

  // Parse summary from response header
  let summary = [];
  const summaryHeader = response.headers["x-rename-summary"];
  if (summaryHeader) {
    try {
      summary = JSON.parse(atob(summaryHeader));
    } catch {
      summary = [];
    }
  }

  return { blob: response.data, summary };
};