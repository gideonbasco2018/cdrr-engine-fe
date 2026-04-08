const MAX_VISIBLE_GROUPS = 5;

function MenuPermissionsTab({
  menuByCategory,
  groups,
  setMenuPermissionsModal,
  colors,
  darkMode,
}) {
  return (
    <div style={{ flex: 1, padding: "0.75rem 1rem 1rem", overflow: "auto" }}>
      {Object.entries(menuByCategory).map(([category, items]) => (
        <div key={category} style={{ marginBottom: "1.5rem" }}>
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: "11px",
              fontWeight: "500",
              color: colors.textTertiary,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {category}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "8px",
            }}
          >
            {items.map((item) => {
              const allowed = item.allowedGroups || [];
              const visible = allowed.slice(0, MAX_VISIBLE_GROUPS);
              const overflow = allowed.length - MAX_VISIBLE_GROUPS;

              return (
                <div
                  key={item.id}
                  onClick={() =>
                    setMenuPermissionsModal({
                      menuId: item.id,
                      label: item.label,
                      icon: item.icon,
                      selectedGroups: allowed,
                    })
                  }
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.borderPrimary;
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.cardBorder;
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                  style={{
                    background: colors.cardBg,
                    border: `0.5px solid ${colors.cardBorder}`,
                    borderRadius: "12px",
                    padding: "12px 14px",
                    cursor: "pointer",
                    transition: "border-color 0.15s, transform 0.15s",
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "7px",
                        background: darkMode ? "#2a2a2a" : "#f4f4f4",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </div>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "500",
                        color: colors.textPrimary,
                        lineHeight: 1.2,
                      }}
                    >
                      {item.label}
                    </span>
                  </div>

                  {/* Divider */}
                  <div
                    style={{
                      height: "0.5px",
                      background: colors.cardBorder,
                      marginBottom: "9px",
                    }}
                  />

                  {/* Groups */}
                  <div
                    style={{
                      fontSize: "11px",
                      color: colors.textTertiary,
                      marginBottom: "6px",
                    }}
                  >
                    Allowed groups
                  </div>

                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}
                  >
                    {allowed.length > 0 ? (
                      <>
                        {visible.map((groupId) => {
                          const group = groups.find((g) => g.id === groupId);
                          return group ? (
                            <span
                              key={groupId}
                              style={{
                                fontSize: "11px",
                                fontWeight: "500",
                                padding: "3px 8px",
                                borderRadius: "20px",
                                background: darkMode ? "#2a2a2a" : "#f4f4f4",
                                color: colors.textSecondary,
                                border: `0.5px solid ${colors.cardBorder}`,
                                lineHeight: 1.4,
                              }}
                            >
                              {group.name}
                            </span>
                          ) : null;
                        })}
                        {overflow > 0 && (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "500",
                              padding: "3px 8px",
                              borderRadius: "20px",
                              background: colors.infoBg,
                              color: colors.infoText,
                              lineHeight: 1.4,
                            }}
                          >
                            +{overflow} more
                          </span>
                        )}
                      </>
                    ) : (
                      <span
                        style={{
                          fontSize: "11px",
                          color: colors.textTertiary,
                          fontStyle: "italic",
                        }}
                      >
                        No groups assigned
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MenuPermissionsTab;
