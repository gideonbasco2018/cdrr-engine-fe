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
  const onFocus = (e) => (e.target.style.borderColor = "#4CAF50");
  const onBlur = (e) => (e.target.style.borderColor = "#2a2a2a");

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
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "1.25rem" : "2.5rem 2rem",
        boxSizing: "border-box",
        fontFamily: F,
      }}
    >
      <style>{`
        @keyframes floatA {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
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
              background: "#131313",
              border: "1px solid #222",
              borderRadius: "20px",
              padding: "2.5rem 2.25rem 2rem",
              maxWidth: "380px",
              width: "100%",
              boxShadow: "0 0 0 1px #1a1a1a, 0 32px 80px rgba(0,0,0,0.7)",
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
                background: "#1e1e1e",
                border: "1px solid #2a2a2a",
                borderRadius: "50%",
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#555",
                padding: 0,
                transition: "border-color 0.2s, color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#4CAF50";
                e.currentTarget.style.color = "#4CAF50";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.color = "#555";
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
                color: "#fff",
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
                background: "#1e1e1e",
                marginBottom: "1rem",
              }}
            />

            {/* Body */}
            <p
              style={{
                fontFamily: F,
                fontSize: "0.83rem",
                color: "#555",
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
          maxWidth: "980px",
          background: "#111",
          borderRadius: "18px",
          overflow: "hidden",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          boxShadow: "0 0 0 1px #1e1e1e, 0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* ═══════════════════════════════════════
            LEFT — Login Form
        ═══════════════════════════════════════ */}
        <div
          style={{
            flex: "0 0 auto",
            width: isMobile ? "100%" : "390px",
            background: "#111",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: isMobile ? "2.5rem 2rem" : "3rem 2.75rem",
            borderRight: isMobile ? "none" : "1px solid #1e1e1e",
            boxSizing: "border-box",
          }}
        >
          {/* FDA Logo */}
          <div style={{ marginBottom: isMobile ? "1.25rem" : "1.75rem" }}>
            <img
              src="/images/FDALogo.png"
              alt="FDA Logo"
              style={{
                width: isMobile ? "220px" : "260px",
                height: "90px",
                objectFit: "contain",
              }}
            />
          </div>

          <h1
            style={{
              fontFamily: F,
              fontSize: "1.4rem",
              fontWeight: "800",
              color: "#fff",
              letterSpacing: "0.04em",
              marginBottom: "0.3rem",
              textTransform: "uppercase",
            }}
          >
            Welcome Back
          </h1>
          <p
            style={{
              fontFamily: F,
              fontSize: "0.82rem",
              color: "#555",
              marginBottom: "1.75rem",
              lineHeight: 1.5,
            }}
          >
            Enter your username and password below to sign in
          </p>

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle(F)}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={loading}
                style={inputStyle(F, isMobile, loading)}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle(F)}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  disabled={loading}
                  style={{
                    ...inputStyle(F, isMobile, loading),
                    paddingRight: "2.6rem",
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
                    right: "0.65rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#555",
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                  }}
                >
                  {showPassword ? (
                    <svg
                      width="16"
                      height="16"
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
                      width="16"
                      height="16"
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
                marginBottom: "1.4rem",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  fontFamily: F,
                  fontSize: "0.82rem",
                  color: "#666",
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
                  fontSize: "0.82rem",
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
                  padding: "0.7rem 0.9rem",
                  background: "rgba(244,67,54,0.08)",
                  border: "1px solid rgba(244,67,54,0.2)",
                  borderRadius: "7px",
                  color: "#f44336",
                  fontFamily: F,
                  fontSize: "0.82rem",
                  marginBottom: "0.9rem",
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
                padding: "0.82rem",
                background: loading ? "#3a8c3d" : "#4CAF50",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                fontFamily: F,
                fontSize: "0.82rem",
                fontWeight: "800",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.18s",
                marginBottom: "1.1rem",
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
              marginBottom: "1rem",
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "#1e1e1e" }} />
            <span style={{ fontFamily: F, fontSize: "0.75rem", color: "#333" }}>
              or
            </span>
            <div style={{ flex: 1, height: "1px", background: "#1e1e1e" }} />
          </div>

          {/* Google */}
          <button
            onClick={() => setModal("google")}
            style={{
              width: "100%",
              padding: "0.72rem",
              background: "#1a1a1a",
              border: "1px solid #272727",
              borderRadius: "8px",
              color: "#888",
              fontFamily: F,
              fontSize: "0.78rem",
              fontWeight: "700",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "9px",
              marginBottom: "1.75rem",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#3a3a3a";
              e.currentTarget.style.color = "#bbb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#272727";
              e.currentTarget.style.color = "#888";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
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
              color: "#444",
              fontSize: "0.8rem",
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
              background: "#0d0d0d",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: "3rem 2.5rem",
            }}
          >
            {/* Grid overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
                pointerEvents: "none",
              }}
            />

            {/* Green ambient glow */}
            <div
              style={{
                position: "absolute",
                bottom: "-50px",
                right: "-50px",
                width: "340px",
                height: "260px",
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
                maxWidth: "470px",
              }}
            >
              <h2
                style={{
                  fontFamily: F,
                  fontSize: "1.85rem",
                  fontWeight: "800",
                  color: "#fff",
                  lineHeight: 1.2,
                  marginBottom: "0.8rem",
                  textAlign: "center",
                }}
              >
                Real-time Monitoring &<br />
                <span
                  style={{
                    color: "#4CAF50",
                    display: "block",
                    fontSize: "1.7rem",
                  }}
                >
                  Analytics Dashboard
                </span>
              </h2>

              <p
                style={{
                  fontFamily: F,
                  fontSize: "0.83rem",
                  color: "#484848",
                  textAlign: "center",
                  lineHeight: 1.65,
                  maxWidth: "430px",
                  margin: "0 auto 3rem",
                }}
              >
                The DBMS serves as a centralized platform that enables real-time
                monitoring, tracking, and management of applications, reports,
                and system data, supporting analytics, reporting, and compliance
                across all modules.
              </p>

              {/* ── Staggered Cards ── */}
              <div
                style={{ position: "relative", height: "380px", width: "100%" }}
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
                  viewBox="0 0 470 380"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <path
                    d="M 310 96 L 310 130 L 230 130 L 230 148"
                    stroke="#252525"
                    strokeWidth="1"
                    fill="none"
                  />
                  <path
                    d="M 230 275 L 230 302 L 285 302 L 285 314"
                    stroke="#252525"
                    strokeWidth="1"
                    fill="none"
                  />
                  <rect
                    x="418"
                    y="130"
                    width="46"
                    height="70"
                    rx="9"
                    stroke="#4CAF5028"
                    strokeWidth="1"
                    fill="none"
                  />
                  <rect
                    x="424"
                    y="266"
                    width="42"
                    height="66"
                    rx="9"
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
                    right: "52px",
                    width: "215px",
                    background: "#181818",
                    border: "1px solid #252525",
                    borderRadius: "11px",
                    padding: "1rem 1.15rem",
                    zIndex: 2,
                    animation: "floatA 5s ease-in-out infinite",
                  }}
                >
                  <div
                    style={{
                      fontFamily: F,
                      fontSize: "0.88rem",
                      fontWeight: "700",
                      color: "#c5c5c5",
                      lineHeight: 1.3,
                      marginBottom: "6px",
                    }}
                  >
                    CDRR Reports &<br />
                    <span style={{ color: "#4CAF50" }}>
                      Application Tracking
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: F,
                      fontSize: "0.76rem",
                      color: "#6a6a6a",
                      lineHeight: 1.6,
                    }}
                  >
                    Track DTN, drug applications, reapplications, and approval
                    status in real time.
                  </div>
                </div>

                {/* Card 2 */}
                <div
                  style={{
                    position: "absolute",
                    top: "118px",
                    left: "0px",
                    width: "268px",
                    background: "#1b1b1b",
                    border: "1px solid #2d2d2d",
                    borderRadius: "13px",
                    padding: "1.25rem 1.4rem",
                    zIndex: 3,
                    animation: "floatB 5s ease-in-out infinite 1.6s",
                  }}
                >
                  <div
                    style={{
                      fontFamily: F,
                      fontSize: "1rem",
                      fontWeight: "700",
                      color: "#dedede",
                      lineHeight: 1.3,
                      marginBottom: "8px",
                    }}
                  >
                    Monitoring &<br />
                    <span style={{ color: "#4CAF50" }}>
                      Workflow Management
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: F,
                      fontSize: "0.78rem",
                      color: "#6a6a6a",
                      lineHeight: 1.6,
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
                    right: "34px",
                    width: "215px",
                    background: "#181818",
                    border: "1px solid #252525",
                    borderRadius: "11px",
                    padding: "1rem 1.15rem",
                    zIndex: 2,
                    animation: "floatC 5s ease-in-out infinite 3.2s",
                  }}
                >
                  <div
                    style={{
                      fontFamily: F,
                      fontSize: "0.88rem",
                      fontWeight: "700",
                      color: "#c5c5c5",
                      lineHeight: 1.3,
                      marginBottom: "6px",
                    }}
                  >
                    FDA Verification{" "}
                    <span style={{ color: "#4CAF50" }}>
                      Portal <br />& Bulk Upload
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: F,
                      fontSize: "0.76rem",
                      color: "#6a6a6a",
                      lineHeight: 1.6,
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
function labelStyle(F) {
  return {
    display: "block",
    fontFamily: F,
    fontSize: "0.75rem",
    fontWeight: "600",
    color: "#666",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  };
}

function inputStyle(F, isMobile, loading) {
  return {
    width: "100%",
    padding: "0.68rem 0.9rem",
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    color: "#e0e0e0",
    fontFamily: F,
    fontSize: isMobile ? "16px" : "0.88rem",
    outline: "none",
    boxSizing: "border-box",
    opacity: loading ? 0.6 : 1,
    transition: "border-color 0.2s",
  };
}

export default LoginPage;
