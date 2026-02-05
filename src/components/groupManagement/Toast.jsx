// FILE: src/components/groupManagement/Toast.jsx

function Toast({ toast, colors }) {
  if (!toast) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "1.5rem",
        right: "1.5rem",
        zIndex: 1000,
        padding: "0.85rem 1.4rem",
        borderRadius: "10px",
        background:
          toast.type === "success"
            ? colors.toastSuccess.bg
            : colors.toastError.bg,
        color: "#fff",
        fontSize: "0.85rem",
        fontWeight: "500",
        boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
        animation: "slideIn 0.3s ease",
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
      }}
    >
      <span>{toast.type === "success" ? "✓" : "✕"}</span>
      {toast.message}
    </div>
  );
}

export default Toast;
