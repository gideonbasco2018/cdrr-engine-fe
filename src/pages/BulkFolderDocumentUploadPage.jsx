// src/pages/BulkFolderDocumentUploadPage.jsx

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
  AlertCircle,
  Trash2,
  ExternalLink,
  Search,
  FolderOpen,
  ChevronRight,
  ClipboardList,
} from "lucide-react";

import JSZip from "jszip";
import { createExtractorFromData } from "node-unrar-js";

import {
  uploadApplicationDocumentSingle,
  getUploadLogs,
  getUploadLogUploaders,
} from "../api/application-documents";

// JSZip doesn't expose mime types, kaya kailangan i-guess base sa extension
const EXT_MIME = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function guessMimeFromName(name) {
  const ext = name.split(".").pop().toLowerCase();
  return EXT_MIME[ext] || "application/octet-stream";
}

async function extractZipToEntries(zipFile, pathPrefix) {
  const zip = await JSZip.loadAsync(zipFile);
  const innerFiles = Object.values(zip.files).filter(
    (zf) =>
      !zf.dir &&
      !zf.name.startsWith("__MACOSX") &&
      !zf.name.split("/").pop().startsWith("."),
  );

  const out = [];
  for (const zf of innerFiles) {
    const blob = await zf.async("blob");
    const filename = zf.name.split("/").pop();
    const mime = guessMimeFromName(filename);
    const typedFile = new File([blob], filename, { type: mime });
    out.push({
      file: typedFile,
      relativePath: `${pathPrefix}${zf.name}`,
    });
  }
  return out;
}

async function extractRarToEntries(rarFile, pathPrefix) {
  const arrayBuffer = await rarFile.arrayBuffer();
  const extractor = await createExtractorFromData({ data: arrayBuffer });
  const { files } = extractor.extract();

  const out = [];
  for (const entry of files) {
    if (entry.fileHeader.flags.directory) continue;
    const name = entry.fileHeader.name.replace(/\\/g, "/");
    const filename = name.split("/").pop();
    if (name.startsWith("__MACOSX") || filename.startsWith(".")) continue;
    if (!entry.extraction) continue; // walang binary data (e.g. skipped/error entry)

    const mime = guessMimeFromName(filename);
    const typedFile = new File([entry.extraction], filename, { type: mime });
    out.push({ file: typedFile, relativePath: `${pathPrefix}${name}` });
  }
  return out;
}

async function expandArchiveEntries(flat) {
  const expanded = [];
  for (const item of flat) {
    const lowerName = item.file.name.toLowerCase();
    const isZip = lowerName.endsWith(".zip");
    const isRar = lowerName.endsWith(".rar");
    if (!isZip && !isRar) {
      expanded.push(item);
      continue;
    }
    const parts = item.relativePath
      .replace(/\\/g, "/")
      .split("/")
      .filter(Boolean);
    const prefix = parts.slice(0, -1).join("/");

    const archiveBaseName =
      item.file.name.replace(/\.(zip|rar)$/i, "").trim() || "archive";
    const pathPrefix = prefix
      ? `${prefix}/${archiveBaseName}/`
      : `${archiveBaseName}/`;

    try {
      const inner = isZip
        ? await extractZipToEntries(item.file, pathPrefix)
        : await extractRarToEntries(item.file, pathPrefix);
      const innerExpanded = await expandArchiveEntries(inner); // archive-in-archive
      expanded.push(...innerExpanded);
    } catch (err) {
      expanded.push(item);
    }
  }
  return expanded;
}

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB — dapat tugma sa backend limit
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
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "ppt",

  "application/zip": "archive",
  "application/x-zip-compressed": "archive",
  "application/vnd.rar": "archive",
  "application/x-rar-compressed": "archive",
  "application/x-rar": "archive",
};

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

/**
 * Google Drive "view"/"open" links (…/file/d/FILE_ID/view) can't be embedded
 * directly in an <iframe> — Drive returns X-Frame-Options: SAMEORIGIN for
 * that route. The `/preview` route, however, is meant for embedding. This
 * pulls the FILE_ID out of whatever link shape we got back from the API and
 * rebuilds it as an embeddable preview URL.
 */
