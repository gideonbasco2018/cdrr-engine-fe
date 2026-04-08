import { useState, useRef, useCallback, useEffect } from "react";
import { getCurrentUser } from "../api/auth";
import {
  uploadDoctrackExcel,
  saveUploadHistory,
  getUploadHistoryList,
  getHistoryRecords,
  getUploadHistoryById,
  downloadDoctrackTemplate,
} from "../api/doctrack";
import DoctrackModal from "../components/reports/actions/DoctrackModal";

// ── RESPONSIVE HOOK ───────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

function formatBytes(b) {
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / (1024 * 1024)).toFixed(1) + " MB";
}
function timeAgo(iso) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000),
    h = Math.floor(d / 3600000),
    dy = Math.floor(d / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (dy < 7) return `${dy}d ago`;
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        left: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 999,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#161616",
            border: `1px solid ${t.type === "success" ? "#22c55e" : t.type === "warn" ? "#f59e0b" : "#ef4444"}`,
            borderLeft: `3px solid ${t.type === "success" ? "#22c55e" : t.type === "warn" ? "#f59e0b" : "#ef4444"}`,
            borderRadius: 10,
            padding: "12px 16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            animation: "slideIn 0.25s ease",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={
              t.type === "success"
                ? "#22c55e"
                : t.type === "warn"
                  ? "#f59e0b"
                  : "#ef4444"
            }
            strokeWidth="2"
          >
            {t.type === "success" ? (
              <>
                <circle cx="12" cy="12" r="10" />
                <polyline points="9 12 11 14 15 10" />
              </>
            ) : (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </>
            )}
          </svg>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#f5f5f5" }}>
            {t.msg}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── STEP INDICATOR ────────────────────────────────────────────────────────────
