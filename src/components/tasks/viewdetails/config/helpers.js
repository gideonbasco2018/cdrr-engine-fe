export const todayStr = () => new Date().toISOString().split("T")[0];

export const formatDate = (dateString) => {
  if (!dateString || dateString === "N/A" || dateString === null) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

export const cleanValue = (value) => {
  if (value === null || value === undefined || value === "" || value === "N/A")
    return "N/A";
  return String(value);
};

export const addWorkingDays = (startDateStr, days) => {
  if (!days || days <= 0) return "";
  let count = 0;
  const current = new Date(startDateStr + "T00:00:00");
  while (count < days) {
    current.setDate(current.getDate() + 1);
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return current.toISOString().split("T")[0];
};

export const countWorkingDays = (startDateStr, endDateStr) => {
  if (!endDateStr) return 0;
  let count = 0;
  const current = new Date(startDateStr + "T00:00:00");
  const end = new Date(endDateStr + "T00:00:00");
  if (end <= current) return 0;
  while (current < end) {
    current.setDate(current.getDate() + 1);
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
};

export const fmtDeadline = (str) => {
  if (!str) return "";
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const deadlineUrgency = (deadlineDateStr) => {
  if (!deadlineDateStr) return null;
  const today = new Date(todayStr() + "T00:00:00");
  const end = new Date(deadlineDateStr + "T00:00:00");
  if (end < today) return "overdue";
  const wdays = countWorkingDays(todayStr(), deadlineDateStr);
  if (wdays <= 3) return "critical";
  if (wdays <= 5) return "warning";
  return "ok";
};

export const calculateStatusTimeline = (record) => {
  const { dateReceivedCent, dateReleased, dbTimelineCitizenCharter: tl } = record;
  if (!dateReceivedCent || !tl || dateReceivedCent === "N/A" || tl === null)
    return { status: "", days: 0 };
  const receivedDate = new Date(dateReceivedCent);
  const endDate =
    dateReleased && dateReleased !== "N/A"
      ? new Date(dateReleased)
      : new Date();
  if (isNaN(receivedDate.getTime()) || isNaN(endDate.getTime()))
    return { status: "", days: 0 };
  const diffDays = Math.ceil(Math.abs(endDate - receivedDate) / 864e5);
  return diffDays <= parseInt(tl, 10)
    ? { status: "WITHIN", days: diffDays }
    : { status: "BEYOND", days: diffDays };
};

/**
 * From a sorted list of application logs, find the most recent
 * Quality Evaluation user who routed TO the given currentStep.
 * Used for "Return to Evaluator" auto-assignment.
 */
export const findPreviousEvaluator = (logs, currentStep) => {
  if (!Array.isArray(logs) || logs.length === 0) return null;

  // Sort ascending by del_index so we can walk the chain
  const sorted = [...logs].sort((a, b) => (a.del_index ?? 0) - (b.del_index ?? 0));

  // Find the current open log for currentStep
  const currentLogIdx = sorted.findIndex(
    (l) => l.application_step === currentStep && l.del_thread === "Open",
  );
  if (currentLogIdx <= 0) return null;

  // Walk backwards from the current log to find the nearest Quality Evaluation log
  for (let i = currentLogIdx - 1; i >= 0; i--) {
    if (sorted[i].application_step === "Quality Evaluation") {
      return sorted[i].user_name ?? null;
    }
  }
  return null;
};
