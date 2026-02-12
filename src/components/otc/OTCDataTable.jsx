// FILE: src/components/otc/OTCDataTable.jsx
// ✅ FIXED: Frozen columns (#, DTN, Actions) now use SOLID backgrounds matching row colors
// ✅ All 91 columns in EXACT database order
// ✅ NEW: Sortable column headers with ▲▼ indicators

import { useState } from "react";

// ─── ALL Columns in EXACT DATABASE ORDER ──────────────────────────────────────
const OTC_COLUMNS = [
  { key: "DB_DTN", label: "DTN", width: "180px", frozen: true },
  { key: "DB_EST_CAT", label: "Est. Category", width: "150px" },
  { key: "DB_EST_LTO_COMP", label: "LTO Company", width: "200px" },
  { key: "DB_EST_LTO_ADD", label: "LTO Address", width: "250px" },
  { key: "DB_EST_EADD", label: "Email", width: "200px" },
  { key: "DB_EST_TIN", label: "TIN", width: "150px" },
  { key: "DB_EST_CONTACT_NO", label: "Contact No.", width: "150px" },
  { key: "DB_EST_LTO_NO", label: "LTO No.", width: "140px" },
  { key: "DB_EST_VALIDITY", label: "Validity", width: "140px" },
  { key: "DB_PROD_BR_NAME", label: "Brand Name", width: "200px", frozen: true },
  {
    key: "DB_PROD_GEN_NAME",
    label: "Generic Name",
    width: "200px",
    frozen: true,
  },
  { key: "DB_PROD_DOS_STR", label: "Dosage Strength", width: "150px" },
  { key: "DB_PROD_DOS_FORM", label: "Dosage Form", width: "150px" },
  { key: "DB_PROD_CLASS_PRESCRIP", label: "Prescription", width: "150px" },
  { key: "DB_PROD_ESS_DRUG_LIST", label: "Essential Drug", width: "150px" },
  { key: "DB_PROD_PHARMA_CAT", label: "Pharma Category", width: "180px" },
  { key: "DB_PROD_MANU", label: "Manufacturer", width: "200px" },
  { key: "DB_PROD_MANU_ADD", label: "Manufacturer Address", width: "250px" },
  { key: "DB_PROD_MANU_TIN", label: "Manufacturer TIN", width: "150px" },
  { key: "DB_PROD_MANU_LTO_NO", label: "Manufacturer LTO No.", width: "180px" },
  {
    key: "DB_PROD_MANU_COUNTRY",
    label: "Manufacturer Country",
    width: "180px",
  },
  { key: "DB_PROD_TRADER", label: "Trader", width: "200px" },
  { key: "DB_PROD_TRADER_ADD", label: "Trader Address", width: "250px" },
  { key: "DB_PROD_TRADER_TIN", label: "Trader TIN", width: "150px" },
  { key: "DB_PROD_TRADER_LTO_NO", label: "Trader LTO No.", width: "180px" },
  { key: "DB_PROD_TRADER_COUNTRY", label: "Trader Country", width: "160px" },
  { key: "DB_PROD_REPACKER", label: "Repacker", width: "200px" },
  { key: "DB_PROD_REPACKER_ADD", label: "Repacker Address", width: "250px" },
  { key: "DB_PROD_REPACKER_TIN", label: "Repacker TIN", width: "150px" },
  { key: "DB_PROD_REPACKER_LTO_NO", label: "Repacker LTO No.", width: "180px" },
  {
    key: "DB_PROD_REPACKER_COUNTRY",
    label: "Repacker Country",
    width: "180px",
  },
  { key: "DB_PROD_IMPORTER", label: "Importer", width: "200px" },
  { key: "DB_PROD_IMPORTER_ADD", label: "Importer Address", width: "250px" },
  { key: "DB_PROD_IMPORTER_TIN", label: "Importer TIN", width: "150px" },
  { key: "DB_PROD_IMPORTER_LTO_NO", label: "Importer LTO No.", width: "180px" },
  {
    key: "DB_PROD_IMPORTER_COUNTRY",
    label: "Importer Country",
    width: "180px",
  },
  { key: "DB_PROD_DISTRI", label: "Distributor", width: "200px" },
  { key: "DB_PROD_DISTRI_ADD", label: "Distributor Address", width: "250px" },
  { key: "DB_PROD_DISTRI_TIN", label: "Distributor TIN", width: "150px" },
  {
    key: "DB_PROD_DISTRI_LTO_NO",
    label: "Distributor LTO No.",
    width: "180px",
  },
  {
    key: "DB_PROD_DISTRI_COUNTRY",
    label: "Distributor Country",
    width: "180px",
  },
  { key: "DB_PROD_DISTRI_SHELF_LIFE", label: "Shelf Life", width: "130px" },
  { key: "DB_STORAGE_COND", label: "Storage Condition", width: "180px" },
  { key: "DB_PACKAGING", label: "Packaging", width: "150px" },
  { key: "DB_SUGG_RP", label: "Suggested RP", width: "130px" },
  { key: "DB_NO_SAMPLE", label: "No. Sample", width: "130px" },
  { key: "DB_EXPIRY_DATE", label: "Expiry Date", width: "150px" },
  { key: "DB_CPR_VALIDITY", label: "CPR Validity", width: "150px" },
  { key: "DB_REG_NO", label: "Reg. No.", width: "160px" },
  { key: "DB_APP_TYPE", label: "App Type", width: "150px" },
  { key: "DB_MOTHER_APP_TYPE", label: "Mother App Type", width: "170px" },
  { key: "DB_OLD_RSN", label: "Old RSN", width: "140px" },
  { key: "DB_AMMEND1", label: "Amendment 1", width: "150px" },
  { key: "DB_AMMEND2", label: "Amendment 2", width: "150px" },
  { key: "DB_AMMEND3", label: "Amendment 3", width: "150px" },
  { key: "DB_PROD_CAT", label: "Product Category", width: "180px" },
  { key: "DB_CERTIFICATION", label: "Certification", width: "150px" },
  { key: "DB_FEE", label: "Fee", width: "120px" },
  { key: "DB_LRF", label: "LRF", width: "120px" },
  { key: "DB_SURC", label: "SURC", width: "120px" },
  { key: "DB_TOTAL", label: "Total", width: "120px" },
  { key: "DB_OR_NO", label: "OR No.", width: "150px" },
  { key: "DB_DATE_ISSUED", label: "Date Issued", width: "150px" },
  { key: "DB_DATE_RECEIVED_FDAC", label: "Date Received FDAC", width: "180px" },
  {
    key: "DB_DATE_RECEIVED_CENT",
    label: "Date Received Central",
    width: "200px",
  },
  { key: "DB_MO", label: "MO", width: "100px" },
  { key: "DB_FILE", label: "File", width: "150px" },
  { key: "DB_SECPA", label: "SECPA", width: "130px" },
  { key: "DB_SECPA_EXP_DATE", label: "SECPA Exp Date", width: "160px" },
  { key: "DB_SECPA_ISSUED_ON", label: "SECPA Issued On", width: "170px" },
  { key: "DB_DECKING_SCHED", label: "Decking Schedule", width: "180px" },
  { key: "DB_EVAL", label: "Evaluation", width: "200px" },
  { key: "DB_DATE_DECK", label: "Date Deck", width: "150px" },
  { key: "DB_REMARKS_1", label: "Remarks 1", width: "200px" },
  { key: "DB_DATE_REMARKS", label: "Date Remarks", width: "150px" },
  { key: "DB_CLASS", label: "Class", width: "130px" },
  { key: "DB_DATE_RELEASED", label: "Date Released", width: "150px" },
  { key: "DB_TYPE_DOC_RELEASED", label: "Type Doc Released", width: "180px" },
  { key: "DB_ATTA_RELEASED", label: "Atta Released", width: "150px" },
  { key: "DB_CPR_COND", label: "CPR Condition", width: "150px" },
  { key: "DB_CPR_COND_REMARKS", label: "CPR Cond Remarks", width: "200px" },
  { key: "DB_CPR_COND_ADD_REMARKS", label: "CPR Add Remarks", width: "200px" },
  { key: "DB_APP_STATUS", label: "App Status", width: "160px" },
  { key: "DB_TRASH", label: "Trash", width: "100px" },
  { key: "DB_TRASH_DATE_ENCODED", label: "Trash Date Encoded", width: "180px" },
  { key: "DB_USER_UPLOADER", label: "Uploaded By", width: "140px" },
  { key: "DB_DATE_EXCEL_UPLOAD", label: "Uploaded At", width: "150px" },
  { key: "DB_PHARMA_PROD_CAT", label: "Pharma Prod Cat", width: "180px" },
  {
    key: "DB_PHARMA_PROD_CAT_LABEL",
    label: "Pharma Prod Cat Label",
    width: "200px",
  },
  { key: "DB_IS_IN_PM", label: "Is in PM", width: "110px" },
  {
    key: "DB_TIMELINE_CITIZEN_CHARTER",
    label: "Timeline Citizen Charter",
    width: "200px",
  },
];

