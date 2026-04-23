// FILE: src/pages/monitoring/activityFeed/ActivityFeedView.jsx

const FB = "#1877F2";

const ACTIVITY_FEED = [
  {
    id: 1,
    user: "Maria Santos",
    action: "completed evaluation",
    target: "Amoxil-500 (Amoxicillin)",
    time: "2 min ago",
    icon: "✅",
    color: "#36a420",
  },
  {
    id: 2,
    user: "Juan dela Cruz",
    action: "flagged for compliance",
    target: "Furacef-750 (Cefuroxime Sodium)",
    time: "14 min ago",
    icon: "🚩",
    color: "#f59e0b",
  },
  {
    id: 3,
    user: "Pedro Reyes",
    action: "submitted for QA",
    target: "Prevnar-13 (Pneumococcal Vaccine)",
    time: "32 min ago",
    icon: "🔍",
    color: FB,
  },
  {
    id: 4,
    user: "Ana Gonzales",
    action: "disapproved application",
    target: "Cipro-500 (Ciprofloxacin HCl)",
    time: "1 hr ago",
    icon: "❌",
    color: "#e02020",
  },
  {
    id: 5,
    user: "Jose Bautista",
    action: "started evaluation",
    target: "Metformin-500 (Metformin HCl)",
    time: "1 hr ago",
    icon: "▶️",
    color: "#9333ea",
  },
  {
    id: 6,
    user: "Liza Reyes",
    action: "released document",
    target: "Calpol-250 (Paracetamol)",
    time: "2 hr ago",
    icon: "📤",
    color: "#36a420",
  },
  {
    id: 7,
    user: "Maria Santos",
    action: "started evaluation",
    target: "Losartan-50 (Losartan Potassium)",
    time: "3 hr ago",
    icon: "▶️",
    color: "#9333ea",
  },
  {
    id: 8,
    user: "Pedro Reyes",
    action: "completed evaluation",
    target: "MMR-II (MMR Vaccine)",
    time: "4 hr ago",
    icon: "✅",
    color: "#36a420",
  },
];

function Card({ children, style = {}, ui }) {
  return (
    <div
      style={{
        background: ui.cardBg,
        border: `1px solid ${ui.cardBorder}`,
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default function ActivityFeedView({
  ui,
  darkMode,
  activitySearch,
  setActivitySearch,
}) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const inputSt = {
    background: ui.inputBg,
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 7,
    padding: "7px 10px",
    fontSize: "0.82rem",
    color: ui.textPrimary,
    outline: "none",
    colorScheme: darkMode ? "dark" : "light",
    fontFamily: font,
  };

  const filteredAct = activitySearch
    ? ACTIVITY_FEED.filter(
        (a) =>
          a.user.toLowerCase().includes(activitySearch.toLowerCase()) ||
          a.target.toLowerCase().includes(activitySearch.toLowerCase()) ||
          a.action.toLowerCase().includes(activitySearch.toLowerCase()),
      )
    : ACTIVITY_FEED;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            Activity Feed
          </p>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "0.75rem",
              color: ui.textMuted,
            }}
          >
            Real-time log of user actions
          </p>
        </div>
        <input
          placeholder="Search activity…"
          value={activitySearch}
          onChange={(e) => setActivitySearch(e.target.value)}
          style={{ ...inputSt, minWidth: 220 }}
        />
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 14,
        }}
      >
        {[
          {
            icon: "✅",
            label: "Completed",
            count: ACTIVITY_FEED.filter((a) => a.icon === "✅").length,
            color: "#36a420",
          },
          {
            icon: "▶️",
            label: "Started",
            count: ACTIVITY_FEED.filter((a) => a.icon === "▶️").length,
            color: FB,
          },
          {
            icon: "🚩",
            label: "Flagged",
            count: ACTIVITY_FEED.filter((a) => a.icon === "🚩").length,
            color: "#f59e0b",
          },
          {
            icon: "📤",
            label: "Released",
            count: ACTIVITY_FEED.filter((a) => a.icon === "📤").length,
            color: "#9333ea",
          },
        ].map((s) => (
          <Card key={s.label} ui={ui} style={{ padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "1.1rem" }}>{s.icon}</span>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "1rem",
                    fontWeight: 800,
                    color: s.color,
                  }}
                >
                  {s.count}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.68rem",
                    color: ui.textMuted,
                  }}
                >
                  {s.label}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Activity List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filteredAct.map((act) => (
          <Card key={act.id} ui={ui} style={{ padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: `${act.color}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  flexShrink: 0,
                }}
              >
                {act.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.84rem",
                    color: ui.textPrimary,
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{act.user}</span>{" "}
                  <span style={{ color: ui.textSub }}>{act.action}</span>
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: "0.75rem",
                    color: ui.textMuted,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {act.target}
                </p>
              </div>
              <span
                style={{
                  fontSize: "0.7rem",
                  color: ui.textMuted,
                  flexShrink: 0,
                }}
              >
                {act.time}
              </span>
            </div>
          </Card>
        ))}
        {filteredAct.length === 0 && (
          <div
            style={{
              padding: "24px",
              textAlign: "center",
              color: ui.textMuted,
              fontSize: "0.84rem",
            }}
          >
            No activity found
          </div>
        )}
      </div>
    </div>
  );
}
