// src/components/monitoring/cprTrend/CprTrendView.jsx
// Trend of Received and Released CPR of Drug Products

import { useState, useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { getCprTrend } from "../../../api/monitoring";

Chart.register(...registerables);

const COUNTRY_TYPE_OPTIONS = [
  { value: "", label: "All (No country filter)" },
  { value: "manufacturer", label: "Manufacturer Country" },
  { value: "trader", label: "Trader Country" },
  { value: "repacker", label: "Repacker Country" },
  { value: "importer", label: "Importer Country" },
  { value: "distributor", label: "Distributor Country" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  { value: "", label: "All Years" },
  ...Array.from({ length: 10 }, (_, i) => ({
    value: String(CURRENT_YEAR - i),
    label: String(CURRENT_YEAR - i),
  })),
];

function SkeletonBox({ height = 74, borderRadius = 10, ui }) {
  return (
    <div
      style={{
        height,
        borderRadius,
        background: ui.inputBg,
        opacity: 0.6,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.12) 50%,transparent 100%)",
          animation: "cprshimmer 1.4s infinite",
        }}
      />
      <style>{`@keyframes cprshimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
    </div>
  );
}

export default function CprTrendView({ ui, darkMode }) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState([]);
  const [countries, setCountries] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [year, setYear] = useState("");
  const [countryType, setCountryType] = useState("");
  const [country, setCountry] = useState("");
  const [docType, setDocType] = useState("");

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // ── Fetch data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getCprTrend({
      year: year || null,
      country_type: countryType || null,
      country: country || null,
      doc_type: docType || null,
    })
      .then((res) => {
        if (cancelled) return;
        setTrendData(res.data || []);
        setCountries(res.countries || []);
        setDocTypes(res.doc_types || []);
      })
      .catch(() => {
        if (cancelled) return;
        setTrendData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [year, countryType, country, docType]);

  // Reset country selection when countryType changes
  useEffect(() => {
    setCountry("");
  }, [countryType]);

  // ── Chart rendering ────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !chartRef.current) return;

    chartInstance.current?.destroy();

    const labels = trendData.map((d) => d.period);
    const receivedData = trendData.map((d) => d.received_count);
    const releasedData = trendData.map((d) => d.released_count);

    const gridCol = darkMode
      ? "rgba(255,255,255,0.07)"
      : "rgba(0,0,0,0.06)";
    const tickCol = darkMode ? "#b0b3b8" : "#65676b";

    chartInstance.current = new Chart(chartRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Received",
            data: receivedData,
            borderColor: "#2563eb",
            backgroundColor: "rgba(37,99,235,0.08)",
            borderWidth: 2.5,
            pointBackgroundColor: "#2563eb",
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: true,
          },
          {
            label: "Released",
            data: releasedData,
            borderColor: "#10b981",
            backgroundColor: "rgba(16,185,129,0.08)",
            borderWidth: 2.5,
            pointBackgroundColor: "#10b981",
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              color: tickCol,
              font: { size: 12, family: font },
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        scales: {
          x: {
            ticks: { color: tickCol, font: { size: 11 }, maxRotation: 45 },
            grid: { color: gridCol },
            border: { display: false },
          },
          y: {
            ticks: { color: tickCol, font: { size: 11 } },
            grid: { color: gridCol },
            border: { display: false },
            beginAtZero: true,
          },
        },
      },
    });

    return () => {
      chartInstance.current?.destroy();
    };
  }, [trendData, darkMode, loading]);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalReceived = trendData.reduce((s, d) => s + d.received_count, 0);
  const totalReleased = trendData.reduce((s, d) => s + d.released_count, 0);

  // ── Shared filter style ────────────────────────────────────────────────────
  const selectStyle = {
    padding: "6px 12px",
    borderRadius: 7,
    border: `1px solid ${ui.cardBorder}`,
    background: ui.inputBg,
    color: ui.textPrimary,
    fontSize: "0.82rem",
    cursor: "pointer",
    outline: "none",
  };
  const labelStyle = {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: ui.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: font, padding: 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.15rem",
              fontWeight: 700,
              color: ui.textPrimary,
            }}
          >
            Trend of Received and Released CPR of Drug Products
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "0.78rem",
              color: ui.textMuted,
            }}
          >
            Monthly comparison of applications received vs released
          </p>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
          alignItems: "flex-end",
        }}
      >
        {/* Year */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={labelStyle}>Year</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={selectStyle}
          >
            {YEAR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Document Type Released */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={labelStyle}>Document Type Released</label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            style={{ ...selectStyle, minWidth: 180 }}
          >
            <option value="">All Document Types</option>
            {docTypes.map((dt) => (
              <option key={dt} value={dt}>
                {dt}
              </option>
            ))}
          </select>
        </div>

        {/* Country Type */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={labelStyle}>Country Based On</label>
          <select
            value={countryType}
            onChange={(e) => setCountryType(e.target.value)}
            style={selectStyle}
          >
            {COUNTRY_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Country (shown only when countryType is selected) */}
        {countryType && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              style={{ ...selectStyle, minWidth: 160 }}
            >
              <option value="">All Countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            background: ui.inputBg,
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <p style={{ margin: "0 0 4px", fontSize: "0.7rem", color: ui.textMuted }}>
            Total Received
          </p>
          <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#2563eb" }}>
            {loading ? "..." : totalReceived.toLocaleString()}
          </p>
        </div>
        <div
          style={{
            background: ui.inputBg,
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <p style={{ margin: "0 0 4px", fontSize: "0.7rem", color: ui.textMuted }}>
            Total Released
          </p>
          <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#10b981" }}>
            {loading ? "..." : totalReleased.toLocaleString()}
          </p>
        </div>
        <div
          style={{
            background: ui.inputBg,
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <p style={{ margin: "0 0 4px", fontSize: "0.7rem", color: ui.textMuted }}>
            Periods
          </p>
          <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: ui.textPrimary }}>
            {loading ? "..." : trendData.length}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 12,
          padding: "16px 18px",
        }}
      >
        {loading ? (
          <SkeletonBox height={380} borderRadius={10} ui={ui} />
        ) : trendData.length === 0 ? (
          <div
            style={{
              height: 380,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: ui.textMuted,
              fontSize: "0.85rem",
            }}
          >
            No data available for the selected filters.
          </div>
        ) : (
          <div style={{ height: 380 }}>
            <canvas ref={chartRef} />
          </div>
        )}
      </div>
    </div>
  );
}
