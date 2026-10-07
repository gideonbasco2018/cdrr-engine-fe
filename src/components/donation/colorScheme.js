// FILE: src/components/donation/colorScheme.js
// Mirrors src/components/gmp/shared/colorScheme.js token-for-token (same
// slate palette, borders, shadows) so Donation's overall look matches FGMP
// Queue — but kept as Donation's own file rather than importing GMP's or
// reusing src/components/reports/utils.js, since that file's getColorScheme
// is shared by 6 other pages (ClinicalTrial, Decking, EApplication, Reports,
// ForEvaluation, monitoring/AllRecords) that must stay untouched.
export function getColorScheme(darkMode) {
  return darkMode
    ? {
        pageBg: "#0f1011",
        cardBg: "#1a1b1c",
        cardBorder: "rgba(255,255,255,0.09)",
        textPrimary: "#f1f5f9",
        textSecondary: "#cbd5e1",
        textTertiary: "#94a3b8",
        inputBg: "rgba(255,255,255,0.05)",
        inputBorder: "rgba(255,255,255,0.12)",
        badgeBg: "rgba(255,255,255,0.08)",
        tableBg: "#1a1b1c",
        tableRowEven: "#1a1b1c",
        tableRowOdd: "#202126",
        // Solid, not translucent — this also paints the sticky checkbox/
        // row-number/pinned-column/actions cells on hover, and a translucent
        // tint there would let scrolled-away column content bleed through.
        tableRowHover: "#26282c",
        tableBorder: "rgba(255,255,255,0.07)",
        tableText: "#f1f5f9",
        tableHeaderBg: "#1e2a3a",
        tableHeaderText: "#90caf9",
        cardShadow: "0 1px 2px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.3)",
      }
    : {
        pageBg: "#f1f5f9",
        cardBg: "#ffffff",
        cardBorder: "rgba(0,0,0,0.08)",
        textPrimary: "#0f172a",
        textSecondary: "#374151",
        textTertiary: "#64748b",
        inputBg: "#f8fafc",
        inputBorder: "rgba(0,0,0,0.12)",
        badgeBg: "rgba(0,0,0,0.06)",
        tableBg: "#ffffff",
        tableRowEven: "#ffffff",
        tableRowOdd: "#f8f9fc",
        // Solid, not translucent — see dark-mode comment above.
        tableRowHover: "#eef2f7",
        tableBorder: "rgba(0,0,0,0.06)",
        tableText: "#0f172a",
        tableHeaderBg: "#e3f2fd",
        tableHeaderText: "#0d47a1",
        cardShadow: "0 1px 2px rgba(15,23,42,0.04), 0 6px 16px rgba(15,23,42,0.05)",
      };
}
