// src/components/eapplication/processes/fgmp/FgmpWorksheetPaper.jsx
//
// The GMP Clearance Worksheet, drawn to match the unit's own Word forms
// (re-checked against the copies saved 2026-10-22):
//   Annex 1 Worksheet-A  -> PIC/S member       (QWP-CDRR/LRD-02 Annex 1, 2 pages)
//   Annex 2 Worksheet-B  -> Non-PIC/S member   (QWP-CDRR/LRD-02 Annex 2, 3 pages)
//
// Sizes below are the Word file's own: tables in twips (1/1440 inch, divided
// by 15 to get pixels), fonts in points. Each page is a real A4 sheet with
// the FDA header, the document-control table and the address footer, so it
// reads like the printed form. The sheet is scaled down to fit the pane.
//
// NOT YET SAVED ANYWHERE REAL. The values the evaluator fills in (GMP
// evidence, authority, country, the foreign certificate's number/validity,
// inspection date, remarks) have no column to live in yet — they are kept
// only in the evaluator's own browser draft (see FgmpDetailsModal.jsx) and
// are invisible to the Checker.
//
// Still blank on purpose: the dosage-form tables (Annex B and Approved
// Medicinal Products), "Date issued", "Email date" and the designations —
// nothing in the system holds them yet. The red <...> texts in Worksheet B's
// Annex C are the form's own fill-in prompts: they stay red until the
// evaluator types a value (ANNEX_C_FIELDS), then print it in black.

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { buildIssuanceDoc } from "./FgmpIssuancePapers.jsx";
import { newFormRow, shortDate } from "./fgmpWorksheetSync.js";

const longDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-PH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

/* What the evaluator may tick for "GMP Evidence" */
export const GMP_EVIDENCE_OPTIONS = [
  "GMP Certificate",
  "WHO Certificate of Pharmaceutical Product",
  "Manufacturer's License or Manufacturing Authorization",
  "CoPP / Certificate of Free Sale",
];

/* How the form words each of those four (same order) */
const EVIDENCE_FORM_TEXT = [
  "GMP Certificate",
  "WHO Certificate of Pharmaceutical Product",
  "Manufacturer’s License or Manufacturing Authorization incorporating the specific medicinal products/dosage form",
  "CoPP/Cert of Free Sale",
];

/* Worksheet B's Annex C has red prompts (<no.>, <date of inspection>, …)
   for the evaluator to fill in. Each one the evaluator can type into is
   listed here; the date of inspection is not, because the Inspection Date
   field above already supplies it. `type` is how the left-hand box looks. */
export const ANNEX_C_FIELDS = [
  { key: "inspectionBy", label: "Last inspection done by (local / PIC/S NRA)" },
  { key: "contractValidity", label: "GMP contract valid until", type: "date" },
  {
    key: "supplyProducts",
    label: "Products to be made available in the Philippines",
    type: "textarea",
  },
  { key: "smfNo", label: "Site Master File Doc. No." },
  { key: "vmpNo", label: "Validation Master Plan Doc No." },
  { key: "qrmNo", label: "Quality Risk Management SOP No." },
  { key: "amvNo", label: "Analytical Method Validation SOP No." },
  { key: "amtNo", label: "Analytical Method Transfer SOP No." },
  { key: "devNo", label: "Handling of Deviation SOP No." },
  { key: "oosNo", label: "Handling of OOS Test Results SOP No." },
];

/* ───────── "you are editing this" highlight ─────────
   The screen tells the paper which left-hand field has the cursor
   (`activeField`). Every spot on the paper that shows that value is marked
   with data-hl and lit up, and the preview scrolls to the first one. Some
   values appear in more than one place (the foreign certificate number is
   in the Remarks column and again in Annex C), so several spots can light. */
const ActiveRegion = createContext(null);

/* left-hand field -> the paper region it feeds (annexC keys map to themselves) */
const FIELD_REGION = {
  issuingAuthority: "dra",
  issuingCountry: "dra",
  foreignCertificateNumber: "certNo",
  foreignCertificateValidity: "validity",
  inspectionDate: "inspectionDate",
  worksheetRemarks: "remarks",
  gmpEvidence: "gmpEvidence",
  recommendationChoice: "recommendation",
  dateIssuedText: "dateIssuedText",
  approvedDosageFormsNote: "approvedDosageFormsNote",
  complianceNotes: "complianceNotes",
};

const HIGHLIGHT = {
  background: "#fff176",
  outline: "2px solid #f59e0b",
  outlineOffset: 1,
  borderRadius: 2,
};

/* Dates cannot be typed freely (they are stored as a date), so those spots
   still open a small date picker; every other value is typed straight on the
   paper. `id` is the name the screen knows the value by. */
const FIELD_DEFS = {};
ANNEX_C_FIELDS.filter((f) => f.type === "date").forEach((f) => {
  FIELD_DEFS[f.key] = [{ id: `annexC.${f.key}`, label: f.label, type: "date" }];
});

/* { editor, open } when the paper can be edited, otherwise null */
const EditCtx = createContext(null);

const faint = { color: "#94a3b8", fontStyle: "italic", fontWeight: 400 };

function Hl({ k, block, empty, children }) {
  const active = useContext(ActiveRegion) === k;
  const open = useContext(EditCtx)?.open;
  const editable = !!open && !!FIELD_DEFS[k];
  const Tag = block ? "div" : "span";
  return (
    <Tag
      data-hl={k}
      onClick={
        editable
          ? (e) => {
              e.stopPropagation();
              open(k, e.currentTarget);
            }
          : undefined
      }
      title={editable ? "Click to edit" : undefined}
      style={{
        ...(editable && !block
          ? { cursor: "pointer", borderBottom: "1px dotted #94a3b8" }
          : null),
        ...(editable && block ? { cursor: "pointer" } : null),
        ...(active ? HIGHLIGHT : null),
      }}
    >
      {children}
      {/* an empty value has nothing to click or colour, so give it a spot */}
      {empty && editable ? (
        <span style={faint}>click to fill</span>
      ) : active && empty ? (
        "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"
      ) : null}
    </Tag>
  );
}

