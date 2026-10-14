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