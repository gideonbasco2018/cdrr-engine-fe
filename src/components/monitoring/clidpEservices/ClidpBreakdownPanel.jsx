// src/components/monitoring/clidpEservices/ClidpBreakdownPanel.jsx
import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const FB = "#1877F2";
const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const VALUE_KEY = "application_count";
const VALUE_LABEL = "Application Count";
const CATEGORY_LABEL = "Pharmacologic Category";
const GENERIC_LABEL = "Generic Name";

function ClidpBreakdownPanel({
  ui,
  darkMode,
  loading,
  error,
  items,
  grandTotal,
  showGenericName = true,
  totalLabel = "Total Applications",
  emptyMessage = "No applications found.",
  exportFilename = "clidp-eservices-breakdown",
}) {
  // Groups without generic names (e.g. cancer) are shown per category only.
  const labelKey = showGenericName ? "generic_name" : "pharmacologic_category";
  const labelHeader = showGenericName ? GENERIC_LABEL : CATEGORY_LABEL;
  const columns = showGenericName
    ? [CATEGORY_LABEL, GENERIC_LABEL, VALUE_LABEL]
    : [CATEGORY_LABEL, VALUE_LABEL];
  const gridCols = showGenericName ? "1.6fr 2fr 0.9fr" : "3.6fr 0.9fr";

  const chartData = useMemo(() => {
    if (!items?.length) return null;
    const sorted = [...items].sort((a, b) => a[VALUE_KEY] - b[VALUE_KEY]);
    return {
      labels: sorted.map((r) => r[labelKey]),
      datasets: [
        {
          label: VALUE_LABEL,
          data: sorted.map((r) => r[VALUE_KEY]),
          backgroundColor: FB,
          borderRadius: 4,
          maxBarThickness: 26,
        },
      ],
    };
  }, [items, labelKey]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: darkMode ? "#242526" : "#fff",
        titleColor: ui.textPrimary,
        bodyColor: ui.textSub,
        borderColor: ui.cardBorder,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { color: ui.gridLine },
        ticks: { color: ui.textMuted, font: { size: 10 } },
        beginAtZero: true,
      },
      y: {
        grid: { display: false },
        ticks: {
          color: ui.textSub,
          font: { size: 10.5 },
          autoSkip: false,
        },
      },
    },
  };

  // ── CSV Export ──────────────────────────────────────────────────────
  const escapeCsvValue = (val) => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportCsv = () => {
    if (!items?.length) return;
    const rows = items.map((row) => {
      const cells = showGenericName
        ? [row.pharmacologic_category, row.generic_name, row[VALUE_KEY]]
        : [row.pharmacologic_category, row[VALUE_KEY]];
      return cells.map(escapeCsvValue);
    });
    const csvContent = [
      columns.map(escapeCsvValue).join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([`\ufeff${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `${exportFilename}-${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const colHdr = darkMode ? ui.sidebarBg : "#f8f9fd";
  const cardStyle = {
    background: ui.cardBg,
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 12,
    overflow: "hidden",
  };
  const messageStyle = {
    ...cardStyle,
    padding: "40px",
    textAlign: "center",
    fontSize: "0.85rem",
    fontFamily: font,
  };

  if (loading) {
    return (
      <div style={{ ...messageStyle, color: ui.textMuted }}>
        Loading breakdown…
      </div>
    );
  }

  if (error) {
    return <div style={{ ...messageStyle, color: "#f87171" }}>{error}</div>;
  }

  if (!items?.length) {
    return (
      <div style={{ ...messageStyle, color: ui.textMuted }}>{emptyMessage}</div>
    );
  }

  const chartInnerHeight = Math.max(340, items.length * 30);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        fontFamily: font,
      }}
    >
      {/* Grand total strip */}
      <div
        style={{
          ...cardStyle,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{ fontSize: "0.8rem", fontWeight: 600, color: ui.textSub }}
        >
          {totalLabel}
        </span>
        <span style={{ fontSize: "1.4rem", fontWeight: 800, color: FB }}>
          {grandTotal.toLocaleString()}
        </span>
      </div>

      {/* Table */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            background: colHdr,
            borderBottom: `1px solid ${ui.divider}`,
          }}
        >
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: ui.textMuted,
            }}
          >
            Breakdown Table
          </span>
          <button
            onClick={handleExportCsv}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              fontSize: "0.75rem",
              fontWeight: 600,
              borderRadius: 6,
              border: `1px solid ${FB}`,
              background: "transparent",
              color: FB,
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            ⬇ Export CSV
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridCols,
            background: colHdr,
            borderBottom: `1px solid ${ui.divider}`,
          }}
        >
          {columns.map((col) => (
            <span
              key={col}
              style={{
                fontSize: "0.66rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: ui.textMuted,
                padding: "9px 14px",
              }}
            >
              {col}
            </span>
          ))}
        </div>
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {items.map((row, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: gridCols,
                borderBottom:
                  i < items.length - 1 ? `1px solid ${ui.divider}` : "none",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = ui.hoverBg)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span
                style={{
                  padding: "9px 14px",
                  fontSize: showGenericName ? "0.76rem" : "0.78rem",
                  color: showGenericName ? ui.textSub : ui.textPrimary,
                  fontWeight: showGenericName ? 400 : 500,
                  alignSelf: "center",
                }}
              >
                {row.pharmacologic_category}
              </span>
              {showGenericName && (
                <span
                  style={{
                    padding: "9px 14px",
                    fontSize: "0.78rem",
                    color: ui.textPrimary,
                    fontWeight: 500,
                    alignSelf: "center",
                  }}
                >
                  {row.generic_name}
                </span>
              )}
              <span
                style={{
                  padding: "9px 14px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: FB,
                  alignSelf: "center",
                }}
              >
                {row[VALUE_KEY]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      {chartData && (
        <div style={{ ...cardStyle, padding: "16px 20px 24px" }}>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: ui.textMuted,
            }}
          >
            {VALUE_LABEL} by {labelHeader}
          </p>
          <div style={{ height: 480, overflowY: "auto", overflowX: "auto" }}>
            <div style={{ height: chartInnerHeight, minWidth: 500 }}>
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClidpBreakdownPanel;
