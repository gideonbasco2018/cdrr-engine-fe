// src/components/monitoring/genericDrugs/exportGenericPdf.js
// Builds a designed PDF report of the Generic Drugs page in the browser.
// Self-contained: same look as the Analytics PDF (A4 landscape, always light),
// but it does not depend on exportAnalyticsPdf.js.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const GENERIC_PDF_SECTIONS = [
  { key: "overview", label: "KPIs & Status Breakdown" },
  { key: "generics", label: "Summary per Generic Name" },
  { key: "applications", label: "Applications List" },
];

export const APP_GROUPS = [
  { key: "all", label: "All applications" },
  { key: "pending", label: "Pending only" },
  { key: "registered", label: "Registered (CPR) only" },
  { key: "lod", label: "LOD only" },
  { key: "other", label: "Other only" },
];

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
  gray: [156, 163, 175],
};

// ── Helpers ──────────────────────────────────────────────────
// jsPDF's built-in fonts only cover Latin-1; drop anything else (emoji etc.)
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

const newState = () => ({ y: M });

const ensure = (doc, state, h) => {
  if (state.y + h > BOTTOM) {
    doc.addPage();
    state.y = M;
  }
};

function sectionTitle(doc, state, title, sub) {
  ensure(doc, state, 18);
  doc.setFillColor(...C.brand);
  doc.roundedRect(M, state.y, 1.4, sub ? 9 : 6, 0.7, 0.7, "F");
  text(doc, title, M + 4, state.y + 5, { size: 13, bold: true });
  if (sub) text(doc, sub, M + 4, state.y + 9.5, { size: 8, color: C.muted });
  state.y += sub ? 14 : 10;
}

function note(doc, state, s) {
  ensure(doc, state, 10);
  text(doc, s, M, state.y + 4, { size: 8, color: C.muted });
  state.y += 10;
}

function kpiCard(doc, x, y, w, h, { label, value, sub, color }) {
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");
  doc.setFillColor(...color);
  doc.roundedRect(x, y + 2, 1.6, h - 4, 0.8, 0.8, "F");
  text(doc, label.toUpperCase(), x + 6, y + 6.5, {
    size: 7,
    bold: true,
    color: C.muted,
  });
  text(doc, value, x + 6, y + 15.5, { size: 19, bold: true, color });
  if (sub) text(doc, sub, x + 6, y + h - 3, { size: 7, color: C.muted });
}

// ── Donut ────────────────────────────────────────────────────
function poly(doc, pts, color) {
  const [x0, y0] = pts[0];
  const rel = pts
    .slice(1)
    .map(([px, py], i) => [px - pts[i][0], py - pts[i][1]]);
  doc.setFillColor(...color);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.05);
  doc.lines(rel, x0, y0, [1, 1], "FD", true);
}

function donut(doc, { cx, cy, r, ri, slices }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) {
    doc.setDrawColor(...C.track);
    doc.setLineWidth(r - ri);
    doc.circle(cx, cy, (r + ri) / 2, "S");
    return;
  }
  let a = -Math.PI / 2;
  slices.forEach((s) => {
    if (s.value <= 0) return;
    const span = (s.value / total) * Math.PI * 2;
    const steps = Math.max(6, Math.ceil(span / 0.05));
    const outer = [];
    const inner = [];
    for (let i = 0; i <= steps; i++) {
      const ang = a + (span * i) / steps;
      outer.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
      inner.push([cx + ri * Math.cos(ang), cy + ri * Math.sin(ang)]);
    }
    poly(doc, [...outer, ...inner.reverse()], s.color);
    a += span;
  });
}

// ── Table styling shared by every autoTable ──────────────────
const tableBase = (extra = {}) => ({
  theme: "plain",
  styles: {
    font: "helvetica",
    fontSize: 8,
    cellPadding: { top: 1.8, bottom: 1.8, left: 2, right: 2 },
    textColor: C.ink,
    lineColor: C.line,
    lineWidth: { bottom: 0.15 },
  },
  headStyles: {
    fillColor: C.brand,
    textColor: C.white,
    fontStyle: "bold",
    fontSize: 7.5,
    lineWidth: 0,
  },
  alternateRowStyles: { fillColor: C.soft },
  margin: { left: M, right: M, top: M, bottom: H - BOTTOM + 2 },
  ...extra,
});

// Draws a proportional bar inside a body cell of the given column
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

const runTable = (doc, state, opts) => {
  autoTable(doc, tableBase({ startY: state.y, ...opts }));
  state.y = doc.lastAutoTable.finalY + 8;
};

// ── Cover header ─────────────────────────────────────────────
function drawHeader(doc, state, { generics }) {
  doc.setFillColor(...C.brand);
  doc.rect(0, 0, W, 26, "F");
  text(doc, "Applications by Generic Name", M, 12, {
    size: 20,
    bold: true,
    color: C.white,
  });
  text(doc, "Center for Drug Regulation and Research", M, 19, {
    size: 9,
    color: [214, 230, 255],
  });
  text(doc, `Generated ${new Date().toLocaleString()}`, W - M, 10, {
    size: 8.5,
    color: [214, 230, 255],
    align: "right",
  });
  text(doc, `${generics.length} generic name(s) selected`, W - M, 15, {
    size: 8.5,
    color: [214, 230, 255],
    align: "right",
  });
  state.y = 33;
}

