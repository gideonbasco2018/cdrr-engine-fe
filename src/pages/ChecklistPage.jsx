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
import ChecklistDateFilterModal, { fmtFilterRange } from "../components/checklist/ChecklistDateFilterModal";
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
  searchChecklists,
} from "../api/checklist";

// Search results: mark the first case-insensitive match of q in text.
const highlightMatch = (text, q) => {
  const s = String(text || "");
  const i = q ? s.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return s;
  return (
    <>
      {s.slice(0, i)}
      <mark style={{ background: "#fde047", color: "#111", borderRadius: 2, padding: "0 1px" }}>
        {s.slice(i, i + q.length)}
      </mark>
      {s.slice(i + q.length)}
    </>
  );
};

// A short piece of a long subject, centred on the match, on one line.
const subjectSnippet = (subject, q, radius = 55) => {
  const s = String(subject || "").replace(/\s*║\s*/g, " · ");
  const i = q ? s.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (s.length <= radius * 2 || i < 0) return s.length > radius * 2 ? `${s.slice(0, radius * 2)}…` : s;
  const start = Math.max(0, i - radius);
  const end = Math.min(s.length, i + q.length + radius);
  return `${start > 0 ? "…" : ""}${s.slice(start, end)}${end < s.length ? "…" : ""}`;
};


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
// Subject is cut to this many lines — on the page (double-click a row for
// the full text) and on the PDF.
const SUBJECT_MAX_LINES = 3;
const subjectText = (item) => {
  if (item.subject_status === "found") return (item.subject || "").replace(/\s*║\s*/g, "\n").trim();
  if (item.subject_status === "not_found") return NOT_FOUND_IN_FIS;
  return "";
};

