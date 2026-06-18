import api from "./axios";

/**
 * Preview rename via SSE stream.
 */
export const previewRenamePdfs = async (files, onProgress) => {
  return _streamRename(files, onProgress);
};

/**
 * Stream process then download ZIP.
 */
export const downloadRenamedPdfs = async (files, onUploadProgress, onProgress) => {
  // Step 1: SSE stream — real-time per-file progress
  await _streamRename(files, onProgress);

  // Step 2: Download ZIP (same as before)
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await api.post("/rename-pdfs", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    responseType: "blob",
    onUploadProgress: (e) => {
      if (e.total) {
        const percent = Math.round((e.loaded * 100) / e.total);
        if (onUploadProgress) onUploadProgress(percent);
      }
    },
  });

  let summary = [];
  const summaryHeader = response.headers["x-rename-summary"];
  if (summaryHeader) {
    try {
      summary = JSON.parse(atob(summaryHeader));
    } catch {
      summary = [];
    }
  }

  return { blob: response.data, summary };
};

/**
 * SSE stream — fetch with same baseURL + auth token as api instance.
 */
async function _streamRename(files, onProgress) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  // Reuse same baseURL and token as the axios instance
  const baseURL = api.defaults.baseURL || "";
  const token =
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token");

  const resp = await fetch(`${baseURL.replace(/\/+$/, "")}/rename-pdfs/stream`, {
    method: "POST",
    body: formData,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || "Stream request failed");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  const results = [];
  let buffer = "";
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop();

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      try {
        const event = JSON.parse(line.slice(5).trim());
        if (event.type === "start") {
          total = event.total;
        } else if (event.type === "result") {
          results.push(event);
          if (onProgress) onProgress(event, results.length, total || files.length);
        }
      } catch {
        // skip malformed
      }
    }
  }

  return results;
}