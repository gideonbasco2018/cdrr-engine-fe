// FILE: src/components/donation/ActionMenu.jsx
import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { ROW_ACTION_ITEMS } from "./constants";

/* ── Row action menu — copies the pattern/behavior of the ActionMenu in
   FGMP Queue (components/gmp/queue/QueueTable.jsx): a "⋮" button that
   opens a portal-rendered dropdown, auto-positioned, and closes on an
   outside click. ── */

export default function ActionMenu({ record, onAction, colors, darkMode }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const calcPos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuH = menuRef.current?.offsetHeight ?? 140;
    const menuW = menuRef.current?.offsetWidth ?? 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < menuH + 8 ? rect.top - menuH - 4 : rect.bottom + 4;
    let left = rect.right - menuW;
    left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
    setMenuPos({ top, left });
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
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        title="Actions"
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          border: `1px solid ${open ? "#4CAF50" : "#4CAF5040"}`,
          background: open ? "#4CAF50" : "#4CAF5015",
          color: open ? "#fff" : "#4CAF50",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.05rem",
          fontWeight: 700,
          transition: "all 0.12s",
        }}
      >
        ⋮
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
              minWidth: 200,
              padding: "6px 0",
            }}
          >
            {ROW_ACTION_ITEMS.map((item) => {
              if (item.label === "---") {
                return (
                  <div
                    key={item.id}
                    style={{
                      height: 1,
                      background: darkMode
                        ? "rgba(255,255,255,0.07)"
                        : "rgba(0,0,0,0.07)",
                      margin: "4px 0",
                    }}
                  />
                );
              }
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setOpen(false);
                    onAction(item.id, record);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 16px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "0.85rem",
                    fontWeight: item.color ? 600 : 400,
                    color: item.color ?? (darkMode ? "#e2e8f0" : "#1e293b"),
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = darkMode
                      ? "rgba(255,255,255,0.06)"
                      : "#f1f5f9")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <span
                    style={{
                      width: 22,
                      textAlign: "center",
                      fontSize: "0.92rem",
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
