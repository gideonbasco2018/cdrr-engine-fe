// FILE: src/components/groupManagement/StatsCards.jsx

function StatsCards({ groups, allUsers, colors, darkMode }) {
  const stats = [
    {
      label: "Total Groups",
      value: groups.length,
      icon: "📂",
      color: "#6366f1",
    },
    {
      label: "Total Users",
      value: allUsers.length,
      icon: "👥",
      color: "#22c55e",
    },
    {
      label: "Active Users",
      value: allUsers.filter((u) => u.is_active).length,
      icon: "✓",
      color: "#f59e0b",
    },
  ];

  return (
    <div
      style={{
        padding: "1rem 1rem",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "1rem",
      }}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            padding: "1rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            maxHeight: "80%",
          }}
        >
          <div
            style={{
              width: "29px",
              height: "29px",
              borderRadius: "10px",
              background: darkMode ? `${stat.color}18` : `${stat.color}12`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: ".7rem",
            }}
          >
            {stat.icon}
          </div>
          <div>
            <div
              style={{
                fontSize: "0.7rem",
                color: colors.textTertiary,
                fontWeight: "600",
                letterSpacing: "0.04em",
              }}
            >
              {stat.label.toUpperCase()}
            </div>
            <div
              style={{
                fontSize: ".7rem",
                fontWeight: "700",
                color: colors.textPrimary,
              }}
            >
              {stat.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatsCards;