// PDF: keep at most maxLines wrapped lines; if any were cut, end the last
// kept line with "…" (shortened until it still fits the column).
const clampLines = (doc, lines, maxLines, maxW) => {
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1].trimEnd();
  while (last && doc.getTextWidth(`${last}…`) > maxW) last = last.slice(0, -1).trimEnd();
  kept[maxLines - 1] = `${last}…`;
  return kept;
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
  // Rows whose subject is shown in full (double-click a row to toggle);
  // every other row shows at most SUBJECT_MAX_LINES lines.
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  // ── Search (DTN / subject, across all checklists) ──
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null); // null = nothing searched yet
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchInputRef = useRef(null);
  const latestQueryRef = useRef("");
  // Row picked from the search: glows briefly and is scrolled into view.
  // n changes on every pick so picking the same row again replays the glow.
  const [flash, setFlash] = useState(null); // { itemId, n }
  const scrolledFlashRef = useRef(null);
  // Row just inserted/scanned: pops in and is scrolled into view.
  const [popped, setPopped] = useState(null); // { itemId, n }
  const toggleExpanded = (e, id) => {
    if (e.target.closest("button")) return; // double-clicking Remove isn't a toggle
    window.getSelection()?.removeAllRanges(); // undo the word a double-click selects
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
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

  // Date filter for the checklist list: { from, to } ("YYYY-MM-DD", Manila) or null.
  const [dateFilter, setDateFilter] = useState(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const dateFilterRef = useRef(null);
  dateFilterRef.current = dateFilter;

  // Entrance stagger: items that appear together (list load, opening a
  // checklist) slide in one after another; one inserted later comes in at
  // once. A key keeps its first delay, so re-renders never replay or hide it.
  const delaysRef = useRef(new Map());
  const batchStartRef = useRef(Date.now());
  const staggerDelay = (key, i) => {
    if (!delaysRef.current.has(key)) {
      const inBatch = Date.now() - batchStartRef.current < 500;
      delaysRef.current.set(key, inBatch ? Math.min(i, 10) * 35 : 0);
    }
    return delaysRef.current.get(key);
  };

  const loadChecklists = useCallback(async () => {
    try {
      const list = await getChecklists(dateFilterRef.current);
      batchStartRef.current = Date.now();
      setChecklists(list);
    } catch (err) {
      setMessage({ type: "error", text: errorText(err, "Could not load checklists.") });
    }
  }, []);

  useEffect(() => {
    loadChecklists();
  }, [loadChecklists, dateFilter]);

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
      const opened = await getChecklist(id);
      batchStartRef.current = Date.now(); // its rows slide in one after another
      setActive(opened);
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
          setPopped({ itemId: item.id, n: Date.now() }); // several at once: the last one wins
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
      if (e.target === dtnInputRef.current || e.target === searchInputRef.current) {
        resetBurst(); // these boxes handle their own input (a scan into Search searches)
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

  // ── Search ──────────────────────────────────────────────────────────────────
  const runSearch = async (raw) => {
    const q = raw.trim();
    latestQueryRef.current = q;
    if (q.length < 2) {
      setSearchResults(null);
      return [];
    }
    setSearching(true);
    try {
      const results = await searchChecklists(q);
      if (latestQueryRef.current === q) setSearchResults(results); // ignore late, older answers
      return results;
    } catch (err) {
      if (latestQueryRef.current === q) setSearchResults([]);
      setMessage({ type: "error", text: errorText(err, "Search failed.") });
      return [];
    } finally {
      if (latestQueryRef.current === q) setSearching(false);
    }
  };

  // Search as they type, once they pause for 250 ms.
  useEffect(() => {
    if (!searchOpen) return undefined;
    const timer = setTimeout(() => runSearch(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen]);

  const openSearch = () => {
    setSearchOpen(true);
    setShowResults(true);
    setTimeout(() => searchInputRef.current?.focus(), 60); // after the box starts opening
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults(null);
    setShowResults(false);
    latestQueryRef.current = "";
    focusDtnInput();
  };

  const pickResult = async (r) => {
    setShowResults(false);
    const q = searchQuery.trim().toLowerCase();
    // Matched in the subject (not the DTN)? Show that row's subject in full.
    if (q && !r.dtn.toLowerCase().includes(q)) {
      setExpandedIds((prev) => new Set(prev).add(r.item_id));
    }
    if (active?.id !== r.checklist_id) await openChecklist(r.checklist_id);
    setFlash({ itemId: r.item_id, n: Date.now() });
  };

  const handleSearchKeyDown = async (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSearch();
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Search right away (don't wait for the 250 ms pause), then open the
      // first match — so typing/scanning a DTN + Enter jumps straight to it.
      const results = await runSearch(searchQuery);
      if (results.length) pickResult(results[0]);
      else setShowResults(true);
    }
  };

  // Once the inserted row is on screen: bring it into view (centred), then
  // clear the pop. Only scrolls — the cursor stays in the DTN box so the
  // barcode reader keeps working.
  useEffect(() => {
    if (!popped) return undefined;
    const raf = requestAnimationFrame(() =>
      document
        .getElementById(`checklist-row-${popped.itemId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
    const timer = setTimeout(() => setPopped(null), 1400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [popped]);

  // Once the picked row is on screen: scroll to it, then let the glow fade.
  useEffect(() => {
    if (!flash || !active?.items.some((i) => i.id === flash.itemId)) return undefined;
    if (scrolledFlashRef.current !== flash.n) {
      scrolledFlashRef.current = flash.n;
      setTimeout(
        () => document.getElementById(`checklist-row-${flash.itemId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
        50,
      );
    }
    const timer = setTimeout(() => setFlash(null), 2600);
    return () => clearTimeout(timer);
  }, [flash, active]);

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
      const subjectLines = subject
        ? clampLines(doc, doc.splitTextToSize(subject, cols[SUBJECT_COL][1] - 4), SUBJECT_MAX_LINES, cols[SUBJECT_COL][1] - 4)
        : [""];
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
    <div
      className="ckl"
      style={{
        padding: "1.5rem 2rem",
        minHeight: "100%",
        background: colors.pageBg,
        color: colors.textPrimary,
        "--ckl-hover": colors.tableRowHover,
        "--ckl-muted": colors.textTertiary,
      }}
    >
      <div
        className="ckl-in"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", position: "relative", zIndex: 5 }}
      >
        <div>
          <h1 style={{ fontSize: "1.6rem", margin: 0 }}>📋 Checklist</h1>
          <p style={{ margin: "0.25rem 0 0", color: colors.textTertiary, fontSize: "0.85rem" }}>
            Insert the DTNs in a batch to make the checklist.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Search box — slides open from the 🔍 button */}
          <div style={{ position: "relative" }}>
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              onBlur={() => setShowResults(false)} // clicking a result keeps focus (onMouseDown below)
              onKeyDown={handleSearchKeyDown}
              placeholder="Search DTN or subject…"
              tabIndex={searchOpen ? 0 : -1}
              aria-hidden={!searchOpen}
              style={{
                width: searchOpen ? "18rem" : 0,
                opacity: searchOpen ? 1 : 0,
                padding: searchOpen ? "0.5rem 0.75rem" : "0.5rem 0",
                border: searchOpen ? "2px solid #2563eb" : "2px solid transparent",
                borderRadius: "6px",
                background: colors.inputBg,
                color: colors.textPrimary,
                fontSize: "0.85rem",
                outline: "none",
                boxSizing: "border-box",
                transition: "width 0.3s ease, opacity 0.25s ease, padding 0.3s ease, border-color 0.3s ease",
              }}
            />
            {searchOpen && showResults && searchQuery.trim().length > 0 && (
              <div
                style={{
                  ...card,
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  width: "26rem",
                  maxHeight: "22rem",
                  overflowY: "auto",
                  zIndex: 50,
                  padding: "0.35rem",
                }}
              >
                {searchQuery.trim().length < 2 && (
                  <div style={{ padding: "0.6rem", fontSize: "0.8rem", color: colors.textTertiary }}>
                    Type at least 2 characters.
                  </div>
                )}
                {searchQuery.trim().length >= 2 && searching && !searchResults?.length && (
                  <div style={{ padding: "0.6rem", fontSize: "0.8rem", color: colors.textTertiary }}>Searching…</div>
                )}
                {searchQuery.trim().length >= 2 && !searching && searchResults?.length === 0 && (
                  <div style={{ padding: "0.6rem", fontSize: "0.8rem", color: colors.textTertiary }}>
                    No DTN or subject matches “{searchQuery.trim()}”.
                  </div>
                )}
                {searchQuery.trim().length >= 2 &&
                  searchResults?.map((r) => (
                    <div
                      key={r.item_id}
                      onMouseDown={(e) => e.preventDefault()} // keep focus so the list doesn't vanish mid-click
                      onClick={() => pickResult(r)}
                      style={{ padding: "0.5rem 0.6rem", borderRadius: "6px", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = colors.tableRowHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: colors.textTertiary }}>
                        <b style={{ color: colors.textSecondary }}>Checklist #{r.checklist_id}</b>
                        {r.checklist_label && (
                          <span
                            style={{
                              padding: "0 0.35rem",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              borderRadius: "4px",
                              background: "#ede4fb",
                              color: "#6d28d9",
                            }}
                          >
                            {r.checklist_label}
                          </span>
                        )}
                        <span>· {fmtDate(r.checklist_created_at)}</span>
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: "0.9rem", color: colors.textPrimary }}>
                        {highlightMatch(r.dtn, searchQuery.trim())}
                      </div>
                      {r.subject && (
                        <div style={{ fontSize: "0.75rem", color: colors.textSecondary }}>
                          {highlightMatch(subjectSnippet(r.subject, searchQuery.trim()), searchQuery.trim())}
                        </div>
                      )}
                    </div>
                  ))}
                {searchResults?.length === 50 && (
                  <div style={{ padding: "0.4rem 0.6rem", fontSize: "0.7rem", color: colors.textTertiary }}>
                    Showing the first 50 matches — type more to narrow it down.
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => (searchOpen ? closeSearch() : openSearch())}
            title={searchOpen ? "Close search (Esc)" : "Search DTN or subject"}
            aria-label={searchOpen ? "Close search" : "Search DTN or subject"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2.3rem",
              height: "2.3rem",
              padding: 0,
              background: searchOpen ? "#2563eb" : "transparent",
              border: `1px solid ${searchOpen ? "#2563eb" : colors.cardBorder}`,
              borderRadius: "6px",
              color: searchOpen ? "#fff" : colors.textSecondary,
              cursor: "pointer",
              transition: "background 0.2s ease, color 0.2s ease",
            }}
          >
            {searchOpen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setShowDateFilter(true)}
            title={dateFilter ? `Filtered: ${fmtFilterRange(dateFilter)}` : "Filter checklists by date"}
            aria-label="Filter checklists by date"
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2.3rem",
              height: "2.3rem",
              padding: 0,
              background: dateFilter ? "linear-gradient(135deg, #2563eb, #7c3aed)" : "transparent",
              border: `1px solid ${dateFilter ? "#2563eb" : colors.cardBorder}`,
              borderRadius: "6px",
              color: dateFilter ? "#fff" : colors.textSecondary,
              cursor: "pointer",
              boxShadow: dateFilter ? "0 3px 10px rgba(37,99,235,0.35)" : "none",
              transition: "background 0.2s ease, color 0.2s ease",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            {dateFilter && (
              <span
                style={{
                  position: "absolute", top: -3, right: -3, width: 9, height: 9, borderRadius: 999,
                  background: "#f59e0b", border: `2px solid ${colors.pageBg}`,
                }}
              />
            )}
          </button>
          <button onClick={handleNewChecklist} disabled={loading} style={btn("#2563eb")}>
            + New Checklist
          </button>
        </div>
      </div>

      {showDateFilter && (
        <ChecklistDateFilterModal
          value={dateFilter}
          colors={colors}
          darkMode={darkMode}
          onClose={() => {
            setShowDateFilter(false);
            focusDtnInput();
          }}
          onApply={(f) => {
            setDateFilter(f);
            setShowDateFilter(false);
            focusDtnInput();
          }}
        />
      )}

      <style>{`
        /* ── Page motion (scoped to .ckl) ─────────────────────────────── */
        @keyframes cklFadeUp   { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes cklSlideIn  { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: none; } }
        @keyframes cklDrop     { from { opacity: 0; transform: translateY(-8px) scaleY(0.96); } to { opacity: 1; transform: none; } }
        @keyframes cklFloat    { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes cklShimmer  { from { background-position: 200% 0; } to { background-position: -200% 0; } }
        @keyframes cklRowPop {
          0%   { opacity: 0; transform: scale(0.94) translateY(8px); }
          25%  { opacity: 1; transform: scale(1.025); box-shadow: 0 0 0 2px #16a34a, 0 8px 22px rgba(22,163,74,0.35); background: rgba(22,163,74,0.16); }
          45%  { transform: scale(1); }
          100% { box-shadow: 0 0 0 2px transparent, 0 0 0 transparent; }
        }
        @keyframes cklRing    { 0% { box-shadow: 0 0 0 0 rgba(37,99,235,0.45); } 100% { box-shadow: 0 0 0 8px rgba(37,99,235,0); } }

        .ckl-in    { animation: cklFadeUp 0.45s cubic-bezier(.2,.8,.2,1) both; }
        .ckl-swap  { animation: cklFadeUp 0.35s cubic-bezier(.2,.8,.2,1) both; }
        .ckl-drop  { animation: cklDrop 0.3s cubic-bezier(.2,.8,.2,1) both; transform-origin: top; }
        .ckl-float { display: inline-block; animation: cklFloat 3s ease-in-out infinite; }

        .ckl button:not(:disabled) { transition: transform 0.15s ease, box-shadow 0.2s ease, filter 0.2s ease, background 0.2s ease, color 0.2s ease; }
        .ckl button:not(:disabled):hover  { transform: translateY(-1px); filter: brightness(1.08); }
        .ckl button:not(:disabled):active { transform: translateY(0) scale(0.97); }

        .ckl-item { animation: cklSlideIn 0.35s cubic-bezier(.2,.8,.2,1) both; transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease; border-left: 3px solid transparent; }
        .ckl-item:hover { transform: translateX(3px); background: var(--ckl-hover); }
        .ckl-item.is-active { border-left-color: #2563eb; box-shadow: 0 2px 10px rgba(37,99,235,0.15); }

        .ckl-row { animation: cklSlideIn 0.35s cubic-bezier(.2,.8,.2,1) both; }
        .ckl-row td { transition: background 0.15s ease; }
        .ckl-row:hover td { background: var(--ckl-hover); }

        .ckl-dtn-input { transition: box-shadow 0.25s ease, border-color 0.25s ease; }
        .ckl-dtn-input:focus { animation: cklRing 1.2s ease-out; box-shadow: 0 0 0 4px rgba(37,99,235,0.15); }

        .ckl-shimmer {
          background: linear-gradient(90deg, var(--ckl-muted) 25%, #2563eb 50%, var(--ckl-muted) 75%);
          background-size: 200% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent !important;
          animation: cklShimmer 1.6s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .ckl *, .ckl *::before, .ckl *::after { animation: none !important; transition: none !important; }
        }

        @keyframes checklistRowFlash {
          0%, 45% { background: rgba(253, 224, 71, 0.55); box-shadow: inset 0 0 0 2px #eab308; }
          100%    { box-shadow: inset 0 0 0 2px transparent; }
        }
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
        <div className="ckl-in" style={{ ...card, padding: "0.75rem", animationDelay: "80ms" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: colors.textTertiary, marginBottom: "0.5rem" }}>
            CHECKLISTS
          </div>
          {dateFilter && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                marginBottom: "0.5rem",
                padding: "0.3rem 0.4rem 0.3rem 0.6rem",
                borderRadius: 999,
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#fff",
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
              }}
            >
              <span style={{ flex: 1, cursor: "pointer" }} onClick={() => setShowDateFilter(true)} title="Change dates">
                📅 {fmtFilterRange(dateFilter)}
              </span>
              <button
                onClick={() => setDateFilter(null)}
                title="Clear date filter"
                aria-label="Clear date filter"
                style={{
                  width: 18, height: 18, borderRadius: 999, border: "none", padding: 0, cursor: "pointer",
                  background: "rgba(255,255,255,0.25)", color: "#fff", fontSize: "0.7rem", lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          )}
          {checklists.length === 0 && (
            <div style={{ fontSize: "0.85rem", color: colors.textTertiary }}>
              {dateFilter ? "No checklists in this date range." : "None yet."}
            </div>
          )}
          {checklists.map((c, ci) => (
            <div
              key={c.id}
              onClick={() => openChecklist(c.id)}
              className={`ckl-item${active?.id === c.id ? " is-active" : ""}`}
              style={{
                padding: "0.5rem 0.6rem",
                borderRadius: "6px",
                cursor: "pointer",
                marginBottom: "0.25rem",
                // only the open one sets it inline, so the others can take the hover colour
                background: active?.id === c.id ? colors.tableRowHover : undefined,
                animationDelay: `${staggerDelay(`list-${c.id}`, ci)}ms`,
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
        <div className="ckl-in" style={{ ...card, padding: "1rem", animationDelay: "140ms" }}>
          {!active ? (
            <div key="empty" className="ckl-swap" style={{ padding: "2rem", textAlign: "center", color: colors.textTertiary }}>
              <div className="ckl-float" style={{ fontSize: "2.2rem", marginBottom: "0.5rem" }}>📋</div>
              <div>Click <b>+ New Checklist</b> to start inserting DTNs, or pick one from the list.</div>
            </div>
          ) : (
            // New key per checklist: switching checklists fades the panel in again.
            <div key={`checklist-${active.id}`} className="ckl-swap">
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
                className="ckl-dtn-input"
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
                    <tr
                      // A new key per search pick restarts the glow on the same row.
                      key={flash?.itemId === item.id ? `${item.id}-${flash.n}` : item.id}
                      id={`checklist-row-${item.id}`}
                      className="ckl-row"
                      onDoubleClick={(e) => toggleExpanded(e, item.id)}
                      title={expandedIds.has(item.id) ? "Double-click to collapse the subject" : "Double-click to show the full subject"}
                      style={{
                        background: i % 2 ? colors.tableRowOdd : colors.tableRowEven,
                        cursor: "default",
                        animationDelay: `${staggerDelay(`row-${item.id}`, i)}ms`,
                        animation:
                          flash?.itemId === item.id
                            ? "checklistRowFlash 2.6s ease-out"
                            : popped?.itemId === item.id
                              ? "cklRowPop 1.3s cubic-bezier(.2,.8,.2,1) both"
                              : undefined,
                      }}
                    >
                      <td style={td}>{i + 1}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: "0.9rem" }}>{item.dtn}</td>
                      <td style={{ ...td, whiteSpace: "pre-line", fontSize: "0.8rem" }}>
                        {item.subject_status === "found" && (
                          <div
                            style={
                              expandedIds.has(item.id)
                                ? undefined
                                : {
                                    // At most SUBJECT_MAX_LINES lines, "…" if cut.
                                    display: "-webkit-box",
                                    WebkitBoxOrient: "vertical",
                                    WebkitLineClamp: SUBJECT_MAX_LINES,
                                    overflow: "hidden",
                                  }
                            }
                          >
                            {subjectText(item) || "—"}
                          </div>
                        )}
                        {item.subject_status === "not_found" && (
                          <span style={{ color: "#dc2626", fontWeight: 600 }}>{NOT_FOUND_IN_FIS}</span>
                        )}
                        {item.subject_status === "pending" && (
                          <span className="ckl-shimmer" style={{ fontStyle: "italic", fontWeight: 600 }}>Looking up in FIS…</span>
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
                <div className="ckl-drop" style={{ marginTop: "1.5rem" }}>
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
            </div>
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
