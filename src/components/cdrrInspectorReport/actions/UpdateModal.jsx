import { useState, useEffect } from "react";
import { updateCDRRReport } from "../../../api/cdrr-reports";

function UpdateModal({
  isOpen,
  onClose,
  report,
  onSuccess,
  darkMode,
  userPermissions,
}) {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("main");

  const [formData, setFormData] = useState({
    date_received_by_center: "",
    date_decked: "",
    name_of_importer: "",
    lto_number: "",
    address: "",
    type_of_application: "",
    evaluator: "",
    date_evaluated: "",
    name_of_foreign_manufacturer: "",
    plant_address: "",
    secpa_number: "",
    certificate_number: "",
    date_of_issuance: "",
    type_of_issuance: "",
    product_line: "",
    certificate_validity: "",
    status: "",
    released_date: "",
    overall_deadline: "",
    category: "",
  });

  const [frooData, setFrooData] = useState({
    date_received: "",
    date_inspected: "",
    date_endorsed_to_cdrr: "",
    overall_deadline: "",
    approved_extension: "",
    new_overall_deadline: "",
    is_approved: false,
    date_extension_approved: "",
    status: "",
  });

  const [secondaryData, setSecondaryData] = useState({
    date_received: "",
    secpa_number: "",
    certificate_number: "",
    date_of_issuance: "",
    type_of_issuance: "",
    product_line: "",
    certificate_validity: "",
    status: "",
    released_date: "",
    overall_deadline: "",
  });

  const colors = darkMode
    ? {
        modalBg: "#1a1a1a",
        modalOverlay: "rgba(0,0,0,0.8)",
        cardBorder: "#2a2a2a",
        textPrimary: "#fff",
        textSecondary: "#b0b0b0",
        textTertiary: "#707070",
        inputBg: "#2a2a2a",
        inputBorder: "#3a3a3a",
        btnPrimary: "#3b82f6",
        btnSuccess: "#10b981",
        btnDanger: "#ef4444",
        frooViolet: "#8b5cf6",
        frooVioletBg: "#1a0f2e",
        cdrrOrange: "#f97316",
        cdrrOrangeBg: "#2e1a0f",
        hoverBg: "#2a2a2a",
      }
    : {
        modalBg: "#ffffff",
        modalOverlay: "rgba(0,0,0,0.5)",
        cardBorder: "#e0e0e0",
        textPrimary: "#000",
        textSecondary: "#666",
        textTertiary: "#999",
        inputBg: "#ffffff",
        inputBorder: "#d0d0d0",
        btnPrimary: "#3b82f6",
        btnSuccess: "#10b981",
        btnDanger: "#ef4444",
        frooViolet: "#8b5cf6",
        frooVioletBg: "#f5f3ff",
        cdrrOrange: "#f97316",
        cdrrOrangeBg: "#fff7ed",
        hoverBg: "#f5f5f5",
      };

  // Populate form fields when report changes
  useEffect(() => {
    if (report) {
      setFormData({
        date_received_by_center: report.date_received_by_center || "",
        date_decked: report.date_decked || "",
        name_of_importer: report.name_of_importer || "",
        lto_number: report.lto_number || "",
        address: report.address || "",
        type_of_application: report.type_of_application || "",
        evaluator: report.evaluator || "",
        date_evaluated: report.date_evaluated || "",
        name_of_foreign_manufacturer: report.name_of_foreign_manufacturer || "",
        plant_address: report.plant_address || "",
        secpa_number: report.secpa_number || "",
        certificate_number: report.certificate_number || "",
        date_of_issuance: report.date_of_issuance || "",
        type_of_issuance: report.type_of_issuance || "",
        product_line: report.product_line || "",
        certificate_validity: report.certificate_validity || "",
        status: report.status || "",
        released_date: report.released_date || "",
        overall_deadline: report.overall_deadline || "",
        category: report.category || "",
      });

      if (report.froo_report) {
        setFrooData({
          date_received: report.froo_report.date_received || "",
          date_inspected: report.froo_report.date_inspected || "",
          date_endorsed_to_cdrr: report.froo_report.date_endorsed_to_cdrr || "",
          overall_deadline: report.froo_report.overall_deadline || "",
          approved_extension: report.froo_report.approved_extension || "",
          new_overall_deadline: report.froo_report.new_overall_deadline || "",
          is_approved: report.froo_report.is_approved || false,
          date_extension_approved:
            report.froo_report.date_extension_approved || "",
          status: report.froo_report.status || "",
        });
      } else {
        setFrooData({
          date_received: "",
          date_inspected: "",
          date_endorsed_to_cdrr: "",
          overall_deadline: "",
          approved_extension: "",
          new_overall_deadline: "",
          is_approved: false,
          date_extension_approved: "",
          status: "",
        });
      }

      if (report.cdrr_secondary) {
        setSecondaryData({
          date_received: report.cdrr_secondary.date_received || "",
          secpa_number: report.cdrr_secondary.secpa_number || "",
          certificate_number: report.cdrr_secondary.certificate_number || "",
          date_of_issuance: report.cdrr_secondary.date_of_issuance || "",
          type_of_issuance: report.cdrr_secondary.type_of_issuance || "",
          product_line: report.cdrr_secondary.product_line || "",
          certificate_validity:
            report.cdrr_secondary.certificate_validity || "",
          status: report.cdrr_secondary.status || "",
          released_date: report.cdrr_secondary.released_date || "",
          overall_deadline: report.cdrr_secondary.overall_deadline || "",
        });
      } else {
        setSecondaryData({
          date_received: "",
          secpa_number: "",
          certificate_number: "",
          date_of_issuance: "",
          type_of_issuance: "",
          product_line: "",
          certificate_validity: "",
          status: "",
          released_date: "",
          overall_deadline: "",
        });
      }

      // Set default active section based on what the user can access:
      // CDRR group → start on "main"
      // Inspector group (no CDRR) → start on "froo"
      if (userPermissions?.canUpdateCDRR) {
        setActiveSection("main");
      } else if (userPermissions?.canUpdateFROO) {
        setActiveSection("froo");
      }
    }
  }, [report, userPermissions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updatePayload = {};

      if (activeSection === "main" && userPermissions?.canUpdateCDRR) {
        updatePayload.main_data = formData;
      } else if (
        activeSection === "secondary" &&
        userPermissions?.canUpdateCDRR
      ) {
        updatePayload.secondary_data = secondaryData;
      } else if (activeSection === "froo" && userPermissions?.canUpdateFROO) {
        updatePayload.froo_data = frooData;
      }

      await updateCDRRReport(report.id, updatePayload);
      alert("✅ Report updated successfully!");
      if (onSuccess) await onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update report:", error);
      alert(`❌ Failed to update report:\n${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMainChange = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));
  const handleFrooChange = (field, value) =>
    setFrooData((prev) => ({ ...prev, [field]: value }));
  const handleSecondaryChange = (field, value) =>
    setSecondaryData((prev) => ({ ...prev, [field]: value }));

  const inputStyle = {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "8px",
    border: `1px solid ${colors.inputBorder}`,
    background: colors.inputBg,
    color: colors.textPrimary,
    fontSize: "0.9rem",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "0.5rem",
    fontSize: "0.85rem",
    fontWeight: "600",
    color: colors.textPrimary,
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1.5rem",
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: colors.modalOverlay,
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
          maxWidth: "900px",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
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
                margin: 0,
                fontSize: "1.5rem",
                fontWeight: "700",
                color: colors.textPrimary,
              }}
            >
              ✏️ Update Report
            </h2>
            <p
              style={{
                margin: "0.25rem 0 0",
                fontSize: "0.85rem",
                color: colors.textSecondary,
              }}
            >
              DTN: <strong>{report?.dtn || "N/A"}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: colors.textSecondary,
              padding: "0.5rem",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs — only show tabs the user has permission for */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            padding: "1rem 2rem 0",
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          {/* CDRR group (id:14) sees: Main CDRR + Secondary Review */}
          {userPermissions?.canUpdateCDRR && (
            <>
              <button
                onClick={() => setActiveSection("main")}
                style={{
                  padding: "0.75rem 1.5rem",
                  border: "none",
                  background:
                    activeSection === "main"
                      ? colors.btnPrimary
                      : "transparent",
                  color:
                    activeSection === "main" ? "#fff" : colors.textSecondary,
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  borderRadius: "8px 8px 0 0",
                  transition: "all 0.2s",
                }}
              >
                📋 Main CDRR
              </button>
              <button
                onClick={() => setActiveSection("secondary")}
                style={{
                  padding: "0.75rem 1.5rem",
                  border: "none",
                  background:
                    activeSection === "secondary"
                      ? colors.cdrrOrange
                      : "transparent",
                  color:
                    activeSection === "secondary"
                      ? "#fff"
                      : colors.textSecondary,
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  borderRadius: "8px 8px 0 0",
                  transition: "all 0.2s",
                }}
              >
                📊 Secondary Review
              </button>
            </>
          )}

          {/* Inspector group (id:10) sees: FROO Inspection only */}
          {userPermissions?.canUpdateFROO && (
            <button
              onClick={() => setActiveSection("froo")}
              style={{
                padding: "0.75rem 1.5rem",
                border: "none",
                background:
                  activeSection === "froo" ? colors.frooViolet : "transparent",
                color: activeSection === "froo" ? "#fff" : colors.textSecondary,
                fontSize: "0.85rem",
                fontWeight: "600",
                cursor: "pointer",
                borderRadius: "8px 8px 0 0",
                transition: "all 0.2s",
              }}
            >
              📝 FROO Inspection
            </button>
          )}
        </div>

        {/* Form Content */}
        <form
          onSubmit={handleSubmit}
          style={{ flex: 1, overflow: "auto", padding: "2rem" }}
        >
          {/* ── MAIN CDRR SECTION (CDRR group only) ── */}
          {activeSection === "main" && userPermissions?.canUpdateCDRR && (
            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Date Received by Center</label>
                <input
                  type="date"
                  value={formData.date_received_by_center}
                  onChange={(e) =>
                    handleMainChange("date_received_by_center", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Date Decked</label>
                <input
                  type="date"
                  value={formData.date_decked}
                  onChange={(e) =>
                    handleMainChange("date_decked", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Name of Importer</label>
                <input
                  type="text"
                  value={formData.name_of_importer}
                  onChange={(e) =>
                    handleMainChange("name_of_importer", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>LTO Number</label>
                <input
                  type="text"
                  value={formData.lto_number}
                  onChange={(e) =>
                    handleMainChange("lto_number", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Type of Application</label>
                <input
                  type="text"
                  value={formData.type_of_application}
                  onChange={(e) =>
                    handleMainChange("type_of_application", e.target.value)
                  }
                  placeholder="e.g., New, Renewal"
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleMainChange("address", e.target.value)}
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              <div>
                <label style={labelStyle}>Evaluator</label>
                <input
                  type="text"
                  value={formData.evaluator}
                  onChange={(e) =>
                    handleMainChange("evaluator", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Date Evaluated</label>
                <input
                  type="date"
                  value={formData.date_evaluated}
                  onChange={(e) =>
                    handleMainChange("date_evaluated", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Name of Foreign Manufacturer</label>
                <input
                  type="text"
                  value={formData.name_of_foreign_manufacturer}
                  onChange={(e) =>
                    handleMainChange(
                      "name_of_foreign_manufacturer",
                      e.target.value,
                    )
                  }
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Plant Address</label>
                <textarea
                  value={formData.plant_address}
                  onChange={(e) =>
                    handleMainChange("plant_address", e.target.value)
                  }
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              <div>
                <label style={labelStyle}>SECPA Number</label>
                <input
                  type="text"
                  value={formData.secpa_number}
                  onChange={(e) =>
                    handleMainChange("secpa_number", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Certificate Number</label>
                <input
                  type="text"
                  value={formData.certificate_number}
                  onChange={(e) =>
                    handleMainChange("certificate_number", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Date of Issuance</label>
                <input
                  type="date"
                  value={formData.date_of_issuance}
                  onChange={(e) =>
                    handleMainChange("date_of_issuance", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Type of Issuance</label>
                <input
                  type="text"
                  value={formData.type_of_issuance}
                  onChange={(e) =>
                    handleMainChange("type_of_issuance", e.target.value)
                  }
                  placeholder="e.g., New, Renewal"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Product Line</label>
                <input
                  type="text"
                  value={formData.product_line}
                  onChange={(e) =>
                    handleMainChange("product_line", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Certificate Validity</label>
                <input
                  type="date"
                  value={formData.certificate_validity}
                  onChange={(e) =>
                    handleMainChange("certificate_validity", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleMainChange("status", e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Released Date</label>
                <input
                  type="date"
                  value={formData.released_date}
                  onChange={(e) =>
                    handleMainChange("released_date", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Overall Deadline</label>
                <input
                  type="date"
                  value={formData.overall_deadline}
                  onChange={(e) =>
                    handleMainChange("overall_deadline", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleMainChange("category", e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select Category</option>
                  <option value="NON-PICS">NON-PICS</option>
                  <option value="PICS">PICS</option>
                  <option value="LETTER AND CORRECTION">
                    LETTER AND CORRECTION
                  </option>
                </select>
              </div>
            </div>
          )}

          {/* ── FROO SECTION (Inspector group only) ── */}
          {activeSection === "froo" && userPermissions?.canUpdateFROO && (
            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Date Received</label>
                <input
                  type="date"
                  value={frooData.date_received}
                  onChange={(e) =>
                    handleFrooChange("date_received", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Date Inspected</label>
                <input
                  type="date"
                  value={frooData.date_inspected}
                  onChange={(e) =>
                    handleFrooChange("date_inspected", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Date Endorsed to CDRR</label>
                <input
                  type="date"
                  value={frooData.date_endorsed_to_cdrr}
                  onChange={(e) =>
                    handleFrooChange("date_endorsed_to_cdrr", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Overall Deadline</label>
                <input
                  type="date"
                  value={frooData.overall_deadline}
                  onChange={(e) =>
                    handleFrooChange("overall_deadline", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Approved Extension</label>
                <input
                  type="date"
                  value={frooData.approved_extension}
                  onChange={(e) =>
                    handleFrooChange("approved_extension", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>New Overall Deadline</label>
                <input
                  type="date"
                  value={frooData.new_overall_deadline}
                  onChange={(e) =>
                    handleFrooChange("new_overall_deadline", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Is Approved</label>
                <select
                  value={frooData.is_approved ? "true" : "false"}
                  onChange={(e) =>
                    handleFrooChange("is_approved", e.target.value === "true")
                  }
                  style={inputStyle}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Date Extension Approved</label>
                <input
                  type="date"
                  value={frooData.date_extension_approved}
                  onChange={(e) =>
                    handleFrooChange("date_extension_approved", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>FROO Status</label>
                <select
                  value={frooData.status}
                  onChange={(e) => handleFrooChange("status", e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          )}

          {/* ── SECONDARY SECTION (CDRR group only) ── */}
          {activeSection === "secondary" && userPermissions?.canUpdateCDRR && (
            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Date Received</label>
                <input
                  type="date"
                  value={secondaryData.date_received}
                  onChange={(e) =>
                    handleSecondaryChange("date_received", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>SECPA Number</label>
                <input
                  type="text"
                  value={secondaryData.secpa_number}
                  onChange={(e) =>
                    handleSecondaryChange("secpa_number", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Certificate Number</label>
                <input
                  type="text"
                  value={secondaryData.certificate_number}
                  onChange={(e) =>
                    handleSecondaryChange("certificate_number", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Date of Issuance</label>
                <input
                  type="date"
                  value={secondaryData.date_of_issuance}
                  onChange={(e) =>
                    handleSecondaryChange("date_of_issuance", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Type of Issuance</label>
                <input
                  type="text"
                  value={secondaryData.type_of_issuance}
                  onChange={(e) =>
                    handleSecondaryChange("type_of_issuance", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Product Line</label>
                <input
                  type="text"
                  value={secondaryData.product_line}
                  onChange={(e) =>
                    handleSecondaryChange("product_line", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Certificate Validity</label>
                <input
                  type="date"
                  value={secondaryData.certificate_validity}
                  onChange={(e) =>
                    handleSecondaryChange(
                      "certificate_validity",
                      e.target.value,
                    )
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select
                  value={secondaryData.status}
                  onChange={(e) =>
                    handleSecondaryChange("status", e.target.value)
                  }
                  style={inputStyle}
                >
                  <option value="">Select Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Released Date</label>
                <input
                  type="date"
                  value={secondaryData.released_date}
                  onChange={(e) =>
                    handleSecondaryChange("released_date", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Overall Deadline</label>
                <input
                  type="date"
                  value={secondaryData.overall_deadline}
                  onChange={(e) =>
                    handleSecondaryChange("overall_deadline", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>
            </div>
          )}
        </form>

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
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textPrimary,
              fontSize: "0.9rem",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              border: "none",
              background: loading ? colors.textTertiary : colors.btnSuccess,
              color: "#fff",
              fontSize: "0.9rem",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {loading ? (
              <>
                <span>⏳</span> Updating...
              </>
            ) : (
              <>
                <span>💾</span> Update Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdateModal;
