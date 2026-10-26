import { Card, CardHeader } from "./CardPrimitives";
import { FB } from "./constants";
import Pagination from "./Pagination";

// Fixed row height keeps this card and Upload History the same height when
// they sit side by side.
export const LIST_ROW_HEIGHT = 70;

export default function RecentApplicationsCard({
  ui,
  isMobile,
  data,
  loading,
  error,
  onRetry,
  onSeeAll,
  onRowClick,
  emptyLabel = "No recent applications found.",
  // optional server-side pagination (omit to keep the old non-paged list)
  page,
  totalPages,
  total,
  onPageChange,
  pageSize = 5,
}) {
  const ell = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
  return (
    <Card
      ui={ui}
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <div style={{ borderBottom: `1px solid ${ui.divider}` }}>
        <CardHeader
          title="Recent Applications"
          sub="Access and manage your latest applications all in one place."
          right={
            <button
              onClick={onSeeAll}
              style={{
                background: "none",
                border: "none",
                color: FB,
                fontSize: "0.84rem",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                whiteSpace: "nowrap",
              }}
            >
              See all
            </button>
          }
          ui={ui}
        />
      </div>

      <div style={{ flex: 1 }}>
        {loading &&
          Array.from({ length: pageSize }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "0 16px",
                height: LIST_ROW_HEIGHT,
                boxSizing: "border-box",
                borderBottom: `1px solid ${ui.divider}`,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  flexShrink: 0,
                  background: ui.progressBg,
                  animation: "cdrrPulse 1.2s ease-in-out infinite",
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
                    width: 150,
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
                  width: 75,
                  height: 22,
                  borderRadius: 99,
                  flexShrink: 0,
                  background: ui.progressBg,
                  animation: "cdrrPulse 1.2s ease-in-out infinite",
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
              onClick={onRetry}
              style={{
                background: "none",
                border: "none",
                color: FB,
                cursor: "pointer",
                fontSize: "0.82rem",
                fontWeight: 600,
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
              padding: "2rem",
              textAlign: "center",
              color: ui.textMuted,
              fontSize: "0.82rem",
            }}
          >
            {emptyLabel}
          </div>
        )}

        {!loading &&
          !error &&
          data.map((row, i, arr) => (
            <div
              key={row.log_id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "0 16px",
                height: LIST_ROW_HEIGHT,
                boxSizing: "border-box",
                borderBottom:
                  i < arr.length - 1 ? `1px solid ${ui.divider}` : "none",
                cursor: onRowClick ? "pointer" : "default",
              }}
              onClick={() => onRowClick && onRowClick(row)}
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
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: row.status_bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                    flexShrink: 0,
                  }}
                >
                  {row.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.86rem",
                      fontWeight: 600,
                      color: ui.textPrimary,
                      ...ell,
                    }}
                  >
                    {row.dtn}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.78rem",
                      color: ui.textSub,
                      ...ell,
                    }}
                    title={`${row.brand_name || ""}${row.generic_name ? ` (${row.generic_name})` : ""}`}
                  >
                    {row.brand_name}
                    {row.generic_name ? ` (${row.generic_name})` : ""}
                  </p>
                  {row.app_step && (
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "0.72rem",
                        color: ui.textMuted,
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        ...ell,
                      }}
                    >
                      <span style={{ fontSize: "0.65rem" }}>📌</span>
                      {row.app_step}
                    </p>
                  )}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: isMobile ? 6 : 12,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: row.status_color,
                    background: row.status_bg,
                    padding: "3px 10px",
                    borderRadius: 99,
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.status_label}
                </span>
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: ui.textMuted,
                    minWidth: 40,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.date_display}
                </span>
              </div>
            </div>
          ))}
      </div>

      {onPageChange && !loading && !error && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onChange={onPageChange}
          ui={ui}
        />
      )}
    </Card>
  );
}
