import MivnDetailsModal from "./processes/mivn/MivnDetailsModal.jsx";
import FgmpDetailsModal from "./processes/fgmp/FgmpDetailsModal.jsx";
import PlaceholderDetailsModal from "./processes/PlaceholderDetailsModal.jsx";

export const PROCESS_REGISTRY = {
  MIVN: {
    label: "Minor Variation - Notification",
    DetailsModal: MivnDetailsModal,
  },
  FGMP: {
    label: "FDA GMP",
    DetailsModal: FgmpDetailsModal,
  },
};

const FALLBACK_MODULE = {
  label: "Unknown Process",
  DetailsModal: PlaceholderDetailsModal,
};

export function getProcessModule(processCode) {
  return PROCESS_REGISTRY[processCode] || FALLBACK_MODULE;
}