// ═════════════════════════ SECTIONS ═════════════════════════

function drawOverview(doc, state, d) {
  const T = d.summary?.totals ?? {};
  const total = num(T.total);

  // KPI row
  const gap = 5;
  const cw = (CW - gap * 4) / 5;
  const ch = 26;
  const cards = [
    {
      label: "Applications",
      value: fmt(T.total),
      sub: `${d.generics.length} generic name(s)`,
      color: C.brand,
    },
    {
      label: "Pending",
      value: fmt(T.pending),
      sub: "Not yet completed",
      color: C.amber,
    },
    {
      label: "Registered",
      value: fmt(T.registered),
      sub: "Completed, CPR released",
      color: C.green,
    },
    {
      label: "LOD",
      value: fmt(T.lod),
      sub: "Completed, LOD released",
      color: C.red,
    },
    {
      label: "Other",
      value: fmt(T.other),
      sub: "Completed, other document",
      color: C.gray,
    },
  ];
  ensure(doc, state, ch + 4);
  cards.forEach((c, i) => kpiCard(doc, M + i * (cw + gap), state.y, cw, ch, c));
  state.y += ch + 8;

  // Donut (left) + selected generics (right)
  const leftW = CW * 0.45;
  const rightW = CW - leftW - 8;
  const blockH = 68;
  ensure(doc, state, blockH + 8);
  const top = state.y;

  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, top, leftW, blockH, 2, 2, "S");
  text(doc, "Status Breakdown", M + 5, top + 7, { size: 11, bold: true });
  text(doc, "Pending vs Registered vs LOD vs Other", M + 5, top + 11.5, {
    size: 7.5,
    color: C.muted,
  });

  const slices = [
    { name: "Pending", value: num(T.pending), color: C.amber },
    { name: "Registered (CPR)", value: num(T.registered), color: C.green },
    { name: "LOD", value: num(T.lod), color: C.red },
    { name: "Other", value: num(T.other), color: C.gray },
  ];
  const cx = M + 32;
  const cy = top + 40;
  donut(doc, { cx, cy, r: 19, ri: 12.5, slices });
  text(doc, fmt(total), cx, cy + 1.2, {
    size: 11,
    bold: true,
    align: "center",
  });
  text(doc, "total", cx, cy + 5, {
    size: 6.5,
    color: C.muted,
    align: "center",
  });
  slices.forEach((sl, i) => {
    const ly = top + 24 + i * 7;
    const lx = M + 62;
    doc.setFillColor(...sl.color);
    doc.roundedRect(lx, ly - 2.4, 3, 3, 0.6, 0.6, "F");
    text(doc, sl.name, lx + 5, ly, { size: 8 });
    text(
      doc,
      `${fmt(sl.value)}  (${fmt(pct(sl.value, total), 1)}%)`,
      M + leftW - 5,
      ly,
      { size: 8, bold: true, align: "right" },
    );
  });

  // Picked generic names
  const rx = M + leftW + 8;
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(rx, top, rightW, blockH, 2, 2, "S");
  text(doc, "Selected Generic Names", rx + 5, top + 7, {
    size: 11,
    bold: true,
  });
  text(doc, `${d.generics.length} selected`, rx + 5, top + 11.5, {
    size: 7.5,
    color: C.muted,
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...C.ink);
  const lines = doc.splitTextToSize(t(d.generics.join(", ")), rightW - 10);
  const maxLines = 10;
  doc.text(lines.slice(0, maxLines), rx + 5, top + 19);
  if (lines.length > maxLines)
    text(doc, "... see Summary per Generic Name for the full list", rx + 5, top + blockH - 4, {
      size: 7.5,
      color: C.muted,
    });

  state.y = top + blockH + 8;

  note(
    doc,
    state,
    "Pending = status is not COMPLETED. Registered = COMPLETED with CPR released (a renewal of the same product counts again).",
  );
}