function StepIndicator({
  current,
  accent,
  textMuted,
  textPrimary,
  border,
  isMobile,
}) {
  const steps = ["Upload File", "Review Data", "Submit"];
  return (
    <div
      style={{ display: "flex", alignItems: "center", marginBottom: ".5rem" }}
    >
      {steps.map((label, i) => {
        const n = i + 1,
          isDone = n < current,
          isActive = n === current;
        return (
          <div
            key={n}
            style={{
              display: "flex",
              alignItems: "center",
              flex: i < steps.length - 1 ? 1 : "unset",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  flexShrink: 0,
                  transition: "all 0.3s",
                  background: isDone
                    ? "#22c55e"
                    : isActive
                      ? accent
                      : "transparent",
                  border: `2px solid ${isDone ? "#22c55e" : isActive ? accent : border}`,
                  color: isDone || isActive ? "#fff" : textMuted,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                {isDone ? "✓" : n}
              </div>
              {(!isMobile || isActive) && (
                <span
                  style={{
                    fontSize: isMobile ? "0.72rem" : "0.8rem",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? textPrimary : textMuted,
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: isDone ? "#22c55e" : border,
                  margin: "0 0.5rem",
                  maxWidth: isMobile ? 30 : 80,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── FAILED RECORDS PANEL ──────────────────────────────────────────────────────
function FailedRecordsPanel({
  rows,
  darkMode,
  cardBg,
  border,
  textPrimary,
  textMuted,
  headerBg,
  onDownload,
}) {
  const [open, setOpen] = useState(true);
  return (
    <div
      style={{
        border: `1px solid ${darkMode ? "rgba(239,68,68,0.3)" : "#fecaca"}`,
        borderRadius: "12px",
        overflow: "hidden",
        marginTop: "1.25rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.85rem .5rem",
          background: darkMode ? "rgba(239,68,68,0.08)" : "#fff1f2",
          borderBottom: open
            ? `1px solid ${darkMode ? "rgba(239,68,68,0.2)" : "#fecaca"}`
            : "none",
          cursor: "pointer",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "8px",
            background: darkMode ? "rgba(239,68,68,0.15)" : "#fee2e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.88rem",
              fontWeight: 700,
              color: "#ef4444",
            }}
          >
            {rows.length} Record{rows.length !== 1 ? "s" : ""} Not Inserted
          </p>
          <p style={{ margin: 0, fontSize: "0.75rem", color: textMuted }}>
            These rows were skipped — fix and re-upload
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.35rem 0.7rem",
              borderRadius: "6px",
              border: "1px solid #ef4444",
              background: "transparent",
              color: "#ef4444",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = darkMode
                ? "rgba(239,68,68,0.15)"
                : "#fee2e2")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={textMuted}
            strokeWidth="2"
            style={{
              transition: "transform 0.2s",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
      {open && (
        <div style={{ background: cardBg }}>
          <div style={{ overflowX: "auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "44px 1fr 2fr 1fr",
                background: headerBg,
                borderBottom: "1px solid " + border,
                minWidth: 480,
              }}
            >
              {["Row", "Doctrack Number", "Remarks", "Reason"].map((col, i) => (
                <div
                  key={col}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: i === 0 ? "center" : "flex-start",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: textMuted,
                    padding: "0.55rem 1rem",
                  }}
                >
                  {col}
                </div>
              ))}
            </div>
            {rows.map((row, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr 2fr 1fr",
                  borderBottom:
                    i < rows.length - 1 ? "1px solid " + border : "none",
                  alignItems: "center",
                  minWidth: 480,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = darkMode
                    ? "rgba(239,68,68,0.04)"
                    : "#fff5f5")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "0.7rem 0.5rem",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: darkMode ? "rgba(239,68,68,0.15)" : "#fee2e2",
                      color: "#ef4444",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </span>
                </div>
                <div style={{ padding: "0.55rem 0.75rem" }}>
                  {row.rsn || row.doctrack ? (
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: darkMode ? "#f87171" : "#b91c1c",
                        background: darkMode
                          ? "rgba(239,68,68,0.1)"
                          : "#fee2e2",
                        borderRadius: 5,
                        padding: "0.22rem 0.55rem",
                        display: "inline-block",
                      }}
                    >
                      {row.rsn || row.doctrack}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: "0.78rem",
                        color: "#ef4444",
                        fontStyle: "italic",
                      }}
                    >
                      — empty —
                    </span>
                  )}
                </div>
                <div style={{ padding: "0.55rem 1rem" }}>
                  {row.remarks ? (
                    <span style={{ fontSize: "0.82rem", color: textPrimary }}>
                      {row.remarks}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: "0.78rem",
                        color: "#ef4444",
                        fontStyle: "italic",
                      }}
                    >
                      — empty —
                    </span>
                  )}
                </div>
                <div style={{ padding: "0.55rem 1rem" }}>
                  {(row.reason ? [row.reason] : (row.issues ?? [])).map(
                    (issue, j) => (
                      <div
                        key={j}
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: "#ef4444",
                          background: darkMode
                            ? "rgba(239,68,68,0.1)"
                            : "#fee2e2",
                          border: "1px solid rgba(239,68,68,0.25)",
                          borderRadius: "5px",
                          padding: "0.18rem 0.55rem",
                          marginBottom:
                            j < (row.issues?.length ?? 1) - 1 ? 4 : 0,
                        }}
                      >
                        ⚠ {issue}
                      </div>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              padding: "0.55rem 1.25rem",
              borderTop: "1px solid " + border,
              background: headerBg,
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <span style={{ fontSize: "0.74rem", color: textMuted }}>
              {rows.length} row{rows.length !== 1 ? "s" : ""} skipped
            </span>
            <span style={{ fontSize: "0.74rem", color: textMuted }}>
              Fix errors and re-upload to insert
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function exportHistoryToExcel({ rows, tab, fileName, entry }) {
  import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs").then(
    (XLSX) => {
      const isFailed = tab === "failed";
      const headers = isFailed
        ? ["Row #", "Doctrack Number", "Remarks", "Reason"]
        : ["Row #", "Doctrack Number", "Remarks"];

      const data = rows.map((row, idx) => {
        const rsn = row.rsn ?? row.doctrack ?? "";
        const base = {
          "Row #": idx + 1,
          "Doctrack Number": rsn,
          Remarks: row.remarks ?? "",
        };
        if (isFailed) {
          const issues = row.reason ? [row.reason] : (row.issues ?? []);
          base["Reason"] = issues.join("; ");
        }
        return base;
      });

      const ws = XLSX.utils.json_to_sheet(data, { header: headers });
      ws["!cols"] = [
        { wch: 8 },
        { wch: 28 },
        { wch: 40 },
        ...(isFailed ? [{ wch: 40 }] : []),
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, isFailed ? "Failed" : "Inserted");

      const safeName = (fileName ?? "export")
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9_\-]/g, "_");
      const ts = new Date()
        .toISOString()
        .slice(0, 16)
        .replace("T", "_")
        .replace(":", "-");
      XLSX.writeFile(wb, `${safeName}_${tab}_${ts}.xlsx`);
    },
  );
}
// ── HISTORY DETAIL MODAL ──────────────────────────────────────────────────────
function HistoryDetailModal({
  entry,
  darkMode,
  cardBg,
  border,
  textPrimary,
  textMuted,
  headerBg,
  accent,
  onClose,
}) {
  const [tab, setTab] = useState("inserted");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [doctrackRecord, setDoctrackRecord] = useState(null);
  const [insertedRows, setInsertedRows] = useState([]);
  const [insertedTotal, setInsertedTotal] = useState(
    entry.insertedCount ?? entry.inserted ?? 0,
  );
  const [insertedLoading, setInsertedLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const PAGE_SIZE = 10;
  const inputBg = darkMode ? "#1a1a1a" : "#ffffff";
  const inputBorder = darkMode ? "#2e2e2e" : "#cdd2e0";

  useEffect(() => {
    if (tab !== "inserted") return;
    const historyId = entry.historyID ?? entry.id;
    if (!historyId || String(historyId).startsWith("seed")) return;
    setInsertedLoading(true);
    getHistoryRecords(historyId, {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      search: search || undefined,
    })
      .then((res) => {
        setInsertedRows(res.data.map((r) => ({ ...r, doctrack: r.rsn })));
        setInsertedTotal(res.total);
      })
      .catch(() => setInsertedRows(entry.records ?? []))
      .finally(() => setInsertedLoading(false));
  }, [tab, page, search, entry.historyID, entry.id]);

  const [failedRows, setFailedRows] = useState(entry.failedRecords ?? []);
  const [failedLoading, setFailedLoading] = useState(false);
  const totalPages =
    tab === "inserted"
      ? Math.ceil(insertedTotal / PAGE_SIZE)
      : Math.ceil(
          failedRows.filter((r) => {
            const q = search.toLowerCase();
            return (
              !q ||
              (r.rsn ?? r.doctrack ?? "").includes(q) ||
              r.remarks?.toLowerCase().includes(q)
            );
          }).length / PAGE_SIZE,
        );
  const displayRows =
    tab === "inserted"
      ? insertedRows
      : failedRows
          .filter((r) => {
            const q = search.toLowerCase();
            return (
              !q ||
              (r.rsn ?? r.doctrack ?? "").includes(q) ||
              r.remarks?.toLowerCase().includes(q)
            );
          })
          .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const insertedCount = entry.insertedCount ?? entry.inserted ?? 0;
  const failedCount = entry.failedCount ?? entry.failed ?? 0;

  useEffect(() => {
    const historyId = entry.historyID ?? entry.id;
    if (!historyId || String(historyId).startsWith("seed")) return;
    if ((entry.failedRecords ?? []).length > 0) return; // may data na, skip
    if ((entry.failedCount ?? entry.failed ?? 0) === 0) return; // walang failed, skip

    setFailedLoading(true);
    getUploadHistoryById(historyId)
      .then((res) => {
        setFailedRows(res.failedRecords ?? []);
      })
      .catch(() => {}) // silent fail, empty na lang
      .finally(() => setFailedLoading(false));
  }, [entry.historyID, entry.id]);

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
        zIndex: 2000,
        backdropFilter: "blur(4px)",
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: cardBg,
          border: "1px solid " + border,
          borderRadius: "14px",
          overflow: "hidden",
          width: "860px",
          maxWidth: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
        }}
      >
        <div
          style={{
            padding: "0.85rem 1rem",
            borderBottom: "1px solid " + border,
            background: headerBg,
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "9px",
              background: darkMode ? "rgba(37,99,235,0.15)" : "#eef2ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={accent}
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: textMuted,
                fontWeight: 700,
              }}
            >
              Upload Details
            </p>
            <h3
              style={{
                margin: "0.1rem 0 0",
                fontSize: "0.9rem",
                fontWeight: 700,
                color: textPrimary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {entry.fileName}
            </h3>
            <p style={{ margin: 0, fontSize: "0.72rem", color: textMuted }}>
              {formatDateTime(entry.uploadedAt)} · by{" "}
              <strong style={{ color: accent }}>{entry.uploadedBy}</strong>
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.4rem",
              flexWrap: "wrap",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "0.22rem 0.6rem",
                borderRadius: "99px",
                background: darkMode ? "rgba(34,197,94,0.12)" : "#dcfce7",
                color: "#22c55e",
              }}
            >
              ✓ {insertedCount}
            </span>
            {failedCount > 0 && (
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "0.22rem 0.6rem",
                  borderRadius: "99px",
                  background: darkMode ? "rgba(239,68,68,0.12)" : "#fee2e2",
                  color: "#ef4444",
                }}
              >
                ✕ {failedCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid " + border,
              borderRadius: "6px",
              color: textMuted,
              cursor: "pointer",
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.6rem 1rem",
            borderBottom: "1px solid " + border,
            background: headerBg,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: "0.25rem" }}>
            {[
              {
                key: "inserted",
                label: `Inserted (${insertedCount})`,
                color: "#22c55e",
              },
              ...(failedCount > 0
                ? [
                    {
                      key: "failed",
                      label: `Failed (${failedCount})`,
                      color: "#ef4444",
                    },
                  ]
                : []),
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setPage(1);
                  setSearch("");
                }}
                style={{
                  padding: "0.3rem 0.75rem",
                  borderRadius: "7px",
                  border: `1px solid ${tab === t.key ? t.color + "55" : border}`,
                  background:
                    tab === t.key
                      ? darkMode
                        ? t.color + "18"
                        : t.color + "12"
                      : "transparent",
                  color: tab === t.key ? t.color : textMuted,
                  fontSize: "0.78rem",
                  fontWeight: tab === t.key ? 700 : 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ position: "relative", flex: 1, minWidth: 120 }}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke={textMuted}
              strokeWidth="2"
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Search…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                background: inputBg,
                border: "1px solid " + inputBorder,
                borderRadius: "6px",
                padding: "0.32rem 0.7rem 0.32rem 1.85rem",
                fontSize: "0.78rem",
                color: textPrimary,
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
                fontFamily: "inherit",
                colorScheme: darkMode ? "dark" : "light",
              }}
            />
          </div>

          {/* Export Excel button — add this after the search input div */}
          <button
            onClick={async () => {
              if (tab === "failed") {
                exportHistoryToExcel({
                  rows: failedRows,
                  tab,
                  fileName: entry.fileName,
                });
                return;
              }
              setExporting(true);
              try {
                const historyId = entry.historyID ?? entry.id;
                const res = await getHistoryRecords(historyId, {
                  limit: insertedTotal,
                  offset: 0,
                  search: undefined,
                });
                const allInserted = res.data.map((r) => ({
                  ...r,
                  doctrack: r.rsn,
                }));
                exportHistoryToExcel({
                  rows: allInserted,
                  tab,
                  fileName: entry.fileName,
                });
              } catch {
                exportHistoryToExcel({
                  rows: insertedRows,
                  tab,
                  fileName: entry.fileName,
                });
              } finally {
                setExporting(false);
              }
            }}
            disabled={
              tab === "inserted"
                ? insertedRows.length === 0
                : failedRows.length === 0
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.32rem 0.75rem",
              borderRadius: "6px",
              border: `1px solid ${darkMode ? "#2e2e2e" : "#cdd2e0"}`,
              background: darkMode ? "#1a1a1a" : "#ffffff",
              color: textPrimary,
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: (
                tab === "inserted"
                  ? insertedRows.length === 0
                  : failedRows.length === 0
              )
                ? "not-allowed"
                : "pointer",
              opacity: (
                tab === "inserted"
                  ? insertedRows.length === 0
                  : failedRows.length === 0
              )
                ? 0.45
                : 1,
              fontFamily: "inherit",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (
                tab === "inserted"
                  ? insertedRows.length > 0
                  : failedRows.length > 0
              ) {
                e.currentTarget.style.borderColor = "#22c55e";
                e.currentTarget.style.color = "#22c55e";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = darkMode
                ? "#2e2e2e"
                : "#cdd2e0";
              e.currentTarget.style.color = textPrimary;
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting ? "Exporting…" : "Export"}
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          <div style={{ overflowX: "auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "44px 1.2fr 2fr" + (tab === "failed" ? " 1.2fr" : ""),
                background: headerBg,
                borderBottom: "1px solid " + border,
                position: "sticky",
                top: 0,
                zIndex: 2,
                minWidth: tab === "failed" ? 560 : 420,
              }}
            >
              {[
                "Row",
                "Doctrack Number",
                "Remarks",
                ...(tab === "failed" ? ["Reason"] : []),
              ].map((col, i) => (
                <div
                  key={col}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: i === 0 ? "center" : "flex-start",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: textMuted,
                    padding: "0.55rem 1rem",
                  }}
                >
                  {col}
                </div>
              ))}
            </div>
            {(tab === "inserted" ? insertedLoading : failedLoading) ? (
              <div
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  color: textMuted,
                  fontSize: "0.84rem",
                }}
              >
                Loading…
              </div>
            ) : displayRows.length === 0 ? (
              <div
                style={{
                  padding: "1rem",
                  textAlign: "center",
                  color: textMuted,
                  fontSize: "0.84rem",
                }}
              >
                No records found
              </div>
            ) : (
              displayRows.map((row, i) => {
                const ins = tab === "inserted";
                const rsn = row.rsn ?? row.doctrack ?? "—";
                return (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "44px 1.2fr 2fr" + (tab === "failed" ? " 1.2fr" : ""),
                      borderBottom:
                        i < displayRows.length - 1
                          ? "1px solid " + border
                          : "none",
                      alignItems: "center",
                      minWidth: tab === "failed" ? 560 : 420,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = darkMode
                        ? "#1e1e1e"
                        : "#f0f4ff")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        padding: "0.65rem 0.5rem",
                      }}
                    >
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: ins
                            ? darkMode
                              ? "rgba(34,197,94,0.12)"
                              : "#dcfce7"
                            : darkMode
                              ? "rgba(239,68,68,0.12)"
                              : "#fee2e2",
                          color: ins ? "#22c55e" : "#ef4444",
                        }}
                      >
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </span>
                    </div>
                    <div style={{ padding: "0.55rem 0.75rem" }}>
                      <span
                        onClick={() => ins && setDoctrackRecord({ dtn: rsn })}
                        style={{
                          fontFamily: "monospace",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: ins
                            ? darkMode
                              ? "#06b6d4"
                              : "#0369a1"
                            : darkMode
                              ? "#f87171"
                              : "#b91c1c",
                          background: ins
                            ? darkMode
                              ? "rgba(6,182,212,0.08)"
                              : "#e0f2fe"
                            : darkMode
                              ? "rgba(239,68,68,0.1)"
                              : "#fee2e2",
                          borderRadius: 5,
                          padding: "0.22rem 0.55rem",
                          display: "inline-block",
                          cursor: ins ? "pointer" : "default",
                          textDecoration: ins ? "underline" : "none",
                          textUnderlineOffset: "2px",
                        }}
                      >
                        {rsn}
                      </span>
                    </div>
                    <div style={{ padding: "0.55rem 1rem" }}>
                      <span style={{ fontSize: "0.82rem", color: textPrimary }}>
                        {row.remarks || (
                          <em style={{ color: textMuted, fontStyle: "italic" }}>
                            —
                          </em>
                        )}
                      </span>
                    </div>
                    {tab === "failed" && (
                      <div style={{ padding: "0.55rem 1rem" }}>
                        {(row.reason ? [row.reason] : (row.issues ?? [])).map(
                          (issue, j) => (
                            <div
                              key={j}
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                color: "#ef4444",
                                background: darkMode
                                  ? "rgba(239,68,68,0.1)"
                                  : "#fee2e2",
                                border: "1px solid rgba(239,68,68,0.25)",
                                borderRadius: "5px",
                                padding: "0.18rem 0.55rem",
                                marginBottom: 3,
                              }}
                            >
                              ⚠ {issue}
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div
          style={{
            padding: "0.55rem 1rem",
            borderTop: "1px solid " + border,
            background: headerBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "0.74rem", color: textMuted }}>
            {tab === "inserted" ? insertedTotal : failedRows.length} record
            {insertedTotal !== 1 ? "s" : ""}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                background: "transparent",
                border: "1px solid " + border,
                borderRadius: 5,
                color: page === 1 ? textMuted : textPrimary,
                cursor: page === 1 ? "not-allowed" : "pointer",
                padding: "0.15rem 0.5rem",
                fontSize: "0.78rem",
              }}
            >
              ‹
            </button>
            <span style={{ fontSize: "0.75rem", color: textMuted }}>
              {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                background: "transparent",
                border: "1px solid " + border,
                borderRadius: 5,
                color: page >= totalPages ? textMuted : textPrimary,
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                padding: "0.15rem 0.5rem",
                fontSize: "0.78rem",
              }}
            >
              ›
            </button>
          </div>
        </div>
        {doctrackRecord && (
          <DoctrackModal
            record={doctrackRecord}
            onClose={() => setDoctrackRecord(null)}
            colors={{
              cardBg,
              cardBorder: border,
              textPrimary,
              textTertiary: textMuted,
              textSecondary: textPrimary,
              tableBg: headerBg,
              tableRowHover: darkMode ? "#1e1e1e" : "#f0f4ff",
              badgeBg: darkMode ? "#2a2a2a" : "#f0f0f0",
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── UPLOAD HISTORY ────────────────────────────────────────────────────────────
// Fixed grid: 2fr 1fr 1.4fr 70px 70px 70px — pantay-pantay ang columns
const HISTORY_COLS =
  "minmax(0,2fr) minmax(120px,1fr) minmax(0,1.6fr) 80px 70px 80px";

function UploadHistory({
  history,
  loading,
  darkMode,
  cardBg,
  border,
  textPrimary,
  textMuted,
  headerBg,
  rowHover,
  accent,
  isMobile,
}) {
  const [selected, setSelected] = useState(null);
  const [filterDate, setFilterDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const HISTORY_PAGE_SIZE = 8;
  const inputBg = darkMode ? "#1a1a1a" : "#ffffff";
  const inputBorder = darkMode ? "#2e2e2e" : "#cdd2e0";
  const inputStyle = {
    background: inputBg,
    border: "1px solid " + inputBorder,
    borderRadius: "6px",
    padding: "0.38rem 0.65rem",
    fontSize: "0.8rem",
    color: textPrimary,
    outline: "none",
    colorScheme: darkMode ? "dark" : "light",
    fontFamily: "inherit",
  };

  const filtered = history.filter((h) => {
    const ms =
      !search ||
      h.fileName.toLowerCase().includes(search.toLowerCase()) ||
      h.uploadedBy.toLowerCase().includes(search.toLowerCase());
    const md = !filterDate || h.uploadedAt.startsWith(filterDate);
    return ms && md;
  });

  useEffect(() => {
    setPage(1);
  }, [search, filterDate]);

  const totalPages = Math.ceil(filtered.length / HISTORY_PAGE_SIZE);
  const paginated = filtered.slice(
    (page - 1) * HISTORY_PAGE_SIZE,
    page * HISTORY_PAGE_SIZE,
  );
  const totalInserted = history.reduce(
    (s, h) => s + (h.insertedCount ?? h.inserted ?? 0),
    0,
  );
  const totalFailed = history.reduce(
    (s, h) => s + (h.failedCount ?? h.failed ?? 0),
    0,
  );

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "0.85rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "7px",
                background: darkMode ? "rgba(37,99,235,0.15)" : accent + "18",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid " + accent + "33",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={accent}
                strokeWidth="2"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div>
              <h2
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: textPrimary,
                  margin: 0,
                }}
              >
                Upload History
              </h2>
              <p style={{ fontSize: "0.75rem", color: textMuted, margin: 0 }}>
                All bulk uploads — tap a row to view
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "0.25rem 0.7rem",
                borderRadius: "99px",
                background: darkMode ? "rgba(37,99,235,0.12)" : accent + "12",
                color: accent,
                border: "1px solid " + accent + "22",
              }}
            >
              {history.length} batch{history.length !== 1 ? "es" : ""}
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "0.25rem 0.7rem",
                borderRadius: "99px",
                background: darkMode ? "rgba(34,197,94,0.12)" : "#dcfce7",
                color: "#22c55e",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              {totalInserted} inserted
            </span>
            {totalFailed > 0 && (
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "0.25rem 0.7rem",
                  borderRadius: "99px",
                  background: darkMode ? "rgba(239,68,68,0.12)" : "#fee2e2",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                {totalFailed} failed
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 140 }}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke={textMuted}
              strokeWidth="2"
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                ...inputStyle,
                width: "100%",
                paddingLeft: "1.85rem",
                boxSizing: "border-box",
              }}
            />
          </div>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{ ...inputStyle, maxWidth: isMobile ? "100%" : 160 }}
          />
          {(search || filterDate) && (
            <button
              onClick={() => {
                setSearch("");
                setFilterDate("");
              }}
              style={{
                padding: "0.38rem 0.7rem",
                borderRadius: "6px",
                border: "1px solid " + inputBorder,
                background: "transparent",
                color: textMuted,
                fontSize: "0.8rem",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          background: cardBg,
          border: "1px solid " + border,
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: darkMode
            ? "0 2px 12px rgba(0,0,0,0.4)"
            : "0 4px 20px rgba(67,97,238,0.08)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          {/* ── DESKTOP TABLE HEADER ── */}
          {!isMobile && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: HISTORY_COLS,
                background: headerBg,
                borderBottom: "1px solid " + border,
                minWidth: 680,
              }}
            >
              {[
                { l: "File / Batch", j: "flex-start" },
                { l: "Uploaded By", j: "flex-start" },
                { l: "Date & Time", j: "flex-start" },
                { l: "Inserted", j: "center" },
                { l: "Failed", j: "center" },
                { l: "View", j: "center" },
              ].map(({ l, j }) => (
                <div
                  key={l}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: j,
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: textMuted,
                    padding: "0.6rem 0.85rem",
                  }}
                >
                  {l}
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              minHeight: 52,
              maxHeight: isMobile ? "none" : HISTORY_PAGE_SIZE * 65,
              overflowY: isMobile ? "visible" : "auto",
            }}
          >
            {loading ? (
              <div
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  color: textMuted,
                  fontSize: "0.84rem",
                }}
              >
                Loading history…
              </div>
            ) : paginated.length === 0 ? (
              <div
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  color: textMuted,
                  fontSize: "0.84rem",
                }}
              >
                {filtered.length === 0 && history.length > 0
                  ? "No results match your filters."
                  : "No upload history found"}
              </div>
            ) : isMobile ? (
              // ── MOBILE CARD VIEW ──
              <div style={{ display: "flex", flexDirection: "column" }}>
                {paginated.map((entry, i) => {
                  const ins = entry.insertedCount ?? entry.inserted ?? 0;
                  const fld = entry.failedCount ?? entry.failed ?? 0;
                  return (
                    <div
                      key={entry.historyID ?? entry.id}
                      style={{
                        padding: "0.85rem 1rem",
                        borderBottom:
                          i < paginated.length - 1
                            ? "1px solid " + border
                            : "none",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onClick={() => setSelected(entry)}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = rowHover)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.65rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: "7px",
                            background: darkMode
                              ? "rgba(37,99,235,0.1)"
                              : "#eef2ff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={accent}
                            strokeWidth="2"
                          >
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              color: textPrimary,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {entry.fileName}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: textMuted }}>
                            {entry.uploadedBy} · {timeAgo(entry.uploadedAt)}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.35rem",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              padding: "0.18rem 0.55rem",
                              borderRadius: "99px",
                              background: darkMode
                                ? "rgba(34,197,94,0.1)"
                                : "#dcfce7",
                              color: "#22c55e",
                            }}
                          >
                            {ins}
                          </span>
                          {fld > 0 && (
                            <span
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                padding: "0.18rem 0.55rem",
                                borderRadius: "99px",
                                background: darkMode
                                  ? "rgba(239,68,68,0.1)"
                                  : "#fee2e2",
                                color: "#ef4444",
                              }}
                            >
                              {fld}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: textMuted,
                          paddingLeft: "2.4rem",
                        }}
                      >
                        {formatDateTime(entry.uploadedAt)} · {ins + fld} total
                        rows
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // ── DESKTOP TABLE ROWS ──
              paginated.map((entry, i) => {
                const ins = entry.insertedCount ?? entry.inserted ?? 0;
                const fld = entry.failedCount ?? entry.failed ?? 0;
                return (
                  <div
                    key={entry.historyID ?? entry.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: HISTORY_COLS,
                      borderBottom:
                        i < paginated.length - 1
                          ? "1px solid " + border
                          : "none",
                      transition: "background 0.15s",
                      alignItems: "stretch",
                      cursor: "pointer",
                      minWidth: 680,
                    }}
                    onClick={() => setSelected(entry)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = rowHover)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {/* File / Batch */}
                    <div
                      style={{
                        padding: "0.5rem 0.5rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        minWidth: 0,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "7px",
                          background: darkMode
                            ? "rgba(37,99,235,0.1)"
                            : "#eef2ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={accent}
                          strokeWidth="2"
                        >
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "0.84rem",
                            fontWeight: 600,
                            color: textPrimary,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {entry.fileName}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: textMuted }}>
                          {ins + fld} total rows
                        </div>
                      </div>
                    </div>

                    {/* Uploaded By */}
                    <div
                      style={{
                        padding: "0.75rem 0.85rem",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 500,
                          color: textPrimary,
                        }}
                      >
                        {entry.uploadedBy}
                      </span>
                    </div>

                    {/* Date & Time — fixed: flex column, consistent padding */}
                    <div
                      style={{
                        padding: "0.75rem 0.85rem",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        whiteSpace: "nowrap", // ← dagdag ito
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 500,
                          color: textPrimary,
                        }}
                      >
                        {timeAgo(entry.uploadedAt)}
                      </div>
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: textMuted,
                          marginTop: 2,
                        }}
                      >
                        {formatDateTime(entry.uploadedAt)}
                      </div>
                    </div>

                    {/* Inserted */}
                    <div
                      style={{
                        padding: "0.75rem 0.5rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.65rem",
                          borderRadius: "99px",
                          background: darkMode
                            ? "rgba(34,197,94,0.1)"
                            : "#dcfce7",
                          color: "#22c55e",
                        }}
                      >
                        {ins}
                      </span>
                    </div>

                    {/* Failed */}
                    <div
                      style={{
                        padding: "0.75rem 0.5rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {fld > 0 ? (
                        <span
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            padding: "0.2rem 0.65rem",
                            borderRadius: "99px",
                            background: darkMode
                              ? "rgba(239,68,68,0.1)"
                              : "#fee2e2",
                            color: "#ef4444",
                          }}
                        >
                          {fld}
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.82rem", color: textMuted }}>
                          —
                        </span>
                      )}
                    </div>

                    {/* View */}
                    <div
                      style={{
                        padding: "0.75rem 0.5rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(entry);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          padding: "0.3rem 0.65rem",
                          borderRadius: "6px",
                          border: "1px solid " + border,
                          background: "transparent",
                          color: textMuted,
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = accent;
                          e.currentTarget.style.color = accent;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = border;
                          e.currentTarget.style.color = textMuted;
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        View
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination footer */}
        <div
          style={{
            padding: "0.55rem 1rem",
            borderTop: "1px solid " + border,
            background: headerBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "0.74rem", color: textMuted }}>
            {filtered.length === 0
              ? "0"
              : `${(page - 1) * HISTORY_PAGE_SIZE + 1}–${Math.min(page * HISTORY_PAGE_SIZE, filtered.length)}`}{" "}
            of {filtered.length} batch{filtered.length !== 1 ? "es" : ""}
            {filtered.length !== history.length
              ? ` (filtered from ${history.length})`
              : ""}
          </span>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              style={{
                background: "transparent",
                border: "1px solid " + border,
                borderRadius: 5,
                color: page === 1 ? textMuted : textPrimary,
                cursor: page === 1 ? "not-allowed" : "pointer",
                padding: "0.15rem 0.45rem",
                fontSize: "0.72rem",
                opacity: page === 1 ? 0.4 : 1,
              }}
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                background: "transparent",
                border: "1px solid " + border,
                borderRadius: 5,
                color: page === 1 ? textMuted : textPrimary,
                cursor: page === 1 ? "not-allowed" : "pointer",
                padding: "0.15rem 0.5rem",
                fontSize: "0.78rem",
                opacity: page === 1 ? 0.4 : 1,
              }}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
              )
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span
                    key={`e-${i}`}
                    style={{
                      fontSize: "0.75rem",
                      color: textMuted,
                      padding: "0 2px",
                    }}
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      minWidth: 28,
                      height: 26,
                      background: page === p ? accent : "transparent",
                      border: `1px solid ${page === p ? accent : border}`,
                      borderRadius: 5,
                      color: page === p ? "#fff" : textPrimary,
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontWeight: page === p ? 700 : 400,
                      padding: "0 6px",
                    }}
                  >
                    {p}
                  </button>
                ),
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                background: "transparent",
                border: "1px solid " + border,
                borderRadius: 5,
                color: page >= totalPages ? textMuted : textPrimary,
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                padding: "0.15rem 0.5rem",
                fontSize: "0.78rem",
                opacity: page >= totalPages ? 0.4 : 1,
              }}
            >
              ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              style={{
                background: "transparent",
                border: "1px solid " + border,
                borderRadius: 5,
                color: page >= totalPages ? textMuted : textPrimary,
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                padding: "0.15rem 0.45rem",
                fontSize: "0.72rem",
                opacity: page >= totalPages ? 0.4 : 1,
              }}
            >
              »
            </button>
          </div>
        </div>
      </div>

      {selected && (
        <HistoryDetailModal
          entry={selected}
          darkMode={darkMode}
          cardBg={cardBg}
          border={border}
          textPrimary={textPrimary}
          textMuted={textMuted}
          headerBg={headerBg}
          accent={accent}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
function DoctrackMagicPage({ darkMode }) {
  const isMobile = useIsMobile(768);
  const bg = darkMode ? "#0a0a0a" : "#f8f8f8";
  const cardBg = darkMode ? "#161616" : "#ffffff";
  const border = darkMode ? "#2a2a2a" : "#e2e5ee";
  const textPrimary = darkMode ? "#f5f5f5" : "#1a1f36";
  const textMuted = darkMode ? "#6b7280" : "#131212";
  const headerBg = darkMode ? "#1a1a1a" : "#f6f8fd";
  const rowHover = darkMode ? "#1e1e1e" : "#f0f4ff";
  const inputBg = darkMode ? "#1a1a1a" : "#ffffff";
  const inputBorder = darkMode ? "#2e2e2e" : "#cdd2e0";
  const accent = darkMode ? "#2563eb" : "#4361ee";
  const cardStyle = {
    background: cardBg,
    border: "1px solid " + border,
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: darkMode
      ? "0 2px 12px rgba(0,0,0,0.4)"
      : "0 4px 20px rgba(67,97,238,0.08), 0 1px 4px rgba(0,0,0,0.06)",
  };
  const inputStyle = {
    background: inputBg,
    border: "1px solid " + inputBorder,
    borderRadius: "6px",
    padding: "0.4rem 0.65rem",
    fontSize: "0.82rem",
    color: textPrimary,
    outline: "none",
    colorScheme: darkMode ? "dark" : "light",
    fontFamily: "inherit",
  };

  const [currentUser, setCurrentUser] = useState("unknown");
  const [currentAlias, setCurrentAlias] = useState("");
  const [currentRole, setCurrentRole] = useState("User");
  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        setCurrentUser(res.username ?? "unknown");
        setCurrentAlias(res.alias ?? "");
        setCurrentRole(res.role ?? "User");
      })
      .catch(() => setCurrentUser("unknown"));
  }, []);

  const [step, setStep] = useState(1);
  const [allRows, setAllRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [rawFile, setRawFile] = useState(null);
  const [isOver, setIsOver] = useState(false);
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [page, setPage] = useState(1);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const PAGE_SIZE = 10;
  const fileInputRef = useRef(null);

  useEffect(() => {
    setHistoryLoading(true);
    getUploadHistoryList({})
      .then((res) => setUploadHistory(res.data))
      .catch(() => setUploadHistory([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  const showToast = (msg, type = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  };

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      showToast("Only .xlsx or .xls files accepted.", "error");
      return;
    }
    setRawFile(file);
    setFileName(file.name);
    setFileSize(formatBytes(file.size));
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs").then(
          (XLSX) => {
            const wb = XLSX.read(e.target.result, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
            const rows = data
              .map((row, idx) => {
                const keys = Object.keys(row);
                const doctractKey = keys.find((k) =>
                  k.toLowerCase().includes("doctrack"),
                );
                const remarksKey = keys.find((k) =>
                  k.toLowerCase().includes("remarks"),
                );
                const doctrack = String(row[doctractKey] ?? "").trim();
                const remarks = String(row[remarksKey] ?? "").trim();
                const issues = [];
                if (!doctrack) issues.push("Missing Doctrack Number");
                else if (!/^\d{14}$/.test(doctrack))
                  issues.push("Invalid format (expected 14 digits)");
                if (!remarks) issues.push("Missing Remarks");
                return { rowNum: idx + 2, doctrack, remarks, issues };
              })
              .filter((r) => r.doctrack || r.remarks);
            setAllRows(rows);
            setStep(2);
            setPage(1);
            showToast(`${rows.length} records loaded.`, "success");
          },
        );
      } catch {
        showToast("Failed to parse Excel file.", "error");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const removeFile = () => {
    setAllRows([]);
    setFileName("");
    setFileSize("");
    setRawFile(null);
    setSearch("");
    setStep(1);
    setSubmitted(false);
    setSubmitResult(null);
    setPage(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!validRows.length) {
      showToast("No valid records to submit.", "error");
      return;
    }
    if (!rawFile) {
      showToast("No file found. Please re-upload.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const uploadResult = await uploadDoctrackExcel(
        rawFile,
        currentUser,
        currentAlias,
      );
      if (!uploadResult.success && uploadResult.stats?.inserted === 0) {
        showToast(uploadResult.message || "Upload failed.", "error");
        setSubmitting(false);
        return;
      }
      let savedHistory = null;
      try {
        savedHistory = await saveUploadHistory({
          fileName,
          uploadedBy: currentUser,
          stats: uploadResult.stats,
          insertedRecords: uploadResult.inserted_records,
          allFailed: uploadResult.all_failed,
        });
      } catch (histErr) {
        console.warn("History save failed (non-blocking):", histErr.message);
      }
      const result = {
        inserted: uploadResult.inserted_records,
        failed: uploadResult.all_failed,
        stats: uploadResult.stats,
      };
      setSubmitting(false);
      setSubmitted(true);
      setStep(3);
      setSubmitResult(result);
      const newEntry = savedHistory ?? {
        historyID: `local-${Date.now()}`,
        fileName,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser,
        insertedCount: uploadResult.stats.inserted,
        failedCount: uploadResult.stats.failed,
        failedRecords: uploadResult.all_failed,
        records: uploadResult.inserted_records,
      };
      setUploadHistory((prev) => [newEntry, ...prev]);
      uploadResult.stats.failed > 0
        ? showToast(
            `${uploadResult.stats.inserted} inserted · ${uploadResult.stats.failed} skipped`,
            "warn",
          )
        : showToast(
            `${uploadResult.stats.inserted} records inserted!`,
            "success",
          );
    } catch (err) {
      showToast(err.message || "Upload failed. Please try again.", "error");
      setSubmitting(false);
    }
  };

  const handleDownloadFailed = () => {
    if (!submitResult?.failed?.length) return;
    const csv = [
      "Row,Doctrack Number,Remarks,Reason",
      ...submitResult.failed.map(
        (r) =>
          `${r.rowNum},"${r.rsn ?? r.doctrack ?? ""}","${r.remarks ?? ""}","${r.reason ?? (r.issues ?? []).join("; ")}"`,
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "failed_records.csv";
    a.click();
    showToast("Failed records exported.", "success");
  };

  const filtered = allRows.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.doctrack.includes(q) || r.remarks.toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const validRows = allRows.filter((r) => r.issues.length === 0);
  const issueRows = allRows.filter((r) => r.issues.length > 0);

  const columnCardStyle = {
    background: cardBg,
    border: "1px solid " + border,
    borderRadius: "14px",
    padding: "1.25rem",
    boxShadow: darkMode
      ? "0 2px 12px rgba(0,0,0,0.4)"
      : "0 4px 20px rgba(67,97,238,0.08)",
    position: "relative",
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        background: bg,
        padding: isMobile ? "1rem" : "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "35fr 65fr",
          gap: isMobile ? "1rem" : "1.5rem",
          alignItems: "start",
        }}
      >
        {/* ── LEFT: Upload section ── */}
        <div style={columnCardStyle}>
          {submitting && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "14px",
                background: darkMode
                  ? "rgba(10,10,10,0.85)"
                  : "rgba(255,255,255,0.88)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                backdropFilter: "blur(3px)",
                gap: "1.25rem",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  border: `4px solid ${darkMode ? "#2a2a2a" : "#e2e5ee"}`,
                  borderTop: `4px solid ${accent}`,
                  animation: "spin 0.75s linear infinite",
                }}
              />
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: textPrimary,
                  }}
                >
                  Uploading to database…
                </p>
                <p
                  style={{
                    margin: "5px 0 0",
                    fontSize: "0.78rem",
                    color: textMuted,
                  }}
                >
                  Please wait while we process your file
                </p>
              </div>
            </div>
          )}

          <div style={{ marginBottom: "1.25rem" }}>
            <h1
              style={{
                fontSize: isMobile ? "1rem" : "1.1rem",
                fontWeight: 600,
                margin: "0 0 0.25rem",
                color: textPrimary,
              }}
            >
              Bulk Upload
            </h1>
            <p style={{ color: textMuted, fontSize: "0.82rem", margin: 0 }}>
              Import Doctrack records via Excel.
            </p>
          </div>

          <StepIndicator
            current={step}
            accent={accent}
            textMuted={textMuted}
            textPrimary={textPrimary}
            border={border}
            isMobile={isMobile}
          />

          {/* UPLOAD CARD */}
          <div
            style={{
              ...cardStyle,
              marginBottom: "1.25rem",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                padding: ".75rem 1rem",
                borderBottom: "1px solid " + border,
                background: headerBg,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke={accent}
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: textPrimary,
                  flex: 1,
                }}
              >
                Upload Excel File
              </span>
              <span style={{ fontSize: "0.72rem", color: textMuted }}>
                Code: <strong style={{ color: accent }}>{currentAlias}</strong>
              </span>
              <button
                onClick={async () => {
                  try {
                    await downloadDoctrackTemplate();
                    showToast("Template downloaded.", "success");
                  } catch {
                    showToast("Failed to download template.", "error");
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.3rem 0.7rem",
                  borderRadius: "6px",
                  border: "1px solid " + border,
                  background: "transparent",
                  color: textMuted,
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = accent;
                  e.currentTarget.style.color = accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = border;
                  e.currentTarget.style.color = textMuted;
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {!isMobile && "Download "}Template
              </button>
            </div>
            <div style={{ padding: ".5rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.6rem 0.85rem",
                  marginBottom: "1rem",
                  background: darkMode ? "rgba(245,158,11,0.07)" : "#fffbeb",
                  border: "1px solid rgba(245,158,11,0.25)",
                  borderRadius: "8px",
                  fontSize: "0.78rem",
                  color: textMuted,
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>
                  Required:{" "}
                  <strong style={{ color: textPrimary }}>
                    Doctrack Number
                  </strong>
                  , <strong style={{ color: textPrimary }}>Remarks</strong>
                </span>
              </div>
              {!fileName ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsOver(true);
                  }}
                  onDragLeave={() => setIsOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${isOver ? accent : border}`,
                    borderRadius: "10px",
                    padding: isMobile ? "32px 16px" : "28px 14px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: isOver
                      ? darkMode
                        ? "rgba(37,99,235,0.08)"
                        : "rgba(67,97,238,0.04)"
                      : darkMode
                        ? "#1a1a1a"
                        : "#fafbff",
                    transition: "all 0.2s",
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files[0]) handleFile(e.target.files[0]);
                    }}
                  />
                  <div
                    style={{
                      width: 29,
                      height: 29,
                      margin: "0 auto 12px",
                      background: darkMode ? "rgba(37,99,235,0.12)" : "#eef2ff",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={accent}
                      strokeWidth="1.5"
                    >
                      <path d="M4 16l4-4 4 4 4-8 4 8" />
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                  </div>
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      color: textPrimary,
                      margin: "0 0 4px",
                    }}
                  >
                    {isMobile ? "Tap to browse" : "Drop your Excel file here"}
                  </p>
                  {!isMobile && (
                    <p
                      style={{
                        fontSize: "0.78rem",
                        color: textMuted,
                        margin: "0 0 10px",
                      }}
                    >
                      or click to browse from your computer
                    </p>
                  )}
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      padding: "2px 10px",
                      borderRadius: "5px",
                      letterSpacing: "0.05em",
                      background: darkMode ? "rgba(37,99,235,0.15)" : "#eef2ff",
                      color: accent,
                      border: "1px solid " + accent + "33",
                    }}
                  >
                    📊 .XLSX / .XLS
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 0.85rem",
                    background: darkMode ? "#1a1a1a" : "#f0fdf4",
                    border: `1px solid ${darkMode ? "#2a2a2a" : "#bbf7d0"}`,
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "8px",
                      background: darkMode ? "rgba(34,197,94,0.12)" : "#dcfce7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: textPrimary,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {fileName}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: textMuted }}>
                      {fileSize}
                    </div>
                  </div>
                  {!submitted && (
                    <button
                      onClick={removeFile}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: textMuted,
                        padding: 4,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#ef4444")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = textMuted)
                      }
                    >
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PREVIEW */}
          {allRows.length > 0 && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "0.6rem",
                  marginBottom: "1rem",
                }}
              >
                {[
                  {
                    label: "Total",
                    value: allRows.length,
                    color: accent,
                    bg: darkMode ? "#1a2744" : accent + "12",
                  },
                  {
                    label: "Valid",
                    value: validRows.length,
                    color: "#22c55e",
                    bg: darkMode ? "#0f2e1a" : "#f0fdf4",
                  },
                  {
                    label: "Issues",
                    value: issueRows.length,
                    color: issueRows.length > 0 ? "#ef4444" : "#22c55e",
                    bg:
                      issueRows.length > 0
                        ? darkMode
                          ? "#2e0f1a"
                          : "#fff1f3"
                        : darkMode
                          ? "#0f2e1a"
                          : "#f0fdf4",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: s.bg,
                      border: "1px solid " + s.color + "33",
                      borderRadius: "10px",
                      padding: "0.75rem 0.85rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: s.color,
                        marginBottom: 3,
                      }}
                    >
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: 800,
                        color: s.color,
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                      }}
                    >
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ ...cardStyle, marginBottom: "1rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.65rem",
                    padding: "0.65rem 0.85rem",
                    borderBottom: "1px solid " + border,
                    background: headerBg,
                  }}
                >
                  <div style={{ position: "relative", flex: 1 }}>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={textMuted}
                      strokeWidth="2"
                      style={{
                        position: "absolute",
                        left: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                      }}
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search…"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      style={{
                        ...inputStyle,
                        width: "100%",
                        paddingLeft: "1.85rem",
                        boxSizing: "border-box",
                        fontSize: "0.78rem",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: textMuted,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {filtered.length} rows
                  </span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "40px 1.2fr 2fr 60px",
                      background: headerBg,
                      borderBottom: "1px solid " + border,
                      minWidth: 360,
                    }}
                  >
                    {[
                      { l: "#", j: "center" },
                      { l: "Doctrack No.", j: "flex-start" },
                      { l: "Remarks", j: "flex-start" },
                      { l: "Status", j: "center" },
                    ].map(({ l, j }) => (
                      <div
                        key={l}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: j,
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: textMuted,
                          padding: "0.55rem 0.75rem",
                        }}
                      >
                        {l}
                      </div>
                    ))}
                  </div>
                  <div style={{ maxHeight: 300, overflowY: "auto" }}>
                    {paginated.map((row, i) => {
                      const isValid = row.issues.length === 0;
                      return (
                        <div
                          key={i}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "40px 1.2fr 2fr 60px",
                            borderBottom:
                              i < paginated.length - 1
                                ? "1px solid " + border
                                : "none",
                            transition: "background 0.15s",
                            alignItems: "center",
                            minWidth: 360,
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = rowHover)
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color: textMuted,
                              fontWeight: 600,
                              padding: "0.65rem 0.5rem",
                              textAlign: "center",
                            }}
                          >
                            {(page - 1) * PAGE_SIZE + i + 1}
                          </span>
                          <div style={{ padding: "0.5rem 0.65rem" }}>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: darkMode ? "#06b6d4" : "#0369a1",
                                background: darkMode
                                  ? "rgba(6,182,212,0.08)"
                                  : "#e0f2fe",
                                borderRadius: 5,
                                padding: "0.2rem 0.5rem",
                                display: "inline-block",
                              }}
                            >
                              {row.doctrack || "—"}
                            </span>
                          </div>
                          <div style={{ padding: "0.5rem 0.75rem" }}>
                            <span
                              style={{
                                fontSize: "0.78rem",
                                color: textPrimary,
                              }}
                            >
                              {row.remarks || (
                                <em
                                  style={{
                                    color: "#ef4444",
                                    fontStyle: "normal",
                                  }}
                                >
                                  —
                                </em>
                              )}
                            </span>
                            {!isValid && (
                              <div
                                style={{
                                  fontSize: "0.68rem",
                                  color: "#ef4444",
                                  marginTop: 2,
                                  fontWeight: 500,
                                }}
                              >
                                ⚠ {row.issues.join(" · ")}
                              </div>
                            )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              padding: "0.65rem 0",
                            }}
                          >
                            <span
                              title={isValid ? "Valid" : row.issues.join(", ")}
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                display: "inline-block",
                                background: isValid ? "#22c55e" : "#ef4444",
                                boxShadow: `0 0 5px ${isValid ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)"}`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div
                  style={{
                    padding: "0.45rem 0.85rem",
                    borderTop: "1px solid " + border,
                    background: headerBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: "0.72rem", color: textMuted }}>
                    {filtered.length} of {allRows.length} records
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      style={{
                        background: "transparent",
                        border: "1px solid " + border,
                        borderRadius: 5,
                        color: page === 1 ? textMuted : textPrimary,
                        cursor: page === 1 ? "not-allowed" : "pointer",
                        padding: "0.12rem 0.45rem",
                        fontSize: "0.75rem",
                      }}
                    >
                      ‹
                    </button>
                    <span style={{ fontSize: "0.72rem", color: textMuted }}>
                      {page} / {totalPages || 1}
                    </span>
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page >= totalPages}
                      style={{
                        background: "transparent",
                        border: "1px solid " + border,
                        borderRadius: 5,
                        color: page >= totalPages ? textMuted : textPrimary,
                        cursor: page >= totalPages ? "not-allowed" : "pointer",
                        padding: "0.12rem 0.45rem",
                        fontSize: "0.75rem",
                      }}
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>

              {!submitted ? (
                <div
                  style={{
                    display: "flex",
                    gap: "0.65rem",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={removeFile}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      padding: "0.55rem 1rem",
                      borderRadius: "8px",
                      border: "1px solid " + border,
                      background: "transparent",
                      color: textMuted,
                      cursor: "pointer",
                      fontSize: "0.82rem",
                      fontWeight: 500,
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = rowHover;
                      e.currentTarget.style.color = textPrimary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = textMuted;
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 .49-3.85" />
                    </svg>
                    Reset
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !validRows.length}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      padding: "0.55rem 1.2rem",
                      borderRadius: "8px",
                      border: "none",
                      background: !validRows.length
                        ? darkMode
                          ? "#2a2a2a"
                          : "#e5e7eb"
                        : `linear-gradient(135deg, ${accent}, #2563eb)`,
                      color: !validRows.length ? textMuted : "#fff",
                      cursor: !validRows.length ? "not-allowed" : "pointer",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      fontFamily: "inherit",
                      boxShadow: validRows.length
                        ? "0 4px 14px rgba(67,97,238,0.35)"
                        : "none",
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Submit{validRows.length > 0 ? ` (${validRows.length})` : ""}
                  </button>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.85rem",
                      padding: "0.85rem 1rem",
                      background: darkMode ? "rgba(34,197,94,0.06)" : "#f0fdf4",
                      border: `1px solid ${darkMode ? "rgba(34,197,94,0.2)" : "#bbf7d0"}`,
                      borderRadius: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: darkMode
                          ? "rgba(34,197,94,0.15)"
                          : "#dcfce7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="2.5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontWeight: 700,
                          fontSize: "0.88rem",
                          color: textPrimary,
                          margin: "0 0 2px",
                        }}
                      >
                        Upload Complete
                      </p>
                      <p
                        style={{
                          fontSize: "0.78rem",
                          color: textMuted,
                          margin: 0,
                        }}
                      >
                        <strong style={{ color: "#22c55e" }}>
                          {submitResult?.stats?.inserted ??
                            submitResult?.inserted?.length}
                        </strong>{" "}
                        inserted as{" "}
                        <strong style={{ color: accent }}>{currentUser}</strong>
                        {(submitResult?.stats?.failed ??
                          submitResult?.failed?.length) > 0 && (
                          <>
                            {" "}
                            ·{" "}
                            <strong style={{ color: "#ef4444" }}>
                              {submitResult?.stats?.failed ??
                                submitResult?.failed?.length}
                            </strong>{" "}
                            skipped
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={removeFile}
                      style={{
                        padding: "0.4rem 0.85rem",
                        borderRadius: "8px",
                        border: "1px solid " + border,
                        background: cardBg,
                        color: textPrimary,
                        cursor: "pointer",
                        fontSize: "0.78rem",
                        fontWeight: 500,
                        fontFamily: "inherit",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Upload Another
                    </button>
                  </div>
                  {submitResult?.failed?.length > 0 && (
                    <FailedRecordsPanel
                      rows={submitResult.failed}
                      darkMode={darkMode}
                      cardBg={cardBg}
                      border={border}
                      textPrimary={textPrimary}
                      textMuted={textMuted}
                      headerBg={headerBg}
                      onDownload={handleDownloadFailed}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT: Upload History ── */}
        <div style={columnCardStyle}>
          <UploadHistory
            history={
              ["Admin", "SuperAdmin"].includes(currentRole)
                ? uploadHistory
                : uploadHistory.filter((h) => h.uploadedBy === currentUser)
            }
            loading={historyLoading}
            darkMode={darkMode}
            cardBg={cardBg}
            border={border}
            textPrimary={textPrimary}
            textMuted={textMuted}
            headerBg={headerBg}
            rowHover={rowHover}
            accent={accent}
            isMobile={isMobile}
          />
        </div>
      </div>

      <Toast toasts={toasts} />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(16px) } to { opacity: 1; transform: translateX(0) } }
        * { -webkit-tap-highlight-color: transparent; }
        input, button { touch-action: manipulation; }
      `}</style>
    </div>
  );
}

export default DoctrackMagicPage;
