// FILE: src/components/groupManagement/MenuPermissionsTab.jsx

function MenuPermissionsTab({
  menuByCategory,
  groups,
  setMenuPermissionsModal,
  colors,
  darkMode,
}) {
  return (
    <div style={{ flex: 1, padding: "1.5rem 2rem 2rem", overflow: "auto" }}>
      {Object.entries(menuByCategory).map(([category, items]) => (
        <div key={category} style={{ marginBottom: "2rem" }}>
          <h3
            style={{
              margin: "0 0 1rem",
              fontSize: "0.85rem",
              fontWeight: "700",
              color: colors.textTertiary,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {category}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  background: colors.cardBg,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "12px",
                  padding: "1.25rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onClick={() =>
                  setMenuPermissionsModal({
                    menuId: item.id,
                    label: item.label,
                    icon: item.icon,
                    selectedGroups: item.allowedGroups || [],
                  })
                }
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.btnPrimary;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.cardBorder;
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: "600",
                        fontSize: "0.95rem",
                        color: colors.textPrimary,
                      }}
                    >
                      {item.label}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "0.75rem",
                    color: colors.textTertiary,
                    marginBottom: "0.5rem",
                  }}
                >
                  Allowed Groups:
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.4rem",
                  }}
                >
                  {item.allowedGroups && item.allowedGroups.length > 0 ? (
                    item.allowedGroups.map((groupId) => {
                      const group = groups.find((g) => g.id === groupId);
                      return group ? (
                        <span
                          key={groupId}
                          style={{
                            padding: "0.25rem 0.6rem",
                            borderRadius: "12px",
                            background: darkMode ? "#2a2a2a" : "#f0f0f0",
                            color: colors.textSecondary,
                            fontSize: "0.75rem",
                            fontWeight: "500",
                          }}
                        >
                          {group.name}
                        </span>
                      ) : null;
                    })
                  ) : (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: colors.textTertiary,
                        fontStyle: "italic",
                      }}
                    >
                      No groups assigned
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MenuPermissionsTab;
