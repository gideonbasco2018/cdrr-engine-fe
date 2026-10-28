// src/components/monitoring/companyMonitoring/exportCompanyMonitoringPdf.js
// Builds a designed A4 landscape PDF report for one company, in the browser.
// Same approach as the Analytics report: drawn from the loaded data (no
// screenshots), always light-themed so it prints well.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getCompanyMonitoringRecords } from "../../../api/analytics";

export const PDF_SECTIONS = [
  { key: "overview", label: "KPIs & TAT formula" },
  { key: "periods", label: "Received vs Processed (chart & table)" },
  { key: "evaluators", label: "Evaluators" },
  { key: "applications", label: "Applications (all pages, with TAT)" },
];

const EXPORT_PAGE_SIZE = 200;

// ── Layout & palette ─────────────────────────────────────────
const W = 297; // A4 landscape, mm
const H = 210;
const M = 12;
const CW = W - M * 2;
const BOTTOM = H - 14;

const C = {
  brand: [24, 119, 242],
  ink: [28, 32, 38],
  muted: [110, 118, 130],
  line: [225, 229, 235],
  soft: [246, 248, 251],
  track: [232, 236, 241],
  white: [255, 255, 255],
  green: [54, 164, 32],
  red: [224, 32, 32],
  amber: [245, 158, 11],
  teal: [8, 145, 178],
  tint: [238, 244, 255],
};

// ── Helpers ──────────────────────────────────────────────────
// jsPDF built-in fonts only cover Latin-1; drop anything else (emoji etc.)
const t = (s) =>
  String(s ?? "")
    .replace(/[^\x00-\xFF]/g, "")
    .trim();
const num = (v) => Number(v) || 0;
const fmt = (n, d = 0) =>
  num(n).toLocaleString(undefined, {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  });
const pct = (n, d) => (d > 0 ? (n / d) * 100 : 0);

const text = (
  doc,
  s,
  x,
  y,
  { size = 9, bold = false, color = C.ink, align = "left" } = {},
) => {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.text(t(s), x, y, { align });
};

const ensure = (doc, state, h) => {
  if (state.y + h > BOTTOM) {
    doc.addPage();
    state.y = M;
  }
};

// `need` = height of the content that follows, so the title never sits alone
// at the bottom of a page
function sectionTitle(doc, state, title, sub, need = 0) {
  ensure(doc, state, Math.max(16, need));
  doc.setFillColor(...C.brand);
  doc.roundedRect(M, state.y, 1.4, sub ? 8 : 5.5, 0.7, 0.7, "F");
  text(doc, title, M + 4, state.y + 4.5, { size: 11.5, bold: true });
  if (sub) text(doc, sub, M + 4, state.y + 8.5, { size: 7.5, color: C.muted });
  state.y += sub ? 12 : 9;
}

function note(doc, state, s) {
  ensure(doc, state, 10);
  text(doc, s, M, state.y + 4, { size: 9, color: C.muted });
  state.y += 10;
}

// ── Cover header ─────────────────────────────────────────────
function drawHeader(
  doc,
  state,
  { company, scopeLabel, basis, filters, userName },
) {
  doc.setFillColor(...C.brand);
  doc.rect(0, 0, W, 21, "F");
  text(doc, "Company Monitoring Report", M, 7, {
    size: 8,
    bold: true,
    color: [214, 230, 255],
  });
  text(doc, company, M, 14, { size: 15, bold: true, color: C.white });

  const sub = [
    scopeLabel,
    `Applications ${basis} in the period`,
    ...filters,
  ].join("  |  ");
  text(doc, sub, M, 18.5, { size: 7.5, color: [214, 230, 255] });

  const meta = [`Generated ${new Date().toLocaleString()}`];
  if (userName) meta.push(`by ${userName}`);
  meta.forEach((line, i) =>
    text(doc, line, W - M, 7 + i * 4.5, {
      size: 7.5,
      color: [214, 230, 255],
      align: "right",
    }),
  );
  state.y = 26;
}

