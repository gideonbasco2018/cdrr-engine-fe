// FILE: src/pages/ChecklistPage.jsx
// Checklist maker for a batch of forwarded DTNs. The
// receiver clicks "New Checklist", inserts each DTN with the barcode reader
// (it types the code + Enter into the focused box) or by typing, then
// exports the list as PDF or Excel. Insert date/time is set by the server.
import { useState, useEffect, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { getColorScheme } from "../components/donation/colorScheme";
import ChecklistConfirmModal from "../components/checklist/ChecklistConfirmModal";
import {
  getChecklists,
  createChecklist,
  getChecklist,
  deleteChecklist,
  addChecklistItem,
  deleteChecklistItem,
  getChecklistBin,
  updateChecklistLabel,
  getServerTime,
  refreshChecklistSubjects,
} from "../api/checklist";


// The server sends Manila times with no zone attached ("2026-10-05T11:00:00").
// Read them as +08:00 and always show them in Manila time, so a PC set to
// another time zone still shows the right time. Times that already carry a
// zone (e.g. "...Z") are read as-is.
const MANILA = "Asia/Manila";
const toDate = (iso) => new Date(/([zZ]|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}+08:00`);
const fmtDate = (iso) =>
  iso ? toDate(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit", timeZone: MANILA }) : "";
const fmtTime = (iso) =>
  iso ? toDate(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: MANILA }) : "";
const fmtDateTime = (iso) => (iso ? `${fmtDate(iso)} ${fmtTime(iso)}` : "");

// Subject text for a row, from its FIS lookup status. FIS subjects can hold
// "║" as a separator — shown as a new line (same as MetricDetailModal).
const NOT_FOUND_IN_FIS = "Not found in FIS";
const subjectText = (item) => {
  if (item.subject_status === "found") return (item.subject || "").replace(/\s*║\s*/g, "\n").trim();
  if (item.subject_status === "not_found") return NOT_FOUND_IN_FIS;
  return "";
};

// "Generated:" time for the exports — from the server's clock, so a wrong PC
// clock can't show on the printout. Falls back to the PC clock if the
// server can't be reached.
const generatedNow = async () => {
  try {
    return fmtDateTime(await getServerTime());
  } catch {
    return fmtDateTime(new Date().toISOString());
  }
};

const errorText = (err, fallback) => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg.replace(/^Value error, /, "");
  return fallback;
};

function ChecklistPage({ darkMode }) {
  const colors = getColorScheme(darkMode);

  const [checklists, setChecklists] = useState([]);
  const [active, setActive] = useState(null);
  const [dtnInput, setDtnInput] = useState("");
  const [message, setMessageState] = useState(null); // { type: "ok" | "error", text, id }
  const [loading, setLoading] = useState(false);
  // Removed DTNs of the open checklist — read-only, no restore.
  const [bin, setBin] = useState([]);
  const [showBin, setShowBin] = useState(false);
  // Open confirm modal: { kind: "remove", item } | { kind: "delete" } | null
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [refreshingSubjects, setRefreshingSubjects] = useState(false);
  // Batch label (e.g. "URGENT", "CPR") — typed here, saved on Enter / blur.
  const [labelDraft, setLabelDraft] = useState("");
  const savedLabelRef = useRef("");

  useEffect(() => {
    setLabelDraft(active?.label || "");
    savedLabelRef.current = active?.label || "";
  }, [active?.id, active?.label]);

  // Every new message gets its own id — used as the banner's key so the
  // pulse/glow replays even when the same text shows twice in a row.
  const messageIdRef = useRef(0);
  const setMessage = (m) => setMessageState(m && { ...m, id: ++messageIdRef.current });

  const dtnInputRef = useRef(null);
  // Inserts are sent one after another so a fast barcode reader never loses one.
  const insertQueueRef = useRef(Promise.resolve());

  const loadChecklists = useCallback(async () => {
    try {
      setChecklists(await getChecklists());
    } catch (err) {
      setMessage({ type: "error", text: errorText(err, "Could not load checklists.") });
    }
  }, []);

  useEffect(() => {
    loadChecklists();
  }, [loadChecklists]);

  const focusDtnInput = () => setTimeout(() => dtnInputRef.current?.focus(), 0);

  const loadBin = async (id) => {
    try {
      setBin(await getChecklistBin(id));
    } catch {
      setBin([]);
    }
  };

  const openChecklist = async (id) => {
    setLoading(true);
    setMessage(null);
    setShowBin(false);
    try {
      setActive(await getChecklist(id));
      loadBin(id);
      focusDtnInput();
    } catch (err) {
      setMessage({ type: "error", text: errorText(err, "Could not open checklist.") });
    } finally {
      setLoading(false);
    }
  };

  const handleNewChecklist = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const created = await createChecklist();
      setActive(created);
      setBin([]);
      setShowBin(false);
      loadChecklists();
      focusDtnInput();
    } catch (err) {
      setMessage({ type: "error", text: errorText(err, "Could not create checklist.") });
    } finally {
      setLoading(false);
    }
  };

  // Keep the side list's "N DTNs" in step with inserts/removes, no reload needed.
  const bumpListCount = (checklistId, delta) =>
    setChecklists((prev) =>
      prev.map((c) =>
        c.id === checklistId ? { ...c, item_count: Math.max(0, c.item_count + delta) } : c,
      ),
    );

  // Split what was typed/pasted into DTNs. Separators can be spaces,
  // commas, semicolons or new lines; a run of digits whose length is a
  // multiple of 14 (e.g. two DTNs pasted with no gap) is cut into 14s.
  const parseDtns = (raw) => {
    const valid = [];
    const invalid = [];
    for (const token of raw.split(/[\s,;]+/).filter(Boolean)) {
      if (/^\d+$/.test(token) && token.length % 14 === 0) {
        for (let i = 0; i < token.length; i += 14) valid.push(token.slice(i, i + 14));
      } else {
        invalid.push(token);
      }
    }
    return { valid: [...new Set(valid)], invalid };
  };

  // allowMultiple: true for typed/pasted input (several DTNs allowed),
  // false for barcode reader input (exactly one 14-digit DTN, as before).
  const submitDtn = (raw, allowMultiple) => {
    const text = raw.trim();
    if (!text || !active) return;
    const { valid, invalid } = allowMultiple
      ? parseDtns(text)
      : /^\d{14}$/.test(text)
        ? { valid: [text], invalid: [] }
        : { valid: [], invalid: [text] };

    // One DTN — same messages as before.
    if (valid.length + invalid.length === 1) {
      if (invalid.length) {
        setMessage({ type: "error", text: `DTN ${invalid[0]} is not valid. It must be 14 digits.` });
        return;
      }
    } else if (!valid.length) {
      setMessage({ type: "error", text: `Not valid (must be 14 digits): ${invalid.join(", ")}.` });
      return;
    }

    const checklistId = active.id;
    insertQueueRef.current = insertQueueRef.current.then(async () => {
      const added = [];
      const duplicates = [];
      const failed = [];
      let lastError = null;
      for (const dtn of valid) {
        try {
          const item = await addChecklistItem(checklistId, dtn);
          setActive((prev) =>
            prev && prev.id === checklistId ? { ...prev, items: [...prev.items, item] } : prev,
          );
          bumpListCount(checklistId, 1);
          added.push(dtn);
        } catch (err) {
          lastError = err;
          if (err?.response?.status === 409) duplicates.push(dtn);
          else failed.push(dtn);
        }
      }

      if (valid.length === 1 && !invalid.length) {
        setMessage(
          added.length
            ? { type: "ok", text: `DTN ${valid[0]} added to this checklist.` }
            : { type: "error", text: errorText(lastError, `Could not add ${valid[0]}.`) },
        );
        return;
      }

      const parts = [];
      if (added.length) parts.push(`${added.length} DTN${added.length === 1 ? "" : "s"} added.`);
      if (duplicates.length) parts.push(`Already in this checklist: ${duplicates.join(", ")}.`);
      if (failed.length) parts.push(`Could not add: ${failed.join(", ")}.`);
      if (invalid.length) parts.push(`Not valid (must be 14 digits): ${invalid.join(", ")}.`);
      const allGood = !duplicates.length && !failed.length && !invalid.length;
      setMessage({ type: allGood ? "ok" : "error", text: parts.join(" ") });
    });
  };

  // Tell barcode reader input from manual typing: a reader "types" the whole
  // code in a burst (a few ms per key), a person is far slower, and a paste
  // is always manual. Only manual input may hold several DTNs.
  const keyTimesRef = useRef([]);
  const pastedRef = useRef(false);
  const READER_MAX_AVG_KEY_MS = 35;

  const isBarcodeReaderInput = () => {
    if (pastedRef.current) return false;
    const t = keyTimesRef.current;
    if (t.length < 10) return false;
    return (t[t.length - 1] - t[0]) / (t.length - 1) < READER_MAX_AVG_KEY_MS;
  };

  const handleDtnKeyDown = (e) => {
    if (e.key !== "Enter") {
      if (e.key.length === 1) keyTimesRef.current.push(performance.now());
      return;
    }
    e.preventDefault();
    submitDtn(dtnInput, !isBarcodeReaderInput());
    setDtnInput("");
    keyTimesRef.current = [];
    pastedRef.current = false;
  };

  const handleDtnChange = (e) => {
    setDtnInput(e.target.value);
    if (!e.target.value) {
      keyTimesRef.current = [];
      pastedRef.current = false;
    }
  };

  // Barcode reader input that lands OUTSIDE the DTN box (cursor left in the
  // Label box, on a button, or nowhere): watch keys page-wide and, when a
  // fast burst of exactly 14 digits ends in Enter, insert it as a DTN.
  // The Enter is swallowed so it can't save the label or click a button,
  // and if the digits went into the Label box, the label is put back.
  const labelInputRef = useRef(null);
  const burstRef = useRef({ times: [], digits: "", target: null, before: "" });
  const latestRef = useRef({});
  latestRef.current = { active, submitDtn, setMessage, confirmOpen: !!confirm };
  const BURST_KEY_GAP_MS = 100; // a pause longer than this ends a burst

  useEffect(() => {
    const resetBurst = () => {
      burstRef.current = { times: [], digits: "", target: null, before: "" };
    };
    const onKeyDown = (e) => {
      if (e.target === dtnInputRef.current) {
        resetBurst(); // the DTN box handles its own input
        return;
      }
      const b = burstRef.current;
      const now = performance.now();
      if (/^\d$/.test(e.key)) {
        const gap = b.times.length ? now - b.times[b.times.length - 1] : 0;
        if (!b.times.length || gap > BURST_KEY_GAP_MS || e.target !== b.target) {
          burstRef.current = {
            times: [now],
            digits: e.key,
            target: e.target,
            before: typeof e.target.value === "string" ? e.target.value : "",
          };
        } else {
          b.times.push(now);
          b.digits += e.key;
        }
        return;
      }
      if (e.key === "Enter" && b.digits.length === 14) {
        const avg = (b.times[b.times.length - 1] - b.times[0]) / (b.times.length - 1);
        if (avg < READER_MAX_AVG_KEY_MS) {
          e.preventDefault();
          e.stopPropagation();
          const { active: current, submitDtn: submit, setMessage: notify, confirmOpen } = latestRef.current;
          if (confirmOpen) {
            // A Remove/Delete confirm is open — ignore the DTN entirely so the
            // reader's Enter can't touch the dialog.
            resetBurst();
            notify({ type: "error", text: "Close the Remove/Delete dialog first, then insert the DTN again." });
            return;
          }
          // Put the label back right away (flushSync), before the cursor
          // leaves the box — otherwise its on-blur save could store the digits.
          if (b.target === labelInputRef.current) flushSync(() => setLabelDraft(b.before));
          if (current) {
            submit(b.digits, false);
          } else {
            notify({ type: "error", text: "Open or create a checklist first, then insert the DTN." });
          }
          resetBurst();
          focusDtnInput();
          return;
        }
      }
      resetBurst();
    };
    window.addEventListener("keydown", onKeyDown, true); // capture: runs before the page's own handlers
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  // Remove / Delete go through a small confirm modal (not the browser's
  // confirm(), whose OK a stray barcode-reader Enter would click).
  const closeConfirm = () => {
    setConfirm(null);
    focusDtnInput();
  };

  const handleRemoveItem = async (item) => {
    setConfirmBusy(true);
    try {
      await deleteChecklistItem(active.id, item.id);
      setActive((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== item.id) }));
      bumpListCount(active.id, -1);
      setMessage({ type: "ok", text: `DTN ${item.dtn} removed from this checklist and moved to the Bin.` });
      loadBin(active.id);
    } catch (err) {
      setMessage({ type: "error", text: errorText(err, `Could not remove ${item.dtn}.`) });
    } finally {
      setConfirmBusy(false);
      closeConfirm();
    }
  };

  const handleDeleteChecklist = async () => {
    const id = active.id;
    setConfirmBusy(true);
    try {
      await deleteChecklist(id);
      setActive(null);
      setBin([]);
      setShowBin(false);
      setMessage({ type: "ok", text: `Checklist #${id} deleted.` });
      loadChecklists();
    } catch (err) {
      setMessage({ type: "error", text: errorText(err, "Could not delete checklist.") });
    } finally {
      setConfirmBusy(false);
      setConfirm(null);
    }
  };

  const saveLabel = async () => {
    const label = labelDraft.trim().toUpperCase();
    // Enter saves, then the blur that follows calls this again — the ref
    // (updated before the request) stops that second call from re-saving.
    if (!active || label === savedLabelRef.current) return;
    const previous = savedLabelRef.current;
    savedLabelRef.current = label;
    const checklistId = active.id;
    try {
      const updated = await updateChecklistLabel(checklistId, label);
      setActive((prev) => (prev && prev.id === checklistId ? { ...prev, label: updated.label } : prev));
      setChecklists((prev) =>
        prev.map((c) => (c.id === checklistId ? { ...c, label: updated.label } : c)),
      );
      setMessage({
        type: "ok",
        text: updated.label ? `Label set to "${updated.label}".` : "Label cleared.",
      });
    } catch (err) {
      savedLabelRef.current = previous;
      setMessage({ type: "error", text: errorText(err, "Could not save label.") });
    }
  };

  // ── DTN subjects from FIS ───────────────────────────────────────────────────
  // Copy subject/subject_status from a fresh copy of the checklist onto the
  // rows we already have — by id, so a DTN inserted meanwhile is never lost.
  const mergeSubjects = (fresh) =>
    setActive((prev) => {
      if (!prev || prev.id !== fresh.id) return prev;
      const byId = new Map(fresh.items.map((i) => [i.id, i]));
      return {
        ...prev,
        items: prev.items.map((i) =>
          byId.has(i.id)
            ? { ...i, subject: byId.get(i.id).subject, subject_status: byId.get(i.id).subject_status }
            : i,
        ),
      };
    });

  // The backend fills subjects in after the insert. While any row is still
  // "pending", re-check every 2 s (a down FIS turns them into "error" after
  // its 10 s timeout, so this stops on its own; capped as a safety net).
  const hasPending = !!active?.items.some((i) => i.subject_status === "pending");
  const pollCountRef = useRef(0);
  useEffect(() => {
    if (!hasPending || !active) {
      pollCountRef.current = 0;
      return undefined;
    }
    if (pollCountRef.current >= 15) return undefined;
    const id = active.id;
    const timer = setTimeout(async () => {
      pollCountRef.current += 1;
      try {
        mergeSubjects(await getChecklist(id));
      } catch {
        // try again on the next tick
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [hasPending, active]);

  const hasSubjectProblems = !!active?.items.some(
    (i) => i.subject_status === "error" || (i.subject_status === "pending" && pollCountRef.current >= 15),
  );

  const handleRefreshSubjects = async () => {
    setRefreshingSubjects(true);
    try {
      const fresh = await refreshChecklistSubjects(active.id);
      mergeSubjects(fresh);
      const stillFailing = fresh.items.filter((i) => i.subject_status === "error").length;
      setMessage(
        stillFailing
          ? { type: "error", text: `FIS still can't be reached — ${stillFailing} subject${stillFailing === 1 ? "" : "s"} not loaded. Try again later.` }
          : { type: "ok", text: "Subjects refreshed from FIS." },
      );
    } catch (err) {
      setMessage({ type: "error", text: errorText(err, "Could not refresh subjects.") });
    } finally {
      setRefreshingSubjects(false);
      focusDtnInput();
    }
  };

  // ── Exports ─────────────────────────────────────────────────────────────────
  const exportName = () => `checklist_${active.id}_${new Date().toISOString().slice(0, 10)}`;

  const handleExportExcel = async () => {
    const generatedAt = await generatedNow();
    const rows = [
      ["DTN Checklist"],
      [`Checklist No.: ${active.id}`],
      [`Created By: ${active.created_by || ""}`],
      [`Generated: ${generatedAt}`],
      [`Total DTNs: ${active.items.length}`],
      [`Label: ${active.label || ""}`],
      // TEST LAYOUT: Date/Time Inserted and Inserted By left out for now.
      ["#", "DTN", "Subject", "Received (✓)", ""],
      ...active.items.map((item, i) => [i + 1, item.dtn, subjectText(item), "", ""]),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = [{ wch: 5 }, { wch: 18 }, { wch: 70 }, { wch: 7 }, { wch: 7 }];
    // "Received (✓)" is one header over the 2 tick columns (D:E) — same as the PDF.
    const headerRow = 6;
    worksheet["!merges"] = [{ s: { r: headerRow, c: 3 }, e: { r: headerRow, c: 4 } }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Checklist");
    XLSX.writeFile(workbook, `${exportName()}.xlsx`);
  };

  const handleExportPdf = async () => {
    const generatedAt = await generatedNow();
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const left = 15;
    // [header, width mm] — TEST LAYOUT: Date/Time Inserted and Inserted By
    // left out for now so the subject has room on portrait A4.
    const cols = [
      ["#", 10],
      ["DTN", 36],
      ["Subject", 101],
      ["Received", 33],
    ];
    const SUBJECT_COL = 2;
    const rowH = 8; // header row / minimum body row height
    const lineH = 4.3; // mm per wrapped subject line
    // "Received" is one header cell over this many tick-box cells per row.
    const receivedBoxes = 2;

    const drawHeaderRow = (y) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      let x = left;
      cols.forEach(([label, w]) => {
        // Re-set every cell: in jsPDF, drawing text resets the fill color to
        // the text color (black), which would black out the next cell.
        doc.setFillColor(233, 222, 250); // light violet
        doc.rect(x, y, w, rowH, "FD");
        doc.setTextColor(0, 0, 0);
        doc.text(label, x + w / 2, y + 5.5, { align: "center" });
        x += w;
      });
      doc.setFont("helvetica", "normal");
      return y + rowH;
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("DTN Checklist", pageW / 2, 18, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Checklist No.: ${active.id}`, left, 28);
    doc.text(`Created By: ${active.created_by || ""}`, left, 34);
    doc.text(`Generated: ${generatedAt}`, left, 40);
    doc.text(`Total DTNs: ${active.items.length}`, left, 46);

    // Batch label — big and boxed in the top-right, shrunk to fit if long.
    if (active.label) {
      const boxRight = pageW - left;
      const maxW = 80;
      doc.setFont("helvetica", "bold");
      let size = 34;
      doc.setFontSize(size);
      while (doc.getTextWidth(active.label) > maxW - 8 && size > 12) {
        size -= 1;
        doc.setFontSize(size);
      }
      const textW = doc.getTextWidth(active.label);
      const boxW = textW + 8;
      const boxH = size * 0.3528 + 8; // pt -> mm, plus padding
      const boxY = 37 - boxH / 2;
      doc.setLineWidth(0.8);
      doc.setDrawColor(21, 128, 61); // green border, same as the text
      doc.roundedRect(boxRight - boxW, boxY, boxW, boxH, 2, 2);
      doc.setDrawColor(0, 0, 0); // back to black for the table lines
      doc.setLineWidth(0.2);
      doc.setTextColor(21, 128, 61); // green
      doc.text(active.label, boxRight - boxW / 2, boxY + boxH / 2, { align: "center", baseline: "middle" });
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }

    let y = drawHeaderRow(52);
    active.items.forEach((item, i) => {
      // Subject wraps onto as many lines as it needs; the row grows to fit.
      const subject = subjectText(item);
      const subjectLines = subject ? doc.splitTextToSize(subject, cols[SUBJECT_COL][1] - 4) : [""];
      const h = Math.max(rowH, subjectLines.length * lineH + 3.7);
      if (y + h > pageH - 30) {
        doc.addPage();
        y = drawHeaderRow(15);
      }
      const midY = y + h / 2 + 1.5; // vertical middle for single-line cells
      let x = left;
      cols.forEach(([, w], c) => {
        if (c === cols.length - 1) {
          const boxW = w / receivedBoxes;
          for (let b = 0; b < receivedBoxes; b++) {
            const bx = x + b * boxW;
            doc.rect(bx, y, boxW, h);
            doc.rect(bx + boxW / 2 - 2, y + h / 2 - 2, 4, 4); // tick box
          }
        } else if (c === SUBJECT_COL) {
          doc.rect(x, y, w, h);
          if (item.subject_status === "not_found") doc.setTextColor(220, 38, 38); // red
          doc.text(subjectLines, x + 2, y + 5.5, { lineHeightFactor: lineH / (10 * 0.3528) });
          doc.setTextColor(0, 0, 0);
        } else {
          doc.rect(x, y, w, h);
          doc.text(c === 0 ? String(i + 1) : item.dtn, x + w / 2, midY, { align: "center" });
        }
        x += w;
      });
      y += h;
    });

    if (y + 25 > pageH - 10) {
      doc.addPage();
      y = 15;
    }
    y += 15;
    doc.line(left, y, left + 70, y);
    doc.line(pageW - left - 70, y, pageW - left, y);
    doc.text("Prepared by / Date", left, y + 5);
    doc.text("Received by / Date", pageW - left - 70, y + 5);

    doc.save(`${exportName()}.pdf`);
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const card = {
    background: colors.cardBg,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: "10px",
    boxShadow: colors.cardShadow,
  };
  const btn = (bg, fg = "#fff") => ({
    padding: "0.5rem 1rem",
    background: bg,
    color: fg,
    border: "none",
    borderRadius: "6px",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
  });
  const th = {
    textAlign: "left",
    padding: "0.6rem 0.75rem",
    fontSize: "0.75rem",
    textTransform: "uppercase",
    color: colors.textTertiary,
    borderBottom: `1px solid ${colors.tableBorder}`,
  };
  const td = {
    padding: "0.55rem 0.75rem",
    fontSize: "0.85rem",
    color: colors.tableText,
    borderBottom: `1px solid ${colors.tableBorder}`,
  };

  return (
    <div style={{ padding: "1.5rem 2rem", minHeight: "100%", background: colors.pageBg, color: colors.textPrimary }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", margin: 0 }}>📋 Checklist</h1>
          <p style={{ margin: "0.25rem 0 0", color: colors.textTertiary, fontSize: "0.85rem" }}>
            Insert the DTNs in a batch to make the checklist.
          </p>
        </div>
        <button onClick={handleNewChecklist} disabled={loading} style={btn("#2563eb")}>
          + New Checklist
        </button>
      </div>

      <style>{`
        @keyframes checklistNotifPulse {
          0%   { transform: scale(0.97); box-shadow: 0 0 0 0 var(--glow); }
          25%  { transform: scale(1.01); box-shadow: 0 0 0 6px var(--glow), 0 0 22px 4px var(--glow); }
          100% { transform: scale(1);    box-shadow: 0 0 0 0 transparent; }
        }
      `}</style>
      {message && (
        <div
          key={message.id}
          style={{
            ...card,
            padding: "0.6rem 1rem",
            marginBottom: "1rem",
            fontSize: "0.9rem",
            fontWeight: 600,
            color: message.type === "ok" ? "#16a34a" : "#dc2626",
            borderColor: message.type === "ok" ? "#16a34a55" : "#dc262655",
            "--glow": message.type === "ok" ? "rgba(22,163,74,0.45)" : "rgba(220,38,38,0.45)",
            animation: "checklistNotifPulse 0.8s ease-out",
          }}
        >
          {message.text}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "1rem", alignItems: "start" }}>
        {/* ── Past checklists ── */}
        <div style={{ ...card, padding: "0.75rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: colors.textTertiary, marginBottom: "0.5rem" }}>
            CHECKLISTS
          </div>
          {checklists.length === 0 && (
            <div style={{ fontSize: "0.85rem", color: colors.textTertiary }}>None yet.</div>
          )}
          {checklists.map((c) => (
            <div
              key={c.id}
              onClick={() => openChecklist(c.id)}
              style={{
                padding: "0.5rem 0.6rem",
                borderRadius: "6px",
                cursor: "pointer",
                marginBottom: "0.25rem",
                background: active?.id === c.id ? colors.tableRowHover : "transparent",
              }}
            >
              <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                #{c.id} · {c.item_count} DTN{c.item_count === 1 ? "" : "s"}
                {c.label && (
                  <span
                    style={{
                      marginLeft: "0.4rem",
                      padding: "0.05rem 0.4rem",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      borderRadius: "4px",
                      background: "#ede4fb",
                      color: "#6d28d9",
                    }}
                  >
                    {c.label}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "0.75rem", color: colors.textTertiary }}>
                {fmtDateTime(c.created_at)} · {c.created_by || "—"}
              </div>
            </div>
          ))}
        </div>

        {/* ── Active checklist ── */}
        <div style={{ ...card, padding: "1rem" }}>
          {!active ? (
            <div style={{ padding: "2rem", textAlign: "center", color: colors.textTertiary }}>
              Click <b>+ New Checklist</b> to start inserting DTNs, or pick one from the list.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>Checklist #{active.id}</div>
                    <input
                      ref={labelInputRef}
                      value={labelDraft}
                      onChange={(e) => {
                        // Capitalize as they type; keep the cursor where it was.
                        const el = e.target;
                        const { selectionStart, selectionEnd } = el;
                        setLabelDraft(el.value.toUpperCase());
                        requestAnimationFrame(() => el.setSelectionRange(selectionStart, selectionEnd));
                      }}
                      onBlur={saveLabel}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveLabel();
                          dtnInputRef.current?.focus();
                        }
                      }}
                      maxLength={50}
                      placeholder="Label (e.g. URGENT, CPR)"
                      title="Shown big on the PDF. Press Enter to save."
                      style={{
                        width: "13rem",
                        padding: "0.3rem 0.6rem",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        background: colors.inputBg,
                        color: colors.textPrimary,
                        border: `1px solid ${colors.inputBorder}`,
                        borderRadius: "6px",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "0.8rem", color: colors.textTertiary }}>
                    Created {fmtDateTime(active.created_at)} by {active.created_by || "—"} · {active.items.length} DTN
                    {active.items.length === 1 ? "" : "s"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => {
                      handleExportPdf();
                      focusDtnInput();
                    }}
                    disabled={!active.items.length}
                    style={btn("#dc2626")}
                  >
                    Generate PDF
                  </button>
                  <button
                    onClick={() => {
                      handleExportExcel();
                      focusDtnInput();
                    }}
                    disabled={!active.items.length}
                    style={btn("#16a34a")}
                  >
                    Generate Excel
                  </button>
                  <button onClick={() => setConfirm({ kind: "delete" })} style={btn(colors.badgeBg, colors.textSecondary)}>
                    Delete
                  </button>
                  <button
                    onClick={() => {
                      setShowBin((v) => !v);
                      focusDtnInput();
                    }}
                    title={showBin ? "Hide Bin" : `Bin (${bin.length})`}
                    aria-label={showBin ? "Hide Bin" : `Bin (${bin.length})`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "2.1rem",
                      padding: 0,
                      background: "transparent",
                      border: `1px solid ${showBin ? "#2563eb" : colors.cardBorder}`,
                      borderRadius: "6px",
                      color: showBin ? "#2563eb" : colors.textTertiary,
                      cursor: "pointer",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M6 6l1 14h10l1-14" />
                    </svg>
                  </button>
                </div>
              </div>

              <input
                ref={dtnInputRef}
                value={dtnInput}
                onChange={handleDtnChange}
                onKeyDown={handleDtnKeyDown}
                onPaste={() => {
                  pastedRef.current = true;
                }}
                placeholder="Insert DTN — or type/paste several (separated by space or comma), then press Enter"
                autoFocus
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "0.75rem 1rem",
                  fontSize: "1.05rem",
                  letterSpacing: "0.05em",
                  background: colors.inputBg,
                  color: colors.textPrimary,
                  border: `2px solid #2563eb`,
                  borderRadius: "8px",
                  outline: "none",
                  marginBottom: "1rem",
                }}
              />

              {hasSubjectProblems && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    padding: "0.5rem 0.75rem",
                    marginBottom: "0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #f59e0b66",
                    background: "#f59e0b14",
                    color: "#b45309",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  Some subjects couldn't be loaded from FIS.
                  <button
                    onClick={handleRefreshSubjects}
                    disabled={refreshingSubjects}
                    style={{ ...btn("#f59e0b"), padding: "0.35rem 0.8rem" }}
                  >
                    {refreshingSubjects ? "Refreshing..." : "↻ Refresh subjects"}
                  </button>
                </div>
              )}

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: "3rem" }}>#</th>
                    <th style={th}>DTN</th>
                    <th style={{ ...th, width: "35%" }}>Subject</th>
                    <th style={th}>Date Inserted</th>
                    <th style={th}>Time Inserted</th>
                    <th style={th}>Inserted By</th>
                    <th style={{ ...th, width: "5rem" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {active.items.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ ...td, textAlign: "center", color: colors.textTertiary }}>
                        No DTNs yet — start inserting.
                      </td>
                    </tr>
                  )}
                  {active.items.map((item, i) => (
                    <tr key={item.id} style={{ background: i % 2 ? colors.tableRowOdd : colors.tableRowEven }}>
                      <td style={td}>{i + 1}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: "0.9rem" }}>{item.dtn}</td>
                      <td style={{ ...td, whiteSpace: "pre-line", fontSize: "0.8rem" }}>
                        {item.subject_status === "found" && (subjectText(item) || "—")}
                        {item.subject_status === "not_found" && (
                          <span style={{ color: "#dc2626", fontWeight: 600 }}>{NOT_FOUND_IN_FIS}</span>
                        )}
                        {item.subject_status === "pending" && (
                          <span style={{ color: colors.textTertiary, fontStyle: "italic" }}>Looking up in FIS…</span>
                        )}
                        {item.subject_status === "error" && (
                          <span style={{ color: "#b45309", fontStyle: "italic" }}>FIS unreachable</span>
                        )}
                      </td>
                      <td style={td}>{fmtDate(item.inserted_at)}</td>
                      <td style={td}>{fmtTime(item.inserted_at)}</td>
                      <td style={td}>{item.inserted_by || "—"}</td>
                      <td style={td}>
                        <button
                          onClick={() => setConfirm({ kind: "remove", item })}
                          style={{ ...btn("transparent", "#dc2626"), padding: "0.2rem 0.5rem" }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {showBin && (
                <div style={{ marginTop: "1.5rem" }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    🗑️ Bin — removed DTNs
                  </div>
                  <div style={{ fontSize: "0.8rem", color: colors.textTertiary, marginBottom: "0.5rem" }}>
                    These can't be restored. To add a DTN back, insert it again above.
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={th}>DTN</th>
                        <th style={{ ...th, width: "30%" }}>Subject</th>
                        <th style={th}>Inserted</th>
                        <th style={th}>Inserted By</th>
                        <th style={th}>Removed</th>
                        <th style={th}>Removed By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bin.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ ...td, textAlign: "center", color: colors.textTertiary }}>
                            The Bin is empty.
                          </td>
                        </tr>
                      )}
                      {bin.map((b, i) => (
                        <tr key={b.id} style={{ background: i % 2 ? colors.tableRowOdd : colors.tableRowEven }}>
                          <td style={{ ...td, fontFamily: "monospace", fontSize: "0.9rem" }}>{b.dtn}</td>
                          <td style={{ ...td, whiteSpace: "pre-line", fontSize: "0.8rem" }}>
                            {(b.subject || "").replace(/\s*║\s*/g, "\n").trim() || "—"}
                          </td>
                          <td style={td}>{fmtDateTime(b.inserted_at)}</td>
                          <td style={td}>{b.inserted_by || "—"}</td>
                          <td style={td}>{fmtDateTime(b.removed_at)}</td>
                          <td style={td}>{b.removed_by || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {confirm?.kind === "remove" && (
        <ChecklistConfirmModal
          icon="🗑️"
          title="Remove this DTN?"
          confirmLabel="Yes, Remove"
          busyLabel="Removing..."
          busy={confirmBusy}
          onClose={closeConfirm}
          onConfirm={() => handleRemoveItem(confirm.item)}
          colors={colors}
        >
          <strong style={{ color: colors.textPrimary, fontFamily: "monospace", fontSize: "0.95rem" }}>
            {confirm.item.dtn}
          </strong>
          <p style={{ margin: "0.5rem 0 0" }}>
            will be removed from Checklist #{active?.id} and moved to the Bin. It can't be restored —
            only inserted again.
          </p>
        </ChecklistConfirmModal>
      )}

      {confirm?.kind === "delete" && (
        <ChecklistConfirmModal
          icon="🗑️"
          title={`Delete Checklist #${active?.id}?`}
          confirmLabel="Yes, Delete"
          busyLabel="Deleting..."
          busy={confirmBusy}
          onClose={closeConfirm}
          onConfirm={handleDeleteChecklist}
          colors={colors}
        >
          <p style={{ margin: 0 }}>
            The checklist and its {active?.items.length ?? 0} DTN{active?.items.length === 1 ? "" : "s"} will be
            hidden from this page.
          </p>
        </ChecklistConfirmModal>
      )}
    </div>
  );
}

export default ChecklistPage;
