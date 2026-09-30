// FILE: src/pages/CmdrPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCmdrAll, getCmdrApplication, getCmdrFacets } from "../api/cmdr";
import { getColorScheme } from "../components/reports/utils.js";
import TablePagination from "../components/reports/TablePagination";

/* ───────────────────────── constants ───────────────────────── */

const TYPE_LABELS = {
  initial: "Initial",
  initial_abridge: "Initial (Abridged)",
  renewal: "Renewal",
  amendment: "Amendment",
};
const TYPE_KEYS = Object.keys(TYPE_LABELS);

const KIND_GRADIENTS = {
  initial: ["#2196F3", "#1976D2", "rgba(33,150,243,0.3)"],
  initial_abridge: ["#06b6d4", "#0891b2", "rgba(6,182,212,0.3)"],
  renewal: ["#10b981", "#059669", "rgba(16,185,129,0.3)"],
  amendment: ["#f59e0b", "#d97706", "rgba(245,158,11,0.3)"],
};

const STATUS_STYLES = {
  COMPLETED: ["#10b981", "#059669", "rgba(16,185,129,0.3)", "✓"],
  TO_DO: ["#f59e0b", "#d97706", "rgba(245,158,11,0.3)", "⏳"],
  APPROVED: ["#3b82f6", "#2563eb", "rgba(59,130,246,0.3)", "✅"],
  PENDING: ["#eab308", "#ca8a04", "rgba(234,179,8,0.3)", "⏸"],
  REJECTED: ["#ef4444", "#dc2626", "rgba(239,68,68,0.3)", "✗"],
};

const ITEM_DOT_COLORS = [
  "#7c3aed",
  "#0891b2",
  "#059669",
  "#b45309",
  "#f97316",
  "#be185d",
  "#6366f1",
  "#e11d48",
  "#0ea5e9",
  "#84cc16",
  "#a855f7",
  "#14b8a6",
];

const COLUMNS = [
  { key: "kind", label: "Kind", width: "130px" },
  { key: "APP_NUMBER", label: "App No.", width: "90px" },
  { key: "DTN", label: "DTN", width: "150px" },
  { key: "COMPANY_NAME", label: "Company", width: "260px" },
  { key: "TYPE_APPLICATION", label: "Application Type", width: "170px" },
  { key: "APPLICATION_OPTION", label: "Application Option", width: "170px" },
  { key: "APP_STATUS", label: "Status", width: "110px" },
  { key: "DATE_RECEIVED_FDAC", label: "Date Received", width: "110px" },
  { key: "TOTAL_NO_DAYS", label: "Total Days", width: "90px" },
];

const STAGES = [
  {
    label: "Decker",
    person: "ASSIGNED_DECKER_DISPLAYNAME",
    start: "DATE_DECKER_START",
    end: "DATE_DECKER_END",
    days: "ASSIGN_DECKER_NO_DAYS",
    status: "ASSIGN_DECKER_NO_DAYS_STATUS",
    remarks: "DECKER_REMARKS",
  },
  {
    label: "Evaluator",
    person: "ASSIGNED_EVALUATOR_DISPLAYNAME",
    start: "DATE_EVAL_START",
    end: "DATE_EVAL_END",
    days: "ASSIGN_EVAL_NO_DAYS",
    status: "ASSIGN_EVAL_NO_DAYS_STATUS",
    result: "EVALUATOR_FINAL_RECOMMENDATION",
    remarks: "EVALUATOR_FINAL_REMARKS",
  },
  {
    label: "Checker",
    person: "ASSIGNED_CHECKER_DISPLAYNAME",
    start: "DATE_CHECK_START",
    end: "DATE_CHECK_END",
    days: "ASSIGN_CHECKER_NO_DAYS",
    status: "ASSIGN_CHECKER_NO_DAYS_STATUS",
    result: "CHECKER_RECOM",
    remarks: "CHECKER_REMARKS",
  },
  {
    label: "Director (Signing)",
    person: "ASSIGNED_DIRECTOR_DISPLAYNAME",
    start: "DATE_DIRECTOR_START",
    end: "DATE_DIRECTOR_END",
    days: "ASSIGN_DOC_SIGN_NO_DAYS",
    status: "ASSIGN_DOC_SIGN_NO_DAYS_STATUS",
  },
  {
    label: "Document Releasing",
    person: "ASSIGNED_DOC_RELEASING_DISPLAYNAME",
    start: "DATE_DOC_RELEASING_START",
    end: "DATE_DOC_RELEASING_END",
    days: "ASSIGN_DOC_RELEASING_NO_DAYS",
    status: "ASSIGN_DOC_RELEASING_NO_DAYS_STATUS",
  },
];

