import { cleanValue, formatDate, calculateStatusTimeline } from "./utils";
import { FieldGrid } from "./shared/FieldGrid";
import { DisplayField } from "./shared/DisplayField";
import { VDSection } from "./shared/VDSection";
import { SummaryCard } from "./shared/SummaryCard";

const ENTITY_SECTIONS = [
  {
    title: "Manufacturer",
    keys: {
      name: "prodManu",
      country: "prodManuCountry",
      lto: "prodManuLtoNo",
      tin: "prodManuTin",
      add: "prodManuAdd",
    },
  },
  {
    title: "Trader",
    keys: {
      name: "prodTrader",
      country: "prodTraderCountry",
      lto: "prodTraderLtoNo",
      tin: "prodTraderTin",
      add: "prodTraderAdd",
    },
  },
  {
    title: "Importer",
    keys: {
      name: "prodImporter",
      country: "prodImporterCountry",
      lto: "prodImporterLtoNo",
      tin: "prodImporterTin",
      add: "prodImporterAdd",
    },
  },
  {
    title: "Distributor",
    keys: {
      name: "prodDistri",
      country: "prodDistriCountry",
      lto: "prodDistriLtoNo",
      tin: "prodDistriTin",
      add: "prodDistriAdd",
    },
  },
  {
    title: "Repacker",
    keys: {
      name: "prodRepacker",
      country: "prodRepackerCountry",
      lto: "prodRepackerLtoNo",
      tin: "prodRepackerTin",
      add: "prodRepackerAdd",
    },
  },
];