// ─── Badge renderers ──────────────────────────────────────────────────────────
function DTNBadge({ value }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.4rem 0.9rem",
        background: "linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.75rem",
        fontWeight: "700",
        letterSpacing: "0.5px",
        boxShadow: "0 2px 8px rgba(139,92,246,0.3)",
      }}
    >
      <span style={{ fontSize: "0.9rem" }}>🔖</span>
      <span>{value || "N/A"}</span>
    </span>
  );
}

function GenericNameBadge({ value }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.4rem 0.9rem",
        background: "linear-gradient(135deg,#06b6d4 0%,#0891b2 100%)",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.75rem",
        fontWeight: "700",
        letterSpacing: "0.3px",
        boxShadow: "0 2px 8px rgba(6,182,212,0.3)",
      }}
    >
      <span style={{ fontSize: "0.9rem" }}>💊</span>
      <span>{value || "N/A"}</span>
    </span>
  );
}

function BrandNameBadge({ value }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.4rem 0.9rem",
        background: "linear-gradient(135deg,#f59e0b 0%,#d97706 100%)",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.75rem",
        fontWeight: "700",
        letterSpacing: "0.3px",
        boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
      }}
    >
      <span style={{ fontSize: "0.9rem" }}>🏷️</span>
      <span>{value || "N/A"}</span>
    </span>
  );
}

