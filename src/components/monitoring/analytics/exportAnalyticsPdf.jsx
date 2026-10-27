// src/components/monitoring/analytics/exportAnalyticsPdf.js
// Builds a designed PDF report of the Analytics page in the browser.
//
// The report is drawn from the same data the page already loaded (no page
// screenshots), so it is sharp, always light-themed for print, and laid out for
// A4 landscape rather than copying the on-screen layout.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getInProgressSummary } from "../../../api/monitoring";

export const PDF_SECTIONS = [
  { key: "overview", label: "KPIs, Trend Overview & Approval Breakdown" },
  { key: "year", label: "Year-by-Year Summary" },
  { key: "quality", label: "Data Completeness" },
  { key: "classification", label: "By Classification & Top Drug Applications" },
  { key: "countries", label: "Top Countries by Entity Type" },
  { key: "inprogress", label: "In Progress (per unit, group and user)" },
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
  teal: [8, 145, 178],
  purple: [147, 51, 234],
  orange: [232, 124, 19],
};
const SERIES_PALETTE = [C.brand, C.amber, C.green, C.purple, C.teal, C.orange];
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

// ── Small helpers ────────────────────────────────────────────
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

const normalizeDocType = (dt) => {
  const raw = String(dt).trim();
  const k = raw.toLowerCase();
  return k === "cert" || k === "certificate" ? "CERT" : raw;
};
const DOC_ORDER = ["CERT", "CPR", "GLE", "LOD"];

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
  text(doc, s, M, state.y + 4, { size: 9, color: C.muted });
  state.y += 10;
}

// ── Cover header ─────────────────────────────────────────────
function drawHeader(doc, state, { userName, lastUpdated }) {
  doc.setFillColor(...C.brand);
  doc.rect(0, 0, W, 26, "F");
  text(doc, "CDRR Analytics Report", M, 12, {
    size: 20,
    bold: true,
    color: C.white,
  });
  text(doc, "Center for Drug Regulation and Research", M, 19, {
    size: 9,
    color: [214, 230, 255],
  });

  const meta = [`Generated ${new Date().toLocaleString()}`];
  if (userName) meta.push(`by ${userName}`);
  const lu = lastUpdated ? new Date(lastUpdated) : null;
  if (lu && !Number.isNaN(lu.getTime()))
    meta.push(`Data as of ${lu.toLocaleString()}`);
  meta.forEach((line, i) =>
    text(doc, line, W - M, 10 + i * 5, {
      size: 8.5,
      color: [214, 230, 255],
      align: "right",
    }),
  );
  state.y = 33;
}

// ── KPI card ─────────────────────────────────────────────────
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

// ── Line chart ───────────────────────────────────────────────
const niceMax = (v) => {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
};

