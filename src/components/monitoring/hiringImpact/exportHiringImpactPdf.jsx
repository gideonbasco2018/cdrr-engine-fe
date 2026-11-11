// src/components/monitoring/hiringImpact/exportHiringImpactPdf.js
// Capacity Impact PDF report (A4 landscape, light theme for print).
// Self-contained on purpose: the look mirrors the Analytics report, but this
// file shares no code with it.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ── Layout & palette ─────────────────────────────────────────
const W = 297;
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
  orange: [249, 115, 22],
  tint: [255, 243, 232],
  purple: [139, 92, 246],
};

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

// ── Helpers ──────────────────────────────────────────────────
// Built-in jsPDF fonts only cover Latin-1, so drop anything else.
const t = (s) =>
  String(s ?? "")
    .replace(/[^\x00-\xFF]/g, "")
    .trim();
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const signed = (n) => (n > 0 ? "+" : "") + fmt(n);
const sum = (list) => list.reduce((s, n) => s + n, 0);

function monthLabel(ym) {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
}

function niceMax(v) {
  if (v <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const step = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return step * p;
}

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

function sectionTitle(doc, state, title, sub) {
  ensure(doc, state, 18);
  doc.setFillColor(...C.brand);
  doc.roundedRect(M, state.y, 1.4, sub ? 9 : 6, 0.7, 0.7, "F");
  text(doc, title, M + 4, state.y + 5, { size: 13, bold: true });
  if (sub) text(doc, sub, M + 4, state.y + 9.5, { size: 8, color: C.muted });
  state.y += sub ? 14 : 10;
}

// ── Header banner ────────────────────────────────────────────
function drawHeader(doc, state, { subtitle, period, marked }) {
  doc.setFillColor(...C.brand);
  doc.rect(0, 0, W, 26, "F");
  text(doc, "CDRR Capacity Impact Report", M, 12, {
    size: 20,
    bold: true,
    color: C.white,
  });
  text(doc, subtitle, M, 19, { size: 9, color: [214, 230, 255] });

  [`Generated ${new Date().toLocaleString()}`, period, marked].forEach(
    (line, i) =>
      text(doc, line, W - M, 10 + i * 5, {
        size: 8.5,
        color: [214, 230, 255],
        align: "right",
      }),
  );
  state.y = 33;
}

// ── KPI card ─────────────────────────────────────────────────
function kpiCard(doc, x, y, w, h, { label, value, sub, color, badge }) {
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
  if (badge)
    text(doc, badge, x + w - 5, y + 15.5, {
      size: 11,
      bold: true,
      color,
      align: "right",
    });
  if (sub) text(doc, sub, x + 6, y + h - 3, { size: 7, color: C.muted });
}

// ── Chart card (grouped bars or line) with the capacity marker ──
function drawChart(
  doc,
  { x, y, w, h, title, sub, points, series, type, markIdx, markLabel },
) {
  const n = points.length;
  const padL = 14;
  const padR = 4;
  const padT = 17;
  const padB = 8;
  const px = x + padL;
  const py = y + padT;
  const pw = w - padL - padR;
  const ph = h - padT - padB;
  const max = niceMax(
    Math.max(...points.flatMap((p) => series.map((s) => p[s.key])), 0),
  );
  const step = pw / Math.max(n, 1);
  const cx = (i) => px + step * i + step / 2;
  const yy = (v) => py + ph - (v / max) * ph;
  const hasMark = markIdx >= 0 && markIdx < n;

  // card frame + title
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, "S");
  text(doc, title, x + 5, y + 7, { size: 11, bold: true });
  if (sub) text(doc, sub, x + 5, y + 11.5, { size: 7.5, color: C.muted });

  // legend, right aligned
  let lx = x + w - 5;
  [...series].reverse().forEach((s) => {
    lx -= doc.getTextWidth(t(s.label)) + 1;
    text(doc, s.label, lx, y + 7, { size: 7.5, color: C.muted });
    lx -= 5.5;
    doc.setFillColor(...s.color);
    doc.roundedRect(lx, y + 5.6, 4, 1.6, 0.8, 0.8, "F");
    lx -= 4;
  });

  // shaded "after" region
  if (hasMark) {
    const mx = cx(markIdx) - step / 2;
    doc.setFillColor(...C.tint);
    doc.rect(mx, py, px + pw - mx, ph, "F");
  }

  // grid + y labels
  doc.setLineWidth(0.15);
  for (let i = 0; i <= 4; i++) {
    const v = Math.round((max * i) / 4);
    const gy = yy(v);
    doc.setDrawColor(...(i === 0 ? C.muted : C.line));
    doc.line(px, gy, px + pw, gy);
    text(doc, fmt(v), px - 2, gy + 1, {
      size: 7,
      color: C.muted,
      align: "right",
    });
  }

  // data
  if (type === "bars") {
    const groupW = Math.min(step * 0.8, 3.4);
    const barW = groupW / series.length;
    points.forEach((p, i) =>
      series.forEach((s, k) => {
        const bh = (p[s.key] / max) * ph;
        doc.setFillColor(...s.color);
        doc.rect(cx(i) - groupW / 2 + k * barW, py + ph - bh, barW, bh, "F");
      }),
    );
  } else if (n > 0) {
    const s = series[0];
    doc.setDrawColor(...s.color);
    doc.setLineWidth(0.7);
    for (let i = 1; i < n; i++) {
      doc.line(
        cx(i - 1),
        yy(points[i - 1][s.key]),
        cx(i),
        yy(points[i][s.key]),
      );
    }
    doc.setFillColor(...s.color);
    points.forEach((p, i) =>
      doc.circle(cx(i), yy(p[s.key]), n > 24 ? 0.5 : 0.9, "F"),
    );
  }

  // x labels
  const every = Math.max(1, Math.ceil(n / 12));
  points.forEach((p, i) => {
    if (i % every === 0)
      text(doc, monthLabel(p.month), cx(i), py + ph + 5, {
        size: 7,
        color: C.muted,
        align: "center",
      });
  });

  // marker line + label
  if (hasMark) {
    const mx = cx(markIdx) - step / 2;
    doc.setDrawColor(...C.orange);
    doc.setLineWidth(0.4);
    doc.setLineDashPattern([1.2, 1], 0);
    doc.line(mx, py - 2, mx, py + ph);
    doc.setLineDashPattern([], 0);
    const tw = doc.getTextWidth(t(markLabel));
    text(doc, markLabel, Math.min(mx + 1.5, px + pw - tw - 1), py - 3, {
      size: 7,
      bold: true,
      color: C.orange,
    });
  }
}

