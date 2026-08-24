// FILE: src/components/bulk-folder-upload/UploadGMPTab.jsx
// "GMP" batch upload tab — like UploadFolderTab, but every detected DTN is
// resolved against actual GMP records before upload: an existing record's
// DTN links straight to it (main_db_id), a DTN with no existing record
// requires the user to confirm a few details and only then gets a brand-new
// GMP record created for it. A DTN's files are never linked onto a
// different DTN's record — matching is always exact.
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Loader2,
  AlertCircle,
  Trash2,
  ExternalLink,
  FolderOpen,
  Link2,
  FilePlus2,
  CheckCircle2,
  File as FileIcon,
} from "lucide-react";

import {
  uploadApplicationDocumentSingle,
  getApplicationDocumentsByDtn,
} from "../../api/application-documents";
import { getGMPRecords, createGMPRecord } from "../../api/gmp";
import { expandArchiveEntries, traverseFileTree } from "./utils/archiveUtils";
import {
  MAX_FILE_SIZE,
  ACCEPTED_TYPES,
  formatBytes,
  kindOf,
  buildCategoryTree,
  locateDtnInPathParts,
} from "./utils/fileHelpers";
import FolderTreeNode from "./FolderTreeNode";
import KindIcon from "./KindIcon";
import Field from "./Field";

const CONCURRENCY = 3;
const DTN_FULL_PATTERN = /^\d{14}$/;
const TRANSACTION_TYPES = [
  "CANCELLATION OF CPR",
  "CORRECTION",
  "RECONSTRUCTION",
  "VALIDITY EXTENSION",
  "SURRENDER DUE TO PAC",
  "ORIGINAL",
  "FGMP",
];