const INFO_FIELDS = [
  ["Application No.", "APP_NUMBER"],
  ["DTN", "DTN"],
  ["Re-application DTN", "RE_APPLICATION_DTN"],
  ["Authorization", "TYPE_AUTHORIZATION"],
  ["Application Type", "TYPE_APPLICATION"],
  ["Application Option", "APPLICATION_OPTION"],
  ["Product Category", "PRODUCT_CAT_TEMP"],
  ["Date Received", "DATE_RECEIVED_FDAC", (v) => dateOnly(v)],
  ["Total Days", "TOTAL_NO_DAYS"],
  ["Company Address", "COMPANY_ADDRESS"],
];

const EMPTY_FACETS = {
  cmdr_type: [],
  type_application: [],
  application_option: [],
  app_status: [],
};

const MENU_ITEMS = [
  { label: "Application Information", icon: "👁️", tab: "info" },
  { label: "Processing Stages", icon: "🕓", tab: "stages" },
  { label: "Products", icon: "📦", tab: "products" },
  { label: "Delegations", icon: "🔀", tab: "delegations" },
];

/* ───────────────────────── helpers ───────────────────────── */

const dateOnly = (v) => (v ? String(v).slice(0, 10) : "");
const show = (v) => (v === null || v === undefined || v === "" ? "—" : v);
const shortId = (v) => (v ? String(v).slice(0, 8) : "—");
const sumCounts = (items) => items.reduce((s, i) => s + i.count, 0);
const errorMessage = (err, fallback) =>
  typeof err?.detail === "string" ? err.detail : err?.message || fallback;
const isCanceled = (err) =>
  err?.code === "ERR_CANCELED" ||
  err?.name === "CanceledError" ||
  err?.name === "AbortError";

function useDebounced(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/* ───────────────────────── small pieces ───────────────────────── */

function KindBadge({ kind }) {
  const [from, to, shadow] = KIND_GRADIENTS[kind] || [
    "#6b7280",
    "#4b5563",
    "rgba(107,114,128,0.3)",
  ];
  return (
    <span
      style={{
        padding: "0.25rem 0.6rem",
        background: `linear-gradient(135deg,${from},${to})`,
        color: "#fff",
        borderRadius: "6px",
        fontSize: "0.68rem",
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        whiteSpace: "nowrap",
        boxShadow: `0 2px 6px ${shadow}`,
      }}
    >
      {TYPE_LABELS[kind] || kind}
    </span>
  );
}

function StatusBadge({ value, colors }) {
  if (!value) return <span style={{ color: colors.textTertiary }}>—</span>;
  const [from, to, shadow, icon] = STATUS_STYLES[
    String(value).toUpperCase()
  ] || ["#6b7280", "#4b5563", "rgba(107,114,128,0.3)", "•"];
  return (
    <span
      style={{
        padding: "0.3rem 0.7rem",
        background: `linear-gradient(135deg,${from},${to})`,
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.58rem",
        fontWeight: 700,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        boxShadow: `0 2px 8px ${shadow}`,
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        whiteSpace: "nowrap",
      }}
    >
      <span>{icon}</span>
      {String(value).replace(/_/g, " ")}
    </span>
  );
}

function LoadingSpinner({ darkMode, colors, progress }) {
  const label =
    progress < 50
      ? "Fetching applications…"
      : progress < 100
        ? "Almost done…"
        : "Done!";
  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "12px",
        padding: "3rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
      }}
    >
      <p
        style={{
          fontSize: "0.72rem",
          fontWeight: 600,
          color: colors.textTertiary,
          margin: 0,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </p>
      <div
        style={{
          width: 160,
          height: 2,
          background: darkMode
            ? "rgba(16,185,129,0.15)"
            : "rgba(16,185,129,0.12)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "#10B981",
            borderRadius: 2,
            transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
      <p
        style={{
          fontSize: "0.65rem",
          color: colors.textTertiary,
          margin: 0,
          opacity: 0.6,
        }}
      >
        {progress}%
      </p>
    </div>
  );
}

function SidebarSection({
  title,
  groupColor,
  items,
  activeItem,
  onItemClick,
  colors,
  darkMode,
  totalCount,
}) {
  const [isOpen, setIsOpen] = useState(true);
  const activeBg = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.055)";
  const activeBorder = darkMode ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.1)";
  const hoverBg = darkMode ? "#161616" : "#f0f0f0";
  const pillBg = darkMode ? "#1a1a1a" : "#e8e8e8";

  const row = (isActive, dot, dotOpacity, label, count, onClick, key) => (
    <div
      key={key}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "3px 6px",
        borderRadius: 5,
        cursor: "pointer",
        background: isActive ? activeBg : "transparent",
        border: `0.5px solid ${isActive ? activeBorder : "transparent"}`,
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = hoverBg;
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = "transparent";
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: dot,
            opacity: dotOpacity,
            flexShrink: 0,
            display: "inline-block",
          }}
        />
        <span
          title={label}
          style={{
            fontSize: "0.68rem",
            fontWeight: isActive ? 600 : 400,
            color: isActive ? colors.textPrimary : colors.textSecondary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          fontSize: "0.6rem",
          fontWeight: 600,
          color: isActive ? colors.textPrimary : colors.textTertiary,
          background: pillBg,
          borderRadius: 99,
          padding: "1px 6px",
          minWidth: 18,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        {count}
      </span>
    </div>
  );

  return (
    <div style={{ marginBottom: 2 }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 4px 3px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: groupColor,
              flexShrink: 0,
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: "0.6rem",
              fontWeight: 700,
              color: colors.textTertiary,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {title}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              fontSize: "0.58rem",
              color: colors.textTertiary,
              background: pillBg,
              borderRadius: 4,
              padding: "1px 5px",
              fontWeight: 600,
            }}
          >
            {items.length}
          </span>
          <svg
            width="8"
            height="8"
            viewBox="0 0 10 10"
            style={{
              transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 0.2s",
              flexShrink: 0,
            }}
          >
            <polyline
              points="1,3 5,7 9,3"
              fill="none"
              stroke={colors.textTertiary}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div
          style={{ display: "flex", flexDirection: "column", marginBottom: 2 }}
        >
          {row(
            activeItem === null,
            groupColor,
            0.5,
            "All",
            totalCount,
            () => onItemClick(null),
            "all",
          )}
          {items.map((item, idx) =>
            row(
              activeItem === item.value,
              ITEM_DOT_COLORS[idx % ITEM_DOT_COLORS.length],
              1,
              item.value,
              item.count,
              () => onItemClick(item.value),
              item.value,
            ),
          )}
        </div>
      )}

      <div
        style={{
          height: "0.5px",
          background: colors.cardBorder,
          margin: "4px 2px 3px",
        }}
      />
    </div>
  );
}

