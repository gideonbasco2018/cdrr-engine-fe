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

function BreakdownPanel({
  ui,
  darkMode,
  loading,
  error,
  items,
  grandTotal,
  groupKey,
  groupLabel,
  labelKey = "generic_name",
  valueKey,
  valueLabel,
  exportFilename = "breakdown",
}) {
  const chartData = useMemo(() => {
    if (!items?.length) return null;
    const sorted = [...items].sort((a, b) => a[valueKey] - b[valueKey]);
    return {
      labels: sorted.map((r) => r[labelKey]),
      datasets: [
        {
          label: valueLabel,
          data: sorted.map((r) => r[valueKey]),
          backgroundColor: FB,
          borderRadius: 4,
          maxBarThickness: 26,
        },
      ],
    };
  }, [items, valueKey, labelKey, valueLabel]);

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
    const headers = [groupLabel, "Generic Name", valueLabel];
    const rows = items.map((row) => [
      escapeCsvValue(row[groupKey]),
      escapeCsvValue(row[labelKey]),
      escapeCsvValue(row[valueKey]),
    ]);
    const csvContent = [
      headers.join(","),
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

  if (loading) {
    return (
      <div
        style={{
          ...cardStyle,
          padding: "40px",
          textAlign: "center",
          color: ui.textMuted,
          fontSize: "0.85rem",
          fontFamily: font,
        }}
      >
        Loading breakdown…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          ...cardStyle,
          padding: "24px",
          textAlign: "center",
          color: "#f87171",
          fontSize: "0.85rem",
          fontFamily: font,
        }}
      >
        {error}
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div
        style={{
          ...cardStyle,
          padding: "40px",
          textAlign: "center",
          color: ui.textMuted,
          fontSize: "0.85rem",
          fontFamily: font,
        }}
      >
        No in-progress applications found.
      </div>
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
          Total In-Progress Applications
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
            gridTemplateColumns: "1.6fr 2fr 0.9fr",
            background: colHdr,
            borderBottom: `1px solid ${ui.divider}`,
          }}
        >
          {[groupLabel, "Generic Name", valueLabel].map((col) => (
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
                gridTemplateColumns: "1.6fr 2fr 0.9fr",
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
                  fontSize: "0.76rem",
                  color: ui.textSub,
                  alignSelf: "center",
                }}
              >
                {row[groupKey]}
              </span>
              <span
                style={{
                  padding: "9px 14px",
                  fontSize: "0.78rem",
                  color: ui.textPrimary,
                  fontWeight: 500,
                  alignSelf: "center",
                }}
              >
                {row[labelKey]}
              </span>
              <span
                style={{
                  padding: "9px 14px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: FB,
                  alignSelf: "center",
                }}
              >
                {row[valueKey]}
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
            {valueLabel} by Generic Name
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

export default BreakdownPanel;
