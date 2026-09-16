// FILE: src/components/clinicalTrial/clinicalTrialMappers.js
import { FIELD_LABEL_MAP } from "./constants";

// ── Maps backend snake_case rows → camelCase so the page's
//    render/column logic can stay in camelCase everywhere ──
export function mapTrialFromApi(row) {
  return {
    id: row.id,
    protocolNo: row.protocol_no,
    studyTitle: row.study_title,
    phase: row.phase,
    sponsorName: row.sponsor_name,
    sponsorAddress: row.sponsor_address,
    sponsorContact: row.sponsor_contact,
    croName: row.cro_name,
    croAddress: row.cro_address,
    croContact: row.cro_contact,
    ctRefNo: row.ct_ref_no,
    ipName: row.ip_name,
    dosageStrength: row.dosage_strength,
    pharmaForm: row.pharma_form,
    drugType: row.drug_type,
    ilApprovalNo: row.il_approval_no,
    ilApprovalDate: row.il_approval_date,
    totalQtyApprove: row.total_qty_approve ?? 0,
  };
}

// ── Maps camelCase form state → snake_case payload for update calls ──
export function mapTrialToApi(form) {
  return {
    protocol_no: form.protocolNo?.trim() || null,
    study_title: form.studyTitle?.trim() || null,
    phase: form.phase?.trim() || null,
    sponsor_name: form.sponsorName?.trim() || null,
    sponsor_address: form.sponsorAddress?.trim() || null,
    sponsor_contact: form.sponsorContact?.trim() || null,
    cro_name: form.croName?.trim() || null,
    cro_address: form.croAddress?.trim() || null,
    cro_contact: form.croContact?.trim() || null,
    ct_ref_no: form.ctRefNo?.trim() || null,
    ip_name: form.ipName?.trim() || null,
    dosage_strength: form.dosageStrength?.trim() || null,
    pharma_form: form.pharmaForm?.trim() || null,
    drug_type: form.drugType?.trim() || null,
    il_approval_no: form.ilApprovalNo?.trim() || null,
    il_approval_date: form.ilApprovalDate || null,
    total_qty_approve:
      form.totalQtyApprove === "" || form.totalQtyApprove === null
        ? 0
        : Number(form.totalQtyApprove),
  };
}

export function formatFieldValue(key, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "totalQtyApprove") return Number(value).toLocaleString();
  return String(value);
}

// Returns only the fields that actually changed between the original
// trial and the edited form, with display-ready labels and values.
export function getChangedFields(original, edited) {
  return Object.keys(FIELD_LABEL_MAP)
    .filter((key) => String(original[key] ?? "") !== String(edited[key] ?? ""))
    .map((key) => ({
      key,
      label: FIELD_LABEL_MAP[key],
      oldValue: formatFieldValue(key, original[key]),
      newValue: formatFieldValue(key, edited[key]),
    }));
}