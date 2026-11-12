// src/api/eservices-drug-groups.js

import API from "./axios";

const extractErrorMessage = (error, fallback) => {
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") return detail;
  return error.message || fallback;
};

// Serialize arrays as repeated keys (generic_names=a&generic_names=b),
// which is what FastAPI expects for List[str] query params.
const serializeParams = (params) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) value.forEach((v) => sp.append(key, v));
    else sp.append(key, value);
  });
  return sp.toString();
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

/**
 * Get the records behind a drug group total (one row per product).
 * Params: { group, application_status, application_step?, search?,
 *           generic_names?: string[], page?, page_size? }
 * Returns { data: [{ application_number, generic_name, brand_name }], total }
 */
export const getEservicesDrugGroupRecords = async (params) => {
  try {
    const response = await API.get("/reports/drug-group-records", {
      params,
      paramsSerializer: serializeParams,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      extractErrorMessage(error, "Failed to fetch eServices records"),
    );
  }
};

/**
 * Get the distinct generic names of a drug group (multi-select options).
 * Params: { group, application_status, application_step? }
 * Returns { data: [{ name, count }] }
 */
export const getEservicesDrugGroupGenericNames = async (params) => {
  try {
    const response = await API.get("/reports/drug-group-records/generic-names", {
      params,
      paramsSerializer: serializeParams,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      extractErrorMessage(error, "Failed to fetch generic names"),
    );
  }
};