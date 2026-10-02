// FILE: src/api/checklist.js
import api from "./axios";

export const getChecklists = async () => {
  const response = await api.get("/checklist");
  return response.data;
};

export const createChecklist = async () => {
  const response = await api.post("/checklist");
  return response.data;
};

export const getChecklist = async (id) => {
  const response = await api.get(`/checklist/${id}`);
  return response.data;
};

export const deleteChecklist = async (id) => {
  await api.delete(`/checklist/${id}`);
};

export const addChecklistItem = async (id, dtn) => {
  const response = await api.post(`/checklist/${id}/items`, { dtn });
  return response.data;
};

export const deleteChecklistItem = async (id, itemId) => {
  await api.delete(`/checklist/${id}/items/${itemId}`);
};