// ── KPI card ─────────────────────────────────────────────────
function kpiCard(doc, x, y, w, h, { label, value, sub, color }) {
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");
  doc.setFillColor(...color);
  doc.roundedRect(x, y + 2, 1.5, h - 4, 0.75, 0.75, "F");
  text(doc, label.toUpperCase(), x + 5, y + 5, {
    size: 6.3,
    bold: true,
    color: C.muted,
  });
  text(doc, value, x + 5, y + 11.5, { size: 14, bold: true, color });
  if (sub) text(doc, sub, x + 5, y + h - 2.3, { size: 6, color: C.muted });
}

// ── Grouped bar chart (received vs processed) ────────────────
const niceMax = (v) => {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
};

function barChart(doc, { x, y, w, h, periods }) {
  // legend
  [
    ["Received", C.brand],
    ["Processed", C.green],
  ].forEach(([name, color], i) => {
    const lx = x + i * 30;
    doc.setFillColor(...color);
    doc.roundedRect(lx, y + 0.6, 3, 3, 0.6, 0.6, "F");
    text(doc, name, lx + 5, y + 3, { size: 7.5, color: C.muted });
  });

  const px = x + 10;
  const py = y + 9;
  const pw = w - 12;
  const ph = h - 9 - 8;
  const max = niceMax(
    Math.max(...periods.flatMap((p) => [num(p.received), num(p.processed)]), 1),
  );

  // grid + y labels
  const ticks = 4;
  doc.setLineWidth(0.15);
  for (let i = 0; i <= ticks; i++) {
    const gy = py + ph - (ph * i) / ticks;
    doc.setDrawColor(...(i === 0 ? C.muted : C.line));
    doc.line(px, gy, px + pw, gy);
    text(doc, fmt((max * i) / ticks), px - 2, gy + 1, {
      size: 7,
      color: C.muted,
      align: "right",
    });
  }

  const n = periods.length;
  const slot = pw / Math.max(n, 1);
  const bw = Math.min(slot * 0.3, 7);
  periods.forEach((p, i) => {
    const cx = px + slot * i + slot / 2;
    [
      [num(p.received), C.brand, -bw - 0.4],
      [num(p.processed), C.green, 0.4],
    ].forEach(([v, color, dx]) => {
      const bh = (ph * v) / max;
      if (v > 0) {
        doc.setFillColor(...color);
        doc.rect(cx + dx, py + ph - bh, bw, bh, "F");
        text(doc, fmt(v), cx + dx + bw / 2, py + ph - bh - 1, {
          size: 6.5,
          color: C.muted,
          align: "center",
        });
      }
    });
    text(doc, p.label, cx, py + ph + 5, {
      size: 7,
      color: C.muted,
      align: "center",
    });
  });
}

// ── Table styling shared by every autoTable ──────────────────
const tableBase = (extra = {}) => ({
  theme: "plain",
  styles: {
    font: "helvetica",
    fontSize: 7.5,
    cellPadding: { top: 1.1, bottom: 1.1, left: 1.8, right: 1.8 },
    textColor: C.ink,
    lineColor: C.line,
    lineWidth: { bottom: 0.15 },
  },
  headStyles: {
    fillColor: C.brand,
    textColor: C.white,
    fontStyle: "bold",
    fontSize: 7,
    lineWidth: 0,
  },
  alternateRowStyles: { fillColor: C.soft },
  margin: { left: M, right: M, top: M, bottom: H - BOTTOM + 2 },
  ...extra,
});

const runTable = (doc, state, opts) => {
  autoTable(doc, tableBase({ startY: state.y, ...opts }));
  state.y = doc.lastAutoTable.finalY + 5;
};

// Proportional bar inside a body cell of the given column
const barHook = (doc, colIdx, valueOf, max, color) => (d) => {
  if (d.section !== "body" || d.column.index !== colIdx) return;
  const v = valueOf(d.row.index);
  if (v == null) return;
  const bx = d.cell.x + 1.5;
  const bw = d.cell.width - 3;
  const by = d.cell.y + d.cell.height / 2 - 1.2;
  doc.setFillColor(...C.track);
  doc.roundedRect(bx, by, bw, 2.4, 1.2, 1.2, "F");
  const fw = Math.max(bw * (v / (max || 1)), v > 0 ? 1.2 : 0);
  if (fw > 0) {
    doc.setFillColor(...color);
    doc.roundedRect(bx, by, fw, 2.4, 1.2, 1.2, "F");
  }
};

// ═════════════════════════ SECTIONS ═════════════════════════

