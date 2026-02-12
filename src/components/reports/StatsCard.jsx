// FILE: src/components/reports/StatsCard.jsx
// ✅ FIXED: Layout to match screenshot - icon on left, label and value stacked on right

function StatsCard({ stats, colors, labels }) {
  const statCards = [
    {
      label: labels?.total || "TOTAL REPORTS",
      value: stats.total,
      icon: labels?.totalIcon || "📊",
      color: "#2196F3",
    },
    {
      label: labels?.notDecked || "NOT YET DECKED",
      value: stats.notDecked,
      icon: labels?.notDeckedIcon || "⏳",
      color: "#FF9800",
    },
    {
      label: labels?.decked || "DECKED",
      value: stats.decked,
      icon: labels?.deckedIcon || "✅",
      color: "#4CAF50",
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: "1rem",
        marginBottom: "1rem",
      }}
    >
      {statCards.map((stat, index) => (
        <div
          key={index}
          style={{
            flex: 1,
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = colors.cardBorderHover;
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = colors.cardBorder;
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {/* Icon Container - LEFT SIDE */}
          <div
            style={{
              width: "48px",
              height: "48px",
              background: `${stat.color}15`,
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              flexShrink: 0,
            }}
          >
            {stat.icon}
          </div>

          {/* Label and Value - RIGHT SIDE (Stacked) */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "0.75rem",
                color: colors.textTertiary,
                fontWeight: "500",
                marginBottom: "0.25rem",
                letterSpacing: "0.5px",
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: "700",
                color: stat.color,
                lineHeight: 1,
              }}
            >
              {stat.value.toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatsCard;
