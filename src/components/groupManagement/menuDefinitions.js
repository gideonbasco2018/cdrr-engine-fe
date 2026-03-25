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
  { id: "for-evaluation", label: "Evaluation", icon: "📊", category: "Workflow" },
  { id: "for-compliance", label: "For Compliance", icon: "⚠️", category: "Workflow" },
  { id: "for-checking", label: "Checking", icon: "🔍", category: "Workflow" },
  { id: "supervisor", label: "Supervisor", icon: "👔", category: "Workflow" },
  { id: "for-qa", label: "QA", icon: "✅", category: "Workflow" },
  { id: "for-director-signature", label: "Director Signature", icon: "🖊️", category: "Workflow" },
  { id: "for-releasing", label: "Releasing", icon: "📤", category: "Workflow" },

  // Other Database
  { id: "fda-verification", label: "FDA Verification Portal", icon: "🔎", category: "Other Database" },
  { id: "cdrr-inspector-reports", label: "CDRR Inspection Reports", icon: "📑", category: "Other Database" },
  { id: "doctrack-magic", label: "Doctrack (Bulk Upload)", icon: "📦", category: "Other Database" },
  { id: "records-report", label: "Records List", icon: "🗂️", category: "Other Database" },

  // Platform
  { id: "announcements", label: "Announcements", icon: "📢", category: "Platform" },
  { id: "support", label: "Support", icon: "🛠️", category: "Platform" },
];