function drawOverview(doc, state, { data }) {
  const s = data.summary ?? {};
  const withCharter = num(s.within) + num(s.beyond);

  const gap = 3;
  const cw = (CW - gap * 5) / 6;
  const ch = 18;
  const cards = [
    {
      label: "Received",
      value: fmt(s.received),
      sub: "Applications received",
      color: C.brand,
    },
    {
      label: "Processed",
      value: fmt(s.processed),
      sub: "Completed and released",
      color: C.green,
    },
    {
      label: "Still open",
      value: fmt(s.still_open),
      sub: "Received, not released",
      color: C.amber,
    },
    {
      label: "Avg TAT",
      value: s.avg_tat == null ? "-" : `${fmt(s.avg_tat, 1)} d`,
      sub: s.tat_count
        ? `Working days, ${fmt(s.tat_count)} apps`
        : "No released apps",
      color: C.teal,
    },
    {
      label: "Within charter",
      value: fmt(s.within),
      sub: `${fmt(pct(num(s.within), withCharter), 1)}% of apps w/ charter`,
      color: C.green,
    },
    {
      label: "Beyond charter",
      value: fmt(s.beyond),
      sub: `${fmt(pct(num(s.beyond), withCharter), 1)}% of apps w/ charter`,
      color: C.red,
    },
  ];
  ensure(doc, state, ch + 4);
  cards.forEach((c, i) => kpiCard(doc, M + i * (cw + gap), state.y, cw, ch, c));
  state.y += ch + 5;

  // TAT formula box (two columns to save height)
  const f = data.formula ?? {};
  const items = [
    f.counting,
    f.ongoing,
    f.charter,
    f.processed,
    f.evaluator,
  ].filter(Boolean);
  const colW = (CW - 14) / 2;
  const lines = items.map((b) => doc.splitTextToSize(`- ${t(b)}`, colW));
  const mid = Math.ceil(lines.length / 2);
  const leftCol = lines.slice(0, mid);
  const rightCol = lines.slice(mid);
  const count = (col) => col.reduce((n, l) => n + l.length, 0);
  const LH = 3.4;
  const boxH = 14 + Math.max(count(leftCol), count(rightCol)) * LH;

  ensure(doc, state, boxH + 4);
  doc.setFillColor(...C.tint);
  doc.setDrawColor(...C.brand);
  doc.setLineWidth(0.25);
  doc.roundedRect(M, state.y, CW, boxH, 2, 2, "FD");
  text(doc, "How is Turn Around Time (TAT) computed?", M + 4, state.y + 5, {
    size: 8.5,
    bold: true,
    color: C.brand,
  });
  text(doc, f.tat ?? "", M + 4, state.y + 9.5, { size: 7.5, bold: true });
  const drawCol = (col, x) => {
    let yy = state.y + 14;
    col.forEach((ls) =>
      ls.forEach((ln) => {
        text(doc, ln, x, yy, { size: 7, color: C.muted });
        yy += LH;
      }),
    );
  };
  drawCol(leftCol, M + 4);
  drawCol(rightCol, M + 4 + colW + 6);
  state.y += boxH + 6;
}

function drawPeriods(doc, state, { data, periodWord, scopeLabel }) {
  const periods = data.periods ?? [];
  const s = data.summary ?? {};
  const chartH = 52;
  sectionTitle(
    doc,
    state,
    `Received vs Processed per ${periodWord}`,
    scopeLabel,
    chartH + 24, // keep the title together with the chart
  );
  if (!periods.length) return note(doc, state, "No data for this period.");

  ensure(doc, state, chartH + 4);
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, state.y, CW, chartH, 2, 2, "S");
  barChart(doc, {
    x: M + 5,
    y: state.y + 3,
    w: CW - 10,
    h: chartH - 5,
    periods,
  });
  state.y += chartH + 5;

  // Only list periods that have data (the chart still shows every month)
  const active = periods.filter(
    (p) => num(p.received) > 0 || num(p.processed) > 0,
  );
  const body = active.map((p) => [
    p.label,
    fmt(p.received),
    fmt(p.processed),
    p.avg_tat == null ? "-" : fmt(p.avg_tat, 1),
  ]);
  body.push([
    "Total",
    fmt(s.received),
    fmt(s.processed),
    s.avg_tat == null ? "-" : fmt(s.avg_tat, 1),
  ]);
  runTable(doc, state, {
    head: [
      [
        periodWord === "year" ? "Year" : "Month",
        "Received",
        "Processed",
        "Avg TAT (working days)",
      ],
    ],
    body,
    tableWidth: 150,
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
    didParseCell: (h) => {
      if (h.section === "head" && h.column.index > 0)
        h.cell.styles.halign = "right";
      if (h.section === "body" && h.row.index === body.length - 1) {
        h.cell.styles.fontStyle = "bold";
        h.cell.styles.fillColor = C.track;
      }
    },
  });
  if (active.length < periods.length) {
    text(
      doc,
      `${periods.length - active.length} ${periodWord}(s) with no applications are not listed.`,
      M,
      state.y - 3,
      {
        size: 7,
        color: C.muted,
      },
    );
    state.y += 3;
  }
}

