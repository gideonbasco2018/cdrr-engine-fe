// src/components/eapplication/GeneratedDocumentsModal.jsx
import { useEffect, useMemo, useState } from "react";
import { getClaimedApplication } from "../../api/appointmentRecords.js";
import { getPapersForRow } from "./processRegistry.js";
import { PdfViewer } from "./paymentVerification/PaymentShared.jsx";

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const stamp = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-PH", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : "—";

const TYPE_STYLES = {
  OOP: { label: "Order of Payment", icon: "💳", color: "#2563eb" },
  AOOP: { label: "Additional Order of Payment", icon: "➕", color: "#d97706" },
  AR: { label: "Acknowledgement Receipt", icon: "🧾", color: "#059669" },
};

const TONES = {
  success: "#059669",
  warning: "#d97706",
  danger: "#dc2626",
  neutral: "#6b7280",
};

// Original OP first, then additional OPs in the order they were issued
const byOrder = (a, b) => {
  if (a.op_type !== b.op_type) return a.op_type === "INITIAL" ? -1 : 1;
  return String(a.issued_at || "").localeCompare(String(b.issued_at || ""));
};

/* Builds the document list from the application's real orders of payment.
   - every order of payment is a document (OOP or Additional OOP)
   - every order of payment that has posted payments also has an
     Acknowledgement Receipt */
const buildDocuments = (data, referenceNumber) => {
  const ops = [...(data?.orders_of_payment || [])].sort(byOrder);
  const initial = ops.find((op) => op.op_type === "INITIAL");
  const originalDue = initial ? Number(initial.total_amount) : 0;

  const docs = [];
  let paidBefore = 0; // total paid on the earlier orders of payment

  ops.forEach((op, index) => {
    const due = Number(op.total_amount);
    const verifications = [...(op.verifications || [])].sort((a, b) =>
      String(a.verified_at || "").localeCompare(String(b.verified_at || "")),
    );
    const paid = verifications.reduce(
      (sum, v) => sum + Number(v.amount_paid),
      0,
    );
    const balance = +(due - paid).toFixed(2);
    const refNo = op.op_number || referenceNumber;
    const isAdditional = op.op_type === "ADDITIONAL";
    const next = ops[index + 1];
    const nextRef = next ? next.op_number || referenceNumber : null;

    let status;
    let note;
    if (verifications.length === 0) {
      status = { label: "Unpaid", tone: "neutral" };
      note = "Waiting for payment";
    } else if (balance > 0) {
      status = { label: `Short by ${peso(balance)}`, tone: "danger" };
      note = `Paid ${peso(paid)} of ${peso(due)}${
        nextRef ? ` · Balance moved to ${nextRef}` : ""
      }`;
    } else {
      status = { label: "Fully Paid", tone: "success" };
      note = `Paid ${peso(paid)} of ${peso(due)}`;
    }

    docs.push({
      id: op.op_uuid,
      type: isAdditional ? "AOOP" : "OOP",
      refNo,
      generatedOn: stamp(op.issued_at),
      amount: due,
      amountLabel: "Amount due",
      status,
      note,
      op,
      originalDue,
      alreadyPaid: paidBefore,
      remarks: op.deficiency_reason || "",
    });

    if (verifications.length > 0) {
      const lastVerified = verifications[verifications.length - 1];
      docs.push({
        id: `ar-${op.op_uuid}`,
        type: "AR",
        refNo: referenceNumber,
        generatedOn: stamp(lastVerified.verified_at),
        amount: paid,
        amountLabel: "Amount paid",
        status:
          balance > 0
            ? { label: "Partial Payment", tone: "warning" }
            : { label: "Full Payment", tone: "success" },
        note: `Payment for ${refNo}`,
        payments: verifications.map((v) => ({
          dateOfPayment: v.date_of_payment,
          orNo: v.official_receipt_number,
        })),
        postingStamp: stamp(lastVerified.verified_at),
        // Optional: the backend may send the cashier's name; otherwise the
        // viewer's name (cashierName prop) is shown.
        cashierName: lastVerified.verified_by_name || null,
      });
    }

    paidBefore += paid;
  });

  return docs;
};

