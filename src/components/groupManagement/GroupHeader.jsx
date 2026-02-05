// FILE: src/components/groupManagement/GroupHeader.jsx

function GroupHeader({
  selectedGroup,
  groupUsers,
  setGroupModal,
  setConfirmModal,
  handleDeleteGroup,
  colors,
  darkMode,
  userRole,
}) {
  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "14px 14px 0 0",
        padding: "1.25rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: "1.2rem",
            fontWeight: "700",
            color: colors.textPrimary,
          }}
        >
          {selectedGroup.name}
        </h2>
        <p
          style={{
            margin: "0.25rem 0 0",
            color: colors.textTertiary,
            fontSize: "0.82rem",
          }}
        >
          {selectedGroup.description || "No description"}
          <span
            style={{
              margin: "0 0.5rem",
              color: colors.cardBorder,
            }}
          >
            •
          </span>
          {groupUsers.length} user
          {groupUsers.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() =>
            setGroupModal({
              mode: "edit",
              data: {
                name: selectedGroup.name,
                description: selectedGroup.description || "",
              },
            })
          }
          style={{
            padding: "0.45rem 0.9rem",
            borderRadius: "7px",
            border: `1px solid ${colors.btnGhostBorder}`,
            background: colors.btnGhost,
            color: colors.btnGhostText,
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          ✏️ Edit
        </button>

        {userRole === "SuperAdmin" && (
          <button
            onClick={() =>
              setConfirmModal({
                type: "delete-group",
                title: "Delete Group?",
                message: `Ang group na "${selectedGroup.name}" at lahat ng user assignments nito ay ire-remove.`,
                onConfirm: handleDeleteGroup,
              })
            }
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "7px",
              border: "none",
              background: darkMode ? "#2a1a1a" : "#fef2f2",
              color: colors.btnDanger,
              fontSize: "0.8rem",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            🗑️ Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default GroupHeader;
