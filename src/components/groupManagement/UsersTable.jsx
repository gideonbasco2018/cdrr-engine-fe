// FILE: src/components/groupManagement/UsersTable.jsx
// Revised: member rows are now draggable.
// • Drag a member to the pool panel → removes from current group
// • Drag a member to another group row → assigns to that group

function UsersTable({
  groupUsers,
  groupUsersLoading,
  actionLoading,
  handleRemoveUser,
  setShowAssignDropdown,
  colors,
  darkMode,
  // DnD
  handleDragStart,
  handleDragEnd,
  selectedGroupId,
  dragging,
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
      {/* Table header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "20px 36px 1fr 140px 100px 110px",
          gap: "1rem",
          padding: "0.7rem 1.5rem",
          background: darkMode ? "#1a1a1a" : "#f9f9f9",
          borderBottom: `1px solid ${colors.cardBorder}`,
          position: "sticky",
          top: 0,
          zIndex: 1,
        }}
      >
        {["", "", "Name / Email", "Username", "Status", "Action"].map((h) => (
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
          <div style={{ color: colors.textSecondary, fontSize: "0.85rem" }}>
            No users in this group yet.
          </div>
          <div
            style={{
              marginTop: "0.4rem",
              color: colors.textTertiary,
              fontSize: "0.78rem",
            }}
          >
            Click "+ Add" or drag users from the center panel
          </div>
        </div>
      ) : (
        groupUsers.map((user, i) => {
          const isRemoving = actionLoading === `remove-${user.id}`;
          const isDraggingThis = dragging?.userId === user.id;

          return (
            <MemberRow
              key={user.id}
              user={user}
              index={i}
              isRemoving={isRemoving}
              isDraggingThis={isDraggingThis}
              selectedGroupId={selectedGroupId}
              handleRemoveUser={handleRemoveUser}
              handleDragStart={handleDragStart}
              handleDragEnd={handleDragEnd}
              colors={colors}
              darkMode={darkMode}
            />
          );
        })
      )}
    </div>
  );
}

function MemberRow({
  user,
  index,
  isRemoving,
  isDraggingThis,
  selectedGroupId,
  handleRemoveUser,
  handleDragStart,
  handleDragEnd,
  colors,
  darkMode,
}) {
  const evenBg =
    index % 2 === 0 ? "transparent" : darkMode ? "#1a1a1a" : "#fafafa";

  return (
    <div
      draggable={!isRemoving}
      onDragStart={() => handleDragStart(user.id, selectedGroupId)}
      onDragEnd={handleDragEnd}
      style={{
        display: "grid",
        gridTemplateColumns: "20px 36px 1fr 140px 100px 110px",
        alignItems: "center",
        gap: "1rem",
        padding: "0.75rem 1.5rem",
        background: isDraggingThis ? `${colors.btnPrimary}0d` : evenBg,
        borderBottom: `1px solid ${colors.rowBorder}`,
        opacity: isDraggingThis || isRemoving ? 0.45 : 1,
        cursor: isRemoving ? "not-allowed" : "grab",
        transition: "background 0.12s ease, opacity 0.15s ease",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (!isDraggingThis && !isRemoving)
          e.currentTarget.style.background = colors.rowHover;
      }}
      onMouseLeave={(e) => {
        if (!isDraggingThis && !isRemoving)
          e.currentTarget.style.background = evenBg;
      }}
    >
      {/* Drag handle */}
      <span
        style={{
          color: colors.textTertiary,
          fontSize: "0.7rem",
          lineHeight: 1,
          cursor: "grab",
        }}
      >
        ⠿
      </span>

      {/* Avatar */}
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

      {/* Name + email */}
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
        <div style={{ fontSize: "0.75rem", color: colors.textTertiary }}>
          {user.email || "—"}
        </div>
      </div>

      {/* Username */}
      <div
        style={{
          fontSize: "0.83rem",
          color: colors.textSecondary,
          fontFamily: "monospace",
        }}
      >
        {user.username}
      </div>

      {/* Status badge */}
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

      {/* Remove button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
}

export default UsersTable;
