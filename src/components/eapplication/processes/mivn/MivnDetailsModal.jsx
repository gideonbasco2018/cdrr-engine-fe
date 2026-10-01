// src/components/eapplication/processes/mivn/MivnDetailsModal.jsx
import { useState, useMemo } from "react";

const PAYMENT_TYPES = [
  "FDA Cashier",
  "LANDBANK ONCOLL",
  "LANDBANK Link.BizPortal",
];

/* TODO: replace with real pre-assessment data from the API */
const PRE_ASSESSMENT = {
  dateTime: "13 July 2026 09:32:37",
  assessor: "CDRR20",
  position: "FDRO I",
  office: "Center for Drug Regulation and Research",
};

const uniq = (arr) => [...new Set(arr.filter(Boolean))].join(", ");

const formatLongDate = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

const STEPS = [
  { id: 1, label: "Application Details", icon: "📋" },
  { id: 2, label: "Order of Payment", icon: "💳" },
  { id: 3, label: "Acknowledgement Receipt", icon: "🧾" },
];

const STEP_4 = { id: 4, label: "Additional Order of Payment", icon: "➕" };

/* TODO: replace with the real Order of Payment items from the backend */
const ORDER_OF_PAYMENT_ITEMS = [
  { label: "Application Fee", amount: 7500 },
  { label: "Surcharge (if any)", amount: 0 },
  { label: "Legal Research Fund (LRF)", amount: 75 },
];
export const AMOUNT_DUE = ORDER_OF_PAYMENT_ITEMS.reduce(
  (sum, i) => sum + i.amount,
  0,
);
const MAX_REMARKS_LENGTH = 500;
const BANCNET_FEE = 15; // extra fee when paying through BancNet

/* Header logos. Put the JPG files in your app's public/images/ folder
   (served from /images/...). Until a file exists, a dashed placeholder is shown. */
const OOP_LOGOS = {
  fda: "/images/fda-logo.png",
  doh: "/images/doh-logo.png",
  bagongPilipinas: "/images/bagong-pilipinas-logo.png",
};

const OOP_AUTHORIZATION = "Minor Variation - Notification";

/* TODO: replace with real data from the API (application / establishment record) */
const OOP_STATIC = {
  productType: "Drug",
  email: "regulatory@torrentpharma.com.ph",
  mobile: "0917 123 4567",
  landline: "(02) 8123 4567",
};

const EMPTY_FORM = {
  paymentType: "",
  orNo: "",
  dateOfPayment: "",
  amountPaid: "",
};

