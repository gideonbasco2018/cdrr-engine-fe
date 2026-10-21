// src/components/monitoring/topCompanies/TopCompaniesView.jsx
import { useState, useEffect, useCallback, useRef } from "react";

import "../analytics/analyticsAnimations";
import { FB, MONTHS } from "../analytics/analyticsConstants";
import {
  neuCardBg,
  neuShadow,
  neuInputShadow,
} from "../analytics/analyticsHelpers";
import { SectionCard } from "../analytics/SectionCard";
import { SkeletonBox } from "../analytics/SkeletonComponents";
import { getAnalyticsTopCompanies } from "../../../api/analytics";
import { YearRecordsModal } from "../analytics/AnalyticsView";

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const YEARS = ["2026", "2025"];
const TOP_OPTIONS = [10, 20, 50];
const EVAL_COLORS = [
  "#4f8ef7",
  "#36a420",
  "#f59e0b",
  "#9333ea",
  "#0891b2",
  "#e87c13",
  "#e02020",
  "#14b8a6",
];

export default function TopCompaniesView({ ui, darkMode }) {
  const [year, setYear] = useState("2026");
  const [month, setMonth] = useState("All");
  const [top, setTop] = useState(10);
  const [basis, setBasis] = useState("received");
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState({});
  const runId = useRef(0);
  const [target, setTarget] = useState(null);

  const line = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";
  const track = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const load = useCallback(async () => {
    const id = ++runId.current;
    setLoading(true);
    setError("");
    try {
      const r = await getAnalyticsTopCompanies({ year, month, top, basis });
      if (id !== runId.current) return;
      setRes(r);
      setOpen({});
    } catch (err) {
      console.error("Top companies fetch error:", err);
      if (id === runId.current) setError("Failed to load data.");
    } finally {
      if (id === runId.current) setLoading(false);
    }
  }, [year, month, top, basis]);

  useEffect(() => {
    load();
  }, [load]);

  const periodLabel =
    month === "All" ? year : `${MONTHS[Number(month) - 1] ?? month} ${year}`;

  // Open the applications behind a company (ev = null) or an evaluator row
  const openRecords = (c, ev = null) => {
    const who = !ev
      ? "All applications"
      : ev.unassigned
        ? "Unassigned"
        : ev.full_name
          ? `${ev.code} — ${ev.full_name}`
          : ev.code;
    setTarget({
      title: `${c.company} · ${who} · ${periodLabel}`,
      topco: {
        year,
        month,
        prescription: "All",
        basis,
        company: c.company,
        user_id: !ev ? undefined : ev.unassigned ? "none" : String(ev.user_id),
      },
    });
  };

  const data = res?.data ?? [];
  const maxCount = Math.max(...data.map((c) => c.count), 1);
  const allOpen = data.length > 0 && data.every((c) => open[c.rank]);
  const share = res?.total_apps > 0 ? (res.top_apps / res.total_apps) * 100 : 0;

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
  const btn = (active) => ({
    padding: "5px 12px",
    fontSize: "0.72rem",
    fontWeight: active ? 700 : 500,
    borderRadius: 10,
    border: "none",
    background: neuCardBg(darkMode),
    color: active ? FB : ui.textMuted,
    cursor: "pointer",
    fontFamily: font,
    boxShadow: neuShadow(darkMode, !active),
    transition: "all 0.2s ease",
  });
  const label = {
    margin: "0 0 4px",
    fontSize: "0.65rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
  };
  const seg = {
    display: "flex",
    background: neuCardBg(darkMode),
    borderRadius: 12,
    padding: 4,
    gap: 3,
    boxShadow: neuShadow(darkMode, false),
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: font,
        padding: 16,
      }}
    >
      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p style={label}>Year</p>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{ ...inputSt, minWidth: 90 }}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p style={label}>Month</p>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ ...inputSt, minWidth: 120 }}
          >
            <option value="All">All Months</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p style={label}>Show</p>
          <div style={seg}>
            {TOP_OPTIONS.map((n) => (
              <button key={n} onClick={() => setTop(n)} style={btn(top === n)}>
                Top {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p style={label}>Month based on</p>
          <div style={seg}>
            {[
              { key: "received", label: "Date Received" },
              { key: "released", label: "Date Released" },
            ].map(({ key, label: l }) => (
              <button
                key={key}
                onClick={() => setBasis(key)}
                style={btn(basis === key)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 10,
        }}
      >
        {[
          {
            label: "Companies",
            value: res?.total_companies ?? 0,
            sub: `with applications in ${periodLabel}`,
            color: FB,
          },
          {
            label: "Total applications",
            value: res?.total_apps ?? 0,
            sub: basis === "received" ? "received" : "released",
            color: "#0891b2",
          },
          {
            label: `Top ${top} share`,
            value: `${share.toFixed(1)}%`,
            sub: `${(res?.top_apps ?? 0).toLocaleString()} applications`,
            color: "#9333ea",
          },
        ].map((t) => (
          <div
            key={t.label}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              background: neuCardBg(darkMode),
              boxShadow: neuShadow(darkMode),
              borderTop: `2px solid ${t.color}`,
            }}
          >
            <div
              style={{
                fontSize: "0.62rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: ui.textMuted,
              }}
            >
              {t.label}
            </div>
            <div
              style={{
                fontSize: "1.3rem",
                fontWeight: 800,
                color: t.color,
                margin: "3px 0 1px",
              }}
            >
              {typeof t.value === "number" ? t.value.toLocaleString() : t.value}
            </div>
            <div style={{ fontSize: "0.62rem", color: ui.textMuted }}>
              {t.sub}
            </div>
          </div>
        ))}
      </div>

      {/* List */}
      <SectionCard
        title={`Top ${top} companies — ${periodLabel}`}
        subtitle="Applications per company, with the evaluator breakdown"
        icon="🏢"
        ui={ui}
        darkMode={darkMode}
        action={
          <button
            onClick={() =>
              setOpen(
                allOpen
                  ? {}
                  : Object.fromEntries(data.map((c) => [c.rank, true])),
              )
            }
            disabled={data.length === 0}
            style={{ ...btn(false), opacity: data.length === 0 ? 0.4 : 1 }}
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        }
      >
        {loading && !res ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonBox
                key={i}
                width="100%"
                height={44}
                radius={10}
                darkMode={darkMode}
                style={{ opacity: 1 - i * 0.08 }}
              />
            ))}
          </div>
        ) : error ? (
          <div
            style={{
              textAlign: "center",
              color: ui.textMuted,
              fontSize: "0.85rem",
              padding: 30,
            }}
          >
            {error}
          </div>
        ) : data.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: ui.textMuted,
              fontSize: "0.85rem",
              padding: 30,
            }}
          >
            No applications found for {periodLabel}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              opacity: loading ? 0.5 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {data.map((c) => {
              const isOpen = !!open[c.rank];
              return (
                <div
                  key={c.rank}
                  style={{
                    border: `1px solid ${line}`,
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <div
                    onClick={() =>
                      setOpen((o) => ({ ...o, [c.rank]: !o[c.rank] }))
                    }
                    style={{
                      display: "grid",
                      gridTemplateColumns: "36px 1fr 90px 18px",
                      gap: 10,
                      alignItems: "center",
                      padding: "10px 14px",
                      cursor: "pointer",
                      background: isOpen
                        ? darkMode
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.03)"
                        : "transparent",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 800,
                        color: c.rank <= 3 ? "#f59e0b" : ui.textMuted,
                      }}
                    >
                      {c.rank}.
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          color: ui.textPrimary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={c.company}
                      >
                        {c.company}
                      </div>
                      <div
                        style={{
                          height: 5,
                          borderRadius: 99,
                          background: track,
                          marginTop: 6,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${(c.count / maxCount) * 100}%`,
                            height: "100%",
                            background: FB,
                          }}
                        />
                      </div>
                    </div>
                    <span
                      style={{
                        textAlign: "right",
                        fontSize: "0.85rem",
                        fontWeight: 800,
                        color: FB,
                      }}
                    >
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          openRecords(c);
                        }}
                        title="Click to view all applications"
                        style={{
                          cursor: "pointer",
                          textDecoration: "underline dotted",
                          textUnderlineOffset: 3,
                        }}
                      >
                        {c.count.toLocaleString()}
                      </span>{" "}
                      <span
                        style={{
                          fontSize: "0.62rem",
                          fontWeight: 500,
                          color: ui.textMuted,
                        }}
                      >
                        apps
                      </span>
                    </span>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        color: ui.textMuted,
                        transform: isOpen ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s",
                      }}
                    >
                      ▾
                    </span>
                  </div>

                  {isOpen && (
                    <div
                      style={{
                        padding: "8px 14px 12px 50px",
                        borderTop: `1px solid ${line}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      {c.evaluators.map((ev, i) => {
                        const color = ev.unassigned
                          ? ui.textMuted
                          : EVAL_COLORS[i % EVAL_COLORS.length];
                        const pctOfCompany = (ev.count / c.count) * 100;
                        return (
                          <div
                            key={ev.user_id ?? "none"}
                            onClick={() => openRecords(c, ev)}
                            title="Click to view applications"
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "minmax(200px, 340px) 1fr 140px",
                              gap: 10,
                              alignItems: "center",
                              cursor: "pointer",
                              padding: "5px 8px",
                              borderRadius: 8,
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = darkMode
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(0,0,0,0.04)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <span
                              style={{
                                fontSize: "0.76rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={
                                ev.full_name
                                  ? `${ev.code} — ${ev.full_name}`
                                  : ev.code
                              }
                            >
                              {ev.unassigned ? (
                                <i style={{ color: ui.textMuted }}>
                                  Unassigned
                                </i>
                              ) : (
                                <>
                                  <b style={{ color: ui.textPrimary }}>
                                    {ev.code}
                                  </b>
                                  {ev.full_name && (
                                    <span style={{ color: ui.textMuted }}>
                                      {" "}
                                      — {ev.full_name}
                                    </span>
                                  )}
                                </>
                              )}
                            </span>
                            <div
                              style={{
                                height: 5,
                                borderRadius: 99,
                                background: track,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${pctOfCompany}%`,
                                  height: "100%",
                                  background: color,
                                }}
                              />
                            </div>
                            <span
                              style={{
                                textAlign: "right",
                                fontSize: "0.76rem",
                                fontWeight: 700,
                                color,
                                textDecoration: "underline dotted",
                                textUnderlineOffset: 3,
                              }}
                            >
                              {ev.count.toLocaleString()} apps{" "}
                              <span
                                style={{
                                  fontWeight: 500,
                                  color: ui.textMuted,
                                }}
                              >
                                ({pctOfCompany.toFixed(0)}%)
                              </span>
                            </span>
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

        {/* How it is counted */}
        <div
          style={{
            marginTop: 14,
            paddingTop: 10,
            borderTop: `1px solid ${line}`,
            fontSize: "0.68rem",
            lineHeight: 1.6,
            color: ui.textMuted,
          }}
        >
          <b style={{ color: ui.textPrimary }}>How it is counted:</b> company =
          LTO company name (same names are combined). Month is based on{" "}
          {basis === "received" ? "Date Received (Center)" : "Date Released"}.
          The evaluator is the user on the Quality Evaluation step with no
          reroute or reassign mark; if there are several, the latest one.
          Applications with no such evaluator are shown as "Unassigned".
          {res?.matched_steps?.length > 0 && (
            <>
              {" "}
              Step matched: <b>{res.matched_steps.join(", ")}</b>.
            </>
          )}
          {res && res.matched_steps?.length === 0 && (
            <span style={{ color: "#e02020" }}>
              {" "}
              No step label matched "quality evaluation" — evaluators will all
              show as Unassigned.
            </span>
          )}
        </div>
      </SectionCard>

      {target && (
        <YearRecordsModal
          target={target}
          basis={basis}
          ui={ui}
          darkMode={darkMode}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
}
