// FILE: src/components/reports/actions/ViewDetailsModal.jsx
// ✅ COMPLETE REDESIGN: Same style as EditRecordModal with all 90+ fields

import { useState } from "react";

// ✅ Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString || dateString === "N/A" || dateString === null) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

// ✅ Helper function to clean display values
const cleanValue = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "N/A"
  ) {
    return "N/A";
  }
  return String(value);
};

function ViewDetailsModal({ record, onClose, colors, darkMode }) {
  // ✅ State for collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    establishment: true,
    product: true,
    manufacturer: false,
    trader: false,
    repacker: false,
    importer: false,
    distributor: false,
    storage: false,
    application: false,
    amendments: false,
    fees: false,
    dates: false,
    office: false,
    secpa: false,
    decking: false,
    workflow: true, // Workflow expanded by default
    release: false,
    cpr: false,
    remarks: false,
    metadata: false,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // ✅ Render APP STATUS badges
  const renderAppStatusBadge = (status) => {
    const statusUpper = status?.toUpperCase();

    if (statusUpper === "COMPLETED") {
      return (
        <span
          style={{
            padding: "0.4rem 0.9rem",
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: "700",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>✓</span>
          Completed
        </span>
      );
    } else if (statusUpper === "TO_DO") {
      return (
        <span
          style={{
            padding: "0.4rem 0.9rem",
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: "700",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>⏳</span>
          To Do
        </span>
      );
    } else if (statusUpper === "APPROVED") {
      return (
        <span
          style={{
            padding: "0.4rem 0.9rem",
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: "700",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>✅</span>
          Approved
        </span>
      );
    } else if (statusUpper === "PENDING") {
      return (
        <span
          style={{
            padding: "0.4rem 0.9rem",
            background: "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: "700",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            boxShadow: "0 2px 8px rgba(234, 179, 8, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>⏸</span>
          Pending
        </span>
      );
    } else if (statusUpper === "REJECTED") {
      return (
        <span
          style={{
            padding: "0.4rem 0.9rem",
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: "700",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>✗</span>
          Rejected
        </span>
      );
    }

    return (
      <span
        style={{
          padding: "0.4rem 0.9rem",
          background: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
          color: "#fff",
          borderRadius: "8px",
          fontSize: "0.75rem",
          fontWeight: "700",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          boxShadow: "0 2px 8px rgba(107, 114, 128, 0.3)",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <span style={{ fontSize: "0.9rem" }}>•</span>
        {status || "N/A"}
      </span>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.6)",
          zIndex: 1000,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1001,
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
                  marginBottom: "0.5rem",
                }}
              >
                👁️ View Record Details
              </h2>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <span
                  style={{
                    padding: "0.4rem 0.8rem",
                    background: "rgba(139, 92, 246, 0.1)",
                    border: "1px solid rgba(139, 92, 246, 0.3)",
                    color: "#8b5cf6",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                  }}
                >
                  🔖 DTN: {cleanValue(record.dtn)}
                </span>
                <span
                  style={{
                    padding: "0.4rem 0.8rem",
                    background: "rgba(6, 182, 212, 0.1)",
                    border: "1px solid rgba(6, 182, 212, 0.3)",
                    color: "#06b6d4",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                  }}
                >
                  💊 {cleanValue(record.prodGenName)}
                </span>
                {record.appStatus && (
                  <span
                    style={{
                      padding: "0.4rem 0.8rem",
                      background:
                        record.appStatus.toUpperCase() === "COMPLETED"
                          ? "rgba(16, 185, 129, 0.1)"
                          : "rgba(245, 158, 11, 0.1)",
                      border:
                        record.appStatus.toUpperCase() === "COMPLETED"
                          ? "1px solid rgba(16, 185, 129, 0.3)"
                          : "1px solid rgba(245, 158, 11, 0.3)",
                      color:
                        record.appStatus.toUpperCase() === "COMPLETED"
                          ? "#10b981"
                          : "#f59e0b",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                    }}
                  >
                    {record.appStatus}
                  </span>
                )}
              </div>
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

          {/* Content */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "2rem",
            }}
          >
            {/* ============================================ */}
            {/* WORKFLOW & DELEGATION */}
            {/* ============================================ */}
            <CollapsibleSection
              title="🎯 Workflow & Delegation"
              isExpanded={expandedSections.workflow}
              onToggle={() => toggleSection("workflow")}
              colors={colors}
              darkMode={darkMode}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "1.5rem",
                }}
              >
                {/* Decker */}
                <WorkflowCard
                  title="Decker"
                  colors={colors}
                  darkMode={darkMode}
                >
                  <DetailRow
                    label="Name"
                    value={cleanValue(record.decker)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Decision"
                    value={cleanValue(record.deckerDecision)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Remarks"
                    value={cleanValue(record.deckerRemarks)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Date End"
                    value={formatDate(record.dateDeckedEnd)}
                    colors={colors}
                  />
                </WorkflowCard>

                {/* Evaluator */}
                <WorkflowCard
                  title="Evaluator"
                  colors={colors}
                  darkMode={darkMode}
                >
                  <DetailRow
                    label="Name"
                    value={cleanValue(record.evaluator)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Decision"
                    value={cleanValue(record.evalDecision)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Remarks"
                    value={cleanValue(record.evalRemarks)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Date End"
                    value={formatDate(record.dateEvalEnd)}
                    colors={colors}
                  />
                </WorkflowCard>

                {/* Checker */}
                <WorkflowCard
                  title="Checker"
                  colors={colors}
                  darkMode={darkMode}
                >
                  <DetailRow
                    label="Name"
                    value={cleanValue(record.checker)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Decision"
                    value={cleanValue(record.checkerDecision)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Remarks"
                    value={cleanValue(record.checkerRemarks)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Date End"
                    value={formatDate(record.dateCheckerEnd)}
                    colors={colors}
                  />
                </WorkflowCard>

                {/* Supervisor */}
                <WorkflowCard
                  title="Supervisor"
                  colors={colors}
                  darkMode={darkMode}
                >
                  <DetailRow
                    label="Name"
                    value={cleanValue(record.supervisor)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Decision"
                    value={cleanValue(record.supervisorDecision)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Remarks"
                    value={cleanValue(record.supervisorRemarks)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Date End"
                    value={formatDate(record.dateSupervisorEnd)}
                    colors={colors}
                  />
                </WorkflowCard>

                {/* QA */}
                <WorkflowCard title="QA" colors={colors} darkMode={darkMode}>
                  <DetailRow
                    label="Name"
                    value={cleanValue(record.qa)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Decision"
                    value={cleanValue(record.qaDecision)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Remarks"
                    value={cleanValue(record.qaRemarks)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Date End"
                    value={formatDate(record.dateQaEnd)}
                    colors={colors}
                  />
                </WorkflowCard>

                {/* Director */}
                <WorkflowCard
                  title="Director"
                  colors={colors}
                  darkMode={darkMode}
                >
                  <DetailRow
                    label="Name"
                    value={cleanValue(record.director)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Decision"
                    value={cleanValue(record.directorDecision)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Remarks"
                    value={cleanValue(record.directorRemarks)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Date End"
                    value={formatDate(record.dateDirectorEnd)}
                    colors={colors}
                  />
                </WorkflowCard>

                {/* Releasing Officer */}
                <WorkflowCard
                  title="Releasing Officer"
                  colors={colors}
                  darkMode={darkMode}
                >
                  <DetailRow
                    label="Name"
                    value={cleanValue(record.releasingOfficer)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Decision"
                    value={cleanValue(record.releasingOfficerDecision)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Remarks"
                    value={cleanValue(record.releasingOfficerRemarks)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Date End"
                    value={formatDate(record.dateReleasingOfficerEnd)}
                    colors={colors}
                  />
                </WorkflowCard>
              </div>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* ESTABLISHMENT INFORMATION */}
            {/* ============================================ */}
            <CollapsibleSection
              title="🏢 Establishment Information"
              isExpanded={expandedSections.establishment}
              onToggle={() => toggleSection("establishment")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailGrid>
                <DetailRow
                  label="Category"
                  value={cleanValue(record.estCat)}
                  colors={colors}
                />
                <DetailRow
                  label="LTO Company"
                  value={cleanValue(record.ltoComp)}
                  colors={colors}
                />
                <DetailRow
                  label="LTO Address"
                  value={cleanValue(record.ltoAdd)}
                  colors={colors}
                />
                <DetailRow
                  label="Email"
                  value={cleanValue(record.eadd)}
                  colors={colors}
                />
                <DetailRow
                  label="TIN"
                  value={cleanValue(record.tin)}
                  colors={colors}
                />
                <DetailRow
                  label="Contact No."
                  value={cleanValue(record.contactNo)}
                  colors={colors}
                />
                <DetailRow
                  label="LTO No."
                  value={cleanValue(record.ltoNo)}
                  colors={colors}
                />
                <DetailRow
                  label="Validity"
                  value={formatDate(record.validity)}
                  colors={colors}
                />
              </DetailGrid>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* PRODUCT INFORMATION */}
            {/* ============================================ */}
            <CollapsibleSection
              title="💊 Product Information"
              isExpanded={expandedSections.product}
              onToggle={() => toggleSection("product")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailGrid>
                <DetailRow
                  label="Brand Name"
                  value={cleanValue(record.prodBrName)}
                  colors={colors}
                />
                <DetailRow
                  label="Generic Name"
                  value={cleanValue(record.prodGenName)}
                  colors={colors}
                />
                <DetailRow
                  label="Dosage Strength"
                  value={cleanValue(record.prodDosStr)}
                  colors={colors}
                />
                <DetailRow
                  label="Dosage Form"
                  value={cleanValue(record.prodDosForm)}
                  colors={colors}
                />
                <DetailRow
                  label="Prescription"
                  value={cleanValue(record.prodClassPrescript)}
                  colors={colors}
                />
                <DetailRow
                  label="Essential Drug"
                  value={cleanValue(record.prodEssDrugList)}
                  colors={colors}
                />
                <DetailRow
                  label="Pharma Category"
                  value={cleanValue(record.prodPharmaCat)}
                  colors={colors}
                />
                <DetailRow
                  label="Product Category"
                  value={cleanValue(record.prodCat)}
                  colors={colors}
                />
              </DetailGrid>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* MANUFACTURER INFORMATION */}
            {/* ============================================ */}
            <CollapsibleSection
              title="🏭 Manufacturer Information"
              isExpanded={expandedSections.manufacturer}
              onToggle={() => toggleSection("manufacturer")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailGrid>
                <DetailRow
                  label="Manufacturer"
                  value={cleanValue(record.prodManu)}
                  colors={colors}
                />
                <DetailRow
                  label="Manufacturer Address"
                  value={cleanValue(record.prodManuAdd)}
                  colors={colors}
                />
                <DetailRow
                  label="Manufacturer TIN"
                  value={cleanValue(record.prodManuTin)}
                  colors={colors}
                />
                <DetailRow
                  label="Manufacturer LTO No."
                  value={cleanValue(record.prodManuLtoNo)}
                  colors={colors}
                />
                <DetailRow
                  label="Manufacturer Country"
                  value={cleanValue(record.prodManuCountry)}
                  colors={colors}
                />
              </DetailGrid>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* TRADER INFORMATION */}
            {/* ============================================ */}
            <CollapsibleSection
              title="🚢 Trader Information"
              isExpanded={expandedSections.trader}
              onToggle={() => toggleSection("trader")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailGrid>
                <DetailRow
                  label="Trader"
                  value={cleanValue(record.prodTrader)}
                  colors={colors}
                />
                <DetailRow
                  label="Trader Address"
                  value={cleanValue(record.prodTraderAdd)}
                  colors={colors}
                />
                <DetailRow
                  label="Trader TIN"
                  value={cleanValue(record.prodTraderTin)}
                  colors={colors}
                />
                <DetailRow
                  label="Trader LTO No."
                  value={cleanValue(record.prodTraderLtoNo)}
                  colors={colors}
                />
                <DetailRow
                  label="Trader Country"
                  value={cleanValue(record.prodTraderCountry)}
                  colors={colors}
                />
              </DetailGrid>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* REPACKER INFORMATION */}
            {/* ============================================ */}
            <CollapsibleSection
              title="📦 Repacker Information"
              isExpanded={expandedSections.repacker}
              onToggle={() => toggleSection("repacker")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailGrid>
                <DetailRow
                  label="Repacker"
                  value={cleanValue(record.prodRepacker)}
                  colors={colors}
                />
                <DetailRow
                  label="Repacker Address"
                  value={cleanValue(record.prodRepackerAdd)}
                  colors={colors}
                />
                <DetailRow
                  label="Repacker TIN"
                  value={cleanValue(record.prodRepackerTin)}
                  colors={colors}
                />
                <DetailRow
                  label="Repacker LTO No."
                  value={cleanValue(record.prodRepackerLtoNo)}
                  colors={colors}
                />
                <DetailRow
                  label="Repacker Country"
                  value={cleanValue(record.prodRepackerCountry)}
                  colors={colors}
                />
              </DetailGrid>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* IMPORTER INFORMATION */}
            {/* ============================================ */}
            <CollapsibleSection
              title="✈️ Importer Information"
              isExpanded={expandedSections.importer}
              onToggle={() => toggleSection("importer")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailGrid>
                <DetailRow
                  label="Importer"
                  value={cleanValue(record.prodImporter)}
                  colors={colors}
                />
                <DetailRow
                  label="Importer Address"
                  value={cleanValue(record.prodImporterAdd)}
                  colors={colors}
                />
                <DetailRow
                  label="Importer TIN"
                  value={cleanValue(record.prodImporterTin)}
                  colors={colors}
                />
                <DetailRow
                  label="Importer LTO No."
                  value={cleanValue(record.prodImporterLtoNo)}
                  colors={colors}
                />
                <DetailRow
                  label="Importer Country"
                  value={cleanValue(record.prodImporterCountry)}
                  colors={colors}
                />
              </DetailGrid>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* DISTRIBUTOR INFORMATION */}
            {/* ============================================ */}
            <CollapsibleSection
              title="🚚 Distributor Information"
              isExpanded={expandedSections.distributor}
              onToggle={() => toggleSection("distributor")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailGrid>
                <DetailRow
                  label="Distributor"
                  value={cleanValue(record.prodDistri)}
                  colors={colors}
                />
                <DetailRow
                  label="Distributor Address"
                  value={cleanValue(record.prodDistriAdd)}
                  colors={colors}
                />
                <DetailRow
                  label="Distributor TIN"
                  value={cleanValue(record.prodDistriTin)}
                  colors={colors}
                />
                <DetailRow
                  label="Distributor LTO No."
                  value={cleanValue(record.prodDistriLtoNo)}
                  colors={colors}
                />
                <DetailRow
                  label="Distributor Country"
                  value={cleanValue(record.prodDistriCountry)}
                  colors={colors}
                />
                <DetailRow
                  label="Shelf Life"
                  value={cleanValue(record.prodDistriShelfLife)}
                  colors={colors}
                />
              </DetailGrid>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* STORAGE & PACKAGING */}
            {/* ============================================ */}
            <CollapsibleSection
              title="📦 Storage & Packaging"
              isExpanded={expandedSections.storage}
              onToggle={() => toggleSection("storage")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailGrid>
                <DetailRow
                  label="Storage Condition"
                  value={cleanValue(record.storageCond)}
                  colors={colors}
                />
                <DetailRow
                  label="Packaging"
                  value={cleanValue(record.packaging)}
                  colors={colors}
                />
                <DetailRow
                  label="Suggested RP"
                  value={cleanValue(record.suggRp)}
                  colors={colors}
                />
                <DetailRow
                  label="No. of Samples"
                  value={cleanValue(record.noSample)}
                  colors={colors}
                />
              </DetailGrid>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* APPLICATION INFORMATION */}
            {/* ============================================ */}
            <CollapsibleSection
              title="📋 Application Information"
              isExpanded={expandedSections.application}
              onToggle={() => toggleSection("application")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailGrid>
                <DetailRow
                  label="DTN"
                  value={cleanValue(record.dtn)}
                  colors={colors}
                />
                <DetailRow
                  label="Registration No."
                  value={cleanValue(record.regNo)}
                  colors={colors}
                />
                <DetailRow
                  label="Application Type"
                  value={cleanValue(record.appType)}
                  colors={colors}
                />
                <DetailRow
                  label="Mother App Type"
                  value={cleanValue(record.motherAppType)}
                  colors={colors}
                />
                <DetailRow
                  label="Old RSN"
                  value={cleanValue(record.oldRsn)}
                  colors={colors}
                />
                <DetailRow
                  label="Certification"
                  value={cleanValue(record.certification)}
                  colors={colors}
                />
                <DetailRow
                  label="Class"
                  value={cleanValue(record.class)}
                  colors={colors}
                />
                <DetailRow
                  label="Application Status"
                  value={record.appStatus}
                  colors={colors}
                  isBadge={true}
                  renderBadge={renderAppStatusBadge}
                />
              </DetailGrid>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* AMENDMENTS */}
            {/* ============================================ */}
            <CollapsibleSection
              title="📝 Amendments"
              isExpanded={expandedSections.amendments}
              onToggle={() => toggleSection("amendments")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailGrid>
                <DetailRow
                  label="Amendment 1"
                  value={cleanValue(record.ammend1)}
                  colors={colors}
                />
                <DetailRow
                  label="Amendment 2"
                  value={cleanValue(record.ammend2)}
                  colors={colors}
                />
                <DetailRow
                  label="Amendment 3"
                  value={cleanValue(record.ammend3)}
                  colors={colors}
                />
              </DetailGrid>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* FEES */}
            {/* ============================================ */}
            <CollapsibleSection
              title="💰 Fees"
              isExpanded={expandedSections.fees}
              onToggle={() => toggleSection("fees")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailGrid>
                <DetailRow
                  label="Fee"
                  value={cleanValue(record.fee)}
                  colors={colors}
                />
                <DetailRow
                  label="LRF"
                  value={cleanValue(record.lrf)}
                  colors={colors}
                />
                <DetailRow
                  label="SURC"
                  value={cleanValue(record.surc)}
                  colors={colors}
                />
                <DetailRow
                  label="Total"
                  value={cleanValue(record.total)}
                  colors={colors}
                />
                <DetailRow
                  label="OR No."
                  value={cleanValue(record.orNo)}
                  colors={colors}
                />
              </DetailGrid>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* IMPORTANT DATES */}
            {/* ============================================ */}
            <CollapsibleSection
              title="📅 Important Dates"
              isExpanded={expandedSections.dates}
              onToggle={() => toggleSection("dates")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailGrid>
                <DetailRow
                  label="Date Issued"
                  value={formatDate(record.dateIssued)}
                  colors={colors}
                />
                <DetailRow
                  label="Date Received FDAC"
                  value={formatDate(record.dateReceivedFdac)}
                  colors={colors}
                />
                <DetailRow
                  label="Date Received Central"
                  value={formatDate(record.dateReceivedCent)}
                  colors={colors}
                />
                <DetailRow
                  label="Date Deck"
                  value={formatDate(record.dateDeck)}
                  colors={colors}
                />
                <DetailRow
                  label="Date Released"
                  value={formatDate(record.dateReleased)}
                  colors={colors}
                />
                <DetailRow
                  label="Expiry Date"
                  value={formatDate(record.expiryDate)}
                  colors={colors}
                />
                <DetailRow
                  label="CPR Validity"
                  value={formatDate(record.cprValidity)}
                  colors={colors}
                />
                <DetailRow
                  label="Date Remarks"
                  value={formatDate(record.dateRemarks)}
                  colors={colors}
                />
              </DetailGrid>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* OFFICE/FILE INFORMATION */}
            {/* ============================================ */}
            <CollapsibleSection
              title="📁 Office/File Information"
              isExpanded={expandedSections.office}
              onToggle={() => toggleSection("office")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailGrid>
                <DetailRow
                  label="MO"
                  value={cleanValue(record.mo)}
                  colors={colors}
                />
                <DetailRow
                  label="File"
                  value={cleanValue(record.file)}
                  colors={colors}
                />
              </DetailGrid>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* SECPA INFORMATION */}
            {/* ============================================ */}
            <CollapsibleSection
              title="🔐 SECPA Information"
              isExpanded={expandedSections.secpa}
              onToggle={() => toggleSection("secpa")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailGrid>
                <DetailRow
                  label="SECPA"
                  value={cleanValue(record.secpa)}
                  colors={colors}
                />
                <DetailRow
                  label="SECPA Expiry Date"
                  value={formatDate(record.secpaExpDate)}
                  colors={colors}
                />
                <DetailRow
                  label="SECPA Issued On"
                  value={formatDate(record.secpaIssuedOn)}
                  colors={colors}
                />
              </DetailGrid>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* DECKING INFORMATION */}
            {/* ============================================ */}
            <CollapsibleSection
              title="🎯 Decking Information"
              isExpanded={expandedSections.decking}
              onToggle={() => toggleSection("decking")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailGrid>
                <DetailRow
                  label="Decking Schedule"
                  value={formatDate(record.deckingSched)}
                  colors={colors}
                />
                <DetailRow
                  label="Evaluator"
                  value={cleanValue(record.eval)}
                  colors={colors}
                />
              </DetailGrid>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* RELEASE INFORMATION */}
            {/* ============================================ */}
            <CollapsibleSection
              title="📤 Release Information"
              isExpanded={expandedSections.release}
              onToggle={() => toggleSection("release")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailGrid>
                <DetailRow
                  label="Type Doc Released"
                  value={cleanValue(record.typeDocReleased)}
                  colors={colors}
                />
                <DetailRow
                  label="Atta Released"
                  value={cleanValue(record.attaReleased)}
                  colors={colors}
                />
              </DetailGrid>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* CPR CONDITION */}
            {/* ============================================ */}
            <CollapsibleSection
              title="📜 CPR Condition"
              isExpanded={expandedSections.cpr}
              onToggle={() => toggleSection("cpr")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailRow
                label="CPR Condition"
                value={cleanValue(record.cprCond)}
                colors={colors}
                fullWidth
              />
              <DetailRow
                label="CPR Condition Remarks"
                value={cleanValue(record.cprCondRemarks)}
                colors={colors}
                fullWidth
              />
              <DetailRow
                label="CPR Condition Additional Remarks"
                value={cleanValue(record.cprCondAddRemarks)}
                colors={colors}
                fullWidth
              />
            </CollapsibleSection>

            {/* ============================================ */}
            {/* REMARKS & NOTES */}
            {/* ============================================ */}
            <CollapsibleSection
              title="📝 Remarks & Notes"
              isExpanded={expandedSections.remarks}
              onToggle={() => toggleSection("remarks")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailRow
                label="Application Remarks"
                value={cleanValue(record.appRemarks)}
                colors={colors}
                fullWidth
              />
              <DetailRow
                label="General Remarks"
                value={cleanValue(record.remarks1)}
                colors={colors}
                fullWidth
              />
            </CollapsibleSection>

            {/* ============================================ */}
            {/* METADATA */}
            {/* ============================================ */}
            <CollapsibleSection
              title="📊 Metadata (System Info)"
              isExpanded={expandedSections.metadata}
              onToggle={() => toggleSection("metadata")}
              colors={colors}
              darkMode={darkMode}
            >
              <DetailGrid>
                <DetailRow
                  label="Timeline (Days)"
                  value={cleanValue(record.dbTimelineCitizenCharter)}
                  colors={colors}
                />
                <DetailRow
                  label="Status Timeline"
                  value={cleanValue(record.statusTimeline)}
                  colors={colors}
                />
                <DetailRow
                  label="Uploaded By"
                  value={cleanValue(record.userUploader)}
                  colors={colors}
                />
                <DetailRow
                  label="Upload Date"
                  value={formatDate(record.dateExcelUpload)}
                  colors={colors}
                />
              </DetailGrid>
            </CollapsibleSection>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "1.5rem 2rem",
              borderTop: `1px solid ${colors.cardBorder}`,
              display: "flex",
              gap: "1rem",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: "0.75rem 1.5rem",
                background: colors.cardBorder,
                border: "none",
                borderRadius: "8px",
                color: colors.textPrimary,
                fontSize: "0.875rem",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = darkMode
                  ? "#404040"
                  : "#d0d0d0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.cardBorder;
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function CollapsibleSection({
  title,
  isExpanded,
  onToggle,
  children,
  colors,
  darkMode,
}) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.5rem",
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "10px",
          cursor: "pointer",
          transition: "all 0.2s ease",
          marginBottom: isExpanded ? "1rem" : "0",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = darkMode ? "#1f1f1f" : "#f0f0f0";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = colors.cardBg;
        }}
      >
        <h3
          style={{
            fontSize: "1rem",
            fontWeight: "600",
            color: colors.textPrimary,
            margin: 0,
          }}
        >
          {title}
        </h3>
        <span
          style={{
            color: colors.textTertiary,
            transition: "transform 0.2s",
            transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
          }}
        >
          ▼
        </span>
      </div>
      {isExpanded && (
        <div
          style={{
            padding: "1.5rem",
            background: colors.tableRowEven,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "10px",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DetailGrid({ children }) {
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

function DetailRow({
  label,
  value,
  colors,
  fullWidth = false,
  isBadge = false,
  renderBadge = null,
}) {
  const displayValue = isBadge && renderBadge ? renderBadge(value) : value;

  if (fullWidth) {
    return (
      <div style={{ gridColumn: "1 / -1" }}>
        <div
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: colors.textTertiary,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: "0.5rem",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "0.95rem",
            color: value === "N/A" ? colors.textTertiary : colors.textPrimary,
            fontWeight: "500",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
          }}
        >
          {displayValue}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          fontSize: "0.875rem",
          fontWeight: "600",
          color: colors.textTertiary,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: "0.5rem",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "0.95rem",
          color: value === "N/A" ? colors.textTertiary : colors.textPrimary,
          fontWeight: "500",
          wordBreak: "break-word",
        }}
      >
        {displayValue}
      </div>
    </div>
  );
}

function WorkflowCard({ title, children, colors, darkMode }) {
  return (
    <div
      style={{
        padding: "1rem",
        background: colors.cardBg,
        borderRadius: "8px",
        border: `1px solid ${colors.cardBorder}`,
      }}
    >
      <h4
        style={{
          fontSize: "0.9rem",
          fontWeight: "700",
          color: colors.textPrimary,
          marginBottom: "0.75rem",
          paddingBottom: "0.5rem",
          borderBottom: `1px solid ${colors.cardBorder}`,
        }}
      >
        {title}
      </h4>
      <div style={{ display: "grid", gap: "0.6rem" }}>{children}</div>
    </div>
  );
}

export default ViewDetailsModal;