function AppStatusBadge({ status, colors }) {
  const s = status?.toUpperCase();
  const themes = {
    COMPLETED: {
      bg: "linear-gradient(135deg,#10b981 0%,#059669 100%)",
      shadow: "rgba(16,185,129,0.3)",
      icon: "✓",
      label: "Completed",
    },
    APPROVED: {
      bg: "linear-gradient(135deg,#3b82f6 0%,#2563eb 100%)",
      shadow: "rgba(59,130,246,0.3)",
      icon: "✅",
      label: "Approved",
    },
    PENDING: {
      bg: "linear-gradient(135deg,#eab308 0%,#ca8a04 100%)",
      shadow: "rgba(234,179,8,0.3)",
      icon: "⏸",
      label: "Pending",
    },
    TO_DO: {
      bg: "linear-gradient(135deg,#f59e0b 0%,#d97706 100%)",
      shadow: "rgba(245,158,11,0.3)",
      icon: "⏳",
      label: "To Do",
    },
    REJECTED: {
      bg: "linear-gradient(135deg,#ef4444 0%,#dc2626 100%)",
      shadow: "rgba(239,68,68,0.3)",
      icon: "✗",
      label: "Rejected",
    },
  };
  const t = themes[s] ?? {
    bg: "linear-gradient(135deg,#6b7280 0%,#4b5563 100%)",
    shadow: "rgba(107,114,128,0.3)",
    icon: "•",
    label: status || "N/A",
  };
  return (
    <span
      style={{
        padding: "0.4rem 0.9rem",
        background: t.bg,
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.75rem",
        fontWeight: "700",
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        boxShadow: `0 2px 8px ${t.shadow}`,
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
      }}
    >
      <span style={{ fontSize: "0.9rem" }}>{t.icon}</span>
      {t.label}
    </span>
  );
}

