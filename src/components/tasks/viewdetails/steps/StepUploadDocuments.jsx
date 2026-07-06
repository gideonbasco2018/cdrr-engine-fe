// steps/StepUploadDocuments.jsx
import { useState, useRef, useEffect, useMemo } from "react";
// ⚠️ Adjust this relative path to match how other files in this folder
// (e.g. Step4ActionForm.jsx) import from src/api/ — copy that same depth.
import {
  uploadApplicationDocumentsBatch,
  getApplicationDocumentsByDtn,
} from "../../../../api/application-documents";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = {
  "application/pdf": "pdf",
  "image/jpeg": "image",
  "image/png": "image",
};

const CATEGORY_OPTIONS = [
  "GENERAL",
  "PRODUCT FILE",
  "DOCUMENTARY REQUIREMENTS",
  "WORKSHEET",
];
const ACCEPT_ATTR = ".pdf,.jpg,.jpeg,.png";

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function kindOf(file) {
  return ACCEPTED_TYPES[file.type] || "other";
}

function kindOfMime(mimeType) {
  return ACCEPTED_TYPES[mimeType] || "other";
}

function makeStagedDoc(file) {
  return {
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    kind: kindOf(file),
    previewUrl: URL.createObjectURL(file),
  };
}

/** Google Drive inline preview URL for a given file ID. */
function drivePreviewUrl(driveFileId) {
  return `https://drive.google.com/file/d/${driveFileId}/preview`;
}

