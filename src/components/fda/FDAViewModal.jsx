// src/components/fda/FDAViewModal.jsx
import { useEffect } from "react";

function FDAViewModal({ isOpen, onClose, data, darkMode }) {
  const colors = darkMode
    ? {
        cardBg: "#0f0f0f",
        cardBorder: "#1a1a1a",
        textPrimary: "#fff",
        textSecondary: "#999",
        textTertiary: "#666",
        tableBorder: "#1a1a1a",
        sectionBg: "#1a1a1a",
      }
    : {
        cardBg: "#ffffff",
        cardBorder: "#e5e5e5",
        textPrimary: "#000",
        textSecondary: "#666",
        textTertiary: "#999",
        tableBorder: "#e5e5e5",
        sectionBg: "#f8f8f8",
      };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !data) return null;

  const sections = [
    {
      title: "Basic Information",
      icon: "📋",
      fields: [
        {
          label: "Registration Number",
          key: "registration_number",
          icon: "🔢",
        },
        { label: "Generic Name", key: "generic_name", icon: "💊" },
        { label: "Brand Name", key: "brand_name", icon: "🏷️" },
        { label: "Dosage Strength", key: "dosage_strength", icon: "⚖️" },
        { label: "Dosage Form", key: "dosage_form", icon: "💉" },
        { label: "Classification", key: "classification", icon: "📂" },
        { label: "Packaging", key: "packaging", icon: "📦" },
        {
          label: "Pharmacologic Category",
          key: "pharmacologic_category",
          icon: "🧬",
        },
      ],
    },
    {
      title: "Company Information",
      icon: "🏢",
      fields: [
        { label: "Manufacturer", key: "manufacturer", icon: "🏭" },
        { label: "Country", key: "country", icon: "🌍" },
        { label: "Trader", key: "trader", icon: "🤝" },
        { label: "Importer", key: "importer", icon: "📥" },
        { label: "Distributor", key: "distributor", icon: "🚚" },
      ],
    },
    {
      title: "Registration Details",
      icon: "📅",
      fields: [
        { label: "Application Type", key: "app_type", icon: "📄" },
        { label: "Issuance Date", key: "issuance_date", icon: "📆" },
        {
          label: "Expiry Date",
          key: "expiry_date",
          icon: "⏰",
          special: "expiry",
        },
      ],
    },
    {
      title: "Upload Information",
      icon: "☁️",
      fields: [
        { label: "Uploaded By", key: "uploaded_by", icon: "👤" },
        {
          label: "Date Uploaded",
          key: "date_uploaded",
          icon: "📤",
          special: "date",
        },
      ],
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 9998,
          animation: "fadeIn 0.3s ease",
        }}
        onClick={onClose}
      />

      {/* Sliding Drawer Modal */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "75vw",
          height: "100vh",
          background: colors.cardBg,
          boxShadow: "-4px 0 20px rgba(0,0,0,0.3)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.3s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "2rem",
            borderBottom: `1px solid ${colors.tableBorder}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: colors.sectionBg,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
              }}
            >
              💊
            </div>
            <div>
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "600",
                  color: colors.textPrimary,
                  marginBottom: "0.25rem",
                }}
              >
                Drug Registration Details
              </h2>
              <p style={{ fontSize: "0.9rem", color: colors.textSecondary }}>
                {data.brand_name || data.generic_name || "N/A"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "transparent",
              border: `1px solid ${colors.cardBorder}`,
              fontSize: "1.5rem",
              color: colors.textTertiary,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.tableBorder;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            ×
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
          <div style={{ display: "grid", gap: "2rem" }}>
            {sections.map((section, sectionIdx) => (
              <div
                key={sectionIdx}
                style={{
                  background: colors.sectionBg,
                  borderRadius: "12px",
                  padding: "1.5rem",
                  border: `1px solid ${colors.cardBorder}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    marginBottom: "1.5rem",
                    paddingBottom: "1rem",
                    borderBottom: `2px solid ${colors.tableBorder}`,
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>{section.icon}</span>
                  <h3
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                    }}
                  >
                    {section.title}
                  </h3>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "1.5rem",
                  }}
                >
                  {section.fields.map((field) => (
                    <div key={field.key}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span style={{ fontSize: "1rem" }}>{field.icon}</span>
                        <label
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            color: colors.textTertiary,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {field.label}
                        </label>
                      </div>
                      <p
                        style={{
                          fontSize: "1rem",
                          color:
                            field.special === "expiry" &&
                            isExpired(data[field.key])
                              ? "#f44336"
                              : field.special === "expiry" && data[field.key]
                                ? "#4CAF50"
                                : colors.textPrimary,
                          fontWeight: "500",
                          padding: "0.5rem 0.75rem",
                          background: colors.cardBg,
                          borderRadius: "6px",
                          border: `1px solid ${colors.cardBorder}`,
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
            borderTop: `1px solid ${colors.tableBorder}`,
            display: "flex",
            justifyContent: "flex-end",
            background: colors.sectionBg,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "0.75rem 2rem",
              background: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "0.95rem",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(76, 175, 80, 0.3)",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
            }}
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
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}

export default FDAViewModal;
