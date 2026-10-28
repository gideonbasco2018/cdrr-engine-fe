// src/components/eapplication/processes/fgmp/fgmpWorksheetSync.js
//
// Moves the evaluator's worksheet between the screen and the server
// (e_app_fgmp_worksheet). Plain functions with no screen code, so they can be
// tested on their own.
//
// The screen keeps the worksheet as "values" (camelCase). The server speaks
// snake_case. A few names differ on purpose:
//   worksheetRemarks      <-> remarks
//   inspectionDate        <-> inspection_dates   (text: "13-15 August 2025")
//   recommendationChoice  <-> recommendation     ("" <-> null)
//
// Table rows (Annex B, Approved Medicinal Products) are held as
//   { id, dosageForms: [one line each], productType, operations: [one line each] }
// and the lines are kept as typed (blank ones included) so the cursor never
// jumps; the server drops the blank ones when it saves.

const lineId = () =>
  `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const newFormRow = () => ({
  id: lineId(),
  dosageForms: [""],
  productType: "",
  operations: [""],
});

export const emptyWorksheet = () => ({
  gmpEvidence: [],
  issuingAuthority: "",
  issuingCountry: "",
  foreignCertificateNumber: "",
  foreignCertificateValidity: "",
  inspectionDate: "",
  dateIssuedText: "",
  approvedDosageFormsNote: "",
  appliedForms: [],
  approvedProducts: [],
  worksheetRemarks: "",
  complianceNotes: "",
  recommendationChoice: "",
  annexC: {},
  annexRows: [],
});

const rowsToApi = (rows) =>
  (rows || []).map((r) => ({
    dosage_forms: r.dosageForms || [],
    product_type: r.productType || null,
    operations: r.operations || [],
  }));

const rowsFromApi = (rows) =>
  (rows || []).map((r) => ({
    id: lineId(),
    dosageForms: r.dosage_forms?.length ? r.dosage_forms : [""],
    productType: r.product_type || "",
    operations: r.operations?.length ? r.operations : [""],
  }));

/* The screen's values -> what the server saves */
export function toApiWorksheet(v) {
  return {
    gmp_evidence: v.gmpEvidence || [],
    issuing_authority: v.issuingAuthority || null,
    issuing_country: v.issuingCountry || null,
    foreign_certificate_number: v.foreignCertificateNumber || null,
    foreign_certificate_validity: v.foreignCertificateValidity || null,
    inspection_dates: v.inspectionDate || null,
    date_issued_text: v.dateIssuedText || null,
    approved_dosage_forms_note: v.approvedDosageFormsNote || null,
    applied_forms: rowsToApi(v.appliedForms),
    approved_products: rowsToApi(v.approvedProducts),
    remarks: v.worksheetRemarks || null,
    compliance_notes: v.complianceNotes || null,
    recommendation: v.recommendationChoice || null,
    annex_c: v.annexC || {},
    annex_rows: (v.annexRows || []).map((r) => ({
      id: r.id || "",
      after: r.after || 0,
      contents: r.contents || "",
      remarks: r.remarks || "",
    })),
  };
}

/* What the server sent -> the screen's values */
export function fromApiWorksheet(ws) {
  return {
    gmpEvidence: ws.gmp_evidence || [],
    issuingAuthority: ws.issuing_authority || "",
    issuingCountry: ws.issuing_country || "",
    foreignCertificateNumber: ws.foreign_certificate_number || "",
    foreignCertificateValidity: ws.foreign_certificate_validity || "",
    inspectionDate: ws.inspection_dates || "",
    dateIssuedText: ws.date_issued_text || "",
    approvedDosageFormsNote: ws.approved_dosage_forms_note || "",
    appliedForms: rowsFromApi(ws.applied_forms),
    approvedProducts: rowsFromApi(ws.approved_products),
    worksheetRemarks: ws.remarks || "",
    complianceNotes: ws.compliance_notes || "",
    recommendationChoice: ws.recommendation || "",
    annexC: ws.annex_c || {},
    annexRows: (ws.annex_rows || []).map((r) => ({
      id: r.id,
      after: r.after,
      contents: r.contents || "",
      remarks: r.remarks || "",
    })),
  };
}

/* The parts that fill themselves, as the server sent them */
export function metaFromApi(ws) {
  if (!ws) return null;
  return {
    version: ws.version,
    status: ws.status,
    variant: ws.variant,
    savedAt: ws.saved_at,
    evaluatedBy: {
      name: ws.evaluated_by?.name || "",
      designation: ws.evaluated_by?.designation || "",
      dates: ws.evaluated_by?.dates || [],
    },
    checkedBy: ws.checked_by
      ? {
          name: ws.checked_by.name || "",
          designation: ws.checked_by.designation || "",
          date: ws.checked_by.date || null,
        }
      : null,
  };
}

const hasText = (s) => !!(s && String(s).trim());
const rowHasText = (r) =>
  (r.dosageForms || []).some(hasText) ||
  hasText(r.productType) ||
  (r.operations || []).some(hasText);

/* Whether the evaluator has filled in anything. An untouched worksheet is
   not sent, so forwarding an application does not create an empty one. */
export function hasWorksheetContent(v) {
  return (
    (v.gmpEvidence || []).length > 0 ||
    [
      v.issuingAuthority,
      v.issuingCountry,
      v.foreignCertificateNumber,
      v.foreignCertificateValidity,
      v.inspectionDate,
      v.dateIssuedText,
      v.approvedDosageFormsNote,
      v.worksheetRemarks,
      v.complianceNotes,
      v.recommendationChoice,
    ].some(hasText) ||
    (v.appliedForms || []).some(rowHasText) ||
    (v.approvedProducts || []).some(rowHasText) ||
    Object.values(v.annexC || {}).some(hasText) ||
    (v.annexRows || []).some((r) => hasText(r.contents) || hasText(r.remarks))
  );
}

/* "2026-05-19" -> "19-May-26", the way the unit writes the evaluation dates */
export function shortDate(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  const month = new Date(y, m - 1, d).toLocaleDateString("en-GB", { month: "short" });
  return `${String(d).padStart(2, "0")}-${month}-${String(y).slice(-2)}`;
}
