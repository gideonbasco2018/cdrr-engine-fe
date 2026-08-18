import { useState, useCallback, useEffect } from "react";
import { Calendar, ChevronRight, ClipboardList, FileText } from "lucide-react";

import {
  getUploadLogsByDate,
  getUploadLogs,
} from "../../api/application-documents";

const DATE_PAGE_SIZE_OPTIONS = [10, 20, 30, 60];
const DEFAULT_DATE_PAGE_SIZE = 30;

function formatDateLabel(isoDate) {
  // isoDate is "YYYY-MM-DD"
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function BatchSummaryTab({ colors, s }) {
  const [days, setDays] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_DATE_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Which date rows are expanded, and their loaded batch data
  const [expandedDate, setExpandedDate] = useState(null);
  const [dateBatches, setDateBatches] = useState({}); // { [date]: { loading, error, batchGroups } }
  const [expandedBatchKey, setExpandedBatchKey] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchDays = useCallback(
    async (pageNum) => {
      setIsLoading(true);
      setLoadError("");
      try {
        const result = await getUploadLogsByDate({
          limit: pageSize,
          offset: (pageNum - 1) * pageSize,
        });
        setDays(result.data || []);
        setTotal(result.total || 0);
        setPage(pageNum);
      } catch (err) {
        setLoadError(err.message || "Failed to load upload history.");
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize],
  );

  useEffect(() => {
    fetchDays(1);
    setExpandedDate(null);
    setExpandedBatchKey(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  const handlePrevPage = () => {
    if (page > 1 && !isLoading) fetchDays(page - 1);
  };
  const handleNextPage = () => {
    if (page < totalPages && !isLoading) fetchDays(page + 1);
  };

  const toggleDate = async (dateStr) => {
    if (expandedDate === dateStr) {
      setExpandedDate(null);
      return;
    }
    setExpandedDate(dateStr);
    setExpandedBatchKey(null);

    // Fetch (and cache) that day's logs, grouped into batches, only once
    if (!dateBatches[dateStr]) {
      setDateBatches((prev) => ({
        ...prev,
        [dateStr]: { loading: true, error: "", batchGroups: [] },
      }));
      try {
        const result = await getUploadLogs({
          dateFrom: `${dateStr}T00:00:00.000`,
          dateTo: `${dateStr}T23:59:59.999`,
          limit: 1000, // a single day's worth of uploads is expected to fit comfortably
          offset: 0,
        });
        const logs = result.data || [];

        const map = new Map();
        for (const log of logs) {
          const key = log.batch_id || `single-${log.id}`;
          if (!map.has(key)) {
            map.set(key, {
              key,
              entries: [],
              dtns: new Set(),
              uploaders: new Set(),
              succeeded: 0,
              failed: 0,
              latest: log.created_at || null,
              label: log.original_filename,
            });
          }
          const g = map.get(key);
          g.entries.push(log);
          if (log.db_dtn) g.dtns.add(log.db_dtn);
          if (log.uploaded_by_user_name)
            g.uploaders.add(log.uploaded_by_user_name);
          if (log.status === "success") g.succeeded += 1;
          else g.failed += 1;
          if (log.created_at && (!g.latest || log.created_at > g.latest)) {
            g.latest = log.created_at;
            g.label = log.original_filename;
          }
        }
        const batchGroups = Array.from(map.values())
          .map((g) => ({
            ...g,
            dtns: Array.from(g.dtns),
            uploaders: Array.from(g.uploaders),
            total: g.entries.length,
          }))
          .sort((a, b) => new Date(b.latest || 0) - new Date(a.latest || 0));

        setDateBatches((prev) => ({
          ...prev,
          [dateStr]: { loading: false, error: "", batchGroups },
        }));
      } catch (err) {
        setDateBatches((prev) => ({
          ...prev,
          [dateStr]: {
            loading: false,
            error: err.message || "Failed to load batches.",
            batchGroups: [],
          },
        }));
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: colors.badgeBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.accent || "#60a5fa",
            flexShrink: 0,
          }}
        >
          <Calendar size={16} />
        </span>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            Batch Summary
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: colors.textTertiary }}>
            Uploads grouped by day — tap a date to see its batches
          </p>
        </div>
      </div>

      {loadError && <div style={s.errorBanner}>{loadError}</div>}

      <div style={s.fileListCard}>
        <div style={s.fileListHeader}>
          <span>
            {total} day{total === 1 ? "" : "s"} with uploads · showing page{" "}
            {page} of {totalPages}
          </span>
        </div>

        {days.length === 0 && !isLoading ? (
          <p style={s.noResultsText}>No uploads found.</p>
        ) : (
          <div style={s.folderTree}>
            {days.map((day) => {
              const isExpanded = expandedDate === day.date;
              const dayData = dateBatches[day.date];
              return (
                <div key={day.date} style={s.folderGroup}>
                  <button
                    type="button"
                    onClick={() => toggleDate(day.date)}
                    style={s.batchHeader}
                  >
                    <ChevronRight
                      size={13}
                      style={{
                        transform: isExpanded
                          ? "rotate(90deg)"
                          : "rotate(0deg)",
                        transition: "transform 120ms ease",
                        flexShrink: 0,
                      }}
                    />
                    <Calendar size={14} style={{ flexShrink: 0 }} />
                    <div style={s.batchHeaderInfo}>
                      <span style={s.batchHeaderTitle}>
                        {formatDateLabel(day.date)}
                      </span>
                      <span style={s.batchHeaderSub}>
                        {day.total_batches} batch
                        {day.total_batches === 1 ? "" : "es"}
                      </span>
                    </div>
                    <span style={s.folderCount}>{day.total_files}</span>
                    <span style={s.badgeSuccess}>{day.total_success} ok</span>
                    {day.total_failed > 0 && (
                      <span style={s.badgeFail}>{day.total_failed} failed</span>
                    )}
                  </button>

                  {isExpanded && (
                    <div style={{ paddingLeft: 20 }}>
                      {dayData?.loading && (
                        <p
                          style={{
                            fontSize: 12,
                            color: colors.textTertiary,
                            padding: "8px 4px",
                          }}
                        >
                          Loading batches...
                        </p>
                      )}
                      {dayData?.error && (
                        <p
                          style={{
                            fontSize: 12,
                            color: "#f87171",
                            padding: "8px 4px",
                          }}
                        >
                          {dayData.error}
                        </p>
                      )}
                      {dayData?.batchGroups?.map((batch) => {
                        const batchExpanded = expandedBatchKey === batch.key;
                        return (
                          <div key={batch.key} style={{ marginBottom: 4 }}>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedBatchKey(
                                  batchExpanded ? null : batch.key,
                                )
                              }
                              style={{ ...s.batchHeader, padding: "8px 10px" }}
                            >
                              <ChevronRight
                                size={12}
                                style={{
                                  transform: batchExpanded
                                    ? "rotate(90deg)"
                                    : "rotate(0deg)",
                                  transition: "transform 120ms ease",
                                  flexShrink: 0,
                                }}
                              />
                              <ClipboardList
                                size={13}
                                style={{ flexShrink: 0 }}
                              />
                              <div style={s.batchHeaderInfo}>
                                <span
                                  style={{
                                    ...s.batchHeaderTitle,
                                    fontSize: 12.5,
                                  }}
                                >
                                  {batch.dtns.length > 0
                                    ? batch.dtns.join(", ")
                                    : batch.label}
                                </span>
                                <span style={s.batchHeaderSub}>
                                  {batch.uploaders.length > 0 &&
                                    `By: ${batch.uploaders.join(", ")}`}
                                  {batch.latest &&
                                    ` · ${new Date(batch.latest).toLocaleTimeString()}`}
                                </span>
                              </div>
                              <span style={s.folderCount}>{batch.total}</span>
                              <span style={s.badgeSuccess}>
                                {batch.succeeded} ok
                              </span>
                              {batch.failed > 0 && (
                                <span style={s.badgeFail}>
                                  {batch.failed} failed
                                </span>
                              )}
                            </button>

                            {batchExpanded && (
                              <div
                                style={{
                                  paddingLeft: 24,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 3,
                                  padding: "6px 6px 6px 24px",
                                }}
                              >
                                {batch.entries.map((log) => (
                                  <div
                                    key={log.id}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                      fontSize: 12,
                                      color: colors.textPrimary,
                                    }}
                                  >
                                    <FileText
                                      size={12}
                                      style={{
                                        flexShrink: 0,
                                        color: colors.textTertiary,
                                      }}
                                    />
                                    <span
                                      style={{
                                        flex: 1,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                      title={log.original_filename}
                                    >
                                      {log.original_filename}
                                    </span>
                                    <span
                                      style={
                                        log.status === "success"
                                          ? s.badgeSuccess
                                          : s.badgeFail
                                      }
                                    >
                                      {log.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {total > 0 && (
          <div style={s.paginationRow}>
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={isLoading || page <= 1}
              style={{
                ...s.pageBtn,
                ...(isLoading || page <= 1 ? s.btnDisabled : {}),
              }}
            >
              Previous
            </button>
            <span style={s.pageIndicator}>
              Page {page} of {totalPages}
            </span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ ...s.input, width: "auto", padding: "0.25rem 0.5rem" }}
            >
              {DATE_PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={isLoading || page >= totalPages}
              style={{
                ...s.pageBtn,
                ...(isLoading || page >= totalPages ? s.btnDisabled : {}),
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default BatchSummaryTab;
