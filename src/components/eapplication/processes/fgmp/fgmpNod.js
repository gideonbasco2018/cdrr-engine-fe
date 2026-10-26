// src/components/eapplication/processes/fgmp/fgmpNod.js
//
// The rules for a Notice of Deficiency (NOD), the paper trail behind the
// "For Compliance" action. Plain functions with no screen code, so they can
// be tested on their own.
//
// MOCK-UP: there is no backend table yet (the proposed `e_app_nod` is waiting
// on the senior). NODs are kept in this browser only (readNods / writeNods),
// so nobody else can see them. One NOD here has the same fields as one row of
// the proposed table, so connecting it later means swapping where NODs are
// read and written, not redesigning the screens:
//
//   nodNumber, activity, deficiencies, requestedDocuments, issuedDate,
//   workingDays, dueDate, extendedDueDate, extensionReason, extendedAt,
//   documentsReceivedDate, status, issuedBy
//
// Dates are "YYYY-MM-DD" text, as a date input gives them.

export const MAX_NODS = 5;
export const NOD_WORKING_DAYS = 5;

export const STATUS_WAITING = "WAITING";
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

/* ───────── one NOD ───────── */

export const ordinal = (n) => {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
};

export const canIssueNod = (nods) => nods.length < MAX_NODS;

export const nextNodNumber = (nods) =>
  nods.reduce((max, n) => Math.max(max, n.nodNumber), 0) + 1;

/* A fresh id for a typed document line */
const lineId = () =>
  `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const newDocumentLine = (text = "") => ({
  id: lineId(),
  // same name the real table's requested_documents uses
  requirementCode: text,
  status: "REQUESTED",
  documentId: null, // e_app_documents.id once the file is uploaded
  filename: null,
});

/* Build the NOD that issuing "For Compliance" creates. Throws if it cannot. */
export function issueNod(
  nods,
  { activity, deficiencies, documentLines = [], issuedBy, issuedDate = todayISO() },
) {
  if (!canIssueNod(nods)) {
    throw new Error(`Maximum of ${MAX_NODS} NODs reached`);
  }
  const text = (deficiencies || "").trim();
  if (!text) throw new Error("Write what is lacking");
  return {
    nodNumber: nextNodNumber(nods),
    activity: activity || "",
    deficiencies: text,
    // blank lines are dropped; each kept line starts as REQUESTED
    requestedDocuments: documentLines
      .filter((line) => line.requirementCode.trim())
      .map((line) => ({ ...line, requirementCode: line.requirementCode.trim() })),
    issuedDate,
    workingDays: NOD_WORKING_DAYS,
    dueDate: addWorkingDays(issuedDate, NOD_WORKING_DAYS),
    extendedDueDate: null,
    extensionReason: null,
    extendedAt: null,
    documentsReceivedDate: null,
    status: STATUS_WAITING,
    issuedBy: issuedBy || "",
  };
}

/* The date that counts: the latest extension, else the original due date */
export const effectiveDueDate = (nod) => nod.extendedDueDate || nod.dueDate;

/* WAITING, OVERDUE or COMPLIED. Overdue is worked out, never stored, so it
   cannot go stale. Due today is still on time. */
export function nodStatus(nod, today = todayISO()) {
  if (nod.status === STATUS_COMPLIED) return "COMPLIED";
  return today > effectiveDueDate(nod) ? "OVERDUE" : "WAITING";
}

/* The deadline may be extended, and extended again, but only forward */
export function extendNod(nod, newDueDate, reason, today = todayISO()) {
  if (nod.status === STATUS_COMPLIED) {
    throw new Error("This NOD is already complied");
  }
  if (!newDueDate) throw new Error("Pick the new due date");
  if (newDueDate <= effectiveDueDate(nod)) {
    throw new Error("The new due date must be later than the current one");
  }
  if (!(reason || "").trim()) throw new Error("Write the reason for the extension");
  return {
    ...nod,
    extendedDueDate: newDueDate,
    extensionReason: reason.trim(),
    extendedAt: today,
  };
}

/* Record which requested documents came in. Once every one is in, the NOD is
   complied and the date is kept. With nothing requested, `receivedIds` is
   ignored and the date alone completes it. */
export function receiveDocuments(nod, receivedIds, receivedDate = todayISO()) {
  if (nod.status === STATUS_COMPLIED) {
    throw new Error("This NOD is already complied");
  }
  if (!receivedDate) throw new Error("Pick the date the documents were received");
  const ticked = new Set(receivedIds);
  const requestedDocuments = nod.requestedDocuments.map((doc) =>
    ticked.has(doc.id) ? { ...doc, status: "RECEIVED" } : doc,
  );
  const allIn = requestedDocuments.every((doc) => doc.status === "RECEIVED");
  return {
    ...nod,
    requestedDocuments,
    status: allIn ? STATUS_COMPLIED : STATUS_WAITING,
    documentsReceivedDate: allIn ? receivedDate : null,
  };
}

/* The NOD still waiting that was issued last, if any */
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

/* ───────── this browser's copy (mock-up only) ───────── */

const STORE_PREFIX = "fgmp-nod-mock";

const storeKey = (who, referenceNo) => `${STORE_PREFIX}:${who}:${referenceNo}`;

export function readNods(who, referenceNo) {
  try {
    const list = JSON.parse(localStorage.getItem(storeKey(who, referenceNo)) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return []; // blocked storage, or something else wrote over the key
  }
}

export function writeNods(who, referenceNo, nods) {
  try {
    if (nods.length === 0) localStorage.removeItem(storeKey(who, referenceNo));
    else localStorage.setItem(storeKey(who, referenceNo), JSON.stringify(nods));
  } catch {
    // storage full or blocked: the NOD simply is not kept
  }
}
