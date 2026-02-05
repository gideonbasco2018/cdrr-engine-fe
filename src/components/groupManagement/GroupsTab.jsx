// FILE: src/components/groupManagement/GroupsTab.jsx

import StatsCards from "./StatsCards";
import GroupsList from "./GroupsList";
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
          display: "flex",
          gap: "1.25rem",
          padding: "0 2rem 2rem",
          overflow: "auto",
        }}
      >
        <GroupsList
          groups={groups}
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
          loading={loading}
          colors={colors}
          darkMode={darkMode}
        />

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
        />
      </div>
    </>
  );
}

export default GroupsTab;
