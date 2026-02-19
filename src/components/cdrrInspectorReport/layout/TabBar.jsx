// ── TabBar ───────────────────────────────────────────────────────────────────

export default function TabBar({
  C,
  TABS,
  activeTab,
  catStats,
  totalRecords,
  onTabChange,
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "0",
        marginBottom: "1.2rem",
        borderBottom: `2px solid ${C.border}`,
        flexWrap: "wrap",
      }}
    >
      {TABS.map(({ key, label, icon, specialColor }) => {
        const active = activeTab === key;
        const activeColor = specialColor || "#16a34a";
        const count =
          key === "all"
            ? totalRecords
            : active
              ? totalRecords
              : (catStats[key] ?? 0);

        return (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            style={{
              padding: "0.6rem 1.1rem",
              border: "none",
              borderBottom: `2px solid ${active ? activeColor : "transparent"}`,
              marginBottom: "-2px",
              background: "transparent",
              color: active ? activeColor : C.txt2,
              fontSize: "0.82rem",
              fontWeight: active ? "700" : "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              whiteSpace: "nowrap",
              transition: "all 0.12s",
              borderRadius: "0",
              borderLeft: specialColor ? `1px solid ${C.border}` : undefined,
              marginLeft: key === "pending_froo" ? "0.4rem" : undefined,
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.color = C.txt;
                e.currentTarget.style.background = C.hover;
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.color = C.txt2;
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            {icon} {label}
            <span
              style={{
                padding: "0.06rem 0.42rem",
                borderRadius: "20px",
                fontSize: "0.66rem",
                fontWeight: "700",
                background: active ? activeColor : C.pill,
                color: active ? "#fff" : C.pillTxt,
              }}
            >
              {count}
            </span>
            {specialColor && !active && count > 0 && (
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: activeColor,
                  display: "inline-block",
                  marginLeft: "-2px",
                  flexShrink: 0,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
