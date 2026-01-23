// FILE: src/components/dashboard/TopEarnersCard.jsx
function TopEarnersCard({ title, icon, description, earners, color, colors }) {
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <span style={{ fontSize: "1.25rem" }}>{icon}</span>
        <div>
          <h3
            style={{
              fontSize: "1.1rem",
              fontWeight: "600",
              color: colors.textPrimary,
              transition: "color 0.3s ease",
            }}
          >
            {title}
          </h3>
          <p
            style={{
              color: colors.textTertiary,
              fontSize: "0.8rem",
              transition: "color 0.3s ease",
            }}
          >
            {description}
          </p>
        </div>
      </div>
      {earners.map((earner) => (
        <div
          key={earner.rank}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            padding: "1rem 0",
            borderBottom:
              earner.rank < 3 ? `1px solid ${colors.cardBorder}` : "none",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              background: earner.rank === 1 ? color : colors.inputBg,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.85rem",
              fontWeight: "600",
              color: earner.rank === 1 ? "#fff" : colors.textPrimary,
              transition: "all 0.3s ease",
            }}
          >
            {earner.rank}
          </div>
          <div
            style={{
              width: "36px",
              height: "36px",
              background: colors.cardBorderHover,
              borderRadius: "50%",
              transition: "background 0.3s ease",
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: colors.textPrimary,
                fontSize: "0.9rem",
                fontWeight: "500",
                marginBottom: "0.25rem",
                transition: "color 0.3s ease",
              }}
            >
              {earner.name}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                color: color,
                fontSize: "0.95rem",
                fontWeight: "600",
                marginBottom: "0.25rem",
              }}
            >
              {earner.amount}
            </div>
            <div
              style={{
                color: color,
                fontSize: "0.8rem",
              }}
            >
              {earner.percentage}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TopEarnersCard;
