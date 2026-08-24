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
