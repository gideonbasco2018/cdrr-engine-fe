// FILE: src/components/sidebar/menuDefinitions.js

export const menuDefinitions = {
  mainMenuItems: [
    {
      id: "dashboard",
      icon: "📊",
      label: "Dashboard",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "monitoring",
      icon: "📡", // improved
      label: "Monitoring",
      roles: ["User", "Admin", "SuperAdmin"],
    },
  ],

  cdrReportsItems: [
    {
      id: "reports",
      icon: "🗃️", // improved
      label: "CDRR Reports",
      roles: ["User", "Admin", "SuperAdmin"],
      comingSoon: false,
    },
    {
      id: "otc-database",
      label: "OTC Services",
      icon: "💊",
      roles: ["User", "Admin", "SuperAdmin"],
    },
  ],

  workflowItems: [
    {
      id: "for-decking",
      icon: "📥",
      label: "Assignment / Queue",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "task",
      icon: "📝",
      label: "Tasks",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "for-evaluation",
      icon: "📊", // improved
      label: "Evaluation",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "for-compliance",
      icon: "⚠️", // improved
      label: "For Compliance", // fixed spacing
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
      icon: "✅", // improved
      label: "QA",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "for-director-signature",
      icon: "🖊️", // improved
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
      icon: "🔎", // refined
      label: "FDA Verification Portal",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "cdrr-inspector-reports",
      icon: "📑", // improved
      label: "CDRR Inspection Reports",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "doctrack-magic",
      icon: "📦", // improved (bulk)
      label: "Doctrack (Bulk Upload)",
      roles: ["User", "Admin", "SuperAdmin"],
    },
    {
      id: "records-report",
      icon: "🗂️", // BEST for records
      label: "Records List", // 👈 recommended change
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
      icon: "🛠️", // improved
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