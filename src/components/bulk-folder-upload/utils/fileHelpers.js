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
 * DTN pattern — EXACTLY 14 digits (YYYYMMDDHHMMSS, e.g. "20250307094701"),
 * as a whole token: bounded by a non-digit (or the string edge) on each side.
 * "20250307094701", "20250307094701 - Company", "Foo-20250307094701" match
 * (DTN in capture group 1); a 15+ digit run does NOT, so we never silently
 * take the first 14 digits of a longer number. (No look-behind — keeps it
 * working on older Safari.)
 */
export const DTN_PATTERN = /(?:^|\D)(\d{14})(?:\D|$)/;

/**
 * Scans path segments (excluding the filename) for the first one carrying a
 * standalone 14-digit DTN token, regardless of how many container folders sit
 * above it. Falls back to the first segment if none match, preserving the
 * generic folder tab's "the selected folder itself is the DTN" behavior.
 */
export function locateDtnInPathParts(parts) {
  for (let i = 0; i < parts.length - 1; i++) {
    const match = parts[i].match(DTN_PATTERN);
    if (match) return { index: i, dtn: match[1] };
  }
  return { index: 0, dtn: parts[0] };
}

/**
 * Strict variant for the FGMP tab: a real 14-digit DTN token must be present
 * somewhere in the folder path. Returns { index: -1, dtn: null } when there
 * is none — the caller surfaces that as "no DTN detected", never invents one
 * from a folder name (which would then fail the whole pseudo-group).
 */
export function locateGmpDtn(parts) {
  for (let i = 0; i < parts.length - 1; i++) {
    const match = parts[i].match(DTN_PATTERN);
    if (match) return { index: i, dtn: match[1] };
  }
  return { index: -1, dtn: null };
}

/**
 * Google Drive's "Download folder" / "Download selected" action names the
 * archive (and, once unpacked, the wrapper folder) as
 *   <name>-<YYYYMMDD>T<HHMMSS>Z-<vol>-<part>   e.g. "Foo-20260603T065956Z-3-001"
 * These carry no meaning for us — without stripping them, uploading a Drive
 * export (often a zip nested inside a zip inside a zip) mirrors every throwaway
 * wrapper into our Drive as a real sub-folder.
 *
 * Matches just the "-<ts>Z-<vol>-<part>" tail, so `.replace()` keeps whatever
 * real name preceded it (which may be the DTN) and `.test()` still flags a
 * whole segment that ends with such a tail as a wrapper to drop.
 */
export const DRIVE_EXPORT_SUFFIX = /-\d{8}T\d{6}Z-\d+-\d+$/;

/**
 * Turns the raw folder segments BETWEEN the DTN folder and the file into the
 * single `doc_category` we store / recreate in Drive.
 *
 * Drops export wrappers (see above) and any segment that just repeats the DTN,
 * then keeps ONLY the file's immediate folder — everything above it is
 * container / export noise.
 *
 * NOTE: this assumes one DTN maps to exactly one application, so a single
 * category level is enough. If a DTN is ever allowed to hold multiple
 * applications, keep more of the path here instead — e.g.
 *   return cleaned.length ? cleaned.join("/") : null;
 * (which preserves the application-name folder above the annex/category).
 */
export function resolveCategory(categoryParts, dtn) {
  const cleaned = categoryParts.filter(
    (seg) => !DRIVE_EXPORT_SUFFIX.test(seg) && seg !== dtn,
  );
  return cleaned.length ? cleaned[cleaned.length - 1] : null;
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