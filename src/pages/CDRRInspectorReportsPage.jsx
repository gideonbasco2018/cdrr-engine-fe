import { useState, useEffect, useRef } from "react";
import { getCDRRReports } from "../api/cdrr-reports";
import { getCurrentUser } from "../api/auth";
import ViewDetailsModal from "../components/cdrrInspectorReport/actions/ViewDetailsModal";
import UpdateModal from "../components/cdrrInspectorReport/actions/UpdateModal";
import AddModal from "../components/cdrrInspectorReport/actions/AddModal";

// ─── PERMISSION RESOLVER ─────────────
async function resolvePermissions() {
  try {
    const user = await getCurrentUser(); // ✅ Gamit na ang existing API call
    console.log("[CDRR Permissions] User from API:", user);

    const groups = Array.isArray(user.groups) ? user.groups : [];
    console.log("[CDRR Permissions] Extracted groups:", groups);

    const hasGroup = (targetId, ...targetNames) =>
      groups.some((g) => {
        const idMatch =
          Number(g.id) === targetId || String(g.id) === String(targetId);
        const nameUpper = String(g.name || "")
          .toUpperCase()
          .trim();
        const nameMatch = targetNames.some(
          (n) => nameUpper === String(n).toUpperCase().trim(),
        );
        return idMatch || nameMatch;
      });

    const isCDRR = hasGroup(14, "CDRR");
    const isInspector = hasGroup(10, "INSPECTOR", "FROO", "INSPECTOR/FROO");

    console.log(
      "[CDRR Permissions] Resolution:",
      "\n  isCDRR:",
      isCDRR,
      "\n  isInspector:",
      isInspector,
    );

    const permissions = {
      canViewDetails: true,
      canAdd: isCDRR,
      canUpdate: isCDRR || isInspector,
      canUpdateCDRR: isCDRR,
      canUpdateFROO: isInspector,
    };

    console.log("[CDRR Permissions] Final permissions:", permissions);
    return permissions;
  } catch (e) {
    console.error("[CDRR Permissions] Error:", e);
    return null;
  }
}
// ────────────────────────────────────────────────────────────────────────────

