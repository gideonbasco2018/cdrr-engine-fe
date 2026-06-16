// src/api/frpMonitoring.js
// FRP / CRP Monitoring — all API calls in one place
// Mirrors the pattern in src/api/monitoring.js

import API from "./axios";

/**
 * Strip null / undefined / empty-string entries so the backend never gets junk params.
 * @param {Object} params
 * @returns {Object}
 */
function clean(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== "")
  );
}

// ─── KPI Summary ──────────────────────────────────────────────────────────────
/**
 * Overall KPI numbers shown in the top stat cards.
 *
 * @returns {Promise<{
 *   total_applications: number,
 *   released_this_month: number,
 *   avg_tat_days: number|null,
 *   pending: number,
 *   overdue: number
 * }>}
 */
export const getKpiSummary = async () => {
  try {
    const res = await API.get("/frp-monitoring/kpi-summary");
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to fetch KPI summary");
  }
};

// ─── Application Status Breakdown ─────────────────────────────────────────────
/**
 * Used by the KPI card tooltip — shows count per app status.
 *
 * @returns {Promise<{ total: number, data: Array<{ status: string, count: number }> }>}
 */
export const getAppStatusBreakdown = async () => {
  try {
    const res = await API.get("/frp-monitoring/app-status-breakdown");
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to fetch app status breakdown");
  }
};

// ─── Status Distribution ──────────────────────────────────────────────────────
/**
 * Used by the Application Type Distribution donut chart.
 *
 * @returns {Promise<{ total: number, data: Array<{ status: string, count: number }> }>}
 */
export const getStatusDistribution = async () => {
  try {
    const res = await API.get("/frp-monitoring/status-distribution");
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to fetch status distribution");
  }
};

// ─── Document Types ───────────────────────────────────────────────────────────
/**
 * Used by the Document Types donut chart.
 *
 * @returns {Promise<{ total: number, data: Array<{ doc_type: string, count: number }> }>}
 */
export const getDocTypes = async () => {
  try {
    const res = await API.get("/frp-monitoring/doc-types");
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to fetch document types");
  }
};

// ─── Top Countries ────────────────────────────────────────────────────────────
/**
 * Countries ranked by application count for a given entity role.
 *
 * @param {"manufacturer"|"trader"|"importer"|"distributor"|"repacker"} entity_type
 * @returns {Promise<{ data: Array<{ country: string, total: number, approved: number, rejected: number, pending: number }> }>}
 */
export const getTopCountries = async (entity_type) => {
  try {
    const res = await API.get("/frp-monitoring/top-countries", { params: clean({ entity_type }) });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to fetch top countries");
  }
};

// ─── Product Categories ───────────────────────────────────────────────────────
/**
 * Used by the Product Category Breakdown bar chart.
 *
 * @returns {Promise<{ data: Array<{ category: string, count: number }> }>}
 */
export const getProductCategories = async () => {
  try {
    const res = await API.get("/frp-monitoring/product-categories");
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to fetch product categories");
  }
};

// ─── Compliance ───────────────────────────────────────────────────────────────
/**
 * Used by the Compliance Monitoring tile.
 *
 * @returns {Promise<{
 *   pending_requests: number,
 *   avg_days_awaiting: number|null,
 *   issued_this_month: number,
 *   resolved: number
 * }>}
 */
export const getCompliance = async () => {
  try {
    const res = await API.get("/frp-monitoring/compliance");
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to fetch compliance data");
  }
};

// ─── CPR / Received-vs-Released Trend ────────────────────────────────────────
/**
 * Monthly received vs released trend used by the line chart.
 *
 * @param {Object} [params]
 * @param {number|null}  [params.year]         - Filter by calendar year
 * @param {string|null}  [params.doc_type]     - Filter by document type
 * @param {string|null}  [params.country]      - Filter by country
 * @param {string|null}  [params.country_type] - manufacturer|trader|importer|distributor|repacker
 *
 * @returns {Promise<Array<{ period: string, received_count: number, released_count: number }>>}
 */
export const getCprTrend = async (params = {}) => {
  try {
    const res = await API.get("/frp-monitoring/cpr-trend", { params: clean(params) });
    // Normalise: backend may return array directly OR { data: [...] }
    return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to fetch CPR trend");
  }
};

