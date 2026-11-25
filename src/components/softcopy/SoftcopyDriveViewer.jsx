// src/components/softcopy/SoftcopyDriveViewer.jsx
// View a letter's softcopy inside the page. Nothing is saved on the computer.
//   · Drive link (paste or drop): the system lists the folder's files itself
//     (backend, read-only service account). Click a file to open it; a ZIP is
//     opened and its files listed. Files are kept in the page's memory only.
//     The folder must be shared with the system's account (Viewer). If it
//     isn't, the viewer falls back to Google's own preview and says why.
//   · ZIP, PDF, image, Excel or text file (drop or "Open ZIP / file", one or
//     many): opened in the page's memory only. ZIPs unzip by themselves,
//     ZIPs inside ZIPs too (3 levels), and many files show as one list.
// Dropping works anywhere in the viewer, even over a preview.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { getSoftcopyDriveAccount, listSoftcopyDrive, getSoftcopyDriveFile } from "../../api/softcopy";
import { FONT } from "../gmp/shared/constants";
import { frameOuter, frameCard, stop } from "./viewFrame";

const ACCENT = "#10b981";

// Drive / Docs link → { embed, open, kind } or null when it isn't one.
export function driveEmbed(raw) {
  let u;
  try { u = new URL(String(raw || "").trim()); } catch { return null; }
  if (u.protocol !== "https:" || !/^(drive|docs)\.google\.com$/.test(u.hostname)) return null;
  const id = (re) => (u.pathname.match(re) || [])[1];
  const folder = id(/\/folders\/([\w-]+)/);
  if (folder) return { kind: "folder", embed: `https://drive.google.com/embeddedfolderview?id=${folder}#list`, open: u.href };
  const doc = u.pathname.match(/^\/(document|spreadsheets|presentation)\/d\/([\w-]+)/);
  if (doc) return { kind: "file", embed: `https://docs.google.com/${doc[1]}/d/${doc[2]}/preview`, open: u.href };
  const file = id(/\/file\/d\/([\w-]+)/) || u.searchParams.get("id");
  if (file && /^[\w-]+$/.test(file)) return { kind: "file", embed: `https://drive.google.com/file/d/${file}/preview`, open: u.href };
  return null;
}

