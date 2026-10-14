// src/pages/EApplicationTasksPage.jsx
import { useState, useMemo, useEffect, useCallback } from "react";
import { getColorScheme } from "../components/reports/utils.js";
import { getUser } from "../api/auth";
import { getWorkflowTasks } from "../api/workflow-tasks";
import {
  getAppointmentRecords,
  mapAppointmentRecord,
  claimAppointmentRecords,
  getMyAppointmentTasks,
  mapMyTask,
} from "../api/appointmentRecords.js";
import { mapEAppTask } from "../components/eapplication/workflowTaskMapper.js";
import { getProcessModule } from "../components/eapplication/processRegistry.js";
import EmailNotificationsModal from "../components/eapplication/EmailNotificationsModal.jsx";
import GeneratedDocumentsModal from "../components/eapplication/GeneratedDocumentsModal.jsx";

/* ──────────────────────────────────────────────────────────
   Two-level task page:
   - Top level = department the user has access to (by group).
   - Payment Posting ("pool" department, Cashier group):
       Unclaimed Task -> Task -> Processed Task
   - Quality Evaluation ("steps" department, QE group):
       one sub-tab per application_step of the user's open
       e_app_history tasks (del_last_index = 1, del_thread = "Open").
       Hidden when the user has no open task in it.
   ────────────────────────────────────────────────────────── */

/* Group ids from cdrr_engine.groups */
const GROUP_IDS = {
  CASHIER: 41,
  QUALITY_EVALUATION: 3,
};

/* ADAPT: for "steps" departments, list the real application_step values. */
const DEPARTMENTS = [
  {
    key: "payment_posting",
    title: "Payment Posting",
    icon: "💵",
    groupId: GROUP_IDS.CASHIER,
    kind: "pool",
  },
  {
    key: "quality_evaluation",
    title: "Quality Evaluation",
    icon: "🧪",
    groupId: GROUP_IDS.QUALITY_EVALUATION,
    kind: "steps",
    steps: ["QE Review"],
  },
];

const POOL_TABS = [
  { id: "unclaimed", label: "Unclaimed Task", icon: "📥" },
  { id: "claimed", label: "Task", icon: "⏳" },
  { id: "processed", label: "Processed Task", icon: "✅" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 10;
const MAX_NOTE_LENGTH = 1500;

/* TODO: replace with the client's real email from the application record */
const CLIENT_EMAIL = "regulatory@torrentpharma.com.ph";

/* Sample only: chance that a newly sent email fails, so Resend can be tested.
   Use 0 for no failures and 1 for always failing. */
const SAMPLE_FAIL_RATE = 0.4;

const nowStamp = () =>
  new Date().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" });

const DOC_LABELS = {
  OOP: "Order of Payment",
  NOTE: "Application Note",
};

/* TODO: replace with the real email log from the backend.
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
const seedOopLog = (row) => ({
  id: `OOP-${row.referenceNo}`,
  docType: "OOP",
  subject: `${DOC_LABELS.OOP} - ${row.referenceNo}`,
  to: CLIENT_EMAIL,
  attachment: `${DOC_LABELS.OOP} - ${row.referenceNo}.pdf`,
  status: "sent",
  sentAt: "13 July 2026 09:45",
  attempts: 1,
  error: null,
  history: [
    { attempt: 1, status: "sent", at: "13 July 2026 09:45", error: null },
  ],
});

/* ── Helpers ── */
const getUserGroupIds = (user) => {
  // ADAPT: confirm which field holds the group ids (groups, group_ids, ...)
  const raw = user?.groups ?? user?.group_ids ?? [];
  return raw.map((g) => Number(typeof g === "object" ? g.id : g));
};

const getUserName = (user) =>
  user?.name ??
  user?.full_name ??
  [user?.first_name, user?.last_name].filter(Boolean).join(" ");

/* ── Badges ── */
function PriorityBadge({ priority }) {
  const map = {
    High: { bg: "linear-gradient(135deg,#ef4444,#dc2626)", icon: "🔴" },
    Medium: { bg: "linear-gradient(135deg,#f59e0b,#d97706)", icon: "🟠" },
    Low: { bg: "linear-gradient(135deg,#10b981,#059669)", icon: "🟢" },
  };
  const c = map[priority] || {
    bg: "linear-gradient(135deg,#6b7280,#4b5563)",
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
        fontWeight: 700,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
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

function RefNoBadge({ refNo }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.3rem 0.7rem",
        background: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.55rem",
        fontWeight: 700,
        letterSpacing: "0.5px",
        whiteSpace: "nowrap",
      }}
    >
      {refNo}
    </span>
  );
}

function RemarksBadge({ remarks }) {
  if (!remarks) return <span style={{ opacity: 0.5 }}>—</span>;
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
      <span>{remarks}</span>
    </span>
  );
}

