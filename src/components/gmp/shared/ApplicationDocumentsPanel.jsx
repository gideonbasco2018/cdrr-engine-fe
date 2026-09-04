// FILE: src/components/gmp/shared/ApplicationDocumentsPanel.jsx
// Shared "Documents" upload/list panel for a single, already-known DTN —
// used by both GMPDocumentsModal.jsx (Queue row action) and Step 2 of
// WorkflowModal.jsx (StepDocsGMP), so they stay in sync instead of drifting
// as two hand-copied implementations.
//
// Unlike the bulk-folder-upload tool, the DTN here is fixed (the current
// application), so there's no DTN detection — dropping a folder just
// contributes its subfolder names as the category path for each file.
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Loader2,
  AlertCircle,
  Trash2,
  ExternalLink,
  FolderOpen,
  FilePlus2,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
} from "lucide-react";
import {
  uploadApplicationDocumentSingle,
  getApplicationDocumentsByDtn,
} from "../../../api/application-documents";
import {
  expandArchiveEntries,
  traverseFileTree,
} from "../../bulk-folder-upload/utils/archiveUtils";
import {
  MAX_FILE_SIZE,
  ACCEPTED_TYPES,
  formatBytes,
  kindOf,
  kindOfMime,
  buildCategoryTree,
  countTreeItems,
} from "../../bulk-folder-upload/utils/fileHelpers";

const ACCENT = "#10b981";
const CONCURRENCY = 3;
const CATEGORY_OPTIONS = [
  "GENERAL",
  "PRODUCT FILE",
  "DOCUMENTARY REQUIREMENTS",
  "WORKSHEET",
];

function KindIconSmall({ kind, size = 14 }) {
  if (kind === "pdf") return <FileText size={size} />;
  if (kind === "image") return <ImageIcon size={size} />;
  return <FileIcon size={size} />;
}

function isDarkColors(colors) {
  return colors.cardBg !== "#ffffff";
}
function panelBg(colors, darkMode) {
  return isDarkColors(colors) || darkMode ? "rgba(255,255,255,0.06)" : "#eef1f6";
}
// Same shadow+emboss language as the field-card family in WorkflowModal.jsx
// (fieldCardShadow / LogCard) — this panel used to be the odd one out with
// flat 1px-border cards instead of a lifted surface. Duplicated locally
// rather than imported since this file is shared with GMPDocumentsModal.jsx
// too, which doesn't share a module boundary with WorkflowModal.
function cardShadow(colors) {
  const emboss = isDarkColors(colors)
    ? "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.4)"
    : "inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(15,23,42,0.08)";
  return (isDarkColors(colors) ? "0 2px 8px -4px rgba(0,0,0,0.4)" : "0 2px 10px -6px rgba(16,60,40,0.14)") + `, ${emboss}`;
}

