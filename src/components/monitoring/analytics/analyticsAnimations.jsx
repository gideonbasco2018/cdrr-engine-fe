const ANIM_STYLE_ID = "analytics-view-animations";

if (
  typeof document !== "undefined" &&
  !document.getElementById(ANIM_STYLE_ID)
) {
  const style = document.createElement("style");
  style.id = ANIM_STYLE_ID;
  style.textContent = `
    @keyframes analytics-shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position:  400px 0; }
    }
    @keyframes analytics-fade-slide-up {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes analytics-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes analytics-pulse-soft {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.55; }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
