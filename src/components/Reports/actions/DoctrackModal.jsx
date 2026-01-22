// src/components/UploadReports/actions/DoctrackModal.jsx

import { useState, useEffect } from "react";
import { getDocumentByRSN, getDocumentLog } from "../../../api/doctrack";

function DoctrackModal({ record, onClose, colors }) {
  const [loading, setLoading] = useState(true);
  const [documentData, setDocumentData] = useState(null);
  const [documentLogs, setDocumentLogs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDoctrackData();
  }, [record]);

  const fetchDoctrackData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get document by RSN
      const docResponse = await getDocumentByRSN(record.dtn);

      if (docResponse.count > 0 && docResponse.data.length > 0) {
        const doc = docResponse.data[0];
        setDocumentData(doc);

        // Get document logs using docrecID
        const logsResponse = await getDocumentLog(doc.docrecID);
        // Sort by date descending (latest first)
        const sortedLogs = (logsResponse.data || []).sort((a, b) => {
          return new Date(b.logdate) - new Date(a.logdate);
        });
        setDocumentLogs(sortedLogs);
      } else {
        setError("No document tracking data found for this DTN");
      }
    } catch (err) {
      console.error("Error fetching doctrack data:", err);
      setError(err.message || "Failed to load document tracking data");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";

    // Handle YYYYMMDD format
    if (typeof dateValue === "number") {
      const dateStr = dateValue.toString();
      if (dateStr.length === 8) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        return `${year}-${month}-${day}`;
      }
    }

    // Handle ISO date strings
    try {
      const date = new Date(dateValue);
      return date.toLocaleString("en-PH", {
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

    const lines = subject.split("\r\n");
    const parsed = {};

    lines.forEach((line) => {
      const [key, ...valueParts] = line.split(":");
      if (key && valueParts.length > 0) {
        parsed[key.trim()] = valueParts.join(":").trim();
      }
    });

    return parsed;
  };

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
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 9998,
          animation: "fadeIn 0.2s ease-out",
        }}
      />

      {/* Modal - 70% width */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "70%",
          height: "100vh",
          background: colors.cardBg,
          boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.3)",
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
                fontSize: "1.5rem",
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
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.tableRowHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "2rem",
          }}
        >
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
              {/* Left Column - Document Details */}
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
                    marginBottom: "0",
                  }}
                >
                  📄 Document Information
                </h3>

                {/* Basic Info */}
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

                {/* Application Details */}
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
                      {Object.entries(parseSubject(documentData.subject)).map(
                        ([key, value]) => (
                          <DetailRow
                            key={key}
                            label={key}
                            value={value}
                            colors={colors}
                          />
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Remarks */}
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

              {/* Right Column - Activity Logs */}
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
                        {/* Timeline indicator */}
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

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
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
        gap: "1.5rem",
      }}
    >
      <span
        style={{
          fontSize: "0.9rem",
          color: colors.textTertiary,
          fontWeight: "500",
          minWidth: "140px",
        }}
      >
        {label}:
      </span>
      <span
        style={{
          fontSize: "0.9rem",
          color: colors.textSecondary,
          textAlign: "right",
          flex: 1,
          wordBreak: "break-word",
        }}
      >
        {value || "N/A"}
      </span>
    </div>
  );
}

export default DoctrackModal;
