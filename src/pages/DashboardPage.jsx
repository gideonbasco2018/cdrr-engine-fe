// FILE: src/pages/DashboardPage.jsx
// Shell: hosts the impersonation banner/prompt (shared across both
// dashboards) and a sub-sidebar that switches between the Main Dashboard
// (licensing unit) and the GMP Dashboard (GMP taskforce unit).
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { makeUI } from "../components/dashboard/utils";
import {
  isImpersonating,
  getImpersonatedName,
  getImpersonatedUsername,
  getImpersonatedUserId,
  stopImpersonation,
} from "../api/auth";
import { FB } from "../components/dashboard/constants";
import TawkChat from "../components/TawkChat";
import LicensingDashboardView from "./dashboard/LicensingDashboardView";
import GMPDashboardView from "./dashboard/GMPDashboardView";

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// ─── Impersonation Banner ─────────────────────────────────────────────────────
function ImpersonationPrompt({ ui, onClose }) {
  const name = getImpersonatedName();
  const username = getImpersonatedUsername();
  const userId = getImpersonatedUserId();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9000,
        backdropFilter: "blur(6px)",
        fontFamily: font,
      }}
    >
      <div
        style={{
          background: ui.cardBg,
          border: `2px solid ${FB}`,
          borderRadius: 16,
          width: 420,
          maxWidth: "92vw",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: FB,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              flexShrink: 0,
            }}
          >
            👁
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.8)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Impersonation Mode Active
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: 700,
                color: "#fff",
              }}
            >
              Viewing as {name}
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          <div
            style={{
              background: `${FB}10`,
              border: `1px solid ${FB}30`,
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "User ID", value: `#${userId}` },
                { label: "Username", value: username },
                { label: "Full Name", value: name },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: ui.textMuted,
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: "0.82rem",
                      color: ui.textPrimary,
                      fontWeight: 700,
                      fontFamily: label === "User ID" ? "monospace" : "inherit",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: "#fff8e7",
              border: "1px solid #f59e0b40",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.78rem",
                color: "#92400e",
                lineHeight: 1.5,
              }}
            >
              ⚠️ You are currently{" "}
              <strong>viewing this dashboard as {name}</strong>. All data shown
              reflects their account perspective.{" "}
              <strong>No changes will be made</strong> to their account.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 8,
              border: "none",
              background: FB,
              color: "#fff",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            ✓ I Understand — Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Impersonation Top Bar ────────────────────────────────────────────────────
function ImpersonationBar({ ui, onStop }) {
  const name = getImpersonatedName();
  const username = getImpersonatedUsername();
  const userId = getImpersonatedUserId();

  return (
    <div
      style={{
        background: `${FB}15`,
        border: `1.5px solid ${FB}`,
        borderRadius: 10,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontFamily: font,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: "1.1rem" }}>👁</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: FB }}
        >
          Impersonation Mode — Viewing as{" "}
          <span style={{ color: ui.textPrimary }}>{name}</span>
        </p>
        <p style={{ margin: 0, fontSize: "0.7rem", color: ui.textMuted }}>
          User ID:{" "}
          <strong style={{ fontFamily: "monospace" }}>#{userId}</strong> ·
          Username: <strong>{username}</strong>
        </p>
      </div>
      <button
        onClick={onStop}
        style={{
          padding: "6px 14px",
          fontSize: "0.78rem",
          fontWeight: 700,
          borderRadius: 7,
          border: "1.5px solid #e02020",
          background: "#fff1f2",
          color: "#e02020",
          cursor: "pointer",
          fontFamily: font,
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        ✕ Stop Impersonation
      </button>
    </div>
  );
}

