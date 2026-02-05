// FILE: src/components/groupManagement/UsersTable.jsx

function UsersTable({
  groupUsers,
  groupUsersLoading,
  actionLoading,
  handleRemoveUser,
  setShowAssignDropdown,
  colors,
  darkMode,
}) {
  return (
    <div
      style={{
        flex: 1,
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "0 0 14px 14px",
        overflow: "auto",
      }}
      onClick={() => setShowAssignDropdown(false)}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "36px 1fr 140px 100px 110px",
          gap: "1rem",
          padding: "0.7rem 1.5rem",
          background: darkMode ? "#1a1a1a" : "#f9f9f9",
          borderBottom: `1px solid ${colors.cardBorder}`,
        }}
      >
        {["", "Name / Email", "Username", "Status", "Action"].map((h) => (
          <div
            key={h}
            style={{
              fontSize: "0.7rem",
              fontWeight: "700",
              color: colors.textTertiary,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textAlign: h === "Action" ? "right" : "left",
            }}
          >
            {h}
          </div>
        ))}
      </div>

      {groupUsersLoading ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: colors.textTertiary,
            fontSize: "0.85rem",
          }}
        >
          Loading users...
        </div>
      ) : groupUsers.length === 0 ? (
        <div style={{ padding: "2.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "1.8rem", marginBottom: "0.4rem" }}>👤</div>
          <div
            style={{
              color: colors.textSecondary,
              fontSize: "0.85rem",
            }}
          >
            No users in this group yet.
          </div>
        </div>
      ) : (
        groupUsers.map((user, i) => {
          const isRemoving = actionLoading === `remove-${user.id}`;
          return (
            <div
              key={user.id}
              style={{
                display: "grid",
                gridTemplateColumns: "36px 1fr 140px 100px 110px",
                alignItems: "center",
                gap: "1rem",
                padding: "0.75rem 1.5rem",
                background:
                  i % 2 === 0
                    ? "transparent"
                    : darkMode
                      ? "#1a1a1a"
                      : "#fafafa",
                borderBottom: `1px solid ${colors.rowBorder}`,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = colors.rowHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  i % 2 === 0
                    ? "transparent"
                    : darkMode
                      ? "#1a1a1a"
                      : "#fafafa")
              }
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: darkMode ? "#2a2a2a" : "#e5e5e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  color: colors.textSecondary,
                }}
              >
                {(user.first_name || user.username || "?")[0].toUpperCase()}
              </div>

              <div>
                <div
                  style={{
                    fontWeight: "600",
                    fontSize: "0.88rem",
                    color: colors.textPrimary,
                  }}
                >
                  {user.first_name && user.surname
                    ? `${user.first_name} ${user.surname}`
                    : user.username}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: colors.textTertiary,
                  }}
                >
                  {user.email || "—"}
                </div>
              </div>

              <div
                style={{
                  fontSize: "0.83rem",
                  color: colors.textSecondary,
                  fontFamily: "monospace",
                }}
              >
                {user.username}
              </div>

              <div>
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.18rem 0.6rem",
                    borderRadius: "20px",
                    fontSize: "0.72rem",
                    fontWeight: "600",
                    background: user.is_active
                      ? colors.badgeActive.bg
                      : colors.badgeInactive.bg,
                    color: user.is_active
                      ? colors.badgeActive.text
                      : colors.badgeInactive.text,
                  }}
                >
                  {user.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  disabled={isRemoving}
                  onClick={() => handleRemoveUser(user.id, user.username)}
                  style={{
                    padding: "0.38rem 0.85rem",
                    borderRadius: "6px",
                    border: `1px solid ${colors.btnDanger}`,
                    background: "transparent",
                    color: colors.btnDanger,
                    fontSize: "0.78rem",
                    fontWeight: "600",
                    cursor: isRemoving ? "not-allowed" : "pointer",
                    opacity: isRemoving ? 0.5 : 1,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isRemoving) {
                      e.target.style.background = colors.btnDanger;
                      e.target.style.color = "#fff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isRemoving) {
                      e.target.style.background = "transparent";
                      e.target.style.color = colors.btnDanger;
                    }
                  }}
                >
                  {isRemoving ? "..." : "✕ Remove"}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default UsersTable;
