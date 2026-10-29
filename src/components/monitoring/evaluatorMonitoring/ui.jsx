// src/components/monitoring/evaluatorMonitoring/ui.jsx
// Shared look of the Evaluators Monitoring page and its modal: a quiet,
// neutral base (white, black and greys) with hairline borders, soft shadows
// and thin line icons, plus a few quiet accents:
//   green  = performance (active switch, top ranks, TAT values)
//   blue   = structure (icon tiles, counts, initials, focus, Export, hover)
//   amber  = cautions (merged spellings, skipped applications)

export const AMBER = "#d97706";

// ── Motion ───────────────────────────────────────────────────
// Short, soft movements (fade + a few pixels). Everything is switched off for
// people who asked their system for reduced motion.
const MOTION_CSS = `
@keyframes em-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes em-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes em-fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes em-pop { from { opacity: 0; transform: translateY(-6px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes em-modal-in { from { opacity: 0; transform: translateY(14px) scale(.985); } to { opacity: 1; transform: none; } }
@keyframes em-modal-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(8px) scale(.99); } }
@keyframes em-wipe { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes em-shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }

/* the sections of a loaded report come in one after another */
.em-stagger > * { animation: em-rise .5s cubic-bezier(.2,.7,.2,1) backwards; }
.em-stagger > *:nth-child(2) { animation-delay: 60ms; }
.em-stagger > *:nth-child(3) { animation-delay: 120ms; }
.em-stagger > *:nth-child(4) { animation-delay: 180ms; }
.em-stagger > *:nth-child(5) { animation-delay: 240ms; }
.em-stagger > *:nth-child(6) { animation-delay: 300ms; }
.em-stagger > *:nth-child(7) { animation-delay: 360ms; }
.em-stagger > *:nth-child(8) { animation-delay: 420ms; }
.em-rise-one { animation: em-rise .45s cubic-bezier(.2,.7,.2,1) backwards; }
.em-pop { animation: em-pop .16s ease-out backwards; transform-origin: top center; }
.em-fade { animation: em-fade .18s ease-out backwards; }
.em-fade-out { animation: em-fade-out .17s ease-in forwards; }
.em-modal { animation: em-modal-in .26s cubic-bezier(.2,.7,.2,1) backwards; }
.em-modal-out { animation: em-modal-out .17s ease-in forwards; }
.em-wipe { animation: em-wipe .8s cubic-bezier(.2,.7,.2,1) backwards; }
.em-row { animation: em-fade .35s ease-out backwards; }
.em-skel {
  background: linear-gradient(90deg, var(--em-a) 25%, var(--em-b) 40%, var(--em-a) 65%);
  background-size: 1200px 100%;
  animation: em-shimmer 1.5s linear infinite;
}
.em-root button:not(:disabled):active { transform: scale(.97); }

@media (prefers-reduced-motion: reduce) {
  .em-stagger > *, .em-rise-one, .em-pop, .em-fade, .em-modal, .em-wipe, .em-row { animation: none !important; }
  .em-fade-out, .em-modal-out { animation-duration: 1ms !important; }
  .em-skel { animation: none !important; }
  .em-root *, .em-root *::before, .em-root *::after { transition: none !important; }
}
`;

export function MotionStyles() {
  return <style>{MOTION_CSS}</style>;
}

// a grey block that shimmers while something loads
export function Skeleton({ t, h = 14, w = "100%", r = 7, style }) {
  return (
    <div
      className="em-skel"
      aria-hidden="true"
      style={{
        height: h,
        width: w,
        borderRadius: r,
        "--em-a": t.pill,
        "--em-b": t.line,
        ...style,
      }}
    />
  );
}

