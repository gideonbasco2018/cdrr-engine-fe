import { useState } from "react";
import { tableColumns, COLUMN_DB_KEY_MAP } from "./tableColumns";
// ↑ tableColumns now exports COLUMN_DB_KEY_MAP — keys aligned with API response field names
import TablePagination from "./TablePagination";
import ViewDetailsModal from "./ViewDetailsModal";
import DoctrackModal from "../../components/reports/actions/DoctrackModal";
import ApplicationLogsModal from "./ApplicationLogsModal";
import ChangeLogModal from "../tasks/ChangeLogModal";
import { markWorkflowTasksAsReceived } from "../../api/workflow-tasks";

// ── Deadline Helpers ──────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0];

const countWorkingDays = (startStr, endStr) => {
  if (!endStr) return null;
  let count = 0;
  const current = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  if (end <= current) return 0;
  while (current < end) {
    current.setDate(current.getDate() + 1);
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
};

const getDeadlineUrgency = (deadlineDateStr) => {
  if (!deadlineDateStr) return null;
  const today = new Date(todayStr() + "T00:00:00");
  const end = new Date(deadlineDateStr + "T00:00:00");
  if (end < today) return "overdue";
  if (end.toDateString() === today.toDateString()) return "today";
  const wdays = countWorkingDays(todayStr(), deadlineDateStr);
  if (wdays <= 3) return "critical";
  if (wdays <= 5) return "warning";
  return "ok";
};

const URGENCY_CONFIG = {
  overdue: {
    bg: "rgba(239,68,68,0.12)",
    color: "#fca5a5",
    border: "#ef4444",
    icon: "🚨",
  },
  today: {
    bg: "rgba(249,115,22,0.12)",
    color: "#fdba74",
    border: "#f97316",
    icon: "🔴",
  },
  critical: {
    bg: "rgba(245,158,11,0.12)",
    color: "#fcd34d",
    border: "#f59e0b",
    icon: "🟠",
  },
  warning: {
    bg: "rgba(234,179,8,0.10)",
    color: "#fde68a",
    border: "#eab308",
    icon: "🟡",
  },
  ok: {
    bg: "rgba(16,185,129,0.08)",
    color: "#6ee7b7",
    border: "#10b981",
    icon: "🟢",
  },
};

function DataTable({
  data,
  selectedRows,
  onSelectRow,
  onSelectAll,
  currentPage,
  rowsPerPage,
  totalRecords,
  totalPages,
  onPageChange,
  onRowsPerPageChange,
  colors,
  activeTab,
  onRefresh,
  onClearSelections,
  indexOfFirstRow,
  indexOfLastRow,
  darkMode,
  onSort,
  sortBy,
  sortOrder,
  // ── Unread props from TaskPage ──
  readIds = new Set(),
  onMarkAsRead,
  // ── Sub-tab ──
  activeSubTab = "not_yet",
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedRowDetails, setSelectedRowDetails] = useState(null);
  const [doctrackModalRecord, setDoctrackModalRecord] = useState(null);
  const [appLogsRecord, setAppLogsRecord] = useState(null);
  const [changeLogRecord, setChangeLogRecord] = useState(null);
  const [markingReceived, setMarkingReceived] = useState(false);
  // ── Confirm before marking as received ──
  const [confirmReceive, setConfirmReceive] = useState(false);

  // ── FIX: Track hovered row so sticky cells sync their background ──
  const [hoveredRowId, setHoveredRowId] = useState(null);

  const isComplianceTab = activeTab === "Compliance";
  const showMarkAsReceived = activeSubTab !== "received";

  const visibleColumns = tableColumns.filter(
    (col) => !col.complianceOnly || isComplianceTab,
  );

  /* ── Sort helpers ── */
  const getDbKey = (k) => COLUMN_DB_KEY_MAP[k] || k;
  const handleSort = (k) => {
    if (!onSort || k === "statusTimeline" || k === "deadlineDate") return;
    const db = getDbKey(k);
    onSort(db, sortBy === db && sortOrder === "asc" ? "desc" : "asc");
  };

  const SortIcon = ({ colKey }) => {
    if (colKey === "statusTimeline" || colKey === "deadlineDate") return null;
    const db = getDbKey(colKey);
    const on = sortBy === db;
    return (
      <span
        style={{
          display: "inline-flex",
          flexDirection: "column",
          marginLeft: 4,
          lineHeight: 1,
          verticalAlign: "middle",
          gap: 1,
        }}
      >
        <span
          style={{
            fontSize: "0.48rem",
            lineHeight: 1,
            color: on && sortOrder === "asc" ? "#4CAF50" : colors.textTertiary,
            opacity: on && sortOrder === "asc" ? 1 : 0.3,
          }}
        >
          ▲
        </span>
        <span
          style={{
            fontSize: "0.48rem",
            lineHeight: 1,
            color: on && sortOrder === "desc" ? "#4CAF50" : colors.textTertiary,
            opacity: on && sortOrder === "desc" ? 1 : 0.3,
          }}
        >
          ▼
        </span>
      </span>
    );
  };

  const activeSortLabel = (() => {
    const e = Object.entries(COLUMN_DB_KEY_MAP).find(([, db]) => db === sortBy);
    if (!e) return sortBy;
    return tableColumns.find((c) => c.key === e[0])?.label || sortBy;
  })();

  /* ── Timeline ── */
  const calcTimeline = (row) => {
    const {
      dateReceivedCent,
      dateReleased,
      dbTimelineCitizenCharter: tl,
    } = row;
    if (!dateReceivedCent || !tl || dateReceivedCent === "N/A" || tl === null)
      return { status: "", days: 0 };
    const r = new Date(dateReceivedCent);
    const e =
      dateReleased && dateReleased !== "N/A"
        ? new Date(dateReleased)
        : new Date();
    if (isNaN(r) || isNaN(e)) return { status: "", days: 0 };
    const d = Math.ceil(Math.abs(e - r) / 864e5);
    return d <= parseInt(tl, 10)
      ? { status: "WITHIN", days: d }
      : { status: "BEYOND", days: d };
  };

  const renderTimeline = (row) => {
    const { status, days } = calcTimeline(row);
    if (!status)
      return (
        <span style={{ color: colors.textTertiary, fontSize: "0.8rem" }}>
          N/A
        </span>
      );
    const ok = status === "WITHIN";
    return (
      <span
        style={{
          padding: "0.4rem 0.9rem",
          background: ok
            ? "linear-gradient(135deg,#10b981,#059669)"
            : "linear-gradient(135deg,#ef4444,#dc2626)",
          color: "#fff",
          borderRadius: 8,
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          boxShadow: ok
            ? "0 2px 8px rgba(16,185,129,.3)"
            : "0 2px 8px rgba(239,68,68,.3)",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <span>{ok ? "✓" : "⚠"}</span>
        {ok ? `Within (${days}d)` : `Beyond (${days}d)`}
      </span>
    );
  };

  /* ── Deadline renderer ── */
  const renderDeadline = (row) => {
    const dl = row.deadlineDate;
    if (!dl)
      return (
        <span
          style={{
            color: colors.textTertiary,
            fontSize: "0.78rem",
            fontStyle: "italic",
          }}
        >
          —
        </span>
      );
    const urgency = getDeadlineUrgency(dl);
    const cfg = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.ok;
    const wdays = countWorkingDays(todayStr(), dl);
    const dateLabel = new Date(dl + "T00:00:00").toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <span
          style={{ fontSize: "0.78rem", fontWeight: 600, color: cfg.color }}
        >
          {cfg.icon} {dateLabel}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.15rem 0.5rem",
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            borderRadius: 4,
            fontSize: "0.65rem",
            fontWeight: 700,
            color: cfg.color,
            width: "fit-content",
          }}
        >
          {urgency === "overdue"
            ? "🚨 OVERDUE"
            : urgency === "today"
              ? "🔴 DUE TODAY"
              : `${wdays} working day${wdays !== 1 ? "s" : ""} left`}
        </span>
      </div>
    );
  };

  /* ── Cell renderers ── */
  const pill = (bg, shadow, text) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.4rem 0.9rem",
        background: bg,
        color: "#fff",
        borderRadius: 8,
        fontSize: "0.75rem",
        fontWeight: 700,
        boxShadow: `0 2px 8px ${shadow}`,
      }}
    >
      {text || "N/A"}
    </span>
  );

  const renderDTN = (v) =>
    pill("linear-gradient(135deg,#8b5cf6,#7c3aed)", "rgba(139,92,246,.3)", v);
  const renderGenericName = (v) =>
    pill("linear-gradient(135deg,#06b6d4,#0891b2)", "rgba(6,182,212,.3)", v);
  const renderBrandName = (v) =>
    pill("linear-gradient(135deg,#f59e0b,#d97706)", "rgba(245,158,11,.3)", v);

  const renderTypeDoc = (typeDoc) => {
    const u = typeDoc?.toUpperCase();
    if (u?.includes("CPR"))
      return pill(
        "linear-gradient(135deg,#10b981,#059669)",
        "rgba(16,185,129,.3)",
        typeDoc,
      );
    if (u?.includes("LOD"))
      return pill(
        "linear-gradient(135deg,#ef4444,#dc2626)",
        "rgba(239,68,68,.3)",
        typeDoc,
      );
    if (u?.includes("CERT"))
      return pill(
        "linear-gradient(135deg,#3b82f6,#2563eb)",
        "rgba(59,130,246,.3)",
        typeDoc,
      );
    return (
      <span style={{ fontSize: "0.85rem", color: colors.tableText }}>
        {typeDoc || "N/A"}
      </span>
    );
  };

  const renderStatus = (status) => {
    const u = status?.toUpperCase();
    const map = {
      COMPLETED: {
        bg: "linear-gradient(135deg,#10b981,#059669)",
        sh: "rgba(16,185,129,.3)",
        icon: "✓",
        label: "Completed",
      },
      TO_DO: {
        bg: "linear-gradient(135deg,#f59e0b,#d97706)",
        sh: "rgba(245,158,11,.3)",
        icon: "⏳",
        label: "To Do",
      },
      APPROVED: {
        bg: "linear-gradient(135deg,#3b82f6,#2563eb)",
        sh: "rgba(59,130,246,.3)",
        icon: "✅",
        label: "Approved",
      },
      PENDING: {
        bg: "linear-gradient(135deg,#eab308,#ca8a04)",
        sh: "rgba(234,179,8,.3)",
        icon: "⏸",
        label: "Pending",
      },
      REJECTED: {
        bg: "linear-gradient(135deg,#ef4444,#dc2626)",
        sh: "rgba(239,68,68,.3)",
        icon: "✗",
        label: "Rejected",
      },
    };
    const c = map[u] || {
      bg: "linear-gradient(135deg,#6b7280,#4b5563)",
      sh: "rgba(107,114,128,.3)",
      icon: "•",
      label: status || "N/A",
    };
    return (
      <span
        style={{
          padding: "0.4rem 0.9rem",
          background: c.bg,
          color: "#fff",
          borderRadius: 8,
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          boxShadow: `0 2px 8px ${c.sh}`,
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <span>{c.icon}</span>
        {c.label}
      </span>
    );
  };

  /* ── Central cell renderer ── */
  // ── Reusable plain text cell (muted N/A fallback) ──
  const plainCell = (v) =>
    v != null && v !== "" ? (
      <span style={{ fontSize: "0.85rem", color: colors.tableText }}>{v}</span>
    ) : (
      <span
        style={{
          color: colors.textTertiary,
          fontSize: "0.8rem",
          fontStyle: "italic",
        }}
      >
        N/A
      </span>
    );

  // ── Long-text cell (wraps, useful for remarks / CPR conditions) ──
  const wrapCell = (v) =>
    v != null && v !== "" ? (
      <span
        style={{
          fontSize: "0.82rem",
          color: colors.tableText,
          whiteSpace: "normal",
          wordBreak: "break-word",
          lineHeight: 1.5,
        }}
      >
        {v}
      </span>
    ) : (
      <span
        style={{
          color: colors.textTertiary,
          fontSize: "0.8rem",
          fontStyle: "italic",
        }}
      >
        N/A
      </span>
    );

  // ── Numeric / currency cell ──
  const numCell = (v) =>
    v != null && v !== "" ? (
      <span
        style={{
          fontSize: "0.85rem",
          color: colors.tableText,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {Number(v).toLocaleString()}
      </span>
    ) : (
      <span
        style={{
          color: colors.textTertiary,
          fontSize: "0.8rem",
          fontStyle: "italic",
        }}
      >
        —
      </span>
    );

  const renderCell = (col, row) => {
    const v = row[col.key];
    switch (col.key) {
      // ── Styled badges ──────────────────────────────────────────────────────
      case "dtn":
        return renderDTN(v);
      case "prodGenName":
        return renderGenericName(v);
      case "prodBrName":
        return renderBrandName(v);
      case "appStatus":
        return renderStatus(v);
      case "statusTimeline":
        return renderTimeline(row);
      case "typeDocReleased":
        return renderTypeDoc(v);
      case "deadlineDate":
        return renderDeadline(row);

      case "dbTimelineCitizenCharter":
        return plainCell(v);

      // ── Numeric columns ────────────────────────────────────────────────────
      case "fee":
      case "lrf":
      case "surc":
      case "total":
        return numCell(v);

      // ── Amendment columns (plain, short) ──────────────────────────────────
      case "ammend1":
      case "ammend2":
      case "ammend3":
        return plainCell(v);

      // ── Long-text / remarks columns (wrap text) ────────────────────────────
      case "cprCondRemarks":
      case "cprCondAddRemarks":
      case "appRemarks":
      case "remarks1":
        return wrapCell(v);

      // ── CPR Condition badge ───────────────────────────────────────────────
      case "cprCond":
        return v ? (
          <span
            style={{
              padding: "0.3rem 0.7rem",
              background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
              color: "#fff",
              borderRadius: 6,
              fontSize: "0.72rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              boxShadow: "0 2px 6px rgba(124,58,237,0.3)",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {v}
          </span>
        ) : (
          plainCell(null)
        );

      // ── SECPA badge ───────────────────────────────────────────────────────
      case "secpa":
        return v ? (
          <span
            style={{
              padding: "0.3rem 0.7rem",
              background: "linear-gradient(135deg,#0891b2,#0e7490)",
              color: "#fff",
              borderRadius: 6,
              fontSize: "0.72rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              boxShadow: "0 2px 6px rgba(8,145,178,0.3)",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {v}
          </span>
        ) : (
          plainCell(null)
        );

      // ── Atta Released (same style as typeDoc) ─────────────────────────────
      case "attaReleased":
        return renderTypeDoc(v);

      // ── Certification badge ───────────────────────────────────────────────
      case "certification":
        return v ? (
          <span
            style={{
              padding: "0.3rem 0.7rem",
              background: "linear-gradient(135deg,#d97706,#b45309)",
              color: "#fff",
              borderRadius: 6,
              fontSize: "0.72rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              boxShadow: "0 2px 6px rgba(217,119,6,0.3)",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {v}
          </span>
        ) : (
          plainCell(null)
        );

      // ── Default: plain text ───────────────────────────────────────────────
      default:
        return plainCell(v);
    }
  };

  /* ── Action menu helpers ── */
  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const openDetails = (r) => {
    setOpenMenuId(null);
    onMarkAsRead?.(r.id);
    setSelectedRowDetails(r);
  };
  const openDoctrack = (r) => {
    setOpenMenuId(null);
    onMarkAsRead?.(r.id);
    setDoctrackModalRecord(r);
  };
  const openAppLogs = (r) => {
    setOpenMenuId(null);
    onMarkAsRead?.(r.id);
    setAppLogsRecord(r);
  };
  const openChangeLog = (r) => {
    setOpenMenuId(null);
    onMarkAsRead?.(r.id);
    setChangeLogRecord(r);
  };

  /* ── Mark as Received handler (bulk) ── */
  const handleMarkAsReceived = async () => {
    if (!selectedRows.length || markingReceived) return;
    setMarkingReceived(true);
    try {
      await markWorkflowTasksAsReceived(selectedRows);
      if (onClearSelections) onClearSelections();
      if (onRefresh) await onRefresh();
    } catch (e) {
      console.error("Mark as Received error:", e);
    } finally {
      setMarkingReceived(false);
    }
  };

  /* ── Generate Transmittal PDF ── */
  const handleGenerateTransmittal = async () => {
    if (!selectedRows.length) return;

    const loadScript = (src) =>
      new Promise((res, rej) => {
        if (document.querySelector(`script[src="${src}"]`)) return res();
        const s = document.createElement("script");
        s.src = src;
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
      });

    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    );
    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",
    );
    await loadScript(
      "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js",
    );

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const selectedData = data.filter((r) => selectedRows.includes(r.id));
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const generateBarcodeDataURL = (value) => {
      try {
        const canvas = document.createElement("canvas");
        window.JsBarcode(canvas, String(value), {
          format: "CODE128",
          width: 1.4,
          height: 14, // compact height
          displayValue: false,
          margin: 1, // tight margin
          background: "#ffffff",
          lineColor: "#000000",
        });
        return canvas.toDataURL("image/png");
      } catch {
        return null;
      }
    };

    const barcodeImages = selectedData.map((r) =>
      generateBarcodeDataURL(r.dtn && r.dtn !== "N/A" ? r.dtn : "N/A"),
    );

    // ── Compact header (smaller = more space for rows) ──
    doc.setFillColor(25, 118, 210);
    doc.rect(0, 0, pageW, 16, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TRANSMITTAL SLIP", 10, 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`FDA Center for Drug Regulation and Research (CDRR)`, 10, 13);

    doc.setFontSize(7);
    doc.text(`Generated: ${dateStr}  ${timeStr}`, pageW - 10, 7, {
      align: "right",
    });
    doc.text(`Total records: ${selectedData.length}`, pageW - 10, 13, {
      align: "right",
    });

    // ── Columns ─────────────────────────────────────────────────────────────
    const cols = [
      { header: "#", dataKey: "_no" },
      { header: "Barcode", dataKey: "_barcode" },
      { header: "DTN", dataKey: "dtn" },
      { header: "Category", dataKey: "estCat" },
      { header: "LTO Company", dataKey: "ltoCompany" },
      { header: "Product Information", dataKey: "_productInfo" },
      { header: "Dosage", dataKey: "_dosage" },
      { header: "App No.", dataKey: "regNo" },
      { header: "App Type", dataKey: "_appTypeFull" },
      { header: "Date Rcvd FDAC", dataKey: "dateReceivedFdac" },
    ];

    const rows = selectedData.map((r, i) => {
      // ── Product Information: labeled Brand Name + Generic Name ──
      const brand =
        r.prodBrName && r.prodBrName !== "N/A" ? `Brand: ${r.prodBrName}` : "";
      const generic =
        r.prodGenName && r.prodGenName !== "N/A"
          ? `Generic: ${r.prodGenName}`
          : "";
      const productInfo = [brand, generic].filter(Boolean).join("\n") || "—";

      // ── Dosage: Strength + Form combined ──
      const strength =
        r.prodDosStr && r.prodDosStr !== "N/A" ? r.prodDosStr : "";
      const form =
        r.prodDosForm && r.prodDosForm !== "N/A" ? r.prodDosForm : "";
      const dosage = [strength, form].filter(Boolean).join(" / ") || "—";

      // ── App Type + amendments (include only non-empty ones) ──
      const amendments = [r.ammend1, r.ammend2, r.ammend3]
        .filter((a) => a && a !== "N/A" && a.trim() !== "")
        .join(" / ");
      const appTypeFull = [r.appType ?? "—", amendments]
        .filter(Boolean)
        .join("\n");

      return {
        _no: i + 1,
        _barcode: "",
        dtn: r.dtn ?? "—",
        estCat: r.estCat ?? "—",
        ltoCompany: r.ltoCompany ?? "—",
        _productInfo: productInfo,
        _dosage: dosage,
        regNo: r.regNo ?? "—",
        _appTypeFull: appTypeFull,
        dateReceivedFdac: r.dateReceivedFdac ?? "—",
      };
    });

    // Compact fixed sizes
    const BARCODE_ROW_H = 10; // minimum row height — tight
    const BARCODE_IMG_W = 24;
    const BARCODE_IMG_H = 5;

    doc.autoTable({
      startY: 18, // starts right after compact header
      columns: cols,
      body: rows,
      theme: "grid",
      styles: {
        fontSize: 6.5, // smaller font = more rows per page
        cellPadding: 1.2, // tight padding
        overflow: "linebreak",
        textColor: [30, 30, 30],
        minCellHeight: BARCODE_ROW_H,
        valign: "middle",
        lineWidth: 0.1, // thinner grid lines
      },
      headStyles: {
        fillColor: [21, 101, 192],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 6.5,
        halign: "center",
        minCellHeight: 7,
        valign: "middle",
        cellPadding: 1,
      },
      alternateRowStyles: { fillColor: [240, 247, 255] },
      margin: { left: 6, right: 6 }, // tighter page margins
      columnStyles: {
        _no: { halign: "center", cellWidth: 7, valign: "middle" },
        _barcode: { cellWidth: 28, halign: "center", valign: "middle" },
        dtn: {
          cellWidth: 28,
          halign: "center",
          valign: "middle",
          fontStyle: "bold",
        },
        estCat: { cellWidth: 14, valign: "middle" },
        ltoCompany: { cellWidth: 42, valign: "middle" },
        _productInfo: { cellWidth: 48, valign: "middle" },
        _dosage: { cellWidth: 30, valign: "middle" },
        regNo: { cellWidth: 22, halign: "center", valign: "middle" },
        _appTypeFull: { cellWidth: 34, valign: "middle" },
        dateReceivedFdac: { cellWidth: 22, halign: "center", valign: "middle" },
      },
      // ── Draw barcode image centered in the barcode cell ──
      didDrawCell: (hookData) => {
        if (
          hookData.section === "body" &&
          hookData.column.dataKey === "_barcode"
        ) {
          const imgData = barcodeImages[hookData.row.index];
          if (imgData) {
            const cell = hookData.cell;
            // Center the fixed-size barcode image within the cell
            const imgX = cell.x + (cell.width - BARCODE_IMG_W) / 2;
            const imgY = cell.y + (cell.height - BARCODE_IMG_H) / 2;
            doc.addImage(
              imgData,
              "PNG",
              imgX,
              imgY,
              BARCODE_IMG_W,
              BARCODE_IMG_H,
            );
          }
        }
      },
      didDrawPage: () => {
        // Footer is written in a second pass AFTER autoTable finishes
        // so that the correct total page count is known. See below.
      },
    });

    // ── Two-pass footer: now that all pages exist, write correct "X of N" ──
    const totalPages = doc.internal.getNumberOfPages();
    for (let pg = 1; pg <= totalPages; pg++) {
      doc.setPage(pg);
      // White-out the footer area first (covers any partial text from first pass)
      doc.setFillColor(255, 255, 255);
      doc.rect(0, pageH - 8, pageW, 8, "F");
      // Draw correct footer
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(
        `Page ${pg} of ${totalPages}  |  FDA CDRR Engine — Transmittal Slip`,
        pageW / 2,
        pageH - 3,
        { align: "center" },
      );
      doc.setTextColor(30, 30, 30);
    }
    // Return to last page for the signature block
    doc.setPage(totalPages);

    const finalY = doc.lastAutoTable.finalY + 6;
    if (finalY < pageH - 26) {
      let preparedBy = "";
      try {
        const raw =
          localStorage.getItem("user") || sessionStorage.getItem("user");
        if (raw) {
          const u = JSON.parse(raw);
          preparedBy = `${u.first_name || ""} ${u.surname || ""}`.trim();
        }
      } catch (_) {}
      if (!preparedBy) preparedBy = "___________________";

      doc.setDrawColor(160);
      doc.setLineWidth(0.25);

      // ── Column X positions ──────────────────────────────────────────
      const col1X = 14; // Left  — Prepared by / Received by
      const col2X = pageW / 2 - 28; // Center — Chief signatory
      const col3X = pageW - 70; // Right  — Notice

      const baseY = finalY + 4;

      // ── LEFT: Prepared by / Received by Evaluator ───────────────────
      // Single line: "Prepared by/Date: Gideon Basco / March 18, 2026"
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 30, 30);
      doc.text("Prepared by/Date:", col1X, baseY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 30, 30);
      const preparedLabel = doc.getTextWidth("Prepared by/Date: ");
      doc.text(`${preparedBy} / ${dateStr}`, col1X + preparedLabel, baseY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 30, 30);
      doc.text("Received by Evaluator/Date:", col1X, baseY + 12);

      // Blank line for evaluator signature
      doc.setDrawColor(120);
      doc.line(col1X, baseY + 17, col1X + 65, baseY + 17);

      // ── CENTER: Chief signatory block ──────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      doc.text("MELODY M. ZAMUDIO, RPh, MGM-ESP", col2X, baseY + 5, {
        align: "center",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(60);
      doc.text("FDRO V/Chief, LRD", col2X, baseY + 10, { align: "center" });
      doc.text("Center for Drug Regulation and Research", col2X, baseY + 15, {
        align: "center",
      });

      // ── RIGHT: Notice ───────────────────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 30, 30);
      doc.text("NON-ACCEPTANCE AND SWITCHING", col3X, baseY + 10, {
        align: "center",
      });
      doc.text("REQUIRES PRIOR APPROVAL BY CHIEF LRD", col3X, baseY + 15, {
        align: "center",
      });
    }

    const filename = `transmittal_${activeTab ?? "task"}_${now.toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  };

  const menuBtn = (onClick, style = {}, children) => (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "0.75rem 1rem",
        background: "transparent",
        border: "none",
        color: colors.textPrimary,
        fontSize: "0.85rem",
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        transition: "background .2s",
        ...style,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = colors.tableRowHover)
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );

  /* ── Render ── */
  return (
    <>
      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: "90%",
          minHeight: 0,
        }}
      >
        {/* Table header bar */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: `1px solid ${colors.tableBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: colors.textPrimary,
              }}
            >
              Task Data
            </h3>
            <span
              style={{
                padding: "0.25rem 0.75rem",
                background: colors.badgeBg,
                borderRadius: 12,
                fontSize: "0.8rem",
                color: colors.textTertiary,
                fontWeight: 600,
              }}
            >
              {totalRecords} total records
            </span>

            {selectedRows.length > 0 && showMarkAsReceived && (
              <button
                onClick={() => setConfirmReceive(true)}
                disabled={markingReceived}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.4rem 1rem",
                  background: markingReceived
                    ? "rgba(16,185,129,0.4)"
                    : "linear-gradient(135deg,#10b981,#059669)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: markingReceived ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 8px rgba(16,185,129,0.35)",
                  transition: "opacity .2s, box-shadow .2s",
                  letterSpacing: "0.02em",
                }}
                onMouseEnter={(e) => {
                  if (!markingReceived)
                    e.currentTarget.style.boxShadow =
                      "0 4px 14px rgba(16,185,129,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 2px 8px rgba(16,185,129,0.35)";
                }}
              >
                {markingReceived ? (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: 12,
                        height: 12,
                        border: "2px solid rgba(255,255,255,0.4)",
                        borderTop: "2px solid #fff",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    Processing…
                  </>
                ) : (
                  <>
                    <span>✔</span>
                    Mark as Received
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "1.25rem",
                        height: "1.25rem",
                        padding: "0 0.3rem",
                        background: "rgba(255,255,255,0.25)",
                        borderRadius: 999,
                        fontSize: "0.7rem",
                        fontWeight: 800,
                      }}
                    >
                      {selectedRows.length}
                    </span>
                  </>
                )}
              </button>
            )}

            {selectedRows.length > 0 && (
              <button
                onClick={handleGenerateTransmittal}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.4rem 1rem",
                  background: "linear-gradient(135deg,#1976d2,#1565c0)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(25,118,210,0.35)",
                  transition: "box-shadow .2s",
                  letterSpacing: "0.02em",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow =
                    "0 4px 14px rgba(25,118,210,0.5)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow =
                    "0 2px 8px rgba(25,118,210,0.35)")
                }
              >
                <span>📄</span>
                Generate Transmittal
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "1.25rem",
                    height: "1.25rem",
                    padding: "0 0.3rem",
                    background: "rgba(255,255,255,0.25)",
                    borderRadius: 999,
                    fontSize: "0.7rem",
                    fontWeight: 800,
                  }}
                >
                  {selectedRows.length}
                </span>
              </button>
            )}

            {isComplianceTab && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.68rem",
                  color: colors.textTertiary,
                }}
              >
                <span style={{ color: "#ef4444", fontWeight: 700 }}>
                  🚨 Overdue
                </span>
                <span>·</span>
                <span style={{ color: "#f97316", fontWeight: 700 }}>
                  🔴 Today
                </span>
                <span>·</span>
                <span style={{ color: "#f59e0b", fontWeight: 700 }}>
                  🟠 ≤3 days
                </span>
                <span>·</span>
                <span style={{ color: "#eab308", fontWeight: 700 }}>
                  🟡 ≤5 days
                </span>
                <span>·</span>
                <span style={{ color: "#10b981", fontWeight: 700 }}>🟢 OK</span>
              </div>
            )}

            {sortBy && (
              <span
                style={{
                  fontSize: "0.73rem",
                  color: colors.textTertiary,
                  padding: "0.2rem 0.6rem",
                  background: colors.badgeBg,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                Sorted by{" "}
                <strong style={{ color: "#4CAF50" }}>{activeSortLabel}</strong>
                <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
              </span>
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
              minWidth: 2000,
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                background: colors.tableBg,
                zIndex: 20,
              }}
            >
              <tr>
                {/* Checkbox header */}
                <th
                  style={{
                    padding: "1rem",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    borderRight: `1px solid ${colors.tableBorder}`,
                    background: colors.tableBg,
                    position: "sticky",
                    left: 0,
                    zIndex: 21,
                    width: "50px",
                    minWidth: "50px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      selectedRows.length === data.length && data.length > 0
                    }
                    onChange={onSelectAll}
                    style={{
                      width: 16,
                      height: 16,
                      cursor: "pointer",
                      accentColor: "#4CAF50",
                    }}
                  />
                </th>

                {/* # header */}
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    borderRight: `1px solid ${colors.tableBorder}`,
                    background: colors.tableBg,
                    position: "sticky",
                    left: "50px",
                    zIndex: 21,
                    width: "60px",
                    minWidth: "60px",
                  }}
                >
                  #
                </th>

                {/* Column headers */}
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: col.complianceOnly
                        ? "#f59e0b"
                        : colors.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: `1px solid ${colors.tableBorder}`,
                      borderTop: col.complianceOnly
                        ? "2px solid #f59e0b"
                        : undefined,
                      width: col.width,
                      minWidth: col.width,
                      whiteSpace: "nowrap",
                      // ── Frozen column (e.g. DTN) ──
                      ...(col.frozen
                        ? {
                            position: "sticky",
                            left: col.frozenLeft,
                            zIndex: 22,
                            background: colors.tableBg,
                            boxShadow: "2px 0 6px rgba(0,0,0,0.18)",
                          }
                        : {
                            background: col.complianceOnly
                              ? darkMode
                                ? "rgba(245,158,11,0.08)"
                                : "rgba(245,158,11,0.05)"
                              : colors.tableBg,
                          }),
                      cursor:
                        col.key !== "statusTimeline" &&
                        col.key !== "deadlineDate"
                          ? "pointer"
                          : "default",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (
                        col.key !== "statusTimeline" &&
                        col.key !== "deadlineDate"
                      )
                        e.currentTarget.style.background = darkMode
                          ? "#1e1e1e"
                          : "#ebebeb";
                    }}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = col.frozen
                        ? colors.tableBg
                        : col.complianceOnly
                          ? darkMode
                            ? "rgba(245,158,11,0.08)"
                            : "rgba(245,158,11,0.05)"
                          : colors.tableBg)
                    }
                  >
                    <span
                      style={{ display: "inline-flex", alignItems: "center" }}
                    >
                      {col.label}
                      <SortIcon colKey={col.key} />
                    </span>
                  </th>
                ))}

                {/* Actions header */}
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: `1px solid ${colors.tableBorder}`,
                    width: 80,
                    whiteSpace: "nowrap",
                    position: "sticky",
                    right: 0,
                    background: colors.tableBg,
                    zIndex: 21,
                    boxShadow: "-4px 0 8px rgba(0,0,0,.15)",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {data.length === 0 && (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 3}
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

              {data.map((row, idx) => {
                const sel = selectedRows.includes(row.id);
                const isUnread = !readIds.has(row.id);
                const dl = isComplianceTab ? row.deadlineDate : null;
                const urgency = dl ? getDeadlineUrgency(dl) : null;

                // Base background for the row (semi-transparent is fine for <tr>)
                const bg = sel
                  ? "#4CAF5015"
                  : isUnread
                    ? darkMode
                      ? "rgba(33,150,243,0.07)"
                      : "rgba(33,150,243,0.04)"
                    : idx % 2 === 0
                      ? colors.tableRowEven
                      : colors.tableRowOdd;

                const isHovered = hoveredRowId === row.id;

                // ── FIX: sticky <td> cells MUST use a fully opaque background ──
                // Semi-transparent rgba backgrounds on sticky cells let horizontally
                // scrolled content bleed through, causing the ghost-column effect.
                // We resolve each state to its opaque equivalent for sticky cells only.
                const solidStickyBg = (() => {
                  if (isHovered) return colors.tableRowHover;
                  if (sel) return darkMode ? "#1a2e1a" : "#edf7ed";
                  if (isUnread) return darkMode ? "#0f1e2e" : "#e8f1fb";
                  return idx % 2 === 0
                    ? colors.tableRowEven
                    : colors.tableRowOdd;
                })();

                const rowBorderLeft = sel
                  ? "3px solid #4CAF50"
                  : isUnread
                    ? "3px solid #2196F3"
                    : urgency === "overdue"
                      ? "3px solid #ef4444"
                      : urgency === "today"
                        ? "3px solid #f97316"
                        : urgency === "critical"
                          ? "3px solid #f59e0b"
                          : urgency === "warning"
                            ? "3px solid #eab308"
                            : "3px solid transparent";

                return (
                  <tr
                    key={row.id}
                    style={{
                      background: isHovered ? colors.tableRowHover : bg,
                      transition: "background .2s",
                      borderLeft: rowBorderLeft,
                    }}
                    onMouseEnter={() => setHoveredRowId(row.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    {/* ── Checkbox cell (sticky left) ── */}
                    <td
                      style={{
                        padding: "1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        borderRight: `1px solid ${colors.tableBorder}`,
                        position: "sticky",
                        left: 0,
                        // FIX: use stickyBg so it matches the row on hover
                        background: solidStickyBg,
                        zIndex: 9,
                        width: "50px",
                        minWidth: "50px",
                        transition: "background .2s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => onSelectRow(row.id)}
                        style={{
                          width: 16,
                          height: 16,
                          cursor: "pointer",
                          accentColor: "#4CAF50",
                        }}
                      />
                    </td>

                    {/* ── Row number cell (sticky left) ── */}
                    <td
                      style={{
                        padding: "1rem",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: colors.textTertiary,
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        borderRight: `1px solid ${colors.tableBorder}`,
                        textAlign: "center",
                        position: "sticky",
                        left: "50px",
                        // FIX: use stickyBg so it matches the row on hover
                        background: solidStickyBg,
                        zIndex: 9,
                        width: "60px",
                        minWidth: "60px",
                        transition: "background .2s",
                      }}
                    >
                      {(indexOfFirstRow || 0) + idx + 1}
                    </td>

                    {/* ── Data cells ── */}
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: "1rem",
                          fontSize: "0.85rem",
                          fontWeight: isUnread ? 700 : 400,
                          color: isUnread
                            ? colors.textPrimary
                            : colors.tableText,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          whiteSpace:
                            col.key === "deadlineDate" || col.wrap
                              ? "normal"
                              : "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          width: col.width,
                          minWidth: col.width,
                          // ── Frozen column (DTN) ──
                          ...(col.frozen
                            ? {
                                position: "sticky",
                                left: col.frozenLeft,
                                background: solidStickyBg,
                                zIndex: 9,
                                boxShadow: "2px 0 6px rgba(0,0,0,0.18)",
                                transition: "background .2s",
                              }
                            : {
                                background: col.complianceOnly
                                  ? darkMode
                                    ? "rgba(245,158,11,0.04)"
                                    : "rgba(245,158,11,0.02)"
                                  : undefined,
                              }),
                        }}
                      >
                        {renderCell(col, row)}
                      </td>
                    ))}

                    {/* ── Actions cell (sticky right) ── */}
                    <td
                      style={{
                        padding: "1rem",
                        borderBottom: `1px solid ${colors.tableBorder}`,
                        textAlign: "center",
                        position: "sticky",
                        right: 0,
                        // FIX: use stickyBg so it matches the row on hover
                        background: solidStickyBg,
                        zIndex: openMenuId === row.id ? 9999 : 9,
                        boxShadow: "-4px 0 8px rgba(0,0,0,.15)",
                        transition: "background .2s",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        <button
                          onClick={(e) => toggleMenu(e, row.id)}
                          style={{
                            padding: "0.5rem",
                            background: "transparent",
                            border: `1px solid ${colors.cardBorder}`,
                            borderRadius: 6,
                            color: colors.textPrimary,
                            cursor: "pointer",
                            width: 32,
                            height: 32,
                            position: "relative",
                          }}
                        >
                          ⋮
                          {isUnread && (
                            <span
                              style={{
                                position: "absolute",
                                top: -3,
                                right: -3,
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "#2196F3",
                                border: `1.5px solid ${solidStickyBg}`,
                              }}
                            />
                          )}
                        </button>

                        {openMenuId === row.id && (
                          <>
                            <div
                              onClick={() => setOpenMenuId(null)}
                              style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 9998,
                              }}
                            />
                            <div
                              style={{
                                position: "fixed",
                                right: 20,
                                top:
                                  typeof event !== "undefined"
                                    ? event.clientY
                                    : 200,
                                background: colors.cardBg,
                                border: `1px solid ${colors.cardBorder}`,
                                borderRadius: 8,
                                boxShadow: "0 8px 24px rgba(0,0,0,.3)",
                                minWidth: 200,
                                zIndex: 9999,
                                overflow: "hidden",
                              }}
                            >
                              {activeSubTab === "received" &&
                                menuBtn(
                                  () => openDetails(row),
                                  {
                                    borderBottom: `1px solid ${colors.tableBorder}`,
                                  },
                                  [
                                    <span key="i">👁️</span>,
                                    <span key="t">View Details</span>,
                                  ],
                                )}
                              {menuBtn(
                                () => openAppLogs(row),
                                {
                                  borderBottom: `1px solid ${colors.tableBorder}`,
                                },
                                [
                                  <span key="i">🗂️</span>,
                                  <span key="t">Application Logs</span>,
                                ],
                              )}
                              {menuBtn(
                                () => openChangeLog(row),
                                {
                                  borderBottom: `1px solid ${colors.tableBorder}`,
                                },
                                [
                                  <span key="i">📋</span>,
                                  <span key="t">Change Log</span>,
                                ],
                              )}
                              {menuBtn(() => openDoctrack(row), {}, [
                                <span key="i">📋</span>,
                                <span key="t">View Doctrack Details</span>,
                              ])}
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

      {/* ── Modals ── */}
      {selectedRowDetails && (
        <ViewDetailsModal
          record={selectedRowDetails}
          onClose={() => setSelectedRowDetails(null)}
          onSuccess={async () => {
            setSelectedRowDetails(null);
            if (onRefresh) await onRefresh();
          }}
          colors={colors}
          darkMode={darkMode}
        />
      )}
      {doctrackModalRecord && (
        <DoctrackModal
          record={doctrackModalRecord}
          onClose={() => setDoctrackModalRecord(null)}
          colors={colors}
        />
      )}
      {changeLogRecord && (
        <ChangeLogModal
          record={changeLogRecord}
          onClose={() => setChangeLogRecord(null)}
          colors={colors}
        />
      )}
      {appLogsRecord && (
        <ApplicationLogsModal
          record={appLogsRecord}
          onClose={() => setAppLogsRecord(null)}
          colors={colors}
          darkMode={darkMode}
        />
      )}

      {/* ── Mark as Received Confirmation Modal ── */}
      {confirmReceive && (
        <div
          onClick={() => setConfirmReceive(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 14,
              padding: "2rem",
              width: 400,
              maxWidth: "90%",
              boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
            }}
          >
            {/* Icon */}
            <div
              style={{
                fontSize: "2rem",
                marginBottom: "0.75rem",
                textAlign: "center",
              }}
            >
              📥
            </div>

            {/* Title */}
            <h3
              style={{
                margin: "0 0 0.5rem",
                color: colors.textPrimary,
                fontSize: "1.05rem",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              Mark as Received?
            </h3>

            {/* Body */}
            <p
              style={{
                margin: "0 0 1.5rem",
                color: colors.textSecondary,
                fontSize: "0.88rem",
                lineHeight: 1.6,
                textAlign: "center",
              }}
            >
              You are about to mark{" "}
              <strong style={{ color: "#10b981" }}>
                {selectedRows.length}{" "}
                {selectedRows.length === 1 ? "record" : "records"}
              </strong>{" "}
              as received. This action cannot be undone.
            </p>

            {/* Buttons */}
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => setConfirmReceive(false)}
                style={{
                  padding: "0.55rem 1.25rem",
                  borderRadius: 8,
                  border: `1px solid ${colors.cardBorder}`,
                  background: "transparent",
                  color: colors.textSecondary,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmReceive(false);
                  handleMarkAsReceived();
                }}
                style={{
                  padding: "0.55rem 1.5rem",
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(135deg,#10b981,#059669)",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(16,185,129,0.35)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <span>✔</span> Yes, Mark as Received
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DataTable;
