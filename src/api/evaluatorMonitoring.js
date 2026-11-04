// src/api/evaluatorMonitoring.js

import API from "./axios";

// role: "evaluator" | "checker"
// sources: "cpr", "fgmp" or "cpr,fgmp" (every call below takes it as a param)
export const searchEvaluators = async (
  q,
  limit = 15,
  role = "evaluator",
  sources = "cpr",
) => {
  const res = await API.get("/analytics/evaluator-monitoring/search", {
    params: { q, limit, role, sources },
  });
  return res.data;
};

export const getEvaluatorMonitoring = async (params = {}) => {
  const res = await API.get("/analytics/evaluator-monitoring", { params });
  return res.data;
};

export const getEvaluatorRecords = async (params = {}) => {
  const res = await API.get("/analytics/evaluator-monitoring/records", {
    params,
  });
  return res.data;
};

// The applications behind one Received / Released number of the period card
export const getEvaluatorPeriodRecords = async (params = {}) => {
  const res = await API.get("/analytics/evaluator-monitoring/period-records", {
    params,
  });
  return res.data;
};

// One month of one person: numbers, TAT, top companies / drugs / document types
export const getEvaluatorMonthSummary = async (params = {}) => {
  const res = await API.get("/analytics/evaluator-monitoring/month-summary", {
    params,
  });
  return res.data;
};

// The years in which this person received or released something
export const getEvaluatorYears = async (params = {}) => {
  const res = await API.get("/analytics/evaluator-monitoring/years", { params });
  return res.data;
};
