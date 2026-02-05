// FILE: src/components/groupManagement/GroupDetail.jsx

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
}) {
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
            <div
              style={{
                color: colors.textSecondary,
                fontSize: "0.9rem",
              }}
            >
              Select a group to view details
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
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
      />
    </div>
  );
}

export default GroupDetail;
