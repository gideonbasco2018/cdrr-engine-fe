// FILE: src/components/bulk-folder-upload/UploadBulkFilesTab.jsx
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Loader2,
  AlertCircle,
  Trash2,
  ExternalLink,
  FilePlus2,
  FolderOpen,
  File as FileIcon,
} from "lucide-react";

import { uploadApplicationDocumentSingle } from "../../api/application-documents";
import {
  MAX_FILE_SIZE,
  ACCEPTED_TYPES,
  formatBytes,
  kindOf,
} from "./utils/fileHelpers";
import FileEntryItem from "./FileEntryItem";
import KindIcon from "./KindIcon";
import Field from "./Field";

const CONCURRENCY = 3;

const DOC_CATEGORY_OPTIONS = [
  "CLIENT'S INITIAL SUBMISSION",
  "EVALUATOR'S FILE",
  "FDA OUTPUT DOCUMENTS",
  "APPROVED LABEL",
  "COMPLIANCE DOCUMENTS",
];

/* ================================================================== */
/*  Tab 3 — Upload Files (Auto-Folder)                                  */
/*                                                                      */
/*  Loose files lang ang pinipili ng user (hindi folder). Bawat file   */
/*  ay awtomatikong gagawan ng sariling "virtual folder" gamit ang DTN */
/*  na hinango mula sa filename — tapos ang piniling Category          */
/*  (dropdown) ang magiging subfolder sa loob ng DTN bago yung file    */
/*  mismo.                                                              */
/*                                                                      */
/*  Halimbawa (Category = "PRODUCT FILE"):                             */
/*    202994294.pdf                          -> DTN: 202994294         */
/*      => 202994294/PRODUCT FILE/202994294.pdf                        */
/*    DRP-12804_20250307094701 Clean.pdf     -> DTN: 20250307094701    */
/*      => 20250307094701/PRODUCT FILE/DRP-12804_20250307094701 Clean.pdf */
/*                                                                      */
/*  Isang Category lang ang napipili per batch (kagaya ng Entry Type)  */
/*  — ginagamit ito sa lahat ng files na kasama sa upload na ito.      */
/* ================================================================== */

/**
 * DTN pattern — 14-digit na timestamp (YYYYMMDDHHMMSS), e.g.
 * "20250307094701". Ginagamit ito para tama ang makuhang DTN kahit
 * may ibang numero sa filename (e.g. "DRP-12804_...").
 */
const DTN_PATTERN = /\d{14}/;

/**
 * Hanapin muna ang unang 14 consecutive digits sa filename (walang
 * extension) — ito ang DTN (e.g. "DRP-12804_20250307094701 Clean.pdf"
 * -> "20250307094701"). Kapag walang nahanap na 14-digit sequence
 * (hal. yung buong filename mismo ang DTN, tulad ng "202994294.pdf"),
 * babalik sa dating behavior: buong filename (walang extension) ang
 * gagamitin bilang DTN.
 */
function deriveDtnFromFilename(filename) {
  const dotIdx = filename.lastIndexOf(".");
  const base = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
  const trimmedBase = base.trim();

  const match = trimmedBase.match(DTN_PATTERN);
  if (match) return match[0];

  return trimmedBase;
}

