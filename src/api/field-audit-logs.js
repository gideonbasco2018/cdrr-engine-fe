// src/api/field-audit-logs.js

import API from "./axios"; // ← same import na ginagamit ng ibang API files mo

/* ================================================================== */
/*  POST — Save field changes (called on submit)                        */
/* ================================================================== */
export const createFieldAuditLog = async (payload) => {
  try {
    const response = await API.post("/field-audit-logs/", payload);
    return response.data;
  } catch (error) {
    const errMsg = error.response?.data?.detail || error.message || "Failed to save audit log";
    throw new Error(errMsg);
  }
};

/* ================================================================== */
/*  GET — Audit history ng isang record (grouped by session)           */
/* ================================================================== */
export const getFieldAuditHistory = async (mainDbId) => {
  try {
    const response = await API.get(`/field-audit-logs/${mainDbId}`);
    return response.data;
  } catch (error) {
    const errMsg = error.response?.data?.detail || error.message || "Failed to fetch audit history";
    throw new Error(errMsg);
  }
};

/* ================================================================== */
/*  GET — Lahat ng edits ng isang specific user                        */
/* ================================================================== */
export const getFieldAuditByUser = async (username, limit = 50) => {
  try {
    const response = await API.get(`/field-audit-logs/by-user/${encodeURIComponent(username)}`, {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    const errMsg = error.response?.data?.detail || error.message || "Failed to fetch user audit logs";
    throw new Error(errMsg);
  }
};

/* ================================================================== */
/*  GET — Single session drill-down                                     */
/* ================================================================== */
export const getFieldAuditBySession = async (sessionId) => {
  try {
    const response = await API.get(`/field-audit-logs/session/${encodeURIComponent(sessionId)}`);
    return response.data;
  } catch (error) {
    const errMsg = error.response?.data?.detail || error.message || "Failed to fetch session audit logs";
    throw new Error(errMsg);
  }
};

/* ================================================================== */
/*  GET — Edit count badge                                              */
/* ================================================================== */
export const getFieldAuditCount = async (mainDbId) => {
  try {
    const response = await API.get(`/field-audit-logs/count/${mainDbId}`);
    return response.data;
  } catch (error) {
    const errMsg = error.response?.data?.detail || error.message || "Failed to fetch audit count";
    throw new Error(errMsg);
  }
};

/* ================================================================== */
/*  UTIL — Compute diff (no API call, pure function)                   */
/* ================================================================== */
export const computeFieldChanges = (
  originalRecord,
  editedFields,
  fieldLabelMap = {},
  stepContext = "",
) => {
  return Object.entries(editedFields)
    .filter(([key, newVal]) => {
      const oldVal = originalRecord[key];
      return String(newVal ?? "") !== String(oldVal ?? "");
    })
    .map(([key, newVal]) => ({
      field_name:   key,
      field_label:  fieldLabelMap[key] ?? key,
      old_value:    originalRecord[key] != null ? String(originalRecord[key]) : null,
      new_value:    newVal != null ? String(newVal) : null,
      step_context: stepContext,
    }));
};