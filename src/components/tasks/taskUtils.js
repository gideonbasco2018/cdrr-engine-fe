export const mapWorkflowTask = (task, index) => {
  const m = task.main_db || {};
  return {
    id: task.id ?? index + 1,
    mainDbId: m.DB_ID ?? null,
    dtn: m.DB_DTN ?? "N/A",
    estCat: m.DB_EST_CAT ?? "N/A",
    ltoComp: m.DB_EST_LTO_COMP ?? "N/A",
    ltoCompany: m.DB_EST_LTO_COMP ?? "N/A",
    ltoAdd: m.DB_EST_LTO_ADD ?? "N/A",
    eadd: m.DB_EST_EADD ?? "N/A",
    tin: m.DB_EST_TIN ?? "N/A",
    contactNo: m.DB_EST_CONTACT_NO ?? "N/A",
    ltoNo: m.DB_EST_LTO_NO ?? "N/A",
    validity: m.DB_EST_VALIDITY ?? "N/A",
    prodBrName: m.DB_PROD_BR_NAME ?? "N/A",
    prodGenName: m.DB_PROD_GEN_NAME ?? "N/A",
    prodDosStr: m.DB_PROD_DOS_STR ?? "N/A",
    prodDosForm: m.DB_PROD_DOS_FORM ?? "N/A",
    prodClassPrescript: m.DB_PROD_CLASS_PRESCRIP ?? "N/A",
    prodEssDrugList: m.DB_PROD_ESS_DRUG_LIST ?? "N/A",
    prodPharmaCat: m.DB_PROD_PHARMA_CAT ?? "N/A",
    manufacturer: m.DB_PROD_MANU ?? "N/A",
    prodManu: m.DB_PROD_MANU ?? "N/A",
    prodManuAdd: m.DB_PROD_MANU_ADD ?? "N/A",
    prodManuTin: m.DB_PROD_MANU_TIN ?? "N/A",
    prodManuLtoNo: m.DB_PROD_MANU_LTO_NO ?? "N/A",
    prodManuCountry: m.DB_PROD_MANU_COUNTRY ?? "N/A",
    prodTrader: m.DB_PROD_TRADER ?? "N/A",
    prodTraderAdd: m.DB_PROD_TRADER_ADD ?? "N/A",
    prodTraderTin: m.DB_PROD_TRADER_TIN ?? "N/A",
    prodTraderLtoNo: m.DB_PROD_TRADER_LTO_NO ?? "N/A",
    prodTraderCountry: m.DB_PROD_TRADER_COUNTRY ?? "N/A",
    prodRepacker: m.DB_PROD_REPACKER ?? "N/A",
    prodRepackerAdd: m.DB_PROD_REPACKER_ADD ?? "N/A",
    prodRepackerTin: m.DB_PROD_REPACKER_TIN ?? "N/A",
    prodRepackerLtoNo: m.DB_PROD_REPACKER_LTO_NO ?? "N/A",
    prodRepackerCountry: m.DB_PROD_REPACKER_COUNTRY ?? "N/A",
    prodImporter: m.DB_PROD_IMPORTER ?? "N/A",
    prodImporterAdd: m.DB_PROD_IMPORTER_ADD ?? "N/A",
    prodImporterTin: m.DB_PROD_IMPORTER_TIN ?? "N/A",
    prodImporterLtoNo: m.DB_PROD_IMPORTER_LTO_NO ?? "N/A",
    prodImporterCountry: m.DB_PROD_IMPORTER_COUNTRY ?? "N/A",
    prodDistri: m.DB_PROD_DISTRI ?? "N/A",
    prodDistriAdd: m.DB_PROD_DISTRI_ADD ?? "N/A",
    prodDistriTin: m.DB_PROD_DISTRI_TIN ?? "N/A",
    prodDistriLtoNo: m.DB_PROD_DISTRI_LTO_NO ?? "N/A",
    prodDistriCountry: m.DB_PROD_DISTRI_COUNTRY ?? "N/A",
    prodDistriShelfLife: m.DB_PROD_DISTRI_SHELF_LIFE ?? "N/A",
    storageCond: m.DB_STORAGE_COND ?? "N/A",
    packaging: m.DB_PACKAGING ?? "N/A",
    suggRp: m.DB_SUGG_RP ?? "N/A",
    noSample: m.DB_NO_SAMPLE ?? "N/A",
    expiryDate: m.DB_EXPIRY_DATE ?? "N/A",
    cprValidity: m.DB_CPR_VALIDITY ?? "N/A",
    regNo: m.DB_REG_NO ?? "N/A",
    appType: m.DB_APP_TYPE ?? "N/A",
    motherAppType: m.DB_MOTHER_APP_TYPE ?? "N/A",
    oldRsn: m.DB_OLD_RSN ?? "N/A",
    ammend1: m.DB_AMMEND1 ?? "N/A",
    ammend2: m.DB_AMMEND2 ?? "N/A",
    ammend3: m.DB_AMMEND3 ?? "N/A",
    prodCat: m.DB_PROD_CAT ?? "N/A",
    certification: m.DB_CERTIFICATION ?? "N/A",
    fee: m.DB_FEE ?? "N/A",
    lrf: m.DB_LRF ?? "N/A",
    surc: m.DB_SURC ?? "N/A",
    total: m.DB_TOTAL ?? "N/A",
    orNo: m.DB_OR_NO ?? "N/A",
    dateIssued: m.DB_DATE_ISSUED ?? "N/A",
    dateReceivedFdac: m.DB_DATE_RECEIVED_FDAC ?? "N/A",
    dateReceivedCent: m.DB_DATE_RECEIVED_CENT ?? "N/A",
    mo: m.DB_MO ?? "N/A",
    file: m.DB_FILE ?? "N/A",
    secpa: m.DB_SECPA ?? "N/A",
    secpaExpDate: m.DB_SECPA_EXP_DATE ?? "N/A",
    secpaIssuedOn: m.DB_SECPA_ISSUED_ON ?? "N/A",
    deckingSched: m.DB_DECKING_SCHED ?? "N/A",
    eval: m.DB_EVAL ?? "N/A",
    dateDeck: m.DB_DATE_DECK ?? "N/A",
    remarks1: m.DB_REMARKS_1 ?? "N/A",
    dateRemarks: m.DB_DATE_REMARKS ?? "N/A",
    class: m.DB_CLASS ?? "N/A",
    dateReleased: m.DB_DATE_RELEASED ?? "N/A",
    typeDocReleased: m.DB_TYPE_DOC_RELEASED ?? "N/A",
    attaReleased: m.DB_ATTA_RELEASED ?? "N/A",
    cprCond: m.DB_CPR_COND ?? "N/A",
    cprCondRemarks: m.DB_CPR_COND_REMARKS ?? "N/A",
    cprCondAddRemarks: m.DB_CPR_COND_ADD_REMARKS ?? "N/A",
    appStatus: m.DB_APP_STATUS ?? "N/A",
    appRemarks: m.DB_APP_REMARKS ?? "N/A",
    trash: m.DB_TRASH ?? "N/A",
    trashDateEncoded: m.DB_TRASH_DATE_ENCODED ?? "N/A",
    userUploader: m.DB_USER_UPLOADER ?? "N/A",
    uploadedAt: m.DB_DATE_EXCEL_UPLOAD ?? "N/A",
    dateExcelUpload: m.DB_DATE_EXCEL_UPLOAD ?? "N/A",
    pharmaProdCat: m.DB_PHARMA_PROD_CAT ?? "N/A",
    pharmaProdCatLabel: m.DB_PHARMA_PROD_CAT_LABEL ?? "N/A",
    isInPm: m.DB_IS_IN_PM ?? "N/A",
    dbTimelineCitizenCharter: m.DB_TIMELINE_CITIZEN_CHARTER ?? null,
    processingType: m.DB_PROCESSING_TYPE || "Regular",

    // ── From ApplicationLog (task itself) ──────────────────────────
    applicationStep: task.application_step ?? "N/A",
    accomplishedDate: task.accomplished_date ?? "N/A",
    logCreatedAt: task.created_at ?? "N/A",
    evaluator: task.user_name ?? "N/A",

    deadlineDate: task.deadline_date ?? null,
    workingDays: task.working_days ?? null,

    // ── Read tracking ──────────────────────────────────────────────
    // NOTE: kept here for reference — TaskPage reads is_read directly
    // from the raw API response, not from mapped data
    is_read: task.is_read ?? 0,

    // ── Received tracking ─────────────────────────────────────────
    is_received: task.is_received ?? 0,   // ← THIS WAS MISSING — caused rows to never appear in Received tab
    received_at: task.received_at ?? null,
    received_by: task.received_by ?? null,
  };
};

// export const getCurrentUser = () => {
//   const s = localStorage.getItem("user") || sessionStorage.getItem("user");
//   if (s) {
//     try {
//       const o = JSON.parse(s);
//       return o.username || o.email || o.first_name || null;
//     } catch {
//       return s;
//     }
//   }
//   return (
//     localStorage.getItem("username") ||
//     sessionStorage.getItem("username") ||
//     null
//   );
// };