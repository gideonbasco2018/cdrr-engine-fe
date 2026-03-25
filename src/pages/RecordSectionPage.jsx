import { useState, useMemo } from "react";

/* ================================================================== */
/*  Static Data                                                         */
/* ================================================================== */
const STATIC_RECORDS = [
  {
    id: 1,
    dtn: "20231215155715",
    ltoCompany: "Khriz Pharma Trading Inc.",
    prodBrName: "Syntrexed",
    prodGenName: "Pemetrexed (As Disodium Heptahydrate)",
    appStatus: "COMPLETED",
    dateReleased: "2024-01-15",
    validity: "2026-01-15",
    recordUser: "jdoe",
    estCat: "DRUG",
    appType: "CPR-New",
    processingType: "Regular",
  },
  {
    id: 2,
    dtn: "20231222134608",
    ltoCompany: "MedCore Philippines Corp.",
    prodBrName: "Amoxicillin 500mg",
    prodGenName: "Amoxicillin Trihydrate",
    appStatus: "COMPLETED",
    dateReleased: "2024-02-03",
    validity: "2026-02-03",
    recordUser: "mcruz",
    estCat: "DRUG",
    appType: "CPR-Renewal",
    processingType: "Regular",
  },
  {
    id: 3,
    dtn: "20240105092341",
    ltoCompany: "GlobalMed Distributors Inc.",
    prodBrName: "Cetirizine HCl",
    prodGenName: "Cetirizine Hydrochloride",
    appStatus: "PENDING",
    dateReleased: null,
    validity: null,
    recordUser: "rreyes",
    estCat: "DRUG",
    appType: "LOD",
    processingType: "Priority",
  },
  {
    id: 4,
    dtn: "20240110143822",
    ltoCompany: "Sunrise Biotech Philippines",
    prodBrName: "Metformin XR 1000",
    prodGenName: "Metformin Hydrochloride",
    appStatus: "COMPLETED",
    dateReleased: "2024-03-20",
    validity: "2027-03-20",
    recordUser: "jdoe",
    estCat: "DRUG",
    appType: "CPR-New",
    processingType: "Regular",
  },
  {
    id: 5,
    dtn: "20240118091205",
    ltoCompany: "PhilHealth Generics Corp.",
    prodBrName: "Losartan 50mg",
    prodGenName: "Losartan Potassium",
    appStatus: "REJECTED",
    dateReleased: null,
    validity: null,
    recordUser: "mcruz",
    estCat: "DRUG",
    appType: "CPR-Renewal",
    processingType: "Regular",
  },
  {
    id: 6,
    dtn: "20240125163045",
    ltoCompany: "Apex Pharmaceutical Inc.",
    prodBrName: "Atorvastatin 20mg",
    prodGenName: "Atorvastatin Calcium",
    appStatus: "COMPLETED",
    dateReleased: "2024-04-11",
    validity: "2026-04-11",
    recordUser: "bsantos",
    estCat: "DRUG",
    appType: "CPR-New",
    processingType: "Priority",
  },
  {
    id: 7,
    dtn: "20240201084532",
    ltoCompany: "Forte Pharma Solutions",
    prodBrName: "Omeprazole 20mg",
    prodGenName: "Omeprazole",
    appStatus: "PENDING",
    dateReleased: null,
    validity: null,
    recordUser: "rreyes",
    estCat: "DRUG",
    appType: "LOD",
    processingType: "Regular",
  },
  {
    id: 8,
    dtn: "20240210112900",
    ltoCompany: "MedCore Philippines Corp.",
    prodBrName: "Amlodipine 5mg",
    prodGenName: "Amlodipine Besylate",
    appStatus: "COMPLETED",
    dateReleased: "2024-05-02",
    validity: "2027-05-02",
    recordUser: "jdoe",
    estCat: "DRUG",
    appType: "CPR-Renewal",
    processingType: "Regular",
  },
  {
    id: 9,
    dtn: "20240218075643",
    ltoCompany: "Khriz Pharma Trading Inc.",
    prodBrName: "Salbutamol Inhaler",
    prodGenName: "Salbutamol Sulfate",
    appStatus: "COMPLETED",
    dateReleased: "2024-05-18",
    validity: "2026-05-18",
    recordUser: "bsantos",
    estCat: "DRUG",
    appType: "CPR-New",
    processingType: "Priority",
  },
  {
    id: 10,
    dtn: "20240225141233",
    ltoCompany: "NovaMed Healthcare Inc.",
    prodBrName: "Paracetamol 500mg",
    prodGenName: "Paracetamol (Acetaminophen)",
    appStatus: "PENDING",
    dateReleased: null,
    validity: null,
    recordUser: "mcruz",
    estCat: "DRUG",
    appType: "CPR-Renewal",
    processingType: "Regular",
  },
];

