// src/api/cpr-correction.js

import API from "./axios";

export async function verifyDTN(dtn) {
  const res = await API.post("/cpr-correction/verify-dtn", { dtn });
  return res.data;
}

/**
 * Submits a CPR correction — inserts a new MainDB record with the corrected DTN.
 *
 * @param {Object} payload
 * @param {string} payload.old_dtn   - Original DTN from the verified record
 * @param {string} payload.new_dtn   - New DTN entered by the user
 * @param {Object} payload.*         - Any corrected fields (only send changed ones)
 *
 * Response shape:
 * {
 *   success: boolean,
 *   message: string,
 *   new_dtn: string | null
 * }
 */
export async function submitCorrection(payload) {
  const res = await API.post("/cpr-correction/submit-correction", payload);
  return res.data;
}