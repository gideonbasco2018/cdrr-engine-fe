// FILE: src/components/reports/actions/EditRecordModal.jsx
// ✅ COMPLETE FIX: All 90+ fields properly mapped and editable

import { useState, useEffect } from "react";

// ✅ Helper functions for data cleaning
const cleanValue = (value) => {
  if (value === null || value === undefined || value === "N/A") {
    return "";
  }
  return String(value);
};

const cleanDateValue = (value) => {
  if (!value || value === "N/A" || value === null) {
    return "";
  }
  // Convert to YYYY-MM-DD format
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return "";
    }
    return date.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

const cleanNumberValue = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === "N/A" ||
    value === ""
  ) {
    return "";
  }
  return String(value);
};

function EditRecordModal({
  record,
  onClose,
  onSuccess,
  colors,
  darkMode,
  updateUploadReport,
}) {
  const [formData, setFormData] = useState({
    // ============================================
    // ESTABLISHMENT INFORMATION (8 fields)
    // ============================================
    DB_EST_CAT: "",
    DB_EST_LTO_COMP: "",
    DB_EST_LTO_ADD: "",
    DB_EST_EADD: "",
    DB_EST_TIN: "",
    DB_EST_CONTACT_NO: "",
    DB_EST_LTO_NO: "",
    DB_EST_VALIDITY: "",

    // ============================================
    // PRODUCT INFORMATION (7 fields)
    // ============================================
    DB_PROD_BR_NAME: "",
    DB_PROD_GEN_NAME: "",
    DB_PROD_DOS_STR: "",
    DB_PROD_DOS_FORM: "",
    DB_PROD_CLASS_PRESCRIP: "",
    DB_PROD_ESS_DRUG_LIST: "",
    DB_PROD_PHARMA_CAT: "",

    // ============================================
    // MANUFACTURER INFORMATION (5 fields)
    // ============================================
    DB_PROD_MANU: "",
    DB_PROD_MANU_ADD: "",
    DB_PROD_MANU_TIN: "",
    DB_PROD_MANU_LTO_NO: "",
    DB_PROD_MANU_COUNTRY: "",

    // ============================================
    // TRADER INFORMATION (5 fields)
    // ============================================
    DB_PROD_TRADER: "",
    DB_PROD_TRADER_ADD: "",
    DB_PROD_TRADER_TIN: "",
    DB_PROD_TRADER_LTO_NO: "",
    DB_PROD_TRADER_COUNTRY: "",

    // ============================================
    // REPACKER INFORMATION (5 fields)
    // ============================================
    DB_PROD_REPACKER: "",
    DB_PROD_REPACKER_ADD: "",
    DB_PROD_REPACKER_TIN: "",
    DB_PROD_REPACKER_LTO_NO: "",
    DB_PROD_REPACKER_COUNTRY: "",

    // ============================================
    // IMPORTER INFORMATION (5 fields)
    // ============================================
    DB_PROD_IMPORTER: "",
    DB_PROD_IMPORTER_ADD: "",
    DB_PROD_IMPORTER_TIN: "",
    DB_PROD_IMPORTER_LTO_NO: "",
    DB_PROD_IMPORTER_COUNTRY: "",

    // ============================================
    // DISTRIBUTOR INFORMATION (6 fields)
    // ============================================
    DB_PROD_DISTRI: "",
    DB_PROD_DISTRI_ADD: "",
    DB_PROD_DISTRI_TIN: "",
    DB_PROD_DISTRI_LTO_NO: "",
    DB_PROD_DISTRI_COUNTRY: "",
    DB_PROD_DISTRI_SHELF_LIFE: "",

    // ============================================
    // STORAGE & PACKAGING (4 fields)
    // ============================================
    DB_STORAGE_COND: "",
    DB_PACKAGING: "",
    DB_SUGG_RP: "",
    DB_NO_SAMPLE: "",

    // ============================================
    // APPLICATION INFORMATION (8 fields)
    // ============================================
    DB_DTN: "",
    DB_REG_NO: "",
    DB_APP_TYPE: "",
    DB_MOTHER_APP_TYPE: "",
    DB_OLD_RSN: "",
    DB_PROD_CAT: "",
    DB_CERTIFICATION: "",
    DB_CLASS: "",

    // ============================================
    // AMENDMENT FIELDS (3 fields)
    // ============================================
    DB_AMMEND_1: "",
    DB_AMMEND_2: "",
    DB_AMMEND_3: "",

    // ============================================
    // FEES (5 fields)
    // ============================================
    DB_FEE: "",
    DB_LRF: "",
    DB_SURC: "",
    DB_TOTAL: "",
    DB_OR_NO: "",

    // ============================================
    // IMPORTANT DATES (7 fields)
    // ============================================
    DB_DATE_ISSUED: "",
    DB_DATE_RECEIVED_FDAC: "",
    DB_DATE_RECEIVED_CENT: "",
    DB_DATE_DECK: "",
    DB_DATE_RELEASED: "",
    DB_EXPIRY_DATE: "",
    DB_CPR_VALIDITY: "",

    // ============================================
    // OFFICE/FILE INFORMATION (2 fields)
    // ============================================
    DB_MO: "",
    DB_FILE: "",

    // ============================================
    // SECPA INFORMATION (3 fields)
    // ============================================
    DB_SECPA: "",
    DB_SECPA_EXP_DATE: "",
    DB_SECPA_ISSUED_ON: "",

    // ============================================
    // DECKING INFORMATION (2 fields)
    // ============================================
    DB_DECKING_SCHED: "",
    DB_EVAL: "",

    // ============================================
    // RELEASE INFORMATION (3 fields)
    // ============================================
    DB_TYPE_DOC_RELEASED: "",
    DB_ATTA_RELEASED: "",
    DB_DATE_REMARKS: "",

    // ============================================
    // CPR CONDITION (3 fields)
    // ============================================
    DB_CPR_COND: "",
    DB_CPR_COND_REMARKS: "",
    DB_CPR_COND_ADD_REMARKS: "",

    // ============================================
    // STATUS & REMARKS (3 fields)
    // ============================================
    DB_APP_STATUS: "",
    DB_APP_REMARKS: "",
    DB_REMARKS_1: "",

    // ============================================
    // TIMELINE FIELDS (2 fields - READ ONLY)
    // ============================================
    DB_TIMELINE_CITIZEN_CHARTER: "",
    DB_STATUS_TIMELINE: "",

    // ============================================
    // UPLOAD METADATA (2 fields - READ ONLY)
    // ============================================
    DB_USER_UPLOADER: "",
    DB_DATE_EXCEL_UPLOAD: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Complete field mapping from record to formData
  useEffect(() => {
    if (record) {
      console.log("📋 Record data received:", record);

      setFormData({
        // ESTABLISHMENT
        DB_EST_CAT: cleanValue(
          record.estCat || record.category || record.DB_EST_CAT,
        ),
        DB_EST_LTO_COMP: cleanValue(
          record.ltoComp || record.ltoCompany || record.DB_EST_LTO_COMP,
        ),
        DB_EST_LTO_ADD: cleanValue(
          record.ltoAdd || record.ltoAddress || record.DB_EST_LTO_ADD,
        ),
        DB_EST_EADD: cleanValue(
          record.eadd || record.email || record.DB_EST_EADD,
        ),
        DB_EST_TIN: cleanValue(record.tin || record.DB_EST_TIN),
        DB_EST_CONTACT_NO: cleanValue(
          record.contactNo || record.DB_EST_CONTACT_NO,
        ),
        DB_EST_LTO_NO: cleanValue(record.ltoNo || record.DB_EST_LTO_NO),
        DB_EST_VALIDITY: cleanDateValue(
          record.validity || record.DB_EST_VALIDITY,
        ),

        // PRODUCT
        DB_PROD_BR_NAME: cleanValue(
          record.prodBrName || record.brandName || record.DB_PROD_BR_NAME,
        ),
        DB_PROD_GEN_NAME: cleanValue(
          record.prodGenName || record.genericName || record.DB_PROD_GEN_NAME,
        ),
        DB_PROD_DOS_STR: cleanValue(
          record.prodDosStr || record.dosageStrength || record.DB_PROD_DOS_STR,
        ),
        DB_PROD_DOS_FORM: cleanValue(
          record.prodDosForm || record.dosageForm || record.DB_PROD_DOS_FORM,
        ),
        DB_PROD_CLASS_PRESCRIP: cleanValue(
          record.prodClassPrescript ||
            record.prescription ||
            record.DB_PROD_CLASS_PRESCRIP,
        ),
        DB_PROD_ESS_DRUG_LIST: cleanValue(
          record.prodEssDrugList ||
            record.essentialDrug ||
            record.DB_PROD_ESS_DRUG_LIST,
        ),
        DB_PROD_PHARMA_CAT: cleanValue(
          record.prodPharmaCat ||
            record.pharmaCategory ||
            record.DB_PROD_PHARMA_CAT,
        ),

        // MANUFACTURER
        DB_PROD_MANU: cleanValue(
          record.prodManu || record.manufacturer || record.DB_PROD_MANU,
        ),
        DB_PROD_MANU_ADD: cleanValue(
          record.prodManuAdd ||
            record.manufacturerAddress ||
            record.DB_PROD_MANU_ADD,
        ),
        DB_PROD_MANU_TIN: cleanValue(
          record.prodManuTin ||
            record.manufacturerTin ||
            record.DB_PROD_MANU_TIN,
        ),
        DB_PROD_MANU_LTO_NO: cleanValue(
          record.prodManuLtoNo ||
            record.manufacturerLtoNo ||
            record.DB_PROD_MANU_LTO_NO,
        ),
        DB_PROD_MANU_COUNTRY: cleanValue(
          record.prodManuCountry ||
            record.manufacturerCountry ||
            record.DB_PROD_MANU_COUNTRY,
        ),

        // TRADER
        DB_PROD_TRADER: cleanValue(record.prodTrader || record.DB_PROD_TRADER),
        DB_PROD_TRADER_ADD: cleanValue(
          record.prodTraderAdd || record.DB_PROD_TRADER_ADD,
        ),
        DB_PROD_TRADER_TIN: cleanValue(
          record.prodTraderTin || record.DB_PROD_TRADER_TIN,
        ),
        DB_PROD_TRADER_LTO_NO: cleanValue(
          record.prodTraderLtoNo || record.DB_PROD_TRADER_LTO_NO,
        ),
        DB_PROD_TRADER_COUNTRY: cleanValue(
          record.prodTraderCountry || record.DB_PROD_TRADER_COUNTRY,
        ),

        // REPACKER
        DB_PROD_REPACKER: cleanValue(
          record.prodRepacker || record.DB_PROD_REPACKER,
        ),
        DB_PROD_REPACKER_ADD: cleanValue(
          record.prodRepackerAdd || record.DB_PROD_REPACKER_ADD,
        ),
        DB_PROD_REPACKER_TIN: cleanValue(
          record.prodRepackerTin || record.DB_PROD_REPACKER_TIN,
        ),
        DB_PROD_REPACKER_LTO_NO: cleanValue(
          record.prodRepackerLtoNo || record.DB_PROD_REPACKER_LTO_NO,
        ),
        DB_PROD_REPACKER_COUNTRY: cleanValue(
          record.prodRepackerCountry || record.DB_PROD_REPACKER_COUNTRY,
        ),

        // IMPORTER
        DB_PROD_IMPORTER: cleanValue(
          record.prodImporter || record.DB_PROD_IMPORTER,
        ),
        DB_PROD_IMPORTER_ADD: cleanValue(
          record.prodImporterAdd || record.DB_PROD_IMPORTER_ADD,
        ),
        DB_PROD_IMPORTER_TIN: cleanValue(
          record.prodImporterTin || record.DB_PROD_IMPORTER_TIN,
        ),
        DB_PROD_IMPORTER_LTO_NO: cleanValue(
          record.prodImporterLtoNo || record.DB_PROD_IMPORTER_LTO_NO,
        ),
        DB_PROD_IMPORTER_COUNTRY: cleanValue(
          record.prodImporterCountry || record.DB_PROD_IMPORTER_COUNTRY,
        ),

        // DISTRIBUTOR
        DB_PROD_DISTRI: cleanValue(record.prodDistri || record.DB_PROD_DISTRI),
        DB_PROD_DISTRI_ADD: cleanValue(
          record.prodDistriAdd || record.DB_PROD_DISTRI_ADD,
        ),
        DB_PROD_DISTRI_TIN: cleanValue(
          record.prodDistriTin || record.DB_PROD_DISTRI_TIN,
        ),
        DB_PROD_DISTRI_LTO_NO: cleanValue(
          record.prodDistriLtoNo || record.DB_PROD_DISTRI_LTO_NO,
        ),
        DB_PROD_DISTRI_COUNTRY: cleanValue(
          record.prodDistriCountry || record.DB_PROD_DISTRI_COUNTRY,
        ),
        DB_PROD_DISTRI_SHELF_LIFE: cleanValue(
          record.prodDistriShelfLife || record.DB_PROD_DISTRI_SHELF_LIFE,
        ),

        // STORAGE & PACKAGING
        DB_STORAGE_COND: cleanValue(
          record.storageCond || record.DB_STORAGE_COND,
        ),
        DB_PACKAGING: cleanValue(record.packaging || record.DB_PACKAGING),
        DB_SUGG_RP: cleanValue(record.suggRp || record.DB_SUGG_RP),
        DB_NO_SAMPLE: cleanValue(record.noSample || record.DB_NO_SAMPLE),

        // APPLICATION
        DB_DTN: cleanNumberValue(record.dtn || record.DB_DTN),
        DB_REG_NO: cleanValue(
          record.regNo || record.registrationNo || record.DB_REG_NO,
        ),
        DB_APP_TYPE: cleanValue(record.appType || record.DB_APP_TYPE),
        DB_MOTHER_APP_TYPE: cleanValue(
          record.motherAppType || record.DB_MOTHER_APP_TYPE,
        ),
        DB_OLD_RSN: cleanValue(record.oldRsn || record.DB_OLD_RSN),
        DB_PROD_CAT: cleanValue(record.prodCat || record.DB_PROD_CAT),
        DB_CERTIFICATION: cleanValue(
          record.certification || record.DB_CERTIFICATION,
        ),
        DB_CLASS: cleanValue(record.class || record.dbClass || record.DB_CLASS),

        // AMENDMENTS
        DB_AMMEND_1: cleanValue(record.ammend1 || record.DB_AMMEND_1),
        DB_AMMEND_2: cleanValue(record.ammend2 || record.DB_AMMEND_2),
        DB_AMMEND_3: cleanValue(record.ammend3 || record.DB_AMMEND_3),

        // FEES
        DB_FEE: cleanNumberValue(record.fee || record.DB_FEE),
        DB_LRF: cleanNumberValue(record.lrf || record.DB_LRF),
        DB_SURC: cleanNumberValue(record.surc || record.DB_SURC),
        DB_TOTAL: cleanNumberValue(record.total || record.DB_TOTAL),
        DB_OR_NO: cleanValue(record.orNo || record.DB_OR_NO),

        // DATES
        DB_DATE_ISSUED: cleanDateValue(
          record.dateIssued || record.DB_DATE_ISSUED,
        ),
        DB_DATE_RECEIVED_FDAC: cleanDateValue(
          record.dateReceivedFdac || record.DB_DATE_RECEIVED_FDAC,
        ),
        DB_DATE_RECEIVED_CENT: cleanDateValue(
          record.dateReceivedCent || record.DB_DATE_RECEIVED_CENT,
        ),
        DB_DATE_DECK: cleanDateValue(record.dateDeck || record.DB_DATE_DECK),
        DB_DATE_RELEASED: cleanDateValue(
          record.dateReleased || record.DB_DATE_RELEASED,
        ),
        DB_EXPIRY_DATE: cleanDateValue(
          record.expiryDate || record.DB_EXPIRY_DATE,
        ),
        DB_CPR_VALIDITY: cleanDateValue(
          record.cprValidity || record.DB_CPR_VALIDITY,
        ),

        // OFFICE/FILE
        DB_MO: cleanValue(record.mo || record.DB_MO),
        DB_FILE: cleanValue(record.file || record.DB_FILE),

        // SECPA
        DB_SECPA: cleanValue(record.secpa || record.DB_SECPA),
        DB_SECPA_EXP_DATE: cleanDateValue(
          record.secpaExpDate || record.DB_SECPA_EXP_DATE,
        ),
        DB_SECPA_ISSUED_ON: cleanDateValue(
          record.secpaIssuedOn || record.DB_SECPA_ISSUED_ON,
        ),

        // DECKING
        DB_DECKING_SCHED: cleanDateValue(
          record.deckingSched || record.DB_DECKING_SCHED,
        ),
        DB_EVAL: cleanValue(record.eval || record.evaluator || record.DB_EVAL),

        // RELEASE
        DB_TYPE_DOC_RELEASED: cleanValue(
          record.typeDocReleased || record.DB_TYPE_DOC_RELEASED,
        ),
        DB_ATTA_RELEASED: cleanValue(
          record.attaReleased || record.DB_ATTA_RELEASED,
        ),
        DB_DATE_REMARKS: cleanDateValue(
          record.dateRemarks || record.DB_DATE_REMARKS,
        ),

        // CPR CONDITION
        DB_CPR_COND: cleanValue(record.cprCond || record.DB_CPR_COND),
        DB_CPR_COND_REMARKS: cleanValue(
          record.cprCondRemarks || record.DB_CPR_COND_REMARKS,
        ),
        DB_CPR_COND_ADD_REMARKS: cleanValue(
          record.cprCondAddRemarks || record.DB_CPR_COND_ADD_REMARKS,
        ),

        // STATUS & REMARKS
        DB_APP_STATUS: cleanValue(record.appStatus || record.DB_APP_STATUS),
        DB_APP_REMARKS: cleanValue(record.appRemarks || record.DB_APP_REMARKS),
        DB_REMARKS_1: cleanValue(record.remarks1 || record.DB_REMARKS_1),

        // TIMELINE (READ ONLY)
        DB_TIMELINE_CITIZEN_CHARTER: cleanNumberValue(
          record.dbTimelineCitizenCharter || record.DB_TIMELINE_CITIZEN_CHARTER,
        ),
        DB_STATUS_TIMELINE: cleanValue(
          record.statusTimeline || record.DB_STATUS_TIMELINE,
        ),

        // UPLOAD METADATA (READ ONLY)
        DB_USER_UPLOADER: cleanValue(
          record.userUploader || record.DB_USER_UPLOADER,
        ),
        DB_DATE_EXCEL_UPLOAD: cleanDateValue(
          record.dateExcelUpload || record.DB_DATE_EXCEL_UPLOAD,
        ),
      });

      console.log("✅ Form data initialized with all fields");
    }
  }, [record]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      console.log("📤 Submitting update for record ID:", record.id);
      console.log("📦 Update data:", formData);

      await updateUploadReport(record.id, formData);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("❌ Failed to update record:", err);
      setError(err.message || "Failed to update record");
    } finally {
      setSaving(false);
    }
  };

  if (!record) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "2rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "16px",
          maxWidth: "1400px",
          width: "100%",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.5rem 2rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                color: colors.textPrimary,
                margin: 0,
                marginBottom: "0.25rem",
              }}
            >
              ✏️ Edit Record - Complete Details
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: colors.textTertiary,
                margin: 0,
              }}
            >
              ID: {record.id} • DTN: {formData.DB_DTN || "N/A"} • Brand:{" "}
              {formData.DB_PROD_BR_NAME || "N/A"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              color: colors.textSecondary,
              cursor: "pointer",
              padding: "0.5rem",
              borderRadius: "8px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = darkMode
                ? "#1f1f1f"
                : "#f0f0f0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "2rem",
          }}
        >
          {error && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "8px",
                padding: "1rem",
                marginBottom: "1.5rem",
                color: "#EF4444",
                fontSize: "0.875rem",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Establishment Information */}
          <Section title="🏢 Establishment Information" colors={colors}>
            <FieldGrid>
              <FormField
                label="Category"
                value={formData.DB_EST_CAT}
                onChange={(val) => handleChange("DB_EST_CAT", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="LTO Company"
                value={formData.DB_EST_LTO_COMP}
                onChange={(val) => handleChange("DB_EST_LTO_COMP", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="LTO Address"
                value={formData.DB_EST_LTO_ADD}
                onChange={(val) => handleChange("DB_EST_LTO_ADD", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Email"
                value={formData.DB_EST_EADD}
                onChange={(val) => handleChange("DB_EST_EADD", val)}
                type="email"
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="TIN"
                value={formData.DB_EST_TIN}
                onChange={(val) => handleChange("DB_EST_TIN", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Contact No."
                value={formData.DB_EST_CONTACT_NO}
                onChange={(val) => handleChange("DB_EST_CONTACT_NO", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="LTO No."
                value={formData.DB_EST_LTO_NO}
                onChange={(val) => handleChange("DB_EST_LTO_NO", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Validity"
                value={formData.DB_EST_VALIDITY}
                onChange={(val) => handleChange("DB_EST_VALIDITY", val)}
                type="date"
                colors={colors}
                darkMode={darkMode}
              />
            </FieldGrid>
          </Section>

          {/* Product Information */}
          <Section title="💊 Product Information" colors={colors}>
            <FieldGrid>
              <FormField
                label="Brand Name"
                value={formData.DB_PROD_BR_NAME}
                onChange={(val) => handleChange("DB_PROD_BR_NAME", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Generic Name"
                value={formData.DB_PROD_GEN_NAME}
                onChange={(val) => handleChange("DB_PROD_GEN_NAME", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Dosage Strength"
                value={formData.DB_PROD_DOS_STR}
                onChange={(val) => handleChange("DB_PROD_DOS_STR", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Dosage Form"
                value={formData.DB_PROD_DOS_FORM}
                onChange={(val) => handleChange("DB_PROD_DOS_FORM", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Prescription"
                value={formData.DB_PROD_CLASS_PRESCRIP}
                onChange={(val) => handleChange("DB_PROD_CLASS_PRESCRIP", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Essential Drug"
                value={formData.DB_PROD_ESS_DRUG_LIST}
                onChange={(val) => handleChange("DB_PROD_ESS_DRUG_LIST", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Pharma Category"
                value={formData.DB_PROD_PHARMA_CAT}
                onChange={(val) => handleChange("DB_PROD_PHARMA_CAT", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Product Category"
                value={formData.DB_PROD_CAT}
                onChange={(val) => handleChange("DB_PROD_CAT", val)}
                colors={colors}
                darkMode={darkMode}
              />
            </FieldGrid>
          </Section>

          {/* Manufacturer Information */}
          <Section title="🏭 Manufacturer Information" colors={colors}>
            <FieldGrid>
              <FormField
                label="Manufacturer"
                value={formData.DB_PROD_MANU}
                onChange={(val) => handleChange("DB_PROD_MANU", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Manufacturer Address"
                value={formData.DB_PROD_MANU_ADD}
                onChange={(val) => handleChange("DB_PROD_MANU_ADD", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Manufacturer TIN"
                value={formData.DB_PROD_MANU_TIN}
                onChange={(val) => handleChange("DB_PROD_MANU_TIN", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Manufacturer LTO No."
                value={formData.DB_PROD_MANU_LTO_NO}
                onChange={(val) => handleChange("DB_PROD_MANU_LTO_NO", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Manufacturer Country"
                value={formData.DB_PROD_MANU_COUNTRY}
                onChange={(val) => handleChange("DB_PROD_MANU_COUNTRY", val)}
                colors={colors}
                darkMode={darkMode}
              />
            </FieldGrid>
          </Section>

          {/* Trader Information */}
          <Section title="🚢 Trader Information" colors={colors}>
            <FieldGrid>
              <FormField
                label="Trader"
                value={formData.DB_PROD_TRADER}
                onChange={(val) => handleChange("DB_PROD_TRADER", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Trader Address"
                value={formData.DB_PROD_TRADER_ADD}
                onChange={(val) => handleChange("DB_PROD_TRADER_ADD", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Trader TIN"
                value={formData.DB_PROD_TRADER_TIN}
                onChange={(val) => handleChange("DB_PROD_TRADER_TIN", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Trader LTO No."
                value={formData.DB_PROD_TRADER_LTO_NO}
                onChange={(val) => handleChange("DB_PROD_TRADER_LTO_NO", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Trader Country"
                value={formData.DB_PROD_TRADER_COUNTRY}
                onChange={(val) => handleChange("DB_PROD_TRADER_COUNTRY", val)}
                colors={colors}
                darkMode={darkMode}
              />
            </FieldGrid>
          </Section>

          {/* Repacker Information */}
          <Section title="📦 Repacker Information" colors={colors}>
            <FieldGrid>
              <FormField
                label="Repacker"
                value={formData.DB_PROD_REPACKER}
                onChange={(val) => handleChange("DB_PROD_REPACKER", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Repacker Address"
                value={formData.DB_PROD_REPACKER_ADD}
                onChange={(val) => handleChange("DB_PROD_REPACKER_ADD", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Repacker TIN"
                value={formData.DB_PROD_REPACKER_TIN}
                onChange={(val) => handleChange("DB_PROD_REPACKER_TIN", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Repacker LTO No."
                value={formData.DB_PROD_REPACKER_LTO_NO}
                onChange={(val) => handleChange("DB_PROD_REPACKER_LTO_NO", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Repacker Country"
                value={formData.DB_PROD_REPACKER_COUNTRY}
                onChange={(val) =>
                  handleChange("DB_PROD_REPACKER_COUNTRY", val)
                }
                colors={colors}
                darkMode={darkMode}
              />
            </FieldGrid>
          </Section>

          {/* Importer Information */}
          <Section title="✈️ Importer Information" colors={colors}>
            <FieldGrid>
              <FormField
                label="Importer"
                value={formData.DB_PROD_IMPORTER}
                onChange={(val) => handleChange("DB_PROD_IMPORTER", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Importer Address"
                value={formData.DB_PROD_IMPORTER_ADD}
                onChange={(val) => handleChange("DB_PROD_IMPORTER_ADD", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Importer TIN"
                value={formData.DB_PROD_IMPORTER_TIN}
                onChange={(val) => handleChange("DB_PROD_IMPORTER_TIN", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Importer LTO No."
                value={formData.DB_PROD_IMPORTER_LTO_NO}
                onChange={(val) => handleChange("DB_PROD_IMPORTER_LTO_NO", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Importer Country"
                value={formData.DB_PROD_IMPORTER_COUNTRY}
                onChange={(val) =>
                  handleChange("DB_PROD_IMPORTER_COUNTRY", val)
                }
                colors={colors}
                darkMode={darkMode}
              />
            </FieldGrid>
          </Section>

          {/* Distributor Information */}
          <Section title="🚚 Distributor Information" colors={colors}>
            <FieldGrid>
              <FormField
                label="Distributor"
                value={formData.DB_PROD_DISTRI}
                onChange={(val) => handleChange("DB_PROD_DISTRI", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Distributor Address"
                value={formData.DB_PROD_DISTRI_ADD}
                onChange={(val) => handleChange("DB_PROD_DISTRI_ADD", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Distributor TIN"
                value={formData.DB_PROD_DISTRI_TIN}
                onChange={(val) => handleChange("DB_PROD_DISTRI_TIN", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Distributor LTO No."
                value={formData.DB_PROD_DISTRI_LTO_NO}
                onChange={(val) => handleChange("DB_PROD_DISTRI_LTO_NO", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Distributor Country"
                value={formData.DB_PROD_DISTRI_COUNTRY}
                onChange={(val) => handleChange("DB_PROD_DISTRI_COUNTRY", val)}
                colors={colors}
                darkMode={darkMode}
              />
            </FieldGrid>
          </Section>

          {/* Storage & Packaging */}
          <Section title="📦 Storage & Packaging" colors={colors}>
            <FieldGrid>
              <FormField
                label="Shelf Life"
                value={formData.DB_PROD_DISTRI_SHELF_LIFE}
                onChange={(val) =>
                  handleChange("DB_PROD_DISTRI_SHELF_LIFE", val)
                }
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Storage Condition"
                value={formData.DB_STORAGE_COND}
                onChange={(val) => handleChange("DB_STORAGE_COND", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Packaging"
                value={formData.DB_PACKAGING}
                onChange={(val) => handleChange("DB_PACKAGING", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Suggested RP"
                value={formData.DB_SUGG_RP}
                onChange={(val) => handleChange("DB_SUGG_RP", val)}
                type="number"
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="No. of Samples"
                value={formData.DB_NO_SAMPLE}
                onChange={(val) => handleChange("DB_NO_SAMPLE", val)}
                type="number"
                colors={colors}
                darkMode={darkMode}
              />
            </FieldGrid>
          </Section>

          {/* Application Information */}
          <Section title="📋 Application Information" colors={colors}>
            <FieldGrid>
              <FormField
                label="DTN"
                value={formData.DB_DTN}
                onChange={(val) => handleChange("DB_DTN", val)}
                type="number"
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Registration No."
                value={formData.DB_REG_NO}
                onChange={(val) => handleChange("DB_REG_NO", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Application Type"
                value={formData.DB_APP_TYPE}
                onChange={(val) => handleChange("DB_APP_TYPE", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Mother App Type"
                value={formData.DB_MOTHER_APP_TYPE}
                onChange={(val) => handleChange("DB_MOTHER_APP_TYPE", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Old RSN"
                value={formData.DB_OLD_RSN}
                onChange={(val) => handleChange("DB_OLD_RSN", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Certification"
                value={formData.DB_CERTIFICATION}
                onChange={(val) => handleChange("DB_CERTIFICATION", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Class"
                value={formData.DB_CLASS}
                onChange={(val) => handleChange("DB_CLASS", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Application Status"
                value={formData.DB_APP_STATUS}
                onChange={(val) => handleChange("DB_APP_STATUS", val)}
                colors={colors}
                darkMode={darkMode}
              />
            </FieldGrid>
          </Section>

          {/* Amendment Fields */}
          <Section title="📝 Amendments" colors={colors}>
            <FieldGrid>
              <FormField
                label="Amendment 1"
                value={formData.DB_AMMEND_1}
                onChange={(val) => handleChange("DB_AMMEND_1", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Amendment 2"
                value={formData.DB_AMMEND_2}
                onChange={(val) => handleChange("DB_AMMEND_2", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Amendment 3"
                value={formData.DB_AMMEND_3}
                onChange={(val) => handleChange("DB_AMMEND_3", val)}
                colors={colors}
                darkMode={darkMode}
              />
            </FieldGrid>
          </Section>

          {/* Fees */}
          <Section title="💰 Fees" colors={colors}>
            <FieldGrid>
              <FormField
                label="Fee"
                value={formData.DB_FEE}
                onChange={(val) => handleChange("DB_FEE", val)}
                type="number"
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="LRF"
                value={formData.DB_LRF}
                onChange={(val) => handleChange("DB_LRF", val)}
                type="number"
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="SURC"
                value={formData.DB_SURC}
                onChange={(val) => handleChange("DB_SURC", val)}
                type="number"
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Total"
                value={formData.DB_TOTAL}
                onChange={(val) => handleChange("DB_TOTAL", val)}
                type="number"
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="OR No."
                value={formData.DB_OR_NO}
                onChange={(val) => handleChange("DB_OR_NO", val)}
                colors={colors}
                darkMode={darkMode}
              />
            </FieldGrid>
          </Section>

          {/* Important Dates */}
          <Section title="📅 Important Dates" colors={colors}>
            <FieldGrid>
              <FormField
                label="Date Issued"
                value={formData.DB_DATE_ISSUED}
                onChange={(val) => handleChange("DB_DATE_ISSUED", val)}
                type="date"
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Date Received FDAC"
                value={formData.DB_DATE_RECEIVED_FDAC}
                onChange={(val) => handleChange("DB_DATE_RECEIVED_FDAC", val)}
                type="date"
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Date Received Central"
                value={formData.DB_DATE_RECEIVED_CENT}
                onChange={(val) => handleChange("DB_DATE_RECEIVED_CENT", val)}
                type="date"
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Date Deck"
                value={formData.DB_DATE_DECK}
                onChange={(val) => handleChange("DB_DATE_DECK", val)}
                type="date"
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Date Released"
                value={formData.DB_DATE_RELEASED}
                onChange={(val) => handleChange("DB_DATE_RELEASED", val)}
                type="date"
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Expiry Date"
                value={formData.DB_EXPIRY_DATE}
                onChange={(val) => handleChange("DB_EXPIRY_DATE", val)}
                type="date"
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="CPR Validity"
                value={formData.DB_CPR_VALIDITY}
                onChange={(val) => handleChange("DB_CPR_VALIDITY", val)}
                type="date"
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Date Remarks"
                value={formData.DB_DATE_REMARKS}
                onChange={(val) => handleChange("DB_DATE_REMARKS", val)}
                type="date"
                colors={colors}
                darkMode={darkMode}
              />
            </FieldGrid>
          </Section>

          {/* Office/File Information */}
          <Section title="📁 Office/File Information" colors={colors}>
            <FieldGrid>
              <FormField
                label="MO"
                value={formData.DB_MO}
                onChange={(val) => handleChange("DB_MO", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="File"
                value={formData.DB_FILE}
                onChange={(val) => handleChange("DB_FILE", val)}
                colors={colors}
                darkMode={darkMode}
              />
            </FieldGrid>
          </Section>

          {/* SECPA Information */}
          <Section title="🔐 SECPA Information" colors={colors}>
            <FieldGrid>
              <FormField
                label="SECPA"
                value={formData.DB_SECPA}
                onChange={(val) => handleChange("DB_SECPA", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="SECPA Expiry Date"
                value={formData.DB_SECPA_EXP_DATE}
                onChange={(val) => handleChange("DB_SECPA_EXP_DATE", val)}
                type="date"
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="SECPA Issued On"
                value={formData.DB_SECPA_ISSUED_ON}
                onChange={(val) => handleChange("DB_SECPA_ISSUED_ON", val)}
                type="date"
                colors={colors}
                darkMode={darkMode}
              />
            </FieldGrid>
          </Section>

          {/* Decking Information */}
          <Section title="🎯 Decking Information" colors={colors}>
            <FieldGrid>
              <FormField
                label="Decking Schedule"
                value={formData.DB_DECKING_SCHED}
                onChange={(val) => handleChange("DB_DECKING_SCHED", val)}
                type="date"
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Evaluator"
                value={formData.DB_EVAL}
                onChange={(val) => handleChange("DB_EVAL", val)}
                colors={colors}
                darkMode={darkMode}
              />
            </FieldGrid>
          </Section>

          {/* Release Information */}
          <Section title="📤 Release Information" colors={colors}>
            <FieldGrid>
              <FormField
                label="Type Doc Released"
                value={formData.DB_TYPE_DOC_RELEASED}
                onChange={(val) => handleChange("DB_TYPE_DOC_RELEASED", val)}
                colors={colors}
                darkMode={darkMode}
              />
              <FormField
                label="Atta Released"
                value={formData.DB_ATTA_RELEASED}
                onChange={(val) => handleChange("DB_ATTA_RELEASED", val)}
                colors={colors}
                darkMode={darkMode}
              />
            </FieldGrid>
          </Section>

          {/* CPR Condition */}
          <Section title="📜 CPR Condition" colors={colors}>
            <FormField
              label="CPR Condition"
              value={formData.DB_CPR_COND}
              onChange={(val) => handleChange("DB_CPR_COND", val)}
              type="textarea"
              colors={colors}
              darkMode={darkMode}
            />
            <FormField
              label="CPR Condition Remarks"
              value={formData.DB_CPR_COND_REMARKS}
              onChange={(val) => handleChange("DB_CPR_COND_REMARKS", val)}
              type="textarea"
              colors={colors}
              darkMode={darkMode}
            />
            <FormField
              label="CPR Condition Additional Remarks"
              value={formData.DB_CPR_COND_ADD_REMARKS}
              onChange={(val) => handleChange("DB_CPR_COND_ADD_REMARKS", val)}
              type="textarea"
              colors={colors}
              darkMode={darkMode}
            />
          </Section>

          {/* Remarks & Notes */}
          <Section title="📝 Remarks & Notes" colors={colors}>
            <FormField
              label="Application Remarks"
              value={formData.DB_APP_REMARKS}
              onChange={(val) => handleChange("DB_APP_REMARKS", val)}
              type="textarea"
              colors={colors}
              darkMode={darkMode}
            />
            <FormField
              label="General Remarks"
              value={formData.DB_REMARKS_1}
              onChange={(val) => handleChange("DB_REMARKS_1", val)}
              type="textarea"
              colors={colors}
              darkMode={darkMode}
            />
          </Section>

          {/* Read-Only Metadata */}
          <Section title="📊 Metadata (Read-Only)" colors={colors}>
            <FieldGrid>
              <FormField
                label="Timeline (Days)"
                value={formData.DB_TIMELINE_CITIZEN_CHARTER}
                onChange={() => {}}
                colors={colors}
                darkMode={darkMode}
                readOnly
              />
              <FormField
                label="Status Timeline"
                value={formData.DB_STATUS_TIMELINE}
                onChange={() => {}}
                colors={colors}
                darkMode={darkMode}
                readOnly
              />
              <FormField
                label="Uploaded By"
                value={formData.DB_USER_UPLOADER}
                onChange={() => {}}
                colors={colors}
                darkMode={darkMode}
                readOnly
              />
              <FormField
                label="Upload Date"
                value={formData.DB_DATE_EXCEL_UPLOAD}
                onChange={() => {}}
                type="date"
                colors={colors}
                darkMode={darkMode}
                readOnly
              />
            </FieldGrid>
          </Section>
        </form>

        {/* Footer */}
        <div
          style={{
            padding: "1.5rem 2rem",
            borderTop: `1px solid ${colors.cardBorder}`,
            display: "flex",
            gap: "1rem",
            justifyContent: "flex-end",
            background: colors.cardBg,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "0.75rem 1.5rem",
              background: "transparent",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "8px",
              color: colors.textSecondary,
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: saving ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: "0.75rem 1.5rem",
              background: saving ? colors.cardBorder : "#2196F3",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: saving ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {saving ? "💾 Saving..." : "💾 Save All Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function Section({ title, children, colors }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <h3
        style={{
          fontSize: "1rem",
          fontWeight: "600",
          color: colors.textPrimary,
          marginBottom: "1rem",
          paddingBottom: "0.5rem",
          borderBottom: `2px solid ${colors.cardBorder}`,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function FieldGrid({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "1.5rem",
      }}
    >
      {children}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  colors,
  darkMode,
  readOnly = false,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <label
        style={{
          fontSize: "0.875rem",
          fontWeight: "500",
          color: readOnly ? colors.textTertiary : colors.textSecondary,
        }}
      >
        {label}{" "}
        {readOnly && <span style={{ fontSize: "0.75rem" }}>(Read-Only)</span>}
      </label>
      {type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          rows={3}
          style={{
            padding: "0.75rem",
            background: readOnly
              ? darkMode
                ? "#0f0f0f"
                : "#f5f5f5"
              : darkMode
                ? "#1a1a1a"
                : "#ffffff",
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "8px",
            color: colors.textPrimary,
            fontSize: "0.875rem",
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
            transition: "all 0.2s ease",
            cursor: readOnly ? "not-allowed" : "text",
          }}
          onFocus={(e) => {
            if (!readOnly) e.currentTarget.style.borderColor = "#2196F3";
          }}
          onBlur={(e) => {
            if (!readOnly)
              e.currentTarget.style.borderColor = colors.cardBorder;
          }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          style={{
            padding: "0.75rem",
            background: readOnly
              ? darkMode
                ? "#0f0f0f"
                : "#f5f5f5"
              : darkMode
                ? "#1a1a1a"
                : "#ffffff",
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "8px",
            color: colors.textPrimary,
            fontSize: "0.875rem",
            outline: "none",
            transition: "all 0.2s ease",
            cursor: readOnly ? "not-allowed" : "text",
          }}
          onFocus={(e) => {
            if (!readOnly) e.currentTarget.style.borderColor = "#2196F3";
          }}
          onBlur={(e) => {
            if (!readOnly)
              e.currentTarget.style.borderColor = colors.cardBorder;
          }}
        />
      )}
    </div>
  );
}

export default EditRecordModal;
