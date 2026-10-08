// src/components/eapplication/processes/cpr/CprPapers.jsx
import {
  OopHeader,
  OopSection,
  OopNotices,
} from "../mivn/MivnDetailsModal.jsx";

const BANCNET_FEE = 15;

const php = (n) =>
  `Php ${Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const uniq = (arr) => [...new Set(arr.filter(Boolean))].join(", ");

const formatLongDate = (iso) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

// info: { activity, applicationType, classification, company, email, contactNo }
const generalInfoRows = (info, refNo) => [
  ["Reference Number:", refNo],
  ["Authorization:", info.activity || ""],
  ["Type of Application:", info.applicationType || ""],
  ["Classification:", info.classification || ""],
  ["Name of Establishment:", info.company || ""],
  ["E-mail Address:", info.email || ""],
  ["Mobile Number:", info.contactNo || ""],
];

/* Original Order of Payment */
export function OrderOfPaymentPaper({ info, refNo, op }) {
  const total = Number(op.total_amount);
  return (
    <>
      <OopHeader title="ORDER OF PAYMENT" />
      <OopSection
        title="General Information"
        rows={generalInfoRows(info, refNo)}
      />
      <OopSection
        title="Payment Details"
        rows={[
          ["Application Fee:", php(op.application_fee)],
          ["Surcharge (if any):", php(op.surcharge)],
          ["Legal Research Fund (LRF):", php(op.lrf_amount)],
          ["Total Amount:", php(total), true],
        ]}
      />
      <OopNotices bancnetAmount={total + BANCNET_FEE} />
    </>
  );
}

/* Additional Order of Payment */
export function AdditionalOopPaper({
  info,
  refNo,
  originalDue,
  alreadyPaid,
  additionalDue,
  remarks,
}) {
  return (
    <>
      <OopHeader title="ORDER OF PAYMENT" subtitle="(ADDITIONAL)" />
      <OopSection
        title="General Information"
        rows={generalInfoRows(info, refNo)}
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
      <OopNotices bancnetAmount={Number(additionalDue) + BANCNET_FEE} />
    </>
  );
}

/* Acknowledgement Receipt */
export function AcknowledgementReceiptPaper({
  info,
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
        rows={generalInfoRows(info, refNo)}
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
