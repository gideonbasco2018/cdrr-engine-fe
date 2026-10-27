// src/components/eapplication/processes/fgmp/FgmpDetailsModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { getUser } from "../../../../api/auth";
import {
  getClaimedApplication,
  postClaimedPayments,
  getDeckingEvaluators,
  submitDeckingDecision,
  getIssuanceTypes,
  getNextCertificateNumber,
  getApplicationDocuments,
  getNods,
  getWorksheet,
  saveWorksheet,
  extendNod,
  receiveNodDocuments,
  getStepActions,
  getStepAssignees,
  submitStepDecision,
} from "../../../../api/appointmentRecords.js";

import {
  PdfViewer,
  ConfirmPostModal,
  ConfirmAddPaymentModal,
} from "../../paymentVerification/PaymentShared.jsx";

import {
  OrderOfPaymentPaper,
  AdditionalOopPaper,
  AcknowledgementReceiptPaper,
} from "./FgmpPapers.jsx";

import {
  CgmpClearancePaper,
  LetterOfDisapprovalPaper,
  ExtensionLetterPaper,
  InspectionNoticePaper,
  ISSUANCE_PAPERS,
  LETTERHEAD_PAGE_STYLE,
  buildIssuanceDoc,
} from "./FgmpIssuancePapers.jsx";

import {
  FgmpWorksheetPaper,
  buildWorksheetDoc,
  GMP_EVIDENCE_OPTIONS,
  ANNEX_C_FIELDS,
  RECOMMENDATION_LABELS,
} from "./FgmpWorksheetPaper.jsx";

import { NodForm, NodsCard } from "./FgmpNodParts.jsx";
import {
  emptyWorksheet,
  fromApiWorksheet,
  hasWorksheetContent,
  metaFromApi,
  newFormRow,
  toApiWorksheet,
} from "./fgmpWorksheetSync.js";
import {
  canIssueNod,
  latestNod,
  MAX_NODS,
} from "./fgmpNod.js";

/* The action that sends the application back to the applicant, and so issues
   a Notice of Deficiency (NOD). Must match ACTION_ROUTES in the backend. */
const COMPLIANCE_ACTION = "For Compliance";

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

const PAYMENT_STEP = "Payment Verification/Posting";
const DECKING_STEP = "Decking";

// Must match DECISIONS in app/services/decking_decision.py
const DECISION_FOR_DECKING = "For Quality Evaluation";
const DECISIONS = [DECISION_FOR_DECKING];

/* The FGMP e-application workflow:
     Decker -> Quality Evaluation -> Checker -> Supervisor -> LRD Chief ->
     Director
   The actions for each step and where they lead come from the server
   (app/services/fgmp_workflow.py), so this file carries no copy of them. */
/* The step whose holder decides what will be issued — must match
   TYPE_OF_ISSUANCE_STEP in app/services/fgmp_workflow.py. */
const ISSUANCE_STEP = "Quality Evaluation";

const WORKFLOW_STEPS = [
  "Quality Evaluation",
  "Checker",
  "Supervisor",
  "LRD Chief",
  "Director",
];

/* Today's date as YYYY-MM-DD in the browser's local time.
   (toISOString would shift the date to UTC.) */
const todayStr = () => {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

const PARTY_TYPES = [
  "Manufacturer",
  "Trader",
  "Repacker",
  "Importer",
  "Distributor",
];

// form_data keys that are already shown in the fixed sections above
const HANDLED_FORM_KEYS = new Set([
  "Scheduled Date",
  "Time Slot",
  "Remarks",
  "Validity",
  "Address",
  "TIN",
  "LTO No.",
  "LTO Number",
  "Application Type",
]);

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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

const formatFileSize = (bytes) => {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/* The files the applicant submitted, General first then Technical. Opening a
   file goes to its Google Drive link. */
function SubmittedDocuments({ documents, error, driveLink, colors }) {
  const note = { fontSize: "0.7rem", color: colors.textTertiary, padding: "0.3rem 0" };
  if (error) return <div style={{ ...note, color: "#dc2626" }}>{error}</div>;
  if (documents === null) return <div style={note}>Loading documents…</div>;

  const groups = [
    ["General Requirements", documents.filter((d) => d.requirement_group === "general")],
    ["Technical Requirements", documents.filter((d) => d.requirement_group === "technical")],
  ].filter(([, list]) => list.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
      {groups.length === 0 && <div style={note}>No documents were submitted.</div>}
      {groups.map(([title, list]) => (
        <div key={title}>
          <div
            style={{
              fontSize: "0.64rem",
              fontWeight: 700,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              color: colors.textTertiary,
              padding: "0.2rem 0",
            }}
          >
            {title}
          </div>
          {list.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.35rem 0",
                borderTop: `1px solid ${colors.cardBorder}`,
                fontSize: "0.7rem",
              }}
            >
              <span style={{ width: "190px", flexShrink: 0, fontWeight: 600, color: colors.textPrimary }}>
                {doc.requirement_code}
              </span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: colors.textSecondary || colors.textPrimary,
                }}
                title={doc.original_filename}
              >
                {doc.original_filename}
              </span>
              <span style={{ width: "60px", textAlign: "right", color: colors.textTertiary }}>
                {formatFileSize(doc.file_size_bytes)}
              </span>
              <a
                href={doc.drive_file_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#2196F3", fontWeight: 600, textDecoration: "none" }}
              >
                Open
              </a>
            </div>
          ))}
        </div>
      ))}
      {driveLink && (
        <a
          href={driveLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: "0.72rem", color: "#2196F3" }}
        >
          📁 Open Google Drive folder
        </a>
      )}
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

/* ── Unsent decisions ───────────────────────────────────────────────────
   Nothing reaches the server until Submit, so a half-filled decision is kept
   in this browser and put back when the application is reopened. It is wiped
   once the decision is submitted.

   Keyed by user, application and step: two people sharing a machine never see
   each other's notes, and a draft written at Quality Evaluation never turns
   up at the
   Checker step. */
const DRAFT_PREFIX = "fgmp-decision-draft";

function draftKey(row) {
  const user = getUser();
  const who = user?.user_uuid || user?.username || "anon";
  return `${DRAFT_PREFIX}:${who}:${row.referenceNo}:${row.applicationStep}`;
}

function readDraft(row) {
  try {
    return JSON.parse(localStorage.getItem(draftKey(row)) || "null");
  } catch {
    return null; // private browsing, or something else wrote over the key
  }
}

function writeDraft(row, draft) {
  try {
    // [] and {} are truthy, so look inside them
    const isEmpty = !Object.values(draft).some((v) => {
      if (Array.isArray(v)) return v.length > 0;
      if (v && typeof v === "object") return Object.values(v).some(Boolean);
      return v;
    });
    if (isEmpty) localStorage.removeItem(draftKey(row));
    else localStorage.setItem(draftKey(row), JSON.stringify(draft));
  } catch {
    // storage full or blocked — the decision still works, it just is not kept
  }
}

function clearDraft(row) {
  try {
    localStorage.removeItem(draftKey(row));
  } catch {
    /* nothing to do */
  }
}

function DecisionConfirmModal({
  colors,
  decision,
  nextStep,
  assigneeName,
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
        <h3
          style={{
            margin: "0 0 0.6rem",
            fontSize: "0.95rem",
            fontWeight: 700,
            color: colors.textPrimary,
          }}
        >
          ❓ Submit this decision?
        </h3>
        <p
          style={{
            margin: "0 0 0.9rem",
            fontSize: "0.75rem",
            lineHeight: 1.5,
            color: colors.textTertiary,
          }}
        >
          Decision:{" "}
          <strong style={{ color: colors.textPrimary }}>{decision}</strong>.
          {assigneeName ? (
            <>
              {" "}
              The application will go to {nextStep}{" "}
              <strong style={{ color: colors.textPrimary }}>
                {assigneeName}
              </strong>
              .
            </>
          ) : (
            <> The application stays with you for compliance.</>
          )}{" "}
          This cannot be changed after submitting.
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
            }}
          >
            ✔ Yes, Submit
          </button>
        </div>
      </div>
    </div>
  );
}

/* Asks before "Start over" throws away what was typed. Only the unsent draft in
   this browser is cleared; anything already saved on the server stays. */
