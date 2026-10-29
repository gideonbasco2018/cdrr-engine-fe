// src/components/monitoring/evaluatorMonitoring/exportEvaluatorMonitoring.js
// Excel exports for the Evaluators Monitoring page and its records modal.
import * as XLSX from "xlsx";
import { startLabel, endLabel } from "./tatSources";

const safeName = (s) =>
  String(s ?? "export")
    .replace(/[\\/:*?"<>|\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);

const stamp = () => new Date().toISOString().slice(0, 10);

const widths = (rows) =>
  (rows[0] || []).map((_, c) => ({
    wch: Math.min(
      60,
      Math.max(8, ...rows.map((r) => String(r[c] ?? "").length)) + 2,
    ),
  }));

const addSheet = (wb, name, rows) => {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = widths(rows);
  XLSX.utils.book_append_sheet(wb, ws, name);
};

const spellingsText = (list) =>
  (list || []).map((s) => `${s.name} (${s.count})`).join("; ");

// ── The applications behind one Company / Drug row (modal) ──
export function exportRecordsXlsx({ data, rows, evaluator, context }) {
  const head = [
    "#",
    "DTN",
    "Company",
    "Generic Name",
    "Brand Name",
    "Document Type",
    "Date Received",
    "TAT Start",
    "TAT Start from",
    "TAT End",
    "TAT End from",
    "Date Released",
    "TAT (working days)",
    "Status",
  ];
  const body = rows.map((r, i) => [
    i + 1,
    r.dtn,
    r.company,
    r.generic_name,
    r.brand_name,
    r.doc_type,
    r.date_received,
    r.tat_start,
    startLabel(r.tat_start_src),
    r.tat_end,
    endLabel(r.tat_end_src),
    r.date_released,
    r.tat,
    r.status,
  ]);
  const info = [
    [
      data.kind === "drug"
        ? "Drug"
        : data.kind === "period"
          ? "Applications"
          : "Company",
      data.name,
    ],
    [data.role_label || "Evaluator", evaluator?.full_name],
    ...(context ? [["Scope", context]] : []),
    ["Applications", rows.length],
    ["Spellings counted together", spellingsText(data.spellings)],
    [],
  ];
  const wb = XLSX.utils.book_new();
  addSheet(wb, "Applications", [...info, head, ...body]);
  XLSX.writeFile(
    wb,
    `${safeName(data.name)} - ${safeName(evaluator?.full_name)} - ${stamp()}.xlsx`,
  );
}

// ── The whole monitoring page ──
export function exportMonitoringXlsx({ data, periodLabel }) {
  const wb = XLSX.utils.book_new();
  const ev = data.evaluator;
  const monthly = data.period_mode === "month";

  addSheet(wb, "Summary", [
    [data.role_label || "Evaluator", ev.full_name],
    ["Code", ev.code],
    ["Position", ev.position],
    ["Closed applications released in", periodLabel],
    ["Closed apps", data.summary.closed_apps],
    ["Counted in ranking", data.summary.counted_apps],
    ["Skipped", data.summary.skipped_apps],
    ["Average TAT (working days)", data.summary.avg_tat],
    [],
    ...Object.values(data.formula).map((line) => [line]),
  ]);

  addSheet(wb, monthly ? "Received-Released by Month" : "Received-Released by Year", [
    [
      monthly ? "Month" : "Year",
      "Received (open and closed)",
      "Released",
      "Of the received: released in",
      "Of the received: not released yet",
      "Of the released: received in",
      "Of the released: no received date",
    ],
    ...data.periods.map((p) => [
      p.label,
      p.received,
      p.released,
      (p.received_split?.released || [])
        .map((r) => `${r.year}: ${r.count}`)
        .join("; "),
      p.received_split?.not_released ?? 0,
      (p.released_split?.received || [])
        .map((r) => `${r.year}: ${r.count}`)
        .join("; "),
      p.released_split?.no_received_date ?? 0,
    ]),
  ]);

  const ranked = (rows) => [
    ["Rank", "Name", "Total Apps", "Avg TAT (working days)", "Fastest (working days)", "Slowest (working days)", "Spellings counted together"],
    ...rows.map((r) => [
      r.rank,
      r.name,
      r.total_apps,
      r.avg_tat,
      r.fastest_tat,
      r.slowest_tat,
      r.spellings.length > 1 ? spellingsText(r.spellings) : "",
    ]),
  ];
  addSheet(wb, "Companies", ranked(data.companies));
  addSheet(wb, "Drugs", ranked(data.drugs));

  addSheet(wb, "Skipped", [
    ["DTN", "Company", "Generic Name", "TAT Start", "TAT Start from", "TAT End", "TAT End from", "Date Released", "Reason"],
    ...data.skipped.rows.map((r) => [
      r.dtn,
      r.company,
      r.generic_name,
      r.tat_start,
      startLabel(r.tat_start_src),
      r.tat_end,
      endLabel(r.tat_end_src),
      r.date_released,
      r.reason,
    ]),
    ...(data.skipped.total > data.skipped.shown
      ? [[`Only the latest ${data.skipped.shown} of ${data.skipped.total} are listed.`]]
      : []),
  ]);

  XLSX.writeFile(wb, `Evaluators Monitoring - ${safeName(ev.full_name)} - ${stamp()}.xlsx`);
}
