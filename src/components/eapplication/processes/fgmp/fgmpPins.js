/* Pins: pointing a comment at one part of the popup.

   Every pinnable part carries a name in the page itself:
     data-pin="payment:12" data-pin-label="Payment 12"   (cards, rows, fields)
     data-ws="issuingCountry"                            (worksheet paper)
     data-hl="dra" / data-field="issuingCountry"         (worksheet, older names)
   A pin stores that name, a readable label, and a short quote of the part, so
   the comment still makes sense when the part is gone or not on screen.

   This file only reads the page; it holds no screen state. */

/* Worksheet: the name on the paper (data-hl) for each left-column field. */
const WS_TO_HL = {
  issuingAuthority: "dra",
  issuingCountry: "dra",
  foreignCertificateNumber: "certNo",
  foreignCertificateValidity: "validity",
  inspectionDate: "inspectionDate",
  worksheetRemarks: "remarks",
  gmpEvidence: "gmpEvidence",
  recommendationChoice: "recommendation",
  dateIssuedText: "dateIssuedText",
  approvedDosageFormsNote: "approvedDosageFormsNote",
  complianceNotes: "complianceNotes",
};

/* Reverse: when only the paper name is known, the left field is a guess for
   names shared by two fields (dra), so those keep their own data-ws. */
const HL_TO_WS = {};
Object.entries(WS_TO_HL).forEach(([ws, hl]) => {
  if (!(hl in HL_TO_WS)) HL_TO_WS[hl] = ws;
});

const WS_LABELS = {
  issuingAuthority: "Regulatory authority",
  issuingCountry: "Country",
  foreignCertificateNumber: "Certificate number",
  foreignCertificateValidity: "Certificate validity",
  inspectionDate: "Inspection dates",
  worksheetRemarks: "Remarks",
  gmpEvidence: "GMP evidence",
  recommendationChoice: "Recommendation",
  dateIssuedText: "Date issued",
  approvedDosageFormsNote: "Approved dosage forms note",
  complianceNotes: "Compliance notes",
  appliedForms: "Annex B: applied forms",
  approvedProducts: "Approved medicinal products",
  annexRows: "Annex C",
};

const humanize = (name) =>
  String(name || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());

/* extraLabels: { fieldName: "Label" }, for names this file does not know
   (the Annex C fields come from the worksheet paper). */
export const wsLabel = (field, extraLabels) =>
  WS_LABELS[field] || (extraLabels && extraLabels[field]) || humanize(field);

/* The exact spot of a pin inside its part: how far across and down the part's
   box the click was, as fractions from 0 to 1. Fractions (not pixels) keep the
   pin in the same place when the part gets wider, narrower or taller. A pin
   with no spot saved (older ones) sits on the part's top-right corner. */
export const DEFAULT_AT = { fx: 1, fy: 0 };

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const round4 = (n) => Math.round(n * 10000) / 10000;

/* rect: the part's box (left, top, width, height) and x, y: where the click was,
   in the same units (screen pixels). */
export function clickOffset(rect, x, y) {
  if (!rect || !rect.width || !rect.height) return { ...DEFAULT_AT };
  return {
    fx: round4(clamp01((x - rect.left) / rect.width)),
    fy: round4(clamp01((y - rect.top) / rect.height)),
  };
}

/* Where the pin's point goes for a part's current box. */
export function pinSpot(rect, at) {
  const a = at && Number.isFinite(at.fx) && Number.isFinite(at.fy) ? at : DEFAULT_AT;
  return { x: rect.left + a.fx * rect.width, y: rect.top + a.fy * rect.height };
}

const esc = (v) => (window.CSS && window.CSS.escape ? window.CSS.escape(v) : v);

const SELECTOR = "[data-pin],[data-ws],[data-hl],[data-field]";

/* The pinnable part under an element: { key, label, element } or null. */
export function pinTargetFrom(el, extraLabels) {
  if (!el || !el.closest) return null;
  const hit = el.closest(SELECTOR);
  if (!hit) return null;
  if (hit.dataset.pin) {
    return {
      key: hit.dataset.pin,
      label: hit.dataset.pinLabel || humanize(hit.dataset.pin.split(":").pop()),
      element: hit,
    };
  }
  const field =
    hit.dataset.ws ||
    hit.dataset.field ||
    HL_TO_WS[hit.dataset.hl] ||
    hit.dataset.hl;
  const rowId = el.closest("[data-row]")?.dataset.row;
  return {
    key: `ws:${field}${rowId ? `:${rowId}` : ""}`,
    label: wsLabel(field, extraLabels) + (rowId ? " (row)" : ""),
    element: hit,
  };
}

/* A short quote of what is on the part, to show next to the comment. */
export function snapshotOf(el, max = 140) {
  if (!el) return "";
  const input =
    el.matches?.("input,textarea,select") ? el : el.querySelector?.("input,textarea,select");
  let text = input && input.value != null && input.value !== "" ? input.value : el.textContent;
  text = String(text || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/* Find the part for a pin inside root. A part drawn twice (worksheet paper and
   left column) is found on the paper first. skip: an element to look outside
   of, such as the left column. Returns an element or null. */
export function findPinElement(root, key, skip) {
  if (!root || !key) return null;
  const inside = (el) => !skip || !skip.contains(el);
  const first = (selector) =>
    [...root.querySelectorAll(selector)].find(inside) || null;

  if (key.startsWith("ws:")) {
    const [, field, rowId] = key.split(":");
    if (rowId) {
      const row = root.querySelector(`[data-row="${esc(rowId)}"]`);
      if (row) return row;
    }
    const hl = WS_TO_HL[field] || field;
    return (
      first(`[data-ws="${esc(field)}"]`) ||
      first(`[data-hl="${esc(hl)}"]`) ||
      (root.querySelector(`[data-field="${esc(field)}"]`)?.closest("div") ?? null)
    );
  }
  if (key.startsWith("step:")) return root;
  return first(`[data-pin="${esc(key)}"]`);
}

/* True when a pin points at one table row and that row is no longer there
   (the pin then falls back to the whole table). */
export function isRowGone(root, key) {
  if (!root || !key || !key.startsWith("ws:")) return false;
  const rowId = key.split(":")[2];
  return !!rowId && !root.querySelector(`[data-row="${esc(rowId)}"]`);
}

/* Make a part visible: open anything folded around it, then scroll every
   scrolling box so it sits in view. */
export function revealElement(el, behavior = "smooth") {
  if (!el) return;
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (p.tagName === "DETAILS" && !p.open) p.open = true;
  }
  el.scrollIntoView({ block: "center", inline: "nearest", behavior });
}

/* Light a part up for a moment. */
export function flashElement(el, ms = 2400) {
  if (!el) return () => {};
  el.setAttribute("data-pin-flash", "1");
  const timer = setTimeout(() => el.removeAttribute("data-pin-flash"), ms);
  return () => {
    clearTimeout(timer);
    el.removeAttribute("data-pin-flash");
  };
}

/* Wait for a part to appear (a step has just opened), then resolve with it.
   Resolves null after `timeout` ms. */
export function waitForPinElement(root, key, skip, timeout = 1500) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const el = findPinElement(root, key, skip);
      if (el) return resolve(el);
      if (Date.now() - start > timeout) return resolve(null);
      return setTimeout(tick, 30);
    };
    tick();
  });
}
