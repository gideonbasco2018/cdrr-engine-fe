// FILE: src/pages/ClinicalTrialPage.jsx
import { useState, useMemo } from "react";
import { getColorScheme } from "../components/reports/utils.js";

/* ------------------------------------------------------------------
   STATIC DATA — palitan na lang ng API call kapag ready na ang backend.
   Kapareho ng shape na inaasahan ng ibang reports pages (DeckingPage,
   DataTable) para madali na lang i-swap sa fetch() paglaon.
------------------------------------------------------------------- */
const CLINICAL_TRIALS = [
  {
    id: 1,
    dtn: "20260617134106",
    protocolNo: "CT-2026-0148",
    applicationType: "Initial",
    processingType: "Regular (2026)",
    appStatus: "In Progress",
    phase: "Phase III",
    studyTitle:
      "Randomized, Double-Blind Study of Rivaroxaban in Adults with Non-Valvular Atrial Fibrillation",
    sponsor: "Fresenius Kabi Philippines, Inc.",
    investigator: "Dr. Ma. Teresa Villanueva",
    site: "Philippine General Hospital, Manila",
    subjects: 240,
    dateFiled: "2026-06-17",
    expiry: "2027-06-16",
  },
  {
    id: 2,
    dtn: "20260628144906",
    protocolNo: "CT-2026-0151",
    applicationType: "Amendment",
    processingType: "Regular (2026)",
    appStatus: "For Evaluation",
    phase: "Phase II",
    studyTitle:
      "Open-Label Evaluation of Nebulized Amikacin for Ventilator-Associated Pneumonia",
    sponsor: "Camber Pharmaceuticals, Inc.",
    investigator: "Dr. Alfonso R. Dizon",
    site: "St. Luke's Medical Center, Quezon City",
    subjects: 96,
    dateFiled: "2026-06-28",
    expiry: "2027-06-27",
  },
  {
    id: 3,
    dtn: "20260628144819",
    protocolNo: "CT-2026-0152",
    applicationType: "Initial",
    processingType: "Regular (2026)",
    appStatus: "Approved",
    phase: "Phase I",
    studyTitle:
      "First-in-Human Dose Escalation of MB-4412 in Healthy Filipino Volunteers",
    sponsor: "AMB HK Enterprises Inc.",
    investigator: "Dr. Celina Ong-Mercado",
    site: "Makati Medical Center, Makati",
    subjects: 48,
    dateFiled: "2026-06-28",
    expiry: "2027-06-27",
  },
  {
    id: 4,
    dtn: "20260611134032",
    protocolNo: "CT-2026-0139",
    applicationType: "Renewal",
    processingType: "Regular (2026)",
    appStatus: "In Progress",
    phase: "Phase III",
    studyTitle:
      "Long-Term Safety Extension of Dupilumab in Moderate-to-Severe Atopic Dermatitis",
    sponsor: "Johnson & Johnson",
    investigator: "Dr. Rafael S. Bautista",
    site: "The Medical City, Pasig",
    subjects: 310,
    dateFiled: "2026-06-11",
    expiry: "2027-06-10",
  },
  {
    id: 5,
    dtn: "20260522113343",
    protocolNo: "CT-2026-0120",
    applicationType: "Initial",
    processingType: "Expedited",
    appStatus: "Disapproved",
    phase: "Phase II",
    studyTitle:
      "Comparative Study of Two Dosing Regimens of Artemether-Lumefantrine in Pediatric Malaria",
    sponsor: "Camber Pharmaceuticals, Inc.",
    investigator: "Dr. Joselito Ramos",
    site: "Southern Philippines Medical Center, Davao",
    subjects: 128,
    dateFiled: "2026-05-22",
    expiry: "—",
  },
  {
    id: 6,
    dtn: "20260522113400",
    protocolNo: "CT-2026-0121",
    applicationType: "Amendment",
    processingType: "Regular (2026)",
    appStatus: "For Evaluation",
    phase: "Phase IV",
    studyTitle:
      "Post-Marketing Surveillance of Tenofovir Alafenamide in Chronic Hepatitis B",
    sponsor: "Fresenius Kabi Philippines, Inc.",
    investigator: "Dr. Hannah Lim-Soriano",
    site: "National Kidney and Transplant Institute, Quezon City",
    subjects: 540,
    dateFiled: "2026-05-22",
    expiry: "2027-05-21",
  },
  {
    id: 7,
    dtn: "20260710145232",
    protocolNo: "CT-2026-0163",
    applicationType: "Initial",
    processingType: "Expedited",
    appStatus: "Approved",
    phase: "Phase III",
    studyTitle:
      "Efficacy of a Quadrivalent Dengue Vaccine Candidate in Endemic Regions",
    sponsor: "Camber Pharmaceuticals, Inc.",
    investigator: "Dr. Noel V. Agcaoili",
    site: "Research Institute for Tropical Medicine, Muntinlupa",
    subjects: 1200,
    dateFiled: "2026-07-10",
    expiry: "2027-07-09",
  },
  {
    id: 8,
    dtn: "20260629142114",
    protocolNo: "CT-2026-0158",
    applicationType: "Withdrawal",
    processingType: "Regular (2026)",
    appStatus: "Withdrawn",
    phase: "Phase II",
    studyTitle:
      "Adjunctive Metformin in Treatment-Naive Pulmonary Tuberculosis",
    sponsor: "AMB HK Enterprises Inc.",
    investigator: "Dr. Patricia Gutierrez",
    site: "Lung Center of the Philippines, Quezon City",
    subjects: 84,
    dateFiled: "2026-06-29",
    expiry: "—",
  },
  {
    id: 9,
    dtn: "20260528162801",
    protocolNo: "CT-2026-0131",
    applicationType: "Initial",
    processingType: "Regular (2026)",
    appStatus: "In Progress",
    phase: "Phase I",
    studyTitle:
      "Bioequivalence of Generic Sofosbuvir 400 mg Film-Coated Tablets",
    sponsor: "Camber Pharmaceuticals, Inc.",
    investigator: "Dr. Emmanuel Tiongson",
    site: "UP–PGH Clinical Trial Unit, Manila",
    subjects: 36,
    dateFiled: "2026-05-28",
    expiry: "2027-05-27",
  },
  {
    id: 10,
    dtn: "20260629142850",
    protocolNo: "CT-2026-0159",
    applicationType: "Renewal",
    processingType: "Regular (2026)",
    appStatus: "Approved",
    phase: "Phase IV",
    studyTitle:
      "Registry Study on Real-World Use of Insulin Glargine in Type 2 Diabetes",
    sponsor: "Johnson & Johnson",
    investigator: "Dr. Leandro Mapa",
    site: "Chong Hua Hospital, Cebu City",
    subjects: 760,
    dateFiled: "2026-06-29",
    expiry: "2027-06-28",
  },
  {
    id: 11,
    dtn: "20260415101233",
    protocolNo: "CT-2026-0094",
    applicationType: "Initial",
    processingType: "Expedited",
    appStatus: "For Evaluation",
    phase: "Phase II",
    studyTitle:
      "Intravenous Iron Isomaltoside for Anemia in Chronic Kidney Disease",
    sponsor: "Fresenius Kabi Philippines, Inc.",
    investigator: "Dr. Beatriz Nolasco",
    site: "Manila Doctors Hospital, Manila",
    subjects: 150,
    dateFiled: "2026-04-15",
    expiry: "2027-04-14",
  },
  {
    id: 12,
    dtn: "20260402093015",
    protocolNo: "CT-2026-0088",
    applicationType: "Amendment",
    processingType: "Regular (2026)",
    appStatus: "In Progress",
    phase: "Phase III",
    studyTitle:
      "Safety and Immunogenicity of a Booster Pneumococcal Conjugate Vaccine in Older Adults",
    sponsor: "AMB HK Enterprises Inc.",
    investigator: "Dr. Gerardo Panlilio",
    site: "Vicente Sotto Memorial Medical Center, Cebu",
    subjects: 420,
    dateFiled: "2026-04-02",
    expiry: "2027-04-01",
  },
];

