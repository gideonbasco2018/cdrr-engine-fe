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