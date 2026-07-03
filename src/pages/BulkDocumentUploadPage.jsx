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
  Search,
  FolderOpen,
  ChevronRight,
  Plus,
} from "lucide-react";

import {
  uploadApplicationDocumentsBatch,
  getApplicationDocumentsByDtn,
} from "../api/application-documents";

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

/** Best-effort kind detection for already-uploaded Drive documents (by mime_type). */
function kindOfMime(mimeType) {
  return ACCEPTED_TYPES[mimeType] || "other";
}

function KindIcon({ kind, size = 16 }) {
  if (kind === "pdf") return <FileText size={size} />;
  if (kind === "image") return <ImageIcon size={size} />;
  return <FileIcon size={size} />;
}

/** Google Drive inline preview URL for a given file ID. */
function drivePreviewUrl(driveFileId) {
  return `https://drive.google.com/file/d/${driveFileId}/preview`;
}

/**
 * BulkDocumentUploadPage
 *
 * Sumusunod sa parehong pattern ng TaskPage.jsx — `darkMode` ay ipinapasa
 * bilang prop mula sa parent/layout (hindi nagmamay-ari ng sarili nitong
 * theme toggle). Gamitin ang existing global dark mode switch niyo sa
 * top nav para makontrol ito.
 *
 * Dalawang tabs:
 *  - "Upload"        — existing bulk upload workflow. Suporta na ngayon
 *                        sa MULTIPLE category "groups" sa isang session
 *                        (hal. isang group para sa "Product File", isa pa
 *                        para sa "Document Requirements") — isang click
 *                        lang ng "Upload" button para maipadala lahat.
 *  - "Browse by DTN"  — search & preview already-uploaded documents by DTN,
 *                        grouped by their Google Drive folder (doc_category)
 */
