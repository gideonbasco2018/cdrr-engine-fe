import MivnDetailsModal from "./processes/mivn/MivnDetailsModal.jsx";
import FgmpDetailsModal from "./processes/fgmp/FgmpDetailsModal.jsx";
import CprDetailsModal from "./processes/cpr/CprDetailsModal.jsx";
import PlaceholderDetailsModal from "./processes/PlaceholderDetailsModal.jsx";
import * as MivnPapers from "./processes/mivn/MivnPapers.jsx";
import * as FgmpPapers from "./processes/fgmp/FgmpPapers.jsx";
import * as CprPapers from "./processes/cpr/CprPapers.jsx";

/* Each process owns its details modal and its papers (Order of Payment,
   Additional Order of Payment, Acknowledgement Receipt). A process without
   `papers` falls back to the CPR papers in getPapersForRow. */
export const PROCESS_REGISTRY = {
  MVN: {
    label: "Minor Variation - Notification",
    DetailsModal: MivnDetailsModal,
    papers: MivnPapers,
  },
  FGMP: {
    label: "Foreign Good Manufacturing Practice for Pharmaceutical Products",
    DetailsModal: FgmpDetailsModal,
    papers: FgmpPapers,
  },
  CPR: {
    label: "Certificate of Product Registration",
    DetailsModal: CprDetailsModal,
    papers: CprPapers,
  },
};

const FALLBACK_MODULE = {
  label: "Unknown Process",
  DetailsModal: PlaceholderDetailsModal,
};

export function getProcessModule(processCode) {
  return PROCESS_REGISTRY[processCode] || FALLBACK_MODULE;
}

/* Decides which module (folder) a row belongs to.
   Application type wins over the process code: a Minor Variation
   application always opens the MVN modal, even when its activity is CPR.
   Everything else follows the process code (FGMP, CPR, ...). */
export function resolveProcessCode(row) {
  if (/minor variation/i.test(row?.applicationType || "")) return "MVN";
  return row?.processCode;
}

export function getProcessModuleForRow(row) {
  return getProcessModule(resolveProcessCode(row));
}

/* The papers of the process the row belongs to. */
export function getPapersForRow(row) {
  return PROCESS_REGISTRY[resolveProcessCode(row)]?.papers || CprPapers;
}