/* ── Claim confirmation modal (single or bulk) ── */
function ClaimConfirmModal({ rows, colors, busy, onConfirm, onCancel }) {
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
        <h3
          style={{
            margin: "0 0 0.6rem",
            fontSize: "0.95rem",
            fontWeight: 700,
            color: colors.textPrimary,
          }}
        >
          ✋ {isBulk ? `Claim ${rows.length} tasks?` : "Claim this task?"}
        </h3>
        <p
          style={{
            margin: "0 0 0.6rem",
            fontSize: "0.75rem",
            color: colors.textTertiary,
            lineHeight: 1.5,
          }}
        >
          Once claimed, {isBulk ? "they" : "it"} will move to your{" "}
          <strong>Task</strong> tab and other users will no longer be able to
          pick {isBulk ? "them" : "it"} up.
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
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}
        >
          <button
            onClick={onCancel}
            disabled={busy}
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
            disabled={busy}
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.72rem",
              fontWeight: 700,
              borderRadius: "6px",
              border: "none",
              background: "linear-gradient(135deg,#4CAF50,#43A047)",
              color: "#fff",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy
              ? "Claiming..."
              : isBulk
                ? `✔ Yes, Claim ${rows.length} Tasks`
                : "✔ Yes, Claim Task"}
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
  const canPost = !!noteText.trim();
  const iconBtn = {
    width: "26px",
    height: "26px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    cursor: "pointer",
  };

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
              fontSize: "0.85rem",
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            📝 Application Notes ({noteList.length})
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {!isComposing && (
              <button
                onClick={onStartCompose}
                title="Add note"
                style={{
                  ...iconBtn,
                  borderRadius: "6px",
                  background: "linear-gradient(135deg,#2196F3,#1976D2)",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                }}
              >
                +
              </button>
            )}
            <button
              onClick={onClose}
              title="Close"
              style={{
                ...iconBtn,
                background: "transparent",
                color: colors.textTertiary,
                fontSize: "0.95rem",
              }}
            >
              ×
            </button>
          </div>
        </div>

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
        {isComposing ? (
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
                    ...iconBtn,
                    borderRadius: "50%",
                    background: "rgba(239,68,68,0.12)",
                    color: "#ef4444",
                    fontSize: "0.8rem",
                  }}
                >
                  ⛔
                </button>
                <button
                  onClick={onPost}
                  disabled={!canPost}
                  style={{
                    padding: "0.4rem 0.9rem",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    borderRadius: "6px",
                    border: "none",
                    background: canPost
                      ? "linear-gradient(135deg,#4CAF50,#43A047)"
                      : colors.badgeBg,
                    color: canPost ? "#fff" : colors.textTertiary,
                    cursor: canPost ? "pointer" : "not-allowed",
                  }}
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        ) : (
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

/* ── Page ── */
function EApplicationTasksPage({ darkMode }) {
  const colors = getColorScheme(darkMode);

  const currentUser = useMemo(() => getUser(), []);
  const userGroupIds = useMemo(
    () => getUserGroupIds(currentUser),
    [currentUser],
  );
  const userName = getUserName(currentUser);
  const canSeePayments = userGroupIds.includes(GROUP_IDS.CASHIER);
  const canSeeQE = userGroupIds.includes(GROUP_IDS.QUALITY_EVALUATION);

  // TEMPORARY: debug only, remove after the page works
  console.log("current user", currentUser, "group ids", userGroupIds);

  const [payment, setPayment] = useState({
    unclaimed: [],
    claimed: [],
    processed: [],
  });
  const [workflowTasks, setWorkflowTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [activeDepartment, setActiveDepartment] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 20 });
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [claimRows, setClaimRows] = useState(null);
  const [claiming, setClaiming] = useState(false);

  /* Row actions: documents, email notifications, application notes.
     TODO: these live in local state until the backend endpoints exist. */
  const [docsTargetId, setDocsTargetId] = useState(null);
  const [emailTargetId, setEmailTargetId] = useState(null);
  const [emailLogsById, setEmailLogsById] = useState({}); // { [rowId]: log[] }
  const [applicationNotes, setApplicationNotes] = useState({}); // { [rowId]: note[] }
  const [notesTarget, setNotesTarget] = useState(null);
  const [isComposingNote, setIsComposingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [sendNoteEmail, setSendNoteEmail] = useState(true);

  /* Payment Posting: unclaimed pool + my open tasks + my processed tasks */
  const loadPayments = useCallback(async () => {
    const [pool, open, processed] = await Promise.all([
      getAppointmentRecords({
        status: "Accepted",
        unclaimed_only: true,
        page_size: 100,
      }),
      getMyAppointmentTasks("open"),
      getMyAppointmentTasks("processed"),
    ]);
    const base = { department: "payment_posting" };
    setPayment({
      unclaimed: pool.items
        .map(mapAppointmentRecord)
        .map((r) => ({ ...r, ...base, status: "unclaimed" })),
      claimed: open
        .map((t) => mapMyTask(t, "claimed"))
        .map((r) => ({ ...r, ...base, status: "claimed" })),
      processed: processed
        .map((t) => mapMyTask(t, "processed"))
        .map((r) => ({ ...r, ...base, status: "processed" })),
    });
  }, []);

  /* Quality Evaluation: open tasks of the user from e_app_history */
  const loadWorkflow = useCallback(async () => {
    if (!currentUser?.id) return;
    const res = await getWorkflowTasks({
      page: 1,
      page_size: 10000,
      user_id: currentUser.id, // ADAPT: use user_uuid if the API expects it
      only_latest_per_thread: false,
      del_last_index: 1,
      del_thread: "Open",
    });
    const raw = res.data || [];
    const mapped = raw.map(mapEAppTask);

    // TEMPORARY: remove after confirming the raw column names and step names
    console.log("raw workflow row", raw[0]);
    console.log("application steps found", [
      ...new Set(mapped.map((m) => m.applicationStep)),
    ]);

    setWorkflowTasks(mapped);
  }, [currentUser]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      await Promise.all([
        canSeePayments ? loadPayments() : Promise.resolve(),
        canSeeQE ? loadWorkflow() : Promise.resolve(),
      ]);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [canSeePayments, canSeeQE, loadPayments, loadWorkflow]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* Tabs (with rows) of every department the user can see */
  const departmentTabs = useMemo(() => {
    const out = {};
    DEPARTMENTS.forEach((d) => {
      if (!userGroupIds.includes(d.groupId)) return;
      if (d.kind === "pool") {
        out[d.key] = POOL_TABS.map((t) => ({ ...t, rows: payment[t.id] }));
      } else {
        const rows = workflowTasks
          .filter((t) => d.steps.includes(t.applicationStep))
          .map((t) => ({ ...t, department: d.key }));
        const steps = [...new Set(rows.map((r) => r.applicationStep))];
        out[d.key] = steps.map((step) => ({
          id: step,
          label: step,
          icon: "🧪",
          rows: rows.filter((r) => r.applicationStep === step),
        }));
      }
    });
    return out;
  }, [userGroupIds, payment, workflowTasks]);

  /* Pool departments are always visible to their group.
     Step departments need at least one open task. */
  const visibleDepartments = useMemo(
    () =>
      DEPARTMENTS.filter((d) => {
        const tabs = departmentTabs[d.key];
        if (!tabs) return false;
        return d.kind === "pool" || tabs.some((t) => t.rows.length > 0);
      }),
    [departmentTabs],
  );

  const allRows = useMemo(
    () =>
      Object.values(departmentTabs).flatMap((tabsOfDept) =>
        tabsOfDept.flatMap((t) => t.rows),
      ),
    [departmentTabs],
  );

  /* Derived selection: falls back to the first available option */
  const currentDepartment =
    visibleDepartments.find((d) => d.key === activeDepartment) ||
    visibleDepartments[0] ||
    null;
  const tabs = currentDepartment ? departmentTabs[currentDepartment.key] : [];
  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0] || null;
  const baseData = currentTab?.rows || [];
  const isUnclaimedTab = currentTab?.id === "unclaimed";
  const showRemarks = currentDepartment?.kind === "pool" && !isUnclaimedTab;

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return baseData;
    return baseData.filter((row) =>
      [row.referenceNo, row.activity, row.applicantCompany, row.priority]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term)),
    );
  }, [baseData, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice(
    (safePage - 1) * rowsPerPage,
    safePage * rowsPerPage,
  );

  /* ── Handlers ── */
  const resetView = () => {
    setSearchTerm("");
    setCurrentPage(1);
    setOpenMenuId(null);
    setSelectedIds([]);
  };

  const handleDepartmentChange = (key) => {
    setActiveDepartment(key);
    setActiveTab(null);
    resetView();
  };

  const handleTabChange = (id) => {
    setActiveTab(id);
    resetView();
  };

  const toggleSelectRow = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleSelectAllOnPage = () => {
    const pageIds = paginatedData.map((r) => r.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : [...new Set([...prev, ...pageIds])],
    );
  };

  const requestBulkClaim = () => {
    const rows = payment.unclaimed.filter((r) => selectedIds.includes(r.id));
    if (rows.length) setClaimRows(rows);
  };

  const confirmClaim = async () => {
    if (claiming || !claimRows?.length) return;
    setClaiming(true);
    try {
      const results = await claimAppointmentRecords(
        claimRows.map((r) => r.referenceNo),
      );
      const failed = results.filter((r) => r.result !== "claimed");
      setSelectedIds([]);
      await loadPayments();
      if (failed.length > 0) {
        // ADAPT: use your toast component if you have one
        window.alert(
          failed
            .map((f) => `${f.reference_no}: ${f.detail || f.result}`)
            .join("\n"),
        );
      }
    } catch (err) {
      window.alert(err.message);
    } finally {
      setClaiming(false);
      setClaimRows(null);
    }
  };

  const handleMenuToggle = (e, rowId) => {
    e.stopPropagation();
    if (openMenuId === rowId) {
      setOpenMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownHeight = 190;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow < dropdownHeight
        ? rect.bottom - dropdownHeight
        : rect.bottom + 4;
    setMenuPosition({ top, right: window.innerWidth - rect.right });
    setOpenMenuId(rowId);
  };

  const getEmailLogs = (row) => emailLogsById[row.id] || [seedOopLog(row)];

  const updateEmailLog = (rowId, logId, patch) => {
    const row = allRows.find((r) => r.id === rowId);
    if (!row) return;
    setEmailLogsById((prev) => ({
      ...prev,
      [rowId]: (prev[rowId] || [seedOopLog(row)]).map((l) =>
        l.id === logId
          ? { ...l, ...(typeof patch === "function" ? patch(l) : patch) }
          : l,
      ),
    }));
  };

  /* TODO: replace with a real API call, e.g. await resendEmail(logId) then refetch */
  const handleResendEmail = (rowId, logId) => {
    updateEmailLog(rowId, logId, { status: "sending", error: null });
    setTimeout(() => {
      // Sample only: a resend can also fail, so the history shows both outcomes
      const failed = Math.random() < SAMPLE_FAIL_RATE;
      const at = nowStamp();
      const error = failed
        ? "SMTP 421: Service not available, try again later."
        : null;
      updateEmailLog(rowId, logId, (l) => {
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

  /* TODO: replace with a real API call, e.g.
     await postApplicationNote(row.id, { text, sendEmail }) then refetch.
     The backend should also send the email and return its log entry. */
  const postNote = () => {
    if (!notesTarget || !noteText.trim()) return;
    const text = noteText.trim();
    const target = notesTarget;
    setApplicationNotes((prev) => ({
      ...prev,
      [target.id]: [
        ...(prev[target.id] || []),
        {
          id: Date.now(),
          author: userName,
          text,
          timestamp: "Just now",
          emailSent: sendNoteEmail,
        },
      ],
    }));
    // A note sent by email also shows up in Email Notifications
    if (sendNoteEmail) {
      setEmailLogsById((prev) => ({
        ...prev,
        [target.id]: [
          ...(prev[target.id] || [seedOopLog(target)]),
          makeNoteEmailLog(target.referenceNo, text),
        ],
      }));
    }
    setNoteText("");
    setIsComposingNote(false);
  };

  const getActionMenuOptions = (row) => {
    const viewDetails = {
      label: "View Details",
      icon: "👁️",
      handler: () => setDetailsTarget(row),
    };
    const notes = {
      label: "Application Notes",
      icon: "📝",
      handler: () => openNotes(row),
    };
    // Documents and emails only apply to the payment flow
    if (row.department === "payment_posting") {
      return [
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
        viewDetails,
        notes,
      ];
    }
    return [viewDetails, notes];
  };

  /* ── Early returns (after all hooks) ── */
  const centered = (color, text, extra) => (
    <div
      style={{
        padding: "2rem",
        textAlign: "center",
        color,
        fontSize: "0.8rem",
      }}
    >
      {text}
      {extra}
    </div>
  );

  if (loading) return centered(colors.textTertiary, "Loading tasks...");

  if (loadError) {
    return centered(
      "#dc2626",
      `Could not load tasks: ${loadError}`,
      <div style={{ marginTop: "0.75rem" }}>
        <button onClick={loadAll} style={{ cursor: "pointer" }}>
          Retry
        </button>
      </div>,
    );
  }

  if (!currentDepartment) {
    return centered(
      colors.textTertiary,
      userGroupIds.length === 0 || (!canSeePayments && !canSeeQE)
        ? "🔒 You don't have access to any task queues."
        : "You have no open tasks in the queues you have access to.",
    );
  }

  /* ── Styles ── */
  const thStyle = {
    padding: "0.45rem 0.6rem",
    textAlign: "left",
    fontSize: "0.55rem",
    fontWeight: 600,
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

  const columnCount = 8 + (isUnclaimedTab ? 1 : 0) + (showRemarks ? 1 : 0);

  const emptyText = searchTerm
    ? "No matching applications found."
    : isUnclaimedTab
      ? "No applications waiting to be claimed."
      : currentTab?.id === "claimed"
        ? "You haven't claimed any tasks yet."
        : currentTab?.id === "processed"
          ? "No processed tasks yet."
          : "No tasks in this step.";

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
      {/* ── Department tabs ── */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          padding: "0.45rem 1.5rem",
          flexShrink: 0,
        }}
      >
        {visibleDepartments.map((dept) => {
          const deptTabs = departmentTabs[dept.key];
          const isPool = dept.kind === "pool";
          const count = isPool
            ? deptTabs.find((t) => t.id === "unclaimed").rows.length
            : deptTabs.reduce((sum, t) => sum + t.rows.length, 0);
          const isActive = currentDepartment.key === dept.key;
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
                  {count}
                </span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    color: colors.textTertiary,
                    fontWeight: 500,
                  }}
                >
                  {isPool ? "waiting" : "in progress"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Sub-tabs ── */}
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
          {tabs.map((tab) => {
            const isActive = currentTab?.id === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  padding: "6px 14px",
                  fontSize: "12px",
                  background: "transparent",
                  border: "none",
                  borderBottom: isActive
                    ? "2px solid #4CAF50"
                    : "2px solid transparent",
                  color: isActive ? colors.textPrimary : colors.textTertiary,
                  fontWeight: isActive ? 600 : 400,
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
                    background: isActive ? "#4CAF50" : colors.badgeBg,
                    color: isActive ? "#fff" : colors.textTertiary,
                    border: `0.5px solid ${isActive ? "#4CAF50" : colors.cardBorder}`,
                    fontWeight: 600,
                    minWidth: "20px",
                    textAlign: "center",
                  }}
                >
                  {tab.rows.length}
                </span>
              </button>
            );
          })}
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
                {currentTab?.label}
              </h3>
              <span
                style={{
                  padding: "0.2rem 0.6rem",
                  background: colors.badgeBg,
                  borderRadius: "12px",
                  fontSize: "0.68rem",
                  color: colors.textTertiary,
                  fontWeight: 600,
                }}
              >
                {filteredData.length} total
              </span>
              <button
                onClick={loadAll}
                title="Refresh"
                style={{
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.68rem",
                  borderRadius: "6px",
                  border: `1px solid ${colors.cardBorder}`,
                  background: "transparent",
                  color: colors.textPrimary,
                  cursor: "pointer",
                }}
              >
                🔄 Refresh
              </button>
              {isUnclaimedTab && selectedIds.length > 0 && (
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
                    cursor: "pointer",
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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
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
                  boxSizing: "border-box",
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
                  {isUnclaimedTab && (
                    <th
                      style={{ ...thStyle, textAlign: "center", width: "36px" }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          paginatedData.length > 0 &&
                          paginatedData.every((r) => selectedIds.includes(r.id))
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
                  {showRemarks && <th style={thStyle}>Remarks</th>}
                  <th
                    style={{ ...thStyle, textAlign: "center", width: "120px" }}
                  >
                    {isUnclaimedTab ? "Claim" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columnCount}
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: colors.textTertiary,
                        fontSize: "0.75rem",
                      }}
                    >
                      {emptyText}
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
                      {isUnclaimedTab && (
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
                      <td style={tdStyle}>
                        <RefNoBadge refNo={row.referenceNo} />
                      </td>
                      <td style={tdStyle}>{row.activity}</td>
                      <td style={tdStyle}>{row.applicantCompany}</td>
                      <td style={tdStyle}>{row.dueDate || "—"}</td>
                      <td style={tdStyle}>{row.lastModified}</td>
                      <td style={tdStyle}>
                        {row.priority ? (
                          <PriorityBadge priority={row.priority} />
                        ) : (
                          "—"
                        )}
                      </td>
                      {showRemarks && (
                        <td style={{ ...tdStyle, whiteSpace: "normal" }}>
                          <RemarksBadge remarks={row.remarks} />
                        </td>
                      )}
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        {isUnclaimedTab ? (
                          <button
                            onClick={() => setClaimRows([row])}
                            style={{
                              padding: "0.35rem 0.85rem",
                              background:
                                "linear-gradient(135deg,#4CAF50,#43A047)",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            ✋ Claim Task
                          </button>
                        ) : (
                          <>
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
                                  {getActionMenuOptions(row).map((item) => (
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
                                        color: colors.textPrimary,
                                        fontSize: "0.78rem",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                      }}
                                    >
                                      <span>{item.icon}</span>
                                      <span>{item.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </>
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
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
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
        busy={claiming}
        onConfirm={confirmClaim}
        onCancel={() => !claiming && setClaimRows(null)}
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

      {emailTargetId &&
        (() => {
          const target = allRows.find((r) => r.id === emailTargetId);
          if (!target) return null;
          return (
            <EmailNotificationsModal
              row={target}
              logs={getEmailLogs(target)}
              colors={colors}
              onResend={(logId) => handleResendEmail(target.id, logId)}
              onClose={() => setEmailTargetId(null)}
            />
          );
        })()}

      {docsTargetId &&
        (() => {
          const target = allRows.find((r) => r.id === docsTargetId);
          if (!target) return null;
          return (
            <GeneratedDocumentsModal
              key={target.id}
              row={target}
              colors={colors}
              cashierName={userName}
              cashierPosition="Cashier"
              onClose={() => setDocsTargetId(null)}
            />
          );
        })()}

      {/* Details modal, resolved per process through the registry */}
      {detailsTarget &&
        (() => {
          const { DetailsModal } = getProcessModule(detailsTarget.processCode);
          return (
            <DetailsModal
              key={detailsTarget.id}
              row={detailsTarget}
              colors={colors}
              cashierName={userName}
              cashierPosition="Cashier"
              onPosted={loadAll}
              onClose={() => setDetailsTarget(null)}
            />
          );
        })()}
    </div>
  );
}

export default EApplicationTasksPage;
