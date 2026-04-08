// FILE: src/components/groupManagement/GroupsTab.jsx
import { useState } from "react";

import GroupsList from "./GroupsList";
import UsersPool from "./UsersPool";
import GroupDetail from "./GroupDetail";
import { useIsMobile } from "../../hooks/useIsMobile";

function GroupsTab({
  groups,
  allUsers,
  selectedGroup,
  setSelectedGroup,
  groupUsers,
  loading,
  groupUsersLoading,
  actionLoading,
  handleAssignUser,
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
  handleDropOnGroup,
  handleDropOnMembers,
  handleDropOnPool,
  handleBulkRemove,
  handleBulkAssign,
}) {
  const isMobile = useIsMobile();

  // Mobile-only: which panel is visible
  // "groups" | "pool" | "detail"
  const [mobileView, setMobileView] = useState("groups");

  // When a group is selected on mobile, jump straight to detail
  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    if (isMobile) setMobileView("detail");
  };

  const mobileTabStyle = (active) => ({
    flex: 1,
    padding: "8px 4px",
    border: "none",
    borderRadius: "8px",
    background: active ? colors.btnPrimary : "transparent",
    color: active ? "#fff" : colors.textSecondary,
    fontSize: "0.72rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  });

  // ── MOBILE LAYOUT ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Mobile panel switcher */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            padding: "0 0.75rem 0.5rem",
          }}
        >
          <button
            style={mobileTabStyle(mobileView === "groups")}
            onClick={() => setMobileView("groups")}
          >
            👥 Groups
          </button>
          <button
            style={mobileTabStyle(mobileView === "pool")}
            onClick={() => setMobileView("pool")}
            disabled={!selectedGroup}
          >
            🧑‍💼 All Users
          </button>
          <button
            style={mobileTabStyle(mobileView === "detail")}
            onClick={() => setMobileView("detail")}
            disabled={!selectedGroup}
          >
            📋 Members
          </button>
        </div>

        {/* Active group indicator */}
        {selectedGroup && mobileView !== "groups" && (
          <div
            style={{
              margin: "0 0.75rem 0.5rem",
              padding: "6px 10px",
              background: colors.cardBg,
              border: `0.5px solid ${colors.cardBorder}`,
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: "600",
                color: colors.textPrimary,
              }}
            >
              {selectedGroup.name}
            </span>
            <button
              onClick={() => {
                setSelectedGroup(null);
                setMobileView("groups");
              }}
              style={{
                border: "none",
                background: "transparent",
                color: colors.textTertiary,
                fontSize: "0.72rem",
                cursor: "pointer",
                padding: "2px 6px",
              }}
            >
              ✕ Deselect
            </button>
          </div>
        )}

        {/* Panel content */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "0 0.75rem 1rem",
            minHeight: 0,
          }}
        >
          {mobileView === "groups" && (
            <GroupsList
              groups={groups}
              selectedGroup={selectedGroup}
              setSelectedGroup={handleSelectGroup}
              loading={loading}
              colors={colors}
              darkMode={darkMode}
              dragging={dragging}
              dropTarget={dropTarget}
              handleDragEnter={handleDragEnter}
              handleDragLeave={handleDragLeave}
              handleDropOnGroup={handleDropOnGroup}
            />
          )}

          {mobileView === "pool" && selectedGroup && (
            <UsersPool
              allUsers={allUsers}
              groupUsers={groupUsers}
              selectedGroup={selectedGroup}
              handleAssignUser={handleAssignUser}
              actionLoading={actionLoading}
              colors={colors}
              darkMode={darkMode}
              dragging={dragging}
              dropTarget={dropTarget}
              handleDragStart={handleDragStart}
              handleDragEnd={handleDragEnd}
              handleDragEnter={handleDragEnter}
              handleDragLeave={handleDragLeave}
              handleDropOnPool={handleDropOnPool}
              handleBulkAssign={handleBulkAssign}
            />
          )}

          {mobileView === "detail" && selectedGroup && (
            <GroupDetail
              selectedGroup={selectedGroup}
              groupUsers={groupUsers}
              groupUsersLoading={groupUsersLoading}
              actionLoading={actionLoading}
              handleRemoveUser={handleRemoveUser}
              setGroupModal={setGroupModal}
              setConfirmModal={setConfirmModal}
              handleDeleteGroup={handleDeleteGroup}
              colors={colors}
              darkMode={darkMode}
              userRole={userRole}
              dragging={dragging}
              dropTarget={dropTarget}
              handleDragStart={handleDragStart}
              handleDragEnd={handleDragEnd}
              handleDragEnter={handleDragEnter}
              handleDragLeave={handleDragLeave}
              handleDropOnMembers={handleDropOnMembers}
              handleBulkRemove={handleBulkRemove}
            />
          )}
        </div>
      </>
    );
  }

  // ── DESKTOP LAYOUT (unchanged) ─────────────────────────────────
  return (
    <>
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "180px 1fr 1.4fr",
          gap: "1.25rem",
          padding: "0 1rem 1rem",
          overflow: "hidden",
          minHeight: 0,
          height: 0,
        }}
      >
        <GroupsList
          groups={groups}
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
          loading={loading}
          colors={colors}
          darkMode={darkMode}
          dragging={dragging}
          dropTarget={dropTarget}
          handleDragEnter={handleDragEnter}
          handleDragLeave={handleDragLeave}
          handleDropOnGroup={handleDropOnGroup}
        />

        <UsersPool
          allUsers={allUsers}
          groupUsers={groupUsers}
          selectedGroup={selectedGroup}
          handleAssignUser={handleAssignUser}
          actionLoading={actionLoading}
          colors={colors}
          darkMode={darkMode}
          dragging={dragging}
          dropTarget={dropTarget}
          handleDragStart={handleDragStart}
          handleDragEnd={handleDragEnd}
          handleDragEnter={handleDragEnter}
          handleDragLeave={handleDragLeave}
          handleDropOnPool={handleDropOnPool}
          handleBulkAssign={handleBulkAssign}
        />

        <GroupDetail
          selectedGroup={selectedGroup}
          groupUsers={groupUsers}
          groupUsersLoading={groupUsersLoading}
          actionLoading={actionLoading}
          handleRemoveUser={handleRemoveUser}
          setGroupModal={setGroupModal}
          setConfirmModal={setConfirmModal}
          handleDeleteGroup={handleDeleteGroup}
          colors={colors}
          darkMode={darkMode}
          userRole={userRole}
          dragging={dragging}
          dropTarget={dropTarget}
          handleDragStart={handleDragStart}
          handleDragEnd={handleDragEnd}
          handleDragEnter={handleDragEnter}
          handleDragLeave={handleDragLeave}
          handleDropOnMembers={handleDropOnMembers}
          handleBulkRemove={handleBulkRemove}
        />
      </div>
    </>
  );
}

export default GroupsTab;