function lineChart(doc, { x, y, w, h, labels, series }) {
  // legend
  let lx = x;
  series.forEach((s) => {
    doc.setFillColor(...s.color);
    doc.roundedRect(lx, y + 1, 4, 1.4, 0.7, 0.7, "F");
    text(doc, s.name, lx + 5.5, y + 2.6, { size: 7.5, color: C.muted });
    lx += 9 + doc.getTextWidth(t(s.name)) + 4;
  });

  const px = x + 12; // plot area (room for y labels)
  const py = y + 8;
  const pw = w - 14;
  const ph = h - 8 - 8;
  const max = niceMax(Math.max(...series.flatMap((s) => s.values), 1));

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

  const n = labels.length;
  const xAt = (i) => (n <= 1 ? px + pw / 2 : px + (pw * i) / (n - 1));
  const yAt = (v) => py + ph - (ph * v) / max;

  // x labels (skip some when crowded)
  const every = Math.ceil(n / 14);
  labels.forEach((lb, i) => {
    if (i % every === 0)
      text(doc, lb, xAt(i), py + ph + 5, {
        size: 7,
        color: C.muted,
        align: "center",
      });
  });

  // series
  series.forEach((s) => {
    doc.setDrawColor(...s.color);
    doc.setLineWidth(0.7);
    for (let i = 1; i < n; i++) {
      doc.line(xAt(i - 1), yAt(s.values[i - 1]), xAt(i), yAt(s.values[i]));
    }
    doc.setFillColor(...s.color);
    s.values.forEach((v, i) =>
      doc.circle(xAt(i), yAt(v), n > 24 ? 0.5 : 0.9, "F"),
    );
  });
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

// ═════════════════════════ SECTIONS ═════════════════════════

function drawOverview(doc, state, d) {
  const s = d.summary ?? {};
  const inProgress = num(s.in_progress ?? s.on_process);
  const total = num(s.total);
  const completed = num(s.completed);

  // KPI row
  const gap = 5;
  const cw = (CW - gap * 3) / 4;
  const ch = 26;
  const cards = [
    {
      label: "Total",
      value: fmt(total),
      sub: "All applications",
      color: C.brand,
    },
    {
      label: "In Progress",
      value: fmt(inProgress),
      sub: "Pending completion",
      color: C.amber,
    },
    {
      label: "Completed",
      value: fmt(completed),
      sub: `CPR ${fmt(s.cpr_completed)} | LOD ${fmt(s.lod_completed)}`,
      color: C.teal,
    },
    {
      label: "Completion rate",
      value: `${fmt(pct(completed, total), 1)}%`,
      sub: "Completed / total",
      color: C.green,
    },
  ];
  ensure(doc, state, ch + 4);
  cards.forEach((c, i) => kpiCard(doc, M + i * (cw + gap), state.y, cw, ch, c));
  state.y += ch + 8;

  // Trend (left) + Approval breakdown (right)
  const rows = Array.isArray(d.trendData) ? d.trendData : [];
  const labelKeys = ["period", "label", "month", "name", "year", "x"];
  const labelKey = labelKeys.find((k) => rows.some((r) => r?.[k] != null));
  const seriesKeys = rows.length
    ? Object.keys(rows[0]).filter(
        (k) =>
          k !== labelKey &&
          !labelKeys.includes(k) &&
          rows.some(
            (r) =>
              typeof r[k] === "number" ||
              (r[k] != null && !Number.isNaN(Number(r[k]))),
          ),
      )
    : [];
  const colorFor = (name, i) => {
    const n = name.toLowerCase();
    if (n.includes("cpr")) return C.green;
    if (n.includes("lod")) return C.red;
    if (n.includes("progress") || n.includes("process")) return C.amber;
    if (n.includes("complet")) return C.brand;
    return SERIES_PALETTE[i % SERIES_PALETTE.length];
  };
  const pretty = (k) =>
    k
      .replace(/_count$/, "")
      .replace(/_/g, " ")
      .replace(/\b\w+/g, (w) =>
        /^(cpr|lod|gle|cert)$/i.test(w)
          ? w.toUpperCase()
          : w[0].toUpperCase() + w.slice(1),
      );
  const monthLabel = (v) => {
    const sv = String(v);
    const m = sv.match(/^(\d{4})-(\d{1,2})$/);
    if (m) return MONTHS[Number(m[2]) - 1] ?? sv;
    if (/^\d{1,2}$/.test(sv) && Number(sv) >= 1 && Number(sv) <= 12)
      return MONTHS[Number(sv) - 1];
    return sv;
  };

  const leftW = CW * 0.67;
  const rightW = CW - leftW - 8;
  const blockH = 78;
  ensure(doc, state, blockH + 12);
  const top = state.y;

  // left: trend
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, top, leftW, blockH, 2, 2, "S");
  text(doc, "Trend Overview", M + 5, top + 7, { size: 11, bold: true });
  text(
    doc,
    `Grouped by ${d.trendYear === "All" ? "year" : "month"}${d.trendYear && d.trendYear !== "All" ? ` (${d.trendYear})` : ""}`,
    M + 5,
    top + 11.5,
    { size: 7.5, color: C.muted },
  );
  if (rows.length && seriesKeys.length) {
    lineChart(doc, {
      x: M + 5,
      y: top + 15,
      w: leftW - 10,
      h: blockH - 18,
      labels: rows.map((r) => monthLabel(r[labelKey] ?? "")),
      series: seriesKeys.map((k, i) => ({
        name: pretty(k),
        color: colorFor(k, i),
        values: rows.map((r) => num(r[k])),
      })),
    });
  } else {
    text(doc, "No trend data available", M + leftW / 2, top + blockH / 2, {
      size: 9,
      color: C.muted,
      align: "center",
    });
  }

  // right: approval breakdown
  const rx = M + leftW + 8;
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(rx, top, rightW, blockH, 2, 2, "S");
  text(doc, "Approval Breakdown", rx + 5, top + 7, { size: 11, bold: true });
  text(doc, "CPR vs LOD vs In Progress", rx + 5, top + 11.5, {
    size: 7.5,
    color: C.muted,
  });
  const slices = [
    { name: "CPR Released", value: num(s.cpr), color: C.green },
    { name: "LOD Released", value: num(s.lod), color: C.red },
    { name: "In Progress", value: inProgress, color: C.amber },
  ];
  const sum = slices.reduce((a, x) => a + x.value, 0);
  const cx = rx + rightW / 2;
  const cy = top + 36;
  donut(doc, { cx, cy, r: 19, ri: 12.5, slices });
  text(doc, fmt(sum), cx, cy + 1.2, { size: 11, bold: true, align: "center" });
  text(doc, "total", cx, cy + 5, {
    size: 6.5,
    color: C.muted,
    align: "center",
  });
  slices.forEach((sl, i) => {
    const ly = top + 60 + i * 6;
    doc.setFillColor(...sl.color);
    doc.roundedRect(rx + 6, ly - 2.4, 3, 3, 0.6, 0.6, "F");
    text(doc, sl.name, rx + 11, ly, { size: 8 });
    text(
      doc,
      `${fmt(sl.value)}  (${fmt(pct(sl.value, sum), 1)}%)`,
      rx + rightW - 5,
      ly,
      { size: 8, bold: true, align: "right" },
    );
  });
  state.y = top + blockH + 8;

  // CPR validity line
  if (num(s.cpr_completed) > 0) {
    ensure(doc, state, 8);
    text(
      doc,
      `CPR released: ${fmt(s.cpr_not_expired)} valid, ${fmt(s.cpr_expired)} expired${num(s.cpr_no_expiry) ? `, ${fmt(s.cpr_no_expiry)} without expiry date` : ""}.`,
      M,
      state.y + 3,
      { size: 8.5, color: C.muted },
    );
    state.y += 9;
  }
}

