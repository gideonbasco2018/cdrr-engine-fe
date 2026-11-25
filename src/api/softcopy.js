// src/api/softcopy.js
//
// Softcopy page — softcopies of letters from the FDAC "CDRR PD & LTRS SOFTCOPY"
// transmittal.
//
// NO DATABASE for the letters: the page's work (letters, sorting, edits,
// stars, forwards, corrections) is kept in THIS browser only (localStorage,
// one copy per user) so it survives a refresh, until the user clicks Clear.
// Another computer doesn't see it. The way out is a download: the Export
// Excel and the transmittal PDF + Excel.
//
// The server (/api/softcopy, cdrr-engine-be app/api/routes/softcopy.py) only
// does what a browser can't:
//   · FIS Doctrack (POST /softcopy/doctrack), after the user checks the DTNs
//   · the Drive Viewer (GET /softcopy/drive/…)
//   · the shared download log (softcopy_downloads table). That table isn't
//     created yet (migration waits for approval), so SOFTCOPY_DOWNLOADS_BACKEND
//     stays false and the log is a test list in this browser. Flip it to true
//     once the table exists — the functions return the same shape.
//
// Make Transmittal: the page makes the PDF + Excel (with the date). It does
// NOT send email: the user sends the files their own way, then clicks
// "I sent it".

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";
import API from "./axios";
import { getUser } from "./auth";

export const SOFTCOPY_DOWNLOADS_BACKEND = false;

const data = (p) => p.then((r) => r.data);

// Units and sections, from CDRR-OD's own database ("General Letters Softcopy"
// sheet) and its routing rules ("CLINTON" sheet). A letter can go to more
// than one unit (e.g. Registration + PRSDD) and have more than one section.
export const UNITS = ["Licensing", "PRSDD", "Registration", "FGMP", "OD"];
export const SECTIONS = {
  Licensing: [],
  PRSDD: ["NOM", "PMS Labels", "PMS", "Exhaustion", "MSU", "CPR Cancellation", "Post Travel Report", "Product Verification"],
  Registration: ["COA", "GMP", "BE", "Stability"],
  FGMP: [],
  OD: ["Certificate Correction", "CPR Reconstruction", "Verification Portal"],
};
// Sections that fit the given units, in order, no repeats
export const sectionsFor = (units = []) => [...new Set(units.flatMap((u) => SECTIONS[u] || []))];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Step 1.5 — double-click ANY row (any app type, any unit) to pick
// Technical / System error. This app type is only used to point out the
// rows that most likely need it.
export const CORRECTION_APP_TYPE = "Certificate Correction";
export const CORRECTION_TYPES = ["Technical", "System error"];

// System errors are ticketed with ICTMD here.
export const ICTMD_TICKET_URL = "https://ismp.fda.gov.ph/";

export const isCorrection = (letter) => letter?.app_type === CORRECTION_APP_TYPE;

// Batch forwarding — ANY letters (any app type, any unit, corrections too)
// can go in one transmittal: one PDF + Excel, same layout as CDRR-OD's own
// files. The page doesn't send email: the user sends the files their own
// way, then clicks "I sent it". Nothing is blocked; the popup only shows
// notes (see forwardNotes) and the user can untick rows to leave them out.
// Destinations and contacts come from the CLINTON sheet.
// `contact` is the person/code CDRR-OD forwards to (shown on the PDF).
// `code` = the code in the Doctrack remark ("…forwarded to CDRR117").
// layout "standard" = the 6-column file (Licensing, MSU, FGMP…);
// "cpr" = CPR Reconstruction file (title row + Application DTN/Reg No. + DETAILS);
// "registration" = same as "cpr" but the last column is COMPLIANCE (the sections).
// Templates: Downloads\Transmittal. PVU comes later (user's call).
const target = (name, unit, extra = {}) => ({
  unit,
  section: null,
  contact: "",
  code: "",
  layout: "standard",
  // The files get the date at the end: "<fileBase> 2026-11-20.pdf / .xlsx"
  fileBase: `${name.toUpperCase()} TRANSMITTAL OF SOFTCOPY RECEIVED FROM FDAC`,
  subject: `Transmittal of Softcopy Letters for ${name} Received by CDRR-OD from FDAC`,
  ...extra,
});
export const FORWARD_TARGETS = {
  "Licensing Unit": target("Licensing Unit", "Licensing", { contact: "CDRR117", code: "CDRR117" }),
  // CDRR-OD's own PRSDD file is named "MSU TRANSMITTAL OF SOFTCOPY RECEIVED FROM FDAC.xlsx"
  PRSDD: target("MSU", "PRSDD", { contact: "PAC (MSU) · CDRR209", code: "CDRR209" }),
  Registration: target("Registration", "Registration", { contact: "PAC · A012", code: "A012", layout: "registration" }),
  FGMP: target("FGMP", "FGMP", { contact: "RManlapaz · A054", code: "A054", fileBase: "FGMP OF SOFTCOPY RECEIVED FROM FDAC" }),
  "CPR Reconstruction": target("CPR Reconstruction", "OD", { section: "CPR Reconstruction", contact: "CDRR39", code: "CDRR39", layout: "cpr" }),
  "Verification Portal": target("Verification Portal", "OD", { section: "Verification Portal", contact: "A031", code: "A031" }),
  // Added 2026-11-12. PVU file name matches the template in
  // Downloads\Transmittal. Codes for the Doctrack remark not given yet:
  // the user types the code in the popup (see doctrackRemark).
  // unit null = no unit check in the notes (unit not known yet).
  "Product Verification": target("PVU", "PRSDD", { section: "Product Verification", contact: "Product Verification Unit" }),
  SDS: target("SDS", null),
  CTS: target("CTS", null),
  Pharmacovigilance: target("Pharmacovigilance", null),
};

