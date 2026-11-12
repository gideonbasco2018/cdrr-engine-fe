// src/components/monitoring/priorityMeds/PriorityMedsRecordsModal.jsx
import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import {
  getPriorityMedsRecords,
  getPriorityMedsGenericNames,
} from "../../../api/priority-meds";

const FB = "#1877F2";
const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const PAGE_SIZE = 50;
const EXPORT_PAGE_SIZE = 500;

// ── Multi-select dropdown for generic names (rendered in <body>) ──────
function GenericNamePicker({ options, selected, onChange, ui, darkMode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [q, setQ] = useState("");
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const line =
    ui.divider ?? (darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)");

  useEffect(() => {
    if (!open) return;
    const outside = (e) => {
      if (
        btnRef.current?.contains(e.target) ||
        popRef.current?.contains(e.target)
      )
        return;
      setOpen(false);
    };
    // Capture phase: Escape closes the dropdown first, not the whole modal
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", outside);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", outside);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const toggleOpen = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen((o) => !o);
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle
      ? options.filter((o) => o.name.toLowerCase().includes(needle))
      : options;
  }, [options, q]);

  const toggle = (name) =>
    onChange(
      selected.includes(name)
        ? selected.filter((n) => n !== name)
        : [...selected, name],
    );

  const selectAllFiltered = () =>
    onChange([...new Set([...selected, ...filtered.map((o) => o.name)])]);

  const label =
    selected.length === 0
      ? "All generic names"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} generic names selected`;

  const linkBtn = {
    border: "none",
    background: "transparent",
    color: FB,
    fontSize: "0.72rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: font,
    padding: 0,
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggleOpen}
        title="Filter by generic name (select one or more)"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          maxWidth: 320,
          padding: "5px 12px",
          fontSize: "0.75rem",
          fontWeight: 600,
          borderRadius: 8,
          border: `1px solid ${selected.length ? FB : ui.cardBorder}`,
          background: selected.length ? `${FB}15` : "transparent",
          color: selected.length ? FB : ui.textPrimary,
          cursor: "pointer",
          fontFamily: font,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: "0.6rem", opacity: 0.7 }}>▾</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={popRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 1100,
              width: 360,
              maxWidth: "calc(100vw - 24px)",
              background: ui.cardBg,
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 12,
              boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
              fontFamily: font,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: 8, borderBottom: `1px solid ${line}` }}>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search generic name…"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "transparent",
                  border: `1px solid ${ui.cardBorder}`,
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: "0.78rem",
                  color: ui.textPrimary,
                  outline: "none",
                  fontFamily: font,
                  colorScheme: darkMode ? "dark" : "light",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 8,
                }}
              >
                <button onClick={selectAllFiltered} style={linkBtn}>
                  Select all {q.trim() ? "matches" : ""} ({filtered.length})
                </button>
                <button
                  onClick={() => onChange([])}
                  disabled={selected.length === 0}
                  style={{ ...linkBtn, opacity: selected.length ? 1 : 0.4 }}
                >
                  Clear
                </button>
              </div>
            </div>

            <div style={{ maxHeight: 300, overflowY: "auto", padding: 6 }}>
              {filtered.length === 0 ? (
                <div
                  style={{
                    padding: 16,
                    textAlign: "center",
                    fontSize: "0.78rem",
                    color: ui.textMuted,
                  }}
                >
                  No generic names found
                </div>
              ) : (
                filtered.map((o) => {
                  const checked = selected.includes(o.name);
                  return (
                    <label
                      key={o.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 8px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: "0.78rem",
                        fontWeight: checked ? 700 : 500,
                        color: ui.textPrimary,
                        background: checked ? `${FB}15` : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(o.name)}
                        style={{ accentColor: FB, cursor: "pointer" }}
                      />
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={o.name}
                      >
                        {o.name}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: ui.textMuted }}>
                        {o.count.toLocaleString()}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * target = { title, program, exportFilename }
 */
function PriorityMedsRecordsModal({ target, ui, darkMode, onClose }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [genericOptions, setGenericOptions] = useState([]);
  const [selectedGenerics, setSelectedGenerics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const filtersActive = !!query || selectedGenerics.length > 0;

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Load the generic name options once per program
  useEffect(() => {
    let cancelled = false;
    getPriorityMedsGenericNames({ program: target.program })
      .then((res) => {
        if (!cancelled) setGenericOptions(res.data ?? []);
      })
      .catch((err) => console.error("Generic names fetch error:", err));
    return () => {
      cancelled = true;
    };
  }, [target.program]);

  const buildParams = (pageNum, pageSize) => ({
    program: target.program,
    search: query || undefined,
    generic_names: selectedGenerics.length ? selectedGenerics : undefined,
    page: pageNum,
    page_size: pageSize,
  });

  // Fetch the current page
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getPriorityMedsRecords(buildParams(page, PAGE_SIZE));
        if (cancelled) return;
        setRows(res.data ?? []);
        setTotal(res.total ?? 0);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load records.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, page, query, selectedGenerics]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const changeGenerics = (next) => {
    setSelectedGenerics(next);
    setPage(1);
  };

  // Export every record that matches the current filters (not just this page)
  const handleExport = async () => {
    if (exporting || total === 0) return;
    setExporting(true);
    try {
      const pages = Math.ceil(total / EXPORT_PAGE_SIZE);
      let all = [];
      for (let p = 1; p <= pages; p++) {
        const res = await getPriorityMedsRecords(
          buildParams(p, EXPORT_PAGE_SIZE),
        );
        all = all.concat(res.data ?? []);
      }

      const header = ["DTN", "Generic Name", "Brand Name"];
      const body = all.map((r) => [
        r.dtn ?? "",
        r.generic_name ?? "",
        r.brand_name ?? "",
      ]);

      const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
      ws["!cols"] = [{ wch: 18 }, { wch: 40 }, { wch: 40 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Records");
      XLSX.writeFile(
        wb,
        `${target.exportFilename ?? "priority-meds"}-records-${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`,
      );
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export records.");
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const line =
    ui.divider ?? (darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)");

  const btn = (disabled) => ({
    padding: "5px 12px",
    fontSize: "0.75rem",
    fontWeight: 600,
    borderRadius: 8,
    border: `1px solid ${ui.cardBorder}`,
    background: "transparent",
    color: ui.textPrimary,
    fontFamily: font,
    opacity: disabled ? 0.35 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  });
  const th = {
    padding: "9px 14px",
    textAlign: "left",
    fontSize: "0.66rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: ui.textMuted,
    background: darkMode ? ui.sidebarBg : "#f8f9fd",
    borderBottom: `1px solid ${line}`,
    position: "sticky",
    top: 0,
    whiteSpace: "nowrap",
  };
  const td = {
    padding: "9px 14px",
    fontSize: "0.78rem",
    color: ui.textPrimary,
    borderBottom: `1px solid ${line}`,
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(900px, 100%)",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          fontFamily: font,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 18px",
            borderBottom: `1px solid ${line}`,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              {target.title}
            </div>
            <div style={{ fontSize: "0.72rem", color: ui.textMuted }}>
              {loading && rows.length === 0
                ? "Loading…"
                : `${total.toLocaleString()} record(s)${filtersActive ? " (filtered)" : ""}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              name="priority-meds-search"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search DTN, generic or brand…"
              style={{
                width: 230,
                background: "transparent",
                border: `1px solid ${ui.cardBorder}`,
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: "0.78rem",
                color: ui.textPrimary,
                outline: "none",
                fontFamily: font,
                colorScheme: darkMode ? "dark" : "light",
              }}
            />
            <button
              onClick={handleExport}
              disabled={exporting || loading || total === 0}
              title="Export the filtered records to Excel"
              style={{
                ...btn(exporting || loading || total === 0),
                color: FB,
                border: `1px solid ${FB}`,
              }}
            >
              {exporting ? "Exporting…" : "⬇ Export Excel"}
            </button>
            <button onClick={onClose} title="Close (Esc)" style={btn(false)}>
              ✕
            </button>
          </div>
        </div>

        {/* Generic name filter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 18px",
            borderBottom: `1px solid ${line}`,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: ui.textMuted,
            }}
          >
            Generic Name
          </span>
          <GenericNamePicker
            options={genericOptions}
            selected={selectedGenerics}
            onChange={changeGenerics}
            ui={ui}
            darkMode={darkMode}
          />
          {selectedGenerics.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                maxHeight: 64,
                overflowY: "auto",
                flex: 1,
                minWidth: 0,
              }}
            >
              {selectedGenerics.map((name) => (
                <span
                  key={name}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "2px 10px",
                    borderRadius: 99,
                    border: `1px solid ${FB}`,
                    background: `${FB}15`,
                    color: FB,
                    fontSize: "0.7rem",
                    fontWeight: 600,
                  }}
                >
                  {name}
                  <span
                    onClick={() =>
                      changeGenerics(selectedGenerics.filter((n) => n !== name))
                    }
                    title="Remove"
                    style={{ cursor: "pointer", opacity: 0.8 }}
                  >
                    ✕
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <div
          style={{
            flex: 1,
            minHeight: 240,
            overflow: "auto",
            opacity: loading && rows.length > 0 ? 0.5 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {error ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "#f87171",
                fontSize: "0.85rem",
              }}
            >
              {error}
            </div>
          ) : loading && rows.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: ui.textMuted,
                fontSize: "0.85rem",
              }}
            >
              Loading records…
            </div>
          ) : rows.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: ui.textMuted,
                fontSize: "0.85rem",
              }}
            >
              No records found
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "center", width: 50 }}>#</th>
                  <th style={th}>DTN</th>
                  <th style={th}>Generic Name</th>
                  <th style={th}>Brand Name</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.db_id ?? `${r.dtn}-${i}`}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = ui.hoverBg)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td
                      style={{
                        ...td,
                        textAlign: "center",
                        color: ui.textMuted,
                      }}
                    >
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td style={{ ...td, fontWeight: 600, color: FB }}>
                      {r.dtn ?? "—"}
                    </td>
                    <td style={td}>{r.generic_name ?? "—"}</td>
                    <td style={td}>{r.brand_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer / pagination */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 18px",
            borderTop: `1px solid ${line}`,
          }}
        >
          <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
            {start}–{end} of {total.toLocaleString()}
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              style={btn(page === 1 || loading)}
              disabled={page === 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹ Prev
            </button>
            <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
              Page {page} / {totalPages}
            </span>
            <button
              style={btn(page >= totalPages || loading)}
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next ›
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default PriorityMedsRecordsModal;
