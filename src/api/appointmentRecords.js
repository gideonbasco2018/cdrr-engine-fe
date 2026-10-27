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
  applicationType: task.application_type || null,
  applicantCompany: task.applicant_company,
  applicationStep: task.application_step || null,
  dueDate: task.deadline_date || task.step_duedate || null,
  lastModified: formatStamp(task.updated_at || task.start_date),
  priority: task.priority || null,
  remarks: task.application_remarks || "",
  decision: task.application_decision || null,
  accomplishedAt: task.accomplished_date || null,
  stepIndex: task.del_index ?? null,
  // how an open task arrived: who handed it over, and with what decision
  fromDecision: task.from_decision || null,
  fromStep: task.from_step || null,
  // FGMP-only; null for other processes
  dtn: task.dtn || null,
  category: task.category || null,
  foreignManufacturer: task.foreign_manufacturer || null,
  typeOfIssuance: task.type_of_issuance || null,
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

/**
 * Get the logged-in user's current access (re-read from the server)
 * @returns {Promise<{ group_ids: number[], is_cashier: boolean }>}
 */
export const getMyAccess = async () => {
  try {
    const response = await API.get("/appointment-records/my-access");
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch access";
    throw new Error(errorMessage);
  }
};

/**
 * Get Decking tasks nobody has claimed yet
 */
export const getDeckingUnclaimed = async () => {
  try {
    const response = await API.get("/appointment-records/decking/unclaimed");
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch Decking tasks";
    throw new Error(errorMessage);
  }
};

/**
 * Claim one or more Decking tasks for the logged-in user
 * @param {string[]} referenceNumbers
 */
export const claimDeckingTasks = async (referenceNumbers) => {
  try {
    const response = await API.post("/appointment-records/decking/claim", {
      reference_numbers: referenceNumbers,
    });
    return response.data; // [{ reference_no, result, detail }]
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to claim Decking tasks";
    throw new Error(errorMessage);
  }
};

// Converts one unassigned Decking task into an "unclaimed" row for EApplicationPage
export const mapDeckingTask = (task) => ({
  ...mapMyTask(task, "unclaimed"),
  source: "decking-pool",
});

/**
 * Get the users the decker can assign as evaluator
 * @returns {Promise<{ user_uuid: string, name: string }[]>}
 */
export const getDeckingEvaluators = async () => {
  try {
    const response = await API.get("/appointment-records/decking/evaluators");
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch evaluators";
    throw new Error(errorMessage);
  }
};

/**
 * Submit the decker's decision for a claimed Decking task
 * @param {string} referenceNo
 * @param {{ decision: string, remarks?: string, evaluator_uuid?: string|null }} payload
 */
export const submitDeckingDecision = async (referenceNo, payload) => {
  try {
    const response = await API.post(
      `/appointment-records/claimed/${encodeURIComponent(referenceNo)}/decking-decision`,
      payload,
    );
    return response.data;
  } catch (error) {
    const detail = error.response?.data?.detail;
    const errorMessage =
      (typeof detail === "string" ? detail : null) ||
      (detail ? "The decision details are invalid" : null) ||
      error.message ||
      "Failed to submit the decision";
    throw new Error(errorMessage);
  }
};

/**
 * What the holder of this task may do at the step it is on. The list comes
 * from the server so the dropdown can never offer an invalid action.
 * @param {string} referenceNo
 * @returns {Promise<{ action: string, next_step: string|null }[]>}
 */
export const getStepActions = async (referenceNo) => {
  try {
    const response = await API.get(
      `/appointment-records/claimed/${encodeURIComponent(referenceNo)}/step-actions`,
    );
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch the available actions";
    throw new Error(errorMessage);
  }
};

/**
 * Get the people who can take the application at the next step
 * @param {string} nextStep e.g. "Checker", "Supervisor"
 * @returns {Promise<{ user_uuid: string, name: string }[]>}
 */
export const getStepAssignees = async (nextStep) => {
  try {
    const response = await API.get("/appointment-records/workflow/assignees", {
      params: { next_step: nextStep },
    });
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      `Failed to fetch the ${nextStep} list`;
    throw new Error(errorMessage);
  }
};

/**
 * What may be issued for an FGMP application. Comes from the server so the
 * list cannot drift from the manual FGMP screen's.
 * @returns {Promise<string[]>}
 */
export const getIssuanceTypes = async () => {
  try {
    const response = await API.get("/appointment-records/workflow/issuance-types");
    return response.data;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch the issuance types";
    throw new Error(errorMessage);
  }
};

/**
 * The number the next certificate would get, for the preview. Nothing is
 * reserved — the number is only taken when the decision is submitted.
 * @param {string} typeOfIssuance
 * @returns {Promise<string|null>}
 */
export const getNextCertificateNumber = async (typeOfIssuance) => {
  try {
    const response = await API.get(
      "/appointment-records/workflow/next-certificate-number",
      { params: { type_of_issuance: typeOfIssuance } },
    );
    return response.data?.certificate_number ?? null;
  } catch {
    return null; // only a preview, so a failure just leaves it blank
  }
};

/**
 * The files the applicant submitted with an application (one row per file,
 * newest first). The same list endpoint serves every e-application process.
 * @param {string} applicationUuid
 * @returns {Promise<{ id: number, requirement_group: string, requirement_code: string,
 *   original_filename: string, file_size_bytes: number|null, drive_file_url: string,
 *   created_at: string|null }[]>}
 */
