// src/components/monitoring/clidpEservices/ClidpRecordsModal.jsx
import RecordsListModal from "../shared/RecordsListModal";
import {
  getEservicesDrugGroupRecords,
  getEservicesDrugGroupGenericNames,
} from "../../../api/eservices-drug-groups";

/**
 * target = { title, group, status, step, exportFilename }
 */
function ClidpRecordsModal({ target, ui, darkMode, onClose }) {
  const scope = {
    group: target.group,
    application_status: target.status,
    application_step: target.step || undefined,
  };

  return (
    <RecordsListModal
      target={target}
      idLabel="Application Number"
      idKey="application_number"
      fetchRecords={(params) =>
        getEservicesDrugGroupRecords({ ...scope, ...params })
      }
      fetchGenericNames={() => getEservicesDrugGroupGenericNames(scope)}
      ui={ui}
      darkMode={darkMode}
      onClose={onClose}
    />
  );
}

export default ClidpRecordsModal;