// Things worth a second look before a letter goes in a transmittal.
// These never block — they're shown next to the row in the popup.
export function forwardNotes(letter, target) {
  const notes = [];
  const cfg = FORWARD_TARGETS[target];
  const units = letter.units || [];
  const sections = letter.sections || [];
  const fmt = (s) => new Date(s).toLocaleDateString("en-US", { dateStyle: "medium" });
  (letter.forwards || []).forEach((f) => {
    notes.push(f.to === target ? `Already forwarded here on ${fmt(f.at)}` : `Also forwarded to ${f.to} on ${fmt(f.at)}`);
  });
  if (units.length === 0) notes.push("Unit not set yet");
  else if (cfg?.unit && !units.includes(cfg.unit)) notes.push(`Unit is ${units.join(" + ")}, not ${cfg.unit}`);
  else if (cfg?.section && !sections.includes(cfg.section)) notes.push(`Section is not ${cfg.section}`);
  if ((cfg?.layout === "cpr" || cfg?.layout === "registration") && !letter.app_dtn) notes.push("No APP DTN / Reg No. yet");
  if (cfg?.layout === "registration" && sections.length === 0) notes.push("No section yet (COMPLIANCE column will be empty)");
  if (letter.correction_type === "Technical") notes.push("Marked Technical");
  if (letter.correction_type === "System error") notes.push(`Marked System error${letter.ticket_no ? ` (ticket ${letter.ticket_no})` : ""}`);
  return notes;
}

// Step 1.5 fields (all empty until the user picks Technical / System error)
const EMPTY_CORRECTION = {
  correction_type: null,   // "Technical" | "System error"
  correction_set_by: null,
  correction_set_at: null,
  ticket_no: null,         // System error: the ICTMD ticket number
  ticketed_at: null,
  ticketed_by: null,
};

// Batch forwarding: one entry per transmittal the letter went in
// ({ to, at, by }), since a letter for two units is forwarded twice.
const emptyForward = () => ({ forwards: [] });

// Sorting + the extra columns CDRR-OD keeps in its own database.
// date_received_cdrr starts as the upload day (the FDAC file doesn't have it).
const emptyDetails = (dateReceivedCdrr = null) => ({
  units: [],
  sections: [],
  unit_set_by: null,
  unit_set_at: null,
  app_dtn: "",              // APP DTN / Reg No.
  date_received_cdrr: dateReceivedCdrr,
  receiving_officer: "",
  remarks: "",
  correction_detail: "",    // e.g. "incorrect validity" (their REMARKS 2)
});

// Fields the Edit popup can change
const EDITABLE = ["app_dtn", "date_received_cdrr", "receiving_officer", "remarks", "correction_detail"];

const currentUserName = () => {
  const u = getUser();
  return u?.username || u?.email || "me";
};
// Shown in the download log and on the PDF: the alias, else the username
const displayName = () => (getUser()?.alias || "").trim() || currentUserName();

// ── The page's work, kept in this browser (no database) ──────────────────────
// One copy per user on this computer. Saved after every change; read again
// when the user changes (another person logs in on the same computer).
const WORK_KEY = (user) => `softcopy_work_v1:${user}`;
const emptyStore = () => ({ transmittals: [], letters: [], stars: [], nextTransmittalId: 1, nextLetterId: 1 });

let store = emptyStore();
let storeUser = null;
let saveError = "";

function loadStore() {
  const me = currentUserName();
  if (storeUser === me) return store;
  storeUser = me;
  try {
    const raw = JSON.parse(localStorage.getItem(WORK_KEY(me)) || "null");
    store = raw && Array.isArray(raw.letters) ? { ...emptyStore(), ...raw } : emptyStore();
  } catch {
    store = emptyStore();
  }
  return store;
}

function saveStore() {
  try {
    localStorage.setItem(WORK_KEY(storeUser), JSON.stringify(store));
    saveError = "";
  } catch {
    // Browser storage full (or blocked): the work stays until the page is closed.
    saveError = "This browser's storage is full, so a refresh would lose the latest changes. Export to Excel, then Clear.";
  }
}

// "" when the last save worked, else a plain message for the page.
export const getSoftcopySaveError = () => saveError;

// Clear button: forget every letter on this computer (for this user).
export function clearSoftcopyWork() {
  loadStore();
  store = emptyStore();
  try { localStorage.removeItem(WORK_KEY(storeUser)); } catch { /* ignore */ }
  saveError = "";
}

