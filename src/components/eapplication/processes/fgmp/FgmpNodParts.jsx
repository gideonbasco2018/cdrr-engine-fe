// src/components/eapplication/processes/fgmp/FgmpNodParts.jsx
//
// The two screens behind "For Compliance" (the Notice of Deficiency):
//   NodForm   - what the evaluator fills in when they pick For Compliance
//   NodsCard  - the list of NODs already issued, with Extend / Received
//
// NODs are saved by the server (e_app_notice_of_deficiency). No email is sent
// yet: the email shown is only a draft preview.

import { useState } from "react";
import {
  MAX_NODS,
  NOD_WORKING_DAYS,
  addWorkingDays,
  buildNodEmail,
  effectiveDueDate,
  formatNodDate,
  newDocumentLine,
  nodStatus,
  ordinal,
  todayISO,
} from "./fgmpNod.js";

const STATUS_LOOK = {
  WAITING: { label: "Waiting", color: "#b45309", bg: "rgba(245,158,11,0.15)" },
  OVERDUE: { label: "Overdue", color: "#dc2626", bg: "rgba(220,38,38,0.13)" },
  COMPLIED: { label: "Complied", color: "#15803d", bg: "rgba(34,197,94,0.15)" },
};

function Card({ title, colors, right, children }) {
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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.6rem",
          padding: "0.5rem 0.85rem",
          fontSize: "0.72rem",
          fontWeight: 700,
          color: colors.textPrimary,
          background: colors.tableBg,
          borderBottom: `1px solid ${colors.cardBorder}`,
        }}
      >
        <span>{title}</span>
        {right}
      </div>
      <div style={{ padding: "0.6rem 0.85rem" }}>{children}</div>
    </div>
  );
}

function MockNotice({ children }) {
  return (
    <div
      style={{
        padding: "0.4rem 0.6rem",
        borderRadius: "6px",
        fontSize: "0.64rem",
        lineHeight: 1.5,
        background: "rgba(245,158,11,0.12)",
        color: "#b45309",
      }}
    >
      {children}
    </div>
  );
}

function EmailDraft({ email, to, colors }) {
  return (
    <div
      style={{
        border: `1px dashed ${colors.cardBorder}`,
        borderRadius: "8px",
        padding: "0.55rem 0.7rem",
        fontSize: "0.68rem",
        lineHeight: 1.55,
        color: colors.textPrimary,
        background: colors.pageBg,
      }}
    >
      <div style={{ color: colors.textTertiary, marginBottom: "0.35rem" }}>
        <div>
          <b>To:</b> {to || "—"}
        </div>
        <div>
          <b>Subject:</b> {email.subject}
        </div>
      </div>
      <div style={{ whiteSpace: "pre-wrap" }}>{email.body}</div>
    </div>
  );
}

/* ───────── the form shown when the action is For Compliance ───────── */

