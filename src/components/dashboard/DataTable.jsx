import { useState } from "react";
import { FB } from "./constants";

// Clickable number. 0 / empty is plain text so an empty modal never opens.
function ClickableValue({ value, color, onClick, disabled }) {
  const n = value ?? 0;
  if (!n || disabled || !onClick) {
    return <span style={{ color }}>{n.toLocaleString()}</span>;
  }
  return (
    <button
      onClick={onClick}
      title="Click for details"
      style={{
        background: "none",
        border: "none",
        padding: 0,
        color,
        font: "inherit",
        fontWeight: "inherit",
        cursor: "pointer",
        textDecoration: "underline",
        textUnderlineOffset: 3,
        textDecorationColor: `${color}66`,
      }}
    >
      {n.toLocaleString()}
    </button>
  );
}

export default function DataTable({
  chartData,
  chartTotals,
  breakdown,
  chartSubtitle,
  chartLoading,
  onTableCellClick, // (metricKey, label | null) => void
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
                      { key: "received", val: row.received, color: "#1877F2" },
                      {
                        key: "completed",
                        val: row.completed,
                        color: "#36a420",
                      },
                    ].map((c) => (
                      <td
                        key={c.key}
                        style={{
                          padding: "7px 12px",
                          textAlign: "right",
                          color: c.color,
                          fontWeight: 700,
                          borderBottom: border,
                        }}
                      >
                        <ClickableValue
                          value={c.val}
                          color={c.color}
                          onClick={
                            onTableCellClick
                              ? () => onTableCellClick(c.key, row.label)
                              : undefined
                          }
                        />
                      </td>
                    ))}
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
                  {
                    key: "received",
                    val: chartTotals.received,
                    color: "#1877F2",
                  },
                  {
                    key: "completed",
                    val: chartTotals.completed,
                    color: "#36a420",
                  },
                ].map((c) => (
                  <td
                    key={c.key}
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      fontWeight: 800,
                      color: c.color,
                      fontSize: "0.82rem",
                    }}
                  >
                    <ClickableValue
                      value={c.val}
                      color={c.color}
                      onClick={
                        onTableCellClick
                          ? () => onTableCellClick(c.key, null)
                          : undefined
                      }
                    />
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!chartLoading && (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontSize: "0.72rem",
            color: ui.textMuted,
            lineHeight: 1.4,
          }}
        >
          <span>
            <strong style={{ color: "#1877F2" }}>Total Received</strong>: tasks
            assigned to you on that date.
          </span>
          <span>
            <strong style={{ color: "#36a420" }}>Completed</strong>: tasks you
            finished on that date, even if they were received earlier.
          </span>
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
