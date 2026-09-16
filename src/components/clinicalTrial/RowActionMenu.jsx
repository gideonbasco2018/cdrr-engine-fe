// FILE: src/components/clinicalTrial/RowActionMenu.jsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/* ── RowActionMenu — rendered via portal straight into document.body,
     so it floats above the table's scroll/overflow container instead
     of getting clipped by it. Flips upward automatically if there's
     not enough room below the trigger button. ── */
function RowActionMenu({
  anchorEl,
  onClose,
  onViewDetails,
  onUpdate,
  onViewAuditLog,
  colors,
  darkMode,
}) {
  const menuRef = useRef(null);
  const [position, setPosition] = useState(null);

  useEffect(() => {
    if (!anchorEl) return;

    const computePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const menuHeight = 124; // 3 items now
      const menuWidth = 160;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < menuHeight + 12;

      setPosition({
        top: openUpward ? rect.top - menuHeight - 4 : rect.bottom + 4,
        left: Math.min(
          rect.right - menuWidth,
          window.innerWidth - menuWidth - 8,
        ),
      });
    };

    computePosition();
    window.addEventListener("scroll", computePosition, true);
    window.addEventListener("resize", computePosition);
    return () => {
      window.removeEventListener("scroll", computePosition, true);
      window.removeEventListener("resize", computePosition);
    };
  }, [anchorEl]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !anchorEl?.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [anchorEl, onClose]);

  if (!anchorEl || !position) return null;

  const itemStyle = {
    display: "block",
    width: "100%",
    padding: "0.5rem 0.75rem",
    background: "transparent",
    border: "none",
    textAlign: "left",
    fontSize: "0.68rem",
    color: colors.textPrimary,
    cursor: "pointer",
  };

  const hoverIn = (e) =>
    (e.currentTarget.style.background = darkMode ? "#1f1f1f" : "#f0f0f0");
  const hoverOut = (e) => (e.currentTarget.style.background = "transparent");

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        minWidth: "160px",
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "8px",
        boxShadow: "0 10px 28px rgba(0,0,0,0.25)",
        zIndex: 2000,
        overflow: "hidden",
        textAlign: "left",
      }}
    >
      <button
        onClick={onViewDetails}
        style={itemStyle}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
      >
        👁 View Details
      </button>
      <button
        onClick={onUpdate}
        style={{ ...itemStyle, borderTop: `1px solid ${colors.cardBorder}` }}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
      >
        ✏️ Update
      </button>
      <button
        onClick={onViewAuditLog}
        style={{ ...itemStyle, borderTop: `1px solid ${colors.cardBorder}` }}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
      >
        🕓 View Change Logs
      </button>
    </div>,
    document.body,
  );
}

export default RowActionMenu;
