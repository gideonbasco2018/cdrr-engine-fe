// src/api/gmpClosedTasks.js
// FGMP "Close Task (Final)" — permanently close applications from the Queue.
// Kept in its own file (not api/gmp.js) so it stays separate from other work.
import API from "./axios";

/**
 * POST /api/gmp-closed-tasks/bulk
 *
 * @param {object}   payload
 * @param {number[]} payload.record_ids                   - ids (GMP_ID) of the ticked rows;
 *                                                          the server closes EVERY reference of each DTN
 * @param {string}   payload.reason_for_closing
 * @param {string}  [payload.remarks]
 * @param {string}  [payload.date_released]               - "YYYY-MM-DD"
 * @param {string}  [payload.type_of_issuance_released]   - audit only
 * @returns {Promise<{closed: Array<{dtn, reference_nos, open_logs_closed}>, total_dtns, total_references, total_logs_closed}>}
 *
 * On failure throws an Error whose `.message` is the server's reason and whose
 * `.errors` is { already_closed?: string[], not_found?: number[] } (409 only).
 * The batch is all-or-nothing: on any error nothing was closed.
 */
export const closeGMPTasksBulk = async (payload) => {
  try {
    const res = await API.post("/gmp-closed-tasks/bulk", payload);
    return res.data;
  } catch (error) {
    const detail = error.response?.data?.detail;
    const err = new Error(
      (typeof detail === "string" ? detail : detail?.message)
        || error.message
        || "Failed to close the applications.",
    );
    err.errors = (detail && typeof detail === "object" ? detail.errors : null) ?? null;
    err.status = error.response?.status ?? null;
    throw err;
  }
};
