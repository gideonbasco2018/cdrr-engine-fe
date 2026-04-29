import { useState, useEffect, useCallback } from "react";
import { getDashboardAllRecentApplications } from "../../api/dashboard";
import { FB } from "./constants";

const PAGE_SIZE = 15;

export default function RecentApplicationsModal({ onClose, onRowClick, ui }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchPage = useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboardAllRecentApplications({
        page: p,
        page_size: PAGE_SIZE,
      });
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.total_pages);
      setPage(res.page ?? p);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to load");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(startRow + PAGE_SIZE - 1, total);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.52)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 14,
          width: "100%",
          maxWidth: 1100,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.28)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `${FB}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
              }}
            >
              📋
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: ui.textPrimary,
                }}
              >
                Recent Applications
              </h3>
              <p style={{ margin: 0, fontSize: "0.75rem", color: ui.textSub }}>
                {loading
                  ? "Loading…"
                  : `${total.toLocaleString()} total record${total !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: ui.inputBg,
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 8,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: ui.textMuted,
              fontSize: "1rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
          {loading && (
            <div
              style={{
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 48,
                    borderRadius: 8,
                    background: ui.progressBg,
                    animation: "cdrrPulse 1.2s ease-in-out infinite",
                    animationDelay: `${i * 0.07}s`,
                  }}
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "#e02020",
                fontSize: "0.84rem",
              }}
            >
              ⚠️ {error}&nbsp;
              <button
                onClick={() => fetchPage(page)}
                style={{
                  background: "none",
                  border: "none",
                  color: FB,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.84rem",
                  fontFamily: "inherit",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && data.length === 0 && (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.84rem",
              }}
            >
              No records found.
            </div>
          )}

          {!loading && !error && data.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.8rem",
                  fontFamily: "inherit",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: ui.pageBg,
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    {[
                      { label: "#", align: "center", width: 40 },
                      { label: "DTN", align: "left" },
                      { label: "Company", align: "left" },
                      { label: "Brand Name", align: "left" },
                      { label: "Generic Name", align: "left" },
                      { label: "Step", align: "left" },
                      { label: "Status", align: "center" },
                      { label: "Date", align: "right" },
                    ].map((col, ci) => (
                      <th
                        key={ci}
                        style={{
                          padding: "9px 12px",
                          textAlign: col.align,
                          fontSize: "0.69rem",
                          fontWeight: 700,
                          color: ui.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          borderBottom: `1px solid ${ui.cardBorder}`,
                          whiteSpace: "nowrap",
                          width: col.width || "auto",
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, ri) => {
                    const isEven = ri % 2 === 0;
                    const isLast = ri === data.length - 1;
                    const border = !isLast ? `1px solid ${ui.divider}` : "none";
                    const rowNum = startRow + ri;
                    return (
                      <tr
                        key={row.log_id}
                        onClick={() => onRowClick && onRowClick(row)}
                        style={{
                          background: isEven ? "transparent" : `${ui.pageBg}88`,
                          cursor: onRowClick ? "pointer" : "default",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = ui.hoverBg)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = isEven
                            ? "transparent"
                            : `${ui.pageBg}88`)
                        }
                      >
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "center",
                            color: ui.textMuted,
                            fontSize: "0.73rem",
                            borderBottom: border,
                          }}
                        >
                          {rowNum}
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            borderBottom: border,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              color: FB,
                              fontSize: "0.82rem",
                            }}
                          >
                            {row.dtn || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            color: ui.textSub,
                            borderBottom: border,
                            minWidth: 180,
                            maxWidth: 280,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              fontSize: "0.76rem",
                              lineHeight: 1.4,
                              wordBreak: "break-word",
                            }}
                          >
                            {row.lto_company || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            color: ui.textPrimary,
                            fontWeight: 500,
                            borderBottom: border,
                            maxWidth: 180,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.brand_name || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            color: ui.textSub,
                            borderBottom: border,
                            maxWidth: 160,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.generic_name || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            color: ui.textSub,
                            borderBottom: border,
                            maxWidth: 140,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: "0.76rem",
                            }}
                          >
                            {row.app_step || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "center",
                            borderBottom: border,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 10px",
                              borderRadius: 99,
                              fontSize: "0.73rem",
                              fontWeight: 700,
                              color: row.status_color,
                              background: row.status_bg,
                            }}
                          >
                            {row.status_label}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "right",
                            color: ui.textMuted,
                            fontSize: "0.76rem",
                            borderBottom: border,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.date_display}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            gap: 8,
          }}
        >
          <span style={{ fontSize: "0.74rem", color: ui.textMuted }}>
            {total > 0
              ? `${startRow}–${endRow} of ${total.toLocaleString()} records`
              : ""}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => fetchPage(page - 1)}
              disabled={page <= 1 || loading}
              style={{
                padding: "5px 12px",
                borderRadius: 7,
                border: `1px solid ${page <= 1 ? ui.cardBorder : ui.metricBorder}`,
                background: "transparent",
                color: page <= 1 ? ui.textMuted : ui.textPrimary,
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: page <= 1 ? "not-allowed" : "pointer",
                opacity: page <= 1 ? 0.4 : 1,
                fontFamily: "inherit",
              }}
            >
              ‹ Prev
            </button>
            <span
              style={{
                fontSize: "0.78rem",
                color: ui.textSub,
                padding: "0 8px",
                whiteSpace: "nowrap",
              }}
            >
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchPage(page + 1)}
              disabled={page >= totalPages || loading}
              style={{
                padding: "5px 12px",
                borderRadius: 7,
                border: `1px solid ${page >= totalPages ? ui.cardBorder : ui.metricBorder}`,
                background: "transparent",
                color: page >= totalPages ? ui.textMuted : ui.textPrimary,
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                opacity: page >= totalPages ? 0.4 : 1,
                fontFamily: "inherit",
              }}
            >
              Next ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
