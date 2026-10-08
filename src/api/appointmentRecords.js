// src/api/appointmentRecords.js

import API from "./axios";

/**
 * Get a page of appointment records from the external database
 * @param {Object} params
 * @param {number} [params.page]
 * @param {number} [params.page_size]
 * @param {string} [params.status]
 * @param {string} [params.search]
 */
export const getAppointmentRecords = async (params = {}) => {
  try {
    const response = await API.get("/appointment-records", { params });
    return response.data; // { total, page, page_size, items }
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch appointment records";
    throw new Error(errorMessage);
  }
};

/**
 * Get a single appointment record by reference number
 * @param {string} referenceNo
 */
export const getAppointmentRecord = async (referenceNo) => {
  try {
    const response = await API.get(
      `/appointment-records/${encodeURIComponent(referenceNo)}`,
    );
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch appointment record";
    throw new Error(errorMessage);
  }
};


/**
 * Claim one or more appointment records for the logged-in user
 * @param {string[]} referenceNumbers
 */
export const claimAppointmentRecords = async (referenceNumbers) => {
  try {
    const response = await API.post("/appointment-records/claim", {
      reference_numbers: referenceNumbers,
    });
    return response.data; // [{ reference_no, result, detail }]
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to claim appointment records";
    throw new Error(errorMessage);
  }
};

// Maps the activity name to the process code used by processRegistry.
// Unknown activities get no code and fall back to the placeholder modal.
const PROCESS_CODE_BY_ACTIVITY = {
  "Minor Variation Notification": "MIVN",
  "FDA GMP Certification": "FGMP",
};

const formatStamp = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-PH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

// Converts one backend record into a row for EApplicationPage
export const mapAppointmentRecord = (record) => ({
  id: record.id,
  source: "appointment", // marks rows that came from the external DB
  department: "payment_posting",
  processCode: PROCESS_CODE_BY_ACTIVITY[record.activity],
  referenceNo: record.reference_no,
  activity: record.activity,
  applicantCompany: record.company_name,
  applicationStep: record.status || "—",
  dueDate: null,
  lastModified: formatStamp(record.updated_at || record.created_at),
  priority: null,
  status: "unclaimed",
  claimedBy: null,
});