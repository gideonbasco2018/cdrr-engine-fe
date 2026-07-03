// src/api/application-documents.js

import API from "./axios";

/**
 * Extracts a human-readable error message from an axios error.
 * Handles FastAPI's two common error shapes:
 *  - detail: "some string"
 *  - detail: [{ loc: [...], msg: "...", type: "..." }, ...]  (422 validation errors)
 */
function extractErrorMessage(error, fallback) {
  const detail = error.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : null;
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .join(" | ");
  }

  return error.message || fallback;
}

/**
 * Upload a single file as a supporting document for an application.
 * POST /api/application-documents/upload
 *
 * @param {Object} params
 * @param {number} params.mainDbId
 * @param {string} params.dbEntryType
 * @param {string} params.dbDtn
 * @param {string} [params.docCategory] - optional (e.g. "Product File", "Generated Docs")
 * @param {File} params.file
 * @param {(pct: number) => void} [onProgress] - optional upload progress callback
 */
export const uploadApplicationDocument = async (
  { mainDbId, dbEntryType, dbDtn, docCategory, file },
  onProgress
) => {
  try {
    const form = new FormData();
    form.append("main_db_id", mainDbId);
    form.append("db_entry_type", dbEntryType);
    form.append("db_dtn", dbDtn);
    if (docCategory) form.append("doc_category", docCategory);
    form.append("file", file);

    const response = await API.post("/application-documents/upload", form, {
      headers: { "Content-Type": undefined }, // let the browser set multipart boundary
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    });
    return response.data;
    // Returns: { id, drive_file_id, drive_file_url, original_filename, file_size_bytes, message }
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to upload document"));
  }
};

/**
 * Upload multiple files at once into the same application folder
 * (db_entry_type / db_dtn / doc_category).
 * POST /api/application-documents/upload-batch
 *
 * @param {Object} params
 * @param {number} params.mainDbId
 * @param {string} params.dbEntryType
 * @param {string} params.dbDtn
 * @param {string} [params.docCategory] - optional
 * @param {File[]} params.files
 * @param {(pct: number) => void} [onProgress] - optional upload progress callback
 */
export const uploadApplicationDocumentsBatch = async (
  { mainDbId, dbEntryType, dbDtn, docCategory, files },
  onProgress
) => {
  try {
    const form = new FormData();
    form.append("main_db_id", mainDbId);
    form.append("db_entry_type", dbEntryType);
    form.append("db_dtn", dbDtn);
    if (docCategory) form.append("doc_category", docCategory);
    files.forEach((file) => form.append("files", file));

    const response = await API.post("/application-documents/upload-batch", form, {
      headers: { "Content-Type": undefined }, // let the browser set multipart boundary
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    });
    return response.data;
    // Returns: { total, succeeded, failed, results: [{ filename, success, document?, error? }] }
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to upload documents"));
  }
};

/**
 * Get all non-deleted documents for a given application.
 * GET /api/application-documents/{mainDbId}
 *
 * @param {number} mainDbId
 */
export const getApplicationDocuments = async (mainDbId) => {
  try {
    const response = await API.get(`/application-documents/${mainDbId}`);
    return response.data; // { data: [...], total: number }
  } catch (error) {
    const msg = extractErrorMessage(error, "Failed to fetch documents");
    throw new Error(msg);
  }
};

/**
 * Delete a document (soft-delete in DB + permanent delete from Drive).
 * DELETE /api/application-documents/{documentId}
 *
 * @param {number} documentId
 */
export const deleteApplicationDocument = async (documentId) => {
  try {
    const response = await API.delete(`/application-documents/${documentId}`);
    return response.data; // { message: "Document deleted successfully." }
  } catch (error) {
    const msg = extractErrorMessage(error, "Failed to delete document");
    throw new Error(msg);
  }
};