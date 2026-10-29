// src/components/monitoring/evaluatorMonitoring/MonthSummaryModal.jsx
// Opens when a month row of the monthly breakdown is clicked: a summary of that
// month for one person (received, released, still open, top companies, top
// drugs and document types). Every number and bar opens the list of the
// applications behind it.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getEvaluatorMonthSummary } from "../../../api/evaluatorMonitoring";
import { makeUi, Icon, IconChip, Skeleton } from "./ui";
import { CountUp } from "./PeriodsTable";

const fmt = (n) => Number(n ?? 0).toLocaleString();

export default function MonthSummaryModal({
  year,
  period, // { key: month number, label: "Sep" }
  userId,
  role,
  personName,
  darkMode,
  blocked, // a list of applications is open on top: leave Esc to it
  // (side, period, segment|null, extra|null) opens a list of applications
  onOpenList,
  onClose,
}) {
  const ui = makeUi(darkMode);
  const { t } = ui;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError("");
    getEvaluatorMonthSummary({ user_id: userId, year, month: period.key, role })
      .then((res) => !cancelled && setData(res))
      .catch((err) => {
        if (!cancelled)
          setError(err?.response?.data?.detail || err?.message || "Could not load.");
      });
    return () => {
      cancelled = true;
    };
  }, [year, period.key, userId, role]);

  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 170);
  };
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !blocked && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (side, seg = null, extra = null) =>
    onOpenList(side, period, seg, extra);

  const tile = (label, value, tone, onClick) => {
    const c =
      tone === "green"
        ? { ink: t.accentText, soft: t.accentSoft, line: t.accentLine }
        : tone === "amber"
          ? { ink: t.amberText, soft: t.amberSoft, line: t.amberLine }
          : { ink: t.blueText, soft: t.blueSoft, line: t.blueLine };
    const clickable = value > 0;
    return (
      <button
        type="button"
        disabled={!clickable}
        onClick={onClick}
        title={clickable ? "Show these applications" : undefined}
        onMouseEnter={(e) =>
          clickable && (e.currentTarget.style.boxShadow = `0 0 0 3px ${c.soft}`)
        }
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
        style={{
          flex: "1 1 150px",
          padding: "0.8rem 1rem",
          textAlign: "left",
          background: c.soft,
          border: `1px solid ${c.line}`,
          borderRadius: 12,
          fontFamily: "inherit",
          cursor: clickable ? "pointer" : "default",
          transition: "box-shadow .15s",
        }}
      >
        <div
          style={{
            fontSize: "0.6rem",
            fontWeight: 600,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: c.ink,
          }}
        >
          {label}
        </div>
        <div
          style={{
            marginTop: 2,
            fontSize: "1.6rem",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: c.ink,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <CountUp value={value} />
        </div>
      </button>
    );
  };

  // a ranked list whose rows are bars: the bar is the share of the biggest row
  const ranking = (title, icon, items, total, onPick, footnote) => {
    const max = Math.max(1, ...items.map((i) => i.count));
    return (
      <div style={{ ...ui.card, boxShadow: "none" }}>
        <div style={{ ...ui.cardHead, padding: "0.65rem 1rem" }}>
          <h3 style={ui.cardTitle}>
            <IconChip name={icon} t={t} size={26} />
            {title}
          </h3>
        </div>
        {items.length === 0 ? (
          <div style={{ padding: "1.2rem", textAlign: "center", fontSize: "0.74rem", color: t.ink3 }}>
            Nothing to show.
          </div>
        ) : (
          <div style={{ padding: "0.3rem 0" }}>
            {items.map((i) => (
              <button
                key={i.key ?? i.name}
                type="button"
                onClick={() => onPick(i)}
                title="Show these applications"
                onMouseEnter={(e) => (e.currentTarget.style.background = t.rowHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "7px 1rem",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  fontFamily: "inherit",
                  color: t.ink,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: "0.76rem" }}>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {i.name}
                  </span>
                  <span style={{ fontWeight: 700, color: t.blueText, fontVariantNumeric: "tabular-nums" }}>
                    {fmt(i.count)}
                  </span>
                </div>
                <div style={{ marginTop: 4, height: 5, borderRadius: 999, background: t.pill, overflow: "hidden" }}>
                  <div
                    className="em-wipe"
                    style={{
                      width: `${Math.max(3, (i.count / max) * 100)}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: t.blue,
                    }}
                  />
                </div>
              </button>
            ))}
            {footnote && total > items.length && (
              <div style={{ padding: "4px 1rem 6px", fontSize: "0.66rem", color: t.ink3 }}>
                Top {items.length} of {fmt(total)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return createPortal(
    <div
      className={`em-root ${closing ? "em-fade-out" : "em-fade"}`}
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: darkMode ? "rgba(0,0,0,0.65)" : "rgba(15,15,16,0.42)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        className={closing ? "em-modal-out" : "em-modal"}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(980px, 100%)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: t.surface,
          border: `1px solid ${t.lineStrong}`,
          borderRadius: 16,
          boxShadow: t.shadowPop,
          color: t.ink,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
            padding: "1.1rem 1.35rem",
            borderBottom: `1px solid ${t.line}`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: t.blueText, marginBottom: 7 }}>
              Month summary
            </div>
            <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 9, fontSize: "1.02rem", fontWeight: 600, letterSpacing: "-0.015em" }}>
              <IconChip name="calendar" t={t} size={30} tone="green" />
              {period.label} {year}
            </h2>
            <div style={{ marginTop: 6, fontSize: "0.72rem", color: t.ink3 }}>
              {personName ? `${personName} · ` : ""}
              {data ? `${fmt(data.total_apps)} applications received or released` : "Loading…"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {data && data.total_apps > 0 && (
              <button
                type="button"
                onClick={() => open("either")}
                style={ui.button}
                onMouseEnter={ui.hoverOn}
                onMouseLeave={(e) => ui.hoverOff(e, t.surface)}
              >
                View all applications
              </button>
            )}
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              style={{ width: 34, height: 34, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", border: `1px solid ${t.line}`, borderRadius: 10, color: t.ink2, cursor: "pointer" }}
              onMouseEnter={ui.hoverOn}
              onMouseLeave={(e) => ui.hoverOff(e)}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "1.1rem 1.35rem 1.35rem" }}>
          {error && (
            <div role="alert" style={{ fontSize: "0.76rem" }}>
              {error}
            </div>
          )}
          {!data && !error && (
            <div aria-busy="true">
              <Skeleton t={t} h={72} style={{ marginBottom: 14 }} />
              <Skeleton t={t} h={48} style={{ marginBottom: 14 }} />
              <Skeleton t={t} h={150} />
            </div>
          )}
          {data && (
            <div className="em-stagger" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                {tile("Received", data.received, "blue", () => open("received"))}
                {tile("Released", data.released, "green", () => open("released"))}
                {tile("Still open", data.still_open, "amber", () =>
                  open("received", { key: "rest" }),
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: "1rem" }}>
                {ranking("Top companies", "building", data.companies, data.company_total, (i) =>
                  open("either", null, { company_key: i.key, name: i.name }), true)}
                {ranking("Top drugs", "pill", data.drugs, data.drug_total, (i) =>
                  open("either", null, { drug_key: i.key, name: i.name }), true)}
                {ranking("Document types", "trend", data.doc_types.slice(0, 6), data.doc_types.length, (i) =>
                  open("either", null, { doc_type: i.name, name: i.name }), true)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
