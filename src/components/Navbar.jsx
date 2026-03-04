import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { logout, getUser } from "../api/auth";
import NotificationBell from "./NotificationBell"; // ← BAGO

function Navbar({ darkMode, setDarkMode, setActiveMenu, userRole = "User" }) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [user, setUser] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const userData = getUser();
    setUser(userData);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("❌ Logout error:", error);
    } finally {
      window.location.href = "/login";
    }
  };

  const colors = darkMode
    ? {
        navbarBg: "#111111",
        navbarBorder: "#2b2b2b",
        buttonBg: "#1a1a1a",
        buttonBgHover: "#222",
        buttonColor: "#999",
        buttonColorHover: "#fff",
        divider: "#1a1a1a",
        textPrimary: "#fff",
        textSecondary: "#666",
        notificationDot: "#4CAF50",
        dropdownBg: "#1a1a1a",
        dropdownBorder: "#2a2a2a",
        dropdownHover: "#222",
        dropdownDivider: "#2a2a2a",
        // ← para sa NotificationBell
        cardBorder: "#2b2b2b",
        inputBg: "#1a1a1a",
        inputBorder: "#2b2b2b",
        textTertiary: "#666",
      }
    : {
        navbarBg: "#ffffff",
        navbarBorder: "#e5e5e5",
        buttonBg: "#f5f5f5",
        buttonBgHover: "#e5e5e5",
        buttonColor: "#666",
        buttonColorHover: "#000",
        divider: "#e5e5e5",
        textPrimary: "#000",
        textSecondary: "#666",
        notificationDot: "#4CAF50",
        dropdownBg: "#ffffff",
        dropdownBorder: "#e5e5e5",
        dropdownHover: "#f5f5f5",
        dropdownDivider: "#e5e5e5",
        // ← para sa NotificationBell
        cardBorder: "#e5e5e5",
        inputBg: "#f9fafb",
        inputBorder: "#e5e5e5",
        textTertiary: "#9ca3af",
      };

  const roleBadgeColors = {
    User: { bg: "#4CAF50", text: "#4CAF50" },
    Admin: { bg: "#2196F3", text: "#2196F3" },
    SuperAdmin: { bg: "#ff9800", text: "#ff9800" },
  };

  const getUserInitial = () => {
    if (user?.first_name) return user.first_name.charAt(0).toUpperCase();
    if (user?.username) return user.username.charAt(0).toUpperCase();
    return "U";
  };

  const getDisplayName = () => {
    if (user?.first_name && user?.surname)
      return `${user.first_name} ${user.surname}`;
    if (user?.username) return user.username;
    return "User";
  };

  return (
    <div
      style={{
        height: "70px",
        background: colors.navbarBg,
        borderBottom: `1px solid ${colors.navbarBorder}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2rem",
        transition: "all 0.3s ease",
      }}
    >
      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            width: "40px",
            height: "40px",
            background: colors.buttonBg,
            border: "none",
            borderRadius: "8px",
            color: colors.buttonColor,
            cursor: "pointer",
            fontSize: "1.1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = colors.buttonBgHover;
            e.target.style.color = colors.buttonColorHover;
          }}
          onMouseLeave={(e) => {
            e.target.style.background = colors.buttonBg;
            e.target.style.color = colors.buttonColor;
          }}
        >
          {darkMode ? "🌙" : "☀️"}
        </button>

        {/* ── NOTIFICATION BELL (replaced static button) ── */}
        <NotificationBell
          currentUser={user}
          darkMode={darkMode}
          colors={colors}
        />

        <div
          style={{ width: "1px", height: "30px", background: colors.divider }}
        />

        {/* User Profile with Dropdown */}
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <div
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              cursor: "pointer",
              padding: "0.5rem",
              borderRadius: "8px",
              transition: "background 0.2s",
              background: showDropdown ? colors.buttonBg : "transparent",
            }}
            onMouseEnter={(e) =>
              !showDropdown &&
              (e.currentTarget.style.background = colors.buttonBg)
            }
            onMouseLeave={(e) =>
              !showDropdown &&
              (e.currentTarget.style.background = "transparent")
            }
          >
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  color: colors.textPrimary,
                  transition: "color 0.3s ease",
                  lineHeight: "1.2",
                }}
              >
                {getDisplayName()}
              </div>
              <div
                style={{
                  fontSize: "0.7rem",
                  fontWeight: "600",
                  color: roleBadgeColors[userRole]?.text || "#4CAF50",
                  marginTop: "0.15rem",
                  letterSpacing: "0.05em",
                }}
              >
                {userRole.toUpperCase()}
              </div>
            </div>

            <div
              style={{
                width: "32px",
                height: "32px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: "0.85rem",
                fontWeight: "600",
              }}
            >
              {getUserInitial()}
            </div>

            <span
              style={{
                color: colors.textSecondary,
                fontSize: "0.8rem",
                transition: "all 0.2s",
                transform: showDropdown ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              ▼
            </span>
          </div>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 0.5rem)",
                right: 0,
                minWidth: "220px",
                background: colors.dropdownBg,
                border: `1px solid ${colors.dropdownBorder}`,
                borderRadius: "12px",
                boxShadow: darkMode
                  ? "0 10px 40px rgba(0, 0, 0, 0.5)"
                  : "0 10px 40px rgba(0, 0, 0, 0.1)",
                padding: "0.5rem",
                zIndex: 1000,
              }}
            >
              {/* User Info */}
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderBottom: `1px solid ${colors.dropdownDivider}`,
                  marginBottom: "0.5rem",
                }}
              >
                <div
                  style={{
                    color: colors.textPrimary,
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    marginBottom: "0.25rem",
                  }}
                >
                  {getDisplayName()}
                </div>
                {user?.email && (
                  <div
                    style={{ color: colors.textSecondary, fontSize: "0.8rem" }}
                  >
                    {user.email}
                  </div>
                )}
                {user?.position && (
                  <div
                    style={{
                      color: colors.textSecondary,
                      fontSize: "0.75rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    {user.position}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setShowDropdown(false);
                  const basePath =
                    userRole === "SuperAdmin"
                      ? "/superadmin"
                      : userRole === "Admin"
                        ? "/admin"
                        : "/dashboard";
                  navigate(`${basePath}/profile`);
                }}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "transparent",
                  border: "none",
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.dropdownHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span>👤</span>
                <span>My Profile</span>
              </button>

              <button
                onClick={() => {
                  setShowDropdown(false);
                  alert("Settings page coming soon");
                }}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "transparent",
                  border: "none",
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.dropdownHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span>⚙️</span>
                <span>Settings</span>
              </button>

              <div
                style={{
                  height: "1px",
                  background: colors.dropdownDivider,
                  margin: "0.5rem 0",
                }}
              />

              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "transparent",
                  border: "none",
                  borderRadius: "8px",
                  color: "#f44336",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  fontWeight: "500",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(244, 67, 54, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Navbar;
