// src/components/monitoring/fastestProcessing/FastestProcessingView.jsx
import { useState, useEffect, useRef } from "react";

import "../analytics/analyticsAnimations";
import { FB, MONTHS } from "../analytics/analyticsConstants";
import {
  neuCardBg,
  neuShadow,
  neuInputShadow,
} from "../analytics/analyticsHelpers";
import { SectionCard } from "../analytics/SectionCard";
import { SkeletonBox } from "../analytics/SkeletonComponents";
import {
  getAnalyticsFastestApplications,
  getAnalyticsFastestCompanies,
} from "../../../api/analytics";
import { YearRecordsModal } from "../analytics/AnalyticsView";

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const YEARS = ["2026", "2025"];
const TOP_OPTIONS = [10, 20, 50];
const MIN_OPTIONS = [1, 3, 5, 10];
const CPR_COLOR = "#36a420";
const CERT_COLOR = "#9333ea";

const evLabel = (ev) =>
  !ev || ev.unassigned
    ? "Unassigned"
    : ev.full_name
      ? `${ev.code} — ${ev.full_name}`
      : ev.code;

export default function FastestProcessingView({ ui, darkMode }) {
  const [year, setYear] = useState("2026");
  const [month, setMonth] = useState("All");
  const [top, setTop] = useState(10);
  const [doc, setDoc] = useState("cpr");
  const [minApps, setMinApps] = useState(3);

  const [apps, setApps] = useState(null);
  const [loadingA, setLoadingA] = useState(true);
  const [errA, setErrA] = useState("");

  const [cos, setCos] = useState(null);
  const [loadingC, setLoadingC] = useState(true);
  const [errC, setErrC] = useState("");
  const [open, setOpen] = useState({});

  const [target, setTarget] = useState(null);
  const idA = useRef(0);
  const idC = useRef(0);

  const line = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";

  useEffect(() => {
    const id = ++idA.current;
    setLoadingA(true);
    setErrA("");
    getAnalyticsFastestApplications({ year, month, top, doc })
      .then((r) => id === idA.current && setApps(r))
      .catch((err) => {
        console.error("Fastest applications error:", err);
        if (id === idA.current) setErrA("Failed to load data.");
      })
      .finally(() => id === idA.current && setLoadingA(false));
  }, [year, month, top, doc]);

  useEffect(() => {
    const id = ++idC.current;
    setLoadingC(true);
    setErrC("");
    getAnalyticsFastestCompanies({ year, month, top, min_apps: minApps })
      .then((r) => {
        if (id !== idC.current) return;
        setCos(r);
        setOpen({});
      })
      .catch((err) => {
        console.error("Fastest companies error:", err);
        if (id === idC.current) setErrC("Failed to load data.");
      })
      .finally(() => id === idC.current && setLoadingC(false));
  }, [year, month, top, minApps]);

  const periodLabel =
    month === "All" ? year : `${MONTHS[Number(month) - 1] ?? month} ${year}`;
  const docLabel = { cpr: "CPR", cert: "Cert", both: "CPR + Cert" }[doc];

  // Open the applications behind a number. company=undefined -> all companies,
  // ev=null -> all evaluators. kind: "cpr" | "cert" | "both"
  const openRecords = ({ company, ev = null, kind = "both" }) => {
    const docName = { cpr: "CPR", cert: "Cert", both: "CPR + Cert" }[kind];
    setTarget({
      title: [company, docName, ev ? evLabel(ev) : null, periodLabel]
        .filter(Boolean)
        .join(" · "),
      fastest: {
        year,
        month,
        doc: kind,
        company,
        user_id: !ev ? undefined : ev.unassigned ? "none" : String(ev.user_id),
      },
    });
  };

  const linkSt = {
    cursor: "pointer",
    textDecoration: "underline dotted",
    textUnderlineOffset: 3,
  };
  const numLink = (n, onClick, color) =>
    n > 0 ? (
      <span
        onClick={onClick}
        title="Click to view applications"
        style={{ ...linkSt, color, fontWeight: 700 }}
      >
        {n}
      </span>
    ) : (
      <span style={{ color, fontWeight: 700 }}>{n}</span>
    );
  const linkChip = (color, text, onClick, enabled = true) => (
    <span
      onClick={
        enabled
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
      title={enabled ? "Click to view applications" : undefined}
      style={{ ...chip(color), ...(enabled ? linkSt : {}) }}
    >
      {text}
    </span>
  );
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
  const th = {
    padding: "8px 10px",
    textAlign: "center",
    fontSize: "0.63rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
    border: `1px solid ${line}`,
    whiteSpace: "nowrap",
    background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
  };
  const td = {
    padding: "9px 10px",
    textAlign: "center",
    fontSize: "0.78rem",
    fontWeight: 500,
    color: ui.textPrimary,
    border: `1px solid ${line}`,
    whiteSpace: "nowrap",
  };
  const chip = (color) => ({
    fontSize: "0.65rem",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 99,
    color,
    background: `${color}22`,
    whiteSpace: "nowrap",
  });
  const rankColor = (r) => (r <= 3 ? "#f59e0b" : ui.textMuted);
  const rows = (n) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: n }).map((_, i) => (
        <SkeletonBox
          key={i}
          width="100%"
          height={38}
          radius={10}
          darkMode={darkMode}
          style={{ opacity: 1 - i * 0.08 }}
        />
      ))}
    </div>
  );
  const empty = (t) => (
    <div
      style={{
        textAlign: "center",
        color: ui.textMuted,
        fontSize: "0.85rem",
        padding: 30,
      }}
    >
      {t}
    </div>
  );
  const tile = (t) => (
    <div
      key={t.label}
      onClick={t.onClick}
      title={t.onClick ? "Click to view applications" : undefined}
      style={{
        cursor: t.onClick ? "pointer" : "default",
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
        {t.value}
      </div>
      <div style={{ fontSize: "0.62rem", color: ui.textMuted }}>{t.sub}</div>
    </div>
  );

  const cData = cos?.data ?? [];
  const allOpen = cData.length > 0 && cData.every((c) => open[c.rank]);
  const fmt = (v, suffix = "") =>
    v === null || v === undefined ? "—" : `${v}${suffix}`;

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
          <p style={label}>Month (released)</p>
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
          <p style={label}>Companies: min. apps</p>
          <div style={seg}>
            {MIN_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setMinApps(n)}
                style={btn(minApps === n)}
              >
                {n}+
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
            label: `${docLabel} released`,
            value: (apps?.total ?? 0).toLocaleString(),
            sub: `in ${periodLabel}`,
            color: FB,
            onClick:
              (apps?.total ?? 0) > 0
                ? () => openRecords({ kind: doc })
                : undefined,
          },
          {
            label: "Average processing",
            value: fmt(apps?.avg_days, " days"),
            sub: `${docLabel}, working days`,
            color: "#0891b2",
          },
          {
            label: "Fastest",
            value: fmt(apps?.fastest_days, " days"),
            sub: `${docLabel}, working days`,
            color: CPR_COLOR,
          },
          {
            label: "Companies ranked",
            value: (cos?.total_companies ?? 0).toLocaleString(),
            sub: `${cos?.min_apps ?? minApps}+ CPR/Cert apps`,
            color: CERT_COLOR,
          },
        ].map(tile)}
      </div>

      {/* Fastest applications */}
      <SectionCard
        title={`Fastest ${docLabel} applications — ${periodLabel}`}
        subtitle="Shortest processing time, Date Received to Date Released (working days)"
        icon="⚡"
        ui={ui}
        darkMode={darkMode}
        action={
          <div style={seg}>
            {[
              { key: "cpr", label: "CPR" },
              { key: "cert", label: "Cert" },
              { key: "both", label: "Both" },
            ].map(({ key, label: l }) => (
              <button
                key={key}
                onClick={() => setDoc(key)}
                style={btn(doc === key)}
              >
                {l}
              </button>
            ))}
          </div>
        }
      >
        {loadingA && !apps ? (
          rows(8)
        ) : errA ? (
          empty(errA)
        ) : (apps?.data ?? []).length === 0 ? (
          empty(`No ${docLabel} released in ${periodLabel}`)
        ) : (
          <div
            style={{
              overflowX: "auto",
              opacity: loadingA ? 0.5 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.8rem",
              }}
            >
              <thead>
                <tr>
                  {[
                    "#",
                    "DTN",
                    "Company",
                    "Brand / Generic",
                    "Doc",
                    "Date Received",
                    "Date Released",
                    "Working Days",
                    "Evaluator",
                  ].map((h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apps.data.map((r) => (
                  <tr key={r.db_id}>
                    <td
                      style={{
                        ...td,
                        fontWeight: 800,
                        color: rankColor(r.rank),
                      }}
                    >
                      {r.rank}
                    </td>
                    <td style={{ ...td, color: FB, fontWeight: 700 }}>
                      {r.dtn ?? "—"}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: "left",
                        maxWidth: 260,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={r.company}
                    >
                      {r.company || "—"}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: "left",
                        maxWidth: 260,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={`${r.brand ?? ""} / ${r.generic ?? ""}`}
                    >
                      <b>{r.brand ?? "—"}</b>
                      <span style={{ color: ui.textMuted }}>
                        {r.generic ? ` / ${r.generic}` : ""}
                      </span>
                    </td>
                    <td style={td}>
                      <span
                        style={chip(
                          /cert/i.test(r.doc ?? "") ? CERT_COLOR : CPR_COLOR,
                        )}
                      >
                        {r.doc ?? "—"}
                      </span>
                    </td>
                    <td style={td}>{r.received ?? "—"}</td>
                    <td style={td}>{r.released ?? "—"}</td>
                    <td
                      style={{
                        ...td,
                        fontWeight: 800,
                        color: CPR_COLOR,
                        fontSize: "0.85rem",
                      }}
                    >
                      {r.days}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: "left",
                        color: r.evaluator.unassigned
                          ? ui.textMuted
                          : ui.textPrimary,
                        fontStyle: r.evaluator.unassigned ? "italic" : "normal",
                      }}
                    >
                      {evLabel(r.evaluator)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
          <b style={{ color: ui.textPrimary }}>How it is counted:</b> processing
          time = working days (Mon–Fri, holidays not excluded) from Date
          Received (Center) to Date Released. The month is the release month.
          Ties are ordered by the earlier release date. The evaluator is the
          user on the Quality Evaluation step (rerouted counted, reassigned
          skipped).
        </div>
      </SectionCard>

      {/* Fastest companies */}
      <SectionCard
        title={`Fastest companies (CPR + Cert) — ${periodLabel}`}
        subtitle={`Lowest average processing time, companies with ${minApps}+ applications`}
        icon="🏢"
        ui={ui}
        darkMode={darkMode}
        action={
          <button
            onClick={() =>
              setOpen(
                allOpen
                  ? {}
                  : Object.fromEntries(cData.map((c) => [c.rank, true])),
              )
            }
            disabled={cData.length === 0}
            style={{ ...btn(false), opacity: cData.length === 0 ? 0.4 : 1 }}
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        }
      >
        {loadingC && !cos ? (
          rows(8)
        ) : errC ? (
          empty(errC)
        ) : cData.length === 0 ? (
          empty(
            `No company has ${minApps}+ CPR/Cert applications in ${periodLabel}`,
          )
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              opacity: loadingC ? 0.5 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {cData.map((c) => {
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
                      gridTemplateColumns: "36px 1fr 130px 230px 18px",
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
                        color: rankColor(c.rank),
                      }}
                    >
                      {c.rank}.
                    </span>
                    <span
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
                    </span>
                    <span style={{ textAlign: "right" }}>
                      <b
                        style={{
                          fontSize: "0.95rem",
                          color: CPR_COLOR,
                        }}
                      >
                        {c.avg_days}
                      </b>{" "}
                      <span
                        style={{ fontSize: "0.62rem", color: ui.textMuted }}
                      >
                        avg days
                      </span>
                    </span>
                    <span
                      style={{
                        display: "flex",
                        gap: 6,
                        justifyContent: "flex-end",
                        flexWrap: "wrap",
                      }}
                    >
                      {linkChip(FB, `${c.count} apps`, () =>
                        openRecords({ company: c.company, kind: "both" }),
                      )}
                      {linkChip(
                        CPR_COLOR,
                        `CPR ${c.cpr}`,
                        () => openRecords({ company: c.company, kind: "cpr" }),
                        c.cpr > 0,
                      )}
                      {linkChip(
                        CERT_COLOR,
                        `Cert ${c.cert}`,
                        () => openRecords({ company: c.company, kind: "cert" }),
                        c.cert > 0,
                      )}
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
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "minmax(200px, 1fr) 70px 70px 70px 90px",
                          gap: 10,
                          padding: "4px 8px 6px",
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: ui.textMuted,
                          textAlign: "right",
                        }}
                      >
                        <span style={{ textAlign: "left" }}>Evaluator</span>
                        <span>CPR</span>
                        <span>Cert</span>
                        <span>Apps</span>
                        <span>Avg days</span>
                      </div>
                      {c.evaluators.map((ev) => (
                        <div
                          key={ev.user_id ?? "none"}
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "minmax(200px, 1fr) 70px 70px 70px 90px",
                            gap: 10,
                            padding: "5px 8px",
                            fontSize: "0.76rem",
                            alignItems: "center",
                            textAlign: "right",
                          }}
                        >
                          <span
                            onClick={() =>
                              openRecords({
                                company: c.company,
                                ev,
                                kind: "both",
                              })
                            }
                            title="Click to view applications"
                            style={{
                              ...linkSt,
                              textAlign: "left",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontStyle: ev.unassigned ? "italic" : "normal",
                              color: ev.unassigned
                                ? ui.textMuted
                                : ui.textPrimary,
                              fontWeight: 600,
                            }}
                          >
                            {evLabel(ev)}
                          </span>
                          {numLink(
                            ev.cpr,
                            () =>
                              openRecords({
                                company: c.company,
                                ev,
                                kind: "cpr",
                              }),
                            CPR_COLOR,
                          )}
                          {numLink(
                            ev.cert,
                            () =>
                              openRecords({
                                company: c.company,
                                ev,
                                kind: "cert",
                              }),
                            CERT_COLOR,
                          )}
                          {numLink(
                            ev.count,
                            () =>
                              openRecords({
                                company: c.company,
                                ev,
                                kind: "both",
                              }),
                            ui.textPrimary,
                          )}
                          <span style={{ fontWeight: 700, color: CPR_COLOR }}>
                            {fmt(ev.avg_days)}
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
          <b style={{ color: ui.textPrimary }}>How it is counted:</b> companies
          are ranked by the average working days of their CPR and Cert released
          in the period (company name = LTO company, same names combined). Only
          companies with at least {minApps} application
          {minApps > 1 ? "s" : ""} are ranked. The evaluator rows show each
          evaluator's share of that company's CPR/Cert and their own average.
        </div>
      </SectionCard>
      {target && (
        <YearRecordsModal
          target={target}
          basis="released"
          ui={ui}
          darkMode={darkMode}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
}