/* ================================================================== */
/*  Color Scheme (matches existing system)                              */
/* ================================================================== */
function getColorScheme(darkMode) {
  if (darkMode) {
    return {
      pageBg: "#0f0f0f",
      cardBg: "#161616",
      cardBorder: "#2a2a2a",
      tableBg: "#161616",
      tableBorder: "#2a2a2a",
      tableRowEven: "#161616",
      tableRowOdd: "#1a1a1a",
      tableRowHover: "#1e1e1e",
      tableText: "#c9c9c9",
      textPrimary: "#f5f5f5",
      textSecondary: "#a0a0a0",
      textTertiary: "#666",
      badgeBg: "#222",
      inputBg: "#1e1e1e",
      inputBorder: "#333",
    };
  }
  return {
    pageBg: "#f4f6fb",
    cardBg: "#ffffff",
    cardBorder: "#e8ecf4",
    tableBg: "#ffffff",
    tableBorder: "#e8ecf4",
    tableRowEven: "#ffffff",
    tableRowOdd: "#f9fafd",
    tableRowHover: "#f0f4ff",
    tableText: "#374151",
    textPrimary: "#1a1f36",
    textSecondary: "#6b7280",
    textTertiary: "#9ca3af",
    badgeBg: "#f3f4f6",
    inputBg: "#f9fafb",
    inputBorder: "#e5e7eb",
  };
}

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */
const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const STATUS_CONFIG = {
  COMPLETED: {
    bg: "linear-gradient(135deg,#10b981,#059669)",
    shadow: "rgba(16,185,129,.3)",
    icon: "✓",
  },
  PENDING: {
    bg: "linear-gradient(135deg,#eab308,#ca8a04)",
    shadow: "rgba(234,179,8,.3)",
    icon: "⏳",
  },
  REJECTED: {
    bg: "linear-gradient(135deg,#ef4444,#dc2626)",
    shadow: "rgba(239,68,68,.3)",
    icon: "✗",
  },
};

