// src/components/eapplication/workflowTaskMapper.js
// Maps a raw e_app_history row (from getWorkflowTasks) into a row for EApplicationTasksPage.
// ADAPT: each field lists the possible raw column names, first match wins.
// Check the "raw workflow row" console log and keep only the real column names.

const pick = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
};

export function mapEAppTask(raw, index = 0) {
  const targetEnd = pick(raw, ["target_end_date", "due_date"]);
  return {
    id: `wf-${pick(raw, ["id", "uuid"]) ?? index}`,
    source: "workflow",
    applicationStep: pick(raw, ["application_step", "step"]) ?? "",
    processCode: pick(raw, ["process_code", "processCode"]),
    referenceNo:
      pick(raw, ["dtn", "reference_no", "reference_number", "ref_no"]) ?? "",
    activity: pick(raw, ["activity", "app_type", "application_type"]) ?? "",
    applicantCompany:
      pick(raw, [
        "applicant_company",
        "company_name",
        "establishment_name",
        "establishment",
      ]) ?? "",
    dueDate: targetEnd ? String(targetEnd).slice(0, 10) : null,
    lastModified:
      pick(raw, ["log_last_modified", "last_modified", "updated_at"]) ?? "",
    priority: pick(raw, ["priority"]),
  };
}