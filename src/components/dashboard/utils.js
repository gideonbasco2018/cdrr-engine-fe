import { TODAY } from "./constants";

// ─── Theme / UI ───────────────────────────────────────────────────────────────
const FB = "#1877F2";
const FB_LIGHT = "#E7F0FD";

export function makeUI(dark) {
  return dark
    ? {
        pageBg: "#18191a", sidebarBg: "#141414", cardBg: "#242526",
        cardBorder: "#3a3b3c", inputBg: "#3a3b3c", textPrimary: "#e4e6ea",
        textSub: "#b0b3b8", textMuted: "#65676b", divider: "#3a3b3c",
        hoverBg: "#2d2e2f", activeNavBg: "#263951", gridLine: "#2d2e2f",
        metricBorder: "#3a3b3c", metricActiveBg: "#1c2e45",
        progressBg: "#3a3b3c", sidebarTitle: "#e4e6ea",
      }
    : {
        pageBg: "#f0f2f5", sidebarBg: "#ffffff", cardBg: "#ffffff",
        cardBorder: "#dddfe2", inputBg: "#f0f2f5", textPrimary: "#1c1e21",
        textSub: "#65676b", textMuted: "#8a8d91", divider: "#e4e6eb",
        hoverBg: "#f2f3f5", activeNavBg: FB_LIGHT, gridLine: "#e4e6eb",
        metricBorder: "#dddfe2", metricActiveBg: FB_LIGHT,
        progressBg: "#e4e6eb", sidebarTitle: "#1c1e21",
      };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
export function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateRange(start, end) {
  if (!start && !end) return "";
  if (start && !end) return formatDateShort(start);
  if (!start && end) return `Until ${formatDateShort(end)}`;
  return `${formatDateShort(start)} – ${formatDateShort(end)}`;
}

export function daysBetween(start, end) {
  if (!start || !end) return null;
  return Math.max(
    0,
    Math.round((new Date(end + "T00:00:00") - new Date(start + "T00:00:00")) / 86400000),
  );
}

export function daysUntil(end) {
  if (!end) return null;
  return Math.max(0, Math.round((new Date(end + "T00:00:00") - TODAY) / 86400000));
}

export function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

export function fmtDateTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

// ─── Status badge ─────────────────────────────────────────────────────────────
export function statusBadge(status, ui) {
  const s = (status || "").toUpperCase();
  if (s === "COMPLETED")   return { color: "#36a420", bg: "#e9f7e6", label: "Completed"   };
  if (s === "IN PROGRESS") return { color: "#f59e0b", bg: "#fff8e7", label: "In Progress" };
  return { color: ui.textMuted, bg: ui.pageBg, label: status || "—" };
}

// ─── Chart param builder ──────────────────────────────────────────────────────
import { MONTH_NUM } from "./constants";

export function buildChartParams(breakdown, selYear, selMonth) {
  if (breakdown === "year") return { breakdown: "year" };
  if (breakdown === "month") {
    return { breakdown: "month", date_from: `${selYear}-01-01`, date_to: `${selYear}-12-31` };
  }
  const mn = MONTH_NUM[selMonth];
  const lastDay = new Date(parseInt(selYear), parseInt(mn), 0).getDate();
  return {
    breakdown: "day",
    date_from: `${selYear}-${mn}-01`,
    date_to:   `${selYear}-${mn}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function mapPoint(pt) {
  return {
    label:         pt.label,
    received:      pt.received,
    completed:     pt.completed,
    onProcess:     pt.on_process,
    target:        pt.target,
    completedRate: pt.completed_rate,
  };
}

// ─── Working week helpers ─────────────────────────────────────────────────────
export function fmtLocal(d) {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getWorkingWeek() {
  const today = new Date("2026-03-11T00:00:00"), dow = today.getDay();
  const mon = new Date(today);
  mon.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow));
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  return { start: fmtLocal(mon), end: fmtLocal(fri) };
}

export function getWorkingDayLabels() {
  const week = getWorkingWeek(), dayNames = ["Mon","Tue","Wed","Thu","Fri"];
  return dayNames.map((dayLabel, i) => {
    const [yr, mo, da] = week.start.split("-").map(Number);
    const d = new Date(yr, mo - 1, da + i);
    return {
      dayLabel,
      dateNum:    d.getDate(),
      monthLabel: d.toLocaleDateString("en-PH", { month: "short" }),
      dateStr:    fmtLocal(d),
    };
  });
}

export function workingDaysLeft(endDateStr) {
  const [ey, em, ed] = endDateStr.split("-").map(Number);
  const cur = new Date(2026, 2, 11), end = new Date(ey, em - 1, ed);
  let count = 0;
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
