// src/components/gmp/gmpMockData.js
// Mock data for GMP Task Queue & Workflow — swap apiFetch calls with these when backend is ready

const ESTABLISHMENTS = [
  "Pharmaessence Inc.",
  "Oncolife Corporation",
  "Metro Drug Inc.",
  "Natco Lifesciences Philippines Inc.",
  "Sun Pharma Philippines Inc.",
  "DKSH Market Expansion Services Philippines",
  "First Global Trading Corporation",
  "Troikaa Pharmaceuticals",
  "A. Menarini Philippines Inc.",
  "Nelpa Lifesciences Inc.",
  "Unilab Inc.",
  "Zuellig Pharma Corporation",
  "Pfizer Philippines Inc.",
  "Novartis Healthcare Philippines Inc.",
  "GlaxoSmithKline Philippines Inc.",
  "Abbott Laboratories Philippines Inc.",
  "Johnson & Johnson Philippines Inc.",
  "Roche Philippines Inc.",
  "Sanofi Philippines Inc.",
  "AstraZeneca Philippines Inc.",
];

const ADDRESSES = [
  "Suite 2501 East Tower, Philippines Stock Exchange Centre, Ortigas Center, Pasig City",
  "Sta Rosa Estate, Barangay Macabling, Sta Rosa, Laguna",
  "Unit 201 DMC Building Diamond St., cor Sto Domingo, Cainta Rizal",
  "17F Unit 3, Milestone @ Fifth Avenue, Taguig City, Metro Manila",
  "7290 Gregory St., Phase 1, Marcelo Green, Parañaque City",
  "3rd Floor Science Hub Tower 2, Cyberpark, Pinagsama, Taguig",
  "4th Floor, W Building, 11th Avenue corner Bonifacio Global City, Taguig City",
  "Km. 18, #5 Maywood Ave., Maywood City, Metro Manila",
  "Unit 505 Richmonde Plaza, Lourdes Drive, Pasig City",
  "23rd Floor Robinsons Equitable Tower, ADB Ave., Pasig City",
];

const TRANSACTION_TYPES = [
  "Initial", "Renewal", "Variation", "Transfer", "Amendment",
];

const EVALUATORS = [
  "RLCASTILLO", "A037", "A045", "B012", "C089", "D023", "E056",
  "JMREYES", "KGSANTOS", "LMCRUZ",
];

const PICS_OPTIONS = ["PIC/S", "NON PIC/S"];

const PRODUCT_LINES = [
  "DRUG", "VAC", "TM", "COS", "BIO", "VET", "NF",
];

const TYPE_ISSUANCE = [
  "New Certificate", "Renewal Certificate", "Amended Certificate", "Replacement",
];

const DECISIONS = ["Approved", "Disapproved", "Deferred", "For Compliance", "On Hold"];

const APP_STATUSES = [
  "ON-PROCESS", "ON-PROCESS", "ON-PROCESS",
  "COMPLETED", "COMPLETED",
  "PENDING", "FOR DECKING", "DECKED",
];

const STEPS = ["FDAC", "Decking", "Evaluation", "Checking", "Re-Eval", "Printing"];

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rndDate(start, end) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return new Date(s + Math.random() * (e - s)).toISOString().slice(0, 10);
}
function pad(n) { return String(n).padStart(6, "0"); }

// ── Generate 60 mock records ───────────────────────────────────────────────────
export const MOCK_RECORDS = Array.from({ length: 60 }, (_, i) => {
  const id          = i + 1;
  const year        = 2025 + (i % 2);
  const dtn         = `${year}${pad(1000 + i)}${pad(Math.floor(Math.random() * 999999))}`.slice(0, 18);
  const status      = rnd(APP_STATUSES);
  const stepIdx     = Math.floor(Math.random() * STEPS.length);
  const isDecked    = stepIdx >= 1;
  const dateReceived = rndDate("2025-01-01", "2026-06-01");

  return {
    id,
    dtn,
    related_dtn:      i % 5 === 0 ? `REL-${pad(i)}` : null,
    processing_type:  `Regular (${year})`,
    app_status:       status,
    current_step:     STEPS[stepIdx],
    est_category:     rnd(PRODUCT_LINES),
    lto_company:      rnd(ESTABLISHMENTS),
    lto_address:      rnd(ADDRESSES),
    lto_number:       `LTO-${Math.floor(10000 + Math.random() * 89999)}`,
    transaction_type: rnd(TRANSACTION_TYPES),
    evaluator:        isDecked ? rnd(EVALUATORS) : null,
    pics_nonpics:     rnd(PICS_OPTIONS),
    date_received:    dateReceived,
    date_decked:      isDecked ? rndDate(dateReceived, "2026-06-10") : null,
    date_evaluated:   stepIdx >= 2 ? rndDate(dateReceived, "2026-06-15") : null,
    foreign_mfr:      i % 3 === 0 ? `Foreign Mfr. ${i}` : null,
    foreign_mfr_addr: i % 3 === 0 ? `Some Address, Country ${i % 10}` : null,
    secpa_number:     stepIdx >= 4 ? `SECPA-${pad(1000 + i)}` : null,
    cert_number:      stepIdx >= 4 ? `CERT-${year}-${pad(i)}` : null,
    type_issuance:    stepIdx >= 4 ? rnd(TYPE_ISSUANCE) : null,
    cert_validity:    stepIdx >= 4 ? `${year + 1}-12-31` : null,
    decision:         stepIdx >= 3 ? rnd(DECISIONS) : null,
    released_date:    status === "COMPLETED" ? rndDate("2025-06-01", "2026-06-10") : null,
    processed_time:   status === "COMPLETED" ? `${Math.floor(10 + Math.random() * 50)} days` : null,
    end_date:         status === "COMPLETED" ? rndDate("2025-06-01", "2026-06-10") : null,
    timeline:         `${Math.floor(15 + Math.random() * 60)} days`,
    remarks:          i % 4 === 0 ? "For additional compliance documents" : null,
    date_nod:         i % 7 === 0 ? rndDate("2025-03-01", "2026-05-01") : null,
    date_printed:     status === "COMPLETED" ? rndDate("2025-06-01", "2026-06-15") : null,
    compliance_docs:  i % 6 === 0 ? "Additional test reports submitted" : null,
    compliance_date_received: i % 6 === 0 ? rndDate("2025-04-01", "2026-05-01") : null,
    product_line:     rnd(PRODUCT_LINES),
    is_decked:        isDecked,
  };
});

