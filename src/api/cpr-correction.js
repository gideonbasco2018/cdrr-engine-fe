// src/api/cpr-correction.js

import API from "./axios";

/**
 * Verifies a DTN against the backend.
 *
 * Response shape:
 * {
 *   found: boolean,
 *   eligible: boolean,
 *   message: string,
 *   dtn, app_status, lto_comp, prod_br_name, app_type,
 *   date_received_cent, ... (all fields when eligible=true)
 * }
 */
export async function verifyDTN(dtn) {
  const res = await API.post("/cpr-correction/verify-dtn", { dtn });
  return res.data;
}