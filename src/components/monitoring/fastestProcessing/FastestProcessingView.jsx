// src/components/monitoring/fastestProcessing/FastestProcessingView.jsx
import { useState, useEffect, useRef } from "react";

import "../analytics/analyticsAnimations";
import { FB, MONTHS } from "../analytics/analyticsConstants";
import {
  neuCardBg,
  neuShadow,
  neuInputShadow,
} from "../analytics/analyticsHelpers";
import { SectionCard } from "../analytics/SectionCard";
import { SkeletonBox } from "../analytics/SkeletonComponents";
import {
  getAnalyticsFastestApplications,
  getAnalyticsFastestCompanies,
} from "../../../api/analytics";
import { YearRecordsModal } from "../analytics/AnalyticsView";
import DoctrackModal from "../../reports/actions/DoctrackModal";
import ViewDetailsModal from "../../reports/actions/ViewDetailsModal";
import ApplicationLogsModal from "../../tasks/ApplicationLogsModal";

import { createPortal } from "react-dom";
import { getUploadReports } from "../../../api/reports";
import { mapDataItem } from "../../reports/utils.js";

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const YEARS = ["2026", "2025"];
const TOP_OPTIONS = [10, 20, 50];
const MIN_OPTIONS = [1, 3, 5, 10];
const CPR_COLOR = "#36a420";
const CERT_COLOR = "#9333ea";

const evLabel = (ev) =>
  !ev || ev.unassigned
    ? "Unassigned"
    : ev.full_name
      ? `${ev.code} — ${ev.full_name}`
      : ev.code;

