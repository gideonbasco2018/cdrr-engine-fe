export const tableColumns = [
  { key: "dtn", label: "DTN", width: "180px" },
  { key: "estCat", label: "Category", width: "120px" },
  { key: "ltoCompany", label: "LTO Company", width: "200px" },
  { key: "ltoAdd", label: "LTO Address", width: "200px" },          // was ltoAddress
  { key: "eadd", label: "Email", width: "180px" },                   // was email
  { key: "tin", label: "TIN", width: "120px" },
  { key: "contactNo", label: "Contact No.", width: "130px" },
  { key: "ltoNo", label: "LTO No.", width: "130px" },
  { key: "validity", label: "Validity", width: "120px" },
  { key: "prodBrName", label: "Brand Name", width: "180px" },
  { key: "prodGenName", label: "Generic Name", width: "180px" },
  { key: "prodDosStr", label: "Dosage Strength", width: "140px" },   // was dosageStrength
  { key: "prodDosForm", label: "Dosage Form", width: "130px" },      // was dosageForm
  { key: "prodClassPrescript", label: "Prescription", width: "120px" }, // was prescription
  { key: "prodEssDrugList", label: "Essential Drug", width: "130px" },  // was essentialDrug
  { key: "prodPharmaCat", label: "Pharma Category", width: "140px" },   // was pharmaCategory
  { key: "prodManu", label: "Manufacturer", width: "180px" },        // was manufacturer
  { key: "prodManuAdd", label: "Mfr. Address", width: "180px" },     // was manufacturerAddress
  { key: "prodManuCountry", label: "Mfr. Country", width: "130px" }, // was manufacturerCountry
  { key: "prodTrader", label: "Trader", width: "160px" },            // was trader
  { key: "prodTraderCountry", label: "Trader Country", width: "130px" }, // was traderCountry
  { key: "prodImporter", label: "Importer", width: "160px" },        // was importer
  { key: "prodImporterCountry", label: "Importer Country", width: "140px" }, // was importerCountry
  { key: "prodDistri", label: "Distributor", width: "160px" },       // was distributor
  { key: "prodDistriCountry", label: "Distri. Country", width: "140px" }, // was distributorCountry
  { key: "prodDistriShelfLife", label: "Shelf Life", width: "110px" }, // was shelfLife
  { key: "packaging", label: "Packaging", width: "140px" },
  { key: "expiryDate", label: "Expiry Date", width: "120px" },
  { key: "regNo", label: "Reg. No.", width: "130px" },
  { key: "appType", label: "App Type", width: "120px" },
  { key: "motherAppType", label: "Mother App Type", width: "140px" },
  { key: "oldRsn", label: "Old RSN", width: "120px" },
  { key: "prodCat", label: "Product Category", width: "140px" },     // was productCategory
  { key: "fee", label: "Fee", width: "100px" },
  { key: "total", label: "Total", width: "100px" },
  { key: "orNo", label: "OR No.", width: "120px" },
  { key: "dateIssued", label: "Date Issued", width: "130px" },
  { key: "dateReceivedFdac", label: "Date Rcvd FDAC", width: "140px" },
  { key: "dateReceivedCent", label: "Date Rcvd Central", width: "150px" },
  { key: "mo", label: "MO", width: "100px" },
  { key: "deckingSched", label: "Decking Sched", width: "140px" },
  { key: "eval", label: "Evaluator", width: "130px" },
  { key: "dateDeck", label: "Date Deck", width: "120px" },
  { key: "remarks1", label: "Remarks", width: "180px" },
  { key: "dateRemarks", label: "Date Remarks", width: "130px" },
  { key: "class", label: "Class", width: "110px" },
  { key: "dateReleased", label: "Date Released", width: "130px" },
  { key: "typeDocReleased", label: "Type Doc Released", width: "150px" },
  { key: "appStatus", label: "Status", width: "130px" },
  { key: "userUploader", label: "Uploaded By", width: "140px" },     // was uploadedBy
  { key: "uploadedAt", label: "Uploaded At", width: "140px" },
  { key: "dbTimelineCitizenCharter", label: "Timeline (Days)", width: "130px" },
  { key: "statusTimeline", label: "Status Timeline", width: "160px" },
];

export const COLUMN_DB_KEY_MAP = {
  dtn: "DB_DTN",
  estCat: "DB_EST_CAT",
  ltoCompany: "DB_EST_LTO_COMP",
  ltoAdd: "DB_EST_LTO_ADD",
  eadd: "DB_EST_EADD",
  tin: "DB_EST_TIN",
  contactNo: "DB_EST_CONTACT_NO",
  ltoNo: "DB_EST_LTO_NO",
  validity: "DB_EST_VALIDITY",
  prodBrName: "DB_PROD_BR_NAME",
  prodGenName: "DB_PROD_GEN_NAME",
  prodDosStr: "DB_PROD_DOS_STR",
  prodDosForm: "DB_PROD_DOS_FORM",
  prodClassPrescript: "DB_PROD_CLASS_PRESCRIP",
  prodEssDrugList: "DB_PROD_ESS_DRUG_LIST",
  prodPharmaCat: "DB_PROD_PHARMA_CAT",
  prodManu: "DB_PROD_MANU",
  prodManuAdd: "DB_PROD_MANU_ADD",
  prodManuCountry: "DB_PROD_MANU_COUNTRY",
  prodTrader: "DB_PROD_TRADER",
  prodTraderCountry: "DB_PROD_TRADER_COUNTRY",
  prodImporter: "DB_PROD_IMPORTER",
  prodImporterCountry: "DB_PROD_IMPORTER_COUNTRY",
  prodDistri: "DB_PROD_DISTRI",
  prodDistriCountry: "DB_PROD_DISTRI_COUNTRY",
  prodDistriShelfLife: "DB_PROD_DISTRI_SHELF_LIFE",
  packaging: "DB_PACKAGING",
  expiryDate: "DB_EXPIRY_DATE",
  regNo: "DB_REG_NO",
  appType: "DB_APP_TYPE",
  motherAppType: "DB_MOTHER_APP_TYPE",
  oldRsn: "DB_OLD_RSN",
  prodCat: "DB_PROD_CAT",
  fee: "DB_FEE",
  total: "DB_TOTAL",
  orNo: "DB_OR_NO",
  dateIssued: "DB_DATE_ISSUED",
  dateReceivedFdac: "DB_DATE_RECEIVED_FDAC",
  dateReceivedCent: "DB_DATE_RECEIVED_CENT",
  mo: "DB_MO",
  deckingSched: "DB_DECKING_SCHED",
  eval: "DB_EVAL",
  dateDeck: "DB_DATE_DECK",
  remarks1: "DB_REMARKS_1",
  dateRemarks: "DB_DATE_REMARKS",
  class: "DB_CLASS",
  dateReleased: "DB_DATE_RELEASED",
  typeDocReleased: "DB_TYPE_DOC_RELEASED",
  appStatus: "DB_APP_STATUS",
  userUploader: "DB_USER_UPLOADER",
  uploadedAt: "DB_DATE_EXCEL_UPLOAD",
  dbTimelineCitizenCharter: "DB_TIMELINE_CITIZEN_CHARTER",
};