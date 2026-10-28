// src/components/gmp/dashboard/gmpExportPdf.js
// PDF export for FGMP Monitoring & Analytics. Built from the page's own data
// (not a screenshot), so text stays sharp and selectable and every section can
// be picked on its own, whichever tab is open. jsPDF is loaded on demand.
//
// Add a section: put an entry in EXPORT_SECTIONS (shows in the checklist) and a
// matching function in RENDER below.
import { fmtTime } from "./gmpAnalyticsShared";
import { GMP_STEPS } from "../shared/constants";

export const EXPORT_SECTIONS = [
  { id: "kpi_ref", group: "Monitoring", label: "Key figures by reference record", hint: "Total, released, on process, disapproved, average TAT" },
  { id: "kpi_dtn", group: "Monitoring", label: "Key figures by DTN", hint: "Total DTNs, completed, on process, multi-issuance" },
  { id: "pipeline", group: "Monitoring", label: "Applications by step", hint: "Open now at each step, with the average time before hand-over" },
  { id: "workload", group: "Monitoring", label: "Evaluator workload", hint: "Open tasks and average TAT per evaluator" },
  { id: "aging", group: "Monitoring", label: "Backlog aging", hint: "On Process records by days since received" },
  { id: "nod_kpis", group: "Monitoring", label: "Compliance status (NOD)", hint: "NOD rate, average NODs, compliance turnaround" },
  { id: "country", group: "Analytics", label: "By manufacturer country", hint: "Every country, with PIC/S membership" },
  { id: "trend", group: "Analytics", label: "Trend overview", hint: "Received, released, in progress and disapproved over time" },
  { id: "monthly", group: "Analytics", label: "Month by month", hint: "Received, released, output, disapproved, release rate, TAT" },
  { id: "cat_est", group: "Analytics", label: "By establishment category" },
  { id: "cat_company", group: "Analytics", label: "Top establishments" },
  { id: "cat_issuance", group: "Analytics", label: "By type of issuance" },
  { id: "cat_txn", group: "Analytics", label: "By transaction type" },
  { id: "dtn_issuances", group: "Analytics", label: "Issuances per DTN" },
  { id: "nod_dist", group: "Analytics", label: "NOD count distribution" },
  { id: "completeness", group: "Analytics", label: "Data completeness", hint: "Date Received, Released Date, Type of Issuance — all years" },
  { id: "step_timing", group: "Analytics", label: "Workflow step timing", hint: "Average working time per step — all time" },
];

// ── palette ──────────────────────────────────────────────────────────────────
const BLUE = "#2f6fed", GREEN = "#0f8a72", AMBER = "#b9740f", RED = "#c8384f", VIOLET = "#7c5cff", CYAN = "#06b6d4";
const INK = "#1c1e21", SUB = "#65676b", MUTED = "#8a8d91", LINE = "#dddfe2", SOFT = "#f0f2f5";
const SERIES = [
  { key: "received", label: "Received", color: BLUE },
  { key: "released", label: "Released", color: GREEN },
  { key: "on_process", label: "In progress", color: "#f59e0b" },
  { key: "disapproved", label: "Disapproved", color: RED },
];

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (hex, t) => rgb(hex).map((c) => Math.round(c + (255 - c) * t)); // t=0 → color, 1 → white
// The built-in PDF fonts only cover Latin-1; swap the few symbols the page uses.
const clean = (t) => String(t ?? "")
  .replace(/[—–]/g, "-").replace(/→/g, ">").replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"').replace(/…/g, "...").replace(/÷/g, "/").replace(/[^\x00-\xFF]/g, "?");
const num = (n) => (n == null ? "-" : Number(n).toLocaleString("en-US"));
const pct = (n, total) => (total > 0 ? (n / total) * 100 : 0);
const pctText = (n, total) => { const p = pct(n, total); return p > 0 && p < 1 ? "<1%" : `${Math.round(p)}%`; };

const PAGE = { w: 210, h: 297, m: 14 };
const CW = PAGE.w - PAGE.m * 2;

