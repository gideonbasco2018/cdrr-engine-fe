// src/components/eapplication/processes/cpr/CprDetailsModal.jsx
import { useEffect, useState } from "react";
import { getClaimedApplication } from "../../../../api/appointmentRecords.js";

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const PRODUCT_FIELDS = [
  "Brand Name",
  "Generic Name",
  "Dosage Strength",
  "Dosage Form and Route of Administration",
  "Classification",
  "Product Category",
  "Essential Drug List",
  "Pharmacologic Category",
  "Shelf Life",
  "Storage Condition",
  "Packaging",
  "Suggested Retail Price",
  "Registration Number",
  "Mother Application Type",
  "Old RSN/ Other DTN",
];

function Section({ title, colors, children }) {
  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "0.5rem 0.85rem",
          fontSize: "0.72rem",
          fontWeight: 700,
          color: colors.textPrimary,
          background: colors.tableBg,
          borderBottom: `1px solid ${colors.cardBorder}`,
        }}
      >
        {title}
      </div>
      <div style={{ padding: "0.5rem 0.85rem" }}>{children}</div>
    </div>
  );
}

function Field({ label, value, colors }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        padding: "0.28rem 0",
        fontSize: "0.7rem",
      }}
    >
      <span
        style={{ width: "150px", flexShrink: 0, color: colors.textTertiary }}
      >
        {label}
      </span>
      <span
        style={{
          color: colors.textPrimary,
          fontWeight: 500,
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </span>
    </div>
  );
}

export default function CprDetailsModal({ row, colors, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getClaimedApplication(row.referenceNo)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [row.referenceNo]);

  const form = data?.form_data || {};
  const parties = data?.parties || [];
  const orders = data?.orders_of_payment || [];

  const thStyle = {
    padding: "0.4rem 0.6rem",
    textAlign: "left",
    fontSize: "0.55rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: colors.textTertiary,
    borderBottom: `1px solid ${colors.tableBorder}`,
    background: colors.tableBg,
    whiteSpace: "nowrap",
  };
  const tdStyle = {
    padding: "0.45rem 0.6rem",
    fontSize: "0.68rem",
    color: colors.tableText,
    borderBottom: `1px solid ${colors.tableBorder}`,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.pageBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          width: "1100px",
          maxWidth: "96vw",
          height: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1.1rem",
            background: colors.cardBg,
            borderBottom: `1px solid ${colors.cardBorder}`,
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              👁️ {row.referenceNo}
            </div>
            <div style={{ fontSize: "0.68rem", color: colors.textTertiary }}>
              {row.applicantCompany}
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close"
            style={{
              border: "none",
              background: "transparent",
              color: colors.textTertiary,
              fontSize: "1.2rem",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.1rem" }}>
          {loading && (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                fontSize: "0.75rem",
                color: colors.textTertiary,
              }}
            >
              Loading application details...
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "0.75rem 1rem",
                fontSize: "0.75rem",
                color: "#dc2626",
                background: "rgba(239,68,68,0.10)",
                border: "1px solid rgba(239,68,68,0.35)",
                borderRadius: "8px",
              }}
            >
              Could not load application details: {error}
            </div>
          )}

          {data && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.9rem",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                  gap: "0.9rem",
                }}
              >
                <Section title="Application Information" colors={colors}>
                  <Field
                    label="Reference Number"
                    value={data.reference_number}
                    colors={colors}
                  />
                  <Field
                    label="Activity"
                    value={data.activity}
                    colors={colors}
                  />
                  <Field
                    label="Application Type"
                    value={data.application_type}
                    colors={colors}
                  />
                  <Field
                    label="Scheduled Date"
                    value={form["Scheduled Date"]}
                    colors={colors}
                  />
                  <Field
                    label="Time Slot"
                    value={form["Time Slot"]}
                    colors={colors}
                  />
                  <Field
                    label="Remarks"
                    value={form["Remarks"]}
                    colors={colors}
                  />
                </Section>

                <Section title="Establishment" colors={colors}>
                  <Field
                    label="Company"
                    value={data.applicant_company}
                    colors={colors}
                  />
                  <Field
                    label="LTO Number"
                    value={data.lto_no}
                    colors={colors}
                  />
                  <Field
                    label="LTO Validity"
                    value={form["Validity"]}
                    colors={colors}
                  />
                  <Field label="TIN" value={data.tin} colors={colors} />
                  <Field
                    label="Email"
                    value={data.email_address}
                    colors={colors}
                  />
                  <Field
                    label="Contact No."
                    value={data.contact_no}
                    colors={colors}
                  />
                  <Field label="Address" value={data.address} colors={colors} />
                </Section>

                <Section title="Product" colors={colors}>
                  {PRODUCT_FIELDS.map((key) => (
                    <Field
                      key={key}
                      label={key}
                      value={form[key]}
                      colors={colors}
                    />
                  ))}
                </Section>

                <Section title="Order of Payment" colors={colors}>
                  {orders.length === 0 ? (
                    <div
                      style={{ fontSize: "0.7rem", color: colors.textTertiary }}
                    >
                      No order of payment yet.
                    </div>
                  ) : (
                    orders.map((op) => (
                      <div
                        key={op.op_uuid}
                        style={{
                          paddingBottom: "0.4rem",
                          marginBottom: "0.4rem",
                          borderBottom: `1px dashed ${colors.tableBorder}`,
                        }}
                      >
                        <Field
                          label="Type"
                          value={`${op.op_type} (${op.status})`}
                          colors={colors}
                        />
                        <Field
                          label="Application Fee"
                          value={peso(op.application_fee)}
                          colors={colors}
                        />
                        <Field
                          label="Legal Research Fund"
                          value={peso(op.lrf_amount)}
                          colors={colors}
                        />
                        <Field
                          label="Surcharge"
                          value={peso(op.surcharge)}
                          colors={colors}
                        />
                        <Field
                          label="Total Amount"
                          value={peso(op.total_amount)}
                          colors={colors}
                        />
                      </div>
                    ))
                  )}
                </Section>
              </div>

              <Section title={`Parties (${parties.length})`} colors={colors}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Type</th>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}>Address</th>
                        <th style={thStyle}>TIN</th>
                        <th style={thStyle}>LTO No.</th>
                        <th style={thStyle}>Country</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parties.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            style={{
                              ...tdStyle,
                              textAlign: "center",
                              color: colors.textTertiary,
                            }}
                          >
                            No parties.
                          </td>
                        </tr>
                      ) : (
                        parties.map((p) => (
                          <tr key={p.party_type}>
                            <td style={tdStyle}>{p.party_type}</td>
                            <td style={tdStyle}>{p.name || "—"}</td>
                            <td style={tdStyle}>{p.address || "—"}</td>
                            <td style={tdStyle}>{p.tin || "—"}</td>
                            <td style={tdStyle}>{p.lto_no || "—"}</td>
                            <td style={tdStyle}>{p.country || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Section>

              {data.drive_link && (
                <Section title="Submitted Files" colors={colors}>
                  <a
                    href={data.drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "0.72rem", color: "#2196F3" }}
                  >
                    📁 Open Google Drive folder
                  </a>
                </Section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
