import { useState } from "react";

function FDAVerificationPortal({ darkMode }) {
  const [searchTerm, setSearchTerm] = useState("");

  // Color scheme
  const colors = darkMode
    ? {
        pageBg: "#0a0a0a",
        cardBg: "#0f0f0f",
        cardBorder: "#1a1a1a",
        textPrimary: "#fff",
        textSecondary: "#999",
        textTertiary: "#666",
        inputBg: "#1a1a1a",
        inputBorder: "#2a2a2a",
        tableBg: "#0f0f0f",
        tableRowEven: "#0a0a0a",
        tableRowOdd: "#0f0f0f",
        tableRowHover: "#151515",
        tableBorder: "#1a1a1a",
        tableText: "#ccc",
        badgeBg: "#1a1a1a",
      }
    : {
        pageBg: "#f8f8f8",
        cardBg: "#ffffff",
        cardBorder: "#e5e5e5",
        textPrimary: "#000",
        textSecondary: "#666",
        textTertiary: "#999",
        inputBg: "#ffffff",
        inputBorder: "#e5e5e5",
        tableBg: "#ffffff",
        tableRowEven: "#ffffff",
        tableRowOdd: "#fafafa",
        tableRowHover: "#f0f0f0",
        tableBorder: "#e5e5e5",
        tableText: "#333",
        badgeBg: "#f5f5f5",
      };

  // Static sample data
  const sampleData = [
    {
      id: 1,
      registration_number: "DR-XY12345678",
      generic_name: "Paracetamol",
      brand_name: "Biogesic",
      dosage_strength: "500mg",
      dosage_form: "Tablet",
      classification: "OTC",
      packaging: "Blister pack of 10s",
      pharmacologic_category: "Analgesic/Antipyretic",
      manufacturer: "United Laboratories Inc.",
      country: "Philippines",
      trader: "N/A",
      importer: "N/A",
      distributor: "United Laboratories Inc.",
      app_type: "New",
      issuance_date: "2023-01-15",
      expiry_date: "2028-01-15",
    },
    {
      id: 2,
      registration_number: "DR-XY87654321",
      generic_name: "Amoxicillin",
      brand_name: "Amoxil",
      dosage_strength: "500mg",
      dosage_form: "Capsule",
      classification: "Prescription",
      packaging: "Box of 100s",
      pharmacologic_category: "Antibiotic",
      manufacturer: "GlaxoSmithKline",
      country: "United Kingdom",
      trader: "GSK Philippines",
      importer: "GSK Philippines",
      distributor: "GSK Philippines",
      app_type: "Renewal",
      issuance_date: "2022-06-20",
      expiry_date: "2027-06-20",
    },
    {
      id: 3,
      registration_number: "DR-XY11223344",
      generic_name: "Losartan Potassium",
      brand_name: "Cozaar",
      dosage_strength: "50mg",
      dosage_form: "Tablet",
      classification: "Prescription",
      packaging: "Blister pack of 30s",
      pharmacologic_category: "Antihypertensive",
      manufacturer: "MSD Philippines Inc.",
      country: "Philippines",
      trader: "N/A",
      importer: "N/A",
      distributor: "MSD Philippines Inc.",
      app_type: "New",
      issuance_date: "2023-03-10",
      expiry_date: "2028-03-10",
    },
    {
      id: 4,
      registration_number: "DR-XY99887766",
      generic_name: "Metformin Hydrochloride",
      brand_name: "Glucophage",
      dosage_strength: "850mg",
      dosage_form: "Tablet",
      classification: "Prescription",
      packaging: "Bottle of 60s",
      pharmacologic_category: "Antidiabetic",
      manufacturer: "Merck Sante",
      country: "France",
      trader: "Merck Inc.",
      importer: "Merck Inc.",
      distributor: "Merck Inc.",
      app_type: "Renewal",
      issuance_date: "2022-11-05",
      expiry_date: "2027-11-05",
    },
    {
      id: 5,
      registration_number: "DR-XY55443322",
      generic_name: "Cetirizine Dihydrochloride",
      brand_name: "Zyrtec",
      dosage_strength: "10mg",
      dosage_form: "Tablet",
      classification: "OTC",
      packaging: "Blister pack of 10s",
      pharmacologic_category: "Antihistamine",
      manufacturer: "UCB Pharma",
      country: "Belgium",
      trader: "GSK Philippines",
      importer: "GSK Philippines",
      distributor: "GSK Philippines",
      app_type: "New",
      issuance_date: "2023-05-18",
      expiry_date: "2028-05-18",
    },
  ];

  // Table columns configuration
  const columns = [
    { key: "registration_number", label: "Registration Number", width: "150px" },
    { key: "generic_name", label: "Generic Name", width: "180px" },
    { key: "brand_name", label: "Brand Name", width: "150px" },
    { key: "dosage_strength", label: "Dosage Strength", width: "120px" },
    { key: "dosage_form", label: "Dosage Form", width: "120px" },
    { key: "classification", label: "Classification", width: "120px" },
    { key: "packaging", label: "Packaging", width: "150px" },
    { key: "pharmacologic_category", label: "Pharmacologic Category", width: "180px" },
    { key: "manufacturer", label: "Manufacturer", width: "200px" },
    { key: "country", label: "Country", width: "120px" },
    { key: "trader", label: "Trader", width: "150px" },
    { key: "importer", label: "Importer", width: "150px" },
    { key: "distributor", label: "Distributor", width: "200px" },
    { key: "app_type", label: "App Type", width: "100px" },
    { key: "issuance_date", label: "Issuance Date", width: "120px" },
    { key: "expiry_date", label: "Expiry Date", width: "120px" },
  ];

  const handleDownloadTemplate = () => {
    alert("📥 Download Template functionality - Coming soon!");
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      alert(`📤 File selected: ${file.name}\n\nUpload functionality - Coming soon!`);
    }
    event.target.value = "";
  };

  return (
    <div
      style={{
        flex: 1,
        padding: "2rem",
        overflowY: "auto",
        background: colors.pageBg,
        transition: "all 0.3s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: "600",
              marginBottom: "0.5rem",
              color: colors.textPrimary,
              transition: "color 0.3s ease",
            }}
          >
            FDA Verification Portal
          </h1>
          <p
            style={{
              color: colors.textTertiary,
              fontSize: "0.9rem",
              transition: "color 0.3s ease",
            }}
          >
            Verify and manage FDA registered pharmaceutical products
          </p>
        </div>

        {/* Upload & Download Buttons */}
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={handleDownloadTemplate}
            style={{
              padding: "0.75rem 1.5rem",
              background: "transparent",
              border: `2px solid ${colors.cardBorder}`,
              borderRadius: "8px",
              color: colors.textPrimary,
              fontSize: "0.9rem",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#4CAF50";
              e.currentTarget.style.color = "#4CAF50";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.cardBorder;
              e.currentTarget.style.color = colors.textPrimary;
            }}
          >
            <span>📥</span>
            <span>Download Template</span>
          </button>

          <label
            style={{
              padding: "0.75rem 1.5rem",
              background: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "0.9rem",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 12px rgba(76, 175, 80, 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(76, 175, 80, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(76, 175, 80, 0.3)";
            }}
          >
            <span>📤</span>
            <span>Upload New Data</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            padding: "1.5rem",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "0.5rem",
            }}
          >
            <span style={{ fontSize: "2rem" }}>📋</span>
            <div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: colors.textTertiary,
                  marginBottom: "0.25rem",
                }}
              >
                Total Products
              </p>
              <p
                style={{
                  fontSize: "1.75rem",
                  fontWeight: "700",
                  color: colors.textPrimary,
                }}
              >
                {sampleData.length}
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            padding: "1.5rem",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "0.5rem",
            }}
          >
            <span style={{ fontSize: "2rem" }}>✅</span>
            <div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: colors.textTertiary,
                  marginBottom: "0.25rem",
                }}
              >
                Verified Products
              </p>
              <p
                style={{
                  fontSize: "1.75rem",
                  fontWeight: "700",
                  color: "#4CAF50",
                }}
              >
                {sampleData.length}
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            padding: "1.5rem",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "0.5rem",
            }}
          >
            <span style={{ fontSize: "2rem" }}>🏭</span>
            <div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: colors.textTertiary,
                  marginBottom: "0.25rem",
                }}
              >
                Manufacturers
              </p>
              <p
                style={{
                  fontSize: "1.75rem",
                  fontWeight: "700",
                  color: colors.textPrimary,
                }}
              >
                {new Set(sampleData.map((item) => item.manufacturer)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          padding: "1.25rem",
          marginBottom: "1.5rem",
          transition: "all 0.3s ease",
        }}
      >
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search (Registration Number, Generic Name, Brand Name, etc...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem 1rem 0.75rem 2.5rem",
              background: colors.inputBg,
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: "8px",
              color: colors.textPrimary,
              fontSize: "0.9rem",
              outline: "none",
              transition: "all 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
            onBlur={(e) => (e.target.style.borderColor = colors.inputBorder)}
          />
          <span
            style={{
              position: "absolute",
              left: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: colors.textTertiary,
              fontSize: "1rem",
            }}
          >
            🔍
          </span>
        </div>
      </div>

      {/* Data Table */}
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          overflow: "hidden",
          transition: "all 0.3s ease",
        }}
      >
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: `1px solid ${colors.tableBorder}`,
          }}
        >
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: "600",
              color: colors.textPrimary,
            }}
          >
            Registered Products
          </h3>
        </div>

        <div style={{ overflowX: "auto", maxHeight: "600px", overflowY: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "2500px",
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                background: colors.tableBg,
                zIndex: 10,
              }}
            >
              <tr>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    width: "60px",
                  }}
                >
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: `1px solid ${colors.tableBorder}`,
                      minWidth: col.width,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {sampleData.map((row, index) => {
                const rowBg =
                  index % 2 === 0 ? colors.tableRowEven : colors.tableRowOdd;

                return (
                  <tr
                    key={row.id}
                    style={{
                      background: rowBg,
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors.tableRowHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = rowBg;
                    }}
                  >
                    <td
                      style={{
                        padding: "1rem",
                        fontSize: "0.85rem",
                        fontWeight: "700",
                        color: colors.textTertiary,
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        textAlign: "center",
                      }}
                    >
                      {index + 1}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: "1rem",
                          fontSize: "0.85rem",
                          color: colors.tableText,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                        }}
                      >
                        {row[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: `1px solid ${colors.tableBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              color: colors.textTertiary,
              fontSize: "0.85rem",
            }}
          >
            Showing {sampleData.length} of {sampleData.length} records
          </div>
        </div>
      </div>
    </div>
  );
}

export default FDAVerificationPortal;