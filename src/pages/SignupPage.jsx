import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../api/auth";

const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Barlow+Condensed:wght@600;700;800&display=swap";
if (!document.head.querySelector("[href*='Barlow']")) {
  document.head.appendChild(fontLink);
}

function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    surname: "",
    position: "",
    alias: "",
    access_request: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 900);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (formData.username.length < 3) {
      setError("Username must be at least 3 characters long");
      return;
    }

    setLoading(true);
    try {
      const registrationData = {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        first_name: formData.first_name,
        surname: formData.surname,
        position: formData.position || undefined,
        alias: formData.alias,
        access_request: formData.access_request || undefined,
      };

      const response = await register(registrationData);
      console.log("✅ Registration successful:", response);

      setSuccessMessage(
        "Registration successful! Your account is pending approval. You will be notified once activated.",
      );

      setFormData({
        email: "",
        username: "",
        password: "",
        confirmPassword: "",
        first_name: "",
        surname: "",
        position: "",
        alias: "",
        access_request: "",
      });

      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      console.error("❌ Registration error:", err);
      setError(
        err.response?.data?.detail || err.message || "Registration failed",
      );
      setLoading(false);
    }
  };

  const F = "'Barlow', -apple-system, BlinkMacSystemFont, sans-serif";
  const onFocus = (e) => (e.target.style.borderColor = "#4CAF50");
  const onBlur = (e) => (e.target.style.borderColor = "#2a2a2a");

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

        /* Custom scrollbar for the form panel */
        .signup-form-panel::-webkit-scrollbar {
          width: 4px;
        }
        .signup-form-panel::-webkit-scrollbar-track {
          background: #111;
        }
        .signup-form-panel::-webkit-scrollbar-thumb {
          background: #2a2a2a;
          border-radius: 4px;
        }
        .signup-form-panel::-webkit-scrollbar-thumb:hover {
          background: #4CAF50;
        }
      `}</style>

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
          /* Fixed height on desktop so left panel scrolls independently */
          maxHeight: isMobile ? "none" : "92vh",
        }}
      >
        {/* ═══════════════════════════════════════
            LEFT — Signup Form (scrollable)
        ═══════════════════════════════════════ */}
        <div
          className="signup-form-panel"
          style={{
            flex: "0 0 auto",
            width: isMobile ? "100%" : "390px",
            background: "#111",
            display: "flex",
            flexDirection: "column",
            padding: isMobile ? "2.5rem 2rem" : "3rem 2.75rem",
            borderRight: isMobile ? "none" : "1px solid #1e1e1e",
            boxSizing: "border-box",
            overflowY: "auto",
            /* Scrollbar always present to prevent layout shift */
            overflowX: "hidden",
          }}
        >
          {/* FDA Logo */}
          <div
            style={{
              marginBottom: isMobile ? "1.25rem" : "1.75rem",
              flexShrink: 0,
            }}
          >
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

          {/* Heading */}
          <h1
            style={{
              fontFamily: F,
              fontSize: "1.4rem",
              fontWeight: "800",
              color: "#fff",
              letterSpacing: "0.04em",
              marginBottom: "0.3rem",
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            Create Account
          </h1>
          <p
            style={{
              fontFamily: F,
              fontSize: "0.82rem",
              color: "#555",
              marginBottom: "1.75rem",
              lineHeight: 1.5,
              flexShrink: 0,
            }}
          >
            Fill in your details to register for access
          </p>

          {/* Success Message */}
          {successMessage && (
            <div
              style={{
                padding: "0.7rem 0.9rem",
                background: "rgba(76,175,80,0.08)",
                border: "1px solid rgba(76,175,80,0.2)",
                borderRadius: "7px",
                color: "#4CAF50",
                fontFamily: F,
                fontSize: "0.82rem",
                marginBottom: "1rem",
                textAlign: "center",
                lineHeight: 1.5,
                flexShrink: 0,
              }}
            >
              {successMessage}
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} style={{ flex: 1 }}>
            {/* First Name + Surname — 2 col grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <div>
                <label style={labelStyle(F)}>First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="First name"
                  required
                  disabled={loading}
                  style={inputStyle(F, isMobile, loading)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>
              <div>
                <label style={labelStyle(F)}>Surname</label>
                <input
                  type="text"
                  name="surname"
                  value={formData.surname}
                  onChange={handleChange}
                  placeholder="Surname"
                  required
                  disabled={loading}
                  style={inputStyle(F, isMobile, loading)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle(F)}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                disabled={loading}
                style={inputStyle(F, isMobile, loading)}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {/* Username */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle(F)}>Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                required
                disabled={loading}
                style={inputStyle(F, isMobile, loading)}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {/* Position */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle(F)}>
                Position{" "}
                <span
                  style={{
                    color: "#444",
                    fontWeight: "400",
                    textTransform: "none",
                    letterSpacing: 0,
                    fontSize: "0.72rem",
                  }}
                >
                  (Optional)
                </span>
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                placeholder="Your position or job title"
                disabled={loading}
                style={inputStyle(F, isMobile, loading)}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {/* Alias */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle(F)}>Alias</label>
              <p
                style={{
                  fontFamily: F,
                  fontSize: "0.74rem",
                  color: "#555",
                  margin: "0 0 6px",
                  lineHeight: 1.5,
                }}
              >
                Appears in Doctrack as:{" "}
                <code
                  style={{
                    background: "#1e1e1e",
                    border: "1px solid #2a2a2a",
                    borderRadius: "4px",
                    padding: "1px 5px",
                    color: "#7eb8f7",
                    fontSize: "0.72rem",
                  }}
                >
                  Remarks by: (Alias)
                </code>
              </p>
              <input
                type="text"
                name="alias"
                value={formData.alias}
                onChange={handleChange}
                placeholder="Preferred alias or user code"
                required
                disabled={loading}
                style={inputStyle(F, isMobile, loading)}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {/* Access Request */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle(F)}>
                Access Request{" "}
                <span
                  style={{
                    color: "#444",
                    fontWeight: "400",
                    textTransform: "none",
                    letterSpacing: 0,
                    fontSize: "0.72rem",
                  }}
                >
                  (Optional)
                </span>
              </label>
              <textarea
                name="access_request"
                value={formData.access_request}
                onChange={handleChange}
                placeholder="Briefly describe why you need access..."
                disabled={loading}
                rows={3}
                style={{
                  ...inputStyle(F, isMobile, loading),
                  resize: "vertical",
                  minHeight: "76px",
                  lineHeight: 1.5,
                  paddingTop: "0.65rem",
                  paddingBottom: "0.65rem",
                  fontFamily: F,
                }}
                onFocus={onFocus}
                onBlur={onBlur}
              />
              <p
                style={{
                  fontFamily: F,
                  fontSize: "0.72rem",
                  color: "#444",
                  margin: "4px 0 0",
                  lineHeight: 1.4,
                }}
              >
                Helps admins understand your role and approve your account
                faster.
              </p>
            </div>

            {/* Password */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle(F)}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
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
                  style={eyeButtonStyle(loading)}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle(F)}>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
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
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  style={eyeButtonStyle(loading)}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
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

            {/* Submit */}
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
                marginTop: "0.4rem",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.background = "#45a049";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.target.style.background = "#4CAF50";
              }}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p
            style={{
              textAlign: "center",
              fontFamily: F,
              color: "#444",
              fontSize: "0.8rem",
              paddingBottom: "0.5rem",
              flexShrink: 0,
            }}
          >
            Already have an account?{" "}
            <span
              onClick={() => navigate("/login")}
              style={{
                color: "#4CAF50",
                cursor: "pointer",
                fontWeight: "700",
              }}
            >
              Sign in here
            </span>
          </p>
        </div>

        {/* ═══════════════════════════════════════
            RIGHT — Branding + Staggered Cards
            (exact same as LoginPage)
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

            {/* Content */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                width: "100%",
                maxWidth: "470px",
              }}
            >
              {/* Headline */}
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
                style={{
                  position: "relative",
                  height: "380px",
                  width: "100%",
                }}
              >
                {/* SVG connector lines + ghost boxes */}
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

                {/* Card 1: top-RIGHT */}
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

                {/* Card 2: middle-LEFT */}
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

                {/* Card 3: bottom-RIGHT */}
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
                      Portal <br /> & Bulk Upload
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

function eyeButtonStyle(loading) {
  return {
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
  };
}

function EyeIcon() {
  return (
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
  );
}

function EyeOffIcon() {
  return (
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
  );
}

export default SignupPage;
