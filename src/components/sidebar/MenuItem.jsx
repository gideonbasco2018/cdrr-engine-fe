// FILE: src/components/sidebar/MenuItem.jsx

import { roleBadgeColors } from "./useSidebarColors";

function MenuItem({
  item,
  activeMenu,
  collapsed,
  colors,
  userRole,
  handleNavigation,
}) {
  const isDisabled = item.comingSoon === true;

  return (
    <div
      onClick={() => !isDisabled && handleNavigation(item.id)}
      title={collapsed ? item.label : ""}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        gap: collapsed ? 0 : "0.75rem",
        padding: collapsed ? "0.75rem" : "0.75rem 1.25rem",
        cursor: isDisabled ? "not-allowed" : "pointer",
        background:
          activeMenu === item.id ? colors.activeItemBg : "transparent",
        color: isDisabled
          ? colors.comingSoonText
          : activeMenu === item.id
            ? colors.textPrimary
            : colors.textSecondary,
        transition: "all 0.2s ease",
        borderLeft:
          activeMenu === item.id && !collapsed
            ? `3px solid ${roleBadgeColors[userRole]}`
            : "3px solid transparent",
        position: "relative",
        opacity: isDisabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (activeMenu !== item.id && !isDisabled) {
          e.currentTarget.style.background = colors.hoverBg;
          e.currentTarget.style.color = colors.textPrimary;
        }
      }}
      onMouseLeave={(e) => {
        if (activeMenu !== item.id && !isDisabled) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = isDisabled
            ? colors.comingSoonText
            : colors.textSecondary;
        }
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: collapsed ? 0 : "0.75rem",
        }}
      >
        <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
        {!collapsed && <span>{item.label}</span>}
      </div>

      {!collapsed && isDisabled && (
        <span
          style={{
            padding: "0.15rem 0.5rem",
            background: colors.comingSoonBg,
            color: colors.comingSoonText,
            borderRadius: "10px",
            fontSize: "0.65rem",
            fontWeight: "600",
            letterSpacing: "0.02em",
          }}
        >
          Soon
        </span>
      )}

      {!collapsed &&
        !isDisabled &&
        item.badge !== undefined &&
        item.badge > 0 && (
          <span
            style={{
              padding: "0.2rem 0.5rem",
              background: colors.badgeBg,
              color: colors.badgeText,
              borderRadius: "10px",
              fontSize: "0.7rem",
              fontWeight: "700",
              minWidth: "20px",
              textAlign: "center",
              boxShadow: "0 2px 4px rgba(239, 68, 68, 0.3)",
            }}
          >
            {item.badge}
          </span>
        )}

      {collapsed &&
        !isDisabled &&
        item.badge !== undefined &&
        item.badge > 0 && (
          <div
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              width: "8px",
              height: "8px",
              background: colors.badgeBg,
              borderRadius: "50%",
              boxShadow: "0 0 4px rgba(239, 68, 68, 0.5)",
            }}
          />
        )}
    </div>
  );
}

export default MenuItem;