// ── Excel reading ────────────────────────────────────────────────────────────

// Strip tabs and extra spaces FDAC leaves in names and subjects.
const clean = (v) =>
  v === null || v === undefined ? "" : String(v).replace(/\t/g, " ").replace(/\s+/g, " ").trim();

const pad = (n) => String(n).padStart(2, "0");
const toDateStr = (v) => {
  if (v instanceof Date && !isNaN(v)) {
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  return clean(v);
};

// The DTN comes in as a number (20260804181122) — keep it as text.
const toDtn = (v) => {
  if (typeof v === "number") return String(Math.round(v));
  return clean(v);
};

// FDAC's file has a header block on top (Date:, Prepared by:, Subject:, …)
// and the table below it, starting at the row whose first cell is "DTN".
async function readTransmittalFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  const header = { transmittal_date: "", prepared_by: "", subject: "", application_count: null };
  let tableStart = -1;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || [];
    const a = clean(r[0]).toLowerCase();
    if (a === "dtn") { tableStart = i; break; }
    if (a === "date:") header.transmittal_date = toDateStr(r[1]);
    if (a === "subject:") {
      // Subject runs onto the next row
      const next = rows[i + 1] || [];
      header.subject = clean(`${clean(r[1])} ${clean(next[0]) ? "" : clean(next[1])}`);
    }
    r.forEach((cell, j) => {
      const c = clean(cell).toLowerCase();
      if (c === "prepared by:") header.prepared_by = clean(r[j + 1]);
      if (c === "applications:") {
        const m = clean(r[j + 1]).match(/\d+/);
        header.application_count = m ? Number(m[0]) : null;
      }
    });
  }

  if (tableStart === -1) {
    throw new Error('Could not find the table. The file must have a row that starts with "DTN".');
  }

  const letters = [];
  for (let i = tableStart + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    if (r.every((c) => clean(c) === "")) continue;
    letters.push({
      row_number: i + 1,
      dtn: toDtn(r[0]),
      date_received: toDateStr(r[1]),
      app_type: clean(r[2]),
      submission: clean(r[3]),
      company_name: clean(r[4]),
      subject: clean(r[5]),
    });
  }

  return { header, letters };
}

// ── API ──────────────────────────────────────────────────────────────────────

// Step 1 of upload: read the file and say what will be added / skipped.
// Nothing is added yet.
export async function previewSoftcopyExcel(file) {
  const { header, letters } = await readTransmittalFile(file);
  const saved = new Set(loadStore().letters.map((l) => l.dtn));
  const seen = new Set();
  const will_insert = [];
  const will_skip = [];

  for (const l of letters) {
    let reason = null;
    if (!l.dtn) reason = "No DTN";
    else if (!/^\d{14}$/.test(l.dtn)) reason = `DTN "${l.dtn}" is not 14 digits`;
    else if (saved.has(l.dtn)) reason = "DTN is already on the page";
    else if (seen.has(l.dtn)) reason = "DTN appears twice in this file";

    if (reason) will_skip.push({ ...l, reason });
    else { will_insert.push(l); seen.add(l.dtn); }
  }

  return {
    header,
    total_rows: letters.length,
    will_insert,
    will_skip,
    insert_count: will_insert.length,
    skip_count: will_skip.length,
  };
}

// Step 2 of upload: add the transmittal and its letters to the page.
// driveFolderLink = the "CDRR PAID LTRS" folder link from the FDAC email.
export async function uploadSoftcopyExcel(file, driveFolderLink = "") {
  const preview = await previewSoftcopyExcel(file);
  if (preview.insert_count === 0) {
    return { inserted: 0, skipped: preview.skip_count, errors: [] };
  }

  const t = {
    id: store.nextTransmittalId++,
    ...preview.header,
    drive_folder_link: driveFolderLink.trim(),
    file_name: file.name,
    uploaded_by: currentUserName(),
    uploaded_at: new Date().toISOString(),
  };
  store.transmittals.push(t);

  const receivedByCdrr = todayStr();
  for (const l of preview.will_insert) {
    store.letters.push({
      id: store.nextLetterId++,
      transmittal_id: t.id,
      transmittal_date: t.transmittal_date,
      dtn: l.dtn,
      date_received: l.date_received,
      app_type: l.app_type,
      submission: l.submission,
      company_name: l.company_name,
      subject: l.subject,
      drive_link: "",
      ...emptyDetails(receivedByCdrr),
      ...EMPTY_CORRECTION,
      ...emptyForward(),
    });
  }
  saveStore();

  return { inserted: preview.insert_count, skipped: preview.skip_count, errors: [] };
}

// Each letter also carries who uploaded it and when, taken from its
// transmittal, and whether it's starred.
export async function getSoftcopyLetters() {
  loadStore();
  const byId = new Map(store.transmittals.map((t) => [t.id, t]));
  const mine = new Set(store.stars);
  return store.letters.map((l) => {
    const t = byId.get(l.transmittal_id);
    return {
      ...l,
      units: [...l.units],
      sections: [...l.sections],
      forwards: l.forwards.map((f) => ({ ...f })),
      uploaded_by: t?.uploaded_by ?? null,
      uploaded_at: t?.uploaded_at ?? null,
      starred: mine.has(l.id),
    };
  });
}

