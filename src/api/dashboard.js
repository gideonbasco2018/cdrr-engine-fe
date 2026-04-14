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




// ─── Chart / Table time-series (NEW) ─────────────────────────────────────────
/**
 * Fetches time-series data for the Insights chart and data table.
 *
 * @param {Object} params
 * @param {"day"|"month"|"year"} params.breakdown  - granularity
 * @param {string} [params.date_from]              - YYYY-MM-DD
 * @param {string} [params.date_to]               - YYYY-MM-DD
 * @param {string} [params.impersonate]            - admin only
 *
 * @returns {Promise<{
 *   username: string,
 *   breakdown: string,
 *   date_from: string|null,
 *   date_to: string|null,
 *   total_received: number,
 *   total_completed: number,
 *   total_on_process: number,
 *   total_target: number,
 *   overall_completed_rate: number|null,
 *   data: Array<{
 *     label: string,
 *     received: number,
 *     completed: number,
 *     on_process: number,
 *     target: number,
 *     completed_rate: number|null,
 *   }>
 * }>}
 */
export async function getDashboardChart(params = {}) {
  const { data } = await axios.get(`/dashboard/stats/chart`, { params });
  return data;
}
 

export async function getDashboardRecentApplications(params = {}) {
  const { data } = await axios.get("/dashboard/stats/recent-applications", { params });
  return data;
}
 