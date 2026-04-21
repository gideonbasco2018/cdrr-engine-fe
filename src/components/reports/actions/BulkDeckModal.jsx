// src/components/UploadReports/actions/BulkDeckModal.jsx

import { useState, useEffect } from "react";
import { getUsersByGroup, getUser } from "../../../api/auth";
import {
  createApplicationLog,
  getLastApplicationLogIndex,
} from "../../../api/application-logs";
import { createBulkDoctrackLogsByRsn } from "../../../api/doctrack";

// ── Transmittal PDF Generator ─────────────────────────────────────────────────
const loadScript = (src) =>
  new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement("script");
    s.src = src;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });

async function generateTransmittalPDF(records) {
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
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
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

  const genBarcode = (value) => {
    try {
      const canvas = document.createElement("canvas");
      window.JsBarcode(canvas, String(value), {
        format: "CODE128",
        width: 1.4,
        height: 14,
        displayValue: false,
        margin: 1,
        background: "#ffffff",
        lineColor: "#000000",
      });
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  };

  const barcodeImages = records.map((r) =>
    genBarcode(r.dtn && r.dtn !== "N/A" ? r.dtn : "N/A"),
  );

  // Header
  doc.setFillColor(25, 118, 210);
  doc.rect(0, 0, pageW, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TRANSMITTAL SLIP", 10, 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("FDA Center for Drug Regulation and Research (CDRR)", 10, 13);
  doc.text(`Generated: ${dateStr}  ${timeStr}`, pageW - 10, 7, {
    align: "right",
  });
  doc.text(`Total records: ${records.length}`, pageW - 10, 13, {
    align: "right",
  });

  const cols = [
    { header: "#", dataKey: "_no" },
    { header: "Barcode", dataKey: "_barcode" },
    { header: "Doctrack Number", dataKey: "dtn" },
    { header: "Category", dataKey: "estCat" },
    { header: "Applicant Company", dataKey: "ltoCompany" },
    { header: "Product Information", dataKey: "_productInfo" },
    { header: "Dosage Strength and Form", dataKey: "_dosage" },
    { header: "Registration No.", dataKey: "regNo" },
    { header: "App Type", dataKey: "_appTypeFull" },
    { header: "Date Received from FDAC", dataKey: "dateReceivedFdac" },
  ];

  const rows = records.map((r, i) => {
    const brand =
      r.prodBrName && r.prodBrName !== "N/A" ? `Brand: ${r.prodBrName}` : "";
    const generic =
      r.prodGenName && r.prodGenName !== "N/A"
        ? `Generic: ${r.prodGenName}`
        : "";
    const productInfo = [brand, generic].filter(Boolean).join("\n") || "—";
    const strength = r.prodDosStr && r.prodDosStr !== "N/A" ? r.prodDosStr : "";
    const form = r.prodDosForm && r.prodDosForm !== "N/A" ? r.prodDosForm : "";
    const dosage = [strength, form].filter(Boolean).join(" / ") || "—";
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
      ltoCompany: r.ltoComp ?? r.ltoCompany ?? "—",
      _productInfo: productInfo,
      _dosage: dosage,
      regNo: r.regNo ?? "—",
      _appTypeFull: appTypeFull,
      dateReceivedFdac: r.dateReceivedFdac ?? "—",
    };
  });

  const BRH = 10,
    BIW = 24,
    BIH = 5;
  doc.autoTable({
    startY: 18,
    columns: cols,
    body: rows,
    theme: "grid",
    styles: {
      fontSize: 6.5,
      cellPadding: 1.2,
      overflow: "linebreak",
      textColor: [30, 30, 30],
      minCellHeight: BRH,
      valign: "middle",
      lineWidth: 0.1,
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
    margin: { left: 6, right: 6 },
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
    didDrawCell: (h) => {
      if (h.section === "body" && h.column.dataKey === "_barcode") {
        const img = barcodeImages[h.row.index];
        if (img) {
          const cell = h.cell;
          doc.addImage(
            img,
            "PNG",
            cell.x + (cell.width - BIW) / 2,
            cell.y + (cell.height - BIH) / 2,
            BIW,
            BIH,
          );
        }
      }
    },
  });

  // Footer + signature block
  const totalPgs = doc.internal.getNumberOfPages();
  for (let pg = 1; pg <= totalPgs; pg++) {
    doc.setPage(pg);
    doc.setFillColor(255, 255, 255);
    doc.rect(0, pageH - 8, pageW, 8, "F");
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(
      `Page ${pg} of ${totalPgs}  |  FDA CDRR Engine — Transmittal Slip`,
      pageW / 2,
      pageH - 3,
      { align: "center" },
    );
    doc.setTextColor(30, 30, 30);
  }
  doc.setPage(totalPgs);
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
    const col1X = 14,
      col2X = pageW / 2 - 28,
      col3X = pageW - 70,
      baseY = finalY + 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 30, 30);
    doc.text("Prepared by/Date: ", col1X, baseY);
    doc.setFont("helvetica", "normal");
    doc.text(
      ` ${preparedBy} / ${dateStr}`,
      col1X + doc.getTextWidth("Prepared by/Date: "),
      baseY,
    );
    doc.setFont("helvetica", "bold");
    doc.text("Received by Evaluator/Date:", col1X, baseY + 12);
    doc.setDrawColor(120);
    doc.line(col1X, baseY + 17, col1X + 65, baseY + 17);

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

  doc.save(`transmittal_reports_${now.toISOString().slice(0, 10)}.pdf`);
}

// ── Transmittal Prompt Modal ──────────────────────────────────────────────────
function TransmittalPromptModal({
  result,
  records,
  colors,
  darkMode,
  onYes,
  onNo,
}) {
  const [downloading, setDownloading] = useState(false);

  const handleYes = async () => {
    setDownloading(true);
    try {
      await onYes();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onNo}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 16,
          overflow: "hidden",
          width: 460,
          maxWidth: "92%",
          boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
          animation: "slideInScale 0.25s ease",
        }}
      >
        {/* Result header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            background: colors.badgeBg,
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1.6rem" }}>
            {result.errors.length === 0 ? "✅" : "⚠️"}
          </span>
          <div>
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: colors.textTertiary,
              }}
            >
              Bulk Deck
            </div>
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: result.errors.length === 0 ? "#4CAF50" : "#f59e0b",
              }}
            >
              {result.errors.length === 0
                ? "Completed Successfully"
                : "Completed with Errors"}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          {/* Stats */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div
              style={{
                flex: 1,
                padding: "0.75rem",
                background: "rgba(76,175,80,0.08)",
                border: "1px solid rgba(76,175,80,0.25)",
                borderRadius: 10,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  color: "#4CAF50",
                }}
              >
                {records.length - result.errors.length}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: colors.textTertiary,
                  marginTop: 2,
                }}
              >
                Successfully decked
              </div>
            </div>
            {result.errors.length > 0 && (
              <div
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 10,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 800,
                    color: "#ef4444",
                  }}
                >
                  {result.errors.length}
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: colors.textTertiary,
                    marginTop: 2,
                  }}
                >
                  Failed
                </div>
              </div>
            )}
          </div>

          {/* Failed DTNs if any */}
          {result.errors.length > 0 && (
            <div
              style={{
                padding: "0.75rem 1rem",
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 8,
              }}
            >
              <p
                style={{
                  margin: "0 0 0.4rem",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#ef4444",
                }}
              >
                Failed DTNs:
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.75rem",
                  color: colors.textSecondary,
                  wordBreak: "break-all",
                }}
              >
                {result.errors.join(", ")}
              </p>
            </div>
          )}

          {/* Transmittal prompt */}
          <div
            style={{
              padding: "1rem 1.25rem",
              background: "rgba(25,118,210,0.06)",
              border: "1px solid rgba(25,118,210,0.2)",
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span style={{ fontSize: "1.1rem" }}>📄</span>
              <span
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  color: colors.textPrimary,
                }}
              >
                Download Transmittal Slip?
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "0.78rem",
                color: colors.textSecondary,
                lineHeight: 1.5,
              }}
            >
              Would you like to generate and download a transmittal slip for the{" "}
              <strong>{records.length - result.errors.length}</strong>{" "}
              successfully decked record
              {records.length - result.errors.length !== 1 ? "s" : ""}?
            </p>
          </div>

          {/* Yes / No buttons */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={onNo}
              style={{
                flex: 1,
                padding: "0.7rem",
                borderRadius: 8,
                border: `1px solid ${colors.cardBorder}`,
                background: "transparent",
                color: colors.textSecondary,
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = colors.badgeBg)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              No, Skip
            </button>
            <button
              onClick={handleYes}
              disabled={downloading}
              style={{
                flex: 1,
                padding: "0.7rem",
                borderRadius: 8,
                border: "none",
                background: downloading
                  ? "rgba(25,118,210,0.4)"
                  : "linear-gradient(135deg,#1976d2,#1565c0)",
                color: "#fff",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: downloading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                boxShadow: downloading
                  ? "none"
                  : "0 2px 8px rgba(25,118,210,0.35)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!downloading)
                  e.currentTarget.style.boxShadow =
                    "0 4px 14px rgba(25,118,210,0.5)";
              }}
              onMouseLeave={(e) => {
                if (!downloading)
                  e.currentTarget.style.boxShadow =
                    "0 2px 8px rgba(25,118,210,0.35)";
              }}
            >
              {downloading ? (
                <>
                  <span
                    style={{
                      display: "inline-block",
                      width: 13,
                      height: 13,
                      border: "2px solid rgba(255,255,255,0.4)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin 0.6s linear infinite",
                    }}
                  />
                  Generating…
                </>
              ) : (
                <>
                  <span>📄</span>Yes, Download
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main BulkDeckModal ────────────────────────────────────────────────────────
function BulkDeckModal({ records, onClose, onSuccess, colors, darkMode }) {
  const [formData, setFormData] = useState({
    decker: "",
    evaluator: "",
    sne: "",
    deckerDecision: "",
    deckerRemarks: "",
    doctackRemarks: "", // ← Auto-filled based on decision; editable by user
  });

  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSneUsers, setLoadingSneUsers] = useState(false);
  const [nextUsers, setNextUsers] = useState([]);
  const [sneUsers, setSneUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  // ── NEW: transmittal prompt state ──
  const [deckResult, setDeckResult] = useState(null); // { errors: [] }
  const [showTransmittalPrompt, setShowTransmittalPrompt] = useState(false);
  // Save records that succeeded for transmittal
  const [succeededRecords, setSucceededRecords] = useState([]);

  //start changes
  // const [alertModal, setAlertModal] = useState(null);

  const [alertModal, setAlertModal] = useState(null);
  const [doctrackEnabled, setDoctrackEnabled] = useState(true);
  // end

  const GROUP_IDS = { EVALUATOR: 3, SE: 13 };

  const DECISION_CONFIG = {
    "For S&E": { fetchEvaluator: false, fetchSne: true },
    "For Quality Evaluation": { fetchEvaluator: true, fetchSne: false },
    "For S&E and Quality Evaluation": { fetchEvaluator: true, fetchSne: true },
  };

  // ── Auto-fill doctackRemarks per decision ──────────────────────────────────
  // Edit the values below to change the default remarks per decision.
  const DOCTRACK_REMARKS_DEFAULTS = {
    "For S&E": "Forwarded to S&E",
    "For Quality Evaluation": "Forwarded to evaluator",
    "For S&E and Quality Evaluation": "Forwarded to S&E and Evaluator",
  };
  // ──────────────────────────────────────────────────────────────────────────

  const resolveEvaluatorId = (username) =>
    nextUsers.find((u) => u.username === username)?.id ?? null;

  const resolveSneId = (username) =>
    sneUsers.find((u) => u.username === username)?.id ?? null;

  useEffect(() => {
    const user = getUser();
    if (user) {
      setCurrentUser(user);
      setFormData((prev) => ({ ...prev, decker: user.username }));
    }
  }, []);

  useEffect(() => {
    const decision = formData.deckerDecision;

    // Reset user selections + auto-fill doctackRemarks
    setFormData((prev) => ({
      ...prev,
      evaluator: "",
      sne: "",
      doctackRemarks: DOCTRACK_REMARKS_DEFAULTS[decision] ?? "",
    }));
    setNextUsers([]);
    setSneUsers([]);

    if (!decision || !DECISION_CONFIG[decision]) return;
    const cfg = DECISION_CONFIG[decision];

    if (cfg.fetchEvaluator) {
      (async () => {
        try {
          setLoadingUsers(true);
          setNextUsers(await getUsersByGroup(GROUP_IDS.EVALUATOR));
        } catch (e) {
          console.error(e);
          setNextUsers([]);
        } finally {
          setLoadingUsers(false);
        }
      })();
    }
    if (cfg.fetchSne) {
      (async () => {
        try {
          setLoadingSneUsers(true);
          setSneUsers(await getUsersByGroup(GROUP_IDS.SE));
        } catch (e) {
          console.error(e);
          setSneUsers([]);
        } finally {
          setLoadingSneUsers(false);
        }
      })();
    }
  }, [formData.deckerDecision]);

  const handleChange = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  // ── Core deck logic ──
  const handleSubmit = async () => {
    const cfg = DECISION_CONFIG[formData.deckerDecision];
    const needsEvaluator = cfg?.fetchEvaluator;
    const needsSne = cfg?.fetchSne;

    setLoading(true);
    setProgress({ current: 0, total: records.length });

    const now = new Date();
    const formattedDateTime = new Date(
      now.getTime() + 8 * 60 * 60 * 1000,
    ).toISOString();
    const errors = [];
    const succeeded = [];

    try {
      // ── STEP 1: Insert doctrack logs first (external DB) ──────────────────

      // Build entries for all records in one bulk call

      // change start

      // const doctrackEntries = records.map((record) => ({
      //   rsn: record.dtn, // 14-digit doctrack number
      //   remarks: formData.doctackRemarks || "", // auto-filled or user-edited
      //   userID: currentUser?.id ?? null,
      // }));

      // let doctrackResult = null;
      // try {
      //   doctrackResult = await createBulkDoctrackLogsByRsn(
      //     doctrackEntries,
      //     currentUser?.alias || "", // ← DAGDAG
      //   );
      // } catch (doctrackError) {
      //   console.error("❌ Doctrack bulk insert failed:", doctrackError);
      //   setAlertModal({
      //     title: "Doctrack logs",
      //     message: `Failed to insert Doctrack logs. Reason: ${doctrackError.message}`,
      //     detail: "No application logs were created.",
      //   });
      //   return;
      // }

      // if (doctrackResult === null) {
      //   setAlertModal({
      //     title: "Doctrack logs",
      //     message: "No response from server.",
      //     detail: "No application logs were created.",
      //   });
      //   return;
      // }

      // changes end
      // change start
      // ── STEP 1: Insert doctrack logs first (external DB) ──────────────────
      if (doctrackEnabled) {
        const doctrackEntries = records.map((record) => ({
          rsn: record.dtn,
          remarks: formData.doctackRemarks || "",
          userID: currentUser?.id ?? null,
        }));

        let doctrackResult = null;
        try {
          doctrackResult = await createBulkDoctrackLogsByRsn(
            doctrackEntries,
            currentUser?.alias || "",
          );
        } catch (doctrackError) {
          console.error("❌ Doctrack bulk insert failed:", doctrackError);
          setAlertModal({
            title: "Doctrack logs",
            message: `Failed to insert Doctrack logs. Reason: ${doctrackError.message}`,
            detail: "No application logs were created.",
          });
          return;
        }

        if (doctrackResult === null) {
          setAlertModal({
            title: "Doctrack logs",
            message: "No response from server.",
            detail: "No application logs were created.",
          });
          return;
        }
      }
      // change end
      // ── STEP 1 complete ───────────────────────────────────────────────────

      // ── STEP 2: Insert application logs (main DB) ─────────────────────────
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        setProgress({ current: i + 1, total: records.length });

        try {
          const indexData = await getLastApplicationLogIndex(record.id);
          const lastIndex = indexData.last_index;
          const nextIndex = lastIndex + 1;

          // Decking log — COMPLETED
          await createApplicationLog({
            main_db_id: record.id,
            application_step: "Decking",
            user_name: formData.decker,
            application_status: "COMPLETED",
            application_decision: formData.deckerDecision,
            application_remarks: formData.deckerRemarks || "",
            doctrack_remarks: formData.doctackRemarks || "",
            start_date: formattedDateTime,
            accomplished_date: formattedDateTime,
            del_index: nextIndex,
            del_previous: lastIndex,
            del_last_index: 0,
            del_thread: "Close",
            user_id: currentUser?.id ?? null,
            action_type: "Decked",
          });

          if (formData.deckerDecision === "For S&E and Quality Evaluation") {
            // Quality Evaluation log
            await createApplicationLog({
              main_db_id: record.id,
              application_step: "Quality Evaluation",
              user_name: formData.evaluator,
              application_status: "IN PROGRESS",
              application_decision: "",
              application_remarks: "",
              start_date: formattedDateTime,
              accomplished_date: null,
              del_index: nextIndex + 1,
              del_previous: nextIndex,
              del_last_index: 1,
              del_thread: "Open",
              user_id: resolveEvaluatorId(formData.evaluator),
            });
            // S&E log
            await createApplicationLog({
              main_db_id: record.id,
              application_step: "S&E",
              user_name: formData.sne,
              application_status: "IN PROGRESS",
              application_decision: "",
              application_remarks: "",
              start_date: formattedDateTime,
              accomplished_date: null,
              del_index: nextIndex + 2,
              del_previous: nextIndex,
              del_last_index: 1,
              del_thread: "Open",
              user_id: resolveSneId(formData.sne),
            });
          } else {
            const stepLabel =
              formData.deckerDecision === "For S&E"
                ? "S&E"
                : "Quality Evaluation";
            const assignedUser = needsEvaluator
              ? formData.evaluator
              : formData.sne;
            await createApplicationLog({
              main_db_id: record.id,
              application_step: stepLabel,
              user_name: assignedUser,
              application_status: "IN PROGRESS",
              application_decision: "",
              application_remarks: "",
              start_date: formattedDateTime,
              accomplished_date: null,
              del_index: nextIndex + 1,
              del_previous: nextIndex,
              del_last_index: 1,
              del_thread: "Open",
              user_id: needsEvaluator
                ? resolveEvaluatorId(assignedUser)
                : resolveSneId(assignedUser),
            });
          }

          succeeded.push(record);
        } catch (err) {
          console.error(`❌ Failed to deck DTN ${record.dtn}:`, err);
          errors.push(record.dtn);
        }
      }
      // ── STEP 2 complete ───────────────────────────────────────────────────

      // ── Show transmittal prompt instead of alert ──
      setSucceededRecords(succeeded);
      setDeckResult({ errors });
      setShowTransmittalPrompt(true);
    } catch (error) {
      console.error("❌ Bulk deck failed:", error);
      setAlertModal({
        title: "Bulk deck",
        message: `An unexpected error occurred: ${error.message}`,
      });
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  // ── Form validation → show confirmation modal ──
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const cfg = DECISION_CONFIG[formData.deckerDecision];

    if (!formData.deckerDecision) {
      setAlertModal({
        title: "Validation",
        message: "Please select a Decker Decision.",
      });
      return;
    }
    if (cfg?.fetchEvaluator && !formData.evaluator) {
      setAlertModal({
        title: "Validation",
        message: "Please assign an Evaluator.",
      });
      return;
    }
    if (cfg?.fetchSne && !formData.sne) {
      setAlertModal({ title: "Validation", message: "Please assign an S&E." });
      return;
    }

    setConfirmSubmit(true);
  };

  // ── Transmittal handlers ──
  const handleTransmittalYes = async () => {
    await generateTransmittalPDF(succeededRecords);
    setShowTransmittalPrompt(false);
    if (onSuccess) await onSuccess();
    onClose();
  };

  const handleTransmittalNo = async () => {
    setShowTransmittalPrompt(false);
    if (onSuccess) await onSuccess();
    onClose();
  };

  const cfg = DECISION_CONFIG[formData.deckerDecision];
  const isDualAssign =
    formData.deckerDecision === "For S&E and Quality Evaluation";
  const showEvaluator = cfg?.fetchEvaluator;
  const showSne = cfg?.fetchSne;
  const showNextUser = !!formData.deckerDecision;

  const isSubmitDisabled =
    loading ||
    loadingUsers ||
    loadingSneUsers ||
    !showNextUser ||
    (showEvaluator && nextUsers.length === 0) ||
    (showSne && sneUsers.length === 0);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 9998,
          backdropFilter: "blur(4px)",
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Centering container */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "700px",
            maxHeight: "calc(100vh - 2rem)",
            background: colors.cardBg,
            borderRadius: "16px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            animation: "slideInScale 0.3s cubic-bezier(0.4,0,0.2,1)",
            border: `1px solid ${colors.cardBorder}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "1.5rem 2rem",
              borderBottom: `2px solid ${colors.cardBorder}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
              background: colors.cardBg,
              borderRadius: "16px 16px 0 0",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  color: colors.textPrimary,
                  marginBottom: "0.25rem",
                }}
              >
                🎯 Deck Multiple Applications
              </h2>
              <p style={{ fontSize: "0.875rem", color: colors.textTertiary }}>
                Decking{" "}
                <strong style={{ color: "#4CAF50" }}>{records.length}</strong>{" "}
                applications
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                border: `1px solid ${colors.cardBorder}`,
                background: "transparent",
                color: colors.textPrimary,
                cursor: "pointer",
                fontSize: "1.2rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ef444410";
                e.currentTarget.style.borderColor = "#ef4444";
                e.currentTarget.style.color = "#ef4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = colors.cardBorder;
                e.currentTarget.style.color = colors.textPrimary;
              }}
            >
              ✕
            </button>
          </div>

          {/* Progress bar */}
          {loading && (
            <div
              style={{
                padding: "0.75rem 2rem",
                background: colors.badgeBg,
                borderBottom: `1px solid ${colors.cardBorder}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  color: colors.textSecondary,
                  marginBottom: "0.4rem",
                }}
              >
                <span>Processing applications...</span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div
                style={{
                  height: "6px",
                  background: colors.cardBorder,
                  borderRadius: "99px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${(progress.current / progress.total) * 100}%`,
                    background: "#4CAF50",
                    borderRadius: "99px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleFormSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
            }}
          >
            <div
              style={{
                padding: "2rem",
                overflowY: "auto",
                overflowX: "hidden",
                flex: 1,
              }}
            >
              {/* Selected DTNs */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: colors.textPrimary,
                    marginBottom: "0.75rem",
                  }}
                >
                  Selected Applications ({records.length})
                </label>
                <div
                  style={{
                    maxHeight: "140px",
                    overflowY: "auto",
                    background: colors.badgeBg,
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: "8px",
                    padding: "1rem",
                  }}
                >
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                  >
                    {records.map((record) => (
                      <span
                        key={record.id}
                        style={{
                          padding: "0.4rem 0.8rem",
                          background: "#4CAF5020",
                          color: "#4CAF50",
                          borderRadius: "6px",
                          fontSize: "0.8rem",
                          fontWeight: "600",
                          border: "1px solid #4CAF5040",
                        }}
                      >
                        {record.dtn}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Decker Name */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: colors.textPrimary,
                    marginBottom: "0.5rem",
                  }}
                >
                  Decker Name (You) <span style={{ color: "#4CAF50" }}>●</span>
                </label>
                <input
                  type="text"
                  value={formData.decker}
                  readOnly
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    background: colors.badgeBg,
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "8px",
                    color: colors.textPrimary,
                    fontSize: "0.95rem",
                    outline: "none",
                    cursor: "not-allowed",
                    fontWeight: "600",
                    boxSizing: "border-box",
                  }}
                />
                {currentUser && (
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: colors.textTertiary,
                      marginTop: "0.5rem",
                      marginBottom: 0,
                    }}
                  >
                    👤 Logged in as: {currentUser.username}
                  </p>
                )}
              </div>

              {/* Decker Decision */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: colors.textPrimary,
                    marginBottom: "0.5rem",
                  }}
                >
                  Decker Decision <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={formData.deckerDecision}
                  onChange={(e) =>
                    handleChange("deckerDecision", e.target.value)
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    background: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "8px",
                    color: colors.textPrimary,
                    fontSize: "0.95rem",
                    outline: "none",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
                  onBlur={(e) =>
                    (e.target.style.borderColor = colors.inputBorder)
                  }
                >
                  <option value="">Select decision</option>
                  <option value="For S&E">For S&amp;E</option>
                  <option value="For Quality Evaluation">
                    For Quality Evaluation
                  </option>
                  <option value="For S&E and Quality Evaluation">
                    For S&amp;E and Quality Evaluation
                  </option>
                </select>
              </div>

              {/* Decker Remarks */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: colors.textPrimary,
                    marginBottom: "0.5rem",
                  }}
                >
                  Decker Remarks
                </label>
                <textarea
                  value={formData.deckerRemarks}
                  onChange={(e) =>
                    handleChange("deckerRemarks", e.target.value)
                  }
                  placeholder="Enter any remarks or notes..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    background: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "8px",
                    color: colors.textPrimary,
                    fontSize: "0.95rem",
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                    transition: "all 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
                  onBlur={(e) =>
                    (e.target.style.borderColor = colors.inputBorder)
                  }
                />
              </div>

              {/* ── Doctrack Remarks ───────────────────────────────────────────
                   Auto-filled from DOCTRACK_REMARKS_DEFAULTS when decision
                   changes. User can still manually override the value.
              ──────────────────────────────────────────────────────────────── */}
              {formData.deckerDecision && (
                <div style={{ marginBottom: "1.5rem" }}>
                  {/* start changes */}
                  {/* <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Doctrack Remarks
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        fontSize: "0.7rem",
                        fontWeight: "500",
                        color: "#2196F3",
                        background: "#2196F315",
                        border: "1px solid #2196F330",
                        padding: "0.1rem 0.45rem",
                        borderRadius: "4px",
                      }}
                    >
                      auto-filled
                    </span>
                  </label> */}
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      marginBottom: "0.5rem",
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "0.4rem",
                    }}
                  >
                    Doctrack Remarks
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: "500",
                        color: "#2196F3",
                        background: "#2196F315",
                        border: "1px solid #2196F330",
                        padding: "0.1rem 0.45rem",
                        borderRadius: "4px",
                      }}
                    >
                      auto-filled
                    </span>
                    {/* ── Doctrack Toggle ── */}
                    <span
                      onClick={() => setDoctrackEnabled((prev) => !prev)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: "0.1rem 0.5rem 0.1rem 0.35rem",
                        borderRadius: "20px",
                        border: `1px solid ${doctrackEnabled ? "#4CAF5050" : "#ef444450"}`,
                        background: doctrackEnabled ? "#4CAF5015" : "#ef444415",
                        color: doctrackEnabled ? "#4CAF50" : "#ef4444",
                        userSelect: "none",
                        transition: "all 0.2s",
                        marginLeft: "0.25rem",
                      }}
                    >
                      <span
                        style={{
                          width: 22,
                          height: 11,
                          borderRadius: 11,
                          background: doctrackEnabled ? "#4CAF50" : "#ef4444",
                          display: "inline-block",
                          position: "relative",
                          transition: "background 0.2s",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: 2,
                            left: doctrackEnabled ? 13 : 2,
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#fff",
                            transition: "left 0.2s",
                          }}
                        />
                      </span>
                      {doctrackEnabled ? "ON" : "OFF"}
                    </span>
                  </label>

                  {/* end changes */}
                  <input
                    type="text"
                    value={formData.doctackRemarks}
                    onChange={(e) =>
                      handleChange("doctackRemarks", e.target.value)
                    }
                    placeholder="Doctrack remarks..."
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      background: colors.inputBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "8px",
                      color: colors.textPrimary,
                      fontSize: "0.95rem",
                      outline: "none",
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#2196F3")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = colors.inputBorder)
                    }
                  />
                  <p
                    style={{
                      fontSize: "0.72rem",
                      color: colors.textTertiary,
                      marginTop: "0.35rem",
                      marginBottom: 0,
                    }}
                  >
                    💡 Default based on selected decision. You may edit if
                    needed.
                  </p>
                </div>
              )}
              {/* ── End Doctrack Remarks ─────────────────────────────────── */}

              {/* Dual assign banner */}
              {isDualAssign && (
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    background: "#2196F310",
                    border: "1px solid #2196F330",
                    borderRadius: "8px",
                    marginBottom: "1.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    animation: "fadeSlideIn 0.2s ease",
                  }}
                >
                  <span>🔀</span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.82rem",
                      color: colors.textSecondary,
                    }}
                  >
                    This decision will assign{" "}
                    <strong>two users simultaneously</strong> — one from the
                    Evaluator group and one from the S&E group, for each
                    application.
                  </p>
                </div>
              )}

              {/* Evaluator field */}
              {showNextUser && showEvaluator && (
                <div
                  style={{
                    marginBottom: "1.5rem",
                    animation: "fadeSlideIn 0.2s ease",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    {isDualAssign
                      ? "Assign Quality Evaluator"
                      : "Assign Evaluator"}{" "}
                    <span style={{ color: "#ef4444" }}>*</span>
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        fontSize: "0.72rem",
                        fontWeight: "500",
                        color: "#4CAF50",
                        background: "#4CAF5015",
                        border: "1px solid #4CAF5030",
                        padding: "0.1rem 0.45rem",
                        borderRadius: "4px",
                      }}
                    >
                      Evaluator Group
                    </span>
                  </label>
                  {loadingUsers ? (
                    <LoadingField colors={colors} label="evaluators" />
                  ) : (
                    <UserSelect
                      value={formData.evaluator}
                      onChange={(v) => handleChange("evaluator", v)}
                      users={nextUsers}
                      colors={colors}
                    />
                  )}
                  {!loadingUsers && nextUsers.length === 0 && (
                    <EmptyWarning label="Evaluator" />
                  )}
                </div>
              )}

              {/* S&E field */}
              {showNextUser && showSne && (
                <div
                  style={{
                    marginBottom: "1.5rem",
                    animation: "fadeSlideIn 0.2s ease",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Assign S&E <span style={{ color: "#ef4444" }}>*</span>
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        fontSize: "0.72rem",
                        fontWeight: "500",
                        color: "#2196F3",
                        background: "#2196F315",
                        border: "1px solid #2196F330",
                        padding: "0.1rem 0.45rem",
                        borderRadius: "4px",
                      }}
                    >
                      S&E Group
                    </span>
                  </label>
                  {loadingSneUsers ? (
                    <LoadingField colors={colors} label="S&E users" />
                  ) : (
                    <UserSelect
                      value={formData.sne}
                      onChange={(v) => handleChange("sne", v)}
                      users={sneUsers}
                      colors={colors}
                    />
                  )}
                  {!loadingSneUsers && sneUsers.length === 0 && (
                    <EmptyWarning label="S&E" />
                  )}
                </div>
              )}

              {/* Info box */}
              <div
                style={{
                  padding: "1rem",
                  background: "#4CAF5010",
                  border: "1px solid #4CAF5030",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                  }}
                >
                  <span style={{ fontSize: "1.25rem" }}>ℹ️</span>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: colors.textSecondary,
                      lineHeight: "1.5",
                      margin: 0,
                    }}
                  >
                    {isDualAssign
                      ? `Three activity logs will be created per application — decker (Completed), Evaluator (In Progress), and S&E (In Progress). Total: ${records.length * 3} logs.`
                      : `Two activity logs will be created per application — decker (Completed) and assigned user (In Progress). Total: ${records.length * 2} logs.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "1.5rem 2rem",
                borderTop: `2px solid ${colors.cardBorder}`,
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
                flexShrink: 0,
                background: colors.cardBg,
                borderRadius: "0 0 16px 16px",
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: colors.buttonSecondaryBg,
                  border: `1px solid ${colors.buttonSecondaryBorder}`,
                  borderRadius: "8px",
                  color: colors.textPrimary,
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!loading)
                    e.currentTarget.style.background = colors.badgeBg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.buttonSecondaryBg;
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitDisabled}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: isSubmitDisabled ? "#4CAF5080" : "#4CAF50",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  cursor: isSubmitDisabled ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitDisabled)
                    e.currentTarget.style.background = "#45a049";
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitDisabled)
                    e.currentTarget.style.background = "#4CAF50";
                }}
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: "16px",
                        height: "16px",
                        border: "2px solid #ffffff40",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin 0.6s linear infinite",
                      }}
                    />
                    <span>
                      Decking {progress.current}/{progress.total}...
                    </span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>Deck {records.length} Applications</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Confirmation Modal ── */}
      {confirmSubmit && (
        <div
          onClick={() => setConfirmSubmit(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 16,
              padding: "2rem",
              width: 420,
              maxWidth: "90%",
              boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
              animation: "slideInScale 0.25s ease",
            }}
          >
            <div
              style={{
                fontSize: "2rem",
                textAlign: "center",
                marginBottom: "0.75rem",
              }}
            >
              🎯
            </div>
            <h3
              style={{
                margin: "0 0 0.5rem",
                color: colors.textPrimary,
                fontSize: "1.1rem",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              Confirm Decking
            </h3>
            <p
              style={{
                margin: "0 0 1.25rem",
                color: colors.textSecondary,
                fontSize: "0.88rem",
                lineHeight: 1.6,
                textAlign: "center",
              }}
            >
              You are about to deck{" "}
              <strong style={{ color: "#4CAF50" }}>
                {records.length}{" "}
                {records.length === 1 ? "application" : "applications"}
              </strong>{" "}
              with the following details:
            </p>

            {/* Summary */}
            <div
              style={{
                background: colors.badgeBg,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                padding: "0.9rem 1rem",
                marginBottom: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {[
                {
                  label: "Decision",
                  value: formData.deckerDecision,
                  color: colors.textPrimary,
                },
                formData.evaluator
                  ? {
                      label: "Evaluator",
                      value: formData.evaluator,
                      color: "#4CAF50",
                    }
                  : null,
                formData.sne
                  ? { label: "S&E", value: formData.sne, color: "#2196F3" }
                  : null,
                formData.deckerRemarks
                  ? {
                      label: "Remarks",
                      value: formData.deckerRemarks,
                      color: colors.textSecondary,
                    }
                  : null,
                // Doctrack Remarks row in confirmation summary
                formData.doctackRemarks
                  ? {
                      label: "Doctrack Remarks",
                      value: formData.doctackRemarks,
                      color: colors.textSecondary,
                    }
                  : null,
              ]
                .filter(Boolean)
                .map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.85rem",
                      gap: "1rem",
                    }}
                  >
                    <span style={{ color: colors.textTertiary, flexShrink: 0 }}>
                      {item.label}
                    </span>
                    <strong style={{ color: item.color, textAlign: "right" }}>
                      {item.value}
                    </strong>
                  </div>
                ))}
              <div
                style={{
                  borderTop: `1px solid ${colors.cardBorder}`,
                  paddingTop: "0.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.82rem",
                }}
              >
                <span style={{ color: colors.textTertiary }}>
                  Activity logs to create
                </span>
                <strong style={{ color: colors.textPrimary }}>
                  {isDualAssign ? records.length * 3 : records.length * 2} logs
                </strong>
              </div>
            </div>

            <p
              style={{
                margin: "0 0 1.5rem",
                color: colors.textTertiary,
                fontSize: "0.8rem",
                textAlign: "center",
              }}
            >
              This action cannot be undone.
            </p>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => setConfirmSubmit(false)}
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
                Go Back
              </button>
              <button
                onClick={() => {
                  setConfirmSubmit(false);
                  handleSubmit();
                }}
                style={{
                  padding: "0.55rem 1.5rem",
                  borderRadius: 8,
                  border: "none",
                  background: "#4CAF50",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(76,175,80,0.35)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#45a049")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#4CAF50")
                }
              >
                <span>✓</span> Yes, Deck Applications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transmittal Prompt Modal ── */}
      {showTransmittalPrompt && deckResult && (
        <TransmittalPromptModal
          result={deckResult}
          records={succeededRecords}
          colors={colors}
          darkMode={darkMode}
          onYes={handleTransmittalYes}
          onNo={handleTransmittalNo}
        />
      )}

      {alertModal && (
        <AlertModal
          {...alertModal}
          colors={colors}
          onClose={() => setAlertModal(null)}
        />
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInScale { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}

function LoadingField({ colors, label = "users" }) {
  return (
    <div
      style={{
        width: "100%",
        padding: "0.75rem 1rem",
        background: colors.inputBg,
        border: `1px solid ${colors.inputBorder}`,
        borderRadius: "8px",
        color: colors.textTertiary,
        fontSize: "0.95rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "14px",
          height: "14px",
          border: "2px solid #4CAF5030",
          borderTopColor: "#4CAF50",
          borderRadius: "50%",
          animation: "spin 0.6s linear infinite",
        }}
      />
      <span>Loading {label}...</span>
    </div>
  );
}

function UserSelect({ value, onChange, users, colors }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      disabled={users.length === 0}
      style={{
        width: "100%",
        padding: "0.75rem 1rem",
        background: colors.inputBg,
        border: `1px solid ${colors.inputBorder}`,
        borderRadius: "8px",
        color: colors.textPrimary,
        fontSize: "0.95rem",
        outline: "none",
        cursor: users.length === 0 ? "not-allowed" : "pointer",
        opacity: users.length === 0 ? 0.6 : 1,
        transition: "all 0.2s",
        boxSizing: "border-box",
      }}
      onFocus={(e) => {
        if (users.length > 0) e.target.style.borderColor = "#4CAF50";
      }}
      onBlur={(e) => (e.target.style.borderColor = colors.inputBorder)}
    >
      <option value="">
        {users.length === 0 ? "No users available" : "Select a user"}
      </option>
      {users.map((user) => (
        <option key={user.id} value={user.username}>
          {user.username} - {user.first_name} {user.surname}
        </option>
      ))}
    </select>
  );
}

function EmptyWarning({ label }) {
  return (
    <p
      style={{
        fontSize: "0.75rem",
        color: "#ef4444",
        marginTop: "0.5rem",
        marginBottom: 0,
      }}
    >
      ⚠️ No users found in the {label} group.
    </p>
  );
}

function AlertModal({ title, message, detail, onClose, colors }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10002,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(3px)",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 16,
          width: 420,
          maxWidth: "90%",
          overflow: "hidden",
          boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
          animation: "slideInScale 0.25s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.1rem 1.4rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(239,68,68,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle
                cx="10"
                cy="10"
                r="9"
                stroke="#ef4444"
                strokeWidth="1.5"
              />
              <path
                d="M10 6v5M10 13.5v.5"
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.72rem",
                fontWeight: 600,
                color: colors.textTertiary,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {title}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "0.95rem",
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              Operation failed
            </p>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "1.25rem 1.4rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.85rem",
          }}
        >
          <div
            style={{
              padding: "0.85rem 1rem",
              background: "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 10,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.82rem",
                color: "#ef4444",
                lineHeight: 1.6,
              }}
            >
              {message}
            </p>
          </div>

          {detail && (
            <div
              style={{
                padding: "0.7rem 0.9rem",
                background: colors.badgeBg,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 8,
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontSize: "0.8rem", flexShrink: 0, marginTop: 1 }}>
                💡
              </span>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.77rem",
                  color: colors.textSecondary,
                  lineHeight: 1.6,
                }}
              >
                {detail}
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: "0.65rem",
              borderRadius: 8,
              border: "none",
              background: "#ef4444",
              color: "#fff",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default BulkDeckModal;
