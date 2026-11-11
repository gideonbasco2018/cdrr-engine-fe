// src/api/evaluatorAppTypes.js
// NOTE: adjust this import to the axios instance used by your other api files
import api from "./axios";

export const getEvaluatorAppTypes = async (params = {}) => {
  const { data } = await api.get("/monitoring/evaluator-app-types", { params });
  return data;
};

// Daily received (decked) / completed per unit and member.
// Expected response: an array of rows, or { data: [...] }, where each row is
// { unit_id, unit_name, user_id, name, date: "YYYY-MM-DD", received, completed }
export const getEvaluatorDailyActivity = async (params = {}) => {
  const { data } = await api.get("/monitoring/evaluator-app-types/daily", {
    params,
  });
  return data;
};

// Applications behind a Workload number (decked / completed / still open)
export const getWorkloadRecords = async (params = {}) => {
  const { data } = await api.get("/monitoring/evaluator-app-types/records", {
    params,
  });
  return data;
};

export const getEvaluatorUnits = async () => {
  const { data } = await api.get("/monitoring/evaluator-app-types/units");
  return data;
};

export const getEvaluatorActivityRecords = async (params = {}) => {
  const { data } = await api.get("/monitoring/evaluator-app-types/daily/records", {
    params,
  });
  return data;
};