const ITEM_DOT_COLORS = [
  "#7c3aed",
  "#0891b2",
  "#059669",
  "#b45309",
  "#f97316",
  "#be185d",
  "#6366f1",
  "#e11d48",
];

/* ── SidebarSection — kopya ng pattern galing DeckingPage.jsx ── */
function SidebarSection({
  title,
  groupColor,
  items,
  activeItem,
  onItemClick,
  colors,
  darkMode,
  totalCount,
}) {
  const [isOpen, setIsOpen] = useState(true);
  const activeBg = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.055)";
  const activeBorder = darkMode ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.1)";
  const hoverBg = darkMode ? "#161616" : "#f0f0f0";

  return (
    <div style={{ marginBottom: 2 }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 4px 3px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: groupColor,
              flexShrink: 0,
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: "0.6rem",
              fontWeight: 700,
              color: colors.textTertiary,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {title}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              fontSize: "0.58rem",
              color: colors.textTertiary,
              background: darkMode ? "#1a1a1a" : "#e8e8e8",
              borderRadius: 4,
              padding: "1px 5px",
              fontWeight: 600,
            }}
          >
            {items.length}
          </span>
          <svg
            width="8"
            height="8"
            viewBox="0 0 10 10"
            style={{
              transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 0.2s",
              flexShrink: 0,
            }}
          >
            <polyline
              points="1,3 5,7 9,3"
              fill="none"
              stroke={colors.textTertiary}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            marginBottom: 2,
          }}
        >
          {/* All option */}
          <div
            onClick={() => onItemClick(null)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "3px 6px",
              borderRadius: 5,
              cursor: "pointer",
              background: activeItem === null ? activeBg : "transparent",
              border: `0.5px solid ${activeItem === null ? activeBorder : "transparent"}`,
            }}
            onMouseEnter={(e) => {
              if (activeItem !== null)
                e.currentTarget.style.background = hoverBg;
            }}
            onMouseLeave={(e) => {
              if (activeItem !== null)
                e.currentTarget.style.background = "transparent";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: groupColor,
                  opacity: 0.5,
                  flexShrink: 0,
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: activeItem === null ? 600 : 400,
                  color:
                    activeItem === null
                      ? colors.textPrimary
                      : colors.textSecondary,
                }}
              >
                All
              </span>
            </div>
            <span
              style={{
                fontSize: "0.6rem",
                fontWeight: 600,
                color:
                  activeItem === null
                    ? colors.textPrimary
                    : colors.textTertiary,
                background: darkMode ? "#1a1a1a" : "#e8e8e8",
                borderRadius: 99,
                padding: "1px 6px",
                minWidth: 18,
                textAlign: "center",
              }}
            >
              {totalCount}
            </span>
          </div>

          {/* Individual items */}
          {items.map((item, idx) => {
            const isActive = activeItem === item.value;
            const dot = ITEM_DOT_COLORS[idx % ITEM_DOT_COLORS.length];
            return (
              <div
                key={item.value}
                onClick={() => onItemClick(item.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "3px 6px",
                  borderRadius: 5,
                  cursor: "pointer",
                  background: isActive ? activeBg : "transparent",
                  border: `0.5px solid ${isActive ? activeBorder : "transparent"}`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = hoverBg;
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: dot,
                      flexShrink: 0,
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive
                        ? colors.textPrimary
                        : colors.textSecondary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.value}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    color: isActive ? colors.textPrimary : colors.textTertiary,
                    background: darkMode ? "#1a1a1a" : "#e8e8e8",
                    borderRadius: 99,
                    padding: "1px 6px",
                    minWidth: 18,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.count}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          height: "0.5px",
          background: colors.cardBorder,
          margin: "4px 2px 3px",
        }}
      />
    </div>
  );
}

