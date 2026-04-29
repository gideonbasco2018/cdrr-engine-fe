import { useState, useEffect } from "react";

const STORAGE_KEY = "datatable_guide_seen";

const tips = [
  {
    icon: "👆",
    color: "#EEEDFE",
    label: "Double-click a row — View Details",
    desc: (
      <>
        Double-click anywhere on a row to instantly open the full record
        details. Only available in the <strong>Received</strong> subtab.
      </>
    ),
  },
  {
    icon: "🏷️",
    color: "#E1F5EE",
    label: "Click the DTN badge — Doctrack Details",
    desc: "Click the colored DTN number badge in the first column to open the Doctrack details of that record.",
  },
  {
    icon: "☑️",
    color: "#E6F1FB",
    label: "Select rows — Bulk actions",
    desc: (
      <>
        Check one or more rows to reveal bulk action buttons:{" "}
        <Kbd>Mark as Received</Kbd> <Kbd>Generate Transmittal</Kbd>{" "}
        <Kbd>Mark as Completed</Kbd>
      </>
    ),
  },
  {
    icon: "⋮",
    color: "#FAEEDA",
    label: "Actions menu — Per-row options",
    desc: (
      <>
        Click the <Kbd>⋮</Kbd> button at the end of each row to access:
        Application Logs, Change Log, and Doctrack Details. A blue dot indicates
        an unread record.
      </>
    ),
  },
  {
    icon: "↕️",
    color: "#EAF3DE",
    label: "Click column headers — Sort",
    desc: "Click any column header to sort the data. Click again to reverse the order. The current sort is shown in the header bar.",
  },
];

function Kbd({ children }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: "rgba(0,0,0,0.06)",
        border: "0.5px solid rgba(0,0,0,0.15)",
        borderRadius: 4,
        padding: "1px 6px",
        fontSize: 11,
        fontFamily: "monospace",
      }}
    >
      {children}
    </span>
  );
}

function TipCard({ icon, color, label, desc }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        background: "rgba(0,0,0,0.03)",
        border: "0.5px solid rgba(0,0,0,0.08)",
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            margin: "0 0 3px",
            fontSize: 13,
            fontWeight: 600,
            color: "inherit",
          }}
        >
          {label}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "rgba(0,0,0,0.5)",
            lineHeight: 1.55,
          }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}

export default function HowToUseModal({ colors, darkMode, onClose }) {
  const [dontShow, setDontShow] = useState(false);

  const handleClose = () => {
    if (dontShow) localStorage.setItem(STORAGE_KEY, "true");
    onClose?.();
  };

  const overlay = {
    position: "fixed",
    inset: 0,
    zIndex: 99999,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
  };

  const modal = {
    background: colors.cardBg,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: 14,
    width: "100%",
    maxWidth: 520,
    boxShadow: "0 16px 48px rgba(0,0,0,0.25)",
    overflow: "hidden",
  };

  return (
    <div style={overlay} onClick={handleClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            padding: "1.1rem 1.5rem",
            borderBottom: `1px solid ${colors.tableBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#7c3aed",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ?
            </span>
            <span
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              How to use this table
            </span>
            <span
              style={{
                background: "rgba(33,150,243,0.12)",
                color: "#1976d2",
                fontSize: "0.6rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              GUIDE
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.1rem",
              color: colors.textSecondary,
              cursor: "pointer",
              lineHeight: 1,
              padding: "2px 6px",
              borderRadius: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "1.1rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          {tips.map((tip, i) => (
            <TipCard key={i} {...tip} />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "0.9rem 1.5rem",
            borderTop: `1px solid ${colors.tableBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.75rem",
              color: colors.textSecondary,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              style={{ cursor: "pointer", accentColor: "#7c3aed" }}
            />
            Don't show this again
          </label>
          <button
            onClick={handleClose}
            style={{
              padding: "0.5rem 1.4rem",
              background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
            }}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Hook — call this in DataTable to control auto-show logic
   ───────────────────────────────────────────────────────── */
export function useHowToUseGuide() {
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setShowGuide(true);
  }, []);

  return {
    showGuide,
    openGuide: () => setShowGuide(true),
    closeGuide: () => setShowGuide(false),
  };
}
