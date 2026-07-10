// FILE: src/components/bulk-folder-upload/UploadLogsTab.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText,
  File as FileIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  Folder,
  FolderOpen,
  ChevronRight,
  ClipboardList,
  X,
} from "lucide-react";

import {
  getUploadLogs,
  getUploadLogUploaders,
} from "../../api/application-documents";
import { kindOfMime, toDriveEmbedUrl } from "./utils/fileHelpers";
import KindIcon from "./KindIcon";
import Field from "./Field";

/* ================================================================== */
/*  Tab 2 — Upload Logs — success + failed history, filterable         */
/* ================================================================== */

const LOGS_PAGE_SIZE = 20;

const formatBytes = (bytes) => {
  if (bytes === null || bytes === undefined) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * I-convert ang flat list ng logs (may `relative_path` bawat isa, e.g.
 * "EMPAGLIFLOZIN 10-.../PART I/SEC A. INTRODUCTION/INTRODUCTION.pdf")
 * papunta sa isang nested folder tree — kagaya ng ipinapakita sa
 * BulkDocumentUploadPage.jsx bago mag-upload.
 *
 * Logs na walang relative_path (e.g. mga lumang single-file uploads)
 * ay itinuturing na flat files sa root level, gamit na lang ang
 * original_filename.
 */
function buildFileTree(logs) {
  const root = { type: "folder", name: "root", path: "", children: new Map() };

  const ensureFolder = (parent, name, pathKey) => {
    if (!parent.children.has(pathKey)) {
      parent.children.set(pathKey, {
        type: "folder",
        name,
        path: pathKey,
        children: new Map(),
        count: 0,
      });
    }
    return parent.children.get(pathKey);
  };

  logs.forEach((log) => {
    const relPath = log.relative_path;
    const segments = relPath
      ? relPath.split("/").filter(Boolean)
      : [log.original_filename];

    let current = root;
    let pathAcc = "";
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      pathAcc = pathAcc ? `${pathAcc}/${seg}` : seg;
      current = ensureFolder(current, seg, pathAcc);
    }
    const fileName = segments[segments.length - 1];
    const filePath = pathAcc ? `${pathAcc}/${fileName}` : fileName;
    // Kasama ang log.id sa Map key para hindi mag-collide kapag may
    // duplicate relative_path (hal. retry ng failed upload).
    current.children.set(`file:${filePath}:${log.id}`, {
      type: "file",
      name: fileName,
      path: filePath,
      log,
    });
  });

  // I-convert ang Maps -> sorted arrays (folders muna, tapos files),
  // at kwentahin ang bilang ng files sa loob ng bawat folder (recursive).
  const finalize = (node) => {
    const childArr = Array.from(node.children.values());
    const folders = childArr.filter((c) => c.type === "folder");
    const files = childArr.filter((c) => c.type === "file");
    folders.forEach(finalize);
    folders.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));
    node.count = files.length + folders.reduce((sum, f) => sum + f.count, 0);
    node.children = [...folders, ...files];
  };
  finalize(root);
  return root.children;
}

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
  // Mga folder-node na naka-COLLAPSE (default: expanded lahat pagbukas
  // ng isang batch, gaya ng behavior sa BulkDocumentUploadPage.jsx).
  const [collapsedFolders, setCollapsedFolders] = useState(() => new Set());
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
    setCollapsedFolders(new Set());
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

  const toggleFolder = (key) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Group flat log entries into batches (by batch_id). Logs without a
  // batch_id (e.g. older single-file uploads) each become their own
  // one-entry "batch" so nothing gets dropped from the list. Bawat
  // batch ay binuburo sa isang recursive folder tree gamit ang
  // `relative_path`, kagaya ng nasa BulkDocumentUploadPage.jsx.
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
      .map((g) => ({
        ...g,
        dtns: Array.from(g.dtns),
        entryTypes: Array.from(g.entryTypes),
        uploaders: Array.from(g.uploaders),
        total: g.entries.length,
        tree: buildFileTree(g.entries),
      }))
      .sort((a, b) => new Date(b.latest || 0) - new Date(a.latest || 0));
  }, [logs]);

  // ── Recursive renderer: folder nodes at file nodes, parang
  //    BulkDocumentUploadPage.jsx (chevron + folder icon + count badge
  //    per level, files may size/status sa dulo). ──────────────────
  const renderTreeNode = (node, batchKey, depth) => {
    if (node.type === "folder") {
      const folderKey = `${batchKey}::folder:${node.path}`;
      const isCollapsed = collapsedFolders.has(folderKey);
      return (
        <div key={folderKey}>
          <button
            type="button"
            onClick={() => toggleFolder(folderKey)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.35rem",
              width: "100%",
              padding: "0.25rem 0.35rem",
              background: "transparent",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background =
                colors.tableRowHover || "rgba(255,255,255,0.05)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <ChevronRight
              size={11}
              style={{
                transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
                transition: "transform 150ms ease",
                flexShrink: 0,
                marginTop: "0.2rem",
                color: colors.textTertiary,
              }}
            />
            <span
              style={{
                flexShrink: 0,
                marginTop: "0.14rem",
                color: "#f59e0b",
                display: "inline-flex",
              }}
            >
              {isCollapsed ? <Folder size={12} /> : <FolderOpen size={12} />}
            </span>
            <span
              style={{
                fontSize: depth === 0 ? "0.74rem" : "0.7rem",
                fontWeight: 600,
                color: colors.textPrimary,
                lineHeight: 1.35,
                wordBreak: "break-word",
                flex: "1 1 auto",
                minWidth: 0,
              }}
              title={node.name}
            >
              {node.name}
            </span>
            <span
              style={{
                fontSize: "0.58rem",
                fontWeight: 700,
                color: colors.textTertiary,
                background: colors.badgeBg,
                padding: "0.08rem 0.4rem",
                borderRadius: 999,
                flexShrink: 0,
                marginTop: "0.05rem",
              }}
            >
              {node.count}
            </span>
          </button>

          {/* Vertical guide line — nagko-connect papunta sa mga children,
              kagaya ng tree explorer sa VSCode. Mas maliit na indent para
              hindi masyadong maipit ang files kahit maraming levels. */}
          {!isCollapsed && (
            <div
              style={{
                marginLeft: "0.45rem",
                paddingLeft: "0.4rem",
                borderLeft: `1px solid ${colors.cardBorder}`,
                display: "flex",
                flexDirection: "column",
                gap: "0.05rem",
              }}
            >
              {node.children.map((child) =>
                renderTreeNode(child, batchKey, depth + 1),
              )}
            </div>
          )}
        </div>
      );
    }

    // ── File node ── (card style, kagaya ng dati — nasa loob na ng
    // guide-line wrapper kaya hindi na kailangan ng manual indent)
    const log = node.log;
    const kind = kindOfMime(log.mime_type);
    const isSuccess = log.status === "success";
    const isPreviewable = isSuccess && !!log.drive_file_url;
    const isActive = log.id === activeLogId;
    const sizeLabel = formatBytes(log.file_size_bytes);
    const fileKey = `${batchKey}::file:${node.path}:${log.id}`;

    return (
      <div
        key={fileKey}
        onClick={() => isPreviewable && setActiveLogId(log.id)}
        title={!isSuccess ? log.error_message || "" : ""}
        style={{
          ...s.logRow,
          ...s.fileItemNested,
          margin: "0.15rem 0",
          padding: "0.5rem 0.6rem",
          borderRadius: 8,
          ...(isPreviewable ? { cursor: "pointer" } : {}),
          ...(isActive ? s.logRowActive : {}),
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
            width: "100%",
          }}
        >
          {/* Row 1: icon + filename — kinukuha ang BUONG lapad ng box */}
          <div
            style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem" }}
          >
            <span
              style={{ ...s.logRowIcon, marginTop: "0.1rem", flexShrink: 0 }}
            >
              <KindIcon kind={kind} size={14} />
            </span>
            <span
              style={{
                ...s.logRowFilename,
                whiteSpace: "normal",
                overflow: "visible",
                textOverflow: "clip",
                wordBreak: "break-word",
                flex: "1 1 auto",
                minWidth: 0,
              }}
              title={log.original_filename}
            >
              {log.original_filename}
            </span>
          </div>

          {/* Row 2: size sa kaliwa, status badge sa kanan */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: "1.35rem",
            }}
          >
            {sizeLabel ? (
              <span
                style={{
                  fontSize: "0.65rem",
                  color: colors.textTertiary,
                  whiteSpace: "nowrap",
                }}
              >
                {sizeLabel}
              </span>
            ) : (
              <span />
            )}
            <span style={isSuccess ? s.badgeSuccess : s.badgeFail}>
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
        </div>
      </div>
    );
  };

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
                      <div>
                        {batch.tree.map((node) =>
                          renderTreeNode(node, batch.key, 0),
                        )}
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

export default UploadLogsTab;
