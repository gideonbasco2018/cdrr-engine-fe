// src/components/monitoring/analytics/UserApplicationsModal.jsx
// Opens from a row of the "In Progress per User" modal: lists that user's
// in-progress applications (table) and a per-classification breakdown (chart).
import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { getAllRecords } from "../../../api/monitoring";
import { FB } from "./analyticsConstants";
import { neuCardBg } from "./analyticsHelpers";
import { getUploadReports } from "../../../api/reports";
import { mapDataItem } from "../../reports/utils.js";
import DoctrackModal from "../../reports/actions/DoctrackModal";
import ViewDetailsModal from "../../reports/actions/ViewDetailsModal";
import ApplicationLogsModal from "../../tasks/ApplicationLogsModal";

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const AMBER = "#f59e0b";
const FETCH_PAGE_SIZE = 100; // lower this if the backend caps page_size
const TABLE_PAGE_SIZE = 12;

const CLASS_COLORS = {
  RX: "#4f8ef7",
  OTC: "#f59e0b",
  HR: "#0891b2",
  Vaccine: "#36a420",
};

// The all-records response shape isn't known here, so read common spellings.
const pick = (r, keys) => {
  for (const k of keys)
    if (r[k] !== undefined && r[k] !== null && r[k] !== "") return r[k];
  return null;
};
const getters = {
  dtn: (r) => pick(r, ["dtn", "DTN"]),
  rid: (r) => pick(r, ["db_id", "main_db_id", "id"]),
  drug: (r) =>
    pick(r, ["drugName", "drug_name", "drug", "brand_name", "product_name"]),
  step: (r) => pick(r, ["appStep", "app_step", "step", "application_step"]),
  timeline: (r) => pick(r, ["timeline", "Timeline"]),
  date: (r) => pick(r, ["date", "date_received", "created_at"]),
  cls: (r) =>
    pick(r, [
      "prescription",
      "classification",
      "rx",
      "prescription_type",
      "drug_classification",
    ]),
};

const shortClass = (v) => {
  const s = String(v ?? "").toLowerCase();
  if (!s) return "Unclassified";
  if (s.includes("rx") || s.includes("prescription")) return "RX";
  if (
    s.includes("otc") ||
    s.includes("over-the-counter") ||
    s.includes("over the counter")
  )
    return "OTC";
  if (s.includes("hr") || s.includes("household")) return "HR";
  if (s.includes("vaccine") || s.includes("vax")) return "Vaccine";
  return String(v);
};

const fmtDate = (d) => {
  if (!d) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(String(d))) {
    const dt = new Date(String(d).slice(0, 10) + "T00:00:00");
    if (!isNaN(dt))
      return dt.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
  }
  return String(d);
};

function Donut({ slices, total, ui }) {
  const R = 46;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <svg
      width="132"
      height="132"
      viewBox="0 0 120 120"
      style={{ flexShrink: 0 }}
    >
      <circle
        cx="60"
        cy="60"
        r={R}
        fill="none"
        stroke={ui.progressBg ?? "#3a3b3c"}
        strokeWidth="14"
      />
      {slices.map((s) => {
        const len = (s.value / Math.max(total, 1)) * C;
        const el = (
          <circle
            key={s.name}
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="14"
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 60 60)"
          />
        );
        offset += len;
        return el;
      })}
      <text
        x="60"
        y="58"
        textAnchor="middle"
        fontSize="18"
        fontWeight="800"
        fill={ui.textPrimary}
      >
        {total.toLocaleString()}
      </text>
      <text x="60" y="72" textAnchor="middle" fontSize="7" fill={ui.textMuted}>
        IN PROGRESS
      </text>
    </svg>
  );
}

