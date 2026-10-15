import MivnDetailsModal from "./processes/mivn/MivnDetailsModal.jsx";
import FgmpDetailsModal from "./processes/fgmp/FgmpDetailsModal.jsx";
import CprDetailsModal from "./processes/cpr/CprDetailsModal.jsx";
import PlaceholderDetailsModal from "./processes/PlaceholderDetailsModal.jsx";

export const PROCESS_REGISTRY = {
  MVN: {
    label: "Minor Variation - Notification",
    DetailsModal: MivnDetailsModal,
  },
  FGMP: {
    label: "Foreign Good Manufacturing Practice for Pharmaceutical Products",
    DetailsModal: FgmpDetailsModal,
  },
  CPR: {
    label: "Certificate of Product Registration",
    DetailsModal: CprDetailsModal,
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