/* the small box that opens next to the value being edited */
function EditPopover({ at, fields, editor, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const away = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const key = (e) => {
      if (e.key === "Escape") onClose();
    };
    const scrolled = (e) => {
      if (!ref.current || !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", scrolled, true);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", scrolled, true);
    };
  }, [onClose]);

  const below = at.bottom + 260 < window.innerHeight;
  const input = {
    width: "100%",
    boxSizing: "border-box",
    padding: "5px 7px",
    border: "1px solid #94a3b8",
    borderRadius: 5,
    font: "13px Arial, sans-serif",
    color: "#111",
    background: "#fff",
  };

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        zIndex: 10050,
        left: Math.max(8, Math.min(at.left, window.innerWidth - 310)),
        ...(below ? { top: at.bottom + 6 } : { bottom: window.innerHeight - at.top + 6 }),
        width: 300,
        padding: 10,
        background: "#fff",
        color: "#111",
        border: "1px solid #94a3b8",
        borderRadius: 8,
        boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {fields.map((f, i) => (
        <label key={f.id} style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569" }}>
          {f.label}
            <input
              autoFocus={i === 0}
              type={f.type === "date" ? "date" : "text"}
              value={editor.get(f.id) || ""}
              onChange={(e) => editor.set(f.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onClose();
              }}
              style={{ ...input, marginTop: 3 }}
            />
        </label>
      ))}
      <button
        type="button"
        onClick={onClose}
        style={{
          alignSelf: "flex-end",
          padding: "4px 14px",
          border: "none",
          borderRadius: 5,
          background: "#2563eb",
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Done
      </button>
    </div>
  );
}

/* A value typed straight onto the paper, like in Word. The text lives in the
   page, not in React, so the cursor never jumps while typing; it is only
   rewritten from the screen's value when this spot is NOT being typed in
   (for example when the same value is edited in the left column, or shown a
   second time elsewhere on the paper). Without an editor it is plain text. */
function Ed({ k, id, value, hole, ph = "click to fill", multiline, write, fallback, leftRef }) {
  const editor = useContext(EditCtx)?.editor;
  const notify = useContext(EditCtx)?.notify;
  const active = useContext(ActiveRegion) === k;
  const ref = useRef(null);
  const text = value || "";
  // which left-column field this spot is (an Annex C spot is named annexC.<key>)
  const left = leftRef || { field: id && id.startsWith("annexC.") ? id.slice(7) : id };

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.textContent !== text) {
      el.textContent = text;
    }
  });

  if (!editor) {
    return (
      <Hl k={k} empty={!text}>
        {text ? text : fallback ? fallback : hole ? <Red>{hole}</Red> : null}
      </Hl>
    );
  }
  return (
    <span
      ref={ref}
      data-hl={k}
      data-ph={hole || fallback || ph}
      className={
        hole
          ? "ws-ph ws-ph-red"
          : fallback
            ? "ws-ph ws-ph-black"
            : "ws-ph ws-ph-faint"
      }
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck={false}
      onFocus={() => notify?.(left)}
      onBlur={() => notify?.(null)}
      onInput={(e) => {
        const el = e.currentTarget;
        if (!el.textContent && el.innerHTML) el.innerHTML = ""; // keep :empty true
        const v = el.textContent;
        const clean = multiline ? v : v.replace(/\n/g, " ");
        if (write) write(clean);
        else editor.set(id, clean);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      style={{
        outline: "none",
        cursor: "text",
        whiteSpace: multiline ? "pre-wrap" : undefined,
        ...(active ? HIGHLIGHT : null),
      }}
    />
  );
}

/* Regulatory authority and its country: two values, one spot on the form */
function Dra({ doc }) {
  const editor = useContext(EditCtx)?.editor;
  if (!editor) {
    return (
      <Hl k="dra" empty={!doc.dra}>
        {doc.dra}
      </Hl>
    );
  }
  return (
    <>
      <Ed k="dra" id="issuingAuthority" value={doc.issuingAuthority} ph="authority" />
      {", "}
      <Ed k="dra" id="issuingCountry" value={doc.issuingCountry} ph="country" />
    </>
  );
}

/* the placeholders shown in an empty typed spot */
const PAPER_CSS = `
.ws-ph:empty::before { content: attr(data-ph); }
.ws-ph-red:empty::before { color: #ff0000; }
.ws-ph-black:empty::before { color: #000; }
.ws-ph-faint:empty::before { color: #94a3b8; font-style: italic; font-weight: 400; }
.ws-ph:focus { background: #fff9c4; box-shadow: 0 0 0 2px #f59e0b; border-radius: 2px; }
`;

/* A typed value in normal black, or the form's own red prompt until then */
const Fill = ({ k, value, hole }) =>
  FIELD_DEFS[k] ? (
    <Hl k={k}>{value ? value : <Red>{hole}</Red>}</Hl>
  ) : (
    <Ed k={k} id={`annexC.${k}`} value={value} hole={hole} multiline={k === "supplyProducts"} />
  );

/* Which RECOMMENDATION box to tick. The form has four boxes; the system has
   a Type of Issuance and an action. Letters of disapproval are DENIAL, the
   two inspection notices are FOR INSPECTION, a certificate is APPROVED, and
   the "For Compliance" action is FOR COMPLIANCE. Anything else (extension,
   permit, acknowledgement) leaves every box empty rather than guess. */
export const RECOMMENDATION_LABELS = [
  "APPROVED",
  "FOR INSPECTION",
  "FOR COMPLIANCE",
  "DENIAL",
];

export function recommendationFor(typeOfIssuance, decision) {
  if (decision === "For Compliance") return "FOR COMPLIANCE";
  const t = typeOfIssuance || "";
  if (t.startsWith("Letter of Disapproval")) return "DENIAL";
  if (t.startsWith("Notice for Inspection") || t.startsWith("NFI"))
    return "FOR INSPECTION";
  if (t.startsWith("CGMP Clearance") || t.startsWith("Certificate of GMP"))
    return "APPROVED";
  return null;
}

/* ───────── measurements ───────── */
const PAGE_W = 794; // A4 at 96 dpi
const PAGE_H = 1123;
const px = (twips) => twips / 15;
const pt = (points) => `${(points * 4) / 3}px`;
const FONT = '"Times New Roman", Times, serif';
const LINE = "1px solid #000";
const RED = "#ff0000";

const GREEN = "#92D050";
const PALE_GREEN = "#A8D08D";
const ORANGE = "#FFC000";
const BLUE = "#92CDDC";

function Tbl({ cols, width, style, children }) {
  return (
    <table
      style={{
        borderCollapse: "collapse",
        tableLayout: "fixed",
        width: px(width ?? cols.reduce((a, b) => a + b, 0)),
        fontSize: pt(11),
        lineHeight: 1.15,
        ...style,
      }}
    >
      <colgroup>
        {cols.map((c, i) => (
          <col key={i} style={{ width: px(c) }} />
        ))}
      </colgroup>
      <tbody>{children}</tbody>
    </table>
  );
}

function Td({ span, fill, plain, style, children }) {
  return (
    <td
      colSpan={span}
      style={{
        border: plain ? "none" : LINE,
        padding: "0 7px",
        verticalAlign: "top",
        background: fill,
        // a long word with no spaces breaks inside the cell, never wider
        overflowWrap: "anywhere",
        ...style,
      }}
    >
      {children}
    </td>
  );
}

const Red = ({ children }) => <span style={{ color: RED }}>{children}</span>;
const Gap = ({ h }) => <div style={{ height: h }} />;
const Blank = () => <div style={{ height: "1.15em" }} />;

function Box({ checked }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 17,
        border: LINE,
        boxSizing: "border-box",
        fontSize: pt(10),
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {checked ? "✓" : ""}
    </span>
  );
}

