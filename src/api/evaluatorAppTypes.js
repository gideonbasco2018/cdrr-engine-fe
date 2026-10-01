// src/api/evaluatorAppTypes.js
// NOTE: adjust this import to the axios instance used by your other api files
import api from "./axios";

export const getEvaluatorAppTypes = async (params = {}) => {
  const { data } = await api.get("/monitoring/evaluator-app-types", { params });
  return data;
};