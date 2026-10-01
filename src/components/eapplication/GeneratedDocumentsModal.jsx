import { useState, useMemo } from "react";
import {
  AMOUNT_DUE,
  PdfViewer,
  OrderOfPaymentPaper,
  AdditionalOopPaper,
  AcknowledgementReceiptPaper,
} from "./processes/mivn/MivnDetailsModal.jsx";

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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

/* TODO: replace with an API call, e.g. await getGeneratedDocuments(row.id).
   Each item should carry a real `pdfUrl` from the backend. */
/* TODO: replace with an API call, e.g. await getGeneratedDocuments(row.id).
   Each item should carry a real `pdfUrl` from the backend. */
const buildDocuments = (row) => {
  const receipts = row.receipts || [];
  const aoops = row.additionalOops || [];

  // Documents that ask for payment: the original OOP, then each Additional OOP.
  // Payable #j is paid by receipt #j.
  const payables = [
    {
      kind: "OOP",
      id: "oop",
      refNo: row.referenceNo,
      generatedOn: "13 July 2026 09:45", // TODO: real date from backend
      due: AMOUNT_DUE,
    },
    ...aoops.map((a) => ({
      kind: "AOOP",
      id: `aoop-${a.id}`,
      refNo: a.refNo,
      generatedOn: a.generatedOn,
      due: a.balance,
      alreadyPaid: a.alreadyPaid,
      remarks: a.remarks,
    })),
  ];

  const docs = [];
  payables.forEach((p, j) => {
    const r = receipts[j];
    const paid = r ? Number(r.totalPaid) : 0;
    const balance = +(p.due - paid).toFixed(2);
    const next = payables[j + 1];

    let status;
    let note;
    if (!r) {
      status = { label: "Unpaid", tone: "neutral" };
      note = "Waiting for payment";
    } else if (balance > 0) {
      status = { label: `Short by ${peso(balance)}`, tone: "danger" };
      note = `Paid ${peso(paid)} of ${peso(p.due)}${
        next ? ` · Balance moved to ${next.refNo}` : ""
      }`;
    } else {
      status = { label: "Fully Paid", tone: "success" };
      note = `Paid ${peso(paid)} of ${peso(p.due)}`;
    }

    docs.push({
      id: p.id,
      type: p.kind,
      refNo: p.refNo,
      generatedOn: p.generatedOn,
      amount: p.due,
      amountLabel: "Amount due",
      status,
      note,
      alreadyPaid: p.alreadyPaid,
      remarks: p.remarks,
      pdfUrl: null,
    });

    if (r) {
      docs.push({
        id: `ar-${r.id}`,
        type: "AR",
        refNo: row.referenceNo,
        generatedOn: r.postingStamp,
        amount: paid,
        amountLabel: "Amount paid",
        status:
          balance > 0
            ? { label: "Partial Payment", tone: "warning" }
            : { label: "Full Payment", tone: "success" },
        note: `Payment for ${p.refNo}`,
        payments: r.payments,
        postingStamp: r.postingStamp,
        pdfUrl: null,
      });
    }
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
  const docs = useMemo(() => (row ? buildDocuments(row) : []), [row]);
  // Open the most recently generated document first
  const [selectedId, setSelectedId] = useState(docs[docs.length - 1]?.id);

  if (!row) return null;
  const doc = docs.find((d) => d.id === selectedId) || docs[docs.length - 1];

  const renderPaper = () => {
    if (doc.type === "OOP")
      return <OrderOfPaymentPaper row={row} refNo={doc.refNo} />;
    if (doc.type === "AOOP")
      return (
        <AdditionalOopPaper
          row={row}
          refNo={doc.refNo}
          originalDue={AMOUNT_DUE}
          alreadyPaid={doc.alreadyPaid}
          additionalDue={doc.amount}
          remarks={doc.remarks}
        />
      );
    return (
      <AcknowledgementReceiptPaper
        row={row}
        refNo={doc.refNo}
        payments={doc.payments}
        totalPaid={doc.amount}
        postingStamp={doc.postingStamp}
        cashierName={cashierName}
        cashierPosition={cashierPosition}
      />
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

        {/* Body: list + viewer */}
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
              pdfUrl={doc.pdfUrl || undefined}
            >
              {renderPaper()}
            </PdfViewer>
          </div>
        </div>
      </div>
    </div>
  );
}
