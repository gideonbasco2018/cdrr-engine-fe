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

/**
 * Get the tasks the logged-in user has claimed
 * @param {"open"|"processed"} [scope]
 */
export const getMyAppointmentTasks = async (scope = "open") => {
  try {
    const response = await API.get("/appointment-records/my-tasks", {
      params: { scope },
    });
    return response.data; // [{ application_uuid, reference_number, ... }]
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch my tasks";
    throw new Error(errorMessage);
  }
};

// Converts one task from the backend into a row for EApplicationPage
export const mapMyTask = (task, status = "claimed") => ({
  id: task.application_uuid,
  source: "internal", // marks rows that came from the internal DB
  department: "payment_posting",
  processCode: task.process_code,
  referenceNo: task.reference_number,
  activity: task.activity,
  applicantCompany: task.applicant_company,
  applicationStep: task.application_step || "—",
  dueDate: task.deadline_date || task.step_duedate || null,
  lastModified: formatStamp(task.updated_at || task.start_date),
  priority: task.priority || null,
  remarks: task.application_remarks || "",
  status,
  claimedBy: null, // set by the page (it knows the current user)
});


/**
 * Get the full details of an application the user has claimed
 * @param {string} referenceNo
 */
export const getClaimedApplication = async (referenceNo) => {
  try {
    const response = await API.get(
      `/appointment-records/claimed/${encodeURIComponent(referenceNo)}`,
    );
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch application details";
    throw new Error(errorMessage);
  }
};

/**
 * Post the cashier's payments for a claimed application
 * @param {string} referenceNo
 * @param {Object} payload
 * @param {Array} payload.payments
 * @param {string} [payload.remarks]
 */
export const postClaimedPayments = async (referenceNo, payload) => {
  try {
    const response = await API.post(
      `/appointment-records/claimed/${encodeURIComponent(referenceNo)}/payments`,
      payload,
    );
    return response.data;
  } catch (error) {
    const detail = error.response?.data?.detail;
    const errorMessage =
      (typeof detail === "string" ? detail : null) ||
      (detail ? "The payment details are invalid" : null) ||
      error.message ||
      "Failed to post payment";
    throw new Error(errorMessage);
  }
};