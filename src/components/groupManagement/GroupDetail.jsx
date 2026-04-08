// FILE: src/components/groupManagement/GroupDetail.jsx
import { useState } from "react";
import GroupHeader from "./GroupHeader";
import UsersTable from "./UsersTable";

function GroupDetail({
  selectedGroup,
  groupUsers,
  groupUsersLoading,
  actionLoading,
  handleRemoveUser,
  setGroupModal,
  setConfirmModal,
  handleDeleteGroup,
  colors,
  darkMode,
  userRole,
  dragging,
  dropTarget,
  handleDragStart,
  handleDragEnd,
  handleDragEnter,
  handleDragLeave,
  handleDropOnMembers,
  handleBulkRemove,
}) {
  const [memberSearch, setMemberSearch] = useState("");

  const isMembersDropTarget = dropTarget === "members";
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

      {/* Drop zone banner */}
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
        <span>✚</span> Drop here to add to {selectedGroup.name}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* ← BAGONG search bar, kapalit ng AssignUserBar */}
        <div
          style={{
            background: colors.cardBg,
            borderLeft: `1px solid ${colors.cardBorder}`,
            borderRight: `1px solid ${colors.cardBorder}`,
            borderBottom: `1px solid ${colors.cardBorder}`,
            padding: "0.65rem 1rem",
          }}
        >
          <input
            type="text"
            placeholder="🔍 Search members..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.45rem 0.75rem",
              borderRadius: "8px",
              border: `1px solid ${colors.inputBorder}`,
              background: colors.inputBg,
              color: colors.textPrimary,
              fontSize: "0.82rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <UsersTable
          groupUsers={groupUsers}
          groupUsersLoading={groupUsersLoading}
          actionLoading={actionLoading}
          handleRemoveUser={handleRemoveUser}
          colors={colors}
          darkMode={darkMode}
          handleDragStart={handleDragStart}
          handleDragEnd={handleDragEnd}
          selectedGroupId={selectedGroup.id}
          dragging={dragging}
          handleBulkRemove={handleBulkRemove}
          memberSearch={memberSearch} // ← BAGO
        />
      </div>
    </div>
  );
}

export default GroupDetail;
