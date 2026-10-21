import { useState, useEffect, useCallback } from "react";
import { getDashboardUploadHistory } from "../../api/dashboard";
import { Card, CardHeader } from "./CardPrimitives";
import { FB } from "./constants";
import Pagination from "./Pagination";
import { getImpersonatedUserId, isImpersonating } from "../../api/auth";

const ROW_HEIGHT = 70; // keep in sync with LIST_ROW_HEIGHT in RecentApplicationsCard
const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function StatusBadge({ count }) {
  return (
    <span
      style={{
        fontSize: "0.72rem",
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 99,
        background: `${FB}18`,
        color: FB,
        whiteSpace: "nowrap",
      }}
    >
      {count.toLocaleString()} records
    </span>
  );
}

function DateInput({ label, value, onChange, ui }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <label
        style={{
          fontSize: "0.68rem",
          fontWeight: 600,
          color: ui.textMuted,
          fontFamily: font,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "5px 9px",
          borderRadius: 6,
          border: `1px solid ${ui.cardBorder}`,
          background: ui.inputBg ?? ui.progressBg ?? "#f9fafb",
          color: ui.textPrimary,
          fontSize: "0.8rem",
          fontFamily: font,
          outline: "none",
          cursor: "pointer",
        }}
      />
    </div>
  );
}

export default function UploadHistoryCard({ ui, pageSize = 6 }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filteredRecordSum, setFilteredRecordSum] = useState(0);

  // Draft inputs (not applied yet)
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // Applied filter values — these trigger the fetch
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  const isFiltered = !!(appliedFrom || appliedTo);
  const totalPages = Math.ceil(total / pageSize);

  const fetchPage = useCallback(
    async (pageNum, from, to) => {
      setLoading(true);
      setError(null);
      try {
        const params = { limit: pageSize, offset: (pageNum - 1) * pageSize };
        if (from) params.date_from = from;
        if (to) params.date_to = to;
        if (isImpersonating()) {
          params.impersonated_user_id = getImpersonatedUserId();
        }
        const res = await getDashboardUploadHistory(params);
        setRows(res.data);
        setTotal(res.total ?? res.count ?? res.data.length);
        if (res.total_records != null) {
          setFilteredRecordSum(res.total_records);
        } else {
          setFilteredRecordSum(
            res.data.reduce((sum, row) => sum + (row.record_count || 0), 0),
          );
        }
      } catch (e) {
        setError(e?.response?.data?.detail || e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [pageSize],
  );

  useEffect(() => {
    fetchPage(page, appliedFrom, appliedTo);
  }, [fetchPage, page, appliedFrom, appliedTo]);

  const handleFilter = () => {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    setPage(1);
  };
  const handleClear = () => {
    setDateFrom("");
    setDateTo("");
    setAppliedFrom("");
    setAppliedTo("");
    setPage(1);
  };
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  const rowBase = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "0 16px",
    height: ROW_HEIGHT,
    boxSizing: "border-box",
  };

  return (
    <Card
      ui={ui}
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <div style={{ borderBottom: `1px solid ${ui.divider}` }}>
        <CardHeader
          title="Upload History"
          sub="Batches you've uploaded via Excel import."
          ui={ui}
        />
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 10,
          padding: "12px 16px",
          borderBottom: `1px solid ${ui.divider}`,
        }}
      >
        <DateInput
          label="From"
          value={dateFrom}
          onChange={setDateFrom}
          ui={ui}
        />
        <DateInput label="To" value={dateTo} onChange={setDateTo} ui={ui} />
        <button
          onClick={handleFilter}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            border: "none",
            background: FB,
            color: "#fff",
            fontSize: "0.78rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: font,
          }}
        >
          Filter
        </button>
        {isFiltered && (
          <button
            onClick={handleClear}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: `1px solid ${ui.cardBorder}`,
              background: "transparent",
              color: ui.textMuted,
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            Clear
          </button>
        )}
        <div style={{ marginLeft: "auto" }}>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 99,
              background: `${FB}18`,
              color: FB,
              whiteSpace: "nowrap",
              fontFamily: font,
            }}
          >
            {loading
              ? "Loading…"
              : `${total.toLocaleString()} ${total === 1 ? "batch" : "batches"} · ${filteredRecordSum.toLocaleString()} total records`}
          </span>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {loading &&
          Array.from({ length: pageSize }).map((_, i) => (
            <div
              key={i}
              style={{ ...rowBase, borderBottom: `1px solid ${ui.divider}` }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: ui.progressBg,
                  animation: "cdrrPulse 1.2s ease-in-out infinite",
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 160,
                    height: 10,
                    borderRadius: 4,
                    background: ui.progressBg,
                    animation: "cdrrPulse 1.2s ease-in-out infinite",
                  }}
                />
                <div
                  style={{
                    width: 100,
                    height: 8,
                    borderRadius: 4,
                    background: ui.progressBg,
                    animation: "cdrrPulse 1.2s ease-in-out infinite",
                  }}
                />
              </div>
              <div
                style={{
                  width: 80,
                  height: 20,
                  borderRadius: 99,
                  background: ui.progressBg,
                  animation: "cdrrPulse 1.2s ease-in-out infinite",
                  flexShrink: 0,
                }}
              />
            </div>
          ))}

        {!loading && error && (
          <div
            style={{
              padding: "1.5rem",
              textAlign: "center",
              color: "#e02020",
              fontSize: "0.82rem",
            }}
          >
            ⚠️ {error}{" "}
            <button
              onClick={() => fetchPage(page, appliedFrom, appliedTo)}
              style={{
                background: "none",
                border: "none",
                color: FB,
                cursor: "pointer",
                fontSize: "0.82rem",
                fontWeight: 600,
                fontFamily: font,
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: ui.textMuted,
              fontSize: "0.82rem",
            }}
          >
            {isFiltered
              ? "No uploads found for the selected date range."
              : "No upload history found."}
          </div>
        )}

        {!loading &&
          !error &&
          rows.map((row, i, arr) => {
            const dt = row.upload_date ? new Date(row.upload_date) : null;
            const dateStr = dt
              ? dt.toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "—";
            const timeStr = dt
              ? dt.toLocaleTimeString("en-PH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";
            return (
              <div
                key={i}
                style={{
                  ...rowBase,
                  justifyContent: "space-between",
                  borderBottom:
                    i < arr.length - 1 ? `1px solid ${ui.divider}` : "none",
                  cursor: "default",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = ui.hoverBg)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: `${FB}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1rem",
                      flexShrink: 0,
                    }}
                  >
                    📤
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.86rem",
                        fontWeight: 600,
                        color: ui.textPrimary,
                      }}
                    >
                      {dateStr}
                      {timeStr && (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: "0.72rem",
                            color: ui.textMuted,
                            fontWeight: 400,
                          }}
                        >
                          {timeStr}
                        </span>
                      )}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.75rem",
                        color: ui.textSub,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      by {row.uploader}
                    </p>
                  </div>
                </div>
                <StatusBadge count={row.record_count} />
              </div>
            );
          })}
      </div>

      {!loading && !error && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onChange={handlePageChange}
          ui={ui}
        />
      )}
    </Card>
  );
}
