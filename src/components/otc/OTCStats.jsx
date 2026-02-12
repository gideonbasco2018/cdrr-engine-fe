// FILE: src/components/otc/OTCStats.jsx

export default function OTCStats({ stats, colors }) {
  const items = [
    {
      label: "TOTAL REPORTS",
      value: stats?.total ?? 0,
      icon: "📊",
      color: "#2196F3",
    },
    {
      label: "NOT YET DECKED",
      value: stats?.notYetDecked ?? 0,
      icon: "⏳",
      color: "#FF9800",
    },
    {
      label: "DECKED",
      value: stats?.decked ?? 0,
      icon: "✅",
      color: "#4CAF50",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "1rem",
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              background: `${item.color}15`,
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              flexShrink: 0,
            }}
          >
            {item.icon}
          </div>
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
              {item.label}
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: "700",
                color: item.color,
                lineHeight: 1,
              }}
            >
              {(item.value || 0).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