/* ───────────────────────── detail modal ───────────────────────── */

function DetailModal({ target, onClose, colors, darkMode }) {
  const [tab, setTab] = useState(target.tab || "info");
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const closeRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setDetail(null);
    getCmdrApplication(target.cmdr_type, target.app_uid, {
      signal: controller.signal,
    })
      .then(setDetail)
      .catch((err) => {
        if (!isCanceled(err))
          setError(errorMessage(err, "Could not load this application."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [target.cmdr_type, target.app_uid]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const th = {
    padding: "0.45rem 0.6rem",
    fontSize: "0.55rem",
    fontWeight: 600,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: `1px solid ${colors.tableBorder}`,
    whiteSpace: "nowrap",
    background: colors.tableBg,
    textAlign: "left",
  };
  const td = {
    padding: "0.4rem 0.6rem",
    fontSize: "0.68rem",
    color: colors.tableText,
    borderBottom: `1px solid ${colors.tableBorder}`,
    whiteSpace: "nowrap",
  };
  const tableWrap = {
    overflowX: "auto",
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: 8,
  };

  const tabs = [
    { id: "info", label: "Information" },
    { id: "stages", label: "Processing Stages" },
    { id: "products", label: "Products", count: detail?.products.length },
    {
      id: "delegations",
      label: "Delegations",
      count: detail?.delegations.length,
    },
  ];

  const empty = (text) => (
    <p
      style={{
        margin: 0,
        padding: "1.5rem 0",
        textAlign: "center",
        fontSize: "0.75rem",
        color: colors.textTertiary,
      }}
    >
      {text}
    </p>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cmdr-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 14,
          width: "min(980px, 100%)",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: colors.textPrimary,
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
            padding: "0.9rem 1.25rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2
              id="cmdr-modal-title"
              style={{
                margin: 0,
                fontSize: "0.95rem",
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              {detail?.COMPANY_NAME || target.company || "Application"}
            </h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 6,
              }}
            >
              <KindBadge kind={target.cmdr_type} />
              {detail && (
                <StatusBadge value={detail.APP_STATUS} colors={colors} />
              )}
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28,
              height: 28,
              flexShrink: 0,
              background: "transparent",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 6,
              color: colors.textTertiary,
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* tabs */}
        <div
          role="tablist"
          style={{
            display: "flex",
            overflowX: "auto",
            padding: "0 0.75rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "8px 14px",
                  fontSize: "12px",
                  background: "transparent",
                  border: "none",
                  borderBottom: active
                    ? "2px solid #10b981"
                    : "2px solid transparent",
                  color: active ? colors.textPrimary : colors.textTertiary,
                  fontWeight: active ? 500 : 400,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                  position: "relative",
                  top: 1,
                }}
              >
                {t.label}
                {t.count !== undefined && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 999,
                      background: active ? "#10b981" : colors.badgeBg,
                      color: active ? "#fff" : colors.textTertiary,
                      border: `0.5px solid ${active ? "#10b981" : colors.cardBorder}`,
                      fontWeight: 600,
                      minWidth: 20,
                      textAlign: "center",
                    }}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* body */}
        <div style={{ padding: "1rem 1.25rem", overflowY: "auto", flex: 1 }}>
          {loading && empty("Loading application…")}
          {error && (
            <div
              role="alert"
              style={{
                padding: "0.6rem 0.85rem",
                borderRadius: 8,
                border: "1px solid #ef4444",
                background: "rgba(239,68,68,0.1)",
                color: "#ef4444",
                fontSize: "0.75rem",
              }}
            >
              {error}
            </div>
          )}

          {detail && tab === "info" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "0.9rem 1.5rem",
              }}
            >
              {INFO_FIELDS.map(([label, key, fmt]) => {
                const raw = detail[key];
                if (key === "COMPANY_ADDRESS" && !raw) return null;
                return (
                  <div key={key} style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.58rem",
                        fontWeight: 600,
                        color: colors.textTertiary,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 2,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: colors.textPrimary,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {show(fmt ? fmt(raw) : raw)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {detail && tab === "stages" && (
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {STAGES.map((s, i) => {
                const state = detail[s.end]
                  ? "done"
                  : detail[s.start]
                    ? "active"
                    : "pending";
                const dot =
                  state === "done"
                    ? "#10b981"
                    : state === "active"
                      ? "#6366f1"
                      : colors.cardBorder;
                const last = i === STAGES.length - 1;
                return (
                  <li
                    key={s.label}
                    style={{
                      position: "relative",
                      padding: `0 0 ${last ? 0 : 18}px 28px`,
                    }}
                  >
                    {!last && (
                      <span
                        style={{
                          position: "absolute",
                          left: 6,
                          top: 16,
                          bottom: 0,
                          width: 2,
                          background:
                            state === "done" ? "#10b981" : colors.cardBorder,
                        }}
                      />
                    )}
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 3,
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        border: `2px solid ${dot}`,
                        background: state === "done" ? dot : colors.cardBg,
                        boxShadow:
                          state === "active"
                            ? "0 0 0 3px rgba(99,102,241,0.25)"
                            : "none",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "2px 12px",
                        alignItems: "baseline",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: "0.8rem",
                          color:
                            state === "pending"
                              ? colors.textTertiary
                              : colors.textPrimary,
                        }}
                      >
                        {s.label}
                      </strong>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: colors.textSecondary,
                        }}
                      >
                        {show(detail[s.person])}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "2px 16px",
                        marginTop: 2,
                        fontSize: "0.7rem",
                        color: colors.textTertiary,
                      }}
                    >
                      <span>Started {show(dateOnly(detail[s.start]))}</span>
                      <span>Finished {show(dateOnly(detail[s.end]))}</span>
                      <span>
                        Days {show(detail[s.days])}
                        {detail[s.status] ? ` (${detail[s.status]})` : ""}
                      </span>
                    </div>
                    {s.result && detail[s.result] && (
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: "0.72rem",
                          color: colors.textSecondary,
                        }}
                      >
                        Recommendation: {detail[s.result]}
                      </p>
                    )}
                    {s.remarks && detail[s.remarks] && (
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: "0.72rem",
                          color: colors.textSecondary,
                        }}
                      >
                        Remarks: {detail[s.remarks]}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {detail &&
            tab === "products" &&
            (detail.products.length === 0 ? (
              empty("No products on this application.")
            ) : (
              <div style={tableWrap}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "right", width: 40 }}>
                        #
                      </th>
                      <th style={th}>Product</th>
                      <th style={th}>Manufacturer</th>
                      <th style={th}>MDR/DVR No.</th>
                      <th style={th}>Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.products.map((p, i) => (
                      <tr
                        key={p.ROW}
                        style={{
                          background:
                            i % 2 === 0
                              ? colors.tableRowEven
                              : colors.tableRowOdd,
                        }}
                      >
                        <td style={{ ...td, textAlign: "right" }}>{p.ROW}</td>
                        <td style={td}>{show(p.PRODUCT_NAME_TEMP)}</td>
                        <td style={td}>{show(p.MANUFACTURER_TEMP)}</td>
                        <td style={td}>{show(p.MDR_DVR_NO_TEMP)}</td>
                        <td style={td}>{show(p.CLASS_TEMP)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {detail &&
            tab === "delegations" &&
            (detail.delegations.length === 0 ? (
              empty("No delegations recorded.")
            ) : (
              <div style={tableWrap}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "right" }}>Index</th>
                      <th style={th}>Task</th>
                      <th style={th}>User</th>
                      <th style={th}>Type</th>
                      <th style={th}>Thread</th>
                      <th style={th}>Delegated</th>
                      <th style={th}>Started</th>
                      <th style={th}>Finished</th>
                      <th style={{ ...th, textAlign: "right" }}>Duration</th>
                      <th style={th}>Delayed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.delegations.map((d, i) => (
                      <tr
                        key={d.DEL_INDEX}
                        style={{
                          background:
                            i % 2 === 0
                              ? colors.tableRowEven
                              : colors.tableRowOdd,
                        }}
                      >
                        <td style={{ ...td, textAlign: "right" }}>
                          {d.DEL_INDEX}
                        </td>
                        <td style={td} title={d.TAS_UID}>
                          {shortId(d.TAS_UID)}
                        </td>
                        <td style={td} title={d.USR_UID}>
                          {shortId(d.USR_UID)}
                        </td>
                        <td style={td}>{show(d.DEL_TYPE)}</td>
                        <td style={td}>{show(d.DEL_THREAD_STATUS)}</td>
                        <td style={td}>
                          {show(dateOnly(d.DEL_DELEGATE_DATE))}
                        </td>
                        <td style={td}>{show(dateOnly(d.DEL_INIT_DATE))}</td>
                        <td style={td}>{show(dateOnly(d.DEL_FINISH_DATE))}</td>
                        <td style={{ ...td, textAlign: "right" }}>
                          {d.DEL_DURATION == null
                            ? "—"
                            : Number(d.DEL_DURATION).toFixed(2)}
                        </td>
                        <td style={td}>{d.DEL_DELAYED ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── page ───────────────────────── */

function CmdrPage({ darkMode }) {
  const colors = getColorScheme(darkMode);

  const [searchInput, setSearchInput] = useState("");
  const searchTerm = useDebounced(searchInput);
  const [kind, setKind] = useState(null);
  const [appType, setAppType] = useState(null);
  const [appOption, setAppOption] = useState(null);
  const [appStatus, setAppStatus] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);

  const [rows, setRows] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [facets, setFacets] = useState(EMPTY_FACETS);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openMenu, setOpenMenu] = useState(null); // { key, top, right }
  const [detail, setDetail] = useState(null); // { cmdr_type, app_uid, company, tab }

  const filterParams = useMemo(
    () => ({
      search: searchTerm,
      app_status: appStatus,
      type_application: appType,
      application_option: appOption,
      cmdr_type: kind ? [kind] : [],
    }),
    [searchTerm, appStatus, appType, appOption, kind],
  );

  const activeFilterCount =
    (appType !== null ? 1 : 0) +
    (appOption !== null ? 1 : 0) +
    (appStatus !== null ? 1 : 0);
  const hasFilters =
    activeFilterCount > 0 || kind !== null || searchInput !== "";

  // counts for the sidebar and the tabs
  useEffect(() => {
    const controller = new AbortController();
    getCmdrFacets(filterParams, { signal: controller.signal })
      .then(setFacets)
      .catch((err) => {
        if (!isCanceled(err)) setFacets(EMPTY_FACETS);
      });
    return () => controller.abort();
  }, [filterParams, reloadKey]);

  // the table
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadProgress(0);
    setError("");
    const t = setTimeout(() => setLoadProgress(50), 100);
    getCmdrAll(
      {
        ...filterParams,
        skip: (currentPage - 1) * rowsPerPage,
        limit: rowsPerPage,
      },
      { signal: controller.signal },
    )
      .then((res) => {
        setRows(res.items);
        setTotalRecords(res.total);
        setLoadProgress(100);
      })
      .catch((err) => {
        if (isCanceled(err)) return;
        setRows([]);
        setTotalRecords(0);
        setError(errorMessage(err, "Could not load applications."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [filterParams, currentPage, rowsPerPage, reloadKey]);

  const pick = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };
  const clearAll = () => {
    setSearchInput("");
    setKind(null);
    setAppType(null);
    setAppOption(null);
    setAppStatus(null);
    setCurrentPage(1);
  };
  const handleRowsPerPageChange = (val) => {
    setRowsPerPage(Math.min(Number(val), 200)); // the API caps a page at 200 rows
    setCurrentPage(1);
  };
  const closeDetail = useCallback(() => setDetail(null), []);

  const handleMenuToggle = (e, rowKey) => {
    e.stopPropagation();
    if (openMenu?.key === rowKey) {
      setOpenMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 170;
    const top =
      window.innerHeight - rect.bottom < menuHeight
        ? rect.bottom - menuHeight
        : rect.bottom + 4;
    setOpenMenu({ key: rowKey, top, right: window.innerWidth - rect.right });
  };
  const openDetail = (row, tab) => {
    setOpenMenu(null);
    setDetail({
      cmdr_type: row.CMDR_TYPE,
      app_uid: row.APP_UID,
      company: row.COMPANY_NAME,
      tab,
    });
  };

  const kindCount = (key) =>
    facets.cmdr_type.find((k) => k.value === key)?.count ?? 0;
  const allKindsCount = sumCounts(facets.cmdr_type);

  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const indexOfFirstRow = (currentPage - 1) * rowsPerPage + 1;
  const indexOfLastRow = Math.min(currentPage * rowsPerPage, totalRecords);

  /* styles shared with the Reports page */
  const iconBtn = (onClick, title, children) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: "26px",
        height: "26px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "6px",
        cursor: "pointer",
        color: colors.textTertiary,
        fontSize: "0.7rem",
        transition: "all 0.2s ease",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = darkMode ? "#1f1f1f" : "#e5e5e5";
        e.currentTarget.style.color = colors.textPrimary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = colors.textTertiary;
      }}
    >
      {children}
    </button>
  );

  const tabButtonStyle = (isActive) => ({
    padding: "6px 14px",
    fontSize: "12px",
    background: "transparent",
    border: "none",
    borderBottom: isActive ? "2px solid #10b981" : "2px solid transparent",
    color: isActive ? colors.textPrimary : colors.textTertiary,
    fontWeight: isActive ? "500" : "400",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    position: "relative",
    top: "1px",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
    flexShrink: 0,
  });
  const tabBadgeStyle = (isActive) => ({
    fontSize: "10px",
    padding: "1px 6px",
    borderRadius: "999px",
    background: isActive ? "#10b981" : colors.badgeBg,
    color: isActive ? "#fff" : colors.textTertiary,
    border: `0.5px solid ${isActive ? "#10b981" : colors.cardBorder}`,
    fontWeight: "600",
    minWidth: "20px",
    textAlign: "center",
  });
  const thBase = {
    padding: "0.45rem 0.6rem",
    fontSize: "0.55rem",
    fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: `1px solid ${colors.tableBorder}`,
    whiteSpace: "nowrap",
    background: colors.tableBg,
    userSelect: "none",
    textAlign: "left",
  };
  const tdBase = {
    padding: "0.4rem 0.6rem",
    fontSize: "0.68rem",
    color: colors.tableText,
    borderBottom: `1px solid ${colors.tableBorder}`,
  };

  const renderCell = (col, row) => {
    switch (col.key) {
      case "kind":
        return <KindBadge kind={row.CMDR_TYPE} />;
      case "APP_STATUS":
        return <StatusBadge value={row.APP_STATUS} colors={colors} />;
      case "DATE_RECEIVED_FDAC":
        return (
          <span style={{ fontSize: "0.78rem" }}>
            {show(dateOnly(row.DATE_RECEIVED_FDAC))}
          </span>
        );
      case "DTN":
        return (
          <span style={{ fontSize: "0.65rem", fontWeight: 600 }}>
            {show(row.DTN)}
          </span>
        );
      default:
        return (
          <span style={{ fontSize: "0.78rem" }}>{show(row[col.key])}</span>
        );
    }
  };

  const sidebarSections = [
    {
      title: "Application Type",
      color: "#0891b2",
      items: facets.type_application,
      active: appType,
      set: pick(setAppType),
    },
    {
      title: "Application Option",
      color: "#6366f1",
      items: facets.application_option,
      active: appOption,
      set: pick(setAppOption),
    },
    {
      title: "Status",
      color: "#059669",
      items: facets.app_status,
      active: appStatus,
      set: pick(setAppStatus),
    },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ── Quick Filters sidebar ── */}
      <div
        style={{
          width: isSidebarOpen ? "190px" : "44px",
          minWidth: isSidebarOpen ? "190px" : "44px",
          background: darkMode ? "#0a0a0a" : "#ffffff",
          borderRight: `1px solid ${colors.cardBorder}`,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 0.25s ease, min-width 0.25s ease",
        }}
      >
        {isSidebarOpen ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.6rem 0.75rem 0.6rem 0.85rem",
                borderBottom: `1px solid ${colors.cardBorder}`,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                <h2
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: colors.textPrimary,
                    margin: 0,
                  }}
                >
                  Quick Filters
                </h2>
                {activeFilterCount > 0 && (
                  <span
                    style={{
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      background: "#6366f1",
                      color: "#fff",
                      borderRadius: 99,
                      padding: "1px 6px",
                    }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </div>
              {iconBtn(() => setIsSidebarOpen(false), "Hide filters", "◀")}
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                padding: "0.6rem 0.6rem 1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              {sidebarSections.map(
                (s) =>
                  (s.items.length > 0 || s.active !== null) && (
                    <SidebarSection
                      key={s.title}
                      title={s.title}
                      groupColor={s.color}
                      items={s.items}
                      activeItem={s.active}
                      onItemClick={s.set}
                      colors={colors}
                      darkMode={darkMode}
                      totalCount={sumCounts(s.items)}
                    />
                  ),
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.85rem",
              padding: "0.75rem 0",
            }}
          >
            {iconBtn(() => setIsSidebarOpen(true), "Show filters", "▶")}
            {activeFilterCount > 0 && (
              <div
                onClick={() => setIsSidebarOpen(true)}
                title={`${activeFilterCount} active filter${activeFilterCount > 1 ? "s" : ""}`}
                style={{
                  width: "18px",
                  height: "18px",
                  background: "#6366f1",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {activeFilterCount}
              </div>
            )}
            {[
              { icon: "🗂️", key: appType, title: "Application Type" },
              { icon: "⚙️", key: appOption, title: "Application Option" },
              { icon: "📌", key: appStatus, title: "Status" },
            ].map(({ icon, key, title }) => (
              <span
                key={title}
                title={title}
                onClick={() => setIsSidebarOpen(true)}
                style={{
                  fontSize: "1rem",
                  cursor: "pointer",
                  opacity: key !== null ? 1 : 0.3,
                  transition: "opacity 0.2s",
                }}
              >
                {icon}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {/* tabs */}
        <div
          style={{
            padding: "0.85rem 1.5rem",
            background: colors.pageBg,
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          <div
            role="tablist"
            style={{
              display: "flex",
              overflowX: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              borderBottom: `1px solid ${colors.cardBorder}`,
              marginTop: "0.5rem",
            }}
          >
            <button
              role="tab"
              aria-selected={kind === null}
              onClick={() => pick(setKind)(null)}
              style={tabButtonStyle(kind === null)}
            >
              <span>📋</span>
              <span>All Applications</span>
              <span style={tabBadgeStyle(kind === null)}>
                {allKindsCount.toLocaleString()}
              </span>
            </button>
            {TYPE_KEYS.map((key) => (
              <button
                key={key}
                role="tab"
                aria-selected={kind === key}
                onClick={() => pick(setKind)(key)}
                style={tabButtonStyle(kind === key)}
              >
                <span>{TYPE_LABELS[key]}</span>
                <span style={tabBadgeStyle(kind === key)}>
                  {kindCount(key).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.85rem 1.5rem",
            background: colors.pageBg,
          }}
        >
          {/* search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem",
              marginBottom: "0.85rem",
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0 0.75rem",
                height: 32,
                background: colors.pageBg,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>🔍</span>
              <input
                type="search"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by company, DTN or application number"
                aria-label="Search applications"
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: colors.textPrimary,
                  fontSize: "0.7rem",
                }}
              />
            </div>
            {hasFilters && (
              <button
                onClick={clearAll}
                style={{
                  height: 32,
                  padding: "0 12px",
                  background: "transparent",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 8,
                  color: colors.textSecondary,
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          {error && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                marginBottom: "0.85rem",
                padding: "0.6rem 0.85rem",
                borderRadius: 10,
                border: "1px solid #ef4444",
                background: "rgba(239,68,68,0.1)",
                color: "#ef4444",
                fontSize: "0.75rem",
              }}
            >
              <span>{error}</span>
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                style={{
                  padding: "4px 10px",
                  background: "transparent",
                  border: "1px solid #ef4444",
                  borderRadius: 6,
                  color: "#ef4444",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
            </div>
          )}

          {loading && (
            <LoadingSpinner
              darkMode={darkMode}
              colors={colors}
              progress={loadProgress}
            />
          )}

          {!loading && !error && rows.length === 0 && (
            <div
              style={{
                background: colors.cardBg,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: "12px",
                padding: "3rem",
                textAlign: "center",
                color: colors.textSecondary,
              }}
            >
              <div style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>
                📭
              </div>
              <div
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  marginBottom: "0.35rem",
                }}
              >
                No applications found
              </div>
              <div style={{ fontSize: "0.75rem" }}>
                No records found for the selected criteria
              </div>
            </div>
          )}

          {!loading && rows.length > 0 && (
            <div
              style={{
                background: colors.cardBg,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: "12px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                height: "100%",
                minHeight: 0,
              }}
            >
              <div
                style={{
                  padding: "0.45rem 0.85rem",
                  borderBottom: `1px solid ${colors.tableBorder}`,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  flexShrink: 0,
                }}
              >
                <h3
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: colors.textPrimary,
                    margin: 0,
                  }}
                >
                  CMDR Data
                </h3>
                <span
                  style={{
                    padding: "0.2rem 0.6rem",
                    background: colors.badgeBg,
                    borderRadius: "12px",
                    fontSize: "0.55rem",
                    color: colors.textTertiary,
                    fontWeight: 600,
                  }}
                >
                  {totalRecords.toLocaleString()} total records
                </span>
              </div>

              <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "1300px",
                  }}
                >
                  <thead
                    style={{
                      position: "sticky",
                      top: 0,
                      background: colors.tableBg,
                      zIndex: 20,
                    }}
                  >
                    <tr>
                      <th
                        style={{
                          ...thBase,
                          textAlign: "center",
                          width: "40px",
                          minWidth: "40px",
                          position: "sticky",
                          left: 0,
                          zIndex: 22,
                          boxShadow: "2px 0 4px rgba(0,0,0,0.15)",
                        }}
                      >
                        #
                      </th>
                      {COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          style={{ ...thBase, minWidth: col.width }}
                        >
                          {col.label}
                        </th>
                      ))}
                      <th
                        style={{
                          ...thBase,
                          textAlign: "center",
                          width: "60px",
                          position: "sticky",
                          right: 0,
                          zIndex: 21,
                          boxShadow: "-4px 0 8px rgba(0,0,0,0.15)",
                        }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const rowKey = `${row.CMDR_TYPE}-${row.APP_UID}`;
                      const rowBg =
                        index % 2 === 0
                          ? colors.tableRowEven
                          : colors.tableRowOdd;
                      return (
                        <tr
                          key={rowKey}
                          style={{
                            background: rowBg,
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              colors.tableRowHover)
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = rowBg)
                          }
                        >
                          <td
                            style={{
                              ...tdBase,
                              fontWeight: 700,
                              color: colors.textTertiary,
                              textAlign: "center",
                              whiteSpace: "nowrap",
                              width: "40px",
                              minWidth: "40px",
                              position: "sticky",
                              left: 0,
                              background: rowBg,
                              zIndex: 10,
                              boxShadow: "2px 0 4px rgba(0,0,0,0.15)",
                            }}
                          >
                            {indexOfFirstRow + index}
                          </td>
                          {COLUMNS.map((col) => (
                            <td
                              key={col.key}
                              style={{
                                ...tdBase,
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                                minWidth: col.width,
                              }}
                            >
                              {renderCell(col, row)}
                            </td>
                          ))}
                          <td
                            style={{
                              ...tdBase,
                              textAlign: "center",
                              whiteSpace: "nowrap",
                              position: "sticky",
                              right: 0,
                              background: rowBg,
                              zIndex: openMenu?.key === rowKey ? 9999 : 9,
                              boxShadow: "-4px 0 8px rgba(0,0,0,0.15)",
                            }}
                          >
                            <button
                              onClick={(e) => handleMenuToggle(e, rowKey)}
                              aria-label="Row actions"
                              aria-haspopup="menu"
                              aria-expanded={openMenu?.key === rowKey}
                              style={{
                                padding: "0.4rem",
                                background: "transparent",
                                border: `1px solid ${colors.cardBorder}`,
                                borderRadius: "6px",
                                color: colors.textPrimary,
                                cursor: "pointer",
                                width: "24px",
                                height: "24px",
                                lineHeight: 0,
                              }}
                            >
                              ⋮
                            </button>
                            {openMenu?.key === rowKey && (
                              <>
                                <div
                                  onClick={() => setOpenMenu(null)}
                                  style={{
                                    position: "fixed",
                                    inset: 0,
                                    zIndex: 9998,
                                  }}
                                />
                                <div
                                  role="menu"
                                  style={{
                                    position: "fixed",
                                    top: `${openMenu.top}px`,
                                    right: `${openMenu.right}px`,
                                    left: "auto",
                                    background: colors.cardBg,
                                    border: `1px solid ${colors.cardBorder}`,
                                    borderRadius: "8px",
                                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                                    minWidth: "190px",
                                    zIndex: 9999,
                                    textAlign: "left",
                                  }}
                                >
                                  {MENU_ITEMS.map((item, i) => (
                                    <button
                                      key={item.label}
                                      role="menuitem"
                                      onClick={() => openDetail(row, item.tab)}
                                      style={{
                                        width: "100%",
                                        padding: "0.6rem 0.85rem",
                                        background: "transparent",
                                        border: "none",
                                        borderTop:
                                          i > 0
                                            ? `1px solid ${colors.tableBorder}`
                                            : "none",
                                        color: colors.textPrimary,
                                        fontSize: "0.78rem",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        transition: "background 0.2s",
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
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  flexShrink: 0,
                  borderTop: `1px solid ${colors.tableBorder}`,
                  background: colors.cardBg,
                }}
              >
                <TablePagination
                  currentPage={currentPage}
                  rowsPerPage={rowsPerPage}
                  totalRecords={totalRecords}
                  totalPages={totalPages}
                  indexOfFirstRow={indexOfFirstRow}
                  indexOfLastRow={indexOfLastRow}
                  onPageChange={setCurrentPage}
                  onRowsPerPageChange={handleRowsPerPageChange}
                  colors={colors}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {detail && (
        <DetailModal
          target={detail}
          onClose={closeDetail}
          colors={colors}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

export default CmdrPage;
