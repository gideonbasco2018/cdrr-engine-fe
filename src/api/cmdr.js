// src/api/cmdr.js
import axios from './axios';

const BASE_URL = '/rrdportal/cmdr';

// Drop empty values so they don't end up in the query string.
const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) =>
        v !== '' &&
        v !== null &&
        v !== undefined &&
        !(Array.isArray(v) && v.length === 0)
    )
  );

/**
 * Distinct filter values across all CMDR tables (for dropdowns)
 * @returns {Object} { cmdr_types, type_application, application_option, app_status }
 */
export const getCmdrFilters = async (config = {}) => {
  try {
    const response = await axios.get(`${BASE_URL}/all/filters`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Counts per value for each filter (kind, type_application, application_option, app_status).
 * Takes the same filter params as getCmdrAll; each facet ignores its own filter.
 * @returns {Object} { cmdr_type: [{value, count}], type_application: [...], ... }
 */
export const getCmdrFacets = async (params = {}, config = {}) => {
  try {
    const response = await axios.get(`${BASE_URL}/all/facets`, {
      params: clean(params),
      paramsSerializer: { indexes: null },
      ...config,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * All CMDR tables in one paginated list. Each item has CMDR_TYPE.
 * @param {Object} params
 * @param {number} params.skip - Rows to skip (default: 0)
 * @param {number} params.limit - Rows per page, max 200 (default: 50)
 * @param {string} params.search - Company name, DTN, or app number
 * @param {string} params.app_status - Exact APP_STATUS
 * @param {string} params.type_application - Exact TYPE_APPLICATION
 * @param {string} params.application_option - Exact APPLICATION_OPTION
 * @param {string[]} params.cmdr_type - Limit to these tables
 * @param {boolean} params.include_products - Nest products in each item
 * @param {boolean} params.include_delegations - Nest APP_DELEGATION rows in each item
 * @param {Object} config - Extra axios config, e.g. { signal }
 */
export const getCmdrAll = async (params = {}, config = {}) => {
  try {
    const response = await axios.get(`${BASE_URL}/all`, {
      params: clean(params),
      // Send arrays as ?cmdr_type=a&cmdr_type=b (what FastAPI expects), not cmdr_type[]=a
      paramsSerializer: { indexes: null },
      ...config,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * One table only (initial | initial_abridge | renewal | amendment)
 */
export const getCmdrByType = async (cmdrType, params = {}, config = {}) => {
  try {
    const response = await axios.get(`${BASE_URL}/${cmdrType}`, {
      params: clean(params),
      ...config,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * One application with its products and delegations
 * @param {string} cmdrType - CMDR_TYPE of the item
 * @param {string} appUid - APP_UID of the item
 */
export const getCmdrApplication = async (cmdrType, appUid, config = {}) => {
  try {
    const response = await axios.get(`${BASE_URL}/${cmdrType}/${appUid}`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/** APP_DELEGATION rows of one application, ordered by DEL_INDEX */
export const getCmdrDelegations = async (cmdrType, appUid, config = {}) => {
  try {
    const response = await axios.get(`${BASE_URL}/${cmdrType}/${appUid}/delegations`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export default {
  getCmdrFilters,
  getCmdrFacets,
  getCmdrAll,
  getCmdrByType,
  getCmdrApplication,
  getCmdrDelegations,
};