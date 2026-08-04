// ── Status → progress-bar visual treatment ──────────────────────────
// Groups any raw status text into a "kind" with a fill level, so the
// bar communicates how far along the task is at a glance.
export const STATUS_KIND_MAP = {
  COMPLETED: "done",
  CLOSED: "done",
  RELEASED: "done",

  CANCELLED: "stopped",
  CANCELED: "stopped",
  REJECTED: "stopped",
  DENIED: "stopped",

  "FOR COMPLIANCE": "attention",
  "FOR EVALUATION": "attention",
  "FOR REVIEW": "attention",
  "FOR CORRECTION": "attention",

  ONGOING: "progress",
  "ON-PROCESS": "progress",
  "ON PROCESS": "progress",
  "IN PROGRESS": "progress",
};

export const STATUS_KIND_STYLES = {
  done: { color: "#22c55e", fill: 100, striped: false },
  progress: { color: "#3b82f6", fill: 60, striped: true },
  attention: { color: "#f59e0b", fill: 40, striped: false },
  stopped: { color: "#ef4444", fill: 100, striped: false },
  default: { color: "#9ca3af", fill: 25, striped: false },
};

export const isCompletedStatus = (status) =>
  (status || "").trim().toUpperCase() === "COMPLETED";

// ── Target outcome (date_accomplished vs target_end_date) ──────────
export const TARGET_OUTCOME_STYLES = {
  within: {
    bg: "rgba(34,197,94,0.12)",
    border: "#22c55e",
    color: "#22c55e",
    label: "Within Target",
  },
  beyond: {
    bg: "rgba(239,68,68,0.12)",
    border: "#ef4444",
    color: "#ef4444",
    label: "Beyond Target",
  },
  overdue: {
    bg: "rgba(239,68,68,0.12)",
    border: "#ef4444",
    color: "#ef4444",
    label: "Overdue",
  },
  pending: {
    bg: "rgba(59,130,246,0.12)",
    border: "#3b82f6",
    color: "#3b82f6",
    label: "Pending",
  },
  unknown: {
    bg: "rgba(150,150,150,0.12)",
    border: "#9ca3af",
    color: "#9ca3af",
    label: "—",
  },
};

export const todayLocalIso = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const formatMonthLabel = (key) => {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

// Compare date_accomplished vs target_end_date to classify the
// outcome of a targeted task. Falls back to "Pending"/"Overdue" when
// the task hasn't been accomplished yet.
export function getTargetOutcome(t) {
  const end = t.target_end_date;
  if (!end) return "unknown";

  const accomplished = t.date_accomplished
    ? String(t.date_accomplished).slice(0, 10)
    : null;

  if (accomplished) {
    return accomplished <= end ? "within" : "beyond";
  }

  return todayLocalIso() > end ? "overdue" : "pending";
}