function toDriveEmbedUrl(url) {
  if (!url) return null;
  const match = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
  const fileId = match ? match[1] : null;
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

function KindIcon({ kind, size = 16 }) {
  if (kind === "pdf") return <FileText size={size} />;
  if (kind === "image") return <ImageIcon size={size} />;
  return <FileIcon size={size} />;
}

/**
 * Recursively walks a dropped folder's FileSystemEntry tree (Chrome/Edge
 * drag-and-drop API) and resolves it into a flat list of
 * { file, relativePath } — relativePath is built manually here since
 * dropped files don't carry `webkitRelativePath` the way a
 * <input webkitdirectory> selection does.
 */
function traverseFileTree(entry, pathPrefix = "") {
  return new Promise((resolve) => {
    if (!entry) {
      resolve([]);
      return;
    }
    if (entry.isFile) {
      entry.file(
        (file) =>
          resolve([{ file, relativePath: `${pathPrefix}${file.name}` }]),
        () => resolve([]),
      );
      return;
    }
    if (entry.isDirectory) {
      const dirReader = entry.createReader();
      let collected = [];
      const readBatch = () => {
        dirReader.readEntries(
          async (batch) => {
            if (!batch.length) {
              const nested = await Promise.all(
                collected.map((child) =>
                  traverseFileTree(child, `${pathPrefix}${entry.name}/`),
                ),
              );
              resolve(nested.flat());
              return;
            }
            // readEntries can return results in chunks — keep reading until empty.
            collected = collected.concat(batch);
            readBatch();
          },
          () => resolve([]),
        );
      };
      readBatch();
      return;
    }
    resolve([]);
  });
}

/**
 * Gumagawa ng totoong nested folder tree galing sa flat entries kung saan
 * ang `category` field ay "/"-joined path (hal. "PART II/SEC B/2. DRUG
 * PRODUCT"). Ganito rin dapat kahawig ang structure na ginagawa sa
 * Google Drive — hindi dapat isang mahabang flat label na lang.
 */
function buildCategoryTree(items) {
  const root = {
    key: "__root__",
    label: "General (root)",
    children: new Map(),
    items: [],
  };
  for (const entry of items) {
    if (!entry.category) {
      root.items.push(entry);
      continue;
    }
    const parts = entry.category.split("/").filter(Boolean);
    let node = root;
    let pathAcc = "";
    for (const part of parts) {
      pathAcc = pathAcc ? `${pathAcc}/${part}` : part;
      if (!node.children.has(part)) {
        node.children.set(part, {
          key: pathAcc,
          label: part,
          children: new Map(),
          items: [],
        });
      }
      node = node.children.get(part);
    }
    node.items.push(entry);
  }
  return root;
}

function countTreeItems(node) {
  let count = node.items.length;
  for (const child of node.children.values()) {
    count += countTreeItems(child);
  }
  return count;
}

function FileEntryItem({
  entry,
  s,
  colors,
  isActive,
  result,
  isUploading,
  onSelect,
  onRemove,
}) {
  return (
    <li
      onClick={onSelect}
      style={{
        ...s.fileItem,
        ...s.fileItemNested,
        ...(isActive ? s.fileItemActive : {}),
      }}
    >
      <span style={s.fileItemIcon}>
        {result ? (
          <span
            key={`${entry.id}-${result.success}`}
            style={{
              display: "inline-flex",
              animation: "bdu-pop-in 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {result.success ? (
              <CheckCircle2 size={16} color={colors.success} />
            ) : (
              <XCircle size={16} color={colors.danger} />
            )}
          </span>
        ) : isUploading ? (
          <Loader2
            size={14}
            color={colors.textTertiary}
            style={{ animation: "bdu-spin 1s linear infinite" }}
          />
        ) : (
          <KindIcon kind={entry.kind} />
        )}
      </span>
      <span style={s.fileItemName} title={entry.file.name}>
        {entry.file.name}
      </span>
      <span style={s.fileItemSize}>{formatBytes(entry.file.size)}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        style={s.fileItemRemove}
        aria-label={`Remove ${entry.file.name}`}
      >
        <X size={13} />
      </button>
    </li>
  );
}

function FolderTreeNode({
  node,
  groupKeyPrefix,
  colors,
  s,
  collapsedFolders,
  toggleFolder,
  activeEntryId,
  setActiveEntryId,
  liveStatuses,
  isUploading,
  removeEntry,
}) {
  const groupKey = `${groupKeyPrefix}::${node.key}`;
  const isCollapsed = collapsedFolders.has(groupKey);
  const totalCount = countTreeItems(node);
  const childNodes = Array.from(node.children.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );

  return (
    <div style={s.folderGroup}>
      <button
        type="button"
        onClick={() => toggleFolder(groupKey)}
        style={s.folderHeader}
      >
        <ChevronRight
          size={13}
          style={{
            transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
            transition: "transform 120ms ease",
            flexShrink: 0,
          }}
        />
        <FolderOpen size={14} style={{ flexShrink: 0 }} />
        <span style={s.folderLabel} title={node.label}>
          {node.label}
        </span>
        <span style={s.folderCount}>{totalCount}</span>
      </button>

      {!isCollapsed && (
        <div style={s.dtnGroupBody}>
          {childNodes.map((child) => (
            <FolderTreeNode
              key={child.key}
              node={child}
              groupKeyPrefix={groupKeyPrefix}
              colors={colors}
              s={s}
              collapsedFolders={collapsedFolders}
              toggleFolder={toggleFolder}
              activeEntryId={activeEntryId}
              setActiveEntryId={setActiveEntryId}
              liveStatuses={liveStatuses}
              isUploading={isUploading}
              removeEntry={removeEntry}
            />
          ))}
          {node.items.length > 0 && (
            <ul style={s.fileList}>
              {node.items.map((entry) => (
                <FileEntryItem
                  key={entry.id}
                  entry={entry}
                  s={s}
                  colors={colors}
                  isActive={entry.id === activeEntryId}
                  result={liveStatuses[entry.relativePath]}
                  isUploading={isUploading}
                  onSelect={() => setActiveEntryId(entry.id)}
                  onRemove={() => removeEntry(entry.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * BulkFolderDocumentUploadPage
 *
 * Sumusunod sa parehong pattern ng TaskPage.jsx — `darkMode` ay ipinapasa
 * bilang prop mula sa parent/layout. Dalawang tabs:
 *  - "Upload Folder"  — select/drag an ENTIRE folder. The folder's name
 *                        becomes the DTN and any nested subfolders (any
 *                        depth) automatically become the doc_category —
 *                        nothing to type except Entry Type.
 *  - "Upload Logs"     — audit view ng lahat ng upload attempts (success +
 *                        failed), across lahat ng batches, filterable by
 *                        status / uploader / DTN.
 */
function BulkFolderDocumentUploadPage({ darkMode }) {
  const colors = getColors(darkMode);
  const s = buildStyles(colors);

  const [activeTab, setActiveTab] = useState("folder"); // "folder" | "logs"

  return (
    <div style={s.page} className="bdu-page">
      <div style={s.shell}>
        <header style={s.header}>
          <div>
            <h1 style={s.title} className="bdu-title">
              Batch Folder Upload
            </h1>
            <p style={s.subtitle}>
              Upload an entire folder of supporting documents, or review past
              batch upload logs.
            </p>
          </div>
        </header>

        <div style={s.tabBar} className="bdu-tabBar">
          <button
            type="button"
            onClick={() => setActiveTab("folder")}
            className="bdu-tabBtn"
            style={{
              ...s.tabBtn,
              ...(activeTab === "folder" ? s.tabBtnActive : {}),
            }}
          >
            <FolderOpen size={14} /> Upload Folder
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className="bdu-tabBtn"
            style={{
              ...s.tabBtn,
              ...(activeTab === "logs" ? s.tabBtnActive : {}),
            }}
          >
            <ClipboardList size={14} /> Upload Logs
          </button>
        </div>

        {activeTab === "folder" && <UploadFolderTab colors={colors} s={s} />}
        {activeTab === "logs" && <UploadLogsTab colors={colors} s={s} />}
      </div>

      <style>{`
        * { box-sizing: border-box; }

        @keyframes bdu-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @keyframes bdu-pop-in {
        0%   { transform: scale(0.3); opacity: 0; }
        60%  { transform: scale(1.25); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
        }

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

        .bdu-page input,
        .bdu-page select,
        .bdu-page textarea {
          min-width: 0;
          max-width: 100%;
        }

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

        @media (max-width: 860px) {
          .bdu-previewCard {
            min-height: 420px !important;
          }
          .bdu-previewFrame {
            min-height: 380px !important;
          }
        }

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
/*  Tab 1 — Upload Folder                                               */
/* ================================================================== */

function UploadFolderTab({ colors, s }) {
  const [dbEntryType, setDbEntryType] = useState("");
  const [entries, setEntries] = useState([]);
  const [activeEntryId, setActiveEntryId] = useState(null);
  const [collapsedFolders, setCollapsedFolders] = useState(() => new Set());
  const [liveStatuses, setLiveStatuses] = useState({});

  const [formError, setFormError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCounts, setUploadCounts] = useState({ done: 0, total: 0 });
  const [uploadResults, setUploadResults] = useState(null);

  const folderInputRef = useRef(null);

  useEffect(() => {
    return () => {
      entries.forEach((e) => URL.revokeObjectURL(e.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeEntry = useMemo(
    () => entries.find((e) => e.id === activeEntryId) || null,
    [entries, activeEntryId],
  );

  const dtnInfo = useMemo(() => {
    const names = Array.from(
      new Set(entries.map((e) => e.relativePath.split("/")[0])),
    );
    return {
      name: names[0] || "",
      mismatch: names.length > 1,
      all: names,
    };
  }, [entries]);

  const dtnGroups = useMemo(() => {
    const groups = new Map();
    for (const entry of entries) {
      const dtn = entry.relativePath.split("/")[0];
      if (!groups.has(dtn)) {
        groups.set(dtn, { dtn, items: [] });
      }
      groups.get(dtn).items.push(entry);
    }
    return Array.from(groups.values())
      .map((g) => ({
        ...g,
        tree: buildCategoryTree(g.items),
      }))
      .sort((a, b) => a.dtn.localeCompare(b.dtn));
  }, [entries]);

  const toggleFolder = (key) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const processFileEntries = useCallback(async (flat) => {
    setIsExtracting(true);
    let expandedFlat;
    try {
      expandedFlat = await expandArchiveEntries(flat);
    } catch (err) {
      setFormError("Failed to read a zip/rar file — it may be corrupted.");
      setIsExtracting(false);
      return;
    }
    setIsExtracting(false);

    const skipped = [];
    const newEntries = [];

    for (const { file, relativePath } of expandedFlat) {
      const parts = relativePath.replace(/\\/g, "/").split("/").filter(Boolean);
      if (parts.length < 2) {
        skipped.push(file.name);
        continue;
      }
      const category = parts.length > 2 ? parts.slice(1, -1).join("/") : null;
      newEntries.push({
        id: `${relativePath}-${file.size}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        file,
        relativePath,
        category,
        kind: kindOf(file),
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (newEntries.length) {
      setEntries((prev) => [...prev, ...newEntries]);
      setActiveEntryId((prev) => prev ?? newEntries[0].id);
      setUploadResults(null);
    }

    if (skipped.length) {
      setFormError(
        `Skipped ${skipped.length} file(s) with no detectable folder (make sure you selected a folder, not loose files).`,
      );
    } else if (newEntries.length) {
      setFormError("");
    }
  }, []);

  const handleFolderInputChange = async (e) => {
    const fileList = Array.from(e.target.files || []);
    if (!fileList.length) return;
    const flat = fileList.map((file) => ({
      file,
      relativePath: file.webkitRelativePath || file.name,
    }));
    await processFileEntries(flat);
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
      const nested = await Promise.all(
        topEntries.map((entry) => traverseFileTree(entry, "")),
      );
      const flat = nested.flat();
      if (!flat.length) {
        setFormError(
          "Couldn't read that folder — try 'Select Folder' instead.",
        );
        return;
      }
      await processFileEntries(flat);
      return;
    }

    setFormError(
      "Drag-and-drop of a folder isn't supported in this browser — use 'Select Folder' instead.",
    );
  };

  const removeEntry = (entryId) => {
    setEntries((prev) => {
      const target = prev.find((e) => e.id === entryId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((e) => e.id !== entryId);
    });
    setActiveEntryId((prev) => (prev === entryId ? null : prev));
  };

  const clearAll = () => {
    entries.forEach((e) => URL.revokeObjectURL(e.previewUrl));
    setEntries([]);
    setActiveEntryId(null);
    setDbEntryType("");
    setFormError("");
    setUploadResults(null);
    setUploadProgress(0);
    setUploadCounts({ done: 0, total: 0 });
    setCollapsedFolders(new Set());
  };

  const validate = () => {
    if (!dbEntryType.trim()) return "Entry Type is required.";
    if (entries.length === 0) return "Select a folder with at least one file.";
    for (const { file } of entries) {
      if (!(file.type in ACCEPTED_TYPES))
        return `"${file.name}" is not a supported file type.`;
      if (file.size > MAX_FILE_SIZE)
        return `"${file.name}" exceeds the 200MB limit.`;
    }
    return "";
  };

  const generateBatchId = () =>
    crypto?.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const CONCURRENCY = 3; // ilang files ang sabay na aasenso — taasan/babaan depende sa performance

  const handleUpload = async () => {
    setFormError("");
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsUploading(true);
    setLiveStatuses({});
    const sentEntries = entries;
    const batchId = generateBatchId();
    const total = sentEntries.length;
    setUploadCounts({ done: 0, total });
    setUploadProgress(1);

    const loadedBytes = new Array(total).fill(0);
    const totalBytesArr = sentEntries.map((e) => e.file.size);
    const totalBytesSum = totalBytesArr.reduce((a, b) => a + b, 0) || 1;

    const updateOverallProgress = () => {
      const sumLoaded = loadedBytes.reduce((a, b) => a + b, 0);
      setUploadProgress(
        Math.min(
          99,
          Math.max(1, Math.round((sumLoaded / totalBytesSum) * 100)),
        ),
      );
    };

    const results = new Array(total);
    let doneCount = 0;
    let cursor = 0;

    const worker = async () => {
      while (cursor < total) {
        const idx = cursor++;
        const entry = sentEntries[idx];
        try {
          const r = await uploadApplicationDocumentSingle(
            {
              dbEntryType,
              dbDtn: entry.relativePath.split("/")[0],
              docCategory: entry.category,
              batchId,
              file: entry.file,
              relativePath: entry.relativePath,
            },
            (loaded) => {
              loadedBytes[idx] = loaded;
              updateOverallProgress();
            },
          );
          results[idx] = r;
          setLiveStatuses((prev) => ({
            ...prev,
            [entry.relativePath]: { success: r.success, error: r.error },
          }));
        } catch (err) {
          results[idx] = {
            filename: entry.file.name,
            success: false,
            error: err.message || "Upload failed.",
          };
          setLiveStatuses((prev) => ({
            ...prev,
            [entry.relativePath]: { success: false, error: err.message },
          }));
        } finally {
          loadedBytes[idx] = totalBytesArr[idx];
          doneCount += 1;
          setUploadCounts({ done: doneCount, total });
          updateOverallProgress();
        }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, () =>
      worker(),
    );
    await Promise.all(workers);

    const succeeded = results.filter((r) => r.success).length;
    const failed = total - succeeded;
    setUploadResults({ total, succeeded, failed, results, batch_id: batchId });
    setUploadProgress(100);

    const failedEntries = [];
    sentEntries.forEach((entry, idx) => {
      const r = results[idx];
      if (r && !r.success)
        failedEntries.push({ ...entry, uploadError: r.error });
      else URL.revokeObjectURL(entry.previewUrl);
    });

    setEntries(failedEntries);
    setActiveEntryId(failedEntries[0]?.id ?? null);
    if (failedEntries.length === 0) setDbEntryType("");
    setCollapsedFolders(new Set());
    setIsUploading(false);
  };

  return (
    <div style={s.layout} className="bdu-layout">
      <div style={s.leftCol} className="bdu-leftCol">
        <div style={s.card} className="bdu-card">
          <Field label="Entry Type" required colors={colors}>
            <select
              value={dbEntryType}
              onChange={(e) => setDbEntryType(e.target.value)}
              style={s.input}
            >
              <option value="">Select entry type</option>
              <option value="CANCELLATION OF CPR">CANCELLATION OF CPR</option>
              <option value="CORRECTION">CORRECTION</option>
              <option value="RECONSTRUCTION">RECONSTRUCTION</option>
              <option value="VALIDITY EXTENSION">VALIDITY EXTENSION</option>
              <option value="SURRENDER DUE TO PAC">SURRENDER DUE TO PAC</option>
              <option value="DOCUMENTS FROM CLIENT">
                DOCUMENTS FROM CLIENT
              </option>
            </select>
          </Field>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (!isExtracting) folderInputRef.current?.click();
          }}
          className="bdu-dropzone"
          style={{
            ...s.dropzone,
            ...(isDragging ? s.dropzoneActive : {}),
          }}
        >
          {isExtracting ? (
            <Loader2
              size={20}
              style={{ animation: "bdu-spin 1s linear infinite" }}
            />
          ) : (
            <FolderOpen size={20} />
          )}
          <p style={s.dropzoneText}>
            {isExtracting ? (
              <strong>Extracting zip/rar file(s)...</strong>
            ) : (
              <>
                <strong>Select Folder</strong> or drag a folder here
              </>
            )}
          </p>
          <p style={s.dropzoneHint}>
            The folder name becomes the DTN — subfolders become categories
            automatically. Zip and Rar files are auto-extracted for preview.
            Browsers only allow selecting one folder per dialog — drag multiple
            folders together, or click again to add another.
          </p>
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

        {entries.length > 0 && (
          <div
            style={{
              ...s.detectedDtnBanner,
              ...(dtnInfo.mismatch ? s.detectedDtnBannerInfo : {}),
            }}
          >
            {dtnInfo.mismatch ? (
              <>
                <FolderOpen size={14} color={colors.accent} />
                <span>
                  {dtnInfo.all.length} DTNs detected:{" "}
                  <strong>{dtnInfo.all.join(", ")}</strong> — each folder will
                  be uploaded under its own DTN.
                </span>
              </>
            ) : (
              <>
                <FolderOpen size={14} color={colors.accent} />
                <span>
                  Detected DTN: <strong>{dtnInfo.name}</strong>
                </span>
              </>
            )}
          </div>
        )}

        {uploadResults && uploadResults.failed > 0 && entries.length > 0 && (
          <div style={s.detectedDtnBannerWarnSoft}>
            <AlertCircle size={14} color={colors.danger} />
            <span>
              {entries.length} file(s) failed to upload — fix or leave as-is,
              then click Upload again to retry only these.
            </span>
          </div>
        )}

        {entries.length > 0 && (
          <div style={s.groupsHeaderRow}>
            <span style={s.groupsHeaderLabel}>
              {entries.length} file(s) · {dtnGroups.length} DTN(s)
            </span>
            <div style={s.groupsHeaderActions}>
              <button
                type="button"
                onClick={() => {
                  if (!isExtracting) folderInputRef.current?.click();
                }}
                disabled={isExtracting}
                style={{
                  ...s.addFolderLink,
                  ...(isExtracting ? s.btnDisabled : {}),
                }}
              >
                <FolderOpen size={13} /> Add folder
              </button>
              <button type="button" onClick={clearAll} style={s.clearLink}>
                <Trash2 size={13} /> Clear all
              </button>
            </div>
          </div>
        )}

        {entries.length > 0 && (
          <div style={s.fileListCard}>
            <div style={s.folderTree}>
              {dtnGroups.map((dtnGroup) => {
                const showDtnHeader = dtnGroups.length > 1;
                return (
                  <div key={dtnGroup.dtn} style={s.folderGroup}>
                    {showDtnHeader && (
                      <div style={s.dtnGroupHeader}>
                        <FolderOpen size={14} style={{ flexShrink: 0 }} />
                        <span style={s.dtnGroupLabel} title={dtnGroup.dtn}>
                          DTN: {dtnGroup.dtn}
                        </span>
                        <span style={s.folderCount}>
                          {dtnGroup.items.length}
                        </span>
                      </div>
                    )}
                    <div style={showDtnHeader ? s.dtnGroupBody : undefined}>
                      {Array.from(dtnGroup.tree.children.values())
                        .sort((a, b) => a.label.localeCompare(b.label))
                        .map((child) => (
                          <FolderTreeNode
                            key={child.key}
                            node={child}
                            groupKeyPrefix={dtnGroup.dtn}
                            colors={colors}
                            s={s}
                            collapsedFolders={collapsedFolders}
                            toggleFolder={toggleFolder}
                            activeEntryId={activeEntryId}
                            setActiveEntryId={setActiveEntryId}
                            liveStatuses={liveStatuses}
                            isUploading={isUploading}
                            removeEntry={removeEntry}
                          />
                        ))}
                      {dtnGroup.tree.items.length > 0 && (
                        <FolderTreeNode
                          node={{
                            key: "__root__",
                            label: "General (root)",
                            children: new Map(),
                            items: dtnGroup.tree.items,
                          }}
                          groupKeyPrefix={dtnGroup.dtn}
                          colors={colors}
                          s={s}
                          collapsedFolders={collapsedFolders}
                          toggleFolder={toggleFolder}
                          activeEntryId={activeEntryId}
                          setActiveEntryId={setActiveEntryId}
                          liveStatuses={liveStatuses}
                          isUploading={isUploading}
                          removeEntry={removeEntry}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {formError && <div style={s.errorBanner}>{formError}</div>}

        {isUploading && (
          <div style={s.progressBarTrack}>
            <div
              style={{ ...s.progressBarFill, width: `${uploadProgress}%` }}
            />
          </div>
        )}

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
                Uploading {uploadCounts.done}/{uploadCounts.total} files ·{" "}
                {uploadProgress}%
              </>
            ) : uploadResults &&
              uploadResults.failed > 0 &&
              entries.length > 0 ? (
              `Retry Failed (${entries.length})`
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
            {uploadResults.batch_id && (
              <p style={s.batchIdText}>Batch ID: {uploadResults.batch_id}</p>
            )}
          </div>
        )}
      </div>

      <div style={s.previewCol} className="bdu-previewCol">
        <div style={s.previewCard} className="bdu-previewCard">
          {!activeEntry ? (
            <div style={s.previewEmpty}>
              <FolderOpen size={28} />
              <p style={s.previewEmptyText}>
                Select a folder, then choose a file from the list to preview it
                here.
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
                  activeEntry.kind === "archive" ||
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
              {activeEntry.uploadError && (
                <div style={s.logRowError}>
                  Previous error: {activeEntry.uploadError}
                </div>
              )}
              {activeEntry.category && (
                <div style={s.previewFooterMeta}>
                  Category: <strong>{activeEntry.category}</strong>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tab 2 — Upload Logs — success + failed history, filterable         */
/* ================================================================== */

const LOGS_PAGE_SIZE = 20;

function UploadLogsTab({ colors, s }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [uploaderFilter, setUploaderFilter] = useState("");
  const [dtnFilter, setDtnFilter] = useState("");
  const [dtnFilterApplied, setDtnFilterApplied] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [uploaders, setUploaders] = useState([]);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  // Page-based pagination — 1-indexed. offset sent to the API is derived
  // from this: (page - 1) * LOGS_PAGE_SIZE.
  const [page, setPage] = useState(1);
  const [expandedBatches, setExpandedBatches] = useState(() => new Set());
  const [activeLogId, setActiveLogId] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    getUploadLogUploaders()
      .then((res) => setUploaders(res.uploaders || []))
      .catch(() => setUploaders([]));
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / LOGS_PAGE_SIZE));

  const fetchLogs = useCallback(
    async (pageNum) => {
      setIsLoading(true);
      setLoadError("");
      try {
        // dateFrom/dateTo mula sa <input type="date"> ay date-only
        // (YYYY-MM-DD, walang time). Kapag pinasa natin ito ng ganon
        // sa backend at ang column doon ay may laman na timestamp
        // (e.g. "2026-07-08 15:45:00"), yung dateTo == "2026-07-08"
        // ay effectively nagiging midnight (00:00:00) — kaya lahat ng
        // entries sa mismong araw na yun (na may oras na) ay
        // na-eexclude. Kaya i-normalize natin dito bago i-send:
        // dateFrom -> start of day, dateTo -> end of day.
        const normalizedDateFrom = dateFrom
          ? `${dateFrom}T00:00:00.000`
          : undefined;
        const normalizedDateTo = dateTo ? `${dateTo}T23:59:59.999` : undefined;

        const result = await getUploadLogs({
          status: statusFilter !== "all" ? statusFilter : undefined,
          uploadedBy: uploaderFilter || undefined,
          dbDtn: dtnFilterApplied || undefined,
          dateFrom: normalizedDateFrom,
          dateTo: normalizedDateTo,
          limit: LOGS_PAGE_SIZE,
          offset: (pageNum - 1) * LOGS_PAGE_SIZE,
        });
        setLogs(result.data || []);
        setTotal(result.total || 0);
        setPage(pageNum);
      } catch (err) {
        setLoadError(err.message || "Failed to load upload logs.");
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter, uploaderFilter, dtnFilterApplied, dateFrom, dateTo],
  );

  useEffect(() => {
    fetchLogs(1);
    setExpandedBatches(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, uploaderFilter, dtnFilterApplied, dateFrom, dateTo]);

  const activeLog = useMemo(
    () => logs.find((l) => l.id === activeLogId) || null,
    [logs, activeLogId],
  );

  const activeLogEmbedUrl = useMemo(
    () => (activeLog ? toDriveEmbedUrl(activeLog.drive_file_url) : null),
    [activeLog],
  );

  const handleDtnKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setDtnFilterApplied(dtnFilter.trim());
    }
  };

  const handlePrevPage = () => {
    if (page > 1 && !isLoading) fetchLogs(page - 1);
  };
  const handleNextPage = () => {
    if (page < totalPages && !isLoading) fetchLogs(page + 1);
  };

  const toggleBatch = (key) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Group flat log entries into batches (by batch_id). Logs without a
  // batch_id (e.g. older single-file uploads) each become their own
  // one-entry "batch" so nothing gets dropped from the list.
  const batchGroups = useMemo(() => {
    const map = new Map();
    for (const log of logs) {
      const key = log.batch_id || `single-${log.id}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          batchId: log.batch_id || null,
          entries: [],
          dtns: new Set(),
          entryTypes: new Set(),
          uploaders: new Set(),
          succeeded: 0,
          failed: 0,
          latest: log.created_at || null,
        });
      }
      const g = map.get(key);
      g.entries.push(log);
      if (log.db_dtn) g.dtns.add(log.db_dtn);
      if (log.db_entry_type) g.entryTypes.add(log.db_entry_type);
      if (log.uploaded_by_user_name) g.uploaders.add(log.uploaded_by_user_name);
      if (log.status === "success") g.succeeded += 1;
      else g.failed += 1;
      if (log.created_at && (!g.latest || log.created_at > g.latest)) {
        g.latest = log.created_at;
      }
    }
    return Array.from(map.values())
      .map((g) => {
        // Group this batch's entries by DTN — a single batch (e.g. from
        // Batch Folder Upload) can contain multiple DTN folders at once.
        const dtnMap = new Map();
        for (const log of g.entries) {
          const dtnKey = log.db_dtn || "Unknown";
          if (!dtnMap.has(dtnKey)) {
            dtnMap.set(dtnKey, {
              dtn: dtnKey,
              items: [],
              succeeded: 0,
              failed: 0,
            });
          }
          const dg = dtnMap.get(dtnKey);
          dg.items.push(log);
          if (log.status === "success") dg.succeeded += 1;
          else dg.failed += 1;
        }
        const dtnGroups = Array.from(dtnMap.values()).sort((a, b) =>
          a.dtn.localeCompare(b.dtn),
        );
        return {
          ...g,
          dtns: Array.from(g.dtns),
          entryTypes: Array.from(g.entryTypes),
          uploaders: Array.from(g.uploaders),
          total: g.entries.length,
          dtnGroups,
        };
      })
      .sort((a, b) => new Date(b.latest || 0) - new Date(a.latest || 0));
  }, [logs]);

  return (
    <div style={s.layout} className="bdu-layout">
      <div style={s.leftCol} className="bdu-leftCol">
        <div style={s.card} className="bdu-card">
          <div style={s.logsFiltersRow} className="bdu-fieldGrid">
            <Field label="Status" colors={colors}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={s.input}
              >
                <option value="all">All</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </Field>
            <Field label="Uploaded By" colors={colors}>
              <select
                value={uploaderFilter}
                onChange={(e) => setUploaderFilter(e.target.value)}
                style={s.input}
              >
                <option value="">All uploaders</option>
                {uploaders.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ marginTop: 10 }}>
            <Field label="DTN" hint="press Enter to filter" colors={colors}>
              <div style={s.searchRow}>
                <input
                  type="text"
                  value={dtnFilter}
                  onChange={(e) => setDtnFilter(e.target.value)}
                  onKeyDown={handleDtnKeyDown}
                  placeholder="e.g. 20260702095509"
                  style={{ ...s.input, flex: 1, minWidth: 0 }}
                />
                <button
                  type="button"
                  onClick={() => setDtnFilterApplied(dtnFilter.trim())}
                  style={s.searchBtn}
                >
                  <Search size={14} />
                </button>
              </div>
            </Field>
          </div>
          <div style={{ marginTop: 10 }} className="bdu-fieldGrid">
            <Field label="Date From" colors={colors}>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                max={dateTo || undefined}
                style={s.input}
              />
            </Field>
            <Field label="Date To" colors={colors}>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom || undefined}
                style={s.input}
              />
            </Field>
          </div>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              style={s.clearDateLink}
            >
              <X size={12} /> Clear date range
            </button>
          )}
        </div>

        {loadError && <div style={s.errorBanner}>{loadError}</div>}

        <div style={s.fileListCard}>
          <div style={s.fileListHeader}>
            <span>
              {total} log entr{total === 1 ? "y" : "ies"} total · showing page{" "}
              {page} of {totalPages} ({batchGroups.length} batch
              {batchGroups.length === 1 ? "" : "es"} this page)
            </span>
            {isLoading && (
              <Loader2
                size={14}
                style={{ animation: "bdu-spin 1s linear infinite" }}
              />
            )}
          </div>

          {batchGroups.length === 0 && !isLoading ? (
            <p style={s.noResultsText}>
              No upload logs found for these filters.
            </p>
          ) : (
            <div style={s.folderTree}>
              {batchGroups.map((batch) => {
                const isExpanded = expandedBatches.has(batch.key);
                return (
                  <div key={batch.key} style={s.folderGroup}>
                    <button
                      type="button"
                      onClick={() => toggleBatch(batch.key)}
                      style={s.batchHeader}
                    >
                      <ChevronRight
                        size={13}
                        style={{
                          transform: isExpanded
                            ? "rotate(90deg)"
                            : "rotate(0deg)",
                          transition: "transform 120ms ease",
                          flexShrink: 0,
                        }}
                      />
                      <ClipboardList size={14} style={{ flexShrink: 0 }} />
                      <div style={s.batchHeaderInfo}>
                        <span style={s.batchHeaderTitle}>
                          {batch.dtns.length > 0
                            ? batch.dtns.join(", ")
                            : "Unknown DTN"}
                        </span>
                        <span style={s.batchHeaderSub}>
                          {batch.entryTypes.join(", ") || "—"}
                          {batch.uploaders.length > 0 &&
                            ` · By: ${batch.uploaders.join(", ")}`}
                          {batch.latest &&
                            ` · ${new Date(batch.latest).toLocaleString()}`}
                        </span>
                      </div>
                      <span style={s.folderCount}>{batch.total}</span>
                      <span style={s.badgeSuccess}>{batch.succeeded} ok</span>
                      {batch.failed > 0 && (
                        <span style={s.badgeFail}>{batch.failed} failed</span>
                      )}
                    </button>

                    {isExpanded && (
                      <div style={s.dtnGroupWrap}>
                        {batch.dtnGroups.map((dtnGroup) => {
                          const showDtnHeader = batch.dtnGroups.length > 1;
                          return (
                            <div key={dtnGroup.dtn}>
                              {showDtnHeader && (
                                <div style={s.dtnSubHeader}>
                                  <FolderOpen
                                    size={13}
                                    style={{ flexShrink: 0 }}
                                  />
                                  <span style={s.dtnGroupLabel}>
                                    DTN: {dtnGroup.dtn}
                                  </span>
                                  <span style={s.folderCount}>
                                    {dtnGroup.items.length}
                                  </span>
                                  <span style={s.badgeSuccess}>
                                    {dtnGroup.succeeded} ok
                                  </span>
                                  {dtnGroup.failed > 0 && (
                                    <span style={s.badgeFail}>
                                      {dtnGroup.failed} failed
                                    </span>
                                  )}
                                </div>
                              )}
                              <ul
                                style={{
                                  ...s.logsList,
                                  ...(showDtnHeader ? s.dtnGroupBody : {}),
                                }}
                              >
                                {dtnGroup.items.map((log) => {
                                  const kind = kindOfMime(log.mime_type);
                                  const isSuccess = log.status === "success";
                                  const isPreviewable =
                                    isSuccess && !!log.drive_file_url;
                                  const isActive = log.id === activeLogId;
                                  return (
                                    <li
                                      key={log.id}
                                      onClick={() =>
                                        isPreviewable && setActiveLogId(log.id)
                                      }
                                      style={{
                                        ...s.logRow,
                                        ...s.fileItemNested,
                                        ...(isPreviewable
                                          ? { cursor: "pointer" }
                                          : {}),
                                        ...(isActive ? s.logRowActive : {}),
                                      }}
                                    >
                                      <div style={s.logRowTop}>
                                        <span style={s.logRowIcon}>
                                          <KindIcon kind={kind} size={14} />
                                        </span>
                                        <span
                                          style={s.logRowFilename}
                                          title={log.original_filename}
                                        >
                                          {log.original_filename}
                                        </span>
                                        {isSuccess &&
                                          log.error_message?.startsWith(
                                            "Overwritten",
                                          ) && (
                                            <span style={s.badgeInfo}>
                                              ↺ replaced
                                            </span>
                                          )}
                                        <span
                                          style={
                                            isSuccess
                                              ? s.badgeSuccess
                                              : s.badgeFail
                                          }
                                        >
                                          {isSuccess ? (
                                            <>
                                              <CheckCircle2 size={11} /> success
                                            </>
                                          ) : (
                                            <>
                                              <XCircle size={11} /> failed
                                            </>
                                          )}
                                        </span>
                                      </div>
                                      <div style={s.logRowMeta}>
                                        DTN: <strong>{log.db_dtn}</strong>
                                        {log.doc_category && (
                                          <>
                                            {" "}
                                            · Category:{" "}
                                            <strong>{log.doc_category}</strong>
                                          </>
                                        )}{" "}
                                        · Entry Type:{" "}
                                        <strong>{log.db_entry_type}</strong>
                                        {log.created_at && (
                                          <>
                                            {" "}
                                            ·{" "}
                                            {new Date(
                                              log.created_at,
                                            ).toLocaleString()}
                                          </>
                                        )}
                                      </div>
                                      {log.error_message && (
                                        <div
                                          style={
                                            isSuccess
                                              ? s.logRowInfo
                                              : s.logRowError
                                          }
                                        >
                                          {isSuccess
                                            ? `↺ This upload replaced a previous file of the same name (${log.original_filename}) in this DTN/category.`
                                            : log.error_message}
                                        </div>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
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

          {total > 0 && (
            <div style={s.paginationRow}>
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={isLoading || page <= 1}
                style={{
                  ...s.pageBtn,
                  ...(isLoading || page <= 1 ? s.btnDisabled : {}),
                }}
              >
                Previous
              </button>
              <span style={s.pageIndicator}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={isLoading || page >= totalPages}
                style={{
                  ...s.pageBtn,
                  ...(isLoading || page >= totalPages ? s.btnDisabled : {}),
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={s.previewCol} className="bdu-previewCol">
        <div style={s.previewCard} className="bdu-previewCard">
          {!activeLog ? (
            <div style={s.previewEmpty}>
              <FileText size={28} />
              <p style={s.previewEmptyText}>
                Click a successfully uploaded file on the left to preview it
                here.
              </p>
            </div>
          ) : (
            <>
              <div style={s.previewHeader}>
                <span style={s.previewHeaderIcon}>
                  <KindIcon kind={kindOfMime(activeLog.mime_type)} size={15} />
                </span>
                <span
                  style={s.previewHeaderName}
                  title={activeLog.original_filename}
                >
                  {activeLog.original_filename}
                </span>
                {activeLog.drive_file_url && (
                  <a
                    href={activeLog.drive_file_url}
                    target="_blank"
                    rel="noreferrer"
                    style={s.previewOpenLink}
                    title="Open in a new tab"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              <div style={s.previewBody}>
                {kindOfMime(activeLog.mime_type) === "pdf" &&
                activeLogEmbedUrl ? (
                  <iframe
                    src={activeLogEmbedUrl}
                    title={activeLog.original_filename}
                    style={s.previewFrame}
                    className="bdu-previewFrame"
                  />
                ) : (
                  <div style={s.previewUnsupported}>
                    <FileIcon size={36} />
                    <p style={s.previewUnsupportedTitle}>
                      No in-browser preview available for this file type
                    </p>
                    <p style={s.previewUnsupportedHint}>
                      Click the icon above to open it in a new tab.
                    </p>
                  </div>
                )}
              </div>
              <div style={s.previewFooterMeta}>
                DTN: <strong>{activeLog.db_dtn}</strong>
                {activeLog.doc_category && (
                  <>
                    {" "}
                    · Category: <strong>{activeLog.doc_category}</strong>
                  </>
                )}
              </div>
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

function getColors(darkMode) {
  return darkMode
    ? {
        pageBg: "#202020",
        cardBg: "#353535",
        surfaceAlt: "#252525",
        greyBg: "#1d1d1d",
        greyBgHover: "#2d323c",
        cardBorder: "#1d1d1d",
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
      maxWidth: 1600,
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
      gridTemplateColumns: "minmax(0, 400px) 1fr",
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
    detectedDtnBanner: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 12.5,
      color: colors.textPrimary,
      background: colors.accentSoft,
      border: `1px solid ${colors.accent}`,
      borderRadius: 8,
      padding: "8px 11px",
      minWidth: 0,
      boxSizing: "border-box",
    },
    detectedDtnBannerWarn: {
      background: colors.dangerSoft,
      borderColor: colors.danger,
      color: colors.danger,
    },
    detectedDtnBannerInfo: {
      background: colors.accentSoft,
      borderColor: colors.accent,
      color: colors.textPrimary,
    },
    detectedDtnBannerWarnSoft: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 12.5,
      color: colors.danger,
      background: colors.dangerSoft,
      border: `1px solid ${colors.danger}`,
      borderRadius: 8,
      padding: "8px 11px",
      minWidth: 0,
      boxSizing: "border-box",
    },
    batchIdText: {
      fontSize: 11,
      color: colors.textTertiary,
      margin: "10px 0 0",
    },
    logsWrap: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      width: "100%",
      maxWidth: 900,
    },
    logsFiltersRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      minWidth: 0,
    },
    logsList: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: 6,
      maxHeight: "none",
    },
    logRow: {
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: 8,
      padding: "9px 11px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
      minWidth: 0,
      boxSizing: "border-box",
    },
    logRowActive: {
      background: colors.accentSoft,
      borderColor: colors.accent,
    },
    logRowTop: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      minWidth: 0,
    },
    logRowIcon: {
      color: colors.textTertiary,
      display: "flex",
      flexShrink: 0,
    },
    logRowFilename: {
      flex: 1,
      fontSize: 13,
      fontWeight: 600,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      minWidth: 0,
    },
    logRowMeta: {
      fontSize: 11.5,
      color: colors.textTertiary,
      lineHeight: 1.5,
    },
    logRowError: {
      fontSize: 11.5,
      color: colors.danger,
      background: colors.dangerSoft,
      borderRadius: 6,
      padding: "5px 8px",
      marginTop: 2,
    },
    logRowInfo: {
      fontSize: 11.5,
      color: colors.accent,
      background: colors.accentSoft,
      borderRadius: 6,
      padding: "5px 8px",
      marginTop: 2,
    },
    logRowLink: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontSize: 11.5,
      color: colors.accent,
      textDecoration: "none",
      marginTop: 2,
    },
    paginationRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      marginTop: 12,
    },
    pageBtn: {
      border: `1px solid ${colors.cardBorder}`,
      background: colors.greyBg,
      color: colors.textPrimary,
      fontSize: 12.5,
      fontWeight: 600,
      padding: "7px 16px",
      borderRadius: 999,
      cursor: "pointer",
    },
    pageIndicator: {
      fontSize: 12.5,
      fontWeight: 600,
      color: colors.textTertiary,
    },
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

    clearDateLink: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      background: "none",
      border: "none",
      color: colors.danger,
      fontSize: 11.5,
      cursor: "pointer",
      padding: "6px 2px 0",
    },
    noResultsText: {
      fontSize: 12.5,
      color: colors.textTertiary,
      padding: "6px 4px 2px",
      margin: 0,
    },
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

    batchHeader: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      width: "100%",
      padding: "10px 10px",
      background: colors.surfaceAlt,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: 8,
      cursor: "pointer",
      textAlign: "left",
      minWidth: 0,
      boxSizing: "border-box",
      flexWrap: "wrap",
    },
    batchHeaderInfo: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 2,
      minWidth: 0,
      overflow: "hidden",
    },
    batchHeaderTitle: {
      fontSize: 12.5,
      fontWeight: 700,
      color: colors.textPrimary,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    batchHeaderSub: {
      fontSize: 11,
      color: colors.textTertiary,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },

    dtnGroupWrap: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      marginTop: 6,
    },
    dtnSubHeader: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "5px 6px",
      fontSize: 11.5,
      fontWeight: 700,
      color: colors.accent,
      background: colors.accentSoft,
      borderRadius: 6,
      marginLeft: 6,
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
    groupsHeaderActions: {
      display: "flex",
      alignItems: "center",
      gap: 12,
    },
    addFolderLink: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      background: "none",
      border: "none",
      color: colors.accent,
      fontSize: 12,
      cursor: "pointer",
      padding: 0,
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
    dtnGroupHeader: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 6px",
      fontSize: 12.5,
      fontWeight: 700,
      color: colors.accent,
      borderBottom: `1px solid ${colors.cardBorder}`,
      marginBottom: 4,
    },
    dtnGroupLabel: {
      flex: 1,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      minWidth: 0,
    },
    dtnGroupBody: {
      marginLeft: 6,
      paddingLeft: 10,
      borderLeft: `2px solid ${colors.cardBorder}`,
      display: "flex",
      flexDirection: "column",
      gap: 4,
      marginBottom: 8,
      minWidth: 0,
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
      display: "inline-flex",
      alignItems: "center",
      gap: 3,
      background: colors.successSoft,
      color: colors.success,
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 11.5,
      fontWeight: 600,
      flexShrink: 0,
    },
    badgeFail: {
      display: "inline-flex",
      alignItems: "center",
      gap: 3,
      background: colors.dangerSoft,
      color: colors.danger,
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 11.5,
      fontWeight: 600,
      flexShrink: 0,
    },
    badgeInfo: {
      display: "inline-flex",
      alignItems: "center",
      gap: 3,
      background: colors.accentSoft,
      color: colors.accent,
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 11.5,
      fontWeight: 600,
      flexShrink: 0,
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
      minHeight: 800,
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
      minHeight: 800,
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
      minHeight: 800,
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
    progressBarTrack: {
      height: 6,
      borderRadius: 999,
      background: colors.greyBg,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      background: colors.accent,
      transition: "width 300ms ease",
    },
  };
}

export default BulkFolderDocumentUploadPage;
