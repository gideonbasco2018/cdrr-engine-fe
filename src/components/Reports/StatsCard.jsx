function StatsCard({ stats, colors, labels }) {
  const statCards = [
    {
      label: labels?.total || "Total Reports",
      value: stats.total,
      icon: labels?.totalIcon || "📊",
      color: "#4CAF50",
    },
    {
      label: labels?.notDecked || "Not Yet Decked",
      value: stats.notDecked,
      icon: labels?.notDeckedIcon || "⏳",
      color: "#f59e0b",
    },
    {
      label: labels?.decked || "Decked",
      value: stats.decked,
      icon: labels?.deckedIcon || "✅",
      color: "#10b981",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "1.5rem",
        marginBottom: "2rem",
      }}
    >
      {statCards.map((stat, index) => (
        <div
          key={index}
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            transition: "all 0.3s ease",
            cursor: "pointer",
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "0.85rem",
                color: colors.textTertiary,
                fontWeight: "500",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {stat.label}
            </span>
            <span style={{ fontSize: "1.5rem" }}>{stat.icon}</span>
          </div>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: "700",
              color: stat.color,
              lineHeight: "1",
            }}
          >
            {stat.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatsCard;
