// src/pages/EApplicationPage.jsx
import { useState, useMemo, useEffect, useCallback } from "react";
import { getColorScheme } from "../components/reports/utils.js";
import { getProcessModule } from "../components/eapplication/processRegistry.js";
import EmailNotificationsModal from "../components/eapplication/EmailNotificationsModal.jsx";
import GeneratedDocumentsModal from "../components/eapplication/GeneratedDocumentsModal.jsx";

import {
  getAppointmentRecords,
  mapAppointmentRecord,
  claimAppointmentRecords,
  getMyAppointmentTasks,
  mapMyTask,
} from "../api/appointmentRecords.js";

/* ──────────────────────────────────────────────────────────
   Two-level task page:
   - Top tabs   = departments/queues the user has access to
                  (Payment Posting, Quality Evaluation, etc.)
                  A user can belong to more than one.
   - Sub-tabs   = lifecycle of a task within that department:
                  Unclaimed Task → Task → Processed Task
   ────────────────────────────────────────────────────────── */

/* TODO: replace with real logged-in user (from auth context) */
const CURRENT_USER = "Gideon Basco";

/* TODO: replace with departments the logged-in user actually
   has access to (from auth/role config), in display order. */
const DEPARTMENTS = [
  { key: "payment_posting", title: "Payment Posting", icon: "💵" },
  { key: "quality_evaluation", title: "Quality Evaluation", icon: "🧪" },
];

/* Quality Evaluation has no "Unclaimed" pool — tasks route straight
   to the decker, so this department only shows Task / Processed. */
const SUBTABS_BY_DEPARTMENT = {
  payment_posting: ["unclaimed", "claimed", "processed"],
  quality_evaluation: ["claimed", "processed"],
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 10;
const MAX_NOTE_LENGTH = 1500;

/* ── Static mock data — replace with an API call later.
   Each row carries `department` and `status`:
   status: "unclaimed" | "claimed" | "processed" ── */
const MOCK_APPLICATIONS = [
  {
    id: 6,
    department: "quality_evaluation",
    processCode: "FGMP",
    referenceNo: "EA-2026-00160",
    activity: "FDA GMP Certification",
    applicantCompany: "Fresenius Kabi Philippines, Inc.",
    applicationStep: "QE Review",
    dueDate: "2026-09-10",
    lastModified: "2026-08-25 10:00 AM",
    priority: "Medium",
    // Quality Evaluation has no Unclaimed pool — tasks route straight
    // to the assigned reviewer, so this starts as already "claimed".
    status: "claimed",
    claimedBy: CURRENT_USER,
  },
  {
    id: 7,
    department: "quality_evaluation",
    processCode: "FGMP",
    referenceNo: "EA-2026-00161",
    activity: "FDA GMP Certification",
    applicantCompany: "Getz Pharma Inc",
    applicationStep: "QE Review",
    dueDate: "2026-09-11",
    lastModified: "2026-08-25 02:30 PM",
    priority: "High",
    status: "claimed",
    claimedBy: CURRENT_USER,
  },
];

const formatPeso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/* TODO: replace with the client's real email from the application record */
const CLIENT_EMAIL = "regulatory@torrentpharma.com.ph";

/* Sample only: chance that a newly sent email fails, so Resend can be tested.
   Use 0 for no failures and 1 for always failing. */
const SAMPLE_FAIL_RATE = 0.4;

const nowStamp = () =>
  new Date().toLocaleString("en-PH", {
    dateStyle: "long",
    timeStyle: "short",
  });

const DOC_LABELS = {
  OOP: "Order of Payment",
  AOOP: "Additional Order of Payment",
  AR: "Acknowledgement Receipt",
  NOTE: "Application Note",
};

/* TODO: replace with the real email log from the backend (Gmail / mail service) */
const makeEmailLog = (docType, refNo) => {
  const failed = Math.random() < SAMPLE_FAIL_RATE;
  const at = nowStamp();
  const error = failed
    ? "SMTP 550: Mailbox unavailable or server timeout."
    : null;
  return {
    id: `${docType}-${refNo}-${Date.now()}`,
    docType,
    subject: `${DOC_LABELS[docType]} - ${refNo}`,
    to: CLIENT_EMAIL,
    attachment: `${DOC_LABELS[docType]} - ${refNo}.pdf`,
    status: failed ? "failed" : "sent",
    sentAt: at,
    attempts: 1,
    error,
    // One entry per attempt, oldest first
    history: [{ attempt: 1, status: failed ? "failed" : "sent", at, error }],
  };
};

/* TODO: replace with the real email log from the backend (Gmail / mail service).
   An Application Note has no PDF attachment; the note text is the email body. */
const makeNoteEmailLog = (refNo, noteText) => {
  const failed = Math.random() < SAMPLE_FAIL_RATE;
  const at = nowStamp();
  const error = failed
    ? "SMTP 550: Mailbox unavailable or server timeout."
    : null;
  return {
    id: `NOTE-${refNo}-${Date.now()}`,
    docType: "NOTE",
    subject: `${DOC_LABELS.NOTE} - ${refNo}`,
    to: CLIENT_EMAIL,
    attachment: null,
    body: noteText,
    status: failed ? "failed" : "sent",
    sentAt: at,
    attempts: 1,
    error,
    history: [{ attempt: 1, status: failed ? "failed" : "sent", at, error }],
  };
};

/* The original Order of Payment is emailed when it is generated (before this
   screen), so every application starts with one "sent" log for it. */
const seedOopLog = (app) => ({
  id: `OOP-${app.referenceNo}`,
  docType: "OOP",
  subject: `${DOC_LABELS.OOP} - ${app.referenceNo}`,
  to: CLIENT_EMAIL,
  attachment: `${DOC_LABELS.OOP} - ${app.referenceNo}.pdf`,
  status: "sent",
  sentAt: "13 July 2026 09:45",
  attempts: 1,
  error: null,
  history: [
    { attempt: 1, status: "sent", at: "13 July 2026 09:45", error: null },
  ],
});

/* ── Badges ── */
function renderRemarks(row) {
  if (!row.remarks) {
    return <span style={{ opacity: 0.5 }}>—</span>;
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "flex-start",
        gap: "0.35rem",
        padding: "0.3rem 0.6rem",
        background: "rgba(245,158,11,0.12)",
        border: "1px solid rgba(245,158,11,0.35)",
        color: "#d97706",
        borderRadius: "6px",
        fontSize: "0.6rem",
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: "normal",
        maxWidth: "280px",
      }}
    >
      <span>⚠️</span>
      <span>{row.remarks}</span>
    </span>
  );
}
function renderPriorityBadge(priority) {
  const map = {
    High: {
      bg: "linear-gradient(135deg,#ef4444,#dc2626)",
      sh: "rgba(239,68,68,0.3)",
      icon: "🔴",
    },
    Medium: {
      bg: "linear-gradient(135deg,#f59e0b,#d97706)",
      sh: "rgba(245,158,11,0.3)",
      icon: "🟠",
    },
    Low: {
      bg: "linear-gradient(135deg,#10b981,#059669)",
      sh: "rgba(16,185,129,0.3)",
      icon: "🟢",
    },
  };
  const c = map[priority] || {
    bg: "linear-gradient(135deg,#6b7280,#4b5563)",
    sh: "rgba(107,114,128,0.3)",
    icon: "•",
  };
  return (
    <span
      style={{
        padding: "0.3rem 0.7rem",
        background: c.bg,
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.55rem",
        fontWeight: "700",
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        boxShadow: `0 2px 8px ${c.sh}`,
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        whiteSpace: "nowrap",
      }}
    >
      <span>{c.icon}</span>
      {priority}
    </span>
  );
}

