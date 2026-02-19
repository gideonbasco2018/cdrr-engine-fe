// ── Shared badge / pill components ──────────────────────────────────────────

export function Pill({ children, bg, color, border }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.16rem 0.52rem",
        borderRadius: "20px",
        fontSize: "0.69rem",
        fontWeight: "700",
        letterSpacing: "0.03em",
        background: bg,
        color,
        border: `1px solid ${border || bg}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function TimelinePill({ days, C, darkMode }) {
  if (days === null) return <span style={{ color: C.txt3 }}>—</span>;
  const ok = days <= 60;
  return (
    <Pill
      bg={
        ok
          ? darkMode ? "rgba(16,185,129,0.14)" : "#dcfce7"
          : darkMode ? "rgba(239,68,68,0.14)" : "#fee2e2"
      }
      color={
        ok
          ? darkMode ? "#10b981" : "#166534"
          : darkMode ? "#ef4444" : "#991b1b"
      }
      border={
        ok
          ? darkMode ? "rgba(16,185,129,0.3)" : "#bbf7d0"
          : darkMode ? "rgba(239,68,68,0.3)" : "#fecaca"
      }
    >
      {ok ? "✓ Within" : "✗ Beyond"}
    </Pill>
  );
}

export function StatusPill({ status, C, darkMode }) {
  if (!status) return <span style={{ color: C.txt3 }}>—</span>;
  const m = {
    completed: [
      "#dcfce7", "#166534", "#bbf7d0",
      "rgba(16,185,129,0.14)", "#10b981", "rgba(16,185,129,0.3)",
    ],
    pending: [
      "#fef3c7", "#92400e", "#fde68a",
      "rgba(245,158,11,0.14)", "#f59e0b", "rgba(245,158,11,0.3)",
    ],
    "in progress": [
      "#dbeafe", "#1e40af", "#bfdbfe",
      "rgba(59,130,246,0.14)", "#3b82f6", "rgba(59,130,246,0.3)",
    ],
    cancelled: [
      "#fee2e2", "#991b1b", "#fecaca",
      "rgba(239,68,68,0.14)", "#ef4444", "rgba(239,68,68,0.3)",
    ],
  };
  const c = m[status.toLowerCase()];
  if (!c)
    return (
      <Pill bg={C.pill} color={C.txt2} border={C.border}>
        {status}
      </Pill>
    );
  return (
    <Pill
      bg={darkMode ? c[3] : c[0]}
      color={darkMode ? c[4] : c[1]}
      border={darkMode ? c[5] : c[2]}
    >
      {status}
    </Pill>
  );
}

export function CatPill({ cat, C, darkMode }) {
  if (!cat) return <span style={{ color: C.txt3 }}>—</span>;
  const m = {
    "NON-PICS": [
      "#dbeafe", "#1e40af", "#bfdbfe",
      "rgba(59,130,246,0.14)", "#3b82f6", "rgba(59,130,246,0.3)",
    ],
    PICS: [
      "#ede9fe", "#5b21b6", "#ddd6fe",
      "rgba(139,92,246,0.14)", "#8b5cf6", "rgba(139,92,246,0.3)",
    ],
    "LETTER AND CORRECTION": [
      "#ffedd5", "#9a3412", "#fed7aa",
      "rgba(249,115,22,0.14)", "#f97316", "rgba(249,115,22,0.3)",
    ],
  };
  const c = m[cat];
  if (!c)
    return (
      <Pill bg={C.pill} color={C.txt2} border={C.border}>
        {cat}
      </Pill>
    );
  return (
    <Pill
      bg={darkMode ? c[3] : c[0]}
      color={darkMode ? c[4] : c[1]}
      border={darkMode ? c[5] : c[2]}
    >
      {cat}
    </Pill>
  );
}

export function SortIcon({ col, sortBy, sortOrder }) {
  return (
    <span
      style={{
        opacity: sortBy === col ? 1 : 0.2,
        fontSize: "0.58rem",
        marginLeft: "2px",
      }}
    >
      {sortBy === col ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );
}