/* ── Badges — kopya ng visual language ng DataTable.jsx ── */
const STATUS_MAP = {
  "In Progress": {
    bg: "linear-gradient(135deg,#6b7280,#4b5563)",
    sh: "rgba(107,114,128,0.3)",
    icon: "⏳",
  },
  "For Evaluation": {
    bg: "linear-gradient(135deg,#eab308,#ca8a04)",
    sh: "rgba(234,179,8,0.3)",
    icon: "⏸",
  },
  Approved: {
    bg: "linear-gradient(135deg,#10b981,#059669)",
    sh: "rgba(16,185,129,0.3)",
    icon: "✓",
  },
  Disapproved: {
    bg: "linear-gradient(135deg,#ef4444,#dc2626)",
    sh: "rgba(239,68,68,0.3)",
    icon: "✗",
  },
  Withdrawn: {
    bg: "linear-gradient(135deg,#6b7280,#4b5563)",
    sh: "rgba(107,114,128,0.3)",
    icon: "🚫",
  },
};

const PHASE_COLORS = {
  "Phase I": "linear-gradient(135deg,#0ea5e9,#0284c7)",
  "Phase II": "linear-gradient(135deg,#8b5cf6,#7c3aed)",
  "Phase III": "linear-gradient(135deg,#d946ef,#c026d3)",
  "Phase IV": "linear-gradient(135deg,#14b8a6,#0d9488)",
};

