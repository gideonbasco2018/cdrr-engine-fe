// FILE: src/pages/SoftcopyPage.jsx
// Softcopy — database of softcopies of letters from the FDAC
// "CDRR PD & LTRS SOFTCOPY" transmittal.
//
// Flow: upload the FDAC Excel file → read each subject → set the unit(s)
// (Licensing / PRSDD / Registration / FGMP / OD, more than one allowed) and
// section → forward. Units, sections and columns follow CDRR-OD's own
// database ("General Letters Softcopy" + "CLINTON" sheets).
// Click the Unit cell or ✏️ Edit to change units, sections and the extra
// columns (APP DTN, Date Received by CDRR, Receiving Officer, Remarks,
// Correction Detail).
// Step 1.5: double-click any row to pick Technical (just a mark) or System
// error (ICTMD ticket). Tick any rows and click Make Transmittal to make one
// PDF + Excel for a unit (the page sends no email). No app type or unit limits.
//
// NO DATABASE for the letters: the work is kept in this browser only (see
// src/api/softcopy.js), survives a refresh, and goes away with 🗑️ Clear.
// What leaves the page is a download (Export Excel, transmittal PDF + Excel);
// each download is listed in 🧾 Downloads.
//
// Layout (agreed 2026-11-24 from the mockup, option A + top bar 3):
//   · two tabs: Letters · Downloads (?tab=…, last one remembered)
//   · top right: File Viewer (popup) and Upload (popup)
//   · no letters yet → the Upload screen fills the Letters tab
//   · tick letters → the selection bar's Auto-sort / Make Transmittal open IN
//     PLACE of the table (?view=…), under a "Letters › …" path with the
//     screen's own icon, colour and hint; "Letters" in the path goes back
//   · Edit and Technical / System error stay small popups
import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getSoftcopyLetters, getSoftcopyTransmittals, setSoftcopyStar, setSoftcopyStars, exportSoftcopyLetters,
  clearSoftcopyWork, getSoftcopySaveError, UNITS, SECTIONS, isCorrection,
} from "../api/softcopy";
import SoftcopyDownloadsModal from "../components/softcopy/SoftcopyDownloadsModal";
import { useConfirm } from "../components/softcopy/SoftcopyConfirm";
import { motion, MOTION_CLASS, EASE } from "../components/softcopy/viewFrame";
import { parseDtnSearch, handleMultilinePaste, DtnSearchSummary } from "../components/gmp/shared/dtnSearch";
import SoftcopyUploadModal from "../components/softcopy/SoftcopyUploadModal";
import SoftcopyCorrectionModal from "../components/softcopy/SoftcopyCorrectionModal";
import SoftcopyForwardModal from "../components/softcopy/SoftcopyForwardModal";
import SoftcopyEditModal from "../components/softcopy/SoftcopyEditModal";
import SoftcopyAutoSortModal from "../components/softcopy/SoftcopyAutoSortModal";
import { getColorScheme } from "../components/gmp/shared/colorScheme";
import { FONT } from "../components/gmp/shared/constants";
import { QuickFilterSidebar } from "../components/gmp/queue/QueueFilters";
import SoftcopyDateFilter from "../components/softcopy/SoftcopyDateFilter";
import SoftcopyUnitFilter from "../components/softcopy/SoftcopyUnitFilter";
import SoftcopyActionMenu from "../components/softcopy/SoftcopyActionMenu";
import SoftcopyDriveViewer from "../components/softcopy/SoftcopyDriveViewer";

const ACCENT = "#10b981";
const UNIT_COLORS = {
  Licensing: "#0ea5e9",
  PRSDD: "#6366f1",
  Registration: "#a855f7",
  FGMP: "#f97316",
  OD: "#10b981",
};
const NOT_SORTED = "__none";
const NO_FILTERS = { starred: "all", unit: "all", section: "all", app_type: "all" };
const COLLAPSE_KEY = "softcopy_quick_filters_collapsed";
const FILTERS_KEY = "softcopy_filters";
const STAR_COLOR = "#f59e0b";
const PAGE_SIZES = [25, 50, 100];

const INK = "#0F172A";
const GREEN = "#047857";     // text-safe green (4.5:1 on white)
const INDIGO = "#4F46E5";

// Tabs: only these two. Everything else opens from a button.
const TABS = [
  { key: "letters", label: "Letters" },
  { key: "downloads", label: "Downloads" },
];
const TAB_KEYS = TABS.map((t) => t.key);
const TAB_KEY = "softcopy_tab";
// Screens that open in place of the table
const VIEWS = {
  autosort: { title: "Auto-sort", color: INDIGO, tint: "#EEF2FF", icon: "sparkle" },
  transmittal: { title: "Make Transmittal", color: GREEN, tint: "#ECFDF5", icon: "send" },
};

// Line icons (no emoji in the page frame)
const ICONS = {
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><circle cx="11.5" cy="14.5" r="2.5" /><path d="m13.5 16.5 2 2" /></>,
  upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></>,
  download: <><path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M5 20h14" /></>,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />,
  send: <><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></>,
  trash: <><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></>,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
};
const Icon = ({ name, size = 16, stroke = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto" }}>
    {ICONS[name]}
  </svg>
);

// Fixed column widths. The header and the rows are two separate tables
// (so the scrollbar covers the rows only), and these widths keep their
// columns lined up.
const COLS = [
  { key: "check", label: "", width: 72 }, // checkbox + star
  { key: "dtn", label: "LTR DTN", width: 150 },
  { key: "app_dtn", label: "APP DTN / Reg No.", width: 150 },
  { key: "date", label: "Received by FDAC", width: 125 },
  { key: "date_cdrr", label: "Received by CDRR", width: 125 },
  { key: "type", label: "Type of Letter", width: 160 },
  { key: "company", label: "Company", width: 190 },
  { key: "subject", label: "Subject", width: 340 },
  { key: "unit", label: "Unit", width: 150 },
  { key: "section", label: "Section", width: 150 },
  { key: "officer", label: "Receiving Officer", width: 140 },
  { key: "forwarded", label: "Date Forwarded", width: 125 },
  { key: "remarks", label: "Remarks", width: 220 },
  { key: "detail", label: "Correction Detail", width: 170 },
  { key: "drive", label: "Drive", width: 80 },
  { key: "by", label: "Uploaded By", width: 130 },
  { key: "at", label: "Upload Date", width: 175 },
  { key: "actions", label: "Actions", width: 84 }, // ⋮ menu, stays on the right
];
const TABLE_MIN_WIDTH = COLS.reduce((s, c) => s + c.width, 0);

// Page numbers to show: 1 … 4 5 6 … 12
function pageList(current, total) {
  const keep = new Set([1, total, current - 1, current, current + 1]);
  const out = [];
  for (let p = 1; p <= total; p++) {
    if (keep.has(p)) out.push(p);
    else if (out[out.length - 1] !== "…") out.push("…");
  }
  return out;
}

// Row status strip (thin bar on the left edge of each row). Hover = what's missing.
//   orange = no unit (division) or a missing section
//   yellow = sorted, but Doctrack not updated yet
//   green  = sorted and Doctrack updated
const STATUS = {
  sort: { bar: "#fb923c", ink: "#c2410c", title: "Not sorted yet" },
  doctrack: { bar: "#fde047", ink: "#a16207", title: "Doctrack not updated" },
  done: { bar: "#86efac", ink: "#15803d", title: "Complete" },
};
function rowStatus(l) {
  const sortMissing = [];
  if (!l.units.length) sortMissing.push("No unit (division) yet");
  l.units.forEach((u) => {
    const secs = SECTIONS[u] || [];
    if (secs.length && !l.sections.some((x) => secs.includes(x))) sortMissing.push(`No section for ${u}`);
  });
  if (sortMissing.length) {
    return { ...STATUS.sort, lines: [...sortMissing, ...(l.doctrack_at ? [] : ["Doctrack not updated"])] };
  }
  if (!l.doctrack_at) {
    const lines = [];
    if (!l.forwards.length) lines.push("Not forwarded yet");
    lines.push("Doctrack not updated");
    return { ...STATUS.doctrack, lines };
  }
  return { ...STATUS.done, lines: ["Unit, section and Doctrack are all done"] };
}

const fmtDateTime = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d) ? s : d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const fmtDate = (s) => {
  if (!s) return "—";
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d) ? s : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