function generateBatchId() {
  return crypto?.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const emptyDraft = () => ({ company: "", transactionType: "", productLine: "", confirmed: false });

/* ================================================================== */
/*  GMP tab — batch folder upload, DTN-matched to GMP records          */
/* ================================================================== */

function UploadGMPTab({ colors, s }) {
  const [entries, setEntries] = useState([]);
  const [activeEntryId, setActiveEntryId] = useState(null);
  const [collapsedFolders, setCollapsedFolders] = useState(() => new Set());
  const [liveStatuses, setLiveStatuses] = useState({});
  const [dtnResolutions, setDtnResolutions] = useState({});
  const [newRecordDrafts, setNewRecordDrafts] = useState({});

  const [formError, setFormError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCounts, setUploadCounts] = useState({ done: 0, total: 0 });
  const [uploadResults, setUploadResults] = useState(null);

  const folderInputRef = useRef(null);
  const resolvingRef = useRef(new Set());

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

  const dtnGroups = useMemo(() => {
    const groups = new Map();
    for (const entry of entries) {
      const dtn = entry.dtn;
      if (!groups.has(dtn)) groups.set(dtn, { dtn, items: [] });
      groups.get(dtn).items.push(entry);
    }
    return Array.from(groups.values())
      .map((g) => ({ ...g, tree: buildCategoryTree(g.items) }))
      .sort((a, b) => a.dtn.localeCompare(b.dtn));
  }, [entries]);

  // Resolve every newly-seen DTN against GET /gmp/?dtn=... exactly once —
  // never re-used across DTNs, so a group with no match never silently
  // rides along on a different DTN's record.
  const resolveDtn = useCallback(async (dtn) => {
    setDtnResolutions((prev) => ({ ...prev, [dtn]: { status: "checking" } }));

    if (!DTN_FULL_PATTERN.test(dtn)) {
      setDtnResolutions((prev) => ({
        ...prev,
        [dtn]: {
          status: "error",
          error: `"${dtn}" isn't a 14-digit DTN — can't match or create a GMP record.`,
        },
      }));
      return;
    }

    try {
      const res = await getGMPRecords({ dtn: Number(dtn), view: "main" });
      const found = (res?.data || [])[0];
      setDtnResolutions((prev) => ({
        ...prev,
        [dtn]: found
          ? {
              status: "existing",
              mainDbId: found.GMP_ID,
              referenceNo: found.GMP_REFERENCE_NO,
            }
          : { status: "new" },
      }));
      if (!found) {
        setNewRecordDrafts((prev) => (prev[dtn] ? prev : { ...prev, [dtn]: emptyDraft() }));
      }
    } catch (err) {
      setDtnResolutions((prev) => ({
        ...prev,
        [dtn]: { status: "error", error: err.message || "GMP lookup failed." },
      }));
    }
  }, []);

  useEffect(() => {
    dtnGroups.forEach((g) => {
      if (resolvingRef.current.has(g.dtn)) return;
      resolvingRef.current.add(g.dtn);
      resolveDtn(g.dtn);
    });
  }, [dtnGroups, resolveDtn]);

  const updateDraft = (dtn, patch) => {
    setNewRecordDrafts((prev) => ({
      ...prev,
      [dtn]: { ...(prev[dtn] || emptyDraft()), ...patch },
    }));
  };

  const pendingNewDtns = useMemo(
    () =>
      dtnGroups
        .filter((g) => dtnResolutions[g.dtn]?.status === "new" && !newRecordDrafts[g.dtn]?.confirmed)
        .map((g) => g.dtn),
    [dtnGroups, dtnResolutions, newRecordDrafts],
  );

  const confirmAllNewRecords = () => {
    setNewRecordDrafts((prev) => {
      const next = { ...prev };
      pendingNewDtns.forEach((dtn) => {
        next[dtn] = { ...(next[dtn] || emptyDraft()), confirmed: true };
      });
      return next;
    });
  };

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
    } catch {
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
      const { index: dtnIndex, dtn } = locateDtnInPathParts(parts);
      const categoryParts = parts.slice(dtnIndex + 1, -1);
      const category = categoryParts.length ? categoryParts.join("/") : null;
      newEntries.push({
        id: `${relativePath}-${file.size}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        file,
        relativePath,
        dtn,
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
        setFormError("Couldn't read that folder — try 'Select Folder' instead.");
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
    setFormError("");
    setUploadResults(null);
    setUploadProgress(0);
    setUploadCounts({ done: 0, total: 0 });
    setCollapsedFolders(new Set());
    setDtnResolutions({});
    setNewRecordDrafts({});
    resolvingRef.current = new Set();
  };

  const validate = () => {
    if (entries.length === 0) return "Select a folder with at least one file.";
    for (const { file } of entries) {
      if (!(file.type in ACCEPTED_TYPES))
        return `"${file.name}" is not a supported file type.`;
      if (file.size > MAX_FILE_SIZE) return `"${file.name}" exceeds the 200MB limit.`;
    }
    const stillChecking = dtnGroups.some(
      (g) => !dtnResolutions[g.dtn] || dtnResolutions[g.dtn].status === "checking",
    );
    if (stillChecking)
      return "Still looking up GMP records for the detected DTN(s) — try again in a moment.";
    const unconfirmedNew = dtnGroups.some((g) => {
      const r = dtnResolutions[g.dtn];
      return r?.status === "new" && !newRecordDrafts[g.dtn]?.confirmed;
    });
    if (unconfirmedNew)
      return "Confirm the new GMP record details below for each DTN with no existing match before uploading.";
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
    setLiveStatuses({});

    // Create GMP records for any brand-new, user-confirmed DTNs first — one
    // record per DTN, never shared across groups.
    const mainDbIdByDtn = {};
    for (const group of dtnGroups) {
      const dtn = group.dtn;
      const resolution = dtnResolutions[dtn];
      if (resolution?.status === "existing") {
        mainDbIdByDtn[dtn] = resolution.mainDbId;
      } else if (resolution?.status === "new") {
        const draft = newRecordDrafts[dtn] || emptyDraft();
        try {
          // GMP_REFERENCE_NO is auto-generated server-side ({dtn}-{seq}).
          const created = await createGMPRecord({
            GMP_DTN: Number(dtn),
            ...(draft.company ? { GMP_LTO_COMPANY: draft.company } : {}),
            ...(draft.transactionType ? { GMP_TRANSACTION_TYPE: draft.transactionType } : {}),
            ...(draft.productLine ? { GMP_PRODUCT_LINE: draft.productLine } : {}),
          });
          mainDbIdByDtn[dtn] = created.GMP_ID;
          setDtnResolutions((prev) => ({
            ...prev,
            [dtn]: {
              status: "existing",
              mainDbId: created.GMP_ID,
              referenceNo: created.GMP_REFERENCE_NO,
            },
          }));
        } catch (err) {
          setDtnResolutions((prev) => ({
            ...prev,
            [dtn]: { status: "error", error: err.message || "Failed to create GMP record." },
          }));
        }
      }
      // status === "error" — leave unresolved; its files are skipped below,
      // and a "Retry" button on the group lets the user re-attempt the
      // lookup/creation without losing the rest of the batch.
    }

    const resolvedEntries = entries.filter((e) => mainDbIdByDtn[e.dtn]);
    const skippedEntries = entries.filter((e) => !mainDbIdByDtn[e.dtn]);

    // Check what's already been saved under each resolved DTN — so
    // re-dropping the same folder (after some files failed earlier) only
    // (re)uploads what's actually missing, never duplicating what already
    // made it in.
    const existingKeysByDtn = {};
    await Promise.all(
      Array.from(new Set(resolvedEntries.map((e) => e.dtn))).map(async (dtn) => {
        try {
          const res = await getApplicationDocumentsByDtn(dtn);
          existingKeysByDtn[dtn] = new Set(
            (res?.data || []).map(
              (doc) =>
                `${(doc.doc_category || "").toLowerCase()}::${(doc.original_filename || "").toLowerCase()}`,
            ),
          );
        } catch {
          existingKeysByDtn[dtn] = new Set();
        }
      }),
    );

    const sentEntries = [];
    const alreadyUploadedEntries = [];
    for (const entry of resolvedEntries) {
      const key = `${(entry.category || "").toLowerCase()}::${entry.file.name.toLowerCase()}`;
      if (existingKeysByDtn[entry.dtn]?.has(key)) alreadyUploadedEntries.push(entry);
      else sentEntries.push(entry);
    }

    const batchId = generateBatchId();
    const total = sentEntries.length;
    setUploadCounts({ done: 0, total });
    setUploadProgress(total ? 1 : 0);

    const loadedBytes = new Array(total).fill(0);
    const totalBytesArr = sentEntries.map((e) => e.file.size);
    const totalBytesSum = totalBytesArr.reduce((a, b) => a + b, 0) || 1;

    const updateOverallProgress = () => {
      const sumLoaded = loadedBytes.reduce((a, b) => a + b, 0);
      setUploadProgress(
        Math.min(99, Math.max(1, Math.round((sumLoaded / totalBytesSum) * 100))),
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
              dbEntryType: "GMP",
              dbDtn: entry.dtn,
              docCategory: entry.category,
              mainDbId: mainDbIdByDtn[entry.dtn],
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

    if (total > 0) {
      const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker());
      await Promise.all(workers);
    }

    // Already-uploaded files never hit the network — mark them as done
    // (green check) so the list clearly shows what was skipped and why.
    alreadyUploadedEntries.forEach((entry) => {
      setLiveStatuses((prev) => ({
        ...prev,
        [entry.relativePath]: { success: true, error: null, alreadyUploaded: true },
      }));
    });

    const uploadedNow = results.filter((r) => r && r.success).length;
    const succeeded = uploadedNow + alreadyUploadedEntries.length;
    const grandTotal = total + alreadyUploadedEntries.length + skippedEntries.length;
    const failed = grandTotal - succeeded;
    setUploadResults({
      total: grandTotal,
      succeeded,
      failed,
      results,
      batch_id: batchId,
    });
    setUploadProgress(100);

    const failedEntries = [];
    sentEntries.forEach((entry, idx) => {
      const r = results[idx];
      if (r && !r.success) failedEntries.push({ ...entry, uploadError: r.error });
      else URL.revokeObjectURL(entry.previewUrl);
    });
    alreadyUploadedEntries.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
    skippedEntries.forEach((entry) => {
      failedEntries.push({
        ...entry,
        uploadError: dtnResolutions[entry.dtn]?.error || "GMP record creation failed.",
      });
    });

    setEntries(failedEntries);
    setActiveEntryId(failedEntries[0]?.id ?? null);
    setCollapsedFolders(new Set());
    setIsUploading(false);
  };

  return (
    <div style={s.layout} className="bdu-layout">
      <div style={s.leftCol} className="bdu-leftCol">
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
          style={{ ...s.dropzone, ...(isDragging ? s.dropzoneActive : {}) }}
        >
          {isExtracting ? (
            <Loader2 size={20} style={{ animation: "bdu-spin 1s linear infinite" }} />
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
            Files are matched to GMP records by DTN (a 14-digit timestamp
            found in the folder path). A DTN that already has a GMP record
            links straight to it; a DTN with no matching record needs your
            confirmation before a brand-new GMP record is created for it —
            files are never linked onto a different DTN's record.
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

        {uploadResults && uploadResults.failed > 0 && entries.length > 0 && (
          <div style={s.detectedDtnBannerWarnSoft}>
            <AlertCircle size={14} color={colors.danger} />
            <span>
              {entries.length} file(s) failed — fix or leave as-is, then click
              Upload again to retry only these.
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
                style={{ ...s.addFolderLink, ...(isExtracting ? s.btnDisabled : {}) }}
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
                const resolution = dtnResolutions[dtnGroup.dtn] || { status: "checking" };
                const draft = newRecordDrafts[dtnGroup.dtn] || emptyDraft();
                return (
                  <div key={dtnGroup.dtn} style={s.folderGroup}>
                    <div style={s.dtnGroupHeader}>
                      <FolderOpen size={14} style={{ flexShrink: 0 }} />
                      <span style={s.dtnGroupLabel} title={dtnGroup.dtn}>
                        DTN: {dtnGroup.dtn}
                      </span>
                      <span style={s.folderCount}>{dtnGroup.items.length}</span>
                    </div>
                    <div style={{ padding: "2px 6px 8px" }}>
                      {resolution.status === "checking" && (
                        <span style={s.badgeInfo}>
                          <Loader2 size={11} style={{ animation: "bdu-spin 1s linear infinite" }} />
                          Checking GMP records…
                        </span>
                      )}
                      {resolution.status === "existing" && (
                        <span style={s.badgeSuccess} title="Files will be attached to this existing record">
                          <Link2 size={11} />
                          Linking to existing record{resolution.referenceNo ? ` ${resolution.referenceNo}` : ""}
                        </span>
                      )}
                      {resolution.status === "error" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={s.badgeFail} title={resolution.error}>
                            <AlertCircle size={11} />
                            {resolution.error}
                          </span>
                          <button
                            type="button"
                            onClick={() => resolveDtn(dtnGroup.dtn)}
                            disabled={isUploading}
                            style={{ ...s.addFolderLink, ...(isUploading ? s.btnDisabled : {}) }}
                          >
                            Retry
                          </button>
                        </div>
                      )}
                      {resolution.status === "new" && (
                        <div
                          style={{
                            marginTop: 6,
                            border: `1px solid ${draft.confirmed ? colors.success : colors.accent}`,
                            borderRadius: 8,
                            padding: 10,
                            background: draft.confirmed ? colors.successSoft : colors.accentSoft,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                          }}
                        >
                          <span style={draft.confirmed ? s.badgeSuccess : s.badgeInfo}>
                            {draft.confirmed ? <CheckCircle2 size={11} /> : <FilePlus2 size={11} />}
                            {draft.confirmed
                              ? "New GMP record confirmed — will be created on upload"
                              : "No matching record — confirm details to create a new one"}
                          </span>

                          <div className="bdu-fieldGrid">
                            <Field label="Company / Applicant" colors={colors}>
                              <input
                                type="text"
                                value={draft.company}
                                disabled={draft.confirmed}
                                onChange={(e) => updateDraft(dtnGroup.dtn, { company: e.target.value })}
                                style={s.input}
                                placeholder="Optional"
                              />
                            </Field>
                            <Field label="Transaction Type" colors={colors}>
                              <select
                                value={draft.transactionType}
                                disabled={draft.confirmed}
                                onChange={(e) => updateDraft(dtnGroup.dtn, { transactionType: e.target.value })}
                                style={s.input}
                              >
                                <option value="">Select (optional)</option>
                                {TRANSACTION_TYPES.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </Field>
                          </div>
                          <Field label="Product Line" colors={colors}>
                            <input
                              type="text"
                              value={draft.productLine}
                              disabled={draft.confirmed}
                              onChange={(e) => updateDraft(dtnGroup.dtn, { productLine: e.target.value })}
                              style={s.input}
                              placeholder="Optional"
                            />
                          </Field>

                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            {draft.confirmed ? (
                              <button
                                type="button"
                                onClick={() => updateDraft(dtnGroup.dtn, { confirmed: false })}
                                style={s.addFolderLink}
                              >
                                Edit details
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateDraft(dtnGroup.dtn, { confirmed: true })}
                                style={{ ...s.primaryBtn, width: "auto", padding: "6px 14px", fontSize: 12.5 }}
                              >
                                <CheckCircle2 size={13} /> Confirm new record for {dtnGroup.dtn}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={s.dtnGroupBody}>
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

        <div
          style={{
            position: "sticky",
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 10,
            marginTop: 4,
            marginBottom: -10,
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 12,
            boxShadow: `0 -8px 14px -8px ${colors.cardBorder}`,
            zIndex: 5,
          }}
        >
          {formError && <div style={s.errorBanner}>{formError}</div>}

          {isUploading && (
            <div style={s.progressBarTrack}>
              <div style={{ ...s.progressBarFill, width: `${uploadProgress}%` }} />
            </div>
          )}

          <div style={{ ...s.actions, gap: 8 }}>
            {pendingNewDtns.length > 0 && (
              <button
                type="button"
                onClick={confirmAllNewRecords}
                disabled={isUploading}
                style={{
                  ...s.primaryBtn,
                  width: "auto",
                  flex: "0 0 auto",
                  background: "transparent",
                  color: colors.accent,
                  border: `1px solid ${colors.accent}`,
                  ...(isUploading ? s.btnDisabled : {}),
                }}
              >
                <CheckCircle2 size={14} /> Confirm all new ({pendingNewDtns.length})
              </button>
            )}
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || entries.length === 0}
              style={{
                ...s.primaryBtn,
                flex: 1,
                ...(isUploading || entries.length === 0 ? s.btnDisabled : {}),
              }}
            >
              {isUploading ? (
                <>
                  <Loader2 size={15} style={{ animation: "bdu-spin 1s linear infinite" }} />
                  Uploading {uploadCounts.done}/{uploadCounts.total} files · {uploadProgress}%
                </>
              ) : uploadResults && uploadResults.failed > 0 && entries.length > 0 ? (
                `Retry Failed (${entries.length})`
              ) : (
                `Upload${entries.length ? ` (${entries.length})` : ""}`
              )}
            </button>
          </div>
        </div>

        {uploadResults && (
          <div style={s.resultsCard}>
            <div style={s.resultsSummary}>
              <span style={s.resultsTotal}>{uploadResults.total} processed</span>
              <span style={s.badgeSuccess}>{uploadResults.succeeded} successful</span>
              {uploadResults.failed > 0 && (
                <span style={s.badgeFail}>{uploadResults.failed} failed</span>
              )}
            </div>
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
                Select a folder, then choose a file from the list to preview
                it here.
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
                <span style={s.previewHeaderSize}>{formatBytes(activeEntry.file.size)}</span>
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
                    <img src={activeEntry.previewUrl} alt={activeEntry.file.name} style={s.previewImage} />
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
                <div style={s.logRowError}>Previous error: {activeEntry.uploadError}</div>
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

export default UploadGMPTab;
