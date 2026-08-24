import { useState } from "react";
import { FB } from "./constants";

export default function DataTable({
  chartData,
  chartTotals,
  breakdown,
  chartSubtitle,
  chartLoading,
  ui,
}) {
  const TABLE_PAGE_SIZE = 13;
  const [tablePage, setTablePage] = useState(0);
  const totalPages = Math.ceil(chartData.length / TABLE_PAGE_SIZE);
  const safePage = Math.min(tablePage, Math.max(0, totalPages - 1));
  const pagedRows = chartData.slice(
    safePage * TABLE_PAGE_SIZE,
    (safePage + 1) * TABLE_PAGE_SIZE,
  );
  const startRow = safePage * TABLE_PAGE_SIZE + 1;
  const endRow = Math.min(startRow + TABLE_PAGE_SIZE - 1, chartData.length);
  const unitLabel =
    breakdown === "day" ? "day" : breakdown === "month" ? "month" : "year";
  const colLabel =
    breakdown === "day" ? "Day" : breakdown === "month" ? "Month" : "Year";

  return (
    <div
      style={{ borderTop: `1px solid ${ui.divider}`, padding: "0 16px 16px" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 0 8px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.8rem",
            fontWeight: 700,
            color: ui.textPrimary,
          }}
        >
          Data Table{" "}
          <span
            style={{
              marginLeft: 8,
              fontSize: "0.72rem",
              fontWeight: 400,
              color: ui.textMuted,
            }}
          >
            📅 {chartSubtitle}
          </span>
        </p>
        <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
          {chartData.length > 0
            ? `${startRow}–${endRow} of ${chartData.length} ${unitLabel}${chartData.length !== 1 ? "s" : ""}`
            : ""}
        </span>
      </div>

      {chartLoading ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: ui.textMuted,
            fontSize: "0.82rem",
          }}
        >
          ⏳ Loading data…
        </div>
      ) : (
        <div
          style={{
            overflowX: "auto",
            borderRadius: 8,
            border: `1px solid ${ui.cardBorder}`,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.8rem",
              fontFamily: "inherit",
            }}
          >
            <thead>
              <tr style={{ background: ui.pageBg }}>
                {[
                  { label: colLabel, align: "left", color: null },
                  { label: "Total Received", align: "right", color: "#1877F2" },
                  { label: "Completed", align: "right", color: "#36a420" },
                  { label: "On Process", align: "right", color: "#f59e0b" },
                  { label: "Target", align: "right", color: "#9333ea" },
                  { label: "Completed Rate", align: "right", color: "#9333ea" },
                ].map((col, ci) => (
                  <th
                    key={ci}
                    style={{
                      padding: "8px 12px",
                      textAlign: col.align,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: col.color || ui.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      borderBottom: `1px solid ${ui.cardBorder}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row, ri) => {
                const rateN = row.completedRate;
                const isEven = ri % 2 === 0,
                  isLast = ri === pagedRows.length - 1;
                const border = !isLast ? `1px solid ${ui.divider}` : "none";
                return (
                  <tr
                    key={ri}
                    style={{
                      background: isEven ? "transparent" : `${ui.pageBg}88`,
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
                        padding: "7px 12px",
                        color: ui.textPrimary,
                        fontWeight: 600,
                        borderBottom: border,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.label}
                      {breakdown === "day" && (
                        <span
                          style={{
                            marginLeft: 4,
                            fontSize: "0.68rem",
                            color: ui.textMuted,
                            fontWeight: 400,
                          }}
                        >
                          {chartSubtitle?.split(" ")[0]}
                        </span>
                      )}
                    </td>
                    {[
                      { val: row.received, color: "#1877F2" },
                      { val: row.completed, color: "#36a420" },
                      { val: row.onProcess, color: "#f59e0b" },
                    ].map((c, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: "7px 12px",
                          textAlign: "right",
                          color: c.color,
                          fontWeight: 700,
                          borderBottom: border,
                        }}
                      >
                        {c.val.toLocaleString()}
                      </td>
                    ))}
                    <td
                      style={{
                        padding: "7px 12px",
                        textAlign: "right",
                        color: "#9333ea",
                        fontWeight: 700,
                        borderBottom: border,
                      }}
                    >
                      {row.target > 0 ? row.target.toLocaleString() : "—"}
                    </td>
                    <td
                      style={{
                        padding: "7px 12px",
                        textAlign: "right",
                        borderBottom: border,
                      }}
                    >
                      {rateN !== null ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: "0.73rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 99,
                            color:
                              rateN >= 75
                                ? "#36a420"
                                : rateN >= 50
                                  ? "#f59e0b"
                                  : "#e02020",
                            background:
                              rateN >= 75
                                ? "#e9f7e6"
                                : rateN >= 50
                                  ? "#fff8e7"
                                  : "#fde8e8",
                          }}
                        >
                          {rateN >= 75 ? "▲" : rateN >= 50 ? "~" : "▼"}{" "}
                          {rateN.toFixed(1)}%
                        </span>
                      ) : (
                        <span
                          style={{ color: ui.textMuted, fontSize: "0.73rem" }}
                        >
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr
                style={{
                  background: ui.pageBg,
                  borderTop: `2px solid ${ui.cardBorder}`,
                }}
              >
                <td
                  style={{
                    padding: "8px 12px",
                    fontWeight: 700,
                    color: ui.textPrimary,
                    fontSize: "0.78rem",
                  }}
                >
                  Total
                </td>
                {[
                  { val: chartTotals.received, color: "#1877F2" },
                  { val: chartTotals.completed, color: "#36a420" },
                  { val: chartTotals.onProcess, color: "#f59e0b" },
                  { val: chartTotals.target, color: "#9333ea" },
                ].map((c, ci) => (
                  <td
                    key={ci}
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      fontWeight: 800,
                      color: c.color,
                      fontSize: "0.82rem",
                    }}
                  >
                    {(c.val ?? 0).toLocaleString()}
                  </td>
                ))}
                {(() => {
                  const n = chartTotals.completedRate;
                  return (
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                      {n !== null ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: 99,
                            color:
                              n >= 75
                                ? "#36a420"
                                : n >= 50
                                  ? "#f59e0b"
                                  : "#e02020",
                            background:
                              n >= 75
                                ? "#e9f7e6"
                                : n >= 50
                                  ? "#fff8e7"
                                  : "#fde8e8",
                          }}
                        >
                          {n >= 75 ? "▲" : n >= 50 ? "~" : "▼"} {n.toFixed(1)}%
                        </span>
                      ) : (
                        <span style={{ color: ui.textMuted }}>—</span>
                      )}
                    </td>
                  );
                })()}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 10,
            gap: 8,
          }}
        >
          <span style={{ fontSize: "0.74rem", color: ui.textMuted }}>
            Page {safePage + 1} of {totalPages}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => setTablePage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: `1px solid ${safePage === 0 ? ui.cardBorder : ui.metricBorder}`,
                background: "transparent",
                color: safePage === 0 ? ui.textMuted : ui.textPrimary,
                fontSize: "0.76rem",
                fontWeight: 600,
                cursor: safePage === 0 ? "not-allowed" : "pointer",
                opacity: safePage === 0 ? 0.4 : 1,
                fontFamily: "inherit",
              }}
            >
              ‹ Prev
            </button>
            {Array.from({ length: totalPages }, (_, pi) => {
              const show =
                pi === 0 ||
                pi === totalPages - 1 ||
                Math.abs(pi - safePage) <= 1;
              const showEllipsisBefore = pi === safePage - 2 && pi > 1;
              const showEllipsisAfter =
                pi === safePage + 2 && pi < totalPages - 2;
              if (!show && !showEllipsisBefore && !showEllipsisAfter)
                return null;
              if (showEllipsisBefore || showEllipsisAfter)
                return (
                  <span
                    key={pi}
                    style={{
                      fontSize: "0.74rem",
                      color: ui.textMuted,
                      padding: "0 2px",
                    }}
                  >
                    …
                  </span>
                );
              const isActive = pi === safePage;
              return (
                <button
                  key={pi}
                  onClick={() => setTablePage(pi)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: `1px solid ${isActive ? FB : ui.cardBorder}`,
                    background: isActive ? FB : "transparent",
                    color: isActive ? "#fff" : ui.textPrimary,
                    fontSize: "0.76rem",
                    fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {pi + 1}
                </button>
              );
            })}
            <button
              onClick={() =>
                setTablePage((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={safePage === totalPages - 1}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: `1px solid ${safePage === totalPages - 1 ? ui.cardBorder : ui.metricBorder}`,
                background: "transparent",
                color:
                  safePage === totalPages - 1 ? ui.textMuted : ui.textPrimary,
                fontSize: "0.76rem",
                fontWeight: 600,
                cursor: safePage === totalPages - 1 ? "not-allowed" : "pointer",
                opacity: safePage === totalPages - 1 ? 0.4 : 1,
                fontFamily: "inherit",
              }}
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
