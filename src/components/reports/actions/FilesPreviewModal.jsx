// src/components/reports/actions/FilesPreviewModal.jsx
import { useState, useEffect } from "react";
import { getApplicationDocumentsByDtn } from "../../../api/application-documents";

const fileName = (d) => d.original_filename ?? d.file_name ?? "Untitled";

const iconOf = (d) => {
  const n = fileName(d).toLowerCase();
  if (n.endsWith(".pdf")) return "📕";
  if (/\.(jpe?g|png)$/.test(n)) return "🖼️";
  return "📄";
};

const formatBytes = (b) => {
  if (!b && b !== 0) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const previewUrlOf = (d) =>
  d.drive_file_id
    ? `https://drive.google.com/file/d/${d.drive_file_id}/preview`
    : null;

export default function FilesPreviewModal({ record, onClose, colors }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getApplicationDocumentsByDtn(String(record.dtn));
        const list = Array.isArray(res?.data) ? res.data : [];
        setDocs(list);
        if (list.length > 0) setActive(list[0]); // auto-preview ang unang file
      } catch (e) {
        setError(e?.message || "Failed to load files.");
      } finally {
        setLoading(false);
      }
    })();
  }, [record.dtn]);

  const activeUrl = active ? previewUrlOf(active) : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 10001,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 12,
          width: "min(1100px, 100%)",
          height: "min(85vh, 900px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "0.75rem 1rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.6rem",
                fontWeight: 700,
                color: colors.textTertiary,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Uploaded Files {docs.length > 0 && `(${docs.length})`}
            </div>
            <div
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              DTN {record.dtn}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {active?.drive_file_url && (
              <a
                href={active.drive_file_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  color: "#2196F3",
                  textDecoration: "none",
                  padding: "0.25rem 0.6rem",
                  border: "1px solid rgba(33,150,243,0.4)",
                  borderRadius: 6,
                }}
              >
                Open in Drive ↗
              </a>
            )}
            <button
              onClick={onClose}
              style={{
                border: `1px solid ${colors.cardBorder}`,
                background: "transparent",
                color: colors.textTertiary,
                borderRadius: 6,
                width: 28,
                height: 28,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* File list */}
          <div
            style={{
              width: 280,
              flexShrink: 0,
              borderRight: `1px solid ${colors.cardBorder}`,
              overflowY: "auto",
              padding: "0.5rem",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {loading && (
              <span style={{ fontSize: "0.72rem", color: colors.textTertiary }}>
                Loading files…
              </span>
            )}
            {!loading && error && (
              <span style={{ fontSize: "0.72rem", color: "#ef4444" }}>
                {error}
              </span>
            )}
            {!loading && !error && docs.length === 0 && (
              <span style={{ fontSize: "0.72rem", color: colors.textTertiary }}>
                No files uploaded for this DTN.
              </span>
            )}
            {docs.map((doc) => {
              const isActive = active?.id === doc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => setActive(doc)}
                  title={fileName(doc)}
                  style={{
                    textAlign: "left",
                    padding: "0.5rem 0.6rem",
                    borderRadius: 7,
                    border: `1px solid ${isActive ? "#2196F3" : colors.cardBorder}`,
                    background: isActive
                      ? "rgba(33,150,243,0.1)"
                      : "transparent",
                    color: colors.textPrimary,
                    fontSize: "0.72rem",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: 600,
                    }}
                  >
                    {iconOf(doc)} {fileName(doc)}
                  </span>
                  <span
                    style={{ fontSize: "0.6rem", color: colors.textTertiary }}
                  >
                    {[doc.doc_category, formatBytes(doc.file_size_bytes)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Preview pane */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              background: colors.pageBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {!active ? (
              <span style={{ fontSize: "0.75rem", color: colors.textTertiary }}>
                Select a file to preview.
              </span>
            ) : activeUrl ? (
              <iframe
                key={active.id}
                src={activeUrl}
                title={fileName(active)}
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            ) : (
              <span style={{ fontSize: "0.75rem", color: colors.textTertiary }}>
                No preview available for this file.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