export function StepUploadDocuments({ record, colors }) {
  // ── Existing documents already uploaded for this DTN ──
  const [existingDocs, setExistingDocs] = useState([]);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState(() => new Set());

  // ── New files staged for upload ──
  const [stagedDocs, setStagedDocs] = useState([]);
  const [docCategory, setDocCategory] = useState("GENERAL");
  const [docError, setDocError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const [activeItem, setActiveItem] = useState(null);
  const loadExisting = async () => {
    setIsLoadingExisting(true);
    setFetchError("");
    try {
      const result = await getApplicationDocumentsByDtn(record.dtn);
      const data = result.data || [];
      setExistingDocs(data);
      if (data.length > 0) {
        setActiveItem({ type: "existing", doc: data[0] });
      }
    } catch (err) {
      setFetchError(err?.message || "Failed to load existing documents.");
    } finally {
      setIsLoadingExisting(false);
    }
  };

  useEffect(() => {
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.dtn]);

  useEffect(() => {
    return () => {
      stagedDocs.forEach((d) => URL.revokeObjectURL(d.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group existing docs by their Google Drive folder
  const folders = useMemo(() => {
    const groups = new Map();
    for (const doc of existingDocs) {
      const key = doc.drive_folder_id || "no-folder";
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: doc.doc_category?.trim() || "General",
          items: [],
        });
      }
      groups.get(key).items.push(doc);
    }
    return Array.from(groups.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [existingDocs]);

  const toggleFolder = (key) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const addFiles = (fileList) => {
    setDocError("");
    const incoming = [];
    for (const file of Array.from(fileList)) {
      if (!(file.type in ACCEPTED_TYPES)) {
        setDocError(`"${file.name}" is not a supported file type.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setDocError(`"${file.name}" exceeds the 5MB limit.`);
        continue;
      }
      incoming.push(makeStagedDoc(file));
    }
    if (incoming.length) {
      setStagedDocs((prev) => [...prev, ...incoming]);
      setActiveItem({ type: "staged", doc: incoming[0] });
    }
  };

  const removeStagedDoc = (id) => {
    setStagedDocs((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((d) => d.id !== id);
    });
    setActiveItem((prev) =>
      prev?.type === "staged" && prev.doc.id === id ? null : prev,
    );
  };

  const handleInputChange = (e) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (stagedDocs.length === 0) return;
    setIsUploading(true);
    setProgress(0);
    setDocError("");
    try {
      await uploadApplicationDocumentsBatch(
        {
          dbEntryType: record.entryType ?? "",
          dbDtn: record.dtn,
          docCategory: docCategory.trim() || undefined,
          files: stagedDocs.map((d) => d.file),
        },
        (pct) => setProgress(pct),
      );
      // Clear staged files and refresh the "already uploaded" list so the
      // newly uploaded files show up in the same browse view.
      stagedDocs.forEach((d) => URL.revokeObjectURL(d.previewUrl));
      setStagedDocs([]);
      await loadExisting();
    } catch (err) {
      setDocError(err?.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const cardBorder = colors.cardBorder;
  const textPrimary = colors.textPrimary;
  const textTertiary = colors.textTertiary;

  const rowStyle = (isActive) => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 10px",
    borderRadius: 7,
    border: `1px solid ${isActive ? "#1976d2" : cardBorder}`,
    background: isActive
      ? "rgba(25,118,210,0.08)"
      : (colors.inputBg ?? "transparent"),
    fontSize: 12,
    cursor: "pointer",
  });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 320px) 1fr",
        gap: "1rem",
        alignItems: "start",
      }}
    >
      {/* ── Left: existing docs (grouped by folder) + add-new dropzone ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            border: `1px solid ${cardBorder}`,
            borderRadius: 10,
            padding: 10,
          }}
        >
          {isLoadingExisting ? (
            <div style={{ fontSize: 12, color: textTertiary, padding: 6 }}>
              Loading documents…
            </div>
          ) : fetchError ? (
            <div style={{ fontSize: 12, color: "#ef4444", padding: 6 }}>
              {fetchError}
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: 11.5,
                  color: textTertiary,
                  marginBottom: 8,
                  padding: "0 2px",
                }}
              >
                {existingDocs.length} file(s) found for DTN{" "}
                <strong style={{ color: textPrimary }}>{record.dtn}</strong>
              </div>
              {existingDocs.length === 0 ? (
                <p style={{ fontSize: 12, color: textTertiary, margin: 0 }}>
                  No documents have been uploaded for this DTN yet.
                </p>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  {folders.map((folder) => {
                    const isCollapsed = collapsedFolders.has(folder.key);
                    return (
                      <div key={folder.key}>
                        <button
                          type="button"
                          onClick={() => toggleFolder(folder.key)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            width: "100%",
                            padding: "7px 6px",
                            background: "transparent",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: textPrimary,
                            textAlign: "left",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              transform: isCollapsed
                                ? "rotate(0deg)"
                                : "rotate(90deg)",
                              transition: "transform 0.12s ease",
                            }}
                          >
                            ▶
                          </span>
                          📁 {folder.label}
                          <span
                            style={{
                              marginLeft: "auto",
                              fontSize: 10.5,
                              fontWeight: 600,
                              color: textTertiary,
                              background: colors.inputBg ?? "transparent",
                              padding: "1px 6px",
                              borderRadius: 999,
                            }}
                          >
                            {folder.items.length}
                          </span>
                        </button>

                        {!isCollapsed && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                              marginLeft: 19,
                              marginTop: 2,
                              marginBottom: 4,
                            }}
                          >
                            {folder.items.map((doc) => {
                              const isActive =
                                activeItem?.type === "existing" &&
                                activeItem.doc.id === doc.id;
                              return (
                                <div
                                  key={doc.id}
                                  onClick={() =>
                                    setActiveItem({ type: "existing", doc })
                                  }
                                  style={rowStyle(isActive)}
                                >
                                  <span
                                    style={{
                                      flex: 1,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      color: textPrimary,
                                    }}
                                    title={doc.original_filename}
                                  >
                                    {doc.original_filename}
                                  </span>
                                  <span
                                    style={{
                                      color: textTertiary,
                                      flexShrink: 0,
                                      fontSize: 11,
                                    }}
                                  >
                                    {formatBytes(doc.file_size_bytes)}
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
            </>
          )}
        </div>

        {/* ── Add new files ── */}
        <div
          style={{
            border: `1px solid ${cardBorder}`,
            borderRadius: 10,
            padding: 10,
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: textTertiary,
              marginBottom: 8,
              padding: "0 2px",
            }}
          >
            Add new files
          </div>

          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: textPrimary,
                display: "block",
                marginBottom: 4,
              }}
            >
              Category (Folder)
            </label>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: `1px solid ${cardBorder}`,
                borderRadius: 8,
                padding: "0 10px",
                background: colors.inputBg ?? "transparent",
              }}
            >
              <span style={{ flexShrink: 0 }}>📁</span>
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  padding: "8px 0",
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13,
                  color: textPrimary,
                  appearance: "none",
                  cursor: "pointer",
                }}
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `1.5px dashed ${isDragging ? "#1976d2" : cardBorder}`,
              borderRadius: 10,
              padding: 16,
              textAlign: "center",
              cursor: "pointer",
              transition: "border-color 0.15s",
            }}
          >
            <div style={{ fontSize: 20 }}>⬆️</div>
            <p
              style={{
                fontSize: 12.5,
                color: colors.textSecondary,
                margin: "5px 0 0",
              }}
            >
              Drop file here or click to upload
            </p>
            <small style={{ fontSize: 11, color: textTertiary }}>
              PDF, JPG, PNG max 5 MB per file
            </small>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              onChange={handleInputChange}
              onClick={(e) => e.stopPropagation()}
              style={{ display: "none" }}
            />
          </div>

          {docError && (
            <div
              style={{
                marginTop: 8,
                padding: "7px 10px",
                borderRadius: 7,
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#ef4444",
                fontSize: 11.5,
              }}
            >
              {docError}
            </div>
          )}

          {stagedDocs.length > 0 && (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {stagedDocs.map((doc) => {
                const isActive =
                  activeItem?.type === "staged" && activeItem.doc.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setActiveItem({ type: "staged", doc })}
                    style={{
                      ...rowStyle(isActive),
                      opacity: isUploading ? 0.55 : 1,
                      pointerEvents: isUploading ? "none" : "auto",
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: textPrimary,
                      }}
                      title={doc.file.name}
                    >
                      {doc.file.name}
                    </span>
                    <span
                      style={{
                        color: textTertiary,
                        flexShrink: 0,
                        fontSize: 11,
                      }}
                    >
                      {formatBytes(doc.file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStagedDoc(doc.id);
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                      aria-label={`Remove ${doc.file.name}`}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}

              {isUploading ? (
                <div style={{ marginTop: 2 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: textPrimary,
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        border: `2px solid ${cardBorder}`,
                        borderTopColor: "#1976d2",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "docupload-spin 0.6s linear infinite",
                      }}
                    />
                    Uploading {stagedDocs.length} file(s)… {progress}%
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 6,
                      borderRadius: 999,
                      background: cardBorder,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: "100%",
                        background: "#1976d2",
                        transition: "width 0.2s ease",
                      }}
                    />
                  </div>
                  <style>{`@keyframes docupload-spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                <button
                  onClick={handleUpload}
                  style={{
                    marginTop: 2,
                    padding: "8px 16px",
                    background: "linear-gradient(135deg, #2196F3, #1976D2)",
                    border: "none",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Upload {stagedDocs.length} file(s)
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: preview panel ── */}
      <div
        style={{
          border: `1px solid ${cardBorder}`,
          borderRadius: 10,
          minHeight: 800,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {!activeItem ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: textTertiary,
              fontSize: 13,
              padding: 40,
              textAlign: "center",
            }}
          >
            Select a file from the list to preview it here.
          </div>
        ) : activeItem.type === "existing" ? (
          <>
            <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
              <iframe
                src={drivePreviewUrl(activeItem.doc.drive_file_id)}
                title={activeItem.doc.original_filename}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  minHeight: 800,
                }}
                allow="autoplay"
              />
            </div>
            <div
              style={{
                padding: "8px 14px",
                borderTop: `1px solid ${cardBorder}`,
                fontSize: 11.5,
                color: textTertiary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Category:{" "}
              <strong style={{ color: textPrimary }}>
                {activeItem.doc.doc_category || "—"}
              </strong>{" "}
              · Entry Type:{" "}
              <strong style={{ color: textPrimary }}>
                {activeItem.doc.db_entry_type || "—"}
              </strong>
              {activeItem.doc.uploaded_by_user_name &&
                ` · Uploaded by: ${activeItem.doc.uploaded_by_user_name}`}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
            {activeItem.doc.kind === "pdf" && (
              <iframe
                src={activeItem.doc.previewUrl}
                title={activeItem.doc.file.name}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  minHeight: 800,
                }}
              />
            )}
            {activeItem.doc.kind === "image" && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 20,
                }}
              >
                <img
                  src={activeItem.doc.previewUrl}
                  alt={activeItem.doc.file.name}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    borderRadius: 6,
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
