// src/components/monitoring/evaluatorMonitoring/exportEvaluatorMonitoringPdf.js
// Builds an A4 landscape PDF of everything on the User Insights page
// (Received/Released, Companies, Drugs, Skipped, how it is computed), in the
// browser. Drawn from the loaded data (no screenshots) and always light, so it
// prints well. Same approach as the other monitoring reports.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getUser } from "../../../api/auth";
import { startLabel, endLabel, sourceText, sourceHint, isFallback } from "./tatSources";

// ── Layout & palette ─────────────────────────────────────────
const W = 297; // A4 landscape, mm
const H = 210;
const M = 12;
const CW = W - M * 2;
const BOTTOM = H - 14;

const C = {
  ink: [24, 24, 27],
  ink2: [82, 82, 91],
  muted: [113, 113, 122],
  line: [228, 228, 231],
  soft: [248, 248, 249],
  white: [255, 255, 255],
  head: [39, 39, 42],
  green: [16, 185, 129],
  greenText: [4, 120, 87],
  blue: [14, 165, 233],
  blueText: [3, 105, 161],
  amber: [217, 119, 6],
  track: [233, 233, 236],
  rest: [203, 205, 211],
};

// ── Helpers ──────────────────────────────────────────────────
// jsPDF built-in fonts only cover Latin-1; drop anything else (emoji etc.)
const t = (s) =>
  String(s ?? "")
    .replace(/[^\x00-\xFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const num = (v) => Number(v) || 0;
const fmt = (n, d = 0) =>
  num(n).toLocaleString(undefined, {
    maximumFractionDigits: d,
    minimumFractionDigits: 0,
  });
const pctOf = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);
const dash = (v) => (v === null || v === undefined || v === "" ? "-" : t(v));
const safeName = (s) =>
  String(s ?? "export")
    .replace(/[\\/:*?"<>|\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);

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

// `need` = height of the content that follows, so a title never sits alone at
// the bottom of a page
function sectionTitle(doc, state, title, sub, color, need = 0) {
  ensure(doc, state, Math.max(18, need));
  doc.setFillColor(...color);
  doc.roundedRect(M, state.y, 1.4, sub ? 8 : 5.5, 0.7, 0.7, "F");
  text(doc, title, M + 4, state.y + 4.5, { size: 11.5, bold: true });
  if (sub) text(doc, sub, M + 4, state.y + 8.5, { size: 7.5, color: C.muted });
  state.y += sub ? 12.5 : 9.5;
}

// ── Title block (first page only) ────────────────────────────
function drawHeader(doc, state, { data, periodLabel, userName }) {
  doc.setFillColor(...C.ink);
  doc.rect(0, 0, W, 24, "F");
  doc.setFillColor(...C.green);
  doc.rect(0, 24, W, 0.9, "F");

  text(doc, `User Insights Report  |  ${data.role_label || "Evaluator"}`, M, 8, {
    size: 8,
    bold: true,
    color: [161, 161, 170],
  });
  text(doc, data.evaluator.full_name, M, 16, {
    size: 16,
    bold: true,
    color: C.white,
  });
  const who = [data.evaluator.code, data.evaluator.position]
    .filter(Boolean)
    .join("  |  ");
  text(doc, `${who}${who ? "   -   " : ""}Closed applications released in ${periodLabel}`, M, 21, {
    size: 7.5,
    color: [212, 212, 216],
  });

  const meta = [`Generated ${new Date().toLocaleString()}`];
  if (userName) meta.push(`by ${userName}`);
  meta.forEach((line, i) =>
    text(doc, line, W - M, 8 + i * 4.5, {
      size: 7.5,
      color: [161, 161, 170],
      align: "right",
    }),
  );
  state.y = 31;
}

// ── Tables ───────────────────────────────────────────────────
const tableBase = (extra = {}) => ({
  theme: "plain",
  styles: {
    font: "helvetica",
    fontSize: 7.5,
    cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
    textColor: C.ink,
    lineColor: C.line,
    lineWidth: { bottom: 0.15 },
    overflow: "linebreak",
  },
  headStyles: {
    fillColor: C.head,
    textColor: C.white,
    fontStyle: "bold",
    fontSize: 6.8,
    lineWidth: 0,
  },
  margin: { left: M, right: M, top: M, bottom: H - BOTTOM + 2 },
  ...extra,
});

const runTable = (doc, state, opts) => {
  autoTable(doc, tableBase({ startY: state.y, ...opts }));
  state.y = doc.lastAutoTable.finalY + 6;
};

// mix a colour with white: alpha 1 = full colour, lower = paler
const shade = (rgb, alpha) => rgb.map((c) => Math.round(c * alpha + 255 * (1 - alpha)));
const SHADES = [1, 0.78, 0.58, 0.42, 0.3];

// the parts a number is made of, like the bars on the page
function splitParts({ rows, verb, rest, restText, total }) {
  const parts = rows.map((r, i) => ({
    count: r.count,
    alpha: SHADES[Math.min(i, SHADES.length - 1)],
    text: `${fmt(r.count)} ${verb} ${r.year} (${pctOf(r.count, total)}%)`,
  }));
  if (rest > 0)
    parts.push({
      count: rest,
      hatched: true,
      text: `${fmt(rest)} ${restText} (${pctOf(rest, total)}%)`,
    });
  return parts;
}

// a 100% stacked bar at the top of a table cell
function drawSplitBar(doc, cell, parts, color) {
  const x = cell.x + 2;
  const y = cell.y + 1.6;
  const w = cell.width - 4;
  const h = 2.4;
  doc.setFillColor(...C.track);
  doc.roundedRect(x, y, w, h, 1.2, 1.2, "F");
  const total = parts.reduce((n, p) => n + p.count, 0);
  if (total <= 0) return;
  const gap = 0.3;
  let cx = x;
  parts.forEach((p, i) => {
    const pw = (w - gap * (parts.length - 1)) * (p.count / total);
    doc.setFillColor(...(p.hatched ? C.rest : shade(color, p.alpha)));
    if (parts.length === 1) doc.roundedRect(cx, y, pw, h, 1.2, 1.2, "F");
    else doc.rect(cx, y, pw, h, "F");
    cx += pw + gap;
  });
}

// ═════════════════════════ SECTIONS ═════════════════════════

function drawPeriods(doc, state, { data }) {
  const monthly = data.period_mode === "month";
  const periods = data.periods;
  sectionTitle(
    doc,
    state,
    `Received and Released ${monthly ? `by Month, ${data.filters?.year}` : "by Year"}`,
    "Open and closed applications. Each bar splits its number: Received by the year it was released, Released by the year it was received.",
    C.green,
    40,
  );
  if (periods.length === 0) {
    text(doc, "No closed applications on record.", M, state.y + 3, {
      size: 8.5,
      color: C.muted,
    });
    state.y += 10;
    return;
  }

  const receivedParts = (p) =>
    splitParts({
      rows: p.received_split?.released || [],
      verb: "released in",
      rest: p.received_split?.not_released || 0,
      restText: "not released yet",
      total: p.received,
    });
  const releasedParts = (p) =>
    splitParts({
      rows: p.released_split?.received || [],
      verb: "received in",
      rest: p.released_split?.no_received_date || 0,
      restText: "with no received date",
      total: p.released,
    });
  const legend = (parts) => (parts.length ? parts.map((x) => x.text).join("   |   ") : "-");

  const totalReceived = periods.reduce((n, p) => n + p.received, 0);
  const totalReleased = periods.reduce((n, p) => n + p.released, 0);
  const totalSplitReleased = periods.reduce(
    (n, p) => n + (p.received_split?.released || []).reduce((m, r) => m + r.count, 0),
    0,
  );
  const totalNotReleased = periods.reduce(
    (n, p) => n + (p.received_split?.not_released || 0),
    0,
  );

  const body = periods.map((p) => [
    t(p.label),
    fmt(p.received),
    `\n${legend(receivedParts(p))}`, // first line is left empty for the bar
    fmt(p.released),
    `\n${legend(releasedParts(p))}`,
  ]);
  body.push([
    "Total",
    fmt(totalReceived),
    `${fmt(totalSplitReleased)} released   |   ${fmt(totalNotReleased)} not released yet`,
    fmt(totalReleased),
    "",
  ]);

  runTable(doc, state, {
    head: [
      [
        monthly ? "MONTH" : "YEAR",
        "RECEIVED",
        "WHEN THE RECEIVED ONES WERE RELEASED",
        "RELEASED",
        "WHEN THE RELEASED ONES WERE RECEIVED",
      ],
    ],
    body,
    columnStyles: {
      0: { cellWidth: 22, fontStyle: "bold" },
      1: { cellWidth: 20, fontStyle: "bold", halign: "left" },
      2: { cellWidth: 105, textColor: C.ink2, fontSize: 6.8 },
      3: { cellWidth: 20, fontStyle: "bold", halign: "left" },
      4: { cellWidth: CW - 22 - 20 - 105 - 20, textColor: C.ink2, fontSize: 6.8 },
    },
    didParseCell: (d) => {
      if (d.section === "body" && d.row.index === periods.length) {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.fillColor = C.soft;
      }
    },
    didDrawCell: (d) => {
      if (d.section !== "body" || d.row.index >= periods.length) return;
      const p = periods[d.row.index];
      if (d.column.index === 2) drawSplitBar(doc, d.cell, receivedParts(p), C.blue);
      if (d.column.index === 4) drawSplitBar(doc, d.cell, releasedParts(p), C.green);
    },
  });
}

function drawRanked(doc, state, { title, label, rows, color, filterText }) {
  sectionTitle(
    doc,
    state,
    title,
    `${fmt(rows.length)} ranked by average TAT, shortest first. TAT is in working days.${filterText ? ` Only apps with TAT from ${filterText}.` : ""}`,
    color,
    36,
  );
  if (rows.length === 0) {
    text(doc, "No closed applications with a usable TAT in this period.", M, state.y + 3, {
      size: 8.5,
      color: C.muted,
    });
    state.y += 10;
    return;
  }
  runTable(doc, state, {
    head: [
      [
        "RANK",
        label.toUpperCase(),
        "TOTAL APPS",
        "AVG TAT\n(working days)",
        "FASTEST\n(working days)",
        "SLOWEST\n(working days)",
        "SPELLINGS COUNTED TOGETHER",
      ],
    ],
    body: rows.map((r) => [
      r.rank,
      t(r.name),
      fmt(r.total_apps),
      fmt(r.avg_tat, 1),
      fmt(r.fastest_tat),
      fmt(r.slowest_tat),
      r.spellings.length > 1
        ? r.spellings.map((s) => `${t(s.name)} (${s.count})`).join("; ")
        : "",
    ]),
    alternateRowStyles: { fillColor: C.soft },
    columnStyles: {
      0: { cellWidth: 14, halign: "left", textColor: C.muted },
      1: { cellWidth: 88 },
      2: { cellWidth: 22, halign: "right" },
      3: { cellWidth: 26, halign: "right", fontStyle: "bold", textColor: C.greenText },
      4: { cellWidth: 26, halign: "right" },
      5: { cellWidth: 26, halign: "right" },
      6: {
        cellWidth: CW - 14 - 88 - 22 - 26 - 26 - 26,
        textColor: C.muted,
        fontSize: 6.5,
        cellPadding: { top: 1.5, bottom: 1.5, left: 8, right: 2 },
      },
    },
    didParseCell: (d) => {
      if (d.section === "head" && [2, 3, 4, 5].includes(d.column.index))
        d.cell.styles.halign = "right";
      if (d.section === "body" && d.column.index === 0 && num(d.cell.raw) <= 3) {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.textColor = C.greenText;
      }
    },
  });
}

function drawSkipped(doc, state, { data }) {
  const sk = data.skipped;
  sectionTitle(
    doc,
    state,
    "Skipped Applications",
    `${fmt(sk.total)} closed application${sk.total === 1 ? "" : "s"} were left out of the ranking because their dates could not be used.`,
    C.amber,
    30,
  );
  if (sk.total === 0) {
    text(doc, "No applications were skipped.", M, state.y + 3, {
      size: 8.5,
      color: C.muted,
    });
    state.y += 10;
    return;
  }
  // the reasons with their counts
  runTable(doc, state, {
    head: [["REASON", "APPS"]],
    body: sk.by_reason.map((r) => [t(r.reason), fmt(r.count)]),
    tableWidth: 120,
    columnStyles: { 0: { cellWidth: 95 }, 1: { cellWidth: 25, halign: "right", fontStyle: "bold" } },
    didParseCell: (d) => {
      if (d.section === "head" && d.column.index === 1) d.cell.styles.halign = "right";
    },
  });
  if (sk.rows.length > 0) {
    runTable(doc, state, {
      head: [["DTN", "COMPANY", "GENERIC NAME", "TAT START", "TAT END", "DATE RELEASED", "REASON"]],
      body: sk.rows.map((r) => [
        dash(r.dtn),
        dash(r.company),
        dash(r.generic_name),
        r.tat_start ? `${t(r.tat_start)} (${startLabel(r.tat_start_src)})` : "-",
        r.tat_end ? `${t(r.tat_end)} (${endLabel(r.tat_end_src)})` : "-",
        dash(r.date_released),
        t(r.reason),
      ]),
      alternateRowStyles: { fillColor: C.soft },
      columnStyles: {
        0: { cellWidth: 27 },
        1: { cellWidth: 50 },
        2: { cellWidth: 52 },
        3: { cellWidth: 34 },
        4: { cellWidth: 34 },
        5: { cellWidth: 22 },
        6: { cellWidth: CW - 27 - 50 - 52 - 34 - 34 - 22 },
      },
    });
    if (sk.total > sk.shown)
      text(doc, `Showing the latest ${fmt(sk.shown)} of ${fmt(sk.total)} skipped applications.`, M, state.y - 2, {
        size: 7.5,
        color: C.muted,
      });
    state.y += 4;
  }
}

function drawFormula(doc, state, { data }) {
  const lines = Object.values(data.formula || {}).map((l) => t(l));
  if (lines.length === 0) return;
  const wrapped = lines.map((l) => doc.splitTextToSize(l, CW - 6));
  const need = 14 + wrapped.reduce((n, l) => n + l.length, 0) * 3.4 + wrapped.length;
  sectionTitle(doc, state, "How it is computed", null, C.ink2, need);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.ink2);
  wrapped.forEach((ls) => {
    ensure(doc, state, ls.length * 3.4 + 2);
    doc.text("-", M, state.y + 3);
    doc.text(ls, M + 4, state.y + 3);
    state.y += ls.length * 3.4 + 1.6;
  });
}

function drawSources(doc, state, { data }) {
  const srcs = data.summary.sources || [];
  const total = srcs.reduce((n, x) => n + x.count, 0);
  if (total === 0) return;
  const fb = srcs
    .filter((x) => isFallback(x.start, x.end))
    .reduce((n, x) => n + x.count, 0);
  sectionTitle(
    doc,
    state,
    "Where the TAT dates came from",
    `${fmt(total)} apps counted; ${fmt(fb)} used Date Decked and / or Date Released because the application log has no date.`,
    C.blue,
    40,
  );
  runTable(doc, state, {
    head: [["TAT FROM (START TO END)", "APPS", "SHARE", "WHAT IT MEANS"]],
    body: srcs.map((x) => [
      sourceText(x, " to "),
      fmt(x.count),
      `${pctOf(x.count, total)}%`,
      t(sourceHint(x)),
    ]),
    alternateRowStyles: { fillColor: C.soft },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: "bold" },
      1: { cellWidth: 22, halign: "right" },
      2: { cellWidth: 20, halign: "right", textColor: C.muted },
      3: { cellWidth: CW - 70 - 22 - 20, textColor: C.ink2 },
    },
    didParseCell: (d) => {
      if (d.section === "head" && [1, 2].includes(d.column.index))
        d.cell.styles.halign = "right";
      if (d.section === "body" && d.column.index === 0) {
        const x = srcs[d.row.index];
        d.cell.styles.textColor = isFallback(x.start, x.end) ? C.amber : C.greenText;
      }
    },
  });
}

