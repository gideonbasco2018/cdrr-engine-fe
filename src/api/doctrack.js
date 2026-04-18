// src/api/doctrack.js

import API from "./axios";

// ─────────────────────────────────────────────
// Existing endpoints (unchanged)
// ─────────────────────────────────────────────

export const getDocumentByRSN = async (rsn) => {
  try {
    const response = await API.get("/doctrack/", { params: { rsn } });
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch document";
    throw new Error(errorMessage);
  }
};

export const getDocumentLog = async (docrecID) => {
  try {
    const response = await API.get("/doctrack/log", { params: { docrecID } });
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch document log";
    throw new Error(errorMessage);
  }
};

export const createDocumentLog = async (logData) => {
  try {
    const response = await API.post("/doctrack/log", logData);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to create document log";
    throw new Error(errorMessage);
  }
};

export const createBulkDocumentLogs = async (logs) => {
  try {
    const response = await API.post("/doctrack/docktrack/log/bulk", { logs });
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to create bulk document logs";
    throw new Error(errorMessage);
  }
};

export const getBulkDocumentLogs = async (docrecIDs) => {
  try {
    const response = await API.get("/doctrack/docktrack/log/bulk", { params: { docrecIDs } });
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch bulk document logs";
    throw new Error(errorMessage);
  }
};

export const getDocrecIDsByRSNs = async (rsns) => {
  try {
    const response = await API.get("/doctrack/docktrack/docrecids/bulk", { params: { rsns } });
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch docrecIDs";
    throw new Error(errorMessage);
  }
};

// ─────────────────────────────────────────────
// NEW: Download Excel template
// GET /api/doctrack/download-template
// ─────────────────────────────────────────────

export const downloadDoctrackTemplate = async () => {
  try {
    const response = await API.get("/doctrack/download-template", {
      responseType: "blob",   // ← important: backend returns binary xlsx
    });
    // Trigger browser download
    const url  = URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href     = url;
    link.download = "doctrack_upload_template.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to download template";
    throw new Error(errorMessage);
  }
};

// ─────────────────────────────────────────────
// NEW: Upload Excel file → inserts logs into doctrack DB
// POST /api/doctrack/upload-excel?username=<username>
//
// Sends:  multipart/form-data  { file: <xlsx> }
// Returns: {
//   success, message,
//   stats:   { total, valid, inserted, failed },
//   all_failed:       [{ rowNum, rsn, remarks, reason }],
//   inserted_records: [{ rowNum, rsn, remarks }]
// }
// ─────────────────────────────────────────────

// AFTER:
export const uploadDoctrackExcel = async (file, username, alias = "") => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await API.post("/doctrack/upload-excel", formData, {
      params:  { username, alias },          // ← idagdag alias
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to upload Excel file";
    throw new Error(errorMessage);
  }
};

// ─────────────────────────────────────────────
// NEW: Save upload history to main DB
// POST /api/bulk-upload-history/
//
// Call this right after uploadDoctrackExcel() succeeds.
// Payload maps directly from uploadDoctrackExcel() response.
// ─────────────────────────────────────────────

export const saveUploadHistory = async ({ fileName, uploadedBy, stats, insertedRecords, allFailed }) => {
  try {
    const response = await API.post("/bulk-upload-history/", {
      fileName,
      uploadedBy,                         // username string
      insertedCount: stats.inserted,
      failedCount:   stats.failed,
      insertedRecords: insertedRecords.map((r) => ({
        rowNum:  r.rowNum,
        rsn:     r.rsn,
        remarks: r.remarks,
      })),
      failedRecords: allFailed.map((r) => ({
        rowNum:  r.rowNum,
        rsn:     r.rsn,
        remarks: r.remarks ?? "",
        reason:  r.reason,
      })),
    });
    return response.data;  // returns saved history entry with historyID
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to save upload history";
    throw new Error(errorMessage);
  }
};

// ─────────────────────────────────────────────
// NEW: Get paginated upload history list
// GET /api/bulk-upload-history/
// ─────────────────────────────────────────────
export const getUploadHistoryList = async ({ limit, offset = 0, uploadedBy } = {}) => {
  try {
    const response = await API.get("/bulk-upload-history/", {
      params: {
        ...(limit !== undefined ? { limit } : {}),  
        offset,
        ...(uploadedBy ? { uploaded_by: uploadedBy } : {}),
      },
    });
    return response.data; 
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch upload history";
    throw new Error(errorMessage);
  }
};

// ─────────────────────────────────────────────
// NEW: Get paginated inserted records for a history entry
// GET /api/bulk-upload-history/{historyId}/records
// Used by the View modal "Inserted" tab
// ─────────────────────────────────────────────

export const getHistoryRecords = async (historyId, { limit = 10, offset = 0, search } = {}) => {
  try {
    const response = await API.get(`/bulk-upload-history/${historyId}/records`, {
      params: {
        limit,
        offset,
        ...(search ? { search } : {}),
      },
    });
    return response.data;  // { total, limit, offset, historyID, data: [...] }
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch history records";
    throw new Error(errorMessage);
  }
};

// ─────────────────────────────────────────────
// NEW: Get single history entry (with failedRecords JSON)
// GET /api/bulk-upload-history/{historyId}
// ─────────────────────────────────────────────
export const getUploadHistoryById = async (historyId) => {
  try {
    const response = await API.get(`/bulk-upload-history/${historyId}`);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || error.message || "Failed to fetch history detail";
    throw new Error(errorMessage);
  }
};


// ADD at the bottom:

/**
 * Insert a single doctrack log by RSN (for ViewDetails modal)
 * @param {string} rsn - 14-digit doctrack number
 * @param {string} remarks - doctrack remarks
 * @param {number} userID - logged-in user's ID
 */
export const createDoctrackLogByRsn = async (rsn, remarks, userID) => {
  try {
    const response = await API.post("/doctrack/log/by-rsn", {
      rsn,
      remarks,
      userID,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating doctrack log by RSN:", error);
    // Non-fatal — don't throw, just log
    return null;
  }
};

/**
 * Bulk insert doctrack logs by RSN (for BulkDeck modal)
 * @param {Array<{rsn: string, remarks: string, userID: number}>} entries
 */
export const createBulkDoctrackLogsByRsn = async (entries) => {
  try {
    const response = await API.post("/doctrack/log/bulk-by-rsn-with-user", {
      entries,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating bulk doctrack logs by RSN:", error);
    return null;
  }
};