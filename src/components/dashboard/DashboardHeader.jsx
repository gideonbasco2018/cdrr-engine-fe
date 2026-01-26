// FILE: src/components/dashboard/DashboardHeader.jsx
function DashboardHeader({ userRole, loading, onRefresh, colors }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "2rem",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
            color: colors.textPrimary,
            transition: "color 0.3s ease",
          }}
        >
          {userRole === "SuperAdmin"
            ? "System Overview"
            : userRole === "Admin"
              ? "Platform Management"
              : "Platform Overview"}
        </h1>
        <p
          style={{
            color: colors.textTertiary,
            fontSize: "0.9rem",
            transition: "color 0.3s ease",
          }}
        >
          {userRole === "SuperAdmin"
            ? "Complete system control and analytics"
            : userRole === "Admin"
              ? "Monitor and manage services and users"
              : "View your reports and analytics"}
        </p>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        style={{
          padding: "0.75rem 1.5rem",
          background: loading ? "#ccc" : "#4CAF50",
          border: "none",
          borderRadius: "8px",
          color: "#fff",
          fontSize: "0.9rem",
          fontWeight: "600",
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          transition: "all 0.2s",
          opacity: loading ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.target.style.background = "#45a049";
            e.target.style.transform = "translateY(-1px)";
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.target.style.background = "#4CAF50";
            e.target.style.transform = "translateY(0)";
          }
        }}
      >
        <span>{loading ? "⏳" : "🔄"}</span>
        {loading ? "Loading..." : "Refresh"}
      </button>
    </div>
  );
}

export default DashboardHeader;
