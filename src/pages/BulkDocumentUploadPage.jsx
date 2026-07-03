// src/pages/BulkDocumentUploadPage.jsx

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  ExternalLink,
} from "lucide-react";

import { uploadApplicationDocumentsBatch } from "../api/application-documents";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — dapat tugma sa backend limit
const ACCEPTED_TYPES = {
  "application/pdf": "pdf",
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "doc",
  "application/vnd.ms-excel": "sheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "sheet",
};
const ACCEPT_ATTR = ".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx";

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function kindOf(file) {
  return ACCEPTED_TYPES[file.type] || "other";
}

function KindIcon({ kind, size = 16 }) {
  if (kind === "pdf") return <FileText size={size} />;
  if (kind === "image") return <ImageIcon size={size} />;
  return <FileIcon size={size} />;
}

/**
 * BulkDocumentUploadPage
 *
 * Sumusunod sa parehong pattern ng TaskPage.jsx — `darkMode` ay ipinapasa
 * bilang prop mula sa parent/layout (hindi nagmamay-ari ng sarili nitong
 * theme toggle). Gamitin ang existing global dark mode switch niyo sa
 * top nav para makontrol ito.
 */
function BulkDocumentUploadPage({ darkMode }) {
  const colors = getColors(darkMode);

  const [mainDbId, setMainDbId] = useState("");
  const [dbEntryType, setDbEntryType] = useState("");
  const [dbDtn, setDbDtn] = useState("");
  const [docCategory, setDocCategory] = useState("");

  const [entries, setEntries] = useState([]); // { id, file, kind, previewUrl }
  const [activeId, setActiveId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [formError, setFormError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);

  const fileInputRef = useRef(null);
  const activeEntry = useMemo(
    () => entries.find((e) => e.id === activeId) || null,
    [entries, activeId],
  );

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      entries.forEach((e) => URL.revokeObjectURL(e.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList).map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      kind: kindOf(file),
      previewUrl: URL.createObjectURL(file),
    }));
    setEntries((prev) => [...prev, ...incoming]);
    setActiveId((prev) => prev ?? incoming[0]?.id ?? null);
    setUploadResults(null);
  }, []);

  const handleFileInputChange = (e) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeEntry = (id) => {
    setEntries((prev) => {
      const target = prev.find((e) => e.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const next = prev.filter((e) => e.id !== id);
      if (activeId === id) {
        setActiveId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const clearAll = () => {
    entries.forEach((e) => URL.revokeObjectURL(e.previewUrl));
    setEntries([]);
    setActiveId(null);
    setMainDbId("");
    setDbEntryType("");
    setDbDtn("");
    setDocCategory("");
    setFormError("");
    setUploadResults(null);
    setUploadProgress(0);
  };

  const validate = () => {
    if (!mainDbId.toString().trim()) return "Main DB ID is required.";
    if (!dbEntryType.trim()) return "Entry Type is required.";
    if (!dbDtn.trim()) return "DTN is required.";
    if (entries.length === 0) return "Add at least one file.";
    for (const { file } of entries) {
      if (!(file.type in ACCEPTED_TYPES))
        return `"${file.name}" is not a supported file type.`;
      if (file.size > MAX_FILE_SIZE)
        return `"${file.name}" exceeds the 5MB limit.`;
    }
    return "";
  };

  const handleUpload = async () => {
    setFormError("");
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadApplicationDocumentsBatch(
        {
          mainDbId,
          dbEntryType,
          dbDtn,
          docCategory: docCategory.trim() || undefined,
          files: entries.map((e) => e.file),
        },
        (pct) => setUploadProgress(pct),
      );
      setUploadResults(result);
      // Files stay in the list so the person can still review previews after upload
    } catch (err) {
      setFormError(err.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const s = buildStyles(colors);

  return (
    <div style={s.page}>
      <div style={s.shell}>
        <header style={s.header}>
          <div>
            <h1 style={s.title}>Bulk Document Upload</h1>
            <p style={s.subtitle}>
              Add files and preview them before uploading to Drive.
            </p>
          </div>
        </header>

        <div style={s.layout}>
          {/* ── Left: form + file list ─────────────────────────── */}
          <div style={s.leftCol}>
            <div style={s.card}>
              <div style={s.fieldGrid}>
                <Field label="Main DB ID" required colors={colors}>
                  <input
                    type="number"
                    value={mainDbId}
                    onChange={(e) => setMainDbId(e.target.value)}
                    placeholder="e.g. 2"
                    style={s.input}
                  />
                </Field>
                <Field label="Entry Type" required colors={colors}>
                  <input
                    type="text"
                    value={dbEntryType}
                    onChange={(e) => setDbEntryType(e.target.value)}
                    placeholder="e.g. Corrections"
                    style={s.input}
                  />
                </Field>
                <Field label="DTN" required colors={colors}>
                  <input
                    type="text"
                    value={dbDtn}
                    onChange={(e) => setDbDtn(e.target.value)}
                    placeholder="e.g. 20260702095509"
                    style={s.input}
                  />
                </Field>
                <Field label="Category" hint="optional" colors={colors}>
                  <input
                    type="text"
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    placeholder="e.g. Product File"
                    style={s.input}
                  />
                </Field>
              </div>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                ...s.dropzone,
                ...(isDragging ? s.dropzoneActive : {}),
              }}
            >
              <Upload size={20} />
              <p style={s.dropzoneText}>
                <strong>Click</strong> or drag files here
              </p>
              <p style={s.dropzoneHint}>
                PDF, JPG, PNG, GIF, WEBP, DOC, DOCX, XLS, XLSX · max 5MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPT_ATTR}
                onChange={handleFileInputChange}
                style={{ display: "none" }}
              />
            </div>

            {entries.length > 0 && (
              <div style={s.fileListCard}>
                <div style={s.fileListHeader}>
                  <span>{entries.length} file(s)</span>
                  <button type="button" onClick={clearAll} style={s.clearLink}>
                    <Trash2 size={13} /> Clear all
                  </button>
                </div>
                <ul style={s.fileList}>
                  {entries.map((entry) => {
                    const isActive = entry.id === activeId;
                    const result = uploadResults?.results?.find(
                      (r) => r.filename === entry.file.name,
                    );
                    return (
                      <li
                        key={entry.id}
                        onClick={() => setActiveId(entry.id)}
                        style={{
                          ...s.fileItem,
                          ...(isActive ? s.fileItemActive : {}),
                        }}
                      >
                        <span style={s.fileItemIcon}>
                          <KindIcon kind={entry.kind} />
                        </span>
                        <span style={s.fileItemName} title={entry.file.name}>
                          {entry.file.name}
                        </span>
                        <span style={s.fileItemSize}>
                          {formatBytes(entry.file.size)}
                        </span>
                        {result &&
                          (result.success ? (
                            <CheckCircle2 size={14} color={colors.success} />
                          ) : (
                            <XCircle size={14} color={colors.danger} />
                          ))}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeEntry(entry.id);
                          }}
                          style={s.fileItemRemove}
                          aria-label={`Remove ${entry.file.name}`}
                        >
                          <X size={13} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {formError && <div style={s.errorBanner}>{formError}</div>}

            <div style={s.actions}>
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || entries.length === 0}
                style={{
                  ...s.primaryBtn,
                  ...(isUploading || entries.length === 0 ? s.btnDisabled : {}),
                }}
              >
                {isUploading ? (
                  <>
                    <Loader2
                      size={15}
                      style={{ animation: "bdu-spin 1s linear infinite" }}
                    />
                    Uploading... {uploadProgress}%
                  </>
                ) : (
                  `Upload${entries.length ? ` (${entries.length})` : ""}`
                )}
              </button>
            </div>

            {uploadResults && (
              <div style={s.resultsCard}>
                <div style={s.resultsSummary}>
                  <span style={s.resultsTotal}>
                    {uploadResults.total} processed
                  </span>
                  <span style={s.badgeSuccess}>
                    {uploadResults.succeeded} successful
                  </span>
                  {uploadResults.failed > 0 && (
                    <span style={s.badgeFail}>
                      {uploadResults.failed} failed
                    </span>
                  )}
                </div>
                {uploadResults.results.some((r) => !r.success) && (
                  <ul style={s.resultsErrList}>
                    {uploadResults.results
                      .filter((r) => !r.success)
                      .map((r, i) => (
                        <li key={i} style={s.resultsErrItem}>
                          <XCircle size={13} color={colors.danger} />
                          <span>{r.filename}</span>
                          <span style={s.resultsErrMsg}>{r.error}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* ── Right: preview panel ────────────────────────────── */}
          <div style={s.previewCol}>
            <div style={s.previewCard}>
              {!activeEntry ? (
                <div style={s.previewEmpty}>
                  <FileIcon size={28} />
                  <p style={s.previewEmptyText}>
                    Select a file from the list to preview it here.
                  </p>
                </div>
              ) : (
                <>
                  <div style={s.previewHeader}>
                    <span style={s.previewHeaderIcon}>
                      <KindIcon kind={activeEntry.kind} size={15} />
                    </span>
                    <span
                      style={s.previewHeaderName}
                      title={activeEntry.file.name}
                    >
                      {activeEntry.file.name}
                    </span>
                    <span style={s.previewHeaderSize}>
                      {formatBytes(activeEntry.file.size)}
                    </span>
                    <a
                      href={activeEntry.previewUrl}
                      download={activeEntry.file.name}
                      style={s.previewOpenLink}
                      title="Download / open in new tab"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  <div style={s.previewBody}>
                    {activeEntry.kind === "pdf" && (
                      <iframe
                        src={activeEntry.previewUrl}
                        title={activeEntry.file.name}
                        style={s.previewFrame}
                      />
                    )}
                    {activeEntry.kind === "image" && (
                      <div style={s.previewImageWrap}>
                        <img
                          src={activeEntry.previewUrl}
                          alt={activeEntry.file.name}
                          style={s.previewImage}
                        />
                      </div>
                    )}
                    {(activeEntry.kind === "doc" ||
                      activeEntry.kind === "sheet" ||
                      activeEntry.kind === "other") && (
                      <div style={s.previewUnsupported}>
                        <FileIcon size={36} />
                        <p style={s.previewUnsupportedTitle}>
                          No in-browser preview available for this file type
                        </p>
                        <p style={s.previewUnsupportedHint}>
                          Click the icon above to download and open it.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bdu-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function Field({ label, required, hint, colors, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{ fontSize: 12.5, fontWeight: 600, color: colors.textPrimary }}
      >
        {label}
        {required && <span style={{ color: colors.danger }}> *</span>}
        {hint && (
          <span style={{ color: colors.textTertiary, fontWeight: 400 }}>
            {" "}
            — {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

/**
 * Color tokens derived from the darkMode boolean.
 * Kung may shared `getColorScheme(darkMode)` na kayo (tulad ng ginagamit sa
 * TaskPage.jsx / ColorScheme.js), palitan na lang ito ng import mula doon
 * para iisa lang ang source of truth ng palette sa buong app:
 *
 *   import { getColorScheme } from "../components/tasks/ColorScheme";
 *   const colors = getColorScheme(darkMode);
 */
function getColors(darkMode) {
  return darkMode
    ? {
        pageBg: "#0e1116",
        cardBg: "#161a21",
        surfaceAlt: "#1b2028",
        cardBorder: "#2a2f3a",
        textPrimary: "#e6e8eb",
        textTertiary: "#8b93a1",
        accent: "#6a95f2",
        accentSoft: "#1c2740",
        success: "#3fca84",
        successSoft: "#12291f",
        danger: "#f0665f",
        dangerSoft: "#331a19",
      }
    : {
        pageBg: "#f4f5f7",
        cardBg: "#ffffff",
        surfaceAlt: "#fafbfc",
        cardBorder: "#e3e5e8",
        textPrimary: "#1c2024",
        textTertiary: "#667085",
        accent: "#2f6fed",
        accentSoft: "#eef2ff",
        success: "#1a7f4e",
        successSoft: "#ecfdf3",
        danger: "#b3261e",
        dangerSoft: "#fef3f2",
      };
}

function buildStyles(colors) {
  return {
    page: {
      minHeight: "100vh",
      background: colors.pageBg,
      color: colors.textPrimary,
      padding: "32px 20px",
      fontFamily:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      transition: "background 150ms ease, color 150ms ease",
    },
    shell: { maxWidth: 1080, margin: "0 auto" },
    header: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: 650,
      margin: 0,
      letterSpacing: "-0.01em",
    },
    subtitle: { fontSize: 13.5, color: colors.textTertiary, margin: "4px 0 0" },
    layout: {
      display: "grid",
      gridTemplateColumns: "minmax(0, 380px) 1fr",
      gap: 20,
      alignItems: "start",
    },
    leftCol: { display: "flex", flexDirection: "column", gap: 14 },
    card: {
      background: colors.cardBg,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: 12,
      padding: 18,
    },
    fieldGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    input: {
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: 8,
      padding: "8px 10px",
      fontSize: 13.5,
      color: colors.textPrimary,
      background: colors.surfaceAlt,
    },
    dropzone: {
      borderWidth: "1.5px",
      borderStyle: "dashed",
      borderColor: colors.cardBorder,
      borderRadius: 12,
      padding: "22px 14px",
      textAlign: "center",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      background: colors.cardBg,
      color: colors.textTertiary,
      transition: "border-color 120ms ease, background 120ms ease",
    },
    dropzoneActive: {
      borderColor: colors.accent,
      background: colors.accentSoft,
    },
    dropzoneText: {
      fontSize: 13,
      margin: "4px 0 0",
      color: colors.textPrimary,
    },
    dropzoneHint: { fontSize: 11.5, color: colors.textTertiary, margin: 0 },
    fileListCard: {
      background: colors.cardBg,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: 12,
      padding: 12,
    },
    fileListHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: 12,
      color: colors.textTertiary,
      marginBottom: 8,
      padding: "0 4px",
    },
    clearLink: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      background: "none",
      border: "none",
      color: colors.danger,
      fontSize: 12,
      cursor: "pointer",
      padding: 0,
    },
    fileList: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: 4,
      maxHeight: 260,
      overflowY: "auto",
    },
    fileItem: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 8px",
      borderRadius: 8,
      cursor: "pointer",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "transparent",
      fontSize: 12.5,
    },
    fileItemActive: {
      background: colors.accentSoft,
      borderColor: colors.accent,
    },
    fileItemIcon: {
      color: colors.textTertiary,
      display: "flex",
      flexShrink: 0,
    },
    fileItemName: {
      flex: 1,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    fileItemSize: { color: colors.textTertiary, fontSize: 11, flexShrink: 0 },
    fileItemRemove: {
      border: "none",
      background: "transparent",
      color: colors.textTertiary,
      cursor: "pointer",
      display: "flex",
      padding: 2,
      borderRadius: 4,
      flexShrink: 0,
    },
    errorBanner: {
      background: colors.dangerSoft,
      border: `1px solid ${colors.danger}`,
      color: colors.danger,
      fontSize: 12.5,
      padding: "9px 11px",
      borderRadius: 8,
    },
    actions: { display: "flex", justifyContent: "flex-end" },
    primaryBtn: {
      border: "none",
      background: colors.accent,
      color: "#fff",
      fontSize: 13.5,
      fontWeight: 600,
      padding: "9px 18px",
      borderRadius: 8,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 8,
      width: "100%",
      justifyContent: "center",
    },
    btnDisabled: { opacity: 0.55, cursor: "not-allowed" },
    resultsCard: {
      background: colors.cardBg,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: 12,
      padding: 14,
    },
    resultsSummary: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 12.5,
      flexWrap: "wrap",
    },
    resultsTotal: { fontWeight: 600 },
    badgeSuccess: {
      background: colors.successSoft,
      color: colors.success,
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 11.5,
      fontWeight: 600,
    },
    badgeFail: {
      background: colors.dangerSoft,
      color: colors.danger,
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 11.5,
      fontWeight: 600,
    },
    resultsErrList: {
      listStyle: "none",
      margin: "10px 0 0",
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: 6,
    },
    resultsErrItem: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontSize: 12,
    },
    resultsErrMsg: { color: colors.textTertiary },
    previewCol: { minHeight: 560 },
    previewCard: {
      background: colors.cardBg,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: 12,
      height: "100%",
      minHeight: 560,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },
    previewEmpty: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      color: colors.textTertiary,
      padding: 40,
      textAlign: "center",
    },
    previewEmptyText: { fontSize: 13, margin: 0, maxWidth: 260 },
    previewHeader: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "12px 14px",
      borderBottom: `1px solid ${colors.cardBorder}`,
      fontSize: 12.5,
    },
    previewHeaderIcon: {
      color: colors.textTertiary,
      display: "flex",
      flexShrink: 0,
    },
    previewHeaderName: {
      flex: 1,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      fontWeight: 600,
    },
    previewHeaderSize: { color: colors.textTertiary, flexShrink: 0 },
    previewOpenLink: {
      color: colors.accent,
      display: "flex",
      flexShrink: 0,
      textDecoration: "none",
    },
    previewBody: { flex: 1, display: "flex", background: colors.surfaceAlt },
    previewFrame: {
      width: "100%",
      height: "100%",
      minHeight: 500,
      border: "none",
    },
    previewImageWrap: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    previewImage: {
      maxWidth: "100%",
      maxHeight: "520px",
      objectFit: "contain",
      borderRadius: 8,
    },
    previewUnsupported: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      color: colors.textTertiary,
      padding: 40,
      textAlign: "center",
    },
    previewUnsupportedTitle: {
      fontSize: 13,
      fontWeight: 600,
      color: colors.textPrimary,
      margin: 0,
    },
    previewUnsupportedHint: { fontSize: 12, margin: 0 },
  };
}

export default BulkDocumentUploadPage;