export function AllDetails({ record, darkMode, newDtn }) {
  const dm = darkMode;
  const { status, days } = calculateStatusTimeline(record);
  const ok = status === "WITHIN";

  const textPrimary = dm ? "#F0EDE8" : "#1C1A17";
  const textTertiary = dm ? "#5A5249" : "#9E9890";
  const cardBorder = dm ? "rgba(255,255,255,0.08)" : "#D6D1CB";
  const bannerBg = dm ? "rgba(33,150,243,0.06)" : "rgba(33,150,243,0.08)";
  const bannerBorder = dm ? "rgba(33,150,243,0.15)" : "rgba(33,150,243,0.2)";

  const df = (label, value, fullWidth) => (
    <DisplayField
      label={label}
      value={value}
      fullWidth={fullWidth}
      darkMode={dm}
    />
  );
  const sc = (label, value, accent, fullWidth) => (
    <SummaryCard
      label={label}
      value={value}
      accent={accent}
      fullWidth={fullWidth}
      darkMode={dm}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
      {/* Header banner */}

      {/* Header banner */}
      <div
        style={{
          padding: "0.6rem 0.75rem",
          background: `linear-gradient(135deg,${bannerBg},transparent)`,
          border: `1px solid ${bannerBorder}`,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        {/* Old DTN */}
        <div>
          <div
            style={{
              fontSize: "0.48rem",
              fontWeight: 700,
              color: textTertiary,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "0.05rem",
            }}
          >
            Old Document Tracking No.
          </div>
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: 800,
              color: textPrimary,
              letterSpacing: "-0.02em",
              textDecoration: "line-through",
              opacity: 0.6,
            }}
          >
            {cleanValue(record.dtn)}
          </div>
        </div>

        {/* Arrow */}
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="#2196F3"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>

        {/* New DTN */}
        <div>
          <div
            style={{
              fontSize: "0.48rem",
              fontWeight: 700,
              color: "#2196F3",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "0.05rem",
            }}
          >
            New Document Tracking No.
          </div>
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: 800,
              color: "#2196F3",
              letterSpacing: "-0.02em",
            }}
          >
            {newDtn || "—"}
          </div>
        </div>
      </div>
      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: "0.35rem",
        }}
      >
        {sc("Processing Type", cleanValue(record.processingType), "#005cd4")}
        {sc("Category", cleanValue(record.estCat), "#f59e0b")}
        {sc("Application Type", cleanValue(record.appType), "#ef4444")}
        {sc("LTO Company", cleanValue(record.ltoComp), "#22c55e", true)}
        {sc("LTO Address", cleanValue(record.ltoAdd), "#f97316", true)}
        {sc("Email", cleanValue(record.eadd), "#ec4899")}
        {sc("TIN", cleanValue(record.tin), "#a855f7")}
        {sc("Contact No.", cleanValue(record.contactNo), "#10b981")}
        {sc("LTO Number", cleanValue(record.ltoNo), "#7c3aed")}
        {sc("LTO Validity", formatDate(record.validity), "#607d8b")}
        {sc(
          "Date Received Central",
          formatDate(record.dateReceivedCent),
          "#607d8b",
        )}
        {sc(
          "Date Received FDAC",
          formatDate(record.dateReceivedFdac),
          "#0b5b83",
        )}
      </div>

      <VDSection title="Product Details" darkMode={dm}>
        <FieldGrid cols={3}>
          {df("Brand Name", cleanValue(record.prodBrName))}
          {df("Generic Name", cleanValue(record.prodGenName))}
          {df("Dosage Strength", cleanValue(record.prodDosStr))}
          {df("Dosage Form", cleanValue(record.prodDosForm))}
          {df("Classification", cleanValue(record.prodClassPrescript))}
          {df("Essential Drug", cleanValue(record.prodEssDrugList))}
          {df("Shelf Life", cleanValue(record.prodDistriShelfLife))}
          {df("Pharma Category", cleanValue(record.prodPharmaCat))}
          {df("Product Category", cleanValue(record.prodCat))}
          {df("File", cleanValue(record.file))}
          {df("Storage Condition", cleanValue(record.storageCond))}
          {df("Packaging", cleanValue(record.packaging))}
          {df("Expiry Date", formatDate(record.expiryDate))}
          {df("Suggested RP", cleanValue(record.suggRp))}
          {df("No. of Samples", cleanValue(record.noSample))}
        </FieldGrid>
      </VDSection>

      {ENTITY_SECTIONS.map(({ title, keys }) => (
        <VDSection key={title} title={title} darkMode={dm}>
          <FieldGrid cols={2}>
            {df("Name", cleanValue(record[keys.name]))}
            {df("Country", cleanValue(record[keys.country]))}
            {df("LTO No.", cleanValue(record[keys.lto]))}
            {df("TIN", cleanValue(record[keys.tin]))}
            {df("Address", cleanValue(record[keys.add]), true)}
          </FieldGrid>
        </VDSection>
      ))}

      <VDSection title="Application Information" darkMode={dm}>
        <FieldGrid cols={3}>
          {df("Registration No.", cleanValue(record.regNo))}
          {df("Mother App Type", cleanValue(record.motherAppType))}
          {df("Old RSN", cleanValue(record.oldRsn))}
          {df("Certification", cleanValue(record.certification))}
          {df("Class", cleanValue(record.class))}
          {df("MO", cleanValue(record.mo))}
        </FieldGrid>
      </VDSection>

      <VDSection title="Released Information" darkMode={dm}>
        <FieldGrid cols={3}>
          {df("Type of Document Released", cleanValue(record.typeDocReleased))}
          {df("Attachments Released", cleanValue(record.attaReleased))}
          {df("SECPA", cleanValue(record.secpa))}
          {df("Expiry", formatDate(record.secpaExpDate))}
          {df("Issued On", formatDate(record.secpaIssuedOn))}
          {df("Date Released by CDRR", formatDate(record.dateReleased))}
        </FieldGrid>
      </VDSection>

      <VDSection title="CPR Conditions" darkMode={dm}>
        {df("CPR Condition/s", cleanValue(record.cprCond), true)}
        {df("CPR Condition Remarks", cleanValue(record.cprCondRemarks), true)}
        {df("Additional Remarks", cleanValue(record.cprCondAddRemarks), true)}
      </VDSection>

      <VDSection title="Amendments and Remarks" darkMode={dm}>
        <FieldGrid cols={3}>
          {df("Amendment 1", cleanValue(record.ammend1))}
          {df("Amendment 2", cleanValue(record.ammend2))}
          {df("Amendment 3", cleanValue(record.ammend3))}
        </FieldGrid>
        <div
          style={{
            marginTop: "0.35rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          {df("Application Remarks", cleanValue(record.appRemarks), true)}
          {df("General Remarks", cleanValue(record.remarks1), true)}
        </div>
      </VDSection>
    </div>
  );
}