// ═════════════════════════ ENTRY ═════════════════════════

// sections = the keys chosen in the Export PDF dialog (periods, sources,
// companies, drugs, skipped, formula); everything when it is not given
export function exportMonitoringPdf({ data, periodLabel, sections }) {
  const has = (key) => !sections || sections.includes(key);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const state = { y: 0 };
  const u = getUser();
  const userName = [u?.first_name, u?.surname].filter(Boolean).join(" ");

  drawHeader(doc, state, { data, periodLabel, userName });
  if (has("periods")) drawPeriods(doc, state, { data });
  if (has("sources")) drawSources(doc, state, { data });
  const [fs, fe] = String(data.filters?.source || "").split(":");
  const filterText = fs && fe ? sourceText({ start: fs, end: fe }, " to ") : "";
  if (has("companies"))
    drawRanked(doc, state, {
      title: "Companies",
      label: "Company",
      rows: data.companies,
      color: C.blue,
      filterText,
    });
  if (has("drugs"))
    drawRanked(doc, state, {
      title: "Drugs (Generic Name)",
      label: "Generic Name",
      rows: data.drugs,
      color: C.blue,
      filterText,
    });
  if (
    (has("companies") || has("drugs")) &&
    (data.summary.without_company > 0 || data.summary.without_generic > 0)
  ) {
    ensure(doc, state, 8);
    text(
      doc,
      `Not in the Company table: ${fmt(data.summary.without_company)} app(s) with no company name. Not in the Drug table: ${fmt(data.summary.without_generic)} app(s) with no generic name.`,
      M,
      state.y + 2,
      { size: 7.5, color: C.muted },
    );
    state.y += 9;
  }
  if (has("skipped")) drawSkipped(doc, state, { data });
  if (has("formula")) drawFormula(doc, state, { data });

  // footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.2);
    doc.line(M, H - 10, W - M, H - 10);
    text(doc, `User Insights  |  ${data.evaluator.full_name}  |  ${periodLabel}`, M, H - 6, {
      size: 7,
      color: C.muted,
    });
    text(doc, `Page ${i} of ${pages}`, W - M, H - 6, {
      size: 7,
      color: C.muted,
      align: "right",
    });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(
    `User Insights - ${safeName(data.evaluator.full_name)} - ${stamp}.pdf`,
  );
}
