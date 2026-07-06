// src/components/applicationCorrection/docHelpers.js

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const ACCEPTED_TYPES = {
  "application/pdf": "pdf",
  "image/jpeg": "image",
  "image/png": "image",
};
export const ACCEPT_ATTR = ".pdf,.jpg,.jpeg,.png";

export function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function kindOf(file) {
  return ACCEPTED_TYPES[file.type] || "other";
}

/** Wraps a raw File into the shape used by the staged-docs list + previews. */
export function makeStagedDoc(file) {
  return {
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    kind: kindOf(file),
    previewUrl: URL.createObjectURL(file),
  };
}