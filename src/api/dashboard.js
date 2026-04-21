// src/api/dashboard.js

import axios from "./axios";

/**
 * Dashboard Stats API
 * ───────────────────────────────────────────────
 * All functions accept an optional `params` object:
 * {
 *   date_from:   "YYYY-MM-DD",  // optional
 *   date_to:     "YYYY-MM-DD",  // optional
 *   impersonate: "username",    // optional, admin only
 * }
 */

// ─────────────────────────────────────────────
// 1. Total Received
// ─────────────────────────────────────────────
export const getDashboardReceived = async (params = {}) => {
  const response = await axios.get("/dashboard/stats/received", { params });
  return response.data;
};

// ─────────────────────────────────────────────
// 2. Completed
// ─────────────────────────────────────────────
export const getDashboardCompleted = async (params = {}) => {
  const response = await axios.get("/dashboard/stats/completed", { params });
  return response.data;
};

// ─────────────────────────────────────────────
// 3. On Process
// ─────────────────────────────────────────────
export const getDashboardOnProcess = async (params = {}) => {
  const response = await axios.get("/dashboard/stats/on-process", { params });
  return response.data;
};

// ─────────────────────────────────────────────
// 4. Summary — all 3 stats in one call (recommended)
// ─────────────────────────────────────────────
export const getDashboardSummary = async (params = {}) => {
  const response = await axios.get("/dashboard/stats/summary", { params });
  return response.data;
};

// ─── Chart / Table time-series ────────────────────────────────────────────────
/**
 * Fetches time-series data for the Insights chart and data table.
 *
 * @param {Object} params
 * @param {"day"|"month"|"year"} params.breakdown  - granularity
 * @param {string} [params.date_from]              - YYYY-MM-DD
 * @param {string} [params.date_to]               - YYYY-MM-DD
 * @param {string} [params.impersonate]            - admin only
 */
export async function getDashboardChart(params = {}) {
  const { data } = await axios.get(`/dashboard/stats/chart`, { params });
  return data;
}

// ─── Recent Applications ──────────────────────────────────────────────────────
export async function getDashboardRecentApplications(params = {}) {
  const { data } = await axios.get("/dashboard/stats/recent-applications", { params });
  return data;
}

// ─── Metric Detail (for drill-down modal) ────────────────────────────────────
/**
 * Fetches paginated application log rows for a specific KPI metric.
 * Used by the detail modal when a user clicks a metric tile.
 *
 * @param {Object} params
 * @param {"received"|"completed"|"on_process"} params.metric  - which KPI
 * @param {string}  [params.date_from]    - YYYY-MM-DD
 * @param {string}  [params.date_to]      - YYYY-MM-DD
 * @param {number}  [params.page]         - 1-based page (default 1)
 * @param {number}  [params.page_size]    - rows per page (default 10, max 50)
 * @param {string}  [params.impersonate]  - admin only
 *
 * @returns {Promise<{
 *   metric: string,
 *   username: string,
 *   date_from: string|null,
 *   date_to: string|null,
 *   total: number,
 *   page: number,
 *   page_size: number,
 *   total_pages: number,
 *   data: Array<{
 *     log_id: number,
 *     dtn: string|null,
 *     brand_name: string|null,
 *     generic_name: string|null,
 *     application_status: string|null,
 *     del_thread: string|null,
 *     app_step: string|null,
 *     start_date: string|null,
 *     end_date: string|null,
 *     user_name: string|null,
 *   }>
 * }>}
 */
export async function getDashboardDetail(params = {}) {
  const { data } = await axios.get("/dashboard/stats/detail", { params });
  return data;
}

export async function getDashboardRecordByDtn(dtn) {
  const { data } = await axios.get(`/dashboard/stats/record-by-dtn`, {
    params: { dtn },
  });
  return data;
}

// ─── All Recent Applications (paginated) ─────────────────────────────────────
export async function getDashboardAllRecentApplications(params = {}) {
  const { data } = await axios.get("/dashboard/stats/recent-applications", { params });
  return data;
}