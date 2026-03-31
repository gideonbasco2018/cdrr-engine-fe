// FILE: src/components/groupManagement/GroupsTab.jsx
import StatsCards from "./StatsCards";
import GroupsList from "./GroupsList";
import UsersPool from "./UsersPool";
import GroupDetail from "./GroupDetail";

function GroupsTab({
  groups,
  allUsers,
  selectedGroup,
  setSelectedGroup,
  groupUsers,
  loading,
  groupUsersLoading,
  actionLoading,
  assignSearch,
  setAssignSearch,
  showAssignDropdown,
  setShowAssignDropdown,
  availableUsers,
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
  handleDropOnGroup,
  handleDropOnMembers,
  handleDropOnPool,
  handleBulkRemove,
  handleBulkAssign,
}) {
  return (
    <>
      <StatsCards
        groups={groups}
        allUsers={allUsers}
        colors={colors}
        darkMode={darkMode}
      />

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "240px 1fr 1fr",
          gap: "1.25rem",
          padding: "0 2rem 2rem",
          overflow: "hidden",
          minHeight: 0,
          height: 0,
        }}
      >
        {/* COL 1 — Groups List (also a drop zone per group row) */}
        <GroupsList
          groups={groups}
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
          loading={loading}
          colors={colors}
          darkMode={darkMode}
          // DnD
          dragging={dragging}
          dropTarget={dropTarget}
          handleDragEnter={handleDragEnter}
          handleDragLeave={handleDragLeave}
          handleDropOnGroup={handleDropOnGroup}
        />

        {/* COL 2 — Users Pool (all users not in selectedGroup) */}
        <UsersPool
          allUsers={allUsers}
          groupUsers={groupUsers}
          selectedGroup={selectedGroup}
          assignSearch={assignSearch}
          setAssignSearch={setAssignSearch}
          handleAssignUser={handleAssignUser}
          actionLoading={actionLoading}
          colors={colors}
          darkMode={darkMode}
          // DnD
          dragging={dragging}
          dropTarget={dropTarget}
          handleDragStart={handleDragStart}
          handleDragEnd={handleDragEnd}
          handleDragEnter={handleDragEnter}
          handleDragLeave={handleDragLeave}
          handleDropOnPool={handleDropOnPool}
          handleBulkAssign={handleBulkAssign}
        />

        {/* COL 3 — Group Detail (members of selectedGroup) */}
        <GroupDetail
          selectedGroup={selectedGroup}
          groupUsers={groupUsers}
          groupUsersLoading={groupUsersLoading}
          actionLoading={actionLoading}
          assignSearch={assignSearch}
          setAssignSearch={setAssignSearch}
          showAssignDropdown={showAssignDropdown}
          setShowAssignDropdown={setShowAssignDropdown}
          availableUsers={availableUsers}
          allUsers={allUsers}
          handleAssignUser={handleAssignUser}
          handleRemoveUser={handleRemoveUser}
          setGroupModal={setGroupModal}
          setConfirmModal={setConfirmModal}
          handleDeleteGroup={handleDeleteGroup}
          colors={colors}
          darkMode={darkMode}
          userRole={userRole}
          // DnD
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
