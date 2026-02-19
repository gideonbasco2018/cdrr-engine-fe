import { useState, useEffect, useRef, useCallback } from "react";
import { getCDRRReports } from "../api/cdrr-reports";
import { getCurrentUser } from "../api/auth";

// ── Action Modals (existing, untouched) ───────────────────────────────────────
import ViewDetailsModal from "../components/cdrrInspectorReport/actions/ViewDetailsModal";
import UpdateModal from "../components/cdrrInspectorReport/actions/UpdateModal";
import AddModal from "../components/cdrrInspectorReport/actions/AddModal";

// ── New Components ────────────────────────────────────────────────────────────
import StatCards from "../components/cdrrInspectorReport/layout/StatCards";
import TabBar from "../components/cdrrInspectorReport/layout/TabBar";
import SearchBar from "../components/cdrrInspectorReport/layout/SearchBar";
import Pagination from "../components/cdrrInspectorReport/layout/Pagination";
import ReportsTable from "../components/cdrrInspectorReport/table/ReportsTable";

// ── Permission Resolver ───────────────────────────────────────────────────────
async function resolvePermissions() {
  try {
    const user = await getCurrentUser();
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

// ── Color Palette Builder ─────────────────────────────────────────────────────
function buildColors(darkMode) {
  return darkMode
    ? {
        _darkMode: true,
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
        _darkMode: false,
        bg: "#f4f6fb",
        hBg: "#ffffff",
        card: "#ffffff",
        border: "#e5e9f0",
        tHeadBg: "#f8f9fc",
        rowHover: "#f0f5ff",
        txt: "#1e2a3a",
        txt2: "#5c6e82",
        txt3: "#94a3b8",
        green: "#16a34a",
        orange: "#f59e0b",
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
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CDRRInspectorReportsPage({ darkMode }) {
  const C = buildColors(darkMode);

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
    pending_froo: 0,
    pending_cdrr_review: 0,
  });
  const [perms, setPerms] = useState({
    canViewDetails: true,
    canAdd: false,
    canUpdate: false,
    canUpdateCDRR: false,
    canUpdateFROO: false,
  });

  // ── Resolve permissions on mount ───────────────────────────────────────────
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
        category: ["all", "pending_froo", "pending_cdrr_review"].includes(
          activeTab,
        )
          ? undefined
          : activeTab,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      let d = res.data || [];

      if (activeTab === "pending_froo") {
        d = d.filter((i) => i.category === "NON-PICS" && !i.froo_report);
      } else if (activeTab === "pending_cdrr_review") {
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

  // ── Tab config ─────────────────────────────────────────────────────────────
  const TABS = [
    { key: "all", label: "All Reports", icon: "📄" },
    { key: "NON-PICS", label: "NON-PICS", icon: "📋" },
    { key: "PICS", label: "PICS", icon: "🔬" },
    { key: "LETTER AND CORRECTION", label: "Letter & Correction", icon: "✉️" },
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

  // ── Handlers ───────────────────────────────────────────────────────────────
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

  const openView = useCallback((r) => {
    setSelectedReport(r);
    setIsViewOpen(true);
    setDropdownId(null);
  }, []);

  const openUpdate = useCallback((r) => {
    setSelectedReport(r);
    setIsUpdateOpen(true);
    setDropdownId(null);
  }, []);

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

  const handleExport = () => {
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
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── HEADER ── */}
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
            {perms.canAdd && (
              <button
                onClick={() => {
                  console.log("[Add Button] Opening add modal, perms:", perms);
                  setIsAddOpen(true);
                }}
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
        <StatCards C={C} totalRecords={totalRecords} catStats={catStats} />

        <TabBar
          C={C}
          TABS={TABS}
          activeTab={activeTab}
          catStats={catStats}
          totalRecords={totalRecords}
          onTabChange={handleTabChange}
        />

        <SearchBar
          C={C}
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onPageReset={() => setPage(1)}
          onClear={() => {
            setSearch("");
            setStatusFilter("");
            setPage(1);
          }}
        />
      </div>

      {/* ── TABLE ── */}
      <div style={{ flex: 1, padding: "0 2rem 2rem" }}>
        <ReportsTable
          C={C}
          darkMode={darkMode}
          data={data}
          loading={loading}
          activeTab={activeTab}
          page={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          sortBy={sortBy}
          sortOrder={sortOrder}
          selectedRows={selectedRows}
          dropdownId={dropdownId}
          dropdownPos={dropdownPos}
          perms={perms}
          onSort={handleSort}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          onOpenView={openView}
          onOpenUpdate={openUpdate}
          onToggleDropdown={toggleDropdown}
          onCloseDropdown={() => setDropdownId(null)}
        />

        {!loading && data.length > 0 && (
          <Pagination
            C={C}
            page={page}
            pageSize={pageSize}
            totalRecords={totalRecords}
            totalPages={totalPages}
            setPage={setPage}
            setPageSize={setPageSize}
          />
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
