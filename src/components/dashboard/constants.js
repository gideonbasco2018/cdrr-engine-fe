import { GMP_STEP_MAP } from "../gmp/shared/constants";

// ─── Brand colors ─────────────────────────────────────────────────────────────
export const FB = "#1877F2";
export const FB_LIGHT = "#E7F0FD";

// ─── Post-Evaluation Status chips ─────────────────────────────────────────────
// The backend hands back one display label per application, tagged "returned"
// or "forward" (see get_step_breakdown in app/crud/gmp_post_eval_status.py).
// Returns are drawn FILLED and forward steps as a pale tint, so "this one is
// mine to act on" reads before the words do — and the two tell apart by
// lightness, not only hue.
export const POST_EVAL_GROUP_RETURNED = "returned";
export const POST_EVAL_RETURNED_BY_PREFIX = "Returned by ";

// Motion for the card and its "See all". Scoped to a `pe-` prefix and
// rendered by each component rather than added to DashboardPage's global
// `cdrrPulse`, which is a hard 1 → 0.4 opacity blink: fine as a placeholder,
// but it draws the eye to the loading state instead of the content.
//
// `.pe-skel` sweeps a highlight across the placeholder instead of blinking it,
// so nothing flashes. `.pe-row` eases rows in with a small stagger and carries
// the hover transition, so the background change is a fade rather than a jump.
// Everything stops under prefers-reduced-motion.
//
// Elements using `.pe-skel` must set backgroundColor, NOT the `background`
// shorthand — inline shorthand resets background-image and would wipe the
// sweep.
export const POST_EVAL_ANIM_CSS = `
@keyframes peRowIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes peShimmer { from { background-position: -160% 0; } to { background-position: 260% 0; } }
.pe-row { animation: peRowIn 280ms cubic-bezier(.22,.61,.36,1) both; transition: background-color 150ms ease; }
.pe-skel {
  background-image: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.26) 50%, transparent 100%);
  background-size: 200% 100%;
  background-repeat: no-repeat;
  animation: peShimmer 1.3s ease-in-out infinite;
}
.pe-chip { transition: background-color 160ms ease, color 160ms ease, border-color 160ms ease; }
.pe-fade { transition: opacity 200ms ease; }
@keyframes peBackdropIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes pePanelIn { from { opacity: 0; transform: translateY(12px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
.pe-backdrop { animation: peBackdropIn 180ms ease both; }
.pe-panel { animation: pePanelIn 240ms cubic-bezier(.22,.61,.36,1) both; }
.pe-scroll { scrollbar-width: thin; scrollbar-color: rgba(128,128,128,0.38) transparent; }
.pe-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.pe-scroll::-webkit-scrollbar-track { background: transparent; }
.pe-scroll::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.38); border-radius: 99px; }
.pe-scroll::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.62); }
@media (prefers-reduced-motion: reduce) {
  .pe-row, .pe-skel, .pe-backdrop, .pe-panel { animation: none; }
  .pe-row, .pe-chip, .pe-fade { transition: none; }
}
`;

// Labels the backend spells out itself rather than deriving from a step name
// (RETURN_LABEL_OVERRIDES in the crud module).
const POST_EVAL_RETURN_SPECIALS = {
  "For Compliance": { icon: "🕒", fill: "#a16207" },
  "Sent back — not checked": { icon: "⚠", fill: "#c2410c" },
};

// Darker ink per step for filled return chips — GMP_STEPS colors are tuned to
// sit behind their own hue as a 15% tint and go unreadable under white text.
const POST_EVAL_RETURN_FILL = {
  Decking: "#4338ca",
  Evaluator: "#a16207",
  Checker: "#0f766e",
  "QA Admin": "#6d28d9",
  "LRD Chief Admin": "#be185d",
  "OD Receiving": "#0e7490",
  "OD Releasing": "#c2410c",
  FROO: "#0369a1",
};

/**
 * Chip styling for one Post-Evaluation Status label.
 * @param {string} label  the backend's display label
 * @param {boolean} isReturn  true for anything in the "returned" group
 * @returns {{icon: string, background: ?string, color: ?string}} — null
 *   background/color means "no step matched", so the caller falls back to its
 *   own muted placeholder styling.
 */
export function postEvalChipTone(label, isReturn) {
  if (!label) return { icon: "📄", background: null, color: null };

  if (isReturn) {
    const special = POST_EVAL_RETURN_SPECIALS[label];
    if (special) return { icon: special.icon, background: special.fill, color: "#fff" };
    const step = label.startsWith(POST_EVAL_RETURNED_BY_PREFIX)
      ? label.slice(POST_EVAL_RETURNED_BY_PREFIX.length)
      : null;
    return {
      icon: "↩",
      background: (step && POST_EVAL_RETURN_FILL[step]) || "#334155",
      color: "#fff",
    };
  }

  const step = GMP_STEP_MAP[label];
  const color = step?.color ?? "#64748b";
  return { icon: step?.icon ?? "📄", background: `${color}26`, color };
}

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
