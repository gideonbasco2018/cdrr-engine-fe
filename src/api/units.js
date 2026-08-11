// src/api/units.js

import API from "./axios";

/**
 * Get all units (optionally filter by active status)
 * @param {Object} params
 * @param {boolean} [params.is_active]
 */
export const getUnits = async (params = {}) => {
  try {
    const response = await API.get("/units/", { params });
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to fetch units";
    throw new Error(errorMessage);
  }
};

/**
 * Get a single unit by ID
 * @param {number} id
 */
export const getUnitById = async (id) => {
  try {
    const response = await API.get(`/units/${id}`);
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to fetch unit";
    throw new Error(errorMessage);
  }
};

/**
 * Create a new unit
 * @param {Object} payload
 * @param {string} payload.name
 * @param {string} [payload.description]
 * @param {number} [payload.lead_user_id]
 * @param {number} [payload.qa_admin_user_id]
 */
export const createUnit = async (payload) => {
  try {
    const response = await API.post("/units/", payload);
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to create unit";
    throw new Error(errorMessage);
  }
};

/**
 * Update a unit (name, description, lead, QA admin, active status)
 * @param {number} id
 * @param {Object} payload
 */
export const updateUnit = async (id, payload) => {
  try {
    const response = await API.patch(`/units/${id}`, payload);
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to update unit";
    throw new Error(errorMessage);
  }
};

/**
 * Delete a unit (⚠️ cascades — removes all its member assignments too)
 * @param {number} id
 */
export const deleteUnit = async (id) => {
  try {
    await API.delete(`/units/${id}`);
    return true;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to delete unit";
    throw new Error(errorMessage);
  }
};