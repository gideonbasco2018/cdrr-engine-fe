// src/components/fda/actions/FDAActionDropdown.jsx
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

function FDAActionDropdown({
  isOpen,
  onClose,
  onViewDetails,
  onEdit,
  onCancel, // ✅ Changed from onDelete
  drugName,
  isCanceled, // ✅ NEW: Track if drug is canceled
  activeTab,
  darkMode,
  buttonRef,
  currentUser,
  uploadedBy,
  canEdit, // ✅ NEW: Use passed canEdit prop instead of calculating here
}) {
  const dropdownRef = useRef(null);

  // ✅ UPDATED: Admin can always cancel/restore, regular users can only cancel/restore their own records
  const canCancelOrRestore =
    currentUser &&
    (currentUser.role === "Admin" ||
      currentUser.role === "admin" ||
      (uploadedBy && currentUser.username === uploadedBy));

  const colors = darkMode
    ? {
        cardBg: "#0f0f0f",
        cardBorder: "#1a1a1a",
        textPrimary: "#fff",
        textTertiary: "#666",
        tableRowHover: "#151515",
      }
    : {
        cardBg: "#ffffff",
        cardBorder: "#e5e5e5",
        textPrimary: "#000",
        textTertiary: "#999",
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

  // ✅ NEW: Determine action type (Cancel or Restore)
  const actionText = isCanceled ? "Restore" : "Cancel";
  const actionIcon = isCanceled ? "♻️" : "🚫";
  const actionColor = isCanceled ? "#4CAF50" : "#ff4444";

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
      {/* View Details - Always available */}
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

      {/* ✅ UPDATED: Only show Edit and Cancel/Restore for non-canceled records OR in canceled tab */}
      {(activeTab === "canceled" || !isCanceled) && (
        <>
          {/* Edit Button - Only for non-canceled records */}
          {!isCanceled && (
            <>
              {canEdit ? (
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
              ) : (
                <div
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    cursor: "not-allowed",
                    color: colors.textTertiary,
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    opacity: 0.5,
                  }}
                  title="You can only edit records you uploaded"
                >
                  <span>🔒</span>
                  <span>Edit (Locked)</span>
                </div>
              )}

              <div
                style={{
                  height: "1px",
                  background: colors.cardBorder,
                  margin: "0.25rem 0",
                }}
              />
            </>
          )}

          {/* ✅ UPDATED: Cancel/Restore Button - Dynamic based on isCanceled */}
          {canCancelOrRestore ? (
            <button
              onClick={() => {
                onClose();
                onCancel();
              }}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                background: "transparent",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                color: actionColor,
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isCanceled
                  ? "rgba(76, 175, 80, 0.1)"
                  : "rgba(255, 68, 68, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span>{actionIcon}</span>
              <span>{actionText}</span>
            </button>
          ) : (
            <div
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                background: "transparent",
                border: "none",
                textAlign: "left",
                cursor: "not-allowed",
                color: colors.textTertiary,
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                opacity: 0.5,
              }}
              title={`You can only ${actionText.toLowerCase()} records you uploaded`}
            >
              <span>🔒</span>
              <span>{actionText} (Locked)</span>
            </div>
          )}
        </>
      )}

      {/* ✅ Show who uploaded this record */}
      {uploadedBy && (
        <>
          <div
            style={{
              height: "1px",
              background: colors.cardBorder,
              margin: "0.25rem 0",
            }}
          />
          <div
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.75rem",
              color: colors.textTertiary,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>📤</span>
            <span>By: {uploadedBy}</span>
          </div>
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