const ext = (name) => (name.match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase();
const IMG = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", bmp: "image/bmp", svg: "image/svg+xml" };
const TEXT = ["txt", "csv", "json", "xml", "log", "md"];
const SHEET = ["xlsx", "xls", "ods"];
const kindOf = (name, mime = "") => {
  const e = ext(name);
  if (e === "pdf" || mime === "application/pdf") return "pdf";
  if (IMG[e]) return "image";
  if (SHEET.includes(e)) return "sheet";
  if (TEXT.includes(e)) return "text";
  if (e === "zip" || /zip/.test(mime)) return "zip";
  if (mime.startsWith("application/vnd.google-apps.")) return "pdf"; // Docs/Sheets/Slides come as PDF
  return "other";
};
const ICON = { pdf: "📕", image: "🖼️", sheet: "📗", text: "📄", zip: "🗜️", other: "📎", folder: "📁" };
const size = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const fmtDate = (s) => (s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");

// Error text, also when the reply is a Blob (file requests)
async function errText(err, fallback) {
  const d = err?.response?.data;
  if (d instanceof Blob) {
    try { return JSON.parse(await d.text()).detail || fallback; } catch { return fallback; }
  }
  return d?.detail || err?.message || fallback;
}

// asView = shown as the page's Drive tab (not a popup): no ✕, Escape does nothing.
export default function SoftcopyDriveViewer({ initialLink = "", title = "", onClose, asView = false, colors, darkMode }) {
  const [link, setLink] = useState(initialLink);
  const [folder, setFolder] = useState(null);   // the system's own list: { link, root_id, root_name, folder_id, path, items }
  const [google, setGoogle] = useState(null);   // fallback: Google's preview { embed, open, kind, reason }
  const [zip, setZip] = useState(null);         // { name, entries: [{ path, name, size, read }], fromDrive }
  const [active, setActive] = useState(null);   // { name, kind, key, url?, text?, html?, blob }
  const [account, setAccount] = useState(null); // the email to share folders with
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState("");         // what's loading, "" = nothing
  const [error, setError] = useState("");
  const fileInput = useRef(null);
  const urls = useRef([]);
  const started = useRef(false);

  // Blob links are freed when the viewer closes
  const makeUrl = (blob) => { const u = URL.createObjectURL(blob); urls.current.push(u); return u; };
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);
  useEffect(() => {
    if (asView) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, asView]);
  useEffect(() => {
    getSoftcopyDriveAccount().then((r) => setAccount(r?.email || null)).catch(() => {});
  }, []);

  // Show the drop layer as soon as something is dragged over the page, so a
  // drop over a preview (iframe) still reaches the viewer.
  useEffect(() => {
    const has = (e) => [...(e.dataTransfer?.types || [])].some((t) => t === "Files" || t === "text/uri-list" || t === "text/plain");
    const enter = (e) => { if (has(e)) setDragOver(true); };
    const end = () => setDragOver(false);
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragend", end);
    window.addEventListener("drop", end);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragend", end);
      window.removeEventListener("drop", end);
    };
  }, []);

  const show = useCallback(async (name, blob, key = name, mime = "") => {
    const kind = kindOf(name, mime);
    const item = { name, kind, blob, key };
    if (kind === "pdf") item.url = makeUrl(new Blob([blob], { type: "application/pdf" }));
    else if (kind === "image") item.url = makeUrl(new Blob([blob], { type: IMG[ext(name)] || blob.type }));
    else if (kind === "text") item.text = (await blob.text()).slice(0, 200000);
    else if (kind === "sheet") {
      const wb = XLSX.read(await blob.arrayBuffer());
      item.html = XLSX.utils.sheet_to_html(wb.Sheets[wb.SheetNames[0]]);
      item.sheetCount = wb.SheetNames.length;
    }
    setActive(item);
  }, []);

  // Auto-unzip: a ZIP becomes the list of files inside it, and a ZIP inside
  // that is unzipped too (up to 3 levels), so no "open this ZIP" step.
  // Everything stays in the page's memory.
  const MAX_DEPTH = 3;
  const unzip = useCallback(async (blob, prefix = "", depth = 1) => {
    const z = await JSZip.loadAsync(blob);
    const files = Object.values(z.files)
      .filter((f) => !f.dir && !f.name.startsWith("__MACOSX/") && !/(^|\/)\.DS_Store$/.test(f.name));
    const out = [];
    for (const f of files) {
      const path = `${prefix}${f.name}`;
      const name = f.name.split("/").pop();
      if (kindOf(name) === "zip" && depth < MAX_DEPTH) {
        try {
          // raw bytes: the unzipper reads these everywhere (a blob it can't always)
          out.push(...(await unzip(await f.async("uint8array"), `${path}/`, depth + 1)));
          continue;
        } catch { /* not a real ZIP: list it as a file */ }
      }
      out.push({ path, name, size: f._data?.uncompressedSize ?? 0, read: () => f.async("blob") });
    }
    return out;
  }, []);
  const byPath = (a, b) => a.path.localeCompare(b.path, undefined, { numeric: true });

  // Show a list of files and open the first PDF (else the first file)
  const showList = useCallback(async (name, entries, fromDrive = false) => {
    entries.sort(byPath);
    setZip({ name, entries, fromDrive });
    setActive(null);
    const first = entries.find((e) => kindOf(e.name) === "pdf") || entries[0];
    if (first) await show(first.name, await first.read(), first.path);
  }, [show]);

  const openZip = useCallback(async (name, blob, fromDrive = false) => {
    await showList(name, await unzip(blob), fromDrive);
  }, [showList, unzip]);

  // Files from the computer (one or many, picked or dropped). ZIPs are
  // unzipped right away; several files show as one list.
  const openFiles = useCallback(async (list) => {
    const files = [...(list || [])];
    if (!files.length) return;
    setError("");
    setBusy(files.length === 1 ? `Opening ${files[0].name}…` : `Opening ${files.length} files…`);
    setGoogle(null);
    setFolder(null);
    try {
      if (files.length === 1 && kindOf(files[0].name) !== "zip") {
        setZip(null);
        await show(files[0].name, files[0]);
        return;
      }
      const entries = [];
      const bad = [];
      for (const f of files) {
        if (kindOf(f.name) === "zip") {
          try {
            entries.push(...(await unzip(f, files.length > 1 ? `${f.name}/` : "")));
          } catch { bad.push(f.name); }
        } else {
          entries.push({ path: f.name, name: f.name, size: f.size, read: async () => f });
        }
      }
      if (bad.length) setError(`Couldn't unzip ${bad.join(", ")}. Is it a real ZIP?`);
      await showList(files.length === 1 ? files[0].name : `${files.length} files`, entries);
    } catch {
      setError(`Couldn't open ${files.map((f) => f.name).join(", ")}.`);
    } finally {
      setBusy("");
    }
  }, [show, showList, unzip]);

  // A file from the Drive list (the server reads it; kept in memory here)
  const openDriveFile = useCallback(async (f, root = folder) => {
    setError("");
    setBusy(`Opening ${f.name}…`);
    try {
      const blob = await getSoftcopyDriveFile(root.root_id, f.id);
      const native = f.mime_type?.startsWith("application/vnd.google-apps.");
      const name = native ? `${f.name}.pdf` : f.name;
      if (kindOf(name, f.mime_type) === "zip") await openZip(name, blob, true);
      else { setZip(null); await show(name, blob, f.id, native ? "application/pdf" : f.mime_type); }
    } catch (err) {
      setError(await errText(err, `Couldn't open ${f.name}.`));
    } finally {
      setBusy("");
    }
  }, [folder, openZip, show]);

  // A Drive link: the system's own list first, Google's preview if it can't.
  const openLink = useCallback(async (value) => {
    const v = String(value || "").trim();
    const g = driveEmbed(v);
    if (!g) { setError("That isn't a Google Drive link. In Drive: Share → Copy link, then paste it here."); return; }
    setError("");
    setLink(v);
    setZip(null);
    setActive(null);
    setGoogle(null);
    setFolder(null);
    setBusy("Reading the Drive folder…");
    try {
      const res = await listSoftcopyDrive(v);
      const f = { ...res, link: v };
      setFolder(f);
      // A link to one file: open it right away
      if (!res.folder_id && res.items.length === 1) await openDriveFile(res.items[0], f);
    } catch (err) {
      setGoogle({ ...g, reason: await errText(err, "The system couldn't read this link.") });
    } finally {
      setBusy("");
    }
  }, [openDriveFile]);

  const openSubfolder = async (folderId) => {
    setError("");
    setBusy("Reading the folder…");
    setZip(null);
    setActive(null);
    try {
      const res = await listSoftcopyDrive(folder.link, folderId === folder.root_id ? null : folderId);
      setFolder({ ...res, link: folder.link });
    } catch (err) {
      setError(await errText(err, "Couldn't open that folder."));
    } finally {
      setBusy("");
    }
  };

  // Opened with a link (Drive column / ⋮ menu): load it once
  useEffect(() => {
    if (started.current || !initialLink) return;
    started.current = true;
    openLink(initialLink);
  }, [initialLink, openLink]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) { openFiles(e.dataTransfer.files); return; }
    const text = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (text) openLink(text.split(/\s+/).find((t) => t.startsWith("http")) || text.trim());
  };

  const pickEntry = async (en) => {
    setBusy(`Opening ${en.name}…`);
    setError("");
    try { await show(en.name, await en.read(), en.path); } catch { setError(`Couldn't open ${en.name}.`); } finally { setBusy(""); }
  };
  const save = (item) => {
    const a = document.createElement("a");
    a.href = item.url || makeUrl(item.blob);
    a.download = item.name;
    a.click();
  };

  const empty = !folder && !google && !zip && !active && !busy;
  const border = colors.cardBorder;
  const subtle = darkMode ? "rgba(255,255,255,0.03)" : "#f8fafc";
  const smallBtn = (primary = false) => ({
    height: 32, padding: "0 12px", fontSize: "0.76rem", fontWeight: 700, fontFamily: FONT, borderRadius: 7, cursor: "pointer",
    border: primary ? "none" : `1px solid ${border}`, background: primary ? ACCENT : "transparent",
    color: primary ? "#fff" : colors.textSecondary, whiteSpace: "nowrap", flex: "0 0 auto",
  });
  const rowBtn = (on) => ({
    width: "100%", display: "flex", gap: 8, alignItems: "flex-start", padding: "7px 10px", textAlign: "left",
    border: "none", borderBottom: `1px solid ${border}`, cursor: "pointer", fontFamily: FONT,
    background: on ? (darkMode ? "rgba(16,185,129,0.12)" : "#ecfdf5") : "transparent",
  });
  const crumb = { padding: 0, border: "none", background: "transparent", color: ACCENT, fontSize: "0.72rem", fontWeight: 600, fontFamily: FONT, cursor: "pointer" };
  const driveOpenUrl = folder
    ? (folder.folder_id ? `https://drive.google.com/drive/folders/${folder.folder_id}` : folder.link)
    : google?.open;

  const preview = useMemo(() => {
    if (!active) return null;
    const box = { width: "100%", height: "100%", border: "none", background: "#fff", borderRadius: 8 };
    if (active.kind === "pdf") return <iframe title={active.name} src={active.url} style={box} />;
    if (active.kind === "image") return (
      <div style={{ width: "100%", height: "100%", overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
        <img src={active.url} alt={active.name} style={{ maxWidth: "100%", height: "auto" }} />
      </div>
    );
    if (active.kind === "text") return (
      <pre style={{ ...box, margin: 0, padding: 14, overflow: "auto", boxSizing: "border-box", fontSize: "0.76rem", color: "#0f172a", whiteSpace: "pre-wrap" }}>{active.text}</pre>
    );
    if (active.kind === "sheet") return (
      <iframe
        title={active.name}
        sandbox=""
        srcDoc={`<style>body{font:12px sans-serif;margin:10px}table{border-collapse:collapse}td{border:1px solid #cbd5e1;padding:3px 6px;vertical-align:top}</style>${active.sheetCount > 1 ? `<p style="color:#64748b">Showing the first of ${active.sheetCount} sheets.</p>` : ""}${active.html}`}
        style={box}
      />
    );
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: colors.textTertiary, fontSize: "0.8rem" }}>
        <span style={{ fontSize: "2rem" }}>{ICON[active.kind]}</span>
        <span>No preview for this file type.</span>
        {active.kind === "zip"
          ? <button type="button" onClick={() => openZip(active.name, active.blob, zip?.fromDrive)} style={smallBtn(true)}>Open this ZIP</button>
          : <button type="button" onClick={() => save(active)} style={smallBtn(true)}>Save this file</button>}
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, colors, openZip]);

  return (
    <div {...frameOuter(asView, onClose)}>
      <div
        onClick={stop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDrop={onDrop}
        style={frameCard(asView, {
          position: "relative", background: darkMode ? "#18191a" : "#fff", borderRadius: 16, width: "100%", maxWidth: 1200,
          height: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        }, colors)}
      >
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: "1 1 200px" }}>
            <h2 style={{ margin: 0, fontSize: "0.96rem", fontWeight: 700, color: colors.textPrimary }}>File Viewer</h2>
            <p style={{ margin: "1px 0 0", fontSize: "0.7rem", color: colors.textTertiary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title || "Drop a Drive link, a ZIP, a PDF or an image anywhere here"}
            </p>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); openLink(link); }}
            style={{ display: "flex", gap: 6, flex: "2 1 320px", minWidth: 0 }}
          >
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Paste a Google Drive link"
              style={{
                flex: 1, minWidth: 0, height: 32, padding: "0 10px", boxSizing: "border-box", fontSize: "0.78rem", fontFamily: FONT,
                borderRadius: 7, border: `1px solid ${colors.inputBorder}`, background: colors.inputBg, color: colors.textPrimary,
              }}
            />
            <button type="submit" disabled={!link.trim() || Boolean(busy)} style={{ ...smallBtn(true), opacity: link.trim() && !busy ? 1 : 0.5 }}>View</button>
            <button type="button" onClick={() => fileInput.current?.click()} style={smallBtn()}>Open ZIP / file</button>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept=".zip,.pdf,image/*,.xlsx,.xls,.csv,.txt"
              style={{ display: "none" }}
              onChange={(e) => { const fs = [...(e.target.files || [])]; e.target.value = ""; openFiles(fs); }}
            />
          </form>
          {!asView && (
            <button onClick={onClose} aria-label="Close" style={{
              width: 32, height: 32, borderRadius: 9, border: `1px solid ${border}`,
              background: "transparent", color: colors.textTertiary, cursor: "pointer", flex: "0 0 auto",
            }}>✕</button>
          )}
        </div>

        {error && (
          <p style={{ margin: "10px 18px 0", fontSize: "0.76rem", color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: 7, border: "1px solid #fecaca" }}>
            ⚠️ {error}
          </p>
        )}

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", padding: 12, gap: 12 }}>
          {/* Empty: a compact drop box in the middle (dropping still works
              anywhere in the viewer) */}
          {empty && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 16 }}>
              {/* A normal file dropper: dashed box, upload icon, "Browse files",
                  the file types under it. Turns green while something is
                  dragged over the viewer. */}
              <div
                onClick={() => fileInput.current?.click()}
                style={{
                  width: "100%", maxWidth: 400, boxSizing: "border-box", padding: "28px 24px", borderRadius: 14,
                  // the page's green: soft tint, green dashes; stronger while dragging
                  border: `2px dashed ${dragOver ? "#10B981" : (darkMode ? "rgba(16,185,129,0.45)" : "#86EFAC")}`,
                  background: dragOver
                    ? (darkMode ? "rgba(16,185,129,0.16)" : "#DCFCE7")
                    : (darkMode ? "rgba(16,185,129,0.06)" : "#F0FDF4"),
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center", cursor: "pointer",
                  transition: "border-color 0.2s ease, background-color 0.2s ease",
                }}
              >
                {/* cloud upload, in a green circle */}
                <span aria-hidden style={{
                  width: 52, height: 52, borderRadius: 999, marginBottom: 4, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: darkMode ? "rgba(16,185,129,0.18)" : "#DCFCE7", color: darkMode ? "#6EE7B7" : "#047857",
                }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4 4 0 0 1 .5 7.97" />
                    <path d="M12 12v8" /><path d="m8.5 15.5 3.5-3.5 3.5 3.5" />
                  </svg>
                </span>
                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: darkMode ? "#ECFDF5" : "#064E3B" }}>Drag &amp; drop files here</span>
                <span style={{ fontSize: "0.74rem", color: darkMode ? "#6EE7B7" : "#047857" }}>or</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); fileInput.current?.click(); }}
                  style={{
                    height: 32, padding: "0 16px", borderRadius: 8, border: "none", fontFamily: FONT,
                    background: "#047857", color: "#FFFFFF", boxShadow: "0 2px 8px rgba(4,120,87,0.25)",
                    fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                  }}
                >Browse files</button>
              </div>
              <span style={{ fontSize: "0.7rem", color: colors.textTertiary, textAlign: "center", lineHeight: 1.5 }}>
                ZIP, PDF, JPG, PNG, XLSX, CSV, TXT · ZIPs unzip by themselves · nothing is saved
                <br />You can also paste a Google Drive link above.
                {account && <> Folders must be shared (Viewer) with <strong>{account}</strong>.</>}
              </span>
            </div>
          )}

          {/* Fallback: Google's preview */}
          {google && (
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 11px", borderRadius: 8, fontSize: "0.72rem", lineHeight: 1.5,
                background: darkMode ? "rgba(245,158,11,0.1)" : "#fffbeb", border: `1px solid ${darkMode ? "rgba(245,158,11,0.3)" : "#fdecc4"}`,
                color: darkMode ? "#fcd34d" : "#92400e",
              }}>
                <span style={{ flex: 1 }}>
                  {google.reason} Showing Google's preview instead (ZIPs stay zipped here).
                </span>
                <a href={google.open} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
                  Open in Drive ↗
                </a>
              </div>
              <iframe
                key={google.embed}
                title="Google Drive"
                src={google.embed}
                allow="autoplay"
                style={{ flex: 1, width: "100%", border: `1px solid ${border}`, borderRadius: 10, background: "#fff" }}
              />
            </div>
          )}

          {/* Left list: a ZIP's files, or the Drive folder */}
          {(zip || folder) && (
            <div style={{ width: 300, flex: "0 0 auto", display: "flex", flexDirection: "column", border: `1px solid ${border}`, borderRadius: 10, overflow: "hidden" }}>
              {zip ? (
                <div style={{ padding: "8px 10px", borderBottom: `1px solid ${border}`, background: subtle }}>
                  {zip.fromDrive && folder && (
                    <button type="button" onClick={() => { setZip(null); setActive(null); }} style={{ ...crumb, marginBottom: 4 }}>‹ Back to {folder.path.at(-1)?.name || folder.root_name}</button>
                  )}
                  <p style={{ margin: 0, fontSize: "0.76rem", fontWeight: 700, color: colors.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={zip.name}>
                    🗜️ {zip.name}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.68rem", color: colors.textTertiary }}>{zip.entries.length} file{zip.entries.length === 1 ? "" : "s"} inside · not saved anywhere</p>
                </div>
              ) : (
                <div style={{ padding: "8px 10px", borderBottom: `1px solid ${border}`, background: subtle }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, fontSize: "0.72rem", color: colors.textTertiary }}>
                    {folder.path.length > 0 ? (
                      <button type="button" onClick={() => openSubfolder(folder.root_id)} style={crumb}>📁 {folder.root_name}</button>
                    ) : (
                      <span style={{ fontWeight: 700, color: colors.textPrimary }}>📁 {folder.root_name}</span>
                    )}
                    {folder.path.map((p, i) => (
                      <React.Fragment key={p.id}>
                        <span>›</span>
                        {i === folder.path.length - 1
                          ? <span style={{ fontWeight: 700, color: colors.textPrimary }}>{p.name}</span>
                          : <button type="button" onClick={() => openSubfolder(p.id)} style={crumb}>{p.name}</button>}
                      </React.Fragment>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <span style={{ flex: 1, fontSize: "0.68rem", color: colors.textTertiary }}>
                      {folder.items.length} item{folder.items.length === 1 ? "" : "s"} · nothing downloaded
                    </span>
                    <a href={driveOpenUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.68rem", color: ACCENT, fontWeight: 600, textDecoration: "none" }}>
                      Open in Drive ↗
                    </a>
                  </div>
                </div>
              )}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {zip ? zip.entries.map((en) => {
                  const on = active?.key === en.path;
                  const sub = en.path.includes("/") ? en.path.slice(0, en.path.lastIndexOf("/")) : "";
                  return (
                    <button key={en.path} type="button" onClick={() => pickEntry(en)} title={en.path} style={rowBtn(on)}>
                      <span style={{ flex: "0 0 auto" }}>{ICON[kindOf(en.name)]}</span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: "0.74rem", fontWeight: on ? 700 : 500, color: colors.textPrimary, wordBreak: "break-word" }}>{en.name}</span>
                        <span style={{ display: "block", fontSize: "0.66rem", color: colors.textTertiary }}>
                          {[sub, en.size ? size(en.size) : ""].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </button>
                  );
                }) : folder.items.length === 0 ? (
                  <p style={{ margin: 12, fontSize: "0.76rem", color: colors.textTertiary }}>This folder is empty.</p>
                ) : folder.items.map((f) => {
                  const on = active?.key === f.id;
                  const k = f.is_folder ? "folder" : kindOf(f.name, f.mime_type);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => (f.is_folder ? openSubfolder(f.id) : openDriveFile(f))}
                      title={f.name}
                      style={{ ...rowBtn(on), cursor: busy ? "wait" : "pointer" }}
                    >
                      <span style={{ flex: "0 0 auto" }}>{ICON[k]}</span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: "0.74rem", fontWeight: on ? 700 : 500, color: colors.textPrimary, wordBreak: "break-word" }}>{f.name}</span>
                        <span style={{ display: "block", fontSize: "0.66rem", color: colors.textTertiary }}>
                          {[f.is_folder ? "Folder" : k === "zip" ? "ZIP · opens unzipped" : "", f.size ? size(f.size) : "", fmtDate(f.modified_at)].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preview */}
          {(zip || folder || active || busy) && !google && (
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {active && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: "0.76rem", fontWeight: 600, color: colors.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ICON[active.kind]} {active.name}
                  </span>
                  {active.kind !== "zip" && (
                    <button type="button" onClick={() => save(active)} style={{ ...smallBtn(), height: 28 }}>Save a copy</button>
                  )}
                </div>
              )}
              <div style={{ flex: 1, minHeight: 0, border: `1px solid ${border}`, borderRadius: 10, overflow: "hidden", background: subtle }}>
                {busy ? (
                  <p style={{ margin: 20, fontSize: "0.8rem", color: colors.textTertiary }}>{busy}</p>
                ) : active ? preview : (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: colors.textTertiary }}>
                    {zip && zip.entries.length === 0 ? "This ZIP is empty." : "Click a file on the left to open it."}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Drop layer: sits above previews so the drop always reaches the viewer */}
        {dragOver && (
          <div
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
            onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false); }}
            onDrop={onDrop}
            onClick={() => setDragOver(false)}
            style={{
              position: "absolute", inset: 0, zIndex: 5, background: darkMode ? "rgba(16,185,129,0.14)" : "rgba(236,253,245,0.9)",
              border: `3px dashed ${ACCENT}`, borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 6, color: "#047857",
            }}
          >
            <span style={{ fontSize: "2rem" }}>📥</span>
            <span style={{ fontSize: "1rem", fontWeight: 700 }}>Drop to open</span>
            <span style={{ fontSize: "0.74rem" }}>A Drive link, a ZIP, a PDF or an image</span>
          </div>
        )}
      </div>
    </div>
  );
}