export function NodForm({
  colors,
  labelStyle,
  inputStyle,
  form, // { deficiencies, documentLines }
  onChange,
  nods,
  application, // { manufacturer, country, dtn, email }
}) {
  const issuedDate = todayISO();
  const dueDate = addWorkingDays(issuedDate, NOD_WORKING_DAYS);
  const full = nods.length >= MAX_NODS;
  const set = (patch) => onChange({ ...form, ...patch });
  const setLine = (id, text) =>
    set({
      documentLines: form.documentLines.map((l) =>
        l.id === id ? { ...l, requirementCode: text } : l,
      ),
    });

  const email = buildNodEmail({
    manufacturer: application.manufacturer,
    country: application.country,
    dtn: application.dtn,
    deficiencies: form.deficiencies,
    dueDate,
  });

  if (full) {
    return (
      <div
        style={{
          padding: "0.5rem 0.7rem",
          borderRadius: "6px",
          fontSize: "0.7rem",
          background: "rgba(220,38,38,0.1)",
          color: "#dc2626",
        }}
      >
        Maximum of {MAX_NODS} NODs reached. This application cannot be sent
        back for compliance again.
      </div>
    );
  }

  return (
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
        style={{ fontSize: "0.72rem", fontWeight: 700, color: colors.textPrimary }}
      >
        Notice of Deficiency — {ordinal(nods.length + 1)} NOD
      </div>

      <MockNotice>
        No email is sent yet. The email below is only a draft. The NOD is saved
        when you submit this decision.
      </MockNotice>

      <div>
        <label style={labelStyle}>What is lacking (required)</label>
        <textarea
          value={form.deficiencies}
          onChange={(e) => set({ deficiencies: e.target.value })}
          rows={5}
          placeholder="Continue the sentence: To facilitate the processing of your application, … e.g. kindly submit a revalidated GMP evidence as the submitted GMP evidence is valid only until …"
          style={{ ...inputStyle, resize: "vertical" }}
        />
        <div
          style={{ fontSize: "0.6rem", color: colors.textTertiary, marginTop: "0.2rem" }}
        >
          The email already starts with “To facilitate the processing of your
          application,”. Start your text with “kindly …”. A blank line starts a
          new paragraph.
        </div>
      </div>

      <div>
        <label style={labelStyle}>Documents requested (type each one)</label>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {form.documentLines.map((line) => (
            <div key={line.id} style={{ display: "flex", gap: "0.4rem" }}>
              <input
                style={inputStyle}
                value={line.requirementCode}
                onChange={(e) => setLine(line.id, e.target.value)}
                placeholder="e.g. GMP Certificate"
              />
              <button
                type="button"
                title="Remove this line"
                onClick={() =>
                  set({ documentLines: form.documentLines.filter((l) => l.id !== line.id) })
                }
                style={{
                  border: `1px solid ${colors.cardBorder}`,
                  background: "transparent",
                  color: colors.textTertiary,
                  borderRadius: "7px",
                  padding: "0 0.65rem",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              set({ documentLines: [...form.documentLines, newDocumentLine()] })
            }
            style={{
              alignSelf: "flex-start",
              border: "none",
              background: "transparent",
              color: "#2196F3",
              fontSize: "0.68rem",
              fontWeight: 700,
              cursor: "pointer",
              padding: "0.15rem 0",
            }}
          >
            + Add a document
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1.2rem", fontSize: "0.7rem", color: colors.textPrimary }}>
        <span>
          <span style={{ color: colors.textTertiary }}>Sent: </span>
          {formatNodDate(issuedDate)}
        </span>
        <span>
          <span style={{ color: colors.textTertiary }}>
            Due ({NOD_WORKING_DAYS} working days):{" "}
          </span>
          <b>{formatNodDate(dueDate)}</b>
        </span>
      </div>

      <div>
        <label style={labelStyle}>Email draft to the applicant</label>
        <EmailDraft email={email} to={application.email} colors={colors} />
      </div>
    </div>
  );
}

/* ───────── one NOD in the list ───────── */

function NodRow({ nod, colors, labelStyle, inputStyle, application, canAct, onExtend, onReceive }) {
  const [panel, setPanel] = useState(null); // "extend" | "receive" | "email"
  const [extendDate, setExtendDate] = useState("");
  const [extendReason, setExtendReason] = useState("");
  const [receivedIds, setReceivedIds] = useState([]);
  const [receivedDate, setReceivedDate] = useState(todayISO());
  const [problem, setProblem] = useState(null);
  const [saving, setSaving] = useState(false);

  const status = nodStatus(nod);
  const look = STATUS_LOOK[status];
  const open = nod.status !== "COMPLIED";
  const got = nod.requestedDocuments.filter((d) => d.status === "RECEIVED").length;

  const toggle = (name) => {
    setProblem(null);
    setPanel((p) => (p === name ? null : name));
  };
  // Calls the server; its message (a refused date, a missing reason) is shown
  // as it is, and the panel stays open so nothing typed is lost.
  const attempt = async (call) => {
    setSaving(true);
    setProblem(null);
    try {
      await call();
      setPanel(null);
    } catch (e) {
      setProblem(e.message);
    } finally {
      setSaving(false);
    }
  };

  const link = {
    border: "none",
    background: "transparent",
    color: "#2196F3",
    fontSize: "0.66rem",
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
  };
  const cell = { padding: "0.15rem 0", fontSize: "0.7rem", color: colors.textPrimary };
  const dim = { color: colors.textTertiary };

  return (
    <div
      style={{
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "8px",
        padding: "0.55rem 0.7rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <b style={{ fontSize: "0.74rem", color: colors.textPrimary }}>
          {ordinal(nod.nodNumber)} NOD
        </b>
        <span
          style={{
            fontSize: "0.6rem",
            fontWeight: 700,
            padding: "0.15rem 0.55rem",
            borderRadius: "999px",
            color: look.color,
            background: look.bg,
          }}
        >
          {look.label}
        </span>
      </div>

      <div style={cell}>
        <span style={dim}>Activity: </span>
        {nod.activity || "—"}
      </div>
      <div style={{ ...cell, whiteSpace: "pre-wrap" }}>
        <span style={dim}>What is lacking: </span>
        {nod.deficiencies}
      </div>
      <div style={cell}>
        <span style={dim}>Documents requested: </span>
        {nod.requestedDocuments.length === 0
          ? "none listed"
          : nod.requestedDocuments
              .map((d) => `${d.requirementCode}${d.status === "RECEIVED" ? " ✓" : ""}`)
              .join(", ") + `  (${got} of ${nod.requestedDocuments.length} received)`}
      </div>
      <div style={{ ...cell, display: "flex", flexWrap: "wrap", gap: "0.3rem 1.1rem" }}>
        <span><span style={dim}>Sent: </span>{formatNodDate(nod.issuedDate)}</span>
        <span><span style={dim}>Due: </span>{formatNodDate(nod.dueDate)}</span>
        {nod.extendedDueDate && (
          <span>
            <span style={dim}>Extended to: </span>
            <b>{formatNodDate(nod.extendedDueDate)}</b>
            <span style={dim}> ({nod.extensionReason})</span>
          </span>
        )}
        {nod.documentsReceivedDate && (
          <span>
            <span style={dim}>Received: </span>
            {formatNodDate(nod.documentsReceivedDate)}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap" }}>
        <button style={link} onClick={() => toggle("email")}>
          {panel === "email" ? "Hide email draft" : "View email draft"}
        </button>
        {canAct && open && (
          <>
            <button style={link} onClick={() => toggle("extend")}>Extend due date</button>
            <button style={link} onClick={() => toggle("receive")}>Documents received</button>
          </>
        )}
      </div>

      {panel === "email" && (
        <EmailDraft
          colors={colors}
          to={application.email}
          email={buildNodEmail({
            manufacturer: application.manufacturer,
            country: application.country,
            dtn: application.dtn,
            deficiencies: nod.deficiencies,
            dueDate: nod.dueDate,
          })}
        />
      )}

      {panel === "extend" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          <div>
            <label style={labelStyle}>
              New due date (after {formatNodDate(effectiveDueDate(nod))})
            </label>
            <input
              type="date"
              style={inputStyle}
              value={extendDate}
              onChange={(e) => setExtendDate(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Reason for the extension</label>
            <input
              style={inputStyle}
              value={extendReason}
              onChange={(e) => setExtendReason(e.target.value)}
            />
          </div>
          <button
            style={{ ...link, alignSelf: "flex-start" }}
            disabled={saving}
            onClick={() =>
              attempt(() => onExtend(nod.nodNumber, extendDate, extendReason))
            }
          >
            {saving ? "Saving…" : "Save extension"}
          </button>
        </div>
      )}

      {panel === "receive" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          {nod.requestedDocuments.map((d) => (
            <label
              key={d.id}
              style={{ display: "flex", gap: "0.4rem", fontSize: "0.7rem", color: colors.textPrimary }}
            >
              <input
                type="checkbox"
                disabled={d.status === "RECEIVED"}
                checked={d.status === "RECEIVED" || receivedIds.includes(d.id)}
                onChange={() =>
                  setReceivedIds((ids) =>
                    ids.includes(d.id) ? ids.filter((x) => x !== d.id) : [...ids, d.id],
                  )
                }
              />
              {d.requirementCode}
              {d.status === "RECEIVED" && <span style={dim}> — received</span>}
            </label>
          ))}
          <div>
            <label style={labelStyle}>Date received</label>
            <input
              type="date"
              style={inputStyle}
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
            />
          </div>
          <div style={{ fontSize: "0.6rem", color: colors.textTertiary }}>
            The NOD becomes Complied once every requested document is received.
          </div>
          <button
            style={{ ...link, alignSelf: "flex-start" }}
            disabled={saving}
            onClick={() =>
              attempt(() => onReceive(nod.nodNumber, receivedIds, receivedDate))
            }
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {problem && (
        <div style={{ fontSize: "0.66rem", color: "#dc2626" }}>{problem}</div>
      )}
    </div>
  );
}

/* ───────── the list of NODs already issued ───────── */

export function NodsCard({
  colors,
  labelStyle,
  inputStyle,
  nods,
  onExtend,
  onReceive,
  canAct, // only the evaluator may extend / record documents
  application,
}) {
  if (nods.length === 0) return null;
  return (
    <Card
      title={`Notices of Deficiency (${nods.length} of ${MAX_NODS})`}
      colors={colors}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {[...nods]
          .sort((a, b) => b.nodNumber - a.nodNumber)
          .map((nod) => (
            <NodRow
              key={nod.nodNumber}
              nod={nod}
              colors={colors}
              labelStyle={labelStyle}
              inputStyle={inputStyle}
              application={application}
              canAct={canAct}
              onExtend={onExtend}
              onReceive={onReceive}
            />
          ))}
      </div>
    </Card>
  );
}