/* ───────── pieces shared by both worksheets ───────── */

function HeaderTable({ page, pages, code, title }) {
  const small = { fontSize: pt(8) };
  return (
    <Tbl cols={[3307, 1656, 1418, 2410, 1388]} style={{ fontSize: pt(11) }}>
      <tr style={{ height: px(665) }}>
        <Td span={2}>
          <div style={small}>Document Type</div>
          <Blank />
          <b>Annexes</b>
        </Td>
        <Td>
          <div style={small}>Revision No:</div>
          <Blank />
          01
        </Td>
        <Td>
          <div style={small}>Date Effective:</div>
          <Blank />
          15 August 2017
        </Td>
        <Td>
          <div>Page No:</div>
          <Blank />
          Page {page} of {pages}
        </Td>
      </tr>
      <tr style={{ height: px(602) }}>
        <Td>
          <div style={{ ...small, fontWeight: 700 }}>Document Code</div>
          <b>{code}</b>
        </Td>
        <Td span={4} style={{ verticalAlign: "middle" }}>
          <b>{title}</b>
        </Td>
      </tr>
    </Tbl>
  );
}

function Page({ n, total, variant, bodyTop, children }) {
  const isA = variant === "A";
  return (
    <div
      style={{
        position: "relative",
        width: PAGE_W,
        minHeight: PAGE_H,
        background: "#fff",
        color: "#000",
        fontFamily: FONT,
        boxShadow: "0 1px 5px rgba(0,0,0,0.3)",
        flexShrink: 0,
      }}
    >
      <img
        src="/images/fgmp-worksheet-header.png"
        alt=""
        style={{ position: "absolute", left: 81, top: 2, width: 602 }}
      />
      <div style={{ position: "absolute", left: 74, top: 86 }}>
        <HeaderTable
          page={n}
          pages={total}
          code={`QWP-CDRR/LRD-02 Annex  ${isA ? 1 : 2}`}
          title={`GMP Clearance Worksheet ${variant}`}
        />
      </div>
      {/* the Word footer picture is trimmed 26.9% off its right edge */}
      <div
        style={{
          position: "absolute",
          left: 154,
          bottom: isA ? -4 : 8,
          width: 440,
          height: 85,
          overflow: "hidden",
        }}
      >
        <img
          src="/images/fgmp-worksheet-footer.png"
          alt=""
          style={{ display: "block", width: 601.6 }}
        />
      </div>
      {/* 76px on the right makes the writing area exactly as wide as the
          widest table (616px), so a long typed line stops where the tables
          stop instead of running to the edge of the paper */}
      <div style={{ padding: `${bodyTop}px 76px 110px 102px` }}>{children}</div>
    </div>
  );
}

/* Reference Number … LTO Validity */
function TopTable({ doc, variant }) {
  const A = variant === "A";
  const cols = A
    ? [1908, 810, 900, 1440, 1170, 2981]
    : [2088, 630, 900, 2160, 1170, 1978];
  const first = A ? 2 : 1; // columns the short labels span
  const rest = A ? 4 : 5;
  const val = { fontWeight: 700 };
  return (
    <Tbl cols={cols} style={{ fontFamily: FONT }}>
      <tr style={{ height: px(260) }}>
        <Td span={first}>Reference Number:</Td>
        <Td span={rest} style={val}>
          {doc.dtn}
        </Td>
      </tr>
      <tr style={{ height: px(252) }}>
        <Td span={3}>Name of Foreign Drug Manufacturer :</Td>
        <Td span={3} style={val}>
          {doc.manufacturer}
        </Td>
      </tr>
      <tr style={{ height: px(278) }}>
        <Td span={first}>Plant Address :</Td>
        <Td span={rest} style={val}>
          {doc.plantAddress}
        </Td>
      </tr>
      <tr style={{ height: px(248) }}>
        <Td span={2}>Local Drug Establishment:</Td>
        <Td span={4} style={val}>
          {doc.importer}
        </Td>
      </tr>
      <tr style={{ height: px(278) }}>
        <Td>LTO No.:</Td>
        <Td span={3} style={val}>
          {doc.ltoNumber}
        </Td>
        <Td>Validity :</Td>
        <Td style={val}>{doc.ltoValidity}</Td>
      </tr>
    </Tbl>
  );
}

function EvidenceList({ doc, size }) {
  const editor = useContext(EditCtx)?.editor;
  const notify = useContext(EditCtx)?.notify;
  const toggle = (opt) => {
    notify?.({ field: "gmpEvidence", transient: true });
    const now = editor.get("gmpEvidence") || [];
    editor.set(
      "gmpEvidence",
      now.includes(opt) ? now.filter((o) => o !== opt) : [...now, opt],
    );
  };
  return (
    <Hl k="gmpEvidence" block>
      <div style={{ marginTop: 2, fontSize: size }}>
        {GMP_EVIDENCE_OPTIONS.map((opt, i) => (
          <div
            key={opt}
            onClick={editor ? () => toggle(opt) : undefined}
            title={editor ? "Click to tick or untick" : undefined}
            style={{
              display: "flex",
              gap: 6,
              alignItems: "flex-start",
              marginBottom: 3,
              cursor: editor ? "pointer" : undefined,
            }}
          >
            <Box checked={doc.gmpEvidence?.includes(opt)} />
            <span>{EVIDENCE_FORM_TEXT[i]}</span>
          </div>
        ))}
      </div>
    </Hl>
  );
}

/* The rows of Annex B and of "Approved Medicinal Products". Each row has a
   list of dosage forms (one per line), a product type, and the operations
   (one per line). The evaluator types straight in the cells; "+" adds a row
   and "x" removes one. With no rows the table shows one blank row, as printed. */
const BLANK_ROW_ID = "blank-row";

/* a gray line under an editable table, telling the evaluator how to fill it.
   Shown only while editing, never in the read-only view */
