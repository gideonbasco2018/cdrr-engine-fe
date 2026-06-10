import { useState, useRef, useCallback } from "react";
import { previewRenamePdfs, downloadRenamedPdfs } from "../api/pdf-rename";

const STATUS_STYLES = {
  renamed: "bg-green-100 text-green-700",
  dtn_not_found: "bg-red-100 text-red-700",
};

const STATUS_LABEL = {
  renamed: "Renamed",
  dtn_not_found: "DTN Not Found",
};

export default function DocumentRenamePage() {
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

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
    try {
      const result = await previewRenamePdfs(files);
      setPreview(result);
    } catch (err) {
      setError(
        err?.response?.data?.detail ?? "Preview failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!files.length) return;
    setDownloading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const { blob, summary } = await downloadRenamedPdfs(
        files,
        setUploadProgress,
      );

      // Trigger ZIP download
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
      setDownloading(false);
      setUploadProgress(0);
    }
  };

  const renamedCount =
    preview?.results?.filter((r) => r.status === "renamed").length ?? 0;
  const notFoundCount =
    preview?.results?.filter((r) => r.status === "dtn_not_found").length ?? 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">PDF Bulk Rename</h1>
        <p className="text-sm text-gray-500 mt-1">
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
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
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
        <p className="text-gray-600 font-medium">
          Drag & drop PDF files here, or{" "}
          <span className="text-blue-600 underline">browse</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Only .pdf files are accepted
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </span>
            <button
              onClick={() => {
                setFiles([]);
                setPreview(null);
              }}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Clear all
            </button>
          </div>
          <ul className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {files.map((file) => (
              <li
                key={file.name}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-red-500 text-lg">📕</span>
                  <span className="text-sm text-gray-700 truncate">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  onClick={() => removeFile(file.name)}
                  className="text-gray-400 hover:text-red-500 ml-4 shrink-0"
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
          disabled={!files.length || loading || downloading}
          className="flex-1 py-2.5 px-4 rounded-lg border border-blue-600 text-blue-600 font-medium text-sm
            hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Previewing..." : "Preview Rename"}
        </button>
        <button
          onClick={handleDownload}
          disabled={!files.length || loading || downloading}
          className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 text-white font-medium text-sm
            hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {downloading
            ? uploadProgress > 0
              ? `Uploading... ${uploadProgress}%`
              : "Processing..."
            : "Download Renamed ZIP"}
        </button>
      </div>

      {/* Upload Progress Bar */}
      {downloading && uploadProgress > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Preview Results */}
      {preview && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-700">
              Results ({preview.total} files)
            </span>
            <span className="text-xs text-green-600 font-medium">
              ✓ {renamedCount} renamed
            </span>
            {notFoundCount > 0 && (
              <span className="text-xs text-red-600 font-medium">
                ✗ {notFoundCount} DTN not found
              </span>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2 font-medium">
                  Original Filename
                </th>
                <th className="text-left px-4 py-2 font-medium">Renamed To</th>
                <th className="text-left px-4 py-2 font-medium">DTN</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preview.results.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-600 truncate max-w-[180px]">
                    {r.original}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800 font-medium truncate max-w-[180px]">
                    {r.renamed}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">
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