// ── Stars ────────────────────────────────────────────────────────────────────
// Kept apart from the letters on purpose: nothing else (unit, forwarding,
// corrections, uploads) reads or changes them, so a star only goes away when
// the user clicks it again (or clicks Clear).

// Star or unstar one letter. Returns the new state.
export async function setSoftcopyStar(id, starred) {
  loadStore();
  if (!store.letters.some((l) => l.id === id)) throw new Error("Letter not found.");
  const mine = new Set(store.stars);
  if (starred) mine.add(id);
  else mine.delete(id);
  store.stars = [...mine];
  saveStore();
  return { id, starred: mine.has(id) };
}

// Star or unstar many letters at once (the header star).
export async function setSoftcopyStars(ids, starred) {
  loadStore();
  const known = new Set(store.letters.map((l) => l.id));
  const mine = new Set(store.stars);
  let updated = 0;
  for (const id of ids) {
    if (!known.has(id)) continue;
    if (starred ? !mine.has(id) : mine.has(id)) updated++;
    if (starred) mine.add(id);
    else mine.delete(id);
  }
  store.stars = [...mine];
  saveStore();
  return { updated };
}

export async function getSoftcopyTransmittals() {
  return loadStore().transmittals.map((t) => ({ ...t }));
}

// Keep only sections that still fit the letter's units
function setUnits(l, units, by, now) {
  l.units = UNITS.filter((u) => units.includes(u)); // fixed order, no repeats
  const allowed = new Set(sectionsFor(l.units));
  l.sections = l.sections.filter((s) => allowed.has(s));
  l.unit_set_by = l.units.length ? by : null;
  l.unit_set_at = l.units.length ? now : null;
}

// Bulk: add a unit to, remove a unit from, or clear the units of many letters.
// mode: "add" | "remove" | "clear"
export async function setSoftcopyUnit(ids, mode, unit = null) {
  loadStore();
  if (mode !== "clear" && !UNITS.includes(unit)) throw new Error(`Unknown unit: ${unit}`);
  const idSet = new Set(ids);
  const now = new Date().toISOString();
  const by = currentUserName();
  let updated = 0;
  for (const l of store.letters) {
    if (!idSet.has(l.id)) continue;
    const next = mode === "clear" ? []
      : mode === "add" ? [...l.units, unit]
      : l.units.filter((u) => u !== unit);
    setUnits(l, next, by, now);
    updated++;
  }
  saveStore();
  return { updated };
}

// Edit popup: units, sections and the extra columns of one letter.
export async function updateSoftcopyLetter(id, changes) {
  const l = loadStore().letters.find((x) => x.id === id);
  if (!l) throw new Error("Letter not found.");
  const bad = (changes.units || []).find((u) => !UNITS.includes(u));
  if (bad) throw new Error(`Unknown unit: ${bad}`);
  if (changes.units) {
    const unitsChanged = changes.units.length !== l.units.length || changes.units.some((u) => !l.units.includes(u));
    if (unitsChanged) setUnits(l, changes.units, currentUserName(), new Date().toISOString());
  }
  if (changes.sections) {
    const allowed = new Set(sectionsFor(l.units));
    l.sections = changes.sections.filter((s) => allowed.has(s));
  }
  for (const k of EDITABLE) {
    if (k in changes) l[k] = k === "date_received_cdrr" ? (changes[k] || null) : clean(changes[k]);
  }
  saveStore();
  return { ...l };
}

// ── Step 1.5: corrections ────────────────────────────────────────────────────

// Any letter can have this step — no app type or unit limit.
function findCorrectionLetter(id) {
  const l = loadStore().letters.find((x) => x.id === id);
  if (!l) throw new Error("Letter not found.");
  return l;
}

// Pick Technical / System error. Changing the type clears what was done
// for the old type (the ticket), since it no longer applies.
export async function setSoftcopyCorrectionType(id, correctionType) {
  if (!CORRECTION_TYPES.includes(correctionType)) throw new Error(`Unknown type: ${correctionType}`);
  const l = findCorrectionLetter(id);
  if (l.correction_type !== correctionType) {
    Object.assign(l, EMPTY_CORRECTION);
  }
  l.correction_type = correctionType;
  l.correction_set_by = currentUserName();
  l.correction_set_at = new Date().toISOString();
  saveStore();
  return { ...l };
}

// System error: save the ICTMD ticket number.
export async function saveSoftcopyTicket(id, ticketNo) {
  const l = findCorrectionLetter(id);
  if (l.correction_type !== "System error") throw new Error("Only System error corrections get an ICTMD ticket.");
  const t = clean(ticketNo);
  if (!t) throw new Error("Enter the ticket number.");
  l.ticket_no = t;
  l.ticketed_at = new Date().toISOString();
  l.ticketed_by = currentUserName();
  saveStore();
  return { ...l };
}