function drawYear(doc, state, d) {
  const data = d.yearSummaryData ?? [];
  sectionTitle(
    doc,
    state,
    "Year-by-Year Summary",
    "Released counted by the year it was released",
  );
  if (!data.length) return note(doc, state, "No year data available.");

  let totReceived = 0;
  let totReleased = 0;
  const body = data.map((r) => {
    const received = num(r.received);
    const released = num(r.total);
    totReceived += received;
    totReleased += released;
    return [
      String(r.year),
      fmt(received),
      fmt(released),
      String(r.year) === "No Date" || received <= 0
        ? "-"
        : `${fmt(pct(released, received), 1)}%`,
    ];
  });
  body.push([
    "Total",
    fmt(totReceived),
    fmt(totReleased),
    totReceived > 0 ? `${fmt(pct(totReleased, totReceived), 1)}%` : "-",
  ]);

  runTable(doc, state, {
    head: [["Year", "Received Application", "Total Released", "Rate"]],
    body,
    tableWidth: 180,
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
    didParseCell: (h) => {
      if (h.section === "body" && h.row.index === body.length - 1) {
        h.cell.styles.fontStyle = "bold";
        h.cell.styles.fillColor = C.track;
      }
      if (h.section === "head" && h.column.index > 0)
        h.cell.styles.halign = "right";
    },
  });
  text(
    doc,
    "Rate = Total Released / Received Application x 100.",
    M,
    state.y - 4,
    { size: 7.5, color: C.muted },
  );
  state.y += 4;
}

