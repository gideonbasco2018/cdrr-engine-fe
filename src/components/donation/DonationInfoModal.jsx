// FILE: src/components/donation/DonationInfoModal.jsx
import {
  DTLModalFrame, DTLStatBar, DTLStatCell, DTLStatusPill, DTLSection, DTLRow,
  dtlIsBlank, DTLEmptyHint, DTL_OUTLINE_BTN,
} from "./dtlKit";

/* ── "Information" — read-only detail view ── */
export default function DonationInfoModal({ record, onClose, onEdit, colors, darkMode }) {
  return (
    <DTLModalFrame
      onClose={onClose}
      icon="🔎"
      title="Donation Details"
      colors={colors}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <button onClick={onEdit} style={DTL_OUTLINE_BTN(colors)}>
            Edit
          </button>
          <button onClick={onClose} style={DTL_OUTLINE_BTN(colors)}>
            Close
          </button>
        </div>
      }
    >
      <DTLStatBar colors={colors}>
        <DTLStatCell label="Status">
          <DTLStatusPill status={record.status} />
        </DTLStatCell>
        <DTLStatCell label="Letter DTN">
          {dtlIsBlank(record.letterDtn) ? <DTLEmptyHint colors={colors} /> : record.letterDtn}
        </DTLStatCell>
        <DTLStatCell label="Registration DTN">
          {dtlIsBlank(record.registrationDtn) ? <DTLEmptyHint colors={colors} /> : record.registrationDtn}
        </DTLStatCell>
        <DTLStatCell label="Donation Reg. No.">
          {dtlIsBlank(record.donationRegNo) ? <DTLEmptyHint colors={colors} /> : record.donationRegNo}
        </DTLStatCell>
        <DTLStatCell label="Evaluator">
          {dtlIsBlank(record.evaluator) ? <DTLEmptyHint colors={colors} /> : record.evaluator}
        </DTLStatCell>
      </DTLStatBar>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", alignItems: "start" }}>
        <div>
          <DTLSection icon="🤝" title="Donor & Recipient" colors={colors} labelWidth={110}>
            <DTLRow label="Donor" value={record.donor} colors={colors} fullWidth />
            <DTLRow label="Donee/Recipient" value={record.donee} colors={colors} fullWidth />
          </DTLSection>
          <DTLSection icon="🏷️" title="Product Details" colors={colors} labelWidth={110}>
            <DTLRow label="Product Name" value={record.productName} colors={colors} fullWidth />
            <DTLRow label="Packaging" value={record.packaging} colors={colors} fullWidth />
            <DTLRow label="Manufacturer" value={record.manufacturer} colors={colors} fullWidth />
            <DTLRow label="Batch/Lot No." value={record.batchLotNo} colors={colors} />
            <DTLRow label="Expiration Date" value={record.expirationDate} colors={colors} />
            <DTLRow label="Total Quantity" value={record.totalQuantity} colors={colors} />
            <DTLRow label="Validity" value={record.validity} colors={colors} />
          </DTLSection>
        </div>
        <div>
          <DTLSection icon="🕐" title="Processing Dates" colors={colors} labelWidth={150}>
            <DTLRow label="Received By Center" value={record.dateReceived} colors={colors} />
            <DTLRow label="Received by Evaluator" value={record.dateReceivedByEvaluator} colors={colors} />
            <DTLRow label="Date Issued" value={record.dateIssued} colors={colors} />
            <DTLRow label="Forwarded to Checker" value={record.dateForwardedToChecker} colors={colors} />
            <DTLRow label="Released from CDRR" value={record.dateReleased} colors={colors} />
          </DTLSection>
          <DTLSection icon="📝" title="Remarks & Upload" colors={colors} labelWidth={90}>
            <DTLRow label="Remarks" value={record.remarks} colors={colors} fullWidth />
            <DTLRow label="Upload Date" value={record.uploadDate} colors={colors} />
            <DTLRow label="Upload By" value={record.uploadBy} colors={colors} />
          </DTLSection>
        </div>
      </div>
    </DTLModalFrame>
  );
}
