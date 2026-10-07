// FILE: src/api/checklist.js
import api from "./axios";

// dateFilter: { from, to } as "YYYY-MM-DD" (Manila), or null for no filter.
export const getChecklists = async (dateFilter = null) => {
  const params = dateFilter ? { date_from: dateFilter.from, date_to: dateFilter.to, limit: 500 } : undefined;
  const response = await api.get("/checklist", { params });
  return response.data;
};

// DTNs (and which checklist they're on) whose DTN or subject contains q.
export const searchChecklists = async (q) => {
  const response = await api.get("/checklist/search", { params: { q } });
  return response.data;
};

// Manila time from the server's clock (for "Generated:" on the exports).
export const getServerTime = async () => {
  const response = await api.get("/checklist/server-time");
  return response.data.now;
};

export const createChecklist = async () => {
  const response = await api.post("/checklist");
  return response.data;
};

export const getChecklist = async (id) => {
  const response = await api.get(`/checklist/${id}`);
  return response.data;
};

export const updateChecklistLabel = async (id, label) => {
  const response = await api.patch(`/checklist/${id}`, { label });
  return response.data;
};

// Retry the FIS subject lookup for DTNs still pending / failed.
export const refreshChecklistSubjects = async (id) => {
  const response = await api.post(`/checklist/${id}/subjects/refresh`);
  return response.data;
};

export const deleteChecklist = async (id) => {
  await api.delete(`/checklist/${id}`);
};

export const addChecklistItem = async (id, dtn) => {
  const response = await api.post(`/checklist/${id}/items`, { dtn });
  return response.data;
};

// Soft remove — the DTN shows in the checklist's Bin (no restore).
export const deleteChecklistItem = async (id, itemId) => {
  await api.delete(`/checklist/${id}/items/${itemId}`);
};

export const getChecklistBin = async (id) => {
  const response = await api.get(`/checklist/${id}/bin`);
  return response.data;
};
