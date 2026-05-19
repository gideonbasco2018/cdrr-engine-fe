import { useState } from "react";
import { DTNEntryScreen } from "../components/applicationCorrection/DTNEntryScreen";
import { LoadingModal } from "../components/applicationCorrection/LoadingModal";
import { CorrectionPage } from "../components/applicationCorrection/CorrectionPage";
import { useDarkMode } from "../components/applicationCorrection/useDarkMode";
import { verifyDTN } from "../api/cpr-correction";

/** Maps snake_case API response → camelCase record shape used by components */
function mapRecord(data) {
  return {
    dtn: data.dtn,
    appStatus: data.app_status,
    processingType: data.processing_type,
    estCat: data.est_cat,
    appType: data.app_type,
    ltoComp: data.lto_comp,
    ltoAdd: data.lto_add,
    eadd: data.eadd,
    tin: data.tin,
    contactNo: data.contact_no,
    ltoNo: data.lto_no,
    validity: data.validity,
    dateReceivedCent: data.date_received_cent,
    dateReceivedFdac: data.date_received_fdac,
    dbTimelineCitizenCharter: data.timeline ? String(data.timeline) : null,
    dateReleased: data.date_released,
    prodBrName: data.prod_br_name,
    prodGenName: data.prod_gen_name,
    prodDosStr: data.prod_dos_str,
    prodDosForm: data.prod_dos_form,
    prodClassPrescript: data.prod_class_prescript,
    prodEssDrugList: data.prod_ess_drug_list,
    prodDistriShelfLife: data.prod_distri_shelf_life,
    prodPharmaCat: data.prod_pharma_cat,
    prodCat: data.prod_cat,
    file: data.file,
    storageCond: data.storage_cond,
    packaging: data.packaging,
    expiryDate: data.expiry_date,
    suggRp: data.sugg_rp,
    noSample: data.no_sample,
    fee: data.fee,
    lrf: data.lrf,
    surc: data.surc,
    total: data.total,
    orNo: data.or_no,
    dateIssued: data.date_issued,
    prodManu: data.prod_manu,
    prodManuCountry: data.prod_manu_country,
    prodManuLtoNo: data.prod_manu_lto_no,
    prodManuTin: data.prod_manu_tin,
    prodManuAdd: data.prod_manu_add,
    prodTrader: data.prod_trader,
    prodTraderCountry: data.prod_trader_country,
    prodTraderLtoNo: data.prod_trader_lto_no,
    prodTraderTin: data.prod_trader_tin,
    prodTraderAdd: data.prod_trader_add,
    prodImporter: data.prod_importer,
    prodImporterCountry: data.prod_importer_country,
    prodImporterLtoNo: data.prod_importer_lto_no,
    prodImporterTin: data.prod_importer_tin,
    prodImporterAdd: data.prod_importer_add,
    prodDistri: data.prod_distri,
    prodDistriCountry: data.prod_distri_country,
    prodDistriLtoNo: data.prod_distri_lto_no,
    prodDistriTin: data.prod_distri_tin,
    prodDistriAdd: data.prod_distri_add,
    prodRepacker: data.prod_repacker,
    prodRepackerCountry: data.prod_repacker_country,
    prodRepackerLtoNo: data.prod_repacker_lto_no,
    prodRepackerTin: data.prod_repacker_tin,
    prodRepackerAdd: data.prod_repacker_add,
    regNo: data.reg_no,
    motherAppType: data.mother_app_type,
    oldRsn: data.old_rsn,
    certification: data.certification,
    class: data.class_,
    mo: data.mo,
    typeDocReleased: data.type_doc_released,
    attaReleased: data.atta_released,
    secpa: data.secpa,
    secpaExpDate: data.secpa_exp_date,
    secpaIssuedOn: data.secpa_issued_on,
    cprCond: data.cpr_cond,
    cprCondRemarks: data.cpr_cond_remarks,
    cprCondAddRemarks: data.cpr_cond_add_remarks,
    ammend1: data.ammend1,
    ammend2: data.ammend2,
    ammend3: data.ammend3,
    appRemarks: data.app_remarks,
    remarks1: data.remarks1,
  };
}

export default function ApplicationCorrectionPage({ darkMode: darkModeProp }) {
  const darkMode = useDarkMode(darkModeProp);

  // "entry" | "loading" | "success" | "not_found" | "not_eligible" | "correction"
  const [phase, setPhase] = useState("entry");

  const [fetchedRecord, setFetchedRecord] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [newDtn, setNewDtn] = useState("");
  const handleVerify = async (dtn) => {
    setPhase("loading");
    setErrorMessage("");

    try {
      const data = await verifyDTN(dtn);

      if (!data.found) {
        setErrorMessage(data.message);
        setPhase("not_found");
        return;
      }

      if (!data.eligible) {
        setErrorMessage(data.message);
        setPhase("not_eligible");
        return;
      }

      // Found & eligible
      setFetchedRecord(mapRecord(data));
      setPhase("success");
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "An unexpected error occurred. Please try again.";
      setErrorMessage(msg);
      setPhase("not_found");
    }
  };

  const handleBack = () => {
    setPhase("entry");
    setFetchedRecord(null);
    setErrorMessage("");
  };

  return (
    <div
      style={{
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
        background: darkMode ? "#141414" : "#F0EDE8",
        minHeight: "100%",
        color: darkMode ? "#E8E4DF" : "#1C1A17",
      }}
    >
      {/* Loading / Success / Not-found / Not-eligible modal */}
      {(phase === "loading" ||
        phase === "success" ||
        phase === "not_found" ||
        phase === "not_eligible") && (
        <LoadingModal
          phase={phase}
          record={fetchedRecord}
          errorMessage={errorMessage}
          onContinue={(newDtn) => {
            setNewDtn(newDtn);
            setPhase("correction");
          }}
          onBack={handleBack}
          darkMode={darkMode}
        />
      )}

      {phase === "entry" && (
        <DTNEntryScreen onVerify={handleVerify} darkMode={darkMode} />
      )}

      {phase === "correction" && (
        <CorrectionPage
          record={fetchedRecord}
          newDtn={newDtn}
          onBack={handleBack}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
