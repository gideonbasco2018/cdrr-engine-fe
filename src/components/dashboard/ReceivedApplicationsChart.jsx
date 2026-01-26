// FILE: src/components/dashboard/ReceivedApplicationsChart.jsx
function ReceivedApplicationsChart({
  chartData,
  chartLoading,
  chartBreakdown,
  selectedYear,
  onBreakdownChange,
  onYearChange,
  colors,
}) {
  const getMaxValue = () => {
    if (chartData.length === 0) return 100;
    return Math.max(...chartData.map((item) => item.total)) * 1.2;
  };

  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "12px",
        padding: "1.5rem",
        transition: "all 0.3s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h3
          style={{
            fontSize: "1.1rem",
            fontWeight: "600",
            color: colors.textPrimary,
            transition: "color 0.3s ease",
          }}
        >
          Received Applications
        </h3>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <select
            value={chartBreakdown}
            onChange={(e) => onBreakdownChange(e.target.value)}
            style={{
              padding: "0.5rem 1rem",
              background: colors.inputBg,
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: "6px",
              color: colors.textPrimary,
              fontSize: "0.85rem",
              cursor: "pointer",
              outline: "none",
              transition: "all 0.3s ease",
            }}
          >
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
          {chartBreakdown === "month" && (
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(parseInt(e.target.value))}
              style={{
                padding: "0.5rem 1rem",
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "6px",
                color: colors.textPrimary,
                fontSize: "0.85rem",
                cursor: "pointer",
                outline: "none",
                transition: "all 0.3s ease",
              }}
            >
              {[2023, 2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: "250px", position: "relative" }}>
        {chartLoading ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.textTertiary,
            }}
          >
            ⏳ Loading chart...
          </div>
        ) : chartData.length === 0 ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.textTertiary,
              border: `1px dashed ${colors.chartBorderDashed}`,
              borderRadius: "8px",
            }}
          >
            📊 No data available
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-around",
              height: "100%",
              gap: "0.5rem",
              paddingBottom: "2rem",
            }}
          >
            {chartData.map((item, index) => {
              const maxValue = getMaxValue();
              const fdacHeight = (item.fdac / maxValue) * 100;
              const centralHeight = (item.central / maxValue) * 100;

              return (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      gap: "2px",
                      justifyContent: "center",
                      alignItems: "flex-end",
                      height: "180px",
                    }}
                  >
                    <div
                      style={{
                        width: "40%",
                        height: `${fdacHeight}%`,
                        background: "#3b82f6",
                        borderRadius: "4px 4px 0 0",
                        transition: "all 0.3s ease",
                        cursor: "pointer",
                      }}
                      title={`FDAC: ${item.fdac}`}
                    />
                    <div
                      style={{
                        width: "40%",
                        height: `${centralHeight}%`,
                        background: "#10b981",
                        borderRadius: "4px 4px 0 0",
                        transition: "all 0.3s ease",
                        cursor: "pointer",
                      }}
                      title={`Central: ${item.central}`}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: colors.textTertiary,
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "100%",
                    }}
                  >
                    {chartBreakdown === "month"
                      ? item.period.substring(0, 3)
                      : item.period}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1.5rem",
          marginTop: "1rem",
          paddingTop: "1rem",
          borderTop: `1px solid ${colors.cardBorder}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              background: "#3b82f6",
              borderRadius: "2px",
            }}
          />
          <span style={{ fontSize: "0.85rem", color: colors.textSecondary }}>
            FDAC
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              background: "#10b981",
              borderRadius: "2px",
            }}
          />
          <span style={{ fontSize: "0.85rem", color: colors.textSecondary }}>
            Central
          </span>
        </div>
      </div>
    </div>
  );
}

export default ReceivedApplicationsChart;