// ── Batch forwarding ─────────────────────────────────────────────────────────

// Mark letters as forwarded to a unit (after the user sent the files).
export async function markSoftcopyForwarded(ids, target) {
  if (!FORWARD_TARGETS[target]) throw new Error(`Unknown unit: ${target}`);
  const idSet = new Set(ids);
  const picked = loadStore().letters.filter((l) => idSet.has(l.id));
  if (picked.length === 0) throw new Error("No letters to forward.");
  const now = new Date().toISOString();
  const by = currentUserName();
  picked.forEach((l) => { l.forwards.push({ to: target, at: now, by }); });
  saveStore();
  return { updated: picked.length };
}

// "2026-08-05" → Date (local), so Excel shows a real date
const toExcelDate = (s) => {
  if (!s) return "";
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d) ? s : d;
};

// ── Excel look of CDRR-OD's own transmittal files (Downloads\Transmittal) ────
// Yellow bold header, borders, Arial, centred wrapped text, dates as 6-Nov-26.
// The xlsx library can't write styles, so the file is made as usual and then
// its style part is swapped inside the zip (JSZip, already used by the page).
const XL_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="d\\-mmm\\-yy"/><numFmt numFmtId="165" formatCode="d\\-mmm\\-yy h:mm AM/PM"/></numFmts>
<fonts count="4">
<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><sz val="11"/><name val="Arial"/><family val="2"/></font>
<font><b/><sz val="11"/><name val="Arial"/><family val="2"/></font>
<font><b/><sz val="16"/><name val="Arial"/><family val="2"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFA6C9EC"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="3">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border>
<border><left style="medium"><color auto="1"/></left><right style="medium"><color auto="1"/></right><top style="medium"><color auto="1"/></top><bottom style="medium"><color auto="1"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="49" fontId="1" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="1" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="165" fontId="1" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
const XF = { header: 1, text: 2, date: 3, dateTime: 4, title: 5 };

// look = { headerRow, titleRow?, dateCols: [], dateTimeCols: [] } (0-based)
// Returns the styled .xlsx as bytes.
export async function styledXlsxBytes(wb, look) {
  const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const zip = await JSZip.loadAsync(bytes);
  zip.file("xl/styles.xml", XL_STYLES);
  const dates = new Set(look.dateCols || []);
  const dateTimes = new Set(look.dateTimeCols || []);
  const sheets = Object.keys(zip.files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
  for (const name of sheets) {
    const xml = await zip.file(name).async("string");
    const out = xml.replace(/<c r="([A-Z]+)(\d+)"([^>]*?)(\/?)>/g, (m, colL, rowN, attrs, selfClose) => {
      const r = Number(rowN) - 1;
      const c = XLSX.utils.decode_col(colL);
      let xf;
      if (r === look.titleRow) xf = XF.title;
      else if (r === look.headerRow) xf = XF.header;
      else if (r > look.headerRow) xf = dateTimes.has(c) ? XF.dateTime : dates.has(c) ? XF.date : XF.text;
      else return m;
      return `<c r="${colL}${rowN}"${attrs.replace(/\s+s="\d+"/, "")} s="${xf}"${selfClose}>`;
    });
    zip.file(name, out);
  }
  return zip.generateAsync({ type: "uint8array" });
}

// Save with the transmittal look. If styling fails for any reason, the plain
// file is still saved, so the user always gets the download.
function saveStyledXlsx(wb, fileName, look) {
  return styledXlsxBytes(wb, look)
    .then((bytes) => {
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    })
    .catch(() => XLSX.writeFile(wb, fileName));
}

// Each row's height in points: header tall like the templates, title taller
const rowHeights = (look) => {
  const rows = [];
  if (look.titleRow != null) rows[look.titleRow] = { hpt: 66.75 };
  rows[look.headerRow] = { hpt: 75.75 };
  return rows;
};

// The Excel list in the same layout as CDRR-OD's own files:
// "standard" = his Licensing Unit file, "cpr" = his CPR Reconstruction file.
// Returns { wb, look } — look = how to style it (see styledXlsxBytes).
function buildForwardWorkbook(letters, target) {
  const cfg = FORWARD_TARGETS[target];
  if (!cfg) throw new Error(`Unknown unit: ${target}`);
  const cdrrDate = (l) => toExcelDate(l.date_received_cdrr);
  let rows;
  let cols;
  let merges;
  let look;
  if (cfg.layout === "cpr" || cfg.layout === "registration") {
    const isReg = cfg.layout === "registration";
    rows = [
      ["SOFTCOPY PAC TRANSMITTAL"],
      ["LTR DTN", "APPLICATION DTN/REG NO.", "DATE RECEIVED BY FDAC FROM CLIENT", "DATE RECEIVED BY CDRR", "TYPE OF LETTER", "COMPANY", "SUBJECT", isReg ? "COMPLIANCE" : "DETAILS"],
      ...letters.map((l) => [
        l.dtn, l.app_dtn || "", toExcelDate(l.date_received), cdrrDate(l),
        l.app_type || "", l.company_name || "", l.subject || "",
        // Registration: the letter's sections, e.g. "COA / PMS Labels"
        isReg ? (l.sections || []).join(" / ") : (l.correction_detail || l.remarks || ""),
      ]),
    ];
    cols = [26.7, 22, 16.1, 15.4, 19, 18, 49.3, 29.3]; // template widths
    merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }]; // title across A1:H1, like the templates
    look = { titleRow: 0, headerRow: 1, dateCols: [2, 3] };
  } else {
    rows = [
      ["LTR DTN", "DATE RECEIVED BY FDAC FROM CLIENT", "DATE RECEIVED BY CDRR", "TYPE OF LETTER", "COMPANY", "SUBJECT"],
      ...letters.map((l) => [
        l.dtn, toExcelDate(l.date_received), cdrrDate(l), l.app_type || "", l.company_name || "", l.subject || "",
      ]),
    ];
    cols = [26.7, 16.1, 15.4, 19, 18, 52.3]; // template widths
    look = { headerRow: 0, dateCols: [1, 2] };
  }
  const ws = XLSX.utils.aoa_to_sheet(rows, { cellDates: true, dateNF: "d-mmm-yy" });
  ws["!cols"] = cols.map((wch) => ({ wch }));
  ws["!rows"] = rowHeights(look);
  if (merges) ws["!merges"] = merges;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return { wb, look };
}

