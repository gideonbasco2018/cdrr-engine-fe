// src/components/monitoring/records/AllRecords.jsx
import { useState, useEffect, useCallback } from "react";
import { getAllRecords } from "../../../api/monitoring";

const FB = "#1877F2";

const timelineColors = {
  Within: { bg: "#dcfce7", color: "#15803d" },
  Beyond: { bg: "#fef2f2", color: "#b91c1c" },
};
const timelineColorsDark = {
  Within: { bg: "#0a2e1a", color: "#4ade80" },
  Beyond: { bg: "#2e0a0a", color: "#f87171" },
};

const avatarPalette = [
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#fce7f3", color: "#be185d" },
  { bg: "#d1fae5", color: "#065f46" },
  { bg: "#fef3c7", color: "#92400e" },
  { bg: "#ede9fe", color: "#5b21b6" },
  { bg: "#fee2e2", color: "#991b1b" },
  { bg: "#cffafe", color: "#0e7490" },
  { bg: "#fef9c3", color: "#713f12" },
];

// Simple stable color per user_name string
function nameToAvatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarPalette[Math.abs(hash) % avatarPalette.length];
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

const PAGE_SIZE = 12;

export default function AllRecords({ ui, darkMode, filterUserId = null }) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const colHdr = darkMode ? ui.sidebarBg : "#f8f9fd";

  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  const inputSt = {
    background: ui.inputBg,
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 7,
    padding: "7px 10px",
    fontSize: "0.82rem",
    color: ui.textPrimary,
    outline: "none",
    colorScheme: darkMode ? "dark" : "light",
    fontFamily: font,
  };
  const labelSt = {
    fontSize: "0.68rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
    marginBottom: 4,
    display: "block",
    fontFamily: font,
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
        sort_col: sortCol,
        sort_dir: sortDir,
      };
      if (filterUserId) params.user_id = filterUserId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const data = await getAllRecords(params);
      setRecords(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, sortCol, sortDir, filterUserId, dateFrom, dateTo]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Reset to page 1 when filters change (except page itself)
  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, sortCol, sortDir, filterUserId]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const SortArrow = ({ col }) => {
    const active = sortCol === col;
    return (
      <span
        style={{
          marginLeft: 3,
          fontSize: "0.62rem",
          opacity: active ? 1 : 0.3,
          color: FB,
        }}
      >
        {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    );
  };

  const handleReset = () => {
    setDateFrom("");
    setDateTo("");
    setSortCol("date");
    setSortDir("desc");
    setPage(1);
  };

  const TL = darkMode ? timelineColorsDark : timelineColors;

  return (
    <div
      style={{
        flex: "1 1 360px",
        minWidth: 300,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <p
        style={{
          fontSize: "0.9rem",
          fontWeight: 700,
          color: ui.textPrimary,
          margin: "0 0 8px",
          fontFamily: font,
        }}
      >
        All Records
      </p>

      <div
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Filter Bar */}
        <div
          style={{
            padding: "10px 14px",
            borderBottom: `1px solid ${ui.divider}`,
            background: colHdr,
            display: "flex",
            gap: 10,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "From", val: dateFrom, set: setDateFrom },
            { label: "To", val: dateTo, set: setDateTo },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label style={labelSt}>{label}</label>
              <input
                type="date"
                value={val}
                onChange={(e) => set(e.target.value)}
                style={inputSt}
              />
            </div>
          ))}
          <button
            onClick={handleReset}
            style={{
              padding: "7px 14px",
              fontSize: "0.8rem",
              fontWeight: 500,
              borderRadius: 7,
              border: `1px solid ${ui.cardBorder}`,
              background: "transparent",
              color: ui.textMuted,
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            Reset
          </button>
        </div>

        {/* Column Headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1.3fr 2fr 1fr 1fr 0.9fr",
            background: colHdr,
            borderBottom: `1px solid ${ui.divider}`,
          }}
        >
          {[
            { label: "DTN", col: "dtn" },
            { label: "User", col: "user" },
            { label: "Drug / Application", col: "drug" },
            { label: "Date", col: "date" },
            { label: "Timeline", col: "timeline" },
            { label: "Status", col: "status" },
          ].map(({ label, col }) => (
            <span
              key={col}
              onClick={() => toggleSort(col)}
              style={{
                fontSize: "0.67rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: sortCol === col ? FB : ui.textMuted,
                textAlign: "center",
                padding: "8px 12px",
                cursor: "pointer",
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.15s",
                fontFamily: font,
              }}
            >
              {label}
              <SortArrow col={col} />
            </span>
          ))}
        </div>

        {/* Table Body */}
        <div style={{ flex: 1 }}>
          {loading ? (
            <div
              style={{
                padding: "32px",
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.84rem",
                fontFamily: font,
              }}
            >
              Loading records...
            </div>
          ) : error ? (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#e02020",
                fontSize: "0.8rem",
                fontFamily: font,
              }}
            >
              {error}
            </div>
          ) : records.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.84rem",
                fontFamily: font,
              }}
            >
              No records found
            </div>
          ) : (
            records.map((row, i) => {
              const tlStyle = TL[row.timeline] || {
                bg: "#f3f4f6",
                color: "#374151",
              };
              const av = nameToAvatarColor(row.user_name || "");

              // Status badge colors
              const statusColors = {
                COMPLETED: { bg: "#dcfce7", color: "#15803d" },
                "IN PROGRESS": { bg: "#fef9c3", color: "#a16207" },
              };
              const statusColorsDark = {
                COMPLETED: { bg: "#0a2e1a", color: "#4ade80" },
                "IN PROGRESS": { bg: "#2a2000", color: "#fde68a" },
              };
              const statusKey = (row.app_status || "").toUpperCase();
              const statusPalette = darkMode ? statusColorsDark : statusColors;
              const sc = statusPalette[statusKey] || {
                bg: "#f3f4f6",
                color: "#374151",
              };

              return (
                <div
                  key={`${row.id}-${i}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.6fr 1.3fr 2fr 1fr 1fr 0.9fr",
                    borderBottom:
                      i < records.length - 1
                        ? `1px solid ${ui.divider}`
                        : "none",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = ui.hoverBg)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {/* DTN */}
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: FB,
                      fontWeight: 700,
                      textAlign: "center",
                      padding: "10px 12px",
                      fontFamily: "monospace",
                      alignSelf: "center",
                    }}
                  >
                    {row.dtn || "—"}
                  </span>

                  {/* User */}
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: ui.textPrimary,
                      fontWeight: 500,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      padding: "10px 12px",
                    }}
                  >
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 5 }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: av.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 100,
                        }}
                      >
                        {row.user_name || "—"}
                      </span>
                    </span>
                    {row.app_step && (
                      <span
                        style={{
                          fontSize: "0.64rem",
                          color: ui.textMuted,
                          fontFamily: font,
                        }}
                      >
                        {row.app_step}
                      </span>
                    )}
                  </span>

                  {/* Drug */}
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: ui.textSub,
                      padding: "10px 12px",
                      alignSelf: "center",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontFamily: font,
                    }}
                  >
                    {row.drug_name || "—"}
                  </span>

                  {/* Date */}
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: ui.textPrimary,
                      textAlign: "center",
                      padding: "10px 12px",
                      alignSelf: "center",
                      fontFamily: font,
                    }}
                  >
                    {row.date_received_cent
                      ? new Date(
                          row.date_received_cent + "T00:00:00",
                        ).toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </span>

                  {/* Timeline */}
                  <span
                    style={{
                      padding: "10px 12px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.71rem",
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: 99,
                        background: tlStyle.bg,
                        color: tlStyle.color,
                        whiteSpace: "nowrap",
                        fontFamily: font,
                      }}
                    >
                      {row.timeline || "—"}
                    </span>
                  </span>

                  {/* Status */}
                  <span
                    style={{
                      padding: "10px 12px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 99,
                        background: sc.bg,
                        color: sc.color,
                        whiteSpace: "nowrap",
                        fontFamily: font,
                      }}
                    >
                      {row.app_status || "—"}
                    </span>
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer / Pagination */}
        <div
          style={{
            padding: "7px 14px",
            borderTop: `1px solid ${ui.divider}`,
            background: colHdr,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "0.73rem",
              color: ui.textMuted,
              fontFamily: font,
            }}
          >
            {total} record{total !== 1 ? "s" : ""}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                background: "transparent",
                border: `1px solid ${ui.cardBorder}`,
                borderRadius: 5,
                color: page === 1 ? ui.textMuted : ui.textPrimary,
                cursor: page === 1 ? "not-allowed" : "pointer",
                padding: "2px 8px",
                fontSize: "0.78rem",
                fontFamily: font,
              }}
            >
              ‹
            </button>
            <span
              style={{
                fontSize: "0.73rem",
                color: ui.textMuted,
                fontFamily: font,
              }}
            >
              {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                background: "transparent",
                border: `1px solid ${ui.cardBorder}`,
                borderRadius: 5,
                color: page >= totalPages ? ui.textMuted : ui.textPrimary,
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                padding: "2px 8px",
                fontSize: "0.78rem",
                fontFamily: font,
              }}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
