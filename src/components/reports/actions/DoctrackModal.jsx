// src/components/reports/actions/DoctrackModal.jsx
//
// Dependencies: npm install jspdf html2canvas --legacy-peer-deps

import { useState, useEffect, useRef, useCallback } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getDocumentByRSN, getDocumentLog } from "../../../api/doctrack";

// ─────────────────────────────────────────────
// Code 128B barcode generator (no external lib)
// ─────────────────────────────────────────────
const CODE128_CHARS =
  " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";

const CODE128_PATTERNS = [
  "11011001100",
  "11001101100",
  "11001100110",
  "10010011000",
  "10010001100",
  "10001001100",
  "10011001000",
  "10011000100",
  "10001100100",
  "11001001000",
  "11001000100",
  "11000100100",
  "10110011100",
  "10011011100",
  "10011001110",
  "10111001100",
  "10011101100",
  "10011100110",
  "11001110010",
  "11001011100",
  "11001001110",
  "11011100100",
  "11001110100",
  "11101101110",
  "11101001100",
  "11100101100",
  "11100100110",
  "11101100100",
  "11100110100",
  "11100110010",
  "11011011000",
  "11011000110",
  "11000110110",
  "10100011000",
  "10001011000",
  "10001000110",
  "10110001000",
  "10001101000",
  "10001100010",
  "11010001000",
  "11000101000",
  "11000100010",
  "10110111000",
  "10110001110",
  "10001101110",
  "10111011000",
  "10111000110",
  "10001110110",
  "11101110110",
  "11010001110",
  "11000101110",
  "11011101000",
  "11011100010",
  "11011101110",
  "11101011000",
  "11101000110",
  "11100010110",
  "11101101000",
  "11101100010",
  "11100011010",
  "11101111010",
  "11001000010",
  "11110001010",
  "10100110000",
  "10100001100",
  "10010110000",
  "10010000110",
  "10000101100",
  "10000100110",
  "10110010000",
  "10110000100",
  "10011010000",
  "10011000010",
  "10000110100",
  "10000110010",
  "11000010010",
  "11001010000",
  "11110111010",
  "11000010100",
  "10001111010",
  "10100111100",
  "10010111100",
  "10010011110",
  "10111100100",
  "10011110100",
  "10011110010",
  "11110100100",
  "11110010100",
  "11110010010",
  "11011011110",
  "11011110110",
  "11110110110",
  "10101111000",
  "10100011110",
  "10001011110",
  "10111101000",
  "10111100010",
  "11110101000",
  "11110100010",
  "10111011110",
  "10111101110",
  "11101011110",
  "11110101110",
  "11010000100",
  "11010010000",
  "11010011100",
  "11000111010",
  "11010111000",
];

const START_B = 104;
const STOP_PATTERN = "1100011101011";

function encode128B(text) {
  const bars = [];
  let checksum = START_B;
  bars.push(CODE128_PATTERNS[START_B]);
  for (let i = 0; i < text.length; i++) {
    const idx = CODE128_CHARS.indexOf(text[i]);
    if (idx === -1) continue;
    checksum += (i + 1) * idx;
    bars.push(CODE128_PATTERNS[idx]);
  }
  bars.push(CODE128_PATTERNS[checksum % 103]);
  bars.push(STOP_PATTERN);
  return bars.join("");
}