function PrescriptionBadge({ value }) {
  if (!value || value === "N/A") {
    return <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>N/A</span>;
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.35rem 0.8rem",
        background: "linear-gradient(135deg,#ec4899 0%,#be185d 100%)",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "0.75rem",
        fontWeight: "700",
        boxShadow: "0 2px 8px rgba(236,72,153,0.3)",
      }}
    >
      <span>📝</span>
      <span>{value}</span>
    </span>
  );
}

// ─── TablePagination ──────────────────────────────────────────────────────────
function TablePagination({
  currentPage,
  rowsPerPage,
  totalRecords,
  totalPages,
  indexOfFirstRow,
  indexOfLastRow,
  onPageChange,
  onRowsPerPageChange,
  colors,
}) {
  const pages = () => {
    const delta = 2;
    const range = [];
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }
    if (currentPage - delta > 2) range.unshift("...");
    if (currentPage + delta < totalPages - 1) range.push("...");
    if (totalPages > 1) {
      range.unshift(1);
      range.push(totalPages);
    } else if (totalPages === 1) {
      range.push(1);
    }
    return range;
  };

  const btnBase = {
    padding: "0.4rem 0.75rem",
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: "6px",
    fontSize: "0.8rem",
    cursor: "pointer",
    transition: "all 0.2s",
    background: colors.cardBg,
    color: colors.textPrimary,
  };

  return (
    <div
      style={{
        padding: "1rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <span style={{ fontSize: "0.85rem", color: colors.textSecondary }}>
          Showing{" "}
          <strong style={{ color: colors.textPrimary }}>
            {indexOfFirstRow}–{indexOfLastRow}
          </strong>{" "}
          of{" "}
          <strong style={{ color: colors.textPrimary }}>
            {totalRecords.toLocaleString()}
          </strong>{" "}
          records
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.8rem", color: colors.textTertiary }}>
            Rows:
          </span>
          <select
            value={rowsPerPage}
            onChange={onRowsPerPageChange}
            style={{
              padding: "0.35rem 0.5rem",
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "6px",
              color: colors.textPrimary,
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            {[25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          style={{
            ...btnBase,
            opacity: currentPage === 1 ? 0.4 : 1,
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
          }}
        >
          ← Prev
        </button>
        {pages().map((p, i) =>
          p === "..." ? (
            <span
              key={`e${i}`}
              style={{
                padding: "0 0.25rem",
                color: colors.textTertiary,
                fontSize: "0.85rem",
              }}
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={{
                ...btnBase,
                background: currentPage === p ? "#4CAF50" : colors.cardBg,
                color: currentPage === p ? "#fff" : colors.textPrimary,
                borderColor: currentPage === p ? "#4CAF50" : colors.cardBorder,
                fontWeight: currentPage === p ? "700" : "400",
              }}
            >
              {p}
            </button>
          ),
        )}
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          style={{
            ...btnBase,
            opacity: currentPage === totalPages ? 0.4 : 1,
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── Main OTCDataTable ────────────────────────────────────────────────────────
function OTCDataTable({
  data,
  selectedRows,
  onSelectRow,
  onSelectAll,
  onClearSelections,
  currentPage,
  rowsPerPage,
  totalRecords,
  totalPages,
  indexOfFirstRow,
  indexOfLastRow,
  onPageChange,
  onRowsPerPageChange,
  colors,
  activeTab,
  onRefresh,
  onEdit,
  onDelete,
  onSort,
  sortBy,
  sortOrder,
  darkMode,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0 });

  // ✅ Sort click handler
  const handleSort = (colKey) => {
    if (!onSort) return;
    if (sortBy === colKey) {
      onSort(colKey, sortOrder === "asc" ? "desc" : "asc");
    } else {
      onSort(colKey, "asc");
    }
  };

  // ✅ Sort indicator — active direction is green, inactive is dimmed
  const SortIcon = ({ colKey }) => {
    const isActive = sortBy === colKey;
    return (
      <span
        style={{
          display: "inline-flex",
          flexDirection: "column",
          marginLeft: "5px",
          lineHeight: 1,
          verticalAlign: "middle",
          gap: "1px",
        }}
      >
        <span
          style={{
            fontSize: "0.5rem",
            lineHeight: 1,
            color:
              isActive && sortOrder === "asc" ? "#4CAF50" : colors.textTertiary,
            opacity: isActive && sortOrder === "asc" ? 1 : 0.35,
          }}
        >
          ▲
        </span>
        <span
          style={{
            fontSize: "0.5rem",
            lineHeight: 1,
            color:
              isActive && sortOrder === "desc"
                ? "#4CAF50"
                : colors.textTertiary,
            opacity: isActive && sortOrder === "desc" ? 1 : 0.35,
          }}
        >
          ▼
        </span>
      </span>
    );
  };

  const renderCell = (col, row) => {
    const value = row[col.key];
    switch (col.key) {
      case "DB_DTN":
        return <DTNBadge value={value} />;
      case "DB_PROD_BR_NAME":
        return <BrandNameBadge value={value} />;
      case "DB_PROD_GEN_NAME":
        return <GenericNameBadge value={value} />;
      case "DB_APP_STATUS":
        return <AppStatusBadge status={value} colors={colors} />;
      case "DB_PROD_CLASS_PRESCRIP":
        return <PrescriptionBadge value={value} />;
      default:
        return (
          <span style={{ fontSize: "0.85rem", color: colors.tableText }}>
            {value || "N/A"}
          </span>
        );
    }
  };

  const getRowBg = (isSelected, index) => {
    if (isSelected) return darkMode ? "#0d3b1a" : "#e8f5e9";
    return index % 2 === 0
      ? darkMode
        ? "#0f0f0f"
        : "#fafafa"
      : darkMode
        ? "#1a1a1a"
        : "#ffffff";
  };

  const headerBg = darkMode ? "#141414" : "#f5f5f5";

  // ✅ Base th style — sortable columns get pointer cursor + hover
  const thStyle = (extra = {}, sortable = false) => ({
    padding: "1rem",
    textAlign: "left",
    fontSize: "0.8rem",
    fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: `1px solid ${colors.tableBorder}`,
    whiteSpace: "nowrap",
    background: headerBg,
    cursor: sortable ? "pointer" : "default",
    userSelect: "none",
    transition: "background 0.15s",
    ...extra,
  });

  return (
    <>
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          overflow: "hidden",
          transition: "all 0.3s ease",
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 420px)",
          minHeight: "400px",
          maxHeight: "calc(95vh - 420px)",
        }}
      >
        {/* Header bar */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: `1px solid ${colors.tableBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: "600",
                color: colors.textPrimary,
                margin: 0,
              }}
            >
              OTC Records
            </h3>
            <span
              style={{
                padding: "0.25rem 0.75rem",
                background: colors.badgeBg,
                borderRadius: "12px",
                fontSize: "0.8rem",
                color: colors.textTertiary,
                fontWeight: "600",
              }}
            >
              {totalRecords.toLocaleString()} records • {OTC_COLUMNS.length}{" "}
              columns
            </span>
          </div>

          {/* ✅ Show sort indicator in header bar */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            {sortBy && (
              <span
                style={{
                  fontSize: "0.75rem",
                  color: colors.textTertiary,
                  padding: "0.25rem 0.6rem",
                  background: colors.badgeBg,
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <span>Sorted by</span>
                <strong style={{ color: "#4CAF50" }}>
                  {OTC_COLUMNS.find((c) => c.key === sortBy)?.label || sortBy}
                </strong>
                <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
              </span>
            )}
            {selectedRows.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  background: colors.badgeBg,
                  borderRadius: "8px",
                }}
              >
                <span
                  style={{
                    color: "#4CAF50",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                  }}
                >
                  {selectedRows.length} selected
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable table */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowX: "auto",
            overflowY: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "12000px",
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                background: headerBg,
                zIndex: 20,
              }}
            >
              <tr>
                {/* Checkbox header — not sortable */}
                <th
                  style={thStyle(
                    {
                      width: "50px",
                      position: "sticky",
                      left: 0,
                      zIndex: 21,
                      boxShadow: "4px 0 8px rgba(0,0,0,0.15)",
                    },
                    false,
                  )}
                >
                  <input
                    type="checkbox"
                    checked={
                      selectedRows.length === data.length && data.length > 0
                    }
                    onChange={onSelectAll}
                    style={{
                      width: "16px",
                      height: "16px",
                      cursor: "pointer",
                      accentColor: "#4CAF50",
                    }}
                  />
                </th>

                {/* # header — not sortable */}
                <th
                  style={thStyle(
                    {
                      width: "60px",
                      textAlign: "center",
                      position: "sticky",
                      left: "50px",
                      zIndex: 21,
                      boxShadow: "4px 0 8px rgba(0,0,0,0.15)",
                    },
                    false,
                  )}
                >
                  #
                </th>

                {/* ✅ Data column headers — all sortable */}
                {OTC_COLUMNS.map((col, idx) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = darkMode
                        ? "#1e1e1e"
                        : "#ebebeb";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = headerBg;
                    }}
                    style={thStyle(
                      {
                        minWidth: col.width,
                        ...(col.frozen && idx < 3
                          ? {
                              position: "sticky",
                              left:
                                idx === 0
                                  ? "110px"
                                  : idx === 1
                                    ? "290px"
                                    : "490px",
                              zIndex: 21,
                              boxShadow: "4px 0 8px rgba(0,0,0,0.15)",
                            }
                          : {}),
                      },
                      true,
                    )}
                  >
                    <span
                      style={{ display: "inline-flex", alignItems: "center" }}
                    >
                      {col.label}
                      <SortIcon colKey={col.key} />
                    </span>
                  </th>
                ))}

                {/* Actions header — not sortable */}
                <th
                  style={thStyle(
                    {
                      width: "80px",
                      textAlign: "center",
                      position: "sticky",
                      right: 0,
                      zIndex: 21,
                      boxShadow: "-4px 0 8px rgba(0,0,0,0.15)",
                    },
                    false,
                  )}
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {data.map((row, index) => {
                const isSelected = selectedRows.includes(row.DB_ID);
                const solidRowBg = getRowBg(isSelected, index);

                return (
                  <tr
                    key={row.DB_ID}
                    style={{
                      background: solidRowBg,
                      transition: "background 0.2s",
                      borderLeft: isSelected
                        ? "3px solid #4CAF50"
                        : "3px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.background = darkMode
                          ? "#252525"
                          : "#f0f0f0";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = solidRowBg;
                    }}
                  >
                    {/* Checkbox */}
                    <td
                      style={{
                        padding: "1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        position: "sticky",
                        left: 0,
                        background: solidRowBg,
                        zIndex: 9,
                        boxShadow: "4px 0 8px rgba(0,0,0,0.15)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectRow(row.DB_ID)}
                        style={{
                          width: "16px",
                          height: "16px",
                          cursor: "pointer",
                          accentColor: "#4CAF50",
                        }}
                      />
                    </td>

                    {/* Row number */}
                    <td
                      style={{
                        padding: "1rem",
                        fontSize: "0.85rem",
                        fontWeight: "700",
                        color: colors.textTertiary,
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        textAlign: "center",
                        position: "sticky",
                        left: "50px",
                        background: solidRowBg,
                        zIndex: 9,
                        boxShadow: "4px 0 8px rgba(0,0,0,0.15)",
                      }}
                    >
                      {indexOfFirstRow + index}
                    </td>

                    {/* Data columns */}
                    {OTC_COLUMNS.map((col, idx) => (
                      <td
                        key={col.key}
                        style={{
                          padding: "1rem",
                          fontSize: "0.85rem",
                          color: colors.tableText,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          minWidth: col.width,
                          ...(col.frozen && idx < 3
                            ? {
                                position: "sticky",
                                left:
                                  idx === 0
                                    ? "110px"
                                    : idx === 1
                                      ? "290px"
                                      : "490px",
                                background: solidRowBg,
                                zIndex: 9,
                                fontWeight: "600",
                                boxShadow: "4px 0 8px rgba(0,0,0,0.15)",
                              }
                            : {}),
                        }}
                      >
                        {renderCell(col, row)}
                      </td>
                    ))}

                    {/* Actions */}
                    <td
                      style={{
                        padding: "1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        textAlign: "center",
                        position: "sticky",
                        right: 0,
                        background: solidRowBg,
                        zIndex: openMenuId === row.DB_ID ? 9999 : 9,
                        boxShadow: "-4px 0 8px rgba(0,0,0,0.15)",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            setMenuPos({ top: rect.bottom + window.scrollY });
                            setOpenMenuId(
                              openMenuId === row.DB_ID ? null : row.DB_ID,
                            );
                          }}
                          style={{
                            padding: "0.5rem",
                            background: "transparent",
                            border: `1px solid ${colors.cardBorder}`,
                            borderRadius: "6px",
                            color: colors.textPrimary,
                            cursor: "pointer",
                            width: "32px",
                            height: "32px",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = darkMode
                              ? "#2a2a2a"
                              : "#e0e0e0")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          ⋮
                        </button>
                        {openMenuId === row.DB_ID && (
                          <>
                            <div
                              onClick={() => setOpenMenuId(null)}
                              style={{
                                position: "fixed",
                                inset: 0,
                                zIndex: 9998,
                              }}
                            />
                            <div
                              style={{
                                position: "fixed",
                                right: "20px",
                                top: `${menuPos.top}px`,
                                background: colors.cardBg,
                                border: `1px solid ${colors.cardBorder}`,
                                borderRadius: "8px",
                                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                                minWidth: "180px",
                                zIndex: 9999,
                              }}
                            >
                              <MenuBtn
                                icon="👁️"
                                label="View Details"
                                color={colors.textPrimary}
                                hoverBg={darkMode ? "#2a2a2a" : "#f0f0f0"}
                                borderTop="none"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  alert(`View details for DTN: ${row.DB_DTN}`);
                                }}
                              />
                            </div>
                          </>
                        )}
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
            flexShrink: 0,
            borderTop: `1px solid ${colors.tableBorder}`,
            background: colors.cardBg,
          }}
        >
          <TablePagination
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            totalRecords={totalRecords}
            totalPages={totalPages}
            indexOfFirstRow={indexOfFirstRow}
            indexOfLastRow={indexOfLastRow}
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
            colors={colors}
          />
        </div>
      </div>
    </>
  );
}

function MenuBtn({ icon, label, color, hoverBg, borderTop, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "0.75rem 1rem",
        background: "transparent",
        border: "none",
        borderTop: borderTop || "none",
        color,
        fontSize: "0.85rem",
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        transition: "background 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default OTCDataTable;
