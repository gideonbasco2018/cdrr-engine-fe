import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../api/auth";

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
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Detect screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
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
      };

      const response = await register(registrationData);

      console.log("✅ Registration successful:", response);

      // Show success message
      setSuccessMessage(
        "Registration successful! Your account is pending approval. You will be notified once activated.",
      );

      // Clear form
      setFormData({
        email: "",
        username: "",
        password: "",
        confirmPassword: "",
        first_name: "",
        surname: "",
        position: "",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      console.error("❌ Registration error:", err);
      setError(
        err.response?.data?.detail || err.message || "Registration failed",
      );
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Left Side - Branding */}
      <div
        style={{
          flex: isMobile ? "0 0 auto" : 1,
          background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: isMobile ? "2rem 1.5rem" : "4rem",
          position: "relative",
          overflow: "hidden",
          minHeight: isMobile ? "auto" : "100vh",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(circle at 30% 50%, rgba(76, 175, 80, 0.1) 0%, transparent 50%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          {/* Logo */}
          <div style={{ marginBottom: isMobile ? "1rem" : "2rem" }}>
            <img
              src="/images/FDALogo.png"
              alt="FDA Logo"
              style={{
                width: isMobile ? "80px" : "750px",
                height: isMobile ? "80px" : "150px",
                objectFit: "contain",
              }}
            />
          </div>

          {/* Main Title */}
          <h1
            style={{
              fontSize: isMobile ? "1.25rem" : "2rem",
              fontWeight: "700",
              color: "#fff",
              marginBottom: "0.5rem",
              letterSpacing: "0.05em",
              lineHeight: "1.3",
            }}
          >
            Center for Drug Regulation
          </h1>
          <h1
            style={{
              fontSize: isMobile ? "1.25rem" : "2rem",
              fontWeight: "700",
              color: "#fff",
              marginBottom: isMobile ? "1rem" : "2rem",
              letterSpacing: "0.05em",
            }}
          >
            and Research (CDRR)
          </h1>

          <div style={{ marginTop: isMobile ? "1.5rem" : "3rem" }}>
            <h2
              style={{
                fontSize: isMobile ? "1.1rem" : "1.75rem",
                fontWeight: "600",
                color: "#fff",
                marginBottom: isMobile ? "0.25rem" : "1rem",
              }}
            >
              Real-time Monitoring
            </h2>
            <h2
              style={{
                fontSize: isMobile ? "1.1rem" : "1.75rem",
                fontWeight: "600",
                color: "#fff",
                marginBottom: isMobile ? "1rem" : "2rem",
              }}
            >
              & Analytics Dashboard
            </h2>

            {!isMobile && (
              <p
                style={{
                  fontSize: "1rem",
                  color: "#999",
                  lineHeight: "1.6",
                  maxWidth: "400px",
                  margin: "0 auto",
                }}
              >
                Join our platform to track drug registrations, adverse events,
                <br />
                and regulatory compliance
              </p>
            )}
          </div>

          {!isMobile && (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "center",
                marginTop: "3rem",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "3px",
                  background: "#4CAF50",
                  borderRadius: "2px",
                }}
              />
              <div
                style={{
                  width: "8px",
                  height: "3px",
                  background: "#333",
                  borderRadius: "2px",
                }}
              />
              <div
                style={{
                  width: "8px",
                  height: "3px",
                  background: "#333",
                  borderRadius: "2px",
                }}
              />
              <div
                style={{
                  width: "8px",
                  height: "3px",
                  background: "#333",
                  borderRadius: "2px",
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div
        style={{
          flex: isMobile ? 1 : 1,
          background: "#0a0a0a",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: isMobile ? "2rem 1.5rem" : "4rem 4rem",
          maxWidth: isMobile ? "100%" : "600px",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "400px",
            width: "100%",
            margin: "0 auto",
          }}
        >
          <h2
            style={{
              fontSize: isMobile ? "1.5rem" : "2rem",
              fontWeight: "600",
              color: "#fff",
              marginBottom: "0.5rem",
              textAlign: "center",
            }}
          >
            CREATE ACCOUNT
          </h2>

          <p
            style={{
              color: "#666",
              marginBottom: isMobile ? "1.5rem" : "2rem",
              textAlign: "center",
              fontSize: "0.9rem",
            }}
          >
            Fill in your details to register
          </p>

          {successMessage && (
            <div
              style={{
                padding: "0.875rem",
                background: "rgba(76, 175, 80, 0.1)",
                border: "1px solid rgba(76, 175, 80, 0.3)",
                borderRadius: "8px",
                color: "#4CAF50",
                fontSize: "0.9rem",
                marginBottom: "1.5rem",
                textAlign: "center",
              }}
            >
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* First Name */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  color: "#999",
                  fontSize: "0.85rem",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                }}
              >
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Enter your first name"
                required
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  background: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: isMobile ? "16px" : "0.95rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                  opacity: loading ? 0.6 : 1,
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
                onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
              />
            </div>

            {/* Surname */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  color: "#999",
                  fontSize: "0.85rem",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                }}
              >
                Surname
              </label>
              <input
                type="text"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                placeholder="Enter your surname"
                required
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  background: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: isMobile ? "16px" : "0.95rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                  opacity: loading ? 0.6 : 1,
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
                onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  color: "#999",
                  fontSize: "0.85rem",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                }}
              >
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  background: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: isMobile ? "16px" : "0.95rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                  opacity: loading ? 0.6 : 1,
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
                onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
              />
            </div>

            {/* Username */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  color: "#999",
                  fontSize: "0.85rem",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                }}
              >
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                required
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  background: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: isMobile ? "16px" : "0.95rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                  opacity: loading ? 0.6 : 1,
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
                onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
              />
            </div>

            {/* Position (Optional) */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  color: "#999",
                  fontSize: "0.85rem",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                }}
              >
                Position <span style={{ color: "#666" }}>(Optional)</span>
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                placeholder="Enter your position"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  background: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: isMobile ? "16px" : "0.95rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                  opacity: loading ? 0.6 : 1,
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
                onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  color: "#999",
                  fontSize: "0.85rem",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password (min. 8 characters)"
                  required
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    paddingRight: "3rem",
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: isMobile ? "16px" : "0.95rem",
                    outline: "none",
                    transition: "border-color 0.2s",
                    opacity: loading ? 0.6 : 1,
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
                  onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={{
                    position: "absolute",
                    right: "0.875rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#666",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "1.2rem",
                    padding: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  color: "#999",
                  fontSize: "0.85rem",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                }}
              >
                Confirm Password
              </label>
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
                    width: "100%",
                    padding: "0.875rem",
                    paddingRight: "3rem",
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: isMobile ? "16px" : "0.95rem",
                    outline: "none",
                    transition: "border-color 0.2s",
                    opacity: loading ? 0.6 : 1,
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
                  onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  style={{
                    position: "absolute",
                    right: "0.875rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#666",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "1.2rem",
                    padding: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: isMobile ? "1rem" : "0.875rem",
                background: loading ? "#999" : "#4CAF50",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.95rem",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                marginTop: "1rem",
                marginBottom: "1rem",
                touchAction: "manipulation",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = "#45a049";
                  e.target.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.background = "#4CAF50";
                  e.target.style.transform = "translateY(0)";
                }
              }}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            {error && (
              <div
                style={{
                  padding: "0.875rem",
                  background: "rgba(244, 67, 54, 0.1)",
                  border: "1px solid rgba(244, 67, 54, 0.3)",
                  borderRadius: "8px",
                  color: "#f44336",
                  fontSize: "0.9rem",
                  marginBottom: "1rem",
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            )}
          </form>

          <p
            style={{
              textAlign: "center",
              color: "#666",
              fontSize: "0.9rem",
              marginTop: "1.5rem",
            }}
          >
            Already have an account?{" "}
            <span
              onClick={() => navigate("/login")}
              style={{
                color: "#4CAF50",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Sign in here
            </span>
          </p>

          <p
            style={{
              textAlign: "center",
              marginTop: isMobile ? "1rem" : "1.5rem",
            }}
          >
            <span
              onClick={() => alert("Privacy Policy")}
              style={{
                color: "#666",
                cursor: "pointer",
                fontSize: "0.85rem",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.color = "#999")}
              onMouseLeave={(e) => (e.target.style.color = "#666")}
            >
              Privacy Policy
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
