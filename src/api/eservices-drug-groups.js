// src/api/eservices-drug-groups.js

import API from "./axios";

const extractErrorMessage = (error, fallback) => {
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") return detail;
  return error.message || fallback;
};

/**
 * Get the available eServices drug groups (used to build the tabs).
 * Returns [{ key, label }]
 */
export const getEservicesDrugGroups = async () => {
  try {
    const response = await API.get("/reports/drug-groups");
    return response.data;
  } catch (error) {
    throw new Error(
      extractErrorMessage(error, "Failed to fetch eServices drug groups"),
    );
  }
};

/**
 * Get the CLIDP summary for a drug group from the eServices DB.
 * applicationStatus: "Pending" | "Completed"
 * Returns {
 *   group, application_status, total_application_count, total_product_count,
 *   items: [{ pharmacologic_category, generic_name, application_count, product_count }]
 * }
 */
export const getEservicesDrugGroupSummary = async (
  group,
  applicationStatus = "Pending",
  applicationStep = null,
) => {
  try {
    const params = { group, application_status: applicationStatus };
    if (applicationStep) params.application_step = applicationStep;

    const response = await API.get("/reports/drug-group-summary", { params });
    return response.data;
  } catch (error) {
    throw new Error(
      extractErrorMessage(error, "Failed to fetch eServices drug group summary"),
    );
  }
};