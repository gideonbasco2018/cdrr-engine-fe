// ─── Brand colors ─────────────────────────────────────────────────────────────
export const FB = "#1877F2";
export const FB_LIGHT = "#E7F0FD";

// ─── Month / Year helpers ─────────────────────────────────────────────────────
export const MONTH_NUM = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04",
  May: "05", Jun: "06", Jul: "07", Aug: "08",
  Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

export const ALL_MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

export const CURRENT_YEAR = new Date().getFullYear();
export const CURRENT_MONTH_IDX = new Date().getMonth();

export const MONTHS_BY_YEAR = {};
for (let y = 2022; y <= CURRENT_YEAR; y++) {
  MONTHS_BY_YEAR[y] =
    y < CURRENT_YEAR ? ALL_MONTHS : ALL_MONTHS.slice(0, CURRENT_MONTH_IDX + 1);
}

export const AVAILABLE_YEARS = Array.from(
  { length: CURRENT_YEAR - 2022 + 1 },
  (_, i) => String(CURRENT_YEAR - i),
);

// ─── Chart series ─────────────────────────────────────────────────────────────
export const SERIES = [
  { key: "received",  label: "Total Received", color: "#1877F2" },
  { key: "completed", label: "Completed",       color: "#36a420" },
  { key: "onProcess", label: "On Process",      color: "#f59e0b" },
  { key: "target",    label: "Target",          color: "#9333ea", dashed: true },
];

// ─── Static targets data ──────────────────────────────────────────────────────
export const TARGETS_WEEKLY = [
  {
    id: 1,
    icon: "👥",
    label: "Process Application",
    goal: 10,
    done: 3,
    deadline: "Mar 13, 2026",
    description: "Evaluate and process CPR applications assigned to you.",
    items: [
      { name: "20230908133701 – Furacef-750 (Cefuroxime Sodium)",       done: true  },
      { name: "20230908133702 – Amoxil-500 (Amoxicillin)",               done: true  },
      { name: "20230908133703 – Calpol-250 (Paracetamol)",               done: true  },
      { name: "20230908133704 – Cloxacil-250 (Cloxacillin)",             done: false },
      { name: "20230908133705 – Augmentin-625 (Co-Amoxiclav)",           done: false },
      { name: "20230908133706 – Mefenamic-500 (Mefenamic Acid)",         done: false },
      { name: "20230908133707 – Losartan-50 (Losartan Potassium)",       done: false },
      { name: "20230908133708 – Amlodipine-10 (Amlodipine Besylate)",    done: false },
      { name: "20230908133709 – Metformin-500 (Metformin HCl)",          done: false },
      { name: "20230908133710 – Atorvastatin-20 (Atorvastatin Calcium)", done: false },
    ],
  },
];

export const TODAY = new Date("2026-03-11T00:00:00");