function drawEvaluators(doc, state, { data, basis, scopeLabel }) {
  const rows = data.evaluators ?? [];
  sectionTitle(
    doc,
    state,
    "Evaluators",
    `Quality Evaluation, applications ${basis} in ${scopeLabel}`,
  );
  if (!rows.length) return note(doc, state, "No applications.");

  const total = rows.reduce((a, r) => a + num(r.count), 0);
  const max = Math.max(...rows.map((r) => num(r.count)), 1);
  runTable(doc, state, {
    head: [
      [
        "Evaluator",
        "Name",
        "Applications",
        "Share",
        "",
        "Avg TAT (working days)",
      ],
    ],
    body: rows.map((r) => [
      r.code,
      r.full_name || "-",
      fmt(r.count),
      `${fmt(pct(num(r.count), total), 1)}%`,
      "",
      r.avg_tat == null ? "-" : fmt(r.avg_tat, 1),
    ]),
    columnStyles: {
      2: { halign: "right", cellWidth: 26 },
      3: { halign: "right", cellWidth: 20 },
      4: { cellWidth: 50 },
      5: { halign: "right", cellWidth: 40 },
    },
    didParseCell: (h) => {
      if (h.section === "head" && [2, 3, 5].includes(h.column.index))
        h.cell.styles.halign = "right";
    },
    didDrawCell: barHook(doc, 4, (i) => num(rows[i]?.count), max, C.brand),
  });
}

