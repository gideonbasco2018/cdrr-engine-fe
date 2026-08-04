import React from "react";
import { STATUS_KIND_MAP, STATUS_KIND_STYLES } from "./statusHelpers";

export function StatusPill({ status }) {
  const key = (status || "").trim().toUpperCase();
  const kind = STATUS_KIND_MAP[key] || "default";
  const s = STATUS_KIND_STYLES[kind];

  return (
    <div style={{ minWidth: 110, maxWidth: 150 }}>
      <div
        style={{
          fontSize: "10.5px",
          fontWeight: 700,
          color: s.color,
          marginBottom: "3px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {status}
      </div>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 6,
          borderRadius: "9999px",
          background: "rgba(150,150,150,0.2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${s.fill}%`,
            borderRadius: "9999px",
            background: s.striped
              ? `repeating-linear-gradient(45deg, ${s.color}, ${s.color} 6px, ${s.color}cc 6px, ${s.color}cc 12px)`
              : s.color,
            backgroundSize: s.striped ? "16px 16px" : "auto",
            animation: s.striped
              ? "statusBarMove 0.9s linear infinite"
              : "none",
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <style>{`
        @keyframes statusBarMove {
          from { background-position: 0 0; }
          to { background-position: 16px 0; }
        }
      `}</style>
    </div>
  );
}

export default StatusPill;
