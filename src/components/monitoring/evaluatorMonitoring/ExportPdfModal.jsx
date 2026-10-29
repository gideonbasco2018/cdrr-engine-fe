// src/components/monitoring/evaluatorMonitoring/ExportPdfModal.jsx
// "Export PDF report": the person picks which sections of the page go into the
// PDF. The choice is remembered in this browser (when it can be).
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { makeUi, Icon, IconChip } from "./ui";

// the keys are used by exportMonitoringPdf
export const PDF_SECTIONS = [
  { key: "periods", label: "Received and Released (bars and table)" },
  { key: "sources", label: "Where the TAT dates came from" },
  { key: "companies", label: "Companies (all rows)" },
  { key: "drugs", label: "Drugs (all rows)" },
  { key: "skipped", label: "Skipped applications" },
  { key: "formula", label: "How it is computed" },
];

const STORE = "userInsights.pdfSections";
const ALL = PDF_SECTIONS.map((s) => s.key);

const loadSaved = () => {
  try {
    const v = JSON.parse(localStorage.getItem(STORE));
    if (Array.isArray(v)) {
      const keep = v.filter((k) => ALL.includes(k));
      if (keep.length > 0) return keep;
    }
  } catch {
    /* no storage: start with everything ticked */
  }
  return ALL;
};

export default function ExportPdfModal({
  subtitle, // e.g. "Rachelle Diño · All years"
  busy,
  darkMode,
  onGenerate, // (sections: string[]) => void
  onCancel,
}) {
  const ui = makeUi(darkMode);
  const { t } = ui;
  const [selected, setSelected] = useState(loadSaved);
  const [closing, setClosing] = useState(false);
  const allRef = useRef(null);

  const allOn = selected.length === ALL.length;
  const none = selected.length === 0;

  // "Select all" shows a dash when only some are ticked
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = !allOn && !none;
  }, [allOn, none]);

  const cancel = () => {
    if (closing || busy) return;
    setClosing(true);
    setTimeout(onCancel, 170);
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && cancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key) =>
    setSelected((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
    );

  const generate = () => {
    if (none || busy) return;
    // keep the order of the report, not the order of the clicks
    const ordered = ALL.filter((k) => selected.includes(k));
    try {
      localStorage.setItem(STORE, JSON.stringify(ordered));
    } catch {
      /* not remembered: fine */
    }
    onGenerate(ordered);
  };

  const row = (checked, label, onChange, { bold = false, refEl } = {}) => (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0.55rem 0.4rem",
        borderRadius: 9,
        cursor: "pointer",
        fontSize: "0.86rem",
        fontWeight: bold ? 700 : 500,
        color: t.ink,
        transition: "background .12s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = t.hover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <input
        ref={refEl}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{
          width: 17,
          height: 17,
          margin: 0,
          accentColor: t.accent,
          cursor: "pointer",
        }}
      />
      {label}
    </label>
  );

  return createPortal(
    <div
      className={`em-root ${closing ? "em-fade-out" : "em-fade"}`}
      onClick={cancel}
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
        aria-labelledby="em-pdf-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(500px, 100%)",
          background: t.surface,
          border: `1px solid ${t.lineStrong}`,
          borderRadius: 16,
          boxShadow: t.shadowPop,
          padding: "1.5rem 1.6rem 1.35rem",
          color: t.ink,
        }}
      >
        <h2
          id="em-pdf-title"
          style={{
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 11,
            fontSize: "1.1rem",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          <IconChip name="file" t={t} size={32} tone="green" />
          Export PDF report
        </h2>
        <p
          style={{
            margin: "0.7rem 0 1rem",
            fontSize: "0.8rem",
            lineHeight: 1.55,
            color: t.ink3,
          }}
        >
          {subtitle}. Choose what to include. The report follows the current
          filters and is always light, so it prints well.
        </p>

        {row(
          allOn,
          "Select all",
          () => setSelected(allOn ? [] : ALL),
          { bold: true, refEl: allRef },
        )}
        <div
          style={{ height: 1, background: t.line, margin: "0.35rem 0.4rem 0.45rem" }}
        />
        {PDF_SECTIONS.map((s) => (
          <div key={s.key}>
            {row(selected.includes(s.key), s.label, () => toggle(s.key))}
          </div>
        ))}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: "1.4rem",
          }}
        >
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            style={{ ...ui.button, height: 38, padding: "0 20px", fontSize: "0.82rem" }}
            onMouseEnter={ui.hoverOn}
            onMouseLeave={(e) => ui.hoverOff(e, t.surface)}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={generate}
            disabled={none || busy}
            style={{
              ...ui.button,
              height: 38,
              padding: "0 22px",
              fontSize: "0.82rem",
              fontWeight: 600,
              background: t.accent,
              borderColor: t.accent,
              color: "#ffffff",
              opacity: none || busy ? 0.5 : 1,
              cursor: none || busy ? "default" : "pointer",
              boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
            }}
          >
            {busy ? (
              "Preparing…"
            ) : (
              <>
                <Icon name="download" size={14} />
                Generate PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
