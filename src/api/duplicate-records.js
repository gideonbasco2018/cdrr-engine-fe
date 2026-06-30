// src/api/duplicate-records.js

import API from "./axios";

/**
 * Get paginated duplicate records from MainDB, grouped by DTN or Registration No.
 *
 * Finds TRUE duplicates across the entire dataset (not just the current page/filter
 * view) — useful for the "Find Duplicates" button in DataTable.
 *
 * @param {Object} params
 * @param {"dtn"|"reg_no"} params.by      - Field to check duplicates on (required)
 * @param {number}  [params.page=1]       - Page number (1-indexed)
 * @param {number}  [params.page_size=50] - Records per page (max 200)
 *
 * @returns {Promise<{
 *   by: "dtn"|"reg_no",
 *   duplicate_count: number,
 *   page: number,
 *   page_size: number,
 *   total_pages: number,
 *   groups: Array<{dupe_key: string, count: number}>,
 *   records: Array
 * }>}
 */
export const getDuplicateRecords = async (params = {}) => {
  try {
    const response = await API.get("/duplicate-records", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching duplicate records:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch duplicate records";
    throw new Error(errorMessage);
  }
};