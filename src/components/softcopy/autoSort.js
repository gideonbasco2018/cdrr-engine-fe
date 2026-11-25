// src/components/softcopy/autoSort.js
// Auto-sort: suggest the unit(s) and section(s) of a letter from its type of
// letter and subject, using the CLINTON sheet rules and how CDRR-OD actually
// sorted ~10,500 letters in "General Letters Softcopy" (Feb–Nov 2026).
//
// Suggestions only — the user checks them and clicks Apply.
// sure: true  = the rule almost always matched the old sorting
// sure: false = a best guess; `doubt` says why it isn't sure
//
// Rules run top to bottom; the first match wins.

const has = (re) => (l) => re.test(l.subject) || re.test(l.app_type);
const type = (re) => (l) => re.test(l.app_type);

const RULES = [
  // ── OD (CLINTON: corrections, CPR reconstruction, verification portal) ──
  { test: has(/verification portal/i), units: ["OD"], sections: ["Verification Portal"], sure: true, why: "Verification portal" },
  { test: type(/reconstruction/i), units: ["OD"], sections: ["CPR Reconstruction"], sure: true, why: "Certificate Reconstruction" },
  { test: has(/\breconstruction\b/i), units: ["OD"], sections: ["CPR Reconstruction"], sure: true, why: "Reconstruction in subject" },
  { test: type(/correction/i), units: ["OD"], sections: ["Certificate Correction"], sure: true, why: "Certificate Correction" },
  { test: has(/\b(e?cpr|clidp|certificate)\b.{0,20}correction|correction of (e?cpr|clidp|certificate)/i), units: ["OD"], sections: ["Certificate Correction"], sure: true, why: "CPR correction in subject" },
  { test: has(/correction\b.{0,40}(registration (no|number)|\bdrp?-|\bdr-x)/i), units: ["OD"], sections: ["Certificate Correction"], sure: true, why: "Correction of a registration number" },

  // ── FGMP ──
  { test: has(/\bf?gmp\b.{0,30}(app|notification|extension|inspection|evidence|renewal)|local gmp|foreign gmp|\bfgmp\b/i), units: ["FGMP"], sections: [], sure: true, why: "GMP application / FGMP" },
  { test: type(/^add(itional)? docs?$/i), units: ["FGMP"], sections: [], sure: false, why: "Additional documents (usually FGMP)", doubt: "Extra documents can be for any kind of application. Most went to FGMP before, but not all." },

  // ── Licensing (CLINTON: resignation, change of email, LTO closure, surcharge) ──
  { test: has(/resign/i), units: ["Licensing"], sections: [], sure: true, why: "Resignation" },
  { test: has(/\blto\b.{0,15}clos|clos(ure|ing) of (the )?(lto|establishment|drugstore|pharmacy)|lto closure/i), units: ["Licensing"], sections: [], sure: true, why: "LTO closure" },
  { test: type(/lto|closure/i), units: ["Licensing"], sections: [], sure: true, why: "LTO letter" },
  { test: has(/change (of |the )?(e-?mail|email address)|e-?mail address/i), units: ["Licensing"], sections: [], sure: true, why: "Change of email" },
  { test: has(/surcharge/i), units: ["Licensing"], sections: [], sure: true, why: "Surcharge" },
  { test: has(/no connection|addition of (a |an )?(pharmacist|rph|outlet|branch)|notification of addition/i), units: ["Licensing"], sections: [], sure: true, why: "Pharmacist / outlet notice" },
  { test: has(/indorsement from rfo|\brfo\b/i), units: ["Licensing"], sections: [], sure: false, why: "From RFO (usually Licensing)", doubt: "RFO letters are mostly about LTOs, but some are about products or other matters." },

  // ── PRSDD (CLINTON: labelling PAC, CPR cancellation, post travel, product verif) ──
  { test: has(/meeting|symposi|sponsor|events?\/activit|webinar|conference|seminar|congress|convention/i), units: ["PRSDD"], sections: ["NOM"], sure: true, why: "Notice of meeting / event" },
  { test: has(/post[- ]?travel/i), units: ["PRSDD"], sections: ["Post Travel Report"], sure: true, why: "Post travel report" },
  { test: has(/exhaust/i), units: ["PRSDD"], sections: ["Exhaustion"], sure: true, why: "Exhaustion" },
  { test: has(/(cancel|withdraw)\w*.{0,40}\b(cpr|certificate of product registration)\b|\bcpr\b.{0,20}(cancel|withdraw)|voluntary cancellation/i), units: ["PRSDD"], sections: ["CPR Cancellation"], sure: true, why: "CPR cancellation" },
  { test: has(/product verification|verification of|authenticity|counterfeit/i), units: ["PRSDD"], sections: ["Product Verification"], sure: true, why: "Product verification" },
  { test: has(/warning letter|post[- ]?marketing|\bpms\b/i), units: ["PRSDD"], sections: ["PMS"], sure: true, why: "PMS / warning letter" },
  { test: has(/export[- ]only|first (batch|production)|production of export/i), units: ["PRSDD"], sections: ["PMS Labels"], sure: false, why: "Production / first batch notice", doubt: "Production notices were sent to different PRSDD sections before, not always PMS Labels." },
  { test: has(/label/i), units: ["PRSDD"], sections: ["PMS Labels"], sure: false, why: "Labelling", doubt: "\"Label\" also shows up in Registration and variation letters, so it may not be a PMS Labels letter." },

  // ── Registration (CLINTON: COA / GMP / BE / stability compliances) ──
  { test: has(/certificate of analys|\bco\s?a\b/i), units: ["Registration"], sections: ["COA"], sure: true, why: "COA" },
  { test: has(/stability/i), units: ["Registration"], sections: ["Stability"], sure: true, why: "Stability" },
  { test: has(/bioequival|\bbe\b (study|data)/i), units: ["Registration"], sections: ["BE"], sure: true, why: "BE" },
  // Post Approval Compliance: the old sheet split these between Registration
  // and PRSDD (often both). The subject rarely says which, so it's a guess.
  { test: has(/post[- ]?approval|\bpac\b|commitment/i), units: ["Registration"], sections: [], sure: false, why: "Post Approval Compliance", doubt: "These were split between Registration and PRSDD (often both), and the subject rarely says which. COA, stability or BE = Registration; labels = PRSDD." },
];