function RowActions({ row, items, darkMode, ui }) {
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  const toggle = (e) => {
    e.stopPropagation();
    if (pos) return setPos(null);
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: Math.max(8, r.right - 210) });
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        title="Actions"
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: "1rem",
          fontWeight: 800,
          lineHeight: 1,
          padding: "2px 8px",
          color: ui.textPrimary,
        }}
      >
        ⋮
      </button>
      {pos &&
        createPortal(
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 10000,
              minWidth: 210,
              padding: 6,
              borderRadius: 10,
              background: darkMode ? "#1e1e1e" : "#ffffff",
              border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            }}
          >
            {items.map((it) => (
              <div
                key={it.label}
                onClick={() => {
                  setPos(null);
                  it.onClick(row);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: ui.textPrimary,
                  textAlign: "left",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = darkMode
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <span>{it.icon}</span>
                <span>{it.label}</span>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
function MultiSelect({
  options,
  selected,
  onChange,
  getLabel,
  darkMode,
  ui,
  style,
}) {
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onScroll = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      setPos(null);
    };
    window.addEventListener("click", close);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  const toggleOpen = (e) => {
    e.stopPropagation();
    if (pos) return setPos(null);
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: Math.max(8, r.right - 260) });
  };

  const toggleItem = (key) =>
    onChange(
      selected.includes(key)
        ? selected.filter((k) => k !== key)
        : [...selected, key],
    );

  const summary =
    selected.length === 0
      ? "All"
      : selected.length === 1
        ? getLabel(selected[0])
        : `${selected.length} selected`;

  const hoverBg = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggleOpen}
        style={{
          ...style,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          textAlign: "left",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {summary}
        </span>
        <span style={{ fontSize: "0.6rem" }}>▾</span>
      </button>
      {pos &&
        createPortal(
          <div
            ref={panelRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 10000,
              width: 260,
              maxHeight: 320,
              overflowY: "auto",
              padding: 6,
              borderRadius: 10,
              background: darkMode ? "#1e1e1e" : "#ffffff",
              border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            }}
          >
            <div
              onClick={() => onChange([])}
              style={{
                padding: "6px 10px",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: ui.textMuted,
                cursor: "pointer",
                borderRadius: 8,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              Clear (show all)
            </div>
            {options.map((o) => (
              <label
                key={o.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  color: ui.textPrimary,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = hoverBg)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o.key)}
                  onChange={() => toggleItem(o.key)}
                />
                <span style={{ flex: 1 }}>{getLabel(o.key)}</span>
                <span style={{ color: ui.textMuted, fontWeight: 500 }}>
                  {o.count.toLocaleString()}
                </span>
              </label>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

export default function FastestProcessingView({ ui, darkMode }) {
  const [year, setYear] = useState("2026");
  const [month, setMonth] = useState("All");
  const [top, setTop] = useState(10);
  const [doc, setDoc] = useState("cpr");
  const [minApps, setMinApps] = useState(3);

  const [apps, setApps] = useState(null);
  const [loadingA, setLoadingA] = useState(true);
  const [errA, setErrA] = useState("");

  const [cos, setCos] = useState(null);
  const [loadingC, setLoadingC] = useState(true);
  const [errC, setErrC] = useState("");
  const [open, setOpen] = useState({});

  const [target, setTarget] = useState(null);
  const [entry, setEntry] = useState("All");
  const [appTypes, setAppTypes] = useState([]); // empty = all
  const appTypesKey = appTypes.join("|");
  const [doctrackRow, setDoctrackRow] = useState(null);
  const [detailsRow, setDetailsRow] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [logsRow, setLogsRow] = useState(null);

  // Load the FULL record (same shape the Records page uses)
  const openDetails = async (r) => {
    if (!r.dtn) {
      alert("This record has no DTN, so it cannot be loaded.");
      return;
    }
    setDetail({ dtn: r.dtn });
    setDetailLoading(true);
    try {
      const res = await getUploadReports({
        page: 1,
        pageSize: 20,
        search: "",
        status: "",
        sortBy: "DB_DATE_EXCEL_UPLOAD",
        sortOrder: "desc",
        dtn: parseInt(r.dtn, 10),
      });
      const match = (res?.data ?? [])
        .map(mapDataItem)
        .find((x) => String(x.id) === String(r.db_id));
      if (!match) throw new Error("Full record not found.");
      setDetail(match);
    } catch (err) {
      console.error("Load full record failed:", err);
      setDetail(null);
      alert(`Could not load the record.\n${err.message}`);
    } finally {
      setDetailLoading(false);
    }
  };

  const rowActions = [
    { icon: "👁", label: "View Details", onClick: (r) => openDetails(r) },
    {
      icon: "📋",
      label: "View Application Logs",
      onClick: (r) => setLogsRow(r),
    },
  ];

  const idA = useRef(0);
  const idC = useRef(0);

  const line = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";

  useEffect(() => {
    const id = ++idA.current;
    setLoadingA(true);
    setErrA("");
    getAnalyticsFastestApplications({
      year,
      month,
      top,
      doc,
      entry_type: entry === "All" ? undefined : entry,
      app_type: appTypesKey || undefined,
    })
      .then((r) => id === idA.current && setApps(r))
      .catch((err) => {
        console.error("Fastest applications error:", err);
        if (id === idA.current) setErrA("Failed to load data.");
      })
      .finally(() => id === idA.current && setLoadingA(false));
  }, [year, month, top, doc, entry, appTypesKey]);

  useEffect(() => {
    const id = ++idC.current;
    setLoadingC(true);
    setErrC("");
    getAnalyticsFastestCompanies({ year, month, top, min_apps: minApps })
      .then((r) => {
        if (id !== idC.current) return;
        setCos(r);
        setOpen({});
      })
      .catch((err) => {
        console.error("Fastest companies error:", err);
        if (id === idC.current) setErrC("Failed to load data.");
      })
      .finally(() => id === idC.current && setLoadingC(false));
  }, [year, month, top, minApps]);

  const periodLabel =
    month === "All" ? year : `${MONTHS[Number(month) - 1] ?? month} ${year}`;
  const docLabel = { cpr: "CPR", cert: "Cert", both: "CPR + Cert" }[doc];

  const entryLabel = (k) => (k === "__REGULAR__" ? "Regular Application" : k);
  const appTypeLabel = (k) => (k === "__NONE__" ? "No Application Type" : k);
  const appTypeList = apps?.app_types ?? [];
  // keep selected options visible even if their count dropped to 0
  const appTypeOptions = [
    ...appTypeList,
    ...appTypes
      .filter((k) => !appTypeList.some((x) => x.key === k))
      .map((k) => ({ key: k, count: 0 })),
  ];
  const entryList = apps?.entry_types ?? [];
  // keep the selected option visible even if its count dropped to 0
  const entryOptions =
    entry !== "All" && !entryList.some((x) => x.key === entry)
      ? [...entryList, { key: entry, count: 0 }]
      : entryList;

  const colors = {
    cardBg: neuCardBg(darkMode),
    cardBorder: line,
    tableBg: darkMode ? "#222222" : "#f7f8fa",
    tableRowHover: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
    inputBg: darkMode ? "#222222" : "#f7f8fa",
    badgeBg: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    textPrimary: ui.textPrimary,
    textSecondary: ui.textSub ?? ui.textPrimary,
    textTertiary: ui.textMuted,
  };
  // Open the applications behind a number. company=undefined -> all companies,
  // ev=null -> all evaluators. kind: "cpr" | "cert" | "both"
  const openRecords = ({
    company,
    ev = null,
    kind = "both",
    entryType,
    appType,
  }) => {
    const docName = { cpr: "CPR", cert: "Cert", both: "CPR + Cert" }[kind];
    setTarget({
      title: [company, docName, ev ? evLabel(ev) : null, periodLabel]
        .filter(Boolean)
        .join(" · "),
      fastest: {
        year,
        month,
        doc: kind,
        entry_type: entryType,
        app_type: appType,
        company,
        user_id: !ev ? undefined : ev.unassigned ? "none" : String(ev.user_id),
      },
    });
  };

  const linkSt = {
    cursor: "pointer",
    textDecoration: "underline dotted",
    textUnderlineOffset: 3,
  };
  const numLink = (n, onClick, color) =>
    n > 0 ? (
      <span
        onClick={onClick}
        title="Click to view applications"
        style={{ ...linkSt, color, fontWeight: 700 }}
      >
        {n}
      </span>
    ) : (
      <span style={{ color, fontWeight: 700 }}>{n}</span>
    );
  const linkChip = (color, text, onClick, enabled = true) => (
    <span
      onClick={
        enabled
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
      title={enabled ? "Click to view applications" : undefined}
      style={{ ...chip(color), ...(enabled ? linkSt : {}) }}
    >
      {text}
    </span>
  );
  const inputSt = {
    background: neuCardBg(darkMode),
    border: "none",
    borderRadius: 10,
    padding: "7px 12px",
    fontSize: "0.8rem",
    color: ui.textPrimary,
    outline: "none",
    boxShadow: neuInputShadow(darkMode),
    colorScheme: darkMode ? "dark" : "light",
    fontFamily: font,
  };
  const btn = (active) => ({
    padding: "5px 12px",
    fontSize: "0.72rem",
    fontWeight: active ? 700 : 500,
    borderRadius: 10,
    border: "none",
    background: neuCardBg(darkMode),
    color: active ? FB : ui.textMuted,
    cursor: "pointer",
    fontFamily: font,
    boxShadow: neuShadow(darkMode, !active),
    transition: "all 0.2s ease",
  });
  const label = {
    margin: "0 0 4px",
    fontSize: "0.65rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
  };
  const seg = {
    display: "flex",
    background: neuCardBg(darkMode),
    borderRadius: 12,
    padding: 4,
    gap: 3,
    boxShadow: neuShadow(darkMode, false),
  };
  const th = {
    padding: "8px 10px",
    textAlign: "center",
    fontSize: "0.63rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
    border: `1px solid ${line}`,
    whiteSpace: "nowrap",
    background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
  };
  const td = {
    padding: "9px 10px",
    textAlign: "center",
    fontSize: "0.78rem",
    fontWeight: 500,
    color: ui.textPrimary,
    border: `1px solid ${line}`,
    whiteSpace: "nowrap",
  };
  const chip = (color) => ({
    fontSize: "0.65rem",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 99,
    color,
    background: `${color}22`,
    whiteSpace: "nowrap",
  });
  const rankColor = (r) => (r <= 3 ? "#f59e0b" : ui.textMuted);
  const rows = (n) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: n }).map((_, i) => (
        <SkeletonBox
          key={i}
          width="100%"
          height={38}
          radius={10}
          darkMode={darkMode}
          style={{ opacity: 1 - i * 0.08 }}
        />
      ))}
    </div>
  );
  const empty = (t) => (
    <div
      style={{
        textAlign: "center",
        color: ui.textMuted,
        fontSize: "0.85rem",
        padding: 30,
      }}
    >
      {t}
    </div>
  );
  const tile = (t) => (
    <div
      key={t.label}
      onClick={t.onClick}
      title={t.onClick ? "Click to view applications" : undefined}
      style={{
        cursor: t.onClick ? "pointer" : "default",
        padding: "10px 14px",
        borderRadius: 12,
        background: neuCardBg(darkMode),
        boxShadow: neuShadow(darkMode),
        borderTop: `2px solid ${t.color}`,
      }}
    >
      <div
        style={{
          fontSize: "0.62rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: ui.textMuted,
        }}
      >
        {t.label}
      </div>
      <div
        style={{
          fontSize: "1.3rem",
          fontWeight: 800,
          color: t.color,
          margin: "3px 0 1px",
        }}
      >
        {t.value}
      </div>
      <div style={{ fontSize: "0.62rem", color: ui.textMuted }}>{t.sub}</div>
    </div>
  );

  const cData = cos?.data ?? [];
  const allOpen = cData.length > 0 && cData.every((c) => open[c.rank]);
  const fmt = (v, suffix = "") =>
    v === null || v === undefined ? "—" : `${v}${suffix}`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: font,
        padding: 16,
      }}
    >
      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p style={label}>Year</p>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{ ...inputSt, minWidth: 90 }}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p style={label}>Month (released)</p>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ ...inputSt, minWidth: 120 }}
          >
            <option value="All">All Months</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p style={label}>Show</p>
          <div style={seg}>
            {TOP_OPTIONS.map((n) => (
              <button key={n} onClick={() => setTop(n)} style={btn(top === n)}>
                Top {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p style={label}>Companies: min. apps</p>
          <div style={seg}>
            {MIN_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setMinApps(n)}
                style={btn(minApps === n)}
              >
                {n}+
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 10,
        }}
      >
        {[
          {
            label: `${docLabel} released`,
            value: (apps?.total ?? 0).toLocaleString(),
            sub: `in ${periodLabel}`,
            color: FB,
            onClick:
              (apps?.total ?? 0) > 0
                ? () =>
                    openRecords({
                      kind: doc,
                      entryType: entry === "All" ? undefined : entry,
                      appType: appTypesKey || undefined,
                    })
                : undefined,
          },
          {
            label: "Average processing",
            value: fmt(apps?.avg_days, " days"),
            sub: `${docLabel}, working days`,
            color: "#0891b2",
          },
          {
            label: "Fastest",
            value: fmt(apps?.fastest_days, " days"),
            sub: `${docLabel}, working days`,
            color: CPR_COLOR,
          },
          {
            label: "Companies ranked",
            value: (cos?.total_companies ?? 0).toLocaleString(),
            sub: `${cos?.min_apps ?? minApps}+ CPR/Cert apps`,
            color: CERT_COLOR,
          },
        ].map(tile)}
      </div>

      {/* Fastest applications */}
      <SectionCard
        title={`Fastest ${docLabel} applications — ${periodLabel}`}
        subtitle="Shortest processing time, Date Received to Date Released (working days)"
        icon="⚡"
        ui={ui}
        darkMode={darkMode}
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...label, margin: 0 }}>Entry Type</span>
            <select
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              style={{
                ...inputSt,
                padding: "5px 10px",
                fontSize: "0.75rem",
                maxWidth: 200,
              }}
            >
              <option value="All">All</option>
              {entryOptions.map((x) => (
                <option key={x.key} value={x.key}>
                  {entryLabel(x.key)} ({x.count.toLocaleString()})
                </option>
              ))}
            </select>
            <span style={{ ...label, margin: 0 }}>App Type</span>
            <MultiSelect
              options={appTypeOptions}
              selected={appTypes}
              onChange={setAppTypes}
              getLabel={appTypeLabel}
              darkMode={darkMode}
              ui={ui}
              style={{
                ...inputSt,
                padding: "5px 10px",
                fontSize: "0.75rem",
                width: 170,
              }}
            />
            <div style={seg}>
              {[
                { key: "cpr", label: "CPR" },
                { key: "cert", label: "Cert" },
                { key: "both", label: "Both" },
              ].map(({ key, label: l }) => (
                <button
                  key={key}
                  onClick={() => setDoc(key)}
                  style={btn(doc === key)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        }
      >
        {loadingA && !apps ? (
          rows(8)
        ) : errA ? (
          empty(errA)
        ) : (apps?.data ?? []).length === 0 ? (
          empty(
            `No ${docLabel} released in ${periodLabel}${entry !== "All" ? ` with entry type "${entryLabel(entry)}"` : ""}`,
          )
        ) : (
          <div
            style={{
              overflowX: "auto",
              opacity: loadingA ? 0.5 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.8rem",
              }}
            >
              <thead>
                <tr>
                  {[
                    "#",
                    "DTN",
                    "Entry Type",
                    "Company",
                    "Brand / Generic",
                    "Doc",
                    "Date Received",
                    "Date Released",
                    "Working Days",
                    "Evaluator",
                    "Actions",
                  ].map((h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apps.data.map((r) => (
                  <tr key={r.db_id}>
                    <td
                      style={{
                        ...td,
                        fontWeight: 800,
                        color: rankColor(r.rank),
                      }}
                    >
                      {r.rank}
                    </td>
                    <td style={td}>
                      {r.dtn ? (
                        <span
                          onClick={() => setDoctrackRow(r)}
                          title="View document tracking"
                          style={{
                            cursor: "pointer",
                            color: FB,
                            fontWeight: 700,
                            textDecoration: "underline dotted",
                            textUnderlineOffset: 3,
                          }}
                        >
                          {r.dtn}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={td}>{r.entry_type ?? "—"}</td>
                    <td
                      style={{
                        ...td,
                        textAlign: "left",
                        maxWidth: 260,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={r.company}
                    >
                      {r.company || "—"}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: "left",
                        maxWidth: 260,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={`${r.brand ?? ""} / ${r.generic ?? ""}`}
                    >
                      <b>{r.brand ?? "—"}</b>
                      <span style={{ color: ui.textMuted }}>
                        {r.generic ? ` / ${r.generic}` : ""}
                      </span>
                    </td>
                    <td style={td}>
                      <span
                        style={chip(
                          /cert/i.test(r.doc ?? "") ? CERT_COLOR : CPR_COLOR,
                        )}
                      >
                        {r.doc ?? "—"}
                      </span>
                    </td>
                    <td style={td}>{r.received ?? "—"}</td>
                    <td style={td}>{r.released ?? "—"}</td>
                    <td
                      style={{
                        ...td,
                        fontWeight: 800,
                        color: CPR_COLOR,
                        fontSize: "0.85rem",
                      }}
                    >
                      {r.days}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: "left",
                        color: r.evaluator.unassigned
                          ? ui.textMuted
                          : ui.textPrimary,
                        fontStyle: r.evaluator.unassigned ? "italic" : "normal",
                      }}
                    >
                      {evLabel(r.evaluator)}
                    </td>
                    <td style={td}>
                      <RowActions
                        row={r}
                        items={rowActions}
                        darkMode={darkMode}
                        ui={ui}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div
          style={{
            marginTop: 14,
            paddingTop: 10,
            borderTop: `1px solid ${line}`,
            fontSize: "0.68rem",
            lineHeight: 1.6,
            color: ui.textMuted,
          }}
        >
          <b style={{ color: ui.textPrimary }}>How it is counted:</b> processing
          time = working days (Mon–Fri, holidays not excluded) from Date
          Received (Center) to Date Released. The month is the release month.
          Ties are ordered by the earlier release date. The evaluator is the
          user on the Quality Evaluation step (rerouted counted, reassigned
          skipped).
        </div>
      </SectionCard>

      {/* Fastest companies */}
      <SectionCard
        title={`Fastest companies (CPR + Cert) — ${periodLabel}`}
        subtitle={`Lowest average processing time, companies with ${minApps}+ applications`}
        icon="🏢"
        ui={ui}
        darkMode={darkMode}
        action={
          <button
            onClick={() =>
              setOpen(
                allOpen
                  ? {}
                  : Object.fromEntries(cData.map((c) => [c.rank, true])),
              )
            }
            disabled={cData.length === 0}
            style={{ ...btn(false), opacity: cData.length === 0 ? 0.4 : 1 }}
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        }
      >
        {loadingC && !cos ? (
          rows(8)
        ) : errC ? (
          empty(errC)
        ) : cData.length === 0 ? (
          empty(
            `No company has ${minApps}+ CPR/Cert applications in ${periodLabel}`,
          )
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              opacity: loadingC ? 0.5 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {cData.map((c) => {
              const isOpen = !!open[c.rank];
              return (
                <div
                  key={c.rank}
                  style={{
                    border: `1px solid ${line}`,
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <div
                    onClick={() =>
                      setOpen((o) => ({ ...o, [c.rank]: !o[c.rank] }))
                    }
                    style={{
                      display: "grid",
                      gridTemplateColumns: "36px 1fr 130px 230px 18px",
                      gap: 10,
                      alignItems: "center",
                      padding: "10px 14px",
                      cursor: "pointer",
                      background: isOpen
                        ? darkMode
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.03)"
                        : "transparent",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 800,
                        color: rankColor(c.rank),
                      }}
                    >
                      {c.rank}.
                    </span>
                    <span
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: ui.textPrimary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={c.company}
                    >
                      {c.company}
                    </span>
                    <span style={{ textAlign: "right" }}>
                      <b
                        style={{
                          fontSize: "0.95rem",
                          color: CPR_COLOR,
                        }}
                      >
                        {c.avg_days}
                      </b>{" "}
                      <span
                        style={{ fontSize: "0.62rem", color: ui.textMuted }}
                      >
                        avg days
                      </span>
                    </span>
                    <span
                      style={{
                        display: "flex",
                        gap: 6,
                        justifyContent: "flex-end",
                        flexWrap: "wrap",
                      }}
                    >
                      {linkChip(FB, `${c.count} apps`, () =>
                        openRecords({ company: c.company, kind: "both" }),
                      )}
                      {linkChip(
                        CPR_COLOR,
                        `CPR ${c.cpr}`,
                        () => openRecords({ company: c.company, kind: "cpr" }),
                        c.cpr > 0,
                      )}
                      {linkChip(
                        CERT_COLOR,
                        `Cert ${c.cert}`,
                        () => openRecords({ company: c.company, kind: "cert" }),
                        c.cert > 0,
                      )}
                    </span>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        color: ui.textMuted,
                        transform: isOpen ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s",
                      }}
                    >
                      ▾
                    </span>
                  </div>

                  {isOpen && (
                    <div
                      style={{
                        padding: "8px 14px 12px 50px",
                        borderTop: `1px solid ${line}`,
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "minmax(200px, 1fr) 70px 70px 70px 90px",
                          gap: 10,
                          padding: "4px 8px 6px",
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: ui.textMuted,
                          textAlign: "right",
                        }}
                      >
                        <span style={{ textAlign: "left" }}>Evaluator</span>
                        <span>CPR</span>
                        <span>Cert</span>
                        <span>Apps</span>
                        <span>Avg days</span>
                      </div>
                      {c.evaluators.map((ev) => (
                        <div
                          key={ev.user_id ?? "none"}
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "minmax(200px, 1fr) 70px 70px 70px 90px",
                            gap: 10,
                            padding: "5px 8px",
                            fontSize: "0.76rem",
                            alignItems: "center",
                            textAlign: "right",
                          }}
                        >
                          <span
                            onClick={() =>
                              openRecords({
                                company: c.company,
                                ev,
                                kind: "both",
                              })
                            }
                            title="Click to view applications"
                            style={{
                              ...linkSt,
                              textAlign: "left",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontStyle: ev.unassigned ? "italic" : "normal",
                              color: ev.unassigned
                                ? ui.textMuted
                                : ui.textPrimary,
                              fontWeight: 600,
                            }}
                          >
                            {evLabel(ev)}
                          </span>
                          {numLink(
                            ev.cpr,
                            () =>
                              openRecords({
                                company: c.company,
                                ev,
                                kind: "cpr",
                              }),
                            CPR_COLOR,
                          )}
                          {numLink(
                            ev.cert,
                            () =>
                              openRecords({
                                company: c.company,
                                ev,
                                kind: "cert",
                              }),
                            CERT_COLOR,
                          )}
                          {numLink(
                            ev.count,
                            () =>
                              openRecords({
                                company: c.company,
                                ev,
                                kind: "both",
                              }),
                            ui.textPrimary,
                          )}
                          <span style={{ fontWeight: 700, color: CPR_COLOR }}>
                            {fmt(ev.avg_days)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div
          style={{
            marginTop: 14,
            paddingTop: 10,
            borderTop: `1px solid ${line}`,
            fontSize: "0.68rem",
            lineHeight: 1.6,
            color: ui.textMuted,
          }}
        >
          <b style={{ color: ui.textPrimary }}>How it is counted:</b> companies
          are ranked by the average working days of their CPR and Cert released
          in the period (company name = LTO company, same names combined). Only
          companies with at least {minApps} application
          {minApps > 1 ? "s" : ""} are ranked. The evaluator rows show each
          evaluator's share of that company's CPR/Cert and their own average.
        </div>
      </SectionCard>
      {doctrackRow && (
        <DoctrackModal
          record={{ dtn: doctrackRow.dtn }}
          onClose={() => setDoctrackRow(null)}
          colors={colors}
        />
      )}

      {detail && (
        <ViewDetailsModal
          record={detail}
          loading={detailLoading}
          onClose={() => setDetail(null)}
          colors={colors}
          darkMode={darkMode}
        />
      )}
      {logsRow && (
        <ApplicationLogsModal
          record={{ dtn: logsRow.dtn, mainDbId: logsRow.db_id }}
          onClose={() => setLogsRow(null)}
          colors={colors}
          darkMode={darkMode}
        />
      )}
      {target && (
        <YearRecordsModal
          target={target}
          basis="released"
          ui={ui}
          darkMode={darkMode}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
}
