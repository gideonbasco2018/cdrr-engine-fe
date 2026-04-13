// FILE: src/pages/DashboardPage.jsx
import { useState, useMemo, useEffect, useCallback } from "react";
import { getDashboardSummary } from "../api/dashboard";

const FB = "#1877F2";
const FB_LIGHT = "#E7F0FD";

function makeUI(dark) {
  return dark
    ? {
        pageBg: "#18191a",
        sidebarBg: "#141414",
        cardBg: "#242526",
        cardBorder: "#3a3b3c",
        inputBg: "#3a3b3c",
        textPrimary: "#e4e6ea",
        textSub: "#b0b3b8",
        textMuted: "#65676b",
        divider: "#3a3b3c",
        hoverBg: "#2d2e2f",
        activeNavBg: "#263951",
        gridLine: "#2d2e2f",
        metricBorder: "#3a3b3c",
        metricActiveBg: "#1c2e45",
        progressBg: "#3a3b3c",
        sidebarTitle: "#e4e6ea",
      }
    : {
        pageBg: "#f0f2f5",
        sidebarBg: "#ffffff",
        cardBg: "#ffffff",
        cardBorder: "#dddfe2",
        inputBg: "#f0f2f5",
        textPrimary: "#1c1e21",
        textSub: "#65676b",
        textMuted: "#8a8d91",
        divider: "#e4e6eb",
        hoverBg: "#f2f3f5",
        activeNavBg: FB_LIGHT,
        gridLine: "#e4e6eb",
        metricBorder: "#dddfe2",
        metricActiveBg: FB_LIGHT,
        progressBg: "#e4e6eb",
        sidebarTitle: "#1c1e21",
      };
}

function deriveOnProcess(d) {
  return { ...d, onProcess: d.received - d.completed };
}

const DATA_ALL_YEARS_RAW = [
  { label: "2022", received: 742, completed: 568, target: 120 },
  { label: "2023", received: 891, completed: 682, target: 144 },
  { label: "2024", received: 1034, completed: 793, target: 168 },
  { label: "2025", received: 1187, completed: 912, target: 192 },
  { label: "2026", received: 237, completed: 183, target: 48 },
];
const DATA_ALL_YEARS = DATA_ALL_YEARS_RAW.map(deriveOnProcess);

const ALL_TIME_TOTALS = {
  received: DATA_ALL_YEARS.reduce((s, r) => s + r.received, 0),
  completed: DATA_ALL_YEARS.reduce((s, r) => s + r.completed, 0),
  onProcess: DATA_ALL_YEARS.reduce((s, r) => s + r.onProcess, 0),
  target: DATA_ALL_YEARS.reduce((s, r) => s + r.target, 0),
};
ALL_TIME_TOTALS.completedRate =
  ALL_TIME_TOTALS.received > 0
    ? ((ALL_TIME_TOTALS.completed / ALL_TIME_TOTALS.received) * 100).toFixed(1)
    : "0.0";

const DATA_MONTHLY_BY_YEAR_RAW = {
  2022: [
    { label: "Jan", received: 52, completed: 38, target: 10 },
    { label: "Feb", received: 44, completed: 31, target: 8 },
    { label: "Mar", received: 67, completed: 51, target: 12 },
    { label: "Apr", received: 55, completed: 40, target: 10 },
    { label: "May", received: 73, completed: 56, target: 12 },
    { label: "Jun", received: 60, completed: 45, target: 10 },
    { label: "Jul", received: 78, completed: 60, target: 12 },
    { label: "Aug", received: 65, completed: 49, target: 10 },
    { label: "Sep", received: 50, completed: 37, target: 8 },
    { label: "Oct", received: 69, completed: 53, target: 12 },
    { label: "Nov", received: 57, completed: 43, target: 10 },
    { label: "Dec", received: 72, completed: 55, target: 12 },
  ],
  2023: [
    { label: "Jan", received: 63, completed: 47, target: 10 },
    { label: "Feb", received: 75, completed: 57, target: 12 },
    { label: "Mar", received: 82, completed: 63, target: 12 },
    { label: "Apr", received: 68, completed: 51, target: 10 },
    { label: "May", received: 91, completed: 70, target: 14 },
    { label: "Jun", received: 74, completed: 56, target: 12 },
    { label: "Jul", received: 98, completed: 75, target: 14 },
    { label: "Aug", received: 85, completed: 65, target: 12 },
    { label: "Sep", received: 66, completed: 50, target: 10 },
    { label: "Oct", received: 79, completed: 61, target: 12 },
    { label: "Nov", received: 70, completed: 54, target: 10 },
    { label: "Dec", received: 40, completed: 30, target: 8 },
  ],
  2024: [
    { label: "Jan", received: 81, completed: 62, target: 12 },
    { label: "Feb", received: 88, completed: 67, target: 14 },
    { label: "Mar", received: 99, completed: 76, target: 14 },
    { label: "Apr", received: 85, completed: 65, target: 12 },
    { label: "May", received: 110, completed: 84, target: 16 },
    { label: "Jun", received: 93, completed: 71, target: 14 },
    { label: "Jul", received: 118, completed: 90, target: 16 },
    { label: "Aug", received: 104, completed: 79, target: 14 },
    { label: "Sep", received: 79, completed: 60, target: 12 },
    { label: "Oct", received: 95, completed: 73, target: 14 },
    { label: "Nov", received: 89, completed: 68, target: 12 },
    { label: "Dec", received: 93, completed: 71, target: 14 },
  ],
  2025: [
    { label: "Jan", received: 92, completed: 70, target: 14 },
    { label: "Feb", received: 101, completed: 78, target: 14 },
    { label: "Mar", received: 115, completed: 88, target: 16 },
    { label: "Apr", received: 97, completed: 74, target: 14 },
    { label: "May", received: 124, completed: 95, target: 16 },
    { label: "Jun", received: 108, completed: 83, target: 16 },
    { label: "Jul", received: 131, completed: 101, target: 18 },
    { label: "Aug", received: 116, completed: 89, target: 16 },
    { label: "Sep", received: 95, completed: 73, target: 14 },
    { label: "Oct", received: 109, completed: 84, target: 16 },
    { label: "Nov", received: 102, completed: 78, target: 14 },
    { label: "Dec", received: 97, completed: 74, target: 14 },
  ],
  2026: [
    { label: "Jan", received: 95, completed: 72, target: 14 },
    { label: "Feb", received: 108, completed: 83, target: 16 },
    { label: "Mar", received: 34, completed: 28, target: 3 },
  ],
};
const DATA_MONTHLY_BY_YEAR = {};
Object.keys(DATA_MONTHLY_BY_YEAR_RAW).forEach((yr) => {
  DATA_MONTHLY_BY_YEAR[yr] = DATA_MONTHLY_BY_YEAR_RAW[yr].map(deriveOnProcess);
});

