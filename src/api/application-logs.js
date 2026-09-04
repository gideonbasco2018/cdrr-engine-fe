// src/api/application-logs.js

import API from "./axios";

/**
 * Get all logs for a specific application by DTN (Document Tracking Number)
 * This is the primary fetch used by ApplicationLogsModal.
 *
 * GET /api/application-logs?dtn=20210927134427
 *
 * @param {number|string} dtn  - DB_DTN value from the main_db record
 * @returns {Promise<Array>}   - Array of ApplicationLogResponse objects
 */
export const getApplicationLogsByDtn = async (dtn) => {
  try {
    const response = await API.get("/application-logs/", {
      params: { dtn },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching application logs by DTN:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch application logs";
    throw new Error(errorMessage);
  }
};

/**
 * Create a single application log
 * @param {Object} logData
 * @param {number} logData.main_db_id
 * @param {string} logData.application_step   - e.g. "Decking", "Evaluation"
 * @param {string} logData.user_name
 * @param {string} logData.application_status
 * @param {string} logData.application_decision
 * @param {string} logData.application_remarks
 * @param {string} logData.start_date          - ISO datetime string
 * @param {string} logData.accomplished_date   - ISO datetime string
 * @param {number|null} logData.del_index
 * @param {number|null} logData.del_previous
 * @param {number|null} logData.del_last_index
 * @returns {Promise} - Created log data
 */
export const createApplicationLog = async (logData) => {
  try {
    const response = await API.post("/application-logs/", logData);
    return response.data;
  } catch (error) {
    console.error("Error creating application log:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to create application log";
    throw new Error(errorMessage);
  }
};

/**
 * Bulk create application logs (max 100)
 * @param {Array<Object>} logs
 * @returns {Promise<Array>}
 */
export const createBulkApplicationLogs = async (logs) => {
  try {
    const response = await API.post("/application-logs/bulk", logs);
    return response.data;
  } catch (error) {
    console.error("Error creating bulk application logs:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to create bulk application logs";
    throw new Error(errorMessage);
  }
};

/**
 * Get all logs for a specific main_db record (by DB_ID)
 * @param {number} mainDbId
 * @returns {Promise<Array>} - Array of logs (newest first)
 */
export const getApplicationLogs = async (mainDbId) => {
  try {
    const response = await API.get(`/application-logs/main-db/${mainDbId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching application logs:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch application logs";
    throw new Error(errorMessage);
  }
};

/**
 * Get logs for a specific workflow step of a record
 * @param {number} mainDbId
 * @param {string} step - e.g. "Decking", "Evaluation", "Checking"
 * @returns {Promise<Array>}
 */
export const getApplicationLogsByStep = async (mainDbId, step) => {
  try {
    const response = await API.get(
      `/application-logs/main-db/${mainDbId}/step/${step}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching application logs by step:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch application logs by step";
    throw new Error(errorMessage);
  }
};

/**
 * Get a single application log by ID
 * @param {number} logId
 * @returns {Promise}
 */
export const getApplicationLogById = async (logId) => {
  try {
    const response = await API.get(`/application-logs/${logId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching application log:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch application log";
    throw new Error(errorMessage);
  }
};

/**
 * Update an application log
 * @param {number} logId
 * @param {Object} logData
 * @returns {Promise}
 */
export const updateApplicationLog = async (logId, logData) => {
  try {
    const response = await API.put(`/application-logs/${logId}`, logData);
    return response.data;
  } catch (error) {
    console.error("Error updating application log:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to update application log";
    throw new Error(errorMessage);
  }
};

/**
 * Delete an application log
 * @param {number} logId
 * @returns {Promise}
 */
export const deleteApplicationLog = async (logId) => {
  try {
    const response = await API.delete(`/application-logs/${logId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting application log:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to delete application log";
    throw new Error(errorMessage);
  }
};

/**
 * Get last del_index for a specific application
 * @param {number} mainDbId
 * @returns {Promise<{main_db_id: number, last_index: number, next_index: number}>}
 */
export const getLastApplicationLogIndex = async (mainDbId) => {
  try {
    const response = await API.get(
      `/application-logs/main-db/${mainDbId}/last-index`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching last application log index:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch last application log index";
    throw new Error(errorMessage);
  }
};

/**
 * Log an Application Re-assignment
 * POST /api/application-logs/re-assign
 */
export const reassignApplication = async (logData) => {
  try {
    const response = await API.post("/application-logs/re-assign", logData);
    return response.data;
  } catch (error) {
    console.error("Error logging re-assignment:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to log re-assignment";
    throw new Error(errorMessage);
  }
};

/**
 * Log an Application Re-route
 * POST /api/application-logs/re-route
 */
export const rerouteApplication = async (logData) => {
  try {
    const response = await API.post("/application-logs/re-route", logData);
    return response.data;
  } catch (error) {
    console.error("Error logging re-route:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to log re-route";
    throw new Error(errorMessage);
  }
};

/**Toggle starred state of an application log*/
export const toggleStarApplicationLog = async (logId, starred) => {
  try {
    const response = await API.patch(
      `/application-logs/${logId}/star`,
      null,
      {
        params: { starred: starred === true || starred === 1 ? true : false },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error toggling star:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to toggle star";
    throw new Error(errorMessage);
  }
};
/**
 * Get open/active tasks (del_last_index = 1, del_thread = "Open"),
 * joined with main_db for DTN / OLD RSN.
 * Used by the Reassignment/Reroute page and Directors Target view.
 *
 * GET /api/application-logs/open-tasks
 *
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.page_size=10000]
 * @param {string} [params.search]              - DTN search
 * @param {string} [params.application_step]
 * @param {string} [params.user_name]
 * @param {string} [params.dtn_date_from]        - "YYYYMMDD", based on DTN digits 1-8
 * @param {string} [params.dtn_date_to]          - "YYYYMMDD", based on DTN digits 1-8
 * @param {string} [params.date_received_from]   - "YYYY-MM-DD"
 * @param {string} [params.date_received_to]     - "YYYY-MM-DD"
 * @returns {Promise<{data: Array, total: number, page: number, page_size: number}>}
 */
export const getOpenTasks = async ({
  page = 1,
  page_size = 10000,
  search,
  application_step,
  user_name,
  dtn_date_from,
  dtn_date_to,
  date_received_from,
  date_received_to,
} = {}) => {
  try {
    const response = await API.get("/application-logs/open-tasks", {
      params: {
        page,
        page_size,
        ...(search && { search }),
        ...(application_step && { application_step }),
        ...(user_name && { user_name }),
        ...(dtn_date_from && { dtn_date_from }),
        ...(dtn_date_to && { dtn_date_to }),
        ...(date_received_from && { date_received_from }),
        ...(date_received_to && { date_received_to }),
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching open tasks:", error);
    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "Failed to fetch open tasks";
    throw new Error(errorMessage);
  }
};

export const getOpenTaskSteps = async () => {
  try {
    const response = await API.get("/application-logs/open-tasks/steps");
    return response.data;
  } catch (error) {
    console.error("Error fetching open task steps:", error);
    throw new Error(
      error.response?.data?.detail || error.message || "Failed to fetch steps",
    );
  }
};

/**
 * Get distinct user_name values among open tasks — for the
 * Current User filter dropdown in Directors Target view.
 *
 * GET /api/application-logs/open-tasks/users
 */
export const getOpenTaskUsers = async () => {
  try {
    const response = await API.get("/application-logs/open-tasks/users");
    return response.data;
  } catch (error) {
    console.error("Error fetching open task users:", error);
    throw new Error(
      error.response?.data?.detail || error.message || "Failed to fetch users",
    );
  }
};


/**
 * Add New Task — creates a new IN PROGRESS log for each selected main_db_id.
 * user_name is resolved on the backend based on user_id (not typed manually).
 *
 * POST /api/application-logs/add-task
 *
 * @param {Object} payload
 * @param {number[]} payload.main_db_ids
 * @param {string} payload.application_step
 * @param {string} payload.application_status
 * @param {number} payload.user_id
 * @param {boolean} [payload.close_previous=false]
 * @returns {Promise<{created:number, failed:number, results:Array}>}
 */
export const addTaskForSelected = async ({
  main_db_ids,
  application_step,
  application_status,
  user_id,
  remarks = null,
  close_previous = false,
}) => {
  try {
    const response = await API.post("/application-logs/add-task", {
      main_db_ids,
      application_step,
      application_status,
      user_id,
      remarks,
      close_previous,
    });
    return response.data;
  } catch (error) {
    console.error("Error adding task:", error);
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to add task";
    throw new Error(errorMessage);
  }
};

/**
 * Distinct application_step values (all, not just open tasks) — for the Add Task modal dropdown.
 * GET /api/application-logs/steps/all
 */
export const getAllApplicationSteps = async () => {
  try {
    const response = await API.get("/application-logs/steps/all");
    return response.data.steps || [];
  } catch (error) {
    console.error("Error fetching all application steps:", error);
    throw new Error(
      error.response?.data?.detail || error.message || "Failed to fetch steps",
    );
  }
};

/**
 * Distinct application_status values (all) — for the Add Task modal dropdown.
 * GET /api/application-logs/statuses/all
 */
export const getAllApplicationStatuses = async () => {
  try {
    const response = await API.get("/application-logs/statuses/all");
    return response.data.statuses || [];
  } catch (error) {
    console.error("Error fetching all application statuses:", error);
    throw new Error(
      error.response?.data?.detail || error.message || "Failed to fetch statuses",
    );
  }
};

/**
 * Active users for the "Assign to" dropdown in the Add Task modal.
 * GET /api/auth/users/select-list
 */
export const getUsersForSelect = async (search = "") => {
  try {
    const response = await API.get("/auth/users/select-list", {
      params: search ? { search } : {},
    });
    return response.data || [];
  } catch (error) {
    console.error("Error fetching users for select:", error);
    throw new Error(
      error.response?.data?.detail || error.message || "Failed to fetch users",
    );
  }
};