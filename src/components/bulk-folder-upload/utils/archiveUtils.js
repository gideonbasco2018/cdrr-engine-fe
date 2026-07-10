// FILE: src/components/bulk-folder-upload/utils/archiveUtils.js
import JSZip from "jszip";
import { createExtractorFromData } from "node-unrar-js";

const EXT_MIME = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export function guessMimeFromName(name) {
  const ext = name.split(".").pop().toLowerCase();
  return EXT_MIME[ext] || "application/octet-stream";
}

export async function extractZipToEntries(zipFile, pathPrefix) {
  const zip = await JSZip.loadAsync(zipFile);
  const innerFiles = Object.values(zip.files).filter(
    (zf) =>
      !zf.dir &&
      !zf.name.startsWith("__MACOSX") &&
      !zf.name.split("/").pop().startsWith("."),
  );

  const out = [];
  for (const zf of innerFiles) {
    const blob = await zf.async("blob");
    const filename = zf.name.split("/").pop();
    const mime = guessMimeFromName(filename);
    const typedFile = new File([blob], filename, { type: mime });
    out.push({
      file: typedFile,
      relativePath: `${pathPrefix}${zf.name}`,
    });
  }
  return out;
}

export async function extractRarToEntries(rarFile, pathPrefix) {
  const arrayBuffer = await rarFile.arrayBuffer();
  const extractor = await createExtractorFromData({ data: arrayBuffer });
  const { files } = extractor.extract();

  const out = [];
  for (const entry of files) {
    if (entry.fileHeader.flags.directory) continue;
    const name = entry.fileHeader.name.replace(/\\/g, "/");
    const filename = name.split("/").pop();
    if (name.startsWith("__MACOSX") || filename.startsWith(".")) continue;
    if (!entry.extraction) continue; // walang binary data (e.g. skipped/error entry)

    const mime = guessMimeFromName(filename);
    const typedFile = new File([entry.extraction], filename, { type: mime });
    out.push({ file: typedFile, relativePath: `${pathPrefix}${name}` });
  }
  return out;
}

export async function expandArchiveEntries(flat) {
  const expanded = [];
  for (const item of flat) {
    const lowerName = item.file.name.toLowerCase();
    const isZip = lowerName.endsWith(".zip");
    const isRar = lowerName.endsWith(".rar");
    if (!isZip && !isRar) {
      expanded.push(item);
      continue;
    }
    const parts = item.relativePath
      .replace(/\\/g, "/")
      .split("/")
      .filter(Boolean);
    const prefix = parts.slice(0, -1).join("/");

    const archiveBaseName =
      item.file.name.replace(/\.(zip|rar)$/i, "").trim() || "archive";
    const pathPrefix = prefix
      ? `${prefix}/${archiveBaseName}/`
      : `${archiveBaseName}/`;

    try {
      const inner = isZip
        ? await extractZipToEntries(item.file, pathPrefix)
        : await extractRarToEntries(item.file, pathPrefix);
      const innerExpanded = await expandArchiveEntries(inner); // archive-in-archive
      expanded.push(...innerExpanded);
    } catch (err) {
      expanded.push(item);
    }
  }
  return expanded;
}

/**
 * Recursively walks a dropped folder's FileSystemEntry tree (Chrome/Edge
 * drag-and-drop API) and resolves it into a flat list of
 * { file, relativePath } — relativePath is built manually here since
 * dropped files don't carry `webkitRelativePath` the way a
 * <input webkitdirectory> selection does.
 */
export function traverseFileTree(entry, pathPrefix = "") {
  return new Promise((resolve) => {
    if (!entry) {
      resolve([]);
      return;
    }
    if (entry.isFile) {
      entry.file(
        (file) =>
          resolve([{ file, relativePath: `${pathPrefix}${file.name}` }]),
        () => resolve([]),
      );
      return;
    }
    if (entry.isDirectory) {
      const dirReader = entry.createReader();
      let collected = [];
      const readBatch = () => {
        dirReader.readEntries(
          async (batch) => {
            if (!batch.length) {
              const nested = await Promise.all(
                collected.map((child) =>
                  traverseFileTree(child, `${pathPrefix}${entry.name}/`),
                ),
              );
              resolve(nested.flat());
              return;
            }
            // readEntries can return results in chunks — keep reading until empty.
            collected = collected.concat(batch);
            readBatch();
          },
          () => resolve([]),
        );
      };
      readBatch();
      return;
    }
    resolve([]);
  });
}