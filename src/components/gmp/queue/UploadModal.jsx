// src/components/gmp/queue/UploadModal.jsx
// Drag-and-drop Excel upload modal for GMP records
import React, { useState, useRef, useCallback } from "react";
import { uploadGMPExcel } from "../../../api/gmp";
import { FONT } from "../shared/constants";

const ACCENT  = "#10b981";
const MODAL_CSS = `
@keyframes gmpModalIn {
  from { opacity:0; transform:scale(0.95) translateY(10px); }
  to   { opacity:1; transform:scale(1)   translateY(0); }
}
@keyframes gmpBackdropIn {
  from { opacity:0; }
  to   { opacity:1; }
}`;

export default function UploadModal({ onClose, onSuccess, colors, darkMode }) {
  const [file,      setFile]      = useState(null);
  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result,    setResult]    = useState(null);   // { inserted, skipped, errors, message }
  const [error,     setError]     = useState("");
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) {
      setError("Only .xlsx or .xls files are accepted.");
      return;
    }
    setError("");
    setResult(null);
    setFile(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, []);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = ()  => setDragging(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    setResult(null);
    try {
      const res = await uploadGMPExcel(file);
      setResult(res);
      if (res.inserted > 0) onSuccess?.();
    } catch (err) {
      const msg = err?.response?.data?.detail ?? "Upload failed. Please try again.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setUploading(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); setError(""); };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)", zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, fontFamily: FONT,
        animation: "gmpBackdropIn 0.2s ease forwards",
      }}
    >
      <style>{MODAL_CSS}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: darkMode ? "#18191a" : "#ffffff",
          borderRadius: 16, width: "100%", maxWidth: 520,
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
          animation: "gmpModalIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: "18px 22px", borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.4rem" }}>📤</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: colors.textPrimary }}>
                Upload New Report
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "0.73rem", color: colors.textTertiary }}>
                Upload a filled FGMP Excel template to add records
              </p>
            </div>
          </div>
          <button onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 9, border: `1px solid ${colors.cardBorder}`,
              background: "transparent", color: colors.textTertiary,
              cursor: "pointer", fontSize: "1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Result banner */}
          {result && (
            <div style={{
              padding: "12px 16px", borderRadius: 10,
              background: result.inserted > 0 ? "#dcfce7" : "#fef9c3",
              border: `1px solid ${result.inserted > 0 ? "#86efac" : "#fde68a"}`,
            }}>
              <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "0.84rem",
                color: result.inserted > 0 ? "#15803d" : "#854d0e" }}>
                {result.inserted > 0 ? "✅" : "⚠️"} {result.message}
              </p>
              {result.skipped > 0 && (
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#854d0e" }}>
                  {result.skipped} row(s) skipped (duplicate DTN or invalid data)
                </p>
              )}
              {result.errors?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ margin: "0 0 4px", fontSize: "0.72rem", fontWeight: 700, color: "#b91c1c" }}>
                    Row errors:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {result.errors.map((e, i) => (
                      <li key={i} style={{ fontSize: "0.71rem", color: "#b91c1c", marginBottom: 2 }}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button onClick={reset} style={{
                marginTop: 8, fontSize: "0.72rem", color: colors.textTertiary,
                background: "transparent", border: "none", cursor: "pointer",
                padding: 0, textDecoration: "underline",
              }}>
                Upload another file
              </button>
            </div>
          )}

          {/* Drop zone — hidden after result */}
          {!result && (
            <div
              onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? ACCENT : file ? ACCENT : colors.cardBorder}`,
                borderRadius: 12, padding: "32px 20px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                cursor: "pointer", transition: "all 0.18s",
                background: dragging
                  ? `${ACCENT}0a`
                  : file
                    ? `${ACCENT}08`
                    : (darkMode ? "rgba(255,255,255,0.02)" : "#fafafa"),
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <span style={{ fontSize: "2.5rem" }}>{file ? "📄" : "📁"}</span>
              {file ? (
                <>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.84rem", color: ACCENT }}>
                    {file.name}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.72rem", color: colors.textTertiary }}>
                    {(file.size / 1024).toFixed(1)} KB · Click to change file
                  </p>
                </>
              ) : (
                <>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.84rem", color: colors.textPrimary }}>
                    Drag & drop your Excel file here
                  </p>
                  <p style={{ margin: 0, fontSize: "0.73rem", color: colors.textTertiary }}>
                    or click to browse · .xlsx / .xls accepted
                  </p>
                </>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p style={{
              margin: 0, fontSize: "0.76rem", color: "#ef4444",
              background: "#fef2f2", padding: "8px 12px",
              borderRadius: 7, border: "1px solid #fecaca",
            }}>
              ⚠️ {error}
            </p>
          )}

          {/* Info note */}
          {!result && (
            <p style={{
              margin: 0, fontSize: "0.7rem", color: colors.textTertiary,
              background: darkMode ? "rgba(255,255,255,0.04)" : "#f8fafc",
              padding: "8px 12px", borderRadius: 7,
              border: `1px solid ${colors.cardBorder}`,
            }}>
              💡 Use the <strong>Download Template</strong> button to get the correct Excel format.
              Each row in the file becomes one FGMP record. The ID is assigned automatically.
            </p>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "14px 22px", borderTop: `1px solid ${colors.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          gap: 8, flexShrink: 0,
        }}>
          <button onClick={onClose} disabled={uploading}
            style={{
              padding: "8px 20px", fontSize: "0.8rem", fontWeight: 600, fontFamily: FONT,
              borderRadius: 8, border: `1px solid ${colors.cardBorder}`,
              background: "transparent", color: colors.textTertiary, cursor: "pointer",
            }}>
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button
              onClick={handleUpload}
              disabled={uploading || !file}
              style={{
                padding: "8px 24px", fontSize: "0.8rem", fontWeight: 700, fontFamily: FONT,
                borderRadius: 8, border: "none",
                background: (!uploading && file) ? ACCENT : (darkMode ? "#2a2b2c" : "#e2e8f0"),
                color: (!uploading && file) ? "#fff" : colors.textTertiary,
                cursor: (!uploading && file) ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: (!uploading && file) ? `0 2px 8px ${ACCENT}44` : "none",
                transition: "all 0.15s",
              }}
            >
              {uploading ? "⏳ Uploading…" : "📤 Upload"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
