// FILE: src/components/groupManagement/GroupFormModal.jsx

function GroupFormModal({
  groupModal,
  setGroupModal,
  handleGroupSubmit,
  actionLoading,
  colors,
}) {
  if (!groupModal) return null;

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
      onClick={() => setGroupModal(null)}
    >
      <div
        style={{
          background: colors.modalBg,
          border: `1px solid ${colors.modalBorder}`,
          borderRadius: "14px",
          padding: "2rem",
          width: "420px",
          maxWidth: "92%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            margin: "0 0 1.25rem",
            color: colors.textPrimary,
            fontSize: "1.15rem",
          }}
        >
          {groupModal.mode === "create"
            ? "➕ Create New Group"
            : "✏️ Edit Group"}
        </h3>

        <label
          style={{
            display: "block",
            fontSize: "0.78rem",
            fontWeight: "600",
            color: colors.textTertiary,
            marginBottom: "0.35rem",
            letterSpacing: "0.04em",
          }}
        >
          GROUP NAME
        </label>
        <input
          autoFocus
          type="text"
          value={groupModal.data?.name || ""}
          onChange={(e) =>
            setGroupModal((prev) => ({
              ...prev,
              data: { ...prev.data, name: e.target.value },
            }))
          }
          placeholder="e.g. For Decking"
          style={{
            width: "100%",
            padding: "0.6rem 0.85rem",
            borderRadius: "8px",
            border: `1px solid ${colors.inputBorder}`,
            background: colors.inputBg,
            color: colors.textPrimary,
            fontSize: "0.88rem",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        <label
          style={{
            display: "block",
            fontSize: "0.78rem",
            fontWeight: "600",
            color: colors.textTertiary,
            marginBottom: "0.35rem",
            marginTop: "1rem",
            letterSpacing: "0.04em",
          }}
        >
          DESCRIPTION
        </label>
        <textarea
          value={groupModal.data?.description || ""}
          onChange={(e) =>
            setGroupModal((prev) => ({
              ...prev,
              data: { ...prev.data, description: e.target.value },
            }))
          }
          placeholder="Optional description..."
          rows={3}
          style={{
            width: "100%",
            padding: "0.6rem 0.85rem",
            borderRadius: "8px",
            border: `1px solid ${colors.inputBorder}`,
            background: colors.inputBg,
            color: colors.textPrimary,
            fontSize: "0.88rem",
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "flex-end",
            marginTop: "1.5rem",
          }}
        >
          <button
            onClick={() => setGroupModal(null)}
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
            disabled={actionLoading === "group-form"}
            onClick={handleGroupSubmit}
            style={{
              padding: "0.5rem 1.1rem",
              borderRadius: "8px",
              border: "none",
              background: colors.btnPrimary,
              color: "#fff",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor:
                actionLoading === "group-form" ? "not-allowed" : "pointer",
              opacity: actionLoading === "group-form" ? 0.7 : 1,
            }}
          >
            {actionLoading === "group-form"
              ? "Saving..."
              : groupModal.mode === "create"
                ? "Create"
                : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GroupFormModal;
