// src/api/gmpAnalytics.js

import API from "./axios";

export const getGMPAnalyticsAvailableYears = async () => {
  const res = await API.get("/gmp/analytics/available-years");
  return res.data;
};

export const getGMPAnalyticsSummary = async (params = {}) => {
  const res = await API.get("/gmp/analytics/summary", { params });
  return res.data;
};

export const getGMPAnalyticsDTNSummary = async (params = {}) => {
  const res = await API.get("/gmp/analytics/dtn-summary", { params });
  return res.data;
};

export const getGMPAnalyticsTrend = async (params = {}) => {
  const res = await API.get("/gmp/analytics/trend", { params });
  return res.data;
};

// Mini-trend series for the KPI tiles: per month, or per day once a month is picked.
export const getGMPAnalyticsSparklines = async (params = {}) => {
  const res = await API.get("/gmp/analytics/sparklines", { params });
  return res.data;
};

export const getGMPAnalyticsByCategory = async (params = {}) => {
  const res = await API.get("/gmp/analytics/by-category", { params });
  return res.data;
};

export const getGMPAnalyticsStepTiming = async () => {
  const res = await API.get("/gmp/analytics/step-timing");
  return res.data;
};

export const getGMPAnalyticsWorkload = async (params = {}) => {
  const res = await API.get("/gmp/analytics/workload", { params });
  return res.data;
};

export const getGMPAnalyticsByStep = async (params = {}) => {
  const res = await API.get("/gmp/analytics/by-step", { params });
  return res.data;
};

export const getGMPAnalyticsAging = async (params = {}) => {
  const res = await API.get("/gmp/analytics/aging", { params });
  return res.data;
};

export const getGMPAnalyticsNOD = async (params = {}) => {
  const res = await API.get("/gmp/analytics/nod", { params });
  return res.data;
};

export const getGMPAnalyticsPicsCountry = async (params = {}) => {
  const res = await API.get("/gmp/analytics/pics-country", { params });
  return res.data;
};

// One row per month — received / released / disapproved / on process, release
// rate, and records actually released in that month. params: { year }.
export const getGMPAnalyticsMonthly = async (params = {}) => {
  const res = await API.get("/gmp/analytics/monthly", { params });
  return res.data;
};

// Data completeness per year (Date Received / Released Date / Type of Issuance).
export const getGMPAnalyticsDataQuality = async (params = {}) => {
  const res = await API.get("/gmp/analytics/data-quality", { params });
  return res.data;
};

// Records behind one completeness cell. params: { year, issue, page, page_size, search }.
export const getGMPAnalyticsQualityRecords = async (params = {}) => {
  const res = await API.get("/gmp/analytics/data-quality/records", { params });
  return res.data;
};