function Code128SVG({ value, height = 50, barWidth = 1.5 }) {
  if (!value) return null;
  const encoded = encode128B(value);
  const totalWidth = encoded.length * barWidth;

  const rects = [];
  let x = 0;
  for (let i = 0; i < encoded.length; i++) {
    const fill = encoded[i] === "1" ? "#000" : "#fff";
    if (i === 0 || encoded[i] !== encoded[i - 1]) {
      rects.push({ x, fill, w: barWidth });
    } else {
      rects[rects.length - 1].w += barWidth;
    }
    x += barWidth;
  }

  return (
    <svg
      width={totalWidth}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={0} width={r.w} height={height} fill={r.fill} />
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────
// Hidden FDA Tracking Slip — matches real PDF exactly
// ─────────────────────────────────────────────
function TrackingSlipTemplate({
  documentData,
  documentLogs,
  parsedSubject,
  slipRef,
}) {
  const formatDateCreated = (v) => {
    if (!v) return "N/A";
    try {
      const s = v.toString();
      if (s.length === 8) {
        const year = s.substring(0, 4);
        const month = s.substring(4, 6);
        const day = s.substring(6, 8);
        const MONTHS = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        return `${parseInt(day, 10)} ${MONTHS[parseInt(month, 10) - 1]} ${year}`;
      }
      return new Date(v).toLocaleDateString("en-PH", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return v;
    }
  };

  const subjectText =
    Object.entries(parsedSubject || {})
      .map(([k, val]) => `${k}: ${val}`)
      .join("\n") ||
    documentData?.subject ||
    "N/A";

  // 11 empty rows — matching the real PDF
  const emptyRows = Array(11).fill(null);

  const thStyle = {
    border: "1px solid #a7a7a7",
    padding: "5px 6px",
    textAlign: "center",
    fontSize: "10px",
    fontWeight: "700",
    background: "#fff",
    verticalAlign: "middle",
  };

  const tdStyle = {
    border: "1px solid #a7a7a7",
    padding: "4px 6px",
    fontSize: "10px",
    verticalAlign: "middle",
    height: "28px",
  };

  return (
    <div
      ref={slipRef}
      style={{
        position: "fixed",
        top: "-9999px",
        left: "-9999px",
        width: "794px",
        minHeight: "1123px",
        background: "#fff",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "11px",
        color: "#111",
        padding: "48px 60px",
        boxSizing: "border-box",
        zIndex: -1,
        overflow: "hidden",
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          borderBottom: "2px solid #111",
          paddingBottom: "12px",
          marginBottom: "20px",
        }}
      >
        <img
          src="/images/FDA.png"
          alt="FDA"
          crossOrigin="anonymous"
          style={{
            width: "110px",
            height: "60px",
            objectFit: "contain",
            flexShrink: 0,
            marginLeft: "20px",
          }}
        />
        <img
          src="/images/DOH.png"
          alt="DOH"
          crossOrigin="anonymous"
          style={{
            width: "60px",
            height: "60px",
            objectFit: "contain",
            flexShrink: 0,
            marginLeft: "6px",
          }}
        />

        <div
          style={{
            width: "1.5px",
            height: "56px",
            background: "#bbb",
            margin: "0 45px",
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "10px",
              color: "#333",
              lineHeight: "1.6",
              margin: 0,
            }}
          >
            Republic of the Philippines
            <br />
            Department of Health
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              letterSpacing: "0.3px",
              marginTop: "2px",
            }}
          >
            FOOD AND DRUG ADMINISTRATION
          </div>
        </div>

        <img
          src="/images/bagong_pilipinas.png"
          alt="Bagong Pilipinas"
          crossOrigin="anonymous"
          style={{
            width: "60px",
            height: "60px",
            objectFit: "contain",
            flexShrink: 0,
            marginRight: "20px",
          }}
        />
      </div>

      {/* ── TITLE ── */}
      <div
        style={{
          textAlign: "center",
          fontSize: "14px",
          fontWeight: "bold",
          marginBottom: "20px",
          letterSpacing: "0.2px",
        }}
      >
        FDA Document Tracking Slip
      </div>

      {/* ── INFO TABLE ── */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                fontWeight: "bold",
                width: "170px",
                padding: "7px 4px",
                verticalAlign: "top",
                whiteSpace: "nowrap",
                borderBottom: "1px solid #ccc",
              }}
            >
              Date Created:
            </td>
            <td style={{ padding: "7px 4px", borderBottom: "1px solid #ccc" }}>
              {formatDateCreated(documentData?.datereceived)}
            </td>
          </tr>
          <tr>
            <td
              style={{
                fontWeight: "bold",
                padding: "7px 4px",
                verticalAlign: "middle",
                whiteSpace: "nowrap",
                borderBottom: "1px solid #ccc",
              }}
            >
              Doctrack Number:
            </td>
            <td style={{ padding: "7px 4px", borderBottom: "1px solid #ccc" }}>
              <Code128SVG
                value={documentData?.rsn || ""}
                height={35}
                barWidth={1}
              />
              <div
                style={{
                  fontFamily: "Courier New, monospace",
                  fontSize: "10px",
                  letterSpacing: "2px",
                  marginTop: "3px",
                }}
              >
                {documentData?.rsn || "N/A"}
              </div>
            </td>
          </tr>
          <tr>
            <td
              style={{
                fontWeight: "bold",
                padding: "7px 4px",
                whiteSpace: "nowrap",
                borderBottom: "1px solid #ccc",
              }}
            >
              Classification:
            </td>
            <td style={{ padding: "7px 4px", borderBottom: "1px solid #ccc" }}>
              {documentData?.docclassName || "N/A"}
            </td>
          </tr>
          <tr>
            <td
              style={{
                fontWeight: "bold",
                padding: "7px 4px",
                whiteSpace: "nowrap",
                borderBottom: "1px solid #ccc",
              }}
            >
              Originating Office:
            </td>
            <td style={{ padding: "7px 4px", borderBottom: "1px solid #ccc" }}>
              {documentData?.officesource || "N/A"}
            </td>
          </tr>
          <tr>
            <td
              style={{
                fontWeight: "bold",
                padding: "7px 4px",
                verticalAlign: "top",
                whiteSpace: "nowrap",
                borderBottom: "1px solid #ccc",
              }}
            >
              Subject:
            </td>
            <td
              style={{
                padding: "7px 4px",
                borderBottom: "1px solid #ccc",
                whiteSpace: "pre-wrap",
                lineHeight: "1.6",
                fontSize: "10.5px",
              }}
            >
              {/* {subjectText.split("\n").filter(Boolean)} */}
              {subjectText}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── INTERNAL ROUTING DETAILS ── */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ ...thStyle, width: "16%" }}>
              DATE
            </th>
            <th colSpan={2} style={{ ...thStyle }}>
              OFFICE
            </th>
            <th rowSpan={2} style={{ ...thStyle, width: "38%" }}>
              ACTION REQUIRED/TAKEN, REMARKS
            </th>
            <th rowSpan={2} style={{ ...thStyle, width: "14%" }}>
              RECEIVED BY:
            </th>
          </tr>
          <tr>
            <th style={{ ...thStyle, width: "13%" }}>FROM</th>
            <th style={{ ...thStyle, width: "13%" }}>TO</th>
          </tr>
        </thead>
        <tbody>
          {emptyRows.map((_, i) => (
            <tr key={i}>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── WATERMARK ── */}
      <img
        src="/images/FDA.png"
        alt=""
        crossOrigin="anonymous"
        style={{
          position: "absolute",
          top: "52%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-30deg)",
          width: "380px",
          opacity: 0.055,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// DoctrackModal
// ─────────────────────────────────────────────
function DoctrackModal({ record, onClose, colors }) {
  const [loading, setLoading] = useState(true);
  const [documentData, setDocumentData] = useState(null);
  const [documentLogs, setDocumentLogs] = useState([]);
  const [error, setError] = useState(null);
  const [pdfReady, setPdfReady] = useState(false);
  const [pdfBuilding, setPdfBuilding] = useState(false);

  const slipRef = useRef(null);
  const pdfCache = useRef(null);

  useEffect(() => {
    fetchDoctrackData();
  }, [record]);

  const fetchDoctrackData = async () => {
    try {
      setLoading(true);
      setError(null);
      const docResponse = await getDocumentByRSN(record.dtn);
      if (docResponse.count > 0 && docResponse.data.length > 0) {
        const doc = docResponse.data[0];
        setDocumentData(doc);
        const logsResponse = await getDocumentLog(doc.docrecID);
        const sorted = (logsResponse.data || []).sort(
          (a, b) => new Date(b.logdate) - new Date(a.logdate),
        );
        setDocumentLogs(sorted);
      } else {
        setError("No document tracking data found for this DTN");
      }
    } catch (err) {
      setError(err.message || "Failed to load document tracking data");
    } finally {
      setLoading(false);
    }
  };

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
        filename: `FDA_TrackingSlip_${documentData.rsn || record.dtn}.pdf`,
      };
      setPdfReady(true);
    } catch (err) {
      console.error("PDF pre-render failed:", err);
    } finally {
      setPdfBuilding(false);
    }
  }, [documentData, documentLogs]);

  useEffect(() => {
    if (!loading && !error && documentData && slipRef.current) {
      const timer = setTimeout(() => prerenderPDF(), 400);
      return () => clearTimeout(timer);
    }
  }, [loading, error, documentData, documentLogs]);

  const handleDownloadPDF = () => {
    if (!pdfCache.current) return;
    pdfCache.current.pdf.save(pdfCache.current.filename);
  };

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

  const parsedSubject = parseSubject(documentData?.subject);

  return (
    <>
      {documentData && (
        <TrackingSlipTemplate
          documentData={documentData}
          documentLogs={documentLogs}
          parsedSubject={parsedSubject}
          slipRef={slipRef}
        />
      )}

      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 9998,
          animation: "fadeIn 0.2s ease-out",
        }}
      />

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "70%",
          height: "100vh",
          background: colors.cardBg,
          boxShadow: "-4px 0 24px rgba(0,0,0,0.3)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.3s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.5rem 2rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: colors.tableBg,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "1.2rem",
                fontWeight: "700",
                color: colors.textPrimary,
                margin: 0,
                marginBottom: "0.25rem",
              }}
            >
              📋 Document Tracking Details
            </h2>
            <p
              style={{
                fontSize: "0.9rem",
                color: colors.textTertiary,
                margin: 0,
              }}
            >
              DTN: {record.dtn}
            </p>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            {!loading && !error && documentData && (
              <button
                onClick={handleDownloadPDF}
                disabled={!pdfReady}
                style={{
                  background: pdfReady ? "#003580" : "#6b7280",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.5rem 1rem",
                  cursor: pdfReady ? "pointer" : "not-allowed",
                  color: "#fff",
                  fontSize: "0.82rem",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  transition: "background 0.2s",
                  whiteSpace: "nowrap",
                  opacity: pdfReady ? 1 : 0.7,
                }}
                onMouseEnter={(e) => {
                  if (pdfReady) e.currentTarget.style.background = "#002060";
                }}
                onMouseLeave={(e) => {
                  if (pdfReady) e.currentTarget.style.background = "#003580";
                }}
              >
                {pdfBuilding ? (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: "13px",
                        height: "13px",
                        border: "2px solid #fff",
                        borderTop: "2px solid transparent",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
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
              onClick={onClose}
              style={{
                background: "transparent",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: "8px",
                padding: "0.5rem",
                cursor: "pointer",
                color: colors.textPrimary,
                fontSize: "1.25rem",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = colors.tableRowHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
          {loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "3rem",
                color: colors.textTertiary,
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  border: `3px solid ${colors.cardBorder}`,
                  borderTop: "3px solid #4CAF50",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
                Loading document tracking data...
              </p>
            </div>
          )}
          {error && (
            <div
              style={{
                padding: "1rem",
                background: "#ef444410",
                border: "1px solid #ef4444",
                borderRadius: "8px",
                color: "#ef4444",
                fontSize: "0.9rem",
              }}
            >
              ⚠️ {error}
            </div>
          )}
          {!loading && !error && documentData && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "45% 55%",
                gap: "1.5rem",
              }}
            >
              {/* Left */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: "700",
                    color: colors.textPrimary,
                    marginBottom: 0,
                  }}
                >
                  📄 Document Information
                </h3>
                <div
                  style={{
                    padding: "1rem",
                    background: colors.tableBg,
                    borderRadius: "8px",
                    border: `1px solid ${colors.cardBorder}`,
                  }}
                >
                  <h4
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      marginBottom: "0.75rem",
                      marginTop: 0,
                    }}
                  >
                    Basic Information
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.65rem",
                    }}
                  >
                    <DetailRow
                      label="RSN"
                      value={documentData.rsn}
                      colors={colors}
                    />
                    <DetailRow
                      label="Document Rec ID"
                      value={documentData.docrecID}
                      colors={colors}
                    />
                    <DetailRow
                      label="Classification"
                      value={documentData.docclassName}
                      colors={colors}
                    />
                    <DetailRow
                      label="Date Received"
                      value={formatDate(documentData.datereceived)}
                      colors={colors}
                    />
                    <DetailRow
                      label="Office Source"
                      value={documentData.officesource}
                      colors={colors}
                    />
                    <DetailRow
                      label="Status"
                      value={
                        documentData.transstatus === 1 ? "Active" : "Inactive"
                      }
                      colors={colors}
                    />
                  </div>
                </div>
                {documentData.subject && (
                  <div
                    style={{
                      padding: "1rem",
                      background: colors.tableBg,
                      borderRadius: "8px",
                      border: `1px solid ${colors.cardBorder}`,
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        color: colors.textPrimary,
                        marginBottom: "0.75rem",
                        marginTop: 0,
                      }}
                    >
                      Application Details
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.65rem",
                      }}
                    >
                      {Object.entries(parsedSubject).map(([key, value]) => (
                        <DetailRow
                          key={key}
                          label={key}
                          value={value}
                          colors={colors}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {documentData.remarks && (
                  <div
                    style={{
                      padding: "1rem",
                      background: colors.tableBg,
                      borderRadius: "8px",
                      border: `1px solid ${colors.cardBorder}`,
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        color: colors.textPrimary,
                        marginBottom: "0.5rem",
                        marginTop: 0,
                      }}
                    >
                      Remarks
                    </h4>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: colors.textSecondary,
                        lineHeight: "1.5",
                        margin: 0,
                      }}
                    >
                      {documentData.remarks}
                    </p>
                  </div>
                )}
              </div>
              {/* Right */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "1rem",
                      fontWeight: "700",
                      color: colors.textPrimary,
                      margin: 0,
                    }}
                  >
                    📝 Activity Timeline
                  </h3>
                  {documentLogs.length > 0 && (
                    <span
                      style={{
                        padding: "0.2rem 0.6rem",
                        background: colors.badgeBg,
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        color: colors.textTertiary,
                        fontWeight: "600",
                      }}
                    >
                      {documentLogs.length} logs
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  {documentLogs.length === 0 ? (
                    <div
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: colors.textTertiary,
                        fontSize: "0.85rem",
                        background: colors.tableBg,
                        borderRadius: "8px",
                        border: `1px solid ${colors.cardBorder}`,
                      }}
                    >
                      No activity logs found
                    </div>
                  ) : (
                    documentLogs.map((log, index) => (
                      <div
                        key={log.logID}
                        style={{
                          padding: "1rem",
                          background: colors.tableBg,
                          borderRadius: "8px",
                          border: `1px solid ${colors.cardBorder}`,
                          position: "relative",
                        }}
                      >
                        {index < documentLogs.length - 1 && (
                          <div
                            style={{
                              position: "absolute",
                              left: "1.5rem",
                              top: "2.75rem",
                              bottom: "-0.75rem",
                              width: "2px",
                              background: colors.cardBorder,
                            }}
                          />
                        )}
                        <div
                          style={{
                            display: "flex",
                            gap: "0.75rem",
                            position: "relative",
                          }}
                        >
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              background: "#4CAF50",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              fontSize: "0.9rem",
                              zIndex: 1,
                            }}
                          >
                            📝
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: "0.8rem",
                                color: colors.textTertiary,
                                marginBottom: "0.35rem",
                                fontWeight: "500",
                              }}
                            >
                              {formatDate(log.logdate)}
                            </div>
                            <p
                              style={{
                                fontSize: "0.85rem",
                                color: colors.textSecondary,
                                lineHeight: "1.5",
                                margin: 0,
                              }}
                            >
                              {log.remarks}
                            </p>
                            {log.userID && (
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: colors.textTertiary,
                                  marginTop: "0.35rem",
                                }}
                              >
                                User ID: {log.userID}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn       { from { opacity: 0; }                  to { opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes spin         { to   { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

function DetailRow({ label, value, colors }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "0.75rem",
      }}
    >
      <span
        style={{
          fontSize: "0.9rem",
          color: colors.textTertiary,
          fontWeight: "500",
          width: "50%",
          flexShrink: 0,
          wordBreak: "break-word",
        }}
      >
        {label}:
      </span>
      <span
        style={{
          fontSize: "0.9rem",
          color: colors.textSecondary,
          textAlign: "right",
          width: "50%",
          wordBreak: "break-word",
        }}
      >
        {value || "N/A"}
      </span>
    </div>
  );
}

export default DoctrackModal;