function UploadBulkFilesTab({ colors, s }) {
  const [dbEntryType, setDbEntryType] = useState("");
  const [docCategory, setDocCategory] = useState("");
  const [entries, setEntries] = useState([]);
  const [activeEntryId, setActiveEntryId] = useState(null);
  const [liveStatuses, setLiveStatuses] = useState({});

  const [formError, setFormError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCounts, setUploadCounts] = useState({ done: 0, total: 0 });
  const [uploadResults, setUploadResults] = useState(null);

  const fileInputRef = useRef(null);

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

  // Buuin ang buong relative path base sa DTN (per-file) + kasalukuyang
  // piniling Category. Dynamic ito (hindi naka-store sa entry) para
  // laging updated kahit palitan pa ng user yung dropdown bago mag-upload.
  const buildRelativePath = useCallback(
    (entry) => `${entry.dtn}/${docCategory}/${entry.file.name}`,
    [docCategory],
  );

  // I-grupo ang entries per (auto-derived) DTN — walang further nesting
  // dito sa listahan, kaya't flat lang ang bawat group (isa o higit pang
  // files na nagkataong magkapareho ang base filename).
  const dtnGroups = useMemo(() => {
    const groups = new Map();
    for (const entry of entries) {
      if (!groups.has(entry.dtn))
        groups.set(entry.dtn, { dtn: entry.dtn, items: [] });
      groups.get(entry.dtn).items.push(entry);
    }
    return Array.from(groups.values()).sort((a, b) =>
      a.dtn.localeCompare(b.dtn),
    );
  }, [entries]);

  // DTN groups na may 2+ files (magkapareho ang filename minus
  // extension) — sasama sila sa iisang folder, ipapaalam lang sa user.
  const collisions = useMemo(
    () => dtnGroups.filter((g) => g.items.length > 1),
    [dtnGroups],
  );

  const handleFilesAdded = useCallback((fileList) => {
    const skipped = [];
    const newEntries = [];

    for (const file of fileList) {
      const dtn = deriveDtnFromFilename(file.name);
      if (!dtn) {
        skipped.push(file.name);
        continue;
      }
      newEntries.push({
        id: `${dtn}-${file.name}-${file.size}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        file,
        dtn,
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
        `Nalaktawan ang ${skipped.length} file(s) na walang valid na filename.`,
      );
    } else if (newEntries.length) {
      setFormError("");
    }
  }, []);

  const handleFileInputChange = (e) => {
    const fileList = Array.from(e.target.files || []);
    if (!fileList.length) return;
    handleFilesAdded(fileList);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const fileList = Array.from(e.dataTransfer?.files || []);
    if (!fileList.length) {
      setFormError("Walang nakuhang file mula sa drag-and-drop.");
      return;
    }
    handleFilesAdded(fileList);
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
    setDocCategory("");
    setFormError("");
    setUploadResults(null);
    setUploadProgress(0);
    setUploadCounts({ done: 0, total: 0 });
  };

  const validate = () => {
    if (!dbEntryType.trim()) return "Entry Type is required.";
    if (!docCategory.trim()) return "Category is required.";
    if (entries.length === 0) return "Pumili ng kahit isang file.";
    for (const { file } of entries) {
      if (!(file.type in ACCEPTED_TYPES))
        return `"${file.name}" ay hindi supported na file type.`;
      if (file.size > MAX_FILE_SIZE)
        return `"${file.name}" ay lumagpas sa 200MB limit.`;
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
        const relativePath = buildRelativePath(entry);
        try {
          const r = await uploadApplicationDocumentSingle(
            {
              dbEntryType,
              dbDtn: entry.dtn,
              docCategory,
              batchId,
              file: entry.file,
              relativePath,
            },
            (loaded) => {
              loadedBytes[idx] = loaded;
              updateOverallProgress();
            },
          );
          results[idx] = r;
          setLiveStatuses((prev) => ({
            ...prev,
            [entry.id]: { success: r.success, error: r.error },
          }));
        } catch (err) {
          results[idx] = {
            filename: entry.file.name,
            success: false,
            error: err.message || "Upload failed.",
          };
          setLiveStatuses((prev) => ({
            ...prev,
            [entry.id]: { success: false, error: err.message },
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
    if (failedEntries.length === 0) {
      setDbEntryType("");
      setDocCategory("");
    }
    setIsUploading(false);
  };

  return (
    <div style={s.layout} className="bdu-layout">
      <div style={s.leftCol} className="bdu-leftCol">
        <div style={s.card} className="bdu-card">
          <div className="bdu-fieldGrid">
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
                <option value="SURRENDER DUE TO PAC">
                  SURRENDER DUE TO PAC
                </option>
                <option value="ORIGINAL">ORIGINAL</option>
              </select>
            </Field>
            <Field label="Category" required colors={colors}>
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                style={s.input}
              >
                <option value="">Select category</option>
                {DOC_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
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
          className="bdu-dropzone"
          style={{
            ...s.dropzone,
            ...(isDragging ? s.dropzoneActive : {}),
          }}
        >
          <FilePlus2 size={20} />
          <p style={s.dropzoneText}>
            <strong>Select Files</strong> or drag files here
          </p>
          <p style={s.dropzoneHint}>
            Bawat file na i-uupload ay awtomatikong gagawan ng sariling folder
            (DTN), tapos ilalagay sa loob ng piniling Category sa itaas — hindi
            kailangan mag-select ng folder, mga individual na files lang. Kung
            may 14-digit na timestamp sa filename (hal. "20250307094701"), ito
            ang gagamiting DTN; kung wala, ang buong filename (walang extension)
            ang magiging DTN.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            style={{ display: "none" }}
          />
        </div>

        {entries.length > 0 && (
          <div style={s.detectedDtnBanner}>
            <FolderOpen size={14} color={colors.accent} />
            <span>
              {entries.length} file(s) will create {dtnGroups.length} folder
              {dtnGroups.length === 1 ? "" : "s"} (DTN
              {dtnGroups.length === 1 ? "" : "s"}) — e.g.{" "}
              <strong>
                {dtnGroups[0]?.dtn}/{docCategory || "CATEGORY"}/
                {dtnGroups[0]?.items[0]?.file.name}
              </strong>
            </span>
          </div>
        )}

        {collisions.length > 0 && (
          <div style={s.detectedDtnBannerInfo}>
            <AlertCircle size={14} color={colors.accent} />
            <span>
              {collisions.length} filename(s) magkapareho (walang extension)
              kaya magsasama sa iisang folder:{" "}
              <strong>{collisions.map((c) => c.dtn).join(", ")}</strong>
            </span>
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
                onClick={() => fileInputRef.current?.click()}
                style={s.addFolderLink}
              >
                <FilePlus2 size={13} /> Add files
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
              {dtnGroups.map((group) => (
                <div key={group.dtn} style={s.folderGroup}>
                  <div style={s.dtnGroupHeader}>
                    <FolderOpen size={14} style={{ flexShrink: 0 }} />
                    <span style={s.dtnGroupLabel} title={group.dtn}>
                      {group.dtn}
                      {docCategory ? ` / ${docCategory}` : ""}
                    </span>
                    <span style={s.folderCount}>{group.items.length}</span>
                  </div>
                  <div style={s.dtnGroupBody}>
                    <ul style={s.fileList}>
                      {group.items.map((entry) => (
                        <FileEntryItem
                          key={entry.id}
                          entry={entry}
                          s={s}
                          colors={colors}
                          isActive={entry.id === activeEntryId}
                          result={liveStatuses[entry.id]}
                          isUploading={isUploading}
                          onSelect={() => setActiveEntryId(entry.id)}
                          onRemove={() => removeEntry(entry.id)}
                        />
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
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
              <FilePlus2 size={28} />
              <p style={s.previewEmptyText}>
                Pumili ng files, tapos i-click ang isang file sa listahan para
                ma-preview dito.
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
              <div style={s.previewFooterMeta}>
                Path: <strong>{buildRelativePath(activeEntry)}</strong>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default UploadBulkFilesTab;
