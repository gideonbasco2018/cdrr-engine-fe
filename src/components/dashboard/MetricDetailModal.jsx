import { useState, useEffect, useCallback } from "react";
import { getDashboardDetail } from "../../api/dashboard";
import { FB } from "./constants";
import { statusBadge, fmtDateTime, formatDateRange } from "./utils";
import {
  generatePDF,
  generateExcel,
} from "../tasks/DataTable/TransmittalGenerator";

const PAGE_SIZE = 10;

export default function MetricDetailModal({
  metricKey,
  metricLabel,
  dateParams,
  onClose,
  onRowClick,
  onViewLogs,
  ui,
  darkMode = false,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [openMenuRow, setOpenMenuRow] = useState(null);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterStep, setFilterStep] = useState("");
  const [filterDtn, setFilterDtn] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [appliedStep, setAppliedStep] = useState("");
  const [appliedDtn, setAppliedDtn] = useState("");

  const hasActiveDateFilter = appliedFrom || appliedTo;
  const hasActiveStepFilter = !!appliedStep;
  const hasActiveDtnFilter = !!appliedDtn;
  const hasActiveFilter =
    hasActiveDateFilter || hasActiveStepFilter || hasActiveDtnFilter;

  const applyFilter = () => {
    setAppliedFrom(filterFrom);
    setAppliedTo(filterTo);
    setAppliedStep(filterStep);
    setAppliedDtn(filterDtn);
    fetchPage(1, filterFrom, filterTo, filterStep, filterDtn);
  };

  const clearFilter = () => {
    setFilterFrom("");
    setFilterTo("");
    setFilterStep("");
    setFilterDtn("");
    setAppliedFrom("");
    setAppliedTo("");
    setAppliedStep("");
    setAppliedDtn("");
    fetchPage(1, "", "", "", "");
  };

  const fetchPage = useCallback(
    async (p, accFrom, accTo, step, dtn) => {
      setLoading(true);
      setError(null);
      try {
        const extraParams = {};
        const resolvedFrom = accFrom !== undefined ? accFrom : appliedFrom;
        const resolvedTo = accTo !== undefined ? accTo : appliedTo;
        const resolvedStep = step !== undefined ? step : appliedStep;
        const resolvedDtn = dtn !== undefined ? dtn : appliedDtn;
        if (resolvedFrom) extraParams.accomplished_date_from = resolvedFrom;
        if (resolvedTo) extraParams.accomplished_date_to = resolvedTo;
        if (resolvedStep) extraParams.app_step = resolvedStep;
        if (resolvedDtn) extraParams.dtn = resolvedDtn;

        const res = await getDashboardDetail({
          metric: metricKey,
          page: p,
          page_size: PAGE_SIZE,
          ...dateParams,
          ...extraParams,
        });
        setData(res.data);
        console.log("🔍 ROW FIELDS:", res.data[0]);
        setTotal(res.total);
        setTotalPages(res.total_pages);
        setPage(res.page);
      } catch (err) {
        setError(
          err?.response?.data?.detail || err.message || "Failed to load",
        );
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [metricKey, dateParams, appliedFrom, appliedTo, appliedStep, appliedDtn],
  );

  useEffect(() => {
    const handler = () => {
      setOpenMenuRow(null);
      setShowExportMenu(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  // ── Transmittal export ───────────────────────────────────────────────────
  const [transmittalLoading, setTransmittalLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Map a modal row → transmittal row shape
  const toTransmittalRow = (r) => ({
    dtn: r.dtn ?? "N/A",
    ltoCompany: r.lto_company ?? "N/A",
    ltoAdd: r.lto_address ?? "N/A",
    secpa: r.secpa ?? "N/A",
    appType: r.app_type ?? "N/A",
    regNo: r.reg_no ?? "N/A",
    typeDocReleased: r.app_step ?? "N/A",
    attaReleased: r.atta_released ?? "N/A",
    dateReleased: r.end_date
      ? new Date(r.end_date).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A",
  });
  const handleExport = async (format, scope) => {
    setShowExportMenu(false);
    setTransmittalLoading(true);
    try {
      let rows;
      if (scope === "page") {
        rows = data.map(toTransmittalRow);
      } else {
        // Fetch all pages with current filters
        const extraParams = {};
        if (appliedFrom) extraParams.accomplished_date_from = appliedFrom;
        if (appliedTo) extraParams.accomplished_date_to = appliedTo;
        if (appliedStep) extraParams.app_step = appliedStep;
        if (appliedDtn) extraParams.dtn = appliedDtn;

        const firstRes = await getDashboardDetail({
          metric: metricKey,
          page: 1,
          page_size: 500,
          ...dateParams,
          ...extraParams,
        });
        rows = firstRes.data.map(toTransmittalRow);

        // If there are more pages, fetch them too
        for (let p = 2; p <= firstRes.total_pages; p++) {
          const res = await getDashboardDetail({
            metric: metricKey,
            page: p,
            page_size: 500,
            ...dateParams,
            ...extraParams,
          });
          rows.push(...res.data.map(toTransmittalRow));
        }
      }

      if (format === "pdf") await generatePDF(rows, metricKey);
      if (format === "excel") await generateExcel(rows, metricKey);
      if (format === "both") {
        await generatePDF(rows, metricKey);
        await generateExcel(rows, metricKey);
      }
    } catch (err) {
      console.error("Transmittal export failed:", err);
    } finally {
      setTransmittalLoading(false);
    }
  };

  const accentColor =
    metricKey === "received"
      ? "#1877F2"
      : metricKey === "completed"
        ? "#36a420"
        : metricKey === "on_process"
          ? "#f59e0b"
          : FB;

  const metricIcon =
    metricKey === "received"
      ? "👁️"
      : metricKey === "completed"
        ? "✅"
        : metricKey === "on_process"
          ? "⏳"
          : "🎯";

  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(startRow + PAGE_SIZE - 1, total);

  // Input style helper
  const inputStyle = {
    padding: "5px 10px",
    borderRadius: 7,
    border: `1px solid ${ui.cardBorder}`,
    background: ui.inputBg,
    color: ui.textPrimary,
    fontSize: "0.76rem",
    fontFamily: "inherit",
    outline: "none",
    cursor: "pointer",
    colorScheme: darkMode ? "dark" : "light",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.52)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 14,
          width: "100%",
          maxWidth: 1100,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.28)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `${accentColor}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
              }}
            >
              {metricIcon}
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: ui.textPrimary,
                }}
              >
                {metricLabel}
              </h3>
              <p style={{ margin: 0, fontSize: "0.75rem", color: ui.textSub }}>
                {loading
                  ? "Loading…"
                  : `${total.toLocaleString()} application${total !== 1 ? "s" : ""}`}
                {dateParams?.date_from && dateParams?.date_to
                  ? ` · ${formatDateRange(dateParams.date_from, dateParams.date_to)}`
                  : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: ui.inputBg,
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 8,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: ui.textMuted,
              fontSize: "1rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Filter Bar ── */}
        <div
          style={{
            padding: "10px 20px",
            borderBottom: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            flexShrink: 0,
            background: hasActiveFilter ? `${accentColor}08` : "transparent",
          }}
        >
          {/* Accomplished Date */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: ui.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
              }}
            >
              📅 Accomplished
            </span>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              style={inputStyle}
            />
            <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>→</span>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Divider */}
          <div
            style={{
              width: 1,
              height: 22,
              background: ui.divider,
              flexShrink: 0,
            }}
          />

          {/* DTN Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: ui.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
              }}
            >
              🔢 DTN
            </span>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search DTN..."
                value={filterDtn}
                onChange={(e) => setFilterDtn(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilter()} // Enter key support
                style={{
                  ...inputStyle,
                  width: 160,
                  paddingRight: filterDtn ? "1.6rem" : "0.6rem",
                }}
              />
              {filterDtn && (
                <button
                  onClick={() => setFilterDtn("")}
                  style={{
                    position: "absolute",
                    right: "0.4rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: ui.textMuted,
                    cursor: "pointer",
                    fontSize: "0.65rem",
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              width: 1,
              height: 22,
              background: ui.divider,
              flexShrink: 0,
            }}
          />

          {/* Step */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: ui.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
              }}
            >
              📌 Step
            </span>
            <select
              value={filterStep}
              onChange={(e) => setFilterStep(e.target.value)}
              style={{ ...inputStyle, width: 160 }}
            >
              <option value="">All Steps</option>
              {[
                "Quality Evaluation",
                "S&E",
                "S&E Checker",
                "S&E Supervisor",
                "Compliance",
                "Checking",
                "Supervisor",
                "QA Admin",
                "LRD Chief Admin",
                "OD-Receiving",
                "OD-Releasing",
                "Releasing Officer",
              ].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Apply */}
          <button
            onClick={applyFilter}
            disabled={!filterFrom && !filterTo && !filterStep && !filterDtn}
            style={{
              padding: "5px 14px",
              borderRadius: 7,
              border: "none",
              background:
                filterFrom || filterTo || filterStep || filterDtn
                  ? FB
                  : ui.progressBg,
              color:
                filterFrom || filterTo || filterStep || filterDtn
                  ? "#fff"
                  : ui.textMuted,
              fontSize: "0.76rem",
              fontWeight: 700,
              cursor:
                filterFrom || filterTo || filterStep || filterDtn
                  ? "pointer"
                  : "not-allowed",
              fontFamily: "inherit",
              opacity:
                filterFrom || filterTo || filterStep || filterDtn ? 1 : 0.5,
              whiteSpace: "nowrap",
            }}
          >
            Apply
          </button>

          {/* Clear all */}
          {hasActiveFilter && (
            <button
              onClick={clearFilter}
              style={{
                padding: "5px 12px",
                borderRadius: 7,
                border: `1px solid ${ui.cardBorder}`,
                background: "transparent",
                color: "#e02020",
                fontSize: "0.74rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              ✕ Clear all
            </button>
          )}

          {/* Active filter pills */}
          {hasActiveDateFilter && (
            <span
              style={{
                fontSize: "0.71rem",
                color: accentColor,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 99,
                background: `${accentColor}15`,
                whiteSpace: "nowrap",
              }}
            >
              📅{" "}
              {appliedFrom
                ? new Date(appliedFrom).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
              {" → "}
              {appliedTo
                ? new Date(appliedTo).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </span>
          )}

          {hasActiveStepFilter && (
            <span
              style={{
                fontSize: "0.71rem",
                color: "#f59e0b",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 99,
                background: "#f59e0b18",
                whiteSpace: "nowrap",
              }}
            >
              📌 {appliedStep}
            </span>
          )}

          {hasActiveDtnFilter && (
            <span
              style={{
                fontSize: "0.71rem",
                color: "#6366f1",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 99,
                background: "#6366f115",
                whiteSpace: "nowrap",
              }}
            >
              🔢 {appliedDtn}
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
          {loading && (
            <div
              style={{
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 44,
                    borderRadius: 8,
                    background: ui.progressBg,
                    animation: "cdrrPulse 1.2s ease-in-out infinite",
                    animationDelay: `${i * 0.07}s`,
                  }}
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "#e02020",
                fontSize: "0.84rem",
              }}
            >
              ⚠️ {error}&nbsp;
              <button
                onClick={() => fetchPage(page)}
                style={{
                  background: "none",
                  border: "none",
                  color: FB,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.84rem",
                  fontFamily: "inherit",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && data.length === 0 && (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.84rem",
              }}
            >
              {hasActiveFilter
                ? "No records found for the applied filters."
                : "No records found."}
            </div>
          )}

          {!loading && !error && data.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.8rem",
                  fontFamily: "inherit",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: ui.pageBg,
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    {[
                      { label: "#", align: "center", width: 40 },
                      { label: "DTN", align: "left" },
                      { label: "Company", align: "left" },
                      { label: "Brand Name", align: "left" },
                      { label: "Generic Name", align: "left" },
                      {
                        label: "Step",
                        align: "left",
                        stepHighlight: hasActiveStepFilter,
                      },
                      { label: "Status", align: "center" },
                      { label: "Start Date", align: "right" },
                      {
                        label: "Accomplished Date",
                        align: "right",
                        highlight: hasActiveDateFilter,
                      },
                      { label: "Action", align: "center", width: 60 },
                    ].map((col, ci) => {
                      const hlColor = col.stepHighlight
                        ? "#f59e0b"
                        : col.highlight
                          ? accentColor
                          : null;
                      return (
                        <th
                          key={ci}
                          style={{
                            padding: "9px 12px",
                            textAlign: col.align,
                            fontSize: "0.69rem",
                            fontWeight: 700,
                            color: hlColor || ui.textMuted,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            borderBottom: `1px solid ${hlColor || ui.cardBorder}`,
                            whiteSpace: "nowrap",
                            width: col.width || "auto",
                          }}
                        >
                          {col.label}
                          {(col.highlight || col.stepHighlight) && (
                            <span style={{ marginLeft: 4 }}>▼</span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, ri) => {
                    const badge = statusBadge(row.application_status, ui);
                    const isEven = ri % 2 === 0;
                    const isLast = ri === data.length - 1;
                    const border = !isLast ? `1px solid ${ui.divider}` : "none";
                    const rowNum = startRow + ri;

                    return (
                      <tr
                        key={row.log_id}
                        onClick={() => onRowClick && onRowClick(row)}
                        style={{
                          background: isEven ? "transparent" : `${ui.pageBg}88`,
                          cursor: onRowClick ? "pointer" : "default",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = ui.hoverBg)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = isEven
                            ? "transparent"
                            : `${ui.pageBg}88`)
                        }
                      >
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "center",
                            color: ui.textMuted,
                            fontSize: "0.73rem",
                            borderBottom: border,
                          }}
                        >
                          {rowNum}
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            borderBottom: border,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              color: accentColor,
                              fontSize: "0.82rem",
                            }}
                          >
                            {row.dtn || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            color: ui.textSub,
                            borderBottom: border,
                            minWidth: 180,
                            maxWidth: 280,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              fontSize: "0.76rem",
                              lineHeight: 1.4,
                              wordBreak: "break-word",
                            }}
                          >
                            {row.lto_company || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            color: ui.textPrimary,
                            fontWeight: 500,
                            borderBottom: border,
                            maxWidth: 180,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.brand_name || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            color: ui.textSub,
                            borderBottom: border,
                            maxWidth: 160,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.generic_name || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            color: ui.textSub,
                            borderBottom: border,
                            maxWidth: 140,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: "0.76rem",
                            }}
                          >
                            {row.app_step || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "center",
                            borderBottom: border,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 10px",
                              borderRadius: 99,
                              fontSize: "0.73rem",
                              fontWeight: 700,
                              color: badge.color,
                              background: badge.bg,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "right",
                            color: ui.textMuted,
                            fontSize: "0.76rem",
                            borderBottom: border,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {fmtDateTime(row.start_date)}
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "right",
                            fontSize: "0.76rem",
                            borderBottom: border,
                            whiteSpace: "nowrap",
                            color: row.end_date ? "#36a420" : ui.textMuted,
                            fontWeight:
                              hasActiveFilter && row.end_date ? 700 : 400,
                          }}
                        >
                          {row.end_date ? fmtDateTime(row.end_date) : "—"}
                        </td>
                        {/* 3-dot action */}
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "center",
                            borderBottom: border,
                            position: "relative",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() =>
                              setOpenMenuRow(
                                openMenuRow === row.log_id ? null : row.log_id,
                              )
                            }
                            style={{
                              background: "none",
                              border: `1px solid ${ui.cardBorder}`,
                              borderRadius: 6,
                              width: 28,
                              height: 28,
                              cursor: "pointer",
                              color: ui.textMuted,
                              fontSize: "1rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: "inherit",
                            }}
                          >
                            ⋯
                          </button>
                          {openMenuRow === row.log_id && (
                            <div
                              style={{
                                position: "absolute",
                                right: 8,
                                top: 36,
                                zIndex: 50,
                                background: ui.cardBg,
                                border: `1px solid ${ui.cardBorder}`,
                                borderRadius: 8,
                                boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
                                minWidth: 140,
                                overflow: "hidden",
                              }}
                            >
                              <button
                                onClick={() => {
                                  setOpenMenuRow(null);
                                  onViewLogs && onViewLogs(row);
                                }}
                                style={{
                                  width: "100%",
                                  padding: "9px 14px",
                                  background: "none",
                                  border: "none",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  fontSize: "0.82rem",
                                  color: ui.textPrimary,
                                  fontFamily: "inherit",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background =
                                    ui.hoverBg)
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background = "none")
                                }
                              >
                                📋 View Logs
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.74rem", color: ui.textMuted }}>
              {total > 0
                ? `${startRow}–${endRow} of ${total.toLocaleString()} records`
                : ""}
            </span>
            {total > 0 && (
              <button
                onClick={async () => {
                  if (transmittalLoading) return;
                  setTransmittalLoading(true);
                  try {
                    const extraParams = {};
                    if (appliedFrom)
                      extraParams.accomplished_date_from = appliedFrom;
                    if (appliedTo) extraParams.accomplished_date_to = appliedTo;
                    if (appliedStep) extraParams.app_step = appliedStep;

                    // Fetch all records with current filters
                    const firstRes = await getDashboardDetail({
                      metric: metricKey,
                      page: 1,
                      page_size: 500,
                      ...dateParams,
                      ...extraParams,
                    });
                    let rows = firstRes.data.map(toTransmittalRow);

                    for (let p = 2; p <= firstRes.total_pages; p++) {
                      const res = await getDashboardDetail({
                        metric: metricKey,
                        page: p,
                        page_size: 500,
                        ...dateParams,
                        ...extraParams,
                      });
                      rows.push(...res.data.map(toTransmittalRow));
                    }

                    await generatePDF(rows, metricKey);
                    await generateExcel(rows, metricKey);
                  } catch (err) {
                    console.error("Transmittal export failed:", err);
                  } finally {
                    setTransmittalLoading(false);
                  }
                }}
                disabled={transmittalLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 12px",
                  borderRadius: 7,
                  border: `1px solid ${accentColor}`,
                  background: "transparent",
                  color: accentColor,
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  cursor: transmittalLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  opacity: transmittalLoading ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {transmittalLoading
                  ? "⏳ Generating…"
                  : `📄 Transmittal (${total})`}
              </button>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => fetchPage(page - 1)}
              disabled={page <= 1 || loading}
              style={{
                padding: "5px 12px",
                borderRadius: 7,
                border: `1px solid ${page <= 1 ? ui.cardBorder : ui.metricBorder}`,
                background: "transparent",
                color: page <= 1 ? ui.textMuted : ui.textPrimary,
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: page <= 1 ? "not-allowed" : "pointer",
                opacity: page <= 1 ? 0.4 : 1,
                fontFamily: "inherit",
              }}
            >
              ‹ Prev
            </button>
            <span
              style={{
                fontSize: "0.78rem",
                color: ui.textSub,
                padding: "0 8px",
                whiteSpace: "nowrap",
              }}
            >
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchPage(page + 1)}
              disabled={page >= totalPages || loading}
              style={{
                padding: "5px 12px",
                borderRadius: 7,
                border: `1px solid ${page >= totalPages ? ui.cardBorder : ui.metricBorder}`,
                background: "transparent",
                color: page >= totalPages ? ui.textMuted : ui.textPrimary,
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                opacity: page >= totalPages ? 0.4 : 1,
                fontFamily: "inherit",
              }}
            >
              Next ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