function TableHint() {
  const editing = !!useContext(EditCtx)?.editor;
  if (!editing) return null;
  return (
    <div
      style={{
        fontSize: pt(8),
        color: "#9ca3af",
        fontStyle: "italic",
        fontFamily: "Arial, sans-serif",
        padding: "2px 0 0 2px",
      }}
    >
      Click a cell and type. Press Enter for another line in a cell. Use + (at
      the left) to add a row and × to remove one.
    </div>
  );
}

function FormRows({ listId, rows, cell }) {
  const editor = useContext(EditCtx)?.editor;
  const list = rows || [];
  // Every change is built from the latest rows (a function, as React's own
  // setState takes), so two edits made close together never undo each other.
  const put = (update) => editor.set(listId, update);
  const patch = (id, change) =>
    put((cur) => {
      const rows = cur || [];
      // typing in the blank row starts the first real row. It keeps the same
      // id, so the cell is not replaced and the cursor stays where it is.
      if (!rows.some((r) => r.id === id)) {
        return [...rows, { ...newFormRow(), id, ...change }];
      }
      return rows.map((r) => (r.id === id ? { ...r, ...change } : r));
    });
  const lines = (arr) => (arr || []).join("\n");
  const blankRow = (
    <tr>
      <td style={cell} />
      <td style={cell} />
      <td style={cell} />
    </tr>
  );

  if (!editor) {
    const shown = list.filter(
      (r) =>
        (r.dosageForms || []).some((x) => x && x.trim()) ||
        (r.productType || "").trim() ||
        (r.operations || []).some((x) => x && x.trim()),
    );
    if (shown.length === 0) return blankRow;
    const stack = (arr) =>
      (arr || [])
        .filter((x) => x && x.trim())
        .map((x, i) => <div key={i}>{x}</div>);
    return shown.map((r) => (
      <tr key={r.id}>
        <td style={cell}>{stack(r.dosageForms)}</td>
        <td style={cell}>{r.productType}</td>
        <td style={cell}>{stack(r.operations)}</td>
      </tr>
    ));
  }
  // With no rows yet, the blank row is a real row to type in straight away.
  const shown = list.length ? list : [{ ...newFormRow(), id: BLANK_ROW_ID }];
  return (
    <>
      {shown.map((r, i) => (
        <tr key={r.id}>
          <td style={cell}>
            <Ed
              k={listId}
              leftRef={{ field: listId, rowId: r.id }}
              value={lines(r.dosageForms)}
              ph="dosage forms, one per line"
              multiline
              write={(v) => patch(r.id, { dosageForms: v.split("\n") })}
            />
          </td>
          <td style={cell}>
            <Ed
              k={listId}
              leftRef={{ field: listId, rowId: r.id }}
              value={r.productType}
              ph="product type"
              write={(v) => patch(r.id, { productType: v })}
            />
          </td>
          <td style={{ ...cell, position: "relative" }}>
            <Ed
              k={listId}
              leftRef={{ field: listId, rowId: r.id }}
              value={lines(r.operations)}
              ph="operations, one per line"
              multiline
              write={(v) => patch(r.id, { operations: v.split("\n") })}
            />
            {list.length > 0 && (
              <button
                type="button"
                title="Remove this row"
                onClick={() => put((cur) => (cur || []).filter((x) => x.id !== r.id))}
                style={{ ...roundButton, right: -26, top: 1 }}
              >
                ×
              </button>
            )}
          </td>
        </tr>
      ))}
      <tr style={{ height: 0 }}>
        <td colSpan={3} style={{ padding: 0, border: "none", height: 0, position: "relative" }}>
          <button
            type="button"
            title="Add a row"
            onClick={() =>
              put((cur) => {
                const rows = cur || [];
                // The blank row you see is the first row. Adding to an empty
                // table keeps it (same id, so the cell is not replaced) and
                // adds a new one below it.
                const first = rows.length
                  ? rows
                  : [{ ...newFormRow(), id: BLANK_ROW_ID }];
                return [...first, newFormRow()];
              })
            }
            style={{ ...roundButton, left: -26, top: -9 }}
          >
            +
          </button>
        </td>
      </tr>
    </>
  );
}

/* the little "Applied the following dosage forms" grid inside Annex B */
function DosageGrid({ withHeadings, doc }) {
  const cell = {
    border: LINE,
    padding: "0 5px",
    height: 18,
    verticalAlign: "top",
    overflowWrap: "anywhere",
  };
  return (
    <>
    <table
      style={{
        borderCollapse: "collapse",
        // fixed columns: the table keeps its width however long the text is
        tableLayout: "fixed",
        width: "83%",
        marginLeft: 2,
        fontSize: pt(10),
        lineHeight: 1.15,
      }}
    >
      <colgroup>
        <col style={{ width: "32%" }} />
        <col style={{ width: "31%" }} />
        <col style={{ width: "37%" }} />
      </colgroup>
      <tbody>
        <tr>
          <td colSpan={3} style={{ ...cell, textAlign: "center", height: "auto" }}>
            Applied the following pharmaceutical dosage forms/manufacturing
            operations
          </td>
        </tr>
        <tr>
          <td style={cell}>{withHeadings ? "Dosage Form" : ""}</td>
          <td style={cell}>{withHeadings ? "Product Type" : ""}</td>
          <td style={cell}>{withHeadings ? "Manufacturing Operation/s" : ""}</td>
        </tr>
        <FormRows listId="appliedForms" rows={doc.appliedForms} cell={cell} />
      </tbody>
    </table>
    <TableHint />
    </>
  );
}

function ApprovedProducts({ doc }) {
  const cell = {
    border: LINE,
    padding: "0 7px",
    verticalAlign: "top",
    textAlign: "center",
    height: 20,
    overflowWrap: "anywhere",
  };
  return (
    <>
    <Tbl cols={[2978, 2960, 3271]}>
      <tr>
        <Td span={3} fill={GREEN} style={{ textAlign: "center", fontWeight: 700 }}>
          Approved Medicinal Products
        </Td>
      </tr>
      <tr style={{ fontWeight: 700, textAlign: "center" }}>
        <Td>Dosage Form</Td>
        <Td>Product Type</Td>
        <Td>Manufacturing Operation/s</Td>
      </tr>
      <FormRows listId="approvedProducts" rows={doc.approvedProducts} cell={cell} />
    </Tbl>
    <TableHint />
    </>
  );
}

/* Worksheet B: what the Notices of Deficiency asked for, listed by themselves
   (dated, as the unit writes them), then any extra notes typed by hand. */
