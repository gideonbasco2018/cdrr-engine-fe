// src/components/common/MedLoader.jsx
// Drop this file into: cdrr-engine-fe/src/components/common/MedLoader.jsx
import { useEffect, useRef } from "react";

const styles = `
@keyframes medPillSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes medOrbitA {
  0%   { stroke-dashoffset: 0;    opacity: 0.95; }
  100% { stroke-dashoffset: -389; opacity: 0; }
}
@keyframes medOrbitB {
  0%   { stroke-dashoffset: -60;  opacity: 0.6; }
  100% { stroke-dashoffset: -389; opacity: 0; }
}
@keyframes medDot1 { 0%,60%,100%{opacity:0.15} 30%{opacity:1} }
@keyframes medDot2 { 0%,10%,70%,100%{opacity:0.15} 45%{opacity:1} }
@keyframes medDot3 { 0%,20%,80%,100%{opacity:0.15} 60%{opacity:1} }
@keyframes medFadeIn {
  from { opacity:0; transform: scale(0.93) translateY(16px); }
  to   { opacity:1; transform: scale(1) translateY(0); }
}
@keyframes medOverlayIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes medProgFill {
  0%   { width: 0%;  }
  15%  { width: 22%; }
  40%  { width: 55%; }
  70%  { width: 78%; }
  90%  { width: 91%; }
  100% { width: 97%; }
}
`;

/**
 * MedLoader — full-viewport fixed overlay
 * - Pill spins in place at center
 * - Orbit trail sweeps faster around the pill
 * - Background: blurred page content shows through (not white/blank)
 *
 * Usage:
 *   <MedLoader visible={loading} message="Fetching records" subtext="Please wait..." />
 *
 * Props:
 *   visible   {boolean}
 *   darkMode  {boolean}
 *   message   {string}
 *   subtext   {string}
 */
export default function MedLoader({
  visible,
  darkMode = false,
  // message = "CDRR",
  subtext = "Please wait a moment...",
}) {
  const pbRef = useRef(null);

  useEffect(() => {
    const id = "med-loader-styles";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = styles;
      document.head.appendChild(s);
    }
  }, []);

  // Prevent body scroll while loader is visible
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [visible]);

  useEffect(() => {
    if (visible && pbRef.current) {
      pbRef.current.style.animation = "none";
      void pbRef.current.offsetHeight;
      pbRef.current.style.animation = "medProgFill 0.8s ease-out forwards";
    }
  }, [visible]);

  if (!visible) return null;

  const cardBg     = darkMode ? "#1A1108"                : "#ffffff";
  const cardBorder = darkMode ? "rgba(234,108,0,0.30)"  : "rgba(234,108,0,0.20)";
  const titleColor = darkMode ? "#FFD090"                : "#1a1208";
  const subColor   = darkMode ? "#8A6A3A"                : "#9a9080";
  const dotColor   = darkMode ? "#FFA040"                : "#EA6C00";
  const progTrack  = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";

  // Lighter tint so the page content behind is visible through the blur
  const overlayBg  = darkMode
    ? "rgba(10,6,2,0.45)"
    : "rgba(100,90,80,0.25)";

  return (
    <div
      role="status"
      aria-live="polite"
      // aria-label={message}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Light semi-transparent tint — page content shows through the blur
        background: overlayBg,
        backdropFilter: "blur(4px) brightness(0.92)",
        WebkitBackdropFilter: "blur(4px) brightness(0.92)",
        animation: "medOverlayIn 0.22s ease",
      }}
    >
      <div
        style={{
          background: cardBg,
          border: `0.5px solid ${cardBorder}`,
          borderRadius: 24,
          padding: "48px 60px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          minWidth: 280,
          boxShadow: darkMode
            ? "0 28px 72px rgba(0,0,0,0.60), 0 4px 16px rgba(0,0,0,0.4)"
            : "0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.07)",
          animation: "medFadeIn 0.38s cubic-bezier(0.34,1.28,0.64,1) both",
        }}
      >
        <SpinnerStage />

        <div style={{ textAlign: "center" }}>
          {/* <p style={{
            margin: "0 0 6px",
            fontSize: 15,
            fontWeight: 600,
            color: titleColor,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            {message}
          </p> */}
          <p style={{
            margin: 0,
            fontSize: 12.5,
            color: subColor,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            {subtext}
          </p>
        </div>

        <div style={{
          width: "100%",
          height: 3,
          background: progTrack,
          borderRadius: 99,
          overflow: "hidden",
        }}>
          <div
            ref={pbRef}
            style={{
              height: "100%",
              background: "linear-gradient(90deg, #CC5500, #FF8C00, #FFB347)",
              borderRadius: 99,
              width: 0,
              animation: "medProgFill 8s ease-out forwards",
            }}
          />
        </div>

        <LoadingDots color={dotColor} />
      </div>
    </div>
  );
}

