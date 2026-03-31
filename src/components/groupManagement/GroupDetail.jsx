// FILE: src/components/groupManagement/GroupDetail.jsx
// Revised: the whole panel is a drop zone for adding users from the pool.
// AssignUserBar is kept but visually de-emphasised (fallback for non-drag users).

import GroupHeader from "./GroupHeader";
import AssignUserBar from "./AssignUserBar";
import UsersTable from "./UsersTable";

function GroupDetail({
  selectedGroup,
  groupUsers,
  groupUsersLoading,
  actionLoading,
  assignSearch,
  setAssignSearch,
  showAssignDropdown,
  setShowAssignDropdown,
  availableUsers,
  allUsers,
  handleAssignUser,
  handleRemoveUser,
  setGroupModal,
  setConfirmModal,
  handleDeleteGroup,
  colors,
  darkMode,
  userRole,
  // DnD
  dragging,
  dropTarget,
  handleDragStart,
  handleDragEnd,
  handleDragEnter,
  handleDragLeave,
  handleDropOnMembers,
  handleBulkRemove,
}) {
  const isMembersDropTarget = dropTarget === "members";
  // Show drop target highlight only when dragging a pool user (fromGroupId === null)
  const isDraggingPoolUser = dragging && dragging.fromGroupId === null;
  const showDropHighlight = isMembersDropTarget && isDraggingPoolUser;

  if (!selectedGroup) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            flex: 1,
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
              👈
            </div>
            <div style={{ color: colors.textSecondary, fontSize: "0.9rem" }}>
              Select a group to view details
            </div>
            <div
              style={{
                marginTop: "0.5rem",
                color: colors.textTertiary,
                fontSize: "0.78rem",
              }}
            >
              Or drag a user from the center panel onto a group
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
      onDragOver={(e) => {
        if (isDraggingPoolUser) e.preventDefault();
      }}
      onDragEnter={() => {
        if (isDraggingPoolUser) handleDragEnter("members");
      }}
      onDragLeave={() => {
        if (isDraggingPoolUser) handleDragLeave("members");
      }}
      onDrop={() => {
        if (isDraggingPoolUser) handleDropOnMembers();
      }}
    >
      <GroupHeader
        selectedGroup={selectedGroup}
        groupUsers={groupUsers}
        setGroupModal={setGroupModal}
        setConfirmModal={setConfirmModal}
        handleDeleteGroup={handleDeleteGroup}
        colors={colors}
        darkMode={darkMode}
        userRole={userRole}
      />

      {/* Drop zone banner — appears when dragging a pool user over this panel */}
      <div
        style={{
          padding: showDropHighlight ? "0.65rem 1.5rem" : "0 1.5rem",
          maxHeight: showDropHighlight ? "56px" : "0px",
          overflow: "hidden",
          background: showDropHighlight
            ? `${colors.btnPrimary}15`
            : "transparent",
          borderLeft: `1px solid ${showDropHighlight ? colors.btnPrimary : colors.cardBorder}`,
          borderRight: `1px solid ${showDropHighlight ? colors.btnPrimary : colors.cardBorder}`,
          borderBottom: showDropHighlight
            ? `1px solid ${colors.btnPrimary}55`
            : "none",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.8rem",
          color: colors.btnPrimary,
          fontWeight: "600",
        }}
      >
        <span>✚</span>
        Drop here to add to {selectedGroup.name}
      </div>

      {/* Subtle "dragging" border glow on the whole column */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0, // ← ADD
          overflow: "hidden", // ← ADD
          borderRadius: showDropHighlight ? "0" : "inherit",
          transition: "outline-color 0.2s ease",
        }}
      >
        <AssignUserBar
          selectedGroup={selectedGroup}
          assignSearch={assignSearch}
          setAssignSearch={setAssignSearch}
          showAssignDropdown={showAssignDropdown}
          setShowAssignDropdown={setShowAssignDropdown}
          availableUsers={availableUsers}
          allUsers={allUsers}
          handleAssignUser={handleAssignUser}
          colors={colors}
        />

        <UsersTable
          groupUsers={groupUsers}
          groupUsersLoading={groupUsersLoading}
          actionLoading={actionLoading}
          handleRemoveUser={handleRemoveUser}
          setShowAssignDropdown={setShowAssignDropdown}
          colors={colors}
          darkMode={darkMode}
          // DnD — members can be dragged back to pool or onto another group
          handleDragStart={handleDragStart}
          handleDragEnd={handleDragEnd}
          selectedGroupId={selectedGroup.id}
          dragging={dragging}
          handleBulkRemove={handleBulkRemove}
        />
      </div>
    </div>
  );
}

export default GroupDetail;
