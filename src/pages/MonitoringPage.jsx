// FILE: src/pages/MonitoringPage.jsx
import { useState, useMemo, useRef, useEffect } from "react";

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
        progressBg: "#3a3b3c",
        metricBorder: "#3a3b3c",
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
        progressBg: "#e4e6eb",
        metricBorder: "#dddfe2",
      };
}

// ── Static Data ───────────────────────────────────────────────────────────────
const evaluatorNames = [
  "Juan dela Cruz",
  "Maria Santos",
  "Pedro Reyes",
  "Ana Gonzales",
  "Jose Bautista",
  "Liza Reyes",
];

// Role map for each task-handling user
const USER_ROLE_MAP = {
  "Juan dela Cruz": "Evaluator",
  "Maria Santos": "QA Officer",
  "Pedro Reyes": "Checker",
  "Ana Gonzales": "Releasing Officer",
  "Jose Bautista": "Decker",
  "Liza Reyes": "Supervisor",
};

const DRUG_CATALOG = [
  {
    name: "Furacef-750",
    generic: "Cefuroxime Sodium",
    rx: "Prescription Drug (RX)",
  },
  { name: "Amoxil-500", generic: "Amoxicillin", rx: "Prescription Drug (RX)" },
  { name: "Calpol-250", generic: "Paracetamol", rx: "Over-the-Counter (OTC)" },
  {
    name: "Cloxacil-250",
    generic: "Cloxacillin",
    rx: "Prescription Drug (RX)",
  },
  {
    name: "Augmentin-625",
    generic: "Co-Amoxiclav",
    rx: "Prescription Drug (RX)",
  },
  {
    name: "Mefenamic-500",
    generic: "Mefenamic Acid",
    rx: "Over-the-Counter (OTC)",
  },
  {
    name: "Losartan-50",
    generic: "Losartan Potassium",
    rx: "Prescription Drug (RX)",
  },
  {
    name: "Amlodipine-10",
    generic: "Amlodipine Besylate",
    rx: "Prescription Drug (RX)",
  },
  {
    name: "Metformin-500",
    generic: "Metformin HCl",
    rx: "Prescription Drug (RX)",
  },
  {
    name: "Atorva-20",
    generic: "Atorvastatin Calcium",
    rx: "Prescription Drug (RX)",
  },
  { name: "Omepra-20", generic: "Omeprazole", rx: "Over-the-Counter (OTC)" },
  {
    name: "Salbu-4",
    generic: "Salbutamol Sulfate",
    rx: "Prescription Drug (RX)",
  },
  {
    name: "Cetirizine-10",
    generic: "Cetirizine HCl",
    rx: "Over-the-Counter (OTC)",
  },
  {
    name: "Azithro-500",
    generic: "Azithromycin",
    rx: "Prescription Drug (RX)",
  },
  {
    name: "Cipro-500",
    generic: "Ciprofloxacin HCl",
    rx: "Prescription Drug (RX)",
  },
  { name: "Ibupro-400", generic: "Ibuprofen", rx: "Over-the-Counter (OTC)" },
  {
    name: "Doxy-100",
    generic: "Doxycycline Hyclate",
    rx: "Prescription Drug (RX)",
  },
  { name: "Prevnar-13", generic: "Pneumococcal Vaccine", rx: "Vaccine" },
  { name: "Fluvax-QIV", generic: "Influenza Vaccine", rx: "Vaccine" },
  { name: "Engerix-B", generic: "Hepatitis B Vaccine", rx: "Vaccine" },
  { name: "Typhim-Vi", generic: "Typhoid Vaccine", rx: "Vaccine" },
  {
    name: "Prednisone-20",
    generic: "Prednisone",
    rx: "Prescription Drug (RX)",
  },
  {
    name: "Levoflox-500",
    generic: "Levofloxacin",
    rx: "Prescription Drug (RX)",
  },
  { name: "MMR-II", generic: "MMR Vaccine", rx: "Vaccine" },
];

const appSteps = [
  "For Evaluation",
  "For Compliance",
  "For Checking",
  "For QA",
  "For Releasing",
];
const timelineOptions = ["Within", "Beyond"];
const MONTHS = [
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
const PRESCRIPTION_TYPES = [
  "All",
  "Over-the-Counter (OTC)",
  "Vaccine",
  "Prescription Drug (RX)",
];

const yearlyMix = {
  2022: { approved: 38, disapproved: 22, onProcess: 15 },
  2023: { approved: 45, disapproved: 18, onProcess: 20 },
  2024: { approved: 52, disapproved: 25, onProcess: 18 },
  2025: { approved: 60, disapproved: 30, onProcess: 25 },
  2026: { approved: 20, disapproved: 8, onProcess: 30 },
};

// Static activity feed data
const ACTIVITY_FEED = [
  {
    id: 1,
    user: "Maria Santos",
    action: "completed evaluation",
    target: "Amoxil-500 (Amoxicillin)",
    time: "2 min ago",
    icon: "✅",
    color: "#36a420",
  },
  {
    id: 2,
    user: "Juan dela Cruz",
    action: "flagged for compliance",
    target: "Furacef-750 (Cefuroxime Sodium)",
    time: "14 min ago",
    icon: "🚩",
    color: "#f59e0b",
  },
  {
    id: 3,
    user: "Pedro Reyes",
    action: "submitted for QA",
    target: "Prevnar-13 (Pneumococcal Vaccine)",
    time: "32 min ago",
    icon: "🔍",
    color: FB,
  },
  {
    id: 4,
    user: "Ana Gonzales",
    action: "disapproved application",
    target: "Cipro-500 (Ciprofloxacin HCl)",
    time: "1 hr ago",
    icon: "❌",
    color: "#e02020",
  },
  {
    id: 5,
    user: "Jose Bautista",
    action: "started evaluation",
    target: "Metformin-500 (Metformin HCl)",
    time: "1 hr ago",
    icon: "▶️",
    color: "#9333ea",
  },
  {
    id: 6,
    user: "Liza Reyes",
    action: "released document",
    target: "Calpol-250 (Paracetamol)",
    time: "2 hr ago",
    icon: "📤",
    color: "#36a420",
  },
  {
    id: 7,
    user: "Maria Santos",
    action: "started evaluation",
    target: "Losartan-50 (Losartan Potassium)",
    time: "3 hr ago",
    icon: "▶️",
    color: "#9333ea",
  },
  {
    id: 8,
    user: "Pedro Reyes",
    action: "completed evaluation",
    target: "MMR-II (MMR Vaccine)",
    time: "4 hr ago",
    icon: "✅",
    color: "#36a420",
  },
];

// Static deadline data
const DEADLINES = [
  {
    dtn: "20260308091422",
    drug: "Furacef-750 (Cefuroxime Sodium)",
    evaluator: "Maria Santos",
    deadline: "2026-03-13",
    step: "For QA",
    urgency: "critical",
  },
  {
    dtn: "20260308092137",
    drug: "Augmentin-625 (Co-Amoxiclav)",
    evaluator: "Juan dela Cruz",
    deadline: "2026-03-13",
    step: "For Checking",
    urgency: "critical",
  },
  {
    dtn: "20260307103045",
    drug: "Prevnar-13 (Pneumococcal Vaccine)",
    evaluator: "Pedro Reyes",
    deadline: "2026-03-14",
    step: "For Compliance",
    urgency: "warning",
  },
  {
    dtn: "20260306085512",
    drug: "Metformin-500 (Metformin HCl)",
    evaluator: "Jose Bautista",
    deadline: "2026-03-14",
    step: "For Evaluation",
    urgency: "warning",
  },
  {
    dtn: "20260305112233",
    drug: "Losartan-50 (Losartan Potassium)",
    evaluator: "Ana Gonzales",
    deadline: "2026-03-17",
    step: "For QA",
    urgency: "normal",
  },
  {
    dtn: "20260304094501",
    drug: "Amlodipine-10 (Amlodipine Besylate)",
    evaluator: "Liza Reyes",
    deadline: "2026-03-18",
    step: "For Releasing",
    urgency: "normal",
  },
];

// Static compliance flags
const COMPLIANCE_FLAGS = [
  {
    dtn: "20260301091234",
    drug: "Cipro-500 (Ciprofloxacin HCl)",
    evaluator: "Ana Gonzales",
    reason: "Incomplete documentary requirements",
    severity: "high",
    flaggedDate: "2026-03-01",
  },
  {
    dtn: "20260302103344",
    drug: "Doxy-100 (Doxycycline Hyclate)",
    evaluator: "Juan dela Cruz",
    reason: "Missing GMP certificate",
    severity: "high",
    flaggedDate: "2026-03-02",
  },
  {
    dtn: "20260305084521",
    drug: "Salbu-4 (Salbutamol Sulfate)",
    evaluator: "Pedro Reyes",
    reason: "Label discrepancy noted",
    severity: "medium",
    flaggedDate: "2026-03-05",
  },
  {
    dtn: "20260307091100",
    drug: "Ibupro-400 (Ibuprofen)",
    evaluator: "Maria Santos",
    reason: "Clinical data update required",
    severity: "medium",
    flaggedDate: "2026-03-07",
  },
  {
    dtn: "20260309095500",
    drug: "Omepra-20 (Omeprazole)",
    evaluator: "Liza Reyes",
    reason: "Bioequivalence study pending",
    severity: "low",
    flaggedDate: "2026-03-09",
  },
];

// Workload heatmap data (Mon-Fri, last 4 weeks) — clearly varied for accurate visual contrast
const WORKLOAD_DATA = {
  "Juan dela Cruz": [
    2, 7, 4, 0, 6, 5, 8, 1, 6, 7, 0, 5, 8, 3, 4, 7, 1, 8, 5, 0,
  ],
  "Maria Santos": [6, 0, 8, 4, 7, 7, 0, 6, 8, 2, 5, 7, 0, 6, 8, 0, 6, 3, 7, 5],
  "Pedro Reyes": [0, 6, 2, 7, 5, 4, 6, 0, 5, 7, 8, 2, 7, 0, 1, 7, 3, 0, 6, 4],
  "Ana Gonzales": [5, 0, 6, 8, 2, 6, 2, 7, 0, 8, 1, 6, 0, 7, 5, 3, 7, 6, 0, 6],
  "Jose Bautista": [7, 1, 0, 6, 2, 0, 7, 5, 2, 6, 7, 0, 6, 3, 1, 0, 5, 7, 6, 2],
  "Liza Reyes": [2, 6, 0, 5, 7, 6, 0, 5, 7, 1, 3, 7, 2, 6, 0, 6, 0, 5, 2, 7],
};

// ── Users Database ────────────────────────────────────────────────────────────
const USER_DATABASE = [
  {
    id: 1,
    name: "Juan dela Cruz",
    email: "jdelacruz@pba.gov.ph",
    role: "Evaluator",
    status: "Active",
    lastLogin: "Today, 9:14 AM",
    avatar: 0,
    tasks: 72,
    approved: 45,
    specialization: "Prescription Drug (RX)",
  },
  {
    id: 2,
    name: "Maria Santos",
    email: "msantos@pba.gov.ph",
    role: "QA Officer",
    status: "Active",
    lastLogin: "Today, 8:50 AM",
    avatar: 1,
    tasks: 68,
    approved: 50,
    specialization: "Prescription Drug (RX)",
  },
  {
    id: 3,
    name: "Pedro Reyes",
    email: "preyes@pba.gov.ph",
    role: "Checker",
    status: "Active",
    lastLogin: "Yesterday, 4:22 PM",
    avatar: 2,
    tasks: 54,
    approved: 38,
    specialization: "Vaccine",
  },
  {
    id: 4,
    name: "Ana Gonzales",
    email: "agonzales@pba.gov.ph",
    role: "Releasing Officer",
    status: "Active",
    lastLogin: "Today, 10:05 AM",
    avatar: 3,
    tasks: 60,
    approved: 42,
    specialization: "Over-the-Counter (OTC)",
  },
  {
    id: 5,
    name: "Jose Bautista",
    email: "jbautista@pba.gov.ph",
    role: "Decker",
    status: "Inactive",
    lastLogin: "Mar 8, 2026",
    avatar: 4,
    tasks: 48,
    approved: 30,
    specialization: "Prescription Drug (RX)",
  },
  {
    id: 6,
    name: "Liza Reyes",
    email: "lreyes@pba.gov.ph",
    role: "Supervisor",
    status: "Active",
    lastLogin: "Today, 11:30 AM",
    avatar: 5,
    tasks: 55,
    approved: 40,
    specialization: "Over-the-Counter (OTC)",
  },
  {
    id: 7,
    name: "Carlo Mendoza",
    email: "cmendoza@pba.gov.ph",
    role: "Director",
    status: "Active",
    lastLogin: "Today, 7:45 AM",
    avatar: 6,
    tasks: 0,
    approved: 0,
    specialization: "All Types",
  },
  {
    id: 8,
    name: "Rosa Villanueva",
    email: "rvillanueva@pba.gov.ph",
    role: "Compliance Officer",
    status: "Active",
    lastLogin: "Today, 9:00 AM",
    avatar: 7,
    tasks: 0,
    approved: 0,
    specialization: "Compliance",
  },
  {
    id: 9,
    name: "Dante Flores",
    email: "dflores@pba.gov.ph",
    role: "Admin",
    status: "Active",
    lastLogin: "Today, 8:00 AM",
    avatar: 0,
    tasks: 0,
    approved: 0,
    specialization: "System Admin",
  },
  {
    id: 10,
    name: "Nena Cruz",
    email: "ncruz@pba.gov.ph",
    role: "Checker",
    status: "Suspended",
    lastLogin: "Feb 28, 2026",
    avatar: 1,
    tasks: 20,
    approved: 10,
    specialization: "Vaccine",
  },
];

const ROLE_COLORS = {
  Evaluator: {
    bg: "#dbeafe",
    color: "#1d4ed8",
    darkBg: "#1e2a4a",
    darkColor: "#93c5fd",
  },
  "QA Officer": {
    bg: "#d1fae5",
    color: "#065f46",
    darkBg: "#0a2e1a",
    darkColor: "#6ee7b7",
  },
  Checker: {
    bg: "#fce7f3",
    color: "#be185d",
    darkBg: "#2e0a1f",
    darkColor: "#f9a8d4",
  },
  "Releasing Officer": {
    bg: "#ffedd5",
    color: "#c2410c",
    darkBg: "#2e1500",
    darkColor: "#fed7aa",
  },
  Decker: {
    bg: "#f3e8ff",
    color: "#7e22ce",
    darkBg: "#2a1a3e",
    darkColor: "#d8b4fe",
  },
  Supervisor: {
    bg: "#fef3c7",
    color: "#92400e",
    darkBg: "#2e1f00",
    darkColor: "#fde68a",
  },
  Director: {
    bg: "#cffafe",
    color: "#0e7490",
    darkBg: "#0c2a3a",
    darkColor: "#67e8f9",
  },
  "Compliance Officer": {
    bg: "#fef9c3",
    color: "#92400e",
    darkBg: "#2e1f00",
    darkColor: "#fde68a",
  },
  Admin: {
    bg: "#ede9fe",
    color: "#5b21b6",
    darkBg: "#2a1a3e",
    darkColor: "#d8b4fe",
  },
};

const STATUS_COLORS_MAP = {
  Active: {
    bg: "#dcfce7",
    color: "#15803d",
    darkBg: "#0a2e1a",
    darkColor: "#4ade80",
    dot: "#36a420",
  },
  Inactive: {
    bg: "#f3f4f6",
    color: "#6b7280",
    darkBg: "#2a2a2a",
    darkColor: "#9ca3af",
    dot: "#9ca3af",
  },
  Suspended: {
    bg: "#fee2e2",
    color: "#991b1b",
    darkBg: "#2e0a0a",
    darkColor: "#f87171",
    dot: "#e02020",
  },
};

function makeDTN(year, month, day, seq) {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const hh = String(8 + (seq % 8)).padStart(2, "0");
  const mi = String((seq * 7) % 60).padStart(2, "0");
  const ss = String((seq * 13) % 60).padStart(2, "0");
  return `${year}${mm}${dd}${hh}${mi}${ss}`;
}

function generateData() {
  const rows = [];
  let seq = 1;
  const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  Object.entries(yearlyMix).forEach(([yearStr, mix]) => {
    const year = Number(yearStr);
    const total = mix.approved + mix.disapproved + mix.onProcess;
    for (let i = 0; i < total; i++) {
      const month = (i % 12) + 1;
      const day = ((i * 3 + 1) % monthDays[month - 1]) + 1;
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      const drug = DRUG_CATALOG[i % DRUG_CATALOG.length];
      const status =
        i < mix.approved
          ? "Approved"
          : i < mix.approved + mix.disapproved
            ? "Disapproved"
            : "On Process";
      rows.push({
        date: `${year}-${mm}-${dd}`,
        evaluator: evaluatorNames[i % evaluatorNames.length],
        dtn: makeDTN(year, month, day, seq),
        drugName: `${drug.name} (${drug.generic})`,
        appStep: appSteps[i % appSteps.length],
        timeline: timelineOptions[i % 2],
        status,
        prescription: drug.rx,
      });
      seq++;
    }
  });
  return rows;
}

const staticData = generateData();
const uniqueEvaluators = [...new Set(staticData.map((d) => d.evaluator))];

// ── Badge color maps ──────────────────────────────────────────────────────────
const stepColors = {
  "For Evaluation": { bg: "#dbeafe", color: "#1d4ed8" },
  "For Compliance": { bg: "#fef9c3", color: "#a16207" },
  "For Checking": { bg: "#dcfce7", color: "#15803d" },
  "For QA": { bg: "#f3e8ff", color: "#7e22ce" },
  "For Releasing": { bg: "#ffedd5", color: "#c2410c" },
};
const stepColorsDark = {
  "For Evaluation": { bg: "#1e2a4a", color: "#93c5fd" },
  "For Compliance": { bg: "#2a2000", color: "#fde68a" },
  "For Checking": { bg: "#0a2e1a", color: "#86efac" },
  "For QA": { bg: "#2a1a3e", color: "#d8b4fe" },
  "For Releasing": { bg: "#2e1500", color: "#fed7aa" },
};
const timelineColors = {
  Within: { bg: "#dcfce7", color: "#15803d" },
  Beyond: { bg: "#fef2f2", color: "#b91c1c" },
};
const timelineColorsDark = {
  Within: { bg: "#0a2e1a", color: "#4ade80" },
  Beyond: { bg: "#2e0a0a", color: "#f87171" },
};
const statusColors = {
  Approved: { bg: "#dcfce7", color: "#15803d" },
  Disapproved: { bg: "#fef2f2", color: "#b91c1c" },
  "On Process": { bg: "#fef9c3", color: "#a16207" },
};
const statusColorsDark = {
  Approved: { bg: "#0a2e1a", color: "#4ade80" },
  Disapproved: { bg: "#2e0a0a", color: "#f87171" },
  "On Process": { bg: "#2a2000", color: "#fde68a" },
};
const rxColors = {
  "Over-the-Counter (OTC)": { bg: "#e0f2fe", color: "#0369a1" },
  Vaccine: { bg: "#dcfce7", color: "#15803d" },
  "Prescription Drug (RX)": { bg: "#fef3c7", color: "#b45309" },
};
const rxColorsDark = {
  "Over-the-Counter (OTC)": { bg: "#0c2a3a", color: "#38bdf8" },
  Vaccine: { bg: "#0a2e1a", color: "#4ade80" },
  "Prescription Drug (RX)": { bg: "#2e1f00", color: "#fbbf24" },
};

function rxShortLabel(p) {
  return p === "Over-the-Counter (OTC)"
    ? "OTC"
    : p === "Prescription Drug (RX)"
      ? "RX"
      : "Vaccine";
}

const avatarPalette = [
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#fce7f3", color: "#be185d" },
  { bg: "#d1fae5", color: "#065f46" },
  { bg: "#fef3c7", color: "#92400e" },
  { bg: "#ede9fe", color: "#5b21b6" },
  { bg: "#fee2e2", color: "#991b1b" },
  { bg: "#cffafe", color: "#0e7490" },
  { bg: "#fef9c3", color: "#713f12" },
];

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}
function getAvatarColor(name, list) {
  return avatarPalette[list.indexOf(name) % avatarPalette.length];
}