function drawGenerics(doc, state, d) {
  const rows = d.summary?.generics ?? [];
  const T = d.summary?.totals ?? {};
  sectionTitle(
    doc,
    state,
    "Summary per Generic Name",
    "Pending and registered applications (all years)",
  );
  if (!rows.length) return note(doc, state, "No data available.");

  const max = Math.max(...rows.map((r) => num(r.total)), 1);
  const body = rows.map((r) => [
    t(r.generic),
    fmt(r.total),
    "",
    fmt(r.pending),
    fmt(r.registered),
    fmt(r.lod),
    fmt(r.other),
  ]);
  body.push([
    "Total",
    fmt(T.total),
    "",
    fmt(T.pending),
    fmt(T.registered),
    fmt(T.lod),
    fmt(T.other),
  ]);

  runTable(doc, state, {
    head: [
      [
        "Generic name",
        "Applications",
        "",
        "Pending",
        "Registered (CPR)",
        "LOD",
        "Other",
      ],
    ],
    body,
    columnStyles: {
      1: { halign: "right", cellWidth: 24 },
      2: { cellWidth: 45 },
      3: { halign: "right", cellWidth: 22 },
      4: { halign: "right", cellWidth: 30 },
      5: { halign: "right", cellWidth: 18 },
      6: { halign: "right", cellWidth: 18 },
    },
    didParseCell: (h) => {
      if (h.section === "head" && [1, 3, 4, 5, 6].includes(h.column.index))
        h.cell.styles.halign = "right";
      if (h.section !== "body") return;
      if (h.row.index === body.length - 1) {
        h.cell.styles.fontStyle = "bold";
        h.cell.styles.fillColor = C.track;
        return;
      }
      if (h.column.index === 3 && h.cell.raw !== "0") {
        h.cell.styles.textColor = C.amber;
        h.cell.styles.fontStyle = "bold";
      }
      if (h.column.index === 4 && h.cell.raw !== "0") {
        h.cell.styles.textColor = C.green;
        h.cell.styles.fontStyle = "bold";
      }
    },
    // the Total row has no matching rows[i], so no bar is drawn there
    didDrawCell: barHook(doc, 2, (i) => rows[i]?.total, max, C.brand),
  });
}

async function drawApplications(doc, state, d, { group, report }) {
  const groupLabel =
    APP_GROUPS.find((g) => g.key === group)?.label ?? "All applications";
  const all = await d.fetchAllRecords(group, (done, total) =>
    report({ detail: `${fmt(done)} of ${fmt(total)} records` }),
  );

  sectionTitle(doc, state, `Applications (${fmt(all.length)})`, groupLabel);
  if (!all.length) return note(doc, state, "No applications found.");

  runTable(doc, state, {
    head: [
      [
        "#",
        "DTN",
        "Generic",
        "Brand",
        "Company",
        "Received",
        "Released",
        "Status",
        "Doc released",
      ],
    ],
    body: all.map((r, i) => [
      i + 1,
      r.dtn ?? "-",
      t(r.generic) || "-",
      t(r.brand) || "-",
      t(r.company) || "-",
      r.date_received ?? "-",
      r.date_released ?? "-",
      t(r.status) || "-",
      t(r.doc) || "-",
    ]),
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: { top: 1.5, bottom: 1.5, left: 1.8, right: 1.8 },
      textColor: C.ink,
      lineColor: C.line,
      lineWidth: { bottom: 0.15 },
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "right" },
      1: { cellWidth: 20 },
      5: { cellWidth: 21 },
      6: { cellWidth: 21 },
      7: { cellWidth: 24 },
    },
    didParseCell: (h) => {
      if (h.section === "head" && h.column.index === 0)
        h.cell.styles.halign = "right";
      if (h.section !== "body") return;
      if (h.column.index === 1) {
        h.cell.styles.textColor = C.brand;
        h.cell.styles.fontStyle = "bold";
      }
      if (h.column.index === 7) {
        const s = String(h.cell.raw).toUpperCase().trim();
        h.cell.styles.fontStyle = "bold";
        h.cell.styles.textColor =
          s === "COMPLETED" ? C.green : s && s !== "-" ? C.amber : C.muted;
      }
    },
  });
}

// ═════════════════════════ MAIN ═════════════════════════
export async function generateGenericPdf({
  sections,
  data,
  group = "all",
  onProgress = () => {},
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const state = newState();
  const skipped = [];

  drawHeader(doc, state, { generics: data.generics });

  const picked = GENERIC_PDF_SECTIONS.filter((s) => sections.includes(s.key));

  for (let i = 0; i < picked.length; i++) {
    const s = picked[i];
    const report = (extra = {}) =>
      onProgress({ step: i, total: picked.length, label: s.label, ...extra });
    report();
    // Let the UI repaint between sections
    await new Promise((r) => setTimeout(r, 0));
    try {
      // Start a section on a fresh page when little room is left
      if (i > 0 && state.y > M + 2 && BOTTOM - state.y < 70) {
        doc.addPage();
        state.y = M;
      }
      if (s.key === "overview") drawOverview(doc, state, data);
      else if (s.key === "generics") drawGenerics(doc, state, data);
      else if (s.key === "applications")
        await drawApplications(doc, state, data, { group, report });
    } catch (err) {
      console.error(`Generic PDF section "${s.key}" failed:`, err);
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
    text(doc, "CDRR Engine | Generic Drugs Report", M, H - 5.5, {
      size: 7.5,
      color: C.muted,
    });
    text(doc, `Page ${p} of ${pages}`, W - M, H - 5.5, {
      size: 7.5,
      color: C.muted,
      align: "right",
    });
  }

  doc.save(
    `CDRR-Generic-Drugs-Report-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
  return { pages, skipped };
}