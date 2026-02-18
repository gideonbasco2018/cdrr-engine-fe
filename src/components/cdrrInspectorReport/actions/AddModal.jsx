import { useState } from "react";
import { createCDRRReport } from "../../../api/cdrr-reports";

function AddModal({ isOpen, onClose, onSuccess, darkMode, userPermissions }) {
  const [loading, setLoading] = useState(false);

  // ── CDRR fields (used by CDRR group) ──
  const [formData, setFormData] = useState({
    dtn: "",
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
    status: "Pending",
    released_date: "",
    overall_deadline: "",
    category: "",
  });

  // ── FROO fields (used by Inspector group) ──
  const [frooData, setFrooData] = useState({
    date_received: "",
    date_inspected: "",
    date_endorsed_to_cdrr: "",
    overall_deadline: "",
    approved_extension: "",
    new_overall_deadline: "",
    is_approved: false,
    date_extension_approved: "",
    status: "Pending",
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
      };

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

  const handleChange = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));
  const handleFrooChange = (field, value) =>
    setFrooData((prev) => ({ ...prev, [field]: value }));

  const resetForms = () => {
    setFormData({
      dtn: "",
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
      status: "Pending",
      released_date: "",
      overall_deadline: "",
      category: "",
    });
    setFrooData({
      date_received: "",
      date_inspected: "",
      date_endorsed_to_cdrr: "",
      overall_deadline: "",
      approved_extension: "",
      new_overall_deadline: "",
      is_approved: false,
      date_extension_approved: "",
      status: "Pending",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Build payload based on user group
    if (userPermissions?.canUpdateCDRR) {
      // CDRR group — requires DTN, Date Received, Category
      if (
        !formData.dtn ||
        !formData.date_received_by_center ||
        !formData.category
      ) {
        alert(
          "❌ Please fill in required fields: DTN, Date Received by Center, and Category",
        );
        return;
      }
    } else if (userPermissions?.canUpdateFROO) {
      // Inspector group — requires DTN (links the FROO to the main report)
      if (!formData.dtn) {
        alert("❌ Please provide the DTN to link this FROO Inspection report.");
        return;
      }
    }

    setLoading(true);

    try {
      let payload = {};

      if (userPermissions?.canUpdateCDRR) {
        // CDRR group submits main CDRR data
        payload = { ...formData };
      } else if (userPermissions?.canUpdateFROO) {
        // Inspector group submits FROO data under the given DTN
        payload = {
          dtn: formData.dtn,
          froo_data: frooData,
        };
      }

      await createCDRRReport(payload);
      alert("✅ Report created successfully!");
      resetForms();
      if (onSuccess) await onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to create report:", error);
      alert(`❌ Failed to create report:\n${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Determine the modal title based on user group
  const modalTitle = userPermissions?.canUpdateCDRR
    ? "➕ Add New CDRR Report"
    : "➕ Add FROO Inspection";

  const modalSubtitle = userPermissions?.canUpdateCDRR
    ? "Fill in the details to create a new CDRR report"
    : "Fill in the FROO Inspection details for the given DTN";

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
              {modalTitle}
            </h2>
            <p
              style={{
                margin: "0.25rem 0 0",
                fontSize: "0.85rem",
                color: colors.textSecondary,
              }}
            >
              {modalSubtitle}
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

        {/* Form Content */}
        <form
          onSubmit={handleSubmit}
          style={{ flex: 1, overflow: "auto", padding: "2rem" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.5rem",
            }}
          >
            {/* DTN — required for both groups */}
            <div>
              <label style={labelStyle}>
                DTN <span style={{ color: colors.btnDanger }}>*</span>
              </label>
              <input
                type="text"
                value={formData.dtn}
                onChange={(e) => handleChange("dtn", e.target.value)}
                required
                placeholder="Enter DTN"
                style={inputStyle}
              />
            </div>

            {/* ── CDRR GROUP FIELDS ── */}
            {userPermissions?.canUpdateCDRR && (
              <>
                <div>
                  <label style={labelStyle}>
                    Date Received by Center{" "}
                    <span style={{ color: colors.btnDanger }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date_received_by_center}
                    onChange={(e) =>
                      handleChange("date_received_by_center", e.target.value)
                    }
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Date Decked</label>
                  <input
                    type="date"
                    value={formData.date_decked}
                    onChange={(e) =>
                      handleChange("date_decked", e.target.value)
                    }
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Category <span style={{ color: colors.btnDanger }}>*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleChange("category", e.target.value)}
                    required
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
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Name of Importer</label>
                  <input
                    type="text"
                    value={formData.name_of_importer}
                    onChange={(e) =>
                      handleChange("name_of_importer", e.target.value)
                    }
                    placeholder="Enter importer name"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>LTO Number</label>
                  <input
                    type="text"
                    value={formData.lto_number}
                    onChange={(e) => handleChange("lto_number", e.target.value)}
                    placeholder="Enter LTO number"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Type of Application</label>
                  <input
                    type="text"
                    value={formData.type_of_application}
                    onChange={(e) =>
                      handleChange("type_of_application", e.target.value)
                    }
                    placeholder="e.g., New, Renewal"
                    style={inputStyle}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    rows={2}
                    placeholder="Enter address"
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Evaluator</label>
                  <input
                    type="text"
                    value={formData.evaluator}
                    onChange={(e) => handleChange("evaluator", e.target.value)}
                    placeholder="Enter evaluator name"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Date Evaluated</label>
                  <input
                    type="date"
                    value={formData.date_evaluated}
                    onChange={(e) =>
                      handleChange("date_evaluated", e.target.value)
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
                      handleChange(
                        "name_of_foreign_manufacturer",
                        e.target.value,
                      )
                    }
                    placeholder="Enter manufacturer name"
                    style={inputStyle}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Plant Address</label>
                  <textarea
                    value={formData.plant_address}
                    onChange={(e) =>
                      handleChange("plant_address", e.target.value)
                    }
                    rows={2}
                    placeholder="Enter plant address"
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>SECPA Number</label>
                  <input
                    type="text"
                    value={formData.secpa_number}
                    onChange={(e) =>
                      handleChange("secpa_number", e.target.value)
                    }
                    placeholder="Enter SECPA number"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Certificate Number</label>
                  <input
                    type="text"
                    value={formData.certificate_number}
                    onChange={(e) =>
                      handleChange("certificate_number", e.target.value)
                    }
                    placeholder="Enter certificate number"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Date of Issuance</label>
                  <input
                    type="date"
                    value={formData.date_of_issuance}
                    onChange={(e) =>
                      handleChange("date_of_issuance", e.target.value)
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
                      handleChange("type_of_issuance", e.target.value)
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
                      handleChange("product_line", e.target.value)
                    }
                    placeholder="Enter product line"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Certificate Validity</label>
                  <input
                    type="date"
                    value={formData.certificate_validity}
                    onChange={(e) =>
                      handleChange("certificate_validity", e.target.value)
                    }
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                    style={inputStyle}
                  >
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
                      handleChange("released_date", e.target.value)
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
                      handleChange("overall_deadline", e.target.value)
                    }
                    style={inputStyle}
                  />
                </div>
              </>
            )}

            {/* ── INSPECTOR / FROO GROUP FIELDS ── */}
            {userPermissions?.canUpdateFROO &&
              !userPermissions?.canUpdateCDRR && (
                <>
                  {/* Separator note */}
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      padding: "0.75rem 1rem",
                      background: colors.frooViolet + "20",
                      border: `1px solid ${colors.frooViolet}`,
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      color: colors.frooViolet,
                      fontWeight: "600",
                    }}
                  >
                    📝 FROO Inspection Details — Enter the DTN of the existing
                    report above, then fill in the inspection information below.
                  </div>
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
                        handleFrooChange(
                          "date_endorsed_to_cdrr",
                          e.target.value,
                        )
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
                        handleFrooChange(
                          "is_approved",
                          e.target.value === "true",
                        )
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
                        handleFrooChange(
                          "date_extension_approved",
                          e.target.value,
                        )
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>FROO Status</label>
                    <select
                      value={frooData.status}
                      onChange={(e) =>
                        handleFrooChange("status", e.target.value)
                      }
                      style={inputStyle}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </>
              )}
          </div>
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
                <span>⏳</span> Creating...
              </>
            ) : (
              <>
                <span>➕</span> Create Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddModal;