// ── Shared Card ───────────────────────────────────────────────────────────────
function Card({ children, style = {}, ui }) {
  return (
    <div
      style={{
        background: ui.cardBg,
        border: `1px solid ${ui.cardBorder}`,
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({ icon, title, sub, right, ui }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 14px",
        borderBottom: `1px solid ${ui.divider}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ fontSize: "1rem" }}>{icon}</span>}
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "0.88rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            {title}
          </p>
          {sub && (
            <p
              style={{
                margin: 0,
                fontSize: "0.72rem",
                color: ui.textMuted,
                marginTop: 1,
              }}
            >
              {sub}
            </p>
          )}
        </div>
      </div>
      {right}
    </div>
  );
}

// ── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({ icon, label, active, hasArrow, onClick, ui, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 8,
        margin: "2px 8px",
        background: active ? ui.activeNavBg : hov ? ui.hoverBg : "transparent",
        cursor: disabled ? "default" : "pointer",
        transition: "background 0.12s",
        opacity: disabled ? 0.5 : 1,
        position: "relative",
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: active ? FB : ui.inputBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.1rem",
          flexShrink: 0,
          transition: "background 0.15s",
        }}
      >
        {icon}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: "0.92rem",
          fontWeight: active ? 700 : 500,
          color: active ? FB : ui.textPrimary,
        }}
      >
        {label}
      </span>
      {disabled ? (
        <span
          style={{
            fontSize: "0.58rem",
            fontWeight: 700,
            color: "#fff",
            background: "#f59e0b",
            padding: "2px 6px",
            borderRadius: 99,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          Soon
        </span>
      ) : hasArrow ? (
        <span style={{ color: ui.textMuted, fontSize: "0.85rem" }}>›</span>
      ) : null}
    </div>
  );
}

// ── smoothPath helper ─────────────────────────────────────────────────────────
function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i],
      [x1, y1] = pts[i + 1];
    const cpx = (x0 + x1) / 2;
    d += ` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

const MON_SERIES = [
  { key: "Approved", color: FB, label: "Approved" },
  { key: "Disapproved", color: "#f43f5e", label: "Disapproved" },
  { key: "OnProcess", color: "#f59e0b", label: "On Process" },
];

function MonAreaChart({ data, subtitle, ui }) {
  const [hov, setHov] = useState(null);
  const W = 700,
    H = 220;
  const PAD = { top: 22, right: 20, bottom: 34, left: 48 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const allVals = data.flatMap((d) => MON_SERIES.map((s) => d[s.key] ?? 0));
  const maxV = (Math.max(...allVals) || 1) * 1.2;
  const toX = (i) => PAD.left + (i / Math.max(data.length - 1, 1)) * cW;
  const toY = (v) => PAD.top + cH - (v / maxV) * cH;
  const yticks = [0, 1 / 3, 2 / 3, 1].map((f) => Math.round(maxV * f));
  const xstep = Math.max(1, Math.ceil(data.length / 10));
  const showDots = data.length <= 8;
  const seriesPaths = MON_SERIES.map((s) => {
    const pts = data.map((d, i) => [toX(i), toY(d[s.key] ?? 0)]);
    const linePath = smoothPath(pts);
    const areaPath =
      pts.length > 0
        ? `${linePath} L ${toX(data.length - 1)} ${PAD.top + cH} L ${PAD.left} ${PAD.top + cH} Z`
        : "";
    return { ...s, pts, linePath, areaPath };
  });
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {MON_SERIES.map((s) => (
            <div
              key={s.key}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <div
                style={{
                  width: 22,
                  height: 3,
                  borderRadius: 99,
                  background: s.color,
                }}
              />
              <span
                style={{
                  fontSize: "0.73rem",
                  color: ui.textSub,
                  fontFamily: "inherit",
                  fontWeight: 500,
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
        {subtitle && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              borderRadius: 99,
              background: `${FB}12`,
              border: `1px solid ${FB}28`,
            }}
          >
            <span style={{ fontSize: "0.65rem" }}>📅</span>
            <span
              style={{
                fontSize: "0.71rem",
                color: FB,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              {subtitle}
            </span>
          </div>
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
          {seriesPaths.map((s) => (
            <linearGradient
              key={s.key}
              id={`mongrad-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity={0.18} />
              <stop offset="75%" stopColor={s.color} stopOpacity={0.04} />
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
              strokeWidth={i === 0 ? 1.5 : 0.75}
              strokeDasharray={i === 0 ? "none" : "3 4"}
              opacity={i === 0 ? 0.8 : 0.5}
            />
            <text
              x={PAD.left - 7}
              y={toY(t) + 4}
              textAnchor="end"
              fill={ui.textMuted}
              fontSize="10"
              fontFamily="inherit"
              fontWeight="500"
            >
              {t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}
            </text>
          </g>
        ))}
        {seriesPaths.map((s) => (
          <path
            key={`area-${s.key}`}
            d={s.areaPath}
            fill={`url(#mongrad-${s.key})`}
          />
        ))}
        {seriesPaths.map((s) => (
          <path
            key={`line-${s.key}`}
            d={s.linePath}
            fill="none"
            stroke={s.color}
            strokeWidth={2.2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {showDots &&
          data.map((d, i) =>
            seriesPaths.map((s) => (
              <circle
                key={`dot-${s.key}-${i}`}
                cx={toX(i)}
                cy={toY(d[s.key] ?? 0)}
                r="3.5"
                fill={s.color}
                stroke={ui.cardBg}
                strokeWidth="2"
                opacity="0.9"
              />
            )),
          )}
        {data.map(
          (d, i) =>
            i % xstep === 0 && (
              <text
                key={i}
                x={toX(i)}
                y={H - 6}
                textAnchor="middle"
                fill={ui.textMuted}
                fontSize="9.5"
                fontFamily="inherit"
                fontWeight="500"
              >
                {d.label}
              </text>
            ),
        )}
        {data.map((d, i) => {
          const zoneW = cW / Math.max(data.length, 1);
          return (
            <g key={`zone-${i}`}>
              <rect
                x={toX(i) - zoneW / 2}
                y={PAD.top}
                width={zoneW}
                height={cH}
                fill="transparent"
                onMouseEnter={() => setHov(i)}
                onMouseLeave={() => setHov(null)}
              />
              {hov === i &&
                (() => {
                  const cx2 = toX(i);
                  const tipW = 150,
                    tipH = 18 + MON_SERIES.length * 20 + 10;
                  const tipX = cx2 > W * 0.65 ? cx2 - tipW - 14 : cx2 + 14;
                  const tipY = PAD.top + 4;
                  return (
                    <>
                      <line
                        x1={cx2}
                        y1={PAD.top}
                        x2={cx2}
                        y2={PAD.top + cH}
                        stroke={ui.textMuted}
                        strokeWidth="1"
                        strokeDasharray="4 3"
                        opacity="0.5"
                      />
                      {seriesPaths.map((s) => (
                        <circle
                          key={s.key}
                          cx={cx2}
                          cy={toY(d[s.key] ?? 0)}
                          r="5"
                          fill={s.color}
                          stroke={ui.cardBg}
                          strokeWidth="2.5"
                        />
                      ))}
                      <g>
                        <rect
                          x={tipX}
                          y={tipY}
                          width={tipW}
                          height={tipH}
                          rx={8}
                          fill={ui.cardBg}
                          stroke={ui.cardBorder}
                          strokeWidth="1"
                        />
                        <rect
                          x={tipX}
                          y={tipY}
                          width={tipW}
                          height={22}
                          rx={8}
                          fill={`${FB}14`}
                        />
                        <rect
                          x={tipX}
                          y={tipY + 14}
                          width={tipW}
                          height={8}
                          fill={`${FB}14`}
                        />
                        <text
                          x={tipX + tipW / 2}
                          y={tipY + 14}
                          textAnchor="middle"
                          fill={FB}
                          fontSize="10"
                          fontWeight="700"
                          fontFamily="inherit"
                        >
                          {d.label}
                          {subtitle ? ` · ${subtitle}` : ""}
                        </text>
                        {MON_SERIES.map((s, si) => (
                          <g key={s.key}>
                            <rect
                              x={tipX + 10}
                              y={tipY + 26 + si * 20 - 6}
                              width={8}
                              height={8}
                              rx={2}
                              fill={s.color}
                              opacity="0.9"
                            />
                            <text
                              x={tipX + 24}
                              y={tipY + 26 + si * 20}
                              fill={ui.textSub}
                              fontSize="9.5"
                              fontFamily="inherit"
                            >
                              {s.label}
                            </text>
                            <text
                              x={tipX + tipW - 10}
                              y={tipY + 26 + si * 20}
                              textAnchor="end"
                              fill={s.color}
                              fontSize="10"
                              fontWeight="700"
                              fontFamily="inherit"
                            >
                              {(d[s.key] ?? 0).toLocaleString()}
                            </text>
                          </g>
                        ))}
                      </g>
                    </>
                  );
                })()}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
const DONUT_PALETTE = [
  { color: FB, light: "#5da4f8", glow: `${FB}55` },
  { color: "#f43f5e", light: "#f87191", glow: "rgba(244,63,94,0.35)" },
  { color: "#f59e0b", light: "#fbbf24", glow: "rgba(245,158,11,0.35)" },
];

function DonutChart({ data, ui, darkMode, onSliceClick }) {
  const [active, setActive] = useState(null);
  const cx = 100,
    cy = 100,
    r = 76,
    ri = 52;
  const total = data.reduce((s, d) => s + d.value, 0);
  let sa = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const angle = total === 0 ? 0 : (d.value / total) * 2 * Math.PI;
    const s = {
      ...d,
      startAngle: sa,
      endAngle: sa + angle,
      ...DONUT_PALETTE[i],
    };
    sa += angle;
    return s;
  });
  function arcPath(sa, ea, or, ir) {
    if (Math.abs(ea - sa) < 0.001) return "";
    const x1o = cx + or * Math.cos(sa),
      y1o = cy + or * Math.sin(sa);
    const x2o = cx + or * Math.cos(ea),
      y2o = cy + or * Math.sin(ea);
    const x1i = cx + ir * Math.cos(ea),
      y1i = cy + ir * Math.sin(ea);
    const x2i = cx + ir * Math.cos(sa),
      y2i = cy + ir * Math.sin(sa);
    const lg = ea - sa > Math.PI ? 1 : 0;
    return `M ${x1o} ${y1o} A ${or} ${or} 0 ${lg} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${ir} ${ir} 0 ${lg} 0 ${x2i} ${y2i} Z`;
  }
  const ai = active !== null ? active : 0;
  const aSlice = slices[ai];
  const pct = total > 0 ? ((aSlice?.value / total) * 100).toFixed(1) : "0.0";
  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <svg
        viewBox="0 0 200 200"
        style={{
          width: "100%",
          maxWidth: 240,
          height: "auto",
          overflow: "visible",
        }}
      >
        <defs>
          {DONUT_PALETTE.map((p, i) => (
            <linearGradient
              key={i}
              id={`mondg${i}`}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop offset="0%" stopColor={p.light} />
              <stop offset="100%" stopColor={p.color} />
            </linearGradient>
          ))}
        </defs>
        <circle
          cx={cx}
          cy={cy}
          r={(r + ri) / 2}
          fill="none"
          stroke={darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}
          strokeWidth={r - ri + 2}
        />
        {slices.map((s, i) => {
          const isAct = i === ai;
          const or = isAct ? r + 8 : r,
            ir2 = isAct ? ri - 3 : ri;
          return (
            <g
              key={i}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => onSliceClick && onSliceClick(s.name)}
              style={{ cursor: "pointer" }}
            >
              <path
                d={arcPath(s.startAngle, s.endAngle, or, ir2)}
                fill={`url(#mondg${i})`}
                style={{ transition: "all 0.22s cubic-bezier(.34,1.56,.64,1)" }}
              />
            </g>
          );
        })}
        <circle
          cx={cx}
          cy={cy}
          r={ri - 4}
          fill={darkMode ? "rgba(36,37,38,0.97)" : "rgba(255,255,255,0.97)"}
        />
        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          fill={aSlice?.color}
          fontSize={22}
          fontWeight={800}
          fontFamily="inherit"
        >
          {aSlice?.value ?? 0}
        </text>
        <text
          x={cx}
          y={cy + 6}
          textAnchor="middle"
          fill={ui.textMuted}
          fontSize={8.5}
          fontFamily="inherit"
          fontWeight={600}
        >
          {aSlice?.name?.toUpperCase()}
        </text>
        <text
          x={cx}
          y={cy + 20}
          textAnchor="middle"
          fill={aSlice?.color}
          fontSize={12}
          fontWeight={700}
          fontFamily="inherit"
        >
          {pct}%
        </text>
        <text
          x={cx}
          y={cy + 33}
          textAnchor="middle"
          fill={ui.textMuted}
          fontSize={7}
          fontFamily="inherit"
          fontStyle="italic"
        >
          tap slice for details
        </text>
      </svg>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          width: "100%",
          marginTop: 8,
        }}
      >
        {slices.map((s, i) => {
          const pv = total > 0 ? ((s.value / total) * 100).toFixed(1) : "0.0";
          const isAct = i === ai;
          return (
            <div
              key={s.name}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => onSliceClick && onSliceClick(s.name)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 8,
                cursor: "pointer",
                background: isAct
                  ? darkMode
                    ? `${s.color}18`
                    : `${s.color}0e`
                  : "transparent",
                border: `1px solid ${isAct ? s.color + "40" : "transparent"}`,
                transition: "all 0.15s",
              }}
            >
              <div
                style={{
                  width: 3,
                  height: 28,
                  borderRadius: 99,
                  background: `linear-gradient(to bottom, ${s.light}, ${s.color})`,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.77rem",
                      fontWeight: 600,
                      color: isAct ? s.color : ui.textSub,
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 800,
                      color: s.color,
                    }}
                  >
                    {s.value}
                  </span>
                </div>
                <div
                  style={{
                    height: 3,
                    borderRadius: 99,
                    background: ui.progressBg,
                  }}
                >
                  <div
                    style={{
                      height: 3,
                      borderRadius: 99,
                      width: `${pv}%`,
                      background: `linear-gradient(to right, ${s.light}, ${s.color})`,
                      transition: "width 0.4s",
                    }}
                  />
                </div>
              </div>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: isAct ? s.color : ui.textMuted,
                  minWidth: 34,
                  textAlign: "right",
                }}
              >
                {pv}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Chart Detail Modal ────────────────────────────────────────────────────────
function ChartDetailModal({ title, subtitle, rows, darkMode, onClose, ui }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.dtn.toLowerCase().includes(q) ||
        r.evaluator.toLowerCase().includes(q) ||
        (r.drugName || "").toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.prescription.toLowerCase().includes(q) ||
        r.appStep.toLowerCase().includes(q),
    );
  }, [rows, search]);
  const SC = darkMode ? statusColorsDark : statusColors;
  const RXC = darkMode ? rxColorsDark : rxColors;
  const SPC = darkMode ? stepColorsDark : stepColors;
  const colHdr = darkMode ? ui.sidebarBg : "#f8f9fd";
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 14,
          overflow: "hidden",
          width: 1000,
          maxWidth: "96vw",
          boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "82vh",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: `1px solid ${ui.divider}`,
            background: colHdr,
            flexShrink: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.66rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: ui.textMuted,
                fontWeight: 700,
              }}
            >
              Chart Details
            </p>
            <h3
              style={{
                margin: "2px 0 0",
                fontSize: "1.05rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "0.74rem",
                  color: ui.textMuted,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: ui.inputBg,
                border: `1px solid ${ui.cardBorder}`,
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: "0.8rem",
                color: ui.textPrimary,
                outline: "none",
                width: 200,
                colorScheme: darkMode ? "dark" : "light",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: `1px solid ${ui.cardBorder}`,
                borderRadius: 6,
                color: ui.textMuted,
                cursor: "pointer",
                width: 30,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
        </div>
        <div style={{ overflowY: "auto", overflowX: "auto", flex: 1 }}>
          <div style={{ minWidth: 880 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1.3fr 2.2fr 0.9fr 1.1fr 0.9fr",
                background: colHdr,
                borderBottom: `1px solid ${ui.divider}`,
                position: "sticky",
                top: 0,
                zIndex: 2,
              }}
            >
              {[
                "DTN",
                "User",
                "Drug / Application",
                "Prescription",
                "App Step",
                "Status",
              ].map((col) => (
                <span
                  key={col}
                  style={{
                    fontSize: "0.67rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: ui.textMuted,
                    padding: "9px 14px",
                    textAlign: "center",
                  }}
                >
                  {col}
                </span>
              ))}
            </div>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: ui.textMuted,
                  fontSize: "0.84rem",
                }}
              >
                No records found
              </div>
            ) : (
              filtered.map((row, i) => {
                const sc = SC[row.status] || {
                  bg: "#f3f4f6",
                  color: "#374151",
                };
                const rxc = RXC[row.prescription] || {
                  bg: "#f3f4f6",
                  color: "#374151",
                };
                const spc = SPC[row.appStep] || {
                  bg: "#f3f4f6",
                  color: "#374151",
                };
                const userRole = USER_ROLE_MAP[row.evaluator] || "User";
                return (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "1.4fr 1.3fr 2.2fr 0.9fr 1.1fr 0.9fr",
                      borderBottom:
                        i < filtered.length - 1
                          ? `1px solid ${ui.divider}`
                          : "none",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = ui.hoverBg)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <span
                      style={{
                        padding: "9px 14px",
                        fontSize: "0.72rem",
                        color: FB,
                        textAlign: "center",
                        fontWeight: 700,
                        alignSelf: "center",
                        fontFamily: "monospace",
                      }}
                    >
                      {row.dtn}
                    </span>
                    <span
                      style={{
                        padding: "9px 14px",
                        fontSize: "0.8rem",
                        color: ui.textPrimary,
                        textAlign: "center",
                        fontWeight: 500,
                        alignSelf: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background:
                            avatarPalette[
                              uniqueEvaluators.indexOf(row.evaluator) %
                                avatarPalette.length
                            ].color,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div>{row.evaluator}</div>
                        <div
                          style={{ fontSize: "0.65rem", color: ui.textMuted }}
                        >
                          {userRole}
                        </div>
                      </div>
                    </span>
                    <span
                      style={{
                        padding: "9px 14px",
                        fontSize: "0.77rem",
                        color: ui.textSub,
                        alignSelf: "center",
                      }}
                    >
                      {row.drugName || "—"}
                    </span>
                    <span
                      style={{
                        padding: "9px 14px",
                        textAlign: "center",
                        alignSelf: "center",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: 99,
                          background: rxc.bg,
                          color: rxc.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {rxShortLabel(row.prescription)}
                      </span>
                    </span>
                    <span
                      style={{
                        padding: "9px 14px",
                        textAlign: "center",
                        alignSelf: "center",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: 99,
                          background: spc.bg,
                          color: spc.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.appStep}
                      </span>
                    </span>
                    <span
                      style={{
                        padding: "9px 14px",
                        textAlign: "center",
                        alignSelf: "center",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: 99,
                          background: sc.bg,
                          color: sc.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.status}
                      </span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div
          style={{
            padding: "9px 20px",
            borderTop: `1px solid ${ui.divider}`,
            background: colHdr,
            flexShrink: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "0.74rem", color: ui.textMuted }}>
            {filtered.length !== rows.length
              ? `${filtered.length} of ${rows.length} records`
              : `${rows.length} record${rows.length !== 1 ? "s" : ""}`}
          </span>
          <button
            onClick={onClose}
            style={{
              padding: "5px 14px",
              fontSize: "0.8rem",
              fontWeight: 500,
              borderRadius: 6,
              border: `1px solid ${ui.cardBorder}`,
              background: "transparent",
              color: ui.textMuted,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Action Menu ───────────────────────────────────────────────────────────────
function ActionMenu({ task, darkMode, onReassign, ui }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        style={{
          background: "transparent",
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 6,
          color: ui.textMuted,
          cursor: "pointer",
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1rem",
          letterSpacing: 1,
          lineHeight: 1,
        }}
      >
        ···
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: 32,
            right: 0,
            background: ui.cardBg,
            border: `1px solid ${ui.cardBorder}`,
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            zIndex: 10,
            minWidth: 140,
            overflow: "hidden",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onReassign(task);
            }}
            style={{
              width: "100%",
              padding: "8px 14px",
              background: "transparent",
              border: "none",
              textAlign: "left",
              fontSize: "0.82rem",
              color: ui.textPrimary,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = ui.hoverBg)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span>🔄</span> Re-assign
          </button>
        </div>
      )}
    </div>
  );
}

// ── Reassign Modal ────────────────────────────────────────────────────────────
function ReassignModal({ task, evaluators, darkMode, onClose, onConfirm, ui }) {
  const [selected, setSelected] = useState("");
  const colHdr = darkMode ? ui.sidebarBg : "#f8f9fd";
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 12,
          overflow: "hidden",
          width: 380,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: `1px solid ${ui.divider}`,
            background: colHdr,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: ui.textMuted,
                fontWeight: 600,
              }}
            >
              Re-assign Task
            </p>
            <h3
              style={{
                margin: 0,
                fontSize: "0.84rem",
                fontWeight: 700,
                color: FB,
                fontFamily: "monospace",
              }}
            >
              {task.dtn}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 6,
              color: ui.textMuted,
              cursor: "pointer",
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: "20px" }}>
          <p
            style={{
              margin: "0 0 4px",
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: ui.textMuted,
            }}
          >
            Drug Application
          </p>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "0.8rem",
              color: ui.textSub,
            }}
          >
            {task.drugName}
          </p>
          <p
            style={{
              margin: "0 0 4px",
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: ui.textMuted,
            }}
          >
            Current User
          </p>
          <p
            style={{
              margin: "0 0 16px",
              fontSize: "0.88rem",
              color: ui.textPrimary,
              fontWeight: 500,
            }}
          >
            {task.evaluator}{" "}
            <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
              ({USER_ROLE_MAP[task.evaluator] || "User"})
            </span>
          </p>
          <label
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: ui.textMuted,
              display: "block",
              marginBottom: 4,
            }}
          >
            Assign To
          </label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{
              width: "100%",
              background: ui.inputBg,
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 6,
              padding: "7px 10px",
              fontSize: "0.84rem",
              color: ui.textPrimary,
              outline: "none",
              colorScheme: darkMode ? "dark" : "light",
              fontFamily: "inherit",
            }}
          >
            <option value="">— Select User —</option>
            {evaluators
              .filter((ev) => ev !== task.evaluator)
              .map((ev) => (
                <option key={ev} value={ev}>
                  {ev} ({USER_ROLE_MAP[ev] || "User"})
                </option>
              ))}
          </select>
        </div>
        <div
          style={{
            padding: "12px 20px",
            borderTop: `1px solid ${ui.divider}`,
            background: colHdr,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "6px 14px",
              fontSize: "0.82rem",
              borderRadius: 6,
              border: `1px solid ${ui.cardBorder}`,
              background: "transparent",
              color: ui.textMuted,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onConfirm(task, selected)}
            disabled={!selected}
            style={{
              padding: "6px 16px",
              fontSize: "0.82rem",
              fontWeight: 700,
              borderRadius: 6,
              border: "none",
              background: selected ? FB : ui.inputBg,
              color: selected ? "#fff" : ui.textMuted,
              cursor: selected ? "pointer" : "not-allowed",
              transition: "all 0.15s",
              fontFamily: "inherit",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MAIN MonitoringPage ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function MonitoringPage({ darkMode }) {
  const ui = makeUI(darkMode);
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const [activeNav, setActiveNav] = useState("overview");
  // ── Evaluators nav item REMOVED — data is now in Users view ──
  const navItems = [
    { key: "overview", icon: "🏠", label: "Overview", disabled: false },
    { key: "records", icon: "📋", label: "Records", disabled: false },
    { key: "analytics", icon: "📊", label: "Analytics", disabled: false },
    { key: "deadlines", icon: "⏰", label: "Deadlines", disabled: false },
    { key: "compliance", icon: "🚩", label: "Compliance", disabled: false },
    { key: "workload", icon: "🔥", label: "Workload", disabled: false },
    { key: "activity", icon: "📡", label: "Activity Feed", disabled: false },
    { key: "users", icon: "👥", label: "Users", disabled: false },
    {
      key: "backlog",
      icon: "⏳",
      label: "Backlogs",
      disabled: true,
      hasArrow: true,
    },
    { key: "settings", icon: "⚙️", label: "Settings", disabled: true },
  ];

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // Records state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [evaluatorFilter, setEvalFilter] = useState("");
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const PAGE_SIZE = 12;

  // Evaluator modal
  const [modalEval, setModalEval] = useState(null);
  const [modalDateFrom, setModalDateFrom] = useState("");
  const [modalDateTo, setModalDateTo] = useState("");
  const [modalSortCol, setModalSortCol] = useState("date");
  const [modalSortDir, setModalSortDir] = useState("asc");
  const [modalStatusTab, setModalStatusTab] = useState("All");
  const [reassignTask, setReassignTask] = useState(null);
  const [tableData, setTableData] = useState(staticData);
  const [chartModal, setChartModal] = useState(null);

  // Analytics filters
  const [chartYear, setChartYear] = useState("All");
  const [chartMonth, setChartMonth] = useState("All");
  const [rxFilter, setRxFilter] = useState("All");

  // Impersonation
  const [impersonating, setImpersonating] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("All");
  const [userStatusFilter, setUserStatusFilter] = useState("All");
  const [showImpersonateConfirm, setShowImpersonateConfirm] = useState(null);

  // Activity feed
  const [activitySearch, setActivitySearch] = useState("");

  // Deadline filter
  const [deadlineFilter, setDeadlineFilter] = useState("all");

  // Compliance filter
  const [complianceFilter, setComplianceFilter] = useState("all");

  const availableYears = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          staticData.map((d) => new Date(d.date + "T00:00:00").getFullYear()),
        ),
      ).sort(),
    ],
    [],
  );

  const chartFiltered = useMemo(
    () =>
      tableData.filter((row) => {
        const d = new Date(row.date + "T00:00:00");
        if (chartYear !== "All" && d.getFullYear() !== Number(chartYear))
          return false;
        if (chartMonth !== "All" && d.getMonth() !== Number(chartMonth))
          return false;
        if (rxFilter !== "All" && row.prescription !== rxFilter) return false;
        return true;
      }),
    [tableData, chartYear, chartMonth, rxFilter],
  );

  const areaData = useMemo(() => {
    const groups = {};
    chartFiltered.forEach((row) => {
      const d = new Date(row.date + "T00:00:00");
      const key =
        chartYear === "All" ? String(d.getFullYear()) : MONTHS[d.getMonth()];
      if (!groups[key])
        groups[key] = { label: key, Approved: 0, Disapproved: 0, OnProcess: 0 };
      if (row.status === "Approved") groups[key].Approved++;
      else if (row.status === "Disapproved") groups[key].Disapproved++;
      else if (row.status === "On Process") groups[key].OnProcess++;
    });
    const keys = Object.keys(groups);
    if (chartYear === "All")
      return keys.sort((a, b) => Number(a) - Number(b)).map((k) => groups[k]);
    return MONTHS.filter((m) => groups[m]).map((m) => groups[m]);
  }, [chartFiltered, chartYear, chartMonth]);

  const areaSub =
    chartYear === "All"
      ? "All Years"
      : chartMonth !== "All"
        ? `${MONTHS[Number(chartMonth)]} ${chartYear}`
        : chartYear;

  const pieData = useMemo(
    () => [
      {
        name: "Approved",
        value: chartFiltered.filter((r) => r.status === "Approved").length,
      },
      {
        name: "Disapproved",
        value: chartFiltered.filter((r) => r.status === "Disapproved").length,
      },
      {
        name: "On Process",
        value: chartFiltered.filter((r) => r.status === "On Process").length,
      },
    ],
    [chartFiltered],
  );

  const totalApproved = pieData[0]?.value || 0;
  const totalDisapproved = pieData[1]?.value || 0;
  const totalOnProcess = pieData[2]?.value || 0;
  const approvalRate = chartFiltered.length
    ? `${((totalApproved / chartFiltered.length) * 100).toFixed(1)}%`
    : "—";

  const availableMonths = useMemo(() => {
    if (chartYear === "All") return [];
    const ms = new Set(
      tableData
        .filter(
          (r) =>
            new Date(r.date + "T00:00:00").getFullYear() === Number(chartYear),
        )
        .map((r) => new Date(r.date + "T00:00:00").getMonth()),
    );
    return Array.from(ms).sort((a, b) => a - b);
  }, [tableData, chartYear]);

  const filtered = useMemo(() => {
    setPage(1);
    const f = tableData.filter((row) => {
      const rowDate = new Date(row.date + "T00:00:00");
      if (dateFrom && rowDate < new Date(dateFrom)) return false;
      if (dateTo && rowDate > new Date(dateTo)) return false;
      if (evaluatorFilter && row.evaluator !== evaluatorFilter) return false;
      return true;
    });
    return [...f].sort((a, b) => {
      let av = a[sortCol],
        bv = b[sortCol];
      if (sortCol === "date") {
        av = new Date(av + "T00:00:00");
        bv = new Date(bv + "T00:00:00");
      } else {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }
      return av < bv
        ? sortDir === "asc"
          ? -1
          : 1
        : av > bv
          ? sortDir === "asc"
            ? 1
            : -1
          : 0;
    });
  }, [dateFrom, dateTo, evaluatorFilter, tableData, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };
  const toggleModalSort = (col) => {
    if (modalSortCol === col)
      setModalSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setModalSortCol(col);
      setModalSortDir("asc");
    }
  };

  const handleReassignConfirm = (task, newEval) => {
    setTableData((prev) =>
      prev.map((r) => (r.dtn === task.dtn ? { ...r, evaluator: newEval } : r)),
    );
    setReassignTask(null);
  };

  const currentEvaluators = [...new Set(tableData.map((d) => d.evaluator))];
  const allModalTasks = modalEval
    ? tableData.filter((d) => d.evaluator === modalEval)
    : [];

  const modalTasks = useMemo(() => {
    const f = allModalTasks.filter((t) => {
      const d = new Date(t.date + "T00:00:00");
      if (modalDateFrom && d < new Date(modalDateFrom)) return false;
      if (modalDateTo && d > new Date(modalDateTo)) return false;
      if (modalStatusTab !== "All" && t.status !== modalStatusTab) return false;
      return true;
    });
    return [...f].sort((a, b) => {
      let av = a[modalSortCol],
        bv = b[modalSortCol];
      if (modalSortCol === "date") {
        av = new Date(av + "T00:00:00");
        bv = new Date(bv + "T00:00:00");
      } else {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }
      return av < bv
        ? modalSortDir === "asc"
          ? -1
          : 1
        : av > bv
          ? modalSortDir === "asc"
            ? 1
            : -1
          : 0;
    });
  }, [
    allModalTasks,
    modalDateFrom,
    modalDateTo,
    modalSortCol,
    modalSortDir,
    modalStatusTab,
  ]);

  const handleModalClose = () => {
    setModalEval(null);
    setModalDateFrom("");
    setModalDateTo("");
    setModalSortCol("date");
    setModalSortDir("asc");
    setModalStatusTab("All");
  };
  const handleSliceClick = (statusName) => {
    setChartModal({
      title: statusName,
      subtitle: rxFilter !== "All" ? `Prescription: ${rxFilter}` : undefined,
      rows: chartFiltered.filter((r) => r.status === statusName),
    });
  };

  const colHdr = darkMode ? ui.sidebarBg : "#f8f9fd";
  const inputSt = {
    background: ui.inputBg,
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 7,
    padding: "7px 10px",
    fontSize: "0.82rem",
    color: ui.textPrimary,
    outline: "none",
    colorScheme: darkMode ? "dark" : "light",
    fontFamily: font,
  };
  const labelSt = {
    fontSize: "0.68rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
    marginBottom: 4,
    display: "block",
  };

  const SortArrow = ({ col, isModal }) => {
    const active = isModal ? modalSortCol === col : sortCol === col;
    const dir = isModal ? modalSortDir : sortDir;
    return (
      <span
        style={{
          marginLeft: 3,
          fontSize: "0.62rem",
          opacity: active ? 1 : 0.3,
          color: FB,
        }}
      >
        {active ? (dir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    );
  };

  const statCards = [
    {
      label: "Total",
      value: chartFiltered.length,
      color: FB,
      bg: darkMode ? "#1a2744" : `${FB}10`,
      icon: "📥",
    },
    {
      label: "Approved",
      value: totalApproved,
      color: "#36a420",
      bg: darkMode ? "#0f2e1a" : "#f0fdf4",
      icon: "✅",
    },
    {
      label: "Disapproved",
      value: totalDisapproved,
      color: "#e02020",
      bg: darkMode ? "#2e0f1a" : "#fff1f3",
      icon: "❌",
    },
    {
      label: "On Process",
      value: totalOnProcess,
      color: "#f59e0b",
      bg: darkMode ? "#2e1f00" : "#fffbeb",
      icon: "⏳",
    },
    {
      label: "Approval %",
      value: approvalRate,
      color: "#9333ea",
      bg: darkMode ? "#1e1a2e" : "#f5f3ff",
      icon: "📈",
    },
  ];

  // ── Overview KPI summary data ──────────────────────────────────────────────
  const totalAll = tableData.length;
  const approvedAll = tableData.filter((r) => r.status === "Approved").length;
  const disapprovedAll = tableData.filter(
    (r) => r.status === "Disapproved",
  ).length;
  const onProcessAll = tableData.filter(
    (r) => r.status === "On Process",
  ).length;
  const approvalRateAll = totalAll
    ? ((approvedAll / totalAll) * 100).toFixed(1)
    : "0.0";
  const criticalDeadlines = DEADLINES.filter(
    (d) => d.urgency === "critical",
  ).length;
  const highFlags = COMPLIANCE_FLAGS.filter(
    (f) => f.severity === "high",
  ).length;
  const beyondTimeline = tableData.filter(
    (r) => r.timeline === "Beyond",
  ).length;

  // ── OVERVIEW VIEW ─────────────────────────────────────────────────────────
  const OverviewView = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* KPI Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
        }}
      >
        {[
          {
            icon: "📥",
            label: "Total Applications",
            value: totalAll.toLocaleString(),
            color: FB,
            sub: "All years combined",
          },
          {
            icon: "✅",
            label: "Approved",
            value: approvedAll.toLocaleString(),
            color: "#36a420",
            sub: `${approvalRateAll}% approval rate`,
          },
          {
            icon: "⏳",
            label: "On Process",
            value: onProcessAll.toLocaleString(),
            color: "#f59e0b",
            sub: "Pending completion",
          },
          {
            icon: "❌",
            label: "Disapproved",
            value: disapprovedAll.toLocaleString(),
            color: "#e02020",
            sub: "Requires review",
          },
        ].map((kpi) => (
          <Card key={kpi.label} ui={ui} style={{ padding: "14px 16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: `${kpi.color}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  flexShrink: 0,
                }}
              >
                {kpi.icon}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: ui.textMuted,
                }}
              >
                {kpi.label}
              </p>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "1.6rem",
                fontWeight: 800,
                color: kpi.color,
                lineHeight: 1,
                letterSpacing: "-0.03em",
              }}
            >
              {kpi.value}
            </p>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "0.72rem",
                color: ui.textMuted,
              }}
            >
              {kpi.sub}
            </p>
          </Card>
        ))}
      </div>

      {/* Alert row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}
      >
        {[
          {
            icon: "⏰",
            label: "Critical Deadlines",
            value: criticalDeadlines,
            color: "#e02020",
            bg: darkMode ? "#2e0f0f" : "#fff1f2",
            desc: "Due within 2 days",
            action: () => setActiveNav("deadlines"),
          },
          {
            icon: "🚩",
            label: "High Compliance Flags",
            value: highFlags,
            color: "#f59e0b",
            bg: darkMode ? "#2e1f00" : "#fffbeb",
            desc: "Require immediate attention",
            action: () => setActiveNav("compliance"),
          },
          {
            icon: "📤",
            label: "Beyond Timeline",
            value: beyondTimeline,
            color: "#9333ea",
            bg: darkMode ? "#1e1a2e" : "#f5f3ff",
            desc: "Applications past due",
            action: () => setActiveNav("records"),
          },
        ].map((alert) => (
          <Card
            key={alert.label}
            ui={ui}
            style={{
              background: alert.bg,
              borderColor: `${alert.color}30`,
              cursor: "pointer",
            }}
            onClick={alert.action}
          >
            <div
              style={{
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${alert.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                  flexShrink: 0,
                }}
              >
                {alert.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "1.4rem",
                    fontWeight: 800,
                    color: alert.color,
                    lineHeight: 1,
                  }}
                >
                  {alert.value}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: alert.color,
                  }}
                >
                  {alert.label}
                </p>
                <p
                  style={{
                    margin: "1px 0 0",
                    fontSize: "0.7rem",
                    color: ui.textMuted,
                  }}
                >
                  {alert.desc}
                </p>
              </div>
              <span style={{ color: alert.color, fontSize: "1rem" }}>›</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Middle row: User load + Activity feed */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* User load */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.88rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            User Load
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {currentEvaluators.map((ev) => {
              const tasks = tableData.filter((d) => d.evaluator === ev);
              const approved = tasks.filter(
                (t) => t.status === "Approved",
              ).length;
              const onProc = tasks.filter(
                (t) => t.status === "On Process",
              ).length;
              const av = getAvatarColor(ev, uniqueEvaluators);
              const pct = tasks.length
                ? Math.round((approved / tasks.length) * 100)
                : 0;
              const role = USER_ROLE_MAP[ev] || "User";
              return (
                <Card
                  key={ev}
                  ui={ui}
                  style={{ padding: "10px 12px", cursor: "pointer" }}
                  onClick={() => setModalEval(ev)}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: av.bg,
                        color: av.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(ev)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 1,
                        }}
                      >
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              color: ui.textPrimary,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {ev}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.66rem",
                              color: ui.textMuted,
                            }}
                          >
                            {role}
                          </p>
                        </div>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: ui.textMuted,
                            flexShrink: 0,
                            marginLeft: 8,
                          }}
                        >
                          {tasks.length} tasks
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 4,
                          alignItems: "center",
                          marginTop: 4,
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            height: 4,
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
                              background: pct >= 70 ? "#36a420" : FB,
                              transition: "width 0.4s",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            color: ui.textMuted,
                            flexShrink: 0,
                            minWidth: 28,
                          }}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 99,
                          background: "#36a42018",
                          color: "#36a420",
                        }}
                      >
                        {approved}✅
                      </span>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 99,
                          background: "#f59e0b18",
                          color: "#f59e0b",
                        }}
                      >
                        {onProc}⏳
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.88rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              Recent Activity
            </p>
            <button
              onClick={() => setActiveNav("activity")}
              style={{
                background: "none",
                border: "none",
                color: FB,
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
              }}
            >
              See all
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ACTIVITY_FEED.slice(0, 6).map((act) => (
              <Card key={act.id} ui={ui} style={{ padding: "10px 12px" }}>
                <div
                  style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: `${act.color}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.9rem",
                      flexShrink: 0,
                    }}
                  >
                    {act.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.78rem",
                        color: ui.textPrimary,
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{act.user}</span>{" "}
                      <span style={{ color: ui.textSub }}>{act.action}</span>
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "0.7rem",
                        color: ui.textMuted,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {act.target}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "0.67rem",
                      color: ui.textMuted,
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {act.time}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Prescription breakdown */}
      <div>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: "0.88rem",
            fontWeight: 700,
            color: ui.textPrimary,
          }}
        >
          Applications by Prescription Type
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
          }}
        >
          {["Prescription Drug (RX)", "Over-the-Counter (OTC)", "Vaccine"].map(
            (type) => {
              const count = tableData.filter(
                (r) => r.prescription === type,
              ).length;
              const pct = totalAll
                ? ((count / totalAll) * 100).toFixed(1)
                : "0";
              const rxc = darkMode ? rxColorsDark[type] : rxColors[type];
              return (
                <Card key={type} ui={ui} style={{ padding: "14px 16px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color: rxc?.color,
                      }}
                    >
                      {rxShortLabel(type)} — {type}
                    </p>
                    <span
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 800,
                        color: rxc?.color,
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: "1.4rem",
                      fontWeight: 800,
                      color: ui.textPrimary,
                    }}
                  >
                    {count}
                  </p>
                  <div
                    style={{
                      height: 5,
                      borderRadius: 99,
                      background: ui.progressBg,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        borderRadius: 99,
                        background: rxc?.color,
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                </Card>
              );
            },
          )}
        </div>
      </div>
    </div>
  );

  // ── Records View ──────────────────────────────────────────────────────────
  const RecordsView = () => (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "stretch",
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          flex: "0 0 272px",
          minWidth: 240,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <p
          style={{
            fontSize: "0.9rem",
            fontWeight: 700,
            color: ui.textPrimary,
            margin: "0 0 8px",
          }}
        >
          Tasks per User
        </p>
        <Card
          ui={ui}
          style={{ flex: 1, display: "flex", flexDirection: "column" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 52px",
              background: colHdr,
              borderBottom: `1px solid ${ui.divider}`,
              padding: "8px 14px",
            }}
          >
            {["User", "Tasks"].map((col, i) => (
              <span
                key={col}
                style={{
                  fontSize: "0.67rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: ui.textMuted,
                  ...(i === 1 ? { textAlign: "center" } : {}),
                }}
              >
                {col}
              </span>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            {currentEvaluators.map((ev, i) => {
              const count = tableData.filter((d) => d.evaluator === ev).length;
              const maxC = Math.max(
                ...currentEvaluators.map(
                  (e) => tableData.filter((d) => d.evaluator === e).length,
                ),
              );
              const av = getAvatarColor(ev, uniqueEvaluators);
              const role = USER_ROLE_MAP[ev] || "User";
              return (
                <div
                  key={ev}
                  onClick={() => setModalEval(ev)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 52px",
                    padding: "8px 14px",
                    borderBottom:
                      i < currentEvaluators.length - 1
                        ? `1px solid ${ui.divider}`
                        : "none",
                    cursor: "pointer",
                    transition: "background 0.12s",
                    alignItems: "center",
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
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: av.bg,
                        color: av.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        border: `1.5px solid ${av.color}33`,
                      }}
                    >
                      {getInitials(ev)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.8rem",
                          fontWeight: 500,
                          color: ui.textPrimary,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {ev}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.65rem",
                          color: ui.textMuted,
                        }}
                      >
                        {role}
                      </p>
                      <div
                        style={{
                          marginTop: 3,
                          height: 3,
                          borderRadius: 99,
                          background: ui.progressBg,
                        }}
                      >
                        <div
                          style={{
                            height: 3,
                            borderRadius: 99,
                            background: av.color,
                            width: `${(count / maxC) * 100}%`,
                            transition: "width 0.4s",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 800,
                      color: FB,
                      textAlign: "center",
                    }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
          <div
            style={{
              padding: "7px 14px",
              borderTop: `1px solid ${ui.divider}`,
              background: colHdr,
            }}
          >
            <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
              {currentEvaluators.length} users · {tableData.length} total
            </span>
          </div>
        </Card>
      </div>

      <div
        style={{
          flex: "1 1 360px",
          minWidth: 300,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <p
          style={{
            fontSize: "0.9rem",
            fontWeight: 700,
            color: ui.textPrimary,
            margin: "0 0 8px",
          }}
        >
          All Records
        </p>
        <Card
          ui={ui}
          style={{ flex: 1, display: "flex", flexDirection: "column" }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: `1px solid ${ui.divider}`,
              background: colHdr,
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            {[
              { label: "From", val: dateFrom, set: setDateFrom },
              { label: "To", val: dateTo, set: setDateTo },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label style={labelSt}>{label}</label>
                <input
                  type="date"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  style={inputSt}
                />
              </div>
            ))}
            <div>
              <label style={labelSt}>User</label>
              <select
                value={evaluatorFilter}
                onChange={(e) => setEvalFilter(e.target.value)}
                style={{ ...inputSt, minWidth: 150 }}
              >
                <option value="">All Users</option>
                {currentEvaluators.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev} ({USER_ROLE_MAP[ev] || "User"})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setEvalFilter("");
                setPage(1);
              }}
              style={{
                padding: "7px 14px",
                fontSize: "0.8rem",
                fontWeight: 500,
                borderRadius: 7,
                border: `1px solid ${ui.cardBorder}`,
                background: "transparent",
                color: ui.textMuted,
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              Reset
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1.3fr 2fr 1fr 0.8fr",
              background: colHdr,
              borderBottom: `1px solid ${ui.divider}`,
            }}
          >
            {[
              { label: "DTN", col: "dtn" },
              { label: "User", col: "evaluator" },
              { label: "Drug / Application", col: "drugName" },
              { label: "Date", col: "date" },
              { label: "Timeline", col: "timeline" },
            ].map(({ label, col }) => (
              <span
                key={col}
                onClick={() => toggleSort(col)}
                style={{
                  fontSize: "0.67rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: sortCol === col ? FB : ui.textMuted,
                  textAlign: "center",
                  padding: "8px 12px",
                  cursor: "pointer",
                  userSelect: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 0.15s",
                }}
              >
                {label}
                <SortArrow col={col} />
              </span>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            {paginated.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: ui.textMuted,
                  fontSize: "0.84rem",
                }}
              >
                No records found
              </div>
            ) : (
              paginated.map((row, i) => {
                const tlStyle = (darkMode
                  ? timelineColorsDark
                  : timelineColors)[row.timeline] || {
                  bg: "#f3f4f6",
                  color: "#374151",
                };
                const role = USER_ROLE_MAP[row.evaluator] || "User";
                return (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.6fr 1.3fr 2fr 1fr 0.8fr",
                      borderBottom:
                        i < paginated.length - 1
                          ? `1px solid ${ui.divider}`
                          : "none",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = ui.hoverBg)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: FB,
                        fontWeight: 700,
                        textAlign: "center",
                        padding: "10px 12px",
                        fontFamily: "monospace",
                      }}
                    >
                      {row.dtn}
                    </span>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: ui.textPrimary,
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        padding: "10px 12px",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: getAvatarColor(
                              row.evaluator,
                              uniqueEvaluators,
                            ).color,
                            flexShrink: 0,
                          }}
                        />
                        {row.evaluator}
                      </span>
                      <span
                        style={{ fontSize: "0.65rem", color: ui.textMuted }}
                      >
                        {role}
                      </span>
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: ui.textSub,
                        padding: "10px 12px",
                        alignSelf: "center",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.drugName}
                    </span>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: ui.textPrimary,
                        textAlign: "center",
                        padding: "10px 12px",
                      }}
                    >
                      {new Date(row.date + "T00:00:00").toLocaleDateString(
                        "en-PH",
                        { year: "numeric", month: "short", day: "numeric" },
                      )}
                    </span>
                    <span
                      style={{
                        padding: "10px 12px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.71rem",
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: 99,
                          background: tlStyle.bg,
                          color: tlStyle.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.timeline}
                      </span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <div
            style={{
              padding: "7px 14px",
              borderTop: `1px solid ${ui.divider}`,
              background: colHdr,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "0.73rem", color: ui.textMuted }}>
              {filtered.length} of {tableData.length} records
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  background: "transparent",
                  border: `1px solid ${ui.cardBorder}`,
                  borderRadius: 5,
                  color: page === 1 ? ui.textMuted : ui.textPrimary,
                  cursor: page === 1 ? "not-allowed" : "pointer",
                  padding: "2px 8px",
                  fontSize: "0.78rem",
                  fontFamily: font,
                }}
              >
                ‹
              </button>
              <span style={{ fontSize: "0.73rem", color: ui.textMuted }}>
                {page} / {totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  background: "transparent",
                  border: `1px solid ${ui.cardBorder}`,
                  borderRadius: 5,
                  color: page >= totalPages ? ui.textMuted : ui.textPrimary,
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                  padding: "2px 8px",
                  fontSize: "0.78rem",
                  fontFamily: font,
                }}
              >
                ›
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  // ── Analytics computed extras ─────────────────────────────────────────────
  const evalStats = useMemo(
    () =>
      currentEvaluators
        .map((ev) => {
          const tasks = chartFiltered.filter((r) => r.evaluator === ev);
          const approved = tasks.filter((r) => r.status === "Approved").length;
          const disapproved = tasks.filter(
            (r) => r.status === "Disapproved",
          ).length;
          const onProcess = tasks.filter(
            (r) => r.status === "On Process",
          ).length;
          const rate = tasks.length
            ? ((approved / tasks.length) * 100).toFixed(1)
            : "0.0";
          const beyond = tasks.filter((r) => r.timeline === "Beyond").length;
          return {
            name: ev,
            total: tasks.length,
            approved,
            disapproved,
            onProcess,
            rate: parseFloat(rate),
            beyond,
          };
        })
        .sort((a, b) => b.total - a.total),
    [chartFiltered, currentEvaluators],
  );

  const drugStats = useMemo(() => {
    const map = {};
    chartFiltered.forEach((r) => {
      if (!map[r.drugName])
        map[r.drugName] = {
          name: r.drugName,
          total: 0,
          approved: 0,
          disapproved: 0,
          onProcess: 0,
          rx: r.prescription,
        };
      map[r.drugName].total++;
      if (r.status === "Approved") map[r.drugName].approved++;
      else if (r.status === "Disapproved") map[r.drugName].disapproved++;
      else map[r.drugName].onProcess++;
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [chartFiltered]);

  const timelineSplit = useMemo(
    () => ({
      within: chartFiltered.filter((r) => r.timeline === "Within").length,
      beyond: chartFiltered.filter((r) => r.timeline === "Beyond").length,
    }),
    [chartFiltered],
  );

  const yearSummary = useMemo(
    () =>
      availableYears
        .filter((y) => y !== "All")
        .map((y) => {
          const rows = tableData.filter(
            (r) => new Date(r.date + "T00:00:00").getFullYear() === Number(y),
          );
          const approved = rows.filter((r) => r.status === "Approved").length;
          const disapproved = rows.filter(
            (r) => r.status === "Disapproved",
          ).length;
          const onProcess = rows.filter(
            (r) => r.status === "On Process",
          ).length;
          const rate = rows.length
            ? ((approved / rows.length) * 100).toFixed(1)
            : "0.0";
          return {
            year: y,
            total: rows.length,
            approved,
            disapproved,
            onProcess,
            rate,
          };
        }),
    [tableData, availableYears],
  );

  const rxSplit = useMemo(() => {
    const types = [
      "Prescription Drug (RX)",
      "Over-the-Counter (OTC)",
      "Vaccine",
    ];
    return types.map((type) => {
      const rows = chartFiltered.filter((r) => r.prescription === type);
      const approved = rows.filter((r) => r.status === "Approved").length;
      return {
        type,
        count: rows.length,
        approved,
        rate: rows.length ? ((approved / rows.length) * 100).toFixed(1) : "0.0",
      };
    });
  }, [chartFiltered]);

  // ── Analytics View ────────────────────────────────────────────────────────
  const AnalyticsView = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header + Filters */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: ui.textPrimary,
              margin: 0,
            }}
          >
            Analytics Overview
          </h2>
          <p
            style={{
              fontSize: "0.77rem",
              color: ui.textMuted,
              margin: "2px 0 0",
            }}
          >
            Comprehensive application analytics · click charts for details
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <div>
            <label style={labelSt}>Prescription</label>
            <div
              style={{
                display: "flex",
                background: darkMode ? ui.inputBg : "#e4e6eb",
                borderRadius: 9,
                padding: 3,
                gap: 2,
              }}
            >
              {PRESCRIPTION_TYPES.map((pt) => {
                const isAct = rxFilter === pt;
                const lbl =
                  pt === "All"
                    ? "All"
                    : pt === "Over-the-Counter (OTC)"
                      ? "OTC"
                      : pt === "Vaccine"
                        ? "Vaccine"
                        : "RX";
                return (
                  <button
                    key={pt}
                    onClick={() => setRxFilter(pt)}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.74rem",
                      fontWeight: isAct ? 700 : 500,
                      borderRadius: 6,
                      border: "none",
                      background: isAct ? ui.cardBg : "transparent",
                      color: isAct ? FB : ui.textMuted,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      boxShadow: isAct ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                      whiteSpace: "nowrap",
                      fontFamily: font,
                    }}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label style={labelSt}>Year</label>
            <select
              value={chartYear}
              onChange={(e) => {
                setChartYear(e.target.value);
                setChartMonth("All");
              }}
              style={{ ...inputSt, minWidth: 85 }}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelSt}>Month</label>
            <select
              value={chartMonth}
              onChange={(e) => setChartMonth(e.target.value)}
              disabled={chartYear === "All"}
              style={{
                ...inputSt,
                minWidth: 110,
                opacity: chartYear === "All" ? 0.4 : 1,
                cursor: chartYear === "All" ? "not-allowed" : "pointer",
              }}
            >
              <option value="All">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {MONTHS[m]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: 10,
        }}
      >
        {statCards.map((s) => (
          <Card
            key={s.label}
            ui={ui}
            style={{
              background: s.bg,
              borderColor: `${s.color}28`,
              padding: "12px 14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: `${s.color}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.95rem",
                  flexShrink: 0,
                }}
              >
                {s.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: s.color,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: s.color,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.2,
                  }}
                >
                  {s.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Row 1: Trend chart + Donut */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <Card ui={ui}>
          <div style={{ padding: "14px 16px 0" }}>
            <h2
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color: ui.textPrimary,
                margin: 0,
              }}
            >
              Trend Overview
            </h2>
            <p
              style={{
                fontSize: "0.8rem",
                color: ui.textSub,
                margin: "2px 0 0",
              }}
            >
              Grouped by {chartYear === "All" ? "year" : "month"}
            </p>
          </div>
          <div style={{ padding: "4px 16px 14px" }}>
            {areaData.length === 0 ? (
              <div
                style={{
                  height: 160,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: ui.textMuted,
                  fontSize: "0.84rem",
                }}
              >
                No data
              </div>
            ) : (
              <MonAreaChart data={areaData} subtitle={areaSub} ui={ui} />
            )}
          </div>
        </Card>
        <Card ui={ui} style={{ padding: "14px" }}>
          <h2
            style={{
              fontSize: "1.05rem",
              fontWeight: 700,
              color: ui.textPrimary,
              margin: "0 0 2px",
            }}
          >
            Approval Breakdown
          </h2>
          <p
            style={{
              fontSize: "0.8rem",
              color: ui.textSub,
              margin: "0 0 10px",
            }}
          >
            Click a slice to view records
          </p>
          {chartFiltered.length === 0 ? (
            <div
              style={{
                height: 160,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: ui.textMuted,
                fontSize: "0.84rem",
              }}
            >
              No data
            </div>
          ) : (
            <DonutChart
              data={pieData}
              ui={ui}
              darkMode={darkMode}
              onSliceClick={handleSliceClick}
            />
          )}
        </Card>
      </div>

      {/* Row 2: Timeline Split + Prescription Split + Year-by-Year Table */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1.4fr",
          gap: 14,
        }}
      >
        {/* Timeline Split */}
        <Card ui={ui} style={{ padding: "14px 16px" }}>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "0.9rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            ⏱ Timeline Status
          </p>
          {[
            {
              label: "Within Timeline",
              val: timelineSplit.within,
              color: "#36a420",
              bg: darkMode ? "#0f2e1a" : "#f0fdf4",
            },
            {
              label: "Beyond Timeline",
              val: timelineSplit.beyond,
              color: "#e02020",
              bg: darkMode ? "#2e0f0f" : "#fff1f2",
            },
          ].map((item) => {
            const total = timelineSplit.within + timelineSplit.beyond;
            const pct = total ? ((item.val / total) * 100).toFixed(1) : "0.0";
            return (
              <div key={item.label} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 5,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: item.color,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      color: item.color,
                    }}
                  >
                    {item.val}{" "}
                    <span style={{ fontWeight: 400, color: ui.textMuted }}>
                      ({pct}%)
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    height: 10,
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
                      background: item.color,
                      transition: "width 0.4s",
                    }}
                  />
                </div>
              </div>
            );
          })}
          <div
            style={{
              marginTop: 8,
              padding: "8px 10px",
              borderRadius: 8,
              background: darkMode ? "#1a1a2e" : "#f5f3ff",
              border: `1px solid #9333ea30`,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.7rem",
                color: "#9333ea",
                fontWeight: 600,
              }}
            >
              ⚠ {timelineSplit.beyond} applications past due deadline
            </p>
          </div>
        </Card>

        {/* Prescription Split */}
        <Card ui={ui} style={{ padding: "14px 16px" }}>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "0.9rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            💊 By Classification
          </p>
          {rxSplit.map((item, idx) => {
            const colors = ["#1877F2", "#f59e0b", "#36a420"];
            const short =
              item.type === "Prescription Drug (RX)"
                ? "RX"
                : item.type === "Over-the-Counter (OTC)"
                  ? "OTC"
                  : "Vaccine";
            const total = chartFiltered.length;
            const pct = total ? ((item.count / total) * 100).toFixed(1) : "0.0";
            return (
              <div key={item.type} style={{ marginBottom: 10 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        padding: "1px 7px",
                        borderRadius: 99,
                        background: `${colors[idx]}18`,
                        color: colors[idx],
                      }}
                    >
                      {short}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: ui.textSub }}>
                      {item.count} apps
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: colors[idx],
                    }}
                  >
                    {item.rate}% approved
                  </span>
                </div>
                <div
                  style={{
                    height: 7,
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
                      background: colors[idx],
                      transition: "width 0.4s",
                    }}
                  />
                </div>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: "0.67rem",
                    color: ui.textMuted,
                  }}
                >
                  {pct}% of total
                </p>
              </div>
            );
          })}
        </Card>

        {/* ── Year-by-Year Summary — now with ⏳ On Process column ── */}
        <Card ui={ui} style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "12px 14px 8px",
              borderBottom: `1px solid ${ui.divider}`,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              📅 Year-by-Year Summary
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr",
              background: colHdr,
              borderBottom: `1px solid ${ui.divider}`,
            }}
          >
            {["Year", "Total", "✅", "❌", "⏳", "Rate"].map((h, i) => (
              <span
                key={h}
                style={{
                  fontSize: "0.63rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: ui.textMuted,
                  padding: "7px 10px",
                  textAlign: i > 0 ? "center" : "left",
                }}
              >
                {h}
              </span>
            ))}
          </div>
          {yearSummary.map((row, i) => (
            <div
              key={row.year}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr",
                borderBottom:
                  i < yearSummary.length - 1
                    ? `1px solid ${ui.divider}`
                    : "none",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = ui.hoverBg)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: FB,
                  padding: "8px 10px",
                }}
              >
                {row.year}
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: ui.textPrimary,
                  padding: "8px 10px",
                  textAlign: "center",
                }}
              >
                {row.total}
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#36a420",
                  padding: "8px 10px",
                  textAlign: "center",
                }}
              >
                {row.approved}
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#e02020",
                  padding: "8px 10px",
                  textAlign: "center",
                }}
              >
                {row.disapproved}
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#f59e0b",
                  padding: "8px 10px",
                  textAlign: "center",
                }}
              >
                {row.onProcess}
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  padding: "8px 10px",
                  textAlign: "center",
                  color: parseFloat(row.rate) >= 60 ? "#36a420" : "#f59e0b",
                }}
              >
                {row.rate}%
              </span>
            </div>
          ))}
        </Card>
      </div>

      {/* Row 3: User Performance Bar Chart */}
      <Card ui={ui} style={{ padding: "14px 16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              👤 User Performance
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "0.72rem",
                color: ui.textMuted,
              }}
            >
              Tasks handled · approval rate per user
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, fontSize: "0.7rem" }}>
            {[
              { color: "#36a420", label: "Approved" },
              { color: "#e02020", label: "Disapproved" },
              { color: "#f59e0b", label: "On Process" },
            ].map((l) => (
              <div
                key={l.label}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: l.color,
                  }}
                />
                <span style={{ color: ui.textMuted }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {evalStats.map((ev) => {
            const av = getAvatarColor(ev.name, uniqueEvaluators);
            const maxTotal = Math.max(...evalStats.map((e) => e.total), 1);
            const role = USER_ROLE_MAP[ev.name] || "User";
            return (
              <div
                key={ev.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr 60px",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: av.bg,
                      color: av.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(ev.name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: ui.textPrimary,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {ev.name}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.63rem",
                        color: ui.textMuted,
                      }}
                    >
                      {role} · {ev.total} tasks
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    position: "relative",
                    height: 18,
                    borderRadius: 6,
                    overflow: "hidden",
                    background: ui.progressBg,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      height: "100%",
                      width: `${(ev.approved / maxTotal) * 100}%`,
                      background: "#36a420",
                      borderRadius: "6px 0 0 6px",
                      transition: "width 0.4s",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: `${(ev.approved / maxTotal) * 100}%`,
                      top: 0,
                      height: "100%",
                      width: `${(ev.disapproved / maxTotal) * 100}%`,
                      background: "#e02020",
                      transition: "width 0.4s, left 0.4s",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: `${((ev.approved + ev.disapproved) / maxTotal) * 100}%`,
                      top: 0,
                      height: "100%",
                      width: `${(ev.onProcess / maxTotal) * 100}%`,
                      background: "#f59e0b",
                      borderRadius: "0 6px 6px 0",
                      transition: "width 0.4s, left 0.4s",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: ev.total > 5 ? "#fff" : ui.textMuted,
                      }}
                    >
                      ✅{ev.approved} ❌{ev.disapproved} ⏳{ev.onProcess}
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: ev.rate >= 60 ? "#36a420" : "#f59e0b",
                    textAlign: "right",
                  }}
                >
                  {ev.rate}%
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Row 4: Top Drugs + Beyond Timeline per User */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}
      >
        {/* Top Drugs */}
        <Card ui={ui} style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "12px 14px 8px",
              borderBottom: `1px solid ${ui.divider}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              💊 Top Drug Applications
            </p>
            <span style={{ fontSize: "0.7rem", color: ui.textMuted }}>
              Top 8 by volume
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 60px 60px 60px 70px",
              background: colHdr,
              borderBottom: `1px solid ${ui.divider}`,
            }}
          >
            {["Drug", "Total", "✅", "❌", "Rate"].map((h, i) => (
              <span
                key={h}
                style={{
                  fontSize: "0.63rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: ui.textMuted,
                  padding: "7px 10px",
                  textAlign: i > 0 ? "center" : "left",
                }}
              >
                {h}
              </span>
            ))}
          </div>
          {drugStats.map((drug, i) => {
            const rxShort =
              drug.rx === "Prescription Drug (RX)"
                ? "RX"
                : drug.rx === "Over-the-Counter (OTC)"
                  ? "OTC"
                  : "VAX";
            const rxClr =
              drug.rx === "Prescription Drug (RX)"
                ? FB
                : drug.rx === "Over-the-Counter (OTC)"
                  ? "#f59e0b"
                  : "#36a420";
            const rate = drug.total
              ? ((drug.approved / drug.total) * 100).toFixed(0)
              : "0";
            return (
              <div
                key={drug.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 60px 60px 60px 70px",
                  borderBottom:
                    i < drugStats.length - 1
                      ? `1px solid ${ui.divider}`
                      : "none",
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
                    padding: "8px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      padding: "1px 5px",
                      borderRadius: 4,
                      background: `${rxClr}18`,
                      color: rxClr,
                      flexShrink: 0,
                    }}
                  >
                    {rxShort}
                  </span>
                  <span
                    style={{
                      fontSize: "0.76rem",
                      fontWeight: 500,
                      color: ui.textPrimary,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {drug.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: FB,
                    padding: "8px 10px",
                    textAlign: "center",
                    alignSelf: "center",
                  }}
                >
                  {drug.total}
                </span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#36a420",
                    padding: "8px 10px",
                    textAlign: "center",
                    alignSelf: "center",
                  }}
                >
                  {drug.approved}
                </span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#e02020",
                    padding: "8px 10px",
                    textAlign: "center",
                    alignSelf: "center",
                  }}
                >
                  {drug.disapproved}
                </span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    padding: "8px 10px",
                    textAlign: "center",
                    alignSelf: "center",
                    color: parseInt(rate) >= 60 ? "#36a420" : "#f59e0b",
                  }}
                >
                  {rate}%
                </span>
              </div>
            );
          })}
        </Card>

        {/* Beyond Timeline per User */}
        <Card ui={ui} style={{ padding: "14px 16px" }}>
          <p
            style={{
              margin: "0 0 4px",
              fontSize: "0.9rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            ⚠ Beyond Timeline
          </p>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "0.72rem",
              color: ui.textMuted,
            }}
          >
            Applications past deadline per user
          </p>
          {evalStats.map((ev) => {
            const av = getAvatarColor(ev.name, uniqueEvaluators);
            const pct = ev.total
              ? ((ev.beyond / ev.total) * 100).toFixed(0)
              : "0";
            const clr =
              parseInt(pct) >= 50
                ? "#e02020"
                : parseInt(pct) >= 25
                  ? "#f59e0b"
                  : "#36a420";
            const role = USER_ROLE_MAP[ev.name] || "User";
            return (
              <div key={ev.name} style={{ marginBottom: 10 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: av.bg,
                      color: av.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.55rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(ev.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: ui.textPrimary,
                      }}
                    >
                      {ev.name}
                    </span>
                    <div style={{ fontSize: "0.62rem", color: ui.textMuted }}>
                      {role}
                    </div>
                  </div>
                  <span
                    style={{ fontSize: "0.75rem", fontWeight: 800, color: clr }}
                  >
                    {ev.beyond}{" "}
                    <span
                      style={{
                        fontWeight: 400,
                        color: ui.textMuted,
                        fontSize: "0.68rem",
                      }}
                    >
                      ({pct}%)
                    </span>
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
                      width: `${pct}%`,
                      borderRadius: 99,
                      background: clr,
                      transition: "width 0.4s",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );

  // ── Deadlines View ────────────────────────────────────────────────────────
  const DeadlinesView = () => {
    const filteredDeadlines =
      deadlineFilter === "all"
        ? DEADLINES
        : DEADLINES.filter((d) => d.urgency === deadlineFilter);
    return (
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              Upcoming Deadlines
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "0.75rem",
                color: ui.textMuted,
              }}
            >
              Applications approaching their evaluation deadline
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 4,
              background: darkMode ? ui.inputBg : "#e4e6eb",
              borderRadius: 9,
              padding: 3,
            }}
          >
            {[
              { key: "all", label: "All" },
              { key: "critical", label: "🔴 Critical" },
              { key: "warning", label: "🟡 Warning" },
              { key: "normal", label: "🟢 Normal" },
            ].map(({ key, label }) => {
              const isAct = deadlineFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setDeadlineFilter(key)}
                  style={{
                    padding: "4px 12px",
                    fontSize: "0.74rem",
                    fontWeight: isAct ? 700 : 500,
                    borderRadius: 6,
                    border: "none",
                    background: isAct ? ui.cardBg : "transparent",
                    color: isAct ? FB : ui.textMuted,
                    cursor: "pointer",
                    fontFamily: font,
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginBottom: 14,
          }}
        >
          {[
            {
              label: "Critical",
              count: DEADLINES.filter((d) => d.urgency === "critical").length,
              color: "#e02020",
              bg: darkMode ? "#2e0f0f" : "#fff1f2",
              desc: "Due in ≤ 2 days",
            },
            {
              label: "Warning",
              count: DEADLINES.filter((d) => d.urgency === "warning").length,
              color: "#f59e0b",
              bg: darkMode ? "#2e1f00" : "#fffbeb",
              desc: "Due in 3–5 days",
            },
            {
              label: "Normal",
              count: DEADLINES.filter((d) => d.urgency === "normal").length,
              color: "#36a420",
              bg: darkMode ? "#0f2e1a" : "#f0fdf4",
              desc: "Due in 6+ days",
            },
          ].map((s) => (
            <Card
              key={s.label}
              ui={ui}
              style={{
                background: s.bg,
                borderColor: `${s.color}30`,
                padding: "12px 14px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: s.color,
                }}
              >
                {s.count}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: s.color,
                }}
              >
                {s.label}
              </p>
              <p
                style={{
                  margin: "1px 0 0",
                  fontSize: "0.7rem",
                  color: ui.textMuted,
                }}
              >
                {s.desc}
              </p>
            </Card>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredDeadlines.map((d) => {
            const urgColors = {
              critical: {
                color: "#e02020",
                bg: darkMode ? "#2e0f0f" : "#fff1f2",
                dot: "#e02020",
              },
              warning: {
                color: "#f59e0b",
                bg: darkMode ? "#2e1f00" : "#fffbeb",
                dot: "#f59e0b",
              },
              normal: {
                color: "#36a420",
                bg: darkMode ? "#0f2e1a" : "#f0fdf4",
                dot: "#36a420",
              },
            };
            const uc = urgColors[d.urgency];
            const SPC = darkMode ? stepColorsDark : stepColors;
            const spc = SPC[d.step] || { bg: "#f3f4f6", color: "#374151" };
            const role = USER_ROLE_MAP[d.evaluator] || "User";
            return (
              <Card
                key={d.dtn}
                ui={ui}
                style={{ borderColor: `${uc.color}30` }}
              >
                <div
                  style={{
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: uc.dot,
                      flexShrink: 0,
                      boxShadow: `0 0 0 3px ${uc.dot}30`,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontFamily: "monospace",
                          color: FB,
                          fontWeight: 700,
                        }}
                      >
                        {d.dtn}
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: spc.bg,
                          color: spc.color,
                        }}
                      >
                        {d.step}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.82rem",
                        color: ui.textPrimary,
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {d.drug}
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "0.72rem",
                        color: ui.textMuted,
                      }}
                    >
                      Assigned to: {d.evaluator}{" "}
                      <span style={{ color: ui.textMuted }}>({role})</span>
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: uc.color,
                      }}
                    >
                      {d.deadline}
                    </p>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: uc.bg,
                        color: uc.color,
                        textTransform: "capitalize",
                      }}
                    >
                      {d.urgency}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Compliance Flags View ─────────────────────────────────────────────────
  const ComplianceView = () => {
    const filteredFlags =
      complianceFilter === "all"
        ? COMPLIANCE_FLAGS
        : COMPLIANCE_FLAGS.filter((f) => f.severity === complianceFilter);
    return (
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              Compliance Flags
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "0.75rem",
                color: ui.textMuted,
              }}
            >
              Applications flagged for compliance issues
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 4,
              background: darkMode ? ui.inputBg : "#e4e6eb",
              borderRadius: 9,
              padding: 3,
            }}
          >
            {[
              { key: "all", label: "All" },
              { key: "high", label: "🔴 High" },
              { key: "medium", label: "🟡 Medium" },
              { key: "low", label: "🟢 Low" },
            ].map(({ key, label }) => {
              const isAct = complianceFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setComplianceFilter(key)}
                  style={{
                    padding: "4px 12px",
                    fontSize: "0.74rem",
                    fontWeight: isAct ? 700 : 500,
                    borderRadius: 6,
                    border: "none",
                    background: isAct ? ui.cardBg : "transparent",
                    color: isAct ? FB : ui.textMuted,
                    cursor: "pointer",
                    fontFamily: font,
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginBottom: 14,
          }}
        >
          {[
            {
              label: "High Severity",
              count: COMPLIANCE_FLAGS.filter((f) => f.severity === "high")
                .length,
              color: "#e02020",
              bg: darkMode ? "#2e0f0f" : "#fff1f2",
            },
            {
              label: "Medium Severity",
              count: COMPLIANCE_FLAGS.filter((f) => f.severity === "medium")
                .length,
              color: "#f59e0b",
              bg: darkMode ? "#2e1f00" : "#fffbeb",
            },
            {
              label: "Low Severity",
              count: COMPLIANCE_FLAGS.filter((f) => f.severity === "low")
                .length,
              color: "#36a420",
              bg: darkMode ? "#0f2e1a" : "#f0fdf4",
            },
          ].map((s) => (
            <Card
              key={s.label}
              ui={ui}
              style={{
                background: s.bg,
                borderColor: `${s.color}30`,
                padding: "12px 14px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: s.color,
                }}
              >
                {s.count}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: s.color,
                }}
              >
                {s.label}
              </p>
            </Card>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredFlags.map((flag) => {
            const sevColors = {
              high: { color: "#e02020", bg: darkMode ? "#2e0f0f" : "#fff1f2" },
              medium: {
                color: "#f59e0b",
                bg: darkMode ? "#2e1f00" : "#fffbeb",
              },
              low: { color: "#36a420", bg: darkMode ? "#0f2e1a" : "#f0fdf4" },
            };
            const sc = sevColors[flag.severity];
            const role = USER_ROLE_MAP[flag.evaluator] || "User";
            return (
              <Card
                key={flag.dtn}
                ui={ui}
                style={{ borderColor: `${sc.color}30` }}
              >
                <div style={{ padding: "12px 14px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontFamily: "monospace",
                            color: FB,
                            fontWeight: 700,
                          }}
                        >
                          {flag.dtn}
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 99,
                            background: sc.bg,
                            color: sc.color,
                            textTransform: "capitalize",
                          }}
                        >
                          {flag.severity}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.84rem",
                          fontWeight: 600,
                          color: ui.textPrimary,
                        }}
                      >
                        {flag.drug}
                      </p>
                      <p
                        style={{
                          margin: "3px 0 0",
                          fontSize: "0.78rem",
                          color: ui.textMuted,
                        }}
                      >
                        User: {flag.evaluator}{" "}
                        <span style={{ color: ui.textMuted }}>({role})</span>
                      </p>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.72rem",
                        color: ui.textMuted,
                        flexShrink: 0,
                      }}
                    >
                      {flag.flaggedDate}
                    </p>
                  </div>
                  <div
                    style={{
                      padding: "8px 10px",
                      borderRadius: 7,
                      background: `${sc.color}10`,
                      border: `1px solid ${sc.color}25`,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.78rem",
                        color: sc.color,
                        fontWeight: 500,
                      }}
                    >
                      🚩 {flag.reason}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Workload Heatmap View ─────────────────────────────────────────────────
  const WorkloadView = () => {
    const weeks = ["Wk1", "Wk2", "Wk3", "Wk4"];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const maxVal = 8;
    const getColor = (val, dark) => {
      if (val === 0) return dark ? "#242526" : "#e4e6eb";
      const intensity = val / maxVal;
      if (dark) {
        if (intensity < 0.25) return "#1a2e4a";
        if (intensity < 0.5) return "#1550a0";
        if (intensity < 0.75) return "#1877F2";
        return "#5da4f8";
      } else {
        if (intensity < 0.25) return "#bfdbfe";
        if (intensity < 0.5) return "#60a5fa";
        if (intensity < 0.75) return "#2563eb";
        return "#1877F2";
      }
    };
    return (
      <div>
        <div style={{ marginBottom: 14 }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            Workload Heatmap
          </p>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "0.75rem",
              color: ui.textMuted,
            }}
          >
            Daily task volume per user — last 4 working weeks
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {currentEvaluators.map((ev) => {
            const data = WORKLOAD_DATA[ev] || Array(20).fill(0);
            const total = data.reduce((a, b) => a + b, 0);
            const nonZero = data.filter((v) => v > 0);
            const avg = nonZero.length
              ? (total / nonZero.length).toFixed(1)
              : "0.0";
            const peak = Math.max(...data);
            const av = getAvatarColor(ev, uniqueEvaluators);
            const role = USER_ROLE_MAP[ev] || "User";
            return (
              <Card key={ev} ui={ui} style={{ padding: "12px 14px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: av.bg,
                      color: av.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(ev)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.84rem",
                        fontWeight: 700,
                        color: ui.textPrimary,
                      }}
                    >
                      {ev}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.68rem",
                        color: ui.textMuted,
                      }}
                    >
                      {role} · Total: {total} tasks · Avg: {avg}/active day ·
                      Peak: {peak}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[
                      { label: "Total", val: total, color: FB },
                      { label: "Avg", val: avg, color: "#36a420" },
                      { label: "Peak", val: peak, color: "#f59e0b" },
                    ].map((s) => (
                      <div
                        key={s.label}
                        style={{
                          textAlign: "center",
                          padding: "4px 8px",
                          borderRadius: 6,
                          background: `${s.color}12`,
                          border: `1px solid ${s.color}25`,
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.9rem",
                            fontWeight: 800,
                            color: s.color,
                            lineHeight: 1,
                          }}
                        >
                          {s.val}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.58rem",
                            color: s.color,
                            marginTop: 1,
                          }}
                        >
                          {s.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Heatmap grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px repeat(4, 1fr)",
                    gap: 3,
                  }}
                >
                  <div />
                  {weeks.map((w) => (
                    <div
                      key={w}
                      style={{
                        textAlign: "center",
                        fontSize: "0.62rem",
                        color: ui.textMuted,
                        paddingBottom: 2,
                      }}
                    >
                      {w}
                    </div>
                  ))}
                  {days.map((day, di) => (
                    <>
                      <div
                        key={`label-${day}`}
                        style={{
                          fontSize: "0.62rem",
                          color: ui.textMuted,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {day}
                      </div>
                      {weeks.map((_, wi) => {
                        const val = data[wi * 5 + di] ?? 0;
                        const cellColor = getColor(val, darkMode);
                        const textColor =
                          val >= 6
                            ? "#fff"
                            : val > 0
                              ? darkMode
                                ? "#93c5fd"
                                : "#1d4ed8"
                              : "transparent";
                        return (
                          <div
                            key={`${day}-${wi}`}
                            title={`${ev} · ${day} Wk${wi + 1}: ${val} tasks`}
                            style={{
                              height: 22,
                              borderRadius: 4,
                              background: cellColor,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "default",
                              transition: "transform 0.1s",
                              border:
                                val === 0
                                  ? `1px solid ${darkMode ? "#3a3b3c" : "#dddfe2"}`
                                  : "none",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.transform = "scale(1.12)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.transform = "scale(1)")
                            }
                          >
                            <span
                              style={{
                                fontSize: "0.56rem",
                                fontWeight: 700,
                                color: textColor,
                              }}
                            >
                              {val > 0 ? val : ""}
                            </span>
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
                {/* Legend */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 8,
                    justifyContent: "flex-end",
                  }}
                >
                  <span style={{ fontSize: "0.6rem", color: ui.textMuted }}>
                    0
                  </span>
                  {[0, 2, 4, 6, 8].map((v) => (
                    <div
                      key={v}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: getColor(v, darkMode),
                        border:
                          v === 0
                            ? `1px solid ${darkMode ? "#3a3b3c" : "#dddfe2"}`
                            : "none",
                      }}
                    />
                  ))}
                  <span style={{ fontSize: "0.6rem", color: ui.textMuted }}>
                    8+
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Activity Feed View ────────────────────────────────────────────────────
  const ActivityFeedView = () => {
    const filteredAct = activitySearch
      ? ACTIVITY_FEED.filter(
          (a) =>
            a.user.toLowerCase().includes(activitySearch.toLowerCase()) ||
            a.target.toLowerCase().includes(activitySearch.toLowerCase()) ||
            a.action.toLowerCase().includes(activitySearch.toLowerCase()),
        )
      : ACTIVITY_FEED;
    return (
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              Activity Feed
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "0.75rem",
                color: ui.textMuted,
              }}
            >
              Real-time log of user actions
            </p>
          </div>
          <input
            placeholder="Search activity…"
            value={activitySearch}
            onChange={(e) => setActivitySearch(e.target.value)}
            style={{ ...inputSt, minWidth: 220 }}
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            marginBottom: 14,
          }}
        >
          {[
            {
              icon: "✅",
              label: "Completed",
              count: ACTIVITY_FEED.filter((a) => a.icon === "✅").length,
              color: "#36a420",
            },
            {
              icon: "▶️",
              label: "Started",
              count: ACTIVITY_FEED.filter((a) => a.icon === "▶️").length,
              color: FB,
            },
            {
              icon: "🚩",
              label: "Flagged",
              count: ACTIVITY_FEED.filter((a) => a.icon === "🚩").length,
              color: "#f59e0b",
            },
            {
              icon: "📤",
              label: "Released",
              count: ACTIVITY_FEED.filter((a) => a.icon === "📤").length,
              color: "#9333ea",
            },
          ].map((s) => (
            <Card key={s.label} ui={ui} style={{ padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "1.1rem" }}>{s.icon}</span>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "1rem",
                      fontWeight: 800,
                      color: s.color,
                    }}
                  >
                    {s.count}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.68rem",
                      color: ui.textMuted,
                    }}
                  >
                    {s.label}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filteredAct.map((act) => (
            <Card key={act.id} ui={ui} style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: `${act.color}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    flexShrink: 0,
                  }}
                >
                  {act.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.84rem",
                      color: ui.textPrimary,
                      lineHeight: 1.4,
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{act.user}</span>{" "}
                    <span style={{ color: ui.textSub }}>{act.action}</span>
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "0.75rem",
                      color: ui.textMuted,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {act.target}
                  </p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span style={{ fontSize: "0.7rem", color: ui.textMuted }}>
                    {act.time}
                  </span>
                </div>
              </div>
            </Card>
          ))}
          {filteredAct.length === 0 && (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.84rem",
              }}
            >
              No activity found
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Users View ────────────────────────────────────────────────────────────
  const UsersView = () => {
    const allRoles = [
      "All",
      ...Array.from(new Set(USER_DATABASE.map((u) => u.role))),
    ];
    const statuses = ["All", "Active", "Inactive", "Suspended"];
    const filteredUsers = USER_DATABASE.filter((u) => {
      const q = userSearch.toLowerCase();
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q);
      const matchRole = userRoleFilter === "All" || u.role === userRoleFilter;
      const matchStatus =
        userStatusFilter === "All" || u.status === userStatusFilter;
      return matchSearch && matchRole && matchStatus;
    });
    const activeCount = USER_DATABASE.filter(
      (u) => u.status === "Active",
    ).length;
    const inactiveCount = USER_DATABASE.filter(
      (u) => u.status === "Inactive",
    ).length;
    const suspendedCount = USER_DATABASE.filter(
      (u) => u.status === "Suspended",
    ).length;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            User Management
          </p>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "0.75rem",
              color: ui.textMuted,
            }}
          >
            View and impersonate user accounts to inspect their dashboard
            perspective
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 10,
          }}
        >
          {[
            {
              label: "Total Users",
              value: USER_DATABASE.length,
              color: FB,
              bg: darkMode ? "#1a2744" : `${FB}10`,
              icon: "👥",
            },
            {
              label: "Active",
              value: activeCount,
              color: "#36a420",
              bg: darkMode ? "#0f2e1a" : "#f0fdf4",
              icon: "🟢",
            },
            {
              label: "Inactive",
              value: inactiveCount,
              color: "#9ca3af",
              bg: darkMode ? "#2a2a2a" : "#f3f4f6",
              icon: "⚫",
            },
            {
              label: "Suspended",
              value: suspendedCount,
              color: "#e02020",
              bg: darkMode ? "#2e0f0f" : "#fff1f2",
              icon: "🔴",
            },
          ].map((s) => (
            <Card
              key={s.label}
              ui={ui}
              style={{
                background: s.bg,
                borderColor: `${s.color}28`,
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: `${s.color}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.95rem",
                  }}
                >
                  {s.icon}
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: s.color,
                    }}
                  >
                    {s.label}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "1.3rem",
                      fontWeight: 800,
                      color: s.color,
                      lineHeight: 1.2,
                    }}
                  >
                    {s.value}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelSt}>Search</label>
            <input
              type="text"
              placeholder="Name, email, role…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{ ...inputSt, width: "100%", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={labelSt}>Role</label>
            <div
              style={{
                display: "flex",
                background: darkMode ? ui.inputBg : "#e4e6eb",
                borderRadius: 9,
                padding: 3,
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              {allRoles.map((r) => {
                const isAct = userRoleFilter === r;
                return (
                  <button
                    key={r}
                    onClick={() => setUserRoleFilter(r)}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.72rem",
                      fontWeight: isAct ? 700 : 500,
                      borderRadius: 6,
                      border: "none",
                      background: isAct ? ui.cardBg : "transparent",
                      color: isAct ? FB : ui.textMuted,
                      cursor: "pointer",
                      fontFamily: font,
                      whiteSpace: "nowrap",
                      boxShadow: isAct ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label style={labelSt}>Status</label>
            <div
              style={{
                display: "flex",
                background: darkMode ? ui.inputBg : "#e4e6eb",
                borderRadius: 9,
                padding: 3,
                gap: 2,
              }}
            >
              {statuses.map((s) => {
                const isAct = userStatusFilter === s;
                return (
                  <button
                    key={s}
                    onClick={() => setUserStatusFilter(s)}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.72rem",
                      fontWeight: isAct ? 700 : 500,
                      borderRadius: 6,
                      border: "none",
                      background: isAct ? ui.cardBg : "transparent",
                      color: isAct ? FB : ui.textMuted,
                      cursor: "pointer",
                      fontFamily: font,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 10,
          }}
        >
          {filteredUsers.map((user) => {
            const av = avatarPalette[user.avatar % avatarPalette.length];
            const rc = ROLE_COLORS[user.role] || ROLE_COLORS["Evaluator"];
            const sc = STATUS_COLORS_MAP[user.status];
            const isImpersonating = impersonating?.id === user.id;
            const approvalRate =
              user.tasks > 0
                ? ((user.approved / user.tasks) * 100).toFixed(0)
                : null;
            return (
              <div
                key={user.id}
                style={{
                  background: ui.cardBg,
                  border: `1.5px solid ${isImpersonating ? FB : ui.cardBorder}`,
                  borderRadius: 10,
                  overflow: "hidden",
                  boxShadow: isImpersonating
                    ? `0 0 0 3px ${FB}28`
                    : "0 1px 2px rgba(0,0,0,0.06)",
                  transition: "border 0.15s, box-shadow 0.15s",
                }}
              >
                <div
                  style={{
                    padding: "14px 16px 10px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: "50%",
                        background: av.bg,
                        color: av.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1rem",
                        fontWeight: 700,
                        border: `2px solid ${av.color}40`,
                      }}
                    >
                      {getInitials(user.name)}
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: 1,
                        right: 1,
                        width: 11,
                        height: 11,
                        borderRadius: "50%",
                        background: sc.dot,
                        border: `2px solid ${ui.cardBg}`,
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.88rem",
                          fontWeight: 700,
                          color: ui.textPrimary,
                        }}
                      >
                        {user.name}
                      </p>
                      {isImpersonating && (
                        <span
                          style={{
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 99,
                            background: FB,
                            color: "#fff",
                            letterSpacing: "0.04em",
                          }}
                        >
                          VIEWING
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        margin: "1px 0 0",
                        fontSize: "0.72rem",
                        color: ui.textMuted,
                      }}
                    >
                      {user.email}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: 5,
                        marginTop: 5,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.67rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: darkMode
                            ? rc?.darkBg || "#1e2a4a"
                            : rc?.bg || "#dbeafe",
                          color: darkMode
                            ? rc?.darkColor || "#93c5fd"
                            : rc?.color || "#1d4ed8",
                        }}
                      >
                        {user.role}
                      </span>
                      <span
                        style={{
                          fontSize: "0.67rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: darkMode ? sc.darkBg : sc.bg,
                          color: darkMode ? sc.darkColor : sc.color,
                        }}
                      >
                        {user.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    borderTop: `1px solid ${ui.divider}`,
                    borderBottom: `1px solid ${ui.divider}`,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    background: darkMode ? ui.inputBg + "88" : "#f8f9fd",
                  }}
                >
                  {[
                    {
                      label: "Tasks",
                      value: user.tasks > 0 ? user.tasks : "—",
                    },
                    {
                      label: "Approved",
                      value: user.approved > 0 ? user.approved : "—",
                    },
                    {
                      label: "Rate",
                      value: approvalRate ? `${approvalRate}%` : "—",
                    },
                  ].map((stat, i) => (
                    <div
                      key={stat.label}
                      style={{
                        padding: "8px 10px",
                        textAlign: "center",
                        borderRight: i < 2 ? `1px solid ${ui.divider}` : "none",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.95rem",
                          fontWeight: 800,
                          color: ui.textPrimary,
                        }}
                      >
                        {stat.value}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.62rem",
                          color: ui.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.67rem",
                        color: ui.textMuted,
                      }}
                    >
                      Last login
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.73rem",
                        fontWeight: 500,
                        color: ui.textSub,
                      }}
                    >
                      {user.lastLogin}
                    </p>
                  </div>
                  {isImpersonating ? (
                    <button
                      onClick={() => setImpersonating(null)}
                      style={{
                        padding: "6px 14px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        borderRadius: 7,
                        border: `1.5px solid #e02020`,
                        background: darkMode ? "#2e0f0f" : "#fff1f2",
                        color: "#e02020",
                        cursor: "pointer",
                        fontFamily: font,
                        whiteSpace: "nowrap",
                      }}
                    >
                      ✕ Stop
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        user.status !== "Suspended" &&
                        setShowImpersonateConfirm(user)
                      }
                      disabled={user.status === "Suspended"}
                      style={{
                        padding: "6px 14px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        borderRadius: 7,
                        border: `1.5px solid ${user.status === "Suspended" ? ui.cardBorder : FB}`,
                        background:
                          user.status === "Suspended"
                            ? "transparent"
                            : `${FB}12`,
                        color: user.status === "Suspended" ? ui.textMuted : FB,
                        cursor:
                          user.status === "Suspended"
                            ? "not-allowed"
                            : "pointer",
                        fontFamily: font,
                        whiteSpace: "nowrap",
                        opacity: user.status === "Suspended" ? 0.5 : 1,
                      }}
                    >
                      👁 View As
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {filteredUsers.length === 0 && (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: ui.textMuted,
              fontSize: "0.84rem",
            }}
          >
            No users found
          </div>
        )}
      </div>
    );
  };

  const MainContent = () => {
    if (activeNav === "overview") return <OverviewView />;
    if (activeNav === "analytics") return <AnalyticsView />;
    if (activeNav === "deadlines") return <DeadlinesView />;
    if (activeNav === "compliance") return <ComplianceView />;
    if (activeNav === "workload") return <WorkloadView />;
    if (activeNav === "activity") return <ActivityFeedView />;
    if (activeNav === "users") return <UsersView />;
    return <RecordsView />;
  };

  return (
    <>
      <style>{`.mon-scroll::-webkit-scrollbar{width:7px}.mon-scroll::-webkit-scrollbar-track{background:transparent}.mon-scroll::-webkit-scrollbar-thumb{background:#3a3b3c;border-radius:99px}.mon-scroll::-webkit-scrollbar-thumb:hover{background:#555}.mon-scroll{scrollbar-width:thin;scrollbar-color:#3a3b3c transparent}`}</style>
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
          className="mon-scroll"
          style={{
            display: "flex",
            flex: "1 1 0",
            minHeight: 0,
            overflowY: "scroll",
            overflowX: "hidden",
          }}
        >
          {!isMobile && (
            <div
              style={{
                flexShrink: 0,
                width: 220,
                position: "sticky",
                top: 0,
                alignSelf: "stretch",
                maxHeight: "100vh",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: "100%",
                  background: ui.sidebarBg,
                  borderRight: `1px solid ${ui.cardBorder}`,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ padding: "16px 10px 10px" }}>
                  <p
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: ui.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      margin: "0 0 10px 6px",
                    }}
                  >
                    Monitoring
                  </p>
                  {navItems.map((n) => (
                    <NavItem
                      key={n.key}
                      {...n}
                      active={activeNav === n.key}
                      onClick={() => setActiveNav(n.key)}
                      ui={ui}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: isMobile ? "12px" : "16px",
              paddingBottom: 80,
              boxSizing: "border-box",
            }}
          >
            {impersonating && (
              <div
                style={{
                  marginBottom: 14,
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: darkMode ? "#1a2744" : "#e7f0fd",
                  border: `1.5px solid ${FB}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background:
                      avatarPalette[impersonating.avatar % avatarPalette.length]
                        .bg,
                    color:
                      avatarPalette[impersonating.avatar % avatarPalette.length]
                        .color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    border: `2px solid ${avatarPalette[impersonating.avatar % avatarPalette.length].color}40`,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(impersonating.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: FB,
                    }}
                  >
                    👁 Viewing as:{" "}
                    <span style={{ color: darkMode ? "#e4e6ea" : "#1c1e21" }}>
                      {impersonating.name}
                    </span>
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.7rem",
                      color: darkMode ? "#b0b3b8" : "#65676b",
                    }}
                  >
                    {impersonating.role} · {impersonating.email} ·
                    Specialization: {impersonating.specialization}
                  </p>
                </div>
                <button
                  onClick={() => setImpersonating(null)}
                  style={{
                    padding: "5px 12px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    borderRadius: 7,
                    border: `1.5px solid #e02020`,
                    background: darkMode ? "#2e0f0f" : "#fff1f2",
                    color: "#e02020",
                    cursor: "pointer",
                    fontFamily: font,
                    flexShrink: 0,
                  }}
                >
                  ✕ Stop Impersonation
                </button>
              </div>
            )}
            {isMobile && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginBottom: 14,
                  overflowX: "auto",
                  paddingBottom: 2,
                }}
              >
                {navItems
                  .filter((n) => !n.disabled)
                  .map((n) => (
                    <button
                      key={n.key}
                      onClick={() => setActiveNav(n.key)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 99,
                        border: `1px solid ${activeNav === n.key ? FB : ui.cardBorder}`,
                        background:
                          activeNav === n.key ? `${FB}12` : "transparent",
                        color: activeNav === n.key ? FB : ui.textMuted,
                        fontSize: "0.78rem",
                        fontWeight: activeNav === n.key ? 700 : 500,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        fontFamily: font,
                      }}
                    >
                      {n.icon} {n.label}
                    </button>
                  ))}
              </div>
            )}
            <MainContent />
          </div>
        </div>
      </div>

      {/* Evaluator/User Detail Modal */}
      {modalEval && (
        <div
          onClick={handleModalClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: ui.cardBg,
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 12,
              overflow: "hidden",
              width: 920,
              maxWidth: "95vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "85vh",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderBottom: `1px solid ${ui.divider}`,
                background: colHdr,
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {(() => {
                  const av = getAvatarColor(modalEval, uniqueEvaluators);
                  const role = USER_ROLE_MAP[modalEval] || "User";
                  return (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: "50%",
                          background: av.bg,
                          color: av.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          border: `2.5px solid ${av.color}55`,
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(modalEval)}
                      </div>
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            color: ui.textMuted,
                          }}
                        >
                          Tasks for
                        </p>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "1rem",
                            fontWeight: 700,
                            color: ui.textPrimary,
                          }}
                        >
                          {modalEval}
                        </h3>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.72rem",
                            color: ui.textMuted,
                          }}
                        >
                          {role}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <button
                onClick={handleModalClose}
                style={{
                  background: "transparent",
                  border: `1px solid ${ui.cardBorder}`,
                  borderRadius: 6,
                  color: ui.textMuted,
                  cursor: "pointer",
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ overflowY: "auto", overflowX: "auto", flex: 1 }}>
              <div style={{ minWidth: 700 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-end",
                    padding: "10px 14px",
                    borderBottom: `1px solid ${ui.divider}`,
                    background: colHdr,
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    {
                      label: "From",
                      val: modalDateFrom,
                      set: setModalDateFrom,
                    },
                    { label: "To", val: modalDateTo, set: setModalDateTo },
                  ].map(({ label, val, set }) => (
                    <div key={label}>
                      <label style={{ ...labelSt, fontSize: "0.67rem" }}>
                        {label}
                      </label>
                      <input
                        type="date"
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        style={{ ...inputSt, fontSize: "0.78rem" }}
                      />
                    </div>
                  ))}
                  {(modalDateFrom || modalDateTo) && (
                    <button
                      onClick={() => {
                        setModalDateFrom("");
                        setModalDateTo("");
                      }}
                      style={{
                        padding: "6px 12px",
                        fontSize: "0.78rem",
                        borderRadius: 6,
                        border: `1px solid ${ui.cardBorder}`,
                        background: "transparent",
                        color: ui.textMuted,
                        cursor: "pointer",
                        fontFamily: font,
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>
                {/* Status Tabs */}
                <div
                  style={{
                    padding: "10px 14px",
                    borderBottom: `1px solid ${ui.divider}`,
                    background: colHdr,
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    { key: "All", label: "All", color: FB },
                    {
                      key: "On Process",
                      label: "⏳ On Process",
                      color: "#f59e0b",
                    },
                    { key: "Approved", label: "✅ Approved", color: "#36a420" },
                    {
                      key: "Disapproved",
                      label: "❌ Disapproved",
                      color: "#e02020",
                    },
                  ].map(({ key, label, color }) => {
                    const count =
                      key === "All"
                        ? allModalTasks.filter((t) => {
                            const d = new Date(t.date + "T00:00:00");
                            if (modalDateFrom && d < new Date(modalDateFrom))
                              return false;
                            if (modalDateTo && d > new Date(modalDateTo))
                              return false;
                            return true;
                          }).length
                        : allModalTasks.filter((t) => {
                            const d = new Date(t.date + "T00:00:00");
                            if (modalDateFrom && d < new Date(modalDateFrom))
                              return false;
                            if (modalDateTo && d > new Date(modalDateTo))
                              return false;
                            return t.status === key;
                          }).length;
                    const isAct = modalStatusTab === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setModalStatusTab(key)}
                        style={{
                          padding: "5px 14px",
                          fontSize: "0.76rem",
                          fontWeight: isAct ? 700 : 500,
                          borderRadius: 99,
                          border: `1.5px solid ${isAct ? color : ui.cardBorder}`,
                          background: isAct ? `${color}15` : "transparent",
                          color: isAct ? color : ui.textMuted,
                          cursor: "pointer",
                          fontFamily: font,
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          transition: "all 0.15s",
                        }}
                      >
                        {label}
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            padding: "1px 6px",
                            borderRadius: 99,
                            background: isAct ? color : ui.inputBg,
                            color: isAct ? "#fff" : ui.textMuted,
                            minWidth: 18,
                            textAlign: "center",
                          }}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.5fr 1fr 2fr 1.1fr 1fr 0.9fr 60px",
                    background: colHdr,
                    borderBottom: `1px solid ${ui.divider}`,
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                  }}
                >
                  {[
                    { label: "DTN", col: "dtn" },
                    { label: "Date", col: "date" },
                    { label: "Drug / Application", col: "drugName" },
                    { label: "App Step", col: "appStep" },
                    { label: "Timeline", col: "timeline" },
                    { label: "Status", col: "status" },
                  ].map(({ label, col }) => (
                    <span
                      key={col}
                      onClick={() => toggleModalSort(col)}
                      style={{
                        fontSize: "0.67rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: modalSortCol === col ? FB : ui.textMuted,
                        padding: "8px 14px",
                        textAlign: "center",
                        cursor: "pointer",
                        userSelect: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {label}
                      <SortArrow col={col} isModal />
                    </span>
                  ))}
                  <span
                    style={{
                      fontSize: "0.67rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: ui.textMuted,
                      padding: "8px 14px",
                      textAlign: "center",
                      position: "sticky",
                      right: 0,
                      background: colHdr,
                      borderLeft: `1px solid ${ui.divider}`,
                    }}
                  >
                    Action
                  </span>
                </div>
                {modalTasks.length === 0 ? (
                  <div
                    style={{
                      padding: "24px",
                      textAlign: "center",
                      color: ui.textMuted,
                      fontSize: "0.84rem",
                    }}
                  >
                    No tasks found
                  </div>
                ) : (
                  modalTasks.map((task, i) => {
                    const tlStyle = (darkMode
                      ? timelineColorsDark
                      : timelineColors)[task.timeline] || {
                      bg: "#f3f4f6",
                      color: "#374151",
                    };
                    return (
                      <div
                        key={i}
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "1.5fr 1fr 2fr 1.1fr 1fr 0.9fr 60px",
                          borderBottom:
                            i < modalTasks.length - 1
                              ? `1px solid ${ui.divider}`
                              : "none",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = ui.hoverBg)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: FB,
                            fontWeight: 700,
                            textAlign: "center",
                            padding: "10px 14px",
                            alignSelf: "center",
                            fontFamily: "monospace",
                          }}
                        >
                          {task.dtn}
                        </span>
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: ui.textPrimary,
                            textAlign: "center",
                            padding: "10px 14px",
                            alignSelf: "center",
                          }}
                        >
                          {new Date(task.date + "T00:00:00").toLocaleDateString(
                            "en-PH",
                            { year: "numeric", month: "short", day: "numeric" },
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: ui.textSub,
                            padding: "10px 14px",
                            alignSelf: "center",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {task.drugName}
                        </span>
                        <span
                          style={{
                            padding: "10px 14px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          {(() => {
                            const spc = (darkMode
                              ? stepColorsDark
                              : stepColors)[task.appStep] || {
                              bg: "#f3f4f6",
                              color: "#374151",
                            };
                            return (
                              <span
                                style={{
                                  fontSize: "0.71rem",
                                  fontWeight: 600,
                                  padding: "3px 9px",
                                  borderRadius: 99,
                                  background: spc.bg,
                                  color: spc.color,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {task.appStep}
                              </span>
                            );
                          })()}
                        </span>
                        <span
                          style={{
                            padding: "10px 14px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.71rem",
                              fontWeight: 600,
                              padding: "3px 9px",
                              borderRadius: 99,
                              background: tlStyle.bg,
                              color: tlStyle.color,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {task.timeline}
                          </span>
                        </span>
                        <span
                          style={{
                            padding: "10px 14px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          {(() => {
                            const sc = (darkMode
                              ? statusColorsDark
                              : statusColors)[task.status] || {
                              bg: "#f3f4f6",
                              color: "#374151",
                            };
                            return (
                              <span
                                style={{
                                  fontSize: "0.71rem",
                                  fontWeight: 600,
                                  padding: "3px 9px",
                                  borderRadius: 99,
                                  background: sc.bg,
                                  color: sc.color,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {task.status}
                              </span>
                            );
                          })()}
                        </span>
                        <div
                          style={{
                            padding: "8px 10px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            position: "sticky",
                            right: 0,
                            background: "inherit",
                            borderLeft: `1px solid ${ui.divider}`,
                            zIndex: 1,
                          }}
                        >
                          <ActionMenu
                            task={task}
                            darkMode={darkMode}
                            ui={ui}
                            onReassign={(t) => {
                              handleModalClose();
                              setReassignTask(t);
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div
              style={{
                padding: "8px 20px",
                borderTop: `1px solid ${ui.divider}`,
                background: colHdr,
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "0.73rem", color: ui.textMuted }}>
                {modalTasks.length !== allModalTasks.length
                  ? `${modalTasks.length} of ${allModalTasks.length} tasks`
                  : `${allModalTasks.length} task${allModalTasks.length !== 1 ? "s" : ""} assigned`}
              </span>
            </div>
          </div>
        </div>
      )}

      {chartModal && (
        <ChartDetailModal
          title={chartModal.title}
          subtitle={chartModal.subtitle}
          rows={chartModal.rows}
          darkMode={darkMode}
          onClose={() => setChartModal(null)}
          ui={ui}
        />
      )}
      {reassignTask && (
        <ReassignModal
          task={reassignTask}
          evaluators={uniqueEvaluators}
          darkMode={darkMode}
          onClose={() => setReassignTask(null)}
          onConfirm={handleReassignConfirm}
          ui={ui}
        />
      )}

      {/* Impersonate Confirm Modal */}
      {showImpersonateConfirm && (
        <div
          onClick={() => setShowImpersonateConfirm(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 4000,
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: ui.cardBg,
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 14,
              overflow: "hidden",
              width: 400,
              maxWidth: "92vw",
              boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                padding: "20px 20px 16px",
                borderBottom: `1px solid ${ui.divider}`,
                background: darkMode ? ui.sidebarBg : "#f8f9fd",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background:
                      avatarPalette[
                        showImpersonateConfirm.avatar % avatarPalette.length
                      ].bg,
                    color:
                      avatarPalette[
                        showImpersonateConfirm.avatar % avatarPalette.length
                      ].color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(showImpersonateConfirm.name)}
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      color: ui.textPrimary,
                    }}
                  >
                    {showImpersonateConfirm.name}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.73rem",
                      color: ui.textMuted,
                    }}
                  >
                    {showImpersonateConfirm.role} ·{" "}
                    {showImpersonateConfirm.email}
                  </p>
                </div>
              </div>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: darkMode ? "#1a2744" : `${FB}0e`,
                  border: `1px solid ${FB}30`,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.75rem",
                    color: darkMode ? "#93c5fd" : "#1d4ed8",
                    lineHeight: 1.5,
                  }}
                >
                  👁 You are about to{" "}
                  <strong>
                    view the dashboard as {showImpersonateConfirm.name}
                  </strong>
                  . This lets you inspect their data perspective and workload.
                  No changes will be made.
                </p>
              </div>
            </div>
            <div
              style={{
                padding: "16px 20px",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                onClick={() => setShowImpersonateConfirm(null)}
                style={{
                  padding: "8px 16px",
                  fontSize: "0.82rem",
                  borderRadius: 7,
                  border: `1px solid ${ui.cardBorder}`,
                  background: "transparent",
                  color: ui.textMuted,
                  cursor: "pointer",
                  fontFamily: font,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setImpersonating(showImpersonateConfirm);
                  setShowImpersonateConfirm(null);
                  setActiveNav("impersonated");
                }}
                style={{
                  padding: "8px 18px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  borderRadius: 7,
                  border: "none",
                  background: FB,
                  color: "#fff",
                  cursor: "pointer",
                  fontFamily: font,
                }}
              >
                👁 View Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Impersonated User Dashboard Panel */}
      {impersonating &&
        activeNav === "impersonated" &&
        (() => {
          const user = impersonating;
          const userTasks = tableData.filter((r) => r.evaluator === user.name);
          const approved = userTasks.filter(
            (r) => r.status === "Approved",
          ).length;
          const disapproved = userTasks.filter(
            (r) => r.status === "Disapproved",
          ).length;
          const onProcess = userTasks.filter(
            (r) => r.status === "On Process",
          ).length;
          const beyond = userTasks.filter(
            (r) => r.timeline === "Beyond",
          ).length;
          const within = userTasks.filter(
            (r) => r.timeline === "Within",
          ).length;
          const rate = userTasks.length
            ? ((approved / userTasks.length) * 100).toFixed(1)
            : "0.0";
          const av = avatarPalette[user.avatar % avatarPalette.length];
          const recentTasks = [...userTasks]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
          const SC = darkMode ? statusColorsDark : statusColors;
          const TC = darkMode ? timelineColorsDark : timelineColors;
          const rxBreakdown = [
            "Prescription Drug (RX)",
            "Over-the-Counter (OTC)",
            "Vaccine",
          ].map((type) => ({
            type,
            count: userTasks.filter((r) => r.prescription === type).length,
          }));
          return (
            <div
              onClick={() => setActiveNav("users")}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.65)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 3500,
                backdropFilter: "blur(8px)",
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: ui.pageBg,
                  border: `1.5px solid ${FB}`,
                  borderRadius: 14,
                  overflow: "hidden",
                  width: 820,
                  maxWidth: "95vw",
                  maxHeight: "90vh",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
                }}
              >
                <div
                  style={{
                    padding: "14px 20px",
                    background: darkMode ? ui.sidebarBg : "#fff",
                    borderBottom: `1px solid ${ui.divider}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: av.bg,
                        color: av.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        border: `2.5px solid ${av.color}55`,
                      }}
                    >
                      {getInitials(user.name)}
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: 1,
                        right: 1,
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "#36a420",
                        border: `2px solid ${ui.cardBg}`,
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "1rem",
                          fontWeight: 700,
                          color: ui.textPrimary,
                        }}
                      >
                        {user.name}
                      </p>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: FB,
                          color: "#fff",
                        }}
                      >
                        IMPERSONATING
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.73rem",
                        color: ui.textMuted,
                      }}
                    >
                      {user.role} · {user.email} · {user.specialization}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setActiveNav("users")}
                      style={{
                        padding: "6px 14px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        borderRadius: 7,
                        border: `1px solid ${ui.cardBorder}`,
                        background: "transparent",
                        color: ui.textMuted,
                        cursor: "pointer",
                        fontFamily: font,
                      }}
                    >
                      ← Back to Users
                    </button>
                    <button
                      onClick={() => {
                        setImpersonating(null);
                        setActiveNav("users");
                      }}
                      style={{
                        padding: "6px 14px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        borderRadius: 7,
                        border: `1.5px solid #e02020`,
                        background: darkMode ? "#2e0f0f" : "#fff1f2",
                        color: "#e02020",
                        cursor: "pointer",
                        fontFamily: font,
                      }}
                    >
                      ✕ Stop
                    </button>
                  </div>
                </div>
                <div
                  className="mon-scroll"
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5,1fr)",
                      gap: 10,
                    }}
                  >
                    {[
                      {
                        label: "Total Tasks",
                        value: userTasks.length,
                        color: FB,
                        icon: "📋",
                      },
                      {
                        label: "Approved",
                        value: approved,
                        color: "#36a420",
                        icon: "✅",
                      },
                      {
                        label: "Disapproved",
                        value: disapproved,
                        color: "#e02020",
                        icon: "❌",
                      },
                      {
                        label: "On Process",
                        value: onProcess,
                        color: "#f59e0b",
                        icon: "⏳",
                      },
                      {
                        label: "Approval Rate",
                        value: `${rate}%`,
                        color: "#9333ea",
                        icon: "📈",
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        style={{
                          background: ui.cardBg,
                          border: `1px solid ${ui.cardBorder}`,
                          borderRadius: 9,
                          padding: "12px 14px",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 7,
                              background: `${s.color}18`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.85rem",
                            }}
                          >
                            {s.icon}
                          </div>
                          <div>
                            <p
                              style={{
                                margin: 0,
                                fontSize: "0.6rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                color: s.color,
                              }}
                            >
                              {s.label}
                            </p>
                            <p
                              style={{
                                margin: 0,
                                fontSize: "1.1rem",
                                fontWeight: 800,
                                color: s.color,
                                lineHeight: 1.2,
                              }}
                            >
                              {s.value}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        background: ui.cardBg,
                        border: `1px solid ${ui.cardBorder}`,
                        borderRadius: 9,
                        padding: "14px 16px",
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 12px",
                          fontSize: "0.84rem",
                          fontWeight: 700,
                          color: ui.textPrimary,
                        }}
                      >
                        ⏱ Timeline Status
                      </p>
                      {[
                        {
                          label: "Within Timeline",
                          val: within,
                          color: "#36a420",
                        },
                        {
                          label: "Beyond Timeline",
                          val: beyond,
                          color: "#e02020",
                        },
                      ].map((item) => {
                        const pct = userTasks.length
                          ? ((item.val / userTasks.length) * 100).toFixed(0)
                          : 0;
                        return (
                          <div key={item.label} style={{ marginBottom: 10 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 4,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  color: item.color,
                                }}
                              >
                                {item.label}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  fontWeight: 800,
                                  color: item.color,
                                }}
                              >
                                {item.val} ({pct}%)
                              </span>
                            </div>
                            <div
                              style={{
                                height: 8,
                                borderRadius: 99,
                                background: ui.progressBg,
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${pct}%`,
                                  borderRadius: 99,
                                  background: item.color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div
                      style={{
                        background: ui.cardBg,
                        border: `1px solid ${ui.cardBorder}`,
                        borderRadius: 9,
                        padding: "14px 16px",
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 12px",
                          fontSize: "0.84rem",
                          fontWeight: 700,
                          color: ui.textPrimary,
                        }}
                      >
                        💊 Prescription Breakdown
                      </p>
                      {rxBreakdown.map((item, idx) => {
                        const colors = [FB, "#f59e0b", "#36a420"];
                        const short =
                          item.type === "Prescription Drug (RX)"
                            ? "RX"
                            : item.type === "Over-the-Counter (OTC)"
                              ? "OTC"
                              : "Vaccine";
                        const pct = userTasks.length
                          ? ((item.count / userTasks.length) * 100).toFixed(0)
                          : 0;
                        return (
                          <div key={item.type} style={{ marginBottom: 10 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 4,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  padding: "1px 7px",
                                  borderRadius: 99,
                                  background: `${colors[idx]}18`,
                                  color: colors[idx],
                                }}
                              >
                                {short}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: colors[idx],
                                }}
                              >
                                {item.count} tasks
                              </span>
                            </div>
                            <div
                              style={{
                                height: 6,
                                borderRadius: 99,
                                background: ui.progressBg,
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${pct}%`,
                                  borderRadius: 99,
                                  background: colors[idx],
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div
                    style={{
                      background: ui.cardBg,
                      border: `1px solid ${ui.cardBorder}`,
                      borderRadius: 9,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 14px 8px",
                        borderBottom: `1px solid ${ui.divider}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.84rem",
                          fontWeight: 700,
                          color: ui.textPrimary,
                        }}
                      >
                        📋 Recent Tasks
                      </p>
                      <span style={{ fontSize: "0.7rem", color: ui.textMuted }}>
                        Latest 5
                      </span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.4fr 1fr 2fr 1fr 1fr",
                        background: darkMode ? ui.sidebarBg : "#f8f9fd",
                        borderBottom: `1px solid ${ui.divider}`,
                      }}
                    >
                      {[
                        "DTN",
                        "Date",
                        "Drug / Application",
                        "Status",
                        "Timeline",
                      ].map((h, i) => (
                        <span
                          key={h}
                          style={{
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            color: ui.textMuted,
                            padding: "7px 12px",
                            textAlign: i > 0 ? "center" : "left",
                          }}
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                    {recentTasks.length === 0 ? (
                      <div
                        style={{
                          padding: 20,
                          textAlign: "center",
                          color: ui.textMuted,
                          fontSize: "0.82rem",
                        }}
                      >
                        No tasks found for this user
                      </div>
                    ) : (
                      recentTasks.map((task, i) => {
                        const stc = SC[task.status] || {
                          bg: "#f3f4f6",
                          color: "#374151",
                        };
                        const tlc = TC[task.timeline] || {
                          bg: "#f3f4f6",
                          color: "#374151",
                        };
                        return (
                          <div
                            key={task.dtn}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1.4fr 1fr 2fr 1fr 1fr",
                              borderBottom:
                                i < recentTasks.length - 1
                                  ? `1px solid ${ui.divider}`
                                  : "none",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.68rem",
                                color: FB,
                                fontWeight: 700,
                                padding: "9px 12px",
                                fontFamily: "monospace",
                                alignSelf: "center",
                              }}
                            >
                              {task.dtn}
                            </span>
                            <span
                              style={{
                                fontSize: "0.76rem",
                                color: ui.textSub,
                                padding: "9px 12px",
                                textAlign: "center",
                                alignSelf: "center",
                              }}
                            >
                              {new Date(
                                task.date + "T00:00:00",
                              ).toLocaleDateString("en-PH", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            <span
                              style={{
                                fontSize: "0.73rem",
                                color: ui.textSub,
                                padding: "9px 12px",
                                alignSelf: "center",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {task.drugName}
                            </span>
                            <span
                              style={{
                                padding: "9px 12px",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.67rem",
                                  fontWeight: 600,
                                  padding: "2px 8px",
                                  borderRadius: 99,
                                  background: stc.bg,
                                  color: stc.color,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {task.status}
                              </span>
                            </span>
                            <span
                              style={{
                                padding: "9px 12px",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.67rem",
                                  fontWeight: 600,
                                  padding: "2px 8px",
                                  borderRadius: 99,
                                  background: tlc.bg,
                                  color: tlc.color,
                                }}
                              >
                                {task.timeline}
                              </span>
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
}

export default MonitoringPage;
