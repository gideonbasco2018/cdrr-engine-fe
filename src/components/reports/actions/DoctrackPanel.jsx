// src/components/reports/actions/DoctrackPanel.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getDocumentByRSN, getDocumentLog } from "../../../api/doctrack";
import { TrackingSlipTemplate } from "./DoctrackModal";

const ACCENT = "#2563eb";
const ICON_CIRCLE_BG = "#e0e7ff";

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */
const formatDate = (dateValue) => {
  if (!dateValue) return "N/A";
  if (typeof dateValue === "number") {
    const s = dateValue.toString();
    if (s.length === 8)
      return `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`;
  }
  try {
    return new Date(dateValue).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateValue;
  }
};

const parseSubject = (subject) => {
  if (!subject) return {};
  const parsed = {};
  subject.split("\r\n").forEach((line) => {
    const [key, ...rest] = line.split(":");
    if (key && rest.length > 0) parsed[key.trim()] = rest.join(":").trim();
  });
  return parsed;
};

/* ================================================================== */
/*  Small building blocks (same look as the Edit / View modals)         */
/* ================================================================== */
function PanelCard({ title, icon, colors, children, right = null }) {
  return (
    <div
      style={{
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "8px",
        marginBottom: "0.65rem",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "0.55rem 0.9rem",
          background: colors.cardBg,
          borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.55rem",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: ICON_CIRCLE_BG,
              color: ACCENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.7rem",
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
          <span
            style={{ fontSize: "0.78rem", fontWeight: "700", color: ACCENT }}
          >
            {title}
          </span>
        </span>
        {right}
      </div>
      <div
        style={{
          padding: "0.8rem 0.9rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          background: colors.cardBg,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function PanelRow({ label, value, colors, labelWidth = 105 }) {
  const isNA = !value;
  return (
    <div style={{ display: "flex", fontSize: "0.7rem", gap: "0.35rem" }}>
      <span
        style={{
          flexShrink: 0,
          width: `${labelWidth}px`,
          color: "#7a8190",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span style={{ color: "#7a8190", flexShrink: 0 }}>:</span>
      <span
        style={{
          color: isNA ? colors.textTertiary : colors.textPrimary,
          fontStyle: isNA ? "italic" : "normal",
          fontWeight: 500,
          overflowWrap: "anywhere",
          minWidth: 0,
        }}
      >
        {value || "N/A"}
      </span>
    </div>
  );
}

/* ================================================================== */
/*  Doctrack side panel                                                 */
/* ================================================================== */
function DoctrackPanel({ dtn, colors, onClose }) {
  const [loading, setLoading] = useState(true);
  const [documentData, setDocumentData] = useState(null);
  const [documentLogs, setDocumentLogs] = useState([]);
  const [error, setError] = useState(null);
  const [pdfReady, setPdfReady] = useState(false);
  const [pdfBuilding, setPdfBuilding] = useState(false);

  const slipRef = useRef(null);
  const pdfCache = useRef(null);

  // Fetch the document and its activity logs
  useEffect(() => {
    if (!dtn) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setDocumentData(null);
        setDocumentLogs([]);
        setPdfReady(false);
        pdfCache.current = null;

        const docResponse = await getDocumentByRSN(dtn);
        if (cancelled) return;

        if (docResponse.count > 0 && docResponse.data.length > 0) {
          const doc = docResponse.data[0];
          setDocumentData(doc);
          const logsResponse = await getDocumentLog(doc.docrecID);
          if (cancelled) return;
          const sorted = (logsResponse.data || []).sort(
            (a, b) => new Date(b.logdate) - new Date(a.logdate),
          );
          setDocumentLogs(sorted);
        } else {
          setError("No document tracking data found for this DTN");
        }
      } catch (err) {
        if (!cancelled)
          setError(err.message || "Failed to load document tracking data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [dtn]);

  // Pre-render the tracking slip PDF so the download is instant
  const prerenderPDF = useCallback(async () => {
    if (!slipRef.current || !documentData) return;
    try {
      setPdfBuilding(true);
      setPdfReady(false);
      pdfCache.current = null;

      const images = slipRef.current.querySelectorAll("img");
      await Promise.all(
        Array.from(images).map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              }),
        ),
      );

      const canvas = await html2canvas(slipRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        width: 794,
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;

      let yOffset = 0;
      while (yOffset < imgH) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -yOffset, pageW, imgH);
        yOffset += pageH;
      }

      pdfCache.current = {
        pdf,
        filename: `FDA_TrackingSlip_${documentData.rsn || dtn}.pdf`,
      };
      setPdfReady(true);
    } catch (err) {
      console.error("PDF pre-render failed:", err);
    } finally {
      setPdfBuilding(false);
    }
  }, [documentData, dtn]);

  useEffect(() => {
    if (!loading && !error && documentData && slipRef.current) {
      const timer = setTimeout(() => prerenderPDF(), 400);
      return () => clearTimeout(timer);
    }
  }, [loading, error, documentData, documentLogs, prerenderPDF]);

  const handleDownloadPDF = () => {
    if (!pdfCache.current) return;
    pdfCache.current.pdf.save(pdfCache.current.filename);
  };

  const parsedSubject = parseSubject(documentData?.subject);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      {/* Hidden slip used for PDF generation */}
      {documentData && (
        <TrackingSlipTemplate
          documentData={documentData}
          documentLogs={documentLogs}
          parsedSubject={parsedSubject}
          slipRef={slipRef}
        />
      )}

      {/* Header */}
      <div
        style={{
          padding: "0.55rem 0.9rem",
          borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          gap: "0.5rem",
        }}
      >
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: ACCENT }}>
          Document Tracking
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!loading && !error && documentData && (
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={!pdfReady}
              style={{
                background: pdfReady ? "#003580" : "#6b7280",
                border: "none",
                borderRadius: 6,
                padding: "0.25rem 0.65rem",
                color: "#fff",
                fontSize: "0.65rem",
                fontWeight: 600,
                cursor: pdfReady ? "pointer" : "not-allowed",
                opacity: pdfReady ? 1 : 0.7,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                whiteSpace: "nowrap",
              }}
            >
              {pdfBuilding ? (
                <>
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      border: "2px solid #fff",
                      borderTop: "2px solid transparent",
                      borderRadius: "50%",
                      animation: "dtp-spin 0.8s linear infinite",
                    }}
                  />
                  Preparing PDF...
                </>
              ) : (
                "📄 Download Tracking Slip"
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              borderRadius: 6,
              padding: "0.15rem 0.5rem",
              fontSize: "0.65rem",
              cursor: "pointer",
            }}
          >
            Hide ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "0.9rem",
        }}
      >
        {loading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "3rem 1rem",
              gap: "0.75rem",
              color: colors.textTertiary,
              fontSize: "0.72rem",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                border: `3px solid ${colors.cardBorder}`,
                borderTop: `3px solid ${ACCENT}`,
                borderRadius: "50%",
                animation: "dtp-spin 1s linear infinite",
              }}
            />
            Loading document tracking data...
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "0.75rem 0.9rem",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "8px",
              color: "#EF4444",
              fontSize: "0.72rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && documentData && (
          <>
            <PanelCard title="Basic Information" icon="ℹ" colors={colors}>
              <PanelRow label="RSN" value={documentData.rsn} colors={colors} />
              <PanelRow
                label="Document Rec ID"
                value={documentData.docrecID}
                colors={colors}
              />
              <PanelRow
                label="Classification"
                value={documentData.docclassName}
                colors={colors}
              />
              <PanelRow
                label="Date Received"
                value={formatDate(documentData.datereceived)}
                colors={colors}
              />
              <PanelRow
                label="Office Source"
                value={documentData.officesource}
                colors={colors}
              />
              <PanelRow
                label="Status"
                value={documentData.transstatus === 1 ? "Active" : "Inactive"}
                colors={colors}
              />
            </PanelCard>

            {documentData.subject && (
              <PanelCard title="Application Details" icon="#" colors={colors}>
                {Object.entries(parsedSubject).map(([key, value]) => (
                  <PanelRow
                    key={key}
                    label={key}
                    value={value}
                    colors={colors}
                  />
                ))}
              </PanelCard>
            )}

            {documentData.remarks && (
              <PanelCard title="Remarks" icon="✎" colors={colors}>
                <p
                  style={{
                    fontSize: "0.7rem",
                    color: colors.textPrimary,
                    lineHeight: 1.5,
                    margin: 0,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {documentData.remarks}
                </p>
              </PanelCard>
            )}

            <PanelCard
              title="Activity Timeline"
              icon="⏱"
              colors={colors}
              right={
                documentLogs.length > 0 ? (
                  <span
                    style={{
                      padding: "0.1rem 0.5rem",
                      background: ICON_CIRCLE_BG,
                      color: ACCENT,
                      borderRadius: "999px",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                    }}
                  >
                    {documentLogs.length} logs
                  </span>
                ) : null
              }
            >
              {documentLogs.length === 0 ? (
                <div
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    color: colors.textTertiary,
                    fontSize: "0.7rem",
                  }}
                >
                  No activity logs found
                </div>
              ) : (
                documentLogs.map((log, index) => (
                  <div
                    key={log.logID}
                    style={{
                      display: "flex",
                      gap: "0.6rem",
                      position: "relative",
                      paddingBottom:
                        index < documentLogs.length - 1 ? "0.75rem" : 0,
                    }}
                  >
                    {index < documentLogs.length - 1 && (
                      <div
                        style={{
                          position: "absolute",
                          left: 5,
                          top: 14,
                          bottom: 0,
                          width: 2,
                          background: colors.cardBorder,
                        }}
                      />
                    )}
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "#16a34a",
                        flexShrink: 0,
                        marginTop: 2,
                        zIndex: 1,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "0.62rem",
                          color: colors.textTertiary,
                          fontWeight: 600,
                          marginBottom: "0.2rem",
                        }}
                      >
                        {formatDate(log.logdate)}
                      </div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: colors.textPrimary,
                          lineHeight: 1.5,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {log.remarks}
                      </div>
                      {log.userID && (
                        <div
                          style={{
                            fontSize: "0.6rem",
                            color: colors.textTertiary,
                            marginTop: "0.2rem",
                          }}
                        >
                          User ID: {log.userID}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </PanelCard>
          </>
        )}
      </div>

      <style>{`@keyframes dtp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default DoctrackPanel;
