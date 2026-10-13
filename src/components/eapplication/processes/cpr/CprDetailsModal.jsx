// src/components/eapplication/processes/cpr/CprDetailsModal.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getClaimedApplication,
  postClaimedPayments,
} from "../../../../api/appointmentRecords.js";
import {
  PdfViewer,
  ConfirmPostModal,
  ConfirmAddPaymentModal,
} from "../mivn/MivnDetailsModal.jsx";
import {
  OrderOfPaymentPaper,
  AdditionalOopPaper,
  AcknowledgementReceiptPaper,
} from "./CprPapers.jsx";

const PAYMENT_TYPES = [
  "FDA Cashier",
  "LANDBANK ONCOLL",
  "LANDBANK Link.BizPortal",
];
const EMPTY_FORM = {
  paymentType: "",
  orNo: "",
  dateOfPayment: "",
  amountPaid: "",
};
const MAX_REMARKS_LENGTH = 500;

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

// Original OP first, then additional OPs in the order they were issued
const byOrder = (a, b) => {
  if (a.op_type !== b.op_type) return a.op_type === "INITIAL" ? -1 : 1;
  return String(a.issued_at || "").localeCompare(String(b.issued_at || ""));
};

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

export default function CprDetailsModal({
  row,
  colors,
  cashierName = "Cashier",
  cashierPosition = "Cashier",
  onPosted,
  onClose,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [payments, setPayments] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState(null);

  const postingStamp = useMemo(
    () =>
      new Date().toLocaleString("en-PH", {
        dateStyle: "long",
        timeStyle: "short",
      }),
    [],
  );

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

  const formData = data?.form_data || {};
  const parties = data?.parties || [];
  const ops = useMemo(
    () => [...(data?.orders_of_payment || [])].sort(byOrder),
    [data],
  );

  const openOp =
    [...ops].reverse().find((op) => op.status === "UNPAID") || null;
  const initialOp = ops.find((op) => op.op_type === "INITIAL") || null;
  const canPost = !!openOp;
  const isFollowUp = openOp?.op_type === "ADDITIONAL";
  const additionalCount = ops.filter(
    (op) => op.op_type === "ADDITIONAL",
  ).length;
  const referenceNumber = data?.reference_number || row.referenceNo;

  // Payments already posted (read-only)
  const priorPayments = ops.flatMap((op) =>
    (op.verifications || []).map((v) => ({
      id: v.verification_uuid,
      referenceNo: v.reference_number,
      paymentType: v.type_of_payment,
      orNo: v.official_receipt_number,
      dateOfPayment: v.date_of_payment,
      amountPaid: v.amount_paid,
    })),
  );
  const priorPaid = priorPayments.reduce(
    (sum, p) => sum + Number(p.amountPaid),
    0,
  );

  const amountDue = openOp ? Number(openOp.total_amount) : 0;
  const originalDue = initialOp ? Number(initialOp.total_amount) : 0;
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
  const balance = Math.max(0, +(amountDue - totalPaid).toFixed(2));
  const overpaid = Math.max(0, +(totalPaid - amountDue).toFixed(2));
  const hasBalance = canPost && balance > 0;
  const oopRefNo = openOp?.op_number || referenceNumber;
  const nextAoopRefNo = `${referenceNumber}-A${additionalCount + 1}`;

  const info = {
    activity: data?.activity,
    applicationType: data?.application_type,
    classification: formData["Classification"],
    company: data?.applicant_company,
    email: data?.email_address,
    contactNo: data?.contact_no,
  };

  const steps = !canPost
    ? [
        { id: 1, label: "Application Details", icon: "📋" },
        { id: 2, label: "Payment History", icon: "💳" },
      ]
    : [
        { id: 1, label: "Application Details", icon: "📋" },
        {
          id: 2,
          label: isFollowUp
            ? "Additional Order of Payment"
            : "Order of Payment",
          icon: "💳",
        },
        { id: 3, label: "Acknowledgement Receipt", icon: "🧾" },
        ...(hasBalance
          ? [
              {
                id: 4,
                label: isFollowUp
                  ? "New Additional Order of Payment"
                  : "Additional Order of Payment",
                icon: "➕",
              },
            ]
          : []),
      ];
  const lastStep = steps.length;

  const canAdd =
    form.paymentType &&
    form.orNo.trim() &&
    form.dateOfPayment &&
    Number(form.amountPaid) > 0;

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const confirmAddPayment = () => {
    if (!canAdd) return;
    setPayments((prev) => [
      ...prev,
      { id: Date.now(), ...form, referenceNo: oopRefNo },
    ]);
    setForm(EMPTY_FORM);
    setShowAddConfirm(false);
  };

  const removePayment = (id) =>
    setPayments((prev) => prev.filter((p) => p.id !== id));

  const handleConfirmPost = async () => {
    if (posting) return;
    setPosting(true);
    setPostError(null);
    try {
      await postClaimedPayments(row.referenceNo, {
        payments: payments.map((p) => ({
          type_of_payment: p.paymentType,
          official_receipt_number: p.orNo.trim(),
          date_of_payment: p.dateOfPayment,
          amount_paid: Number(p.amountPaid).toFixed(2),
        })),
        remarks: hasBalance ? remarks.trim() : "",
      });
      setShowConfirm(false);
      await onPosted?.();
      onClose();
    } catch (err) {
      setShowConfirm(false);
      setPostError(err.message);
    } finally {
      setPosting(false);
    }
  };

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
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
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
          <Field label="Activity" value={data.activity} colors={colors} />
          <Field
            label="Application Type"
            value={data.application_type}
            colors={colors}
          />
          <Field
            label="Scheduled Date"
            value={formData["Scheduled Date"]}
            colors={colors}
          />
          <Field
            label="Time Slot"
            value={formData["Time Slot"]}
            colors={colors}
          />
          <Field label="Remarks" value={formData["Remarks"]} colors={colors} />
        </Section>

        <Section title="Establishment" colors={colors}>
          <Field
            label="Company"
            value={data.applicant_company}
            colors={colors}
          />
          <Field label="LTO Number" value={data.lto_no} colors={colors} />
          <Field
            label="LTO Validity"
            value={formData["Validity"]}
            colors={colors}
          />
          <Field label="TIN" value={data.tin} colors={colors} />
          <Field label="Email" value={data.email_address} colors={colors} />
          <Field label="Contact No." value={data.contact_no} colors={colors} />
          <Field label="Address" value={data.address} colors={colors} />
        </Section>

        <Section title="Product" colors={colors}>
          {PRODUCT_FIELDS.map((key) => (
            <Field
              key={key}
              label={key}
              value={formData[key]}
              colors={colors}
            />
          ))}
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
  );

  /* Payments table (prior + new) */
  const renderPaymentsTable = (allowRemove) => (
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
        {allowRemove && (
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            Due: {peso(amountDue)} · Paid now: {peso(totalPaid)} ·{" "}
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
        )}
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
            {priorPayments.map((p, i) => (
              <tr key={`prior-${p.id}`}>
                <td style={{ ...tdStyle, textAlign: "center" }}>{i + 1}</td>
                <td style={tdStyle}>{p.referenceNo}</td>
                <td style={tdStyle}>{p.paymentType}</td>
                <td style={tdStyle}>{p.orNo}</td>
                <td style={tdStyle}>{p.dateOfPayment}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>
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
            {payments.map((p, i) => (
              <tr key={p.id}>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {priorPayments.length + i + 1}
                </td>
                <td style={tdStyle}>{p.referenceNo}</td>
                <td style={tdStyle}>{p.paymentType}</td>
                <td style={tdStyle}>{p.orNo}</td>
                <td style={tdStyle}>{p.dateOfPayment}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>
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
            ))}
            {priorPayments.length + payments.length === 0 && (
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
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  /* ───────────── Step 2: Order of Payment + payment entry ───────────── */
  const renderStep2 = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap" }}>
        <div style={{ flex: "1.6 1 420px", minWidth: 0, height: "620px" }}>
          <PdfViewer
            colors={colors}
            defaultZoom={0.7}
            fileName={`${isFollowUp ? "Additional Order of Payment" : "Order of Payment"} - ${oopRefNo}.pdf`}
          >
            {isFollowUp ? (
              <AdditionalOopPaper
                info={info}
                refNo={oopRefNo}
                originalDue={originalDue}
                alreadyPaid={priorPaid}
                additionalDue={amountDue}
                remarks={openOp.deficiency_reason || ""}
              />
            ) : (
              <OrderOfPaymentPaper info={info} refNo={oopRefNo} op={openOp} />
            )}
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
            onClick={() => canAdd && setShowAddConfirm(true)}
            disabled={!canAdd}
            style={{ ...navBtn(true, !canAdd), marginTop: "auto" }}
          >
            ➕ Add Payment
          </button>
        </div>
      </div>

      {renderPaymentsTable(true)}
    </div>
  );

  /* Step 2 when there is nothing left to pay: history only */
  const renderHistory = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <Section title="Orders of Payment" colors={colors}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>OP Number</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Total Amount</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {ops.map((op) => (
                <tr key={op.op_uuid}>
                  <td style={tdStyle}>{op.op_type}</td>
                  <td style={tdStyle}>{op.op_number || referenceNumber}</td>
                  <td
                    style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}
                  >
                    {peso(op.total_amount)}
                  </td>
                  <td style={tdStyle}>{op.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      {renderPaymentsTable(false)}
    </div>
  );

  /* ───────────── Step 3: Acknowledgement Receipt ───────────── */
  const renderStep3 = () => (
    <div style={{ height: "680px" }}>
      <PdfViewer
        colors={colors}
        defaultZoom={0.8}
        fileName={`Acknowledgement Receipt - ${referenceNumber}.pdf`}
      >
        <AcknowledgementReceiptPaper
          info={info}
          refNo={referenceNumber}
          payments={payments}
          totalPaid={totalPaid}
          postingStamp={postingStamp}
          cashierName={cashierName}
          cashierPosition={cashierPosition}
        />
      </PdfViewer>
    </div>
  );

  /* ───────────── Step 4: New Additional Order of Payment ───────────── */
  const renderStep4 = () => (
    <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap" }}>
      <div style={{ flex: "1.6 1 420px", minWidth: 0, height: "680px" }}>
        <PdfViewer
          colors={colors}
          defaultZoom={0.8}
          fileName={`Additional Order of Payment - ${nextAoopRefNo}.pdf`}
        >
          <AdditionalOopPaper
            info={info}
            refNo={nextAoopRefNo}
            originalDue={originalDue}
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

  const renderBody = () => {
    if (loading) {
      return (
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
      );
    }
    if (error || !data) {
      return (
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
          Could not load application details: {error || "No data"}
        </div>
      );
    }
    if (step === 1) return renderStep1();
    if (!canPost) return renderHistory();
    if (step === 2) return renderStep2();
    if (step === 3) return renderStep3();
    return renderStep4();
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

        {/* Stepper */}
        {data && (
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
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.1rem" }}>
          {renderBody()}
        </div>

        {/* Footer */}
        {data && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.65rem 1.1rem",
              background: colors.cardBg,
              borderTop: `1px solid ${colors.cardBorder}`,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: "0.65rem",
                color: postError ? "#dc2626" : colors.textTertiary,
              }}
            >
              {postError
                ? `Could not post the payment: ${postError}`
                : `Step ${step} of ${lastStep}${
                    canPost && step === 2 && payments.length === 0
                      ? " — add at least 1 payment to continue to Step 3"
                      : ""
                  }${
                    canPost && step === 3 && hasBalance
                      ? ` — payment is short by ${peso(balance)}, continue to Step 4`
                      : ""
                  }`}
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {step > 1 && (
                <button style={navBtn(false)} onClick={() => setStep(step - 1)}>
                  ‹ Back
                </button>
              )}
              {step < lastStep ? (
                <button
                  style={navBtn(
                    true,
                    canPost && step === 2 && payments.length === 0,
                  )}
                  disabled={canPost && step === 2 && payments.length === 0}
                  onClick={() => setStep(step + 1)}
                >
                  Next ›
                </button>
              ) : (
                canPost && (
                  <button
                    style={navBtn(true, posting)}
                    disabled={posting}
                    onClick={() => setShowConfirm(true)}
                  >
                    {hasBalance
                      ? "✔ Post & Generate Additional OOP"
                      : "✔ Post Payment"}
                  </button>
                )
              )}
            </div>
          </div>
        )}

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
