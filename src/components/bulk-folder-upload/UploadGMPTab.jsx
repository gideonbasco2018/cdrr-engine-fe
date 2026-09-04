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
  XCircle,
  File as FileIcon,
} from "lucide-react";

import {
  uploadApplicationDocumentSingle,
  getApplicationDocumentsByDtn,
  prepareApplicationFolders,
} from "../../api/application-documents";
import { getGMPRecords, resolveOrCreateGMPByDtn } from "../../api/gmp";
import { GMP_TRANSACTION_TYPE_OPTIONS } from "../gmp/shared/constants";
import { expandArchiveEntries, traverseFileTree } from "./utils/archiveUtils";
import {
  ACCEPTED_TYPES,
  formatBytes,
  kindOf,
  buildCategoryTree,
  locateGmpDtn,
  resolveCategory,
} from "./utils/fileHelpers";
import FolderTreeNode from "./FolderTreeNode";
import KindIcon from "./KindIcon";
import Field from "./Field";

const CONCURRENCY = 6;
// GMP folder uploads allow larger files than the shared 200 MB default.
const GMP_MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const DTN_FULL_PATTERN = /^\d{14}$/;
// Sentinel key for the "no DTN detected" pseudo-group.
const NO_DTN = "__no_dtn__";
const TRANSACTION_TYPES = GMP_TRANSACTION_TYPE_OPTIONS;