/* ================================================================== */
/*  RecordSectionPage                                                   */
/* ================================================================== */
export default function RecordSectionPage({ darkMode = true }) {
  const colors = getColorScheme(darkMode);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [sortBy, setSortBy] = useState("dtn");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;

  const filteredData = useMemo(() => {
    let d = STATIC_RECORDS;
    if (search) {
      const s = search.toLowerCase();
      d = d.filter(
        (r) =>
          r.dtn.includes(s) ||
          r.ltoCompany.toLowerCase().includes(s) ||
          r.prodBrName.toLowerCase().includes(s) ||
          r.prodGenName.toLowerCase().includes(s) ||
          r.recordUser.toLowerCase().includes(s),
      );
    }
    if (statusFilter) d = d.filter((r) => r.appStatus === statusFilter);
    d = [...d].sort((a, b) => {
      const va = a[sortBy] ?? "";
      const vb = b[sortBy] ?? "";
      return sortOrder === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return d;
  }, [search, statusFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const pageData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  const handleSort = (key) => {
    if (sortBy === key) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const toggleRow = (id) =>
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );

  const toggleAll = () =>
    setSelectedRows(
      selectedRows.length === pageData.length ? [] : pageData.map((r) => r.id),
    );

  // Stats
  const total = STATIC_RECORDS.length;
  const completed = STATIC_RECORDS.filter(
    (r) => r.appStatus === "COMPLETED",
  ).length;
  const pending = STATIC_RECORDS.filter(
    (r) => r.appStatus === "PENDING",
  ).length;
  const rejected = STATIC_RECORDS.filter(
    (r) => r.appStatus === "REJECTED",
  ).length;

  const SortIcon = ({ col }) => {
    const active = sortBy === col;
    return (
      <span
        style={{
          display: "inline-flex",
          flexDirection: "column",
          marginLeft: 4,
          gap: 1,
          verticalAlign: "middle",
        }}
      >
        <span
          style={{
            fontSize: "0.42rem",
            lineHeight: 1,
            color:
              active && sortOrder === "asc" ? "#4CAF50" : colors.textTertiary,
            opacity: active && sortOrder === "asc" ? 1 : 0.35,
          }}
        >
          ▲
        </span>
        <span
          style={{
            fontSize: "0.42rem",
            lineHeight: 1,
            color:
              active && sortOrder === "desc" ? "#4CAF50" : colors.textTertiary,
            opacity: active && sortOrder === "desc" ? 1 : 0.35,
          }}
        >
          ▼
        </span>
      </span>
    );
  };

  return (
    <div
      style={{
        background: colors.pageBg,
        minHeight: "100vh",
        padding: "2rem",
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* ── Page Header ── */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: colors.textPrimary,
            margin: 0,
            marginBottom: "0.4rem",
          }}
        >
          Record Section
        </h1>
        <p
          style={{ color: colors.textTertiary, fontSize: "0.9rem", margin: 0 }}
        >
          Manage and review all completed application records
        </p>
      </div>

      {/* ── Stats Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {[
          {
            label: "Total Records",
            value: total,
            color: "#2196F3",
            icon: "📋",
          },
          {
            label: "Completed",
            value: completed,
            color: "#10b981",
            icon: "✅",
          },
          { label: "Pending", value: pending, color: "#eab308", icon: "⏳" },
          { label: "Rejected", value: rejected, color: "#ef4444", icon: "❌" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderLeft: `4px solid ${s.color}`,
              borderRadius: 12,
              padding: "1.1rem 1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <span style={{ fontSize: "1.6rem" }}>{s.icon}</span>
            <div>
              <div
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  color: s.color,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: colors.textTertiary,
                  fontWeight: 600,
                  marginTop: 3,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: `1px solid ${colors.tableBorder}`,
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: colors.textPrimary,
              margin: 0,
              marginRight: "0.25rem",
            }}
          >
            Records
          </h3>
          <span
            style={{
              padding: "0.2rem 0.65rem",
              background: colors.badgeBg,
              borderRadius: 12,
              fontSize: "0.78rem",
              color: colors.textTertiary,
              fontWeight: 600,
            }}
          >
            {filteredData.length} records
          </span>

          <div style={{ flex: 1 }} />

          {/* Search */}
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: colors.textTertiary,
                fontSize: "0.85rem",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="Search DTN, company, product..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                paddingLeft: 32,
                paddingRight: 12,
                paddingTop: "0.45rem",
                paddingBottom: "0.45rem",
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: 8,
                color: colors.textPrimary,
                fontSize: "0.85rem",
                outline: "none",
                width: 240,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: "0.45rem 0.85rem",
              background: colors.inputBg,
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: 8,
              color: statusFilter ? colors.textPrimary : colors.textTertiary,
              fontSize: "0.85rem",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                background: colors.tableBg,
              }}
            >
              <tr>
                {/* Checkbox */}
                <th
                  style={{
                    padding: "0.85rem 1rem",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    width: 48,
                    background: colors.tableBg,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      selectedRows.length === pageData.length &&
                      pageData.length > 0
                    }
                    onChange={toggleAll}
                    style={{
                      width: 15,
                      height: 15,
                      cursor: "pointer",
                      accentColor: "#4CAF50",
                    }}
                  />
                </th>
                {/* # */}
                <th
                  style={{
                    padding: "0.85rem 1rem",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    textAlign: "center",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    width: 52,
                    background: colors.tableBg,
                  }}
                >
                  #
                </th>
                {[
                  { label: "DTN", key: "dtn" },
                  { label: "LTO Company", key: "ltoCompany" },
                  { label: "Brand / Generic", key: "prodBrName" },
                  { label: "App Status", key: "appStatus" },
                  { label: "Date Released", key: "dateReleased" },
                  { label: "Validity", key: "validity" },
                  { label: "Record User", key: "recordUser" },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{
                      padding: "0.85rem 1rem",
                      borderBottom: `1px solid ${colors.tableBorder}`,
                      textAlign: "left",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      userSelect: "none",
                      background: colors.tableBg,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = darkMode
                        ? "#1e1e1e"
                        : "#f0f4ff")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = colors.tableBg)
                    }
                  >
                    {col.label}
                    <SortIcon col={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      color: colors.textTertiary,
                      fontSize: "0.9rem",
                    }}
                  >
                    No records found.
                  </td>
                </tr>
              )}
              {pageData.map((row, idx) => {
                const sel = selectedRows.includes(row.id);
                const hov = hoveredRow === row.id;
                const statusCfg = STATUS_CONFIG[row.appStatus] ?? {
                  bg: "linear-gradient(135deg,#6b7280,#4b5563)",
                  shadow: "rgba(107,114,128,.3)",
                  icon: "•",
                };
                const rowBg = sel
                  ? darkMode
                    ? "#1a2e1a"
                    : "#edf7ed"
                  : hov
                    ? colors.tableRowHover
                    : idx % 2 === 0
                      ? colors.tableRowEven
                      : colors.tableRowOdd;

                return (
                  <tr
                    key={row.id}
                    style={{
                      background: rowBg,
                      transition: "background .15s",
                      borderLeft: sel
                        ? "3px solid #4CAF50"
                        : "3px solid transparent",
                    }}
                    onMouseEnter={() => setHoveredRow(row.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {/* Checkbox */}
                    <td
                      style={{
                        padding: "0.85rem 1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => toggleRow(row.id)}
                        style={{
                          width: 15,
                          height: 15,
                          cursor: "pointer",
                          accentColor: "#4CAF50",
                        }}
                      />
                    </td>

                    {/* # */}
                    <td
                      style={{
                        padding: "0.85rem 1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        textAlign: "center",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: colors.textTertiary,
                      }}
                    >
                      {(currentPage - 1) * rowsPerPage + idx + 1}
                    </td>

                    {/* DTN */}
                    <td
                      style={{
                        padding: "0.85rem 1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          padding: "0.35rem 0.85rem",
                          background: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
                          color: "#fff",
                          borderRadius: 7,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          boxShadow: "0 2px 8px rgba(139,92,246,.3)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {row.dtn}
                      </span>
                    </td>

                    {/* LTO Company */}
                    <td
                      style={{
                        padding: "0.85rem 1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        maxWidth: 200,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: colors.tableText,
                          display: "block",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {row.ltoCompany}
                      </span>
                    </td>

                    {/* Brand / Generic */}
                    <td
                      style={{
                        padding: "0.85rem 1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        maxWidth: 220,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: colors.textPrimary,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {row.prodBrName}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: colors.textTertiary,
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {row.prodGenName}
                      </div>
                    </td>

                    {/* App Status */}
                    <td
                      style={{
                        padding: "0.85rem 1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          padding: "0.35rem 0.85rem",
                          background: statusCfg.bg,
                          color: "#fff",
                          borderRadius: 7,
                          fontSize: "0.73rem",
                          fontWeight: 700,
                          letterSpacing: "0.4px",
                          textTransform: "uppercase",
                          boxShadow: `0 2px 8px ${statusCfg.shadow}`,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <span>{statusCfg.icon}</span>
                        {row.appStatus}
                      </span>
                    </td>

                    {/* Date Released */}
                    <td
                      style={{
                        padding: "0.85rem 1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.dateReleased ? (
                        <span
                          style={{
                            fontSize: "0.82rem",
                            color: colors.tableText,
                          }}
                        >
                          📅 {formatDate(row.dateReleased)}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "0.78rem",
                            color: colors.textTertiary,
                            fontStyle: "italic",
                          }}
                        >
                          —
                        </span>
                      )}
                    </td>

                    {/* Validity */}
                    <td
                      style={{
                        padding: "0.85rem 1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.validity ? (
                        <span
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color:
                              new Date(row.validity) < new Date()
                                ? "#ef4444"
                                : "#10b981",
                          }}
                        >
                          {new Date(row.validity) < new Date() ? "🚨" : "🟢"}{" "}
                          {formatDate(row.validity)}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "0.78rem",
                            color: colors.textTertiary,
                            fontStyle: "italic",
                          }}
                        >
                          —
                        </span>
                      )}
                    </td>

                    {/* Record User */}
                    <td
                      style={{
                        padding: "0.85rem 1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background:
                              "linear-gradient(135deg,#2196F3,#1565c0)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            color: "#fff",
                            flexShrink: 0,
                          }}
                        >
                          {row.recordUser.slice(0, 2).toUpperCase()}
                        </div>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            color: colors.tableText,
                          }}
                        >
                          {row.recordUser}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            padding: "0.85rem 1.5rem",
            borderTop: `1px solid ${colors.tableBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "0.78rem", color: colors.textTertiary }}>
            Showing{" "}
            {Math.min((currentPage - 1) * rowsPerPage + 1, filteredData.length)}
            –{Math.min(currentPage * rowsPerPage, filteredData.length)} of{" "}
            {filteredData.length} records
            {selectedRows.length > 0 && (
              <span
                style={{
                  marginLeft: "0.75rem",
                  color: "#4CAF50",
                  fontWeight: 700,
                }}
              >
                · {selectedRows.length} selected
              </span>
            )}
          </span>
          <div
            style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}
          >
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: "0.4rem 0.85rem",
                borderRadius: 7,
                border: `1px solid ${colors.cardBorder}`,
                background: currentPage === 1 ? "transparent" : colors.inputBg,
                color:
                  currentPage === 1 ? colors.textTertiary : colors.textPrimary,
                fontSize: "0.82rem",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 7,
                  border: `1px solid ${p === currentPage ? "#2196F3" : colors.cardBorder}`,
                  background: p === currentPage ? "#2196F3" : "transparent",
                  color: p === currentPage ? "#fff" : colors.textSecondary,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  fontWeight: p === currentPage ? 700 : 400,
                }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: "0.4rem 0.85rem",
                borderRadius: 7,
                border: `1px solid ${colors.cardBorder}`,
                background:
                  currentPage === totalPages ? "transparent" : colors.inputBg,
                color:
                  currentPage === totalPages
                    ? colors.textTertiary
                    : colors.textPrimary,
                fontSize: "0.82rem",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                opacity: currentPage === totalPages ? 0.5 : 1,
              }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