const DATA_DAILY_BY_MONTH_RAW = {
  "2026-01": [
    { label: "1", received: 14, completed: 10, target: 3 },
    { label: "2", received: 18, completed: 13, target: 3 },
    { label: "3", received: 11, completed: 8, target: 3 },
    { label: "4", received: 22, completed: 16, target: 3 },
    { label: "5", received: 16, completed: 12, target: 3 },
    { label: "6", received: 9, completed: 6, target: 3 },
    { label: "7", received: 20, completed: 15, target: 3 },
    { label: "8", received: 17, completed: 13, target: 3 },
    { label: "9", received: 13, completed: 9, target: 3 },
    { label: "10", received: 25, completed: 19, target: 3 },
    { label: "11", received: 19, completed: 14, target: 3 },
    { label: "12", received: 15, completed: 11, target: 3 },
    { label: "13", received: 23, completed: 18, target: 3 },
    { label: "14", received: 10, completed: 7, target: 3 },
    { label: "15", received: 28, completed: 21, target: 3 },
    { label: "16", received: 21, completed: 16, target: 3 },
    { label: "17", received: 17, completed: 12, target: 3 },
    { label: "18", received: 24, completed: 18, target: 3 },
    { label: "19", received: 12, completed: 9, target: 3 },
    { label: "20", received: 26, completed: 20, target: 3 },
    { label: "21", received: 18, completed: 13, target: 3 },
    { label: "22", received: 14, completed: 10, target: 3 },
    { label: "23", received: 22, completed: 17, target: 3 },
    { label: "24", received: 19, completed: 14, target: 3 },
    { label: "25", received: 11, completed: 8, target: 3 },
    { label: "26", received: 27, completed: 21, target: 3 },
    { label: "27", received: 16, completed: 12, target: 3 },
    { label: "28", received: 20, completed: 15, target: 3 },
    { label: "29", received: 13, completed: 9, target: 3 },
    { label: "30", received: 23, completed: 17, target: 3 },
    { label: "31", received: 15, completed: 11, target: 3 },
  ],
  "2026-02": [
    { label: "1", received: 20, completed: 15, target: 3 },
    { label: "2", received: 16, completed: 12, target: 3 },
    { label: "3", received: 24, completed: 18, target: 3 },
    { label: "4", received: 13, completed: 9, target: 3 },
    { label: "5", received: 29, completed: 22, target: 3 },
    { label: "6", received: 18, completed: 14, target: 3 },
    { label: "7", received: 22, completed: 17, target: 3 },
    { label: "8", received: 11, completed: 8, target: 3 },
    { label: "9", received: 26, completed: 20, target: 3 },
    { label: "10", received: 19, completed: 14, target: 3 },
    { label: "11", received: 15, completed: 11, target: 3 },
    { label: "12", received: 31, completed: 24, target: 3 },
    { label: "13", received: 17, completed: 13, target: 3 },
    { label: "14", received: 23, completed: 17, target: 3 },
    { label: "15", received: 12, completed: 9, target: 3 },
    { label: "16", received: 28, completed: 21, target: 3 },
    { label: "17", received: 20, completed: 15, target: 3 },
    { label: "18", received: 14, completed: 10, target: 3 },
    { label: "19", received: 25, completed: 19, target: 3 },
    { label: "20", received: 18, completed: 14, target: 3 },
    { label: "21", received: 10, completed: 7, target: 3 },
    { label: "22", received: 27, completed: 21, target: 3 },
    { label: "23", received: 21, completed: 16, target: 3 },
    { label: "24", received: 16, completed: 12, target: 3 },
    { label: "25", received: 30, completed: 23, target: 3 },
    { label: "26", received: 13, completed: 9, target: 3 },
    { label: "27", received: 22, completed: 17, target: 3 },
    { label: "28", received: 17, completed: 13, target: 3 },
  ],
  "2026-03": [
    { label: "1", received: 18, completed: 13, target: 3 },
    { label: "2", received: 22, completed: 17, target: 3 },
    { label: "3", received: 15, completed: 11, target: 3 },
    { label: "4", received: 30, completed: 24, target: 3 },
    { label: "5", received: 27, completed: 20, target: 3 },
    { label: "6", received: 12, completed: 9, target: 3 },
    { label: "7", received: 19, completed: 14, target: 3 },
    { label: "8", received: 24, completed: 18, target: 3 },
    { label: "9", received: 21, completed: 16, target: 3 },
    { label: "10", received: 16, completed: 12, target: 3 },
  ],
  "2025-01": [
    { label: "1", received: 13, completed: 9, target: 3 },
    { label: "2", received: 17, completed: 13, target: 3 },
    { label: "3", received: 10, completed: 7, target: 3 },
    { label: "4", received: 21, completed: 16, target: 3 },
    { label: "5", received: 15, completed: 11, target: 3 },
    { label: "6", received: 8, completed: 5, target: 3 },
    { label: "7", received: 19, completed: 14, target: 3 },
    { label: "8", received: 16, completed: 12, target: 3 },
    { label: "9", received: 12, completed: 9, target: 3 },
    { label: "10", received: 24, completed: 18, target: 3 },
    { label: "11", received: 18, completed: 13, target: 3 },
    { label: "12", received: 14, completed: 10, target: 3 },
    { label: "13", received: 22, completed: 17, target: 3 },
    { label: "14", received: 9, completed: 6, target: 3 },
    { label: "15", received: 27, completed: 21, target: 3 },
    { label: "16", received: 20, completed: 15, target: 3 },
    { label: "17", received: 16, completed: 12, target: 3 },
    { label: "18", received: 23, completed: 18, target: 3 },
    { label: "19", received: 11, completed: 8, target: 3 },
    { label: "20", received: 25, completed: 19, target: 3 },
    { label: "21", received: 17, completed: 13, target: 3 },
    { label: "22", received: 13, completed: 9, target: 3 },
    { label: "23", received: 21, completed: 16, target: 3 },
    { label: "24", received: 18, completed: 14, target: 3 },
    { label: "25", received: 10, completed: 7, target: 3 },
    { label: "26", received: 26, completed: 20, target: 3 },
    { label: "27", received: 15, completed: 11, target: 3 },
    { label: "28", received: 19, completed: 14, target: 3 },
    { label: "29", received: 12, completed: 9, target: 3 },
    { label: "30", received: 22, completed: 17, target: 3 },
    { label: "31", received: 14, completed: 10, target: 3 },
  ],
  "2025-06": [
    { label: "1", received: 16, completed: 12, target: 3 },
    { label: "2", received: 21, completed: 16, target: 3 },
    { label: "3", received: 14, completed: 10, target: 3 },
    { label: "4", received: 28, completed: 22, target: 3 },
    { label: "5", received: 19, completed: 14, target: 3 },
    { label: "6", received: 11, completed: 8, target: 3 },
    { label: "7", received: 24, completed: 18, target: 3 },
    { label: "8", received: 17, completed: 13, target: 3 },
    { label: "9", received: 22, completed: 17, target: 3 },
    { label: "10", received: 13, completed: 9, target: 3 },
    { label: "11", received: 29, completed: 22, target: 3 },
    { label: "12", received: 20, completed: 15, target: 3 },
    { label: "13", received: 15, completed: 11, target: 3 },
    { label: "14", received: 26, completed: 20, target: 3 },
    { label: "15", received: 18, completed: 14, target: 3 },
    { label: "16", received: 12, completed: 9, target: 3 },
    { label: "17", received: 31, completed: 24, target: 3 },
    { label: "18", received: 23, completed: 18, target: 3 },
    { label: "19", received: 16, completed: 12, target: 3 },
    { label: "20", received: 27, completed: 21, target: 3 },
    { label: "21", received: 19, completed: 15, target: 3 },
    { label: "22", received: 14, completed: 10, target: 3 },
    { label: "23", received: 24, completed: 18, target: 3 },
    { label: "24", received: 20, completed: 15, target: 3 },
    { label: "25", received: 10, completed: 7, target: 3 },
    { label: "26", received: 28, completed: 22, target: 3 },
    { label: "27", received: 17, completed: 13, target: 3 },
    { label: "28", received: 21, completed: 16, target: 3 },
    { label: "29", received: 13, completed: 10, target: 3 },
    { label: "30", received: 25, completed: 19, target: 3 },
  ],
  "2025-12": [
    { label: "1", received: 15, completed: 11, target: 3 },
    { label: "2", received: 19, completed: 14, target: 3 },
    { label: "3", received: 12, completed: 9, target: 3 },
    { label: "4", received: 24, completed: 18, target: 3 },
    { label: "5", received: 17, completed: 13, target: 3 },
    { label: "6", received: 10, completed: 7, target: 3 },
    { label: "7", received: 22, completed: 17, target: 3 },
    { label: "8", received: 16, completed: 12, target: 3 },
    { label: "9", received: 20, completed: 15, target: 3 },
    { label: "10", received: 14, completed: 10, target: 3 },
    { label: "11", received: 27, completed: 21, target: 3 },
    { label: "12", received: 18, completed: 14, target: 3 },
    { label: "13", received: 13, completed: 9, target: 3 },
    { label: "14", received: 23, completed: 17, target: 3 },
    { label: "15", received: 16, completed: 12, target: 3 },
    { label: "16", received: 11, completed: 8, target: 3 },
    { label: "17", received: 29, completed: 22, target: 3 },
    { label: "18", received: 21, completed: 16, target: 3 },
    { label: "19", received: 15, completed: 11, target: 3 },
    { label: "20", received: 25, completed: 19, target: 3 },
    { label: "21", received: 17, completed: 13, target: 3 },
    { label: "22", received: 12, completed: 9, target: 3 },
    { label: "23", received: 8, completed: 6, target: 3 },
    { label: "24", received: 5, completed: 4, target: 3 },
    { label: "25", received: 4, completed: 3, target: 3 },
    { label: "26", received: 18, completed: 14, target: 3 },
    { label: "27", received: 22, completed: 17, target: 3 },
    { label: "28", received: 19, completed: 14, target: 3 },
    { label: "29", received: 14, completed: 10, target: 3 },
    { label: "30", received: 23, completed: 17, target: 3 },
    { label: "31", received: 16, completed: 12, target: 3 },
  ],
};
const DATA_DAILY_BY_MONTH = {};
Object.keys(DATA_DAILY_BY_MONTH_RAW).forEach((key) => {
  DATA_DAILY_BY_MONTH[key] = DATA_DAILY_BY_MONTH_RAW[key].map(deriveOnProcess);
});

const MONTH_DAYS = {
  Jan: 31,
  Feb: 28,
  Mar: 31,
  Apr: 30,
  May: 31,
  Jun: 30,
  Jul: 31,
  Aug: 31,
  Sep: 30,
  Oct: 31,
  Nov: 30,
  Dec: 31,
};

function generateDailyData(year, monthIdx, days) {
  const seed = parseInt(year) * 13 + monthIdx * 7;
  return Array.from({ length: days }, (_, i) => {
    const r = 8 + ((seed + i * 11) % 24);
    const comp = Math.min(
      r - 1,
      Math.round(r * (0.65 + ((seed + i * 3) % 10) * 0.025)),
    );
    return deriveOnProcess({
      label: String(i + 1),
      received: r,
      completed: comp,
      target: 3,
    });
  });
}

const AVAILABLE_YEARS = ["All", "2026", "2025", "2024", "2023", "2022"];
const MONTHS_BY_YEAR = {
  2022: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  2023: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  2024: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  2025: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  2026: ["Jan", "Feb", "Mar"],
};
const MONTH_NUM = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};
const MONTH_IDX = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const SERIES = [
  { key: "received", label: "Total Received", color: "#1877F2" },
  { key: "completed", label: "Completed", color: "#36a420" },
  { key: "onProcess", label: "On Process", color: "#f59e0b" },
  { key: "target", label: "Target", color: "#9333ea", dashed: true },
];

const TARGETS_WEEKLY = [
  {
    id: 1,
    icon: "👥",
    label: "Process Application",
    goal: 10,
    done: 3,
    deadline: "Mar 13, 2026",
    description: "Evaluate and process CPR applications assigned to you.",
    items: [
      { name: "20230908133701 – Furacef-750 (Cefuroxime Sodium)", done: true },
      { name: "20230908133702 – Amoxil-500 (Amoxicillin)", done: true },
      { name: "20230908133703 – Calpol-250 (Paracetamol)", done: true },
      { name: "20230908133704 – Cloxacil-250 (Cloxacillin)", done: false },
      { name: "20230908133705 – Augmentin-625 (Co-Amoxiclav)", done: false },
      { name: "20230908133706 – Mefenamic-500 (Mefenamic Acid)", done: false },
      {
        name: "20230908133707 – Losartan-50 (Losartan Potassium)",
        done: false,
      },
      {
        name: "20230908133708 – Amlodipine-10 (Amlodipine Besylate)",
        done: false,
      },
      { name: "20230908133709 – Metformin-500 (Metformin HCl)", done: false },
      {
        name: "20230908133710 – Atorvastatin-20 (Atorvastatin Calcium)",
        done: false,
      },
    ],
  },
];

const TARGETS_1_15 = [
  {
    id: 1,
    icon: "📥",
    label: "Receive 50 new applications",
    goal: 50,
    done: 34,
    deadline: "Mar 15, 2026",
    description: "Receive and log all incoming applications from Mar 1–15.",
    items: [
      { name: "Batch Mar 1 – 12 apps received", done: true },
      { name: "Batch Mar 2–5 – 22 apps received", done: true },
      { name: "Batch Mar 6–10 – 16 apps pending", done: false },
      { name: "Batch Mar 11–15 – 0 apps pending", done: false },
    ],
  },
  {
    id: 2,
    icon: "✅",
    label: "Release 40 processed documents",
    goal: 40,
    done: 28,
    deadline: "Mar 15, 2026",
    description:
      "Release all documents that have completed evaluation by March 15.",
    items: [
      { name: "Mar 1–5 batch – 18 docs released", done: true },
      { name: "Mar 6–10 batch – 10 docs released", done: true },
      { name: "Mar 11–15 batch – 12 docs pending", done: false },
    ],
  },
  {
    id: 3,
    icon: "🔍",
    label: "Evaluate 20 backlog items",
    goal: 20,
    done: 12,
    deadline: "Mar 15, 2026",
    description: "Review and resolve accumulated backlog items from February.",
    items: [
      { name: "Feb backlog Set A – 6 items cleared", done: true },
      { name: "Feb backlog Set B – 6 items cleared", done: true },
      { name: "Feb backlog Set C – 8 items pending", done: false },
    ],
  },
  {
    id: 4,
    icon: "📊",
    label: "Submit mid-month status report",
    goal: 1,
    done: 0,
    deadline: "Mar 15, 2026",
    description:
      "Prepare and submit the mid-month application status report to supervisor.",
    items: [{ name: "Mid-month report – Mar 1–15", done: false }],
  },
];

