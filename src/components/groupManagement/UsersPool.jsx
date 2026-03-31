// FILE: src/components/groupManagement/UsersPool.jsx
// NEW component — center column showing all users not yet in the selected group.
// Users can be:
//   • Clicked (+ Add button) to assign to the selected group
//   • Dragged onto a group row (GroupsList) to assign to that group
//   • Dragged onto the members panel (GroupDetail) to assign to selectedGroup
//
// The pool itself is also a DROP ZONE:
//   dropping a member here removes them from the selected group.
import { useState, useEffect } from "react";

function UsersPool({
  allUsers,
  groupUsers,
  selectedGroup,
  assignSearch,
  setAssignSearch,
  handleAssignUser,
  actionLoading,
  colors,
  darkMode,
  // DnD
  dragging,
  dropTarget,
  handleDragStart,
  handleDragEnd,
  handleDragEnter,
  handleDragLeave,
  handleDropOnPool,
  handleBulkAssign,
}) {
  const groupUserIds = new Set(groupUsers.map((u) => u.id));

  const poolUsers = allUsers
    .filter((u) => u.is_active && !groupUserIds.has(u.id))
    .filter((u) => {
      if (!assignSearch.trim()) return true;
      const q = assignSearch.toLowerCase();
      return (
        (u.username || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.first_name || "").toLowerCase().includes(q) ||
        (u.surname || "").toLowerCase().includes(q)
      );
    });

  const isPoolDropTarget = dropTarget === "pool";
  // Only show pool as drop target when dragging a member (fromGroupId is set)
  const isDraggingMember = dragging && dragging.fromGroupId !== null;

  const displayName = (u) =>
    u.first_name && u.surname
      ? `${u.first_name} ${u.surname}`
      : u.first_name || u.username;

  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    setSelectedIds(new Set());
  }, [selectedGroup?.id]);

  const allChecked =
    poolUsers.length > 0 && selectedIds.size === poolUsers.length;
  const someChecked = selectedIds.size > 0 && !allChecked;

  const toggleAll = () => {
    if (allChecked || someChecked) setSelectedIds(new Set());
    else setSelectedIds(new Set(poolUsers.map((u) => u.id)));
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkAddClick = async () => {
    await handleBulkAssign([...selectedIds]);
    setSelectedIds(new Set());
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: colors.cardBg,
        border: `1px solid ${
          isPoolDropTarget && isDraggingMember
            ? colors.btnDanger
            : colors.cardBorder
        }`,
        borderRadius: "14px",
        overflow: "hidden",
        transition: "border-color 0.15s ease",
        // Glow when dragging a member over pool (signals "remove")
        boxShadow:
          isPoolDropTarget && isDraggingMember
            ? `0 0 0 2px ${colors.btnDanger}33`
            : "none",
      }}
      onDragOver={(e) => {
        if (isDraggingMember) e.preventDefault();
      }}
      onDragEnter={() => {
        if (isDraggingMember) handleDragEnter("pool");
      }}
      onDragLeave={() => {
        if (isDraggingMember) handleDragLeave("pool");
      }}
      onDrop={() => {
        if (isDraggingMember) handleDropOnPool();
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "0.85rem 1rem",
          borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: "700",
              color: colors.textTertiary,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            All Users
            {selectedGroup && (
              <span
                style={{
                  marginLeft: "0.4rem",
                  fontWeight: "400",
                  textTransform: "none",
                  letterSpacing: 0,
                  color: colors.textTertiary,
                }}
              >
                — not in {selectedGroup.name}
              </span>
            )}
          </div>
          <input
            type="text"
            placeholder="Search users..."
            value={assignSearch}
            onChange={(e) => setAssignSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.45rem 0.75rem",
              borderRadius: "7px",
              border: `1px solid ${colors.inputBorder}`,
              background: colors.inputBg,
              color: colors.textPrimary,
              fontSize: "0.82rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div
          style={{
            fontSize: "1.3rem",
            fontWeight: "700",
            color: colors.textTertiary,
            minWidth: "2.5rem",
            textAlign: "right",
          }}
        >
          {poolUsers.length}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && selectedGroup && (
        <div
          style={{
            padding: "0.5rem 1rem",
            background: darkMode ? "#0f1a0f" : "#f0fff4",
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
            onClick={handleBulkAddClick}
            style={{
              padding: "0.3rem 0.85rem",
              borderRadius: "6px",
              border: "none",
              background: colors.btnPrimary,
              color: "#fff",
              fontSize: "0.78rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            + Add Selected
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

      {/* Drop hint — only visible when dragging a member */}
      {isDraggingMember && (
        <div
          style={{
            padding: "0.5rem 1rem",
            background: isPoolDropTarget
              ? `${colors.btnDanger}18`
              : darkMode
                ? "#1a1a1a"
                : "#fff8f8",
            borderBottom: `1px solid ${
              isPoolDropTarget ? colors.btnDanger + "55" : colors.rowBorder
            }`,
            fontSize: "0.75rem",
            color: isPoolDropTarget ? colors.btnDanger : colors.textTertiary,
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.15s ease",
            flexShrink: 0,
          }}
        >
          <span>{isPoolDropTarget ? "🗑️" : "↙"}</span>
          {isPoolDropTarget
            ? `Drop to remove from ${selectedGroup?.name}`
            : `Drop here to remove from ${selectedGroup?.name}`}
        </div>
      )}

      {/* User rows */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Select all row — ADD THIS */}
        {poolUsers.length > 0 && selectedGroup && (
          <div
            style={{
              padding: "0.45rem 1rem",
              borderBottom: `1px solid ${colors.rowBorder}`,
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              background: darkMode ? "#1a1a1a" : "#f9f9f9",
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => {
                if (el) el.indeterminate = someChecked;
              }}
              onChange={toggleAll}
              style={{ cursor: "pointer", width: "15px", height: "15px" }}
            />
            <span
              style={{
                fontSize: "0.72rem",
                color: colors.textTertiary,
                fontWeight: "600",
              }}
            >
              Select all ({poolUsers.length})
            </span>
          </div>
        )}
        {poolUsers.length === 0 ? (
          <div
            style={{
              padding: "2.5rem",
              textAlign: "center",
              color: colors.textTertiary,
              fontSize: "0.85rem",
            }}
          >
            {assignSearch ? (
              <>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>
                  🔍
                </div>
                No users match your search
              </>
            ) : selectedGroup ? (
              <>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>
                  ✅
                </div>
                All active users are in this group
              </>
            ) : (
              <>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>
                  👥
                </div>
                Select a group to see available users
              </>
            )}
          </div>
        ) : (
          poolUsers.map((user) => {
            const isDraggingThis = dragging?.userId === user.id;
            const isAssigning = actionLoading === `assign-${user.id}`;

            return (
              <PoolUserRow
                key={user.id}
                user={user}
                displayName={displayName(user)}
                isDraggingThis={isDraggingThis}
                isAssigning={isAssigning}
                isChecked={selectedIds.has(user.id)} // ← ADD
                onToggle={() => toggleOne(user.id)} // ← ADD
                selectedGroup={selectedGroup}
                handleAssignUser={handleAssignUser}
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

function PoolUserRow({
  user,
  displayName,
  isDraggingThis,
  isAssigning,
  isChecked, // ← ADD
  onToggle, // ← ADD
  selectedGroup,
  handleAssignUser,
  handleDragStart,
  handleDragEnd,
  colors,
  darkMode,
}) {
  const initial = (user.first_name || user.username || "?")[0].toUpperCase();

  return (
    <div
      draggable={!isAssigning}
      onDragStart={() => handleDragStart(user.id, null)}
      onDragEnd={handleDragEnd}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.6rem 1rem",
        borderBottom: `1px solid ${colors.rowBorder}`,
        cursor: isAssigning ? "not-allowed" : "grab",
        opacity: isDraggingThis || isAssigning ? 0.45 : 1,
        transition: "background 0.1s ease, opacity 0.15s ease",
        background: "transparent",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (!isDraggingThis && !isAssigning)
          e.currentTarget.style.background = colors.rowHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Checkbox */}
      {selectedGroup && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
        >
          <input
            type="checkbox"
            checked={isChecked || false}
            onChange={onToggle}
            style={{ cursor: "pointer", width: "15px", height: "15px" }}
          />
        </div>
      )}

      {/* Drag handle */}
      <span
        style={{
          color: colors.textTertiary,
          fontSize: "0.75rem",
          flexShrink: 0,
          lineHeight: 1,
          cursor: "grab",
        }}
      >
        ⠿
      </span>

      {/* Avatar */}
      <div
        style={{
          width: "30px",
          height: "30px",
          borderRadius: "50%",
          background: darkMode ? "#2a2a2a" : "#e5e5e5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.75rem",
          fontWeight: "700",
          color: colors.textSecondary,
          flexShrink: 0,
        }}
      >
        {initial}
      </div>

      {/* Name + email */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontWeight: "600",
              fontSize: "0.83rem",
              color: colors.textPrimary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {displayName}
          </span>
          {/* access_request badge — shown when value is not null/empty */}
          {user.access_request && (
            <span
              title={`Access request: ${user.access_request}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.1rem 0.45rem",
                borderRadius: "20px",
                fontSize: "0.65rem",
                fontWeight: "700",
                letterSpacing: "0.03em",
                background: darkMode ? "#2a1f00" : "#fef9ec",
                color: "#f59e0b",
                border: "1px solid #f59e0b44",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: "0.6rem" }}>📋</span>
              {user.access_request}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: "0.72rem",
            color: colors.textTertiary,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginTop: "0.1rem",
          }}
        >
          {user.username}
          {user.email ? ` · ${user.email}` : ""}
        </div>
      </div>

      {/* Add button — only shown when a group is selected */}
      {selectedGroup && (
        <button
          disabled={isAssigning}
          onClick={() => handleAssignUser(user.id)}
          title={`Add to ${selectedGroup.name}`}
          style={{
            padding: "0.3rem 0.7rem",
            borderRadius: "6px",
            border: `1px solid ${colors.btnPrimary}`,
            background: "transparent",
            color: colors.btnPrimary,
            fontSize: "0.75rem",
            fontWeight: "700",
            cursor: isAssigning ? "not-allowed" : "pointer",
            flexShrink: 0,
            transition: "all 0.15s ease",
            opacity: isAssigning ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isAssigning) {
              e.currentTarget.style.background = colors.btnPrimary;
              e.currentTarget.style.color = "#fff";
            }
          }}
          onMouseLeave={(e) => {
            if (!isAssigning) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = colors.btnPrimary;
            }
          }}
        >
          {isAssigning ? "..." : "+ Add"}
        </button>
      )}
    </div>
  );
}

export default UsersPool;
