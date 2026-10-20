// src/api/sneAssignments.js
import API from "./axios";

const errorMessage = (error, fallback) =>
  error.response?.data?.detail || error.message || fallback;

// GET /api/sne-assignments/members
// Active S&E members with their assigned generic-name keywords
export const getSneMembers = async () => {
  try {
    const response = await API.get("/sne-assignments/members");
    return response.data;
  } catch (error) {
    throw new Error(errorMessage(error, "Failed to fetch S&E members"));
  }
};

// PUT /api/sne-assignments/members/{userId}/keywords
// Replaces ALL keywords of one member (admin only)
export const updateSneMemberKeywords = async (userId, keywords) => {
  try {
    const response = await API.put(
      `/sne-assignments/members/${userId}/keywords`,
      { keywords },
    );
    return response.data;
  } catch (error) {
    throw new Error(errorMessage(error, "Failed to save keywords"));
  }
};

// POST /api/sne-assignments/suggest
// items: [{ id, generic_name }] -> { assignments: [{ id, user_id, matched_keyword }] }
export const suggestSneAssignments = async (items) => {
  try {
    const response = await API.post("/sne-assignments/suggest", { items });
    return response.data;
  } catch (error) {
    throw new Error(errorMessage(error, "Failed to get S&E suggestions"));
  }
};

// GET /api/sne-assignments/workload
// [{ user_id, total, by_step: { "S&E": 12, "Quality Evaluation": 3 } }]
export const getSneWorkload = async () => {
  try {
    const response = await API.get("/sne-assignments/workload");
    return response.data;
  } catch (error) {
    throw new Error(errorMessage(error, "Failed to fetch S&E workload"));
  }
};