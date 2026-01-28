// src/components/fda/actions/FDAActionDropdown.jsx
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

function FDAActionDropdown({
  isOpen,
  onClose,
  onViewDetails,
  onEdit,
  onDelete,
  drugName,
  activeTab,
  darkMode,
  buttonRef,
}) {
  const dropdownRef = useRef(null);

  const colors = darkMode
    ? {
        cardBg: "#0f0f0f",
        cardBorder: "#1a1a1a",
        textPrimary: "#fff",
        tableRowHover: "#151515",
      }
    : {
        cardBg: "#ffffff",
        cardBorder: "#e5e5e5",
        textPrimary: "#000",
        tableRowHover: "#f0f0f0",
      };

  useEffect(() => {
    if (isOpen && buttonRef && dropdownRef.current) {
      const updatePosition = () => {
        const buttonRect = buttonRef.getBoundingClientRect();
        const dropdown = dropdownRef.current;

        if (dropdown) {
          // Calculate if dropdown would go off-screen
          const dropdownHeight = 150; // approximate height
          const spaceBelow = window.innerHeight - buttonRect.bottom;

          if (spaceBelow < dropdownHeight) {
            // Position above if not enough space below
            dropdown.style.top = `${buttonRect.top - dropdownHeight - 4}px`;
          } else {
            // Position below normally
            dropdown.style.top = `${buttonRect.bottom + 4}px`;
          }

          dropdown.style.left = `${buttonRect.right - 150}px`; // Align to right of button
        }
      };

      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen, buttonRef]);

  if (!isOpen) return null;

  const dropdownContent = (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        zIndex: 999999,
        minWidth: "150px",
        overflow: "hidden",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => {
          onClose();
          onViewDetails();
        }}
        style={{
          width: "100%",
          padding: "0.75rem 1rem",
          background: "transparent",
          border: "none",
          textAlign: "left",
          cursor: "pointer",
          color: colors.textPrimary,
          fontSize: "0.85rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = colors.tableRowHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <span>👁️</span>
        <span>View Details</span>
      </button>

      {activeTab !== "deleted" && (
        <>
          <button
            onClick={() => {
              onClose();
              onEdit();
            }}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "transparent",
              border: "none",
              textAlign: "left",
              cursor: "pointer",
              color: colors.textPrimary,
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.tableRowHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span>✏️</span>
            <span>Edit</span>
          </button>

          <div
            style={{
              height: "1px",
              background: colors.cardBorder,
              margin: "0.25rem 0",
            }}
          />

          <button
            onClick={() => {
              onClose();
              onDelete();
            }}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "transparent",
              border: "none",
              textAlign: "left",
              cursor: "pointer",
              color: "#ff4444",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 68, 68, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span>🗑️</span>
            <span>Delete</span>
          </button>
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );

  // Render the dropdown using a portal to document.body
  return createPortal(dropdownContent, document.body);
}

export default FDAActionDropdown;