function BulkDocumentUploadPage({ darkMode }) {
  const colors = getColors(darkMode);
  const s = buildStyles(colors);

  const [activeTab, setActiveTab] = useState("upload"); // "upload" | "browse"

  return (
    <div style={s.page} className="bdu-page">
      <div style={s.shell}>
        <header style={s.header}>
          <div>
            <h1 style={s.title} className="bdu-title">
              Document Manager
            </h1>
            <p style={s.subtitle}>
              Upload supporting documents or browse previously uploaded files by
              DTN.
            </p>
          </div>
        </header>

        <div style={s.tabBar} className="bdu-tabBar">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className="bdu-tabBtn"
            style={{
              ...s.tabBtn,
              ...(activeTab === "upload" ? s.tabBtnActive : {}),
            }}
          >
            <Upload size={14} /> Upload
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("browse")}
            className="bdu-tabBtn"
            style={{
              ...s.tabBtn,
              ...(activeTab === "browse" ? s.tabBtnActive : {}),
            }}
          >
            <FolderOpen size={14} /> Browse by DTN
          </button>
        </div>

        {activeTab === "upload" ? (
          <UploadTab colors={colors} s={s} />
        ) : (
          <BrowseByDtnTab colors={colors} s={s} />
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }

        @keyframes bdu-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        html, body {
          overflow-x: hidden;
        }

        .bdu-page {
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }

        .bdu-layout {
          display: grid;
          grid-template-columns: minmax(0, 340px) 1fr;
          gap: 16px;
          align-items: start;
          width: 100%;
          max-width: 100%;
        }
        .bdu-layout > * {
          min-width: 0;
          max-width: 100%;
        }
        .bdu-leftCol {
          overscroll-behavior: contain;
          min-width: 0;
        }
        .bdu-fieldGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          min-width: 0;
        }

        /* Any input/select/textarea inside the page must never force overflow */
        .bdu-page input,
        .bdu-page select,
        .bdu-page textarea {
          min-width: 0;
          max-width: 100%;
        }

        /* Tablet */
        @media (max-width: 860px) {
          .bdu-layout {
            grid-template-columns: 1fr;
          }
          .bdu-leftCol {
            max-height: none !important;
            overflow: visible !important;
            padding-right: 0 !important;
          }
          .bdu-previewCol {
            position: static !important;
            max-height: none !important;
            min-height: 420px !important;
          }
        }

        /* Tablet+mobile: shrink the fixed preview heights so it doesn't dominate the stacked layout */
        @media (max-width: 860px) {
          .bdu-previewCard {
            min-height: 420px !important;
          }
          .bdu-previewFrame {
            min-height: 380px !important;
          }
        }

        /* Mobile */
        @media (max-width: 520px) {
          .bdu-page {
            padding: 14px 8px !important;
          }
          .bdu-card {
            padding: 10px !important;
          }
          .bdu-fieldGrid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .bdu-title {
            font-size: 17px !important;
          }
          .bdu-tabBar {
            gap: 2px !important;
          }
          .bdu-tabBtn {
            padding: 8px 10px !important;
            font-size: 12.5px !important;
          }
          .bdu-dropzone {
            padding: 14px 8px !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ================================================================== */
/*  Tab 1 — Upload                                                     */
/* ================================================================== */

/** Bagong empty group — bawat group ay may sariling category + file list. */
function makeGroup() {
  return {
    groupId: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    docCategory: "",
    entries: [], // { id, file, kind, previewUrl }
  };
}

function UploadTab({ colors, s }) {
  const [dbEntryType, setDbEntryType] = useState("");
  const [dbDtn, setDbDtn] = useState("");
  const [existingCategories, setExistingCategories] = useState([]);

  // Multiple category "groups" — bawat isa may sariling docCategory + entries.
  const [groups, setGroups] = useState(() => [makeGroup()]);
  const [activeEntryId, setActiveEntryId] = useState(null);

  const [formError, setFormError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);

  const activeEntry = useMemo(() => {
    for (const g of groups) {
      const found = g.entries.find((e) => e.id === activeEntryId);
      if (found) return found;
    }
    return null;
  }, [groups, activeEntryId]);

  const totalFiles = useMemo(
    () => groups.reduce((sum, g) => sum + g.entries.length, 0),
    [groups],
  );

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      groups.forEach((g) =>
        g.entries.forEach((e) => URL.revokeObjectURL(e.previewUrl)),
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Look up existing folders (doc_category values) already used for this
  // DTN, so the category field can suggest them instead of forcing the
  // person to remember/retype an exact folder name. Debounced so it
  // doesn't fire on every keystroke.
  useEffect(() => {
    const trimmed = dbDtn.trim();
    if (!trimmed) {
      setExistingCategories([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await getApplicationDocumentsByDtn(trimmed);
        const cats = Array.from(
          new Set(
            (result.data || [])
              .map((d) => d.doc_category?.trim())
              .filter(Boolean),
          ),
        ).sort();
        setExistingCategories(cats);
      } catch {
        // Silent — this is just a convenience lookup, not required for upload.
        setExistingCategories([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [dbDtn]);

  const addFilesToGroup = useCallback((groupId, fileList) => {
    const incoming = Array.from(fileList).map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      kind: kindOf(file),
      previewUrl: URL.createObjectURL(file),
    }));
    setGroups((prev) =>
      prev.map((g) =>
        g.groupId === groupId
          ? { ...g, entries: [...g.entries, ...incoming] }
          : g,
      ),
    );
    setActiveEntryId((prev) => prev ?? incoming[0]?.id ?? null);
    setUploadResults(null);
  }, []);

  const removeEntry = (groupId, entryId) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.groupId !== groupId) return g;
        const target = g.entries.find((e) => e.id === entryId);
        if (target) URL.revokeObjectURL(target.previewUrl);
        return { ...g, entries: g.entries.filter((e) => e.id !== entryId) };
      }),
    );
    setActiveEntryId((prev) => (prev === entryId ? null : prev));
  };

  const setGroupCategory = (groupId, value) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.groupId === groupId ? { ...g, docCategory: value } : g,
      ),
    );
  };

  const addGroup = () => setGroups((prev) => [...prev, makeGroup()]);

  const removeGroup = (groupId) => {
    setGroups((prev) => {
      const target = prev.find((g) => g.groupId === groupId);
      if (target)
        target.entries.forEach((e) => URL.revokeObjectURL(e.previewUrl));
      const next = prev.filter((g) => g.groupId !== groupId);
      return next.length ? next : [makeGroup()]; // laging may at least 1 group
    });
  };

  const clearAll = () => {
    groups.forEach((g) =>
      g.entries.forEach((e) => URL.revokeObjectURL(e.previewUrl)),
    );
    setGroups([makeGroup()]);
    setActiveEntryId(null);
    setDbEntryType("");
    setDbDtn("");
    setExistingCategories([]);
    setFormError("");
    setUploadResults(null);
    setUploadProgress(0);
  };

  const validate = () => {
    if (!dbEntryType.trim()) return "Entry Type is required.";
    if (!dbDtn.trim()) return "DTN is required.";
    if (totalFiles === 0) return "Add at least one file.";
    for (const g of groups) {
      for (const { file } of g.entries) {
        if (!(file.type in ACCEPTED_TYPES))
          return `"${file.name}" is not a supported file type.`;
        if (file.size > MAX_FILE_SIZE)
          return `"${file.name}" exceeds the 5MB limit.`;
      }
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

    const groupsToUpload = groups.filter((g) => g.entries.length > 0);
    setIsUploading(true);
    setUploadProgress(0);

    const aggregated = { total: 0, succeeded: 0, failed: 0, results: [] };

    try {
      for (let i = 0; i < groupsToUpload.length; i++) {
        const g = groupsToUpload[i];
        // eslint-disable-next-line no-await-in-loop
        const result = await uploadApplicationDocumentsBatch(
          {
            dbEntryType,
            dbDtn,
            docCategory: g.docCategory.trim() || undefined,
            files: g.entries.map((e) => e.file),
          },
          (pct) => {
            const overall = Math.round(
              ((i + pct / 100) / groupsToUpload.length) * 100,
            );
            setUploadProgress(overall);
          },
        );
        aggregated.total += result.total;
        aggregated.succeeded += result.succeeded;
        aggregated.failed += result.failed;
        aggregated.results.push(...result.results);
      }
      setUploadResults(aggregated);
      // Files stay in the list so the person can still review previews after upload
    } catch (err) {
      setFormError(err.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={s.layout} className="bdu-layout">
      {/* ── Left: form + category groups (each with its own dropzone/file list) ── */}
      <div style={s.leftCol} className="bdu-leftCol">
        <div style={s.card} className="bdu-card">
          <div style={s.fieldGrid} className="bdu-fieldGrid">
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
          </div>
        </div>

        <div style={s.groupsHeaderRow}>
          <span style={s.groupsHeaderLabel}>Files</span>
          <div style={{ display: "flex", gap: 8 }}>
            {totalFiles > 0 && (
              <button type="button" onClick={clearAll} style={s.clearLink}>
                <Trash2 size={13} /> Clear all
              </button>
            )}
            <button type="button" onClick={addGroup} style={s.addGroupBtn}>
              <Plus size={14} /> Add category
            </button>
          </div>
        </div>

        {groups.map((group, idx) => (
          <UploadGroupBlock
            key={group.groupId}
            group={group}
            index={idx}
            isFirst={idx === 0}
            canRemove={groups.length > 1}
            existingCategories={existingCategories}
            colors={colors}
            s={s}
            onCategoryChange={(val) => setGroupCategory(group.groupId, val)}
            onAddFiles={(fileList) => addFilesToGroup(group.groupId, fileList)}
            onRemoveEntry={(entryId) => removeEntry(group.groupId, entryId)}
            onRemoveGroup={() => removeGroup(group.groupId)}
            activeEntryId={activeEntryId}
            onSelectEntry={setActiveEntryId}
            uploadResults={uploadResults}
          />
        ))}

        {formError && <div style={s.errorBanner}>{formError}</div>}

        <div style={s.actions}>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || totalFiles === 0}
            style={{
              ...s.primaryBtn,
              ...(isUploading || totalFiles === 0 ? s.btnDisabled : {}),
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
              `Upload${totalFiles ? ` (${totalFiles})` : ""}`
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
                <span style={s.badgeFail}>{uploadResults.failed} failed</span>
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
      <div style={s.previewCol} className="bdu-previewCol">
        <div style={s.previewCard} className="bdu-previewCard">
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
                <span style={s.previewHeaderName} title={activeEntry.file.name}>
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
                    className="bdu-previewFrame"
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
  );
}

/**
 * UploadGroupBlock
 *
 * Isang "category group" — may sariling Category (Folder) field, dropzone,
 * at file list. Pwedeng magdagdag ng maraming group sa isang session
 * (hal. Group 1 = "Product File", Group 2 = "Document Requirements"),
 * tapos isang "Upload" button na lang sa dulo ng UploadTab ang mag-uupload
 * ng lahat — isang batch API call per group, parehong DTN/Entry Type.
 */
function UploadGroupBlock({
  group,
  index,
  isFirst,
  canRemove,
  existingCategories,
  colors,
  s,
  onCategoryChange,
  onAddFiles,
  onRemoveEntry,
  onRemoveGroup,
  activeEntryId,
  onSelectEntry,
  uploadResults,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const datalistId = `doc-category-options-${group.groupId}`;

  const handleFileInputChange = (e) => {
    if (e.target.files?.length) onAddFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) onAddFiles(e.dataTransfer.files);
  };

  return (
    <div style={{ ...s.groupBlock, ...(isFirst ? s.groupBlockFirst : {}) }}>
      <div style={s.groupBlockHeader}>
        <span style={s.groupBlockTitle}>
          Group {index + 1}
          {group.docCategory.trim() ? ` — ${group.docCategory.trim()}` : ""}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemoveGroup}
            style={s.groupRemoveBtn}
          >
            <Trash2 size={13} /> Remove
          </button>
        )}
      </div>

      <div style={s.card} className="bdu-card">
        <Field
          label="Category (Folder)"
          hint="select existing or type a new one"
          colors={colors}
        >
          <div style={s.folderPickerRow}>
            <FolderOpen
              size={15}
              style={{ flexShrink: 0, color: colors.textTertiary }}
            />
            <input
              type="text"
              list={datalistId}
              value={group.docCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              placeholder="e.g. Product File (leave blank for General)"
              style={s.folderInput}
            />
          </div>
          <datalist id={datalistId}>
            {existingCategories.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
          {existingCategories.length > 0 && (
            <div style={s.folderChipsRow}>
              {existingCategories.map((cat) => {
                const isActive = group.docCategory.trim() === cat;
                return (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => onCategoryChange(cat)}
                    style={{
                      ...s.folderChip,
                      ...(isActive ? s.folderChipActive : {}),
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}
        </Field>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="bdu-dropzone"
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

      {group.entries.length > 0 && (
        <div style={s.fileListCard}>
          <div style={s.fileListHeader}>
            <span>{group.entries.length} file(s)</span>
          </div>
          <ul style={s.fileList}>
            {group.entries.map((entry) => {
              const isActive = entry.id === activeEntryId;
              const result = uploadResults?.results?.find(
                (r) => r.filename === entry.file.name,
              );
              return (
                <li
                  key={entry.id}
                  onClick={() => onSelectEntry(entry.id)}
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
                      onRemoveEntry(entry.id);
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
    </div>
  );
}

/* ================================================================== */
/*  Tab 2 — Browse by DTN (grouped by Google Drive folder)             */
/* ================================================================== */
function BrowseByDtnTab({ colors, s }) {
  const [dtnInput, setDtnInput] = useState("");
  const [searchedDtn, setSearchedDtn] = useState("");
  const [docs, setDocs] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState(() => new Set());

  const activeDoc = useMemo(
    () => docs.find((d) => d.id === activeDocId) || null,
    [docs, activeDocId],
  );

  // Group documents by their Google Drive folder (drive_folder_id).
  // Falls back to doc_category / "General" as the display label when
  // multiple documents share the same physical Drive folder.
  const folders = useMemo(() => {
    const groups = new Map();
    for (const doc of docs) {
      const key = doc.drive_folder_id || "no-folder";
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: doc.doc_category?.trim() || "General",
          entryType: doc.db_entry_type || "",
          items: [],
        });
      }
      groups.get(key).items.push(doc);
    }
    return Array.from(groups.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [docs]);

  const toggleFolder = (key) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSearch = async () => {
    const trimmed = dtnInput.trim();
    if (!trimmed) {
      setSearchError("Enter a DTN to search.");
      return;
    }
    setSearchError("");
    setIsSearching(true);
    setHasSearched(true);
    try {
      const result = await getApplicationDocumentsByDtn(trimmed);
      const data = result.data || [];
      setDocs(data);
      setActiveDocId(data[0]?.id ?? null);
      setSearchedDtn(trimmed);
      setCollapsedFolders(new Set());
    } catch (err) {
      setSearchError(err.message || "Failed to fetch documents.");
      setDocs([]);
      setActiveDocId(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div style={s.layout} className="bdu-layout">
      {/* ── Left: search + folder/file tree ─────────────────── */}
      <div style={s.leftCol} className="bdu-leftCol">
        <div style={s.card} className="bdu-card">
          <Field label="DTN" required colors={colors}>
            <div style={s.searchRow}>
              <input
                type="text"
                value={dtnInput}
                onChange={(e) => setDtnInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. 20260702095509"
                style={{ ...s.input, flex: 1, minWidth: 0 }}
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={isSearching}
                style={{
                  ...s.searchBtn,
                  ...(isSearching ? s.btnDisabled : {}),
                }}
              >
                {isSearching ? (
                  <Loader2
                    size={14}
                    style={{ animation: "bdu-spin 1s linear infinite" }}
                  />
                ) : (
                  <Search size={14} />
                )}
              </button>
            </div>
          </Field>
        </div>

        {searchError && <div style={s.errorBanner}>{searchError}</div>}

        {hasSearched && !searchError && (
          <div style={s.fileListCard}>
            <div style={s.fileListHeader}>
              <span>
                {docs.length} file(s) found for DTN{" "}
                <strong>{searchedDtn}</strong>
              </span>
            </div>
            {docs.length === 0 ? (
              <p style={s.noResultsText}>
                No documents have been uploaded for this DTN yet.
              </p>
            ) : (
              <div style={s.folderTree}>
                {folders.map((folder) => {
                  const isCollapsed = collapsedFolders.has(folder.key);
                  return (
                    <div key={folder.key} style={s.folderGroup}>
                      <button
                        type="button"
                        onClick={() => toggleFolder(folder.key)}
                        style={s.folderHeader}
                      >
                        <ChevronRight
                          size={13}
                          style={{
                            transform: isCollapsed
                              ? "rotate(0deg)"
                              : "rotate(90deg)",
                            transition: "transform 120ms ease",
                            flexShrink: 0,
                          }}
                        />
                        <FolderOpen size={14} style={{ flexShrink: 0 }} />
                        <span style={s.folderLabel} title={folder.label}>
                          {folder.label}
                        </span>
                        <span style={s.folderCount}>{folder.items.length}</span>
                      </button>

                      {!isCollapsed && (
                        <ul style={s.fileList}>
                          {folder.items.map((doc) => {
                            const isActive = doc.id === activeDocId;
                            const kind = kindOfMime(doc.mime_type);
                            return (
                              <li
                                key={doc.id}
                                onClick={() => setActiveDocId(doc.id)}
                                style={{
                                  ...s.fileItem,
                                  ...s.fileItemNested,
                                  ...(isActive ? s.fileItemActive : {}),
                                }}
                              >
                                <span style={s.fileItemIcon}>
                                  <KindIcon kind={kind} />
                                </span>
                                <span
                                  style={s.fileItemName}
                                  title={doc.original_filename}
                                >
                                  {doc.original_filename}
                                </span>
                                <span style={s.fileItemSize}>
                                  {formatBytes(doc.file_size_bytes)}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right: preview panel ────────────────────────────── */}
      <div style={s.previewCol} className="bdu-previewCol">
        <div style={s.previewCard} className="bdu-previewCard">
          {!activeDoc ? (
            <div style={s.previewEmpty}>
              <FolderOpen size={28} />
              <p style={s.previewEmptyText}>
                Search a DTN and select a file from the list to preview it here.
              </p>
            </div>
          ) : (
            <>
              <div style={s.previewHeader}>
                <span style={s.previewHeaderIcon}>
                  <KindIcon kind={kindOfMime(activeDoc.mime_type)} size={15} />
                </span>
                <span
                  style={s.previewHeaderName}
                  title={activeDoc.original_filename}
                >
                  {activeDoc.original_filename}
                </span>
                <span style={s.previewHeaderSize}>
                  {formatBytes(activeDoc.file_size_bytes)}
                </span>
                <a
                  href={activeDoc.drive_file_url}
                  target="_blank"
                  rel="noreferrer"
                  style={s.previewOpenLink}
                  title="Open in Google Drive"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              <div style={s.previewBody}>
                <iframe
                  src={drivePreviewUrl(activeDoc.drive_file_id)}
                  title={activeDoc.original_filename}
                  style={s.previewFrame}
                  className="bdu-previewFrame"
                  allow="autoplay"
                />
              </div>
              {activeDoc.doc_category && (
                <div style={s.previewFooterMeta}>
                  Category: <strong>{activeDoc.doc_category}</strong> · Entry
                  Type: <strong>{activeDoc.db_entry_type}</strong>
                  {activeDoc.uploaded_by_user_name &&
                    ` · Uploaded by: ${activeDoc.uploaded_by_user_name}`}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, hint, colors, children }) {
  return (
    <label
      style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}
    >
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
        greyBg: "#262b34",
        greyBgHover: "#2d323c",
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
        greyBg: "#f1f2f4",
        greyBgHover: "#e9ebee",
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
      width: "100%",
      maxWidth: "100vw",
      boxSizing: "border-box",
      overflowX: "hidden",
      background: colors.pageBg,
      color: colors.textPrimary,
      padding: "20px 16px",
      fontFamily:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      transition: "background 150ms ease, color 150ms ease",
    },
    shell: {
      maxWidth: 1080,
      width: "100%",
      margin: "0 auto",
      boxSizing: "border-box",
    },
    header: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    title: {
      fontSize: 19,
      fontWeight: 650,
      margin: 0,
      letterSpacing: "-0.01em",
    },
    subtitle: { fontSize: 13, color: colors.textTertiary, margin: "3px 0 0" },

    /* ── Tabs ── */
    tabBar: {
      display: "flex",
      gap: 4,
      marginBottom: 12,
      borderBottom: `1px solid ${colors.cardBorder}`,
    },
    tabBtn: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "9px 16px",
      fontSize: 13,
      fontWeight: 600,
      color: colors.textTertiary,
      background: "transparent",
      border: "none",
      borderBottom: "2px solid transparent",
      cursor: "pointer",
      transition: "color 120ms ease, border-color 120ms ease",
    },
    tabBtnActive: {
      color: colors.accent,
      borderBottomColor: colors.accent,
    },

    layout: {
      display: "grid",
      gridTemplateColumns: "minmax(0, 340px) 1fr",
      gap: 16,
      alignItems: "start",
      width: "100%",
      maxWidth: "100%",
    },
    leftCol: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      minWidth: 0,
      maxHeight: "calc(100vh - 170px)",
      overflowY: "auto",
      overflowX: "hidden",
      paddingRight: 6,
      scrollbarGutter: "stable",
    },
    card: {
      background: colors.cardBg,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: 12,
      padding: 12,
      minWidth: 0,
      boxSizing: "border-box",
    },
    fieldGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      minWidth: 0,
    },
    input: {
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: 8,
      padding: "8px 10px",
      fontSize: 13.5,
      color: colors.textPrimary,
      background: colors.surfaceAlt,
      width: "100%",
      minWidth: 0,
      boxSizing: "border-box",
    },

    /* ── Category groups (Upload tab) ── */
    groupsHeaderRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "2px 2px 0",
    },
    groupsHeaderLabel: {
      fontSize: 12.5,
      fontWeight: 600,
      color: colors.textTertiary,
    },
    addGroupBtn: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      fontSize: 12,
      fontWeight: 600,
      color: colors.accent,
      background: colors.accentSoft,
      border: `1px solid ${colors.accent}`,
      borderRadius: 999,
      padding: "5px 12px",
      cursor: "pointer",
    },
    groupBlock: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      paddingTop: 10,
      marginTop: 2,
      borderTop: `1px dashed ${colors.cardBorder}`,
      minWidth: 0,
    },
    groupBlockFirst: {
      paddingTop: 0,
      marginTop: 0,
      borderTop: "none",
    },
    groupBlockHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 2px",
      gap: 8,
    },
    groupBlockTitle: {
      fontSize: 12,
      fontWeight: 700,
      color: colors.textPrimary,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      minWidth: 0,
    },
    groupRemoveBtn: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      background: "none",
      border: "none",
      color: colors.danger,
      fontSize: 11.5,
      cursor: "pointer",
      padding: 0,
      flexShrink: 0,
    },

    /* ── Category / folder picker (per group) ── */
    folderPickerRow: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: 8,
      padding: "0 10px",
      background: colors.greyBg,
      width: "100%",
      minWidth: 0,
      boxSizing: "border-box",
    },
    folderInput: {
      border: "none",
      outline: "none",
      background: "transparent",
      padding: "8px 0",
      flex: 1,
      minWidth: 0,
      width: "100%",
      fontSize: 13.5,
      color: colors.textPrimary,
      boxSizing: "border-box",
    },
    folderChipsRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 8,
    },
    folderChip: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      fontSize: 11.5,
      fontWeight: 600,
      padding: "4px 10px",
      borderRadius: 999,
      border: `1px solid ${colors.cardBorder}`,
      background: colors.greyBg,
      color: colors.textTertiary,
      cursor: "pointer",
      maxWidth: "100%",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    folderChipActive: {
      borderColor: colors.accent,
      color: colors.accent,
      background: colors.accentSoft,
    },

    /* ── Browse-by-DTN search row ── */
    searchRow: { display: "flex", gap: 8, minWidth: 0 },
    searchBtn: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "none",
      background: colors.accent,
      color: "#fff",
      borderRadius: 8,
      width: 38,
      flexShrink: 0,
      cursor: "pointer",
    },
    noResultsText: {
      fontSize: 12.5,
      color: colors.textTertiary,
      padding: "6px 4px 2px",
      margin: 0,
    },

    /* ── Folder tree (Browse by DTN) ── */
    folderTree: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      minWidth: 0,
    },
    folderGroup: {
      display: "flex",
      flexDirection: "column",
      minWidth: 0,
    },
    folderHeader: {
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
      color: colors.textPrimary,
      textAlign: "left",
      minWidth: 0,
      boxSizing: "border-box",
    },
    folderLabel: {
      flex: 1,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      minWidth: 0,
    },
    folderCount: {
      fontSize: 10.5,
      fontWeight: 600,
      color: colors.textTertiary,
      background: colors.greyBg,
      padding: "1px 6px",
      borderRadius: 999,
      flexShrink: 0,
    },
    fileItemNested: {
      marginLeft: 19,
      width: "calc(100% - 19px)",
    },

    dropzone: {
      borderWidth: "1.5px",
      borderStyle: "dashed",
      borderColor: colors.cardBorder,
      borderRadius: 12,
      padding: "14px 12px",
      textAlign: "center",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      background: colors.cardBg,
      color: colors.textTertiary,
      transition: "border-color 120ms ease, background 120ms ease",
      minWidth: 0,
      boxSizing: "border-box",
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
      padding: 10,
      minWidth: 0,
      boxSizing: "border-box",
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
      overflowX: "hidden",
      minWidth: 0,
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
      minWidth: 0,
      boxSizing: "border-box",
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
      minWidth: 0,
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
      minWidth: 0,
      boxSizing: "border-box",
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
      boxSizing: "border-box",
    },
    btnDisabled: { opacity: 0.55, cursor: "not-allowed" },
    resultsCard: {
      background: colors.cardBg,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: 12,
      padding: 12,
      minWidth: 0,
      boxSizing: "border-box",
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
      minWidth: 0,
    },
    resultsErrMsg: {
      color: colors.textTertiary,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      minWidth: 0,
    },
    previewCol: {
      minHeight: 480,
      position: "sticky",
      top: 20,
      alignSelf: "start",
      maxHeight: "calc(100vh - 60px)",
      minWidth: 0,
    },
    previewCard: {
      background: colors.cardBg,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: 12,
      height: "100%",
      minHeight: 480,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      minWidth: 0,
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
      minWidth: 0,
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
      minWidth: 0,
    },
    previewHeaderSize: { color: colors.textTertiary, flexShrink: 0 },
    previewOpenLink: {
      color: colors.accent,
      display: "flex",
      flexShrink: 0,
      textDecoration: "none",
    },
    previewBody: {
      flex: 1,
      display: "flex",
      background: colors.surfaceAlt,
      minWidth: 0,
    },
    previewFrame: {
      width: "100%",
      height: "100%",
      minHeight: 460,
      border: "none",
    },
    previewImageWrap: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      minWidth: 0,
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
    previewFooterMeta: {
      padding: "8px 14px",
      borderTop: `1px solid ${colors.cardBorder}`,
      fontSize: 11.5,
      color: colors.textTertiary,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
  };
}

export default BulkDocumentUploadPage;