function StartOverConfirmModal({ colors, onConfirm, onCancel }) {
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
        <h3
          style={{
            margin: "0 0 0.6rem",
            fontSize: "0.95rem",
            fontWeight: 700,
            color: colors.textPrimary,
          }}
        >
          ⚠️ Start over?
        </h3>
        <p
          style={{
            margin: "0 0 0.9rem",
            fontSize: "0.75rem",
            lineHeight: 1.5,
            color: colors.textTertiary,
          }}
        >
          This clears everything you typed here and have not submitted: the
          decision, the Notice of Deficiency text, and the whole Evaluation
          Worksheet, including rows you added. Nothing already saved is
          affected. This cannot be undone.
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
              background: "linear-gradient(135deg,#dc2626,#b91c1c)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Clear everything
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── the worksheet's rows, edited from the left column ─────────
   These are the same rows the paper shows (the paper edits them in place), so
   a change on either side shows on the other. */

const linkButton = {
  alignSelf: "flex-start",
  border: "none",
  background: "transparent",
  color: "#2196F3",
  fontSize: "0.68rem",
  fontWeight: 700,
  cursor: "pointer",
  padding: "0.15rem 0",
};

function RowCard({ colors, label, onRemove, rowId, children }) {
  return (
    <div
      data-row={rowId}
      style={{
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "8px",
        padding: "0.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.62rem",
          color: colors.textTertiary,
        }}
      >
        <span>{label}</span>
        {onRemove && (
          <button
            type="button"
            title="Remove this row"
            onClick={onRemove}
            style={{
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textTertiary,
              borderRadius: "6px",
              padding: "0 0.5rem",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/* When the cursor is on the paper, mark the same field in the left column and
   scroll the column to it. Only the column is scrolled, and the cursor is never
   moved, so typing on the paper is not interrupted. `target` is
   { field, rowId? } or null. */
export function useLeftHighlight(boxRef, target) {
  const esc = (v) => (window.CSS && window.CSS.escape ? window.CSS.escape(v) : v);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    box.querySelectorAll('[data-lit="1"]').forEach((e) => e.removeAttribute("data-lit"));
    if (!target) return undefined;
    let el = null;
    if (target.rowId) {
      el = box.querySelector(`[data-row="${esc(target.rowId)}"]`);
    }
    if (!el && target.field) {
      const input = box.querySelector(`[data-field="${esc(target.field)}"]`);
      // the field's own block (label and box), or the list of ticks
      el = input ? input.closest("div") : null;
    }
    if (!el) return undefined;
    el.setAttribute("data-lit", "1");
    const spot = el.getBoundingClientRect();
    const view = box.getBoundingClientRect();
    if (spot.top < view.top + 6 || spot.bottom > view.bottom - 6) {
      box.scrollTo({
        top: box.scrollTop + (spot.top - view.top) - view.height / 3,
        behavior: "smooth",
      });
    }
    return () => el.removeAttribute("data-lit");
  }, [boxRef, target]);
}

// The paper's empty table shows one blank row to type in; the left column
// does the same, and both use this id, so they agree on which row it is.
const BLANK_ROW_ID = "blank-row";

/* Annex B and "Approved Medicinal Products": dosage forms (one per line),
   product type, and operations (one per line) */
export function DosageRowsEditor({ title, field, rows, setRows, colors, labelStyle, inputStyle }) {
  // Row 1 is always there to type in. Typing in it makes it a real row, with
  // the same id, so the box is not replaced and the cursor stays.
  const shown = rows.length ? rows : [{ ...newFormRow(), id: BLANK_ROW_ID }];
  const patch = (id, change) =>
    setRows((cur) => {
      const list = cur || [];
      if (!list.some((r) => r.id === id)) {
        return [...list, { ...newFormRow(), id, ...change }];
      }
      return list.map((r) => (r.id === id ? { ...r, ...change } : r));
    });
  return (
    <div>
      <label style={labelStyle}>{title}</label>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {shown.map((r, i) => (
          <RowCard
            key={r.id}
            rowId={r.id}
            colors={colors}
            label={`Row ${i + 1}`}
            // nothing to remove while Row 1 is only the blank one
            onRemove={rows.length ? () => setRows((cur) => (cur || []).filter((x) => x.id !== r.id)) : null}
          >
            <textarea
              data-field={field}
              rows={2}
              placeholder="Dosage forms, one per line"
              value={(r.dosageForms || []).join("\n")}
              onChange={(e) => patch(r.id, { dosageForms: e.target.value.split("\n") })}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <input
              data-field={field}
              placeholder="Product type, e.g. Sterile"
              value={r.productType || ""}
              onChange={(e) => patch(r.id, { productType: e.target.value })}
              style={inputStyle}
            />
            <textarea
              data-field={field}
              rows={2}
              placeholder="Manufacturing operations, one per line"
              value={(r.operations || []).join("\n")}
              onChange={(e) => patch(r.id, { operations: e.target.value.split("\n") })}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </RowCard>
        ))}
        <button
          type="button"
          onClick={() =>
            setRows((cur) => {
              const list = cur || [];
              // adding to an empty list keeps Row 1 (the blank one) and adds Row 2
              const first = list.length ? list : [{ ...newFormRow(), id: BLANK_ROW_ID }];
              return [...first, newFormRow()];
            })
          }
          style={linkButton}
        >
          + Add a row
        </button>
      </div>
    </div>
  );
}

// Where a row added to Annex C sits: after how many of the form's own rows
const ANNEX_C_PLACES = [
  "At the top, above “Original or notarized copy of GMP Cert”",
  "After “Original or notarized copy of GMP Cert”",
  "After “Copy of the last inspection report…”",
  "After “Copy of GMP contract…”",
  "After “Site Master File or equivalent”",
  "After “Validation Master Plan…”",
  "After “Rationale for test method validation…”",
  "After “Procedure for handling deviations and OOS”",
];

const newAnnexRowId = () =>
  `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/* The extra rows the evaluator adds to Worksheet B's Annex C table */
export function AnnexRowsEditor({ rows, setRows, colors, labelStyle, inputStyle }) {
  const patch = (id, change) =>
    setRows((cur) => (cur || []).map((r) => (r.id === id ? { ...r, ...change } : r)));
  return (
    <div>
      <label style={labelStyle}>Extra Annex C rows</label>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {rows.length === 0 && (
          <div style={{ fontSize: "0.64rem", color: colors.textTertiary }}>
            No extra rows yet.
          </div>
        )}
        {rows.map((r, i) => (
          <RowCard
            key={r.id}
            rowId={r.id}
            colors={colors}
            label={`Extra row ${i + 1}`}
            onRemove={() => setRows((cur) => (cur || []).filter((x) => x.id !== r.id))}
          >
            <select
              data-field="annexRows"
              value={r.after}
              onChange={(e) => patch(r.id, { after: Number(e.target.value) })}
              style={inputStyle}
            >
              {ANNEX_C_PLACES.map((text, k) => (
                <option key={k} value={k}>
                  {text}
                </option>
              ))}
            </select>
            <textarea
              data-field="annexRows"
              rows={2}
              placeholder="Contents"
              value={r.contents || ""}
              onChange={(e) => patch(r.id, { contents: e.target.value })}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <textarea
              data-field="annexRows"
              rows={2}
              placeholder="Remarks"
              value={r.remarks || ""}
              onChange={(e) => patch(r.id, { remarks: e.target.value })}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </RowCard>
        ))}
        <button
          type="button"
          onClick={() =>
            setRows((cur) => [
              ...(cur || []),
              { id: newAnnexRowId(), after: ANNEX_C_PLACES.length - 1, contents: "", remarks: "" },
            ])
          }
          style={linkButton}
        >
          + Add a row
        </button>
      </div>
    </div>
  );
}

export default function FgmpDetailsModal({
  row,
  colors,
  cashierName = "Cashier",
  cashierPosition = "Cashier",
  onPosted,
  onClose,
}) {
  const currentUser = useMemo(() => getUser(), []);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // submitted files: null while loading, then the list
  const [documents, setDocuments] = useState(null);
  const [documentsError, setDocumentsError] = useState(null);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [payments, setPayments] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState(null);

  /* Decker decision (Decking step only) */
  const isDeckingOpen =
    row.applicationStep === DECKING_STEP && row.status === "claimed";
  const [deckRemarks, setDeckRemarks] = useState("");
  const [evaluatorUuid, setEvaluatorUuid] = useState("");
  const [evaluators, setEvaluators] = useState([]);

  /* Workflow decision — any step from Quality Evaluation onwards that you hold.
     Decking and these are different steps, so they share `decision`,
     `showDecisionConfirm` and `submittingDecision` without clashing. */
  const isWorkflowStepOpen =
    WORKFLOW_STEPS.includes(row.applicationStep) && row.status === "claimed";
  // Only the step that decides what will be issued (declared early: the
  // steps array below needs it to order Decision vs. the Issuance Document).
  const canSetIssuance =
    isWorkflowStepOpen && row.applicationStep === ISSUANCE_STEP;
  const [decision, setDecision] = useState("");
  const [evalRemarks, setEvalRemarks] = useState("");
  const [assigneeUuid, setAssigneeUuid] = useState("");
  const [stepActions, setStepActions] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [issuanceTypes, setIssuanceTypes] = useState([]);
  const [typeOfIssuance, setTypeOfIssuance] = useState("");

  /* Evaluation Worksheet — 7 fields, Quality Evaluation step only. NOT YET
     SAVED anywhere real; kept only in the draft (this browser), same as the
     decision fields above. See FgmpWorksheetPaper.jsx. */
  const [gmpEvidence, setGmpEvidence] = useState([]);
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [issuingCountry, setIssuingCountry] = useState("");
  const [foreignCertificateNumber, setForeignCertificateNumber] = useState("");
  const [foreignCertificateValidity, setForeignCertificateValidity] =
    useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [worksheetRemarks, setWorksheetRemarks] = useState("");
  // Worksheet B's Annex C fill-ins, {fieldKey: typed text}
  const [annexC, setAnnexC] = useState({});
  // Rows the evaluator adds to Annex C on the paper: [{ id, after, contents, remarks }]
  const [annexRows, setAnnexRows] = useState([]);
  // The Recommendation box the evaluator ticked: "" = none ticked, otherwise
  // its label. One at a time.
  const [recommendationChoice, setRecommendationChoice] = useState("");
  // typed on the paper: the "Date issued" statement, Worksheet B's approved
  // dosage forms note, the compliance notes, and the two dosage tables
  const [dateIssuedText, setDateIssuedText] = useState("");
  const [approvedDosageFormsNote, setApprovedDosageFormsNote] = useState("");
  const [complianceNotes, setComplianceNotes] = useState("");
  const [appliedForms, setAppliedForms] = useState([]);
  const [approvedProducts, setApprovedProducts] = useState([]);

  /* The worksheet is saved on the server (e_app_fgmp_worksheet): the
     evaluator's draft auto-saves as they type, and the Checker and the later
     steps read the version that was sent on. */
  const [worksheetLoaded, setWorksheetLoaded] = useState(false);
  // what the server last had, so nothing is saved that has not changed
  const lastSavedRef = useRef("");
  // "idle" | "pending" | "saving" | "saved" | "error"
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  // version, status and the parts the server fills in (names, dates)
  const [worksheetMeta, setWorksheetMeta] = useState(null);
  // for everyone but the evaluator: the version that was sent on
  const [readWorksheet, setReadWorksheet] = useState(null);
  // which worksheet field has the cursor, so the preview can light it up
  const [activeField, setActiveField] = useState(null);
  // the other way round: which spot on the paper has the cursor (or was
  // just clicked), so the left column can mark and scroll to its field
  const [paperSpot, setPaperSpot] = useState(null);
  const paperSpotTimer = useRef(null);
  const leftBoxRef = useRef(null);
  const onPaperFocus = (spot) => {
    clearTimeout(paperSpotTimer.current);
    setPaperSpot(spot);
    // a click leaves no cursor behind, so its mark fades by itself
    if (spot?.transient) {
      paperSpotTimer.current = setTimeout(() => setPaperSpot(null), 1600);
    }
  };
  useLeftHighlight(leftBoxRef, paperSpot);

  /* Notice of Deficiency (For Compliance). MOCK-UP: the NODs already issued
     live in this browser only (fgmpNod.js); what is being typed for the next
     one goes in the draft with the rest. */
  const [nods, setNods] = useState([]);
  const [nodDeficiencies, setNodDeficiencies] = useState("");
  const [nodDocLines, setNodDocLines] = useState([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [showDecisionConfirm, setShowDecisionConfirm] = useState(false);
  const [showStartOverConfirm, setShowStartOverConfirm] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);

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

  /* What the applicant submitted. A failure here only affects this card, so
     it keeps its own error instead of blocking the whole popup. */
  useEffect(() => {
    const uuid = data?.application_uuid;
    if (!uuid) return undefined;
    let cancelled = false;
    setDocuments(null);
    setDocumentsError(null);
    getApplicationDocuments(uuid)
      .then((list) => {
        if (!cancelled) setDocuments(list);
      })
      .catch((err) => {
        if (!cancelled) setDocumentsError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [data?.application_uuid]);

  const formData = data?.form_data || {};
  // FGMP has no parties list — Foreign Manufacturer is its own card above.
  const ops = useMemo(
    () => [...(data?.orders_of_payment || [])].sort(byOrder),
    [data],
  );

  // Every remaining form_data entry (simple values only) is listed as-is,
  // so the details view does not depend on a fixed list of field names.
  const extraFormFields = useMemo(
    () =>
      Object.entries(formData).filter(([key, value]) => {
        if (HANDLED_FORM_KEYS.has(key)) return false;
        if (PARTY_TYPES.some((t) => key === t || key.startsWith(`${t} `))) {
          return false;
        }
        return typeof value === "string" || typeof value === "number";
      }),
    [formData],
  );

  const openOp =
    [...ops].reverse().find((op) => op.status === "UNPAID") || null;
  const initialOp = ops.find((op) => op.op_type === "INITIAL") || null;
  // Posting belongs to the cashier step only; other steps (e.g. Quality
  // Evaluation)
  // get the read-only application details and payment history.
  const isPaymentStep = row.applicationStep === PAYMENT_STEP;
  const canPost = isPaymentStep && !!openOp;
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
    company: data?.applicant_company,
    email: data?.email_address,
    contactNo: data?.contact_no,
  };

  /* The issuance document, available to everyone once the evaluator has
     chosen what will be issued. */
  const previewedIssuance = typeOfIssuance || data?.type_of_issuance;
  const [previewCertNo, setPreviewCertNo] = useState(null);

  /* Until the decision is submitted no number exists yet, so show the one it
     would get. It is not reserved — a certificate issued elsewhere first
     would take it, hence "provisional" on the document. */
  useEffect(() => {
    if (!previewedIssuance || data?.certificate_number) {
      setPreviewCertNo(null);
      return;
    }
    let cancelled = false;
    getNextCertificateNumber(previewedIssuance).then((n) => {
      if (!cancelled) setPreviewCertNo(n);
    });
    return () => {
      cancelled = true;
    };
  }, [previewedIssuance, data?.certificate_number]);
  const issuancePaper = previewedIssuance
    ? ISSUANCE_PAPERS[previewedIssuance]
    : null;
  const issuanceDoc = useMemo(
    () =>
      issuancePaper && data
        ? buildIssuanceDoc(data, formData, previewCertNo)
        : null,
    [issuancePaper, data, formData, previewCertNo],
  );

  /* The non-posting layouts are numbered here rather than written out, so
     the Issuance Document can slip in without disturbing Next/Back. Each
     step carries a `kind`, and renderBody switches on that instead of a
     hardcoded number. */
  const numbered = (kinds) =>
    kinds.filter(Boolean).map((step, i) => ({ ...step, id: i + 1 }));

  const steps = isDeckingOpen
    ? numbered([
        { kind: "details", label: "Application Details", icon: "📋" },
        { kind: "history", label: "Payment History", icon: "💳" },
        { kind: "deckerDecision", label: "Decker Decision", icon: "🗂️" },
      ])
    : isWorkflowStepOpen
    ? numbered(
        canSetIssuance
          ? // Quality Evaluation chooses the issuance type as part of the
            // decision, so the document comes after — a preview of what was
            // just decided. The worksheet comes before the decision, since
            // it's the evaluator's own working notes leading up to it.
            [
              { kind: "details", label: "Application Details", icon: "📋" },
              { kind: "history", label: "Payment History", icon: "💳" },
              {
                kind: "worksheet",
                label: "Evaluation Worksheet",
                icon: "📝",
              },
              {
                kind: "decision",
                label: `${row.applicationStep} Decision`,
                icon: "🔬",
              },
              issuancePaper && {
                kind: "issuance",
                label: "Issuance Document",
                icon: "📜",
              },
            ]
          : // Checker, Supervisor, LRD Chief, Director only review a document
            // someone else prepared, so they read it before deciding.
            [
              { kind: "details", label: "Application Details", icon: "📋" },
              { kind: "history", label: "Payment History", icon: "💳" },
              {
                kind: "worksheet",
                label: "Evaluation Worksheet",
                icon: "📝",
              },
              issuancePaper && {
                kind: "issuance",
                label: "Issuance Document",
                icon: "📜",
              },
              {
                kind: "decision",
                label: `${row.applicationStep} Decision`,
                icon: "🔬",
              },
            ],
      )
    : !canPost
    ? numbered([
        { kind: "details", label: "Application Details", icon: "📋" },
        { kind: "history", label: "Payment History", icon: "💳" },
        issuancePaper && {
          kind: "issuance",
          label: "Issuance Document",
          icon: "📜",
        },
      ])
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

  /* Picking or clearing an issuance type adds or removes the document step,
     so keep the open step within range. */
  useEffect(() => {
    if (step > lastStep) setStep(lastStep);
  }, [step, lastStep]);

  /* ── Workflow decision helpers ── */
  const chosen = stepActions.find((a) => a.action === decision);
  // Where this action sends it. null = it stays here or ends the workflow.
  const nextStep = chosen?.next_step ?? null;
  // Nobody is picked when the action loops back to this same step
  // (For Compliance) or ends the workflow (Approved).
  const needsAssignee = !!nextStep && nextStep !== row.applicationStep;

  /* For Compliance issues a Notice of Deficiency: "what is lacking" is what
     the decision needs (it also becomes the remarks), and there is a limit of
     MAX_NODS per application. */
  const isCompliance = decision === COMPLIANCE_ACTION;
  const nodLimitReached = !canIssueNod(nods);
  const canSubmitDecision =
    !!decision &&
    (isCompliance
      ? !!nodDeficiencies.trim() && !nodLimitReached
      : needsAssignee
        ? !!assigneeUuid
        : !!evalRemarks.trim());

  /* The Notices of Deficiency saved on this application. They are loaded from
     the server, so everyone who worked on it sees the same ones. A failed load
     only leaves the list empty; it never blocks the popup. */
  useEffect(() => {
    let cancelled = false;
    getNods(row.referenceNo)
      .then((list) => {
        if (!cancelled) setNods(list);
      })
      .catch(() => {
        if (!cancelled) setNods([]);
      });
    return () => {
      cancelled = true;
    };
  }, [row.referenceNo]);
  // Replace one NOD with what the server sent back
  const putNod = (saved) =>
    setNods((list) => list.map((n) => (n.nodNumber === saved.nodNumber ? saved : n)));
  // These throw the server's message, which the NOD card shows under the form
  const handleExtendNod = async (nodNumber, newDueDate, reason) =>
    putNod(await extendNod(row.referenceNo, nodNumber, newDueDate, reason));
  const handleReceiveNod = async (nodNumber, receivedIds, receivedDate) =>
    putNod(
      await receiveNodDocuments(row.referenceNo, nodNumber, receivedIds, receivedDate),
    );
  const nodApplication = {
    manufacturer: data?.foreign_manufacturer,
    country: data?.foreign_manufacturer_country,
    // The reference number is the tracking number; a DTN is only the backup.
    dtn: data?.reference_number || data?.dtn,
    email: data?.email_address,
  };
  // Only the evaluator who holds the task may extend or record documents
  const renderNodsCard = () => (
    <NodsCard
      colors={colors}
      labelStyle={labelStyle}
      inputStyle={inputStyle}
      nods={nods}
      onExtend={handleExtendNod}
      onReceive={handleReceiveNod}
      canAct={canSetIssuance}
      application={nodApplication}
    />
  );
  const selectedAssignee = assignees.find((a) => a.user_uuid === assigneeUuid);

  /* ── Decker decision helpers (the Decking step) ── */
  const needsEvaluator = decision === DECISION_FOR_DECKING;
  const canSubmitDeckerDecision =
    !!decision && (needsEvaluator ? !!evaluatorUuid : !!deckRemarks.trim());
  const selectedEvaluator = evaluators.find(
    (e) => e.user_uuid === evaluatorUuid,
  );

  /* Whichever decision this step is making */
  const canSubmit = isDeckingOpen
    ? canSubmitDeckerDecision
    : canSubmitDecision;

  /* Why Submit is greyed out, in words, so nobody has to guess. Empty when
     nothing is missing. Mirrors the rules above, one reason at a time. */
  const submitBlocker = (() => {
    if (!decision) return "choose an action";
    if (isDeckingOpen) {
      if (needsEvaluator && !evaluatorUuid) return "choose the evaluator";
      if (!needsEvaluator && !deckRemarks.trim()) return "write your remarks";
      return "";
    }
    if (isCompliance) {
      if (nodLimitReached) return `the limit of ${MAX_NODS} NODs is reached`;
      if (!nodDeficiencies.trim()) return "write what is lacking in the NOD";
      return "";
    }
    if (needsAssignee && !assigneeUuid) return `choose who to assign the ${nextStep} to`;
    if (!needsAssignee && !evalRemarks.trim()) return "write your remarks";
    return "";
  })();
  // The step the missing piece is on, so the hint can point to it
  const decisionStepNumber = steps.find(
    (s) => s.kind === "decision" || s.kind === "deckerDecision",
  )?.id;

  /* Who the decker may hand the application to */
  useEffect(() => {
    if (!isDeckingOpen) return;
    let cancelled = false;
    getDeckingEvaluators()
      .then((list) => {
        if (!cancelled) setEvaluators(list);
      })
      .catch((err) => {
        if (!cancelled)
          setPostError(`Could not load evaluators: ${err.message}`);
      });
    return () => {
      cancelled = true;
    };
  }, [isDeckingOpen]);

  /* Put back anything typed but not submitted last time */
  useEffect(() => {
    if (!isWorkflowStepOpen) return;
    const draft = readDraft(row);
    if (!draft) return;
    setDecision(draft.decision || "");
    setEvalRemarks(draft.remarks || "");
    setAssigneeUuid(draft.assigneeUuid || "");
    setTypeOfIssuance(draft.typeOfIssuance || "");
    setGmpEvidence(draft.gmpEvidence || []);
    setIssuingAuthority(draft.issuingAuthority || "");
    setIssuingCountry(draft.issuingCountry || "");
    setForeignCertificateNumber(draft.foreignCertificateNumber || "");
    setForeignCertificateValidity(draft.foreignCertificateValidity || "");
    setInspectionDate(draft.inspectionDate || "");
    setWorksheetRemarks(draft.worksheetRemarks || "");
    setAnnexC(draft.annexC || {});
    setAnnexRows(draft.annexRows || []);
    setRecommendationChoice(draft.recommendationChoice || "");
    setDateIssuedText(draft.dateIssuedText || "");
    setApprovedDosageFormsNote(draft.approvedDosageFormsNote || "");
    setComplianceNotes(draft.complianceNotes || "");
    setAppliedForms(draft.appliedForms || []);
    setApprovedProducts(draft.approvedProducts || []);
    setNodDeficiencies(draft.nodDeficiencies || "");
    setNodDocLines(draft.nodDocLines || []);
    setDraftRestored(true);
  }, [isWorkflowStepOpen, row.referenceNo, row.applicationStep]);

  /* Keep it up to date as they work */
  useEffect(() => {
    if (!isWorkflowStepOpen) return;
    writeDraft(row, {
      decision,
      remarks: evalRemarks,
      assigneeUuid,
      typeOfIssuance,
      gmpEvidence,
      issuingAuthority,
      issuingCountry,
      foreignCertificateNumber,
      foreignCertificateValidity,
      inspectionDate,
      worksheetRemarks,
      annexC,
      annexRows,
      recommendationChoice,
      dateIssuedText,
      approvedDosageFormsNote,
      complianceNotes,
      appliedForms,
      approvedProducts,
      nodDeficiencies,
      nodDocLines,
    });
  }, [
    isWorkflowStepOpen,
    row.referenceNo,
    row.applicationStep,
    decision,
    evalRemarks,
    assigneeUuid,
    typeOfIssuance,
    gmpEvidence,
    issuingAuthority,
    issuingCountry,
    foreignCertificateNumber,
    foreignCertificateValidity,
    inspectionDate,
    worksheetRemarks,
    annexC,
    annexRows,
    recommendationChoice,
    dateIssuedText,
    approvedDosageFormsNote,
    complianceNotes,
    appliedForms,
    approvedProducts,
    nodDeficiencies,
    nodDocLines,
  ]);

  /* ───────── the worksheet on the server ───────── */

  // everything the evaluator has filled in, as one object
  const worksheetValues = useMemo(
    () => ({
      gmpEvidence,
      issuingAuthority,
      issuingCountry,
      foreignCertificateNumber,
      foreignCertificateValidity,
      inspectionDate,
      dateIssuedText,
      approvedDosageFormsNote,
      appliedForms,
      approvedProducts,
      worksheetRemarks,
      complianceNotes,
      recommendationChoice,
      annexC,
      annexRows,
    }),
    [
      gmpEvidence,
      issuingAuthority,
      issuingCountry,
      foreignCertificateNumber,
      foreignCertificateValidity,
      inspectionDate,
      dateIssuedText,
      approvedDosageFormsNote,
      appliedForms,
      approvedProducts,
      worksheetRemarks,
      complianceNotes,
      recommendationChoice,
      annexC,
      annexRows,
    ],
  );
  const worksheetPayload = useMemo(
    () => JSON.stringify(toApiWorksheet(worksheetValues)),
    [worksheetValues],
  );

  // Load it when the popup opens. What the server has wins over the older
  // copy in this browser. If the server has none yet, the browser copy (if
  // any) is simply saved by the auto-save below.
  useEffect(() => {
    if (!isWorkflowStepOpen) return undefined;
    let cancelled = false;
    setWorksheetLoaded(false);
    getWorksheet(row.referenceNo)
      .then((res) => {
        if (cancelled) return;
        if (canSetIssuance) {
          if (res.worksheet) {
            const v = fromApiWorksheet(res.worksheet);
            setGmpEvidence(v.gmpEvidence);
            setIssuingAuthority(v.issuingAuthority);
            setIssuingCountry(v.issuingCountry);
            setForeignCertificateNumber(v.foreignCertificateNumber);
            setForeignCertificateValidity(v.foreignCertificateValidity);
            setInspectionDate(v.inspectionDate);
            setDateIssuedText(v.dateIssuedText);
            setApprovedDosageFormsNote(v.approvedDosageFormsNote);
            setAppliedForms(v.appliedForms);
            setApprovedProducts(v.approvedProducts);
            setWorksheetRemarks(v.worksheetRemarks);
            setComplianceNotes(v.complianceNotes);
            setRecommendationChoice(v.recommendationChoice);
            setAnnexC(v.annexC);
            setAnnexRows(v.annexRows);
            lastSavedRef.current = JSON.stringify(toApiWorksheet(v));
            setWorksheetMeta(metaFromApi(res.worksheet));
            setSaveState("saved");
            setSavedAt(res.worksheet.saved_at);
          } else {
            lastSavedRef.current = JSON.stringify(toApiWorksheet(emptyWorksheet()));
          }
        } else {
          setReadWorksheet(
            res.worksheet
              ? { values: fromApiWorksheet(res.worksheet), meta: metaFromApi(res.worksheet) }
              : null,
          );
        }
        setWorksheetLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        // Not fatal: the evaluator keeps working from this browser's copy.
        setSaveError(err.message);
        if (canSetIssuance) setSaveState("error");
        setWorksheetLoaded(!canSetIssuance ? true : false);
      });
    return () => {
      cancelled = true;
    };
  }, [isWorkflowStepOpen, canSetIssuance, row.referenceNo]);

  // Auto-save about a second and a half after the last change
  const dirtyRef = useRef(false);
  useEffect(() => {
    if (!canSetIssuance || !worksheetLoaded) return undefined;
    if (worksheetPayload === lastSavedRef.current) {
      dirtyRef.current = false;
      return undefined;
    }
    dirtyRef.current = true;
    setSaveState("pending");
    const timer = setTimeout(async () => {
      setSaveState("saving");
      try {
        const res = await saveWorksheet(row.referenceNo, JSON.parse(worksheetPayload));
        lastSavedRef.current = worksheetPayload;
        dirtyRef.current = false;
        setWorksheetMeta(metaFromApi(res.worksheet));
        setSaveError(null);
        setSaveState("saved");
        setSavedAt(res.worksheet?.saved_at || new Date().toISOString());
      } catch (err) {
        setSaveError(err.message);
        setSaveState("error");
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [worksheetPayload, canSetIssuance, worksheetLoaded, row.referenceNo]);

  // Closing the popup within that second and a half must not lose the last edits
  const closingRef = useRef({});
  closingRef.current = { payload: worksheetPayload, referenceNo: row.referenceNo };
  useEffect(
    () => () => {
      if (dirtyRef.current) {
        saveWorksheet(closingRef.current.referenceNo, JSON.parse(closingRef.current.payload)).catch(
          () => {},
        );
      }
    },
    [],
  );

  /* A restored action the step no longer allows would sit in the dropdown
     unmatched, so drop it once the real list arrives. */
  useEffect(() => {
    if (!decision || stepActions.length === 0) return;
    if (!stepActions.some((a) => a.action === decision)) {
      setDecision("");
      setAssigneeUuid("");
    }
  }, [decision, stepActions]);

  /* What this step allows comes from the server, so the dropdown can never
     offer an action the server would reject. */
  useEffect(() => {
    if (!isWorkflowStepOpen) {
      setStepActions([]);
      return;
    }
    let cancelled = false;
    getStepActions(row.referenceNo)
      .then((list) => {
        if (!cancelled) setStepActions(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setStepActions([]);
          setPostError(`Could not load the available actions: ${err.message}`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isWorkflowStepOpen, row.referenceNo]);

  /* The issuance list, for the step that decides what will be issued */
  useEffect(() => {
    if (!isWorkflowStepOpen || row.applicationStep !== ISSUANCE_STEP) return;
    let cancelled = false;
    getIssuanceTypes()
      .then((list) => {
        if (!cancelled) setIssuanceTypes(list);
      })
      .catch(() => {
        if (!cancelled) setIssuanceTypes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isWorkflowStepOpen, row.applicationStep]);

  /* The people list depends on where the application is going, so it is
     fetched after an action is picked. */
  useEffect(() => {
    if (!needsAssignee) {
      setAssignees([]);
      return;
    }
    let cancelled = false;
    setLoadingAssignees(true);
    getStepAssignees(nextStep)
      .then((list) => {
        if (!cancelled) setAssignees(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setAssignees([]);
          setPostError(`Could not load the ${nextStep} list: ${err.message}`);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAssignees(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needsAssignee, nextStep]);

  /* Refresh the task list without making the popup wait for it. The refresh
     also reloads the unclaimed list from the Appointment System's own
     database, which can take ~20-30 seconds (or fail) when that server is
     slow or out of reach. Each list updates itself as it arrives. */
  const refreshInBackground = () => {
    Promise.resolve(onPosted?.()).catch(() => {});
  };

  /* Wipe the whole unsent draft for this step: the decision, the Notice of
     Deficiency being typed, and every worksheet value. */
  const startOver = () => {
    setDecision("");
    setEvalRemarks("");
    setAssigneeUuid("");
    setTypeOfIssuance("");
    setNodDeficiencies("");
    setNodDocLines([]);
    setGmpEvidence([]);
    setIssuingAuthority("");
    setIssuingCountry("");
    setForeignCertificateNumber("");
    setForeignCertificateValidity("");
    setInspectionDate("");
    setWorksheetRemarks("");
    setAnnexC({});
    setAnnexRows([]);
    setRecommendationChoice("");
    setDateIssuedText("");
    setApprovedDosageFormsNote("");
    setComplianceNotes("");
    setAppliedForms([]);
    setApprovedProducts([]);
    clearDraft(row);
    setDraftRestored(false);
    setShowStartOverConfirm(false);
  };

  const handleSubmitDecision = async () => {
    if (submittingDecision) return;
    setSubmittingDecision(true);
    setPostError(null);
    try {
      // For Compliance carries the Notice of Deficiency. The server saves it
      // with the decision in one step, and fills the remarks from what is
      // lacking when none were typed.
      await submitStepDecision(row.referenceNo, {
        decision,
        remarks: evalRemarks.trim(),
        assignee_uuid: needsAssignee ? assigneeUuid : null,
        type_of_issuance: canSetIssuance ? typeOfIssuance || null : null,
        nod: isCompliance
          ? {
              deficiencies: nodDeficiencies.trim(),
              documents: nodDocLines
                .map((line) => line.requirementCode.trim())
                .filter(Boolean),
            }
          : null,
        // The final worksheet goes with the decision, so the last keystrokes
        // are saved and, when it is forwarded, locked. Nothing is sent for an
        // untouched worksheet.
        worksheet:
          canSetIssuance &&
          (worksheetMeta || hasWorksheetContent(worksheetValues))
            ? toApiWorksheet(worksheetValues)
            : null,
      });
      dirtyRef.current = false;
      setShowDecisionConfirm(false);
      clearDraft(row);
      refreshInBackground();
      onClose();
    } catch (err) {
      setShowDecisionConfirm(false);
      setPostError(`Could not submit the decision: ${err.message}`);
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleSubmitDeckerDecision = async () => {
    if (submittingDecision) return;
    setSubmittingDecision(true);
    setPostError(null);
    try {
      await submitDeckingDecision(row.referenceNo, {
        decision,
        remarks: deckRemarks.trim(),
        evaluator_uuid: needsEvaluator ? evaluatorUuid : null,
      });
      setShowDecisionConfirm(false);
      refreshInBackground();
      onClose();
    } catch (err) {
      setShowDecisionConfirm(false);
      setPostError(`Could not submit the decision: ${err.message}`);
    } finally {
      setSubmittingDecision(false);
    }
  };

  const today = todayStr();
  const canAdd =
    form.paymentType &&
    form.orNo.trim() &&
    form.dateOfPayment &&
    form.dateOfPayment <= today &&
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
      setPostError(`Could not post the payment: ${err.message}`);
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
            label="Related DTN"
            value={data.related_dtn}
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
          {/* The FGMP form calls this "LTO Number" while the claim code reads
              "LTO No.", so lto_no is empty for FGMP — fall back to the form. */}
          <Field
            label="LTO Number"
            value={data.lto_no || formData["LTO Number"]}
            colors={colors}
          />
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

        {(data.foreign_manufacturer || data.foreign_manufacturer_address) && (
          <Section title="Foreign Manufacturer" colors={colors}>
            <Field
              label="Name"
              value={data.foreign_manufacturer}
              colors={colors}
            />
            <Field
              label="Address"
              value={data.foreign_manufacturer_address}
              colors={colors}
            />
            <Field
              label="Country"
              value={data.foreign_manufacturer_country}
              colors={colors}
            />
          </Section>
        )}

        {data.type_of_issuance && (
          <Section title="Issuance" colors={colors}>
            <Field
              label="Type of Issuance"
              value={data.type_of_issuance}
              colors={colors}
            />
            {data.certificate_number && (
              <Field
                label="Certificate Number"
                value={data.certificate_number}
                colors={colors}
              />
            )}
          </Section>
        )}

        {extraFormFields.length > 0 && (
          <Section title="Facility / Application Form" colors={colors}>
            {extraFormFields.map(([key, value]) => (
              <Field
                key={key}
                label={key}
                value={String(value)}
                colors={colors}
              />
            ))}
          </Section>
        )}
      </div>

      {renderNodsCard()}

      <Section
        title={`Submitted Documents${
          documents ? ` (${documents.length})` : ""
        }`}
        colors={colors}
      >
        <SubmittedDocuments
          documents={documents}
          error={documentsError}
          driveLink={data.drive_link}
          colors={colors}
        />
      </Section>
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
                max={today}
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

  /* ───────────── Decking: Decker Decision ───────────── */
  const renderDeckerDecision = () => (
    <div style={{ maxWidth: "640px" }}>
      <Section title="Decker Decision" colors={colors}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.7rem",
            padding: "0.4rem 0",
          }}
        >
          <div>
            <label style={labelStyle}>Decker Decision</label>
            <select
              style={inputStyle}
              value={decision}
              onChange={(e) => {
                setDecision(e.target.value);
                if (e.target.value !== DECISION_FOR_DECKING)
                  setEvaluatorUuid("");
              }}
            >
              <option value="">Select decision</option>
              {DECISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              Decker Remarks{needsEvaluator || !decision ? "" : " (required)"}
            </label>
            <textarea
              value={deckRemarks}
              onChange={(e) =>
                setDeckRemarks(e.target.value.slice(0, MAX_REMARKS_LENGTH))
              }
              placeholder="Write your remarks..."
              rows={5}
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
              {MAX_REMARKS_LENGTH - deckRemarks.length} characters left
            </div>
          </div>

          {needsEvaluator && (
            <div>
              <label style={labelStyle}>Assign Evaluator</label>
              <select
                style={inputStyle}
                value={evaluatorUuid}
                onChange={(e) => setEvaluatorUuid(e.target.value)}
              >
                <option value="">Select evaluator</option>
                {evaluators.map((ev) => (
                  <option key={ev.user_uuid} value={ev.user_uuid}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Section>
    </div>
  );

  /* ───────── Step 3: the decision for whichever step you hold ───────── */
  /* ───────── Evaluation Worksheet (Quality Evaluation only) ─────────
     NOT YET SAVED anywhere real — see the note at the top of
     FgmpWorksheetPaper.jsx. The fields feed the live preview beneath them,
     and both are kept only in this browser's draft until the FGMP unit
     confirms where each value belongs and the real columns are added. */
  const worksheetVariant = data?.category === "PIC/S" ? "A" : "B";

  /* The paper's data: the values typed, plus the parts that fill themselves
     (who evaluated and checked, and when, the NODs, the Email date). The
     evaluator's own screen falls back to the signed-in user until the first
     save gives the server's answer. */
  const docFrom = (values, meta, { forEvaluator }) => {
    const doc = buildWorksheetDoc(data || {}, formData, values);
    const evaluator = meta?.evaluatedBy;
    doc.evaluatedBy =
      evaluator?.name ||
      (forEvaluator
        ? [currentUser?.first_name, currentUser?.surname].filter(Boolean).join(" ")
        : "");
    doc.evaluatorDesignation =
      evaluator?.designation || (forEvaluator ? currentUser?.position || "" : "");
    doc.evaluatedDates = evaluator?.dates || [];
    doc.checkedBy = meta?.checkedBy?.name || "";
    doc.checkerDesignation = meta?.checkedBy?.designation || "";
    doc.checkedDate = meta?.checkedBy?.date || "";
    doc.emailDate = latestNod(nods)?.issuedDate || "";
    doc.nods = nods;
    return doc;
  };
  const worksheetDoc = docFrom(worksheetValues, worksheetMeta, {
    forEvaluator: true,
  });

  const setAnnexCField = (key, value) =>
    setAnnexC((prev) => ({ ...prev, [key]: value }));

  /* Lets the paper edit the same values the left-hand fields do */
  const worksheetEditor = {
    get: (id) =>
      id.startsWith("annexC.")
        ? annexC[id.slice(7)] || ""
        : {
            issuingAuthority,
            issuingCountry,
            foreignCertificateNumber,
            foreignCertificateValidity,
            inspectionDate,
            worksheetRemarks,
            gmpEvidence,
            recommendationChoice,
            dateIssuedText,
            approvedDosageFormsNote,
            complianceNotes,
            appliedForms,
            approvedProducts,
          }[id],
    set: (id, value) => {
      if (id.startsWith("annexC.")) return setAnnexCField(id.slice(7), value);
      const setters = {
        issuingAuthority: setIssuingAuthority,
        issuingCountry: setIssuingCountry,
        foreignCertificateNumber: setForeignCertificateNumber,
        foreignCertificateValidity: setForeignCertificateValidity,
        inspectionDate: setInspectionDate,
        worksheetRemarks: setWorksheetRemarks,
        gmpEvidence: setGmpEvidence,
        recommendationChoice: setRecommendationChoice,
        dateIssuedText: setDateIssuedText,
        approvedDosageFormsNote: setApprovedDosageFormsNote,
        complianceNotes: setComplianceNotes,
        appliedForms: setAppliedForms,
        approvedProducts: setApprovedProducts,
      };
      return setters[id]?.(value);
    },
  };

  const toggleGmpEvidence = (option) =>
    setGmpEvidence((prev) =>
      prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option],
    );

  /* The Checker, Supervisor, LRD Chief and Director read the version the
     evaluator sent on. Nothing here can be edited. */
  const renderWorksheetReadOnly = () => {
    if (!worksheetLoaded) {
      return (
        <div style={{ fontSize: "0.72rem", color: colors.textTertiary }}>
          {saveError
            ? `Could not load the worksheet: ${saveError}`
            : "Loading the worksheet…"}
        </div>
      );
    }
    if (!readWorksheet) {
      return (
        <div style={{ fontSize: "0.72rem", color: colors.textTertiary }}>
          No worksheet was sent on with this application.
        </div>
      );
    }
    const { values, meta } = readWorksheet;
    const doc = docFrom(values, meta, { forEvaluator: false });
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        <div style={{ fontSize: "0.7rem", color: colors.textTertiary }}>
          Prepared by{" "}
          <strong style={{ color: colors.textPrimary }}>
            {meta.evaluatedBy.name || "the evaluator"}
          </strong>
          {meta.evaluatedBy.designation
            ? `, ${meta.evaluatedBy.designation}`
            : ""}{" "}
          · Version {meta.version} · sent{" "}
          {meta.savedAt
            ? new Date(meta.savedAt).toLocaleDateString("en-PH", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : ""}{" "}
          · read only
        </div>
        <div
          style={{
            padding: "0.8rem",
            borderRadius: "10px",
            background: "rgba(100,116,139,0.2)",
          }}
        >
          <FgmpWorksheetPaper
            doc={doc}
            variant={meta.variant}
            annexRows={values.annexRows}
          />
        </div>
      </div>
    );
  };

  const renderWorksheet = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      {/* saved on the server as you type; the Checker reads what you send on */}
      <div
        style={{
          padding: "0.5rem 0.7rem",
          borderRadius: "6px",
          fontSize: "0.66rem",
          lineHeight: 1.5,
          background:
            saveState === "error"
              ? "rgba(220,38,38,0.1)"
              : "rgba(34,197,94,0.1)",
          color: saveState === "error" ? "#dc2626" : "#15803d",
        }}
      >
        {saveState === "error"
          ? `Could not save the worksheet (${saveError}). It is kept in this browser and saved again when you change something.`
          : saveState === "pending" || saveState === "saving"
            ? "Saving…"
            : saveState === "saved" && savedAt
              ? `Saved at ${new Date(savedAt).toLocaleTimeString("en-PH", {
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : "Saved automatically as you type."}
        {worksheetMeta
          ? ` · Version ${worksheetMeta.version}${
              worksheetMeta.status === "SUBMITTED"
                ? " (already sent on — a change starts a new version)"
                : " (draft)"
            } · The Checker sees the version you send on.`
          : " · The Checker sees the version you send on."}
      </div>

      {/* Fields on the left, the worksheet building up on the right. The
          fields stay in view while the long preview is scrolled. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)",
          gap: "0.9rem",
          alignItems: "start",
          // a soft gray tray (works in light and dark) so the fields and the
          // white pages read as one working area
          padding: "0.8rem",
          borderRadius: "10px",
          background: "rgba(100,116,139,0.2)",
        }}
      >
      {/* Focus events bubble, so one listener here covers every field below:
          each input names itself in data-field, and the paper lights up the
          matching spot. */}
      <div
        ref={leftBoxRef}
        onFocus={(e) => setActiveField(e.target.dataset?.field || null)}
        onBlur={() => setActiveField(null)}
        style={{
          position: "sticky",
          top: 0,
          // the popup is 90vh tall and its header, stepper and footer take
          // about 170px, so this must stay under 90vh - 170px or the bottom
          // of the column is cut off
          maxHeight: "calc(90vh - 215px)",
          overflowY: "auto",
        }}
      >
      <style>{`[data-lit="1"] { box-shadow: 0 0 0 2px #f59e0b; background: rgba(255,241,118,0.3) !important; border-radius: 6px; }`}</style>
      <Section
        title={`Worksheet ${worksheetVariant} — ${
          worksheetVariant === "A" ? "PIC/S" : "Non-PIC/S"
        } Member`}
        colors={colors}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.7rem",
            padding: "0.4rem 0",
          }}
        >
          <div>
            <label style={labelStyle}>GMP Evidence Submitted</label>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}
            >
              {GMP_EVIDENCE_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontSize: "0.7rem",
                    color: colors.textPrimary,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    data-field="gmpEvidence"
                    checked={gmpEvidence.includes(opt)}
                    onChange={() => toggleGmpEvidence(opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            <div>
              <label style={labelStyle}>Regulatory Authority (DRA)</label>
              <input
                data-field="issuingAuthority"
                style={inputStyle}
                value={issuingAuthority}
                onChange={(e) => setIssuingAuthority(e.target.value)}
                placeholder="e.g. US FDA"
              />
            </div>
            <div>
              <label style={labelStyle}>Issuing Country</label>
              <input
                data-field="issuingCountry"
                style={inputStyle}
                value={issuingCountry}
                onChange={(e) => setIssuingCountry(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            <div>
              <label style={labelStyle}>Foreign Cert./Document No.</label>
              <input
                data-field="foreignCertificateNumber"
                style={inputStyle}
                value={foreignCertificateNumber}
                onChange={(e) => setForeignCertificateNumber(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Validity</label>
              <input
                data-field="foreignCertificateValidity"
                style={inputStyle}
                value={foreignCertificateValidity}
                onChange={(e) => setForeignCertificateValidity(e.target.value)}
                placeholder="e.g. 31 December 2027"
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Inspection Date(s)</label>
            <input
              data-field="inspectionDate"
              style={inputStyle}
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
              placeholder="e.g. 13-15 August 2025, or N/A"
            />
          </div>

          <div>
            <label style={labelStyle}>Date issued (GMP evidence statement)</label>
            <textarea
              data-field="dateIssuedText"
              value={dateIssuedText}
              onChange={(e) => setDateIssuedText(e.target.value)}
              placeholder="Printed after “Date issued:” on the form"
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {worksheetVariant === "B" && (
            <div>
              <label style={labelStyle}>Approved dosage forms note</label>
              <textarea
                data-field="approvedDosageFormsNote"
                value={approvedDosageFormsNote}
                onChange={(e) => setApprovedDosageFormsNote(e.target.value)}
                placeholder="Left empty, the form's own sentence is printed"
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
          )}

          <DosageRowsEditor
            title="Annex B — dosage forms applied"
            field="appliedForms"
            rows={appliedForms}
            setRows={setAppliedForms}
            colors={colors}
            labelStyle={labelStyle}
            inputStyle={inputStyle}
          />

          <DosageRowsEditor
            title="Approved Medicinal Products"
            field="approvedProducts"
            rows={approvedProducts}
            setRows={setApprovedProducts}
            colors={colors}
            labelStyle={labelStyle}
            inputStyle={inputStyle}
          />

          <div>
            <label style={labelStyle}>Remarks</label>
            <textarea
              data-field="worksheetRemarks"
              value={worksheetRemarks}
              onChange={(e) => setWorksheetRemarks(e.target.value)}
              placeholder="Notes for this evaluation..."
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {worksheetVariant === "B" && (
            <div>
              <label style={labelStyle}>
                If for compliance, deficiency noted
              </label>
              <textarea
                data-field="complianceNotes"
                value={complianceNotes}
                onChange={(e) => setComplianceNotes(e.target.value)}
                placeholder="Extra notes. The Notices of Deficiency are listed on the form automatically."
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
          )}

          <div>
            <label style={labelStyle}>Recommendation</label>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}
            >
              {RECOMMENDATION_LABELS.filter(
                // Worksheet A's form has no FOR INSPECTION box
                (l) => worksheetVariant === "B" || l !== "FOR INSPECTION",
              ).map((l) => (
                <label
                  key={l}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontSize: "0.7rem",
                    color: colors.textPrimary,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    data-field="recommendationChoice"
                    checked={worksheetDoc.recommendation === l}
                    // ticking one moves the tick; ticking it again empties it
                    onChange={() =>
                      setRecommendationChoice(
                        worksheetDoc.recommendation === l ? "" : l,
                      )
                    }
                  />
                  {l}
                </label>
              ))}
            </div>
            <div
              style={{
                fontSize: "0.6rem",
                color: colors.textTertiary,
                marginTop: "0.25rem",
              }}
            >
              Tick one, or leave all empty. Only for the worksheet; it does not
              change the action you submit.
            </div>
          </div>

          {/* Worksheet B only: the red prompts in Annex C. Left empty, the
              paper keeps showing the form's own red prompt. */}
          {worksheetVariant === "B" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.7rem",
                paddingTop: "0.7rem",
                borderTop: `1px solid ${colors.cardBorder}`,
              }}
            >
              <div
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: colors.textPrimary,
                }}
              >
                Annex C — documents provided
              </div>
              {ANNEX_C_FIELDS.map((f) => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  {f.type === "textarea" ? (
                    <textarea
                      data-field={f.key}
                      value={annexC[f.key] || ""}
                      onChange={(e) => setAnnexCField(f.key, e.target.value)}
                      rows={3}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  ) : (
                    <input
                      type={f.type || "text"}
                      data-field={f.key}
                      style={inputStyle}
                      value={annexC[f.key] || ""}
                      onChange={(e) => setAnnexCField(f.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
              <AnnexRowsEditor
                rows={annexRows}
                setRows={setAnnexRows}
                colors={colors}
                labelStyle={labelStyle}
                inputStyle={inputStyle}
              />
            </div>
          )}
        </div>
      </Section>
      </div>

      {/* no white card here: the pages sit straight on the gray tray */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            padding: "0.15rem 0.2rem 0.5rem",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: colors.textPrimary,
          }}
        >
          Live Preview
        </div>
        <FgmpWorksheetPaper
          doc={worksheetDoc}
          variant={worksheetVariant}
          activeField={activeField}
          onPaperFocus={onPaperFocus}
          annexRows={annexRows}
          onAnnexRowsChange={setAnnexRows}
          editor={worksheetEditor}
        />
      </div>
      </div>
    </div>
  );

  const renderStepDecision = () => (
    <div
      style={{
        maxWidth: "640px",
        display: "flex",
        flexDirection: "column",
        gap: "0.9rem",
      }}
    >
      <Section title={`${row.applicationStep} Decision`} colors={colors}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.7rem",
            padding: "0.4rem 0",
          }}
        >
          {draftRestored && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.6rem",
                padding: "0.4rem 0.6rem",
                borderRadius: "6px",
                fontSize: "0.66rem",
                background: "rgba(245,158,11,0.12)",
                color: "#b45309",
              }}
            >
              <span>
                Restored what you had typed here before. It was never
                submitted.
              </span>
              <button
                onClick={() => setShowStartOverConfirm(true)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#b45309",
                  fontWeight: 700,
                  fontSize: "0.66rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Start over
              </button>
            </div>
          )}

          <div>
            <label style={labelStyle}>Action</label>
            <select
              style={inputStyle}
              value={decision}
              onChange={(e) => {
                setDecision(e.target.value);
                setAssigneeUuid("");
              }}
            >
              <option value="">Select action</option>
              {stepActions.map((a) => (
                <option key={a.action} value={a.action}>
                  {a.action}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              Remarks
              {needsAssignee || !decision || isCompliance ? "" : " (required)"}
            </label>
            <textarea
              value={evalRemarks}
              onChange={(e) =>
                setEvalRemarks(e.target.value.slice(0, MAX_REMARKS_LENGTH))
              }
              placeholder="Write your remarks..."
              rows={5}
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
              {MAX_REMARKS_LENGTH - evalRemarks.length} characters left
            </div>
          </div>

          {isCompliance && (
            <NodForm
              colors={colors}
              labelStyle={labelStyle}
              inputStyle={inputStyle}
              form={{ deficiencies: nodDeficiencies, documentLines: nodDocLines }}
              onChange={(f) => {
                setNodDeficiencies(f.deficiencies);
                setNodDocLines(f.documentLines);
              }}
              nods={nods}
              application={nodApplication}
            />
          )}

          {canSetIssuance && (
            <div>
              <label style={labelStyle}>Type of Issuance</label>
              <select
                style={inputStyle}
                value={typeOfIssuance}
                onChange={(e) => setTypeOfIssuance(e.target.value)}
              >
                <option value="">Not decided yet</option>
                {issuanceTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <div
                style={{
                  fontSize: "0.6rem",
                  color: colors.textTertiary,
                  marginTop: "0.2rem",
                }}
              >
                Saved on the application and carried to the next step.
              </div>
            </div>
          )}

          {needsAssignee && (
            <div>
              <label style={labelStyle}>Assign {nextStep}</label>
              <select
                style={inputStyle}
                value={assigneeUuid}
                onChange={(e) => setAssigneeUuid(e.target.value)}
                disabled={loadingAssignees}
              >
                <option value="">
                  {loadingAssignees
                    ? "Loading..."
                    : `Select ${nextStep.toLowerCase()}`}
                </option>
                {assignees.map((a) => (
                  <option key={a.user_uuid} value={a.user_uuid}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {decision && !needsAssignee && nextStep === row.applicationStep && (
            <div
              style={{
                fontSize: "0.68rem",
                lineHeight: 1.5,
                color: colors.textTertiary,
              }}
            >
              The application stays with you. This round is recorded in the
              application's history and a fresh task opens on your queue.
            </div>
          )}
        </div>
      </Section>
      {renderNodsCard()}
    </div>
  );

  /* ───────────── The issuance document ───────────── */
  const renderIssuanceDocument = () => (
    <div style={{ height: "680px" }}>
      <PdfViewer
        colors={colors}
        defaultZoom={0.8}
        fileName={`${previewedIssuance} - ${referenceNumber}.pdf`}
        pageStyle={LETTERHEAD_PAGE_STYLE}
      >
        {issuancePaper.paper === "disapproval" ? (
          <LetterOfDisapprovalPaper
            doc={issuanceDoc}
            reason={issuancePaper.reason}
          />
        ) : issuancePaper.paper === "extension" ? (
          <ExtensionLetterPaper doc={issuanceDoc} />
        ) : issuancePaper.paper === "inspectionNotice" ? (
          <InspectionNoticePaper doc={issuanceDoc} />
        ) : (
          <CgmpClearancePaper
            doc={issuanceDoc}
            variant={issuancePaper.variant}
          />
        )}
      </PdfViewer>
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
    // The numbered layouts (everything but the cashier's posting flow) say
    // what each step is, so the order can change without touching this.
    const kind = steps.find((s) => s.id === step)?.kind;
    if (kind === "details") return renderStep1();
    if (kind === "issuance") return renderIssuanceDocument();
    if (kind === "deckerDecision") return renderDeckerDecision();
    if (kind === "worksheet")
      return canSetIssuance ? renderWorksheet() : renderWorksheetReadOnly();
    if (kind === "decision") return renderStepDecision();
    if (kind === "history") return renderHistory();

    // The cashier's posting flow keeps its fixed numbering
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
                ? postError
                : `Step ${step} of ${lastStep}${
                    canPost && step === 2 && payments.length === 0
                      ? " — add at least 1 payment to continue to Step 3"
                      : ""
                  }${
                    canPost && step === 3 && hasBalance
                      ? ` — payment is short by ${peso(balance)}, continue to Step 4`
                      : ""
                  }${
                    step === lastStep &&
                    (isDeckingOpen || isWorkflowStepOpen) &&
                    submitBlocker
                      ? ` — can't submit yet: ${submitBlocker}${
                          decisionStepNumber
                            ? ` (go back to Step ${decisionStepNumber})`
                            : ""
                        }`
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
              ) : isDeckingOpen || isWorkflowStepOpen ? (
                <button
                  style={navBtn(true, !canSubmit || submittingDecision)}
                  disabled={!canSubmit || submittingDecision}
                  onClick={() => setShowDecisionConfirm(true)}
                >
                  ✔ Submit
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

        {showStartOverConfirm && (
          <StartOverConfirmModal
            colors={colors}
            onConfirm={startOver}
            onCancel={() => setShowStartOverConfirm(false)}
          />
        )}

        {showDecisionConfirm && (
          <DecisionConfirmModal
            colors={colors}
            decision={decision}
            nextStep={isDeckingOpen ? ISSUANCE_STEP : nextStep}
            assigneeName={
              isDeckingOpen
                ? needsEvaluator
                  ? selectedEvaluator?.name
                  : null
                : needsAssignee
                  ? selectedAssignee?.name
                  : null
            }
            onConfirm={
              isDeckingOpen ? handleSubmitDeckerDecision : handleSubmitDecision
            }
            onCancel={() => setShowDecisionConfirm(false)}
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