function SoftcopyPage({ darkMode }) {
  const colors = getColorScheme(darkMode);
  const [confirm, confirmBox] = useConfirm(colors, darkMode);

  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchHover, setSearchHover] = useState(false);
  const searchLeaveRef = useRef(null);
  useEffect(() => () => clearTimeout(searchLeaveRef.current), []);
  const [searchFocus, setSearchFocus] = useState(false);
  const searchRef = useRef(null);
  const searchOpen = searchHover || searchFocus || search.length > 0;
  // Quick Filters (left panel), one value per group; "all" = no filter.
  // Filters are remembered in this browser (Quick Filters + Unit + date),
  // so they stay after a reload or leaving the page, until changed or cleared.
  const saved = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(FILTERS_KEY)) || {}; } catch { return {}; }
  }, []);
  const [quick, setQuick] = useState(() => ({ ...NO_FILTERS, ...(saved.quick || {}) }));
  // Remembered per browser, like the FGMP Queue's panel.
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === "true"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, String(collapsed)); } catch { /* ignore */ }
  }, [collapsed]);
  const [selected, setSelected] = useState(new Set());
  const [transmittals, setTransmittals] = useState([]);
  const [correctionLetter, setCorrectionLetter] = useState(null);
  const [editLetter, setEditLetter] = useState(null);
  const [saveError, setSaveError] = useState("");     // browser storage full

  // ── Tabs and in-place screens ──
  // Both live in the address (?tab=…&view=…), so Back / Forward work.
  const [params, setParams] = useSearchParams();
  const tab = TAB_KEYS.includes(params.get("tab"))
    ? params.get("tab")
    : (() => { try { const t = localStorage.getItem(TAB_KEY); return TAB_KEYS.includes(t) ? t : "letters"; } catch { return "letters"; } })();
  useEffect(() => { try { localStorage.setItem(TAB_KEY, tab); } catch { /* ignore */ } }, [tab]);
  const view = tab === "letters" && VIEWS[params.get("view")] ? params.get("view") : null;
  // Each opening starts that screen fresh (new key).
  const [visit, setVisit] = useState(0);
  // Transmittal: one letter from its ⋮ menu (ids), else the ticked letters (null).
  const [transmittalIds, setTransmittalIds] = useState(null);
  // Auto-sort: the letters to sort, fixed when it opens (ticked ones, else
  // every letter not sorted yet), so the list doesn't jump after Apply.
  const [autoSortIds, setAutoSortIds] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [viewer, setViewer] = useState(null);          // File Viewer popup: { link, title }
  const setAddress = useCallback((t, v = null) => {
    setVisit((n) => n + 1);
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set("tab", t);
      if (v) n.set("view", v); else n.delete("view");
      return n;
    });
  }, [setParams]);
  const goTab = useCallback((t) => setAddress(t), [setAddress]);
  // The tab underline slides to the chosen tab
  const tabRefs = useRef({});
  const [underline, setUnderline] = useState(null);   // { left, width }
  useLayoutEffect(() => {
    const el = tabRefs.current[tab];
    if (el) setUnderline({ left: el.offsetLeft, width: el.offsetWidth });
  }, [tab, letters.length]);
  const openView = useCallback((v) => setAddress("letters", v), [setAddress]);
  const backToLetters = useCallback(() => setAddress("letters"), [setAddress]);
  const [statusTip, setStatusTip] = useState(null);   // { x, y, st } while hovering a row strip
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const [bodyWidth, setBodyWidth] = useState(0);       // visible width of the rows box
  const headRef = useRef(null);
  const bodyRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ls, ts] = await Promise.all([getSoftcopyLetters(), getSoftcopyTransmittals()]);
      setLetters(ls);
      setTransmittals(ts);
      setSaveError(getSoftcopySaveError());
    } catch (err) {
      setError(err?.response?.data?.detail ?? err?.message ?? "Could not load letters.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-sort scope: set when the tab is opened (also when opened by Back /
  // Forward or a bookmark), from the ticked letters, else all unsorted ones.
  const openAutoSort = useCallback((ids = null) => {
    const ticked = letters.filter((l) => selected.has(l.id));
    setAutoSortIds(ids || (ticked.length ? ticked : letters.filter((l) => !l.units.length)).map((l) => l.id));
  }, [letters, selected]);
  useEffect(() => {
    if (view !== "autosort") { if (autoSortIds !== null) setAutoSortIds(null); return; }
    if (autoSortIds === null && !loading) openAutoSort();
  }, [view, autoSortIds, loading, openAutoSort]);
  const autoSortLetters = useMemo(() => {
    const ids = new Set(autoSortIds || []);
    return letters.filter((l) => ids.has(l.id));
  }, [letters, autoSortIds]);
  const autoSortTicked = autoSortIds !== null && selected.size > 0 && autoSortIds.every((id) => selected.has(id));

  const transmittalLetters = useMemo(() => {
    const ids = transmittalIds ? new Set(transmittalIds) : selected;
    return letters.filter((l) => ids.has(l.id));
  }, [letters, transmittalIds, selected]);

  // Groups for the Quick Filters panel (same component as the FGMP Queue).
  const sidebarFilters = useMemo(() => {
    const count = (fn) => letters.filter(fn).length;
    const appTypes = [...new Set(letters.map((l) => l.app_type).filter(Boolean))].sort();
    return [
      {
        key: "starred", label: "Starred",
        items: [
          { value: "all", label: "All", count: letters.length },
          { value: "yes", label: "⭐ Starred", count: count((l) => l.starred), color: STAR_COLOR },
        ],
      },
      // Unit is a dropdown on the search row (see unitCounts), not a panel group.
      {
        key: "section", label: "Section",
        items: [
          { value: "all", label: "All", count: letters.length },
          // Every section in unit order; only the ones in use are shown
          ...[...new Set(UNITS.flatMap((u) => SECTIONS[u]))]
            .map((sec) => ({ value: sec, label: sec, count: count((l) => l.sections.includes(sec)) }))
            .filter((i) => i.count > 0),
        ],
      },
      {
        key: "app_type", label: "App Type",
        items: [
          { value: "all", label: "All", count: letters.length },
          ...appTypes.map((a) => ({ value: a, label: a, count: count((l) => l.app_type === a) })),
        ],
      },
    ];
  }, [letters]);

  // Counts for the Unit dropdown on the search row.
  const unitCounts = useMemo(() => {
    const out = { all: letters.length, [NOT_SORTED]: 0 };
    UNITS.forEach((u) => { out[u] = 0; });
    letters.forEach((l) => {
      if (!l.units.length) out[NOT_SORTED] += 1;
      l.units.forEach((u) => { if (u in out) out[u] += 1; });
    });
    return out;
  }, [letters]);

  // Date filter: which date to check + a from/to range (YYYY-MM-DD, either can be empty).
  const [dateField, setDateField] = useState(saved.dateField || "date_received");
  const [dateFrom, setDateFrom] = useState(saved.dateFrom || "");
  const [dateTo, setDateTo] = useState(saved.dateTo || "");
  useEffect(() => {
    try { localStorage.setItem(FILTERS_KEY, JSON.stringify({ quick, dateField, dateFrom, dateTo })); } catch { /* ignore */ }
  }, [quick, dateField, dateFrom, dateTo]);
  const dateOn = Boolean(dateFrom || dateTo);
  const letterDate = (l) => {
    if (dateField === "forwarded") return l.forwards.length ? l.forwards[l.forwards.length - 1].at.slice(0, 10) : "";
    if (dateField === "uploaded_at") return (l.uploaded_at || "").slice(0, 10);
    return l[dateField] || "";
  };

  const onQuickSelect = (key, value) => setQuick((prev) => ({ ...prev, [key]: value }));
  const filtersOn = Object.values(quick).some((v) => v !== "all") || dateOn;

  // Two or more DTNs in the box (comma, space or one per line) = show exactly
  // those DTNs. Anything else = normal text search.
  const dtnQuery = useMemo(() => parseDtnSearch(search), [search]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const dtnSet = dtnQuery ? new Set(dtnQuery.dtns) : null;
    return letters
      .filter((l) => {
        if (dtnSet) {
          if (!dtnSet.has(l.dtn)) return false;
        } else if (q && ![l.dtn, l.app_dtn, l.company_name, l.subject, l.remarks, l.receiving_officer].some((v) => (v || "").toLowerCase().includes(q))) {
          return false;
        }
        if (quick.starred === "yes" && !l.starred) return false;
        if (quick.unit === NOT_SORTED && l.units.length) return false;
        if (quick.unit !== "all" && quick.unit !== NOT_SORTED && !l.units.includes(quick.unit)) return false;
        if (quick.section !== "all" && !l.sections.includes(quick.section)) return false;
        if (quick.app_type !== "all" && l.app_type !== quick.app_type) return false;
        if (dateOn) {
          const d = letterDate(l);
          if (!d) return false;
          if (dateFrom && d < dateFrom) return false;
          if (dateTo && d > dateTo) return false;
        }
        return true;
      })
      .sort((a, b) => (b.date_received || "").localeCompare(a.date_received || "") || b.dtn.localeCompare(a.dtn));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letters, quick, search, dtnQuery, dateField, dateFrom, dateTo]);

  // Drop selections that are no longer visible (only while on the Letters
  // tab: the ticks feed the Auto-sort and Transmittal tabs).
  useEffect(() => {
    if (tab !== "letters" || view) return;
    const ids = new Set(visible.map((l) => l.id));
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visible]);

  // Star / unstar — only this button changes a star. The row updates right
  // away; if saving fails it flips back.
  const toggleStar = async (l) => {
    const next = !l.starred;
    const flip = (val) => setLetters((prev) => prev.map((x) => (x.id === l.id ? { ...x, starred: val } : x)));
    flip(next);
    try {
      await setSoftcopyStar(l.id, next);
      setSaveError(getSoftcopySaveError());
    } catch (err) {
      flip(!next);
      setError(err?.response?.data?.detail ?? err?.message ?? "Could not save the star.");
    }
  };

  // Header star — stars every row shown right now (all pages of the current
  // search / Quick Filters). If they're all starred already, it unstars them,
  // asking first when it's more than one.
  const allShownStarred = visible.length > 0 && visible.every((l) => l.starred);
  const toggleStarShown = async () => {
    if (visible.length === 0) return;
    const star = !allShownStarred;
    if (!star && visible.length > 1 && !(await confirm({
      title: `Unstar all ${visible.length} letters shown?`,
      message: "Every letter shown right now (all pages of this search and filters) loses its star.",
      confirmLabel: "Unstar all",
      icon: "☆",
    }))) return;
    const ids = new Set(visible.map((l) => l.id));
    const before = new Map(letters.map((l) => [l.id, l.starred]));
    setLetters((prev) => prev.map((x) => (ids.has(x.id) ? { ...x, starred: star } : x)));
    try {
      await setSoftcopyStars([...ids], star);
      setSaveError(getSoftcopySaveError());
    } catch (err) {
      setLetters((prev) => prev.map((x) => (ids.has(x.id) ? { ...x, starred: before.get(x.id) } : x)));
      setError(err?.response?.data?.detail ?? err?.message ?? "Could not save the stars.");
    }
  };

  // Step 1.5 — double-click ANY row (no app type or unit limit). Clicks on
  // the checkbox, unit dropdown or Drive link are ignored so those still
  // work normally.
  const onRowDoubleClick = (e, l) => {
    if (e.target.closest("input, select, a, button")) return;
    window.getSelection?.()?.removeAllRanges();
    setCorrectionLetter(l);
  };

  // ── Pages ──
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  useEffect(() => { setPage(1); }, [quick, search, pageSize, dateField, dateFrom, dateTo]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  const pageRows = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );
  const firstRow = visible.length ? (page - 1) * pageSize + 1 : 0;
  const lastRow = Math.min(page * pageSize, visible.length);

  // Back to the top of the rows when the page changes
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [page, pageSize]);

  // The header sits outside the rows' scroll box, so give it the same right
  // gap as the rows' scrollbar to keep the columns lined up.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return undefined;
    const measure = () => {
      setScrollbarWidth(body.offsetWidth - body.clientWidth);
      setBodyWidth(body.clientWidth);
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(body);
    return () => ro?.disconnect();
  }, [pageRows, loading]);

  const onBodyScroll = (e) => {
    if (headRef.current) headRef.current.scrollLeft = e.currentTarget.scrollLeft;
  };

  // Header checkbox = this page's rows (other pages' ticks are kept)
  const allChecked = pageRows.length > 0 && pageRows.every((l) => selected.has(l.id));
  const toggleAll = () => setSelected((prev) => {
    const next = new Set(prev);
    pageRows.forEach((l) => (allChecked ? next.delete(l.id) : next.add(l.id)));
    return next;
  });
  const toggleOne = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const inputStyle = {
    padding: "8px 10px", fontSize: "0.8rem", fontFamily: FONT, borderRadius: 8,
    border: `1px solid ${colors.inputBorder}`, background: colors.inputBg, color: colors.textPrimary, outline: "none",
  };
  const th = {
    padding: "10px 12px", textAlign: "center", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.03em",
    textTransform: "uppercase", color: colors.textTertiary, background: colors.tableBg,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  };
  const td = { padding: "10px 12px", fontSize: "0.78rem", color: colors.textSecondary, verticalAlign: "middle", overflowWrap: "anywhere", textAlign: "center" };
  // Actions column stays on the right when scrolling sideways
  const stickyRight = { position: "sticky", right: 0, zIndex: 2, boxShadow: `-1px 0 0 ${colors.cardBorder}` };
  // Checkbox column stays put when scrolling sideways
  const stickyCol = {
    position: "sticky", left: 0, zIndex: 2, textAlign: "center",
    boxShadow: `1px 0 0 ${colors.cardBorder}`,
  };
  // One look for every star (header + rows). Fixed box and plain weight so
  // the header's bold / uppercase text style doesn't make its star bigger.
  const starBtn = (on, enabled = true) => ({
    width: 20, height: 20, padding: 0, margin: 0, border: "none", background: "transparent",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: "1.05rem", fontWeight: 400, lineHeight: 1, letterSpacing: 0, textTransform: "none",
    fontFamily: "Arial, sans-serif",
    color: on ? STAR_COLOR : colors.textTertiary,
    opacity: enabled ? (on ? 1 : 0.55) : 0.3,
    cursor: enabled ? "pointer" : "not-allowed",
  });
  const checkCell = { display: "flex", alignItems: "center", justifyContent: "center", gap: 8 };
  const dash = <span style={{ color: colors.textTertiary }}>—</span>;
  const unitChip = (c) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700,
    color: c, background: `${c}14`, border: `1px solid ${c}66`, whiteSpace: "nowrap",
  });
  const cellBtn = { width: "100%", padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: FONT };
  const checkbox = { width: 15, height: 15, margin: 0, cursor: "pointer" };

  const tableStyle = { width: "100%", minWidth: TABLE_MIN_WIDTH, borderCollapse: "collapse", tableLayout: "fixed" };
  const colgroup = <colgroup>{COLS.map((c) => <col key={c.key} style={{ width: c.width }} />)}</colgroup>;
  const pagerBtn = (enabled, active = false) => ({
    minWidth: 32, height: 32, padding: "0 8px", fontSize: "0.76rem", fontWeight: active ? 700 : 600, fontFamily: FONT,
    borderRadius: 8, border: `1px solid ${active ? (darkMode ? "#F1F5F9" : INK) : colors.cardBorder}`,
    background: active ? (darkMode ? "#F1F5F9" : INK) : colors.cardBg,
    color: active ? (darkMode ? INK : "#fff") : enabled ? colors.textSecondary : colors.textTertiary,
    cursor: enabled ? "pointer" : "not-allowed", opacity: enabled ? 1 : 0.5,
  });

  // ── Screens that open in place of the table ──
  // A quiet note with one way forward (nothing to sort, nothing picked).
  const emptyNote = (title, text, actionLabel, onAction) => (
    <div style={{
      flex: 1, minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: 14,
    }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <p style={{ margin: "0 0 6px", fontSize: "1rem", fontWeight: 700, color: colors.textPrimary }}>{title}</p>
        <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: 1.55, color: colors.textTertiary }}>{text}</p>
        {actionLabel && (
          <button onClick={onAction} style={{ ...darkBtn, marginTop: 18 }}>{actionLabel}</button>
        )}
      </div>
    </div>
  );
  const viewBody = () => {
    if (view === "autosort") {
      if (autoSortIds === null) return null;
      if (autoSortLetters.length === 0) {
        return emptyNote("Every letter is sorted", "Nothing is waiting for a unit. To check some letters again, tick them in Letters and click Auto-sort.", "Back to letters", backToLetters);
      }
      return (
        <SoftcopyAutoSortModal
          key={`autosort-${visit}`} asView colors={colors} darkMode={darkMode}
          letters={autoSortLetters}
          scopeLabel={autoSortScope}
          unitColors={UNIT_COLORS}
          onSaved={load}
          // "Sort more": start again with whatever is still not sorted
          onClose={() => { setSelected(new Set()); setAutoSortIds(null); setVisit((v) => v + 1); }}
        />
      );
    }
    if (transmittalLetters.length === 0) {
      return emptyNote("No letters picked", "Tick the letters to send, then click Make Transmittal. Or use ⋮ → Make Transmittal on one row.", "Back to letters", backToLetters);
    }
    return (
      <SoftcopyForwardModal
        key={`transmittal-${visit}`} asView colors={colors} darkMode={darkMode}
        letters={transmittalLetters}
        onSaved={load}
        onClose={() => { setSelected(new Set()); setTransmittalIds(null); backToLetters(); }}
      />
    );
  };
  const autoSortScope = autoSortTicked
    ? `${autoSortLetters.length} ticked letter${autoSortLetters.length === 1 ? "" : "s"}`
    : `${autoSortLetters.length} letter${autoSortLetters.length === 1 ? "" : "s"} not sorted yet`;
  const viewHint = view === "autosort"
    ? `Check the suggested unit for ${autoSortScope}, then apply.`
    : `Send ${transmittalLetters.length} letter${transmittalLetters.length === 1 ? "" : "s"} to one unit, then update FIS.`;
  const openDrive = (l, link) => setViewer({ link, title: `DTN ${l.dtn}${l.company_name ? ` · ${l.company_name}` : ""}` });

  // Buttons of the new frame
  const darkBtn = {
    height: 38, padding: "0 16px", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 10, border: "none",
    background: darkMode ? "#F1F5F9" : INK, color: darkMode ? INK : "#fff",
    fontSize: "0.8rem", fontWeight: 600, fontFamily: FONT, cursor: "pointer",
  };
  const lineBtn = {
    height: 38, padding: "0 14px", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 10,
    border: `1px solid ${colors.cardBorder}`, background: colors.cardBg, color: colors.textPrimary,
    fontSize: "0.8rem", fontWeight: 600, fontFamily: FONT, cursor: "pointer",
  };
  // The in-page Upload shows while there are no letters, and stays up after
  // an upload until the user picks "See letters" or "Next: Auto-sort".
  const [stayOnUpload, setStayOnUpload] = useState(false);
  const noLetters = (!loading && letters.length === 0) || stayOnUpload;

  // The area under the tabs; each part glides in when it takes this spot
  const stage = { flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column", animation: motion.rise };

  return (
    // Fills the space under the navbar; the table takes whatever height is
    // left, so it reaches the bottom of the screen.
    // minWidth 0 + overflowX hidden: nothing inside can push the page wider
    // than the screen (that pushed Upload against the right edge).
    <div className={MOTION_CLASS} style={{
      fontFamily: FONT, background: colors.pageBg, boxSizing: "border-box",
      flex: 1, minHeight: 0, minWidth: 0, overflowX: "hidden", display: "flex",
    }}>
      {/* Quick Filters — same collapsible panel as the FGMP Queue. The shared
          component is 195px wide; the CSS rule below makes it 175px here only
          (when open), without changing the shared FGMP file. */}
      <style>{`.softcopy-qf-open > div { width: 175px !important; }`}</style>
      {/* Quick Filters belong to the letters table only */}
      {tab === "letters" && !view && !noLetters && (
        <div className={collapsed ? undefined : "softcopy-qf-open"} style={{ display: "flex", flexShrink: 0 }}>
          <QuickFilterSidebar
            filters={sidebarFilters} active={quick}
            onSelect={onQuickSelect} collapsed={collapsed}
            onToggle={() => setCollapsed((v) => !v)}
            colors={colors} darkMode={darkMode}
          />
        </div>
      )}

      <div style={{
        flex: 1, minWidth: 0, minHeight: 0, padding: "24px 28px", boxSizing: "border-box",
        display: "flex", flexDirection: "column",
      }}>
      {/* Header: title, File Viewer + Upload, then the two tabs */}
      {/* Compact header: one line (title · subtitle · buttons), then the tabs */}
      <header style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14, flexShrink: 0, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.015em", color: colors.textPrimary }}>Softcopy</h1>
            <p style={{ margin: 0, fontSize: "0.78rem", color: colors.textTertiary }}>Letters CDRR-OD received from FDAC</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setViewer({ link: "", title: "" })}
              title="Open a Drive link, a ZIP, a PDF or an image inside the page, without saving it"
              style={{ ...lineBtn, height: 34, padding: "0 12px" }}
            >
              <Icon name="file" size={15} /> File Viewer
            </button>
            <button onClick={() => setShowUpload(true)} title="Add the FDAC Excel" style={{ ...darkBtn, height: 34, padding: "0 14px" }}>
              <Icon name="upload" size={15} /> Upload
            </button>
          </div>
        </div>
        <nav role="tablist" aria-label="Softcopy sections" style={{ position: "relative", display: "flex", gap: 24, borderBottom: `1px solid ${colors.cardBorder}` }}>
          {underline && (
            <span aria-hidden style={{
              position: "absolute", bottom: -1, height: 2, borderRadius: 2, background: colors.textPrimary,
              left: underline.left, width: underline.width,
              transition: `left 0.32s ${EASE}, width 0.32s ${EASE}`,
            }} />
          )}
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                ref={(el) => { tabRefs.current[t.key] = el; }}
                role="tab"
                aria-selected={on}
                onClick={() => goTab(t.key)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8, padding: "0 0 9px", marginBottom: -1,
                  fontSize: "0.82rem", fontWeight: 600, fontFamily: FONT, whiteSpace: "nowrap",
                  border: "none", borderBottom: "2px solid transparent", background: "transparent",
                  color: on ? colors.textPrimary : colors.textTertiary, cursor: "pointer",
                }}
              >
                {t.label}
                {t.key === "letters" && letters.length > 0 && (
                  <span style={{
                    padding: "1px 7px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 600, fontVariantNumeric: "tabular-nums",
                    background: darkMode ? "rgba(255,255,255,0.08)" : "#F1F5F9", color: colors.textSecondary,
                  }}>{letters.length}</span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Each part below glides in when it replaces another (new key = new entrance) */}
      {tab === "downloads" ? (
        <div key="downloads" style={stage}>
          <SoftcopyDownloadsModal key={`downloads-${visit}`} asView colors={colors} darkMode={darkMode} onClose={backToLetters} />
        </div>
      ) : loading && letters.length === 0 && !stayOnUpload ? (
        <div key="loading" style={{ ...stage, alignItems: "center", justifyContent: "center", color: colors.textTertiary, fontSize: "0.82rem" }}>Loading…</div>
      ) : noLetters ? (
        // No letters yet: the Upload screen is the page
        <div key="upload" style={stage}>
          <SoftcopyUploadModal
            key={`upload-inline-${visit}`} asView colors={colors} darkMode={darkMode}
            onClose={() => setStayOnUpload(false)}
            onSuccess={() => { setStayOnUpload(true); load(); }}
            onNext={() => { setStayOnUpload(false); setSelected(new Set()); openView("autosort"); }}
          />
        </div>
      ) : view ? (<div key={`view-${view}`} style={stage}>
        {/* In place of the table: one slim line — "Letters ›" path, the
            screen's icon and title, and its hint — no card of its own, so the
            screen below gets the space */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexShrink: 0, minWidth: 0, flexWrap: "wrap" }}>
          <nav aria-label="Where you are" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem" }}>
            <button
              type="button"
              onClick={backToLetters}
              style={{ padding: 0, border: "none", background: "transparent", color: colors.textTertiary, fontWeight: 500, fontFamily: FONT, fontSize: "inherit", cursor: "pointer" }}
            >Letters</button>
            <span style={{ color: colors.textTertiary, display: "inline-flex" }}><Icon name="chevron" size={13} stroke={2} /></span>
            <span style={{
              width: 26, height: 26, flex: "0 0 auto", borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center",
              background: darkMode ? `${VIEWS[view].color}26` : VIEWS[view].tint, color: darkMode ? "#fff" : VIEWS[view].color,
            }}><Icon name={VIEWS[view].icon} size={14} /></span>
            <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: colors.textPrimary }}>{VIEWS[view].title}</h2>
          </nav>
          <span style={{ fontSize: "0.78rem", color: colors.textTertiary, minWidth: 0 }}>· {viewHint}</span>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {viewBody()}
        </div>
      </div>) : (<div key="table" style={stage}>
      {/* Search + selection bar + filters + Export / Clear */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        {/* Search: a round button that opens into a search bar on hover.
            Stays open while typing (focused) or while it has text. */}
        <div
          // Small delay before closing, so brushing the edge doesn't make it
          // snap open-shut-open.
          onMouseEnter={() => { clearTimeout(searchLeaveRef.current); setSearchHover(true); }}
          onMouseLeave={() => { searchLeaveRef.current = setTimeout(() => setSearchHover(false), 180); }}
          style={{
            position: "relative", flex: "0 0 auto", maxWidth: "100%", overflow: "hidden", borderRadius: searchOpen ? 8 : 18,
            width: searchOpen ? 380 : 36, transition: `width 0.32s ${EASE}, border-radius 0.32s ${EASE}`,
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute", left: 0, top: 0, width: 36, height: "100%", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: "0.85rem", pointerEvents: "none",
              color: searchOpen ? ACCENT : colors.textSecondary,
            }}
          ><Icon name="search" size={15} /></span>
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPaste={(e) => handleMultilinePaste(e, search, setSearch)}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
            onKeyDown={(e) => { if (e.key === "Escape") { setSearch(""); e.currentTarget.blur(); } }}
            // The hint stays in place and only fades in once the bar has room
            // (no browser tooltip: it popped over the table mid-animation).
            placeholder="Search DTN, company or subject · or paste many DTNs"
            aria-label="Search DTN, company or subject, or paste many DTNs"
            className={`sc-search${searchOpen ? " sc-search-open" : ""}`}
            style={{
              ...inputStyle, width: "100%", height: 36, boxSizing: "border-box",
              minWidth: 0, paddingLeft: 34, paddingRight: search ? 28 : 10,
              borderRadius: "inherit",
              borderColor: searchOpen ? ACCENT : colors.inputBorder,
              cursor: searchOpen ? "text" : "pointer",
              transition: `border-color 0.2s ${EASE}`,
            }}
          />
          <style>{`
            .sc-search::placeholder { opacity: 0; transition: opacity 0.12s ${EASE}; }
            .sc-search.sc-search-open::placeholder { opacity: 1; transition: opacity 0.22s ${EASE} 0.14s; }
          `}</style>
          {search && (
            <button
              onClick={() => { setSearch(""); searchRef.current?.focus(); }}
              title="Clear search"
              style={{
                position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                width: 20, height: 20, padding: 0, border: "none", borderRadius: 999,
                background: "transparent", color: colors.textTertiary, cursor: "pointer", fontSize: "0.8rem",
              }}
            >✕</button>
          )}
        </div>

        {/* Always shown, so the two features are easy to find. Nothing ticked:
            Auto-sort works on every letter not sorted yet; Make Transmittal
            asks to select every letter in the list. */}
        <div style={{
          height: 38, boxSizing: "border-box", display: "flex", gap: 4, alignItems: "center", padding: "0 4px", borderRadius: 10,
          border: `1px solid ${colors.cardBorder}`, background: colors.cardBg, boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        }}>
            {selected.size > 0 ? (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 6px 0 10px", borderRadius: 7,
                background: darkMode ? "rgba(16,185,129,0.14)" : "#ECFDF5", color: darkMode ? "#6EE7B7" : GREEN,
                fontSize: "0.76rem", fontWeight: 600, whiteSpace: "nowrap",
              }}>
                {selected.size} selected
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  aria-label="Untick all"
                  title="Untick all"
                  style={{ width: 20, height: 20, padding: 0, border: "none", borderRadius: 999, background: "transparent", color: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                ><Icon name="x" size={12} stroke={2.2} /></button>
              </span>
            ) : (
              <span style={{
                display: "inline-flex", alignItems: "center", height: 30, padding: "0 10px", borderRadius: 7,
                background: darkMode ? "rgba(255,255,255,0.05)" : "#F8FAFC", color: colors.textTertiary,
                fontSize: "0.76rem", fontWeight: 500, whiteSpace: "nowrap",
              }}>
                Tick letters to send
              </span>
            )}
            <span aria-hidden style={{ width: 1, height: 18, background: colors.cardBorder, margin: "0 2px" }} />
            {/* These open in place of the table, with the ticked letters */}
            <button
              onClick={() => openView("autosort")}
              title={selected.size ? "Suggest the unit and section of the ticked letters" : "Suggest the unit and section of every letter not sorted yet"}
              style={{
                height: 30, padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.76rem", fontWeight: 600,
                fontFamily: FONT, borderRadius: 7, border: "none", background: "transparent", color: darkMode ? "#A5B4FC" : INDIGO,
                cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              <Icon name="sparkle" size={14} /> Auto-sort
            </button>
            {/* Nothing ticked: still clickable. It asks first, then ticks every
                letter in the list (search + filters, all pages); the user then
                clicks again to make the transmittal. */}
            <button
              onClick={async () => {
                if (selected.size) { setTransmittalIds(null); openView("transmittal"); return; }
                const n = visible.length;
                const ok = await confirm({
                  title: `Select all ${n} letter${n === 1 ? "" : "s"} in the list?`,
                  message: `No letters are ticked yet. Every letter in the list${filtersOn || search.trim() ? " (with your search and filters)" : ""} will be ticked for the transmittal, on all pages, not just this one.\n\nCheck the ticks, untick any you don't want, then click Make Transmittal again.`,
                  confirmLabel: `Select all ${n}`,
                  icon: "⚠️",
                });
                if (ok) setSelected(new Set(visible.map((l) => l.id)));
              }}
              disabled={selected.size === 0 && visible.length === 0}
              title={selected.size ? "" : visible.length ? "Nothing ticked: click to select every letter in the list" : "No letters in the list"}
              style={{
                height: 30, padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.76rem", fontWeight: 600,
                fontFamily: FONT, borderRadius: 7, border: "none", whiteSpace: "nowrap",
                background: selected.size ? GREEN : (darkMode ? "rgba(255,255,255,0.08)" : "#E2E8F0"),
                color: selected.size ? "#fff" : colors.textTertiary,
                cursor: selected.size || visible.length ? "pointer" : "not-allowed",
              }}
            >
              <Icon name="send" size={14} /> Make Transmittal
            </button>
        </div>

        {/* Unit dropdown + date filter (right side), always shown. */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginLeft: "auto" }}>
          <SoftcopyUnitFilter
            value={quick.unit} onChange={(v) => onQuickSelect("unit", v)}
            units={UNITS} counts={unitCounts} unitColors={UNIT_COLORS} notSorted={NOT_SORTED}
            colors={colors} darkMode={darkMode}
          />

          <SoftcopyDateFilter
            field={dateField} from={dateFrom} to={dateTo}
            onChange={({ field, from, to }) => { setDateField(field); setDateFrom(from); setDateTo(to); }}
            colors={colors} darkMode={darkMode}
          />
          {filtersOn && (
            <button
              onClick={() => { setQuick(NO_FILTERS); setDateFrom(""); setDateTo(""); }}
              title="Clear every filter (Quick Filters, unit and dates)"
              style={{
                height: 36, padding: "0 10px", whiteSpace: "nowrap", borderRadius: 8, fontSize: "0.76rem", fontWeight: 600,
                fontFamily: FONT, border: "1px solid #fecaca", background: darkMode ? "rgba(239,68,68,0.08)" : "#fef2f2",
                color: "#ef4444", cursor: "pointer",
              }}
            >Clear filters</button>
          )}
          <span aria-hidden style={{ width: 1, height: 22, background: colors.cardBorder, margin: "0 4px" }} />
          <button
            onClick={() => {
              const d = new Date();
              const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              // Unit filter on → its name goes in the file name (and the download log)
              const unitName = quick.unit === "all" ? "" : quick.unit === NOT_SORTED ? "Not sorted" : quick.unit;
              exportSoftcopyLetters(visible, `Softcopy Letters${unitName ? ` - ${unitName}` : ""} ${stamp}.xlsx`, unitName);
            }}
            disabled={visible.length === 0}
            title={`Download the ${visible.length} letter${visible.length === 1 ? "" : "s"} shown (search and filters applied), all columns`}
            style={{ ...lineBtn, height: 36, fontWeight: 500, color: colors.textSecondary, opacity: visible.length ? 1 : 0.5, cursor: visible.length ? "pointer" : "not-allowed" }}
          >
            <Icon name="download" size={15} /> Export
          </button>
          <button
            onClick={async () => {
              const ok = await confirm({
                title: `Clear all ${letters.length} letter${letters.length === 1 ? "" : "s"} from this page?`,
                message: "They're only kept in this browser, so this can't be undone. Export to Excel first if you still need them.",
                note: "The Downloads list is not cleared.",
                confirmLabel: "Clear all",
                danger: true,
                icon: "🗑️",
              });
              if (!ok) return;
              clearSoftcopyWork();
              setSelected(new Set());
              load();
            }}
            aria-label="Clear all letters"
            title="Remove every letter from this page (kept in this browser only)"
            style={{ ...lineBtn, height: 36, width: 36, padding: 0, justifyContent: "center", color: "#DC2626" }}
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      </div>

      {dtnQuery && !loading && (
        <div style={{ marginBottom: 12 }}>
          <DtnSearchSummary
            dtns={dtnQuery.dtns}
            invalid={dtnQuery.invalid}
            foundDtns={visible.map((l) => l.dtn)}
            colors={colors}
            note={
              filtersOn
                ? "The Quick Filters still apply, so a DTN can be \"not found\" because it's filtered out."
                : "Click the ☆ in the column header to star all of them."
            }
          />
        </div>
      )}

      {error && (
        <p style={{ margin: "0 0 12px", fontSize: "0.76rem", color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: 7, border: "1px solid #fecaca" }}>
          ⚠️ {String(error)}
        </p>
      )}
      {saveError && (
        <p style={{ margin: "0 0 12px", fontSize: "0.76rem", color: "#b45309", background: "#fffbeb", padding: "8px 12px", borderRadius: 7, border: "1px solid #fcd34d" }}>
          ⚠️ {saveError}
        </p>
      )}

      {/* Table — header and rows are separate so the scrollbar covers the rows only */}
      <div style={{
        background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: 12,
        boxShadow: colors.cardShadow, overflow: "hidden",
        flex: 1, minHeight: 360, display: "flex", flexDirection: "column",
      }}>
        {/* Header: follows the rows when they scroll sideways */}
        <div
          ref={headRef}
          style={{
            overflow: "hidden", paddingRight: scrollbarWidth, background: colors.tableBg, flexShrink: 0,
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          <table style={tableStyle}>
            {colgroup}
            <thead>
              <tr>
                {COLS.map((c) => c.key === "check" ? (
                  <th key={c.key} style={{ ...th, ...stickyCol, background: colors.tableBg, overflow: "visible" }}>
                    <div style={checkCell}>
                      <input
                        type="checkbox" checked={allChecked} onChange={toggleAll} style={checkbox}
                        disabled={pageRows.length === 0} title="Tick all on this page"
                      />
                      <button
                        onClick={toggleStarShown}
                        disabled={visible.length === 0}
                        title={
                          allShownStarred
                            ? `All ${visible.length} shown are starred · click to unstar them`
                            : `Star all ${visible.length} shown (every page)`
                        }
                        style={starBtn(allShownStarred, visible.length > 0)}
                      >
                        {allShownStarred ? "★" : "☆"}
                      </button>
                    </div>
                  </th>
                ) : (
                  <th key={c.key} style={c.key === "actions" ? { ...th, ...stickyRight, right: scrollbarWidth, background: colors.tableBg } : th} title={c.label}>{c.label}</th>
                ))}
              </tr>
            </thead>
          </table>
        </div>

        {/* Rows: the only part that scrolls */}
        <div
          ref={bodyRef}
          onScroll={onBodyScroll}
          style={{ overflow: "auto", flex: 1, minHeight: 0 }}
        >
          <table style={tableStyle}>
            {colgroup}
            <tbody>
            {loading || visible.length === 0 ? (
              // The table is wider than the screen: keep the message in the
              // middle of the part you can see, not the whole table.
              <tr><td colSpan={COLS.length} style={{ ...td, padding: 0, color: colors.textTertiary }}>
                <div style={{
                  position: "sticky", left: 0, width: bodyWidth || "100%", boxSizing: "border-box",
                  padding: 32, textAlign: "center",
                }}>
                  {loading ? "Loading…" : letters.length === 0 ? (
                    <>
                      No letters yet. Upload the FDAC Excel to start.
                      <div>
                        <button onClick={() => setShowUpload(true)} style={{
                          marginTop: 12, padding: "8px 16px", fontSize: "0.78rem", fontWeight: 700, fontFamily: FONT, borderRadius: 8,
                          border: "none", background: ACCENT, color: "#fff", cursor: "pointer",
                        }}>📤 Go to Upload</button>
                      </div>
                    </>
                  ) : "No letters match."}
                </div>
              </td></tr>
            ) : pageRows.map((l, i) => {
              // Solid colours so the sticky checkbox cell hides what slides under it
              const rowBg = selected.has(l.id) ? colors.tableRowAccentHover : i % 2 ? colors.tableRowAlt : colors.tableBg;
              const st = rowStatus(l);
              return (
                <tr
                  key={l.id}
                  onDoubleClick={(e) => onRowDoubleClick(e, l)}
                  title="Double-click: Technical or System error"
                  style={{ background: rowBg, cursor: "pointer" }}
                >
                  <td style={{ ...td, ...stickyCol, zIndex: 1, background: rowBg }}>
                    {/* Status strip: 4px bar; the 12px hover area shows what's missing */}
                    <div
                      title=""
                      onMouseEnter={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        setStatusTip({ x: r.right + 8, y: r.top + r.height / 2, st });
                      }}
                      onMouseLeave={() => setStatusTip(null)}
                      style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 12, cursor: "help", zIndex: 1 }}
                    >
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: st.bar }} />
                    </div>
                    <div style={checkCell}>
                      <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleOne(l.id)} style={checkbox} />
                      <button
                        onClick={() => toggleStar(l)}
                        title={l.starred ? "Starred · click to unstar" : "Star this letter"}
                        aria-pressed={l.starred}
                        style={starBtn(l.starred)}
                      >
                        {l.starred ? "★" : "☆"}
                      </button>
                    </div>
                  </td>
                  <td style={{ ...td, fontFamily: "ui-monospace, Consolas, monospace", color: colors.textPrimary, whiteSpace: "nowrap" }}>{l.dtn}</td>
                  <td style={{ ...td, fontFamily: "ui-monospace, Consolas, monospace" }}>{l.app_dtn || dash}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtDate(l.date_received)}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtDate(l.date_received_cdrr)}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{l.app_type || "—"}</td>
                  <td style={td}>{l.company_name || "—"}</td>
                  <td style={{ ...td, lineHeight: 1.45, color: colors.textPrimary }}>{l.subject || "—"}</td>
                  <td style={td}>
                    <button
                      onClick={() => setEditLetter(l)}
                      title={l.unit_set_by ? `Set by ${l.unit_set_by} · click to change` : "Click to set the unit"}
                      style={{ ...cellBtn, display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}
                    >
                      {l.units.length ? l.units.map((u) => (
                        <span key={u} style={unitChip(UNIT_COLORS[u])}>{u}</span>
                      )) : (
                        <span style={{ ...unitChip(colors.textTertiary), borderStyle: "dashed" }}>+ Set unit</span>
                      )}
                    </button>
                  </td>
                  <td style={td}>
                    {l.sections.length ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                        {l.sections.map((sec) => <span key={sec} style={unitChip("#6366f1")}>{sec}</span>)}
                      </div>
                    ) : dash}
                  </td>
                  <td style={td}>{l.receiving_officer || dash}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {l.forwards.length ? l.forwards.map((f, k) => (
                      <div key={k} title={`${fmtDateTime(f.at)} · by ${f.by}`} style={{ lineHeight: 1.35, marginTop: k ? 4 : 0 }}>
                        <div>{fmtDate(f.at.slice(0, 10))}</div>
                        <div style={{ fontSize: "0.68rem", color: colors.textTertiary }}>to {f.to}</div>
                      </div>
                    )) : dash}
                  </td>
                  <td style={{ ...td, lineHeight: 1.45 }}>{l.remarks || dash}</td>
                  <td style={td}>{l.correction_detail || dash}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {l.drive_link ? (
                      <button
                        type="button"
                        onClick={() => openDrive(l, l.drive_link)}
                        style={{ padding: 0, border: "none", background: "transparent", color: ACCENT, fontWeight: 600, fontFamily: FONT, fontSize: "inherit", cursor: "pointer" }}
                      >
                        📁 View
                      </button>
                    ) : (
                      <span style={{ color: colors.textTertiary }} title="No Drive link. Use File Viewer (top right) and drop the link or the ZIP.">—</span>
                    )}
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{l.uploaded_by || "—"}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtDateTime(l.uploaded_at)}</td>
                  <td style={{ ...td, ...stickyRight, zIndex: 1, background: rowBg }}>
                    <SoftcopyActionMenu
                      letter={l}
                      isCorrection={isCorrection}
                      onEdit={() => setEditLetter(l)}
                      onCorrection={() => setCorrectionLetter(l)}
                      onForward={() => { setTransmittalIds([l.id]); openView("transmittal"); }}
                      folderLink={transmittals.find((t) => t.id === l.transmittal_id)?.drive_folder_link || ""}
                      onDrive={(link) => openDrive(l, link)}
                      colors={colors} darkMode={darkMode}
                    />
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>

        {/* Pages */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
          padding: "10px 14px", borderTop: `1px solid ${colors.cardBorder}`, background: colors.tableBg, flexShrink: 0,
        }}>
          <span style={{ fontSize: "0.74rem", color: colors.textTertiary }}>
            Showing {firstRow}–{lastRow} of {visible.length}
            {visible.length !== letters.length && ` (${letters.length} in total)`}
            {selected.size > 0 && ` · ${selected.size} ticked`}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.74rem", color: colors.textTertiary, marginRight: 6 }}>
              Rows per page
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{ ...inputStyle, padding: "5px 8px", fontSize: "0.76rem" }}
              >
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <button onClick={() => setPage(1)} disabled={page === 1} style={pagerBtn(page > 1)} title="First page">«</button>
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} style={pagerBtn(page > 1)} title="Previous page">‹</button>
            {pageList(page, pageCount).map((p, i) => p === "…" ? (
              <span key={`gap${i}`} style={{ padding: "0 4px", color: colors.textTertiary }}>…</span>
            ) : (
              <button key={p} onClick={() => setPage(p)} style={pagerBtn(true, p === page)}>{p}</button>
            ))}
            <button onClick={() => setPage((p) => p + 1)} disabled={page === pageCount} style={pagerBtn(page < pageCount)} title="Next page">›</button>
            <button onClick={() => setPage(pageCount)} disabled={page === pageCount} style={pagerBtn(page < pageCount)} title="Last page">»</button>
          </div>
        </div>
      </div>
      </div>)}
      </div>

      {statusTip && (
        <div
          role="tooltip"
          style={{
            position: "fixed", left: statusTip.x, top: statusTip.y, transform: "translateY(-50%)", zIndex: 10002,
            pointerEvents: "none", minWidth: 180, maxWidth: 280, padding: "8px 11px", borderRadius: 8, fontFamily: FONT,
            background: darkMode ? "#242526" : "#fff", border: `1px solid ${colors.cardBorder}`,
            boxShadow: darkMode ? "0 8px 24px rgba(0,0,0,0.45)" : "0 8px 24px rgba(15,23,42,0.12)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
            <span style={{ width: 4, height: 14, borderRadius: 2, background: statusTip.st.bar }} />
            <span style={{ fontSize: "0.74rem", fontWeight: 700, color: statusTip.st.ink }}>{statusTip.st.title}</span>
          </div>
          {statusTip.st.lines.map((t) => (
            <div key={t} style={{ fontSize: "0.72rem", lineHeight: 1.45, color: colors.textSecondary, paddingLeft: 11 }}>· {t}</div>
          ))}
        </div>
      )}

      {confirmBox}

      {/* Popups from the header buttons */}
      {showUpload && (
        <SoftcopyUploadModal
          colors={colors} darkMode={darkMode}
          onClose={() => setShowUpload(false)}
          onSuccess={load}
          onNext={() => { setShowUpload(false); setSelected(new Set()); openView("autosort"); }}
        />
      )}
      {viewer && (
        <SoftcopyDriveViewer
          initialLink={viewer.link} title={viewer.title}
          colors={colors} darkMode={darkMode}
          onClose={() => setViewer(null)}
        />
      )}

      {editLetter && (
        <SoftcopyEditModal
          letter={editLetter}
          unitColors={UNIT_COLORS}
          colors={colors}
          darkMode={darkMode}
          onClose={() => setEditLetter(null)}
          onSaved={load}
        />
      )}

      {correctionLetter && (
        <SoftcopyCorrectionModal
          letter={correctionLetter}
          colors={colors}
          darkMode={darkMode}
          onClose={() => setCorrectionLetter(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

export default SoftcopyPage;
