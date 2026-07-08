// src/components/monitoring/analytics/AnalyticsView.jsx
import { useState, useEffect, useCallback, useRef } from "react";

import {
  getAnalyticsAvailableYears,
  getAnalyticsSummary,
  getAnalyticsTrend,
  getAnalyticsByClassification,
  getAnalyticsYearSummary,
  getAnalyticsTopDrugs,
  getAnalyticsTopCountries,
  getDocTypeReleased,
} from "../../../api/analytics";

// ── Split modules ─────────────────────────────────────────────
import "./analyticsAnimations";
import { FB, MONTHS, ENTITY_TYPES, COUNTRY_FLAGS } from "./analyticsConstants";
import { neuCardBg, neuShadow, neuInputShadow } from "./analyticsHelpers";
import { AnalyticsSkeleton } from "./SkeletonComponents";
import { FadeSlideIn, KpiCard } from "./KpiCard";
import { SectionCard } from "./SectionCard";
import { MiniBar, TrendChart, DonutChart } from "./ChartComponents";
import { CountryList } from "./CountryComponents";

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const DRUGS_PAGE_SIZE = 10;

const DOC_TYPE_COLOR = {
  CPR: "#36a420",
  LOD: "#e02020",
  GLE: "#0891b2",
  Cert: "#9333ea",
  COPP: "#f59e0b",
  CFS: "#e87c13",
};
const TYPE_COLORS = {
  RX: "#4f8ef7",
  OTC: "#f59e0b",
  HR: "#0891b2",
  Vaccine: "#36a420",
};

const docTypeColor = (dt) => DOC_TYPE_COLOR[dt] ?? FB;
const classTypeColor = (short) => TYPE_COLORS[short] ?? FB;

