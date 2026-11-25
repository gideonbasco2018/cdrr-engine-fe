// src/components/softcopy/SoftcopyUploadModal.jsx
// Upload the FDAC "CDRR PD & LTRS SOFTCOPY" Excel file.
// Same two steps as the FGMP queue upload: Check File (nothing saved) → Confirm.
// asView = shown as the page's Upload tab (not a popup); onNext(count) = the
// "Next: Auto-sort" button after letters were added.
import React, { useState, useRef, useCallback } from "react";
import { previewSoftcopyExcel, uploadSoftcopyExcel } from "../../api/softcopy";
import { FONT } from "../gmp/shared/constants";
import { frameOuter, frameCard, stop } from "./viewFrame";

const ACCENT = "#10b981";

export default function SoftcopyUploadModal({ onClose, onSuccess, onNext, asView = false, colors, darkMode }) {
  const [file, setFile] = useState(null);
  const [driveLink, setDriveLink] = useState("");
  const [dragging, setDragging] = useState(false);
  const [checking, setChecking] = useState(false);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const busy = checking || uploading;

  const handleFile = (f) => {
    if (!f) return;
    if (!/\.xlsx?$/i.test(f.name)) {
      setError("Only .xlsx or .xls files are accepted.");
      return;
    }
    setError("");
    setResult(null);
    setPreview(null);
    setFile(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if (checking) return;
    handleFile(e.dataTransfer.files?.[0]);
  }, [checking]);

  const handleCheck = async () => {
    if (!file) return;
    setChecking(true);
    setError("");
    try {
      setPreview(await previewSoftcopyExcel(file));
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Could not read this file.");
    } finally {
      setChecking(false);
    }
  };

  const handleConfirm = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const res = await uploadSoftcopyExcel(file, driveLink);
      setResult(res);
      setPreview(null);
      if (res.inserted > 0) onSuccess?.();
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const reset = () => { setFile(null); setDriveLink(""); setPreview(null); setResult(null); setError(""); };

  const box = (bg, border) => ({ padding: "10px 12px", borderRadius: 9, background: bg, border: `1px solid ${border}` });
  const muted = darkMode ? "rgba(255,255,255,0.03)" : "#f8fafc";

  return (
    <div {...frameOuter(asView, busy ? undefined : onClose)}>
      <div
        onClick={stop}
        style={frameCard(asView, {
          background: darkMode ? "#18191a" : "#ffffff", borderRadius: 16, width: "100%", maxWidth: 560,
          maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        }, colors, 820)}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${colors.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: colors.textPrimary }}>📤 Upload Transmittal</h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.73rem", color: colors.textTertiary }}>
              The "CDRR PD &amp; LTRS SOFTCOPY" Excel file from the FDAC email
            </p>
          </div>
          {!asView && (
            <button onClick={onClose} disabled={busy} style={{
              width: 32, height: 32, borderRadius: 9, border: `1px solid ${colors.cardBorder}`,
              background: "transparent", color: colors.textTertiary, cursor: busy ? "not-allowed" : "pointer",
            }}>✕</button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={box(result.inserted > 0 ? "#dcfce7" : "#fef9c3", result.inserted > 0 ? "#86efac" : "#fde68a")}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.84rem", color: result.inserted > 0 ? "#15803d" : "#854d0e" }}>
                  {result.inserted > 0 ? "✅" : "⚠️"} {result.inserted} letter{result.inserted === 1 ? "" : "s"} added
                </p>
                {result.skipped > 0 && (
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#854d0e" }}>{result.skipped} row(s) skipped</p>
                )}
              </div>
              <button onClick={reset} style={{
                alignSelf: "flex-start", fontSize: "0.72rem", color: colors.textTertiary,
                background: "transparent", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline",
              }}>Upload another file</button>
            </div>
          )}

          {preview && !result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* What the header block says */}
              <div style={{ ...box(muted, colors.cardBorder), fontSize: "0.74rem", color: colors.textSecondary, lineHeight: 1.6 }}>
                <div><strong>Transmittal date:</strong> {preview.header.transmittal_date || "—"}</div>
                <div><strong>Prepared by:</strong> {preview.header.prepared_by || "—"}</div>
                <div><strong>Subject:</strong> {preview.header.subject || "—"}</div>
                <div>
                  <strong>Applications (per file):</strong> {preview.header.application_count ?? "—"}
                  {preview.header.application_count != null && preview.header.application_count !== preview.total_rows && (
                    <span style={{ color: "#b45309" }}> · but {preview.total_rows} rows were found</span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, ...box("#dcfce7", "#86efac") }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem", color: "#15803d" }}>{preview.insert_count}</p>
                  <p style={{ margin: 0, fontSize: "0.7rem", color: "#15803d" }}>will be added</p>
                </div>
                <div style={{ flex: 1, ...box(preview.skip_count > 0 ? "#fef9c3" : muted, preview.skip_count > 0 ? "#fde68a" : colors.cardBorder) }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem", color: preview.skip_count > 0 ? "#854d0e" : colors.textTertiary }}>{preview.skip_count}</p>
                  <p style={{ margin: 0, fontSize: "0.7rem", color: preview.skip_count > 0 ? "#854d0e" : colors.textTertiary }}>will be skipped</p>
                </div>
              </div>

              {preview.insert_count > 0 && (
                <List title="✅ Ready to add:" titleColor="#15803d" border={colors.cardBorder}>
                  {preview.will_insert.map((r) => (
                    <Row key={r.row_number} border={colors.cardBorder}
                      top={`DTN ${r.dtn}${r.company_name ? ` · ${r.company_name}` : ""}`} topColor={colors.textPrimary}
                      bottom={[r.app_type, r.date_received].filter(Boolean).join(" · ")} bottomColor={colors.textTertiary} />
                  ))}
                </List>
              )}

              {preview.skip_count > 0 && (
                <List title="⚠️ Won't be added:" titleColor="#b91c1c" border="#fecaca" bg="#fef2f2">
                  {preview.will_skip.map((r) => (
                    <Row key={r.row_number} border="#fecaca"
                      top={`Row ${r.row_number}${r.dtn ? ` · DTN ${r.dtn}` : ""}`} topColor="#7f1d1d"
                      bottom={r.reason} bottomColor="#b91c1c" />
                  ))}
                </List>
              )}

              {preview.total_rows === 0 && (
                <p style={{ margin: 0, fontSize: "0.76rem", color: colors.textTertiary }}>No letter rows found in this file.</p>
              )}
            </div>
          )}

          {!result && !preview && (
            <>
              <div
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); if (!checking) setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => !checking && inputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging || file ? ACCENT : colors.cardBorder}`, borderRadius: 12,
                  padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  cursor: checking ? "not-allowed" : "pointer",
                  background: dragging || file ? `${ACCENT}0a` : (darkMode ? "rgba(255,255,255,0.02)" : "#fafafa"),
                }}
              >
                <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }}
                  onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
                <span style={{ fontSize: "2.2rem" }}>{file ? "📄" : "📁"}</span>
                {file ? (
                  <>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.84rem", color: ACCENT }}>{file.name}</p>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: colors.textTertiary }}>
                      {checking ? "Checking…" : `${(file.size / 1024).toFixed(1)} KB · Click to change file`}
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.84rem", color: colors.textPrimary }}>Drag &amp; drop the Excel file here</p>
                    <p style={{ margin: 0, fontSize: "0.73rem", color: colors.textTertiary }}>or click to browse · .xlsx / .xls</p>
                  </>
                )}
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: "0.74rem", fontWeight: 600, color: colors.textSecondary }}>
                  Drive folder link <span style={{ fontWeight: 400, color: colors.textTertiary }}>(the "CDRR PAID LTRS" folder in the email)</span>
                </span>
                <input
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/…"
                  style={{
                    padding: "8px 10px", fontSize: "0.78rem", fontFamily: FONT, borderRadius: 8,
                    border: `1px solid ${colors.inputBorder}`, background: colors.inputBg, color: colors.textPrimary, outline: "none",
                  }}
                />
              </label>

              <p style={{ margin: 0, fontSize: "0.7rem", color: colors.textTertiary, ...box(muted, colors.cardBorder), lineHeight: 1.5 }}>
                💡 <strong>Check File</strong> reads the file first and shows what will be added. Nothing is added until you confirm.
                A row whose <strong>DTN is already on the page</strong> is skipped, never overwritten. The letters are kept in this
                browser only. Each DTN will be linked to its own
                folder inside the Drive folder you paste above.
              </p>
            </>
          )}

          {error && (
            <p style={{ margin: 0, fontSize: "0.76rem", color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: 7, border: "1px solid #fecaca" }}>
              ⚠️ {String(error)}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${colors.cardBorder}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {/* Popup: Close / Back / Cancel. Tab: Back / Clear file / Upload another (nothing to close). */}
          {(!asView || preview || result || file) && (
            <button
              onClick={
                preview && !result ? () => { setPreview(null); setError(""); }
                  : asView ? (result ? onClose : reset)
                  : onClose
              }
              disabled={busy}
              style={{
                padding: "8px 20px", fontSize: "0.8rem", fontWeight: 600, fontFamily: FONT, borderRadius: 8,
                border: `1px solid ${colors.cardBorder}`, background: "transparent", color: colors.textTertiary, cursor: "pointer",
              }}
            >
              {preview && !result ? "← Back" : asView ? (result ? "See letters" : "Clear file") : result ? "Close" : "Cancel"}
            </button>
          )}

          {result?.inserted > 0 && onNext && (
            <PrimaryButton onClick={() => onNext(result.inserted)} darkMode={darkMode} colors={colors}>
              Next: Auto-sort the {result.inserted} new letter{result.inserted === 1 ? "" : "s"} →
            </PrimaryButton>
          )}

          {!result && !preview && (
            <PrimaryButton onClick={handleCheck} disabled={checking || !file} darkMode={darkMode} colors={colors}>
              {checking ? "🔍 Checking…" : "🔍 Check File"}
            </PrimaryButton>
          )}
          {preview && !result && (
            <PrimaryButton onClick={handleConfirm} disabled={uploading || preview.insert_count === 0} darkMode={darkMode} colors={colors}>
              {uploading ? "⏳ Uploading…" : preview.insert_count > 0 ? `📤 Confirm & Add ${preview.insert_count}` : "Nothing to add"}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

function PrimaryButton({ onClick, disabled, darkMode, colors, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "8px 24px", fontSize: "0.8rem", fontWeight: 700, fontFamily: FONT, borderRadius: 8, border: "none",
      background: disabled ? (darkMode ? "#2a2b2c" : "#e2e8f0") : ACCENT,
      color: disabled ? colors.textTertiary : "#fff",
      cursor: disabled ? "not-allowed" : "pointer",
      boxShadow: disabled ? "none" : `0 2px 8px ${ACCENT}44`,
    }}>
      {children}
    </button>
  );
}

function List({ title, titleColor, border, bg, children }) {
  return (
    <div>
      <p style={{ margin: "0 0 4px", fontSize: "0.72rem", fontWeight: 700, color: titleColor }}>{title}</p>
      <div style={{ maxHeight: 160, overflowY: "auto", borderRadius: 8, border: `1px solid ${border}`, background: bg }}>
        {children}
      </div>
    </div>
  );
}

function Row({ top, topColor, bottom, bottomColor, border }) {
  return (
    <div style={{ padding: "6px 10px", borderBottom: `1px solid ${border}` }}>
      <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 600, color: topColor }}>{top}</p>
      {bottom && <p style={{ margin: 0, fontSize: "0.68rem", color: bottomColor }}>{bottom}</p>}
    </div>
  );
}