function renderStepBadge(step) {
  return (
    <span
      style={{
        padding: "0.25rem 0.6rem",
        background: "linear-gradient(135deg,#2196F3,#1976D2)",
        color: "#fff",
        borderRadius: "6px",
        fontSize: "0.55rem",
        fontWeight: "600",
        display: "inline-flex",
        alignItems: "center",
        whiteSpace: "nowrap",
        boxShadow: "0 2px 6px rgba(33,150,243,0.3)",
      }}
    >
      {step}
    </span>
  );
}

function renderRefNo(
  refNo,
  noteCount = 0,
  isHovered = false,
  onEnter,
  onLeave,
) {
  return (
    <span
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ position: "relative", display: "inline-block" }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0.3rem 0.7rem",
          background: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
          color: "#fff",
          borderRadius: "8px",
          fontSize: "0.55rem",
          fontWeight: "700",
          letterSpacing: "0.5px",
          boxShadow: "0 2px 8px rgba(8,8,8,0.3)",
          whiteSpace: "nowrap",
          cursor: "default",
        }}
      >
        {refNo}
      </span>

      {isHovered && (
        <span
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 20,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.35rem 0.6rem",
            background: "#1f2937",
            color: "#fff",
            borderRadius: "6px",
            fontSize: "0.62rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <span>📝</span>
          <span>
            {noteCount} Application {noteCount === 1 ? "Note" : "Notes"}
          </span>
        </span>
      )}
    </span>
  );
}
/* ── Claim confirmation modal (single or bulk) ── */
function ClaimConfirmModal({ rows, colors, onConfirm, onCancel }) {
  if (!rows || rows.length === 0) return null;
  const isBulk = rows.length > 1;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          padding: "1.25rem",
          width: "380px",
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
          <span style={{ fontSize: "1.3rem" }}>✋</span>
          <h3
            style={{
              margin: 0,
              fontSize: "0.95rem",
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            {isBulk ? `Claim ${rows.length} tasks?` : "Claim this task?"}
          </h3>
        </div>

        {isBulk ? (
          <>
            <p
              style={{
                margin: "0 0 0.5rem",
                fontSize: "0.75rem",
                color: colors.textTertiary,
                lineHeight: 1.5,
              }}
            >
              You're about to claim{" "}
              <strong style={{ color: colors.textPrimary }}>
                {rows.length} applications
              </strong>
              . Once claimed, they will move to your <strong>Task</strong> tab
              and other users will no longer be able to pick them up.
            </p>
            <div
              style={{
                maxHeight: "140px",
                overflowY: "auto",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: "8px",
                padding: "0.5rem 0.65rem",
                marginBottom: "0.9rem",
              }}
            >
              {rows.map((r) => (
                <div
                  key={r.id}
                  style={{
                    fontSize: "0.68rem",
                    color: colors.textPrimary,
                    padding: "0.2rem 0",
                  }}
                >
                  <strong>{r.referenceNo}</strong> — {r.applicantCompany}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p
            style={{
              margin: "0 0 0.9rem",
              fontSize: "0.75rem",
              color: colors.textTertiary,
              lineHeight: 1.5,
            }}
          >
            You're about to claim{" "}
            <strong style={{ color: colors.textPrimary }}>
              {rows[0].referenceNo}
            </strong>{" "}
            ({rows[0].applicantCompany}). Once claimed, it will move to your{" "}
            <strong>Task</strong> tab and other users will no longer be able to
            pick it up.
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
            {isBulk ? `✔ Yes, Claim ${rows.length} Tasks` : "✔ Yes, Claim Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Application Notes modal ── */
function ApplicationNotesModal({
  row,
  notes,
  colors,
  isComposing,
  noteText,
  sendEmail,
  onStartCompose,
  onCancelCompose,
  onChangeNoteText,
  onToggleSendEmail,
  onPost,
  onClose,
}) {
  if (!row) return null;
  const noteList = notes || [];
  const remaining = MAX_NOTE_LENGTH - noteText.length;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          width: "460px",
          maxWidth: "92vw",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.85rem",
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            <span>📝</span>
            <span>Application Notes ({noteList.length})</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {!isComposing && (
              <button
                onClick={onStartCompose}
                title="Add note"
                style={{
                  width: "26px",
                  height: "26px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  borderRadius: "6px",
                  background: "linear-gradient(135deg,#2196F3,#1976D2)",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(33,150,243,0.3)",
                }}
              >
                +
              </button>
            )}
            <button
              onClick={onClose}
              title="Close"
              style={{
                width: "26px",
                height: "26px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                background: "transparent",
                color: colors.textTertiary,
                fontSize: "0.95rem",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Ref no context */}
        <div
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.68rem",
            color: colors.textTertiary,
            borderBottom: `1px solid ${colors.tableBorder}`,
            flexShrink: 0,
          }}
        >
          {row.referenceNo} — {row.applicantCompany}
        </div>

        {/* Notes list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.85rem 1rem",
            background: colors.tableBg,
            minHeight: "160px",
          }}
        >
          {noteList.length === 0 ? (
            <div
              style={{
                height: "100%",
                minHeight: "150px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.72rem",
                color: colors.textTertiary,
              }}
            >
              No notes yet.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              {noteList.map((note) => (
                <div
                  key={note.id}
                  style={{
                    background: colors.cardBg,
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: "8px",
                    padding: "0.55rem 0.7rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: colors.textPrimary,
                      }}
                    >
                      {note.author}
                    </span>
                    <span
                      style={{ fontSize: "0.6rem", color: colors.textTertiary }}
                    >
                      {note.timestamp}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: colors.textPrimary,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {note.text}
                  </div>
                  {note.emailSent && (
                    <div
                      style={{
                        marginTop: "0.35rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        fontSize: "0.58rem",
                        fontWeight: 600,
                        color: "#059669",
                      }}
                    >
                      ✉️ Email sent to participants
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compose area */}
        {isComposing && (
          <div
            style={{
              borderTop: `1px solid ${colors.cardBorder}`,
              padding: "0.75rem 1rem",
              flexShrink: 0,
            }}
          >
            <textarea
              autoFocus
              value={noteText}
              onChange={(e) =>
                onChangeNoteText(e.target.value.slice(0, MAX_NOTE_LENGTH))
              }
              placeholder="Write a note..."
              rows={4}
              style={{
                width: "100%",
                resize: "vertical",
                padding: "0.6rem 0.7rem",
                fontSize: "0.75rem",
                fontFamily: "inherit",
                borderRadius: "8px",
                border: `1px solid ${colors.cardBorder}`,
                background: colors.pageBg,
                color: colors.textPrimary,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "0.55rem",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.68rem",
                  color: colors.textPrimary,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => onToggleSendEmail(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                Send email (Application Participants)
              </label>

              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <span
                  style={{ fontSize: "0.62rem", color: colors.textTertiary }}
                >
                  {remaining}
                </span>
                <button
                  onClick={onCancelCompose}
                  title="Cancel"
                  style={{
                    width: "26px",
                    height: "26px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(239,68,68,0.12)",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  ⛔
                </button>
                <button
                  onClick={onPost}
                  disabled={!noteText.trim()}
                  style={{
                    padding: "0.4rem 0.9rem",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    borderRadius: "6px",
                    border: "none",
                    background: noteText.trim()
                      ? "linear-gradient(135deg,#4CAF50,#43A047)"
                      : colors.badgeBg,
                    color: noteText.trim() ? "#fff" : colors.textTertiary,
                    cursor: noteText.trim() ? "pointer" : "not-allowed",
                    boxShadow: noteText.trim()
                      ? "0 2px 8px rgba(76,175,80,0.35)"
                      : "none",
                  }}
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status bar */}
        {!isComposing && (
          <div
            style={{
              padding: "0.4rem 1rem",
              borderTop: `1px solid ${colors.cardBorder}`,
              fontSize: "0.62rem",
              color: colors.textTertiary,
              flexShrink: 0,
            }}
          >
            Ready
          </div>
        )}
      </div>
    </div>
  );
}

function EApplicationPage({ darkMode }) {
  const colors = getColorScheme(darkMode);
  const [docsTargetId, setDocsTargetId] = useState(null);
  const [emailTargetId, setEmailTargetId] = useState(null); // store the id only, so the modal always shows live data
  const [activeDepartment, setActiveDepartment] = useState(DEPARTMENTS[0].key);
  const [activeSubTab, setActiveSubTab] = useState("unclaimed"); // unclaimed | claimed | processed
  const [applications, setApplications] = useState(MOCK_APPLICATIONS);
  const [loadingUnclaimed, setLoadingUnclaimed] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 20 });
  const [claimRows, setClaimRows] = useState(null); // array of rows being claimed, or null
  const [selectedIds, setSelectedIds] = useState([]); // ids checked for bulk claim

  /* Application Notes modal state */
  const [notesTarget, setNotesTarget] = useState(null); // row whose notes are open
  /* View Details modal state */
  const [detailsTarget, setDetailsTarget] = useState(null); // row whose details are open

  const [applicationNotes, setApplicationNotes] = useState({}); // { [rowId]: Note[] }
  const [isComposingNote, setIsComposingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [sendNoteEmail, setSendNoteEmail] = useState(true);
  const [hoveredNoteRowId, setHoveredNoteRowId] = useState(null); // row id whose ref-no badge is hovered

  const loadUnclaimed = useCallback(async () => {
    setLoadingUnclaimed(true);
    setLoadError(null);
    try {
      const data = await getAppointmentRecords({
        status: "Accepted",
        unclaimed_only: true,
        page_size: 100,
      });
      const incoming = data.items.map(mapAppointmentRecord);
      setApplications((prev) => {
        // drop stale unclaimed rows from the external DB, keep everything else
        const keep = prev.filter(
          (a) => !(a.source === "appointment" && a.status === "unclaimed"),
        );
        const keptIds = new Set(keep.map((a) => a.id));
        return [...keep, ...incoming.filter((r) => !keptIds.has(r.id))];
      });
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoadingUnclaimed(false);
    }
  }, []);

  const loadMyTasks = useCallback(async () => {
    try {
      const tasks = await getMyAppointmentTasks();
      const incoming = tasks.map((t) => ({
        ...mapMyTask(t),
        claimedBy: CURRENT_USER,
      }));
      setApplications((prev) => {
        const refs = new Set(incoming.map((r) => r.referenceNo));
        const keep = prev.filter(
          (a) => a.source !== "internal" && !refs.has(a.referenceNo),
        );
        return [...keep, ...incoming];
      });
    } catch (err) {
      setLoadError(err.message);
    }
  }, []);

  useEffect(() => {
    loadUnclaimed();
    loadMyTasks();
  }, [loadUnclaimed, loadMyTasks]);

  /* Scope everything to the currently selected department first */
  const departmentData = useMemo(
    () => applications.filter((row) => row.department === activeDepartment),
    [applications, activeDepartment],
  );

  const unclaimedData = departmentData.filter(
    (row) => row.status === "unclaimed",
  );
  const myTasksData = departmentData.filter(
    (row) => row.status === "claimed" && row.claimedBy === CURRENT_USER,
  );
  const processedData = departmentData.filter(
    (row) => row.status === "processed" && row.claimedBy === CURRENT_USER,
  );

  const baseData =
    activeSubTab === "unclaimed"
      ? unclaimedData
      : activeSubTab === "claimed"
        ? myTasksData
        : processedData;

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return baseData;
    return baseData.filter((row) =>
      [row.referenceNo, row.activity, row.applicantCompany, row.priority]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(term)),
    );
  }, [baseData, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice(
    (safePage - 1) * rowsPerPage,
    safePage * rowsPerPage,
  );

  const handleDepartmentChange = (deptKey) => {
    setActiveDepartment(deptKey);
    setActiveSubTab(SUBTABS_BY_DEPARTMENT[deptKey][0]);
    setSearchTerm("");
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const handleSubTabChange = (tabId) => {
    setActiveSubTab(tabId);
    setSearchTerm("");
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
  };

  const requestClaim = (row) => setClaimRows([row]);

  const requestBulkClaim = () => {
    const rows = applications.filter((app) => selectedIds.includes(app.id));
    if (rows.length === 0) return;
    setClaimRows(rows);
  };

  const confirmClaim = async () => {
    if (claiming || !claimRows || claimRows.length === 0) return;
    setClaiming(true);
    try {
      const results = await claimAppointmentRecords(
        claimRows.map((r) => r.referenceNo),
      );
      const claimedRefs = results
        .filter((r) => r.result === "claimed")
        .map((r) => r.reference_no);
      const failed = results.filter((r) => r.result !== "claimed");

      // Remove claimed rows from the unclaimed pool; the Task tab is loaded from the server
      setApplications((prev) =>
        prev.filter(
          (app) =>
            !(
              app.source === "appointment" &&
              claimedRefs.includes(app.referenceNo)
            ),
        ),
      );
      setSelectedIds((prev) =>
        prev.filter(
          (id) =>
            !claimRows.some(
              (r) => r.id === id && claimedRefs.includes(r.referenceNo),
            ),
        ),
      );

      await loadMyTasks();

      if (failed.length > 0) {
        // ADAPT: use your toast component if you have one
        window.alert(
          failed
            .map((f) => `${f.reference_no}: ${f.detail || f.result}`)
            .join("\n"),
        );
        loadUnclaimed(); // refresh so rows claimed by others disappear
      }
    } catch (err) {
      window.alert(err.message);
    } finally {
      setClaiming(false);
      setClaimRows(null);
    }
  };
  const cancelClaim = () => setClaimRows(null);

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAllOnPage = () => {
    const pageIds = paginatedData.map((row) => row.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : [...new Set([...prev, ...pageIds])],
    );
  };

  const handleReturnToPool = (row) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === row.id
          ? { ...app, status: "unclaimed", claimedBy: null }
          : app,
      ),
    );
  };

  /* TODO: replace with a real API call, e.g.
   await postPayments(row.id, { payments, remarks }) then refetch.
   If balance > 0, the backend should also generate the additional Order of Payment
   and email the generated documents to the client. */
  const handlePostPayment = ({
    row,
    payments,
    totalPaid,
    balance,
    remarks,
  }) => {
    const isShort = balance > 0;
    const stamp = nowStamp();
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== row.id) return app;
        const prevPaid = Number(app.totalPaid || 0);
        const newAoopCount = (app.additionalOopCount || 0) + (isShort ? 1 : 0);
        return {
          ...app,
          // Short payment: the task stays in the Task tab.
          // Fully paid: it moves to Processed Task.
          status: isShort ? "claimed" : "processed",
          lastModified: "Just now",
          payments: [...(app.payments || []), ...payments],
          totalPaid: prevPaid + totalPaid,
          balance,
          additionalOopCount: newAoopCount,
          additionalOopRemarks: remarks,
          // One Acknowledgement Receipt per posting
          receipts: [
            ...(app.receipts || []),
            { id: Date.now(), payments, totalPaid, postingStamp: stamp },
          ],
          // One Additional Order of Payment per short posting
          additionalOops: isShort
            ? [
                ...(app.additionalOops || []),
                {
                  id: Date.now() + 1,
                  refNo: `${app.referenceNo}-A${newAoopCount}`,
                  alreadyPaid: prevPaid + totalPaid,
                  balance,
                  remarks,
                  generatedOn: stamp,
                },
              ]
            : app.additionalOops || [],
          // Emails sent to the client for each generated document
          emailLogs: [
            ...(app.emailLogs || [seedOopLog(app)]),
            makeEmailLog("AR", app.referenceNo),
            ...(isShort
              ? [makeEmailLog("AOOP", `${app.referenceNo}-A${newAoopCount}`)]
              : []),
          ],
          remarks: isShort
            ? `Insufficient payment (${formatPeso(balance)} short). For payment verification of additional payment.`
            : "",
        };
      }),
    );
  };

  const updateEmailLog = (appId, logId, patch) =>
    setApplications((prev) =>
      prev.map((app) =>
        app.id !== appId
          ? app
          : {
              ...app,
              emailLogs: (app.emailLogs || [seedOopLog(app)]).map((l) =>
                l.id === logId
                  ? {
                      ...l,
                      ...(typeof patch === "function" ? patch(l) : patch),
                    }
                  : l,
              ),
            },
      ),
    );

  /* TODO: replace with a real API call, e.g. await resendEmail(logId) then refetch */
  const handleResendEmail = (appId, logId) => {
    updateEmailLog(appId, logId, { status: "sending", error: null });
    setTimeout(() => {
      // Sample only: a resend can also fail, so the history shows both outcomes
      const failed = Math.random() < SAMPLE_FAIL_RATE;
      const at = nowStamp();
      const error = failed
        ? "SMTP 421: Service not available, try again later."
        : null;
      updateEmailLog(appId, logId, (l) => {
        const attempt = l.attempts + 1;
        return {
          status: failed ? "failed" : "sent",
          sentAt: at,
          attempts: attempt,
          error,
          history: [
            ...(l.history || []),
            { attempt, status: failed ? "failed" : "sent", at, error },
          ],
        };
      });
    }, 1200);
  };

  const openNotes = (row) => {
    setNotesTarget(row);
    setIsComposingNote(false);
    setNoteText("");
    setSendNoteEmail(true);
  };

  const closeNotes = () => {
    setNotesTarget(null);
    setIsComposingNote(false);
    setNoteText("");
  };

  /* TODO: replace with real API call, e.g.
     await postApplicationNote(row.id, { text, sendEmail }) then refetch.
     The backend should also send the email and return its log entry. */
  const postNote = () => {
    if (!notesTarget || !noteText.trim()) return;
    const trimmedText = noteText.trim();
    const targetId = notesTarget.id;
    const newNote = {
      id: Date.now(),
      author: CURRENT_USER,
      text: trimmedText,
      timestamp: "Just now",
      emailSent: sendNoteEmail,
    };
    setApplicationNotes((prev) => ({
      ...prev,
      [targetId]: [...(prev[targetId] || []), newNote],
    }));

    // If "Send email" was checked, this note also shows up in
    // Email Notifications, with the same resend/history behavior.
    if (sendNoteEmail) {
      setApplications((prev) =>
        prev.map((app) =>
          app.id === targetId
            ? {
                ...app,
                emailLogs: [
                  ...(app.emailLogs || [seedOopLog(app)]),
                  makeNoteEmailLog(app.referenceNo, trimmedText),
                ],
              }
            : app,
        ),
      );
    }

    setNoteText("");
    setIsComposingNote(false);
  };
  const handleMenuToggle = (e, rowId) => {
    e.stopPropagation();
    if (openMenuId === rowId) {
      setOpenMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow < dropdownHeight
        ? rect.bottom - dropdownHeight
        : rect.bottom + 4;
    const right = window.innerWidth - rect.right;
    setMenuPosition({ top, right });
    setOpenMenuId(rowId);
  };

  const getTaskActionMenuOptions = (row) => [
    {
      label: "Generated Documents",
      icon: "📄",
      handler: () => setDocsTargetId(row.id),
    },
    {
      label: "Email Notifications",
      icon: "📧",
      handler: () => setEmailTargetId(row.id),
    },
    {
      label: "View Details",
      icon: "👁️",
      handler: () => setDetailsTarget(row),
    },
    {
      label: "Application Notes",
      icon: "📝",
      handler: () => openNotes(row),
    },
    {
      label: "Return to Pool",
      icon: "↩️",
      handler: () => handleReturnToPool(row),
    },
  ];

  const getProcessedActionMenuOptions = (row) => [
    {
      label: "Generated Documents",
      icon: "📄",
      handler: () => setDocsTargetId(row.id),
    },
    {
      label: "Email Notifications",
      icon: "📧",
      handler: () => setEmailTargetId(row.id),
    },
    {
      label: "View Details",
      icon: "👁️",
      handler: () => setDetailsTarget(row),
    },
    {
      label: "Application Notes",
      icon: "📝",
      handler: () => openNotes(row),
    },
  ];
  const thStyle = {
    padding: "0.45rem 0.6rem",
    textAlign: "left",
    fontSize: "0.55rem",
    fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: `1px solid ${colors.tableBorder}`,
    whiteSpace: "nowrap",
    background: colors.tableBg,
  };

  const tdStyle = {
    padding: "0.55rem 0.6rem",
    fontSize: "0.68rem",
    color: colors.tableText,
    borderBottom: `1px solid ${colors.tableBorder}`,
    whiteSpace: "nowrap",
  };

  const ALL_SUB_TABS = [
    {
      id: "unclaimed",
      label: "Unclaimed Task",
      icon: "📥",
      count: unclaimedData.length,
    },
    { id: "claimed", label: "Task", icon: "⏳", count: myTasksData.length },
    {
      id: "processed",
      label: "Processed Task",
      icon: "✅",
      count: processedData.length,
    },
  ];

  const subTabs = ALL_SUB_TABS.filter((tab) =>
    SUBTABS_BY_DEPARTMENT[activeDepartment].includes(tab.id),
  );
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: colors.pageBg,
      }}
    >
      {/* ── Department tabs (top level) — stat card style ── */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          padding: "0.45rem 1.5rem",
          flexShrink: 0,
        }}
      >
        {DEPARTMENTS.map((dept) => {
          const hasUnclaimedPool =
            SUBTABS_BY_DEPARTMENT[dept.key].includes("unclaimed");
          const deptUnclaimedCount = hasUnclaimedPool
            ? applications.filter(
                (row) =>
                  row.department === dept.key && row.status === "unclaimed",
              ).length
            : applications.filter(
                (row) =>
                  row.department === dept.key &&
                  row.status === "claimed" &&
                  row.claimedBy === CURRENT_USER,
              ).length;
          const isActive = activeDepartment === dept.key;
          return (
            <button
              key={dept.key}
              onClick={() => handleDepartmentChange(dept.key)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "0.15rem",
                padding: "0.4rem 1.1rem",
                minWidth: "180px",
                background: colors.cardBg,
                border: `1px solid ${colors.cardBorder}`,
                borderLeft: isActive
                  ? "4px solid #4CAF50"
                  : `1px solid ${colors.cardBorder}`,
                borderRadius: "10px",
                cursor: "pointer",
                textAlign: "left",
                boxShadow: isActive
                  ? "0 2px 10px rgba(76,175,80,0.15)"
                  : "0 1px 4px rgba(0,0,0,0.04)",
                transition: "all 0.2s ease",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: isActive ? colors.textPrimary : colors.textTertiary,
                }}
              >
                <span>{dept.icon}</span>
                <span>{dept.title}</span>
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.35rem",
                }}
              >
                <span
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: isActive ? colors.textPrimary : colors.textTertiary,
                    lineHeight: 1,
                  }}
                >
                  {deptUnclaimedCount}
                </span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    color: colors.textTertiary,
                    fontWeight: 500,
                  }}
                >
                  {hasUnclaimedPool ? "waiting" : "in queue"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Sub-tabs (task lifecycle within the selected department) ── */}
      <div
        style={{
          padding: "0.5rem 1.5rem 0",
          borderBottom: `1px solid ${colors.cardBorder}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            borderBottom: `2px solid ${colors.cardBorder}`,
          }}
        >
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSubTabChange(tab.id)}
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeSubTab === tab.id
                    ? "2px solid #4CAF50"
                    : "2px solid transparent",
                color:
                  activeSubTab === tab.id
                    ? colors.textPrimary
                    : colors.textTertiary,
                fontWeight: activeSubTab === tab.id ? 600 : 400,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                position: "relative",
                top: "1px",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
            >
              <span style={{ fontSize: "0.82rem" }}>{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "999px",
                  background:
                    activeSubTab === tab.id ? "#4CAF50" : colors.badgeBg,
                  color: activeSubTab === tab.id ? "#fff" : colors.textTertiary,
                  border: `0.5px solid ${activeSubTab === tab.id ? "#4CAF50" : colors.cardBorder}`,
                  fontWeight: 600,
                  minWidth: "20px",
                  textAlign: "center",
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: "hidden", padding: "0.85rem 1.5rem" }}>
        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <div
            style={{
              padding: "0.75rem 1.25rem",
              borderBottom: `1px solid ${colors.tableBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <h3
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: colors.textPrimary,
                  margin: 0,
                }}
              >
                {activeSubTab === "unclaimed"
                  ? "Unclaimed Applications"
                  : activeSubTab === "claimed"
                    ? "My Claimed Tasks"
                    : "Processed Tasks"}
              </h3>

              <span
                style={{
                  padding: "0.2rem 0.6rem",
                  background: colors.badgeBg,
                  borderRadius: "12px",
                  fontSize: "0.68rem",
                  color: colors.textTertiary,
                  fontWeight: "600",
                }}
              >
                {filteredData.length} total
              </span>
              {activeSubTab === "unclaimed" && selectedIds.length > 0 && (
                <button
                  onClick={requestBulkClaim}
                  style={{
                    padding: "0.35rem 0.85rem",
                    background: "linear-gradient(135deg,#4CAF50,#43A047)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    letterSpacing: "0.3px",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(76,175,80,0.35)",
                    whiteSpace: "nowrap",
                  }}
                >
                  ✋ Claim Selected ({selectedIds.length})
                </button>
              )}
            </div>
            <div style={{ position: "relative", minWidth: "240px" }}>
              <span
                style={{
                  position: "absolute",
                  left: "0.6rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "0.75rem",
                  color: colors.textTertiary,
                }}
              >
                🔍
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search reference no., activity, company..."
                style={{
                  width: "100%",
                  padding: "0.4rem 0.6rem 0.4rem 1.8rem",
                  fontSize: "0.72rem",
                  borderRadius: "8px",
                  border: `1px solid ${colors.cardBorder}`,
                  background: colors.pageBg,
                  color: colors.textPrimary,
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  background: colors.tableBg,
                  zIndex: 5,
                }}
              >
                <tr>
                  {activeSubTab === "unclaimed" && (
                    <th
                      style={{ ...thStyle, textAlign: "center", width: "36px" }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          paginatedData.length > 0 &&
                          paginatedData.every((row) =>
                            selectedIds.includes(row.id),
                          )
                        }
                        onChange={toggleSelectAllOnPage}
                        style={{ cursor: "pointer" }}
                      />
                    </th>
                  )}
                  <th
                    style={{ ...thStyle, textAlign: "center", width: "50px" }}
                  >
                    #
                  </th>
                  <th style={thStyle}>Reference Number</th>
                  <th style={thStyle}>Activity</th>
                  <th style={thStyle}>Applicant Company</th>
                  <th style={thStyle}>Due Date</th>
                  <th style={thStyle}>Last Modified</th>
                  <th style={thStyle}>Priority</th>
                  {activeSubTab !== "unclaimed" && (
                    <th style={thStyle}>Remarks</th>
                  )}
                  <th
                    style={{ ...thStyle, textAlign: "center", width: "120px" }}
                  >
                    {activeSubTab === "unclaimed" ? "Claim" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: colors.textTertiary,
                        fontSize: "0.75rem",
                      }}
                    >
                      {loadingUnclaimed
                        ? "Loading applications..."
                        : loadError
                          ? `Could not load applications: ${loadError}`
                          : searchTerm
                            ? "No matching applications found."
                            : activeSubTab === "unclaimed"
                              ? "No applications waiting to be claimed."
                              : activeSubTab === "claimed"
                                ? "You haven't claimed any tasks yet."
                                : "No processed tasks yet."}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, index) => (
                    <tr
                      key={row.id}
                      style={{
                        background:
                          index % 2 === 0
                            ? colors.tableRowEven
                            : colors.tableRowOdd,
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          colors.tableRowHover)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          index % 2 === 0
                            ? colors.tableRowEven
                            : colors.tableRowOdd)
                      }
                    >
                      {activeSubTab === "unclaimed" && (
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(row.id)}
                            onChange={() => toggleSelectRow(row.id)}
                            style={{ cursor: "pointer" }}
                          />
                        </td>
                      )}
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "center",
                          fontWeight: 700,
                          color: colors.textTertiary,
                        }}
                      >
                        {(safePage - 1) * rowsPerPage + index + 1}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          overflow: "visible",
                          position: "relative",
                        }}
                      >
                        {renderRefNo(
                          row.referenceNo,
                          (applicationNotes[row.id] || []).length,
                          hoveredNoteRowId === row.id,
                          () => setHoveredNoteRowId(row.id),
                          () => setHoveredNoteRowId(null),
                        )}
                      </td>
                      <td style={tdStyle}>{row.activity}</td>
                      <td style={tdStyle}>{row.applicantCompany}</td>
                      <td style={tdStyle}>{row.dueDate || "—"}</td>
                      <td style={tdStyle}>{row.lastModified}</td>
                      <td style={tdStyle}>
                        {row.priority ? renderPriorityBadge(row.priority) : "—"}
                      </td>
                      {activeSubTab !== "unclaimed" && (
                        <td style={{ ...tdStyle, whiteSpace: "normal" }}>
                          {renderRemarks(row)}
                        </td>
                      )}
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        {activeSubTab === "unclaimed" ? (
                          <button
                            onClick={() => requestClaim(row)}
                            style={{
                              padding: "0.35rem 0.85rem",
                              background:
                                "linear-gradient(135deg,#4CAF50,#43A047)",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              letterSpacing: "0.3px",
                              cursor: "pointer",
                              boxShadow: "0 2px 6px rgba(76,175,80,0.35)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            ✋ Claim Task
                          </button>
                        ) : (
                          <div
                            style={{
                              position: "relative",
                              display: "inline-block",
                            }}
                          >
                            <button
                              onClick={(e) => handleMenuToggle(e, row.id)}
                              style={{
                                padding: "0.4rem",
                                background: "transparent",
                                border: `1px solid ${colors.cardBorder}`,
                                borderRadius: "6px",
                                color: colors.textPrimary,
                                cursor: "pointer",
                                width: "28px",
                                height: "28px",
                              }}
                            >
                              ⋮
                            </button>
                            {openMenuId === row.id && (
                              <>
                                <div
                                  onClick={() => setOpenMenuId(null)}
                                  style={{
                                    position: "fixed",
                                    inset: 0,
                                    zIndex: 9998,
                                  }}
                                />
                                <div
                                  style={{
                                    position: "fixed",
                                    top: `${menuPosition.top}px`,
                                    right: `${menuPosition.right}px`,
                                    background: colors.cardBg,
                                    border: `1px solid ${colors.cardBorder}`,
                                    borderRadius: "8px",
                                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                                    minWidth: "190px",
                                    zIndex: 9999,
                                    overflow: "hidden",
                                  }}
                                >
                                  {(activeSubTab === "claimed"
                                    ? getTaskActionMenuOptions(row)
                                    : getProcessedActionMenuOptions(row)
                                  ).map((item, i) => (
                                    <button
                                      key={item.label}
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        item.handler();
                                      }}
                                      style={{
                                        width: "100%",
                                        padding: "0.6rem 0.85rem",
                                        background: "transparent",
                                        border: "none",
                                        borderTop:
                                          i === 0
                                            ? "none"
                                            : `1px solid ${colors.tableBorder}`,
                                        color: colors.textPrimary,
                                        fontSize: "0.78rem",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                      }}
                                      onMouseEnter={(e) =>
                                        (e.currentTarget.style.background =
                                          colors.tableRowHover)
                                      }
                                      onMouseLeave={(e) =>
                                        (e.currentTarget.style.background =
                                          "transparent")
                                      }
                                    >
                                      <span>{item.icon}</span>
                                      <span>{item.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredData.length > 0 && (
            <div
              style={{
                padding: "0.6rem 1.25rem",
                borderTop: `1px solid ${colors.tableBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <span
                  style={{ fontSize: "0.68rem", color: colors.textTertiary }}
                >
                  Showing {(safePage - 1) * rowsPerPage + 1}–
                  {Math.min(safePage * rowsPerPage, filteredData.length)} of{" "}
                  {filteredData.length}
                </span>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    fontSize: "0.68rem",
                    color: colors.textTertiary,
                  }}
                >
                  Rows per page
                  <select
                    value={rowsPerPage}
                    onChange={(e) => handlePageSizeChange(e.target.value)}
                    style={{
                      padding: "0.25rem 0.4rem",
                      fontSize: "0.68rem",
                      borderRadius: "6px",
                      border: `1px solid ${colors.cardBorder}`,
                      background: colors.pageBg,
                      color: colors.textPrimary,
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  style={{
                    padding: "0.3rem 0.6rem",
                    fontSize: "0.68rem",
                    borderRadius: "6px",
                    border: `1px solid ${colors.cardBorder}`,
                    background: colors.pageBg,
                    color:
                      safePage === 1 ? colors.textTertiary : colors.textPrimary,
                    cursor: safePage === 1 ? "not-allowed" : "pointer",
                  }}
                >
                  ‹ Prev
                </button>
                <span
                  style={{
                    fontSize: "0.68rem",
                    color: colors.textTertiary,
                    padding: "0 0.4rem",
                  }}
                >
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={safePage === totalPages}
                  style={{
                    padding: "0.3rem 0.6rem",
                    fontSize: "0.68rem",
                    borderRadius: "6px",
                    border: `1px solid ${colors.cardBorder}`,
                    background: colors.pageBg,
                    color:
                      safePage === totalPages
                        ? colors.textTertiary
                        : colors.textPrimary,
                    cursor: safePage === totalPages ? "not-allowed" : "pointer",
                  }}
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ClaimConfirmModal
        rows={claimRows}
        colors={colors}
        onConfirm={confirmClaim}
        onCancel={cancelClaim}
      />

      <ApplicationNotesModal
        row={notesTarget}
        notes={notesTarget ? applicationNotes[notesTarget.id] : []}
        colors={colors}
        isComposing={isComposingNote}
        noteText={noteText}
        sendEmail={sendNoteEmail}
        onStartCompose={() => setIsComposingNote(true)}
        onCancelCompose={() => {
          setIsComposingNote(false);
          setNoteText("");
        }}
        onChangeNoteText={setNoteText}
        onToggleSendEmail={setSendNoteEmail}
        onPost={postNote}
        onClose={closeNotes}
      />

      {detailsTarget &&
        (() => {
          const { DetailsModal } = getProcessModule(detailsTarget.processCode);
          return (
            <DetailsModal
              key={detailsTarget.id}
              row={detailsTarget}
              colors={colors}
              cashierName={CURRENT_USER}
              cashierPosition="Cashier"
              onPost={handlePostPayment}
              onClose={() => setDetailsTarget(null)}
            />
          );
        })()}

      {emailTargetId &&
        (() => {
          const app = applications.find((a) => a.id === emailTargetId);
          if (!app) return null;
          return (
            <EmailNotificationsModal
              row={app}
              logs={app.emailLogs || [seedOopLog(app)]}
              colors={colors}
              onResend={(logId) => handleResendEmail(app.id, logId)}
              onClose={() => setEmailTargetId(null)}
            />
          );
        })()}

      {docsTargetId &&
        (() => {
          const app = applications.find((a) => a.id === docsTargetId);
          if (!app) return null;
          return (
            <GeneratedDocumentsModal
              key={app.id}
              row={app}
              colors={colors}
              cashierName={CURRENT_USER}
              cashierPosition="Cashier"
              onClose={() => setDocsTargetId(null)}
            />
          );
        })()}
    </div>
  );
}

export default EApplicationPage;