async function drawApplications(doc, state, ctx) {
  const { params, onProgress, stepInfo } = ctx;

  // Fetch ALL applications for the current filters, not just the visible page
  const base = { ...params, page_size: EXPORT_PAGE_SIZE };
  const first = await getCompanyMonitoringRecords({ ...base, page: 1 });
  let rows = first?.data ?? [];
  const pages = Math.ceil((first?.total ?? 0) / EXPORT_PAGE_SIZE);
  for (let p = 2; p <= pages; p++) {
    onProgress({ ...stepInfo, label: `Applications (page ${p} of ${pages})` });
    await new Promise((r) => setTimeout(r, 0));
    const res = await getCompanyMonitoringRecords({ ...base, page: p });
    rows = rows.concat(res?.data ?? []);
  }

  sectionTitle(
    doc,
    state,
    "Applications",
    `${fmt(rows.length)} application${rows.length === 1 ? "" : "s"}${
      ctx.filters.length ? ` | ${ctx.filters.join(" | ")}` : ""
    }`,
  );
  if (!rows.length) return note(doc, state, "No applications found.");

  const body = rows.map((r) => {
    const released =
      r.date_released ?? (r.state === "Ongoing" ? "Ongoing" : "-");
    const tat =
      r.tat_days == null
        ? "-"
        : `${r.tat_days}${r.state === "Ongoing" ? " so far" : ""}`;
    return [
      r.dtn ?? "-",
      t(r.drug ?? "-"),
      t([r.app_type, r.entry_type].filter(Boolean).join(" | ")) || "-",
      r.date_received ?? "-",
      released,
      tat,
      r.charter_days ?? "-",
      r.timeline === "N/A" ? "-" : r.timeline,
      t(
        [r.evaluator?.code, r.evaluator?.full_name].filter(Boolean).join(" - "),
      ) || "-",
    ];
  });

  runTable(doc, state, {
    head: [
      [
        "DTN",
        "Drug",
        "Type",
        "Received",
        "Released",
        "TAT (days)",
        "Charter",
        "Result",
        "Evaluator",
      ],
    ],
    body,
    columnStyles: {
      0: { cellWidth: 25 },
      2: { cellWidth: 34 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { halign: "right", cellWidth: 20 },
      6: { halign: "right", cellWidth: 14 },
      7: { cellWidth: 15 },
      8: { cellWidth: 46 },
    },
    didParseCell: (h) => {
      if (h.section === "head" && [5, 6].includes(h.column.index))
        h.cell.styles.halign = "right";
      if (h.section !== "body") return;
      if (h.column.index === 5) h.cell.styles.fontStyle = "bold";
      if (h.column.index === 7) {
        h.cell.styles.fontStyle = "bold";
        if (h.cell.raw === "Within") h.cell.styles.textColor = C.green;
        else if (h.cell.raw === "Beyond") h.cell.styles.textColor = C.red;
        else h.cell.styles.textColor = C.muted;
      }
      if (h.column.index === 4 && h.cell.raw === "Ongoing")
        h.cell.styles.textColor = C.amber;
    },
  });
  text(
    doc,
    "Holidays are not deducted from TAT. Ongoing applications are counted up to the date this report was generated.",
    M,
    state.y - 4,
    { size: 7.5, color: C.muted },
  );
  state.y += 4;
}

// ═════════════════════════ MAIN ═════════════════════════
// params   = filters sent to the API: { company, year, month, basis, sort, user_id?, search? }
// filters  = human readable extra filters for the header, e.g. ["Evaluator: AB"]
export async function generateCompanyMonitoringPdf({
  sections,
  data,
  params,
  scopeLabel,
  periodWord,
  filters = [],
  userName = "",
  onProgress = () => {},
}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true, // deflate all page streams
    floatPrecision: 2, // 2 decimals per coordinate instead of 16
    putOnlyUsedFonts: true, // don't embed unused font definitions
  });
  const state = { y: M };
  const skipped = [];
  const company = data.company ?? [].concat(params.company).join(", ");
  const basis = params.basis;

  drawHeader(doc, state, { company, scopeLabel, basis, filters, userName });

  // When several companies are combined, list them under the header
  const included = data.companies ?? [];
  if (included.length > 1) {
    const lines = doc.splitTextToSize(
      `Companies included: ${t(included.join("; "))}`,
      CW,
    );
    lines.forEach((ln, i) =>
      text(doc, ln, M, state.y + i * 4, { size: 8, color: C.muted }),
    );
    state.y += lines.length * 4 + 4;
  }

  const picked = PDF_SECTIONS.filter((s) => sections.includes(s.key));
  const draw = {
    overview: drawOverview,
    periods: drawPeriods,
    evaluators: drawEvaluators,
    applications: drawApplications,
  };

  for (let i = 0; i < picked.length; i++) {
    const s = picked[i];
    const stepInfo = { step: i, total: picked.length, label: s.label };
    onProgress(stepInfo);
    // Let the UI repaint between sections
    await new Promise((r) => setTimeout(r, 0));
    try {
      // Start a major section on a fresh page unless it fits the rest of this one
      if (
        i > 0 &&
        s.key !== "overview" &&
        state.y > M + 2 &&
        BOTTOM - state.y < 70
      ) {
        doc.addPage();
        state.y = M;
      }
      await draw[s.key](doc, state, {
        data,
        params,
        basis,
        scopeLabel,
        periodWord,
        filters,
        onProgress,
        stepInfo,
      });
    } catch (err) {
      console.error(`PDF section "${s.key}" failed:`, err);
      skipped.push(`${s.label} (${err.message || "failed"})`);
    }
  }

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.2);
    doc.line(M, H - 10, W - M, H - 10);
    text(doc, `CDRR Engine | Company Monitoring | ${company}`, M, H - 5.5, {
      size: 7.5,
      color: C.muted,
    });
    text(doc, `Page ${p} of ${pages}`, W - M, H - 5.5, {
      size: 7.5,
      color: C.muted,
      align: "right",
    });
  }

  const safe = t(company)
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50);
  doc.save(
    `Company-Monitoring_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`,
  );
  return { pages, skipped };
}
