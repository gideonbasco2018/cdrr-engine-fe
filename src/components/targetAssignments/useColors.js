export function useColors(darkMode) {
  return darkMode
    ? {
        pageBg: "#0a0a0a",
        cardBg: "#161616",
        cardBorder: "#2a2a2a",
        textPrimary: "#f5f5f5",
        textSecondary: "#a3a3a3",
        textTertiary: "#737373",
        rowHover: "#1f1f1f",
        selectedBg: "#1a2332",
        selectedBorder: "#3b82f6",
        btnPrimary: "#3b82f6",
        targetBg: "#1c2e1c",
        targetBorder: "#22c55e",
      }
    : {
        pageBg: "#f8f8f8",
        cardBg: "#ffffff",
        cardBorder: "#e5e7eb",
        textPrimary: "#111827",
        textSecondary: "#6b7280",
        textTertiary: "#9ca3af",
        rowHover: "#f9fafb",
        selectedBg: "#eff6ff",
        selectedBorder: "#3b82f6",
        btnPrimary: "#3b82f6",
        targetBg: "#f0fdf4",
        targetBorder: "#22c55e",
      };
}
