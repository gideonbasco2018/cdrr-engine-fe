// FILE: src/components/groupManagement/UsersTable.jsx
import { useState, useEffect } from "react";

function UsersTable({
  groupUsers,
  groupUsersLoading,
  actionLoading,
  handleRemoveUser,
  handleBulkRemove,
  setShowAssignDropdown,
  colors,
  darkMode,
  handleDragStart,
  handleDragEnd,
  selectedGroupId,
  dragging,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    setSelectedIds(new Set());
  }, [selectedGroupId]);

  const allChecked =
    groupUsers.length > 0 && selectedIds.size === groupUsers.length;
  const someChecked = selectedIds.size > 0 && !allChecked;

  const toggleAll = () => {
    if (allChecked || someChecked) setSelectedIds(new Set());
    else setSelectedIds(new Set(groupUsers.map((u) => u.id)));
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkRemoveClick = async () => {
    await handleBulkRemove([...selectedIds]);
    setSelectedIds(new Set());
  };

  return (
    <div
      style={{
        flex: 1,
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "0 0 14px 14px",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
      onClick={() => setShowAssignDropdown(false)}
    >
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div
          style={{
            padding: "0.5rem 1.5rem",
            background: darkMode ? "#1a1220" : "#fdf4ff",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "0.8rem",
              fontWeight: "600",
              color: colors.textSecondary,
            }}
          >
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleBulkRemoveClick}
            disabled={!!actionLoading}
            style={{
              padding: "0.3rem 0.85rem",
              borderRadius: "6px",
              border: "none",
              background: colors.btnDanger,
              color: "#fff",
              fontSize: "0.78rem",
              fontWeight: "600",
              cursor: actionLoading ? "not-allowed" : "pointer",
              opacity: actionLoading ? 0.6 : 1,
            }}
          >
            ✕ Remove Selected
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{
              padding: "0.3rem 0.75rem",
              borderRadius: "6px",
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: "0.78rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Table header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "32px 20px 36px 1fr 140px 100px 110px",
          gap: "1rem",
          padding: "0.7rem 1.5rem",
          background: darkMode ? "#1a1a1a" : "#f9f9f9",
          borderBottom: `1px solid ${colors.cardBorder}`,
          position: "sticky",
          top: 0,
          zIndex: 1,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={allChecked}
            ref={(el) => {
              if (el) el.indeterminate = someChecked;
            }}
            onChange={toggleAll}
            disabled={groupUsers.length === 0}
            style={{ cursor: "pointer", width: "15px", height: "15px" }}
          />
        </div>
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

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto" }}>
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
            const isChecked = selectedIds.has(user.id);

            return (
              <MemberRow
                key={user.id}
                user={user}
                index={i}
                isRemoving={isRemoving}
                isDraggingThis={isDraggingThis}
                isChecked={isChecked}
                onToggle={() => toggleOne(user.id)}
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
    </div>
  );
}

function MemberRow({
  user,
  index,
  isRemoving,
  isDraggingThis,
  isChecked,
  onToggle,
  selectedGroupId,
  handleRemoveUser,
  handleDragStart,
  handleDragEnd,
  colors,
  darkMode,
}) {
  const evenBg =
    index % 2 === 0 ? "transparent" : darkMode ? "#1a1a1a" : "#fafafa";
  const checkedBg = darkMode ? "#1a1a2e" : "#f0f0ff";

  return (
    <div
      draggable={!isRemoving}
      onDragStart={() => handleDragStart(user.id, selectedGroupId)}
      onDragEnd={handleDragEnd}
      style={{
        display: "grid",
        gridTemplateColumns: "32px 20px 36px 1fr 140px 100px 110px",
        alignItems: "center",
        gap: "1rem",
        padding: "0.75rem 1.5rem",
        background: isDraggingThis
          ? `${colors.btnPrimary}0d`
          : isChecked
            ? checkedBg
            : evenBg,
        borderBottom: `1px solid ${colors.rowBorder}`,
        borderLeft: isChecked
          ? `2px solid ${colors.btnPrimary}`
          : "2px solid transparent",
        opacity: isDraggingThis || isRemoving ? 0.45 : 1,
        cursor: isRemoving ? "not-allowed" : "grab",
        transition: "background 0.12s ease, opacity 0.15s ease",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (!isDraggingThis && !isRemoving && !isChecked)
          e.currentTarget.style.background = colors.rowHover;
      }}
      onMouseLeave={(e) => {
        if (!isDraggingThis && !isRemoving)
          e.currentTarget.style.background = isChecked ? checkedBg : evenBg;
      }}
    >
      {/* Checkbox */}
      <div
        style={{ display: "flex", alignItems: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={onToggle}
          style={{ cursor: "pointer", width: "15px", height: "15px" }}
        />
      </div>

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

      {/* Status */}
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