function drawQuality(doc, state, d) {
  const data = d.qualityData ?? [];
  sectionTitle(
    doc,
    state,
    "Data Completeness",
    "How complete the Date Received / Date Released / Document Type fields are",
  );
  if (!data.length)
    return note(doc, state, "No data completeness information available.");

  const T = data.reduce(
    (a, r) => ({
      total: a.total + num(r.total),
      rf: a.rf + num(r.received_filled),
      mr: a.mr + num(r.missing_received),
      lf: a.lf + num(r.released_filled),
      ml: a.ml + num(r.missing_released),
      df: a.df + num(r.doc_filled),
      md: a.md + num(r.missing_doc),
      c: a.c + num(r.complete),
    }),
    { total: 0, rf: 0, mr: 0, lf: 0, ml: 0, df: 0, md: 0, c: 0 },
  );
  const rowOf = (label, r) => [
    label,
    fmt(r.total),
    fmt(r.rf),
    fmt(r.mr),
    fmt(r.lf),
    fmt(r.ml),
    fmt(r.df),
    fmt(r.md),
    fmt(r.c),
    `${fmt(pct(r.c, r.total), 1)}%`,
  ];
  const body = data.map((r) =>
    rowOf(String(r.year), {
      total: num(r.total),
      rf: num(r.received_filled),
      mr: num(r.missing_received),
      lf: num(r.released_filled),
      ml: num(r.missing_released),
      df: num(r.doc_filled),
      md: num(r.missing_doc),
      c: num(r.complete),
    }),
  );
  body.push(rowOf("Total", T));

  const head = [
    "Year",
    "Total",
    "Received filled",
    "Missing",
    "Released filled",
    "Missing",
    "Doc type filled",
    "Missing",
    "Complete",
    "Completeness",
  ];
  const right = {};
  for (let i = 1; i < head.length; i++) right[i] = { halign: "right" };
  runTable(doc, state, {
    head: [head],
    body,
    columnStyles: right,
    didParseCell: (h) => {
      if (h.section === "head" && h.column.index > 0)
        h.cell.styles.halign = "right";
      if (h.section !== "body") return;
      if (h.row.index === body.length - 1) {
        h.cell.styles.fontStyle = "bold";
        h.cell.styles.fillColor = C.track;
      }
      if ([3, 5, 7].includes(h.column.index) && h.cell.raw !== "0")
        h.cell.styles.textColor = C.red;
      if (h.column.index === 9) {
        const p = parseFloat(String(h.cell.raw));
        h.cell.styles.fontStyle = "bold";
        h.cell.styles.textColor = p >= 95 ? C.green : p >= 80 ? C.amber : C.red;
      }
    },
  });
}

const rxShort = (v) =>
  v === "Prescription Drug (RX)"
    ? "RX"
    : v === "Over-the-Counter (OTC)"
      ? "OTC"
      : v === "Household Remedy (HR)"
        ? "HR"
        : (v ?? "-");