// ── tiny layout kit on top of jsPDF ──────────────────────────────────────────
function makeKit(doc) {
  const st = { y: PAGE.m };
  const text = (t, x, y, { size = 9, bold = false, color = INK, align = "left" } = {}) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...rgb(color));
    doc.text(clean(t), x, y, { align });
  };
  const fit = (t, w, size = 9, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    let s = clean(t);
    if (doc.getTextWidth(s) <= w) return s;
    while (s.length > 1 && doc.getTextWidth(`${s}...`) > w) s = s.slice(0, -1);
    return `${s}...`;
  };
  const fill = (c) => doc.setFillColor(...(Array.isArray(c) ? c : rgb(c)));
  const stroke = (c, w = 0.2) => { doc.setDrawColor(...(Array.isArray(c) ? c : rgb(c))); doc.setLineWidth(w); };
  const ensure = (h) => { if (st.y + h > PAGE.h - 16) { doc.addPage(); st.y = PAGE.m; return true; } return false; };

  const heading = (title, sub) => {
    ensure(44); // keep the heading together with the start of its content
    st.y += 4;
    text(title, PAGE.m, st.y, { size: 12, bold: true });
    st.y += 1.5;
    stroke(LINE, 0.3); doc.line(PAGE.m, st.y + 1, PAGE.w - PAGE.m, st.y + 1);
    st.y += 5;
    if (sub) { text(sub, PAGE.m, st.y, { size: 7.5, color: MUTED }); st.y += 5; }
    st.y += 1;
  };
  const note = (t) => { ensure(8); text(t, PAGE.m, st.y, { size: 7.5, color: MUTED }); st.y += 5; };
  const empty = (t = "No data for this selection.") => { ensure(10); text(t, PAGE.m, st.y + 3, { size: 9, color: MUTED }); st.y += 10; };
  const gap = (h = 4) => { st.y += h; };

  // Row of KPI tiles. items: [{label, value, color, sub}]
  const tiles = (items) => {
    const g = 3, n = items.length, w = (CW - g * (n - 1)) / n, h = 22;
    ensure(h + 2);
    items.forEach((it, i) => {
      const x = PAGE.m + i * (w + g);
      fill(mix(it.color || INK, 0.93)); stroke(mix(it.color || INK, 0.75), 0.25);
      doc.roundedRect(x, st.y, w, h, 2.5, 2.5, "FD");
      text(it.label.toUpperCase(), x + 3, st.y + 5.5, { size: 6, bold: true, color: SUB });
      text(String(it.value), x + 3, st.y + 13.5, { size: 15, bold: true, color: it.color || INK });
      if (it.sub) text(fit(it.sub, w - 6, 6.5), x + 3, st.y + 18.5, { size: 6.5, color: MUTED });
    });
    st.y += h + 5;
  };

  // Table. cols: [{label, w (share of width), align, color?(row), draw?(x,y,w,h,row)}]; rows: arrays of cells.
  const table = (cols, rows, { rowH = 6.4 } = {}) => {
    const total = cols.reduce((a, c) => a + c.w, 0);
    const widths = cols.map((c) => (c.w / total) * CW);
    const xs = widths.map((_, i) => PAGE.m + widths.slice(0, i).reduce((a, b) => a + b, 0));
    const head = () => {
      fill(SOFT); doc.rect(PAGE.m, st.y, CW, 6.5, "F");
      cols.forEach((c, i) => {
        const x = c.align === "right" ? xs[i] + widths[i] - 2 : xs[i] + 2;
        text(c.label.toUpperCase(), x, st.y + 4.4, { size: 6, bold: true, color: SUB, align: c.align === "right" ? "right" : "left" });
      });
      st.y += 6.5;
    };
    ensure(6.5 + rowH * Math.min(rows.length, 3));
    head();
    rows.forEach((row, ri) => {
      if (ensure(rowH)) head();
      if (ri % 2 === 1) { fill([250, 250, 251]); doc.rect(PAGE.m, st.y, CW, rowH, "F"); }
      cols.forEach((c, i) => {
        const cell = row[i];
        if (c.draw) { c.draw(xs[i] + 2, st.y, widths[i] - 4, rowH, row); return; }
        const o = typeof cell === "object" && cell !== null ? cell : { t: cell };
        const right = c.align === "right";
        const x = right ? xs[i] + widths[i] - 2 : xs[i] + 2;
        text(fit(o.t ?? "", widths[i] - 4, 8.2, !!o.bold), x, st.y + rowH - 2.1, { size: 8.2, bold: !!o.bold, color: o.color || INK, align: right ? "right" : "left" });
      });
      stroke(SOFT, 0.15); doc.line(PAGE.m, st.y + rowH, PAGE.w - PAGE.m, st.y + rowH);
      st.y += rowH;
    });
    st.y += 4;
  };

  // Inline bar used by table columns: fraction 0..1
  const barCell = (color) => (x, y, w, h, row) => {
    const frac = Math.max(0, Math.min(1, row._frac ?? 0));
    fill(SOFT); doc.roundedRect(x, y + h / 2 - 1.1, w, 2.2, 1.1, 1.1, "F");
    if (frac > 0) { fill(row._color || color); doc.roundedRect(x, y + h / 2 - 1.1, Math.max(1.6, w * frac), 2.2, 1.1, 1.1, "F"); }
  };

  // Simple ranked bar list for [{name, count}] items.
  const bars = (items, { color = BLUE, colorFor, limit = 12 } = {}) => {
    if (!items?.length) return empty();
    const shown = items.slice(0, limit);
    const total = items.reduce((a, d) => a + d.count, 0);
    const max = Math.max(...shown.map((d) => d.count), 1);
    // The bar column reads _frac / _color off the row array.
    const prepared = shown.map((d, i) => {
      const r = [{ t: d.name }, { t: num(d.count), bold: true }, { t: pctText(d.count, total), color: SUB }, ""];
      r._frac = d.count / max; r._color = colorFor ? colorFor(d, i) : color;
      return r;
    });
    table([
      { label: "Name", w: 8 }, { label: "Records", w: 2, align: "right" }, { label: "Share", w: 1.5, align: "right" },
      { label: "", w: 5, draw: barCell(color) },
    ], prepared);
    if (items.length > limit) note(`Showing the top ${limit} of ${items.length}.`);
  };

  // Multi-series line chart. points: [{label, ...series keys}]
  const lineChart = (points, series, { h = 58 } = {}) => {
    if (!points?.length) return empty();
    ensure(h + 16);
    const x0 = PAGE.m + 10, x1 = PAGE.w - PAGE.m - 2, y0 = st.y + 4, y1 = st.y + h;
    const maxRaw = Math.max(...points.flatMap((p) => series.map((s) => p[s.key] ?? 0)), 1);
    const pow = 10 ** Math.floor(Math.log10(maxRaw));
    const top = Math.ceil(maxRaw / pow) * pow;
    const X = (i) => (points.length > 1 ? x0 + (i / (points.length - 1)) * (x1 - x0) : (x0 + x1) / 2);
    const Y = (v) => y1 - (v / top) * (y1 - y0);
    for (let t = 0; t <= 4; t++) {
      const v = (top / 4) * t;
      stroke(t === 0 ? LINE : SOFT, t === 0 ? 0.35 : 0.2); doc.line(x0, Y(v), x1, Y(v));
      text(num(Math.round(v)), x0 - 2, Y(v) + 1, { size: 6.5, color: MUTED, align: "right" });
    }
    // Inside one month the day number is enough; over a longer range keep "Sep 3" ("Sep 3 '26" across years).
    const oneMonth = points.length <= 31;
    const axis = (p) => (oneMonth ? String(p.label).split(" ")[1] : String(p.label).replace(/, 20(\d\d)$/, " '$1"));
    const every = Math.max(1, Math.ceil(points.length / (oneMonth ? 15 : 9)));
    points.forEach((p, i) => {
      if (i % every === 0 || i === points.length - 1) text(axis(p), X(i), y1 + 4.5, { size: 6.5, color: MUTED, align: "center" });
    });
    series.forEach((s) => {
      stroke(s.color, 0.6);
      points.forEach((p, i) => {
        if (i > 0) doc.line(X(i - 1), Y(points[i - 1][s.key] ?? 0), X(i), Y(p[s.key] ?? 0));
      });
      if (points.length <= 31) { fill(s.color); points.forEach((p, i) => doc.circle(X(i), Y(p[s.key] ?? 0), 0.7, "F")); }
      if (points.length === 1) { fill(s.color); doc.circle(X(0), Y(points[0][s.key] ?? 0), 1.2, "F"); }
    });
    st.y = y1 + 13;
    let lx = PAGE.m;
    series.forEach((s) => {
      fill(s.color); doc.roundedRect(lx, st.y - 2, 5, 1.4, 0.7, 0.7, "F");
      text(s.label, lx + 7, st.y - 0.6, { size: 7.5, color: SUB });
      lx += 7 + doc.getTextWidth(clean(s.label)) + 8;
    });
    st.y += 6;
  };

  return { doc, st, text, fit, fill, stroke, ensure, heading, note, empty, gap, tiles, table, bars, barCell, lineChart };
}