// ═════════════════════════ MAIN ═════════════════════════
export function exportHiringImpactPdf({
  series,
  stats,
  insight,
  markIdx,
  labels,
}) {
  if (!series.length) return;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const state = { y: M };
  const hasMark = markIdx >= 0 && markIdx < series.length;
  const last = series[series.length - 1];

  drawHeader(doc, state, {
    subtitle: labels.subtitle,
    period: `Period: ${monthLabel(series[0].month)} - ${monthLabel(last.month)}`,
    marked: hasMark
      ? `${labels.markChart}: ${monthLabel(series[markIdx].month)}`
      : `${labels.markChart}: not selected`,
  });

  // ── Summary ───────────────────────────────────────────────
  sectionTitle(doc, state, "Summary", "Before vs after the selected month");
  if (stats) {
    const gap = 5;
    const cw = (CW - gap * 2) / 3;
    const ch = 26;
    const cards = [
      {
        label: "Received per month",
        value: fmt(stats.receivedAfter),
        sub: `Before: ${fmt(stats.receivedBefore)} per month`,
        color: C.brand,
        badge: `${signed(stats.receivedPct)}%`,
      },
      {
        label: "Released per month",
        value: fmt(stats.releasedAfter),
        sub: `Before: ${fmt(stats.releasedBefore)} per month`,
        color: stats.releasedPct >= 0 ? C.green : C.red,
        badge: `${signed(stats.releasedPct)}%`,
      },
      {
        label: "Backlog now",
        value: fmt(stats.backlogNow),
        sub: `Before: ${fmt(stats.backlogBefore)} in progress`,
        color: stats.backlogPct <= 0 ? C.green : C.red,
        badge: `${signed(stats.backlogPct)}%`,
      },
    ];
    cards.forEach((c, i) =>
      kpiCard(doc, M + i * (cw + gap), state.y, cw, ch, c),
    );
    state.y += ch + 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(t(insight), CW);
    text(doc, lines.join("\n"), M, state.y + 3, { size: 8.5, color: C.muted });
    state.y += lines.length * 4 + 6;
  } else {
    text(doc, labels.pickMonth, M, state.y + 3, { size: 9, color: C.muted });
    state.y += 10;
  }

  // ── Charts ────────────────────────────────────────────────
  const ch = 70;
  ensure(doc, state, ch + 4);
  const cw = (CW - 8) / 2;
  drawChart(doc, {
    x: M,
    y: state.y,
    w: cw,
    h: ch,
    title: "Received vs Released",
    sub: "Documents per month",
    points: series,
    series: [
      { key: "received", color: C.brand, label: "Received" },
      { key: "released", color: C.green, label: "Released" },
    ],
    type: "bars",
    markIdx,
    markLabel: labels.markChart,
  });
  drawChart(doc, {
    x: M + cw + 8,
    y: state.y,
    w: cw,
    h: ch,
    title: "Backlog",
    sub: "Still in progress at end of month",
    points: series,
    series: [{ key: "backlog", color: C.purple, label: "Backlog" }],
    type: "line",
    markIdx,
    markLabel: labels.markChart,
  });
  state.y += ch + 8;

  // ── Monthly table ─────────────────────────────────────────
  sectionTitle(
    doc,
    state,
    "Monthly Breakdown",
    "Newest first. Shaded rows are the months since capacity was added.",
  );

  const rows = series
    .map((p, i) => ({
      ...p,
      idx: i,
      net: p.received - p.released,
      delta: i > 0 ? p.backlog - series[i - 1].backlog : null,
    }))
    .reverse();

  const totRec = sum(series.map((p) => p.received));
  const totRel = sum(series.map((p) => p.released));

  const body = rows.map((r) => [
    monthLabel(r.month) + (r.idx === markIdx ? `  (${labels.markChart})` : ""),
    fmt(r.received),
    fmt(r.released),
    signed(r.net),
    fmt(r.backlog),
    r.delta == null ? "-" : signed(r.delta),
  ]);
  body.push([
    "Total",
    fmt(totRec),
    fmt(totRel),
    signed(totRec - totRel),
    fmt(last.backlog),
    "",
  ]);

  autoTable(doc, {
    startY: state.y,
    theme: "plain",
    head: [
      ["Month", "Received", "Released", "Net", "Backlog", "Backlog change"],
    ],
    body,
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
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
    didParseCell: (d) => {
      if (d.section === "head" && d.column.index > 0)
        d.cell.styles.halign = "right";
      if (d.section !== "body") return;

      // Total row (last body row)
      if (d.row.index === rows.length) {
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.fillColor = C.track;
        return;
      }

      const r = rows[d.row.index];
      if (hasMark && r.idx >= markIdx) d.cell.styles.fillColor = C.tint;
      if (d.column.index === 0) d.cell.styles.fontStyle = "bold";
      if (d.column.index === 3 || d.column.index === 5) {
        const v = d.column.index === 3 ? r.net : r.delta;
        if (v) {
          // red = backlog grows, green = backlog shrinks
          d.cell.styles.textColor = v > 0 ? C.red : C.green;
          d.cell.styles.fontStyle = "bold";
        }
      }
    },
  });
  state.y = doc.lastAutoTable.finalY + 6;

  // ── Formula notes ─────────────────────────────────────────
  const notes = [
    "Net = Received - Released (same month). Positive means more came in than went out.",
    "Backlog = applications received on or before the end of that month and not yet released by then. It is a month-end snapshot rebuilt from dates, so the Total row shows the last month, not a sum.",
    "Backlog change = Backlog this month - Backlog last month. The first month in the range has no previous month.",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const noteLines = notes.flatMap((n) => doc.splitTextToSize(t(n), CW));
  ensure(doc, state, noteLines.length * 3.6 + 2);
  text(doc, noteLines.join("\n"), M, state.y + 3, {
    size: 7.5,
    color: C.muted,
  });

  // ── Footer on every page ──────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.2);
    doc.line(M, H - 10, W - M, H - 10);
    text(doc, "CDRR Engine | Capacity Impact Report", M, H - 5.5, {
      size: 7.5,
      color: C.muted,
    });
    text(doc, `Page ${p} of ${pages}`, W - M, H - 5.5, {
      size: 7.5,
      color: C.muted,
      align: "right",
    });
  }

  doc.save(`CDRR-Capacity-Impact-${new Date().toISOString().slice(0, 10)}.pdf`);
}