export default function GeneratedDocumentsModal({
  row,
  colors,
  cashierName = "Cashier",
  cashierPosition = "Cashier",
  onClose,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const referenceNo = row?.referenceNo;

  useEffect(() => {
    if (!referenceNo) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getClaimedApplication(referenceNo)
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
  }, [referenceNo]);

  const referenceNumber = data?.reference_number || referenceNo;
  const docs = useMemo(
    () => (data ? buildDocuments(data, referenceNumber) : []),
    [data, referenceNumber],
  );

  if (!row) return null;

  // The papers come from the folder of the process this application belongs to
  const Papers = getPapersForRow(row);
  const formData = data?.form_data || {};
  const info = {
    activity: data?.activity,
    applicationType: data?.application_type,
    classification: formData["Classification"],
    company: data?.applicant_company,
    email: data?.email_address,
    contactNo: data?.contact_no,
  };

  // Open the most recently generated document first
  const doc = docs.find((d) => d.id === selectedId) || docs[docs.length - 1];

  const renderPaper = () => {
    if (doc.type === "OOP")
      return (
        <Papers.OrderOfPaymentPaper info={info} refNo={doc.refNo} op={doc.op} />
      );
    if (doc.type === "AOOP")
      return (
        <Papers.AdditionalOopPaper
          info={info}
          refNo={doc.refNo}
          originalDue={doc.originalDue}
          alreadyPaid={doc.alreadyPaid}
          additionalDue={doc.amount}
          remarks={doc.remarks}
        />
      );
    return (
      <Papers.AcknowledgementReceiptPaper
        info={info}
        refNo={doc.refNo}
        payments={doc.payments}
        totalPaid={doc.amount}
        postingStamp={doc.postingStamp}
        cashierName={doc.cashierName || cashierName}
        cashierPosition={cashierPosition}
      />
    );
  };

  const renderBody = () => {
    if (loading) {
      return (
        <div
          style={{
            flex: 1,
            padding: "2rem",
            textAlign: "center",
            fontSize: "0.75rem",
            color: colors.textTertiary,
          }}
        >
          Loading documents...
        </div>
      );
    }
    if (error) {
      return (
        <div
          style={{
            margin: "1rem 1.1rem",
            padding: "0.75rem 1rem",
            fontSize: "0.75rem",
            color: "#dc2626",
            background: "rgba(239,68,68,0.10)",
            border: "1px solid rgba(239,68,68,0.35)",
            borderRadius: "8px",
            alignSelf: "flex-start",
          }}
        >
          Could not load documents: {error}
        </div>
      );
    }
    if (docs.length === 0) {
      return (
        <div
          style={{
            flex: 1,
            padding: "2rem",
            textAlign: "center",
            fontSize: "0.75rem",
            color: colors.textTertiary,
          }}
        >
          No documents generated yet.
        </div>
      );
    }

    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: "0.9rem",
          padding: "1rem 1.1rem",
          minHeight: 0,
        }}
      >
        <div
          style={{
            width: "300px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            Documents ({docs.length})
          </div>
          {docs.map((d) => {
            const t = TYPE_STYLES[d.type];
            const tone = TONES[d.status.tone];
            const active = d.id === doc.id;
            return (
              <div
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                style={{
                  cursor: "pointer",
                  padding: "0.6rem 0.75rem",
                  borderRadius: "10px",
                  background: active ? "rgba(76,175,80,0.1)" : colors.cardBg,
                  border: `1px solid ${active ? "#4CAF50" : colors.cardBorder}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <span>{t.icon}</span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: colors.textPrimary,
                    }}
                  >
                    {t.label}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.66rem",
                    color: colors.textTertiary,
                    marginTop: "0.25rem",
                  }}
                >
                  Ref: {d.refNo}
                </div>
                <div
                  style={{ fontSize: "0.66rem", color: colors.textTertiary }}
                >
                  {d.generatedOn}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "0.35rem",
                    gap: "0.4rem",
                  }}
                >
                  <span
                    style={{ fontSize: "0.7rem", color: colors.textPrimary }}
                  >
                    <span
                      style={{ color: colors.textTertiary, fontWeight: 500 }}
                    >
                      {d.amountLabel}{" "}
                    </span>
                    <strong>{peso(d.amount)}</strong>
                  </span>
                  <span
                    style={{
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      padding: "0.1rem 0.5rem",
                      borderRadius: "999px",
                      color: tone,
                      background: `${tone}1A`,
                      border: `1px solid ${tone}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d.status.label}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: "0.3rem",
                    paddingTop: "0.3rem",
                    borderTop: `1px dashed ${colors.tableBorder}`,
                    fontSize: "0.62rem",
                    lineHeight: 1.4,
                    color: colors.textTertiary,
                  }}
                >
                  {d.note}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <PdfViewer
            key={doc.id}
            colors={colors}
            defaultZoom={0.8}
            fileName={`${TYPE_STYLES[doc.type].label} - ${doc.refNo}.pdf`}
          >
            {renderPaper()}
          </PdfViewer>
        </div>
      </div>
    );
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
              📄 Generated Documents · {row.referenceNo}
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

        {renderBody()}
      </div>
    </div>
  );
}