export const getApplicationDocuments = async (applicationUuid) => {
  try {
    const response = await API.get(
      `/cpr-app-documents/${encodeURIComponent(applicationUuid)}`,
    );
    return response.data?.data || [];
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch the submitted documents";
    throw new Error(errorMessage);
  }
};

/**
 * Submit the decision for whichever workflow step the user is holding
 * @param {string} referenceNo
 * @param {{ decision: string, remarks?: string, assignee_uuid?: string|null }} payload
 */
export const submitStepDecision = async (referenceNo, payload) => {
  try {
    const response = await API.post(
      `/appointment-records/claimed/${encodeURIComponent(referenceNo)}/step-decision`,
      payload,
    );
    return response.data;
  } catch (error) {
    const detail = error.response?.data?.detail;
    const errorMessage =
      (typeof detail === "string" ? detail : null) ||
      (detail ? "The decision details are invalid" : null) ||
      error.message ||
      "Failed to submit the decision";
    throw new Error(errorMessage);
  }
};
/* ───────── Notices of Deficiency (For Compliance) ───────── */

/* The API's snake_case NOD, in the shape the screens use (see fgmpNod.js) */
const mapNod = (nod) => ({
  nodNumber: nod.nod_number,
  activity: nod.activity,
  deficiencies: nod.deficiencies,
  requestedDocuments: (nod.requested_documents || []).map((d) => ({
    id: d.id,
    requirementCode: d.requirement_code,
    status: d.status,
    documentId: d.document_id ?? null,
    filename: d.filename ?? null,
  })),
  issuedDate: nod.issued_date,
  workingDays: nod.working_days,
  dueDate: nod.due_date,
  extendedDueDate: nod.extended_due_date || null,
  extensionReason: nod.extension_reason || null,
  extendedAt: nod.extended_at || null,
  documentsReceivedDate: nod.documents_received_date || null,
  status: nod.status,
  issuedBy: nod.issued_by || "",
  emailSentAt: nod.email_sent_at || null,
});

const nodError = (error, fallback) => {
  const detail = error.response?.data?.detail;
  return new Error(
    (typeof detail === "string" ? detail : null) || error.message || fallback,
  );
};

/**
 * The Notices of Deficiency issued on an application
 * @param {string} referenceNo
 */
export const getNods = async (referenceNo) => {
  try {
    const response = await API.get(
      `/appointment-records/claimed/${encodeURIComponent(referenceNo)}/nods`,
    );
    return response.data.map(mapNod);
  } catch (error) {
    throw nodError(error, "Failed to fetch the Notices of Deficiency");
  }
};

/**
 * Give an NOD more time. Only forward, and a reason is required.
 * @param {string} referenceNo
 * @param {number} nodNumber
 * @param {string} newDueDate YYYY-MM-DD
 * @param {string} reason
 */
export const extendNod = async (referenceNo, nodNumber, newDueDate, reason) => {
  try {
    const response = await API.post(
      `/appointment-records/claimed/${encodeURIComponent(referenceNo)}/nods/${nodNumber}/extend`,
      { new_due_date: newDueDate, reason },
    );
    return mapNod(response.data);
  } catch (error) {
    throw nodError(error, "Failed to extend the due date");
  }
};

/**
 * Record which requested documents came in. Once all are in, the NOD is complied.
 * @param {string} referenceNo
 * @param {number} nodNumber
 * @param {string[]} receivedIds the `id` of each document received now
 * @param {string} receivedDate YYYY-MM-DD
 */
export const receiveNodDocuments = async (
  referenceNo,
  nodNumber,
  receivedIds,
  receivedDate,
) => {
  try {
    const response = await API.post(
      `/appointment-records/claimed/${encodeURIComponent(referenceNo)}/nods/${nodNumber}/receive`,
      { received_ids: receivedIds, received_date: receivedDate },
    );
    return mapNod(response.data);
  } catch (error) {
    throw nodError(error, "Failed to record the documents");
  }
};

/* ───────── The evaluator's GMP Clearance Worksheet ───────── */

const worksheetError = (error, fallback) => {
  const detail = error.response?.data?.detail;
  return new Error(
    (typeof detail === "string" ? detail : null) || error.message || fallback,
  );
};

/**
 * The worksheet, as the server holds it. The evaluator holding the task gets
 * their latest version (a draft too) and can_edit true; everyone else gets the
 * latest version that was sent on, or null.
 * @param {string} referenceNo
 * @returns {Promise<{ worksheet: object|null, can_edit: boolean }>}
 */
export const getWorksheet = async (referenceNo) => {
  try {
    const response = await API.get(
      `/appointment-records/claimed/${encodeURIComponent(referenceNo)}/worksheet`,
    );
    return response.data;
  } catch (error) {
    throw worksheetError(error, "Failed to fetch the worksheet");
  }
};

/**
 * Auto-save the evaluator's worksheet (the whole thing, in the server's shape).
 * @param {string} referenceNo
 * @param {object} payload see toApiWorksheet in fgmpWorksheetSync.js
 */
export const saveWorksheet = async (referenceNo, payload) => {
  try {
    const response = await API.put(
      `/appointment-records/claimed/${encodeURIComponent(referenceNo)}/worksheet`,
      payload,
    );
    return response.data;
  } catch (error) {
    throw worksheetError(error, "Failed to save the worksheet");
  }
};
