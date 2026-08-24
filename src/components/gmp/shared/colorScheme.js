// src/components/gmp/shared/colorScheme.js
export function getColorScheme(darkMode) {
  return {
    pageBg:       darkMode ? "#0f1011" : "#f1f5f9",
    cardBg:       darkMode ? "#1a1b1c" : "#ffffff",
    cardBorder:   darkMode ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)",
    textPrimary:  darkMode ? "#f1f5f9" : "#0f172a",
    textSecondary:darkMode ? "#cbd5e1" : "#374151",
    textTertiary: darkMode ? "#94a3b8" : "#64748b",
    inputBg:      darkMode ? "rgba(255,255,255,0.05)" : "#f8fafc",
    inputBorder:  darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
    badgeBg:      darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    sidebarBg:    darkMode ? "#141516" : "#ffffff",
    divider:      darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    tableBg:      darkMode ? "#1a1b1c" : "#ffffff",
    tableRowHover:darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    // Zebra tint for borderless table rows — replaces per-cell divider lines.
    // Solid (not rgba-on-transparent) so the sticky checkbox/actions columns
    // stay fully opaque — a translucent sticky background lets whatever
    // slides underneath during horizontal scroll bleed through, which is
    // what made the Actions column look like it "vanished" on hover.
    tableRowAlt:  darkMode ? "#202126" : "#f8f9fc",
    tableRowAccentHover: darkMode ? "#242842" : "#eef0fd",
    cardShadow:   darkMode ? "0 1px 2px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.3)"
                            : "0 1px 2px rgba(15,23,42,0.04), 0 6px 16px rgba(15,23,42,0.05)",
  };
}
