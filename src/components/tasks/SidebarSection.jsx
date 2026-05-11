import { useState } from "react";

const ITEM_DOT_COLORS = [
  "#7c3aed",
  "#0891b2",
  "#059669",
  "#b45309",
  "#f97316",
  "#be185d",
  "#6366f1",
  "#e11d48",
  "#0ea5e9",
  "#84cc16",
  "#a855f7",
  "#14b8a6",
];

function SidebarSection({
  title,
  groupColor,
  items,
  activeItem,
  onItemClick,
  colors,
  darkMode,
  totalCount,
}) {
  const [isOpen, setIsOpen] = useState(true);

  const activeBg = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.055)";
  const activeBorder = darkMode ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.1)";
  const hoverBg = darkMode ? "#161616" : "#f0f0f0";

  return (
    <div style={{ marginBottom: 2 }}>
      {/* Group header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 4px 3px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: groupColor,
              flexShrink: 0,
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: "0.6rem",
              fontWeight: 700,
              color: colors.textTertiary,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {title}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              fontSize: "0.58rem",
              color: colors.textTertiary,
              background: darkMode ? "#1a1a1a" : "#e8e8e8",
              borderRadius: 4,
              padding: "1px 5px",
              fontWeight: 600,
            }}
          >
            {items.length}
          </span>
          <svg
            width="8"
            height="8"
            viewBox="0 0 10 10"
            style={{
              transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 0.2s",
              flexShrink: 0,
            }}
          >
            <polyline
              points="1,3 5,7 9,3"
              fill="none"
              stroke={colors.textTertiary}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            marginBottom: 2,
          }}
        >
          {/* All option */}
          <div
            onClick={() => onItemClick(null)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "3px 6px",
              borderRadius: 5,
              cursor: "pointer",
              background: activeItem === null ? activeBg : "transparent",
              border: `0.5px solid ${activeItem === null ? activeBorder : "transparent"}`,
            }}
            onMouseEnter={(e) => {
              if (activeItem !== null)
                e.currentTarget.style.background = hoverBg;
            }}
            onMouseLeave={(e) => {
              if (activeItem !== null)
                e.currentTarget.style.background = "transparent";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: groupColor,
                  flexShrink: 0,
                  display: "inline-block",
                  opacity: 0.5,
                }}
              />
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: activeItem === null ? 600 : 400,
                  color:
                    activeItem === null
                      ? colors.textPrimary
                      : colors.textSecondary,
                }}
              >
                All
              </span>
            </div>
            <span
              style={{
                fontSize: "0.6rem",
                fontWeight: 600,
                color:
                  activeItem === null
                    ? colors.textPrimary
                    : colors.textTertiary,
                background: darkMode ? "#1a1a1a" : "#e8e8e8",
                borderRadius: 99,
                padding: "1px 6px",
                minWidth: 18,
                textAlign: "center",
              }}
            >
              {totalCount}
            </span>
          </div>

          {/* Individual items */}
          {items.map((item, idx) => {
            const isActive = activeItem === item.value;
            const dot = ITEM_DOT_COLORS[idx % ITEM_DOT_COLORS.length];
            return (
              <div
                key={item.value}
                onClick={() => onItemClick(isActive ? null : item.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "3px 6px",
                  borderRadius: 5,
                  cursor: "pointer",
                  background: isActive ? activeBg : "transparent",
                  border: `0.5px solid ${isActive ? activeBorder : "transparent"}`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = hoverBg;
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: dot,
                      flexShrink: 0,
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive
                        ? colors.textPrimary
                        : colors.textSecondary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.value}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    color: isActive ? colors.textPrimary : colors.textTertiary,
                    background: darkMode ? "#1a1a1a" : "#e8e8e8",
                    borderRadius: 99,
                    padding: "1px 6px",
                    minWidth: 18,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.count}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Divider */}
      <div
        style={{
          height: "0.5px",
          background: colors.cardBorder,
          margin: "4px 2px 3px",
        }}
      />
    </div>
  );
}

export default SidebarSection;
