// src/components/eapplication/processes/fgmp/fgmpNod.js
//
// What the screens need to show a Notice of Deficiency (NOD), the paper trail
// behind the "For Compliance" action: dates, status, the email draft.
//
// The real work is done by the server (app/services/fgmp_nod.py), which saves
// NODs in the e_app_notice_of_deficiency table and enforces the rules:
// 5 working days, at most 5 NODs, extensions only forward. The date and limit
// rules here only preview what the server will do, so change both together.
//
// One NOD, as the screens hold it (see mapNod in api/appointmentRecords.js):
//   nodNumber, activity, deficiencies, requestedDocuments, issuedDate,
//   workingDays, dueDate, extendedDueDate, extensionReason, extendedAt,
//   documentsReceivedDate, status, issuedBy
//
// Dates are "YYYY-MM-DD" text, as a date input gives them.

export const MAX_NODS = 5;
export const NOD_WORKING_DAYS = 5;

export const STATUS_COMPLIED = "COMPLIED";

/* ───────── dates ───────── */

const pad = (n) => String(n).padStart(2, "0");

/* "2026-10-26" -> a Date at local midnight (no timezone drift) */
export function parseISODate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const todayISO = () => toISODate(new Date());

/* "03 July 2026", the way the FGMP unit writes it */
export function formatNodDate(iso) {
  if (!iso) return "";
  return parseISODate(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* `days` working days after `startISO`. Saturdays and Sundays do not count.
   Holidays are not skipped: the system has no holiday list yet. */
export function addWorkingDays(startISO, days) {
  const date = parseISODate(startISO);
  let left = days;
  while (left > 0) {
    date.setDate(date.getDate() + 1);
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6) left -= 1;
  }
  return toISODate(date);
}

/* ───────── NODs ───────── */

export const ordinal = (n) => {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
};

/* The unit allows up to MAX_NODS per application. The server refuses the
   next one; this lets the screen say so before anyone fills the form. */
export const canIssueNod = (nods) => nods.length < MAX_NODS;

/* A fresh id for a typed document line (screen only; the server gives each
   saved document its own id) */
const lineId = () =>
  `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const newDocumentLine = (text = "") => ({
  id: lineId(),
  requirementCode: text,
});

/* The date that counts: the latest extension, else the original due date */
export const effectiveDueDate = (nod) => nod.extendedDueDate || nod.dueDate;

/* WAITING, OVERDUE or COMPLIED. Overdue is worked out, never stored, so it
   cannot go stale. Due today is still on time. */
export function nodStatus(nod, today = todayISO()) {
  if (nod.status === STATUS_COMPLIED) return "COMPLIED";
  return today > effectiveDueDate(nod) ? "OVERDUE" : "WAITING";
}

/* The NOD issued last, if any */
export const latestNod = (nods) =>
  nods.length ? nods.reduce((a, b) => (b.nodNumber > a.nodNumber ? b : a)) : null;

/* ───────── the email to the applicant ───────── */

/* DRAFT ONLY. Built from the FGMP unit's two sample emails; nothing is sent.
   The subject line is a guess: the samples did not include one. */
export function buildNodEmail({ manufacturer, country, dtn, deficiencies, dueDate }) {
  const company = [manufacturer, country].filter(Boolean).join(" - ");
  const reference =
    `This has reference to your Foreign cGMP Clearance application for ` +
    `${company || "[foreign manufacturer]"} with tracking no. ${dtn || "[tracking no.]"}.`;
  const body = (deficiencies || "").trim();
  const lines = [
    "Good Day,",
    "",
    reference,
    "",
    `To facilitate the processing of your application, ${
      body || "[what is lacking]"
    }`,
    "",
    `You are given until ${
      dueDate ? formatNodDate(dueDate) : "[due date]"
    } to comply. No more extension shall be given and we will proceed with the ` +
      "evaluation of your application based on the available documents.",
  ];
  return {
    subject: `Notice of Deficiency - tracking no. ${dtn || ""}`.trim(),
    body: lines.join("\n"),
  };
}
