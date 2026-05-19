// src/api/dashboard.js

import axios from "./axios";

export const getDashboardReceived = async (params = {}) => {
  const response = await axios.get("/dashboard/stats/received", { params });
  return response.data;
};

export const getDashboardCompleted = async (params = {}) => {
  const response = await axios.get("/dashboard/stats/completed", { params });
  return response.data;
};

export const getDashboardOnProcess = async (params = {}) => {
  const response = await axios.get("/dashboard/stats/on-process", { params });
  return response.data;
};

export const getDashboardSummary = async (params = {}) => {
  const response = await axios.get("/dashboard/stats/summary", { params });
  return response.data;
};

export async function getDashboardChart(params = {}) {
  const { data } = await axios.get(`/dashboard/stats/chart`, { params });
  return data;
}

export async function getDashboardRecentApplications(params = {}) {
  const { data } = await axios.get("/dashboard/stats/recent-applications", { params });
  return data;
}

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

export async function getDashboardAllRecentApplications(params = {}) {
  const { data } = await axios.get("/dashboard/stats/recent-applications", { params });
  return data;
}

export async function getDashboardGlobalAllRecentApplications(params = {}) {
  const { data } = await axios.get("/dashboard/stats/global-recent-applications", { params });
  return data;
}