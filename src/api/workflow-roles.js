// src/api/workflow-roles.js
import API from "./axios";

// If the Network tab shows /api/api/..., remove "/api" here
// (it means the baseURL of ./axios already ends with /api).
const BASE = "/admin/workflow-roles";

const fail = (error, fallback) => {
  throw new Error(error.response?.data?.detail || error.message || fallback);
};

export const getWorkflowRoles = async () => {
  try {
    const response = await API.get(BASE);
    return response.data;
  } catch (error) {
    fail(error, "Failed to load workflow roles");
  }
};

export const updateWorkflowRole = async (roleKey, groupIds) => {
  try {
    const response = await API.put(`${BASE}/${roleKey}`, {
      group_ids: groupIds,
    });
    return response.data;
  } catch (error) {
    fail(error, "Failed to update workflow role");
  }
};