function StatusBadge({ status }) {
  const c = STATUS_MAP[status] || {
    bg: "linear-gradient(135deg,#6b7280,#4b5563)",
    sh: "rgba(107,114,128,0.3)",
    icon: "•",
  };
  return (
    <span
      style={{
        padding: "0.3rem 0.7rem",
        background: c.bg,
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.55rem",
        fontWeight: "700",
        letterSpacing: "0.5px",
        boxShadow: `0 2px 8px ${c.sh}`,
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        whiteSpace: "nowrap",
      }}
    >
      <span>{c.icon}</span>
      {status}
    </span>
  );
}

function PhaseBadge({ phase }) {
  return (
    <span
      style={{
        padding: "0.25rem 0.6rem",
        background:
          PHASE_COLORS[phase] || "linear-gradient(135deg,#6b7280,#4b5563)",
        color: "#fff",
        borderRadius: "6px",
        fontSize: "0.55rem",
        fontWeight: "600",
        display: "inline-flex",
        alignItems: "center",
        whiteSpace: "nowrap",
      }}
    >
      {phase}
    </span>
  );
}

function DTNBadge({ dtn }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.3rem 0.7rem",
        background: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.55rem",
        fontWeight: "700",
        letterSpacing: "0.5px",
        boxShadow: "0 2px 8px rgba(8,8,8,0.3)",
        whiteSpace: "nowrap",
      }}
    >
      {dtn}
    </span>
  );
}

const TABS = [
  { id: "all", label: "All Trials", icon: "🧪" },
  { id: "ongoing", label: "Ongoing", icon: "⏳" },
  { id: "completed", label: "Completed", icon: "✅" },
];

