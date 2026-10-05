// FILE: src/pages/ChecklistPage.jsx
// Checklist maker for a batch of forwarded DTNs. The
// receiver clicks "New Checklist", scans each DTN with the scanner gun
// (it types the code + Enter into the focused box), then exports the
// list as PDF or Excel. Scan date/time is set by the server.
import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { getColorScheme } from "../components/donation/colorScheme";
import {
  getChecklists,
  createChecklist,
  getChecklist,
  deleteChecklist,
  addChecklistItem,
  deleteChecklistItem,
} from "../api/checklist";

const DTN_RE = /^\d{14}$/;

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }) : "";
const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";
const fmtDateTime = (iso) => (iso ? `${fmtDate(iso)} ${fmtTime(iso)}` : "");

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
  const [scanValue, setScanValue] = useState("");
  const [message, setMessage] = useState(null); // { type: "ok" | "error", text }
  const [loading, setLoading] = useState(false);

  const scanInputRef = useRef(null);
  // Scans are sent one after another so a fast scanner gun never loses one.
  const scanQueueRef = useRef(Promise.resolve());

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

  const focusScan = () => setTimeout(() => scanInputRef.current?.focus(), 0);

  const openChecklist = async (id) => {
    setLoading(true);
    setMessage(null);
    try {
      setActive(await getChecklist(id));
      focusScan();
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
      loadChecklists();
      focusScan();
    } catch (err) {
      setMessage({ type: "error", text: errorText(err, "Could not create checklist.") });
    } finally {
      setLoading(false);
    }
  };

  const submitDtn = (raw) => {
    const dtn = raw.trim();
    if (!dtn || !active) return;
    if (!DTN_RE.test(dtn)) {
      setMessage({ type: "error", text: `"${dtn}" is not a valid DTN (must be 14 digits).` });
      return;
    }
    const checklistId = active.id;
    scanQueueRef.current = scanQueueRef.current.then(async () => {
      try {
        const item = await addChecklistItem(checklistId, dtn);
        setActive((prev) =>
          prev && prev.id === checklistId ? { ...prev, items: [...prev.items, item] } : prev,
        );
        setMessage({ type: "ok", text: `Added ${dtn}` });
      } catch (err) {
        setMessage({ type: "error", text: errorText(err, `Could not add ${dtn}.`) });
      }
    });
  };

  const handleScanKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    submitDtn(scanValue);
    setScanValue("");
  };

  const handleRemoveItem = async (item) => {
    try {
      await deleteChecklistItem(active.id, item.id);
      setActive((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== item.id) }));
      setMessage({ type: "ok", text: `Removed ${item.dtn}` });
    } catch (err) {
      setMessage({ type: "error", text: errorText(err, `Could not remove ${item.dtn}.`) });
    }
    focusScan();
  };

  const handleDeleteChecklist = async () => {
    if (!window.confirm(`Delete Checklist #${active.id} and all its DTNs?`)) return;
    try {
      await deleteChecklist(active.id);
      setActive(null);
      setMessage({ type: "ok", text: `Checklist #${active.id} deleted.` });
      loadChecklists();
    } catch (err) {
      setMessage({ type: "error", text: errorText(err, "Could not delete checklist.") });
    }
  };

  // ── Exports ─────────────────────────────────────────────────────────────────
  const exportName = () => `checklist_${active.id}_${new Date().toISOString().slice(0, 10)}`;

  const handleExportExcel = () => {
    const generatedAt = fmtDateTime(new Date().toISOString());
    const rows = [
      ["DTN Checklist"],
      [`Checklist No.: ${active.id}`],
      [`Created By: ${active.created_by || ""}`],
      [`Generated: ${generatedAt}`],
      [`Total DTNs: ${active.items.length}`],
      [],
      ["#", "DTN", "Date Scanned", "Time Scanned", "Scanned By", "Received (✓)"],
      ...active.items.map((item, i) => [
        i + 1,
        item.dtn,
        fmtDate(item.scanned_at),
        fmtTime(item.scanned_at),
        item.scanned_by || "",
        "",
      ]),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = [{ wch: 5 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 14 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Checklist");
    XLSX.writeFile(workbook, `${exportName()}.xlsx`);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const left = 15;
    // [header, width mm]
    const cols = [
      ["#", 12],
      ["DTN", 45],
      ["Date Scanned", 32],
      ["Time Scanned", 30],
      ["Scanned By", 40],
      ["Received", 21],
    ];
    const rowH = 8;

    const drawHeaderRow = (y) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setFillColor(230, 236, 245);
      let x = left;
      cols.forEach(([label, w]) => {
        doc.rect(x, y, w, rowH, "FD");
        doc.text(label, x + 2, y + 5.5);
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
    doc.text(`Generated: ${fmtDateTime(new Date().toISOString())}`, left, 40);
    doc.text(`Total DTNs: ${active.items.length}`, left, 46);

    let y = drawHeaderRow(52);
    active.items.forEach((item, i) => {
      if (y + rowH > pageH - 30) {
        doc.addPage();
        y = drawHeaderRow(15);
      }
      const cells = [
        String(i + 1),
        item.dtn,
        fmtDate(item.scanned_at),
        fmtTime(item.scanned_at),
        item.scanned_by || "",
        "",
      ];
      let x = left;
      cols.forEach(([, w], c) => {
        doc.rect(x, y, w, rowH);
        if (c === cols.length - 1) {
          doc.rect(x + w / 2 - 2, y + 2, 4, 4); // tick box
        } else {
          doc.text(cells[c], x + 2, y + 5.5);
        }
        x += w;
      });
      y += rowH;
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
            Scan the DTNs in a batch to make the checklist.
          </p>
        </div>
        <button onClick={handleNewChecklist} disabled={loading} style={btn("#2563eb")}>
          + New Checklist
        </button>
      </div>

      {message && (
        <div
          style={{
            ...card,
            padding: "0.6rem 1rem",
            marginBottom: "1rem",
            fontSize: "0.9rem",
            fontWeight: 600,
            color: message.type === "ok" ? "#16a34a" : "#dc2626",
            borderColor: message.type === "ok" ? "#16a34a55" : "#dc262655",
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
              Click <b>+ New Checklist</b> to start scanning, or pick one from the list.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                <div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>Checklist #{active.id}</div>
                  <div style={{ fontSize: "0.8rem", color: colors.textTertiary }}>
                    Created {fmtDateTime(active.created_at)} by {active.created_by || "—"} · {active.items.length} DTN
                    {active.items.length === 1 ? "" : "s"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={handleExportPdf} disabled={!active.items.length} style={btn("#dc2626")}>
                    Generate PDF
                  </button>
                  <button onClick={handleExportExcel} disabled={!active.items.length} style={btn("#16a34a")}>
                    Generate Excel
                  </button>
                  <button onClick={handleDeleteChecklist} style={btn(colors.badgeBg, colors.textSecondary)}>
                    Delete
                  </button>
                </div>
              </div>

              <input
                ref={scanInputRef}
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                onKeyDown={handleScanKeyDown}
                placeholder="Scan or type DTN, then press Enter"
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

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: "3rem" }}>#</th>
                    <th style={th}>DTN</th>
                    <th style={th}>Date Scanned</th>
                    <th style={th}>Time Scanned</th>
                    <th style={th}>Scanned By</th>
                    <th style={{ ...th, width: "5rem" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {active.items.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ ...td, textAlign: "center", color: colors.textTertiary }}>
                        No DTNs yet — start scanning.
                      </td>
                    </tr>
                  )}
                  {active.items.map((item, i) => (
                    <tr key={item.id} style={{ background: i % 2 ? colors.tableRowOdd : colors.tableRowEven }}>
                      <td style={td}>{i + 1}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: "0.9rem" }}>{item.dtn}</td>
                      <td style={td}>{fmtDate(item.scanned_at)}</td>
                      <td style={td}>{fmtTime(item.scanned_at)}</td>
                      <td style={td}>{item.scanned_by || "—"}</td>
                      <td style={td}>
                        <button
                          onClick={() => handleRemoveItem(item)}
                          style={{ ...btn("transparent", "#dc2626"), padding: "0.2rem 0.5rem" }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChecklistPage;
