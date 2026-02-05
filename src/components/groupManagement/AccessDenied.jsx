// FILE: src/components/groupManagement/AccessDenied.jsx

function AccessDenied({ colors }) {
  return (
    <div
      style={{
        padding: "2rem",
        color: colors.textPrimary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
        <h2 style={{ margin: "0 0 0.5rem", color: colors.textPrimary }}>
          Access Denied
        </h2>
        <p style={{ color: colors.textSecondary, margin: 0 }}>
          Only Admins can manage groups.
        </p>
      </div>
    </div>
  );
}

export default AccessDenied;
