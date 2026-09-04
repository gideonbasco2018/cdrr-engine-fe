// src/pages/GMPTasksPage.jsx
// GMP Tasks — personal task queue for evaluators, checkers, etc.
// Mirrors the production TaskPage.jsx pattern exactly.
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { getMyGMPTasks, markTaskReceived, toggleTaskStar } from "../api/gmp";
import { getColorScheme } from "../components/gmp/shared/colorScheme";
import { GMP_STEPS, FONT } from "../components/gmp/shared/constants";
import TasksTable, { GMP_COLUMNS as GMP_TASKS_COLUMNS } from "../components/gmp/tasks/TasksTable";
import { computeStatusTimeline } from "../components/gmp/shared/StatusTimelineBadge";
import AppLogModal from "../components/gmp/tasks/AppLogModal";
import FieldAuditModal from "../components/gmp/tasks/FieldAuditModal";
import WorkflowModal from "../components/gmp/tasks/WorkflowModal";
import GMPBulkEndorseModal, { GMP_BULK_ENDORSE_CONFIG } from "../components/gmp/tasks/GMPBulkEndorseModal";
import DoctrackModal from "../components/reports/actions/DoctrackModal";
import GMPDocumentsModal from "../components/gmp/queue/GMPDocumentsModal";
import { QuickFilterSidebar } from "../components/gmp/queue/QueueFilters";
import {
  generateGMPTransmittalPDF,
  generateGMPTransmittalExcel,
  generateGMPTransmittal,
} from "../components/tasks/DataTable/TransmittalGenerator";

const ACCENT = "#10b981";

// All task-table column keys, and the ones added recently enough that existing
// users' saved column prefs won't include them — those get force-shown once
// (see the visibleColumns initializer). Move a key out of NEW once it's been
// shipped long enough that everyone has seen it.
const GMP_TASKS_COL_KEYS = GMP_TASKS_COLUMNS.map((c) => c.key);
const GMP_TASKS_NEW_COL_KEYS = ["status_timeline"];

const QUICK_LABEL_MAP = {
  category: "Category", transaction_type: "Transaction Type",
  status: "Application Status", type_of_issuance: "Issuance Type",
};
const QUICK_DEFAULTS = { category: "all", transaction_type: "all", status: "all", type_of_issuance: "all" };

// GMP_APP_STATUS can be stale/blank while a record is actively moving
// through the workflow (see app/crud/gmp_record.py) — every row on this
// page is by definition an open, non-terminal task, so raw r.status is
// unreliable here. Mirrors getEffectiveStatus() in QueueTable.jsx so the
// "Application Status" filter behaves the same as on the GMP Queue page.
const GMP_TERMINAL_STATUSES = new Set([
  "COMPLETED", "RELEASED", "DISAPPROVED", "CANCELLED APPLICATION", "CANCELLED",
]);
function getEffectiveStatus(r) {
  const raw = (r.status || "").trim().toUpperCase();
  if (raw && GMP_TERMINAL_STATUSES.has(raw)) return r.status;
  if (r.currentStep) return "IN PROGRESS";
  return r.status;
}

// Free-text search — matches the fields the FGMP Queue's backend `search` param
// covers (DTN, LTO company, LTO number, certificate no., SECPA no., category),
// plus Reference No which is more useful on a task queue. Case-insensitive
// substring; blank query matches everything.
const GMP_TASK_SEARCH_FIELDS = [
  "dtn", "name_of_establishment", "lto_number", "reference_no",
  "certificate_number", "secpa_number", "category", "foreign_manufacturer",
];
function taskMatchesSearch(r, q) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return GMP_TASK_SEARCH_FIELDS.some((k) =>
    String(r[k] ?? "").toLowerCase().includes(needle)
  );
}

// Map GMPApplicationLogs + embedded GMPRecord → flat task object
function mapGMPTask(t) {
  const r = t.gmp_record ?? {};
  return {
    id:                  t.id,
    gmp_record_id:       t.gmp_record_id,
    applicationStep:     t.application_step,
    applicationStatus:   t.application_status,
    applicationDecision: t.application_decision,
    applicationRemarks:  t.application_remarks,
    startDate:           t.start_date,
    accomplishedDate:    t.accomplished_date,
    delIndex:            t.del_index,
    delThread:           t.del_thread,
    is_received:         t.is_received ?? 0,
    is_starred:          t.is_starred  ?? 0,
    starred_at:          t.starred_at  ?? null,
    is_read:             t.is_read     ?? 0,
    createdAt:   t.created_at,
    updatedAt:   t.updated_at,
    lastModified:t.updated_at,

    // ── Sent By — who decked/advanced/forwarded this task to the current assignee ──
    sentByFullName: t.sent_by_full_name ?? null,
    sentByUsername: t.sent_by_user_name ?? null,
    sentByAlias:    t.sent_by_alias ?? null,

    // ── Compliance tracking (Evaluator "For Compliance" self-loop only) ──
    deadlineDate: t.deadline_date ?? null,
    workingDays:  t.working_days ?? null,

    // ── Full GMP record fields (same shape as GMP Queue's mapGMPRecord) ──
    dtn:                          r.GMP_DTN ? String(r.GMP_DTN) : null,
    reference_no:                 r.GMP_REFERENCE_NO ?? null,
    related_dtn:                  r.GMP_RELATED_DTN,
    date_received:                r.GMP_DATE_RECEIVED,
    name_of_establishment:        r.GMP_LTO_COMPANY,
    lto_number:                   r.GMP_LTO_NUMBER,
    address:                      r.GMP_LTO_ADDRESS,
    transaction_type:             r.GMP_TRANSACTION_TYPE,
    category:                     r.GMP_EST_CATEGORY,
    foreign_manufacturer:         r.GMP_FOREIGN_MANUFACTURER,
    foreign_manufacturer_address: r.GMP_FOREIGN_MANUFACTURER_ADDRESS,
    secpa_number:                 r.GMP_SECPA_NUMBER,
    certificate_number:           r.GMP_CERTIFICATE_NUMBER,
    type_of_issuance:             r.GMP_TYPE_OF_ISSUANCE,
    // Every Type of Issuance across this DTN's sibling records (from Add
    // Issuance), not just this task's own primary record — see
    // all_issuance_types in get_tasks_for_user (app/crud/gmp_logs.py).
    all_issuance_types:           t.all_issuance_types?.length ? t.all_issuance_types : (r.GMP_TYPE_OF_ISSUANCE ? [r.GMP_TYPE_OF_ISSUANCE] : []),
    certificate_validity:         r.GMP_CERTIFICATE_VALIDITY,
    decision:                     r.GMP_DECISION,
    status:                       r.GMP_APP_STATUS,
    released_date:                r.GMP_RELEASED_DATE,
    processed_time:               r.GMP_PROCESSED_TIME,
    end_date:                     r.GMP_END_DATE,
    timeline:                     r.GMP_TIMELINE,
    remarks:                      r.GMP_REMARKS,
    nod_date_1:                   r.GMP_NOD_DATE_1,
    nod_date_2:                   r.GMP_NOD_DATE_2,
    nod_date_3:                   r.GMP_NOD_DATE_3,
    nod_date_4:                   r.GMP_NOD_DATE_4,
    nod_date_5:                   r.GMP_NOD_DATE_5,
    date_printed:                 r.GMP_DATE_PRINTED,
    compliance_docs_date_received:r.GMP_COMPLIANCE_DOCS_DATE_RECEIVED,
    product_line:                 r.GMP_PRODUCT_LINE,

    // Legacy aliases (kept so existing code referencing these still works)
    ltoCompany:  r.GMP_LTO_COMPANY  ?? null,
    estCategory: r.GMP_EST_CATEGORY ?? null,
    dateReceived:r.GMP_DATE_RECEIVED ?? null,
    currentStep: r.GMP_CURRENT_STEP  ?? null,
    productLine: r.GMP_PRODUCT_LINE  ?? null,
    appStatus:   r.GMP_APP_STATUS    ?? null,

    // for modals that need the full record shape
    id_for_logs: t.gmp_record_id,
  };
}