function drawClassification(doc, state, d) {
  const cls = d.classificationData ?? [];
  sectionTitle(
    doc,
    state,
    "By Classification",
    "Applications per prescription type",
  );
  if (!cls.length) {
    note(doc, state, "No classification data available.");
  } else {
    const docTypes = d.classDocTypes ?? [];
    const total = cls.reduce((a, r) => a + num(r.count), 0);
    const max = Math.max(...cls.map((r) => num(r.count)), 1);
    const head = ["Classification", "Applications", "Share", "", ...docTypes];
    const body = cls.map((r) => [
      r.type,
      fmt(r.count),
      `${fmt(pct(num(r.count), total), 1)}%`,
      "",
      ...docTypes.map((k) => fmt(r.by_doc_type?.[k] ?? 0)),
    ]);
    const right = {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { cellWidth: 55 },
    };
    docTypes.forEach((_, i) => (right[4 + i] = { halign: "right" }));
    runTable(doc, state, {
      head: [head],
      body,
      columnStyles: right,
      didParseCell: (h) => {
        if (h.section === "head" && [1, 2].includes(h.column.index))
          h.cell.styles.halign = "right";
        if (h.section === "head" && h.column.index >= 4)
          h.cell.styles.halign = "right";
      },
      didDrawCell: barHook(doc, 3, (i) => num(cls[i]?.count), max, C.brand),
    });
  }

  // Top drugs
  const drugs = (d.topDrugsData ?? []).slice(0, 20);
  sectionTitle(
    doc,
    state,
    "Top Drug Applications",
    `Ranked by application volume${(d.topDrugsData ?? []).length > 20 ? " (top 20 shown)" : ""}`,
  );
  if (!drugs.length) return note(doc, state, "No drug data available.");
  const dmax = Math.max(...drugs.map((x) => num(x.total)), 1);
  runTable(doc, state, {
    head: [["#", "Drug / Generic", "Class", "Total", "", "CPR", "Rate"]],
    body: drugs.map((x, i) => [
      i + 1,
      t(
        x.generic && x.generic !== x.name ? `${x.name} (${x.generic})` : x.name,
      ),
      rxShort(x.rx),
      fmt(x.total),
      "",
      fmt(x.cpr),
      x.rate == null ? "-" : `${fmt(x.rate, 1)}%`,
    ]),
    columnStyles: {
      0: { cellWidth: 9, halign: "right" },
      3: { halign: "right", cellWidth: 20 },
      4: { cellWidth: 55 },
      5: { halign: "right", cellWidth: 18 },
      6: { halign: "right", cellWidth: 18 },
    },
    didParseCell: (h) => {
      if (h.section === "head" && [0, 3, 5, 6].includes(h.column.index))
        h.cell.styles.halign = "right";
    },
    didDrawCell: barHook(doc, 4, (i) => num(drugs[i]?.total), dmax, C.amber),
  });
}

function drawCountries(doc, state, d) {
  const rows = (d.topCountriesData ?? []).slice(0, 20);
  sectionTitle(
    doc,
    state,
    "Top Countries by Entity Type",
    d.topCountryLabel
      ? `Country of origin: ${d.topCountryLabel}`
      : "Country of origin per application role",
  );
  if (!rows.length) return note(doc, state, "No country data available.");
  const total = (d.topCountriesData ?? []).reduce(
    (a, r) => a + num(r.count),
    0,
  );
  const max = Math.max(...rows.map((r) => num(r.count)), 1);
  runTable(doc, state, {
    head: [["#", "Country", "Applications", "Share", ""]],
    body: rows.map((r, i) => [
      i + 1,
      t(r.country) || "-",
      fmt(r.count),
      `${fmt(pct(num(r.count), total), 1)}%`,
      "",
    ]),
    columnStyles: {
      0: { cellWidth: 9, halign: "right" },
      2: { halign: "right", cellWidth: 28 },
      3: { halign: "right", cellWidth: 20 },
      4: { cellWidth: 80 },
    },
    didParseCell: (h) => {
      if (h.section === "head" && [0, 2, 3].includes(h.column.index))
        h.cell.styles.halign = "right";
    },
    didDrawCell: barHook(doc, 4, (i) => num(rows[i]?.count), max, C.teal),
  });
}

// ── In Progress ──────────────────────────────────────────────
const topOf = (items, key) => {
  const m = new Map();
  items.forEach((x) => {
    const k = x[key] ?? x.label ?? "Unknown";
    m.set(k, (m.get(k) ?? 0) + num(x.count));
  });
  let best = null;
  m.forEach((v, k) => {
    if (!best || v > best[1]) best = [k, v];
  });
  return best ? `${best[0]} (${fmt(best[1])})` : "-";
};

function teamRows(users, nameKey, emptyName) {
  const map = new Map();
  users.forEach((u) => {
    const name = u[nameKey] ?? emptyName;
    if (!map.has(name))
      map.set(name, { name, members: 0, active: 0, total: 0, items: [] });
    const g = map.get(name);
    g.members += 1;
    if (u.in_progress > 0) g.active += 1;
    g.total += u.in_progress;
    g.items.push(...(u.by_type ?? []));
  });
  return [...map.values()]
    .filter((g) => g.total > 0)
    .sort((a, b) => b.total - a.total);
}

