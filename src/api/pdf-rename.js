import api from "./axios";

/**
 * Preview rename results without downloading.
 * @param {File[]} files
 * @param {function} onProcessed - called with (count) as upload progresses
 */
export const previewRenamePdfs = async (files, onProcessed) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await api.post("/rename-pdfs/preview", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProcessed && e.total) {
        // Upload phase = simulate first half of processing
        const uploadDone = Math.round(
          (e.loaded / e.total) * Math.floor(files.length / 2),
        );
        onProcessed(uploadDone);
      }
    },
  });

  // Upload done — jump to full count
  if (onProcessed) onProcessed(files.length);

  return response.data;
};

/**
 * Upload PDFs and download renamed files as ZIP.
 * @param {File[]} files
 * @param {function} onUploadProgress - called with percent (0-100)
 * @param {function} onProcessed      - called with processed file count
 */
export const downloadRenamedPdfs = async (
  files,
  onUploadProgress,
  onProcessed,
) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await api.post("/rename-pdfs", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    responseType: "blob",
    onUploadProgress: (e) => {
      if (e.total) {
        const percent = Math.round((e.loaded * 100) / e.total);
        if (onUploadProgress) onUploadProgress(percent);
        // Simulate processed count from upload progress (first half)
        if (onProcessed) {
          onProcessed(
            Math.round((percent / 100) * Math.floor(files.length / 2)),
          );
        }
      }
    },
  });

  // Done — set full count
  if (onProcessed) onProcessed(files.length);

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