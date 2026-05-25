import { useState } from "react";

export function DTNEntryScreen({ onVerify, darkMode }) {
  const [dtn, setDtn] = useState("");
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const isEmpty = dtn.trim() === "";

  const handleSubmit = () => {
    setTouched(true);
    if (!isEmpty) onVerify(dtn.trim());
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        position: "relative",
        // overflow: "hidden",  ← alisin ito
        background: darkMode ? "#141414" : "#F0EDE8",
        minHeight: "100%", // ← dagdag ito
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatA {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          50%      { transform: translateY(-18px) rotate(3deg); }
        }
        @keyframes floatB {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          50%      { transform: translateY(-12px) rotate(-2deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(44,95,138,0.25); }
          70%  { box-shadow: 0 0 0 10px rgba(44,95,138,0); }
          100% { box-shadow: 0 0 0 0 rgba(44,95,138,0); }
        }

        .dtn-screen * { font-family: 'DM Sans', sans-serif; }

        .dtn-input-field {
          width: 100%;
          box-sizing: border-box;
          padding: 14px 16px;
          font-size: 15px;
          font-family: 'DM Mono', 'Courier New', monospace;
          font-weight: 600;
          letter-spacing: 0.06em;
          border-radius: 10px;
          transition: all 0.2s ease;
          outline: none;
        }
        .dtn-input-field::placeholder { color: #B0A89E; font-weight: 400; letter-spacing: 0.02em; }

        .verify-btn {
          width: 100%;
          padding: 13px 0;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative;
          overflow: hidden;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          background: linear-gradient(135deg, #2C5F8A 0%, #1E4A6E 100%);
          color: #fff;
          box-shadow: 0 4px 20px rgba(44,95,138,0.35), 0 1px 3px rgba(0,0,0,0.1);
        }
        .verify-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 2.5s infinite linear;
        }
        .verify-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(44,95,138,0.4), 0 2px 6px rgba(0,0,0,0.12); }
        .verify-btn:active { transform: translateY(0); }

        .float-shape {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
      `}</style>

      {/* Background floating shapes */}
      <div
        className="float-shape"
        style={{
          width: 320,
          height: 320,
          top: "-80px",
          right: "-80px",
          background:
            "radial-gradient(circle, rgba(44,95,138,0.08) 0%, transparent 70%)",
          animation: "floatA 8s ease-in-out infinite",
        }}
      />
      <div
        className="float-shape"
        style={{
          width: 200,
          height: 200,
          bottom: "60px",
          left: "-40px",
          background:
            "radial-gradient(circle, rgba(44,95,138,0.06) 0%, transparent 70%)",
          animation: "floatB 10s ease-in-out infinite",
        }}
      />

      {/* Subtle grid texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage: `
            linear-gradient(${darkMode ? "rgba(255,255,255,0.03)" : "rgba(44,95,138,0.04)"} 1px, transparent 1px),
            linear-gradient(90deg, ${darkMode ? "rgba(255,255,255,0.03)" : "rgba(44,95,138,0.04)"} 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Main card */}
      <div
        className="dtn-screen"
        style={{
          width: "100%",
          maxWidth: 580,
          position: "relative",
          zIndex: 1,
          animation: "fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        {/* Icon + header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 30,
              fontWeight: 800,
              color: darkMode ? "#F0EDE8" : "#1C1A17",
              lineHeight: 1.2,
              margin: "0 0 0.5rem",
              letterSpacing: "-0.01em",
            }}
          >
            Manual CPR{" "}
            <span style={{ color: "#2C5F8A" }}>
              Correction & Reconstruction
            </span>
          </h1>

          <p
            style={{
              fontSize: 13.5,
              color: darkMode ? "#9A9087" : "#7A736C",
              lineHeight: 1.65,
              margin: 0,
              maxWidth: 340,
              marginInline: "auto",
            }}
          >
            Enter your Document Tracking Number to retrieve your application and
            begin the correction or reconstruction process.
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: darkMode ? "#1A1A1A" : "#fff",
            border: darkMode
              ? "1px solid rgba(255,255,255,0.08)"
              : "1px solid rgba(214,209,203,0.8)",
            borderRadius: 18,
            boxShadow:
              "0 4px 40px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
            padding: "1.75rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Top accent line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: "linear-gradient(90deg, #2C5F8A, #4A90C4, #2C5F8A)",
              backgroundSize: "200% 100%",
              animation: "shimmer 3s infinite linear",
            }}
          />

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              color: darkMode ? "#5A5249" : "#9B9189",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}
          >
            <svg
              width="11"
              height="11"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Document Tracking Number (DTN)
          </label>

          <div style={{ position: "relative" }}>
            <input
              className="dtn-input-field"
              type="text"
              value={dtn}
              onChange={(e) => setDtn(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="e.g. 20230808095202"
              style={{
                border:
                  touched && isEmpty
                    ? "1.5px solid #E57373"
                    : focused
                      ? "1.5px solid #2C5F8A"
                      : darkMode
                        ? "1.5px solid #2a2a2a"
                        : "1.5px solid #D6D1CB",
                background:
                  touched && isEmpty
                    ? darkMode
                      ? "#2a1515"
                      : "#FFF5F5"
                    : focused
                      ? darkMode
                        ? "#0d1a26"
                        : "#F8FBFF"
                      : darkMode
                        ? "#111111"
                        : "#F7F5F1",
                color: darkMode ? "#F0EDE8" : "#1C1A17",
                boxShadow: focused ? "0 0 0 4px rgba(44,95,138,0.15)" : "none",
              }}
            />
            {dtn && !isEmpty && (
              <div
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="11"
                  height="11"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </div>

          {touched && isEmpty && (
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: "#C0392B",
                display: "flex",
                alignItems: "center",
                gap: 5,
                animation: "fadeUp 0.2s ease both",
              }}
            >
              <svg
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Please enter your DTN before continuing.
            </div>
          )}

          <button
            className="verify-btn"
            onClick={handleSubmit}
            style={{ marginTop: "1.1rem" }}
          >
            <svg
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Verify and Retrieve Application
          </button>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              margin: "1.1rem 0 1rem",
            }}
          >
            <div
              style={{
                flex: 1,
                height: 1,
                background: darkMode ? "#2a2a2a" : "#EEEBE6",
              }}
            />
            <span
              style={{
                fontSize: 10.5,
                color: darkMode ? "#3a3530" : "#C2BAB2",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              INFO
            </span>
            <div
              style={{
                flex: 1,
                height: 1,
                background: darkMode ? "#2a2a2a" : "#EEEBE6",
              }}
            />
          </div>

          <div
            style={{
              padding: "10px 13px",
              background: darkMode ? "#161616" : "#F7F5F1",
              border: darkMode ? "1px solid #2a2a2a" : "1px solid #E8E3DC",
              borderRadius: 9,
              fontSize: 12,
              color: darkMode ? "#5A5249" : "#7A736C",
              display: "flex",
              alignItems: "flex-start",
              gap: 9,
              lineHeight: 1.6,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                flexShrink: 0,
                marginTop: 1,
                background: "rgba(44,95,138,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="11"
                height="11"
                fill="none"
                stroke="#2C5F8A"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            Your DTN can be found in the acknowledgment email or on your
            application receipt.
          </div>
        </div>
      </div>
    </div>
  );
}
