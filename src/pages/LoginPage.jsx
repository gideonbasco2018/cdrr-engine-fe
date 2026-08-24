import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";

const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Barlow+Condensed:wght@600;700;800&display=swap";
if (!document.head.querySelector("[href*='Barlow']")) {
  document.head.appendChild(fontLink);
}

/* ── Theme sync helpers ──
   Uses the same "darkMode" localStorage key so the Navbar toggle and
   this page's toggle stay in sync. If your app instead manages
   darkMode via Context/props from App.jsx, swap these three helpers
   to read/write from there instead. */
const getInitialDarkMode = () => {
  const saved = localStorage.getItem("darkMode");
  return saved !== null ? saved === "true" : true; // default: dark
};

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [modal, setModal] = useState(null); // null | "forgot" | "google"
  const [darkMode, setDarkMode] = useState(getInitialDarkMode);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 900);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  /* Close modal on Escape key */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setModal(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Persist + broadcast theme changes so other tabs/components sync */
  useEffect(() => {
    localStorage.setItem("darkMode", String(darkMode));
    window.dispatchEvent(new CustomEvent("themechange", { detail: darkMode }));
  }, [darkMode]);

  /* Listen for theme changes from elsewhere (Navbar, other tabs) */
  useEffect(() => {
    const onThemeChange = (e) => setDarkMode(e.detail);
    const onStorage = (e) => {
      if (e.key === "darkMode") setDarkMode(e.newValue === "true");
    };
    window.addEventListener("themechange", onThemeChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("themechange", onThemeChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login({ username, password });
      const { access_token, user } = data;
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("access_token", access_token);
      storage.setItem("user", JSON.stringify(user));
      storage.setItem("userRole", user.role);
      storage.setItem("userGroup", String(user.group_id));
      switch (user.role) {
        case "SuperAdmin":
          navigate("/superadmin/dashboard");
          break;
        case "Admin":
          navigate("/admin/dashboard");
          break;
        default:
          navigate("/dashboard");
          break;
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      if (err.response?.status === 403) {
        setError(
          "Your account is pending approval. Please wait for admin confirmation or contact support.",
        );
      } else {
        setError(
          err.response?.data?.detail ||
            err.message ||
            "Login failed. Please check your credentials.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const F = "'Barlow', -apple-system, BlinkMacSystemFont, sans-serif";

  /* ── Theme palette ── */
  const colors = darkMode
    ? {
        pageBg: "#020202",
        cardBg: "#111",
        cardShadowRing: "#1e1e1e",
        leftBg: "#111",
        rightBg: "#0d0d0d",
        divider: "#1e1e1e",
        textPrimary: "#fff",
        textSecondary: "#555",
        textMuted: "#484848",
        inputBg: "#1a1a1a",
        inputBorder: "#2a2a2a",
        inputBorderFocus: "#4CAF50",
        inputText: "#e0e0e0",
        labelColor: "#666",
        orDivider: "#333",
        googleBg: "#1a1a1a",
        googleBorder: "#272727",
        googleBorderHover: "#3a3a3a",
        googleText: "#888",
        googleTextHover: "#bbb",
        cardItemBg1: "#181818",
        cardItemBg2: "#1b1b1b",
        cardItemBorder1: "#252525",
        cardItemBorder2: "#2d2d2d",
        cardTitleColor1: "#c5c5c5",
        cardTitleColor2: "#dedede",
        cardDescColor: "#6a6a6a",
        gridLine: "rgba(255,255,255,0.028)",
        modalBg: "#131313",
        modalBorder: "#222",
        modalBodyText: "#555",
        closeBtnBg: "#1e1e1e",
        closeBtnBorder: "#2a2a2a",
        closeBtnColor: "#555",
        toggleBg: "#1a1a1a",
        toggleBorder: "#272727",
        toggleColor: "#999",
      }
    : {
        pageBg: "#eef1f4",
        cardBg: "#ffffff",
        cardShadowRing: "#e2e5e9",
        leftBg: "#ffffff",
        rightBg: "#f7f8fa",
        divider: "#e5e7eb",
        textPrimary: "#111827",
        textSecondary: "#6b7280",
        textMuted: "#6b7280",
        inputBg: "#f9fafb",
        inputBorder: "#d1d5db",
        inputBorderFocus: "#4CAF50",
        inputText: "#111827",
        labelColor: "#374151",
        orDivider: "#d1d5db",
        googleBg: "#ffffff",
        googleBorder: "#d1d5db",
        googleBorderHover: "#9ca3af",
        googleText: "#374151",
        googleTextHover: "#111827",
        cardItemBg1: "#ffffff",
        cardItemBg2: "#ffffff",
        cardItemBorder1: "#e5e7eb",
        cardItemBorder2: "#e5e7eb",
        cardTitleColor1: "#374151",
        cardTitleColor2: "#111827",
        cardDescColor: "#6b7280",
        gridLine: "rgba(0,0,0,0.035)",
        modalBg: "#ffffff",
        modalBorder: "#e5e7eb",
        modalBodyText: "#6b7280",
        closeBtnBg: "#f3f4f6",
        closeBtnBorder: "#e5e7eb",
        closeBtnColor: "#6b7280",
        toggleBg: "#f3f4f6",
        toggleBorder: "#e5e7eb",
        toggleColor: "#374151",
      };

  const onFocus = (e) => (e.target.style.borderColor = colors.inputBorderFocus);
  const onBlur = (e) => (e.target.style.borderColor = colors.inputBorder);

  /* ── Modal config ── */
  const modalConfig = {
    forgot: {
      icon: (
        <svg
          width="38"
          height="38"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#4CAF50"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      title: "Forgot Password",
      subtitle: "Password Reset",
      body: "Self-service password reset is currently under development. Please contact your system administrator to reset your password.",
    },
    google: {
      icon: (
        <svg width="38" height="38" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      ),
      title: "Google Sign-In",
      subtitle: "OAuth Integration",
      body: "Google authentication is currently being integrated into the system. Please use your username and password to sign in for now.",
    },
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        height: isMobile ? "auto" : "100vh",
        overflow: isMobile ? "auto" : "hidden",
        background: colors.pageBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "1.25rem" : "0",
        boxSizing: "border-box",
        fontFamily: F,
        position: "relative",
        transition: "background 0.3s ease",
      }}
    >
      <style>{`
        @keyframes floatA {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.93) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0px); }
        }
        @keyframes backdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.9); opacity: 0.6; }
          50%  { transform: scale(1.15); opacity: 0.2; }
          100% { transform: scale(0.9); opacity: 0.6; }
        }
      `}</style>

      {/* ═══════════════════════════════════════
          DARK / LIGHT MODE TOGGLE
      ═══════════════════════════════════════ */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        style={{
          position: "absolute",
          top: isMobile ? "1rem" : "1.5rem",
          right: isMobile ? "1rem" : "1.5rem",
          width: "42px",
          height: "42px",
          background: colors.toggleBg,
          border: `1px solid ${colors.toggleBorder}`,
          borderRadius: "10px",
          color: colors.toggleColor,
          cursor: "pointer",
          fontSize: "1.15rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#4CAF50";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = colors.toggleBorder;
        }}
      >
        {darkMode ? "🌙" : "☀️"}
      </button>

      {/* ═══════════════════════════════════════
          COMING SOON MODAL
      ═══════════════════════════════════════ */}
      {modal && (
        <div
          onClick={() => setModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            animation: "backdropIn 0.2s ease",
            padding: "1.5rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.modalBg,
              border: `1px solid ${colors.modalBorder}`,
              borderRadius: "20px",
              padding: "2.5rem 2.25rem 2rem",
              maxWidth: "380px",
              width: "100%",
              boxShadow: darkMode
                ? "0 0 0 1px #1a1a1a, 0 32px 80px rgba(0,0,0,0.7)"
                : "0 0 0 1px #eee, 0 32px 80px rgba(0,0,0,0.15)",
              animation: "modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
              position: "relative",
              textAlign: "center",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setModal(null)}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                background: colors.closeBtnBg,
                border: `1px solid ${colors.closeBtnBorder}`,
                borderRadius: "50%",
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: colors.closeBtnColor,
                padding: 0,
                transition: "border-color 0.2s, color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#4CAF50";
                e.currentTarget.style.color = "#4CAF50";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.closeBtnBorder;
                e.currentTarget.style.color = colors.closeBtnColor;
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Icon with pulse ring */}
            <div
              style={{
                position: "relative",
                display: "inline-block",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "-10px",
                  borderRadius: "50%",
                  border: "1.5px solid rgba(76,175,80,0.3)",
                  animation: "pulse-ring 2.4s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: "rgba(76,175,80,0.08)",
                  border: "1px solid rgba(76,175,80,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {modalConfig[modal].icon}
              </div>
            </div>

            {/* Coming Soon badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(76,175,80,0.08)",
                border: "1px solid rgba(76,175,80,0.2)",
                borderRadius: "20px",
                padding: "3px 12px",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#4CAF50",
                }}
              />
              <span
                style={{
                  fontFamily: F,
                  fontSize: "0.7rem",
                  fontWeight: "700",
                  color: "#4CAF50",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Coming Soon
              </span>
            </div>

            {/* Title */}
            <h3
              style={{
                fontFamily: F,
                fontSize: "1.3rem",
                fontWeight: "800",
                color: colors.textPrimary,
                letterSpacing: "0.03em",
                marginBottom: "0.2rem",
                textTransform: "uppercase",
              }}
            >
              {modalConfig[modal].title}
            </h3>

            {/* Subtitle */}
            <p
              style={{
                fontFamily: F,
                fontSize: "0.74rem",
                color: "#4CAF50",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "1rem",
              }}
            >
              {modalConfig[modal].subtitle}
            </p>

            {/* Divider */}
            <div
              style={{
                height: "1px",
                background: colors.divider,
                marginBottom: "1rem",
              }}
            />

            {/* Body */}
            <p
              style={{
                fontFamily: F,
                fontSize: "0.83rem",
                color: colors.modalBodyText,
                lineHeight: 1.7,
                marginBottom: "1.75rem",
              }}
            >
              {modalConfig[modal].body}
            </p>

            {/* Got it button */}
            <button
              onClick={() => setModal(null)}
              style={{
                width: "100%",
                padding: "0.78rem",
                background: "#4CAF50",
                color: "#000",
                border: "none",
                borderRadius: "9px",
                fontFamily: F,
                fontSize: "0.8rem",
                fontWeight: "800",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "background 0.18s",
              }}
              onMouseEnter={(e) => (e.target.style.background = "#45a049")}
              onMouseLeave={(e) => (e.target.style.background = "#4CAF50")}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          width: "100%",
          height: isMobile ? "auto" : "100%",
          maxWidth: "850px",
          maxHeight: isMobile ? "none" : "550px",
          background: colors.cardBg,
          borderRadius: "18px",
          overflow: "hidden",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          boxShadow: darkMode
            ? `0 0 0 1px ${colors.cardShadowRing}, 0 24px 60px rgba(0,0,0,0.6)`
            : `0 0 0 1px ${colors.cardShadowRing}, 0 24px 60px rgba(0,0,0,0.08)`,
          transition: "background 0.3s ease",
        }}
      >
        {/* ═══════════════════════════════════════
            LEFT — Login Form
        ═══════════════════════════════════════ */}
        <div
          style={{
            flex: "0 0 auto",
            width: isMobile ? "100%" : "360px",
            background: colors.leftBg,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: isMobile ? "2rem 1.75rem" : "2rem 2.25rem",
            borderRight: isMobile ? "none" : `1px solid ${colors.divider}`,
            boxSizing: "border-box",
          }}
        >
          {/* FDA Logo */}
          <div style={{ marginBottom: isMobile ? "1rem" : "1rem" }}>
            <img
              src="/images/FDALogo.png"
              alt="FDA Logo"
              style={{
                width: isMobile ? "190px" : "170px",
                height: "58px",
                objectFit: "contain",
              }}
            />
          </div>

          <h1
            style={{
              fontFamily: F,
              fontSize: "1.1rem",
              fontWeight: "800",
              color: colors.textPrimary,
              letterSpacing: "0.04em",
              marginBottom: "0.25rem",
              textTransform: "uppercase",
            }}
          >
            Welcome Back
          </h1>
          <p
            style={{
              fontFamily: F,
              fontSize: "0.74rem",
              color: colors.textSecondary,
              marginBottom: "1rem",
              lineHeight: 1.4,
            }}
          >
            Enter your username and password below to sign in
          </p>

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={labelStyle(F, colors)}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={loading}
                style={inputStyle(F, isMobile, loading, colors)}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={labelStyle(F, colors)}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  disabled={loading}
                  style={{
                    ...inputStyle(F, isMobile, loading, colors),
                    paddingRight: "2.4rem",
                  }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={{
                    position: "absolute",
                    right: "0.6rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: colors.textSecondary,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                  }}
                >
                  {showPassword ? (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.9rem",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: F,
                  fontSize: "0.76rem",
                  color: colors.textSecondary,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  style={{
                    accentColor: "#4CAF50",
                    width: "13px",
                    height: "13px",
                  }}
                />
                Remember Me
              </label>
              <span
                onClick={() => !loading && setModal("forgot")}
                style={{
                  fontFamily: F,
                  fontSize: "0.76rem",
                  color: "#4CAF50",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Forgot password?
              </span>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: "0.55rem 0.8rem",
                  background: "rgba(244,67,54,0.08)",
                  border: "1px solid rgba(244,67,54,0.2)",
                  borderRadius: "7px",
                  color: "#f44336",
                  fontFamily: F,
                  fontSize: "0.76rem",
                  marginBottom: "0.75rem",
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            )}

            {/* Sign In */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.65rem",
                background: loading ? "#3a8c3d" : "#4CAF50",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                fontFamily: F,
                fontSize: "0.78rem",
                fontWeight: "800",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.18s",
                marginBottom: "0.85rem",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.background = "#45a049";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.target.style.background = "#4CAF50";
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "0.75rem",
            }}
          >
            <div
              style={{ flex: 1, height: "1px", background: colors.divider }}
            />
            <span
              style={{
                fontFamily: F,
                fontSize: "0.7rem",
                color: colors.orDivider,
              }}
            >
              or
            </span>
            <div
              style={{ flex: 1, height: "1px", background: colors.divider }}
            />
          </div>

          {/* Google */}
          <button
            onClick={() => setModal("google")}
            style={{
              width: "100%",
              padding: "0.58rem",
              background: colors.googleBg,
              border: `1px solid ${colors.googleBorder}`,
              borderRadius: "8px",
              color: colors.googleText,
              fontFamily: F,
              fontSize: "0.72rem",
              fontWeight: "700",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "1rem",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.googleBorderHover;
              e.currentTarget.style.color = colors.googleTextHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.googleBorder;
              e.currentTarget.style.color = colors.googleText;
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign In With Google
          </button>

          <p
            style={{
              textAlign: "center",
              fontFamily: F,
              color: colors.textMuted,
              fontSize: "0.74rem",
            }}
          >
            Don't have an account?{" "}
            <span
              onClick={() => navigate("/signup")}
              style={{ color: "#4CAF50", cursor: "pointer", fontWeight: "700" }}
            >
              Sign up here
            </span>
          </p>
        </div>

        {/* ═══════════════════════════════════════
            RIGHT — Branding + Staggered Cards
        ═══════════════════════════════════════ */}
        {!isMobile && (
          <div
            style={{
              flex: 1,
              background: colors.rightBg,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: "1.5rem 2rem",
            }}
          >
            {/* Grid overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `linear-gradient(${colors.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${colors.gridLine} 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
                pointerEvents: "none",
              }}
            />

            {/* Green ambient glow */}
            <div
              style={{
                position: "absolute",
                bottom: "-50px",
                right: "-50px",
                width: "300px",
                height: "220px",
                background:
                  "radial-gradient(ellipse at center, rgba(76,175,80,0.09) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 1,
                width: "100%",
                maxWidth: "400px",
              }}
            >
              <h2
                style={{
                  fontFamily: F,
                  fontSize: "1.15rem",
                  fontWeight: "800",
                  color: colors.textPrimary,
                  lineHeight: 1.2,
                  marginBottom: "0.5rem",
                  textAlign: "center",
                }}
              >
                Real-time Monitoring &<br />
                <span
                  style={{
                    color: "#4CAF50",
                    display: "block",
                    fontSize: "1.05rem",
                  }}
                >
                  Analytics Dashboard
                </span>
              </h2>

              <p
                style={{
                  fontFamily: F,
                  fontSize: "0.68rem",
                  color: colors.cardDescColor,
                  textAlign: "center",
                  lineHeight: 1.5,
                  maxWidth: "370px",
                  margin: "0 auto 1.1rem",
                }}
              >
                The DBMS serves as a centralized platform that enables real-time
                monitoring, tracking, and management of applications, reports,
                and system data, supporting analytics, reporting, and compliance
                across all modules.
              </p>

              {/* ── Staggered Cards ── */}
              <div
                style={{ position: "relative", height: "230px", width: "100%" }}
              >
                <svg
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                  viewBox="0 0 400 230"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <path
                    d="M 260 55 L 260 75 L 200 75 L 200 88"
                    stroke={colors.divider}
                    strokeWidth="1"
                    fill="none"
                  />
                  <path
                    d="M 200 148 L 200 168 L 235 168 L 235 178"
                    stroke={colors.divider}
                    strokeWidth="1"
                    fill="none"
                  />
                  <rect
                    x="350"
                    y="70"
                    width="38"
                    height="44"
                    rx="8"
                    stroke="#4CAF5028"
                    strokeWidth="1"
                    fill="none"
                  />
                  <rect
                    x="355"
                    y="152"
                    width="34"
                    height="40"
                    rx="8"
                    stroke="#4CAF501a"
                    strokeWidth="1"
                    fill="none"
                  />
                </svg>

                {/* Card 1 */}
                <div
                  style={{
                    position: "absolute",
                    top: "0px",
                    right: "40px",
                    width: "170px",
                    background: colors.cardItemBg1,
                    border: `1px solid ${colors.cardItemBorder1}`,
                    borderRadius: "10px",
                    padding: "0.65rem 0.8rem",
                    zIndex: 2,
                    animation: "floatA 5s ease-in-out infinite",
                    boxShadow: darkMode
                      ? "none"
                      : "0 4px 14px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: F,
                      fontSize: "0.72rem",
                      fontWeight: "700",
                      color: colors.cardTitleColor1,
                      lineHeight: 1.25,
                      marginBottom: "4px",
                    }}
                  >
                    Reports &{" "}
                    <span style={{ color: "#4CAF50" }}>
                      Application Tracking
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: F,
                      fontSize: "0.62rem",
                      color: colors.cardDescColor,
                      lineHeight: 1.45,
                    }}
                  >
                    Track DTN, drug applications, reapplications, and approval
                    status.
                  </div>
                </div>

                {/* Card 2 */}
                <div
                  style={{
                    position: "absolute",
                    top: "70px",
                    left: "0px",
                    width: "210px",
                    background: colors.cardItemBg2,
                    border: `1px solid ${colors.cardItemBorder2}`,
                    borderRadius: "11px",
                    padding: "0.85rem 1rem",
                    zIndex: 3,
                    animation: "floatB 5s ease-in-out infinite 1.6s",
                    boxShadow: darkMode
                      ? "none"
                      : "0 6px 18px rgba(0,0,0,0.07)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: F,
                      fontSize: "0.82rem",
                      fontWeight: "700",
                      color: colors.cardTitleColor2,
                      lineHeight: 1.25,
                      marginBottom: "6px",
                    }}
                  >
                    Monitoring &{" "}
                    <span style={{ color: "#4CAF50" }}>
                      Workflow Management
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: F,
                      fontSize: "0.66rem",
                      color: colors.cardDescColor,
                      lineHeight: 1.45,
                    }}
                  >
                    Real-time monitoring, assignment queues, task management,
                    and adverse event reporting.
                  </div>
                </div>

                {/* Card 3 */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "0px",
                    right: "25px",
                    width: "170px",
                    background: colors.cardItemBg1,
                    border: `1px solid ${colors.cardItemBorder1}`,
                    borderRadius: "10px",
                    padding: "0.65rem 0.8rem",
                    zIndex: 2,
                    animation: "floatC 5s ease-in-out infinite 3.2s",
                    boxShadow: darkMode
                      ? "none"
                      : "0 4px 14px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: F,
                      fontSize: "0.72rem",
                      fontWeight: "700",
                      color: colors.cardTitleColor1,
                      lineHeight: 1.25,
                      marginBottom: "4px",
                    }}
                  >
                    FDA Verification{" "}
                    <span style={{ color: "#4CAF50" }}>
                      Portal & Bulk Upload
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: F,
                      fontSize: "0.62rem",
                      color: colors.cardDescColor,
                      lineHeight: 1.45,
                    }}
                  >
                    Verify registered drug products and bulk upload via
                    Doctrack.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Style helpers ── */
function labelStyle(F, colors) {
  return {
    display: "block",
    fontFamily: F,
    fontSize: "0.7rem",
    fontWeight: "600",
    color: colors.labelColor,
    marginBottom: "5px",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  };
}

function inputStyle(F, isMobile, loading, colors) {
  return {
    width: "100%",
    padding: "0.55rem 0.8rem",
    background: colors.inputBg,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: "8px",
    color: colors.inputText,
    fontFamily: F,
    fontSize: isMobile ? "16px" : "0.82rem",
    outline: "none",
    boxSizing: "border-box",
    opacity: loading ? 0.6 : 1,
    transition: "border-color 0.2s",
  };
}

export default LoginPage;
