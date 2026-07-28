// components/tasks/viewdetails/steps/StepUIKit.jsx
import { createContext } from "react";

/* ================================================================== */
/*  Shared design tokens — used by ALL step components (1, 2, 3, 4)     */
/*  so the whole record modal reads as one consistent design system.    */
/* ================================================================== */
export const ACCENT = "#2563eb";
export const ACCENT_DARK = "#1d4ed8";
export const ACCENT_BG = "#eff6ff";
export const ICON_CIRCLE_BG = "#e0e7ff";
export const SUCCESS = "#16a34a";
export const SUCCESS_DARK = "#15803d";
export const DANGER = "#dc2626";
export const WARNING = "#b45309";

/* ================================================================== */
/*  Shared typography / spacing scale — matches Step1FullDetails so     */
/*  every step (App Logs, Action, Documents) reads as one design.      */
/* ================================================================== */
export const FONT = {
  xs: "0.6rem", // meta / index badges
  sm: "0.62rem", // tertiary text, compact notices
  body: "0.7rem", // field values, inputs, row text
  md: "0.72rem", // labels, notice text
  lg: "0.78rem", // section/card titles
  xl: "0.85rem", // status bar numbers
};
export const LABEL_COLOR = "#7a8190";
export const RADIUS = {
  card: "8px",
  input: "7px",
  pill: "999px",
};

export const LabelWidthContext = createContext(150);

/* Simple line icons — same set used across all steps */
const IconSvg = ({ children, size = 13 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

export const Icons = {
  info: (
    <IconSvg>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-5M12 8h.01" />
    </IconSvg>
  ),
  pill: (
    <IconSvg>
      <rect
        x="3"
        y="8"
        width="18"
        height="8"
        rx="4"
        transform="rotate(45 12 12)"
      />
      <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
    </IconSvg>
  ),
  box: (
    <IconSvg>
      <path d="M21 8l-9-5-9 5 9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </IconSvg>
  ),
  cash: (
    <IconSvg>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
    </IconSvg>
  ),
  company: (
    <IconSvg>
      <path d="M17 3l4 4-4 4M21 7H9M7 21l-4-4 4-4M3 17h12" />
    </IconSvg>
  ),
  hash: (
    <IconSvg>
      <path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />
    </IconSvg>
  ),
  check: (
    <IconSvg>
      <path d="M20 6L9 17l-5-5" />
    </IconSvg>
  ),
  shield: (
    <IconSvg>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </IconSvg>
  ),
  edit: (
    <IconSvg size={15}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </IconSvg>
  ),
  alert: (
    <IconSvg>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </IconSvg>
  ),
  user: (
    <IconSvg>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </IconSvg>
  ),
  clock: (
    <IconSvg>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </IconSvg>
  ),
  arrowRight: (
    <IconSvg>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </IconSvg>
  ),
};

export const statusTone = (statusRaw) => {
  const s = (statusRaw || "").toUpperCase();
  if (s === "COMPLETED" || s === "APPROVED")
    return { bg: "#dcfce7", color: "#16a34a", dot: "#16a34a" };
  if (s === "REJECTED")
    return { bg: "#fee2e2", color: "#dc2626", dot: "#dc2626" };
  if (s === "PENDING" || s === "IN PROGRESS")
    return { bg: "#e0e7ff", color: "#4338ca", dot: "#4338ca" };
  return { bg: "#e0e7ff", color: "#4338ca", dot: "#4338ca" };
};

/* ================================================================== */
/*  Notice — the ONE banner style used everywhere: QA Admin banner,     */
/*  Edit-mode banner, QE notice, dirty-fields banner, etc.               */
/*  `compact` renders a smaller, tighter banner (header-level notices). */
/* ================================================================== */
export function Notice({
  tone = "info",
  children,
  compact = false,
  darkMode = false,
}) {
  const lightTones = {
    info: { bg: ACCENT_BG, border: "#bfdbfe", color: ACCENT },
    warn: { bg: "#fef3c7", border: "#fde68a", color: "#b45309" },
    ok: { bg: "#dcfce7", border: "#bbf7d0", color: "#16a34a" },
    error: { bg: "#fee2e2", border: "#fecaca", color: "#dc2626" },
  };
  const darkTones = {
    info: { bg: "#16233d", border: "#28477a", color: "#8bb6ff" },
    warn: { bg: "#3a2e15", border: "#6b4f1f", color: "#f0b649" },
    ok: { bg: "#132b1e", border: "#215a37", color: "#4ade80" },
    error: { bg: "#3a1717", border: "#6b2424", color: "#f77070" },
  };
  const t = (darkMode ? darkTones : lightTones)[tone];
  return (
    <div
      style={{
        padding: compact ? "0.3rem 0.6rem" : "0.55rem 0.8rem",
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: "7px",
        display: "flex",
        alignItems: "flex-start",
        gap: compact ? "0.4rem" : "0.5rem",
        fontSize: compact ? "0.62rem" : "0.72rem",
        color: t.color,
        lineHeight: 1.45,
      }}
    >
      <span style={{ flexShrink: 0, marginTop: "0.05rem" }}>
        {tone === "error"
          ? Icons.alert
          : tone === "ok"
            ? Icons.check
            : tone === "warn"
              ? Icons.alert
              : Icons.info}
      </span>
      <span>{children}</span>
    </div>
  );
}

/* ================================================================== */
/*  AccordionSection — the ONE card/section wrapper used everywhere:    */
/*  a titled card with a circular icon badge and a body area.           */
/*  No overflow clipping (dropdowns stay visible).                      */
/* ================================================================== */
export function AccordionSection({
  icon,
  title,
  children,
  colors,
  labelWidth = 150,
  headerRight = null,
}) {
  return (
    <div
      style={{
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "8px",
        marginBottom: "0.65rem",
      }}
    >
      {title && (
        <div
          style={{
            padding: "0.65rem 0.9rem",
            background: colors.cardBg,
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.55rem",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}
          >
            {icon && (
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: ICON_CIRCLE_BG,
                  color: ACCENT,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.7rem",
                  flexShrink: 0,
                }}
              >
                {icon}
              </span>
            )}
            <span
              style={{ fontSize: "0.78rem", fontWeight: "700", color: ACCENT }}
            >
              {title}
            </span>
          </div>
          {headerRight}
        </div>
      )}
      <div
        style={{
          padding: "0.8rem 0.9rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          background: colors.cardBg,
          borderRadius: title ? "0 0 8px 8px" : "8px",
        }}
      >
        <LabelWidthContext.Provider value={labelWidth}>
          {children}
        </LabelWidthContext.Provider>
      </div>
    </div>
  );
}

export function LVGrid({ children, cols = 2 }) {
  return (
    <div
      className="s1fd-lv-grid"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        rowGap: "0.55rem",
        columnGap: "1.25rem",
      }}
    >
      {children}
    </div>
  );
}

/* Small "Required" / "✓" badge next to a label, QA Admin mode only */
export function RequiredBadge({ missing, applicable = true }) {
  if (!applicable) return null;
  return missing ? (
    <span
      style={{
        fontSize: "0.55rem",
        fontWeight: "700",
        color: "#dc2626",
        background: "#fee2e2",
        border: "1px solid #fecaca",
        padding: "0.03rem 0.3rem",
        borderRadius: "3px",
        marginLeft: "0.35rem",
      }}
    >
      Required
    </span>
  ) : (
    <span
      style={{ fontSize: "0.6rem", color: "#16a34a", marginLeft: "0.35rem" }}
    >
      ✓
    </span>
  );
}