function ComplianceNotes({ doc }) {
  const nods = [...(doc.nods || [])].sort((a, b) => a.nodNumber - b.nodNumber);
  return (
    <div style={{ fontSize: pt(10) }}>
      <b>If for compliance, indicate the deficiency noted:</b>
      {nods.map((n) => (
        <div key={n.nodNumber} style={{ paddingLeft: 14, textIndent: -14, whiteSpace: "pre-wrap" }}>
          ➢ {shortDate(n.issuedDate)} - {n.deficiencies}
        </div>
      ))}
      <div style={{ whiteSpace: "pre-wrap" }}>
        <Ed k="complianceNotes" id="complianceNotes" value={doc.complianceNotes} multiline />
      </div>
    </div>
  );
}

function RemarksLine({ doc }) {
  return (
    <div style={{ fontSize: pt(10), padding: "0 0 0 0" }}>
      <b>Remarks:</b>{" "}
      <i style={{ whiteSpace: "pre-wrap" }}>
        <Ed k="remarks" id="worksheetRemarks" value={doc.worksheetRemarks} multiline />
      </i>
    </div>
  );
}

/* one RECOMMENDATION box: tick, label, and a line of detail underneath */
function RecCell({ checked, label, detail, center, size, onToggle }) {
  return (
    <div
      onClick={onToggle}
      title={onToggle ? "Click to tick or untick" : undefined}
      style={{
        position: "relative",
        fontSize: size,
        minHeight: 48,
        cursor: onToggle ? "pointer" : undefined,
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 2 }}>
        <Box checked={checked} />
      </div>
      <div style={{ paddingLeft: 28, textAlign: center ? "center" : "left" }}>
        {label}
      </div>
      {detail ? (
        <div
          style={{
            marginTop: 10,
            paddingLeft: 6,
            textAlign: center ? "center" : "left",
            overflowWrap: "anywhere",
          }}
        >
          {detail}
        </div>
      ) : null}
    </div>
  );
}

function Recommendation({ doc, variant }) {
  const A = variant === "A";
  const rec = doc.recommendation;
  const editor = useContext(EditCtx)?.editor;
  const notify = useContext(EditCtx)?.notify;
  // One box at a time, as on the printed form. Clicking the ticked one
  // empties it again; ticking another moves the tick.
  const toggle = editor
    ? (label) => () => {
        notify?.({ field: "recommendationChoice", transient: true });
        editor.set("recommendationChoice", rec === label ? "" : label);
      }
    : () => undefined;
  const size = pt(A ? 10 : 11);
  // the date the latest NOD was issued, from the For Compliance action
  const emailDate = `Email date: ${longDate(doc.emailDate)}`;
  const validity = (
    <>
      Validity:{" "}
      <Ed k="validity" id="foreignCertificateValidity" value={doc.foreignCertificateValidity} />
    </>
  );
  const heading = (
    <Td
      span={A ? 3 : 4}
      fill={GREEN}
      style={{
        textAlign: "center",
        fontWeight: 700,
        fontSize: pt(10),
        height: px(303),
      }}
    >
      ( {rec ? "✓" : "  "} ) &nbsp; RECOMMENDATION
    </Td>
  );
  if (A) {
    return (
      <Hl k="recommendation" block>
      <Tbl cols={[3618, 3420, 2171]}>
        <tr>{heading}</tr>
        <tr style={{ height: px(450) }}>
          <Td>
            <RecCell
              size={size}
              checked={rec === "APPROVED"}
              label="APPROVED"
              onToggle={toggle("APPROVED")}
              detail={validity}
            />
          </Td>
          <Td>
            <RecCell
              size={size}
              checked={rec === "FOR COMPLIANCE"}
              label="FOR COMPLIANCE"
              onToggle={toggle("FOR COMPLIANCE")}
              detail={emailDate}
            />
          </Td>
          <Td>
            <RecCell
              size={size}
              checked={rec === "DENIAL"}
              label="DENIAL"
              onToggle={toggle("DENIAL")}
              center
            />
          </Td>
        </tr>
      </Tbl>
      </Hl>
    );
  }
  return (
    <Hl k="recommendation" block>
    <Tbl cols={[2718, 1813, 3090, 1588]}>
      <tr>{heading}</tr>
      <tr>
        <Td>
          <RecCell
            size={size}
            center
            checked={rec === "APPROVED"}
            label="APPROVED"
              onToggle={toggle("APPROVED")}
            detail={validity}
          />
        </Td>
        <Td>
          <RecCell
            size={size}
            center
            checked={rec === "FOR INSPECTION"}
            label="FOR INSPECTION"
            onToggle={toggle("FOR INSPECTION")}
          />
        </Td>
        <Td>
          <RecCell
            size={size}
            center
            checked={rec === "FOR COMPLIANCE"}
            label="FOR COMPLIANCE"
              onToggle={toggle("FOR COMPLIANCE")}
            detail={emailDate}
          />
        </Td>
        <Td>
          <RecCell
            size={size}
            center
            checked={rec === "DENIAL"}
            label="DENIAL"
              onToggle={toggle("DENIAL")}
          />
        </Td>
      </tr>
    </Tbl>
    </Hl>
  );
}

function Signatures({ doc }) {
  const s = { fontSize: pt(12) };
  return (
    <Tbl cols={[1702, 2722, 2522, 2297]} width={9243} style={{ marginLeft: -2, ...s }}>
      <tr>
        <Td span={4} fill={PALE_GREEN} style={{ height: 20 }} />
      </tr>
      <tr>
        <Td>Evaluated by:</Td>
        <Td>Date: {(doc.evaluatedDates || []).map(shortDate).join("; ")}</Td>
        <Td>Checked by:</Td>
        <Td>Date: {shortDate(doc.checkedDate)}</Td>
      </tr>
      <tr style={{ height: 46 }}>
        <Td />
        <Td />
        <Td />
        <Td />
      </tr>
      <tr>
        <Td>Printed Name</Td>
        <Td>{doc.evaluatedBy || "Name of Evaluator"}</Td>
        <Td>Printed Name</Td>
        <Td>{doc.checkedBy || "Name of Checker"}</Td>
      </tr>
      <tr>
        <Td>Designation</Td>
        <Td>{doc.evaluatorDesignation}</Td>
        <Td>Designation</Td>
        <Td>{doc.checkerDesignation}</Td>
      </tr>
    </Tbl>
  );
}

function ReferenceBlock({ doc }) {
  const amount =
    doc.amount != null
      ? `Php ${Number(doc.amount).toLocaleString("en-PH", {
          minimumFractionDigits: 2,
        })}`
      : "";
  const rows = [
    ["Reference Number", doc.dtn],
    ["Certificate  No. ", doc.certificateNumber],
    ["Reg. Status", doc.applicationType],
    ["OR Number/Date", doc.orNumberDate],
    ["Amount", amount],
  ];
  return (
    <Tbl cols={[2088, 2893]} style={{ marginLeft: 263 }}>
      {rows.map(([label, value]) => (
        <tr key={label} style={{ height: px(250) }}>
          <Td plain>{label}</Td>
          <Td plain>{value}</Td>
        </tr>
      ))}
    </Tbl>
  );
}

