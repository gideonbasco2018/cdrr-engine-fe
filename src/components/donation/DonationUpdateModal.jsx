// FILE: src/components/donation/DonationUpdateModal.jsx
import { useState } from "react";
import { INFO_FIELDS, LETTER_DTN_RE, DTL_UPDATE_STEPS } from "./constants";
import {
  DTLModalFrame, DTLStatBar, DTLStatCell, DTLStatusSelect, DTLBarInput,
  DTLSection, DTLEdit, DTLStepIndicator, DTL_OUTLINE_BTN, DTL_ACCENT,
  dtlIsBlank, DTLEmptyHint,
} from "./dtlKit";

export default function DonationUpdateModal({ record, onClose, onSave, saving, colors, darkMode }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(record);
  const [dtnError, setDtnError] = useState(null);
  const setField = (key) => (value) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (key === "letterDtn") setDtnError(null);
  };

  // Letter DTN is optional; only its format is validated when one is given.
  const letterDtnInvalid = !dtlIsBlank(form.letterDtn) && !LETTER_DTN_RE.test(form.letterDtn.trim());
  const letterDtnBad = letterDtnInvalid;

  const handleReviewClick = () => {
    if (letterDtnInvalid) {
      setDtnError("Letter DTN must be a 14-digit number.");
      return;
    }
    setDtnError(null);
    setStep(2);
  };

  const changedFields = INFO_FIELDS.filter((f) => (record[f.key] || "") !== (form[f.key] || ""));

  const modifiedLabel = (
    <span style={{ fontSize: "0.7rem", fontWeight: 600, color: changedFields.length > 0 ? "#f59e0b" : colors.textTertiary }}>
      {changedFields.length > 0
        ? `✎ ${changedFields.length} field(s) modified`
        : step === 1
          ? "Step 1 of 2"
          : "No changes to save"}
    </span>
  );

  const footer =
    step === 1 ? (
      <>
        {modifiedLabel}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={onClose} style={DTL_OUTLINE_BTN(colors)}>
            Cancel
          </button>
          <button
            onClick={handleReviewClick}
            style={{
              padding: "0.5rem 1.2rem",
              background: DTL_ACCENT,
              border: "none",
              borderRadius: 7,
              color: "#fff",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Review Changes →
          </button>
        </div>
      </>
    ) : (
      <>
        {modifiedLabel}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => setStep(1)} style={DTL_OUTLINE_BTN(colors)}>
            ← Back
          </button>
          <button
            onClick={() => onSave(record, form)}
            disabled={saving || changedFields.length === 0 || letterDtnBad}
            style={{
              padding: "0.5rem 1.2rem",
              background: saving || changedFields.length === 0 || letterDtnBad ? colors.cardBorder : "#10b981",
              border: "none",
              borderRadius: 7,
              color: "#fff",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: saving || changedFields.length === 0 || letterDtnBad ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving..." : "💾 Save Changes"}
          </button>
        </div>
      </>
    );

  return (
    <DTLModalFrame
      onClose={onClose}
      icon="✏️"
      title={step === 1 ? "Update Donation Information" : "Review Changes"}
      subtitle={
        <>
          Letter DTN: <strong style={{ color: DTL_ACCENT }}>{record.letterDtn}</strong>
        </>
      }
      stepper={<DTLStepIndicator currentStep={step} steps={DTL_UPDATE_STEPS} colors={colors} />}
      colors={colors}
      minBodyHeight="55vh"
      footer={footer}
    >
      {step === 1 ? (
        <>
          <DTLStatBar colors={colors}>
            <DTLStatCell label="Status" value={form.status} original={record.status} colors={colors}>
              <DTLStatusSelect value={form.status} onChange={setField("status")} />
            </DTLStatCell>
            <DTLStatCell label="Letter DTN" value={form.letterDtn} original={record.letterDtn} colors={colors}>
              <DTLBarInput value={form.letterDtn} onChange={setField("letterDtn")} colors={colors} />
              {dtnError && (
                <div style={{ fontSize: "0.6rem", color: "#ef4444", fontWeight: 600, marginTop: 2 }}>
                  {dtnError}
                </div>
              )}
            </DTLStatCell>
            <DTLStatCell label="Registration DTN" value={form.registrationDtn} original={record.registrationDtn} colors={colors}>
              <DTLBarInput value={form.registrationDtn} onChange={setField("registrationDtn")} colors={colors} />
            </DTLStatCell>
            <DTLStatCell label="Donation Reg. No." value={form.donationRegNo} original={record.donationRegNo} colors={colors}>
              <DTLBarInput value={form.donationRegNo} onChange={setField("donationRegNo")} colors={colors} width="100px" />
            </DTLStatCell>
            <DTLStatCell label="Evaluator" value={form.evaluator} original={record.evaluator} colors={colors}>
              <DTLBarInput value={form.evaluator} onChange={setField("evaluator")} colors={colors} width="80px" />
            </DTLStatCell>
          </DTLStatBar>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", alignItems: "start" }}>
            <div>
              <DTLSection icon="🤝" title="Donor & Recipient" colors={colors} labelWidth={110}>
                <DTLEdit label="Donor" value={form.donor} original={record.donor} onChange={setField("donor")} colors={colors} fullWidth />
                <DTLEdit label="Donee/Recipient" value={form.donee} original={record.donee} onChange={setField("donee")} colors={colors} fullWidth />
              </DTLSection>
              <DTLSection icon="🏷️" title="Product Details" colors={colors} labelWidth={110}>
                <DTLEdit label="Product Name" value={form.productName} original={record.productName} onChange={setField("productName")} colors={colors} fullWidth />
                <DTLEdit label="Packaging" value={form.packaging} original={record.packaging} onChange={setField("packaging")} colors={colors} fullWidth />
                <DTLEdit label="Manufacturer" value={form.manufacturer} original={record.manufacturer} onChange={setField("manufacturer")} colors={colors} fullWidth />
                <DTLEdit label="Batch/Lot No." value={form.batchLotNo} original={record.batchLotNo} onChange={setField("batchLotNo")} colors={colors} fullWidth textarea />
                <DTLEdit label="Expiration Date" value={form.expirationDate} original={record.expirationDate} onChange={setField("expirationDate")} colors={colors} fullWidth textarea />
                <DTLEdit label="Total Quantity" value={form.totalQuantity} original={record.totalQuantity} onChange={setField("totalQuantity")} colors={colors} />
                <DTLEdit label="Validity" value={form.validity} original={record.validity} onChange={setField("validity")} colors={colors} fullWidth textarea />
              </DTLSection>
            </div>
            <div>
              <DTLSection icon="🕐" title="Processing Dates" colors={colors} labelWidth={150}>
                <DTLEdit label="Received By Center" value={form.dateReceived} original={record.dateReceived} onChange={setField("dateReceived")} colors={colors} />
                <DTLEdit
                  label="Received by Evaluator"
                  value={form.dateReceivedByEvaluator}
                  original={record.dateReceivedByEvaluator}
                  onChange={setField("dateReceivedByEvaluator")}
                  colors={colors}
                />
                <DTLEdit label="Date Issued" value={form.dateIssued} original={record.dateIssued} onChange={setField("dateIssued")} colors={colors} />
                <DTLEdit
                  label="Forwarded to Checker"
                  value={form.dateForwardedToChecker}
                  original={record.dateForwardedToChecker}
                  onChange={setField("dateForwardedToChecker")}
                  colors={colors}
                />
                <DTLEdit label="Released from CDRR" value={form.dateReleased} original={record.dateReleased} onChange={setField("dateReleased")} colors={colors} />
              </DTLSection>
              <DTLSection icon="📝" title="Remarks" colors={colors} labelWidth={90}>
                <DTLEdit label="Remarks" value={form.remarks} original={record.remarks} onChange={setField("remarks")} colors={colors} fullWidth textarea />
              </DTLSection>
            </div>
          </div>
        </>
      ) : changedFields.length === 0 ? (
        <p style={{ textAlign: "center", color: colors.textTertiary, fontSize: "0.8rem", margin: "1.5rem 0" }}>
          No changes to save.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {changedFields.map((f) => (
            <div
              key={f.key}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.85rem",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                padding: "0.55rem 0.85rem",
                fontSize: "0.78rem",
              }}
            >
              <span
                style={{
                  flex: "0 0 150px",
                  fontWeight: 700,
                  color: colors.textPrimary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {f.label}
              </span>
              <span style={{ flex: 1, minWidth: 0, wordBreak: "break-word", whiteSpace: "pre-line" }}>
                {dtlIsBlank(record[f.key]) ? (
                  <DTLEmptyHint colors={colors} />
                ) : (
                  <span style={{ color: "#dc2626", textDecoration: "line-through" }}>{record[f.key]}</span>
                )}
                {" → "}
                {dtlIsBlank(form[f.key]) ? (
                  <DTLEmptyHint colors={colors} />
                ) : (
                  <span style={{ color: "#16a34a", fontWeight: 600 }}>{form[f.key]}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </DTLModalFrame>
  );
}