export const makeUi = (darkMode) => {
  const t = darkMode
    ? {
        ink: "#f4f4f5",
        ink2: "#a1a1aa",
        ink3: "#71717a",
        surface: "#111113",
        sunken: "#0b0b0d",
        line: "rgba(255,255,255,0.08)",
        lineStrong: "rgba(255,255,255,0.16)",
        hover: "rgba(255,255,255,0.045)",
        pill: "rgba(255,255,255,0.06)",
        shadow:
          "0 1px 0 rgba(255,255,255,0.03) inset, 0 18px 40px -24px rgba(0,0,0,0.85)",
        shadowPop: "0 24px 60px -12px rgba(0,0,0,0.7)",
        invert: "#f4f4f5",
        onInvert: "#0a0a0a",
        ring: "0 0 0 3px rgba(56,189,248,0.22)",
        accent: "#10b981",
        accentText: "#34d399",
        accentSoft: "rgba(16,185,129,0.14)",
        accentLine: "rgba(52,211,153,0.45)",
        blue: "#38bdf8",
        blueText: "#7dd3fc",
        blueSoft: "rgba(56,189,248,0.14)",
        blueLine: "rgba(125,211,252,0.42)",
        rowHover: "rgba(56,189,248,0.08)",
        amberText: "#fbbf24",
        amberSoft: "rgba(251,191,36,0.13)",
        amberLine: "rgba(251,191,36,0.32)",
      }
    : {
        ink: "#0f0f10",
        ink2: "#5b5b63",
        ink3: "#8e8e96",
        surface: "#ffffff",
        sunken: "#f6f6f7",
        line: "rgba(15,15,16,0.08)",
        lineStrong: "rgba(15,15,16,0.16)",
        hover: "rgba(15,15,16,0.035)",
        pill: "rgba(15,15,16,0.05)",
        shadow:
          "0 1px 2px rgba(16,24,40,0.04), 0 14px 32px -18px rgba(16,24,40,0.16)",
        shadowPop: "0 24px 60px -12px rgba(16,24,40,0.28)",
        invert: "#0f0f10",
        onInvert: "#ffffff",
        ring: "0 0 0 3px rgba(14,165,233,0.18)",
        accent: "#10b981",
        accentText: "#047857",
        accentSoft: "rgba(16,185,129,0.10)",
        accentLine: "rgba(16,185,129,0.40)",
        blue: "#0ea5e9",
        blueText: "#0369a1",
        blueSoft: "rgba(14,165,233,0.10)",
        blueLine: "rgba(14,165,233,0.38)",
        rowHover: "rgba(14,165,233,0.06)",
        amberText: "#b45309",
        amberSoft: "rgba(217,119,6,0.11)",
        amberLine: "rgba(217,119,6,0.30)",
      };

  const card = {
    background: t.surface,
    border: `1px solid ${t.line}`,
    borderRadius: 14,
    boxShadow: t.shadow,
    overflow: "hidden",
  };
  const cardHead = {
    padding: "0.8rem 1.1rem",
    borderBottom: `1px solid ${t.line}`,
    display: "flex",
    alignItems: "center",
    gap: "0.65rem",
  };
  const cardTitle = {
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: "0.82rem",
    fontWeight: 600,
    letterSpacing: "-0.01em",
    color: t.ink,
  };
  const pill = {
    padding: "0.18rem 0.6rem",
    border: `1px solid ${t.line}`,
    background: t.pill,
    borderRadius: 999,
    fontSize: "0.62rem",
    fontWeight: 500,
    letterSpacing: "0.01em",
    color: t.ink2,
    whiteSpace: "nowrap",
  };
  const pillAccent = {
    ...pill,
    background: t.blueSoft,
    border: `1px solid ${t.blueLine}`,
    color: t.blueText,
    fontWeight: 600,
  };
  const pillGreen = {
    ...pill,
    background: t.accentSoft,
    border: `1px solid ${t.accentLine}`,
    color: t.accentText,
    fontWeight: 600,
  };
  const pillAmber = {
    ...pill,
    background: t.amberSoft,
    border: `1px solid ${t.amberLine}`,
    color: t.amberText,
    fontWeight: 600,
  };
  const th = {
    padding: "0.6rem 1.1rem",
    fontSize: "0.6rem",
    fontWeight: 600,
    letterSpacing: "0.09em",
    textTransform: "uppercase",
    color: t.ink3,
    background: t.surface,
    borderBottom: `1px solid ${t.line}`,
    whiteSpace: "nowrap",
    textAlign: "left",
    position: "sticky",
    top: 0,
    zIndex: 1,
  };
  const td = {
    padding: "0.62rem 1.1rem",
    fontSize: "0.74rem",
    color: t.ink,
    borderBottom: `1px solid ${t.line}`,
    fontVariantNumeric: "tabular-nums",
  };
  const num = { textAlign: "right", whiteSpace: "nowrap" };
  const field = {
    height: 36,
    boxSizing: "border-box",
    background: t.surface,
    border: `1px solid ${t.line}`,
    borderRadius: 10,
    color: t.ink,
    fontSize: "0.76rem",
    outline: "none",
    transition: "border-color .15s, box-shadow .15s",
  };
  const button = {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    height: 34,
    padding: "0 14px",
    background: t.surface,
    border: `1px solid ${t.lineStrong}`,
    borderRadius: 10,
    color: t.ink,
    fontSize: "0.74rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background .15s, border-color .15s, transform .12s",
  };

  // the one action that stands out (Export Excel)
  const buttonAccent = {
    ...button,
    background: t.blueSoft,
    border: `1px solid ${t.blueLine}`,
    color: t.blueText,
    fontWeight: 600,
  };

  const buttonGreen = {
    ...button,
    background: t.accentSoft,
    border: `1px solid ${t.accentLine}`,
    color: t.accentText,
    fontWeight: 600,
  };

  // focus ring for inputs and selects
  const focusOn = (e) => {
    e.currentTarget.style.borderColor = t.blueLine;
    e.currentTarget.style.boxShadow = t.ring;
  };
  const focusOff = (e) => {
    e.currentTarget.style.borderColor = t.line;
    e.currentTarget.style.boxShadow = "none";
  };
  const hoverOn = (e) => (e.currentTarget.style.background = t.hover);
  const hoverOff = (e, base = "transparent") =>
    (e.currentTarget.style.background = base);

  return {
    t,
    card,
    cardHead,
    cardTitle,
    pill,
    pillAccent,
    pillGreen,
    pillAmber,
    buttonAccent,
    buttonGreen,
    th,
    td,
    num,
    field,
    button,
    focusOn,
    focusOff,
    hoverOn,
    hoverOff,
  };
};

