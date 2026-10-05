// FILE: src/components/donation/StickyColumnsMenu.jsx
import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

/* ── "📌 Pin Columns" button + checkbox-list dropdown — lets the user pick
   which data columns stay pinned to the left while scrolling horizontally.
   Positioning logic copies ActionMenu.jsx's viewport-clamped pattern. ── */

export default function StickyColumnsMenu({ columns, stickyKeys, onToggle, onClear, colors, darkMode }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, maxHeight: 320 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const calcPos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuH = menuRef.current?.offsetHeight ?? 320;
    const menuW = menuRef.current?.offsetWidth ?? 240;
    const PAD = 8;
    const spaceBelow = window.innerHeight - rect.bottom - PAD;
    const spaceAbove = rect.top - PAD;
    const up = spaceBelow < menuH && spaceAbove > spaceBelow;
    const room = Math.max(120, up ? spaceAbove : spaceBelow);
    const top = up
      ? Math.max(PAD, rect.top - Math.min(menuH, room) - 4)
      : Math.min(rect.bottom + 4, window.innerHeight - PAD - Math.min(menuH, room));
    let left = rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
    setMenuPos({ top, left, maxHeight: room });
  }, []);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(calcPos);
    window.addEventListener("scroll", calcPos, true);
    window.addEventListener("resize", calcPos);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", calcPos, true);
      window.removeEventListener("resize", calcPos);
    };
  }, [open, calcPos]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const hasSticky = stickyKeys.length > 0;

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        title="Choose columns to pin"
        style={{
          padding: "0.35rem 0.7rem",
          fontSize: "0.75rem",
          fontWeight: 600,
          borderRadius: 8,
          border: `1px solid ${hasSticky ? "#4CAF50" : colors.cardBorder}`,
          background: hasSticky ? "#4CAF5015" : "transparent",
          color: hasSticky ? "#2e7d32" : colors.textTertiary,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
        }}
      >
        📌 Pin Columns{hasSticky ? ` (${stickyKeys.length})` : ""}
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              zIndex: 99999,
              background: darkMode ? "#1e2022" : "#ffffff",
              border: `1px solid ${darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"}`,
              borderRadius: 10,
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              width: 240,
              maxHeight: menuPos.maxHeight,
              overflowY: "auto",
              padding: "6px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 14px 8px",
                marginBottom: 4,
                borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
              }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: colors.textTertiary,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Pin Columns
              </span>
              {hasSticky && (
                <span
                  onClick={onClear}
                  style={{ fontSize: "0.68rem", fontWeight: 600, color: "#ef4444", cursor: "pointer" }}
                >
                  Clear
                </span>
              )}
            </div>
            {columns.map((col) => (
              <label
                key={col.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 14px",
                  fontSize: "0.78rem",
                  color: darkMode ? "#e2e8f0" : "#1e293b",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.06)" : "#f1f5f9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <input
                  type="checkbox"
                  checked={stickyKeys.includes(col.key)}
                  onChange={() => onToggle(col.key)}
                  style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#4CAF50" }}
                />
                {col.label}
              </label>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