async function drawInProgress(doc, state) {
  const res = await getInProgressSummary();
  const users = res?.data ?? [];
  const active = users
    .filter((u) => u.in_progress > 0)
    .sort((a, b) => b.in_progress - a.in_progress);
  const total = users.reduce((s, u) => s + u.in_progress, 0);

  sectionTitle(
    doc,
    state,
    "In Progress Monitoring",
    `${fmt(total)} tasks in progress | ${active.length} users with tasks | avg per user ${fmt(active.length ? total / active.length : 0, 1)}`,
  );

  const teamTable = (title, nameHead, rows) => {
    if (!rows.length) return;
    ensure(doc, state, 30);
    text(doc, title, M, state.y + 3, { size: 10, bold: true, color: C.brand });
    state.y += 5;
    const max = Math.max(...rows.map((g) => g.total), 1);
    runTable(doc, state, {
      head: [
        [
          nameHead,
          "Members",
          "With tasks",
          "In progress",
          "",
          "Avg per member",
          "Top application type",
        ],
      ],
      body: rows.map((g) => [
        g.name,
        g.members,
        g.active,
        fmt(g.total),
        "",
        fmt(g.members ? g.total / g.members : 0, 1),
        topOf(g.items, "app_type"),
      ]),
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { cellWidth: 40 },
        5: { halign: "right" },
      },
      didParseCell: (h) => {
        if (h.section === "head" && [1, 2, 3, 5].includes(h.column.index))
          h.cell.styles.halign = "right";
      },
      didDrawCell: barHook(doc, 4, (i) => rows[i]?.total, max, C.amber),
    });
  };
  teamTable("Per Unit", "Unit", teamRows(users, "unit_name", "No unit"));
  teamTable("Per Group", "Group", teamRows(users, "group_name", "No group"));

  if (active.length) {
    ensure(doc, state, 30);
    text(doc, "Per User", M, state.y + 3, {
      size: 10,
      bold: true,
      color: C.brand,
    });
    state.y += 5;
    const max = Math.max(...active.map((u) => u.in_progress), 1);
    runTable(doc, state, {
      head: [
        [
          "#",
          "User",
          "Unit",
          "Group",
          "In progress",
          "",
          "Top application type",
        ],
      ],
      body: active.map((u, i) => [
        i + 1,
        t(u.full_name),
        u.unit_name ?? "-",
        u.group_name ?? "-",
        fmt(u.in_progress),
        "",
        topOf(u.by_type ?? [], "app_type"),
      ]),
      columnStyles: {
        0: { cellWidth: 9, halign: "right" },
        4: { halign: "right", cellWidth: 22 },
        5: { cellWidth: 36 },
      },
      didParseCell: (h) => {
        if (h.section === "head" && [0, 4].includes(h.column.index))
          h.cell.styles.halign = "right";
      },
      didDrawCell: barHook(doc, 5, (i) => active[i]?.in_progress, max, C.amber),
    });
  }
}

// ═════════════════════════ MAIN ═════════════════════════
export async function generateAnalyticsPdf({
  sections,
  data = {},
  userName = "",
  onProgress = () => {},
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const state = newState();
  const skipped = [];

  drawHeader(doc, state, { userName, lastUpdated: data.lastUpdated });

  const picked = PDF_SECTIONS.filter((s) => sections.includes(s.key));
  const draw = {
    overview: drawOverview,
    year: drawYear,
    quality: drawQuality,
    classification: drawClassification,
    countries: drawCountries,
    inprogress: drawInProgress,
  };

  for (let i = 0; i < picked.length; i++) {
    const s = picked[i];
    onProgress({ step: i, total: picked.length, label: s.label });
    // Let the UI repaint between sections
    await new Promise((r) => setTimeout(r, 0));
    try {
      // Start each major section on a fresh page unless it fits the rest of this one
      if (
        i > 0 &&
        s.key !== "overview" &&
        state.y > M + 2 &&
        BOTTOM - state.y < 70
      ) {
        doc.addPage();
        state.y = M;
      }
      await draw[s.key](doc, state, data);
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
    text(doc, "CDRR Engine | Analytics Report", M, H - 5.5, {
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
    `CDRR-Analytics-Report-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
  return { pages, skipped };
}
