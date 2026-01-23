// FILE: src/components/dashboard/StatsCard.jsx
function StatsCard({ stat, loading, colors }) {
  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "12px",
        padding: "1.25rem",
        transition: "all 0.3s ease",
        cursor: "pointer",
        opacity: loading ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.borderColor = colors.cardBorderHover;
          e.currentTarget.style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.cardBorder;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            background: stat.color + "20",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.1rem",
          }}
        >
          {stat.icon}
        </div>
        <span
          style={{
            color: colors.textSecondary,
            fontSize: "0.85rem",
            fontWeight: "500",
            transition: "color 0.3s ease",
          }}
        >
          {stat.label}
        </span>
      </div>
      <div
        style={{
          fontSize: "1.75rem",
          fontWeight: "600",
          color: colors.textPrimary,
          marginBottom: "0.5rem",
          transition: "color 0.3s ease",
        }}
      >
        {stat.value}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span
          style={{
            color: stat.isPositive ? "#4CAF50" : "#ef4444",
            fontSize: "0.85rem",
            fontWeight: "600",
          }}
        >
          {stat.change}
        </span>
        <span
          style={{
            color: colors.textTertiary,
            fontSize: "0.8rem",
            transition: "color 0.3s ease",
          }}
        >
          vs last month
        </span>
      </div>
    </div>
  );
}

export default StatsCard;