// ─── Sub-sidebar nav item ─────────────────────────────────────────────────────
function DashboardNavItem({ label, subtitle, active, onClick, ui, darkMode }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "7px 10px 7px 12px",
        borderRadius: "0 6px 6px 0",
        borderLeft: `3px solid ${active ? "#6d94ff" : "transparent"}`,
        background: active
          ? darkMode
            ? "#2b2b2b"
            : "#f1f1f1"
          : hov
            ? ui.hoverBg
            : "transparent",
        cursor: "pointer",
        transition: "all 0.12s",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        margin: "1px 6px 1px 0",
      }}
    >
      <span
        style={{
          fontSize: "0.8rem",
          fontWeight: active ? 600 : 400,
          color: active
            ? darkMode
              ? "#d8d8d8"
              : "#3d3d3d"
            : hov
              ? ui.textPrimary
              : ui.textSub,
          lineHeight: 1.2,
          transition: "color 0.12s",
        }}
      >
        {label}
      </span>
      {subtitle && (
        <span
          style={{ fontSize: "0.67rem", color: ui.textMuted, lineHeight: 1.2 }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}

// ─── Sub-sidebar: collapsible "Dashboards" rail ───────────────────────────────
// Same collapse/expand pattern as the tasks page Quick Filters sidebar:
// a thin icon rail when closed, a labelled panel when open.
function DashboardSubSidebar({
  open,
  setOpen,
  navItems,
  activeDashboard,
  setActiveDashboard,
  ui,
  darkMode,
}) {
  const iconBtn = (onClick, title, children) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 24,
        height: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: `1px solid ${ui.cardBorder}`,
        borderRadius: 6,
        cursor: "pointer",
        color: ui.textMuted,
        fontSize: "0.7rem",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = ui.hoverBg;
        e.currentTarget.style.color = ui.textPrimary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = ui.textMuted;
      }}
    >
      {children}
    </button>
  );

  // ── Collapsed rail ──
  if (!open) {
    return (
      <div
        style={{
          width: 34,
          minWidth: 34,
          height: "100%",
          background: ui.sidebarBg,
          borderRight: `1px solid ${ui.cardBorder}`,
          padding: "0.7rem 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.8rem",
          flexShrink: 0,
        }}
      >
        {iconBtn(() => setOpen(true), "Show dashboards", "▶")}
        {navItems.map((item) => (
          <span
            key={item.key}
            title={item.label}
            aria-hidden="true"
            style={{
              fontSize: "0.85rem",
              lineHeight: 1,
              opacity: activeDashboard === item.key ? 1 : 0.3,
              userSelect: "none",
            }}
          >
            {item.icon}
          </span>
        ))}
      </div>
    );
  }

  // ── Expanded panel ──
  return (
    <div
      style={{
        width: 190,
        minWidth: 190,
        height: "100%",
        background: ui.sidebarBg,
        borderRight: `1px solid ${ui.cardBorder}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 10px 6px 14px",
          flexShrink: 0,
        }}
      >
        <p
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            color: ui.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            margin: 0,
          }}
        >
          Dashboards
        </p>
        {iconBtn(() => setOpen(false), "Hide dashboards", "◀")}
      </div>
      <div
        style={{
          height: "0.5px",
          background: ui.cardBorder,
          margin: "0 8px 10px",
        }}
      />

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "0 6px 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.1rem",
        }}
      >
        {navItems.map((item) => (
          <DashboardNavItem
            key={item.key}
            label={item.label}
            subtitle={item.subtitle}
            active={activeDashboard === item.key}
            onClick={() => setActiveDashboard(item.key)}
            ui={ui}
            darkMode={darkMode}
          />
        ))}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function DashboardPage({ darkMode: darkModeProp }) {
  const [internalDark, setInternalDark] = useState(true);
  const darkMode = darkModeProp !== undefined ? darkModeProp : internalDark;
  const ui = useMemo(() => makeUI(darkMode), [darkMode]);

  // ── Sub-sidebar (collapsible rail — starts closed) ────────────────────────
  const [activeDashboard, setActiveDashboard] = useState("main");
  const [subSidebarOpen, setSubSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem("dashboardSubSidebarOpen") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("dashboardSubSidebarOpen", String(subSidebarOpen));
    } catch {}
  }, [subSidebarOpen]);

  // ── Impersonation state ───────────────────────────────────────────────────
  const [showImpersonationPrompt, setShowImpersonationPrompt] = useState(() =>
    isImpersonating(),
  );
  const [impersonationActive, setImpersonationActive] = useState(() =>
    isImpersonating(),
  );

  const navigate = useNavigate();

  const handleStopImpersonation = () => {
    stopImpersonation();
    setImpersonationActive(false);
    setShowImpersonationPrompt(false);
    navigate("/admin/monitoring", { state: { tab: "users" } });
  };

  // ── Mobile ────────────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // ── Global CSS (shared skeleton-loader keyframes / scrollbar) ─────────────
  useEffect(() => {
    const id = "cdrr-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = `.cdrr-scroll::-webkit-scrollbar{width:7px}.cdrr-scroll::-webkit-scrollbar-track{background:transparent}.cdrr-scroll::-webkit-scrollbar-thumb{background:#3a3b3c;border-radius:99px}.cdrr-scroll::-webkit-scrollbar-thumb:hover{background:#555}.cdrr-scroll{scrollbar-width:thin;scrollbar-color:#3a3b3c transparent}@keyframes cdrrPulse{0%,100%{opacity:1}50%{opacity:0.4}}`;
      document.head.appendChild(s);
    }
    return () => {
      const el = document.getElementById("cdrr-style");
      if (el) el.remove();
    };
  }, []);

  const navItems = [
    {
      key: "main",
      label: "Main Dashboard",
      subtitle: "Licensing unit",
      icon: "📊",
    },
    {
      key: "gmp",
      label: "GMP Dashboard",
      subtitle: "GMP taskforce unit",
      icon: "🏭",
    },
  ];

  return (
    <>
      <TawkChat />
      {showImpersonationPrompt && (
        <ImpersonationPrompt
          ui={ui}
          onClose={() => setShowImpersonationPrompt(false)}
        />
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          fontFamily: font,
        }}
      >
        {impersonationActive && (
          <div style={{ padding: "10px 15px 0" }}>
            <ImpersonationBar ui={ui} onStop={handleStopImpersonation} />
          </div>
        )}

        <div
          className="cdrr-scroll"
          style={{
            display: "flex",
            flex: "1 1 0",
            minHeight: 0,
            overflowY: "scroll",
            overflowX: "hidden",
          }}
        >
          {/* ── Sub-sidebar ── */}
          {!isMobile && (
            <div
              style={{
                flexShrink: 0,
                position: "sticky",
                top: 0,
                alignSelf: "stretch",
                maxHeight: "100vh",
                overflow: "hidden",
              }}
            >
              <DashboardSubSidebar
                open={subSidebarOpen}
                setOpen={setSubSidebarOpen}
                navItems={navItems}
                activeDashboard={activeDashboard}
                setActiveDashboard={setActiveDashboard}
                ui={ui}
                darkMode={darkMode}
              />
            </div>
          )}

          {/* ── Main content area ── */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: isMobile ? "12px" : "16px",
              paddingBottom: 120,
              boxSizing: "border-box",
            }}
          >
            {isMobile && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginBottom: 14,
                  padding: 3,
                  borderRadius: 8,
                  background: ui.inputBg,
                  border: `1px solid ${ui.cardBorder}`,
                }}
              >
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveDashboard(item.key)}
                    style={{
                      flex: 1,
                      padding: "7px 0",
                      borderRadius: 6,
                      border: "none",
                      background:
                        activeDashboard === item.key ? FB : "transparent",
                      color: activeDashboard === item.key ? "#fff" : ui.textSub,
                      fontSize: "0.76rem",
                      fontWeight: activeDashboard === item.key ? 700 : 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {activeDashboard === "main" ? (
              <LicensingDashboardView
                darkMode={darkMode}
                ui={ui}
                isMobile={isMobile}
              />
            ) : (
              <GMPDashboardView
                darkMode={darkMode}
                ui={ui}
                isMobile={isMobile}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
