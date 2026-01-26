// FILE: src/components/dashboard/ServicesRevenuePie.jsx
function ServicesRevenuePie({ colors }) {
  const services = [
    { label: "Backlog Application", percent: "58.1%", color: "#10b981" },
    { label: "On process Application", percent: "7.8%", color: "#3b82f6" },
    { label: "Completed Application", percent: "34.4%", color: "#8b5cf6" },
  ];

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
      <h3
        style={{
          fontSize: "1.1rem",
          fontWeight: "600",
          color: colors.textPrimary,
          marginBottom: "1.5rem",
          transition: "color 0.3s ease",
        }}
      >
        Backlog Application
      </h3>
      <div
        style={{
          width: "180px",
          height: "180px",
          margin: "0 auto 1.5rem",
          borderRadius: "50%",
          background:
            "conic-gradient(#10b981 0deg 210deg, #3b82f6 210deg 238deg, #8b5cf6 238deg 360deg)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "120px",
            height: "120px",
            background: colors.pieCenterBg,
            borderRadius: "50%",
            transition: "background 0.3s ease",
          }}
        />
      </div>
      <div style={{ fontSize: "0.85rem" }}>
        {services.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.5rem 0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: item.color,
                }}
              />
              <span
                style={{
                  color: colors.textSecondary,
                  transition: "color 0.3s ease",
                }}
              >
                {item.label}
              </span>
            </div>
            <span style={{ color: item.color, fontWeight: "600" }}>
              {item.percent}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: "1rem",
          paddingTop: "1rem",
          borderTop: `1px solid ${colors.cardBorder}`,
          textAlign: "center",
          transition: "border-color 0.3s ease",
        }}
      >
        <div
          style={{
            color: colors.textTertiary,
            fontSize: "0.8rem",
            marginBottom: "0.25rem",
            transition: "color 0.3s ease",
          }}
        >
          Total backlog as of today:
        </div>
        <div
          style={{
            color: colors.textPrimary,
            fontSize: "1.25rem",
            fontWeight: "600",
            transition: "color 0.3s ease",
          }}
        >
          29,221
        </div>
      </div>
    </div>
  );
}

export default ServicesRevenuePie;