const php = (n) =>
  `Php ${Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/* TODO: replace with real data from the API (application details endpoint) */
const getStaticDetails = (row) => [
  {
    title: "Application Information",
    fields: [
      ["Reference Number", row.referenceNo],
      ["Activity", row.activity],
      ["Application Step", row.applicationStep],
      ["Priority", row.priority],
      ["Due Date", row.dueDate],
      ["Last Modified", row.lastModified],
    ],
  },
  {
    title: "Establishment",
    fields: [
      ["Company", row.applicantCompany],
      ["LTO Number", "LTO-2024-000123"],
      ["LTO Validity", "2027-03-31"],
      ["TIN", "123-456-789-000"],
      ["Contact No.", "0917 123 4567"],
      ["Address", "123 Ayala Ave., Makati City, Metro Manila"],
    ],
  },
  {
    title: "Product",
    fields: [
      ["Brand Name", "Sample Brand"],
      ["Generic Name", "Paracetamol"],
      ["Dosage Strength", "500 mg"],
      ["Dosage Form", "Tablet"],
      ["Classification", "Over-the-Counter (OTC)"],
      ["Pharmacologic Category", "Analgesic / Antipyretic"],
    ],
  },
  {
    title: "Manufacturer / Trader",
    fields: [
      ["Manufacturer", "Sample Pharma Manufacturing Corp."],
      ["Country", "Philippines"],
      ["Trader", row.applicantCompany],
      ["Distributor", "Sample Distribution Inc."],
      ["Storage Condition", "Store below 30°C"],
      ["Packaging", "Box of 100 tablets (10 x 10)"],
    ],
  },
];

/* ── Mock PDF viewer. Uses an iframe when pdfUrl is provided; otherwise renders the children (mock paper) ── */
export function PdfViewer({
  colors,
  fileName,
  pdfUrl,
  defaultZoom = 0.7,
  children,
}) {
  const [zoom, setZoom] = useState(defaultZoom);
  const zoomBtn = {
    width: "24px",
    height: "24px",
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: "5px",
    background: colors.cardBg,
    color: colors.textPrimary,
    cursor: "pointer",
    fontSize: "0.8rem",
    lineHeight: 1,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "10px",
        overflow: "hidden",
        height: "100%",
        minHeight: "360px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.45rem 0.75rem",
          background: colors.tableBg,
          borderBottom: `1px solid ${colors.cardBorder}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 600,
            color: colors.textPrimary,
          }}
        >
          📄 {fileName} · A4
        </span>
        {!pdfUrl && (
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <button
              style={zoomBtn}
              onClick={() =>
                setZoom((z) => Math.max(0.3, +(z - 0.1).toFixed(1)))
              }
            >
              −
            </button>
            <span
              style={{
                fontSize: "0.62rem",
                color: colors.textTertiary,
                minWidth: "34px",
                textAlign: "center",
              }}
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              style={zoomBtn}
              onClick={() =>
                setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(1)))
              }
            >
              +
            </button>
          </div>
        )}
      </div>

      {pdfUrl ? (
        <iframe
          title={fileName}
          src={pdfUrl}
          style={{ flex: 1, border: "none", width: "100%" }}
        />
      ) : (
        <div
          style={{
            flex: 1,
            overflow: "auto",
            background: "#6b7280",
            padding: "1rem",
          }}
        >
          <div
            style={{
              zoom,
              /* A4 = 210mm x 297mm ≈ 794px x 1123px @ 96dpi */
              width: "794px",
              minHeight: "1123px",
              boxSizing: "border-box",
              margin: "0 auto",
              background: "#fff",
              color: "#111",
              padding: "72px 64px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
              fontSize: "14px",
              lineHeight: 1.7,
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

function PaperRow({ label, value }) {
  return (
    <div style={{ display: "flex", padding: "5px 0" }}>
      <div style={{ width: "230px", fontWeight: 700, flexShrink: 0 }}>
        {label}
      </div>
      <div
        style={{
          flex: 1,
          borderBottom: "1px solid #999",
          minHeight: "1.1rem",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ───────────── Order of Payment paper (A4) ───────────── */
function LogoImage({ src, alt, width, height }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        style={{
          width,
          height,
          border: "1px dashed #999",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "11px",
          color: "#555",
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        {alt}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      style={{ width, height, objectFit: "contain", flexShrink: 0 }}
    />
  );
}

function OopHeader({ title, subtitle }) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <LogoImage
            src={OOP_LOGOS.fda}
            alt="FDA logo"
            width="110px"
            height="64px"
          />
          <LogoImage
            src={OOP_LOGOS.doh}
            alt="DOH seal"
            width="64px"
            height="64px"
          />
        </div>
        <div
          style={{
            borderLeft: "1px solid #111",
            paddingLeft: "14px",
            flex: 1,
            lineHeight: 1.35,
          }}
        >
          <div style={{ fontSize: "14px" }}>Republic of the Philippines</div>
          <div style={{ fontSize: "16px" }}>Department of Health</div>
          <div style={{ fontSize: "16px", fontWeight: 700 }}>
            FOOD AND DRUG ADMINISTRATION
          </div>
        </div>
        <LogoImage
          src={OOP_LOGOS.bagongPilipinas}
          alt="Bagong Pilipinas"
          width="96px"
          height="64px"
        />
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: "22px",
          fontWeight: 700,
          letterSpacing: "1px",
          margin: "14px 0 4px",
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            textAlign: "center",
            fontSize: "13px",
            fontWeight: 700,
            marginBottom: "10px",
          }}
        >
          {subtitle}
        </div>
      )}
    </>
  );
}

function OopSection({ title, rows }) {
  return (
    <div style={{ margin: "16px 0" }}>
      <div
        style={{
          fontWeight: 700,
          textDecoration: "underline",
          marginBottom: "4px",
        }}
      >
        {title}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map(([label, value, bold]) => (
            <tr key={label}>
              <td
                style={{
                  width: "38%",
                  padding: "3px 0",
                  verticalAlign: "top",
                  fontWeight: bold ? 700 : 400,
                  borderTop: bold ? "1px solid #111" : "none",
                }}
              >
                {label}
              </td>
              <td
                style={{
                  padding: "3px 0",
                  verticalAlign: "top",
                  fontWeight: bold ? 700 : 400,
                  borderTop: bold ? "1px solid #111" : "none",
                }}
              >
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OopNotices({ bancnetAmount }) {
  return (
    <div style={{ color: "#c00000", fontSize: "12.5px", lineHeight: 1.45 }}>
      <p style={{ margin: "0 0 8px" }}>
        Your application has passed the pre-assessment phase. Please pay the
        corresponding amount indicated above. Evaluation of your application
        shall commence after a payment was made and posted on our system. Kindly
        present this document upon payment thru landbank.
      </p>
      <p style={{ margin: "0 0 8px" }}>
        If payment is made using Bancnet Online Bills Payment Facility
        (www.bancnetonline.com), an additional Php15.00 should be included to
        the amount due.
      </p>
      <p style={{ margin: 0, fontSize: "14px" }}>
        BancNet Amount: <strong>{php(bancnetAmount)}</strong>
      </p>
    </div>
  );
}

const getGeneralInfoRows = (row, refNo) => [
  ["Reference Number:", refNo],
  ["Authorization:", OOP_AUTHORIZATION],
  ["Type of Application:", row.activity],
  ["Product Type:", OOP_STATIC.productType],
  ["Name of Establishment:", row.applicantCompany],
  ["E-mail Address:", OOP_STATIC.email],
  ["Mobile Number:", OOP_STATIC.mobile],
  ["Landline Number:", OOP_STATIC.landline],
];

/* Original Order of Payment */
export function OrderOfPaymentPaper({ row, refNo }) {
  return (
    <>
      <OopHeader title="ORDER OF PAYMENT" />
      <OopSection
        title="General Information"
        rows={getGeneralInfoRows(row, refNo)}
      />
      <OopSection
        title="Payment Details"
        rows={[
          ...ORDER_OF_PAYMENT_ITEMS.map((i) => [`${i.label}:`, php(i.amount)]),
          ["Total Amount:", php(AMOUNT_DUE), true],
        ]}
      />
      <OopNotices bancnetAmount={AMOUNT_DUE + BANCNET_FEE} />
    </>
  );
}

/* Additional Order of Payment (used in Step 2 on a follow-up visit and in Step 4) */
export function AdditionalOopPaper({
  row,
  refNo,
  originalDue,
  alreadyPaid,
  additionalDue,
  remarks,
}) {
  return (
    <>
      <OopHeader title="ORDER OF PAYMENT" subtitle="(ADDITIONAL)" />
      {/* TODO: real reference number from the backend */}
      <OopSection
        title="General Information"
        rows={getGeneralInfoRows(row, refNo)}
      />
      <OopSection
        title="Payment Details"
        rows={[
          ["Original Amount Due:", php(originalDue)],
          ["Total Amount Paid:", php(alreadyPaid)],
          ["Additional Amount Due:", php(additionalDue), true],
        ]}
      />
      <div style={{ margin: "16px 0" }}>
        <div style={{ fontWeight: 700, marginBottom: "4px" }}>
          REMARKS / NOTES:
        </div>
        <div
          style={{
            border: "1px solid #999",
            minHeight: "90px",
            padding: "8px 10px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {remarks}
        </div>
      </div>
      <OopNotices bancnetAmount={additionalDue + BANCNET_FEE} />
    </>
  );
}

/* Acknowledgement Receipt */
export function AcknowledgementReceiptPaper({
  row,
  refNo,
  payments,
  totalPaid,
  postingStamp,
  cashierName,
  cashierPosition,
}) {
  return (
    <>
      <OopHeader title="ACKNOWLEDGEMENT RECEIPT" />
      <OopSection
        title="General Information"
        rows={getGeneralInfoRows(row, refNo)}
      />
      <OopSection
        title="PRE-ASSESSMENT DETAILS:"
        rows={[
          ["Date and Time of Pre-Assessment:", PRE_ASSESSMENT.dateTime],
          ["Pre-Assessor:", PRE_ASSESSMENT.assessor],
          ["Position / Designation:", PRE_ASSESSMENT.position],
          ["Center / Office:", PRE_ASSESSMENT.office],
        ]}
      />
      <OopSection
        title="VERIFICATION AND POSTING DETAILS:"
        rows={[
          [
            "Date of Payment:",
            uniq(payments.map((p) => formatLongDate(p.dateOfPayment))),
          ],
          ["Date and Time of Posting:", postingStamp],
          ["FDA Cashier Officer:", cashierName],
          ["Position / Designation:", cashierPosition],
          ["OR Number:", uniq(payments.map((p) => p.orNo))],
          ["Total Amount Paid:", payments.length ? php(totalPaid) : ""],
        ]}
      />
      <p
        style={{
          color: "#c00000",
          fontSize: "12.5px",
          lineHeight: 1.45,
          margin: "28px 0 0",
        }}
      >
        This serves as your Acknowledgement Receipt. Complete payment and
        application have been successfully submitted. Status of your application
        shall be sent through the email address indicated above.
      </p>
    </>
  );
}

function ConfirmPostModal({
  row,
  colors,
  totalPaid,
  balance,
  hasBalance,
  onConfirm,
  onCancel,
}) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10001,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          padding: "1.25rem",
          width: "400px",
          maxWidth: "90vw",
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.6rem",
          }}
        >
          <span style={{ fontSize: "1.3rem" }}>❓</span>
          <h3
            style={{
              margin: 0,
              fontSize: "0.95rem",
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            Are you sure you want to post?
          </h3>
        </div>
        <p
          style={{
            margin: "0 0 0.6rem",
            fontSize: "0.75rem",
            color: colors.textTertiary,
            lineHeight: 1.5,
          }}
        >
          You are about to post a payment of{" "}
          <strong style={{ color: colors.textPrimary }}>
            {peso(totalPaid)}
          </strong>{" "}
          for{" "}
          <strong style={{ color: colors.textPrimary }}>
            {row.referenceNo}
          </strong>
          . This cannot be changed after posting.
        </p>
        {hasBalance && (
          <p
            style={{
              margin: "0 0 0.9rem",
              padding: "0.5rem 0.65rem",
              fontSize: "0.72rem",
              lineHeight: 1.5,
              color: "#b45309",
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.35)",
              borderRadius: "8px",
            }}
          >
            ⚠️ The payment is short by <strong>{peso(balance)}</strong>. An
            Additional Order of Payment will be generated for the balance.
          </p>
        )}
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.72rem",
              fontWeight: 600,
              borderRadius: "6px",
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textPrimary,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.72rem",
              fontWeight: 700,
              borderRadius: "6px",
              border: "none",
              background: "linear-gradient(135deg,#4CAF50,#43A047)",
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(76,175,80,0.35)",
            }}
          >
            ✔ Yes, Post
          </button>
        </div>
      </div>
    </div>
  );
}

/* Confirms the payment details (and flags overpayment / short payment) before adding to the table */
function ConfirmAddPaymentModal({
  colors,
  payment,
  amountDue,
  paidSoFar,
  onConfirm,
  onCancel,
}) {
  const amount = Number(payment.amountPaid);
  const projected = +(paidSoFar + amount).toFixed(2);
  const diff = +(projected - amountDue).toFixed(2); // > 0 overpaid, < 0 short

  const status =
    diff > 0
      ? {
          icon: "⚠️",
          color: "#b45309",
          bg: "rgba(245,158,11,0.12)",
          border: "rgba(245,158,11,0.35)",
          text: `Overpayment: the total paid (${peso(projected)}) exceeds the amount due by ${peso(diff)}. Please confirm this is correct.`,
        }
      : diff < 0
        ? {
            icon: "⚠️",
            color: "#dc2626",
            bg: "rgba(239,68,68,0.10)",
            border: "rgba(239,68,68,0.35)",
            text: `Short payment: ${peso(-diff)} will still be unpaid after this payment. Confirm only if the payer really paid less than the amount due. You can still add another payment.`,
          }
        : {
            icon: "✅",
            color: "#059669",
            bg: "rgba(16,185,129,0.10)",
            border: "rgba(16,185,129,0.35)",
            text: "The total paid matches the amount due.",
          };

  const details = [
    ["Reference Number", payment.referenceNo],
    ["Type of Payment", payment.paymentType],
    ["OR Number", payment.orNo],
    ["Date of Payment", payment.dateOfPayment],
    ["Amount Paid", peso(amount)],
  ];

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10001,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          padding: "1.25rem",
          width: "420px",
          maxWidth: "90vw",
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.7rem",
          }}
        >
          <span style={{ fontSize: "1.3rem" }}>🧾</span>
          <h3
            style={{
              margin: 0,
              fontSize: "0.95rem",
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            Confirm payment details
          </h3>
        </div>

        <div
          style={{
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "8px",
            padding: "0.5rem 0.75rem",
            marginBottom: "0.7rem",
          }}
        >
          {details.map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                gap: "0.75rem",
                padding: "0.22rem 0",
                fontSize: "0.72rem",
              }}
            >
              <span
                style={{
                  width: "120px",
                  flexShrink: 0,
                  color: colors.textTertiary,
                }}
              >
                {label}
              </span>
              <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "8px",
            padding: "0.5rem 0.75rem",
            marginBottom: "0.7rem",
            fontSize: "0.7rem",
            color: colors.textPrimary,
            display: "flex",
            flexDirection: "column",
            gap: "0.2rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.textTertiary }}>Amount due</span>
            <span>{peso(amountDue)}</span>
          </div>
          {paidSoFar > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.textTertiary }}>
                Already added this visit
              </span>
              <span>{peso(paidSoFar)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.textTertiary }}>
              Total paid after this payment
            </span>
            <span style={{ fontWeight: 700 }}>{peso(projected)}</span>
          </div>
        </div>

        <p
          style={{
            margin: "0 0 0.9rem",
            padding: "0.5rem 0.65rem",
            fontSize: "0.72rem",
            lineHeight: 1.5,
            color: status.color,
            background: status.bg,
            border: `1px solid ${status.border}`,
            borderRadius: "8px",
          }}
        >
          {status.icon} {status.text}
        </p>

        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.72rem",
              fontWeight: 600,
              borderRadius: "6px",
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textPrimary,
              cursor: "pointer",
            }}
          >
            Go Back & Edit
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.72rem",
              fontWeight: 700,
              borderRadius: "6px",
              border: "none",
              background: "linear-gradient(135deg,#4CAF50,#43A047)",
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(76,175,80,0.35)",
            }}
          >
            ✔ Confirm & Add Payment
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationDetailsModal({
  row,
  colors,
  cashierName = "Cashier",
  cashierPosition = "Cashier",
  onPost,
  onClose,
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [payments, setPayments] = useState([]); // 1 application -> many payments
  const [remarks, setRemarks] = useState(""); // notes shown on the Additional OOP
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false); // confirm before adding a payment

  const details = useMemo(() => (row ? getStaticDetails(row) : []), [row]);
  const postingStamp = useMemo(
    () =>
      new Date().toLocaleString("en-PH", {
        dateStyle: "long",
        timeStyle: "short",
      }),
    [],
  );

  if (!row) return null;

  // Payments entered in this session (new)
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);

  // Payments already posted on an earlier visit (short-payment follow-up)
  const priorPayments = row.payments || [];
  const isFollowUp = priorPayments.length > 0;
  const priorPaid = priorPayments.reduce(
    (sum, p) => sum + Number(p.amountPaid),
    0,
  );
  const oopSeq = row.additionalOopCount || 0; // additional OOPs generated so far
  // Reference number printed on the Order of Payment being paid.
  // Payment Details use this value automatically.
  const oopRefNo = isFollowUp
    ? `${row.referenceNo}-A${oopSeq}`
    : row.referenceNo;

  // What the currently open Order of Payment is asking for
  const amountDue = isFollowUp
    ? Math.max(0, +(AMOUNT_DUE - priorPaid).toFixed(2))
    : AMOUNT_DUE;
  const balance = Math.max(0, +(amountDue - totalPaid).toFixed(2));
  const overpaid = Math.max(0, +(totalPaid - amountDue).toFixed(2));
  const hasBalance = balance > 0;
  const baseSteps = isFollowUp
    ? STEPS.map((s) =>
        s.id === 2 ? { ...s, label: "Additional Order of Payment" } : s,
      )
    : STEPS;
  // Step 4 only appears when there is still a balance after this posting
  const steps = hasBalance
    ? [
        ...baseSteps,
        isFollowUp
          ? { ...STEP_4, label: "New Additional Order of Payment" }
          : STEP_4,
      ]
    : baseSteps;
  const lastStep = steps.length;

  /* TODO: replace with an API call, e.g.
     await postPayments(row.id, { payments, remarks }) and, if there is a
     balance, generate the additional Order of Payment on the backend */
  const handleConfirmPost = () => {
    onPost?.({
      row,
      payments,
      totalPaid,
      balance,
      remarks: hasBalance ? remarks.trim() : "",
    });
    setShowConfirm(false);
    onClose();
  };
  const canAdd =
    form.paymentType &&
    form.orNo.trim() &&
    form.dateOfPayment &&
    Number(form.amountPaid) > 0;

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  /* TODO: replace with an API call, e.g. await addApplicationPayment(row.id, form) */
  const addPayment = () => {
    if (!canAdd) return;
    setPayments((prev) => [
      ...prev,
      { id: Date.now(), ...form, referenceNo: oopRefNo },
    ]);
    setForm(EMPTY_FORM);
  };

  // The Add Payment button opens a confirmation first; the payment is only
  // added to the table once the cashier confirms.
  const requestAddPayment = () => {
    if (!canAdd) return;
    setShowAddConfirm(true);
  };
  const confirmAddPayment = () => {
    addPayment();
    setShowAddConfirm(false);
  };

  const removePayment = (id) =>
    setPayments((prev) => prev.filter((p) => p.id !== id));

  const inputStyle = {
    width: "100%",
    padding: "0.42rem 0.6rem",
    fontSize: "0.72rem",
    fontFamily: "inherit",
    borderRadius: "7px",
    border: `1px solid ${colors.cardBorder}`,
    background: colors.pageBg,
    color: colors.textPrimary,
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle = {
    display: "block",
    fontSize: "0.6rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: colors.textTertiary,
    marginBottom: "0.2rem",
  };
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
    whiteSpace: "nowrap",
  };
  const navBtn = (primary, disabled) => ({
    padding: "0.45rem 1rem",
    fontSize: "0.72rem",
    fontWeight: 700,
    borderRadius: "6px",
    border: primary ? "none" : `1px solid ${colors.cardBorder}`,
    background: primary
      ? disabled
        ? colors.badgeBg
        : "linear-gradient(135deg,#4CAF50,#43A047)"
      : "transparent",
    color: primary
      ? disabled
        ? colors.textTertiary
        : "#fff"
      : colors.textPrimary,
    cursor: disabled ? "not-allowed" : "pointer",
  });

  /* ───────────── Step 1: Application Details ───────────── */
  const renderStep1 = () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
        gap: "0.9rem",
      }}
    >
      {details.map((section) => (
        <div
          key={section.title}
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
            {section.title}
          </div>
          <div style={{ padding: "0.5rem 0.85rem" }}>
            {section.fields.map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  padding: "0.28rem 0",
                  fontSize: "0.7rem",
                }}
              >
                <span
                  style={{
                    width: "140px",
                    flexShrink: 0,
                    color: colors.textTertiary,
                  }}
                >
                  {label}
                </span>
                <span style={{ color: colors.textPrimary, fontWeight: 500 }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  /* ───────────── Step 2: Order of Payment + payment entry ───────────── */
  const renderStep2 = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap" }}>
        {/* PDF viewer */}
        <div style={{ flex: "1.6 1 420px", minWidth: 0, height: "620px" }}>
          <PdfViewer
            colors={colors}
            defaultZoom={0.7}
            fileName={`${isFollowUp ? "Additional Order of Payment" : "Order of Payment"} - ${row.referenceNo}.pdf`}
            /* pdfUrl="/api/applications/{id}/order-of-payment.pdf" */
          >
            {isFollowUp ? (
              <AdditionalOopPaper
                refNo={oopRefNo}
                row={row}
                originalDue={AMOUNT_DUE}
                alreadyPaid={priorPaid}
                additionalDue={amountDue}
                remarks={row.additionalOopRemarks || ""}
              />
            ) : (
              <>
                <OrderOfPaymentPaper row={row} refNo={row.referenceNo} />
              </>
            )}
          </PdfViewer>
        </div>

        {/* Payment form */}
        <div
          style={{
            flex: "1 1 260px",
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "10px",
            padding: "0.85rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.65rem",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            💵 Payment Details
          </div>

          <div>
            <label style={labelStyle}>Reference Number</label>
            <input
              style={{
                ...inputStyle,
                fontWeight: 600,
                opacity: 0.8,
                cursor: "not-allowed",
              }}
              value={oopRefNo}
              readOnly
              tabIndex={-1}
              title="Taken from the Order of Payment"
            />
          </div>
          <div>
            <label style={labelStyle}>Type of Payment</label>
            <select
              style={inputStyle}
              value={form.paymentType}
              onChange={(e) => setField("paymentType", e.target.value)}
            >
              <option value="">Select type of payment</option>
              {PAYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>OR Number</label>
            <input
              style={inputStyle}
              value={form.orNo}
              onChange={(e) => setField("orNo", e.target.value)}
              placeholder="Enter OR number"
            />
          </div>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Date of Payment</label>
              <input
                type="date"
                style={inputStyle}
                value={form.dateOfPayment}
                onChange={(e) => setField("dateOfPayment", e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Amount Paid</label>
              <input
                type="number"
                min="0"
                step="0.01"
                style={inputStyle}
                value={form.amountPaid}
                onChange={(e) => setField("amountPaid", e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <button
            onClick={requestAddPayment}
            disabled={!canAdd}
            style={{ ...navBtn(true, !canAdd), marginTop: "auto" }}
          >
            ➕ Add Payment
          </button>
        </div>
      </div>

      {/* Payments table */}
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.5rem 0.85rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            Payments ({priorPayments.length + payments.length})
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            {isFollowUp
              ? `Previously paid: ${peso(priorPaid)} · Balance due: ${peso(amountDue)}`
              : `Due: ${peso(amountDue)}`}{" "}
            · Paid now: {peso(totalPaid)} ·{" "}
            <span
              style={{
                color: hasBalance
                  ? "#ef4444"
                  : overpaid > 0
                    ? "#d97706"
                    : "#059669",
              }}
            >
              {hasBalance
                ? `Balance: ${peso(balance)}`
                : overpaid > 0
                  ? `Overpaid by ${peso(overpaid)}`
                  : "Fully paid"}
            </span>
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: "40px", textAlign: "center" }}>
                  #
                </th>
                <th style={thStyle}>Reference Number</th>
                <th style={thStyle}>Type of Payment</th>
                <th style={thStyle}>OR Number</th>
                <th style={thStyle}>Date of Payment</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Amount Paid</th>
                <th style={{ ...thStyle, width: "60px", textAlign: "center" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Payments already posted earlier: kept in the table, read-only */}
              {priorPayments.map((p, i) => (
                <tr key={`prior-${p.id}`}>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{i + 1}</td>
                  <td style={tdStyle}>{p.referenceNo}</td>
                  <td style={tdStyle}>{p.paymentType}</td>
                  <td style={tdStyle}>{p.orNo}</td>
                  <td style={tdStyle}>{p.dateOfPayment}</td>
                  <td
                    style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}
                  >
                    {peso(p.amountPaid)}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      fontSize: "0.6rem",
                      color: colors.textTertiary,
                    }}
                  >
                    🔒 Posted
                  </td>
                </tr>
              ))}
              {payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "1.2rem",
                      textAlign: "center",
                      fontSize: "0.72rem",
                      color: colors.textTertiary,
                    }}
                  >
                    {isFollowUp
                      ? "No additional payment added yet."
                      : "No payments added yet."}
                  </td>
                </tr>
              ) : (
                payments.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {priorPayments.length + i + 1}
                    </td>
                    <td style={tdStyle}>{p.referenceNo}</td>
                    <td style={tdStyle}>{p.paymentType}</td>
                    <td style={tdStyle}>{p.orNo}</td>
                    <td style={tdStyle}>{p.dateOfPayment}</td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {peso(p.amountPaid)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <button
                        onClick={() => removePayment(p.id)}
                        title="Remove payment"
                        style={{
                          border: "none",
                          background: "rgba(239,68,68,0.12)",
                          color: "#ef4444",
                          borderRadius: "5px",
                          width: "24px",
                          height: "24px",
                          cursor: "pointer",
                        }}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  /* ───────────── Step 3: Acknowledgement Receipt ───────────── */

  const renderStep3 = () => (
    <div style={{ height: "680px" }}>
      <PdfViewer
        colors={colors}
        defaultZoom={0.8}
        fileName={`Acknowledgement Receipt - ${row.referenceNo}.pdf`}
        /* pdfUrl="/api/applications/{id}/acknowledgement-receipt.pdf" */
      >
        <AcknowledgementReceiptPaper
          row={row}
          refNo={row.referenceNo}
          payments={payments}
          totalPaid={totalPaid}
          postingStamp={postingStamp}
          cashierName={cashierName}
          cashierPosition={cashierPosition}
        />
      </PdfViewer>
    </div>
  );

  /* ───────────── Step 4: Additional Order of Payment (when there is a balance) ───────────── */
  const renderStep4 = () => (
    <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap" }}>
      <div style={{ flex: "1.6 1 420px", minWidth: 0, height: "680px" }}>
        <PdfViewer
          colors={colors}
          defaultZoom={0.8}
          fileName={`Additional Order of Payment - ${row.referenceNo}.pdf`}
        >
          <AdditionalOopPaper
            refNo={`${row.referenceNo}-A${oopSeq + 1}`}
            row={row}
            originalDue={AMOUNT_DUE}
            alreadyPaid={priorPaid + totalPaid}
            additionalDue={balance}
            remarks={remarks}
          />
        </PdfViewer>
      </div>

      <div
        style={{
          flex: "1 1 260px",
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "10px",
          padding: "0.85rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.65rem",
          alignSelf: "flex-start",
        }}
      >
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: colors.textPrimary,
          }}
        >
          ➕ Additional Order of Payment
        </div>

        <div
          style={{
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "8px",
            padding: "0.5rem 0.7rem",
            fontSize: "0.7rem",
            color: colors.textPrimary,
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.textTertiary }}>Amount Due</span>
            <span>{peso(amountDue)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.textTertiary }}>Total Paid</span>
            <span>{peso(totalPaid)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              color: "#ef4444",
              borderTop: `1px solid ${colors.tableBorder}`,
              paddingTop: "0.3rem",
            }}
          >
            <span>Additional Fee (Balance)</span>
            <span>{peso(balance)}</span>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Notes / Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) =>
              setRemarks(e.target.value.slice(0, MAX_REMARKS_LENGTH))
            }
            placeholder="These notes will appear on the Additional Order of Payment..."
            rows={7}
            style={{ ...inputStyle, resize: "vertical" }}
          />
          <div
            style={{
              textAlign: "right",
              fontSize: "0.6rem",
              color: colors.textTertiary,
              marginTop: "0.2rem",
            }}
          >
            {MAX_REMARKS_LENGTH - remarks.length} characters left
          </div>
        </div>
      </div>
    </div>
  );

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

        {/* Stepper */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            padding: "0.65rem 1.1rem",
            background: colors.cardBg,
            borderBottom: `1px solid ${colors.cardBorder}`,
            flexShrink: 0,
          }}
        >
          {steps.map((s) => {
            const active = step === s.id;
            const done = step > s.id;
            return (
              <div
                key={s.id}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.4rem 0.7rem",
                  borderRadius: "8px",
                  border: `1px solid ${active ? "#4CAF50" : colors.cardBorder}`,
                  background: active ? "rgba(76,175,80,0.1)" : "transparent",
                }}
              >
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    background: active || done ? "#4CAF50" : colors.badgeBg,
                    color: active || done ? "#fff" : colors.textTertiary,
                    flexShrink: 0,
                  }}
                >
                  {done ? "✓" : s.id}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: active ? 700 : 500,
                    color: active ? colors.textPrimary : colors.textTertiary,
                  }}
                >
                  {s.icon} {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.1rem" }}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.65rem 1.1rem",
            background: colors.cardBg,
            borderTop: `1px solid ${colors.cardBorder}`,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "0.65rem", color: colors.textTertiary }}>
            Step {step} of {lastStep}
            {step === 2 && payments.length === 0
              ? " — add at least 1 payment to continue to Step 3"
              : ""}
            {step === 3 && hasBalance
              ? ` — payment is short by ${peso(balance)}, continue to Step 4`
              : ""}
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {step > 1 && (
              <button style={navBtn(false)} onClick={() => setStep(step - 1)}>
                ‹ Back
              </button>
            )}
            {step < lastStep ? (
              <button
                style={navBtn(true, step === 2 && payments.length === 0)}
                disabled={step === 2 && payments.length === 0}
                onClick={() => setStep(step + 1)}
              >
                Next ›
              </button>
            ) : (
              <button style={navBtn(true)} onClick={() => setShowConfirm(true)}>
                {hasBalance
                  ? "✔ Post & Generate Additional OOP"
                  : "✔ Post Payment"}
              </button>
            )}
          </div>
        </div>

        {showAddConfirm && (
          <ConfirmAddPaymentModal
            colors={colors}
            payment={{ ...form, referenceNo: oopRefNo }}
            amountDue={amountDue}
            paidSoFar={totalPaid}
            onConfirm={confirmAddPayment}
            onCancel={() => setShowAddConfirm(false)}
          />
        )}

        {showConfirm && (
          <ConfirmPostModal
            row={row}
            colors={colors}
            totalPaid={totalPaid}
            balance={balance}
            hasBalance={hasBalance}
            onConfirm={handleConfirmPost}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </div>
    </div>
  );
}
