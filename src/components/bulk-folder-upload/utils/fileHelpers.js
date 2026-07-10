// FILE: src/components/bulk-folder-upload/utils/fileHelpers.js

export const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB — dapat tugma sa backend limit

export const ACCEPTED_TYPES = {
  "application/pdf": "pdf",
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "doc",
  "application/vnd.ms-excel": "sheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "sheet",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "ppt",

  "application/zip": "archive",
  "application/x-zip-compressed": "archive",
  "application/vnd.rar": "archive",
  "application/x-rar-compressed": "archive",
  "application/x-rar": "archive",
};

export function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function kindOf(file) {
  return ACCEPTED_TYPES[file.type] || "other";
}

/** Best-effort kind detection for already-uploaded Drive documents (by mime_type). */
export function kindOfMime(mimeType) {
  return ACCEPTED_TYPES[mimeType] || "other";
}

/**
 * Google Drive "view"/"open" links (…/file/d/FILE_ID/view) can't be embedded
 * directly in an <iframe> — Drive returns X-Frame-Options: SAMEORIGIN for
 * that route. The `/preview` route, however, is meant for embedding. This
 * pulls the FILE_ID out of whatever link shape we got back from the API and
 * rebuilds it as an embeddable preview URL.
 */
export function toDriveEmbedUrl(url) {
  if (!url) return null;
  const match = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
  const fileId = match ? match[1] : null;
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Gumagawa ng totoong nested folder tree galing sa flat entries kung saan
 * ang `category` field ay "/"-joined path (hal. "PART II/SEC B/2. DRUG
 * PRODUCT"). Ganito rin dapat kahawig ang structure na ginagawa sa
 * Google Drive — hindi dapat isang mahabang flat label na lang.
 */
export function buildCategoryTree(items) {
  const root = {
    key: "__root__",
    label: "General (root)",
    children: new Map(),
    items: [],
  };
  for (const entry of items) {
    if (!entry.category) {
      root.items.push(entry);
      continue;
    }
    const parts = entry.category.split("/").filter(Boolean);
    let node = root;
    let pathAcc = "";
    for (const part of parts) {
      pathAcc = pathAcc ? `${pathAcc}/${part}` : part;
      if (!node.children.has(part)) {
        node.children.set(part, {
          key: pathAcc,
          label: part,
          children: new Map(),
          items: [],
        });
      }
      node = node.children.get(part);
    }
    node.items.push(entry);
  }
  return root;
}

export function countTreeItems(node) {
  let count = node.items.length;
  for (const child of node.children.values()) {
    count += countTreeItems(child);
  }
  return count;
}