/* ───────── Worksheet A (PIC/S) — 2 pages ───────── */

function WorksheetA({ doc }) {
  const t10 = { fontSize: pt(10) };
  const anyEvidence = (doc.gmpEvidence || []).length > 0;
  return (
    <>
      <Page n={1} total={2} variant="A" bodyTop={220}>
        <TopTable doc={doc} variant="A" />

        <Tbl cols={[4707, 4502]} style={t10}>
          <tr>
            <Td span={2} fill={GREEN} style={{ textAlign: "center", fontWeight: 700 }}>
              PIC/s Member
            </Td>
          </tr>
          <tr style={{ textAlign: "center", fontWeight: 700 }}>
            <Td>Requirements</Td>
            <Td>Remarks</Td>
          </tr>
          <tr>
            <Td>
              Name of Regulatory Authority who issued the GMP Certificate
              (Issuing Country)
            </Td>
            <Td style={{ fontWeight: 700 }}>
              <Dra doc={doc} />
            </Td>
          </tr>
          <tr>
            <Td style={{ paddingBottom: 3 }}>
              <b>( {anyEvidence ? "✓" : "  "} ) GMP Evidence</b>
              <EvidenceList doc={doc} size={pt(10)} />
            </Td>
            <Td>
              <div>
                GMP Cert/ Document no.:{" "}
                <Ed k="certNo" id="foreignCertificateNumber" value={doc.foreignCertificateNumber} />
              </div>
              <div>
                Validity:{" "}
                <Ed k="validity" id="foreignCertificateValidity" value={doc.foreignCertificateValidity} />
              </div>
              <div>
                Inspection date:{" "}
                <Ed k="inspectionDate" id="inspectionDate" value={doc.inspectionDate} />
              </div>
              <div>
                Date issued:{" "}
                <Ed k="dateIssuedText" id="dateIssuedText" value={doc.dateIssuedText} multiline />
              </div>
            </Td>
          </tr>
          <tr>
            <Td>Other supporting documents</Td>
            <Td />
          </tr>
          <tr style={{ height: 84 }}>
            <Td>
              <b>Annex B</b>
              <div>GMP Evidence Evaluation Form</div>
            </Td>
            <Td style={{ paddingTop: 18 }}>
              <DosageGrid doc={doc} />
            </Td>
          </tr>
          <tr>
            <Td>
              <b>Annex E</b>
              <div>Notarized Affidavit of Undertaking</div>
            </Td>
            <Td>Provided</Td>
          </tr>
        </Tbl>

        <Gap h={16} />
        <ApprovedProducts doc={doc} />
        <RemarksLine doc={doc} />
        <Gap h={9} />
        <Recommendation doc={doc} variant="A" />
        <Gap h={26} />
        <Signatures doc={doc} />
      </Page>

      <Page n={2} total={2} variant="A" bodyTop={192}>
        <ReferenceBlock doc={doc} />
      </Page>
    </>
  );
}

/* ───────── Worksheet B (Non-PIC/S) — 3 pages ───────── */

const T12 = { fontSize: pt(12) };

/* the bulleted "Provided documents" lists in Annex C */
function Provided({ items, size }) {
  return (
    <>
      <div style={{ fontSize: size }}>Provided documents:</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: size }}>
        {items.map((it) => (
          <li key={it.text}>
            {it.text}
            <Fill k={it.k} value={it.value} hole={it.hole} />
          </li>
        ))}
      </ul>
    </>
  );
}

/* ───────── rows the evaluator adds to Annex C ─────────
   The fixed rows are the form's own. The evaluator can slip extra rows
   (a Contents text and a Remarks text) in at any boundary: `after` is how
   many fixed rows come before the new one (0 = above the first, 7 = below
   the last). With no onChange (read-only) the rows show but cannot change. */
const AnnexRows = createContext({ rows: [], onChange: null });

