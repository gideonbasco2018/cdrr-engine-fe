import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getCountryYearTrend } from "../../../api/analytics";
import { neuCardBg, neuShadow } from "./analyticsHelpers";
import { MiniBar } from "./ChartComponents";
import { COUNTRY_FLAGS } from "./analyticsConstants";

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const TOOLTIP_W = 280;

// ── Portal Tooltip — positions itself over the hovered row ───
function CountryYearTooltip({
  country,
  entityType,
  rxFilter,
  darkMode,
  ui,
  anchorRect,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const tooltipRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    getCountryYearTrend(country, entityType, rxFilter || "All")
      .then((res) => setData(res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [country, entityType, rxFilter]);

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const TOOLTIP_ESTIMATE_H = 56 + (data.length || 3) * 24;
  const vh = window.innerHeight;

  const left = anchorRect.left;
  let top = anchorRect.bottom + 6;
  if (top + TOOLTIP_ESTIMATE_H > vh - 8) {
    top = anchorRect.top - TOOLTIP_ESTIMATE_H - 6;
  }

  const greyBg = darkMode ? "#252628" : "#f0f0f2";
  const greyBorder = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)";
  const greyTitle = darkMode ? "#b0b3b8" : "#555";
  const barColor = darkMode ? "#666" : "#aaa";

  return createPortal(
    <div
      ref={tooltipRef}
      style={{
        position: "fixed",
        top,
        left,
        width: TOOLTIP_W,
        background: greyBg,
        border: `1px solid ${greyBorder}`,
        borderRadius: 12,
        padding: "12px 14px",
        zIndex: 999999,
        pointerEvents: "none",
        boxShadow: darkMode
          ? "0 8px 32px rgba(0,0,0,0.7)"
          : "0 8px 32px rgba(0,0,0,0.12)",
        fontFamily: font,
        animation: "analytics-fade-in 0.15s ease both",
      }}
    >
      <p
        style={{
          margin: "0 0 8px",
          fontSize: "0.72rem",
          fontWeight: 700,
          color: greyTitle,
        }}
      >
        📅 {country} — Released by Year
      </p>
      {loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: greyTitle,
            fontSize: "0.7rem",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              border: "2px solid currentColor",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
          Loading...
        </div>
      ) : data.length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.7rem", color: greyTitle }}>
          No data available
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {data.map((d) => (
            <div
              key={d.year}
              style={{ display: "flex", alignItems: "center", gap: 7 }}
            >
              <span
                style={{
                  fontSize: "0.68rem",
                  color: greyTitle,
                  minWidth: 34,
                  fontWeight: 600,
                }}
              >
                {d.year}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 5,
                  background: darkMode
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(0,0,0,0.08)",
                  borderRadius: 99,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(d.count / maxCount) * 100}%`,
                    height: "100%",
                    background: barColor,
                    borderRadius: 99,
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: greyTitle,
                  minWidth: 28,
                  textAlign: "right",
                }}
              >
                {d.count}
              </span>
              <span
                style={{
                  fontSize: "0.65rem",
                  color: "#36a420",
                  minWidth: 26,
                  textAlign: "right",
                }}
              >
                ✅{d.cpr}
              </span>
              <span
                style={{
                  fontSize: "0.65rem",
                  color: "#e02020",
                  minWidth: 26,
                  textAlign: "right",
                }}
              >
                ❌{d.lod ?? 0}
              </span>
              <span
                style={{
                  fontSize: "0.65rem",
                  color: "#f59e0b",
                  minWidth: 26,
                  textAlign: "right",
                }}
              >
                ⏳{d.on_process ?? 0}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

// ── CountryRow ────────────────────────────────────────────────
export function CountryRow({
  d,
  i,
  flag,
  activeEntity,
  topCountryTab,
  rxFilter,
  maxCountry,
  ui,
  darkMode,
}) {
  const [hovered, setHovered] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const rowRef = useRef(null);

  const handleMouseEnter = () => {
    if (rowRef.current) setAnchorRect(rowRef.current.getBoundingClientRect());
    setHovered(true);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setAnchorRect(null);
  };

  return (
    <>
      <div
        ref={rowRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          background: neuCardBg(darkMode),
          boxShadow: hovered ? neuShadow(darkMode, false) : neuShadow(darkMode),
          cursor: "default",
          transition: "box-shadow 0.15s",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 5,
          }}
        >
          <span
            style={{
              fontSize: "0.62rem",
              fontWeight: 800,
              color: i < 3 ? activeEntity?.color : ui.textMuted,
              minWidth: 20,
            }}
          >
            #{i + 1}
          </span>
          <span style={{ fontSize: "1rem" }}>{flag}</span>
          <span
            style={{
              flex: 1,
              fontSize: "0.78rem",
              fontWeight: 600,
              color: ui.textPrimary,
            }}
          >
            {d.country}
          </span>
          <span
            style={{
              fontSize: "0.82rem",
              fontWeight: 800,
              color: activeEntity?.color,
            }}
          >
            {d.count}
          </span>
        </div>
        <MiniBar
          value={d.count}
          max={maxCountry}
          color={activeEntity?.color || "#1877F2"}
          darkMode={darkMode}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: "0.62rem", color: "#36a420" }}>
            ✅ {d.cpr}
          </span>
          <span style={{ fontSize: "0.62rem", color: "#e02020" }}>
            ❌ {d.lod}
          </span>
          <span style={{ fontSize: "0.62rem", color: "#f59e0b" }}>
            ⏳ {d.on_process}
          </span>
        </div>
      </div>

      {hovered && anchorRect && (
        <CountryYearTooltip
          country={d.country}
          entityType={topCountryTab}
          rxFilter={rxFilter}
          darkMode={darkMode}
          ui={ui}
          anchorRect={anchorRect}
        />
      )}
    </>
  );
}

// ── Pagination button style helper ────────────────────────────
function pageBtnStyle(darkMode, disabled, isActive) {
  return {
    minWidth: 28,
    height: 28,
    padding: "0 6px",
    borderRadius: 8,
    border: "none",
    fontSize: "0.75rem",
    fontWeight: isActive ? 800 : 500,
    fontFamily: font,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.35 : 1,
    background: isActive
      ? "#1877F2"
      : darkMode
        ? "rgba(255,255,255,0.07)"
        : "rgba(0,0,0,0.06)",
    color: isActive ? "#fff" : darkMode ? "#ccc" : "#444",
    transition: "all 0.15s",
  };
}

// ── CountryList — paginated list of CountryRow ────────────────
export function CountryList({
  countries,
  activeEntity,
  topCountryTab,
  rxFilter,
  maxCountry,
  ui,
  darkMode,
  pageSize = 10,
}) {
  const [page, setPage] = useState(1);

  // Reset to page 1 when tab / data changes
  useEffect(() => {
    setPage(1);
  }, [topCountryTab, countries]);

  const totalPages = Math.ceil(countries.length / pageSize);
  const slice = countries.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {slice.map((d, i) => {
        const globalIndex = (page - 1) * pageSize + i;
        const flag = COUNTRY_FLAGS[d.country] || "🌐";
        return (
          <CountryRow
            key={d.country}
            d={d}
            i={globalIndex}
            flag={flag}
            activeEntity={activeEntity}
            topCountryTab={topCountryTab}
            rxFilter={rxFilter}
            maxCountry={maxCountry}
            ui={ui}
            darkMode={darkMode}
          />
        );
      })}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            marginTop: 6,
            flexWrap: "wrap",
          }}
        >
          {/* Prev */}
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={pageBtnStyle(darkMode, page === 1, false)}
          >
            ‹
          </button>

          {/* Page numbers — show at most 7 buttons with ellipsis */}
          {(() => {
            const pages = [];
            const delta = 2;
            const left = Math.max(2, page - delta);
            const right = Math.min(totalPages - 1, page + delta);

            pages.push(1);
            if (left > 2) pages.push("...");
            for (let p = left; p <= right; p++) pages.push(p);
            if (right < totalPages - 1) pages.push("...");
            if (totalPages > 1) pages.push(totalPages);

            return pages.map((p, idx) =>
              p === "..." ? (
                <span
                  key={`ellipsis-${idx}`}
                  style={{
                    fontSize: "0.72rem",
                    color: darkMode ? "#666" : "#aaa",
                    padding: "0 2px",
                  }}
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={pageBtnStyle(darkMode, false, p === page)}
                >
                  {p}
                </button>
              ),
            );
          })()}

          {/* Next */}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={pageBtnStyle(darkMode, page === totalPages, false)}
          >
            ›
          </button>

          {/* Page info */}
          <span
            style={{
              fontSize: "0.67rem",
              color: darkMode ? "#666" : "#aaa",
              marginLeft: 4,
            }}
          >
            {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, countries.length)} of {countries.length}
          </span>
        </div>
      )}
    </div>
  );
}