// Why a letter got no suggestion: near-misses and common "general" letters.
// Every hint that fits is returned (the popup shows up to 2); if none fit,
// a plain "no keyword" reason.
const NO_MATCH_HINTS = [
  { test: has(/cancel|withdraw/i), why: "Mentions a cancellation, but not of a CPR (the CPR Cancellation rule needs \"CPR\")" },
  { test: has(/reconsider|appeal|non-grant|denial|disapprov|motion for/i), why: "Asks to reconsider a decision. No rule covers appeals." },
  { test: has(/\bcpr\b|certificate of product registration/i), why: "Mentions a CPR, but not a cancellation, correction or reconstruction" },
  { test: has(/import|raw material|\bbulk\b|distribution/i), why: "Import / raw material question. No rule covers this." },
  { test: has(/clarif|guidance|inquir|query|request for (information|advice)|advisory/i), why: "General question or clarification. No keyword points to one unit." },
  { test: has(/variation|renewal|amendment/i), why: "Mentions an application (variation / renewal), but no unit keyword" },
];

export function whyNoSuggestion(letter) {
  const l = { subject: letter?.subject || "", app_type: letter?.app_type || "" };
  if (!l.subject.trim() && !l.app_type.trim()) return ["No type of letter and no subject to read"];
  const hits = NO_MATCH_HINTS.filter((h) => h.test(l)).map((h) => h.why);
  return hits.length ? hits.slice(0, 2) : ["Neither the type nor the subject has a keyword the rules know"];
}

// Returns { units, sections, sure, why } or null when no rule matches
// (those are usually general OD matters — the user decides).
export function suggestSort(letter) {
  const l = { subject: letter?.subject || "", app_type: letter?.app_type || "" };
  for (const r of RULES) {
    if (r.test(l)) return { units: [...r.units], sections: [...r.sections], sure: r.sure, why: r.why, doubt: r.doubt || "" };
  }
  return null;
}