const TARGETS_16_30 = [
  {
    id: 1,
    icon: "📥",
    label: "Receive 60 new applications",
    goal: 60,
    done: 0,
    deadline: "Mar 30, 2026",
    description: "Receive and log all incoming applications from Mar 16–30.",
    items: [
      { name: "Batch Mar 16–20 – target 20 apps", done: false },
      { name: "Batch Mar 21–25 – target 20 apps", done: false },
      { name: "Batch Mar 26–30 – target 20 apps", done: false },
    ],
  },
  {
    id: 2,
    icon: "✅",
    label: "Release 50 processed documents",
    goal: 50,
    done: 0,
    deadline: "Mar 30, 2026",
    description: "Release all documents completing evaluation from Mar 16–30.",
    items: [
      { name: "Mar 16–20 batch – 17 docs target", done: false },
      { name: "Mar 21–25 batch – 17 docs target", done: false },
      { name: "Mar 26–30 batch – 16 docs target", done: false },
    ],
  },
  {
    id: 3,
    icon: "📬",
    label: "Notify 30 applicants of final status",
    goal: 30,
    done: 0,
    deadline: "Mar 30, 2026",
    description:
      "Send final status notifications to applicants before month-end.",
    items: [
      { name: "Batch 1 – 10 applicants (Mar 16–20)", done: false },
      { name: "Batch 2 – 10 applicants (Mar 21–25)", done: false },
      { name: "Batch 3 – 10 applicants (Mar 26–30)", done: false },
    ],
  },
  {
    id: 4,
    icon: "🗄️",
    label: "Complete month-end archiving",
    goal: 15,
    done: 0,
    deadline: "Mar 30, 2026",
    description:
      "Archive all processed records for March before month-end closing.",
    items: [
      { name: "Archive Set A – Mar 1–10 records", done: false },
      { name: "Archive Set B – Mar 11–20 records", done: false },
      { name: "Archive Set C – Mar 21–30 records", done: false },
    ],
  },
];

const TARGETS_MONTHLY = [
  {
    id: 1,
    icon: "📦",
    label: "Process 120 total applications",
    goal: 120,
    done: 34,
    deadline: "Mar 31, 2026",
    description:
      "Total applications to be processed for the entire month of March.",
    items: [
      { name: "Mar 1–10: 34 processed ✓", done: true },
      { name: "Mar 11–20: target 43 apps", done: false },
      { name: "Mar 21–31: target 43 apps", done: false },
    ],
  },
  {
    id: 2,
    icon: "✅",
    label: "Achieve 90 document releases",
    goal: 90,
    done: 28,
    deadline: "Mar 31, 2026",
    description: "Total target for completed documents for March 2026.",
    items: [
      { name: "Mar 1–10: 28 released ✓", done: true },
      { name: "Mar 11–20: target 31 releases", done: false },
      { name: "Mar 21–31: target 31 releases", done: false },
    ],
  },
  {
    id: 3,
    icon: "📉",
    label: "Reduce backlog by 30 items",
    goal: 30,
    done: 12,
    deadline: "Mar 31, 2026",
    description:
      "Clear accumulated backlog items to improve processing efficiency.",
    items: [
      { name: "Feb carryover backlog – 12 cleared ✓", done: true },
      { name: "Mar mid-month backlog – target 10", done: false },
      { name: "Mar end-month backlog – target 8", done: false },
    ],
  },
  {
    id: 4,
    icon: "📋",
    label: "Submit monthly accomplishment report",
    goal: 1,
    done: 0,
    deadline: "Mar 31, 2026",
    description:
      "Compile and submit the complete monthly accomplishment report.",
    items: [{ name: "Monthly report – March 2026", done: false }],
  },
  {
    id: 5,
    icon: "🎯",
    label: "Maintain 75% completion rate",
    goal: 100,
    done: 74,
    deadline: "Mar 31, 2026",
    description:
      "Keep the completion rate at or above 75% for the entire month.",
    items: [
      { name: "Mar 1–10: 74% completion rate achieved ✓", done: true },
      { name: "Mar 11–20: maintain 75%+ target", done: false },
      { name: "Mar 21–31: maintain 75%+ target", done: false },
    ],
  },
];

const TARGET_PERIODS = {
  weekly: {
    label: "Weekly",
    sublabel: "Mar 9–13, 2026",
    data: TARGETS_WEEKLY,
    daysLeft: 2,
    reportPeriod: "Week of Mar 9–13, 2026",
  },
  first15: {
    label: "Mar 1–15",
    sublabel: "First Half",
    data: TARGETS_1_15,
    daysLeft: 5,
    reportPeriod: "Mar 1–15, 2026 (First Half)",
  },
  last15: {
    label: "Mar 16–30",
    sublabel: "Second Half",
    data: TARGETS_16_30,
    daysLeft: 20,
    reportPeriod: "Mar 16–30, 2026 (Second Half)",
  },
  monthly: {
    label: "Monthly",
    sublabel: "March 2026",
    data: TARGETS_MONTHLY,
    daysLeft: 21,
    reportPeriod: "March 2026 (Full Month)",
  },
};

const TODAY = new Date("2026-03-11T00:00:00");

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function formatDateDisplay(dateStr) {
  return formatDateShort(dateStr);
}
function formatDateRange(start, end) {
  if (!start && !end) return "";
  if (start && !end) return formatDateDisplay(start);
  if (!start && end) return `Until ${formatDateDisplay(end)}`;
  return `${formatDateDisplay(start)} – ${formatDateDisplay(end)}`;
}
function daysBetween(start, end) {
  if (!start || !end) return null;
  const ms = new Date(end + "T00:00:00") - new Date(start + "T00:00:00");
  return Math.max(0, Math.round(ms / 86400000));
}
function daysUntil(end) {
  if (!end) return null;
  const ms = new Date(end + "T00:00:00") - TODAY;
  return Math.max(0, Math.round(ms / 86400000));
}

function resolveTargetsForRange(start, end) {
  if (!start || !end) return TARGETS_WEEKLY;
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const diffDays = Math.round((e - s) / 86400000);
  if (diffDays <= 9) return TARGETS_WEEKLY;
  if (s.getDate() <= 5 && e.getDate() <= 16) return TARGETS_1_15;
  if (s.getDate() >= 14 && e.getDate() >= 20) return TARGETS_16_30;
  if (diffDays >= 20) return TARGETS_MONTHLY;
  return TARGETS_WEEKLY;
}

function buildDateParams(breakdown, selYear, selMonth) {
  if (breakdown === "year" || selYear === "All") return {};
  if (breakdown === "month") {
    return { date_from: `${selYear}-01-01`, date_to: `${selYear}-12-31` };
  }
  const monthNum = MONTH_NUM[selMonth];
  const daysInMonth = new Date(
    parseInt(selYear),
    parseInt(monthNum),
    0,
  ).getDate();
  return {
    date_from: `${selYear}-${monthNum}-01`,
    date_to: `${selYear}-${monthNum}-${String(daysInMonth).padStart(2, "0")}`,
  };
}

