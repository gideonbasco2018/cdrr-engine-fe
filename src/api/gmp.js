// src/api/gmp.js
// All GMP API calls
// NOTE: axios baseURL already includes /api (from VITE_API_URL=http://localhost:8000/api)
// So all paths here start with /gmp/  (NOT /api/gmp/)
import API from "./axios";


// ── Records ───────────────────────────────────────────────────────────────────
export async function getGMPRecords(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== "")
  );
  const res = await API.get("/gmp/", { params: clean });
  return res.data;
}

export async function getGMPFilterCounts(tab, view) {
  const params = {
    ...(tab && tab !== "all" && { tab }),
    ...(view && view !== "all" && { view }),
  };
  const res = await API.get("/gmp/filter-counts", { params });
  return res.data;
}

// Current open-task count per username — powers the Bulk Deck modal's
// evaluator checklist workload display.
export async function getGMPTaskCounts(usernames) {
  if (!usernames || usernames.length === 0) return {};
  const res = await API.get("/gmp/tasks/task-counts", { params: { usernames: usernames.join(",") } });
  return res.data;
}

export async function getGMPRecord(id) {
  const res = await API.get(`/gmp/${id}`);
  return res.data;
}

export async function createGMPRecord(data) {
  const res = await API.post("/gmp/", data);
  return res.data;
}

// Resolve-or-create by DTN — used by the FGMP batch folder upload so a DTN's
// files always attach to the record that already exists for it; a new record
// is created only when the DTN has none. Returns { record, created }.
export async function resolveOrCreateGMPByDtn(dtn, { company, transactionType } = {}) {
  const res = await API.post("/gmp/resolve-or-create-by-dtn", {
    dtn: String(dtn),
    company: company || null,
    transaction_type: transactionType || null,
  });
  return res.data;
}

export async function updateGMPRecord(id, data) {
  const res = await API.put(`/gmp/${id}`, data);
  return res.data;
}

export async function deleteGMPRecord(id, hardDelete = false) {
  const res = await API.delete(`/gmp/${id}`, { params: { hard_delete: hardDelete } });
  return res.data;
}

// ── Logs ──────────────────────────────────────────────────────────────────────
export async function getGMPLogs(recordId, params = {}) {
  const res = await API.get(`/gmp/${recordId}/logs`, { params });
  return res.data;
}

// ── Audit Logs ────────────────────────────────────────────────────────────────
export async function getGMPAuditLogs(recordId, params = {}) {
  const res = await API.get(`/gmp/audit-logs/${recordId}`, { params });
  return res.data;
}

export async function getGMPAuditLogsForSession(sessionId) {
  const res = await API.get(`/gmp/audit-logs/session/${sessionId}`);
  return res.data;
}

// ── Assign ────────────────────────────────────────────────────────────────────
export async function assignEvaluator(recordId, evaluatorName) {
  const res = await API.post(`/gmp/${recordId}/assign`, null, {
    params: { evaluator_name: evaluatorName },
  });
  return res.data;
}

// ── Advance Step ──────────────────────────────────────────────────────────────
export async function advanceStep(recordId, data) {
  const res = await API.post(`/gmp/${recordId}/advance-step`, data);
  return res.data;
}

// ── Workflow step + action definitions ────────────────────────────────────────
// Single source of truth: the backend's GMP_ACTION_ROUTES. Each step carries the
// exact set of actions advance-step will accept from it, so the WorkflowModal
// Action dropdown can be built from this and never drift into offering an action
// the backend rejects. Returns { steps: [{ label, del_index, actions: [...] }] }.
export async function getGMPLogSteps() {
  const res = await API.get("/gmp/log-steps");
  return res.data;
}



// ── Update log (complete with decision) ───────────────────────────────────────
export async function updateGMPLog(logId, data) {
  const res = await API.patch(`/gmp/logs/${logId}`, data);
  return res.data;
}

// ── Get all logs for a record (for Step 3 view) ───────────────────────────────
export async function getGMPRecordLogs(recordId) {
  const res = await API.get(`/gmp/${recordId}/logs`, { params: { page_size: 200 } });
  return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
}