// ── Pure SVG pie chart (no deps) ─────────────────────────────
function PieChart({ slices, darkMode, ui }) {
  const [hovered, setHovered] = useState(null);
  const cx = 110,
    cy = 110,
    r = 80,
    gap = 1.5;

  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0)
    return (
      <div
        style={{
          textAlign: "center",
          color: ui.textMuted,
          fontSize: "0.8rem",
          padding: "24px 0",
        }}
      >
        No data
      </div>
    );

  // build arcs
  let cursor = -Math.PI / 2;
  const arcs = slices.map((sl) => {
    const angle = (sl.value / total) * 2 * Math.PI;
    const start = cursor + gap / r;
    const end = cursor + angle - gap / r;
    cursor += angle;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = angle > Math.PI ? 1 : 0;
    const midAngle = (start + end) / 2;
    return {
      ...sl,
      path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`,
      midAngle,
      pct: ((sl.value / total) * 100).toFixed(1),
    };
  });

  const hoveredSlice = hovered !== null ? arcs[hovered] : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      {/* SVG */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width={220} height={220} style={{ overflow: "visible" }}>
          {arcs.map((arc, i) => {
            const isHov = hovered === i;
            const ox = isHov ? Math.cos(arc.midAngle) * 8 : 0;
            const oy = isHov ? Math.sin(arc.midAngle) * 8 : 0;
            return (
              <path
                key={i}
                d={arc.path}
                fill={arc.color}
                opacity={hovered === null || isHov ? 1 : 0.45}
                transform={`translate(${ox},${oy})`}
                style={{ cursor: "pointer", transition: "all 0.18s ease" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
          {/* center label */}
          {hoveredSlice ? (
            <>
              <text
                x={cx}
                y={cy - 8}
                textAnchor="middle"
                fontSize={13}
                fontWeight={800}
                fill={hoveredSlice.color}
                fontFamily={font}
              >
                {hoveredSlice.pct}%
              </text>
              <text
                x={cx}
                y={cy + 10}
                textAnchor="middle"
                fontSize={9}
                fill={ui.textMuted}
                fontFamily={font}
              >
                {hoveredSlice.value.toLocaleString()}
              </text>
            </>
          ) : (
            <>
              <text
                x={cx}
                y={cy - 6}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill={ui.textPrimary}
                fontFamily={font}
              >
                Total
              </text>
              <text
                x={cx}
                y={cy + 11}
                textAnchor="middle"
                fontSize={13}
                fontWeight={800}
                fill={ui.textPrimary}
                fontFamily={font}
              >
                {total.toLocaleString()}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 7,
          flex: 1,
          minWidth: 120,
        }}
      >
        {arcs.map((arc, i) => (
          <div
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              opacity: hovered === null || hovered === i ? 1 : 0.4,
              transition: "opacity 0.15s",
              padding: "4px 8px",
              borderRadius: 8,
              background:
                hovered === i
                  ? darkMode
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.04)"
                  : "transparent",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: arc.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "0.72rem",
                color: ui.textPrimary,
                fontWeight: hovered === i ? 700 : 500,
                flex: 1,
              }}
            >
              {arc.name}
            </span>
            <span
              style={{ fontSize: "0.72rem", fontWeight: 700, color: arc.color }}
            >
              {arc.pct}%
            </span>
            <span style={{ fontSize: "0.68rem", color: ui.textMuted }}>
              {arc.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsView({
  ui,
  darkMode,
  chartYear,
  setChartYear,
  chartMonth,
  setChartMonth,
  rxFilter,
  setRxFilter,
  onSliceClick,
}) {
  const [availableYears, setAvailableYears] = useState(["All"]);
  const [summary, setSummary] = useState({
    total: 0,
    cpr: 0,
    lod: 0,
    on_process: 0,
    completed: 0,
    approval_rate: 0,
  });
  const [trendData, setTrendData] = useState([]);
  const [classificationData, setClassificationData] = useState([]);
  const [classDocTypes, setClassDocTypes] = useState([]);
  const [yearSummaryData, setYearSummaryData] = useState([]);
  const [topDrugsData, setTopDrugsData] = useState([]);
  const [topCountriesData, setTopCountriesData] = useState([]);
  const [docTypeData, setDocTypeData] = useState({ doc_types: [], data: [] });
  const [loading, setLoading] = useState(true);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [topCountryTab, setTopCountryTab] = useState("mfr");
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── Pie toggle: "classification" | "doctype" ─────────────────
  const [pieView, setPieView] = useState("classification");

  // ── Pagination ────────────────────────────────────────────────
  const [drugsPage, setDrugsPage] = useState(1);
  useEffect(() => {
    setDrugsPage(1);
  }, [chartYear, chartMonth, rxFilter]);

  // ── Fetch main ────────────────────────────────────────────────
  const fetchMain = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        year: chartYear,
        month: chartMonth,
        prescription: rxFilter,
      };
      const countryParams = {
        ...params,
        entity_type: topCountryTab,
        limit: 999,
      };
      const [
        years,
        sum,
        trend,
        classification,
        yearSum,
        drugs,
        countries,
        docType,
      ] = await Promise.all([
        getAnalyticsAvailableYears(),
        getAnalyticsSummary(params),
        getAnalyticsTrend(params),
        getAnalyticsByClassification(params),
        getAnalyticsYearSummary(),
        getAnalyticsTopDrugs(params),
        getAnalyticsTopCountries(countryParams),
        getDocTypeReleased(),
      ]);
      setAvailableYears(years.years ?? ["All"]);
      setSummary(sum);
      setTrendData(trend.data ?? []);
      setClassificationData(classification.data ?? []);
      setClassDocTypes(classification.doc_types ?? []);
      setYearSummaryData(yearSum.data ?? []);
      setTopDrugsData(drugs.data ?? []);
      setTopCountriesData(countries.data ?? []);
      setDocTypeData(docType ?? { doc_types: [], data: [] });
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [chartYear, chartMonth, rxFilter]);

  const fetchCountries = useCallback(async () => {
    setLoadingCountries(true);
    try {
      const countries = await getAnalyticsTopCountries({
        year: chartYear,
        month: chartMonth,
        prescription: rxFilter,
        entity_type: topCountryTab,
        limit: 999,
      });
      setTopCountriesData(countries.data ?? []);
    } catch (err) {
      console.error("Top countries fetch error:", err);
    } finally {
      setLoadingCountries(false);
    }
  }, [chartYear, chartMonth, rxFilter, topCountryTab]);

  useEffect(() => {
    fetchMain();
  }, [chartYear, chartMonth, rxFilter]);

  const isFirstCountryRender = useRef(true);
  useEffect(() => {
    if (isFirstCountryRender.current) {
      isFirstCountryRender.current = false;
      return;
    }
    fetchCountries();
  }, [topCountryTab]);

  // ── Derived ───────────────────────────────────────────────────
  const pieData = [
    { name: "CPR Released", value: summary.cpr },
    { name: "LOD Released", value: summary.lod },
    { name: "On Process", value: summary.on_process },
  ];
  const maxDrug = Math.max(...topDrugsData.map((d) => d.total), 1);
  const maxCountry = Math.max(...topCountriesData.map((d) => d.count), 1);

  const drugsTotalPages = Math.ceil(topDrugsData.length / DRUGS_PAGE_SIZE);
  const pagedDrugs = topDrugsData.slice(
    (drugsPage - 1) * DRUGS_PAGE_SIZE,
    drugsPage * DRUGS_PAGE_SIZE,
  );

  // ── Pie slices ────────────────────────────────────────────────
  const classPieSlices = classificationData.map((row) => {
    const short =
      row.type === "Prescription Drug (RX)"
        ? "RX"
        : row.type === "Over-the-Counter (OTC)"
          ? "OTC"
          : row.type === "Household Remedy (HR)"
            ? "HR"
            : row.type;
    return { name: row.type, value: row.count, color: classTypeColor(short) };
  });

  const docTypePieSlices = classDocTypes
    .map((dt) => ({
      name: dt,
      value: classificationData.reduce(
        (s, row) => s + (row.by_doc_type?.[dt] ?? 0),
        0,
      ),
      color: docTypeColor(dt),
    }))
    .filter((s) => s.value > 0);

  const activePieSlices =
    pieView === "classification" ? classPieSlices : docTypePieSlices;

  // ── Styles ────────────────────────────────────────────────────
  const inputSt = {
    background: neuCardBg(darkMode),
    border: "none",
    borderRadius: 10,
    padding: "7px 12px",
    fontSize: "0.8rem",
    color: ui.textPrimary,
    outline: "none",
    boxShadow: neuInputShadow(darkMode),
    colorScheme: darkMode ? "dark" : "light",
    fontFamily: font,
  };

  const neuBtnStyle = (isActive) => ({
    padding: "5px 12px",
    fontSize: "0.72rem",
    fontWeight: isActive ? 700 : 500,
    borderRadius: 10,
    border: "none",
    background: neuCardBg(darkMode),
    color: isActive ? FB : ui.textMuted,
    cursor: "pointer",
    fontFamily: font,
    boxShadow: isActive
      ? neuShadow(darkMode, false)
      : neuShadow(darkMode, true),
    transition: "all 0.2s ease",
  });

  const thStyle = (left = false) => ({
    padding: "8px 10px",
    textAlign: left ? "left" : "center",
    fontSize: "0.63rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
    borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
    whiteSpace: "nowrap",
    background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
  });

  const tdStyle = (color = ui.textPrimary, left = false) => ({
    padding: "9px 10px",
    textAlign: left ? "left" : "center",
    fontSize: "0.78rem",
    fontWeight: 600,
    color,
    whiteSpace: "nowrap",
  });

  // ── Pagination component ──────────────────────────────────────
  const Pagination = ({ page, totalPages, onPageChange, total, pageSize }) => {
    if (totalPages <= 1) return null;
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 10,
          paddingTop: 10,
          borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        }}
      >
        <span style={{ fontSize: "0.68rem", color: ui.textMuted }}>
          {start}–{end} of {total}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            style={{
              ...neuBtnStyle(false),
              padding: "4px 10px",
              opacity: page === 1 ? 0.35 : 1,
              cursor: page === 1 ? "not-allowed" : "pointer",
            }}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
            )
            .reduce((acc, p, i, arr) => {
              if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "…" ? (
                <span
                  key={`e-${i}`}
                  style={{
                    padding: "4px 6px",
                    fontSize: "0.68rem",
                    color: ui.textMuted,
                  }}
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  style={{
                    ...neuBtnStyle(page === p),
                    padding: "4px 10px",
                    minWidth: 28,
                  }}
                >
                  {p}
                </button>
              ),
            )}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            style={{
              ...neuBtnStyle(false),
              padding: "4px 10px",
              opacity: page === totalPages ? 0.35 : 1,
              cursor: page === totalPages ? "not-allowed" : "pointer",
            }}
          >
            ›
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <AnalyticsSkeleton ui={ui} darkMode={darkMode} />;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: font,
        background: "transparent",
        padding: 16,
        borderRadius: 20,
      }}
    >
      {/* ── Header ── */}
      <FadeSlideIn delay={0}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              📊 Analytics Overview
            </h2>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: "0.75rem",
                color: ui.textMuted,
              }}
            >
              Real-time data from main database
              {lastUpdated && (
                <span>
                  {" "}
                  · Updated{" "}
                  {lastUpdated.toLocaleTimeString("en-PH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: ui.textMuted,
                }}
              >
                Classification
              </p>
              <div
                style={{
                  display: "flex",
                  background: neuCardBg(darkMode),
                  borderRadius: 12,
                  padding: 4,
                  gap: 3,
                  boxShadow: neuShadow(darkMode, false),
                }}
              >
                {[
                  { key: "All", label: "All" },
                  { key: "Over-the-Counter (OTC)", label: "OTC" },
                  { key: "Vaccine", label: "Vaccine" },
                  { key: "Prescription Drug (RX)", label: "RX" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setRxFilter(key)}
                    style={neuBtnStyle(rxFilter === key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: ui.textMuted,
                }}
              >
                Year
              </p>
              <select
                value={chartYear}
                onChange={(e) => {
                  setChartYear(e.target.value);
                  setChartMonth("All");
                }}
                style={{ ...inputSt, minWidth: 85 }}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: ui.textMuted,
                }}
              >
                Month
              </p>
              <select
                value={chartMonth}
                onChange={(e) => setChartMonth(e.target.value)}
                disabled={chartYear === "All"}
                style={{
                  ...inputSt,
                  minWidth: 110,
                  opacity: chartYear === "All" ? 0.4 : 1,
                }}
              >
                <option value="All">All Months</option>
                {MONTHS.map((m, i) => (
                  <option key={i} value={i}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchMain}
              title="Refresh"
              style={{
                ...inputSt,
                padding: "7px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                boxShadow: neuShadow(darkMode),
              }}
            >
              <span style={{ fontSize: "0.85rem" }}>↻</span>
              <span style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                Refresh
              </span>
            </button>
          </div>
        </div>
      </FadeSlideIn>

      {/* ── KPI Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 10,
        }}
      >
        {[
          {
            icon: "📥",
            label: "Total",
            value: summary.total,
            color: FB,
            sub: "All applications",
          },
          {
            icon: "✅",
            label: "CPR Released",
            value: summary.cpr,
            color: "#36a420",
            sub: "Documents issued",
          },
          {
            icon: "❌",
            label: "LOD Released",
            value: summary.lod,
            color: "#e02020",
            sub: "Disapproved",
          },
          {
            icon: "⏳",
            label: "On Process",
            value: summary.on_process,
            color: "#f59e0b",
            sub: "Pending completion",
          },
          {
            icon: "🏁",
            label: "Completed",
            value: summary.completed,
            color: "#0891b2",
            sub: "With other application categories",
          },
          {
            icon: "📈",
            label: "Approval %",
            value: `${summary.approval_rate}%`,
            color: "#9333ea",
            sub: "CPR over total",
          },
        ].map((kpi, i) => (
          <KpiCard
            key={kpi.label}
            {...kpi}
            darkMode={darkMode}
            ui={ui}
            animDelay={i * 60}
          />
        ))}
      </div>

      {/* ── Trend + Donut ── */}
      <FadeSlideIn delay={420}>
        <div
          style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}
        >
          <SectionCard
            title="Trend Overview"
            subtitle={`Grouped by ${chartYear === "All" ? "year" : "month"}`}
            icon="📈"
            ui={ui}
            darkMode={darkMode}
          >
            <TrendChart data={trendData} ui={ui} darkMode={darkMode} />
          </SectionCard>
          <SectionCard
            title="Approval Breakdown"
            subtitle="CPR vs LOD vs On Process"
            icon="🍩"
            ui={ui}
            darkMode={darkMode}
          >
            <DonutChart data={pieData} ui={ui} darkMode={darkMode} />
          </SectionCard>
        </div>
      </FadeSlideIn>

      {/* ── Year Summary ── */}
      <FadeSlideIn delay={500}>
        <SectionCard
          title="Year-by-Year Summary"
          icon="📅"
          ui={ui}
          darkMode={darkMode}
        >
          {yearSummaryData.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.82rem",
                padding: "24px 0",
              }}
            >
              No year data available
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.8rem",
                }}
              >
                <thead>
                  <tr>
                    {["Year", "Total"].map((h) => (
                      <th key={h} style={thStyle(h === "Year")}>
                        {h}
                      </th>
                    ))}
                    {docTypeData.doc_types.map((dt) => (
                      <th key={dt} style={thStyle()}>
                        {dt}
                      </th>
                    ))}
                    <th style={thStyle()}>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {yearSummaryData.map((row, i) => {
                    const docRow = docTypeData.data.find(
                      (d) => String(d.year) === String(row.year),
                    );
                    return (
                      <tr
                        key={row.year}
                        style={{
                          borderBottom:
                            i < yearSummaryData.length - 1
                              ? `1px solid ${darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`
                              : "none",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = darkMode
                            ? "rgba(255,255,255,0.03)"
                            : "rgba(0,0,0,0.02)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td style={tdStyle(FB, true)}>{row.year}</td>
                        <td style={tdStyle(ui.textPrimary)}>{row.total}</td>
                        {docTypeData.doc_types.map((dt) => (
                          <td key={dt} style={tdStyle(docTypeColor(dt))}>
                            {docRow?.by_doc_type?.[dt] ?? 0}
                          </td>
                        ))}
                        <td
                          style={tdStyle(
                            parseFloat(row.rate) >= 60 ? "#36a420" : "#f59e0b",
                          )}
                        >
                          {row.rate}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </FadeSlideIn>

      {/* ── By Classification + Top Drug Applications (50/50) ── */}
      <FadeSlideIn delay={560}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          {/* ── By Classification ── */}
          <SectionCard
            title="By Classification"
            subtitle="Applications per prescription type"
            icon="💊"
            ui={ui}
            darkMode={darkMode}
          >
            {classificationData.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: ui.textMuted,
                  fontSize: "0.82rem",
                  padding: "24px 0",
                }}
              >
                No classification data
              </div>
            ) : (
              <>
                {/* Table */}
                <div style={{ overflowX: "auto", marginBottom: 20 }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.8rem",
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={thStyle(true)}>Type</th>
                        <th style={thStyle()}>Total</th>
                        {classDocTypes.map((dt) => (
                          <th
                            key={dt}
                            style={{ ...thStyle(), color: docTypeColor(dt) }}
                          >
                            {dt}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {classificationData.map((row, i) => {
                        const short =
                          row.type === "Prescription Drug (RX)"
                            ? "RX"
                            : row.type === "Over-the-Counter (OTC)"
                              ? "OTC"
                              : row.type === "Household Remedy (HR)"
                                ? "HR"
                                : row.type;
                        const typeColor = classTypeColor(short);
                        return (
                          <tr
                            key={row.type}
                            style={{
                              borderBottom:
                                i < classificationData.length - 1
                                  ? `1px solid ${darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`
                                  : "none",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = darkMode
                                ? "rgba(255,255,255,0.03)"
                                : "rgba(0,0,0,0.02)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <td style={{ ...tdStyle(typeColor, true) }}>
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: 99,
                                  background: `${typeColor}18`,
                                  color: typeColor,
                                  marginRight: 6,
                                }}
                              >
                                {short}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  color: ui.textMuted,
                                  fontWeight: 400,
                                }}
                              >
                                {row.type}
                              </span>
                            </td>
                            <td style={tdStyle(ui.textPrimary)}>{row.count}</td>
                            {classDocTypes.map((dt) => (
                              <td key={dt} style={tdStyle(docTypeColor(dt))}>
                                {row.by_doc_type?.[dt] ?? 0}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Divider */}
                <div
                  style={{
                    height: 1,
                    background: darkMode
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.06)",
                    marginBottom: 14,
                  }}
                />

                {/* Pie toggle */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: ui.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    🥧 Distribution
                  </span>
                  <div
                    style={{
                      display: "flex",
                      background: neuCardBg(darkMode),
                      borderRadius: 10,
                      padding: 3,
                      gap: 2,
                      boxShadow: neuShadow(darkMode, false),
                    }}
                  >
                    {[
                      { key: "classification", label: "By Type" },
                      { key: "doctype", label: "By Doc" },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setPieView(key)}
                        style={{
                          padding: "4px 10px",
                          fontSize: "0.68rem",
                          fontWeight: pieView === key ? 700 : 500,
                          borderRadius: 8,
                          border: "none",
                          background: neuCardBg(darkMode),
                          color: pieView === key ? FB : ui.textMuted,
                          cursor: "pointer",
                          fontFamily: font,
                          boxShadow:
                            pieView === key
                              ? neuShadow(darkMode, false)
                              : "none",
                          transition: "all 0.18s",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pie chart */}
                <PieChart
                  slices={activePieSlices}
                  darkMode={darkMode}
                  ui={ui}
                />
              </>
            )}
          </SectionCard>

          {/* ── Top Drug Applications ── */}
          <SectionCard
            title="Top Drug Applications"
            subtitle="Ranked by application volume"
            icon="💊"
            ui={ui}
            darkMode={darkMode}
            action={
              <span style={{ fontSize: "0.7rem", color: ui.textMuted }}>
                Top {topDrugsData.length}
              </span>
            }
          >
            {topDrugsData.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: ui.textMuted,
                  fontSize: "0.82rem",
                  padding: "24px 0",
                }}
              >
                No drug data available
              </div>
            ) : (
              <>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 64px 64px 64px",
                      gap: 8,
                      padding: "0 4px",
                    }}
                  >
                    {[
                      "Drug / Generic",
                      "Classification",
                      "Total",
                      "CPR",
                      "Rate",
                    ].map((h) => (
                      <span
                        key={h}
                        style={{
                          fontSize: "0.63rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: ui.textMuted,
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                  {pagedDrugs.map((drug, i) => {
                    const rxShort =
                      drug.rx === "Prescription Drug (RX)"
                        ? "RX"
                        : drug.rx === "Over-the-Counter (OTC)"
                          ? "OTC"
                          : "VAX";
                    const rxColor =
                      drug.rx === "Prescription Drug (RX)"
                        ? FB
                        : drug.rx === "Over-the-Counter (OTC)"
                          ? "#f59e0b"
                          : "#36a420";
                    const isLast = i === pagedDrugs.length - 1;
                    return (
                      <div
                        key={drug.name}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1fr 64px 64px 64px",
                          gap: 8,
                          padding: "10px 4px",
                          borderRadius: 10,
                          alignItems: "center",
                          borderBottom: !isLast
                            ? `1px solid ${darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`
                            : "none",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = darkMode
                            ? "rgba(255,255,255,0.03)"
                            : "rgba(0,0,0,0.02)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 3,
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.62rem",
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: 4,
                                background: `${rxColor}18`,
                                color: rxColor,
                                flexShrink: 0,
                              }}
                            >
                              {rxShort}
                            </span>
                            <span
                              style={{
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                color: ui.textPrimary,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {drug.name}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <MiniBar
                              value={drug.total}
                              max={maxDrug}
                              color={FB}
                              darkMode={darkMode}
                            />
                            <span
                              style={{
                                fontSize: "0.65rem",
                                color: ui.textMuted,
                                flexShrink: 0,
                              }}
                            >
                              {drug.generic}
                            </span>
                          </div>
                        </div>
                        <span
                          style={{ fontSize: "0.72rem", color: ui.textMuted }}
                        >
                          {drug.rx || "—"}
                        </span>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            color: FB,
                            textAlign: "center",
                          }}
                        >
                          {drug.total}
                        </span>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            color: "#36a420",
                            textAlign: "center",
                          }}
                        >
                          {drug.cpr}
                        </span>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            textAlign: "center",
                            color:
                              parseFloat(drug.rate) >= 60
                                ? "#36a420"
                                : "#f59e0b",
                          }}
                        >
                          {drug.rate}%
                        </span>
                      </div>
                    );
                  })}
                </div>
                <Pagination
                  page={drugsPage}
                  totalPages={drugsTotalPages}
                  onPageChange={setDrugsPage}
                  total={topDrugsData.length}
                  pageSize={DRUGS_PAGE_SIZE}
                />
              </>
            )}
          </SectionCard>
        </div>
      </FadeSlideIn>

      {/* ── Top Countries ── */}
      <FadeSlideIn delay={680}>
        <SectionCard
          title="Top Countries by Entity Type"
          subtitle="Country of origin per application role"
          icon="🌍"
          ui={ui}
          darkMode={darkMode}
        >
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            {ENTITY_TYPES.map((et) => {
              const isAct = topCountryTab === et.key;
              return (
                <button
                  key={et.key}
                  onClick={() => setTopCountryTab(et.key)}
                  style={{
                    padding: "5px 12px",
                    fontSize: "0.76rem",
                    fontWeight: isAct ? 700 : 500,
                    borderRadius: 10,
                    border: "none",
                    background: neuCardBg(darkMode),
                    color: isAct ? et.color : ui.textMuted,
                    cursor: "pointer",
                    fontFamily: font,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    boxShadow: isAct
                      ? neuShadow(darkMode, false)
                      : neuShadow(darkMode, true),
                    transition: "all 0.2s",
                  }}
                >
                  <span>{et.icon}</span>
                  <span>{et.label}</span>
                </button>
              );
            })}
          </div>

          {loadingCountries ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 80,
                color: ui.textMuted,
                fontSize: "0.82rem",
                gap: 8,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  border: "2px solid currentColor",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              Loading...
            </div>
          ) : topCountriesData.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: ui.textMuted,
                fontSize: "0.82rem",
                padding: "24px 0",
              }}
            >
              No country data available
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <CountryList
                countries={topCountriesData}
                activeEntity={ENTITY_TYPES.find(
                  (et) => et.key === topCountryTab,
                )}
                topCountryTab={topCountryTab}
                rxFilter={rxFilter}
                maxCountry={maxCountry}
                ui={ui}
                darkMode={darkMode}
                pageSize={10}
              />
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div
                  style={{
                    background: neuCardBg(darkMode),
                    borderRadius: 12,
                    padding: 14,
                    boxShadow: neuShadow(darkMode, false),
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 12px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: ui.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    🏆 Top 3 Podium
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-end",
                      justifyContent: "center",
                    }}
                  >
                    {[1, 0, 2].map((rank) => {
                      const d = topCountriesData[rank];
                      if (!d) return null;
                      const flag = COUNTRY_FLAGS[d.country] || "🌐";
                      const medals = ["🥇", "🥈", "🥉"];
                      const heights = [80, 60, 48];
                      const activeEntity = ENTITY_TYPES.find(
                        (et) => et.key === topCountryTab,
                      );
                      const c =
                        rank === 0
                          ? activeEntity?.color
                          : rank === 1
                            ? "#9ca3af"
                            : "#b45309";
                      return (
                        <div
                          key={rank}
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              color: c,
                            }}
                          >
                            {medals[rank]} #{rank + 1}
                          </span>
                          <div
                            style={{
                              width: "100%",
                              background: neuCardBg(darkMode),
                              borderRadius: "10px 10px 0 0",
                              height: heights[rank],
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 2,
                              boxShadow: neuShadow(darkMode),
                            }}
                          >
                            <span
                              style={{
                                fontSize: rank === 0 ? "1.3rem" : "1rem",
                              }}
                            >
                              {flag}
                            </span>
                            <span
                              style={{
                                fontSize: rank === 0 ? "0.65rem" : "0.58rem",
                                fontWeight: 700,
                                color: c,
                                textAlign: "center",
                                maxWidth: 70,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {d.country}
                            </span>
                          </div>
                          <div
                            style={{
                              width: "100%",
                              background: neuCardBg(darkMode),
                              borderRadius: "0 0 8px 8px",
                              padding: "4px 0",
                              textAlign: "center",
                              boxShadow: neuShadow(darkMode, false),
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: rank === 0 ? "0.95rem" : "0.82rem",
                                fontWeight: 800,
                                color: c,
                              }}
                            >
                              {d.count}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  {[
                    {
                      label: "Countries",
                      value: topCountriesData.length,
                      icon: "🌍",
                      color:
                        ENTITY_TYPES.find((et) => et.key === topCountryTab)
                          ?.color || FB,
                    },
                    {
                      label: "Total Apps",
                      value: topCountriesData.reduce((s, d) => s + d.count, 0),
                      icon: "📋",
                      color: FB,
                    },
                    {
                      label: "#1 Country",
                      value: topCountriesData[0]?.country || "—",
                      icon: "🥇",
                      color: "#f59e0b",
                      small: true,
                    },
                    {
                      label: "#1 CPR",
                      value: topCountriesData[0]?.cpr ?? 0,
                      icon: "✅",
                      color: "#36a420",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: neuCardBg(darkMode),
                        boxShadow: neuShadow(darkMode),
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          marginBottom: 3,
                        }}
                      >
                        <span style={{ fontSize: "0.8rem" }}>{s.icon}</span>
                        <span
                          style={{
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: ui.textMuted,
                          }}
                        >
                          {s.label}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: s.small ? "0.75rem" : "1.05rem",
                          fontWeight: 800,
                          color: s.color,
                          lineHeight: 1.2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      </FadeSlideIn>
    </div>
  );
}
