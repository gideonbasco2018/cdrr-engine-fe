// FILE: src/components/clinicalTrial/clinicalTrialMappers.js
import { FIELD_LABEL_MAP } from "./constants";

// ── Maps backend snake_case rows → camelCase so the page's
//    render/column logic can stay in camelCase everywhere ──
function mapDrugFromApi(drug) {
  return {
    id: drug.id,
    ipName: drug.ip_name,
    dosageStrength: drug.dosage_strength,
    pharmaForm: drug.pharma_form,
    drugType: drug.drug_type,
    totalQtyApprove: drug.total_qty_approve ?? 0,
  };
}

// Trial-level fields only ("1" side). Drug-level fields now live in
// `drugs`, one entry per row in clinical_trial_drugs.
export function mapTrialFromApi(row) {
  return {
    id: row.id,
    uuid: row.uuid,
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
    ilApprovalNo: row.il_approval_no,
    ilApprovalDate: row.il_approval_date,
    drugs: (row.drugs || []).map(mapDrugFromApi),
  };
}
// ── Maps camelCase form state → snake_case payload for update calls ──
function mapDrugToApi(drug) {
  return {
    ip_name: drug.ipName?.trim() || null,
    dosage_strength: drug.dosageStrength?.trim() || null,
    pharma_form: drug.pharmaForm?.trim() || null,
    drug_type: drug.drugType?.trim() || null,
    total_qty_approve:
      drug.totalQtyApprove === "" || drug.totalQtyApprove === null
        ? 0
        : Number(drug.totalQtyApprove),
  };
}

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
    il_approval_no: form.ilApprovalNo?.trim() || null,
    il_approval_date: form.ilApprovalDate || null,
    // Sending `drugs` always replaces the trial's full drug list on the
    // backend (see ClinicalTrialUpdate.drugs).
    drugs: (form.drugs || []).map(mapDrugToApi),
  };
}

// Short readable summary of a drugs array, used in the Confirm Changes
// diff and anywhere else we need a one-line stand-in for the full list.
export function formatDrugsSummary(drugs) {
  if (!drugs || drugs.length === 0) return "No drugs";
  return `${drugs.length} drug(s): ${drugs
    .map((d) => d.ipName || "Unnamed")
    .join(", ")}`;
}
export function formatFieldValue(key, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "totalQtyApprove") return Number(value).toLocaleString();
  return String(value);
}

// Returns only the fields that actually changed between the original
// trial and the edited form, with display-ready labels and values.
export function getChangedFields(original, edited) {
  const scalarChanges = Object.keys(FIELD_LABEL_MAP)
    .filter((key) => String(original[key] ?? "") !== String(edited[key] ?? ""))
    .map((key) => ({
      key,
      label: FIELD_LABEL_MAP[key],
      oldValue: formatFieldValue(key, original[key]),
      newValue: formatFieldValue(key, edited[key]),
    }));

  const originalDrugsKey = JSON.stringify(original.drugs || []);
  const editedDrugsKey = JSON.stringify(edited.drugs || []);
  const drugsChanged = originalDrugsKey !== editedDrugsKey;

  if (!drugsChanged) return scalarChanges;

  return [
    ...scalarChanges,
    {
      key: "drugs",
      label: "Investigational Products",
      oldValue: formatDrugsSummary(original.drugs),
      newValue: formatDrugsSummary(edited.drugs),
    },
  ];
}