// ── Reassign ──────────────────────────────────────────────────────────────────
export async function reassignGMPStep(recordId, data) {
  const res = await API.post(`/gmp/${recordId}/reassign`, data);
  return res.data;
}

// ── Reroute ───────────────────────────────────────────────────────────────────
export async function rerouteGMPStep(recordId, data) {
  const res = await API.post(`/gmp/${recordId}/reroute`, data);
  return res.data;
}

// ── Add Issuance ──────────────────────────────────────────────────────────────
// Duplicates a record under the same DTN with a different GMP_TYPE_OF_ISSUANCE.
// data = { type_of_issuance: string }
export async function addGMPIssuance(recordId, data) {
  const res = await API.post(`/gmp/${recordId}/add-issuance`, data);
  return res.data;
}

// ── Reopen to Decking ────────────────────────────────────────────────────────
// Sends THIS SAME record back to Decking (no new record/reference number) —
// records the Related DTN, clears terminal status + issuance/certificate
// fields, and opens a fresh Decking/IN PROGRESS log. Used when a follow-up
// DTN (e.g. an NFI's physical inspection) comes back in and this same
// application needs to continue.
export async function reopenGMPRecord(recordId, relatedDtn) {
  const res = await API.post(`/gmp/${recordId}/reopen`, { related_dtn: relatedDtn });
  return res.data;
}

// ── Sibling reference numbers (same DTN) ────────────────────────────────────
export async function getGMPSiblings(recordId) {
  const res = await API.get(`/gmp/${recordId}/siblings`);
  return res.data;
}

// ── Update a single reference number's own issuance-specific fields ────────
// data = { type_of_issuance?, certificate_number?, certificate_validity?, secpa_number? }
export async function updateGMPIssuanceFields(recordId, data) {
  const res = await API.patch(`/gmp/${recordId}/issuance-fields`, data);
  return res.data;
}

// ── Tasks (for current user) ──────────────────────────────────────────────────
export async function getMyGMPTasks(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== "")
  );
  const res = await API.get("/gmp/tasks", { params: clean });
  return res.data;
}

export async function markTaskReceived(logId) {
  const res = await API.patch(`/gmp/logs/${logId}/receive`);
  return res.data;
}

export async function toggleTaskStar(logId, starred) {
  const res = await API.patch(`/gmp/logs/${logId}/star`, null, {
    params: { starred },
  });
  return res.data;
}


// ── Task count (for sidebar badge) ────────────────────────────────────────────
// Mirrors /workflow_tasks/my-task-count — counted entirely server-side.
// Drops automatically once a task is decked/advanced/reassigned/rerouted.
export async function getMyGMPTaskCount() {
  const res = await API.get("/gmp/tasks/my-task-count");
  return res.data.count ?? 0;
}

// ── Doctrack integration ──────────────────────────────────────────────────────
// GMP shares the licensing Doctrack helpers — use `createDoctrackLogByRsn`
// (single) and `createBulkDoctrackLogsByRsn` (bulk) from src/api/doctrack.js.
// The GMP DTN is passed as the RSN (must be 14 numeric digits).

// ── Excel template & upload ───────────────────────────────────────────────────
export async function downloadGMPTemplate() {
  const res = await API.get("/gmp/template", { responseType: "blob" });
  const url  = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href  = url;
  link.setAttribute("download", "FGMP_Upload_Template.xlsx");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function uploadGMPExcel(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await API.post("/gmp/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

// Exports every record matching the given filters (not just the current
// page) to an .xlsx file and triggers a browser download. `params` takes
// the same filter keys as getGMPRecords (minus page/page_size).
export async function exportFilteredGMPRecords(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== "")
  );
  const res = await API.get("/gmp/export-filtered", {
    params: clean,
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;

  const contentDisposition = res.headers["content-disposition"];
  let filename = "fgmp_records_export.xlsx";
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) filename = match[1];
  }
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
