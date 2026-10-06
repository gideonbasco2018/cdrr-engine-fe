// FILE: src/api/checklist.js
import api from "./axios";

export const getChecklists = async () => {
  const response = await api.get("/checklist");
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
