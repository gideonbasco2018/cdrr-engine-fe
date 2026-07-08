// FILE: src/components/groupManagement/menuDefinitions.js

export const allMenuItems = [
  // Main
  { id: "dashboard", label: "Dashboard", icon: "📊", category: "Main" },
  { id: "monitoring", label: "Monitoring", icon: "📡", category: "Main" },

  // CDRR Reports
  { id: "reports", label: "CDRR Reports", icon: "🗃️", category: "CDRR Reports" },
  { id: "otc-database", label: "OTC Services", icon: "💊", category: "CDRR Reports" },

  // Workflow
  { id: "for-decking", label: "Assignment / Queue", icon: "📥", category: "Workflow" },
  { id: "task", label: "Tasks", icon: "📝", category: "Workflow" },
  { id: "appCorrection", label: "Manual CPR Correction", icon: "📝", category: "Workflow" }, 

   // Other Database
  { id: "fda-verification", label: "FDA Verification Portal", icon: "🔎", category: "Other Database" },
  { id: "cdrr-inspector-reports", label: "CDRR Inspection Reports", icon: "📑", category: "Other Database" },

  // Tools 
  { id: "doctrack-magic", label: "Doctrack (Bulk Upload)", icon: "📦", category: "Tools" },
  { id: "records-report", label: "Records List", icon: "🗂️", category: "Tools" },
  { id: "document-rename", label: "Document Rename", icon: "📄", category: "Tools" },
  { id: "upload-document", label: "Upload Document", icon: "📤", category: "Tools" },
  { id: "bulk-folder-document-upload", label: "Batch Folder Upload", icon: "📚", category: "Tools" },

  // Administration 
  { id: "access", label: "Access Management", icon: "🔐", category: "Administration" },
  { id: "users", label: "User Management", icon: "👥", category: "Administration" },
  { id: "settings", label: "Settings", icon: "⚙️", category: "Administration" },
  { id: "lead-assignments", label: "Lead Assignments", icon: "🔗", category: "Administration" },

  // Support 
  { id: "announcements", label: "Announcements", icon: "📢", category: "Support" },
  { id: "support", label: "Support", icon: "🛠️", category: "Support" },
];