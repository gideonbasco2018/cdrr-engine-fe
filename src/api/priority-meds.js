// src/api/priority-meds.js
// src/api/priority-meds.js

import API from "./axios";

/**
 * Get cancer meds breakdown (in-progress applications)
 * Returns { items: [{ type, generic_name, total_pending, type_total }], grand_total }
 */
export const getCancerMedsBreakdown = async () => {
  try {
    const response = await API.get("/monitoring/priority-meds/cancer");
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to fetch cancer meds breakdown";
    throw new Error(errorMessage);
  }
};

/**
 * Get rare disease meds breakdown (in-progress applications)
 * Returns { items: [{ type, generic_name, total_pending, type_total }], grand_total }
 */
export const getRareDiseaseBreakdown = async () => {
  try {
    const response = await API.get("/monitoring/priority-meds/rare-disease");
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to fetch rare disease breakdown";
    throw new Error(errorMessage);
  }
};

/**
 * Get flu vaccine breakdown (in-progress applications)
 * Returns { items: [{ generic_name, pharma_category, total_count }], grand_total }
 */
export const getFluVaccineBreakdown = async () => {
  try {
    const response = await API.get("/monitoring/priority-meds/flu-vaccines");
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to fetch flu vaccine breakdown";
    throw new Error(errorMessage);
  }
};

/**
 * Get pneumococcal vaccine breakdown (in-progress applications)
 * Returns { items: [{ pharma_category, generic_name, total_count }], grand_total }
 */
export const getPneumococcalBreakdown = async () => {
  try {
    const response = await API.get("/monitoring/priority-meds/pneumococcal");
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to fetch pneumococcal breakdown";
    throw new Error(errorMessage);
  }
};