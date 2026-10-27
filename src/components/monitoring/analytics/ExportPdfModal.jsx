// src/components/monitoring/analytics/ExportPdfModal.jsx
// Lets the user pick which Analytics sections go into the PDF report.
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FB } from "./analyticsConstants";
import { neuCardBg } from "./analyticsHelpers";
import { PDF_SECTIONS, generateAnalyticsPdf } from "./exportAnalyticsPdf";

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export default function ExportPdfModal({
  ui,
  darkMode,
  data,
  userName,
  onClose,
}) {
  const [picked, setPicked] = useState(
    () => new Set(PDF_SECTIONS.map((s) => s.key)),
  );
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null); // { step, total, label }
  const [result, setResult] = useState(null); // { pages, skipped } | { error }

  const line = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const toggle = (key) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const allOn = picked.size === PDF_SECTIONS.length;

  const generate = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await generateAnalyticsPdf({
        sections: [...picked],
        data,
        userName,
        onProgress: setProgress,
      });
      setResult(res);
    } catch (err) {
      setResult({ error: err.message || "Failed to generate the PDF." });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return createPortal(
    <div
      onClick={() => !busy && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: font,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440,
          maxWidth: "92vw",
          background: darkMode ? "#1f2023" : "#fff",
          color: ui.textPrimary,
          borderRadius: 14,
          border: `1px solid ${line}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          padding: 20,
        }}
      >
        <div style={{ fontSize: "1rem", fontWeight: 700 }}>
          📄 Export PDF report
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: ui.textMuted,
            margin: "2px 0 14px",
          }}
        >
          Choose what to include. The report is a designed A4 layout built from
          the data loaded on this page, and it is always light so it prints
          well.
        </div>

        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: "0.8rem",
            fontWeight: 700,
            paddingBottom: 8,
            borderBottom: `1px solid ${line}`,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={allOn}
            disabled={busy}
            onChange={() =>
              setPicked(
                allOn ? new Set() : new Set(PDF_SECTIONS.map((s) => s.key)),
              )
            }
          />
          Select all
        </label>
        {PDF_SECTIONS.map((s) => (
          <label
            key={s.key}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              fontSize: "0.8rem",
              padding: "7px 0",
              cursor: busy ? "default" : "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={picked.has(s.key)}
              disabled={busy}
              onChange={() => toggle(s.key)}
            />
            {s.label}
          </label>
        ))}

        {busy && progress && (
          <div style={{ fontSize: "0.75rem", color: FB, marginTop: 12 }}>
            Building {progress.step + 1} of {progress.total}: {progress.label}…
          </div>
        )}
        {result?.error && (
          <div style={{ fontSize: "0.75rem", color: "#e02020", marginTop: 12 }}>
            ⚠️ {result.error}
          </div>
        )}
        {result && !result.error && (
          <div style={{ fontSize: "0.75rem", color: "#36a420", marginTop: 12 }}>
            ✓ PDF downloaded ({result.pages} page{result.pages !== 1 ? "s" : ""}
            ).
            {result.skipped.length > 0 && (
              <div style={{ color: ui.textMuted, marginTop: 4 }}>
                Skipped: {result.skipped.join("; ")}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              padding: "7px 14px",
              fontSize: "0.78rem",
              borderRadius: 8,
              border: `1px solid ${line}`,
              background: "transparent",
              color: ui.textPrimary,
              cursor: busy ? "default" : "pointer",
              fontFamily: font,
            }}
          >
            {result && !result.error ? "Close" : "Cancel"}
          </button>
          <button
            onClick={generate}
            disabled={busy || picked.size === 0}
            style={{
              padding: "7px 16px",
              fontSize: "0.78rem",
              fontWeight: 700,
              borderRadius: 8,
              border: "none",
              background: busy || picked.size === 0 ? neuCardBg(darkMode) : FB,
              color: busy || picked.size === 0 ? ui.textMuted : "#fff",
              cursor: busy || picked.size === 0 ? "not-allowed" : "pointer",
              fontFamily: font,
            }}
          >
            {busy ? "Generating…" : "Generate PDF"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