const newRowId = () =>
  `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/* a text box that grows with what is typed, drawn like the paper's own text */
function AutoText({ value, onChange, placeholder, onFocus, onBlur }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={2}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{
        width: "100%",
        boxSizing: "border-box",
        border: "1px dashed #94a3b8",
        background: "#fffbe6",
        font: "inherit",
        resize: "none",
        overflow: "hidden",
        padding: "2px 4px",
        outline: "none",
      }}
    />
  );
}

const roundButton = {
  position: "absolute",
  width: 18,
  height: 18,
  padding: 0,
  borderRadius: "50%",
  border: "1px solid #64748b",
  background: "#fff",
  color: "#334155",
  fontSize: 13,
  lineHeight: "15px",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "Arial, sans-serif",
};

/* the small "+" on a row boundary. It takes no height of its own. */
function AddRowSlot({ slot }) {
  const { rows, onChange } = useContext(AnnexRows);
  if (!onChange) return null;
  return (
    <tr style={{ height: 0 }}>
      <td
        colSpan={2}
        style={{ padding: 0, border: "none", height: 0, position: "relative" }}
      >
        <button
          type="button"
          title="Add a row here"
          onClick={() =>
            onChange([...rows, { id: newRowId(), after: slot, contents: "", remarks: "" }])
          }
          style={{ ...roundButton, left: -26, top: -9 }}
        >
          +
        </button>
      </td>
    </tr>
  );
}

/* the rows added at this boundary, then the "+" for adding another */
function ExtraRows({ slot }) {
  const { rows, onChange } = useContext(AnnexRows);
  // the left column's "added rows" list lights these rows up while it has the cursor
  const notify = useContext(EditCtx)?.notify;
  const here = (id) => ({
    onFocus: () => notify?.({ field: "annexRows", rowId: id }),
    onBlur: () => notify?.(null),
  });
  const lit = useContext(ActiveRegion) === "annexRows";
  const litStyle = lit ? { background: "#fff9c4" } : undefined;
  const mine = rows.filter((r) => r.after === slot);
  const edit = (id, field, value) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  return (
    <>
      {mine.map((r) =>
        onChange ? (
          <tr key={r.id} data-hl="annexRows">
            <Td style={litStyle}>
              <AutoText
                value={r.contents}
                placeholder="Contents"
                onChange={(v) => edit(r.id, "contents", v)}
                {...here(r.id)}
              />
            </Td>
            <Td style={{ position: "relative", ...litStyle }}>
              <AutoText
                value={r.remarks}
                placeholder="Remarks"
                onChange={(v) => edit(r.id, "remarks", v)}
                {...here(r.id)}
              />
              <button
                type="button"
                title="Remove this row"
                onClick={() => onChange(rows.filter((x) => x.id !== r.id))}
                style={{ ...roundButton, right: -26, top: 2 }}
              >
                ×
              </button>
            </Td>
          </tr>
        ) : r.contents || r.remarks ? (
          <tr key={r.id}>
            <Td style={{ whiteSpace: "pre-wrap" }}>{r.contents}</Td>
            <Td style={{ whiteSpace: "pre-wrap" }}>{r.remarks}</Td>
          </tr>
        ) : null,
      )}
      <AddRowSlot slot={slot} />
    </>
  );
}

function WorksheetB({ doc }) {
  const anyEvidence = (doc.gmpEvidence || []).length > 0;
  const justify = { textAlign: "justify" };
  const importer = doc.importer;
  const c = doc.annexC || {};
  return (
    <>
      <Page n={1} total={3} variant="B" bodyTop={192}>
        <TopTable doc={doc} variant="B" />
        <Gap h={20} />

        <Tbl cols={[4371, 4838]}>
          <tr>
            <Td span={2} fill={ORANGE} style={{ textAlign: "center", fontWeight: 700 }}>
              Non-PIC/s Member
            </Td>
          </tr>
          <tr style={{ textAlign: "center", fontWeight: 700 }}>
            <Td>Requirements</Td>
            <Td>Remarks</Td>
          </tr>
          <tr>
            <Td>
              <span style={{ fontSize: pt(10) }}>
                Name and Country of Regulatory Authority who issued the GMP
                Certificate{" "}
              </span>
              <span style={{ fontSize: pt(8) }}>(Issuing Country)</span>
            </Td>
            <Td style={{ fontWeight: 700 }}>
              <Dra doc={doc} />
            </Td>
          </tr>
          <tr>
            <Td style={{ paddingBottom: 3 }}>
              <b>( {anyEvidence ? "✓" : "  "} ) GMP Evidence</b>
              <EvidenceList doc={doc} size={pt(11)} />
            </Td>
            <Td>
              <div style={{ fontSize: pt(10) }}>
                <div>
                  GMP Cert/ Document no.:{" "}
                  <Ed k="certNo" id="foreignCertificateNumber" value={doc.foreignCertificateNumber} />
                </div>
                <div>
                  Validity:{" "}
                  <Ed k="validity" id="foreignCertificateValidity" value={doc.foreignCertificateValidity} />
                </div>
                <div>
                  Inspection date:{" "}
                  <Ed k="inspectionDate" id="inspectionDate" value={doc.inspectionDate} />
                </div>
                <div>
                  Date issued:{" "}
                  <Ed k="dateIssuedText" id="dateIssuedText" value={doc.dateIssuedText} multiline />
                </div>
              </div>
              <div style={justify}>
                Approved dosage forms:{" "}
                <Ed
                  k="approvedDosageFormsNote"
                  id="approvedDosageFormsNote"
                  value={doc.approvedDosageFormsNote}
                  multiline
                  fallback="See attached GMP evidence for the list of approved dosage forms."
                />
              </div>
            </Td>
          </tr>
          <tr>
            <Td>Other supporting documents</Td>
            <Td />
          </tr>
          <tr>
            <Td style={{ height: 90 }}>
              <b>Annex B</b>
              <div>GMP Evidence Evaluation Form</div>
            </Td>
            <Td style={{ paddingTop: 18 }}>
              <DosageGrid withHeadings doc={doc} />
            </Td>
          </tr>
          <tr>
            <Td span={2}>
              <b>Annex C</b>
            </Td>
          </tr>
          <tr style={{ ...T12, textAlign: "center", fontWeight: 700 }}>
            <Td style={{ verticalAlign: "middle" }}>CONTENTS</Td>
            <Td style={{ verticalAlign: "middle" }}>REMARKS</Td>
          </tr>
          <ExtraRows slot={0} />
          <tr>
            <Td style={T12}>Original or notarized copy of GMP Cert</Td>
            <Td style={{ ...justify, fontSize: pt(10) }}>
              Submitted apostilled e-copy of the GMP evidence issued by{" "}
              <Dra doc={doc} />{" "}
              with certificate number{" "}
              <Ed k="certNo" id="foreignCertificateNumber" value={doc.foreignCertificateNumber} />{" "}
              which is valid until{" "}
              <Ed k="validity" id="foreignCertificateValidity" value={doc.foreignCertificateValidity} />{" "}
              .
            </Td>
          </tr>
          <ExtraRows slot={1} />
          <tr>
            <Td>
              Copy of the last inspection report and the manufacturer’s
              response to the deficiencies noted
            </Td>
            <Td style={justify}>
              The submitted compliance report specifies all the appropriate
              actions taken by the manufacturing company for the deficiencies
              found during the inspection conducted on{" "}
              <Ed
                k="inspectionDate"
                id="inspectionDate"
                value={doc.inspectionDate}
                hole="<date of inspection>"
              />{" "}
              by{" "}
              <Fill
                k="inspectionBy"
                value={c.inspectionBy}
                hole="<local / PIC/S NRA >"
              />
              .
            </Td>
          </tr>
          <ExtraRows slot={2} />
        </Tbl>
      </Page>

      <Page n={2} total={3} variant="B" bodyTop={192}>
        <Tbl cols={[4371, 4838]}>
          <tr>
            <Td style={T12}>
              Copy of GMP contract between the manufacturer and the Importer,
              including a list of the specific products for supply in the
              Philippines
            </Td>
            <Td style={{ ...justify, ...T12 }}>
              Submitted GMP contract between {doc.manufacturer} and {importer}{" "}
              which is valid until{" "}
              <Fill
                k="contractValidity"
                value={longDate(c.contractValidity)}
                hole="<validity of GMP contract bet manuf &importer>"
              />
              <Blank />
              <span style={{ fontSize: pt(11.5), whiteSpace: "pre-wrap" }}>
                The following products will be made available for supply in the
                Philippines through {importer} as indicated in the submitted
                contract:{" "}
                <Fill
                  k="supplyProducts"
                  value={c.supplyProducts}
                  hole="<products to be made available in the Phils>"
                />
              </span>
            </Td>
          </tr>
          <ExtraRows slot={3} />
          <tr>
            <Td style={T12}>Site Master File or equivalent</Td>
            <Td>
              <Provided
                size={pt(12)}
                items={[
                  { k: "smfNo", text: "Site Master File Doc. No. ", value: c.smfNo, hole: "<no.>" },
                ]}
              />
            </Td>
          </tr>
          <ExtraRows slot={4} />
          <tr>
            <Td style={T12}>
              Validation Master Plan covering media fill (if applicable),
              cleaning, computerized systems, etc. as applicable including Risk
              Assessment used to determine the scope and extent of validation
            </Td>
            <Td>
              <Provided
                size={pt(12)}
                items={[
                  { k: "vmpNo", text: "Validation Master Plan Doc No. ", value: c.vmpNo, hole: "<no.>" },
                  { k: "qrmNo", text: "Quality Risk Management SOP No. ", value: c.qrmNo, hole: "<no.>" },
                ]}
              />
              <Blank />
            </Td>
          </tr>
          <ExtraRows slot={5} />
          <tr>
            <Td style={T12}>
              Rationale for test method validation, procedure for method
              transfer etc.
            </Td>
            <Td>
              <Provided
                size={pt(12)}
                items={[
                  { k: "amvNo", text: "Analytical Method Validation SOP No. ", value: c.amvNo, hole: "< no.>" },
                  { k: "amtNo", text: "Analytical Method Transfer SOP No. ", value: c.amtNo, hole: "<no.>" },
                ]}
              />
            </Td>
          </tr>
          <ExtraRows slot={6} />
          <tr>
            <Td>Procedure for handling deviations and OOS</Td>
            <Td>
              <Provided
                size={pt(11)}
                items={[
                  { k: "devNo", text: "Handling of Deviation SOP No. ", value: c.devNo, hole: "<no.>" },
                  {
                    k: "oosNo",
                    text: "Handling Out of Specifications (OOS) Test Results SOP No. ",
                    value: c.oosNo,
                    hole: "<no.>",
                  },
                ]}
              />
            </Td>
          </tr>
          <ExtraRows slot={7} />
          <tr>
            <Td span={2} fill={BLUE} style={{ height: 18 }} />
          </tr>
          <tr>
            <Td>
              <b>Annex E</b>
              <div>Notarized Affidavit of Undertaking</div>
            </Td>
            <Td style={T12}>
              <Blank />
              Submitted Notarized Affidavit of Undertaking
            </Td>
          </tr>
        </Tbl>

        <Gap h={30} />
        <ApprovedProducts doc={doc} />
        <Gap h={24} />
        <RemarksLine doc={doc} />
        <Gap h={12} />
        <ComplianceNotes doc={doc} />
        <Gap h={24} />
        <Recommendation doc={doc} variant="B" />
      </Page>

      <Page n={3} total={3} variant="B" bodyTop={192}>
        <Signatures doc={doc} />
        <Gap h={38} />
        <ReferenceBlock doc={doc} />
      </Page>
    </>
  );
}

/* Shrinks the 794px-wide sheets to the width of the pane they sit in */
function FitPages({ children }) {
  const box = useRef(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const watch = new ResizeObserver(() => {
      if (el.clientWidth) setZoom(Math.min(1, el.clientWidth / PAGE_W));
    });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  return (
    <div ref={box} style={{ width: "100%" }}>
      <div
        style={{
          zoom,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          padding: "2px 0 14px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* `activeField` is the left-hand field that has the cursor (or null). */
export function FgmpWorksheetPaper({
  doc,
  variant = "A",
  activeField = null,
  annexRows = [],
  onAnnexRowsChange = null,
  editor = null,
  // called with where the cursor is: { field, rowId? }, or null when it leaves.
  // `transient` spots (a click, no cursor) are for the caller to clear.
  onPaperFocus = null,
}) {
  const [editing, setEditing] = useState(null); // { region, at } while a box is open
  const focused = activeField ? FIELD_REGION[activeField] || activeField : null;
  const region = editing ? editing.region : focused;
  const box = useRef(null);

  /* Bring the spot into view when a left-hand field gets the cursor. Not
     when the paper itself is clicked: that spot is already in view, and the
     scroll would close the edit box that just opened. */
  useEffect(() => {
    if (!focused || !box.current) return;
    const spot = box.current.querySelector(`[data-hl="${focused}"]`);
    if (spot) spot.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focused]);

  return (
    <ActiveRegion.Provider value={region}>
      <EditCtx.Provider
        value={
          editor
            ? {
                editor,
                notify: onPaperFocus,
                open: (k, el) => {
                  onPaperFocus?.({ field: k, transient: true });
                  setEditing({ region: k, at: el.getBoundingClientRect() });
                },
              }
            : null
        }
      >
      <style>{PAPER_CSS}</style>
      <AnnexRows.Provider value={{ rows: annexRows, onChange: onAnnexRowsChange }}>
        <div ref={box}>
          <FitPages>
            {variant === "A" ? <WorksheetA doc={doc} /> : <WorksheetB doc={doc} />}
          </FitPages>
        </div>
      </AnnexRows.Provider>
      {editing && editor && FIELD_DEFS[editing.region] && (
        <EditPopover
          at={editing.at}
          fields={FIELD_DEFS[editing.region]}
          editor={editor}
          onClose={() => setEditing(null)}
        />
      )}
      </EditCtx.Provider>
    </ActiveRegion.Provider>
  );
}

/* Gathers the worksheet's data: the application's own fields (reused from
   the issuance documents) plus the values from the not-yet-saved draft. */
export function buildWorksheetDoc(data, formData = {}, draft = {}) {
  const base = buildIssuanceDoc(data, formData);
  return {
    ...base,
    // The form's "Reference Number" line. The reference number is the tracking
    // number; a DTN is only the backup.
    dtn: data?.reference_number || data?.dtn,
    ltoValidity: formData["Validity"],
    gmpEvidence: draft.gmpEvidence || [],
    issuingAuthority: draft.issuingAuthority || "",
    issuingCountry: draft.issuingCountry || "",
    // the form has one box for "authority (country)"
    dra: [draft.issuingAuthority, draft.issuingCountry]
      .filter(Boolean)
      .join(", "),
    foreignCertificateNumber: draft.foreignCertificateNumber || "",
    foreignCertificateValidity: draft.foreignCertificateValidity || "",
    inspectionDate: draft.inspectionDate || "",
    dateIssuedText: draft.dateIssuedText || "",
    approvedDosageFormsNote: draft.approvedDosageFormsNote || "",
    appliedForms: draft.appliedForms || [],
    approvedProducts: draft.approvedProducts || [],
    complianceNotes: draft.complianceNotes || "",
    worksheetRemarks: draft.worksheetRemarks || "",
    annexC: draft.annexC || {},
    // Only what the evaluator ticked; every box starts empty. (An older draft
    // may hold "NONE", which also means empty.)
    recommendation:
      draft.recommendationChoice && draft.recommendationChoice !== "NONE"
        ? draft.recommendationChoice
        : null,
  };
}
