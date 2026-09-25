// FILE: src/components/bulk-folder-upload/FileEntryItem.jsx
import { CheckCircle2, XCircle, Loader2, X } from "lucide-react";
import KindIcon from "./KindIcon";
import { formatBytes } from "./utils/fileHelpers";

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
  // A result (from an upload attempt) always wins once present. Before that,
  // fall back to an error set at processing time (e.g. an archive that
  // couldn't be auto-extracted) so it's visible immediately, not only after
  // the user clicks Upload and it fails downstream.
  const failed = result ? !result.success : Boolean(entry.uploadError);
  const errorText = failed ? (result?.error || entry.uploadError || "Upload failed.") : null;
  return (
    <li
      onClick={onSelect}
      title={errorText || entry.file.name}
      style={{
        ...s.fileItem,
        ...s.fileItemNested,
        ...(isActive ? s.fileItemActive : {}),
        ...(failed ? { flexWrap: "wrap" } : {}),
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
        ) : failed ? (
          <XCircle size={16} color={colors.danger} />
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
      {errorText && (
        <span
          style={{
            flexBasis: "100%",
            fontSize: 11,
            lineHeight: 1.35,
            color: colors.danger,
            marginTop: 2,
          }}
        >
          {errorText}
        </span>
      )}
    </li>
  );
}

export default FileEntryItem;
