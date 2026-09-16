// FILE: src/api/clinicalTrials.js
import api from "./axios";

const BASE = "/clinical-trials";

// ── List / Search ──────────────────────────────────────────
export const getClinicalTrials = (params) => {
  // params: { search, phase, drug_type, page, rows_per_page }
  return api.get(BASE, { params });
};

// ── Single record ──────────────────────────────────────────
export const getClinicalTrial = (id) => api.get(`${BASE}/${id}`);

export const createClinicalTrial = (payload) => api.post(BASE, payload);

export const updateClinicalTrial = (id, payload) =>
  api.put(`${BASE}/${id}`, payload);

// ── Audit logs ─────────────────────────────────────────────
export const getClinicalTrialAuditLogs = (id) =>
  api.get(`${BASE}/${id}/audit-logs`);

// ── Upload (Excel) ─────────────────────────────────────────
export const uploadClinicalTrials = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`${BASE}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ── Template download ──────────────────────────────────────
export const downloadClinicalTrialTemplate = () =>
  api.get(`${BASE}/template/download`, { responseType: "blob" });

// ── Export download ────────────────────────────────────────
export const exportClinicalTrials = (params) =>
  // params: { search, phase, drug_type }
  api.get(`${BASE}/export/download`, { params, responseType: "blob" });

// ── Helper: trigger browser download from a blob response ──
export const triggerFileDownload = (blobResponse, fallbackFilename) => {
  const disposition = blobResponse.headers?.["content-disposition"];
  let filename = fallbackFilename;
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match?.[1]) filename = match[1];
  }
  const url = window.URL.createObjectURL(new Blob([blobResponse.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};