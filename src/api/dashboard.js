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

export async function getDashboardUploadHistory(params = {}) {
  const { data } = await axios.get("/main-db/upload-history", { params });
  return data;
}

// ─── GMP dashboard (Good Manufacturing Practices taskforce unit) ─────────────
export const getGMPDashboardSummary = async (params = {}) => {
  const response = await axios.get("/dashboard/gmp/stats/summary", { params });
  return response.data;
};

export async function getGMPDashboardChart(params = {}) {
  const { data } = await axios.get("/dashboard/gmp/stats/chart", { params });
  return data;
}

export async function getGMPDashboardRecentApplications(params = {}) {
  const { data } = await axios.get("/dashboard/gmp/stats/recent-applications", { params });
  return data;
}

export async function getGMPDashboardDetail(params = {}) {
  const { data } = await axios.get("/dashboard/gmp/stats/detail", { params });
  return data;
}

// "Post-Evaluation Status" card — FGMP Dashboard only, no CPR counterpart.
export async function getGMPPostEvalStatusSummary(params = {}) {
  const { data } = await axios.get("/dashboard/gmp/stats/post-eval-status/summary", { params });
  return data;
}

export async function getGMPPostEvalStatusRows(params = {}) {
  const { data } = await axios.get("/dashboard/gmp/stats/post-eval-status", { params });
  return data;
}

// Downloads the list as .xlsx. `buckets` is an array of chip labels from the
// summary ("Checker", "Returned by Checker", …) or ["all"]; the rows exported
// are the union of them. Mirrors exportFilteredGMPRecords in src/api/gmp.js.
export async function exportGMPPostEvalStatus(buckets = ["all"]) {
  const res = await axios.get("/dashboard/gmp/stats/post-eval-status/export", {
    params: { buckets },
    // Repeat the key per value (buckets=a&buckets=b) — that is how FastAPI
    // reads a List[str]. Not comma-joined: a label can contain a comma.
    paramsSerializer: { indexes: null },
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;

  let filename = "post_evaluation_status.xlsx";
  const disposition = res.headers["content-disposition"];
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) filename = match[1];
  }
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}