export default function CDRRInspectorReportsPage({ darkMode }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedReport, setSelectedReport] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [dropdownId, setDropdownId] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const [statusFilter, setStatusFilter] = useState("");
  const [catStats, setCatStats] = useState({
    all: 0,
    "NON-PICS": 0,
    PICS: 0,
    "LETTER AND CORRECTION": 0,
    pending_froo: 0, // ✅ bagong count
    pending_cdrr_review: 0, // ✅ bagong count
  });
  const [perms, setPerms] = useState({
    canViewDetails: true,
    canAdd: false,
    canUpdate: false,
    canUpdateCDRR: false,
    canUpdateFROO: false,
  });
  const dropdownRef = useRef(null);

  // ── Resolve permissions on mount ──────────────────────────────────────────
  useEffect(() => {
    async function loadPermissions() {
      const resolved = await resolvePermissions();
      if (resolved) {
        console.log("[CDRR Permissions] Setting permissions state:", resolved);
        setPerms(resolved);
      } else {
        console.warn("[CDRR Permissions] Failed to resolve permissions");
      }
    }

    loadPermissions();
  }, []);

  // ── Colors ─────────────────────────────────────────────────────────────────
  // Light mode replicates the reference screenshot exactly
  const C = darkMode
    ? {
        bg: "#0d0d0d",
        hBg: "#141414",
        card: "#1c1c1c",
        border: "#282828",
        tHeadBg: "#1a1a1a",
        rowHover: "#222",
        txt: "#f0f0f0",
        txt2: "#999",
        txt3: "#555",
        green: "#22c55e",
        orange: "#f59e0b",
        red: "#ef4444",
        blue: "#3b82f6",
        input: "#1c1c1c",
        inputB: "#2e2e2e",
        hover: "#252525",
        frooV: "#8b5cf6",
        frooBg: "#1a0f2e",
        frooLight: "#2d1b4e",
        cdrrO: "#f97316",
        cdrrBg: "#2e1a0f",
        cdrrLight: "#4e2d1b",
        shadow: "0 2px 8px rgba(0,0,0,0.45)",
        dtnBg: "linear-gradient(135deg,#4f46e5,#7c3aed)",
        pill: "#2a2a2a",
        pillTxt: "#888",
      }
    : {
        // ── Exact light-mode match to reference screenshot ──
        bg: "#f4f6fb", // very light blue-gray page bg
        hBg: "#ffffff", // white header
        card: "#ffffff", // white cards
        border: "#e5e9f0", // soft gray borders
        tHeadBg: "#f8f9fc", // slightly off-white table header
        rowHover: "#f0f5ff", // subtle blue hover
        txt: "#1e2a3a", // deep navy text
        txt2: "#5c6e82", // medium gray
        txt3: "#94a3b8", // light gray
        green: "#16a34a", // green for buttons/active
        orange: "#f59e0b", // orange action icon
        red: "#dc2626",
        blue: "#2563eb",
        input: "#ffffff",
        inputB: "#dde3ec",
        hover: "#f5f8ff",
        frooV: "#7c3aed",
        frooBg: "#f5f3ff",
        frooLight: "#ede9fe",
        cdrrO: "#b84d00",
        cdrrBg: "#fff7ed",
        cdrrLight: "#ffedd5",
        shadow: "0 1px 6px rgba(0,20,60,0.07)",
        dtnBg: "linear-gradient(135deg,#5b21b6,#7c3aed)",
        pill: "#edf0f5",
        pillTxt: "#64748b",
      };

  // ── Column visibility ──────────────────────────────────────────────────────
  // ✅ Pinalawak para isama ang bagong special tabs
  const showFROO = [
    "all",
    "NON-PICS",
    "pending_froo",
    "pending_cdrr_review",
  ].includes(activeTab);
  const showSec = ["all", "NON-PICS", "pending_cdrr_review"].includes(
    activeTab,
  );

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchData();
  }, [page, pageSize, search, sortBy, sortOrder, statusFilter, activeTab]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await getCDRRReports({
        page,
        page_size: pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
        // ✅ Special tabs fetch all, then filter client-side
        category: ["all", "pending_froo", "pending_cdrr_review"].includes(
          activeTab,
        )
          ? undefined
          : activeTab,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      let d = res.data || [];

      // ✅ Client-side filter para sa bagong tabs
      if (activeTab === "pending_froo") {
        // Inspector: NON-PICS na walang FROO data pa
        d = d.filter((i) => i.category === "NON-PICS" && !i.froo_report);
      } else if (activeTab === "pending_cdrr_review") {
        // CDRR: may FROO na pero walang cdrr_secondary pa
        d = d.filter((i) => i.froo_report && !i.cdrr_secondary);
      }

      setData(d);

      const isSpecialTab =
        activeTab === "pending_froo" || activeTab === "pending_cdrr_review";
      setTotalRecords(isSpecialTab ? d.length : res.total || 0);
      setTotalPages(
        isSpecialTab
          ? Math.ceil(d.length / pageSize) || 1
          : res.total_pages || 0,
      );

      // Stats always computed from full response (bago i-filter)
      const allD = res.data || [];
      setCatStats({
        all: res.total || allD.length,
        "NON-PICS": allD.filter((i) => i.category === "NON-PICS").length,
        PICS: allD.filter((i) => i.category === "PICS").length,
        "LETTER AND CORRECTION": allD.filter(
          (i) => i.category === "LETTER AND CORRECTION",
        ).length,
        pending_froo: allD.filter(
          (i) => i.category === "NON-PICS" && !i.froo_report,
        ).length,
        pending_cdrr_review: allD.filter(
          (i) => i.froo_report && !i.cdrr_secondary,
        ).length,
      });
    } catch (err) {
      console.error(err);
      setData([]);
      setTotalRecords(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fmtDate = (d) =>
    !d
      ? "—"
      : new Date(d).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "2-digit",
        });
  const fmtDT = (d) =>
    !d
      ? "—"
      : new Date(d).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setSelectedRows(new Set());
  };
  const handleSort = (col) => {
    if (sortBy === col) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortOrder("asc");
    }
  };
  const toggleRow = (id) => {
    const s = new Set(selectedRows);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedRows(s);
  };
  const toggleAll = () =>
    setSelectedRows(
      selectedRows.size === data.length
        ? new Set()
        : new Set(data.map((i) => i.id)),
    );

  const openView = (r) => {
    setSelectedReport(r);
    setIsViewOpen(true);
    setDropdownId(null);
  };
  const openUpdate = (r) => {
    setSelectedReport(r);
    setIsUpdateOpen(true);
    setDropdownId(null);
  };
  const openAdd = () => {
    console.log("[Add Button] Opening add modal, perms:", perms);
    setIsAddOpen(true);
  };

  const toggleDropdown = (id, e) => {
    if (dropdownId === id) {
      setDropdownId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    setDropdownId(id);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e) => {
      if (!dropdownId) return;
      const btn = document.getElementById(`ab-${dropdownId}`);
      if (
        btn &&
        !btn.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      )
        setDropdownId(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [dropdownId]);

  function workDays(s, e) {
    if (!s) return null;
    const start = new Date(s),
      end = e ? new Date(e) : new Date();
    if (end < start) return 0;
    let n = 0,
      c = new Date(start);
    while (c <= end) {
      if (c.getDay() !== 0 && c.getDay() !== 6) n++;
      c.setDate(c.getDate() + 1);
    }
    return n;
  }

  // ── Badge components ───────────────────────────────────────────────────────
  function Pill({ children, bg, color, border }) {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "0.16rem 0.52rem",
          borderRadius: "20px",
          fontSize: "0.69rem",
          fontWeight: "700",
          letterSpacing: "0.03em",
          background: bg,
          color,
          border: `1px solid ${border || bg}`,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
    );
  }

  function TimelinePill({ days }) {
    if (days === null) return <span style={{ color: C.txt3 }}>—</span>;
    const ok = days <= 60;
    return (
      <Pill
        bg={
          ok
            ? darkMode
              ? "rgba(16,185,129,0.14)"
              : "#dcfce7"
            : darkMode
              ? "rgba(239,68,68,0.14)"
              : "#fee2e2"
        }
        color={
          ok
            ? darkMode
              ? "#10b981"
              : "#166534"
            : darkMode
              ? "#ef4444"
              : "#991b1b"
        }
        border={
          ok
            ? darkMode
              ? "rgba(16,185,129,0.3)"
              : "#bbf7d0"
            : darkMode
              ? "rgba(239,68,68,0.3)"
              : "#fecaca"
        }
      >
        {ok ? "✓ Within" : "✗ Beyond"}
      </Pill>
    );
  }

  function StatusPill({ status }) {
    if (!status) return <span style={{ color: C.txt3 }}>—</span>;
    const m = {
      completed: [
        "#dcfce7",
        "#166534",
        "#bbf7d0",
        "rgba(16,185,129,0.14)",
        "#10b981",
        "rgba(16,185,129,0.3)",
      ],
      pending: [
        "#fef3c7",
        "#92400e",
        "#fde68a",
        "rgba(245,158,11,0.14)",
        "#f59e0b",
        "rgba(245,158,11,0.3)",
      ],
      "in progress": [
        "#dbeafe",
        "#1e40af",
        "#bfdbfe",
        "rgba(59,130,246,0.14)",
        "#3b82f6",
        "rgba(59,130,246,0.3)",
      ],
      cancelled: [
        "#fee2e2",
        "#991b1b",
        "#fecaca",
        "rgba(239,68,68,0.14)",
        "#ef4444",
        "rgba(239,68,68,0.3)",
      ],
    };
    const c = m[status.toLowerCase()];
    if (!c)
      return (
        <Pill bg={C.pill} color={C.txt2} border={C.border}>
          {status}
        </Pill>
      );
    return (
      <Pill
        bg={darkMode ? c[3] : c[0]}
        color={darkMode ? c[4] : c[1]}
        border={darkMode ? c[5] : c[2]}
      >
        {status}
      </Pill>
    );
  }

  function CatPill({ cat }) {
    if (!cat) return <span style={{ color: C.txt3 }}>—</span>;
    const m = {
      "NON-PICS": [
        "#dbeafe",
        "#1e40af",
        "#bfdbfe",
        "rgba(59,130,246,0.14)",
        "#3b82f6",
        "rgba(59,130,246,0.3)",
      ],
      PICS: [
        "#ede9fe",
        "#5b21b6",
        "#ddd6fe",
        "rgba(139,92,246,0.14)",
        "#8b5cf6",
        "rgba(139,92,246,0.3)",
      ],
      "LETTER AND CORRECTION": [
        "#ffedd5",
        "#9a3412",
        "#fed7aa",
        "rgba(249,115,22,0.14)",
        "#f97316",
        "rgba(249,115,22,0.3)",
      ],
    };
    const c = m[cat];
    if (!c)
      return (
        <Pill bg={C.pill} color={C.txt2} border={C.border}>
          {cat}
        </Pill>
      );
    return (
      <Pill
        bg={darkMode ? c[3] : c[0]}
        color={darkMode ? c[4] : c[1]}
        border={darkMode ? c[5] : c[2]}
      >
        {cat}
      </Pill>
    );
  }

  function SortIcon({ col }) {
    return (
      <span
        style={{
          opacity: sortBy === col ? 1 : 0.2,
          fontSize: "0.58rem",
          marginLeft: "2px",
        }}
      >
        {sortBy === col ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    );
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const thS = {
    padding: "0.58rem 0.8rem",
    textAlign: "left",
    fontWeight: "600",
    color: C.txt2,
    fontSize: "0.67rem",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    userSelect: "none",
    background: C.tHeadBg,
    borderBottom: `1px solid ${C.border}`,
  };
  const tdS = {
    padding: "0.72rem 0.8rem",
    fontSize: "0.8rem",
    color: C.txt,
    verticalAlign: "middle",
  };

  // ── Tab config ──────────────────────────────────────────────────────────────
  // ✅ Naidagdag ang conditional tabs base sa permissions
  const TABS = [
    { key: "all", label: "All Reports", icon: "📄" },
    { key: "NON-PICS", label: "NON-PICS", icon: "📋" },
    { key: "PICS", label: "PICS", icon: "🔬" },
    { key: "LETTER AND CORRECTION", label: "Letter & Correction", icon: "✉️" },
    // ✅ Inspector group lang — NON-PICS na wala pang FROO Inspection
    ...(perms.canUpdateFROO && !perms.canUpdateCDRR
      ? [
          {
            key: "pending_froo",
            label: "Received NON-PICS",
            icon: "🔔",
            specialColor: darkMode ? "#8b5cf6" : "#7c3aed",
          },
        ]
      : []),
    // ✅ CDRR group lang — may FROO na pero wala pang CDRR Secondary Review
    ...(perms.canUpdateCDRR
      ? [
          {
            key: "pending_cdrr_review",
            label: "CDRR Review Pending",
            icon: "📊",
            specialColor: darkMode ? "#f97316" : "#b84d00",
          },
        ]
      : []),
  ];

  // Stat cards matching reference (Total / NON-PICS / PICS / Letter&Correction)
  const STATS = [
    {
      label: "TOTAL REPORTS",
      val: totalRecords,
      icon: "📊",
      iconBg: darkMode ? "#1a2a3a" : "#e8f4ff",
      numC: darkMode ? "#60a5fa" : "#1d5ea8",
    },
    {
      label: "NON-PICS",
      val: catStats["NON-PICS"],
      icon: "📋",
      iconBg: darkMode ? "#2a1a1a" : "#fff3e0",
      numC: darkMode ? "#fb923c" : "#c2500a",
    },
    {
      label: "PICS",
      val: catStats["PICS"],
      icon: "🔬",
      iconBg: darkMode ? "#1e1a2e" : "#f0e8ff",
      numC: darkMode ? "#a78bfa" : "#6d28d9",
    },
    {
      label: "LETTER & CORRECTION",
      val: catStats["LETTER AND CORRECTION"],
      icon: "✉️",
      iconBg: darkMode ? "#1a2a1a" : "#e6fdf1",
      numC: darkMode ? "#34d399" : "#0a7a52",
    },
  ];

  function handleExport() {
    const h = [
      "ID",
      "DTN",
      "Date Received",
      "Date Decked",
      "Importer",
      "LTO No.",
      "Address",
      "Type of App",
      "Evaluator",
      "Date Evaluated",
      "Manufacturer",
      "Plant Address",
      "SECPA No.",
      "Cert. No.",
      "Issuance Date",
      "Issuance Type",
      "Product Line",
      "Validity",
      "Status",
      "Released Date",
      "Overall Deadline",
      "Category",
      "Created By",
      "Created At",
      "Updated By",
      "Updated At",
    ];
    const r = data.map((i) => [
      i.id || "",
      i.dtn || "",
      i.date_received_by_center || "",
      i.date_decked || "",
      i.name_of_importer || "",
      i.lto_number || "",
      i.address || "",
      i.type_of_application || "",
      i.evaluator || "",
      i.date_evaluated || "",
      i.name_of_foreign_manufacturer || "",
      i.plant_address || "",
      i.secpa_number || "",
      i.certificate_number || "",
      i.date_of_issuance || "",
      i.type_of_issuance || "",
      i.product_line || "",
      i.certificate_validity || "",
      i.status || "",
      i.released_date || "",
      i.overall_deadline || "",
      i.category || "",
      i.created_by || "",
      i.created_at || "",
      i.updated_by || "",
      i.updated_at || "",
    ]);
    const csv = [
      h.join(","),
      ...r.map((row) =>
        row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    a.download = `cdrr_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          borderBottom: `1px solid ${C.border}`,
          padding: "1.1rem 2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.75rem",
                fontWeight: "600",
                color: C.txt,
                letterSpacing: "-0.02em",
              }}
            >
              CDRR and Inspector Reports
            </h1>
            <p
              style={{
                margin: "0.2rem 0 0",
                color: C.txt2,
                fontSize: "0.79rem",
              }}
            >
              View and manage CDRR and Inspector Reports with FROO and Secondary
              data
            </p>
          </div>

          <div
            style={{ display: "flex", gap: "0.55rem", alignItems: "center" }}
          >
            {/* ★ Add Report — visible ONLY for CDRR group */}
            {perms.canAdd && (
              <button
                onClick={openAdd}
                style={{
                  padding: "0.5rem 1.1rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "#16a34a",
                  color: "#fff",
                  fontSize: "0.82rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  boxShadow: "0 2px 8px rgba(22,163,74,0.32)",
                  transition: "all 0.13s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = "brightness(1.08)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "";
                  e.currentTarget.style.transform = "";
                }}
              >
                ＋ Add Report
              </button>
            )}
            <button
              onClick={handleExport}
              disabled={!data.length}
              style={{
                padding: "0.5rem 1.1rem",
                borderRadius: "8px",
                border: `1px solid ${C.border}`,
                background: C.card,
                color: C.txt,
                fontSize: "0.82rem",
                fontWeight: "600",
                cursor: data.length ? "pointer" : "not-allowed",
                opacity: data.length ? 1 : 0.4,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                transition: "all 0.13s",
              }}
              onMouseEnter={(e) => {
                if (data.length) e.currentTarget.style.background = C.hover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = C.card;
              }}
            >
              ↓ Export ({data.length})
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: "1.2rem 2rem 0" }}>
        {/* ── STAT CARDS ─────────────────────────────────────────────────── */}
        {/* Reference design: 3 wide cards with icon on left, big colored number */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(195px,1fr))",
            gap: "0.85rem",
            marginBottom: "1.2rem",
          }}
        >
          {STATS.map((s, i) => (
            <div
              key={i}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: "12px",
                padding: "1rem 1.2rem",
                display: "flex",
                alignItems: "center",
                gap: "0.9rem",
                boxShadow: C.shadow,
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "11px",
                  background: s.iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  flexShrink: 0,
                }}
              >
                {s.icon}
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.63rem",
                    fontWeight: "700",
                    color: C.txt3,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: "0.1rem",
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: "1.95rem",
                    fontWeight: "800",
                    color: s.numC,
                    lineHeight: 1,
                  }}
                >
                  {s.val}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── TABS ──────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: "0",
            marginBottom: "1.2rem",
            borderBottom: `2px solid ${C.border}`,
            overflowX: "auto", // ✅ Para hindi mag-overflow kapag maraming tabs
          }}
        >
          {TABS.map(({ key, label, icon, specialColor }) => {
            const active = activeTab === key;
            // ✅ Gamitin ang specialColor para sa bagong tabs, green para sa dati
            const activeColor = specialColor || "#16a34a";
            const count =
              key === "all"
                ? totalRecords
                : active
                  ? totalRecords
                  : (catStats[key] ?? 0);

            return (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                style={{
                  padding: "0.6rem 1.1rem",
                  border: "none",
                  borderBottom: `2px solid ${active ? activeColor : "transparent"}`,
                  marginBottom: "-2px",
                  background: "transparent",
                  color: active ? activeColor : C.txt2,
                  fontSize: "0.82rem",
                  fontWeight: active ? "700" : "500",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  whiteSpace: "nowrap",
                  transition: "all 0.12s",
                  borderRadius: "0",
                  // ✅ Subtle separator bago ang special tabs
                  borderLeft: specialColor
                    ? `1px solid ${C.border}`
                    : undefined,
                  marginLeft: key === "pending_froo" ? "0.4rem" : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = C.txt;
                    e.currentTarget.style.background = C.hover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = C.txt2;
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {icon} {label}
                {/* Count badge — colored kapag active, gray kapag hindi */}
                <span
                  style={{
                    padding: "0.06rem 0.42rem",
                    borderRadius: "20px",
                    fontSize: "0.66rem",
                    fontWeight: "700",
                    background: active ? activeColor : C.pill,
                    color: active ? "#fff" : C.pillTxt,
                  }}
                >
                  {count}
                </span>
                {/* ✅ Alert dot para sa special tabs kapag may pending at hindi active */}
                {specialColor && !active && count > 0 && (
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: activeColor,
                      display: "inline-block",
                      marginLeft: "-2px",
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ── SEARCH ────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: "0.6rem",
            marginBottom: "1.1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "0.8rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: C.txt3,
                fontSize: "0.85rem",
                pointerEvents: "none",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by DTN, Importer, LTO, Manufacturer, Certificate..."
              style={{
                width: "100%",
                padding: "0.6rem 1rem 0.6rem 2.4rem",
                borderRadius: "8px",
                border: `1px solid ${C.inputB}`,
                background: C.input,
                color: C.txt,
                fontSize: "0.81rem",
                outline: "none",
                boxSizing: "border-box",
                transition: "all 0.13s",
                boxShadow: C.shadow,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#16a34a";
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(22,163,74,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = C.inputB;
                e.currentTarget.style.boxShadow = C.shadow;
              }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "0.6rem 0.9rem",
              borderRadius: "8px",
              border: `1px solid ${C.inputB}`,
              background: C.input,
              color: C.txt,
              fontSize: "0.81rem",
              minWidth: "135px",
              cursor: "pointer",
              boxShadow: C.shadow,
            }}
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          {(statusFilter || search) && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setPage(1);
              }}
              style={{
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                border: `1px solid #ef4444`,
                background: "transparent",
                color: "#ef4444",
                fontSize: "0.81rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* ── TABLE ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: "0 2rem 2rem" }}>
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: C.shadow,
          }}
        >
          {/* Table label bar — like "OTC Records  14 records • 91 columns" in ref */}
          <div
            style={{
              padding: "0.8rem 1.1rem",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: C.tHeadBg,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}
            >
              <span
                style={{ fontWeight: "700", fontSize: "0.86rem", color: C.txt }}
              >
                CDRR Records
              </span>
              <span
                style={{
                  padding: "0.12rem 0.5rem",
                  borderRadius: "20px",
                  background: C.pill,
                  color: C.pillTxt,
                  fontSize: "0.7rem",
                  fontWeight: "600",
                }}
              >
                {totalRecords} records
              </span>
            </div>
            <span style={{ fontSize: "0.72rem", color: C.txt3 }}>
              Sorted by{" "}
              <span style={{ color: "#16a34a", fontWeight: "600" }}>
                Created At ▼
              </span>
            </span>
          </div>

          {loading ? (
            <div
              style={{ padding: "4rem 0", textAlign: "center", color: C.txt2 }}
            >
              ⏳ Loading reports...
            </div>
          ) : data.length === 0 ? (
            <div
              style={{ padding: "4rem 0", textAlign: "center", color: C.txt2 }}
            >
              {/* ✅ Custom empty state para sa special tabs */}
              {activeTab === "pending_froo"
                ? "✅ All NON-PICS records have FROO Inspection data!"
                : activeTab === "pending_cdrr_review"
                  ? "✅ All inspected records have CDRR Review data!"
                  : "📭 No records found"}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  {/* ── SECTION HEADER ROW ── */}
                  <tr>
                    <th
                      rowSpan={2}
                      style={{
                        ...thS,
                        position: "sticky",
                        left: 0,
                        zIndex: 20,
                        width: "42px",
                        minWidth: "42px",
                        padding: "0.58rem 0.7rem",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          selectedRows.size === data.length && data.length > 0
                        }
                        onChange={toggleAll}
                        style={{ cursor: "pointer", accentColor: "#16a34a" }}
                      />
                    </th>
                    <th
                      rowSpan={2}
                      style={{
                        ...thS,
                        position: "sticky",
                        left: "42px",
                        zIndex: 20,
                        width: "38px",
                        minWidth: "38px",
                        textAlign: "center",
                      }}
                    >
                      #
                    </th>
                    <th
                      rowSpan={2}
                      style={{
                        ...thS,
                        position: "sticky",
                        left: "80px",
                        zIndex: 20,
                        minWidth: "140px",
                        borderRight: `1px solid ${C.border}`,
                      }}
                    >
                      DTN
                    </th>

                    {/* CDRR section banner */}
                    <th
                      colSpan={25}
                      style={{
                        ...thS,
                        textAlign: "center",
                        background: darkMode ? "#1d1d1d" : "#f0f4fb",
                        color: C.txt2,
                        borderLeft: `1px solid ${C.border}`,
                        borderRight:
                          showFROO || showSec
                            ? `2px solid ${C.border}`
                            : undefined,
                        padding: "0.4rem 0.8rem",
                        letterSpacing: "0.08em",
                      }}
                    >
                      CDRR GMP EVIDENCE EVALUATION
                    </th>

                    {showFROO && (
                      <th
                        colSpan={14}
                        style={{
                          ...thS,
                          textAlign: "center",
                          color: C.frooV,
                          background: darkMode ? "#1a0f2e" : C.frooBg,
                          borderLeft: `2px solid ${C.frooV}`,
                          borderRight: `2px solid ${C.frooV}`,
                          padding: "0.4rem 0.8rem",
                        }}
                      >
                        📝 FROO INSPECTION
                      </th>
                    )}
                    {showSec && (
                      <th
                        colSpan={15}
                        style={{
                          ...thS,
                          textAlign: "center",
                          color: C.cdrrO,
                          background: darkMode ? "#2e1a0f" : C.cdrrBg,
                          borderLeft: `2px solid ${C.cdrrO}`,
                          borderRight: `2px solid ${C.cdrrO}`,
                          padding: "0.4rem 0.8rem",
                        }}
                      >
                        📊 CDRR Review of FROO Recommendation
                      </th>
                    )}
                    <th
                      rowSpan={2}
                      style={{
                        ...thS,
                        textAlign: "center",
                        position: "sticky",
                        right: 0,
                        zIndex: 20,
                        minWidth: "95px",
                        width: "95px",
                        borderLeft: `2px solid ${C.border}`,
                      }}
                    >
                      Actions
                    </th>
                  </tr>

                  {/* ── COLUMN HEADER ROW ── */}
                  <tr>
                    {/* Main CDRR columns */}
                    {[
                      ["Date Received", "date_received_by_center", "110px"],
                      ["Date Decked", "date_decked", "105px"],
                      ["Importer", "name_of_importer", "165px"],
                      ["LTO No.", null, "100px"],
                      ["Address", null, "155px"],
                      ["Type of App", null, "115px"],
                      ["Evaluator", null, "100px"],
                      ["Date Evaluated", "date_evaluated", "110px"],
                      ["Manufacturer", null, "150px"],
                      ["Plant Address", null, "150px"],
                      ["SECPA No.", null, "100px"],
                      ["Cert. No.", null, "115px"],
                      ["Issuance Date", "date_of_issuance", "110px"],
                      ["Issuance Type", null, "110px"],
                      ["Product Line", null, "125px"],
                      ["Validity", null, "100px"],
                      ["Status", null, "95px"],
                      ["Released", "released_date", "110px"],
                      ["Deadline", "overall_deadline", "120px"],
                      ["Category", "category", "100px"],
                      ["Beyond/Within", null, "110px", showFROO || showSec],
                      ["Created By", null, "100px"],
                      ["Created At", null, "128px"],
                      ["Updated By", null, "100px"],
                      ["Updated At", null, "128px", showFROO || showSec],
                    ].map(([lbl, col, w, br], i) => (
                      <th
                        key={i}
                        onClick={col ? () => handleSort(col) : undefined}
                        style={{
                          ...thS,
                          minWidth: w,
                          cursor: col ? "pointer" : "default",
                          borderRight: br ? `2px solid ${C.border}` : undefined,
                        }}
                      >
                        {lbl}
                        {col && <SortIcon col={col} />}
                      </th>
                    ))}

                    {/* FROO sub-columns */}
                    {showFROO &&
                      [
                        ["Date Received", true],
                        ["Date Inspected"],
                        ["Endorsed to CDRR"],
                        ["Overall Deadline"],
                        ["Approved Ext."],
                        ["New Deadline"],
                        ["Is Approved"],
                        ["Ext. Approved"],
                        ["FROO Status"],
                        ["Beyond/Within"],
                        ["Created By"],
                        ["Created At"],
                        ["Updated By"],
                        ["Updated At", false, true],
                      ].map(([lbl, bl, br], i) => (
                        <th
                          key={`fh${i}`}
                          style={{
                            ...thS,
                            minWidth: "110px",
                            background: darkMode ? "#2d1b4e" : C.frooLight,
                            color: C.frooV,
                            borderLeft: bl ? `2px solid ${C.frooV}` : undefined,
                            borderRight: br
                              ? `2px solid ${C.frooV}`
                              : undefined,
                          }}
                        >
                          {lbl}
                        </th>
                      ))}

                    {/* Secondary sub-columns */}
                    {showSec &&
                      [
                        ["Date Received", true],
                        ["SECPA No."],
                        ["Cert. No."],
                        ["Issuance Date"],
                        ["Issuance Type"],
                        ["Product Line"],
                        ["Validity"],
                        ["Status"],
                        ["Released Date"],
                        ["Overall Deadline"],
                        ["Beyond/Within"],
                        ["Created By"],
                        ["Created At"],
                        ["Updated By"],
                        ["Updated At", false, true],
                      ].map(([lbl, bl, br], i) => (
                        <th
                          key={`sh${i}`}
                          style={{
                            ...thS,
                            minWidth: "110px",
                            background: darkMode ? "#4e2d1b" : C.cdrrLight,
                            color: C.cdrrO,
                            borderLeft: bl ? `2px solid ${C.cdrrO}` : undefined,
                            borderRight: br
                              ? `2px solid ${C.cdrrO}`
                              : undefined,
                          }}
                        >
                          {lbl}
                        </th>
                      ))}
                  </tr>
                </thead>

                <tbody>
                  {data.map((item, idx) => {
                    const sel = selectedRows.has(item.id);
                    const rowBg = sel
                      ? darkMode
                        ? "rgba(22,163,74,0.07)"
                        : "rgba(22,163,74,0.04)"
                      : C.card;
                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                          background: rowBg,
                        }}
                        onMouseEnter={(e) => {
                          if (!sel)
                            e.currentTarget.style.background = C.rowHover;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = rowBg;
                        }}
                      >
                        {/* Sticky cols */}
                        <td
                          style={{
                            ...tdS,
                            position: "sticky",
                            left: 0,
                            background: "inherit",
                            zIndex: 9,
                            width: "42px",
                            padding: "0 0.7rem",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() => toggleRow(item.id)}
                            style={{
                              cursor: "pointer",
                              accentColor: "#16a34a",
                            }}
                          />
                        </td>
                        <td
                          style={{
                            ...tdS,
                            position: "sticky",
                            left: "42px",
                            background: "inherit",
                            zIndex: 9,
                            width: "38px",
                            textAlign: "center",
                            color: C.txt3,
                            fontWeight: "700",
                            fontSize: "0.74rem",
                          }}
                        >
                          {(page - 1) * pageSize + idx + 1}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            position: "sticky",
                            left: "80px",
                            background: "inherit",
                            zIndex: 9,
                            borderRight: `1px solid ${C.border}`,
                          }}
                        >
                          {/* DTN badge — purple gradient + pencil icon, exactly like reference */}
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.28rem",
                              background: C.dtnBg,
                              color: "#fff",
                              padding: "0.25rem 0.6rem",
                              borderRadius: "7px",
                              fontSize: "0.72rem",
                              fontWeight: "700",
                            }}
                          >
                            ✏️ {item.dtn || "N/A"}
                          </span>
                        </td>

                        {/* Main CDRR data */}
                        <td style={{ ...tdS, color: C.txt2 }}>
                          {fmtDate(item.date_received_by_center)}
                        </td>
                        <td style={{ ...tdS, color: C.txt2 }}>
                          {fmtDate(item.date_decked)}
                        </td>
                        <td style={{ ...tdS, fontWeight: "600" }}>
                          {item.name_of_importer || "—"}
                        </td>
                        <td style={tdS}>{item.lto_number || "—"}</td>
                        <td
                          style={{
                            ...tdS,
                            color: C.txt2,
                            maxWidth: "155px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.address || "—"}
                        </td>
                        <td style={{ ...tdS, color: C.txt2 }}>
                          {item.type_of_application || "—"}
                        </td>
                        <td style={tdS}>{item.evaluator || "—"}</td>
                        <td style={{ ...tdS, color: C.txt2 }}>
                          {fmtDate(item.date_evaluated)}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            maxWidth: "150px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.name_of_foreign_manufacturer || "—"}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            color: C.txt2,
                            maxWidth: "150px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.plant_address || "—"}
                        </td>
                        <td style={tdS}>{item.secpa_number || "—"}</td>
                        <td style={tdS}>{item.certificate_number || "—"}</td>
                        <td style={{ ...tdS, color: C.txt2 }}>
                          {fmtDate(item.date_of_issuance)}
                        </td>
                        <td style={tdS}>{item.type_of_issuance || "—"}</td>
                        <td style={tdS}>{item.product_line || "—"}</td>
                        <td style={{ ...tdS, color: C.txt2 }}>
                          {fmtDate(item.certificate_validity)}
                        </td>
                        <td style={tdS}>
                          <StatusPill status={item.status} />
                        </td>
                        <td style={{ ...tdS, color: C.txt2 }}>
                          {fmtDate(item.released_date)}
                        </td>
                        <td style={{ ...tdS, color: C.txt2 }}>
                          {fmtDate(item.overall_deadline)}
                        </td>
                        <td style={tdS}>
                          <CatPill cat={item.category} />
                        </td>
                        <td
                          style={{
                            ...tdS,
                            borderRight:
                              showFROO || showSec
                                ? `2px solid ${C.border}`
                                : undefined,
                          }}
                        >
                          <TimelinePill
                            days={workDays(
                              item.date_received_by_center,
                              item.released_date,
                            )}
                          />
                        </td>
                        <td style={{ ...tdS, color: C.txt2 }}>
                          {item.created_by || "—"}
                        </td>
                        <td
                          style={{ ...tdS, color: C.txt3, fontSize: "0.73rem" }}
                        >
                          {fmtDT(item.created_at)}
                        </td>
                        <td style={{ ...tdS, color: C.txt2 }}>
                          {item.updated_by || "—"}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            color: C.txt3,
                            fontSize: "0.73rem",
                            borderRight:
                              showFROO || showSec
                                ? `2px solid ${C.border}`
                                : undefined,
                          }}
                        >
                          {fmtDT(item.updated_at)}
                        </td>

                        {/* FROO data */}
                        {showFROO && (
                          <>
                            <td
                              style={{
                                ...tdS,
                                borderLeft: `2px solid ${C.frooV}`,
                                background: darkMode ? "#1a0f2e" : C.frooBg,
                                color: C.txt2,
                              }}
                            >
                              {fmtDate(item.froo_report?.date_received)}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#1a0f2e" : C.frooBg,
                                color: C.txt2,
                              }}
                            >
                              {fmtDate(item.froo_report?.date_inspected)}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#1a0f2e" : C.frooBg,
                                color: C.txt2,
                              }}
                            >
                              {fmtDate(item.froo_report?.date_endorsed_to_cdrr)}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#1a0f2e" : C.frooBg,
                                color: C.txt2,
                              }}
                            >
                              {fmtDate(item.froo_report?.overall_deadline)}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#1a0f2e" : C.frooBg,
                                color: C.txt2,
                              }}
                            >
                              {fmtDate(item.froo_report?.approved_extension)}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#1a0f2e" : C.frooBg,
                                color: C.txt2,
                              }}
                            >
                              {fmtDate(item.froo_report?.new_overall_deadline)}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#1a0f2e" : C.frooBg,
                              }}
                            >
                              {item.froo_report?.is_approved !== undefined ? (
                                <Pill
                                  bg={
                                    item.froo_report.is_approved
                                      ? darkMode
                                        ? "rgba(16,185,129,0.14)"
                                        : "#dcfce7"
                                      : darkMode
                                        ? "rgba(239,68,68,0.14)"
                                        : "#fee2e2"
                                  }
                                  color={
                                    item.froo_report.is_approved
                                      ? darkMode
                                        ? "#10b981"
                                        : "#166534"
                                      : darkMode
                                        ? "#ef4444"
                                        : "#991b1b"
                                  }
                                  border={
                                    item.froo_report.is_approved
                                      ? darkMode
                                        ? "rgba(16,185,129,0.3)"
                                        : "#bbf7d0"
                                      : darkMode
                                        ? "rgba(239,68,68,0.3)"
                                        : "#fecaca"
                                  }
                                >
                                  {item.froo_report.is_approved ? "Yes" : "No"}
                                </Pill>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#1a0f2e" : C.frooBg,
                                color: C.txt2,
                              }}
                            >
                              {fmtDate(
                                item.froo_report?.date_extension_approved,
                              )}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#1a0f2e" : C.frooBg,
                              }}
                            >
                              <StatusPill status={item.froo_report?.status} />
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#1a0f2e" : C.frooBg,
                              }}
                            >
                              <TimelinePill
                                days={workDays(
                                  item.froo_report?.date_received,
                                  item.froo_report?.date_endorsed_to_cdrr,
                                )}
                              />
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#1a0f2e" : C.frooBg,
                                color: C.txt2,
                              }}
                            >
                              {item.froo_report?.created_by || "—"}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#1a0f2e" : C.frooBg,
                                color: C.txt3,
                                fontSize: "0.73rem",
                              }}
                            >
                              {fmtDT(item.froo_report?.created_at)}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#1a0f2e" : C.frooBg,
                                color: C.txt2,
                              }}
                            >
                              {item.froo_report?.updated_by || "—"}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#1a0f2e" : C.frooBg,
                                color: C.txt3,
                                fontSize: "0.73rem",
                                borderRight: `2px solid ${C.frooV}`,
                              }}
                            >
                              {fmtDT(item.froo_report?.updated_at)}
                            </td>
                          </>
                        )}

                        {/* Secondary data */}
                        {showSec && (
                          <>
                            <td
                              style={{
                                ...tdS,
                                borderLeft: `2px solid ${C.cdrrO}`,
                                background: darkMode ? "#2e1a0f" : C.cdrrBg,
                                color: C.txt2,
                              }}
                            >
                              {fmtDate(item.cdrr_secondary?.date_received)}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#2e1a0f" : C.cdrrBg,
                              }}
                            >
                              {item.cdrr_secondary?.secpa_number || "—"}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#2e1a0f" : C.cdrrBg,
                              }}
                            >
                              {item.cdrr_secondary?.certificate_number || "—"}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#2e1a0f" : C.cdrrBg,
                                color: C.txt2,
                              }}
                            >
                              {fmtDate(item.cdrr_secondary?.date_of_issuance)}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#2e1a0f" : C.cdrrBg,
                              }}
                            >
                              {item.cdrr_secondary?.type_of_issuance || "—"}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#2e1a0f" : C.cdrrBg,
                              }}
                            >
                              {item.cdrr_secondary?.product_line || "—"}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#2e1a0f" : C.cdrrBg,
                                color: C.txt2,
                              }}
                            >
                              {fmtDate(
                                item.cdrr_secondary?.certificate_validity,
                              )}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#2e1a0f" : C.cdrrBg,
                              }}
                            >
                              <StatusPill
                                status={item.cdrr_secondary?.status}
                              />
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#2e1a0f" : C.cdrrBg,
                                color: C.txt2,
                              }}
                            >
                              {fmtDate(item.cdrr_secondary?.released_date)}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#2e1a0f" : C.cdrrBg,
                                color: C.txt2,
                              }}
                            >
                              {fmtDate(item.cdrr_secondary?.overall_deadline)}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#2e1a0f" : C.cdrrBg,
                              }}
                            >
                              <TimelinePill
                                days={workDays(
                                  item.cdrr_secondary?.date_received,
                                  item.cdrr_secondary?.released_date,
                                )}
                              />
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#2e1a0f" : C.cdrrBg,
                                color: C.txt2,
                              }}
                            >
                              {item.cdrr_secondary?.created_by || "—"}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#2e1a0f" : C.cdrrBg,
                                color: C.txt3,
                                fontSize: "0.73rem",
                              }}
                            >
                              {fmtDT(item.cdrr_secondary?.created_at)}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#2e1a0f" : C.cdrrBg,
                                color: C.txt2,
                              }}
                            >
                              {item.cdrr_secondary?.updated_by || "—"}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                background: darkMode ? "#2e1a0f" : C.cdrrBg,
                                color: C.txt3,
                                fontSize: "0.73rem",
                                borderRight: `2px solid ${C.cdrrO}`,
                              }}
                            >
                              {fmtDT(item.cdrr_secondary?.updated_at)}
                            </td>
                          </>
                        )}

                        {/* ── ACTIONS ────────────────────────────────────────────────────── */}
                        <td
                          style={{
                            ...tdS,
                            textAlign: "center",
                            position: "sticky",
                            right: 0,
                            background: "inherit",
                            zIndex: 10,
                            minWidth: "60px",
                            width: "60px",
                            borderLeft: `1px solid ${C.border}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {/* ⋮ dots — contains both View Details and Update */}
                            <div style={{ position: "relative" }}>
                              <button
                                id={`ab-${item.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDropdown(item.id, e);
                                }}
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "7px",
                                  border: `1px solid ${dropdownId === item.id ? C.green : C.border}`,
                                  background:
                                    dropdownId === item.id
                                      ? darkMode
                                        ? "rgba(22,163,74,0.12)"
                                        : "rgba(22,163,74,0.08)"
                                      : "transparent",
                                  color:
                                    dropdownId === item.id ? C.green : C.txt3,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "1.1rem",
                                  fontWeight: "700",
                                  lineHeight: 1,
                                  transition: "all 0.12s",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = C.green;
                                  e.currentTarget.style.color = C.green;
                                  e.currentTarget.style.background = darkMode
                                    ? "rgba(22,163,74,0.1)"
                                    : "rgba(22,163,74,0.07)";
                                }}
                                onMouseLeave={(e) => {
                                  if (dropdownId !== item.id) {
                                    e.currentTarget.style.borderColor =
                                      C.border;
                                    e.currentTarget.style.color = C.txt3;
                                    e.currentTarget.style.background =
                                      "transparent";
                                  }
                                }}
                              >
                                ⋮
                              </button>

                              {dropdownId === item.id && (
                                <>
                                  <div
                                    style={{
                                      position: "fixed",
                                      inset: 0,
                                      zIndex: 998,
                                    }}
                                    onClick={() => setDropdownId(null)}
                                  />
                                  <div
                                    ref={dropdownRef}
                                    style={{
                                      position: "fixed",
                                      top: `${dropdownPos.top}px`,
                                      right: `${dropdownPos.right}px`,
                                      background: C.card,
                                      border: `1px solid ${C.border}`,
                                      borderRadius: "10px",
                                      boxShadow: darkMode
                                        ? "0 8px 30px rgba(0,0,0,0.6)"
                                        : "0 8px 30px rgba(0,20,60,0.14)",
                                      minWidth: "165px",
                                      zIndex: 999,
                                      overflow: "hidden",
                                      padding: "0.3rem",
                                    }}
                                  >
                                    {/* View Details - always visible */}
                                    <button
                                      onClick={() => openView(item)}
                                      style={{
                                        width: "100%",
                                        padding: "0.52rem 0.8rem",
                                        border: "none",
                                        background: "transparent",
                                        color: C.txt,
                                        cursor: "pointer",
                                        fontSize: "0.81rem",
                                        fontWeight: "500",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.55rem",
                                        textAlign: "left",
                                        borderRadius: "7px",
                                        transition: "background 0.1s",
                                      }}
                                      onMouseEnter={(e) =>
                                        (e.currentTarget.style.background =
                                          C.hover)
                                      }
                                      onMouseLeave={(e) =>
                                        (e.currentTarget.style.background =
                                          "transparent")
                                      }
                                    >
                                      <span
                                        style={{
                                          width: "22px",
                                          height: "22px",
                                          borderRadius: "5px",
                                          background: darkMode
                                            ? "rgba(245,158,11,0.15)"
                                            : "#fff3e0",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          fontSize: "0.76rem",
                                        }}
                                      >
                                        👁️
                                      </span>
                                      View Details
                                    </button>

                                    {/* Update - only if canUpdate */}
                                    {perms.canUpdate && (
                                      <button
                                        onClick={() => openUpdate(item)}
                                        style={{
                                          width: "100%",
                                          padding: "0.52rem 0.8rem",
                                          border: "none",
                                          background: "transparent",
                                          color: C.txt,
                                          cursor: "pointer",
                                          fontSize: "0.81rem",
                                          fontWeight: "500",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "0.55rem",
                                          textAlign: "left",
                                          borderRadius: "7px",
                                          transition: "background 0.1s",
                                        }}
                                        onMouseEnter={(e) =>
                                          (e.currentTarget.style.background =
                                            C.hover)
                                        }
                                        onMouseLeave={(e) =>
                                          (e.currentTarget.style.background =
                                            "transparent")
                                        }
                                      >
                                        <span
                                          style={{
                                            width: "22px",
                                            height: "22px",
                                            borderRadius: "5px",
                                            background: darkMode
                                              ? "rgba(16,185,129,0.15)"
                                              : "#dcfce7",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "0.76rem",
                                          }}
                                        >
                                          ✏️
                                        </span>
                                        Update
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── PAGINATION ── */}
        {!loading && data.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "0.9rem",
              fontSize: "0.79rem",
              color: C.txt2,
            }}
          >
            <span>
              Showing{" "}
              <strong style={{ color: C.txt }}>
                {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, totalRecords)}
              </strong>{" "}
              of <strong style={{ color: C.txt }}>{totalRecords}</strong>{" "}
              records &nbsp;&nbsp; Rows:{" "}
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                style={{
                  padding: "0.25rem 0.45rem",
                  borderRadius: "5px",
                  border: `1px solid ${C.inputB}`,
                  background: C.input,
                  color: C.txt,
                  fontSize: "0.79rem",
                  cursor: "pointer",
                }}
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </span>

            <div
              style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}
            >
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: "0.36rem 0.75rem",
                  borderRadius: "6px",
                  border: `1px solid ${C.border}`,
                  background: C.card,
                  color: page === 1 ? C.txt3 : C.txt,
                  cursor: page === 1 ? "not-allowed" : "pointer",
                  fontSize: "0.79rem",
                  fontWeight: "600",
                }}
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "6px",
                      border: `1px solid ${page === p ? "#16a34a" : C.border}`,
                      background: page === p ? "#16a34a" : C.card,
                      color: page === p ? "#fff" : C.txt,
                      cursor: "pointer",
                      fontSize: "0.79rem",
                      fontWeight: "600",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: "0.36rem 0.75rem",
                  borderRadius: "6px",
                  border: `1px solid ${C.border}`,
                  background: C.card,
                  color: page >= totalPages ? C.txt3 : C.txt,
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                  fontSize: "0.79rem",
                  fontWeight: "600",
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      <ViewDetailsModal
        isOpen={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
        darkMode={darkMode}
      />
      <UpdateModal
        isOpen={isUpdateOpen}
        onClose={() => {
          setIsUpdateOpen(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
        onSuccess={async () => {
          await fetchData();
          setIsUpdateOpen(false);
          setSelectedReport(null);
        }}
        darkMode={darkMode}
        userPermissions={perms}
      />
      <AddModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={async () => {
          await fetchData();
          setIsAddOpen(false);
        }}
        darkMode={darkMode}
        userPermissions={perms}
      />
    </div>
  );
}