function ClinicalTrialPage({ darkMode }) {
  const colors = getColorScheme(darkMode);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [appTypeFilter, setAppTypeFilter] = useState(null);
  const [phaseFilter, setPhaseFilter] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const iconBtn = (onClick, title, children) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: "26px",
        height: "26px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "6px",
        cursor: "pointer",
        color: colors.textTertiary,
        fontSize: "0.7rem",
        transition: "all 0.2s ease",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = darkMode ? "#1f1f1f" : "#e5e5e5";
        e.currentTarget.style.color = colors.textPrimary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = colors.textTertiary;
      }}
    >
      {children}
    </button>
  );

  const statsData = useMemo(
    () => ({
      total: CLINICAL_TRIALS.length,
      ongoing: CLINICAL_TRIALS.filter((t) => t.appStatus === "In Progress")
        .length,
      completed: CLINICAL_TRIALS.filter((t) => t.appStatus === "Approved")
        .length,
    }),
    [],
  );

  const appTypeItems = useMemo(() => {
    const counts = {};
    CLINICAL_TRIALS.forEach((t) => {
      counts[t.applicationType] = (counts[t.applicationType] || 0) + 1;
    });
    return Object.entries(counts).map(([value, count]) => ({ value, count }));
  }, []);

  const phaseItems = useMemo(() => {
    const counts = {};
    CLINICAL_TRIALS.forEach((t) => {
      counts[t.phase] = (counts[t.phase] || 0) + 1;
    });
    return Object.entries(counts).map(([value, count]) => ({ value, count }));
  }, []);

  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return CLINICAL_TRIALS.filter((t) => {
      if (activeTab === "ongoing" && t.appStatus !== "In Progress")
        return false;
      if (activeTab === "completed" && t.appStatus !== "Approved") return false;
      if (appTypeFilter !== null && t.applicationType !== appTypeFilter)
        return false;
      if (phaseFilter !== null && t.phase !== phaseFilter) return false;
      if (!q) return true;
      return [
        t.dtn,
        t.protocolNo,
        t.studyTitle,
        t.sponsor,
        t.investigator,
        t.site,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [activeTab, appTypeFilter, phaseFilter, searchTerm]);

  const totalRecords = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const page = Math.min(currentPage, totalPages);
  const start = (page - 1) * rowsPerPage;
  const pageRows = filteredData.slice(start, start + rowsPerPage);
  const indexOfFirstRow = totalRecords === 0 ? 0 : start + 1;
  const indexOfLastRow = Math.min(start + rowsPerPage, totalRecords);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
    setSelectedRows([]);
    setAppTypeFilter(null);
    setPhaseFilter(null);
  };

  const handleSelectAll = () => {
    const pageIds = pageRows.map((r) => r.id);
    const allSelected = pageIds.every((id) => selectedRows.includes(id));
    setSelectedRows(
      allSelected
        ? selectedRows.filter((id) => !pageIds.includes(id))
        : [...new Set([...selectedRows, ...pageIds])],
    );
  };

  const handleSelectRow = (id) =>
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );

  const activeFilterCount =
    (appTypeFilter !== null ? 1 : 0) + (phaseFilter !== null ? 1 : 0);

  const columns = [
    { key: "processingType", label: "Processing Type" },
    { key: "appStatus", label: "Status" },
    { key: "dtn", label: "DTN" },
    { key: "protocolNo", label: "Protocol No." },
    { key: "phase", label: "Phase" },
    { key: "studyTitle", label: "Study Title", width: "260px" },
    { key: "sponsor", label: "Sponsor" },
    { key: "investigator", label: "Investigator" },
    { key: "site", label: "Site" },
    { key: "subjects", label: "Subjects" },
    { key: "dateFiled", label: "Date Filed" },
    { key: "expiry", label: "Expiry" },
  ];

  const thStyle = {
    padding: "0.45rem 0.6rem",
    textAlign: "left",
    fontSize: "0.55rem",
    fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: `1px solid ${colors.tableBorder}`,
    whiteSpace: "nowrap",
    background: colors.tableBg,
  };

  const tdStyle = {
    padding: "0.4rem 0.6rem",
    fontSize: "0.55rem",
    color: colors.tableText,
    borderBottom: `1px solid ${colors.tableBorder}`,
    whiteSpace: "normal",
    wordBreak: "break-word",
  };

  const renderCell = (col, row) => {
    switch (col.key) {
      case "dtn":
        return <DTNBadge dtn={row.dtn} />;
      case "appStatus":
        return <StatusBadge status={row.appStatus} />;
      case "phase":
        return <PhaseBadge phase={row.phase} />;
      case "processingType":
        return (
          <span
            style={{
              padding: "0.25rem 0.6rem",
              background: "linear-gradient(135deg,#2196F3,#1976D2)",
              color: "#fff",
              borderRadius: "6px",
              fontSize: "0.55rem",
              fontWeight: "600",
              whiteSpace: "nowrap",
              display: "inline-flex",
            }}
          >
            {row.processingType}
          </span>
        );
      case "subjects":
        return row.subjects.toLocaleString();
      default:
        return row[col.key];
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ── Sidebar ── */}
      <div
        style={{
          width: isSidebarOpen ? "190px" : "44px",
          minWidth: isSidebarOpen ? "190px" : "44px",
          background: darkMode ? "#0a0a0a" : "#ffffff",
          borderRight: `1px solid ${colors.cardBorder}`,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 0.25s ease, min-width 0.25s ease",
        }}
      >
        {isSidebarOpen ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.6rem 0.75rem 0.6rem 0.85rem",
                borderBottom: `1px solid ${colors.cardBorder}`,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                }}
              >
                <span style={{ fontSize: "0.85rem" }}>🧪</span>
                <h2
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: colors.textPrimary,
                    margin: 0,
                  }}
                >
                  Quick Filters
                </h2>
                {activeFilterCount > 0 && (
                  <span
                    style={{
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      background: "#6366f1",
                      color: "#fff",
                      borderRadius: 99,
                      padding: "1px 6px",
                    }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </div>
              {iconBtn(() => setIsSidebarOpen(false), "Hide filters", "◀")}
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                padding: "0.6rem 0.6rem 1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              <SidebarSection
                title="Application Type"
                groupColor="#6366f1"
                items={appTypeItems}
                activeItem={appTypeFilter}
                onItemClick={(v) => {
                  setAppTypeFilter(v);
                  setCurrentPage(1);
                }}
                colors={colors}
                darkMode={darkMode}
                totalCount={CLINICAL_TRIALS.length}
              />
              <SidebarSection
                title="Study Phase"
                groupColor="#0891b2"
                items={phaseItems}
                activeItem={phaseFilter}
                onItemClick={(v) => {
                  setPhaseFilter(v);
                  setCurrentPage(1);
                }}
                colors={colors}
                darkMode={darkMode}
                totalCount={CLINICAL_TRIALS.length}
              />
            </div>
          </>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.85rem",
              padding: "0.75rem 0",
            }}
          >
            {iconBtn(() => setIsSidebarOpen(true), "Show filters", "▶")}
            {activeFilterCount > 0 && (
              <div
                onClick={() => setIsSidebarOpen(true)}
                title={`${activeFilterCount} active filter${activeFilterCount > 1 ? "s" : ""}`}
                style={{
                  width: "18px",
                  height: "18px",
                  background: "#6366f1",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {activeFilterCount}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "0.85rem 1.5rem 0",
            background: colors.pageBg,
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "0.5rem",
              borderBottom: `2px solid ${colors.cardBorder}`,
            }}
          >
            <div style={{ display: "flex", flex: 1, overflowX: "auto" }}>
              {TABS.map((tab) => {
                const count =
                  tab.id === "all"
                    ? statsData.total
                    : tab.id === "ongoing"
                      ? statsData.ongoing
                      : statsData.completed;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    style={{
                      padding: "6px 14px",
                      fontSize: "12px",
                      background: "transparent",
                      border: "none",
                      borderBottom: isActive
                        ? "2px solid #4CAF50"
                        : "2px solid transparent",
                      color: isActive
                        ? colors.textPrimary
                        : colors.textTertiary,
                      fontWeight: isActive ? 600 : 400,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      position: "relative",
                      top: "1px",
                      whiteSpace: "nowrap",
                      transition: "all 0.2s ease",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: "0.82rem" }}>{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "1px 6px",
                        borderRadius: "999px",
                        background: isActive ? "#4CAF50" : colors.badgeBg,
                        color: isActive ? "#fff" : colors.textTertiary,
                        border: `0.5px solid ${isActive ? "#4CAF50" : colors.cardBorder}`,
                        fontWeight: 600,
                        minWidth: "20px",
                        textAlign: "center",
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                paddingLeft: "10px",
                paddingBottom: "4px",
                borderLeft: `1px solid ${colors.cardBorder}`,
              }}
            >
              <button
                style={{
                  padding: "5px 14px",
                  background: "linear-gradient(135deg,#10B981,#059669)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  height: "30px",
                }}
              >
                <span>📥</span>
                <span>Export ({totalRecords})</span>
              </button>
              <button
                style={{
                  padding: "5px 14px",
                  background: darkMode ? "#1f1f1f" : "#e5e5e5",
                  color: colors.textPrimary,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  height: "30px",
                }}
              >
                <span>⬇️</span>
                <span>Download Template</span>
              </button>
              <button
                style={{
                  padding: "5px 14px",
                  background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  height: "30px",
                }}
              >
                <span>⬆️</span>
                <span>Upload New Trial</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.85rem 1.5rem",
            background: colors.pageBg,
          }}
        >
          {/* Search bar */}
          <div
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "12px",
              padding: "0.4rem 0.6rem",
              marginBottom: "0.5rem",
              display: "flex",
              gap: "0.5rem",
            }}
          >
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by DTN, protocol number, sponsor, or investigator"
              style={{
                flex: 1,
                padding: "0.25rem 0.5rem",
                fontSize: "0.65rem",
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "6px",
                color: colors.textPrimary,
                outline: "none",
              }}
            />
          </div>

          {/* Table card */}
          <div
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "12px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "0.75rem 1.25rem",
                borderBottom: `1px solid ${colors.tableBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    color: colors.textPrimary,
                    margin: 0,
                  }}
                >
                  Data
                </h3>
                <span
                  style={{
                    padding: "0.2rem 0.6rem",
                    background: colors.badgeBg,
                    borderRadius: "12px",
                    fontSize: "0.68rem",
                    color: colors.textTertiary,
                    fontWeight: "600",
                  }}
                >
                  {totalRecords} total records
                </span>
              </div>

              {selectedRows.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.4rem 0.85rem",
                    background: colors.badgeBg,
                    borderRadius: "8px",
                  }}
                >
                  <span
                    style={{
                      color: "#4CAF50",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    {selectedRows.length} selected
                  </span>
                </div>
              )}
            </div>

            <div style={{ overflowX: "auto", overflowY: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "1400px",
                }}
              >
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: "40px" }}>
                      <input
                        type="checkbox"
                        checked={
                          pageRows.length > 0 &&
                          pageRows.every((r) => selectedRows.includes(r.id))
                        }
                        onChange={handleSelectAll}
                        style={{
                          width: "16px",
                          height: "16px",
                          cursor: "pointer",
                          accentColor: "#4CAF50",
                        }}
                      />
                    </th>
                    <th
                      style={{ ...thStyle, width: "40px", textAlign: "center" }}
                    >
                      #
                    </th>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        style={{ ...thStyle, minWidth: col.width }}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th
                      style={{ ...thStyle, width: "60px", textAlign: "center" }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length + 3}
                        style={{
                          padding: "2rem",
                          textAlign: "center",
                          color: colors.textTertiary,
                          fontSize: "0.75rem",
                        }}
                      >
                        Walang trials na tumugma sa mga filter.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((row, index) => {
                      const isSelected = selectedRows.includes(row.id);
                      const rowBg = isSelected
                        ? "#4CAF5015"
                        : index % 2 === 0
                          ? colors.tableRowEven
                          : colors.tableRowOdd;
                      return (
                        <tr
                          key={row.id}
                          style={{
                            background: rowBg,
                            borderLeft: isSelected
                              ? "3px solid #4CAF50"
                              : "3px solid transparent",
                          }}
                        >
                          <td
                            style={{
                              padding: "0.65rem 0.85rem",
                              borderBottom: `1px solid ${colors.tableBorder}`,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(row.id)}
                              style={{
                                width: "16px",
                                height: "16px",
                                cursor: "pointer",
                                accentColor: "#4CAF50",
                              }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "0.4rem 0.6rem",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              color: colors.textTertiary,
                              borderBottom: `1px solid ${colors.tableBorder}`,
                              textAlign: "center",
                            }}
                          >
                            {indexOfFirstRow + index}
                          </td>
                          {columns.map((col) => (
                            <td
                              key={col.key}
                              style={{ ...tdStyle, minWidth: col.width }}
                            >
                              {renderCell(col, row)}
                            </td>
                          ))}
                          <td
                            style={{
                              padding: "0.65rem 0.85rem",
                              borderBottom: `1px solid ${colors.tableBorder}`,
                              textAlign: "center",
                            }}
                          >
                            <button
                              style={{
                                padding: "0.4rem",
                                background: "transparent",
                                border: `1px solid ${colors.cardBorder}`,
                                borderRadius: "6px",
                                color: colors.textPrimary,
                                cursor: "pointer",
                                width: "28px",
                                height: "28px",
                              }}
                            >
                              ⋮
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination — kopya ng pattern ng TablePagination */}
            <div
              style={{
                flexShrink: 0,
                borderTop: `1px solid ${colors.tableBorder}`,
                background: colors.cardBg,
                padding: "0.6rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                fontSize: "0.7rem",
                color: colors.textTertiary,
              }}
            >
              <label
                style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                Rows per page
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "0.2rem 0.4rem",
                    background: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "5px",
                    color: colors.textPrimary,
                    fontSize: "0.7rem",
                  }}
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>

              <span style={{ marginLeft: "auto" }}>
                {indexOfFirstRow}–{indexOfLastRow} of {totalRecords}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: "0.2rem 0.5rem",
                  background: "transparent",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "5px",
                  color: colors.textPrimary,
                  cursor: page === 1 ? "not-allowed" : "pointer",
                  opacity: page === 1 ? 0.4 : 1,
                }}
              >
                ‹
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={page === totalPages}
                style={{
                  padding: "0.2rem 0.5rem",
                  background: "transparent",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "5px",
                  color: colors.textPrimary,
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                  opacity: page === totalPages ? 0.4 : 1,
                }}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClinicalTrialPage;