// ── Application log entries per record ────────────────────────────────────────
function makeLogs(record) {
  const stepIdx = STEPS.indexOf(record.current_step);
  return STEPS.slice(0, stepIdx + 1).map((step, i) => {
    const isLast = i === stepIdx;
    const sd = rndDate(record.date_received ?? "2025-01-01", "2026-06-01");
    const ad = isLast && record.app_status === "ON-PROCESS"
      ? null
      : rndDate(sd, "2026-06-15");
    return {
      id: i + 1,
      application_step:   step,
      application_status: ad ? "Completed" : "In Progress",
      user_name:          rnd(EVALUATORS),
      action:             {
        "FDAC":       "For LRD Decking",
        "Decking":    "Forwarded to Quality Evaluation",
        "Evaluation": "Endorsed to Supervisor",
        "Checking":   "Approved — For Certificate",
        "Re-Eval":    "Endorsed to Supervisor",
        "Printing":   "Certificate Printed",
      }[step] ?? "Processed",
      recommendation: {
        "FDAC":       "Decked",
        "Decking":    "For Evaluation",
        "Evaluation": "For Approval",
        "Checking":   "For Printing",
        "Re-Eval":    "For Approval",
        "Printing":   "Completed",
      }[step] ?? "",
      start_date:        sd + "T13:47:00",
      accomplished_date: ad ? ad + "T17:22:00" : null,
      log_index:         i + 1,
      remarks:           i % 3 === 0 ? "Processed on schedule" : null,
    };
  });
}

export const MOCK_LOGS = Object.fromEntries(
  MOCK_RECORDS.map(r => [r.id, makeLogs(r)])
);

// ── Filter counts ─────────────────────────────────────────────────────────────
function countBy(key) {
  const map = {};
  MOCK_RECORDS.forEach(r => {
    const v = r[key] ?? "Unknown";
    map[v] = (map[v] ?? 0) + 1;
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ value: label, label, count }));
}

const STATUS_COLORS_MAP = {
  "ON-PROCESS":  "#3b82f6",
  "COMPLETED":   "#10b981",
  "PENDING":     "#f59e0b",
  "FOR DECKING": "#06b6d4",
  "DECKED":      "#6366f1",
  "DISAPPROVED": "#ef4444",
};

export const MOCK_FILTER_COUNTS = {
  total:          MOCK_RECORDS.length,
  not_yet_decked: MOCK_RECORDS.filter(r => !r.is_decked).length,
  decked:         MOCK_RECORDS.filter(r => r.is_decked).length,
  groups: [
    {
      label: "Product Line",
      key:   "est_category",
      items: countBy("est_category").map(i => ({ ...i, color: "#6366f1" })),
    },
    {
      label: "All Status",
      key:   "app_status",
      items: [
        { value:"all", label:"All", count: MOCK_RECORDS.length, color:"#94a3b8" },
        ...countBy("app_status").map(i => ({
          ...i, color: STATUS_COLORS_MAP[i.value] ?? "#94a3b8",
        })),
      ],
    },
    {
      label: "Current Step",
      key:   "current_step",
      items: countBy("current_step").map(i => ({ ...i, color: "#10b981" })),
    },
    {
      label: "Transaction Type",
      key:   "transaction_type",
      items: countBy("transaction_type").map(i => ({ ...i, color: "#f59e0b" })),
    },
  ],
};
