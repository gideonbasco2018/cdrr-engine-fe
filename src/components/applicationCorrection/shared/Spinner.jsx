export function Spinner({ darkMode }) {
  return (
    <div style={{ display: "inline-block", width: 40, height: 40 }}>
      <svg viewBox="0 0 44 44" width="40" height="40">
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke={darkMode ? "#2a2a2a" : "#E9E5DF"}
          strokeWidth="3.5"
        />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke={darkMode ? "#4A90C4" : "#2C5F8A"}
          strokeWidth="3.5"
          strokeDasharray="90 200"
          strokeLinecap="round"
          style={{
            transformOrigin: "50% 50%",
            animation: "spin 1s linear infinite",
          }}
        />
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
