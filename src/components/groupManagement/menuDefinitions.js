// FILE: src/components/groupManagement/menuDefinitions.js

export const allMenuItems = [
  // Main
  { id: "dashboard", label: "Dashboard", icon: "📊", category: "Main" },
  { id: "monitoring", label: "User's Monitoring", icon: "📈", category: "Main"},
  
  // CDR Reports
  { id: "reports", label: "Reports", icon: "📄", category: "CDRR Reports" },
  { id: "otc-database", label: "OTC Database", icon: "💊", category: "CDRR Reports" }, // ✅ ADD THIS
  
  // Workflow
  { id: "for-decking", label: "For Decking", icon: "📥", category: "Workflow" },
  { id: "task", label: "Task", icon: "📝", category: "Workflow" },
  { id: "for-evaluation", label: "For Evaluation", icon: "📋", category: "Workflow" },
  { id: "for-compliance", label: "For Compliance", icon: "✓", category: "Workflow" },
  { id: "for-checking", label: "For Checking", icon: "🔍", category: "Workflow" },
  { id: "supervisor", label: "Supervisor", icon: "👔", category: "Workflow" },
  { id: "for-qa", label: "For QA", icon: "✔️", category: "Workflow" },
  { id: "for-director-signature", label: "For Director Signature", icon: "✍️", category: "Workflow" },
  { id: "for-releasing", label: "For Releasing", icon: "📤", category: "Workflow" },
  
  // Other Database
  { id: "fda-verification", label: "FDA Verification Portal", icon: "🔍", category: "Other Database" },
  { id: "cdrr-inspector-reports", label: "CDRR and Inspector Reports", icon: "📋", category: "Other Database"},
  { id: "doctrack-magic", label: "Docktrack Magic", icon: "📋", category: "Other Database"},
  
  // Platform
  { id: "announcements", label: "Announcements", icon: "📢", category: "Platform" },
  { id: "support", label: "Support", icon: "🎧", category: "Platform" },
];