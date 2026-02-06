// src/components/UploadReports/actions/ViewDetailsModal.jsx

function ViewDetailsModal({ record, onClose, colors }) {
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
    }

    return status;
  };

  // Helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString || dateString === "N/A") return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // Detail sections configuration
  const detailSections = [
    // ✅ Workflow & Delegation Section with ALL tasks including Releasing Officer
    {
      title: "🎯 Workflow & Delegation",
      icon: "🎯",
      isWorkflowSection: true,
      tasks: [
        {
          name: "Decker",
          fields: [
            { key: "decker", label: "Decker" },
            { key: "deckerDecision", label: "Decision" },
            { key: "deckerRemarks", label: "Remarks" },
            { key: "dateDeckedEnd", label: "Date End", isDate: true },
          ],
        },
        {
          name: "Evaluator",
          fields: [
            { key: "evaluator", label: "Evaluator" },
            { key: "evalDecision", label: "Decision" },
            { key: "evalRemarks", label: "Remarks" },
            { key: "dateEvalEnd", label: "Date End", isDate: true },
          ],
        },
        {
          name: "Checker",
          fields: [
            { key: "checker", label: "Checker" },
            { key: "checkerDecision", label: "Decision" },
            { key: "checkerRemarks", label: "Remarks" },
            { key: "dateCheckerEnd", label: "Date End", isDate: true },
          ],
        },
        {
          name: "Supervisor",
          fields: [
            { key: "supervisor", label: "Supervisor" },
            { key: "supervisorDecision", label: "Decision" },
            { key: "supervisorRemarks", label: "Remarks" },
            { key: "dateSupervisorEnd", label: "Date End", isDate: true },
          ],
        },
        {
          name: "QA",
          fields: [
            { key: "qa", label: "QA" },
            { key: "qaDecision", label: "Decision" },
            { key: "qaRemarks", label: "Remarks" },
            { key: "dateQaEnd", label: "Date End", isDate: true },
          ],
        },
        {
          name: "Director",
          fields: [
            { key: "director", label: "Director" },
            { key: "directorDecision", label: "Decision" },
            { key: "directorRemarks", label: "Remarks" },
            { key: "dateDirectorEnd", label: "Date End", isDate: true },
          ],
        },
        {
          name: "Releasing Officer",
          fields: [
            { key: "releasingOfficer", label: "Officer" },
            { key: "releasingOfficerDecision", label: "Decision" },
            { key: "releasingOfficerRemarks", label: "Remarks" },
            { key: "dateReleasingOfficerEnd", label: "Date End", isDate: true },
          ],
        },
      ],
    },
    {
      title: "📑 Application Information",
      icon: "📑",
      fields: [
        { key: "regNo", label: "Registration Number" },
        { key: "appType", label: "Application Type" },
        { key: "motherAppType", label: "Mother App Type" },
        { key: "oldRsn", label: "Old RSN" },
        { key: "ammend1", label: "Amendment 1" },
        { key: "ammend2", label: "Amendment 2" },
        { key: "ammend3", label: "Amendment 3" },
        { key: "prodCat", label: "Product Category" },
        { key: "certification", label: "Certification" },
        { key: "class", label: "Class" },
        { key: "typeDocReleased", label: "Type Document Released" },
        { key: "attaReleased", label: "Attachment Released" },
      ],
    },
    {
      title: "📄 SECPA Information",
      icon: "📄",
      fields: [
        { key: "secpa", label: "SECPA" },
        { key: "secpaExpDate", label: "SECPA Expiry Date" },
        { key: "secpaIssuedOn", label: "SECPA Issued On" },
      ],
    },
    {
      title: "🏢 Establishment Information",
      icon: "🏢",
      fields: [
        { key: "ltoNo", label: "LTO Number" },
        { key: "validity", label: "Validity" },
        { key: "ltoComp", label: "Company" },
        { key: "ltoAdd", label: "Address" },
        { key: "eadd", label: "Email Address" },
        { key: "tin", label: "TIN" },
        { key: "contactNo", label: "Contact Number" },
      ],
    },
    {
      title: "💊 Product Information",
      icon: "💊",
      fields: [
        { key: "prodBrName", label: "Brand Name" },
        { key: "prodGenName", label: "Generic Name" },
        { key: "prodDosStr", label: "Dosage Strength" },
        {
          key: "prodDosForm",
          label: "Dosage Form and Route of Administration",
        },
        { key: "prodPharmaCat", label: "Pharmacologic Category" },
        { key: "prodDistriShelfLife", label: "Claimed Shelf-Life" },
      ],
    },
    {
      title: "📋 Product Details",
      icon: "📋",
      fields: [
        { key: "storageCond", label: "Storage Condition" },
        { key: "packaging", label: "Packaging" },
        { key: "suggRp", label: "Suggested RP" },
        { key: "noSample", label: "Number of Samples" },
        { key: "expiryDate", label: "Expiry Date" },
        { key: "cprValidity", label: "CPR Validity" },
      ],
    },
    {
      title: "💰 Financial Information",
      icon: "💰",
      fields: [
        { key: "fee", label: "Fee" },
        { key: "lrf", label: "LRF" },
        { key: "surc", label: "SURC" },
        { key: "total", label: "Total" },
        { key: "orNo", label: "OR Number" },
      ],
    },
    {
      title: "🏭 Manufacturer Information",
      icon: "🏭",
      fields: [
        { key: "prodManu", label: "Manufacturer" },
        { key: "prodManuAdd", label: "Manufacturer Address" },
        { key: "prodManuTin", label: "Manufacturer TIN" },
        { key: "prodManuLtoNo", label: "Manufacturer LTO No." },
        { key: "prodManuCountry", label: "Manufacturer Country" },
      ],
    },
    {
      title: "🚢 Trader Information",
      icon: "🚢",
      fields: [
        { key: "prodTrader", label: "Trader" },
        { key: "prodTraderAdd", label: "Trader Address" },
        { key: "prodTraderTin", label: "Trader TIN" },
        { key: "prodTraderLtoNo", label: "Trader LTO No." },
        { key: "prodTraderCountry", label: "Trader Country" },
      ],
    },
    {
      title: "📦 Repacker Information",
      icon: "📦",
      fields: [
        { key: "prodRepacker", label: "Repacker" },
        { key: "prodRepackerAdd", label: "Repacker Address" },
        { key: "prodRepackerTin", label: "Repacker TIN" },
        { key: "prodRepackerLtoNo", label: "Repacker LTO No." },
        { key: "prodRepackerCountry", label: "Repacker Country" },
      ],
    },
    {
      title: "📥 Importer Information",
      icon: "📥",
      fields: [
        { key: "prodImporter", label: "Importer" },
        { key: "prodImporterAdd", label: "Importer Address" },
        { key: "prodImporterTin", label: "Importer TIN" },
        { key: "prodImporterLtoNo", label: "Importer LTO No." },
        { key: "prodImporterCountry", label: "Importer Country" },
      ],
    },
    {
      title: "🚚 Distributor Information",
      icon: "🚚",
      fields: [
        { key: "prodDistri", label: "Distributor" },
        { key: "prodDistriAdd", label: "Distributor Address" },
        { key: "prodDistriTin", label: "Distributor TIN" },
        { key: "prodDistriLtoNo", label: "Distributor LTO No." },
        { key: "prodDistriCountry", label: "Distributor Country" },
      ],
    },
    {
      title: "📅 Important Dates",
      icon: "📅",
      fields: [
        { key: "dateIssued", label: "Date Issued" },
        { key: "dateReceivedFdac", label: "Date Received FDAC" },
        { key: "dateReceivedCent", label: "Date Received Central" },
        { key: "deckingSched", label: "Decking Schedule" },
        { key: "dateDeck", label: "Date Deck" },
        { key: "dateRemarks", label: "Date Remarks" },
        { key: "dateReleased", label: "Date Released" },
        { key: "dateExcelUpload", label: "Date Uploaded" },
      ],
    },
    {
      title: "✅ Evaluation & Status",
      icon: "✅",
      fields: [{ key: "eval", label: "Evaluator" }],
    },
    {
      title: "📝 Remarks & Conditions",
      icon: "📝",
      fields: [
        { key: "remarks1", label: "Remarks 1" },
        { key: "appRemarks", label: "Application Remarks" },
        { key: "cprCond", label: "CPR Condition" },
        { key: "cprCondRemarks", label: "CPR Condition Remarks" },
        { key: "cprCondAddRemarks", label: "CPR Condition Additional Remarks" },
      ],
    },
    {
      title: "👤 System Information",
      icon: "👤",
      fields: [
        { key: "mo", label: "MO" },
        { key: "file", label: "File Copy" },
        { key: "userUploader", label: "Uploaded By" },
        { key: "dateExcelUpload", label: "Date uploaded" },
      ],
    },
  ];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 9998,
          animation: "fadeIn 0.3s ease",
          backdropFilter: "blur(2px)",
        }}
      />

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "75vw", // ✅ Changed from 50vw to 75vw
          maxWidth: "75vw", // ✅ Changed from 50vw to 75vw
          minWidth: "800px", // ✅ Increased from 520px
          background: `linear-gradient(180deg, ${colors.cardBg} 0%, ${colors.tableBg} 100%)`,
          boxShadow: "-8px 0 40px rgba(0,0,0,0.25)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.35s cubic-bezier(.4,0,.2,1)",
          overflow: "hidden",
          borderLeft: `1px solid ${colors.cardBorder}`,
        }}
      >
        <div
          style={{
            padding: "1.5rem",
            borderBottom: `2px solid ${colors.cardBorder}`,
            background: colors.tableBg,
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "1rem",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  color: colors.textPrimary,
                  marginBottom: "0.5rem",
                }}
              >
                Report Details
              </h2>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    padding: "0.4rem 0.8rem",
                    background: "#4CAF5020",
                    color: "#4CAF50",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                  }}
                >
                  DTN: {record.dtn}
                </span>

                <span
                  style={{
                    padding: "0.4rem 0.8rem",
                    background: "#23362d20",
                    color: "#26b9b2",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                  }}
                >
                  CATEGORY: {record.estCat}
                </span>
                {record.appStatus && (
                  <span
                    style={{
                      padding: "0.4rem 0.8rem",
                      background:
                        record.appStatus.toUpperCase() === "COMPLETED"
                          ? "#10b98120"
                          : "#f59e0b20",
                      color:
                        record.appStatus.toUpperCase() === "COMPLETED"
                          ? "#10b981"
                          : "#f59e0b",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      fontWeight: "600",
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
                padding: "0.5rem",
                background: "transparent",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: "6px",
                color: colors.textPrimary,
                cursor: "pointer",
                fontSize: "1.2rem",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ef444410";
                e.currentTarget.style.borderColor = "#ef4444";
                e.currentTarget.style.color = "#ef4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = colors.cardBorder;
                e.currentTarget.style.color = colors.textPrimary;
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            padding: "1.5rem",
            overflowY: "auto",
          }}
        >
          {detailSections.map((section, idx) => {
            // Special handling for Workflow & Delegation section
            if (section.isWorkflowSection) {
              return (
                <div
                  key={idx}
                  style={{
                    marginBottom: "2rem",
                    background: colors.tableRowEven,
                    borderRadius: "12px",
                    padding: "1.5rem",
                    border: `1px solid ${colors.cardBorder}`,
                  }}
                >
                  <h3
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: "700",
                      color: colors.textPrimary,
                      marginBottom: "1.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      paddingBottom: "0.75rem",
                      borderBottom: `2px solid ${colors.cardBorder}`,
                    }}
                  >
                    <span style={{ fontSize: "1.3rem" }}>{section.icon}</span>
                    {section.title.replace(/^[^ ]+ /, "")}
                  </h3>

                  {/* ✅ 3-column grid for tasks (since we have more space now) */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)", // ✅ Changed from 2 to 3 columns
                      gap: "1.5rem",
                    }}
                  >
                    {section.tasks.map((task, taskIdx) => (
                      <div
                        key={taskIdx}
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
                          {task.name}
                        </h4>
                        <div style={{ display: "grid", gap: "0.6rem" }}>
                          {task.fields.map((field) => {
                            const value = record[field.key];
                            const displayValue = field.isDate
                              ? formatDate(value || "N/A")
                              : value || "N/A";

                            return (
                              <div
                                key={field.key}
                                style={{
                                  display: "flex",
                                  gap: "0.5rem",
                                  alignItems: "baseline",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                    color: colors.textTertiary,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                    flexShrink: 0,
                                  }}
                                >
                                  {field.label}:
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.85rem",
                                    color:
                                      displayValue === "N/A"
                                        ? colors.textTertiary
                                        : colors.textPrimary,
                                    fontWeight: "500",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {displayValue}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            // Handle regular sections
            const hasValues = section.fields.some(
              (field) =>
                record[field.key] &&
                record[field.key] !== "" &&
                record[field.key] !== "N/A",
            );

            if (!hasValues) return null;

            return (
              <div
                key={idx}
                style={{
                  marginBottom: "2rem",
                  background: colors.tableRowEven,
                  borderRadius: "12px",
                  padding: "1.5rem",
                  border: `1px solid ${colors.cardBorder}`,
                }}
              >
                <h3
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: "700",
                    color: colors.textPrimary,
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    paddingBottom: "0.75rem",
                    borderBottom: `2px solid ${colors.cardBorder}`,
                  }}
                >
                  <span style={{ fontSize: "1.3rem" }}>{section.icon}</span>
                  {section.title.replace(/^[^ ]+ /, "")}
                </h3>
                <div
                  style={{
                    display: "grid",
                    gap: "1rem",
                  }}
                >
                  {section.fields.map((field) => {
                    const value = record[field.key];
                    if (!value || value === "" || value === "N/A") return null;

                    const displayValue = field.isDate
                      ? formatDate(value)
                      : value;

                    return (
                      <div
                        key={field.key}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "200px 1fr", // ✅ Increased from 180px
                          gap: "1rem",
                          alignItems: "start",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: "600",
                            color: colors.textTertiary,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {field.label}:
                        </div>
                        <div
                          style={{
                            fontSize: "0.95rem",
                            color: colors.textPrimary,
                            fontWeight: "500",
                            wordBreak: "break-word",
                          }}
                        >
                          {field.key === "appStatus"
                            ? renderAppStatusBadge(displayValue)
                            : displayValue}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            padding: "1.5rem",
            borderTop: `2px solid ${colors.cardBorder}`,
            background: colors.tableBg,
            display: "flex",
            gap: "1rem",
            position: "sticky",
            bottom: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "0.75rem 1.5rem",
              background: colors.buttonSecondaryBg,
              border: `1px solid ${colors.buttonSecondaryBorder}`,
              borderRadius: "8px",
              color: colors.textPrimary,
              fontSize: "0.95rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = colors.badgeBg)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = colors.buttonSecondaryBg)
            }
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

export default ViewDetailsModal;
