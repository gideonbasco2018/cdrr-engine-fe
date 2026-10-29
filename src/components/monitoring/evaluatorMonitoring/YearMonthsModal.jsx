// src/components/monitoring/evaluatorMonitoring/YearMonthsModal.jsx
// Opens when a year row of "Received and Released by Year" is clicked: the same
// card as a monthly breakdown of that year, in thin rows. Months with nothing
// received or released are left out. The legends are cut by month too. A month
// row opens that month's summary (MonthSummaryModal); its numbers and bars open
// the list of one side (or one part) as usual.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getEvaluatorMonitoring } from "../../../api/evaluatorMonitoring";
import { makeUi, Icon, IconChip, Skeleton } from "./ui";
import { PeriodsTable } from "./PeriodsTable";
import MonthSummaryModal from "./MonthSummaryModal";

export default function YearMonthsModal({
  year,
  userId,
  role,
  personName,
  darkMode,
  blocked, // a list of applications is open on top: leave Esc to it
  onOpenList, // (side: "received" | "released" | "either", period, segment|null)
  onClose,
}) {
  const ui = makeUi(darkMode);
  const { t } = ui;
  const [periods, setPeriods] = useState(null);
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);
  const [summary, setSummary] = useState(null); // the month row that was clicked

  useEffect(() => {
    let cancelled = false;
    setPeriods(null);
    setError("");
    getEvaluatorMonitoring({
      user_id: userId,
      year: String(year),
      month: "All",
      role,
      split: "month",
    })
      .then((res) => !cancelled && setPeriods(res.periods || []))
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.detail || err?.message || "Could not load.");
      });
    return () => {
      cancelled = true;
    };
  }, [year, userId, role]);

  // months with nothing received or released are not shown
  const visible = (periods || []).filter((p) => p.received > 0 || p.released > 0);

  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 170);
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !blocked && !summary && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

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
          width: "min(1180px, 100%)",
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
            <div
              style={{
                fontSize: "0.6rem",
                fontWeight: 600,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: t.blueText,
                marginBottom: 7,
              }}
            >
              Year
            </div>
            <h2
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 9,
                fontSize: "1.02rem",
                fontWeight: 600,
                letterSpacing: "-0.015em",
              }}
            >
              <IconChip name="calendar" t={t} size={30} tone="green" />
              Received and Released in {year}
            </h2>
            <div style={{ marginTop: 6, fontSize: "0.72rem", color: t.ink3 }}>
              {personName ? `${personName} · ` : ""}
              Monthly breakdown · open and closed apps
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            style={{
              width: 34,
              height: 34,
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: `1px solid ${t.line}`,
              borderRadius: 10,
              color: t.ink2,
              cursor: "pointer",
            }}
            onMouseEnter={ui.hoverOn}
            onMouseLeave={(e) => ui.hoverOff(e)}
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          {error && (
            <div role="alert" style={{ padding: "1rem 1.35rem", fontSize: "0.76rem" }}>
              {error}
            </div>
          )}
          {!periods && !error && (
            <div aria-busy="true" style={{ padding: "1.1rem 1.35rem" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  t={t}
                  h={34}
                  style={{ marginBottom: 16, opacity: 1 - i * 0.12 }}
                />
              ))}
            </div>
          )}
          {periods && visible.length === 0 && (
            <div
              style={{
                padding: "2.5rem 1.35rem",
                textAlign: "center",
                fontSize: "0.78rem",
                color: t.ink3,
              }}
            >
              Nothing was received or released in {year}.
            </div>
          )}
          {periods && visible.length > 0 && (
            <PeriodsTable
              periods={visible}
              mode="month"
              compact
              scroll={false} // this body scrolls, so the header and Total stick to it
              onOpen={onOpenList}
              onRowClick={(p) => setSummary(p)}
              rowTitle={(p) => `Show the summary of ${p.label}`}
              ui={ui}
              t={t}
            />
          )}
        </div>
      </div>
      {summary && (
        <MonthSummaryModal
          year={year}
          period={summary}
          userId={userId}
          role={role}
          personName={personName}
          darkMode={darkMode}
          blocked={blocked}
          onOpenList={onOpenList}
          onClose={() => setSummary(null)}
        />
      )}
    </div>,
    document.body,
  );
}