// Thin line icons (1.6 stroke, currentColor)
const PATHS = {
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V5a1 1 0 011-1h8a1 1 0 011 1v16" />
      <path d="M14 10h5a1 1 0 011 1v10" />
      <path d="M2 21h20M8 8h2M8 12h2M8 16h2" />
    </>
  ),
  pill: (
    <>
      <rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)" />
      <path d="M8.7 8.7l6.6 6.6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4M12 17.2v.1" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4.5 19.5h15" />
    </>
  ),
  chevron: <path d="M6 9.5l6 6 6-6" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.1" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M2.8 19c.6-3.3 3-5 6.2-5s5.6 1.7 6.2 5" />
      <path d="M16 5.6a3 3 0 010 5.8M18 14.4c1.8.6 2.9 2.2 3.2 4.6" />
    </>
  ),
};

export function Icon({ name, size = 15, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, ...style }}
    >
      {PATHS[name]}
    </svg>
  );
}

// Line icon on a soft accent tile (card and modal titles)
export function IconChip({ name, t, size = 28, tone = "blue" }) {
  const c =
    tone === "green"
      ? { bg: t.accentSoft, line: t.accentLine, ink: t.accentText }
      : { bg: t.blueSoft, line: t.blueLine, ink: t.blueText };
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 9,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: c.bg,
        border: `1px solid ${c.line}`,
        color: c.ink,
      }}
    >
      <Icon name={name} size={Math.round(size * 0.55)} />
    </span>
  );
}

// Two-letter monogram in a soft blue circle
export function Monogram({ name, size = 30, t }) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const text =
    (parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: t.blueSoft,
        border: `1px solid ${t.blueLine}`,
        color: t.blueText,
        fontSize: size * 0.36,
        fontWeight: 600,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
      }}
    >
      {text}
    </span>
  );
}
