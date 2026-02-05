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
  ],

  workflowItems: [
    {
      id: "for-decking",
      icon: "📥",
      label: "For Decking",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "for-evaluation",
      icon: "📋",
      label: "For Evaluation",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "for-compliance",
      icon: "✓",
      label: "For Compliance",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "for-checking",
      icon: "🔍",
      label: "For Checking",
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
      label: "For QA",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "for-director-signature",
      icon: "✍️",
      label: "For Director Signature",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "for-releasing",
      icon: "📤",
      label: "For Releasing",
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