// FILE: src/components/groupManagement/MenuPermissionsModal.jsx

function MenuPermissionsModal({
  menuPermissionsModal,
  setMenuPermissionsModal,
  groups,
  toggleGroupPermission,
  handleMenuPermissionsSave,
  colors,
  darkMode,
}) {
  if (!menuPermissionsModal) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: colors.modalOverlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={() => setMenuPermissionsModal(null)}
    >
      <div
        style={{
          background: colors.modalBg,
          border: `1px solid ${colors.modalBorder}`,
          borderRadius: "14px",
          padding: "2rem",
          width: "500px",
          maxWidth: "92%",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1.5rem",
          }}
        >
          <span style={{ fontSize: "1.8rem" }}>
            {menuPermissionsModal.icon}
          </span>
          <div>
            <h3
              style={{
                margin: 0,
                color: colors.textPrimary,
                fontSize: "1.15rem",
              }}
            >
              {menuPermissionsModal.label}
            </h3>
            <p
              style={{
                margin: "0.25rem 0 0",
                color: colors.textTertiary,
                fontSize: "0.8rem",
              }}
            >
              Select which groups can access this menu
            </p>
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.78rem",
              fontWeight: "600",
              color: colors.textTertiary,
              marginBottom: "0.75rem",
              letterSpacing: "0.04em",
            }}
          >
            ALLOWED GROUPS
          </label>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {groups.map((group) => (
              <label
                key={group.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: `1px solid ${colors.inputBorder}`,
                  background: menuPermissionsModal.selectedGroups?.includes(
                    group.id,
                  )
                    ? colors.selectedBg
                    : colors.inputBg,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (
                    !menuPermissionsModal.selectedGroups?.includes(group.id)
                  ) {
                    e.currentTarget.style.background = colors.rowHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (
                    !menuPermissionsModal.selectedGroups?.includes(group.id)
                  ) {
                    e.currentTarget.style.background = colors.inputBg;
                  }
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    menuPermissionsModal.selectedGroups?.includes(group.id) ||
                    false
                  }
                  onChange={() => toggleGroupPermission(group.id)}
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: "pointer",
                    accentColor: colors.btnPrimary,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: "600",
                      fontSize: "0.88rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {group.name}
                  </div>
                  {group.description && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: colors.textTertiary,
                      }}
                    >
                      {group.description}
                    </div>
                  )}
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
                  {group.user_count ?? "—"} users
                </span>
              </label>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "flex-end",
            paddingTop: "1rem",
            borderTop: `1px solid ${colors.modalBorder}`,
          }}
        >
          <button
            onClick={() => setMenuPermissionsModal(null)}
            style={{
              padding: "0.5rem 1.1rem",
              borderRadius: "8px",
              border: `1px solid ${colors.modalBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleMenuPermissionsSave}
            style={{
              padding: "0.5rem 1.1rem",
              borderRadius: "8px",
              border: "none",
              background: colors.btnPrimary,
              color: "#fff",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Save Permissions
          </button>
        </div>
      </div>
    </div>
  );
}

export default MenuPermissionsModal;
