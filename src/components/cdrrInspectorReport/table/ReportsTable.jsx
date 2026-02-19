import { useRef, useEffect, useState } from "react";
import {
  Pill,
  TimelinePill,
  StatusPill,
  CatPill,
  SortIcon,
} from "../shared/Badges";
import DoctrackModal from "../../reports/actions/DoctrackModal";

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  return !d
    ? "—"
    : new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
}

function fmtDT(d) {
  return !d
    ? "—"
    : new Date(d).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
}

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

// ── Color mapper: C (CDRR) → colors (Reports/DoctrackModal format) ────────────
function mapColors(C) {
  return {
    cardBg: C.card,
    cardBorder: C.border,
    tableBg: C.tHeadBg,
    tableBorder: C.border,
    tableText: C.txt,
    tableRowEven: C.card,
    tableRowOdd: C.card,
    tableRowHover: C.rowHover,
    textPrimary: C.txt,
    textSecondary: C.txt2,
    textTertiary: C.txt3,
    badgeBg: C.pill,
  };
}

// ── ReportsTable ─────────────────────────────────────────────────────────────
export default function ReportsTable({
  C,
  darkMode,
  data,
  loading,
  activeTab,
  page,
  pageSize,
  totalRecords,
  sortBy,
  sortOrder,
  selectedRows,
  dropdownId,
  dropdownPos,
  perms,
  onSort,
  onToggleRow,
  onToggleAll,
  onOpenView,
  onOpenUpdate,
  onToggleDropdown,
  onCloseDropdown,
}) {
  const dropdownRef = useRef(null);
  const [doctrackRecord, setDoctrackRecord] = useState(null);

  const showFROO = [
    "all",
    "NON-PICS",
    "pending_froo",
    "pending_cdrr_review",
  ].includes(activeTab);
  const showSec = ["all", "NON-PICS", "pending_cdrr_review"].includes(
    activeTab,
  );

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
        onCloseDropdown();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [dropdownId, onCloseDropdown]);

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

  // ── Dropdown button style ─────────────────────────────────────────────────
  const dropdownBtnStyle = {
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
  };

  return (
    <>
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: C.shadow,
        }}
      >
        {/* Table label bar */}
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
                      onChange={onToggleAll}
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
                      onClick={col ? () => onSort(col) : undefined}
                      style={{
                        ...thS,
                        minWidth: w,
                        cursor: col ? "pointer" : "default",
                        borderRight: br ? `2px solid ${C.border}` : undefined,
                      }}
                    >
                      {lbl}
                      {col && (
                        <SortIcon
                          col={col}
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      )}
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
                          borderRight: br ? `2px solid ${C.frooV}` : undefined,
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
                          borderRight: br ? `2px solid ${C.cdrrO}` : undefined,
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
                        if (!sel) e.currentTarget.style.background = C.rowHover;
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
                          onChange={() => onToggleRow(item.id)}
                          style={{ cursor: "pointer", accentColor: "#16a34a" }}
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
                        <StatusPill
                          status={item.status}
                          C={C}
                          darkMode={darkMode}
                        />
                      </td>
                      <td style={{ ...tdS, color: C.txt2 }}>
                        {fmtDate(item.released_date)}
                      </td>
                      <td style={{ ...tdS, color: C.txt2 }}>
                        {fmtDate(item.overall_deadline)}
                      </td>
                      <td style={tdS}>
                        <CatPill
                          cat={item.category}
                          C={C}
                          darkMode={darkMode}
                        />
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
                          C={C}
                          darkMode={darkMode}
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
                            {fmtDate(item.froo_report?.date_extension_approved)}
                          </td>
                          <td
                            style={{
                              ...tdS,
                              background: darkMode ? "#1a0f2e" : C.frooBg,
                            }}
                          >
                            <StatusPill
                              status={item.froo_report?.status}
                              C={C}
                              darkMode={darkMode}
                            />
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
                              C={C}
                              darkMode={darkMode}
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
                            {fmtDate(item.cdrr_secondary?.certificate_validity)}
                          </td>
                          <td
                            style={{
                              ...tdS,
                              background: darkMode ? "#2e1a0f" : C.cdrrBg,
                            }}
                          >
                            <StatusPill
                              status={item.cdrr_secondary?.status}
                              C={C}
                              darkMode={darkMode}
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
                              C={C}
                              darkMode={darkMode}
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

                      {/* ── ACTIONS ── */}
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
                          <div style={{ position: "relative" }}>
                            <button
                              id={`ab-${item.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleDropdown(item.id, e);
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
                                  e.currentTarget.style.borderColor = C.border;
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
                                  onClick={onCloseDropdown}
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
                                    minWidth: "175px",
                                    zIndex: 999,
                                    overflow: "hidden",
                                    padding: "0.3rem",
                                  }}
                                >
                                  {/* View Details */}
                                  <button
                                    onClick={() => onOpenView(item)}
                                    style={dropdownBtnStyle}
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

                                  {/* Update */}
                                  {perms.canUpdate && (
                                    <button
                                      onClick={() => onOpenUpdate(item)}
                                      style={dropdownBtnStyle}
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

                                  {/* View Doctrack */}
                                  <button
                                    onClick={() => {
                                      setDoctrackRecord(item);
                                      onCloseDropdown();
                                    }}
                                    style={dropdownBtnStyle}
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
                                          ? "rgba(59,130,246,0.15)"
                                          : "#dbeafe",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "0.76rem",
                                      }}
                                    >
                                      📋
                                    </span>
                                    View Doctrack
                                  </button>
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

      {/* ── DOCTRACK MODAL ── */}
      {doctrackRecord && (
        <DoctrackModal
          record={{ dtn: doctrackRecord.dtn }}
          onClose={() => setDoctrackRecord(null)}
          colors={mapColors(C)}
        />
      )}
    </>
  );
}
