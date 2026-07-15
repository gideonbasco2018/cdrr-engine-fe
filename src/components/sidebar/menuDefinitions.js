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
      icon: "📡", 
      label: "Monitoring",
      roles: ["User", "Admin", "SuperAdmin"],
    },
  ],

  cdrReportsItems: [
    {
      id: "reports",
      icon: "🗃️",
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
      id: "appCorrection",
      icon: "✍️",
      label: "CPR Modification Services",
      roles: ["User", "Admin", "SuperAdmin"],
    },
  ],

  otherDatabaseItems: [
      {
        id: "fda-verification",
        icon: "🔎", 
        label: "FDA Verification Portal",
        roles: ["User", "Admin", "SuperAdmin"],
      },
      {
        id: "cdrr-inspector-reports",
        icon: "📑", 
        label: "CDRR Inspection Reports",
        roles: ["User", "Admin", "SuperAdmin"],
      },
  ],

  toolsItems: [
      { id: "doctrack-magic", icon: "📦", label: "Doctrack (Bulk Upload)", roles: ["User","Admin","SuperAdmin"] },
      { id: "records-report", icon: "🗂️", label: "Records List", roles: ["User","Admin","SuperAdmin"] },
      { id: "document-rename", icon: "📄", label: "Document Rename", roles: ["User","Admin","SuperAdmin"] },
      { id: "upload-document", icon: "📤", label: "Upload Document", roles: ["User","Admin","SuperAdmin"] },
      { id: "bulk-folder-document-upload", icon: "📚", label: "Batch Folder Upload", roles: ["User","Admin","SuperAdmin"] },
  ],

  administrationItems: [
      { id: "access", icon: "🔐", label: "Access Management", roles: ["Admin","SuperAdmin"] },
      { id: "users", icon: "👥", label: "User Management", roles: ["Admin","SuperAdmin"] },
      { id: "settings", icon: "⚙️", label: "Settings", roles: ["SuperAdmin"] },
      { id: "lead-assignments", icon: "🔗", label: "Lead Assignment", roles: ["User","Admin","SuperAdmin"] },
      { id: "target-assignments", icon: "🎯", label: "Target Assignment", roles: ["User","Admin","SuperAdmin"] },
  ],

  supportItems: [
      { id: "announcements", icon: "📢", label: "Announcements", roles: ["User","Admin","SuperAdmin"] },
      { id: "support", icon: "🛠️", label: "Support", roles: ["User","Admin","SuperAdmin"] },
  ],
};