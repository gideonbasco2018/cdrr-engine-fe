import { useState } from "react";

function SidebarSection({
  title,
  icon,
  items,
  activeItem,
  onItemClick,
  colors,
  darkMode,
  totalCount,
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "8px",
          cursor: "pointer",
          transition: "all 0.2s ease",
          marginBottom: "6px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = darkMode ? "#1f1f1f" : "#f0f0f0";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = colors.cardBg;
        }}
      >
        <div
          style={{
            fontSize: "0.72rem",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: colors.textPrimary,
          }}
        >
          <span style={{ fontSize: "0.8rem" }}>{icon}</span>
          <span>{title}</span>
          <span
            style={{
              background: darkMode ? "#1f1f1f" : "#e5e5e5",
              padding: "2px 7px",
              borderRadius: "5px",
              fontSize: "0.68rem",
              fontWeight: "600",
              fontFamily: "monospace",
              color: colors.textTertiary,
            }}
          >
            {totalCount}
          </span>
        </div>
        <span
          style={{
            color: colors.textTertiary,
            transition: "transform 0.2s",
            transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
            fontSize: "0.6rem",
          }}
        >
          ▼
        </span>
      </div>

      {isOpen && (
        <div
          style={{
            paddingLeft: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {/* "All" option */}
          <div
            onClick={() => onItemClick(null)}
            style={{
              padding: "7px 12px",
              background:
                activeItem === null ? "rgba(33,150,243,0.1)" : "transparent",
              border: `1px solid ${activeItem === null ? "#2196F3" : "transparent"}`,
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.72rem",
            }}
            onMouseEnter={(e) => {
              if (activeItem !== null) {
                e.currentTarget.style.background = colors.cardBg;
                e.currentTarget.style.borderColor = colors.cardBorder;
              }
            }}
            onMouseLeave={(e) => {
              if (activeItem !== null) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "transparent";
              }
            }}
          >
            <span style={{ color: colors.textPrimary, fontWeight: 500 }}>
              All {title}
            </span>
            <span
              style={{
                background:
                  activeItem === null
                    ? "#2196F3"
                    : darkMode
                      ? "#1f1f1f"
                      : "#e5e5e5",
                color: activeItem === null ? "#fff" : colors.textTertiary,
                padding: "2px 7px",
                borderRadius: "4px",
                fontSize: "0.68rem",
                fontWeight: "600",
                fontFamily: "monospace",
              }}
            >
              {totalCount}
            </span>
          </div>

          {/* Individual items */}
          {items.map((item) => {
            const isActive = activeItem === item.value;
            return (
              <div
                key={item.value ?? `no-${title}`}
                onClick={() => onItemClick(isActive ? null : item.value)}
                style={{
                  padding: "7px 12px",
                  background: isActive ? "rgba(33,150,243,0.1)" : "transparent",
                  border: `1px solid ${isActive ? "#2196F3" : "transparent"}`,
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "6px",
                  fontSize: "0.72rem",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = colors.cardBg;
                    e.currentTarget.style.borderColor = colors.cardBorder;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "transparent";
                  }
                }}
              >
                <span
                  style={{
                    color: colors.textPrimary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {item.value || `No ${title}`}
                </span>
                <span
                  style={{
                    background: isActive
                      ? "#2196F3"
                      : darkMode
                        ? "#1f1f1f"
                        : "#e5e5e5",
                    color: isActive ? "#fff" : colors.textTertiary,
                    padding: "2px 7px",
                    borderRadius: "4px",
                    fontSize: "0.68rem",
                    fontWeight: "600",
                    fontFamily: "monospace",
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
    </div>
  );
}

export default SidebarSection;