export default function UserApplicationsModal({ user, ui, darkMode, onClose }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [classFilter, setClassFilter] = useState(null); // e.g. "RX" or null
  const runId = useRef(0);
  const [menu, setMenu] = useState(null); // { row, top, right }
  const [doctrackRow, setDoctrackRow] = useState(null);
  const [logsRow, setLogsRow] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const subOpenRef = useRef(false);
  subOpenRef.current = !!(doctrackRow || logsRow || detail);

  const line = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";

  const load = async () => {
    const id = ++runId.current;
    setLoading(true);
    setError(null);
    try {
      const base = {
        user_id: user.id,
        application_status: "IN PROGRESS",
        page_size: FETCH_PAGE_SIZE,
        sort_col: "date",
        sort_dir: "desc",
      };
      const first = await getAllRecords({ ...base, page: 1 });
      let all = first.data ?? [];
      const pages = first.total_pages ?? 1;
      if (pages > 1) {
        const rest = await Promise.all(
          Array.from({ length: pages - 1 }, (_, i) =>
            getAllRecords({ ...base, page: i + 2 }),
          ),
        );
        rest.forEach((r) => (all = all.concat(r.data ?? [])));
      }
      if (id === runId.current) setRecords(all);
    } catch (err) {
      if (id === runId.current)
        setError(err.message || "Failed to load applications.");
    } finally {
      if (id === runId.current) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user.id]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !subOpenRef.current && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => setPage(1), [search, classFilter]);

  // ── per-classification counts (all of the user's records) ──
  const slices = useMemo(() => {
    const map = new Map();
    records.forEach((r) => {
      const k = shortClass(getters.cls(r));
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return [...map.entries()]
      .map(([name, value]) => ({
        name,
        value,
        color: CLASS_COLORS[name] ?? "#9ca3af",
      }))
      .sort((a, b) => b.value - a.value);
  }, [records]);
  const noClassField =
    records.length > 0 &&
    slices.length === 1 &&
    slices[0].name === "Unclassified";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (classFilter && shortClass(getters.cls(r)) !== classFilter)
        return false;
      if (!q) return true;
      return (
        String(getters.dtn(r) ?? "")
          .toLowerCase()
          .includes(q) ||
        String(getters.drug(r) ?? "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [records, search, classFilter]);

  const totalPages = Math.max(Math.ceil(filtered.length / TABLE_PAGE_SIZE), 1);
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (safePage - 1) * TABLE_PAGE_SIZE,
    safePage * TABLE_PAGE_SIZE,
  );
  const start =
    filtered.length === 0 ? 0 : (safePage - 1) * TABLE_PAGE_SIZE + 1;
  const end = Math.min(safePage * TABLE_PAGE_SIZE, filtered.length);

  // colors object expected by the shared Records modals
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

  // Load the full record (same shape the Records page uses); fall back to the
  // few fields we already have if it can't be found.
  const openDetails = async (r) => {
    const dtn = getters.dtn(r);
    setDetail({ dtn, prodBrName: getters.drug(r), appStep: getters.step(r) });
    setDetailLoading(true);
    try {
      const res = await getUploadReports({
        page: 1,
        pageSize: 20,
        search: "",
        status: "",
        sortBy: "DB_DATE_EXCEL_UPLOAD",
        sortOrder: "desc",
        dtn: parseInt(dtn, 10),
      });
      const list = (res?.data ?? []).map(mapDataItem);
      const id = getters.rid(r);
      const full =
        (id != null && list.find((x) => String(x.id) === String(id))) ||
        list[0];
      if (full) setDetail(full);
    } catch (err) {
      console.error("Load full record failed:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const th = {
    padding: "8px 10px",
    textAlign: "left",
    fontSize: "0.65rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
    borderBottom: `1px solid ${line}`,
    whiteSpace: "nowrap",
    background: neuCardBg(darkMode),
    position: "sticky",
    top: 0,
    zIndex: 1,
  };
  const td = {
    padding: "8px 10px",
    fontSize: "0.78rem",
    color: ui.textPrimary,
    borderBottom: `1px solid ${line}`,
    whiteSpace: "nowrap",
  };
  const pageBtn = (disabled) => ({
    padding: "4px 12px",
    fontSize: "0.75rem",
    borderRadius: 8,
    border: `1px solid ${line}`,
    background: "transparent",
    color: ui.textPrimary,
    fontFamily: font,
    opacity: disabled ? 0.35 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  });

  return createPortal(
    <div
      onClick={(e) => {
        e.stopPropagation(); // React bubbles portal events to the parent modal
        onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          setMenu(null);
        }}
        style={{
          width: "min(980px, 100%)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          background: neuCardBg(darkMode),
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          fontFamily: font,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 18px",
            borderBottom: `1px solid ${line}`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              {user.name}
            </div>
            <div style={{ fontSize: "0.72rem", color: ui.textMuted }}>
              {loading
                ? "Loading applications…"
                : `${records.length.toLocaleString()} in-progress application${records.length !== 1 ? "s" : ""}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search DTN or drug…"
              autoComplete="off"
              style={{
                background: neuCardBg(darkMode),
                border: `1px solid ${line}`,
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: "0.78rem",
                color: ui.textPrimary,
                outline: "none",
                width: 190,
                fontFamily: font,
                colorScheme: darkMode ? "dark" : "light",
              }}
            />
            <button
              onClick={onClose}
              title="Close (Esc)"
              style={{
                ...pageBtn(false),
                fontSize: "0.9rem",
                padding: "4px 10px",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {loading ? (
            <div
              style={{
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 30,
                    borderRadius: 8,
                    background: darkMode
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.06)",
                    opacity: 1 - i * 0.08,
                  }}
                />
              ))}
            </div>
          ) : error ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "#e02020",
                fontSize: "0.85rem",
              }}
            >
              ⚠️ {error}{" "}
              <button
                onClick={load}
                style={{
                  background: "none",
                  border: "none",
                  color: FB,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontFamily: font,
                }}
              >
                Retry
              </button>
            </div>
          ) : records.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: ui.textMuted,
                fontSize: "0.85rem",
              }}
            >
              No in-progress applications.
            </div>
          ) : (
            <>
              {/* Classification chart */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  flexWrap: "wrap",
                  padding: "16px 18px",
                  borderBottom: `1px solid ${line}`,
                }}
              >
                <Donut slices={slices} total={records.length} ui={ui} />
                <div
                  style={{
                    flex: 1,
                    minWidth: 260,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: ui.textMuted,
                      }}
                    >
                      By classification
                      {!classFilter && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontWeight: 400,
                            textTransform: "none",
                            letterSpacing: 0,
                          }}
                        >
                          · click to filter
                        </span>
                      )}
                    </span>
                    {classFilter && (
                      <button
                        onClick={() => setClassFilter(null)}
                        style={{
                          ...pageBtn(false),
                          fontSize: "0.7rem",
                          padding: "3px 10px",
                        }}
                      >
                        ✕ Clear filter
                      </button>
                    )}
                  </div>
                  {slices.map((s) => {
                    const p = (s.value / records.length) * 100;
                    return (
                      <div
                        key={s.name}
                        onClick={() =>
                          setClassFilter(classFilter === s.name ? null : s.name)
                        }
                        title={
                          classFilter === s.name
                            ? "Click to clear filter"
                            : `Show only ${s.name}`
                        }
                        style={{
                          cursor: "pointer",
                          padding: "4px 8px",
                          margin: "-4px -8px",
                          borderRadius: 8,
                          background:
                            classFilter === s.name
                              ? `${s.color}18`
                              : "transparent",
                          opacity:
                            classFilter && classFilter !== s.name ? 0.4 : 1,
                          transition: "all 0.15s",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.78rem",
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ color: s.color, fontWeight: 700 }}>
                            {s.name}
                          </span>
                          <span
                            style={{ color: ui.textPrimary, fontWeight: 700 }}
                          >
                            {s.value.toLocaleString()}{" "}
                            <span
                              style={{ color: ui.textMuted, fontWeight: 400 }}
                            >
                              ({p.toFixed(1)}%)
                            </span>
                          </span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            borderRadius: 99,
                            overflow: "hidden",
                            background: darkMode
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(0,0,0,0.08)",
                          }}
                        >
                          <div
                            style={{
                              width: `${p}%`,
                              height: "100%",
                              background: s.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {noClassField && (
                    <div style={{ fontSize: "0.7rem", color: ui.textMuted }}>
                      Classification isn't included in the records response, so
                      everything shows as "Unclassified".
                    </div>
                  )}
                </div>
              </div>

              {/* Active filter bar */}
              {classFilter && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "8px 18px",
                    borderBottom: `1px solid ${line}`,
                    fontSize: "0.76rem",
                    color: ui.textMuted,
                  }}
                >
                  <span>
                    Showing only{" "}
                    <b
                      style={{
                        color: CLASS_COLORS[classFilter] ?? ui.textPrimary,
                      }}
                    >
                      {classFilter}
                    </b>{" "}
                    · {filtered.length.toLocaleString()} application
                    {filtered.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={() => setClassFilter(null)}
                    style={{
                      ...pageBtn(false),
                      fontSize: "0.7rem",
                      padding: "3px 10px",
                    }}
                  >
                    ✕ Clear filter
                  </button>
                </div>
              )}

              {/* Applications table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "center" }}>#</th>
                      <th style={th}>DTN</th>
                      <th style={th}>Drug / Application</th>
                      <th style={th}>Class</th>
                      <th style={th}>App Step</th>
                      <th style={th}>Timeline</th>
                      <th style={th}>Date</th>
                      <th
                        style={{
                          ...th,
                          right: 0,
                          zIndex: 3,
                          textAlign: "center",
                          boxShadow: "-6px 0 8px -6px rgba(0,0,0,0.35)",
                        }}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            ...td,
                            textAlign: "center",
                            color: ui.textMuted,
                            padding: 30,
                          }}
                        >
                          No applications match your search.
                        </td>
                      </tr>
                    ) : (
                      paged.map((r, i) => {
                        const tl = getters.timeline(r);
                        const tlColor = String(tl)
                          .toLowerCase()
                          .startsWith("beyond")
                          ? "#e02020"
                          : "#36a420";
                        const cls = shortClass(getters.cls(r));
                        return (
                          <tr key={`${getters.dtn(r)}-${i}`}>
                            <td
                              style={{
                                ...td,
                                textAlign: "center",
                                color: ui.textMuted,
                              }}
                            >
                              {(safePage - 1) * TABLE_PAGE_SIZE + i + 1}
                            </td>
                            <td style={{ ...td, fontWeight: 700 }}>
                              {getters.dtn(r) ? (
                                <span
                                  onClick={() => setDoctrackRow(r)}
                                  title="View document tracking"
                                  style={{
                                    cursor: "pointer",
                                    color: FB,
                                    textDecoration: "underline dotted",
                                    textUnderlineOffset: 3,
                                  }}
                                >
                                  {getters.dtn(r)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td
                              style={{
                                ...td,
                                maxWidth: 320,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={getters.drug(r) ?? ""}
                            >
                              {getters.drug(r) ?? "—"}
                            </td>
                            <td style={td}>
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: 99,
                                  color: CLASS_COLORS[cls] ?? ui.textMuted,
                                  background: `${CLASS_COLORS[cls] ?? "#9ca3af"}22`,
                                }}
                              >
                                {cls}
                              </span>
                            </td>
                            <td style={td}>{getters.step(r) ?? "—"}</td>
                            <td style={td}>
                              {tl ? (
                                <span
                                  style={{
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    padding: "2px 8px",
                                    borderRadius: 99,
                                    color: tlColor,
                                    background: `${tlColor}22`,
                                  }}
                                >
                                  {tl}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td
                              style={{
                                ...td,
                                color: ui.textSub ?? ui.textPrimary,
                              }}
                            >
                              {fmtDate(getters.date(r))}
                            </td>
                            <td
                              style={{
                                ...td,
                                position: "sticky",
                                right: 0,
                                zIndex: 2,
                                textAlign: "center",
                                background: neuCardBg(darkMode),
                                boxShadow: "-6px 0 8px -6px rgba(0,0,0,0.35)",
                              }}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect =
                                    e.currentTarget.getBoundingClientRect();
                                  setMenu({
                                    row: r,
                                    top: rect.bottom + 4,
                                    right: window.innerWidth - rect.right,
                                  });
                                }}
                                style={{
                                  ...pageBtn(false),
                                  padding: "3px 10px",
                                }}
                              >
                                Actions ▾
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && records.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 18px",
              borderTop: `1px solid ${line}`,
            }}
          >
            <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
              {start}–{end} of {filtered.length.toLocaleString()}
              {filtered.length !== records.length
                ? ` (filtered from ${records.length.toLocaleString()})`
                : ""}
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                style={pageBtn(safePage === 1)}
                disabled={safePage === 1}
                onClick={() => setPage(safePage - 1)}
              >
                ‹ Prev
              </button>
              <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
                Page {safePage} / {totalPages}
              </span>
              <button
                style={pageBtn(safePage >= totalPages)}
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>

      {menu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: menu.top,
            right: menu.right,
            zIndex: 1150,
            minWidth: 190,
            background: neuCardBg(darkMode),
            border: `1px solid ${line}`,
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
            padding: 4,
            fontFamily: font,
          }}
        >
          {[
            { label: "👁 View Details", run: () => openDetails(menu.row) },
            {
              label: "🗂 Document Tracking",
              run: () => setDoctrackRow(menu.row),
            },
            {
              label: "📋 View Application Logs",
              run: () => setLogsRow(menu.row),
            },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                const run = item.run;
                setMenu(null);
                run();
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "7px 12px",
                fontSize: "0.78rem",
                fontWeight: 600,
                border: "none",
                borderRadius: 8,
                background: "transparent",
                color: ui.textPrimary,
                cursor: "pointer",
                fontFamily: font,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = darkMode
                  ? "rgba(255,255,255,0.07)"
                  : "rgba(0,0,0,0.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Sub-modals. The wrapper stops their clicks from bubbling up and closing this modal. */}
      <div onClick={(e) => e.stopPropagation()}>
        {doctrackRow && (
          <DoctrackModal
            record={{ dtn: getters.dtn(doctrackRow) }}
            onClose={() => setDoctrackRow(null)}
            colors={colors}
          />
        )}
        {logsRow && (
          <ApplicationLogsModal
            record={{
              dtn: getters.dtn(logsRow),
              mainDbId: getters.rid(logsRow),
            }}
            onClose={() => setLogsRow(null)}
            colors={colors}
            darkMode={darkMode}
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
      </div>
    </div>,
    document.body,
  );
}