function SpinnerStage() {
  return (
    <div style={{
      width: 160,
      height: 160,
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Orbit trail — faster (0.85s), fixed circle with animated dash */}
      <svg
        style={{ position: "absolute", inset: 0 }}
        width="160"
        height="160"
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ghost track */}
        <circle cx="80" cy="80" r="62"
          stroke="#FF8C00" strokeWidth="1" strokeOpacity="0.12" fill="none" />
        {/* Primary swirl — faster */}
        <circle cx="80" cy="80" r="62"
          stroke="#FF8C00" strokeWidth="7" strokeLinecap="round" fill="none"
          strokeDasharray="110 279"
          style={{
            animation: "medOrbitA 0.35s linear infinite",
            transformOrigin: "80px 80px",
          }}
        />
        {/* Secondary lighter tail — faster */}
        <circle cx="80" cy="80" r="62"
          stroke="#FFCC70" strokeWidth="3.5" strokeLinecap="round" fill="none"
          strokeDasharray="55 334"
          style={{
            animation: "medOrbitB 0.45s linear infinite",
            transformOrigin: "80px 80px",
          }}
        />
      </svg>

      {/* Pill — centered, slower spin (1.3s) */}
      <div style={{
        animation: "medPillSpin 1.0s linear infinite",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        zIndex: 2,
      }}>
        <PillSVG />
      </div>
    </div>
  );
}

function PillSVG() {
  return (
    <svg width="72" height="34" viewBox="0 0 72 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mlOrange" x1="36" y1="0" x2="72" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#FF9120" />
          <stop offset="40%"  stopColor="#E05800" />
          <stop offset="100%" stopColor="#B03800" />
        </linearGradient>
        <linearGradient id="mlCream" x1="0" y1="0" x2="36" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#FFD89A" />
          <stop offset="50%"  stopColor="#FFBA6A" />
          <stop offset="100%" stopColor="#E89040" />
        </linearGradient>
        <linearGradient id="mlShine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="white" stopOpacity="0"    />
        </linearGradient>
        <linearGradient id="mlRim" x1="0" y1="0" x2="72" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#FF7000" />
          <stop offset="50%"  stopColor="#FFA040" />
          <stop offset="100%" stopColor="#C04400" />
        </linearGradient>
        <clipPath id="mlPill">
          <rect x="0" y="0" width="72" height="34" rx="17" ry="17" />
        </clipPath>
      </defs>
      <rect x="0"  y="0" width="36" height="34" fill="url(#mlCream)"  clipPath="url(#mlPill)" />
      <rect x="36" y="0" width="36" height="34" fill="url(#mlOrange)" clipPath="url(#mlPill)" />
      <line x1="36" y1="1" x2="36" y2="33" stroke="#C05000" strokeWidth="1.5" strokeOpacity="0.5" clipPath="url(#mlPill)" />
      <rect x="0" y="0" width="72" height="34" rx="17" ry="17" stroke="url(#mlRim)" strokeWidth="2" fill="none" />
      <ellipse cx="19" cy="10" rx="10" ry="4.5" fill="url(#mlShine)" transform="rotate(-12 19 10)" clipPath="url(#mlPill)" />
      <ellipse cx="53" cy="9"  rx="6"  ry="3"   fill="white" fillOpacity="0.16" transform="rotate(-8 53 9)" clipPath="url(#mlPill)" />
      <rect x="0" y="0" width="72" height="11" fill="white" fillOpacity="0.07" clipPath="url(#mlPill)" />
    </svg>
  );
}

function LoadingDots({ color }) {
  return (
    <span style={{
      display: "flex",
      alignItems: "center",
      gap: 1,
      fontSize: 13,
      fontWeight: 500,
      color,
      letterSpacing: "0.07em",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      Loading
      <span style={{ animation: "medDot1 1.5s ease-in-out infinite", marginLeft: 2 }}>.</span>
      <span style={{ animation: "medDot2 1.5s ease-in-out infinite" }}>.</span>
      <span style={{ animation: "medDot3 1.5s ease-in-out infinite" }}>.</span>
    </span>
  );
}

/**
 * MedSpinner — tiny inline spinner for buttons
 */
export function MedSpinner({ size = 16, color = "#FF8C00" }) {
  return (
    <span style={{
      display: "inline-block",
      width: size,
      height: size,
      border: `2px solid ${color}35`,
      borderTop: `2px solid ${color}`,
      borderRadius: "50%",
      animation: "medPillSpin 0.7s linear infinite",
      flexShrink: 0,
      verticalAlign: "middle",
    }} />
  );
}