// src/components/fda/FDAViewModal.jsx
import { useEffect } from "react";

function FDAViewModal({ isOpen, onClose, data, darkMode }) {
  const colors = darkMode
    ? {
        bg: "#121212",
        card: "#1e1e1e",
        border: "#2c2c2c",
        primaryText: "#ffffff",
        secondaryText: "#bbbbbb",
        accent: "#4CAF50",
        warning: "#f44336",
      }
    : {
        bg: "#f5f5f5",
        card: "#ffffff",
        border: "#e0e0e0",
        primaryText: "#111111",
        secondaryText: "#555555",
        accent: "#4CAF50",
        warning: "#f44336",
      };

  const isExpired = (expiryDate) =>
    expiryDate && new Date(expiryDate) < new Date();

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => (document.body.style.overflow = "unset");
  }, [isOpen]);

  if (!isOpen || !data) return null;

  const sections = [
    {
      title: "Basic Information",
      fields: [
        { label: "Reference Number", key: "reference_number" },
        { label: "Registration Number", key: "registration_number" },
        { label: "Generic Name", key: "generic_name" },
        { label: "Brand Name", key: "brand_name" },
        { label: "Dosage Strength", key: "dosage_strength" },
        { label: "Dosage Form", key: "dosage_form" },
        { label: "Classification", key: "classification" },
        { label: "Packaging", key: "packaging" },
        { label: "Pharmacologic Category", key: "pharmacologic_category" },
      ],
    },
    {
      title: "Company Information",
      fields: [
        { label: "Manufacturer", key: "manufacturer" },
        { label: "Country", key: "country" },
        { label: "Trader", key: "trader" },
        { label: "Importer", key: "importer" },
        { label: "Distributor", key: "distributor" },
      ],
    },
    {
      title: "Registration Details",
      fields: [
        { label: "Application Type", key: "app_type" },
        { label: "Issuance Date", key: "issuance_date" },
        { label: "Expiry Date", key: "expiry_date", special: "expiry" },
      ],
    },
    {
      title: "Upload Information",
      fields: [
        { label: "Uploaded By", key: "uploaded_by" },
        { label: "Date Uploaded", key: "date_uploaded", special: "date" },
      ],
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 9998,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "70vw",
          height: "100vh",
          background: colors.bg,
          boxShadow: "-8px 0 30px rgba(0,0,0,0.3)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.3s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1.5rem 2rem",
            borderBottom: `1px solid ${colors.border}`,
            background: colors.card,
          }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "600",
              color: colors.primaryText,
            }}
          >
            Drug Registration Details
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              color: colors.secondaryText,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            {sections.map((section, idx) => (
              <div
                key={idx}
                style={{
                  background: colors.card,
                  borderRadius: "12px",
                  padding: "1.5rem",
                  border: `1px solid ${colors.border}`,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    color: colors.primaryText,
                    marginBottom: "1rem",
                  }}
                >
                  {section.title}
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(250px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {section.fields.map((field) => (
                    <div key={field.key}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          color: colors.secondaryText,
                          marginBottom: "0.25rem",
                        }}
                      >
                        {field.label}
                      </label>
                      <p
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: "500",
                          color:
                            field.special === "expiry" &&
                            isExpired(data[field.key])
                              ? colors.warning
                              : colors.primaryText,
                          padding: "0.5rem 0.75rem",
                          borderRadius: "6px",
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        {field.special === "date" && data[field.key]
                          ? new Date(data[field.key]).toLocaleString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : data[field.key] || "N/A"}
                        {field.special === "expiry" &&
                          isExpired(data[field.key]) &&
                          " ⚠️ EXPIRED"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1.5rem 2rem",
            borderTop: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "flex-end",
            background: colors.card,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "0.75rem 2rem",
              background: colors.accent,
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(76,175,80,0.3)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "translateY(-2px)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.transform = "translateY(0)")
            }
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

export default FDAViewModal;
