export const labelStyle = (colors) => ({
  display: "block",
  fontSize: "0.72rem",
  fontWeight: 600,
  color: colors.textSecondary,
  marginBottom: "0.3rem",
  marginTop: "0.6rem",
});

export const inputStyle = (colors) => ({
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 10px",
  borderRadius: "6px",
  border: `1px solid ${colors.cardBorder}`,
  background: colors.pageBg,
  color: colors.textPrimary,
  fontSize: "0.8rem",
});

export const thStyle = (colors) => ({
  padding: "8px 14px",
  fontWeight: 600,
  color: colors.textSecondary,
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
});

export const tdStyle = (colors) => ({
  padding: "10px 14px",
  color: colors.textPrimary,
});
