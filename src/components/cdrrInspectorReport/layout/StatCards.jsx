// ── StatCards ────────────────────────────────────────────────────────────────

export default function StatCards({ C, totalRecords, catStats }) {
  const STATS = [
    {
      label: "TOTAL REPORTS",
      val: totalRecords,
      icon: "📊",
      iconBg: C._darkMode ? "#1a2a3a" : "#e8f4ff",
      numC: C._darkMode ? "#60a5fa" : "#1d5ea8",
    },
    {
      label: "NON-PICS",
      val: catStats["NON-PICS"],
      icon: "📋",
      iconBg: C._darkMode ? "#2a1a1a" : "#fff3e0",
      numC: C._darkMode ? "#fb923c" : "#c2500a",
    },
    {
      label: "PICS",
      val: catStats["PICS"],
      icon: "🔬",
      iconBg: C._darkMode ? "#1e1a2e" : "#f0e8ff",
      numC: C._darkMode ? "#a78bfa" : "#6d28d9",
    },
    {
      label: "LETTER & CORRECTION",
      val: catStats["LETTER AND CORRECTION"],
      icon: "✉️",
      iconBg: C._darkMode ? "#1a2a1a" : "#e6fdf1",
      numC: C._darkMode ? "#34d399" : "#0a7a52",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(195px,1fr))",
        gap: "0.85rem",
        marginBottom: "1.2rem",
      }}
    >
      {STATS.map((s, i) => (
        <div
          key={i}
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: "12px",
            padding: "1rem 1.2rem",
            display: "flex",
            alignItems: "center",
            gap: "0.9rem",
            boxShadow: C.shadow,
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "11px",
              background: s.iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              flexShrink: 0,
            }}
          >
            {s.icon}
          </div>
          <div>
            <div
              style={{
                fontSize: "0.63rem",
                fontWeight: "700",
                color: C.txt3,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "0.1rem",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: "1.95rem",
                fontWeight: "800",
                color: s.numC,
                lineHeight: 1,
              }}
            >
              {s.val}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