// ── sections ─────────────────────────────────────────────────────────────────
const stepColor = (id) => GMP_STEPS.find((s) => s.id === id)?.color ?? GREEN;
const stepLabel = (id) => GMP_STEPS.find((s) => s.id === id)?.label ?? id;

const RENDER = {
  kpi_ref(k, d) {
    k.heading("Key figures by reference record", "Each issuance counted separately");
    const s = d.summary;
    if (!s) return k.empty();
    k.tiles([
      { label: "Total records", value: num(s.total), color: BLUE },
      { label: "Released", value: num(s.released), color: GREEN, sub: `${s.release_rate}% release rate` },
      { label: "On process", value: num(s.on_process), color: AMBER },
      { label: "Disapproved", value: num(s.disapproved), color: RED },
      { label: "Avg TAT", value: s.avg_tat_days != null ? `${s.avg_tat_days}d` : "-", color: VIOLET, sub: "working days" },
    ]);
  },

  kpi_dtn(k, d) {
    k.heading("Key figures by DTN", "A DTN is completed only once every issuance under it is final");
    const s = d.dtnSummary;
    if (!s) return k.empty();
    k.tiles([
      { label: "Total DTNs", value: num(s.total_dtns), color: BLUE },
      { label: "Completed", value: num(s.completed), color: GREEN },
      { label: "On process", value: num(s.on_process), color: AMBER },
      { label: "Disapproved", value: num(s.disapproved), color: RED },
      { label: "Multi-issuance", value: num(s.multi_issuance_dtns), color: VIOLET, sub: "DTNs with >1 record" },
    ]);
  },

  pipeline(k, d) {
    k.heading("Applications by step", "Open applications right now; time is the all-time average before an application moves on (working days)");
    const counts = Object.fromEntries((d.byStep ?? []).map((i) => [i.step, i.count]));
    const timing = Object.fromEntries((d.stepTiming ?? []).map((t) => [t.step, t]));
    const steps = GMP_STEPS.filter((s) => s.id !== "FROO" || (counts.FROO ?? 0) > 0);
    const total = steps.reduce((a, s) => a + (counts[s.id] ?? 0), 0);
    if (total === 0) return k.empty("No open applications right now.");
    const max = Math.max(...steps.map((s) => counts[s.id] ?? 0), 1);
    const rows = steps.map((s) => {
      const c = counts[s.id] ?? 0;
      const t = timing[s.id];
      const r = [{ t: s.label, bold: true }, { t: num(c), bold: true, color: s.color }, { t: pctText(c, total), color: SUB }, "", { t: t ? fmtTime(t.avg_minutes) : "-" }, { t: t ? num(t.total) : "-", color: SUB }];
      r._frac = c / max; r._color = s.color;
      return r;
    });
    k.table([
      { label: "Step", w: 4.2 }, { label: "Open now", w: 1.6, align: "right" }, { label: "Share", w: 1.3, align: "right" },
      { label: "", w: 3.2, draw: k.barCell(GREEN) }, { label: "Avg time at step", w: 3, align: "right" }, { label: "Finished steps", w: 2, align: "right" },
    ], rows);
    k.note(`${num(total)} open applications in total.`);
  },

  workload(k, d) {
    k.heading("Evaluator workload", "Open tasks per evaluator");
    const items = d.workload ?? [];
    if (!items.length) return k.empty();
    const max = Math.max(...items.map((i) => i.open_count), 1);
    const rows = items.map((i) => {
      const r = [{ t: i.evaluator, bold: true }, { t: num(i.open_count), bold: true, color: AMBER }, "", { t: i.avg_tat_days != null ? `${i.avg_tat_days}d` : "-" }];
      r._frac = i.open_count / max; r._color = AMBER;
      return r;
    });
    k.table([
      { label: "Evaluator", w: 5 }, { label: "Open tasks", w: 1.8, align: "right" }, { label: "", w: 5, draw: k.barCell(AMBER) }, { label: "Avg TAT", w: 1.8, align: "right" },
    ], rows);
  },

  aging(k, d) {
    k.heading("Backlog aging", "On Process records by days since received");
    const items = (d.aging ?? []).map((a) => ({ name: a.label, count: a.count }));
    if (!items.length || items.every((i) => i.count === 0)) return k.empty("No records on process.");
    k.bars(items, { colorFor: (_, i) => [GREEN, "#f59e0b", AMBER, RED][i] ?? RED, limit: 8 });
  },

  nod_kpis(k, d) {
    k.heading("Compliance status (NOD)", "Notice of Deficiency load");
    const n = d.nod;
    if (!n) return k.empty();
    k.tiles([
      { label: "NOD rate", value: `${n.nod_rate}%`, color: BLUE, sub: `${num(n.records_with_nod)} of ${num(n.total_records)} records` },
      { label: "Avg NODs / record", value: n.avg_nod_count, color: VIOLET },
      { label: "Avg compliance turnaround", value: n.avg_compliance_turnaround_days != null ? `${n.avg_compliance_turnaround_days}d` : "-", color: BLUE, sub: "last NOD to compliance docs" },
      { label: "Awaiting compliance", value: num(n.pending_compliance), color: RED, sub: "NOD sent, still on process" },
    ]);
  },

  country(k, d) {
    k.heading("By manufacturer country", "Parsed from the manufacturer address; PIC/S = current PIC/S member");
    const all = d.picsCountry?.by_country ?? [];
    if (!all.length) return k.empty();
    const total = all.reduce((a, c) => a + c.count, 0);
    const max = Math.max(...all.map((c) => c.count), 1);
    const countries = all.filter((c) => c.name !== "Other / Not Detected");
    const other = all.find((c) => c.name === "Other / Not Detected");
    const picsTotal = countries.filter((c) => c.pics).reduce((a, c) => a + c.count, 0);
    k.tiles([
      { label: "Countries", value: num(countries.length), color: BLUE },
      { label: "Top country", value: countries[0]?.name ?? "-", color: countries[0]?.pics ? GREEN : AMBER, sub: countries[0] ? `${num(countries[0].count)} records` : "" },
      { label: "From PIC/S members", value: `${Math.round(pct(picsTotal, total))}%`, color: GREEN },
    ]);
    const rows = [...countries, ...(other ? [{ ...other, name: "Not detected" }] : [])].map((c, i) => {
      const isOther = c.name === "Not detected";
      const r = [{ t: isOther ? "-" : String(i + 1), color: SUB }, { t: c.name, color: isOther ? MUTED : INK }, { t: isOther ? "" : c.pics ? "PIC/S" : "Non-PIC/S", color: c.pics ? GREEN : AMBER }, { t: num(c.count), bold: true }, { t: pctText(c.count, total), color: SUB }, ""];
      r._frac = c.count / max; r._color = isOther ? MUTED : c.pics ? GREEN : AMBER;
      return r;
    });
    k.table([
      { label: "#", w: 0.8 }, { label: "Country", w: 4 }, { label: "Group", w: 2 }, { label: "Records", w: 1.6, align: "right" }, { label: "Share", w: 1.4, align: "right" }, { label: "", w: 4, draw: k.barCell(GREEN) },
    ], rows);
  },

  trend(k, d) {
    const t = d.trend;
    k.heading("Trend overview", t ? `${t.title} - one point per day: received, released, in progress and disapproved` : undefined);
    if (!t?.points?.length) return k.empty("No trend data for this selection.");
    k.lineChart(t.points, SERIES);
    if (t.points.length <= 24) {
      k.table(
        [{ label: t.granularity, w: 2.4 }, ...SERIES.map((s) => ({ label: s.label, w: 1.8, align: "right" }))],
        t.points.map((p) => [{ t: p.label, bold: true }, ...SERIES.map((s) => ({ t: num(p[s.key]), color: p[s.key] ? INK : MUTED }))]),
      );
    }
  },

  monthly(k, d) {
    k.heading("Month by month", "Released = of the records received that month, how many have since been released. Output = records released that month.");
    const rows = d.monthly ?? [];
    if (!rows.length) return k.empty();
    const tot = rows.reduce((a, r) => ({ received: a.received + r.received, released: a.released + r.released, output: a.output + r.released_in_month, disapproved: a.disapproved + r.disapproved, on_process: a.on_process + r.on_process }), { received: 0, released: 0, output: 0, disapproved: 0, on_process: 0 });
    k.table(
      [{ label: "Month", w: 2 }, { label: "Received", w: 1.5, align: "right" }, { label: "Released", w: 1.5, align: "right" }, { label: "Output", w: 1.4, align: "right" }, { label: "Disapproved", w: 1.7, align: "right" }, { label: "On process", w: 1.6, align: "right" }, { label: "Release rate", w: 1.7, align: "right" }, { label: "Avg TAT", w: 1.4, align: "right" }],
      [
        ...rows.map((r) => [{ t: r.label, bold: true }, { t: num(r.received), bold: true }, { t: num(r.released), color: r.released ? GREEN : MUTED }, { t: num(r.released_in_month), color: r.released_in_month ? GREEN : MUTED }, { t: num(r.disapproved), color: r.disapproved ? RED : MUTED }, { t: num(r.on_process), color: r.on_process ? AMBER : MUTED }, { t: r.received ? `${r.release_rate}%` : "-" }, { t: r.avg_tat_days != null ? `${r.avg_tat_days}d` : "-" }]),
        [{ t: "Total", bold: true }, { t: num(tot.received), bold: true }, { t: num(tot.released), bold: true }, { t: num(tot.output), bold: true }, { t: num(tot.disapproved), bold: true }, { t: num(tot.on_process), bold: true }, { t: tot.received ? `${((tot.released / tot.received) * 100).toFixed(1)}%` : "-", bold: true }, { t: "-" }],
      ],
    );
    k.note("Avg TAT is working days, received to released.");
  },

  cat_est(k, d) { k.heading("By establishment category"); k.bars(d.category?.by_est_category, { color: BLUE }); },
  cat_company(k, d) { k.heading("Top establishments", "By record count"); k.bars(d.category?.top_companies, { color: GREEN, limit: 15 }); },
  cat_issuance(k, d) { k.heading("By type of issuance"); k.bars(d.category?.by_issuance_type, { color: CYAN }); },
  cat_txn(k, d) { k.heading("By transaction type"); k.bars(d.category?.by_transaction_type, { color: BLUE }); },
  dtn_issuances(k, d) {
    k.heading("Issuances per DTN", "How many issuance records share the same DTN");
    k.bars((d.dtnSummary?.issuance_count_distribution ?? []).map((x) => ({ name: x.label, count: x.count })), { color: VIOLET });
  },
  nod_dist(k, d) {
    k.heading("NOD count distribution", "Number of deficiency notices per record");
    k.bars((d.nod?.distribution ?? []).map((x) => ({ name: x.label, count: x.count })), { color: AMBER });
  },

  completeness(k, d) {
    k.heading("Data completeness", "All years (not filtered). Checks that data is present, not that it is correct.");
    const rows = d.quality ?? [];
    if (!rows.length) return k.empty();
    const color = (p) => (p >= 95 ? GREEN : p >= 80 ? AMBER : RED);
    const sum = (key) => rows.reduce((a, r) => a + r[key], 0);
    const total = sum("total");
    const comp = pct(sum("complete"), total);
    k.tiles([
      { label: "Overall completeness", value: `${comp.toFixed(1)}%`, color: color(comp), sub: `${num(sum("complete"))} of ${num(total)} records` },
      { label: "Date Received", value: `${pct(sum("received_filled"), total).toFixed(1)}%`, color: color(pct(sum("received_filled"), total)), sub: `${num(sum("missing_received"))} missing` },
      { label: "Released Date", value: `${pct(sum("released_filled"), sum("release_expected")).toFixed(1)}%`, color: color(pct(sum("released_filled"), sum("release_expected"))), sub: `${num(sum("missing_released"))} missing` },
      { label: "Type of Issuance", value: `${pct(sum("doc_filled"), sum("doc_expected")).toFixed(1)}%`, color: color(pct(sum("doc_filled"), sum("doc_expected"))), sub: `${num(sum("missing_doc"))} missing` },
    ]);
    k.table(
      [{ label: "Year", w: 1.4 }, { label: "Records", w: 1.4, align: "right" }, { label: "Completeness", w: 1.8, align: "right" }, { label: "No received date", w: 2, align: "right" }, { label: "No released date", w: 2, align: "right" }, { label: "No type of issuance", w: 2.2, align: "right" }, { label: "Incomplete", w: 1.6, align: "right" }],
      rows.map((r) => [{ t: r.year, bold: true }, { t: num(r.total) }, { t: `${r.completeness.toFixed(1)}%`, bold: true, color: color(r.completeness) }, { t: num(r.missing_received), color: r.missing_received ? RED : MUTED }, { t: num(r.missing_released), color: r.missing_released ? RED : MUTED }, { t: num(r.missing_doc), color: r.missing_doc ? RED : MUTED }, { t: num(r.incomplete), color: r.incomplete ? RED : MUTED }]),
    );
  },

  step_timing(k, d) {
    k.heading("Workflow step timing", "Average working time per finished step (weekends not counted), all time");
    const rows = d.stepTiming ?? [];
    if (!rows.length) return k.empty("No completed workflow steps yet.");
    const max = Math.max(...rows.map((r) => r.avg_minutes ?? 0), 1);
    k.table(
      [{ label: "Step", w: 3 }, { label: "Average", w: 3.3, align: "right" }, { label: "", w: 2.6, draw: k.barCell(GREEN) }, { label: "Fastest", w: 2.4, align: "right" }, { label: "Slowest", w: 3.3, align: "right" }, { label: "Finished steps", w: 2, align: "right" }],
      rows.map((r) => {
        const row = [{ t: stepLabel(r.step), bold: true }, { t: fmtTime(r.avg_minutes), bold: true }, "", { t: fmtTime(r.min_minutes) }, { t: fmtTime(r.max_minutes) }, { t: num(r.total), color: SUB }];
        row._frac = (r.avg_minutes ?? 0) / max; row._color = stepColor(r.step);
        return row;
      }),
    );
  },
};