// ─── Recent Activity ──────────────────────────────────────────────────────────
/**
 * Latest application events for the Activity Feed tile.
 *
 * @param {number} [limit=20] - Maximum number of events to return
 * @returns {Promise<{ data: Array }>}
 */
export const getRecentActivity = async (limit = 20) => {
  try {
    const res = await API.get("/frp-monitoring/recent-activity", { params: clean({ limit }) });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to fetch recent activity");
  }
};

// ─── Alerts ───────────────────────────────────────────────────────────────────
/**
 * System alerts shown in the Alerts & Notifications tile.
 *
 * @returns {Promise<{ data: Array<{ level: "critical"|"warning"|"info", message: string }> }>}
 */
export const getAlerts = async () => {
  try {
    const res = await API.get("/frp-monitoring/alerts");
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to fetch alerts");
  }
};

// ─── Applications (Modal table) ───────────────────────────────────────────────
/**
 * Paginated application list used by ApplicationsModal.
 *
 * @param {Object} params
 * @param {"all"|"released_this_month"|"pending_compliance"|"overdue"} [params.filter_type="all"]
 * @param {string|null}  [params.search]            - Free-text / DTN search
 * @param {number}       [params.page=1]
 * @param {number}       [params.page_size=50]
 * @param {string|null}  [params.period]            - "YYYY-MM" — activates split view
 * @param {"received"|"released"|null} [params.period_type]
 * @param {string|null}  [params.est_cat]
 * @param {string|null}  [params.app_type]
 * @param {string|null}  [params.lto_company]
 * @param {string|null}  [params.brand_name]
 * @param {string|null}  [params.generic_name]
 * @param {string|null}  [params.dosage_form]
 * @param {string|null}  [params.doc_type]
 * @param {string|null}  [params.uploaded_by]
 * @param {string|null}  [params.upload_date_from]  - YYYY-MM-DD
 * @param {string|null}  [params.upload_date_to]
 * @param {string|null}  [params.date_received_from]
 * @param {string|null}  [params.date_received_to]
 * @param {string|null}  [params.date_released_from]
 * @param {string|null}  [params.date_released_to]
 * @param {string|null}  [params.manufacturer]
 * @param {string|null}  [params.manufacturer_country]
 * @param {string|null}  [params.trader]
 * @param {string|null}  [params.trader_country]
 * @param {string|null}  [params.importer]
 * @param {string|null}  [params.importer_country]
 * @param {string|null}  [params.distributor]
 * @param {string|null}  [params.distributor_country]
 * @param {string|null}  [params.repacker]
 * @param {string|null}  [params.repacker_country]
 *
 * @returns {Promise<{ total: number, page: number, page_size: number, total_pages: number, data: Array }>}
 */
export const getApplications = async (params = {}) => {
  try {
    const res = await API.get("/frp-monitoring/applications", { params: clean(params) });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to fetch applications");
  }
};

// ─── Filter Options (Modal advanced filters) ──────────────────────────────────
/**
 * Dropdown option lists for all advanced filter fields.
 *
 * @returns {Promise<{
 *   est_cats: string[],
 *   app_types: string[],
 *   doc_types: string[],
 *   manufacturer_countries: string[],
 *   trader_countries: string[],
 *   importer_countries: string[],
 *   distributor_countries: string[],
 *   repacker_countries: string[]
 * }>}
 */
export const getFilterOptions = async () => {
  try {
    const res = await API.get("/frp-monitoring/filter-options");
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to fetch filter options");
  }
};

// ─── Field Suggestions (Autocomplete) ────────────────────────────────────────
/**
 * Returns autocomplete suggestions for a given field.
 *
 * @param {string} field - e.g. "lto_company", "brand_name", "generic_name"
 * @param {string} q     - Search query (min 2 chars)
 * @returns {Promise<{ suggestions: string[] }>}
 */
export const getFieldSuggestions = async (field, q) => {
  try {
    const res = await API.get("/frp-monitoring/field-suggestions", { params: clean({ field, q }) });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to fetch suggestions");
  }
};