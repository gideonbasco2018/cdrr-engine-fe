// src/components/softcopy/viewFrame.js
// One switch for the Softcopy screens: shown as a popup (dark backdrop,
// centered card) or as a full view inside a page tab (asView = true).
// The inside of each screen stays the same; only its frame changes.
import { FONT } from "../gmp/shared/constants";

// ── One motion for the whole Softcopy page ──────────────────────────────────
// Same easing and timing everywhere: things fade in with a small rise or
// scale, and state changes (colour, border, shadow) glide instead of jumping.
// Anyone whose computer is set to "reduce motion" gets no movement.
export const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
export const motion = {
  fade: `scFade 0.2s ${EASE} both`,     // popup backdrops, small swaps
  pop: `scPop 0.26s ${EASE} both`,      // popup cards
  rise: `scRise 0.28s ${EASE} both`,    // a screen taking the table's place
  drop: `scDrop 0.18s ${EASE} both`,    // dropdowns and menus
};
// Put this class on a root so its buttons, links and fields glide.
export const MOTION_CLASS = "sc-motion";

const MOTION_CSS = `
@keyframes scFade { from { opacity: 0 } to { opacity: 1 } }
@keyframes scPop { from { opacity: 0; transform: translateY(10px) scale(0.985) } to { opacity: 1; transform: none } }
@keyframes scRise { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
@keyframes scDrop { from { opacity: 0; transform: translateY(-4px) scale(0.98) } to { opacity: 1; transform: none } }
.${MOTION_CLASS} button, .${MOTION_CLASS} a, .${MOTION_CLASS} input, .${MOTION_CLASS} select, .${MOTION_CLASS} label {
  transition-property: background-color, color, border-color, box-shadow, opacity, transform;
  transition-duration: 0.2s;
  transition-timing-function: ${EASE};
}
.${MOTION_CLASS} button:not(:disabled):active { transform: scale(0.97); }
.${MOTION_CLASS} tbody tr { transition: background-color 0.18s ${EASE}; }
@media (prefers-reduced-motion: reduce) {
  .${MOTION_CLASS}, .${MOTION_CLASS} * {
    animation-duration: 1ms !important; animation-iteration-count: 1 !important; transition-duration: 1ms !important;
  }
}`;

// The keyframes live in one <style> tag, added once.
if (typeof document !== "undefined" && !document.getElementById("softcopy-motion")) {
  const tag = document.createElement("style");
  tag.id = "softcopy-motion";
  tag.textContent = MOTION_CSS;
  document.head.appendChild(tag);
}

// The outer layer. Popup: fixed backdrop, click outside = close.
// View: just fills the tab.
export function frameOuter(asView, onBackdrop) {
  if (asView) {
    return {
      className: MOTION_CLASS,
      // no entrance here: the page's own area glides in (no double movement)
      style: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", fontFamily: FONT },
    };
  }
  return {
    onClick: onBackdrop,
    className: MOTION_CLASS,
    style: {
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", zIndex: 10000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: FONT,
      animation: motion.fade,
    },
  };
}

// The card. Popup: its own width / height. View: fills the tab (up to
// `viewMaxWidth`, centered), with the page's card look.
export function frameCard(asView, popupStyle, colors, viewMaxWidth = null) {
  if (!asView) return { ...popupStyle, animation: motion.pop };
  return {
    ...popupStyle,
    width: "100%",
    maxWidth: viewMaxWidth || "none",
    margin: viewMaxWidth ? "0 auto" : 0,
    height: "auto",
    maxHeight: "none",
    flex: 1,
    minHeight: 0,
    borderRadius: 12,
    background: colors.cardBg,
    border: `1px solid ${colors.cardBorder}`,
    boxShadow: colors.cardShadow,
  };
}

export const stop = (e) => e.stopPropagation();
