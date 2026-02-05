// FILE: src/components/groupManagement/AssignUserBar.jsx

function AssignUserBar({
  selectedGroup,
  assignSearch,
  setAssignSearch,
  showAssignDropdown,
  setShowAssignDropdown,
  availableUsers,
  allUsers,
  handleAssignUser,
  colors,
}) {
  return (
    <div
      style={{
        background: colors.cardBg,
        borderLeft: `1px solid ${colors.cardBorder}`,
        borderRight: `1px solid ${colors.cardBorder}`,
        padding: "1rem 1.5rem",
        borderBottom: `1px solid ${colors.rowBorder}`,
        position: "relative",
      }}
    >
      <div
        style={{
          fontSize: "0.75rem",
          fontWeight: "600",
          color: colors.textTertiary,
          letterSpacing: "0.04em",
          marginBottom: "0.5rem",
        }}
      >
        ASSIGN USER TO GROUP
      </div>
      <div style={{ display: "flex", gap: "0.6rem" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            type="text"
            placeholder="Search user to assign..."
            value={assignSearch}
            onFocus={() => setShowAssignDropdown(true)}
            onChange={(e) => {
              setAssignSearch(e.target.value);
              setShowAssignDropdown(true);
            }}
            style={{
              width: "100%",
              padding: "0.5rem 0.85rem",
              borderRadius: "8px",
              border: `1px solid ${colors.inputBorder}`,
              background: colors.inputBg,
              color: colors.textPrimary,
              fontSize: "0.85rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          {showAssignDropdown && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 50,
                background: colors.dropdownBg,
                border: `1px solid ${colors.dropdownBorder}`,
                borderRadius: "8px",
                marginTop: "4px",
                maxHeight: "200px",
                overflowY: "auto",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              {availableUsers.length === 0 ? (
                <div
                  style={{
                    padding: "0.85rem",
                    color: colors.textTertiary,
                    fontSize: "0.82rem",
                    textAlign: "center",
                  }}
                >
                  {allUsers.length === 0
                    ? "No users available"
                    : "No matching users"}
                </div>
              ) : (
                availableUsers.slice(0, 15).map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleAssignUser(u.id)}
                    style={{
                      padding: "0.6rem 0.85rem",
                      cursor: "pointer",
                      borderBottom: `1px solid ${colors.rowBorder}`,
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = colors.dropdownHover)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div
                      style={{
                        fontWeight: "600",
                        fontSize: "0.85rem",
                        color: colors.textPrimary,
                      }}
                    >
                      {u.first_name || u.username}
                      <span
                        style={{
                          fontWeight: "400",
                          color: colors.textTertiary,
                          marginLeft: "0.4rem",
                        }}
                      >
                        @{u.username}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: colors.textTertiary,
                      }}
                    >
                      {u.email}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AssignUserBar;