// ── entry point ──────────────────────────────────────────────────────────────
// `selected`: array of section ids. `data`: the page's loaded data plus
// `trend` / `quality` (fetched by the caller only when those are picked).
// `filters`: { year, month, monthLabel }.
export async function buildGMPPdf({ selected, data, filters }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const k = makeKit(doc);
  const filterText = `Year: ${filters.year === "All" ? "All years" : filters.year}  |  Month: ${filters.month === "All" ? "All months" : filters.monthLabel}`;
  const now = new Date();

  // cover block
  k.fill(mix(GREEN, 0.9)); doc.roundedRect(PAGE.m, k.st.y, CW, 22, 3, 3, "F");
  k.text("FGMP Monitoring & Analytics", PAGE.m + 6, k.st.y + 10, { size: 17, bold: true, color: GREEN });
  k.text(filterText, PAGE.m + 6, k.st.y + 17, { size: 8.5, color: SUB });
  k.text(`Generated ${now.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}`, PAGE.w - PAGE.m - 6, k.st.y + 17, { size: 8.5, color: SUB, align: "right" });
  k.st.y += 26;

  EXPORT_SECTIONS.filter((s) => selected.includes(s.id)).forEach((s) => RENDER[s.id](k, data));

  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    k.stroke(LINE, 0.2); doc.line(PAGE.m, PAGE.h - 12, PAGE.w - PAGE.m, PAGE.h - 12);
    k.text("FGMP Monitoring & Analytics", PAGE.m, PAGE.h - 7.5, { size: 7, color: MUTED });
    k.text(`Page ${i} of ${pages}`, PAGE.w - PAGE.m, PAGE.h - 7.5, { size: 7, color: MUTED, align: "right" });
  }

  const slug = `${filters.year === "All" ? "AllYears" : filters.year}${filters.month === "All" ? "" : `_${filters.monthLabel}`}`;
  doc.save(`FGMP_Monitoring_Analytics_${slug}_${now.toISOString().slice(0, 10)}.pdf`);
}
