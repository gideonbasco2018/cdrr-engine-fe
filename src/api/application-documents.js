// src/api/application-documents.js
import axios from "axios";
import { getAuthHeaders } from "./auth";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * Upload a file as a supporting document for an application.
 * @param {number} mainDbId
 * @param {File} file
 * @param {(pct: number) => void} [onProgress]  — optional upload progress callback
 */
export async function uploadApplicationDocument(mainDbId, file, onProgress) {
  const form = new FormData();
  form.append("main_db_id", mainDbId);
  form.append("file", file);

  const { data } = await axios.post(
    `${BASE}/api/application-documents/upload`,
    form,
    {
      headers: {
        ...getAuthHeaders(),
        // axios sets multipart/form-data automatically — don't force Content-Type here
      },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    }
  );
  return data;
  // Returns: { id, drive_file_id, drive_file_url, original_filename, file_size_bytes, message }
}

/**
 * Fetch all documents for an application.
 * @param {number} mainDbId
 */
export async function getApplicationDocuments(mainDbId) {
  const { data } = await axios.get(
    `${BASE}/api/application-documents/${mainDbId}`,
    { headers: getAuthHeaders() }
  );
  return data; // { data: [...], total: number }
}

/**
 * Delete a document (soft-delete in DB + permanent delete from Drive).
 * @param {number} documentId
 */
export async function deleteApplicationDocument(documentId) {
  const { data } = await axios.delete(
    `${BASE}/api/application-documents/${documentId}`,
    { headers: getAuthHeaders() }
  );
  return data; // { message: "Document deleted successfully." }
}