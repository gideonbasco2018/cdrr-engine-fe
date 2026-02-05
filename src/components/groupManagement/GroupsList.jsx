// FILE: src/components/groupManagement/GroupsList.jsx

function GroupsList({
  groups,
  selectedGroup,
  setSelectedGroup,
  loading,
  colors,
  darkMode,
}) {
  return (
    <div
      style={{
        width: "300px",
        minWidth: "300px",
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "14px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "0.9rem",
          borderBottom: `1px solid ${colors.cardBorder}`,
        }}
      >
        <input
          type="text"
          placeholder="Search groups..."
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
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: colors.textTertiary,
              fontSize: "0.85rem",
            }}
          >
            Loading...
          </div>
        ) : groups.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📂</div>
            <div
              style={{
                color: colors.textSecondary,
                fontSize: "0.85rem",
              }}
            >
              No groups yet.
            </div>
          </div>
        ) : (
          groups.map((group) => {
            const isSelected = selectedGroup?.id === group.id;
            return (
              <div
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                style={{
                  padding: "0.85rem 1rem",
                  cursor: "pointer",
                  background: isSelected ? colors.selectedBg : "transparent",
                  borderLeft: isSelected
                    ? `3px solid ${colors.btnPrimary}`
                    : "3px solid transparent",
                  borderBottom: `1px solid ${colors.rowBorder}`,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  !isSelected &&
                  (e.currentTarget.style.background = colors.rowHover)
                }
                onMouseLeave={(e) =>
                  !isSelected &&
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "600",
                      fontSize: "0.9rem",
                      color: isSelected
                        ? colors.btnPrimary
                        : colors.textPrimary,
                    }}
                  >
                    {group.name}
                  </div>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: "700",
                      background: darkMode ? "#2a2a2a" : "#f0f0f0",
                      color: colors.textTertiary,
                      padding: "0.15rem 0.5rem",
                      borderRadius: "10px",
                    }}
                  >
                    {group.user_count ?? "—"}
                  </span>
                </div>
                {group.description && (
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: colors.textTertiary,
                      marginTop: "0.2rem",
                    }}
                  >
                    {group.description}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default GroupsList;