function generateBatchId() {
  return crypto?.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const emptyDraft = () => ({ company: "", transactionType: "", confirmed: false });

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
  // Keeps the latest entries reachable from the unmount cleanup below without
  // re-subscribing the effect on every change (which would revoke URLs still
  // in use).
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    return () => {
      entriesRef.current.forEach((e) => URL.revokeObjectURL(e.previewUrl));
    };
  }, []);

  // Warn before a full page unload (refresh / close / typing a new URL) while
  // an upload is running — the browser can't resume it once the page is gone.
  // In-app tab switches don't unmount this component anymore, so those are safe.
  useEffect(() => {
    if (!isUploading) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isUploading]);

  const activeEntry = useMemo(
    () => entries.find((e) => e.id === activeEntryId) || null,
    [entries, activeEntryId],
  );

  const dtnGroups = useMemo(() => {
    const groups = new Map();
    for (const entry of entries) {
      const key = entry.dtn || NO_DTN;
      if (!groups.has(key)) groups.set(key, { dtn: entry.dtn || null, items: [] });
      groups.get(key).items.push(entry);
    }
    return Array.from(groups.values())
      .map((g) => ({ ...g, tree: buildCategoryTree(g.items) }))
      // Real DTNs first (sorted), the "no DTN" group last.
      .sort((a, b) => {
        if (!a.dtn) return 1;
        if (!b.dtn) return -1;
        return a.dtn.localeCompare(b.dtn);
      });
  }, [entries]);

  const validDtnGroups = useMemo(() => dtnGroups.filter((g) => g.dtn), [dtnGroups]);
  const noDtnCount = useMemo(
    () => dtnGroups.find((g) => !g.dtn)?.items.length ?? 0,
    [dtnGroups],
  );

  // Preview check for each newly-seen DTN: does ANY live record exist for it?
  // No `view: "main"` filter — a DTN whose only record is a sibling reference
  // number still counts as "existing" here, matching what /resolve-or-create-
  // by-dtn does at upload time (so the preview never says "will create" for a
  // DTN that will actually just link).
  const resolveDtn = useCallback(async (dtn) => {
    setDtnResolutions((prev) => ({ ...prev, [dtn]: { status: "checking" } }));

    if (!DTN_FULL_PATTERN.test(dtn)) {
      setDtnResolutions((prev) => ({
        ...prev,
        [dtn]: {
          status: "error",
          error: `"${dtn}" isn't a 14-digit DTN — can't match or create a FGMP record.`,
        },
      }));
      return;
    }

    try {
      const res = await getGMPRecords({ dtn: Number(dtn) });
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
        [dtn]: { status: "error", error: err.message || "FGMP lookup failed." },
      }));
    }
  }, []);

  useEffect(() => {
    validDtnGroups.forEach((g) => {
      if (resolvingRef.current.has(g.dtn)) return;
      resolvingRef.current.add(g.dtn);
      resolveDtn(g.dtn);
    });
  }, [validDtnGroups, resolveDtn]);

  const updateDraft = (dtn, patch) => {
    setNewRecordDrafts((prev) => ({
      ...prev,
      [dtn]: { ...(prev[dtn] || emptyDraft()), ...patch },
    }));
  };

  const pendingNewDtns = useMemo(
    () =>
      validDtnGroups
        .filter((g) => dtnResolutions[g.dtn]?.status === "new" && !newRecordDrafts[g.dtn]?.confirmed)
        .map((g) => g.dtn),
    [validDtnGroups, dtnResolutions, newRecordDrafts],
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

    let noDtn = 0;
    for (const { file, relativePath } of expandedFlat) {
      const parts = relativePath.replace(/\\/g, "/").split("/").filter(Boolean);
      if (parts.length < 2) {
        skipped.push(file.name);
        continue;
      }
      const { index: dtnIndex, dtn } = locateGmpDtn(parts);
      // dtn === null → no 14-digit DTN anywhere in the path. Keep the file so
      // the user can see it, grouped separately, but it can't be uploaded.
      const category = dtn ? resolveCategory(parts.slice(dtnIndex + 1, -1), dtn) : null;
      if (!dtn) noDtn += 1;
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

    const notes = [];
    if (skipped.length)
      notes.push(
        `Skipped ${skipped.length} file(s) with no folder (select a folder, not loose files).`,
      );
    if (noDtn)
      notes.push(
        `${noDtn} file(s) have no 14-digit DTN in their folder path — see the "No DTN detected" group. Put each application's files inside a folder named with its DTN.`,
      );
    setFormError(notes.join(" "));
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
    if (validDtnGroups.length === 0)
      return "None of these files have a 14-digit DTN in their folder path — nothing can be uploaded.";
    // Unsupported / oversized files are no longer a hard block — they are
    // filtered out at upload time and reported per-file (see handleUpload),
    // so one bad file can't stop the rest of the batch.
    const stillChecking = validDtnGroups.some(
      (g) => !dtnResolutions[g.dtn] || dtnResolutions[g.dtn].status === "checking",
    );
    if (stillChecking)
      return "Still looking up FGMP records for the detected DTN(s) — try again in a moment.";
    const unconfirmedNew = validDtnGroups.some((g) => {
      const r = dtnResolutions[g.dtn];
      return r?.status === "new" && !newRecordDrafts[g.dtn]?.confirmed;
    });
    if (unconfirmedNew)
      return "Confirm the new FGMP record details below for each DTN with no existing match before uploading.";
    return "";
  };

  const runUploadBatch = async () => {
    setLiveStatuses({});

    // Resolve every DTN group FRESH at upload time via /resolve-or-create-by-dtn:
    // the server reuses any live record for that DTN (primary OR a sibling ref
    // number) and creates one only when there is none — so a DTN that already
    // has a record always links straight to it, and staging-vs-upload races
    // (record created/deleted meanwhile) can't produce a duplicate.
    const mainDbIdByDtn = {};
    const resolveErrorByDtn = {}; // local — setDtnResolutions won't reflect in this run
    for (const group of dtnGroups) {
      const dtn = group.dtn;
      if (!dtn) continue; // "no DTN" group — handled as skipped below
      const draft = newRecordDrafts[dtn] || emptyDraft();
      try {
        const { record, created } = await resolveOrCreateGMPByDtn(dtn, {
          company: draft.company,
          transactionType: draft.transactionType,
        });
        mainDbIdByDtn[dtn] = record.GMP_ID;
        setDtnResolutions((prev) => ({
          ...prev,
          [dtn]: {
            status: "existing",
            mainDbId: record.GMP_ID,
            referenceNo: record.GMP_REFERENCE_NO,
            justCreated: created,
          },
        }));
      } catch (err) {
        const msg = err.message || "Couldn't resolve or create the FGMP record for this DTN.";
        resolveErrorByDtn[dtn] = msg;
        setDtnResolutions((prev) => ({ ...prev, [dtn]: { status: "error", error: msg } }));
      }
    }

    const resolvedEntries = entries.filter((e) => e.dtn && mainDbIdByDtn[e.dtn]);
    const skippedEntries = entries.filter((e) => !e.dtn || !mainDbIdByDtn[e.dtn]);

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
    const invalidEntries = []; // unsupported type / over the size limit
    for (const entry of resolvedEntries) {
      const key = `${(entry.category || "").toLowerCase()}::${entry.file.name.toLowerCase()}`;
      if (existingKeysByDtn[entry.dtn]?.has(key)) {
        alreadyUploadedEntries.push(entry);
      } else if (!(entry.file.type in ACCEPTED_TYPES)) {
        invalidEntries.push({
          ...entry,
          uploadError: `Unsupported file type${entry.file.type ? ` (${entry.file.type})` : ""}.`,
        });
      } else if (entry.file.size > GMP_MAX_FILE_SIZE) {
        invalidEntries.push({ ...entry, uploadError: "File exceeds the 500 MB limit." });
      } else {
        sentEntries.push(entry);
      }
    }

    const batchId = generateBatchId();
    const total = sentEntries.length;
    setUploadCounts({ done: 0, total });
    setUploadProgress(total ? 1 : 0);

    // Folder key MUST match the backend's ("<dtn>|<category>") so each file
    // can look up its pre-created folder id below.
    const folderKeyOf = (e) => `${e.dtn}|${e.category || ""}`;

    // Create every distinct Drive folder ONCE, up front. Replaces the old
    // serial "upload the first file of each folder one at a time" warm-up:
    // with the folders already in place, all file uploads can run concurrently
    // without racing to create the same folder.
    let folderIdByKey = {};
    if (total > 0) {
      const seen = new Set();
      const folderItems = [];
      for (const e of sentEntries) {
        const k = folderKeyOf(e);
        if (seen.has(k)) continue;
        seen.add(k);
        folderItems.push({ dtn: e.dtn, category: e.category || null });
      }
      try {
        folderIdByKey = await prepareApplicationFolders({
          dbEntryType: "FGMP",
          items: folderItems,
        });
      } catch {
        // Non-fatal: the upload endpoint still resolves the folder itself when
        // no id is supplied — just without the concurrency head start.
        folderIdByKey = {};
      }
    }

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

    const uploadOne = async (idx) => {
      const entry = sentEntries[idx];
      try {
        const r = await uploadApplicationDocumentSingle(
          {
            dbEntryType: "FGMP",
            dbDtn: entry.dtn,
            docCategory: entry.category,
            mainDbId: mainDbIdByDtn[entry.dtn],
            batchId,
            file: entry.file,
            relativePath: entry.relativePath,
            folderId: folderIdByKey[folderKeyOf(entry)],
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
    };

    // Single phase — every file, CONCURRENCY at a time. All folders were
    // pre-created above, so there's no folder-creation race and no need for
    // the old serial "first file per folder" warm-up.
    let cursor = 0;
    const worker = async () => {
      while (cursor < total) {
        await uploadOne(cursor++);
      }
    };
    if (total > 0) {
      const workers = Array.from(
        { length: Math.min(CONCURRENCY, total) },
        () => worker(),
      );
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
    // Invalid files (unsupported type / too big) — mark red with the reason.
    invalidEntries.forEach((entry) => {
      setLiveStatuses((prev) => ({
        ...prev,
        [entry.relativePath]: { success: false, error: entry.uploadError },
      }));
    });
    // DTN-less / unresolved-DTN files never reached the network — mark them
    // red in the tree with the same reason shown in the results list below.
    const skippedReason = (entry) =>
      !entry.dtn
        ? "No 14-digit DTN found in this file's folder path — put the file inside a folder named with its DTN."
        : resolveErrorByDtn[entry.dtn]
          || dtnResolutions[entry.dtn]?.error
          || "Couldn't resolve or create the FGMP record for this DTN.";
    skippedEntries.forEach((entry) => {
      setLiveStatuses((prev) => ({
        ...prev,
        [entry.relativePath]: { success: false, error: skippedReason(entry) },
      }));
    });

    const uploadedNow = results.filter((r) => r && r.success).length;
    const succeeded = uploadedNow + alreadyUploadedEntries.length;
    const grandTotal =
      total +
      alreadyUploadedEntries.length +
      skippedEntries.length +
      invalidEntries.length;
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
      failedEntries.push({ ...entry, uploadError: skippedReason(entry) });
    });
    // Keep invalid files in the list (with their reason) so the user can
    // remove or replace them, then upload again.
    invalidEntries.forEach((entry) => failedEntries.push(entry));

    setEntries(failedEntries);
    setActiveEntryId(failedEntries[0]?.id ?? null);
    setCollapsedFolders(new Set());
  };

  const handleUpload = async () => {
    setFormError("");
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsUploading(true);
    try {
      await runUploadBatch();
    } finally {
      // Always clear the uploading state, even if something threw after the
      // workers finished — otherwise the button stays stuck on "Uploading…".
      setIsUploading(false);
    }
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
            Files are matched to FGMP records by DTN (a 14-digit timestamp
            found in the folder path). A DTN that already has a FGMP record
            links straight to it; a DTN with no matching record needs your
            confirmation before a brand-new FGMP record is created for it —
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
              {entries.length} file(s) · {validDtnGroups.length} DTN(s)
              {noDtnCount > 0 ? ` · ${noDtnCount} with no DTN` : ""}
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
                const isNoDtn = !dtnGroup.dtn;
                const resolution = dtnResolutions[dtnGroup.dtn] || { status: "checking" };
                const draft = newRecordDrafts[dtnGroup.dtn] || emptyDraft();
                return (
                  <div key={dtnGroup.dtn || NO_DTN} style={s.folderGroup}>
                    <div style={s.dtnGroupHeader}>
                      <FolderOpen size={14} style={{ flexShrink: 0 }} />
                      <span style={s.dtnGroupLabel} title={dtnGroup.dtn || "No DTN detected"}>
                        {isNoDtn ? "No DTN detected" : `DTN: ${dtnGroup.dtn}`}
                      </span>
                      <span style={s.folderCount}>{dtnGroup.items.length}</span>
                    </div>
                    <div style={{ padding: "2px 6px 8px" }}>
                      {isNoDtn && (
                        <span style={s.badgeFail}>
                          <AlertCircle size={11} />
                          No 14-digit DTN in the folder path — these files can&apos;t be uploaded.
                          Put each application&apos;s files inside a folder named with its DTN.
                        </span>
                      )}
                      {!isNoDtn && resolution.status === "checking" && (
                        <span style={s.badgeInfo}>
                          <Loader2 size={11} style={{ animation: "bdu-spin 1s linear infinite" }} />
                          Checking FGMP records…
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
                              ? "New FGMP record confirmed — will be created on upload"
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
                            groupKeyPrefix={dtnGroup.dtn || NO_DTN}
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
                          groupKeyPrefix={dtnGroup.dtn || NO_DTN}
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

            {/* Per-file reasons. After an upload `entries` holds exactly the
                files that didn't go through, each with its own `uploadError`. */}
            {entries.some((e) => e.uploadError) && (
              <>
                <p style={{ ...s.groupsHeaderLabel, margin: "10px 0 0" }}>
                  Why these files failed
                </p>
                <ul style={s.resultsErrList}>
                  {entries
                    .filter((e) => e.uploadError)
                    .map((e) => (
                      <li key={e.id} style={{ ...s.resultsErrItem, alignItems: "flex-start" }}>
                        <XCircle size={13} color={colors.danger} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ minWidth: 0 }}>
                          <span
                            style={{ fontWeight: 600, wordBreak: "break-all" }}
                            title={e.relativePath || e.file.name}
                          >
                            {e.file.name}
                          </span>
                          <span style={{ ...s.resultsErrMsg, display: "block", whiteSpace: "normal" }}>
                            {e.uploadError}
                          </span>
                        </span>
                      </li>
                    ))}
                </ul>
              </>
            )}

            {uploadResults.batch_id && (
              <p style={s.batchIdText}>
                Batch ID: {uploadResults.batch_id} — full per-file history is in the{" "}
                <strong>Upload Logs</strong> tab.
              </p>
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
                  activeEntry.kind === "ppt" ||
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