function TargetModal({ target, onClose, ui }) {
  if (!target) return null;
  const pct = Math.round((target.done / target.goal) * 100);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 12,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.4rem" }}>{target.icon}</span>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: ui.textPrimary,
                }}
              >
                {target.label}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.76rem",
                  color: ui.textSub,
                  marginTop: 2,
                }}
              >
                Deadline: {target.deadline}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: ui.textMuted,
              fontSize: "1.2rem",
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <p
            style={{
              margin: "0 0 14px",
              fontSize: "0.83rem",
              color: ui.textSub,
              lineHeight: 1.5,
            }}
          >
            {target.description}
          </p>
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.78rem",
                color: ui.textMuted,
                marginBottom: 6,
              }}
            >
              <span>
                {target.done} of {target.goal} completed
              </span>
              <span
                style={{ fontWeight: 700, color: pct === 100 ? "#36a420" : FB }}
              >
                {pct}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 99,
                background: ui.progressBg,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 99,
                  width: `${pct}%`,
                  background: pct === 100 ? "#36a420" : FB,
                  transition: "width 0.4s",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {target.items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: item.done ? ui.pageBg : "transparent",
                  border: `1px solid ${item.done ? ui.cardBorder : "transparent"}`,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    flexShrink: 0,
                    border: `2px solid ${item.done ? "#36a420" : ui.metricBorder}`,
                    background: item.done ? "#36a420" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.done && (
                    <span
                      style={{
                        color: "#fff",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "0.82rem",
                    color: item.done ? ui.textMuted : ui.textPrimary,
                    textDecoration: item.done ? "line-through" : "none",
                  }}
                >
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            padding: "12px 20px",
            borderTop: `1px solid ${ui.divider}`,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              background: FB,
              border: "none",
              color: "#fff",
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AreaChart({ data, subtitle, ui }) {
  const [hov, setHov] = useState(null);
  const W = 700,
    H = 200;
  const PAD = { top: 18, right: 16, bottom: 28, left: 44 };
  const cW = W - PAD.left - PAD.right,
    cH = H - PAD.top - PAD.bottom;
  const allVals = data.flatMap((d) => SERIES.map((s) => d[s.key] ?? 0));
  const maxV = (Math.max(...allVals) || 1) * 1.18;
  const toX = (i) => PAD.left + (i / Math.max(data.length - 1, 1)) * cW;
  const toY = (v) => PAD.top + cH - (v / maxV) * cH;
  const yticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxV * f));
  const xstep = Math.max(1, Math.ceil(data.length / 10));
  const showLabels = data.length <= 12;
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {SERIES.map((s) => (
            <div
              key={s.key}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: s.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "0.72rem",
                  color: ui.textSub,
                  fontFamily: "inherit",
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
        {subtitle && (
          <span
            style={{
              fontSize: "0.72rem",
              color: ui.textMuted,
              fontStyle: "italic",
              fontFamily: "inherit",
            }}
          >
            📅 {subtitle}
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          overflow: "visible",
        }}
      >
        <defs>
          {SERIES.map((s) => (
            <linearGradient
              key={s.key}
              id={`grad-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity="0.13" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {yticks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={toY(t)}
              x2={W - PAD.right}
              y2={toY(t)}
              stroke={ui.gridLine}
              strokeWidth="1"
            />
            <text
              x={PAD.left - 5}
              y={toY(t) + 4}
              textAnchor="end"
              fill={ui.textMuted}
              fontSize="9.5"
              fontFamily="inherit"
            >
              {t}
            </text>
          </g>
        ))}
        {SERIES.filter((s) => !s.dashed).map((s) => {
          const pts = data
            .map((d, i) => `${toX(i)},${toY(d[s.key] ?? 0)}`)
            .join(" ");
          const area = `${PAD.left},${PAD.top + cH} ${pts} ${toX(data.length - 1)},${PAD.top + cH}`;
          return (
            <polygon key={s.key} points={area} fill={`url(#grad-${s.key})`} />
          );
        })}
        {SERIES.map((s) => {
          const pts = data
            .map((d, i) => `${toX(i)},${toY(d[s.key] ?? 0)}`)
            .join(" ");
          return (
            <polyline
              key={s.key}
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth={s.dashed ? 1.5 : 2}
              strokeDasharray={s.dashed ? "5 3" : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={s.dashed ? 0.75 : 1}
            />
          );
        })}
        {data.map(
          (d, i) =>
            i % xstep === 0 && (
              <text
                key={i}
                x={toX(i)}
                y={H - 3}
                textAnchor="middle"
                fill={ui.textMuted}
                fontSize="9"
                fontFamily="inherit"
              >
                {d.label}
              </text>
            ),
        )}
        {showLabels &&
          data.map((d, i) =>
            SERIES.filter((s) => !s.dashed).map((s) => {
              const x = toX(i),
                y = toY(d[s.key] ?? 0);
              const yOff =
                s.key === "received" ? -10 : s.key === "completed" ? -4 : 13;
              return (
                <text
                  key={s.key}
                  x={x}
                  y={y + yOff}
                  textAnchor="middle"
                  fill={s.color}
                  fontSize="8.5"
                  fontWeight="700"
                  fontFamily="inherit"
                  style={{ pointerEvents: "none" }}
                >
                  {d[s.key]}
                </text>
              );
            }),
          )}
        {data.map((d, i) => (
          <g key={i}>
            <rect
              x={toX(i) - 16}
              y={PAD.top}
              width={32}
              height={cH}
              fill="transparent"
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
            />
            {hov === i &&
              (() => {
                const tipW = 132,
                  tipH = 84;
                const tipX =
                  toX(i) > W * 0.65 ? toX(i) - tipW - 10 : toX(i) + 10;
                const tipY = PAD.top + 2;
                return (
                  <g>
                    <line
                      x1={toX(i)}
                      y1={PAD.top}
                      x2={toX(i)}
                      y2={PAD.top + cH}
                      stroke={ui.gridLine}
                      strokeWidth="1"
                      strokeDasharray="4 3"
                    />
                    {SERIES.map((s) => (
                      <circle
                        key={s.key}
                        cx={toX(i)}
                        cy={toY(d[s.key] ?? 0)}
                        r="3.5"
                        fill={s.color}
                        stroke={ui.cardBg}
                        strokeWidth="2"
                      />
                    ))}
                    <rect
                      x={tipX}
                      y={tipY}
                      width={tipW}
                      height={tipH}
                      rx={6}
                      fill={ui.cardBg}
                      stroke={ui.cardBorder}
                      strokeWidth="1"
                      style={{
                        filter: "drop-shadow(0 2px 8px rgba(0,0,0,.22))",
                      }}
                    />
                    <text
                      x={tipX + 8}
                      y={tipY + 13}
                      fill={ui.textMuted}
                      fontSize="9"
                      fontWeight="600"
                      fontFamily="inherit"
                    >
                      {d.label}
                      {subtitle ? ` · ${subtitle}` : ""}
                    </text>
                    {SERIES.map((s, si) => (
                      <g key={s.key}>
                        <circle
                          cx={tipX + 11}
                          cy={tipY + 24 + si * 16}
                          r="3"
                          fill={s.color}
                        />
                        <text
                          x={tipX + 19}
                          y={tipY + 28 + si * 16}
                          fill={ui.textSub}
                          fontSize="9"
                          fontFamily="inherit"
                        >
                          {s.label}:
                        </text>
                        <text
                          x={tipX + tipW - 6}
                          y={tipY + 28 + si * 16}
                          textAnchor="end"
                          fill={s.color}
                          fontSize="9"
                          fontWeight="700"
                          fontFamily="inherit"
                        >
                          {d[s.key] ?? 0}
                        </text>
                      </g>
                    ))}
                  </g>
                );
              })()}
          </g>
        ))}
      </svg>
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
  change,
  active,
  onClick,
  ui,
  loading = false,
  isLive = false,
}) {
  const up = change >= 0;
  return (
    <div
      onClick={onClick}
      style={{
        flex: "1 1 0",
        padding: "12px 14px",
        borderRadius: 8,
        border: `1.5px solid ${active ? FB : ui.metricBorder}`,
        background: active ? ui.metricActiveBg : "transparent",
        cursor: "pointer",
        transition: "all 0.15s",
        minWidth: 0,
        position: "relative",
      }}
    >
      {isLive && !loading && (
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 8,
            fontSize: "0.56rem",
            fontWeight: 700,
            color: "#36a420",
            background: "#e9f7e6",
            padding: "1px 5px",
            borderRadius: 99,
            letterSpacing: "0.04em",
          }}
        >
          ● LIVE
        </span>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 5,
        }}
      >
        <span style={{ fontSize: "1rem" }}>{icon}</span>
        <span style={{ fontSize: "0.78rem", color: ui.textSub }}>{label}</span>
      </div>
      {loading ? (
        <div
          style={{
            width: 60,
            height: 22,
            borderRadius: 4,
            background: ui.progressBg,
            animation: "cdrrPulse 1.2s ease-in-out infinite",
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              color: ui.textPrimary,
              lineHeight: 1,
            }}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          {change !== null && (
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: up ? "#36a420" : "#e02020",
              }}
            >
              {up ? "↑" : "↓"} {Math.abs(change)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Card({ children, style = {}, ui }) {
  return (
    <div
      style={{
        background: ui.cardBg,
        border: `1px solid ${ui.cardBorder}`,
        borderRadius: 8,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, sub, right, ui }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "14px 16px 10px",
      }}
    >
      <div>
        <h2
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: ui.textPrimary,
            margin: 0,
          }}
        >
          {title}
        </h2>
        {sub && (
          <p
            style={{
              fontSize: "0.8rem",
              color: ui.textSub,
              margin: 0,
              marginTop: 2,
            }}
          >
            {sub}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

const SeeAll = () => (
  <button
    style={{
      background: "none",
      border: "none",
      color: FB,
      fontSize: "0.84rem",
      fontWeight: 600,
      cursor: "pointer",
      padding: 0,
      whiteSpace: "nowrap",
    }}
  >
    See all
  </button>
);

function fmtLocal(d) {
  const y = d.getFullYear(),
    m = String(d.getMonth() + 1).padStart(2, "0"),
    day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function getWorkingWeek() {
  const today = new Date("2026-03-11T00:00:00"),
    dow = today.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(today);
  mon.setDate(today.getDate() + diffToMon);
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  return { start: fmtLocal(mon), end: fmtLocal(fri) };
}
function getWorkingDayLabels() {
  const week = getWorkingWeek(),
    dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"],
    result = [];
  for (let i = 0; i < 5; i++) {
    const [yr, mo, da] = week.start.split("-").map(Number);
    const d = new Date(yr, mo - 1, da + i);
    result.push({
      dayLabel: dayNames[i],
      dateNum: d.getDate(),
      monthLabel: d.toLocaleDateString("en-PH", { month: "short" }),
      dateStr: fmtLocal(d),
    });
  }
  return result;
}
function workingDaysLeft(endDateStr) {
  const TODAY_STR = "2026-03-11";
  const [ey, em, ed] = endDateStr.split("-").map(Number),
    [ty, tm, td] = TODAY_STR.split("-").map(Number);
  const end = new Date(ey, em - 1, ed),
    cur = new Date(ty, tm - 1, td);
  let count = 0;
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function TargetsPanel({ ui, onSelectTarget }) {
  const week = getWorkingWeek(),
    workingDays = getWorkingDayLabels(),
    TODAY_STR = "2026-03-11",
    targets = TARGETS_WEEKLY;
  const totalDone = targets.reduce((s, t) => s + t.done, 0),
    totalGoal = targets.reduce((s, t) => s + t.goal, 0);
  const pct = Math.round((totalDone / totalGoal) * 100),
    wdLeft = workingDaysLeft(week.end);
  const weekLabel = `${workingDays[0].monthLabel} ${workingDays[0].dateNum} – ${workingDays[4].monthLabel} ${workingDays[4].dateNum}, 2026`;
  return (
    <Card ui={ui}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 10px",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: ui.textPrimary,
              margin: 0,
            }}
          >
            Weekly Targets
          </h3>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "0.72rem",
              color: ui.textMuted,
            }}
          >
            Working days only · Mon–Fri
          </p>
        </div>
        <SeeAll />
      </div>
      <div style={{ padding: "0 16px 12px" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
          {workingDays.map((wd) => {
            const isPast = wd.dateStr < TODAY_STR,
              isToday = wd.dateStr === TODAY_STR;
            return (
              <div
                key={wd.dateStr}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "7px 2px 6px",
                  borderRadius: 8,
                  background: isToday ? FB : isPast ? `${FB}14` : ui.inputBg,
                  border: `1.5px solid ${isToday ? FB : isPast ? `${FB}35` : ui.cardBorder}`,
                  position: "relative",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.58rem",
                    fontWeight: 700,
                    color: isToday ? "rgba(255,255,255,0.75)" : ui.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {wd.dayLabel}
                </p>
                <p
                  style={{
                    margin: "2px 0 1px",
                    fontSize: "0.88rem",
                    fontWeight: 800,
                    color: isToday ? "#fff" : isPast ? FB : ui.textPrimary,
                    lineHeight: 1,
                  }}
                >
                  {wd.dateNum}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.56rem",
                    color: isToday ? "rgba(255,255,255,0.7)" : ui.textMuted,
                    lineHeight: 1,
                  }}
                >
                  {wd.monthLabel}
                </p>
                {isPast && (
                  <span
                    style={{
                      position: "absolute",
                      top: 3,
                      right: 4,
                      fontSize: "0.6rem",
                      color: "#36a420",
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </span>
                )}
                {isToday && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: -1,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "#fff",
                      opacity: 0.8,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            borderRadius: 7,
            background: `${FB}10`,
            border: `1px solid ${FB}28`,
          }}
        >
          <span style={{ fontSize: "0.78rem" }}>📅</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: "0.76rem",
                fontWeight: 600,
                color: FB,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {weekLabel}
            </p>
            <p style={{ margin: 0, fontSize: "0.69rem", color: ui.textMuted }}>
              {wdLeft} working day{wdLeft !== 1 ? "s" : ""} left this week
            </p>
          </div>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: 800,
                color: FB,
                lineHeight: 1,
              }}
            >
              {wdLeft}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "0.56rem",
                color: ui.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              days
            </p>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.74rem",
              color: ui.textMuted,
              marginBottom: 5,
            }}
          >
            <span>{pct}% overall completed</span>
            <span
              style={{ fontWeight: 700, color: pct === 100 ? "#36a420" : FB }}
            >
              {totalDone}/{totalGoal} tasks
            </span>
          </div>
          <div
            style={{
              height: 5,
              borderRadius: 99,
              background: ui.progressBg,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                borderRadius: 99,
                background: pct === 100 ? "#36a420" : FB,
                transition: "width 0.4s",
              }}
            />
          </div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${ui.divider}` }}>
        {targets.map((t) => {
          const tp = Math.round((t.done / t.goal) * 100);
          return (
            <div
              key={t.id}
              onClick={() => onSelectTarget(t)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                cursor: "pointer",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = ui.hoverBg)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <span style={{ fontSize: "1.05rem", flexShrink: 0 }}>
                  {t.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.83rem",
                      color: ui.textPrimary,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.label}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 3,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 99,
                        background: ui.progressBg,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${tp}%`,
                          borderRadius: 99,
                          background: tp === 100 ? "#36a420" : FB,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: ui.textMuted,
                        flexShrink: 0,
                      }}
                    >
                      {t.done}/{t.goal}
                    </span>
                  </div>
                </div>
              </div>
              <span style={{ color: ui.textMuted, marginLeft: 8 }}>›</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function AccomplishmentReport({
  onClose,
  totals,
  ui,
  reportPeriodKey,
  customDates,
}) {
  const isCustom = reportPeriodKey === "custom";
  const period = isCustom ? null : TARGET_PERIODS[reportPeriodKey];
  const targets = isCustom
    ? resolveTargetsForRange(customDates?.start, customDates?.end)
    : period.data;
  const customRangeLabel = isCustom
    ? formatDateRange(customDates?.start, customDates?.end)
    : "";
  const displayPeriod = isCustom ? customRangeLabel : period.reportPeriod;
  const periodLabel = isCustom ? "Custom Period" : period.label;
  const daysLeftVal = isCustom ? daysUntil(customDates?.end) : period.daysLeft;
  const totalDone = targets.reduce((s, t) => s + t.done, 0),
    totalGoal = targets.reduce((s, t) => s + t.goal, 0);
  const overallPct = Math.round((totalDone / totalGoal) * 100);
  const completedRate =
    totals.received > 0
      ? ((totals.completed / totals.received) * 100).toFixed(1)
      : "0.0";
  const handlePrint = () => window.print();
  const rangeLabel = isCustom
    ? (() => {
        const diffDays =
          customDates?.start && customDates?.end
            ? Math.round(
                (new Date(customDates.end + "T00:00:00") -
                  new Date(customDates.start + "T00:00:00")) /
                  86400000,
              )
            : 0;
        if (diffDays <= 9) return "Weekly Targets";
        const s = new Date((customDates?.start || "") + "T00:00:00"),
          e = new Date((customDates?.end || "") + "T00:00:00");
        if (s.getDate() <= 5 && e.getDate() <= 16) return "Mar 1–15 Targets";
        if (s.getDate() >= 14 && e.getDate() >= 20) return "Mar 16–30 Targets";
        if (diffDays >= 20) return "Monthly Targets";
        return "Weekly Targets";
      })()
    : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 12,
          width: "100%",
          maxWidth: 620,
          boxShadow: "0 12px 48px rgba(0,0,0,0.25)",
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              📋 Accomplishment Report
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "0.76rem",
                color: ui.textSub,
                marginTop: 2,
              }}
            >
              {displayPeriod} · CDRR System
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handlePrint}
              style={{
                padding: "6px 14px",
                borderRadius: 7,
                border: `1.5px solid ${FB}`,
                background: "transparent",
                color: FB,
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: ui.textMuted,
                fontSize: "1.2rem",
                lineHeight: 1,
                padding: 4,
              }}
            >
              ✕
            </button>
          </div>
        </div>
        <div style={{ overflowY: "auto", padding: "20px" }}>
          <div
            style={{
              textAlign: "center",
              padding: "16px",
              borderRadius: 10,
              background: ui.pageBg,
              border: `1px solid ${ui.cardBorder}`,
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: 6 }}>🏢</div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: 800,
                color: ui.textPrimary,
              }}
            >
              CDRR – Accomplishment Report
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: ui.textSub,
                marginTop: 4,
              }}
            >
              {displayPeriod} &nbsp;|&nbsp; Generated: March 11, 2026
            </p>
          </div>
          <h4
            style={{
              margin: "0 0 10px",
              fontSize: "0.82rem",
              fontWeight: 700,
              color: ui.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Application Summary
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 10,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: "Total Received",
                value: totals.received,
                color: "#1877F2",
                icon: "📥",
              },
              {
                label: "Completed",
                value: totals.completed,
                color: "#36a420",
                icon: "✅",
              },
              {
                label: "On Process",
                value: totals.onProcess,
                color: "#f59e0b",
                icon: "⏳",
              },
              {
                label: "Completed Rate",
                value: `${completedRate}%`,
                color: "#9333ea",
                icon: "📈",
              },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  textAlign: "center",
                  padding: "10px 6px",
                  borderRadius: 8,
                  border: `1px solid ${ui.cardBorder}`,
                  background: ui.cardBg,
                }}
              >
                <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>
                  {s.icon}
                </div>
                <div
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: s.color,
                    lineHeight: 1,
                  }}
                >
                  {typeof s.value === "number"
                    ? s.value.toLocaleString()
                    : s.value}
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: ui.textSub,
                    marginTop: 3,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          <h4
            style={{
              margin: "0 0 10px",
              fontSize: "0.82rem",
              fontWeight: 700,
              color: ui.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {isCustom
              ? `${rangeLabel || "Period"} Progress`
              : `${periodLabel} Targets Progress`}
          </h4>
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              background: ui.pageBg,
              border: `1px solid ${ui.cardBorder}`,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8rem",
                marginBottom: 6,
              }}
            >
              <span style={{ fontWeight: 600, color: ui.textPrimary }}>
                Overall Completion
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: overallPct === 100 ? "#36a420" : FB,
                }}
              >
                {totalDone}/{totalGoal} tasks · {overallPct}%
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 99,
                background: ui.progressBg,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${overallPct}%`,
                  borderRadius: 99,
                  background: overallPct === 100 ? "#36a420" : FB,
                  transition: "width 0.4s",
                }}
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 20,
            }}
          >
            {targets.map((t) => {
              const tp = Math.round((t.done / t.goal) * 100);
              const statusColor =
                tp === 100
                  ? "#36a420"
                  : tp >= 50
                    ? "#f59e0b"
                    : tp > 0
                      ? "#e02020"
                      : "#8a8d91";
              const statusLabel =
                tp === 100
                  ? "Completed"
                  : tp >= 50
                    ? "In Progress"
                    : tp > 0
                      ? "Behind"
                      : "Not Started";
              return (
                <div
                  key={t.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: `1px solid ${ui.cardBorder}`,
                    background: ui.cardBg,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span style={{ fontSize: "1rem" }}>{t.icon}</span>
                      <span
                        style={{
                          fontSize: "0.84rem",
                          fontWeight: 600,
                          color: ui.textPrimary,
                        }}
                      >
                        {t.label}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: statusColor,
                        background: `${statusColor}18`,
                        padding: "2px 8px",
                        borderRadius: 99,
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        flex: 1,
                        height: 5,
                        borderRadius: 99,
                        background: ui.progressBg,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${tp}%`,
                          borderRadius: 99,
                          background: statusColor,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: ui.textMuted,
                        flexShrink: 0,
                      }}
                    >
                      {t.done}/{t.goal} ({tp}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <h4
            style={{
              margin: "0 0 8px",
              fontSize: "0.82rem",
              fontWeight: 700,
              color: ui.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Remarks
          </h4>
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              border: `1px solid ${ui.cardBorder}`,
              background: ui.pageBg,
              fontSize: "0.82rem",
              color: ui.textSub,
              lineHeight: 1.7,
            }}
          >
            The CDRR system recorded a total of{" "}
            <strong style={{ color: ui.textPrimary }}>
              {totals.received.toLocaleString()}
            </strong>{" "}
            applications received for the period of{" "}
            <strong style={{ color: ui.textPrimary }}>{displayPeriod}</strong>.
            Of these,{" "}
            <strong style={{ color: "#36a420" }}>{totals.completed}</strong>{" "}
            were completed and{" "}
            <strong style={{ color: "#f59e0b" }}>{totals.onProcess}</strong> are
            currently on process, achieving a completed rate of{" "}
            <strong style={{ color: "#9333ea" }}>{completedRate}%</strong>.{" "}
            {isCustom ? `${rangeLabel || "Period"}` : periodLabel} targets are
            at{" "}
            <strong style={{ color: overallPct >= 50 ? "#f59e0b" : "#e02020" }}>
              {overallPct}% completion
            </strong>
            {daysLeftVal !== null ? (
              <>
                {" "}
                with{" "}
                <strong style={{ color: ui.textPrimary }}>
                  {daysLeftVal} day{daysLeftVal !== 1 ? "s" : ""}
                </strong>{" "}
                remaining
              </>
            ) : (
              ""
            )}
            .
          </div>
        </div>
        <div
          style={{
            padding: "12px 20px",
            borderTop: `1px solid ${ui.divider}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: `1px solid ${ui.cardBorder}`,
              background: "transparent",
              color: ui.textSub,
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: FB,
              color: "#fff",
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🖨️ Print Report
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function DashboardPage({
  darkMode: darkModeProp,
  onToggleDark,
}) {
  const [internalDark, setInternalDark] = useState(true);
  const darkMode = darkModeProp !== undefined ? darkModeProp : internalDark;
  const ui = useMemo(() => makeUI(darkMode), [darkMode]);

  const [breakdown, setBreakdown] = useState("day");
  const [selYear, setSelYear] = useState("2026");
  const [selMonth, setSelMonth] = useState("Mar");
  const [activeMetric, setActiveMetric] = useState(0);
  const [activeTarget, setActiveTarget] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [reportPeriodKey, setReportPeriodKey] = useState("weekly");
  const [customReportDates, setCustomReportDates] = useState(null);
  const [tablePage, setTablePage] = useState(0);
  const TABLE_PAGE_SIZE = 13;

  const [liveStats, setLiveStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const params = buildDateParams(breakdown, selYear, selMonth);
      const data = await getDashboardSummary(params);
      setLiveStats(data);
    } catch (err) {
      setStatsError(
        err?.response?.data?.detail || err.message || "Failed to load stats",
      );
      setLiveStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [breakdown, selYear, selMonth]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const { chartData, chartSubtitle } = useMemo(() => {
    if (breakdown === "year")
      return { chartData: DATA_ALL_YEARS, chartSubtitle: "All Years" };
    if (breakdown === "month") {
      if (selYear === "All") {
        const combined = {};
        Object.values(DATA_MONTHLY_BY_YEAR).forEach((months) => {
          months.forEach((m) => {
            if (!combined[m.label])
              combined[m.label] = {
                label: m.label,
                received: 0,
                completed: 0,
                onProcess: 0,
                target: 0,
              };
            combined[m.label].received += m.received;
            combined[m.label].completed += m.completed;
            combined[m.label].onProcess += m.onProcess;
            combined[m.label].target += m.target || 0;
          });
        });
        const order = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        return {
          chartData: order.map(
            (l) =>
              combined[l] || {
                label: l,
                received: 0,
                completed: 0,
                onProcess: 0,
                target: 0,
              },
          ),
          chartSubtitle: "All Years Combined",
        };
      }
      return {
        chartData: DATA_MONTHLY_BY_YEAR[selYear] || [],
        chartSubtitle: selYear,
      };
    }
    const key = `${selYear}-${MONTH_NUM[selMonth]}`;
    const data =
      DATA_DAILY_BY_MONTH[key] ||
      generateDailyData(selYear, MONTH_IDX[selMonth], MONTH_DAYS[selMonth]);
    return { chartData: data, chartSubtitle: `${selMonth} ${selYear}` };
  }, [breakdown, selYear, selMonth]);

  useEffect(() => {
    setTablePage(0);
  }, [chartData]);

  const totals = useMemo(
    () => ({
      received: chartData.reduce((s, r) => s + r.received, 0),
      completed: chartData.reduce((s, r) => s + r.completed, 0),
      onProcess: chartData.reduce((s, r) => s + r.onProcess, 0),
      target: chartData.reduce((s, r) => s + (r.target || 0), 0),
    }),
    [chartData],
  );

  const completedRate =
    totals.received > 0
      ? ((totals.completed / totals.received) * 100).toFixed(1)
      : "0.0";

  const metrics = [
    {
      icon: "👁️",
      label: "Total Received",
      value: liveStats ? liveStats.received : totals.received,
      change: 8,
      key: "received",
      isLive: true,
    },
    {
      icon: "✅",
      label: "Completed",
      value: liveStats ? liveStats.completed : totals.completed,
      change: -3,
      key: "completed",
      isLive: true,
    },
    {
      icon: "⏳",
      label: "On Process",
      value: liveStats ? liveStats.on_process : totals.onProcess,
      change: 12,
      key: "onProcess",
      isLive: true,
    },
    {
      icon: "🎯",
      label: "Target",
      value: totals.target,
      change: 0,
      key: "target",
      isLive: false,
    },
  ];

  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const handleShowReport = (periodKey, customDates) => {
    setReportPeriodKey(periodKey);
    setCustomReportDates(customDates || null);
    setShowReport(true);
  };

  const [dbConnections, setDbConnections] = useState([
    {
      id: "doctrack",
      label: "Doctrack",
      desc: "Document Tracking DB",
      icon: "🗂️",
      active: true,
    },
    {
      id: "aws",
      label: "AWS",
      desc: "Cloud Storage & Services",
      icon: "☁️",
      active: true,
    },
    {
      id: "maindb",
      label: "Main DB",
      desc: "Primary Application DB",
      icon: "🗄️",
      active: true,
    },
  ]);
  const toggleConn = (id) =>
    setDbConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
    );
  const allActive = dbConnections.every((c) => c.active),
    someInactive = dbConnections.some((c) => !c.active);

  const [reportStart, setReportStart] = useState(getWorkingWeek().start);
  const [reportEnd, setReportEnd] = useState(getWorkingWeek().end);
  const [reportDateErr, setReportDateErr] = useState("");
  const handleReportStartChange = (v) => {
    setReportStart(v);
    setReportDateErr(
      reportEnd && v > reportEnd ? "Start must be before end date." : "",
    );
  };
  const handleReportEndChange = (v) => {
    setReportEnd(v);
    setReportDateErr(
      reportStart && v < reportStart ? "End must be after start date." : "",
    );
  };
  const canGenReport = !reportDateErr && reportStart && reportEnd;
  const inputSt2 = {
    width: "100%",
    padding: "7px 10px",
    borderRadius: 7,
    border: `1.5px solid ${ui.metricBorder}`,
    background: ui.inputBg,
    color: ui.textPrimary,
    fontSize: "0.8rem",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    cursor: "pointer",
  };

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    const id = "cdrr-style";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = `
        .cdrr-scroll::-webkit-scrollbar{width:7px}
        .cdrr-scroll::-webkit-scrollbar-track{background:transparent}
        .cdrr-scroll::-webkit-scrollbar-thumb{background:#3a3b3c;border-radius:99px}
        .cdrr-scroll::-webkit-scrollbar-thumb:hover{background:#555}
        .cdrr-scroll{scrollbar-width:thin;scrollbar-color:#3a3b3c transparent}
        @keyframes cdrrPulse{0%,100%{opacity:1}50%{opacity:0.4}}
      `;
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);

  const RightPanel = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card ui={ui}>
        <div
          style={{
            padding: "14px 16px 10px",
            borderBottom: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "0.95rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              System Status
            </h3>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "0.72rem",
                color: allActive
                  ? "#36a420"
                  : someInactive
                    ? "#f59e0b"
                    : "#e02020",
              }}
            >
              {allActive
                ? "● All systems operational"
                : someInactive
                  ? "● Some connections inactive"
                  : "● Systems offline"}
            </p>
          </div>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: allActive
                ? "#36a420"
                : someInactive
                  ? "#f59e0b"
                  : "#e02020",
              boxShadow: `0 0 0 3px ${allActive ? "#36a42022" : someInactive ? "#f59e0b22" : "#e0202022"}`,
              flexShrink: 0,
            }}
          />
        </div>
        <div
          style={{
            padding: "10px 16px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {dbConnections.map((conn) => (
            <div
              key={conn.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${conn.active ? "#36a42030" : "#e0202030"}`,
                background: conn.active ? "#36a42008" : "#e0202008",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: conn.active ? "#36a42018" : "#e0202018",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  flexShrink: 0,
                }}
              >
                {conn.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.84rem",
                    fontWeight: 700,
                    color: ui.textPrimary,
                  }}
                >
                  {conn.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.71rem",
                    color: ui.textMuted,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {conn.desc}
                </p>
              </div>
              <button
                onClick={() => toggleConn(conn.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 99,
                  border: `1.5px solid ${conn.active ? "#36a42050" : "#e0202050"}`,
                  background: conn.active ? "#36a42015" : "#e0202015",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.15s",
                  fontFamily: "inherit",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: conn.active ? "#36a420" : "#e02020",
                    display: "inline-block",
                    flexShrink: 0,
                    boxShadow: conn.active ? "0 0 0 2px #36a42030" : "none",
                  }}
                />
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: conn.active ? "#36a420" : "#e02020",
                    whiteSpace: "nowrap",
                  }}
                >
                  {conn.active ? "Active" : "Inactive"}
                </span>
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card ui={ui}>
        <div style={{ padding: "14px 16px 10px" }}>
          <h3
            style={{
              margin: 0,
              fontSize: "0.95rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            Accomplishment Report
          </h3>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "0.72rem",
              color: ui.textMuted,
            }}
          >
            Select a date range to generate
          </p>
        </div>
        <div
          style={{
            padding: "0 16px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: ui.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                From
              </p>
              <input
                type="date"
                value={reportStart}
                max={reportEnd || "2099-12-31"}
                onChange={(e) => handleReportStartChange(e.target.value)}
                style={inputSt2}
              />
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: ui.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                To
              </p>
              <input
                type="date"
                value={reportEnd}
                min={reportStart || "2020-01-01"}
                onChange={(e) => handleReportEndChange(e.target.value)}
                style={inputSt2}
              />
            </div>
          </div>
          {reportDateErr && (
            <p style={{ margin: 0, fontSize: "0.73rem", color: "#e02020" }}>
              ⚠ {reportDateErr}
            </p>
          )}
          {reportStart && reportEnd && !reportDateErr && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 7,
                background: `${FB}10`,
                border: `1px solid ${FB}28`,
              }}
            >
              <span style={{ fontSize: "0.75rem" }}>📆</span>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: FB,
                }}
              >
                {formatDateRange(reportStart, reportEnd)}
              </p>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "0.69rem",
                  color: ui.textMuted,
                  flexShrink: 0,
                }}
              >
                {daysBetween(reportStart, reportEnd)}d
              </span>
            </div>
          )}
          <button
            onClick={() =>
              canGenReport &&
              handleShowReport("custom", { start: reportStart, end: reportEnd })
            }
            disabled={!canGenReport}
            style={{
              width: "100%",
              padding: "9px 0",
              borderRadius: 8,
              border: `1.5px solid ${canGenReport ? FB : ui.metricBorder}`,
              background: canGenReport ? FB : "transparent",
              color: canGenReport ? "#fff" : ui.textMuted,
              fontSize: "0.84rem",
              fontWeight: 700,
              cursor: canGenReport ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 0.15s",
              opacity: canGenReport ? 1 : 0.5,
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              if (canGenReport) e.currentTarget.style.background = "#1565d8";
            }}
            onMouseLeave={(e) => {
              if (canGenReport) e.currentTarget.style.background = FB;
            }}
          >
            📋 Generate Report
          </button>
        </div>
      </Card>

      <TargetsPanel ui={ui} onSelectTarget={setActiveTarget} />

      <Card ui={ui}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px 6px",
            borderBottom: `1px solid ${ui.divider}`,
          }}
        >
          <h3
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: ui.textPrimary,
              margin: 0,
            }}
          >
            Next steps
          </h3>
          <SeeAll />
        </div>
        {[
          {
            icon: "📈",
            title: "Completion volume increased",
            sub: "Completed count up 12% this week",
          },
          {
            icon: "⏰",
            title: "3 apps nearing deadline",
            sub: "Review before end of day",
          },
          {
            icon: "🚩",
            title: "2 backlogs flagged",
            sub: "Requires immediate attention",
          },
        ].map((item, i, arr) => (
          <div
            key={i}
            style={{
              padding: "10px 16px",
              borderBottom:
                i < arr.length - 1 ? `1px solid ${ui.divider}` : "none",
              cursor: "pointer",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = ui.hoverBg)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 2,
              }}
            >
              <span style={{ fontSize: "1rem" }}>{item.icon}</span>
              <span
                style={{
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  color: ui.textPrimary,
                }}
              >
                {item.title}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "0.77rem",
                color: ui.textSub,
                paddingLeft: 26,
              }}
            >
              {item.sub}
            </p>
          </div>
        ))}
      </Card>
    </div>
  );

  return (
    <>
      {statsError && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 9999,
            background: "#e02020",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: "0.8rem",
            fontWeight: 600,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            maxWidth: 320,
          }}
        >
          <span>⚠️</span>
          <span>Stats API error: {statsError}</span>
          <button
            onClick={fetchStats}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              padding: "3px 10px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: "0.76rem",
              fontWeight: 700,
              fontFamily: "inherit",
            }}
          >
            Retry
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          fontFamily: font,
        }}
      >
        <div
          className="cdrr-scroll"
          style={{
            display: "flex",
            flex: "1 1 0",
            minHeight: 0,
            overflowY: "scroll",
            overflowX: "hidden",
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: isMobile ? "12px" : "16px",
              paddingBottom: 120,
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 290px",
              gap: 16,
              alignItems: "start",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card ui={ui}>
                <div style={{ padding: "14px 16px 0" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 12,
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          color: ui.textPrimary,
                          margin: 0,
                        }}
                      >
                        Insights
                      </h2>
                      <p
                        style={{
                          fontSize: "0.8rem",
                          color: ui.textSub,
                          margin: 0,
                          marginTop: 2,
                        }}
                      >
                        Learn how your applications are performing.
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          padding: "3px",
                          borderRadius: 8,
                          background: ui.inputBg,
                          border: `1px solid ${ui.cardBorder}`,
                        }}
                      >
                        {[
                          { key: "day", label: "Daily" },
                          { key: "month", label: "Monthly" },
                          { key: "year", label: "Yearly" },
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            onClick={() => setBreakdown(opt.key)}
                            style={{
                              padding: "4px 11px",
                              borderRadius: 6,
                              border: "none",
                              background:
                                breakdown === opt.key ? FB : "transparent",
                              color:
                                breakdown === opt.key ? "#fff" : ui.textSub,
                              fontSize: "0.76rem",
                              fontWeight: breakdown === opt.key ? 700 : 500,
                              cursor: "pointer",
                              transition: "all 0.15s",
                              fontFamily: "inherit",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {(breakdown === "day" || breakdown === "month") && (
                        <select
                          value={selYear}
                          onChange={(e) => {
                            setSelYear(e.target.value);
                            if (
                              breakdown === "day" &&
                              e.target.value !== "All"
                            ) {
                              const months =
                                MONTHS_BY_YEAR[e.target.value] || [];
                              if (!months.includes(selMonth))
                                setSelMonth(months[months.length - 1] || "Jan");
                            }
                          }}
                          style={{
                            padding: "4px 24px 4px 10px",
                            borderRadius: 7,
                            border: `1px solid ${ui.cardBorder}`,
                            background: ui.inputBg,
                            color: ui.textPrimary,
                            fontSize: "0.76rem",
                            fontFamily: "inherit",
                            outline: "none",
                            cursor: "pointer",
                            appearance: "none",
                            WebkitAppearance: "none",
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%2365676b' d='M5 7L0 2h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 8px center",
                          }}
                        >
                          {breakdown === "month" && (
                            <option value="All">All Years</option>
                          )}
                          {AVAILABLE_YEARS.filter((y) => y !== "All").map(
                            (y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ),
                          )}
                        </select>
                      )}
                      {breakdown === "day" && selYear !== "All" && (
                        <select
                          value={selMonth}
                          onChange={(e) => setSelMonth(e.target.value)}
                          style={{
                            padding: "4px 24px 4px 10px",
                            borderRadius: 7,
                            border: `1px solid ${ui.cardBorder}`,
                            background: ui.inputBg,
                            color: ui.textPrimary,
                            fontSize: "0.76rem",
                            fontFamily: "inherit",
                            outline: "none",
                            cursor: "pointer",
                            appearance: "none",
                            WebkitAppearance: "none",
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%2365676b' d='M5 7L0 2h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 8px center",
                          }}
                        >
                          {(MONTHS_BY_YEAR[selYear] || []).map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      )}
                      <SeeAll />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: isMobile ? 6 : 10,
                      marginBottom: 14,
                    }}
                  >
                    {metrics.map((m, i) => (
                      <MetricTile
                        key={i}
                        icon={m.icon}
                        label={m.label}
                        value={m.value}
                        change={m.change}
                        active={activeMetric === i}
                        onClick={() => setActiveMetric(i)}
                        ui={ui}
                        loading={m.isLive ? statsLoading : false}
                        isLive={m.isLive}
                      />
                    ))}
                  </div>
                </div>
                <div style={{ padding: "0 16px 12px" }}>
                  <AreaChart
                    data={chartData}
                    subtitle={chartSubtitle}
                    ui={ui}
                  />
                </div>

                {(() => {
                  const totalPages = Math.ceil(
                    chartData.length / TABLE_PAGE_SIZE,
                  );
                  const safePage = Math.min(
                    tablePage,
                    Math.max(0, totalPages - 1),
                  );
                  const pagedRows = chartData.slice(
                    safePage * TABLE_PAGE_SIZE,
                    safePage * TABLE_PAGE_SIZE + TABLE_PAGE_SIZE,
                  );
                  const unitLabel =
                    breakdown === "day"
                      ? "day"
                      : breakdown === "month"
                        ? "month"
                        : "year";
                  const startRow = safePage * TABLE_PAGE_SIZE + 1,
                    endRow = Math.min(
                      startRow + TABLE_PAGE_SIZE - 1,
                      chartData.length,
                    );
                  return (
                    <div
                      style={{
                        borderTop: `1px solid ${ui.divider}`,
                        padding: "0 16px 16px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 0 8px",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: ui.textPrimary,
                          }}
                        >
                          Data Table{" "}
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: "0.72rem",
                              fontWeight: 400,
                              color: ui.textMuted,
                            }}
                          >
                            📅 {chartSubtitle}
                          </span>
                        </p>
                        <span
                          style={{ fontSize: "0.72rem", color: ui.textMuted }}
                        >
                          {startRow}–{endRow} of {chartData.length} {unitLabel}
                          {chartData.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div
                        style={{
                          overflowX: "auto",
                          borderRadius: 8,
                          border: `1px solid ${ui.cardBorder}`,
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "0.8rem",
                            fontFamily: "inherit",
                          }}
                        >
                          <thead>
                            <tr style={{ background: ui.pageBg }}>
                              {[
                                {
                                  label:
                                    breakdown === "day"
                                      ? "Day"
                                      : breakdown === "month"
                                        ? "Month"
                                        : "Year",
                                  align: "left",
                                },
                                {
                                  label: "Total Received",
                                  align: "right",
                                  color: "#1877F2",
                                },
                                {
                                  label: "Completed",
                                  align: "right",
                                  color: "#36a420",
                                },
                                {
                                  label: "On Process",
                                  align: "right",
                                  color: "#f59e0b",
                                },
                                {
                                  label: "Target",
                                  align: "right",
                                  color: "#9333ea",
                                },
                                {
                                  label: "Completed Rate",
                                  align: "right",
                                  color: "#9333ea",
                                },
                              ].map((col, ci) => (
                                <th
                                  key={ci}
                                  style={{
                                    padding: "8px 12px",
                                    textAlign: col.align,
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    color: col.color || ui.textMuted,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                    borderBottom: `1px solid ${ui.cardBorder}`,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {col.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {pagedRows.map((row, ri) => {
                              const rate =
                                row.received > 0
                                  ? (
                                      (row.completed / row.received) *
                                      100
                                    ).toFixed(1)
                                  : "—";
                              const rateN =
                                row.received > 0 ? parseFloat(rate) : null;
                              const isEven = ri % 2 === 0,
                                isLast = ri === pagedRows.length - 1;
                              const border = !isLast
                                ? `1px solid ${ui.divider}`
                                : "none";
                              return (
                                <tr
                                  key={ri}
                                  style={{
                                    background: isEven
                                      ? "transparent"
                                      : `${ui.pageBg}88`,
                                    transition: "background 0.1s",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                      ui.hoverBg)
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = isEven
                                      ? "transparent"
                                      : `${ui.pageBg}88`)
                                  }
                                >
                                  <td
                                    style={{
                                      padding: "7px 12px",
                                      color: ui.textPrimary,
                                      fontWeight: 600,
                                      borderBottom: border,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {row.label}
                                    {breakdown === "day" && (
                                      <span
                                        style={{
                                          marginLeft: 4,
                                          fontSize: "0.68rem",
                                          color: ui.textMuted,
                                          fontWeight: 400,
                                        }}
                                      >
                                        {chartSubtitle?.split(" ")[0]}
                                      </span>
                                    )}
                                  </td>
                                  <td
                                    style={{
                                      padding: "7px 12px",
                                      textAlign: "right",
                                      color: "#1877F2",
                                      fontWeight: 700,
                                      borderBottom: border,
                                    }}
                                  >
                                    {row.received.toLocaleString()}
                                  </td>
                                  <td
                                    style={{
                                      padding: "7px 12px",
                                      textAlign: "right",
                                      color: "#36a420",
                                      fontWeight: 700,
                                      borderBottom: border,
                                    }}
                                  >
                                    {row.completed.toLocaleString()}
                                  </td>
                                  <td
                                    style={{
                                      padding: "7px 12px",
                                      textAlign: "right",
                                      color: "#f59e0b",
                                      fontWeight: 700,
                                      borderBottom: border,
                                    }}
                                  >
                                    {row.onProcess.toLocaleString()}
                                  </td>
                                  <td
                                    style={{
                                      padding: "7px 12px",
                                      textAlign: "right",
                                      color: "#9333ea",
                                      fontWeight: 700,
                                      borderBottom: border,
                                    }}
                                  >
                                    {(row.target || 0) > 0
                                      ? (row.target || 0).toLocaleString()
                                      : "—"}
                                  </td>
                                  <td
                                    style={{
                                      padding: "7px 12px",
                                      textAlign: "right",
                                      borderBottom: border,
                                    }}
                                  >
                                    {rateN !== null ? (
                                      <span
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 3,
                                          fontSize: "0.73rem",
                                          fontWeight: 700,
                                          color:
                                            rateN >= 75
                                              ? "#36a420"
                                              : rateN >= 50
                                                ? "#f59e0b"
                                                : "#e02020",
                                          background:
                                            rateN >= 75
                                              ? "#e9f7e6"
                                              : rateN >= 50
                                                ? "#fff8e7"
                                                : "#fde8e8",
                                          padding: "2px 8px",
                                          borderRadius: 99,
                                        }}
                                      >
                                        {rateN >= 75
                                          ? "▲"
                                          : rateN >= 50
                                            ? "~"
                                            : "▼"}{" "}
                                        {rate}%
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          color: ui.textMuted,
                                          fontSize: "0.73rem",
                                        }}
                                      >
                                        —
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr
                              style={{
                                background: ui.pageBg,
                                borderTop: `2px solid ${ui.cardBorder}`,
                              }}
                            >
                              <td
                                style={{
                                  padding: "8px 12px",
                                  fontWeight: 700,
                                  color: ui.textPrimary,
                                  fontSize: "0.78rem",
                                }}
                              >
                                Total
                              </td>
                              {[
                                { val: totals.received, color: "#1877F2" },
                                { val: totals.completed, color: "#36a420" },
                                { val: totals.onProcess, color: "#f59e0b" },
                                { val: totals.target, color: "#9333ea" },
                              ].map((col, ci) => (
                                <td
                                  key={ci}
                                  style={{
                                    padding: "8px 12px",
                                    textAlign: "right",
                                    fontWeight: 800,
                                    color: col.color,
                                    fontSize: "0.82rem",
                                  }}
                                >
                                  {col.val.toLocaleString()}
                                </td>
                              ))}
                              {(() => {
                                const n = parseFloat(completedRate);
                                return (
                                  <td
                                    style={{
                                      padding: "8px 12px",
                                      textAlign: "right",
                                    }}
                                  >
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 3,
                                        fontSize: "0.75rem",
                                        fontWeight: 800,
                                        color:
                                          n >= 75
                                            ? "#36a420"
                                            : n >= 50
                                              ? "#f59e0b"
                                              : "#e02020",
                                        background:
                                          n >= 75
                                            ? "#e9f7e6"
                                            : n >= 50
                                              ? "#fff8e7"
                                              : "#fde8e8",
                                        padding: "2px 8px",
                                        borderRadius: 99,
                                      }}
                                    >
                                      {n >= 75 ? "▲" : n >= 50 ? "~" : "▼"}{" "}
                                      {completedRate}%
                                    </span>
                                  </td>
                                );
                              })()}
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      {totalPages > 1 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginTop: 10,
                            gap: 8,
                          }}
                        >
                          <span
                            style={{ fontSize: "0.74rem", color: ui.textMuted }}
                          >
                            Page {safePage + 1} of {totalPages}
                          </span>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <button
                              onClick={() =>
                                setTablePage((p) => Math.max(0, p - 1))
                              }
                              disabled={safePage === 0}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: `1px solid ${safePage === 0 ? ui.cardBorder : ui.metricBorder}`,
                                background: "transparent",
                                color:
                                  safePage === 0
                                    ? ui.textMuted
                                    : ui.textPrimary,
                                fontSize: "0.76rem",
                                fontWeight: 600,
                                cursor:
                                  safePage === 0 ? "not-allowed" : "pointer",
                                opacity: safePage === 0 ? 0.4 : 1,
                                fontFamily: "inherit",
                              }}
                            >
                              ‹ Prev
                            </button>
                            {Array.from({ length: totalPages }, (_, pi) => {
                              const show =
                                pi === 0 ||
                                pi === totalPages - 1 ||
                                Math.abs(pi - safePage) <= 1;
                              const showEllipsisBefore =
                                  pi === safePage - 2 && pi > 1,
                                showEllipsisAfter =
                                  pi === safePage + 2 && pi < totalPages - 2;
                              if (
                                !show &&
                                !showEllipsisBefore &&
                                !showEllipsisAfter
                              )
                                return null;
                              if (showEllipsisBefore || showEllipsisAfter)
                                return (
                                  <span
                                    key={pi}
                                    style={{
                                      fontSize: "0.74rem",
                                      color: ui.textMuted,
                                      padding: "0 2px",
                                    }}
                                  >
                                    …
                                  </span>
                                );
                              const isActive = pi === safePage;
                              return (
                                <button
                                  key={pi}
                                  onClick={() => setTablePage(pi)}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 6,
                                    border: `1px solid ${isActive ? FB : ui.cardBorder}`,
                                    background: isActive ? FB : "transparent",
                                    color: isActive ? "#fff" : ui.textPrimary,
                                    fontSize: "0.76rem",
                                    fontWeight: isActive ? 700 : 500,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  {pi + 1}
                                </button>
                              );
                            })}
                            <button
                              onClick={() =>
                                setTablePage((p) =>
                                  Math.min(totalPages - 1, p + 1),
                                )
                              }
                              disabled={safePage === totalPages - 1}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: `1px solid ${safePage === totalPages - 1 ? ui.cardBorder : ui.metricBorder}`,
                                background: "transparent",
                                color:
                                  safePage === totalPages - 1
                                    ? ui.textMuted
                                    : ui.textPrimary,
                                fontSize: "0.76rem",
                                fontWeight: 600,
                                cursor:
                                  safePage === totalPages - 1
                                    ? "not-allowed"
                                    : "pointer",
                                opacity: safePage === totalPages - 1 ? 0.4 : 1,
                                fontFamily: "inherit",
                              }}
                            >
                              Next ›
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </Card>

              <Card ui={ui}>
                <div style={{ borderBottom: `1px solid ${ui.divider}` }}>
                  <CardHeader
                    title="Recent Applications"
                    sub="Access and manage your latest applications all in one place."
                    right={<SeeAll />}
                    ui={ui}
                  />
                </div>
                {[
                  {
                    id: "20230908133701",
                    type: "Furacef-750 (Cefuroxime Sodium)",
                    status: "Completed",
                    date: "Mar 10",
                    icon: "✅",
                    statusColor: "#36a420",
                    statusBg: "#e9f7e6",
                  },
                  {
                    id: "20230908133702",
                    type: "Amoxil-500 (Amoxicillin)",
                    status: "On Process",
                    date: "Mar 9",
                    icon: "⏳",
                    statusColor: "#f59e0b",
                    statusBg: "#fff8e7",
                  },
                  {
                    id: "20230908133703",
                    type: "Calpol-250 (Paracetamol)",
                    status: "Completed",
                    date: "Mar 8",
                    icon: "✅",
                    statusColor: "#36a420",
                    statusBg: "#e9f7e6",
                  },
                  {
                    id: "20230908133704",
                    type: "Cloxacil-250 (Cloxacillin)",
                    status: "On Process",
                    date: "Mar 7",
                    icon: "⏳",
                    statusColor: "#f59e0b",
                    statusBg: "#fff8e7",
                  },
                  {
                    id: "20230908133705",
                    type: "Augmentin-625 (Co-Amoxiclav)",
                    status: "Backlog",
                    date: "Mar 6",
                    icon: "🚩",
                    statusColor: "#e02020",
                    statusBg: "#fde8e8",
                  },
                ].map((row, i, arr) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "11px 16px",
                      borderBottom:
                        i < arr.length - 1 ? `1px solid ${ui.divider}` : "none",
                      transition: "background 0.12s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = ui.hoverBg)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          flexShrink: 0,
                          background: row.statusBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.1rem",
                        }}
                      >
                        {row.icon}
                      </div>
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.86rem",
                            fontWeight: 600,
                            color: ui.textPrimary,
                          }}
                        >
                          {row.id}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.78rem",
                            color: ui.textSub,
                          }}
                        >
                          {row.type}
                        </p>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: isMobile ? 6 : 12,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: row.statusColor,
                          background: row.statusBg,
                          padding: "3px 10px",
                          borderRadius: 99,
                        }}
                      >
                        {row.status}
                      </span>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          color: ui.textMuted,
                          minWidth: 40,
                          textAlign: "right",
                        }}
                      >
                        {row.date}
                      </span>
                    </div>
                  </div>
                ))}
              </Card>

              <Card ui={ui}>
                <div style={{ borderBottom: `1px solid ${ui.divider}` }}>
                  <CardHeader
                    title="Summary"
                    sub="Grand totals across all years."
                    right={<SeeAll />}
                    ui={ui}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    padding: "16px",
                    flexWrap: isMobile ? "wrap" : "nowrap",
                  }}
                >
                  {[
                    {
                      label: "Total Received",
                      value: ALL_TIME_TOTALS.received,
                      icon: "📥",
                      color: "#1877F2",
                    },
                    {
                      label: "Completed",
                      value: ALL_TIME_TOTALS.completed,
                      icon: "✅",
                      color: "#36a420",
                    },
                    {
                      label: "On Process",
                      value: ALL_TIME_TOTALS.onProcess,
                      icon: "⏳",
                      color: "#f59e0b",
                    },
                    {
                      label: "Completed Rate",
                      value: `${ALL_TIME_TOTALS.completedRate}%`,
                      icon: "📈",
                      color: "#9333ea",
                    },
                  ].map((s, i, arr) => (
                    <div
                      key={i}
                      style={{
                        flex: isMobile ? "1 1 50%" : 1,
                        textAlign: "center",
                        padding: isMobile ? "12px 6px" : "6px 0",
                        borderRight:
                          !isMobile && i < arr.length - 1
                            ? `1px solid ${ui.divider}`
                            : "none",
                        borderBottom:
                          isMobile && i < 2
                            ? `1px solid ${ui.divider}`
                            : "none",
                      }}
                    >
                      <div style={{ fontSize: "1.3rem", marginBottom: 4 }}>
                        {s.icon}
                      </div>
                      <div
                        style={{
                          fontSize: "1.35rem",
                          fontWeight: 700,
                          color: s.color,
                          lineHeight: 1,
                        }}
                      >
                        {typeof s.value === "number"
                          ? s.value.toLocaleString()
                          : s.value}
                      </div>
                      <div
                        style={{
                          fontSize: "0.73rem",
                          color: ui.textSub,
                          marginTop: 4,
                        }}
                      >
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {isMobile && <RightPanel />}
            </div>
            {!isMobile && <RightPanel />}
          </div>
        </div>
      </div>

      <TargetModal
        target={activeTarget}
        onClose={() => setActiveTarget(null)}
        ui={ui}
      />
      {showReport && (
        <AccomplishmentReport
          onClose={() => setShowReport(false)}
          totals={
            liveStats
              ? {
                  received: liveStats.received,
                  completed: liveStats.completed,
                  onProcess: liveStats.on_process,
                }
              : totals
          }
          ui={ui}
          reportPeriodKey={reportPeriodKey}
          customDates={customReportDates}
        />
      )}
    </>
  );
}
