function ViewDetailsModal({ isOpen, onClose, report, darkMode }) {
  if (!isOpen || !report) return null;

  const colors = darkMode
    ? {
        modalBg: "#1a1a1a",
        cardBg: "#0a0a0a",
        cardBorder: "#2a2a2a",
        textPrimary: "#fff",
        textSecondary: "#b0b0b0",
        textTertiary: "#707070",
        btnPrimary: "#3b82f6",
        btnSuccess: "#10b981",
        btnWarning: "#f59e0b",
        btnDanger: "#ef4444",
        inputBg: "#2a2a2a",
        inputBorder: "#3a3a3a",
        sectionBg: "#1f1f1f",
        sectionBorder: "#2f2f2f",
        frooViolet: "#8b5cf6",
        frooVioletBg: "#1a0f2e",
        cdrrOrange: "#f97316",
        cdrrOrangeBg: "#2e1a0f",
      }
    : {
        modalBg: "#ffffff",
        cardBg: "#f8f8f8",
        cardBorder: "#e0e0e0",
        textPrimary: "#000",
        textSecondary: "#666",
        textTertiary: "#999",
        btnPrimary: "#3b82f6",
        btnSuccess: "#10b981",
        btnWarning: "#f59e0b",
        btnDanger: "#ef4444",
        inputBg: "#ffffff",
        inputBorder: "#d0d0d0",
        sectionBg: "#f9f9f9",
        sectionBorder: "#e5e5e5",
        frooViolet: "#8b5cf6",
        frooVioletBg: "#f5f3ff",
        cdrrOrange: "#f97316",
        cdrrOrangeBg: "#fff7ed",
      };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  // Format datetime helper
  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
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
          background: colors.modalBg,
          borderRadius: "16px",
          width: "100%",
          maxWidth: "1200px",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
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
            position: "sticky",
            top: 0,
            background: colors.modalBg,
            zIndex: 10,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.5rem",
                fontWeight: "700",
                color: colors.textPrimary,
              }}
            >
              📋 Report Details
            </h2>
            <p
              style={{
                margin: "0.25rem 0 0",
                fontSize: "0.9rem",
                color: colors.textSecondary,
              }}
            >
              DTN: <span style={{ fontWeight: "600" }}>{report.dtn}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: colors.textSecondary,
              cursor: "pointer",
              padding: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "8px",
              transition: "background 0.2s",
              fontSize: "1.5rem",
              width: "40px",
              height: "40px",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = colors.cardBg)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "2rem" }}>
          {/* CDRR REPORT SECTION */}
          <div
            style={{
              marginBottom: "2rem",
              background: colors.sectionBg,
              border: `1px solid ${colors.sectionBorder}`,
              borderRadius: "12px",
              padding: "1.5rem",
            }}
          >
            <h3
              style={{
                margin: "0 0 1.5rem",
                fontSize: "1.2rem",
                fontWeight: "700",
                color: colors.textPrimary,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              📄 CDRR Report
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1.25rem",
              }}
            >
              <InfoField
                label="Date Received by Center"
                value={formatDate(report.date_received_by_center)}
                colors={colors}
              />
              <InfoField
                label="Date Decked"
                value={formatDate(report.date_decked)}
                colors={colors}
              />
              <InfoField
                label="Name of Importer"
                value={report.name_of_importer}
                colors={colors}
              />
              <InfoField
                label="LTO Number"
                value={report.lto_number}
                colors={colors}
              />
              <InfoField
                label="Address"
                value={report.address}
                colors={colors}
                fullWidth
              />
              <InfoField
                label="Type of Application"
                value={report.type_of_application}
                colors={colors}
              />
              <InfoField
                label="Evaluator"
                value={report.evaluator}
                colors={colors}
              />
              <InfoField
                label="Date Evaluated"
                value={formatDate(report.date_evaluated)}
                colors={colors}
              />
              <InfoField
                label="Foreign Manufacturer"
                value={report.name_of_foreign_manufacturer}
                colors={colors}
              />
              <InfoField
                label="Plant Address"
                value={report.plant_address}
                colors={colors}
                fullWidth
              />
              <InfoField
                label="SECPA Number"
                value={report.secpa_number}
                colors={colors}
              />
              <InfoField
                label="Certificate Number"
                value={report.certificate_number}
                colors={colors}
              />
              <InfoField
                label="Date of Issuance"
                value={formatDate(report.date_of_issuance)}
                colors={colors}
              />
              <InfoField
                label="Type of Issuance"
                value={report.type_of_issuance}
                colors={colors}
              />
              <InfoField
                label="Product Line"
                value={report.product_line}
                colors={colors}
              />
              <InfoField
                label="Certificate Validity"
                value={formatDate(report.certificate_validity)}
                colors={colors}
              />
              <InfoField
                label="Status"
                value={report.status}
                colors={colors}
                isStatus
              />
              <InfoField
                label="Released Date"
                value={formatDate(report.released_date)}
                colors={colors}
              />
              <InfoField
                label="Overall Deadline"
                value={formatDate(report.overall_deadline)}
                colors={colors}
              />
              <InfoField
                label="Beyond/Within"
                value={report.beyond_within}
                colors={colors}
              />
              <InfoField
                label="Created By"
                value={report.created_by}
                colors={colors}
              />
              <InfoField
                label="Created At"
                value={formatDateTime(report.created_at)}
                colors={colors}
              />
              <InfoField
                label="Updated By"
                value={report.updated_by}
                colors={colors}
              />
              <InfoField
                label="Updated At"
                value={formatDateTime(report.updated_at)}
                colors={colors}
              />
            </div>
          </div>

          {/* FROO REPORT SECTION */}
          {report.froo_report && (
            <div
              style={{
                marginBottom: "2rem",
                background: colors.frooVioletBg,
                border: `2px solid ${colors.frooViolet}`,
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <h3
                style={{
                  margin: "0 0 1.5rem",
                  fontSize: "1.2rem",
                  fontWeight: "700",
                  color: colors.frooViolet,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                📝 FROO Report
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "1.25rem",
                }}
              >
                <InfoField
                  label="Date Received"
                  value={formatDate(report.froo_report.date_received)}
                  colors={colors}
                />
                <InfoField
                  label="Date Inspected"
                  value={formatDate(report.froo_report.date_inspected)}
                  colors={colors}
                />
                <InfoField
                  label="Date Endorsed to CDRR"
                  value={formatDate(report.froo_report.date_endorsed_to_cdrr)}
                  colors={colors}
                />
                <InfoField
                  label="Overall Deadline"
                  value={formatDate(report.froo_report.overall_deadline)}
                  colors={colors}
                />
                <InfoField
                  label="Approved Extension"
                  value={formatDate(report.froo_report.approved_extension)}
                  colors={colors}
                />
                <InfoField
                  label="New Overall Deadline"
                  value={formatDate(report.froo_report.new_overall_deadline)}
                  colors={colors}
                />
                <InfoField
                  label="Beyond/Within"
                  value={report.froo_report.beyond_within}
                  colors={colors}
                />
                <InfoField
                  label="Created By"
                  value={report.froo_report.created_by}
                  colors={colors}
                />
                <InfoField
                  label="Created At"
                  value={formatDateTime(report.froo_report.created_at)}
                  colors={colors}
                />
                <InfoField
                  label="Updated By"
                  value={report.froo_report.updated_by}
                  colors={colors}
                />
                <InfoField
                  label="Updated At"
                  value={formatDateTime(report.froo_report.updated_at)}
                  colors={colors}
                />
              </div>
            </div>
          )}

          {/* CDRR SECONDARY SECTION */}
          {report.cdrr_secondary && (
            <div
              style={{
                background: colors.cdrrOrangeBg,
                border: `2px solid ${colors.cdrrOrange}`,
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <h3
                style={{
                  margin: "0 0 1.5rem",
                  fontSize: "1.2rem",
                  fontWeight: "700",
                  color: colors.cdrrOrange,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                📊 CDRR Secondary
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "1.25rem",
                }}
              >
                <InfoField
                  label="Date Received"
                  value={formatDate(report.cdrr_secondary.date_received)}
                  colors={colors}
                />
                <InfoField
                  label="SECPA Number"
                  value={report.cdrr_secondary.secpa_number}
                  colors={colors}
                />
                <InfoField
                  label="Certificate Number"
                  value={report.cdrr_secondary.certificate_number}
                  colors={colors}
                />
                <InfoField
                  label="Date of Issuance"
                  value={formatDate(report.cdrr_secondary.date_of_issuance)}
                  colors={colors}
                />
                <InfoField
                  label="Type of Issuance"
                  value={report.cdrr_secondary.type_of_issuance}
                  colors={colors}
                />
                <InfoField
                  label="Product Line"
                  value={report.cdrr_secondary.product_line}
                  colors={colors}
                />
                <InfoField
                  label="Certificate Validity"
                  value={formatDate(report.cdrr_secondary.certificate_validity)}
                  colors={colors}
                />
                <InfoField
                  label="Status"
                  value={report.cdrr_secondary.status}
                  colors={colors}
                  isStatus
                />
                <InfoField
                  label="Released Date"
                  value={formatDate(report.cdrr_secondary.released_date)}
                  colors={colors}
                />
                <InfoField
                  label="Overall Deadline"
                  value={formatDate(report.cdrr_secondary.overall_deadline)}
                  colors={colors}
                />
                <InfoField
                  label="Beyond/Within"
                  value={report.cdrr_secondary.beyond_within}
                  colors={colors}
                />
                <InfoField
                  label="Created By"
                  value={report.cdrr_secondary.created_by}
                  colors={colors}
                />
                <InfoField
                  label="Created At"
                  value={formatDateTime(report.cdrr_secondary.created_at)}
                  colors={colors}
                />
                <InfoField
                  label="Updated By"
                  value={report.cdrr_secondary.updated_by}
                  colors={colors}
                />
                <InfoField
                  label="Updated At"
                  value={formatDateTime(report.cdrr_secondary.updated_at)}
                  colors={colors}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1.5rem 2rem",
            borderTop: `1px solid ${colors.cardBorder}`,
            display: "flex",
            justifyContent: "flex-end",
            position: "sticky",
            bottom: 0,
            background: colors.modalBg,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              border: "none",
              background: colors.btnPrimary,
              color: "#fff",
              fontSize: "0.9rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper component for displaying info fields
function InfoField({ label, value, colors, isStatus, fullWidth }) {
  return (
    <div
      style={{
        gridColumn: fullWidth ? "1 / -1" : "auto",
      }}
    >
      <div
        style={{
          fontSize: "0.75rem",
          fontWeight: "600",
          color: colors.textTertiary,
          marginBottom: "0.5rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "0.95rem",
          color: colors.textPrimary,
          fontWeight: "500",
        }}
      >
        {isStatus && value && value !== "N/A" ? (
          <span
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "12px",
              fontSize: "0.85rem",
              fontWeight: "600",
              background:
                value.toLowerCase() === "completed"
                  ? colors.btnSuccess
                  : value.toLowerCase() === "pending"
                    ? colors.btnWarning
                    : colors.cardBorder,
              color:
                value.toLowerCase() === "completed" ||
                value.toLowerCase() === "pending"
                  ? "#fff"
                  : colors.textSecondary,
              display: "inline-block",
            }}
          >
            {value}
          </span>
        ) : (
          value || "N/A"
        )}
      </div>
    </div>
  );
}

export default ViewDetailsModal;
