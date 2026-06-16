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

const STEPS = [
  { label: "Reading PDF contents...", icon: "📖" },
  { label: "Extracting Doctrack Numbers...", icon: "🔍" },
  { label: "Matching DTNs to filenames...", icon: "🔗" },
  { label: "Preparing results...", icon: "✅" },
];

// ── Step Tracker with live counter ──────────────────────────────────────────
function StepTracker({ activeStep, processed, total }) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  const isDone = processed > 0 && processed >= total;

  return (
    <div className="mb-4 space-y-3">
      {/* Step dots */}
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const done = i < activeStep;
          const active = i === activeStep;
          return (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300
                    ${
                      done
                        ? "bg-blue-600 border-blue-600"
                        : active
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    }`}
                >
                  {done ? (
                    <span className="text-white text-xs">✓</span>
                  ) : active ? (
                    <span className="text-blue-500 text-sm animate-spin inline-block">
                      ⟳
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 text-xs">
                      {i + 1}
                    </span>
                  )}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-all duration-300 ${
                    done ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        {STEPS[activeStep]?.label}
      </p>

      {/* Live counter + progress bar */}
      {total > 0 && (
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
              className={`font-medium ${
                isDone
                  ? "text-green-600 dark:text-green-400"
                  : "text-blue-600 dark:text-blue-400"
              }`}
            >
              {pct}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isDone ? "bg-green-500" : "bg-blue-600"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Done / remaining chips */}
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
      )}
    </div>
  );
}

// ── Skeleton row ─────────────────────────────────────────────────────────────
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

// ── Step animation hook ───────────────────────────────────────────────────────
function useStepAnimation() {
  const [activeStep, setActiveStep] = useState(null);
  const timerRef = useRef(null);

  const start = useCallback(() => {
    setActiveStep(0);
    let step = 0;
    timerRef.current = setInterval(() => {
      step += 1;
      if (step >= STEPS.length) {
        clearInterval(timerRef.current);
      } else {
        setActiveStep(step);
      }
    }, 700);
  }, []);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    setActiveStep(null);
  }, []);

  return { activeStep, start, stop };
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DocumentRenamePage() {
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processed, setProcessed] = useState(0); // ← new
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const { activeStep, start: startSteps, stop: stopSteps } = useStepAnimation();

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
      const newFiles = pdfs.filter((f) => !existing.has(f.name));
      return [...prev, ...newFiles];
    });
    setPreview(null);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const removeFile = (name) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    setPreview(null);
  };

  const handlePreview = async () => {
    if (!files.length) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    setProcessed(0);
    startSteps();
    try {
      const result = await previewRenamePdfs(files, setProcessed);
      setPreview(result);
    } catch (err) {
      setError(
        err?.response?.data?.detail ?? "Preview failed. Please try again.",
      );
    } finally {
      stopSteps();
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!files.length) return;
    setDownloading(true);
    setUploadProgress(0);
    setProcessed(0);
    setError(null);
    startSteps();
    try {
      const { blob, summary } = await downloadRenamedPdfs(
        files,
        setUploadProgress,
        setProcessed,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "renamed_pdfs.zip";
      a.click();
      URL.revokeObjectURL(url);
      if (summary.length)
        setPreview({ results: summary, total: summary.length });
    } catch (err) {
      setError(
        err?.response?.data?.detail ?? "Download failed. Please try again.",
      );
    } finally {
      stopSteps();
      setDownloading(false);
      setUploadProgress(0);
    }
  };

  const isBusy = loading || downloading;
  const renamedCount =
    preview?.results?.filter((r) => r.status === "renamed").length ?? 0;
  const notFoundCount =
    preview?.results?.filter((r) => r.status === "dtn_not_found").length ?? 0;

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
        onDragOver={handleDragOver}
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
                setPreview(null);
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

      {/* Step Tracker — now with live counter */}
      {activeStep !== null && (
        <StepTracker
          activeStep={activeStep}
          processed={processed}
          total={files.length}
        />
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

      {/* Upload Progress Bar */}
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

      {/* Skeleton Loader */}
      {isBusy && activeStep !== null && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
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
            <tbody>
              {files.map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Results */}
      {preview && !isBusy && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Results ({preview.total} files)
            </span>
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              ✓ {renamedCount} renamed
            </span>
            {notFoundCount > 0 && (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                ✗ {notFoundCount} DTN not found
              </span>
            )}
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
              {preview.results.map((r, i) => (
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
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
