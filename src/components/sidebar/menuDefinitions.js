// FILE: src/components/sidebar/menuDefinitions.js

export const menuDefinitions = {
  mainMenuItems: [
    {
      id: "dashboard",
      icon: "📊",
      label: "Dashboard",
      roles: ["User", "Admin", "SuperAdmin"],
    },
  ],

  cdrReportsItems: [
    {
      id: "reports",
      icon: "📄",
      label: "Reports",
      roles: ["User", "Admin", "SuperAdmin"],
      comingSoon: false,
    },
    {
      id: "otc-database",
      label: "OTC Database",
      icon: "💊",
      roles: ["User", "Admin", "SuperAdmin"],
    },
  ],

  workflowItems: [
    {
      id: "for-decking",
      icon: "📥",
      label: "Decking",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "for-evaluation",
      icon: "📋",
      label: "Evaluation",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "for-compliance",
      icon: "🗂️",
      label: "For-Compliance",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "for-checking",
      icon: "🔍",
      label: "Checking",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "supervisor",
      icon: "👔",
      label: "Supervisor",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "for-qa",
      icon: "✔️",
      label: "QA",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "for-director-signature",
      icon: "✍️",
      label: "Director Signature",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "for-releasing",
      icon: "📤",
      label: "Releasing",
      roles: ["User", "Admin", "SuperAdmin"],
    },
  ],

  otherDatabaseItems: [
    {
      id: "fda-verification",
      icon: "🔍",
      label: "FDA Verification Portal",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "cdrr-inspector-reports",
      icon: "📋",
      label: "CDRR and Inspector Reports",
      roles: ["User", "Admin", "SuperAdmin"],
    },
  ],

  platformItems: [
    {
      id: "announcements",
      icon: "📢",
      label: "Announcements",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "support",
      icon: "🎧",
      label: "Support",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "access",
      icon: "🔐",
      label: "Access Management",
      roles: ["Admin", "SuperAdmin"],
    },
    {
      id: "users",
      icon: "👥",
      label: "User Management",
      roles: ["Admin", "SuperAdmin"],
    },
    {
      id: "settings",
      icon: "⚙️",
      label: "Settings",
      roles: ["SuperAdmin"],
    },
  ],
};