// A task is a "Compliance" task when it's an Evaluator-step log carrying a
// compliance deadline (set via the "For Compliance" action in
// WorkflowModal — see GMPApplicationLogs.deadline_date). It's still the same
// evaluator queue and the same underlying step, just split into its own tab
// so overdue / due-soon compliance items don't get buried in the regular
// Evaluator list.
function isComplianceTask(t) {
  return t.applicationStep === "Evaluator" && !!t.deadlineDate;
}
const GMP_COMPLIANCE_TAB = "Compliance";
function getTabKey(t) {
  return isComplianceTask(t) ? GMP_COMPLIANCE_TAB : t.applicationStep;
}

function isWeekendDate(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}
// Same working-day definition as WorkflowModal's compliance widget, kept in
// sync here so the "Xd left / overdue" figure shown in the queue matches
// what was actually set at submission time.
function workingDaysUntil(deadlineStr) {
  if (!deadlineStr) return null;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(deadlineStr); end.setHours(0, 0, 0, 0);
  const forward = end > start;
  let count = 0;
  const d = new Date(forward ? start : end);
  const stop = forward ? end : start;
  while (d < stop) { d.setDate(d.getDate() + 1); if (!isWeekendDate(d)) count += 1; }
  return forward ? count : -count;
}

// Same choice modal as GMPQueuePage.jsx's GMPTransmittalModal — PDF/Excel/
// both, for whichever tasks are checked in TasksTable.
function GMPTransmittalModal({ open, count, generating, onGenerate, onClose, colors, darkMode }) {
  if (!open) return null;

  return createPortal(
    <div
      onClick={() => !generating && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 10001,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 14,
          padding: "2rem",
          width: 380,
          maxWidth: "90%",
          boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
        }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.75rem", textAlign: "center" }}>📄</div>
        <h3 style={{
          margin: "0 0 0.5rem", color: colors.textPrimary,
          fontSize: "1.05rem", fontWeight: 700, textAlign: "center",
        }}>
          Generate Transmittal
        </h3>
        <p style={{ margin: "0 0 1.5rem", color: colors.textTertiary, fontSize: "0.85rem", textAlign: "center" }}>
          Choose format for{" "}
          <strong style={{ color: ACCENT }}>{count}</strong>{" "}
          selected task{count > 1 ? "s" : ""}.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {[
            { fmt: "pdf",   label: "📕 PDF only",         bg: "linear-gradient(135deg,#dc2626,#b91c1c)" },
            { fmt: "excel", label: "📗 Excel only",        bg: "linear-gradient(135deg,#16a34a,#15803d)" },
            { fmt: "both",  label: "📄 Both PDF & Excel",  bg: "linear-gradient(135deg,#1976d2,#1565c0)" },
          ].map((b) => (
            <button
              key={b.fmt}
              onClick={() => onGenerate(b.fmt)}
              disabled={generating}
              style={{
                padding: "0.65rem 1rem", borderRadius: 8, border: "none",
                background: b.bg, color: "#fff", fontSize: "0.85rem", fontWeight: 700,
                cursor: generating ? "not-allowed" : "pointer",
                opacity: generating ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              }}>
              {b.label}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          disabled={generating}
          style={{
            marginTop: "1rem", width: "100%", padding: "0.5rem", borderRadius: 8,
            border: `1px solid ${colors.cardBorder}`, background: "transparent",
            color: colors.textTertiary, fontSize: "0.8rem", cursor: generating ? "not-allowed" : "pointer",
          }}>
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}

export default function GMPTasksPage({ darkMode = false }) {
  const colors = getColorScheme(darkMode);

  const [data,           setData]           = useState([]);
  const [allStepsData,   setAllStepsData]   = useState([]);
  const [activeTab,      setActiveTab]      = useState(null);
  const [selectedRows,   setSelectedRows]   = useState([]);
  // Starts true so the first paint is skeleton rows (matches GMPQueuePage),
  // not a blank card, while the user is resolved + the fetch runs.
  const [loading,        setLoading]        = useState(true);
  const [currentUser,    setCurrentUser]    = useState(null);
  const [currentPage,    setCurrentPage]    = useState(1);
  const [rowsPerPage,    setRowsPerPage]    = useState(10);
  // Client-side only — every task for the active tab is already fully
  // loaded in `data` (see fetchAllSteps: page_size 10000, no server
  // pagination here), so sorting is just a JS array sort, no backend call.
  // null = no explicit sort applied (whatever order the backend returned).
  const [sortBy,         setSortBy]         = useState(null);
  const [sortOrder,      setSortOrder]      = useState("asc");
  const [readIds,        setReadIds]        = useState(new Set());
  // Free-text search box (mirrors the FGMP Queue). `searchInput` is the live
  // field value; `search` is the debounced value the filter actually reads.
  // Everything here is client-side — every task for the tab is already loaded
  // (fetchAllSteps: page_size 10000) — so this is a plain string match, no
  // backend call.
  const [searchInput,    setSearchInput]    = useState("");
  const [search,         setSearch]         = useState("");
  // `nearDeadline` / `beyond` = the timeline-risk toggles (light-yellow /
  // light-red rows). When both are on, show near OR beyond.
  const [filters,        setFilters]        = useState({ starredOnly: false, sentBy: "", nearDeadline: false, beyond: false });
  const [activeQuick,    setActiveQuick]    = useState(QUICK_DEFAULTS);
  // Persisted across sessions — a refresh or navigating back should leave
  // the Quick Filters sidebar exactly as the user last left it.
  const [collapsed,      setCollapsed]      = useState(
    () => localStorage.getItem("gmp_tasks_quick_filters_collapsed") === "true"
  );
  useEffect(() => {
    localStorage.setItem("gmp_tasks_quick_filters_collapsed", String(collapsed));
  }, [collapsed]);

  // Debounce the search box (mirrors GMPQueuePage) — 300 ms after the last
  // keystroke, commit it to `search` and jump back to page 1.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setCurrentPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Which table columns the user wants to see — persisted across sessions
  // so a refresh doesn't reset a deliberately trimmed-down view. Starts
  // with every column checked.
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const stored = localStorage.getItem("gmpTasksVisibleColumns");
      if (!stored) return GMP_TASKS_COL_KEYS;
      const visible = JSON.parse(stored);
      // Reveal columns added to the app since this user's prefs were saved.
      // `gmpTasksKnownColumns` records which keys the user has already had in
      // the toggle list; on the first run of this mechanism, seed it with every
      // key EXCEPT the newly-added ones so only those get force-shown, once.
      const known = JSON.parse(localStorage.getItem("gmpTasksKnownColumns") || "null")
        ?? GMP_TASKS_COL_KEYS.filter((k) => !GMP_TASKS_NEW_COL_KEYS.includes(k));
      const newlyAdded = GMP_TASKS_COL_KEYS.filter((k) => !known.includes(k));
      return [...new Set([...visible, ...newlyAdded])];
    } catch { return GMP_TASKS_COL_KEYS; }
  });
  useEffect(() => {
    localStorage.setItem("gmpTasksVisibleColumns", JSON.stringify(visibleColumns));
    localStorage.setItem("gmpTasksKnownColumns", JSON.stringify(GMP_TASKS_COL_KEYS));
  }, [visibleColumns]);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const toggleColumn = (key) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const [showTransmittalChoice, setShowTransmittalChoice] = useState(false);
  const [generatingTransmittal, setGeneratingTransmittal] = useState(false);
  const [showBulkEndorse, setShowBulkEndorse] = useState(false);

  // Modals
  const [logRecord,      setLogRecord]      = useState(null);
  const [auditRecord,    setAuditRecord]    = useState(null);
  const [workflowTask,   setWorkflowTask]   = useState(null);
  const [doctrackRecord, setDoctrackRecord] = useState(null);
  const [docsRecord,     setDocsRecord]     = useState(null);

  // Resolve current user from localStorage (same pattern as TaskPage.jsx)
  useEffect(() => {
    let username = null;
    const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userStr) {
      try { const o = JSON.parse(userStr); username = o.username || o.email; } catch { username = userStr; }
    }
    if (!username) username = localStorage.getItem("username") || sessionStorage.getItem("username");
    setCurrentUser(username || null);
  }, []);

  // Fetch all steps (no step filter) — used to build tab counts.
  // NOTE: activeTab is intentionally NOT in the dependency array.
  // Including it would cause this to re-run on every tab click, wiping state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchAllSteps = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await getMyGMPTasks({ page: 1, page_size: 10000 });
      const mapped = (res.data || []).map(mapGMPTask);
      setAllStepsData(mapped);

      // Only auto-select first tab on the very first load (when activeTab is null)
      let nextActiveTab = activeTab;
      setActiveTab((prev) => {
        const firstTab = !prev && mapped.length ? getTabKey(mapped[0]) : prev;
        nextActiveTab = firstTab ?? prev;
        return nextActiveTab;
      });

      // "Compliance" is a virtual tab (Evaluator logs carrying a
      // deadline_date) with no backend equivalent, so the active tab's rows
      // are derived client-side from the full fetch above rather than
      // requested with an application_step filter.
      const tabToLoad = nextActiveTab ?? (mapped.length ? getTabKey(mapped[0]) : null);
      if (tabToLoad) {
        const tabData = mapped.filter((t) => getTabKey(t) === tabToLoad);
        setData(tabData);
        setReadIds(new Set(tabData.filter((t) => t.is_read === 1).map((t) => t.id)));
      }
    } catch (e) {
      console.error(e); setAllStepsData([]); setData([]);
    } finally {
      // No artificial delay — clearing loading in the same batch as the data
      // updates above means the search / count rows appear together with the
      // table, instead of the table showing 300 ms early without them.
      setLoading(false);
    }
  }, [currentUser]); // activeTab deliberately excluded — see note above

  // Fetch tasks for active step — derived from allStepsData (already a full
  // "my tasks" fetch) rather than re-querying per tab, so the virtual
  // "Compliance" tab behaves identically to every real backend step.
  const fetchTasks = useCallback(() => {
    if (!currentUser || !activeTab) return;
    const tabData = allStepsData.filter((t) => getTabKey(t) === activeTab);
    setData(tabData);
    setReadIds(new Set(tabData.filter((t) => t.is_read === 1).map((t) => t.id)));
  }, [currentUser, activeTab, allStepsData]);

  useEffect(() => { fetchAllSteps(); }, [fetchAllSteps]);

  const isInitialLoad = useRef(true);
  useEffect(() => {
    if (isInitialLoad.current) { isInitialLoad.current = false; return; }
    if (activeTab) fetchTasks();
  }, [fetchTasks]);

  // Derived step tabs + counts
  const steps = useMemo(() => {
    const seen = [];
    allStepsData.forEach((d) => {
      const key = getTabKey(d);
      if (!seen.includes(key)) seen.push(key);
    });
    // Keep "Compliance" directly after "Evaluator" so it reads as a
    // sub-queue of the evaluator's work rather than an unrelated tab.
    if (seen.includes(GMP_COMPLIANCE_TAB) && seen.includes("Evaluator")) {
      const withoutCompliance = seen.filter((s) => s !== GMP_COMPLIANCE_TAB);
      const evalIdx = withoutCompliance.indexOf("Evaluator");
      withoutCompliance.splice(evalIdx + 1, 0, GMP_COMPLIANCE_TAB);
      return withoutCompliance;
    }
    return seen;
  }, [allStepsData]);
  const stepCounts = useMemo(() =>
    steps.reduce((acc, s) => { acc[s] = allStepsData.filter((d) => getTabKey(d) === s).length; return acc; }, {}),
    [steps, allStepsData]);
  const hasOverdueCompliance = useMemo(
    () => allStepsData.some((t) => isComplianceTask(t) && workingDaysUntil(t.deadlineDate) < 0),
    [allStepsData]
  );

  // Whether row `r` matches the active quick filters, optionally ignoring
  // one group's own key — used so a group's sidebar counts reflect "if I
  // picked this, given every OTHER active filter" rather than either the
  // fully-filtered set (which collapses every non-selected option to 0) or
  // the fully-unfiltered set (which never reflects other active filters).
  // type_of_issuance matches if the selected type is ANYWHERE in the DTN's
  // sibling issuance list (all_issuance_types) — not just this task's own
  // primary record's single type — so picking an issuance type surfaces
  // every application that carries it under any sibling, regardless of
  // what its other siblings' issuance types are.
  const matchesQuick = (r, quick, exceptKey) => {
    const mcat = exceptKey === "category" || quick.category === "all" || r.category === quick.category;
    const mtt  = exceptKey === "transaction_type" || quick.transaction_type === "all" || r.transaction_type === quick.transaction_type;
    const mst  = exceptKey === "status" || quick.status === "all" || getEffectiveStatus(r) === quick.status;
    const mtoi = exceptKey === "type_of_issuance" || quick.type_of_issuance === "all" || (r.all_issuance_types || []).includes(quick.type_of_issuance);
    return mcat && mtt && mst && mtoi;
  };

  // Same "Starred Only" / "Sent By" predicate filteredData applies below —
  // shared so the sidebar's counts always match what the table actually
  // shows instead of just the quick filters (a count that ignored these two
  // would stay showing the full tab's numbers even while the table itself
  // was narrowed down by them).
  const matchesTableFilters = (r) => {
    const mstar = !filters.starredOnly || r.is_starred === 1;
    const msb = !filters.sentBy || (r.sentByUsername ?? r.sentByFullName ?? "").toLowerCase().includes(filters.sentBy.toLowerCase());
    const msearch = taskMatchesSearch(r, search);
    let mrisk = true;
    if (filters.nearDeadline || filters.beyond) {
      const st = computeStatusTimeline(r);
      mrisk = !!st && !st.released && (
        (filters.nearDeadline && st.level === "near") ||
        (filters.beyond && st.level === "beyond")
      );
    }
    return mstar && msb && msearch && mrisk;
  };

  // Quick Filter sidebar groups — built client-side from tasks already loaded
  // (same shape QuickFilterSidebar expects: {label, key, items:[{value,label,count,color}]})
  const sidebarFilters = useMemo(() => {
    // `getValues` returns an array so a multi-value field (all_issuance_types)
    // can count towards every value it carries, not just a single r[field].
    const buildGroup = (label, key, getValues, colorMap) => {
      const base = data.filter((r) => matchesTableFilters(r) && matchesQuick(r, activeQuick, key));
      const counts = {};
      base.forEach((r) => {
        for (const v of getValues(r)) {
          if (!v) continue;
          counts[v] = (counts[v] ?? 0) + 1;
        }
      });
      const items = [
        { value: "all", label: "All", count: base.length, color: "#94a3b8" },
        ...Object.entries(counts).map(([value, count]) => ({
          value, label: value, count,
          color: colorMap?.[value.toUpperCase()] ?? "#94a3b8",
        })),
      ];
      return { label, key, items };
    };
    return [
      buildGroup("Application Status", "status", (r) => [getEffectiveStatus(r)], {
        "ON-PROCESS": "#3b82f6", COMPLETED: "#10b981", PENDING: "#f59e0b",
        "FOR DECKING": "#06b6d4", DECKED: "#6366f1", DISAPPROVED: "#ef4444",
      }),
      buildGroup("Category", "category", (r) => [r.category]),
      buildGroup("Transaction Type", "transaction_type", (r) => [r.transaction_type]),
      buildGroup("Issuance Type", "type_of_issuance", (r) => r.all_issuance_types || []),
    ];
  }, [data, activeQuick, filters, search]);

  const handleSidebarSelect = (key, value) => {
    setActiveQuick((prev) => ({
      ...prev,
      [key]: prev[key] === value || value === "all" ? "all" : value,
    }));
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    return data.filter((r) => matchesTableFilters(r) && matchesQuick(r, activeQuick));
  }, [data, filters, activeQuick, search]);

  // Generic comparator — numeric-aware (so "10" sorts after "2", and DTNs
  // compare correctly), nulls/blanks always sort last regardless of
  // direction, dates compare fine as ISO-ish strings via localeCompare.
  const compareValues = (a, b) => {
    if (a === b) return 0;
    if (a == null || a === "") return 1;
    if (b == null || b === "") return -1;
    const na = Number(a), nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
  };

  const sortedData = useMemo(() => {
    // "Starred Only" is meant to reflect the order the user worked through
    // and starred each task — not whatever column the table happens to be
    // sorted by. Order by starred_at (earliest-starred first) so the list —
    // and anything generated from it, like a transmittal — matches that
    // work sequence.
    if (filters.starredOnly) {
      return [...filteredData].sort((a, b) => {
        const ta = a.starred_at ? new Date(a.starred_at).getTime() : 0;
        const tb = b.starred_at ? new Date(b.starred_at).getTime() : 0;
        if (ta !== tb) return ta - tb;
        return a.id - b.id;
      });
    }
    if (!sortBy) return filteredData;
    const sorted = [...filteredData].sort((a, b) => compareValues(a[sortBy], b[sortBy]));
    return sortOrder === "asc" ? sorted : sorted.reverse();
  }, [filteredData, sortBy, sortOrder, filters.starredOnly]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };
  const handleResetSort = () => {
    setSortBy(null);
    setSortOrder("asc");
    setCurrentPage(1);
  };

  const indexOfFirst = (currentPage - 1) * rowsPerPage;
  const totalDisplayed = filteredData.length;
  const totalDisplayedPages = Math.ceil(totalDisplayed / rowsPerPage) || 1;
  const paginatedData = sortedData.slice(indexOfFirst, indexOfFirst + rowsPerPage);

  // Surfaces which quick filters are active — without this a stuck filter
  // (e.g. left on from before a tab switch) is invisible; there's no other
  // indicator besides the sidebar highlight, which is easy to miss.
  const activeQuickChips = Object.entries(activeQuick)
    .filter(([, v]) => v && v !== "all")
    .map(([key, val]) => ({ key, label: `${QUICK_LABEL_MAP[key] ?? key}: ${val}` }));

  const handleTabChange = (step) => {
    setActiveTab(step); setSelectedRows([]);
    // Quick filters and search are scoped to the currently visible tab's data —
    // keeping e.g. category="DRUG" or a search term across a tab switch commonly
    // filters the new tab down to nothing, showing a misleading empty state.
    setActiveQuick(QUICK_DEFAULTS);
    setSearchInput(""); setSearch("");
    setCurrentPage(1);
  };

  const handleToggleStar = async (task) => {
    const nextStarred = task.is_starred === 1 ? false : true;
    // Optimistic update so the star flips instantly
    const apply  = (list) => list.map((t) => t.id === task.id ? { ...t, is_starred: nextStarred ? 1 : 0 } : t);
    const revert = (list) => list.map((t) => t.id === task.id ? { ...t, is_starred: task.is_starred } : t);
    setData(apply);
    setAllStepsData(apply);
    try {
      await toggleTaskStar(task.id, nextStarred);
    } catch (e) {
      console.error("Failed to toggle star", e);
      // `apply` always sets is_starred to nextStarred — reapplying it here
      // would just be a no-op, not a revert. `revert` restores the pre-toggle
      // value the click started from.
      setData(revert);
      setAllStepsData(revert);
    }
  };


  const handleSelectAll = (checked, ids) => {
    if (checked) setSelectedRows((p) => [...new Set([...p, ...ids])]);
    else setSelectedRows((p) => p.filter((id) => !ids.includes(id)));
  };

  // Same generator GMPQueuePage.jsx uses — task rows are mapped from the
  // same shape as GMP Queue's records (see mapGMPTask above), so no
  // field-name translation is needed here.
  const handleGenerateTransmittal = async (format = "both") => {
    // Use sortedData (not the raw `data`) so row order/numbering matches
    // whatever arrangement is currently shown in the GMP Task table.
    const selectedData = sortedData.filter((r) => selectedRows.includes(r.id));
    if (!selectedData.length) return;
    setGeneratingTransmittal(true);
    try {
      if (format === "pdf") {
        await generateGMPTransmittalPDF(selectedData, activeTab);
      } else if (format === "excel") {
        await generateGMPTransmittalExcel(selectedData, activeTab);
      } else {
        await generateGMPTransmittal(selectedData, activeTab);
      }
    } catch (err) {
      console.error("GMP transmittal generation failed:", err);
      alert("Failed to generate transmittal. Please try again or reduce the number of selected tasks.");
    } finally {
      setGeneratingTransmittal(false);
      setShowTransmittalChoice(false);
    }
  };

  const divider = { width: 1, height: 22, background: colors.cardBorder, flexShrink: 0 };
  const inputSt = {
    padding: "0.25rem 0.5rem", background: colors.inputBg,
    border: `1px solid ${colors.inputBorder}`, borderRadius: 6,
    color: colors.textPrimary, fontSize: "0.68rem", outline: "none",
    colorScheme: darkMode ? "dark" : "light",
  };
  const labelSt = { fontSize: "0.65rem", color: colors.textTertiary, fontWeight: 600, whiteSpace: "nowrap" };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: FONT,
      background: colors.pageBg, color: colors.textPrimary }}>

      {/* Sidebar — same component as GMP Queue */}
      <QuickFilterSidebar
        filters={sidebarFilters} active={activeQuick}
        onSelect={handleSidebarSelect} collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        colors={colors} darkMode={darkMode} />

      <div style={{
        flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
        padding: "6px 8px 8px", gap: 8, boxSizing: "border-box", minWidth: 0,
      }}>

        {/* Toolbar card — step tabs + search/filter row share one soft,
            rounded surface instead of flush bars butted against the
            viewport edge (mirrors GMPQueuePage.jsx). */}
        <div style={{
          borderRadius: 14, overflow: "hidden", boxShadow: colors.cardShadow,
          flexShrink: 0,
        }}>
        {/* Top bar — matches GMPQueuePage's top bar exactly */}
        <div style={{
          padding: "8px 14px", borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 10, background: colors.cardBg, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            {steps.length === 0 ? (
              <span style={{
                display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
                fontSize: "0.8rem", fontFamily: FONT, fontWeight: 600, color: colors.textPrimary,
              }}>
                📝 FGMP Tasks
                <span style={{ fontSize: "0.72rem", fontWeight: 400, color: colors.textTertiary }}>
                  {loading ? "Loading your tasks…" : "No active step queues"}
                </span>
              </span>
            ) : steps.map((step) => {
              const isActive = activeTab === step;
              const count = stepCounts[step] ?? 0;
              const isCompliance = step === GMP_COMPLIANCE_TAB;
              const stepDef = GMP_STEPS.find((s) => s.id === step);
              const color = isCompliance ? "#a855f7" : (stepDef ? stepDef.color : ACCENT);
              const icon  = isCompliance ? "⏰" : (stepDef?.icon ?? "📝");
              return (
                <button key={step} onClick={() => handleTabChange(step)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 16px", fontSize: "0.8rem", fontFamily: FONT,
                    fontWeight: isActive ? 700 : 500, border: "none", background: "transparent",
                    cursor: "pointer", color: isActive ? colors.textPrimary : colors.textTertiary,
                    borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
                    transition: "all 0.15s",
                  }}>
                  {icon} {step}
                  <span style={{
                    fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px",
                    borderRadius: 99, background: isActive ? color : `${color}15`,
                    color: isActive ? "#fff" : color,
                  }}>
                    {count}
                  </span>
                  {isCompliance && hasOverdueCompliance && (
                    <span title="Overdue compliance item(s)" style={{
                      width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block",
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search / filter row — matches GMPQueuePage's search row. Stays put
            during a re-fetch (just dims), so the toolbar card doesn't lose a
            row mid-refresh. */}
        {steps.length > 0 && data.length > 0 && (
          <div style={{
            padding: "8px 14px",
            background: colors.cardBg, flexShrink: 0,
            display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
            opacity: loading ? 0.5 : 1, transition: "opacity 0.15s ease",
          }}>
            <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
              <span style={{
                position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                color: colors.textTertiary, fontSize: "0.78rem", pointerEvents: "none",
              }}>
                🔍
              </span>
              <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by DTN, company, certificate number…"
                style={{
                  width: "100%", padding: "6px 26px 6px 30px", fontSize: "0.72rem",
                  fontFamily: FONT, borderRadius: 6, border: `1px solid ${colors.cardBorder}`,
                  background: colors.inputBg, color: colors.textPrimary, outline: "none",
                  boxSizing: "border-box",
                }} />
              {searchInput && (
                <button onClick={() => setSearchInput("")}
                  title="Clear search"
                  style={{
                    position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)",
                    background: "transparent", border: "none", color: colors.textTertiary,
                    cursor: "pointer", fontSize: "0.7rem", padding: 0, lineHeight: 1,
                  }}>
                  ✕
                </button>
              )}
            </div>

            <div style={{ position: "relative", minWidth: 170 }}>
              <span style={{
                position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
                color: colors.textTertiary, fontSize: "0.7rem", pointerEvents: "none",
              }}>
                👤
              </span>
              <input value={filters.sentBy} onChange={(e) => setFilters({ ...filters, sentBy: e.target.value })}
                placeholder="Search sender…"
                style={{
                  width: "100%", padding: "5px 10px 5px 26px", fontSize: "0.7rem",
                  fontFamily: FONT, borderRadius: 6, border: `1px solid ${colors.cardBorder}`,
                  background: colors.inputBg, color: colors.textPrimary, outline: "none",
                  boxSizing: "border-box",
                }} />
            </div>

            <button
              onClick={() => setFilters({ ...filters, starredOnly: !filters.starredOnly })}
              style={{
                padding: "5px 10px", fontSize: "0.68rem", fontWeight: 600,
                fontFamily: FONT, borderRadius: 6,
                border: `1px solid ${filters.starredOnly ? "#f59e0b" : colors.cardBorder}`,
                background: filters.starredOnly ? "rgba(245,158,11,0.15)" : "transparent",
                color: filters.starredOnly ? "#f59e0b" : colors.textTertiary,
                cursor: "pointer",
              }}>
              ★ Starred Only
            </button>

            {/* Timeline-risk toggles — mirror the row wash: near = light yellow
                (≥80% of allotted working days elapsed), beyond = light red. */}
            <button
              onClick={() => setFilters({ ...filters, nearDeadline: !filters.nearDeadline })}
              title="Open tasks that have used ≥80% of their allotted timeline"
              style={{
                padding: "5px 10px", fontSize: "0.68rem", fontWeight: 600,
                fontFamily: FONT, borderRadius: 6,
                border: `1px solid ${filters.nearDeadline ? "#ca8a04" : colors.cardBorder}`,
                background: filters.nearDeadline ? "rgba(202,138,4,0.15)" : "transparent",
                color: filters.nearDeadline ? "#ca8a04" : colors.textTertiary,
                cursor: "pointer",
              }}>
              ⚠ Near Deadline
            </button>
            <button
              onClick={() => setFilters({ ...filters, beyond: !filters.beyond })}
              title="Open tasks already past their allotted timeline"
              style={{
                padding: "5px 10px", fontSize: "0.68rem", fontWeight: 600,
                fontFamily: FONT, borderRadius: 6,
                border: `1px solid ${filters.beyond ? "#dc2626" : colors.cardBorder}`,
                background: filters.beyond ? "rgba(220,38,38,0.15)" : "transparent",
                color: filters.beyond ? "#dc2626" : colors.textTertiary,
                cursor: "pointer",
              }}>
              🔴 Beyond
            </button>

            {selectedRows.length > 0 && (
              <>
                <span style={{
                  fontSize: "0.7rem", fontWeight: 700, color: "#2e7d32",
                  background: "rgba(76,175,80,0.12)", border: "1px solid rgba(76,175,80,0.3)",
                  padding: "4px 10px", borderRadius: 99,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  ✔ {selectedRows.length} selected
                  <button onClick={() => setSelectedRows([])}
                    style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.68rem" }}>
                    ✕
                  </button>
                </span>
                <button
                  onClick={() => setShowTransmittalChoice(true)}
                  style={{
                    padding: "6px 14px", fontSize: "0.72rem", fontWeight: 700,
                    fontFamily: FONT, borderRadius: 8, cursor: "pointer",
                    border: "none",
                    background: "linear-gradient(135deg,#1976d2,#1565c0)",
                    color: "#fff", display: "flex", alignItems: "center", gap: 6,
                    boxShadow: "0 2px 8px rgba(25,118,210,0.35)",
                  }}>
                  📄 Generate Transmittal
                </button>
                {GMP_BULK_ENDORSE_CONFIG[activeTab] && (
                  <button
                    onClick={() => setShowBulkEndorse(true)}
                    style={{
                      padding: "6px 14px", fontSize: "0.72rem", fontWeight: 700,
                      fontFamily: FONT, borderRadius: 8, cursor: "pointer", border: "none",
                      background: GMP_BULK_ENDORSE_CONFIG[activeTab].isEndTask
                        ? "linear-gradient(135deg,#10b981,#059669)"
                        : "linear-gradient(135deg,#7c3aed,#6d28d9)",
                      color: "#fff", display: "flex", alignItems: "center", gap: 6,
                      boxShadow: GMP_BULK_ENDORSE_CONFIG[activeTab].isEndTask
                        ? "0 2px 8px rgba(16,185,129,0.35)"
                        : "0 2px 8px rgba(124,58,237,0.35)",
                    }}>
                    {GMP_BULK_ENDORSE_CONFIG[activeTab].isEndTask ? "✅" : "📋"}{" "}
                    {GMP_BULK_ENDORSE_CONFIG[activeTab].buttonLabel}
                  </button>
                )}
              </>
            )}
          </div>
        )}
        </div>
        {/* end toolbar card */}

        {/* Table card — record count/filters row is this card's header,
            directly above the table it describes (mirrors GMPQueuePage.jsx).
            Stays a flex column so the empty-state / table blocks below can
            still flex to fill remaining height. */}
        <div style={{
          flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden",
          background: colors.cardBg, borderRadius: 14, boxShadow: colors.cardShadow,
        }}>

        {/* Record count row — stays put during a re-fetch (just dims). */}
        {data.length > 0 && (
          <div style={{
            padding: "8px 16px", borderBottom: `1px solid ${colors.divider}`,
            background: colors.cardBg, flexShrink: 0,
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
            opacity: loading ? 0.5 : 1, transition: "opacity 0.15s ease",
          }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: colors.textPrimary, flexShrink: 0 }}>
              FGMP Tasks{" "}
              <span style={{ color: colors.textTertiary, fontWeight: 400 }}>
                {totalDisplayed.toLocaleString()} total
              </span>
            </span>
            {activeQuickChips.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: "0.64rem", fontWeight: 700, color: colors.textTertiary,
                  textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0,
                }}>
                  Active filters ({activeQuickChips.length}):
                </span>
                {activeQuickChips.map((c) => (
                  <span key={c.key} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 8px 3px 10px", borderRadius: 99,
                    background: darkMode ? "rgba(16,185,129,0.15)" : "#e8f8f0",
                    border: `1px solid ${ACCENT}30`,
                    fontSize: "0.68rem", fontWeight: 600, color: ACCENT, whiteSpace: "nowrap",
                  }}>
                    {c.label}
                    <button
                      onClick={() => handleSidebarSelect(c.key, "all")}
                      title="Remove filter"
                      style={{
                        width: 14, height: 14, borderRadius: "50%", border: "none",
                        background: `${ACCENT}25`, color: ACCENT, cursor: "pointer",
                        fontSize: "0.6rem", lineHeight: 1, display: "flex",
                        alignItems: "center", justifyContent: "center", padding: 0,
                      }}>
                      ✕
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => { setActiveQuick(QUICK_DEFAULTS); setCurrentPage(1); }}
                  style={{
                    fontSize: "0.66rem", fontWeight: 700, color: "#ef4444",
                    background: "transparent", border: "none", cursor: "pointer",
                    padding: "2px 4px", textDecoration: "underline", flexShrink: 0,
                  }}>
                  Clear all
                </button>
              </div>
            )}

            {/* Toggle Columns — which of the GMP fields actually render */}
            <div style={{ position: "relative", marginLeft: "auto" }}>
              <button onClick={() => setShowColumnConfig((v) => !v)}
                title="Choose which columns to show"
                style={{
                  padding: "4px 9px", fontSize: "0.66rem", fontWeight: 600,
                  fontFamily: FONT, borderRadius: 6,
                  border: `1px solid ${showColumnConfig ? ACCENT : colors.cardBorder}`,
                  background: showColumnConfig ? "rgba(16,185,129,0.1)" : "transparent",
                  color: showColumnConfig ? ACCENT : colors.textTertiary,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                🧩 Columns{" "}
                <span style={{ fontSize: "0.68rem" }}>
                  {visibleColumns.length}/{GMP_TASKS_COLUMNS.length}
                </span>
              </button>

              {showColumnConfig && (
                <>
                  <div onClick={() => setShowColumnConfig(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 9997 }} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0,
                    background: colors.cardBg, border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                    minWidth: 240, maxHeight: 340, overflowY: "auto", zIndex: 9998,
                  }}>
                    <div style={{
                      position: "sticky", top: 0, background: colors.cardBg,
                      padding: "8px 14px", fontSize: "0.6rem", fontWeight: 700,
                      color: colors.textTertiary, textTransform: "uppercase",
                      letterSpacing: "0.08em", borderBottom: `1px solid ${colors.cardBorder}`,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <span>Columns to show</span>
                      <span style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setVisibleColumns(GMP_TASKS_COLUMNS.map((c) => c.key))}
                          style={{ border: "none", background: "transparent", color: ACCENT, fontSize: "0.6rem", fontWeight: 700, cursor: "pointer", padding: 0 }}>
                          All
                        </button>
                        <button onClick={() => setVisibleColumns([])}
                          style={{ border: "none", background: "transparent", color: "#ef4444", fontSize: "0.6rem", fontWeight: 700, cursor: "pointer", padding: 0 }}>
                          None
                        </button>
                      </span>
                    </div>
                    {GMP_TASKS_COLUMNS.map((col) => {
                      const isChecked = visibleColumns.includes(col.key);
                      return (
                        <label key={col.key} onClick={() => toggleColumn(col.key)}
                          style={{
                            width: "100%", padding: "7px 14px",
                            borderTop: `1px solid ${colors.cardBorder}`,
                            display: "flex", alignItems: "center", gap: 8,
                            fontSize: "0.78rem", cursor: "pointer",
                            color: isChecked ? colors.textPrimary : colors.textTertiary,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = colors.badgeBg; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                          <input type="checkbox" checked={isChecked} readOnly style={{ cursor: "pointer", flexShrink: 0 }} />
                          <span>{col.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredData.length === 0 && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 10,
            color: colors.textTertiary, background: colors.cardBg,
          }}>
            <span style={{ fontSize: "2.5rem" }}>{data.length === 0 ? "🎉" : "🔍"}</span>
            <p style={{ fontSize: "0.84rem", fontWeight: 600, color: colors.textPrimary, margin: 0 }}>
              {data.length === 0 ? "No tasks assigned yet" : "No tasks match your filters"}
            </p>
            {data.length > 0 && (activeQuickChips.length > 0 || searchInput || filters.nearDeadline || filters.beyond || filters.starredOnly || filters.sentBy) && (
              <button
                onClick={() => {
                  setActiveQuick(QUICK_DEFAULTS);
                  setSearchInput(""); setSearch("");
                  setFilters((f) => ({ ...f, starredOnly: false, sentBy: "", nearDeadline: false, beyond: false }));
                  setCurrentPage(1);
                }}
                style={{
                  fontSize: "0.74rem", fontWeight: 600, color: ACCENT,
                  background: "transparent", border: `1px solid ${ACCENT}50`, borderRadius: 8,
                  padding: "6px 14px", cursor: "pointer",
                }}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Table — real rows, or skeleton rows on the first load (mirrors the
            GMP Queue). On a re-fetch (rows already on screen) the table stays
            put and just dims to 0.5, instead of flashing back to skeletons. */}
        {(filteredData.length > 0 || (loading && data.length === 0)) && (
          <div style={{
            flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
            background: colors.cardBg,
            opacity: loading && data.length > 0 ? 0.5 : 1,
            transition: "opacity 0.15s ease",
          }}>
            <TasksTable
              rows={loading && data.length === 0 ? [] : paginatedData}
              allIds={loading && data.length === 0 ? [] : sortedData.map((r) => r.id)}
              loading={loading && data.length === 0}
              isComplianceView={activeTab === GMP_COMPLIANCE_TAB}
              selectedRows={selectedRows}
              onSelectRow={(id) => setSelectedRows((p) => p.includes(id) ? p.filter((r) => r !== id) : [...p, id])}
              onSelectAll={handleSelectAll}
              onOpenLog={(t) => setLogRecord({ id: t.gmp_record_id, dtn: t.dtn })}
              onOpenAudit={(t) => setAuditRecord({ id: t.gmp_record_id, dtn: t.dtn })}
              onAdvanceStep={(t) => setWorkflowTask(t)}
              onViewDoctrack={(t) => setDoctrackRecord({ dtn: t.dtn })}
              onOpenDocuments={(t) => setDocsRecord({ id: t.gmp_record_id, dtn: t.dtn, name_of_establishment: t.name_of_establishment })}
              currentPage={currentPage} rowsPerPage={rowsPerPage}
              colors={colors} darkMode={darkMode}
              readIds={readIds}
              onMarkAsRead={(id) => setReadIds((p) => { const n = new Set(p); n.add(id); return n; })}
              onToggleStar={handleToggleStar}
              onDoubleClickRow={(row) => setWorkflowTask(row)}
              visibleColumns={visibleColumns}
              sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}
              isDefaultSort={sortBy === null}
              onResetSort={handleResetSort}
            />

            {/* Pagination — matches GMPQueuePage's Pagination component styling.
                Hidden during the first-load skeleton (no rows to page yet). */}
            {filteredData.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 14px", borderTop: `1px solid ${colors.cardBorder}`,
              flexShrink: 0, flexWrap: "wrap", gap: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.7rem", color: colors.textTertiary }}>Rows per page:</span>
                <select value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  style={{
                    fontSize: "0.74rem", fontFamily: FONT, borderRadius: 6,
                    border: `1px solid ${colors.cardBorder}`, background: "transparent",
                    color: colors.textTertiary, padding: "3px 6px", cursor: "pointer",
                  }}>
                  {[10, 25, 50].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.7rem", color: colors.textTertiary }}>
                  Page <strong>{currentPage}</strong> of <strong>{totalDisplayedPages}</strong>
                </span>
                <div style={{ display: "flex", gap: 3 }}>
                  {[
                    { label: "«", to: 1, dis: currentPage === 1 },
                    { label: "‹", to: currentPage - 1, dis: currentPage === 1 },
                    { label: "›", to: currentPage + 1, dis: currentPage === totalDisplayedPages },
                    { label: "»", to: totalDisplayedPages, dis: currentPage === totalDisplayedPages },
                  ].map((b) => (
                    <button key={b.label} onClick={() => !b.dis && setCurrentPage(b.to)} disabled={b.dis}
                      style={{
                        width: 28, height: 28, borderRadius: 6, border: `1px solid ${colors.cardBorder}`,
                        background: "transparent", color: colors.textTertiary,
                        cursor: b.dis ? "not-allowed" : "pointer", opacity: b.dis ? 0.35 : 1,
                        fontSize: "0.82rem", fontFamily: FONT,
                      }}>
                      {b.label}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: "0.7rem", color: colors.textTertiary }}>
                  {totalDisplayed > 0
                    ? `${indexOfFirst + 1}–${Math.min(indexOfFirst + rowsPerPage, totalDisplayed)} of ${totalDisplayed.toLocaleString()}`
                    : "0 tasks"}
                </span>
              </div>
            </div>
            )}
          </div>
        )}
        </div>
        {/* end table card */}
      </div>

      {/* Modals */}
      {logRecord && (
        <AppLogModal record={logRecord} onClose={() => setLogRecord(null)}
          colors={colors} darkMode={darkMode} />
      )}
      {auditRecord && (
        <FieldAuditModal record={auditRecord} onClose={() => setAuditRecord(null)}
          colors={colors} darkMode={darkMode} />
      )}
      {workflowTask && (
        <WorkflowModal
          record={{ id: workflowTask.gmp_record_id, dtn: workflowTask.dtn }}
          log={workflowTask}
          onClose={() => setWorkflowTask(null)}
          onSuccess={async () => {
            setWorkflowTask(null);
            await fetchAllSteps();
            await fetchTasks();
          }}
          colors={colors} darkMode={darkMode}
        />
      )}
      {doctrackRecord && (
        <DoctrackModal
          record={doctrackRecord}
          onClose={() => setDoctrackRecord(null)}
          colors={colors}
        />
      )}
      {docsRecord && (
        <GMPDocumentsModal
          record={docsRecord}
          onClose={() => setDocsRecord(null)}
          colors={colors} darkMode={darkMode}
        />
      )}

      <GMPTransmittalModal
        open={showTransmittalChoice}
        count={selectedRows.length}
        generating={generatingTransmittal}
        onGenerate={handleGenerateTransmittal}
        onClose={() => !generatingTransmittal && setShowTransmittalChoice(false)}
        colors={colors} darkMode={darkMode}
      />

      {showBulkEndorse && GMP_BULK_ENDORSE_CONFIG[activeTab] && (
        <GMPBulkEndorseModal
          config={GMP_BULK_ENDORSE_CONFIG[activeTab]}
          records={sortedData.filter((r) => selectedRows.includes(r.id))}
          onClose={() => setShowBulkEndorse(false)}
          onSuccess={async () => {
            setSelectedRows([]);
            await fetchAllSteps();
            await fetchTasks();
          }}
          colors={colors} darkMode={darkMode}
        />
      )}
    </div>
  );
}
