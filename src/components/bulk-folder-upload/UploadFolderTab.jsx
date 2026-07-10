// FILE: src/components/bulk-folder-upload/UploadFolderTab.jsx
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Loader2,
  AlertCircle,
  Trash2,
  ExternalLink,
  FolderOpen,
  File as FileIcon,
} from "lucide-react";

import { uploadApplicationDocumentSingle } from "../../api/application-documents";
import { expandArchiveEntries, traverseFileTree } from "./utils/archiveUtils";
import {
  MAX_FILE_SIZE,
  ACCEPTED_TYPES,
  formatBytes,
  kindOf,
  buildCategoryTree,
} from "./utils/fileHelpers";
import FolderTreeNode from "./FolderTreeNode";
import KindIcon from "./KindIcon";
import Field from "./Field";

const CONCURRENCY = 3;

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
                      <FileIcon
                        size={13}
                        color={colors.danger}
                        style={{ display: "none" }}
                      />
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

export default UploadFolderTab;
