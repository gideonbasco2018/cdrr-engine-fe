export function neuShadow(darkMode, raised = true) {
  if (darkMode) {
    return raised
      ? "2px 2px 5px rgba(0,0,0,0.2), -1px -1px 4px rgba(60,60,80,0.08)"
      : "inset 1px 1px 3px rgba(0,0,0,0.15), inset -1px -1px 2px rgba(60,60,80,0.06)";
  }
  return raised
    ? "0 2px 8px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)"
    : "inset 2px 2px 5px rgba(0,0,0,0.06), inset -2px -2px 5px rgba(255,255,255,0.8)";
}

export function neuBg(darkMode) {
  return darkMode ? "#1e1f2e" : "#f4f6f9";
}

export function neuCardBg(darkMode) {
  return darkMode ? "#1a1a1a" : "#ffffff";
}

export function neuInputShadow(darkMode) {
  return darkMode
    ? "inset 1px 1px 3px rgba(0,0,0,0.12), inset -1px -1px 2px rgba(60,60,80,0.06)"
    : "inset 2px 2px 4px rgba(0,0,0,0.08), inset -1px -1px 3px rgba(0,0,0,0.03)";
}
