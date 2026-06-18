import { useState, useRef, useCallback } from "react";
import { previewRenamePdfs, downloadRenamedPdfs } from "../api/pdf-rename";

const STATUS_STYLES = {
  renamed:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  dtn_not_found: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

const STATUS_LABEL = {
  renamed: "Renamed",
  dtn_not_found: "DTN Not Found",
};

// ── Progress Header ───────────────────────────────────────────────────────────
function ProgressBar({ processed, total }) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  const isDone = processed > 0 && processed >= total;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {isDone ? (
            <span className="font-semibold text-green-600 dark:text-green-400">
              ✅ All {total} files processed
            </span>
          ) : (
            <>
              Processing files...{" "}
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {processed} / {total}
              </span>
            </>
          )}
        </span>
        <span
          className={`font-medium ${isDone ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}`}
        >
          {pct}%
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${isDone ? "bg-green-500" : "bg-blue-600"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!isDone && processed > 0 && (
        <div className="flex gap-3 text-xs">
          <span className="text-green-600 dark:text-green-400 font-medium">
            ✅ {processed} done
          </span>
          <span className="text-gray-400 dark:text-gray-500">
            ⏳ {total - processed} remaining
          </span>
        </div>
      )}
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DocumentRenamePage() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]); // real-time results
  const [total, setTotal] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const isBusy = loading || downloading;
  const isDone = processed > 0 && processed >= total;
  const renamedCount = results.filter((r) => r.status === "renamed").length;
  const notFoundCount = results.filter(
    (r) => r.status === "dtn_not_found",
  ).length;

  const handleFiles = (incoming) => {
    const pdfs = Array.from(incoming).filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf"),
    );
    if (pdfs.length !== incoming.length) {
      setError("Some files were skipped — only PDF files are accepted.");
    } else {
      setError(null);
    }
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...pdfs.filter((f) => !existing.has(f.name))];
    });
    setResults([]);
    setProcessed(0);
    setTotal(0);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const removeFile = (name) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    setResults([]);
    setProcessed(0);
    setTotal(0);
  };

  const resetProgress = () => {
    setResults([]);
    setProcessed(0);
    setTotal(files.length);
    setError(null);
  };

  const handlePreview = async () => {
    if (!files.length) return;
    setLoading(true);
    resetProgress();
    try {
      await previewRenamePdfs(files, (result, done, tot) => {
        setResults((prev) => [...prev, result]);
        setProcessed(done);
        setTotal(tot);
      });
    } catch (err) {
      setError(err?.message ?? "Preview failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!files.length) return;
    setDownloading(true);
    setUploadProgress(0);
    resetProgress();
    try {
      const { blob } = await downloadRenamedPdfs(
        files,
        setUploadProgress,
        (result, done, tot) => {
          setResults((prev) => [...prev, result]);
          setProcessed(done);
          setTotal(tot);
        },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "renamed_pdfs.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message ?? "Download failed. Please try again.");
    } finally {
      setDownloading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          PDF Bulk Rename
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Upload PDF files — the system will read each file and rename it based
          on its Doctrack Number (DTN).
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${
            dragOver
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="text-4xl mb-2">📄</div>
        <p className="text-gray-600 dark:text-gray-300 font-medium">
          Drag & drop PDF files here, or{" "}
          <span className="text-blue-600 dark:text-blue-400 underline">
            browse
          </span>
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Only .pdf files are accepted
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </span>
            <button
              onClick={() => {
                setFiles([]);
                setResults([]);
                setProcessed(0);
                setTotal(0);
              }}
              className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Clear all
            </button>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-48 overflow-y-auto">
            {files.map((file) => (
              <li
                key={file.name}
                className={`flex items-center justify-between px-4 py-2.5 ${isBusy ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-red-500 text-lg ${isBusy ? "animate-pulse" : ""}`}
                  >
                    📕
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  onClick={() => removeFile(file.name)}
                  disabled={isBusy}
                  className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 ml-4 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handlePreview}
          disabled={!files.length || isBusy}
          className="flex-1 py-2.5 px-4 rounded-lg border border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 font-medium text-sm
            hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block animate-spin">⟳</span> Previewing...
            </>
          ) : (
            "Preview Rename"
          )}
        </button>
        <button
          onClick={handleDownload}
          disabled={!files.length || isBusy}
          className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {downloading ? (
            <>
              <span className="inline-block animate-spin">⟳</span>
              {uploadProgress > 0
                ? `Uploading... ${uploadProgress}%`
                : "Processing..."}
            </>
          ) : (
            "Download Renamed ZIP"
          )}
        </button>
      </div>

      {/* Upload Progress Bar (download only) */}
      {downloading && uploadProgress > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Uploading files...</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {uploadProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Real-time Results Table */}
      {(isBusy || results.length > 0) && total > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Results ({total} files)
              </span>
              {renamedCount > 0 && (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  ✓ {renamedCount} renamed
                </span>
              )}
              {notFoundCount > 0 && (
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  ✗ {notFoundCount} DTN not found
                </span>
              )}
            </div>
            <ProgressBar processed={processed} total={total} />
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-4 py-2 font-medium">
                  Original Filename
                </th>
                <th className="text-left px-4 py-2 font-medium">Renamed To</th>
                <th className="text-left px-4 py-2 font-medium">DTN</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {/* Real results so far */}
              {results.map((r, i) => (
                <tr
                  key={i}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 truncate max-w-[180px]">
                    {r.original}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200 font-medium truncate max-w-[180px]">
                    {r.renamed}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 font-mono text-xs">
                    {r.dtn ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[r.status]}`}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {/* Skeleton rows for remaining files */}
              {isBusy &&
                Array.from({ length: total - results.length }).map((_, i) => (
                  <SkeletonRow key={`sk-${i}`} />
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
