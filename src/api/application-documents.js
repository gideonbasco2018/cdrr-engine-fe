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
  { dbEntryType, dbDtn, docCategory, file },
  onProgress
) => {
  try {
    const form = new FormData();
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
  { dbEntryType, dbDtn, docCategory, files },
  onProgress
) => {
  try {
    const form = new FormData();
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
 * Upload an ENTIRE folder (selected via <input webkitdirectory>). The
 * top-level folder name becomes the DTN on the backend; any nested
 * subfolders (any depth) become the doc_category, automatically derived
 * from each file's webkitRelativePath — the caller does not need to
 * (and should not) type this manually.
 * POST /api/application-documents/upload-folder
 *
 * @param {Object} params
 * @param {string} params.dbEntryType
 * @param {number} [params.mainDbId] - optional
 * @param {File[]} params.files - the raw FileList entries from the folder input
 * @param {string[]} params.relativePaths - same order/length as files; each
 *   entry is that file's `webkitRelativePath` (e.g. "DTN123/CategoryA/file.pdf")
 * @param {(pct: number) => void} [onProgress] - optional upload progress callback
 */
export const uploadApplicationDocumentsFolder = async (
  { dbEntryType, mainDbId, files, relativePaths },
  onProgress
) => {
  try {
    const form = new FormData();
    form.append("db_entry_type", dbEntryType);
    if (mainDbId !== undefined && mainDbId !== null && mainDbId !== "") {
      form.append("main_db_id", mainDbId);
    }
    files.forEach((file) => form.append("files", file));
    relativePaths.forEach((p) => form.append("relative_paths", p));

    const response = await API.post("/application-documents/upload-folder", form, {
      headers: { "Content-Type": undefined },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    });
    return response.data;
    // Returns: { total, succeeded, failed, results: [...], batch_id }
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to upload folder"));
  }
};

/**
 * Get a filterable, paginated list of ALL upload logs (success + failed),
 * across every batch. Used by the "Upload Logs" tab.
 * GET /api/application-documents/upload-folder/logs
 *
 * @param {Object} [params]
 * @param {"success"|"failed"} [params.status]
 * @param {string} [params.uploadedBy] - exact match on uploader's username
 * @param {string} [params.dbDtn] - partial match
 * @param {string} [params.dbEntryType]
 * @param {string} [params.dateFrom] - ISO-8601 datetime string, inclusive lower bound on created_at
 * @param {string} [params.dateTo] - ISO-8601 datetime string, inclusive upper bound on created_at
 * @param {number} [params.limit]
 * @param {number} [params.offset]
 */
export const getUploadLogs = async ({
  status,
  uploadedBy,
  dbDtn,
  dbEntryType,
  dateFrom,
  dateTo,
  limit = 100,
  offset = 0,
} = {}) => {
  try {
    const response = await API.get("/application-documents/upload-folder/logs", {
      params: {
        status: status || undefined,
        uploaded_by: uploadedBy || undefined,
        db_dtn: dbDtn || undefined,
        db_entry_type: dbEntryType || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        limit,
        offset,
      },
    });
    return response.data; // { data: [...], total }
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to fetch upload logs"));
  }
};

/**
 * Get the distinct list of uploader usernames that appear in the upload
 * logs — used to populate the "Uploaded By" filter dropdown.
 * GET /api/application-documents/upload-folder/logs-uploaders
 */
export const getUploadLogUploaders = async () => {
  try {
    const response = await API.get(
      "/application-documents/upload-folder/logs-uploaders"
    );
    return response.data; // { uploaders: [...] }
  } catch (error) {
    throw new Error(
      extractErrorMessage(error, "Failed to fetch uploader list")
    );
  }
};

/**
 * Get all logs (success + failed) for a given upload-folder batch.
 * GET /api/application-documents/upload-folder/logs/{batchId}
 */
export const getUploadFolderLogs = async (batchId) => {
  try {
    const response = await API.get(
      `/application-documents/upload-folder/logs/${encodeURIComponent(batchId)}`
    );
    return response.data; // { data: [...], total, batch_id }
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to fetch upload logs"));
  }
};

/**
 * Get only the FAILED logs for a given upload-folder batch.
 * GET /api/application-documents/upload-folder/logs/{batchId}/failed
 */
export const getFailedUploadFolderLogs = async (batchId) => {
  try {
    const response = await API.get(
      `/application-documents/upload-folder/logs/${encodeURIComponent(batchId)}/failed`
    );
    return response.data; // { data: [...], total, batch_id }
  } catch (error) {
    throw new Error(
      extractErrorMessage(error, "Failed to fetch failed upload logs")
    );
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

/**
 * Get all non-deleted documents linked to a given DTN, across all
 * entry types and doc categories.
 * GET /api/application-documents/by-dtn/{dbDtn}
 *
 * @param {string} dbDtn
 */
export const getApplicationDocumentsByDtn = async (dbDtn) => {
  try {
    const response = await API.get(
      `/application-documents/by-dtn/${encodeURIComponent(dbDtn)}`
    );
    return response.data; // { data: [...], total: number }
  } catch (error) {
    const msg = extractErrorMessage(error, "Failed to fetch documents");
    throw new Error(msg);
  }
};