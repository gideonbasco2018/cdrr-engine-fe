import React from "react";

export function Avatar({ name, colors }) {
  const initials = (name || "")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: colors.btnPrimary,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export default Avatar;
