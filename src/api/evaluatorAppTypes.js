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