const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const longDate = (d) => d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
// "2026-08-05" → "08/05/2026" (PDF cells)
const mdy = (s) => {
  if (!s) return "";
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : String(s);
};

// "<fileBase> 2026-11-20.pdf" and ".xlsx"
export function transmittalFileNames(target, date = new Date()) {
  const cfg = FORWARD_TARGETS[target];
  if (!cfg) throw new Error(`Unknown unit: ${target}`);
  const base = `${cfg.fileBase} ${ymd(date)}`;
  return { pdf: `${base}.pdf`, xlsx: `${base}.xlsx` };
}

// The PDF: a title, who it's for, the date, then the same columns as the
// Excel (same layout as CDRR-OD's own files).
function buildTransmittalPdf(letters, target, date) {
  const cfg = FORWARD_TARGETS[target];
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 12;
  const user = getUser();
  const preparedBy = (user?.alias || "").trim() || currentUserName();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(cfg.layout === "standard" ? "TRANSMITTAL OF SOFTCOPY LETTERS" : "SOFTCOPY PAC TRANSMITTAL", W / 2, 16, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Received by CDRR - Office of the Director from FDAC", W / 2, 21.5, { align: "center" });

  const info = [
    ["Date:", longDate(date)],
    ["To:", cfg.contact ? `${target} (${cfg.contact})` : target],
    ["From:", "CDRR - Office of the Director"],
    ["Prepared by:", preparedBy],
    ["No. of letters:", String(letters.length)],
  ];
  let y = 31;
  doc.setFontSize(9.5);
  info.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(k, M, y);
    doc.setFont("helvetica", "normal");
    doc.text(v, M + 28, y);
    y += 5.2;
  });

  const wide = cfg.layout === "cpr" || cfg.layout === "registration";
  const head = wide
    ? ["#", "LTR DTN", "APPLICATION DTN/REG NO.", "DATE RECEIVED BY FDAC FROM CLIENT", "DATE RECEIVED BY CDRR", "TYPE OF LETTER", "COMPANY", "SUBJECT", cfg.layout === "registration" ? "COMPLIANCE" : "DETAILS"]
    : ["#", "LTR DTN", "DATE RECEIVED BY FDAC FROM CLIENT", "DATE RECEIVED BY CDRR", "TYPE OF LETTER", "COMPANY", "SUBJECT"];
  const body = letters.map((l, i) => {
    const base = [String(i + 1), l.dtn];
    const dates = [mdy(l.date_received), mdy(l.date_received_cdrr)];
    const rest = [l.app_type || "", l.company_name || "", l.subject || ""];
    if (!wide) return [...base, ...dates, ...rest];
    const last = cfg.layout === "registration" ? (l.sections || []).join(" / ") : (l.correction_detail || l.remarks || "");
    return [...base, l.app_dtn || "", ...dates, ...rest, last];
  });
  autoTable(doc, {
    startY: y + 2,
    head: [head],
    body,
    margin: { left: M, right: M, bottom: 14 },
    // Same look as the Excel templates: yellow bold header, black borders, centred
    styles: { font: "helvetica", fontSize: 7.8, cellPadding: 1.6, halign: "center", valign: "middle", textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.25 },
    headStyles: { fillColor: [255, 255, 0], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 7.2, lineWidth: 0.2 },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles: wide
      ? { 0: { cellWidth: 7 }, 1: { cellWidth: 27 }, 2: { cellWidth: 27 }, 3: { cellWidth: 22 }, 4: { cellWidth: 20 }, 5: { cellWidth: 26 }, 6: { cellWidth: 38 }, 8: { cellWidth: 32 } }
      : { 0: { cellWidth: 7 }, 1: { cellWidth: 28 }, 2: { cellWidth: 24 }, 3: { cellWidth: 22 }, 4: { cellWidth: 30 }, 5: { cellWidth: 48 } },
  });

  // Footer on every page
  const pages = doc.getNumberOfPages();
  const H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${cfg.subject} · ${longDate(date)}`, M, H - 7);
    doc.text(`Page ${i} of ${pages}`, W - M, H - 7, { align: "right" });
  }
  return doc;
}

// Download both files (PDF + Excel), with the date in the name and on the PDF.
// The user sends them on their own. Each file goes in the download
// log. Returns the two file names.
// One file at a time: kind = "pdf" | "xlsx". Returns the file name.
export function downloadTransmittalFile(letters, target, kind, date = new Date()) {
  if (!FORWARD_TARGETS[target]) throw new Error(`Unknown unit: ${target}`);
  if (!letters.length) throw new Error("No letters in the list.");
  if (kind !== "pdf" && kind !== "xlsx") throw new Error(`Unknown file type: ${kind}`);
  const name = transmittalFileNames(target, date)[kind];
  if (kind === "pdf") {
    buildTransmittalPdf(letters, target, date).save(name);
  } else {
    const { wb, look } = buildForwardWorkbook(letters, target);
    saveStyledXlsx(wb, name, look);
  }
  logSoftcopyDownload({ file_name: name, file_type: kind, kind: "Transmittal", unit: target, dtns: letters.map((l) => l.dtn) });
  return name;
}

export function downloadTransmittalFiles(letters, target, date = new Date()) {
  return {
    pdf: downloadTransmittalFile(letters, target, "pdf", date),
    xlsx: downloadTransmittalFile(letters, target, "xlsx", date),
  };
}

// ── Download log (who downloaded which Excel / PDF, with the DTNs inside) ────
// Shared through the softcopy_downloads table once SOFTCOPY_DOWNLOADS_BACKEND
// is on. Until then: a test list in this browser.
const TEST_LOG_KEY = "softcopy_downloads_test_v1";
const TEST_LOG_MAX = 500;

function readTestLog() {
  try { return JSON.parse(localStorage.getItem(TEST_LOG_KEY) || "[]"); } catch { return []; }
}

// Fire and forget: a log that fails never stops the download itself.
// Failures are counted so the Downloads list can say "some weren't logged".
let logFailures = 0;
export const getSoftcopyLogFailures = () => logFailures;

export function logSoftcopyDownload({ file_name, file_type, kind, unit = null, dtns = [] }) {
  const entry = { file_name, file_type, kind, unit, dtns: [...new Set(dtns)] };
  if (SOFTCOPY_DOWNLOADS_BACKEND) {
    return API.post("/softcopy/downloads", entry).then((r) => r.data).catch(() => { logFailures++; return null; });
  }
  const log = readTestLog();
  const row = {
    id: (log[0]?.id || 0) + 1,
    ...entry,
    letter_count: entry.dtns.length,
    downloaded_by: displayName(),
    downloaded_at: new Date().toISOString(),
  };
  try { localStorage.setItem(TEST_LOG_KEY, JSON.stringify([row, ...log].slice(0, TEST_LOG_MAX))); } catch { logFailures++; }
  return Promise.resolve(row);
}

// Newest first. q = part of a file name, unit, name, or a DTN.
export async function getSoftcopyDownloads(q = "") {
  if (SOFTCOPY_DOWNLOADS_BACKEND) return data(API.get("/softcopy/downloads", { params: { q } }));
  const s = q.trim().toLowerCase();
  const log = readTestLog();
  if (!s) return log;
  return log.filter((d) =>
    [d.file_name, d.unit, d.downloaded_by].some((v) => (v || "").toLowerCase().includes(s))
    || d.dtns.some((x) => x.includes(s)));
}

// ── Export (main page) ───────────────────────────────────────────────────────

// What the Correction column shows, as plain text ("" = not a correction).
function correctionText(l) {
  if (l.correction_type === "Technical") return "Technical";
  if (l.correction_type === "System error") return l.ticket_no ? `System error · ticket ${l.ticket_no}` : "System error · no ticket";
  return isCorrection(l) ? "Not chosen yet" : "";
}

// Download the letters the user is looking at (search + filters already
// applied by the page), every table column. The file is made in the browser;
// only its name and DTNs go in the download log. `unit` = the Unit filter
// shown in the log ("" / null = all units).
export function exportSoftcopyLetters(letters, fileName, unit = null) {
  const header = [
    "LTR DTN", "APP DTN / REG NO.", "RECEIVED BY FDAC", "RECEIVED BY CDRR", "TYPE OF LETTER", "COMPANY",
    "SUBJECT", "UNIT", "SECTION", "CORRECTION", "RECEIVING OFFICER", "DATE FORWARDED", "FORWARDED TO", "REMARKS",
    "CORRECTION DETAIL", "DRIVE", "UPLOADED BY", "UPLOAD DATE",
  ];
  const rows = letters.map((l) => {
    const last = l.forwards.length ? l.forwards[l.forwards.length - 1].at : "";
    const up = l.uploaded_at ? new Date(l.uploaded_at) : "";
    return [
      l.dtn, l.app_dtn || "", toExcelDate(l.date_received), toExcelDate(l.date_received_cdrr), l.app_type || "",
      l.company_name || "", l.subject || "", (l.units || []).join(" + "), (l.sections || []).join(" / "),
      correctionText(l), l.receiving_officer || "", last ? toExcelDate(last.slice(0, 10)) : "",
      l.forwards.map((f) => f.to).join(", "), l.remarks || "",
      l.correction_detail || "", l.drive_link || "", l.uploaded_by || "", up && !isNaN(up) ? up : "",
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows], { cellDates: true, dateNF: "d-mmm-yy" });
  ws["!cols"] = [26.7, 22, 16.1, 15.4, 19, 30, 49.3, 18, 22, 24, 20, 15.4, 22, 30, 24, 36, 18, 20].map((wch) => ({ wch }));
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: header.length - 1 } }) };
  // Same look as the transmittal files; Upload Date keeps its time
  const look = { headerRow: 0, dateCols: [2, 3, 11], dateTimeCols: [17] };
  ws["!rows"] = rowHeights(look);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Softcopy");
  saveStyledXlsx(wb, fileName, look);
  logSoftcopyDownload({ file_name: fileName, file_type: "xlsx", kind: "Export", unit: unit || null, dtns: letters.map((l) => l.dtn) });
}

// ── Settings from the backend ────────────────────────────────────────────────
// { doctrack_enabled }: is the real FIS update switched on? (else simulated)
let configPromise = null;
export function getSoftcopyConfig() {
  if (!configPromise) configPromise = data(API.get("/softcopy/config")).catch((e) => { configPromise = null; throw e; });
  return configPromise;
}


// ── FIS Doctrack (only after the user checks the list and clicks Confirm) ────

export const DOCTRACK_REMARK_PREFIX = "Softcopy Received by CDRR - OD and forwarded to ";

// The remark CDRR-OD types in the Doctrack Bulk Upload. `code` = what the
// user typed in the popup (needed for units with no code yet, e.g. SDS).
export function doctrackRemark(target, code = FORWARD_TARGETS[target]?.code || "") {
  return `${DOCTRACK_REMARK_PREFIX}${String(code).trim()}`;
}

// Log the confirmed DTNs in FIS Doctrack with the remark. The server adds
// "Remarks by: <alias>"; this page then marks only the DTNs that worked.
// → { inserted, failed: [{ rsn, reason }], simulated }
// simulated = FIS is switched off (backend SOFTCOPY_DOCTRACK_ENABLED), nothing
// sent; the letters are marked "(test)".
export async function updateSoftcopyDoctrack(ids, remark) {
  const r = String(remark || "").trim();
  if (!r.startsWith(DOCTRACK_REMARK_PREFIX) || !r.slice(DOCTRACK_REMARK_PREFIX.length).trim()) {
    throw new Error("Type the unit's code for the FIS remark.");
  }
  if (!ids.length) throw new Error("No DTNs ticked.");
  const idSet = new Set(ids);
  const picked = loadStore().letters.filter((l) => idSet.has(l.id));
  if (picked.length !== idSet.size) throw new Error("Some letters are no longer on the page. Close and try again.");

  const res = await data(API.post("/softcopy/doctrack", { dtns: picked.map((l) => l.dtn), remark: r }));
  const bad = new Set((res.failed || []).map((f) => String(f.rsn)));
  const now = new Date().toISOString();
  const by = res.simulated ? `${displayName()} (test)` : displayName();
  // The store may have been reloaded while waiting: mark the letters in it now.
  loadStore().letters.forEach((l) => {
    if (idSet.has(l.id) && !bad.has(l.dtn)) { l.doctrack_at = now; l.doctrack_by = by; }
  });
  saveStore();
  return res;
}

// ── Automation ───────────────────────────────────────────────────────────────

// Apply many unit/section choices at once (Auto-sort popup).
// items: [{ id, units, sections }]
export async function applySoftcopySort(items) {
  let updated = 0;
  for (const it of items) {
    await updateSoftcopyLetter(it.id, { units: it.units, sections: it.sections });
    updated++;
  }
  return { updated };
}

// ── Drive Viewer (read-only, through the system's Google service account) ────
// No table needed. The folder must be shared with the service account
// (Viewer); otherwise the viewer falls back to Google's own preview.

// → { email } (null when this server has no Drive key)
export async function getSoftcopyDriveAccount() {
  return data(API.get("/softcopy/drive/account"));
}

// → { root_id, root_name, folder_id, path: [{ id, name }], items: [{ id, name, mime_type, is_folder, size, modified_at }] }
export async function listSoftcopyDrive(link, folderId = null) {
  return data(API.get("/softcopy/drive/list", { params: { link, ...(folderId ? { folder_id: folderId } : {}) } }));
}

// One file as a Blob (kept in the page's memory only).
export async function getSoftcopyDriveFile(rootId, fileId) {
  const r = await API.get("/softcopy/drive/file", { params: { root: rootId, file_id: fileId }, responseType: "blob" });
  return r.data;
}