function generateBatchId() {
  return crypto?.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Google Drive inline preview URL for a given file ID. */
function drivePreviewUrl(driveFileId) {
  return `https://drive.google.com/file/d/${driveFileId}/preview`;
}

/* -------------------------------------------------------------------- */
/*  Generic category-tree renderer — shared between staged & existing    */
/* -------------------------------------------------------------------- */
function CategoryTreeNode({ node, groupKey, collapsed, toggleFolder, renderItem, colors, depth = 0 }) {
  const key = `${groupKey}::${node.key}`;
  const isCollapsed = collapsed.has(key);
  const count = countTreeItems(node);
  const children = Array.from(node.children.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );

  return (
    <div style={{ marginLeft: depth ? 14 : 0 }}>
      <button
        type="button"
        onClick={() => toggleFolder(key)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          padding: "6px 8px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          borderRadius: 6,
          textAlign: "left",
        }}
      >
        <ChevronRight
          size={12}
          style={{
            transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
            transition: "transform 120ms ease",
            flexShrink: 0,
            color: colors.textTertiary,
          }}
        />
        <FolderOpen size={13} style={{ flexShrink: 0, color: colors.textTertiary }} />
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: colors.textPrimary,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={node.label}
        >
          {node.label}
        </span>
        <span style={{ fontSize: "0.65rem", color: colors.textTertiary }}>{count}</span>
      </button>

      {!isCollapsed && (
        <div>
          {children.map((child) => (
            <CategoryTreeNode
              key={child.key}
              node={child}
              groupKey={groupKey}
              collapsed={collapsed}
              toggleFolder={toggleFolder}
              renderItem={renderItem}
              colors={colors}
              depth={depth + 1}
            />
          ))}
          {node.items.length > 0 && (
            <div
              style={{
                marginLeft: 14,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "2px 0 6px",
              }}
            >
              {node.items.map((item) => renderItem(item))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryTree({ tree, groupKey, collapsed, toggleFolder, renderItem, colors }) {
  const children = Array.from(tree.children.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {children.map((child) => (
        <CategoryTreeNode
          key={child.key}
          node={child}
          groupKey={groupKey}
          collapsed={collapsed}
          toggleFolder={toggleFolder}
          renderItem={renderItem}
          colors={colors}
        />
      ))}
      {tree.items.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: children.length ? "4px 0 0" : 0,
          }}
        >
          {tree.items.map((item) => renderItem(item))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- */

export default function ApplicationDocumentsPanel({
  dtn,
  dbEntryType = "FGMP",
  mainDbId,
  colors,
  darkMode,
}) {
  const [existingDocs, setExistingDocs] = useState([]);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [entries, setEntries] = useState([]);
  const [docCategory, setDocCategory] = useState("GENERAL");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [docError, setDocError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCounts, setUploadCounts] = useState({ done: 0, total: 0 });
  const [liveStatuses, setLiveStatuses] = useState({});
  const [collapsedExisting, setCollapsedExisting] = useState(() => new Set());
  const [collapsedStaged, setCollapsedStaged] = useState(() => new Set());
  const [activeItem, setActiveItem] = useState(null); // { type: "existing"|"staged", doc }

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Revoke staged blob URLs on unmount so we don't leak memory.
  useEffect(() => {
    return () => {
      entries.forEach((e) => e.previewUrl && URL.revokeObjectURL(e.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadExisting = useCallback(async () => {
    if (!dtn) return;
    setIsLoadingExisting(true);
    setFetchError("");
    try {
      const result = await getApplicationDocumentsByDtn(dtn);
      const data = result.data || [];
      setExistingDocs(data);
      setActiveItem((prev) => prev ?? (data.length > 0 ? { type: "existing", doc: data[0] } : prev));
    } catch (err) {
      setFetchError(err?.message || "Failed to load existing documents.");
    } finally {
      setIsLoadingExisting(false);
    }
  }, [dtn]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  const existingTree = useMemo(
    () =>
      buildCategoryTree(
        existingDocs.map((doc) => ({ ...doc, category: doc.doc_category || null })),
      ),
    [existingDocs],
  );

  const stagedTree = useMemo(() => buildCategoryTree(entries), [entries]);

  const addLooseFiles = (fileList) => {
    setDocError("");
    const incoming = [];
    for (const file of Array.from(fileList)) {
      if (!(file.type in ACCEPTED_TYPES)) {
        setDocError(`"${file.name}" is not a supported file type.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setDocError(`"${file.name}" exceeds the ${formatBytes(MAX_FILE_SIZE)} limit.`);
        continue;
      }
      incoming.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        file,
        category: docCategory || null,
        kind: kindOf(file),
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (incoming.length) {
      setEntries((prev) => [...prev, ...incoming]);
      setActiveItem({ type: "staged", doc: incoming[0] });
    }
  };

  // `flat` items carry a relativePath already stripped of the picked
  // folder's own root name — so the first remaining segment (if any) is
  // the category, not the DTN (the DTN here is fixed / already known).
  const addFolderEntries = async (flat) => {
    setIsExtracting(true);
    let expanded;
    try {
      expanded = await expandArchiveEntries(flat);
    } catch {
      setDocError("Failed to read a zip/rar file — it may be corrupted.");
      setIsExtracting(false);
      return;
    }
    setIsExtracting(false);

    const skipped = [];
    const incoming = [];
    for (const { file, relativePath } of expanded) {
      if (!(file.type in ACCEPTED_TYPES)) {
        skipped.push(file.name);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        skipped.push(file.name);
        continue;
      }
      const parts = relativePath.replace(/\\/g, "/").split("/").filter(Boolean);
      const category = parts.length > 1 ? parts.slice(0, -1).join("/") : null;
      incoming.push({
        id: `${relativePath}-${file.size}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        file,
        category,
        kind: kindOf(file),
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (incoming.length) {
      setEntries((prev) => [...prev, ...incoming]);
      setActiveItem({ type: "staged", doc: incoming[0] });
    }
    if (skipped.length)
      setDocError(`Skipped ${skipped.length} unsupported or oversized file(s).`);
  };

  const handleFileInputChange = (e) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length) addLooseFiles(fileList);
    e.target.value = "";
  };

  const handleFolderInputChange = async (e) => {
    const fileList = Array.from(e.target.files || []);
    if (!fileList.length) return;
    const flat = fileList.map((file) => {
      const full = file.webkitRelativePath || file.name;
      const rest = full.split("/").slice(1).join("/");
      return { file, relativePath: rest || file.name };
    });
    await addFolderEntries(flat);
    e.target.value = "";
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const items = e.dataTransfer?.items;
    const canTraverse =
      items && items.length && typeof items[0].webkitGetAsEntry === "function";

    if (canTraverse) {
      const topEntries = Array.from(items)
        .map((it) => it.webkitGetAsEntry())
        .filter(Boolean);
      if (topEntries.length && topEntries.every((en) => en.isFile)) {
        const files = Array.from(e.dataTransfer.files || []);
        if (files.length) addLooseFiles(files);
        return;
      }
      const nested = await Promise.all(
        topEntries.map((en) => traverseFileTree(en, "")),
      );
      const flat = nested
        .flat()
        .map(({ file, relativePath }) => {
          const rest = relativePath.split("/").slice(1).join("/");
          return { file, relativePath: rest || relativePath };
        });
      if (flat.length) await addFolderEntries(flat);
      return;
    }

    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) addLooseFiles(files);
  };

  const removeEntry = (id) => {
    setEntries((prev) => {
      const target = prev.find((e) => e.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((e) => e.id !== id);
    });
    setActiveItem((prev) => (prev?.type === "staged" && prev.doc.id === id ? null : prev));
  };
  const clearStaged = () => {
    entries.forEach((e) => e.previewUrl && URL.revokeObjectURL(e.previewUrl));
    setEntries([]);
    setDocError("");
    setLiveStatuses({});
    setActiveItem((prev) => (prev?.type === "staged" ? null : prev));
  };

  const toggleExisting = (key) => {
    setCollapsedExisting((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const toggleStaged = (key) => {
    setCollapsedStaged((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleUpload = async () => {
    if (entries.length === 0 || !dtn) return;
    setIsUploading(true);
    setDocError("");
    setLiveStatuses({});
    const sent = entries;
    const total = sent.length;
    const batchId = generateBatchId();
    setUploadCounts({ done: 0, total });
    setUploadProgress(1);

    const loaded = new Array(total).fill(0);
    const sizes = sent.map((e) => e.file.size);
    const sizeSum = sizes.reduce((a, b) => a + b, 0) || 1;
    const bump = () =>
      setUploadProgress(
        Math.min(
          99,
          Math.max(1, Math.round((loaded.reduce((a, b) => a + b, 0) / sizeSum) * 100)),
        ),
      );

    let doneCount = 0;
    let cursor = 0;
    const results = new Array(total);

    const worker = async () => {
      while (cursor < total) {
        const idx = cursor++;
        const entry = sent[idx];
        try {
          const r = await uploadApplicationDocumentSingle(
            {
              dbEntryType,
              dbDtn: dtn,
              docCategory: entry.category || undefined,
              batchId,
              mainDbId,
              file: entry.file,
              relativePath: entry.category
                ? `${entry.category}/${entry.file.name}`
                : entry.file.name,
            },
            (l) => {
              loaded[idx] = l;
              bump();
            },
          );
          results[idx] = r;
          setLiveStatuses((prev) => ({
            ...prev,
            [entry.id]: { success: r.success, error: r.error },
          }));
        } catch (err) {
          results[idx] = { success: false, error: err.message };
          setLiveStatuses((prev) => ({
            ...prev,
            [entry.id]: { success: false, error: err.message },
          }));
        } finally {
          loaded[idx] = sizes[idx];
          doneCount += 1;
          setUploadCounts({ done: doneCount, total });
          bump();
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker()),
    );

    setUploadProgress(100);
    const failed = sent.filter((_, i) => results[i] && !results[i].success);
    const succeeded = sent.filter((_, i) => results[i] && results[i].success);
    succeeded.forEach((e) => e.previewUrl && URL.revokeObjectURL(e.previewUrl));
    setEntries(failed);
    setActiveItem((prev) =>
      prev?.type === "staged" && succeeded.some((e) => e.id === prev.doc.id) ? null : prev,
    );
    if (failed.length) setDocError(`${failed.length} file(s) failed — fix or click Upload again to retry.`);
    setIsUploading(false);
    await loadExisting();
  };

  const renderStagedItem = (entry) => {
    const status = liveStatuses[entry.id];
    const isActive = activeItem?.type === "staged" && activeItem.doc.id === entry.id;
    return (
      <div
        key={entry.id}
        onClick={() => setActiveItem({ type: "staged", doc: entry })}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 7,
          border: `1px solid ${
            status ? (status.success ? "#10b98150" : "#ef444450") : colors.cardBorder
          }`,
          fontSize: "0.75rem",
          background: status ? (status.success ? "#10b9810c" : "#ef44440c") : "transparent",
          boxShadow: isActive ? "0 0 0 2px #1976d2" : "none",
          cursor: "pointer",
        }}
      >
        <KindIconSmall kind={entry.kind} />
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: colors.textPrimary,
          }}
          title={entry.file.name}
        >
          {entry.file.name}
        </span>
        <span style={{ color: colors.textTertiary, fontSize: "0.65rem" }}>
          {formatBytes(entry.file.size)}
        </span>
        {status?.success && (
          <span style={{ color: "#10b981", fontSize: "0.7rem", fontWeight: 700 }}>✓</span>
        )}
        {status && !status.success && (
          <span title={status.error} style={{ color: "#ef4444", fontSize: "0.7rem" }}>
            ✕
          </span>
        )}
        {!isUploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeEntry(entry.id);
            }}
            style={{
              border: "none",
              background: "transparent",
              color: "#ef4444",
              cursor: "pointer",
              padding: 0,
              display: "flex",
            }}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    );
  };

  const renderExistingItem = (doc) => {
    const isActive = activeItem?.type === "existing" && activeItem.doc.id === doc.id;
    return (
      <div
        key={doc.id}
        onClick={() => setActiveItem({ type: "existing", doc })}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 7,
          border: `1px solid ${colors.cardBorder}`,
          fontSize: "0.75rem",
          color: colors.textPrimary,
          boxShadow: isActive ? "0 0 0 2px #1976d2" : "none",
          cursor: "pointer",
        }}
      >
        <KindIconSmall kind={kindOfMime(doc.mime_type)} />
        <span
          style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {doc.original_filename}
        </span>
        <span style={{ color: colors.textTertiary, fontSize: "0.65rem" }}>
          {formatBytes(doc.file_size_bytes)}
        </span>
        {doc.drive_file_id && (
          <a
            href={`https://drive.google.com/file/d/${doc.drive_file_id}/view`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ display: "flex", flexShrink: 0 }}
            title="Open in Drive"
          >
            <ExternalLink size={12} style={{ color: colors.textTertiary }} />
          </a>
        )}
      </div>
    );
  };

  const previewKind = activeItem?.type === "existing"
    ? kindOfMime(activeItem.doc.mime_type)
    : activeItem?.type === "staged"
      ? activeItem.doc.kind
      : null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 360px) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
      <div className="wfFieldBox" style={{
        border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: 12,
        background: colors.cardBg, boxShadow: cardShadow(colors),
      }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: colors.textTertiary, marginBottom: 8 }}>
          Add new files
        </div>

        <div style={{ marginBottom: 10 }}>
          <label
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color: colors.textPrimary,
              display: "block",
              marginBottom: 4,
            }}
          >
            Category (used for individually-selected files)
          </label>
          <select
            value={isCustomCategory ? "__custom__" : docCategory}
            onChange={(e) => {
              if (e.target.value === "__custom__") {
                setIsCustomCategory(true);
                setDocCategory("");
              } else {
                setIsCustomCategory(false);
                setDocCategory(e.target.value);
              }
            }}
            style={{
              width: "100%",
              padding: "0.5rem 0.7rem",
              borderRadius: 7,
              border: `1px solid ${colors.inputBorder}`,
              background: panelBg(colors, darkMode),
              color: colors.textPrimary,
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="__custom__">+ New folder…</option>
          </select>
          {isCustomCategory && (
            <input
              type="text"
              autoFocus
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value)}
              placeholder="Type a folder name…"
              style={{
                marginTop: 6,
                width: "100%",
                padding: "0.5rem 0.7rem",
                borderRadius: 7,
                border: `1px solid ${colors.inputBorder}`,
                background: panelBg(colors, darkMode),
                color: colors.textPrimary,
                fontSize: "0.8rem",
                boxSizing: "border-box",
              }}
            />
          )}
        </div>

        <div
          onClick={() => {
            if (!isExtracting) fileInputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `1.5px dashed ${isDragging ? ACCENT : colors.cardBorder}`,
            borderRadius: 10,
            padding: 20,
            textAlign: "center",
            cursor: "pointer",
          }}
        >
          {isExtracting ? (
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
          ) : (
            <div style={{ fontSize: "1.4rem" }}>⬆️</div>
          )}
          <p style={{ fontSize: "0.78rem", color: colors.textSecondary, margin: "5px 0 0" }}>
            {isExtracting
              ? "Extracting zip/rar file(s)…"
              : "Drop files or a folder here, or click to select files"}
          </p>
          <small style={{ fontSize: "0.68rem", color: colors.textTertiary }}>
            {formatBytes(MAX_FILE_SIZE)} limit per file · zip/rar auto-extracted · dropped
            folders use their subfolder names as category
          </small>
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!isExtracting) folderInputRef.current?.click();
              }}
              style={{
                border: `1px solid ${colors.cardBorder}`,
                background: "transparent",
                color: colors.textPrimary,
                borderRadius: 7,
                padding: "5px 10px",
                fontSize: "0.7rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <FolderOpen size={12} /> Select folder instead
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            style={{ display: "none" }}
          />
          <input
            ref={folderInputRef}
            type="file"
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleFolderInputChange}
            style={{ display: "none" }}
          />
        </div>

        {docError && (
          <div
            style={{
              marginTop: 8,
              padding: "7px 10px",
              borderRadius: 7,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#ef4444",
              fontSize: "0.72rem",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <AlertCircle size={13} style={{ flexShrink: 0 }} />
            {docError}
          </div>
        )}

        {entries.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: colors.textTertiary }}>
                {entries.length} file(s) staged
              </span>
              {!isUploading && (
                <button
                  type="button"
                  onClick={clearStaged}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Trash2 size={12} /> Clear all
                </button>
              )}
            </div>

            <CategoryTree
              tree={stagedTree}
              groupKey="staged"
              collapsed={collapsedStaged}
              toggleFolder={toggleStaged}
              renderItem={renderStagedItem}
              colors={colors}
            />

            {isUploading ? (
              <div
                style={{
                  fontSize: "0.75rem",
                  color: colors.textPrimary,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    border: "2px solid rgba(16,185,129,0.2)",
                    borderTopColor: ACCENT,
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                  }}
                />
                Uploading {uploadCounts.done}/{uploadCounts.total} file(s) · {uploadProgress}%
              </div>
            ) : (
              <button
                type="button"
                onClick={handleUpload}
                style={{
                  padding: "8px 16px",
                  background: `linear-gradient(135deg,${ACCENT},#059669)`,
                  border: "none",
                  borderRadius: 7,
                  color: "#fff",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  alignSelf: "flex-start",
                }}
              >
                Upload {entries.length} file(s)
              </button>
            )}
          </div>
        )}
      </div>

      <div className="wfFieldBox" style={{
        border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: 12,
        background: colors.cardBg, boxShadow: cardShadow(colors),
      }}>
        {isLoadingExisting ? (
          <div style={{ fontSize: "0.75rem", color: colors.textTertiary }}>Loading documents…</div>
        ) : fetchError ? (
          <div style={{ fontSize: "0.75rem", color: "#ef4444" }}>{fetchError}</div>
        ) : (
          <>
            <div style={{ fontSize: "0.72rem", color: colors.textTertiary, marginBottom: 8 }}>
              {existingDocs.length} file(s) found for DTN{" "}
              <strong style={{ color: colors.textPrimary }}>{dtn}</strong>
            </div>
            {existingDocs.length === 0 ? (
              <p style={{ fontSize: "0.75rem", color: colors.textTertiary, margin: 0 }}>
                No documents uploaded yet.
              </p>
            ) : (
              <CategoryTree
                tree={existingTree}
                groupKey="existing"
                collapsed={collapsedExisting}
                toggleFolder={toggleExisting}
                renderItem={renderExistingItem}
                colors={colors}
              />
            )}
          </>
        )}
      </div>
    </div>

      {/* ── Right: preview panel ── */}
      <div
        className="wfFieldBox"
        style={{
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 12,
          minHeight: 420,
          height: "calc(94vh - 95px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "sticky",
          top: 0,
          background: colors.cardBg,
          boxShadow: cardShadow(colors),
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
              color: colors.textTertiary,
              fontSize: "0.8rem",
              padding: 28,
              textAlign: "center",
            }}
          >
            Select a file to preview it here.
          </div>
        ) : activeItem.type === "existing" ? (
          <>
            <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
              {previewKind === "other" ? (
                <div
                  style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", gap: 8, color: colors.textTertiary,
                    fontSize: "0.78rem", padding: 20, textAlign: "center",
                  }}
                >
                  Preview not available for this file type.
                  {activeItem.doc.drive_file_id && (
                    <a
                      href={`https://drive.google.com/file/d/${activeItem.doc.drive_file_id}/view`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#1976d2", fontWeight: 700 }}
                    >
                      Open in Drive ↗
                    </a>
                  )}
                </div>
              ) : (
                <iframe
                  src={drivePreviewUrl(activeItem.doc.drive_file_id)}
                  title={activeItem.doc.original_filename}
                  style={{ width: "100%", height: "100%", border: "none", minHeight: 380 }}
                  allow="autoplay"
                />
              )}
            </div>
            <div
              style={{
                padding: "8px 12px",
                borderTop: `1px solid ${colors.cardBorder}`,
                fontSize: "0.7rem",
                color: colors.textTertiary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {activeItem.doc.original_filename}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
            {activeItem.doc.kind === "pdf" && (
              <iframe
                // #navpanes=0 collapses the browser PDF viewer's thumbnail /
                // page-selector rail so the page itself gets the full width.
                src={`${activeItem.doc.previewUrl}#toolbar=1&navpanes=0&view=FitH`}
                title={activeItem.doc.file.name}
                style={{ width: "100%", height: "100%", border: "none", minHeight: 380 }}
              />
            )}
            {activeItem.doc.kind === "image" && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                <img
                  src={activeItem.doc.previewUrl}
                  alt={activeItem.doc.file.name}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 6 }}
                />
              </div>
            )}
            {activeItem.doc.kind !== "pdf" && activeItem.doc.kind !== "image" && (
              <div
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  color: colors.textTertiary, fontSize: "0.78rem", padding: 20, textAlign: "center",
                }}
              >
                Preview not available for this file type.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
