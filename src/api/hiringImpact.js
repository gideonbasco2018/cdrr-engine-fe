// src/api/hiringImpact.js
import API from "./axios";

// Kept so the view's sample-data banner keeps working; always false now.
export const IS_MOCK = false;

// GET /api/analytics/hiring-impact?date_from=YYYY-MM&date_to=YYYY-MM
// Returns: { data: [{ month: "2025-03", received, released, backlog }] }
export const getHiringImpactSeries = async ({ from, to }) => {
  try {
    const response = await API.get("/analytics/hiring-impact", {
      params: { date_from: from, date_to: to },
    });
    return response.data.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch hiring impact data";
    throw new Error(errorMessage);
  }
};