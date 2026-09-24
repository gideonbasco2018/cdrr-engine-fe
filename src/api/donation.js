// FILE: src/api/donation.js
import api from "./axios";

// Backend (snake_case) <-> frontend (camelCase) field map. Keeping the
// component tree in camelCase (already used throughout DonationPage.jsx)
// means only this file needs to know about the wire format.
const FIELD_MAP = {
  letterDtn: "letter_dtn",
  dateReceived: "date_received",
  dateReceivedByEvaluator: "date_received_by_evaluator",
  donor: "donor",
  donee: "donee",
  registrationDtn: "registration_dtn",
  productName: "product_name",
  packaging: "packaging",
  manufacturer: "manufacturer",
  batchLotNo: "batch_lot_no",
  expirationDate: "expiration_date",
  totalQuantity: "total_quantity",
  validity: "validity",
  dateIssued: "date_issued",
  evaluator: "evaluator",
  status: "status",
  donationRegNo: "donation_reg_no",
  dateForwardedToChecker: "date_forwarded_to_checker",
  dateReleased: "date_released",
  remarks: "remarks",
};

// Editable fields only — application_uuid/upload_date/upload_by/id/etc.
// are server-set and never sent back on create/update.
const EDITABLE_KEYS = Object.keys(FIELD_MAP);

// "—" is how DonationPage.jsx displays an empty value — treat it the same
// as blank when converting to the API payload.
const toApiValue = (v) => (v === "—" || v === undefined ? null : v || null);

// Turn a camelCase form object into the snake_case body the API expects.
export const toApiPayload = (form) => {
  const payload = {};
  for (const key of EDITABLE_KEYS) {
    if (key in form) payload[FIELD_MAP[key]] = toApiValue(form[key]);
  }
  return payload;
};

const isoToDateOnly = (iso) => (iso ? String(iso).slice(0, 10) : "—");

// Turn one API row (snake_case, null for empty) into the camelCase shape
// DonationPage.jsx renders — null becomes "—" so existing badge/cell
// rendering (which checks `=== "—"`) keeps working unchanged.
export const mapDonation = (row) => {
  const out = { id: row.id, applicationUuid: row.application_uuid, version: row.version };
  for (const [camel, snake] of Object.entries(FIELD_MAP)) {
    out[camel] = row[snake] === null || row[snake] === undefined ? "—" : row[snake];
  }
  out.uploadDate = isoToDateOnly(row.upload_date);
  out.uploadBy = row.upload_by || "—";
  out.createdAt = row.created_at;
  out.updatedAt = row.updated_at;
  return out;
};

const mapChangeLogEntry = (row) => ({
  field: row.field,
  from: row.old_value,
  to: row.new_value,
  by: row.changed_by,
  at: row.changed_at
    ? new Date(row.changed_at).toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "",
});

// ✅ All donation records
export const getDonations = async () => {
  const response = await api.get("/donation/");
  return response.data.map(mapDonation);
};

// ✅ Create a donation record
export const createDonation = async (form) => {
  const response = await api.post("/donation/", toApiPayload(form));
  return mapDonation(response.data);
};

// ✅ Update a donation record — returns the updated row.
// `form.version` (the version the caller last read) is sent along so the
// server can reject a save that would silently overwrite someone else's
// edit — that comes back as an HTTP 409, which callers should catch.
export const updateDonation = async (id, form) => {
  const response = await api.put(`/donation/${id}`, {
    ...toApiPayload(form),
    version: form.version,
  });
  return mapDonation(response.data);
};

// ✅ Soft-delete a donation record
export const deleteDonation = async (id) => {
  await api.delete(`/donation/${id}`);
};

// ✅ Soft-deleted records ("trash")
export const getDeletedDonations = async () => {
  const response = await api.get("/donation/deleted");
  return response.data.map(mapDonation);
};

// ✅ Undo a soft delete
export const restoreDonation = async (id) => {
  const response = await api.post(`/donation/${id}/restore`);
  return mapDonation(response.data);
};

// ✅ Field-level change history for one record
export const getDonationChangeLog = async (id) => {
  const response = await api.get(`/donation/${id}/change-log`);
  return response.data.map(mapChangeLogEntry);
};

// ✅ Import donations from a filled-in copy of the download template
export const uploadDonationExcel = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/donation/upload-excel", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { created, skipped_duplicates, skipped_invalid_dtn, failed, errors }
};

// Read-only dry run: parses the file and reports what uploadDonationExcel
// would do (which rows would be added, which would be skipped and why)
// without writing anything. Powers the upload modal's "Check File" step.
export const previewDonationExcel = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/donation/upload-preview", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { total_rows, insert_count, skip_count, will_insert, will_skip }
};

// ✅ Download Donation Database template (styled to match the CRR workbook)
export const downloadDonationTemplate = async () => {
  const response = await api.get("/donation/download-template", {
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "donation_database_template.xlsx");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
