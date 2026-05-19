// shared/ToggleSwitch.jsx
export function ToggleSwitch({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        cursor: "pointer",
        width: 36,
        height: 20,
        borderRadius: 10,
        padding: 2,
        background: checked ? "#3B6D11" : "#D6D1CB",
        transition: "background 0.2s",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transform: checked ? "translateX(16px)" : "translateX(0)",
          transition: "transform 0.2s",
        }}
      />
    </div>
  );
}
