// FILE: src/components/sidebar/useSidebarColors.js

export const useSidebarColors = (darkMode) => {
  return darkMode
    ? {
        sidebarBg: "#202020",
        sidebarBorder: "#555555",
        textPrimary: "#fff",
        textSecondary: "#999",
        sectionLabel: "#666",
        activeItemBg: "#2b2b2b",
        hoverBg: "#666666",
        toggleBg: "#292929",
        toggleHover: "#666666",
        badgeBg: "#ef4444",
        badgeText: "#fff",
        comingSoonBg: "#2a2a2a",
        comingSoonText: "#555",
      }
    : {
        sidebarBg: "#ffffff",
        sidebarBorder: "#e5e5e5",
        textPrimary: "#000",
        textSecondary: "#666",
        sectionLabel: "#999",
        activeItemBg: "#f1f1f1",
        hoverBg: "#fafafa",
        toggleBg: "#f7f7f7",
        toggleHover: "#ededed",
        badgeBg: "#ef4444",
        badgeText: "#fff",
        comingSoonBg: "#f0f0f0",
        comingSoonText: "#999",
      };
};

export const roleBadgeColors = {
  User: "#4CAF50",
  Admin: "#2196F3",
  SuperAdmin: "#ff9800",
};