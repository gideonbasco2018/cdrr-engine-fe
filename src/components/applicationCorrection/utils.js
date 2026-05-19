export const formatDate = (d) => {
  if (!d || d === "N/A" || d === null) return "N/A";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
};

export const cleanValue = (v) => {
  if (v === null || v === undefined || v === "" || v === "N/A") return "N/A";
  return String(v);
};

export const calculateStatusTimeline = (record) => {
  const {
    dateReceivedCent,
    dateReleased,
    dbTimelineCitizenCharter: timeline,
  } = record;
  if (
    !dateReceivedCent ||
    !timeline ||
    dateReceivedCent === "N/A" ||
    timeline === null
  )
    return { status: "", days: 0 };
  const received = new Date(dateReceivedCent);
  const end =
    dateReleased && dateReleased !== "N/A"
      ? new Date(dateReleased)
      : new Date();
  if (isNaN(received.getTime()) || isNaN(end.getTime()))
    return { status: "", days: 0 };
  const diffDays = Math.ceil(Math.abs(end - received) / 864e5);
  const tv = parseInt(timeline, 10);
  return diffDays <= tv
    ? { status: "WITHIN", days: diffDays }
    : { status: "BEYOND", days: diffDays };
};